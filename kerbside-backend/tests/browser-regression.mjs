import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..', '..');
const busSource = await readFile(path.join(root, 'bus.html'), 'utf8');
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
assert.match(busSource, /const APP_VERSION = '0\.6\.29'/);
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

const leafletStub = `
(() => {
  function passiveLayer(){ return { addTo(){ return this; }, clearLayers(){}, removeLayer(){} }; }
  function marker(latlng){
    let popup = null;
    return {
      addTo(){ return this; }, setLatLng(){ return this; }, setIcon(){ return this; },
      bindTooltip(){ return this; }, setTooltipContent(){ return this; },
      bindPopup(value){ popup = value; return this; }, getPopup(){ return popup; },
      setPopupContent(value){ popup = value; return this; }, on(){ return this; },
      openPopup(){ return this; }, setZIndexOffset(){ return this; }, getElement(){ return null; }
    };
  }
  window.L = {
    map(id){
      const element = document.getElementById(id);
      const attribution = document.createElement('div');
      attribution.className = 'leaflet-control-attribution';
      attribution.innerHTML = '<a href="https://leafletjs.com">Leaflet</a> | <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
      element.appendChild(attribution);
      return {
        attributionControl:{ getContainer:() => attribution },
        setView(){ return this; }, on(){ return this; }, removeLayer(){},
        invalidateSize(){ return this; }, panTo(){ return this; }, fitBounds(){ return this; }, getZoom(){ return 16; }
      };
    },
    tileLayer(){ return passiveLayer(); }, layerGroup(){ return passiveLayer(); },
    marker, circle(){ return passiveLayer(); }, polyline(){ return passiveLayer(); },
    circleMarker(){ return { ...passiveLayer(), bindTooltip(){ return this; } }; },
    divIcon(options){ return options; }
  };
})();`;

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const browser = await webkit.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
const page = await context.newPage();

try {
  await page.route('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: leafletStub }));
  await page.route('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.route('https://kerbside-data-zetabun.pages.dev/manifest.json**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ built: '2026-08-02T00:00:00.000Z', tileSize: 0.05, totals: { stops: 275965, departures: 50753499, patterns: 42204 }, regions: { west_midlands: { stops: 1, departures: 1 } } })
  }));
  await page.route('https://kerbside-bus.adambullas.workers.dev/health**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.29', bods: true })
  }));

  await page.goto(`http://127.0.0.1:${address.port}/bus.html`, { waitUntil: 'domcontentloaded' });
  assert.match(await page.title(), /Kerbside/i);
  assert.equal(await page.locator('#setBtn').isVisible(), true);

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

  await page.locator('#setBtn').click();
  await page.locator('#scrim.show').waitFor();
  assert.equal(await page.locator('#proxy').inputValue(), 'https://kerbside-bus.adambullas.workers.dev');
  assert.equal(await page.locator('#demoSw').getAttribute('aria-pressed'), 'false');
  await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.29'));

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
