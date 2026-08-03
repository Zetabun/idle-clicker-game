from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


bus_path = 'bus.html'
bus = read(bus_path)
if "const APP_VERSION = '0.6.59';" not in bus:
    raise SystemExit('Expected Kerbside 0.6.59 as predecessor')
bus = replace_once(bus, "const APP_VERSION = '0.6.59';", "const APP_VERSION = '0.6.60';", 'app version')

bus = replace_once(
    bus,
    "  routeScanBusy:false, routeScanAbort:null, lastRouteScan:0,\n  routeScanBoxes:0, routeScanPatterns:0, routeScanVehicles:0, routeScanError:''",
    "  routeScanBusy:false, routeScanAbort:null, lastRouteScan:0, routeScanHistory:new Map(),\n  routeScanBoxes:0, routeScanPatterns:0, routeScanVehicles:0, routeScanError:''",
    'route scan state'
)

old_route_scan = """function matchRouteScanVehicle(plan,v){
  if(!plan||!v||!v.journey) return null;
  const tripMatch=uniqueCompatibleTrips(plan.matches,v.journey,item=>item.trip);
  if(!tripMatch.items.length||tripMatch.ambiguous) return null;
  const match=tripMatch.items[0];
  if(String(v.line)!==String(match.line)) return null;
  if(v.dest&&match.head&&destinationSimilarity(v.dest,match.head)<.34) return null;
  const position=projectVehicleToPattern(match.pattern,v);
  if(!position||position.metres>800) return null;
  const remaining=match.targetAlong-position.along;
  if(remaining < -120 || remaining > ROUTE_SCAN_MAX_ROUTE_METRES) return null;
  v.corridorTrip=match.trip; v.corridorTracked=true; v.corridorRemaining=remaining; v.corridorConfirmedAt=Date.now();
  return v;
}
"""
new_route_scan = """function rememberRouteScanVehicle(v,now=Date.now()){
  if(!v||!v.id) return v;
  const current=S.routeScanHistory.get(v.id)||{hist:[],lastSeen:0};
  const latest=current.hist[current.hist.length-1];
  if(!latest||latest.ts!==v.ts||latest.lat!==v.lat||latest.lon!==v.lon){
    current.hist.push({lat:v.lat,lon:v.lon,ts:v.ts});
  }
  current.hist=current.hist.filter(point=>now-Number(point.ts)<=ROUTE_INFERENCE_GRACE_MS).slice(-6);
  current.lastSeen=now;
  S.routeScanHistory.set(v.id,current);
  for(const [id,record] of S.routeScanHistory){
    if(now-Number(record.lastSeen||0)>ROUTE_INFERENCE_GRACE_MS) S.routeScanHistory.delete(id);
  }
  return {...v,hist:[...current.hist],speed:isFinite(Number(v.feedSpeed))?Number(v.feedSpeed):null};
}
function inferredRouteScanMatch(plan,v){
  const byPattern=new Map();
  for(const match of plan.matches||[]){
    if(String(v.line)!==String(match.line)) continue;
    const similarity=v.dest&&match.head?destinationSimilarity(v.dest,match.head):1;
    if(v.dest&&match.head&&similarity<.34) continue;
    const fit=routePatternMovementFit(match.pattern,v,S.stop);
    if(!fit) continue;
    const score=fit.meanOffset*.55+fit.current.metres*.45+(1-similarity)*90;
    const candidate={trip:String(match.trip),pattern:match.pattern,fit,score,row:match};
    const current=byPattern.get(match.pattern.id);
    if(!current||candidate.score<current.score) byPattern.set(match.pattern.id,candidate);
  }
  const best=chooseInferredJourneyCandidate([...byPattern.values()]);
  return best&&best.row||null;
}
function matchRouteScanVehicle(plan,v){
  if(!plan||!v) return null;
  let match=null,inferred=false;
  if(v.journey){
    const tripMatch=uniqueCompatibleTrips(plan.matches,v.journey,item=>item.trip);
    if(!tripMatch.items.length||tripMatch.ambiguous) return null;
    match=tripMatch.items[0];
  }else{
    match=inferredRouteScanMatch(plan,v); inferred=!!match;
    if(!match) return null;
  }
  if(String(v.line)!==String(match.line)) return null;
  if(v.dest&&match.head&&destinationSimilarity(v.dest,match.head)<.34) return null;
  const position=projectVehicleToPattern(match.pattern,v);
  if(!position||position.metres>800) return null;
  const remaining=match.targetAlong-position.along;
  if(remaining < -120 || remaining > ROUTE_SCAN_MAX_ROUTE_METRES) return null;
  v.corridorTrip=match.trip; v.corridorTracked=true; v.corridorRemaining=remaining; v.corridorConfirmedAt=Date.now();
  if(inferred){v.inferredTrip=match.trip;v.inferredPattern=match.pattern.id;v.inferredAt=Date.now();}
  return v;
}
"""
bus = replace_once(bus, old_route_scan, new_route_scan, 'distant route inference')

bus = replace_once(
    bus,
    "      for(const vehicle of parsed.vehicles){\n        const matched=matchRouteScanVehicle(result.value.plan,vehicle); if(!matched) continue;",
    "      for(const vehicle of parsed.vehicles){\n        const tracked=rememberRouteScanVehicle(vehicle);\n        const matched=matchRouteScanVehicle(result.value.plan,tracked); if(!matched) continue;",
    'route scan history use'
)

bus = replace_once(
    bus,
    "routeScanPlans,matchRouteScanVehicle,pollRouteCorridor",
    "routeScanPlans,rememberRouteScanVehicle,inferredRouteScanMatch,matchRouteScanVehicle,pollRouteCorridor",
    'test exports for route scan'
)

old_ingest = """    const journeyChanged=!!(prev&&prev.journey&&v.journey&&prev.journey!==v.journey);
    const routeIdentityChanged=!!(prev&&(String(prev.line)!==String(v.line)||String(prev.operator||'')!==String(v.operator||'')));
    if(journeyChanged){rec.hist=[];rec.speed=null;rec.cadence=null;}
    if(journeyChanged||routeIdentityChanged){delete rec.inferredJourney;delete rec.inferredTrip;delete rec.inferredPattern;delete rec.inferredAt;delete rec.inferenceStopId;delete rec.inferenceGpsTs;}
    if(prev && !journeyChanged && v.ts>prev.ts){
      const gap=(v.ts-prev.ts)/1000;
      if(gap>=2 && gap<=180) rec.cadence=rec.cadence==null?gap:rec.cadence*.65+gap*.35;
    }
    if(prev && !journeyChanged && (prev.lat!==v.lat || prev.lon!==v.lon)){
      const dt = Math.max(1,(v.ts - prev.ts)/1000);
      const dd = dist(prev.lat,prev.lon,v.lat,v.lon);
      if(dt<180 && dd<3000){
        const inst = dd/dt;
        rec.speed = rec.speed==null ? inst : rec.speed*0.6 + inst*0.4;
      }
    }
    const feedSpeed=Number(v.feedSpeed);
    if(isFinite(feedSpeed) && feedSpeed>=0 && feedSpeed<=35){
      rec.speed = rec.speed==null ? feedSpeed : rec.speed*0.72 + feedSpeed*0.28;
    }
"""
new_ingest = """    const journeyChanged=!!(prev&&prev.journey&&v.journey&&prev.journey!==v.journey);
    const routeIdentityChanged=!!(prev&&(String(prev.line)!==String(v.line)||String(prev.operator||'')!==String(v.operator||'')));
    const reportGap=prev&&v.ts>prev.ts?(v.ts-prev.ts)/1000:0;
    const reportMove=prev&&v.ts>prev.ts?dist(prev.lat,prev.lon,v.lat,v.lon):0;
    const trackDiscontinuity=!!(prev&&!journeyChanged&&(reportGap>180||reportMove>3000));
    if(journeyChanged||routeIdentityChanged||trackDiscontinuity){
      rec.hist=[];rec.speed=null;rec.cadence=null;delete rec.routeProjection;delete rec.stationaryAt;
      delete rec.inferredJourney;delete rec.inferredTrip;delete rec.inferredPattern;delete rec.inferredAt;delete rec.inferenceStopId;delete rec.inferenceGpsTs;
    }
    if(prev && !journeyChanged && !routeIdentityChanged && !trackDiscontinuity && v.ts>prev.ts){
      if(reportGap>=2 && reportGap<=180) rec.cadence=rec.cadence==null?reportGap:rec.cadence*.65+reportGap*.35;
    }
    const stationaryFix=!!(prev&&!journeyChanged&&!routeIdentityChanged&&!trackDiscontinuity&&reportGap>=2&&reportGap<=180&&reportMove<8);
    if(prev && !journeyChanged && !routeIdentityChanged && !trackDiscontinuity && reportMove>=8){
      const dt=Math.max(1,reportGap),inst=reportMove/dt;
      if(dt<180&&reportMove<3000) rec.speed=rec.speed==null?inst:rec.speed*.6+inst*.4;
      delete rec.stationaryAt;
    }
    const feedSpeed=Number(v.feedSpeed);
    if(stationaryFix){
      rec.speed=0;rec.stationaryAt=v.ts;
    }else if(isFinite(feedSpeed) && feedSpeed>=0 && feedSpeed<=35){
      rec.speed = rec.speed==null ? feedSpeed : rec.speed*0.72 + feedSpeed*0.28;
    }
"""
bus = replace_once(bus, old_ingest, new_ingest, 'GPS continuity and stationary handling')
bus = replace_once(
    bus,
    "    const sameJourney=!journeyChanged&&(!prev||!prev.journey||!v.journey||prev.journey===v.journey);",
    "    const sameJourney=!journeyChanged&&!routeIdentityChanged&&!trackDiscontinuity&&(!prev||!prev.journey||!v.journey||prev.journey===v.journey);",
    'corridor continuity'
)

bus = replace_once(
    bus,
    "  const b=v.hist[v.hist.length-1];\n  let a=null;",
    "  const b=v.hist[v.hist.length-1],previousLatest=v.hist[v.hist.length-2];\n  if(Number(v.stationaryAt)===Number(b.ts)||(previousLatest&&previousLatest.ts<b.ts&&dist(previousLatest.lat,previousLatest.lon,b.lat,b.lon)<8)) return confirmed;\n  let a=null;",
    'stationary visual guard'
)

old_progress = """function journeyProgress(v){
  const pattern=timetablePatternRecord(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern);
  if(!pattern) return null;
  const vehicle=projectVehicleToPattern(pattern,v);
  if(!vehicle||vehicle.metres>800) return null;
  const stops=orderedPatternStops(pattern);
  if(stops.length<2) return null;
  let nextIndex=stops.findIndex(stop=>stop.along>=vehicle.along-25);
  if(nextIndex<0) nextIndex=stops.length;
  const selectedIndex=selectedPatternStopIndex(stops);
  let atIndex=-1,atDistance=Infinity;
  stops.forEach((stop,index)=>{
    const direct=dist(v.lat,v.lon,stop.lat,stop.lon),along=Math.abs(stop.along-vehicle.along);
    if(direct<=85&&along<=140&&direct<atDistance){atDistance=direct;atIndex=index;}
  });
  const previousIndex=atIndex>=0?Math.max(-1,atIndex-1):(nextIndex>0?nextIndex-1:-1);
  const previous=previousIndex>=0&&previousIndex<stops.length?stops[previousIndex]:null;
  const next=nextIndex>=0&&nextIndex<stops.length?stops[nextIndex]:null;
  const locationLabel=atIndex>=0?'At or near '+stops[atIndex].name:previous&&next?'Between '+previous.name+' and '+next.name:next?'Approaching '+next.name:previous?'After '+previous.name:'Position on route';
  return {
    pattern,vehicle,stops,nextIndex,selectedIndex,atIndex,previousIndex,locationLabel,
    remainingStops:Math.max(0,stops.length-nextIndex),
    percent:Math.max(0,Math.min(100,vehicle.along/Math.max(1,vehicle.total)*100))
  };
}
"""
new_progress = """function journeyProgress(v){
  const pattern=timetablePatternRecord(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern);
  if(!pattern) return null;
  const confirmedVehicle=projectVehicleToPattern(pattern,v);
  if(!confirmedVehicle||confirmedVehicle.metres>800) return null;
  let vehicle=confirmedVehicle;
  const visual=visualVehiclePosition(v);
  if(visual&&visual.estimated){
    const displayVehicle=projectVehicleToPattern(pattern,{...v,lat:visual.lat,lon:visual.lon,routeProjection:null});
    if(displayVehicle&&displayVehicle.metres<=800&&displayVehicle.along>=confirmedVehicle.along-40) vehicle=displayVehicle;
  }
  const stops=orderedPatternStops(pattern);
  if(stops.length<2) return null;
  let nextIndex=stops.findIndex(stop=>stop.along>=vehicle.along-25);
  if(nextIndex<0) nextIndex=stops.length;
  const selectedIndex=selectedPatternStopIndex(stops);
  let atIndex=-1,atDistance=Infinity;
  stops.forEach((stop,index)=>{
    const direct=dist(v.lat,v.lon,stop.lat,stop.lon),along=Math.abs(stop.along-confirmedVehicle.along);
    if(direct<=85&&along<=140&&direct<atDistance){atDistance=direct;atIndex=index;}
  });
  const previousIndex=atIndex>=0?Math.max(-1,atIndex-1):(nextIndex>0?nextIndex-1:-1);
  const previous=previousIndex>=0&&previousIndex<stops.length?stops[previousIndex]:null;
  const next=nextIndex>=0&&nextIndex<stops.length?stops[nextIndex]:null;
  const locationLabel=atIndex>=0?'At or near '+stops[atIndex].name:previous&&next?'Between '+previous.name+' and '+next.name:next?'Approaching '+next.name:previous?'After '+previous.name:'Position on route';
  return {
    pattern,vehicle,confirmedVehicle,stops,nextIndex,selectedIndex,atIndex,previousIndex,locationLabel,
    remainingStops:Math.max(0,stops.length-nextIndex),
    percent:Math.max(0,Math.min(100,vehicle.along/Math.max(1,vehicle.total)*100))
  };
}
"""
bus = replace_once(bus, old_progress, new_progress, 'visual journey progress')

old_direction = """    const dir=inferDirection(v), gpsMoveDir=gpsMovementDirection(v);
    if(S.dir!=='all'){
      const timetableContradicts=scheduledDir!=='unknown' && scheduledDir!==S.dir;
      const gpsContradicts=gpsMoveDir!=='unknown' && gpsMoveDir!==S.dir;
      if(timetableContradicts || gpsContradicts){ rejectLive(diagnostics,'direction'); continue; }
    }
    if(gpsMoveDir!=='unknown'&&scheduledDir!=='unknown'&&gpsMoveDir!==scheduledDir){ rejectLive(diagnostics,'direction'); continue; }
"""
new_direction = """    const dir=inferDirection(v), gpsMoveDir=gpsMovementDirection(v);
    const routeAhead=!!(geometry&&!geometry.passed&&geometry.remaining>=-120);
    if(S.dir!=='all'){
      const timetableContradicts=scheduledDir!=='unknown' && scheduledDir!==S.dir;
      const gpsContradicts=gpsMoveDir!=='unknown' && gpsMoveDir!==S.dir;
      if(timetableContradicts || (gpsContradicts&&scheduledDir==='unknown'&&!routeAhead)){ rejectLive(diagnostics,'direction'); continue; }
    }
    if(S.dir!=='all'&&gpsMoveDir!=='unknown'&&scheduledDir!=='unknown'&&gpsMoveDir!==scheduledDir&&!routeAhead){ rejectLive(diagnostics,'direction'); continue; }
"""
bus = replace_once(bus, old_direction, new_direction, 'route-aware direction gate')

bus = replace_once(
    bus,
    "    S.routeScanBoxes=0; S.routeScanPatterns=0; S.routeScanVehicles=0; S.routeScanError='';",
    "    S.routeScanBoxes=0; S.routeScanPatterns=0; S.routeScanVehicles=0; S.routeScanError=''; S.routeScanHistory.clear();",
    'clear route scan history on stop change'
)
bus = replace_once(
    bus,
    "  LINES={}; SERVING={}; MAPPED={}; S.vehicles.clear(); clearVehicleMarkers(); SIM.built=false;",
    "  LINES={}; SERVING={}; MAPPED={}; S.vehicles.clear(); S.routeScanHistory.clear(); clearVehicleMarkers(); SIM.built=false;",
    'clear route scan history on reset'
)

narrow_css = """
@media (max-width:360px){
  #topbar{grid-template-columns:minmax(0,1fr) auto 42px;column-gap:5px}
  .searchwrap .pin{display:none}
  .searchwrap input{padding-left:10px;padding-right:62px}
  .searchwrap .go{right:29px;padding-left:2px;padding-right:2px;font-size:11px}
  .searchwrap .locate{right:2px}
  .dirswitch button{padding-left:6px;padding-right:6px}
  #setBtn{width:42px}
}
"""
bus = replace_once(bus, "@media (prefers-reduced-motion:reduce){", narrow_css + "@media (prefers-reduced-motion:reduce){", 'narrow mobile header CSS')
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
package = json.loads(read(package_path))
if package.get('version') != '0.6.59':
    raise SystemExit('Unexpected package predecessor version')
package['version'] = '0.6.60'
write(package_path, json.dumps(package, indent=2) + '\n')

worker_path = 'kerbside-backend/src/worker.js'
worker = replace_once(read(worker_path), "version: '0.6.59'", "version: '0.6.60'", 'Worker version')
write(worker_path, worker)

worker_test_path = 'kerbside-backend/test/worker.test.js'
worker_test = replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.59');", "assert.equal(body.version, '0.6.60');", 'Worker test version')
write(worker_test_path, worker_test)

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
test = read(browser_test_path)
test = replace_once(test, "const APP_VERSION = '0\\.6\\.59'", "const APP_VERSION = '0\\.6\\.60'", 'browser source version assertion')
test = replace_once(test, "includes('app 0.6.59')", "includes('app 0.6.60')", 'settings version assertion')
test = replace_once(
    test,
    "assert.match(busSource, /function visualRoutePosition\\(v,pattern,metres\\)/);",
    "assert.match(busSource, /function visualRoutePosition\\(v,pattern,metres\\)/);\nassert.match(busSource, /function rememberRouteScanVehicle\\(v,now=Date\\.now\\(\\)\\)/);\nassert.match(busSource, /const stationaryFix=/);\nassert.match(busSource, /const routeAhead=/);\nassert.match(busSource, /confirmedVehicle,stops,nextIndex/);",
    'new source assertions'
)

reliability_tests = r'''
  const reliability = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,onlyServing:state.onlyServing,hideAway:state.hideAway,destFilter:state.destFilter,demo:state.demo,vehicles:state.vehicles,ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion,routeScanHistory:state.routeScanHistory};
    try{
      const stationary={id:'stationary',line:'63',lat:52.5,lon:-2.1,bearing:90,ts:now,stationaryAt:now,speed:8,cadence:15,hist:[{lat:52.5,lon:-2.11,ts:now-30000},{lat:52.5,lon:-2.1,ts:now-15000},{lat:52.5,lon:-2.1,ts:now}]};
      const stationaryVisual=api.visualVehiclePosition(stationary,now+12000);

      state.vehicles=new Map();
      api.ingest([{id:'gap',journey:'gap-trip',line:'63',operator:'TEST',lat:52.4,lon:-2.2,bearing:90,feedSpeed:8,ts:now-240000,timestampKnown:true,corridorTracked:false}]);
      api.ingest([{id:'gap',journey:'gap-trip',line:'63',operator:'TEST',lat:52.5,lon:-2.1,bearing:90,feedSpeed:8,ts:now,timestampKnown:true,corridorTracked:false}]);
      const resetVehicle=state.vehicles.get('gap');

      const trip='priority-trip',patternId='priority-pattern',at=new Date(now+20*60000),mins=at.getHours()*60+at.getMinutes();
      const pattern={id:patternId,shape:true,stopProgress:null,points:[{lat:52.52,lon:-2.2},{lat:52.51,lon:-2.17},{lat:52.5,lon:-2.14},{lat:52.5,lon:-2.1}],stops:[{id:'start',name:'Start',lat:52.52,lon:-2.2},{id:'priority-stop',name:'Priority stop',lat:52.5,lon:-2.1}]};
      state.stop={id:'priority-stop',timetableId:'priority-stop',lat:52.5,lon:-2.1,name:'Priority stop',d:0};state.origin={lat:52.5,lon:-2.1,label:'Test'};state.anchor={lat:52.6,lon:-2.1,name:'Town Centre',synthetic:false};state.dir='both';state.onlyServing=true;state.hideAway=true;state.destFilter=null;state.demo=false;state.vehicles=new Map();state.ttStop={id:'priority-stop',d:[[mins,'63','Town Centre','daily','in',trip,patternId]]};state.timetable={services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},tripPatterns:{[trip]:patternId},patterns:{[patternId]:{p:pattern.points.map(p=>[p.lat,p.lon]),s:pattern.stops.map(s=>[s.id,s.name,s.lat,s.lon]),g:1}}};state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun++;
      api.ingest([{id:'priority',journey:trip,line:'63',lineRef:'63',dest:'Town Centre',operator:'TEST',declaredDir:'',lat:52.51,lon:-2.17,bearing:120,feedSpeed:7,ts:now,timestampKnown:true,corridorTracked:false,hist:[{lat:52.52,lon:-2.2,ts:now-60000},{lat:52.51,lon:-2.17,ts:now}]}]);
      const bothShown=api.relevant().some(row=>row.v.id==='priority');
      state.dir='in';
      const inShown=api.relevant().some(row=>row.v.id==='priority');

      state.routeScanHistory=new Map();
      const remotePattern={id:'remote-pattern',shape:true,stopProgress:null,points:[{lat:52.5,lon:-2.3},{lat:52.5,lon:-2.2},{lat:52.5,lon:-2.1}],stops:[{id:'remote-start',name:'Remote start',lat:52.5,lon:-2.3},{id:'priority-stop',name:'Priority stop',lat:52.5,lon:-2.1}]};
      api.rememberRouteScanVehicle({id:'remote-bus',journey:'',line:'63',dest:'Town Centre',lat:52.5,lon:-2.27,bearing:90,ts:now-60000,feedSpeed:8},now-60000);
      const remote=api.rememberRouteScanVehicle({id:'remote-bus',journey:'',line:'63',dest:'Town Centre',lat:52.5,lon:-2.22,bearing:90,ts:now,feedSpeed:8},now);
      const remoteFit=api.routePatternMovementFit(remotePattern,remote,state.stop);
      const plan={matches:[{trip:'remote-trip',line:'63',head:'Town Centre',pattern:remotePattern,targetAlong:remoteFit.target.along}]};
      const remoteMatched=api.matchRouteScanVehicle(plan,remote);
      return {
        stationaryHeld:!stationaryVisual.estimated&&stationaryVisual.lat===stationary.lat&&stationaryVisual.lon===stationary.lon,
        historyReset:resetVehicle.hist.length===1,
        bothShown,inShown,
        remoteInferred:!!(remoteMatched&&remoteMatched.corridorTracked&&remoteMatched.inferredTrip==='remote-trip')
      };
    }finally{Object.assign(state,saved);}
  });
  assert.deepEqual(reliability,{stationaryHeld:true,historyReset:true,bothShown:true,inShown:true,remoteInferred:true});
'''
test = replace_once(
    test,
    "  assert.deepEqual(routeIntelligence.routed,{east:true,onRoute:true,routeGuided:true});\n\n  await page.locator('#setBtn').click();",
    "  assert.deepEqual(routeIntelligence.routed,{east:true,onRoute:true,routeGuided:true});\n" + reliability_tests + "\n  await page.locator('#setBtn').click();",
    'reliability behavior tests'
)

layout_tests = r'''
  const mobileLayouts=[];
  for(const viewport of [{width:320,height:568},{width:360,height:800},{width:393,height:852},{width:430,height:932}]){
    await page.setViewportSize(viewport);
    await page.waitForTimeout(40);
    mobileLayouts.push(await page.evaluate(() => {
      const search=document.querySelector('.searchwrap').getBoundingClientRect();
      const directions=document.querySelector('.dirswitch').getBoundingClientRect();
      const settings=document.getElementById('setBtn').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth-window.innerWidth,searchWidth:search.width,aligned:Math.max(search.top,directions.top,settings.top)-Math.min(search.top,directions.top,settings.top),viewbar:getComputedStyle(document.getElementById('viewbar')).display};
    }));
  }
  for(const layout of mobileLayouts){
    assert.ok(layout.overflow<=1,JSON.stringify(layout));
    assert.ok(layout.searchWidth>=125,JSON.stringify(layout));
    assert.ok(layout.aligned<=2,JSON.stringify(layout));
    assert.equal(layout.viewbar,'flex');
  }
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(40);
  const desktopLayout=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-window.innerWidth,
    topbar:getComputedStyle(document.getElementById('topbar')).display,
    viewbar:getComputedStyle(document.getElementById('viewbar')).display,
    icon:getComputedStyle(document.querySelector('.brand-icon')).display,
    map:getComputedStyle(document.getElementById('map')).display,
    board:getComputedStyle(document.getElementById('board')).display
  }));
  assert.deepEqual(desktopLayout,{overflow:0,topbar:'flex',viewbar:'none',icon:'none',map:'block',board:'flex'});
  await page.setViewportSize({width:393,height:852});
'''
test = replace_once(
    test,
    "  console.log('Kerbside WebKit mobile regression checks passed.');",
    layout_tests + "\n  console.log('Kerbside WebKit mobile and desktop regression checks passed.');",
    'multi-viewport regression tests'
)
write(browser_test_path, test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
if 'Kerbside 0.6.60' in readme:
    raise SystemExit('README already contains 0.6.60')
readme += "\nKerbside 0.6.60 is a reliability release for live route allocation and deployment. Exact ordered-route evidence now overrides contradictory town-anchor GPS movement without weakening explicit timetable direction filters, and Both mode no longer discards a valid journey merely because route and town-centre direction labels disagree. New stationary fixes stop marker extrapolation immediately, while long reporting gaps or implausible jumps reset inherited movement, speed and route-projection state. Timetable-guided distant scans can now infer a missing journey reference after repeated GPS movement clearly follows one route pattern. Display-only journey progress advances with the bounded route-guided marker while at-stop claims remain tied to confirmed GPS. Narrow mobile widths and desktop geometry join the WebKit matrix. The release and production workflows are hardened separately so new assets cannot be silently omitted and live GitHub Pages is browser-smoke-tested after UI changes.\n"
write(readme_path, readme)

print('Prepared Kerbside 0.6.60 reliability release.')
