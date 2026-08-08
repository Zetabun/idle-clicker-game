#!/usr/bin/env python3
from pathlib import Path
import subprocess


def replace(path, old, new, expected=1):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} copies of replacement target, found {count}')
    target.write_text(text.replace(old, new), encoding='utf-8', newline='\n')


Path('VERSION').write_text('0.7.12\n', encoding='utf-8', newline='\n')

replace('bus.html',
"""const MATCHED_IDENTITY_GRACE_MS = 3*60*1000;
const MATCHED_IDENTITY_MAX_SKEW_MS = 3*60*1000;
const MATCHED_IDENTITY_MAX_METRES = 2500;
""",
"""const MATCHED_IDENTITY_GRACE_MS = 3*60*1000;
const MATCHED_IDENTITY_MAX_SKEW_MS = 3*60*1000;
const MATCHED_IDENTITY_MAX_METRES = 2500;
const MATCHED_IDENTITY_WAIT_MS = 1200;
const MATCHED_HANDOVER_MAX_LAG_MS = 45*1000;
""")

replace('bus.html',
"""function physicalVehicleKey(v){
  const owner=String(v&&(v.owner||v.operator)||'').trim()||'unknown';
  const vehicle=String(v&&v.vehicleRef||'').trim();
  return vehicle?owner+'|'+vehicle:'';
}
""",
"""function physicalVehicleKey(v){
  const owner=String(v&&(v.owner||v.operator)||'').trim()||'unknown';
  const vehicle=String(v&&v.vehicleRef||'').trim();
  if(vehicle) return owner+'|vehicle|'+vehicle;
  const unique=String(v&&v.vehicleUniqueId||'').trim();
  return unique?owner+'|vehicle-unique|'+unique:'';
}
""")

replace('bus.html',
"""function matchedVehicleToken(value){
  const raw=String(value||'').trim();
  if(!raw) return '';
  return /^0+\\d+$/.test(raw)?raw.replace(/^0+/,''):raw.toLowerCase();
}
async function fetchMatchedResponse(url,signal){
""",
"""function matchedVehicleToken(value){
  const raw=String(value||'').trim();
  if(!raw) return '';
  return /^0+\\d+$/.test(raw)?raw.replace(/^0+/,''):raw.toLowerCase();
}
function matchedRecordKey(match){
  const entity=String(match&&match.entityId||'').trim();
  if(entity) return 'entity|'+entity;
  return [matchedVehicleToken(match&&match.vehicleId),String(match&&match.tripId||''),String(match&&match.timestamp||''),String(match&&match.lat||''),String(match&&match.lon||'')].join('|');
}
async function fetchMatchedResponse(url,signal){
""")

replace('bus.html',
"""      const key=[record&&record.vehicleId,record&&record.tripId,record&&record.timestamp].join('|');
      if(record&&record.vehicleId&&record.tripId&&!unique.has(key)) unique.set(key,record);
""",
"""      const key=matchedRecordKey(record);
      if(record&&record.vehicleId&&record.tripId&&!unique.has(key)) unique.set(key,record);
""")

replace('bus.html',
"""  return [...unique.values()];
}
function applyMatchedIdentities(vehicles,matches,now=Date.now()){
  const index=new Map();
  for(const match of Array.isArray(matches)?matches:[]){
    const token=matchedVehicleToken(match&&match.vehicleId);
    if(!token||!match.tripId) continue;
    const list=index.get(token)||[];list.push(match);index.set(token,list);
  }
  let applied=0;
  for(const v of Array.isArray(vehicles)?vehicles:[]){
    const tokens=[matchedVehicleToken(v&&v.vehicleRef),matchedVehicleToken(v&&v.vehicleUniqueId)].filter(Boolean);
    const candidates=[];
    const seen=new Set();
    for(const token of tokens){
      for(const match of index.get(token)||[]){
        const key=[match.vehicleId,match.tripId,match.timestamp].join('|');
        if(seen.has(key)) continue;seen.add(key);
        const timestamp=Number(match.timestamp),referenceTs=Number.isFinite(Number(v.sourceTs))?Number(v.sourceTs):Number(v.ts);
        const skew=Math.abs(referenceTs-timestamp);
        if(!Number.isFinite(timestamp)||!Number.isFinite(referenceTs)||skew>MATCHED_IDENTITY_MAX_SKEW_MS) continue;
        const metres=dist(Number(v.lat),Number(v.lon),Number(match.lat),Number(match.lon));
        const allowed=Math.min(MATCHED_IDENTITY_MAX_METRES,250+skew/1000*22);
        if(!Number.isFinite(metres)||metres>allowed) continue;
        candidates.push({match,metres,skew});
      }
    }
    candidates.sort((a,b)=>a.metres-b.metres||a.skew-b.skew);
    const best=candidates[0],second=candidates[1];
    if(!best) continue;
    // A reused fleet/placeholder id can refer to two simultaneous buses. Do not
    // turn that into false certainty unless the nearest matched position is
    // clearly separated from the runner-up.
    if(second&&String(second.match.tripId)!==String(best.match.tripId)&&second.metres-best.metres<120) continue;
    v.matchedTrip=String(best.match.tripId);
    v.matchedRouteId=String(best.match.routeId||'');
    v.matchedTripAt=now;
    v.matchSource='gtfs-rt';
    v.matchedSticky=false;
    applied++;
  }
  return applied;
}
""",
"""  return [...unique.values()];
}
function matchedIdentityWithinBudget(promise,waitMs=MATCHED_IDENTITY_WAIT_MS){
  const delay=Math.max(0,Number(waitMs)||0);
  return Promise.race([
    Promise.resolve(promise).catch(()=>[]),
    new Promise(resolve=>setTimeout(()=>resolve([]),delay))
  ]);
}
function applyMatchedIdentities(vehicles,matches,now=Date.now()){
  const index=new Map();
  for(const match of Array.isArray(matches)?matches:[]){
    const token=matchedVehicleToken(match&&match.vehicleId);
    if(!token||!match.tripId) continue;
    const list=index.get(token)||[];list.push(match);index.set(token,list);
  }
  const proposals=[];
  for(const v of Array.isArray(vehicles)?vehicles:[]){
    const tokens=[matchedVehicleToken(v&&v.vehicleRef),matchedVehicleToken(v&&v.vehicleUniqueId)].filter(Boolean);
    const candidates=[];
    const seen=new Set();
    for(const token of tokens){
      for(const match of index.get(token)||[]){
        const key=matchedRecordKey(match);
        if(seen.has(key)) continue;seen.add(key);
        const timestamp=Number(match.timestamp),referenceTs=Number.isFinite(Number(v.sourceTs))?Number(v.sourceTs):Number(v.ts);
        const skew=Math.abs(referenceTs-timestamp);
        if(!Number.isFinite(timestamp)||!Number.isFinite(referenceTs)||skew>MATCHED_IDENTITY_MAX_SKEW_MS) continue;
        const metres=dist(Number(v.lat),Number(v.lon),Number(match.lat),Number(match.lon));
        const allowed=Math.min(MATCHED_IDENTITY_MAX_METRES,250+skew/1000*22);
        if(!Number.isFinite(metres)||metres>allowed) continue;
        candidates.push({match,key,metres,skew,lag:Math.max(0,referenceTs-timestamp)});
      }
    }
    candidates.sort((a,b)=>a.metres-b.metres||a.skew-b.skew);
    const best=candidates[0],second=candidates[1];
    if(!best) continue;
    // A reused fleet/placeholder id can refer to two simultaneous buses. Do not
    // turn that into false certainty unless the nearest matched position is
    // clearly separated from the runner-up.
    if(second&&String(second.match.tripId)!==String(best.match.tripId)&&second.metres-best.metres<120) continue;
    proposals.push({v,best});
  }
  // Allocate each GTFS-RT entity at most once. Without a global claim, two SIRI
  // records sharing a placeholder VehicleRef could both inherit the same trip.
  proposals.sort((a,b)=>a.best.metres-b.best.metres||a.best.skew-b.best.skew);
  const claimed=new Set();
  let applied=0;
  for(const proposal of proposals){
    const {v,best}=proposal;
    if(claimed.has(best.key)) continue;
    claimed.add(best.key);
    v.matchedTrip=String(best.match.tripId);
    v.matchedRouteId=String(best.match.routeId||'');
    v.matchedTripAt=now;
    v.matchedObservationAt=Number(best.match.timestamp);
    v.matchedLagMs=best.lag;
    v.matchSource='gtfs-rt';
    v.matchedSticky=false;
    applied++;
  }
  return applied;
}
""")

replace('bus.html',
"""  const matched=await matchedPromise;
  applyMatchedIdentities(out,matched,Date.now());
""",
"""  const matched=await matchedIdentityWithinBudget(matchedPromise);
  applyMatchedIdentities(out,matched,Date.now());
""")

replace('bus.html',
"""function retainMatchedIdentity(prev,v,now=Date.now()){
  if(!prev||!v||v.matchedTrip) return false;
  const sameService=String(prev.line||'')===String(v.line||'')
    &&String(prev.owner||prev.operator||'')===String(v.owner||v.operator||'');
  const matchedAt=Number(prev.matchedTripAt);
  if(!sameService||!prev.matchedTrip||!Number.isFinite(matchedAt)||now-matchedAt>MATCHED_IDENTITY_GRACE_MS) return false;
  v.matchedTrip=String(prev.matchedTrip);
  v.matchedRouteId=String(prev.matchedRouteId||'');
  v.matchedTripAt=matchedAt;
  v.matchSource=String(prev.matchSource||'gtfs-rt');
  v.matchedSticky=true;
  return true;
}
""",
"""function retainMatchedIdentity(prev,v,now=Date.now()){
  if(!prev||!v||v.matchedTrip) return false;
  const sameService=String(prev.line||'')===String(v.line||'')
    &&String(prev.owner||prev.operator||'')===String(v.owner||v.operator||'');
  const matchedAt=Number(prev.matchedTripAt);
  if(!sameService||!prev.matchedTrip||!Number.isFinite(matchedAt)||now-matchedAt>MATCHED_IDENTITY_GRACE_MS) return false;
  v.matchedTrip=String(prev.matchedTrip);
  v.matchedRouteId=String(prev.matchedRouteId||'');
  v.matchedTripAt=matchedAt;
  v.matchedObservationAt=Number(prev.matchedObservationAt);
  const referenceTs=Number.isFinite(Number(v.sourceTs))?Number(v.sourceTs):Number(v.ts);
  v.matchedLagMs=Number.isFinite(referenceTs)&&Number.isFinite(v.matchedObservationAt)
    ?Math.max(0,referenceTs-v.matchedObservationAt)
    :Number(prev.matchedLagMs)||0;
  v.matchSource=String(prev.matchSource||'gtfs-rt');
  v.matchedSticky=true;
  return true;
}
""")

replace('bus.html',
"""    if(prev&&prev.matchedTrip&&!v.matchedTrip){delete rec.matchedTrip;delete rec.matchedRouteId;delete rec.matchedTripAt;delete rec.matchSource;delete rec.matchedSticky;}
""",
"""    if(prev&&prev.matchedTrip&&!v.matchedTrip){delete rec.matchedTrip;delete rec.matchedRouteId;delete rec.matchedTripAt;delete rec.matchedObservationAt;delete rec.matchedLagMs;delete rec.matchSource;delete rec.matchedSticky;}
""")

replace('bus.html',
"""  const l=String(line);
  const allRows=timetableRowsForLine(l,new Date());
  const realtimeTrip=String(identity&&identity.matchedTrip||'');
  const exactRealtimeRows=realtimeTrip?timetableRows(new Date()).filter(row=>String(row.trip)===realtimeTrip):[];
  const identityInfo=timetableIdentityRows(exactRealtimeRows.length?exactRealtimeRows:allRows,identity);
  const ttRows=identityInfo.rows;
  const tripMatch=journey?uniqueCompatibleTrips(ttRows,journey):{items:[],ref:'',strength:0,ambiguous:false};
  const realtimeMatch=!!(realtimeTrip&&tripMatch.items.length&&!tripMatch.ambiguous&&String(tripMatch.ref)===realtimeTrip);
  let journeyDestinationConflict=false, conflictingTrip='';
  if(tripMatch.items.length){
    const destination=journeyDestinationAgreement(tripMatch.items,dest);
    if(!destination.conflict||realtimeMatch){
      const path=!!timetablePattern(tripMatch.ref), literal=tripMatch.strength===4;
      return {
        score:path?6:5,
        label:realtimeMatch?(path?'BODS matched journey and stop sequence':'BODS matched journey'):(path?(literal?'exact journey and stop sequence matched':'unique journey alias and stop sequence matched'):(literal?'exact journey matched to timetable':'unique journey alias matched to timetable')),
        journeyMatch:true,pathMatch:path,matchStrength:tripMatch.strength,matchedTrip:tripMatch.ref,matchedRealtime:realtimeMatch,
        journeyDestinationConflict:!!(realtimeMatch&&destination.conflict),
        routeIdentityMatch:identityInfo.strong
      };
    }
    journeyDestinationConflict=true; conflictingTrip=String(tripMatch.ref||'');
  }
""",
"""  const l=String(line);
  const allRows=timetableRowsForLine(l,new Date());
  const realtimeTrip=String(identity&&identity.matchedTrip||'');
  const matchedRoute=routeIdentityToken(identity&&identity.matchedRouteId);
  const exactRealtimeRows=realtimeTrip?timetableRows(new Date()).filter(row=>{
    if(String(row.trip)!==realtimeTrip||String(row.line)!==l) return false;
    const rowRoute=routeIdentityToken(row.routeId);
    return !matchedRoute||!rowRoute||rowRoute===matchedRoute;
  }):[];
  let journeyDestinationConflict=false, conflictingTrip='';
  if(exactRealtimeRows.length){
    const realtimeInfo=timetableIdentityRows(exactRealtimeRows,identity);
    const realtimeMatchRows=uniqueCompatibleTrips(realtimeInfo.rows,realtimeTrip);
    const realtimeMatch=!!(realtimeMatchRows.items.length&&!realtimeMatchRows.ambiguous&&String(realtimeMatchRows.ref)===realtimeTrip);
    if(realtimeMatch){
      const destination=journeyDestinationAgreement(realtimeMatchRows.items,dest);
      const lag=Number(identity&&identity.matchedLagMs);
      const newerSiriIdentity=!!(identity&&(String(identity.journey||'').trim()||Number.isFinite(Number(identity.aimedOriginAt))));
      const handoverRisk=!!(destination.conflict&&Number.isFinite(lag)&&lag>MATCHED_HANDOVER_MAX_LAG_MS&&newerSiriIdentity);
      if(!handoverRisk){
        const path=!!timetablePattern(realtimeMatchRows.ref);
        return {
          score:path?6:5,
          label:path?'BODS matched journey and stop sequence':'BODS matched journey',
          journeyMatch:true,pathMatch:path,matchStrength:realtimeMatchRows.strength,matchedTrip:realtimeMatchRows.ref,matchedRealtime:true,
          journeyDestinationConflict:!!destination.conflict,
          routeIdentityMatch:realtimeInfo.strong
        };
      }
      journeyDestinationConflict=true; conflictingTrip=String(realtimeMatchRows.ref||'');
    }
  }
  const identityInfo=timetableIdentityRows(allRows,identity);
  const ttRows=identityInfo.rows;
  const fallbackJourney=realtimeTrip?String(identity&&identity.journey||''):journey;
  const tripMatch=fallbackJourney?uniqueCompatibleTrips(ttRows,fallbackJourney):{items:[],ref:'',strength:0,ambiguous:false};
  if(tripMatch.items.length){
    const destination=journeyDestinationAgreement(tripMatch.items,dest);
    if(!destination.conflict){
      const path=!!timetablePattern(tripMatch.ref), literal=tripMatch.strength===4;
      return {
        score:path?6:5,
        label:path?(literal?'exact journey and stop sequence matched':'unique journey alias and stop sequence matched'):(literal?'exact journey matched to timetable':'unique journey alias matched to timetable'),
        journeyMatch:true,pathMatch:path,matchStrength:tripMatch.strength,matchedTrip:tripMatch.ref,
        routeIdentityMatch:identityInfo.strong
      };
    }
    journeyDestinationConflict=true; conflictingTrip=String(tripMatch.ref||conflictingTrip||'');
  }
""")

replace('bus.html',
"""window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads,fetchTimed,fetchLive,fetchMatchedBatch,applyMatchedIdentities,retainMatchedIdentity,ingest,relevant,liveState:S,""",
"""window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,physicalVehicleKey,parseLivePayloads,fetchTimed,fetchLive,fetchMatchedBatch,matchedIdentityWithinBudget,applyMatchedIdentities,retainMatchedIdentity,ingest,relevant,liveState:S,""")

replace('kerbside-backend/src/worker.js',
"""    out.push({
      vehicleId,
      tripId,
""",
"""    out.push({
      entityId: String(entity && entity.id || ''),
      vehicleId,
      tripId,
""")

replace('kerbside-backend/test/worker.test.js',
"""    assert.deepEqual({
      vehicleId: body.vehicles[0].vehicleId,
      tripId: body.vehicles[0].tripId,
      routeId: body.vehicles[0].routeId
    }, { vehicleId: 'BUS-740', tripId: 'GTFS-TRIP-61', routeId: 'GTFS-ROUTE-61' });
""",
"""    assert.deepEqual({
      entityId: body.vehicles[0].entityId,
      vehicleId: body.vehicles[0].vehicleId,
      tripId: body.vehicles[0].tripId,
      routeId: body.vehicles[0].routeId
    }, { entityId: 'entity-1', vehicleId: 'BUS-740', tripId: 'GTFS-TRIP-61', routeId: 'GTFS-ROUTE-61' });
""")

replace('kerbside-backend/tests/browser-regression.mjs',
"""assert.match(busSource, /const MATCHED_IDENTITY_GRACE_MS = 3\\*60\\*1000/);
assert.match(busSource, /function applyMatchedIdentities\\(vehicles,matches,now=Date\\.now\\(\\)\\)/);
assert.match(busSource, /function retainMatchedIdentity\\(prev,v,now=Date\\.now\\(\\)\\)/);
""",
"""assert.match(busSource, /const MATCHED_IDENTITY_GRACE_MS = 3\\*60\\*1000/);
assert.match(busSource, /const MATCHED_IDENTITY_WAIT_MS = 1200/);
assert.match(busSource, /const MATCHED_HANDOVER_MAX_LAG_MS = 45\\*1000/);
assert.match(busSource, /function matchedIdentityWithinBudget\\(promise,waitMs=MATCHED_IDENTITY_WAIT_MS\\)/);
assert.match(busSource, /function applyMatchedIdentities\\(vehicles,matches,now=Date\\.now\\(\\)\\)/);
assert.match(busSource, /function retainMatchedIdentity\\(prev,v,now=Date\\.now\\(\\)\\)/);
""")

replace('kerbside-backend/tests/journey-identity-regression.mjs',
"""  const result=await page.evaluate(()=>{
""",
"""  const result=await page.evaluate(async()=>{
""")

replace('kerbside-backend/tests/journey-identity-regression.mjs',
"""    const rawRow=(delta,line,head,trip,originDelta)=>[
      minuteAt(delta),line,head,'','',trip,'','','',10,minuteAt(originDelta)
    ];
""",
"""    const rawRow=(delta,line,head,trip,originDelta,routeId='')=>[
      minuteAt(delta),line,head,'','',trip,'',routeId,'',10,minuteAt(originDelta)
    ];
""")

replace('kerbside-backend/tests/journey-identity-regression.mjs',
"""      state.ttStop={id:'BRIGHTSTONE',d:[
        rawRow(20,'61','Digbeth Moor Street Queensway','INBOUND',-25),
        rawRow(40,'61','Frankley Arden Road Terminus','OUTBOUND',10)
      ]};
""",
"""      state.ttStop={id:'BRIGHTSTONE',d:[
        rawRow(20,'61','Digbeth Moor Street Queensway','INBOUND',-25,'R61'),
        rawRow(40,'61','Frankley Arden Road Terminus','OUTBOUND',10,'R61'),
        rawRow(30,'62','Other Terminus','FOREIGN',-5,'R62')
      ]};
""")

replace('kerbside-backend/tests/journey-identity-regression.mjs',
"""      const matchedInput={...baseVehicle,vehicleRef:'BUS-740',vehicleUniqueId:'',journey:'OPAQUE-SIRI-JOURNEY',sourceTs:now-1000,ts:now-1000};
      const matchedCount=api.applyMatchedIdentities([matchedInput],[{vehicleId:'BUS-740',tripId:'OUTBOUND',routeId:'R61',lat:baseVehicle.lat,lon:baseVehicle.lon,timestamp:now-1000}],now);
      const matchedRealtime=api.routeEvidence('61',matchedInput.dest,api.vehicleJourneyRef(matchedInput),matchedInput);
      const stickyIncoming={...baseVehicle,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};
      const stickyPrev={...baseVehicle,matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedTripAt:now-30000,matchSource:'gtfs-rt'};
      const stickyRetained=api.retainMatchedIdentity(stickyPrev,stickyIncoming,now);
      const expiredIncoming={...baseVehicle};
      const stickyExpired=api.retainMatchedIdentity({...stickyPrev,matchedTripAt:now-4*60*1000},expiredIncoming,now);
""",
"""      const matchedInput={...baseVehicle,vehicleRef:'BUS-740',vehicleUniqueId:'',journey:'OPAQUE-SIRI-JOURNEY',sourceTs:now-1000,ts:now-1000};
      const matchedCount=api.applyMatchedIdentities([matchedInput],[{entityId:'entity-740',vehicleId:'BUS-740',tripId:'OUTBOUND',routeId:'R61',lat:baseVehicle.lat,lon:baseVehicle.lon,timestamp:now-1000}],now);
      const matchedRealtime=api.routeEvidence('61',matchedInput.dest,api.vehicleJourneyRef(matchedInput),matchedInput);

      const duplicateNear={...baseVehicle,id:'duplicate-near',vehicleRef:'BUS-DUPE',vehicleUniqueId:'',journey:'',dest:'Frankley Arden Road Terminus',lat:52.4600,lon:-1.9500,sourceTs:now,ts:now};
      const duplicateFar={...duplicateNear,id:'duplicate-far',lat:52.4610};
      const duplicateCount=api.applyMatchedIdentities([duplicateFar,duplicateNear],[{entityId:'entity-dupe',vehicleId:'BUS-DUPE',tripId:'OUTBOUND',routeId:'R61',lat:52.4600,lon:-1.9500,timestamp:now}],now);

      const routeMismatch=api.routeEvidence('61','Other Terminus','FOREIGN',{...baseVehicle,journey:'OPAQUE',matchedTrip:'FOREIGN',matchedRouteId:'R62',matchedLagMs:0});
      const routeIdMismatch=api.routeEvidence('61','Frankley Arden Road Terminus','OUTBOUND',{...baseVehicle,journey:'OPAQUE',matchedTrip:'OUTBOUND',matchedRouteId:'WRONG-ROUTE',matchedLagMs:0});
      const handover=api.routeEvidence('61','Digbeth Moor Street Queensway','OUTBOUND',{...baseVehicle,journey:'INBOUND',matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedLagMs:60000});

      const stickyIncoming={...baseVehicle,sourceTs:now,ts:now,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};
      const stickyPrev={...baseVehicle,matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedTripAt:now-30000,matchedObservationAt:now-30000,matchedLagMs:0,matchSource:'gtfs-rt'};
      const stickyRetained=api.retainMatchedIdentity(stickyPrev,stickyIncoming,now);
      const expiredIncoming={...baseVehicle};
      const stickyExpired=api.retainMatchedIdentity({...stickyPrev,matchedTripAt:now-4*60*1000},expiredIncoming,now);
      const uniquePhysicalKey=api.physicalVehicleKey({owner:'OPTEST',vehicleRef:'',vehicleUniqueId:'UNIQUE-9'});
      const budgetStarted=performance.now();
      const budgetResult=await api.matchedIdentityWithinBudget(new Promise(()=>{}),20);
      const budgetElapsed=performance.now()-budgetStarted;
""")

replace('kerbside-backend/tests/journey-identity-regression.mjs',
"""        matchedIdentity:{count:matchedCount,trip:matchedInput.matchedTrip,source:matchedInput.matchSource,realtime:!!matchedRealtime.matchedRealtime,journeyMatch:!!matchedRealtime.journeyMatch,matchedTrip:String(matchedRealtime.matchedTrip||''),conflict:!!matchedRealtime.journeyDestinationConflict},
        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},
""",
"""        matchedIdentity:{count:matchedCount,trip:matchedInput.matchedTrip,source:matchedInput.matchSource,realtime:!!matchedRealtime.matchedRealtime,journeyMatch:!!matchedRealtime.journeyMatch,matchedTrip:String(matchedRealtime.matchedTrip||''),conflict:!!matchedRealtime.journeyDestinationConflict},
        oneToOne:{count:duplicateCount,near:duplicateNear.matchedTrip||'',far:duplicateFar.matchedTrip||''},
        routeGuard:{lineRealtime:!!routeMismatch.matchedRealtime,lineTrip:String(routeMismatch.matchedTrip||''),routeRealtime:!!routeIdMismatch.matchedRealtime,routeTrip:String(routeIdMismatch.matchedTrip||'')},
        handover:{realtime:!!handover.matchedRealtime,trip:String(handover.matchedTrip||''),conflict:!!handover.journeyDestinationConflict},
        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,lag:Number(stickyIncoming.matchedLagMs),expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},
        uniquePhysicalKey,
        budget:{empty:Array.isArray(budgetResult)&&budgetResult.length===0,elapsed:budgetElapsed},
""")

replace('kerbside-backend/tests/journey-identity-regression.mjs',
"""  assert.deepEqual(result.matchedIdentity,{count:1,trip:'OUTBOUND',source:'gtfs-rt',realtime:true,journeyMatch:true,matchedTrip:'OUTBOUND',conflict:true},'BODS matched GTFS trip must outrank an opaque/stale SIRI journey and destination handover');
  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap but expire rather than stick indefinitely');
""",
"""  assert.deepEqual(result.matchedIdentity,{count:1,trip:'OUTBOUND',source:'gtfs-rt',realtime:true,journeyMatch:true,matchedTrip:'OUTBOUND',conflict:true},'a fresh BODS matched trip may outrank stale destination text when route and trip identity agree');
  assert.deepEqual(result.oneToOne,{count:1,near:'OUTBOUND',far:''},'one GTFS-RT entity must be allocated to at most one SIRI vehicle');
  assert.deepEqual(result.routeGuard,{lineRealtime:false,lineTrip:'',routeRealtime:false,routeTrip:''},'a matched trip from the wrong public line or GTFS route must fall back instead of becoming authoritative');
  assert.deepEqual(result.handover,{realtime:false,trip:'INBOUND',conflict:false},'an older conflicting matched identity must yield to newer SIRI journey evidence during a terminus handover');
  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,lag:30000,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap, age its observation lag, and expire rather than stick indefinitely');
  assert.equal(result.uniquePhysicalKey,'OPTEST|vehicle-unique|UNIQUE-9','VehicleUniqueId must identify a physical bus when VehicleRef is absent');
  assert.equal(result.budget.empty,true,'a slow matched feed should degrade to no auxiliary identities');
  assert.ok(result.budget.elapsed<500,'the matched-feed wait helper should respect its bounded deadline');
""")

subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)
print('Prepared Kerbside 0.7.12 reliability patch.')
