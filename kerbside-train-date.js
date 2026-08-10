(function(){
'use strict';

const STORE_KEY = 'kerbside.rail.travel-date.v1';
const MAX_DAYS = 90;
const $ = id => document.getElementById(id);
const state = {date:'',observer:null,scheduled:false};

function localDateStamp(date=new Date()){
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const map = Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function parseTravelDate(value){
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDaysStamp(days){
  const date = new Date();
  date.setHours(12,0,0,0);
  date.setDate(date.getDate()+days);
  return localDateStamp(date);
}

function readStoredDate(){
  try{
    const value = localStorage.getItem(STORE_KEY) || '';
    const today = localDateStamp();
    if(!parseTravelDate(value) || value < today || value > addDaysStamp(MAX_DAYS)) return today;
    return value;
  }catch(error){ return localDateStamp(); }
}

function saveDate(){
  try{ localStorage.setItem(STORE_KEY,state.date); }catch(error){}
}

function isToday(){ return state.date === localDateStamp(); }

function setText(element,value){
  if(element && element.textContent !== value) element.textContent = value;
}

function setClass(element,value){
  if(element && element.className !== value) element.className = value;
}

function neutralService(service){
  return {...service,isCancelled:false,etd:'On time',eta:'On time',cancelReason:null,delayReason:null,length:0};
}

function forecastInputs(api){
  const live = isToday();
  const services = Array.isArray(api.state.services) ? api.state.services : [];
  return {
    live,
    date:parseTravelDate(state.date) || new Date(),
    services:live ? services : services.map(neutralService)
  };
}

function updateDateMeta(live){
  const meta = $('trainTravelDateMeta');
  if(!meta) return;
  const date = parseTravelDate(state.date);
  const label = date ? date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}) : state.date;
  setText(meta,live
    ? `${label} · live-adjusted forecast · refreshes as running data changes`
    : `${label} · planning forecast · live delays and cancellations will be applied when this becomes today`);
  meta.dataset.mode = live ? 'live' : 'planning';
}

function applyForecasts(){
  const api = window.__KERBSIDE_TRAINS__;
  if(!api || typeof api.crowdingForecast !== 'function' || !api.state) return;
  const {live,date,services} = forecastInputs(api);
  updateDateMeta(live);
  const articles = [...document.querySelectorAll('#trainBoard .train-service')];
  articles.forEach((article,index)=>{
    const service = services[index];
    if(!service) return;
    const forecast = api.crowdingForecast(service,index,services,{
      station:api.state.station,
      referenceDate:date,
      messages:live && api.state.board ? api.state.board.nrccMessages : []
    });
    const crowd = article.querySelector('.train-crowding');
    if(crowd){
      setClass(crowd,`train-crowding crowd-${forecast.level}`);
      const strong = crowd.querySelector('b');
      const small = crowd.querySelector('small');
      setText(strong,forecast.label);
      setText(small,`${forecast.confidence} confidence · ${live ? 'live-adjusted' : 'planning'}`);
      const title = forecast.reasons.join(', ');
      if(crowd.title !== title) crowd.title = title;
    }
    const explain = article.querySelector('.train-crowding-explain');
    if(explain){
      setClass(explain,`train-crowding-explain crowd-${forecast.level}`);
      setText(explain.querySelector('strong'),forecast.label);
      setText(explain.querySelector('span'),`${forecast.confidence} confidence · model v${api.modelVersion} · ${live ? 'live-adjusted' : 'planning'}`);
      const reason = explain.querySelector('p');
      if(reason) setText(reason,`Why: ${forecast.reasons.join(', ')}. ${live ? 'This forecast is using current running conditions and can change as new data arrives.' : 'This planning estimate excludes today’s delays, cancellations and formation because they do not describe the selected future date.'}`);
    }
  });
}

function scheduleApply(){
  if(state.scheduled) return;
  state.scheduled = true;
  requestAnimationFrame(()=>{ state.scheduled=false; applyForecasts(); });
}

function setDate(value,{persist=true}={}){
  const today = localDateStamp();
  const max = addDaysStamp(MAX_DAYS);
  state.date = parseTravelDate(value) && value >= today && value <= max ? value : today;
  const input = $('trainTravelDate');
  if(input && input.value !== state.date) input.value = state.date;
  if(persist) saveDate();
  scheduleApply();
}

function installStyles(){
  if($('trainTravelDateStyles')) return;
  const style = document.createElement('style');
  style.id = 'trainTravelDateStyles';
  style.textContent = `
    .train-date-wrap{margin-top:-5px}
    .train-date-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch}
    .train-date-row input{width:100%;min-width:0}
    .train-date-today{white-space:nowrap}
    .train-date-meta{margin-top:6px;color:var(--text-dim);font-size:10px;line-height:1.4}
    .train-date-meta[data-mode="live"]{color:var(--led)}
    @media(max-width:820px){.train-date-wrap{margin-top:-2px;margin-bottom:8px}.train-date-meta{font-size:9.5px}}
  `;
  document.head.appendChild(style);
}

function installUi(){
  if($('trainTravelDate')) return true;
  const destination = document.querySelector('.train-destination-wrap');
  if(!destination) return false;
  const wrap = document.createElement('div');
  wrap.className = 'train-search-wrap train-date-wrap';
  wrap.innerHTML = `
    <label for="trainTravelDate">Travel date</label>
    <div class="train-date-row">
      <input id="trainTravelDate" type="date" aria-describedby="trainTravelDateMeta">
      <button id="trainTravelToday" class="train-date-today" type="button">Today</button>
    </div>
    <div id="trainTravelDateMeta" class="train-date-meta"></div>`;
  destination.insertAdjacentElement('afterend',wrap);
  const input = $('trainTravelDate');
  input.min = localDateStamp();
  input.max = addDaysStamp(MAX_DAYS);
  input.addEventListener('change',()=>setDate(input.value));
  $('trainTravelToday').addEventListener('click',()=>setDate(localDateStamp()));
  setDate(state.date,{persist:false});
  return true;
}

function observeBoard(){
  const board = $('trainBoard');
  if(!board || state.observer) return;
  state.observer = new MutationObserver(scheduleApply);
  state.observer.observe(board,{childList:true,subtree:true});
}

function init(){
  installStyles();
  if(!installUi()){
    setTimeout(init,0);
    return;
  }
  observeBoard();
  scheduleApply();
}

state.date = readStoredDate();
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();

window.__KERBSIDE_TRAIN_DATE__ = {state,setDate,applyForecasts,isToday};
})();
