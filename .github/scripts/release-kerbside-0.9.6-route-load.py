#!/usr/bin/env python3
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}')
    write(path, text.replace(old, new, 1))


def replace_all(path, old, new):
    text = read(path)
    count = text.count(old)
    if count < 1:
        raise SystemExit(f'{path}: expected at least one {old!r}')
    write(path, text.replace(old, new))


# ---------------------------------------------------------------------------
# Commercially guarded ORR route-load evidence + DfT aggregate benchmark.
# ---------------------------------------------------------------------------
replace_once(
    'kerbside-rail-calibration.js',
    "const OPERATOR_ALIASES=",
    r'''/* Route-load model.
   The bundled ORR station-usage table contains each station's strongest
   origin/destination flow. That is not a full ODM, so Kerbside uses it only as
   a directional route-load proxy: does measured demand from this station, or
   from stations already served, continue along the train's remaining calls?

   A future full ORR Origin Destination Matrix can be injected through
   window.__KERBSIDE_ORR_ODM__. It is trusted only when the host explicitly
   declares commercial reuse and licence provenance. Until then no scraped or
   ambiguous journey-planner data enters this path. */
function routeCallCrs(groups){
  const out=[];
  (Array.isArray(groups)?groups:[]).forEach(group=>{
    const points=Array.isArray(group&&group.callingPoint)?group.callingPoint:Array.isArray(group&&group.callingPoints)?group.callingPoints:Array.isArray(group)?group:[];
    points.forEach(point=>{const code=String(point&&(point.crs||point.crsCode)||'').toUpperCase();if(/^[A-Z0-9]{3}$/.test(code)&&!out.includes(code))out.push(code);});
  });
  return out;
}
function orrOdmDataset(){
  const raw=window.__KERBSIDE_ORR_ODM__;
  if(!raw||typeof raw!=='object'||raw.commercialUse!==true)return null;
  const authority=String(raw.authority||raw.publisher||'').trim(),licence=String(raw.licence||raw.license||'').trim(),period=String(raw.period||raw.asOf||'').trim();
  const usable=typeof raw.flow==='function'||(raw.flows&&typeof raw.flows==='object');
  if(!authority||!licence||!period||!usable)return null;
  return raw;
}
function odmFlow(feed,from,to){
  if(!feed)return null;
  const a=String(from||'').toUpperCase(),b=String(to||'').toUpperCase();
  if(!a||!b||a===b)return 0;
  let raw;
  try{raw=typeof feed.flow==='function'?feed.flow(a,b):(feed.flows&&feed.flows[`${a}|${b}`]??feed.flows&&feed.flows[a]&&feed.flows[a][b]);}catch(error){return null;}
  const value=Number(raw);
  return Number.isFinite(value)&&value>=0?value:null;
}
function flowShareToTargets(from,targets,feed){
  const code=String(from||'').toUpperCase(),row=stationUsageRecord({crs:code}),usage=Number(row&&row.usage)||0;
  if(!row||usage<=0||!targets||!targets.size)return null;
  if(feed){
    let journeys=0,known=0;
    targets.forEach(to=>{const value=odmFlow(feed,code,to);if(value!=null){journeys+=value;known++;}});
    if(known||feed.completeMatrix===true)return {share:clamp(journeys/usage,0,.8),journeys,exact:true,row};
  }
  const main=String(row.mainCrs||'').toUpperCase(),journeys=Number(row.mainJourneys)||0;
  if(main&&targets.has(main)&&journeys>0)return {share:clamp(journeys/usage,0,.8),journeys,exact:false,row};
  return null;
}
function routeLoadSignal(service,station){
  const current=crsOf(station),before=routeCallCrs(service&&service.previousCallingPoints),after=routeCallCrs(service&&service.subsequentCallingPoints);
  const destination=destinationCrs(service);if(destination&&!after.includes(destination))after.push(destination);
  if(!current||!after.length)return {amount:0,reasons:[],measured:false,source:'none'};
  const downstream=new Set(after.filter(code=>code&&code!==current)),feed=orrOdmDataset(),board=flowShareToTargets(current,downstream,feed);
  let retained=0,alighting=0,retainedStations=0,alightingStations=0,exactEvidence=!!(board&&board.exact);
  before.slice(-10).forEach(code=>{
    const onward=flowShareToTargets(code,downstream,feed);if(onward){retained+=onward.share;if(onward.share>=.015)retainedStations++;exactEvidence=exactEvidence||onward.exact;}
    const here=flowShareToTargets(code,new Set([current]),feed);if(here){alighting+=here.share;if(here.share>=.015)alightingStations++;exactEvidence=exactEvidence||here.exact;}
  });
  const boardShare=Number(board&&board.share)||0,matched=boardShare>0||retained>0||alighting>0;
  if(!matched&&!exactEvidence)return {amount:0,reasons:[],measured:false,source:'none'};
  let amount=0;const reasons=[];
  if(boardShare>0){amount+=clamp(.08+boardShare*1.2,.08,.35);reasons.push(feed?'ORR origin-destination demand from this station continues along this train':'ORR identifies this train direction as this station’s strongest measured origin/destination flow');}
  if(retained>0){amount+=clamp(retained*.7,.05,.45);reasons.push(feed?`ORR origin-destination demand from ${retainedStations||1} earlier call${retainedStations===1?'':'s'} continues beyond this station`:`ORR strongest-flow evidence from ${retainedStations||1} earlier call${retainedStations===1?'':'s'} points further along this train`);}
  if(alighting>0){amount-=clamp(alighting*.35,.03,.18);reasons.push(feed?`ORR origin-destination demand indicates alighting pressure at this station`:`ORR strongest-flow evidence suggests some accumulated demand leaves the train here`);}
  return {amount:clamp(amount,-.2,.7),reasons,measured:true,source:feed?'orr-odm':'orr-main-flow-proxy',boardShare,retainedPressure:retained,alightingPressure:alighting,licence:feed?String(feed.licence||feed.license||''):'Open Government Licence v3.0 station-usage aggregate'};
}
const CROWD_RANK={quiet:0,moderate:1,busy:2,'very-busy':3};
function benchmarkForecast(station,minute,date,predictedLevel){
  if(!isWeekday(date))return null;
  const measured=measuredBand(station,minute,'departures'),measuredLevel=measured&&measuredCrowdingBand(measured.loadFactor),predicted=String(predictedLevel||'');
  if(!measuredLevel||CROWD_RANK[predicted]==null)return null;
  const bandError=Math.abs(CROWD_RANK[predicted]-CROWD_RANK[measuredLevel]);
  return {source:'DfT RAI0202/RAI0203 2025 aggregate benchmark',aggregateOnly:true,band:measured.label,loadFactor:measured.loadFactor,measuredLevel,predictedLevel:predicted,bandError,exact:bandError===0,withinOne:bandError<=1};
}

const OPERATOR_ALIASES='''
)
replace_once(
    'kerbside-rail-calibration.js',
    "  stationUsageRecord,stationUsageSignal,routeFlowSignal,operatorCrowdingSignal,peakCapacitySignal,utilisationPrior,",
    "  stationUsageRecord,stationUsageSignal,routeFlowSignal,routeLoadSignal,orrOdmDataset,benchmarkForecast,operatorCrowdingSignal,peakCapacitySignal,utilisationPrior,"
)

# ---------------------------------------------------------------------------
# Forecast v4 consumes measured route-load evidence and exposes batch
# aggregate backtesting against the independent DfT time-band benchmark.
# ---------------------------------------------------------------------------
old_shape = r'''function journeyShapeSignal(service,station){
  const before=callingPoints(service&&service.previousCallingPoints);
  const after=callingPoints(service&&service.subsequentCallingPoints);
  const startsHere=stationMatchesOrigin(service,station);
  let amount=0;const reasons=[];
  if(before.length>=12){amount+=.7;reasons.push('long run before this stop, so the train arrives already loaded');}
  else if(before.length>=6){amount+=.45;reasons.push('several stops already made, so passengers have accumulated');}
  else if(before.length>=2){amount+=.2;reasons.push('a few stops already made');}
  else if(startsHere===true){amount-=.25;reasons.push('train starts at this station');}
  else if(startsHere===false){amount+=.25;reasons.push('through train may already carry passengers');}
  /* Expanded Darwin calling points replace the binary starts-here proxy when
     they arrive. That improves the same row instead of adding a second copy
     of through-train loading on top of the timetable estimate. */
  if(before.some(p=>(STATION_TIER[String(p.crs||'').toUpperCase()]||1)>=3)){
    amount+=.35;reasons.push('has already called at a major hub');
  }
  if(after.length&&after.length<=3&&after.some(p=>(STATION_TIER[String(p.crs||'').toUpperCase()]||1)>=3)){
    amount+=.3;reasons.push('fast service to a major destination');
  }
  const evidence=(before.length||after.length)?1:(startsHere==null?0:.5);
  return {amount,reasons,evidence};
}'''
new_shape = r'''function journeyShapeSignal(service,station,options={}){
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
}'''
replace_once('kerbside-train-forecast-v4.js', old_shape, new_shape)

replace_once(
    'kerbside-train-forecast-v4.js',
    """  const formation=future?{amount:0,reasons:[]}:formationSignal(api,service,services,date,station);\n  const shape=journeyShapeSignal(service,station);\n  const scale=stationScaleSignal(station);\n  const school=schoolHolidaySignal(date,minute);\n  const offpeak=offPeakSignal(date,minute);\n  const shapeCal=calibratedDemandSignal(station,minute,date);\n  const serviceClass=serviceClassSignal(service,station,minute,date);\n  const calV4=calibration(),destination=destinationForModel(service,context);\n  const routeFlow=calV4&&typeof calV4.routeFlowSignal==='function'?calV4.routeFlowSignal(station,destination):{amount:0,reasons:[],measured:false};\n""",
    """  const formation=future?{amount:0,reasons:[]}:formationSignal(api,service,services,date,station);\n  const calV4=calibration(),destination=destinationForModel(service,context);\n  const routeLoad=calV4&&typeof calV4.routeLoadSignal==='function'?calV4.routeLoadSignal(service,station):(calV4&&typeof calV4.routeFlowSignal==='function'?calV4.routeFlowSignal(station,destination):{amount:0,reasons:[],measured:false,source:'none'});\n  const shape=journeyShapeSignal(service,station,{measuredLoad:routeLoad.measured===true});\n  const scale=stationScaleSignal(station);\n  const school=schoolHolidaySignal(date,minute);\n  const offpeak=offPeakSignal(date,minute);\n  const shapeCal=calibratedDemandSignal(station,minute,date);\n  const serviceClass=serviceClassSignal(service,station,minute,date);\n"""
)
replace_all('kerbside-train-forecast-v4.js', 'routeFlow.amount', 'routeLoad.amount')
replace_all('kerbside-train-forecast-v4.js', 'routeFlow.reasons', 'routeLoad.reasons')
replace_all('kerbside-train-forecast-v4.js', 'routeFlow.measured', 'routeLoad.measured')

replace_once(
    'kerbside-train-forecast-v4.js',
    "  const cal=calibration();\n  let calibrationNote='';",
    "  const cal=calibration();\n  const measuredBenchmark=cal&&typeof cal.benchmarkForecast==='function'?cal.benchmarkForecast(station,minute,date,probabilityModel.level):null;\n  let calibrationNote='';"
)
replace_once(
    'kerbside-train-forecast-v4.js',
    'utilisationPrior:probabilityModel.prior,accuracyBucket,empiricalAccuracy:confidenceInfo.local}',
    'utilisationPrior:probabilityModel.prior,routeLoad,measuredBenchmark,accuracyBucket,empiricalAccuracy:confidenceInfo.local}'
)
replace_once(
    'kerbside-train-forecast-v4.js',
    "/* options.mode overrides the Planning / Live-adjusted badge",
    r'''function benchmarkServices(services,station,date){
  const list=Array.isArray(services)?services:[],when=date instanceof Date?date:new Date(date||Date.now());
  let count=0,exact=0,withinOne=0,totalError=0;
  list.forEach((service,index)=>{
    const result=forecast(service,index,list,{station,referenceDate:when}),benchmark=result&&result.measuredBenchmark;
    if(!benchmark)return;count++;if(benchmark.exact)exact++;if(benchmark.withinOne)withinOne++;totalError+=Number(benchmark.bandError)||0;
  });
  return {count,exact:count?exact/count:0,withinOne:count?withinOne/count:0,meanBandError:count?totalError/count:0,source:'DfT aggregate time-band benchmark',aggregateOnly:true};
}

/* options.mode overrides the Planning / Live-adjusted badge'''
)
replace_once(
    'kerbside-train-forecast-v4.js',
    'MAX_EVENT_PRESSURE,ordinalProbabilities,probabilityConfidence,servicePatternSignal};',
    'MAX_EVENT_PRESSURE,ordinalProbabilities,probabilityConfidence,servicePatternSignal,benchmarkServices};'
)

# ---------------------------------------------------------------------------
# Tests load the independent DfT time-band dataset and cover the route-load
# proxy, commercial ODM guard and aggregate benchmark.
# ---------------------------------------------------------------------------
replace_once(
    'kerbside-backend/test/train-forecast-v4-official-data.test.mjs',
    "const [trainsSource,demandSource,calibrationSource,forecastSource]=await Promise.all([\n  fs.readFile(path.join(root,'kerbside-trains.js'),'utf8'),\n  fs.readFile(path.join(root,'kerbside-rail-demand-v4.js'),'utf8'),\n  fs.readFile(path.join(root,'kerbside-rail-calibration.js'),'utf8'),\n  fs.readFile(path.join(root,'kerbside-train-forecast-v4.js'),'utf8')\n]);",
    "const [trainsSource,timebandsSource,demandSource,calibrationSource,forecastSource]=await Promise.all([\n  fs.readFile(path.join(root,'kerbside-trains.js'),'utf8'),\n  fs.readFile(path.join(root,'kerbside-rail-timebands.js'),'utf8'),\n  fs.readFile(path.join(root,'kerbside-rail-demand-v4.js'),'utf8'),\n  fs.readFile(path.join(root,'kerbside-rail-calibration.js'),'utf8'),\n  fs.readFile(path.join(root,'kerbside-train-forecast-v4.js'),'utf8')\n]);"
)
replace_once(
    'kerbside-backend/test/train-forecast-v4-official-data.test.mjs',
    'vm.createContext(context);vm.runInContext(trainsSource,context);vm.runInContext(demandSource,context);vm.runInContext(calibrationSource,context);vm.runInContext(forecastSource,context);',
    'vm.createContext(context);vm.runInContext(trainsSource,context);vm.runInContext(timebandsSource,context);vm.runInContext(demandSource,context);vm.runInContext(calibrationSource,context);vm.runInContext(forecastSource,context);'
)
with Path('kerbside-backend/test/train-forecast-v4-official-data.test.mjs').open('a', encoding='utf-8') as f:
    f.write(r'''

test('route-load model uses ORR strongest-flow evidence along the actual calling pattern',()=>{
  const c=load(),data=c.window.__KERBSIDE_RAIL_DEMAND_V4__,cal=c.window.__KERBSIDE_CALIBRATION__;
  const pair=Object.entries(data.stations).find(([,row])=>row.mainCrs&&row.mainJourneys>1000);assert.ok(pair);
  const [from,row]=pair,service={destination:[{crs:row.mainCrs}],subsequentCallingPoints:[{callingPoint:[{crs:row.mainCrs}]}],previousCallingPoints:[]};
  const result=cal.routeLoadSignal(service,{crs:from});assert.equal(result.measured,true,result);assert.equal(result.source,'orr-main-flow-proxy');assert.ok(result.amount>0,result);assert.ok(result.boardShare>0,result);
});

test('full ODM adapter rejects unclear commercial rights and accepts explicit licensed fixtures',()=>{
  const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__;
  c.window.__KERBSIDE_ORR_ODM__={authority:'Fixture',period:'2024-25',licence:'research-only',commercialUse:false,flows:{'BHM|BRI':100000}};
  assert.equal(cal.orrOdmDataset(),null);
  c.window.__KERBSIDE_ORR_ODM__={authority:'Licensed fixture',period:'2024-25',licence:'commercial-test',commercialUse:true,completeMatrix:true,flows:{'BHM|BRI':100000}};
  assert.ok(cal.orrOdmDataset());
  const result=cal.routeLoadSignal({destination:[{crs:'BRI'}],subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}],previousCallingPoints:[]},{crs:'BHM'});
  assert.equal(result.source,'orr-odm');assert.equal(result.measured,true);assert.ok(result.amount>0,result);
});

test('measured route-load evidence suppresses the old previous-stop accumulation proxy',()=>{
  const c=load(),v4=c.window.__KERBSIDE_FORECAST_V4__;
  const service={origin:[{crs:'AAA'}],previousCallingPoints:[{callingPoint:Array.from({length:8},(_,i)=>({crs:`A${i}A`}))}],subsequentCallingPoints:[{callingPoint:[{crs:'BHM'}]}]};
  const legacy=v4.journeyShapeSignal(service,{crs:'ZZZ'}),measured=v4.journeyShapeSignal(service,{crs:'ZZZ'},{measuredLoad:true});
  assert.ok(legacy.amount>measured.amount,{legacy,measured});assert.equal(measured.measuredLoad,true);
});

test('DfT aggregate benchmark can backtest forecast bands without user feedback',()=>{
  const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__,v4=c.window.__KERBSIDE_FORECAST_V4__,station={name:'Birmingham New Street',crs:'BHM'},date=new FixedDate('2026-08-12T12:00:00Z');
  const benchmark=cal.benchmarkForecast(station,8*60+15,date,'busy');assert.ok(benchmark,benchmark);assert.equal(benchmark.aggregateOnly,true);assert.match(benchmark.source,/DfT/);assert.ok(['quiet','moderate','busy','very-busy'].includes(benchmark.measuredLevel));
  const service={std:'08:15',operator:'CrossCountry',operatorCode:'XC',isCancelled:false,scheduledOnly:true,origin:[{crs:'BHM'}],destination:[{crs:'BRI'}],displayDestination:{crs:'BRI'},subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}],previousCallingPoints:[]};
  const summary=v4.benchmarkServices([service],station,date);assert.equal(summary.count,1,summary);assert.equal(summary.aggregateOnly,true);assert.ok(summary.withinOne>=0&&summary.withinOne<=1,summary);
});
''')

# ---------------------------------------------------------------------------
# App release version/cache busting.
# ---------------------------------------------------------------------------
Path('VERSION').write_text('0.9.6\n', encoding='utf-8')
for path in [
    'bus.html',
    'kerbside-journey-planner-ui.js',
    'kerbside-status.js',
    'kerbside-backend/package.json',
    'kerbside-backend/src/worker.js',
    'kerbside-backend/test/worker.test.js',
    'kerbside-backend/tests/browser-regression.mjs',
]:
    replace_all(path, '0.9.5', '0.9.6')

print('Kerbside 0.9.6 route-load model staged')
