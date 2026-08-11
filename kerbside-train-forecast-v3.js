(function(){
'use strict';

const VERSION = 3;
const BANK_HOLIDAY_URL = 'https://www.gov.uk/bank-holidays.json';
const CACHE_KEY = 'kerbside.rail.forecast.v3.calendar';
const CACHE_MS = 24*60*60*1000;
const MAX_EVENT_PRESSURE = 0.8;
const state = {bankHolidays:new Set(), calendarReady:false, observer:null, scheduled:false};
const $ = id => document.getElementById(id);
function stamp(date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date||new Date());const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${map.year}-${map.month}-${map.day}`;}
function day(date){return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short'}).format(date||new Date());}
function dayClass(date){const d=day(date);return d==='Fri'?'friday':(d==='Sat'||d==='Sun'?'weekend':'weekday');}
function parseMinutes(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}function unique(v){return [...new Set(v.filter(Boolean))];}
function labelFor(s){return s>=4?'Very busy':s>=2.75?'Busy':s>=1.55?'Moderate':'Quiet';}function levelFor(s){return s>=4?'very-busy':s>=2.75?'busy':s>=1.55?'moderate':'quiet';}
function isFuture(date){return stamp(date)>stamp(new Date());}function normalise(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ');}
function destinationIdentity(service){const item=Array.isArray(service&&service.destination)?service.destination.find(Boolean):null;return normalise(item&&(item.crs||item.locationName)||'unknown');}
function operatorIdentity(service){return normalise(service&&(service.operatorCode||service.operator)||'unknown');}
function profileKey(service,station,date){const stationCode=normalise(station&&(station.crs||station.name)||'unknown');const minute=parseMinutes(service&&service.std);const band=minute==null?'unknown':String(Math.floor(minute/120)*2).padStart(2,'0');return [stationCode,operatorIdentity(service),destinationIdentity(service),dayClass(date),band].join('|');}
function getProfile(api,service,date){const model=api&&api.state&&api.state.crowdingModel;if(!model||!model.profiles)return null;return model.profiles[profileKey(service,api.state.station,date)]||null;}
function calendarSignal(date,minute){let amount=0;const reasons=[];const weekday=day(date),dateStamp=stamp(date);if(state.bankHolidays.has(dateStamp)){amount+=.55;reasons.push('bank-holiday travel pattern');}if(weekday==='Fri'&&minute!=null&&minute>=840&&minute<1200){amount+=.35;reasons.push('Friday leisure and commuter demand');}if((weekday==='Sat'||weekday==='Sun')&&minute!=null&&minute>=600&&minute<1140){amount+=.2;reasons.push('weekend daytime demand');}const month=Number(dateStamp.slice(5,7)),dom=Number(dateStamp.slice(8,10));if(month===12&&dom>=18){amount+=.45;reasons.push('Christmas travel period');}if((month===7||month===8)&&(weekday==='Fri'||weekday==='Sat')){amount+=.2;reasons.push('summer leisure travel');}return {amount,reasons};}
function liveSignal(service,index,services){let amount=0;const reasons=[];if(service&&service.isCancelled)return {amount:-5,reasons:['service cancelled']};const planned=parseMinutes(service&&service.std),expected=parseMinutes(service&&service.etd);if(planned!=null&&expected!=null){let delay=expected-planned;if(delay<-720)delay+=1440;if(delay>720)delay-=1440;if(delay>=20){amount+=.8;reasons.push(`${delay}-minute delay increasing passenger accumulation`);}else if(delay>=8){amount+=.4;reasons.push('current delay increasing platform demand');}}const previous=(services||[]).slice(0,index).reverse().find(item=>item&&item.isCancelled);if(previous){amount+=.75;reasons.push('an earlier service is cancelled');}const length=Number(service&&service.length)||0,lengths=(services||[]).map(s=>Number(s&&s.length)||0).filter(Boolean).sort((a,b)=>a-b);if(length&&lengths.length>=3){const median=lengths[Math.floor(lengths.length/2)];if(median&&length<=median*.65){amount+=.8;reasons.push('shorter-than-typical formation');}else if(median&&length>=median*1.35){amount-=.35;reasons.push('longer-than-typical formation');}}return {amount,reasons};}
function historicalSignal(api,service,date){let amount=0;const reasons=[],profile=getProfile(api,service,date);if(!profile)return {amount,reasons,profile:null};const observations=Number(profile.samples||profile.count||profile.observationCount)||0;if(observations>=3){amount+=.3;reasons.push('historical service pattern available');}const typicalLength=Number(profile.avgLength||profile.lengthMean||profile.typicalLength)||0,currentLength=Number(service&&service.length)||0;if(currentLength&&typicalLength&&currentLength<typicalLength*.75){amount+=.55;reasons.push('formation below its historical norm');}return {amount,reasons,profile};}
/* The old guard bailed out for any future date, so advance journeys - the
   case where knowing about a cup final a week out matters most - scored zero
   event pressure. The events module is now date-aware and queries the chosen
   travel date, so the forecast just has to check it is looking at the same
   day before trusting it. */
function eventSignal(service,date){const provider=window.__KERBSIDE_EVENTS__;
if(provider&&provider.state&&provider.state.date&&provider.state.date!==stamp(date))return {amount:0,reasons:[]};if(!provider||typeof provider.pressureForJourney!=='function')return {amount:0,reasons:[]};try{const result=provider.pressureForJourney(service)||{};const amount=clamp(Number(result.amount)||0,0,MAX_EVENT_PRESSURE);return {amount,reasons:amount>=.16?unique(result.reasons||[]):[]};}catch(error){return {amount:0,reasons:[]};}}
/* ------------------------------------------------------------------
   Same-day signals. Every one of these runs on data the app already has
   in hand - the expanded Darwin board, the CRS code and the calendar -
   so none of it needs a new feed, a key or a server.
------------------------------------------------------------------ */

/* Station scale. A busy-looking train out of a major hub is a different
   proposition to the same score at a rural halt, and nothing in the model
   knew the difference. Tiers follow ORR annual station usage (entries and
   exits, Open Government Licence) rather than precise figures, because the
   band is what the model needs and bands do not go stale each year. */
const STATION_TIER={
  // Tier 3: the largest hubs and London terminals
  LST:3,VIC:3,WAT:3,LBG:3,EUS:3,KGX:3,PAD:3,CHX:3,STP:3,LIV:3,CST:3,MYB:3,BFR:3,
  BHM:3,MAN:3,LDS:3,GLC:3,EDB:3,CLJ:3,STR:3,
  // Tier 2: large regional stations
  LIME:2,LVJ:2,NCL:2,SHF:2,BRI:2,NOT:2,YRK:2,RDG:2,CDF:2,GLQ:2,BTN:2,SOU:2,
  PMH:2,PLY:2,EXD:2,NRW:2,IPS:2,PBO:2,DBY:2,LEI:2,COV:2,WVH:2,PRE:2,CAR:2,
  MCO:2,MCV:2,BHI:2,BMO:2,SAL:2,SWI:2,OXF:2,CBG:2,SVG:2,LTN:2,WFJ:2,MKC:2,
  // Everything else defaults to tier 1.
};
function stationScaleSignal(station){
  const crs=String(station&&station.crs||'').toUpperCase();
  const tier=STATION_TIER[crs]||1;
  if(tier>=3)return {amount:.35,reasons:['major hub station with high passenger throughput']};
  if(tier===2)return {amount:.18,reasons:['large regional station']};
  return {amount:0,reasons:[]};
}

/* Journey shape. Two facts that only became reachable once the board was
   requested with expand=true:
     - how many stops the train has already made, which is a direct proxy
       for how much load it is already carrying when it reaches you;
     - how many stops it has left, because a fast service to a big city
       attracts a different crowd to an all-stations stopper.
   v2 only knew the binary "does this train start here". */
function callingPoints(groups){
  const out=[];
  (Array.isArray(groups)?groups:[]).forEach(group=>{
    const points=Array.isArray(group&&group.callingPoint)?group.callingPoint
      :Array.isArray(group&&group.callingPoints)?group.callingPoints
      :Array.isArray(group)?group:[];
    points.forEach(point=>{if(point)out.push(point);});
  });
  return out;
}
function journeyShapeSignal(service){
  const before=callingPoints(service&&service.previousCallingPoints);
  const after=callingPoints(service&&service.subsequentCallingPoints);
  if(!before.length&&!after.length)return {amount:0,reasons:[],evidence:0};
  let amount=0;const reasons=[];
  if(before.length>=12){amount+=.7;reasons.push('long run before this stop, so the train arrives already loaded');}
  else if(before.length>=6){amount+=.45;reasons.push('several stops already made, so passengers have accumulated');}
  else if(before.length>=2){amount+=.2;reasons.push('a few stops already made');}
  /* A through train that has passed a tier-3 hub is carrying that hub's
     passengers, which matters more than the raw stop count. */
  if(before.some(p=>(STATION_TIER[String(p.crs||'').toUpperCase()]||1)>=3)){
    amount+=.35;reasons.push('has already called at a major hub');
  }
  if(after.length&&after.length<=3&&after.some(p=>(STATION_TIER[String(p.crs||'').toUpperCase()]||1)>=3)){
    amount+=.3;reasons.push('fast service to a major destination');
  }
  return {amount,reasons,evidence:1};
}

/* School holidays. Half-term and the summer break move demand off the
   commuter peak and onto the middle of the day, and nothing modelled it.
   These are computed from the usual English term-date rules rather than
   fetched, so there is no feed to license, key or keep alive. Councils
   vary by a few days; the shape of the week is what matters here. */
function easterSunday(year){
  const a=year%19,b=Math.floor(year/100),c=year%100;
  const d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4;
  const l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(Date.UTC(year,month-1,day));
}
function daysBetween(a,b){return Math.round((a-b)/86400000);}
function schoolHolidaySignal(date,minute){
  const value=stamp(date);
  const year=Number(value.slice(0,4)),month=Number(value.slice(5,7)),dom=Number(value.slice(8,10));
  const utc=Date.UTC(year,month-1,dom);
  let holiday='';
  if(month===12&&dom>=20)holiday='Christmas holidays';
  else if(month===1&&dom<=2)holiday='Christmas holidays';
  else if((month===7&&dom>=23)||month===8||(month===9&&dom<=1))holiday='summer holidays';
  else if(month===2&&dom>=11&&dom<=19)holiday='February half-term';
  else if(month===5&&dom>=24&&dom<=31)holiday='May half-term';
  else if(month===10&&dom>=23&&dom<=31)holiday='October half-term';
  else{
    const gap=daysBetween(utc,easterSunday(year).getTime());
    if(gap>=-14&&gap<=10)holiday='Easter holidays';
  }
  if(!holiday)return {amount:0,reasons:[]};
  /* Off the peak, holidays add leisure demand. On the peak they remove
     commuters and school traffic, so the net effect is downward. */
  const weekday=day(date)!=='Sat'&&day(date)!=='Sun';
  const peak=minute!=null&&weekday&&((minute>=420&&minute<540)||(minute>=990&&minute<1110));
  if(peak)return {amount:-.4,reasons:[`${holiday} reduce commuter and school demand`]};
  return {amount:.3,reasons:[`${holiday} increase daytime leisure demand`]};
}

/* The first off-peak departure. A well-known and entirely predictable GB
   crowding spike: passengers hold back for the cheaper fare and all board
   the same train. Off-peak boundaries vary by operator and route, so this
   is deliberately a broad window rather than a precise claim. */
function offPeakSignal(date,minute){
  if(minute==null)return {amount:0,reasons:[]};
  const weekday=day(date)!=='Sat'&&day(date)!=='Sun';
  if(!weekday)return {amount:0,reasons:[]};
  if(minute>=555&&minute<600)return {amount:.5,reasons:['first off-peak departures attract held-back demand']};
  return {amount:0,reasons:[]};
}
function removeLegacyFeedback(score,profile){
const count=profile?Number(profile.feedbackCount)||0:0,target=profile?Number(profile.feedbackMean):NaN;if(!count||!Number.isFinite(target))return score;const weight=Math.min(.5,.12+count*.06);if(weight<=0||weight>=1)return score;return (score-target*weight)/(1-weight);}
function forecast(service,index,services,context={}){const api=window.__KERBSIDE_TRAINS__;const base=api&&typeof api.crowdingForecast==='function'?api.crowdingForecast(service,index,services,context):{score:1.8,reasons:[],confidence:'Low'};
/* v2 returns score:null for a cancelled service, and Number(null) is 0, which
   IS finite - so the 1.8 fallback below never caught it. The -5 cancellation
   penalty then clamped to 0.25 and a cancelled train was labelled "Quiet".
   A cancelled service has no crowding to forecast: pass v2's answer straight
   through. Its knock-on effect on other trains is handled by liveSignal. */
if(service&&service.isCancelled)return {score:null,level:base.level||'unknown',label:base.label||'Not applicable',confidence:base.confidence||'—',reasons:base.reasons&&base.reasons.length?base.reasons:['This service is cancelled.'],modelVersion:VERSION,eventPressure:0,cancelled:true};
const date=context.referenceDate instanceof Date?context.referenceDate:new Date(context.referenceDate||Date.now());const minute=parseMinutes(service&&service.std),future=isFuture(date),calendar=calendarSignal(date,minute),historical=historicalSignal(api,service,date),events=eventSignal(service,date),live=future?{amount:0,reasons:[]}:liveSignal(service,index,services);
/* Journey shape reads the expanded calling points, which only a live board
   carries, so it is same-day only. Station scale, school holidays and the
   off-peak spike are pure calendar and lookup work and apply to any date. */
const shape=future?{amount:0,reasons:[],evidence:0}:journeyShapeSignal(service);
const scale=stationScaleSignal(context.station||(api&&api.state&&api.state.station));
const school=schoolHolidaySignal(date,minute);
const offpeak=offPeakSignal(date,minute);
let score=Number(base.score);if(!Number.isFinite(score))score=1.8;score=removeLegacyFeedback(score,historical.profile);score=clamp(score+calendar.amount+historical.amount+events.amount+live.amount+shape.amount+scale.amount+school.amount+offpeak.amount,.25,5);const reasons=unique([...(base.reasons||[]).filter(r=>!/passenger feedback|local feedback|reported crowding/i.test(r)),...shape.reasons,...historical.reasons,...events.reasons,...live.reasons,...school.reasons,...offpeak.reasons,...calendar.reasons,...scale.reasons]).slice(0,6);const evidence=2+(historical.reasons.length?1:0)+(calendar.reasons.length?1:0)+(events.reasons.length?1:0)+(live.reasons.length?2:0)+(shape.evidence?1:0)+(school.reasons.length?.5:0);const confidence=evidence>=6?'High':evidence>=4?'Medium-high':evidence>=3?'Medium':'Low';return {score,level:levelFor(score),label:labelFor(score),confidence,reasons:reasons.length?reasons:['service time and route demand baseline'],modelVersion:VERSION,eventPressure:events.amount};}
function apply(){const api=window.__KERBSIDE_TRAINS__;if(!api||!api.state)return;const dateApi=window.__KERBSIDE_TRAIN_DATE__;const date=dateApi&&dateApi.state&&dateApi.state.date?new Date(`${dateApi.state.date}T12:00:00`):new Date(),services=Array.isArray(api.state.services)?api.state.services:[];/* Rows were paired to services by array index. renderBoard emits them 1:1
   today so it happens to hold, but any future filtering would silently
   attach each forecast to the wrong train. Rows already carry
   data-service-id, so join on that and fall back to the index. */
const keyed=new Map();if(api.serviceKey)services.forEach((service,index)=>keyed.set(String(api.serviceKey(service,index)),{service,index}));
document.querySelectorAll('#trainBoard .train-service').forEach((article,position)=>{const id=article.getAttribute('data-service-id');const match=id&&keyed.get(id);const service=match?match.service:services[position];const index=match?match.index:position;if(!service)return;const result=forecast(service,index,services,{station:api.state.station,referenceDate:date,messages:api.state.board&&api.state.board.nrccMessages||[]});const suffix=result.cancelled?'':` · forecast v3`;const crowd=article.querySelector('.train-crowding');if(crowd){crowd.className=`train-crowding crowd-${result.level}`;const b=crowd.querySelector('b'),s=crowd.querySelector('small');if(b)b.textContent=result.label;if(s)s.textContent=result.cancelled?'service cancelled':`${result.confidence} confidence${suffix}`;crowd.title=result.reasons.join(', ');}const explain=article.querySelector('.train-crowding-explain');if(explain){explain.className=`train-crowding-explain crowd-${result.level}`;const strong=explain.querySelector('strong'),span=explain.querySelector('span'),p=explain.querySelector('p');if(strong)strong.textContent=result.label;if(span)span.textContent=result.cancelled?'service cancelled':`${result.confidence} confidence · forecast v3 · ${isFuture(date)?'planning':'live-adjusted'}`;if(p)p.textContent=result.cancelled?'This service is cancelled, so no crowding forecast is produced for it. Its effect on the trains around it is included in their forecasts.':`Why: ${result.reasons.join(', ')}. Passenger-submitted crowding reports are not used to calculate this forecast.`;}});}
function schedule(){if(state.scheduled)return;state.scheduled=true;requestAnimationFrame(()=>{state.scheduled=false;apply();});}
async function loadCalendar(){try{const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(cached&&Date.now()-cached.ts<CACHE_MS&&Array.isArray(cached.dates)){state.bankHolidays=new Set(cached.dates);state.calendarReady=true;schedule();return;}}catch(error){}try{const response=await fetch(BANK_HOLIDAY_URL,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('calendar');const json=await response.json(),dates=[];Object.values(json||{}).forEach(group=>(group&&group.events||[]).forEach(event=>event&&event.date&&dates.push(event.date)));state.bankHolidays=new Set(dates);state.calendarReady=true;try{localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),dates}));}catch(error){}schedule();}catch(error){state.calendarReady=true;}}
function init(){const board=$('trainBoard');if(board){state.observer=new MutationObserver(schedule);state.observer.observe(board,{childList:true,subtree:true});}loadCalendar();schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__KERBSIDE_FORECAST_V3__={version:VERSION,state,forecast,apply,calendarSignal,liveSignal,historicalSignal,eventSignal,journeyShapeSignal,stationScaleSignal,schoolHolidaySignal,offPeakSignal,easterSunday,removeLegacyFeedback,STATION_TIER,MAX_EVENT_PRESSURE};
})();