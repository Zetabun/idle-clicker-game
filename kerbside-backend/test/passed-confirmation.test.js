import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(here, '..', '..', 'bus.html'), 'utf8');

test('a single passed projection cannot instantly remove a previously verified bus', () => {
  assert.match(source, /HOLDABLE_REJECTIONS = new Set\(\[[^\]]*'passed'/,
    'passed must participate in the verified-row retention path');
  assert.match(source, /function confirmPassedState\(v,geometry,now=Date\.now\(\)\)/,
    'passed state must be confirmed across GPS observations');
  assert.match(source, /if\(gpsTs===previousTs\) return false;/,
    're-rendering one GPS fix must not count as confirmation');
  assert.match(source, /remaining<=previousRemaining-PASSED_CONFIRM_PROGRESS_METRES/,
    'a later fix may confirm that the bus advanced farther beyond the stop');
  assert.match(source, /const movingAway=movementRetreating\(v\);/,
    'measured movement away from the selected stop may confirm the pass');
  assert.match(source, /if\(!confirmed && holdLive\(out,v,diagnostics,'passed',now\)\) continue;/,
    'the first suspected pass must retain the previous verified listing');
  assert.doesNotMatch(source,
    /if\(geometry && geometry\.passed\)\{ rejectLive\(diagnostics,'passed',v\); continue; \}/,
    'the old one-frame hard drop must not return');
});
