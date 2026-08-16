import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const eventsSource=await fs.readFile(path.join(root,'kerbside-train-events.js'),'utf8');
const forecastSource=await fs.readFile(path.join(root,'kerbside-train-forecast-v4.js'),'utf8');
class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-08-16T12:00:00Z']));}static now(){return new Date('2026-08-16T12:00:00Z').getTime();}}
function storage(seed=new Map()){return {data:seed,getItem:key=>seed.has(key)?seed.get(key):null,setItem:(key,value)=>seed.set(key,String(value)),removeItem:key=>seed.delete(key)};}
const documentStub={readyState:'loading',addEventListener(){},getElementById(){return null;}};
function loadEvents(fetchImpl,store){const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_FORECAST_V3__:{apply(){}}};const context={window,document:documentStub,Date:FixedDate,Intl,console,localStorage:store,setTimeout,clearTimeout,AbortController,fetch:fetchImpl};vm.createContext(context);vm.runInContext(eventsSource,context);return context.window.__KERBSIDE_EVENTS__;}
function loadForecast(){const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_TRAINS__:{state:{},crowdingForecast(){return {score:1.8,reasons:[],confidence:'Low'};}}};const context={window,document:documentStub,Date:FixedDate,Intl,console,localStorage:storage(),setTimeout,clearTimeout,fetch:async()=>{throw new Error('network not expected');},requestAnimationFrame(){return 1;},MutationObserver:class{observe(){} disconnect(){}}};vm.createContext(context);vm.runInContext(forecastSource,context);return context.window.__KERBSIDE_FORECAST_V4__;}

test('Wikidata arena events persist and survive a temporary source outage',async()=>{
  const store=storage();let calls=0;
  const payload={results:{bindings:[{eventLabel:{value:'Birmingham Arena Concert'},time:{value:'2026-09-12T18:30:00Z'},end:{value:'2026-09-12T21:30:00Z'},locationLabel:{value:'Utilita Arena Birmingham'},areaLabel:{value:'Birmingham'},capacity:{value:'15500'}}]}};
  const first=loadEvents(async()=>{calls++;return {ok:true,status:200,json:async()=>payload};},store);
  const journey={origin:'Birmingham New Street',destination:'Bristol Temple Meads',interchanges:[],date:'2026-09-12'};
  const rows=await first.wikidataEventsForJourney(journey);assert.equal(calls,1);assert.equal(rows.length,1);assert.equal(rows[0].title,'Birmingham Arena Concert');assert.equal(rows[0].place,'Utilita Arena Birmingham, Birmingham');assert.equal(rows[0].attendance,15500);assert.equal(first.state.sourceStatus.wikidata.status,'ready');
  const saved=JSON.parse(store.getItem('kerbside.rail.wikidata.v1'));for(const entry of Object.values(saved.entries))entry.ts=FixedDate.now()-7*60*60*1000;store.setItem('kerbside.rail.wikidata.v1',JSON.stringify(saved));
  const second=loadEvents(async()=>{throw new Error('synthetic Wikidata outage');},store);const fallback=await second.wikidataEventsForJourney(journey);assert.equal(fallback.length,1);assert.equal(fallback[0].title,'Birmingham Arena Concert');assert.equal(second.state.sourceStatus.wikidata.status,'stale');
});

test('bank holidays remain separated by GOV.UK division',()=>{
  const api=loadForecast(),birmingham={name:'Birmingham New Street',crs:'BHM'},glasgow={name:'Glasgow Central',crs:'GLC'};
  assert.equal(api.bankHolidayDivision(birmingham),'england-and-wales');assert.equal(api.bankHolidayDivision(glasgow),'scotland');
  assert.equal(api.isBankHoliday(new FixedDate('2026-08-03T12:00:00Z'),birmingham),false,'Scottish summer bank holiday must not inflate Birmingham');
  assert.equal(api.isBankHoliday(new FixedDate('2026-08-03T12:00:00Z'),glasgow),true);
  assert.equal(api.isBankHoliday(new FixedDate('2026-08-31T12:00:00Z'),birmingham),true);
  assert.equal(api.isBankHoliday(new FixedDate('2026-08-31T12:00:00Z'),glasgow),false,'England/Wales summer bank holiday must not inflate Glasgow');
  const divisions=api.normaliseBankHolidayPayload({'england-and-wales':{events:[{date:'2026-08-31'}]},scotland:{events:[{date:'2026-08-03'}]},'northern-ireland':{events:[{date:'2026-07-13'}]}});api.applyBankHolidayDivisions(divisions,'test');
  assert.equal(api.isBankHoliday(new FixedDate('2026-08-03T12:00:00Z'),birmingham),false);assert.equal(api.isBankHoliday(new FixedDate('2026-08-03T12:00:00Z'),glasgow),true);assert.equal(api.state.calendarStatus,'test');
});
