const LIVE_ENDPOINTS = [
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
    version: '0.6.19',
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
