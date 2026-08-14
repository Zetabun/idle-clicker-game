import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const source=await fs.readFile(path.join(root,'kerbside-rail-health.js'),'utf8');

function load({windowExtras={},elements={}}={}){
  const document={
    readyState:'loading',
    addEventListener(){},
    getElementById(id){return elements[id]||null;},
    querySelector(){return null;},
    head:{appendChild(){}},
    documentElement:null,
    createElement(){return {dataset:{},querySelector(){return null;},setAttribute(){},appendChild(){},style:{}};}
  };
  const context={
    window:{...windowExtras},document,console,URL,Date,Intl,Map,Set,Response,AbortController,
    CustomEvent:class{},setTimeout,clearTimeout,setInterval(){return 1;},clearInterval(){},
    fetch:async()=>{throw new Error('network not expected');}
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  return context.window.__KERBSIDE_RAIL_HEALTH__;
}

test('fresh complete timetable coverage is healthy',()=>{
  const api=load({elements:{trainTravelDate:{value:'2026-08-14'},trainDepartAfter:{value:'12:00'}}});
  const d=new Date();
  const id=`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}${String(d.getUTCHours()).padStart(2,'0')}${String(d.getUTCMinutes()).padStart(2,'0')}00`;
  const value=api.timetableHealth({timetableId:id,dates:['2026-08-14'],coverage:{'2026-08-14':{from:'00:01',to:'23:59',partial:false}}});
  assert.equal(value.status,'healthy');
  assert.equal(value.coverage.partial,false);
});

test('partial edge coverage is degraded and records whether selected time is outside',()=>{
  const api=load();
  const value=api.coverageState({dates:['2026-08-15'],coverage:{'2026-08-15':{from:'00:01',to:'07:54',partial:true}}},'2026-08-15','12:00');
  assert.equal(value.status,'degraded');
  assert.equal(value.inside,false);
  assert.match(value.detail,/outside coverage/);
});

test('station data distinguishes local index from Huxley fallback',()=>{
  let api=load({windowExtras:{__KERBSIDE_STATION_DATA__:{state:{source:'local',count:2580,searches:4,fallbacks:0,error:''}}}});
  assert.equal(api.stationHealth().status,'healthy');
  api=load({windowExtras:{__KERBSIDE_STATION_DATA__:{state:{source:'fallback',count:0,searches:0,fallbacks:1,error:'404'}}}});
  assert.equal(api.stationHealth().status,'degraded');
});

test('live health distinguishes official Darwin, fallback and outage',()=>{
  let api=load({windowExtras:{__KERBSIDE_TRAIN_LIVE_WINDOW__:{state:{source:'official',officialStatus:200,attempts:[{provider:'rdm',status:200}]}}}});
  assert.equal(api.liveHealth({track:false}).status,'healthy');

  api=load({windowExtras:{__KERBSIDE_TRAIN_LIVE_WINDOW__:{state:{source:'community-fallback',lastProvider:'https://huxley2.azurewebsites.net',attempts:[{provider:'rdm',status:504,timedOut:true},{provider:'huxley',status:200}]}}}});
  const fallback=api.liveHealth({track:false});
  assert.equal(fallback.status,'degraded');
  assert.equal(fallback.timeoutCount,1);

  api=load({windowExtras:{__KERBSIDE_TRAIN_LIVE_WINDOW__:{state:{source:'unavailable',lastFailure:'all failed',attempts:[{status:503}]}}}});
  assert.equal(api.liveHealth({track:false}).status,'down');
});

test('overlay stats report scheduled services receiving live evidence',()=>{
  const services=[
    {serviceID:'a',liveEvidence:true},
    {serviceID:'b',liveEvidence:false},
    {serviceID:'c',liveOnly:true,liveEvidence:true}
  ];
  const overlay={
    state:{status:'ready',services:[{},{}],onwardIndexes:new Map()},
    matchEntry(row){return row.serviceID==='a'?{entry:{index:0},via:'rid'}:null;},
    matchEntryIn(){return null;}
  };
  const api=load({windowExtras:{__KERBSIDE_TRAIN_TIMETABLE__:{state:{mode:'today',services}},__KERBSIDE_TRAIN_OVERLAY__:overlay}});
  const stats=api.overlayStats();
  assert.equal(stats.scheduledServices,2);
  assert.equal(stats.servicesWithLiveEvidence,1);
  assert.equal(stats.liveOnlyServices,1);
  assert.equal(stats.matchedOriginServices,1);
  assert.equal(stats.evidenceRate,0.5);
});

test('live outage degrades overall rail health while timetable outage is hard down',()=>{
  const api=load();
  const degraded=api.overallHealth({timetable:{status:'healthy'},stationData:{status:'healthy'},live:{status:'down'},overlay:{status:'degraded'}});
  assert.equal(degraded.status,'degraded');
  const down=api.overallHealth({timetable:{status:'down'},stationData:{status:'healthy'},live:{status:'healthy'},overlay:{status:'healthy'}});
  assert.equal(down.status,'down');
});
