from pathlib import Path

TIMETABLE = Path('kerbside-train-timetable.js')
TEST = Path('kerbside-backend/test/train-timetable-provider.test.js')
VERSION = Path('VERSION')

source = TIMETABLE.read_text(encoding='utf-8')


def replace_once(old, new):
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'Expected one timetable match, found {count}: {old[:100]!r}')
    source = source.replace(old, new, 1)

replace_once(
    "if(typeof DecompressionStream!=='function')throw new Error('This browser cannot decompress the Darwin timetable file.');",
    "if(typeof DecompressionStream!=='function')throw new Error('This browser cannot decompress the timetable file.');",
)
replace_once(
    "const from=displayName(r.from,'Departure station'),to=displayName(r.to,'destination'),snap=timetableIdLabel(manifest&&manifest.timetableId);",
    "const from=displayName(r.from,'Departure station'),to=displayName(r.to,'destination'),sourceManifest=state.sourceManifest||manifest,snap=timetableIdLabel(sourceManifest&&sourceManifest.timetableId);",
)
replace_once(
    "function sourceNote(service){\n",
    "function timetableSourceName(){return state.scheduleSource==='network-rail'?'Network Rail Open Data SCHEDULE':'National Rail Darwin Timetable Files';}\nfunction sourceNote(service){\n",
)
source = source.replace('Both legs are timetabled from the National Rail Darwin Timetable Files;', 'Both legs are timetabled from ${timetableSourceName()};')
source = source.replace('Timetabled from the National Rail Darwin Timetable Files, matched to live Darwin data by ${', 'Timetabled from ${timetableSourceName()}, matched to live Darwin data by ${')
replace_once(
    "return 'Timetabled from the National Rail Darwin Timetable Files. Live expected times, platform changes, cancellations and formation are added automatically once this service enters the live Darwin window.';",
    "return `Timetabled from ${timetableSourceName()}. Live expected times, platform changes, cancellations and formation are added automatically once this service enters the live Darwin window.`;",
)
replace_once(
    "Scheduled journey options come from National Rail Darwin Timetable Files.",
    "Scheduled journey options come from ${esc(timetableSourceName())}.",
)
source = source.replace('<span class=\"train-future-badge\">Darwin timetable</span>', '<span class=\"train-future-badge\">Official timetable</span>')
source = source.replace('search the Darwin timetable.', 'search the official timetable.')
source = source.replace('This Darwin snapshot covers ${range}. Choose a date inside that range.', 'The available timetable covers ${range}. Choose a date inside that range.')
replace_once(
    "async function refreshEdgeManifest(){const r=route(),manifest=state.manifest;if(state.loading||!r.date||!manifest||!Array.isArray(manifest.dates)||!manifest.dates.length)return false;",
    "async function refreshEdgeManifest(){const r=route(),manifest=state.darwinManifest||state.manifest;if(state.loading||!r.date||!manifest||!Array.isArray(manifest.dates)||!manifest.dates.length)return false;",
)
replace_once(
    "const next=await timetableProvider.refreshCoverage();if(!next||String(next.timetableId||'')===before)return false;",
    "const next=await timetableProvider.refreshCoverage(),nextDarwin=state.darwinManifest||next;if(!nextDarwin||String(nextDarwin.timetableId||'')===before)return false;",
)
replace_once(
    "/* The date picker offers 90 days but the snapshot holds about 48 hours, so\n   most reachable dates used to land on a coverage error. Clamp to what the\n   published manifest can actually answer. */",
    "/* Clamp the date picker to the combined published timetable coverage. Darwin\n   normally owns the near term while Network Rail SCHEDULE extends the same\n   journey planner across the rolling long-range window. */",
)

adapter = r'''

/* ------------------------------------------------------------------
   Long-range Network Rail SCHEDULE adapter.

   The existing Darwin timetable provider remains the preferred near-term
   source. This adapter adds the separately deployed Network Rail SCHEDULE
   snapshot underneath it and only takes over when Darwin does not genuinely
   cover the requested date/time. The returned row shape is identical, so the
   established direct/connection planner and Forecast v4 stay single-source.
------------------------------------------------------------------ */
;(function(){
'use strict';
const api=window.__KERBSIDE_TRAIN_TIMETABLE__,provider=window.__KERBSIDE_TIMETABLE_PROVIDER__;
if(!api||!provider||provider.__kerbsideDualSource)return;
const NETWORK_RAIL_DATA_BASE='https://kerbside-rail-data-zetabun.pages.dev';
const MANIFEST_CACHE_MS=5*60*1000,REQUEST_TIMEOUT_MS=12000;
const original={
  getCoverage:provider.getCoverage.bind(provider),
  refreshCoverage:provider.refreshCoverage.bind(provider),
  getServices:provider.getServices.bind(provider)
};
const nr={manifestPromise:null,manifest:null,checkedAt:0,locationsPromise:null,datePromises:new Map()};

function addDays(stamp,days){const d=new Date(`${stamp}T12:00:00Z`);if(Number.isNaN(d.getTime()))return stamp;d.setUTCDate(d.getUTCDate()+Number(days||0));return d.toISOString().slice(0,10);}
function parseMinutes(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;const h=Number(m[1]),n=Number(m[2]);return h>=0&&h<24&&n>=0&&n<60?h*60+n:null;}
function coverageIncludes(coverage,value){
  if(typeof api.coverageIncludesTime==='function')return api.coverageIncludesTime(coverage,value);
  if(!coverage)return false;if(!coverage.partial)return true;
  const minute=parseMinutes(value),from=parseMinutes(coverage.from),to=parseMinutes(coverage.to);if(minute==null)return true;
  return (from==null||minute>=from)&&(to==null||minute<=to);
}
async function fetchBytes(url,{json=false}={}){
  const controller=typeof AbortController==='function'?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS):null;
  try{
    const response=await fetch(url,{cache:json?'no-cache':'default',headers:json?{Accept:'application/json'}:undefined,...(controller?{signal:controller.signal}:{})});
    if(!response.ok)throw new Error(`Long-range timetable returned ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }catch(error){
    if(error&&error.name==='AbortError')throw new Error('Long-range timetable request timed out.');
    throw error;
  }finally{if(timer)clearTimeout(timer);}
}
async function fetchJson(url){const bytes=await fetchBytes(url,{json:true});return JSON.parse(new TextDecoder().decode(bytes));}
async function fetchGzipJson(url){
  const bytes=await fetchBytes(url);let text='';
  if(bytes.length>=2&&bytes[0]===0x1f&&bytes[1]===0x8b){
    if(typeof DecompressionStream!=='function')throw new Error('This browser cannot decompress the long-range timetable file.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    text=await new Response(stream).text();
  }else text=new TextDecoder().decode(bytes);
  return JSON.parse(text);
}
function clearNetworkRailCaches(){nr.locationsPromise=null;nr.datePromises.clear();}
function loadNetworkRailManifest({force=false}={}){
  const expired=!nr.checkedAt||Date.now()-nr.checkedAt>=MANIFEST_CACHE_MS;
  if(!nr.manifestPromise||force||expired){
    const previousId=nr.manifest&&nr.manifest.timetableId||'';
    nr.manifestPromise=fetchJson(`${NETWORK_RAIL_DATA_BASE}/manifest.json`).then(value=>{
      const nextId=value&&value.timetableId||'';if(previousId&&nextId&&previousId!==nextId)clearNetworkRailCaches();
      nr.manifest=value;nr.checkedAt=Date.now();return value;
    }).catch(error=>{nr.manifestPromise=null;if(nr.manifest)return nr.manifest;throw error;});
  }
  return nr.manifestPromise;
}
function loadNetworkRailLocations(){if(!nr.locationsPromise)nr.locationsPromise=fetchJson(`${NETWORK_RAIL_DATA_BASE}/locations.json`).catch(error=>{nr.locationsPromise=null;throw error;});return nr.locationsPromise;}
function loadNetworkRailDate(stamp){if(!nr.datePromises.has(stamp))nr.datePromises.set(stamp,fetchGzipJson(`${NETWORK_RAIL_DATA_BASE}/${encodeURIComponent(stamp)}.json.gz`).catch(error=>{nr.datePromises.delete(stamp);throw error;}));return nr.datePromises.get(stamp);}
function unionCoverage(a,b){
  if(!a)return b||null;if(!b)return a||null;
  const from=[a.from,b.from].filter(Boolean).sort()[0]||'',to=[a.to,b.to].filter(Boolean).sort().slice(-1)[0]||'';
  return {from,to,partial:!!a.partial&&!!b.partial};
}
function combinedManifest(darwin,networkRail){
  const dateSet=new Set([...(darwin&&Array.isArray(darwin.dates)?darwin.dates:[]),...(networkRail&&Array.isArray(networkRail.dates)?networkRail.dates:[])]),dates=[...dateSet].sort(),coverage={};
  for(const stamp of dates)coverage[stamp]=unionCoverage(darwin&&darwin.coverage&&darwin.coverage[stamp],networkRail&&networkRail.coverage&&networkRail.coverage[stamp]);
  return {
    schema:1,source:'Kerbside combined rail timetable',
    timetableId:darwin&&darwin.timetableId||networkRail&&networkRail.timetableId||'',dates,coverage,
    tocNames:{...(networkRail&&networkRail.tocNames||{}),...(darwin&&darwin.tocNames||{})},
    sources:{darwin:darwin||null,networkRail:networkRail||null}
  };
}
async function loadCoverage({force=false}={}){
  const darwinPromise=force?original.refreshCoverage():original.getCoverage();
  const [darwinResult,networkRailResult]=await Promise.allSettled([darwinPromise,loadNetworkRailManifest({force})]);
  const darwin=darwinResult.status==='fulfilled'?darwinResult.value:null,networkRail=networkRailResult.status==='fulfilled'?networkRailResult.value:null;
  if(!darwin&&!networkRail)throw (darwinResult.reason||networkRailResult.reason||new Error('No timetable source is available.'));
  api.state.darwinManifest=darwin;api.state.networkRailManifest=networkRail;
  const combined=combinedManifest(darwin,networkRail);api.state.manifest=combined;return {darwin,networkRail,combined};
}
function manifestCovers(manifest,stamp,time){return !!(manifest&&Array.isArray(manifest.dates)&&manifest.dates.includes(stamp)&&coverageIncludes(manifest.coverage&&manifest.coverage[stamp],time));}
function selectSource(name,manifest){api.state.scheduleSource=name;api.state.sourceManifest=manifest||null;}
async function networkRailServices(manifest,options){
  const next=addDays(options.date,1),dates=[options.date,...(manifest.dates.includes(next)?[next]:[])];
  const [locations,...sets]=await Promise.all([loadNetworkRailLocations(),...dates.map(loadNetworkRailDate)]),rows=[],seen=new Set();
  for(const set of sets)for(const row of Array.isArray(set)?set:[]){const key=String(row&&((row[0]||row[1]||row[2]))||'');if(key&&seen.has(key))continue;if(key)seen.add(key);rows.push(row);}
  return provider.journeysFromRows(rows,locations,manifest,options);
}
provider.getCoverage=async options=>(await loadCoverage({force:!!options.force})).combined;
provider.refreshCoverage=async()=>(await loadCoverage({force:true})).combined;
provider.getServices=async options=>{
  const coverage=await loadCoverage(),time=options.departAfter||'00:00';
  if(manifestCovers(coverage.darwin,options.date,time)){
    selectSource('darwin',coverage.darwin);
    try{return await original.getServices(options);}catch(error){
      if(!manifestCovers(coverage.networkRail,options.date,time))throw error;
    }
  }
  if(manifestCovers(coverage.networkRail,options.date,time)){
    selectSource('network-rail',coverage.networkRail);
    return networkRailServices(coverage.networkRail,options);
  }
  selectSource('',null);return [];
};
provider.__kerbsideDualSource=true;
window.__KERBSIDE_LONG_RANGE_TIMETABLE__={state:nr,base:NETWORK_RAIL_DATA_BASE,loadCoverage,manifestCovers};
})();
'''

if '__KERBSIDE_LONG_RANGE_TIMETABLE__' in source:
    raise SystemExit('Long-range timetable adapter already present')
source += adapter
TIMETABLE.write_text(source, encoding='utf-8')

# Add focused provider tests without disturbing the existing Darwin-only fixtures.
test_source = TEST.read_text(encoding='utf-8')
marker = "test('timetable topology adds extra transfer time at a highly connected hub',()=>{"
if marker not in test_source:
    raise SystemExit('Provider test insertion marker missing')
if 'dual-source coverage extends beyond Darwin' in test_source:
    raise SystemExit('Dual-source tests already present')

addition = r'''

function loadDualProvider({darwinPartial=false,departAfter='09:00'}={}){
  const nrManifest={schema:1,source:'Network Rail Open Data SCHEDULE (CIF_ALL_FULL_DAILY JSON)',timetableId:'20260815003101',dates:['2026-08-12','2026-09-10'],coverage:{'2026-08-12':{from:'00:01',to:'23:59',partial:false},'2026-09-10':{from:'00:01',to:'23:59',partial:false}},tocNames:{XC:'CrossCountry'}};
  const darwinManifest={...manifest,coverage:{'2026-08-12':darwinPartial?{from:'00:01',to:'07:30',partial:true}:{from:'00:01',to:'23:59',partial:false}}};
  const nrRows=[['nr-future','nr-uid','1N10','XC','2026-09-10',[["BHM","","10:00","5",0],["BRI","11:25","","3",0]]],['nr-overlap','nr-overlap-uid','1N11','XC','2026-08-12',[["BHM","","09:30","5",0],["BRI","10:55","","3",0]]]];
  const nrGz=gzipSync(Buffer.from(JSON.stringify(nrRows)));
  const dualResponse=input=>{
    const url=String(input),networkRail=url.startsWith('https://kerbside-rail-data-zetabun.pages.dev/');
    if(networkRail&&url.endsWith('/manifest.json'))return new Response(JSON.stringify(nrManifest),{status:200});
    if(networkRail&&url.endsWith('/locations.json'))return new Response(JSON.stringify(locations),{status:200});
    if(networkRail&&/\/2026-(08-12|09-10)\.json\.gz$/.test(url))return new Response(nrGz,{status:200});
    if(url.endsWith('/manifest.json'))return new Response(JSON.stringify(darwinManifest),{status:200});
    if(url.endsWith('/locations.json'))return new Response(JSON.stringify(locations),{status:200});
    if(url.endsWith('/2026-08-12.json.gz'))return new Response(gz,{status:200});
    return new Response('not found',{status:404});
  };
  const context={console,URL,Date,Intl,setTimeout,clearTimeout,setInterval(){return 0;},Blob,Response,TextDecoder,DecompressionStream,AbortController,location:{hostname:'localhost'},fetch:async input=>dualResponse(input),document:{readyState:'loading',addEventListener(){},getElementById(id){return id==='trainDepartAfter'?{value:departAfter}:null;}},window:{__KERBSIDE_TRAIN_DATE__:{state:{date:'2026-08-12'},isToday(){return false;}}}};
  vm.createContext(context);vm.runInContext(timetableSource,context);
  return {provider:context.window.__KERBSIDE_TIMETABLE_PROVIDER__,api:context.window.__KERBSIDE_TRAIN_TIMETABLE__};
}

test('dual-source coverage extends beyond Darwin',async()=>{
  const {provider,api}=loadDualProvider(),coverage=await provider.getCoverage();
  assert.ok(coverage.dates.includes('2026-09-10'));
  assert.equal(api.state.darwinManifest.source,'National Rail Darwin Timetable Files');
  assert.match(api.state.networkRailManifest.source,/Network Rail Open Data SCHEDULE/);
});

test('Darwin remains preferred inside its genuine coverage',async()=>{
  const {provider,api}=loadDualProvider();
  const services=await provider.getServices({from:'BHM',to:'BRI',date:'2026-08-12',departAfter:'09:00'});
  assert.equal(services[0].serviceID,'rid-1');
  assert.equal(api.state.scheduleSource,'darwin');
});

test('Network Rail SCHEDULE answers long-range journeys',async()=>{
  const {provider,api}=loadDualProvider();
  const services=await provider.getServices({from:'BHM',to:'BRI',date:'2026-09-10',departAfter:'09:00'});
  assert.equal(services.length,1);assert.equal(services[0].std,'10:00');assert.equal(services[0].arrival,'11:25');
  assert.equal(api.state.scheduleSource,'network-rail');
});

test('Network Rail fills the uncovered part of a partial Darwin edge date',async()=>{
  const {provider,api}=loadDualProvider({darwinPartial:true});
  const services=await provider.getServices({from:'BHM',to:'BRI',date:'2026-08-12',departAfter:'09:00'});
  assert.equal(services[0].serviceID,'nr-overlap');
  assert.equal(api.state.scheduleSource,'network-rail');
});
'''

test_source += addition
TEST.write_text(test_source, encoding='utf-8')

if VERSION.read_text(encoding='utf-8').strip() != '0.9.16':
    raise SystemExit('Unexpected VERSION; rebase release patch before applying')
VERSION.write_text('0.9.17\n', encoding='utf-8')
