import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as playwright from 'playwright';

const ENGINE_NAME=process.env.KERBSIDE_BROWSER||'webkit';
const engine=playwright[ENGINE_NAME];
if(!engine||typeof engine.launch!=='function') throw new Error(`Unsupported browser engine: ${ENGINE_NAME}`);
console.log(`Journey identity regression engine: ${ENGINE_NAME}`);

const testsDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(testsDir,'..','..');
const busSource=await readFile(path.join(root,'bus.html'),'utf8');

assert.match(busSource,/function journeyDestinationAgreement\(rows,dest\)/);
assert.match(busSource,/journeyDestinationConflict/);
assert.match(busSource,/function setVehicleProgressIdentity\(v,evidence,inference,matchedRow\)/);
assert.match(busSource,/progressIdentityBlocked/);
assert.match(busSource,/Journey identity is updating\./);
assert.match(busSource,/>journey updating<\/span>/);
assert.match(busSource,/>match retained<\/span>/);
assert.doesNotMatch(busSource,/>GPS recovered<\/span>/);

const server=http.createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
    const relative=pathname==='/'?'bus.html':pathname.replace(/^\/+/, '');
    const target=path.resolve(root,relative);
    if(!target.startsWith(root+path.sep)&&target!==path.join(root,'bus.html')) throw new Error('outside root');
    const body=await readFile(target);
    const extension=path.extname(target);
    const type=extension==='.css'?'text/css; charset=utf-8':extension==='.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8';
    response.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
    response.end(body);
  }catch{
    response.writeHead(404,{'Content-Type':'text/plain'});
    response.end('Not found');
  }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const url=`http://127.0.0.1:${port}/bus.html`;

const browser=await engine.launch({headless:true});
try{
  const context=await browser.newContext({timezoneId:'Europe/London'});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_TEST__),null,{timeout:20000});

  const result=await page.evaluate(()=>{
    const api=window.__KERBSIDE_TEST__;
    const state=api.liveState;
    const saved={
      stop:state.stop,
      ttStop:state.ttStop,
      timetable:state.timetable,
      timetableSource:state.timetableSource,
      timetableFallback:state.timetableFallback,
      timetableRegion:state.timetableRegion,
      timetableRun:state.timetableRun,
      dir:state.dir,
      destFilter:state.destFilter
    };
    const now=Date.now();
    const stop={id:'BRIGHTSTONE',timetableId:'BRIGHTSTONE',source:'official',name:'Brightstone Road',lat:52.45,lon:-1.96};
    const parts=api.ukDateTimeParts(new Date(now));
    const minuteNow=Number(parts.hour)*60+Number(parts.minute);
    const minuteAt=delta=>((minuteNow+delta)%1440+1440)%1440;
    const rawRow=(delta,line,head,trip,originDelta)=>[
      minuteAt(delta),line,head,'','',trip,'','','',10,minuteAt(originDelta)
    ];
    try{
      state.stop=stop;
      state.ttStop={id:'BRIGHTSTONE',d:[
        rawRow(20,'61','Digbeth Moor Street Queensway','INBOUND',-25),
        rawRow(40,'61','Frankley Arden Road Terminus','OUTBOUND',10)
      ]};
      state.timetable={services:{},tripPatterns:{},patterns:{}};
      state.timetableSource='national';
      state.timetableFallback=false;
      state.timetableRegion='west_midlands';
      state.timetableRun=Number(state.timetableRun||0)+1;
      state.dir='all';
      state.destFilter=null;

      const rows=api.timetableRows(new Date(now));
      const nearest=(trip)=>rows.filter(row=>row.trip===trip).sort((a,b)=>Math.abs(a.at-now)-Math.abs(b.at-now))[0];
      const outbound=nearest('OUTBOUND');
      if(!outbound) throw new Error('OUTBOUND timetable row did not materialise');

      const baseVehicle={
        id:'61-turnaround',line:'61',lineRef:'61',owner:'',operator:'',
        dest:'Digbeth Moor Street Queensway',journey:'OUTBOUND',
        lat:52.46,lon:-1.95,bearing:90,ts:now-180000,hist:[],speed:null,cadence:20
      };
      const exactConflict=api.routeEvidence('61',baseVehicle.dest,'OUTBOUND',baseVehicle);
      const originConflict=api.routeEvidence('61',baseVehicle.dest,'',{...baseVehicle,journey:'',aimedOriginAt:outbound.originAt});
      const compatibleExact=api.routeEvidence('61','Frankley Arden Road Terminus','OUTBOUND',{...baseVehicle,dest:'Frankley Arden Road Terminus'});
      const destinationMissing=api.routeEvidence('61','','OUTBOUND',{...baseVehicle,dest:''});

      const agreementConflict=api.journeyDestinationAgreement([{head:'Frankley Arden Road Terminus'}],'Digbeth Moor Street Queensway');
      const agreementCompatible=api.journeyDestinationAgreement([{head:'Digbeth Moor Street Queensway'}],'Moor Street Queensway');

      const matchedInput={...baseVehicle,vehicleRef:'BUS-740',vehicleUniqueId:'',journey:'OPAQUE-SIRI-JOURNEY',sourceTs:now-1000,ts:now-1000};
      const matchedCount=api.applyMatchedIdentities([matchedInput],[{vehicleId:'BUS-740',tripId:'OUTBOUND',routeId:'R61',lat:baseVehicle.lat,lon:baseVehicle.lon,timestamp:now-1000}],now);
      const matchedRealtime=api.routeEvidence('61',matchedInput.dest,api.vehicleJourneyRef(matchedInput),matchedInput);
      const stickyIncoming={...baseVehicle,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};
      const stickyPrev={...baseVehicle,matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedTripAt:now-30000,matchSource:'gtfs-rt'};
      const stickyRetained=api.retainMatchedIdentity(stickyPrev,stickyIncoming,now);
      const expiredIncoming={...baseVehicle};
      const stickyExpired=api.retainMatchedIdentity({...stickyPrev,matchedTripAt:now-4*60*1000},expiredIncoming,now);

      const blockedVehicle={journey:'OUTBOUND',corridorTrip:''};
      api.setVehicleProgressIdentity(blockedVehicle,{journeyDestinationConflict:true,matchedTrip:''},null,null);
      const blockedProgress={blocked:blockedVehicle.progressIdentityBlocked,trip:blockedVehicle.progressTrip,pattern:blockedVehicle.progressPattern};

      const inferredVehicle={journey:'OUTBOUND',corridorTrip:''};
      api.setVehicleProgressIdentity(inferredVehicle,{journeyDestinationConflict:true,matchedTrip:''},{patternId:'SAFE-INBOUND-PATTERN'},null);
      const inferredProgress={blocked:inferredVehicle.progressIdentityBlocked,trip:inferredVehicle.progressTrip,pattern:inferredVehicle.progressPattern};

      const matchedVehicle={journey:'OUTBOUND',corridorTrip:''};
      api.setVehicleProgressIdentity(matchedVehicle,{journeyDestinationConflict:false,matchedTrip:'OUTBOUND'},null,{pattern:'OUTBOUND-PATTERN'});
      const matchedProgress={blocked:matchedVehicle.progressIdentityBlocked,trip:matchedVehicle.progressTrip,pattern:matchedVehicle.progressPattern};

      return {
        exactConflict:{score:exactConflict.score,journeyMatch:!!exactConflict.journeyMatch,matchedTrip:String(exactConflict.matchedTrip||''),conflict:!!exactConflict.journeyDestinationConflict,timetableVerified:!!exactConflict.timetableVerified,label:exactConflict.label},
        originConflict:{score:originConflict.score,journeyMatch:!!originConflict.journeyMatch,matchedTrip:String(originConflict.matchedTrip||''),conflict:!!originConflict.journeyDestinationConflict,timetableVerified:!!originConflict.timetableVerified,label:originConflict.label},
        compatibleExact:{journeyMatch:!!compatibleExact.journeyMatch,matchedTrip:String(compatibleExact.matchedTrip||''),conflict:!!compatibleExact.journeyDestinationConflict},
        destinationMissing:{journeyMatch:!!destinationMissing.journeyMatch,matchedTrip:String(destinationMissing.matchedTrip||''),conflict:!!destinationMissing.journeyDestinationConflict},
        agreementConflict,
        agreementCompatible,
        matchedIdentity:{count:matchedCount,trip:matchedInput.matchedTrip,source:matchedInput.matchSource,realtime:!!matchedRealtime.matchedRealtime,journeyMatch:!!matchedRealtime.journeyMatch,matchedTrip:String(matchedRealtime.matchedTrip||''),conflict:!!matchedRealtime.journeyDestinationConflict},
        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},
        blockedProgress,
        inferredProgress,
        matchedProgress
      };
    } finally {
      Object.assign(state,saved);
    }
  });

  for(const conflict of [result.exactConflict,result.originConflict]){
    assert.equal(conflict.journeyMatch,false,'a journey whose timetable headsign contradicts the live destination must not become exact journey identity');
    assert.equal(conflict.matchedTrip,'','conflicting journey identity must not leak a matched trip into progress or ETA');
    assert.equal(conflict.conflict,true,'the handover must be explicitly marked as a journey-destination conflict');
    assert.equal(conflict.timetableVerified,true,'the bus may remain route-verified when another timetable branch matches its live destination');
    assert.ok(conflict.score>=3,'route-level evidence should keep a plausible bus visible without trusting the conflicting journey');
    assert.match(conflict.label,/disagrees/);
  }
  assert.equal(result.compatibleExact.journeyMatch,true,'a destination-compatible exact trip must remain strong identity evidence');
  assert.equal(result.compatibleExact.matchedTrip,'OUTBOUND');
  assert.equal(result.compatibleExact.conflict,false);
  assert.equal(result.destinationMissing.journeyMatch,true,'feeds without a destination must not lose exact journey matching');
  assert.equal(result.destinationMissing.matchedTrip,'OUTBOUND');
  assert.equal(result.agreementConflict.conflict,true);
  assert.equal(result.agreementCompatible.conflict,false,'minor stop-name wording differences should remain compatible');
  assert.deepEqual(result.matchedIdentity,{count:1,trip:'OUTBOUND',source:'gtfs-rt',realtime:true,journeyMatch:true,matchedTrip:'OUTBOUND',conflict:true},'BODS matched GTFS trip must outrank an opaque/stale SIRI journey and destination handover');
  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap but expire rather than stick indefinitely');

  assert.deepEqual(result.blockedProgress,{blocked:true,trip:'',pattern:''},'conflicting identity with no safe geometry must withhold journey progress');
  assert.deepEqual(result.inferredProgress,{blocked:false,trip:'',pattern:'SAFE-INBOUND-PATTERN'},'movement-inferred pattern may restore progress without manufacturing a trip identity');
  assert.deepEqual(result.matchedProgress,{blocked:false,trip:'OUTBOUND',pattern:'OUTBOUND-PATTERN'},'compatible matched journey should continue to drive progress normally');
  assert.deepEqual(pageErrors,[],'journey identity regression page should not raise browser errors');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}

console.log('Journey identity regression passed.');
