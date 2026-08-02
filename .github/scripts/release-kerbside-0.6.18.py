from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


worker = r'''const LIVE_ENDPOINTS = [
  'https://data.bus-data.dft.gov.uk/api/v1/datafeed/',
  'https://data.bus-data.dft.gov.uk/api/v1/datafeed'
];
const LIVE_TIMEOUT_MS = 4000;
const LIVE_ATTEMPTS = 2;
const LIVE_RETRY_DELAY_MS = 150;
const LIVE_CACHE_SECONDS = 150;
const LIVE_FRESH_CACHE_MS = 5000;
const LIVE_CACHE_WAIT_MS = 1800;
const MAX_BBOX_SPAN = 0.35;

export default {
  async fetch(request, env, ctx) {
    try {
      return await routeRequest(request, env, ctx);
    } catch (error) {
      return json({
        error: 'Kerbside Worker failed',
        detail: safeMessage(error)
      }, 500, request, env);
    }
  }
};

export async function routeRequest(request, env, ctx = { waitUntil() {} }) {
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, request, env);

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/health') return health(request, env);
  if (path === '/' || path === '/feed') return liveFeed(request, env, ctx);

  return json({ error: 'Not found' }, 404, request, env);
}

function health(request, env) {
  return json({
    ok: true,
    service: 'kerbside-live',
    role: 'live-only',
    version: '0.6.18',
    bods: Boolean(env.BODS_KEY),
    maxBoundingBoxSpan: MAX_BBOX_SPAN,
    upstreamTimeoutMs: LIVE_TIMEOUT_MS,
    upstreamAttempts: LIVE_ATTEMPTS,
    cacheSeconds: LIVE_CACHE_SECONDS
  }, 200, request, env, { 'Cache-Control': 'no-store' });
}

async function liveFeed(request, env, ctx) {
  if (!env.BODS_KEY) return json({ error: 'BODS_KEY is not configured' }, 503, request, env);

  const incoming = new URL(request.url);
  const rawBox = incoming.searchParams.get('bbox') || incoming.searchParams.get('boundingBox');
  const bbox = normaliseBoundingBox(rawBox);
  if (!bbox) {
    return json({
      error: `A valid bbox=minLon,minLat,maxLon,maxLat query is required; each span must be at or below ${MAX_BBOX_SPAN} degrees`,
      maxSpan: MAX_BBOX_SPAN
    }, 400, request, env);
  }

  const cache = caches.default;
  const lineRef = String(incoming.searchParams.get('lineRef') || '').slice(0, 40);
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = '/__live-cache';
  cacheUrl.search = `?bbox=${encodeURIComponent(bbox)}${lineRef ? `&lineRef=${encodeURIComponent(lineRef)}` : ''}`;
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  const cacheAge = cachedAgeMs(cached);

  if (cached && cacheAge <= LIVE_FRESH_CACHE_MS) {
    return cachedLiveResponse(cached, request, env, false, cacheAge);
  }

  if (cached) {
    const refreshPromise = refreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey);
    const waitMs = configuredCacheWaitMs(env);
    const refreshed = await Promise.race([
      refreshPromise,
      sleep(waitMs).then(() => null)
    ]);
    if (refreshed && refreshed.response) return refreshed.response;
    if (!refreshed) ctx.waitUntil(refreshPromise.catch(() => {}));
    return cachedLiveResponse(cached, request, env, true, cacheAge);
  }

  const refreshed = await refreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey);
  if (refreshed.response) return refreshed.response;

  return json({
    error: 'Live BODS feed is temporarily unavailable',
    upstream: refreshed.failures.slice(-LIVE_ATTEMPTS),
    retryable: true
  }, 502, request, env, { 'Retry-After': '15', 'Cache-Control': 'no-store' });
}

async function refreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey) {
  const failures = [];
  for (let attempt = 0; attempt < LIVE_ATTEMPTS; attempt++) {
    const endpoint = LIVE_ENDPOINTS[attempt % LIVE_ENDPOINTS.length];
    const upstream = new URL(endpoint);
    upstream.searchParams.set('api_key', env.BODS_KEY);
    upstream.searchParams.set('boundingBox', bbox);
    if (lineRef) upstream.searchParams.set('lineRef', lineRef);

    try {
      const response = await fetchWithTimeout(upstream.toString(), {
        headers: {
          Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.1',
          'User-Agent': 'Kerbside/0.6 (+https://zetabun.github.io/idle-clicker-game/bus.html)'
        },
        cf: { cacheTtl: 0, cacheEverything: false }
      }, LIVE_TIMEOUT_MS);
      const body = await response.arrayBuffer();
      if (response.ok && body.byteLength) {
        const headers = new Headers();
        headers.set('Content-Type', response.headers.get('Content-Type') || 'application/xml; charset=utf-8');
        headers.set('Cache-Control', `public, max-age=5, s-maxage=${LIVE_CACHE_SECONDS}`);
        headers.set('X-Kerbside-Upstream', String(response.status));
        headers.set('X-Kerbside-Cached-At', String(Date.now()));
        applyCors(headers, request, env);
        const successful = new Response(body, { status: 200, headers });
        try { await cache.put(cacheKey, successful.clone()); } catch {}
        return { response: successful, failures };
      }
      failures.push({ status: response.status, detail: textSnippet(body) });
    } catch (error) {
      failures.push({ status: 0, detail: safeMessage(error) });
    }
    if (attempt + 1 < LIVE_ATTEMPTS) await sleep(LIVE_RETRY_DELAY_MS * (attempt + 1));
  }
  return { response: null, failures };
}

function cachedAgeMs(cached) {
  if (!cached) return Infinity;
  const cachedAt = Number(cached.headers.get('X-Kerbside-Cached-At'));
  return Number.isFinite(cachedAt) && cachedAt > 0 ? Math.max(0, Date.now() - cachedAt) : Infinity;
}

function configuredCacheWaitMs(env) {
  const configured = Number(env && env.LIVE_CACHE_WAIT_MS);
  return Number.isFinite(configured)
    ? Math.max(0, Math.min(LIVE_CACHE_WAIT_MS, configured))
    : LIVE_CACHE_WAIT_MS;
}

function cachedLiveResponse(cached, request, env, stale, ageMs) {
  const headers = new Headers(cached.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Kerbside-Cache', stale ? 'stale' : 'fresh');
  if (Number.isFinite(ageMs)) headers.set('X-Kerbside-Cache-Age', String(Math.max(0, Math.round(ageMs / 1000))));
  if (stale) {
    headers.set('X-Kerbside-Stale', '1');
    headers.set('Warning', '110 - "BODS live feed slow or unavailable; serving recent cached positions"');
  } else {
    headers.delete('X-Kerbside-Stale');
    headers.delete('Warning');
  }
  applyCors(headers, request, env);
  return new Response(cached.body, { status: 200, headers });
}

export function normaliseBoundingBox(value) {
  const parts = String(value || '').split(',').map(Number);
  if (parts.length !== 4 || parts.some(number => !Number.isFinite(number))) return '';
  const [minLon, minLat, maxLon, maxLat] = parts;
  if (minLon >= maxLon || minLat >= maxLat) return '';
  if (minLon < -9 || maxLon > 3 || minLat < 49 || maxLat > 61) return '';
  if (maxLon - minLon > MAX_BBOX_SPAN + 1e-9 || maxLat - minLat > MAX_BBOX_SPAN + 1e-9) return '';
  return [minLon, minLat, maxLon, maxLat].map(number => number.toFixed(5)).join(',');
}

async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeMessage(error) {
  return String(error && error.message ? error.message : error || 'Unknown error').slice(0, 300);
}

function textSnippet(buffer) {
  try {
    return new TextDecoder().decode(buffer).replace(/\s+/g, ' ').trim().slice(0, 240);
  } catch {
    return '';
  }
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const configured = String(env.ALLOWED_ORIGINS || 'https://zetabun.github.io')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if (!origin) return configured[0] || '*';
  return configured.includes('*') || configured.includes(origin) ? origin : '';
}

function applyCors(headers, request, env) {
  const origin = allowedOrigin(request, env);
  if (origin) headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Expose-Headers', 'X-Kerbside-Upstream,X-Kerbside-Stale,X-Kerbside-Cache,X-Kerbside-Cache-Age,Warning');
}

function corsPreflight(request, env) {
  const headers = new Headers();
  applyCors(headers, request, env);
  headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Accept,Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}

function json(value, status, request, env, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  applyCors(headers, request, env);
  return new Response(JSON.stringify(value), { status, headers });
}

export { MAX_BBOX_SPAN };
'''

worker_test = r'''import test from 'node:test';
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
  assert.equal(body.version, '0.6.18');
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
'''

Path('kerbside-backend/src/worker.js').write_text(worker, encoding='utf-8')
Path('kerbside-backend/test/worker.test.js').write_text(worker_test, encoding='utf-8')

replace_once('bus.html', "const APP_VERSION = '0.6.17';", "const APP_VERSION = '0.6.18';")
replace_once('kerbside-backend/package.json', '"version": "0.6.17"', '"version": "0.6.18"')
replace_once(
    'bus.html',
    "Version 0.6.17 recovers timetable-linked GPS vehicles when exact route or scheduled-call evidence is stronger than a temporary bearing or town-centre direction estimate, explains why timetable rows have no live match, and no longer treats raw GTFS direction values 0 and 1 as universal inbound/outbound labels.",
    "Version 0.6.18 also makes the live Worker cache-first: a recent cached feed is returned within the browser deadline while slow BODS refreshes continue safely, instead of waiting through several long upstream attempts."
)

readme_marker = "Kerbside 0.6.17 corrects timetable direction handling. GTFS `direction_id` values `0` and `1` are route-local identifiers rather than universal inbound/outbound labels, so Kerbside no longer rejects vehicles or scheduled rows on that assumption. Explicit inbound/outbound text is still honoured, while other scheduled direction is derived conservatively from the ordered journey around the selected stop and the current town anchor.\n"
readme_addition = readme_marker + "\nKerbside 0.6.18 makes the live Worker cache-first and deadline-safe. Very recent cached responses are returned without another upstream call. For older cached positions, the Worker gives BODS a short opportunity to refresh, then returns the cache immediately and completes the refresh with `waitUntil`. Uncached requests use at most two four-second attempts, keeping the Worker within the browser's twelve-second request deadline. Cache keys now include optional `lineRef`, and Worker tests cover fresh cache hits, stale background refresh and bounded outages.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.17'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.18'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.17'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.18'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.0', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.18', bods: true })"
)

print('Prepared Kerbside 0.6.18 Worker resilience release.')
