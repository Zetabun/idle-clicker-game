#!/usr/bin/env python3
from pathlib import Path
import re

def read(p): return Path(p).read_text(encoding='utf-8')
def write(p,t): Path(p).write_text(t,encoding='utf-8')
def once(p,old,new):
    t=read(p); n=t.count(old)
    if n!=1: raise SystemExit(f'{p}: expected one match, found {n}: {old[:140]!r}')
    write(p,t.replace(old,new,1))
def replace_all_guarded(p,old,new,min_count=1):
    t=read(p); n=t.count(old)
    if n<min_count: raise SystemExit(f'{p}: expected >= {min_count} matches, found {n}: {old!r}')
    write(p,t.replace(old,new))

# Version and browser wiring.
if read('VERSION').strip()!='0.8.3': raise SystemExit('Expected Kerbside 0.8.3 baseline')
write('VERSION','0.8.4\n')
once('kerbside-status.js',"const VERSION='0.8.3';","const VERSION='0.8.4';")
replace_all_guarded('bus.html','?v=0.8.3','?v=0.8.4',5)
once('bus.html','<script src="kerbside-rail-timebands.js?v=0.8.4"></script>\n<script src="kerbside-rail-calibration.js?v=0.8.4"></script>','<script src="kerbside-rail-timebands.js?v=0.8.4"></script>\n<script src="kerbside-rail-demand-v4.js?v=0.8.4"></script>\n<script src="kerbside-rail-calibration.js?v=0.8.4"></script>')
once('bus.html','<script src="kerbside-train-forecast-v3.js?v=0.8.4"></script>','<script src="kerbside-train-forecast-v4.js?v=0.8.4"></script>')

# ------------------------------------------------------------------
# Calibration extensions: exact ORR station scale/main-OD and DfT 2025
# operator/capacity context. These are aggregate measured priors, not claims
# about an individual train's actual occupancy.
cal='kerbside-rail-calibration.js'
insert=r'''
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
function utilisationPrior(service,station){
  const data=v4Data(),u=data&&data.utilisation;if(!u||!u.priors)return null;const code=String(service&&(service.operatorCode||'')).toUpperCase(),name=String(service&&(service.operator||'')).toLowerCase(),profile=profileFor(station),usage=stationUsageRecord(station);
  const longDistance=['XC','VT','GR'].includes(code)||/crosscountry|avanti|lner|london north eastern/.test(name),group=longDistance?'longDistance':(profile&&profile.area==='london')||(usage&&String(usage.region).toLowerCase()==='london')?'london':'regional';
  const probabilities=u.priors[group]||u.priors.all,mean=u.means&&u.means[group];return {group,probabilities:Array.isArray(probabilities)?probabilities.slice():null,mean:Number(mean),source:'DfT RAI0216 2025 empirical peak utilisation'};
}
'''
once(cal,'\nwindow.__KERBSIDE_CALIBRATION__={',insert+'\nwindow.__KERBSIDE_CALIBRATION__={')
once(cal,'  scaleSignal,demandShape,serviceClassSignal,contextNote,measuredBand,measuredCrowdingBand,scoreThresholds,','  scaleSignal,demandShape,serviceClassSignal,contextNote,measuredBand,measuredCrowdingBand,scoreThresholds,\n  stationUsageRecord,stationUsageSignal,routeFlowSignal,operatorCrowdingSignal,peakCapacitySignal,utilisationPrior,')

# ------------------------------------------------------------------
# Local operational history + privacy-safe empirical accuracy buckets.
tr='kerbside-trains.js'
once(tr,"const MODEL_VERSION = 2;","const MODEL_VERSION = 3;")
once(tr,"const ACCURACY_VERSION = 1;","const ACCURACY_VERSION = 2;")
once(tr,"function emptyCrowdingModel(){\n  return {version:MODEL_VERSION, profiles:{}, seen:{}, feedbackSeen:{}};\n}","function emptyCrowdingModel(){\n  return {version:MODEL_VERSION, profiles:{}, patternProfiles:{}, seen:{}, feedbackSeen:{}};\n}")
once(tr,"    if(!parsed || typeof parsed !== 'object' || parsed.version !== MODEL_VERSION) return emptyCrowdingModel();\n    if(!parsed.profiles || typeof parsed.profiles !== 'object') parsed.profiles = {};","    if(!parsed || typeof parsed !== 'object') return emptyCrowdingModel();\n    if(parsed.version===2) parsed.version=MODEL_VERSION;\n    if(parsed.version!==MODEL_VERSION) return emptyCrowdingModel();\n    if(!parsed.profiles || typeof parsed.profiles !== 'object') parsed.profiles = {};\n    if(!parsed.patternProfiles || typeof parsed.patternProfiles !== 'object') parsed.patternProfiles = {};")
once(tr,"  const profileKeys = Object.keys(model.profiles);","  const patternKeys=Object.keys(model.patternProfiles||{});if(patternKeys.length>240){patternKeys.sort((a,b)=>(Number(model.patternProfiles[b].updatedAt)||0)-(Number(model.patternProfiles[a].updatedAt)||0));patternKeys.slice(240).forEach(key=>delete model.patternProfiles[key]);}\n  const profileKeys = Object.keys(model.profiles);")
accuracy_old="""function emptyForecastAccuracy(){return {version:ACCURACY_VERSION,total:0,exact:0,withinOne:0,absoluteError:0,recent:[]};}
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
  data.total=(Number(data.total)||0)+1;
  if(error===0)data.exact=(Number(data.exact)||0)+1;
  if(error<=1)data.withinOne=(Number(data.withinOne)||0)+1;
  data.absoluteError=(Number(data.absoluteError)||0)+error;
  /* No station, service, route, train ID or user identifier is retained. */
  data.recent=(Array.isArray(data.recent)?data.recent:[]).concat([{ts,predicted:predictedLevel,actual:reportedLevel,error}]).slice(-ACCURACY_RECENT_MAX);
  saveForecastAccuracy();return true;
}
"""
accuracy_new="""function emptyForecastAccuracy(){return {version:ACCURACY_VERSION,total:0,exact:0,withinOne:0,absoluteError:0,buckets:{},recent:[]};}
function safeReadForecastAccuracy(){
  try{const parsed=JSON.parse(localStorage.getItem(ACCURACY_KEY)||'null');if(!parsed)return emptyForecastAccuracy();if(parsed.version===1){parsed.version=ACCURACY_VERSION;parsed.buckets={};}if(parsed.version!==ACCURACY_VERSION)return emptyForecastAccuracy();if(!parsed.buckets||typeof parsed.buckets!=='object')parsed.buckets={};if(!Array.isArray(parsed.recent))parsed.recent=[];return parsed;}catch(error){return emptyForecastAccuracy();}
}
function saveForecastAccuracy(){try{if(!state.forecastAccuracy)return;state.forecastAccuracy.recent=(state.forecastAccuracy.recent||[]).slice(-ACCURACY_RECENT_MAX);localStorage.setItem(ACCURACY_KEY,JSON.stringify(state.forecastAccuracy));}catch(error){}}
function forecastAccuracySummary(){const data=state.forecastAccuracy||safeReadForecastAccuracy(),total=Number(data.total)||0;return {total,exact:total?Number(data.exact||0)/total:0,withinOne:total?Number(data.withinOne||0)/total:0,meanAbsoluteError:total?Number(data.absoluteError||0)/total:0,recent:Array.isArray(data.recent)?data.recent.length:0};}
function forecastAccuracyForBucket(bucket){const data=state.forecastAccuracy||safeReadForecastAccuracy(),row=data.buckets&&data.buckets[String(bucket||'')],total=Number(row&&row.total)||0;return {total,exact:total?Number(row.exact||0)/total:0,withinOne:total?Number(row.withinOne||0)/total:0,meanAbsoluteError:total?Number(row.absoluteError||0)/total:0};}
function recordForecastAccuracy(service,index,reportedLevel,date){
  const actual=CROWD_LEVEL_RANK[reportedLevel],api=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__;
  if(actual==null||!api||typeof api.forecast!=='function'||!state.station)return false;
  let result;try{result=api.forecast(service,index,state.services,{station:state.station,referenceDate:date,messages:state.board&&state.board.nrccMessages||[]});}catch(error){return false;}
  const predictedLevel=String(result&&result.level||''),predicted=CROWD_LEVEL_RANK[predictedLevel];if(predicted==null)return false;
  if(!state.forecastAccuracy)state.forecastAccuracy=safeReadForecastAccuracy();
  const error=Math.abs(predicted-actual),data=state.forecastAccuracy,ts=Date.now(),bucket=String(result&&result.accuracyBucket||'legacy');
  data.total=(Number(data.total)||0)+1;if(error===0)data.exact=(Number(data.exact)||0)+1;if(error<=1)data.withinOne=(Number(data.withinOne)||0)+1;data.absoluteError=(Number(data.absoluteError)||0)+error;
  const row=data.buckets[bucket]||(data.buckets[bucket]={total:0,exact:0,withinOne:0,absoluteError:0});row.total++;if(error===0)row.exact++;if(error<=1)row.withinOne++;row.absoluteError+=error;
  /* Only evidence bucket + predicted/actual band/error are retained. No station, service, route, train ID or user identifier. */
  data.recent=(Array.isArray(data.recent)?data.recent:[]).concat([{ts,predicted:predictedLevel,actual:reportedLevel,error,bucket}]).slice(-ACCURACY_RECENT_MAX);saveForecastAccuracy();return true;
}
"""
once(tr,accuracy_old,accuracy_new)
# Pattern history helpers, using public service characteristics only.
pattern_insert="""
function patternKeyFor(service,station,date){const stationCode=normaliseToken(station&&(station.crs||station.name)||'unknown'),minute=parseMinutes(service&&service.std),slot=minute==null?'x':String(Math.round(minute/30));return [stationCode,operatorIdentity(service),profileDestinationIdentity(service),dayClassFor(date),slot].join('|');}
function ensurePatternProfile(key){const model=state.crowdingModel||(state.crowdingModel=emptyCrowdingModel());if(!model.patternProfiles)model.patternProfiles={};if(!model.patternProfiles[key])model.patternProfiles[key]={samples:0,lengthSamples:0,avgLength:0,delaySamples:0,avgDelay:0,headwaySamples:0,avgHeadway:0,cancelledSamples:0,cancelledCount:0,updatedAt:Date.now()};return model.patternProfiles[key];}
function servicePatternProfile(service,station,date){const model=state.crowdingModel;if(!model||!model.patternProfiles)return null;return model.patternProfiles[patternKeyFor(service,station,date)]||null;}
"""
once(tr,'\nfunction ensureProfile(key){',pattern_insert+'\nfunction ensureProfile(key){')
once(tr,"    const profile = ensureProfile(profileKeyFor(service,state.station,date));\n    const context = routeContext(service,index,state.services);","    const profile = ensureProfile(profileKeyFor(service,state.station,date));\n    const pattern = ensurePatternProfile(patternKeyFor(service,state.station,date));\n    const context = routeContext(service,index,state.services);")
once(tr,"    profile.updatedAt = Date.now();\n    state.crowdingModel.seen[id] = Date.now();","    profile.updatedAt = Date.now();\n    pattern.samples=(Number(pattern.samples)||0)+1;if(length>0)updateAverage(pattern,'avgLength','lengthSamples',length);if(headway!=null&&headway>0&&headway<=180)updateAverage(pattern,'avgHeadway','headwaySamples',headway);if(!service.isCancelled&&Number.isFinite(delay))updateAverage(pattern,'avgDelay','delaySamples',delay);pattern.cancelledSamples=(Number(pattern.cancelledSamples)||0)+1;if(service.isCancelled)pattern.cancelledCount=(Number(pattern.cancelledCount)||0)+1;pattern.updatedAt=Date.now();\n    state.crowdingModel.seen[id] = Date.now();")
once(tr,"  const v3=window.__KERBSIDE_FORECAST_V3__;\n  if(v3&&typeof v3.forecast==='function')return v3.forecast(service,index,state.services,context);","  const v4=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__;\n  if(v4&&typeof v4.forecast==='function')return v4.forecast(service,index,state.services,context);")
replace_all_guarded(tr,'Local Forecast v3 validation','Local Forecast v4 validation',1)
replace_all_guarded(tr,'Forecast v3 score','Forecast v4 score',1)
once(tr,"  const modelLabel=Number(forecast.modelVersion)>=3?'Forecast v3':`model v${MODEL_VERSION}`;","  const modelLabel=Number(forecast.modelVersion)>=4?'Forecast v4':Number(forecast.modelVersion)>=3?'Forecast v3':`model v${MODEL_VERSION}`;")
once(tr,"  forecastAccuracySummary,\n  delayMinutes,","  forecastAccuracySummary,\n  forecastAccuracyForBucket,\n  servicePatternProfile,\n  delayMinutes,")

# ------------------------------------------------------------------
# Forecast v4 is forked from the proven v3 engine. It keeps all current
# connection/event/live signals, but replaces categorical confidence/labels
# with an empirical ordinal probability layer anchored by DfT RAI0216.
v3=read('kerbside-train-forecast-v3.js')
v4=v3.replace('const VERSION = 3;','const VERSION = 4;',1).replace('Forecast v3','Forecast v4').replace('forecast v3','forecast v4')
# Prefer exact ORR station usage over the old static tier table.
old_scale="""function stationScaleSignal(station){
  /* Prefer DfT's measured counts where the station was actually counted;
     the hand-built tier table below still covers the rest of the network,
     and remains the whole answer if the calibration module is absent. */
  const cal=calibration();
  if(cal&&typeof cal.scaleSignal==='function'){
    try{const measured=cal.scaleSignal(station);if(measured&&measured.measured)return {amount:measured.amount,reasons:measured.reasons};}catch(error){}
  }
"""
new_scale="""function stationScaleSignal(station){
  /* Forecast v4 uses ORR's continuous station-usage percentile first. The
     legacy tier table is now only an offline/failure fallback. */
  const cal=calibration();
  if(cal&&typeof cal.stationUsageSignal==='function'){try{const measured=cal.stationUsageSignal(station);if(measured&&measured.measured)return measured;}catch(error){}}
  if(cal&&typeof cal.scaleSignal==='function'){try{const measured=cal.scaleSignal(station);if(measured&&measured.measured)return {amount:measured.amount,reasons:measured.reasons};}catch(error){}}
"""
if old_scale not in v4: raise SystemExit('v4: stationScaleSignal anchor missing')
v4=v4.replace(old_scale,new_scale,1)
# Service-pattern history helpers and ordinal model inserted before forecast().
anchor='function forecast(service,index,services,context={}){'
if anchor not in v4: raise SystemExit('v4: forecast anchor missing')
v4_helpers=r'''
function servicePatternSignal(api,service,date,station){
  const profile=api&&typeof api.servicePatternProfile==='function'?api.servicePatternProfile(service,station,date):null;if(!profile)return {amount:0,reasons:[],samples:0,profile:null};
  const samples=Number(profile.samples)||0,cancelSamples=Number(profile.cancelledSamples)||0,cancelRate=cancelSamples?Number(profile.cancelledCount||0)/cancelSamples:0,delaySamples=Number(profile.delaySamples)||0,avgDelay=Number(profile.avgDelay)||0;let amount=0;const reasons=[];
  if(cancelSamples>=8&&cancelRate>=.18){amount+=clamp((cancelRate-.12)*.9,0,.35);reasons.push(`this service pattern has been cancelled in about ${Math.round(cancelRate*100)}% of recent local observations`);}if(delaySamples>=5&&avgDelay>=8){amount+=clamp((avgDelay-6)/45,0,.28);reasons.push(`this service pattern has averaged about ${Math.round(avgDelay)} minutes late locally`);}
  return {amount,reasons,samples,profile};
}
function destinationForModel(service,context={}){const override=context&&context.eventJourney;if(override&&(override.destinationCrs||override.destination))return {crs:String(override.destinationCrs||'').toUpperCase(),name:String(override.destination||override.destinationCrs||'')};const d=service&&(service.routeDestination||service.displayDestination);if(d)return {crs:String(d.crs||'').toUpperCase(),name:String(d.name||d.locationName||d.crs||'')};const item=Array.isArray(service&&service.destination)?service.destination.find(Boolean):null;return {crs:String(item&&item.crs||'').toUpperCase(),name:String(item&&(item.locationName||item.crs)||'')};}
const PROB_LEVELS=['quiet','moderate','busy','very-busy'],PROB_LABELS=['Quiet','Moderate','Busy','Very busy'],PROB_CENTRES=[.75,2,3.25,4.45];
function normaliseProbabilities(values){const safe=values.map(v=>Number.isFinite(v)&&v>0?v:0),total=safe.reduce((a,b)=>a+b,0)||1;return safe.map(v=>v/total);}
function ordinalProbabilities(score,service,station,evidence){
  const cal=calibration(),prior=cal&&typeof cal.utilisationPrior==='function'?cal.utilisationPrior(service,station):null,base=prior&&Array.isArray(prior.probabilities)?prior.probabilities:[.18,.34,.36,.12],temperature=clamp(1.22-Math.min(8,Number(evidence)||0)*.065,.62,1.18);
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
'''
v4=v4.replace(anchor,v4_helpers+'\n'+anchor,1)
# Add new measured signals after existing serviceClass.
old_sig="""  const shapeCal=calibratedDemandSignal(station,minute,date);
  const serviceClass=serviceClassSignal(service,station,minute,date);

  let score=Number(base.score);"""
new_sig="""  const shapeCal=calibratedDemandSignal(station,minute,date);
  const serviceClass=serviceClassSignal(service,station,minute,date);
  const cal=calibration(),destination=destinationForModel(service,context);
  const routeFlow=cal&&typeof cal.routeFlowSignal==='function'?cal.routeFlowSignal(station,destination):{amount:0,reasons:[],measured:false};
  const operatorCrowding=cal&&typeof cal.operatorCrowdingSignal==='function'?cal.operatorCrowdingSignal(service,station,minute):{amount:0,reasons:[],measured:false};
  const peakCapacity=cal&&typeof cal.peakCapacitySignal==='function'?cal.peakCapacitySignal(station,minute):{amount:0,reasons:[],measured:false};
  const pattern=servicePatternSignal(api,service,date,station);

  let score=Number(base.score);"""
if old_sig not in v4: raise SystemExit('v4: signal anchor missing')
v4=v4.replace(old_sig,new_sig,1)
old_score='score=clamp(score+calendar.amount+events.amount+displacement.amount+live.amount+formation.amount+shape.amount+scale.amount+school.amount+offpeak.amount+shapeCal.amount+serviceClass.amount,.25,5);'
new_score='score=clamp(score+calendar.amount+events.amount+displacement.amount+live.amount+formation.amount+shape.amount+scale.amount+school.amount+offpeak.amount+shapeCal.amount+serviceClass.amount+routeFlow.amount+operatorCrowding.amount+peakCapacity.amount+pattern.amount,.25,5);'
if old_score not in v4: raise SystemExit('v4: score anchor missing')
v4=v4.replace(old_score,new_score,1)
v4=v4.replace('    ...serviceClass.reasons,...school.reasons,...offpeak.reasons,...shapeCal.reasons,...calendar.reasons,...scale.reasons','    ...operatorCrowding.reasons,...peakCapacity.reasons,...routeFlow.reasons,...pattern.reasons,\n    ...serviceClass.reasons,...school.reasons,...offpeak.reasons,...shapeCal.reasons,...calendar.reasons,...scale.reasons',1)
old_ev="const evidence=2+historyEvidence+(calendar.reasons.length?1:0)+(events.reasons.length?1:0)+(displacement.reasons.length?1:0)+(live.reasons.length?2:0)+(formation.reasons.length?1:0)+(shape.evidence?1:0)+(school.reasons.length?.5:0)+(calibrated?1:0)+(serviceClass.reasons.length?.5:0);\n  const confidence=evidence>=6?'High':evidence>=4?'Medium-high':evidence>=3?'Medium':'Low';\n  const cal=calibration();"
new_ev="const evidence=2+historyEvidence+(calendar.reasons.length?1:0)+(events.reasons.length?1:0)+(displacement.reasons.length?1:0)+(live.reasons.length?2:0)+(formation.reasons.length?1:0)+(shape.evidence?1:0)+(school.reasons.length?.5:0)+(calibrated?1:0)+(serviceClass.reasons.length?.5:0)+(routeFlow.measured?.5:0)+(operatorCrowding.measured?1:0)+(peakCapacity.measured?1:0)+(pattern.samples>=3?1:0);\n  const probabilityModel=ordinalProbabilities(score,service,station,evidence),accuracyBucket=accuracyBucketFor({future,calibrated:calibrated||operatorCrowding.measured||peakCapacity.measured,formation,events,context}),confidenceInfo=probabilityConfidence(probabilityModel,evidence,accuracyBucket),confidence=confidenceInfo.label;\n  const cal=calibration();"
if old_ev not in v4: raise SystemExit('v4: evidence anchor missing')
v4=v4.replace(old_ev,new_ev,1)
old_ret="return {score,level:levelFor(score),label:labelFor(score),confidence,reasons:reasons.length?reasons:['service time and route demand baseline'],modelVersion:VERSION,eventPressure:events.amount,historySamples,calibrated,calibrationNote,calibrationSource:cal?cal.source:''};"
new_ret="return {score,level:probabilityModel.level,label:probabilityModel.label,confidence,reasons:reasons.length?reasons:['service time and route demand baseline'],modelVersion:VERSION,eventPressure:events.amount,historySamples,calibrated:calibrated||operatorCrowding.measured||peakCapacity.measured,calibrationNote,calibrationSource:cal?cal.source:'',probabilities:{quiet:probabilityModel.probabilities[0],moderate:probabilityModel.probabilities[1],busy:probabilityModel.probabilities[2],veryBusy:probabilityModel.probabilities[3]},topProbability:probabilityModel.top,utilisationPrior:probabilityModel.prior,accuracyBucket,empiricalAccuracy:confidenceInfo.local};"
if old_ret not in v4: raise SystemExit('v4: return anchor missing')
v4=v4.replace(old_ret,new_ret,1)
# Probability readout in explain card.
old_detail="const calibrationMarkup=result.calibrationNote\n  ?`<div class=\"train-forecast-calibration\"><span>Measured baseline</span><b>${esc(result.calibrationNote)}</b>${result.calibrationSource?`<i>${esc(result.calibrationSource)}</i>`:''}</div>`\n  :'';return `<div class=\"train-forecast-head\">"
new_detail="const calibrationMarkup=result.calibrationNote\n  ?`<div class=\"train-forecast-calibration\"><span>Measured baseline</span><b>${esc(result.calibrationNote)}</b>${result.calibrationSource?`<i>${esc(result.calibrationSource)}</i>`:''}</div>`\n  :'';const p=result.probabilities||null,probabilityMarkup=p?`<div class=\"train-forecast-probabilities\"><span>Probability</span><b>${[['Quiet',p.quiet],['Moderate',p.moderate],['Busy',p.busy],['Very busy',p.veryBusy]].map(([label,value])=>`${label} ${Math.round((Number(value)||0)*100)}%`).join(' · ')}</b></div>`:'';return `<div class=\"train-forecast-head\">"
if old_detail not in v4: raise SystemExit('v4: detail anchor missing')
v4=v4.replace(old_detail,new_detail,1).replace('${calibrationMarkup}${historyMarkup}`;','${calibrationMarkup}${probabilityMarkup}${historyMarkup}`;',1)
# Export v4 + compatibility alias for any older caller still looking for v3.
v4=v4.replace('window.__KERBSIDE_FORECAST_V3__={','window.__KERBSIDE_FORECAST_V4__={',1)
v4=v4.replace('MAX_EVENT_PRESSURE};','MAX_EVENT_PRESSURE,ordinalProbabilities,probabilityConfidence,servicePatternSignal};\nwindow.__KERBSIDE_FORECAST_V3__=window.__KERBSIDE_FORECAST_V4__;',1)
write('kerbside-train-forecast-v4.js',v4)

# Timetable chooses v4 first and copy refers to v4.
tt='kerbside-train-timetable.js'
once(tt,"const v3=window.__KERBSIDE_FORECAST_V3__,api=window.__KERBSIDE_TRAINS__","const v3=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__,api=window.__KERBSIDE_TRAINS__")
replace_all_guarded(tt,'Forecast v3','Forecast v4',1)

# Probability card styling.
css='kerbside-trains.css'
with open(css,'a',encoding='utf-8') as f:
    f.write("\n/* Forecast v4 empirical probability readout. */\n.train-forecast-probabilities{display:grid;gap:3px;margin-top:9px;padding:8px 9px;border:1px solid var(--rule);border-radius:7px;background:var(--ink-2)}\n.train-forecast-probabilities>span{font-family:'Martian Mono',ui-monospace,monospace;font-size:8px;font-weight:700;letter-spacing:.055em;text-transform:uppercase;color:var(--text-mute)}\n.train-forecast-probabilities>b{font-size:10px;line-height:1.45;color:var(--text-dim);font-weight:600}\n")

# Status/UI/test copy moves to Forecast v4.
for p in ['kerbside-status.js']:
    t=read(p).replace('Forecast v3','Forecast v4').replace('forecast v3','forecast v4');write(p,t)
for p in list(Path('kerbside-backend').rglob('*.mjs'))+list(Path('kerbside-backend').rglob('*.js')):
    t=read(p); n=t.replace('kerbside-train-forecast-v3.js','kerbside-train-forecast-v4.js').replace('Forecast v3','Forecast v4').replace('forecast v3','forecast v4')
    # Deterministic tests that explicitly assert the engine version.
    n=re.sub(r'\.version\s*,\s*3\b','.version,4',n)
    if n!=t: write(p,n)

# Accuracy regression now retains only one additional non-identifying bucket.
acc='kerbside-backend/test/train-forecast-accuracy.test.mjs'
t=read(acc).replace("window.__KERBSIDE_FORECAST_V3__={forecast(){return {level:'moderate',score:2};}};","window.__KERBSIDE_FORECAST_V4__={forecast(){return {level:'moderate',score:2,accuracyBucket:'live|fallback|single|no-formation|no-event'};}};")
t=t.replace("['actual','error','predicted','ts']","['actual','bucket','error','predicted','ts']")
write(acc,t)

print('Applied Kerbside 0.8.4 / Forecast v4.')
