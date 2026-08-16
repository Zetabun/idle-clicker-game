import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(here,'..','..');
const source=await fs.readFile(path.join(repoRoot,'kerbside-journey-planner-core.js'),'utf8');

function loadPlanner(){
  const store=new Map();
  const context={
    console,URL,AbortController,Response,setTimeout,clearTimeout,setInterval(){return 0;},clearInterval(){},
    location:{href:'https://example.test/bus.html'},
    localStorage:{getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value))},
    document:{readyState:'loading',addEventListener(){},getElementById(){return null;}},
    window:{fetch:async()=>new Response('{}',{status:200})}
  };
  vm.createContext(context);vm.runInContext(source,context);return context.window.__KERBSIDE_JOURNEY_PLANNER__;
}
function candidates(){return [
  {id:'fast',departureMinute:540,arrivalMinute:600,totalMinutes:60,changes:1,connectionMinutes:14,minimumConnectionMinutes:10,recoveryOptions:[],forecast:{score:4.0}},
  {id:'quiet-direct',departureMinute:550,arrivalMinute:630,totalMinutes:80,changes:0,recoveryOptions:[],forecast:{score:1.0}},
  {id:'later-direct',departureMinute:560,arrivalMinute:650,totalMinutes:90,changes:0,recoveryOptions:[],forecast:{score:2.4}}
];}

test('Fastest preference ranks the earliest-arriving candidate first',()=>{
  const api=loadPlanner();assert.equal(api.planRankEnriched(candidates(),'fastest')[0].id,'fast');
});
test('Quieter preference is driven by Forecast v4 score',()=>{
  const api=loadPlanner();assert.equal(api.planRankEnriched(candidates(),'quieter')[0].id,'quiet-direct');
});
test('Fewer changes preference favours a direct train',()=>{
  const api=loadPlanner();assert.equal(api.planRankEnriched(candidates(),'fewer-changes')[0].changes,0);
});
test('Least stressful preference penalises tight changes and high forecast crowding',()=>{
  const api=loadPlanner(),rows=candidates(),ranked=api.planRankEnriched(rows,'least-stressful');
  assert.equal(ranked[0].id,'quiet-direct');
  assert.ok(api.planConnectionStress(rows.find(row=>row.id==='fast'))>.5);
});
