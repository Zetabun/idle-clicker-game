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
bus = replace_once(bus, "const APP_VERSION = '0.6.44';", "const APP_VERSION = '0.6.45';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.44 also identifies live buses by their globally unique journey reference before falling back to the vehicle code, so several buses running the same route remain separate even when an operator reuses a generic VehicleRef.",
    "Version 0.6.45 also validates timetable departure shards and retains recent last-known-good copies, so a temporary 404, malformed response or incomplete Pages deployment does not erase working departures.",
    'coverage release note'
)
bus = replace_once(
    bus,
    """const DATA_TILE_CACHE = new Map();
const DATA_DEPARTURE_CACHE = new Map();
const DATA_MANIFEST_STORAGE = 'kerbside.data.manifest.v1';
const DATA_MANIFEST_MAX_AGE = 14*24*3600*1000;
""",
    """const DATA_TILE_CACHE = new Map();
const DATA_DEPARTURE_CACHE = new Map();
const DATA_DEPARTURE_LAST_GOOD = new Map();
const DATA_DEPARTURE_SOURCE = new Map();
const DATA_SNAPSHOT_CACHE = 'kerbside-timetable-snapshots-v1';
const DATA_SHARD_MAX_AGE = 14*24*3600*1000;
const DATA_MANIFEST_STORAGE = 'kerbside.data.manifest.v1';
const DATA_MANIFEST_MAX_AGE = 14*24*3600*1000;
""",
    'departure recovery state'
)
bus = replace_once(
    bus,
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),versionedDataUrl,validDataManifest,readStoredDataManifest,loadDataManifest,resetDataManifestForTest,dataManifestSource:()=>DATA_MANIFEST_SOURCE};",
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),versionedDataUrl,validDataManifest,readStoredDataManifest,loadDataManifest,resetDataManifestForTest,dataManifestSource:()=>DATA_MANIFEST_SOURCE,validDataDeparture,loadDataDeparture,resetDataDepartureForTest,dataDepartureSource:(region,shard)=>DATA_DEPARTURE_SOURCE.get(departureLogicalKey(region,shard))||''};",
    'departure test hooks'
)
old_loader = """async function loadDataDeparture(region,shard){
  const key=region+'/'+shard; if(DATA_DEPARTURE_CACHE.has(key)) return DATA_DEPARTURE_CACHE.get(key);
  const pending=(async()=>{
    const r=await fetchTimed(dataUrl('/regions/'+encodeURIComponent(region)+'/departures/'+encodeURIComponent(shard)+'.json'),{headers:{Accept:'application/json'},cache:'force-cache'},12000);
    if(r.status===404) return null; if(!r.ok) throw new Error('Pages departures HTTP '+r.status);
    const data=await r.json(); return data&&data.stops?data:null;
  })();
  DATA_DEPARTURE_CACHE.set(key,pending);
  try{return await pending;}catch(e){DATA_DEPARTURE_CACHE.delete(key);throw e;}
}
"""
new_loader = """function departureLogicalKey(region,shard){ return String(region||'')+'/'+String(shard||''); }
function departureSnapshotRequest(region,shard){
  return new Request(location.origin+'/__kerbside_snapshot__/departure/'+encodeURIComponent(String(region||''))+'/'+encodeURIComponent(String(shard||'')));
}
function plainDataObject(value){ return !!value&&typeof value==='object'&&!Array.isArray(value); }
function validDataDeparture(data,region,shard,expectedBuild){
  if(!data||Number(data.version)<8||data.scope!=='departure-shard') return false;
  if(String(data.region||'')!==String(region||'')||String(data.shard||'')!==String(shard||'')) return false;
  const built=String(data.built||'');
  if(!Number.isFinite(Date.parse(built))||(expectedBuild&&built!==String(expectedBuild))) return false;
  if(!plainDataObject(data.services)||!plainDataObject(data.stops)||!plainDataObject(data.tripPatterns)||!plainDataObject(data.patterns)) return false;
  const stops=Object.values(data.stops); if(!stops.length) return false;
  let departures=0;
  for(const stop of stops){
    if(!plainDataObject(stop)||!Array.isArray(stop.d)) return false;
    for(const row of stop.d){
      if(!Array.isArray(row)||row.length<6||!Number.isFinite(Number(row[0]))) return false;
      departures++;
    }
  }
  return departures>0;
}
async function readDepartureSnapshot(region,shard,now=Date.now()){
  if(!S.remember||!('caches' in window)) return null;
  try{
    const cache=await caches.open(DATA_SNAPSHOT_CACHE), response=await cache.match(departureSnapshotRequest(region,shard));
    if(!response) return null;
    const record=await response.json();
    if(!record||!Number.isFinite(Number(record.ts))||now-Number(record.ts)>DATA_SHARD_MAX_AGE) return null;
    return validDataDeparture(record.data,region,shard)?record.data:null;
  }catch(e){ return null; }
}
async function writeDepartureSnapshot(region,shard,data){
  if(!S.remember||!('caches' in window)||!validDataDeparture(data,region,shard)) return;
  try{
    const cache=await caches.open(DATA_SNAPSHOT_CACHE);
    await cache.put(departureSnapshotRequest(region,shard),new Response(JSON.stringify({ts:Date.now(),data}),{headers:{'Content-Type':'application/json'}}));
  }catch(e){}
}
async function clearDataSnapshots(){
  DATA_DEPARTURE_CACHE.clear(); DATA_DEPARTURE_LAST_GOOD.clear(); DATA_DEPARTURE_SOURCE.clear();
  if('caches' in window){ try{await caches.delete(DATA_SNAPSHOT_CACHE);}catch(e){} }
}
async function resetDataDepartureForTest(clearSnapshot){
  DATA_DEPARTURE_CACHE.clear(); DATA_DEPARTURE_LAST_GOOD.clear(); DATA_DEPARTURE_SOURCE.clear();
  if(clearSnapshot&&'caches' in window){ try{await caches.delete(DATA_SNAPSHOT_CACHE);}catch(e){} }
}
async function loadDataDeparture(region,shard){
  const logical=departureLogicalKey(region,shard);
  const expectedBuild=String(DATA_MANIFEST&&DATA_MANIFEST.regions&&DATA_MANIFEST.regions[region]&&DATA_MANIFEST.regions[region].built||'');
  if(!expectedBuild) throw new Error('Pages departures have no validated regional build');
  const key=expectedBuild+'|'+logical;
  if(DATA_DEPARTURE_CACHE.has(key)) return DATA_DEPARTURE_CACHE.get(key);
  let fallbackUsed=false;
  const pending=(async()=>{
    let fallback=DATA_DEPARTURE_LAST_GOOD.get(logical)||null, fallbackSource=fallback?'memory':'';
    if(!fallback){ fallback=await readDepartureSnapshot(region,shard); if(fallback) fallbackSource='snapshot'; }
    try{
      const r=await fetchTimed(dataUrl('/regions/'+encodeURIComponent(region)+'/departures/'+encodeURIComponent(shard)+'.json'),{headers:{Accept:'application/json'},cache:'no-cache'},12000);
      if(!r.ok) throw new Error('Pages departures HTTP '+r.status);
      const data=await r.json();
      if(!validDataDeparture(data,region,shard,expectedBuild)) throw new Error('Pages departure shard failed validation');
      DATA_DEPARTURE_LAST_GOOD.set(logical,data); DATA_DEPARTURE_SOURCE.set(logical,'network');
      await writeDepartureSnapshot(region,shard,data);
      return data;
    }catch(e){
      if(fallback&&validDataDeparture(fallback,region,shard)){
        fallbackUsed=true; DATA_DEPARTURE_LAST_GOOD.set(logical,fallback); DATA_DEPARTURE_SOURCE.set(logical,fallbackSource||'fallback'); return fallback;
      }
      throw e;
    }
  })();
  DATA_DEPARTURE_CACHE.set(key,pending);
  try{
    const data=await pending;
    if(fallbackUsed) DATA_DEPARTURE_CACHE.delete(key);
    return data;
  }catch(e){ DATA_DEPARTURE_CACHE.delete(key); throw e; }
}
"""
bus = replace_once(bus, old_loader, new_loader, 'departure shard recovery')
bus = replace_once(
    bus,
    """  store.clearAll();
  S.remember=false; S.key=''; S.proxy=''; S.demo=true; S.destsByStop={};
  LINES={}; SERVING={}; MAPPED={}; S.vehicles.clear(); clearVehicleMarkers(); SIM.built=false;
""",
    """  store.clearAll(); clearDataSnapshots();
  S.remember=false; S.key=''; S.proxy=''; S.demo=true; S.destsByStop={};
  LINES={}; SERVING={}; MAPPED={}; S.vehicles.clear(); clearVehicleMarkers(); SIM.built=false;
""",
    'forget departure snapshots'
)
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.44"', '"version": "0.6.45"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.44'", "version: '0.6.45'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.44');", "assert.equal(body.version, '0.6.45');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.44'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.45'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /if\\(vehicle\\) return \\(operator\\?operator\\+'\\|':\'\'\\)\\+'vehicle\\|'\\+vehicle;\\n  if\\(journey\\)/);",
    "assert.doesNotMatch(busSource, /if\\(vehicle\\) return \\(operator\\?operator\\+'\\|':\'\'\\)\\+'vehicle\\|'\\+vehicle;\\n  if\\(journey\\)/);\nassert.match(busSource, /const DATA_SNAPSHOT_CACHE = 'kerbside-timetable-snapshots-v1'/);\nassert.match(busSource, /function validDataDeparture\\(data,region,shard,expectedBuild\\)/);\nassert.match(busSource, /const key=expectedBuild\\+'\\|'\\+logical/);\nassert.match(busSource, /cache:'no-cache'/);\nassert.match(busSource, /if\\(fallbackUsed\\) DATA_DEPARTURE_CACHE\\.delete\\(key\\)/);\nassert.match(busSource, /caches\\.delete\\(DATA_SNAPSHOT_CACHE\\)/);\nassert.doesNotMatch(busSource, /if\\(r\\.status===404\\) return null; if\\(!r\\.ok\\) throw new Error\\('Pages departures HTTP '/);",
    'departure recovery static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.44'", "version: '0.6.45'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.44')", "includes('app 0.6.45')", 'browser settings version')
browser_test = replace_once(
    browser_test,
    "let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0, wideFeedRequests = 0, nearbyFeedRequests = 0;",
    "let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0, wideFeedRequests = 0, nearbyFeedRequests = 0, departureRequests = 0;",
    'departure request counter'
)
route_marker = """  await page.route('https://kerbside-bus.adambullas.workers.dev/health**', route => route.fulfill({
"""
departure_route = """  const validDeparture={
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

"""
browser_test = replace_once(browser_test, route_marker, departure_route + route_marker, 'departure network fixtures')
fixture_marker = """  const liveParsing = await page.evaluate(() => {
"""
departure_fixture = """  departureMode='valid'; departureRequests=0;
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

"""
browser_test = replace_once(browser_test, fixture_marker, departure_fixture + fixture_marker, 'executed departure recovery fixtures')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.45 validates every national departure shard before use. The shard must match its expected region, prefix and regional build, include the expected departure-shard schema, and contain structurally valid stops and departure rows. Valid shards are retained in memory and in a browser Cache Storage snapshot for 14 days. Malformed JSON, wrong-build content, 404s and server failures can use that recent last-known-good copy, while fallback and failed requests are removed from the active promise cache so the current build is retried later. The Settings “forget everything” action also removes these snapshots. WebKit executes valid, malformed, wrong-build, missing and retry-without-fallback scenarios.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.45 departure recovery release')
