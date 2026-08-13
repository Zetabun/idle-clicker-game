import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const baseSource=await fs.readFile(path.join(root,'kerbside-train-loading.js'),'utf8');
const guidanceSource=await fs.readFile(path.join(root,'kerbside-train-loading-guidance.js'),'utf8');

function api(){
  const window={};
  const context={window,console};
  vm.createContext(context);
  vm.runInContext(baseSource,context);
  vm.runInContext(guidanceSource,context);
  return window.__KERBSIDE_TRAIN_LOADING__;
}

test('coach guidance excludes first class when standard-class evidence exists',()=>{
  const loading=api();
  const live=loading.fromFormation({coaches:[
    {number:'A',coachClass:'First',loading:5,loadingSpecified:true},
    {number:'B',coachClass:'Standard',loading:40,loadingSpecified:true},
    {number:'C',coachClass:'Standard',loading:80,loadingSpecified:true}
  ]});
  assert.equal(live.average,60);
  assert.equal(live.classBasis,'standard-class');
  assert.equal(live.classCounts.first,1);
  assert.equal(live.classCounts.standard,2);
  assert.equal(live.quieter.numbers.join(','),'B');
  assert.equal(live.spread.minimum,40);
  assert.equal(live.spread.maximum,80);
});

test('two-coach guidance needs at least a 20-point separation',()=>{
  const loading=api();
  const close=loading.fromFormation({coaches:[
    {number:'1',loading:40,loadingSpecified:true},
    {number:'2',loading:59,loadingSpecified:true}
  ]});
  assert.equal(close.quieter,null);
  const separated=loading.fromFormation({coaches:[
    {number:'1',loading:40,loadingSpecified:true},
    {number:'2',loading:60,loadingSpecified:true}
  ]});
  assert.equal(separated.quieter.numbers.join(','),'1');
  assert.equal(separated.quieter.separatingGap,20);
});

test('multi-coach guidance can recommend a lower-loaded group',()=>{
  const loading=api();
  const live=loading.fromFormation({coaches:[
    {number:'1',loading:28,loadingSpecified:true},
    {number:'2',loading:32,loadingSpecified:true},
    {number:'3',loading:65,loadingSpecified:true},
    {number:'4',loading:70,loadingSpecified:true}
  ]});
  assert.equal(live.quieter.numbers.join(','),'1,2');
  assert.equal(live.quieter.lowerAverage,30);
  assert.equal(live.quieter.higherAverage,67.5);
  assert.equal(live.quieter.separatingGap,33);
  assert.equal(live.spread.variation,'Large variation');
});

test('guidance copy stays relative and preserves Forecast v4 fallback',()=>{
  const loading=api();
  const fallback={level:'moderate',label:'Moderate',confidence:'Medium',score:2,reasons:['Forecast v4 baseline'],modelVersion:4};
  const result=loading.applyToForecast(fallback,{formation:{coaches:[
    {number:'A',loading:35,loadingSpecified:true},
    {number:'B',loading:75,loadingSpecified:true}
  ]}});
  const html=loading.explainMarkup(result);
  assert.equal(result.forecastFallback.modelVersion,4);
  assert.match(html,/Relatively lower-loaded coach/);
  assert.match(html,/does not guarantee seats/i);
  assert.match(html,/falls back to Forecast v4/i);
});
