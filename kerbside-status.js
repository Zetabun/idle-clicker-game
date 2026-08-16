(function(){
'use strict';

const VERSION='0.9.32';
const REFRESH_CACHE_MS=5*60*1000;
const REQUEST_TIMEOUT_MS=7000;
const HISTORY_KEY='kerbside.status.history.v1';
const HISTORY_WINDOW_MS=24*60*60*1000;
const HISTORY_MAX_PER_SOURCE=288;
const BUS_DATA_BASE='https://kerbside-data-zetabun.pages.dev';
const DEFAULT_BUS_WORKER='https://kerbside-bus.adambullas.workers.dev';
const RAIL_WORKER='https://kerbside-rail.adambullas.workers.dev';
const HUXLEY_PRIMARY='https://huxley2.azurewebsites.net';
const HUXLEY_SECONDARY='https://hux.azurewebsites.net';
const BANK_HOLIDAYS='https://www.gov.uk/bank-holidays.json';
const WIKIDATA='https://query.wikidata.org/sparql';
const OPENFOOTBALL='https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/en.1.json';
const GITHUB_RUNS='https://api.github.com/repos/Zetabun/idle-clicker-game/actions/workflows/refresh-darwin-timetable.yml/runs?per_page=1';
const OVERPASS=[
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];
const BUS_PROBE_BBOX='-1.91000,52.47000,-1.89000,52.49000';

const state={installed:false,inFlight:false,lastChecked:0,results:new Map(),history:null};
const $=id=>document.getElementById(id);
const now=()=>Date.now();
const elapsed=(start)=>Math.max(0,now()-start);
const labelFor={healthy:'Healthy',degraded:'Degraded',down:'Down',checking:'Checking',standby:'Standby'};


function readHistory(){try{const value=JSON.parse(localStorage.getItem(HISTORY_KEY)||'null');return value&&typeof value==='object'?value:{};}catch(error){return {};}}
function pruneHistory(at=now()){
  if(!state.history||typeof state.history!=='object')state.history={};const cutoff=at-HISTORY_WINDOW_MS;
  for(const id of Object.keys(state.history)){const rows=(Array.isArray(state.history[id])?state.history[id]:[]).filter(row=>row&&Number(row.ts)>=cutoff).slice(-HISTORY_MAX_PER_SOURCE);if(rows.length)state.history[id]=rows;else delete state.history[id];}
}
function saveHistory(){try{pruneHistory();localStorage.setItem(HISTORY_KEY,JSON.stringify(state.history||{}));}catch(error){}}
function recordHistory(value,ts=now()){
  if(!value||!value.id)return;if(!state.history)state.history=readHistory();pruneHistory(ts);const rows=state.history[value.id]||(state.history[value.id]=[]);rows.push({ts:Number(ts)||now(),status:String(value.status||'down'),latency:Number.isFinite(value.latency)?value.latency:null});if(rows.length>HISTORY_MAX_PER_SOURCE)rows.splice(0,rows.length-HISTORY_MAX_PER_SOURCE);
}
function medianNumber(values){const nums=values.filter(value=>value!=null).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);if(!nums.length)return null;const mid=Math.floor(nums.length/2);return nums.length%2?nums[mid]:(nums[mid-1]+nums[mid])/2;}
function historySummary(id,at=now()){
  if(!state.history)state.history=readHistory();pruneHistory(at);const rows=Array.isArray(state.history[id])?state.history[id]:[],samples=rows.length,failures=rows.filter(row=>row.status==='down').length,degraded=rows.filter(row=>row.status==='degraded').length,available=rows.filter(row=>row.status!=='down').length,latency=medianNumber(rows.map(row=>row.latency));
  return {samples,failures,degraded,availability:samples?available/samples:0,medianLatency:latency};
}
function historyText(id){const h=historySummary(id);if(!h.samples)return'No local 24h history yet';if(h.samples===1)return'24h local history · 1 check';const latency=Number.isFinite(h.medianLatency)?` · ${Math.round(h.medianLatency)} ms median`:'';return `24h local checks · ${Math.round(h.availability*1000)/10}% available · ${h.failures} failure${h.failures===1?'':'s'}${h.degraded?` · ${h.degraded} degraded`:''}${latency}`;}

function normaliseUrl(value){
  const raw=String(value||'').trim();
  if(!raw)return'';
  try{const u=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);u.hash='';u.search='';u.pathname=u.pathname.replace(/\/$/,'');return u.toString().replace(/\/$/,'');}catch(error){return'';}
}
function busWorkerBase(){const input=$('proxy');return normaliseUrl(input&&input.value)||DEFAULT_BUS_WORKER;}
function formatLatency(ms){return Number.isFinite(ms)?`${Math.max(1,Math.round(ms))} ms`:'';}
function formatStamp(value){
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))return'';
  return date.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}
function ageText(ms){
  if(!Number.isFinite(ms)||ms<0)return'';
  if(ms<90*1000)return`${Math.max(0,Math.round(ms/1000))} sec ago`;
  if(ms<90*60*1000)return`${Math.round(ms/60000)} min ago`;
  if(ms<48*3600*1000)return`${Math.round(ms/3600000)} hr ago`;
  return`${Math.round(ms/86400000)} days ago`;
}
function timedIdDate(value){
  const m=String(value||'').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/);
  if(!m)return null;
  const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]||0)));
  return Number.isNaN(d.getTime())?null:d;
}
function parseMinute(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;const h=Number(m[1]),n=Number(m[2]);return h>=0&&h<24&&n>=0&&n<60?h*60+n:null;}
function coverageHealth(manifest,date,time){
  if(!manifest||!Array.isArray(manifest.dates))return{status:'down',detail:'Timetable manifest is invalid.'};
  if(!date)return{status:'healthy',detail:'Timetable manifest loaded.'};
  if(!manifest.dates.includes(date))return{status:'down',detail:`${date} is not present in the current timetable snapshot.`};
  const coverage=manifest.coverage&&manifest.coverage[date];
  if(!coverage)return{status:'degraded',detail:`${date} is present but has no published coverage window.`};
  if(!coverage.partial)return{status:'healthy',detail:`${date} has full-day coverage (${coverage.from}–${coverage.to}).`};
  const minute=parseMinute(time),from=parseMinute(coverage.from),to=parseMinute(coverage.to);
  const inside=minute==null||((from==null||minute>=from)&&(to==null||minute<=to));
  return inside
    ?{status:'degraded',detail:`Edge-date coverage is partial (${coverage.from}–${coverage.to}), but ${time||'the selected time'} is inside it.`}
    :{status:'degraded',detail:`${time||'The selected time'} is outside the current edge-date coverage (${coverage.from}–${coverage.to}). A newer daily snapshot is required.`};
}
function overallState(results){
  const list=Array.isArray(results)?results:[];
  if(list.some(item=>item&&item.critical&&item.status==='down'))return{status:'down',label:'Core service issue detected'};
  if(list.some(item=>item&&(item.status==='down'||item.status==='degraded')))return{status:'degraded',label:'Some sources are degraded'};
  if(list.length&&list.every(item=>item.status==='healthy'||item.status==='standby'))return{status:'healthy',label:'All checked services are healthy'};
  return{status:'checking',label:'Checking Kerbside services'};
}
function result(source,status,detail,latency,label){return{...source,status,detail:String(detail||''),latency:Number.isFinite(latency)?latency:null,label:label||labelFor[status]||status};}
function sourceError(source,error){const message=error&&error.message?error.message:String(error||'unreachable');return result(source,'down',message,null,'Down');}

async function request(url,{type='text',timeout=REQUEST_TIMEOUT_MS,headers={},cache='no-store'}={}){
  const controller=new AbortController(),start=now();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(url,{signal:controller.signal,cache,headers});
    let body=null;
    if(type==='json')body=await response.json().catch(()=>null);
    else if(type==='arrayBuffer')body=await response.arrayBuffer();
    else body=await response.text();
    return{response,body,latency:elapsed(start)};
  }catch(error){if(error&&error.name==='AbortError')throw new Error('Timed out');throw error;}
  finally{clearTimeout(timer);}
}
function memo(context,key,producer){if(!context[key])context[key]=Promise.resolve().then(producer);return context[key];}
async function imageProbe(url){
  if(typeof Image!=='function')throw new Error('Image probe unavailable in this browser');
  const start=now();
  await new Promise((resolve,reject)=>{
    const image=new Image(),timer=setTimeout(()=>{image.src='';reject(new Error('Timed out'));},REQUEST_TIMEOUT_MS);
    image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(new Error('Tile request failed'));};image.src=url+(url.includes('?')?'&':'?')+'kerbside_status='+Date.now();
  });
  return elapsed(start);
}
async function busHealth(context){
  return memo(context,'busHealth',async()=>{const base=busWorkerBase();if(!base)return null;const value=await request(`${base}/health`,{type:'json'});return{...value,base};});
}
async function railHealth(context){return memo(context,'railHealth',()=>request(`${RAIL_WORKER}/health`,{type:'json'}));}
async function busManifest(context){return memo(context,'busManifest',()=>request(`${BUS_DATA_BASE}/manifest.json?status=${Date.now()}`,{type:'json'}));}
async function railManifest(context){return memo(context,'railManifest',()=>request(`kerbside-rail-timetable/manifest.json?status=${Date.now()}`,{type:'json'}));}
async function workflowInfo(context){
  return memo(context,'workflowInfo',async()=>{
    const runResponse=await request(GITHUB_RUNS,{type:'json',headers:{Accept:'application/vnd.github+json'}});
    if(!runResponse.response.ok)throw new Error(`GitHub Actions returned ${runResponse.response.status}`);
    const run=runResponse.body&&Array.isArray(runResponse.body.workflow_runs)?runResponse.body.workflow_runs[0]:null;
    let jobs=null;
    if(run&&run.id){
      const jobsResponse=await request(`https://api.github.com/repos/Zetabun/idle-clicker-game/actions/runs/${run.id}/jobs?per_page=10`,{type:'json',headers:{Accept:'application/vnd.github+json'}});
      if(jobsResponse.response.ok)jobs=jobsResponse.body;
    }
    return{run,jobs,latency:runResponse.latency};
  });
}
function runAge(run){const stamp=run&&(run.updated_at||run.run_started_at||run.created_at);const d=stamp?new Date(stamp):null;return d&&!Number.isNaN(d.getTime())?now()-d.getTime():Infinity;}
function workflowStatus(run){
  if(!run)return{status:'degraded',detail:'No refresh workflow run was returned.'};
  const age=runAge(run),conclusion=String(run.conclusion||''),status=String(run.status||'');
  if(status!=='completed')return{status:'degraded',detail:`Refresh job is ${status||'running'} (${ageText(age)}).`};
  if(conclusion!=='success')return{status:'down',detail:`Latest refresh job finished ${conclusion||'unsuccessfully'} ${ageText(age)}.`};
  if(age>48*3600*1000)return{status:'down',detail:`Last successful refresh was ${ageText(age)}.`};
  if(age>26*3600*1000)return{status:'degraded',detail:`Last successful refresh was ${ageText(age)}.`};
  return{status:'healthy',detail:`Last refresh succeeded ${ageText(age)}.`};
}
function stepByName(jobs,pattern){
  const rows=jobs&&Array.isArray(jobs.jobs)?jobs.jobs:[];
  for(const job of rows){for(const step of (Array.isArray(job.steps)?job.steps:[])){if(pattern.test(String(step.name||'')))return step;}}
  return null;
}
function timestampFreshness(value,{healthyMs,degradedMs}){
  const d=value?new Date(value):null;if(!d||Number.isNaN(d.getTime()))return{status:'degraded',age:Infinity};
  const age=now()-d.getTime();if(age<=healthyMs)return{status:'healthy',age};if(age<=degradedMs)return{status:'degraded',age};return{status:'down',age};
}
function busManifestFreshness(manifest){return timestampFreshness(manifest&&manifest.built,{healthyMs:36*3600*1000,degradedMs:72*3600*1000});}
function liveRailProbeState(status){return [408,429,502,504].includes(Number(status))?'degraded':'down';}

const SOURCE_META=[
  {id:'app-pages',category:'Platform & pipelines',name:'Kerbside app / GitHub Pages',description:'The deployed app shell and release version.',critical:true},
  {id:'bus-worker',category:'Platform & pipelines',name:'Cloudflare bus Worker',description:'Protects the BODS key and proxies live bus feeds.',critical:true},
  {id:'rail-worker',category:'Platform & pipelines',name:'Cloudflare rail Worker',description:'Protects the Rail Data Marketplace key and caches Darwin boards.',critical:true},
  {id:'bus-pages',category:'Platform & pipelines',name:'Cloudflare Pages timetable store',description:'Static national bus timetable, stop and route-pattern assets.',critical:true},
  {id:'github-refresh',category:'Platform & pipelines',name:'GitHub Actions timetable refresh',description:'Scheduled job that checks and publishes Darwin timetable snapshots.',critical:true},
  {id:'google-cloud',category:'Platform & pipelines',name:'Google Cloud Darwin ingest',description:'Workload Identity + GCS timetable bucket used by the refresh job.',critical:true},

  {id:'bods-siri',category:'Bus data',name:'BODS SIRI-VM live vehicles',description:'DfT live bus positions used for GPS, ETA and approach matching.',critical:true},
  {id:'bods-gtfsrt',category:'Bus data',name:'BODS GTFS-RT matched vehicles',description:'Auxiliary trip identity used to strengthen exact timetable matching.',critical:false},
  {id:'bods-timetable',category:'Bus data',name:'BODS regional GTFS timetable',description:'Scheduled bus services republished as compact regional assets.',critical:true},
  {id:'bods-disruptions',category:'Bus data',name:'BODS SIRI-SX disruptions',description:'Roadworks and service disruption feed published beside the app.',critical:false},
  {id:'naptan',category:'Bus data',name:'DfT NaPTAN stop register',description:'Stop bearings, streets, timing points and stop-type attributes.',critical:false},

  {id:'rdm-darwin',category:'Rail data',name:'National Rail Darwin / RDM',description:'Official live departure data through the Kerbside rail Worker.',critical:true},
  {id:'rail-timetable',category:'Rail data',name:'Darwin scheduled timetable',description:'Published daily timetable snapshot used for same-day and future journeys.',critical:true},
  {id:'huxley2',category:'Rail data',name:'Huxley2 fallback',description:'Primary community fallback when the official rail Worker cannot answer.',critical:false},
  {id:'huxley',category:'Rail data',name:'Huxley fallback',description:'Secondary community fallback for live rail departures.',critical:false},

  {id:'gov-holidays',category:'Prediction & events',name:'GOV.UK bank holidays',description:'Calendar input to Forecast v4.',critical:false},
  {id:'wikidata-events',category:'Prediction & events',name:'Wikidata events',description:'CC0 event source used for destination and origin demand pressure.',critical:false},
  {id:'openfootball',category:'Prediction & events',name:'openfootball fixtures',description:'Public-domain football fixtures used for match-day demand pressure.',critical:false},
  {id:'dft-calibration',category:'Prediction & events',name:'DfT rail crowding calibration',description:'Bundled measured 2025 rail crowding aggregates used by Forecast v4.',critical:false},
  {id:'forecast-v3',category:'Prediction & events',name:'Forecast v4 engine',description:'Kerbside crowding model combining timetable, calendar, event and live evidence.',critical:true},

  {id:'photon',category:'Maps & support',name:'Photon geocoder',description:'Address/place search provided by Komoot Photon.',critical:false},
  {id:'overpass',category:'Maps & support',name:'OpenStreetMap Overpass pool',description:'Four-provider fallback pool for stop and route-map enrichment.',critical:false},
  {id:'carto',category:'Maps & support',name:'CARTO basemap tiles',description:'Primary interactive basemap.',critical:false},
  {id:'osm-tiles',category:'Maps & support',name:'OpenStreetMap tile fallback',description:'Automatic basemap fallback if CARTO fails.',critical:false},
  {id:'leaflet',category:'Maps & support',name:'Leaflet map runtime',description:'Self-hosted Leaflet runtime; unpkg is the emergency script fallback.',critical:true},
  {id:'google-fonts',category:'Maps & support',name:'Google Fonts',description:'Archivo and Martian Mono UI fonts.',critical:false},
  {id:'storage',category:'Maps & support',name:'Browser local storage',description:'Stores preferences, learned bus evidence and local rail observations.',critical:false},
  {id:'geolocation',category:'Maps & support',name:'Device geolocation',description:'Optional browser location service used to find nearby stops.',critical:false}
];

function sourceDefinitions(){
  const byId=Object.fromEntries(SOURCE_META.map(source=>[source.id,source]));
  return [
    {...byId['app-pages'],probe:async source=>{const r=await request(`VERSION?status=${Date.now()}`);if(!r.response.ok)return result(source,'down',`VERSION returned HTTP ${r.response.status}`,r.latency);const version=String(r.body||'').trim();return result(source,version===VERSION?'healthy':'degraded',version===VERSION?`Release ${version} is being served.`:`Page is serving ${version||'an unknown version'}; expected ${VERSION}.`,r.latency);}},
    {...byId['bus-worker'],probe:async(source,context)=>{const r=await busHealth(context);if(!r)return result(source,'standby','No bus Worker is configured.',null,'Not configured');if(!r.response.ok)return result(source,'down',`Health endpoint returned HTTP ${r.response.status}`,r.latency);const body=r.body||{};if(!body.ok)return result(source,'down','Worker health response did not report ok.',r.latency);if(!body.bods)return result(source,'degraded',`Worker ${body.version||''} is reachable but its BODS secret is missing.`,r.latency);return result(source,'healthy',`Worker ${body.version||'version unknown'} reachable · BODS secret configured.`,r.latency);}},
    {...byId['rail-worker'],probe:async(source,context)=>{const r=await railHealth(context);if(!r.response.ok)return result(source,'down',`Health endpoint returned HTTP ${r.response.status}`,r.latency);const body=r.body||{};if(!body.ok)return result(source,'down','Worker health response did not report ok.',r.latency);if(!body.ldbConfigured)return result(source,'degraded','Rail Worker is reachable but the RDM key is not configured.',r.latency);return result(source,'healthy','Rail Worker reachable · Rail Data Marketplace key configured.',r.latency);}},
    {...byId['bus-pages'],probe:async(source,context)=>{const r=await busManifest(context);if(!r.response.ok)return result(source,'down',`Manifest returned HTTP ${r.response.status}`,r.latency);if(!r.body||!r.body.regions)return result(source,'down','Cloudflare Pages returned an invalid timetable manifest.',r.latency);return result(source,'healthy',`Timetable store reachable${r.body.built?` · build ${formatStamp(r.body.built)}`:''}.`,r.latency);}},
    {...byId['github-refresh'],probe:async(source,context)=>{try{const info=await workflowInfo(context),health=workflowStatus(info.run);return result(source,health.status,health.detail,info.latency);}catch(error){return result(source,'degraded',`Could not read public workflow status: ${error.message||error}.`);}}},
    {...byId['google-cloud'],probe:async(source,context)=>{try{const info=await workflowInfo(context),runHealth=workflowStatus(info.run);const auth=stepByName(info.jobs,/Authenticate to Google Cloud/i),scan=stepByName(info.jobs,/Find newest complete Darwin timetable snapshot/i);if(auth&&auth.conclusion==='failure')return result(source,'down','Latest refresh could not authenticate to Google Cloud.');if(scan&&scan.conclusion==='failure')return result(source,'down','Latest refresh authenticated, but the GCS timetable snapshot check failed.');if(auth&&scan&&auth.conclusion==='success'&&scan.conclusion==='success')return result(source,runHealth.status,`GCP authentication and GCS snapshot check succeeded ${ageText(runAge(info.run))}.`);return result(source,runHealth.status==='down'?'down':'degraded',`${runHealth.detail} Google Cloud step detail is not available.`);}catch(error){return result(source,'degraded',`Google Cloud health could not be inferred: ${error.message||error}.`);}}},

    {...byId['bods-siri'],probe:async(source,context)=>{const health=await busHealth(context);if(!health||!health.response.ok)return result(source,'down','Bus Worker is unavailable, so the BODS live feed cannot be checked.');const base=health.base,r=await request(`${base}/feed?bbox=${encodeURIComponent(BUS_PROBE_BBOX)}`,{headers:{Accept:'application/xml,text/xml'}});if(!r.response.ok)return result(source,r.response.status===429?'degraded':'down',`Live feed returned HTTP ${r.response.status}.`,r.latency);const valid=/<(?:[A-Za-z0-9_.-]+:)?Siri(?=[\s/>])/i.test(String(r.body||''));return result(source,valid?'healthy':'down',valid?'Valid live SIRI response received.':'Response was not valid SIRI XML.',r.latency);}},
    {...byId['bods-gtfsrt'],probe:async(source,context)=>{const health=await busHealth(context);if(!health||!health.response.ok)return result(source,'down','Bus Worker is unavailable, so GTFS-RT cannot be checked.');const r=await request(`${health.base}/matched?bbox=${encodeURIComponent(BUS_PROBE_BBOX)}`,{type:'json',headers:{Accept:'application/json'}});if(!r.response.ok)return result(source,r.response.status===429?'degraded':'down',`Matched feed returned HTTP ${r.response.status}.`,r.latency);const valid=r.body&&Array.isArray(r.body.vehicles);return result(source,valid?'healthy':'down',valid?`Valid matched feed received · ${r.body.vehicles.length} vehicles in probe area.`:'Matched feed returned invalid JSON.',r.latency);}},
    {...byId['bods-timetable'],probe:async(source,context)=>{const r=await busManifest(context);if(!r.response.ok)return result(source,'down',`Published timetable manifest returned HTTP ${r.response.status}.`,r.latency);const fresh=busManifestFreshness(r.body);return result(source,fresh.status,`Published BODS timetable build ${r.body&&r.body.built?formatStamp(r.body.built):'has no timestamp'}${Number.isFinite(fresh.age)?` · ${ageText(fresh.age)}`:''}.`,r.latency);}},
    {...byId['bods-disruptions'],probe:async source=>{const r=await request(`disruptions.json?status=${Date.now()}`,{type:'json'});if(!r.response.ok)return result(source,'down',`Disruption feed returned HTTP ${r.response.status}.`,r.latency);const fresh=timestampFreshness(r.body&&r.body.built,{healthyMs:24*3600*1000,degradedMs:72*3600*1000});return result(source,fresh.status,`Published disruption feed${r.body&&r.body.built?` built ${formatStamp(r.body.built)} · ${ageText(fresh.age)}`:' has no build timestamp'}.`,r.latency);}},
    {...byId['naptan'],probe:async source=>{const r=await request(`naptan/index.json?status=${Date.now()}`,{type:'json'});if(!r.response.ok)return result(source,'down',`NaPTAN index returned HTTP ${r.response.status}.`,r.latency);const fresh=timestampFreshness(r.body&&r.body.built,{healthyMs:10*86400000,degradedMs:21*86400000});const count=Number(r.body&&r.body.count)||0;return result(source,fresh.status,`${count?count.toLocaleString('en-GB')+' active bus stops · ':''}${r.body&&r.body.built?`built ${formatStamp(r.body.built)} · ${ageText(fresh.age)}`:'build time unavailable'}.`,r.latency);}},

    {...byId['rdm-darwin'],probe:async source=>{let last=null,totalLatency=0;for(let attempt=0;attempt<2;attempt++){const r=await request(`${RAIL_WORKER}/departures/BHM/1?timeWindow=1`,{type:'json',headers:{Accept:'application/json'}});last=r;totalLatency+=Number(r.latency)||0;if(r.response.ok){const valid=r.body&&String(r.body.crs||'').toUpperCase()==='BHM'&&Object.prototype.hasOwnProperty.call(r.body,'trainServices');return result(source,valid?'healthy':'down',valid?(attempt?'Official Darwin recovered on retry and returned valid data.':'Official Darwin departure board returned valid data.'):'Official Darwin response was not a valid departure board.',totalLatency);}if(liveRailProbeState(r.response.status)!=='degraded')return result(source,'down',`Official live rail probe returned HTTP ${r.response.status}.`,totalLatency);if(attempt===0)await new Promise(resolve=>setTimeout(resolve,300));}const status=last&&last.response&&last.response.status||0;return result(source,'degraded',`Official Darwin is temporarily unavailable (HTTP ${status}). Kerbside will use Huxley fallbacks for live boards while it recovers.`,totalLatency,'Degraded');}},
    {...byId['rail-timetable'],probe:async(source,context)=>{const r=await railManifest(context);if(!r.response.ok)return result(source,'down',`Timetable manifest returned HTTP ${r.response.status}.`,r.latency);const manifest=r.body||{},selectedDate=$('trainTravelDate')&&$('trainTravelDate').value||'',selectedTime=$('trainDepartAfter')&&$('trainDepartAfter').value||'';const coverage=coverageHealth(manifest,selectedDate,selectedTime);const snapshot=timedIdDate(manifest.timetableId),age=snapshot?now()-snapshot.getTime():Infinity;let status=coverage.status;if(status==='healthy'){if(age>52*3600*1000)status='down';else if(age>30*3600*1000)status='degraded';}const detail=`Snapshot ${manifest.timetableId||'unknown'}${snapshot?` · ${ageText(age)}`:''}. ${coverage.detail}`;return result(source,status,detail,r.latency);}},
    {...byId['huxley2'],probe:async source=>{const r=await request(`${HUXLEY_PRIMARY}/departures/BHM/1`,{type:'json',headers:{Accept:'application/json'}});if(!r.response.ok)return result(source,'down',`Fallback returned HTTP ${r.response.status}.`,r.latency);return result(source,'standby','Fallback is reachable and ready if the official source fails.',r.latency,'Standby');}},
    {...byId['huxley'],probe:async source=>{const r=await request(`${HUXLEY_SECONDARY}/departures/BHM/1`,{type:'json',headers:{Accept:'application/json'}});if(!r.response.ok)return result(source,'down',`Fallback returned HTTP ${r.response.status}.`,r.latency);return result(source,'standby','Secondary fallback is reachable.',r.latency,'Standby');}},

    {...byId['gov-holidays'],probe:async source=>{const r=await request(`${BANK_HOLIDAYS}?status=${Date.now()}`,{type:'json'});const valid=r.response.ok&&r.body&&r.body['england-and-wales']&&Array.isArray(r.body['england-and-wales'].events);return result(source,valid?'healthy':'down',valid?'England and Wales holiday calendar returned valid data.':`Bank-holiday feed returned ${r.response.status||'invalid data'}.`,r.latency);}},
    {...byId['wikidata-events'],probe:async source=>{const query=encodeURIComponent('ASK { <http://www.wikidata.org/entity/Q42> ?p ?o }');const r=await request(`${WIKIDATA}?query=${query}&format=json`,{type:'json',headers:{Accept:'application/sparql-results+json,application/json'}});const valid=r.response.ok&&r.body&&typeof r.body.boolean==='boolean';return result(source,valid?'healthy':'down',valid?'Wikidata SPARQL endpoint returned a valid query result.':`Wikidata returned ${r.response.status||'invalid data'}.`,r.latency);}},
    {...byId['openfootball'],probe:async source=>{const r=await request(`${OPENFOOTBALL}?status=${Date.now()}`,{type:'json'});const valid=r.response.ok&&r.body&&typeof r.body==='object';return result(source,valid?'healthy':'down',valid?'Fixture repository is reachable.':`Fixture source returned ${r.response.status||'invalid data'}.`,r.latency);}},
    {...byId['dft-calibration'],probe:async source=>{const api=window.__KERBSIDE_CALIBRATION__;const ok=!!(api&&typeof api.demandShape==='function'&&typeof api.serviceClassSignal==='function');return result(source,ok?'healthy':'down',ok?`Bundled calibration loaded${api.source?` · ${api.source}`:''}.`:'DfT calibration module is not loaded.');}},
    {...byId['forecast-v3'],probe:async source=>{const api=window.__KERBSIDE_FORECAST_V3__;const ok=!!(api&&typeof api.forecast==='function');return result(source,ok?'healthy':'down',ok?`Forecast v${api.version||3} engine is loaded.`:'Forecast v4 engine is not loaded.');}},

    {...byId['photon'],probe:async source=>{const r=await request('https://photon.komoot.io/api/?q=Birmingham&limit=1&lang=en&countrycode=GB&bbox=-9,49,3,61',{type:'json',headers:{Accept:'application/json'}});const valid=r.response.ok&&r.body&&Array.isArray(r.body.features);return result(source,valid?'healthy':'down',valid?'Geocoder returned a valid result.':`Photon returned ${r.response.status||'invalid data'}.`,r.latency);}},
    {...byId['overpass'],probe:async source=>{const query=encodeURIComponent('[out:json][timeout:5];node(1);out;');const attempts=await Promise.all(OVERPASS.map(async endpoint=>{try{const r=await request(`${endpoint}?data=${query}`,{type:'json',timeout:6000});return r.response.ok;}catch(error){return false;}}));const up=attempts.filter(Boolean).length;return result(source,up>=2?'healthy':up===1?'degraded':'down',`${up}/${OVERPASS.length} Overpass endpoints reachable.`);}},
    {...byId['carto'],probe:async source=>{const latency=await imageProbe('https://a.basemaps.cartocdn.com/light_all/0/0/0.png');return result(source,'healthy','Primary basemap tile loaded.',latency);}},
    {...byId['osm-tiles'],probe:async source=>{const latency=await imageProbe('https://tile.openstreetmap.org/0/0/0.png');return result(source,'standby','Fallback basemap tile loaded and is ready if CARTO fails.',latency,'Standby');}},
    {...byId['leaflet'],probe:async source=>{const ok=!!(window.L&&typeof window.L.map==='function');return result(source,ok?'healthy':'down',ok?`Leaflet ${window.L.version||''} runtime loaded from the local app bundle.`:'Leaflet runtime is unavailable.');}},
    {...byId['google-fonts'],probe:async source=>{let ok=false;try{ok=!!(document.fonts&&document.fonts.check('12px Archivo')&&document.fonts.check('12px "Martian Mono"'));}catch(error){}return result(source,ok?'healthy':'degraded',ok?'Kerbside web fonts are loaded.':'Web fonts are not confirmed; system fallbacks remain usable.');}},
    {...byId['storage'],probe:async source=>{let ok=false;try{const key='__kerbside_status__';localStorage.setItem(key,'1');localStorage.removeItem(key);ok=true;}catch(error){}return result(source,ok?'healthy':'degraded',ok?'Local storage is writable.':'Local storage is blocked; Kerbside can run but cannot persist preferences or learning.');}},
    {...byId['geolocation'],probe:async source=>{const ok=!!(navigator&&navigator.geolocation);return result(source,ok?'healthy':'degraded',ok?'Browser geolocation API is available.':'Geolocation is unavailable; address search still works.');}}
  ];
}

async function runPool(items,worker,limit=5){
  let index=0;const output=new Array(items.length);
  async function run(){while(index<items.length){const i=index++;output[i]=await worker(items[i],i);}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},run));
  return output;
}
function installStyles(){
  if($('kerbsideStatusStyles')||!document.head)return;
  const style=document.createElement('style');style.id='kerbsideStatusStyles';style.textContent=`
  .status-switchboard{display:grid;gap:13px}.status-overview{padding:14px;border:1px solid var(--rule);border-radius:10px;background:var(--ink)}
  .status-overview-head{display:flex;align-items:center;gap:10px}.status-overview-led,.status-led{display:block;flex:0 0 auto;border-radius:50%;background:var(--text-mute)}
  .status-overview-led{width:12px;height:12px}.status-led{width:9px;height:9px;margin-top:4px}
  [data-state="healthy"]>.status-led,.status-overview[data-state="healthy"] .status-overview-led{background:var(--live);box-shadow:0 0 8px rgb(var(--live-rgb) / .55)}
  [data-state="degraded"]>.status-led,.status-overview[data-state="degraded"] .status-overview-led{background:var(--led);box-shadow:0 0 8px rgb(var(--led-rgb) / .45)}
  [data-state="down"]>.status-led,.status-overview[data-state="down"] .status-overview-led{background:var(--warn);box-shadow:0 0 8px rgb(var(--warn-rgb) / .5)}
  [data-state="standby"]>.status-led{background:var(--text-dim)}
  .status-overview strong{font-size:14px}.status-overview-summary{margin:5px 0 0 22px;color:var(--text-dim);font-size:11px;line-height:1.45}
  .status-overview-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding-top:11px;border-top:1px solid var(--rule)}
  .status-overview-actions span{font-size:10px;color:var(--text-dim)}.status-refresh{padding:7px 10px;border:1px solid var(--rule);border-radius:7px;color:var(--text);font-size:11px;font-weight:700;background:var(--ink-3)}
  .status-refresh:disabled{opacity:.5}.status-note{margin:0;color:var(--text-dim);font-size:10.5px;line-height:1.55}
  .status-group{border-top:1px solid var(--rule);padding-top:12px}.status-group h3{margin:0 0 7px;font-size:12.5px}.status-list{display:grid;gap:6px}
  .status-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:start;padding:9px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--ink)}
  .status-copy{min-width:0}.status-copy b{display:block;font-size:11.5px}.status-description{display:block;margin-top:1px;color:var(--text-dim);font-size:9.5px;line-height:1.35}.status-detail{display:block;margin-top:4px;color:var(--text-dim);font-size:10px;line-height:1.4}.status-history{display:block;margin-top:4px;color:var(--text-mute);font-family:'Martian Mono',monospace;font-size:8.5px;line-height:1.4}
  .status-state{text-align:right;font-family:'Martian Mono',monospace;font-size:9px;line-height:1.4;color:var(--text-dim);white-space:nowrap}.status-state b{display:block;color:var(--text);font-size:9px}.status-row[data-state="healthy"] .status-state b{color:var(--live-soft)}.status-row[data-state="degraded"] .status-state b{color:var(--led)}.status-row[data-state="down"] .status-state b{color:var(--warn-soft)}
  @media(max-width:420px){.settings-heading{column-gap:8px}.settings-tab{padding-left:7px;padding-right:7px}.status-row{grid-template-columns:auto minmax(0,1fr)}.status-state{grid-column:2;text-align:left;display:flex;gap:7px;align-items:center}.status-state b{display:inline}.status-overview-actions{align-items:flex-start;flex-direction:column}.status-refresh{width:100%}}
  `;document.head.appendChild(style);
}
function installUi(){
  const tabs=document.querySelector('.settings-tabs'),body=document.querySelector('.settings-body');
  if(!tabs||!body)return false;
  if(!$('statusTab')){
    const tab=document.createElement('button');tab.className='settings-tab';tab.id='statusTab';tab.type='button';tab.setAttribute('role','tab');tab.setAttribute('aria-selected','false');tab.setAttribute('aria-controls','statusPanel');tab.textContent='Status';tabs.appendChild(tab);
  }
  if(!$('statusPanel')){
    const panel=document.createElement('section');panel.className='settings-panel';panel.id='statusPanel';panel.hidden=true;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','statusTab');panel.setAttribute('aria-live','polite');
    panel.innerHTML='<div class="pad"><div class="status-switchboard"><div class="status-overview" id="statusOverview" data-state="checking"><div class="status-overview-head"><i class="status-overview-led"></i><strong id="statusOverallLabel">Checking Kerbside services</strong></div><p class="status-overview-summary" id="statusOverallSummary">The switchboard checks Kerbside infrastructure, transport feeds, prediction sources and mapping dependencies.</p><div class="status-overview-actions"><span id="statusCheckedAt">Not checked yet</span><button class="status-refresh" id="statusRefresh" type="button">Check again</button></div></div><p class="status-note">Checks run only when this tab is opened or you press Check again. The 24-hour reliability figures are local samples from checks made on this device, not continuous central monitoring. Kerbside never exposes API keys. Authenticated third-party feeds are checked through the same Workers or published build outputs the app already uses.</p><div id="statusGroups"></div></div></div>';
    body.appendChild(panel);
  }
  return true;
}
function renderSkeleton(definitions){
  const root=$('statusGroups');if(!root)return;
  const categories=[...new Set(definitions.map(source=>source.category))];
  root.innerHTML='';
  for(const category of categories){
    const section=document.createElement('section');section.className='status-group';
    const heading=document.createElement('h3');heading.textContent=category;section.appendChild(heading);
    const list=document.createElement('div');list.className='status-list';
    for(const source of definitions.filter(item=>item.category===category)){
      const row=document.createElement('div');row.className='status-row';row.dataset.statusId=source.id;row.dataset.state='checking';
      const led=document.createElement('i');led.className='status-led';
      const copy=document.createElement('div');copy.className='status-copy';
      const name=document.createElement('b');name.textContent=source.name;const description=document.createElement('span');description.className='status-description';description.textContent=source.description;const detail=document.createElement('span');detail.className='status-detail';detail.textContent='Waiting to check…';const history=document.createElement('span');history.className='status-history';history.textContent=historyText(source.id);copy.append(name,description,detail,history);
      const status=document.createElement('span');status.className='status-state';status.innerHTML='<b>Checking</b><span></span>';
      row.append(led,copy,status);list.appendChild(row);
    }
    section.appendChild(list);root.appendChild(section);
  }
}
function renderResult(value){
  const row=document.querySelector(`[data-status-id="${value.id}"]`);if(!row)return;row.dataset.state=value.status;
  const detail=row.querySelector('.status-detail');if(detail)detail.textContent=value.detail||'';const history=row.querySelector('.status-history');if(history)history.textContent=historyText(value.id);
  const box=row.querySelector('.status-state'),strong=box&&box.querySelector('b'),small=box&&box.querySelector('span');if(strong)strong.textContent=value.label||labelFor[value.status]||value.status;if(small)small.textContent=value.latency!=null?formatLatency(value.latency):'';
}
function renderOverall(definitions){
  const values=definitions.map(source=>state.results.get(source.id)).filter(Boolean),overall=overallState(values),overview=$('statusOverview');if(overview)overview.dataset.state=overall.status;
  const label=$('statusOverallLabel');if(label)label.textContent=overall.label;
  const summary=$('statusOverallSummary');if(summary){const down=values.filter(v=>v.status==='down'),degraded=values.filter(v=>v.status==='degraded');summary.textContent=down.length||degraded.length?`${down.length} down · ${degraded.length} degraded · ${values.length-down.length-degraded.length} healthy/ready.`:`${values.length} services and local dependencies checked.`;}
  const checked=$('statusCheckedAt');if(checked)checked.textContent=state.lastChecked?`Last checked ${new Date(state.lastChecked).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:'Checking now…';
}
async function refresh({force=false}={}){
  const definitions=sourceDefinitions();
  if(state.inFlight)return false;
  if(!force&&state.lastChecked&&now()-state.lastChecked<REFRESH_CACHE_MS){renderOverall(definitions);return true;}
  state.inFlight=true;state.results.clear();renderSkeleton(definitions);renderOverall(definitions);const button=$('statusRefresh');if(button){button.disabled=true;button.textContent='Checking…';}
  const context={};
  await runPool(definitions,async source=>{
    let value;try{value=await source.probe(source,context);}catch(error){value=sourceError(source,error);}
    state.results.set(source.id,value);recordHistory(value);renderResult(value);renderOverall(definitions);return value;
  },5);
  saveHistory();state.lastChecked=now();state.inFlight=false;if(button){button.disabled=false;button.textContent='Check again';}renderOverall(definitions);return true;
}
function deactivate(){const tab=$('statusTab'),panel=$('statusPanel');if(tab)tab.setAttribute('aria-selected','false');if(panel)panel.hidden=true;}
function activate(){
  if(!$('statusPanel'))return;
  for(const id of ['dataTab','statsTab']){const tab=$(id);if(tab)tab.setAttribute('aria-selected','false');}
  for(const id of ['dataPanel','statsPanel']){const panel=$(id);if(panel)panel.hidden=true;}
  $('statusTab').setAttribute('aria-selected','true');$('statusPanel').hidden=false;refresh({force:false});
}
function bind(){
  $('statusTab').addEventListener('click',activate);
  $('statusRefresh').addEventListener('click',()=>refresh({force:true}));
  for(const id of ['dataTab','statsTab','setBtn']){const el=$(id);if(el)el.addEventListener('click',deactivate);}
}
function install(){if(state.installed)return true;if(!state.history)state.history=readHistory();installStyles();if(!installUi())return false;const definitions=sourceDefinitions();renderSkeleton(definitions);renderOverall(definitions);bind();state.installed=true;return true;}
function init(){if(!install())setTimeout(init,50);}

window.__KERBSIDE_STATUS_SWITCHBOARD__={version:VERSION,state,SOURCE_META,coverageHealth,overallState,liveRailProbeState,historySummary,recordHistory,sourceDefinitions,refresh,install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
