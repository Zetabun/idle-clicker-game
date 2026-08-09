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
assert.match(busSource,/function journeyDestinationAlternative\(rows,matchedRows,dest\)/);
assert.match(busSource,/destination wording differs/);
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

  const result=await page.evaluate(async()=>{
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
      destFilter:state.destFilter,
      vehicles:state.vehicles,
      onlyServing:state.onlyServing,
      hideAway:state.hideAway
    };
    const now=Date.now();
    const stop={id:'BRIGHTSTONE',timetableId:'BRIGHTSTONE',source:'official',name:'Brightstone Road',lat:52.45,lon:-1.96};
    const parts=api.ukDateTimeParts(new Date(now));
    const minuteNow=Number(parts.hour)*60+Number(parts.minute);
    const minuteAt=delta=>((minuteNow+delta)%1440+1440)%1440;
    const gtfsClock=mins=>`${String(Math.floor(Number(mins)/60)).padStart(2,'0')}:${String(Number(mins)%60).padStart(2,'0')}:00`;
    const rawRow=(delta,line,head,trip,originDelta,routeId='')=>[
      minuteAt(delta),line,head,'','',trip,'',routeId,'',10,minuteAt(originDelta)
    ];
    try{
      state.stop=stop;
      state.ttStop={id:'BRIGHTSTONE',d:[
        rawRow(20,'61','Digbeth Moor Street Queensway','INBOUND',-25,'R61'),
        rawRow(40,'61','Frankley Arden Road Terminus','OUTBOUND',10,'R61'),
        rawRow(30,'62','Other Terminus','FOREIGN',-5,'R62')
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
      const matchedCount=api.applyMatchedIdentities([matchedInput],[{entityId:'entity-740',vehicleId:'BUS-740',tripId:'OUTBOUND',routeId:'R61',startDate:outbound.serviceDate,startTime:gtfsClock(outbound.originMins),currentStopSequence:4,currentStatus:'2',stopId:'PREVIOUS',lat:baseVehicle.lat,lon:baseVehicle.lon,timestamp:now-1000}],now);
      const matchedRealtime=api.routeEvidence('61',matchedInput.dest,api.vehicleJourneyRef(matchedInput),matchedInput);
      const wrongServiceIdentity={...matchedInput,matchedStartDate:'19990101',matchedServiceKey:''};
      wrongServiceIdentity.matchedServiceKey=api.matchedServiceInstanceKey(wrongServiceIdentity);
      const wrongServiceEvidence=api.routeEvidence('61',wrongServiceIdentity.dest,api.vehicleJourneyRef(wrongServiceIdentity),wrongServiceIdentity);

      const duplicateNear={...baseVehicle,id:'duplicate-near',vehicleRef:'BUS-DUPE',vehicleUniqueId:'',journey:'',dest:'Frankley Arden Road Terminus',lat:52.4600,lon:-1.9500,sourceTs:now,ts:now};
      const duplicateFar={...duplicateNear,id:'duplicate-far',lat:52.4610};
      const duplicateCount=api.applyMatchedIdentities([duplicateFar,duplicateNear],[{entityId:'entity-dupe',vehicleId:'BUS-DUPE',tripId:'OUTBOUND',routeId:'R61',lat:52.4600,lon:-1.9500,timestamp:now}],now);

      const routeMismatch=api.routeEvidence('61','Other Terminus','FOREIGN',{...baseVehicle,journey:'OPAQUE',matchedTrip:'FOREIGN',matchedRouteId:'R62',matchedLagMs:0});
      const routeIdMismatch=api.routeEvidence('61','Frankley Arden Road Terminus','OUTBOUND',{...baseVehicle,journey:'OPAQUE',matchedTrip:'OUTBOUND',matchedRouteId:'WRONG-ROUTE',matchedLagMs:0});
      const handover=api.routeEvidence('61','Digbeth Moor Street Queensway','OUTBOUND',{...baseVehicle,journey:'INBOUND',matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedLagMs:60000});

      // Some operators publish a locality ("Digbeth") while the timetable uses
      // the actual terminus stop ("Moor St Queensway"). Text similarity is low,
      // but two GPS fixes moving forward on the ordered inbound pattern prove
      // which side of Brightstone Road the bus will serve. This must recover a
      // live route pattern without claiming a specific scheduled departure.
      const aliasPatternId='brightstone-61-inbound';
      state.ttStop={id:'BRIGHTSTONE',match:'code',d:[[
        minuteAt(8),'61','Moor St Queensway','','in','BRIGHTSTONE-INBOUND',aliasPatternId,'R61','',3,minuteAt(-30)
      ]]};
      state.timetable={
        services:{},
        tripPatterns:{'BRIGHTSTONE-INBOUND':aliasPatternId},
        patterns:{
          [aliasPatternId]:{
            p:[[52.4600,-1.9600],[52.4550,-1.9600],[52.4500,-1.9600]],
            s:[
              ['UPSTREAM','Upstream',52.4600,-1.9600,1],
              ['MID','Middle',52.4550,-1.9600,2],
              ['BRIGHTSTONE','Brightstone Road',52.4500,-1.9600,3]
            ],
            g:1
          }
        }
      };
      state.timetableRun=Number(state.timetableRun||0)+1;
      const aliasVehicle={
        id:'61-inbound-alias',line:'61',lineRef:'61',owner:'',operator:'',dest:'Digbeth',journey:'',
        lat:52.4550,lon:-1.9600,bearing:180,ts:now,sourceTs:now,hist:[
          {lat:52.4590,lon:-1.9600,ts:now-30000},
          {lat:52.4550,lon:-1.9600,ts:now}
        ],speed:6,cadence:20
      };
      const aliasBaseEvidence=api.routeEvidence('61',aliasVehicle.dest,'',aliasVehicle);
      const aliasJourneyEvidence=api.routeEvidence('61',aliasVehicle.dest,'BRIGHTSTONE-INBOUND',{...aliasVehicle,journey:'BRIGHTSTONE-INBOUND'});
      const aliasInference=api.inferVehicleJourneyPattern(aliasVehicle,stop,now);
      const aliasEvidence=api.inferredRouteEvidence(aliasBaseEvidence,aliasInference);
      const aliasPlan={matches:[{
        trip:'BRIGHTSTONE-INBOUND',line:'61',head:'Moor St Queensway',pattern:aliasInference.pattern,
        targetAlong:aliasInference.fit.target.along,at:now+8*60000,originAt:null,routeId:'R61',operator:'',stopSequence:3
      }]};
      const aliasScanInference=api.inferredRouteScanMatch(aliasPlan,{...aliasVehicle},now);
      const aliasScanVehicle=api.matchRouteScanVehicle(aliasPlan,{...aliasVehicle,id:'61-route-scan-strong',journey:'BRIGHTSTONE-INBOUND',hist:[]});

      // A route number and plausible destination are not enough to choose a
      // kerb. Initial board admission at an exact national stop waits for a
      // trip or inferred pattern that explicitly contains that ATCO stop.
      state.onlyServing=true;state.hideAway=false;
      const routeOnlyVehicle={
        id:'61-route-only',line:'61',lineRef:'61',owner:'',operator:'',dest:'Moor St Queensway',journey:'',
        lat:52.4550,lon:-1.9600,bearing:180,ts:now,sourceTs:now,hist:[],speed:null,cadence:20
      };
      state.vehicles=new Map([[routeOnlyVehicle.id,routeOnlyVehicle]]);
      const routeOnlyShown=api.relevant().some(row=>row.v&&row.v.id===routeOnlyVehicle.id);
      const routeOnlyExactStopRejected=Number(state.liveDiag&&state.liveDiag.rejected&&state.liveDiag.rejected.exactStop||0);

      // An exact realtime trip must not be shown before its route-pattern shard
      // proves the selected kerb. If the shard then proves only the nearby
      // opposite stop, the bus remains excluded without being mislabelled passed.
      const flickerPatternId='brightstone-wrong-kerb';
      state.ttStop={id:'BRIGHTSTONE',match:'code',d:[[
        minuteAt(6),'61','Moor St Queensway','','in','FLICKER-TRIP',flickerPatternId,'R61','',3,minuteAt(-20)
      ]]};
      state.timetable={services:{},tripPatterns:{'FLICKER-TRIP':flickerPatternId},patterns:{}};
      state.timetableSource='national';
      state.timetableFallback=false;
      state.timetableRun=Number(state.timetableRun||0)+1;
      state.dir='all';state.destFilter=null;state.onlyServing=true;state.hideAway=false;
      const flickerVehicle={
        id:'61-pattern-load',line:'61',lineRef:'61',owner:'',operator:'',dest:'Digbeth',journey:'OPAQUE',
        matchedTrip:'FLICKER-TRIP',matchedRouteId:'R61',matchedLagMs:0,matchedTripAt:now,matchedObservationAt:now,
        lat:52.4480,lon:-1.9600,bearing:180,ts:now,sourceTs:now,hist:[
          {lat:52.4490,lon:-1.9600,ts:now-30000},{lat:52.4480,lon:-1.9600,ts:now}
        ],speed:6,cadence:20
      };
      state.vehicles=new Map([[flickerVehicle.id,flickerVehicle]]);
      const flickerBefore=api.relevant().some(row=>row.v&&row.v.id===flickerVehicle.id);
      state.timetable.patterns[flickerPatternId]={
        p:[[52.4600,-1.9600],[52.4520,-1.9600],[52.4480,-1.9600],[52.4440,-1.9600]],
        s:[
          ['UPSTREAM','Upstream',52.4600,-1.9600,1],
          ['MID','Middle',52.4520,-1.9600,2],
          ['BRIGHTSTONE-OTHER-SIDE','Brightstone Road',52.45025,-1.9600,3]
        ],g:1
      };
      const flickerAfter=api.relevant().some(row=>row.v&&row.v.id===flickerVehicle.id);
      const flickerPassed=Number(state.liveDiag&&state.liveDiag.rejected&&state.liveDiag.rejected.passed||0);

      // Exact national stop identity outranks a stale/incorrect realtime trip.
      // The candidate pattern contains only the opposite Brightstone kerb and
      // must therefore be a hard rejection rather than a retained live row.
      const wrongSideTrip='WRONG-SIDE-TRIP', wrongSidePattern='wrong-side-pattern';
      state.ttStop={id:'BRIGHTSTONE',match:'code',d:[[
        minuteAt(5),'61','Moor St Queensway','','in',wrongSideTrip,wrongSidePattern,'R61','',3,minuteAt(-20)
      ]]};
      state.timetable={services:{},tripPatterns:{[wrongSideTrip]:wrongSidePattern},patterns:{
        [wrongSidePattern]:{
          p:[[52.4600,-1.9600],[52.4520,-1.9600],[52.4480,-1.9600]],
          s:[
            ['UPSTREAM','Upstream',52.4600,-1.9600,1],
            ['BRIGHTSTONE-OTHER-SIDE','Brightstone Road',52.45025,-1.9600,3]
          ],g:1
        }
      }};
      state.timetableRun=Number(state.timetableRun||0)+1;
      const wrongSideVehicle={
        id:'wrong-side-live',line:'61',lineRef:'61',owner:'',operator:'',dest:'Digbeth',journey:'OPAQUE',
        matchedTrip:wrongSideTrip,matchedRouteId:'R61',matchedLagMs:0,matchedTripAt:now,matchedObservationAt:now,
        lat:52.4520,lon:-1.9600,bearing:180,ts:now,sourceTs:now,hist:[{lat:52.4540,lon:-1.9600,ts:now-20000},{lat:52.4520,lon:-1.9600,ts:now}],speed:6,cadence:20
      };
      wrongSideVehicle.lastShownStopId='BRIGHTSTONE';wrongSideVehicle.lastShownAt=now;wrongSideVehicle.lastShownArrivalAt=now+5*60000;wrongSideVehicle.lastShownBoardDir='all';wrongSideVehicle.lastShownDestFilter='';
      wrongSideVehicle.lastShownSnapshot={v:null,secs:300,metres:200,evidence:{matchedTrip:wrongSideTrip},confidence:'low'};
      state.vehicles=new Map([[wrongSideVehicle.id,wrongSideVehicle]]);
      const wrongSideRows=api.relevant();
      const wrongSide={
        shown:wrongSideRows.some(row=>row.v&&row.v.id===wrongSideVehicle.id),
        exactStopRejected:Number(state.liveDiag&&state.liveDiag.rejected&&state.liveDiag.rejected.exactStop||0),
        retained:Number(state.liveDiag&&state.liveDiag.recovered||0)
      };
      const exactStopCheck=api.exactTripSelectedStopEvidence(wrongSideTrip,wrongSidePattern,stop,3);
      const wrongSideProof=api.currentExactStopProof(wrongSideVehicle,{score:6,matchedTrip:wrongSideTrip},null,{trip:wrongSideTrip,pattern:wrongSidePattern,stopSequence:3},now);
      const wrongSideRetentionSeed=api.rememberRouteContinuity(wrongSideVehicle,{score:6,matchedTrip:wrongSideTrip},now,wrongSideProof);

      const rightSideTrip='RIGHT-SIDE-TRIP',rightSidePattern='right-side-pattern';
      state.timetable.tripPatterns[rightSideTrip]=rightSidePattern;
      state.timetable.patterns[rightSidePattern]={
        p:[[52.4600,-1.9600],[52.4520,-1.9600],[52.4500,-1.9600]],
        s:[['UPSTREAM','Upstream',52.4600,-1.9600,1],['BRIGHTSTONE','Brightstone Road',52.4500,-1.9600,3]],g:1
      };
      const rightSideVehicle={...wrongSideVehicle,id:'right-side-live',matchedTrip:rightSideTrip,matchedStartDate:'20260809',matchedStartTime:'08:10:00',progressTrip:rightSideTrip,progressPattern:rightSidePattern};
      rightSideVehicle.matchedServiceKey=api.matchedServiceInstanceKey(rightSideVehicle);
      const rightSideProof=api.currentExactStopProof(rightSideVehicle,{score:6,matchedTrip:rightSideTrip},null,{trip:rightSideTrip,pattern:rightSidePattern,stopSequence:3},now);
      const rightSideRetentionSeed=api.rememberRouteContinuity(rightSideVehicle,{score:6,matchedTrip:rightSideTrip},now,rightSideProof);
      const nextServiceVehicle={...rightSideVehicle,matchedStartDate:'20260810',matchedServiceKey:''};
      nextServiceVehicle.matchedServiceKey=api.matchedServiceInstanceKey(nextServiceVehicle);
      const retentionProof={
        wrongSideServes:wrongSideProof.serves,wrongSideSeed:wrongSideRetentionSeed,wrongSideHas:api.hasExactStopRetentionProof(wrongSideVehicle),
        rightSideServes:rightSideProof.serves,rightSideSeed:rightSideRetentionSeed,rightSideHas:api.hasExactStopRetentionProof(rightSideVehicle),
        nextServiceHas:api.hasExactStopRetentionProof(nextServiceVehicle)
      };

      // A GTFS-RT identity old enough to plausibly belong to the previous
      // turnaround must not assign a trip to an otherwise fresh SIRI vehicle.
      const staleMatchedInput={...baseVehicle,id:'stale-rt',vehicleRef:'BUS-STALE',vehicleUniqueId:'',journey:'OPAQUE',matchedTrip:'',sourceTs:now,ts:now,cadence:20};
      const staleMatchedCount=api.applyMatchedIdentities([staleMatchedInput],[{entityId:'entity-stale',vehicleId:'BUS-STALE',tripId:'OUTBOUND',routeId:'R61',lat:baseVehicle.lat,lon:baseVehicle.lon,timestamp:now-120000}],now);

      // Sticky identity must also age the *underlying observation*. A fresh
      // assignment timestamp is not enough if the GTFS-RT position itself is
      // two minutes behind the current SIRI vehicle.
      const staleStickyIncoming={...baseVehicle,sourceTs:now,ts:now,matchedTrip:'',cadence:20};
      const staleStickyPrevious={...baseVehicle,matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedTripAt:now-10000,matchedObservationAt:now-120000,matchedLagMs:0,matchSource:'gtfs-rt'};
      const staleStickyRetained=api.retainMatchedIdentity(staleStickyPrevious,staleStickyIncoming,now);

      const stickyIncoming={...baseVehicle,sourceTs:now,ts:now,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};
      const stickyPrev={...baseVehicle,matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedTripAt:now-30000,matchedObservationAt:now-30000,matchedLagMs:0,matchSource:'gtfs-rt'};
      const stickyRetained=api.retainMatchedIdentity(stickyPrev,stickyIncoming,now);
      const expiredIncoming={...baseVehicle};
      const stickyExpired=api.retainMatchedIdentity({...stickyPrev,matchedTripAt:now-4*60*1000},expiredIncoming,now);
      const uniquePhysicalKey=api.physicalVehicleKey({owner:'OPTEST',vehicleRef:'',vehicleUniqueId:'UNIQUE-9'});
      const budgetStarted=performance.now();
      const budgetResult=await api.matchedIdentityWithinBudget(new Promise(()=>{}),20);
      const budgetElapsed=performance.now()-budgetStarted;

      const blockedVehicle={journey:'OUTBOUND',corridorTrip:''};
      api.setVehicleProgressIdentity(blockedVehicle,{journeyDestinationConflict:true,matchedTrip:''},null,null);
      const blockedProgress={blocked:blockedVehicle.progressIdentityBlocked,trip:blockedVehicle.progressTrip,pattern:blockedVehicle.progressPattern};

      const inferredVehicle={journey:'OUTBOUND',corridorTrip:''};
      api.setVehicleProgressIdentity(inferredVehicle,{journeyDestinationConflict:true,matchedTrip:''},{patternId:'SAFE-INBOUND-PATTERN'},null);
      const inferredProgress={blocked:inferredVehicle.progressIdentityBlocked,trip:inferredVehicle.progressTrip,pattern:inferredVehicle.progressPattern};

      const matchedVehicle={journey:'OUTBOUND',corridorTrip:''};
      api.setVehicleProgressIdentity(matchedVehicle,{journeyDestinationConflict:false,matchedTrip:'OUTBOUND'},null,{pattern:'OUTBOUND-PATTERN',stopSequence:7});
      const matchedProgress={blocked:matchedVehicle.progressIdentityBlocked,trip:matchedVehicle.progressTrip,pattern:matchedVehicle.progressPattern,stopSequence:matchedVehicle.progressStopSequence};

      return {
        exactConflict:{score:exactConflict.score,journeyMatch:!!exactConflict.journeyMatch,matchedTrip:String(exactConflict.matchedTrip||''),conflict:!!exactConflict.journeyDestinationConflict,timetableVerified:!!exactConflict.timetableVerified,label:exactConflict.label},
        originConflict:{score:originConflict.score,journeyMatch:!!originConflict.journeyMatch,matchedTrip:String(originConflict.matchedTrip||''),conflict:!!originConflict.journeyDestinationConflict,timetableVerified:!!originConflict.timetableVerified,label:originConflict.label},
        compatibleExact:{journeyMatch:!!compatibleExact.journeyMatch,matchedTrip:String(compatibleExact.matchedTrip||''),conflict:!!compatibleExact.journeyDestinationConflict},
        destinationMissing:{journeyMatch:!!destinationMissing.journeyMatch,matchedTrip:String(destinationMissing.matchedTrip||''),conflict:!!destinationMissing.journeyDestinationConflict},
        agreementConflict,
        agreementCompatible,
        matchedIdentity:{count:matchedCount,trip:matchedInput.matchedTrip,source:matchedInput.matchSource,realtime:!!matchedRealtime.matchedRealtime,journeyMatch:!!matchedRealtime.journeyMatch,matchedTrip:String(matchedRealtime.matchedTrip||''),conflict:!!matchedRealtime.journeyDestinationConflict,dateMatches:matchedInput.matchedStartDate===outbound.serviceDate,timeMatches:matchedInput.matchedStartTime===gtfsClock(outbound.originMins),serviceKeyValid:/^trip\|OUTBOUND\|\d{8}\|\d{2}:\d{2}:00\|$/.test(matchedInput.matchedServiceKey),currentSequence:matchedInput.matchedCurrentStopSequence,currentStatus:matchedInput.matchedCurrentStatus,stopId:matchedInput.matchedStopId},
        wrongServiceIdentity:{realtime:!!wrongServiceEvidence.matchedRealtime,journeyMatch:!!wrongServiceEvidence.journeyMatch,matchedTrip:String(wrongServiceEvidence.matchedTrip||'')},
        oneToOne:{count:duplicateCount,near:duplicateNear.matchedTrip||'',far:duplicateFar.matchedTrip||''},
        routeGuard:{lineRealtime:!!routeMismatch.matchedRealtime,lineTrip:String(routeMismatch.matchedTrip||''),routeRealtime:!!routeIdMismatch.matchedRealtime,routeTrip:String(routeIdMismatch.matchedTrip||'')},
        handover:{realtime:!!handover.matchedRealtime,trip:String(handover.matchedTrip||''),conflict:!!handover.journeyDestinationConflict},
        destinationAliasJourney:{
          score:Number(aliasJourneyEvidence&&aliasJourneyEvidence.score||0),
          journeyMatch:!!(aliasJourneyEvidence&&aliasJourneyEvidence.journeyMatch),
          matchedTrip:String(aliasJourneyEvidence&&aliasJourneyEvidence.matchedTrip||''),
          conflict:!!(aliasJourneyEvidence&&aliasJourneyEvidence.journeyDestinationConflict),
          wordingMismatch:!!(aliasJourneyEvidence&&aliasJourneyEvidence.journeyDestinationWordingMismatch),
          label:String(aliasJourneyEvidence&&aliasJourneyEvidence.label||'')
        },
        destinationAliasPattern:{
          inferred:!!aliasInference,
          patternOnly:!!(aliasInference&&aliasInference.patternOnly),
          patternId:String(aliasInference&&aliasInference.patternId||''),
          score:Number(aliasEvidence&&aliasEvidence.score||0),
          journeyMatch:!!(aliasEvidence&&aliasEvidence.journeyMatch),
          matchedTrip:String(aliasEvidence&&aliasEvidence.matchedTrip||'')
        },
        routeScanAlias:{
          inferred:!!aliasScanInference,patternOnly:!!(aliasScanInference&&aliasScanInference.patternOnly),
          corridorTrip:String(aliasScanVehicle&&aliasScanVehicle.corridorTrip||'')
        },
        routeOnly:{shown:routeOnlyShown,exactStopRejected:routeOnlyExactStopRejected},
        patternLoadFlicker:{before:flickerBefore,after:flickerAfter,passed:flickerPassed},
        wrongSide,
        exactStopCheck:{authoritative:!!exactStopCheck.authoritative,known:!!exactStopCheck.known,serves:!!exactStopCheck.serves,index:Number(exactStopCheck.index)},
        retentionProof,
        staleMatchedIdentity:{count:staleMatchedCount,trip:String(staleMatchedInput.matchedTrip||'')},
        staleStickyIdentity:{retained:staleStickyRetained,trip:String(staleStickyIncoming.matchedTrip||'')},
        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,lag:Number(stickyIncoming.matchedLagMs),expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},
        uniquePhysicalKey,
        budget:{empty:Array.isArray(budgetResult)&&budgetResult.length===0,elapsed:budgetElapsed},
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
  assert.deepEqual(result.matchedIdentity,{count:1,trip:'OUTBOUND',source:'gtfs-rt',realtime:true,journeyMatch:true,matchedTrip:'OUTBOUND',conflict:true,dateMatches:true,timeMatches:true,serviceKeyValid:true,currentSequence:4,currentStatus:'2',stopId:'PREVIOUS'},'a fresh BODS matched service instance may carry date, origin time and current-stop context while outranking stale destination text');
  assert.deepEqual(result.wrongServiceIdentity,{realtime:false,journeyMatch:false,matchedTrip:''},'a reused trip id from another service date must not become exact realtime identity');
  assert.deepEqual(result.oneToOne,{count:1,near:'OUTBOUND',far:''},'one GTFS-RT entity must be allocated to at most one SIRI vehicle');
  assert.deepEqual(result.routeGuard,{lineRealtime:false,lineTrip:'',routeRealtime:false,routeTrip:''},'a matched trip from the wrong public line or GTFS route must fall back instead of becoming authoritative');
  assert.deepEqual(result.handover,{realtime:false,trip:'INBOUND',conflict:false},'an older conflicting matched identity must yield to newer SIRI journey evidence during a terminus handover');
  assert.deepEqual(result.destinationAliasJourney,{
    score:6,journeyMatch:true,matchedTrip:'BRIGHTSTONE-INBOUND',conflict:false,wordingMismatch:true,
    label:'exact journey and stop sequence matched; destination wording differs'
  },'a strong exact journey calling at this stop must survive a locality-versus-terminus wording mismatch when no other branch matches the live destination');
  assert.deepEqual(result.destinationAliasPattern,{
    inferred:true,patternOnly:true,patternId:'brightstone-61-inbound',score:4,journeyMatch:false,matchedTrip:''
  },'GPS movement on the ordered 61 pattern must recover a Digbeth versus Moor St Queensway naming mismatch without inventing a scheduled trip identity');
  assert.deepEqual(result.routeScanAlias,{inferred:true,patternOnly:true,corridorTrip:'BRIGHTSTONE-INBOUND'},'the upstream route scan must apply the same destination-alias rule when the exact selected stop is present in the ordered pattern');
  assert.deepEqual(result.routeOnly,{shown:false,exactStopRejected:1},'same-route GPS without exact trip/pattern proof must not choose a side of the road');
  assert.deepEqual(result.patternLoadFlicker,{before:false,after:false,passed:0},'an authoritative board must wait for exact selected-stop proof and keep an opposite-kerb trip excluded');
  assert.deepEqual(result.wrongSide,{shown:false,exactStopRejected:1,retained:0},'an exact opposite-kerb contradiction must hard-drop the live bus and must not be rescued by MATCH RETAINED');
  assert.deepEqual(result.exactStopCheck,{authoritative:true,known:true,serves:false,index:-1},'authoritative exact-stop evidence must distinguish the opposite Brightstone Road ATCO code');
  assert.deepEqual(result.retentionProof,{wrongSideServes:false,wrongSideSeed:false,wrongSideHas:false,rightSideServes:true,rightSideSeed:true,rightSideHas:true,nextServiceHas:false},'retention may be seeded only by proof for the exact stop and same service instance');
  assert.deepEqual(result.staleMatchedIdentity,{count:0,trip:''},'a two-minute-old matched identity must not assign the previous journey to a fresh SIRI vehicle');
  assert.deepEqual(result.staleStickyIdentity,{retained:false,trip:''},'sticky matched identity must expire from the observation age rather than the local assignment time');
  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,lag:30000,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap, age its observation lag, and expire rather than stick indefinitely');
  assert.equal(result.uniquePhysicalKey,'OPTEST|vehicle-unique|UNIQUE-9','VehicleUniqueId must identify a physical bus when VehicleRef is absent');
  assert.equal(result.budget.empty,true,'a slow matched feed should degrade to no auxiliary identities');
  assert.ok(result.budget.elapsed<500,'the matched-feed wait helper should respect its bounded deadline');

  assert.deepEqual(result.blockedProgress,{blocked:true,trip:'',pattern:''},'conflicting identity with no safe geometry must withhold journey progress');
  assert.deepEqual(result.inferredProgress,{blocked:false,trip:'',pattern:'SAFE-INBOUND-PATTERN'},'movement-inferred pattern may restore progress without manufacturing a trip identity');
  assert.deepEqual(result.matchedProgress,{blocked:false,trip:'OUTBOUND',pattern:'OUTBOUND-PATTERN',stopSequence:7},'compatible matched journey should continue to drive progress using the selected stop sequence, not the vehicle current-stop sequence');
  assert.deepEqual(pageErrors,[],'journey identity regression page should not raise browser errors');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}

console.log('Journey identity regression passed.');
