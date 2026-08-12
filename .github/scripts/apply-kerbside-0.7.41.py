#!/usr/bin/env python3
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Release/version wiring and Status switchboard module.
replace_once('bus.html', "const APP_VERSION = '0.7.38';", "const APP_VERSION = '0.7.41';")
bus = read('bus.html')
if '?v=0.7.40' not in bus:
    raise SystemExit('bus.html: expected 0.7.40 module cache-busters')
bus = bus.replace('?v=0.7.40', '?v=0.7.41')
needle = '<script src="kerbside-train-forecast-v3.js?v=0.7.41"></script>\n</body>'
replacement = '<script src="kerbside-train-forecast-v3.js?v=0.7.41"></script>\n<script src="kerbside-status.js?v=0.7.41"></script>\n</body>'
if bus.count(needle) != 1:
    raise SystemExit('bus.html: could not locate final Forecast v3 script tag')
write('bus.html', bus.replace(needle, replacement, 1))
Path('VERSION').write_text('0.7.41\n', encoding='utf-8')

# Fallback providers are healthy infrastructure but not active dependencies when
# the official rail Worker is answering. Grey/standby is more truthful than a
# green light that looks like Kerbside is currently using them.
status = read('kerbside-status.js')
status = status.replace(
    "return result(source,'healthy','Fallback is reachable and ready if the official source fails.',r.latency,'Standby ready');",
    "return result(source,'standby','Fallback is reachable and ready if the official source fails.',r.latency,'Standby');"
)
status = status.replace(
    "return result(source,'healthy','Secondary fallback is reachable.',r.latency,'Standby ready');",
    "return result(source,'standby','Secondary fallback is reachable.',r.latency,'Standby');"
)
status = status.replace(
    "return result(source,'healthy','Fallback basemap tile loaded.',latency,'Standby ready');",
    "return result(source,'standby','Fallback basemap tile loaded and is ready if CARTO fails.',latency,'Standby');"
)
write('kerbside-status.js', status)

# ---------------------------------------------------------------------------
# Travel-date status must be derived from the selected date, not from a stale
# timetable-mode value left over from the previous selection.
replace_once(
    'kerbside-train-date.js',
    "function updateDateMeta(){const meta=$('trainTravelDateMeta');if(!meta)return;const live=isToday(),d=parseTravelDate(state.date),label=d?d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):state.date;const tt=window.__KERBSIDE_TRAIN_TIMETABLE__,mode=tt&&tt.state?tt.state.mode:'';const note=mode==='today'?`${label} · timetable + live evidence`:mode==='advance'?`${label} · advance journey · timetabled services`:live?`${label} · live departures · live-adjusted crowding`:`${label} · advance journey · scheduled services`;setText(meta,note);meta.dataset.mode=live?'live':'planning';}",
    "function updateDateMeta(){const meta=$('trainTravelDateMeta');if(!meta)return;const live=isToday(),d=parseTravelDate(state.date),label=d?d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):state.date;const tt=window.__KERBSIDE_TRAIN_TIMETABLE__,mode=tt&&tt.state?tt.state.mode:'';let note;if(!live)note=`${label} · advance journey · timetabled services`;else if(mode==='today')note=`${label} · timetable + live evidence`;else note=`${label} · live departures · live-adjusted crowding`;setText(meta,note);meta.dataset.mode=live?'live':'planning';}"
)

# ---------------------------------------------------------------------------
# Timetable manifest refresh and edge-date recovery.
replace_once(
    'kerbside-train-timetable.js',
    "const MAX_RESULTS=24;\nconst state={loading:false,request:0,services:[],signature:'',mode:'live',manifest:null,lastError:'',sourceDate:'',openId:''};\nconst dataState={manifestPromise:null,locationsPromise:null,datePromises:new Map()};",
    "const MAX_RESULTS=24;\nconst MANIFEST_CACHE_MS=5*60*1000;\nconst EDGE_MANIFEST_RECHECK_MS=2*60*1000;\nconst state={loading:false,request:0,services:[],signature:'',mode:'live',manifest:null,lastError:'',sourceDate:'',openId:'',edgeRefreshAt:0};\nconst dataState={manifestPromise:null,manifestCheckedAt:0,locationsPromise:null,datePromises:new Map()};"
)
replace_once(
    'kerbside-train-timetable.js',
    "function loadManifest(){if(!dataState.manifestPromise)dataState.manifestPromise=fetchJson(`${DATA_BASE}/manifest.json`).then(value=>{state.manifest=value;return value;});return dataState.manifestPromise;}",
    "function loadManifest({force=false}={}){const expired=!dataState.manifestCheckedAt||Date.now()-dataState.manifestCheckedAt>=MANIFEST_CACHE_MS;if(!dataState.manifestPromise||force||expired){const previous=state.manifest,previousId=previous&&previous.timetableId||'';dataState.manifestPromise=fetchJson(`${DATA_BASE}/manifest.json`).then(value=>{const nextId=value&&value.timetableId||'';if(previousId&&nextId&&nextId!==previousId){dataState.datePromises.clear();dataState.locationsPromise=null;}state.manifest=value;dataState.manifestCheckedAt=Date.now();return value;}).catch(error=>{dataState.manifestPromise=null;if(previous)return previous;throw error;});}return dataState.manifestPromise;}"
)
replace_once(
    'kerbside-train-timetable.js',
    "function coverageFor(manifest,date){return manifest&&manifest.coverage&&manifest.coverage[date]||null;}",
    "function coverageFor(manifest,date){return manifest&&manifest.coverage&&manifest.coverage[date]||null;}\nfunction coverageIncludesTime(coverage,value){if(!coverage)return false;if(!coverage.partial)return true;const minute=parseMinutes(value),from=parseMinutes(coverage.from),to=parseMinutes(coverage.to);if(minute==null)return true;return (from==null||minute>=from)&&(to==null||minute<=to);}"
)
replace_once(
    'kerbside-train-timetable.js',
    "const timetableProvider={\n  state:dataState,\n  async getCoverage(){return loadManifest();},\n  async getServices({from,to,date,departAfter='00:00'}){\n    const manifest=await loadManifest();",
    "const timetableProvider={\n  state:dataState,\n  async getCoverage(options={}){return loadManifest(options);},\n  async refreshCoverage(){return loadManifest({force:true});},\n  async getServices({from,to,date,departAfter='00:00'}){\n    const manifest=await loadManifest();"
)

edge_insert = """    const requestedTime=options.departAfter||r.departAfter||'00:00';
    const edgeCoverage=coverageFor(manifest,r.date);
    if(edgeCoverage&&edgeCoverage.partial&&!coverageIncludesTime(edgeCoverage,requestedTime)){
      state.edgeRefreshAt=Date.now();
      renderUnavailable(`The current Darwin snapshot only covers ${edgeCoverage.from}–${edgeCoverage.to} on this edge date. ${requestedTime} is beyond that window. Kerbside is checking automatically for today's newer timetable snapshot; this is not being treated as proof that there are no trains.`,{mode,manifest});
      return true;
    }
    const items=await timetableProvider.getServices({from:r.from.crs,to:r.to.crs,date:r.date,departAfter:requestedTime});"""
replace_once(
    'kerbside-train-timetable.js',
    "    const items=await timetableProvider.getServices({from:r.from.crs,to:r.to.crs,date:r.date,departAfter:options.departAfter||r.departAfter||'00:00'});",
    edge_insert
)

replace_once(
    'kerbside-train-timetable.js',
    "function sync(){\n  const sig=routeSignature();",
    "async function refreshEdgeManifest(){const r=route(),manifest=state.manifest;if(state.loading||!r.date||!manifest||!Array.isArray(manifest.dates)||!manifest.dates.length)return false;const coverage=coverageFor(manifest,r.date),last=manifest.dates[manifest.dates.length-1],needs=r.date===last&&coverage&&coverage.partial&&!coverageIncludesTime(coverage,r.departAfter||'00:00');if(!needs)return false;if(state.edgeRefreshAt&&Date.now()-state.edgeRefreshAt<EDGE_MANIFEST_RECHECK_MS)return false;state.edgeRefreshAt=Date.now();const before=String(manifest.timetableId||'');try{const next=await timetableProvider.refreshCoverage();if(!next||String(next.timetableId||'')===before)return false;state.signature='';await load({mode:journeyMode()||(dateApi()&&dateApi().isToday()?'today':'advance')});return true;}catch(error){return false;}}\nfunction sync(){\n  const sig=routeSignature();"
)
replace_once(
    'kerbside-train-timetable.js',
    "  state.signature='';setTimeout(sync,0);setInterval(sync,1000);\n}",
    "  state.signature='';setTimeout(sync,0);setInterval(sync,1000);setInterval(()=>refreshEdgeManifest(),30*1000);\n}"
)
replace_once(
    'kerbside-train-timetable.js',
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,requestOverlay,provider:timetableProvider};",
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,requestOverlay,coverageIncludesTime,provider:timetableProvider};"
)

# ---------------------------------------------------------------------------
# Regression coverage for edge-date recovery and the Status switchboard.
test_path = Path('kerbside-backend/test/train-timetable-provider.test.js')
test_text = test_path.read_text(encoding='utf-8')
addition = r'''

test('partial edge coverage distinguishes a missing future window from no trains',()=>{
  const {api}=loadPriorityRuntime({today:false,liveMode:'planning',departAfter:'12:15'});
  assert.equal(api.coverageIncludesTime({from:'00:01',to:'07:54',partial:true},'07:30'),true);
  assert.equal(api.coverageIncludesTime({from:'00:01',to:'07:54',partial:true},'12:15'),false);
  assert.equal(api.coverageIncludesTime({from:'00:01',to:'23:59',partial:false},'23:30'),true);
});
'''
if "partial edge coverage distinguishes a missing future window from no trains" not in test_text:
    test_path.write_text(test_text + addition, encoding='utf-8')

Path('kerbside-backend/test/status-switchboard.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const source=await fs.readFile(path.join(root,'kerbside-status.js'),'utf8');

function load(){
  const document={
    readyState:'loading',
    addEventListener(){},
    getElementById(){return null;},
    querySelector(){return null;},
    querySelectorAll(){return[];},
    head:{appendChild(){}},
    createElement(){return {setAttribute(){},appendChild(){},append(){},addEventListener(){},style:{}};}
  };
  const context={window:{},document,console,URL,Date,Intl,setTimeout,clearTimeout,navigator:{geolocation:{}},localStorage:{setItem(){},removeItem(){}},fetch:async()=>{throw new Error('network not expected');}};
  vm.createContext(context);
  vm.runInContext(source,context);
  return context.window.__KERBSIDE_STATUS_SWITCHBOARD__;
}

test('edge-date health reports the selected time outside partial timetable coverage',()=>{
  const api=load();
  const manifest={dates:['2026-08-12','2026-08-13'],coverage:{'2026-08-13':{from:'00:01',to:'07:54',partial:true}}};
  const value=api.coverageHealth(manifest,'2026-08-13','12:15');
  assert.equal(value.status,'degraded');
  assert.match(value.detail,/outside the current edge-date coverage/);
});

test('complete timetable coverage is healthy',()=>{
  const api=load();
  const manifest={dates:['2026-08-13'],coverage:{'2026-08-13':{from:'00:01',to:'23:59',partial:false}}};
  assert.equal(api.coverageHealth(manifest,'2026-08-13','12:15').status,'healthy');
});

test('overall status only goes red for a critical failed dependency',()=>{
  const api=load();
  assert.equal(api.overallState([{critical:false,status:'down'},{critical:true,status:'healthy'}]).status,'degraded');
  assert.equal(api.overallState([{critical:true,status:'down'},{critical:false,status:'healthy'}]).status,'down');
  assert.equal(api.overallState([{critical:true,status:'healthy'},{critical:false,status:'standby'}]).status,'healthy');
});
''', encoding='utf-8')

print('Applied Kerbside 0.7.41 status and future-timetable patch.')
