(function(){
'use strict';

const PRIMARY='https://huxley2.azurewebsites.net';
const SECONDARY='https://hux.azurewebsites.net';
const PROVIDERS=new Set([PRIMARY,SECONDARY]);
const STORE='kerbside.rail.depart-after.v1';
const MAX_OFFSET_MINUTES=119;
const MAX_WINDOW_MINUTES=120;
const MAX_LIVE_HORIZON=MAX_OFFSET_MINUTES+MAX_WINDOW_MINUTES;
const NON_RAIL_SUFFIX=/\((?:bus|coach|ferry)\)\s*$/i;
const $=id=>document.getElementById(id);
const state={installed:false,lastStatus:0,lastUrl:'',fallbacks:0,filteredStations:0,rejectedStations:0};
const nonRailCrs=new Set();
let upstreamFetch=null;
let boardObserver=null;
let suggestionObserver=null;
let syncTimer=null;

function parseMinutes(value){
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/);
  if(!match)return null;
  const hour=Number(match[1]),minute=Number(match[2]);
  return hour>=0&&hour<24&&minute>=0&&minute<60?hour*60+minute:null;
}
function londonMinutes(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(date);
  const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  let hour=Number(map.hour)||0;
  if(hour===24)hour=0;
  return hour*60+(Number(map.minute)||0);
}
function hhmm(minutes){
  const safe=Math.max(0,Math.min(1439,Math.round(Number(minutes)||0)));
  return `${String(Math.floor(safe/60)).padStart(2,'0')}:${String(safe%60).padStart(2,'0')}`;
}
function defaultDepartAfter(date=new Date()){
  const now=londonMinutes(date);
  const rounded=Math.min(1439,Math.ceil(now/15)*15);
  return hhmm(rounded);
}
function liveWindowFor(value,nowMinutes=londonMinutes()){
  const target=parseMinutes(value);
  if(target==null)return {mode:'live',target:null,delta:0,offset:0,window:MAX_WINDOW_MINUTES};
  const delta=target-nowMinutes;
  if(delta<=0)return {mode:'live',target,delta:0,offset:0,window:MAX_WINDOW_MINUTES};
  if(delta>MAX_LIVE_HORIZON)return {mode:'planning',target,delta,offset:null,window:null};
  return {mode:'live',target,delta,offset:Math.min(MAX_OFFSET_MINUTES,delta),window:MAX_WINDOW_MINUTES};
}
function dateApi(){return window.__KERBSIDE_TRAIN_DATE__||null;}
function isToday(){const api=dateApi();return !api||typeof api.isToday!=='function'||api.isToday();}
function journey(){
  const trains=window.__KERBSIDE_TRAINS__,routes=window.__KERBSIDE_TRAIN_ROUTES__;
  return {from:trains&&trains.state&&trains.state.station||null,to:routes&&routes.state&&routes.state.destination||null};
}
function stationName(station,fallback){return station&&(station.name||station.locationName||station.stationName||station.crs)||fallback;}
function stationCrs(station){return String(station&&(station.crs||station.crsCode)||'').trim().toUpperCase();}
function isRailStation(station){
  const name=String(stationName(station,'')||'').trim();
  const crs=stationCrs(station);
  if(!name||!crs)return false;
  if(nonRailCrs.has(crs))return false;
  if(NON_RAIL_SUFFIX.test(name)){
    nonRailCrs.add(crs);
    return false;
  }
  return true;
}
function routeText(){
  const {from,to}=journey();
  return from&&to?`${stationName(from,from.crs)} → ${stationName(to,to.crs)}`:from?stationName(from,from.crs):'Train journey';
}
function routeCodes(){
  const {from,to}=journey();
  return from&&to?`${from.crs||''} → ${to.crs||''}`:from?String(from.crs||''):'';
}
function currentDepartAfter(){return $('trainDepartAfter')?.value||defaultDepartAfter();}
function requestUrl(input){
  try{
    const raw=typeof input==='string'||input instanceof URL?String(input):input&&input.url;
    return raw?new URL(raw,location.href):null;
  }catch(error){return null;}
}
function departureRequest(url){
  if(!url||!PROVIDERS.has(url.origin))return null;
  const path=decodeURIComponent(url.pathname);
  const match=path.match(/^\/departures\/([A-Za-z0-9]{3})(?:\/to\/([A-Za-z0-9]{3}))?\/(\d+)\/?$/i);
  return match?{from:match[1].toUpperCase(),to:match[2]?match[2].toUpperCase():'',rows:match[3]}:null;
}
function timedUrl(url){
  if(!isToday()||!departureRequest(url))return url;
  const info=liveWindowFor(currentDepartAfter());
  if(info.mode!=='live'||info.delta<=0)return url;
  const next=new URL(url.toString());
  next.searchParams.set('timeOffset',String(info.offset));
  next.searchParams.set('timeWindow',String(info.window));
  return next;
}
async function liveWindowFetch(input,init){
  const original=requestUrl(input);
  if(!original||!departureRequest(original)||!isToday())return upstreamFetch(input,init);
  const next=timedUrl(original);
  state.lastUrl=next.toString();
  let response=await upstreamFetch(next.toString(),init);
  state.lastStatus=response.status;
  if(response.ok)return response;

  // The existing planner already retries network/5xx failures. It used to
  // accept a 4xx response from the first Huxley host immediately, so give the
  // second community deployment one chance before surfacing that response.
  if(next.origin===PRIMARY&&response.status<500){
    const fallback=new URL(next.toString());
    fallback.origin=SECONDARY;
    response=await upstreamFetch(fallback.toString(),init);
    state.lastStatus=response.status;
    if(response.ok)state.fallbacks++;
  }
  return response;
}
function setText(element,value){if(element&&element.textContent!==value)element.textContent=value;}
function syncHeader(status='Live departures'){
  if(!isToday())return;
  const {from,to}=journey();
  if(!from)return;
  setText($('trainStationName'),to?`${stationName(from,from.crs)} → ${stationName(to,to.crs)}`:stationName(from,from.crs));
  const codes=routeCodes();
  if(codes)setText($('trainStationMeta'),`${codes} · ${status}`);
}
function dateLabel(){
  const date=dateApi()&&dateApi().state&&dateApi().state.date;
  if(!date)return 'Today';
  const parsed=new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())?date:parsed.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
}
function plannerMessage(text,error=false){
  const el=$('trainPlannerMessage');
  if(!el)return;
  setText(el,text||'');
  el.classList.toggle('error',!!error);
}
function stopLiveBoard(){
  const trains=window.__KERBSIDE_TRAINS__;
  const abort=trains&&trains.state&&trains.state.boardAbort;
  if(abort&&typeof abort.abort==='function')abort.abort();
}
function renderSameDayPlanning(info=liveWindowFor(currentDepartAfter())){
  if(!isToday())return false;
  const {from,to}=journey();
  if(!from)return false;
  stopLiveBoard();
  const time=hhmm(info.target==null?parseMinutes(currentDepartAfter()):info.target);
  const name=$('trainStationName'),meta=$('trainStationMeta'),refresh=$('trainRefresh'),dateMeta=$('trainTravelDateMeta'),board=$('trainBoard');
  setText(name,to?routeText():stationName(from,from.crs));
  setText(meta,`${routeCodes()} · ${dateLabel()} · ${time} · same-day planning`);
  if(refresh){refresh.disabled=true;setText(refresh,'Schedule');}
  if(dateMeta){setText(dateMeta,`${dateLabel()} · same-day planning · timetable feed needed`);dateMeta.dataset.mode='planning';}
  if(board){
    const route=to?routeText():stationName(from,from.crs);
    board.innerHTML=`<div class="train-empty train-future-date train-future-card train-same-day-plan"><span class="train-future-badge">Later today</span><strong>Same-day timetable needed</strong><span class="train-future-route">${escapeHtml(route)} · depart after ${escapeHtml(time)}</span><span class="train-future-note">This time is beyond the live Darwin departure window. Exact later-today services and journeys with changes need the scheduled timetable feed. Kerbside will not treat an empty live board as proof that there are no trains.</span></div>`;
  }
  plannerMessage(`${time} is beyond the live departure window; exact same-day times need the scheduled timetable feed.`);
  return true;
}
function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function restoreLiveDateMeta(){
  const api=dateApi();
  if(api&&typeof api.applyForecasts==='function')api.applyForecasts();
}
function reloadLiveJourney(){
  const trains=window.__KERBSIDE_TRAINS__,station=trains&&trains.state&&trains.state.station,input=$('trainStationQuery'),go=$('trainStationGo');
  if(!station||!input||!go)return false;
  const previous=input.value;
  input.value=station.crs||station.name||previous;
  go.click();
  input.value=previous;
  return true;
}
function canonicaliseJourneyInputs(){
  const {from,to}=journey();
  const fromInput=$('trainStationQuery'),toInput=$('trainDestinationQuery');
  if(from&&fromInput&&from.name&&fromInput.value.trim().toUpperCase()===stationCrs(from))fromInput.value=from.name;
  if(to&&toInput&&to.name&&toInput.value.trim().toUpperCase()===stationCrs(to))toInput.value=to.name;
}
function suggestionStation(button){
  if(!button)return null;
  const name=String(button.querySelector('span')?.textContent||'').trim();
  const crs=String(button.querySelector('b')?.textContent||'').trim().toUpperCase();
  return {name,crs};
}
function filterSuggestionList(root){
  if(!root)return;
  let removed=0;
  [...root.querySelectorAll('button')].forEach(button=>{
    const station=suggestionStation(button);
    if(station&&station.name&&station.crs&&!isRailStation(station)){
      button.remove();
      removed++;
    }
  });
  if(removed){
    state.filteredStations+=removed;
    if(!root.querySelector('button')&&!root.querySelector('.train-suggest-empty')){
      root.innerHTML='<div class="train-suggest-empty">No matching National Rail stations found.</div>';
    }
  }
}
function guardSuggestionClick(event){
  const button=event.target&&event.target.closest&&event.target.closest('#trainSuggest button,#trainDestinationSuggest button');
  if(!button)return;
  const station=suggestionStation(button);
  if(!station||isRailStation(station))return;
  event.preventDefault();
  event.stopImmediatePropagation();
  button.remove();
  state.rejectedStations++;
  plannerMessage('Choose a National Rail station. Bus, coach and ferry connection points are not train destinations.',true);
}
function clearNonRailDestination(message=true){
  const routes=window.__KERBSIDE_TRAIN_ROUTES__;
  const destination=routes&&routes.state&&routes.state.destination;
  if(!destination||isRailStation(destination))return false;
  state.rejectedStations++;
  if(typeof routes.clearDestination==='function')routes.clearDestination({reload:false,disable:false});
  const input=$('trainDestinationQuery');
  if(input){input.value='';input.disabled=false;input.placeholder='e.g. Bristol Temple Meads or BRI';}
  if(message)plannerMessage('That location is a bus, coach or ferry connection point. Choose a National Rail station instead.',true);
  return true;
}
function guardRouteSelection(){
  const routes=window.__KERBSIDE_TRAIN_ROUTES__;
  if(!routes||routes.__kerbsideRailOnlyGuarded)return;
  const original=typeof routes.selectDestination==='function'?routes.selectDestination.bind(routes):null;
  if(original){
    routes.selectDestination=function(station){
      if(!isRailStation(station)){
        const crs=stationCrs(station);if(crs)nonRailCrs.add(crs);
        state.rejectedStations++;
        if(typeof routes.clearDestination==='function')routes.clearDestination({reload:false,disable:false});
        const input=$('trainDestinationQuery');if(input){input.value='';input.disabled=false;}
        plannerMessage('Choose a National Rail station. Bus, coach and ferry connection points cannot be used as train destinations.',true);
        return false;
      }
      return original(station);
    };
  }
  routes.__kerbsideRailOnlyGuarded=true;
  clearNonRailDestination(false);
}
function observeSuggestions(){
  if(suggestionObserver)return;
  const roots=[$('trainSuggest'),$('trainDestinationSuggest')].filter(Boolean);
  if(!roots.length)return;
  suggestionObserver=new MutationObserver(()=>roots.forEach(filterSuggestionList));
  roots.forEach(root=>{filterSuggestionList(root);suggestionObserver.observe(root,{childList:true,subtree:true});});
  document.addEventListener('click',guardSuggestionClick,true);
}
function improveEmptyState(){
  if(!isToday())return;
  const {from,to}=journey();
  if(!from)return;
  const board=$('trainBoard');
  if(!board)return;
  canonicaliseJourneyInputs();
  if(clearNonRailDestination())return;
  syncHeader();
  const error=board.querySelector('.train-empty.error');
  if(error){
    plannerMessage('Live train data is unavailable right now. Retry will check the live providers again.',true);
    return;
  }
  if(board.querySelector('.train-service')){
    plannerMessage('Live journey loaded.');
    return;
  }
  const empty=board.querySelector('.train-empty');
  if(!empty||/loading|checking/i.test(empty.textContent||''))return;
  const strong=empty.querySelector('strong'),note=empty.querySelector('span');
  if(to){
    const title='No direct live departures in this window';
    const message='The live board did not return a direct service for this From → To pair in the current live window. Connecting journey planning needs the scheduled timetable feed.';
    setText(strong,title);setText(note,message);plannerMessage(title+'.');
  }else{
    const title='No live departures in this window';
    setText(strong,title);setText(note,'The live Darwin board did not return an upcoming service in its current time window.');plannerMessage(title+'.');
  }
}
function syncOutcome(){
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>{
    if(!isToday())return;
    canonicaliseJourneyInputs();
    if(clearNonRailDestination())return;
    const info=liveWindowFor(currentDepartAfter());
    if(info.mode==='planning'){renderSameDayPlanning(info);return;}
    improveEmptyState();
  },80);
}
function handleJourneyChange(){
  if(!isToday())return;
  canonicaliseJourneyInputs();
  if(clearNonRailDestination())return;
  const info=liveWindowFor(currentDepartAfter());
  if(info.mode==='planning'){renderSameDayPlanning(info);return;}
  restoreLiveDateMeta();
  const label=info.target==null||info.delta<=0?'Live departures now':`Live departures from ${hhmm(info.target)}`;
  syncHeader(label);
  plannerMessage('Loading live departures…');
  reloadLiveJourney();
  syncOutcome();
}
function installDefaultTime(){
  const input=$('trainDepartAfter');
  if(!input)return;
  let stored='';
  try{stored=localStorage.getItem(STORE)||'';}catch(error){}
  if(!stored&&input.value==='09:00')input.value=defaultDepartAfter();
}
function observeBoard(){
  const board=$('trainBoard');
  if(!board||boardObserver)return;
  boardObserver=new MutationObserver(syncOutcome);
  boardObserver.observe(board,{childList:true,subtree:true,characterData:true});
}
function install(){
  if(state.installed)return true;
  if(!window.__KERBSIDE_TRAINS__||!window.__KERBSIDE_TRAIN_ROUTES__||!window.__KERBSIDE_JOURNEY_PLANNER__||!$('trainBoard')||!$('trainDepartAfter'))return false;
  state.installed=true;
  installDefaultTime();
  upstreamFetch=window.fetch.bind(window);
  window.fetch=liveWindowFetch;
  guardRouteSelection();
  observeSuggestions();
  observeBoard();
  canonicaliseJourneyInputs();
  window.addEventListener('kerbside:journey-planner-change',()=>setTimeout(handleJourneyChange,0));
  document.addEventListener('kerbside:train-route-change',()=>{canonicaliseJourneyInputs();if(!clearNonRailDestination())syncOutcome();});
  document.addEventListener('kerbside:train-date-change',()=>setTimeout(()=>{if(isToday()){installDefaultTime();canonicaliseJourneyInputs();syncOutcome();}},0));
  syncOutcome();
  return true;
}
function init(attempt=0){
  if(install())return;
  if(attempt<80)setTimeout(()=>init(attempt+1),50);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init(),{once:true});else init();
window.__KERBSIDE_TRAIN_LIVE_WINDOW__={state,install,liveWindowFor,defaultDepartAfter,renderSameDayPlanning,improveEmptyState,handleJourneyChange,isRailStation,filterSuggestionList,clearNonRailDestination,MAX_LIVE_HORIZON};
})();