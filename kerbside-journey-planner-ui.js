(function(){
'use strict';

/* Station autocomplete data layer.

   The Darwin timetable refresh already publishes a compact locations.json
   beside the browser timetable. Use that same official reference data for
   station name / CRS autocomplete instead of depending on a live provider for
   every keystroke. The existing journey planner is loaded immediately after
   this wrapper, so it captures this fetch layer as its upstream transport.

   If the local reference file cannot be loaded, /crs requests simply fall
   through to the existing Huxley provider chain. Live departure/service calls
   are never intercepted here. */
const LOCAL_STATIONS_URL='kerbside-rail-timetable/locations.json';
const PLANNER_CORE_URL='kerbside-journey-planner-core.js?v=0.9.4';
const RAIL_HEALTH_URL='kerbside-rail-health.js?v=0.9.4';
const PROVIDERS=new Set([
  'https://huxley2.azurewebsites.net',
  'https://hux.azurewebsites.net'
]);
const NON_RAIL_SUFFIX=/\((?:bus|coach|ferry)\)\s*$/i;
const NON_RAIL_TOC=new Set(['ZB','ZF']);
const upstreamFetch=window.fetch.bind(window);
const stationState={source:'idle',count:0,searches:0,fallbacks:0,error:''};
let stationRows=null;
let stationRowsPromise=null;

function notifyStationState(){
  if(typeof document==='undefined'||typeof CustomEvent!=='function')return;
  document.dispatchEvent(new CustomEvent('kerbside:station-data',{detail:{...stationState}}));
}
function requestUrl(input){
  try{
    const raw=typeof input==='string'||input instanceof URL?String(input):input&&input.url;
    return raw?new URL(raw,location.href):null;
  }catch(error){return null;}
}
function stationQuery(url){
  if(!url||!PROVIDERS.has(url.origin))return'';
  const match=decodeURIComponent(url.pathname).match(/^\/crs\/(.+?)\/?$/i);
  const value=match?String(match[1]||'').trim():'';
  return value.length>=2?value:'';
}
function normalise(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ');}
function parseLocations(json){
  if(!json||typeof json!=='object'||Array.isArray(json))return[];
  return Object.entries(json).map(([crs,row])=>{
    const values=Array.isArray(row)?row:[];
    return {
      name:String(values[0]||'').trim(),
      crs:String(crs||'').trim().toUpperCase(),
      toc:String(values[2]||'').trim().toUpperCase()
    };
  }).filter(station=>
    station.name&&/^[A-Z0-9]{3}$/.test(station.crs)&&
    !NON_RAIL_TOC.has(station.toc)&&!NON_RAIL_SUFFIX.test(station.name)
  );
}
function score(station,query){
  const q=normalise(query),code=String(query||'').trim().toUpperCase(),name=normalise(station&&station.name);
  if(!q||!station)return Number.POSITIVE_INFINITY;
  if(station.crs===code)return 0;
  if(code.length<=3&&station.crs.startsWith(code))return 1;
  if(name===q)return 2;
  if(name.startsWith(q))return 3;
  if(name.split(' ').some(word=>word.startsWith(q)))return 4;
  const compactName=name.replace(/[^a-z0-9]/g,''),compactQuery=q.replace(/[^a-z0-9]/g,'');
  if(compactQuery&&compactName.includes(compactQuery))return 5;
  if(name.includes(q))return 6;
  return Number.POSITIVE_INFINITY;
}
function search(rows,query,limit=24){
  return (Array.isArray(rows)?rows:[])
    .map(station=>({station,score:score(station,query)}))
    .filter(item=>Number.isFinite(item.score))
    .sort((a,b)=>a.score-b.score||a.station.name.length-b.station.name.length||a.station.name.localeCompare(b.station.name)||a.station.crs.localeCompare(b.station.crs))
    .slice(0,Math.max(1,Number(limit)||24))
    .map(({station})=>({stationName:station.name,crsCode:station.crs}));
}
function abortError(){
  if(typeof DOMException==='function')return new DOMException('Aborted','AbortError');
  const error=new Error('Aborted');error.name='AbortError';return error;
}
function throwIfAborted(init){if(init&&init.signal&&init.signal.aborted)throw abortError();}
function loadStations(){
  if(stationRows)return Promise.resolve(stationRows);
  if(stationRowsPromise)return stationRowsPromise;
  stationState.source='loading';stationState.error='';notifyStationState();
  stationRowsPromise=upstreamFetch(LOCAL_STATIONS_URL,{headers:{Accept:'application/json'}})
    .then(response=>{
      if(!response||!response.ok)throw new Error(`Local station data returned ${response?response.status:'no response'}`);
      return response.json();
    })
    .then(json=>{
      const rows=parseLocations(json);
      if(!rows.length)throw new Error('Local station data contained no National Rail stations');
      stationRows=rows;stationState.source='local';stationState.count=rows.length;stationState.error='';notifyStationState();
      return rows;
    })
    .catch(error=>{
      stationRowsPromise=null;stationState.source='fallback';stationState.error=error&&error.message?error.message:'unavailable';notifyStationState();
      throw error;
    });
  return stationRowsPromise;
}
async function stationDataFetch(input,init){
  const url=requestUrl(input),query=stationQuery(url);
  if(!query)return upstreamFetch(input,init);
  try{
    throwIfAborted(init);
    const rows=await loadStations();
    throwIfAborted(init);
    stationState.source='local';stationState.searches++;stationState.error='';notifyStationState();
    return new Response(JSON.stringify(search(rows,query)),{
      status:200,
      headers:{'Content-Type':'application/json; charset=utf-8','X-Kerbside-Station-Source':'darwin-local'}
    });
  }catch(error){
    if(error&&error.name==='AbortError')throw error;
    stationState.source='fallback';stationState.fallbacks++;stationState.error=error&&error.message?error.message:'unavailable';notifyStationState();
    return upstreamFetch(input,init);
  }
}

window.fetch=stationDataFetch;
window.__KERBSIDE_STATION_DATA__={state:stationState,load:loadStations,search,parseLocations};
loadStations().catch(()=>{});

/* Keep the established planner implementation byte-for-byte in a separate
   local file. It loads through this wrapper, captures stationDataFetch as its
   upstream fetch, and otherwise behaves exactly as before. */
const core=document.createElement('script');
core.src=PLANNER_CORE_URL;
core.async=false;
core.onerror=()=>{stationState.error='Journey planner core failed to load';notifyStationState();};
(document.head||document.documentElement).appendChild(core);

/* Rail health is deliberately separate from the planner. Loading it here keeps
   bus.html stable while still making the runtime health object available to
   the Status tab and to diagnostics in the console. */
const health=document.createElement('script');
health.src=RAIL_HEALTH_URL;
health.async=false;
(document.head||document.documentElement).appendChild(health);

})();
