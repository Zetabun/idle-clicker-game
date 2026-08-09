#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

OLD_VERSION = '0.7.23'
NEW_VERSION = '0.7.24'


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
# Exact-stop proof is now part of retained state, not just a one-frame gate.
# ---------------------------------------------------------------------------
# 0.7.23 correctly rejects a loaded trip pattern that contains only the
# opposite kerb, but it could seed route continuity *before* performing that
# rejection. A later weak refresh could therefore resurrect the same bus as
# MATCH RETAINED without any current trip/pattern to contradict. Persist the
# exact selected-stop proof that admitted a vehicle and require that proof for
# every retained row on an authoritative national stop.
proof_helpers = r'''const EXACT_STOP_PROOF_FIELDS = [
  'routeVerifiedExactStopId','routeVerifiedExactTrip','routeVerifiedExactPattern',
  'routeVerifiedExactStopIndex','routeVerifiedExactAt'
];
function currentExactStopProof(v,evidence,inference,matchedRow,now=Date.now()){
  if(!authoritativePatternStopRequired()) return {required:false,known:true,serves:true,stopId:String(S.stop&&S.stop.id||''),trip:'',pattern:'',index:-1,at:now};
  if(!S.stop) return {required:true,known:false,serves:false,stopId:'',trip:'',pattern:'',index:-1,at:now};
  const candidates=[];
  if(matchedRow){
    candidates.push({trip:String(matchedRow.trip||evidence&&evidence.matchedTrip||''),pattern:String(matchedRow.pattern||''),stopSequence:matchedRow.stopSequence});
  }
  const evidenceTrip=String(evidence&&evidence.matchedTrip||'');
  const evidencePattern=String(evidence&&evidence.patternId||'');
  if(evidenceTrip||evidencePattern) candidates.push({trip:evidenceTrip,pattern:evidencePattern,stopSequence:undefined});
  const inferredPattern=String(inference&&inference.patternId||inference&&inference.pattern&&inference.pattern.id||'');
  if(inferredPattern) candidates.push({trip:'',pattern:inferredPattern,stopSequence:undefined});
  let sawKnown=false;
  for(const candidate of candidates){
    const check=exactTripSelectedStopEvidence(candidate.trip,candidate.pattern,S.stop,candidate.stopSequence);
    if(!check.known) continue;
    sawKnown=true;
    if(!check.serves) return {required:true,known:true,serves:false,stopId:String(S.stop.id),trip:candidate.trip,pattern:String(check.pattern&&check.pattern.id||candidate.pattern||''),index:check.index,at:now};
    return {required:true,known:true,serves:true,stopId:String(S.stop.id),trip:candidate.trip,pattern:String(check.pattern&&check.pattern.id||candidate.pattern||''),index:check.index,at:now};
  }
  return {required:true,known:sawKnown,serves:false,stopId:String(S.stop.id),trip:'',pattern:'',index:-1,at:now};
}
function rememberExactStopProof(v,proof,now=Date.now()){
  if(!v||!proof||!proof.serves||!S.stop) return false;
  v.routeVerifiedExactStopId=String(S.stop.id);
  v.routeVerifiedExactTrip=String(proof.trip||'');
  v.routeVerifiedExactPattern=String(proof.pattern||'');
  v.routeVerifiedExactStopIndex=Number.isFinite(Number(proof.index))?Number(proof.index):-1;
  v.routeVerifiedExactAt=now;
  return true;
}
function hasExactStopRetentionProof(v){
  if(!authoritativePatternStopRequired()) return true;
  if(!v||!S.stop) return false;
  return v.routeVerifiedExactStopId===String(S.stop.id)&&Number(v.routeVerifiedExactAt)>0;
}
'''
replace_once(
    'bus.html',
    "function selectedPatternStopIndexForEvidence(stops,selectedStop,fromAlong,stopSequence){\n",
    proof_helpers + "function selectedPatternStopIndexForEvidence(stops,selectedStop,fromAlong,stopSequence){\n",
    'exact-stop retention proof helpers',
)

# Exact proof travels with route continuity and is cleared by all of the same
# journey/route/discontinuity reset paths. This prevents a route-level match
# from surviving after its side-of-road evidence has become unknowable.
replace_once(
    'bus.html',
    """  'routeVerifiedStopDistance','routeVerifiedLine','routeVerifiedOwner','routeVerifiedDest',\n  'routeVerifiedBoardDir','routeVerifiedDestFilter'\n];\n""",
    """  'routeVerifiedStopDistance','routeVerifiedLine','routeVerifiedOwner','routeVerifiedDest',\n  'routeVerifiedBoardDir','routeVerifiedDestFilter',\n  'routeVerifiedExactStopId','routeVerifiedExactTrip','routeVerifiedExactPattern',\n  'routeVerifiedExactStopIndex','routeVerifiedExactAt'\n];\n""",
    'carry exact proof in route continuity state',
)

replace_once(
    'bus.html',
    """  if(v.routeVerifiedStopId!==String(S.stop.id)) return false;\n  if(v.routeVerifiedBoardDir!==S.dir) return false;\n""",
    """  if(v.routeVerifiedStopId!==String(S.stop.id)) return false;\n  if(!hasExactStopRetentionProof(v)) return false;\n  if(v.routeVerifiedBoardDir!==S.dir) return false;\n""",
    'require exact stop proof for continuity reuse',
)

replace_once(
    'bus.html',
    "function rememberRouteContinuity(v,evidence,now=Date.now()){\n  if(!v||!S.stop||!evidence||Number(evidence.score)<2) return false;\n",
    "function rememberRouteContinuity(v,evidence,now=Date.now(),proof=null){\n  if(!v||!S.stop||!evidence||Number(evidence.score)<2) return false;\n  if(authoritativePatternStopRequired()&&(!proof||!proof.serves)) return false;\n",
    'route continuity must be seeded by exact proof',
)
replace_once(
    'bus.html',
    """  v.routeVerifiedDest=String(v.dest||''); v.routeVerifiedBoardDir=S.dir;\n  v.routeVerifiedDestFilter=String(S.destFilter||'');\n  return true;\n}\n""",
    """  v.routeVerifiedDest=String(v.dest||''); v.routeVerifiedBoardDir=S.dir;\n  v.routeVerifiedDestFilter=String(S.destFilter||'');\n  if(proof&&proof.serves) rememberExactStopProof(v,proof,now);\n  return true;\n}\n""",
    'store exact proof with route continuity',
)

# A retained snapshot is now impossible on an authoritative stop unless the
# original accepted row had exact proof for this selected stop. This is the
# main fix for the visible Frankley MATCH RETAINED row on the Moor Street kerb.
replace_once(
    'bus.html',
    """  if(!v||!v.lastShownSnapshot||!S.stop) return null;\n  if(v.lastShownStopId!==String(S.stop.id)) return null;\n""",
    """  if(!v||!v.lastShownSnapshot||!S.stop) return null;\n  if(v.lastShownStopId!==String(S.stop.id)) return null;\n  if(!hasExactStopRetentionProof(v)) return null;\n""",
    'retained snapshot requires exact stop proof',
)

# The old ordering seeded continuity from score>=2 before checking whether the
# matched journey actually served this exact kerb. Reorder the decision: derive
# the current matched row, reject an exact opposite-stop contradiction, derive
# positive exact proof, then (and only then) seed continuity. Weak evidence may
# use continuity only if a previous exact proof already exists.
old_decision = """    let evidence=routeEvidence(v.line,v.dest,journeyRef,v);\n    const inference=!evidence.journeyMatch?inferVehicleJourneyPattern(v,S.stop,now):null;\n    evidence=inferredRouteEvidence(evidence,inference);\n    if(evidence.score>=2) rememberRouteContinuity(v,evidence,now);\n    else evidence=routeEvidenceWithContinuity(v,evidence,now);\n    const matchedRows=evidence.matchedTrip?timetableRowsForLine(v.line,new Date()).filter(row=>String(row.trip)===String(evidence.matchedTrip)):[];\n    const matchedRow=matchedRows.length?matchedRows.sort((a,b)=>Math.abs(Number(a.at)-now)-Math.abs(Number(b.at)-now))[0]:null;\n    const matchedCallPlausible=!!(matchedRow&&Number(matchedRow.at)>=now-60*60000&&Number(matchedRow.at)<=now+3*3600000);\n    const stopContradiction=exactStopContradiction(v,evidence,matchedRow);\n    if(stopContradiction){\n      clearRouteContinuity(v);\n      delete v.lastShownSnapshot; delete v.lastShownAt; delete v.lastShownArrivalAt;\n      rejectLive(diagnostics,'exactStop',v); continue;\n    }\n"""
new_decision = """    let evidence=routeEvidence(v.line,v.dest,journeyRef,v);\n    const inference=!evidence.journeyMatch?inferVehicleJourneyPattern(v,S.stop,now):null;\n    evidence=inferredRouteEvidence(evidence,inference);\n    let matchedRows=evidence.matchedTrip?timetableRowsForLine(v.line,new Date()).filter(row=>String(row.trip)===String(evidence.matchedTrip)):[];\n    let matchedRow=matchedRows.length?matchedRows.sort((a,b)=>Math.abs(Number(a.at)-now)-Math.abs(Number(b.at)-now))[0]:null;\n    let matchedCallPlausible=!!(matchedRow&&Number(matchedRow.at)>=now-60*60000&&Number(matchedRow.at)<=now+3*3600000);\n    const stopContradiction=exactStopContradiction(v,evidence,matchedRow);\n    if(stopContradiction){\n      clearRouteContinuity(v);\n      delete v.lastShownSnapshot; delete v.lastShownAt; delete v.lastShownArrivalAt;\n      rejectLive(diagnostics,'exactStop',v); continue;\n    }\n    const exactProof=currentExactStopProof(v,evidence,inference,matchedRow,now);\n    if(evidence.score>=2) rememberRouteContinuity(v,evidence,now,exactProof);\n    else evidence=routeEvidenceWithContinuity(v,evidence,now);\n    if(evidence.routeContinuity&&!hasExactStopRetentionProof(v)){\n      clearRouteContinuity(v);\n      rejectLive(diagnostics,'exactStop',v); continue;\n    }\n"""
replace_once('bus.html', old_decision, new_decision, 'exact-stop-first live decision ordering')

# When a fully accepted row has exact proof, refresh it together with the normal
# displayed-row snapshot. Conversely, an authoritative row without exact proof
# may still be shown from strong current evidence while patterns are loading,
# but it can never become MATCH RETAINED on a later weak refresh.
replace_once(
    'bus.html',
    """    v.lastShownStopId=String(S.stop.id); v.lastShownAt=now; v.lastShownArrivalAt=now+Math.max(0,row.secs)*1000;\n    v.lastShownBoardDir=S.dir; v.lastShownDestFilter=String(S.destFilter||'');\n""",
    """    if(exactProof&&exactProof.serves) rememberExactStopProof(v,exactProof,now);\n    v.lastShownStopId=String(S.stop.id); v.lastShownAt=now; v.lastShownArrivalAt=now+Math.max(0,row.secs)*1000;\n    v.lastShownBoardDir=S.dir; v.lastShownDestFilter=String(S.destFilter||'');\n""",
    'refresh exact proof on accepted row',
)

# Safe physical re-key continuity is useful, but the exact proof has to move
# with it or the row will flicker off immediately. Copy only the stop-side proof
# fields; trip/corridor identity is still deliberately not copied by this path.
old_seed = "'routeVerifiedLine','routeVerifiedOwner','routeVerifiedDest','routeVerifiedBoardDir','routeVerifiedDestFilter']"
new_seed = "'routeVerifiedLine','routeVerifiedOwner','routeVerifiedDest','routeVerifiedBoardDir','routeVerifiedDestFilter','routeVerifiedExactStopId','routeVerifiedExactTrip','routeVerifiedExactPattern','routeVerifiedExactStopIndex','routeVerifiedExactAt']"
replace_once('bus.html', old_seed, new_seed, 'carry exact proof across safe physical re-key')

# Expose the invariant for regressions and diagnostics.
replace_once(
    'bus.html',
    "routeContinuityGapMs,exactTripSelectedStopEvidence,exactStopContradiction,matchedIdentityFreshnessMs,",
    "routeContinuityGapMs,exactTripSelectedStopEvidence,exactStopContradiction,currentExactStopProof,hasExactStopRetentionProof,matchedIdentityFreshnessMs,",
    'expose exact proof helpers',
)

# ---------------------------------------------------------------------------
# Regression coverage
# ---------------------------------------------------------------------------
# Source-level ordering checks catch the exact 0.7.23 bug: continuity must never
# be seeded before exact-stop contradiction/proof has been resolved.
regression_anchor = "  assert.ok(busSource.includes(\"function exactTripSelectedStopEvidence(trip,patternId,stop=S.stop,stopSequence)\"));\n"
regression_checks = """  assert.ok(busSource.includes(\"function exactTripSelectedStopEvidence(trip,patternId,stop=S.stop,stopSequence)\"));\n  assert.ok(busSource.includes(\"function currentExactStopProof(v,evidence,inference,matchedRow,now=Date.now())\"));\n  assert.ok(busSource.includes(\"if(!hasExactStopRetentionProof(v)) return null;\"));\n  assert.ok(busSource.includes(\"if(authoritativePatternStopRequired()&&(!proof||!proof.serves)) return false;\"));\n  assert.ok(busSource.includes(\"rememberRouteContinuity(v,evidence,now,exactProof)\"));\n  assert.ok(busSource.indexOf(\"const stopContradiction=exactStopContradiction(v,evidence,matchedRow);\") < busSource.indexOf(\"rememberRouteContinuity(v,evidence,now,exactProof)\"));\n  assert.ok(busSource.indexOf(\"const exactProof=currentExactStopProof(v,evidence,inference,matchedRow,now);\") < busSource.indexOf(\"rememberRouteContinuity(v,evidence,now,exactProof)\"));\n"""
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    regression_anchor,
    regression_checks,
    'exact stop retention proof regression guards',
)

# Add a small behaviour-level proof test to the journey identity suite. It
# verifies that the exact selected kerb can seed retention, while an opposite
# kerb pattern cannot.
journey_anchor = "      const exactStopCheck=api.exactTripSelectedStopEvidence(wrongSideTrip,wrongSidePattern,stop,3);\n"
journey_case = r'''      const exactStopCheck=api.exactTripSelectedStopEvidence(wrongSideTrip,wrongSidePattern,stop,3);
      const wrongSideProof=api.currentExactStopProof(wrongSideVehicle,{score:6,matchedTrip:wrongSideTrip},null,{trip:wrongSideTrip,pattern:wrongSidePattern,stopSequence:3},now);
      const wrongSideRetentionSeed=api.rememberRouteContinuity(wrongSideVehicle,{score:6,matchedTrip:wrongSideTrip},now,wrongSideProof);

      const rightSideTrip='RIGHT-SIDE-TRIP',rightSidePattern='right-side-pattern';
      state.timetable.tripPatterns[rightSideTrip]=rightSidePattern;
      state.timetable.patterns[rightSidePattern]={
        p:[[52.4600,-1.9600],[52.4520,-1.9600],[52.4500,-1.9600]],
        s:[['UPSTREAM','Upstream',52.4600,-1.9600,1],['BRIGHTSTONE','Brightstone Road',52.4500,-1.9600,3]],g:1
      };
      const rightSideVehicle={...wrongSideVehicle,id:'right-side-live',matchedTrip:rightSideTrip,progressTrip:rightSideTrip,progressPattern:rightSidePattern};
      const rightSideProof=api.currentExactStopProof(rightSideVehicle,{score:6,matchedTrip:rightSideTrip},null,{trip:rightSideTrip,pattern:rightSidePattern,stopSequence:3},now);
      const rightSideRetentionSeed=api.rememberRouteContinuity(rightSideVehicle,{score:6,matchedTrip:rightSideTrip},now,rightSideProof);
      const retentionProof={
        wrongSideServes:wrongSideProof.serves,wrongSideSeed:wrongSideRetentionSeed,wrongSideHas:api.hasExactStopRetentionProof(wrongSideVehicle),
        rightSideServes:rightSideProof.serves,rightSideSeed:rightSideRetentionSeed,rightSideHas:api.hasExactStopRetentionProof(rightSideVehicle)
      };
'''
replace_once(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    journey_anchor,
    journey_case,
    'exact stop retention behavioural fixture',
)
replace_once(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    "        exactStopCheck:{authoritative:!!exactStopCheck.authoritative,known:!!exactStopCheck.known,serves:!!exactStopCheck.serves,index:Number(exactStopCheck.index)},\n",
    "        exactStopCheck:{authoritative:!!exactStopCheck.authoritative,known:!!exactStopCheck.known,serves:!!exactStopCheck.serves,index:Number(exactStopCheck.index)},\n        retentionProof,\n",
    'return retention proof regression result',
)
replace_once(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    "  assert.deepEqual(result.exactStopCheck,{authoritative:true,known:true,serves:false,index:-1},'authoritative exact-stop evidence must distinguish the opposite Brightstone Road ATCO code');\n",
    "  assert.deepEqual(result.exactStopCheck,{authoritative:true,known:true,serves:false,index:-1},'authoritative exact-stop evidence must distinguish the opposite Brightstone Road ATCO code');\n  assert.deepEqual(result.retentionProof,{wrongSideServes:false,wrongSideSeed:false,wrongSideHas:false,rightSideServes:true,rightSideSeed:true,rightSideHas:true},'retention may be seeded only by proof that the exact selected stop occurs in the ordered journey pattern');\n",
    'assert exact stop retention proof',
)

subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
print('Prepared Kerbside 0.7.24: retained live rows require exact selected-stop proof')
