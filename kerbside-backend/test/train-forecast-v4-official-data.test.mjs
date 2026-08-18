import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..','..');
const [trainsSource,timebandsSource,demandSource,calibrationSource,forecastSource]=await Promise.all([
  fs.readFile(path.join(root,'kerbside-trains.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-rail-timebands.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-rail-demand-v4.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-rail-calibration.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-train-forecast-v4.js'),'utf8')
]);
class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-08-12T08:00:00Z']));}static now(){return new Date('2026-08-12T08:00:00Z').getTime();}}
function storage(){const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
const document={readyState:'loading',addEventListener(){},getElementById(){return null;},createElement(){return {innerHTML:'',textContent:''};}};
function load(){
  const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_TRAIN_OVERLAY__:{state:{services:[]}}};
  const context={window,document,Date:FixedDate,Intl,console,localStorage:storage(),setTimeout,clearTimeout,setInterval,clearInterval,AbortController,Blob,Response,TextDecoder,DecompressionStream,requestAnimationFrame(){return 1;},MutationObserver:class{observe(){}disconnect(){}}};
  vm.createContext(context);vm.runInContext(trainsSource,context);vm.runInContext(timebandsSource,context);vm.runInContext(demandSource,context);vm.runInContext(calibrationSource,context);vm.runInContext(forecastSource,context);
  return context;
}

test('official Forecast v4 bundle contains DfT utilisation and ORR station usage',()=>{
  const c=load(),data=c.window.__KERBSIDE_RAIL_DEMAND_V4__,bhm=data.station('BHM');
  assert.equal(data.year,2025);assert.ok(bhm&&bhm.usage>1_000_000,bhm);assert.ok(bhm.percentile>0.8,bhm);
  for(const key of ['london','longDistance','regional','all']){const p=data.utilisation.priors[key];assert.equal(p.length,4);assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-5,{key,p});}
});

test('ORR main-origin/destination field creates a measured route-flow prior',()=>{
  const c=load(),data=c.window.__KERBSIDE_RAIL_DEMAND_V4__,cal=c.window.__KERBSIDE_CALIBRATION__;
  const pair=Object.entries(data.stations).find(([,row])=>row.mainCrs&&row.mainJourneys>1000);assert.ok(pair);
  const [from,row]=pair,result=cal.routeFlowSignal({crs:from},{crs:row.mainCrs});assert.equal(result.measured,true);assert.ok(result.amount>=.12,result);assert.match(result.reasons[0],/ORR station estimates/);
});

test('DfT 2025 operator, capacity and time-band utilisation feed measured signals',()=>{
  const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__,station={name:'Birmingham New Street',crs:'BHM'},service={operator:'CrossCountry',operatorCode:'XC'},date=new FixedDate('2026-08-12T12:00:00Z');
  const operator=cal.operatorCrowdingSignal(service,station,8*60),capacity=cal.peakCapacitySignal(station,8*60),peakPrior=cal.utilisationPrior(service,station,8*60,date),middayPrior=cal.utilisationPrior(service,station,13*60,date),latePrior=cal.utilisationPrior(service,station,21*60,date);
  assert.equal(operator.measured,true,operator);assert.ok(operator.reasons.some(r=>/DfT 2025 measured/.test(r)),operator);
  assert.equal(capacity.measured,true,capacity);assert.equal(peakPrior.group,'timeBand');assert.match(peakPrior.source,/RAI0202[/]RAI0203/);assert.ok(Math.abs(peakPrior.probabilities.reduce((a,b)=>a+b,0)-1)<1e-5);
  assert.equal(middayPrior.group,'timeBand');assert.equal(latePrior.band,'21:00-21:59');assert.ok(Math.abs(latePrior.loadFactor-(2995/10729))<1e-12,latePrior);assert.ok(latePrior.probabilities[0]>latePrior.probabilities[1],latePrior);
});

test('Forecast v4 returns an empirical ordinal probability distribution',()=>{
  const c=load(),trains=c.window.__KERBSIDE_TRAINS__,v4=c.window.__KERBSIDE_FORECAST_V4__,station={name:'Birmingham New Street',crs:'BHM'};trains.state.station=station;
  const service={std:'08:15',etd:'',operator:'CrossCountry',operatorCode:'XC',length:0,isCancelled:false,scheduledOnly:true,origin:[{locationName:'Birmingham New Street',crs:'BHM'}],destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],displayDestination:{name:'Bristol Temple Meads',crs:'BRI'}};
  const result=v4.forecast(service,0,[service],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  assert.equal(v4.version,4);assert.equal(result.modelVersion,4);const values=Object.values(result.probabilities);assert.equal(values.length,4);assert.ok(Math.abs(values.reduce((a,b)=>a+b,0)-1)<1e-9,result.probabilities);assert.ok(result.topProbability===Math.max(...values));assert.match(v4.detailMarkup(result,new FixedDate('2026-08-12T12:00:00Z')),/Probability/);assert.match(v4.detailMarkup(result,new FixedDate('2026-08-12T12:00:00Z')),/Forecast v4/);
});

test('service-pattern history can influence reliability without passenger identity',()=>{
  const c=load(),trains=c.window.__KERBSIDE_TRAINS__,v4=c.window.__KERBSIDE_FORECAST_V4__,station={name:'Birmingham New Street',crs:'BHM'},date=new FixedDate('2026-08-12T12:00:00Z'),service={std:'08:15',operator:'CrossCountry',operatorCode:'XC',destination:[{crs:'BRI'}]};
  trains.state.crowdingModel={version:3,profiles:{},patternProfiles:{'bhm|xc|bri|weekday|17':{samples:12,cancelledSamples:12,cancelledCount:3,delaySamples:10,avgDelay:12,lengthSamples:8,avgLength:8,updatedAt:FixedDate.now()}},seen:{},feedbackSeen:{}};
  const signal=v4.servicePatternSignal(trains,service,date,station);assert.equal(signal.samples,12);assert.ok(signal.amount>0,signal);assert.ok(signal.reasons.some(r=>/service pattern/.test(r)));
});

test('empirical confidence reads only non-identifying accuracy buckets',()=>{
  const c=load(),trains=c.window.__KERBSIDE_TRAINS__,v4=c.window.__KERBSIDE_FORECAST_V4__,bucket='live|measured|single|formation|no-event';
  trains.state.forecastAccuracy={version:2,total:10,exact:7,withinOne:10,absoluteError:3,buckets:{[bucket]:{total:10,exact:7,withinOne:10,absoluteError:3}},recent:[]};
  const result=v4.probabilityConfidence({probabilities:[.05,.12,.72,.11]},6,bucket);assert.equal(result.local.total,10);assert.equal(result.local.withinOne,1);assert.ok(['Medium-high','High'].includes(result.label),result);
});


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

test('formation fallback ignores heterogeneous station traffic',()=>{
  const c=load(),v4=c.window.__KERBSIDE_FORECAST_V4__;
  const local={length:4,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}};
  c.window.__KERBSIDE_TRAIN_OVERLAY__.state.services=[
    {length:9,operator:'Avanti West Coast',operatorCode:'VT',destination:[{crs:'EUS'}],displayDestination:{crs:'EUS'}},
    {length:9,operator:'Avanti West Coast',operatorCode:'VT',destination:[{crs:'EUS'}],displayDestination:{crs:'EUS'}},
    {length:11,operator:'Avanti West Coast',operatorCode:'VT',destination:[{crs:'EUS'}],displayDestination:{crs:'EUS'}}
  ];
  assert.deepEqual(Array.from(v4.formationBaseline(local,[local])),[],'mixed intercity rows must not form a local-service baseline');
  c.window.__KERBSIDE_TRAIN_OVERLAY__.state.services=[
    {length:4,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}},
    {length:4,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}},
    {length:5,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}}
  ];
  assert.deepEqual(Array.from(v4.formationBaseline(local,[local])),[4,4,5]);
  c.window.__KERBSIDE_TRAIN_OVERLAY__.state.services=[
    {length:4,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}},
    {length:9,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}},
    {length:9,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}}
  ];
  assert.deepEqual(Array.from(v4.formationBaseline(local,[local])),[],'a wide length spread must suppress the fallback even within one operator/route');
});

test('DfT aggregate benchmark can backtest forecast bands without user feedback',()=>{
  const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__,v4=c.window.__KERBSIDE_FORECAST_V4__,station={name:'Birmingham New Street',crs:'BHM'},date=new FixedDate('2026-08-12T12:00:00Z');
  const benchmark=cal.benchmarkForecast(station,8*60+15,date,'busy');assert.ok(benchmark,benchmark);assert.equal(benchmark.aggregateOnly,true);assert.match(benchmark.source,/DfT/);assert.ok(['quiet','moderate','busy','very-busy'].includes(benchmark.measuredLevel));
  const service={std:'08:15',operator:'CrossCountry',operatorCode:'XC',isCancelled:false,scheduledOnly:true,origin:[{crs:'BHM'}],destination:[{crs:'BRI'}],displayDestination:{crs:'BRI'},subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}],previousCallingPoints:[]};
  const summary=v4.benchmarkServices([service],station,date);assert.equal(summary.count,1,summary);assert.equal(summary.aggregateOnly,true);assert.ok(summary.withinOne>=0&&summary.withinOne<=1,summary);
});
