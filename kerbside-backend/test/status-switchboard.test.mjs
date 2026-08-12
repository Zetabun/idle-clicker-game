import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const source=await fs.readFile(path.join(root,'kerbside-status.js'),'utf8');

function load(){
  const document={
    readyState:'loading',
    addEventListener(){},
    getElementById(){return null;},
    querySelector(){return null;},
    querySelectorAll(){return[];},
    head:{appendChild(){}},
    createElement(){return {setAttribute(){},appendChild(){},append(){},addEventListener(){},style:{}};}
  };
  const context={window:{},document,console,URL,Date,Intl,setTimeout,clearTimeout,navigator:{geolocation:{}},localStorage:{setItem(){},removeItem(){}},fetch:async()=>{throw new Error('network not expected');}};
  vm.createContext(context);
  vm.runInContext(source,context);
  return context.window.__KERBSIDE_STATUS_SWITCHBOARD__;
}

test('edge-date health reports the selected time outside partial timetable coverage',()=>{
  const api=load();
  const manifest={dates:['2026-08-12','2026-08-13'],coverage:{'2026-08-13':{from:'00:01',to:'07:54',partial:true}}};
  const value=api.coverageHealth(manifest,'2026-08-13','12:15');
  assert.equal(value.status,'degraded');
  assert.match(value.detail,/outside the current edge-date coverage/);
});

test('complete timetable coverage is healthy',()=>{
  const api=load();
  const manifest={dates:['2026-08-13'],coverage:{'2026-08-13':{from:'00:01',to:'23:59',partial:false}}};
  assert.equal(api.coverageHealth(manifest,'2026-08-13','12:15').status,'healthy');
});

test('overall status only goes red for a critical failed dependency',()=>{
  const api=load();
  assert.equal(api.overallState([{critical:false,status:'down'},{critical:true,status:'healthy'}]).status,'degraded');
  assert.equal(api.overallState([{critical:true,status:'down'},{critical:false,status:'healthy'}]).status,'down');
  assert.equal(api.overallState([{critical:true,status:'healthy'},{critical:false,status:'standby'}]).status,'healthy');
});


test('retryable official rail HTTP failures are degraded rather than hard down',()=>{
  const api=load();
  assert.equal(api.liveRailProbeState(408),'degraded');
  assert.equal(api.liveRailProbeState(429),'degraded');
  assert.equal(api.liveRailProbeState(502),'degraded');
  assert.equal(api.liveRailProbeState(504),'degraded');
  assert.equal(api.liveRailProbeState(401),'down');
  assert.equal(api.liveRailProbeState(403),'down');
  assert.equal(api.liveRailProbeState(500),'down');
  assert.equal(api.liveRailProbeState(503),'down');
});


test('status history reports rolling local availability, failures and median latency',()=>{
  const api=load(),at=Date.now();
  api.recordHistory({id:'rdm-darwin',status:'healthy',latency:300},at-3000);
  api.recordHistory({id:'rdm-darwin',status:'degraded',latency:500},at-2000);
  api.recordHistory({id:'rdm-darwin',status:'down',latency:null},at-1000);
  const value=api.historySummary('rdm-darwin',at);
  assert.equal(value.samples,3);assert.equal(value.failures,1);assert.equal(value.degraded,1);assert.ok(Math.abs(value.availability-2/3)<1e-9);assert.equal(value.medianLatency,400);
});
