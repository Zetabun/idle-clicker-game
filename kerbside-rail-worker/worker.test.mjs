import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUpstreamUrl,
  parseServicePath,
  rdmServiceId,
  validServiceDetailPayload,
  normaliseBoardMessages,
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

test('normalises nested RDM disruption messages into displayable text', () => {
  const board = normaliseBoardMessages({
    ...BOARD,
    nrccMessages: [
      { value: { value: '<p>Major disruption between Birmingham and Bristol.</p>' } },
      { message: { '#text': 'Platform alterations may apply.' } },
      { value: 'Legacy plain-text notice.' },
      { value: {} }
    ]
  });
  assert.deepEqual(board.nrccMessages, [
    { value: '<p>Major disruption between Birmingham and Bristol.</p>' },
    { value: 'Platform alterations may apply.' },
    { value: 'Legacy plain-text notice.' }
  ]);
  assert.doesNotMatch(JSON.stringify(board.nrccMessages), /\[object Object\]/);
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

test('official board response flattens nested RDM travel updates for the app', async () => {
  const upstreamBoard = {
    ...BOARD,
    nrccMessages: [
      { value: { text: '<strong>Service disruption</strong> near Birmingham.' } },
      { message: { value: 'Check platform screens before boarding.' } }
    ]
  };
  const runtime = installRuntime(async () => new Response(JSON.stringify(upstreamBoard), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }));
  try {
    const response = await routeRequest(
      new Request('https://example.test/departures/BHM/9?expand=true'),
      { RDM_LDB_API_KEY: API_KEY }
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.nrccMessages, [
      { value: '<strong>Service disruption</strong> near Birmingham.' },
      { value: 'Check platform screens before boarding.' }
    ]);
    assert.doesNotMatch(JSON.stringify(body.nrccMessages), /\[object Object\]/);
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

test('coalesced concurrent boards each receive a readable body', async () => {
  const runtime = installRuntime(async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    return new Response(JSON.stringify(BOARD), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  try {
    const request = () => new Request('https://example.test/departures/BHM/9', {
      headers: { 'CF-Connecting-IP': '203.0.113.7' }
    });
    const [first, second] = await Promise.all([
      routeRequest(request(), { RDM_LDB_API_KEY: API_KEY }),
      routeRequest(request(), { RDM_LDB_API_KEY: API_KEY })
    ]);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    // Both awaiters used to share one Response, so the second consumed an
    // already-disturbed body stream and fell through to the 500 handler.
    assert.deepEqual(JSON.parse(await first.text()), BOARD);
    assert.deepEqual(JSON.parse(await second.text()), BOARD);
    assert.equal(runtime.state.calls.length, 1);
  } finally {
    runtime.restore();
  }
});

test('a malformed percent escape is a missing route, not a Worker fault', async () => {
  assert.equal(parseBoardPath('/departures/%'), null);
  assert.equal(parseBoardPath('/departures/BHM/%E0%A4%A/9'), null);
  const runtime = installRuntime(async () => new Response('{}', { status: 200 }));
  try {
    const response = await routeRequest(new Request('https://example.test/departures/%'), { RDM_LDB_API_KEY: API_KEY });
    assert.equal(response.status, 404);
    assert.equal(runtime.state.calls.length, 0);
  } finally {
    runtime.restore();
  }
});

test('the header-less origin path can be closed without changing the default', async () => {
  const runtime = installRuntime(async () => new Response(JSON.stringify(BOARD), { status: 200 }));
  try {
    const bare = () => new Request('https://example.test/departures/BHM/9', {
      headers: { 'CF-Connecting-IP': '203.0.113.9' }
    });
    assert.equal((await routeRequest(bare(), { RDM_LDB_API_KEY: API_KEY })).status, 200);
    const strict = await routeRequest(bare(), { RDM_LDB_API_KEY: API_KEY, REQUIRE_ORIGIN: '1' });
    assert.equal(strict.status, 403);
  } finally {
    runtime.restore();
  }
});

test('parses Darwin service-detail routes and refuses anything else', () => {
  assert.deepEqual(parseServicePath('/service/abc123+/='), { serviceId: 'abc123+/=' });
  assert.deepEqual(parseServicePath('/service/T1yq-8xUS0mMnFcNK5UHTQ'), { serviceId: 'T1yq-8xUS0mMnFcNK5UHTQ' });
  assert.equal(parseServicePath('/service/'), null);
  assert.equal(parseServicePath('/service'), null);
  assert.equal(parseServicePath('/service/../health'), null);
  assert.equal(parseServicePath('/service/has space'), null);
  assert.equal(parseServicePath('/service/%'), null);
  assert.equal(parseServicePath(`/service/${'a'.repeat(200)}`), null);
});

test('translates a Huxley URL-safe service id back to the alphabet RDM expects', () => {
  assert.equal(rdmServiceId('T1yq-8xUS0mMnFcNK5UHTQ_='), 'T1yq+8xUS0mMnFcNK5UHTQ/=');
  // A Darwin id never contains - or _, so this must leave it untouched.
  assert.equal(rdmServiceId('abc123+/='), 'abc123+/=');
});

test('accepts a service-detail envelope even when one calling-point list is absent', () => {
  assert.equal(validServiceDetailPayload({ generatedAt: 'x', subsequentCallingPoints: [] }), true);
  assert.equal(validServiceDetailPayload({ crs: 'BHM' }), true);
  assert.equal(validServiceDetailPayload({ previousCallingPoints: [] }), true);
  assert.equal(validServiceDetailPayload([]), false);
  assert.equal(validServiceDetailPayload(null), false);
  assert.equal(validServiceDetailPayload({ nope: 1 }), false);
});

test('service details reach GetServiceDetails and carry previous calling points back', async () => {
  const detail = {
    generatedAt: '2026-08-18T18:00:00+01:00',
    locationName: 'Milton Keynes Central',
    crs: 'MKC',
    previousCallingPoints: [{ callingPoint: [{ locationName: 'London Euston', crs: 'EUS', st: '17:26', at: '17:27' }] }],
    subsequentCallingPoints: [{ callingPoint: [{ locationName: 'Birmingham New Street', crs: 'BHM', st: '19:44' }] }]
  };
  const runtime = installRuntime(async () => new Response(JSON.stringify(detail), { status: 200 }));
  try {
    const response = await routeRequest(
      new Request('https://example.test/service/T1yq-8xUS0mMnFcNK5UHTQ', { headers: { 'CF-Connecting-IP': '203.0.113.21' } }),
      { RDM_LDB_API_KEY: API_KEY }
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-Kerbside-Rail-Source'), 'rdm-ldb-service');
    const body = JSON.parse(await response.text());
    assert.equal(body.previousCallingPoints[0].callingPoint[0].crs, 'EUS');
    const called = runtime.state.calls[0].url;
    assert.match(called, /\/GetServiceDetails\//);
    // The URL-safe id must have been translated before it left the Worker.
    assert.match(decodeURIComponent(called), /T1yq\+8xUS0mMnFcNK5UHTQ/);
    assert.doesNotMatch(await Promise.resolve(JSON.stringify(runtime.state.calls[0].init || {})), new RegExp(API_KEY));
  } finally {
    runtime.restore();
  }
});

test('a failing service-detail upstream fails closed without leaking the key', async () => {
  const runtime = installRuntime(async () => new Response('nope', { status: 500 }));
  try {
    const response = await routeRequest(
      new Request('https://example.test/service/abc123', { headers: { 'CF-Connecting-IP': '203.0.113.22' } }),
      { RDM_LDB_API_KEY: API_KEY }
    );
    assert.equal(response.status, 502);
    const text = await response.text();
    assert.doesNotMatch(text, new RegExp(API_KEY));
  } finally {
    runtime.restore();
  }
});
