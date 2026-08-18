import test from 'node:test';
import assert from 'node:assert/strict';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { MAX_BBOX_SPAN, compactGtfsRtFeed, gtfsRtBoundingBox, normaliseBoundingBox, resetWorkerStateForTests, routeRequest, validSiriPayload } from '../src/worker.js';

const BBOX = '-2.20,52.40,-2.00,52.60';
const LIVE_URL = `https://example.test/feed?bbox=${encodeURIComponent(BBOX)}&lineRef=9`;
const EMPTY_SIRI = '<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery/></ServiceDelivery></Siri>';
const FRESH_SIRI = EMPTY_SIRI.replace('/>', '><ResponseTimestamp>2026-08-02T20:00:00Z</ResponseTimestamp></VehicleMonitoringDelivery>');
const CACHED_SIRI = EMPTY_SIRI.replace('/>', '><ResponseTimestamp>2026-08-02T19:59:00Z</ResponseTimestamp></VehicleMonitoringDelivery>');
const bytes = value => new TextEncoder().encode(value).buffer;

function cachedResponse(body, ageMs) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'X-Kerbside-Cached-At': String(Date.now() - ageMs)
    }
  });
}

function cachedMatchedResponse(body, ageMs) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
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



test('translates Kerbside bbox order for the BODS matched GTFS-RT endpoint', () => {
  assert.equal(gtfsRtBoundingBox(BBOX), '52.40000,52.60000,-2.20000,-2.00000');
});

test('matched endpoint exposes compact GTFS trip identity without replacing SIRI', async () => {
  resetWorkerStateForTests();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const FeedMessage = GtfsRealtimeBindings.transit_realtime.FeedMessage;
  const encoded = FeedMessage.encode(FeedMessage.create({
    header: { gtfsRealtimeVersion: '2.0' },
    entity: [{
      id: 'entity-1',
      vehicle: {
        trip: { tripId: 'GTFS-TRIP-61', routeId: 'GTFS-ROUTE-61', startDate: '20260809', startTime: '21:30:00', directionId: 1 },
        position: { latitude: 52.5, longitude: -2.1, bearing: 90 },
        timestamp: nowSeconds,
        vehicle: { id: 'BUS-740' },
        currentStopSequence: 12,
        currentStatus: 2,
        stopId: '1800STOP'
      }
    }]
  })).finish();
  const runtime = installRuntime(null, async url => {
    assert.match(String(url), /\/api\/v1\/gtfsrtdatafeed\//);
    assert.match(decodeURIComponent(String(url)), /boundingBox=52\.40000,52\.60000,-2\.20000,-2\.00000/);
    return new Response(encoded, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
  });
  try {
    const response = await routeRequest(new Request(`https://example.test/matched?bbox=${encodeURIComponent(BBOX)}`), { BODS_KEY: 'present' });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.vehicles.length, 1);
    assert.deepEqual({
      entityId: body.vehicles[0].entityId,
      vehicleId: body.vehicles[0].vehicleId,
      tripId: body.vehicles[0].tripId,
      routeId: body.vehicles[0].routeId,
      startDate: body.vehicles[0].startDate,
      startTime: body.vehicles[0].startTime,
      directionId: body.vehicles[0].directionId,
      currentStopSequence: body.vehicles[0].currentStopSequence,
      currentStatus: body.vehicles[0].currentStatus,
      stopId: body.vehicles[0].stopId
    }, {
      entityId: 'entity-1', vehicleId: 'BUS-740', tripId: 'GTFS-TRIP-61', routeId: 'GTFS-ROUTE-61',
      startDate: '20260809', startTime: '21:30:00', directionId: '1', currentStopSequence: 12,
      currentStatus: '2', stopId: '1800STOP'
    });
    assert.equal(runtime.state.fetches, 1);
  } finally {
    runtime.restore();
    resetWorkerStateForTests();
  }
});

test('matched endpoint returns bounded stale identity immediately while refreshing', async () => {
  resetWorkerStateForTests();
  const FeedMessage = GtfsRealtimeBindings.transit_realtime.FeedMessage;
  const encoded = FeedMessage.encode(FeedMessage.create({
    header: { gtfsRealtimeVersion: '2.0' }, entity: []
  })).finish();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const runtime = installRuntime(cachedMatchedResponse({ vehicles: [{
    entityId: 'cached-entity', vehicleId: 'BUS-CACHED', tripId: 'CACHED-TRIP',
    routeId: 'R-CACHED', lat: 52.5, lon: -2.1, timestamp: Date.now()
  }] }, 30000), async () => {
    await gate;
    return new Response(encoded, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
  });
  const waits = [];
  try {
    const pending = routeRequest(
      new Request(`https://example.test/matched?bbox=${encodeURIComponent(BBOX)}`),
      { BODS_KEY: 'present' },
      { waitUntil(promise) { waits.push(promise); } }
    );
    const response = await Promise.race([
      pending,
      new Promise(resolve => setTimeout(() => resolve('timed-out'), 250))
    ]);
    assert.notEqual(response, 'timed-out', 'bounded cached identity waited for the upstream refresh');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-Kerbside-Cache'), 'stale');
    assert.equal((await response.json()).vehicles[0].tripId, 'CACHED-TRIP');
    assert.equal(waits.length, 1);
    release();
    await waits[0];
    assert.equal(runtime.state.fetches, 1);
    assert.equal(runtime.state.puts.length, 1);
  } finally {
    release();
    runtime.restore();
    resetWorkerStateForTests();
  }
});

test('compact matched feed refuses stale identities', () => {
  const staleSeconds = Math.floor((Date.now() - 6 * 60 * 1000) / 1000);
  const feed = { entity: [{ vehicle: {
    trip: { tripId: 'OLD', routeId: 'R' },
    position: { latitude: 52.5, longitude: -2.1 },
    timestamp: staleSeconds,
    vehicle: { id: 'BUS-OLD' }
  } }] };
  assert.deepEqual(compactGtfsRtFeed(feed, BBOX), []);
});
test('accepts only SIRI vehicle-monitoring payloads', () => {
  assert.equal(validSiriPayload(bytes(EMPTY_SIRI), 'application/xml'), true);
  assert.equal(validSiriPayload(bytes('<s:Siri xmlns:s="urn:siri"><s:ServiceDelivery><s:VehicleMonitoringDelivery/></s:ServiceDelivery></s:Siri>'), 'text/xml'), true);
  assert.equal(validSiriPayload(bytes('<html><body>temporary error</body></html>'), 'text/html'), false);
  assert.equal(validSiriPayload(bytes('{"error":"temporary"}'), 'application/json'), false);
  assert.equal(validSiriPayload(bytes('<Siri><ServiceDelivery><ErrorCondition/></ServiceDelivery></Siri>'), 'application/xml'), false);
});

test('health describes the bounded cache-first Worker', async () => {
  const response = await routeRequest(new Request('https://example.test/health'), { BODS_KEY: 'present' });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.role, 'live-only');
  assert.equal(body.version, '0.9.47');
  assert.equal(body.bods, true);
  assert.equal(body.upstreamTimeoutMs, 4000);
  assert.equal(body.upstreamAttempts, 2);
  assert.equal(body.rateLimitPerMinute, 60);
});

 test('rejects an unapproved browser origin before cache or BODS work', async () => {
  resetWorkerStateForTests();
  const response = await routeRequest(new Request(LIVE_URL, {
    headers: { Origin: 'https://unapproved.example', 'CF-Connecting-IP': '203.0.113.10' }
  }), { BODS_KEY: 'present' });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

 test('applies a conservative per-IP live-feed request limit', async () => {
  resetWorkerStateForTests();
  const runtime = installRuntime(cachedResponse(CACHED_SIRI, 1000), async () => {
    throw new Error('upstream should not be called');
  });
  try {
    const request = () => new Request(LIVE_URL, { headers: { 'CF-Connecting-IP': '203.0.113.11' } });
    const env = { BODS_KEY: 'present', RATE_LIMIT_PER_MINUTE: '2' };
    assert.equal((await routeRequest(request(), env)).status, 200);
    assert.equal((await routeRequest(request(), env)).status, 200);
    const blocked = await routeRequest(request(), env);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('X-RateLimit-Limit'), '2');
    assert.equal(blocked.headers.get('X-RateLimit-Remaining'), '0');
    assert.ok(Number(blocked.headers.get('Retry-After')) >= 1);
  } finally {
    runtime.restore();
    resetWorkerStateForTests();
  }
});

 test('coalesces simultaneous identical cache misses into one BODS request', async () => {
  resetWorkerStateForTests();
  const runtime = installRuntime(null, async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    return new Response(FRESH_SIRI, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  });
  try {
    const request = () => new Request(LIVE_URL, { headers: { 'CF-Connecting-IP': '203.0.113.12' } });
    const [first, second] = await Promise.all([
      routeRequest(request(), { BODS_KEY: 'present' }),
      routeRequest(request(), { BODS_KEY: 'present' })
    ]);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(await first.text(), FRESH_SIRI);
    assert.equal(await second.text(), FRESH_SIRI);
    assert.equal(runtime.state.fetches, 1);
  } finally {
    runtime.restore();
    resetWorkerStateForTests();
  }
});

test('serves a very recent cache hit without contacting BODS', async () => {
  const runtime = installRuntime(cachedResponse(CACHED_SIRI, 1000), async () => {
    throw new Error('upstream should not be called');
  });
  try {
    const response = await routeRequest(new Request(LIVE_URL), { BODS_KEY: 'present' });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), CACHED_SIRI);
    assert.equal(response.headers.get('X-Kerbside-Cache'), 'fresh');
    assert.equal(response.headers.get('X-Kerbside-Stale'), null);
    assert.equal(runtime.state.fetches, 0);
    assert.match(runtime.state.matches[0], /lineRef=9/);
  } finally {
    runtime.restore();
  }
});

test('returns an older cache promptly and refreshes it in waitUntil', async () => {
  const runtime = installRuntime(cachedResponse(CACHED_SIRI, 30000), async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    return new Response(FRESH_SIRI, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  });
  const waits = [];
  try {
    const response = await routeRequest(
      new Request(LIVE_URL),
      { BODS_KEY: 'present', LIVE_CACHE_WAIT_MS: '1' },
      { waitUntil(promise) { waits.push(promise); } }
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), CACHED_SIRI);
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

test('rejects and never caches non-SIRI HTTP 200 bodies', async () => {
  resetWorkerStateForTests();
  const payloads = [
    new Response('<html><body>upstream error</body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
    new Response('{"error":"upstream error"}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  ];
  const runtime = installRuntime(null, async () => payloads.shift());
  try {
    const response = await routeRequest(new Request(LIVE_URL), { BODS_KEY: 'present' });
    assert.equal(response.status, 502);
    assert.equal(runtime.state.fetches, 2);
    assert.equal(runtime.state.puts.length, 0);
  } finally {
    runtime.restore();
    resetWorkerStateForTests();
  }
});

// fetch() resolves on headers, so an upstream that answers and then stalls
// part-way through the XML used to escape the timeout entirely: the abort
// controller was disarmed before the body was read, and the request hung until
// the platform killed it. The body must be downloaded while the timeout is
// still armed. Without that, this test does not fail — it hangs.
test('times out an upstream that sends headers and then stalls the body', async () => {
  resetWorkerStateForTests();
  const stalled = signal => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('<?xml version="1.0"?><Siri><ServiceDelivery>'));
      // Never closed. Only the worker's own abort ends this response.
      signal.addEventListener('abort', () => controller.error(new Error('aborted')));
    }
  }), { status: 200, headers: { 'Content-Type': 'application/xml' } });

  const runtime = installRuntime(null, async (url, options) => stalled(options.signal));
  const startedAt = Date.now();
  try {
    const response = await routeRequest(new Request(LIVE_URL), { BODS_KEY: 'present' });
    assert.equal(response.status, 502);
    assert.equal(runtime.state.fetches, 2);
    assert.equal(runtime.state.puts.length, 0);
    // Two attempts of a 4s timeout plus the retry pause, not an open-ended hang.
    assert.ok(Date.now() - startedAt < 20000, `stalled body was not timed out: ${Date.now() - startedAt}ms`);
  } finally {
    runtime.restore();
    resetWorkerStateForTests();
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
