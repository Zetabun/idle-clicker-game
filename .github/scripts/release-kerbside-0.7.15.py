from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD_VERSION = "0.7.14"
NEW_VERSION = "0.7.15"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def bump_versions() -> None:
    version_path = ROOT / "VERSION"
    current = version_path.read_text(encoding="utf-8").strip()
    if current != OLD_VERSION:
        raise RuntimeError(f"VERSION: expected {OLD_VERSION}, found {current!r}")
    version_path.write_text(NEW_VERSION + "\n", encoding="utf-8")

    for rel in (
        "bus.html",
        "kerbside-backend/package.json",
        "kerbside-backend/src/worker.js",
        "kerbside-backend/test/worker.test.js",
        "kerbside-backend/tests/browser-regression.mjs",
    ):
        path = ROOT / rel
        text = path.read_text(encoding="utf-8")
        if OLD_VERSION not in text:
            raise RuntimeError(f"{rel}: {OLD_VERSION} was not found")
        path.write_text(text.replace(OLD_VERSION, NEW_VERSION), encoding="utf-8")


def patch_bus() -> None:
    path = ROOT / "bus.html"
    source = path.read_text(encoding="utf-8")

    old_hold = """   These reasons are momentary, so a bus confidently shown seconds ago is
   held on its existing countdown instead of deleted. 'passed' and
   'destination' stay hard drops: the first is a genuine end of journey,
   the second means the user changed the filter.
   ------------------------------------------------------------ */
const HOLDABLE_REJECTIONS = new Set(['range','route','direction','away','confidence']);
/* The hold above exists for momentary weakness — a bearing wobble at a
   junction, a shard still loading. Consecutive GPS fixes measurably retreating
   from the stop are not momentary, and holding on that evidence kept a bus
   counting down on the board after it had turned away. Bearing alone is not
   enough to refuse the hold; this is the measured movement trend only. */
function movementRetreating(v){ return S.stop ? movementTrend(v,S.stop)<0 : false; }
"""

    new_hold = """   These reasons are momentary, so a bus confidently shown seconds ago is
   held on its existing countdown instead of deleted. A first 'passed' result is
   also momentary: pattern identity can settle between renders, so a bus already
   verified on the board is retained until a later fresh GPS fix confirms that
   it has continued beyond the exact selected stop. 'destination' remains a hard
   drop because it means the user changed the filter.
   ------------------------------------------------------------ */
const HOLDABLE_REJECTIONS = new Set(['range','route','direction','away','confidence','passed']);
/* The hold above exists for momentary weakness — a bearing wobble at a
   junction, a shard still loading. Consecutive GPS fixes measurably retreating
   from the stop are not momentary, and holding on that evidence kept a bus
   counting down on the board after it had turned away. Bearing alone is not
   enough to refuse the hold; this is the measured movement trend only. */
function movementRetreating(v){ return S.stop ? movementTrend(v,S.stop)<0 : false; }
const PASSED_CONFIRM_GRACE_MS = 45*1000;
const PASSED_CONFIRM_PROGRESS_METRES = 12;
function clearPassedState(v){
  if(!v) return;
  delete v.passedSuspectAt;
  delete v.passedSuspectGpsTs;
  delete v.passedSuspectRemaining;
}
function confirmPassedState(v,geometry,now=Date.now()){
  if(!v||!geometry) return true;
  const gpsTs=Number(v.ts), remaining=Number(geometry.remaining);
  if(!Number.isFinite(gpsTs)||!Number.isFinite(remaining)) return true;
  const started=Number(v.passedSuspectAt), previousTs=Number(v.passedSuspectGpsTs);
  const previousRemaining=Number(v.passedSuspectRemaining);
  if(!Number.isFinite(started)||!Number.isFinite(previousTs)||gpsTs<previousTs){
    v.passedSuspectAt=now;
    v.passedSuspectGpsTs=gpsTs;
    v.passedSuspectRemaining=remaining;
    return false;
  }
  if(gpsTs===previousTs) return false;
  const advancedPast=Number.isFinite(previousRemaining)
    && remaining<=previousRemaining-PASSED_CONFIRM_PROGRESS_METRES;
  const movingAway=movementRetreating(v);
  const aged=now-started>=PASSED_CONFIRM_GRACE_MS;
  v.passedSuspectGpsTs=gpsTs;
  v.passedSuspectRemaining=remaining;
  return movingAway||advancedPast||aged;
}
"""
    source = replace_once(source, old_hold, new_hold, "passed-state hold block")

    old_passed = """    const geometry=journeyGeometry(v,S.stop);
    if(geometry && geometry.passed){ rejectLive(diagnostics,'passed',v); continue; }
    const corridorFar=!!(v.corridorTracked&&geometry&&geometry.remaining>80&&geometry.remaining<=ROUTE_SCAN_MAX_ROUTE_METRES&&evidence.journeyMatch&&evidence.pathMatch);
"""
    new_passed = """    const geometry=journeyGeometry(v,S.stop);
    if(geometry && geometry.passed){
      const confirmed=confirmPassedState(v,geometry,now);
      if(!confirmed && holdLive(out,v,diagnostics,'passed',now)) continue;
      clearPassedState(v);
      rejectLive(diagnostics,'passed',v); continue;
    }
    clearPassedState(v);
    const corridorFar=!!(v.corridorTracked&&geometry&&geometry.remaining>80&&geometry.remaining<=ROUTE_SCAN_MAX_ROUTE_METRES&&evidence.journeyMatch&&evidence.pathMatch);
"""
    source = replace_once(source, old_passed, new_passed, "collect passed hard-drop")

    path.write_text(source, encoding="utf-8")


def add_regression_test() -> None:
    test_path = ROOT / "kerbside-backend/test/passed-confirmation.test.js"
    if test_path.exists():
        raise RuntimeError(f"{test_path.relative_to(ROOT)} already exists")
    test_path.write_text(
        """import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(here, '..', '..', 'bus.html'), 'utf8');

test('a single passed projection cannot instantly remove a previously verified bus', () => {
  assert.match(source, /HOLDABLE_REJECTIONS = new Set\\(\\[[^\\]]*'passed'/,
    'passed must participate in the verified-row retention path');
  assert.match(source, /function confirmPassedState\\(v,geometry,now=Date\\.now\\(\\)\\)/,
    'passed state must be confirmed across GPS observations');
  assert.match(source, /if\\(gpsTs===previousTs\\) return false;/,
    're-rendering one GPS fix must not count as confirmation');
  assert.match(source, /remaining<=previousRemaining-PASSED_CONFIRM_PROGRESS_METRES/,
    'a later fix may confirm that the bus advanced farther beyond the stop');
  assert.match(source, /const movingAway=movementRetreating\\(v\\);/,
    'measured movement away from the selected stop may confirm the pass');
  assert.match(source, /if\\(!confirmed && holdLive\\(out,v,diagnostics,'passed',now\\)\\) continue;/,
    'the first suspected pass must retain the previous verified listing');
  assert.doesNotMatch(source,
    /if\\(geometry && geometry\\.passed\\)\\{ rejectLive\\(diagnostics,'passed',v\\); continue; \\}/,
    'the old one-frame hard drop must not return');
});
""",
        encoding="utf-8",
    )


def main() -> None:
    bump_versions()
    patch_bus()
    add_regression_test()
    print(f"Prepared Kerbside {NEW_VERSION}: confirmed passed-state retention and regression coverage")


if __name__ == "__main__":
    main()
