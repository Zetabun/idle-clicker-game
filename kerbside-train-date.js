(function(){
'use strict';
const STORE_KEY='kerbside.rail.travel-date.v1',MAX_DAYS=90,$=id=>document.getElementById(id),state={date:'',observer:null,scheduled:false};
function localDateStamp(date=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date),map=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${map.year}-${map.month}-${map.day}`;}
function parseTravelDate(value){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;const d=new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);return Number.isNaN(d.getTime())?null:d;}
function addDaysStamp(days){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return localDateStamp(d);}
function readStoredDate(){try{const v=localStorage.getItem(STORE_KEY)||'',today=localDateStamp();return parseTravelDate(v)&&v>=today&&v<=addDaysStamp(MAX_DAYS)?v:today;}catch(e){return localDateStamp();}}
function saveDate(){try{localStorage.setItem(STORE_KEY,state.date);}catch(e){}}
function isToday(){return state.date===localDateStamp();}
function setText(el,v){if(el&&el.textContent!==v)el.textContent=v;}
/* Every other module is loaded from bus.html with a ?v=APP_VERSION query, but
   this one is injected here, so it shipped without one and browsers happily
   served a cached copy from an older release alongside new siblings. Reuse
   the version already on this file's own script tag. */
function moduleVersion(){const tag=document.querySelector('script[src*="kerbside-train-date.js"]');const src=tag&&tag.getAttribute('src')||'';const q=src.indexOf('?');return q<0?'':src.slice(q);}
function ensureTimetableModule(){if(document.getElementById('kerbsideTrainTimetableScript')||window.__KERBSIDE_TRAIN_TIMETABLE__)return;const s=document.createElement('script');s.id='kerbsideTrainTimetableScript';s.src=`kerbside-train-timetable.js${moduleVersion()}`;s.defer=true;s.addEventListener('load',()=>{if(!isToday()&&window.__KERBSIDE_TRAIN_TIMETABLE__)window.__KERBSIDE_TRAIN_TIMETABLE__.load();});document.head.appendChild(s);}
function updateDateMeta(){const meta=$('trainTravelDateMeta');if(!meta)return;const live=isToday(),d=parseTravelDate(state.date),label=d?d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):state.date;const tt=window.__KERBSIDE_TRAIN_TIMETABLE__,mode=tt&&tt.state?tt.state.mode:'';const note=mode==='today'?`${label} · timetable + live evidence`:mode==='advance'?`${label} · advance journey · timetabled services`:live?`${label} · live departures · live-adjusted crowding`:`${label} · advance journey · scheduled services`;setText(meta,note);meta.dataset.mode=live?'live':'planning';}
function stopLiveBoard(){const trains=window.__KERBSIDE_TRAINS__;const abort=trains&&trains.state&&trains.state.boardAbort;if(abort&&typeof abort.abort==='function')abort.abort();}
function futureFallback(){if(isToday())return false;stopLiveBoard();ensureTimetableModule();const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;if(timetable&&typeof timetable.load==='function'){timetable.load();return true;}const board=$('trainBoard');if(board)board.innerHTML='<div class="train-empty train-future-date train-future-card"><span class="train-future-badge">Advance timetable</span><strong>Preparing future journey…</strong><span>Loading scheduled-service support.</span></div>';return true;}
function restoreLiveState(){const main=$('trainMain');if(main)main.dataset.railView='live';const retry=$('trainRefresh');if(retry){retry.disabled=false;retry.textContent='Refresh';}const api=window.__KERBSIDE_TRAINS__,station=api&&api.state&&api.state.station;if(!station)return;if(api&&typeof api.loadBoard==='function'){api.loadBoard(station);return;}const input=$('trainStationQuery'),go=$('trainStationGo');if(input&&go){const old=input.value;input.value=station.crs||station.name||old;go.click();input.value=old;}}
/* The timetable module owns the decision now - it serves any journey the
   snapshot covers, today included - so this no longer forces a fallback on
   future dates only. futureFallback() remains the path used before that
   module has loaded. */
function apply(){
  updateDateMeta();
  ensureTimetableModule();
  const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
  if(timetable&&typeof timetable.sync==='function'){timetable.sync();return;}
  if(!isToday())futureFallback();
}
function scheduleApply(){if(state.scheduled)return;state.scheduled=true;requestAnimationFrame(()=>{state.scheduled=false;apply();});}
function setDate(value,{persist=true}={}){const wasToday=isToday(),today=localDateStamp(),max=addDaysStamp(MAX_DAYS);state.date=parseTravelDate(value)&&value>=today&&value<=max?value:today;const input=$('trainTravelDate');if(input&&input.value!==state.date)input.value=state.date;if(persist)saveDate();updateDateMeta();document.dispatchEvent(new CustomEvent('kerbside:train-date-change',{detail:{date:state.date,today:isToday()}}));const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
if(timetable&&typeof timetable.sync==='function'){timetable.sync();return;}
if(isToday()){if(!wasToday)restoreLiveState();}else futureFallback();}
function installStyles(){if($('trainTravelDateStyles'))return;const s=document.createElement('style');s.id='trainTravelDateStyles';s.textContent='.train-date-wrap{margin-top:-5px}.train-date-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch}.train-date-row input{width:100%;min-width:0}.train-date-today{white-space:nowrap}.train-date-meta{margin-top:6px;color:var(--text-dim);font-size:10px;line-height:1.4}.train-date-meta[data-mode="live"]{color:var(--led)}.train-future-date{gap:8px!important}.train-future-date span:last-child{max-width:620px;line-height:1.5}@media(max-width:820px){.train-date-wrap{margin-top:-2px;margin-bottom:8px}.train-date-meta{font-size:9.5px}}';document.head.appendChild(s);}
function installUi(){if($('trainTravelDate'))return true;const destination=document.querySelector('.train-destination-wrap');if(!destination)return false;const wrap=document.createElement('div');wrap.className='train-search-wrap train-date-wrap';wrap.innerHTML='<label for="trainTravelDate">Travel date</label><div class="train-date-row"><input id="trainTravelDate" type="date" aria-describedby="trainTravelDateMeta"><button id="trainTravelToday" class="train-date-today" type="button">Today</button></div><div id="trainTravelDateMeta" class="train-date-meta"></div>';destination.insertAdjacentElement('afterend',wrap);const input=$('trainTravelDate');input.min=localDateStamp();input.max=addDaysStamp(MAX_DAYS);input.addEventListener('change',()=>setDate(input.value));$('trainTravelToday').addEventListener('click',()=>setDate(localDateStamp()));setDate(state.date,{persist:false});return true;}
function observeBoard(){const board=$('trainBoard');if(!board||state.observer)return;state.observer=new MutationObserver(()=>{if(!isToday()&&!board.querySelector('.train-future-date'))scheduleApply();});state.observer.observe(board,{childList:true,subtree:true});}
function init(){installStyles();ensureTimetableModule();if(!installUi()){setTimeout(init,0);return;}observeBoard();scheduleApply();}
state.date=readStoredDate();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();window.__KERBSIDE_TRAIN_DATE__={state,setDate,applyForecasts:apply,isToday,stopLiveBoard};
})();