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
const INIT_RETRY_MS=50;
const INIT_RETRY_MAX=120;
let initAttempts=0;
const previousFetch=window.fetch.bind(window);
const providerState={active:PROVIDERS[0],lastFailure:'',fallbacks:0};
let fromTimer=null,toTimer=null,fromAbort=null,toAbort=null,timeFloorTimer=null;

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
  const originScoped=url.searchParams.get('kerbsideScope')==='origin';
  if(match&&!originScoped&&destination&&destination.crs&&destination.crs.toUpperCase()!==match[1].toUpperCase()){
    path=`/departures/${encodeURIComponent(match[1].toUpperCase())}/to/${encodeURIComponent(destination.crs.toUpperCase())}/${encodeURIComponent(match[2])}`;
  }
  const params=new URLSearchParams(url.search);params.delete('kerbsideScope');
  const query=params.toString();
  return path+(query?`?${query}`:'');
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
    const response=await previousFetch(url,{...(init||{}),signal:controller.signal});
    /* Settling on the headers is what the provider-fallback logic below reads,
       but the body is downloaded after this function has already disarmed its
       timer. A provider that answers and then stalls mid-JSON therefore never
       times out and never fails over to the backup — the one thing this layer
       exists to do. Read it here instead and rebuild an equivalent response;
       status, statusText and headers are all the callers consult. */
    const body=await response.arrayBuffer();
    const empty=response.status===204||response.status===205||response.status===304;
    return new Response(empty?null:body,{status:response.status,statusText:response.statusText,headers:response.headers});
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
function timeMinutes(value){const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!match)return null;const h=Number(match[1]),m=Number(match[2]);return h>=0&&h<24&&m>=0&&m<60?h*60+m:null;}
function fallbackRailNow(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  let hour=Number(map.hour)||0;if(hour===24)hour=0;return `${String(hour).padStart(2,'0')}:${String(Number(map.minute)||0).padStart(2,'0')}`;
}
function railNow(){const live=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;return live&&typeof live.currentRailTime==='function'?live.currentRailTime():fallbackRailNow();}
function syncDepartAfterForDate(){
  const input=$('trainDepartAfter');if(!input)return'';
  if(isFutureJourney()){const preferred=storedTime();if(input.value!==preferred)input.value=preferred;return input.value;}
  const now=railNow(),chosen=input.value||storedTime(),nowMinute=timeMinutes(now),chosenMinute=timeMinutes(chosen),next=chosenMinute!=null&&nowMinute!=null&&chosenMinute>=nowMinute?chosen:now;
  if(input.value!==next)input.value=next;
  return input.value;
}
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
  syncRouteOrigin(item);
  input.value=item.crs;
  go.click();
  setTimeout(()=>{const selected=window.__KERBSIDE_TRAINS__?.state?.station;syncRouteOrigin(selected||item);if(input)input.value=item.name;const el=$('trainSuggest');if(el){el.hidden=true;el.innerHTML='';}if(isFutureJourney())dateApi()?.applyForecasts?.();},0);
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
  time.innerHTML='<span>Depart after</span><input id="trainDepartAfter" type="time" step="60">';
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
    syncDepartAfterForDate();
    departAfter.addEventListener('change',()=>{saveTime(departAfter.value);syncDepartAfterForDate();dispatch();});
  }

  document.addEventListener('kerbside:train-date-change',()=>{
    planner.dataset.mode=isFutureJourney()?'future':'live';
    syncDepartAfterForDate();
    plannerMessage('');
  });
  if(!timeFloorTimer)timeFloorTimer=setInterval(()=>{
    if(isFutureJourney())return;
    const before=$('trainDepartAfter')?.value||'',after=syncDepartAfterForDate();
    if(after&&after!==before)dispatch();
  },30*1000);

  setTimeout(()=>{
    watchForDateRow();
    bindRobustInputs();
    installPlanJourney();
    planner.dataset.mode=isFutureJourney()?'future':'live';
  },0);
  return true;
}
/* ------------------------------------------------------------------
   Plan My Journey.

   This is a ranking view over the same timetable provider and Forecast v4
   used by the normal train board. It does not invent a second routing or
   crowding model: it asks for a wider candidate set, scores each service with
   Forecast v4 (including date-specific event evidence when available), then
   applies the traveller's saved ranking preference.
------------------------------------------------------------------ */
const PLAN_PREF_KEY='kerbside.rail.plan.preference.v1';
const PLAN_CONSTRAINT_KEY='kerbside.rail.plan.constraints.v1';
const PLAN_SAVED_KEY='kerbside.rail.plan.saved.v1';
const PLAN_SAVED_MAX=12;
const PLAN_BUFFER_OPTIONS=new Set([0,5,10,15]);
const PLAN_MAX_CANDIDATES=72;
const PLAN_VISIBLE_RESULTS=10;
const PLAN_EVENT_TIMEOUT_MS=6500;
const PLAN_PREFERENCES={
  balanced:{label:'Balanced'},
  fastest:{label:'Fastest'},
  quieter:{label:'Quieter'},
  'fewer-changes':{label:'Fewer changes'},
  'least-stressful':{label:'Least stressful'}
};
const planState={installed:false,active:false,from:null,to:null,results:[],preference:'balanced',constraints:{maxChanges:1,connectionBuffer:0},saved:[],savedFocus:null,eventsReady:false,source:'',searchSeq:0,eventSeq:0,hidden:new Map(),observer:null};
let planFromTimer=null,planToTimer=null,planFromAbort=null,planToAbort=null;

function planPreference(){try{const value=localStorage.getItem(PLAN_PREF_KEY)||'balanced';return PLAN_PREFERENCES[value]?value:'balanced';}catch(error){return'balanced';}}
function normalisePlanConstraints(settings){const maxChanges=settings&&Number(settings.maxChanges)===0?0:1,buffer=Number(settings&&settings.connectionBuffer);return {maxChanges,connectionBuffer:PLAN_BUFFER_OPTIONS.has(buffer)?buffer:0};}
function planConstraints(){try{const raw=localStorage.getItem(PLAN_CONSTRAINT_KEY);return normalisePlanConstraints(raw?JSON.parse(raw):null);}catch(error){return normalisePlanConstraints(null);}}
function savePlanPreference(value){if(!PLAN_PREFERENCES[value])return;planState.preference=value;try{localStorage.setItem(PLAN_PREF_KEY,value);}catch(error){}}
function savePlanConstraints(settings){const value=normalisePlanConstraints(settings);planState.constraints=value;try{localStorage.setItem(PLAN_CONSTRAINT_KEY,JSON.stringify(value));}catch(error){}return value;}
function planConstraintsFromForm(){return normalisePlanConstraints({maxChanges:$('planJourneyMaxChanges')?.value,connectionBuffer:$('planJourneyConnectionBuffer')?.value});}
function planConstraintLabel(settings=planState.constraints){const value=normalisePlanConstraints(settings);if(value.maxChanges===0)return'Direct only';const buffer=value.connectionBuffer?`+${value.connectionBuffer} min connection buffer`:'base connection minimum';return `Up to 1 change · ${buffer}`;}
function planCandidateMeetsConstraints(candidate,settings=planState.constraints){const value=normalisePlanConstraints(settings),changes=Math.max(0,Number(candidate&&candidate.changes)||0);if(changes>value.maxChanges)return false;if(changes===0||value.connectionBuffer<=0)return true;const minutes=Number(candidate&&candidate.connectionMinutes),minimum=Number(candidate&&candidate.minimumConnectionMinutes);return Number.isFinite(minutes)&&Number.isFinite(minimum)&&minutes>=minimum+value.connectionBuffer;}
function planFilterCandidates(rows,settings=planState.constraints){return (Array.isArray(rows)?rows:[]).filter(row=>planCandidateMeetsConstraints(row,settings));}
function planComparisonMessage(total,eligible,{checking=false,eventsReady=false}={}){const singular=eligible===1?'option':'options',base=eligible===total?`Compared ${eligible} journey ${singular}`:`${eligible} of ${total} journey options meet your constraints`;if(checking)return `${base}. Checking event context…`;if(eventsReady)return eligible===total?`${base} with current event context.`:`${base}. Ranking updated with current event context.`;return `${base}.`;}
function planSyncConstraintAvailability(){const changes=$('planJourneyMaxChanges'),buffer=$('planJourneyConnectionBuffer');if(buffer)buffer.disabled=Number(changes?.value)===0;}
function planConstraintChanged(){const settings=savePlanConstraints(planConstraintsFromForm());planSyncConstraintAvailability();if(planState.results.length)planSetMessage(`Journey constraints saved: ${planConstraintLabel(settings)}. Compare journeys to refresh.`);}
function planSavedSelector(service){return {serviceID:String(service&&(service.serviceID||service.serviceId)||''),uid:String(service&&service.uid||''),trainId:String(service&&service.trainId||''),std:String(service&&(service.std||service.departure)||'')};}
function planSavedSelectorKey(selector){const value=selector||{};return String(value.uid||value.serviceID||value.trainId||value.std||'');}
function planSavedLocatorId(value){const item=value||{},first=item.journeyType==='connection'?planSavedSelectorKey(item.first):planSavedSelectorKey(item.service),onward=item.journeyType==='connection'?planSavedSelectorKey(item.onward):'';return [item.date,item.from&&item.from.crs,item.to&&item.to.crs,item.journeyType,first,item.change||'',onward].map(part=>String(part||'')).join('|');}
function normaliseSavedSelector(value){const item=value&&typeof value==='object'?value:{};return {serviceID:String(item.serviceID||''),uid:String(item.uid||''),trainId:String(item.trainId||''),std:String(item.std||'')};}
function normaliseSavedJourney(value){
  if(!value||typeof value!=='object')return null;const from=planStation(value.from),to=planStation(value.to),date=String(value.date||'');if(!from||!to||from.crs===to.crs||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  const journeyType=value.journeyType==='connection'?'connection':'direct',item={v:1,id:String(value.id||''),savedAt:String(value.savedAt||''),refreshedAt:String(value.refreshedAt||''),date,from,to,journeyType,service:normaliseSavedSelector(value.service),first:normaliseSavedSelector(value.first),onward:normaliseSavedSelector(value.onward),change:String(value.change||'').toUpperCase(),scheduledDeparture:String(value.scheduledDeparture||''),scheduledArrival:String(value.scheduledArrival||''),searchStart:String(value.searchStart||''),searchEnd:String(value.searchEnd||''),preference:PLAN_PREFERENCES[value.preference]?value.preference:'balanced',constraints:normalisePlanConstraints(value.constraints)};
  item.id=item.id||planSavedLocatorId(item);return item.id?item:null;
}
function readSavedJourneys(){
  try{const raw=JSON.parse(localStorage.getItem(PLAN_SAVED_KEY)||'[]'),seen=new Set(),rows=[];for(const value of Array.isArray(raw)?raw:[]){const item=normaliseSavedJourney(value);if(!item||seen.has(item.id))continue;seen.add(item.id);rows.push(item);if(rows.length>=PLAN_SAVED_MAX)break;}return rows;}catch(error){return[];}
}
function writeSavedJourneys(rows){const next=[],seen=new Set();for(const value of Array.isArray(rows)?rows:[]){const item=normaliseSavedJourney(value);if(!item||seen.has(item.id))continue;seen.add(item.id);next.push(item);if(next.length>=PLAN_SAVED_MAX)break;}planState.saved=next;try{localStorage.setItem(PLAN_SAVED_KEY,JSON.stringify(next));}catch(error){}return next;}
function planCandidateKey(row){if(!row)return'';if(row.journeyType==='connection'){const first=row.legs&&row.legs[0],onward=row.legs&&row.legs[1],change=String(row.interchange&&row.interchange.crs||'').toUpperCase();return `connection:${planSavedSelectorKey(planSavedSelector(first))}:${change}:${planSavedSelectorKey(planSavedSelector(onward))}`;}return `direct:${planSavedSelectorKey(planSavedSelector(row))}:${String(row.std||row.departure||'')}`;}
function planSelectorMatchStrength(saved,current){const wanted=normaliseSavedSelector(saved),candidate=normaliseSavedSelector(current);if(wanted.serviceID&&candidate.serviceID&&wanted.serviceID===candidate.serviceID)return 0;if(wanted.uid&&candidate.uid&&wanted.uid===candidate.uid)return 1;if(wanted.trainId&&candidate.trainId&&wanted.trainId===candidate.trainId)return 2;return null;}
function planSavedRouteMatches(saved){return !!(saved&&planState.from&&planState.to&&String(saved.date||'')===planDateValue()&&saved.from.crs===planState.from.crs&&saved.to.crs===planState.to.crs);}
function planMatchSavedJourney(locator,candidates,{allowClosest=true}={}){
  const saved=normaliseSavedJourney(locator);if(!saved)return null;const list=Array.isArray(candidates)?candidates:[],strong=[];
  for(const candidate of list){if(!candidate)continue;const type=candidate.journeyType==='connection'?'connection':'direct';if(type!==saved.journeyType)continue;let strength=null;
    if(type==='connection'){
      const change=String(candidate.interchange&&candidate.interchange.crs||'').toUpperCase();if(saved.change&&change!==saved.change)continue;
      const top=planSelectorMatchStrength(saved.service,planSavedSelector(candidate)),first=planSelectorMatchStrength(saved.first,planSavedSelector(candidate.legs&&candidate.legs[0])),onward=planSelectorMatchStrength(saved.onward,planSavedSelector(candidate.legs&&candidate.legs[1]));
      if(top===0)strength=0;else if(first!=null&&onward!=null)strength=1+first+onward;
    }else strength=planSelectorMatchStrength(saved.service,planSavedSelector(candidate));
    if(strength!=null){const dep=Math.abs((Number(candidate.departureMinute)||0)-(planTimeMinutes(saved.scheduledDeparture)||0));strong.push({candidate,strength,dep});}
  }
  if(strong.length){strong.sort((a,b)=>a.strength-b.strength||a.dep-b.dep);const best=strong[0];return {candidate:best.candidate,confidence:best.strength===0?'exact':'identity',departureShift:best.dep};}
  if(!allowClosest)return null;
  const wantedDeparture=planTimeMinutes(saved.scheduledDeparture),wantedArrival=planTimeMinutes(saved.scheduledArrival);if(wantedDeparture==null)return null;let best=null;
  for(const candidate of list){if(!candidate)continue;const type=candidate.journeyType==='connection'?'connection':'direct';if(type!==saved.journeyType)continue;if(type==='connection'&&saved.change&&String(candidate.interchange&&candidate.interchange.crs||'').toUpperCase()!==saved.change)continue;const dep=Math.abs((Number(candidate.departureMinute)||0)-wantedDeparture),arrival=Number(candidate.arrivalMinute),arr=wantedArrival==null||!Number.isFinite(arrival)?0:Math.abs(arrival-wantedArrival);if(dep>30||arr>90)continue;const score=dep*3+arr;if(!best||score<best.score)best={candidate,score,dep};}
  return best?{candidate:best.candidate,confidence:'closest',departureShift:best.dep}:null;
}
function planSavedLocatorForCandidate(row,preserve=null){
  const connection=row&&row.journeyType==='connection',first=connection&&row.legs&&row.legs[0],onward=connection&&row.legs&&row.legs[1],savedAt=preserve&&preserve.savedAt||new Date().toISOString(),item={v:1,id:preserve&&preserve.id||'',savedAt,refreshedAt:preserve?new Date().toISOString():'',date:planDateValue(),from:planStation(planState.from),to:planStation(planState.to),journeyType:connection?'connection':'direct',service:planSavedSelector(row),first:connection?planSavedSelector(first):normaliseSavedSelector(null),onward:connection?planSavedSelector(onward):normaliseSavedSelector(null),change:connection?String(row.interchange&&row.interchange.crs||'').toUpperCase():'',scheduledDeparture:String(row.std||row.departure||''),scheduledArrival:String(row.arrival||''),searchStart:preserve&&preserve.searchStart||$('planJourneyStart')?.value||'',searchEnd:preserve&&preserve.searchEnd||$('planJourneyEnd')?.value||'',preference:preserve&&preserve.preference||planState.preference,constraints:normalisePlanConstraints(preserve&&preserve.constraints||planState.constraints)};item.id=item.id||planSavedLocatorId(item);return normaliseSavedJourney(item);}
function planSavedEntryForCandidate(row){if(!row)return null;for(const saved of planState.saved){if(!planSavedRouteMatches(saved))continue;if(planMatchSavedJourney(saved,[row],{allowClosest:false}))return saved;}return null;}
function planReplaceSavedJourney(id,value){const next=planState.saved.map(item=>item.id===id?value:item);writeSavedJourneys(next);renderSavedJourneys();return value;}
function planSavedDateLabel(value){const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});}
function renderSavedJourneys(){
  const list=$('planSavedJourneys'),count=$('planSavedCount');if(count)count.textContent=String(planState.saved.length);if(!list)return;if(!planState.saved.length){list.innerHTML='<div class="plan-saved-empty">No saved journeys yet. Save a ranked option to re-check it later.</div>';return;}
  list.innerHTML=planState.saved.map(item=>`<article class="plan-saved-row" data-plan-saved-id="${esc(item.id)}"><div><strong>${esc(item.from.name)} → ${esc(item.to.name)}</strong><span>${esc(planSavedDateLabel(item.date))} · ${esc(item.scheduledDeparture||'—')} → ${esc(item.scheduledArrival||'—')}</span></div><div class="plan-saved-actions"><button type="button" data-plan-open-saved="${esc(item.id)}">Open & refresh</button><button type="button" data-plan-remove-saved="${esc(item.id)}">Remove</button></div></article>`).join('');
}
function planSyncSaveButtons(){for(const button of document.querySelectorAll('#planJourneyResults [data-plan-save-key]')){const key=button.getAttribute('data-plan-save-key'),row=planState.results.find(item=>planCandidateKey(item)===key),saved=row&&planSavedEntryForCandidate(row);button.textContent=saved?'Saved':'Save journey';button.setAttribute('aria-pressed',saved?'true':'false');}}
function planToggleSavedByKey(key){const row=planState.results.find(item=>planCandidateKey(item)===String(key||''));if(!row)return false;const existing=planSavedEntryForCandidate(row);if(existing){writeSavedJourneys(planState.saved.filter(item=>item.id!==existing.id));if(planState.savedFocus&&planState.savedFocus.id===existing.id)planState.savedFocus=null;planSetMessage('Saved journey removed.');}else{const item=planSavedLocatorForCandidate(row);if(!item)return false;writeSavedJourneys([item,...planState.saved.filter(saved=>saved.id!==item.id)]);const panel=$('planSavedPanel');if(panel)panel.open=true;planSetMessage('Journey saved. Kerbside will re-check the timetable and Forecast v4 when you open it.');}renderSavedJourneys();planSyncSaveButtons();return true;}
function planRemoveSavedJourney(id){const before=planState.saved.length;writeSavedJourneys(planState.saved.filter(item=>item.id!==String(id||'')));if(planState.savedFocus&&planState.savedFocus.id===String(id||''))planState.savedFocus=null;renderSavedJourneys();planSyncSaveButtons();if(planState.saved.length!==before)planSetMessage('Saved journey removed.');return planState.saved.length!==before;}
function planSavedSearchWindow(saved){const dep=planTimeMinutes(saved&&saved.scheduledDeparture),storedStart=planTimeMinutes(saved&&saved.searchStart),storedEnd=planTimeMinutes(saved&&saved.searchEnd);if(dep==null)return {start:saved&&saved.searchStart||'09:00',end:saved&&saved.searchEnd||'11:00'};let start=storedStart==null?Math.max(0,dep-30):Math.min(storedStart,Math.max(0,dep-30)),end=storedEnd==null?Math.min(1439,dep+45):Math.max(storedEnd,Math.min(1439,dep+45));if(end<=start)end=Math.min(1439,start+120);return {start:planClock(start),end:planClock(end)};}
function planVisibleResults(rows){const list=Array.isArray(rows)?rows:[],visible=list.slice(0,PLAN_VISIBLE_RESULTS),key=planState.savedFocus&&planState.savedFocus.candidateKey;if(!key)return visible;const target=list.find(row=>planCandidateKey(row)===key);if(!target||visible.includes(target))return visible;if(visible.length>=PLAN_VISIBLE_RESULTS)visible[visible.length-1]=target;else visible.push(target);return visible;}
async function planOpenSavedJourney(id){
  const saved=planState.saved.find(item=>item.id===String(id||''));if(!saved)return false;if(!planState.active)setPlanView(true);await planApplyCoverage();selectPlanStation('from',saved.from);selectPlanStation('to',saved.to);const date=$('planJourneyDate');if(date)date.value=saved.date;const start=$('planJourneyStart'),end=$('planJourneyEnd'),windowValue=planSavedSearchWindow(saved);if(start)start.value=windowValue.start;if(end)end.value=windowValue.end;planState.preference=saved.preference;const preference=$('planJourneyPreference');if(preference)preference.value=saved.preference;planState.constraints=normalisePlanConstraints(saved.constraints);const changes=$('planJourneyMaxChanges'),buffer=$('planJourneyConnectionBuffer');if(changes)changes.value=String(planState.constraints.maxChanges);if(buffer)buffer.value=String(planState.constraints.connectionBuffer);planSyncConstraintAvailability();
  if(date&&((date.min&&saved.date<date.min)||(date.max&&saved.date>date.max))){planState.savedFocus={id:saved.id,candidateKey:'',resolution:'missing'};planSetMessage('This saved journey date is outside the timetable coverage currently available to Kerbside.',true);return false;}
  planState.savedFocus={id:saved.id,candidateKey:'',resolution:'loading'};planSetMessage('Refreshing saved journey from the current timetable…');await searchPlanJourneys({keepSavedFocus:true});const match=planMatchSavedJourney(saved,planState.results);
  if(!match){planState.savedFocus={id:saved.id,candidateKey:'',resolution:'missing'};planSetMessage('The saved service could not be resolved in the current timetable under its saved constraints. Current alternatives are shown.',true);return false;}
  const key=planCandidateKey(match.candidate);planState.savedFocus={id:saved.id,candidateKey:key,resolution:match.confidence};if(match.confidence==='exact'||match.confidence==='identity'){const fresh=planSavedLocatorForCandidate(match.candidate,saved);planReplaceSavedJourney(saved.id,fresh);planSetMessage('Saved journey refreshed from the current timetable. Times and Forecast v4 use the latest available information.');}else planSetMessage('The exact saved service was not found. Kerbside highlighted the closest current timetable match; review it before relying on it.',true);renderPlanResults(planState.results,{eventsReady:planState.eventsReady});return true;
}
function planStation(station){if(!station)return null;const crs=String(station.crs||station.crsCode||'').trim().toUpperCase(),name=String(station.name||station.stationName||crs).trim();return /^[A-Z0-9]{3}$/.test(crs)?{crs,name:name||crs}:null;}
function planTimeMinutes(value){return timeMinutes(value);}
function planClock(minute){const value=Math.max(0,Math.min(1439,Math.round(Number(minute)||0)));return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;}
function planDuration(minutes){const value=Math.max(0,Math.round(Number(minutes)||0)),hours=Math.floor(value/60),mins=value%60;return hours?`${hours}h ${mins?`${mins}m`:''}`.trim():`${mins}m`;}
function planDateValue(){return $('planJourneyDate')?.value||'';}
function planReferenceDate(value=planDateValue()){const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?new Date():date;}
function planSourceLabel(){const source=planState.source||window.__KERBSIDE_TRAIN_TIMETABLE__?.state?.scheduleSource||'';return source==='network-rail'?'Network Rail SCHEDULE':source==='darwin'?'Darwin timetable':'Official timetable';}
function planSetMessage(text,error=false){const el=$('planJourneyMessage');if(!el)return;el.textContent=text||'';el.classList.toggle('error',!!error);}
function planNormalise(value){return normalise(value);}
function planResolveStation(input,stateValue){
  const query=String(input&&input.value||'').trim(),record=planStation(stateValue);
  if(record&&(query.toUpperCase()===record.crs||planNormalise(query)===planNormalise(record.name)))return record;
  return null;
}
function planSuggestionBox(kind){return $(kind==='from'?'planJourneyFromSuggest':'planJourneyToSuggest');}
function renderPlanSuggestions(kind,items){
  const box=planSuggestionBox(kind);if(!box)return;
  if(!items.length){box.innerHTML='<div class="train-suggest-empty">No matching stations found.</div>';box.hidden=false;return;}
  box.innerHTML=items.slice(0,8).map((item,index)=>`<button type="button" role="option" data-plan-station="${index}"><span>${esc(item.name)}</span><b>${esc(item.crs)}</b></button>`).join('');
  box.hidden=false;
  [...box.querySelectorAll('[data-plan-station]')].forEach((button,index)=>button.addEventListener('click',()=>selectPlanStation(kind,items[index])));
}
function selectPlanStation(kind,item){
  const record=planStation(item);if(!record)return;
  if(kind==='from')planState.from=record;else planState.to=record;
  const input=$(kind==='from'?'planJourneyFrom':'planJourneyTo');if(input)input.value=record.name;
  const box=planSuggestionBox(kind);if(box){box.hidden=true;box.innerHTML='';}
  planSetMessage('');
}
async function resolvePlanStation(kind){
  const input=$(kind==='from'?'planJourneyFrom':'planJourneyTo'),current=kind==='from'?planState.from:planState.to;
  if(!input)return null;
  const selected=planResolveStation(input,current);if(selected)return selected;
  const query=input.value.trim();if(query.length<2)return null;
  const exclude=kind==='to'&&planState.from?planState.from.crs:'';
  const controller=new AbortController(),items=await stationLookup(query,controller.signal,exclude),match=bestMatch(items,query);
  if(match){selectPlanStation(kind,match);return planStation(match);}
  renderPlanSuggestions(kind,items);
  return null;
}
function bindPlanAutocomplete(kind){
  const input=$(kind==='from'?'planJourneyFrom':'planJourneyTo');if(!input)return;
  input.addEventListener('input',()=>{
    if(kind==='from')planState.from=null;else planState.to=null;
    const q=input.value.trim(),exclude=kind==='to'&&planState.from?planState.from.crs:'';
    if(kind==='from'){clearTimeout(planFromTimer);if(planFromAbort)planFromAbort.abort();if(q.length<2)return;planFromTimer=setTimeout(async()=>{planFromAbort=new AbortController();try{renderPlanSuggestions(kind,await stationLookup(q,planFromAbort.signal,exclude));}catch(error){}},SEARCH_DELAY_MS);}
    else{clearTimeout(planToTimer);if(planToAbort)planToAbort.abort();if(q.length<2)return;planToTimer=setTimeout(async()=>{planToAbort=new AbortController();try{renderPlanSuggestions(kind,await stationLookup(q,planToAbort.signal,exclude));}catch(error){}},SEARCH_DELAY_MS);}
  });
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchPlanJourneys();}});
}
function planInterchangeStation(candidate){const interchange=candidate&&candidate.interchange;return interchange?{crs:String(interchange.crs||'').toUpperCase(),name:String(interchange.name||interchange.locationName||interchange.crs||'')}:null;}
function planEventJourney(candidate,from,to,date){const change=planInterchangeStation(candidate);return {origin:from.name,originCrs:from.crs,destination:to.name,destinationCrs:to.crs,interchanges:change?[change.name||change.crs]:[],date};}
function planForecastLeg(leg,index,legs,station,date,eventJourney){
  const api=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__;if(!api||typeof api.forecast!=='function')return {score:2,label:'Moderate',level:'moderate',confidence:'Low',probabilities:{quiet:.25,moderate:.25,busy:.25,veryBusy:.25},reasons:['forecast engine still loading']};
  return api.forecast(leg,index,legs,{station,referenceDate:planReferenceDate(date),eventJourney,messages:[]});
}
function planForecastCandidate(candidate,from,to,date){
  const eventJourney=planEventJourney(candidate,from,to,date);
  if(candidate&&candidate.journeyType==='connection'&&Array.isArray(candidate.legs)&&candidate.legs.length){
    const change=planInterchangeStation(candidate)||from;
    const forecasts=candidate.legs.map((leg,index)=>planForecastLeg(leg,index,candidate.legs,index===0?from:change,date,eventJourney));
    const worst=forecasts.reduce((value,item)=>!value||Number(item.score)>Number(value.score)?item:value,null)||forecasts[0];
    return {primary:worst,legs:forecasts,score:Math.max(...forecasts.map(item=>Number(item.score)||0)),busyProbability:Math.max(...forecasts.map(item=>Number(item.probabilities&&item.probabilities.busy||0)+Number(item.probabilities&&item.probabilities.veryBusy||0)))};
  }
  const result=planForecastLeg(candidate,0,[candidate],from,date,eventJourney);
  return {primary:result,legs:[result],score:Number(result.score)||2,busyProbability:Number(result.probabilities&&result.probabilities.busy||0)+Number(result.probabilities&&result.probabilities.veryBusy||0)};
}
function planConnectionStress(candidate){
  if(!candidate||Number(candidate.changes||0)===0)return 0;
  const minutes=Number(candidate.connectionMinutes),minimum=Number(candidate.minimumConnectionMinutes),margin=Number.isFinite(minutes)&&Number.isFinite(minimum)?minutes-minimum:0;
  let value=margin<5?1:margin<10?.75:margin<18?.38:.12;
  if(minutes>45)value+=.12;
  const recovery=Array.isArray(candidate.recoveryOptions)?candidate.recoveryOptions.length:0;if(!recovery)value+=.12;else if(recovery>=2)value-=.08;
  return Math.max(0,Math.min(1,value));
}
function normaliseMetric(value,min,max){const n=Number(value);if(!Number.isFinite(n)||!Number.isFinite(min)||!Number.isFinite(max)||max<=min)return 0;return Math.max(0,Math.min(1,(n-min)/(max-min)));}
function preferenceScore(row,preference,bounds){
  const arrival=normaliseMetric(row.arrivalMinute,bounds.minArrival,bounds.maxArrival),duration=normaliseMetric(row.totalMinutes,bounds.minDuration,bounds.maxDuration),crowd=Math.max(0,Math.min(1,((Number(row.forecast&&row.forecast.score)||2)-.25)/4.75)),changes=Number(row.changes||0)>0?1:0,connection=planConnectionStress(row);
  if(preference==='fastest')return arrival*.55+duration*.25+crowd*.08+changes*.08+connection*.04;
  if(preference==='quieter')return crowd*.60+arrival*.15+duration*.10+changes*.08+connection*.07;
  if(preference==='fewer-changes')return changes*.65+arrival*.14+duration*.08+crowd*.08+connection*.05;
  if(preference==='least-stressful')return changes*.38+crowd*.30+connection*.24+arrival*.05+duration*.03;
  return arrival*.25+duration*.20+crowd*.20+changes*.20+connection*.15;
}
function planRankEnriched(rows,preference='balanced'){
  const list=(Array.isArray(rows)?rows:[]).slice();if(!list.length)return list;
  const bounds={minArrival:Math.min(...list.map(row=>Number(row.arrivalMinute))),maxArrival:Math.max(...list.map(row=>Number(row.arrivalMinute))),minDuration:Math.min(...list.map(row=>Number(row.totalMinutes))),maxDuration:Math.max(...list.map(row=>Number(row.totalMinutes)))};
  list.forEach(row=>{row.preferenceScore=preferenceScore(row,preference,bounds);});
  return list.sort((a,b)=>a.preferenceScore-b.preferenceScore||a.arrivalMinute-b.arrivalMinute||a.departureMinute-b.departureMinute);
}
function planTradeoff(row,all,index){
  const fastest=all.reduce((best,item)=>!best||item.arrivalMinute<best.arrivalMinute?item:best,null),quietest=all.reduce((best,item)=>!best||Number(item.forecast&&item.forecast.score)<Number(best.forecast&&best.forecast.score)?item:best,null),parts=[];
  if(index===0)parts.push(`Best match for ${PLAN_PREFERENCES[planState.preference]?.label||'your preference'}`);
  if(Number(row.changes||0)===0)parts.push('direct');
  else{const margin=Number(row.interchange&&row.interchange.margin);if(Number.isFinite(margin))parts.push(`${Math.max(0,Math.round(margin))} min connection margin`);}
  if(fastest&&row!==fastest){const later=Math.max(0,Math.round(row.arrivalMinute-fastest.arrivalMinute));if(later)parts.push(`${later} min later arrival than earliest`);}
  if(quietest&&row===quietest)parts.push('lowest Forecast v4 crowding score in this window');
  else if(quietest&&Number(row.forecast&&row.forecast.score)-Number(quietest.forecast&&quietest.forecast.score)>=.45)parts.push('forecast busier than the quietest option');
  return `${parts.join(' · ')}.`;
}
function planCrowdClass(level){return ['quiet','moderate','busy','very-busy'].includes(level)?level:'unknown';}
function planPointName(point,fallback=''){return String(point&&(point.name||point.locationName||point.stationName||point.crs)||fallback||'').trim();}
function planPlatformText(leg){const depart=String(leg&&leg.platform||'').trim(),arrive=String(leg&&leg.arrivalPlatform||'').trim();if(depart&&arrive)return `Scheduled platforms ${depart} → ${arrive}`;if(depart)return `Scheduled departure platform ${depart}`;if(arrive)return `Scheduled arrival platform ${arrive}`;return'';}
function planLegDetailMarkup(leg,index,forecast,row){
  const first=index===0,from=planPointName(leg&&leg.from,first?planState.from&&planState.from.name:''),to=planPointName(leg&&(leg.to||leg.routeDestination),!first&&row&&row.interchange?row.interchange.name:planState.to&&planState.to.name),depart=String(leg&&(leg.std||leg.departure)||''),arrive=String(leg&&leg.arrival||''),operator=String(leg&&leg.operator||row&&row.operator||'Scheduled service'),platforms=planPlatformText(leg),forecastLabel=String(forecast&&forecast.label||'');
  const meta=[operator,platforms,forecastLabel?`Forecast v4: ${forecastLabel}`:''].filter(Boolean).join(' · ');
  return `<div class="plan-detail-leg"><span>Leg ${index+1}</span><strong>${esc(depart)} ${esc(from||'Departure')} → ${esc(arrive)} ${esc(to||'Arrival')}</strong>${meta?`<small>${esc(meta)}</small>`:''}</div>`;
}
function planConnectionSourceLabel(row){if(String(row&&row.minimumConnectionSource||'')==='licensed'){const authority=String(row&&row.minimumConnectionAuthority||'').trim();return authority?`Licensed station minimum · ${authority}`:'Licensed station minimum';}return'Kerbside planning buffer';}
function planRecoveryDetailMarkup(row){
  const options=Array.isArray(row&&row.recoveryOptions)?row.recoveryOptions:[];if(!options.length)return'';
  const next=options[0]||{},count=options.length,depart=String(next.std||next.departure||''),arrive=String(next.arrival||''),operator=String(next.operator||'Scheduled service');
  return `<div class="plan-detail-recovery"><strong>Later timetable option${count===1?'':'s'} identified</strong><span>Next: ${esc(depart)} → ${esc(arrive)} · ${esc(operator)}${count>1?` · ${count} options found`:''}</span><small>Ticket validity for an alternative service depends on your ticket; Kerbside does not assess that here.</small></div>`;
}
function planJourneyDetailsMarkup(row){
  const isConnection=Number(row&&row.changes||0)>0&&Array.isArray(row&&row.legs)&&row.legs.length>1,legs=isConnection?row.legs:[row],forecasts=Array.isArray(row&&row.forecast&&row.forecast.legs)?row.forecast.legs:[];
  const legMarkup=legs.map((leg,index)=>planLegDetailMarkup(leg,index,forecasts[index]||row&&row.forecast&&row.forecast.primary,row)).join('');
  let changeMarkup='';
  if(isConnection){const interchange=row.interchange||{},name=String(interchange.name||interchange.locationName||interchange.crs||'Interchange'),minutes=Number(row.connectionMinutes),minimum=Number(row.minimumConnectionMinutes),margin=Number(interchange.margin),parts=[];if(Number.isFinite(minimum))parts.push(`Base minimum ${Math.round(minimum)} min`);if(Number.isFinite(margin))parts.push(`${Math.max(0,Math.round(margin))} min margin`);parts.push(planConnectionSourceLabel(row));changeMarkup=`<div class="plan-detail-change"><strong>Change at ${esc(name)}${Number.isFinite(minutes)?` · ${Math.round(minutes)} min`:''}</strong><span>${esc(parts.filter(Boolean).join(' · '))}</span></div>`;}
  return `<details class="plan-result-details"><summary>Journey details</summary><div class="plan-details-body">${legMarkup}${changeMarkup}${planRecoveryDetailMarkup(row)}</div></details>`;
}
function planResultMarkup(row,index,all){
  const forecast=row.forecast&&row.forecast.primary||{},level=planCrowdClass(forecast.level),changeText=Number(row.changes||0)===0?'Direct':`1 change at ${esc(row.interchange&&row.interchange.name||row.interchange&&row.interchange.crs||'interchange')}`,confidence=forecast.confidence?`${forecast.confidence} confidence`:'Forecast v4',key=planCandidateKey(row),saved=planSavedEntryForCandidate(row),focus=planState.savedFocus&&planState.savedFocus.candidateKey===key?planState.savedFocus:null;
  const reasons=(forecast.reasons||[]).slice(0,2).map(reason=>`<li>${esc(reason)}</li>`).join('');
  const focusText=focus?(focus.resolution==='closest'?'Closest current match · review before relying on it':'Saved journey · refreshed from current data'):'';
  return `<article class="plan-journey-result${index===0?' best':''}${focus?' is-saved-focus':''}" data-plan-rank="${index+1}" data-plan-key="${esc(key)}">
    <div class="plan-result-rank"><span>${index===0?'Best match':`#${index+1}`}</span><b>${esc(row.std||row.departure||'')} → ${esc(row.arrival||'')}</b></div>
    <div class="plan-result-route"><strong>${esc(row.operator||'Scheduled services')}</strong><span>${changeText} · ${esc(planDuration(row.totalMinutes))}</span></div>
    <div class="plan-result-crowd crowd-${level}"><i></i><strong>${esc(forecast.label||'Forecast unavailable')}</strong><span>${esc(confidence)}</span></div>
    <p class="plan-result-tradeoff">${esc(planTradeoff(row,all,index))}</p>
    ${reasons?`<ul class="plan-result-reasons">${reasons}</ul>`:''}
    <div class="plan-result-actions"><button type="button" class="plan-save-action" data-plan-save-key="${esc(key)}" aria-pressed="${saved?'true':'false'}">${saved?'Saved':'Save journey'}</button>${focusText?`<span class="plan-saved-focus-note">${esc(focusText)}</span>`:''}</div>
    ${planJourneyDetailsMarkup(row)}
  </article>`;
}
function renderPlanResults(rows,{eventsReady=false}={}){
  const list=$('planJourneyResults'),summary=$('planJourneySummary'),meta=$('planJourneyMeta');if(!list)return;
  const source=planSourceLabel();
  if(!rows.length){list.innerHTML='<div class="train-empty"><strong>No matching journeys</strong><span>Try a wider time window or relax your journey constraints.</span></div>';if(summary)summary.textContent='No journeys found';if(meta)meta.textContent=`${source} · ${planConstraintLabel()} · Forecast v4`;return;}
  const visible=planVisibleResults(rows);list.innerHTML=visible.map(row=>planResultMarkup(row,rows.indexOf(row),rows)).join('');
  const from=planState.from,to=planState.to,date=planDateValue();if(summary)summary.textContent=`${from?from.name:'From'} → ${to?to.name:'To'}`;
  if(meta)meta.textContent=`${date} · ${source} · ${PLAN_PREFERENCES[planState.preference]?.label||'Balanced'} ranking · ${planConstraintLabel()} · Forecast v4${eventsReady?' + event context':''}`;
}
function planEventSnapshot(events,date){
  const api=window.__KERBSIDE_EVENTS__;if(!api||!api.state)return()=>{};
  const previous={events:api.state.events,date:api.state.date,sources:api.state.sources,status:api.state.status,updatedAt:api.state.updatedAt};
  if(Array.isArray(events)){
    api.state.events=events.map(item=>api.normalise?api.normalise(item):item).filter(Boolean);api.state.date=date;api.state.sources=[...new Set(events.map(item=>item&&item.source).filter(Boolean))];api.state.status='ready';api.state.updatedAt=Date.now();
  }
  return()=>Object.assign(api.state,previous);
}
function enrichPlanCandidates(candidates,from,to,date,events=null){
  const restore=planEventSnapshot(events,date);
  try{return (Array.isArray(candidates)?candidates:[]).map(candidate=>({...candidate,forecast:planForecastCandidate(candidate,from,to,date)}));}
  finally{restore();}
}
async function withTimeout(promise,ms){let timer;try{return await Promise.race([promise,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),ms);})]);}finally{if(timer)clearTimeout(timer);}}
async function loadPlanEvents(from,to,date,candidates){
  const api=window.__KERBSIDE_EVENTS__;if(!api)return null;
  const interchanges=[...new Set((candidates||[]).map(item=>planInterchangeStation(item)?.name).filter(Boolean))].slice(0,4);
  const journey={origin:from.name,originCrs:from.crs,destination:to.name,destinationCrs:to.crs,interchanges,date};
  const work=Promise.allSettled([
    typeof api.footballEventsFor==='function'?api.footballEventsFor(date):Promise.resolve([]),
    typeof api.wikidataEventsForJourney==='function'?api.wikidataEventsForJourney(journey):Promise.resolve([])
  ]).then(results=>{
    const rows=[];for(const result of results)if(result.status==='fulfilled'&&Array.isArray(result.value))rows.push(...result.value);
    const seen=new Set();return rows.filter(item=>{const key=`${String(item&&item.title||'').toLowerCase()}|${String(item&&item.startTime||'')}`;if(!key||seen.has(key))return false;seen.add(key);return true;});
  });
  return withTimeout(work,PLAN_EVENT_TIMEOUT_MS);
}
async function searchPlanJourneys(options={}){
  const button=$('planJourneySearch');if(button){button.disabled=true;button.textContent='Comparing…';}
  if(!options||options.keepSavedFocus!==true)planState.savedFocus=null;planState.eventsReady=false;
  const seq=++planState.searchSeq;planSetMessage('');
  try{
    const from=await resolvePlanStation('from');if(!from){planSetMessage('Choose a departure station from the suggestions.',true);$('planJourneyFrom')?.focus();return;}
    const to=await resolvePlanStation('to');if(!to){planSetMessage('Choose a destination station from the suggestions.',true);$('planJourneyTo')?.focus();return;}
    if(from.crs===to.crs){planSetMessage('Departure and destination must be different stations.',true);return;}
    const date=planDateValue(),start=$('planJourneyStart')?.value||'',end=$('planJourneyEnd')?.value||'',startMinute=planTimeMinutes(start),endMinute=planTimeMinutes(end);
    if(!date){planSetMessage('Choose a travel date.',true);return;}
    if(startMinute==null||endMinute==null||endMinute<=startMinute){planSetMessage('Choose an end time later than the start time.',true);return;}
    const provider=window.__KERBSIDE_TIMETABLE_PROVIDER__;if(!provider){throw new Error('The timetable provider is still loading.');}
    const getter=typeof provider.getJourneyOptions==='function'?provider.getJourneyOptions.bind(provider):provider.getServices.bind(provider);
    const candidates=await getter({from:from.crs,to:to.crs,date,departAfter:start,departBefore:end,maxResults:PLAN_MAX_CANDIDATES});
    if(seq!==planState.searchSeq)return;
    planState.source=String(candidates&&candidates.kerbsideSource||window.__KERBSIDE_TRAIN_TIMETABLE__?.state?.scheduleSource||'');
    const windowCandidates=(candidates||[]).filter(item=>Number(item.departureMinute)>=startMinute&&Number(item.departureMinute)<=endMinute);
    planState.constraints=planConstraintsFromForm();
    const eligibleCandidates=planFilterCandidates(windowCandidates,planState.constraints);
    if(!eligibleCandidates.length){planState.results=[];renderPlanResults([]);planSetMessage(`No journeys in this window meet ${planConstraintLabel()}. Relax the constraints or widen the time window.`);return;}
    const enriched=enrichPlanCandidates(eligibleCandidates,from,to,date,null),ranked=planRankEnriched(enriched,planState.preference);planState.results=ranked;renderPlanResults(ranked);
    planSetMessage(planComparisonMessage(windowCandidates.length,eligibleCandidates.length,{checking:true}));
    const eventSeq=++planState.eventSeq,events=await loadPlanEvents(from,to,date,eligibleCandidates);
    if(seq!==planState.searchSeq||eventSeq!==planState.eventSeq||!events)return;
    const updated=planRankEnriched(enrichPlanCandidates(eligibleCandidates,from,to,date,events),planState.preference);planState.results=updated;planState.eventsReady=true;renderPlanResults(updated,{eventsReady:true});
    planSetMessage(planComparisonMessage(windowCandidates.length,eligibleCandidates.length,{eventsReady:true}));
  }catch(error){if(seq===planState.searchSeq)planSetMessage(error&&error.message?error.message:'Journey comparison is temporarily unavailable.',true);}
  finally{if(button){button.disabled=false;button.textContent='Compare journeys';}}
}
function planRefreshRanking(){if(!planState.results.length)return;planState.preference=$('planJourneyPreference')?.value||planState.preference;const ranked=planRankEnriched(planState.results,planState.preference);planState.results=ranked;renderPlanResults(ranked);}
function planDefaultWindow(){const start=$('trainDepartAfter')?.value||storedTime()||'09:00',minute=planTimeMinutes(start);return {start,end:planClock(Math.min(1439,(minute==null?540:minute)+120))};}
function syncPlanDefaultsFromActive(){
  if(planState.results.length)return;
  const current=planStation(window.__KERBSIDE_TRAINS__?.state?.station),destination=planStation(window.__KERBSIDE_TRAIN_ROUTES__?.state?.destination);
  if(current)selectPlanStation('from',current);if(destination)selectPlanStation('to',destination);
  const date=$('planJourneyDate'),selected=dateApi()?.state?.date||'';if(date&&selected)date.value=selected;
  const windowValue=planDefaultWindow(),start=$('planJourneyStart'),end=$('planJourneyEnd');if(start)start.value=windowValue.start;if(end)end.value=windowValue.end;
}
async function planApplyCoverage(){
  const input=$('planJourneyDate'),provider=window.__KERBSIDE_TIMETABLE_PROVIDER__;if(!input||!provider||typeof provider.getCoverage!=='function')return;
  try{const manifest=await provider.getCoverage(),dates=(manifest&&Array.isArray(manifest.dates)?manifest.dates:[]).slice().sort();if(!dates.length)return;const today=dateApi()?.state?.date||dates[0];input.min=dates[0];input.max=dates[dates.length-1];if(!input.value||!dates.includes(input.value))input.value=dates.includes(today)?today:dates[0];}catch(error){}
}
function planSnapshotHidden(root,keep){
  if(!root)return;for(const child of [...root.children]){if(keep.has(child))continue;if(!planState.hidden.has(child))planState.hidden.set(child,!!child.hidden);child.hidden=true;}
}
function planRestoreHidden(){for(const [element,hidden] of planState.hidden){if(element&&element.isConnected)element.hidden=hidden;}planState.hidden.clear();}
function setPlanView(active){
  planState.active=!!active;const sidebar=document.querySelector('.train-sidebar'),content=document.querySelector('.train-content'),tabs=$('trainViewTabs'),form=$('planJourneyForm'),results=$('planJourneySurface');if(!sidebar||!content||!tabs||!form||!results)return;
  tabs.querySelectorAll('[data-train-view]').forEach(button=>{const selected=button.dataset.trainView===(active?'plan':'trains');button.setAttribute('aria-selected',String(selected));button.setAttribute('aria-pressed',String(selected));});
  if(active){syncPlanDefaultsFromActive();planState.hidden.clear();planSnapshotHidden(sidebar,new Set([tabs,form]));planSnapshotHidden(content,new Set([results]));form.hidden=false;results.hidden=false;planApplyCoverage();}
  else{form.hidden=true;results.hidden=true;planRestoreHidden();window.__KERBSIDE_EVENTS__?.refresh?.();window.__KERBSIDE_TRAIN_TIMETABLE__?.sync?.();}
}
function installPlanStyles(){if($('kerbsidePlanJourneyStyles'))return;const style=document.createElement('style');style.id='kerbsidePlanJourneyStyles';style.textContent=`
.train-view-tabs{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin:0 0 14px;padding:3px;border:1px solid var(--rule);border-radius:10px;background:var(--ink)}
.train-view-tabs button{min-height:36px;padding:7px 9px;border-radius:7px;color:var(--text-dim);font-size:11px;font-weight:800}
.train-view-tabs button[aria-selected="true"]{background:var(--led);color:var(--on-accent)}
.plan-journey-form{display:grid;gap:12px}.train-sidebar>[hidden],.train-content>[hidden],.plan-journey-form[hidden],.plan-journey-surface[hidden]{display:none!important}
.plan-journey-form h2{margin:4px 0 0;font-size:24px}.plan-journey-form>p{margin:-5px 0 3px;color:var(--text-dim);font-size:12px;line-height:1.5}
.plan-field{display:grid;gap:5px;position:relative}.plan-field>span{color:var(--text-dim);font-size:10px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
.plan-field input,.plan-field select{width:100%;min-width:0;padding:11px;border:1px solid var(--rule);border-radius:10px;background:var(--ink);color:var(--text);font-size:16px}
.plan-time-grid,.plan-constraint-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.plan-journey-form .train-suggest{top:calc(100% + 4px)}
.plan-preference-note,.plan-constraint-note{margin:-5px 1px 0;color:var(--text-mute);font-size:10px;line-height:1.45}
.plan-search{min-height:48px;border:1px solid var(--led);border-radius:12px;background:var(--led);color:var(--on-accent);font-weight:800}.plan-search:disabled{opacity:.6}
.plan-message{min-height:15px;color:var(--text-dim);font-size:10.5px;line-height:1.45}.plan-message.error{color:var(--warn)}
.plan-journey-surface{display:flex;flex-direction:column;min-height:0}.plan-results-head{padding:18px 20px 14px;border-bottom:1px solid var(--rule);background:var(--ink-2)}
.plan-results-head h2{margin:5px 0 0;font-size:21px}.plan-results-head p{margin:4px 0 0;color:var(--text-dim);font-size:11px}
.plan-results-list{flex:1;min-height:0;overflow-y:auto;padding:12px 16px 24px;overscroll-behavior:contain}
.plan-journey-result{display:grid;grid-template-columns:105px minmax(160px,1fr) 125px;gap:9px 14px;margin:0 0 9px;padding:14px;border:1px solid var(--rule);border-radius:12px;background:var(--ink-2)}
.plan-journey-result.best{border-color:rgb(var(--led-rgb) / .58);box-shadow:inset 3px 0 0 var(--led)}
.plan-result-rank,.plan-result-route,.plan-result-crowd{display:flex;flex-direction:column;min-width:0}.plan-result-rank span{color:var(--led);font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.plan-result-rank b{margin-top:4px;font-family:'Martian Mono',monospace;font-size:13px;color:var(--text)}
.plan-result-route strong{font-size:12px}.plan-result-route span,.plan-result-crowd span{margin-top:3px;color:var(--text-dim);font-size:10px}.plan-result-crowd{position:relative;padding-left:13px}.plan-result-crowd>i{position:absolute;left:0;top:5px;width:7px;height:7px;border-radius:50%}.plan-result-crowd strong{font-size:11px}
.plan-result-tradeoff{grid-column:1/-1;margin:0;color:var(--text-dim);font-size:11px;line-height:1.45}.plan-result-reasons{grid-column:1/-1;display:grid;gap:3px;margin:0;padding-left:17px;color:var(--text-mute);font-size:10px;line-height:1.4}.plan-result-reasons li::marker{color:var(--led)}
.plan-result-details{grid-column:1/-1;border-top:1px solid var(--rule);padding-top:9px}.plan-result-details summary{width:max-content;max-width:100%;cursor:pointer;color:var(--led);font-size:10px;font-weight:800;letter-spacing:.03em}.plan-result-details summary:focus-visible{outline:2px solid var(--led);outline-offset:3px;border-radius:3px}.plan-details-body{display:grid;gap:8px;margin-top:10px}.plan-detail-leg,.plan-detail-change,.plan-detail-recovery{display:grid;gap:3px;padding:9px 10px;border:1px solid var(--rule);border-radius:9px;background:var(--ink)}.plan-detail-leg>span{color:var(--led);font-size:8.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.plan-detail-leg strong,.plan-detail-change strong,.plan-detail-recovery strong{font-size:10.5px;line-height:1.4}.plan-detail-leg small,.plan-detail-change span,.plan-detail-recovery span,.plan-detail-recovery small{color:var(--text-dim);font-size:9.5px;line-height:1.45}.plan-detail-recovery small{color:var(--text-mute)}
.plan-result-actions{grid-column:1/-1;display:flex;align-items:center;gap:9px;flex-wrap:wrap}.plan-save-action{min-height:34px;padding:7px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--ink);color:var(--text);font-size:10px;font-weight:800}.plan-save-action[aria-pressed="true"]{border-color:rgb(var(--led-rgb) / .45);color:var(--led)}.plan-saved-focus-note{color:var(--led);font-size:9.5px;font-weight:700}.plan-journey-result.is-saved-focus{border-color:rgb(var(--led-rgb) / .72);box-shadow:inset 3px 0 0 var(--led)}
.plan-saved-panel{border-top:1px solid var(--rule);padding-top:8px}.plan-saved-panel>summary{cursor:pointer;color:var(--text);font-size:11px;font-weight:800}.plan-saved-panel>summary span{color:var(--led)}.plan-saved-list{display:grid;gap:6px;margin-top:8px}.plan-saved-empty{padding:8px 0;color:var(--text-mute);font-size:10px;line-height:1.45}.plan-saved-row{display:grid;gap:7px;padding:9px;border:1px solid var(--rule);border-radius:9px;background:var(--ink-2)}.plan-saved-row>div:first-child{display:grid;gap:2px}.plan-saved-row strong{font-size:10.5px;line-height:1.35}.plan-saved-row span{color:var(--text-dim);font-size:9.5px}.plan-saved-actions{display:flex;gap:6px}.plan-saved-actions button{padding:6px 8px;border:1px solid var(--rule);border-radius:7px;background:var(--ink);color:var(--text);font-size:9.5px;font-weight:700}.plan-saved-actions button:first-child{color:var(--led)}
@media(max-width:820px){.train-view-tabs{margin:0 0 8px}.plan-journey-form{gap:9px}.plan-journey-form h2{display:block!important;font-size:18px}.plan-journey-form>p{font-size:11px}.plan-journey-surface{flex:0 0 auto}.plan-results-head{padding:11px 12px 9px}.plan-results-head h2{font-size:17px}.plan-results-list{overflow:visible;padding:8px 9px calc(18px + env(safe-area-inset-bottom))}.plan-journey-result{grid-template-columns:90px minmax(0,1fr);gap:7px 11px;padding:11px}.plan-result-crowd{grid-column:2}.plan-result-tradeoff,.plan-result-reasons{grid-column:1/-1}}
@media(max-width:430px){.plan-time-grid{grid-template-columns:1fr 1fr}.plan-constraint-grid{grid-template-columns:1fr}.plan-journey-result{grid-template-columns:82px minmax(0,1fr)}}
`;document.head.appendChild(style);}
function installPlanJourney(){
  if(planState.installed)return true;const sidebar=document.querySelector('.train-sidebar'),content=document.querySelector('.train-content'),planner=$('trainPlanner');if(!sidebar||!content||!planner)return false;
  installPlanStyles();
  const tabs=document.createElement('div');tabs.id='trainViewTabs';tabs.className='train-view-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Train view');tabs.innerHTML='<button type="button" role="tab" data-train-view="trains" aria-selected="true" aria-pressed="true">Trains</button><button type="button" role="tab" data-train-view="plan" aria-selected="false" aria-pressed="false">Plan my journey</button>';sidebar.insertBefore(tabs,sidebar.firstChild);
  const form=document.createElement('section');form.id='planJourneyForm';form.className='plan-journey-form';form.hidden=true;const windowValue=planDefaultWindow(),selectedDate=dateApi()?.state?.date||'';planState.preference=planPreference();planState.constraints=planConstraints();form.innerHTML=`<div class="train-kicker">Journey planner</div><h2>Plan my journey</h2><p>Compare trains in a time window and rank them by what matters to you.</p>
    <label class="plan-field"><span>From</span><input id="planJourneyFrom" type="text" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="planJourneyFromSuggest" placeholder="Birmingham New Street"><div id="planJourneyFromSuggest" class="train-suggest" role="listbox" hidden></div></label>
    <label class="plan-field"><span>To</span><input id="planJourneyTo" type="text" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="planJourneyToSuggest" placeholder="Bristol Temple Meads"><div id="planJourneyToSuggest" class="train-suggest" role="listbox" hidden></div></label>
    <label class="plan-field"><span>Date</span><input id="planJourneyDate" type="date" value="${esc(selectedDate)}"></label>
    <div class="plan-time-grid"><label class="plan-field"><span>From time</span><input id="planJourneyStart" type="time" step="60" value="${esc(windowValue.start)}"></label><label class="plan-field"><span>Until</span><input id="planJourneyEnd" type="time" step="60" value="${esc(windowValue.end)}"></label></div>
    <label class="plan-field"><span>Preference</span><select id="planJourneyPreference">${Object.entries(PLAN_PREFERENCES).map(([value,item])=>`<option value="${value}"${value===planState.preference?' selected':''}>${item.label}</option>`).join('')}</select></label>
    <div class="plan-constraint-grid"><label class="plan-field"><span>Changes</span><select id="planJourneyMaxChanges"><option value="1"${planState.constraints.maxChanges===1?' selected':''}>Up to 1 change</option><option value="0"${planState.constraints.maxChanges===0?' selected':''}>Direct only</option></select></label><label class="plan-field"><span>Connection buffer</span><select id="planJourneyConnectionBuffer"><option value="0"${planState.constraints.connectionBuffer===0?' selected':''}>Base minimum</option><option value="5"${planState.constraints.connectionBuffer===5?' selected':''}>+5 minutes</option><option value="10"${planState.constraints.connectionBuffer===10?' selected':''}>+10 minutes</option><option value="15"${planState.constraints.connectionBuffer===15?' selected':''}>+15 minutes</option></select></label></div>
    <p class="plan-constraint-note">The connection buffer is added on top of the minimum already used by Kerbside. That is a licensed station rule where available, otherwise Kerbside's conservative planning buffer; the extra buffer never shortens it.</p>
    <p class="plan-preference-note">Your preference and journey constraints are saved on this device. All options still use the same official timetable and Forecast v4 evidence.</p>
    <button id="planJourneySearch" class="plan-search" type="button">Compare journeys</button><div id="planJourneyMessage" class="plan-message" aria-live="polite"></div><details id="planSavedPanel" class="plan-saved-panel"><summary>Saved journeys <span id="planSavedCount">0</span></summary><div id="planSavedJourneys" class="plan-saved-list"></div></details>`;
  sidebar.insertBefore(form,planner);
  const surface=document.createElement('section');surface.id='planJourneySurface';surface.className='plan-journey-surface';surface.hidden=true;surface.innerHTML='<header class="plan-results-head"><div class="train-kicker">Ranked options</div><h2 id="planJourneySummary">Plan a journey</h2><p id="planJourneyMeta">Choose a route and time window to compare official timetable options.</p></header><div id="planJourneyResults" class="plan-results-list"><div class="train-empty"><strong>No comparison yet</strong><span>Your ranked journey options will appear here.</span></div></div>';content.appendChild(surface);
  tabs.querySelector('[data-train-view="trains"]').addEventListener('click',()=>setPlanView(false));tabs.querySelector('[data-train-view="plan"]').addEventListener('click',()=>setPlanView(true));
  bindPlanAutocomplete('from');bindPlanAutocomplete('to');$('planJourneySearch').addEventListener('click',searchPlanJourneys);$('planJourneyPreference').addEventListener('change',event=>{savePlanPreference(event.target.value);planRefreshRanking();});$('planJourneyMaxChanges').addEventListener('change',planConstraintChanged);$('planJourneyConnectionBuffer').addEventListener('change',planConstraintChanged);planSyncConstraintAvailability();planState.saved=readSavedJourneys();renderSavedJourneys();
  $('planJourneyResults').addEventListener('click',event=>{const button=event.target&&event.target.closest&&event.target.closest('[data-plan-save-key]');if(button)planToggleSavedByKey(button.getAttribute('data-plan-save-key'));});$('planSavedJourneys').addEventListener('click',event=>{const open=event.target&&event.target.closest&&event.target.closest('[data-plan-open-saved]'),remove=event.target&&event.target.closest&&event.target.closest('[data-plan-remove-saved]');if(open)planOpenSavedJourney(open.getAttribute('data-plan-open-saved'));else if(remove)planRemoveSavedJourney(remove.getAttribute('data-plan-remove-saved'));});
  const current=planStation(window.__KERBSIDE_TRAINS__?.state?.station),destination=planStation(window.__KERBSIDE_TRAIN_ROUTES__?.state?.destination);if(current)selectPlanStation('from',current);if(destination)selectPlanStation('to',destination);
  planState.observer=new MutationObserver(()=>{if(planState.active)planSnapshotHidden(content,new Set([surface]));});planState.observer.observe(content,{childList:true});planState.installed=true;return true;
}

function init(){if(!install()){if(++initAttempts<INIT_RETRY_MAX)setTimeout(init,INIT_RETRY_MS);else console.warn('Kerbside journey planner could not attach.');return;}initAttempts=0;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,isFutureJourney,syncRouteOrigin,refreshJourneyBoard,syncDepartAfterForDate,railNow,installPlanJourney,setPlanView,searchPlanJourneys,planRankEnriched,preferenceScore,planConnectionStress,normalisePlanConstraints,planCandidateMeetsConstraints,planFilterCandidates,readSavedJourneys,planMatchSavedJourney,planOpenSavedJourney,planRemoveSavedJourney,planToggleSavedByKey,get planState(){return planState;},get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};
})();
