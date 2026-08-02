import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BBOX_SPAN, normaliseBoundingBox, routeRequest } from '../src/worker.js';

const BBOX = '-2.20,52.40,-2.00,52.60';
const LIVE_URL = `https://example.test/feed?bbox=${encodeURIComponent(BBOX)}&lineRef=9`;

function cachedResponse(body, ageMs) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'X-Kerbside-Cached-At': String(Date.now() - ageMs)
    }
  });
}

function installRuntime(cached, upstream) {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  let current = cached ? cached.clone() : null;
  const state = { fetches: 0, matches: [], puts: [] };

  globalThis.caches = {
    default: {
      async match(key) {
        state.matches.push(key.url);
        return current ? current.clone() : undefined;
      },
      async put(key, response) {
        state.puts.push(key.url);
        current = response.clone();
      }
    }
  };
  globalThis.fetch = async (...args) => {
    state.fetches++;
    return upstream(...args);
  };

  return {
    state,
    restore() {
      globalThis.fetch = originalFetch;
      if (originalCaches === undefined) delete globalThis.caches;
      else globalThis.caches = originalCaches;
    }
  };
}

test('normalises a safe England bounding box', () => {
  assert.equal(normaliseBoundingBox(BBOX), '-2.20000,52.40000,-2.00000,52.60000');
  assert.equal(normaliseBoundingBox('-20,0,20,80'), '');
  assert.equal(normaliseBoundingBox('-2,52,-3,53'), '');
});

test('rejects BODS boxes wider than the upstream 0.35 degree limit', () => {
  assert.equal(MAX_BBOX_SPAN, 0.35);
  assert.equal(normaliseBoundingBox('-2.20,52.40,-1.84,52.60'), '');
  assert.equal(normaliseBoundingBox('-2.20,52.40,-1.85,52.75'), '-2.20000,52.40000,-1.85000,52.75000');
});

test('health describes the bounded cache-first Worker', async () => {
  const response = await routeRequest(new Request('https://example.test/health'), { BODS_KEY: 'present' });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.role, 'live-only');
  assert.equal(body.version, '0.6.26');
  assert.equal(body.bods, true);
  assert.equal(body.upstreamTimeoutMs, 4000);
  assert.equal(body.upstreamAttempts, 2);
});

test('serves a very recent cache hit without contacting BODS', async () => {
  const runtime = installRuntime(cachedResponse('<cached/>', 1000), async () => {
    throw new Error('upstream should not be called');
  });
  try {
    const response = await routeRequest(new Request(LIVE_URL), { BODS_KEY: 'present' });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '<cached/>');
    assert.equal(response.headers.get('X-Kerbside-Cache'), 'fresh');
    assert.equal(response.headers.get('X-Kerbside-Stale'), null);
    assert.equal(runtime.state.fetches, 0);
    assert.match(runtime.state.matches[0], /lineRef=9/);
  } finally {
    runtime.restore();
  }
});

test('returns an older cache promptly and refreshes it in waitUntil', async () => {
  const runtime = installRuntime(cachedResponse('<cached/>', 30000), async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    return new Response('<fresh/>', { status: 200, headers: { 'Content-Type': 'application/xml' } });
  });
  const waits = [];
  try {
    const response = await routeRequest(
      new Request(LIVE_URL),
      { BODS_KEY: 'present', LIVE_CACHE_WAIT_MS: '1' },
      { waitUntil(promise) { waits.push(promise); } }
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '<cached/>');
    assert.equal(response.headers.get('X-Kerbside-Cache'), 'stale');
    assert.equal(response.headers.get('X-Kerbside-Stale'), '1');
    assert.equal(waits.length, 1);
    await waits[0];
    assert.equal(runtime.state.fetches, 1);
    assert.equal(runtime.state.puts.length, 1);
    assert.match(runtime.state.puts[0], /lineRef=9/);
  } finally {
    runtime.restore();
  }
});

test('limits an uncached outage to two upstream attempts', async () => {
  const runtime = installRuntime(null, async () => {
    throw new Error('BODS unavailable');
  });
  try {
    const response = await routeRequest(new Request(LIVE_URL), { BODS_KEY: 'present' });
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.retryable, true);
    assert.equal(runtime.state.fetches, 2);
  } finally {
    runtime.restore();
  }
});
