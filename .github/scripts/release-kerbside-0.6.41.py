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
bus = replace_once(bus, "const APP_VERSION = '0.6.40';", "const APP_VERSION = '0.6.41';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.40 also generates the displayed three-day timetable window from each departure's actual arrival date, keeping extreme GTFS hours such as 100:05 on the correct day and service calendar.",
    "Version 0.6.41 also supplements incomplete national stop-tile responses with OpenStreetMap, avoids week-long caching of partial results and uses a finer location key so nearby searches do not incorrectly share stop lists.",
    'coverage release note'
)
old_cache = """const STOP_TTL = 7*24*3600*1000;
function stopCacheKey(lat,lon,radius){
  return 'kerbside.stops.v5.'+lat.toFixed(3)+','+lon.toFixed(3)+','+radius;
}
"""
new_cache = """const STOP_TTL = 7*24*3600*1000;
function stopCacheKey(lat,lon,radius){
  return 'kerbside.stops.v6.'+lat.toFixed(4)+','+lon.toFixed(4)+','+radius;
}
"""
bus = replace_once(bus, old_cache, new_cache, 'stop cache precision')

old_official = """async function fetchOfficialStops(lat,lon,radius){
  try{
    const manifest=await loadDataManifest(false), regions=dataRegionsFor(lat,lon,radius,manifest), tiles=dataTilesForRadius(lat,lon,radius);
    const settled=await Promise.allSettled(regions.flatMap(region=>tiles.map(async tile=>({region,tile,data:await loadDataTile(region,tile)}))));
    const loaded=settled.filter(result=>result.status==='fulfilled').map(result=>result.value);
    if(!loaded.length) return null;
    const unique=new Map();
    for(const item of loaded){
      if(!item.data||!item.data.stops) continue;
      for(const [id,raw] of Object.entries(item.data.stops)){
        const ll=raw&&raw.ll, stopLat=Number(ll&&ll[0]), stopLon=Number(ll&&ll[1]);
        if(!isFinite(stopLat)||!isFinite(stopLon)) continue;
        const metres=dist(lat,lon,stopLat,stopLon); if(metres>radius) continue;
        const stop={id:String(id),timetableId:String(id),name:titleCase(raw.n||'Unnamed stop'),atco:String(raw.c||id),naptan:String(raw.sms||''),code:String(raw.c||id),ind:String(raw.ind||''),lat:stopLat,lon:stopLon,region:item.region,tile:item.tile,shard:String(raw.shard||''),source:'official',d:metres};
        const old=unique.get(stop.id); if(!old||stop.d<old.d) unique.set(stop.id,stop);
      }
    }
    return [...unique.values()].sort((a,b)=>a.d-b.d).slice(0,120);
  }catch(e){ return null; }
}
"""
new_official = """async function fetchOfficialStops(lat,lon,radius){
  try{
    const manifest=await loadDataManifest(false), regions=dataRegionsFor(lat,lon,radius,manifest), tiles=dataTilesForRadius(lat,lon,radius);
    const settled=await Promise.allSettled(regions.flatMap(region=>tiles.map(async tile=>({region,tile,data:await loadDataTile(region,tile)}))));
    const failed=settled.filter(result=>result.status==='rejected').length;
    const loaded=settled.filter(result=>result.status==='fulfilled').map(result=>result.value);
    if(!loaded.length) return null;
    const unique=new Map();
    for(const item of loaded){
      if(!item.data||!item.data.stops) continue;
      for(const [id,raw] of Object.entries(item.data.stops)){
        const ll=raw&&raw.ll, stopLat=Number(ll&&ll[0]), stopLon=Number(ll&&ll[1]);
        if(!isFinite(stopLat)||!isFinite(stopLon)) continue;
        const metres=dist(lat,lon,stopLat,stopLon); if(metres>radius) continue;
        const stop={id:String(id),timetableId:String(id),name:titleCase(raw.n||'Unnamed stop'),atco:String(raw.c||id),naptan:String(raw.sms||''),code:String(raw.c||id),ind:String(raw.ind||''),lat:stopLat,lon:stopLon,region:item.region,tile:item.tile,shard:String(raw.shard||''),source:'official',d:metres};
        const old=unique.get(stop.id); if(!old||stop.d<old.d) unique.set(stop.id,stop);
      }
    }
    return {
      stops:[...unique.values()].sort((a,b)=>a.d-b.d).slice(0,120),
      complete:failed===0, failed, requested:settled.length
    };
  }catch(e){ return null; }
}
function discoveredStopCodes(stop){
  return new Set([stop&&stop.timetableId,stop&&stop.atco,stop&&stop.naptan,stop&&stop.code]
    .map(value=>String(value||'').trim().toLowerCase()).filter(Boolean));
}
function sameDiscoveredStop(a,b){
  const codesA=discoveredStopCodes(a), codesB=discoveredStopCodes(b);
  if([...codesA].some(code=>codesB.has(code))) return true;
  if(!a||!b||!isFinite(a.lat)||!isFinite(a.lon)||!isFinite(b.lat)||!isFinite(b.lon)) return false;
  const indA=normName(a.ind||''), indB=normName(b.ind||'');
  if(indA&&indB&&indA!==indB) return false;
  return dist(a.lat,a.lon,b.lat,b.lon)<=12 && nameSimilarity(a.name||'',b.name||'')>=.6;
}
function mergeDiscoveredStops(primary,secondary,lat,lon){
  const out=[];
  for(const original of [...(primary||[]),...(secondary||[])]){
    if(!original||!isFinite(original.lat)||!isFinite(original.lon)) continue;
    const candidate={...original,d:dist(lat,lon,original.lat,original.lon)};
    const index=out.findIndex(existing=>sameDiscoveredStop(existing,candidate));
    if(index<0){ out.push(candidate); continue; }
    const current=out[index];
    const preferred=candidate.source==='official'&&current.source!=='official'?candidate:current;
    const other=preferred===candidate?current:candidate;
    const combined={...other,...preferred};
    for(const field of ['ind','atco','naptan','code','timetableId','region','tile','shard']){
      combined[field]=preferred[field]||other[field]||'';
    }
    combined.d=dist(lat,lon,combined.lat,combined.lon);
    out[index]=combined;
  }
  return out.sort((a,b)=>a.d-b.d).slice(0,120);
}
function showDiscoveredStops(stops,lat,lon,cacheable){
  S.stops=mergeDiscoveredStops([],stops,lat,lon);
  drawStops();
  if(cacheable&&S.stops.length) writeStopCache(lat,lon,S.radius,S.stops,S.anchor);
  if(!S.stops.length) return false;
  const want=S.pendingStopId?S.stops.find(stop=>String(stop.id)===String(S.pendingStopId)):null;
  S.pendingStopId=null; selectStop(want||S.stops[0]); return true;
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),stopCacheKey,sameDiscoveredStop,mergeDiscoveredStops};
}
"""
bus = replace_once(bus, old_official, new_official, 'partial official stop result')

old_find = """  const official=await fetchOfficialStops(lat,lon,S.radius);
  if(run!==S.locationRun) return;
  if(official && official.length){
    S.stops=official; drawStops(); writeStopCache(lat,lon,S.radius,S.stops,S.anchor);
    const want=S.pendingStopId?S.stops.find(s=>String(s.id)===String(S.pendingStopId)):null;
    S.pendingStopId=null; selectStop(want||S.stops[0]); return;
  }
  const q = `[out:json][timeout:25];
(node["highway"="bus_stop"](around:${S.radius},${lat},${lon});
 node["public_transport"="platform"]["bus"="yes"](around:${S.radius},${lat},${lon}););
out body 120;`;
  try{
    const j = await overpass(q);
    if(run!==S.locationRun) return;
    const seen=new Set();
    S.stops = (j.elements||[]).map(el=>{
      const tags=el.tags||{};
      const atco=tags['naptan:AtcoCode']||'';
      const naptan=tags['naptan:NaptanCode']||tags['naptan:SmsCode']||'';
      return {
        id:el.id,
        name:titleCase(tags.name||tags['naptan:CommonName']||'Unnamed stop'),
        atco,naptan, code:atco||naptan||tags.ref||'',
        ind:tags['naptan:Indicator']||tags.local_ref||'',
        lat:el.lat, lon:el.lon, d:dist(lat,lon,el.lat,el.lon)
      };
    }).filter(s=>{
      const k=String(s.id)+'|'+Math.round(s.lat*25000)+'|'+Math.round(s.lon*25000);
      if(seen.has(k)) return false; seen.add(k); return true;
    }).sort((a,b)=>a.d-b.d);

    drawStops();
    writeStopCache(lat,lon,S.radius,S.stops,S.anchor);
    if(S.stops.length){
      const want = S.pendingStopId ? S.stops.find(s=>s.id===S.pendingStopId) : null;
      S.pendingStopId = null;
      selectStop(want || S.stops[0]);
    }
    else {
      $('stopName').textContent='No bus stops mapped here';
      $('stopMeta').textContent='TRY A WIDER RADIUS IN SETTINGS';
      showEmpty('<strong>No stops within '+fmtDist(S.radius)+'</strong>OpenStreetMap has no bus stops mapped around this point. Widen the radius in settings, or move the search somewhere more built up.');
    }
  }catch(e){
    if(run!==S.locationRun) return;
    $('stopName').textContent='Could not load stops';
    $('stopMeta').textContent='OVERPASS UNAVAILABLE';
    showEmpty('<strong>Stop lookup failed</strong>The OpenStreetMap query service didn\'t respond. It rate-limits under load — wait a moment and <button id="retryStops">try again</button>.');
    const rb=$('retryStops'); if(rb) rb.addEventListener('click',()=>findStops(lat,lon,S.locationRun));
  }
"""
new_find = """  const officialResult=await fetchOfficialStops(lat,lon,S.radius);
  if(run!==S.locationRun) return;
  const official=officialResult&&Array.isArray(officialResult.stops)?officialResult.stops:[];
  if(official.length&&officialResult.complete){
    showDiscoveredStops(official,lat,lon,true); return;
  }
  const q = `[out:json][timeout:25];
(node["highway"="bus_stop"](around:${S.radius},${lat},${lon});
 node["public_transport"="platform"]["bus"="yes"](around:${S.radius},${lat},${lon}););
out body 120;`;
  try{
    const j = await overpass(q);
    if(run!==S.locationRun) return;
    const seen=new Set();
    const discovered=(j.elements||[]).map(el=>{
      const tags=el.tags||{};
      const atco=tags['naptan:AtcoCode']||'';
      const naptan=tags['naptan:NaptanCode']||tags['naptan:SmsCode']||'';
      return {
        id:el.id,
        name:titleCase(tags.name||tags['naptan:CommonName']||'Unnamed stop'),
        atco,naptan, code:atco||naptan||tags.ref||'',
        ind:tags['naptan:Indicator']||tags.local_ref||'',
        lat:el.lat, lon:el.lon, d:dist(lat,lon,el.lat,el.lon)
      };
    }).filter(stop=>{
      const key=String(stop.id)+'|'+Math.round(stop.lat*25000)+'|'+Math.round(stop.lon*25000);
      if(seen.has(key)) return false; seen.add(key); return true;
    });
    const merged=mergeDiscoveredStops(official,discovered,lat,lon);
    if(showDiscoveredStops(merged,lat,lon,true)) return;
    $('stopName').textContent='No bus stops mapped here';
    $('stopMeta').textContent='TRY A WIDER RADIUS IN SETTINGS';
    showEmpty('<strong>No stops within '+fmtDist(S.radius)+'</strong>No official or OpenStreetMap bus stops were found around this point. Widen the radius in settings, or move the search somewhere more built up.');
  }catch(e){
    if(run!==S.locationRun) return;
    // A partial Pages response is useful for this visit, but never cache it:
    // the missing tile should be retried on the next search or page load.
    if(official.length){
      showDiscoveredStops(official,lat,lon,false);
      setStatus('Some official stop tiles were unavailable — using partial results','err');
      return;
    }
    $('stopName').textContent='Could not load stops';
    $('stopMeta').textContent='STOP DATA UNAVAILABLE';
    showEmpty('<strong>Stop lookup failed</strong>National timetable tiles and OpenStreetMap did not respond. Wait a moment and <button id="retryStops">try again</button>.');
    const rb=$('retryStops'); if(rb) rb.addEventListener('click',()=>findStops(lat,lon,S.locationRun));
  }
"""
bus = replace_once(bus, old_find, new_find, 'partial stop recovery flow')
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.40"', '"version": "0.6.41"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.40'", "version: '0.6.41'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.40');", "assert.equal(body.version, '0.6.41');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.40'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.41'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /for\\(const offset of \\[-1,0,1\\]\\)\\{\\n    const serviceDate/);",
    "assert.doesNotMatch(busSource, /for\\(const offset of \\[-1,0,1\\]\\)\\{\\n    const serviceDate/);\nassert.match(busSource, /kerbside\\.stops\\.v6/);\nassert.match(busSource, /lat\\.toFixed\\(4\\)/);\nassert.match(busSource, /complete:failed===0/);\nassert.match(busSource, /function mergeDiscoveredStops\\(primary,secondary,lat,lon\\)/);\nassert.match(busSource, /officialResult&&officialResult\\.complete/);\nassert.match(busSource, /showDiscoveredStops\\(official,lat,lon,false\\)/);\nassert.doesNotMatch(busSource, /kerbside\\.stops\\.v5/);",
    'partial stop static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.40'", "version: '0.6.41'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.40')", "includes('app 0.6.41')", 'browser settings version')

stop_test = r"""  const stopDiscoveryPolicy = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__;
    const official={id:'490G00012345',timetableId:'490G00012345',source:'official',name:'High Street',atco:'490G00012345',ind:'Stop A',lat:52.5,lon:-2.1};
    const duplicate={id:123456,name:'High Street',atco:'490G00012345',ind:'',lat:52.50001,lon:-2.10001};
    const otherSide={id:123457,name:'High Street',ind:'Stop B',lat:52.50018,lon:-2.1};
    const merged=api.mergeDiscoveredStops([official],[duplicate,otherSide],52.5,-2.1);
    return {
      cacheA:api.stopCacheKey(52.50004,-2.10004,1200),
      cacheB:api.stopCacheKey(52.50006,-2.10006,1200),
      sameCode:api.sameDiscoveredStop(official,duplicate),
      otherSideSame:api.sameDiscoveredStop(official,otherSide),
      count:merged.length,
      ids:merged.map(stop=>String(stop.id)).sort(),
      officialSource:merged.find(stop=>String(stop.id)==='490G00012345')?.source,
      officialIndicator:merged.find(stop=>String(stop.id)==='490G00012345')?.ind
    };
  });
  assert.notEqual(stopDiscoveryPolicy.cacheA,stopDiscoveryPolicy.cacheB);
  assert.match(stopDiscoveryPolicy.cacheA,/kerbside\.stops\.v6/);
  assert.deepEqual({...stopDiscoveryPolicy,cacheA:undefined,cacheB:undefined},{
    cacheA:undefined,cacheB:undefined,sameCode:true,otherSideSame:false,count:2,
    ids:['123457','490G00012345'],officialSource:'official',officialIndicator:'Stop A'
  });

"""
browser_test = replace_once(browser_test, "  const tripMatching = await page.evaluate(() => {", stop_test + "  const tripMatching = await page.evaluate(() => {", 'executed stop discovery fixtures')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.41 makes national stop discovery resilient to partial Cloudflare Pages responses. Tile requests now report whether the result set is complete. A complete official list is used and cached immediately; an incomplete list is supplemented with OpenStreetMap and merged by official codes or tightly matching coordinates. If OpenStreetMap is also unavailable, partial official stops remain usable for the current visit but are deliberately not cached, allowing the missing tile to be retried. The stop cache moves to `v6` with four-decimal location keys so origins more than a few metres apart no longer share a potentially incomplete week-long list. WebKit verifies cache separation, official-stop preference and duplicate/opposite-stop handling.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.41 partial stop recovery release')
