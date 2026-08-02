from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


bus_path = 'bus.html'
bus = read(bus_path)
bus = replace_once(bus, "const APP_VERSION = '0.6.42';", "const APP_VERSION = '0.6.43';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.42 also treats ordinary OpenStreetMap stop refs as local labels rather than global identities, preventing unrelated stops that both use labels such as A from being merged.",
    "Version 0.6.43 also validates the complete national timetable manifest and keeps a recent last-known-good copy, so malformed or incomplete data deployments cannot replace working timetable coverage.",
    'coverage release note'
)
bus = replace_once(
    bus,
    """const DATA_BASE = 'https://kerbside-data-zetabun.pages.dev';
const DATA_TILE_CACHE = new Map();
const DATA_DEPARTURE_CACHE = new Map();
let DATA_MANIFEST = null;
let DATA_MANIFEST_PROMISE = null;
""",
    """const DATA_BASE = 'https://kerbside-data-zetabun.pages.dev';
const DATA_TILE_CACHE = new Map();
const DATA_DEPARTURE_CACHE = new Map();
const DATA_MANIFEST_STORAGE = 'kerbside.data.manifest.v1';
const DATA_MANIFEST_MAX_AGE = 14*24*3600*1000;
const REQUIRED_DATA_REGIONS = ['east_anglia','east_midlands','london','north_east','north_west','south_east','south_west','west_midlands','yorkshire'];
let DATA_MANIFEST = null;
let DATA_MANIFEST_PROMISE = null;
let DATA_MANIFEST_SOURCE = '';
""",
    'manifest state constants'
)
old_manifest = """async function loadDataManifest(force){
  if(DATA_MANIFEST&&!force) return DATA_MANIFEST;
  if(DATA_MANIFEST_PROMISE&&!force) return DATA_MANIFEST_PROMISE;
  DATA_MANIFEST_PROMISE=(async()=>{
    const r=await fetchTimed(dataUrl('/manifest.json'),{headers:{Accept:'application/json'},cache:force?'reload':'force-cache'},10000);
    if(!r.ok) throw new Error('Pages timetable HTTP '+r.status);
    const data=await r.json();
    if(!data||!data.regions||!Object.keys(data.regions).length) throw new Error('Pages timetable manifest is empty');
    const previousBuild=DATA_MANIFEST&&String(DATA_MANIFEST.built||'');
    const nextBuild=String(data.built||'');
    if(previousBuild&&nextBuild&&previousBuild!==nextBuild){
      DATA_TILE_CACHE.clear(); DATA_DEPARTURE_CACHE.clear(); PATTERN_CACHE.clear();
    }
    DATA_MANIFEST=data; return data;
  })();
  try{return await DATA_MANIFEST_PROMISE;}finally{DATA_MANIFEST_PROMISE=null;}
}
"""
new_manifest = """function validDataManifest(data){
  if(!data||Number(data.version)<3||data.scope!=='england-regional-pages') return false;
  if(!Number.isFinite(Date.parse(String(data.built||'')))) return false;
  const tileSize=Number(data.tileSize); if(!(tileSize>.001&&tileSize<=.25)) return false;
  const regions=data.regions, totals=data.totals;
  if(!regions||typeof regions!=='object'||!totals||typeof totals!=='object') return false;
  const sums={stops:0,departures:0,patterns:0,tiles:0};
  for(const name of REQUIRED_DATA_REGIONS){
    const region=regions[name]; if(!region||typeof region!=='object') return false;
    if(!Number.isFinite(Date.parse(String(region.built||'')))) return false;
    const bounds=region.bounds;
    if(!Array.isArray(bounds)||bounds.length!==4||bounds.some(value=>!Number.isFinite(Number(value)))) return false;
    if(Number(bounds[0])>=Number(bounds[2])||Number(bounds[1])>=Number(bounds[3])) return false;
    for(const key of ['stops','departures','patterns','tiles','departureShards']){
      if(!Number.isFinite(Number(region[key]))||Number(region[key])<=0) return false;
    }
    for(const key of Object.keys(sums)) sums[key]+=Number(region[key]);
  }
  if(Object.keys(regions).length!==REQUIRED_DATA_REGIONS.length) return false;
  return Object.entries(sums).every(([key,total])=>Number(totals[key])===total&&total>0);
}
function readStoredDataManifest(now=Date.now()){
  try{
    const record=JSON.parse(localStorage.getItem(DATA_MANIFEST_STORAGE)||'null');
    if(!record||!Number.isFinite(Number(record.ts))||now-Number(record.ts)>DATA_MANIFEST_MAX_AGE) return null;
    return validDataManifest(record.data)?record.data:null;
  }catch(e){ return null; }
}
function writeStoredDataManifest(data){
  if(!validDataManifest(data)) return;
  try{ localStorage.setItem(DATA_MANIFEST_STORAGE,JSON.stringify({ts:Date.now(),data})); }catch(e){}
}
function resetDataManifestForTest(clearStored){
  DATA_MANIFEST=null; DATA_MANIFEST_PROMISE=null; DATA_MANIFEST_SOURCE='';
  DATA_TILE_CACHE.clear(); DATA_DEPARTURE_CACHE.clear(); PATTERN_CACHE.clear();
  if(clearStored){ try{localStorage.removeItem(DATA_MANIFEST_STORAGE);}catch(e){} }
}
async function loadDataManifest(force){
  if(DATA_MANIFEST&&!force) return DATA_MANIFEST;
  if(DATA_MANIFEST_PROMISE) return DATA_MANIFEST_PROMISE;
  DATA_MANIFEST_PROMISE=(async()=>{
    const fallback=DATA_MANIFEST||readStoredDataManifest();
    try{
      const r=await fetchTimed(dataUrl('/manifest.json'),{headers:{Accept:'application/json'},cache:force?'reload':'no-cache'},10000);
      if(!r.ok) throw new Error('Pages timetable HTTP '+r.status);
      const data=await r.json();
      if(!validDataManifest(data)) throw new Error('Pages timetable manifest failed validation');
      const previousBuild=DATA_MANIFEST&&String(DATA_MANIFEST.built||'');
      const nextBuild=String(data.built||'');
      if(previousBuild&&nextBuild&&previousBuild!==nextBuild){
        DATA_TILE_CACHE.clear(); DATA_DEPARTURE_CACHE.clear(); PATTERN_CACHE.clear();
      }
      DATA_MANIFEST=data; DATA_MANIFEST_SOURCE='network'; writeStoredDataManifest(data); return data;
    }catch(e){
      if(fallback){ DATA_MANIFEST=fallback; DATA_MANIFEST_SOURCE='stored'; return fallback; }
      throw e;
    }
  })();
  try{return await DATA_MANIFEST_PROMISE;}finally{DATA_MANIFEST_PROMISE=null;}
}
"""
bus = replace_once(bus, old_manifest, new_manifest, 'validated manifest fallback')
bus = replace_once(
    bus,
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),versionedDataUrl};",
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),versionedDataUrl,validDataManifest,readStoredDataManifest,loadDataManifest,resetDataManifestForTest,dataManifestSource:()=>DATA_MANIFEST_SOURCE};",
    'manifest test hooks'
)
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.42"', '"version": "0.6.43"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.42'", "version: '0.6.43'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.42');", "assert.equal(body.version, '0.6.43');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.42'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.43'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /stop&&stop\\.code\\]\\n    \\.map/);",
    "assert.doesNotMatch(busSource, /stop&&stop\\.code\\]\\n    \\.map/);\nassert.match(busSource, /const DATA_MANIFEST_MAX_AGE = 14\\*24\\*3600\\*1000/);\nassert.match(busSource, /function validDataManifest\\(data\\)/);\nassert.match(busSource, /Object\\.keys\\(regions\\)\\.length!==REQUIRED_DATA_REGIONS\\.length/);\nassert.match(busSource, /DATA_MANIFEST_SOURCE='stored'/);\nassert.match(busSource, /cache:force\\?'reload':'no-cache'/);\nassert.doesNotMatch(busSource, /cache:force\\?'reload':'force-cache'/);",
    'manifest static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.42'", "version: '0.6.43'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.42')", "includes('app 0.6.43')", 'browser settings version')
old_route = """  await page.route('https://kerbside-data-zetabun.pages.dev/manifest.json**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ built: '2026-08-02T00:00:00.000Z', tileSize: 0.05, totals: { stops: 275965, departures: 50753499, patterns: 42204 }, regions: { west_midlands: { stops: 1, departures: 1 } } })
  }));
"""
new_route = """  const requiredManifestRegions=['east_anglia','east_midlands','london','north_east','north_west','south_east','south_west','west_midlands','yorkshire'];
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
"""
browser_test = replace_once(browser_test, old_route, new_route, 'manifest route fixtures')
manifest_fixture = """  const manifestPolicy = await page.evaluate(async () => {
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

"""
browser_test = replace_once(browser_test, "  const liveParsing = await page.evaluate(() => {", manifest_fixture + "  const liveParsing = await page.evaluate(() => {", 'executed manifest fallback fixtures')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.43 validates national timetable manifests before they become active. A manifest must identify the England regional Pages dataset, contain all nine expected regions, include valid build timestamps and bounds, report positive regional asset counts, and have totals that exactly match the regional sums. Valid manifests are stored locally for 14 days. Malformed JSON, incomplete deployments, inconsistent totals and HTTP failures now fall back to that recent last-known-good snapshot without clearing working tile, departure or pattern caches. WebKit executes successful, malformed, partial and unavailable manifest scenarios.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.43 manifest fallback release')
