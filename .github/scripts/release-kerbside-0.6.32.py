from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.31';", "const APP_VERSION = '0.6.32';")
replace_once('kerbside-backend/package.json', '"version": "0.6.31"', '"version": "0.6.32"')
replace_once("kerbside-backend/src/worker.js", "version: '0.6.31',", "version: '0.6.32',")
replace_once("kerbside-backend/test/worker.test.js", "assert.equal(body.version, '0.6.31');", "assert.equal(body.version, '0.6.32');")

replace_once(
    'bus.html',
    "Version 0.6.31 also restores browser page zoom for accessibility while retaining 16 px mobile form controls to prevent unwanted Safari focus zoom; Leaflet map gestures continue to work normally.",
    "Version 0.6.32 also protects the live Worker with allowlisted browser origins, a conservative per-IP request guard, and coalesced identical cache refreshes so bursts do not multiply BODS traffic."
)

replace_once(
    'kerbside-backend/src/worker.js',
    "const MAX_BBOX_SPAN = 0.35;",
    """const MAX_BBOX_SPAN = 0.35;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_DEFAULT = 60;
const MAX_RATE_BUCKETS = 2048;
const RATE_BUCKETS = new Map();
const INFLIGHT_REFRESHES = new Map();"""
)
replace_once(
    'kerbside-backend/src/worker.js',
    """  if (path === '/health') return health(request, env);
  if (path === '/' || path === '/feed') return liveFeed(request, env, ctx);

  return json({ error: 'Not found' }, 404, request, env);
""",
    """  if (path === '/health') return health(request, env);
  if (path === '/' || path === '/feed') {
    if (!requestOriginAllowed(request, env)) {
      return json({ error: 'Origin is not allowed' }, 403, request, env, { 'Cache-Control': 'no-store' });
    }
    const rate = consumeRateLimit(request, env);
    if (!rate.allowed) {
      return json({ error: 'Too many live-feed requests', retryable: true }, 429, request, env, {
        ...rateLimitHeaders(rate),
        'Retry-After': String(rate.retryAfter),
        'Cache-Control': 'no-store'
      });
    }
    return withRateLimitHeaders(await liveFeed(request, env, ctx), rate);
  }

  return json({ error: 'Not found' }, 404, request, env);
"""
)
replace_once(
    'kerbside-backend/src/worker.js',
    """    upstreamAttempts: LIVE_ATTEMPTS,
    cacheSeconds: LIVE_CACHE_SECONDS
""",
    """    upstreamAttempts: LIVE_ATTEMPTS,
    cacheSeconds: LIVE_CACHE_SECONDS,
    rateLimitPerMinute: configuredRateLimit(env)
"""
)
replace_once(
    'kerbside-backend/src/worker.js',
    "const lineRef = String(incoming.searchParams.get('lineRef') || '').slice(0, 40);",
    "const lineRef = normaliseLineRef(incoming.searchParams.get('lineRef'));"
)
replace_once(
    'kerbside-backend/src/worker.js',
    "const refreshPromise = refreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey);",
    "const refreshPromise = sharedRefreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey);"
)
replace_once(
    'kerbside-backend/src/worker.js',
    "const refreshed = await refreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey);",
    "const refreshed = await sharedRefreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey);"
)
replace_once(
    'kerbside-backend/src/worker.js',
    """async function refreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey) {
""",
    """async function sharedRefreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey) {
  const key = cacheKey.url;
  let pending = INFLIGHT_REFRESHES.get(key);
  if (!pending) {
    pending = refreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey)
      .finally(() => INFLIGHT_REFRESHES.delete(key));
    INFLIGHT_REFRESHES.set(key, pending);
  }
  const result = await pending;
  return {
    failures: result.failures,
    response: result.response ? result.response.clone() : null
  };
}

async function refreshLiveCache(request, env, incoming, bbox, lineRef, cache, cacheKey) {
"""
)
replace_once(
    'kerbside-backend/src/worker.js',
    """function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const configured = String(env.ALLOWED_ORIGINS || 'https://zetabun.github.io')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if (!origin) return configured[0] || '*';
  return configured.includes('*') || configured.includes(origin) ? origin : '';
}
""",
    """function configuredOrigins(env) {
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

function normaliseLineRef(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9 .:_/-]/g, '').slice(0, 40);
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

function resetWorkerStateForTests() {
  RATE_BUCKETS.clear();
  INFLIGHT_REFRESHES.clear();
}
"""
)
replace_once(
    'kerbside-backend/src/worker.js',
    "headers.set('Access-Control-Expose-Headers', 'X-Kerbside-Upstream,X-Kerbside-Stale,X-Kerbside-Cache,X-Kerbside-Cache-Age,Warning');",
    "headers.set('Access-Control-Expose-Headers', 'X-Kerbside-Upstream,X-Kerbside-Stale,X-Kerbside-Cache,X-Kerbside-Cache-Age,X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset,Retry-After,Warning');"
)
replace_once(
    'kerbside-backend/src/worker.js',
    'export { MAX_BBOX_SPAN };',
    'export { MAX_BBOX_SPAN, resetWorkerStateForTests };'
)

replace_once(
    'kerbside-backend/test/worker.test.js',
    "import { MAX_BBOX_SPAN, normaliseBoundingBox, routeRequest } from '../src/worker.js';",
    "import { MAX_BBOX_SPAN, normaliseBoundingBox, resetWorkerStateForTests, routeRequest } from '../src/worker.js';"
)
replace_once(
    'kerbside-backend/test/worker.test.js',
    """  assert.equal(body.upstreamTimeoutMs, 4000);
  assert.equal(body.upstreamAttempts, 2);
});
""",
    """  assert.equal(body.upstreamTimeoutMs, 4000);
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
  const runtime = installRuntime(cachedResponse('<cached/>', 1000), async () => {
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
    return new Response('<fresh/>', { status: 200, headers: { 'Content-Type': 'application/xml' } });
  });
  try {
    const request = () => new Request(LIVE_URL, { headers: { 'CF-Connecting-IP': '203.0.113.12' } });
    const [first, second] = await Promise.all([
      routeRequest(request(), { BODS_KEY: 'present' }),
      routeRequest(request(), { BODS_KEY: 'present' })
    ]);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(await first.text(), '<fresh/>');
    assert.equal(await second.text(), '<fresh/>');
    assert.equal(runtime.state.fetches, 1);
  } finally {
    runtime.restore();
    resetWorkerStateForTests();
  }
});
"""
)

readme_marker = "Kerbside 0.6.31 restores browser page zoom for accessibility. The viewport no longer disables user scaling, Settings no longer blocks two-finger zoom, and the document-level gesture suppression has been removed. Mobile inputs and selects remain at 16px to prevent Safari's automatic focus zoom, while Leaflet continues to handle map pinch gestures.\n"
readme_addition = readme_marker + "\nKerbside 0.6.32 adds best-effort live Worker abuse safeguards without requiring an additional paid Cloudflare binding. Browser requests with an Origin outside the configured allowlist are rejected before cache or BODS work, Cloudflare client IPs receive a conservative per-isolate request budget, and simultaneous identical cache refreshes share one upstream promise. Rate metadata is exposed in response headers, while normal Kerbside polling remains well below the default 60 requests per minute.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.31'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.32'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.31', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.32', bods: true })"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.31'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.32'));"
)

print('Prepared Kerbside 0.6.32 live Worker safeguards.')
