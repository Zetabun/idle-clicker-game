#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

OLD_VERSION = '0.7.21'
NEW_VERSION = '0.7.22'


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

# Expose the exact ordered call used by journeyGeometry. The persistent passed
# lock needs to distinguish "the call you have just passed" from a later repeat
# of the same stop on a circular/loop service.
replace_once(
    'bus.html',
    """  return {\n    remaining,\n    passed:remaining < -PATTERN_STOP_PASSED_TOLERANCE,\n    vehicleOffset:vehicle.metres,\n    stopOffset:target.metres,\n    total:vehicle.total,\n    pattern\n  };\n""",
    """  return {\n    remaining,\n    passed:remaining < -PATTERN_STOP_PASSED_TOLERANCE,\n    vehicleOffset:vehicle.metres,\n    stopOffset:target.metres,\n    total:vehicle.total,\n    pattern,\n    selectedIndex,\n    targetAlong:target.along,\n    vehicleAlong:vehicle.along\n  };\n""",
    'journey geometry ordered-call identity',
)

passed_helpers = r'''function clearPassedState(v){
  if(!v) return;
  delete v.passedSuspectAt;
  delete v.passedSuspectGpsTs;
  delete v.passedSuspectRemaining;
}
/* Once ordered journey geometry has confirmed that this vehicle has actually
   gone beyond the selected call, weak evidence on a later refresh must never
   resurrect it through MATCH RETAINED, destination-wording recovery or the
   confidence fallback. This lock belongs to one selected stop and one ongoing
   vehicle journey. It is deliberately temporary and is cleared by ingest when
   the vehicle starts a genuinely new journey/route. A circular route may also
   clear it when ordered geometry proves that a *later* call at this same stop
   is now the target. */
const PASSED_STOP_LOCK_MS = 30*60*1000;
const PASSED_STOP_LOCK_FIELDS = [
  'passedStopLockStopId','passedStopLockAt','passedStopLockGpsTs',
  'passedStopLockLine','passedStopLockOwner','passedStopLockPattern',
  'passedStopLockTargetAlong','passedStopLockSelectedIndex'
];
function clearPassedStopLock(v){
  if(!v) return;
  for(const field of PASSED_STOP_LOCK_FIELDS) delete v[field];
}
function rememberPassedStopLock(v,geometry,now=Date.now()){
  if(!v||!S.stop||!geometry) return false;
  const targetAlong=Number(geometry.targetAlong);
  v.passedStopLockStopId=String(S.stop.id);
  v.passedStopLockAt=now;
  v.passedStopLockGpsTs=Number(v.ts)||0;
  v.passedStopLockLine=String(v.line||'');
  v.passedStopLockOwner=String(v.owner||v.operator||'');
  v.passedStopLockPattern=String(geometry.pattern&&geometry.pattern.id||'');
  v.passedStopLockTargetAlong=Number.isFinite(targetAlong)?targetAlong:null;
  v.passedStopLockSelectedIndex=Number.isFinite(Number(geometry.selectedIndex))?Number(geometry.selectedIndex):-1;
  return true;
}
function passedStopLockApplies(v,geometry,now=Date.now()){
  if(!v||!S.stop||!v.passedStopLockStopId) return false;
  if(v.passedStopLockStopId!==String(S.stop.id)){
    clearPassedStopLock(v);
    return false;
  }
  const lockedAt=Number(v.passedStopLockAt)||0;
  if(!lockedAt||now-lockedAt>PASSED_STOP_LOCK_MS){
    clearPassedStopLock(v);
    return false;
  }
  if(String(v.passedStopLockLine||'')!==String(v.line||'')
      ||String(v.passedStopLockOwner||'')!==String(v.owner||v.operator||'')){
    clearPassedStopLock(v);
    return false;
  }
  /* A repeated call at the same stop on a loop is a real new target even when
     the trip id is unchanged. Only ordered geometry can release this case: the
     same pattern must now point to a later stop occurrence/along-distance. */
  if(geometry&&!geometry.passed){
    const lockedPattern=String(v.passedStopLockPattern||'');
    const currentPattern=String(geometry.pattern&&geometry.pattern.id||'');
    const lockedAlong=Number(v.passedStopLockTargetAlong), currentAlong=Number(geometry.targetAlong);
    const lockedIndex=Number(v.passedStopLockSelectedIndex), currentIndex=Number(geometry.selectedIndex);
    const laterIndex=Number.isFinite(lockedIndex)&&Number.isFinite(currentIndex)&&currentIndex>lockedIndex;
    const laterAlong=Number.isFinite(lockedAlong)&&Number.isFinite(currentAlong)
      &&currentAlong>lockedAlong+PATTERN_STOP_PASSED_TOLERANCE;
    if(lockedPattern&&currentPattern===lockedPattern&&(laterIndex||laterAlong)){
      clearPassedStopLock(v);
      return false;
    }
  }
  return true;
}
'''
replace_once(
    'bus.html',
    """function clearPassedState(v){\n  if(!v) return;\n  delete v.passedSuspectAt;\n  delete v.passedSuspectGpsTs;\n  delete v.passedSuspectRemaining;\n}\n""",
    passed_helpers,
    'persistent passed-stop helpers',
)

# A true journey, operator/route, or physical-track change is a new working and
# must release the old stop lock. Temporary route/headsign evidence loss does
# not enter this reset path, which is exactly what was resurrecting passed buses.
replace_once(
    'bus.html',
    "delete rec.inferredJourney;delete rec.inferredTrip;delete rec.inferredPattern;delete rec.inferredAt;delete rec.inferenceStopId;delete rec.inferenceGpsTs;clearRouteContinuity(rec);",
    "delete rec.inferredJourney;delete rec.inferredTrip;delete rec.inferredPattern;delete rec.inferredAt;delete rec.inferenceStopId;delete rec.inferenceGpsTs;clearRouteContinuity(rec);clearPassedStopLock(rec);",
    'release passed lock on genuine journey/route change',
)

# Make confirmed passed geometry dominant over every recovery path. The first
# passed observation still gets the existing confirmation grace; after a second
# progressing fix / measured retreat / grace expiry confirms it, persist the
# lock before rejecting. Subsequent refreshes reject immediately even if route
# evidence later becomes weak or disappears.
replace_once(
    'bus.html',
    """    setVehicleProgressIdentity(v,evidence,inference,matchedRow);\n    const geometry=journeyGeometry(v,S.stop);\n    if(geometry && geometry.passed){\n      const confirmed=confirmPassedState(v,geometry,now);\n      if(!confirmed && holdLive(out,v,diagnostics,'passed',now)) continue;\n      clearPassedState(v);\n      rejectLive(diagnostics,'passed',v); continue;\n    }\n    clearPassedState(v);\n""",
    """    setVehicleProgressIdentity(v,evidence,inference,matchedRow);\n    const geometry=journeyGeometry(v,S.stop);\n    if(passedStopLockApplies(v,geometry,now)){\n      clearPassedState(v);\n      rejectLive(diagnostics,'passed',v); continue;\n    }\n    if(geometry && geometry.passed){\n      const confirmed=confirmPassedState(v,geometry,now);\n      if(!confirmed && holdLive(out,v,diagnostics,'passed',now)) continue;\n      rememberPassedStopLock(v,geometry,now);\n      clearPassedState(v);\n      rejectLive(diagnostics,'passed',v); continue;\n    }\n    clearPassedState(v);\n""",
    'hard passed lock before recovery gates',
)

# Regression guards: the release must preserve the two-stage passed
# confirmation, persist the confirmed lock, check it before the range/route /
# confidence recovery gates, and release it on a real journey change.
regression_anchor = "  assert.ok(busSource.includes(\"const continuityBacked=!!evidence.routeContinuity;\"));\n"
regression_checks = """  assert.ok(busSource.includes(\"const continuityBacked=!!evidence.routeContinuity;\"));\n  assert.ok(busSource.includes(\"const PASSED_STOP_LOCK_MS = 30*60*1000;\"));\n  assert.ok(busSource.includes(\"function passedStopLockApplies(v,geometry,now=Date.now())\"));\n  assert.ok(busSource.includes(\"if(passedStopLockApplies(v,geometry,now)){\"));\n  assert.ok(busSource.includes(\"rememberPassedStopLock(v,geometry,now);\"));\n  assert.ok(busSource.includes(\"clearRouteContinuity(rec);clearPassedStopLock(rec);\"));\n  assert.ok(busSource.indexOf(\"if(passedStopLockApplies(v,geometry,now)){\") < busSource.indexOf(\"if(d>range){\"));\n  assert.ok(busSource.includes(\"targetAlong:target.along\"));\n  assert.ok(busSource.includes(\"selectedIndex,\"));\n"""
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    regression_anchor,
    regression_checks,
    'passed-stop lock regression guards',
)

subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
print('Prepared Kerbside 0.7.22: confirmed passed stops cannot be resurrected by recovery paths')
