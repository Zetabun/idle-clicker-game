import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

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
assert.match(busSource, /const ALERT_MISSING_GRACE_MS = 120\*1000/);
assert.match(busSource, /function retainFiredAlarm\(alarm,now\)/);
assert.match(busSource, /far && \(!gate \|\| !evidence\.journeyMatch\)/);
assert.match(busSource, /if\(!shown&&!nearby\) continue/);
assert.match(busSource, /function timetablePatternRecord\(journey\)/);
assert.match(busSource, /function journeyProgress\(v\)/);
assert.match(busSource, /routeLayer=L\.layerGroup/);
assert.match(busSource, /data-route-map/);
assert.match(busSource, /progress\.pattern\.shape/);
assert.match(busSource, /const APP_VERSION = '0\.6\.45'/);
assert.match(busSource, /function meaningfulTripTokens\(value\)/);
assert.match(busSource, /function tripRefMatchStrength\(a,b\)/);
assert.match(busSource, /function uniqueCompatibleTrips\(items,journey,getRef\)/);
assert.match(busSource, /possible GPS match ambiguous/);
assert.match(busSource, /function timetableDirection\(value\)/);
assert.match(busSource, /function scheduledJourneyDirection\(row\)/);
assert.match(busSource, /direction==='inbound'/);
assert.doesNotMatch(busSource, /direction==='0' \|\| direction\.startsWith\('in'\)/);
assert.match(busSource, /scheduledJourneyDirection\(est\.schedule\)/);
assert.match(busSource, /scheduledJourneyDirection\(r\)/);
assert.match(busSource, /diagnostics\.recovered\+\+/);
assert.match(busSource, /function scheduleLiveReason\(schedule\)/);
assert.match(busSource, /GPS recovered/);
assert.doesNotMatch(busSource, /operator GPS unavailable/);
assert.doesNotMatch(busSource, /GPS received · filtered/);
assert.match(busSource, /no fresh GPS found nearby/);
assert.match(busSource, /no fresh GPS for this route/);
assert.match(busSource, /destination match uncertain/);
assert.match(busSource, /possible GPS match was filtered/);
assert.match(busSource, /no unique journey match/);
assert.match(busSource, /function versionedDataUrl\(path,built\)/);
assert.match(busSource, /DATA_TILE_CACHE\.clear\(\); DATA_DEPARTURE_CACHE\.clear\(\); PATTERN_CACHE\.clear\(\);/);
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
assert.match(busSource, /#scrim\{touch-action:pan-x pan-y pinch-zoom/);
assert.doesNotMatch(busSource, /gesturestart/);
assert.doesNotMatch(busSource, /function stopUiPinch/);
assert.match(busSource, /vendor\/leaflet\/leaflet\.css/);
assert.match(busSource, /vendor\/leaflet\/leaflet\.js/);
assert.match(busSource, /unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js/);
assert.match(busSource, /Map unavailable/);
assert.doesNotMatch(busSource, /cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet/);
assert.match(busSource, /const TILE_ERROR_THRESHOLD=4/);
assert.match(busSource, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
assert.match(busSource, /function useTileProvider\(index,reason\)/);
assert.match(busSource, /currentTileProvider/);
assert.match(busSource, /function liveVehicleIdentity\(fields\)/);
assert.match(busSource, /function parseLivePayloads\(items,now\)/);
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
assert.match(busSource, /kerbside\.stops\.v6/);
assert.match(busSource, /lat\.toFixed\(4\)/);
assert.match(busSource, /complete:failed===0/);
assert.match(busSource, /function mergeDiscoveredStops\(primary,secondary,lat,lon\)/);
assert.match(busSource, /if\(official\.length&&officialResult\.complete\)/);
assert.match(busSource, /showDiscoveredStops\(official,lat,lon,false\)/);
assert.doesNotMatch(busSource, /kerbside\.stops\.v5/);
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
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
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
const browser = await webkit.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/London' });
const page = await context.newPage();

try {
  let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0, wideFeedRequests = 0, nearbyFeedRequests = 0, departureRequests = 0;
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

  await page.route('https://kerbside-bus.adambullas.workers.dev/health**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.45', bods: true })
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

  await page.goto(`http://127.0.0.1:${address.port}/bus.html`, { waitUntil: 'domcontentloaded' });
  assert.match(await page.title(), /Kerbside/i);
  assert.equal(await page.evaluate(() => window.L && window.L.version), '1.9.4');
  assert.equal(leafletCdnRequests, 0);
  assert.equal(await page.locator('#map.leaflet-container').count(), 1);
  await page.waitForFunction(() => window.__KERBSIDE_TEST__?.currentTileProvider?.() === 'OpenStreetMap');
  assert.ok(cartoTileRequests >= 4);
  assert.ok(osmTileRequests > 0);
  assert.equal(await page.locator('#setBtn').isVisible(), true);
  const viewportContent=await page.locator('meta[name="viewport"]').getAttribute('content');
  assert.match(viewportContent, /width=device-width/);
  assert.doesNotMatch(viewportContent, /user-scalable|maximum-scale/);
  const scrimTouchAction=await page.evaluate(() => getComputedStyle(document.getElementById('scrim')).touchAction);
  assert.match(scrimTouchAction, /pinch-zoom/);

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
  assert.deepEqual(liveParsing, {
    ids:['OP-A|journey|trip-a','OP-B|journey|trip-b'],count:2,newestLat:52.501,
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
  assert.deepEqual(multiVehicleBoard,{
    parsed:5,
    parsedIds:[1,2,3,4,5].map(index=>`OP-FIVE|journey|route-9-trip-${index}`),
    stored:5,shown:5,
    shownIds:[1,2,3,4,5].map(index=>`OP-FIVE|journey|route-9-trip-${index}`),
    lines:['9']
  });

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
  assert.deepEqual(wideFallback,{count:2,ids:['NEAR|journey|nearby-1-trip','WIDE|journey|wide-1-trip'],cooldown:true});
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
  assert.notEqual(stopDiscoveryPolicy.cacheA,stopDiscoveryPolicy.cacheB);
  assert.match(stopDiscoveryPolicy.cacheA,/kerbside\.stops\.v6/);
  assert.deepEqual({...stopDiscoveryPolicy,cacheA:undefined,cacheB:undefined},{
    cacheA:undefined,cacheB:undefined,sameCode:true,otherSideSame:false,
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

  await page.locator('#setBtn').click();
  await page.locator('#scrim.show').waitFor();
  assert.equal(await page.locator('#proxy').inputValue(), 'https://kerbside-bus.adambullas.workers.dev');
  assert.equal(await page.locator('#demoSw').getAttribute('aria-pressed'), 'false');
  await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.45'));

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

  console.log('Kerbside WebKit mobile regression checks passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
