#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

def write(path,content):
    (ROOT/path).write_text(content,encoding='utf-8')

temporal=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..','..');
const [trainsSource,timebandsSource,demandSource,odmSource,calibrationSource,forecastSource]=await Promise.all([
  fs.readFile(path.join(root,'kerbside-trains.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-rail-timebands.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-rail-demand-v4.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-orr-odm-2024-25.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-rail-calibration.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-train-forecast-v4.js'),'utf8')
]);
class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-08-12T08:00:00Z']));}static now(){return new Date('2026-08-12T08:00:00Z').getTime();}}
function storage(){const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
const document={readyState:'loading',addEventListener(){},getElementById(){return null;},createElement(){return {innerHTML:'',textContent:''};}};
function load(){const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_TRAIN_OVERLAY__:{state:{services:[]}}};const context={window,document,Date:FixedDate,Intl,console,localStorage:storage(),setTimeout,clearTimeout,setInterval,clearInterval,AbortController,Blob,Response,TextDecoder,DecompressionStream,requestAnimationFrame(){return 1;},MutationObserver:class{observe(){}disconnect(){}},atob};vm.createContext(context);vm.runInContext(trainsSource,context);vm.runInContext(timebandsSource,context);vm.runInContext(demandSource,context);vm.runInContext(odmSource,context);vm.runInContext(calibrationSource,context);vm.runInContext(forecastSource,context);return context;}

test('bundled ORR ODM is licensed, symmetric and sparse-safe',()=>{const c=load(),f=c.window.__KERBSIDE_ORR_ODM__;assert.equal(f.authority,'Office of Rail and Road');assert.equal(f.period,'2024-25');assert.equal(f.licence,'Open Government Licence v3.0');assert.equal(f.commercialUse,true);assert.equal(f.completeMatrix,false);assert.equal(f.directionality,'bidirectional-station-pair');assert.equal(f.sourceSha256,'07d41e44884911c48929e844ee51f0c5ef66f861842d36564bb89a3b29bdfd79');assert.ok(f.coverageJourneyShare>.988);assert.equal(f.flow('BHM','BRI'),76929);assert.equal(f.flow('BRI','BHM'),76929);assert.equal(f.flow('CHL','BHM'),undefined);assert.equal(f.stationTotal('BHM'),18311855);});

test('ODM route load follows the actual calling pattern and omitted pairs remain unknown',()=>{const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__,feed=c.window.__KERBSIDE_ORR_ODM__;const route=cal.routeLoadSignal({destination:[{crs:'BRI'}],subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}],previousCallingPoints:[]},{crs:'BHM'});assert.equal(route.source,'orr-odm');assert.equal(route.measured,true);assert.ok(route.boardShare>0);assert.equal(cal.odmFlow(feed,'CHL','BHM'),null);});

test('DfT operator, capacity and utilisation evidence is weekday and bank-holiday gated',()=>{const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__,station={name:'Birmingham New Street',crs:'BHM'},service={operator:'CrossCountry',operatorCode:'XC'},wed=new FixedDate('2026-08-12T08:00:00Z'),sat=new FixedDate('2026-08-15T08:00:00Z');assert.equal(cal.operatorCrowdingSignal(service,station,480,wed,false).measured,true);assert.equal(cal.peakCapacitySignal(station,480,wed,false).measured,true);assert.ok(cal.utilisationPrior(service,station,480,wed,false));assert.equal(cal.operatorCrowdingSignal(service,station,480,sat,false).measured,false);assert.equal(cal.peakCapacitySignal(station,480,sat,false).measured,false);assert.equal(cal.utilisationPrior(service,station,480,sat,false),null);assert.equal(cal.operatorCrowdingSignal(service,station,480,wed,true).measured,false);assert.equal(cal.peakCapacitySignal(station,480,wed,true).measured,false);assert.equal(cal.utilisationPrior(service,station,480,wed,true),null);assert.equal(cal.demandShape(station,480,wed,true).amount,0);assert.equal(cal.serviceClassSignal(service,station,480,wed,true).amount,0);});

test('DfT peak boundaries do not leak into adjacent minutes',()=>{const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__,station={name:'Birmingham New Street',crs:'BHM'},service={operator:'CrossCountry',operatorCode:'XC'},date=new FixedDate('2026-08-12T08:00:00Z');for(const [minute,expected] of [[419,false],[420,true],[599,true],[600,false],[959,false],[960,true],[1139,true],[1140,false]])assert.equal(cal.operatorCrowdingSignal(service,station,minute,date,false).measured,expected,String(minute));});

test('live DfT calibration follows expected time across a band while future planning stays scheduled',()=>{const c=load(),trains=c.window.__KERBSIDE_TRAINS__,v4=c.window.__KERBSIDE_FORECAST_V4__,station={name:'Birmingham New Street',crs:'BHM'},service={std:'09:55',etd:'10:05',operator:'CrossCountry',operatorCode:'XC',length:0,isCancelled:false,scheduledOnly:true,origin:[{crs:'BHM'}],destination:[{crs:'BRI'}],displayDestination:{crs:'BRI'},subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}],previousCallingPoints:[]},liveDate=new FixedDate('2026-08-12T08:00:00Z'),futureDate=new FixedDate('2026-08-20T08:00:00Z');trains.state.station=station;assert.equal(v4.dftMinuteForService(service,liveDate),605);assert.equal(v4.dftMinuteForService(service,futureDate),595);const live=v4.forecast(service,0,[service],{station,referenceDate:liveDate});assert.equal(live.utilisationPrior,null);});

test('bank-holiday forecasts do not reuse weekday DfT priors',()=>{const c=load(),trains=c.window.__KERBSIDE_TRAINS__,v4=c.window.__KERBSIDE_FORECAST_V4__,station={name:'Birmingham New Street',crs:'BHM'},date=new FixedDate('2026-08-31T08:00:00Z'),service={std:'08:15',etd:'',operator:'CrossCountry',operatorCode:'XC',length:0,isCancelled:false,scheduledOnly:true,origin:[{crs:'BHM'}],destination:[{crs:'BRI'}],displayDestination:{crs:'BRI'},subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}],previousCallingPoints:[]};trains.state.station=station;v4.state.bankHolidays.add('2026-08-31');const result=v4.forecast(service,0,[service],{station,referenceDate:date});assert.equal(v4.isBankHoliday(date),true);assert.equal(result.utilisationPrior,null);assert.equal(result.measuredBenchmark,null);});

test('ORR route evidence stays route-based while final forecasts vary by actual time',()=>{const c=load(),trains=c.window.__KERBSIDE_TRAINS__,v4=c.window.__KERBSIDE_FORECAST_V4__,cal=c.window.__KERBSIDE_CALIBRATION__,station={name:'Birmingham New Street',crs:'BHM'},date=new FixedDate('2026-08-12T12:00:00Z');trains.state.station=station;const base={operator:'CrossCountry',operatorCode:'XC',length:0,isCancelled:false,scheduledOnly:true,origin:[{crs:'BHM'}],destination:[{crs:'BRI'}],displayDestination:{crs:'BRI'},subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}],previousCallingPoints:[]},morning={...base,std:'08:15',etd:''},midday={...base,std:'13:00',etd:''};assert.equal(cal.routeLoadSignal(morning,station).amount,cal.routeLoadSignal(midday,station).amount);const a=v4.forecast(morning,0,[morning],{station,referenceDate:date}),b=v4.forecast(midday,0,[midday],{station,referenceDate:date});assert.notEqual(a.score,b.score);});
'''
write('kerbside-backend/test/train-forecast-v4-temporal-odm.test.mjs',temporal)

builder=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const execFileAsync=promisify(execFile),here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..','..'),builder=path.join(root,'.github','scripts','build-orr-odm.py'),header='Financial_Year,origin_tlc,destination_tlc,journeys\n';
async function build(rows){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kerbside-odm-'));const input=path.join(dir,'odm.csv'),output=path.join(dir,'odm.js');await fs.writeFile(input,header+rows);await execFileAsync('python3',[builder,input,output,'--threshold','100','--top-n','1']);const source=await fs.readFile(output,'utf8'),context={window:{},atob};vm.createContext(context);vm.runInContext(source,context);return {dir,feed:context.window.__KERBSIDE_ORR_ODM__};}
test('ODM builder canonicalises symmetric pairs, station totals and sparse misses',async t=>{const b=await build('20242025,AAA,BBB,250\n20242025,BBB,AAA,250\n20242025,AAA,CCC,5\n20242025,CCC,AAA,5\n');t.after(()=>fs.rm(b.dir,{recursive:true,force:true}));assert.equal(b.feed.flow('AAA','BBB'),250);assert.equal(b.feed.flow('BBB','AAA'),250);assert.equal(b.feed.flow('BBB','CCC'),undefined);assert.equal(b.feed.stationTotal('AAA'),255);assert.equal(b.feed.stationTotal('BBB'),250);assert.equal(b.feed.stationTotal('CCC'),5);assert.equal(b.feed.completeMatrix,false);});
test('ODM builder rejects asymmetric reverse rows',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kerbside-odm-bad-'));try{const input=path.join(dir,'bad.csv'),output=path.join(dir,'bad.js');await fs.writeFile(input,header+'20242025,AAA,BBB,250\n20242025,BBB,AAA,249\n');await assert.rejects(execFileAsync('python3',[builder,input,output]));}finally{await fs.rm(dir,{recursive:true,force:true});}});
'''
write('kerbside-backend/test/orr-odm-builder.test.mjs',builder)
print('Added Kerbside 0.9.7 temporal and ODM regressions')
