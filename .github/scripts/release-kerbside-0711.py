#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import subprocess
import sys

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one replacement, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


version_path = ROOT / 'VERSION'
current = version_path.read_text(encoding='utf-8').strip()
if current != '0.7.10':
    raise SystemExit(f'Expected Kerbside 0.7.10 base, found {current!r}')
version_path.write_text('0.7.11\n', encoding='utf-8')

# Worker: expose BODS ITM GTFS-Realtime as compact JSON using the same protected key.
replace_once(
    'kerbside-backend/src/worker.js',
    "const LIVE_ENDPOINTS = [",
    "import { gtfsRealtimeBoundingBox, parseGtfsRealtimeVehicleFeed } from './gtfs-realtime.js';\n\nconst LIVE_ENDPOINTS = [",
)
replace_once(
    'kerbside-backend/src/worker.js',
    "const LIVE_CACHE_WAIT_MS = 1800;\nconst MAX_BBOX_SPAN = 0.35;",
    "const LIVE_CACHE_WAIT_MS = 1800;\nconst GTFS_RT_ENDPOINT = 'https://data.bus-data.dft.gov.uk/api/v1/gtfsrtdatafeed/';\nconst GTFS_RT_CACHE_SECONDS = 30;\nconst GTFS_RT_FRESH_CACHE_MS = 10000;\nconst MAX_BBOX_SPAN = 0.35;",
)
replace_once(
    'kerbside-backend/src/worker.js',
    "  if (path === '/health') return health(request, env);\n  if (path === '/' || path === '/feed') {",
    "  if (path === '/health') return health(request, env);\n  if (path === '/' || path === '/feed' || path === '/gtfsrt') {",
)
replace_once(
    'kerbside-backend/src/worker.js',
    "    return withRateLimitHeaders(await liveFeed(request, env, ctx), rate);",
    "    const response = path === '/gtfsrt'\n      ? await gtfsRealtimeFeed(request, env, ctx)\n      : await liveFeed(request, env, ctx);\n    return withRateLimitHeaders(response, rate);",
)
replace_once(
    'kerbside-backend/src/worker.js',
    "    bods: Boolean(env.BODS_KEY),\n    maxBoundingBoxSpan: MAX_BBOX_SPAN,",
    "    bods: Boolean(env.BODS_KEY),\n    gtfsRealtime: true,\n    maxBoundingBoxSpan: MAX_BBOX_SPAN,",
)
worker_anchor = "export function validSiriPayload(buffer, contentType = '') {"
worker_addition = r'''async function gtfsRealtimeFeed(request, env, ctx) {
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
  cacheUrl.pathname = '/__gtfsrt-cache';
  cacheUrl.search = `?bbox=${encodeURIComponent(bbox)}`;
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  let cached = await cache.match(cacheKey);
  const cacheAge = cachedAgeMs(cached);

  if (cached && cacheAge <= GTFS_RT_FRESH_CACHE_MS) {
    return cachedGtfsRealtimeResponse(cached, request, env, false, cacheAge);
  }

  if (cached) {
    const refreshPromise = sharedRefreshGtfsRealtime(request, env, bbox, cache, cacheKey);
    const waitMs = configuredCacheWaitMs(env);
    const refreshed = await Promise.race([
      refreshPromise,
      sleep(waitMs).then(() => null)
    ]);
    if (refreshed && refreshed.response) return refreshed.response;
    if (!refreshed) ctx.waitUntil(refreshPromise.catch(() => {}));
    return cachedGtfsRealtimeResponse(cached, request, env, true, cacheAge);
  }

  const refreshed = await sharedRefreshGtfsRealtime(request, env, bbox, cache, cacheKey);
  if (refreshed.response) return refreshed.response;
  return json({
    error: 'Matched BODS GTFS-Realtime feed is temporarily unavailable',
    detail: refreshed.failure || '',
    retryable: true
  }, 502, request, env, { 'Retry-After': '15', 'Cache-Control': 'no-store' });
}

async function sharedRefreshGtfsRealtime(request, env, bbox, cache, cacheKey) {
  const key = cacheKey.url;
  let pending = INFLIGHT_REFRESHES.get(key);
  if (!pending) {
    pending = refreshGtfsRealtime(request, env, bbox, cache, cacheKey)
      .finally(() => INFLIGHT_REFRESHES.delete(key));
    INFLIGHT_REFRESHES.set(key, pending);
  }
  const result = await pending;
  return {
    failure: result.failure,
    response: result.response ? result.response.clone() : null
  };
}

async function refreshGtfsRealtime(request, env, bbox, cache, cacheKey) {
  const upstream = new URL(GTFS_RT_ENDPOINT);
  upstream.searchParams.set('api_key', env.BODS_KEY);
  upstream.searchParams.set('boundingBox', gtfsRealtimeBoundingBox(bbox));
  try {
    const { response, body } = await fetchWithTimeout(upstream.toString(), {
      headers: {
        Accept: 'application/x-protobuf,application/octet-stream;q=0.9,*/*;q=0.1',
        'User-Agent': 'Kerbside/0.7 (+https://zetabun.github.io/idle-clicker-game/bus.html)'
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    }, LIVE_TIMEOUT_MS);
    if (!response.ok) return { response: null, failure: `BODS GTFS-RT returned ${response.status}` };
    const parsed = parseGtfsRealtimeVehicleFeed(body);
    const payload = JSON.stringify({
      version: 1,
      source: 'bods-itm-gtfsrt',
      feedVersion: parsed.header.version || '',
      feedTimestamp: Number(parsed.header.timestamp) || 0,
      vehicles: parsed.vehicles
    });
    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', `public, max-age=10, s-maxage=${GTFS_RT_CACHE_SECONDS}`);
    headers.set('X-Kerbside-Upstream', String(response.status));
    headers.set('X-Kerbside-Cached-At', String(Date.now()));
    applyCors(headers, request, env);
    const successful = new Response(payload, { status: 200, headers });
    try { await cache.put(cacheKey, successful.clone()); } catch {}
    return { response: successful, failure: '' };
  } catch (error) {
    return { response: null, failure: safeMessage(error) };
  }
}

function cachedGtfsRealtimeResponse(cached, request, env, stale, ageMs) {
  const headers = new Headers(cached.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Kerbside-Cache', stale ? 'stale' : 'fresh');
  if (Number.isFinite(ageMs)) headers.set('X-Kerbside-Cache-Age', String(Math.max(0, Math.round(ageMs / 1000))));
  if (stale) headers.set('X-Kerbside-Stale', '1');
  else headers.delete('X-Kerbside-Stale');
  applyCors(headers, request, env);
  return new Response(cached.body, { status: 200, headers });
}

'''
replace_once('kerbside-backend/src/worker.js', worker_anchor, worker_addition + worker_anchor)

# Worker test: advertise the new matched-feed capability; parser behavior has its own fixture tests.
replace_once(
    'kerbside-backend/test/worker.test.js',
    "  assert.equal(body.bods, true);\n  assert.equal(body.upstreamTimeoutMs, 4000);",
    "  assert.equal(body.bods, true);\n  assert.equal(body.gtfsRealtime, true);\n  assert.equal(body.upstreamTimeoutMs, 4000);",
)

# Browser: parallel best-effort ITM identity enrichment, leaving raw SIRI GPS as fallback.
replace_once(
    'bus.html',
    "const GPS_LIVE_DISPLAY_SECONDS = 120;",
    "const GPS_LIVE_DISPLAY_SECONDS = 120;\nconst ITM_IDENTITY_TTL_MS = 10*60*1000;\nconst ITM_POSITION_MAX_AGE_MS = 4*60*1000;\nconst ITM_POSITION_BASE_METRES = 160;\nconst ITM_POSITION_SPEED_METRES_PER_SECOND = 20;",
)

browser_anchor = "function feedUrls(wide){ return feedUrlsForBoxes(bboxes(wide)); }"
browser_helpers = r'''function feedUrls(wide){ return feedUrlsForBoxes(bboxes(wide)); }
function itmFeedUrls(wide){
  if(!S.proxy) return [];
  return bboxes(wide).map(box=>{
    const u=new URL(S.proxy,location.href);
    u.pathname='/gtfsrt';
    u.search=''; u.searchParams.set('bbox',box);
    return u.toString();
  });
}
async function fetchItmIdentities(wide,signal){
  const urls=itmFeedUrls(wide);
  if(!urls.length) return [];
  const settled=await Promise.allSettled(urls.map(async url=>{
    const r=await fetchTimed(url,{headers:{Accept:'application/json'},cache:'no-store',signal},FETCH_TIMEOUT_MS);
    if(!r.ok) throw new Error('matched feed returned '+r.status);
    const body=await r.json();
    return Array.isArray(body&&body.vehicles)?body.vehicles:[];
  }));
  const byKey=new Map();
  for(const result of settled){
    if(result.status!=='fulfilled') continue;
    for(const item of result.value){
      if(!item||!item.tripId) continue;
      const key=String(item.entityId||item.vehicleId||'')+'|'+String(item.tripId);
      const previous=byKey.get(key);
      if(!previous||Number(item.timestamp||0)>=Number(previous.timestamp||0)) byKey.set(key,item);
    }
  }
  return [...byKey.values()];
}
function itmIdentityToken(value){ return String(value||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function itmTripAvailableForLine(trip,line,rows){
  const id=String(trip||''); if(!id) return false;
  const list=Array.isArray(rows)?rows:timetableRowsForLine(String(line),new Date());
  return list.some(row=>String(row&&row.trip||'')===id);
}
function attachItmIdentity(v,item,now,kind){
  v.itmTripId=String(item.tripId||''); v.itmRouteId=String(item.routeId||'');
  v.itmVehicleId=String(item.vehicleId||''); v.itmStartTime=String(item.startTime||'');
  v.itmStartDate=String(item.startDate||''); v.itmPositionAt=Number(item.timestamp||0)*1000||now;
  v.itmMatchedAt=now; v.itmMatch=String(kind||'matched');
  return v;
}
function applyItmIdentities(vehicles,identities,now=Date.now()){
  const live=Array.isArray(vehicles)?vehicles:[], matched=Array.isArray(identities)?identities:[];
  if(!live.length||!matched.length||!S.ttStop) return live;
  const rowsByLine=new Map(), used=new Set();
  const rows=line=>{
    const key=String(line); if(!rowsByLine.has(key)) rowsByLine.set(key,timetableRowsForLine(key,new Date(now)));
    return rowsByLine.get(key);
  };
  const valid=item=>{
    const at=Number(item&&item.timestamp||0)*1000;
    return item&&item.tripId&&Number.isFinite(Number(item.lat))&&Number.isFinite(Number(item.lon))
      &&(!at||Math.abs(now-at)<=ITM_POSITION_MAX_AGE_MS);
  };
  const compatible=(v,item)=>valid(item)&&itmTripAvailableForLine(item.tripId,v.line,rows(v.line));
  const keyFor=item=>String(item&&item.entityId||item&&item.vehicleId||'')+'|'+String(item&&item.tripId||'');

  // Prefer a unique physical vehicle identity. This is the safest bridge from
  // raw SIRI to BODS' timetable-matched ITM feed.
  for(const v of live){
    const token=itmIdentityToken(v.vehicleRef);
    if(!token) continue;
    const candidates=matched.filter(item=>!used.has(keyFor(item))&&compatible(v,item)&&itmIdentityToken(item.vehicleId)===token);
    if(candidates.length===1){ const item=candidates[0]; attachItmIdentity(v,item,now,'vehicle'); used.add(keyFor(item)); }
  }

  // Some operators omit or rewrite vehicle IDs. Fall back only when one
  // timetable-compatible ITM vehicle is unambiguously closest in space/time.
  for(const v of live){
    if(v.itmTripId) continue;
    const ranked=matched.filter(item=>!used.has(keyFor(item))&&compatible(v,item)).map(item=>{
      const at=Number(item.timestamp||0)*1000||now, dt=Math.abs(Number(v.ts||now)-at)/1000;
      const metres=dist(Number(v.lat),Number(v.lon),Number(item.lat),Number(item.lon));
      const limit=Math.min(900,ITM_POSITION_BASE_METRES+dt*ITM_POSITION_SPEED_METRES_PER_SECOND);
      return {item,metres,limit,dt};
    }).filter(entry=>entry.dt<=120&&entry.metres<=entry.limit).sort((a,b)=>a.metres-b.metres);
    if(ranked.length&&(!ranked[1]||ranked[1].metres-ranked[0].metres>=120)){
      attachItmIdentity(v,ranked[0].item,now,'position'); used.add(keyFor(ranked[0].item));
    }
  }
  return live;
}
function itmMatchedTrip(v,rows,now=Date.now()){
  const trip=String(v&&v.itmTripId||''), at=Number(v&&v.itmMatchedAt)||0;
  if(!trip||!at||now-at>ITM_IDENTITY_TTL_MS) return '';
  return itmTripAvailableForLine(trip,v&&v.line,rows)?trip:'';
}'''
replace_once('bus.html', browser_anchor, browser_helpers)

replace_once(
    'bus.html',
    "async function fetchLive(signal){\n  S.feedFallback=false; S.feedEmptyReason=''; S.feedPartial=false;\n  const wide=Date.now()-S.lastWideFetch>=FAR_FETCH_INTERVAL_MS;\n  if(wide) S.lastWideFetch=Date.now();\n  let batch=await fetchLiveBatch(wide,signal);",
    "async function fetchLive(signal){\n  S.feedFallback=false; S.feedEmptyReason=''; S.feedPartial=false;\n  const wide=Date.now()-S.lastWideFetch>=FAR_FETCH_INTERVAL_MS;\n  if(wide) S.lastWideFetch=Date.now();\n  const itmPromise=fetchItmIdentities(wide,signal).catch(()=>[]);\n  let batch=await fetchLiveBatch(wide,signal);",
)
replace_once(
    'bus.html',
    "  if(!out.length){\n    S.feedEmptyReason='No buses were reported in the latest feed for this area.';\n    return [];\n  }\n  return out;\n}",
    "  if(!out.length){\n    S.feedEmptyReason='No buses were reported in the latest feed for this area.';\n    return [];\n  }\n  applyItmIdentities(out,await itmPromise,Date.now());\n  return out;\n}",
)
replace_once(
    'bus.html',
    "  const allRows=timetableRowsForLine(l,new Date());\n  const identityInfo=timetableIdentityRows(allRows,identity);\n  const ttRows=identityInfo.rows;",
    "  const allRows=timetableRowsForLine(l,new Date());\n  const itmTrip=itmMatchedTrip(identity,allRows);\n  if(itmTrip){\n    const path=!!timetablePattern(itmTrip);\n    return {score:path?7:6,label:path?'BODS matched GTFS-RT journey and stop sequence':'BODS matched GTFS-RT journey',journeyMatch:true,pathMatch:path,matchStrength:5,matchedTrip:itmTrip,itmMatch:true,routeIdentityMatch:true};\n  }\n  const identityInfo=timetableIdentityRows(allRows,identity);\n  const ttRows=identityInfo.rows;",
)
replace_once(
    'bus.html',
    "    if(journeyChanged){delete rec.routeProjection;delete rec.corridorTrip;delete rec.corridorRemaining;delete rec.corridorConfirmedAt;delete rec.lastShownSnapshot;delete rec.lastShownAt;delete rec.lastShownArrivalAt;}",
    "    if(journeyChanged){delete rec.routeProjection;delete rec.corridorTrip;delete rec.corridorRemaining;delete rec.corridorConfirmedAt;delete rec.lastShownSnapshot;delete rec.lastShownAt;delete rec.lastShownArrivalAt;delete rec.itmTripId;delete rec.itmRouteId;delete rec.itmVehicleId;delete rec.itmStartTime;delete rec.itmStartDate;delete rec.itmPositionAt;delete rec.itmMatchedAt;delete rec.itmMatch;}",
)
replace_once(
    'bus.html',
    "liveVehicleIdentity,parseLivePayloads,fetchTimed,fetchLive,ingest,relevant,liveState:S,",
    "liveVehicleIdentity,parseLivePayloads,fetchTimed,fetchLive,fetchItmIdentities,applyItmIdentities,itmMatchedTrip,ingest,relevant,liveState:S,",
)

# Browser source-shape regression: the ITM helpers are now exported between
# fetchLive and ingest so browser tests can exercise exact-trip matching.
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /fetchLive,ingest,relevant,liveState:S/);",
    "assert.match(busSource, /fetchLive,fetchItmIdentities,applyItmIdentities,itmMatchedTrip,ingest,relevant,liveState:S/);",
)

# Journey-identity regression: prove ITM exact identity wins over a stale/wrong SIRI journey.
replace_once(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    "assert.match(busSource,/function setVehicleProgressIdentity\\(v,evidence,inference,matchedRow\\)/);",
    "assert.match(busSource,/function setVehicleProgressIdentity\\(v,evidence,inference,matchedRow\\)/);\nassert.match(busSource,/function applyItmIdentities\\(vehicles,identities,now=Date\\.now\\(\\)\\)/);\nassert.match(busSource,/BODS matched GTFS-RT journey/);",
)
replace_once(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    "      const destinationMissing=api.routeEvidence('61','','OUTBOUND',{...baseVehicle,dest:''});\n\n      const agreementConflict=api.journeyDestinationAgreement",
    "      const destinationMissing=api.routeEvidence('61','','OUTBOUND',{...baseVehicle,dest:''});\n      const itmVehicle={...baseVehicle,id:'itm-61',vehicleRef:'BUS-123',journey:'WRONG-SIRI-JOURNEY',dest:'Digbeth Moor Street Queensway',ts:now-15000};\n      api.applyItmIdentities([itmVehicle],[{entityId:'itm-entity',vehicleId:'BUS-123',tripId:'OUTBOUND',routeId:'61',lat:itmVehicle.lat,lon:itmVehicle.lon,timestamp:Math.floor(now/1000)}],now);\n      const itmExact=api.routeEvidence('61',itmVehicle.dest,itmVehicle.journey,itmVehicle);\n\n      const agreementConflict=api.journeyDestinationAgreement",
)
replace_once(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    "        destinationMissing:{journeyMatch:!!destinationMissing.journeyMatch,matchedTrip:String(destinationMissing.matchedTrip||''),conflict:!!destinationMissing.journeyDestinationConflict},\n        agreementConflict,",
    "        destinationMissing:{journeyMatch:!!destinationMissing.journeyMatch,matchedTrip:String(destinationMissing.matchedTrip||''),conflict:!!destinationMissing.journeyDestinationConflict},\n        itmExact:{journeyMatch:!!itmExact.journeyMatch,matchedTrip:String(itmExact.matchedTrip||''),itmMatch:!!itmExact.itmMatch,label:itmExact.label,score:itmExact.score},\n        agreementConflict,",
)
replace_once(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    "  assert.equal(result.destinationMissing.matchedTrip,'OUTBOUND');\n  assert.equal(result.agreementConflict.conflict,true);",
    "  assert.equal(result.destinationMissing.matchedTrip,'OUTBOUND');\n  assert.deepEqual(result.itmExact,{journeyMatch:true,matchedTrip:'OUTBOUND',itmMatch:true,label:'BODS matched GTFS-RT journey',score:6},'BODS ITM exact trip identity must outrank a conflicting raw SIRI journey/destination heuristic');\n  assert.equal(result.agreementConflict.conflict,true);",
)

subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
subprocess.run([sys.executable, '.github/scripts/sync-version.py', '--check'], check=True)

required = {
    'kerbside-backend/src/worker.js': ["path === '/gtfsrt'", 'parseGtfsRealtimeVehicleFeed(body)', 'gtfsRealtime: true'],
    'bus.html': ['ITM_IDENTITY_TTL_MS = 10*60*1000', 'function applyItmIdentities(vehicles,identities,now=Date.now())', 'BODS matched GTFS-RT journey', 'applyItmIdentities(out,await itmPromise,Date.now())'],
    'kerbside-backend/tests/journey-identity-regression.mjs': ['itmExact', 'BODS ITM exact trip identity'],
}
for path, tokens in required.items():
    text = read(path)
    missing = [token for token in tokens if token not in text]
    if missing:
        raise SystemExit(f'{path}: missing required 0.7.11 tokens: {missing}')

changed = set(subprocess.check_output(['git', 'diff', '--name-only', '--'], text=True).splitlines())
expected = {
    'VERSION',
    'bus.html',
    'kerbside-backend/package.json',
    'kerbside-backend/src/worker.js',
    'kerbside-backend/test/worker.test.js',
    'kerbside-backend/tests/browser-regression.mjs',
    'kerbside-backend/tests/journey-identity-regression.mjs',
}
if changed != expected:
    raise SystemExit(
        '0.7.11 patch changed the wrong generated files; '
        f'missing={sorted(expected - changed)}, unexpected={sorted(changed - expected)}'
    )

print('Prepared Kerbside 0.7.11: BODS ITM exact trip identity with SIRI fallback and sticky matching.')
