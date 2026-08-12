#!/usr/bin/env python3
from pathlib import Path
import json
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text=read(path); count=text.count(old)
    if count!=1: raise SystemExit(f'{path}: expected one match, found {count}: {old[:120]!r}')
    write(path,text.replace(old,new,1))


def sub_once(path, pattern, repl, flags=0):
    text=read(path); out,count=re.subn(pattern,repl,text,count=1,flags=flags)
    if count!=1: raise SystemExit(f'{path}: regex expected one match, found {count}: {pattern[:120]!r}')
    write(path,out)


def replace_span(path,start,end,new):
    text=read(path); a=text.find(start)
    if a<0: raise SystemExit(f'{path}: start marker missing: {start!r}')
    b=text.find(end,a)
    if b<0: raise SystemExit(f'{path}: end marker missing: {end!r}')
    write(path,text[:a]+new+text[b:])


# ---------------------------------------------------------------------------
# Release/version wiring.
if read('VERSION').strip()!='0.8.0':
    raise SystemExit(f"Expected VERSION 0.8.0, found {read('VERSION').strip()!r}")
write('VERSION','0.8.1\n')
replace_once('kerbside-status.js',"const VERSION='0.8.0';","const VERSION='0.8.1';")
bus=read('bus.html')
if '?v=0.8.0' not in bus: raise SystemExit('bus.html: expected 0.8.0 cache busters')
bus=bus.replace('?v=0.8.0','?v=0.8.1')
write('bus.html',bus)
# The generated DfT table must load before the calibration module consumes it.
sub_once('bus.html',r'(<script[^>]+src=["\']kerbside-rail-calibration\.js\?v=0\.8\.1["\'][^>]*></script>)',r'<script src="kerbside-rail-timebands.js?v=0.8.1"></script>\n\1')


# ---------------------------------------------------------------------------
# DfT measured time-band calibration and score interpretation.
cal='kerbside-rail-calibration.js'
replace_once(cal,'const TIME_BANDS={};',"""const TIME_BANDS=window.__KERBSIDE_DFT_TIME_BANDS__||null;
/* Kerbside labels are not DfT categories. They are our interpretation of the
   0-5 forecast score, now anchored to measured seat utilisation: roughly
   one-third full -> Moderate, two-thirds -> Busy, and seats-full -> Very busy.
   Live evidence can still move an individual train above or below the measured
   aggregate for its city/station and time band. */
const SCORE_THRESHOLDS={moderate:1.5,busy:2.65,veryBusy:3.85};
const LOAD_FACTOR_BANDS={moderate:.32,busy:.64,veryBusy:.99};""")

replace_span(cal,'function demandShape(station,minute,date){','\n/* Service class.',r'''function measuredBand(station,minute,direction='departures'){
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
    const amount=clamp(shapeAmount+capacityAmount,-.4,.6);
    const reasons=[];
    const where=measured.scope==='station'?measured.name:(profile.city||profile.name);
    if(Math.abs(shapeAmount)>=.04)reasons.push(`DfT 2025 measured ${where} departures are ${ratio>=1?'above':'below'} its all-day time-normalised average in this band`);
    if(Number.isFinite(load)&&load>=.6)reasons.push(`DfT measured about ${Math.round(load*100)} passengers per 100 seats in this ${measured.label} aggregate`);
    return {amount,reasons,measured};
  }
  const peak=inBand(minute,AM_PEAK)||inBand(minute,PM_PEAK);
  if(profile.area==='london'){
    if(peak)return {amount:.25,reasons:['London peak demand is far more concentrated than the network average']};
    return {amount:-.1,reasons:[]};
  }
  if(peak)return {amount:-.2,reasons:['peak demand outside London is measurably flatter than in the capital']};
  return {amount:0,reasons:[]};
}

/* Service class.''')

replace_span(cal,'function contextNote(station,minute,date){','\n\nwindow.__KERBSIDE_CALIBRATION__=',r'''function contextNote(station,minute,date){
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

window.__KERBSIDE_CALIBRATION__=''')
replace_once(cal,"""  scaleSignal,demandShape,serviceClassSignal,contextNote,
  profileFor,operatorClass,isWeekday,
  NETWORK,GEOGRAPHY,OPERATOR_CLASS,LONDON_TERMINALS,CITIES,TIME_BANDS,AM_PEAK,PM_PEAK
};""","""  scaleSignal,demandShape,serviceClassSignal,contextNote,measuredBand,measuredCrowdingBand,scoreThresholds,
  profileFor,operatorClass,isWeekday,
  NETWORK,GEOGRAPHY,OPERATOR_CLASS,LONDON_TERMINALS,CITIES,TIME_BANDS,SCORE_THRESHOLDS,LOAD_FACTOR_BANDS,AM_PEAK,PM_PEAK
};""")


# Forecast v3 uses the calibrated score boundaries rather than duplicated magic numbers.
f3='kerbside-train-forecast-v3.js'
replace_once(f3,"function labelFor(s){return s>=4?'Very busy':s>=2.75?'Busy':s>=1.55?'Moderate':'Quiet';}function levelFor(s){return s>=4?'very-busy':s>=2.75?'busy':s>=1.55?'moderate':'quiet';}","""function scoreThresholds(){const cal=calibration();if(cal&&typeof cal.scoreThresholds==='function'){try{return cal.scoreThresholds();}catch(error){}}return {moderate:1.55,busy:2.75,veryBusy:4};}
function labelFor(s){const t=scoreThresholds();return s>=t.veryBusy?'Very busy':s>=t.busy?'Busy':s>=t.moderate?'Moderate':'Quiet';}function levelFor(s){const t=scoreThresholds();return s>=t.veryBusy?'very-busy':s>=t.busy?'busy':s>=t.moderate?'moderate':'quiet';}""")
replace_once(f3,'calibratedDemandSignal,serviceClassSignal,calibration,easterSunday,removeLegacyFeedback,STATION_TIER,MAX_EVENT_PRESSURE','calibratedDemandSignal,serviceClassSignal,calibration,scoreThresholds,easterSunday,removeLegacyFeedback,STATION_TIER,MAX_EVENT_PRESSURE')


# ---------------------------------------------------------------------------
# Privacy-safe, on-device Forecast v3 accuracy tracking.
trains='kerbside-trains.js'
replace_once(trains,"const MODEL_FEEDBACK_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;","""const MODEL_FEEDBACK_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const ACCURACY_KEY = 'kerbside.rail.forecast.accuracy.v1';
const ACCURACY_VERSION = 1;
const ACCURACY_RECENT_MAX = 120;
const CROWD_LEVEL_RANK = {quiet:0,moderate:1,busy:2,'very-busy':3};""")
replace_once(trains,'  crowdingModel: null\n};','  crowdingModel: null,\n  forecastAccuracy: null\n};')
accuracy_helpers=r'''
function emptyForecastAccuracy(){return {version:ACCURACY_VERSION,total:0,exact:0,withinOne:0,absoluteError:0,recent:[]};}
function safeReadForecastAccuracy(){
  try{const parsed=JSON.parse(localStorage.getItem(ACCURACY_KEY)||'null');if(!parsed||parsed.version!==ACCURACY_VERSION)return emptyForecastAccuracy();if(!Array.isArray(parsed.recent))parsed.recent=[];return parsed;}catch(error){return emptyForecastAccuracy();}
}
function saveForecastAccuracy(){try{if(!state.forecastAccuracy)return;state.forecastAccuracy.recent=(state.forecastAccuracy.recent||[]).slice(-ACCURACY_RECENT_MAX);localStorage.setItem(ACCURACY_KEY,JSON.stringify(state.forecastAccuracy));}catch(error){}}
function forecastAccuracySummary(){
  const data=state.forecastAccuracy||safeReadForecastAccuracy(),total=Number(data.total)||0;
  return {total,exact:total?Number(data.exact||0)/total:0,withinOne:total?Number(data.withinOne||0)/total:0,meanAbsoluteError:total?Number(data.absoluteError||0)/total:0,recent:Array.isArray(data.recent)?data.recent.length:0};
}
function recordForecastAccuracy(service,index,reportedLevel,date){
  const actual=CROWD_LEVEL_RANK[reportedLevel],api=window.__KERBSIDE_FORECAST_V3__;
  if(actual==null||!api||typeof api.forecast!=='function'||!state.station)return false;
  let result;try{result=api.forecast(service,index,state.services,{station:state.station,referenceDate:date,messages:state.board&&state.board.nrccMessages||[]});}catch(error){return false;}
  const predictedLevel=String(result&&result.level||''),predicted=CROWD_LEVEL_RANK[predictedLevel];if(predicted==null)return false;
  if(!state.forecastAccuracy)state.forecastAccuracy=safeReadForecastAccuracy();
  const error=Math.abs(predicted-actual),data=state.forecastAccuracy,ts=Date.now();
  data.total=(Number(data.total)||0)+1;if(error===0)data.exact=(Number(data.exact)||0)+1;if(error<=1)data.withinOne=(Number(data.withinOne)||0)+1;data.absoluteError=(Number(data.absoluteError)||0)+error;
  /* Deliberately store no station, service, route, train ID or user identifier. */
  data.recent=(Array.isArray(data.recent)?data.recent:[]).concat([{ts,predicted:predictedLevel,actual:reportedLevel,error}]).slice(-ACCURACY_RECENT_MAX);
  saveForecastAccuracy();return true;
}
'''
replace_once(trains,"function fetchWithTimeout(url, options={}){",accuracy_helpers+"\nfunction fetchWithTimeout(url, options={}){")
replace_once(trains,'  const profile = ensureProfile(profileKeyFor(service,state.station,date));','  recordForecastAccuracy(service,index,level,date);\n\n  const profile = ensureProfile(profileKeyFor(service,state.station,date));')
replace_once(trains,"  const learningText=`${historySamples} local service observation${historySamples===1?'':'s'} available`;","""  const learningText=`${historySamples} local service observation${historySamples===1?'':'s'} available`;
  const accuracy=forecastAccuracySummary();
  const accuracyText=accuracy.total?`Local Forecast v3 validation: ${Math.round(accuracy.exact*100)}% exact · ${Math.round(accuracy.withinOne*100)}% within one band · ${accuracy.total} report${accuracy.total===1?'':'s'}.`:'Local Forecast v3 validation starts after you record actual crowding.';""")
replace_once(trains,"      ${recorded ? `<div class=\"train-detail-note\">Saved locally: ${esc(FEEDBACK_LABEL[recorded] || recorded)}.</div>` : ''}\n    </div>","""      ${recorded ? `<div class=\"train-detail-note\">Saved locally: ${esc(FEEDBACK_LABEL[recorded] || recorded)}.</div>` : ''}
      <div class=\"train-detail-note\">${esc(accuracyText)} Nothing is uploaded.</div>
    </div>""")
replace_once(trains,'  state.crowdingModel = safeReadCrowdingModel();','  state.crowdingModel = safeReadCrowdingModel();\n  state.forecastAccuracy = safeReadForecastAccuracy();',1)
replace_once(trains,'  recordCrowdingFeedback,\n  delayMinutes,','  recordCrowdingFeedback,\n  recordForecastAccuracy,\n  forecastAccuracySummary,\n  delayMinutes,')


# ---------------------------------------------------------------------------
# Connection Quality v2: topology-aware detour/backtracking rejection, dynamic
# hub buffers, and stronger comfort/long-wait ranking.
tt='kerbside-train-timetable.js'
replace_once(tt,"const CONNECTION_SECOND_CHOICES=6;","""const CONNECTION_SECOND_CHOICES=6;
const CONNECTION_COMFORT_MARGIN=8;
const CONNECTION_LONG_WAIT=40;
const CONNECTION_DETOUR_REJECT_EXCESS=12;""")
replace_once(tt,"""const CONNECTION_HUB_MINUTES={
  BHM:12,MAN:12,LDS:12,EDB:12,GLC:12,GLQ:12,NCL:12,YRK:12,SHF:12,RDG:12,BRI:12,CDF:12,
  EUS:12,KGX:12,STP:12,PAD:12,WAT:12,VIC:12,LBG:12,LST:12,CHX:12,MYB:12,CLJ:12
};""","""const CONNECTION_HUB_MINUTES={
  BHM:15,MAN:15,LDS:15,EDB:15,GLC:15,EUS:15,KGX:15,STP:15,PAD:15,WAT:15,VIC:15,LBG:15,LST:15,CLJ:15,
  GLQ:12,NCL:12,YRK:12,SHF:12,RDG:12,BRI:12,CDF:12,CHX:12,MYB:12
};""")
replace_once(tt,"function connectionMinimum(crs){return CONNECTION_HUB_MINUTES[String(crs||'').toUpperCase()]||10;}","""function connectionMinimum(crs,graph=null){
  const code=String(crs||'').toUpperCase(),fixed=CONNECTION_HUB_MINUTES[code]||10,degree=graph&&graph.get(code)?graph.get(code).size:0;
  const topology=degree>=12?15:degree>=7?12:10;
  return Math.max(fixed,topology);
}""")
sub_once(tt,r"function lowerBound\(list,value\)\{[^\n]+\}\n",lambda m:m.group(0)+r'''function buildStationGraph(rows){
  const graph=new Map(),link=(a,b)=>{if(!a||!b||a===b)return;if(!graph.has(a))graph.set(a,new Set());if(!graph.has(b))graph.set(b,new Set());graph.get(a).add(b);graph.get(b).add(a);};
  for(const row of Array.isArray(rows)?rows:[]){const calls=Array.isArray(row&&row[5])?row[5]:[];for(let i=1;i<calls.length;i++)link(String(calls[i-1]&&calls[i-1][0]||'').toUpperCase(),String(calls[i]&&calls[i][0]||'').toUpperCase());}
  return graph;
}
function shortestNetworkStops(graph,from,to){
  const start=String(from||'').toUpperCase(),target=String(to||'').toUpperCase();if(!graph||!start||!target)return Infinity;if(start===target)return 0;
  const seen=new Set([start]),queue=[[start,0]];for(let head=0;head<queue.length;head++){const [node,depth]=queue[head];if(depth>=40)continue;for(const next of graph.get(node)||[]){if(next===target)return depth+1;if(!seen.has(next)){seen.add(next);queue.push([next,depth+1]);}}}return Infinity;
}
function pathCodes(row,start,end){const calls=Array.isArray(row&&row[5])?row[5]:[];return calls.slice(start,end+1).map(call=>String(call&&call[0]||'').toUpperCase()).filter(Boolean);}
function connectionRouteQuality(firstRow,firstStart,changeIndex,secondRow,secondStart,destinationIndex,graph,shortest){
  const first=pathCodes(firstRow,firstStart,changeIndex),second=pathCodes(secondRow,secondStart,destinationIndex);if(first.length<2||second.length<2)return {reject:true,reason:'invalid path'};
  const earlier=new Set(first.slice(0,-1)),returned=second.slice(1).find(code=>earlier.has(code));
  if(returned)return {reject:true,reason:`backtracks through ${returned}`};
  const edges=(first.length-1)+(second.length-1),base=Number.isFinite(shortest)&&shortest>0?shortest:null;
  let detourRatio=base?edges/base:1,excess=base?edges-base:0;
  if(base&&excess>=CONNECTION_DETOUR_REJECT_EXCESS&&detourRatio>2.5)return {reject:true,reason:'excessive network detour',edges,shortest:base,detourRatio};
  const penalty=base?Math.max(0,excess-3)*2+Math.max(0,detourRatio-1.8)*8:0;
  return {reject:false,reason:penalty?'indirect route':'direct network progression',edges,shortest:base,detourRatio,penalty};
}
''')
replace_once(tt,"function connectionQuality(minutes,minimum){const margin=minutes-minimum;return margin<5?'tight':minutes>45?'long':'comfortable';}","function connectionQuality(minutes,minimum){const margin=minutes-minimum;return margin<CONNECTION_COMFORT_MARGIN?'tight':minutes>CONNECTION_LONG_WAIT?'long':'comfortable';}")
replace_once(tt,"""  if(!/^[A-Z0-9]{3}$/.test(fromCode)||!/^[A-Z0-9]{3}$/.test(toCode)||fromCode===toCode)return[];
  const departures=departureIndexForRows(rows,date),first=[];""","""  if(!/^[A-Z0-9]{3}$/.test(fromCode)||!/^[A-Z0-9]{3}$/.test(toCode)||fromCode===toCode)return[];
  const graph=buildStationGraph(rows),shortest=shortestNetworkStops(graph,fromCode,toCode);
  const departures=departureIndexForRows(rows,date),first=[];""")
replace_once(tt,'      const minimum=connectionMinimum(changeCode),earliest=arrivalMinute+minimum,latest=arrivalMinute+CONNECTION_MAX_WAIT;','      const minimum=connectionMinimum(changeCode,graph),earliest=arrivalMinute+minimum,latest=arrivalMinute+CONNECTION_MAX_WAIT;')
replace_once(tt,"""        const firstLeg=legFromRow(candidate.row,candidate.originIndex,changeIndex,locations,manifest,date);
        const secondLeg=legFromRow(second.row,second.callIndex,destinationIndex,locations,manifest,date);
        if(!firstLeg||!secondLeg)continue;
        const connectionMinutes=second.departureMinute-arrivalMinute,totalMinutes=secondLeg.arrivalMinute-candidate.departureMinute;""","""        const firstLeg=legFromRow(candidate.row,candidate.originIndex,changeIndex,locations,manifest,date);
        const secondLeg=legFromRow(second.row,second.callIndex,destinationIndex,locations,manifest,date);
        if(!firstLeg||!secondLeg)continue;
        const routeQuality=connectionRouteQuality(candidate.row,candidate.originIndex,changeIndex,second.row,second.callIndex,destinationIndex,graph,shortest);if(routeQuality.reject)continue;
        const connectionMinutes=second.departureMinute-arrivalMinute,totalMinutes=secondLeg.arrivalMinute-candidate.departureMinute;""")
replace_once(tt,"const margin=connectionMinutes-minimum,tightPenalty=margin<5?(5-margin)*4:0,longPenalty=connectionMinutes>45?(connectionMinutes-45)*.5:0;","const margin=connectionMinutes-minimum,tightPenalty=margin<CONNECTION_COMFORT_MARGIN?(CONNECTION_COMFORT_MARGIN-margin)*6:0,longPenalty=connectionMinutes>CONNECTION_LONG_WAIT?(connectionMinutes-CONNECTION_LONG_WAIT)*.8:0,routePenalty=Number(routeQuality.penalty)||0;")
replace_once(tt,'          interchange:{...interchange,arrival:firstLeg.arrival,departure:secondLeg.std,minutes:connectionMinutes,minimum,margin,quality:connectionQuality(connectionMinutes,minimum)},\n          legs:[firstLeg,secondLeg],rankScore:secondLeg.arrivalMinute+12+tightPenalty+longPenalty,','          interchange:{...interchange,arrival:firstLeg.arrival,departure:secondLeg.std,minutes:connectionMinutes,minimum,margin,quality:connectionQuality(connectionMinutes,minimum),routeQuality},\n          legs:[firstLeg,secondLeg],rankScore:secondLeg.arrivalMinute+14+tightPenalty+longPenalty+routePenalty,')
replace_once(tt,"""function connectionDominated(connection,directs){
  return directs.some(direct=>{
    const depGap=direct.departureMinute-connection.departureMinute;
    return depGap>=-5&&depGap<=20&&direct.arrivalMinute<=connection.arrivalMinute+15;
  });
}""","""function connectionDominated(connection,directs){
  return directs.some(direct=>{
    const depGap=direct.departureMinute-connection.departureMinute;
    return depGap>=-10&&depGap<=30&&direct.arrivalMinute<=connection.arrivalMinute+20;
  });
}""")
replace_once(tt,'servicesFromRows,connectionsFromRows,journeysFromRows,connectionMinimum,connectionRiskFor','servicesFromRows,connectionsFromRows,journeysFromRows,connectionMinimum,connectionRiskFor,buildStationGraph,shortestNetworkStops,connectionRouteQuality')
replace_once(tt,"const changeRow=`<div class=\"train-connection-change connection-risk-${esc(risk)}\"><span>Change at ${esc(displayName(change,'interchange'))}</span><b>${esc(`${minutes} min`)}</b><small>Kerbside planning buffer: ${esc(`${minimum} min minimum`)}${Number.isFinite(service.liveConnectionMinutes)?' · live first-leg arrival':''}</small></div>`;","""const quality=service.connectionRisk==='at-risk'?'at risk':service.connectionRisk==='tight'?'tight':String(change.quality||'comfortable').replace(/^./,c=>c.toUpperCase());
  const changeRow=`<div class=\"train-connection-change connection-risk-${esc(risk)}\"><span>Change at ${esc(displayName(change,'interchange'))}</span><b>${esc(`${minutes} min`)}</b><small>${esc(quality)} connection · Kerbside planning buffer: ${esc(`${minimum} min minimum`)}${Number.isFinite(service.liveConnectionMinutes)?' · live first-leg arrival':''}</small></div>`;""")


# ---------------------------------------------------------------------------
# Rolling 24-hour Status reliability history, stored locally on the device.
status='kerbside-status.js'
replace_once(status,"const REQUEST_TIMEOUT_MS=7000;","""const REQUEST_TIMEOUT_MS=7000;
const HISTORY_KEY='kerbside.status.history.v1';
const HISTORY_WINDOW_MS=24*60*60*1000;
const HISTORY_MAX_PER_SOURCE=288;""")
replace_once(status,'const state={installed:false,inFlight:false,lastChecked:0,results:new Map()};','const state={installed:false,inFlight:false,lastChecked:0,results:new Map(),history:null};')
status_helpers=r'''
function readHistory(){try{const value=JSON.parse(localStorage.getItem(HISTORY_KEY)||'null');return value&&typeof value==='object'?value:{};}catch(error){return {};}}
function pruneHistory(at=now()){
  if(!state.history||typeof state.history!=='object')state.history={};const cutoff=at-HISTORY_WINDOW_MS;
  for(const id of Object.keys(state.history)){const rows=(Array.isArray(state.history[id])?state.history[id]:[]).filter(row=>row&&Number(row.ts)>=cutoff).slice(-HISTORY_MAX_PER_SOURCE);if(rows.length)state.history[id]=rows;else delete state.history[id];}
}
function saveHistory(){try{pruneHistory();localStorage.setItem(HISTORY_KEY,JSON.stringify(state.history||{}));}catch(error){}}
function recordHistory(value,ts=now()){
  if(!value||!value.id)return;if(!state.history)state.history=readHistory();pruneHistory(ts);const rows=state.history[value.id]||(state.history[value.id]=[]);rows.push({ts:Number(ts)||now(),status:String(value.status||'down'),latency:Number.isFinite(value.latency)?value.latency:null});if(rows.length>HISTORY_MAX_PER_SOURCE)rows.splice(0,rows.length-HISTORY_MAX_PER_SOURCE);
}
function medianNumber(values){const nums=values.map(Number).filter(Number.isFinite).sort((a,b)=>a-b);if(!nums.length)return null;const mid=Math.floor(nums.length/2);return nums.length%2?nums[mid]:(nums[mid-1]+nums[mid])/2;}
function historySummary(id,at=now()){
  if(!state.history)state.history=readHistory();pruneHistory(at);const rows=Array.isArray(state.history[id])?state.history[id]:[],samples=rows.length,failures=rows.filter(row=>row.status==='down').length,degraded=rows.filter(row=>row.status==='degraded').length,available=rows.filter(row=>row.status!=='down').length,latency=medianNumber(rows.map(row=>row.latency));
  return {samples,failures,degraded,availability:samples?available/samples:0,medianLatency:latency};
}
function historyText(id){const h=historySummary(id);if(!h.samples)return'No local 24h history yet';if(h.samples===1)return'24h local history · 1 check';const latency=Number.isFinite(h.medianLatency)?` · ${Math.round(h.medianLatency)} ms median`:'';return `24h local checks · ${Math.round(h.availability*1000)/10}% available · ${h.failures} failure${h.failures===1?'':'s'}${h.degraded?` · ${h.degraded} degraded`:''}${latency}`;}
'''
replace_once(status,'function normaliseUrl(value){',status_helpers+'\nfunction normaliseUrl(value){')
replace_once(status,'.status-copy{min-width:0}.status-copy b{display:block;font-size:11.5px}.status-description{display:block;margin-top:1px;color:var(--text-dim);font-size:9.5px;line-height:1.35}.status-detail{display:block;margin-top:4px;color:var(--text-dim);font-size:10px;line-height:1.4}', '.status-copy{min-width:0}.status-copy b{display:block;font-size:11.5px}.status-description{display:block;margin-top:1px;color:var(--text-dim);font-size:9.5px;line-height:1.35}.status-detail{display:block;margin-top:4px;color:var(--text-dim);font-size:10px;line-height:1.4}.status-history{display:block;margin-top:4px;color:var(--text-mute);font-family:\'Martian Mono\',monospace;font-size:8.5px;line-height:1.4}')
replace_once(status,'Checks run only when this tab is opened or you press Check again. Kerbside never exposes API keys. Authenticated third-party feeds are checked through the same Workers or published build outputs the app already uses.','Checks run only when this tab is opened or you press Check again. The 24-hour reliability figures are local samples from checks made on this device, not continuous central monitoring. Kerbside never exposes API keys. Authenticated third-party feeds are checked through the same Workers or published build outputs the app already uses.')
replace_once(status,"const name=document.createElement('b');name.textContent=source.name;const description=document.createElement('span');description.className='status-description';description.textContent=source.description;const detail=document.createElement('span');detail.className='status-detail';detail.textContent='Waiting to check…';copy.append(name,description,detail);","const name=document.createElement('b');name.textContent=source.name;const description=document.createElement('span');description.className='status-description';description.textContent=source.description;const detail=document.createElement('span');detail.className='status-detail';detail.textContent='Waiting to check…';const history=document.createElement('span');history.className='status-history';history.textContent=historyText(source.id);copy.append(name,description,detail,history);")
replace_once(status,"  const detail=row.querySelector('.status-detail');if(detail)detail.textContent=value.detail||'';","  const detail=row.querySelector('.status-detail');if(detail)detail.textContent=value.detail||'';const history=row.querySelector('.status-history');if(history)history.textContent=historyText(value.id);")
replace_once(status,'    state.results.set(source.id,value);renderResult(value);renderOverall(definitions);return value;','    state.results.set(source.id,value);recordHistory(value);renderResult(value);renderOverall(definitions);return value;')
replace_once(status,'  state.lastChecked=now();state.inFlight=false;','  saveHistory();state.lastChecked=now();state.inFlight=false;')
replace_once(status,"function install(){if(state.installed)return true;installStyles();if(!installUi())return false;const definitions=sourceDefinitions();","function install(){if(state.installed)return true;if(!state.history)state.history=readHistory();installStyles();if(!installUi())return false;const definitions=sourceDefinitions();")
replace_once(status,'coverageHealth,overallState,liveRailProbeState,sourceDefinitions,refresh,install','coverageHealth,overallState,liveRailProbeState,historySummary,recordHistory,sourceDefinitions,refresh,install')


# ---------------------------------------------------------------------------
# Tests: measured bands, threshold interpretation, local accuracy, status
# history and topology-aware connection quality.
timeband_test=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..','..');
const bandsSource=await fs.readFile(path.join(root,'kerbside-rail-timebands.js'),'utf8');
const calibrationSource=await fs.readFile(path.join(root,'kerbside-rail-calibration.js'),'utf8');
function load(){const context={window:{},console,Date,Intl,Math};vm.createContext(context);vm.runInContext(bandsSource,context);vm.runInContext(calibrationSource,context);return {bands:context.window.__KERBSIDE_DFT_TIME_BANDS__,cal:context.window.__KERBSIDE_CALIBRATION__};}
test('DfT importer preserves the exact 2025 table coverage and edge bands',()=>{const {bands}=load();assert.equal(bands.year,2025);assert.equal(Object.keys(bands.city).length,14);assert.equal(Object.keys(bands.station).length,12);assert.equal(bands.bandLabels.length,18);assert.equal(bands.bandIndex(120),17);assert.equal(bands.bandIndex(300),0);assert.equal(bands.bandIndex(17*60),11);});
test('measured Birmingham evening demand is stronger than midday',()=>{const {cal}=load(),date=new Date('2026-08-12T12:00:00Z'),station={crs:'BHM'};const noon=cal.measuredBand(station,12*60),evening=cal.measuredBand(station,17*60);assert.equal(noon.scope,'city');assert.equal(evening.passengers,15923);assert.ok(evening.share>noon.share);assert.ok(cal.demandShape(station,17*60,date).amount>cal.demandShape(station,12*60,date).amount);});
test('London stations prefer RAI0203 station data over the London city aggregate',()=>{const {cal}=load();const euston=cal.measuredBand({crs:'EUS'},17*60);assert.equal(euston.scope,'station');assert.equal(euston.name,'Euston');assert.equal(euston.passengers,10038);});
test('Kerbside score bands are explicitly anchored to measured seat utilisation',()=>{const {cal}=load(),t=cal.scoreThresholds();assert.deepEqual({...t},{moderate:1.5,busy:2.65,veryBusy:3.85});assert.equal(cal.measuredCrowdingBand(.2),'quiet');assert.equal(cal.measuredCrowdingBand(.5),'moderate');assert.equal(cal.measuredCrowdingBand(.8),'busy');assert.equal(cal.measuredCrowdingBand(1.02),'very-busy');});
'''
write('kerbside-backend/test/train-dft-timebands.test.mjs',timeband_test)

accuracy_test=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..','..'),source=await fs.readFile(path.join(root,'kerbside-trains.js'),'utf8');
function storage(){const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),data};}
function load(){const localStorage=storage(),window={addEventListener(){},dispatchEvent(){}},document={readyState:'loading',addEventListener(){},getElementById(){return null;},createElement(){return {innerHTML:'',textContent:''};}};const context={window,document,console,URL,Date,Intl,localStorage,setTimeout,clearTimeout,setInterval(){return 0;},clearInterval(){},AbortController,CustomEvent:class{constructor(type,opts={}){this.type=type;this.detail=opts.detail;}},fetch:async()=>{throw new Error('network not expected');}};vm.createContext(context);vm.runInContext(source,context);return {api:window.__KERBSIDE_TRAINS__,window,localStorage};}
test('crowding reports validate Forecast v3 locally without storing journey identity',()=>{const {api,window}=load(),service={std:'10:00',operator:'Test',operatorCode:'ZZ',destination:[{crs:'BRI'}],origin:[{crs:'BHM'}]};api.state.station={name:'Birmingham New Street',crs:'BHM'};api.state.services=[service];api.state.board={generatedAt:'2026-08-12T09:55:00Z',nrccMessages:[]};window.__KERBSIDE_FORECAST_V3__={forecast(){return {level:'moderate',score:2};}};assert.equal(api.recordCrowdingFeedback(service,0,'busy'),true);const summary=api.forecastAccuracySummary();assert.equal(summary.total,1);assert.equal(summary.exact,0);assert.equal(summary.withinOne,1);assert.equal(summary.meanAbsoluteError,1);const row=api.state.forecastAccuracy.recent[0];assert.deepEqual(Object.keys(row).sort(),['actual','error','predicted','ts']);assert.equal(api.recordCrowdingFeedback(service,0,'very-busy'),false,'same observation cannot be counted twice');assert.equal(api.forecastAccuracySummary().total,1);});
'''
write('kerbside-backend/test/train-forecast-accuracy.test.mjs',accuracy_test)

# Existing timetable expectations + new topology tests.
test_path='kerbside-backend/test/train-timetable-provider.test.js'
replace_once(test_path,"  assert.equal(provider.connectionMinimum('BHM'),12);","  assert.equal(provider.connectionMinimum('BHM'),15);")
append=r'''

test('connection quality rejects literal network backtracking',()=>{
  const provider=loadProvider();
  const first=['a','a','a','XC','2026-08-12',[["BHM","","09:00","",0],["AAA","09:20","09:21","",0],["CNM","09:40","","",0]]];
  const second=['b','b','b','XC','2026-08-12',[["CNM","","09:55","",0],["AAA","10:10","10:11","",0],["GLO","10:30","","",0]]];
  const graph=provider.buildStationGraph([first,second]);
  const value=provider.connectionRouteQuality(first,0,2,second,0,2,graph,provider.shortestNetworkStops(graph,'BHM','GLO'));
  assert.equal(value.reject,true);
  assert.match(value.reason,/backtracks/);
});

test('timetable topology adds extra transfer time at a highly connected hub',()=>{
  const provider=loadProvider(),rows=[];
  for(let i=0;i<12;i++)rows.push([`r${i}`,`u${i}`,`t${i}`,'XC','2026-08-12',[["HUB","","09:00","",0],[`X${String(i).padStart(2,'0')}`,"09:10","","",0]]]);
  const graph=provider.buildStationGraph(rows);
  assert.equal(graph.get('HUB').size,12);
  assert.equal(provider.connectionMinimum('HUB',graph),15);
});
'''
text=read(test_path)
if 'connection quality rejects literal network backtracking' not in text: write(test_path,text+append)

# Status history unit coverage.
status_test='kerbside-backend/test/status-switchboard.test.mjs'
text=read(status_test)
addition=r'''

test('status history reports rolling local availability, failures and median latency',()=>{
  const api=load(),at=Date.now();
  api.recordHistory({id:'rdm-darwin',status:'healthy',latency:300},at-3000);
  api.recordHistory({id:'rdm-darwin',status:'degraded',latency:500},at-2000);
  api.recordHistory({id:'rdm-darwin',status:'down',latency:null},at-1000);
  const value=api.historySummary('rdm-darwin',at);
  assert.equal(value.samples,3);assert.equal(value.failures,1);assert.equal(value.degraded,1);assert.ok(Math.abs(value.availability-2/3)<1e-9);assert.equal(value.medianLatency,400);
});
'''
if 'status history reports rolling local availability' not in text: write(status_test,text+addition)

print('Applied Kerbside 0.8.1 connection quality, DfT calibration, local accuracy and status history.')
