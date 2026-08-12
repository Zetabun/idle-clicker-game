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
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:140]!r}')
    write(path, text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Release/cache busting.
replace_once('bus.html', "const APP_VERSION = '0.7.42';", "const APP_VERSION = '0.7.43';")
bus = read('bus.html')
if '?v=0.7.42' not in bus:
    raise SystemExit('bus.html: expected 0.7.42 cache-busters')
write('bus.html', bus.replace('?v=0.7.42', '?v=0.7.43'))
Path('VERSION').write_text('0.7.43\n', encoding='utf-8')
replace_once('kerbside-status.js', "const VERSION='0.7.42';", "const VERSION='0.7.43';")


# ---------------------------------------------------------------------------
# Route state must be writable explicitly. Previously fromCrs was mostly
# refreshed as a side-effect of a Huxley request being rewritten. The official
# RDM path bypasses that Huxley rewrite, so a swap could leave fromCrs empty.
routes = 'kerbside-train-routes.js'
replace_once(
    routes,
    """function setFromCrs(value){
  const next = String(value || '').trim().toUpperCase();
  if(!/^[A-Z0-9]{3}$/.test(next)) return;
  if(routeState.fromCrs && routeState.fromCrs !== next){
    routeState.destination = null;
    routeState.lastDirectRequest = '';
    const input = $('trainDestinationQuery');
    if(input) input.value = '';
    saveRoute();
  }
  routeState.fromCrs = next;
  setDestinationEnabled(true);
  updateSummary();
}
""",
    """function setFromCrs(value){
  const next = String(value || '').trim().toUpperCase();
  if(!/^[A-Z0-9]{3}$/.test(next)) return false;
  if(routeState.fromCrs && routeState.fromCrs !== next){
    routeState.destination = null;
    routeState.lastDirectRequest = '';
    const input = $('trainDestinationQuery');
    if(input) input.value = '';
    saveRoute();
  }
  routeState.fromCrs = next;
  setDestinationEnabled(true);
  updateSummary();
  return true;
}
"""
)
replace_once(
    routes,
    """function selectDestination(station){
  if(!routeState.fromCrs || !station) return;
  const crs = String(station.crs || '').trim().toUpperCase();
  if(!/^[A-Z0-9]{3}$/.test(crs) || crs === routeState.fromCrs) return;
  routeState.destination = {name:String(station.name || crs),crs};
  const input = $('trainDestinationQuery');
  if(input) input.value = routeState.destination.name;
  saveRoute();
  updateSummary();
  setTimeout(()=>{
    closeSuggestions();
    reloadBoard();
  },0);
}
""",
    """function selectDestination(station,{reload=true}={}){
  if(!routeState.fromCrs || !station) return false;
  const crs = String(station.crs || '').trim().toUpperCase();
  if(!/^[A-Z0-9]{3}$/.test(crs) || crs === routeState.fromCrs) return false;
  routeState.destination = {name:String(station.name || crs),crs};
  routeState.lastDirectRequest = '';
  const input = $('trainDestinationQuery');
  if(input) input.value = routeState.destination.name;
  saveRoute();
  updateSummary();
  setTimeout(()=>{
    closeSuggestions();
    if(reload) reloadBoard();
  },0);
  return true;
}
"""
)
replace_once(
    routes,
    """window.__KERBSIDE_TRAIN_ROUTES__ = {
  state:routeState,
  clearDestination,
  selectDestination,
  rewrittenDepartureUrl
};
""",
    """window.__KERBSIDE_TRAIN_ROUTES__ = {
  state:routeState,
  clearDestination,
  setFromCrs,
  selectDestination,
  reloadBoard,
  rewrittenDepartureUrl
};
"""
)


# ---------------------------------------------------------------------------
# The rail-only guard must preserve the new selectDestination options object;
# otherwise {reload:false} silently turns back into a racing automatic reload.
live_window = 'kerbside-train-live-window.js'
replace_once(
    live_window,
    """    routes.selectDestination=function(station){
      if(!isRailStation(station)){
        const crs=stationCrs(station);if(crs)nonRailCrs.add(crs);
        state.rejectedStations++;
        if(typeof routes.clearDestination==='function')routes.clearDestination({reload:false,disable:false});
        const input=$('trainDestinationQuery');if(input){input.value='';input.disabled=false;}
        plannerMessage('Choose a National Rail station. Bus, coach and ferry connection points cannot be used as train destinations.',true);
        return false;
      }
      return original(station);
    };
""",
    """    routes.selectDestination=function(station,options){
      if(!isRailStation(station)){
        const crs=stationCrs(station);if(crs)nonRailCrs.add(crs);
        state.rejectedStations++;
        if(typeof routes.clearDestination==='function')routes.clearDestination({reload:false,disable:false});
        const input=$('trainDestinationQuery');if(input){input.value='';input.disabled=false;}
        plannerMessage('Choose a National Rail station. Bus, coach and ferry connection points cannot be used as train destinations.',true);
        return false;
      }
      return original(station,options);
    };
"""
)


# ---------------------------------------------------------------------------
# Journey planner: keep route state in sync independently of provider fetches,
# verify destination selection, and perform one deliberate board reload after
# the reversed route has been committed.
planner = 'kerbside-journey-planner-ui.js'
replace_once(
    planner,
    """function selectDestination(item){
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  if(!route||!item)return;
  route.selectDestination(item);
  const el=$('trainDestinationSuggest');if(el){el.hidden=true;el.innerHTML='';}
  if(isFutureJourney())setTimeout(()=>dateApi()?.applyForecasts?.(),0);
}
""",
    """function syncRouteOrigin(station){
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  const crs=String(station&&(station.crs||station.crsCode)||'').trim().toUpperCase();
  if(!route||!/^[A-Z0-9]{3}$/.test(crs))return false;
  if(typeof route.setFromCrs==='function')return route.setFromCrs(crs)!==false;
  if(route.state){route.state.fromCrs=crs;return true;}
  return false;
}
function selectDestination(item,{reload=true}={}){
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  if(!route||!item)return false;
  const selected=route.selectDestination(item,{reload});
  const el=$('trainDestinationSuggest');if(el){el.hidden=true;el.innerHTML='';}
  if(isFutureJourney())setTimeout(()=>dateApi()?.applyForecasts?.(),0);
  const current=route.state&&route.state.destination;
  const crs=String(item.crs||item.crsCode||'').trim().toUpperCase();
  return selected!==false&&!!(current&&String(current.crs||'').toUpperCase()===crs);
}
"""
)
replace_once(
    planner,
    """async function resolveOrigin(){
  const input=$('trainStationQuery'),api=window.__KERBSIDE_TRAINS__;
  if(!input||!api)return false;
  const q=input.value.trim(),selected=api.state&&api.state.station;
  if(selected&&(normalise(q)===normalise(selected.name)||q.toUpperCase()===String(selected.crs||'').toUpperCase()))return true;
  const ctl=new AbortController();
  const items=await stationLookup(q,ctl.signal);
  const match=bestMatch(items,q);
  if(!match){renderFromSuggestions(items);plannerMessage('Choose the departure station from the suggestions.',true);return false;}
  selectOrigin(match);
  return waitFor(()=>api.state&&api.state.station&&String(api.state.station.crs).toUpperCase()===match.crs,1500);
}
""",
    """async function resolveOrigin(){
  const input=$('trainStationQuery'),api=window.__KERBSIDE_TRAINS__;
  if(!input||!api)return false;
  const q=input.value.trim(),selected=api.state&&api.state.station;
  if(selected&&(normalise(q)===normalise(selected.name)||q.toUpperCase()===String(selected.crs||'').toUpperCase()))return syncRouteOrigin(selected);
  const ctl=new AbortController();
  const items=await stationLookup(q,ctl.signal);
  const match=bestMatch(items,q);
  if(!match){renderFromSuggestions(items);plannerMessage('Choose the departure station from the suggestions.',true);return false;}
  selectOrigin(match);
  const ready=await waitFor(()=>api.state&&api.state.station&&String(api.state.station.crs).toUpperCase()===match.crs,1500);
  return ready&&syncRouteOrigin(api.state&&api.state.station||match);
}
"""
)
replace_once(
    planner,
    """async function resolveDestination(){
  const input=$('trainDestinationQuery'),route=window.__KERBSIDE_TRAIN_ROUTES__,api=window.__KERBSIDE_TRAINS__;
  if(!input||!route||!api)return false;
  const q=input.value.trim();
  const current=route.state&&route.state.destination;
  if(current&&(normalise(q)===normalise(current.name)||q.toUpperCase()===String(current.crs||'').toUpperCase()))return true;
  const from=api.state&&api.state.station?String(api.state.station.crs||'').toUpperCase():'';
  const ctl=new AbortController();
  const items=await stationLookup(q,ctl.signal,from);
  const match=bestMatch(items,q);
  if(!match){renderToSuggestions(items);plannerMessage('Choose the destination station from the suggestions.',true);return false;}
  selectDestination(match);
  return true;
}
async function finishJourney(){
  dispatch();
  if(!isFutureJourney()){
    plannerMessage('Live journey loaded.');
    return;
  }
  const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
  if(timetable&&typeof timetable.load==='function')await timetable.load();
  else dateApi()?.applyForecasts?.();
  plannerMessage(`Advance journey ready for ${travelDateLabel()}.`);
}
""",
    """async function resolveDestination({reload=true}={}){
  const input=$('trainDestinationQuery'),route=window.__KERBSIDE_TRAIN_ROUTES__,api=window.__KERBSIDE_TRAINS__;
  if(!input||!route||!api)return false;
  const q=input.value.trim();
  const current=route.state&&route.state.destination;
  if(current&&(normalise(q)===normalise(current.name)||q.toUpperCase()===String(current.crs||'').toUpperCase()))return true;
  const from=api.state&&api.state.station?String(api.state.station.crs||'').toUpperCase():'';
  const ctl=new AbortController();
  const items=await stationLookup(q,ctl.signal,from);
  const match=bestMatch(items,q);
  if(!match){renderToSuggestions(items);plannerMessage('Choose the destination station from the suggestions.',true);return false;}
  if(!selectDestination(match,{reload})){
    plannerMessage('The destination could not be attached to the selected departure station. Please try again.',true);
    return false;
  }
  return true;
}
async function refreshJourneyBoard(){
  const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
  const mode=timetable&&typeof timetable.journeyMode==='function'?timetable.journeyMode():'';
  if(mode&&typeof timetable.load==='function'){
    await timetable.load({mode});
    return true;
  }
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  if(route&&typeof route.reloadBoard==='function'){
    route.reloadBoard();
    return true;
  }
  const api=window.__KERBSIDE_TRAINS__,station=api&&api.state&&api.state.station,input=$('trainStationQuery'),go=$('trainStationGo');
  if(!station||!input||!go)return false;
  const previous=input.value;
  input.value=station.crs||station.name||previous;
  go.click();
  input.value=previous;
  return true;
}
async function finishJourney({reload=false}={}){
  dispatch();
  const refreshed=reload?await refreshJourneyBoard():false;
  if(!isFutureJourney()){
    plannerMessage('Journey loaded.');
    return;
  }
  if(!refreshed){
    const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
    if(timetable&&typeof timetable.load==='function')await timetable.load();
    else dateApi()?.applyForecasts?.();
  }
  plannerMessage(`Advance journey ready for ${travelDateLabel()}.`);
}
"""
)
replace_once(
    planner,
    """    if(!(await resolveDestination()))return;
    await finishJourney();
""",
    """    if(!(await resolveDestination({reload:false})))return;
    await finishJourney({reload:true});
"""
)
replace_once(
    planner,
    """/* Swap used to require both stations to already be *selected*, so the
   button silently did nothing when the user had only typed. It also set
   the new destination before train-routes.js had caught up with the new
   origin: setFromCrs() blanks the destination whenever the origin
   changes, so the freshly-set destination was wiped a beat later. Now it
   works from the field text and waits for fromCrs to settle first. */
async function swap(){
  const api=window.__KERBSIDE_TRAINS__,route=window.__KERBSIDE_TRAIN_ROUTES__;
  const fromInput=$('trainStationQuery'),toInput=$('trainDestinationQuery');
  if(!api||!route||!fromInput||!toInput)return;
  const origin=api.state&&api.state.station;
  const destination=route.state&&route.state.destination;
  const fromText=(origin&&(origin.name||origin.crs))||fromInput.value.trim();
  const toText=(destination&&(destination.name||destination.crs))||toInput.value.trim();
  if(!fromText||!toText){plannerMessage('Add both stations before swapping.',true);return;}

  const button=$('trainRouteSwap');
  if(button)button.disabled=true;
  plannerMessage('');
  try{
    route.clearDestination({reload:false});
    if(route.state)route.state.fromCrs='';
    fromInput.value=toText;
    toInput.value=fromText;
    if(!(await resolveOrigin())){plannerMessage('Choose the new departure station from the suggestions.',true);return;}

    const nextOrigin=api.state&&api.state.station;
    const nextCrs=nextOrigin?String(nextOrigin.crs||'').toUpperCase():'';
    await waitFor(()=>route.state&&nextCrs&&String(route.state.fromCrs||'').toUpperCase()===nextCrs,1500);

    toInput.value=fromText;
    if(!(await resolveDestination()))return;
    await finishJourney();
  }catch(error){
    plannerMessage(error&&error.message?error.message:'The journey could not be swapped.',true);
  }finally{
    if(button)button.disabled=false;
  }
}
""",
    """/* Resolve both ends before mutating the active journey, then commit the
   reverse route explicitly. The old implementation blanked route.fromCrs and
   waited for a Huxley URL rewrite to repopulate it. Official RDM responses do
   not pass through that rewrite, leaving the route permanently half-cleared. */
function stationRecord(station){
  if(!station)return null;
  const crs=String(station.crs||station.crsCode||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{3}$/.test(crs))return null;
  return {name:String(station.name||station.stationName||crs).trim()||crs,crs};
}
function stationMatchesQuery(station,query){
  const record=stationRecord(station),q=String(query||'').trim();
  return !!(record&&q&&(normalise(q)===normalise(record.name)||q.toUpperCase()===record.crs));
}
async function resolveSwapStation(selected,query,exclude=''){
  const record=stationRecord(selected);
  if(record&&stationMatchesQuery(record,query))return record;
  const ctl=new AbortController();
  const items=await stationLookup(query,ctl.signal,exclude);
  return bestMatch(items,query);
}
async function swap(){
  const api=window.__KERBSIDE_TRAINS__,route=window.__KERBSIDE_TRAIN_ROUTES__;
  const fromInput=$('trainStationQuery'),toInput=$('trainDestinationQuery');
  if(!api||!route||!fromInput||!toInput)return;
  const selectedOrigin=api.state&&api.state.station;
  const selectedDestination=route.state&&route.state.destination;
  const fromText=fromInput.value.trim()||(selectedOrigin&&(selectedOrigin.name||selectedOrigin.crs))||'';
  const toText=toInput.value.trim()||(selectedDestination&&(selectedDestination.name||selectedDestination.crs))||'';
  if(!fromText||!toText){plannerMessage('Add both stations before swapping.',true);return;}

  const button=$('trainRouteSwap');
  if(button)button.disabled=true;
  plannerMessage('');
  try{
    const oldOrigin=await resolveSwapStation(selectedOrigin,fromText);
    if(!oldOrigin){plannerMessage('Choose the departure station from the suggestions before swapping.',true);return;}
    const oldDestination=await resolveSwapStation(selectedDestination,toText,oldOrigin.crs);
    if(!oldDestination){plannerMessage('Choose the destination station from the suggestions before swapping.',true);return;}
    if(oldOrigin.crs===oldDestination.crs){plannerMessage('Departure and destination must be different stations.',true);return;}

    route.clearDestination({reload:false});
    fromInput.value=oldDestination.crs;
    toInput.value=oldOrigin.name;
    selectOrigin(oldDestination);
    const originReady=await waitFor(()=>api.state&&api.state.station&&String(api.state.station.crs||'').toUpperCase()===oldDestination.crs,1500);
    if(!originReady||!syncRouteOrigin(api.state&&api.state.station||oldDestination))throw new Error('The reversed departure station did not finish loading.');

    fromInput.value=oldDestination.name;
    toInput.value=oldOrigin.name;
    if(!selectDestination(oldOrigin,{reload:false}))throw new Error('The reversed destination could not be selected.');
    await finishJourney({reload:true});
  }catch(error){
    plannerMessage(error&&error.message?error.message:'The journey could not be swapped.',true);
  }finally{
    if(button)button.disabled=false;
  }
}
"""
)
replace_once(
    planner,
    """window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,isFutureJourney,get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};
""",
    """window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,isFutureJourney,syncRouteOrigin,refreshJourneyBoard,get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};
"""
)


# ---------------------------------------------------------------------------
# Regression coverage: reproduce the exact official-provider path where no
# route-aware Huxley rewrite occurs, and prove the reversed route is still
# complete and explicitly reloaded.
test = r'''import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const routeSource=await fs.readFile(path.join(root,'kerbside-train-routes.js'),'utf8');
const plannerSource=await fs.readFile(path.join(root,'kerbside-journey-planner-ui.js'),'utf8');
const liveWindowSource=await fs.readFile(path.join(root,'kerbside-train-live-window.js'),'utf8');

function classes(){return {toggle(){},add(){},remove(){},contains(){return false;}};}
function storage(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};}

function loadRoutes(){
  let refreshClicks=0;
  const elements={
    trainDestinationQuery:{value:'',disabled:false,placeholder:'',classList:classes()},
    trainDestinationGo:{disabled:false},
    trainDestinationClear:{hidden:true},
    trainDestinationSuggest:{hidden:true,innerHTML:''},
    trainJourneySummary:{hidden:true,textContent:'',innerHTML:''},
    trainRefresh:{disabled:false,click(){refreshClicks++;}},
    trainStationQuery:{value:'Bristol Temple Meads'},
    trainStationGo:{click(){}}
  };
  const document={readyState:'loading',activeElement:null,addEventListener(){},getElementById:id=>elements[id]||null,createElement(){return {style:{},appendChild(){},setAttribute(){}};}};
  const window={fetch:async()=>({ok:true,json:async()=>[]})};
  const context={window,document,console,URL,Request,AbortController,setTimeout,clearTimeout,localStorage:storage(),location:{href:'https://zetabun.github.io/bus.html'}};
  vm.createContext(context);vm.runInContext(routeSource,context);
  return {api:window.__KERBSIDE_TRAIN_ROUTES__,elements,get refreshClicks(){return refreshClicks;}};
}

test('route API can set a new origin and attach a destination without an automatic reload',async()=>{
  const runtime=loadRoutes(),api=runtime.api;
  assert.equal(api.setFromCrs('BRI'),true);
  assert.equal(api.selectDestination({name:'Birmingham New Street',crs:'BHM'},{reload:false}),true);
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(api.state.fromCrs,'BRI');
  assert.equal(api.state.destination.crs,'BHM');
  assert.equal(runtime.refreshClicks,0);
});

function loadPlanner(){
  let timetableLoads=0,routeReloads=0;
  const from={value:'Birmingham New Street',disabled:false,focus(){},classList:classes()};
  const to={value:'Bristol Temple Meads',disabled:false,focus(){},classList:classes()};
  const message={textContent:'',classList:classes()};
  const swapButton={disabled:false};
  const elements={
    trainStationQuery:from,trainDestinationQuery:to,trainPlannerMessage:message,trainRouteSwap:swapButton,
    trainDepartAfter:{value:'09:00'},trainSuggest:{hidden:true,innerHTML:'',querySelectorAll(){return[];}},
    trainDestinationSuggest:{hidden:true,innerHTML:'',querySelectorAll(){return[];}}
  };
  const trains={state:{station:{name:'Birmingham New Street',crs:'BHM'}}};
  elements.trainStationGo={click(){
    const crs=String(from.value||'').trim().toUpperCase();
    if(crs==='BRI')trains.state.station={name:'Bristol Temple Meads',crs:'BRI'};
    else if(crs==='BHM')trains.state.station={name:'Birmingham New Street',crs:'BHM'};
  }};
  const route={
    state:{fromCrs:'BHM',destination:{name:'Bristol Temple Meads',crs:'BRI'}},
    clearDestination(){this.state.destination=null;},
    setFromCrs(crs){
      const next=String(crs||'').toUpperCase();
      if(this.state.fromCrs&&this.state.fromCrs!==next)this.state.destination=null;
      this.state.fromCrs=next;return true;
    },
    selectDestination(station,{reload=true}={}){
      if(!this.state.fromCrs)return false;
      const crs=String(station&&station.crs||'').toUpperCase();
      if(!crs||crs===this.state.fromCrs)return false;
      this.state.destination={name:station.name||crs,crs};
      if(reload)routeReloads++;
      return true;
    },
    reloadBoard(){routeReloads++;return true;}
  };
  const timetable={
    journeyMode(){return route.state.fromCrs&&route.state.destination?'today':'';},
    async load(options){timetableLoads++;assert.equal(options.mode,'today');return true;}
  };
  const document={readyState:'loading',addEventListener(){},getElementById:id=>elements[id]||null,createElement(){return {style:{},appendChild(){},setAttribute(){}};}};
  const window={
    fetch:async()=>{throw new Error('network should not be needed for a selected-station swap');},
    __KERBSIDE_TRAINS__:trains,__KERBSIDE_TRAIN_ROUTES__:route,__KERBSIDE_TRAIN_TIMETABLE__:timetable,
    __KERBSIDE_TRAIN_DATE__:{state:{date:'2026-08-12'},isToday(){return true;}},
    __KERBSIDE_FORECAST_V3__:{apply(){}},dispatchEvent(){},addEventListener(){}
  };
  class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  const context={window,document,console,URL,AbortController,setTimeout,clearTimeout,localStorage:storage(),location:{href:'https://zetabun.github.io/bus.html'},CustomEvent};
  vm.createContext(context);vm.runInContext(plannerSource,context);
  return {api:window.__KERBSIDE_JOURNEY_PLANNER__,trains,route,elements,get timetableLoads(){return timetableLoads;},get routeReloads(){return routeReloads;}};
}

test('swap survives the official-RDM path without relying on a Huxley route rewrite',async()=>{
  const runtime=loadPlanner();
  await runtime.api.swap();
  assert.equal(runtime.trains.state.station.crs,'BRI');
  assert.equal(runtime.route.state.fromCrs,'BRI');
  assert.equal(runtime.route.state.destination.crs,'BHM');
  assert.equal(runtime.elements.trainStationQuery.value,'Bristol Temple Meads');
  assert.equal(runtime.elements.trainDestinationQuery.value,'Birmingham New Street');
  assert.equal(runtime.timetableLoads,1,'the fully reversed timetable journey should be reloaded once');
  assert.equal(runtime.routeReloads,0,'the timetable path should not race an extra live-board reload');
  assert.equal(runtime.elements.trainRouteSwap.disabled,false);
});

test('rail-only destination guard forwards reload options to the route module',()=>{
  assert.match(liveWindowSource,/routes\.selectDestination=function\(station,options\)/);
  assert.match(liveWindowSource,/return original\(station,options\)/);
});
'''
Path('kerbside-backend/test/train-route-swap.test.mjs').write_text(test, encoding='utf-8')

print('Applied Kerbside 0.7.43 route swap recovery patch.')
