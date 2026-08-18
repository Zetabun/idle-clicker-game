(function(){
'use strict';

/* Station autocomplete and hosted rail bridge.

   The Darwin timetable refresh already publishes a compact locations.json
   beside the browser timetable. Use that same official reference data for
   station name / CRS autocomplete instead of depending on a live provider for
   every keystroke. The existing journey planner is loaded immediately after
   this wrapper, so it captures this fetch layer as its upstream transport.

   GitHub Pages cannot call the community Huxley endpoints directly because
   they do not return CORS headers. On the hosted app, departure-board requests
   are therefore kept on Kerbside's official Rail Data Marketplace Worker when
   the selected date is today. Advance dates belong to the local timetable and
   are rejected here before the browser can make a noisy, doomed Huxley call. */
const LOCAL_STATIONS_URL='kerbside-rail-timetable/locations.json';
const LOCAL_STATION_TIMEOUT_MS=10000;
const OFFICIAL_RAIL_URL='https://kerbside-rail.adambullas.workers.dev';
const HOSTED_RAIL_HOSTS=new Set(['zetabun.github.io']);
const PLANNER_CORE_URL='kerbside-journey-planner-core.js?v=0.9.52';
const SAVED_POLISH_URL='kerbside-saved-journeys-polish.js?v=0.9.52';
const RAIL_HEALTH_URL='kerbside-rail-health.js?v=0.9.52';
const TRAIN_MOVEMENT_URL='kerbside-train-movement.js?v=0.9.52';
const UI_GUARD_STYLE_ID='kerbsideTrainUiGuards';
const PROVIDERS=new Set([
  'https://huxley2.azurewebsites.net',
  'https://hux.azurewebsites.net'
]);
const NON_RAIL_SUFFIX=/\((?:bus|coach|ferry)\)\s*$/i;
const NON_RAIL_TOC=new Set(['ZB','ZF']);
const upstreamFetch=window.fetch.bind(window);
const stationState={source:'idle',count:0,searches:0,fallbacks:0,error:'',hostedRailBridges:0,blockedFutureCalls:0};
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
function departureRequest(url){
  if(!url||!PROVIDERS.has(url.origin))return null;
  const match=decodeURIComponent(url.pathname).match(/^\/departures\/([A-Za-z0-9]{3})(?:\/to\/([A-Za-z0-9]{3}))?\/(\d+)\/?$/i);
  return match?{from:match[1].toUpperCase(),to:match[2]?match[2].toUpperCase():'',rows:match[3]}:null;
}
function hostedRailBridgeEnabled(hostname=typeof location==='undefined'?'':location.hostname){
  return HOSTED_RAIL_HOSTS.has(String(hostname||'').toLowerCase());
}
function trainDateIsToday(){
  const api=window.__KERBSIDE_TRAIN_DATE__;
  return !api||typeof api.isToday!=='function'||api.isToday();
}
function hostedRailUrl(url){
  const request=departureRequest(url);if(!request)return null;
  const path=request.to&&request.to!==request.from
    ? `/departures/${encodeURIComponent(request.from)}/to/${encodeURIComponent(request.to)}/${encodeURIComponent(request.rows)}`
    : `/departures/${encodeURIComponent(request.from)}/${encodeURIComponent(request.rows)}`;
  const official=new URL(path,OFFICIAL_RAIL_URL);
  ['expand','timeOffset','timeWindow'].forEach(name=>{
    if(url.searchParams.has(name))official.searchParams.set(name,url.searchParams.get(name));
  });
  return official;
}
function futureTimetableResponse(request){
  stationState.blockedFutureCalls++;notifyStationState();
  return new Response(JSON.stringify({
    error:'Advance-date departures are supplied by Kerbside timetable data, not a live browser provider.',
    from:request&&request.from||'',
    to:request&&request.to||'',
    retryable:false
  }),{
    status:409,
    headers:{'Content-Type':'application/json; charset=utf-8','X-Kerbside-Rail-Source':'advance-timetable'}
  });
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
async function fetchLocalStations(){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),LOCAL_STATION_TIMEOUT_MS);
  try{
    const response=await upstreamFetch(LOCAL_STATIONS_URL,{headers:{Accept:'application/json'},signal:controller.signal});
    if(!response||!response.ok)throw new Error(`Local station data returned ${response?response.status:'no response'}`);
    const bytes=await response.arrayBuffer();
    return JSON.parse(new TextDecoder().decode(bytes));
  }catch(error){
    if(error&&error.name==='AbortError')throw new Error('Local station data timed out');
    throw error;
  }finally{clearTimeout(timer);}
}
function loadStations(){
  if(stationRows)return Promise.resolve(stationRows);
  if(stationRowsPromise)return stationRowsPromise;
  stationState.source='loading';stationState.error='';notifyStationState();
  stationRowsPromise=fetchLocalStations()
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
  const url=requestUrl(input),query=stationQuery(url),departure=departureRequest(url);
  if(departure&&hostedRailBridgeEnabled()){
    throwIfAborted(init);
    if(!trainDateIsToday())return futureTimetableResponse(departure);
    const official=hostedRailUrl(url);
    stationState.hostedRailBridges++;notifyStationState();
    /* Bridging to the official Worker rebuilt the call from the URL alone. When
       the caller passed a Request rather than (url,init) - which is what an
       abortable board refresh does - init is undefined, so the abort signal and
       headers were dropped and cancelling a board left its bridged request
       running. Carry the original Request across instead. */
    if(typeof Request!=='undefined'&&input instanceof Request&&!init){
      return upstreamFetch(new Request(official.toString(),input));
    }
    return upstreamFetch(official.toString(),init);
  }
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

function installUiGuardStyles(){
  if(document.getElementById(UI_GUARD_STYLE_ID))return;
  const style=document.createElement('style');
  style.id=UI_GUARD_STYLE_ID;
  style.textContent=`
body:not(.theme-crystal) input[type="date"]::-webkit-calendar-picker-indicator,body:not(.theme-crystal) input[type="time"]::-webkit-calendar-picker-indicator{filter:invert(1) brightness(1.45);opacity:.95}
body.theme-crystal input[type="date"]::-webkit-calendar-picker-indicator,body.theme-crystal input[type="time"]::-webkit-calendar-picker-indicator{filter:none;opacity:.78}
/* Alternate train views own the train content surface while their tab is
   active. Timetable/live modules may keep refreshing in the background, but
   they must not be able to unhide the ordinary departure board over planner
   or Saved journeys content. */
.train-sidebar.plan-view-active > :not(#trainViewTabs):not(#planJourneyForm){display:none!important}
.train-content.plan-view-active > :not(#planJourneySurface){display:none!important}
.train-sidebar.saved-view-active > :not(#trainViewTabs):not(#savedJourneySidebar){display:none!important}
.train-content.saved-view-active > :not(#savedJourneySurface){display:none!important}
@media(min-width:821px){
  body[data-transport="train"] .train-sidebar{overflow-anchor:none}
  body[data-transport="train"] .train-sidebar>.train-view-tabs{
    position:sticky;top:0;z-index:1705;
    box-shadow:0 8px 18px rgb(var(--shadow-rgb) / .14);
  }
}
`;
  (document.head||document.documentElement).appendChild(style);
}
function resetTrainSidebarScroll(){
  const sidebar=document.querySelector('.train-sidebar');
  if(sidebar&&window.innerWidth>820)sidebar.scrollTop=0;
}
let planViewGuardObserver=null;
let planViewBootstrapObserver=null;
function syncPlanViewGuards(){
  const tabs=document.getElementById('trainViewTabs');
  const planButton=tabs&&tabs.querySelector('[data-train-view="plan"]');
  const savedButton=tabs&&tabs.querySelector('[data-train-view="saved"]');
  const planActive=!!(planButton&&planButton.getAttribute('aria-selected')==='true');
  const savedActive=!!(savedButton&&savedButton.getAttribute('aria-selected')==='true');
  const sidebar=document.querySelector('.train-sidebar');
  const content=document.querySelector('.train-content');
  if(sidebar){sidebar.classList.toggle('plan-view-active',planActive);sidebar.classList.toggle('saved-view-active',savedActive);}
  if(content){content.classList.toggle('plan-view-active',planActive);content.classList.toggle('saved-view-active',savedActive);}
  return planActive||savedActive;
}
function installPlanViewGuardObserver(){
  const tabs=document.getElementById('trainViewTabs');
  if(!tabs)return false;
  if(planViewBootstrapObserver){planViewBootstrapObserver.disconnect();planViewBootstrapObserver=null;}
  if(planViewGuardObserver)planViewGuardObserver.disconnect();
  planViewGuardObserver=new MutationObserver(()=>syncPlanViewGuards());
  planViewGuardObserver.observe(tabs,{subtree:true,attributes:true,attributeFilter:['aria-selected']});
  syncPlanViewGuards();
  return true;
}
function watchPlanViewGuards(){
  if(installPlanViewGuardObserver())return;
  if(planViewBootstrapObserver)return;
  planViewBootstrapObserver=new MutationObserver(()=>{if(installPlanViewGuardObserver())planViewBootstrapObserver=null;});
  planViewBootstrapObserver.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{
    if(planViewBootstrapObserver){planViewBootstrapObserver.disconnect();planViewBootstrapObserver=null;}
  },15000);
}
function restoreBaseTrainView(){
  const tabs=document.getElementById('trainViewTabs'),trainButton=tabs&&tabs.querySelector('[data-train-view="trains"]');
  const plannerApi=window.__KERBSIDE_JOURNEY_PLANNER__,savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__;
  if(!tabs||!trainButton||trainButton.getAttribute('aria-selected')!=='true')return false;
  if(plannerApi&&plannerApi.planState&&plannerApi.planState.active)return false;
  if(savedApi&&savedApi.state&&savedApi.state.active)return false;
  const sidebar=document.querySelector('.train-sidebar');
  if(!sidebar)return false;
  for(const child of [...sidebar.children]){
    if(child===tabs){child.hidden=false;continue;}
    if(child.id==='planJourneyForm'||child.id==='savedJourneySidebar'){child.hidden=true;continue;}
    child.hidden=false;
  }
  const content=document.querySelector('.train-content');
  if(content){
    const planSurface=document.getElementById('planJourneySurface'),savedSurface=document.getElementById('savedJourneySurface');
    if(planSurface)planSurface.hidden=true;
    if(savedSurface)savedSurface.hidden=true;
    const head=content.querySelector(':scope > .train-board-head'),legend=content.querySelector(':scope > .train-legend');
    if(head)head.hidden=false;
    if(legend)legend.hidden=false;
  }
  const alerts=document.getElementById('trainAlerts');
  if(alerts)alerts.hidden=!String(alerts.innerHTML||'').trim();
  resetTrainSidebarScroll();
  const settleScroll=()=>resetTrainSidebarScroll();
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{settleScroll();requestAnimationFrame(settleScroll);});
  setTimeout(()=>{window.__KERBSIDE_TRAIN_TIMETABLE__?.sync?.();settleScroll();},0);
  return true;
}
function installUiGuards(){
  installUiGuardStyles();
  document.addEventListener('click',event=>{
    const view=event.target&&event.target.closest&&event.target.closest('[data-train-view]');
    if(!view)return;
    setTimeout(()=>{
      resetTrainSidebarScroll();
      if(view.dataset.trainView==='trains')restoreBaseTrainView();
      syncPlanViewGuards();
    },0);
  },true);
  const settle=()=>setTimeout(()=>{resetTrainSidebarScroll();restoreBaseTrainView();watchPlanViewGuards();syncPlanViewGuards();},0);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',settle,{once:true});else settle();
}

window.fetch=stationDataFetch;
window.__KERBSIDE_STATION_DATA__={
  state:stationState,load:loadStations,search,parseLocations,
  hostedRailBridgeEnabled,departureRequest,hostedRailUrl,trainDateIsToday,
  restoreBaseTrainView,resetTrainSidebarScroll
};
installUiGuards();
loadStations().catch(()=>{});

/* Keep the established planner implementation byte-for-byte in a separate
   local file. It loads through this wrapper, captures stationDataFetch as its
   upstream fetch, and otherwise behaves exactly as before. */
const core=document.createElement('script');
core.src=PLANNER_CORE_URL;
core.async=false;
core.onerror=()=>{stationState.error='Journey planner core failed to load';notifyStationState();};
core.addEventListener('load',()=>{
  const polish=document.createElement('script');
  polish.src=SAVED_POLISH_URL;
  polish.async=false;
  polish.onerror=()=>{stationState.error='Saved Journeys polish failed to load';notifyStationState();};
  polish.addEventListener('load',()=>{
    setTimeout(()=>{resetTrainSidebarScroll();restoreBaseTrainView();watchPlanViewGuards();syncPlanViewGuards();},0);
    const movement=document.createElement('script');
    movement.src=TRAIN_MOVEMENT_URL;
    movement.async=false;
    movement.onerror=()=>{console.warn('Network Rail movement overlay failed to load; timetable and Darwin remain available.');};
    (document.head||document.documentElement).appendChild(movement);
  },{once:true});
  (document.head||document.documentElement).appendChild(polish);
},{once:true});
(document.head||document.documentElement).appendChild(core);

/* Rail health is deliberately separate from the planner. Loading it here keeps
   bus.html stable while still making the runtime health object available to
   the Status tab and to diagnostics in the console. */
const health=document.createElement('script');
health.src=RAIL_HEALTH_URL;
health.async=false;
(document.head||document.documentElement).appendChild(health);

})();
