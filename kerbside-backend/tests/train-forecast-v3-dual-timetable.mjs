import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const trainsSource=await fs.readFile(path.join(root,'kerbside-trains.js'),'utf8');
const forecastSource=await fs.readFile(path.join(root,'kerbside-train-forecast-v3.js'),'utf8');
const eventsSource=await fs.readFile(path.join(root,'kerbside-train-events.js'),'utf8');

class FixedDate extends Date{
  constructor(...args){super(...(args.length?args:['2026-08-12T08:00:00Z']));}
  static now(){return new Date('2026-08-12T08:00:00Z').getTime();}
}

function storage(){
  const data=new Map();
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
const documentStub={readyState:'loading',addEventListener(){},getElementById(){return null;},createElement(){return {innerHTML:'',textContent:''};}};

function loadPrediction({station={name:'Test Station',crs:'ZZZ'},model=null,overlayServices=[]}={}){
  const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_TRAIN_OVERLAY__:{state:{services:overlayServices}}};
  const context={window,document:documentStub,Date:FixedDate,Intl,console,localStorage:storage(),setTimeout,clearTimeout,setInterval,clearInterval,AbortController,Blob,Response,TextDecoder,DecompressionStream,requestAnimationFrame(){return 1;},MutationObserver:class{observe(){} disconnect(){}}};
  vm.createContext(context);
  vm.runInContext(trainsSource,context);
  context.window.__KERBSIDE_TRAINS__.state.station=station;
  context.window.__KERBSIDE_TRAINS__.state.crowdingModel=model;
  vm.runInContext(forecastSource,context);
  return {trains:context.window.__KERBSIDE_TRAINS__,v3:context.window.__KERBSIDE_FORECAST_V3__,station,context};
}

function loadEvents(){
  const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_FORECAST_V3__:{apply(){}}};
  const context={window,document:documentStub,Date:FixedDate,Intl,console,localStorage:storage(),setTimeout,clearTimeout,AbortController,fetch:async()=>{throw new Error('network not expected');}};
  vm.createContext(context);
  vm.runInContext(eventsSource,context);
  return context.window.__KERBSIDE_EVENTS__;
}

function service(overrides={}){
  return {std:'10:00',etd:'',operator:'Test Rail',operatorCode:'ZZ',length:0,isCancelled:false,scheduledOnly:true,origin:[{locationName:'Earlier Town',crs:'AAA'}],destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],...overrides};
}

test('Forecast v3 and v2 share the same two-hour profile key and real-terminus identity',()=>{
  const station={name:'Birmingham New Street',crs:'BHM'};
  const key='bhm|xc|ply|weekday|5';
  const model={version:2,profiles:{[key]:{samples:5,lengthSamples:0,avgLength:0,headwaySamples:0,feedbackCount:0,updatedAt:FixedDate.now()}},seen:{},feedbackSeen:{}};
  const {trains,v3}=loadPrediction({station,model});
  const row=service({operatorCode:'XC',destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],displayDestination:{name:'Plymouth',crs:'PLY'}});
  assert.equal(v3.profileKey(row,station,new FixedDate('2026-08-12T12:00:00Z')),key);
  const base=trains.crowdingForecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z'),modelLayer:'v3-baseline',includeFeedback:false});
  assert.equal(base.historySamples,5);
  assert.equal(v3.historicalSignal(trains,row,new FixedDate('2026-08-12T12:00:00Z'),station).samples,5);
});

test('history increases evidence without increasing passenger-demand score by itself',()=>{
  const station={name:'Test Station',crs:'ZZZ'};
  const row=service({origin:[{locationName:'Test Station',crs:'ZZZ'}]});
  const empty=loadPrediction({station,model:{version:2,profiles:{},seen:{},feedbackSeen:{}}});
  const plain=empty.v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  const key='zzz|zz|bri|weekday|5';
  const model={version:2,profiles:{[key]:{samples:6,lengthSamples:0,avgLength:0,headwaySamples:0,feedbackCount:0,updatedAt:FixedDate.now()}},seen:{},feedbackSeen:{}};
  const learned=loadPrediction({station,model});
  const withHistory=learned.v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  assert.equal(withHistory.score,plain.score);
  assert.equal(learned.v3.historicalSignal(learned.trains,row,new FixedDate('2026-08-12T12:00:00Z'),station).amount,0);
});

test('passenger feedback stored in the legacy profile cannot leak into Forecast v3',()=>{
  const station={name:'Test Station',crs:'ZZZ'};
  const row=service({origin:[{locationName:'Test Station',crs:'ZZZ'}]});
  const none=loadPrediction({station,model:{version:2,profiles:{},seen:{},feedbackSeen:{}}});
  const expected=none.v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  const key='zzz|zz|bri|weekday|5';
  const model={version:2,profiles:{[key]:{samples:0,lengthSamples:0,avgLength:0,headwaySamples:0,feedbackCount:12,feedbackMean:4.45,updatedAt:FixedDate.now()}},seen:{},feedbackSeen:{}};
  const reported=loadPrediction({station,model});
  const actual=reported.v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  assert.equal(actual.score,expected.score);
  assert.ok(!actual.reasons.some(reason=>/feedback|reported crowding/i.test(reason)));
});

test('future timetable and same-day timetable retain the same static prediction',()=>{
  const station={name:'Test Station',crs:'ZZZ'};
  const {v3}=loadPrediction({station});
  const row=service();
  const today=v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  const future=v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-13T12:00:00Z')});
  assert.equal(future.score,today.score);
  assert.equal(future.label,today.label);
});

test('live delay, formation and route shape enrich the same row exactly once',()=>{
  const station={name:'Test Station',crs:'ZZZ'};
  const overlayServices=[{length:8},{length:8},{length:8}];
  const {trains,v3}=loadPrediction({station,overlayServices});
  const scheduled=service();
  const date=new FixedDate('2026-08-12T12:00:00Z');
  const before=v3.forecast(scheduled,0,[scheduled],{station,referenceDate:date});
  const live=service({etd:'10:20',length:4,liveEvidence:true,previousCallingPoints:[{callingPoint:[{crs:'AAA'},{crs:'AAB'},{crs:'AAC'},{crs:'AAD'},{crs:'AAE'},{crs:'AAF'}]}],subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}]});
  const after=v3.forecast(live,0,[live],{station,referenceDate:date});
  const liveAmount=v3.liveSignal(live,0,[live]).amount;
  const formationAmount=v3.formationSignal(trains,live,[live],date,station).amount;
  const shapeDelta=v3.journeyShapeSignal(live,station).amount-v3.journeyShapeSignal(scheduled,station).amount;
  const expectedDelta=liveAmount+formationAmount+shapeDelta;
  assert.ok(Math.abs((after.score-before.score)-expectedDelta)<1e-9,{before,after,expectedDelta});
  assert.equal(after.reasons.filter(reason=>/delay/i.test(reason)).length,1);
  assert.equal(after.reasons.filter(reason=>/formation/i.test(reason)).length,1);
});

test('cancellation knock-on ignores an unrelated destination on the station board',()=>{
  const {v3}=loadPrediction();
  const current=service({std:'10:00'});
  const unrelated=service({std:'09:45',destination:[{crs:'CDF'}],isCancelled:true});
  const related=service({std:'09:45',destination:[{crs:'BRI'}],isCancelled:true});
  assert.equal(v3.cancellationKnockOn(current,1,[unrelated,current]).amount,0);
  assert.ok(v3.cancellationKnockOn(current,1,[related,current]).amount>0);
});

test('Friday and weekend demand are not added a second time by the v3 calendar layer',()=>{
  const {v3}=loadPrediction();
  const friday=v3.calendarSignal(new FixedDate('2026-08-14T12:00:00Z'),16*60);
  const saturday=v3.calendarSignal(new FixedDate('2026-08-15T12:00:00Z'),12*60);
  assert.equal(friday.amount,0);
  assert.equal(saturday.amount,0);
});

test('Forecast v3 explicitly requests the de-duplicated baseline',()=>{
  const station={name:'Test Station',crs:'ZZZ'};
  const {trains,v3}=loadPrediction({station});
  let seen=null;
  const real=trains.crowdingForecast;
  trains.crowdingForecast=(service,index,services,options)=>{seen=options;return real(service,index,services,options);};
  const row=service();
  v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  assert.equal(seen.modelLayer,'v3-baseline');
  assert.equal(seen.includeFeedback,false);
});

test('scheduled destination arrival drives event pressure before live calling points exist',()=>{
  const events=loadEvents();
  const row={std:'13:00',arrival:'14:30'};
  assert.equal(events.serviceArrival(row,'BRI'),14*60+30);
  const match=events.relevance(
    {title:'Bristol event',place:'Bristol',start:16*60,end:18*60,attendance:30000,confidence:.9},
    row,
    {origin:'Birmingham New Street',destination:'Bristol Temple Meads',destinationCrs:'BRI'}
  );
  assert.ok(match&&match.nearDest,{match});
  assert.ok(match.amount>0);
});

test('live expected destination arrival overrides the scheduled timetable arrival',()=>{
  const events=loadEvents();
  const row={arrival:'14:30',subsequentCallingPoints:[{callingPoint:[{crs:'BRI',et:'15:10',st:'14:30'}]}]};
  assert.equal(events.serviceArrival(row,'BRI'),15*60+10);
});

test('midnight expected arrival remains a valid zero-minute value',()=>{
  const events=loadEvents();
  const row={subsequentCallingPoints:[{callingPoint:[{crs:'BRI',et:'00:00',st:'23:59'}]}]};
  assert.equal(events.serviceArrival(row,'BRI'),0);
});
