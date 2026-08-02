from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.27';", "const APP_VERSION = '0.6.28';")
replace_once('kerbside-backend/package.json', '"version": "0.6.27"', '"version": "0.6.28"')
replace_once('kerbside-backend/src/worker.js', "version: '0.6.27',", "version: '0.6.28',")
replace_once('kerbside-backend/test/worker.test.js', "assert.equal(body.version, '0.6.27');", "assert.equal(body.version, '0.6.28');")

replace_once(
    'bus.html',
    "function dataUrl(path){ return DATA_BASE.replace(/\\/$/,'')+'/'+String(path||'').replace(/^\\//,''); }",
    """function versionedDataUrl(path,built){
  const clean=String(path||'').replace(/^\\//,'');
  const raw=DATA_BASE.replace(/\\/$/,'')+'/'+clean;
  if(!built||clean==='manifest.json') return raw;
  const u=new URL(raw); u.searchParams.set('v',String(built)); return u.toString();
}
function dataUrl(path){ return versionedDataUrl(path,DATA_MANIFEST&&DATA_MANIFEST.built); }
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),versionedDataUrl};
}"""
)
replace_once(
    'bus.html',
    """    const data=await r.json();
    if(!data||!data.regions||!Object.keys(data.regions).length) throw new Error('Pages timetable manifest is empty');
    DATA_MANIFEST=data; return data;
""",
    """    const data=await r.json();
    if(!data||!data.regions||!Object.keys(data.regions).length) throw new Error('Pages timetable manifest is empty');
    const previousBuild=DATA_MANIFEST&&String(DATA_MANIFEST.built||'');
    const nextBuild=String(data.built||'');
    if(previousBuild&&nextBuild&&previousBuild!==nextBuild){
      DATA_TILE_CACHE.clear(); DATA_DEPARTURE_CACHE.clear(); PATTERN_CACHE.clear();
    }
    DATA_MANIFEST=data; return data;
"""
)

replace_once(
    'bus.html',
    "Version 0.6.27 also makes timetable-only explanations evidence-based: the board now reports whether fresh GPS, route, destination or a unique journey match was missing without claiming the operator has no GPS service.",
    "Version 0.6.28 also versions timetable tiles, departure shards and route-pattern requests with the active national build timestamp, and clears open-tab caches when that build changes."
)

readme_marker = "Kerbside 0.6.27 makes schedule-only explanations evidence-based. The app now distinguishes no fresh GPS in the fetched area, no fresh GPS for the route, an uncertain destination, a filtered possible match, an ambiguous alias and no unique journey match. It no longer infers that an operator's GPS service is unavailable from an empty or filtered local snapshot.\n"
readme_addition = readme_marker + "\nKerbside 0.6.28 versions static timetable assets by the national manifest build timestamp. Tile, departure and route-pattern requests now receive a stable `v` query for the active build, while the manifest itself remains unversioned so it can update. When a forced manifest refresh detects a new build, the browser clears its in-memory tile, departure and pattern caches before using the new assets.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)
replace_once(
    'kerbside-backend/README.md',
    "6. Add the repository Actions variable `KERBSIDE_NATIONAL_ENABLED=true` to enable automatic daily timetable deployments and Worker deployments after future code changes.",
    "6. Add the repository Actions variable `KERBSIDE_NATIONAL_ENABLED=true` to enable automatic daily timetable deployments. Worker deployments run independently whenever Worker source, package or Wrangler configuration changes."
)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.27'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.28'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /no unique journey match/);",
    """assert.match(busSource, /no unique journey match/);
assert.match(busSource, /function versionedDataUrl\\(path,built\\)/);
assert.match(busSource, /DATA_TILE_CACHE\\.clear\\(\\); DATA_DEPARTURE_CACHE\\.clear\\(\\); PATTERN_CACHE\\.clear\\(\\);/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    """  assert.deepEqual(alertGrace, [true,false,false]);

  await page.locator('#setBtn').click();
""",
    """  assert.deepEqual(alertGrace, [true,false,false]);
  const dataUrls = await page.evaluate(() => {
    const build='2026-08-02T05:20:00.000Z';
    const make=window.__KERBSIDE_TEST__.versionedDataUrl;
    return {manifest:make('/manifest.json',build),pattern:make('/regions/test/patterns/aa.json',build),build};
  });
  assert.equal(new URL(dataUrls.manifest).searchParams.has('v'), false);
  assert.equal(new URL(dataUrls.pattern).searchParams.get('v'), dataUrls.build);

  await page.locator('#setBtn').click();
"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.27'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.28'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.27', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.28', bods: true })"
)

print('Prepared Kerbside 0.6.28 timetable build versioning.')
