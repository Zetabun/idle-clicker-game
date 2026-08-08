from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


bus_path = ROOT / "bus.html"
bus = bus_path.read_text(encoding="utf-8")
bus = replace_once(bus, "const APP_VERSION = '0.6.60';", "const APP_VERSION = '0.6.61';", "app version")
bus = replace_once(
    bus,
    "const ROUTE_SCAN_INTERVAL_MS = 60*1000;\nconst ROUTE_SCAN_LOOKAHEAD_MS = 3*60*60*1000;",
    "const ROUTE_SCAN_INTERVAL_MS = 60*1000;\nconst ROUTE_SCAN_LATE_MS = 30*60*1000;\nconst ROUTE_SCAN_LOOKAHEAD_MS = 3*60*60*1000;",
    "route scan lateness constant",
)

route_scan_block = r"function mergeRouteScanMatches\(target,items\)\{.*?\n\}\n\n(?=/\* flatten a <VehicleActivity>)"
route_scan_new = r'''function mergeRouteScanMatches(target,items){
  const seen=new Set(target.map(item=>String(item.trip)));
  for(const item of items) if(item&&item.trip&&!seen.has(String(item.trip))){target.push(item);seen.add(String(item.trip));}
}
function routeScanRowPriority(row){
  let priority=0;
  const direction=scheduledJourneyDirection(row);
  if(S.dir==='all') priority+=1;
  else if(direction===S.dir) priority+=8;
  else if(direction==='unknown') priority+=1;
  else priority-=8;
  if(S.destFilter){
    const similarity=destinationSimilarity(row&&row.head,S.destFilter);
    if(similarity>=.75) priority+=10;
    else if(similarity>=.34) priority+=2;
    else priority-=10;
  }
  return priority;
}
function routeScanPlans(now=Date.now()){
  if(!S.stop||!S.ttStop||!S.timetable) return [];
  const rows=timetableRows(new Date(now)).filter(row=>
    row.trip&&row.at>=now-ROUTE_SCAN_LATE_MS&&row.at<=now+ROUTE_SCAN_LOOKAHEAD_MS
  ).map(row=>({...row,scanPriority:routeScanRowPriority(row)}))
    .sort((a,b)=>b.scanPriority-a.scanPriority||a.at-b.at)
    .slice(0,ROUTE_SCAN_PATTERN_LIMIT);
  const groups=new Map();
  for(const row of rows){
    const pattern=timetablePatternRecord(row.trip,row.pattern); if(!pattern) continue;
    const ordered=orderedPatternStops(pattern), selectedIndex=selectedPatternStopIndex(ordered);
    const selected=selectedIndex>=0?ordered[selectedIndex]:null;
    const projected=selected?null:projectToPattern(pattern.points,S.stop.lat,S.stop.lon);
    const targetAlong=selected?selected.along:projected&&projected.along;
    const targetOffset=selected?dist(selected.lat,selected.lon,S.stop.lat,S.stop.lon):projected&&projected.metres;
    if(!isFinite(targetAlong)||!isFinite(targetOffset)||targetOffset>250) continue;
    const key=pattern.id+'|'+Math.round(targetAlong/50), existing=groups.get(key);
    const match={trip:String(row.trip),line:String(row.line),head:row.head||'',direction:row.direction||'',pattern,targetAlong,at:Number(row.at),priority:Number(row.scanPriority)||0};
    if(existing){
      existing.due=Math.min(existing.due,row.at);
      existing.priority=Math.max(existing.priority,match.priority);
      mergeRouteScanMatches(existing.matches,[match]);
    }else groups.set(key,{pattern,targetAlong,due:row.at,priority:match.priority,matches:[match]});
  }
  const candidates=[];
  for(const group of groups.values()){
    for(const offset of ROUTE_SCAN_OFFSETS){
      if(group.targetAlong<offset+1000) continue;
      const centre=pointAlongPattern(group.pattern.points,group.targetAlong-offset);
      if(!centre||dist(centre.lat,centre.lon,S.stop.lat,S.stop.lon)+ROUTE_SCAN_BOX_RADIUS<=FAR_VEH_DIST) continue;
      candidates.push({
        lat:centre.lat,lon:centre.lon,offset,due:group.due,priority:group.priority,
        bbox:boxAround(centre,ROUTE_SCAN_BOX_RADIUS),matches:[...group.matches]
      });
    }
  }
  candidates.sort((a,b)=>b.priority-a.priority||a.due-b.due||a.offset-b.offset);
  const selected=[];
  for(const candidate of candidates){
    const existing=selected.find(item=>dist(item.lat,item.lon,candidate.lat,candidate.lon)<ROUTE_SCAN_BOX_RADIUS+1000);
    if(existing){
      existing.priority=Math.max(existing.priority,candidate.priority);
      existing.due=Math.min(existing.due,candidate.due);
      mergeRouteScanMatches(existing.matches,candidate.matches);
      continue;
    }
    selected.push(candidate);
    if(selected.length>=ROUTE_SCAN_MAX_BOXES) break;
  }
  return selected;
}
function routeScanVehicleHistoryKey(v){
  const physical=String(v&&v.vehicleRef||v&&v.id||'').trim();
  const operator=String(v&&v.operator||'').trim();
  const line=String(v&&(v.lineRef||v.line)||'').trim();
  const journey=String(v&&v.journey||'').trim();
  return [operator,physical,line,journey].join('|');
}
function rememberRouteScanVehicle(v,now=Date.now()){
  if(!v||!v.id) return v;
  const key=routeScanVehicleHistoryKey(v), physical=[String(v.operator||''),String(v.vehicleRef||v.id)].join('|');
  for(const [otherKey,record] of S.routeScanHistory){
    if(record.physical===physical&&otherKey!==key) S.routeScanHistory.delete(otherKey);
  }
  const current=S.routeScanHistory.get(key)||{hist:[],lastSeen:0,physical};
  const latest=current.hist[current.hist.length-1];
  if(!latest||latest.ts!==v.ts||latest.lat!==v.lat||latest.lon!==v.lon){
    current.hist.push({lat:v.lat,lon:v.lon,ts:v.ts});
  }
  current.hist=current.hist.filter(point=>now-Number(point.ts)<=ROUTE_INFERENCE_GRACE_MS).slice(-6);
  current.lastSeen=now; current.physical=physical;
  S.routeScanHistory.set(key,current);
  for(const [id,record] of S.routeScanHistory){
    if(now-Number(record.lastSeen||0)>ROUTE_INFERENCE_GRACE_MS) S.routeScanHistory.delete(id);
  }
  return {...v,hist:[...current.hist],speed:isFinite(Number(v.feedSpeed))?Number(v.feedSpeed):null,routeScanHistoryKey:key};
}
function routeScanInferenceCandidate(match,v,now=Date.now()){
  if(!match||String(v.line)!==String(match.line)) return null;
  const similarity=v.dest&&match.head?destinationSimilarity(v.dest,match.head):1;
  if(v.dest&&match.head&&similarity<.34) return null;
  if(S.destFilter&&destinationSimilarity(match.head||v.dest,S.destFilter)<.75) return null;
  const direction=scheduledJourneyDirection(match);
  if(S.dir!=='all'&&direction!=='unknown'&&direction!==S.dir) return null;
  const fit=routePatternMovementFit(match.pattern,v,S.stop);
  if(!fit) return null;
  const rawSpeed=Number(v.feedSpeed), learnedSpeed=Number(v.speed);
  const speed=isFinite(rawSpeed)&&rawSpeed>=MIN_SPEED&&rawSpeed<=MAX_SPEED?rawSpeed:isFinite(learnedSpeed)&&learnedSpeed>=MIN_SPEED&&learnedSpeed<=MAX_SPEED?learnedSpeed:DEFAULT_SPEED;
  const routeSecs=Math.max(0,fit.remaining)/speed+(Math.max(0,fit.remaining)/1000)*24;
  const scheduleSecs=isFinite(Number(match.at))?(Number(match.at)-now)/1000:routeSecs;
  const scheduleGap=Math.abs(scheduleSecs-routeSecs);
  const priority=Number(match.priority)||0;
  const score=fit.meanOffset*.55+fit.current.metres*.45+Math.min(900,scheduleGap*.35)+(1-similarity)*90-priority*14;
  return {trip:String(match.trip),pattern:match.pattern,fit,score,row:match,scheduleGap,similarity,inferred:true};
}
function inferredRouteScanCandidates(plan,v,now=Date.now()){
  const candidates=[];
  for(const match of plan&&plan.matches||[]){
    const candidate=routeScanInferenceCandidate(match,v,now);
    if(candidate) candidates.push(candidate);
  }
  candidates.sort((a,b)=>a.score-b.score||a.fit.current.metres-b.fit.current.metres||String(a.trip).localeCompare(String(b.trip)));
  const best=chooseInferredJourneyCandidate(candidates);
  if(!best) return [];
  return candidates.filter(candidate=>candidate.pattern.id===best.pattern.id);
}
function inferredRouteScanMatch(plan,v,claimedTrips,now=Date.now()){
  const claims=claimedTrips instanceof Map?claimedTrips:new Map();
  return inferredRouteScanCandidates(plan,v,now).find(candidate=>!claims.has(candidate.trip)||claims.get(candidate.trip)===v.id)||null;
}
function routeScanVehicleCandidates(plan,v,now=Date.now()){
  if(!plan||!v) return [];
  if(v.journey){
    const tripMatch=uniqueCompatibleTrips(plan.matches,v.journey,item=>item.trip);
    if(tripMatch.items.length&&!tripMatch.ambiguous){
      return tripMatch.items.map(match=>({trip:String(match.trip),pattern:match.pattern,row:match,score:-100000,inferred:false}));
    }
  }
  return inferredRouteScanCandidates(plan,v,now);
}
function matchRouteScanVehicle(plan,v,claimedTrips,now=Date.now(),preparedCandidates){
  if(!plan||!v) return null;
  const claims=claimedTrips instanceof Map?claimedTrips:new Map();
  const candidates=Array.isArray(preparedCandidates)?preparedCandidates:routeScanVehicleCandidates(plan,v,now);
  for(const candidate of candidates){
    const match=candidate.row, inferred=!!candidate.inferred;
    if(!match) continue;
    if(inferred&&claims.has(candidate.trip)&&claims.get(candidate.trip)!==v.id) continue;
    if(String(v.line)!==String(match.line)) continue;
    if(v.dest&&match.head&&destinationSimilarity(v.dest,match.head)<.34) continue;
    if(S.destFilter&&destinationSimilarity(match.head||v.dest,S.destFilter)<.75) continue;
    const position=projectVehicleToPattern(match.pattern,v);
    if(!position||position.metres>800) continue;
    const remaining=match.targetAlong-position.along;
    if(remaining < -120 || remaining > ROUTE_SCAN_MAX_ROUTE_METRES) continue;
    if(inferred) claims.set(candidate.trip,v.id);
    v.corridorTrip=match.trip; v.corridorTracked=true; v.corridorRemaining=remaining; v.corridorConfirmedAt=now;
    if(inferred){v.inferredTrip=match.trip;v.inferredPattern=match.pattern.id;v.inferredAt=now;}
    return v;
  }
  return null;
}

'''
bus, count = re.subn(route_scan_block, route_scan_new, bus, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f"route scan block: expected one match, found {count}")

poll_pattern = r"async function pollRouteCorridor\(\)\{.*?\n\}\n\n(?=/\* ============================================================\n   Simulator)"
poll_new = r'''async function pollRouteCorridor(){
  if(S.demo||!S.origin||!S.stop||!S.ttStop||S.routeScanBusy||Date.now()-S.lastRouteScan<ROUTE_SCAN_INTERVAL_MS) return [];
  const started=Date.now(), stopId=String(S.stop.id), timetableRun=S.timetableRun;
  S.lastRouteScan=started;
  const plans=routeScanPlans(started);
  S.routeScanBoxes=plans.length;
  S.routeScanPatterns=new Set(plans.flatMap(plan=>plan.matches.map(match=>match.pattern.id))).size;
  S.routeScanVehicles=0; S.routeScanError='';
  if(!plans.length){ renderLiveDiagnostics(); return []; }
  const urls=feedUrlsForBoxes(plans.map(plan=>plan.bbox));
  if(urls.length!==plans.length){ S.routeScanError='Upstream route scan is not configured'; renderLiveDiagnostics(); return []; }
  const ctl=new AbortController(); S.routeScanAbort=ctl; S.routeScanBusy=true; renderLiveDiagnostics();
  try{
    const settled=await Promise.allSettled(urls.map((url,index)=>fetchLiveResponse(url,ctl.signal).then(item=>({item,plan:plans[index]}))));
    if(ctl.signal.aborted||!S.stop||String(S.stop.id)!==stopId||S.timetableRun!==timetableRun) return [];
    const observed=new Map();
    for(const result of settled){
      if(result.status!=='fulfilled') continue;
      const parsed=parseLivePayloads([result.value.item],Date.now());
      for(const vehicle of parsed.vehicles){
        const tracked=rememberRouteScanVehicle(vehicle);
        let entry=observed.get(tracked.id);
        if(!entry){entry={vehicle:tracked,plan:{matches:[]}};observed.set(tracked.id,entry);}
        else if(tracked.ts>entry.vehicle.ts) entry.vehicle=tracked;
        mergeRouteScanMatches(entry.plan.matches,result.value.plan.matches);
      }
    }
    const pending=[...observed.values()].map(entry=>({...entry,candidates:routeScanVehicleCandidates(entry.plan,entry.vehicle,started)}))
      .filter(entry=>entry.candidates.length)
      .sort((a,b)=>a.candidates[0].score-b.candidates[0].score||b.vehicle.ts-a.vehicle.ts||String(a.vehicle.id).localeCompare(String(b.vehicle.id)));
    const claimedTrips=new Map(), merged=new Map();
    for(const entry of pending){
      const matched=matchRouteScanVehicle(entry.plan,entry.vehicle,claimedTrips,started,entry.candidates); if(!matched) continue;
      const current=merged.get(matched.id); if(!current||matched.ts>current.ts) merged.set(matched.id,matched);
    }
    const vehicles=[...merged.values()];
    S.routeScanVehicles=vehicles.length;
    const failures=settled.filter(result=>result.status==='rejected').length;
    if(failures===settled.length) S.routeScanError='Upstream route scan temporarily unavailable';
    else if(failures) S.routeScanError='Part of the upstream route scan was unavailable';
    if(vehicles.length){ ingest(vehicles); learnDests(); renderDests(); if(boardRefreshCanRender()) render(); else renderLiveDiagnostics(); }
    else renderLiveDiagnostics();
    return vehicles;
  }catch(e){
    if(!ctl.signal.aborted) S.routeScanError='Upstream route scan temporarily unavailable';
    return [];
  }finally{
    if(S.routeScanAbort===ctl) S.routeScanAbort=null;
    S.routeScanBusy=false; renderLiveDiagnostics();
  }
}

'''
bus, count = re.subn(poll_pattern, poll_new, bus, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f"route corridor poll: expected one match, found {count}")

bus = replace_once(
    bus,
    "routeScanPlans,rememberRouteScanVehicle,inferredRouteScanMatch,matchRouteScanVehicle,pollRouteCorridor",
    "routeScanPlans,routeScanRowPriority,routeScanVehicleHistoryKey,rememberRouteScanVehicle,routeScanInferenceCandidate,inferredRouteScanCandidates,inferredRouteScanMatch,routeScanVehicleCandidates,matchRouteScanVehicle,pollRouteCorridor",
    "test API route scan exports",
)
bus_path.write_text(bus, encoding="utf-8")

package_path = ROOT / "kerbside-backend/package.json"
package = package_path.read_text(encoding="utf-8")
package = replace_once(package, '"version": "0.6.60"', '"version": "0.6.61"', "package version")
package_path.write_text(package, encoding="utf-8")

worker_path = ROOT / "kerbside-backend/src/worker.js"
worker = worker_path.read_text(encoding="utf-8")
worker = replace_once(worker, "version: '0.6.60'", "version: '0.6.61'", "Worker version")
worker_path.write_text(worker, encoding="utf-8")

worker_test_path = ROOT / "kerbside-backend/test/worker.test.js"
worker_test = worker_test_path.read_text(encoding="utf-8").replace("0.6.60", "0.6.61")
worker_test_path.write_text(worker_test, encoding="utf-8")

browser_path = ROOT / "kerbside-backend/tests/browser-regression.mjs"
browser = browser_path.read_text(encoding="utf-8").replace("0.6.60", "0.6.61")
anchor = "  assert.deepEqual(reliability,{stationaryHeld:true,historyReset:true,bothShown:true,inShown:true,remoteInferred:true});\n"
extra = r'''

  const routeScanHardening = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState;
    const saved={stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,destFilter:state.destFilter,ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion,routeScanHistory:state.routeScanHistory};
    try{
      const fixedNow=new Date(2026,7,3,12,0,0,0).getTime();
      state.stop={id:'scan-target',timetableId:'scan-target',lat:52.5,lon:-2.1,name:'Scan target'};
      state.origin={lat:52.5,lon:-2.1,label:'Test'};
      state.anchor={lat:52.55,lon:-2.1,name:'Town Centre',synthetic:false};
      state.dir='in';state.destFilter='Town Centre';state.routeScanHistory=new Map();
      const longPattern={id:'late-pattern',shape:true,stopProgress:null,points:[{lat:52.5,lon:-2.6},{lat:52.5,lon:-2.35},{lat:52.5,lon:-2.1}],stops:[{id:'late-start',name:'Late start',lat:52.5,lon:-2.6},{id:'scan-target',name:'Scan target',lat:52.5,lon:-2.1}]};
      state.ttStop={id:'scan-target',d:[[700,'63','Town Centre','always','in','late-trip','late-pattern'],[740,'63','Town Centre','always','in','future-trip','late-pattern']]};
      state.timetable={services:{always:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},tripPatterns:{'late-trip':'late-pattern','future-trip':'late-pattern'},patterns:{'late-pattern':{p:longPattern.points.map(p=>[p.lat,p.lon]),s:longPattern.stops.map(s=>[s.id,s.name,s.lat,s.lon]),g:1}}};
      state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun++;
      const plans=api.routeScanPlans(fixedNow);
      const lateIncluded=plans.some(plan=>plan.matches.some(match=>match.trip==='late-trip'));
      const preferredPriority=api.routeScanRowPriority({direction:'in',head:'Town Centre'});
      const wrongPriority=api.routeScanRowPriority({direction:'out',head:'Other Place'});

      const now=Date.now();
      const pattern={id:'allocation-pattern',shape:true,stopProgress:null,points:[{lat:52.5,lon:-2.5},{lat:52.5,lon:-2.3},{lat:52.5,lon:-2.1}],stops:[{id:'allocation-start',name:'Start',lat:52.5,lon:-2.5},{id:'scan-target',name:'Scan target',lat:52.5,lon:-2.1}]};
      const invalidPlan={matches:[{trip:'fallback-trip',line:'63',head:'Town Centre',direction:'in',pattern,targetAlong:api.pointAlongPattern(pattern.points,1e9).along,at:now+20*60000,priority:18}]};
      const invalidVehicle={id:'invalid-ref-bus',vehicleRef:'fleet-invalid',journey:'not-a-real-trip',line:'63',lineRef:'63',operator:'TEST',dest:'Town Centre',lat:52.5,lon:-2.22,bearing:90,feedSpeed:8,ts:now,hist:[{lat:52.5,lon:-2.28,ts:now-60000},{lat:52.5,lon:-2.22,ts:now}]};
      const invalidMatched=api.matchRouteScanVehicle(invalidPlan,invalidVehicle,new Map(),now);

      api.rememberRouteScanVehicle({id:'physical-a',vehicleRef:'fleet-a',journey:'journey-a',line:'63',lineRef:'63',operator:'TEST',lat:52.5,lon:-2.3,ts:now-30000,feedSpeed:8},now-30000);
      const resetTracked=api.rememberRouteScanVehicle({id:'physical-b',vehicleRef:'fleet-a',journey:'journey-b',line:'63',lineRef:'63',operator:'TEST',lat:52.5,lon:-2.28,ts:now,feedSpeed:8},now);

      const targetAlong=api.pointAlongPattern(pattern.points,1e9).along;
      const allocationPlan={matches:[
        {trip:'near-trip',line:'63',head:'Town Centre',direction:'in',pattern,targetAlong,at:now+10*60000,priority:18},
        {trip:'far-trip',line:'63',head:'Town Centre',direction:'in',pattern,targetAlong,at:now+30*60000,priority:18}
      ]};
      const near={id:'near-bus',vehicleRef:'near',journey:'bad-near',line:'63',lineRef:'63',operator:'TEST',dest:'Town Centre',lat:52.5,lon:-2.16,bearing:90,feedSpeed:8,ts:now,hist:[{lat:52.5,lon:-2.18,ts:now-30000},{lat:52.5,lon:-2.16,ts:now}]};
      const far={id:'far-bus',vehicleRef:'far',journey:'bad-far',line:'63',lineRef:'63',operator:'TEST',dest:'Town Centre',lat:52.5,lon:-2.28,bearing:90,feedSpeed:8,ts:now,hist:[{lat:52.5,lon:-2.31,ts:now-30000},{lat:52.5,lon:-2.28,ts:now}]};
      const claims=new Map();
      const nearMatched=api.matchRouteScanVehicle(allocationPlan,near,claims,now);
      const farMatched=api.matchRouteScanVehicle(allocationPlan,far,claims,now);
      return {
        invalidReferenceRecovered:!!(invalidMatched&&invalidMatched.inferredTrip==='fallback-trip'),
        lateIncluded,
        prioritySelected:preferredPriority>wrongPriority,
        remoteHistoryReset:resetTracked.hist.length===1&&state.routeScanHistory.size===1,
        distinctTrips:nearMatched&&farMatched&&nearMatched.inferredTrip==='near-trip'&&farMatched.inferredTrip==='far-trip'&&nearMatched.inferredTrip!==farMatched.inferredTrip
      };
    }finally{Object.assign(state,saved);}
  });
  assert.deepEqual(routeScanHardening,{invalidReferenceRecovered:true,lateIncluded:true,prioritySelected:true,remoteHistoryReset:true,distinctTrips:true});
'''
if anchor not in browser:
    raise SystemExit("browser reliability anchor not found")
browser = browser.replace(anchor, anchor + extra, 1)
browser_path.write_text(browser, encoding="utf-8")

readme_path = ROOT / "kerbside-backend/README.md"
readme = readme_path.read_text(encoding="utf-8")
readme_anchor = "Kerbside 0.6.59 fixes the 0.6.58 deployment packaging gap by embedding the transparent yellow bus-and-location artwork directly inside `bus.html` as an SVG data URI. This keeps the icon background-free and preserves the validated 38-pixel mobile header layout while ensuring GitHub Pages receives the artwork atomically with the page instead of depending on a separately generated untracked asset. WebKit regression verifies that the embedded SVG loads at 192 × 192, uses `object-fit: contain`, has no full-canvas background rectangle and requires no external header-icon file.\n"
readme_notes = readme_anchor + "\nKerbside 0.6.60 hardens live route accuracy and deployment verification. Ordered route movement can override misleading town-centre direction only when GPS is actually progressing forward, stationary reports stop marker extrapolation, stale movement state resets after long gaps or implausible jumps, distant missing-journey buses can be inferred from repeated route-aligned GPS, and display-only stop progress follows bounded marker interpolation. The release workflow now publishes the validated diff instead of a hard-coded file list, while production verification opens the deployed app in WebKit and checks local assets, layout, map startup and browser errors.\n\nKerbside 0.6.61 strengthens timetable-guided distant allocation. A non-empty but invalid or ambiguous operator journey reference may now fall back to strict ordered GPS-pattern inference, corridor planning includes services up to 30 minutes late, and scan boxes prioritise the selected direction and destination before applying request limits. Remote movement history is isolated by physical vehicle, operator, line and journey identity. Inferred matches include scheduled-arrival plausibility and claim each timetable trip at most once per scan, allowing multiple buses on the same route pattern to receive distinct departures. WebKit regression covers every new failure case.\n"
readme = replace_once(readme, readme_anchor, readme_notes, "README release notes")
readme_path.write_text(readme, encoding="utf-8")

print("Applied Kerbside 0.6.61 route-allocation hardening release.")
