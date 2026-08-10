import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as playwright from 'playwright';

const ENGINE_NAME=process.env.KERBSIDE_BROWSER||'webkit';
const engine=playwright[ENGINE_NAME];
if(!engine||typeof engine.launch!=='function') throw new Error(`Unsupported browser engine: ${ENGINE_NAME}`);
console.log(`Stop-side regression engine: ${ENGINE_NAME}`);

const testsDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(testsDir,'..','..');
const busSource=await readFile(path.join(root,'bus.html'),'utf8');

assert.match(busSource,/function authoritativeDiscoveredStopId\(stop\)/);
assert.match(busSource,/function likelyOppositeStopPair\(a,b\)/);
assert.match(busSource,/authoritativeA&&authoritativeB&&authoritativeA!==authoritativeB\) return false/);
assert.match(busSource,/const STOP_SIDE_DEVICE_FLOOR_METRES = 18/);
assert.match(busSource,/MORE THAN ONE PLAUSIBLE STAND/);
assert.match(busSource,/if\(S\.timetableSource==='national'&&stop\.source==='official'\) return null/);
assert.match(busSource,/if\(!hasSequence&&same\.length>1\)/);
assert.match(busSource,/pattern&&!pattern\.shape&&S\.stop&&dist\(b\.lat,b\.lon,S\.stop\.lat,S\.stop\.lon\)<=180\) return confirmed/);
assert.match(busSource,/corridorOnly:!!routed\.corridorOnly/);
assert.match(busSource,/visual\.estimated\?' estimated':''/);
assert.match(busSource,/Estimated between reports · route corridor/);

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
      timetable:state.timetable,
      timetableSource:state.timetableSource,
      manualStop:state.manualStop,
      stop:state.stop,
      ttStop:state.ttStop
    };
    const lat=52.5, lon=-1.9, oppositeLon=-1.89975;
    const A='490012345', B='490012346';
    const officialA={id:A,timetableId:A,atco:A,code:A,source:'official',name:'High Street',ind:'',lat,lon,d:10};
    const officialB={id:B,timetableId:B,atco:B,code:B,source:'official',name:'High Street',ind:'',lat,lon:oppositeLon,d:24};
    const osmDuplicate={id:12345,atco:A,source:'osm',name:'High Street',ind:'',lat:lat+0.00001,lon:lon+0.00001,d:11};
    const unrelated={id:'OTHER',source:'official',name:'Market Street',ind:'',lat,lon:oppositeLon,d:24};
    try{
      const distinctOfficialMerged=api.sameDiscoveredStop(officialA,officialB);
      const officialOsmMerged=api.sameDiscoveredStop(officialA,osmDuplicate);
      const pairDetected=api.likelyOppositeStopPair(officialA,officialB);
      const deviceOrigin={source:'device',accuracy:12,label:'My location'};
      const manualOrigin={source:'manual',accuracy:null,label:'High Street'};
      const deviceCandidates=api.stopSelectionCandidates([officialA,officialB],deviceOrigin).map(stop=>String(stop.id));
      const deviceChoice=api.stopSelectionNeedsChoice([officialA,officialB],deviceOrigin);
      const manualChoice=api.stopSelectionNeedsChoice([officialA,officialB],manualOrigin);
      const manualUnrelated=api.stopSelectionNeedsChoice([officialA,unrelated],manualOrigin);

      state.timetable={
        stops:{
          [A]:{n:'High Street',ind:'',ll:[lat,lon],c:A,sms:'A1'},
          [B]:{n:'High Street',ind:'',ll:[lat,oppositeLon],c:B,sms:'B1'}
        },
        services:{},tripPatterns:{},patterns:{}
      };
      state.timetableSource='national';
      state.manualStop=false;
      const midpoint={id:'osm-mid',source:'osm',name:'High Street',ind:'',lat,lon:(lon+oppositeLon)/2};
      const ambiguousTimetable=api.matchTimetableStop(midpoint);
      const exactTimetable=api.matchTimetableStop(officialA);
      state.stop={...officialA,ind:'A'};
      state.ttStop={id:A,ind:'A'};
      const exactStopFacts=api.stopFactsHtml(state.stop);
      api.updateStopMeta();
      const exactStopInfo=document.getElementById('stopSource').textContent;

      const patternStops=[
        {id:'LOCAL-A',name:'High Street',lat,lon,along:100,sequence:10},
        {id:'LOCAL-B',name:'High Street',lat,lon:oppositeLon,along:130,sequence:11}
      ];
      const ambiguousPattern=api.selectedPatternStopIndex(patternStops,midpoint,null,null);
      const sequencedPattern=api.selectedPatternStopIndex(patternStops,midpoint,null,11);

      return {
        distinctOfficialMerged,officialOsmMerged,pairDetected,deviceCandidates,deviceChoice,manualChoice,manualUnrelated,
        ambiguousTimetable:ambiguousTimetable&&ambiguousTimetable.id,
        exactTimetable:exactTimetable&&exactTimetable.id,
        ambiguousPattern,sequencedPattern,exactStopFacts,exactStopInfo
      };
    } finally {
      Object.assign(state,saved);
    }
  });

  assert.equal(result.distinctOfficialMerged,false,'different authoritative stop ids must never be proximity-merged');
  assert.equal(result.officialOsmMerged,true,'an OSM duplicate carrying the same ATCO id should still merge');
  assert.equal(result.pairDetected,true,'same-name authoritative stands across a short road gap should be recognised as a pair');
  assert.deepEqual(result.deviceCandidates.sort(),['490012345','490012346'],'the opposite stand should remain a candidate even just outside optimistic GPS accuracy');
  assert.equal(result.deviceChoice,true,'optimistic device accuracy must not auto-pick one side of a plausible stop pair');
  assert.equal(result.manualChoice,true,'a searched/manual point between plausible paired stands must ask for the stand');
  assert.equal(result.manualUnrelated,false,'two nearby stops with unrelated names must not trigger a false side-choice prompt');
  assert.equal(result.ambiguousTimetable,null,'nearby timetable fallback must refuse two comparable opposite stands');
  assert.equal(result.exactTimetable,'490012345','an exact authoritative timetable stop code must still win immediately');
  assert.equal(result.ambiguousPattern,-1,'pattern fallback must not choose between two comparable opposite calls by metres alone');
  assert.equal(result.sequencedPattern,1,'an explicit stop sequence remains authoritative enough to choose the call');
  assert.doesNotMatch(result.exactStopFacts,/Stop A|ATCO 490012345/,'stop identity must not be duplicated in the visible facts line');
  assert.match(result.exactStopInfo,/Stop A/,'the selected stand indicator must remain available in the info panel');
  assert.match(result.exactStopInfo,/Stop reference 490012345/,'the exact national stop code must remain available in the info panel for side-of-road verification');
  assert.deepEqual(pageErrors,[],'stop-side regression page should not raise browser errors');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}

console.log('Stop-side regression passed.');
