/* Kerbside rail demand calibration.
 *
 * Source: Department for Transport, "Rail passenger numbers and crowding on
 * weekdays in major cities in England and Wales: 2025", published 28 July 2026.
 * Contains public sector information licensed under the Open Government
 * Licence v3.0 - free to reuse commercially with attribution, which is why it
 * can ship in an App Store build where Ticketmaster/Songkick/Skiddle cannot.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every weight in Forecast v2/v3 was tuned by feel. This module supplies the
 * only measured ground truth available for GB crowding, so the model's
 * baseline is anchored rather than invented. It deliberately does NOT try to
 * predict individual trains - see the sampling caveat below.
 *
 * WHAT IT IS NOT
 * --------------
 * Not real time, and not close to it. The counts were taken between
 * 16 September and 13 December 2025 and published 28 July 2026 - a lag of
 * seven to ten months, refreshed annually. It calibrates the baseline that
 * live Darwin evidence, events, holidays and weather then push around.
 *
 * SCOPE LIMITS, which the signals below respect:
 *   - Tuesday to Thursday, autumn, school term time. It is a WEEKDAY COMMUTER
 *     shape. Applying it to an August Saturday would be actively wrong, so
 *     every signal here is gated to weekdays and returns zero otherwise.
 *   - England and Wales only, franchised operators only. No ScotRail, no open
 *     access (Heathrow Express, Grand Central, Hull Trains, Lumo). Unknown
 *     stations return null and the caller keeps its existing behaviour.
 *   - DfT warns that per-service figures carry large sampling error - some
 *     services counted once - so the "10 busiest services" table is not
 *     encoded here. Only city, station, operator-class and network aggregates.
 *
 * FIGURES ENCODED BELOW ARE AGGREGATES QUOTED IN THE PUBLICATION TEXT.
 * The finer time-band tables (RAI0202 city-by-time-band, RAI0203 London
 * station-by-time-band) are ODS downloads that are not embedded yet. When they
 * are parsed into a lookup, drop it into TIME_BANDS and demandShape() will use
 * it automatically - no interface change needed.
 */
(function(){
'use strict';

const SOURCE='DfT rail passenger numbers and crowding, autumn 2025 (OGL v3)';
const RELEASED='2026-07-28';
const COUNT_PERIOD='16 September to 13 December 2025';

/* DfT peak definitions. Note these differ from the windows the older
   demandSignal uses (07:00-09:00 and 16:30-18:30); the calibrated signals use
   DfT's so they line up with the numbers they are derived from. */
const AM_PEAK=[420,599];   // trains arriving  07:00-09:59
const PM_PEAK=[960,1139];  // trains departing 16:00-18:59

/* ------------------------------------------------------------------
   Network aggregates. Quoted directly from the 2025 release.
------------------------------------------------------------------ */
const NETWORK={
  allDayLoadFactor:0.29,          // average overall load factor, all day
  peakLoadFactor:0.53,            // average overall load factor, both peaks
  peakOverSeating:0.32,           // share of peak services carrying standing passengers
  peakOverCapacity:0.05,          // share of peak services above TOTAL capacity
  peakStandingShare:0.20,         // 1 in 5 peak passengers standing, all major cities
  pixcAllCities:0.011             // passengers in excess of capacity, both peaks
};

/* Geography splits. London's peak is far sharper than anywhere else, and the
   old model had no way to know that: a 08:15 departure was treated the same
   at Euston as at Nottingham. */
const GEOGRAPHY={
  london:{
    peakShare:0.43,               // share of all travel in peak periods
    amArrivalShare:0.46,
    pmDepartureShare:0.41,
    seatUtilisationPeak:1.22,     // 122% - more passengers than seats on average
    overallUtilisationPeak:0.65,
    overSeatingPeak:0.53,         // 53% of peak services exceed seating capacity
    overCapacityPeak:0.08,
    standingSharePeak:0.25,
    pixc:0.013
  },
  regional:{
    peakShare:0.29,
    amArrivalShare:0.28,
    seatUtilisationPeak:0.63,
    overallUtilisationPeak:0.41,
    overSeatingPeak:0.14,
    overCapacityPeak:0.03,
    standingSharePeak:0.05,
    pixc:0.004
  }
};

/* Operator classes. The counter-intuitive one, and the reason this matters:
   long-distance services exceed TOTAL capacity more often (13%) than London
   commuter services (8%) or regional services (under 1%).
   
   Read that carefully before trusting it too far. Long-distance services get
   no standing allowance at all, because DfT only permits one for journeys of
   20 minutes or less. So "over total capacity" means seats-only for them and
   seats-plus-standing for a commuter train - it is partly a measurement
   artefact. It is still the right signal for THIS app: standing on a two-hour
   CrossCountry is exactly the outcome a traveller wants warning about. */
const LONG_DISTANCE=new Set(['XC','VT','GR']);   // CrossCountry, Avanti West Coast, LNER
const OPERATOR_CLASS={
  longDistance:{overCapacityPeak:0.13,label:'long-distance'},
  londonCommuter:{overCapacityPeak:0.08,label:'London and South East commuter'},
  regional:{overCapacityPeak:0.009,label:'regional'}
};

/* ------------------------------------------------------------------
   Stations. London terminals carry measured PiXC; other cities carry the
   city-level figure. Only values actually published are encoded - anything
   absent is left undefined rather than guessed, and callers fall back.
   Passenger counts are on arrival at the first Zone 1 stop, so Charing Cross
   and Cannon Street services are counted at London Bridge, and Waterloo at
   Vauxhall - the mapping below follows that.
------------------------------------------------------------------ */
const LONDON_TERMINALS={
  KGX:{name:"King's Cross",pixc:0.042},
  VXH:{name:'Vauxhall (for Waterloo)',pixc:0.041},
  WAT:{name:'London Waterloo',pixc:0.041},
  MYB:{name:'Marylebone',pixc:0.036},
  EUS:{name:'London Euston',pixc:0.031},
  LST:{name:'London Liverpool Street',pixc:0.013,dailyArrivals:291600,peakShare:0.41},
  LBG:{name:'London Bridge',pixc:0.013},
  CHX:{name:'London Charing Cross',pixc:0.013},
  CST:{name:'London Cannon Street',pixc:0.013},
  BFR:{name:'London Blackfriars',pixc:0.013,amStandingShare:0.42},
  EPH:{name:'Elephant & Castle',pixc:0.013,amStandingShare:0.42},
  FST:{name:'London Fenchurch Street',pixc:0.013,peakShare:0.60},
  PAD:{name:'London Paddington',pixc:0.013},
  STP:{name:'London St Pancras International',pixc:0.013},
  VIC:{name:'London Victoria',pixc:0.013},
  MOG:{name:'Moorgate',pixc:0.013},
  ZFD:{name:'Farringdon',pixc:0.013},
  OLD:{name:'Old Street',pixc:0.013}
};

/* Cities counted outside London. dailyArrivals and pixc only where published. */
const CITIES={
  BHM:{city:'Birmingham',dailyArrivals:116700,pixc:0.011,amStandingShare:0.13,peakShare:0.34},
  BHI:{city:'Birmingham',pixc:0.011},
  BMO:{city:'Birmingham',pixc:0.011},
  RDG:{city:'Reading',dailyArrivals:106800},
  MAN:{city:'Manchester',dailyArrivals:96000},
  MCV:{city:'Manchester'},
  MCO:{city:'Manchester'},
  BRI:{city:'Bristol',pixc:0.014},
  BPW:{city:'Bristol',pixc:0.014},
  SHF:{city:'Sheffield',pixc:0.009},
  CDF:{city:'Cardiff',pixc:0.007},
  CDQ:{city:'Cardiff',pixc:0.007},
  LDS:{city:'Leeds'},
  LIV:{city:'Liverpool'},
  LVJ:{city:'Liverpool'},
  NCL:{city:'Newcastle'},
  NOT:{city:'Nottingham'},
  LEI:{city:'Leicester'},
  BTN:{city:'Brighton'},
  CBG:{city:'Cambridge'}
};

/* Exact 2025 DfT RAI0202/RAI0203 bands are generated from the official
   ODS workbooks at release time. They contain two four-hour edge bands and
   hourly 07:00-22:59 values; Kerbside preserves that shape rather than
   inventing hourly values inside the edge bands. */
const TIME_BANDS=window.__KERBSIDE_DFT_TIME_BANDS__||null;
/* These are Kerbside interpretation thresholds, not categories published by
   DfT. They anchor the 0-5 score to measured seat utilisation while leaving
   room for live Darwin, event and route evidence to move an individual train. */
const SCORE_THRESHOLDS={moderate:1.5,busy:2.65,veryBusy:3.85};
const LOAD_FACTOR_BANDS={moderate:.32,busy:.64,veryBusy:.99};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function crsOf(station){return String(station&&(station.crs||station)||'').toUpperCase();}
function inBand(minute,band){return minute!=null&&minute>=band[0]&&minute<=band[1];}

function isWeekday(date){
  const day=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short'}).format(date||new Date());
  return day!=='Sat'&&day!=='Sun';
}

/* Returns the measured profile for a station, or null when DfT did not count
   it - which is most of the network, and is the normal case. */
function profileFor(station){
  const crs=crsOf(station);
  if(!crs)return null;
  if(LONDON_TERMINALS[crs])return {...LONDON_TERMINALS[crs],crs,area:'london',...GEOGRAPHY.london,...LONDON_TERMINALS[crs]};
  if(CITIES[crs])return {...CITIES[crs],crs,area:'regional',...GEOGRAPHY.regional,...CITIES[crs]};
  return null;
}

function operatorClass(operatorCode,station){
  const code=String(operatorCode||'').toUpperCase();
  if(LONG_DISTANCE.has(code))return {...OPERATOR_CLASS.longDistance,key:'longDistance'};
  const profile=profileFor(station);
  if(profile&&profile.area==='london')return {...OPERATOR_CLASS.londonCommuter,key:'londonCommuter'};
  return {...OPERATOR_CLASS.regional,key:'regional'};
}

/* ------------------------------------------------------------------
   Signals. Each returns {amount, reasons} on the same scale the rest of
   Forecast v3 uses, and {amount:0, reasons:[]} when it has nothing measured
   to say - so a caller that loses this module behaves exactly as before.
------------------------------------------------------------------ */

/* Station scale, measured. Replaces the hand-built STATION_TIER lookup where
   DfT actually counted the station, and stays silent everywhere else so the
   tier table still covers the rest of the network. */
function scaleSignal(station){
  const profile=profileFor(station);
  if(!profile)return {amount:0,reasons:[],measured:false};
  const pixc=Number(profile.pixc)||0;
  if(profile.area==='london'){
    /* Terminal-level PiXC spans 1.3% (London average) to 4.2% (King's Cross).
       Map that range onto the same 0-0.35 band the tier table used, so scores
       stay comparable with earlier builds. */
    const amount=clamp(0.18+(pixc-0.013)*7.5,0.18,0.4);
    return pixc>0.02
      ? {amount,reasons:[`${profile.name} is among the most crowded London terminals in DfT counts`],measured:true}
      : {amount,reasons:['major London terminal with high measured passenger throughput'],measured:true};
  }
  const arrivals=Number(profile.dailyArrivals)||0;
  if(arrivals>=90000)return {amount:0.22,reasons:[`${profile.city} is one of the busiest counted cities outside London`],measured:true};
  if(pixc>=0.009)return {amount:0.2,reasons:[`${profile.city} has above-average measured peak crowding`],measured:true};
  return {amount:0.12,reasons:['counted major city station'],measured:true};
}

/* Peak shape. Deliberately a DIFFERENTIAL, not another peak boost: the older
   demandSignal already raises peaks, so adding a second one would inflate
   every commuter train. This only corrects for how much more (London) or less
   (regional) peaked a place is than the flat national assumption baked into
   that original curve. Net effect across the network is close to zero. */
function measuredBand(station,minute,direction='departures'){
  if(minute==null||!TIME_BANDS||typeof TIME_BANDS.recordFor!=='function'||typeof TIME_BANDS.bandIndex!=='function')return null;
  const profile=profileFor(station);if(!profile)return null;
  const record=TIME_BANDS.recordFor(station,profile.city||(profile.area==='london'?'London':''));if(!record)return null;
  const index=TIME_BANDS.bandIndex(minute);if(index<0)return null;
  const prefix=String(direction).toLowerCase().startsWith('arr')?'a':'d';
  const passengers=Array.isArray(record[`${prefix}p`])?Number(record[`${prefix}p`][index]):NaN;
  const seats=Array.isArray(record[`${prefix}s`])?Number(record[`${prefix}s`][index]):NaN;
  const total=Number(record[`${prefix}pt`]);
  const hours=Number(TIME_BANDS.bandHours&&TIME_BANDS.bandHours[index])||1;
  const share=Number.isFinite(passengers)&&total>0?passengers/total:null;
  const flatShare=hours/24;
  const loadFactor=Number.isFinite(passengers)&&Number.isFinite(seats)&&seats>0?passengers/seats:null;
  return {index,label:TIME_BANDS.bandLabels&&TIME_BANDS.bandLabels[index]||'',scope:record.scope,key:record.key,name:record.name,passengers:Number.isFinite(passengers)?passengers:null,seats:Number.isFinite(seats)?seats:null,total:Number.isFinite(total)?total:null,share,flatShare,loadFactor,hours};
}
function measuredCrowdingBand(loadFactor){
  const value=Number(loadFactor);if(!Number.isFinite(value))return'';
  if(value>=LOAD_FACTOR_BANDS.veryBusy)return'very-busy';
  if(value>=LOAD_FACTOR_BANDS.busy)return'busy';
  if(value>=LOAD_FACTOR_BANDS.moderate)return'moderate';
  return'quiet';
}
function scoreThresholds(){return {...SCORE_THRESHOLDS};}
function demandShape(station,minute,date){
  if(minute==null||!isWeekday(date))return {amount:0,reasons:[]};
  const profile=profileFor(station);if(!profile)return {amount:0,reasons:[]};
  const measured=measuredBand(station,minute,'departures');
  if(measured&&Number.isFinite(measured.share)){
    const ratio=measured.flatShare>0?measured.share/measured.flatShare:1;
    const shapeAmount=clamp(Math.log2(Math.max(.25,ratio))*.22,-.35,.45);
    const load=measured.loadFactor;
    const capacityAmount=!Number.isFinite(load)?0:load>=1?.25:load>=.8?.15:load>=.6?.08:load<=.25?-.08:0;
    const amount=clamp(shapeAmount+capacityAmount,-.4,.6),reasons=[];
    const where=measured.scope==='station'?measured.name:(profile.city||profile.name);
    if(Math.abs(shapeAmount)>=.04)reasons.push(`DfT 2025 measured ${where} departures are ${ratio>=1?'above':'below'} its all-day time-normalised average in this band`);
    if(Number.isFinite(load)&&load>=.6)reasons.push(`DfT measured about ${Math.round(load*100)} passengers per 100 seats in this ${measured.label} aggregate`);
    return {amount,reasons,measured};
  }
  /* Suppressed/missing cells fail back to the older coarse peak correction. */
  const peak=inBand(minute,AM_PEAK)||inBand(minute,PM_PEAK);
  if(profile.area==='london'){
    if(peak)return {amount:.25,reasons:['London peak demand is far more concentrated than the network average']};
    return {amount:-.1,reasons:[]};
  }
  if(peak)return {amount:-.2,reasons:['peak demand outside London is measurably flatter than in the capital']};
  return {amount:0,reasons:[]};
}

/* Service class. The correction the model was missing entirely. */
function serviceClassSignal(service,station,minute,date){
  if(!isWeekday(date))return {amount:0,reasons:[]};
  const info=operatorClass(service&&(service.operatorCode||service.toc),station);
  const peak=inBand(minute,AM_PEAK)||inBand(minute,PM_PEAK);
  /* The long-distance finding is a network-wide property of the operator
     group, so it holds wherever one of those trains calls. */
  if(info.key==='longDistance'){
    return {amount:peak?0.3:0.18,reasons:['long-distance services have no standing allowance and are the most likely to exceed capacity in DfT counts']};
  }
  /* The commuter and regional findings are station-relative, and inferring
     "regional" from "not in the London table" would apply a measured figure
     to places DfT never counted - including uncounted London-area stations.
     Stay silent unless this station is genuinely in the counts. */
  if(!profileFor(station))return {amount:0,reasons:[]};
  if(info.key==='londonCommuter'&&peak){
    return {amount:0.15,reasons:['just over half of London peak services carry passengers in excess of seats']};
  }
  if(info.key==='regional'&&peak){
    return {amount:-0.1,reasons:['regional peak services rarely exceed total capacity in DfT counts']};
  }
  return {amount:0,reasons:[]};
}

/* A plain-English anchor for the explain card. Not a score input - it tells
   the user what the measured network actually looks like, so "Busy" means
   something concrete rather than a vibe. */
function contextNote(station,minute,date){
  const profile=profileFor(station),measured=isWeekday(date)?measuredBand(station,minute,'departures'):null;
  const peak=inBand(minute,AM_PEAK)||inBand(minute,PM_PEAK);
  if(!isWeekday(date))return '';
  if(measured){
    const where=measured.scope==='station'?measured.name:(profile&&profile.city)||'this city';
    const share=Number.isFinite(measured.share)?Math.round(measured.share*1000)/10:null;
    const load=Number.isFinite(measured.loadFactor)?Math.round(measured.loadFactor*100):null;
    if(load!=null)return `DfT 2025 measured baseline for ${where}, ${measured.label}: ${load} passengers per 100 seats, with ${share}% of the day's departures in this time band.`;
    if(share!=null)return `DfT 2025 measured baseline for ${where}, ${measured.label}: ${share}% of the day's departures fall in this time band; the seat figure is suppressed or unavailable.`;
  }
  if(profile&&profile.area==='london'&&peak)return `For scale: DfT counts found about a quarter of peak passengers standing in London, and just over half of peak services carrying more passengers than seats.`;
  if(profile&&peak)return `For scale: DfT counts found about 1 in 20 peak passengers standing outside London, with 14% of peak services above seating capacity.`;
  if(peak)return `For scale: DfT counts found about a third of peak services into major cities carry standing passengers, and 5% exceed total capacity.`;
  return `For scale: DfT counts put the average all-day load factor at 29%, rising to 53% across the peaks.`;
}


function v4Data(){return window.__KERBSIDE_RAIL_DEMAND_V4__||null;}
function stationUsageRecord(station){const data=v4Data();return data&&typeof data.station==='function'?data.station(crsOf(station)):null;}
function stationUsageSignal(station){
  const row=stationUsageRecord(station);if(!row)return {amount:0,reasons:[],measured:false};
  const percentile=Number(row.percentile),usage=Number(row.usage)||0,interchanges=Number(row.interchanges)||0;
  let amount=Number.isFinite(percentile)?clamp((percentile-.5)*.52,-.12,.32):0;
  const interchangeShare=usage>0?interchanges/usage:0;if(interchangeShare>=.18)amount+=.08;else if(interchangeShare>=.08)amount+=.04;
  const reasons=[];if(percentile>=.95)reasons.push(`${row.name} is in the busiest 5% of GB stations in ORR 2024-25 usage`);else if(percentile>=.8)reasons.push(`${row.name} has high measured ORR station usage`);else if(percentile<=.2)reasons.push(`${row.name} has relatively low measured ORR station usage`);
  if(interchangeShare>=.08)reasons.push('ORR records substantial interchange traffic at this station');
  return {amount:clamp(amount,-.15,.4),reasons,measured:true,row};
}
function destinationCrs(service,context={}){const override=context&&context.eventJourney&&context.eventJourney.destinationCrs;if(override)return String(override).toUpperCase();const route=service&&(service.routeDestination||service.displayDestination);if(route&&route.crs)return String(route.crs).toUpperCase();const item=Array.isArray(service&&service.destination)?service.destination.find(Boolean):null;return String(item&&item.crs||'').toUpperCase();}
function routeFlowSignal(station,destination){
  const data=v4Data(),from=data&&data.station?data.station(crsOf(station)):null,to=data&&data.station?data.station(crsOf(destination)):null;if(!from||!to)return {amount:0,reasons:[],measured:false};
  const direct=String(from.mainCrs||'')===String(to&&destination&&destination.crs||destination||'').toUpperCase(),reverse=String(to.mainCrs||'')===crsOf(station);if(!direct&&!reverse)return {amount:0,reasons:[],measured:true};
  const source=direct?from:to,base=Math.max(1,Number(source.usage)||0),share=Math.min(1,(Number(source.mainJourneys)||0)/base),amount=clamp(.12+share*.8,.12,.42);
  return {amount,reasons:[`ORR station estimates identify ${source.mainName} as ${source.name}'s largest origin/destination flow`],measured:true,share};
}
const OPERATOR_ALIASES={XC:['crosscountry'],GW:['great western'],VT:['avanti west coast'],GR:['london north eastern','lner'],EM:['east midlands'],LM:['west midlands','london northwestern'],NT:['northern'],TP:['transpennine'],CH:['chiltern'],AW:['transport for wales','arriva trains wales'],SE:['southeastern'],SN:['southern'],TL:['thameslink','govia thameslink'],GN:['great northern','govia thameslink'],SW:['south western'],CC:['c2c'],LE:['greater anglia'],LO:['london overground']};
function operatorKeys(service){const data=v4Data(),normalise=data&&data.norm?data.norm:(v=>String(v||'').toLowerCase()),full=normalise(service&&(service.operator||'')),code=String(service&&(service.operatorCode||'')).toUpperCase();return [full,...(OPERATOR_ALIASES[code]||[])].filter(Boolean);}
function findOperator(area,service){if(!area||!area.operators)return null;const keys=operatorKeys(service),data=v4Data(),normalise=data&&data.norm?data.norm:(v=>String(v||'').toLowerCase());for(const key of keys){if(area.operators[key])return area.operators[key];for(const [name,row] of Object.entries(area.operators)){if(name==='_total')continue;const n=normalise(name);if(n.includes(key)||key.includes(n))return row;}}return null;}
function peakDirection(minute){return inBand(minute,AM_PEAK)?'am':inBand(minute,PM_PEAK)?'pm':'';}
function operatorCrowdingSignal(service,station,minute){
  const dir=peakDirection(minute),data=v4Data(),profile=profileFor(station);if(!dir||!data||!profile)return {amount:0,reasons:[],measured:false};
  const area=(typeof data.stationOperator==='function'&&data.stationOperator(crsOf(station)))||(typeof data.cityOperator==='function'&&data.cityOperator(profile.city||''));if(!area)return {amount:0,reasons:[],measured:false};
  const row=findOperator(area,service),total=area.operators&&area.operators._total;if(!row||!row[dir])return {amount:0,reasons:[],measured:false};
  const r=row[dir],t=total&&total[dir]||{},stand=Number(r.standing),pixc=Number(r.pixc),baseStand=Number(t.standing),basePixc=Number(t.pixc);
  const pressure=(Number.isFinite(stand)?stand:0)+(Number.isFinite(pixc)?pixc*2:0),baseline=(Number.isFinite(baseStand)?baseStand:0)+(Number.isFinite(basePixc)?basePixc*2:0),amount=clamp((pressure-baseline)*1.9,-.32,.55),reasons=[];
  if(Number.isFinite(stand))reasons.push(`DfT 2025 measured ${Math.round(stand*100)}% standing passengers for ${row.name} in this ${dir.toUpperCase()} peak area`);if(Number.isFinite(pixc)&&pixc>=.01)reasons.push(`DfT measured ${Math.round(pixc*1000)/10}% of ${row.name} passengers in excess of capacity here`);
  return {amount,reasons,measured:true,row};
}
function peakCapacitySignal(station,minute){
  const dir=peakDirection(minute),data=v4Data(),profile=profileFor(station);if(!dir||!data||!profile)return {amount:0,reasons:[],measured:false};
  const area=(typeof data.stationPeak==='function'&&data.stationPeak(crsOf(station)))||(typeof data.cityPeak==='function'&&data.cityPeak(profile.city||'')),row=area&&area[dir];if(!row)return {amount:0,reasons:[],measured:false};
  const critical=Number(row.critical),seats=Number(row.seats),capacity=Number(row.capacity),seatLoad=critical>0&&seats>0?critical/seats:null,overall=critical>0&&capacity>0?critical/capacity:null;let amount=0;const reasons=[];
  if(Number.isFinite(seatLoad)){amount+=clamp((seatLoad-.7)*.55,-.2,.4);if(seatLoad>=.9)reasons.push(`DfT peak critical load is about ${Math.round(seatLoad*100)} passengers per 100 seats in this area`);}if(Number.isFinite(overall)&&overall>=.9){amount+=clamp((overall-.9)*.7,0,.18);reasons.push('DfT peak loads run close to the published total capacity here');}
  return {amount:clamp(amount,-.2,.5),reasons,measured:true,row,seatLoad,overall};
}
function utilisationPrior(service,station,minute,date){
  const data=v4Data(),u=data&&data.utilisation;if(!u||!u.priors||!isWeekday(date)||!peakDirection(minute))return null;const code=String(service&&(service.operatorCode||'')).toUpperCase(),name=String(service&&(service.operator||'')).toLowerCase(),profile=profileFor(station),usage=stationUsageRecord(station);
  const longDistance=['XC','VT','GR'].includes(code)||/crosscountry|avanti|lner|london north eastern/.test(name),group=longDistance?'longDistance':(profile&&profile.area==='london')||(usage&&String(usage.region).toLowerCase()==='london')?'london':'regional';
  const probabilities=u.priors[group]||u.priors.all,mean=u.means&&u.means[group];return {group,probabilities:Array.isArray(probabilities)?probabilities.slice():null,mean:Number(mean),source:'DfT RAI0216 2025 empirical peak utilisation'};
}

window.__KERBSIDE_CALIBRATION__={
  source:SOURCE,released:RELEASED,countPeriod:COUNT_PERIOD,
  scaleSignal,demandShape,serviceClassSignal,contextNote,measuredBand,measuredCrowdingBand,scoreThresholds,
  stationUsageRecord,stationUsageSignal,routeFlowSignal,operatorCrowdingSignal,peakCapacitySignal,utilisationPrior,
  profileFor,operatorClass,isWeekday,
  NETWORK,GEOGRAPHY,OPERATOR_CLASS,LONDON_TERMINALS,CITIES,TIME_BANDS,SCORE_THRESHOLDS,LOAD_FACTOR_BANDS,AM_PEAK,PM_PEAK
};
})();
