import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUpstreamUrl,
  parseBoardPath,
  resetWorkerStateForTests,
  routeRequest,
  validBoardPayload
} from './worker.js';

const API_KEY = 'test-consumer-key';
const BOARD = {
  generatedAt: '2026-08-11T18:30:00+01:00',
  locationName: 'Birmingham New Street',
  crs: 'BHM',
  trainServices: []
};

function installRuntime(upstream) {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const cache = new Map();
  const state = { calls: [], puts: 0 };
  globalThis.caches = {
    default: {
      async match(key) {
        const value = cache.get(key.url);
        return value ? value.clone() : undefined;
      },
      async put(key, response) {
        state.puts++;
        cache.set(key.url, response.clone());
      }
    }
  };
  globalThis.fetch = async (url, init = {}) => {
    state.calls.push({ url: String(url), init });
    return upstream(url, init);
  };
  return {
    state,
    restore() {
      globalThis.fetch = originalFetch;
      if (originalCaches === undefined) delete globalThis.caches;
      else globalThis.caches = originalCaches;
      resetWorkerStateForTests();
    }
  };
}

test('parses safe departure board routes', () => {
  assert.deepEqual(parseBoardPath('/departures/BHM/9'), { from: 'BHM', to: '', rows: 9 });
  assert.deepEqual(parseBoardPath('/departures/bhm/to/bri/20'), { from: 'BHM', to: 'BRI', rows: 20 });
  assert.equal(parseBoardPath('/departures/BHM/to/BHM/9'), null);
  assert.equal(parseBoardPath('/departures/BHM/999'), null);
});

test('maps Kerbside board parameters to the official LDB endpoint', () => {
  const incoming = new URL('https://example.test/departures/BHM/to/BRI/20?expand=true&timeOffset=53&timeWindow=120');
  const upstream = buildUpstreamUrl(incoming, { from: 'BHM', to: 'BRI', rows: 20 });
  assert.equal(upstream.origin, 'https://api1.raildata.org.uk');
  assert.match(upstream.pathname, /GetDepBoardWithDetails\/BHM$/);
  assert.equal(upstream.searchParams.get('numRows'), '9');
  assert.equal(upstream.searchParams.get('filterCrs'), 'BRI');
  assert.equal(upstream.searchParams.get('filterType'), 'to');
  assert.equal(upstream.searchParams.get('timeOffset'), '53');
  assert.equal(upstream.searchParams.get('timeWindow'), '120');
});

test('validates the minimum LDB board shape without inventing departures', () => {
  assert.equal(validBoardPayload(BOARD, 'BHM'), true);
  assert.equal(validBoardPayload({ ...BOARD, trainServices: null }, 'BHM'), true);
  assert.equal(validBoardPayload({ ...BOARD, crs: 'BRI' }, 'BHM'), false);
  assert.equal(validBoardPayload({ crs: 'BHM' }, 'BHM'), false);
});

test('health reports whether the Rail Data key is configured', async () => {
  const absent = await routeRequest(new Request('https://example.test/health'), {});
  assert.equal((await absent.json()).ldbConfigured, false);
  const configured = await routeRequest(new Request('https://example.test/health'), { RDM_LDB_API_KEY: API_KEY });
  const body = await configured.json();
  assert.equal(body.ldbConfigured, true);
  assert.equal(body.service, 'kerbside-rail');
});

test('official board request keeps the consumer key server-side', async () => {
  const runtime = installRuntime(async () => new Response(JSON.stringify(BOARD), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }));
  try {
    const request = new Request('https://example.test/departures/BHM/to/BRI/9?expand=true&timeOffset=10&timeWindow=120', {
      headers: { Origin: 'https://zetabun.github.io' }
    });
    const response = await routeRequest(request, { RDM_LDB_API_KEY: API_KEY });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-Kerbside-Rail-Source'), 'rdm-ldb');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://zetabun.github.io');
    assert.equal((await response.json()).crs, 'BHM');
    assert.equal(runtime.state.calls.length, 1);
    const call = runtime.state.calls[0];
    assert.match(call.url, /GetDepBoardWithDetails\/BHM/);
    assert.equal(new Headers(call.init.headers).get('x-apikey'), API_KEY);
    assert.doesNotMatch(call.url, new RegExp(API_KEY));
    assert.equal(response.headers.get('x-apikey'), null);
    assert.equal(runtime.state.puts, 1);
  } finally {
    runtime.restore();
  }
});

test('missing key is rejected before any upstream request', async () => {
  const runtime = installRuntime(async () => {
    throw new Error('upstream should not be called');
  });
  try {
    const response = await routeRequest(new Request('https://example.test/departures/BHM/9?expand=true'), {});
    assert.equal(response.status, 503);
    assert.equal(runtime.state.calls.length, 0);
  } finally {
    runtime.restore();
  }
});

test('upstream errors fail closed without leaking the key', async () => {
  const runtime = installRuntime(async () => new Response('{"error":"nope"}', { status: 503 }));
  try {
    const response = await routeRequest(new Request('https://example.test/departures/BHM/9?expand=true'), { RDM_LDB_API_KEY: API_KEY });
    assert.equal(response.status, 502);
    const text = await response.text();
    assert.doesNotMatch(text, new RegExp(API_KEY));
    assert.match(text, /temporarily unavailable/i);
  } finally {
    runtime.restore();
  }
});
