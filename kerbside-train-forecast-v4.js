(function(){
'use strict';

const VERSION = 4;
const BANK_HOLIDAY_URL = 'https://www.gov.uk/bank-holidays.json';
const CACHE_KEY = 'kerbside.rail.forecast.v4.calendar.v2';
const CACHE_MS = 24*60*60*1000;
const CACHE_STALE_MS = 30*24*60*60*1000;
const MAX_EVENT_PRESSURE = 0.8;
const state = {bankHolidays:new Set(),bankHolidaysByDivision:{'england-and-wales':new Set(),scotland:new Set(),'northern-ireland':new Set()},bankHolidayYears:{'england-and-wales':new Set(),scotland:new Set(),'northern-ireland':new Set()},calendarReady:false,calendarStatus:'idle',calendarUpdatedAt:0,observer:null,scheduled:false};
const $ = id => document.getElementById(id);
function stamp(date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date||new Date());const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${map.year}-${map.month}-${map.day}`;}
function day(date){return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short'}).format(date||new Date());}
function dayClass(date){const d=day(date);return d==='Fri'?'friday':(d==='Sat'||d==='Sun'?'weekend':'weekday');}
function parseMinutes(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}function unique(v){return [...new Set(v.filter(Boolean))];}function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}function sentence(v){const text=String(v||'').trim().replace(/[.]+$/,'');return text?text.charAt(0).toUpperCase()+text.slice(1):'';}
function scoreThresholds(){const cal=calibration();if(cal&&typeof cal.scoreThresholds==='function'){try{return cal.scoreThresholds();}catch(error){}}return {moderate:1.55,busy:2.75,veryBusy:4};}
function labelFor(s){const t=scoreThresholds();return s>=t.veryBusy?'Very busy':s>=t.busy?'Busy':s>=t.moderate?'Moderate':'Quiet';}function levelFor(s){const t=scoreThresholds();return s>=t.veryBusy?'very-busy':s>=t.busy?'busy':s>=t.moderate?'moderate':'quiet';}
function isFuture(date){return stamp(date)>stamp(new Date());}
function dftLondonYmd(date){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date instanceof Date?date:new Date(date));
  const out={};parts.forEach(part=>{if(part.type!=='literal')out[part.type]=Number(part.value);});return {year:out.year,month:out.month,day:out.day};
}
function dftYmdKey(year,month,day){return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
function dftUtcYmd(date){return {year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate()};}
function dftHolidayAdd(set,year,month,day,substitute=false){
  const actual=new Date(Date.UTC(year,month-1,day)),p=dftUtcYmd(actual),key=dftYmdKey(p.year,p.month,p.day),collision=set.has(key),weekend=actual.getUTCDay()===0||actual.getUTCDay()===6;set.add(key);
  if(!substitute||(!weekend&&!collision))return;
  const observed=new Date(actual);observed.setUTCDate(observed.getUTCDate()+1);
  while(observed.getUTCDay()===0||observed.getUTCDay()===6||set.has(dftYmdKey(observed.getUTCFullYear(),observed.getUTCMonth()+1,observed.getUTCDate())))observed.setUTCDate(observed.getUTCDate()+1);
  const q=dftUtcYmd(observed);set.add(dftYmdKey(q.year,q.month,q.day));
}
function dftNthMonday(year,month,n){const d=new Date(Date.UTC(year,month-1,1)),offset=(8-d.getUTCDay())%7;return 1+offset+(n-1)*7;}
function dftLastMonday(year,month){const d=new Date(Date.UTC(year,month,0)),back=(d.getUTCDay()+6)%7;return d.getUTCDate()-back;}
function dftEasterSunday(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(Date.UTC(year,month-1,day));
}
const DFT_BANK_HOLIDAY_CACHE=new Map();
const SCOTTISH_CRS=new Set(['ABD','EDB','GLC','GLQ','DUN','INV','PER','STG','AYR','KLM','MTH','PAI','HYM','FTW','OBN','DUM','FAL','FKG','KIR','KDY','LIN','LIV','AIR']);
const SCOTTISH_PLACE_RE=/\b(aberdeen|airdrie|arbroath|ayr|bathgate|cumbernauld|dumfries|dundee|dunfermline|edinburgh|elgin|falkirk|fort william|glasgow|gourock|greenock|hamilton|helensburgh|inverness|irvine|kilmarnock|kirkcaldy|lanark|largs|linlithgow|livingston|motherwell|oban|paisley|perth|pitlochry|prestwick|stirling|stranraer)\b/i;
function bankHolidayDivision(station){const raw=String(station&&(station.region||station.country||station.nation)||'').toLowerCase(),name=String(station&&(station.name||station.locationName)||''),crs=String(station&&station.crs||'').toUpperCase();if(raw.includes('scot'))return'scotland';if(raw.includes('northern ireland'))return'northern-ireland';if(SCOTTISH_CRS.has(crs)||SCOTTISH_PLACE_RE.test(name))return'scotland';return'england-and-wales';}
function dftBankHolidayKeys(year,division='england-and-wales'){
  const cacheKey=`${division}|${year}`;if(DFT_BANK_HOLIDAY_CACHE.has(cacheKey))return DFT_BANK_HOLIDAY_CACHE.get(cacheKey);const set=new Set();
  dftHolidayAdd(set,year,1,1,true);
  if(division==='scotland')dftHolidayAdd(set,year,1,2,true);
  if(division==='northern-ireland')dftHolidayAdd(set,year,3,17,true);
  const easter=dftEasterSunday(year),goodFriday=new Date(easter),easterMonday=new Date(easter);goodFriday.setUTCDate(goodFriday.getUTCDate()-2);easterMonday.setUTCDate(easterMonday.getUTCDate()+1);let p=dftUtcYmd(goodFriday);dftHolidayAdd(set,p.year,p.month,p.day,false);if(division!=='scotland'){p=dftUtcYmd(easterMonday);dftHolidayAdd(set,p.year,p.month,p.day,false);}
  dftHolidayAdd(set,year,5,dftNthMonday(year,5,1),false);dftHolidayAdd(set,year,5,dftLastMonday(year,5),false);
  dftHolidayAdd(set,year,8,division==='scotland'?dftNthMonday(year,8,1):dftLastMonday(year,8),false);
  if(division==='scotland')dftHolidayAdd(set,year,11,30,true);if(division==='northern-ireland')dftHolidayAdd(set,year,7,12,true);
  dftHolidayAdd(set,year,12,25,true);dftHolidayAdd(set,year,12,26,true);DFT_BANK_HOLIDAY_CACHE.set(cacheKey,set);return set;
}
function isBankHoliday(date,station){const p=dftLondonYmd(date),key=dftYmdKey(p.year,p.month,p.day),division=bankHolidayDivision(station),years=state.bankHolidayYears[division],live=state.bankHolidaysByDivision[division];if(years&&years.has(p.year))return !!(live&&live.has(key));return dftBankHolidayKeys(p.year,division).has(key);}
function dftMinuteForService(service,date){const scheduled=parseMinutes(service&&service.std);if(scheduled==null||isFuture(date))return scheduled;const expected=parseMinutes(service&&service.etd);if(expected==null)return scheduled;let delay=expected-scheduled;if(delay<-720)delay+=1440;if(delay>720)delay-=1440;return Math.abs(delay)<=180?(scheduled+delay+1440)%1440:scheduled;}
function normalise(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ');}
function destinationIdentity(service){const item=Array.isArray(service&&service.destination)?service.destination.find(Boolean):null;return normalise(item&&(item.crs||item.locationName)||'unknown');}
function profileDestinationIdentity(service){const display=service&&service.displayDestination;return normalise((display&&(display.crs||display.name||display.locationName))||destinationIdentity(service)||'unknown');}
function operatorIdentity(service){return normalise(service&&(service.operatorCode||service.operator)||'unknown');}
function profileKey(service,station,date){const stationCode=normalise(station&&(station.crs||station.name)||'unknown');const minute=parseMinutes(service&&service.std);const band=minute==null?'x':String(Math.floor(minute/120));return [stationCode,operatorIdentity(service),profileDestinationIdentity(service),dayClass(date),band].join('|');}
function getProfile(api,service,date,station){const model=api&&api.state&&api.state.crowdingModel;if(!model||!model.profiles)return null;const at=station||(api&&api.state&&api.state.station);return model.profiles[profileKey(service,at,date)]||null;}
function calendarSignal(date,minute,station){let amount=0;const reasons=[];const dateStamp=stamp(date);if(isBankHoliday(date,station)){amount+=.55;reasons.push('bank-holiday travel pattern');}const month=Number(dateStamp.slice(5,7)),dom=Number(dateStamp.slice(8,10));if(month===12&&dom>=18&&dom<20){amount+=.45;reasons.push('pre-Christmas travel period');}return {amount,reasons};}
/* Cancellation knock-on.
   This used to be a plain backwards scan for ANY earlier cancelled service,
   worth a flat +0.75. That was safe while the board was Darwin's 9 rows over
   about two hours, but the unified journey board carries up to 24 rows across
   the whole day - so a 07:05 cancellation was still inflating the 22:10.
   Displaced passengers do not wait fifteen hours: weight by how recently the
   cancelled train was due, and let several cancellations in a row compound,
   because that is genuinely worse than one. */
const KNOCK_ON_FULL=30;      // minutes: passengers roll straight onto the next train
const KNOCK_ON_FADE=90;      // minutes: beyond this the effect has dispersed
const KNOCK_ON_MAX=1.6;
function cancellationKnockOn(service,index,services){
  const planned=parseMinutes(service&&service.std);
  if(planned==null||!Array.isArray(services))return {amount:0,reasons:[]};
  const flow=destinationIdentity(service);
  let amount=0,count=0,nearest=null;
  for(let i=Math.min(index,services.length)-1;i>=0;i--){
    const item=services[i];
    if(!item||!item.isCancelled)continue;
    if(flow&&flow!=='unknown'&&destinationIdentity(item)!==flow)continue;
    const when=parseMinutes(item.std);
    if(when==null)continue;
    let gap=planned-when;
    if(gap<0)gap+=1440;
    if(gap>KNOCK_ON_FADE)continue;
    const weight=gap<=KNOCK_ON_FULL?1:(KNOCK_ON_FADE-gap)/(KNOCK_ON_FADE-KNOCK_ON_FULL);
    amount+=.75*weight;count++;
    if(nearest==null||gap<nearest)nearest=gap;
  }
  if(!count)return {amount:0,reasons:[]};
  amount=Math.min(amount,KNOCK_ON_MAX);
  if(count>1)return {amount,reasons:[`${count} earlier services cancelled, concentrating their passengers here`]};
  if(nearest<=KNOCK_ON_FULL)return {amount,reasons:['the previous service was cancelled, so its passengers roll onto this train']};
  return {amount,reasons:['a recent service was cancelled']};
}
/* Formation comparison is only useful when the peer trains are actually
   comparable. A mixed station can have four-car locals beside nine/eleven-car
   intercity services, so an unfiltered median creates a false crowding signal.
   Prefer operator+destination peers; broader fallbacks are accepted only when
   their observed lengths are already tightly clustered. */
function stableFormationLengths(rows){
  const lengths=(Array.isArray(rows)?rows:[]).map(row=>Number(row&&row.length)||0).filter(Boolean).sort((a,b)=>a-b);
  if(lengths.length<3)return [];
  const min=lengths[0],max=lengths[lengths.length-1];
  return min>0&&max/min<=1.5?lengths:[];
}
function comparableFormationLengths(service,rows){
  const list=(Array.isArray(rows)?rows:[]).filter(row=>Number(row&&row.length)>0),op=operatorIdentity(service),destination=profileDestinationIdentity(service);
  if(op!=='unknown'&&destination!=='unknown'){
    const exact=stableFormationLengths(list.filter(row=>operatorIdentity(row)===op&&profileDestinationIdentity(row)===destination));
    if(exact.length>=3)return exact;
  }
  if(op!=='unknown'){
    const sameOperator=stableFormationLengths(list.filter(row=>operatorIdentity(row)===op));
    if(sameOperator.length>=3)return sameOperator;
  }
  if(destination!=='unknown'){
    const sameDestination=stableFormationLengths(list.filter(row=>profileDestinationIdentity(row)===destination));
    if(sameDestination.length>=3)return sameDestination;
  }
  return [];
}
function formationBaseline(service,services){
  const own=comparableFormationLengths(service,services);
  if(own.length>=3)return own;
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  const board=overlay&&overlay.state&&Array.isArray(overlay.state.services)?overlay.state.services:[];
  return comparableFormationLengths(service,board);
}
function liveSignal(service,index,services){
  let amount=0;const reasons=[];
  if(service&&service.isCancelled)return {amount:-5,reasons:['service cancelled']};
  const planned=parseMinutes(service&&service.std),expected=parseMinutes(service&&service.etd);
  if(planned!=null&&expected!=null){
    let delay=expected-planned;if(delay<-720)delay+=1440;if(delay>720)delay-=1440;
    if(delay>=20){amount+=.8;reasons.push(`${delay}-minute delay increasing passenger accumulation`);}
    else if(delay>=8){amount+=.4;reasons.push('current delay increasing platform demand');}
  }
  const knock=cancellationKnockOn(service,index,services);
  amount+=knock.amount;knock.reasons.forEach(r=>reasons.push(r));
  return {amount,reasons};
}
function historicalSignal(api,service,date,station){
  const profile=getProfile(api,service,date,station);
  if(!profile)return {amount:0,reasons:[],profile:null,samples:0};
  const samples=Number(profile.samples||profile.count||profile.observationCount)||0;
  /* History is evidence, not passenger demand by itself. Earlier builds
     added +0.3 merely because three observations existed, so services with
     more instrumentation looked busier without any behavioural evidence. */
  return {amount:0,reasons:[],profile,samples};
}
function formationSignal(api,service,services,date,station){
  const length=Number(service&&service.length)||0;
  if(!length)return {amount:0,reasons:[]};
  const profile=getProfile(api,service,date,station);
  const lengthSamples=profile?Number(profile.lengthSamples)||0:0;
  const typical=profile?Number(profile.avgLength||profile.lengthMean||profile.typicalLength)||0:0;
  let baseline=0,source='';
  if(lengthSamples>=3&&typical>0){baseline=typical;source='its historical formation';}
  else{
    const lengths=formationBaseline(service,services).sort((a,b)=>a-b);
    if(lengths.length>=3){baseline=lengths[Math.floor(lengths.length/2)];source='comparable nearby live formations';}
  }
  if(!baseline)return {amount:0,reasons:[]};
  const ratio=length/baseline;
  if(ratio<=.65)return {amount:.8,reasons:[`formation is much shorter than ${source}`]};
  if(ratio<=.8)return {amount:.45,reasons:[`formation is shorter than ${source}`]};
  if(ratio>=1.35)return {amount:-.35,reasons:[`formation is much longer than ${source}`]};
  if(ratio>=1.2)return {amount:-.2,reasons:[`formation is longer than ${source}`]};
  return {amount:0,reasons:[]};
}
/* The old guard bailed out for any future date, so advance journeys - the
   case where knowing about a cup final a week out matters most - scored zero
   event pressure. The events module is now date-aware and queries the chosen
   travel date, so the forecast just has to check it is looking at the same
   day before trusting it. */
function eventSignal(service,date,context={}){const provider=window.__KERBSIDE_EVENTS__;
if(provider&&provider.state&&provider.state.date&&provider.state.date!==stamp(date))return {amount:0,reasons:[]};if(!provider||typeof provider.pressureForJourney!=='function')return {amount:0,reasons:[]};try{const result=provider.pressureForJourney(service,context&&context.eventJourney||undefined)||{};const amount=clamp(Number(result.amount)||0,0,MAX_EVENT_PRESSURE);return {amount,reasons:amount>=.16?unique(result.reasons||[]):[]};}catch(error){return {amount:0,reasons:[]};}}
/* A missed connection moves demand rather than creating it. The original
   onward service is not inflated when the traveller may miss it; instead the
   first viable recovery train receives a bounded pressure signal because the
   same displaced passengers are likely to roll onto that service. */
function connectionDisplacementSignal(context={}){
  const raw=Number(context&&context.connectionDisplacement)||0,amount=clamp(raw,0,.8);
  if(amount<.1)return {amount:0,reasons:[]};
  return {amount,reasons:[amount>=.65?'cancelled or missed-connection passengers may roll onto this backup train':'missed-connection passengers may roll onto this backup train']};
}
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
function calibration(){return window.__KERBSIDE_CALIBRATION__||null;}
function stationScaleSignal(station){
  /* Forecast v4 uses ORR's continuous station-usage percentile first. The
     legacy tier table is now only an offline/failure fallback. */
  const cal=calibration();
  if(cal&&typeof cal.stationUsageSignal==='function'){try{const measured=cal.stationUsageSignal(station);if(measured&&measured.measured)return measured;}catch(error){}}
  if(cal&&typeof cal.scaleSignal==='function'){try{const measured=cal.scaleSignal(station);if(measured&&measured.measured)return {amount:measured.amount,reasons:measured.reasons};}catch(error){}}
  const crs=String(station&&station.crs||'').toUpperCase();
  const tier=STATION_TIER[crs]||1;
  if(tier>=3)return {amount:.35,reasons:['major hub station with high passenger throughput']};
  if(tier===2)return {amount:.18,reasons:['large regional station']};
  return {amount:0,reasons:[]};
}
/* Two signals that exist only when the calibration module is loaded. Both
   return a flat zero otherwise, so scores are unchanged without it. */
function calibratedDemandSignal(station,minute,date,bankHoliday=false){
  const cal=calibration();
  if(!cal||typeof cal.demandShape!=='function')return {amount:0,reasons:[]};
  try{return cal.demandShape(station,minute,date,bankHoliday)||{amount:0,reasons:[]};}catch(error){return {amount:0,reasons:[]};}
}
function serviceClassSignal(service,station,minute,date,bankHoliday=false){
  const cal=calibration();
  if(!cal||typeof cal.serviceClassSignal!=='function')return {amount:0,reasons:[]};
  try{return cal.serviceClassSignal(service,station,minute,date,bankHoliday)||{amount:0,reasons:[]};}catch(error){return {amount:0,reasons:[]};}
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
function stationMatchesOrigin(service,station){
  const origins=Array.isArray(service&&service.origin)?service.origin.filter(Boolean):[];
  if(!origins.length||!station)return null;
  const crs=String(station.crs||'').toUpperCase(),name=normalise(station.name);
  return origins.some(origin=>{
    const originCrs=String(origin.crs||'').toUpperCase(),originName=normalise(origin.locationName||origin.name);
    return (crs&&originCrs===crs)||(name&&originName===name);
  });
}
function journeyShapeSignal(service,station,options={}){
  const before=callingPoints(service&&service.previousCallingPoints);
  const after=callingPoints(service&&service.subsequentCallingPoints);
  const startsHere=stationMatchesOrigin(service,station),measuredLoad=options&&options.measuredLoad===true;
  let amount=0;const reasons=[];
  /* Once ORR route-load evidence exists, do not also add the old "number of
     previous stops" proxy. That would count the same accumulation twice. */
  if(!measuredLoad){
    if(before.length>=12){amount+=.7;reasons.push('long run before this stop, so the train arrives already loaded');}
    else if(before.length>=6){amount+=.45;reasons.push('several stops already made, so passengers have accumulated');}
    else if(before.length>=2){amount+=.2;reasons.push('a few stops already made');}
    else if(startsHere===true){amount-=.25;reasons.push('train starts at this station');}
    else if(startsHere===false){amount+=.25;reasons.push('through train may already carry passengers');}
    if(before.some(p=>(STATION_TIER[String(p.crs||'').toUpperCase()]||1)>=3)){
      amount+=.35;reasons.push('has already called at a major hub');
    }
  }else if(startsHere===true){
    amount-=.15;reasons.push('train starts at this station, so there is no carried load from earlier calls');
  }
  if(after.length&&after.length<=3&&after.some(p=>(STATION_TIER[String(p.crs||'').toUpperCase()]||1)>=3)){
    amount+=measuredLoad?.15:.3;reasons.push('fast service to a major destination');
  }
  const evidence=(before.length||after.length)?1:(startsHere==null?0:.5);
  return {amount,reasons,evidence,measuredLoad};
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
  const weekday=day(date)!=='Sat'&&day(date)!=='Sun';
  const peak=minute!=null&&weekday&&((minute>=420&&minute<540)||(minute>=990&&minute<1110));
  if(peak)return {amount:-.4,reasons:[`${holiday} reduce commuter and school demand`]};
  return {amount:0,reasons:[]};
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

function servicePatternSignal(api,service,date,station){
  const profile=api&&typeof api.servicePatternProfile==='function'?api.servicePatternProfile(service,station,date):null;if(!profile)return {amount:0,reasons:[],samples:0,profile:null};
  const samples=Number(profile.samples)||0,cancelSamples=Number(profile.cancelledSamples)||0,cancelRate=cancelSamples?Number(profile.cancelledCount||0)/cancelSamples:0,delaySamples=Number(profile.delaySamples)||0,avgDelay=Number(profile.avgDelay)||0;let amount=0;const reasons=[];
  if(cancelSamples>=8&&cancelRate>=.18){amount+=clamp((cancelRate-.12)*.9,0,.35);reasons.push(`this service pattern has been cancelled in about ${Math.round(cancelRate*100)}% of recent local observations`);}if(delaySamples>=5&&avgDelay>=8){amount+=clamp((avgDelay-6)/45,0,.28);reasons.push(`this service pattern has averaged about ${Math.round(avgDelay)} minutes late locally`);}
  return {amount,reasons,samples,profile};
}
function destinationForModel(service,context={}){const override=context&&context.eventJourney;if(override&&(override.destinationCrs||override.destination))return {crs:String(override.destinationCrs||'').toUpperCase(),name:String(override.destination||override.destinationCrs||'')};const d=service&&(service.routeDestination||service.displayDestination);if(d)return {crs:String(d.crs||'').toUpperCase(),name:String(d.name||d.locationName||d.crs||'')};const item=Array.isArray(service&&service.destination)?service.destination.find(Boolean):null;return {crs:String(item&&item.crs||'').toUpperCase(),name:String(item&&(item.locationName||item.crs)||'')};}
const PROB_LEVELS=['quiet','moderate','busy','very-busy'],PROB_LABELS=['Quiet','Moderate','Busy','Very busy'],PROB_CENTRES=[.75,2,3.25,4.45];
function normaliseProbabilities(values){const safe=values.map(v=>Number.isFinite(v)&&v>0?v:0),total=safe.reduce((a,b)=>a+b,0)||1;return safe.map(v=>v/total);}
function ordinalProbabilities(score,service,station,evidence,date,minuteOverride=null,bankHoliday=false){
  const cal=calibration(),minute=minuteOverride==null?parseMinutes(service&&service.std):minuteOverride,prior=cal&&typeof cal.utilisationPrior==='function'?cal.utilisationPrior(service,station,minute,date,bankHoliday):null,base=prior&&Array.isArray(prior.probabilities)?prior.probabilities:[.25,.25,.25,.25],temperature=clamp(1.22-Math.min(8,Number(evidence)||0)*.065,.62,1.18);
  const logits=PROB_CENTRES.map((centre,i)=>Math.log(Math.max(.015,Number(base[i])||.015))-Math.pow(score-centre,2)/(2*temperature*temperature)),max=Math.max(...logits),probabilities=normaliseProbabilities(logits.map(v=>Math.exp(v-max))),index=probabilities.indexOf(Math.max(...probabilities));
  return {probabilities,index,level:PROB_LEVELS[index],label:PROB_LABELS[index],prior,temperature,top:probabilities[index]};
}
function accuracyBucketFor({future,calibrated,formation,events,context}){return `${future?'planning':'live'}|${calibrated?'measured':'fallback'}|${context&&context.connectionRole?'connection':'single'}|${formation&&formation.reasons&&formation.reasons.length?'formation':'no-formation'}|${events&&events.reasons&&events.reasons.length?'event':'no-event'}`;}
function probabilityConfidence(model,evidence,bucket){
  const sorted=model.probabilities.slice().sort((a,b)=>b-a),top=sorted[0]||0,gap=top-(sorted[1]||0);let rank=top>=.68&&gap>=.28&&evidence>=5?3:top>=.55&&gap>=.18&&evidence>=4?2:top>=.43&&evidence>=3?1:0;
  const api=window.__KERBSIDE_TRAINS__,local=api&&typeof api.forecastAccuracyForBucket==='function'?api.forecastAccuracyForBucket(bucket):null;
  if(local&&local.total>=8){if(local.withinOne<.65)rank=Math.min(rank,0);else if(local.withinOne<.78)rank=Math.min(rank,1);else if(local.withinOne>=.9&&local.exact>=.5)rank=Math.min(3,rank+1);}
  return {label:['Low','Medium','Medium-high','High'][rank],local};
}

function forecast(service,index,services,context={}){
  const api=window.__KERBSIDE_TRAINS__;
  const date=context.referenceDate instanceof Date?context.referenceDate:new Date(context.referenceDate||Date.now());
  const station=context.station||(api&&api.state&&api.state.station);
  const baseContext={...context,station,referenceDate:date,modelLayer:'v3-baseline',includeFeedback:false};
  const base=api&&typeof api.crowdingForecast==='function'
    ?api.crowdingForecast(service,index,services,baseContext)
    :{score:1.8,reasons:[],confidence:'Low'};
  if(service&&service.isCancelled)return {score:null,level:base.level||'unknown',label:base.label||'Not applicable',confidence:base.confidence||'—',reasons:base.reasons&&base.reasons.length?base.reasons:['This service is cancelled.'],modelVersion:VERSION,eventPressure:0,historySamples:Number(base.historySamples)||0,cancelled:true};

  const minute=parseMinutes(service&&service.std),future=isFuture(date),dftMinute=dftMinuteForService(service,date),bankHoliday=isBankHoliday(date,station);
  const calendar=calendarSignal(date,minute,station);
  const historical=historicalSignal(api,service,date,station);
  const events=eventSignal(service,date,context);
  const displacement=connectionDisplacementSignal(context);
  const live=future?{amount:0,reasons:[]}:liveSignal(service,index,services);
  const formation=future?{amount:0,reasons:[]}:formationSignal(api,service,services,date,station);
  const calV4=calibration(),destination=destinationForModel(service,context);
  const routeLoad=calV4&&typeof calV4.routeLoadSignal==='function'?calV4.routeLoadSignal(service,station):(calV4&&typeof calV4.routeFlowSignal==='function'?calV4.routeFlowSignal(station,destination):{amount:0,reasons:[],measured:false,source:'none'});
  const shape=journeyShapeSignal(service,station,{measuredLoad:routeLoad.measured===true});
  const scale=stationScaleSignal(station);
  const school=schoolHolidaySignal(date,minute);
  const offpeak=offPeakSignal(date,minute);
  const shapeCal=calibratedDemandSignal(station,dftMinute,date,bankHoliday);
  const serviceClass=serviceClassSignal(service,station,dftMinute,date,bankHoliday);
  const operatorCrowding=calV4&&typeof calV4.operatorCrowdingSignal==='function'?calV4.operatorCrowdingSignal(service,station,dftMinute,date,bankHoliday):{amount:0,reasons:[],measured:false};
  const peakCapacity=calV4&&typeof calV4.peakCapacitySignal==='function'?calV4.peakCapacitySignal(station,dftMinute,date,bankHoliday):{amount:0,reasons:[],measured:false};
  const pattern=servicePatternSignal(api,service,date,station);

  let score=Number(base.score);if(!Number.isFinite(score))score=1.8;
  score=clamp(score+calendar.amount+events.amount+displacement.amount+live.amount+formation.amount+shape.amount+scale.amount+school.amount+offpeak.amount+shapeCal.amount+serviceClass.amount+routeLoad.amount+operatorCrowding.amount+peakCapacity.amount+pattern.amount,.25,5);
  /* Each signal already knows which way it pushed the score, so a reason can
     carry its own direction instead of the reader inferring it from wording.
     Tagged at the one place the signals are merged: the sign of the owning
     signal's amount is the direction, and the first source to mention a reason
     owns it. base.reasons describe the profile itself rather than a push in
     either direction, so they stay neutral. */
  const reasonSources=[
    [(base.reasons||[]).filter(r=>!/passenger feedback|local feedback|reported crowding/i.test(r)),0],
    [shape.reasons,shape.amount],[events.reasons,events.amount],[displacement.reasons,displacement.amount],
    [live.reasons,live.amount],[formation.reasons,formation.amount],
    [operatorCrowding.reasons,operatorCrowding.amount],[peakCapacity.reasons,peakCapacity.amount],
    [routeLoad.reasons,routeLoad.amount],[pattern.reasons,pattern.amount],
    [serviceClass.reasons,serviceClass.amount],[school.reasons,school.amount],[offpeak.reasons,offpeak.amount],
    [shapeCal.reasons,shapeCal.amount],[calendar.reasons,calendar.amount],[scale.reasons,scale.amount]
  ];
  const reasonDetail=[],reasonSeen=new Set();
  reasonSources.forEach(pair=>{
    const list=Array.isArray(pair[0])?pair[0]:[];
    list.forEach(entry=>{
      const text=String(entry==null?'':entry).trim();
      if(!text||reasonSeen.has(text))return;
      reasonSeen.add(text);
      reasonDetail.push({text,direction:reasonDirection(pair[1])});
    });
  });
  reasonDetail.length=Math.min(reasonDetail.length,6);
  const reasons=reasonDetail.map(item=>item.text);
  const calibrated=!!(scale.reasons.length&&calibration()&&calibration().profileFor&&calibration().profileFor(station));
  const historySamples=Math.max(Number(base.historySamples)||0,Number(historical.samples)||0);
  const historyEvidence=historySamples>=3?1:(historySamples?0.5:0);
  const evidence=2+historyEvidence+(calendar.reasons.length?1:0)+(events.reasons.length?1:0)+(displacement.reasons.length?1:0)+(live.reasons.length?2:0)+(formation.reasons.length?1:0)+(shape.evidence?1:0)+(school.reasons.length?.5:0)+(calibrated?1:0)+(serviceClass.reasons.length?.5:0)+(routeLoad.source==='orr-odm'?1:(routeLoad.measured?.5:0))+(operatorCrowding.measured?1:0)+(peakCapacity.measured?1:0)+(pattern.samples>=3?1:0);
  const probabilityModel=ordinalProbabilities(score,service,station,evidence,date,dftMinute,bankHoliday),accuracyBucket=accuracyBucketFor({future,calibrated:calibrated||operatorCrowding.measured||peakCapacity.measured,formation,events,context}),confidenceInfo=probabilityConfidence(probabilityModel,evidence,accuracyBucket),confidence=confidenceInfo.label;
  const cal=calibration();
  const measuredBenchmark=cal&&typeof cal.benchmarkForecast==='function'?cal.benchmarkForecast(station,dftMinute,date,probabilityModel.level,bankHoliday):null;
  let calibrationNote='';
  if(cal&&typeof cal.contextNote==='function'){try{calibrationNote=cal.contextNote(station,dftMinute,date,bankHoliday)||'';}catch(error){calibrationNote='';}}
  return {score,level:probabilityModel.level,label:probabilityModel.label,confidence,reasons:reasons.length?reasons:['service time and route demand baseline'],reasonDetail:reasonDetail.length?reasonDetail:[{text:'service time and route demand baseline',direction:'flat'}],modelVersion:VERSION,eventPressure:events.amount,historySamples,calibrated:calibrated||operatorCrowding.measured||peakCapacity.measured,calibrationNote,calibrationSource:cal?cal.source:'',probabilities:{quiet:probabilityModel.probabilities[0],moderate:probabilityModel.probabilities[1],busy:probabilityModel.probabilities[2],veryBusy:probabilityModel.probabilities[3]},topProbability:probabilityModel.top,utilisationPrior:probabilityModel.prior,routeLoad,measuredBenchmark,accuracyBucket,empiricalAccuracy:confidenceInfo.local};
}
function benchmarkServices(services,station,date){
  const list=Array.isArray(services)?services:[],when=date instanceof Date?date:new Date(date||Date.now());
  let count=0,exact=0,withinOne=0,totalError=0;
  list.forEach((service,index)=>{
    const result=forecast(service,index,list,{station,referenceDate:when}),benchmark=result&&result.measuredBenchmark;
    if(!benchmark)return;count++;if(benchmark.exact)exact++;if(benchmark.withinOne)withinOne++;totalError+=Number(benchmark.bandError)||0;
  });
  return {count,exact:count?exact/count:0,withinOne:count?withinOne/count:0,meanBandError:count?totalError/count:0,source:'DfT aggregate time-band benchmark',aggregateOnly:true};
}

/* options.mode overrides the Planning / Live-adjusted badge and options.note
   appends a sentence to the method line, so the scheduled timetable board can
   render this exact card with its own framing instead of maintaining a second
   copy that drifts out of step. */
/* .15 is the smallest amount any signal contributes, so anything below it is
   rounding rather than a real push either way. */
function reasonDirection(amount){
  const value=Number(amount)||0;
  if(value>=.15)return 'up';
  if(value<=-.15)return 'down';
  return 'flat';
}
function detailMarkup(result,date,options={}){const reasons=(result.reasons||[]).map(sentence).filter(Boolean),history=Number(result.historySamples)||0,mode=options.mode||(isFuture(date)?'Planning':'Live-adjusted'),meta=result.cancelled?'Service cancelled':`${result.confidence} confidence · Forecast v4 · ${mode}`;const detailReasons=Array.isArray(result.reasonDetail)&&result.reasonDetail.length?result.reasonDetail:(result.reasons||[]).map(text=>({text,direction:'flat'}));const flagLabel={up:'Busier',down:'Quieter',flat:'Context'};const items=detailReasons.map(entry=>{const text=sentence(entry&&entry.text);if(!text)return '';const direction=entry&&flagLabel[entry.direction]?entry.direction:'flat';return `<li class="reason-${direction}"><span class="train-forecast-flag">${flagLabel[direction]}</span><span class="train-forecast-reason-text">${esc(text)}</span></li>`;}).filter(Boolean).join('');const base=result.cancelled?'No crowding forecast is produced for a cancelled service. Its knock-on effect is still included in nearby trains.':'Forecast estimate only — no ticket sales, seat reservations or live carriage occupancy. Passenger-submitted crowding reports do not affect the score.';const method=options.note?`${base} ${options.note}`:base;const historyMarkup=history?`<div class="train-forecast-history"><span>Local history</span><b>${history} service observation${history===1?'':'s'} so far</b></div>`:'';
/* The measured anchor. Without it "Busy" is a vibe; with it the user can see
   what the counted network actually looks like at this time of day. */
const calibrationMarkup=result.calibrationNote
  ?`<div class="train-forecast-calibration"><span>Measured baseline</span><b>${esc(result.calibrationNote)}</b>${result.calibrationSource?`<i>${esc(result.calibrationSource)}</i>`:''}</div>`
  :'';/* Four numbers that exist to be compared against each other read badly as a
   sentence. Drawn as one bar they are a shape you can take in at a glance,
   and the crowd-* classes already carry the band colour in both themes. */
const p=result.probabilities||null;
const bands=p?[['quiet','Quiet',p.quiet],['moderate','Moderate',p.moderate],['busy','Busy',p.busy],['very-busy','Very busy',p.veryBusy]].map(([key,label,value])=>({key,label,percent:Math.round((Number(value)||0)*100)})):[];
const probabilityMarkup=bands.length
  ?`<div class="train-forecast-probabilities"><span>Probability</span>`
    +`<div class="train-forecast-bar" role="img" aria-label="${esc(bands.map(band=>`${band.label} ${band.percent}%`).join(', '))}">`
    +bands.filter(band=>band.percent>0).map(band=>`<span class="crowd-${band.key}" style="flex:${band.percent} 1 0"><i></i></span>`).join('')
    +`</div><div class="train-forecast-legend">`
    +bands.map(band=>`<span class="crowd-${band.key}"><i></i>${esc(band.label)} <b>${band.percent}%</b></span>`).join('')
    +`</div></div>`
  :'';return `<div class="train-forecast-head"><span class="train-forecast-status"><i></i><strong>${esc(result.label)}</strong></span><span class="train-forecast-meta">${esc(meta)}</span></div><div class="train-forecast-reasons"><span>Why this forecast</span><ul>${items}</ul></div><details class="train-forecast-method"><summary>How this is worked out</summary><p>${esc(method)}</p>${calibrationMarkup}</details>${probabilityMarkup}${historyMarkup}`;}
/* Every write below is compared first. The board is watched by a
   MutationObserver that calls back into apply(), and re-assigning identical
   text or innerHTML still counts as a mutation - so unguarded writes kept a
   requestAnimationFrame loop alive for as long as the train view was open. */
function setText(el,value){if(el&&el.textContent!==value){el.textContent=value;return true;}return false;}
function setClass(el,value){if(el&&el.className!==value){el.className=value;return true;}return false;}
function setMarkup(el,value){if(el&&el.__kerbsideMarkup!==value){el.__kerbsideMarkup=value;el.innerHTML=value;return true;}return false;}
function applyLiveBoard(){
  const api=window.__KERBSIDE_TRAINS__,board=$('trainBoard');
  /* On an advance or same-day-planning date the live board is hidden with
     stale rows still in it. Rewriting those rows served nobody and, worse,
     tripped the travel-date observer into reloading the timetable. */
  if(!api||!api.state||!board||board.hidden)return;
  const dateApi=window.__KERBSIDE_TRAIN_DATE__;
  const date=dateApi&&dateApi.state&&dateApi.state.date?new Date(`${dateApi.state.date}T12:00:00`):new Date(),services=Array.isArray(api.state.services)?api.state.services:[];
  /* Rows were paired to services by array index. renderBoard emits them 1:1
     today so it happens to hold, but any future filtering would silently
     attach each forecast to the wrong train. Rows already carry
     data-service-id, so join on that and fall back to the index. */
  const keyed=new Map();if(api.serviceKey)services.forEach((service,index)=>keyed.set(String(api.serviceKey(service,index)),{service,index}));
  board.querySelectorAll('.train-service').forEach((article,position)=>{const id=article.getAttribute('data-service-id');const match=id&&keyed.get(id);const service=match?match.service:services[position];const index=match?match.index:position;if(!service)return;const result=forecast(service,index,services,{station:api.state.station,referenceDate:date,messages:api.state.board&&api.state.board.nrccMessages||[]});const suffix=result.cancelled?'':` · forecast v4`;const crowd=article.querySelector('.train-crowding');if(crowd){setClass(crowd,`train-crowding crowd-${result.level}`);setText(crowd.querySelector('b'),result.label);setText(crowd.querySelector('small'),result.cancelled?'service cancelled':`${result.confidence} confidence${suffix}`);const title=result.reasons.join(', ');if(crowd.title!==title)crowd.title=title;}const explain=article.querySelector('.train-crowding-explain');if(explain){setClass(explain,`train-crowding-explain crowd-${result.level}`);setMarkup(explain,detailMarkup(result,date));}});
}
function apply(){
  applyLiveBoard();
  /* The scheduled board renders its own rows, so v3 hands it the refreshed
     scores rather than reaching into markup it does not own. This is the
     path that gets bank holidays and event pressure onto advance journeys
     when those feeds resolve after first paint. */
  const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
  if(timetable&&typeof timetable.refreshForecasts==='function'){try{timetable.refreshForecasts();}catch(error){}}
}
function schedule(){if(state.scheduled)return;state.scheduled=true;requestAnimationFrame(()=>{state.scheduled=false;apply();});}
function normaliseBankHolidayPayload(json){const divisions={'england-and-wales':[],scotland:[],'northern-ireland':[]};for(const name of Object.keys(divisions)){const group=json&&json[name],dates=[];(group&&Array.isArray(group.events)?group.events:[]).forEach(event=>{if(event&&/^\d{4}-\d{2}-\d{2}$/.test(String(event.date||'')))dates.push(String(event.date));});divisions[name]=unique(dates);}return divisions;}
function applyBankHolidayDivisions(divisions,status='ready'){const next={},years={};for(const name of ['england-and-wales','scotland','northern-ireland']){const values=Array.isArray(divisions&&divisions[name])?divisions[name]:[];next[name]=new Set(values);years[name]=new Set(values.map(value=>Number(String(value).slice(0,4))).filter(Number.isFinite));}state.bankHolidaysByDivision=next;state.bankHolidayYears=years;state.bankHolidays=next['england-and-wales'];state.calendarReady=true;state.calendarStatus=status;state.calendarUpdatedAt=Date.now();schedule();}
function readCalendarCache(){try{const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return cached&&Number(cached.ts)&&cached.divisions?cached:null;}catch(error){return null;}}
async function loadCalendar(){const cached=readCalendarCache(),age=cached?Date.now()-cached.ts:Infinity;if(cached&&age<CACHE_MS){applyBankHolidayDivisions(cached.divisions,'cached');return;}try{const response=await fetch(BANK_HOLIDAY_URL,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`bank holiday calendar returned ${response.status}`);const divisions=normaliseBankHolidayPayload(await response.json());applyBankHolidayDivisions(divisions,'ready');try{localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),divisions}));}catch(error){}}catch(error){if(cached&&age<CACHE_STALE_MS)applyBankHolidayDivisions(cached.divisions,'stale');else{state.calendarReady=true;state.calendarStatus='fallback';state.calendarUpdatedAt=Date.now();schedule();}}}
function init(){const board=$('trainBoard');if(board){state.observer=new MutationObserver(schedule);state.observer.observe(board,{childList:true,subtree:true});}loadCalendar();schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__KERBSIDE_FORECAST_V4__={version:VERSION,state,forecast,apply,detailMarkup,calendarSignal,isBankHoliday,bankHolidayDivision,dftBankHolidayKeys,normaliseBankHolidayPayload,applyBankHolidayDivisions,liveSignal,historicalSignal,formationSignal,eventSignal,connectionDisplacementSignal,journeyShapeSignal,stationMatchesOrigin,profileKey,profileDestinationIdentity,stationScaleSignal,schoolHolidaySignal,offPeakSignal,cancellationKnockOn,formationBaseline,calibratedDemandSignal,serviceClassSignal,calibration,scoreThresholds,easterSunday,removeLegacyFeedback,STATION_TIER,MAX_EVENT_PRESSURE,ordinalProbabilities,probabilityConfidence,servicePatternSignal,benchmarkServices,dftMinuteForService,isBankHoliday};
window.__KERBSIDE_FORECAST_V3__=window.__KERBSIDE_FORECAST_V4__;
})();
