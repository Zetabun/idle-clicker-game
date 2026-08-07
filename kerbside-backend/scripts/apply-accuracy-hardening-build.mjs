#!/usr/bin/env node
import fs from 'node:fs';

const version = String(process.argv[2] || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Usage: node apply-accuracy-hardening-build.mjs <semver>');
}

const busPath = 'bus.html';
let source = fs.readFileSync(busPath, 'utf8');
const original = source;

function replaceExact(label, oldText, newText) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one target, found ${count}`);
  source = source.replace(oldText, newText);
}

function replaceExactCount(label, oldText, newText, expectedCount) {
  const count = source.split(oldText).length - 1;
  if (count !== expectedCount) throw new Error(`${label}: expected ${expectedCount} targets, found ${count}`);
  source = source.split(oldText).join(newText);
}

function replaceSection(label, startMarker, endMarker, replacement) {
  const first = source.indexOf(startMarker);
  if (first < 0) throw new Error(`${label}: start marker not found`);
  if (source.indexOf(startMarker, first + startMarker.length) >= 0) throw new Error(`${label}: start marker is not unique`);
  const end = source.indexOf(endMarker, first + startMarker.length);
  if (end < 0) throw new Error(`${label}: end marker not found`);
  source = source.slice(0, first) + replacement + source.slice(end);
}

replaceExact(
  'origin state documentation',
  "  origin:null,              // {lat,lon,label}\n",
  "  origin:null,              // {lat,lon,label,accuracy,source:'manual'|'device'}\n"
);

replaceExact(
  'manual input cancels GPS',
  "$('q').addEventListener('input', e=>{\n  const v=e.target.value.trim();\n",
  "$('q').addEventListener('input', e=>{\n  // Typing is an explicit location choice. Invalidate any outstanding device\n  // lookup immediately so a late GPS callback cannot overwrite the search.\n  cancelPendingDeviceLocation();\n  const v=e.target.value.trim();\n"
);

replaceExact(
  'origin source and GPS cancellation',
  `async function setOrigin(lat,lon,label,accuracy){
  const run=++S.locationRun;
  if(S.pollAbort) S.pollAbort.abort();
  const metres=Number(accuracy);
  S.origin={lat,lon,label:label||'Chosen point',accuracy:Number.isFinite(metres)&&metres>=0?Math.round(metres):null};
`,
  `let cancelLocationLookup=null;
let locationLookupGeneration=0;
function savedOriginSource(origin){
  const explicit=String(origin&&origin.source||'').toLowerCase();
  if(explicit==='device'||explicit==='manual') return explicit;
  // Releases before 0.7.5 did not persist a source flag. "My location" was
  // exclusively produced by geolocation, so it is the safe legacy migration.
  return String(origin&&origin.label||'')==='My location'?'device':'manual';
}
function cancelPendingDeviceLocation(){
  locationLookupGeneration++;
  if(cancelLocationLookup){ cancelLocationLookup(); cancelLocationLookup=null; }
}
async function setOrigin(lat,lon,label,accuracy,sourceKind){
  const originSource=sourceKind==='device'?'device':'manual';
  if(originSource!=='device') cancelPendingDeviceLocation();
  const run=++S.locationRun;
  if(S.pollAbort) S.pollAbort.abort();
  const metres=Number(accuracy);
  S.origin={lat,lon,label:label||'Chosen point',accuracy:Number.isFinite(metres)&&metres>=0?Math.round(metres):null,source:originSource};
`
);

replaceExact(
  'remove old GPS cancel declaration',
  'let cancelLocationLookup=null;\nfunction requestBestLocation(onSuccess,onError,maximumAge){\n  if(cancelLocationLookup){ cancelLocationLookup(); cancelLocationLookup=null; }\n  let best=null,done=false,watchId=null,timer=null;\n',
  `function requestBestLocation(onSuccess,onError,maximumAge){
  cancelPendingDeviceLocation();
  const generation=locationLookupGeneration;
  let best=null,done=false,watchId=null,timer=null;
`
);

replaceExact(
  'guard GPS completion generation',
  `  const finish=error=>{
    if(done) return;
    done=true; cleanup(); cancelLocationLookup=null;
    if(best) onSuccess(best); else onError(error||{code:3});
  };
  const accept=position=>{
    best=betterLocationFix(best,locationFixFromPosition(position));
    if(best&&best.accuracy<=LOCATION_TARGET_ACCURACY_METRES) finish();
  };
  const fail=error=>{
    if(error&&error.code===1) finish(error);
    else if(error&&error.code===3&&!best) finish(error);
  };
`,
  `  const finish=error=>{
    if(done||generation!==locationLookupGeneration) return;
    done=true; cleanup(); cancelLocationLookup=null;
    if(best) onSuccess(best); else onError(error||{code:3});
  };
  const accept=position=>{
    if(done||generation!==locationLookupGeneration) return;
    best=betterLocationFix(best,locationFixFromPosition(position));
    if(best&&best.accuracy<=LOCATION_TARGET_ACCURACY_METRES) finish();
  };
  const fail=error=>{
    if(done||generation!==locationLookupGeneration) return;
    if(error&&error.code===1) finish(error);
    else if(error&&error.code===3&&!best) finish(error);
  };
`
);

replaceExact(
  'device origin source',
  "  setOrigin(fix.lat,fix.lon,'My location',fix.accuracy);\n",
  "  setOrigin(fix.lat,fix.lon,'My location',fix.accuracy,'device');\n"
);

replaceSection(
  'startup origin restoration',
  'if(saved && saved.origin && isFinite(saved.origin.lat)){',
  '// Browser page zoom remains available',
  `const savedOriginKind=saved&&saved.origin?savedOriginSource(saved.origin):'';
if(saved && saved.origin && isFinite(saved.origin.lat) && savedOriginKind==='manual'){
  // A searched/chosen place is intentional and may be reused. Preserve its
  // selected stop too, because both belong to the same explicit place choice.
  S.pendingStopId = saved.stopId || null;
  $('q').value = saved.origin.label || '';
  setOrigin(saved.origin.lat, saved.origin.lon, saved.origin.label, saved.origin.accuracy, 'manual');
} else if(navigator.geolocation){
  // A saved device coordinate is only a previous observation, not a preference.
  // Reacquire on every session so travelling since the last visit cannot reopen
  // the old street or silently pick yesterday's stand.
  S.pendingStopId = null;
  $('q').value = '';
  setStatus('Finding you','');
  requestBestLocation(useDeviceLocation,()=>{ setStatus('Search a place or use the locate button',''); },15000);
} else if(saved && saved.origin && savedOriginKind==='device'){
  S.pendingStopId = null;
  $('q').value = '';
  setStatus('Search a place to choose your current location','');
}

`
);

replaceExact(
  'stop ambiguity helpers',
  'function showDiscoveredStops(stops,lat,lon,cacheable){\n',
  `function stopSelectionCandidates(stops,origin){
  if(savedOriginSource(origin)!=='device') return [];
  const accuracy=Number(origin&&origin.accuracy);
  if(!Number.isFinite(accuracy)||accuracy<=0) return [];
  return (Array.isArray(stops)?stops:[])
    .filter(stop=>stop&&Number.isFinite(Number(stop.d))&&Number(stop.d)<=accuracy)
    .sort((a,b)=>Number(a.d)-Number(b.d));
}
function stopSelectionNeedsChoice(stops,origin){
  return stopSelectionCandidates(stops,origin).length>=2;
}
function chooseDiscoveredStop(wanted){
  if(wanted){ selectStop(wanted); return true; }
  if(stopSelectionNeedsChoice(S.stops,S.origin)){
    $('stopName').textContent='Choose the correct stop';
    $('stopMeta').textContent='GPS ACCURACY COVERS MORE THAN ONE STAND';
    openStopPicker('Your GPS position covers more than one nearby stand. Choose the stop you are waiting at.');
    return false;
  }
  selectStop(S.stops[0]);
  return true;
}
function showDiscoveredStops(stops,lat,lon,cacheable){
`
);

replaceExact(
  'accuracy-aware discovered stop selection',
  '  S.pendingStopId=null; selectStop(want||S.stops[0]); return true;\n',
  '  S.pendingStopId=null; chooseDiscoveredStop(want); return true;\n'
);

replaceExact(
  'accuracy-aware cached stop selection',
  '    S.pendingStopId = null;\n    selectStop(want || S.stops[0]);\n    return;\n',
  '    S.pendingStopId = null;\n    chooseDiscoveredStop(want);\n    return;\n'
);

replaceSection(
  'shared stop picker',
  "$('changeStop').addEventListener('click', ()=>{",
  "$('closePicker').addEventListener('click', closePicker);",
  `function openStopPicker(message){
  if(!S.stops.length){ toast('No stops loaded yet.'); return; }
  const box=$('stopItems');
  box.innerHTML = S.stops.slice(0,60).map((s,i)=>{
    const m = MAPPED[String(s.id)];
    const badge = m && m.routes.length
      ? '<span class="hasroutes">'+m.routes.length+' routes</span>' : '';
    return '<button class="stopitem" data-i="'+i+'"><span class="flagicon" style="width:12px;height:14px"></span>'+
      '<span style="min-width:0"><span class="nm">'+esc(s.name)+'</span>'+
      (s.ind?'<span class="sub">Stop '+esc(s.ind)+'</span>':'')+'</span>'+
      badge+'<span class="dist">'+fmtDist(s.d)+'</span></button>';
  }).join('');
  [...box.children].forEach(b=>b.addEventListener('click',()=>selectStop(S.stops[+b.dataset.i],true)));
  $('stopPicker').classList.add('show');
  if(message) toast(message);
}
$('changeStop').addEventListener('click', ()=>openStopPicker());
`
);

replaceSection(
  'UK service clock',
  'function localMidnight(d){',
  'function activateTimetable(data,source,region,meta){',
  `const PATTERN_CACHE = new Map();
const UK_TIME_ZONE = 'Europe/London';
const UK_CLOCK = new Intl.DateTimeFormat('en-GB-u-ca-gregory',{
  timeZone:UK_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
});
function ukDateTimeParts(value){
  const date=value instanceof Date?value:new Date(value);
  const parts={};
  for(const part of UK_CLOCK.formatToParts(date)){
    if(part.type!=='literal') parts[part.type]=Number(part.value);
  }
  return {year:parts.year,month:parts.month,day:parts.day,hour:parts.hour,minute:parts.minute,second:parts.second};
}
function serviceDateKey(serviceDate){
  const y=serviceDate.getUTCFullYear(),m=String(serviceDate.getUTCMonth()+1).padStart(2,'0'),d=String(serviceDate.getUTCDate()).padStart(2,'0');
  return ''+y+m+d;
}
function ymd(value){
  return serviceDateKey(ukServiceDate(value));
}
function ukServiceDate(value){
  const p=ukDateTimeParts(value||new Date());
  return new Date(Date.UTC(p.year,p.month-1,p.day));
}
function shiftServiceDate(serviceDate,days){
  return new Date(Date.UTC(serviceDate.getUTCFullYear(),serviceDate.getUTCMonth(),serviceDate.getUTCDate()+Number(days||0)));
}
function ukOffsetMinutes(epochMs){
  const p=ukDateTimeParts(new Date(epochMs));
  const represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
  return Math.round((represented-epochMs)/60000);
}
function ukWallClockEpoch(year,month,day,hour,minute){
  const wall=Date.UTC(year,month-1,day,hour,minute,0,0);
  const offsets=[...new Set([
    ukOffsetMinutes(wall-12*3600000),ukOffsetMinutes(wall),ukOffsetMinutes(wall+12*3600000)
  ])];
  const candidates=offsets.map(offset=>{
    const epoch=wall-offset*60000,p=ukDateTimeParts(new Date(wall-offset*60000));
    const represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,0,0);
    return {epoch,represented};
  });
  const exact=candidates.filter(candidate=>candidate.represented===wall).sort((a,b)=>a.epoch-b.epoch);
  if(exact.length) return exact[0].epoch;
  // The spring clock change creates a wall-clock gap. Match the browser's
  // normal local-Date behaviour by advancing to the first representable time
  // after that gap rather than silently shifting the service to the prior hour.
  const after=candidates.filter(candidate=>candidate.represented>wall)
    .sort((a,b)=>(a.represented-wall)-(b.represented-wall)||a.epoch-b.epoch);
  return after.length?after[0].epoch:candidates.sort((a,b)=>b.represented-a.represented)[0].epoch;
}
function serviceDepartureTime(serviceDate,mins){
  const numeric=Number(mins);
  if(!isFinite(numeric)) return new Date(NaN);
  const total=Math.max(0,Math.floor(numeric));
  const dayOffset=Math.floor(total/1440), minuteOfDay=total%1440;
  const target=shiftServiceDate(serviceDate,dayOffset);
  return new Date(ukWallClockEpoch(
    target.getUTCFullYear(),target.getUTCMonth()+1,target.getUTCDate(),
    Math.floor(minuteOfDay/60),minuteOfDay%60
  ));
}
function serviceRuns(ref, serviceDate){
  if(!ref) return true;
  const day=(serviceDate.getUTCDay()+6)%7;
  const svc=S.timetable && S.timetable.services && S.timetable.services[ref];
  if(svc){
    const key=serviceDateKey(serviceDate);
    if((svc.remove||[]).includes(key)) return false;
    if((svc.add||[]).includes(key)) return true;
    if(svc.start && key<svc.start) return false;
    if(svc.end && key>svc.end) return false;
    return !svc.days || String(svc.days)[day]==='1';
  }
  if(/^[01]{7}$/.test(String(ref))) return String(ref)[day]==='1';
  if(S.timetableSource==='national'){ S.timetableUnknownServices++; return false; }
  return true;
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),parseDepMinutes,serviceDepartureTime,serviceRuns,ukDateTimeParts,ukServiceDate,serviceDateKey,ukWallClockEpoch};
}
`
);

replaceExact(
  'UK timetable cache day',
  "  const moment=now||new Date(), day=ymd(moment), cache=TIMETABLE_ROWS_CACHE;\n  if(cache.stop===stop&&cache.timetable===S.timetable&&cache.run===S.timetableRun&&cache.day===day) return cache.rows;\n  const out=[];\n  const today=localMidnight(moment);\n",
  "  const moment=now||new Date(), today=ukServiceDate(moment), day=serviceDateKey(today), cache=TIMETABLE_ROWS_CACHE;\n  if(cache.stop===stop&&cache.timetable===S.timetable&&cache.run===S.timetableRun&&cache.day===day) return cache.rows;\n  const out=[];\n"
);

replaceExact(
  'UK service date shifts',
  "      const serviceDate=new Date(today);\n      serviceDate.setDate(serviceDate.getDate()+targetOffset-departureDayOffset);\n",
  "      const serviceDate=shiftServiceDate(today,targetOffset-departureDayOffset);\n"
);

replaceSection(
  'pattern-only nearby inference',
  'function inferVehicleJourneyPattern(v,stop,now=Date.now()){',
  'function journeyProgress(v){',
  `function inferVehicleJourneyPattern(v,stop,now=Date.now()){
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
    const group=byPattern.get(pattern.id)||[]; group.push(candidate); byPattern.set(pattern.id,group);
  }
  const representatives=[...byPattern.values()].map(group=>{
    const ranked=[...group].sort((a,b)=>a.score-b.score||a.fit.current.metres-b.fit.current.metres);
    const candidate=ranked[0];
    return {...candidate,tripCandidates:[...new Set(group.map(item=>String(item.trip||'')).filter(Boolean))]};
  });
  let best=chooseInferredJourneyCandidate(representatives);
  if(!best&&v.inferredJourney&&v.inferenceStopId===stopId&&now-Number(v.inferredAt||0)<=ROUTE_INFERENCE_GRACE_MS){
    const held=v.inferredJourney,pattern=timetablePatternRecord('',held.patternId||v.inferredPattern);
    const fit=pattern&&routePatternMovementFit(pattern,v,stop);
    if(fit) best={...held,pattern,fit};
  }
  if(!best){
    if(now-Number(v.inferredAt||0)>ROUTE_INFERENCE_GRACE_MS){delete v.inferredJourney;delete v.inferredTrip;delete v.inferredPattern;}
    return null;
  }
  // GPS geometry proves which ordered route pattern the vehicle is following.
  // Successive timetable trips often share that exact pattern, so geometry alone
  // must never choose one of those departures or manufacture journey identity.
  const result={...best,trip:'',matchedTrip:'',patternId:String(best.pattern.id),patternOnly:true,inferred:true};
  v.inferredJourney=result; delete v.inferredTrip; v.inferredPattern=result.patternId; v.inferredAt=now;
  v.inferenceStopId=stopId;v.inferenceGpsTs=Number(v.ts);
  return result;
}
function inferredRouteEvidence(base,inference){
  if(!inference) return base;
  return {...base,score:Math.max(Number(base&&base.score)||0,4),label:'GPS movement matched to ordered route pattern',
    journeyMatch:!!(base&&base.journeyMatch),pathMatch:true,matchStrength:Number(base&&base.matchStrength)||0,
    matchedTrip:String(base&&base.matchedTrip||''),inferredJourney:true,inferredPattern:true,patternId:inference.patternId};
}

`
);

replaceExactCount(
  'remove distance dwell from inference scoring',
  'const routeSecs=Math.max(0,fit.remaining)/speed+(Math.max(0,fit.remaining)/1000)*24;',
  'const routeSecs=Math.max(0,fit.remaining)/speed;',
  2
);

replaceExact(
  'route scan origin identity',
  "    const match={trip:String(row.trip),line:String(row.line),head:row.head||'',pattern,targetAlong,at:Number(row.at)||0,routeId:row.routeId||'',operator:row.operator||'',stopSequence:row.stopSequence};\n",
  "    const match={trip:String(row.trip),line:String(row.line),head:row.head||'',pattern,targetAlong,at:Number(row.at)||0,originAt:Number.isFinite(Number(row.originAt))?Number(row.originAt):null,routeId:row.routeId||'',operator:row.operator||'',stopSequence:row.stopSequence};\n"
);

replaceSection(
  'pattern-only distant inference',
  'function inferredRouteScanMatch(plan,v,now=Date.now()){',
  '/* flatten a <VehicleActivity>',
  `function inferredRouteScanMatch(plan,v,now=Date.now()){
  const byPattern=new Map();
  for(const match of plan.matches||[]){
    if(String(v.line)!==String(match.line)||routeIdentityAgreement(match,v)<0) continue;
    const similarity=v.dest&&match.head?destinationSimilarity(v.dest,match.head):1;
    if(v.dest&&match.head&&similarity<.34) continue;
    const fit=routePatternMovementFit(match.pattern,v,S.stop);
    if(!fit) continue;
    const rawSpeed=Number(v.speed),feedSpeed=Number(v.feedSpeed);
    const speed=isFinite(rawSpeed)&&rawSpeed>=MIN_SPEED&&rawSpeed<=MAX_SPEED?rawSpeed:isFinite(feedSpeed)&&feedSpeed>=MIN_SPEED&&feedSpeed<=MAX_SPEED?feedSpeed:DEFAULT_SPEED;
    const routeSecs=Math.max(0,fit.remaining)/speed;
    const scheduleSecs=(Number(match.at)-now)/1000;
    const scheduleGap=isFinite(scheduleSecs)?Math.abs(scheduleSecs-routeSecs):0;
    const score=fit.meanOffset*.55+fit.current.metres*.45+(1-similarity)*90+Math.min(900,scheduleGap*.45);
    const candidate={trip:String(match.trip),pattern:match.pattern,fit,score,scheduleGap,row:match};
    const group=byPattern.get(match.pattern.id)||[];group.push(candidate);byPattern.set(match.pattern.id,group);
  }
  const representatives=[...byPattern.values()].map(group=>{
    const ranked=[...group].sort((a,b)=>a.score-b.score||a.fit.current.metres-b.fit.current.metres);
    return {...ranked[0],tripCandidates:[...new Set(group.map(item=>String(item.trip||'')).filter(Boolean))]};
  });
  const best=chooseInferredJourneyCandidate(representatives);
  return best?{...best,trip:'',patternOnly:true,patternId:String(best.pattern.id)}:null;
}
function matchRouteScanVehicle(plan,v){
  if(!plan||!v) return null;
  const compatible=(plan.matches||[]).filter(match=>String(v.line)===String(match.line)
    &&routeIdentityAgreement(match,v)>=0
    &&(!v.dest||!match.head||destinationSimilarity(v.dest,match.head)>=.34));
  let match=null;
  if(v.journey){
    const tripMatch=uniqueCompatibleTrips(compatible,v.journey,item=>item.trip);
    if(tripMatch.items.length&&!tripMatch.ambiguous) match=tripMatch.items[0];
  }
  if(!match){
    const originMatch=uniqueOriginTrips(compatible,v);
    if(originMatch.items.length&&!originMatch.ambiguous) match=originMatch.items[0];
  }
  if(!match){
    // A distant route scan may establish the corridor shape, but without a
    // unique journey reference or origin departure that is not enough evidence
    // to admit the vehicle as one specific timetable trip.
    const patternOnly=inferredRouteScanMatch(plan,v);
    if(patternOnly){delete v.inferredTrip;v.inferredPattern=patternOnly.patternId;v.inferredAt=Date.now();}
    return null;
  }
  const position=projectVehicleToPattern(match.pattern,v);
  if(!position||position.metres>800) return null;
  const remaining=match.targetAlong-position.along;
  if(remaining < -120 || remaining > ROUTE_SCAN_MAX_ROUTE_METRES) return null;
  v.corridorTrip=match.trip; v.corridorTracked=true; v.corridorRemaining=remaining; v.corridorConfirmedAt=Date.now();
  return v;
}

`
);

replaceExact(
  'UK timetable clock display',
  "function formatClock(ts){ return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }\n",
  "function formatClock(ts){ return new Date(ts).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:UK_TIME_ZONE}); }\n"
);

replaceExact(
  'ETA motion model insertion',
  'function estimate(v, stop, evidenceOverride, geometryOverride){\n',
  `const ETA_DWELL_SECONDS_PER_STOP = 18;
function remainingStopsToTarget(v,stop){
  const pattern=timetablePatternRecord(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern||v&&v.inferredPattern);
  if(!pattern) return 0;
  const vehicle=projectVehicleToPattern(pattern,v);
  if(!vehicle||vehicle.metres>800) return 0;
  const stops=orderedPatternStops(pattern),targetIndex=selectedPatternStopIndex(stops,stop,vehicle.along);
  if(targetIndex<=0) return 0;
  return stops.slice(0,targetIndex).filter(call=>Number(call.along)>Number(vehicle.along)+25).length;
}
function etaMotionModel(v,stop){
  const raw=Number(v&&v.speed);
  const moving=Number.isFinite(raw)&&raw>=MIN_SPEED&&raw<=MAX_SPEED;
  if(moving){
    const remainingStops=remainingStopsToTarget(v,stop);
    return {speed:raw,dwell:remainingStops*ETA_DWELL_SECONDS_PER_STOP,remainingStops,mode:'moving',stationary:false};
  }
  // lineSpeed()/DEFAULT_SPEED are learned end-to-end averages and therefore
  // already include time spent stopped. Adding dwell again double-counts it.
  const average=lineSpeed(v);
  const stationary=raw===0||Number(v&&v.stationaryAt)===Number(v&&v.ts);
  return {speed:average,dwell:0,remainingStops:0,mode:'average',stationary};
}
function estimate(v, stop, evidenceOverride, geometryOverride){
`
);

replaceExact(
  'ETA speed and dwell selection',
  `  let sp = v.speed;
  if(!isFinite(sp) || sp < MIN_SPEED || sp > MAX_SPEED) sp = lineSpeed(v);
  const dwell = (road/1000) * 24;
  const quality=etaGpsQuality(v);
`,
  `  const motion=etaMotionModel(v,stop);
  const sp=motion.speed, dwell=motion.dwell;
  const quality=etaGpsQuality(v);
`
);

replaceExact(
  'stationary age extrapolation',
  '  const ageCredit=Math.min(quality.age,Math.max(20,cadenceForAge*1.25),60);\n',
  '  const ageCredit=motion.stationary?0:Math.min(quality.age,Math.max(20,cadenceForAge*1.25),60);\n'
);

replaceExact(
  'ETA diagnostics return',
  "  return {secs:spatial, liveSecs, metres:straight, routeMetres:geometry&&geometry.remaining>0?geometry.remaining:null, geometry, learned:!!(learned&&learned.n>=3), confidence, spread, evidence, schedule, matchedSchedule, predictionDelayed:!quality.fresh, gpsAge:quality.age, gpsFreshWindow:quality.freshWindow};\n",
  "  return {secs:spatial, liveSecs, metres:straight, routeMetres:geometry&&geometry.remaining>0?geometry.remaining:null, geometry, learned:!!(learned&&learned.n>=3), confidence, spread, evidence, schedule, matchedSchedule, predictionDelayed:!quality.fresh, gpsAge:quality.age, gpsFreshWindow:quality.freshWindow, speedMode:motion.mode, dwellSeconds:dwell, remainingStops:motion.remainingStops, stationary:motion.stationary};\n"
);

replaceExact(
  'test API hardening helpers',
  'physicalVehicleKey,estimate,etaFreshWindowSeconds,etaGpsQuality,scheduleEtaBlendWeight,journeyGeometry,selectedPatternStopIndex,liveTimingLabel',
  'physicalVehicleKey,estimate,etaFreshWindowSeconds,etaGpsQuality,scheduleEtaBlendWeight,remainingStopsToTarget,etaMotionModel,inferVehicleJourneyPattern,inferredRouteEvidence,inferredRouteScanMatch,stopSelectionCandidates,stopSelectionNeedsChoice,savedOriginSource,ukDateTimeParts,ukServiceDate,serviceDateKey,ukWallClockEpoch,formatClock,journeyGeometry,selectedPatternStopIndex,liveTimingLabel'
);

if (source === original) throw new Error('Accuracy hardening patch made no changes');
fs.writeFileSync(busPath, source, 'utf8');
fs.writeFileSync('VERSION', version + '\n', 'utf8');

const packagePath = 'kerbside-backend/package.json';
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (!pkg.scripts || typeof pkg.scripts !== 'object') throw new Error('kerbside-backend/package.json has no scripts object');
if (!String(pkg.scripts.check || '').includes('tests/accuracy-hardening-regression.mjs')) {
  pkg.scripts.check = String(pkg.scripts.check || '') + ' && node --check tests/accuracy-hardening-regression.mjs';
}
pkg.scripts['test:accuracy-hardening'] = 'node tests/accuracy-hardening-regression.mjs';
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const ciPath = '.github/workflows/kerbside-check.yml';
let ci = fs.readFileSync(ciPath, 'utf8');
const auditLine = '          npm run test:audit --prefix kerbside-backend\n';
const auditCount = ci.split(auditLine).length - 1;
if (auditCount !== 2) throw new Error(`kerbside-check audit hooks: expected 2, found ${auditCount}`);
ci = ci.split(auditLine).join(auditLine + '          npm run test:accuracy-hardening --prefix kerbside-backend\n');
const parseNeedle = '            .github/workflows/deploy-kerbside-worker.yml \\\n            .github/workflows/kerbside-check.yml \\\n';
if (!ci.includes(parseNeedle)) throw new Error('kerbside-check YAML parse list target not found');
ci = ci.replace(parseNeedle,
  '            .github/workflows/deploy-kerbside-worker.yml \\\n            .github/workflows/deploy-kerbside-accuracy-hardening.yml \\\n            .github/workflows/kerbside-check.yml \\\n');
fs.writeFileSync(ciPath, ci, 'utf8');

console.log(`Applied Kerbside location, route identity, ETA dwell and UK-time hardening build ${version}.`);
