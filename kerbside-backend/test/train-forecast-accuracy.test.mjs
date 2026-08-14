import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..','..'),source=await fs.readFile(path.join(root,'kerbside-trains.js'),'utf8');
function storage(){const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),data};}
function load(){const localStorage=storage(),window={addEventListener(){},dispatchEvent(){}},document={readyState:'loading',addEventListener(){},getElementById(){return null;},createElement(){return {innerHTML:'',textContent:''};}};const context={window,document,console,URL,Date,Intl,localStorage,setTimeout,clearTimeout,setInterval(){return 0;},clearInterval(){},AbortController,CustomEvent:class{constructor(type,opts={}){this.type=type;this.detail=opts.detail;}},fetch:async()=>{throw new Error('network not expected');}};vm.createContext(context);vm.runInContext(source,context);return {api:window.__KERBSIDE_TRAINS__,window,localStorage};}
test('crowding reports validate Forecast v4 locally without storing journey identity',()=>{const {api,window}=load(),service={std:'10:00',operator:'Test',operatorCode:'ZZ',destination:[{crs:'BRI'}],origin:[{crs:'BHM'}]};api.state.station={name:'Birmingham New Street',crs:'BHM'};api.state.services=[service];api.state.board={generatedAt:'2026-08-12T09:55:00Z',nrccMessages:[]};window.__KERBSIDE_FORECAST_V4__={forecast(){return {level:'moderate',score:2,accuracyBucket:'live|fallback|single|no-formation|no-event'};}};assert.equal(api.recordCrowdingFeedback(service,0,'busy'),true);const summary=api.forecastAccuracySummary();assert.equal(summary.total,1);assert.equal(summary.exact,0);assert.equal(summary.withinOne,1);assert.equal(summary.meanAbsoluteError,1);const row=api.state.forecastAccuracy.recent[0];assert.deepEqual(Object.keys(row).sort(),['actual','bucket','error','predicted','source','ts']);
/* `source` says which population a sample came from — a passenger tap or an
   automatic check against Darwin's reported coach loading — because the two
   cannot be averaged together and still describe the model. It is a closed set
   of two constants, asserted here so it can never become a route by which
   station, service or journey identity reaches storage. */
assert.ok(['feedback','darwin-loading'].includes(row.source),`unexpected accuracy sample source: ${row.source}`);
assert.equal(row.source,'feedback','a sample recorded through the feedback control must say so');assert.equal(api.recordCrowdingFeedback(service,0,'very-busy'),false,'same observation cannot be counted twice');assert.equal(api.forecastAccuracySummary().total,1);});

test('objective loading samples store no more than a feedback sample does',()=>{
  const {api,window}=load();
  const service={std:'10:00',operator:'Test',operatorCode:'ZZ',destination:[{crs:'BRI'}],origin:[{crs:'BHM'}],
    formation:{coaches:[
      {number:'A',coachNumber:'A',loading:90,loadingSpecified:true,coachClass:'Standard'},
      {number:'B',coachNumber:'B',loading:94,loadingSpecified:true,coachClass:'Standard'}
    ]}};
  const bare={std:'10:30',operator:'Test',operatorCode:'ZZ',destination:[{crs:'BRI'}],origin:[{crs:'BHM'}],
    formation:{coaches:[{number:'A',coachNumber:'A',loading:null,loadingSpecified:false}]}};
  api.state.station={name:'Birmingham New Street',crs:'BHM'};
  api.state.services=[service,bare];
  api.state.board={generatedAt:'2026-08-12T09:55:00Z',nrccMessages:[]};
  window.__KERBSIDE_FORECAST_V4__={forecast(){return {level:'moderate',score:2,accuracyBucket:'live|fallback|single|formation|no-event'};}};
  window.__KERBSIDE_TRAIN_LOADING__={evidenceFor(target){
    const coaches=(target&&target.formation&&target.formation.coaches||[]).filter(coach=>coach.loadingSpecified===true);
    if(!coaches.length) return null;
    const average=coaches.reduce((sum,coach)=>sum+coach.loading,0)/coaches.length;
    return {available:true,level:'very-busy',average};
  }};
  assert.equal(api.recordObservedAccuracy(),1,'only the service with specified loading may be sampled');
  const row=api.state.forecastAccuracy.recent[0];
  assert.deepEqual(Object.keys(row).sort(),['actual','bucket','error','predicted','source','ts'],
    'an automatic sample must store exactly the same fields as a feedback sample');
  assert.equal(row.source,'darwin-loading');
  assert.equal(api.forecastAccuracyForSource('darwin-loading').total,1);
  assert.equal(api.forecastAccuracyForSource('feedback').total,0,'the two populations must stay separable');
  assert.equal(api.recordObservedAccuracy(),0,'unchanged loading must not be sampled twice');
});
