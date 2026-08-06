import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as playwright from 'playwright';

/* WebKit alone covered mobile Safari, which is the platform most of this app's
   layout was fought over. It cannot catch a Chromium-only layout, Cache API,
   notification or input difference, and Chromium is what most Android users
   run. Both engines drive the same suite at the same phone-sized viewport, so
   an Android-sized Chromium run asserts the same behaviour rather than a
   separate, weaker set. Selected by KERBSIDE_BROWSER; WebKit stays the default
   so a bare `npm run test:browser` is unchanged. */
const ENGINE_NAME = process.env.KERBSIDE_BROWSER || 'webkit';
const engine = playwright[ENGINE_NAME];
if (!engine || typeof engine.launch !== 'function') {
  throw new Error(`KERBSIDE_BROWSER=${ENGINE_NAME} is not a Playwright engine (expected webkit, chromium or firefox)`);
}
console.log(`Browser regression engine: ${ENGINE_NAME}`);

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..', '..');
const busSource = await readFile(path.join(root, 'bus.html'), 'utf8');
const leafletRoot = path.join(root, 'kerbside-backend', 'vendor', 'leaflet');
const leafletJs = await readFile(path.join(leafletRoot, 'leaflet.js'));
const leafletCss = await readFile(path.join(leafletRoot, 'leaflet.css'));
const leafletLicense = await readFile(path.join(leafletRoot, 'LICENSE'), 'utf8');
assert.equal(createHash('sha256').update(leafletJs).digest('base64'), '20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=');
assert.equal(createHash('sha256').update(leafletCss).digest('base64'), 'p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=');
assert.match(leafletLicense, /Redistribution and use in source and binary forms/);
assert.match(busSource, /const FAR_VEH_DIST = 18000/);
assert.match(busSource, /function bboxes\(wide\)/);
assert.match(busSource, /if\(!wide\) return \[boxAround\(c,MAX_VEH_DIST\)\]/);
assert.doesNotMatch(busSource, /S\.radius\+MAX_VEH_DIST/);
assert.match(busSource, /S\.anchor=null; drawAnchor\(\); updateDirLabels\(\);/);
assert.doesNotMatch(busSource, /loadWorkerHistory/);
assert.doesNotMatch(busSource, /copyStopBtn/);
assert.doesNotMatch(busSource, /WATCHED_STOPS/);
assert.match(busSource, /geocodeRun=0, geocodeAbort=null/);
assert.match(busSource, /countrycode=GB&bbox=-9,49,3,61/);
assert.match(busSource, /fetchTimed\(url,\{signal:ctl\.signal\},8000\)/);
assert.match(busSource, /if\(run!==geocodeRun\) return/);
assert.match(busSource, /const LINE_KEY = 'kerbside\.lines\.v2'/);
assert.match(busSource, /function lineLearningKey\(value\)/);
assert.doesNotMatch(busSource, /LINES\[v\.line\]/);
assert.doesNotMatch(busSource, /st:'Street'/);
assert.match(busSource, /if\(bare==='st'\) return 'St'/);
// The hold-open is for momentary weak evidence. Consecutive fixes measurably
// retreating from the stop are not momentary, and holding on that kept a bus
// counting down after it had turned away. Bearing alone must still be holdable.
assert.match(busSource, /function movementRetreating\(v\)\{ return S\.stop \? movementTrend\(v,S\.stop\)<0 : false; \}/);
assert.match(busSource, /if\(\(reason==='direction'\|\|reason==='away'\)&&movementRetreating\(v\)\) return false;/);
assert.match(busSource, /const ALERT_MISSING_GRACE_MS = 120\*1000/);
assert.match(busSource, /function retainFiredAlarm\(alarm,now\)/);
// checkAlarms must run even when the board is empty — that is precisely when a
// fired alarm needs to notice its bus is gone and re-arm for the next one.
assert.match(busSource, /\}\n  \/\/ Runs for an empty board too[\s\S]{0,180}\n  checkAlarms\(liveRows\);\n  renderVehicles\(liveRows\)/);
// knownRoutes() must not add mapped/observed lines into the cached timetable
// route Set, or routeEvidence() reports them as "timetable verified".
assert.match(busSource, /const timetableSet=timetableRouteSet\(\);/);
assert.match(busSource, /const set=new Set\(timetableSet\);/);
assert.doesNotMatch(busSource, /const set=timetableRouteSet\(\);/);
// Saved stop restore compares ids as strings on both discovery paths.
assert.doesNotMatch(busSource, /S\.stops\.find\(s=>s\.id===S\.pendingStopId\)/);
assert.match(busSource, /function mapVehicleVisible/);
// One Leaflet marker per bus froze the map when a city's feed arrived at once:
// 400 markers stalled a frame for ~1s, 700 rendered 3 frames in 2.2s. Cap the
// markers without capping the vehicles that matching and ETAs run over.
assert.match(busSource, /const MAX_VEHICLE_MARKERS = 120/);
assert.match(busSource, /function vehicleMarkerPlan\(rows,now=Date\.now\(\)\)/);
// Listed, selected and followed buses outrank background markers for the cap.
assert.match(busSource, /eligible\.push\(\{v,shown,rank:keep\?-1:metres\}\)/);
// The board lists only routes that serve this stop; the map drew every fresh
// bus within nine kilometres, which in a city is a screen of buses the user
// cannot catch from here. Background markers are limited to the same serving
// routes, with three escapes so nothing relevant is lost — a bus on the board,
// the selected bus, and one followed upstream for this stop are always drawn —
// and the filter disables itself when no route is known for the stop.
assert.match(busSource, /const canFilter=!!\(S\.onlyServing&&S\.stop&&servingReady\(\)\);/);
assert.match(busSource, /const keep=shown\|\|S\.selected===v\.id\|\|!!v\.corridorTracked;/);
assert.match(busSource, /const serves=!canFilter\|\|routeEvidence\(v\.line,v\.dest,vehicleJourneyRef\(v\),v\)\.score>=2;/);
assert.match(busSource, /if\(!keep&&\(!nearby\|\|!serves\)\) continue;/);
assert.match(busSource, /const draw=eligible\.slice\(0,MAX_VEHICLE_MARKERS\)/);
assert.match(busSource, /if\(!plan\.drawIds\.has\(id\)\)\{ vehLayer\.removeLayer\(m\); S\.markers\.delete\(id\); \}/);
// The live feed is fetched around the origin, so it must not queue behind stop
// discovery falling back to a slow Overpass lookup.
assert.match(busSource, /if\(run===S\.locationRun\) startPolling\(\);\n  const anchorPromise=findAnchor\(lat,lon,run\);\n  await findStops\(lat,lon,run\);/);
assert.match(busSource, /function timetablePatternRecord\(journey,preferredPatternId\)/);
assert.match(busSource, /function journeyProgress\(v\)/);
assert.match(busSource, /routeLayer=L\.layerGroup/);
assert.match(busSource, /data-route-map/);
assert.match(busSource, /progress\.pattern\.shape/);
assert.match(busSource, /const APP_VERSION = '0\.7\.2'/);
// Stop attributes are sharded by ATCO administrative area, which is the first
// three characters of the code; the browser must never fetch the 101 MB register.
assert.match(busSource, /const NAPTAN_PREFIX_LENGTH = 3;/);
assert.doesNotMatch(busSource, /naptan\.api\.dft\.gov\.uk/);
// A stop with no published attributes leaves the line hidden rather than empty.
assert.match(busSource, /function stopFactsHtml\(stop\)/);
assert.match(busSource, /el\.hidden=!html;/);
assert.match(busSource, /class="brand-icon" src="data:image\/svg\+xml,%3Csvg/);
assert.match(busSource, /\.brand-icon\{display:block;width:38px;height:38px;flex:0 0 38px;object-fit:contain\}/);
assert.match(busSource, /viewBox%3D%220%200%20192%20192%22/);
assert.match(busSource, /kerbside-amber/);
assert.doesNotMatch(busSource, /kerbside-header\.svg/);
assert.doesNotMatch(busSource, /%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%22192%22%20height%3D%22192%22/);
assert.match(busSource, /\.brand-icon\{display:none\}/);
// The compact mobile header keeps location, direction and settings on one row.
assert.match(busSource, /grid-template-areas:"brand brand brand" "search directions settings"/);
assert.ok(busSource.includes('<button id="dIn" aria-pressed="false">'));
assert.ok(busSource.includes('<button id="dAll" aria-pressed="true">'));
assert.match(busSource, /dir:'all'/);
assert.match(busSource, /\.brand-icon\{display:block;width:38px;height:38px/);
assert.doesNotMatch(busSource, /\.searchwrap\{order:3;flex-basis:100%\}/);
assert.match(busSource, /age<=4\*60\*1000/);
assert.match(busSource, /points\.length===2\?1:2/);
assert.match(busSource, /function boardRefreshCanRender/);
assert.match(busSource, /feedRefreshing:false/);
assert.match(busSource, /function clearJourneyRoute/);
assert.match(busSource, /function journeyRouteContext/);
assert.match(busSource, /function shouldClearJourneyRoute/);
assert.match(busSource, /function ignoreMapContextMenu\(e\)/);
assert.match(busSource, /function selectStopFromMap\(s\)/);
assert.match(busSource, /selectStop\(s,true\);\n  setAppView\('times'\);/);
assert.match(busSource, /m\.on\('click',\(\)=>selectStopFromMap\(s\)\)/);
assert.doesNotMatch(busSource, /m\.on\('click',\(\)=>selectStop\(s,true\)\)/);
assert.match(busSource, /map\.on\('contextmenu',ignoreMapContextMenu\)/);
/* The producer is a property of the ServiceDelivery, so it must be resolved once
   per delivery rather than per vehicle. Spreading every descendant of the
   delivery inside the activity loop cost 5.3 million element visits and 667ms of
   a 670ms parse on a real 417-vehicle response, repeated per bounding box per
   poll; memoised it is 0.3ms for the same answer. */
assert.match(busSource, /const PRODUCER_REF_CACHE=new WeakMap\(\);/);
assert.match(busSource, /const cached=PRODUCER_REF_CACHE\.get\(delivery\);/);
assert.doesNotMatch(busSource, /const producerNode=\[\.\.\.delivery\.getElementsByTagName\('\*'\)\]/);
assert.match(busSource, /function routePatternMovementFit\(pattern,v,stop\)/);
assert.match(busSource, /function inferVehicleJourneyPattern\(v,stop,now=Date\.now\(\)\)/);
assert.match(busSource, /function visualRoutePosition\(v,pattern,metres\)/);
// Only ~60% of national patterns carry a GTFS road shape (London ~2%). The rest
// store the ordered stop positions, which the ETA and journey progress already
// measure along, so the glide follows that corridor instead of projecting the
// last bearing straight on through every bend. Measured on a 1500m-radius bend:
// 53m average error before, 7m after, against 5m for a true shape.
assert.match(busSource, /const VISUAL_SHAPE_MAX_OFFSET = 500/);
assert.match(busSource, /const VISUAL_CORRIDOR_MAX_OFFSET = 200/);
assert.match(busSource, /if\(projection\.metres>\(pattern\.shape\?VISUAL_SHAPE_MAX_OFFSET:VISUAL_CORRIDOR_MAX_OFFSET\)\) return null;/);
assert.doesNotMatch(busSource, /if\(!v\|\|!pattern\|\|!pattern\.shape\|\|!isFinite\(metres\)/);
/* Kerbside must never claim a road it cannot verify — but refusing to draw
   anything was the wrong way to honour that. Only 59.8% of national patterns
   carry a GTFS shape, London 2.1%, and all 400 journeys calling at Piccadilly
   Gardens carry none, so the commonest case was a disabled button over an empty
   map. The corridor is now drawn from the ordered stops, and the honesty moves
   into how it is presented, and the three cases must stay visually and verbally
   distinct: an official GTFS shape, a validated OpenStreetMap road, and a plain
   line through the ordered stops. Only the last is dashed and thinnest, and only
   the first is called accurate. These assertions pin that presentation. */
assert.match(busSource, /const progress=row\?journeyProgress\(row\.v\):null;\n  if\(!progress\|\|!progress\.pattern\) return;/);
assert.match(busSource, /let split=splitPatternAt\(progress\.pattern,progress\.vehicle\), road=false;/);
assert.match(busSource, /weight:shaped\?5:road\?4\.5:3\.5,opacity:shaped\?\.92:road\?\.88:\.8,dashArray:\(shaped\|\|road\)\?null:'7 6'/);
assert.match(busSource, /progress\.pattern\.shape\?'View accurate route on map':roadDrawn\?'View road route on map':'View route through stops on map'/);
assert.match(busSource, /'Official GTFS route shape'\n?\s*:roadDrawn\?'OpenStreetMap road shape · ordered stops guide progress'/);
// The dead end it replaced must not come back.
assert.doesNotMatch(busSource, /Accurate road shape unavailable/);
assert.doesNotMatch(busSource, /data-route-map="'\+esc\(v\.id\)\+'" '\+\(progress\.pattern\.shape\?'':'disabled'\)/);
// The glide must span the vehicle's own reporting gap. Capping the lead below
// that interval made the marker cover part of the distance, stall, then leap
// the rest when the next fix landed.
assert.match(busSource, /const VISUAL_LEAD_MARGIN = 1\.25/);
assert.match(busSource, /const expectedGap=Math\.min\(VISUAL_MAX_LEAD_SECONDS,Math\.max\(VISUAL_MIN_LEAD_SECONDS,cadence\*VISUAL_LEAD_MARGIN\)\)/);
assert.match(busSource, /const lead=Math\.min\(age,expectedGap\)/);
assert.doesNotMatch(busSource, /Math\.max\(4,cadence\*\.9\)/);
// Reaching the ceiling must hold the last estimate, not throw the marker back
// to the confirmed point by the whole distance it was shown covering.
assert.doesNotMatch(busSource, /age>Math\.max\(60,cadence\*2\.5\)/);
// Journey stop list: the stop the bus is standing at is current, not passed.
// An absolutely positioned ::after only covers the visible screenful of a
// scrolling container, so the dot texture ran out partway down a long board.
assert.match(busSource, /\.boardscroll\{[\s\S]{0,400}background-attachment:local;/);
assert.doesNotMatch(busSource, /\.boardscroll::after\{/);
// Rebuilding the board wholesale each refresh threw the reader back to the top.
assert.match(busSource, /function captureBoardScroll\(\)/);
assert.match(busSource, /function restoreBoardScroll\(state\)/);
assert.match(busSource, /const scrollState=captureBoardScroll\(\);/);
assert.match(busSource, /restoreBoardScroll\(scrollState\);/);
// The expanded list belongs to the previously rendered vehicle, not S.selected,
// which has already changed by the time render() runs.
assert.match(busSource, /let renderedDetailId='';/);
assert.match(busSource, /stopsKey:renderedDetailId/);
assert.match(busSource, /const atHere=index===progress\.atIndex/);
assert.match(busSource, /if\(index<progress\.nextIndex && !atHere\) states\.push\('passed'\)/);
assert.match(busSource, /if\(atHere\) states\.push\('at'\)/);
assert.match(busSource, /\.journey-stop\.at\{color:var\(--live\);font-weight:700;opacity:1\}/);
assert.match(busSource, /function rememberRouteScanVehicle\(v,now=Date\.now\(\)\)/);
assert.match(busSource, /const stationaryFix=/);
assert.match(busSource, /const routeAhead=/);
assert.match(busSource, /confirmedVehicle,stops,nextIndex/);
assert.match(busSource, /const inference=!evidence\.journeyMatch\?inferVehicleJourneyPattern/);
// collect() already resolved the journey geometry; estimate() must reuse it
// rather than projecting every vehicle onto its whole pattern a second time.
assert.match(busSource, /const est=estimate\(v,S\.stop,evidence,geometry\)/);
assert.match(busSource, /function estimate\(v, stop, evidenceOverride, geometryOverride\)/);
assert.match(busSource, /geometryOverride!==undefined\?geometryOverride:journeyGeometry\(v,stop\)/);
assert.match(busSource, /Current position/);
assert.match(busSource, /-webkit-touch-callout:none/);
assert.doesNotMatch(busSource, /Town centre moved/);
assert.doesNotMatch(busSource, /S\.anchor=\{lat:e\.latlng\.lat/);
assert.doesNotMatch(busSource, /function renderSelectedJourney\(rows\)\{\n  routeLayer\.clearLayers\(\);/);
assert.match(busSource, /function meaningfulTripTokens\(value\)/);
assert.match(busSource, /function tripRefMatchStrength\(a,b\)/);
assert.match(busSource, /function uniqueCompatibleTrips\(items,journey,getRef\)/);
assert.match(busSource, /possible GPS match ambiguous/);
assert.match(busSource, /function timetableDirection\(value\)/);
assert.match(busSource, /function scheduledJourneyDirection\(row\)/);
assert.match(busSource, /direction==='inbound'/);
assert.doesNotMatch(busSource, /direction==='0' \|\| direction\.startsWith\('in'\)/);
assert.match(busSource, /const directionSchedule=est\.schedule\|\|matchedRow/);
assert.match(busSource, /scheduledJourneyDirection\(directionSchedule\)/);
assert.match(busSource, /scheduledJourneyDirection\(r\)/);
assert.match(busSource, /diagnostics\.recovered\+\+/);
// Leaflet pans the map to keep an open popup in view whenever its marker moves,
// which fought anyone reading a route while their bus was selected.
assert.match(busSource, /m\.bindPopup\(popup,\{autoPan:false\}\)/);
/* OpenStreetMap road geometry, for the drawn line only. Journey matching, ETAs
   and progress must keep reading the ordered stops, so nothing that produces a
   number depends on geometry this app cannot verify — that separation is the
   whole safety argument and these assertions hold it in place. The geometry has
   to fit the journey's stops before it is drawn, and it is fetched on demand and
   cached rather than pulled for every pattern. */
assert.match(busSource, /const ROAD_SHAPE_MEAN_LIMIT = 40;/);
assert.match(busSource, /const ROAD_SHAPE_COVER_MIN = 0\.9;/);
assert.match(busSource, /function stitchRoadWays\(ways,stops\)/);
assert.match(busSource, /function roadShapeFit\(points,stops\)/);
assert.match(busSource, /if\(!fit\|\|fit\.mean>ROAD_SHAPE_MEAN_LIMIT\|\|fit\.cover<ROAD_SHAPE_COVER_MIN\) continue;/);
assert.match(busSource, /\[type=route\]\[route=bus\]/);
assert.match(busSource, /await overpass\(roadShapeQuery\(line,stops\),true\)/);
assert.match(busSource, /OpenStreetMap road shape · ordered stops guide progress/);
// Progress and the journey geometry used for ETAs must not read the road shape.
assert.doesNotMatch(busSource, /function journeyGeometry[\s\S]{0,900}roadShapeFor/);
assert.doesNotMatch(busSource, /function journeyProgress\(v\)[\s\S]{0,900}roadShapeFor/);
/* Journey identity comes from the origin departure time, the only reference that
   crosses between the timetable and the live feed. The SIRI journey reference
   cannot be compared to a GTFS trip id, so without this scores 5 and 6 are
   unreachable nationally. Uniqueness is required, and a shard built before
   version 10 carries no origin time, which must fall back rather than break. */
assert.match(busSource, /const ORIGIN_MATCH_TOLERANCE_MS = 90\*1000;/);
assert.match(busSource, /function originTimeMatches\(row,identity\)/);
assert.match(busSource, /function uniqueOriginTrips\(rows,identity\)/);
assert.match(busSource, /if\(refs\.length!==1\) return \{items:\[\],ref:'',ambiguous:true\};/);
assert.match(busSource, /const originMatch=uniqueOriginTrips\(ttRows,identity\);/);
assert.match(busSource, /originMatch:true,routeIdentityMatch:identityInfo\.strong/);
assert.match(busSource, /originAt:originMins===null\?null:|const originAt=hasOrigin\?serviceDepartureTime\(serviceDate,originRaw\)\.getTime\(\):null;/);
assert.match(busSource, /no bus is working this departure yet/);
/* The reason a scheduled row has no live bus must know which buses are already
   listed against other departures, or a route running normally reports a
   matching failure on every later row. */
assert.match(busSource, /function scheduleLiveReason\(schedule,liveRows\)/);
assert.match(busSource, /liveReason:scheduleLiveReason\(schedule,liveRows\)/);
assert.match(busSource, /function journeyRefComparable\(ref\)/);
assert.match(busSource, /already listed/);
assert.match(busSource, /GPS recovered/);
assert.doesNotMatch(busSource, /operator GPS unavailable/);
assert.doesNotMatch(busSource, /GPS received · filtered/);
assert.match(busSource, /no fresh GPS found nearby/);
assert.match(busSource, /no fresh GPS for this route/);
assert.match(busSource, /destination match uncertain/);
assert.match(busSource, /possible GPS match was filtered/);
assert.match(busSource, /no unique journey match/);
assert.match(busSource, /function versionedDataUrl\(path,built\)/);
assert.match(busSource, /DATA_TILE_CACHE\.clear\(\); DATA_TILE_NEGATIVE\.clear\(\); DATA_DEPARTURE_CACHE\.clear\(\); DATA_PATTERN_SHARD_CACHE\.clear\(\); DATA_PATTERN_RETRY\.clear\(\); PATTERN_CACHE\.clear\(\);/);
assert.match(busSource, /function indexTimetableRows\(rows\)/);
assert.match(busSource, /function timetableRowsForLine\(line,now\)/);
assert.match(busSource, /TIMETABLE_ROUTE_CACHE=\{rows,minute,set\}/);
assert.doesNotMatch(busSource, /const ttRows=timetableRows\(new Date\(\)\)\.filter/);
assert.match(busSource, /function patternProjectionCandidates\(points,lat,lon,minSegment\)/);
assert.match(busSource, /function choosePatternProjection\(candidates,options\)/);
assert.match(busSource, /function projectVehicleToPattern\(pattern,v\)/);
assert.match(busSource, /rollback>80/);
assert.doesNotMatch(busSource, /user-scalable=no/);
assert.doesNotMatch(busSource, /maximum-scale=1/);
// Page zoom is off across the whole app, Settings included. The map is not an
// exception to that: Leaflet drives its pinch and double-tap from JavaScript
// and its stylesheet asks for touch-action:none, so letting the map fall back
// to the browser default zoomed the page instead of the map.
// Direction must be measured against the same validated anchor the label uses.
// Naming an irrelevant town was fixed without fixing the verdict drawn from it,
// so the board still dropped buses at the direction gate on a meaningless axis.
assert.match(busSource, /function directionAnchor\(\)/);
assert.match(busSource, /function gpsMovementDirection\(v\)\{const anchor=directionAnchor\(\);/);
assert.doesNotMatch(busSource, /movementTrend\(v,S\.anchor\)/);
assert.doesNotMatch(busSource, /bearingTo\(v\.lat,v\.lon,S\.anchor\.lat,S\.anchor\.lon\)/);
// Direction is decided per vehicle, so the scan behind it is time-bounded.
assert.match(busSource, /const ANCHOR_RELEVANCE_TTL_MS = 1000;/);
// Naming the anchor scans every timetable row for a pattern that passes it, so
// it is resolved once per collect pass. Inside the vehicle loop it ran per bus,
// and collect runs twice per render, which starved the pattern loader.
assert.match(busSource, /const namedAnchor=boardAnchorName\(\);\s*\n\s*for\(const v of S\.vehicles\.values\(\)\)\{/);
// Both ways into the Stats panel go through renderNetworkStats: with a cached
// manifest the refresh wrapper is skipped entirely, so the feed cards must be
// refreshed from the renderer or they stay empty.
assert.match(busSource, /renderGpsStats\(\);[\s\S]{0,240}refreshFeedStats\(\);\n\}/);
assert.doesNotMatch(busSource, /async function refreshNetworkStats\(force\)\{\s*\n\s*refreshFeedStats\(\);/);
// The town anchor is the nearest OSM place by distance alone, so it may be
// somewhere no route from this stop goes. Its name is only used once a loaded
// pattern is seen to pass it; unknown must not be treated as no, or the label
// flickers while the patterns are still arriving.
assert.match(busSource, /function anchorServedByRoutes\(\)/);
assert.match(busSource, /if\(!records\.size\)\{ ANCHOR_RELEVANCE=\{key,at:now,value:null\}; return null; \}/);
assert.match(busSource, /return anchorServedByRoutes\(\)===false\?'':S\.anchor\.name;/);
assert.doesNotMatch(busSource, /const namedAnchor=S\.anchor&&!S\.anchor\.synthetic/);
// A bus to Halesowen is heading towards Halesowen, not "out of Birmingham".
// The town anchor is a fallback for a journey that reports no destination, and
// the arrow on the chip carries the in/out sense the wording used to spell out.
assert.match(busSource, /const directionWord=heading\?'towards '\+heading/);
assert.match(busSource, /const dirChip=r\.directionWord\?dirArrow\+r\.directionWord/);
assert.match(busSource, /html,body\{touch-action:pan-x pan-y\}/);
assert.match(busSource, /#topbar,#board,#viewbar,#scrim\{touch-action:pan-x pan-y\}/);
assert.match(busSource, /#map\{touch-action:none\}/);
assert.doesNotMatch(busSource, /touch-action:auto/);
assert.doesNotMatch(busSource, /gesturestart/);
assert.doesNotMatch(busSource, /function stopUiPinch/);
assert.match(busSource, /vendor\/leaflet\/leaflet\.css/);
assert.match(busSource, /vendor\/leaflet\/leaflet\.js/);
assert.match(busSource, /unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js/);
assert.match(busSource, /Map unavailable/);
assert.doesNotMatch(busSource, /cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet/);
assert.match(busSource, /const TILE_ERROR_THRESHOLD=4/);
assert.match(busSource, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
// force lets a theme change rebuild the same provider, whose tile URL has changed.
assert.match(busSource, /function useTileProvider\(index,reason,force\)/);
assert.match(busSource, /currentTileProvider/);
assert.match(busSource, /function liveVehicleIdentity\(fields\)/);
// Two buses working one journey/block code must stay two records. Keying on
// the journey alone dropped all but the last, and the survivor's track was
// reset every poll by the apparent jump between them.
assert.match(busSource, /if\(journey&&vehicle\) return owner\+'\|journey\|'\+journey\+'\|vehicle\|'\+vehicle;/);
assert.match(busSource, /function physicalVehicleKey\(v\)/);
// VehicleRef alone does not identify a bus: some operators publish one
// placeholder code for every bus on a route. A code repeated within a single
// snapshot therefore carries no identity and must never retire a sibling.
assert.match(busSource, /function ingestBatchIndex\(list,now=Date\.now\(\)\)/);
assert.match(busSource, /function retirableVehicleKey\(v,batch\)/);
assert.match(busSource, /return physical&&!batch\.shared\.has\(physical\)\?physical:'';/);
assert.match(busSource, /if\(otherId===v\.id\|\|batch\.ids\.has\(otherId\)\) continue;/);
// ...and the bus that moves on to its next journey must not be left behind as
// a second, frozen row under the identity it was reporting a moment ago.
assert.match(busSource, /if\(physicalVehicleKey\(other\)===physical && Number\(other\.ts\)<=Number\(rec\.ts\)\) S\.vehicles\.delete\(otherId\)/);
// ...and the mirror case: a straggling report must not resurrect an identity
// the bus has already moved on from, beside the newer record.
assert.match(busSource, /function supersededByNewerRecord\(v,batch\)/);
assert.match(busSource, /if\(!prev && supersededByNewerRecord\(v,batch\)\) continue;/);
assert.match(busSource, /function parseLivePayloads\(items,now\)/);
assert.match(busSource, /const LIVE_ID_ACTIVITIES = new Map\(\)/);
assert.match(busSource, /function anonymousActivityIdentity\(baseId,record,usedSlots,now=Date\.now\(\)\)/);
// usedSlots was recorded and never read, so a slot claimed by one bus could be
// handed to another. The guard is payload-scoped on purpose: a feed reports a
// vehicle once per response, so sharing a payload proves two records are
// different buses, while the same bus legitimately repeats across the
// overlapping bounding boxes the app fetches. Executable proof for both
// directions lives in identity-regression.mjs.
// ProducerRef sits on the ServiceDelivery, not the VehicleActivity, so the
// fallback from OperatorRef to it could never fire against a real response.
// Carry it onto each record, and key retirement and learning on the owner the
// identity was actually built from rather than collapsing both to "unknown".
assert.match(busSource, /function producerRefForActivity\(activity\)/);
assert.match(busSource, /while\(delivery&&delivery\.localName!=='ServiceDelivery'\) delivery=delivery\.parentElement;/);
assert.match(busSource, /const producerRef=producerRefForActivity\(activity\);/);
assert.match(busSource, /if\(!f\.ProducerRef&&producerRef\) f\.ProducerRef=producerRef;/);
assert.match(busSource, /owner:String\(f\.OperatorRef\|\|f\.ProducerRef\|\|''\)\.trim\(\),/);
assert.match(busSource, /const owner=String\(v&&\(v\.owner\|\|v\.operator\)\|\|''\)\.trim\(\)\|\|'unknown';/);
assert.match(busSource, /const operator=String\(v\.owner\|\|v\.operator\|\|''\)\.trim\(\)\.toLowerCase\(\);/);
// Locally observed evidence is proximity-based and cannot tell the far
// carriageway, the next stand or a parallel road from this stop. Where the stop
// has a current official timetable that omits the line, the timetable wins and
// the sighting no longer admits the route on its own. Without one it is still
// the only signal there is, so it keeps its former weight.
assert.match(busSource, /const authoritative=!!\(S\.ttStop&&S\.timetableSource==='national'&&!S\.timetableFallback&&!S\.ttError\);/);
assert.match(busSource, /if\(authoritative\) return \{score:1,label:'seen stopping, but not in the timetable for this stop'\};/);
// Learning requires the dwell the app already detects, not merely a slow pass:
// under 5.5 m/s is 12 mph, which a bus held in traffic meets without stopping.
assert.match(busSource, /const dwelled=Number\.isFinite\(Number\(v\.stationaryAt\)\);/);
assert.doesNotMatch(busSource, /const slow=\(v\.speed!=null && isFinite\(v\.speed\)\) \? v\.speed<5\.5 : v\.hist\.length>=3;/);
// A bus past the stop is dropped on ordered geometry regardless of the toggle,
// so what hideAway still governs is the case with no geometry, where strength
// falls back to a straight-line trend. It must not overrule an ordered pattern
// that places the bus short of the stop with route still to run.
assert.match(busSource, /if\(S\.hideAway && strength<0 && d>100 && !routeAhead\)\{/);
assert.doesNotMatch(busSource, /Drops anything already past your stop/);
// Name where the buses go, not a compass point or a town no route here visits.
assert.match(busSource, /function stopDestinationNames\(\)/);
assert.match(busSource, /buses here head for '\+heading/);
assert.match(busSource, /const dirWord=heading\?'to '\+heading/);
// Distance stays in the heading; the stop reference and which timetable matched
// it are provenance and belong behind the info button.
assert.match(busSource, /board-info-panel" id="boardInfoPanel" hidden>\s*<div class="stopmeta" id="stopSource">/);
assert.match(busSource, /\$\('stopMeta'\)\.innerHTML='<b>'\+fmtDist\(s\.d\)\+'<\/b> from your point';/);
assert.match(busSource, /id="q"[^>]*placeholder="search"/);
assert.doesNotMatch(busSource, /\$\('q'\)\.value='My location'/);
assert.match(busSource, /\.dirswitch\{grid-area:directions;[^}]*height:46px;[^}]*border-radius:10px/);
assert.match(busSource, /body\.theme-crystal \.dirswitch button\{border-radius:999px\}/);
// Crystal is a variable swap, not a second stylesheet. Every tint in the sheet
// has to be an alpha of a themed component, or a rule keeps its dark colour on
// a white ground — so no literal rgba() may survive anywhere in the CSS.
assert.doesNotMatch(busSource.slice(0, busSource.indexOf('</style>')), /rgba\(/);
assert.match(busSource, /body\.theme-crystal\{/);
assert.match(busSource, /--led-rgb:255 176 0;/);
assert.match(busSource, /--led-rgb:0 100 210;/);
// The basemap has to follow the theme; a light UI over dark tiles reads as a bug.
assert.match(busSource, /cartoStyle:'dark_all'/);
assert.match(busSource, /cartoStyle:'light_all'/);
assert.match(busSource, /function tileUrlFor\(provider\)/);
assert.match(busSource, /document\.body\.classList\.toggle\('theme-crystal',name==='crystal'\);/);
// An unknown service reference in a national shard means the build is
// incomplete, and assuming the journey runs every day invents service. The
// permissive answer stays for regional packs, which may carry no services map.
assert.match(busSource, /if\(S\.timetableSource==='national'\)\{ S\.timetableUnknownServices\+\+; return false; \}/);
// The route summary must not span the three calendar days timetableRows builds,
// or a Sunday-only route is listed on a Saturday board.
assert.match(busSource, /const rows=timetableRows\(new Date\(now\)\)\.filter\(r=>r\.at>now-SERVING_NOTE_PAST_MS&&r\.at<now\+SERVING_NOTE_AHEAD_MS\);/);
// A drawn journey line is held across a lazy-loading gap, never past the bus.
assert.match(busSource, /if\(!held\|\|!isFinite\(heldAge\)\|\|heldAge>JOURNEY_ROUTE_HOLD_MS\)\{ clearJourneyRoute\(\); return; \}/);
// The walk figure drives the leave-now alert, so it must not read as measured.
assert.match(busSource, /const WALK_DETOUR_FACTOR = 1\.4;/);
assert.match(busSource, /about '\+mins\+' min walk/);
assert.doesNotMatch(busSource, /Not calling at your stop/);
// Route learning and the leave-now alert must key on the collision-resolved
// record id. Some operators publish one journey or fleet code for every bus on
// a route, so keying on the raw journey reference made them all one vehicle:
// a route could never reach the two-vehicle bar, and a fired alarm stayed
// attached to a bus that had already gone.
assert.match(busSource, /const vehicle=String\(v\.id\|\|v\.journey\);/);
assert.match(busSource, /const vehicleId=String\(hit\.v\.id\|\|hit\.v\.journey\);/);
assert.doesNotMatch(busSource, /String\(v\.journey\|\|v\.id\)/);
assert.doesNotMatch(busSource, /String\(hit\.v\.journey\|\|hit\.v\.id\)/);
// Journey identity claims a timetable row, not timing. A bus running more than
// twelve minutes off its time is still that departure and must not also appear
// as a schedule-only row beside itself.
assert.match(busSource, /const matchedSchedule=scheduleLookup\.tripMatched&&schedules\.length\?schedules\[0\]:null;/);
assert.match(busSource, /function claimedScheduleFor\(row\)\{ return row&&!row\.gpsLost\?\(row\.schedule\|\|row\.matchedSchedule\|\|null\):null; \}/);
assert.match(busSource, /const claimedBy=usedSlots\.get\(slot\);/);
assert.match(busSource, /if\(sharesPayload\) continue;/);
assert.match(busSource, /const usedAnonymous=new Map\(\),identityByRecord=new Map\(\);/);
assert.match(busSource, /function promoteCollisionRecord\(baseId\)/);
assert.match(busSource, /validUntilAt:validUntil/);
assert.match(busSource, /parseLivePayloads\(successful\.map\(entry=>entry\.item\),Date\.now\(\)\)/);
assert.doesNotMatch(busSource, /parseLivePayloads\(\[result\.value\.item\],Date\.now\(\)\)/);
assert.match(busSource, /vehicleRef:f\.VehicleRef\|\|''/);
assert.doesNotMatch(busSource, /const id = f\.VehicleRef \|\| journey/);
assert.match(busSource, /async function fetchLiveBatch\(wide,signal\)/);
assert.match(busSource, /if\(wide\) S\.lastWideFetch=Date\.now\(\)/);
assert.match(busSource, /requested:urls\.length/);
assert.match(busSource, /batch\.successful\.length<batch\.requested/);
assert.match(busSource, /successful:\[\.\.\.batch\.successful,\.\.\.nearby\.successful\]/);
assert.match(busSource, /liveState:S/);
assert.match(busSource, /const MAPPED_EMPTY_TTL = 2\*3600\*1000/);
assert.match(busSource, /function mappedRecordFresh\(record,now\)/);
assert.match(busSource, /function canQueryExactOsmStop\(stop\)/);
assert.match(busSource, /function routeLookupQueries\(stop\)/);
assert.match(busSource, /stop\.source!=='official'/);
assert.match(busSource, /const MAPPED_PENDING = new Map\(\)/);
assert.doesNotMatch(busSource, /const MAPPED_TTL = 30\*24\*3600\*1000/);
assert.match(busSource, /function serviceDepartureTime\(serviceDate,mins\)/);
assert.match(busSource, /const svc=S\.timetable && S\.timetable\.services && S\.timetable\.services\[ref\]/);
assert.match(busSource, /if\(svc\)\{/);
assert.match(busSource, /at\.setHours\(Math\.floor\(minuteOfDay\/60\),minuteOfDay%60,0,0\)/);
assert.match(busSource, /serviceDepartureTime\(serviceDate,mins\)/);
assert.doesNotMatch(busSource, /new Date\(serviceDate\.getTime\(\)\+mins\*60000\)/);
assert.match(busSource, /departureDayOffset=Math\.floor\(mins\/1440\)/);
assert.match(busSource, /targetOffset-departureDayOffset/);
assert.match(busSource, /indexTimetableRows,timetableRows/);
assert.doesNotMatch(busSource, /for\(const offset of \[-1,0,1\]\)\{\n    const serviceDate/);
/* The stop cache is keyed on a coarse grid cell, not on the raw fix. Four
   decimal places is about 11 metres, which ordinary GPS drift exceeds while the
   phone sits still, so every return visit minted a new key and rebuilt the whole
   stop set from a cache that was sitting right there unused. The cell is ~550m,
   the true centre is stored alongside so proximity can still be checked, and a
   read sweeps the eight neighbouring cells. */
assert.match(busSource, /kerbside\.stops\.v7/);
assert.match(busSource, /const STOP_CACHE_GRID = 0\.005;/);
assert.match(busSource, /Math\.round\(Number\(lat\)\/STOP_CACHE_GRID\)/);
assert.match(busSource, /const STOP_CACHE_REUSE_METRES = 400;/);
assert.match(busSource, /const STOP_TTL = 7\*24\*3600\*1000;/);
assert.match(busSource, /for\(let dy=-1;dy<=1;dy\+\+\) for\(let dx=-1;dx<=1;dx\+\+\)\{/);
assert.doesNotMatch(busSource, /lat\.toFixed\(4\)/);
assert.match(busSource, /complete:failed===0/);
assert.match(busSource, /function mergeDiscoveredStops\(primary,secondary,lat,lon\)/);
assert.match(busSource, /if\(official\.length&&officialResult\.complete\)/);
assert.match(busSource, /showDiscoveredStops\(official,lat,lon,false\)/);
assert.doesNotMatch(busSource, /kerbside\.stops\.v5/);
assert.doesNotMatch(busSource, /kerbside\.stops\.v6/);
assert.match(busSource, /stop\.source==='official'\|\|looksLikeAtco\(stop\.code\)/);
assert.match(busSource, /if\(idA&&idA===idB\) return true/);
assert.doesNotMatch(busSource, /stop&&stop\.code\]\n    \.map/);
assert.match(busSource, /const DATA_MANIFEST_MAX_AGE = 14\*24\*3600\*1000/);
assert.match(busSource, /function validDataManifest\(data\)/);
assert.match(busSource, /Object\.keys\(regions\)\.length!==REQUIRED_DATA_REGIONS\.length/);
assert.match(busSource, /DATA_MANIFEST_SOURCE='stored'/);
assert.match(busSource, /cache:force\?'reload':'no-cache'/);
assert.doesNotMatch(busSource, /cache:force\?'reload':'force-cache'/);
assert.match(busSource, /if\(journey\) return owner\+'\|journey\|'\+journey/);
assert.match(busSource, /if\(vehicle\) return owner\+'\|vehicle\|'\+vehicle/);
assert.match(busSource, /fetchLive,ingest,relevant,liveState:S/);
assert.doesNotMatch(busSource, /if\(vehicle\) return \(operator\?operator\+'\|':''\)\+'vehicle\|'\+vehicle;\n  if\(journey\)/);
assert.match(busSource, /const DATA_SNAPSHOT_CACHE = 'kerbside-timetable-snapshots-v1'/);
assert.match(busSource, /function validDataDeparture\(data,region,shard,expectedBuild\)/);
assert.match(busSource, /const key=expectedBuild\+'\|'\+logical/);
assert.match(busSource, /cache:'no-cache'/);
assert.match(busSource, /if\(fallbackUsed\) DATA_DEPARTURE_CACHE\.delete\(key\)/);
assert.match(busSource, /caches\.delete\(DATA_SNAPSHOT_CACHE\)/);
assert.doesNotMatch(busSource, /if\(r\.status===404\) return null; if\(!r\.ok\) throw new Error\('Pages departures HTTP '/);
assert.match(busSource, /const DATA_PATTERN_RETRY_MS = 60\*1000/);
assert.match(busSource, /function validDataPatternShard\(data,region,prefix,expectedBuild\)/);
assert.match(busSource, /S\.patternPending\.has\(requestKey\)/);
assert.match(busSource, /DATA_PATTERN_RETRY\.set\(requestKey,Date\.now\(\)\+DATA_PATTERN_RETRY_MS\)/);
assert.match(busSource, /if\(S\.timetableSource==='national'\) queuePattern\(id\); else PATTERN_CACHE\.set\(id,null\)/);
assert.doesNotMatch(busSource, /cache:'force-cache'\},12000\);\n    if\(!r\.ok\) return; const data=await r\.json\(\);/);
assert.match(busSource, /const DATA_TILE_NEGATIVE_TTL = 5\*60\*1000/);
assert.match(busSource, /function validDataTile\(data,region,tile,expectedBuild\)/);
assert.match(busSource, /DATA_TILE_NEGATIVE\.set\(key,Date\.now\(\)\+DATA_TILE_NEGATIVE_TTL\)/);
assert.match(busSource, /if\(fallbackUsed\|\|data===null\) DATA_TILE_CACHE\.delete\(key\)/);
assert.doesNotMatch(busSource, /const key=region\+'\/'\+tile; if\(DATA_TILE_CACHE\.has\(key\)\)/);
assert.match(busSource, /const ROUTE_SCAN_INTERVAL_MS = 60\*1000/);
assert.match(busSource, /const ROUTE_SCAN_MAX_BOXES = 3/);
assert.match(busSource, /const ROUTE_SCAN_MAX_ROUTE_METRES = 55000/);
assert.match(busSource, /function routeScanPlans\(now=Date\.now\(\)\)/);
assert.match(busSource, /function matchRouteScanVehicle\(plan,v\)/);
assert.match(busSource, /uniqueCompatibleTrips\(plan\.matches,v\.journey,item=>item\.trip\)/);
assert.match(busSource, /d>FAR_VEH_DIST&&!corridorFar/);
assert.match(busSource, /dist\(centre\.lat,centre\.lon,S\.stop\.lat,S\.stop\.lon\)\+ROUTE_SCAN_BOX_RADIUS<=FAR_VEH_DIST/);
assert.match(busSource, /void pollRouteCorridor\(\)/);
assert.match(busSource, /route scan<\/span>/);
assert.match(busSource, /const GPS_RESULT_GRACE_MS = 6\*60\*1000/);
assert.match(busSource, /function gpsMovementDirection\(v\)/);
assert.match(busSource, /GPS signal lost/);
assert.match(busSource, /v\.progressPattern/);
assert.match(busSource, /const emptySummary=S\.feedEmptyReason\.includes\('timestamped'\)\?'no fresh GPS positions reported':'no buses reported'/);
assert.match(busSource, /'Live · '\+emptySummary/);
assert.match(busSource, /Live feed delayed · last GPS retained/);
assert.doesNotMatch(busSource, /setStatus\(scheduled\?'Live unavailable · scheduled times shown':'Feed problem'/);
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8']
]);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname === '/' ? '/bus.html' : url.pathname);
    const filename = path.resolve(root, '.' + pathname);
    if (!filename.startsWith(root + path.sep) && filename !== path.join(root, 'bus.html')) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const body = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': mime.get(path.extname(filename)) || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404).end('Not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const browser = await engine.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/London' });
const page = await context.newPage();

try {
  let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0, wideFeedRequests = 0, nearbyFeedRequests = 0, departureRequests = 0, patternRequests = 0, stopTileRequests = 0;
  const transparentTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  await page.route('https://unpkg.com/leaflet@1.9.4/dist/**', route => { leafletCdnRequests++; return route.abort(); });
  await page.route('https://*.basemaps.cartocdn.com/**', route => { cartoTileRequests++; return route.abort(); });
  await page.route('https://tile.openstreetmap.org/**', route => { osmTileRequests++; return route.fulfill({ status: 200, contentType: 'image/png', body: transparentTile }); });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  const requiredManifestRegions=['east_anglia','east_midlands','london','north_east','north_west','south_east','south_west','west_midlands','yorkshire'];
  const validManifestRegions=Object.fromEntries(requiredManifestRegions.map((name,index)=>[name,{
    version:2,built:'2026-08-02T00:00:00.000Z',region:name,tileSize:0.05,
    bounds:[-6+index*.1,50,-5.5+index*.1,50.5],stops:1,departures:2,patterns:1,tiles:1,departureShards:1
  }]));
  const validManifest={
    version:3,scope:'england-regional-pages',built:'2026-08-02T00:00:00.000Z',tileSize:0.05,
    regions:validManifestRegions,totals:{stops:9,departures:18,patterns:9,tiles:9}
  };
  let manifestMode='valid';
  await page.route('https://kerbside-data-zetabun.pages.dev/manifest.json**', route => {
    if(manifestMode==='bad-json') return route.fulfill({status:200,contentType:'application/json',body:'{"broken"'});
    if(manifestMode==='partial') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...validManifest,regions:{west_midlands:validManifestRegions.west_midlands},totals:{stops:1,departures:2,patterns:1,tiles:1}})});
    if(manifestMode==='error') return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'synthetic manifest outage'})});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(validManifest)});
  });
  const validStopTile={
    version:7,built:'2026-08-02T00:00:00.000Z',scope:'stop-index',region:'west_midlands',tile:'tile-test',tileSize:0.05,
    stops:{'stop-a':{n:'Test stop',c:'stop-a',sms:'',ind:'A',ll:[52.5,-2.1],shard:'aa'}}
  };
  let stopTileMode='valid';
  await page.route(/^https:\/\/kerbside-data-zetabun\.pages\.dev\/regions\/west_midlands\/tiles\/tile-test\.json/, route => {
    stopTileRequests++;
    if(stopTileMode==='bad-json') return route.fulfill({status:200,contentType:'application/json',body:'{"broken"'});
    if(stopTileMode==='wrong-build') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...validStopTile,built:'2026-08-01T00:00:00.000Z'})});
    if(stopTileMode==='404') return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'synthetic empty tile'})});
    if(stopTileMode==='error') return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'synthetic tile outage'})});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(validStopTile)});
  });

  const validDeparture={
    version:8,built:'2026-08-02T00:00:00.000Z',scope:'departure-shard',region:'west_midlands',shard:'aa',
    services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},
    stops:{'stop-a':{n:'Test stop',c:'stop-a',sms:'',ind:'',ll:[52.5,-2.1],d:[[600,'9','Town Centre','daily','','trip-a','']]}},
    tripPatterns:{},patterns:{}
  };
  let departureMode='valid';
  await page.route(/^https:\/\/kerbside-data-zetabun\.pages\.dev\/regions\/west_midlands\/departures\/aa\.json/, route => {
    departureRequests++;
    if(departureMode==='bad-json') return route.fulfill({status:200,contentType:'application/json',body:'{"broken"'});
    if(departureMode==='wrong-build') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...validDeparture,built:'2026-08-01T00:00:00.000Z'})});
    if(departureMode==='404') return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'synthetic missing shard'})});
    if(departureMode==='error') return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'synthetic shard outage'})});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(validDeparture)});
  });

  const patternId='aa1234567890abcdef12';
  const validPatternShard={
    version:3,built:'2026-08-02T00:00:00.000Z',scope:'pattern-shard',region:'west_midlands',shard:'aa',
    patterns:{[patternId]:{p:[[52.49,-2.1],[52.5,-2.1]],s:[['stop-a','Test stop',52.5,-2.1]],g:1}}
  };
  let patternMode='valid';
  await page.route(/^https:\/\/kerbside-data-zetabun\.pages\.dev\/regions\/west_midlands\/patterns\/aa\.json/, route => {
    patternRequests++;
    if(patternMode==='bad-json') return route.fulfill({status:200,contentType:'application/json',body:'{"broken"'});
    if(patternMode==='wrong-build') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...validPatternShard,built:'2026-08-01T00:00:00.000Z'})});
    if(patternMode==='404') return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'synthetic missing pattern'})});
    if(patternMode==='error') return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'synthetic pattern outage'})});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(validPatternShard)});
  });

  await page.route('https://kerbside-bus.adambullas.workers.dev/health**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.52', bods: true })
  }));

  await page.route(/^https:\/\/kerbside-bus\.adambullas\.workers\.dev\/\?bbox=/, route => {
    const url=new URL(route.request().url());
    const box=(url.searchParams.get('bbox')||'').split(',').map(Number);
    const latitudeSpan=box.length===4?box[3]-box[1]:0;
    const liveXml=(operator,vehicle,lat)=>{
      const recorded=new Date().toISOString();
      return `<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery><VehicleActivity>
        <RecordedAtTime>${recorded}</RecordedAtTime><MonitoredVehicleJourney><LineRef>9</LineRef><PublishedLineName>9</PublishedLineName>
        <OperatorRef>${operator}</OperatorRef><VehicleRef>${vehicle}</VehicleRef><DatedVehicleJourneyRef>${vehicle}-trip</DatedVehicleJourneyRef>
        <DestinationName>Town Centre</DestinationName><VehicleLocation><Longitude>-2.1000</Longitude><Latitude>${lat}</Latitude></VehicleLocation>
        <Bearing>0</Bearing></MonitoredVehicleJourney></VehicleActivity></VehicleMonitoringDelivery></ServiceDelivery></Siri>`;
    };
    if(latitudeSpan>0.25){
      wideFeedRequests++;
      if(wideFeedRequests===1) return route.fulfill({status:200,contentType:'application/xml',body:liveXml('WIDE','wide-1','52.6000')});
      return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'synthetic partial wide outage'})});
    }
    nearbyFeedRequests++;
    return route.fulfill({status:200,contentType:'application/xml',body:liveXml('NEAR','nearby-1','52.5010')});
  });

  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/bus.html`, { waitUntil: 'domcontentloaded' });
  assert.match(await page.title(), /Kerbside/i);
  assert.equal(await page.evaluate(() => window.L && window.L.version), '1.9.4');
  assert.equal(leafletCdnRequests, 0);
  assert.equal(await page.locator('#map.leaflet-container').count(), 1, pageErrors.join('\n'));
  await page.waitForFunction(() => window.__KERBSIDE_TEST__?.currentTileProvider?.() === 'OpenStreetMap');
  assert.ok(cartoTileRequests >= 4);
  assert.ok(osmTileRequests > 0);
  assert.equal(await page.locator('#setBtn').isVisible(), true);
  const mobileHeader = await page.evaluate(() => {
    const topbar=document.getElementById('topbar');
    const brand=topbar.querySelector('.brand');
    const icon=topbar.querySelector('.brand-icon');
    const search=topbar.querySelector('.searchwrap');
    const directions=topbar.querySelector('.dirswitch');
    const settings=document.getElementById('setBtn');
    const rect=element=>{const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const b=rect(brand),s=rect(search),d=rect(directions),g=rect(settings);
    const controlTop=Math.min(s.top,d.top,g.top);
    return {
      topDisplay:getComputedStyle(topbar).display,
      iconDisplay:getComputedStyle(icon).display,
      iconEmbedded:icon.getAttribute('src').startsWith('data:image/svg+xml,'),
      iconLoaded:icon.complete&&icon.naturalWidth===192,
      iconFit:getComputedStyle(icon).objectFit,
      brandAbove:b.bottom<=controlTop+2,
      searchAboveControls:s.bottom<=Math.min(d.top,g.top)+2,
      searchFullWidth:s.width>=innerWidth-24,
      controlsAligned:Math.abs(d.top-g.top)<=2,
      controlsOrdered:d.right<=g.left,
      withinViewport:g.right<=innerWidth,
      searchHeight:Math.round(s.height),
      settingsHeight:Math.round(g.height)
    };
  });
  assert.deepEqual(mobileHeader,{
    topDisplay:'grid',iconDisplay:'block',iconEmbedded:true,
    iconLoaded:true,iconFit:'contain',
    brandAbove:true,searchAboveControls:false,searchFullWidth:false,
    controlsAligned:true,controlsOrdered:true,withinViewport:true,
    searchHeight:46,settingsHeight:46
  });
  const directionControl=await page.evaluate(()=>{
  const q=document.getElementById('q');
  const switcher=document.querySelector('.dirswitch');
  const buttons=[...switcher.querySelectorAll('button')];
  const both=document.getElementById('dAll');
  const originalCrystal=document.body.classList.contains('theme-crystal');
  const originalPressed=buttons.map(button=>button.getAttribute('aria-pressed'));
  buttons.forEach(button=>button.setAttribute('aria-pressed','false'));
  both.setAttribute('aria-pressed','true');
  const capture=crystal=>{
    document.body.classList.toggle('theme-crystal',crystal);
    const outer=switcher.getBoundingClientRect();
    const active=both.getBoundingClientRect();
    const style=getComputedStyle(both);
    return {
      theme:crystal?'crystal':'dark',
      contained:active.left>=outer.left-.5&&active.top>=outer.top-.5&&active.right<=outer.right+.5&&active.bottom<=outer.bottom+.5,
      outerHeight:outer.height,
      activeHeight:active.height,
      activeRadius:parseFloat(style.borderTopRightRadius)
    };
  };
  const layouts=[capture(false),capture(true)];
  document.body.classList.toggle('theme-crystal',originalCrystal);
  buttons.forEach((button,index)=>button.setAttribute('aria-pressed',originalPressed[index]));
  return {placeholder:q.getAttribute('placeholder'),value:q.value,layouts};
});
assert.equal(directionControl.placeholder,'search');
assert.equal(directionControl.value,'');
for(const layout of directionControl.layouts){
  assert.equal(layout.contained,true,`${layout.theme} Both button escaped its direction container`);
  assert.equal(Math.round(layout.outerHeight),46,`${layout.theme} direction container height changed`);
  assert.equal(Math.round(layout.activeHeight),38,`${layout.theme} Both button height changed`);
}
const darkDirection=directionControl.layouts.find(layout=>layout.theme==='dark');
const crystalDirection=directionControl.layouts.find(layout=>layout.theme==='crystal');
assert.ok(darkDirection.activeRadius>=7.5,'Dark-theme Both button no longer follows its rounded container');
assert.ok(crystalDirection.activeRadius>=crystalDirection.activeHeight/2-1,'Crystal-theme Both button is not pill-shaped');
const viewportContent=await page.locator('meta[name="viewport"]').getAttribute('content');
  assert.match(viewportContent, /width=device-width/);
  assert.doesNotMatch(viewportContent, /user-scalable|maximum-scale/);
  const scrimTouchAction=await page.evaluate(() => getComputedStyle(document.getElementById('scrim')).touchAction);
  assert.doesNotMatch(scrimTouchAction, /pinch-zoom/);
  const mapTouchAction=await page.evaluate(() => getComputedStyle(document.getElementById('map')).touchAction);
  assert.equal(mapTouchAction, 'none');
  const infoPanelScrolls=await page.evaluate(() => {
    const style=getComputedStyle(document.getElementById('boardInfoPanel'));
    return { overflowY: style.overflowY, hasCap: style.maxHeight !== 'none' };
  });
  assert.deepEqual(infoPanelScrolls, { overflowY: 'auto', hasCap: true });

  const manifestPolicy = await page.evaluate(async () => {
    const api=window.__KERBSIDE_TEST__;
    api.resetDataManifestForTest(true);
    const manifest=await api.loadDataManifest(true);
    return {built:manifest.built,valid:api.validDataManifest(manifest),source:api.dataManifestSource(),stored:api.readStoredDataManifest()?.built};
  });
  assert.deepEqual(manifestPolicy,{built:'2026-08-02T00:00:00.000Z',valid:true,source:'network',stored:'2026-08-02T00:00:00.000Z'});
  manifestMode='bad-json';
  const badJsonFallback=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;api.resetDataManifestForTest(false);
    const manifest=await api.loadDataManifest(true);return {built:manifest.built,source:api.dataManifestSource()};
  });
  assert.deepEqual(badJsonFallback,{built:'2026-08-02T00:00:00.000Z',source:'stored'});
  manifestMode='partial';
  const partialFallback=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;api.resetDataManifestForTest(false);
    const manifest=await api.loadDataManifest(true);return {built:manifest.built,source:api.dataManifestSource()};
  });
  assert.deepEqual(partialFallback,{built:'2026-08-02T00:00:00.000Z',source:'stored'});
  manifestMode='error';
  const outageFallback=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;api.resetDataManifestForTest(false);
    const manifest=await api.loadDataManifest(true);return {built:manifest.built,source:api.dataManifestSource()};
  });
  assert.deepEqual(outageFallback,{built:'2026-08-02T00:00:00.000Z',source:'stored'});
  manifestMode='valid';
  await page.evaluate(async()=>{const api=window.__KERBSIDE_TEST__;api.resetDataManifestForTest(false);await api.loadDataManifest(true);});

  stopTileMode='valid'; stopTileRequests=0;
  const stopTilePolicy=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataTileForTest(true);
    const data=await api.loadDataTile('west_midlands','tile-test');
    return {valid:api.validDataTile(data,'west_midlands','tile-test','2026-08-02T00:00:00.000Z'),source:api.dataTileSource('west_midlands','tile-test'),stops:Object.keys(data.stops).length};
  });
  assert.deepEqual(stopTilePolicy,{valid:true,source:'network',stops:1});
  stopTileMode='bad-json';
  const malformedTile=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataTileForTest(false);
    const data=await api.loadDataTile('west_midlands','tile-test');return {source:api.dataTileSource('west_midlands','tile-test'),stops:Object.keys(data.stops).length};
  });
  assert.deepEqual(malformedTile,{source:'snapshot',stops:1});
  stopTileMode='wrong-build';
  const wrongBuildTile=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataTileForTest(false);
    const data=await api.loadDataTile('west_midlands','tile-test');return {source:api.dataTileSource('west_midlands','tile-test'),built:data.built};
  });
  assert.deepEqual(wrongBuildTile,{source:'snapshot',built:'2026-08-02T00:00:00.000Z'});
  stopTileMode='404';
  const missingTileFallback=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataTileForTest(false);
    const data=await api.loadDataTile('west_midlands','tile-test');return {source:api.dataTileSource('west_midlands','tile-test'),stops:Object.keys(data.stops).length};
  });
  assert.deepEqual(missingTileFallback,{source:'snapshot',stops:1});
  await page.evaluate(async()=>window.__KERBSIDE_TEST__.resetDataTileForTest(true));
  const beforeNegative=stopTileRequests;
  const emptyTile=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;
    const first=await api.loadDataTile('west_midlands','tile-test');
    const second=await api.loadDataTile('west_midlands','tile-test');
    return {first,second,source:api.dataTileSource('west_midlands','tile-test')};
  });
  assert.deepEqual(emptyTile,{first:null,second:null,source:'empty'});
  assert.equal(stopTileRequests-beforeNegative,1);
  await page.evaluate(()=>window.__KERBSIDE_TEST__.expireDataTileNegativeForTest('west_midlands','tile-test'));
  await page.evaluate(()=>window.__KERBSIDE_TEST__.loadDataTile('west_midlands','tile-test'));
  assert.equal(stopTileRequests-beforeNegative,2);
  stopTileMode='error';
  await page.evaluate(async()=>window.__KERBSIDE_TEST__.resetDataTileForTest(true));
  const tileFailures=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;let failures=0;
    for(let i=0;i<2;i++){try{await api.loadDataTile('west_midlands','tile-test');}catch(e){failures++;}}
    return failures;
  });
  assert.equal(tileFailures,2);
  stopTileMode='valid';
  await page.evaluate(async()=>{const api=window.__KERBSIDE_TEST__;await api.resetDataTileForTest(true);await api.loadDataTile('west_midlands','tile-test');});

  departureMode='valid'; departureRequests=0;
  const departurePolicy=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;
    await api.resetDataDepartureForTest(true);
    const data=await api.loadDataDeparture('west_midlands','aa');
    return {valid:api.validDataDeparture(data,'west_midlands','aa','2026-08-02T00:00:00.000Z'),source:api.dataDepartureSource('west_midlands','aa'),stops:Object.keys(data.stops).length};
  });
  assert.deepEqual(departurePolicy,{valid:true,source:'network',stops:1});
  departureMode='bad-json';
  const malformedDeparture=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataDepartureForTest(false);
    const data=await api.loadDataDeparture('west_midlands','aa');return {source:api.dataDepartureSource('west_midlands','aa'),stops:Object.keys(data.stops).length};
  });
  assert.deepEqual(malformedDeparture,{source:'snapshot',stops:1});
  departureMode='wrong-build';
  const wrongBuildDeparture=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataDepartureForTest(false);
    const data=await api.loadDataDeparture('west_midlands','aa');return {source:api.dataDepartureSource('west_midlands','aa'),built:data.built};
  });
  assert.deepEqual(wrongBuildDeparture,{source:'snapshot',built:'2026-08-02T00:00:00.000Z'});
  departureMode='404';
  const missingDeparture=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataDepartureForTest(false);
    const data=await api.loadDataDeparture('west_midlands','aa');return {source:api.dataDepartureSource('west_midlands','aa'),stops:Object.keys(data.stops).length};
  });
  assert.deepEqual(missingDeparture,{source:'snapshot',stops:1});
  await page.evaluate(async()=>window.__KERBSIDE_TEST__.resetDataDepartureForTest(true));
  const beforeMissingRetries=departureRequests;
  const missingRetries=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;let failures=0;
    for(let i=0;i<2;i++){try{await api.loadDataDeparture('west_midlands','aa');}catch(e){failures++;}}
    return failures;
  });
  assert.equal(missingRetries,2);
  assert.equal(departureRequests-beforeMissingRetries,2);
  departureMode='valid';
  await page.evaluate(async()=>{const api=window.__KERBSIDE_TEST__;await api.resetDataDepartureForTest(true);await api.loadDataDeparture('west_midlands','aa');});

  patternMode='valid'; patternRequests=0;
  const patternPolicy=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataPatternForTest(true);
    const data=await api.loadDataPatternShard('west_midlands','aa');
    return {valid:api.validDataPatternShard(data,'west_midlands','aa','2026-08-02T00:00:00.000Z'),source:api.dataPatternSource('west_midlands','aa'),patterns:Object.keys(data.patterns).length};
  });
  assert.deepEqual(patternPolicy,{valid:true,source:'network',patterns:1});
  patternMode='bad-json';
  const malformedPattern=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataPatternForTest(false);
    const data=await api.loadDataPatternShard('west_midlands','aa');return {source:api.dataPatternSource('west_midlands','aa'),patterns:Object.keys(data.patterns).length};
  });
  assert.deepEqual(malformedPattern,{source:'snapshot',patterns:1});
  patternMode='wrong-build';
  const wrongBuildPattern=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataPatternForTest(false);
    const data=await api.loadDataPatternShard('west_midlands','aa');return {source:api.dataPatternSource('west_midlands','aa'),built:data.built};
  });
  assert.deepEqual(wrongBuildPattern,{source:'snapshot',built:'2026-08-02T00:00:00.000Z'});
  patternMode='404';
  const missingPattern=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataPatternForTest(false);
    const data=await api.loadDataPatternShard('west_midlands','aa');return {source:api.dataPatternSource('west_midlands','aa'),patterns:Object.keys(data.patterns).length};
  });
  assert.deepEqual(missingPattern,{source:'snapshot',patterns:1});
  await page.evaluate(async()=>window.__KERBSIDE_TEST__.resetDataPatternForTest(true));
  const beforePatternRetries=patternRequests;
  const patternFailures=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;let failures=0;
    for(let i=0;i<2;i++){try{await api.loadDataPatternShard('west_midlands','aa');}catch(e){failures++;}}
    return failures;
  });
  assert.equal(patternFailures,2);
  assert.equal(patternRequests-beforePatternRetries,2);
  patternMode='error';
  await page.evaluate(async()=>window.__KERBSIDE_TEST__.resetDataPatternForTest(true));
  const beforeQueueRetry=patternRequests;
  await page.evaluate(async patternId=>{
    const api=window.__KERBSIDE_TEST__,state=api.liveState,saved={timetable:state.timetable,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion};
    state.timetable={patterns:{},tripPatterns:{'trip-pattern':patternId}};state.timetableSource='national';state.timetableRegion='west_midlands';
    try{await api.queuePattern(patternId);await api.queuePattern(patternId);}finally{Object.assign(state,saved);}
  },patternId);
  assert.equal(patternRequests-beforeQueueRetry,1);
  patternMode='valid';
  const loadedPattern=await page.evaluate(async patternId=>{
    const api=window.__KERBSIDE_TEST__,state=api.liveState,saved={timetable:state.timetable,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion};
    await api.resetDataPatternForTest(true);
    state.timetable={patterns:{},tripPatterns:{'trip-pattern':patternId}};state.timetableSource='national';state.timetableRegion='west_midlands';
    try{
      await api.queuePattern(patternId);
      return {loaded:!!state.timetable.patterns[patternId],record:!!api.timetablePatternRecord('trip-pattern'),source:api.dataPatternSource('west_midlands','aa')};
    }finally{Object.assign(state,saved);}
  },patternId);
  assert.deepEqual(loadedPattern,{loaded:true,record:true,source:'network'});

  const liveParsing = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,now=Date.now(),iso=value=>new Date(value).toISOString();
    const activity=({operator,vehicle,journey,time,lat,line='009',dest='ST HELENS'})=>`<VehicleActivity>
      ${time===null?'':`<RecordedAtTime>${time}</RecordedAtTime>`}
      <MonitoredVehicleJourney><LineRef>${line}</LineRef><PublishedLineName>${line}</PublishedLineName>
      <OperatorRef>${operator}</OperatorRef><VehicleRef>${vehicle}</VehicleRef><DatedVehicleJourneyRef>${journey}</DatedVehicleJourneyRef>
      <DestinationName>${dest}</DestinationName><VehicleLocation><Longitude>-2.1000</Longitude><Latitude>${lat}</Latitude></VehicleLocation>
      <Bearing>90</Bearing><Velocity>8.5</Velocity></MonitoredVehicleJourney></VehicleActivity>`;
    const wrap=activities=>`<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery>${activities}</VehicleMonitoringDelivery></ServiceDelivery></Siri>`;
    const parsed=api.parseLivePayloads([
      {text:wrap(
        activity({operator:'OP-A',vehicle:'42',journey:'trip-a',time:iso(now-30000),lat:'52.5000'})+
        activity({operator:'OP-X',vehicle:'stale',journey:'old',time:iso(now-300001),lat:'52.4900'})+
        activity({operator:'OP-X',vehicle:'unknown',journey:'unknown',time:null,lat:'52.4900'})
      )},
      {text:wrap(
        activity({operator:'OP-A',vehicle:'42',journey:'trip-a',time:iso(now-5000),lat:'52.5010'})+
        activity({operator:'OP-B',vehicle:'42',journey:'trip-b',time:iso(now-6000),lat:'52.5020'})+
        activity({operator:'OP-X',vehicle:'future',journey:'future',time:iso(now+120001),lat:'52.4900'})
      )},
      {text:'<Siri><broken>'}
    ],now);
    const vehicles=parsed.vehicles.sort((a,b)=>a.id.localeCompare(b.id));
    return {
      ids:vehicles.map(v=>v.id),count:vehicles.length,
      newestLat:vehicles.find(v=>v.operator==='OP-A')?.lat,
      rawRef:vehicles[0]?.vehicleRef,line:vehicles[0]?.line,dest:vehicles[0]?.dest,
      stale:parsed.stale,unknownAge:parsed.unknownAge,malformed:parsed.malformed
    };
  });
  // Identity combines journey and vehicle, so two buses sharing a journey code
  // stay separate. These two already differed by operator, so both are still
  // kept — the id simply now carries the vehicle reference as well.
  assert.deepEqual(liveParsing, {
    ids:['OP-A|journey|trip-a|vehicle|42','OP-B|journey|trip-b|vehicle|42'],count:2,newestLat:52.501,
    rawRef:'42',line:'9',dest:'St Helens',stale:2,unknownAge:1,malformed:1
  });

  const multiVehicleBoard = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const activity=(index)=>`<VehicleActivity><RecordedAtTime>${new Date(now-index*1000).toISOString()}</RecordedAtTime>
      <MonitoredVehicleJourney><LineRef>9</LineRef><PublishedLineName>9</PublishedLineName>
      <OperatorRef>OP-FIVE</OperatorRef><VehicleRef>SHARED-FLEET-CODE</VehicleRef>
      <DatedVehicleJourneyRef>route-9-trip-${index}</DatedVehicleJourneyRef><DestinationName>Town Centre</DestinationName>
      <VehicleLocation><Longitude>-2.1000</Longitude><Latitude>${52.4988+index*.00012}</Latitude></VehicleLocation>
      <Bearing>0</Bearing><Velocity>6</Velocity></MonitoredVehicleJourney></VehicleActivity>`;
    const xml=`<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery>${[1,2,3,4,5].map(activity).join('')}</VehicleMonitoringDelivery></ServiceDelivery></Siri>`;
    const parsed=api.parseLivePayloads([{text:xml}],now);
    const saved={
      stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,onlyServing:state.onlyServing,
      destFilter:state.destFilter,ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,
      vehicles:state.vehicles,hideAway:state.hideAway,demo:state.demo,liveDiag:state.liveDiag,filterFellBack:state.filterFellBack
    };
    const at=new Date(now),base=at.getHours()*60+at.getMinutes()+4;
    state.stop={id:'multi-bus-stop',lat:52.5,lon:-2.1,name:'Multi bus stop',d:0};
    state.origin={lat:52.5,lon:-2.1,label:'Test'};state.anchor=null;state.dir='all';state.onlyServing=true;
    state.destFilter=null;state.hideAway=true;state.demo=false;state.vehicles=new Map();
    state.ttStop={id:'multi-bus-stop',d:parsed.vehicles.map((vehicle,index)=>[
      base+index*3,'9','Town Centre','daily','',vehicle.journey,''
    ])};
    state.timetable={services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},tripPatterns:{},patterns:{}};
    state.timetableRun=Number(state.timetableRun||0)+1;
    try{
      api.ingest(parsed.vehicles);
      const rows=api.relevant();
      return {
        parsed:parsed.vehicles.length,
        parsedIds:parsed.vehicles.map(vehicle=>vehicle.id).sort(),
        stored:state.vehicles.size,
        shown:rows.length,
        shownIds:rows.map(row=>row.v.id).sort(),
        lines:[...new Set(rows.map(row=>row.v.line))]
      };
    }finally{
      Object.assign(state,saved);
    }
  });
  // Five simultaneous buses publishing one placeholder fleet code. The id now
  // carries the vehicle reference, and all five must survive: a code repeated
  // within a single snapshot cannot identify one bus, so it never retires a
  // sibling journey.
  assert.deepEqual(multiVehicleBoard,{
    parsed:5,
    parsedIds:[1,2,3,4,5].map(index=>`OP-FIVE|journey|route-9-trip-${index}|vehicle|SHARED-FLEET-CODE`),
    stored:5,shown:5,
    shownIds:[1,2,3,4,5].map(index=>`OP-FIVE|journey|route-9-trip-${index}|vehicle|SHARED-FLEET-CODE`),
    lines:['9']
  });

  const corridorBoard = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={
      stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,onlyServing:state.onlyServing,
      hideAway:state.hideAway,destFilter:state.destFilter,demo:state.demo,vehicles:state.vehicles,
      ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,
      timetableSource:state.timetableSource,timetableRegion:state.timetableRegion,
      lastRouteScan:state.lastRouteScan,routeScanBoxes:state.routeScanBoxes,
      routeScanPatterns:state.routeScanPatterns,routeScanVehicles:state.routeScanVehicles,
      routeScanError:state.routeScanError
    };
    const at=new Date(now+45*60000),base=at.getHours()*60+at.getMinutes();
    const trips=[1,2,3,4,5].map(index=>`corridor-trip-${index}`);
    const patternId='aa48corridorpattern0001';
    state.stop={id:'corridor-stop',timetableId:'corridor-stop',lat:52.54,lon:-2.1,name:'Corridor stop',d:0};
    state.origin={lat:52.54,lon:-2.1,label:'Corridor stop'};state.anchor=null;state.dir='all';
    state.onlyServing=true;state.hideAway=true;state.destFilter=null;state.demo=false;state.vehicles=new Map();
    state.ttStop={id:'corridor-stop',d:trips.map((trip,index)=>[base+index*3,'9','Town Centre','daily','',trip,patternId])};
    state.timetable={
      services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},
      tripPatterns:Object.fromEntries(trips.map(trip=>[trip,patternId])),
      patterns:{[patternId]:{p:[[51.95,-2.1],[52.1,-2.1],[52.25,-2.1],[52.4,-2.1],[52.54,-2.1],[52.62,-2.1]],s:[['route-start','Route start',51.95,-2.1],['corridor-stop','Corridor stop',52.54,-2.1],['route-end','Route end',52.62,-2.1]],g:1}}
    };
    state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun=Number(state.timetableRun||0)+1;
    state.lastRouteScan=0;state.routeScanBoxes=0;state.routeScanPatterns=0;state.routeScanVehicles=0;state.routeScanError='';
    try{
      const plans=api.routeScanPlans(now);
      const positions=[52.08,52.13,52.18,52.23,52.28];
      const accepted=trips.map((trip,index)=>{
        const vehicle={id:`CORRIDOR|journey|${trip}`,journey:trip,vehicleRef:'shared',line:'9',lineRef:'9',dest:'Town Centre',operator:'CORRIDOR',declaredDir:'',lat:positions[index],lon:-2.1,bearing:0,feedSpeed:8,ts:now,timestampKnown:true,corridorTracked:false};
        return plans.map(plan=>api.matchRouteScanVehicle(plan,vehicle)).find(Boolean)||null;
      }).filter(Boolean);
      const wrong={id:'wrong',journey:'wrong-trip',line:'9',dest:'Town Centre',lat:52.2,lon:-2.1,bearing:0,ts:now,corridorTracked:false};
      const passed={id:'passed',journey:trips[0],line:'9',dest:'Town Centre',lat:52.58,lon:-2.1,bearing:0,ts:now,corridorTracked:false};
      const wrongRejected=!plans.some(plan=>api.matchRouteScanVehicle(plan,wrong));
      const passedRejected=!plans.some(plan=>api.matchRouteScanVehicle(plan,passed));
      api.ingest(accepted);
      const rows=api.relevant();
      const spans=plans.map(plan=>{const b=plan.bbox.split(',').map(Number);return [b[2]-b[0],b[3]-b[1]];});
      return {
        boxes:plans.length,patterns:new Set(plans.flatMap(plan=>plan.matches.map(match=>match.pattern.id))).size,
        matches:plans[0]?.matches.length||0,accepted:accepted.length,stored:state.vehicles.size,shown:rows.length,
        shownIds:rows.map(row=>row.v.id).sort(),allTagged:rows.every(row=>row.v.corridorTracked),
        minStraight:Math.min(...rows.map(row=>row.metres)),maxRoute:Math.max(...rows.map(row=>row.routeMetres||0)),
        spansSafe:spans.every(([lon,lat])=>lon<=0.34001&&lat<=0.34001),wrongRejected,passedRejected
      };
    }finally{Object.assign(state,saved);}
  });
  assert.equal(corridorBoard.boxes,3);
  assert.equal(corridorBoard.patterns,1);
  assert.equal(corridorBoard.matches,5);
  assert.equal(corridorBoard.accepted,5);
  assert.equal(corridorBoard.stored,5);
  assert.equal(corridorBoard.shown,5);
  assert.deepEqual(corridorBoard.shownIds,[1,2,3,4,5].map(index=>`CORRIDOR|journey|corridor-trip-${index}`));
  assert.equal(corridorBoard.allTagged,true);
  assert.ok(corridorBoard.minStraight>18000);
  assert.ok(corridorBoard.maxRoute<=55000);
  assert.equal(corridorBoard.spansSafe,true);
  assert.equal(corridorBoard.wrongRejected,true);
  assert.equal(corridorBoard.passedRejected,true);

  const gpsFixes = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now(),saved={stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,onlyServing:state.onlyServing,hideAway:state.hideAway,destFilter:state.destFilter,demo:state.demo,vehicles:state.vehicles,ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion};
    const trip='gps-fix-trip',pattern='aa49gpsfixpattern0001',at=new Date(now+30*60000),mins=at.getHours()*60+at.getMinutes();
    state.stop={id:'gps-fix-stop',timetableId:'gps-fix-stop',lat:52.5,lon:-2.1,name:'GPS fix stop',d:0};state.origin={lat:52.5,lon:-2.1,label:'GPS fix'};state.anchor={lat:52.6,lon:-2.1,name:'Town Centre',synthetic:false};state.dir='in';state.onlyServing=true;state.hideAway=true;state.destFilter=null;state.demo=false;state.vehicles=new Map();state.ttStop={id:'gps-fix-stop',d:[[mins,'61','Town Centre','daily','in',trip,pattern]]};state.timetable={services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},tripPatterns:{[trip]:pattern},patterns:{[pattern]:{p:[[52.2,-2.1],[52.35,-2.1],[52.5,-2.1],[52.6,-2.1]],s:[['start','Start',52.2,-2.1],['gps-fix-stop','GPS fix stop',52.5,-2.1],['town','Town Centre',52.6,-2.1]],g:1}}};state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun++;
    try{
      const v={id:'GPSFIX|journey|'+trip,journey:trip,line:'61',lineRef:'61',dest:'Town Centre',operator:'GPSFIX',declaredDir:'',lat:52.35,lon:-2.1,bearing:0,feedSpeed:8,ts:now,timestampKnown:true,corridorTracked:true,corridorTrip:trip,corridorRemaining:17000,corridorConfirmedAt:now,hist:[{lat:52.32,lon:-2.1,ts:now-60000},{lat:52.35,lon:-2.1,ts:now}]};api.ingest([v]);const ordinary={...v,lat:52.36,ts:now+15000,corridorTracked:false};delete ordinary.corridorTrip;delete ordinary.corridorRemaining;delete ordinary.corridorConfirmedAt;delete ordinary.hist;api.ingest([ordinary]);const live=api.relevant(),kept=state.vehicles.get(v.id),progress=api.journeyProgress(kept);kept.ts=now-5*60000;const held=api.relevant();const away={...kept,id:'away',ts:now,hist:[{lat:52.37,lon:-2.1,ts:now-60000},{lat:52.34,lon:-2.1,ts:now}],bearing:180};state.vehicles=new Map([[away.id,away]]);const wrong=api.relevant();return {corridor:kept.corridorTracked&&kept.corridorTrip===trip,live:live.length,progress:!!progress,held:held.some(r=>r.gpsLost),away:wrong.some(r=>r.v.id==='away')};
    }finally{Object.assign(state,saved);}
  });
  assert.equal(gpsFixes.corridor,true);assert.equal(gpsFixes.live,1);assert.equal(gpsFixes.progress,true);assert.equal(gpsFixes.held,true);assert.equal(gpsFixes.away,false);

  const gpsSafety = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,onlyServing:state.onlyServing,hideAway:state.hideAway,destFilter:state.destFilter,demo:state.demo,vehicles:state.vehicles,ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion};
    try{
      state.stop={id:'gps-safety-stop',timetableId:'gps-safety-stop',lat:52.5,lon:-2.1,name:'GPS safety stop',d:0};
      state.origin={lat:52.5,lon:-2.1,label:'GPS safety'};state.anchor={lat:52.5,lon:-2.1,name:'Local area',synthetic:true};state.dir='in';state.onlyServing=false;state.hideAway=false;state.destFilter=null;state.demo=false;state.vehicles=new Map();state.ttStop=null;state.timetable=null;state.timetableSource='';state.timetableRegion='';state.timetableRun++;
      api.ingest([{id:'ordered',journey:'ordered-trip',line:'77',dest:'Town Centre',lat:52.5,lon:-2.1,bearing:NaN,feedSpeed:8,ts:now,timestampKnown:true,corridorTracked:false}]);
      api.ingest([{id:'ordered',journey:'ordered-trip',line:'77',dest:'Town Centre',lat:51.5,lon:-3.1,bearing:180,feedSpeed:8,ts:now-60000,timestampKnown:true,corridorTracked:true,corridorTrip:'ordered-trip',corridorRemaining:12000,corridorConfirmedAt:now}]);
      const ordered=state.vehicles.get('ordered');
      const newestPositionKept=ordered.ts===now&&ordered.lat===52.5&&ordered.lon===-2.1&&ordered.hist[ordered.hist.length-1].ts===now;
      const olderEvidenceMerged=ordered.corridorTracked&&ordered.corridorTrip==='ordered-trip';
      ordered.corridorConfirmedAt=now-6*60000;
      api.ingest([{id:'ordered',journey:'ordered-trip',line:'77',dest:'Town Centre',lat:52.5001,lon:-2.1,bearing:NaN,feedSpeed:8,ts:now+1000,timestampKnown:true,corridorTracked:false}]);
      const expired=state.vehicles.get('ordered');
      const corridorExpired=!expired.corridorTracked&&!expired.corridorTrip&&api.vehicleJourneyRef(expired)==='ordered-trip';

      const snapshotVehicle={id:'snapshot',journey:'snapshot-trip',line:'9',dest:'Town Centre',lat:52.49,lon:-2.1,ts:now-5*60000,lastShownStopId:'gps-safety-stop',lastShownAt:now-1000,lastShownArrivalAt:now+5*60000,lastShownBoardDir:'in',lastShownDestFilter:'',lastShownSnapshot:{v:null,dir:'in',app:true,strength:1,secs:300,metres:500,routeMetres:null,geometry:null,confidence:'high',spread:90,evidence:{score:5},schedule:{trip:'snapshot-trip',at:now+5*60000},recovered:false,match:'exact journey',directionLabel:'Journey: inbound'}};
      state.dir='in';state.destFilter=null;const sameContext=!!api.retainedSnapshotRow(snapshotVehicle,now);
      state.dir='out';const wrongDirection=!!api.retainedSnapshotRow(snapshotVehicle,now);
      state.dir='in';state.destFilter='Other place';const wrongDestination=!!api.retainedSnapshotRow(snapshotVehicle,now);
      const lostRow={gpsLost:true,schedule:{trip:'lost-trip',at:now+5*60000}};
      const lostAlarm=api.alarmRowEligible(lostRow),lostClaims=api.scheduleClaimedByLive(lostRow),freshClaims=api.scheduleClaimedByLive({gpsLost:false,schedule:lostRow.schedule});

      const directionTrip='direction-trip',departure=new Date(now+150*60000),mins=departure.getHours()*60+departure.getMinutes();
      state.dir='out';state.destFilter=null;state.onlyServing=true;state.vehicles=new Map();
      state.ttStop={id:'gps-safety-stop',d:[[mins,'77','Town Centre','daily','in',directionTrip,'']]};
      state.timetable={services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},tripPatterns:{},patterns:{}};state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun++;
      api.ingest([{id:'direction',journey:directionTrip,line:'77',dest:'',lat:52.5005,lon:-2.1,bearing:NaN,feedSpeed:8,ts:now,timestampKnown:true,corridorTracked:false}]);
      const wrongBoardDirection=api.relevant().some(row=>row.v.id==='direction');
      return {newestPositionKept,olderEvidenceMerged,corridorExpired,sameContext,wrongDirection,wrongDestination,lostAlarm,lostClaims,freshClaims,wrongBoardDirection};
    }finally{Object.assign(state,saved);}
  });
  assert.equal(gpsSafety.newestPositionKept,true);
  assert.equal(gpsSafety.olderEvidenceMerged,true);
  assert.equal(gpsSafety.corridorExpired,true);
  assert.equal(gpsSafety.sameContext,true);
  assert.equal(gpsSafety.wrongDirection,false);
  assert.equal(gpsSafety.wrongDestination,false);
  assert.equal(gpsSafety.lostAlarm,false);
  assert.equal(gpsSafety.lostClaims,false);
  assert.equal(gpsSafety.freshClaims,true);
  assert.equal(gpsSafety.wrongBoardDirection,false);

  // A live bus identity-matched to a departure but running far enough off its
  // scheduled time that estimate() declines to blend the two. It used not to
  // claim the timetable row, so the same journey appeared twice: once live and
  // again as a schedule-only row, sometimes captioned "possible GPS match was
  // filtered" next to the very bus it was describing.
  const duplicateDeparture = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState;
    const saved={ttStop:state.ttStop,dir:state.dir,destFilter:state.destFilter,timetable:state.timetable};
    try{
      const now=new Date(),mins=now.getHours()*60+now.getMinutes()+30;
      state.dir='all';state.destFilter=null;
      state.ttStop={d:[[mins,'61','Halesowen','','0','T1','P1']]};
      state.timetable={patterns:{},tripPatterns:{}};
      const bare=api.scheduledBoardRows([]),row=bare[0]&&bare[0].schedule;
      const matchedOnly=api.scheduledBoardRows([{v:{id:'V1',line:'61'},matchedSchedule:row,schedule:null,gpsLost:false,secs:600}]);
      const blended=api.scheduledBoardRows([{v:{id:'V1',line:'61'},schedule:row,gpsLost:false,secs:600}]);
      const lost=api.scheduledBoardRows([{v:{id:'V1',line:'61'},matchedSchedule:row,gpsLost:true,secs:600}]);
      return {bare:bare.length,matchedOnly:matchedOnly.length,blended:blended.length,lost:lost.length};
    }finally{Object.assign(state,saved);}
  });
  // Identity alone suppresses the duplicate; losing GPS releases the claim so
  // the timetable shows through again.
  assert.deepEqual(duplicateDeparture,{bare:1,matchedOnly:0,blended:0,lost:1});

  // One malformed box among several used to fall through to "no buses were
  // reported": a broken response presented as a verified empty area, counted as
  // a successful poll, with the previous vehicles left to age out silently.
  const malformedCoverage = await page.evaluate(async () => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState;
    const saved={origin:state.origin,proxy:state.proxy,key:state.key,demo:state.demo,lastWideFetch:state.lastWideFetch,stop:state.stop};
    const originalFetch=window.fetch;
    const ok=()=>'<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery><ResponseTimestamp>'+new Date().toISOString()+'</ResponseTimestamp></VehicleMonitoringDelivery></ServiceDelivery></Siri>';
    const bad='<?xml version="1.0"?><Siri><ServiceDelivery><VehicleMonitoringDelivery>';
    const run=async bodyFor=>{
      let n=0;
      window.fetch=async()=>{ n++; return new Response(bodyFor(n),{status:200,headers:{'Content-Type':'application/xml'}}); };
      state.lastWideFetch=0;
      let threw=null,result=null;
      try{ result=await api.fetchLive(new AbortController().signal); }catch(e){ threw=e; }
      return {boxes:n,soft:!!(threw&&threw.soft),msg:threw?threw.msg:null,emptied:Array.isArray(result)&&result.length===0,partial:state.feedPartial};
    };
    try{
      state.demo=false;state.proxy='https://example.test';state.key='';
      state.origin={lat:52.48,lon:-1.90,label:'test'};
      state.stop={id:'S1',lat:52.48,lon:-1.90,name:'Test'};
      return {all:await run(()=>bad),one:await run(n=>n===1?ok():bad),none:await run(()=>ok())};
    } finally { window.fetch=originalFetch; Object.assign(state,saved); }
  });
  assert.equal(malformedCoverage.one.boxes>1,true,'the wide scan must fetch more than one box');
  // A single bad box raises a feed error and flags partial coverage, so the
  // caller keeps the last verified board instead of blanking it.
  assert.equal(malformedCoverage.one.soft,true);
  assert.match(malformedCoverage.one.msg,/Part of the live feed returned malformed XML/);
  assert.equal(malformedCoverage.one.partial,true);
  assert.equal(malformedCoverage.one.emptied,false);
  assert.match(malformedCoverage.all.msg,/^The live feed returned malformed XML\.$/);
  // A genuinely empty area is still reported as empty, not as a failure.
  assert.equal(malformedCoverage.none.soft,false);
  assert.equal(malformedCoverage.none.emptied,true);
  assert.equal(malformedCoverage.none.partial,false);

  const resilience = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now(),saved={anchor:state.anchor,timetable:state.timetable,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion,patternPending:new Set(state.patternPending)};
    try{
      const vehicle={hist:[{lat:52.40,lon:-2.1,ts:now-80000},{lat:52.45,lon:-2.1,ts:now-60000},{lat:52.44,lon:-2.1,ts:now-40000},{lat:52.43,lon:-2.1,ts:now-20000},{lat:52.42,lon:-2.1,ts:now}],bearing:NaN};
      state.anchor={lat:52.6,lon:-2.1,name:'Town',synthetic:false};const direction=api.gpsMovementDirection(vehicle),recent=api.recentMovementPoints(vehicle).length;
      state.anchor={lat:52.6,lon:-2.1,name:'Local',synthetic:true};const synthetic=api.gpsMovementDirection(vehicle);
      const staleMap=api.mapVehicleVisible({ts:now-5*60000},false,now),heldMap=api.mapVehicleVisible({ts:now-5*60000},true,now);
      const id='aa52loadingpattern0001';state.timetable={tripPatterns:{trip:id},patterns:{}};state.timetableSource='national';state.timetableRegion='west_midlands';state.patternPending.add('west_midlands/aa');
      const loading=api.timetablePatternLoadState('trip',''),html=api.journeyProgressHtml({journey:'trip',progressTrip:'trip',progressPattern:id});
      const plan=api.nationalStopRegionPlan({region:'west_midlands',lat:52.5,lon:-2.1},{regions:{west_midlands:{bounds:[-3,51,-1,53]},north_west:{bounds:[-4,53,-1,56]}}});
      return {direction,recent,synthetic,staleMap,heldMap,loading,html,primary:plan.primary,fallback:plan.fallback,mapHelper:api.mapVehicleVisible.toString(),mapAge:now-(now-5*60000),mapTimestamp:now-5*60000,now};
    }finally{state.patternPending.clear();for(const item of saved.patternPending)state.patternPending.add(item);Object.assign(state,{anchor:saved.anchor,timetable:saved.timetable,timetableSource:saved.timetableSource,timetableRegion:saved.timetableRegion});}
  });
  assert.equal(resilience.direction,'out');assert.equal(resilience.recent,4);assert.equal(resilience.synthetic,'unknown');assert.equal(resilience.staleMap,false,JSON.stringify(resilience));assert.equal(resilience.heldMap,true,JSON.stringify(resilience));assert.equal(resilience.loading,'loading');assert.match(resilience.html,/Loading journey progress/);assert.deepEqual(resilience.primary,['west_midlands']);assert.deepEqual(resilience.fallback,['north_west']);

  const refreshGate = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,saved=state.feedRefreshing;
    try{
      state.feedRefreshing=true;const busy=api.boardRefreshCanRender();
      state.feedRefreshing=false;const idle=api.boardRefreshCanRender();
      return {busy,idle};
    }finally{state.feedRefreshing=saved;}
  });
  assert.equal(refreshGate.busy,false);
  assert.equal(refreshGate.idle,true);

  const routeOverlayRetention = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={
      selected:state.selected,stop:state.stop,dir:state.dir,destFilter:state.destFilter,
      timetable:state.timetable,timetableSource:state.timetableSource,
      timetableRegion:state.timetableRegion,timetableRun:state.timetableRun,
      vehicles:state.vehicles
    };
    const trip='route-overlay-trip',patternId='aa53routeoverlaypattern',vehicleId='route-overlay-vehicle';
    try{
      state.stop={id:'route-overlay-stop',timetableId:'route-overlay-stop',lat:52.5,lon:-2.1,name:'Route overlay stop',d:0};
      state.dir='all';state.destFilter=null;state.selected=vehicleId;
      state.timetable={services:{},tripPatterns:{[trip]:patternId},patterns:{
        [patternId]:{p:[[52.4,-2.1],[52.5,-2.1],[52.6,-2.1]],s:[
          ['start','Start',52.4,-2.1],['route-overlay-stop','Route overlay stop',52.5,-2.1],['end','End',52.6,-2.1]
        ],g:1}
      }};
      state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun++;
      const vehicle={id:vehicleId,journey:trip,progressTrip:trip,progressPattern:patternId,lat:52.45,lon:-2.1,bearing:0,ts:now,hist:[]};
      state.vehicles=new Map([[vehicleId,vehicle]]);
      api.clearJourneyRoute();
      api.renderSelectedJourney([{v:vehicle,gpsLost:false}]);
      const initial=api.journeyRouteLayerSize();
      api.renderSelectedJourney([]);
      const retained=api.journeyRouteLayerSize();
      api.renderSelectedJourney([{v:vehicle,gpsLost:true}]);
      const lostCleared=api.journeyRouteLayerSize();
      api.renderSelectedJourney([{v:vehicle,gpsLost:false}]);
      const redrawn=api.journeyRouteLayerSize();
      state.dir='in';
      api.renderSelectedJourney([]);
      const contextCleared=api.journeyRouteLayerSize();
      return {initial,retained,lostCleared,redrawn,contextCleared};
    }finally{
      api.clearJourneyRoute();
      Object.assign(state,saved);
    }
  });
  assert.ok(routeOverlayRetention.initial>0,JSON.stringify(routeOverlayRetention));
  assert.equal(routeOverlayRetention.retained,routeOverlayRetention.initial,JSON.stringify(routeOverlayRetention));
  assert.equal(routeOverlayRetention.lostCleared,0,JSON.stringify(routeOverlayRetention));
  assert.ok(routeOverlayRetention.redrawn>0,JSON.stringify(routeOverlayRetention));
  assert.equal(routeOverlayRetention.contextCleared,0,JSON.stringify(routeOverlayRetention));

  const emptyFeed = await page.evaluate(async () => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,originalFetch=window.fetch;
    const saved={stop:state.stop,origin:state.origin,proxy:state.proxy,key:state.key,demo:state.demo,lastWideFetch:state.lastWideFetch,feedFallback:state.feedFallback,feedStale:state.feedStale,feedUnknownAge:state.feedUnknownAge,feedEmptyReason:state.feedEmptyReason};
    state.stop={id:'empty-feed-stop',lat:52.5,lon:-2.1,name:'Empty feed stop'};
    state.origin={lat:52.5,lon:-2.1,label:'Empty feed'};
    state.proxy='https://empty-feed.test';state.key='';state.demo=false;state.lastWideFetch=Date.now();
    window.fetch=async () => new Response('<?xml version="1.0"?><Siri><ServiceDelivery><VehicleMonitoringDelivery></VehicleMonitoringDelivery></ServiceDelivery></Siri>',{status:200,headers:{'Content-Type':'application/xml'}});
    try{
      const rows=await api.fetchLive();
      return {count:rows.length,reason:state.feedEmptyReason};
    }finally{
      window.fetch=originalFetch;Object.assign(state,saved);
    }
  });
  assert.equal(emptyFeed.count,0);
  assert.match(emptyFeed.reason,/No buses were reported/);

  const partialFeed = await page.evaluate(async () => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,originalFetch=window.fetch;
    const saved={stop:state.stop,origin:state.origin,proxy:state.proxy,key:state.key,demo:state.demo,lastWideFetch:state.lastWideFetch,feedFallback:state.feedFallback,feedStale:state.feedStale,feedUnknownAge:state.feedUnknownAge,feedEmptyReason:state.feedEmptyReason,feedPartial:state.feedPartial};
    state.stop={id:'partial-feed-stop',lat:52.5,lon:-2.1,name:'Partial feed stop'};state.origin={lat:52.5,lon:-2.1,label:'Partial feed'};state.proxy='https://partial-feed.test';state.key='';state.demo=false;state.lastWideFetch=0;
    const empty='<?xml version="1.0"?><Siri><ServiceDelivery><VehicleMonitoringDelivery></VehicleMonitoringDelivery></ServiceDelivery></Siri>';let calls=0;
    window.fetch=async () => {calls++;if(calls===1)return new Response(empty,{status:200,headers:{'Content-Type':'application/xml'}});throw new TypeError('offline');};
    try{
      try{await api.fetchLive();return {resolved:true,calls,partial:state.feedPartial,msg:''};}
      catch(e){return {resolved:false,calls,partial:state.feedPartial,msg:String(e&&e.msg||e)};}
    }finally{window.fetch=originalFetch;Object.assign(state,saved);}
  });
  assert.equal(partialFeed.resolved,false);
  assert.equal(partialFeed.partial,true);
  assert.equal(partialFeed.calls,3);
  assert.match(partialFeed.msg,/coverage was incomplete/i);

  const wideFallback = await page.evaluate(async () => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState;
    const saved={
      stop:state.stop,origin:state.origin,proxy:state.proxy,key:state.key,lastWideFetch:state.lastWideFetch,
      feedFallback:state.feedFallback,feedStale:state.feedStale,feedUnknownAge:state.feedUnknownAge
    };
    state.stop={id:'test-stop',lat:52.5,lon:-2.1,name:'Test stop'};
    state.origin={lat:52.5,lon:-2.1,label:'Test'};
    state.proxy='https://kerbside-bus.adambullas.workers.dev';
    state.key='';state.lastWideFetch=0;
    try{
      const vehicles=await api.fetchLive();
      return {count:vehicles.length,ids:vehicles.map(vehicle=>vehicle.id).sort(),cooldown:Date.now()-state.lastWideFetch<5000};
    }finally{
      Object.assign(state,saved);
    }
  });
  // Ids carry the vehicle reference alongside the journey since 0.6.61.
  assert.deepEqual(wideFallback,{count:2,ids:['NEAR|journey|nearby-1-trip|vehicle|nearby-1','WIDE|journey|wide-1-trip|vehicle|wide-1'],cooldown:true});
  assert.ok(wideFeedRequests>=2);
  assert.equal(nearbyFeedRequests,1);

  const routeLookupPolicy = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,now=Date.now();
    const official=api.routeLookupQueries({id:'490G00012345',source:'official',lat:52.5,lon:-2.1});
    const osm=api.routeLookupQueries({id:123456789,lat:52.5,lon:-2.1});
    const records={
      stop:{routes:[{ref:'9'}],source:'stop',ts:now},
      nearby:{routes:[{ref:'9'}],source:'nearby',ts:now},
      along:{routes:[{ref:'9'}],source:'along',ts:now},
      empty:{routes:[],source:'empty',ts:now}
    };
    return {
      officialSources:official.map(item=>item.source),
      officialContainsCode:official.some(item=>item.query.includes('490G00012345')),
      osmSources:osm.map(item=>item.source),
      osmExact:osm[0]?.query.includes('node(123456789)'),
      exactOfficial:api.canQueryExactOsmStop({id:'490G00012345',source:'official'}),
      exactOsm:api.canQueryExactOsmStop({id:123456789}),
      ttls:Object.fromEntries(Object.entries(records).map(([key,value])=>[key,api.mappedRecordTtl(value)])),
      freshEmpty:api.mappedRecordFresh(records.empty,now+2*3600*1000),
      staleEmpty:api.mappedRecordFresh(records.empty,now+2*3600*1000+1),
      staleAlong:api.mappedRecordFresh(records.along,now+24*3600*1000+1)
    };
  });
  assert.deepEqual(routeLookupPolicy,{
    officialSources:['nearby','along'],officialContainsCode:false,
    osmSources:['stop','nearby','along'],osmExact:true,
    exactOfficial:false,exactOsm:true,
    ttls:{stop:2592000000,nearby:604800000,along:86400000,empty:7200000},
    freshEmpty:true,staleEmpty:false,staleAlong:false
  });

  const serviceCalendar = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,saved=state.timetable;
    state.timetable={services:{
      '1111100':{days:'1111100',start:'20260101',end:'20261231',add:['20260801'],remove:['20260803']}
    }};
    try{
      const spring=api.serviceDepartureTime(new Date(2026,2,29),180);
      const autumn=api.serviceDepartureTime(new Date(2026,9,25),180);
      const overnight=api.serviceDepartureTime(new Date(2026,7,2),1530);
      return {
        removedBinaryId:api.serviceRuns('1111100',new Date(2026,7,3)),
        addedBinaryId:api.serviceRuns('1111100',new Date(2026,7,1)),
        legacyMonday:api.serviceRuns('1000000',new Date(2026,7,3)),
        legacySaturday:api.serviceRuns('1000000',new Date(2026,7,1)),
        spring:[spring.getFullYear(),spring.getMonth()+1,spring.getDate(),spring.getHours(),spring.getMinutes()],
        autumn:[autumn.getFullYear(),autumn.getMonth()+1,autumn.getDate(),autumn.getHours(),autumn.getMinutes()],
        overnight:[overnight.getFullYear(),overnight.getMonth()+1,overnight.getDate(),overnight.getHours(),overnight.getMinutes()],
        extendedHours:api.parseDepMinutes('100:05')
      };
    }finally{state.timetable=saved;}
  });
  assert.deepEqual(serviceCalendar,{
    removedBinaryId:false,addedBinaryId:true,legacyMonday:true,legacySaturday:false,
    spring:[2026,3,29,3,0],autumn:[2026,10,25,3,0],overnight:[2026,8,3,1,30],extendedHours:6005
  });

  const targetDayRows = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState;
    const saved={ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun};
    state.ttStop={id:'target-day-test',d:[
      ['23:55','L23','Late','daily','','trip-23',''],
      ['25:30','N25','Overnight','daily','','trip-25',''],
      ['100:05','X100','Extended','extreme','','trip-100','']
    ]};
    state.timetable={services:{
      daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]},
      extreme:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:['20260730']}
    }};
    state.timetableRun=Number(state.timetableRun||0)+1;
    try{
      const rows=api.timetableRows(new Date(2026,7,3,12,0));
      const summary=trip=>rows.filter(row=>row.trip===trip).sort((a,b)=>a.at-b.at).map(row=>{
        const at=new Date(row.at);
        return [at.getFullYear(),at.getMonth()+1,at.getDate(),at.getHours(),at.getMinutes()];
      });
      return {late:summary('trip-23'),overnight:summary('trip-25'),extended:summary('trip-100')};
    }finally{
      state.ttStop=saved.ttStop;state.timetable=saved.timetable;state.timetableRun=saved.timetableRun;
    }
  });
  assert.deepEqual(targetDayRows,{
    late:[[2026,8,2,23,55],[2026,8,3,23,55],[2026,8,4,23,55]],
    overnight:[[2026,8,2,1,30],[2026,8,3,1,30],[2026,8,4,1,30]],
    extended:[[2026,8,2,4,5],[2026,8,4,4,5]]
  });

  const stopDiscoveryPolicy = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__;
    const official={id:'490G00012345',timetableId:'490G00012345',source:'official',name:'High Street',atco:'490G00012345',ind:'Stop A',lat:52.5,lon:-2.1};
    const duplicate={id:123456,name:'High Street',atco:'490G00012345',ind:'',lat:52.50001,lon:-2.10001};
    const otherSide={id:123457,name:'High Street',ind:'Stop B',lat:52.50018,lon:-2.1};
    const localRefA={id:2001,name:'Market Street',code:'A',lat:52.5,lon:-2.1};
    const localRefElsewhere={id:2002,name:'Market Street',code:'A',lat:52.503,lon:-2.1};
    const closeDuplicate={id:2003,name:'Market Street',code:'A',lat:52.50004,lon:-2.10001};
    const sameIdElsewhere={id:2001,name:'Renamed Market Street',code:'B',lat:52.51,lon:-2.1};
    const merged=api.mergeDiscoveredStops([official],[duplicate,otherSide],52.5,-2.1);
    return {
      cacheA:api.stopCacheKey(52.50004,-2.10004,1200),
      cacheB:api.stopCacheKey(52.50006,-2.10006,1200),
      cacheFarAway:api.stopCacheKey(52.53,-2.10004,1200),
      sameCode:api.sameDiscoveredStop(official,duplicate),
      otherSideSame:api.sameDiscoveredStop(official,otherSide),
      repeatedLocalRefSame:api.sameDiscoveredStop(localRefA,localRefElsewhere),
      closeLocalDuplicate:api.sameDiscoveredStop(localRefA,closeDuplicate),
      stableIdSame:api.sameDiscoveredStop(localRefA,sameIdElsewhere),
      count:merged.length,
      ids:merged.map(stop=>String(stop.id)).sort(),
      officialSource:merged.find(stop=>String(stop.id)==='490G00012345')?.source,
      officialIndicator:merged.find(stop=>String(stop.id)==='490G00012345')?.ind
    };
  });
  /* These two fixes are 2.6 metres apart — the same phone standing still. They
     must now share a key: separating them is exactly what stopped the cache
     from ever being read. A genuinely different area still gets its own key. */
  assert.equal(stopDiscoveryPolicy.cacheA,stopDiscoveryPolicy.cacheB);
  assert.notEqual(stopDiscoveryPolicy.cacheA,stopDiscoveryPolicy.cacheFarAway);
  assert.match(stopDiscoveryPolicy.cacheA,/kerbside\.stops\.v7/);
  assert.deepEqual({...stopDiscoveryPolicy,cacheA:undefined,cacheB:undefined,cacheFarAway:undefined},{
    cacheA:undefined,cacheB:undefined,cacheFarAway:undefined,sameCode:true,otherSideSame:false,
    repeatedLocalRefSame:false,closeLocalDuplicate:true,stableIdSame:true,count:2,
    ids:['123457','490G00012345'],officialSource:'official',officialIndicator:'Stop A'
  });

  const tripMatching = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__;
    const unique=api.uniqueCompatibleTrips([{trip:'trip-AB12345678'},{trip:'unrelated-XY87654321'}],'operator:trip-AB12345678');
    const ambiguous=api.uniqueCompatibleTrips([{trip:'one|AB12345678'},{trip:'two|AB12345678'}],'live|AB12345678|x');
    return {
      exact:api.tripRefMatchStrength('trip-AB12345678','trip-AB12345678'),
      compact:api.tripRefMatchStrength('Trip-AB12345678','trip_AB12345678'),
      uniqueRef:unique.ref, uniqueStrength:unique.strength, uniqueCount:unique.items.length,
      ambiguous:ambiguous.ambiguous, ambiguousCount:ambiguous.items.length
    };
  });
  assert.deepEqual(tripMatching, {
    exact:4, compact:3,
    uniqueRef:'trip-AB12345678', uniqueStrength:2, uniqueCount:1,
    ambiguous:true, ambiguousCount:0
  });
  const learningKeys = await page.evaluate(() => {
    const key=window.__KERBSIDE_TEST__.lineLearningKey;
    return [
      key({operator:'OP-A',lineRef:'route-9',line:'9'}),
      key({operator:'OP-B',lineRef:'route-9',line:'9'}),
      key({operator:'OP-A',lineRef:'route-9X',line:'9'})
    ];
  });
  assert.equal(new Set(learningKeys).size, 3);
  const cleanedNames = await page.evaluate(() => {
    const clean=window.__KERBSIDE_TEST__.cleanName;
    return [clean('ST HELENS'), clean('BURY ST EDMUNDS'), clean('HIGH ST')];
  });
  assert.deepEqual(cleanedNames, ['St Helens', 'Bury St Edmunds', 'High St']);
  const mapContextMenu = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,previous=state.anchor;
    const anchor={lat:52.509,lon:-2.087,name:'Original town'};
    let prevented=false,stopped=false;
    state.anchor=anchor;
    try{
      const result=api.ignoreMapContextMenu({originalEvent:{
        preventDefault(){prevented=true;},
        stopPropagation(){stopped=true;}
      }});
      return {same:state.anchor===anchor,prevented,stopped,result};
    }finally{state.anchor=previous;}
  });
  assert.deepEqual(mapContextMenu,{same:true,prevented:true,stopped:true,result:false});
  const mapStopSelection = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState;
    const before=state.stop&&String(state.stop.id);
    const base=state.stop||state.origin||{lat:52.509,lon:-2.087};
    const target={id:'map-test-stop',name:'Map-selected stop',ind:'B',lat:Number(base.lat)+.0001,lon:Number(base.lon)+.0001,d:120,region:'test',shard:'aa',timetableId:'map-test-stop'};
    state.stops=[...state.stops.filter(stop=>String(stop.id)!==target.id),target];
    document.getElementById('vMap').click();
    api.selectStopFromMap(target);
    return {
      changed:before!==String(state.stop&&state.stop.id),
      selected:String(state.stop&&state.stop.id),
      target:target.id,
      heading:document.getElementById('stopName').textContent,
      appView:state.appView,
      timesSelected:document.getElementById('vTimes').getAttribute('aria-selected'),
      mapSelected:document.getElementById('vMap').getAttribute('aria-selected')
    };
  });
  assert.deepEqual(mapStopSelection,{
    changed:true,selected:'map-test-stop',target:'map-test-stop',heading:'Map-selected stop (B)',
    appView:'times',timesSelected:'true',mapSelected:'false'
  });
  const alertGrace = await page.evaluate(() => {
    const retain=window.__KERBSIDE_TEST__.retainFiredAlarm;
    const alarm={fired:true,lastSeenAt:1000};
    return [retain(alarm,120999),retain(alarm,121001),retain({fired:false,lastSeenAt:1000},2000)];
  });
  assert.deepEqual(alertGrace, [true,false,false]);
  const dataUrls = await page.evaluate(() => {
    const build='2026-08-02T05:20:00.000Z';
    const make=window.__KERBSIDE_TEST__.versionedDataUrl;
    return {manifest:make('/manifest.json',build),pattern:make('/regions/test/patterns/aa.json',build),build};
  });
  assert.equal(new URL(dataUrls.manifest).searchParams.has('v'), false);
  assert.equal(new URL(dataUrls.pattern).searchParams.get('v'), dataUrls.build);
  const timetableIndex = await page.evaluate(() => {
    const index=window.__KERBSIDE_TEST__.indexTimetableRows([
      {line:'9',id:1},{line:'9',id:2},{line:'X8',id:3}
    ]);
    return {nine:index.get('9').length,x8:index.get('X8').length,missing:index.get('1')||null};
  });
  assert.deepEqual(timetableIndex, {nine:2,x8:1,missing:null});
  const routeProjection = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__;
    const points=[
      {lat:0,lon:-.01},{lat:0,lon:.01},{lat:.01,lon:.01},
      {lat:-.01,lon:0},{lat:.01,lon:0}
    ];
    const candidates=api.patternProjectionCandidates(points,0,0);
    const east=api.choosePatternProjection(candidates,{bearing:90,ts:2000});
    const north=api.choosePatternProjection(candidates,{bearing:0,ts:2000});
    const continuous=api.choosePatternProjection(candidates,{previous:{along:north.along-10,ts:1000},ts:2000,groundMovement:12});
    return {east:east.segment,north:north.segment,continuous:continuous.segment,forward:continuous.along>=north.along-80};
  });
  assert.deepEqual(routeProjection, {east:0,north:3,continuous:3,forward:true});
  const routeIntelligence = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__;
    const patternA={id:'pattern-a',shape:true,stopProgress:null,points:[
      {lat:0,lon:0},{lat:0,lon:.01},{lat:0,lon:.02}
    ],stops:[
      {id:'a',name:'First',lat:0,lon:.002},{id:'target',name:'Target',lat:0,lon:.018}
    ]};
    const patternB={id:'pattern-b',shape:true,stopProgress:null,points:[
      {lat:.005,lon:0},{lat:.005,lon:.01},{lat:.005,lon:.02}
    ],stops:[
      {id:'b',name:'Other first',lat:.005,lon:.002},{id:'other-target',name:'Other target',lat:.005,lon:.018}
    ]};
    const vehicle={lat:0,lon:.006,bearing:90,ts:30000,speed:7,cadence:15,hist:[
      {lat:0,lon:.002,ts:0},{lat:0,lon:.004,ts:15000},{lat:0,lon:.006,ts:30000}
    ]};
    const target={id:'target',lat:0,lon:.018};
    const fitA=api.routePatternMovementFit(patternA,vehicle,target);
    const fitB=api.routePatternMovementFit(patternB,vehicle,{id:'other-target',lat:.005,lon:.018});
    const chosen=api.chooseInferredJourneyCandidate([
      {trip:'trip-a',pattern:patternA,fit:fitA,score:40},
      {trip:'trip-b',pattern:patternB,fit:fitB,score:240}
    ]);
    const ambiguous=api.chooseInferredJourneyCandidate([
      {trip:'trip-a',pattern:patternA,fit:fitA,score:40},
      {trip:'trip-b',pattern:patternB,fit:fitB,score:100}
    ]);
    const routed=api.visualRoutePosition(vehicle,patternA,120);
    return {
      fitA:fitA&&Math.round(fitA.current.metres),
      fitB:fitB&&Math.round(fitB.current.metres),
      chosen:chosen&&chosen.trip,
      ambiguous:ambiguous&&ambiguous.trip,
      routed:routed&&{east:routed.lon>vehicle.lon,onRoute:Math.abs(routed.lat)<1e-7,routeGuided:routed.routeGuided}
    };
  });
  assert.equal(routeIntelligence.fitA,0);
  assert.ok(routeIntelligence.fitB>400);
  assert.equal(routeIntelligence.chosen,'trip-a');
  assert.equal(routeIntelligence.ambiguous,null);
  assert.deepEqual(routeIntelligence.routed,{east:true,onRoute:true,routeGuided:true});

  const reliability = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,onlyServing:state.onlyServing,hideAway:state.hideAway,destFilter:state.destFilter,demo:state.demo,vehicles:state.vehicles,ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion,routeScanHistory:state.routeScanHistory};
    try{
      const stationary={id:'stationary',line:'63',lat:52.5,lon:-2.1,bearing:90,ts:now,stationaryAt:now,speed:8,cadence:15,hist:[{lat:52.5,lon:-2.11,ts:now-30000},{lat:52.5,lon:-2.1,ts:now-15000},{lat:52.5,lon:-2.1,ts:now}]};
      const stationaryVisual=api.visualVehiclePosition(stationary,now+12000);

      state.vehicles=new Map();
      api.ingest([{id:'gap',journey:'gap-trip',line:'63',operator:'TEST',lat:52.4,lon:-2.2,bearing:90,feedSpeed:8,ts:now-240000,timestampKnown:true,corridorTracked:false}]);
      api.ingest([{id:'gap',journey:'gap-trip',line:'63',operator:'TEST',lat:52.5,lon:-2.1,bearing:90,feedSpeed:8,ts:now,timestampKnown:true,corridorTracked:false}]);
      const resetVehicle=state.vehicles.get('gap');

      const trip='priority-trip',patternId='priority-pattern',at=new Date(now+20*60000),mins=at.getHours()*60+at.getMinutes();
      const pattern={id:patternId,shape:true,stopProgress:null,points:[{lat:52.52,lon:-2.2},{lat:52.51,lon:-2.17},{lat:52.5,lon:-2.14},{lat:52.5,lon:-2.1}],stops:[{id:'start',name:'Start',lat:52.52,lon:-2.2},{id:'priority-stop',name:'Priority stop',lat:52.5,lon:-2.1}]};
      state.stop={id:'priority-stop',timetableId:'priority-stop',lat:52.5,lon:-2.1,name:'Priority stop',d:0};state.origin={lat:52.5,lon:-2.1,label:'Test'};state.anchor={lat:52.6,lon:-2.1,name:'Town Centre',synthetic:false};state.dir='all';state.onlyServing=true;state.hideAway=true;state.destFilter=null;state.demo=false;state.vehicles=new Map();state.ttStop={id:'priority-stop',d:[[mins,'63','Town Centre','daily','in',trip,patternId]]};state.timetable={services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},tripPatterns:{[trip]:patternId},patterns:{[patternId]:{p:pattern.points.map(p=>[p.lat,p.lon]),s:pattern.stops.map(s=>[s.id,s.name,s.lat,s.lon]),g:1}}};state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun++;
      api.ingest([{id:'priority',journey:trip,line:'63',lineRef:'63',dest:'Town Centre',operator:'TEST',declaredDir:'',lat:52.51,lon:-2.17,bearing:120,feedSpeed:7,ts:now,timestampKnown:true,corridorTracked:false,hist:[{lat:52.52,lon:-2.2,ts:now-60000},{lat:52.51,lon:-2.17,ts:now}]}]);
      const bothShown=api.relevant().some(row=>row.v.id==='priority');
      state.dir='in';
      const inShown=api.relevant().some(row=>row.v.id==='priority');

      state.routeScanHistory=new Map();
      const remotePattern={id:'remote-pattern',shape:true,stopProgress:null,points:[{lat:52.5,lon:-2.3},{lat:52.5,lon:-2.2},{lat:52.5,lon:-2.1}],stops:[{id:'remote-start',name:'Remote start',lat:52.5,lon:-2.3},{id:'priority-stop',name:'Priority stop',lat:52.5,lon:-2.1}]};
      api.rememberRouteScanVehicle({id:'remote-bus',journey:'',line:'63',dest:'Town Centre',lat:52.5,lon:-2.27,bearing:90,ts:now-60000,feedSpeed:8},now-60000);
      const remote=api.rememberRouteScanVehicle({id:'remote-bus',journey:'',line:'63',dest:'Town Centre',lat:52.5,lon:-2.22,bearing:90,ts:now,feedSpeed:8},now);
      const remoteFit=api.routePatternMovementFit(remotePattern,remote,state.stop);
      const plan={matches:[{trip:'remote-trip',line:'63',head:'Town Centre',pattern:remotePattern,targetAlong:remoteFit.target.along}]};
      const remoteMatched=api.matchRouteScanVehicle(plan,remote);
      return {
        stationaryHeld:!stationaryVisual.estimated&&stationaryVisual.lat===stationary.lat&&stationaryVisual.lon===stationary.lon,
        historyReset:resetVehicle.hist.length===1,
        bothShown,inShown,
        remoteInferred:!!(remoteMatched&&remoteMatched.corridorTracked&&remoteMatched.inferredTrip==='remote-trip')
      };
    }finally{Object.assign(state,saved);}
  });
  assert.deepEqual(reliability,{stationaryHeld:true,historyReset:true,bothShown:true,inShown:true,remoteInferred:true});

  await page.locator('#setBtn').click();
  await page.locator('#scrim.show').waitFor();
  assert.equal(await page.locator('#proxy').inputValue(), 'https://kerbside-bus.adambullas.workers.dev');
  assert.equal(await page.locator('#demoSw').getAttribute('aria-pressed'), 'false');
  await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.7.2'));

  await page.locator('#statsTab').click();
  assert.equal(await page.locator('#statsPanel').isVisible(), true);
  await page.locator('#dataTab').click();
  await page.locator('#closeSet').click();
  assert.equal(await page.locator('#scrim').isVisible(), false);

  await page.locator('#vMap').click();
  assert.equal(await page.locator('#vMap').getAttribute('aria-selected'), 'true');
  await page.locator('#vTimes').click();
  assert.equal(await page.locator('#vTimes').getAttribute('aria-selected'), 'true');

  await page.locator('#boardInfoBtn').click();
  assert.equal(await page.locator('#liveDiagnostics').isVisible(), true);
  assert.match(await page.locator('#liveDiagnostics').textContent(), /Choose a location|Waiting for the first live matching pass/);

  const before = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    height: window.innerHeight,
    viewbarBottom: document.getElementById('viewbar').getBoundingClientRect().bottom
  }));
  assert.ok(before.scrollWidth <= before.width + 1, `horizontal overflow: ${before.scrollWidth} > ${before.width}`);
  assert.ok(before.viewbarBottom <= before.height + 1, `viewbar outside viewport: ${before.viewbarBottom} > ${before.height}`);

  await page.locator('#setBtn').click();
  await page.locator('#closeSet').click();
  const after = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewbarBottom: document.getElementById('viewbar').getBoundingClientRect().bottom,
    height: window.innerHeight
  }));
  assert.ok(after.scrollWidth <= before.width + 1);
  assert.ok(after.viewbarBottom <= after.height + 1);


  const mobileLayouts=[];
  for(const viewport of [{width:320,height:568},{width:360,height:800},{width:393,height:852},{width:430,height:932}]){
    await page.setViewportSize(viewport);
    await page.waitForTimeout(40);
    mobileLayouts.push(await page.evaluate(() => {
      const search=document.querySelector('.searchwrap').getBoundingClientRect();
      const directions=document.querySelector('.dirswitch').getBoundingClientRect();
      const settings=document.getElementById('setBtn').getBoundingClientRect();
      return {
      overflow:document.documentElement.scrollWidth-window.innerWidth,
      searchWidth:search.width,
      aligned:Math.max(search.top,directions.top,settings.top)-Math.min(search.top,directions.top,settings.top),
      ordered:search.right<=directions.left+1&&directions.right<=settings.left+1,
      viewbar:getComputedStyle(document.getElementById('viewbar')).display
    };
    }));
  }
  for(const layout of mobileLayouts){
    assert.ok(layout.overflow<=1,JSON.stringify(layout));
    assert.ok(layout.searchWidth>=120,JSON.stringify(layout));
    assert.ok(layout.aligned<=2,JSON.stringify(layout));
    assert.ok(layout.ordered,JSON.stringify(layout));
    assert.equal(layout.viewbar,'flex');
  }
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(40);
  const desktopLayout=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-window.innerWidth,
    topbar:getComputedStyle(document.getElementById('topbar')).display,
    viewbar:getComputedStyle(document.getElementById('viewbar')).display,
    icon:getComputedStyle(document.querySelector('.brand-icon')).display,
    map:getComputedStyle(document.getElementById('map')).display,
    board:getComputedStyle(document.getElementById('board')).display
  }));
  assert.deepEqual(desktopLayout,{overflow:0,topbar:'flex',viewbar:'none',icon:'none',map:'block',board:'flex'});
  await page.setViewportSize({width:393,height:852});

  console.log('Kerbside WebKit mobile and desktop regression checks passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
