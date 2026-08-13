import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const source=await fs.readFile(path.join(root,'kerbside-train-loading.js'),'utf8');

function api(){
  const window={};
  const context={window,console};
  vm.createContext(context);
  vm.runInContext(source,context);
  return window.__KERBSIDE_TRAIN_LOADING__;
}

test('missing loadingSpecified never becomes direct evidence',()=>{
  const loading=api();
  assert.equal(loading.fromFormation({coaches:[{number:'A',loading:95,loadingSpecified:false}]}),null);
  const base={level:'quiet',label:'Quiet',confidence:'Medium',score:1,reasons:['Forecast v4 baseline']};
  assert.deepEqual(loading.applyToForecast(base,{formation:{coaches:[{number:'A',loading:95,loadingSpecified:false}]}}),base);
});

test('specified standard-class coach loading overrides Forecast v4 headline',()=>{
  const loading=api();
  const base={level:'quiet',label:'Quiet',confidence:'Medium',score:1,reasons:['Forecast v4 baseline'],modelVersion:4};
  const service={formation:{coaches:[
    {number:'A',coachClass:'First',loading:20,loadingSpecified:true},
    {number:'B',coachClass:'Standard',loading:72,loadingSpecified:true},
    {number:'C',coachClass:'Standard',loading:78,loadingSpecified:true}
  ]}};
  const result=loading.applyToForecast(base,service);
  assert.equal(result.level,'busy');
  assert.equal(result.label,'Busy');
  assert.equal(result.confidence,'High');
  assert.equal(result.evidenceKind,'live-train-loading');
  assert.equal(result.liveLoading.average,75);
  assert.equal(result.liveLoading.headlineCoaches,2);
  assert.equal(result.liveLoading.classBasis,'standard-class');
  assert.equal(result.forecastFallback.modelVersion,4);
});

test('Kerbside loading bands are deterministic at boundaries',()=>{
  const loading=api();
  assert.equal(loading.bandFor(0).level,'quiet');
  assert.equal(loading.bandFor(34.9).level,'quiet');
  assert.equal(loading.bandFor(35).level,'moderate');
  assert.equal(loading.bandFor(64.9).level,'moderate');
  assert.equal(loading.bandFor(65).level,'busy');
  assert.equal(loading.bandFor(84.9).level,'busy');
  assert.equal(loading.bandFor(85).level,'very-busy');
  assert.equal(loading.bandFor(100).level,'very-busy');
});

test('quieter-coach advice requires a meaningful gap',()=>{
  const loading=api();
  const close=loading.fromFormation({coaches:[
    {number:'1',loading:60,loadingSpecified:true},{number:'2',loading:69,loadingSpecified:true}
  ]});
  assert.equal(close.quieter,null);
  const spread=loading.fromFormation({coaches:[
    {number:'1',loading:40,loadingSpecified:true},{number:'2',loading:73,loadingSpecified:true},{number:'3',loading:79,loadingSpecified:true}
  ]});
  assert.equal(spread.quieter.number,'1');
  assert.equal(spread.quieter.loading,40);
});

test('invalid coach values and aggregate-only fields are not called live',()=>{
  const loading=api();
  assert.equal(loading.fromFormation({avgLoadingSpecified:true,avgLoading:91,coaches:[]}),null);
  assert.equal(loading.fromFormation({coaches:[{number:'A',loading:120,loadingSpecified:true}]}),null);
  assert.equal(loading.fromFormation({coaches:[{number:'A',loading:null,loadingSpecified:true}]}),null);
});

test('coach markup carries direct provenance without claiming passenger counts',()=>{
  const loading=api();
  const result=loading.applyToForecast({level:'moderate',label:'Moderate',confidence:'Low',reasons:[]},{formation:{coaches:[
    {number:'A',loading:42,loadingSpecified:true},{number:'B',loading:82,loadingSpecified:true}
  ]}});
  const html=loading.explainMarkup(result);
  assert.match(html,/Live train-loading evidence/);
  assert.match(html,/Coach A/);
  assert.match(html,/42%/);
  assert.match(html,/not a passenger count/i);
  assert.match(html,/falls back to Forecast v4/i);
});
