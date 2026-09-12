#!/usr/bin/env python3
from __future__ import annotations
import base64, hashlib, lzma, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
ASSET=ROOT/'kerbside-orr-odm-2024-25.js'
ASSET_SHA='9e7e47ffcf446e6d089d4d2db4a270512ef34af684081718585b3d5f583d4ae8'
ASSET_BYTES=462_527
SOURCE_SHA='07d41e44884911c48929e844ee51f0c5ef66f861842d36564bb89a3b29bdfd79'
STAGING=sorted((ROOT/'.github/scripts').glob('odm-release-data-*.txt'))
ASSET_STAGE=[p for p in STAGING if int(p.stem.rsplit('-',1)[1])<16]

def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def one(p,a,b):
    s=read(p)
    if s.count(a)!=1: raise SystemExit(f'{p}: expected one match for {a[:80]!r}, found {s.count(a)}')
    write(p,s.replace(a,b,1))
def rx(p,pat,repl):
    s=read(p); out,n=re.subn(pat,repl,s,count=1,flags=re.S)
    if n!=1: raise SystemExit(f'{p}: regex matched {n}: {pat[:80]!r}')
    write(p,out)
def bump(p):
    s=read(p)
    if '0.9.6' in s: write(p,s.replace('0.9.6','0.9.7'))

def build_asset():
    names=[f'odm-release-data-{i:03d}.txt' for i in range(16)]
    if [p.name for p in ASSET_STAGE]!=names: raise SystemExit('ORR ODM staging set mismatch')
    packed=''.join(p.read_text(encoding='ascii').strip() for p in ASSET_STAGE)
    try: payload=lzma.decompress(base64.b64decode(packed,validate=True))
    except Exception as e: raise SystemExit(f'ORR ODM staging invalid: {e}') from e
    digest=hashlib.sha256(payload).hexdigest()
    if len(payload)!=ASSET_BYTES or digest!=ASSET_SHA: raise SystemExit(f'ORR ODM integrity failure: {len(payload)} {digest}')
    text=payload.decode('utf-8')
    for marker in ["authority:'Office of Rail and Road'","period:'2024-25'","licence:'Open Government Licence v3.0'","commercialUse:true","completeMatrix:false","directionality:'bidirectional-station-pair'",f"sourceSha256:'{SOURCE_SHA}'",'minimumAnnualJourneys:100','stationTopN:5']:
        if marker not in text: raise SystemExit(f'ORR ODM metadata missing: {marker}')
    ASSET.write_bytes(payload)

build_asset()
write('VERSION','0.9.7\n')
for p in ['bus.html','kerbside-journey-planner-ui.js','kerbside-status.js','kerbside-backend/package.json','kerbside-backend/src/worker.js','kerbside-backend/test/worker.test.js','kerbside-backend/tests/browser-regression.mjs']:
    bump(p)
one('bus.html','<script src="kerbside-rail-demand-v4.js?v=0.9.7"></script>\n<script src="kerbside-rail-calibration.js?v=0.9.7"></script>','<script src="kerbside-rail-demand-v4.js?v=0.9.7"></script>\n<script src="kerbside-orr-odm-2024-25.js?v=0.9.7"></script>\n<script src="kerbside-rail-calibration.js?v=0.9.7"></script>')

# Full licensed ODM route-load adapter. Sparse omissions stay unknown, never zero.
rx('kerbside-rail-calibration.js',r"function odmFlow\(feed,from,to\)\{.*?\n\}\nfunction flowShareToTargets",'''function odmFlow(feed,from,to){
  if(!feed)return null;const a=String(from||'').toUpperCase(),b=String(to||'').toUpperCase();if(!a||!b||a===b)return 0;let raw;
  try{if(typeof feed.flow==='function')raw=feed.flow(a,b);else{const direct=feed.flows&&feed.flows[`${a}|${b}`],nested=feed.flows&&feed.flows[a]&&feed.flows[a][b];raw=direct!=null?direct:nested;}}catch(error){return null;}
  if(raw==null)return null;const value=Number(raw);return Number.isFinite(value)&&value>=0?value:null;
}
function flowShareToTargets''')
rx('kerbside-rail-calibration.js',r"function flowShareToTargets\(from,targets,feed\)\{.*?\n\}\nfunction routeLoadSignal",'''function flowShareToTargets(from,targets,feed){
  const code=String(from||'').toUpperCase(),row=stationUsageRecord({crs:code}),usage=Number(row&&row.usage)||0;if(!row||!targets||!targets.size)return null;
  let feedTotal=NaN;if(feed&&typeof feed.stationTotal==='function'){try{feedTotal=Number(feed.stationTotal(code));}catch(error){feedTotal=NaN;}}
  const denominator=Number.isFinite(feedTotal)&&feedTotal>0?feedTotal:usage;
  if(feed&&denominator>0){let journeys=0,known=0;targets.forEach(to=>{const value=odmFlow(feed,code,to);if(value!=null){journeys+=value;known++;}});if(known||feed.completeMatrix===true)return {share:clamp(journeys/denominator,0,.8),journeys,exact:true,row,known,total:denominator};}
  if(usage<=0)return null;const main=String(row.mainCrs||'').toUpperCase(),journeys=Number(row.mainJourneys)||0;if(main&&targets.has(main)&&journeys>0)return {share:clamp(journeys/usage,0,.8),journeys,exact:false,row,known:1,total:usage};return null;
}
function routeLoadSignal''')
rx('kerbside-rail-calibration.js',r"function routeLoadSignal\(service,station\)\{.*?\n\}\nconst CROWD_RANK",'''function routeLoadSignal(service,station){
  const current=crsOf(station),before=routeCallCrs(service&&service.previousCallingPoints),after=routeCallCrs(service&&service.subsequentCallingPoints),destination=destinationCrs(service);if(destination&&!after.includes(destination))after.push(destination);if(!current||!after.length)return {amount:0,reasons:[],measured:false,source:'none'};
  const downstream=new Set(after.filter(code=>code&&code!==current)),feed=orrOdmDataset(),board=flowShareToTargets(current,downstream,feed);let retained=0,alighting=0,retainedStations=0,exactEvidence=!!(board&&board.exact);
  before.slice(feed?-24:-10).forEach(code=>{const onward=flowShareToTargets(code,downstream,feed);if(onward){retained+=onward.share;if(onward.share>=.015)retainedStations++;exactEvidence=exactEvidence||onward.exact;}const here=flowShareToTargets(code,new Set([current]),feed);if(here){alighting+=here.share;exactEvidence=exactEvidence||here.exact;}});
  const boardShare=Number(board&&board.share)||0,matched=boardShare>0||retained>0||alighting>0;if(!matched&&!exactEvidence)return {amount:0,reasons:[],measured:false,source:'none'};let amount=0;const reasons=[];
  if(boardShare>0){amount+=clamp(.08+boardShare*1.2,.08,.35);reasons.push(feed?`ORR 2024-25 station-pair demand from this stop matches this train's remaining calling pattern`:`ORR identifies this train direction as this station’s strongest measured origin/destination flow`);}
  if(retained>0){amount+=clamp(retained*.7,.05,.45);reasons.push(feed?`ORR 2024-25 station-pair demand from ${retainedStations||1} earlier call${retainedStations===1?'':'s'} also matches stops beyond here`:`ORR strongest-flow evidence from ${retainedStations||1} earlier call${retainedStations===1?'':'s'} points further along this train`);}
  if(alighting>0){amount-=clamp(alighting*.35,.03,.18);reasons.push(feed?'ORR 2024-25 station-pair demand suggests some route demand finishes at this stop':'ORR strongest-flow evidence suggests some accumulated demand leaves the train here');}
  return {amount:clamp(amount,-.2,.7),reasons,measured:true,source:feed?'orr-odm':'orr-main-flow-proxy',boardShare,retainedPressure:retained,alightingPressure:alighting,licence:feed?String(feed.licence||feed.license||''):'Open Government Licence v3.0 station-usage aggregate',coverageJourneyShare:feed?Number(feed.coverageJourneyShare)||null:null,directionality:feed?String(feed.directionality||''):''};
}
const CROWD_RANK''')

# DfT observations are weekday/non-bank-holiday evidence; keep omitted-date compatibility for direct callers.
one('kerbside-rail-calibration.js',"  return day!=='Sat'&&day!=='Sun';\n}\n","  return day!=='Sat'&&day!=='Sun';\n}\nfunction isDftReferenceDay(date,isBankHoliday=false){return !isBankHoliday&&(date==null||isWeekday(date));}\n")
one('kerbside-rail-calibration.js','function demandShape(station,minute,date){\n  if(minute==null||!isWeekday(date))return {amount:0,reasons:[]};','function demandShape(station,minute,date,isBankHoliday=false){\n  if(minute==null||!isDftReferenceDay(date,isBankHoliday))return {amount:0,reasons:[]};')
one('kerbside-rail-calibration.js','function serviceClassSignal(service,station,minute,date){\n  if(!isWeekday(date))return {amount:0,reasons:[]};','function serviceClassSignal(service,station,minute,date,isBankHoliday=false){\n  if(!isDftReferenceDay(date,isBankHoliday))return {amount:0,reasons:[]};')
one('kerbside-rail-calibration.js','function contextNote(station,minute,date){\n  const profile=profileFor(station),measured=isWeekday(date)?measuredBand(station,minute,\'departures\'):null;','function contextNote(station,minute,date,isBankHoliday=false){\n  const reference=isDftReferenceDay(date,isBankHoliday),profile=profileFor(station),measured=reference?measuredBand(station,minute,\'departures\'):null;')
one('kerbside-rail-calibration.js',"  if(!isWeekday(date))return '';","  if(!reference)return '';")
one('kerbside-rail-calibration.js','function benchmarkForecast(station,minute,date,predictedLevel){\n  if(!isWeekday(date))return null;','function benchmarkForecast(station,minute,date,predictedLevel,isBankHoliday=false){\n  if(!isDftReferenceDay(date,isBankHoliday))return null;')
one('kerbside-rail-calibration.js','function operatorCrowdingSignal(service,station,minute){\n  const dir=peakDirection(minute),data=v4Data(),profile=profileFor(station);if(!dir||!data||!profile)return {amount:0,reasons:[],measured:false};','function operatorCrowdingSignal(service,station,minute,date,isBankHoliday=false){\n  const dir=peakDirection(minute),data=v4Data(),profile=profileFor(station);if(!isDftReferenceDay(date,isBankHoliday)||!dir||!data||!profile)return {amount:0,reasons:[],measured:false};')
one('kerbside-rail-calibration.js','function peakCapacitySignal(station,minute){\n  const dir=peakDirection(minute),data=v4Data(),profile=profileFor(station);if(!dir||!data||!profile)return {amount:0,reasons:[],measured:false};','function peakCapacitySignal(station,minute,date,isBankHoliday=false){\n  const dir=peakDirection(minute),data=v4Data(),profile=profileFor(station);if(!isDftReferenceDay(date,isBankHoliday)||!dir||!data||!profile)return {amount:0,reasons:[],measured:false};')
one('kerbside-rail-calibration.js','function utilisationPrior(service,station,minute,date){\n  const data=v4Data(),u=data&&data.utilisation;if(!u||!u.priors||!isWeekday(date)||!peakDirection(minute))return null;','function utilisationPrior(service,station,minute,date,isBankHoliday=false){\n  const data=v4Data(),u=data&&data.utilisation;if(!u||!u.priors||!isDftReferenceDay(date,isBankHoliday)||!peakDirection(minute))return null;')
one('kerbside-rail-calibration.js','stationUsageRecord,stationUsageSignal,routeFlowSignal,routeLoadSignal,orrOdmDataset,benchmarkForecast,operatorCrowdingSignal,peakCapacitySignal,utilisationPrior,','stationUsageRecord,stationUsageSignal,routeFlowSignal,routeLoadSignal,orrOdmDataset,odmFlow,flowShareToTargets,benchmarkForecast,operatorCrowdingSignal,peakCapacitySignal,utilisationPrior,')
one('kerbside-rail-calibration.js','profileFor,operatorClass,isWeekday,','profileFor,operatorClass,isWeekday,isDftReferenceDay,')

# DfT time-sensitive layers use expected live time when a plausible delay crosses a band; planning stays scheduled.
one('kerbside-train-forecast-v4.js',"function isFuture(date){return stamp(date)>stamp(new Date());}function normalise(v){","function isFuture(date){return stamp(date)>stamp(new Date());}\nfunction isBankHoliday(date){return state.bankHolidays.has(stamp(date));}\nfunction dftMinuteForService(service,date){const scheduled=parseMinutes(service&&service.std);if(scheduled==null||isFuture(date))return scheduled;const expected=parseMinutes(service&&service.etd);if(expected==null)return scheduled;let delay=expected-scheduled;if(delay<-720)delay+=1440;if(delay>720)delay-=1440;return Math.abs(delay)<=180?(scheduled+delay+1440)%1440:scheduled;}\nfunction normalise(v){")
one('kerbside-train-forecast-v4.js','function ordinalProbabilities(score,service,station,evidence,date){\n  const cal=calibration(),minute=parseMinutes(service&&service.std),prior=cal&&typeof cal.utilisationPrior===\'function\'?cal.utilisationPrior(service,station,minute,date):null,base=prior&&Array.isArray(prior.probabilities)?prior.probabilities:[.18,.34,.36,.12],temperature=clamp(1.22-Math.min(8,Number(evidence)||0)*.065,.62,1.18);','function ordinalProbabilities(score,service,station,evidence,date,minuteOverride=null,bankHoliday=false){\n  const cal=calibration(),minute=minuteOverride==null?parseMinutes(service&&service.std):minuteOverride,prior=cal&&typeof cal.utilisationPrior===\'function\'?cal.utilisationPrior(service,station,minute,date,bankHoliday):null,base=prior&&Array.isArray(prior.probabilities)?prior.probabilities:[.18,.34,.36,.12],temperature=clamp(1.22-Math.min(8,Number(evidence)||0)*.065,.62,1.18);')
one('kerbside-train-forecast-v4.js','  const minute=parseMinutes(service&&service.std),future=isFuture(date);','  const minute=parseMinutes(service&&service.std),future=isFuture(date),dftMinute=dftMinuteForService(service,date),bankHoliday=isBankHoliday(date);')
one('kerbside-train-forecast-v4.js','  const shapeCal=calibratedDemandSignal(station,minute,date);\n  const serviceClass=serviceClassSignal(service,station,minute,date);\n  const operatorCrowding=calV4&&typeof calV4.operatorCrowdingSignal===\'function\'?calV4.operatorCrowdingSignal(service,station,minute):{amount:0,reasons:[],measured:false};\n  const peakCapacity=calV4&&typeof calV4.peakCapacitySignal===\'function\'?calV4.peakCapacitySignal(station,minute):{amount:0,reasons:[],measured:false};','  const shapeCal=calibratedDemandSignal(station,dftMinute,date,bankHoliday);\n  const serviceClass=serviceClassSignal(service,station,dftMinute,date,bankHoliday);\n  const operatorCrowding=calV4&&typeof calV4.operatorCrowdingSignal===\'function\'?calV4.operatorCrowdingSignal(service,station,dftMinute,date,bankHoliday):{amount:0,reasons:[],measured:false};\n  const peakCapacity=calV4&&typeof calV4.peakCapacitySignal===\'function\'?calV4.peakCapacitySignal(station,dftMinute,date,bankHoliday):{amount:0,reasons:[],measured:false};')
one('kerbside-train-forecast-v4.js','function calibratedDemandSignal(station,minute,date){','function calibratedDemandSignal(station,minute,date,bankHoliday=false){')
one('kerbside-train-forecast-v4.js','  try{return cal.demandShape(station,minute,date)||{amount:0,reasons:[]};','  try{return cal.demandShape(station,minute,date,bankHoliday)||{amount:0,reasons:[]};')
one('kerbside-train-forecast-v4.js','function serviceClassSignal(service,station,minute,date){','function serviceClassSignal(service,station,minute,date,bankHoliday=false){')
one('kerbside-train-forecast-v4.js','  try{return cal.serviceClassSignal(service,station,minute,date)||{amount:0,reasons:[]};','  try{return cal.serviceClassSignal(service,station,minute,date,bankHoliday)||{amount:0,reasons:[]};')
one('kerbside-train-forecast-v4.js','+(routeLoad.measured?.5:0)+(operatorCrowding.measured?1:0)','+(routeLoad.source===\'orr-odm\'?1:(routeLoad.measured?.5:0))+(operatorCrowding.measured?1:0)')
one('kerbside-train-forecast-v4.js','  const probabilityModel=ordinalProbabilities(score,service,station,evidence,date),accuracyBucket=','  const probabilityModel=ordinalProbabilities(score,service,station,evidence,date,dftMinute,bankHoliday),accuracyBucket=')
one('kerbside-train-forecast-v4.js','cal.benchmarkForecast(station,minute,date,probabilityModel.level)','cal.benchmarkForecast(station,dftMinute,date,probabilityModel.level,bankHoliday)')
one('kerbside-train-forecast-v4.js','cal.contextNote(station,minute,date)||\'\'','cal.contextNote(station,dftMinute,date,bankHoliday)||\'\'')
one('kerbside-train-forecast-v4.js','benchmarkServices};','benchmarkServices,dftMinuteForService,isBankHoliday};')

# Ensure browser regression explicitly protects data-before-calibration ordering.
p='kerbside-backend/tests/browser-regression.mjs'; s=read(p)
if 'kerbside-orr-odm-2024-25.js?v=0.9.7' not in s:
    s+="\n// 0.9.7: measured ODM must execute before calibration consumes it.\nassert.ok(html.indexOf('kerbside-orr-odm-2024-25.js?v=0.9.7')>html.indexOf('kerbside-rail-demand-v4.js?v=0.9.7'));\nassert.ok(html.indexOf('kerbside-orr-odm-2024-25.js?v=0.9.7')<html.indexOf('kerbside-rail-calibration.js?v=0.9.7'));\n"
write(p,s)
for p in STAGING: p.unlink(missing_ok=True)
print('Kerbside 0.9.7 ORR ODM + temporal calibration patch applied')