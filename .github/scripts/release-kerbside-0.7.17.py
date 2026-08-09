#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

OLD_VERSION = '0.7.16'
NEW_VERSION = '0.7.17'


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

retirable_old = """function retirableVehicleKey(v,batch){
  const physical=physicalVehicleKey(v);
  return physical&&!batch.shared.has(physical)?physical:'';
}
"""

retirable_new = retirable_old + """/* A SIRI producer can re-key the same physical bus when its journey/activity
   reference changes between otherwise consecutive GPS reports. The previous
   row was then deleted as superseded, but the replacement identity started with
   no last-known-good board snapshot or movement history. Any momentary route
   weakness on that replacement therefore made a verified bus blink off the
   board until a later poll rebuilt confidence.

   Carry continuity only when the physical vehicle key is unambiguous, the
   operator/line and live destination still describe the same working, the GPS
   jump is plausible for the elapsed time, and the predecessor was actually
   shown at this exact stop recently. This deliberately does not copy journey,
   matched-trip, corridor or route-projection identity across a re-key. */
const VEHICLE_CONTINUITY_MAX_GAP_MS = 90*1000;
const VEHICLE_CONTINUITY_MAX_METRES = 2500;
function vehicleContinuityPredecessor(v,batch,now=Date.now()){
  if(!v||!batch||!v.id||!S.stop) return null;
  const physical=retirableVehicleKey(v,batch);
  if(!physical) return null;
  const nextTs=Number(v.ts),nextOwner=String(v.owner||v.operator||'');
  if(!Number.isFinite(nextTs)) return null;
  let best=null;
  for(const [otherId,other] of S.vehicles){
    if(otherId===v.id||batch.ids.has(otherId)) continue;
    if(physicalVehicleKey(other)!==physical) continue;
    if(String(other.line||'')!==String(v.line||'')) continue;
    if(String(other.owner||other.operator||'')!==nextOwner) continue;
    if(other.dest&&v.dest&&destinationSimilarity(other.dest,v.dest)<.6) continue;
    if(other.lastShownStopId!==String(S.stop.id)||!other.lastShownSnapshot) continue;
    if(now-Number(other.lastShownAt||0)>GPS_RESULT_HEALTHY_GRACE_MS) continue;
    const previousTs=Number(other.ts),gap=nextTs-previousTs;
    if(!Number.isFinite(previousTs)||gap<0||gap>VEHICLE_CONTINUITY_MAX_GAP_MS) continue;
    const metres=dist(Number(other.lat),Number(other.lon),Number(v.lat),Number(v.lon));
    const allowed=Math.min(VEHICLE_CONTINUITY_MAX_METRES,Math.max(120,gap/1000*35+100));
    if(!Number.isFinite(metres)||metres>allowed) continue;
    if(!best||previousTs>Number(best.ts)) best=other;
  }
  return best;
}
function vehicleContinuitySeed(previous){
  const seed={hist:[],speed:null,motionSpeed:null,cadence:null};
  if(!previous) return seed;
  seed.hist=(Array.isArray(previous.hist)?previous.hist:[]).slice(-7).map(point=>({...point}));
  for(const field of ['speed','motionSpeed','cadence','stationaryAt','lastShownStopId','lastShownAt','lastShownArrivalAt','lastShownBoardDir','lastShownDestFilter']){
    if(previous[field]!==undefined) seed[field]=previous[field];
  }
  if(previous.lastShownSnapshot) seed.lastShownSnapshot={...previous.lastShownSnapshot,v:null};
  return seed;
}
"""
replace_once('bus.html', retirable_old, retirable_new, 'vehicle continuity helpers')

ingest_old = """    const prev = S.vehicles.get(v.id);
    const rec = prev || {hist:[], speed:null, motionSpeed:null, cadence:null};
"""
ingest_new = """    const prev = S.vehicles.get(v.id);
    const continuity=prev?null:vehicleContinuityPredecessor(v,batch,now);
    const rec = prev || vehicleContinuitySeed(continuity);
"""
replace_once('bus.html', ingest_old, ingest_new, 'ingest continuity seed')

browser_version_old = "assert.match(busSource, /const APP_VERSION = '0\\.7\\.16'/);"
browser_version_new = "assert.match(busSource, /const APP_VERSION = '0\\.7\\.17'/);"
replace_once('kerbside-backend/tests/browser-regression.mjs', browser_version_old, browser_version_new, 'browser version assertion')

test_anchor = """  assert.equal(gpsFixes.corridor,true);assert.equal(gpsFixes.live,1);assert.equal(gpsFixes.progress,true);assert.equal(gpsFixes.held,true);assert.equal(gpsFixes.away,false);
"""

test_block = test_anchor + """

  // A producer can change the journey/activity key while the physical bus,
  // route and GPS track are continuous. The replacement identity must inherit
  // only display/movement continuity so a transient route gate cannot blink a
  // previously verified row off the board. A different live destination must
  // not inherit that snapshot across a genuine branch/journey handover.
  const identityContinuity = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={stop:state.stop,vehicles:state.vehicles,dir:state.dir,destFilter:state.destFilter};
    try{
      state.stop={id:'continuity-stop',timetableId:'continuity-stop',lat:52.5,lon:-2.1,name:'Continuity stop',d:0};
      state.dir='all';state.destFilter=null;state.vehicles=new Map();
      const base={line:'61',lineRef:'61',dest:'Moor St Queensway',owner:'CONTINUITY',operator:'CONTINUITY',vehicleRef:'BUS-17',vehicleUniqueId:'UNIQUE-17',lat:52.49,lon:-2.1,bearing:0,feedSpeed:8,timestampKnown:true,corridorTracked:false};
      const oldId='CONTINUITY|journey|old-trip|vehicle|BUS-17',nextId='CONTINUITY|journey|new-trip|vehicle|BUS-17';
      api.ingest([{...base,id:oldId,journey:'old-trip',ts:now-15000}]);
      const old=state.vehicles.get(oldId);
      old.hist=[{lat:52.488,lon:-2.1,ts:now-30000},{lat:52.49,lon:-2.1,ts:now-15000}];
      old.lastShownStopId='continuity-stop';old.lastShownAt=now-5000;old.lastShownArrivalAt=now+20*60000;old.lastShownBoardDir='all';old.lastShownDestFilter='';
      old.lastShownSnapshot={secs:1200,confidence:'low',schedule:null,matchedSchedule:null,v:null};
      api.ingest([{...base,id:nextId,journey:'new-trip',lat:52.491,ts:now}]);
      const next=state.vehicles.get(nextId),held=api.retainedSnapshotRow(next,now,false);
      const transferred=!!(next&&held&&next.lastShownSnapshot&&next.hist.length>=3&&!state.vehicles.has(oldId));

      state.vehicles=new Map();
      const oldBranchId='CONTINUITY|journey|old-branch|vehicle|BUS-18',newBranchId='CONTINUITY|journey|new-branch|vehicle|BUS-18';
      const branchBase={...base,vehicleRef:'BUS-18',vehicleUniqueId:'UNIQUE-18'};
      api.ingest([{...branchBase,id:oldBranchId,journey:'old-branch',dest:'Frankley Arden Road Terminus',ts:now-15000}]);
      const oldBranch=state.vehicles.get(oldBranchId);
      oldBranch.lastShownStopId='continuity-stop';oldBranch.lastShownAt=now-5000;oldBranch.lastShownArrivalAt=now+20*60000;oldBranch.lastShownBoardDir='all';oldBranch.lastShownDestFilter='';
      oldBranch.lastShownSnapshot={secs:1200,confidence:'low',schedule:null,matchedSchedule:null,v:null};
      api.ingest([{...branchBase,id:newBranchId,journey:'new-branch',dest:'Moor St Queensway',lat:52.491,ts:now}]);
      const newBranch=state.vehicles.get(newBranchId);
      return {
        transferred,
        heldVehicle:held&&held.v&&held.v.id,
        history:next&&next.hist.length,
        wrongBranchInherited:!!(newBranch&&newBranch.lastShownSnapshot)
      };
    }finally{Object.assign(state,saved);}
  });
  assert.equal(identityContinuity.transferred,true,JSON.stringify(identityContinuity));
  assert.equal(identityContinuity.heldVehicle,'CONTINUITY|journey|new-trip|vehicle|BUS-17',JSON.stringify(identityContinuity));
  assert.ok(identityContinuity.history>=3,JSON.stringify(identityContinuity));
  assert.equal(identityContinuity.wrongBranchInherited,false,JSON.stringify(identityContinuity));
"""
replace_once('kerbside-backend/tests/browser-regression.mjs', test_anchor, test_block, 'physical vehicle continuity regression')

subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
print(f'Prepared Kerbside {NEW_VERSION}: preserve verified display continuity across safe physical-vehicle rekeys.')
