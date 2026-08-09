#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

OLD_VERSION = '0.7.22'
NEW_VERSION = '0.7.23'


def replace_once(path, old, new, label):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if new in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source block, found {count}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


version_file = Path('VERSION')
version = version_file.read_text(encoding='utf-8').strip()
if version not in {OLD_VERSION, NEW_VERSION}:
    raise SystemExit(f'Expected Kerbside {OLD_VERSION} before release, found {version!r}')
if version == OLD_VERSION:
    version_file.write_text(NEW_VERSION + '\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Matching-engine consolidation
# ---------------------------------------------------------------------------
# The national timetable's exact stop code is the authoritative answer to
# "which side of the road does this journey serve?". Name similarity, compass
# direction, straight-line movement and cached realtime trip identity may rank
# candidates, but none may override a loaded ordered pattern that demonstrably
# omits the selected stop code.
exact_stop_helper = r'''function exactTripSelectedStopEvidence(trip,patternId,stop=S.stop,stopSequence){
  const authoritative=authoritativePatternStopRequired();
  if(!authoritative) return {authoritative:false,known:false,serves:true,index:-1,pattern:null};
  const ref=String(trip||''), pattern=timetablePatternRecord(ref,patternId);
  if(!pattern) return {authoritative:true,known:false,serves:false,index:-1,pattern:null};
  const stops=orderedPatternStops(pattern);
  const index=exactSelectedPatternStopIndex(stops,stop,undefined,stopSequence);
  return {authoritative:true,known:true,serves:index>=0,index,pattern};
}
function exactStopContradiction(v,evidence,matchedRow){
  if(!authoritativePatternStopRequired()) return null;
  /* Only the current evidence result can hard-reject a kerb. progressTrip and
     the raw cached matchedTrip may legitimately lag during a journey handover. */
  const trip=String(evidence&&evidence.matchedTrip||'');
  if(!trip) return null;
  const patternId=String(matchedRow&&matchedRow.pattern||((v&&String(v.progressTrip||'')===trip)?v.progressPattern:'')||'');
  const check=exactTripSelectedStopEvidence(trip,patternId,S.stop,matchedRow&&matchedRow.stopSequence);
  return check.known&&!check.serves?check:null;
}
'''
replace_once(
    'bus.html',
    "function selectedPatternStopIndexForEvidence(stops,selectedStop,fromAlong,stopSequence){\n",
    exact_stop_helper + "function selectedPatternStopIndexForEvidence(stops,selectedStop,fromAlong,stopSequence){\n",
    'exact selected-stop authority helpers',
)

# GTFS-RT is an identity aid, not an authority over an exact stop contradiction.
# Its cached trip assignment also needs to be fresher than ordinary display GPS:
# a 60-90 second old turnaround identity can easily point at the journey on the
# opposite kerb while the SIRI position itself is already on the next working.
matched_fresh_helper = r'''const MATCHED_IDENTITY_MIN_FRESH_MS = 45*1000;
const MATCHED_IDENTITY_MAX_FRESH_MS = 90*1000;
function matchedIdentityFreshnessMs(v){
  const cadence=Number(v&&v.cadence);
  if(!Number.isFinite(cadence)||cadence<=0) return MATCHED_IDENTITY_MIN_FRESH_MS;
  return Math.max(MATCHED_IDENTITY_MIN_FRESH_MS,Math.min(MATCHED_IDENTITY_MAX_FRESH_MS,(cadence*1.75+15)*1000));
}
'''
replace_once(
    'bus.html',
    "function applyMatchedIdentities(vehicles,matches,now=Date.now()){\n",
    matched_fresh_helper + "function applyMatchedIdentities(vehicles,matches,now=Date.now()){\n",
    'matched identity freshness helper',
)
replace_once(
    'bus.html',
    """        const skew=Math.abs(referenceTs-timestamp);\n        if(!Number.isFinite(timestamp)||!Number.isFinite(referenceTs)||skew>MATCHED_IDENTITY_MAX_SKEW_MS) continue;\n        const metres=dist(Number(v.lat),Number(v.lon),Number(match.lat),Number(match.lon));\n""",
    """        const skew=Math.abs(referenceTs-timestamp);\n        if(!Number.isFinite(timestamp)||!Number.isFinite(referenceTs)||skew>MATCHED_IDENTITY_MAX_SKEW_MS) continue;\n        const identityAge=Math.max(0,now-timestamp);\n        if(identityAge>matchedIdentityFreshnessMs(v)) continue;\n        const metres=dist(Number(v.lat),Number(v.lon),Number(match.lat),Number(match.lon));\n""",
    'reject stale realtime trip identity before spatial matching',
)

# Sticky matched identities are useful for one missed auxiliary poll, but they
# must not freeze a bus onto its previous trip through a turnaround. Age the
# underlying GTFS-RT observation, not merely the time at which it was assigned.
replace_once(
    'bus.html',
    """  const matchedAt=Number(prev.matchedTripAt);\n  if(!sameService||!prev.matchedTrip||!Number.isFinite(matchedAt)||now-matchedAt>MATCHED_IDENTITY_GRACE_MS) return false;\n  v.matchedTrip=String(prev.matchedTrip);\n""",
    """  const matchedAt=Number(prev.matchedTripAt);\n  if(!sameService||!prev.matchedTrip||!Number.isFinite(matchedAt)||now-matchedAt>MATCHED_IDENTITY_GRACE_MS) return false;\n  const nextReferenceTs=Number.isFinite(Number(v.sourceTs))?Number(v.sourceTs):Number(v.ts);\n  const previousObservation=Number(prev.matchedObservationAt);\n  const observationAge=Number.isFinite(nextReferenceTs)&&Number.isFinite(previousObservation)?Math.max(0,nextReferenceTs-previousObservation):Infinity;\n  if(observationAge>matchedIdentityFreshnessMs(v)) return false;\n  v.matchedTrip=String(prev.matchedTrip);\n""",
    'do not retain stale matched trip through a turnaround',
)

# Make the exact-stop contradiction a hard gate before *all* recovery paths.
# This is the key wrong-side fix: if a loaded authoritative trip pattern serves
# the opposite Brightstone Road ATCO code, MATCH RETAINED and destination alias
# recovery cannot keep or resurrect it on this board.
replace_once(
    'bus.html',
    """    const matchedCallPlausible=!!(matchedRow&&Number(matchedRow.at)>=now-60*60000&&Number(matchedRow.at)<=now+3*3600000);\n    // An exact timetable journey that is due to call here outranks a\n""",
    """    const matchedCallPlausible=!!(matchedRow&&Number(matchedRow.at)>=now-60*60000&&Number(matchedRow.at)<=now+3*3600000);\n    const stopContradiction=exactStopContradiction(v,evidence,matchedRow);\n    if(stopContradiction){\n      clearRouteContinuity(v);\n      delete v.lastShownSnapshot; delete v.lastShownAt; delete v.lastShownArrivalAt;\n      rejectLive(diagnostics,'exactStop',v); continue;\n    }\n    // An exact timetable journey that is due to call here outranks a\n""",
    'hard exact-stop gate before retention and direction recovery',
)

# Diagnostics need to distinguish a wrong-side/exact-stop rejection from generic
# route uncertainty. This is deliberately visible through the existing info
# panel plumbing so the next real-world report tells us which gate decided it.
replace_once(
    'bus.html',
    "rejected:{stale:0,range:0,passed:0,route:0,destination:0,direction:0,away:0,confidence:0,limit:0},",
    "rejected:{stale:0,range:0,passed:0,route:0,exactStop:0,destination:0,direction:0,away:0,confidence:0,limit:0},",
    'exact-stop diagnostics counter',
)
replace_once(
    'bus.html',
    """    route:'matching GPS route could not be verified',\n    destination:'matching GPS destination was filtered',\n""",
    """    route:'matching GPS route could not be verified',\n    exactStop:'matching live journey serves the other stop side',\n    destination:'matching GPS destination was filtered',\n""",
    'exact-stop scheduled-row explanation',
)

# A live row with a verified exact trip identity must claim that timetable row
# even when its live ETA is far from schedule. Previously only row.schedule or
# row.matchedSchedule claimed it, allowing MATCH RETAINED + a duplicate
# "NO MATCHING LIVE BUS YET" schedule card to coexist.
claim_helper = r'''function exactIdentityScheduleClaim(row){
  if(!row||!row.v||!S.ttStop) return null;
  const evidence=row.evidence||{}, trip=String(evidence.matchedTrip||row.v.progressTrip||'');
  if(!trip) return null;
  const rows=timetableRowsForLine(row.v.line,new Date()).filter(schedule=>String(schedule.trip||'')===trip);
  const valid=rows.filter(schedule=>{
    const check=exactTripSelectedStopEvidence(schedule.trip,schedule.pattern,S.stop,schedule.stopSequence);
    return !check.authoritative||!check.known||check.serves;
  });
  if(!valid.length) return null;
  const target=Date.now()+Math.max(0,Number(row.secs)||0)*1000;
  return [...valid].sort((a,b)=>Math.abs(Number(a.at)-target)-Math.abs(Number(b.at)-target))[0]||null;
}
'''
replace_once(
    'bus.html',
    "// Identity claims the timetable row, not timing. A live bus running well off\n",
    claim_helper + "// Identity claims the timetable row, not timing. A live bus running well off\n",
    'exact identity timetable claim helper',
)
replace_once(
    'bus.html',
    """function claimedScheduleFor(row){\n  if(!row) return null;\n  if(row.gpsLost&&!row.scheduleFallback) return null;\n  return row.schedule||row.matchedSchedule||null;\n}\n""",
    """function claimedScheduleFor(row){\n  if(!row) return null;\n  if(row.gpsLost&&!row.scheduleFallback) return null;\n  return row.schedule||row.matchedSchedule||exactIdentityScheduleClaim(row)||null;\n}\n""",
    'unify live and timetable identity claims',
)

# Do not allow a timetable identity test itself to validate a trip that is known
# to omit the selected exact stop. Destination wording remains only a soft branch
# clue after this structural check.
replace_once(
    'bus.html',
    """function scheduleIdentityEvidence(schedule,v,evidenceCache){\n  if(!schedule||!v||String(v.line)!==String(schedule.line)) return null;\n  if(routeIdentityAgreement(schedule,v)<0) return null;\n""",
    """function scheduleIdentityEvidence(schedule,v,evidenceCache){\n  if(!schedule||!v||String(v.line)!==String(schedule.line)) return null;\n  const exact=exactTripSelectedStopEvidence(schedule.trip,schedule.pattern,S.stop,schedule.stopSequence);\n  if(exact.authoritative&&exact.known&&!exact.serves) return null;\n  if(routeIdentityAgreement(schedule,v)<0) return null;\n""",
    'exact-stop guard on schedule identity evidence',
)

# Expose the decision primitives to the browser regressions and future on-device
# diagnostics. This is intentionally a single evidence hierarchy rather than a
# new collection of special-case recovery rules.
replace_once(
    'bus.html',
    "knownRoutes,timetableRouteSet,routeEvidence,routeEvidenceWithContinuity,rememberRouteContinuity,routeContinuityGapMs,journeyDestinationAgreement,",
    "knownRoutes,timetableRouteSet,routeEvidence,routeEvidenceWithContinuity,rememberRouteContinuity,routeContinuityGapMs,exactTripSelectedStopEvidence,exactStopContradiction,matchedIdentityFreshnessMs,exactIdentityScheduleClaim,journeyDestinationAgreement,",
    'expose matching hardening test hooks',
)

# ---------------------------------------------------------------------------
# Regression contract
# ---------------------------------------------------------------------------
regression_anchor = "  assert.ok(busSource.includes(\"const PASSED_STOP_LOCK_MS = 30*60*1000;\"));\n"
regression_checks = """  assert.ok(busSource.includes(\"const PASSED_STOP_LOCK_MS = 30*60*1000;\"));\n  assert.ok(busSource.includes(\"function exactTripSelectedStopEvidence(trip,patternId,stop=S.stop,stopSequence)\"));\n  assert.ok(busSource.includes(\"const stopContradiction=exactStopContradiction(v,evidence,matchedRow);\"));\n  assert.ok(busSource.includes(\"rejectLive(diagnostics,'exactStop',v); continue;\"));\n  assert.ok(busSource.includes(\"identityAge>matchedIdentityFreshnessMs(v)\"));\n  assert.ok(busSource.includes(\"observationAge>matchedIdentityFreshnessMs(v)\"));\n  assert.ok(busSource.includes(\"return row.schedule||row.matchedSchedule||exactIdentityScheduleClaim(row)||null;\"));\n  assert.ok(busSource.indexOf(\"const stopContradiction=exactStopContradiction(v,evidence,matchedRow);\") < busSource.indexOf(\"setVehicleProgressIdentity(v,evidence,inference,matchedRow);\"));\n"""
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    regression_anchor,
    regression_checks,
    'matching engine hierarchy regression guards',
)

# Extend the existing duplicate-departure browser test: exact live trip identity
# alone must claim its schedule card, even when ETA blending did not attach the
# schedule object to the live row.
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    """      const matchedOnly=api.scheduledBoardRows([{v:{id:'V1',line:'61'},matchedSchedule:row,schedule:null,gpsLost:false,secs:600}]);\n      const blended=api.scheduledBoardRows([{v:{id:'V1',line:'61'},schedule:row,gpsLost:false,secs:600}]);\n      const lost=api.scheduledBoardRows([{v:{id:'V1',line:'61'},matchedSchedule:row,gpsLost:true,secs:600}]);\n      return {bare:bare.length,matchedOnly:matchedOnly.length,blended:blended.length,lost:lost.length};\n""",
    """      const matchedOnly=api.scheduledBoardRows([{v:{id:'V1',line:'61'},matchedSchedule:row,schedule:null,gpsLost:false,secs:600}]);\n      const identityOnly=api.scheduledBoardRows([{v:{id:'V1',line:'61',progressTrip:'T1'},evidence:{matchedTrip:'T1'},matchedSchedule:null,schedule:null,gpsLost:false,secs:600}]);\n      const blended=api.scheduledBoardRows([{v:{id:'V1',line:'61'},schedule:row,gpsLost:false,secs:600}]);\n      const lost=api.scheduledBoardRows([{v:{id:'V1',line:'61'},matchedSchedule:row,gpsLost:true,secs:600}]);\n      return {bare:bare.length,matchedOnly:matchedOnly.length,identityOnly:identityOnly.length,blended:blended.length,lost:lost.length};\n""",
    'identity-only timetable claim regression fixture',
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.deepEqual(duplicateDeparture,{bare:1,matchedOnly:0,blended:0,lost:1});",
    "assert.deepEqual(duplicateDeparture,{bare:1,matchedOnly:0,identityOnly:0,blended:0,lost:1});",
    'identity-only timetable claim regression expectation',
)

journey_anchor = """      const flickerPassed=Number(state.liveDiag&&state.liveDiag.rejected&&state.liveDiag.rejected.passed||0);\n\n      const stickyIncoming={...baseVehicle,sourceTs:now,ts:now,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};\n"""
journey_case = r'''      const flickerPassed=Number(state.liveDiag&&state.liveDiag.rejected&&state.liveDiag.rejected.passed||0);

      // Exact national stop identity outranks a stale/incorrect realtime trip.
      // The candidate pattern contains only the opposite Brightstone kerb and
      // must therefore be a hard rejection rather than a retained live row.
      const wrongSideTrip='WRONG-SIDE-TRIP', wrongSidePattern='wrong-side-pattern';
      state.ttStop={id:'BRIGHTSTONE',match:'code',d:[[
        minuteAt(5),'61','Moor St Queensway','','in',wrongSideTrip,wrongSidePattern,'R61','',3,minuteAt(-20)
      ]]};
      state.timetable={services:{},tripPatterns:{[wrongSideTrip]:wrongSidePattern},patterns:{
        [wrongSidePattern]:{
          p:[[52.4600,-1.9600],[52.4520,-1.9600],[52.4480,-1.9600]],
          s:[
            ['UPSTREAM','Upstream',52.4600,-1.9600,1],
            ['BRIGHTSTONE-OTHER-SIDE','Brightstone Road',52.45025,-1.9600,3]
          ],g:1
        }
      }};
      state.timetableRun=Number(state.timetableRun||0)+1;
      const wrongSideVehicle={
        id:'wrong-side-live',line:'61',lineRef:'61',owner:'',operator:'',dest:'Digbeth',journey:'OPAQUE',
        matchedTrip:wrongSideTrip,matchedRouteId:'R61',matchedLagMs:0,matchedTripAt:now,matchedObservationAt:now,
        lat:52.4520,lon:-1.9600,bearing:180,ts:now,sourceTs:now,hist:[{lat:52.4540,lon:-1.9600,ts:now-20000},{lat:52.4520,lon:-1.9600,ts:now}],speed:6,cadence:20
      };
      wrongSideVehicle.lastShownStopId='BRIGHTSTONE';wrongSideVehicle.lastShownAt=now;wrongSideVehicle.lastShownArrivalAt=now+5*60000;wrongSideVehicle.lastShownBoardDir='all';wrongSideVehicle.lastShownDestFilter='';
      wrongSideVehicle.lastShownSnapshot={v:null,secs:300,metres:200,evidence:{matchedTrip:wrongSideTrip},confidence:'low'};
      state.vehicles=new Map([[wrongSideVehicle.id,wrongSideVehicle]]);
      const wrongSideRows=api.relevant();
      const wrongSide={
        shown:wrongSideRows.some(row=>row.v&&row.v.id===wrongSideVehicle.id),
        exactStopRejected:Number(state.liveDiag&&state.liveDiag.rejected&&state.liveDiag.rejected.exactStop||0),
        retained:Number(state.liveDiag&&state.liveDiag.recovered||0)
      };
      const exactStopCheck=api.exactTripSelectedStopEvidence(wrongSideTrip,wrongSidePattern,stop,3);

      // A GTFS-RT identity old enough to plausibly belong to the previous
      // turnaround must not assign a trip to an otherwise fresh SIRI vehicle.
      const staleMatchedInput={...baseVehicle,id:'stale-rt',vehicleRef:'BUS-STALE',vehicleUniqueId:'',journey:'OPAQUE',matchedTrip:'',sourceTs:now,ts:now,cadence:20};
      const staleMatchedCount=api.applyMatchedIdentities([staleMatchedInput],[{entityId:'entity-stale',vehicleId:'BUS-STALE',tripId:'OUTBOUND',routeId:'R61',lat:baseVehicle.lat,lon:baseVehicle.lon,timestamp:now-120000}],now);

      // Sticky identity must also age the *underlying observation*. A fresh
      // assignment timestamp is not enough if the GTFS-RT position itself is
      // two minutes behind the current SIRI vehicle.
      const staleStickyIncoming={...baseVehicle,sourceTs:now,ts:now,matchedTrip:'',cadence:20};
      const staleStickyPrevious={...baseVehicle,matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedTripAt:now-10000,matchedObservationAt:now-120000,matchedLagMs:0,matchSource:'gtfs-rt'};
      const staleStickyRetained=api.retainMatchedIdentity(staleStickyPrevious,staleStickyIncoming,now);

      const stickyIncoming={...baseVehicle,sourceTs:now,ts:now,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};
'''
replace_once(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    journey_anchor,
    journey_case,
    'opposite kerb and stale identity journey regression fixtures',
)
replace_once(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    """        patternLoadFlicker:{before:flickerBefore,after:flickerAfter,passed:flickerPassed},\n        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,lag:Number(stickyIncoming.matchedLagMs),expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},\n""",
    """        patternLoadFlicker:{before:flickerBefore,after:flickerAfter,passed:flickerPassed},\n        wrongSide,\n        exactStopCheck:{authoritative:!!exactStopCheck.authoritative,known:!!exactStopCheck.known,serves:!!exactStopCheck.serves,index:Number(exactStopCheck.index)},\n        staleMatchedIdentity:{count:staleMatchedCount,trip:String(staleMatchedInput.matchedTrip||'')},\n        staleStickyIdentity:{retained:staleStickyRetained,trip:String(staleStickyIncoming.matchedTrip||'')},\n        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,lag:Number(stickyIncoming.matchedLagMs),expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},\n""",
    'return matching-hardening regression results',
)
replace_once(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    """  assert.deepEqual(result.patternLoadFlicker,{before:true,after:true,passed:0},'loading a route pattern with only a nearby opposite-kerb stop must not make a previously visible exact realtime bus disappear as already passed');\n  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,lag:30000,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap, age its observation lag, and expire rather than stick indefinitely');\n""",
    """  assert.deepEqual(result.patternLoadFlicker,{before:true,after:false,passed:0},'once an authoritative pattern is loaded and contains only the opposite kerb, exact stop identity must override earlier realtime visibility');\n  assert.deepEqual(result.wrongSide,{shown:false,exactStopRejected:1,retained:0},'an exact opposite-kerb contradiction must hard-drop the live bus and must not be rescued by MATCH RETAINED');\n  assert.deepEqual(result.exactStopCheck,{authoritative:true,known:true,serves:false,index:-1},'authoritative exact-stop evidence must distinguish the opposite Brightstone Road ATCO code');\n  assert.deepEqual(result.staleMatchedIdentity,{count:0,trip:''},'a two-minute-old matched identity must not assign the previous journey to a fresh SIRI vehicle');\n  assert.deepEqual(result.staleStickyIdentity,{retained:false,trip:''},'sticky matched identity must expire from the observation age rather than the local assignment time');\n  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,lag:30000,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap, age its observation lag, and expire rather than stick indefinitely');\n""",
    'update matching hardening regression expectations',
)

subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
print('Prepared Kerbside 0.7.23: exact-stop matching hierarchy, fresher realtime identity and unified timetable claims')
