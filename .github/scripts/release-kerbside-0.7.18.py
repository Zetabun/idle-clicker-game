#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

OLD_VERSION = '0.7.17'
NEW_VERSION = '0.7.18'


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

# A route match that has already been genuinely established should not expire
# merely because the timetable/identity evidence is temporarily weak while the
# same bus continues to supply fresh, plausible GPS fixes. The continuity is
# deliberately narrow: same stop/filter/line/operator/destination context, a
# new fix within 90 seconds, plausible physical movement, and no measured
# retreat from the stop. Explicit journey-branch conflicts still win.
continuity_block = r'''/* A bus that has already passed the route gate can briefly lose timetable or
   identity evidence even while its GPS keeps updating normally. Keep that
   established route context alive from one fresh fix to the next instead of
   letting an arbitrary retention timer make the row blink off and on. This is
   never an admission path for a new bus: a score >=2 must seed it first. */
const ROUTE_CONTINUITY_MAX_GAP_MS = 90*1000;
const ROUTE_CONTINUITY_MAX_METRES = 2500;
const ROUTE_CONTINUITY_MAX_STOP_RETREAT = 250;
const ROUTE_CONTINUITY_FIELDS = [
  'routeVerifiedStopId','routeVerifiedAt','routeVerifiedGpsTs','routeVerifiedLat','routeVerifiedLon',
  'routeVerifiedStopDistance','routeVerifiedLine','routeVerifiedOwner','routeVerifiedDest',
  'routeVerifiedBoardDir','routeVerifiedDestFilter'
];
function clearRouteContinuity(v){
  if(!v) return;
  for(const field of ROUTE_CONTINUITY_FIELDS) delete v[field];
}
function routeContinuityContextMatches(v){
  if(!v||!S.stop) return false;
  if(v.routeVerifiedStopId!==String(S.stop.id)) return false;
  if(v.routeVerifiedBoardDir!==S.dir) return false;
  if(String(v.routeVerifiedDestFilter||'')!==String(S.destFilter||'')) return false;
  if(String(v.routeVerifiedLine||'')!==String(v.line||'')) return false;
  if(String(v.routeVerifiedOwner||'')!==String(v.owner||v.operator||'')) return false;
  const previousDest=String(v.routeVerifiedDest||''), liveDest=String(v.dest||'');
  if(previousDest&&liveDest&&destinationSimilarity(previousDest,liveDest)<.6) return false;
  return true;
}
function rememberRouteContinuity(v,evidence,now=Date.now()){
  if(!v||!S.stop||!evidence||Number(evidence.score)<2) return false;
  const gpsTs=Number(v.ts)||0, lat=Number(v.lat), lon=Number(v.lon);
  if(!gpsTs||!Number.isFinite(lat)||!Number.isFinite(lon)||!gpsLiveDisplayFresh(v,now)) return false;
  v.routeVerifiedStopId=String(S.stop.id); v.routeVerifiedAt=now; v.routeVerifiedGpsTs=gpsTs;
  v.routeVerifiedLat=lat; v.routeVerifiedLon=lon;
  v.routeVerifiedStopDistance=dist(lat,lon,S.stop.lat,S.stop.lon);
  v.routeVerifiedLine=String(v.line||''); v.routeVerifiedOwner=String(v.owner||v.operator||'');
  v.routeVerifiedDest=String(v.dest||''); v.routeVerifiedBoardDir=S.dir;
  v.routeVerifiedDestFilter=String(S.destFilter||'');
  return true;
}
function routeEvidenceWithContinuity(v,evidence,now=Date.now()){
  if(!v||!evidence||Number(evidence.score)>=2||!S.stop) return evidence;
  if(evidence.journeyDestinationConflict||evidence.conflictingTrip) return evidence;
  if(!routeContinuityContextMatches(v)) return evidence;
  const gpsTs=Number(v.ts)||0, previousTs=Number(v.routeVerifiedGpsTs)||0;
  const verifiedAt=Number(v.routeVerifiedAt)||0;
  if(!gpsTs||!previousTs||gpsTs<previousTs||!verifiedAt) return evidence;
  if(now-verifiedAt>ROUTE_CONTINUITY_MAX_GAP_MS||!gpsLiveDisplayFresh(v,now)) return evidence;
  if(movementTrend(v,S.stop)<0) return evidence;
  if(gpsTs>previousTs){
    const gap=gpsTs-previousTs;
    if(gap>ROUTE_CONTINUITY_MAX_GAP_MS) return evidence;
    const lat=Number(v.lat), lon=Number(v.lon);
    const metres=dist(Number(v.routeVerifiedLat),Number(v.routeVerifiedLon),lat,lon);
    const allowed=Math.min(ROUTE_CONTINUITY_MAX_METRES,Math.max(120,gap/1000*35+100));
    if(!Number.isFinite(metres)||metres>allowed) return evidence;
    const stopDistance=dist(lat,lon,S.stop.lat,S.stop.lon), previousStopDistance=Number(v.routeVerifiedStopDistance);
    if(Number.isFinite(previousStopDistance)&&stopDistance>previousStopDistance+ROUTE_CONTINUITY_MAX_STOP_RETREAT) return evidence;
    v.routeVerifiedAt=now; v.routeVerifiedGpsTs=gpsTs; v.routeVerifiedLat=lat; v.routeVerifiedLon=lon;
    v.routeVerifiedStopDistance=stopDistance;
  }
  return {...evidence,score:2,label:'recent verified route retained by fresh GPS continuity',routeContinuity:true,timetableVerified:true};
}
'''
replace_once(
    'bus.html',
    'function relevant(){\n',
    continuity_block + 'function relevant(){\n',
    'route continuity helpers',
)

replace_once(
    'bus.html',
    "    let evidence=routeEvidence(v.line,v.dest,journeyRef,v);\n    const inference=!evidence.journeyMatch?inferVehicleJourneyPattern(v,S.stop,now):null;\n    evidence=inferredRouteEvidence(evidence,inference);\n",
    "    let evidence=routeEvidence(v.line,v.dest,journeyRef,v);\n    const inference=!evidence.journeyMatch?inferVehicleJourneyPattern(v,S.stop,now):null;\n    evidence=inferredRouteEvidence(evidence,inference);\n    if(evidence.score>=2) rememberRouteContinuity(v,evidence,now);\n    else evidence=routeEvidenceWithContinuity(v,evidence,now);\n",
    'apply fresh route continuity',
)

replace_once(
    'bus.html',
    "delete rec.inferredJourney;delete rec.inferredTrip;delete rec.inferredPattern;delete rec.inferredAt;delete rec.inferenceStopId;delete rec.inferenceGpsTs;",
    "delete rec.inferredJourney;delete rec.inferredTrip;delete rec.inferredPattern;delete rec.inferredAt;delete rec.inferenceStopId;delete rec.inferenceGpsTs;clearRouteContinuity(rec);",
    'clear route continuity on track identity change',
)

replace_once(
    'bus.html',
    "delete vehicle.progressIdentityBlocked; vehicle.corridorTracked=false;",
    "delete vehicle.progressIdentityBlocked; clearRouteContinuity(vehicle); vehicle.corridorTracked=false;",
    'clear route continuity when stop changes',
)

old_seed = "for(const field of ['speed','motionSpeed','cadence','stationaryAt','lastShownStopId','lastShownAt','lastShownArrivalAt','lastShownBoardDir','lastShownDestFilter']){"
new_seed = "for(const field of ['speed','motionSpeed','cadence','stationaryAt','lastShownStopId','lastShownAt','lastShownArrivalAt','lastShownBoardDir','lastShownDestFilter','routeVerifiedStopId','routeVerifiedAt','routeVerifiedGpsTs','routeVerifiedLat','routeVerifiedLon','routeVerifiedStopDistance','routeVerifiedLine','routeVerifiedOwner','routeVerifiedDest','routeVerifiedBoardDir','routeVerifiedDestFilter']){"
replace_once('bus.html', old_seed, new_seed, 'carry route continuity across safe physical re-key')

replace_once(
    'bus.html',
    'timetableRouteSet,routeEvidence,journeyDestinationAgreement,',
    'timetableRouteSet,routeEvidence,routeEvidenceWithContinuity,rememberRouteContinuity,journeyDestinationAgreement,',
    'expose route continuity regression hooks',
)

regression_anchor = """  assert.equal(refreshGate.busy,false);\n  assert.equal(refreshGate.idle,true);\n\n  const routeOverlayRetention = await page.evaluate(() => {\n"""
regression_block = r'''  assert.equal(refreshGate.busy,false);
  assert.equal(refreshGate.idle,true);

  // Once a route has genuinely passed the gate, a new plausible GPS fix may
  // carry that verification across a temporary route/journey evidence dropout.
  // Re-rendering the same fix cannot extend it indefinitely, and a destination
  // branch change, measured retreat, or implausible jump must still fail closed.
  const freshRouteContinuity = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={stop:state.stop,dir:state.dir,destFilter:state.destFilter};
    try{
      state.stop={id:'route-continuity-stop',lat:52.5,lon:-2.1,name:'Route continuity stop'};
      state.dir='all';state.destFilter=null;
      const v={
        id:'ROUTE-CONT|journey|one|vehicle|42',line:'61',operator:'ROUTE-CONT',owner:'ROUTE-CONT',
        dest:'Moor St Queensway',lat:52.48,lon:-2.1,ts:now,timestampKnown:true,
        hist:[{lat:52.475,lon:-2.1,ts:now-30000},{lat:52.48,lon:-2.1,ts:now}]
      };
      const seeded=api.rememberRouteContinuity(v,{score:3,label:'verified'},now);
      const weak={score:1,label:'route/journey temporarily weak'};
      v.lat=52.485;v.ts=now+30000;v.hist.push({lat:v.lat,lon:v.lon,ts:v.ts});
      const continued=api.routeEvidenceWithContinuity(v,weak,now+30000);
      const sameFixExpired=api.routeEvidenceWithContinuity(v,weak,now+121000);
      const branch={...v,dest:'Other Branch',lat:52.487,ts:now+45000,hist:[...v.hist,{lat:52.487,lon:-2.1,ts:now+45000}]};
      const branchResult=api.routeEvidenceWithContinuity(branch,weak,now+45000);
      const away={...v,lat:52.477,ts:now+45000,hist:[{lat:52.485,lon:-2.1,ts:now+30000},{lat:52.477,lon:-2.1,ts:now+45000}]};
      const awayResult=api.routeEvidenceWithContinuity(away,weak,now+45000);
      const jump={...v,lat:52.56,ts:now+45000,hist:[{lat:52.485,lon:-2.1,ts:now+30000},{lat:52.56,lon:-2.1,ts:now+45000}]};
      const jumpResult=api.routeEvidenceWithContinuity(jump,weak,now+45000);
      return {
        seeded,continuedScore:continued.score,continued:continued.routeContinuity===true,
        sameFixExpired:sameFixExpired.score,branch:branchResult.score,away:awayResult.score,jump:jumpResult.score
      };
    }finally{Object.assign(state,saved);}
  });
  assert.deepEqual(freshRouteContinuity,{seeded:true,continuedScore:2,continued:true,sameFixExpired:1,branch:1,away:1,jump:1});

  const routeOverlayRetention = await page.evaluate(() => {
'''
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    regression_anchor,
    regression_block,
    'fresh route continuity regression',
)

# Keep every repeated version marker aligned, including browser regression
# assertions. CI also runs this script in --check mode after the release.
subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
print('Prepared Kerbside 0.7.18: fresh GPS route continuity with fail-closed branch and movement guards')
