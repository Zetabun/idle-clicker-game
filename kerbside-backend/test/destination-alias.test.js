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
});
