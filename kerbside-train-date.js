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
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!match)return null;
  const date=new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`); return Number.isNaN(date.getTime())?null:date;
}
function addDaysStamp(days){ const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()+days);return localDateStamp(date); }
function readStoredDate(){ try{const value=localStorage.getItem(STORE_KEY)||'';const today=localDateStamp();return parseTravelDate(value)&&value>=today&&value<=addDaysStamp(MAX_DAYS)?value:today;}catch(error){return localDateStamp();} }
function saveDate(){try{localStorage.setItem(STORE_KEY,state.date);}catch(error){}}
function isToday(){return state.date===localDateStamp();}
function setText(element,value){if(element&&element.textContent!==value)element.textContent=value;}

function updateDateMeta(){
  const meta=$('trainTravelDateMeta');if(!meta)return;
  const live=isToday(),date=parseTravelDate(state.date);
  const label=date?date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):state.date;
  setText(meta,live?`${label} · live departures and live-adjusted forecast`:`${label} · advance planning date · live departures are only available for today`);
  meta.dataset.mode=live?'live':'planning';
}

function renderFutureState(){
  if(isToday())return false;
  const board=$('trainBoard');if(!board)return true;
  const date=parseTravelDate(state.date);
  const label=date?date.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):state.date;
  const routes=window.__KERBSIDE_TRAIN_ROUTES__;
  const destination=routes&&routes.state&&routes.state.destination;
  const api=window.__KERBSIDE_TRAINS__;
  const station=api&&api.state&&api.state.station;
  const from=station&&(station.name||station.crs)||'your departure station';
  const to=destination&&(destination.name||destination.crs);
  board.innerHTML=`<div class="train-empty train-future-date"><strong>${to?`${from} → ${to}`:`${from}`}</strong><span>${label}</span><span>This date is in advance. Kerbside will not show today's live departures as if they apply to this journey. Scheduled future services need a timetable data source; live running information will automatically apply when the selected date becomes today.</span></div>`;
  const retry=$('trainRefresh');if(retry)retry.disabled=true;
  return true;
}

function restoreLiveState(){
  const retry=$('trainRefresh');if(retry)retry.disabled=false;
  const api=window.__KERBSIDE_TRAINS__;
  const station=api&&api.state&&api.state.station;
  if(!station)return;
  if(api&&typeof api.loadBoard==='function'){api.loadBoard(station);return;}
  const input=$('trainStationQuery'),go=$('trainStationGo');
  if(input&&go){const previous=input.value;input.value=station.crs||station.name||previous;go.click();input.value=previous;}
}

function apply(){updateDateMeta();if(!isToday())renderFutureState();}
function scheduleApply(){if(state.scheduled)return;state.scheduled=true;requestAnimationFrame(()=>{state.scheduled=false;apply();});}
function setDate(value,{persist=true}={}){
  const wasToday=isToday(),today=localDateStamp(),max=addDaysStamp(MAX_DAYS);
  state.date=parseTravelDate(value)&&value>=today&&value<=max?value:today;
  const input=$('trainTravelDate');if(input&&input.value!==state.date)input.value=state.date;
  if(persist)saveDate();
  updateDateMeta();
  if(isToday()){if(!wasToday)restoreLiveState();}
  else renderFutureState();
}
function installStyles(){
  if($('trainTravelDateStyles'))return;const style=document.createElement('style');style.id='trainTravelDateStyles';
  style.textContent=`.train-date-wrap{margin-top:-5px}.train-date-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch}.train-date-row input{width:100%;min-width:0}.train-date-today{white-space:nowrap}.train-date-meta{margin-top:6px;color:var(--text-dim);font-size:10px;line-height:1.4}.train-date-meta[data-mode="live"]{color:var(--led)}.train-future-date{gap:8px!important}.train-future-date span:last-child{max-width:620px;line-height:1.5}@media(max-width:820px){.train-date-wrap{margin-top:-2px;margin-bottom:8px}.train-date-meta{font-size:9.5px}}`;
  document.head.appendChild(style);
}
function installUi(){
  if($('trainTravelDate'))return true;const destination=document.querySelector('.train-destination-wrap');if(!destination)return false;
  const wrap=document.createElement('div');wrap.className='train-search-wrap train-date-wrap';wrap.innerHTML=`<label for="trainTravelDate">Travel date</label><div class="train-date-row"><input id="trainTravelDate" type="date" aria-describedby="trainTravelDateMeta"><button id="trainTravelToday" class="train-date-today" type="button">Today</button></div><div id="trainTravelDateMeta" class="train-date-meta"></div>`;destination.insertAdjacentElement('afterend',wrap);
  const input=$('trainTravelDate');input.min=localDateStamp();input.max=addDaysStamp(MAX_DAYS);input.addEventListener('change',()=>setDate(input.value));$('trainTravelToday').addEventListener('click',()=>setDate(localDateStamp()));setDate(state.date,{persist:false});return true;
}
function observeBoard(){const board=$('trainBoard');if(!board||state.observer)return;state.observer=new MutationObserver(()=>{if(!isToday()&&!board.querySelector('.train-future-date'))scheduleApply();});state.observer.observe(board,{childList:true,subtree:true});}
function init(){installStyles();if(!installUi()){setTimeout(init,0);return;}observeBoard();scheduleApply();}
state.date=readStoredDate();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__KERBSIDE_TRAIN_DATE__={state,setDate,applyForecasts:apply,isToday};
})();
