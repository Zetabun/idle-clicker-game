import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(here,'..','..');
const timetableSource=await fs.readFile(path.join(repoRoot,'kerbside-train-timetable.js'),'utf8');
const manifest={
  schema:1,source:'National Rail Darwin Timetable Files',timetableId:'20260811020500',
  dates:['2026-08-12'],coverage:{'2026-08-12':{from:'00:01',to:'23:59',partial:false}},
  tocNames:{XC:'CrossCountry'}
};
const locations={BHM:['Birmingham New Street','BHAMNWS',''],BRI:['Bristol Temple Meads','BRSTLTM',''],PLY:['Plymouth','PLYMTH',''],CNM:['Cheltenham Spa','CHLTNHM',''],GLO:['Gloucester','GLOSTER','']};
const rows=[
  ['rid-1','uid-1','1A01','XC','2026-08-12',[["BHM","","09:12","11",0],["BRI","10:33","10:35","3",0],["PLY","12:20","","",0]]],
  ['rid-2','uid-2','1A02','XC','2026-08-12',[["BHM","","08:42","10",0],["BRI","10:02","10:04","4",0],["PLY","11:50","","",0]]],
  ['rid-change-a','uid-change-a','1C10','XC','2026-08-12',[["BHM","","09:05","8",0],["CNM","09:45","","2",0]]],
  ['rid-change-tight','uid-change-tight','1G01','XC','2026-08-12',[["CNM","","09:52","4",0],["GLO","10:25","","1",0]]],
  ['rid-change-b','uid-change-b','1G02','XC','2026-08-12',[["CNM","","10:00","4",0],["GLO","10:32","","1",0]]],
  ['rid-change-recovery','uid-change-recovery','1G03','XC','2026-08-12',[["CNM","","10:20","5",0],["GLO","10:52","","2",0]]]
];
const gz=gzipSync(Buffer.from(JSON.stringify(rows)));

function responseFor(input){
  const url=String(input);
  if(url.endsWith('/manifest.json'))return new Response(JSON.stringify(manifest),{status:200,headers:{'Content-Type':'application/json'}});
  if(url.endsWith('/locations.json'))return new Response(JSON.stringify(locations),{status:200,headers:{'Content-Type':'application/json'}});
  if(url.endsWith('/2026-08-12.json.gz'))return new Response(gz,{status:200,headers:{'Content-Type':'application/gzip'}});
  return new Response('not found',{status:404});
}

function loadProvider(date='2026-08-12',departAfter='09:00',officialConnectionTimes=null){
  const context={
    console,URL,Date,Intl,setTimeout,clearTimeout,setInterval(){return 0;},Blob,Response,TextDecoder,DecompressionStream,
    fetch:async input=>responseFor(input),
    document:{readyState:'loading',addEventListener(){},getElementById(id){return id==='trainDepartAfter'?{value:departAfter}:null;}},
    window:{__KERBSIDE_TRAIN_DATE__:{state:{date},isToday(){return false;}},__KERBSIDE_OFFICIAL_CONNECTION_TIMES__:officialConnectionTimes||undefined}
  };
  vm.createContext(context);
  vm.runInContext(timetableSource,context);
  return context.window.__KERBSIDE_TIMETABLE_PROVIDER__;
}

test('Darwin timetable provider exposes snapshot coverage',async()=>{
  const provider=loadProvider();
  const value=await provider.getCoverage();
  assert.equal(value.source,'National Rail Darwin Timetable Files');
  assert.equal(value.timetableId,'20260811020500');
  assert.deepEqual({...value.coverage['2026-08-12']},{from:'00:01',partial:false,to:'23:59'});
});

test('direct services use schedule calls and respect depart-after',async()=>{
  const provider=loadProvider();
  const services=await provider.getServices({from:'BHM',to:'BRI',date:'2026-08-12',departAfter:'09:00'});
  assert.equal(services.length,1);
  assert.equal(services[0].std,'09:12');
  assert.equal(services[0].arrival,'10:33');
  assert.equal(services[0].operator,'CrossCountry');
  assert.equal(services[0].routeDestination.crs,'BRI');
  assert.equal(services[0].serviceTerminus.crs,'PLY');
  assert.equal(services[0].scheduledOnly,true);
});


test('one-change journeys use a conservative same-station interchange buffer',async()=>{
  const provider=loadProvider();
  const services=await provider.getServices({from:'BHM',to:'GLO',date:'2026-08-12',departAfter:'09:00'});
  assert.equal(services.length,1);
  const journey=services[0];
  assert.equal(journey.journeyType,'connection');
  assert.equal(journey.changes,1);
  assert.equal(journey.interchange.crs,'CNM');
  assert.equal(journey.connectionMinutes,15);
  assert.equal(journey.minimumConnectionMinutes,10);
  assert.equal(journey.legs[0].std,'09:05');
  assert.equal(journey.legs[0].arrival,'09:45');
  assert.equal(journey.legs[1].std,'10:00');
  assert.equal(journey.arrival,'10:32');
  assert.equal(journey.legs.some(leg=>leg.serviceID==='rid-change-tight'),false,'7-minute change must be rejected');
  assert.equal(journey.recoveryOptions.length,1);
  assert.equal(journey.recoveryOptions[0].serviceID,'rid-change-recovery');
  assert.equal(journey.recoveryOptions[0].std,'10:20');
  assert.ok(journey.journeyLabels.includes('Fastest'));
  assert.ok(journey.journeyLabels.includes('Best connection'));
});

test('connection buffer status distinguishes safe, tight and at-risk changes',()=>{
  const provider=loadProvider();
  assert.equal(provider.connectionMinimum('CNM'),10);
  assert.equal(provider.connectionMinimum('BHM'),15);
  assert.deepEqual({...provider.connectionMinimumInfo('CNM')},{minutes:10,source:'kerbside-topology',authority:'',dataset:'',asOf:''});
  assert.equal(provider.connectionRiskFor(18,10),'good');
  assert.equal(provider.connectionRiskFor(12,10),'tight');
  assert.equal(provider.connectionRiskFor(8,10),'at-risk');
});

test('authoritative station minima can be supplied with provenance without changing the fallback dataset',()=>{
  const provider=loadProvider('2026-08-12','09:00',{CNM:{minutes:8,authority:'Licensed MCT fixture',dataset:'station-mct',asOf:'2026-08-12'}});
  assert.deepEqual({...provider.connectionMinimumInfo('CNM')},{minutes:8,source:'official',authority:'Licensed MCT fixture',dataset:'station-mct',asOf:'2026-08-12'});
  assert.deepEqual({...provider.connectionMinimumInfo('BHM')},{minutes:15,source:'kerbside-topology',authority:'',dataset:'',asOf:''});
});

test('out-of-snapshot dates fail closed',async()=>{
  const provider=loadProvider('2026-08-14','00:00');
  const services=await provider.getServices({from:'BHM',to:'BRI',date:'2026-08-14',departAfter:'00:00'});
  assert.deepEqual(Array.from(services),[]);
});

function loadPriorityRuntime({today=true,liveMode='planning',departAfter='10:00'}={}){
  const calls={refresh:0,start:0,stop:0,clear:0};
  const from={name:'Birmingham New Street',crs:'BHM'};
  const to={name:'Bristol Temple Meads',crs:'BRI'};
  const overlay={
    state:{status:'idle',crs:'',date:''},
    refresh(){calls.refresh++;return Promise.resolve(true);},
    start(){calls.start++;},stop(){calls.stop++;},clear(){calls.clear++;},messages(){return[];}
  };
  const context={
    console,URL,Date,Intl,setTimeout,clearTimeout,setInterval(){return 0;},Blob,Response,TextDecoder,DecompressionStream,
    fetch:async input=>responseFor(input),
    document:{readyState:'loading',addEventListener(){},getElementById(id){return id==='trainDepartAfter'?{value:departAfter}:null;}},
    window:{
      __KERBSIDE_TRAIN_DATE__:{state:{date:'2026-08-12'},isToday(){return today;}},
      __KERBSIDE_TRAINS__:{state:{station:from}},
      __KERBSIDE_TRAIN_ROUTES__:{state:{destination:to}},
      __KERBSIDE_TRAIN_LIVE_WINDOW__:{liveWindowFor(){return {mode:liveMode};}},
      __KERBSIDE_TRAIN_OVERLAY__:overlay
    }
  };
  vm.createContext(context);
  vm.runInContext(timetableSource,context);
  return {api:context.window.__KERBSIDE_TRAIN_TIMETABLE__,calls};
}

test('same-day journey claims the timetable before the manifest is cached',()=>{
  const {api}=loadPriorityRuntime({today:true,liveMode:'planning'});
  assert.equal(api.state.manifest,null);
  assert.equal(api.journeyMode(),'today');
});

test('same-day services outside the live window stay timetable-only',()=>{
  const {api,calls}=loadPriorityRuntime({today:true,liveMode:'planning'});
  api.state.mode='today';
  assert.equal(api.requestOverlay(),false);
  assert.equal(calls.refresh,0);
  assert.equal(calls.start,0);
  assert.equal(calls.stop,1);
  assert.equal(calls.clear,1);
});

test('same-day services inside the live window prioritise the live overlay',()=>{
  const {api,calls}=loadPriorityRuntime({today:true,liveMode:'live'});
  api.state.mode='today';
  assert.equal(api.requestOverlay(),true);
  assert.equal(calls.refresh,1);
  assert.equal(calls.start,1);
  assert.equal(calls.stop,0);
  assert.equal(calls.clear,0);
});


test('partial edge coverage distinguishes a missing future window from no trains',()=>{
  const {api}=loadPriorityRuntime({today:false,liveMode:'planning',departAfter:'12:15'});
  assert.equal(api.coverageIncludesTime({from:'00:01',to:'07:54',partial:true},'07:30'),true);
  assert.equal(api.coverageIncludesTime({from:'00:01',to:'07:54',partial:true},'12:15'),false);
  assert.equal(api.coverageIncludesTime({from:'00:01',to:'23:59',partial:false},'23:30'),true);
});


test('future timetable rows expose their selected travel date while same-day rows do not',()=>{
  const {api}=loadPriorityRuntime({today:false,liveMode:'planning',departAfter:'09:00'});
  const future=api.serviceDateLabel('advance','2026-08-13');
  assert.match(future,/13 Aug/);
  assert.match(future,/Thu/);
  assert.equal(api.serviceDateLabel('today','2026-08-13'),'');
});


test('connection quality rejects literal network backtracking',()=>{
  const provider=loadProvider();
  const first=['a','a','a','XC','2026-08-12',[["BHM","","09:00","",0],["AAA","09:20","09:21","",0],["CNM","09:40","","",0]]];
  const second=['b','b','b','XC','2026-08-12',[["CNM","","09:55","",0],["AAA","10:10","10:11","",0],["GLO","10:30","","",0]]];
  const graph=provider.buildStationGraph([first,second]);
  const value=provider.connectionRouteQuality(first,0,2,second,0,2,graph,provider.shortestNetworkStops(graph,'BHM','GLO'));
  assert.equal(value.reject,true);assert.match(value.reason,/backtracks/);
});

test('timetable topology adds extra transfer time at a highly connected hub',()=>{
  const provider=loadProvider(),rows=[];
  for(let i=0;i<12;i++)rows.push([`r${i}`,`u${i}`,`t${i}`,'XC','2026-08-12',[["HUB","","09:00","",0],[`X${String(i).padStart(2,'0')}`,"09:10","","",0]]]);
  const graph=provider.buildStationGraph(rows);assert.equal(graph.get('HUB').size,12);assert.equal(provider.connectionMinimum('HUB',graph),15);
});
