(function(){
'use strict';

const VERSION = 3;
const BANK_HOLIDAY_URL = 'https://www.gov.uk/bank-holidays.json';
const CACHE_KEY = 'kerbside.rail.forecast.v3.calendar';
const CACHE_MS = 24*60*60*1000;
const state = {bankHolidays:new Set(), calendarReady:false, observer:null, scheduled:false};
const $ = id => document.getElementById(id);

function stamp(date){
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date||new Date());
  const map = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function day(date){ return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short'}).format(date||new Date()); }
function dayClass(date){ const d=day(date); return d==='Fri'?'friday':(d==='Sat'||d==='Sun'?'weekend':'weekday'); }
function parseMinutes(value){ const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/); return m?Number(m[1])*60+Number(m[2]):null; }
function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }
function unique(values){ return [...new Set(values.filter(Boolean))]; }
function labelFor(score){ return score>=4?'Very busy':score>=2.75?'Busy':score>=1.55?'Moderate':'Quiet'; }
function levelFor(score){ return score>=4?'very-busy':score>=2.75?'busy':score>=1.55?'moderate':'quiet'; }
function isFuture(date){ return stamp(date)>stamp(new Date()); }
function normalise(value){ return String(value||'').trim().toLowerCase().replace(/\s+/g,' '); }
function destinationIdentity(service){ const item=Array.isArray(service&&service.destination)?service.destination.find(Boolean):null; return normalise(item&&(item.crs||item.locationName)||'unknown'); }
function operatorIdentity(service){ return normalise(service&&(service.operatorCode||service.operator)||'unknown'); }
function profileKey(service,station,date){
  const stationCode=normalise(station&&(station.crs||station.name)||'unknown');
  const minute=parseMinutes(service&&service.std);
  const band=minute==null?'unknown':String(Math.floor(minute/120)*2).padStart(2,'0');
  return [stationCode,operatorIdentity(service),destinationIdentity(service),dayClass(date),band].join('|');
}
function getProfile(api,service,date){
  const model=api&&api.state&&api.state.crowdingModel;
  if(!model||!model.profiles) return null;
  return model.profiles[profileKey(service,api.state.station,date)]||null;
}

function calendarSignal(date,minute){
  let amount=0;
  const reasons=[];
  const weekday=day(date);
  const dateStamp=stamp(date);
  if(state.bankHolidays.has(dateStamp)){ amount+=0.55; reasons.push('bank-holiday travel pattern'); }
  if(weekday==='Fri' && minute!=null && minute>=14*60 && minute<20*60){ amount+=0.35; reasons.push('Friday leisure and commuter demand'); }
  if((weekday==='Sat'||weekday==='Sun') && minute!=null && minute>=10*60 && minute<19*60){ amount+=0.2; reasons.push('weekend daytime demand'); }
  const month=Number(dateStamp.slice(5,7));
  const dom=Number(dateStamp.slice(8,10));
  if(month===12 && dom>=18){ amount+=0.45; reasons.push('Christmas travel period'); }
  if((month===7||month===8) && (weekday==='Fri'||weekday==='Sat')){ amount+=0.2; reasons.push('summer leisure travel'); }
  return {amount,reasons};
}

function liveSignal(service,index,services){
  let amount=0;
  const reasons=[];
  if(service && service.isCancelled) return {amount:-5,reasons:['service cancelled']};
  const planned=parseMinutes(service&&service.std), expected=parseMinutes(service&&service.etd);
  if(planned!=null && expected!=null){
    let delay=expected-planned; if(delay<-720)delay+=1440; if(delay>720)delay-=1440;
    if(delay>=20){ amount+=0.8; reasons.push(`${delay}-minute delay increasing passenger accumulation`); }
    else if(delay>=8){ amount+=0.4; reasons.push('current delay increasing platform demand'); }
  }
  const previous=(services||[]).slice(0,index).reverse().find(item=>item && item.isCancelled);
  if(previous){ amount+=0.75; reasons.push('an earlier service is cancelled'); }
  const length=Number(service&&service.length)||0;
  const lengths=(services||[]).map(s=>Number(s&&s.length)||0).filter(Boolean).sort((a,b)=>a-b);
  if(length && lengths.length>=3){
    const median=lengths[Math.floor(lengths.length/2)];
    if(median && length<=median*0.65){ amount+=0.8; reasons.push('shorter-than-typical formation'); }
    else if(median && length>=median*1.35){ amount-=0.35; reasons.push('longer-than-typical formation'); }
  }
  return {amount,reasons};
}

function historicalSignal(api,service,date){
  let amount=0;
  const reasons=[];
  const profile=getProfile(api,service,date);
  if(!profile) return {amount,reasons,profile:null};
  const observations=Number(profile.samples||profile.count||profile.observationCount)||0;
  if(observations>=3){ amount+=0.3; reasons.push('historical service pattern available'); }
  const typicalLength=Number(profile.avgLength||profile.lengthMean||profile.typicalLength)||0;
  const currentLength=Number(service&&service.length)||0;
  if(currentLength&&typicalLength&&currentLength<typicalLength*0.75){ amount+=0.55; reasons.push('formation below its historical norm'); }
  return {amount,reasons,profile};
}

function eventSignal(){
  const provider=window.__KERBSIDE_EVENTS__;
  if(!provider || typeof provider.pressureForJourney!=='function') return {amount:0,reasons:[]};
  try{
    const result=provider.pressureForJourney()||{};
    return {amount:clamp(Number(result.amount)||0,0,1.35),reasons:unique(result.reasons||[])};
  }catch(error){ return {amount:0,reasons:[]}; }
}

function removeLegacyFeedback(score,profile){
  const count=profile?Number(profile.feedbackCount)||0:0;
  const target=profile?Number(profile.feedbackMean):NaN;
  if(!count||!Number.isFinite(target)) return score;
  const weight=Math.min(0.5,0.12+count*0.06);
  if(weight<=0||weight>=1) return score;
  return (score-target*weight)/(1-weight);
}

function forecast(service,index,services,context={}){
  const api=window.__KERBSIDE_TRAINS__;
  const base=api && typeof api.crowdingForecast==='function' ? api.crowdingForecast(service,index,services,context) : {score:1.8,reasons:[],confidence:'Low'};
  const date=context.referenceDate instanceof Date?context.referenceDate:new Date(context.referenceDate||Date.now());
  const minute=parseMinutes(service&&service.std);
  const future=isFuture(date);
  const calendar=calendarSignal(date,minute);
  const historical=historicalSignal(api,service,date);
  const events=eventSignal();
  const live=future?{amount:0,reasons:[]}:liveSignal(service,index,services);
  let score=Number(base.score);
  if(!Number.isFinite(score)) score=1.8;
  score=removeLegacyFeedback(score,historical.profile);
  score=clamp(score+calendar.amount+historical.amount+events.amount+live.amount,0.25,5);
  const reasons=unique([...(base.reasons||[]).filter(reason=>!/passenger feedback|local feedback|reported crowding/i.test(reason)),...historical.reasons,...calendar.reasons,...events.reasons,...live.reasons]);
  const evidence=2+(historical.reasons.length?1:0)+(calendar.reasons.length?1:0)+(events.reasons.length?2:0)+(live.reasons.length?2:0);
  const confidence=evidence>=6?'High':evidence>=4?'Medium-high':evidence>=3?'Medium':'Low';
  return {score,level:levelFor(score),label:labelFor(score),confidence,reasons:reasons.length?reasons:['service time and route demand baseline'],modelVersion:VERSION};
}

function apply(){
  const api=window.__KERBSIDE_TRAINS__;
  if(!api||!api.state) return;
  const dateApi=window.__KERBSIDE_TRAIN_DATE__;
  const date=dateApi&&dateApi.state&&dateApi.state.date?new Date(`${dateApi.state.date}T12:00:00`):new Date();
  const services=Array.isArray(api.state.services)?api.state.services:[];
  document.querySelectorAll('#trainBoard .train-service').forEach((article,index)=>{
    const service=services[index]; if(!service)return;
    const result=forecast(service,index,services,{station:api.state.station,referenceDate:date,messages:api.state.board&&api.state.board.nrccMessages||[]});
    const crowd=article.querySelector('.train-crowding');
    if(crowd){ crowd.className=`train-crowding crowd-${result.level}`; const b=crowd.querySelector('b'),s=crowd.querySelector('small'); if(b)b.textContent=result.label;if(s)s.textContent=`${result.confidence} confidence · forecast v3`; crowd.title=result.reasons.join(', '); }
    const explain=article.querySelector('.train-crowding-explain');
    if(explain){ explain.className=`train-crowding-explain crowd-${result.level}`; const strong=explain.querySelector('strong'),span=explain.querySelector('span'),p=explain.querySelector('p'); if(strong)strong.textContent=result.label;if(span)span.textContent=`${result.confidence} confidence · forecast v3 · ${isFuture(date)?'planning':'live-adjusted'}`;if(p)p.textContent=`Why: ${result.reasons.join(', ')}. Passenger-submitted crowding reports are not used to calculate this forecast.`; }
  });
}
function schedule(){ if(state.scheduled)return;state.scheduled=true;requestAnimationFrame(()=>{state.scheduled=false;apply();}); }

async function loadCalendar(){
  try{
    const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
    if(cached&&Date.now()-cached.ts<CACHE_MS&&Array.isArray(cached.dates)){ state.bankHolidays=new Set(cached.dates);state.calendarReady=true;schedule();return; }
  }catch(error){}
  try{
    const response=await fetch(BANK_HOLIDAY_URL,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('calendar');
    const json=await response.json();const dates=[];Object.values(json||{}).forEach(group=>(group&&group.events||[]).forEach(event=>event&&event.date&&dates.push(event.date)));
    state.bankHolidays=new Set(dates);state.calendarReady=true;try{localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),dates}));}catch(error){}schedule();
  }catch(error){ state.calendarReady=true; }
}
function init(){ const board=$('trainBoard');if(board){state.observer=new MutationObserver(schedule);state.observer.observe(board,{childList:true,subtree:true});}loadCalendar();schedule(); }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__KERBSIDE_FORECAST_V3__={version:VERSION,state,forecast,apply,calendarSignal,liveSignal,historicalSignal,removeLegacyFeedback};
})();
