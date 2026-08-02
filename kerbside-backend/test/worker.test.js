import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BBOX_SPAN, normaliseBoundingBox, routeRequest } from '../src/worker.js';

test('normalises a safe England bounding box', () => {
  assert.equal(normaliseBoundingBox('-2.20,52.40,-2.00,52.60'), '-2.20000,52.40000,-2.00000,52.60000');
  assert.equal(normaliseBoundingBox('-20,0,20,80'), '');
  assert.equal(normaliseBoundingBox('-2,52,-3,53'), '');
});

test('rejects BODS boxes wider than the upstream 0.35 degree limit', () => {
  assert.equal(MAX_BBOX_SPAN, 0.35);
  assert.equal(normaliseBoundingBox('-2.20,52.40,-1.84,52.60'), '');
  assert.equal(normaliseBoundingBox('-2.20,52.40,-1.85,52.75'), '-2.20000,52.40000,-1.85000,52.75000');
});

test('health describes a live-only Worker', async () => {
  const response = await routeRequest(new Request('https://example.test/health'), { BODS_KEY: 'present' });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.role, 'live-only');
  assert.equal(body.version, '0.6.0');
  assert.equal(body.bods, true);
});
