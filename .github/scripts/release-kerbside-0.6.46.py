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
bus = replace_once(bus, "const APP_VERSION = '0.6.45';", "const APP_VERSION = '0.6.46';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.45 also validates timetable departure shards and retains recent last-known-good copies, so a temporary 404, malformed response or incomplete Pages deployment does not erase working departures.",
    "Version 0.6.46 also validates and snapshots route-pattern shards, coalesces requests by shard prefix and retries failed geometry instead of caching a permanent unavailable result for the tab.",
    'coverage release note'
)
bus = replace_once(
    bus,
    """const DATA_DEPARTURE_LAST_GOOD = new Map();
const DATA_DEPARTURE_SOURCE = new Map();
const DATA_SNAPSHOT_CACHE = 'kerbside-timetable-snapshots-v1';
const DATA_SHARD_MAX_AGE = 14*24*3600*1000;
""",
    """const DATA_DEPARTURE_LAST_GOOD = new Map();
const DATA_DEPARTURE_SOURCE = new Map();
const DATA_PATTERN_SHARD_CACHE = new Map();
const DATA_PATTERN_LAST_GOOD = new Map();
const DATA_PATTERN_SOURCE = new Map();
const DATA_PATTERN_RETRY = new Map();
const DATA_PATTERN_RETRY_MS = 60*1000;
const DATA_SNAPSHOT_CACHE = 'kerbside-timetable-snapshots-v1';
const DATA_SHARD_MAX_AGE = 14*24*3600*1000;
""",
    'pattern recovery state'
)
bus = replace_count(
    bus,
    "DATA_TILE_CACHE.clear(); DATA_DEPARTURE_CACHE.clear(); PATTERN_CACHE.clear();",
    "DATA_TILE_CACHE.clear(); DATA_DEPARTURE_CACHE.clear(); DATA_PATTERN_SHARD_CACHE.clear(); DATA_PATTERN_RETRY.clear(); PATTERN_CACHE.clear();",
    2,
    'manifest pattern cache reset'
)
bus = replace_once(
    bus,
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),versionedDataUrl,validDataManifest,readStoredDataManifest,loadDataManifest,resetDataManifestForTest,dataManifestSource:()=>DATA_MANIFEST_SOURCE,validDataDeparture,loadDataDeparture,resetDataDepartureForTest,dataDepartureSource:(region,shard)=>DATA_DEPARTURE_SOURCE.get(departureLogicalKey(region,shard))||''};",
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),versionedDataUrl,validDataManifest,readStoredDataManifest,loadDataManifest,resetDataManifestForTest,dataManifestSource:()=>DATA_MANIFEST_SOURCE,validDataDeparture,loadDataDeparture,resetDataDepartureForTest,dataDepartureSource:(region,shard)=>DATA_DEPARTURE_SOURCE.get(departureLogicalKey(region,shard))||'',validDataPatternShard,loadDataPatternShard,resetDataPatternForTest,queuePattern,timetablePatternRecord,dataPatternSource:(region,prefix)=>DATA_PATTERN_SOURCE.get(patternLogicalKey(region,prefix))||''};",
    'pattern test hooks'
)
bus = replace_once(
    bus,
    """async function clearDataSnapshots(){
  DATA_DEPARTURE_CACHE.clear(); DATA_DEPARTURE_LAST_GOOD.clear(); DATA_DEPARTURE_SOURCE.clear();
  if('caches' in window){ try{await caches.delete(DATA_SNAPSHOT_CACHE);}catch(e){} }
}
""",
    """async function clearDataSnapshots(){
  DATA_DEPARTURE_CACHE.clear(); DATA_DEPARTURE_LAST_GOOD.clear(); DATA_DEPARTURE_SOURCE.clear();
  DATA_PATTERN_SHARD_CACHE.clear(); DATA_PATTERN_LAST_GOOD.clear(); DATA_PATTERN_SOURCE.clear(); DATA_PATTERN_RETRY.clear();
  if('caches' in window){ try{await caches.delete(DATA_SNAPSHOT_CACHE);}catch(e){} }
}
""",
    'clear pattern snapshots'
)
insert_after = """async function loadDataDeparture(region,shard){
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
pattern_helpers = insert_after + """function patternLogicalKey(region,prefix){ return String(region||'')+'/'+String(prefix||'').toLowerCase(); }
function patternSnapshotRequest(region,prefix){
  return new Request(location.origin+'/__kerbside_snapshot__/pattern/'+encodeURIComponent(String(region||''))+'/'+encodeURIComponent(String(prefix||'').toLowerCase()));
}
function validDataPatternShard(data,region,prefix,expectedBuild){
  const wanted=String(prefix||'').toLowerCase();
  if(!data||Number(data.version)<3||String(data.region||'')!==String(region||'')) return false;
  if(data.scope&&data.scope!=='pattern-shard') return false;
  if(data.shard&&String(data.shard).toLowerCase()!==wanted) return false;
  const built=String(data.built||'');
  if(!Number.isFinite(Date.parse(built))||(expectedBuild&&built!==String(expectedBuild))) return false;
  if(!/^[a-f0-9]{2}$/.test(wanted)||!plainDataObject(data.patterns)||!Object.keys(data.patterns).length) return false;
  for(const [id,raw] of Object.entries(data.patterns)){
    if(!String(id).toLowerCase().startsWith(wanted)) return false;
    const points=Array.isArray(raw)?raw:raw&&raw.p;
    if(!Array.isArray(points)||points.length<2||points.some(point=>!Array.isArray(point)||point.length<2||!Number.isFinite(Number(point[0]))||!Number.isFinite(Number(point[1])))) return false;
    if(raw&&raw.s!==undefined){
      if(!Array.isArray(raw.s)||raw.s.some(stop=>!Array.isArray(stop)||stop.length<4||!Number.isFinite(Number(stop[2]))||!Number.isFinite(Number(stop[3])))) return false;
    }
  }
  return true;
}
async function readPatternSnapshot(region,prefix,now=Date.now()){
  if(!S.remember||!('caches' in window)) return null;
  try{
    const cache=await caches.open(DATA_SNAPSHOT_CACHE), response=await cache.match(patternSnapshotRequest(region,prefix));
    if(!response) return null;
    const record=await response.json();
    if(!record||!Number.isFinite(Number(record.ts))||now-Number(record.ts)>DATA_SHARD_MAX_AGE) return null;
    return validDataPatternShard(record.data,region,prefix)?record.data:null;
  }catch(e){ return null; }
}
async function writePatternSnapshot(region,prefix,data){
  if(!S.remember||!('caches' in window)||!validDataPatternShard(data,region,prefix)) return;
  try{
    const cache=await caches.open(DATA_SNAPSHOT_CACHE);
    await cache.put(patternSnapshotRequest(region,prefix),new Response(JSON.stringify({ts:Date.now(),data}),{headers:{'Content-Type':'application/json'}}));
  }catch(e){}
}
async function resetDataPatternForTest(clearSnapshot){
  DATA_PATTERN_SHARD_CACHE.clear(); DATA_PATTERN_LAST_GOOD.clear(); DATA_PATTERN_SOURCE.clear(); DATA_PATTERN_RETRY.clear();
  if(clearSnapshot&&'caches' in window){
    try{
      const cache=await caches.open(DATA_SNAPSHOT_CACHE), keys=await cache.keys();
      await Promise.all(keys.filter(request=>request.url.includes('/__kerbside_snapshot__/pattern/')).map(request=>cache.delete(request)));
    }catch(e){}
  }
}
async function loadDataPatternShard(region,prefix){
  const clean=String(prefix||'').toLowerCase(), logical=patternLogicalKey(region,clean);
  const expectedBuild=String(DATA_MANIFEST&&DATA_MANIFEST.regions&&DATA_MANIFEST.regions[region]&&DATA_MANIFEST.regions[region].built||'');
  if(!expectedBuild) throw new Error('Pages patterns have no validated regional build');
  const key=expectedBuild+'|'+logical;
  if(DATA_PATTERN_SHARD_CACHE.has(key)) return DATA_PATTERN_SHARD_CACHE.get(key);
  let fallbackUsed=false;
  const pending=(async()=>{
    let fallback=DATA_PATTERN_LAST_GOOD.get(logical)||null, fallbackSource=fallback?'memory':'';
    if(!fallback){ fallback=await readPatternSnapshot(region,clean); if(fallback) fallbackSource='snapshot'; }
    try{
      const r=await fetchTimed(dataUrl('/regions/'+encodeURIComponent(region)+'/patterns/'+encodeURIComponent(clean)+'.json'),{headers:{Accept:'application/json'},cache:'no-cache'},12000);
      if(!r.ok) throw new Error('Pages patterns HTTP '+r.status);
      const data=await r.json();
      if(!validDataPatternShard(data,region,clean,expectedBuild)) throw new Error('Pages pattern shard failed validation');
      DATA_PATTERN_LAST_GOOD.set(logical,data); DATA_PATTERN_SOURCE.set(logical,'network');
      await writePatternSnapshot(region,clean,data);
      return data;
    }catch(e){
      if(fallback&&validDataPatternShard(fallback,region,clean)){
        fallbackUsed=true; DATA_PATTERN_LAST_GOOD.set(logical,fallback); DATA_PATTERN_SOURCE.set(logical,fallbackSource||'fallback'); return fallback;
      }
      throw e;
    }
  })();
  DATA_PATTERN_SHARD_CACHE.set(key,pending);
  try{
    const data=await pending;
    if(fallbackUsed) DATA_PATTERN_SHARD_CACHE.delete(key);
    return data;
  }catch(e){ DATA_PATTERN_SHARD_CACHE.delete(key); throw e; }
}
"""
bus = replace_once(bus, insert_after, pattern_helpers, 'pattern shard helpers')
old_queue = """async function queuePattern(patternId){
  if(!patternId||!S.timetableRegion||S.patternPending.has(patternId)) return;
  S.patternPending.add(patternId);
  try{
    const prefix=String(patternId).toLowerCase().replace(/[^a-f0-9]/g,'').slice(0,2); if(prefix.length!==2) return;
    const r=await fetchTimed(dataUrl('/regions/'+encodeURIComponent(S.timetableRegion)+'/patterns/'+prefix+'.json'),{headers:{Accept:'application/json'},cache:'force-cache'},12000);
    if(!r.ok) return; const data=await r.json();
    if(data&&data.patterns&&S.timetable){Object.assign(S.timetable.patterns||(S.timetable.patterns={}),data.patterns);PATTERN_CACHE.clear();render();}
  }catch(e){} finally{S.patternPending.delete(patternId);}
}
"""
new_queue = """async function queuePattern(patternId){
  if(!patternId||!S.timetableRegion) return;
  const prefix=String(patternId).toLowerCase().replace(/[^a-f0-9]/g,'').slice(0,2); if(prefix.length!==2) return;
  const region=S.timetableRegion, requestKey=patternLogicalKey(region,prefix), expectedBuild=String(DATA_MANIFEST&&DATA_MANIFEST.regions&&DATA_MANIFEST.regions[region]&&DATA_MANIFEST.regions[region].built||'');
  if(Date.now()<(DATA_PATTERN_RETRY.get(requestKey)||0)||S.patternPending.has(requestKey)) return;
  S.patternPending.add(requestKey);
  try{
    const data=await loadDataPatternShard(region,prefix);
    const currentBuild=String(DATA_MANIFEST&&DATA_MANIFEST.regions&&DATA_MANIFEST.regions[region]&&DATA_MANIFEST.regions[region].built||'');
    if(!S.timetable||S.timetableRegion!==region||!data||currentBuild!==expectedBuild) return;
    Object.assign(S.timetable.patterns||(S.timetable.patterns={}),data.patterns);
    DATA_PATTERN_RETRY.delete(requestKey); PATTERN_CACHE.clear(); render();
  }catch(e){ DATA_PATTERN_RETRY.set(requestKey,Date.now()+DATA_PATTERN_RETRY_MS); }
  finally{S.patternPending.delete(requestKey);}
}
"""
bus = replace_once(bus, old_queue, new_queue, 'retryable pattern queue')
bus = replace_once(
    bus,
    """  const raw=tt.patterns&&tt.patterns[id];
  if(!raw){ if(S.timetableSource==='national') queuePattern(id); PATTERN_CACHE.set(id,null); return null; }
  const pointRows=Array.isArray(raw)?raw:raw&&raw.p;
  const stopRows=Array.isArray(raw&&raw.s)?raw.s:[];
  if(!Array.isArray(pointRows)||pointRows.length<2){ if(S.timetableSource==='national') queuePattern(id); PATTERN_CACHE.set(id,null); return null; }
""",
    """  const raw=tt.patterns&&tt.patterns[id];
  if(!raw){ if(S.timetableSource==='national') queuePattern(id); else PATTERN_CACHE.set(id,null); return null; }
  const pointRows=Array.isArray(raw)?raw:raw&&raw.p;
  const stopRows=Array.isArray(raw&&raw.s)?raw.s:[];
  if(!Array.isArray(pointRows)||pointRows.length<2){ if(S.timetableSource==='national') queuePattern(id); else PATTERN_CACHE.set(id,null); return null; }
""",
    'do not permanently cache missing national patterns'
)
write(bus_path, bus)

builder_path = 'kerbside-backend/scripts/build-region.js'
builder = read(builder_path)
builder = replace_once(
    builder,
    """    writeJson(filename, {
      version: 3,
      built: nowIso,
      region,
      patterns: shard
    });
""",
    """    writeJson(filename, {
      version: 3,
      built: nowIso,
      scope: 'pattern-shard',
      region,
      shard: shardPrefix,
      patterns: shard
    });
""",
    'pattern shard metadata'
)
write(builder_path, builder)

builder_test_path = 'kerbside-backend/test/build-region.test.js'
builder_test = read(builder_test_path)
builder_test = replace_once(
    builder_test,
    """    assert.equal(shard.version, 3);
    assert.equal(pattern.g, 1, 'shape geometry should be marked authoritative');
""",
    """    assert.equal(shard.version, 3);
    assert.equal(shard.scope, 'pattern-shard');
    assert.equal(shard.region, 'test_region');
    assert.equal(shard.shard, patternId.slice(0, 2));
    assert.equal(pattern.g, 1, 'shape geometry should be marked authoritative');
""",
    'builder pattern metadata test'
)
write(builder_test_path, builder_test)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.45"', '"version": "0.6.46"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.45'", "version: '0.6.46'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.45');", "assert.equal(body.version, '0.6.46');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.45'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.46'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /if\\(r\\.status===404\\) return null; if\\(!r\\.ok\\) throw new Error\\('Pages departures HTTP '/);",
    "assert.doesNotMatch(busSource, /if\\(r\\.status===404\\) return null; if\\(!r\\.ok\\) throw new Error\\('Pages departures HTTP '/);\nassert.match(busSource, /const DATA_PATTERN_RETRY_MS = 60\\*1000/);\nassert.match(busSource, /function validDataPatternShard\\(data,region,prefix,expectedBuild\\)/);\nassert.match(busSource, /S\\.patternPending\\.has\\(requestKey\\)/);\nassert.match(busSource, /DATA_PATTERN_RETRY\\.set\\(requestKey,Date\\.now\\(\\)\\+DATA_PATTERN_RETRY_MS\\)/);\nassert.match(busSource, /if\\(S\\.timetableSource===\'national\'\\) queuePattern\\(id\\); else PATTERN_CACHE\\.set\\(id,null\\)/);\nassert.doesNotMatch(busSource, /cache:\'force-cache\'\\},12000\\);\\n    if\\(!r\\.ok\\) return; const data=await r\\.json\\(\\);/);",
    'pattern recovery static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.45'", "version: '0.6.46'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.45')", "includes('app 0.6.46')", 'browser settings version')
browser_test = replace_once(
    browser_test,
    "let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0, wideFeedRequests = 0, nearbyFeedRequests = 0, departureRequests = 0;",
    "let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0, wideFeedRequests = 0, nearbyFeedRequests = 0, departureRequests = 0, patternRequests = 0;",
    'pattern request counter'
)
pattern_route_marker = """  await page.route('https://kerbside-bus.adambullas.workers.dev/health**', route => route.fulfill({
"""
pattern_route = """  const patternId='aa1234567890abcdef12';
  const validPatternShard={
    version:3,built:'2026-08-02T00:00:00.000Z',scope:'pattern-shard',region:'west_midlands',shard:'aa',
    patterns:{[patternId]:{p:[[52.49,-2.1],[52.5,-2.1]],s:[['stop-a','Test stop',52.5,-2.1]],g:1}}
  };
  let patternMode='valid';
  await page.route(/^https:\/\/kerbside-data-zetabun\.pages\.dev\/regions\/west_midlands\/patterns\/aa\.json/, route => {
    patternRequests++;
    if(patternMode==='bad-json') return route.fulfill({status:200,contentType:'application/json',body:'{"broken"'});
    if(patternMode==='wrong-build') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...validPatternShard,built:'2026-08-01T00:00:00.000Z'})});
    if(patternMode==='404') return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'synthetic missing pattern'})});
    if(patternMode==='error') return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'synthetic pattern outage'})});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(validPatternShard)});
  });

"""
browser_test = replace_once(browser_test, pattern_route_marker, pattern_route + pattern_route_marker, 'pattern network fixtures')
pattern_fixture_marker = """  const liveParsing = await page.evaluate(() => {
"""
pattern_fixture = """  patternMode='valid'; patternRequests=0;
  const patternPolicy=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataPatternForTest(true);
    const data=await api.loadDataPatternShard('west_midlands','aa');
    return {valid:api.validDataPatternShard(data,'west_midlands','aa','2026-08-02T00:00:00.000Z'),source:api.dataPatternSource('west_midlands','aa'),patterns:Object.keys(data.patterns).length};
  });
  assert.deepEqual(patternPolicy,{valid:true,source:'network',patterns:1});
  patternMode='bad-json';
  const malformedPattern=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataPatternForTest(false);
    const data=await api.loadDataPatternShard('west_midlands','aa');return {source:api.dataPatternSource('west_midlands','aa'),patterns:Object.keys(data.patterns).length};
  });
  assert.deepEqual(malformedPattern,{source:'snapshot',patterns:1});
  patternMode='wrong-build';
  const wrongBuildPattern=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataPatternForTest(false);
    const data=await api.loadDataPatternShard('west_midlands','aa');return {source:api.dataPatternSource('west_midlands','aa'),built:data.built};
  });
  assert.deepEqual(wrongBuildPattern,{source:'snapshot',built:'2026-08-02T00:00:00.000Z'});
  patternMode='404';
  const missingPattern=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;await api.resetDataPatternForTest(false);
    const data=await api.loadDataPatternShard('west_midlands','aa');return {source:api.dataPatternSource('west_midlands','aa'),patterns:Object.keys(data.patterns).length};
  });
  assert.deepEqual(missingPattern,{source:'snapshot',patterns:1});
  await page.evaluate(async()=>window.__KERBSIDE_TEST__.resetDataPatternForTest(true));
  const beforePatternRetries=patternRequests;
  const patternFailures=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TEST__;let failures=0;
    for(let i=0;i<2;i++){try{await api.loadDataPatternShard('west_midlands','aa');}catch(e){failures++;}}
    return failures;
  });
  assert.equal(patternFailures,2);
  assert.equal(patternRequests-beforePatternRetries,2);
  patternMode='error';
  await page.evaluate(async()=>window.__KERBSIDE_TEST__.resetDataPatternForTest(true));
  const beforeQueueRetry=patternRequests;
  await page.evaluate(async patternId=>{
    const api=window.__KERBSIDE_TEST__,state=api.liveState,saved={timetable:state.timetable,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion};
    state.timetable={patterns:{},tripPatterns:{'trip-pattern':patternId}};state.timetableSource='national';state.timetableRegion='west_midlands';
    try{await api.queuePattern(patternId);await api.queuePattern(patternId);}finally{Object.assign(state,saved);}
  },patternId);
  assert.equal(patternRequests-beforeQueueRetry,1);
  patternMode='valid';
  const loadedPattern=await page.evaluate(async patternId=>{
    const api=window.__KERBSIDE_TEST__,state=api.liveState,saved={timetable:state.timetable,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion};
    await api.resetDataPatternForTest(true);
    state.timetable={patterns:{},tripPatterns:{'trip-pattern':patternId}};state.timetableSource='national';state.timetableRegion='west_midlands';
    try{
      await api.queuePattern(patternId);
      return {loaded:!!state.timetable.patterns[patternId],record:!!api.timetablePatternRecord('trip-pattern'),source:api.dataPatternSource('west_midlands','aa')};
    }finally{Object.assign(state,saved);}
  },patternId);
  assert.deepEqual(loadedPattern,{loaded:true,record:true,source:'network'});

"""
browser_test = replace_once(browser_test, pattern_fixture_marker, pattern_fixture + pattern_fixture_marker, 'executed pattern recovery fixtures')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.46 applies the last-known-good policy to route-pattern geometry. Pattern shards are validated against their region, two-character prefix and regional build, including every coordinate and ordered stop row. Valid shards are retained in memory and Cache Storage for 14 days. Malformed, wrong-build, missing and unavailable responses can use the recent snapshot, while failed or fallback loads remain retryable. Pattern requests are coalesced by region and shard prefix, and a one-minute failure backoff replaces the previous permanent `PATTERN_CACHE` null entry. The regional builder now labels new geometry files with `scope: pattern-shard` and their prefix. WebKit tests snapshot recovery, uncached 404 retries, queue backoff and successful journey-geometry activation.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.46 pattern recovery release')
