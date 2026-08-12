(function(){
'use strict';

const $=id=>document.getElementById(id);
const STORE='kerbside.rail.depart-after.v1';
const PROVIDERS=[
  'https://huxley2.azurewebsites.net',
  'https://hux.azurewebsites.net'
];
const REQUEST_TIMEOUT_MS=10000;
const SEARCH_DELAY_MS=240;
const previousFetch=window.fetch.bind(window);
const providerState={active:PROVIDERS[0],lastFailure:'',fallbacks:0};
let fromTimer=null,toTimer=null,fromAbort=null,toAbort=null;

function requestUrl(input){
  try{
    const raw=typeof input==='string'||input instanceof URL?String(input):input&&input.url;
    return raw?new URL(raw,location.href):null;
  }catch(e){return null;}
}
function isRailProvider(url){return !!url&&PROVIDERS.includes(url.origin);}
function routeAwarePath(url){
  let path=url.pathname;
  const match=decodeURIComponent(path).match(/^\/departures\/([A-Za-z0-9]{3})\/(\d+)\/?$/i);
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  const destination=route&&route.state&&route.state.destination;
  if(match&&destination&&destination.crs&&destination.crs.toUpperCase()!==match[1].toUpperCase()){
    path=`/departures/${encodeURIComponent(match[1].toUpperCase())}/to/${encodeURIComponent(destination.crs.toUpperCase())}/${encodeURIComponent(match[2])}`;
  }
  return path+url.search;
}
function providerCandidates(url){
  const path=routeAwarePath(url);
  const ordered=[url.origin,...PROVIDERS.filter(origin=>origin!==url.origin)];
  return ordered.map(origin=>origin+path);
}
async function fetchAttempt(url,init){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  const outer=init&&init.signal;
  let detach=null;
  if(outer){
    const abort=()=>controller.abort();
    if(outer.aborted) abort();
    else{outer.addEventListener('abort',abort,{once:true});detach=()=>outer.removeEventListener('abort',abort);}
  }
  try{
    return await previousFetch(url,{...(init||{}),signal:controller.signal});
  }finally{
    clearTimeout(timeout);
    if(detach) detach();
  }
}
async function resilientRailFetch(input,init){
  const url=requestUrl(input);
  if(!isRailProvider(url)) return previousFetch(input,init);
  let lastError=null;
  const candidates=providerCandidates(url);
  for(let index=0;index<candidates.length;index++){
    try{
      const response=await fetchAttempt(candidates[index],init);
      if(response.ok || (response.status<500&&response.status!==408&&response.status!==429)){
        providerState.active=new URL(candidates[index]).origin;
        if(index>0) providerState.fallbacks++;
        providerState.lastFailure='';
        return response;
      }
      lastError=new Error(`Rail provider returned ${response.status}`);
    }catch(error){
      if(error&&error.name==='AbortError'&&init&&init.signal&&init.signal.aborted) throw error;
      lastError=error;
    }
  }
  providerState.lastFailure=lastError&&lastError.message?lastError.message:'unavailable';
  throw new Error('Live rail providers are temporarily unavailable. Please retry in a moment.');
}
window.fetch=resilientRailFetch;
window.__KERBSIDE_RAIL_PROVIDER__={state:providerState,providers:[...PROVIDERS],fetch:resilientRailFetch};

/* ------------------------------------------------------------------
   Styles.

   Every colour resolves against tokens actually declared in bus.html
   (--ink-2 / --ink-3 / --rule / --led / --text / --text-dim /
   --text-faint / --warn / --on-accent), so both the amber night theme
   and the light Crystal theme recolour the planner without a second
   rule. The previous sheet reached for --border and --panel, which are
   declared nowhere: every shorthand containing them was invalid at
   computed-value time, so the planner rendered with no background, no
   border, no connector line and no ring on the route dots.

   Geometry is a three-column grid rather than hardcoded pixel offsets,
   so the markers stay aligned when the webfont lands late, when a
   station name wraps, or when browser text size is increased.
------------------------------------------------------------------ */
function installStyles(){
  if($('kerbsideJourneyPlannerStyles'))return;
  const s=document.createElement('style');
  s.id='kerbsideJourneyPlannerStyles';
  s.textContent=`
.train-planner{display:flex;flex-direction:column;gap:10px;margin:4px 0 14px}

.train-card{
  padding:14px;border:1px solid var(--rule);border-radius:var(--radius-lg,16px);
  background:var(--ink-3);box-shadow:0 6px 18px rgb(var(--shadow-rgb) / .10);
}
.train-card-title{margin:0 0 11px;color:var(--text);font-size:14px;font-weight:800;letter-spacing:-.015em}

/* The planner adopts the two search wraps built by trains.js and
   train-routes.js, so neutralise their sidebar spacing and reduce their
   visible labels to assistive text. The marker, the placeholder and the
   card title already say which field is which. */
.train-card .train-search-wrap{margin:0;min-width:0}
.train-card .train-search-wrap>label{
  position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;
  overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;
}
.train-card .train-search-box{display:block}
.train-card .train-search-box input{width:100%}
/* Per-field Find buttons are redundant beside one Find trains action.
   Keep them in the DOM (other modules click them) but out of the
   layout, the tab order and the accessibility tree. */
.train-card #trainStationGo,
.train-card #trainDestinationGo{
  position:absolute!important;right:0!important;bottom:0!important;
  width:1px!important;height:1px!important;padding:0!important;border:0!important;
  opacity:0!important;overflow:hidden!important;white-space:nowrap!important;pointer-events:none!important;
}

/* ---- Where ---- */
.train-where-grid{display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center}
.train-where-marker{justify-self:center;width:13px;height:13px;border-radius:50%;box-sizing:border-box}
.train-where-marker.from{border:3px solid var(--led);background:transparent}
.train-where-marker.to{border:3px solid var(--led);background:var(--led)}
.train-where-link{
  justify-self:center;width:2px;height:16px;
  background:repeating-linear-gradient(var(--text-faint) 0 2px,transparent 2px 6px);
}
.train-where-gap{height:16px}
.train-where-swap{
  justify-self:center;display:grid;place-items:center;width:40px;height:40px;
  margin-left:4px;border-radius:50%;color:var(--text);background:transparent;
  transition:background .12s,color .12s;
}
.train-where-swap svg{display:block;width:19px;height:19px}
.train-where-swap:hover{color:var(--led);background:rgb(var(--led-rgb) / .10)}
.train-where-swap:disabled{opacity:.4;cursor:default}
.train-where-swap:disabled:hover{color:var(--text);background:transparent}

/* 16px is not a taste call: iOS Safari zooms the whole layout viewport
   when a focused input is under 16px, which is the "everything jumps
   and I can't get back" behaviour on the phone. */
.train-card .train-search-box input,
.train-card .train-date-row input,
.train-planner-time input{font-size:16px!important}

.train-where-grid .train-search-box input{
  padding:13px 12px;border:1px solid var(--rule);border-radius:12px;
  background:var(--ink-2);color:var(--text);font-weight:700;line-height:1.25;
}
.train-where-grid .train-search-box input::placeholder{font-weight:500;color:var(--text-faint)}
.train-where-grid .train-search-box input:focus{
  border-color:var(--led);outline:2px solid rgb(var(--led-rgb) / .18);outline-offset:1px;
}

/* ---- When ---- */
.train-when-grid{display:grid;gap:9px}
.train-card .train-date-wrap{margin:0!important;padding:0!important;border-top:0!important}
.train-card .train-date-row{grid-template-columns:minmax(0,1fr) auto!important;gap:9px!important}
.train-card .train-date-row input{
  padding:12px;border:1px solid var(--rule);border-radius:12px;
  background:var(--ink-2);color:var(--text);font-weight:600;
}
.train-card .train-date-today{
  padding:0 15px!important;border:1px solid var(--rule);border-radius:12px!important;
  background:var(--ink-2);color:var(--text);font-size:13px;font-weight:700;white-space:nowrap;
}
.train-card .train-date-today:hover{border-color:var(--led);color:var(--led)}
.train-card .train-date-meta{margin-top:0!important;padding:0 2px}
.train-planner-time{
  display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;
  margin:0;color:var(--text-dim);font-size:12px;
}
.train-planner-time>span{padding-left:2px}
.train-planner-time input{
  width:100%;padding:12px;border:1px solid var(--rule);border-radius:12px;
  background:var(--ink-2);color:var(--text);font-weight:600;
}

/* ---- Action ---- */
.train-journey-go{
  width:100%;min-height:50px;border:1px solid var(--led)!important;border-radius:14px!important;
  background:var(--led)!important;color:var(--on-accent)!important;
  font-size:15px!important;font-weight:800!important;letter-spacing:.01em;
  transition:filter .12s;
}
.train-journey-go:hover:not([disabled]){filter:brightness(1.06)}
.train-journey-go[disabled]{opacity:.62;cursor:wait}
.train-planner-message{min-height:16px;padding:0 2px;color:var(--text-dim);font-size:11.5px;line-height:1.45}
.train-planner-message:empty{display:none}
.train-planner-message.error{color:var(--warn)}
.train-planner-foot{display:flex;justify-content:flex-start;padding:0 2px}
.train-planner-foot .train-destination-clear{margin:0!important;font-size:11.5px!important}
.train-planner-foot:empty{display:none}

/* Suggestion lists must clear the card, and on desktop the sidebar is
   the scroll container, so raise them above both. */
.train-card .train-suggest{top:calc(100% + 6px);z-index:1800}

.train-future-card{
  align-content:center;justify-items:center;gap:8px!important;min-height:180px!important;
  margin:8px 4px;padding:24px!important;border:1px solid var(--rule);border-radius:16px;background:var(--ink-2);
}
.train-future-badge{
  display:inline-flex!important;max-width:none!important;padding:4px 9px;
  border:1px solid rgb(var(--led-rgb) / .32);border-radius:999px;
  color:var(--led)!important;background:rgb(var(--led-rgb) / .07);
  font-family:'Martian Mono',ui-monospace,monospace;font-size:9px!important;font-weight:700;
  letter-spacing:.08em;text-transform:uppercase;
}
.train-future-route{max-width:42rem!important;color:var(--text)!important;font-size:12px!important;font-weight:700}
.train-future-note{max-width:38rem!important}

@media(max-width:820px){
  body[data-transport="train"] #topbar{
    display:flex!important;align-items:center!important;flex-wrap:nowrap!important;gap:8px!important;
    min-height:calc(62px + env(safe-area-inset-top))!important;
    padding:calc(8px + env(safe-area-inset-top)) 10px 8px!important;
  }
  body[data-transport="train"] #topbar .brand{min-width:0!important;margin:0 auto 0 0!important}
  body[data-transport="train"] #topbar .transport-switch{position:static!important;inset:auto!important;margin:0!important;flex:0 0 auto!important}
  body[data-transport="train"] #topbar #setBtn{position:static!important;margin:0!important;flex:0 0 auto!important}
  body[data-transport="train"] .train-sidebar{padding:9px 10px 8px!important}
  body[data-transport="train"] .train-sidebar>.train-kicker{margin:0 2px 6px}
  .train-planner{gap:8px;margin:2px 0 6px}
  .train-card{padding:11px;border-radius:15px;box-shadow:none}
  .train-card-title{margin-bottom:9px;font-size:13px}
  .train-where-grid .train-search-box input{padding:12px 11px}
  .train-card .train-date-row input,.train-planner-time input{padding:11px}
  .train-journey-go{min-height:48px;font-size:14px!important}
  .train-future-card{min-height:150px!important;margin:6px 2px;padding:20px 16px!important}
}
@media(max-width:430px){
  body[data-transport="train"] #topbar .brand{margin-right:auto!important}
  body[data-transport="train"] #topbar .transport-switch button{min-height:36px!important;padding:6px 8px!important}
  .train-where-grid{grid-template-columns:22px minmax(0,1fr) auto}
  .train-where-swap{width:38px;height:38px;margin-left:2px}
  .train-planner-time{grid-template-columns:auto minmax(0,1fr)}
  .train-planner-time input{justify-self:end;max-width:150px}
}
@media(prefers-reduced-motion:reduce){
  .train-where-swap,.train-journey-go{transition:none!important}
}
`;
  document.head.appendChild(s);
}

function storedTime(){try{return localStorage.getItem(STORE)||'09:00'}catch(e){return'09:00'}}
function saveTime(v){try{localStorage.setItem(STORE,v)}catch(e){}}
function dispatch(){
  const date=window.__KERBSIDE_TRAIN_DATE__&&window.__KERBSIDE_TRAIN_DATE__.state&&window.__KERBSIDE_TRAIN_DATE__.state.date||'';
  window.dispatchEvent(new CustomEvent('kerbside:journey-planner-change',{detail:{departAfter:$('trainDepartAfter')?.value||'',date}}));
  window.__KERBSIDE_FORECAST_V3__?.apply?.();
}
function normalise(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ')}
function dateApi(){return window.__KERBSIDE_TRAIN_DATE__||null}
function isFutureJourney(){const api=dateApi();return !!(api&&typeof api.isToday==='function'&&!api.isToday())}
function travelDateLabel(){
  const api=dateApi(),value=api&&api.state&&api.state.date;
  if(!value)return 'the selected date';
  const date=new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
}
/* Polls a predicate rather than racing a fixed sleep, and reports
   whether it actually became true so callers can decide. */
function waitFor(test,timeout=1500,interval=30){
  return new Promise(resolve=>{
    const start=Date.now();
    const tick=()=>{
      let ok=false;
      try{ok=!!test();}catch(e){ok=false;}
      if(ok)return resolve(true);
      if(Date.now()-start>=timeout)return resolve(false);
      setTimeout(tick,interval);
    };
    tick();
  });
}
function stationRows(json,exclude=''){
  return (Array.isArray(json)?json:[]).map(item=>({name:String(item&&item.stationName||'').trim(),crs:String(item&&item.crsCode||'').trim().toUpperCase()})).filter(item=>item.name&&/^[A-Z0-9]{3}$/.test(item.crs)&&item.crs!==exclude);
}
async function stationLookup(query,signal,exclude=''){
  const q=String(query||'').trim();
  if(q.length<2)return[];
  /* Start from whichever provider last answered rather than always
     PROVIDERS[0]; resilientRailFetch still falls through to the other. */
  const response=await resilientRailFetch(`${providerState.active}/crs/${encodeURIComponent(q)}`,{signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`Station search returned ${response.status}`);
  return stationRows(await response.json(),exclude);
}
function bestMatch(items,query){
  const q=normalise(query),crs=String(query||'').trim().toUpperCase();
  return items.find(item=>item.crs===crs)||items.find(item=>normalise(item.name)===q)||(items.length===1?items[0]:null);
}
function esc(value){return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function renderSuggestions(elementId,items,attribute,onPick,emptyText){
  const el=$(elementId);if(!el)return;
  if(!items.length){el.innerHTML=`<div class="train-suggest-empty">${emptyText}</div>`;el.hidden=false;return;}
  el.innerHTML=items.slice(0,8).map((item,index)=>`<button type="button" role="option" ${attribute}="${index}"><span>${esc(item.name)}</span><b>${esc(item.crs)}</b></button>`).join('');
  el.hidden=false;
  [...el.querySelectorAll(`[${attribute}]`)].forEach((button,index)=>button.addEventListener('click',()=>onPick(items[index])));
}
function renderFromSuggestions(items){
  renderSuggestions('trainSuggest',items,'data-k-from',selectOrigin,'No matching stations found.');
}
function renderToSuggestions(items){
  renderSuggestions('trainDestinationSuggest',items,'data-k-to',selectDestination,'No matching destination stations found.');
}
function selectOrigin(item){
  if(!item)return;
  const input=$('trainStationQuery'),go=$('trainStationGo');
  if(!input||!go)return;
  input.value=item.crs;
  go.click();
  setTimeout(()=>{if(input)input.value=item.name;const el=$('trainSuggest');if(el){el.hidden=true;el.innerHTML='';}if(isFutureJourney())dateApi()?.applyForecasts?.();},0);
}
function syncRouteOrigin(station){
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  const crs=String(station&&(station.crs||station.crsCode)||'').trim().toUpperCase();
  if(!route||!/^[A-Z0-9]{3}$/.test(crs))return false;
  if(typeof route.setFromCrs==='function')return route.setFromCrs(crs)!==false;
  if(route.state){route.state.fromCrs=crs;return true;}
  return false;
}
function selectDestination(item,{reload=true}={}){
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  if(!route||!item)return false;
  const selected=route.selectDestination(item,{reload});
  const el=$('trainDestinationSuggest');if(el){el.hidden=true;el.innerHTML='';}
  if(isFutureJourney())setTimeout(()=>dateApi()?.applyForecasts?.(),0);
  const current=route.state&&route.state.destination;
  const crs=String(item.crs||item.crsCode||'').trim().toUpperCase();
  return selected!==false&&!!(current&&String(current.crs||'').toUpperCase()===crs);
}
function cloneInput(id){
  const old=$(id);if(!old||old.dataset.kerbsidePlanner==='1')return old;
  const fresh=old.cloneNode(true);fresh.dataset.kerbsidePlanner='1';old.replaceWith(fresh);return fresh;
}
function plannerMessage(text,error=false){const el=$('trainPlannerMessage');if(!el)return;el.textContent=text||'';el.classList.toggle('error',!!error);}
async function resolveOrigin(){
  const input=$('trainStationQuery'),api=window.__KERBSIDE_TRAINS__;
  if(!input||!api)return false;
  const q=input.value.trim(),selected=api.state&&api.state.station;
  if(selected&&(normalise(q)===normalise(selected.name)||q.toUpperCase()===String(selected.crs||'').toUpperCase()))return syncRouteOrigin(selected);
  const ctl=new AbortController();
  const items=await stationLookup(q,ctl.signal);
  const match=bestMatch(items,q);
  if(!match){renderFromSuggestions(items);plannerMessage('Choose the departure station from the suggestions.',true);return false;}
  selectOrigin(match);
  const ready=await waitFor(()=>api.state&&api.state.station&&String(api.state.station.crs).toUpperCase()===match.crs,1500);
  return ready&&syncRouteOrigin(api.state&&api.state.station||match);
}
async function resolveDestination({reload=true}={}){
  const input=$('trainDestinationQuery'),route=window.__KERBSIDE_TRAIN_ROUTES__,api=window.__KERBSIDE_TRAINS__;
  if(!input||!route||!api)return false;
  const q=input.value.trim();
  const current=route.state&&route.state.destination;
  if(current&&(normalise(q)===normalise(current.name)||q.toUpperCase()===String(current.crs||'').toUpperCase()))return true;
  const from=api.state&&api.state.station?String(api.state.station.crs||'').toUpperCase():'';
  const ctl=new AbortController();
  const items=await stationLookup(q,ctl.signal,from);
  const match=bestMatch(items,q);
  if(!match){renderToSuggestions(items);plannerMessage('Choose the destination station from the suggestions.',true);return false;}
  if(!selectDestination(match,{reload})){
    plannerMessage('The destination could not be attached to the selected departure station. Please try again.',true);
    return false;
  }
  return true;
}
async function refreshJourneyBoard(){
  const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
  const mode=timetable&&typeof timetable.journeyMode==='function'?timetable.journeyMode():'';
  if(mode&&typeof timetable.load==='function'){
    await timetable.load({mode});
    return true;
  }
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  if(route&&typeof route.reloadBoard==='function'){
    route.reloadBoard();
    return true;
  }
  const api=window.__KERBSIDE_TRAINS__,station=api&&api.state&&api.state.station,input=$('trainStationQuery'),go=$('trainStationGo');
  if(!station||!input||!go)return false;
  const previous=input.value;
  input.value=station.crs||station.name||previous;
  go.click();
  input.value=previous;
  return true;
}
async function finishJourney({reload=false}={}){
  dispatch();
  const refreshed=reload?await refreshJourneyBoard():false;
  if(!isFutureJourney()){
    plannerMessage('Journey loaded.');
    return;
  }
  if(!refreshed){
    const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
    if(timetable&&typeof timetable.load==='function')await timetable.load();
    else dateApi()?.applyForecasts?.();
  }
  plannerMessage(`Advance journey ready for ${travelDateLabel()}.`);
}
async function findTrains(){
  const button=$('trainJourneyGo');
  if(button){button.disabled=true;button.textContent='Finding trains…';}
  plannerMessage('');
  try{
    const from=$('trainStationQuery');
    if(!from||from.value.trim().length<2){plannerMessage('Add a departure station to search this journey.',true);from?.focus();return;}
    if(!(await resolveOrigin()))return;
    const to=$('trainDestinationQuery');
    if(!to||to.value.trim().length<2){plannerMessage('Add a destination to search this journey.',true);to?.focus();return;}
    if(!(await resolveDestination({reload:false})))return;
    await finishJourney({reload:true});
  }catch(error){
    plannerMessage(error&&error.message?error.message:'Train search is temporarily unavailable.',true);
  }finally{
    if(button){button.disabled=false;button.textContent='Find trains';}
  }
}

/* Resolve both ends before mutating the active journey, then commit the
   reverse route explicitly. The old implementation blanked route.fromCrs and
   waited for a Huxley URL rewrite to repopulate it. Official RDM responses do
   not pass through that rewrite, leaving the route permanently half-cleared. */
function stationRecord(station){
  if(!station)return null;
  const crs=String(station.crs||station.crsCode||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{3}$/.test(crs))return null;
  return {name:String(station.name||station.stationName||crs).trim()||crs,crs};
}
function stationMatchesQuery(station,query){
  const record=stationRecord(station),q=String(query||'').trim();
  return !!(record&&q&&(normalise(q)===normalise(record.name)||q.toUpperCase()===record.crs));
}
async function resolveSwapStation(selected,query,exclude=''){
  const record=stationRecord(selected);
  if(record&&stationMatchesQuery(record,query))return record;
  const ctl=new AbortController();
  const items=await stationLookup(query,ctl.signal,exclude);
  return bestMatch(items,query);
}
async function swap(){
  const api=window.__KERBSIDE_TRAINS__,route=window.__KERBSIDE_TRAIN_ROUTES__;
  const fromInput=$('trainStationQuery'),toInput=$('trainDestinationQuery');
  if(!api||!route||!fromInput||!toInput)return;
  const selectedOrigin=api.state&&api.state.station;
  const selectedDestination=route.state&&route.state.destination;
  const fromText=fromInput.value.trim()||(selectedOrigin&&(selectedOrigin.name||selectedOrigin.crs))||'';
  const toText=toInput.value.trim()||(selectedDestination&&(selectedDestination.name||selectedDestination.crs))||'';
  if(!fromText||!toText){plannerMessage('Add both stations before swapping.',true);return;}

  const button=$('trainRouteSwap');
  if(button)button.disabled=true;
  plannerMessage('');
  try{
    const oldOrigin=await resolveSwapStation(selectedOrigin,fromText);
    if(!oldOrigin){plannerMessage('Choose the departure station from the suggestions before swapping.',true);return;}
    const oldDestination=await resolveSwapStation(selectedDestination,toText,oldOrigin.crs);
    if(!oldDestination){plannerMessage('Choose the destination station from the suggestions before swapping.',true);return;}
    if(oldOrigin.crs===oldDestination.crs){plannerMessage('Departure and destination must be different stations.',true);return;}

    route.clearDestination({reload:false});
    fromInput.value=oldDestination.crs;
    toInput.value=oldOrigin.name;
    selectOrigin(oldDestination);
    const originReady=await waitFor(()=>api.state&&api.state.station&&String(api.state.station.crs||'').toUpperCase()===oldDestination.crs,1500);
    if(!originReady||!syncRouteOrigin(api.state&&api.state.station||oldDestination))throw new Error('The reversed departure station did not finish loading.');

    fromInput.value=oldDestination.name;
    toInput.value=oldOrigin.name;
    if(!selectDestination(oldOrigin,{reload:false}))throw new Error('The reversed destination could not be selected.');
    await finishJourney({reload:true});
  }catch(error){
    plannerMessage(error&&error.message?error.message:'The journey could not be swapped.',true);
  }finally{
    if(button)button.disabled=false;
  }
}

function bindRobustInputs(){
  const from=cloneInput('trainStationQuery'),to=cloneInput('trainDestinationQuery');
  if(from){
    from.addEventListener('input',()=>{
      const route=window.__KERBSIDE_TRAIN_ROUTES__,api=window.__KERBSIDE_TRAINS__,selected=api&&api.state&&api.state.station;
      const matches=selected&&(normalise(from.value)===normalise(selected.name)||from.value.trim().toUpperCase()===String(selected.crs||'').toUpperCase());
      if(!matches&&route&&route.state){route.state.fromCrs='';route.clearDestination({disable:false});const destination=$('trainDestinationQuery');if(destination){destination.disabled=false;destination.placeholder='Bristol Temple Meads';}}
      clearTimeout(fromTimer);if(fromAbort)fromAbort.abort();
      fromTimer=setTimeout(async()=>{const q=from.value.trim();if(q.length<2)return;fromAbort=new AbortController();try{renderFromSuggestions(await stationLookup(q,fromAbort.signal));}catch(e){}},SEARCH_DELAY_MS);
    });
    from.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();findTrains();}});
  }
  if(to){
    to.addEventListener('input',()=>{
      const route=window.__KERBSIDE_TRAIN_ROUTES__,api=window.__KERBSIDE_TRAINS__;
      if(route&&route.state&&route.state.destination){route.state.destination=null;route.state.lastDirectRequest='';}
      clearTimeout(toTimer);if(toAbort)toAbort.abort();
      toTimer=setTimeout(async()=>{const q=to.value.trim();if(q.length<2)return;toAbort=new AbortController();try{const fromCrs=api&&api.state&&api.state.station?String(api.state.station.crs||'').toUpperCase():'';renderToSuggestions(await stationLookup(q,toAbort.signal,fromCrs));}catch(e){}},SEARCH_DELAY_MS);
    });
    to.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();findTrains();}});
  }
}

const SWAP_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 20V4M4 8l4-4 4 4"/><path d="M16 4v16M20 16l-4 4-4-4"/></svg>';

function buildWhereCard(fromWrap,toWrap){
  const card=document.createElement('section');
  card.className='train-card train-where-card';
  card.setAttribute('aria-labelledby','trainWhereTitle');

  const title=document.createElement('h3');
  title.id='trainWhereTitle';
  title.className='train-card-title';
  title.textContent='Where';
  card.appendChild(title);

  const grid=document.createElement('div');
  grid.className='train-where-grid';

  const fromMarker=document.createElement('span');
  fromMarker.className='train-where-marker from';
  fromMarker.setAttribute('aria-hidden','true');

  const topRight=document.createElement('span');

  const link=document.createElement('span');
  link.className='train-where-link';
  link.setAttribute('aria-hidden','true');

  const midCell=document.createElement('span');
  midCell.className='train-where-gap';

  const midRight=document.createElement('span');

  const toMarker=document.createElement('span');
  toMarker.className='train-where-marker to';
  toMarker.setAttribute('aria-hidden','true');

  const swapBtn=document.createElement('button');
  swapBtn.id='trainRouteSwap';
  swapBtn.type='button';
  swapBtn.className='train-where-swap';
  swapBtn.title='Swap departure and destination';
  swapBtn.setAttribute('aria-label','Swap departure and destination');
  swapBtn.innerHTML=SWAP_ICON;
  swapBtn.addEventListener('click',swap);

  /* Row 1: hollow marker | From field | (empty)
     Row 2: dotted link   | spacer     | (empty)
     Row 3: filled marker | To field   | swap
     Grid placement is source order, so append cell by cell. */
  grid.append(fromMarker,fromWrap,topRight);
  grid.append(link,midCell,midRight);
  grid.append(toMarker,toWrap,swapBtn);

  card.appendChild(grid);
  return card;
}

function buildWhenCard(){
  const card=document.createElement('section');
  card.className='train-card train-when-card';
  card.setAttribute('aria-labelledby','trainWhenTitle');

  const title=document.createElement('h3');
  title.id='trainWhenTitle';
  title.className='train-card-title';
  title.textContent='When';
  card.appendChild(title);

  const grid=document.createElement('div');
  grid.className='train-when-grid';
  grid.id='trainWhenGrid';

  const time=document.createElement('label');
  time.className='train-planner-time';
  time.innerHTML='<span>Depart after</span><input id="trainDepartAfter" type="time" step="900">';
  grid.appendChild(time);

  card.appendChild(grid);
  return card;
}

/* train-date.js builds the travel-date row asynchronously and inserts it
   after the destination wrap, which by then lives inside the Where grid.
   Left alone it lands in the middle of the route markers. Adopt it as
   soon as it appears, however the race falls out. */
function adoptDateRow(){
  const grid=$('trainWhenGrid');
  if(!grid)return false;
  const wrap=$('trainTravelDate')?.closest('.train-date-wrap');
  if(!wrap)return false;
  if(wrap.parentNode===grid)return true;
  grid.insertBefore(wrap,grid.firstChild);
  return true;
}
function watchForDateRow(){
  if(adoptDateRow())return;
  const observer=new MutationObserver(()=>{if(adoptDateRow())observer.disconnect();});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
}

function install(){
  installStyles();
  const from=$('trainStationQuery'),to=$('trainDestinationQuery');
  if(!from||!to)return false;
  to.disabled=false;
  from.placeholder='Birmingham New Street';
  to.placeholder='Bristol Temple Meads';
  ['trainStationGo','trainDestinationGo'].forEach(id=>{const button=$(id);if(button){button.tabIndex=-1;button.setAttribute('aria-hidden','true');}});

  const fromWrap=from.closest('.train-search-wrap'),toWrap=to.closest('.train-search-wrap');
  if(!fromWrap||!toWrap)return false;
  if(fromWrap.closest('.train-planner'))return true;

  const planner=document.createElement('div');
  planner.className='train-planner';
  planner.id='trainPlanner';
  fromWrap.parentNode.insertBefore(planner,fromWrap);

  planner.appendChild(buildWhereCard(fromWrap,toWrap));
  planner.appendChild(buildWhenCard());

  const go=document.createElement('button');
  go.id='trainJourneyGo';go.type='button';go.className='train-journey-go';go.textContent='Find trains';
  go.addEventListener('click',findTrains);
  planner.appendChild(go);

  const message=document.createElement('div');
  message.id='trainPlannerMessage';message.className='train-planner-message';
  message.setAttribute('aria-live','polite');
  planner.appendChild(message);

  const foot=document.createElement('div');
  foot.className='train-planner-foot';
  const clear=$('trainDestinationClear');
  if(clear)foot.appendChild(clear);
  planner.appendChild(foot);

  const departAfter=$('trainDepartAfter');
  if(departAfter){
    departAfter.value=storedTime();
    departAfter.addEventListener('change',()=>{saveTime(departAfter.value);dispatch();});
  }

  document.addEventListener('kerbside:train-date-change',()=>{
    planner.dataset.mode=isFutureJourney()?'future':'live';
    plannerMessage('');
  });

  setTimeout(()=>{
    watchForDateRow();
    bindRobustInputs();
    planner.dataset.mode=isFutureJourney()?'future':'live';
  },0);
  return true;
}
function init(){if(!install())setTimeout(init,0)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,isFutureJourney,syncRouteOrigin,refreshJourneyBoard,get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};
})();
