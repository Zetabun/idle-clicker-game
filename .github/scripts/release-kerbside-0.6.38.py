from pathlib import Path
import re

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


def sub_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, lambda match: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one regex match, found {count}')
    return updated


bus_path = 'bus.html'
bus = read(bus_path)
bus = replace_once(bus, "const APP_VERSION = '0.6.37';", "const APP_VERSION = '0.6.38';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.37 also supplements any incomplete split 18 km scan with the normal 9 km box, retaining successful distant results while restoring nearby coverage from the failed half.",
    "Version 0.6.38 also prevents alphanumeric official stop codes from becoming invalid OpenStreetMap node queries and refreshes empty or low-confidence route lookups far sooner than verified stop mappings.",
    'coverage release note'
)

route_pattern = r"const MAPPED_KEY = 'kerbside\.routes\.v1';.*?\nfunction mappedRefs\(trustedOnly\)\{"
route_replacement = """const MAPPED_KEY = 'kerbside.routes.v1';
const MAPPED_STOP_TTL = 30*24*3600*1000;
const MAPPED_NEARBY_TTL = 7*24*3600*1000;
const MAPPED_ALONG_TTL = 24*3600*1000;
const MAPPED_EMPTY_TTL = 2*3600*1000;
let MAPPED = {};          // stopId -> {routes:[{ref,to,from,name}], ts, source}
const MAPPED_PENDING = new Map();

function mappedRecordTtl(record){
  if(!record||!Array.isArray(record.routes)||!record.routes.length) return MAPPED_EMPTY_TTL;
  if(record.source==='stop') return MAPPED_STOP_TTL;
  if(record.source==='nearby') return MAPPED_NEARBY_TTL;
  return MAPPED_ALONG_TTL;
}
function mappedRecordFresh(record,now){
  if(!record||!isFinite(Number(record.ts))) return false;
  return Math.max(0,(isFinite(now)?Number(now):Date.now())-Number(record.ts))<=mappedRecordTtl(record);
}
function loadMapped(){
  if(!store.ok || !S.remember) return;
  try{
    const o = JSON.parse(localStorage.getItem(MAPPED_KEY)||'{}');
    const now=Date.now();
    for(const k of Object.keys(o)) if(!mappedRecordFresh(o[k],now)) delete o[k];
    MAPPED = o;
  }catch(e){ MAPPED = {}; }
}
function saveMapped(){
  if(!store.ok || !S.remember) return;
  try{ localStorage.setItem(MAPPED_KEY, JSON.stringify(MAPPED)); }catch(e){}
}
function canQueryExactOsmStop(stop){
  return !!(stop&&stop.source!=='official'&&/^\\d+$/.test(String(stop.id||'')));
}
function routeLookupQueries(stop){
  const queries=[];
  if(canQueryExactOsmStop(stop)){
    queries.push({source:'stop',query:`[out:json][timeout:25];
node(${String(stop.id)});
rel(bn)["type"="route"]["route"~"^(bus|trolleybus)$"];
out tags;`});
  }
  queries.push({source:'nearby',query:`[out:json][timeout:25];
(node["highway"="bus_stop"](around:70,${stop.lat},${stop.lon});
 node["public_transport"~"^(platform|stop_position)$"](around:70,${stop.lat},${stop.lon}););
rel(bn)["type"="route"]["route"~"^(bus|trolleybus)$"];
out tags;`});
  queries.push({source:'along',query:`[out:json][timeout:25];
way(around:30,${stop.lat},${stop.lon})["highway"];
rel(bw)["type"="route"]["route"~"^(bus|trolleybus)$"];
out tags;`});
  return queries;
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),mappedRecordTtl,mappedRecordFresh,canQueryExactOsmStop,routeLookupQueries};
}

async function fetchRoutesFor(stop){
  const sid = String(stop.id), cached=MAPPED[sid];
  if(mappedRecordFresh(cached)) return cached;
  if(cached){ delete MAPPED[sid]; saveMapped(); }
  if(MAPPED_PENDING.has(sid)) return MAPPED_PENDING.get(sid);

  const pending=(async()=>{
    const parse = (j)=>{
      const seen = new Set(), routes = [];
      for(const el of (j.elements||[])){
        const t = el.tags||{};
        const ref = cleanLine(t.ref || t['route_ref'] || '');
        if(!ref) continue;
        const key = ref+'|'+(t.to||'');
        if(seen.has(key)) continue;
        seen.add(key);
        routes.push({ref, to:cleanName(t.to||''), from:cleanName(t.from||''), op:t.operator||''});
      }
      return routes;
    };
    try{
      let routes=[], source='empty';
      for(const lookup of routeLookupQueries(stop)){
        routes=parse(await overpass(lookup.query,true));
        source=lookup.source;
        if(routes.length) break;
      }
      MAPPED[sid] = {routes, ts:Date.now(), source:routes.length?source:'empty'};
      saveMapped();
      return MAPPED[sid];
    }catch(e){
      return null;      // Overpass busy — fall back to observed learning
    }
  })();
  MAPPED_PENDING.set(sid,pending);
  try{return await pending;}finally{MAPPED_PENDING.delete(sid);}
}
function mappedRefs(trustedOnly){"""
bus = sub_once(bus, route_pattern, route_replacement, 'route cache and query plan')
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.37"', '"version": "0.6.38"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.37'", "version: '0.6.38'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.37');", "assert.equal(body.version, '0.6.38');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.37'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.38'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.match(busSource, /liveState:S/);",
    "assert.match(busSource, /liveState:S/);\nassert.match(busSource, /const MAPPED_EMPTY_TTL = 2\\*3600\\*1000/);\nassert.match(busSource, /function mappedRecordFresh\\(record,now\\)/);\nassert.match(busSource, /function canQueryExactOsmStop\\(stop\\)/);\nassert.match(busSource, /function routeLookupQueries\\(stop\\)/);\nassert.match(busSource, /stop\\.source!==\'official\'/);\nassert.match(busSource, /const MAPPED_PENDING = new Map\\(\\)/);\nassert.doesNotMatch(busSource, /const MAPPED_TTL = 30\\*24\\*3600\\*1000/);",
    'route lookup static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.37'", "version: '0.6.38'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.37')", "includes('app 0.6.38')", 'browser settings version')

route_test = r"""  const routeLookupPolicy = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,now=Date.now();
    const official=api.routeLookupQueries({id:'490G00012345',source:'official',lat:52.5,lon:-2.1});
    const osm=api.routeLookupQueries({id:123456789,lat:52.5,lon:-2.1});
    const records={
      stop:{routes:[{ref:'9'}],source:'stop',ts:now},
      nearby:{routes:[{ref:'9'}],source:'nearby',ts:now},
      along:{routes:[{ref:'9'}],source:'along',ts:now},
      empty:{routes:[],source:'empty',ts:now}
    };
    return {
      officialSources:official.map(item=>item.source),
      officialContainsCode:official.some(item=>item.query.includes('490G00012345')),
      osmSources:osm.map(item=>item.source),
      osmExact:osm[0]?.query.includes('node(123456789)'),
      exactOfficial:api.canQueryExactOsmStop({id:'490G00012345',source:'official'}),
      exactOsm:api.canQueryExactOsmStop({id:123456789}),
      ttls:Object.fromEntries(Object.entries(records).map(([key,value])=>[key,api.mappedRecordTtl(value)])),
      freshEmpty:api.mappedRecordFresh(records.empty,now+2*3600*1000),
      staleEmpty:api.mappedRecordFresh(records.empty,now+2*3600*1000+1),
      staleAlong:api.mappedRecordFresh(records.along,now+24*3600*1000+1)
    };
  });
  assert.deepEqual(routeLookupPolicy,{
    officialSources:['nearby','along'],officialContainsCode:false,
    osmSources:['stop','nearby','along'],osmExact:true,
    exactOfficial:false,exactOsm:true,
    ttls:{stop:2592000000,nearby:604800000,along:86400000,empty:7200000},
    freshEmpty:true,staleEmpty:false,staleAlong:false
  });

"""
browser_test = replace_once(browser_test, "  const tripMatching = await page.evaluate(() => {", route_test + "  const tripMatching = await page.evaluate(() => {", 'executed route lookup policy')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.38 makes OpenStreetMap route discovery recoverable. Exact `node(...)` lookups are now used only for numeric OSM node IDs; official GTFS/NaPTAN stops, including alphanumeric ATCO codes, start with the coordinate-based adjacent-platform query instead of generating invalid Overpass syntax. Verified stop mappings remain cached for 30 days, nearby mappings for 7 days, road-only mappings for 24 hours and empty results for 2 hours. Expired records are removed both at startup and before use, while concurrent lookups for the same stop share one pending request. WebKit verifies the query plans and every cache boundary.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.38 route lookup recovery release')
