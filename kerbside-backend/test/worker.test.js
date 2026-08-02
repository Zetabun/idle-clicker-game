import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateRegions, normaliseBoundingBox, tileKey, tileKeysForRadius } from '../src/worker.js';

test('normalises a safe England bounding box', () => {
  assert.equal(normaliseBoundingBox('-2.20,52.40,-2.00,52.60'), '-2.20000,52.40000,-2.00000,52.60000');
  assert.equal(normaliseBoundingBox('-20,0,20,80'), '');
  assert.equal(normaliseBoundingBox('-2,52,-3,53'), '');
});

test('tile keys are stable and radius search includes centre', () => {
  const centre = tileKey(52.5089, -2.0870);
  assert.match(centre, /^\d+-\d+$/);
  assert.ok(tileKeysForRadius(52.5089, -2.0870, 1500).includes(centre));
});

test('West Midlands coordinates select the expected regional feed', () => {
  assert.ok(candidateRegions(52.5089, -2.0870).includes('west_midlands'));
});
