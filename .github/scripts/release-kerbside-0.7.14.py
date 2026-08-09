#!/usr/bin/env python3
from pathlib import Path
import subprocess

VERSION = '0.7.14'


def replace_exact(path, label, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: {label}: expected exactly one target, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_exact(
    'bus.html',
    'require exact national stop identity before route geometry can decide the kerb',
    """  return pick(same);
}
function routePatternMovementFit(pattern,v,stop){
""",
    """  return pick(same);
}
/* National departure rows and national pattern stops come from the same GTFS
   build. Once the selected stop has an exact national code, a nearby stop is no
   longer an acceptable substitute for route geometry: on opposite kerbs it can
   reverse whether a vehicle is before or after the passenger. Keep the looser
   proximity fallback only for non-authoritative/legacy stop data. */
function authoritativePatternStopRequired(){
  return !!(S.timetableSource==='national'&&!S.timetableFallback&&S.ttStop&&S.ttStop.match==='code');
}
function exactSelectedPatternStopIndex(stops,selectedStop,fromAlong,stopSequence){
  const chosen=selectedStop||S.stop;
  if(!Array.isArray(stops)||!stops.length||!chosen) return -1;
  const ids=[chosen===S.stop&&S.ttStop&&S.ttStop.id,chosen.timetableId,chosen.atco,chosen.code,chosen.id]
    .map(value=>String(value||'')).filter(Boolean);
  if(!ids.length||!stops.some(stop=>ids.includes(String(stop&&stop.id||'')))) return -1;
  return selectedPatternStopIndex(stops,chosen,fromAlong,stopSequence);
}
function selectedPatternStopIndexForEvidence(stops,selectedStop,fromAlong,stopSequence){
  return authoritativePatternStopRequired()
    ? exactSelectedPatternStopIndex(stops,selectedStop,fromAlong,stopSequence)
    : selectedPatternStopIndex(stops,selectedStop,fromAlong,stopSequence);
}
function routePatternMovementFit(pattern,v,stop){
"""
)

replace_exact(
    'bus.html',
    'journey geometry must not use a nearby opposite stand for an authoritative stop',
    """  const vehicle=projectVehicleToPattern(pattern,v);
  const ordered=orderedPatternStops(pattern), selectedIndex=selectedPatternStopIndex(ordered,stop,vehicle&&vehicle.along);
  const selected=selectedIndex>=0?ordered[selectedIndex]:null;
""",
    """  const vehicle=projectVehicleToPattern(pattern,v);
  const ordered=orderedPatternStops(pattern), selectedIndex=selectedPatternStopIndexForEvidence(ordered,stop,vehicle&&vehicle.along);
  if(authoritativePatternStopRequired()&&selectedIndex<0) return null;
  const selected=selectedIndex>=0?ordered[selectedIndex]:null;
"""
)

replace_exact(
    'bus.html',
    'movement inference must prove the exact official stop before using geometry',
    """  const stops=orderedPatternStops(pattern),selectedIndex=selectedPatternStopIndex(stops,stop,last&&last.along);
  const selected=selectedIndex>=0?stops[selectedIndex]:null;
""",
    """  const stops=orderedPatternStops(pattern),selectedIndex=selectedPatternStopIndexForEvidence(stops,stop,last&&last.along);
  if(authoritativePatternStopRequired()&&selectedIndex<0) return null;
  const selected=selectedIndex>=0?stops[selectedIndex]:null;
"""
)

replace_exact(
    'bus.html',
    'scheduled direction must use the exact official stop call',
    """  const stops=orderedPatternStops(pattern), index=selectedPatternStopIndex(stops,undefined,undefined,row&&row.stopSequence);
  if(index<0) return 'unknown';
""",
    """  const stops=orderedPatternStops(pattern), index=selectedPatternStopIndexForEvidence(stops,undefined,undefined,row&&row.stopSequence);
  if(index<0) return 'unknown';
"""
)

replace_exact(
    'bus.html',
    'route scan plans must not project an authoritative stop onto a nearby kerb',
    """    const pattern=timetablePatternRecord(row.trip); if(!pattern) continue;
    const ordered=orderedPatternStops(pattern), selectedIndex=selectedPatternStopIndex(ordered,undefined,undefined,row.stopSequence);
    const selected=selectedIndex>=0?ordered[selectedIndex]:null;
    const projected=selected?null:projectToPattern(pattern.points,S.stop.lat,S.stop.lon);
""",
    """    const pattern=timetablePatternRecord(row.trip); if(!pattern) continue;
    const ordered=orderedPatternStops(pattern), selectedIndex=selectedPatternStopIndexForEvidence(ordered,undefined,undefined,row.stopSequence);
    if(authoritativePatternStopRequired()&&selectedIndex<0) continue;
    const selected=selectedIndex>=0?ordered[selectedIndex]:null;
    const projected=selected?null:projectToPattern(pattern.points,S.stop.lat,S.stop.lon);
"""
)

replace_exact(
    'bus.html',
    'allow route scan GPS geometry to handle destination naming differences',
    """    const similarity=v.dest&&match.head?destinationSimilarity(v.dest,match.head):1;
    if(v.dest&&match.head&&similarity<.34) continue;
    const fit=routePatternMovementFit(match.pattern,v,S.stop);
""",
    """    const similarity=v.dest&&match.head?destinationSimilarity(v.dest,match.head):1;
    const fit=routePatternMovementFit(match.pattern,v,S.stop);
"""
)

replace_exact(
    'bus.html',
    'route scan exact identity may cross a destination alias only for the exact selected stop',
    """function matchRouteScanVehicle(plan,v){
  if(!plan||!v) return null;
  const compatible=(plan.matches||[]).filter(match=>String(v.line)===String(match.line)
    &&routeIdentityAgreement(match,v)>=0
    &&(!v.dest||!match.head||destinationSimilarity(v.dest,match.head)>=.34));
""",
    """function routeScanBranchCompatible(match,v){
  if(!match||!v) return false;
  if(!v.dest||!match.head||destinationSimilarity(v.dest,match.head)>=.34) return true;
  const stops=orderedPatternStops(match.pattern);
  return exactSelectedPatternStopIndex(stops,S.stop,undefined,match.stopSequence)>=0;
}
function matchRouteScanVehicle(plan,v){
  if(!plan||!v) return null;
  const compatible=(plan.matches||[]).filter(match=>String(v.line)===String(match.line)
    &&routeIdentityAgreement(match,v)>=0
    &&routeScanBranchCompatible(match,v));
"""
)

replace_exact(
    'kerbside-backend/test/destination-alias.test.js',
    'extend source guard to cover route scan and exact kerb protection',
    """  assert.match(
    source,
    /ordered route pattern plus measured forward GPS movement is stronger/,
    'the route-pattern override must remain documented next to the safety decision'
  );
});
""",
    """  assert.match(
    source,
    /ordered route pattern plus measured forward GPS movement is stronger/,
    'the route-pattern override must remain documented next to the safety decision'
  );
  assert.match(source,/function exactSelectedPatternStopIndex\(/,'official-stop route geometry must have an exact-id guard');
  assert.match(source,/function authoritativePatternStopRequired\(/,'national stop matching must declare when proximity fallback is forbidden');
  assert.match(source,/function routeScanBranchCompatible\(/,'the distant route scan must use the same alias safety rule');
  const scanStart=source.indexOf('function inferredRouteScanMatch(');
  const scanEnd=source.indexOf('function routeScanBranchCompatible(',scanStart);
  const scanSource=source.slice(scanStart,scanEnd);
  assert.doesNotMatch(
    scanSource,
    /if\(v\.dest&&match\.head&&similarity<\.34\) continue;/,
    'the route scanner must not reintroduce the old destination-text hard rejection'
  );
});
"""
)

replace_exact(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    'save flicker-test state',
    """      timetableRegion:state.timetableRegion,
      timetableRun:state.timetableRun,
      dir:state.dir,
      destFilter:state.destFilter
""",
    """      timetableRegion:state.timetableRegion,
      timetableRun:state.timetableRun,
      dir:state.dir,
      destFilter:state.destFilter,
      vehicles:state.vehicles,
      onlyServing:state.onlyServing,
      hideAway:state.hideAway
"""
)

replace_exact(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    'mark Brightstone alias test as authoritative national stop',
    """      state.ttStop={id:'BRIGHTSTONE',d:[[
        minuteAt(8),'61','Moor St Queensway','','in','BRIGHTSTONE-INBOUND',aliasPatternId,'R61','',3,minuteAt(-30)
      ]]};
""",
    """      state.ttStop={id:'BRIGHTSTONE',match:'code',d:[[
        minuteAt(8),'61','Moor St Queensway','','in','BRIGHTSTONE-INBOUND',aliasPatternId,'R61','',3,minuteAt(-30)
      ]]};
"""
)

replace_exact(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    'exercise alias route scan and pattern-load flicker',
    """      const aliasBaseEvidence=api.routeEvidence('61',aliasVehicle.dest,'',aliasVehicle);
      const aliasInference=api.inferVehicleJourneyPattern(aliasVehicle,stop,now);
      const aliasEvidence=api.inferredRouteEvidence(aliasBaseEvidence,aliasInference);

      const stickyIncoming={...baseVehicle,sourceTs:now,ts:now,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};
""",
    """      const aliasBaseEvidence=api.routeEvidence('61',aliasVehicle.dest,'',aliasVehicle);
      const aliasInference=api.inferVehicleJourneyPattern(aliasVehicle,stop,now);
      const aliasEvidence=api.inferredRouteEvidence(aliasBaseEvidence,aliasInference);
      const aliasPlan={matches:[{
        trip:'BRIGHTSTONE-INBOUND',line:'61',head:'Moor St Queensway',pattern:aliasInference.pattern,
        targetAlong:aliasInference.fit.target.along,at:now+8*60000,originAt:null,routeId:'R61',operator:'',stopSequence:3
      }]};
      const aliasScanInference=api.inferredRouteScanMatch(aliasPlan,{...aliasVehicle},now);
      const aliasScanVehicle=api.matchRouteScanVehicle(aliasPlan,{...aliasVehicle,id:'61-route-scan-strong',journey:'BRIGHTSTONE-INBOUND',hist:[]});

      // Reproduce the visible flicker: an exact realtime trip is initially shown
      // before its route-pattern shard arrives. The shard then contains only a
      // nearby opposite-kerb stop instead of the selected national stop id. The
      // new geometry must abstain rather than suddenly declaring the bus passed.
      const flickerPatternId='brightstone-wrong-kerb';
      state.ttStop={id:'BRIGHTSTONE',match:'code',d:[[
        minuteAt(6),'61','Moor St Queensway','','in','FLICKER-TRIP',flickerPatternId,'R61','',3,minuteAt(-20)
      ]]};
      state.timetable={services:{},tripPatterns:{'FLICKER-TRIP':flickerPatternId},patterns:{}};
      state.timetableSource='national';
      state.timetableFallback=false;
      state.timetableRun=Number(state.timetableRun||0)+1;
      state.dir='all';state.destFilter=null;state.onlyServing=true;state.hideAway=false;
      const flickerVehicle={
        id:'61-pattern-load',line:'61',lineRef:'61',owner:'',operator:'',dest:'Digbeth',journey:'OPAQUE',
        matchedTrip:'FLICKER-TRIP',matchedRouteId:'R61',matchedLagMs:0,matchedTripAt:now,matchedObservationAt:now,
        lat:52.4480,lon:-1.9600,bearing:180,ts:now,sourceTs:now,hist:[
          {lat:52.4490,lon:-1.9600,ts:now-30000},{lat:52.4480,lon:-1.9600,ts:now}
        ],speed:6,cadence:20
      };
      state.vehicles=new Map([[flickerVehicle.id,flickerVehicle]]);
      const flickerBefore=api.relevant().some(row=>row.v&&row.v.id===flickerVehicle.id);
      state.timetable.patterns[flickerPatternId]={
        p:[[52.4600,-1.9600],[52.4520,-1.9600],[52.4480,-1.9600],[52.4440,-1.9600]],
        s:[
          ['UPSTREAM','Upstream',52.4600,-1.9600,1],
          ['MID','Middle',52.4520,-1.9600,2],
          ['BRIGHTSTONE-OTHER-SIDE','Brightstone Road',52.45025,-1.9600,3]
        ],g:1
      };
      const flickerAfter=api.relevant().some(row=>row.v&&row.v.id===flickerVehicle.id);
      const flickerPassed=Number(state.liveDiag&&state.liveDiag.rejected&&state.liveDiag.rejected.passed||0);

      const stickyIncoming={...baseVehicle,sourceTs:now,ts:now,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};
"""
)

replace_exact(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    'return route scan and flicker results',
    """        destinationAliasPattern:{
          inferred:!!aliasInference,
          patternOnly:!!(aliasInference&&aliasInference.patternOnly),
          patternId:String(aliasInference&&aliasInference.patternId||''),
          score:Number(aliasEvidence&&aliasEvidence.score||0),
          journeyMatch:!!(aliasEvidence&&aliasEvidence.journeyMatch),
          matchedTrip:String(aliasEvidence&&aliasEvidence.matchedTrip||'')
        },
        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,lag:Number(stickyIncoming.matchedLagMs),expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},
""",
    """        destinationAliasPattern:{
          inferred:!!aliasInference,
          patternOnly:!!(aliasInference&&aliasInference.patternOnly),
          patternId:String(aliasInference&&aliasInference.patternId||''),
          score:Number(aliasEvidence&&aliasEvidence.score||0),
          journeyMatch:!!(aliasEvidence&&aliasEvidence.journeyMatch),
          matchedTrip:String(aliasEvidence&&aliasEvidence.matchedTrip||'')
        },
        routeScanAlias:{
          inferred:!!aliasScanInference,patternOnly:!!(aliasScanInference&&aliasScanInference.patternOnly),
          corridorTrip:String(aliasScanVehicle&&aliasScanVehicle.corridorTrip||'')
        },
        patternLoadFlicker:{before:flickerBefore,after:flickerAfter,passed:flickerPassed},
        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,lag:Number(stickyIncoming.matchedLagMs),expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},
"""
)

replace_exact(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    'assert route scan aliases and no pattern-load disappearance',
    """  assert.deepEqual(result.destinationAliasPattern,{
    inferred:true,patternOnly:true,patternId:'brightstone-61-inbound',score:4,journeyMatch:false,matchedTrip:''
  },'GPS movement on the ordered 61 pattern must recover a Digbeth versus Moor St Queensway naming mismatch without inventing a scheduled trip identity');
  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,lag:30000,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap, age its observation lag, and expire rather than stick indefinitely');
""",
    """  assert.deepEqual(result.destinationAliasPattern,{
    inferred:true,patternOnly:true,patternId:'brightstone-61-inbound',score:4,journeyMatch:false,matchedTrip:''
  },'GPS movement on the ordered 61 pattern must recover a Digbeth versus Moor St Queensway naming mismatch without inventing a scheduled trip identity');
  assert.deepEqual(result.routeScanAlias,{inferred:true,patternOnly:true,corridorTrip:'BRIGHTSTONE-INBOUND'},'the upstream route scan must apply the same destination-alias rule when the exact selected stop is present in the ordered pattern');
  assert.deepEqual(result.patternLoadFlicker,{before:true,after:true,passed:0},'loading a route pattern with only a nearby opposite-kerb stop must not make a previously visible exact realtime bus disappear as already passed');
  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,lag:30000,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap, age its observation lag, and expire rather than stick indefinitely');
"""
)

Path('VERSION').write_text(VERSION + '\n', encoding='utf-8')
subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)
print(f'Prepared Kerbside {VERSION} pattern-load flicker hardening release.')
