#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

VERSION='0.9.12'


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text=read(path)
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one guarded replacement, found {count}: {old[:100]!r}')
    write(path, text.replace(old,new,1))


def append_new(path, text):
    target=Path(path)
    if target.exists():
        raise SystemExit(f'{path}: already exists')
    target.write_text(text,encoding='utf-8')

Path('VERSION').write_text(VERSION+'\n',encoding='utf-8')

replace_once('bus.html',
"const DATA_MANIFEST_MAX_AGE = 14*24*3600*1000;\nconst REQUIRED_DATA_REGIONS",
"const DATA_MANIFEST_MAX_AGE = 14*24*3600*1000;\nconst DATA_MANIFEST_MEMORY_TTL = 10*60*1000;\nconst REQUIRED_DATA_REGIONS")
replace_once('bus.html',
"let DATA_MANIFEST = null;\nlet DATA_MANIFEST_PROMISE = null;\nlet DATA_MANIFEST_SOURCE = '';",
"let DATA_MANIFEST = null;\nlet DATA_MANIFEST_PROMISE = null;\nlet DATA_MANIFEST_SOURCE = '';\nlet DATA_MANIFEST_CHECKED_AT = 0;")
replace_once('bus.html',
"  DATA_MANIFEST=null; DATA_MANIFEST_PROMISE=null; DATA_MANIFEST_SOURCE='';",
"  DATA_MANIFEST=null; DATA_MANIFEST_PROMISE=null; DATA_MANIFEST_SOURCE=''; DATA_MANIFEST_CHECKED_AT=0;")
replace_once('bus.html',
"async function loadDataManifest(force){\n  if(DATA_MANIFEST&&!force) return DATA_MANIFEST;\n  if(DATA_MANIFEST_PROMISE) return DATA_MANIFEST_PROMISE;\n  DATA_MANIFEST_PROMISE=(async()=>{\n    const fallback=DATA_MANIFEST||readStoredDataManifest();",
"async function loadDataManifest(force){\n  const memoryFresh=DATA_MANIFEST&&DATA_MANIFEST_CHECKED_AT&&Date.now()-DATA_MANIFEST_CHECKED_AT<DATA_MANIFEST_MEMORY_TTL;\n  if(memoryFresh&&!force) return DATA_MANIFEST;\n  if(DATA_MANIFEST_PROMISE) return DATA_MANIFEST_PROMISE;\n  DATA_MANIFEST_PROMISE=(async()=>{\n    const memoryFallback=DATA_MANIFEST;\n    const fallback=memoryFallback||readStoredDataManifest();\n    const fallbackSource=memoryFallback?'memory-stale':'stored';")
replace_once('bus.html',
"      DATA_MANIFEST=data; DATA_MANIFEST_SOURCE='network'; writeStoredDataManifest(data); return data;\n    }catch(e){\n      if(fallback){ DATA_MANIFEST=fallback; DATA_MANIFEST_SOURCE='stored'; return fallback; }",
"      DATA_MANIFEST=data; DATA_MANIFEST_SOURCE='network'; DATA_MANIFEST_CHECKED_AT=Date.now(); writeStoredDataManifest(data); return data;\n    }catch(e){\n      if(fallback){ DATA_MANIFEST=fallback; DATA_MANIFEST_SOURCE=fallbackSource; DATA_MANIFEST_CHECKED_AT=Date.now(); return fallback; }")
replace_once('bus.html',
"async function poll(force){\n  if(!S.origin) return;\n  if(S.busy){ if(force) S.pollAgain=true; return; }",
"async function poll(force){\n  if(!S.origin) return;\n  const pollLocationRun=S.locationRun;\n  if(S.busy){ if(force) S.pollAgain=true; return; }")
replace_once('bus.html',
"    const list=S.demo?fetchSim(dt):await fetchLive(ctl.signal);\n    feedReceived=true;\n    ingest(list);",
"    const list=S.demo?fetchSim(dt):await fetchLive(ctl.signal);\n    // setOrigin() aborts the request, but a SIRI body may already have been\n    // parsed while the optional matched-identity request is settling. Never let\n    // that completed old-area list repopulate the new location.\n    if(ctl.signal.aborted||pollLocationRun!==S.locationRun) return;\n    feedReceived=true;\n    ingest(list);")

replace_once('kerbside-train-timetable.js',
"const MANIFEST_CACHE_MS=5*60*1000;\nconst EDGE_MANIFEST_RECHECK_MS=2*60*1000;",
"const MANIFEST_CACHE_MS=5*60*1000;\nconst TIMETABLE_REQUEST_TIMEOUT_MS=12000;\nconst EDGE_MANIFEST_RECHECK_MS=2*60*1000;")
replace_once('kerbside-train-timetable.js',
"async function fetchJson(path){const response=await fetch(path,{cache:'no-cache',headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Timetable data returned ${response.status}`);return response.json();}\nasync function fetchGzipJson(path){\n  const response=await fetch(path,{cache:'no-cache'});\n  if(!response.ok)throw new Error(`Timetable data returned ${response.status}`);\n  const bytes=new Uint8Array(await response.arrayBuffer());",
"async function fetchTimetableBytes(path,options={}){\n  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMETABLE_REQUEST_TIMEOUT_MS);\n  try{\n    const response=await fetch(path,{...options,signal:controller.signal});\n    if(!response.ok)throw new Error(`Timetable data returned ${response.status}`);\n    const bytes=new Uint8Array(await response.arrayBuffer());\n    return bytes;\n  }catch(error){\n    if(error&&error.name==='AbortError')throw new Error('Timetable data timed out. Please retry.');\n    throw error;\n  }finally{clearTimeout(timer);}\n}\nasync function fetchJson(path){const bytes=await fetchTimetableBytes(path,{cache:'no-cache',headers:{Accept:'application/json'}});return JSON.parse(new TextDecoder().decode(bytes));}\nasync function fetchGzipJson(path){\n  const bytes=await fetchTimetableBytes(path,{cache:'no-cache'});")
replace_once('kerbside-train-timetable.js',
"  }catch(e){\n    if(id===state.request){\n      state.lastError=e&&e.message||String(e);\n      setLiveMode();\n    }\n    return false;",
"  }catch(e){\n    if(id===state.request){\n      state.lastError=e&&e.message||String(e);\n      if(mode==='advance'||(dateApi()&&typeof dateApi().isToday==='function'&&!dateApi().isToday())){\n        setScheduledVisibility(true);\n        renderUnavailable(`Timetable temporarily unavailable. ${state.lastError} Retry this journey in a moment.`,{mode,manifest:state.manifest});\n      }else setLiveMode();\n    }\n    return false;")

replace_once('kerbside-journey-planner-ui.js',
"const LOCAL_STATIONS_URL='kerbside-rail-timetable/locations.json';\nconst PLANNER_CORE_URL=",
"const LOCAL_STATIONS_URL='kerbside-rail-timetable/locations.json';\nconst LOCAL_STATION_TIMEOUT_MS=10000;\nconst PLANNER_CORE_URL=")
replace_once('kerbside-journey-planner-ui.js',
"function throwIfAborted(init){if(init&&init.signal&&init.signal.aborted)throw abortError();}\nfunction loadStations(){",
"function throwIfAborted(init){if(init&&init.signal&&init.signal.aborted)throw abortError();}\nasync function fetchLocalStations(){\n  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),LOCAL_STATION_TIMEOUT_MS);\n  try{\n    const response=await upstreamFetch(LOCAL_STATIONS_URL,{headers:{Accept:'application/json'},signal:controller.signal});\n    if(!response||!response.ok)throw new Error(`Local station data returned ${response?response.status:'no response'}`);\n    const bytes=await response.arrayBuffer();\n    return JSON.parse(new TextDecoder().decode(bytes));\n  }catch(error){\n    if(error&&error.name==='AbortError')throw new Error('Local station data timed out');\n    throw error;\n  }finally{clearTimeout(timer);}\n}\nfunction loadStations(){")
replace_once('kerbside-journey-planner-ui.js',
"  stationRowsPromise=upstreamFetch(LOCAL_STATIONS_URL,{headers:{Accept:'application/json'}})\n    .then(response=>{\n      if(!response||!response.ok)throw new Error(`Local station data returned ${response?response.status:'no response'}`);\n      return response.json();\n    })\n    .then(json=>{",
"  stationRowsPromise=fetchLocalStations()\n    .then(json=>{")

replace_once('kerbside-train-live-overlay.js',
"  const fresh=state.crs===code&&state.status==='ready'&&state.connectionTargets.join(',')===targetKey&&state.onwardTargets.map(item=>`${item.from}>${item.to}`).join(',')===onwardKey&&Date.now()-state.updatedAt<FRESH_MS;",
"  const fresh=state.crs===code&&['ready','partial'].includes(state.status)&&state.connectionTargets.join(',')===targetKey&&state.onwardTargets.map(item=>`${item.from}>${item.to}`).join(',')===onwardKey&&Date.now()-state.updatedAt<FRESH_MS;")
replace_once('kerbside-train-live-overlay.js',
"  try{\n    const originBoards=await Promise.all([requestBoard(code),...targets.map(target=>requestBoard(code,undefined,{target}))]);\n    const onwardBoards=await Promise.all(onward.map(item=>requestBoard(item.from,undefined,{target:item.to})));\n    const json=originBoards.slice(1).reduce((merged,board)=>mergeBoards(merged,board),originBoards[0]||{});\n    if(seq!==state.seq)return false;\n    state.services=Array.isArray(json&&json.trainServices)?json.trainServices:[];\n    state.messages=Array.isArray(json&&json.nrccMessages)?json.nrccMessages:[];\n    state.index=buildIndex(state.services);\n    state.onwardIndexes=new Map(onward.map((item,index)=>{\n      const board=onwardBoards[index],services=Array.isArray(board&&board.trainServices)?board.trainServices:[];\n      return [`${item.from}|${item.to}`,buildIndex(services)];\n    }));\n    state.updatedAt=Date.now();state.status='ready';state.error='';\n    document.dispatchEvent(new CustomEvent('kerbside:live-overlay',{detail:{crs:code,date:state.date,count:state.services.length,onwardBoards:state.onwardIndexes.size}}));\n    return true;",
"  try{\n    const primary=await requestBoard(code);\n    const targetResults=await Promise.allSettled(targets.map(target=>requestBoard(code,undefined,{target})));\n    const onwardResults=await Promise.allSettled(onward.map(item=>requestBoard(item.from,undefined,{target:item.to})));\n    const originBoards=[primary,...targetResults.filter(result=>result.status==='fulfilled').map(result=>result.value)];\n    const json=originBoards.slice(1).reduce((merged,board)=>mergeBoards(merged,board),originBoards[0]||{});\n    if(seq!==state.seq)return false;\n    state.services=Array.isArray(json&&json.trainServices)?json.trainServices:[];\n    state.messages=Array.isArray(json&&json.nrccMessages)?json.nrccMessages:[];\n    state.index=buildIndex(state.services);\n    state.onwardIndexes=new Map();\n    onwardResults.forEach((result,index)=>{\n      if(result.status!=='fulfilled')return;\n      const item=onward[index],board=result.value,services=Array.isArray(board&&board.trainServices)?board.trainServices:[];\n      state.onwardIndexes.set(`${item.from}|${item.to}`,buildIndex(services));\n    });\n    const failures=targetResults.filter(result=>result.status==='rejected').length+onwardResults.filter(result=>result.status==='rejected').length;\n    state.updatedAt=Date.now();state.status=failures?'partial':'ready';state.error=failures?`${failures} connection live board${failures===1?'':'s'} unavailable`:'';\n    document.dispatchEvent(new CustomEvent('kerbside:live-overlay',{detail:{crs:code,date:state.date,count:state.services.length,onwardBoards:state.onwardIndexes.size,partial:failures>0,failures}}));\n    return true;")
replace_once('kerbside-train-live-overlay.js',
"function messages(){return state.status==='ready'&&Array.isArray(state.messages)?state.messages:[];}",
"function messages(){return ['ready','partial'].includes(state.status)&&Array.isArray(state.messages)?state.messages:[];}")

insert_anchor="\nasync function loadBoard(station, {silent=false}={}){"
merge_helpers="""
function liveBoardIdentity(service){
  if(!service)return'';
  const id=String(service.serviceIdGuid||service.serviceIdUrlSafe||service.serviceID||service.uid||service.serviceUid||'').trim();
  if(id)return id;
  const train=String(service.trainid||service.trainId||'').trim(),std=String(service.std||'').trim();
  return [train,std,operatorIdentity(service),destinationIdentity(service)].join('|');
}
function mergeLiveBoards(detailed,plain){
  if(!detailed)return plain||{};
  if(!plain)return detailed||{};
  const services=[],seen=new Set();
  for(const source of [detailed,plain])for(const service of (Array.isArray(source&&source.trainServices)?source.trainServices:[])){
    const key=liveBoardIdentity(service);if(key&&seen.has(key))continue;if(key)seen.add(key);services.push(service);
  }
  const messages=[];for(const source of [detailed,plain])for(const message of (Array.isArray(source&&source.nrccMessages)?source.nrccMessages:[])){
    const key=JSON.stringify(message);if(!messages.some(item=>JSON.stringify(item)===key))messages.push(message);
  }
  return {...plain,...detailed,trainServices:services,nrccMessages:messages};
}
"""
replace_once('kerbside-trains.js',insert_anchor,'\n'+merge_helpers+'\nasync function loadBoard(station, {silent=false}={}){')
old_board="""    let response = null;
    try{
      response = await fetchWithTimeout(`${PROVIDER_BASE}/departures/${encodeURIComponent(station.crs)}/9?expand=true`, {signal:controller.signal});
    }catch(expandError){
      if(controller.signal.aborted) return;
      response = null;
    }
    if((!response || !response.ok) && !controller.signal.aborted){
      response = await fetchWithTimeout(`${PROVIDER_BASE}/departures/${encodeURIComponent(station.crs)}/20`, {signal:controller.signal});
    }
    if(!response || !response.ok) throw new Error(`Departure board returned ${response?response.status:'no response'}`);
    const json = await response.json();
"""
new_board="""    const [detailedAttempt,plainAttempt]=await Promise.allSettled([
      fetchWithTimeout(`${PROVIDER_BASE}/departures/${encodeURIComponent(station.crs)}/9?expand=true`, {signal:controller.signal}),
      fetchWithTimeout(`${PROVIDER_BASE}/departures/${encodeURIComponent(station.crs)}/20`, {signal:controller.signal})
    ]);
    if(controller.signal.aborted)return;
    const detailedResponse=detailedAttempt.status==='fulfilled'&&detailedAttempt.value&&detailedAttempt.value.ok?detailedAttempt.value:null;
    const plainResponse=plainAttempt.status==='fulfilled'&&plainAttempt.value&&plainAttempt.value.ok?plainAttempt.value:null;
    if(!detailedResponse&&!plainResponse)throw new Error('Departure board returned no usable response');
    const [detailedJson,plainJson]=await Promise.all([
      detailedResponse?detailedResponse.json():Promise.resolve(null),
      plainResponse?plainResponse.json():Promise.resolve(null)
    ]);
    const json=mergeLiveBoards(detailedJson,plainJson);
"""
replace_once('kerbside-trains.js',old_board,new_board)

replace_once('kerbside-train-date.js',
"const STORE_KEY='kerbside.rail.travel-date.v1',MAX_DAYS=90,$=id=>document.getElementById(id),state={date:'',observer:null,scheduled:false};",
"const STORE_KEY='kerbside.rail.travel-date.v1',MAX_DAYS=90,INIT_RETRY_MS=50,INIT_RETRY_MAX=120,$=id=>document.getElementById(id),state={date:'',observer:null,scheduled:false};\nlet initAttempts=0;")
replace_once('kerbside-train-date.js',
"function init(){installStyles();ensureTimetableModule();if(!installUi()){setTimeout(init,0);return;}observeBoard();scheduleApply();}",
"function init(){installStyles();ensureTimetableModule();if(!installUi()){if(++initAttempts<INIT_RETRY_MAX)setTimeout(init,INIT_RETRY_MS);else console.warn('Kerbside train date controls could not attach.');return;}initAttempts=0;observeBoard();scheduleApply();}")
replace_once('kerbside-train-routes.js',
"const REQUEST_TIMEOUT_MS = 10000;",
"const REQUEST_TIMEOUT_MS = 10000;\nconst INIT_RETRY_MS = 50;\nconst INIT_RETRY_MAX = 120;\nlet initAttempts = 0;")
replace_once('kerbside-train-routes.js',
"  if(!installUi()){\n    setTimeout(init,0);\n    return;\n  }\n  observeBoard();",
"  if(!installUi()){\n    if(++initAttempts<INIT_RETRY_MAX) setTimeout(init,INIT_RETRY_MS);\n    else console.warn('Kerbside train route controls could not attach.');\n    return;\n  }\n  initAttempts=0;\n  observeBoard();")
replace_once('kerbside-journey-planner-core.js',
"const SEARCH_DELAY_MS=240;",
"const SEARCH_DELAY_MS=240;\nconst INIT_RETRY_MS=50;\nconst INIT_RETRY_MAX=120;\nlet initAttempts=0;")
replace_once('kerbside-journey-planner-core.js',
"function init(){if(!install())setTimeout(init,0)}",
"function init(){if(!install()){if(++initAttempts<INIT_RETRY_MAX)setTimeout(init,INIT_RETRY_MS);else console.warn('Kerbside journey planner could not attach.');return;}initAttempts=0;}")

replace_once('kerbside-status.js',"const VERSION='0.9.7';",f"const VERSION='{VERSION}';")

replace_once('kerbside-backend/package.json',
'    "test:train-route": "node tests/train-browser-core-regression.mjs && node tests/train-provider-timeout-regression.mjs && node tests/train-mobile-layout-regression.mjs && node tests/train-journey-planner-regression.mjs"',
'    "test:train-route": "node tests/reliability-regression.mjs && node tests/train-route-filter-regression.mjs && node tests/train-live-window-regression.mjs && node tests/train-browser-core-regression.mjs && node tests/train-provider-timeout-regression.mjs && node tests/train-mobile-layout-regression.mjs && node tests/train-journey-planner-regression.mjs"')

append_new('kerbside-backend/tests/reliability-regression.mjs',r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');

test('bus polls cannot publish across a location generation change',()=>{
  const bus=source('bus.html');
  assert.match(bus,/const pollLocationRun=S\.locationRun;/);
  assert.match(bus,/ctl\.signal\.aborted\|\|pollLocationRun!==S\.locationRun/);
  assert.ok(bus.indexOf('pollLocationRun!==S.locationRun')<bus.indexOf('feedReceived=true;\n    ingest(list);'));
});

test('bus manifest memory is periodically revalidated',()=>{
  const bus=source('bus.html');
  assert.match(bus,/DATA_MANIFEST_MEMORY_TTL = 10\*60\*1000/);
  assert.match(bus,/const memoryFresh=DATA_MANIFEST&&DATA_MANIFEST_CHECKED_AT/);
  assert.match(bus,/DATA_MANIFEST_CHECKED_AT=Date\.now\(\)/);
});

test('future timetable failures stay on the scheduled journey board',()=>{
  const timetable=source('kerbside-train-timetable.js');
  assert.match(timetable,/mode==='advance'.*setScheduledVisibility\(true\);.*renderUnavailable/s);
  assert.match(timetable,/TIMETABLE_REQUEST_TIMEOUT_MS=12000/);
  assert.match(timetable,/await response\.arrayBuffer\(\)/);
});

test('optional connection live boards degrade independently',()=>{
  const overlay=source('kerbside-train-live-overlay.js');
  assert.match(overlay,/Promise\.allSettled\(targets\.map/);
  assert.match(overlay,/Promise\.allSettled\(onward\.map/);
  assert.match(overlay,/state\.status=failures\?'partial':'ready'/);
});

test('station autocomplete has a body-aware local-data timeout',()=>{
  const ui=source('kerbside-journey-planner-ui.js');
  assert.match(ui,/LOCAL_STATION_TIMEOUT_MS=10000/);
  assert.match(ui,/fetchLocalStations\(\)/);
  assert.match(ui,/await response\.arrayBuffer\(\)/);
});

test('live station board combines detailed evidence with the 20-row listing',()=>{
  const trains=source('kerbside-trains.js');
  assert.match(trains,/mergeLiveBoards\(detailedJson,plainJson\)/);
  assert.match(trains,/\/9\?expand=true/);
  assert.match(trains,/\/20`/);
});

test('train dependency retries are bounded and status version follows release',()=>{
  for(const name of ['kerbside-train-date.js','kerbside-train-routes.js','kerbside-journey-planner-core.js']){
    const text=source(name);assert.doesNotMatch(text,/setTimeout\(init,0\)/,name);
    assert.match(text,/INIT_RETRY_MAX/,name);
  }
  assert.match(source('kerbside-status.js'),/const VERSION='0\.9\.12';/);
});
''')

subprocess.run([sys.executable,'.github/scripts/sync-version.py'],check=True)
print('Prepared Kerbside 0.9.12 reliability release.')
