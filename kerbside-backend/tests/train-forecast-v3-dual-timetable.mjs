import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const trainsSource=await fs.readFile(path.join(root,'kerbside-trains.js'),'utf8');
const forecastSource=await fs.readFile(path.join(root,'kerbside-train-forecast-v4.js'),'utf8');
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

function loadEvents({fetchImpl=null,store=null}={}){
  const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_FORECAST_V3__:{apply(){}}};
  const context={window,document:documentStub,Date:FixedDate,Intl,console,localStorage:store||storage(),setTimeout,clearTimeout,AbortController,fetch:fetchImpl||(async()=>{throw new Error('network not expected');})};
  vm.createContext(context);
  vm.runInContext(eventsSource,context);
  return context.window.__KERBSIDE_EVENTS__;
}

function service(overrides={}){
  return {std:'10:00',etd:'',operator:'Test Rail',operatorCode:'ZZ',length:0,isCancelled:false,scheduledOnly:true,origin:[{locationName:'Earlier Town',crs:'AAA'}],destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],...overrides};
}

test('Forecast v4 and v2 share the same two-hour profile key and real-terminus identity',()=>{
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

test('passenger feedback stored in the legacy profile cannot leak into Forecast v4',()=>{
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

test('Forecast v4 explicitly requests the de-duplicated baseline',()=>{
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

test('OpenFootball Football.TXT parser inherits kick-off times and season years',()=>{
  const events=loadEvents();
  const rows=events.parseFootballText(`= English Championship 2026/27
  Sat Aug 29 2026
    15:00  Norwich City FC         v Burnley FC
           Bristol City FC         v Portsmouth FC
  Fri Jan 1 2027
    12:00  Bristol City FC         v West Ham United FC
  Sat Jan 16
    12:00  Bristol City FC         v Norwich City FC
`,'2026-27');
  const plain=JSON.parse(JSON.stringify(rows));
  assert.deepEqual(plain,[
    {date:'2026-08-29',time:'15:00',team1:'Norwich City FC',team2:'Burnley FC'},
    {date:'2026-08-29',time:'15:00',team1:'Bristol City FC',team2:'Portsmouth FC'},
    {date:'2027-01-01',time:'12:00',team1:'Bristol City FC',team2:'West Ham United FC'},
    {date:'2027-01-16',time:'12:00',team1:'Bristol City FC',team2:'Norwich City FC'}
  ]);
});

test('current-season Football.TXT supplies Bristol City when football.json has not rolled over',async()=>{
  const calls=[];
  const championship=`= English Championship 2026/27
  Sat Aug 29 2026
    15:00  Norwich City FC         v Burnley FC
           Bristol City FC         v Portsmouth FC
`;
  const fetchImpl=async url=>{
    calls.push(String(url));
    if(String(url).endsWith('/2026-27/2-championship.txt'))return {ok:true,status:200,text:async()=>championship};
    if(String(url).endsWith('/2026-27/1-premierleague.txt'))return {ok:true,status:200,text:async()=>'= English Premier League 2026/27\n'};
    return {ok:false,status:404,json:async()=>({}),text:async()=>''};
  };
  const events=loadEvents({fetchImpl});
  const rows=await events.footballEventsFor('2026-08-29');
  const bristol=rows.find(item=>/Bristol City FC v Portsmouth FC/.test(item.title));
  assert.ok(bristol,{rows,calls});
  assert.equal(bristol.place,'Bristol');
  assert.equal(bristol.startTime,'15:00');
  assert.equal(bristol.type,'football');
  assert.ok(!calls.some(url=>url.includes('/2025-26/')),{calls});
});

test('football pressure tapers through the first hour after kick-off but not deep into the match',()=>{
  const events=loadEvents();
  const fixture={title:'Bristol City FC v Portsmouth FC',place:'Bristol',start:15*60,end:17*60+30,attendance:22950,confidence:.9,type:'football'};
  const journey={origin:'Birmingham New Street',destination:'Bristol Temple Meads',destinationCrs:'BRI'};
  const lateFirstHalf=events.relevance(fixture,{std:'14:12',arrival:'15:36'},journey);
  const deepIntoMatch=events.relevance(fixture,{std:'14:42',arrival:'16:07'},journey);
  assert.ok(lateFirstHalf&&lateFirstHalf.amount>=.16,{lateFirstHalf});
  assert.equal(deepIntoMatch,null);
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


test('event engine can score an interchange-specific connection leg',()=>{
  const events=loadEvents();
  events.setEvents([{title:'Cheltenham festival',place:'Cheltenham',startTime:'18:00',endTime:'20:00',attendance:30000,confidence:.9}],{date:'2026-08-12',sources:['test']});
  const row={std:'20:20',arrival:'20:50'};
  const result=events.pressureForJourney(row,{origin:'Cheltenham Spa',destination:'Gloucester',destinationCrs:'GLO'});
  assert.ok(result.amount>0,result);
  assert.match(result.reasons[0],/Cheltenham festival/);
});

test('Wikidata event query includes connection interchange cities',()=>{
  const events=loadEvents();
  const query=events.sparqlForJourney({origin:'Birmingham New Street',destination:'Gloucester',interchanges:['Cheltenham Spa'],date:'2026-08-12'}).toLowerCase();
  assert.match(query,/birmingham/);assert.match(query,/gloucester/);assert.match(query,/cheltenham/);
});

test('Forecast v4 forwards the exact leg geography to event pressure',()=>{
  const station={name:'Cheltenham Spa',crs:'CNM'},loaded=loadPrediction({station});let seen=null;
  loaded.context.window.__KERBSIDE_EVENTS__={state:{date:'2026-08-12'},pressureForJourney(row,journey){seen=journey;return {amount:.5,reasons:['interchange event pressure']};}};
  const row=service({std:'11:00',arrival:'11:32',origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}]});
  const result=loaded.v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z'),eventJourney:{origin:'Cheltenham Spa',destination:'Gloucester',destinationCrs:'GLO'}});
  assert.deepEqual({...seen},{origin:'Cheltenham Spa',destination:'Gloucester',destinationCrs:'GLO'});
  assert.equal(result.eventPressure,.5);assert.ok(result.reasons.some(reason=>/interchange event pressure/i.test(reason)));
});


test('connection displacement raises only the recovery-train context',()=>{
  const station={name:'Cheltenham Spa',crs:'CNM'},loaded=loadPrediction({station});
  const row=service({std:'11:20',origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}]});
  const date=new FixedDate('2026-08-12T12:00:00Z');
  const plain=loaded.v3.forecast(row,0,[row],{station,referenceDate:date});
  const displaced=loaded.v3.forecast(row,0,[row],{station,referenceDate:date,connectionDisplacement:.45});
  assert.ok(displaced.score>plain.score,{plain,displaced});
  assert.ok(displaced.reasons.some(reason=>/missed-connection passengers/i.test(reason)));
  assert.equal(loaded.v3.connectionDisplacementSignal({connectionDisplacement:0}).amount,0);
});
