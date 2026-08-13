import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as playwright from 'playwright';

const ENGINE_NAME=process.env.KERBSIDE_BROWSER||'webkit';
const engine=playwright[ENGINE_NAME];
if(!engine||typeof engine.launch!=='function') throw new Error(`Unsupported browser engine: ${ENGINE_NAME}`);
console.log(`Duplicate trip identity regression engine: ${ENGINE_NAME}`);

const testsDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(testsDir,'..','..');
const busSource=await readFile(path.join(root,'bus.html'),'utf8');

assert.match(busSource,/function equivalentAmbiguousOriginMatch\(rows,identity,dest,line,now=Date\.now\(\)\)/);
assert.match(busSource,/originEquivalentAmbiguous:true/);
assert.match(busSource,/!evidence\.originEquivalentAmbiguous\?inferVehicleJourneyPattern/);
assert.match(busSource,/!evidence\.originEquivalentAmbiguous\)\{ v\.progressTrip=est\.schedule\.trip/);

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

const browser=await engine.launch({headless:true});
try{
  const context=await browser.newContext({timezoneId:'Europe/London'});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_TEST__),null,{timeout:20000});

  const result=await page.evaluate(()=>{
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={
      stop:state.stop,ttStop:state.ttStop,timetable:state.timetable,
      timetableSource:state.timetableSource,timetableFallback:state.timetableFallback,
      timetableRegion:state.timetableRegion,timetableRun:state.timetableRun,
      dir:state.dir,destFilter:state.destFilter,vehicles:state.vehicles,
      onlyServing:state.onlyServing,hideAway:state.hideAway,liveDiag:state.liveDiag
    };
    const stop={id:'STOP-A',timetableId:'STOP-A',atco:'0100STOPA',source:'official',name:'Station Road',lat:52.0000,lon:-2.0000};
    const parts=api.ukDateTimeParts(new Date(now));
    const minuteNow=Number(parts.hour)*60+Number(parts.minute);
    const minuteAt=delta=>((minuteNow+delta)%1440+1440)%1440;
    const rawRow=(trip,pattern,head='Bristol Bus Station',direction='out',routeId='R-X4',operator='BNSM',stopId='STOP-A')=>[
      minuteAt(8),'X4',head,'',direction,trip,pattern,routeId,operator,3,minuteAt(-30),stopId
    ];
    const commonPattern={
      p:[[52.0100,-2.0000],[52.0050,-2.0000],[52.0000,-2.0000],[51.9950,-2.0000]],
      s:[
        ['UPSTREAM','Upstream',52.0100,-2.0000,1],
        ['MID','Midpoint',52.0050,-2.0000,2],
        ['STOP-A','Station Road',52.0000,-2.0000,3],
        ['AFTER','After Station Road',51.9950,-2.0000,4]
      ],g:1
    };
    const wrongSidePattern={
      p:[[52.0100,-2.0000],[52.0050,-2.0000],[52.00025,-2.0000],[51.9950,-2.0000]],
      s:[
        ['UPSTREAM','Upstream',52.0100,-2.0000,1],
        ['MID','Midpoint',52.0050,-2.0000,2],
        ['STOP-B','Station Road',52.00025,-2.0000,3],
        ['AFTER','After Station Road',51.9950,-2.0000,4]
      ],g:1
    };
    const makeVehicle=(id,overrides={})=>({
      id,line:'X4',lineRef:'R-X4',owner:'BNSM',operator:'BNSM',dest:'Bristol Bus Station',journey:'',
      lat:52.0050,lon:-2.0000,bearing:180,ts:now,sourceTs:now,hist:[],speed:6,cadence:20,
      ...overrides
    });
    const install=(rows,patterns)=>{
      state.stop=stop;
      state.ttStop={id:'STOP-A',match:'code',d:rows};
      state.timetable={services:{},tripPatterns:{},patterns};
      for(const row of rows) if(row&&row[5]&&row[6]) state.timetable.tripPatterns[row[5]]=row[6];
      state.timetableSource='national';state.timetableFallback=false;state.timetableRegion='south_west';
      state.timetableRun=Number(state.timetableRun||0)+1;
      state.dir='all';state.destFilter=null;state.onlyServing=true;state.hideAway=false;state.liveDiag=null;
    };
    const aimedOriginFor=trip=>{
      const rows=api.timetableRows(new Date(now)).filter(row=>row.trip===trip&&row.at>=now-2*60000);
      const row=rows.sort((a,b)=>Math.abs(a.at-(now+8*60000))-Math.abs(b.at-(now+8*60000)))[0];
      if(!row||!Number.isFinite(Number(row.originAt))) throw new Error(`No origin time for ${trip}`);
      return row.originAt;
    };
    try{
      // Positive control: two timetable trip ids are genuinely duplicates at
      // this exact stand. One physical live bus may be shown without choosing a
      // trip id; the shared ordered pattern remains safe for passed-stop checks.
      install([
        rawRow('DUP-A','shared-pattern'),
        rawRow('DUP-B','shared-pattern')
      ],{'shared-pattern':commonPattern});
      const aimed=aimedOriginFor('DUP-A');
      const one=makeVehicle('physical-one',{vehicleRef:'BUS-1',aimedOriginAt:aimed});
      state.vehicles=new Map([[one.id,one]]);
      const evidence=api.routeEvidence('X4',one.dest,'',one);
      const liveRows=api.relevant();
      const scheduledAfterLive=api.scheduledBoardRows(liveRows).filter(row=>row&&row.schedule&&row.schedule.line==='X4');
      const live=liveRows.find(row=>row&&row.v&&row.v.id===one.id)||null;
      const positive={
        evidenceFlag:!!evidence.originEquivalentAmbiguous,
        evidenceTrip:String(evidence.matchedTrip||''),
        journeyMatch:!!evidence.journeyMatch,
        shown:!!live,
        rowTrip:live?String(live.v.progressTrip||''):'',
        rowPattern:live?String(live.v.progressPattern||''):'',
        scheduledDuplicates:scheduledAfterLive.length
      };

      // Two physical buses with the same origin/destination remain ambiguous.
      const twoA=makeVehicle('physical-two-a',{vehicleRef:'BUS-2A',aimedOriginAt:aimed});
      const twoB=makeVehicle('physical-two-b',{vehicleRef:'BUS-2B',aimedOriginAt:aimed,lat:52.0060});
      state.vehicles=new Map([[twoA.id,twoA],[twoB.id,twoB]]);
      const twoEvidence=api.routeEvidence('X4',twoA.dest,'',twoA);
      const twoRows=api.relevant();
      const twoBus={flag:!!twoEvidence.originEquivalentAmbiguous,shown:twoRows.length,exactStopRejected:Number(state.liveDiag&&state.liveDiag.rejected&&state.liveDiag.rejected.exactStop||0)};

      // Same origin minute but different branches must not be treated as
      // duplicate-equivalent, even if a single live bus is present.
      install([
        rawRow('BRANCH-A','shared-pattern','Bristol Bus Station'),
        rawRow('BRANCH-B','shared-pattern','Portishead Combe Road')
      ],{'shared-pattern':commonPattern});
      const branchAimed=aimedOriginFor('BRANCH-A');
      const branchVehicle=makeVehicle('branch-bus',{vehicleRef:'BUS-BRANCH',aimedOriginAt:branchAimed});
      state.vehicles=new Map([[branchVehicle.id,branchVehicle]]);
      const branchEvidence=api.routeEvidence('X4',branchVehicle.dest,'',branchVehicle);
      const branchRows=api.relevant();
      const differentBranch={flag:!!branchEvidence.originEquivalentAmbiguous,shown:branchRows.length};

      // Two trip ids that point to different ordered patterns are not
      // equivalent, even when their public destination text is identical.
      install([
        rawRow('PATTERN-A','shared-pattern'),
        rawRow('PATTERN-B','other-pattern')
      ],{'shared-pattern':commonPattern,'other-pattern':{...commonPattern}});
      const patternAimed=aimedOriginFor('PATTERN-A');
      const patternVehicle=makeVehicle('pattern-bus',{vehicleRef:'BUS-PATTERN',aimedOriginAt:patternAimed});
      state.vehicles=new Map([[patternVehicle.id,patternVehicle]]);
      const patternEvidence=api.routeEvidence('X4',patternVehicle.dest,'',patternVehicle);
      const patternRows=api.relevant();
      const differentPattern={flag:!!patternEvidence.originEquivalentAmbiguous,shown:patternRows.length};

      // A duplicate group whose shared pattern serves the nearby opposite stand
      // cannot prove this selected ATCO stop and stays excluded.
      install([
        rawRow('WRONG-A','wrong-side'),
        rawRow('WRONG-B','wrong-side')
      ],{'wrong-side':wrongSidePattern});
      const wrongAimed=aimedOriginFor('WRONG-A');
      const wrongVehicle=makeVehicle('wrong-side-bus',{vehicleRef:'BUS-WRONG',aimedOriginAt:wrongAimed});
      state.vehicles=new Map([[wrongVehicle.id,wrongVehicle]]);
      const wrongEvidence=api.routeEvidence('X4',wrongVehicle.dest,'',wrongVehicle);
      const wrongRows=api.relevant();
      const wrongSide={flag:!!wrongEvidence.originEquivalentAmbiguous,shown:wrongRows.length,exactStopRejected:Number(state.liveDiag&&state.liveDiag.rejected&&state.liveDiag.rejected.exactStop||0)};

      // Even in the valid duplicate case, the common route pattern must still
      // reject a bus whose confirmed position is already beyond this stop.
      install([
        rawRow('PASSED-A','shared-pattern'),
        rawRow('PASSED-B','shared-pattern')
      ],{'shared-pattern':commonPattern});
      const passedAimed=aimedOriginFor('PASSED-A');
      const passedVehicle=makeVehicle('passed-bus',{vehicleRef:'BUS-PASSED',aimedOriginAt:passedAimed,lat:51.9950});
      state.vehicles=new Map([[passedVehicle.id,passedVehicle]]);
      const passedEvidence=api.routeEvidence('X4',passedVehicle.dest,'',passedVehicle);
      const passedRows=api.relevant();
      const passed={flag:!!passedEvidence.originEquivalentAmbiguous,shown:passedRows.length,passedRejected:Number(state.liveDiag&&state.liveDiag.rejected&&state.liveDiag.rejected.passed||0)};

      return {positive,twoBus,differentBranch,differentPattern,wrongSide,passed};
    }finally{
      Object.assign(state,saved);
    }
  });

  assert.equal(result.positive.evidenceFlag,true,'one physical bus with duplicate-equivalent timetable trips should get bounded origin evidence');
  assert.equal(result.positive.evidenceTrip,'','duplicate-equivalent evidence must not manufacture a timetable trip id');
  assert.equal(result.positive.journeyMatch,false,'duplicate-equivalent evidence is not exact journey identity');
  assert.equal(result.positive.shown,true,'safe duplicate-equivalent evidence should admit the live bus');
  assert.equal(result.positive.rowTrip,'','the live row must keep exact trip identity unknown');
  assert.equal(result.positive.rowPattern,'shared-pattern','only the pattern shared by every duplicate candidate may be used');
  assert.equal(result.positive.scheduledDuplicates,0,'the equivalent scheduled duplicates should be claimed by the one live row');

  assert.equal(result.twoBus.flag,false,'two physical live buses must keep origin identity ambiguous');
  assert.equal(result.twoBus.shown,0,'two ambiguous physical buses must not gain live admission from this fix');
  assert.ok(result.twoBus.exactStopRejected>=2,'both ambiguous buses should fail the exact-stop admission path');

  assert.equal(result.differentBranch.flag,false,'different destinations/branches must not be collapsed');
  assert.equal(result.differentBranch.shown,0,'a branch conflict must remain scheduled-only without stronger evidence');
  assert.equal(result.differentPattern.flag,false,'different route patterns must not be collapsed');
  assert.equal(result.differentPattern.shown,0,'different patterns must remain scheduled-only without stronger evidence');

  assert.equal(result.wrongSide.flag,false,'an opposite-kerb pattern must never qualify as duplicate-equivalent proof');
  assert.equal(result.wrongSide.shown,0,'opposite-kerb live GPS must remain excluded');
  assert.ok(result.wrongSide.exactStopRejected>=1,'opposite-kerb exclusion should remain an exact-stop rejection');

  assert.equal(result.passed.flag,true,'the passed-stop control should first establish the safe duplicate-equivalent group');
  assert.equal(result.passed.shown,0,'a bus already beyond the selected stop must remain excluded');
  assert.ok(result.passed.passedRejected>=1,'passed-stop geometry should still be the rejecting safety gate');

  assert.deepEqual(pageErrors,[]);
  await context.close();
  console.log('Kerbside duplicate trip identity regression checks passed.');
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
