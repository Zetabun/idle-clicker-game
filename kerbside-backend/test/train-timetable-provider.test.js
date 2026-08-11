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
const locations={BHM:['Birmingham New Street','BHAMNWS',''],BRI:['Bristol Temple Meads','BRSTLTM',''],PLY:['Plymouth','PLYMTH','']};
const rows=[
  ['rid-1','uid-1','1A01','XC','2026-08-12',[["BHM","","09:12","11",0],["BRI","10:33","10:35","3",0],["PLY","12:20","","",0]]],
  ['rid-2','uid-2','1A02','XC','2026-08-12',[["BHM","","08:42","10",0],["BRI","10:02","10:04","4",0],["PLY","11:50","","",0]]]
];
const gz=gzipSync(Buffer.from(JSON.stringify(rows)));

function responseFor(input){
  const url=String(input);
  if(url.endsWith('/manifest.json'))return new Response(JSON.stringify(manifest),{status:200,headers:{'Content-Type':'application/json'}});
  if(url.endsWith('/locations.json'))return new Response(JSON.stringify(locations),{status:200,headers:{'Content-Type':'application/json'}});
  if(url.endsWith('/2026-08-12.json.gz'))return new Response(gz,{status:200,headers:{'Content-Type':'application/gzip'}});
  return new Response('not found',{status:404});
}

function loadProvider(date='2026-08-12',departAfter='09:00'){
  const context={
    console,URL,Date,Intl,setTimeout,clearTimeout,setInterval(){return 0;},Blob,Response,TextDecoder,DecompressionStream,
    fetch:async input=>responseFor(input),
    document:{readyState:'loading',addEventListener(){},getElementById(id){return id==='trainDepartAfter'?{value:departAfter}:null;}},
    window:{__KERBSIDE_TRAIN_DATE__:{state:{date},isToday(){return false;}}}
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

test('out-of-snapshot dates fail closed',async()=>{
  const provider=loadProvider('2026-08-14','00:00');
  const services=await provider.getServices({from:'BHM',to:'BRI',date:'2026-08-14',departAfter:'00:00'});
  assert.deepEqual(Array.from(services),[]);
});
