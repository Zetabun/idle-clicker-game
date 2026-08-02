from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.23';", "const APP_VERSION = '0.6.24';")
replace_once('kerbside-backend/package.json', '"version": "0.6.23"', '"version": "0.6.24"')
replace_once("kerbside-backend/src/worker.js", "version: '0.6.23',", "version: '0.6.24',")
replace_once("kerbside-backend/test/worker.test.js", "assert.equal(body.version, '0.6.23');", "assert.equal(body.version, '0.6.24');")

replace_once(
    'bus.html',
    """const LINE_KEY = 'kerbside.lines.v1';
let LINES = {};   // line -> {f: detour factor, n: samples, sp: m/s, sn: samples}

function loadLines(){
  if(!store.ok || !S.remember) return;
  try{ LINES = JSON.parse(localStorage.getItem(LINE_KEY)||'{}') || {}; }catch(e){ LINES={}; }
}
""",
    """const LINE_KEY = 'kerbside.lines.v2';
const LEGACY_LINE_KEY = 'kerbside.lines.v1';
let LINES = {};   // operator/route/line key -> {f,n,sp,sn}

function lineLearningKey(value){
  const v=value&&typeof value==='object'?value:{line:value};
  const operator=String(v.operator||'').trim().toLowerCase();
  const route=String(v.lineRef||v.routeRef||v.line||'').trim().toLowerCase();
  const line=cleanLine(v.line||route||'?').toLowerCase();
  return [operator||'unknown-operator',route||line,line].join('|');
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),lineLearningKey};
}
function loadLines(){
  if(!store.ok || !S.remember) return;
  try{
    LINES = JSON.parse(localStorage.getItem(LINE_KEY)||'{}') || {};
    localStorage.removeItem(LEGACY_LINE_KEY);
  }catch(e){ LINES={}; }
}
"""
)
replace_once(
    'bus.html',
    "  const rec = LINES[v.line] || (LINES[v.line]={f:ROAD_FACTOR,n:0,sp:DEFAULT_SPEED,sn:0});",
    "  const key=lineLearningKey(v);\n  const rec = LINES[key] || (LINES[key]={f:ROAD_FACTOR,n:0,sp:DEFAULT_SPEED,sn:0});"
)
replace_once(
    'bus.html',
    """function lineFactor(line){
  const r = LINES[line];
  return (r && r.n >= 3) ? r.f : ROAD_FACTOR;
}
function lineSpeed(line){
  const r = LINES[line];
  return (r && r.sn >= 3) ? r.sp : DEFAULT_SPEED;
}
""",
    """function lineFactor(v){
  const r = LINES[lineLearningKey(v)];
  return (r && r.n >= 3) ? r.f : ROAD_FACTOR;
}
function lineSpeed(v){
  const r = LINES[lineLearningKey(v)];
  return (r && r.sn >= 3) ? r.sp : DEFAULT_SPEED;
}
"""
)
replace_once(
    'bus.html',
    ": straight * lineFactor(v.line);",
    ": straight * lineFactor(v);"
)
replace_once(
    'bus.html',
    "if(!isFinite(sp) || sp < MIN_SPEED || sp > MAX_SPEED) sp = lineSpeed(v.line);",
    "if(!isFinite(sp) || sp < MIN_SPEED || sp > MAX_SPEED) sp = lineSpeed(v);"
)
replace_once(
    'bus.html',
    "return {secs:spatial, metres:straight, routeMetres:geometry&&geometry.remaining>0?geometry.remaining:null, geometry, learned:!!(LINES[v.line]&&LINES[v.line].n>=3), confidence, spread, evidence, schedule};",
    "const learned=LINES[lineLearningKey(v)];\n  return {secs:spatial, metres:straight, routeMetres:geometry&&geometry.remaining>0?geometry.remaining:null, geometry, learned:!!(learned&&learned.n>=3), confidence, spread, evidence, schedule};"
)
replace_once(
    'bus.html',
    "  const v=r.v, rec=LINES[v.line];",
    "  const v=r.v;"
)

replace_once(
    'bus.html',
    "Version 0.6.23 also cancels obsolete address lookups and restricts Photon suggestions to Great Britain, preventing a slower earlier query or unsupported overseas result from replacing the user's latest search.",
    "Version 0.6.24 also isolates locally learned speed and route-detour data by operator, route reference and displayed line, so unrelated services sharing a number cannot influence one another's ETA fallback."
)

readme_marker = "Kerbside 0.6.23 makes address lookup race-safe and country-scoped. Each Photon request cancels the preceding request, stale responses are ignored by a sequence guard, and clicking away, pressing Escape or reducing the query below three characters also cancels pending work. Forward searches now include both `countrycode=GB` and the Great Britain bounding box, matching the app's timetable and BODS coverage.\n"
readme_addition = readme_marker + "\nKerbside 0.6.24 isolates local ETA learning by service identity. Learned detour factors and speeds now use a composite operator, route-reference and displayed-line key instead of the line number alone. The unsafe version-1 cache is discarded rather than migrated, preventing a route `9` in one city or operator from affecting another route `9` elsewhere.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.23'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.24'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /if\\(run!==geocodeRun\\) return/);",
    """assert.match(busSource, /if\\(run!==geocodeRun\\) return/);
assert.match(busSource, /const LINE_KEY = 'kerbside\\.lines\\.v2'/);
assert.match(busSource, /function lineLearningKey\\(value\\)/);
assert.doesNotMatch(busSource, /LINES\\[v\\.line\\]/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    """  assert.deepEqual(tripMatching, {
    exact:4, compact:3,
    uniqueRef:'trip-AB12345678', uniqueStrength:2, uniqueCount:1,
    ambiguous:true, ambiguousCount:0
  });

  await page.locator('#setBtn').click();
""",
    """  assert.deepEqual(tripMatching, {
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

  await page.locator('#setBtn').click();
"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.23'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.24'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.23', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.24', bods: true })"
)

print('Prepared Kerbside 0.6.24 service-isolated local ETA learning.')
