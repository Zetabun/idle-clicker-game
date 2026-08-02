const LIVE_ENDPOINTS = [
  'https://data.bus-data.dft.gov.uk/api/v1/datafeed/',
  'https://data.bus-data.dft.gov.uk/api/v1/datafeed'
];
const REGION_NAMES = [
  'east_anglia', 'east_midlands', 'london', 'north_east', 'north_west',
  'south_east', 'south_west', 'west_midlands', 'yorkshire'
];
const TILE_SIZE = 0.05;
const MAX_STOP_RADIUS = 10000;
const LIVE_TIMEOUT_MS = 15000;
const LIVE_ATTEMPTS = 3;
const LIVE_CACHE_SECONDS = 150;

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

export async function routeRequest(request, env, ctx) {
  if (request.method === 'OPTIONS') return corsPreflight(request, env);
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, request, env);

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/health') return health(request, env);
  if (path === '/nearby-stops') return nearbyStops(request, env);
  if (path.startsWith('/departures/')) {
    const stopId = decodeURIComponent(path.slice('/departures/'.length));
    return stopBundle(request, env, stopId);
  }
  if (path.startsWith('/pattern/')) {
    const patternId = decodeURIComponent(path.slice('/pattern/'.length));
    return patternBundle(request, env, patternId);
  }
  if (path === '/' || path === '/feed') return liveFeed(request, env, ctx);

  return json({ error: 'Not found' }, 404, request, env);
}

async function health(request, env) {
  let manifest = null;
  if (env.KERBSIDE_DATA) {
    try {
      const object = await env.KERBSIDE_DATA.get('manifest.json');
      if (object) manifest = await object.json();
    } catch (error) {
      manifest = { error: safeMessage(error) };
    }
  }
  return json({
    ok: true,
    service: 'kerbside-data',
    version: '0.5.0',
    bods: Boolean(env.BODS_KEY),
    timetable: Boolean(env.KERBSIDE_DATA),
    manifest
  }, 200, request, env, { 'Cache-Control': 'no-store' });
}

async function liveFeed(request, env, ctx) {
  if (!env.BODS_KEY) return json({ error: 'BODS_KEY is not configured' }, 503, request, env);
  const incoming = new URL(request.url);
  const bbox = normaliseBoundingBox(incoming.searchParams.get('bbox') || incoming.searchParams.get('boundingBox'));
  if (!bbox) return json({ error: 'A valid bbox=minLon,minLat,maxLon,maxLat query is required' }, 400, request, env);

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
          'User-Agent': 'Kerbside/0.5 (+https://zetabun.github.io/idle-clicker-game/bus.html)'
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

async function nearbyStops(request, env) {
  if (!env.KERBSIDE_DATA) return json({ error: 'KERBSIDE_DATA R2 binding is not configured' }, 503, request, env);
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  const radius = Math.min(MAX_STOP_RADIUS, Math.max(100, Number(url.searchParams.get('radius')) || 1500));
  if (!validCoordinate(lat, lon)) return json({ error: 'Valid lat and lon parameters are required' }, 400, request, env);

  const regions = candidateRegions(lat, lon);
  const tiles = tileKeysForRadius(lat, lon, radius);
  const objects = await Promise.all(regions.flatMap(region => tiles.map(async tile => {
    const object = await env.KERBSIDE_DATA.get(`regions/${region}/tiles/${tile}.json`);
    if (!object) return [];
    const value = await object.json();
    return Array.isArray(value.stops) ? value.stops.map(stop => ({ ...stop, region })) : [];
  })));

  const unique = new Map();
  for (const stop of objects.flat()) {
    const stopLat = Number(stop.lat);
    const stopLon = Number(stop.lon);
    if (!validCoordinate(stopLat, stopLon)) continue;
    const metres = haversine(lat, lon, stopLat, stopLon);
    if (metres > radius) continue;
    const id = String(stop.id || stop.atco || stop.code || '').trim();
    if (!id) continue;
    const previous = unique.get(id);
    const value = { ...stop, id, d: Math.round(metres) };
    if (!previous || value.d < previous.d) unique.set(id, value);
  }

  const stops = [...unique.values()].sort((a, b) => a.d - b.d).slice(0, 120);
  return json({ version: 1, source: 'BODS GTFS / NaPTAN identifiers', radius, stops }, 200, request, env, {
    'Cache-Control': 'public, max-age=300, s-maxage=3600'
  });
}

async function stopBundle(request, env, rawStopId) {
  if (!env.KERBSIDE_DATA) return json({ error: 'KERBSIDE_DATA R2 binding is not configured' }, 503, request, env);
  const stopId = safeIdentifier(rawStopId, 120);
  if (!stopId) return json({ error: 'Invalid stop identifier' }, 400, request, env);
  const url = new URL(request.url);
  const requestedRegion = safeRegion(url.searchParams.get('region'));
  const tile = safeTile(url.searchParams.get('tile'));
  if (!requestedRegion || !tile) return json({ error: 'Valid region and tile queries are required' }, 400, request, env);
  const object = await env.KERBSIDE_DATA.get(`regions/${requestedRegion}/timetables/${tile}.json`);
  if (!object) return json({ error: 'No timetable tile is available for this stop', stop: stopId }, 404, request, env);
  return r2Response(object, request, env, 'application/json; charset=utf-8');
}

async function patternBundle(request, env, rawPatternId) {
  if (!env.KERBSIDE_DATA) return json({ error: 'KERBSIDE_DATA R2 binding is not configured' }, 503, request, env);
  const patternId = safeIdentifier(rawPatternId, 100);
  if (!patternId) return json({ error: 'Invalid pattern identifier' }, 400, request, env);
  const url = new URL(request.url);
  const requestedRegion = safeRegion(url.searchParams.get('region'));
  if (!requestedRegion) return json({ error: 'A valid region query is required' }, 400, request, env);
  const prefix = patternId.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 3);
  if (prefix.length !== 3) return json({ error: 'Invalid pattern identifier' }, 400, request, env);
  const object = await env.KERBSIDE_DATA.get(`regions/${requestedRegion}/patterns/${prefix}.json`);
  if (!object) return json({ error: 'Pattern shard not found' }, 404, request, env);
  return r2Response(object, request, env, 'application/json; charset=utf-8');
}

function r2Response(object, request, env, fallbackType) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Content-Type', headers.get('Content-Type') || fallbackType);
  headers.set('Cache-Control', headers.get('Cache-Control') || 'public, max-age=3600, s-maxage=86400');
  applyCors(headers, request, env);
  return new Response(object.body, { headers });
}

export function normaliseBoundingBox(value) {
  const parts = String(value || '').split(',').map(Number);
  if (parts.length !== 4 || parts.some(number => !Number.isFinite(number))) return '';
  let [minLon, minLat, maxLon, maxLat] = parts;
  if (minLon >= maxLon || minLat >= maxLat) return '';
  if (minLon < -9 || maxLon > 3 || minLat < 49 || maxLat > 61) return '';
  if (maxLon - minLon > 1.5 || maxLat - minLat > 1.5) return '';
  return [minLon, minLat, maxLon, maxLat].map(number => number.toFixed(5)).join(',');
}

export function tileKey(lat, lon) {
  const y = Math.floor((Number(lat) + 90) / TILE_SIZE);
  const x = Math.floor((Number(lon) + 180) / TILE_SIZE);
  return `${y}-${x}`;
}

export function tileKeysForRadius(lat, lon, radius) {
  const latPad = radius / 111320;
  const lonPad = radius / (111320 * Math.max(0.2, Math.cos(Number(lat) * Math.PI / 180)));
  const minY = Math.floor((lat - latPad + 90) / TILE_SIZE);
  const maxY = Math.floor((lat + latPad + 90) / TILE_SIZE);
  const minX = Math.floor((lon - lonPad + 180) / TILE_SIZE);
  const maxX = Math.floor((lon + lonPad + 180) / TILE_SIZE);
  const keys = [];
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) keys.push(`${y}-${x}`);
  return keys;
}

export function candidateRegions(lat, lon) {
  const matches = [];
  for (const [name, box] of Object.entries(REGION_BOXES)) {
    if (lon >= box[0] && lat >= box[1] && lon <= box[2] && lat <= box[3]) matches.push(name);
  }
  return matches.length ? matches : REGION_NAMES;
}

const REGION_BOXES = {
  north_east: [-2.8, 53.9, 0.2, 55.9],
  north_west: [-4.2, 52.8, -1.7, 55.9],
  yorkshire: [-2.7, 52.8, 0.5, 54.8],
  east_midlands: [-2.0, 51.8, 0.8, 53.8],
  west_midlands: [-3.5, 51.6, -1.0, 53.3],
  east_anglia: [-0.9, 51.3, 1.9, 53.2],
  london: [-0.8, 51.1, 0.5, 51.8],
  south_east: [-1.9, 50.6, 1.9, 52.0],
  south_west: [-6.0, 49.8, -1.0, 52.2]
};

function objectName(value) {
  return encodeURIComponent(String(value)).replace(/%/g, '_');
}
function safeTile(value) {
  const tile = String(value || '').trim();
  return /^\d+-\d+$/.test(tile) ? tile : '';
}
function safeRegion(value) {
  const region = String(value || '').trim().toLowerCase();
  return REGION_NAMES.includes(region) ? region : '';
}
function safeIdentifier(value, maxLength) {
  const text = String(value || '').trim();
  if (!text || text.length > maxLength || /[\u0000-\u001f]/.test(text)) return '';
  return text;
}
function validCoordinate(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 49 && lat <= 61 && lon >= -9 && lon <= 3;
}
function haversine(a, b, c, d) {
  const toRad = degrees => degrees * Math.PI / 180;
  const p1 = toRad(a), p2 = toRad(c), dp = toRad(c - a), dl = toRad(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
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
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function safeMessage(error) { return String(error && error.message ? error.message : error || 'Unknown error').slice(0, 300); }
function textSnippet(buffer) {
  try { return new TextDecoder().decode(buffer).replace(/\s+/g, ' ').trim().slice(0, 240); }
  catch { return ''; }
}
function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const configured = String(env.ALLOWED_ORIGINS || 'https://zetabun.github.io').split(',').map(value => value.trim()).filter(Boolean);
  if (!origin) return configured[0] || '*';
  return configured.includes('*') || configured.includes(origin) ? origin : configured[0] || 'https://zetabun.github.io';
}
function applyCors(headers, request, env) {
  headers.set('Access-Control-Allow-Origin', allowedOrigin(request, env));
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Expose-Headers', 'X-Kerbside-Stale,X-Kerbside-Upstream,Warning,Retry-After');
}
function corsPreflight(request, env) {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'Access-Control-Max-Age': '86400'
  });
  applyCors(headers, request, env);
  return new Response(null, { status: 204, headers });
}
function json(value, status, request, env, extraHeaders = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
  applyCors(headers, request, env);
  return new Response(JSON.stringify(value), { status, headers });
}
