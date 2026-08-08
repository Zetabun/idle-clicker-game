#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

VERSION = '0.7.11'


def replace_exact(path, label, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: {label}: expected exactly one target, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


def insert_before(path, label, marker, addition):
    replace_exact(path, label, marker, addition + marker)


# ---------- Worker: proxy and decode BODS matched GTFS-RT ----------
worker = 'kerbside-backend/src/worker.js'
replace_exact(
    worker,
    'add official GTFS-RT decoder',
    "const LIVE_ENDPOINTS = [\n",
    "import GtfsRealtimeBindings from 'gtfs-realtime-bindings';\n\nconst LIVE_ENDPOINTS = [\n",
)
replace_exact(
    worker,
    'add matched-feed constants',
    "const LIVE_CACHE_WAIT_MS = 1800;\n",
    "const LIVE_CACHE_WAIT_MS = 1800;\n"
    "const MATCHED_ENDPOINT = 'https://data.bus-data.dft.gov.uk/api/v1/gtfsrtdatafeed/';\n"
    "const MATCHED_CACHE_SECONDS = 60;\n"
    "const MATCHED_FRESH_CACHE_MS = 5000;\n"
    "const MATCHED_STALE_CACHE_MS = 90 * 1000;\n",
)
replace_exact(
    worker,
    'route matched endpoint through the protected live-data gate',
    "  if (path === '/' || path === '/feed') {\n",
    "  if (path === '/' || path === '/feed' || path === '/matched') {\n",
)
replace_exact(
    worker,
    'dispatch matched endpoint',
    "    return withRateLimitHeaders(await liveFeed(request, env, ctx), rate);\n",
    "    const response = path === '/matched'\n"
    "      ? await matchedFeed(request, env, ctx)\n"
    "      : await liveFeed(request, env, ctx);\n"
    "    return withRateLimitHeaders(response, rate);\n",
)
replace_exact(
    worker,
    'advertise matched GTFS-RT capability',
    "    bods: Boolean(env.BODS_KEY),\n",
    "    bods: Boolean(env.BODS_KEY),\n"
    "    matchedGtfsRt: Boolean(env.BODS_KEY),\n",
)

matched_worker_code = r'''
function protobufNumber(value) {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

export function gtfsRtBoundingBox(value) {
  const bbox = normaliseBoundingBox(value);
  if (!bbox) return '';
  const [minLon, minLat, maxLon, maxLat] = bbox.split(',');
  // BODS GTFS-RT uses minLat,maxLat,minLon,maxLon. Kerbside's public Worker
  // API deliberately keeps the same minLon,minLat,maxLon,maxLat convention as
  // its SIRI endpoint and translates here at the upstream boundary.
  return [minLat, maxLat, minLon, maxLon].join(',');
}

export function compactGtfsRtFeed(feed, bbox, now = Date.now()) {
  const normalised = normaliseBoundingBox(bbox);
  if (!normalised) return [];
  const [minLon, minLat, maxLon, maxLat] = normalised.split(',').map(Number);
  const out = [];
  for (const entity of Array.isArray(feed && feed.entity) ? feed.entity : []) {
    const vehicle = entity && entity.vehicle;
    const trip = vehicle && vehicle.trip;
    const descriptor = vehicle && vehicle.vehicle;
    const position = vehicle && vehicle.position;
    const tripId = String(trip && trip.tripId || '').trim();
    const vehicleId = String(descriptor && descriptor.id || '').trim();
    const routeId = String(trip && trip.routeId || '').trim();
    const lat = Number(position && position.latitude);
    const lon = Number(position && position.longitude);
    const timestampSeconds = protobufNumber(vehicle && vehicle.timestamp);
    const timestamp = Number.isFinite(timestampSeconds) ? timestampSeconds * 1000 : NaN;
    if (!tripId || !vehicleId || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(timestamp)) continue;
    if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) continue;
    // Identity from an old vehicle position is more dangerous than no matched
    // identity at all around a terminus, so keep the auxiliary feed bounded.
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) continue;
    out.push({
      vehicleId,
      tripId,
      routeId,
      lat,
      lon,
      timestamp,
      startDate: String(trip && trip.startDate || ''),
      startTime: String(trip && trip.startTime || ''),
      directionId: trip && trip.directionId != null ? String(trip.directionId) : ''
    });
  }
  return out;
}

async function matchedFeed(request, env, ctx) {
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
  cacheUrl.pathname = '/__matched-cache';
  cacheUrl.search = `?bbox=${encodeURIComponent(bbox)}`;
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  const cacheAge = cachedAgeMs(cached);
  if (cached && cacheAge <= MATCHED_FRESH_CACHE_MS) {
    return cachedMatchedResponse(cached, request, env, false, cacheAge);
  }

  const refreshPromise = sharedRefreshMatchedCache(request, env, bbox, cache, cacheKey);
  if (cached) {
    const refreshed = await Promise.race([
      refreshPromise,
      sleep(configuredCacheWaitMs(env)).then(() => null)
    ]);
    if (refreshed && refreshed.response) return refreshed.response;
    if (!refreshed) ctx.waitUntil(refreshPromise.catch(() => {}));
    if (cacheAge <= MATCHED_STALE_CACHE_MS) return cachedMatchedResponse(cached, request, env, true, cacheAge);
  } else {
    const refreshed = await refreshPromise;
    if (refreshed.response) return refreshed.response;
  }

  return json({ error: 'Matched BODS GTFS-RT feed is temporarily unavailable', retryable: true }, 502, request, env, {
    'Retry-After': '15',
    'Cache-Control': 'no-store'
  });
}

async function sharedRefreshMatchedCache(request, env, bbox, cache, cacheKey) {
  const key = cacheKey.url;
  let pending = INFLIGHT_REFRESHES.get(key);
  if (!pending) {
    pending = refreshMatchedCache(request, env, bbox, cache, cacheKey)
      .finally(() => INFLIGHT_REFRESHES.delete(key));
    INFLIGHT_REFRESHES.set(key, pending);
  }
  const result = await pending;
  return { response: result.response ? result.response.clone() : null };
}

async function refreshMatchedCache(request, env, bbox, cache, cacheKey) {
  const upstream = new URL(MATCHED_ENDPOINT);
  upstream.searchParams.set('api_key', env.BODS_KEY);
  upstream.searchParams.set('boundingBox', gtfsRtBoundingBox(bbox));
  try {
    const { response, body } = await fetchWithTimeout(upstream.toString(), {
      headers: {
        Accept: 'application/x-protobuf,application/octet-stream;q=0.9,*/*;q=0.1',
        'User-Agent': 'Kerbside (+https://zetabun.github.io/idle-clicker-game/bus.html)'
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    }, LIVE_TIMEOUT_MS);
    if (!response.ok || !body || !body.byteLength) return { response: null };
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(body));
    const vehicles = compactGtfsRtFeed(feed, bbox);
    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', `public, max-age=5, s-maxage=${MATCHED_CACHE_SECONDS}`);
    headers.set('X-Kerbside-Upstream', String(response.status));
    headers.set('X-Kerbside-Cached-At', String(Date.now()));
    applyCors(headers, request, env);
    const successful = new Response(JSON.stringify({ vehicles }), { status: 200, headers });
    try { await cache.put(cacheKey, successful.clone()); } catch {}
    return { response: successful };
  } catch {
    return { response: null };
  }
}

function cachedMatchedResponse(cached, request, env, stale, ageMs) {
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
insert_before(worker, 'install matched GTFS-RT worker endpoint', 'export function validSiriPayload', matched_worker_code)

# Runtime dependency for protobuf decoding.
pkg_path = Path('kerbside-backend/package.json')
pkg = json.loads(pkg_path.read_text(encoding='utf-8'))
pkg.setdefault('dependencies', {})['gtfs-realtime-bindings'] = '2.0.0'
pkg_path.write_text(json.dumps(pkg, indent=2) + '\n', encoding='utf-8')

# ---------- Browser: enrich SIRI records with BODS-matched GTFS trip identity ----------
bus = 'bus.html'
replace_exact(
    bus,
    'add matched identity constants',
    "const ROUTE_INFERENCE_MIN_MARGIN = 90;\n",
    "const MATCHED_IDENTITY_GRACE_MS = 3*60*1000;\n"
    "const MATCHED_IDENTITY_MAX_SKEW_MS = 3*60*1000;\n"
    "const MATCHED_IDENTITY_MAX_METRES = 2500;\n"
    "const ROUTE_INFERENCE_MIN_MARGIN = 90;\n",
)
replace_exact(
    bus,
    'prefer matched GTFS trip identity',
    "function vehicleJourneyRef(v){ return String(v&&((v.corridorTracked&&v.corridorTrip)||v.journey)||''); }\n",
    "function vehicleJourneyRef(v){ return String(v&&(v.matchedTrip||(v.corridorTracked&&v.corridorTrip)||v.journey)||''); }\n",
)
replace_exact(
    bus,
    'retain optional physical GTFS vehicle id candidate',
    "        journey,vehicleRef:f.VehicleRef||'',corridorTracked:false,\n",
    "        journey,vehicleRef:f.VehicleRef||'',vehicleUniqueId:f.VehicleUniqueId||'',corridorTracked:false,\n",
)

matched_browser_code = r'''
function matchedUrlsForBoxes(boxes){
  if(!S.proxy) return [];
  return (Array.isArray(boxes)?boxes:[]).filter(Boolean).map(box=>workerUrl('/matched',{bbox:box}));
}
function matchedVehicleToken(value){
  const raw=String(value||'').trim();
  if(!raw) return '';
  return /^0+\d+$/.test(raw)?raw.replace(/^0+/,''):raw.toLowerCase();
}
async function fetchMatchedResponse(url,signal){
  const r=await fetchTimed(url,{headers:{Accept:'application/json'},cache:'no-store',signal},FETCH_TIMEOUT_MS);
  if(!r.ok) throw new Error('Matched feed returned '+r.status);
  const data=await r.json();
  return Array.isArray(data&&data.vehicles)?data.vehicles:[];
}
async function fetchMatchedBatch(signal){
  // The matched feed is an identity aid, not a coverage source. Fetch the
  // ordinary local box only; distant corridor scans continue to use the
  // existing SIRI/timetable inference if a vehicle is outside this window.
  const urls=matchedUrlsForBoxes(bboxes(false));
  if(!urls.length) return [];
  const settled=await Promise.allSettled(urls.map(url=>fetchMatchedResponse(url,signal)));
  const unique=new Map();
  for(const result of settled){
    if(result.status!=='fulfilled') continue;
    for(const record of result.value){
      const key=[record&&record.vehicleId,record&&record.tripId,record&&record.timestamp].join('|');
      if(record&&record.vehicleId&&record.tripId&&!unique.has(key)) unique.set(key,record);
    }
  }
  return [...unique.values()];
}
function applyMatchedIdentities(vehicles,matches,now=Date.now()){
  const index=new Map();
  for(const match of Array.isArray(matches)?matches:[]){
    const token=matchedVehicleToken(match&&match.vehicleId);
    if(!token||!match.tripId) continue;
    const list=index.get(token)||[];list.push(match);index.set(token,list);
  }
  let applied=0;
  for(const v of Array.isArray(vehicles)?vehicles:[]){
    const tokens=[matchedVehicleToken(v&&v.vehicleRef),matchedVehicleToken(v&&v.vehicleUniqueId)].filter(Boolean);
    const candidates=[];
    const seen=new Set();
    for(const token of tokens){
      for(const match of index.get(token)||[]){
        const key=[match.vehicleId,match.tripId,match.timestamp].join('|');
        if(seen.has(key)) continue;seen.add(key);
        const timestamp=Number(match.timestamp),referenceTs=Number.isFinite(Number(v.sourceTs))?Number(v.sourceTs):Number(v.ts);
        const skew=Math.abs(referenceTs-timestamp);
        if(!Number.isFinite(timestamp)||!Number.isFinite(referenceTs)||skew>MATCHED_IDENTITY_MAX_SKEW_MS) continue;
        const metres=dist(Number(v.lat),Number(v.lon),Number(match.lat),Number(match.lon));
        const allowed=Math.min(MATCHED_IDENTITY_MAX_METRES,250+skew/1000*22);
        if(!Number.isFinite(metres)||metres>allowed) continue;
        candidates.push({match,metres,skew});
      }
    }
    candidates.sort((a,b)=>a.metres-b.metres||a.skew-b.skew);
    const best=candidates[0],second=candidates[1];
    if(!best) continue;
    // A reused fleet/placeholder id can refer to two simultaneous buses. Do not
    // turn that into false certainty unless the nearest matched position is
    // clearly separated from the runner-up.
    if(second&&String(second.match.tripId)!==String(best.match.tripId)&&second.metres-best.metres<120) continue;
    v.matchedTrip=String(best.match.tripId);
    v.matchedRouteId=String(best.match.routeId||'');
    v.matchedTripAt=now;
    v.matchSource='gtfs-rt';
    v.matchedSticky=false;
    applied++;
  }
  return applied;
}
'''
replace_exact(
    bus,
    'install matched identity fetch helpers',
    "function feedUrls(wide){ return feedUrlsForBoxes(bboxes(wide)); }\n",
    "function feedUrls(wide){ return feedUrlsForBoxes(bboxes(wide)); }\n" + matched_browser_code,
)
replace_exact(
    bus,
    'start matched identity fetch alongside SIRI',
    "  let batch=await fetchLiveBatch(wide,signal);\n",
    "  const matchedPromise=fetchMatchedBatch(signal).catch(()=>[]);\n"
    "  let batch=await fetchLiveBatch(wide,signal);\n",
)
replace_exact(
    bus,
    'enrich live vehicles before ingestion',
    "  if(!out.length){\n    S.feedEmptyReason='No buses were reported in the latest feed for this area.';\n    return [];\n  }\n  return out;\n}\n\nasync function pollRouteCorridor(){\n",
    "  if(!out.length){\n    S.feedEmptyReason='No buses were reported in the latest feed for this area.';\n    return [];\n  }\n  const matched=await matchedPromise;\n  applyMatchedIdentities(out,matched,Date.now());\n  return out;\n}\n\nasync function pollRouteCorridor(){\n",
)

sticky_code = r'''
function retainMatchedIdentity(prev,v,now=Date.now()){
  if(!prev||!v||v.matchedTrip) return false;
  const sameService=String(prev.line||'')===String(v.line||'')
    &&String(prev.owner||prev.operator||'')===String(v.owner||v.operator||'');
  const matchedAt=Number(prev.matchedTripAt);
  if(!sameService||!prev.matchedTrip||!Number.isFinite(matchedAt)||now-matchedAt>MATCHED_IDENTITY_GRACE_MS) return false;
  v.matchedTrip=String(prev.matchedTrip);
  v.matchedRouteId=String(prev.matchedRouteId||'');
  v.matchedTripAt=matchedAt;
  v.matchSource=String(prev.matchSource||'gtfs-rt');
  v.matchedSticky=true;
  return true;
}
'''
insert_before(bus, 'install sticky matched identity helper', 'function ingest(list){', sticky_code)
replace_exact(
    bus,
    'retain matched identity across temporary GTFS-RT gaps',
    "    if(!prev && supersededByNewerRecord(v,batch)) continue;\n"
    "    const journeyChanged=!!(prev&&prev.journey&&v.journey&&prev.journey!==v.journey);\n"
    "    const routeIdentityChanged=!!(prev&&(String(prev.line)!==String(v.line)||String(prev.operator||'')!==String(v.operator||'')));\n",
    "    if(!prev && supersededByNewerRecord(v,batch)) continue;\n"
    "    retainMatchedIdentity(prev,v,now);\n"
    "    const matchedJourneyChanged=!!(prev&&prev.matchedTrip&&v.matchedTrip&&String(prev.matchedTrip)!==String(v.matchedTrip));\n"
    "    const matchedIdentityStable=!!(prev&&prev.matchedTrip&&v.matchedTrip&&String(prev.matchedTrip)===String(v.matchedTrip));\n"
    "    const rawJourneyChanged=!!(prev&&prev.journey&&v.journey&&prev.journey!==v.journey);\n"
    "    const journeyChanged=matchedJourneyChanged||(rawJourneyChanged&&!matchedIdentityStable);\n"
    "    const routeIdentityChanged=!!(prev&&(String(prev.line)!==String(v.line)||String(prev.operator||'')!==String(v.operator||'')));\n",
)
replace_exact(
    bus,
    'clear expired sticky identity before assigning new report',
    "    if(journeyChanged){delete rec.routeProjection;delete rec.corridorTrip;delete rec.corridorRemaining;delete rec.corridorConfirmedAt;delete rec.lastShownSnapshot;delete rec.lastShownAt;delete rec.lastShownArrivalAt;}\n"
    "    Object.assign(rec, v);\n",
    "    if(journeyChanged){delete rec.routeProjection;delete rec.corridorTrip;delete rec.corridorRemaining;delete rec.corridorConfirmedAt;delete rec.lastShownSnapshot;delete rec.lastShownAt;delete rec.lastShownArrivalAt;}\n"
    "    if(prev&&prev.matchedTrip&&!v.matchedTrip){delete rec.matchedTrip;delete rec.matchedRouteId;delete rec.matchedTripAt;delete rec.matchSource;delete rec.matchedSticky;}\n"
    "    Object.assign(rec, v);\n",
)

replace_exact(
    bus,
    'prefer exact matched GTFS trip rows',
    "  const allRows=timetableRowsForLine(l,new Date());\n"
    "  const identityInfo=timetableIdentityRows(allRows,identity);\n"
    "  const ttRows=identityInfo.rows;\n"
    "  const tripMatch=journey?uniqueCompatibleTrips(ttRows,journey):{items:[],ref:'',strength:0,ambiguous:false};\n"
    "  let journeyDestinationConflict=false, conflictingTrip='';\n",
    "  const allRows=timetableRowsForLine(l,new Date());\n"
    "  const realtimeTrip=String(identity&&identity.matchedTrip||'');\n"
    "  const exactRealtimeRows=realtimeTrip?timetableRows(new Date()).filter(row=>String(row.trip)===realtimeTrip):[];\n"
    "  const identityInfo=timetableIdentityRows(exactRealtimeRows.length?exactRealtimeRows:allRows,identity);\n"
    "  const ttRows=identityInfo.rows;\n"
    "  const tripMatch=journey?uniqueCompatibleTrips(ttRows,journey):{items:[],ref:'',strength:0,ambiguous:false};\n"
    "  const realtimeMatch=!!(realtimeTrip&&tripMatch.items.length&&!tripMatch.ambiguous&&String(tripMatch.ref)===realtimeTrip);\n"
    "  let journeyDestinationConflict=false, conflictingTrip='';\n",
)
replace_exact(
    bus,
    'make matched GTFS trip authoritative over stale SIRI destination',
    "  if(tripMatch.items.length){\n"
    "    const destination=journeyDestinationAgreement(tripMatch.items,dest);\n"
    "    if(!destination.conflict){\n"
    "      const path=!!timetablePattern(tripMatch.ref), literal=tripMatch.strength===4;\n"
    "      return {\n"
    "        score:path?6:5,\n"
    "        label:path?(literal?'exact journey and stop sequence matched':'unique journey alias and stop sequence matched'):(literal?'exact journey matched to timetable':'unique journey alias matched to timetable'),\n"
    "        journeyMatch:true,pathMatch:path,matchStrength:tripMatch.strength,matchedTrip:tripMatch.ref,\n"
    "        routeIdentityMatch:identityInfo.strong\n"
    "      };\n"
    "    }\n"
    "    journeyDestinationConflict=true; conflictingTrip=String(tripMatch.ref||'');\n"
    "  }\n",
    "  if(tripMatch.items.length){\n"
    "    const destination=journeyDestinationAgreement(tripMatch.items,dest);\n"
    "    if(!destination.conflict||realtimeMatch){\n"
    "      const path=!!timetablePattern(tripMatch.ref), literal=tripMatch.strength===4;\n"
    "      return {\n"
    "        score:path?6:5,\n"
    "        label:realtimeMatch?(path?'BODS matched journey and stop sequence':'BODS matched journey'):(path?(literal?'exact journey and stop sequence matched':'unique journey alias and stop sequence matched'):(literal?'exact journey matched to timetable':'unique journey alias matched to timetable')),\n"
    "        journeyMatch:true,pathMatch:path,matchStrength:tripMatch.strength,matchedTrip:tripMatch.ref,matchedRealtime:realtimeMatch,\n"
    "        journeyDestinationConflict:!!(realtimeMatch&&destination.conflict),\n"
    "        routeIdentityMatch:identityInfo.strong\n"
    "      };\n"
    "    }\n"
    "    journeyDestinationConflict=true; conflictingTrip=String(tripMatch.ref||'');\n"
    "  }\n",
)
replace_exact(
    bus,
    'allow matched GTFS identity through progress handover',
    "  const conflict=!!(evidence&&evidence.journeyDestinationConflict);\n",
    "  const conflict=!!(evidence&&evidence.journeyDestinationConflict&&!evidence.matchedRealtime);\n",
)
replace_exact(
    bus,
    'exact trip first in schedule matching',
    "  let rows=timetableRowsForLine(line,new Date(now)).filter(r=>{\n"
    "    if(r.at<now-3*60000 || r.at>now+3*3600000) return false;\n"
    "    return !dest || !r.head || destinationSimilarity(dest,r.head)>=.34;\n"
    "  });\n",
    "  const exactRows=journey?timetableRows(new Date(now)).filter(r=>String(r.trip)===String(journey)):[];\n"
    "  let rows=(exactRows.length?exactRows:timetableRowsForLine(line,new Date(now))).filter(r=>{\n"
    "    if(r.at<now-3*60000 || r.at>now+3*3600000) return false;\n"
    "    return exactRows.length || !dest || !r.head || destinationSimilarity(dest,r.head)>=.34;\n"
    "  });\n",
)
replace_exact(
    bus,
    'use matched timetable destination for filtering',
    "    const candidateDest=v.dest || (directionSchedule&&directionSchedule.head) || '';\n",
    "    const candidateDest=evidence.matchedRealtime&&directionSchedule&&directionSchedule.head\n"
    "      ? directionSchedule.head\n"
    "      : v.dest || (directionSchedule&&directionSchedule.head) || '';\n",
)
replace_exact(
    bus,
    'show matched identity source in row matching diagnostics',
    "    const match=geometry?(evidence.inferredJourney?'GPS route inference':'journey path'):evidence.journeyMatch?(evidence.matchStrength===4?'exact journey':'unique journey alias'):scheduleBacked?'timetable linked':'route evidence';\n",
    "    const match=geometry?(evidence.inferredJourney?'GPS route inference':'journey path'):evidence.matchedRealtime?'BODS matched journey':evidence.journeyMatch?(evidence.matchStrength===4?'exact journey':'unique journey alias'):scheduleBacked?'timetable linked':'route evidence';\n",
)
replace_exact(
    bus,
    'show matched timetable destination over stale SIRI handover',
    "    const heading=String(v.dest||'').trim();\n",
    "    const heading=String((evidence.matchedRealtime&&directionSchedule&&directionSchedule.head)||v.dest||'').trim();\n",
)
replace_exact(
    bus,
    'export matched identity helpers to regressions',
    "liveVehicleIdentity,parseLivePayloads,fetchTimed,fetchLive,ingest,relevant,liveState:S,",
    "liveVehicleIdentity,parseLivePayloads,fetchTimed,fetchLive,fetchMatchedBatch,applyMatchedIdentities,retainMatchedIdentity,ingest,relevant,liveState:S,",
)

# ---------- Regression coverage ----------
worker_test = 'kerbside-backend/test/worker.test.js'
replace_exact(
    worker_test,
    'import matched decoder helpers',
    "import { MAX_BBOX_SPAN, normaliseBoundingBox, resetWorkerStateForTests, routeRequest, validSiriPayload } from '../src/worker.js';\n",
    "import GtfsRealtimeBindings from 'gtfs-realtime-bindings';\n"
    "import { MAX_BBOX_SPAN, compactGtfsRtFeed, gtfsRtBoundingBox, normaliseBoundingBox, resetWorkerStateForTests, routeRequest, validSiriPayload } from '../src/worker.js';\n",
)
matched_worker_test = r'''

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
        trip: { tripId: 'GTFS-TRIP-61', routeId: 'GTFS-ROUTE-61' },
        position: { latitude: 52.5, longitude: -2.1, bearing: 90 },
        timestamp: nowSeconds,
        vehicle: { id: 'BUS-740' }
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
      vehicleId: body.vehicles[0].vehicleId,
      tripId: body.vehicles[0].tripId,
      routeId: body.vehicles[0].routeId
    }, { vehicleId: 'BUS-740', tripId: 'GTFS-TRIP-61', routeId: 'GTFS-ROUTE-61' });
    assert.equal(runtime.state.fetches, 1);
  } finally {
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
'''
insert_before(worker_test, 'add matched worker regressions', "test('accepts only SIRI vehicle-monitoring payloads', () => {", matched_worker_test)

journey_test = 'kerbside-backend/tests/journey-identity-regression.mjs'
replace_exact(
    journey_test,
    'exercise matched identity in journey regression',
    "      const agreementCompatible=api.journeyDestinationAgreement([{head:'Digbeth Moor Street Queensway'}],'Moor Street Queensway');\n\n      const blockedVehicle={journey:'OUTBOUND',corridorTrip:''};\n",
    "      const agreementCompatible=api.journeyDestinationAgreement([{head:'Digbeth Moor Street Queensway'}],'Moor Street Queensway');\n\n"
    "      const matchedInput={...baseVehicle,vehicleRef:'BUS-740',vehicleUniqueId:'',journey:'OPAQUE-SIRI-JOURNEY',sourceTs:now-1000,ts:now-1000};\n"
    "      const matchedCount=api.applyMatchedIdentities([matchedInput],[{vehicleId:'BUS-740',tripId:'OUTBOUND',routeId:'R61',lat:baseVehicle.lat,lon:baseVehicle.lon,timestamp:now-1000}],now);\n"
    "      const matchedRealtime=api.routeEvidence('61',matchedInput.dest,api.vehicleJourneyRef(matchedInput),matchedInput);\n"
    "      const stickyIncoming={...baseVehicle,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};\n"
    "      const stickyPrev={...baseVehicle,matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedTripAt:now-30000,matchSource:'gtfs-rt'};\n"
    "      const stickyRetained=api.retainMatchedIdentity(stickyPrev,stickyIncoming,now);\n"
    "      const expiredIncoming={...baseVehicle};\n"
    "      const stickyExpired=api.retainMatchedIdentity({...stickyPrev,matchedTripAt:now-4*60*1000},expiredIncoming,now);\n\n"
    "      const blockedVehicle={journey:'OUTBOUND',corridorTrip:''};\n",
)
replace_exact(
    journey_test,
    'return matched identity regression values',
    "        agreementCompatible,\n        blockedProgress,\n",
    "        agreementCompatible,\n"
    "        matchedIdentity:{count:matchedCount,trip:matchedInput.matchedTrip,source:matchedInput.matchSource,realtime:!!matchedRealtime.matchedRealtime,journeyMatch:!!matchedRealtime.journeyMatch,matchedTrip:String(matchedRealtime.matchedTrip||''),conflict:!!matchedRealtime.journeyDestinationConflict},\n"
    "        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},\n"
    "        blockedProgress,\n",
)
replace_exact(
    journey_test,
    'assert matched identity and sticky fallback',
    "  assert.equal(result.agreementCompatible.conflict,false,'minor stop-name wording differences should remain compatible');\n\n  assert.deepEqual(result.blockedProgress",
    "  assert.equal(result.agreementCompatible.conflict,false,'minor stop-name wording differences should remain compatible');\n"
    "  assert.deepEqual(result.matchedIdentity,{count:1,trip:'OUTBOUND',source:'gtfs-rt',realtime:true,journeyMatch:true,matchedTrip:'OUTBOUND',conflict:true},'BODS matched GTFS trip must outrank an opaque/stale SIRI journey and destination handover');\n"
    "  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap but expire rather than stick indefinitely');\n\n"
    "  assert.deepEqual(result.blockedProgress",
)

browser_test = 'kerbside-backend/tests/browser-regression.mjs'
insert_before(
    browser_test,
    'assert matched identity architecture is present',
    "assert.match(busSource, /const GPS_LIVE_DISPLAY_SECONDS = 120/);\n",
    "assert.match(busSource, /const MATCHED_IDENTITY_GRACE_MS = 3\\*60\\*1000/);\n"
    "assert.match(busSource, /function applyMatchedIdentities\\(vehicles,matches,now=Date\\.now\\(\\)\\)/);\n"
    "assert.match(busSource, /function retainMatchedIdentity\\(prev,v,now=Date\\.now\\(\\)\\)/);\n"
    "assert.match(busSource, /evidence\\.matchedRealtime\\?'BODS matched journey'/);\n",
)

Path('VERSION').write_text(VERSION + '\n', encoding='utf-8')
subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)

print(f'Prepared Kerbside {VERSION}: BODS GTFS-RT identity-first matching with sticky SIRI fallback.')
