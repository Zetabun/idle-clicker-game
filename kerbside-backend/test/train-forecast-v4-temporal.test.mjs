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
  vm.createContext(context);vm.runInContext(trainsSource,context);vm.runInContext(timebandsSource,context);vm.runInContext(demandSource,context);vm.runInContext(calibrationSource,context);vm.runInContext(forecastSource,context);return context;
}
const station={name:'Birmingham New Street',crs:'BHM'},service={std:'08:15',etd:'',operator:'CrossCountry',operatorCode:'XC',length:0,isCancelled:false,scheduledOnly:true,origin:[{crs:'BHM'}],destination:[{crs:'BRI'}],displayDestination:{crs:'BRI'},subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}],previousCallingPoints:[]};

test('DfT operator, capacity and utilisation evidence is weekday-only and bank-holiday safe',()=>{
  const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__,wed=new FixedDate('2026-08-12T12:00:00Z'),sat=new FixedDate('2026-08-15T12:00:00Z');
  assert.equal(cal.operatorCrowdingSignal(service,station,8*60,wed,false).measured,true);
  assert.equal(cal.operatorCrowdingSignal(service,station,8*60,sat,false).measured,false);
  assert.equal(cal.operatorCrowdingSignal(service,station,8*60,wed,true).measured,false);
  assert.equal(cal.peakCapacitySignal(station,8*60,wed,false).measured,true);
  assert.equal(cal.peakCapacitySignal(station,8*60,sat,false).measured,false);
  assert.equal(cal.peakCapacitySignal(station,8*60,wed,true).measured,false);
  assert.ok(cal.utilisationPrior(service,station,8*60,wed,false));
  assert.equal(cal.utilisationPrior(service,station,8*60,sat,false),null);
  assert.equal(cal.utilisationPrior(service,station,8*60,wed,true),null);
  assert.equal(cal.demandShape(station,8*60,wed,true).amount,0);
  assert.equal(cal.serviceClassSignal(service,station,8*60,wed,true).amount,0);
});

test('DfT peak-capacity boundaries are exact',()=>{
  const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__,date=new FixedDate('2026-08-12T12:00:00Z');
  assert.equal(cal.peakCapacitySignal(station,419,date,false).measured,false);
  assert.equal(cal.peakCapacitySignal(station,420,date,false).measured,true);
  assert.equal(cal.peakCapacitySignal(station,599,date,false).measured,true);
  assert.equal(cal.peakCapacitySignal(station,600,date,false).measured,false);
  assert.equal(cal.peakCapacitySignal(station,959,date,false).measured,false);
  assert.equal(cal.peakCapacitySignal(station,960,date,false).measured,true);
  assert.equal(cal.peakCapacitySignal(station,1139,date,false).measured,true);
  assert.equal(cal.peakCapacitySignal(station,1140,date,false).measured,false);
});

test('GB public holidays are recognised without inventing extra substitute weekdays',()=>{
  const c=load(),v4=c.window.__KERBSIDE_FORECAST_V4__;
  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-12T12:00:00Z')),false);
  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-03T12:00:00Z')),true);
  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-31T12:00:00Z')),true);
  assert.equal(v4.isBankHoliday(new FixedDate('2026-11-30T12:00:00Z')),true);
  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-01T12:00:00Z')),false);
  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-28T12:00:00Z')),true);
  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-29T12:00:00Z')),false);
});

test('live expected departure can move DfT evidence into the actual band while future planning stays scheduled',()=>{
  const c=load(),v4=c.window.__KERBSIDE_FORECAST_V4__,live={...service,std:'09:55',etd:'10:05',scheduledOnly:false};
  assert.equal(v4.dftMinuteForService(live,new FixedDate('2026-08-12T08:00:00Z')),605);
  assert.equal(v4.dftMinuteForService(live,new FixedDate('2026-08-13T08:00:00Z')),595);
  assert.equal(v4.dftMinuteForService({...live,etd:'13:30'},new FixedDate('2026-08-12T08:00:00Z')),595);
});

test('forecast passes expected-time and holiday context into measured DfT signals',()=>{
  const c=load(),trains=c.window.__KERBSIDE_TRAINS__,cal=c.window.__KERBSIDE_CALIBRATION__,v4=c.window.__KERBSIDE_FORECAST_V4__;trains.state.station=station;
  const seen=[];const original=cal.operatorCrowdingSignal;cal.operatorCrowdingSignal=(...args)=>{seen.push(args);return original(...args);};
  const live={...service,std:'09:55',etd:'10:05',scheduledOnly:false};v4.forecast(live,0,[live],{station,referenceDate:new FixedDate('2026-08-12T08:00:00Z')});
  assert.ok(seen.length);assert.equal(seen.at(-1)[2],605);assert.equal(seen.at(-1)[4],false);
  seen.length=0;const holiday={...service,std:'08:15',etd:'',scheduledOnly:true};v4.forecast(holiday,0,[holiday],{station,referenceDate:new FixedDate('2026-08-31T08:00:00Z')});
  assert.ok(seen.length);assert.equal(seen.at(-1)[4],true);
});

test('same route keeps the route prior while final context changes with journey time',()=>{
  const c=load(),trains=c.window.__KERBSIDE_TRAINS__,cal=c.window.__KERBSIDE_CALIBRATION__,v4=c.window.__KERBSIDE_FORECAST_V4__;trains.state.station=station;
  const morning={...service,std:'08:15'},midday={...service,std:'13:00'};
  const routeMorning=cal.routeLoadSignal(morning,station),routeMidday=cal.routeLoadSignal(midday,station);assert.equal(routeMorning.amount,routeMidday.amount);
  const a=v4.forecast(morning,0,[morning],{station,referenceDate:new FixedDate('2026-08-12T08:00:00Z')}),b=v4.forecast(midday,0,[midday],{station,referenceDate:new FixedDate('2026-08-12T08:00:00Z')});
  assert.notEqual(a.score,b.score,{a:a.score,b:b.score});
});


test('summer holidays stay neutral off peak and unmeasured probability fallback is neutral',()=>{
  const c=load(),v4=c.window.__KERBSIDE_FORECAST_V4__,date=new FixedDate('2026-08-14T12:00:00Z');
  assert.equal(v4.schoolHolidaySignal(date,13*60).amount,0);
  assert.equal(v4.schoolHolidaySignal(date,21*60).amount,0);
  const unmeasured={name:'Fixture station',crs:'ZZZ'},fixture={...service,std:'21:00',operator:'Fixture Rail',operatorCode:'ZZ'};
  const model=v4.ordinalProbabilities(2.625,fixture,unmeasured,4,date,21*60,false);
  assert.equal(model.prior,null);assert.ok(Math.abs(model.probabilities[1]-model.probabilities[2])<1e-12,model.probabilities);
});
