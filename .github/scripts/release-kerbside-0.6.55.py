from pathlib import Path

OLD = "0.6.54"
NEW = "0.6.55"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bus = read("bus.html")
bus = replace_once(bus, f"const APP_VERSION = '{OLD}';", f"const APP_VERSION = '{NEW}';", "browser version")

bus = replace_once(
    bus,
    "const VISUAL_MAX_LEAD_METRES = 180;\nconst ROUTE_SCAN_INTERVAL_MS = 60*1000;",
    """const VISUAL_MAX_LEAD_METRES = 180;
const ROUTE_INFERENCE_MAX_OFFSET = 650;
const ROUTE_INFERENCE_MIN_MOVEMENT = 30;
const ROUTE_INFERENCE_MIN_FORWARD = 12;
const ROUTE_INFERENCE_MIN_MARGIN = 90;
const ROUTE_INFERENCE_GRACE_MS = 3*60*1000;
const ROUTE_SCAN_INTERVAL_MS = 60*1000;""",
    "route inference constants",
)

bus = replace_once(
    bus,
    ".journey-progress-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}",
    ".journey-progress-location{display:flex;align-items:baseline;gap:7px;margin-top:9px;padding:7px 8px;border:1px solid rgba(34,48,63,.75);border-radius:6px;font-size:10.5px;color:var(--text-dim)}\n.journey-progress-location b{color:var(--text);font-size:10px;text-transform:uppercase;letter-spacing:.06em}\n.journey-progress-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:7px}",
    "journey current-position styling",
)

old_selected_stop = """function selectedPatternStopIndex(stops){
  if(!stops.length||!S.stop) return -1;
  const ids=[S.ttStop&&S.ttStop.id,S.stop.timetableId,S.stop.atco,S.stop.code,S.stop.id].map(v=>String(v||'')).filter(Boolean);
  let index=stops.findIndex(stop=>ids.includes(String(stop.id)));
  if(index>=0) return index;
  let best=-1,bestDistance=Infinity;
  stops.forEach((stop,i)=>{ const metres=dist(stop.lat,stop.lon,S.stop.lat,S.stop.lon); if(metres<bestDistance){bestDistance=metres;best=i;} });
  return bestDistance<=180?best:-1;
}"""
new_selected_stop = """function selectedPatternStopIndex(stops,selectedStop){
  const chosen=selectedStop||S.stop;
  if(!stops.length||!chosen) return -1;
  const ids=[chosen===S.stop&&S.ttStop&&S.ttStop.id,chosen.timetableId,chosen.atco,chosen.code,chosen.id].map(v=>String(v||'')).filter(Boolean);
  let index=stops.findIndex(stop=>ids.includes(String(stop.id)));
  if(index>=0) return index;
  let best=-1,bestDistance=Infinity;
  stops.forEach((stop,i)=>{ const metres=dist(stop.lat,stop.lon,chosen.lat,chosen.lon); if(metres<bestDistance){bestDistance=metres;best=i;} });
  return bestDistance<=180?best:-1;
}"""
bus = replace_once(bus, old_selected_stop, new_selected_stop, "selected pattern stop helper")

journey_progress_anchor = """function journeyProgress(v){
  const pattern=timetablePatternRecord(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern);"""
route_inference = """function routePatternMovementFit(pattern,v,stop){
  const history=recentMovementPoints(v);
  if(!pattern||!stop||history.length<2) return null;
  let previous=null,previousPoint=null,first=null,last=null,totalOffset=0,moved=0,used=0;
  for(const point of history){
    const ground=previousPoint?dist(previousPoint.lat,previousPoint.lon,point.lat,point.lon):0;
    if(previousPoint&&ground<4) continue;
    const bearing=previousPoint?bearingTo(previousPoint.lat,previousPoint.lon,point.lat,point.lon):Number(v.bearing);
    const projection=choosePatternProjection(patternProjectionCandidates(pattern.points,point.lat,point.lon),{
      bearing,previous,ts:point.ts,groundMovement:ground
    });
    if(!projection||projection.metres>ROUTE_INFERENCE_MAX_OFFSET) return null;
    if(!first) first=projection;
    last=projection; totalOffset+=projection.metres; used++;
    if(previousPoint) moved+=ground;
    previous={...projection,ts:point.ts,lat:point.lat,lon:point.lon};
    previousPoint=point;
  }
  if(used<2||moved<ROUTE_INFERENCE_MIN_MOVEMENT||!first||!last) return null;
  const forward=last.along-first.along;
  if(forward<Math.max(ROUTE_INFERENCE_MIN_FORWARD,moved*.2)) return null;
  const stops=orderedPatternStops(pattern),selectedIndex=selectedPatternStopIndex(stops,stop);
  const selected=selectedIndex>=0?stops[selectedIndex]:null;
  const projectedTarget=selected?null:projectToPattern(pattern.points,stop.lat,stop.lon);
  const target=selected?{along:selected.along,metres:dist(selected.lat,selected.lon,stop.lat,stop.lon)}:projectedTarget;
  if(!target||target.metres>250) return null;
  const remaining=target.along-last.along;
  if(remaining < -120) return null;
  return {pattern,current:last,target,remaining,forward,moved,meanOffset:totalOffset/used,selectedIndex};
}
function chooseInferredJourneyCandidate(candidates){
  const ranked=(Array.isArray(candidates)?candidates:[]).filter(candidate=>candidate&&candidate.fit&&isFinite(candidate.score))
    .sort((a,b)=>a.score-b.score||a.fit.current.metres-b.fit.current.metres);
  if(!ranked.length) return null;
  const best=ranked[0],second=ranked.find(candidate=>candidate.pattern.id!==best.pattern.id);
  if(best.fit.current.metres>ROUTE_INFERENCE_MAX_OFFSET) return null;
  if(second&&second.score-best.score<ROUTE_INFERENCE_MIN_MARGIN) return null;
  return best;
}
function inferenceCandidate(row,pattern,fit,v,now){
  const rawSpeed=Number(v.speed),speed=isFinite(rawSpeed)&&rawSpeed>=MIN_SPEED&&rawSpeed<=MAX_SPEED?rawSpeed:DEFAULT_SPEED;
  const routeSecs=Math.max(0,fit.remaining)/speed+(Math.max(0,fit.remaining)/1000)*24;
  const scheduleSecs=(Number(row.at)-now)/1000;
  const scheduleGap=Math.abs(scheduleSecs-routeSecs);
  const similarity=v.dest&&row.head?destinationSimilarity(v.dest,row.head):1;
  if(v.dest&&row.head&&similarity<.34) return null;
  const points=pattern.points,segment=Math.max(0,Math.min(points.length-2,fit.current.segment));
  const routeBearing=bearingTo(points[segment].lat,points[segment].lon,points[segment+1].lat,points[segment+1].lon);
  const bearingGap=isFinite(Number(v.bearing))?headingDifference(Number(v.bearing),routeBearing):0;
  const score=fit.meanOffset*.55+fit.current.metres*.45+Math.min(420,scheduleGap*.18)+bearingGap*.7+(1-similarity)*90;
  return {row,trip:String(row.trip),pattern,fit,score,scheduleGap,similarity};
}
function inferVehicleJourneyPattern(v,stop,now=Date.now()){
  if(!v||!stop||!S.ttStop||!S.timetable) return null;
  const stopId=String(stop.id||'');
  if(v.inferenceStopId===stopId&&Number(v.inferenceGpsTs)===Number(v.ts)&&v.inferredJourney) return v.inferredJourney;
  const rows=timetableRowsForLine(v.line,new Date(now)).filter(row=>row.trip&&row.at>=now-15*60000&&row.at<=now+3*3600000);
  const fits=new Map(),byPattern=new Map();
  for(const row of rows){
    const pattern=timetablePatternRecord(row.trip,row.pattern);
    if(!pattern) continue;
    let fit=fits.get(pattern.id);
    if(fit===undefined){fit=routePatternMovementFit(pattern,v,stop);fits.set(pattern.id,fit||null);}
    if(!fit) continue;
    const candidate=inferenceCandidate(row,pattern,fit,v,now); if(!candidate) continue;
    const current=byPattern.get(pattern.id);
    if(!current||candidate.score<current.score) byPattern.set(pattern.id,candidate);
  }
  let best=chooseInferredJourneyCandidate([...byPattern.values()]);
  if(!best&&v.inferredJourney&&v.inferenceStopId===stopId&&now-Number(v.inferredAt||0)<=ROUTE_INFERENCE_GRACE_MS){
    const held=v.inferredJourney,pattern=timetablePatternRecord(held.trip,held.pattern&&held.pattern.id||v.inferredPattern);
    const fit=pattern&&routePatternMovementFit(pattern,v,stop);
    if(fit) best={...held,pattern,fit};
  }
  if(!best){
    if(now-Number(v.inferredAt||0)>ROUTE_INFERENCE_GRACE_MS){delete v.inferredJourney;delete v.inferredTrip;delete v.inferredPattern;}
    return null;
  }
  const result={...best,trip:String(best.trip||best.row&&best.row.trip||''),patternId:String(best.pattern.id),inferred:true};
  v.inferredJourney=result;v.inferredTrip=result.trip;v.inferredPattern=result.patternId;v.inferredAt=now;
  v.inferenceStopId=stopId;v.inferenceGpsTs=Number(v.ts);
  return result;
}
function inferredRouteEvidence(base,inference){
  if(!inference) return base;
  return {...base,score:Math.max(Number(base&&base.score)||0,5),label:'GPS movement matched to ordered route',journeyMatch:true,pathMatch:true,matchStrength:0,matchedTrip:inference.trip,inferredJourney:true};
}

function journeyProgress(v){
  const pattern=timetablePatternRecord(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern);"""
bus = replace_once(bus, journey_progress_anchor, route_inference, "route inference engine")

old_progress_return = """  let nextIndex=stops.findIndex(stop=>stop.along>=vehicle.along-25);
  if(nextIndex<0) nextIndex=stops.length;
  const selectedIndex=selectedPatternStopIndex(stops);
  return {
    pattern,vehicle,stops,nextIndex,selectedIndex,
    remainingStops:Math.max(0,stops.length-nextIndex),
    percent:Math.max(0,Math.min(100,vehicle.along/Math.max(1,vehicle.total)*100))
  };"""
new_progress_return = """  let nextIndex=stops.findIndex(stop=>stop.along>=vehicle.along-25);
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
  };"""
bus = replace_once(bus, old_progress_return, new_progress_return, "journey current stop state")

old_ingest_change = """    const journeyChanged=!!(prev&&prev.journey&&v.journey&&prev.journey!==v.journey);
    if(journeyChanged){rec.hist=[];rec.speed=null;rec.cadence=null;}"""
new_ingest_change = """    const journeyChanged=!!(prev&&prev.journey&&v.journey&&prev.journey!==v.journey);
    const routeIdentityChanged=!!(prev&&(String(prev.line)!==String(v.line)||String(prev.operator||'')!==String(v.operator||'')));
    if(journeyChanged){rec.hist=[];rec.speed=null;rec.cadence=null;}
    if(journeyChanged||routeIdentityChanged){delete rec.inferredJourney;delete rec.inferredTrip;delete rec.inferredPattern;delete rec.inferredAt;delete rec.inferenceStopId;delete rec.inferenceGpsTs;}"""
bus = replace_once(bus, old_ingest_change, new_ingest_change, "inference reset on service change")

old_visual = """function visualVehiclePosition(v,now=Date.now()){
  const confirmed={lat:v.lat,lon:v.lon,estimated:false};
  if(S.demo||!Array.isArray(v.hist)||v.hist.length<2) return confirmed;
  const b=v.hist[v.hist.length-1];
  let a=null;
  for(let i=v.hist.length-2;i>=0;i--){
    const point=v.hist[i];
    if(point.ts<b.ts && dist(point.lat,point.lon,b.lat,b.lon)>8){a=point;break;}
  }
  if(!a) return confirmed;
  const dt=(b.ts-a.ts)/1000,moved=dist(a.lat,a.lon,b.lat,b.lon);
  if(dt<3||dt>180||moved<8) return confirmed;
  const speed=moved/dt,age=Math.max(0,(now-b.ts)/1000),cadence=Number(v.cadence)||dt;
  if(speed<.8||speed>18||age>Math.max(60,cadence*2.5)) return confirmed;
  const lead=Math.min(age,VISUAL_MAX_LEAD_SECONDS,Math.max(4,cadence*.9));
  const metres=Math.min(speed*lead,VISUAL_MAX_LEAD_METRES);
  if(metres<1) return confirmed;
  const fraction=metres/moved;
  return {lat:b.lat+(b.lat-a.lat)*fraction,lon:b.lon+(b.lon-a.lon)*fraction,estimated:true};
}"""
new_visual = """function visualRoutePosition(v,pattern,metres){
  if(!v||!pattern||!pattern.shape||!isFinite(metres)||metres<=0) return null;
  const projection=projectVehicleToPattern(pattern,v);
  if(!projection||projection.metres>500) return null;
  const point=pointAlongPattern(pattern.points,projection.along+metres);
  return point?{lat:point.lat,lon:point.lon,estimated:true,routeGuided:true}:null;
}
function visualVehiclePosition(v,now=Date.now()){
  const confirmed={lat:v.lat,lon:v.lon,estimated:false};
  if(S.demo||!Array.isArray(v.hist)||v.hist.length<2) return confirmed;
  const b=v.hist[v.hist.length-1];
  let a=null;
  for(let i=v.hist.length-2;i>=0;i--){
    const point=v.hist[i];
    if(point.ts<b.ts && dist(point.lat,point.lon,b.lat,b.lon)>8){a=point;break;}
  }
  if(!a) return confirmed;
  const dt=(b.ts-a.ts)/1000,moved=dist(a.lat,a.lon,b.lat,b.lon);
  if(dt<3||dt>180||moved<8) return confirmed;
  const observed=moved/dt,smoothed=Number(v.speed),speed=isFinite(smoothed)&&smoothed>=.8&&smoothed<=18?smoothed:observed;
  const age=Math.max(0,(now-b.ts)/1000),cadence=Number(v.cadence)||dt;
  if(speed<.8||speed>18||age>Math.max(60,cadence*2.5)) return confirmed;
  const lead=Math.min(age,VISUAL_MAX_LEAD_SECONDS,Math.max(4,cadence*.9));
  const metres=Math.min(speed*lead,VISUAL_MAX_LEAD_METRES);
  if(metres<1) return confirmed;
  const pattern=timetablePatternRecord(v.progressTrip||v.inferredTrip||vehicleJourneyRef(v),v.progressPattern||v.inferredPattern);
  const routed=visualRoutePosition(v,pattern,metres);
  if(routed){
    const blend=Math.min(1,lead/4);
    return {lat:b.lat+(routed.lat-b.lat)*blend,lon:b.lon+(routed.lon-b.lon)*blend,estimated:true,routeGuided:true};
  }
  const fraction=metres/moved;
  return {lat:b.lat+(b.lat-a.lat)*fraction,lon:b.lon+(b.lon-a.lon)*fraction,estimated:true,routeGuided:false};
}"""
bus = replace_once(bus, old_visual, new_visual, "route-guided marker motion")

old_route_evidence = """function estimate(v, stop){
  const straight = dist(v.lat,v.lon,stop.lat,stop.lon);"""
new_route_evidence = """function estimate(v, stop, evidenceOverride){
  const straight = dist(v.lat,v.lon,stop.lat,stop.lon);"""
bus = replace_once(bus, old_route_evidence, new_route_evidence, "estimate evidence parameter")
bus = replace_once(
    bus,
    """  const journeyRef=vehicleJourneyRef(v);
  const evidence=routeEvidence(v.line,v.dest,journeyRef);""",
    """  const baseJourneyRef=vehicleJourneyRef(v);
  const evidence=evidenceOverride||routeEvidence(v.line,v.dest,baseJourneyRef);
  const journeyRef=evidence.matchedTrip||baseJourneyRef;""",
    "estimate inferred journey reference",
)
bus = replace_once(
    bus,
    "const weight=evidence.journeyMatch ? .42 : evidence.score>=4 ? .32 : .18;",
    "const weight=evidence.inferredJourney ? .34 : evidence.journeyMatch ? .42 : evidence.score>=4 ? .32 : .18;",
    "inferred schedule blend",
)

old_collect_start = """    const d=dist(v.lat,v.lon,S.stop.lat,S.stop.lon), far=d>MAX_VEH_DIST;
    const journeyRef=vehicleJourneyRef(v), evidence=routeEvidence(v.line,v.dest,journeyRef);
    const matchedRow=evidence.matchedTrip?timetableRowsForLine(v.line,new Date()).find(row=>String(row.trip)===String(evidence.matchedTrip)):null;
    v.progressTrip=evidence.matchedTrip||v.corridorTrip||v.journey||'';
    v.progressPattern=String(matchedRow&&matchedRow.pattern||'');"""
new_collect_start = """    const d=dist(v.lat,v.lon,S.stop.lat,S.stop.lon), far=d>MAX_VEH_DIST;
    const journeyRef=vehicleJourneyRef(v);
    let evidence=routeEvidence(v.line,v.dest,journeyRef);
    const inference=!evidence.journeyMatch?inferVehicleJourneyPattern(v,S.stop,now):null;
    evidence=inferredRouteEvidence(evidence,inference);
    const matchedRow=evidence.matchedTrip?timetableRowsForLine(v.line,new Date()).find(row=>String(row.trip)===String(evidence.matchedTrip)):null;
    v.progressTrip=evidence.matchedTrip||v.corridorTrip||v.journey||'';
    v.progressPattern=String(inference&&inference.patternId||matchedRow&&matchedRow.pattern||'');"""
bus = replace_once(bus, old_collect_start, new_collect_start, "collect inferred journey")
bus = replace_once(bus, "const est=estimate(v,S.stop);", "const est=estimate(v,S.stop,evidence);", "collect inferred estimate")
bus = replace_once(
    bus,
    "const match=geometry?'journey path':evidence.journeyMatch?(evidence.matchStrength===4?'exact journey':'unique journey alias'):scheduleBacked?'timetable linked':'route evidence';",
    "const match=geometry?(evidence.inferredJourney?'GPS route inference':'journey path'):evidence.journeyMatch?(evidence.matchStrength===4?'exact journey':'unique journey alias'):scheduleBacked?'timetable linked':'route evidence';",
    "inferred route match label",
)

old_stop_reset = """    for(const vehicle of S.vehicles.values()){ delete vehicle.lastShownSnapshot; delete vehicle.lastShownStopId; delete vehicle.lastShownAt; delete vehicle.lastShownArrivalAt; delete vehicle.lastShownBoardDir; delete vehicle.lastShownDestFilter; delete vehicle.corridorTrip; delete vehicle.corridorRemaining; delete vehicle.corridorConfirmedAt; vehicle.corridorTracked=false; }"""
new_stop_reset = """    for(const vehicle of S.vehicles.values()){ delete vehicle.lastShownSnapshot; delete vehicle.lastShownStopId; delete vehicle.lastShownAt; delete vehicle.lastShownArrivalAt; delete vehicle.lastShownBoardDir; delete vehicle.lastShownDestFilter; delete vehicle.corridorTrip; delete vehicle.corridorRemaining; delete vehicle.corridorConfirmedAt; delete vehicle.inferredJourney; delete vehicle.inferredTrip; delete vehicle.inferredPattern; delete vehicle.inferredAt; delete vehicle.inferenceStopId; delete vehicle.inferenceGpsTs; vehicle.corridorTracked=false; }"""
bus = replace_once(bus, old_stop_reset, new_stop_reset, "stop inference reset")

bus = replace_once(
    bus,
    "return '<div class=\"journey-progress journey-progress-unavailable\"><b>Journey progress unavailable.</b> Kerbside only shows route progress after this live vehicle is matched to an exact ordered timetable journey.</div>';",
    "return '<div class=\"journey-progress journey-progress-unavailable\"><b>Journey progress unavailable.</b> Kerbside only shows route progress after this live vehicle is matched to an ordered timetable journey.</div>';",
    "journey progress wording",
)
bus = replace_once(
    bus,
    """    if(index===progress.nextIndex) labels.push('next stop');
    if(index===progress.selectedIndex) labels.push(index<progress.nextIndex?'your stop · passed':'your stop');""",
    """    if(index===progress.nextIndex) labels.push('next stop');
    if(index===progress.atIndex) labels.push('bus here');
    if(index===progress.selectedIndex) labels.push(index<progress.nextIndex?'your stop · passed':'your stop');""",
    "current stop list label",
)
bus = replace_once(
    bus,
    """    +'<div class=\"journey-progress-track\"><div class=\"journey-progress-fill\" style=\"width:'+progress.percent.toFixed(1)+'%\"></div></div>'
    +'<div class=\"journey-progress-stats\">'""",
    """    +'<div class=\"journey-progress-track\"><div class=\"journey-progress-fill\" style=\"width:'+progress.percent.toFixed(1)+'%\"></div></div>'
    +'<div class=\"journey-progress-location\"><b>Current position</b><span>'+esc(progress.locationLabel)+'</span></div>'
    +'<div class=\"journey-progress-stats\">'""",
    "journey current position display",
)
bus = replace_once(
    bus,
    "const schedules=scheduledMatches(v.line,v.dest,r.secs,vehicleJourneyRef(v)).slice(0,4);",
    "const schedules=scheduledMatches(v.line,v.dest,r.secs,v.progressTrip||vehicleJourneyRef(v)).slice(0,4);",
    "detail inferred schedules",
)

old_test_export = """mapVehicleVisible,boardRefreshCanRender,ignoreMapContextMenu,journeyRouteContext,shouldClearJourneyRoute,renderSelectedJourney,clearJourneyRoute,journeyRouteLayerSize:()=>routeLayer.getLayers().length"""
new_test_export = """mapVehicleVisible,boardRefreshCanRender,ignoreMapContextMenu,routePatternMovementFit,chooseInferredJourneyCandidate,inferVehicleJourneyPattern,inferredRouteEvidence,visualRoutePosition,visualVehiclePosition,journeyRouteContext,shouldClearJourneyRoute,renderSelectedJourney,clearJourneyRoute,journeyRouteLayerSize:()=>routeLayer.getLayers().length"""
bus = replace_once(bus, old_test_export, new_test_export, "route intelligence test exports")
write("bus.html", bus)

package = read("kerbside-backend/package.json")
package = replace_once(package, f'"version": "{OLD}"', f'"version": "{NEW}"', "package version")
write("kerbside-backend/package.json", package)

worker = read("kerbside-backend/src/worker.js")
worker = replace_once(worker, f"version: '{OLD}'", f"version: '{NEW}'", "worker version")
write("kerbside-backend/src/worker.js", worker)

worker_test = read("kerbside-backend/test/worker.test.js")
worker_test = replace_once(worker_test, f"assert.equal(body.version, '{OLD}');", f"assert.equal(body.version, '{NEW}');", "worker test version")
write("kerbside-backend/test/worker.test.js", worker_test)

browser = read("kerbside-backend/tests/browser-regression.mjs")
browser = replace_once(
    browser,
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.54'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.55'/);",
    "browser version guard",
)
browser = replace_once(
    browser,
    """assert.match(busSource, /function ignoreMapContextMenu\\(e\\)/);
assert.match(busSource, /map\\.on\\('contextmenu',ignoreMapContextMenu\\)/);""",
    """assert.match(busSource, /function ignoreMapContextMenu\\(e\\)/);
assert.match(busSource, /map\\.on\\('contextmenu',ignoreMapContextMenu\\)/);
assert.match(busSource, /function routePatternMovementFit\\(pattern,v,stop\\)/);
assert.match(busSource, /function inferVehicleJourneyPattern\\(v,stop,now=Date\\.now\\(\\)\\)/);
assert.match(busSource, /function visualRoutePosition\\(v,pattern,metres\\)/);
assert.match(busSource, /const inference=!evidence\\.journeyMatch\\?inferVehicleJourneyPattern/);
assert.match(busSource, /const est=estimate\\(v,S\\.stop,evidence\\)/);
assert.match(busSource, /Current position/);""",
    "route intelligence source guards",
)

route_projection_anchor = """  assert.deepEqual(routeProjection, {east:0,north:3,continuous:3,forward:true});

  await page.locator('#setBtn').click();"""
route_intelligence_test = """  assert.deepEqual(routeProjection, {east:0,north:3,continuous:3,forward:true});
  const routeIntelligence = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__;
    const patternA={id:'pattern-a',shape:true,stopProgress:null,points:[
      {lat:0,lon:0},{lat:0,lon:.01},{lat:0,lon:.02}
    ],stops:[
      {id:'a',name:'First',lat:0,lon:.002},{id:'target',name:'Target',lat:0,lon:.018}
    ]};
    const patternB={id:'pattern-b',shape:true,stopProgress:null,points:[
      {lat:.005,lon:0},{lat:.005,lon:.01},{lat:.005,lon:.02}
    ],stops:[
      {id:'b',name:'Other first',lat:.005,lon:.002},{id:'other-target',name:'Other target',lat:.005,lon:.018}
    ]};
    const vehicle={lat:0,lon:.006,bearing:90,ts:30000,speed:7,cadence:15,hist:[
      {lat:0,lon:.002,ts:0},{lat:0,lon:.004,ts:15000},{lat:0,lon:.006,ts:30000}
    ]};
    const target={id:'target',lat:0,lon:.018};
    const fitA=api.routePatternMovementFit(patternA,vehicle,target);
    const fitB=api.routePatternMovementFit(patternB,vehicle,{id:'other-target',lat:.005,lon:.018});
    const chosen=api.chooseInferredJourneyCandidate([
      {trip:'trip-a',pattern:patternA,fit:fitA,score:40},
      {trip:'trip-b',pattern:patternB,fit:fitB,score:240}
    ]);
    const ambiguous=api.chooseInferredJourneyCandidate([
      {trip:'trip-a',pattern:patternA,fit:fitA,score:40},
      {trip:'trip-b',pattern:patternB,fit:fitB,score:100}
    ]);
    const routed=api.visualRoutePosition(vehicle,patternA,120);
    return {
      fitA:fitA&&Math.round(fitA.current.metres),
      fitB:fitB&&Math.round(fitB.current.metres),
      chosen:chosen&&chosen.trip,
      ambiguous:ambiguous&&ambiguous.trip,
      routed:routed&&{east:routed.lon>vehicle.lon,onRoute:Math.abs(routed.lat)<1e-7,routeGuided:routed.routeGuided}
    };
  });
  assert.equal(routeIntelligence.fitA,0);
  assert.ok(routeIntelligence.fitB>400);
  assert.equal(routeIntelligence.chosen,'trip-a');
  assert.equal(routeIntelligence.ambiguous,null);
  assert.deepEqual(routeIntelligence.routed,{east:true,onRoute:true,routeGuided:true});

  await page.locator('#setBtn').click();"""
browser = replace_once(browser, route_projection_anchor, route_intelligence_test, "route intelligence browser regression")
browser = replace_once(
    browser,
    "textContent.includes('app 0.6.54')",
    "textContent.includes('app 0.6.55')",
    "settings version expectation",
)
write("kerbside-backend/tests/browser-regression.mjs", browser)

readme = read("kerbside-backend/README.md")
release_note = """Kerbside 0.6.55 adds an internal GPS-and-timetable route-allocation layer for live vehicles whose operator journey reference is missing or cannot be matched. The matcher compares recent forward movement against every eligible ordered pattern for the reported line, rejects buses that are off-route or have passed the selected stop, checks destination and schedule plausibility, and only assigns a journey when one route pattern is clearly better than the alternatives. No confidence score is exposed in the interface. Once assigned, the existing live GPS marker interpolation follows the official road shape between reports, remains capped at 20 seconds and 180 metres, and snaps back to every authoritative GPS update; buses without a reliable route match retain the conservative straight-line fallback. Journey details now also describe whether the bus is at a stop, between two stops or approaching the next stop.

"""
readme = replace_once(
    readme,
    "The Worker remains backwards-compatible for live data:",
    release_note + "The Worker remains backwards-compatible for live data:",
    "release note",
)
write("kerbside-backend/README.md", readme)

print(f"Prepared Kerbside {NEW} route intelligence and marker motion release.")
