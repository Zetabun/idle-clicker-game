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


def replace_count(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} matches, found {count}')
    return text.replace(old, new)


bus_path = 'bus.html'
bus = read(bus_path)
bus = replace_once(bus, "const APP_VERSION = '0.6.46';", "const APP_VERSION = '0.6.47';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.46 also validates and snapshots route-pattern shards, coalesces requests by shard prefix and retries failed geometry instead of caching a permanent unavailable result for the tab.",
    "Version 0.6.47 also validates and snapshots national stop-index tiles, while genuine empty-tile responses use a five-minute negative cache instead of remaining unavailable for the life of the tab.",
    'coverage release note'
)
bus = replace_once(
    bus,
    """const DATA_BASE = 'https://kerbside-data-zetabun.pages.dev';
const DATA_TILE_CACHE = new Map();
const DATA_DEPARTURE_CACHE = new Map();
""",
    """const DATA_BASE = 'https://kerbside-data-zetabun.pages.dev';
const DATA_TILE_CACHE = new Map();
const DATA_TILE_LAST_GOOD = new Map();
const DATA_TILE_SOURCE = new Map();
const DATA_TILE_NEGATIVE = new Map();
const DATA_TILE_NEGATIVE_TTL = 5*60*1000;
const DATA_DEPARTURE_CACHE = new Map();
""",
    'tile recovery state'
)
bus = replace_count(
    bus,
    "DATA_TILE_CACHE.clear(); DATA_DEPARTURE_CACHE.clear(); DATA_PATTERN_SHARD_CACHE.clear(); DATA_PATTERN_RETRY.clear(); PATTERN_CACHE.clear();",
    "DATA_TILE_CACHE.clear(); DATA_TILE_NEGATIVE.clear(); DATA_DEPARTURE_CACHE.clear(); DATA_PATTERN_SHARD_CACHE.clear(); DATA_PATTERN_RETRY.clear(); PATTERN_CACHE.clear();",
    2,
    'manifest tile cache reset'
)
old_hooks = "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),versionedDataUrl,validDataManifest,readStoredDataManifest,loadDataManifest,resetDataManifestForTest,dataManifestSource:()=>DATA_MANIFEST_SOURCE,validDataDeparture,loadDataDeparture,resetDataDepartureForTest,dataDepartureSource:(region,shard)=>DATA_DEPARTURE_SOURCE.get(departureLogicalKey(region,shard))||'',validDataPatternShard,loadDataPatternShard,resetDataPatternForTest,queuePattern,timetablePatternRecord,dataPatternSource:(region,prefix)=>DATA_PATTERN_SOURCE.get(patternLogicalKey(region,prefix))||''};"
new_hooks = "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),versionedDataUrl,validDataManifest,readStoredDataManifest,loadDataManifest,resetDataManifestForTest,dataManifestSource:()=>DATA_MANIFEST_SOURCE,validDataTile,loadDataTile,resetDataTileForTest,expireDataTileNegativeForTest,dataTileSource:(region,tile)=>DATA_TILE_SOURCE.get(tileLogicalKey(region,tile))||'',validDataDeparture,loadDataDeparture,resetDataDepartureForTest,dataDepartureSource:(region,shard)=>DATA_DEPARTURE_SOURCE.get(departureLogicalKey(region,shard))||'',validDataPatternShard,loadDataPatternShard,resetDataPatternForTest,queuePattern,timetablePatternRecord,dataPatternSource:(region,prefix)=>DATA_PATTERN_SOURCE.get(patternLogicalKey(region,prefix))||''};"
bus = replace_once(bus, old_hooks, new_hooks, 'tile test hooks')
old_loader = """async function loadDataTile(region,tile){
  const key=region+'/'+tile; if(DATA_TILE_CACHE.has(key)) return DATA_TILE_CACHE.get(key);
  const pending=(async()=>{
    const r=await fetchTimed(dataUrl('/regions/'+encodeURIComponent(region)+'/tiles/'+encodeURIComponent(tile)+'.json'),{headers:{Accept:'application/json'},cache:'force-cache'},12000);
    if(r.status===404) return null; if(!r.ok) throw new Error('Pages tile HTTP '+r.status);
    const data=await r.json(); return data&&data.stops?data:null;
  })();
  DATA_TILE_CACHE.set(key,pending);
  try{return await pending;}catch(e){DATA_TILE_CACHE.delete(key);throw e;}
}
"""
new_loader = """function tileLogicalKey(region,tile){ return String(region||'')+'/'+String(tile||''); }
function tileSnapshotRequest(region,tile){
  return new Request(location.origin+'/__kerbside_snapshot__/tile/'+encodeURIComponent(String(region||''))+'/'+encodeURIComponent(String(tile||'')));
}
function validDataTile(data,region,tile,expectedBuild){
  if(!data||Number(data.version)<7||data.scope!=='stop-index') return false;
  if(String(data.region||'')!==String(region||'')||String(data.tile||'')!==String(tile||'')) return false;
  const built=String(data.built||'');
  if(!Number.isFinite(Date.parse(built))||(expectedBuild&&built!==String(expectedBuild))) return false;
  const tileSize=Number(data.tileSize), manifestTileSize=Number(DATA_MANIFEST&&DATA_MANIFEST.tileSize);
  if(!(tileSize>.001&&tileSize<=.25)||(Number.isFinite(manifestTileSize)&&Math.abs(tileSize-manifestTileSize)>1e-9)) return false;
  if(!plainDataObject(data.stops)||!Object.keys(data.stops).length) return false;
  for(const [id,stop] of Object.entries(data.stops)){
    if(!String(id)||!plainDataObject(stop)||!Array.isArray(stop.ll)||stop.ll.length<2) return false;
    if(!Number.isFinite(Number(stop.ll[0]))||!Number.isFinite(Number(stop.ll[1]))) return false;
    if(!String(stop.n||'').trim()||!/^[a-f0-9]{2}$/i.test(String(stop.shard||''))) return false;
  }
  return true;
}
async function readTileSnapshot(region,tile,now=Date.now()){
  if(!S.remember||!('caches' in window)) return null;
  try{
    const cache=await caches.open(DATA_SNAPSHOT_CACHE), response=await cache.match(tileSnapshotRequest(region,tile));
    if(!response) return null;
    const record=await response.json();
    if(!record||!Number.isFinite(Number(record.ts))||now-Number(record.ts)>DATA_SHARD_MAX_AGE) return null;
    return validDataTile(record.data,region,tile)?record.data:null;
  }catch(e){ return null; }
}
async function writeTileSnapshot(region,tile,data){
  if(!S.remember||!('caches' in window)||!validDataTile(data,region,tile)) return;
  try{
    const cache=await caches.open(DATA_SNAPSHOT_CACHE);
    await cache.put(tileSnapshotRequest(region,tile),new Response(JSON.stringify({ts:Date.now(),data}),{headers:{'Content-Type':'application/json'}}));
  }catch(e){}
}
async function resetDataTileForTest(clearSnapshot){
  DATA_TILE_CACHE.clear(); DATA_TILE_LAST_GOOD.clear(); DATA_TILE_SOURCE.clear(); DATA_TILE_NEGATIVE.clear();
  if(clearSnapshot&&'caches' in window){
    try{
      const cache=await caches.open(DATA_SNAPSHOT_CACHE), keys=await cache.keys();
      await Promise.all(keys.filter(request=>request.url.includes('/__kerbside_snapshot__/tile/')).map(request=>cache.delete(request)));
    }catch(e){}
  }
}
function expireDataTileNegativeForTest(region,tile){
  const expectedBuild=String(DATA_MANIFEST&&DATA_MANIFEST.regions&&DATA_MANIFEST.regions[region]&&DATA_MANIFEST.regions[region].built||'');
  DATA_TILE_NEGATIVE.set(expectedBuild+'|'+tileLogicalKey(region,tile),0);
}
async function loadDataTile(region,tile){
  const logical=tileLogicalKey(region,tile);
  const expectedBuild=String(DATA_MANIFEST&&DATA_MANIFEST.regions&&DATA_MANIFEST.regions[region]&&DATA_MANIFEST.regions[region].built||'');
  if(!expectedBuild) throw new Error('Pages tiles have no validated regional build');
  const key=expectedBuild+'|'+logical;
  if(Date.now()<(DATA_TILE_NEGATIVE.get(key)||0)) return null;
  if(DATA_TILE_CACHE.has(key)) return DATA_TILE_CACHE.get(key);
  let fallbackUsed=false;
  const pending=(async()=>{
    let fallback=DATA_TILE_LAST_GOOD.get(logical)||null, fallbackSource=fallback?'memory':'';
    if(!fallback){ fallback=await readTileSnapshot(region,tile); if(fallback) fallbackSource='snapshot'; }
    try{
      const r=await fetchTimed(dataUrl('/regions/'+encodeURIComponent(region)+'/tiles/'+encodeURIComponent(tile)+'.json'),{headers:{Accept:'application/json'},cache:'no-cache'},12000);
      if(r.status===404){
        if(fallback&&validDataTile(fallback,region,tile)){
          fallbackUsed=true; DATA_TILE_LAST_GOOD.set(logical,fallback); DATA_TILE_SOURCE.set(logical,fallbackSource||'fallback'); return fallback;
        }
        DATA_TILE_NEGATIVE.set(key,Date.now()+DATA_TILE_NEGATIVE_TTL); DATA_TILE_SOURCE.set(logical,'empty'); return null;
      }
      if(!r.ok) throw new Error('Pages tile HTTP '+r.status);
      const data=await r.json();
      if(!validDataTile(data,region,tile,expectedBuild)) throw new Error('Pages stop-index tile failed validation');
      DATA_TILE_NEGATIVE.delete(key); DATA_TILE_LAST_GOOD.set(logical,data); DATA_TILE_SOURCE.set(logical,'network');
      await writeTileSnapshot(region,tile,data);
      return data;
    }catch(e){
      if(fallback&&validDataTile(fallback,region,tile)){
        fallbackUsed=true; DATA_TILE_LAST_GOOD.set(logical,fallback); DATA_TILE_SOURCE.set(logical,fallbackSource||'fallback'); return fallback;
      }
      throw e;
    }
  })();
  DATA_TILE_CACHE.set(key,pending);
  try{
    const data=await pending;
    if(fallbackUsed||data===null) DATA_TILE_CACHE.delete(key);
    return data;
  }catch(e){ DATA_TILE_CACHE.delete(key); throw e; }
}
"""
bus = replace_once(bus, old_loader, new_loader, 'validated stop-index tile loader')
bus = replace_once(
    bus,
    """async function clearDataSnapshots(){
  DATA_DEPARTURE_CACHE.clear(); DATA_DEPARTURE_LAST_GOOD.clear(); DATA_DEPARTURE_SOURCE.clear();
  DATA_PATTERN_SHARD_CACHE.clear(); DATA_PATTERN_LAST_GOOD.clear(); DATA_PATTERN_SOURCE.clear(); DATA_PATTERN_RETRY.clear();
  if('caches' in window){ try{await caches.delete(DATA_SNAPSHOT_CACHE);}catch(e){} }
}
""",
    """async function clearDataSnapshots(){
  DATA_TILE_CACHE.clear(); DATA_TILE_LAST_GOOD.clear(); DATA_TILE_SOURCE.clear(); DATA_TILE_NEGATIVE.clear();
  DATA_DEPARTURE_CACHE.clear(); DATA_DEPARTURE_LAST_GOOD.clear(); DATA_DEPARTURE_SOURCE.clear();
  DATA_PATTERN_SHARD_CACHE.clear(); DATA_PATTERN_LAST_GOOD.clear(); DATA_PATTERN_SOURCE.clear(); DATA_PATTERN_RETRY.clear();
  if('caches' in window){ try{await caches.delete(DATA_SNAPSHOT_CACHE);}catch(e){} }
}
""",
    'clear tile snapshots'
)
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.46"', '"version": "0.6.47"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.46'", "version: '0.6.47'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.46');", "assert.equal(body.version, '0.6.47');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.46'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.47'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.match(busSource, /DATA_TILE_CACHE\\.clear\\(\\); DATA_DEPARTURE_CACHE\\.clear\\(\\); DATA_PATTERN_SHARD_CACHE\\.clear\\(\\); DATA_PATTERN_RETRY\\.clear\\(\\); PATTERN_CACHE\\.clear\\(\\);/);",
    "assert.match(busSource, /DATA_TILE_CACHE\\.clear\\(\\); DATA_TILE_NEGATIVE\\.clear\\(\\); DATA_DEPARTURE_CACHE\\.clear\\(\\); DATA_PATTERN_SHARD_CACHE\\.clear\\(\\); DATA_PATTERN_RETRY\\.clear\\(\\); PATTERN_CACHE\\.clear\\(\\);/);",
    'tile manifest reset assertion'
)
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /cache:'force-cache'\\},12000\\);\\n    if\\(!r\\.ok\\) return; const data=await r\\.json\\(\\);/);",
    "assert.doesNotMatch(busSource, /cache:'force-cache'\\},12000\\);\\n    if\\(!r\\.ok\\) return; const data=await r\\.json\\(\\);/);\nassert.match(busSource, /const DATA_TILE_NEGATIVE_TTL = 5\\*60\\*1000/);\nassert.match(busSource, /function validDataTile\\(data,region,tile,expectedBuild\\)/);\nassert.match(busSource, /DATA_TILE_NEGATIVE\\.set\\(key,Date\\.now\\(\\)\\+DATA_TILE_NEGATIVE_TTL\\)/);\nassert.match(busSource, /if\\(fallbackUsed\\|\\|data===null\\) DATA_TILE_CACHE\\.delete\\(key\\)/);\nassert.doesNotMatch(busSource, /const key=region\\+'\\/'\\+tile; if\\(DATA_TILE_CACHE\\.has\\(key\\)\\)/);",
    'tile recovery static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.46'", "version: '0.6.47'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.46')", "includes('app 0.6.47')", 'browser settings version')
browser_test = replace_once(
    browser_test,
    "let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0, wideFeedRequests = 0, nearbyFeedRequests = 0, departureRequests = 0, patternRequests = 0;",
    "let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0, wideFeedRequests = 0, nearbyFeedRequests = 0, departureRequests = 0, patternRequests = 0, stopTileRequests = 0;",
    'tile request counter'
)
route_marker = """  const validDeparture={
"""
tile_route = """  const validStopTile={
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

"""
browser_test = replace_once(browser_test, route_marker, tile_route + route_marker, 'tile network fixtures')
fixture_marker = """  departureMode='valid'; departureRequests=0;
"""
tile_fixture = """  stopTileMode='valid'; stopTileRequests=0;
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

"""
browser_test = replace_once(browser_test, fixture_marker, tile_fixture + fixture_marker, 'executed tile recovery fixtures')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.47 completes validation for national stop-index tiles. A tile must match its region, key and regional build, use the expected stop-index schema and contain valid coordinates plus departure-shard references. Valid populated tiles are retained in memory and Cache Storage for 14 days. Malformed, wrong-build, missing and unavailable responses can use a recent snapshot. A 404 with no prior populated tile is treated as a legitimate empty tile for five minutes, after which it is requested again; server and validation failures are never permanently cached. WebKit tests snapshot recovery, negative-cache coalescing, expiry retry and repeated server-failure retries.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.47 stop-index tile recovery release')
