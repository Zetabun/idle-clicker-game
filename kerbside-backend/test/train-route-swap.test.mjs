import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const routeSource=await fs.readFile(path.join(root,'kerbside-train-routes.js'),'utf8');
const plannerWrapperSource=await fs.readFile(path.join(root,'kerbside-journey-planner-ui.js'),'utf8');
const plannerSource=await fs.readFile(path.join(root,'kerbside-journey-planner-core.js'),'utf8');
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

function loadDestinationGuard(){
  const listeners={};
  const route={
    state:{fromCrs:'',destination:null},
    setFromCrs(crs){this.state.fromCrs=String(crs||'').toUpperCase();return true;}
  };
  const document={
    readyState:'loading',
    addEventListener(type,fn,capture){(listeners[type]||(listeners[type]=[])).push({fn,capture});},
    dispatchEvent(){},
    createElement(){return {src:'',async:true,onerror:null};},
    head:{appendChild(){}},
    documentElement:{appendChild(){}}
  };
  const window={
    fetch:async()=>({ok:true,json:async()=>({BRI:['Bristol Temple Meads','BRI','GW']})}),
    __KERBSIDE_TRAINS__:{state:{station:{name:'Bristol Temple Meads',crs:'BRI'}}},
    __KERBSIDE_TRAIN_ROUTES__:route
  };
  class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  const context={window,document,console,URL,Response,DOMException,CustomEvent,location:{href:'https://zetabun.github.io/bus.html'}};
  vm.createContext(context);vm.runInContext(plannerWrapperSource,context);
  return {api:window.__KERBSIDE_STATION_DATA__,route,listeners};
}

test('destination autocomplete synchronises the selected origin before route selection',()=>{
  const runtime=loadDestinationGuard();
  assert.equal(runtime.route.state.fromCrs,'');
  assert.equal(runtime.api.syncRouteOriginForDestination(),true);
  assert.equal(runtime.route.state.fromCrs,'BRI');

  const suggestion={closest(selector){return selector.includes('trainDestinationSuggest')?this:null;}};
  runtime.route.state.fromCrs='';
  runtime.listeners.pointerdown[0].fn({target:suggestion});
  assert.equal(runtime.route.state.fromCrs,'BRI');
  assert.equal(runtime.listeners.pointerdown[0].capture,true);

  runtime.route.state.fromCrs='';
  runtime.listeners.click[0].fn({target:suggestion});
  assert.equal(runtime.route.state.fromCrs,'BRI');
  assert.equal(runtime.listeners.click[0].capture,true);
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
