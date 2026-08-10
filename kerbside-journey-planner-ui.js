(function(){
'use strict';

const $=id=>document.getElementById(id);
const STORE='kerbside.rail.depart-after.v1';
const PROVIDERS=[
  'https://huxley2.azurewebsites.net',
  'https://hux.azurewebsites.net',
  'https://onrails.azurewebsites.net'
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

function installStyles(){
  if($('kerbsideJourneyPlannerStyles'))return;
  const s=document.createElement('style');
  s.id='kerbsideJourneyPlannerStyles';
  s.textContent=`
.train-route-planner{position:relative;margin:4px 0 14px;padding:14px;border:1px solid var(--border);border-radius:18px;background:var(--panel);box-shadow:0 8px 24px rgb(0 0 0 / .04)}
.train-route-planner .train-search-wrap{margin:0}.train-route-planner .train-search-wrap label{font-size:10px;letter-spacing:.16em;margin-bottom:5px}.train-route-planner .train-search-box{display:block}.train-route-planner .train-search-box input{width:100%}
.train-route-planner #trainStationGo,.train-route-planner #trainDestinationGo{position:absolute!important;right:0!important;bottom:0!important;width:1px!important;height:1px!important;opacity:0!important;overflow:hidden!important;white-space:nowrap!important;padding:0!important;border:0!important}
.train-route-stack{position:relative;display:grid;gap:0}.train-route-stack:before{content:'';position:absolute;left:17px;top:43px;bottom:43px;width:2px;background:var(--border);z-index:0}
.train-route-stack .train-search-wrap{position:relative;z-index:1}.train-route-stack input{background:var(--bg);border-radius:14px;padding-left:34px;padding-right:48px}
.train-route-divider{height:9px}.train-route-dot{position:absolute;left:12px;width:12px;height:12px;border:3px solid var(--panel);border-radius:50%;background:var(--led);z-index:2}.train-route-dot.from{top:44px}.train-route-dot.to{bottom:35px}
.train-route-swap{position:absolute;right:8px;top:50%;transform:translateY(-50%);z-index:4;width:38px;height:38px;padding:0;border-radius:50%;font-size:20px;line-height:1;background:var(--panel);box-shadow:0 2px 8px rgb(0 0 0 / .08)}
.train-route-meta{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:10px}.train-route-meta .train-destination-clear{margin:0;font-size:10px}.train-planner-time{display:flex;align-items:center;gap:7px;font-size:10px;color:var(--text-dim);white-space:nowrap}.train-planner-time input{width:104px;padding:7px 9px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text)}
.train-date-wrap{margin:10px 0 0!important;padding-top:10px;border-top:1px solid var(--border)}.train-date-row{grid-template-columns:minmax(0,1fr) auto!important}.train-date-today{border-radius:12px!important;padding:0 14px!important}.train-date-meta{padding:0 2px}
.train-journey-go{width:100%;min-height:48px;margin-top:12px;border-radius:14px!important;font-weight:800!important;font-size:14px!important;letter-spacing:.01em}.train-journey-go[disabled]{opacity:.62;cursor:wait}.train-planner-message{min-height:16px;margin-top:7px;color:var(--text-dim);font-size:10px;line-height:1.4}.train-planner-message.error{color:var(--danger,#d33)}
@media(max-width:620px){.train-route-planner{padding:11px;border-radius:16px}.train-route-meta{align-items:flex-start;flex-direction:column}.train-planner-time{width:100%;justify-content:space-between}.train-planner-time input{width:118px}}
`;
  document.head.appendChild(s);
}
function storedTime(){try{return localStorage.getItem(STORE)||'09:00'}catch(e){return'09:00'}}
function saveTime(v){try{localStorage.setItem(STORE,v)}catch(e){}}
function dispatch(){window.dispatchEvent(new CustomEvent('kerbside:journey-planner-change',{detail:{departAfter:$('trainDepartAfter')?.value||''}}));window.__KERBSIDE_FORECAST_V3__?.apply?.()}
function normalise(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ')}
function stationRows(json,exclude=''){
  return (Array.isArray(json)?json:[]).map(item=>({name:String(item&&item.stationName||'').trim(),crs:String(item&&item.crsCode||'').trim().toUpperCase()})).filter(item=>item.name&&/^[A-Z0-9]{3}$/.test(item.crs)&&item.crs!==exclude);
}
async function stationLookup(query,signal,exclude=''){
  const q=String(query||'').trim();
  if(q.length<2)return[];
  const response=await resilientRailFetch(`${PROVIDERS[0]}/crs/${encodeURIComponent(q)}`,{signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`Station search returned ${response.status}`);
  return stationRows(await response.json(),exclude);
}
function bestMatch(items,query){
  const q=normalise(query),crs=String(query||'').trim().toUpperCase();
  return items.find(item=>item.crs===crs)||items.find(item=>normalise(item.name)===q)||(items.length===1?items[0]:null);
}
function renderFromSuggestions(items){
  const el=$('trainSuggest');if(!el)return;
  if(!items.length){el.innerHTML='<div class="train-suggest-empty">No matching stations found.</div>';el.hidden=false;return;}
  el.innerHTML=items.slice(0,8).map((item,index)=>`<button type="button" role="option" data-k-from="${index}"><span>${item.name.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span><b>${item.crs}</b></button>`).join('');
  el.hidden=false;
  [...el.querySelectorAll('[data-k-from]')].forEach((button,index)=>button.addEventListener('click',()=>selectOrigin(items[index])));
}
function renderToSuggestions(items){
  const el=$('trainDestinationSuggest');if(!el)return;
  if(!items.length){el.innerHTML='<div class="train-suggest-empty">No matching destination stations found.</div>';el.hidden=false;return;}
  el.innerHTML=items.slice(0,8).map((item,index)=>`<button type="button" role="option" data-k-to="${index}"><span>${item.name.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span><b>${item.crs}</b></button>`).join('');
  el.hidden=false;
  [...el.querySelectorAll('[data-k-to]')].forEach((button,index)=>button.addEventListener('click',()=>selectDestination(items[index])));
}
function selectOrigin(item){
  if(!item)return;
  const input=$('trainStationQuery'),go=$('trainStationGo');
  if(!input||!go)return;
  input.value=item.crs;
  go.click();
  setTimeout(()=>{if(input)input.value=item.name;const el=$('trainSuggest');if(el){el.hidden=true;el.innerHTML='';}},0);
}
function selectDestination(item){
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  if(!route||!item)return;
  route.selectDestination(item);
  const el=$('trainDestinationSuggest');if(el){el.hidden=true;el.innerHTML='';}
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
  if(selected&&(normalise(q)===normalise(selected.name)||q.toUpperCase()===String(selected.crs||'').toUpperCase()))return true;
  const ctl=new AbortController();
  const items=await stationLookup(q,ctl.signal);
  const match=bestMatch(items,q);
  if(!match){renderFromSuggestions(items);plannerMessage('Choose the departure station from the suggestions.',true);return false;}
  selectOrigin(match);
  const start=Date.now();
  while(Date.now()-start<1500){
    if(api.state&&api.state.station&&String(api.state.station.crs).toUpperCase()===match.crs)return true;
    await new Promise(resolve=>setTimeout(resolve,30));
  }
  return false;
}
async function resolveDestination(){
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
  selectDestination(match);
  return true;
}
async function findTrains(){
  const button=$('trainJourneyGo');
  if(button){button.disabled=true;button.textContent='Finding trains…';}
  plannerMessage('');
  try{
    if(!(await resolveOrigin()))return;
    const to=$('trainDestinationQuery');
    if(!to||to.value.trim().length<2){plannerMessage('Add a destination to search this journey.',true);to?.focus();return;}
    if(!(await resolveDestination()))return;
    plannerMessage('Live journey loaded.');
    dispatch();
  }catch(error){
    plannerMessage(error&&error.message?error.message:'Train search is temporarily unavailable.',true);
  }finally{
    if(button){button.disabled=false;button.textContent='Find trains';}
  }
}
async function swap(){
  const api=window.__KERBSIDE_TRAINS__,route=window.__KERBSIDE_TRAIN_ROUTES__;
  if(!api||!route)return;
  const origin=api.state&&api.state.station,destination=route.state&&route.state.destination;
  if(!origin||!destination)return;
  route.clearDestination({reload:false});
  selectOrigin(destination);
  const start=Date.now();
  while(Date.now()-start<1200){
    if(api.state&&api.state.station&&String(api.state.station.crs).toUpperCase()===destination.crs.toUpperCase())break;
    await new Promise(resolve=>setTimeout(resolve,30));
  }
  const to=$('trainDestinationQuery');if(to)to.value=origin.name||origin.crs;
  selectDestination({name:origin.name||origin.crs,crs:origin.crs});
}
function bindRobustInputs(){
  const from=cloneInput('trainStationQuery'),to=cloneInput('trainDestinationQuery');
  if(from){
    from.addEventListener('input',()=>{
      const api=window.__KERBSIDE_TRAINS__,route=window.__KERBSIDE_TRAIN_ROUTES__,selected=api&&api.state&&api.state.station;
      const matches=selected&&(normalise(from.value)===normalise(selected.name)||from.value.trim().toUpperCase()===String(selected.crs||'').toUpperCase());
      if(!matches&&route&&route.state){route.state.fromCrs='';route.clearDestination({disable:true});}
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
function install(){
  installStyles();
  const from=$('trainStationQuery'),to=$('trainDestinationQuery');
  if(!from||!to)return false;
  const fromWrap=from.closest('.train-search-wrap'),toWrap=to.closest('.train-search-wrap');
  if(!fromWrap||!toWrap)return false;
  if(fromWrap.closest('.train-route-planner'))return true;
  const planner=document.createElement('section');planner.className='train-route-planner';planner.setAttribute('aria-label','Plan a train journey');
  const stack=document.createElement('div');stack.className='train-route-stack';fromWrap.parentNode.insertBefore(planner,fromWrap);planner.appendChild(stack);stack.appendChild(fromWrap);
  const divider=document.createElement('div');divider.className='train-route-divider';stack.appendChild(divider);stack.appendChild(toWrap);
  const d1=document.createElement('span');d1.className='train-route-dot from';const d2=document.createElement('span');d2.className='train-route-dot to';stack.append(d1,d2);
  const swapBtn=document.createElement('button');swapBtn.type='button';swapBtn.className='train-route-swap';swapBtn.title='Swap origin and destination';swapBtn.setAttribute('aria-label','Swap origin and destination');swapBtn.textContent='⇅';swapBtn.addEventListener('click',swap);stack.appendChild(swapBtn);
  const clear=$('trainDestinationClear'),meta=document.createElement('div');meta.className='train-route-meta';if(clear)meta.appendChild(clear);
  const time=document.createElement('label');time.className='train-planner-time';time.innerHTML='<span>Depart after</span><input id="trainDepartAfter" type="time" step="900">';meta.appendChild(time);planner.appendChild(meta);
  const input=$('trainDepartAfter');input.value=storedTime();input.addEventListener('change',()=>{saveTime(input.value);dispatch()});
  const go=document.createElement('button');go.id='trainJourneyGo';go.type='button';go.className='train-journey-go';go.textContent='Find trains';go.addEventListener('click',findTrains);planner.appendChild(go);
  const message=document.createElement('div');message.id='trainPlannerMessage';message.className='train-planner-message';message.setAttribute('aria-live','polite');planner.appendChild(message);
  setTimeout(()=>{const date=$('trainTravelDate')?.closest('.train-date-wrap');if(date&&!date.closest('.train-route-planner'))planner.insertBefore(date,go);bindRobustInputs();},0);
  return true;
}
function init(){if(!install())setTimeout(init,0)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};
})();