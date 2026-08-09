import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(here, '..', '..', 'bus.html'), 'utf8');

test('ordered GPS route inference is not rejected by destination wording alone', () => {
  assert.doesNotMatch(
    source,
    /if\(v\.dest&&row\.head&&similarity<\.34\) return null;/,
    'a low text-similarity destination must not be an unconditional pre-geometry rejection'
  );
  assert.match(
    source,
    /const destinationConflict=!!\(v\.dest&&row\.head&&similarity<\.34\);/,
    'destination disagreement should remain explicit evidence rather than disappearing'
  );
  assert.match(
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
