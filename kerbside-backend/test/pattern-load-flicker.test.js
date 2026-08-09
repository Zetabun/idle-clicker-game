import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(here, '..', '..', 'bus.html'), 'utf8');

test('authoritative national route geometry cannot substitute a nearby opposite stop', () => {
  assert.match(source, /function authoritativePatternStopRequired\(\)/);
  assert.match(source, /function exactSelectedPatternStopIndex\(stops,selectedStop,fromAlong,stopSequence\)/);
  assert.match(source, /selectedPatternStopIndexForEvidence\(ordered,stop,vehicle&&vehicle\.along\)/);
  const abstentions = source.match(/if\(authoritativePatternStopRequired\(\)&&selectedIndex<0\) (?:return null|continue);/g) || [];
  assert.ok(abstentions.length >= 3, 'journey geometry, movement inference and route scanning must all abstain without the exact national stop');
});

test('upstream route scan shares the destination-alias safety rule', () => {
  assert.match(source, /function routeScanBranchCompatible\(match,v\)/);
  assert.match(source, /return exactSelectedPatternStopIndex\(stops,S\.stop,undefined,match\.stopSequence\)>=0;/);
  const start = source.indexOf('function inferredRouteScanMatch(');
  const end = source.indexOf('function routeScanBranchCompatible(', start);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(source.slice(start, end), /if\(v\.dest&&match\.head&&similarity<\.34\) continue;/);
});
