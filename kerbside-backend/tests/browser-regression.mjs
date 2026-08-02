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
assert.match(busSource, /far && \(!gate \|\| !evidence\.journeyMatch\)/);
assert.match(busSource, /if\(!shown&&!nearby\) continue/);
assert.match(busSource, /function timetablePatternRecord\(journey\)/);
assert.match(busSource, /function journeyProgress\(v\)/);
assert.match(busSource, /routeLayer=L\.layerGroup/);
assert.match(busSource, /data-route-map/);
assert.match(busSource, /progress\.pattern\.shape/);
assert.match(busSource, /const APP_VERSION = '0\.6\.17'/);
assert.match(busSource, /function meaningfulTripTokens\(value\)/);
assert.match(busSource, /function timetableDirection\(value\)/);
assert.match(busSource, /function scheduledJourneyDirection\(row\)/);
assert.match(busSource, /direction==='inbound'/);
assert.doesNotMatch(busSource, /direction==='0' \|\| direction\.startsWith\('in'\)/);
assert.match(busSource, /scheduledJourneyDirection\(est\.schedule\)/);
assert.match(busSource, /scheduledJourneyDirection\(r\)/);
assert.match(busSource, /diagnostics\.recovered\+\+/);
assert.match(busSource, /function scheduleLiveReason\(schedule\)/);
assert.match(busSource, /GPS recovered/);
assert.match(busSource, /operator GPS unavailable/);
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
    body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.0', bods: true })
  }));

  await page.goto(`http://127.0.0.1:${address.port}/bus.html`, { waitUntil: 'domcontentloaded' });
  assert.match(await page.title(), /Kerbside/i);
  assert.equal(await page.locator('#setBtn').isVisible(), true);

  await page.locator('#setBtn').click();
  await page.locator('#scrim.show').waitFor();
  assert.equal(await page.locator('#proxy').inputValue(), 'https://kerbside-bus.adambullas.workers.dev');
  assert.equal(await page.locator('#demoSw').getAttribute('aria-pressed'), 'false');
  await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.17'));

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
