const LIVE_ENDPOINTS = [
  'https://data.bus-data.dft.gov.uk/api/v1/datafeed/',
  'https://data.bus-data.dft.gov.uk/api/v1/datafeed'
];
const LIVE_TIMEOUT_MS = 15000;
const LIVE_ATTEMPTS = 3;
const LIVE_CACHE_SECONDS = 150;
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
    version: '0.6.0',
    bods: Boolean(env.BODS_KEY),
    maxBoundingBoxSpan: MAX_BBOX_SPAN
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
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = '/__live-cache';
  cacheUrl.search = `?bbox=${encodeURIComponent(bbox)}`;
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  const failures = [];

  for (let attempt = 0; attempt < LIVE_ATTEMPTS; attempt++) {
    const endpoint = LIVE_ENDPOINTS[attempt % LIVE_ENDPOINTS.length];
    const upstream = new URL(endpoint);
    upstream.searchParams.set('api_key', env.BODS_KEY);
    upstream.searchParams.set('boundingBox', bbox);
    const lineRef = incoming.searchParams.get('lineRef');
    if (lineRef) upstream.searchParams.set('lineRef', lineRef.slice(0, 40));

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
        applyCors(headers, request, env);
        const successful = new Response(body, { status: 200, headers });
        ctx.waitUntil(cache.put(cacheKey, successful.clone()));
        return successful;
      }
      failures.push({ status: response.status, detail: textSnippet(body) });
    } catch (error) {
      failures.push({ status: 0, detail: safeMessage(error) });
    }
    if (attempt + 1 < LIVE_ATTEMPTS) await sleep(250 * (attempt + 1));
  }

  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set('X-Kerbside-Stale', '1');
    headers.set('Warning', '110 - "BODS live feed unavailable; serving recent cached positions"');
    headers.set('Cache-Control', 'no-store');
    applyCors(headers, request, env);
    return new Response(cached.body, { status: 200, headers });
  }

  return json({
    error: 'Live BODS feed is temporarily unavailable',
    upstream: failures.slice(-3),
    retryable: true
  }, 502, request, env, { 'Retry-After': '15', 'Cache-Control': 'no-store' });
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
  headers.set('Access-Control-Expose-Headers', 'X-Kerbside-Upstream,X-Kerbside-Stale,Warning');
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
