from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def replace_once(relative, old, new):
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{relative}: expected one occurrence, found {count}: {old[:100]!r}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def regex_once(relative, pattern, replacement):
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{relative}: regex expected one occurrence, found {count}: {pattern!r}')
    path.write_text(updated, encoding='utf-8')


replace_once(
    'bus.html',
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css">',
    '<link id="leafletCss" rel="stylesheet" href="kerbside-backend/vendor/leaflet/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" onerror="this.onerror=null;this.href=\'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\'">'
)
replace_once(
    'bus.html',
    '#map{flex:1;background:#0A0F16;z-index:1}\n.leaflet-container{background:#0A0F16;font-family:\'Archivo\',sans-serif}',
    '#map{flex:1;background:#0A0F16;z-index:1}\n'
    '.map-library-error{height:100%;display:grid;place-content:center;gap:8px;padding:28px;text-align:center;color:var(--text-dim)}\n'
    '.map-library-error strong{font-family:\'Martian Mono\',monospace;font-size:15px;color:var(--led)}\n'
    '.map-library-error span{max-width:32rem;font-size:13px;line-height:1.55}\n'
    '.leaflet-container{background:#0A0F16;font-family:\'Archivo\',sans-serif}'
)
replace_once(
    'bus.html',
    'Version 0.6.32 also protects the live Worker with allowlisted browser origins, a conservative per-IP request guard, and coalesced identical cache refreshes so bursts do not multiply BODS traffic.',
    'Version 0.6.33 also loads Leaflet 1.9.4 from integrity-checked repository assets first, uses the official CDN only as an emergency fallback, and shows a clear map error if both copies fail.'
)
replace_once(
    'bus.html',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>\n<script>\n(function(){\n\'use strict\';',
    '<script src="kerbside-backend/vendor/leaflet/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>\n'
    '<script>\n'
    'if(!window.L){\n'
    '  document.write(\'<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""><\\/script>\');\n'
    '}\n'
    '</script>\n'
    '<script>\n'
    '(function(){\n'
    '\'use strict\';\n'
    'if(!window.L){\n'
    '  const mapNode=document.getElementById(\'map\');\n'
    '  if(mapNode) mapNode.innerHTML=\'<div class="map-library-error" role="alert"><strong>Map unavailable</strong><span>Kerbside could not load its local map library or the emergency CDN copy. Reload the page or check the connection.</span></div>\';\n'
    '  return;\n'
    '}'
)
replace_once('bus.html', "const APP_VERSION = '0.6.32';", "const APP_VERSION = '0.6.33';")

replace_once('kerbside-backend/package.json', '"version": "0.6.32"', '"version": "0.6.33"')
replace_once('kerbside-backend/src/worker.js', "version: '0.6.32'", "version: '0.6.33'")
replace_once('kerbside-backend/test/worker.test.js', "assert.equal(body.version, '0.6.32');", "assert.equal(body.version, '0.6.33');")
replace_once(
    'kerbside-backend/README.md',
    'Kerbside 0.6.32 adds best-effort live Worker abuse safeguards without requiring an additional paid Cloudflare binding. Browser requests with an Origin outside the configured allowlist are rejected before cache or BODS work, Cloudflare client IPs receive a conservative per-isolate request budget, and simultaneous identical cache refreshes share one upstream promise. Rate metadata is exposed in response headers, while normal Kerbside polling remains well below the default 60 requests per minute.\n\nThe Worker remains backwards-compatible for live data:',
    'Kerbside 0.6.32 adds best-effort live Worker abuse safeguards without requiring an additional paid Cloudflare binding. Browser requests with an Origin outside the configured allowlist are rejected before cache or BODS work, Cloudflare client IPs receive a conservative per-isolate request budget, and simultaneous identical cache refreshes share one upstream promise. Rate metadata is exposed in response headers, while normal Kerbside polling remains well below the default 60 requests per minute.\n\n'
    'Kerbside 0.6.33 self-hosts the complete pinned Leaflet 1.9.4 distribution. The release workflow generates JavaScript, CSS, licence and image assets from the npm package only after its JavaScript and CSS match Leaflet\'s official SHA-256 values. The browser loads those local files first, retains the official unpkg build as an emergency fallback, and presents a readable map-unavailable message if neither copy can load. WebKit regression now blocks the CDN and verifies the real local Leaflet runtime.\n\n'
    'The Worker remains backwards-compatible for live data:'
)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "import assert from 'node:assert/strict';",
    "import { createHash } from 'node:crypto';\nimport assert from 'node:assert/strict';"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "const busSource = await readFile(path.join(root, 'bus.html'), 'utf8');",
    "const busSource = await readFile(path.join(root, 'bus.html'), 'utf8');\n"
    "const leafletRoot = path.join(root, 'kerbside-backend', 'vendor', 'leaflet');\n"
    "const leafletJs = await readFile(path.join(leafletRoot, 'leaflet.js'));\n"
    "const leafletCss = await readFile(path.join(leafletRoot, 'leaflet.css'));\n"
    "const leafletLicense = await readFile(path.join(leafletRoot, 'LICENSE'), 'utf8');\n"
    "assert.equal(createHash('sha256').update(leafletJs).digest('base64'), '20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=');\n"
    "assert.equal(createHash('sha256').update(leafletCss).digest('base64'), 'p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=');\n"
    "assert.match(leafletLicense, /Redistribution and use in source and binary forms/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.32'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.33'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.doesNotMatch(busSource, /function stopUiPinch/);\nconst mime = new Map([",
    "assert.doesNotMatch(busSource, /function stopUiPinch/);\n"
    "assert.match(busSource, /vendor\\/leaflet\\/leaflet\\.css/);\n"
    "assert.match(busSource, /vendor\\/leaflet\\/leaflet\\.js/);\n"
    "assert.match(busSource, /unpkg\\.com\\/leaflet@1\\.9\\.4\\/dist\\/leaflet\\.js/);\n"
    "assert.match(busSource, /Map unavailable/);\n"
    "assert.doesNotMatch(busSource, /cdnjs\\.cloudflare\\.com\\/ajax\\/libs\\/leaflet/);\n"
    "const mime = new Map(["
)
regex_once(
    'kerbside-backend/tests/browser-regression.mjs',
    r"\nconst leafletStub = `.*?`;\n\nawait new Promise",
    "\nawait new Promise"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "  await page.route('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: leafletStub }));\n"
    "  await page.route('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));",
    "  let leafletCdnRequests = 0;\n"
    "  await page.route('https://unpkg.com/leaflet@1.9.4/dist/**', route => { leafletCdnRequests++; return route.abort(); });\n"
    "  await page.route('https://*.basemaps.cartocdn.com/**', route => route.abort());"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.32', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.33', bods: true })"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "  assert.match(await page.title(), /Kerbside/i);\n  assert.equal(await page.locator('#setBtn').isVisible(), true);",
    "  assert.match(await page.title(), /Kerbside/i);\n"
    "  assert.equal(await page.evaluate(() => window.L && window.L.version), '1.9.4');\n"
    "  assert.equal(leafletCdnRequests, 0);\n"
    "  assert.equal(await page.locator('#map.leaflet-container').count(), 1);\n"
    "  assert.equal(await page.locator('#setBtn').isVisible(), true);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "document.getElementById('sourceStatus')?.textContent.includes('app 0.6.32')",
    "document.getElementById('sourceStatus')?.textContent.includes('app 0.6.33')"
)

print('Prepared Kerbside 0.6.33 local Leaflet release')
