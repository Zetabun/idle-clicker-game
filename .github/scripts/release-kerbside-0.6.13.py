from pathlib import Path
import json
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_regex_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match, found {count}")
    return updated


bus_path = Path("bus.html")
bus = bus_path.read_text(encoding="utf-8")

bus = replace_once(
    bus,
    "const APP_VERSION = '0.6.12';",
    "const APP_VERSION = '0.6.13';",
    "app version",
)

bus = replace_once(
    bus,
    "const MY_PROXY = '';",
    "const MY_PROXY = 'https://kerbside-bus.adambullas.workers.dev';",
    "public Worker default",
)

bus = replace_once(
    bus,
    ".chip.gps-delayed{border-color:var(--led-dim);background:rgba(255,176,0,.06);color:var(--led)}\n.chip.schedule-source",
    ".chip.gps-delayed{border-color:var(--led-dim);background:rgba(255,176,0,.06);color:var(--led)}\n.chip.gps-age{text-transform:none;letter-spacing:0;color:var(--text-dim)}\n.live-diagnostics{margin-top:9px;padding:9px;border:1px solid var(--rule);border-radius:7px;background:rgba(11,17,25,.58)}\n.live-diagnostics .diag-title{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);margin-bottom:7px}\n.live-diagnostics .diag-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}\n.live-diagnostics .diag-grid span{min-width:0;padding:6px;border:1px solid rgba(34,48,63,.8);border-radius:5px;background:rgba(17,26,38,.72)}\n.live-diagnostics b{display:block;font-family:'Martian Mono',monospace;font-size:12px;color:var(--text)}\n.live-diagnostics small{display:block;margin-top:2px;font-size:8.5px;line-height:1.2;color:var(--text-dim);text-transform:uppercase;letter-spacing:.04em}\n.live-diagnostics .diag-note{margin-top:7px;font-size:9.5px;color:var(--text-dim);line-height:1.4}\n@media (max-width:520px){.live-diagnostics .diag-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}\n.chip.schedule-source",
    "diagnostics and GPS age styling",
)

confidence_line = "          <div class=\"confidence-guide\"><b>LIVE GPS</b> means a real bus has reported a position within the last two minutes. <b>GPS DELAYED</b> means the last confirmed report is two to four minutes old; Kerbside keeps it briefly instead of making the bus flicker out, but marks its ETA as estimated. Later timetable departures remain <b>scheduled</b> until a matching vehicle begins service. <b>Likely</b> means route and direction evidence strongly suggest the live bus will serve the stop, while <b>Verified</b> has stronger journey/stop evidence and <b>rough</b> has limited evidence.</div>"
bus = replace_once(
    bus,
    confidence_line,
    confidence_line + "\n          <div class=\"live-diagnostics\" id=\"liveDiagnostics\">Live matching diagnostics will appear after a stop and live feed are loaded.</div>",
    "live diagnostics panel",
)

bus = replace_once(
    bus,
    "  feedStale:0, feedUnknownAge:0, workerOk:null, workerVersion:'', workerBods:false,",
    "  feedStale:0, feedUnknownAge:0, workerOk:null, workerVersion:'', workerBods:false, liveDiag:null,",
    "diagnostics state",
)

bus = replace_once(
    bus,
    "function formatClock(ts){ return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }",
    "function formatClock(ts){ return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }\nfunction formatPositionAge(ms){\n  const seconds=Math.max(0,Math.round(Number(ms||0)/1000));\n  if(seconds<5) return 'now';\n  if(seconds<60) return seconds+'s ago';\n  return Math.max(1,Math.round(seconds/60))+'m ago';\n}",
    "GPS age formatter",
)

new_matching = r'''function newLiveDiagnostics(gate){
  return {gate:!!gate,received:S.vehicles.size,recent:0,nearby:0,route:0,direction:0,approaching:0,confidence:0,shown:0};
}
function relevant(){
  if(!S.stop){ S.liveDiag=null; return []; }
  S.filterFellBack=false;
  const gated=servingReady();
  let diagnostics=newLiveDiagnostics(gated);
  let out=collect(gated,diagnostics);
  // A matched timetable stop is authoritative. Never replace an empty,
  // verified board with nearby buses that may belong to an adjacent stop.
  if(!out.length && gated && !S.ttStop){
    diagnostics=newLiveDiagnostics(false);
    out=collect(false,diagnostics);
    S.filterFellBack=out.length>0;
  }
  diagnostics.shown=out.length;
  S.liveDiag=diagnostics;
  return out;
}
function collect(gate,diagnostics){
  const out=[], now=Date.now();
  for(const v of S.vehicles.values()){
    const age=now-v.ts;
    if(age>MAX_AGE_MS) continue;
    if(diagnostics) diagnostics.recent++;
    const d=dist(v.lat,v.lon,S.stop.lat,S.stop.lon);
    if(d>(gate?MAX_VEH_DIST:1300)) continue;
    if(diagnostics) diagnostics.nearby++;
    const evidence=routeEvidence(v.line,v.dest,v.journey);
    const geometry=journeyGeometry(v,S.stop);
    if(geometry && geometry.passed) continue;
    const strength=geometry && geometry.remaining>80 ? 2 : approachStrength(v,S.stop);
    if(gate && evidence.score<2) continue;
    if(!gate && !(d<260 || (d<1300 && strength>=1))) continue;
    if(diagnostics) diagnostics.route++;
    const dir=inferDirection(v);
    if(S.destFilter){
      if(destinationSimilarity(v.dest,S.destFilter)<.75) continue;
    }else if(S.dir!=='all' && dir!==S.dir && dir!=='unknown') continue;
    if(diagnostics) diagnostics.direction++;
    if(S.hideAway && strength<0 && d>100) continue;
    if(diagnostics) diagnostics.approaching++;
    const est=estimate(v,S.stop);
    if(!gate && est.confidence==='low') continue;
    if(gate && est.confidence==='low' && d>500) continue;
    if(diagnostics) diagnostics.confidence++;
    out.push({v,dir,app:strength>=0,strength,secs:est.secs,metres:est.metres,routeMetres:est.routeMetres,geometry:est.geometry,confidence:est.confidence,spread:est.spread,evidence:est.evidence,schedule:est.schedule});
  }
  out.sort((a,b)=>a.secs-b.secs);
  const limited=out.slice(0,25);
  if(diagnostics) diagnostics.shown=limited.length;
  return limited;
}

function renderLiveDiagnostics(){
  const el=$('liveDiagnostics');
  if(!el) return;
  if(!S.origin || !S.stop){
    el.textContent='Choose a location and stop to see why live buses are included or filtered out.';
    return;
  }
  const d=S.liveDiag;
  if(!d){ el.textContent='Waiting for the first live matching pass.'; return; }
  const stages=[
    ['received',d.received],['recent',d.recent],['near stop',d.nearby],
    ['route evidence',d.route],['direction',d.direction],['approaching',d.approaching],
    ['confidence',d.confidence],['shown',d.shown]
  ];
  el.innerHTML='<div class="diag-title">Live matching for this stop</div><div class="diag-grid">'
    +stages.map(([label,value])=>'<span><b>'+value+'</b><small>'+esc(label)+'</small></span>').join('')
    +'</div><div class="diag-note">Counts narrow from all tracked vehicles to the buses shown for the current stop, destination and direction. Scheduled rows are not included. '
    +(d.gate?'Official timetable stop rules are active.':'Nearby fallback rules are active.')+'</div>';
}

function renderDests'''

bus = replace_regex_once(
    bus,
    r"function relevant\(\)\{.*?\n\}\n\nfunction renderDests",
    new_matching,
    "live matching diagnostics",
)

bus = replace_once(
    bus,
    "      const age=Date.now()-r.v.ts, gpsFresh=age<=GPS_FRESH_MS;",
    "      const age=Date.now()-r.v.ts, gpsFresh=age<=GPS_FRESH_MS, gpsAge=formatPositionAge(age);",
    "collapsed GPS age value",
)

old_gps_badge = "        +'<span class=\"chip '+(gpsFresh?'live-gps':'gps-delayed')+'\" title=\"'+esc(gpsHelp)+'\">'+gpsLabel+'</span>'"
bus = replace_once(
    bus,
    old_gps_badge,
    old_gps_badge + "\n        +'<span class=\"chip gps-age\">'+esc(gpsAge)+'</span>'",
    "collapsed GPS age badge",
)

bus = replace_once(
    bus,
    "  renderVehicles(liveRows); renderServingNote();",
    "  renderVehicles(liveRows); renderServingNote(); renderLiveDiagnostics();",
    "diagnostics render hook",
)

bus_path.write_text(bus, encoding="utf-8")

package_path = Path("kerbside-backend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
package["version"] = "0.6.13"
package.setdefault("scripts", {})["check"] = "node --check src/worker.js && node --check scripts/build-region.js && node --check tests/browser-regression.mjs"
package["scripts"]["test:browser"] = "node tests/browser-regression.mjs"
package.setdefault("devDependencies", {})["playwright"] = "1.62.0"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

browser_test = r'''import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..', '..');
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
        invalidateSize(){ return this; }, panTo(){ return this; }
      };
    },
    tileLayer(){ return passiveLayer(); }, layerGroup(){ return passiveLayer(); },
    marker, circle(){ return passiveLayer(); }, divIcon(options){ return options; }
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
  await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.13'));

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
'''

test_path = Path("kerbside-backend/tests/browser-regression.mjs")
test_path.parent.mkdir(parents=True, exist_ok=True)
test_path.write_text(browser_test, encoding="utf-8")

readme_path = Path("kerbside-backend/README.md")
readme = readme_path.read_text(encoding="utf-8")
release_note = "Kerbside 0.6.12 removes the misleading visible town-centre direction marker, labels the green point as the user's search location, and prevents accidental taps on map attribution links on touch devices while preserving clickable source links in Settings. Returning from an external page now repairs the iOS layout and refetches without clearing the existing board. Fresh GPS reports retain the `LIVE GPS` badge; reports between two and four minutes old remain briefly visible as `GPS DELAYED` rather than disappearing between irregular operator updates."
readme = replace_once(
    readme,
    release_note,
    release_note + "\n\nKerbside 0.6.13 makes the public Worker the default so new visitors start with real BODS data and Simulator becomes opt-in. The information panel now shows staged live-matching diagnostics, each live row displays its GPS position age, and WebKit mobile regression checks cover Settings, tabs, public-source defaults and viewport containment. The retired West Midlands-only timetable workflow is removed in favour of the national Pages build.",
    "README release note",
)
readme_path.write_text(readme, encoding="utf-8")
