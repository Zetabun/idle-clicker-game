const RDM_LDB_BASE = 'https://api1.raildata.org.uk/1010-live-departure-board-dep/LDBWS/api/20220120';
const UPSTREAM_TIMEOUT_MS = 3500;
const CACHE_SECONDS = 20;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_DEFAULT = 60;
const MAX_RATE_BUCKETS = 2048;
const RATE_BUCKETS = new Map();
const INFLIGHT = new Map();

export default {
  async fetch(request, env, ctx) {
    try {
      return await routeRequest(request, env, ctx);
    } catch (error) {
      return json({
        error: 'Kerbside rail Worker failed',
        detail: safeMessage(error),
        retryable: true
      }, 500, request, env, { 'Cache-Control': 'no-store' });
    }
  }
};

export async function routeRequest(request, env, ctx = { waitUntil() {} }) {
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, request, env);

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/health') return health(request, env);

  const board = parseBoardPath(path);
  if (!board) return json({ error: 'Not found' }, 404, request, env);
  if (!requestOriginAllowed(request, env)) {
    return json({ error: 'Origin is not allowed' }, 403, request, env, { 'Cache-Control': 'no-store' });
  }

  const rate = consumeRateLimit(request, env);
  if (!rate.allowed) {
    return json({ error: 'Too many rail requests', retryable: true }, 429, request, env, {
      ...rateLimitHeaders(rate),
      'Retry-After': String(rate.retryAfter),
      'Cache-Control': 'no-store'
    });
  }

  return withRateLimitHeaders(await railBoard(request, env, ctx, board), rate);
}

function health(request, env) {
  return json({
    ok: true,
    service: 'kerbside-rail',
    source: 'National Rail Darwin via Rail Data Marketplace',
    ldbConfigured: Boolean(env.RDM_LDB_API_KEY),
    upstreamTimeoutMs: UPSTREAM_TIMEOUT_MS,
    cacheSeconds: CACHE_SECONDS,
    rateLimitPerMinute: configuredRateLimit(env)
  }, 200, request, env, { 'Cache-Control': 'no-store' });
}

export function parseBoardPath(path) {
  const decoded = decodeURIComponent(String(path || ''));
  const match = decoded.match(/^\/departures\/([A-Za-z0-9]{3})(?:\/to\/([A-Za-z0-9]{3}))?\/(\d{1,3})$/i);
  if (!match) return null;
  const from = match[1].toUpperCase();
  const to = match[2] ? match[2].toUpperCase() : '';
  const rows = Number(match[3]);
  if (!Number.isInteger(rows) || rows < 1 || rows > 150 || (to && to === from)) return null;
  return { from, to, rows };
}

function integerParam(search, name, min, max) {
  if (!search.has(name)) return null;
  const raw = String(search.get(name) || '').trim();
  if (!/^-?\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

export function buildUpstreamUrl(incoming, board) {
  const expand = /^(?:1|true)$/i.test(String(incoming.searchParams.get('expand') || ''));
  const method = expand ? 'GetDepBoardWithDetails' : 'GetDepartureBoard';
  const upstream = new URL(`${RDM_LDB_BASE}/${method}/${encodeURIComponent(board.from)}`);
  upstream.searchParams.set('numRows', String(expand ? Math.min(9, board.rows) : Math.min(150, board.rows)));
  if (board.to) {
    upstream.searchParams.set('filterCrs', board.to);
    upstream.searchParams.set('filterType', 'to');
  }
  const timeOffset = integerParam(incoming.searchParams, 'timeOffset', -119, 119);
  const timeWindow = integerParam(incoming.searchParams, 'timeWindow', 1, 120);
  if (timeOffset != null) upstream.searchParams.set('timeOffset', String(timeOffset));
  if (timeWindow != null) upstream.searchParams.set('timeWindow', String(timeWindow));
  return upstream;
}

function canonicalCacheKey(request, board) {
  const incoming = new URL(request.url);
  const upstream = buildUpstreamUrl(incoming, board);
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = '/__rail-cache';
  cacheUrl.search = `?upstream=${encodeURIComponent(upstream.pathname + upstream.search)}`;
  return new Request(cacheUrl.toString(), { method: 'GET' });
}

async function railBoard(request, env, ctx, board) {
  if (!env.RDM_LDB_API_KEY) {
    return json({ error: 'Rail Data Marketplace key is not configured', retryable: false }, 503, request, env, {
      'Cache-Control': 'no-store'
    });
  }

  const cache = caches.default;
  const cacheKey = canonicalCacheKey(request, board);
  const cached = await cache.match(cacheKey);
  const age = cachedAgeMs(cached);
  if (cached && age <= CACHE_SECONDS * 1000) {
    return cachedRailResponse(cached, request, env, age);
  }

  const key = cacheKey.url;
  let pending = INFLIGHT.get(key);
  if (!pending) {
    pending = refreshRailBoard(request, env, board, cache, cacheKey)
      .finally(() => INFLIGHT.delete(key));
    INFLIGHT.set(key, pending);
  }

  const result = await pending;
  if (result.response) return result.response;
  if (cached && age <= 2 * 60 * 1000) {
    const response = cachedRailResponse(cached, request, env, age);
    const headers = new Headers(response.headers);
    headers.set('X-Kerbside-Cache', 'stale');
    headers.set('X-Kerbside-Stale', '1');
    headers.set('Warning', '110 - "Rail Data feed unavailable; serving recent cached departure board"');
    return new Response(response.body, { status: 200, headers });
  }

  return json({
    error: 'Official live rail data is temporarily unavailable',
    upstreamStatus: result.status,
    retryable: true
  }, 502, request, env, { 'Retry-After': '15', 'Cache-Control': 'no-store' });
}

async function refreshRailBoard(request, env, board, cache, cacheKey) {
  const incoming = new URL(request.url);
  const upstream = buildUpstreamUrl(incoming, board);
  try {
    const { response, body } = await fetchTextWithTimeout(upstream.toString(), {
      headers: {
        Accept: 'application/json',
        'x-apikey': String(env.RDM_LDB_API_KEY),
        'User-Agent': 'Kerbside-Rail/1.0'
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    }, UPSTREAM_TIMEOUT_MS);

    if (!response.ok) return { response: null, status: response.status };
    let parsed;
    try { parsed = JSON.parse(body); } catch { return { response: null, status: 502 }; }
    if (!validBoardPayload(parsed, board.from)) return { response: null, status: 502 };

    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', `public, max-age=5, s-maxage=${CACHE_SECONDS}`);
    headers.set('X-Kerbside-Rail-Source', 'rdm-ldb');
    headers.set('X-Kerbside-Upstream', String(response.status));
    headers.set('X-Kerbside-Cached-At', String(Date.now()));
    applyCors(headers, request, env);
    const successful = new Response(body, { status: 200, headers });
    try { await cache.put(cacheKey, successful.clone()); } catch {}
    return { response: successful, status: 200 };
  } catch (error) {
    return { response: null, status: error && error.name === 'AbortError' ? 504 : 0 };
  }
}

export function validBoardPayload(value, expectedCrs = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const crs = String(value.crs || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3}$/.test(crs)) return false;
  if (expectedCrs && crs !== String(expectedCrs).toUpperCase()) return false;
  if (!Object.prototype.hasOwnProperty.call(value, 'trainServices')) return false;
  return value.trainServices == null || Array.isArray(value.trainServices);
}

async function fetchTextWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.text();
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

function cachedAgeMs(cached) {
  if (!cached) return Infinity;
  const cachedAt = Number(cached.headers.get('X-Kerbside-Cached-At'));
  return Number.isFinite(cachedAt) && cachedAt > 0 ? Math.max(0, Date.now() - cachedAt) : Infinity;
}

function cachedRailResponse(cached, request, env, ageMs) {
  const headers = new Headers(cached.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Kerbside-Cache', 'fresh');
  headers.set('X-Kerbside-Cache-Age', String(Math.max(0, Math.round(ageMs / 1000))));
  headers.delete('X-Kerbside-Stale');
  headers.delete('Warning');
  applyCors(headers, request, env);
  return new Response(cached.body, { status: 200, headers });
}

function configuredOrigins(env) {
  return String(env.ALLOWED_ORIGINS || 'https://zetabun.github.io')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function requestOriginAllowed(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!origin) return true;
  const configured = configuredOrigins(env);
  return configured.includes('*') || configured.includes(origin);
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const configured = configuredOrigins(env);
  if (!origin) return configured[0] || '*';
  return configured.includes('*') || configured.includes(origin) ? origin : '';
}

function applyCors(headers, request, env) {
  const origin = allowedOrigin(request, env);
  if (origin) headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Expose-Headers', 'X-Kerbside-Rail-Source,X-Kerbside-Upstream,X-Kerbside-Stale,X-Kerbside-Cache,X-Kerbside-Cache-Age,X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset,Retry-After,Warning');
}

function corsPreflight(request, env) {
  const headers = new Headers();
  applyCors(headers, request, env);
  headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Accept,Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}

function configuredRateLimit(env) {
  const configured = Number(env && env.RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(configured)
    ? Math.max(2, Math.min(600, Math.floor(configured)))
    : RATE_LIMIT_DEFAULT;
}

function clientRateKey(request) {
  const ip = String(request.headers.get('CF-Connecting-IP') || '').trim();
  return ip ? `ip:${ip}` : '';
}

function pruneRateBuckets(now) {
  for (const [key, bucket] of RATE_BUCKETS) {
    if (!bucket || bucket.resetAt <= now) RATE_BUCKETS.delete(key);
  }
  while (RATE_BUCKETS.size > MAX_RATE_BUCKETS) {
    const oldest = RATE_BUCKETS.keys().next().value;
    if (oldest === undefined) break;
    RATE_BUCKETS.delete(oldest);
  }
}

function consumeRateLimit(request, env) {
  const limit = configuredRateLimit(env);
  const key = clientRateKey(request);
  const now = Date.now();
  if (!key) return { allowed: true, limit, remaining: limit, resetAt: now + RATE_WINDOW_MS, retryAfter: 0 };
  if (RATE_BUCKETS.size >= MAX_RATE_BUCKETS) pruneRateBuckets(now);
  let bucket = RATE_BUCKETS.get(key);
  if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
  bucket.count = Math.min(limit + 1, bucket.count + 1);
  RATE_BUCKETS.set(key, bucket);
  const allowed = bucket.count <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfter: allowed ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

function rateLimitHeaders(rate) {
  return {
    'X-RateLimit-Limit': String(rate.limit),
    'X-RateLimit-Remaining': String(rate.remaining),
    'X-RateLimit-Reset': String(Math.ceil(rate.resetAt / 1000))
  };
}

function withRateLimitHeaders(response, rate) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(rateLimitHeaders(rate))) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function safeMessage(error) {
  return String(error && error.message ? error.message : error || 'Unknown error').slice(0, 240);
}

function json(value, status, request, env, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  applyCors(headers, request, env);
  return new Response(JSON.stringify(value), { status, headers });
}

export function resetWorkerStateForTests() {
  RATE_BUCKETS.clear();
  INFLIGHT.clear();
}

export { RDM_LDB_BASE, UPSTREAM_TIMEOUT_MS, CACHE_SECONDS };
