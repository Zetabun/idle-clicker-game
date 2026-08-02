from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(relative, old, new):
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{relative}: expected one occurrence, found {count}: {old[:120]!r}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'bus.html',
    'Version 0.6.33 also loads Leaflet 1.9.4 from integrity-checked repository assets first, uses the official CDN only as an emergency fallback, and shows a clear map error if both copies fail.',
    'Version 0.6.34 also recovers from repeated CARTO basemap tile failures by switching once to the standard OpenStreetMap tile endpoint with visible attribution; the live board continues to work throughout.'
)
replace_once('bus.html', "const APP_VERSION = '0.6.33';", "const APP_VERSION = '0.6.34';")
replace_once(
    'bus.html',
    "const map = L.map('map',{zoomControl:true, attributionControl:true}).setView([52.509,-2.087],16);\n"
    "L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{\n"
    "  attribution:'&copy; OpenStreetMap contributors &copy; CARTO &middot; vehicles via BODS',\n"
    "  subdomains:'abcd', maxZoom:19\n"
    "}).addTo(map);",
    "const map = L.map('map',{zoomControl:true, attributionControl:true}).setView([52.509,-2.087],16);\n"
    "const TILE_ERROR_THRESHOLD=4;\n"
    "const TILE_PROVIDERS=[\n"
    "  {\n"
    "    name:'CARTO',\n"
    "    url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',\n"
    "    options:{\n"
    "      attribution:'&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a> &middot; vehicles via BODS',\n"
    "      subdomains:'abcd',maxZoom:19\n"
    "    }\n"
    "  },\n"
    "  {\n"
    "    name:'OpenStreetMap',\n"
    "    url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',\n"
    "    options:{\n"
    "      attribution:'&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &middot; vehicles via BODS',\n"
    "      maxZoom:19\n"
    "    }\n"
    "  }\n"
    "];\n"
    "let baseLayer=null,tileProviderIndex=-1,tileErrorCount=0;\n"
    "function currentTileProvider(){return TILE_PROVIDERS[tileProviderIndex]&&TILE_PROVIDERS[tileProviderIndex].name||'';}\n"
    "function useTileProvider(index,reason){\n"
    "  const provider=TILE_PROVIDERS[index];\n"
    "  if(!provider||index===tileProviderIndex) return;\n"
    "  if(baseLayer) map.removeLayer(baseLayer);\n"
    "  tileProviderIndex=index;tileErrorCount=0;\n"
    "  baseLayer=L.tileLayer(provider.url,provider.options);\n"
    "  baseLayer.on('tileload',()=>{if(tileProviderIndex===index) tileErrorCount=Math.max(0,tileErrorCount-1);});\n"
    "  baseLayer.on('tileerror',()=>{\n"
    "    if(tileProviderIndex!==index) return;\n"
    "    tileErrorCount++;\n"
    "    if(tileErrorCount>=TILE_ERROR_THRESHOLD&&index+1<TILE_PROVIDERS.length){\n"
    "      useTileProvider(index+1,'Primary map tiles unavailable');\n"
    "    }\n"
    "  });\n"
    "  baseLayer.addTo(map);\n"
    "  if(reason) toast(reason+' — using '+provider.name+'.');\n"
    "}\n"
    "if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){\n"
    "  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),currentTileProvider};\n"
    "}\n"
    "useTileProvider(0);"
)

replace_once('kerbside-backend/package.json', '"version": "0.6.33"', '"version": "0.6.34"')
replace_once('kerbside-backend/src/worker.js', "version: '0.6.33'", "version: '0.6.34'")
replace_once('kerbside-backend/test/worker.test.js', "assert.equal(body.version, '0.6.33');", "assert.equal(body.version, '0.6.34');")
replace_once(
    'kerbside-backend/README.md',
    'Kerbside 0.6.33 self-hosts the complete pinned Leaflet 1.9.4 distribution. The release workflow generates JavaScript, CSS, licence and image assets from the npm package only after its JavaScript and CSS match Leaflet\'s official SHA-256 values. The browser loads those local files first, retains the official unpkg build as an emergency fallback, and presents a readable map-unavailable message if neither copy can load. WebKit regression now blocks the CDN and verifies the real local Leaflet runtime.\n\nThe Worker remains backwards-compatible for live data:',
    'Kerbside 0.6.33 self-hosts the complete pinned Leaflet 1.9.4 distribution. The release workflow generates JavaScript, CSS, licence and image assets from the npm package only after its JavaScript and CSS match Leaflet\'s official SHA-256 values. The browser loads those local files first, retains the official unpkg build as an emergency fallback, and presents a readable map-unavailable message if neither copy can load. WebKit regression now blocks the CDN and verifies the real local Leaflet runtime.\n\n'
    'Kerbside 0.6.34 adds an automatic interactive basemap fallback. CARTO remains the primary dark map. Four accumulated tile errors switch the current map once to `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; successful tile loads reduce the error count so isolated failures do not trigger a switch. The fallback uses normal browser caching and Referer behaviour, requests only the visible Leaflet viewport, and retains visible OpenStreetMap attribution. WebKit now forces CARTO failures and verifies successful OpenStreetMap recovery.\n\n'
    'The Worker remains backwards-compatible for live data:'
)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.33'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.34'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.doesNotMatch(busSource, /cdnjs\\.cloudflare\\.com\\/ajax\\/libs\\/leaflet/);\nconst mime = new Map([",
    "assert.doesNotMatch(busSource, /cdnjs\\.cloudflare\\.com\\/ajax\\/libs\\/leaflet/);\n"
    "assert.match(busSource, /const TILE_ERROR_THRESHOLD=4/);\n"
    "assert.match(busSource, /https:\\/\\/tile\\.openstreetmap\\.org\\/\\{z\\}\\/\\{x\\}\\/\\{y\\}\\.png/);\n"
    "assert.match(busSource, /function useTileProvider\\(index,reason\\)/);\n"
    "assert.match(busSource, /currentTileProvider/);\n"
    "const mime = new Map(["
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "  let leafletCdnRequests = 0;\n"
    "  await page.route('https://unpkg.com/leaflet@1.9.4/dist/**', route => { leafletCdnRequests++; return route.abort(); });\n"
    "  await page.route('https://*.basemaps.cartocdn.com/**', route => route.abort());",
    "  let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0;\n"
    "  const transparentTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');\n"
    "  await page.route('https://unpkg.com/leaflet@1.9.4/dist/**', route => { leafletCdnRequests++; return route.abort(); });\n"
    "  await page.route('https://*.basemaps.cartocdn.com/**', route => { cartoTileRequests++; return route.abort(); });\n"
    "  await page.route('https://tile.openstreetmap.org/**', route => { osmTileRequests++; return route.fulfill({ status: 200, contentType: 'image/png', body: transparentTile }); });"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.33', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.34', bods: true })"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "  assert.equal(await page.evaluate(() => window.L && window.L.version), '1.9.4');\n"
    "  assert.equal(leafletCdnRequests, 0);\n"
    "  assert.equal(await page.locator('#map.leaflet-container').count(), 1);",
    "  assert.equal(await page.evaluate(() => window.L && window.L.version), '1.9.4');\n"
    "  assert.equal(leafletCdnRequests, 0);\n"
    "  assert.equal(await page.locator('#map.leaflet-container').count(), 1);\n"
    "  await page.waitForFunction(() => window.__KERBSIDE_TEST__?.currentTileProvider?.() === 'OpenStreetMap');\n"
    "  assert.ok(cartoTileRequests >= 4);\n"
    "  assert.ok(osmTileRequests > 0);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "document.getElementById('sourceStatus')?.textContent.includes('app 0.6.33')",
    "document.getElementById('sourceStatus')?.textContent.includes('app 0.6.34')"
)

print('Prepared Kerbside 0.6.34 basemap fallback release')
