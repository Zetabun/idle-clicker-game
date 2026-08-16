#!/usr/bin/env python3
from pathlib import Path
import re, subprocess

VERSION='0.9.27'

def replace_once(path, old, new):
    p=Path(path); text=p.read_text(encoding='utf-8'); count=text.count(old)
    if count!=1: raise SystemExit(f'{path}: expected one exact anchor, found {count}: {old[:90]!r}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

def regex_once(path, pattern, replacement, flags=re.S):
    p=Path(path); text=p.read_text(encoding='utf-8'); out,count=re.subn(pattern,replacement,text,count=1,flags=flags)
    if count!=1: raise SystemExit(f'{path}: expected one regex anchor, found {count}: {pattern[:100]!r}')
    p.write_text(out,encoding='utf-8')

# ---------------------------------------------------------------------------
# General events: persistent last-known-good Wikidata cache + source health.
replace_once('kerbside-train-events.js',
"""const FETCH_TIMEOUT_MS=7000;
const MEMORY_CACHE_MS=30*60*1000;
const FIXTURE_CACHE_MS=7*24*60*60*1000;
/* v2 deliberately invalidates the old cache: v1 could contain the previous
   season after the generated JSON mirror returned 404 for a new season. */
const FIXTURE_STORE='kerbside.rail.fixtures.v2';

const state={events:[],updatedAt:0,status:'idle',date:'',sources:[]};
""",
"""const FETCH_TIMEOUT_MS=7000;
const WIKIDATA_TIMEOUT_MS=15000;
const MEMORY_CACHE_MS=30*60*1000;
const WIKIDATA_CACHE_MS=6*60*60*1000;
const WIKIDATA_STALE_MS=72*60*60*1000;
const WIKIDATA_STORE='kerbside.rail.wikidata.v1';
const WIKIDATA_MAX_ENTRIES=32;
const FIXTURE_CACHE_MS=7*24*60*60*1000;
/* v2 deliberately invalidates the old cache: v1 could contain the previous
   season after the generated JSON mirror returned 404 for a new season. */
const FIXTURE_STORE='kerbside.rail.fixtures.v2';

const state={events:[],updatedAt:0,status:'idle',date:'',sources:[],sourceStatus:{football:{status:'idle',updatedAt:0},wikidata:{status:'idle',updatedAt:0}}};
""")
replace_once('kerbside-train-events.js',
"""let fixtureIndex=null;
let fixturePromise=null;

const clamp=""",
"""let fixtureIndex=null;
let fixturePromise=null;
function markSource(name,status,detail={}){state.sourceStatus[name]={status,updatedAt:Date.now(),...detail};return state.sourceStatus[name];}
function readWikidataStore(){try{const raw=JSON.parse(localStorage.getItem(WIKIDATA_STORE)||'null');return raw&&raw.entries&&typeof raw.entries==='object'?raw:{entries:{}};}catch(error){return {entries:{}};}}
function writeWikidataStore(store){try{const entries=Object.entries(store&&store.entries||{}).sort((a,b)=>Number(b[1]&&b[1].ts||0)-Number(a[1]&&a[1].ts||0)).slice(0,WIKIDATA_MAX_ENTRIES);localStorage.setItem(WIKIDATA_STORE,JSON.stringify({entries:Object.fromEntries(entries)}));}catch(error){}}
function wikidataStoredEntry(key){const store=readWikidataStore(),entry=store.entries[key];return entry&&Array.isArray(entry.rows)&&Number(entry.ts)?{store,entry}:null;}
function saveWikidataEntry(key,rows){const store=readWikidataStore();store.entries[key]={ts:Date.now(),rows:Array.isArray(rows)?rows:[]};writeWikidataStore(store);}

const clamp=""")
regex_once('kerbside-train-events.js',r"async function fetchJson\(url,signal\)\{\n  const controller=new AbortController\(\);\n  const timer=setTimeout\(\(\)=>controller\.abort\(\),FETCH_TIMEOUT_MS\);",
"""async function fetchJson(url,signal,timeoutMs=FETCH_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);""")
regex_once('kerbside-train-events.js',r"async function footballEventsFor\(dateStamp\)\{.*?\n\}\n\n/\* --------------------------------------------------------------- \*/\nfunction sparqlForJourney",
"""async function footballEventsFor(dateStamp){
  markSource('football','loading',{date:dateStamp});
  try{
    const index=await loadFixtures(dateStamp),rows=(index[dateStamp]||[]).map(match=>({
      title:match.title,place:match.place,startTime:match.startTime,endTime:'',attendance:Math.round(match.capacity*0.85),confidence:0.9,type:'football',source:'openfootball (public domain)'
    }));
    markSource('football','ready',{date:dateStamp,count:rows.length});return rows;
  }catch(error){markSource('football','error',{date:dateStamp,error:String(error&&error.message||error||'unavailable')});return [];}
}

/* --------------------------------------------------------------- */
function sparqlForJourney""")
regex_once('kerbside-train-events.js',r"async function wikidataEventsForJourney\(journey\)\{.*?\n\}\nif\(!window\.__KERBSIDE_EVENT_SOURCE__\)",
"""async function wikidataEventsForJourney(journey){
  const query=sparqlForJourney(journey);if(!query)return [];
  const places=[locality(journey.origin),locality(journey.destination),...(Array.isArray(journey.interchanges)?journey.interchanges.map(locality):[])].filter(Boolean).sort().join('|');
  const key=`wd|${journey.date}|${places}`.toLowerCase(),memory=cache.get(key);
  if(memory&&Date.now()-memory.ts<MEMORY_CACHE_MS){markSource('wikidata','cached',{date:journey.date,count:memory.rows.length,ageMs:Date.now()-memory.ts});return memory.rows;}
  const stored=wikidataStoredEntry(key),age=stored?Date.now()-stored.entry.ts:Infinity;
  if(stored&&age<WIKIDATA_CACHE_MS){cache.set(key,stored.entry);markSource('wikidata','cached',{date:journey.date,count:stored.entry.rows.length,ageMs:age});return stored.entry.rows;}
  markSource('wikidata','loading',{date:journey.date});
  try{
    const json=await fetchJson(`${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`,null,WIKIDATA_TIMEOUT_MS),rows=rowsToEvents(json&&json.results&&json.results.bindings);
    const entry={ts:Date.now(),rows};cache.set(key,entry);saveWikidataEntry(key,rows);markSource('wikidata','ready',{date:journey.date,count:rows.length});return rows;
  }catch(error){
    if(stored&&age<WIKIDATA_STALE_MS){cache.set(key,stored.entry);markSource('wikidata','stale',{date:journey.date,count:stored.entry.rows.length,ageMs:age,error:String(error&&error.message||error||'unavailable')});return stored.entry.rows;}
    markSource('wikidata','error',{date:journey.date,error:String(error&&error.message||error||'unavailable')});throw error;
  }
}
if(!window.__KERBSIDE_EVENT_SOURCE__)""")

# ---------------------------------------------------------------------------
# Plan My Journey: baseline results stay usable while slow event sources finish;
# each source reranks independently as it arrives instead of being discarded by
# one shared timeout.
regex_once('kerbside-journey-planner-core.js',r"async function loadPlanEvents\(from,to,date,candidates\)\{.*?\n\}\nasync function searchPlanJourneys",
"""function planMergeEventRows(buckets){const rows=[...(buckets.football||[]),...(buckets.wikidata||[])],seen=new Set();return rows.filter(item=>{const key=`${String(item&&item.title||'').toLowerCase()}|${String(item&&item.startTime||'')}`;if(!key||seen.has(key))return false;seen.add(key);return true;});}
function loadPlanEvents(from,to,date,candidates,{onUpdate}={}){
  const api=window.__KERBSIDE_EVENTS__;if(!api)return Promise.resolve([]);
  const interchanges=[...new Set((candidates||[]).map(item=>planInterchangeStation(item)?.name).filter(Boolean))].slice(0,4),journey={origin:from.name,originCrs:from.crs,destination:to.name,destinationCrs:to.crs,interchanges,date};
  const buckets={football:[],wikidata:[]},status={football:'loading',wikidata:'loading'};
  const emit=()=>{const events=planMergeEventRows(buckets),pending=Object.values(status).filter(value=>value==='loading').length;if(typeof onUpdate==='function')onUpdate(events,{...status,pending});return events;};
  const run=async(kind,work)=>{try{const rows=await Promise.resolve().then(work);buckets[kind]=Array.isArray(rows)?rows:[];status[kind]='ready';}catch(error){buckets[kind]=[];status[kind]='error';}emit();};
  return Promise.allSettled([
    run('football',()=>typeof api.footballEventsFor==='function'?api.footballEventsFor(date):[]),
    run('wikidata',()=>typeof api.wikidataEventsForJourney==='function'?api.wikidataEventsForJourney(journey):[])
  ]).then(()=>emit());
}
async function searchPlanJourneys""")
replace_once('kerbside-journey-planner-core.js',
"""    const eventSeq=++planState.eventSeq,events=await loadPlanEvents(from,to,date,eligibleCandidates);
    if(seq!==planState.searchSeq||eventSeq!==planState.eventSeq||!events)return;
    const updated=planRankEnriched(enrichPlanCandidates(eligibleCandidates,from,to,date,events),planState.preference);planState.results=updated;planState.eventsReady=true;renderPlanResults(updated,{eventsReady:true});
    planSetMessage(planComparisonMessage(windowCandidates.length,eligibleCandidates.length,{eventsReady:true}));
""",
"""    const eventSeq=++planState.eventSeq;
    const applyEventRows=(events,status={})=>{if(seq!==planState.searchSeq||eventSeq!==planState.eventSeq)return;const updated=planRankEnriched(enrichPlanCandidates(eligibleCandidates,from,to,date,events),planState.preference);planState.results=updated;planState.eventsReady=true;renderPlanResults(updated,{eventsReady:true});const pending=Number(status.pending)||0;planSetMessage(pending?`${planComparisonMessage(windowCandidates.length,eligibleCandidates.length)} Event sources still updating…`:planComparisonMessage(windowCandidates.length,eligibleCandidates.length,{eventsReady:true}));};
    loadPlanEvents(from,to,date,eligibleCandidates,{onUpdate:applyEventRows}).catch(()=>{});
""")

# Browser regression: prove a slow general-event source cannot block the first
# ranked results, then prove it reranks them when it eventually arrives.
replace_once('kerbside-backend/tests/train-journey-planner-regression.mjs',
"""    const events=window.__KERBSIDE_EVENTS__;events.footballEventsFor=async()=>[];events.wikidataEventsForJourney=async()=>[];
""",
"""    const events=window.__KERBSIDE_EVENTS__;events.footballEventsFor=async()=>[];events.wikidataEventsForJourney=async()=>{await new Promise(resolve=>setTimeout(resolve,650));return [{title:'Bristol Arena Concert',place:'Bristol',startTime:'10:00',capacity:15000,confidence:.8,type:'event',source:'Wikidata (CC0)'}];};
""")
replace_once('kerbside-backend/tests/train-journey-planner-regression.mjs',
"""    forecast.forecast=service=>{
      const id=String(service&&service.serviceID||'');
      if(id==='PLAN-QUIET')return {score:.8,label:'Quiet',level:'quiet',confidence:'High',probabilities:{quiet:.75,moderate:.18,busy:.05,veryBusy:.02},reasons:['lower measured demand at this time']};
""",
"""    forecast.forecast=service=>{
      const id=String(service&&service.serviceID||''),lateEvent=window.__KERBSIDE_EVENTS__?.state?.events?.some(event=>/Bristol Arena Concert/.test(String(event&&event.title||'')));
      if(id==='PLAN-QUIET')return lateEvent?{score:1.8,label:'Moderate',level:'moderate',confidence:'High',probabilities:{quiet:.25,moderate:.55,busy:.16,veryBusy:.04},reasons:['Bristol Arena Concert — general event context arrived after the first results']}:{score:.8,label:'Quiet',level:'quiet',confidence:'High',probabilities:{quiet:.75,moderate:.18,busy:.05,veryBusy:.02},reasons:['lower measured demand at this time']};
""")
replace_once('kerbside-backend/tests/train-journey-planner-regression.mjs',
"""  assert.match(planCards[0],/Best match for Quieter/);
  assert.match(await page.locator('#planJourneyMeta').textContent(),/Network Rail SCHEDULE/);
""",
"""  assert.match(planCards[0],/Best match for Quieter/);
  assert.equal(await page.locator('#planJourneySearch').isDisabled(),false,'initial ranked results must be usable before slow Wikidata settles');
  await page.waitForFunction(()=>/Bristol Arena Concert/.test(document.querySelector('#planJourneyResults')?.textContent||''),undefined,{timeout:4000});
  assert.match(await page.locator('#planJourneyMeta').textContent(),/Network Rail SCHEDULE/);
""")

# ---------------------------------------------------------------------------
# Forecast v4 bank holidays: keep each GOV.UK division separate and use a
# region-specific deterministic fallback instead of the previous UK-wide union.
replace_once('kerbside-train-forecast-v4.js',
"""const CACHE_KEY = 'kerbside.rail.forecast.v3.calendar';
const CACHE_MS = 24*60*60*1000;
const MAX_EVENT_PRESSURE = 0.8;
const state = {bankHolidays:new Set(), calendarReady:false, observer:null, scheduled:false};
""",
"""const CACHE_KEY = 'kerbside.rail.forecast.v4.calendar.v2';
const CACHE_MS = 24*60*60*1000;
const CACHE_STALE_MS = 30*24*60*60*1000;
const MAX_EVENT_PRESSURE = 0.8;
const state = {bankHolidays:new Set(),bankHolidaysByDivision:{'england-and-wales':new Set(),scotland:new Set(),'northern-ireland':new Set()},bankHolidayYears:{'england-and-wales':new Set(),scotland:new Set(),'northern-ireland':new Set()},calendarReady:false,calendarStatus:'idle',calendarUpdatedAt:0,observer:null,scheduled:false};
""")
regex_once('kerbside-train-forecast-v4.js',r"const DFT_BANK_HOLIDAY_CACHE=new Map\(\);\nfunction dftBankHolidayKeys\(year\)\{.*?\n\}\nfunction isBankHoliday\(date\)\{.*?\}",
"""const DFT_BANK_HOLIDAY_CACHE=new Map();
const SCOTTISH_CRS=new Set(['ABD','EDB','GLC','GLQ','DUN','INV','PER','STG','AYR','KLM','MTH','PAI','HYM','FTW','OBN','DUM','FAL','FKG','KIR','KDY','LIN','LIV','AIR']);
const SCOTTISH_PLACE_RE=/\\b(aberdeen|airdrie|arbroath|ayr|bathgate|cumbernauld|dumfries|dundee|dunfermline|edinburgh|elgin|falkirk|fort william|glasgow|gourock|greenock|hamilton|helensburgh|inverness|irvine|kilmarnock|kirkcaldy|lanark|largs|linlithgow|livingston|motherwell|oban|paisley|perth|pitlochry|prestwick|stirling|stranraer)\\b/i;
function bankHolidayDivision(station){const raw=String(station&&(station.region||station.country||station.nation)||'').toLowerCase(),name=String(station&&(station.name||station.locationName)||''),crs=String(station&&station.crs||'').toUpperCase();if(raw.includes('scot'))return'scotland';if(raw.includes('northern ireland'))return'northern-ireland';if(SCOTTISH_CRS.has(crs)||SCOTTISH_PLACE_RE.test(name))return'scotland';return'england-and-wales';}
function dftBankHolidayKeys(year,division='england-and-wales'){
  const cacheKey=`${division}|${year}`;if(DFT_BANK_HOLIDAY_CACHE.has(cacheKey))return DFT_BANK_HOLIDAY_CACHE.get(cacheKey);const set=new Set();
  dftHolidayAdd(set,year,1,1,true);
  if(division==='scotland')dftHolidayAdd(set,year,1,2,true);
  if(division==='northern-ireland')dftHolidayAdd(set,year,3,17,true);
  const easter=dftEasterSunday(year),goodFriday=new Date(easter),easterMonday=new Date(easter);goodFriday.setUTCDate(goodFriday.getUTCDate()-2);easterMonday.setUTCDate(easterMonday.getUTCDate()+1);let p=dftUtcYmd(goodFriday);dftHolidayAdd(set,p.year,p.month,p.day,false);if(division!=='scotland'){p=dftUtcYmd(easterMonday);dftHolidayAdd(set,p.year,p.month,p.day,false);}
  dftHolidayAdd(set,year,5,dftNthMonday(year,5,1),false);dftHolidayAdd(set,year,5,dftLastMonday(year,5),false);
  dftHolidayAdd(set,year,8,division==='scotland'?dftNthMonday(year,8,1):dftLastMonday(year,8),false);
  if(division==='scotland')dftHolidayAdd(set,year,11,30,true);if(division==='northern-ireland')dftHolidayAdd(set,year,7,12,true);
  dftHolidayAdd(set,year,12,25,true);dftHolidayAdd(set,year,12,26,true);DFT_BANK_HOLIDAY_CACHE.set(cacheKey,set);return set;
}
function isBankHoliday(date,station){const p=dftLondonYmd(date),key=dftYmdKey(p.year,p.month,p.day),division=bankHolidayDivision(station),years=state.bankHolidayYears[division],live=state.bankHolidaysByDivision[division];if(years&&years.has(p.year))return !!(live&&live.has(key));return dftBankHolidayKeys(p.year,division).has(key);}""")
replace_once('kerbside-train-forecast-v4.js',
"""function calendarSignal(date,minute){let amount=0;const reasons=[];const dateStamp=stamp(date);if(state.bankHolidays.has(dateStamp)){amount+=.55;reasons.push('bank-holiday travel pattern');}const month=Number(dateStamp.slice(5,7)),dom=Number(dateStamp.slice(8,10));if(month===12&&dom>=18&&dom<20){amount+=.45;reasons.push('pre-Christmas travel period');}return {amount,reasons};}
""",
"""function calendarSignal(date,minute,station){let amount=0;const reasons=[];const dateStamp=stamp(date);if(isBankHoliday(date,station)){amount+=.55;reasons.push('bank-holiday travel pattern');}const month=Number(dateStamp.slice(5,7)),dom=Number(dateStamp.slice(8,10));if(month===12&&dom>=18&&dom<20){amount+=.45;reasons.push('pre-Christmas travel period');}return {amount,reasons};}
""")
replace_once('kerbside-train-forecast-v4.js',
"""  const minute=parseMinutes(service&&service.std),future=isFuture(date),dftMinute=dftMinuteForService(service,date),bankHoliday=isBankHoliday(date);
  const calendar=calendarSignal(date,minute);
""",
"""  const minute=parseMinutes(service&&service.std),future=isFuture(date),dftMinute=dftMinuteForService(service,date),bankHoliday=isBankHoliday(date,station);
  const calendar=calendarSignal(date,minute,station);
""")
regex_once('kerbside-train-forecast-v4.js',r"async function loadCalendar\(\)\{.*?\}\nfunction init\(\)",
"""function normaliseBankHolidayPayload(json){const divisions={'england-and-wales':[],scotland:[],'northern-ireland':[]};for(const name of Object.keys(divisions)){const group=json&&json[name],dates=[];(group&&Array.isArray(group.events)?group.events:[]).forEach(event=>{if(event&&/^\\d{4}-\\d{2}-\\d{2}$/.test(String(event.date||'')))dates.push(String(event.date));});divisions[name]=unique(dates);}return divisions;}
function applyBankHolidayDivisions(divisions,status='ready'){const next={},years={};for(const name of ['england-and-wales','scotland','northern-ireland']){const values=Array.isArray(divisions&&divisions[name])?divisions[name]:[];next[name]=new Set(values);years[name]=new Set(values.map(value=>Number(String(value).slice(0,4))).filter(Number.isFinite));}state.bankHolidaysByDivision=next;state.bankHolidayYears=years;state.bankHolidays=next['england-and-wales'];state.calendarReady=true;state.calendarStatus=status;state.calendarUpdatedAt=Date.now();schedule();}
function readCalendarCache(){try{const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return cached&&Number(cached.ts)&&cached.divisions?cached:null;}catch(error){return null;}}
async function loadCalendar(){const cached=readCalendarCache(),age=cached?Date.now()-cached.ts:Infinity;if(cached&&age<CACHE_MS){applyBankHolidayDivisions(cached.divisions,'cached');return;}try{const response=await fetch(BANK_HOLIDAY_URL,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`bank holiday calendar returned ${response.status}`);const divisions=normaliseBankHolidayPayload(await response.json());applyBankHolidayDivisions(divisions,'ready');try{localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),divisions}));}catch(error){}}catch(error){if(cached&&age<CACHE_STALE_MS)applyBankHolidayDivisions(cached.divisions,'stale');else{state.calendarReady=true;state.calendarStatus='fallback';state.calendarUpdatedAt=Date.now();schedule();}}}
function init()""")
replace_once('kerbside-train-forecast-v4.js',
"""window.__KERBSIDE_FORECAST_V4__={version:VERSION,state,forecast,apply,detailMarkup,calendarSignal,""",
"""window.__KERBSIDE_FORECAST_V4__={version:VERSION,state,forecast,apply,detailMarkup,calendarSignal,isBankHoliday,bankHolidayDivision,dftBankHolidayKeys,normaliseBankHolidayPayload,applyBankHolidayDivisions,""")

# New deterministic source regression: arena event parsing + persistent stale
# fallback, plus England/Wales vs Scotland bank-holiday separation.
Path('kerbside-backend/test/train-event-source-reliability.test.mjs').write_text(r'''import test from 'node:test';
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
''',encoding='utf-8')

Path('VERSION').write_text(VERSION+'\n',encoding='utf-8')
subprocess.run(['python3','.github/scripts/sync-version.py'],check=True)
print('Prepared Kerbside',VERSION,'event-source reliability release.')
