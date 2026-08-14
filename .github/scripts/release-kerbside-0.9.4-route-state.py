#!/usr/bin/env python3
from pathlib import Path
import subprocess

OLD_VERSION = '0.9.3'
NEW_VERSION = '0.9.4'


def replace_once(path, old, new, label):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source block, found {count}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


version_file = Path('VERSION')
version = version_file.read_text(encoding='utf-8').strip()
if version != OLD_VERSION:
    raise SystemExit(f'Expected Kerbside {OLD_VERSION} before release, found {version!r}')
version_file.write_text(NEW_VERSION + '\n', encoding='utf-8')

route_origin_anchor = """function setFromCrs(value){
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
route_origin_replacement = route_origin_anchor + """
function selectedOriginCrs(){
  const api = window.__KERBSIDE_TRAINS__;
  const selected = api && api.state && api.state.station;
  const crs = String(selected && (selected.crs || selected.crsCode) || '').trim().toUpperCase();
  return /^[A-Z0-9]{3}$/.test(crs) ? crs : '';
}

function ensureFromCrs(){
  const selected = selectedOriginCrs();
  if(selected){
    if(routeState.fromCrs === selected) return true;
    return setFromCrs(selected);
  }
  return /^[A-Z0-9]{3}$/.test(String(routeState.fromCrs || '').trim().toUpperCase());
}
"""
replace_once('kerbside-train-routes.js', route_origin_anchor, route_origin_replacement, 'route origin recovery helpers')
replace_once('kerbside-train-routes.js', """async function searchDestinations(query){
  if(!routeState.fromCrs) return [];
""", """async function searchDestinations(query){
  if(!ensureFromCrs()) return [];
""", 'destination search recovers origin')
replace_once('kerbside-train-routes.js', """function selectDestination(station,{reload=true}={}){
  if(!routeState.fromCrs || !station) return false;
""", """function selectDestination(station,{reload=true}={}){
  if(!station || !ensureFromCrs()) return false;
""", 'destination selection recovers origin')
replace_once('kerbside-train-routes.js', """async function submitDestination(){
  const input = $('trainDestinationQuery');
  if(!input || !routeState.fromCrs) return;
""", """async function submitDestination(){
  const input = $('trainDestinationQuery');
  if(!input || !ensureFromCrs()) return;
""", 'manual destination submit recovers origin')
replace_once('kerbside-train-routes.js', """  clearDestination,
  setFromCrs,
  selectDestination,
""", """  clearDestination,
  setFromCrs,
  ensureFromCrs,
  selectedOriginCrs,
  selectDestination,
""", 'expose route origin recovery')

replace_once('kerbside-journey-planner-core.js', """function selectOrigin(item){
  if(!item)return;
  const input=$('trainStationQuery'),go=$('trainStationGo');
  if(!input||!go)return;
  input.value=item.crs;
  go.click();
  setTimeout(()=>{if(input)input.value=item.name;const el=$('trainSuggest');if(el){el.hidden=true;el.innerHTML='';}if(isFutureJourney())dateApi()?.applyForecasts?.();},0);
}
""", """function selectOrigin(item){
  if(!item)return;
  const input=$('trainStationQuery'),go=$('trainStationGo');
  if(!input||!go)return;
  syncRouteOrigin(item);
  input.value=item.crs;
  go.click();
  setTimeout(()=>{const selected=window.__KERBSIDE_TRAINS__?.state?.station;syncRouteOrigin(selected||item);if(input)input.value=item.name;const el=$('trainSuggest');if(el){el.hidden=true;el.innerHTML='';}if(isFutureJourney())dateApi()?.applyForecasts?.();},0);
}
""", 'origin autocomplete synchronises route immediately')

wrapper_guard = """/* The planner can know the selected From station before train-routes.js has
   observed a provider request and copied that CRS into its own route state.
   Destination suggestions are still valid in that window, but the route
   module rejects their selection while fromCrs is blank. Capture destination
   activation before the route's delegated handler and synchronise the origin
   from the actual selected station first. This also covers keyboard-generated
   clicks, not just pointer/touch selection. */
function syncRouteOriginForDestination(){
  const route=window.__KERBSIDE_TRAIN_ROUTES__,trains=window.__KERBSIDE_TRAINS__;
  const selected=trains&&trains.state&&trains.state.station;
  const crs=String(selected&&(selected.crs||selected.crsCode)||'').trim().toUpperCase();
  if(!route||!/^[A-Z0-9]{3}$/.test(crs))return false;
  const current=String(route.state&&route.state.fromCrs||'').trim().toUpperCase();
  if(current===crs)return true;
  if(typeof route.setFromCrs==='function')return route.setFromCrs(crs)!==false;
  if(route.state){route.state.fromCrs=crs;return true;}
  return false;
}
function isDestinationSuggestionEvent(event){
  const target=event&&event.target;
  if(!target||typeof target.closest!=='function')return false;
  return !!target.closest('#trainDestinationSuggest [data-destination-index],#trainDestinationSuggest [data-k-to]');
}
function installDestinationOriginGuard(){
  if(typeof document==='undefined'||document.__kerbsideDestinationOriginGuard)return;
  document.__kerbsideDestinationOriginGuard=true;
  const sync=event=>{if(isDestinationSuggestionEvent(event))syncRouteOriginForDestination();};
  document.addEventListener('pointerdown',sync,true);
  document.addEventListener('click',sync,true);
}

"""
replace_once('kerbside-journey-planner-ui.js', wrapper_guard, '', 'remove destination origin capture guard')
replace_once('kerbside-journey-planner-ui.js', "window.__KERBSIDE_STATION_DATA__={state:stationState,load:loadStations,search,parseLocations,syncRouteOriginForDestination};\ninstallDestinationOriginGuard();\n", "window.__KERBSIDE_STATION_DATA__={state:stationState,load:loadStations,search,parseLocations};\n", 'remove destination guard export and install')

replace_once('kerbside-backend/test/train-route-swap.test.mjs', """function loadRoutes(){
  let refreshClicks=0;
""", """function loadRoutes({selectedStation=null}={}){
  let refreshClicks=0;
""", 'route harness accepts selected station')
replace_once('kerbside-backend/test/train-route-swap.test.mjs', """  const window={fetch:async()=>({ok:true,json:async()=>[]})};
""", """  const window={fetch:async()=>({ok:true,json:async()=>[]}),__KERBSIDE_TRAINS__:{state:{station:selectedStation}}};
""", 'route harness exposes train state')

old_guard_test = """function loadDestinationGuard(){
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

"""
new_guard_test = """test('route owner recovers the selected origin before destination selection',async()=>{
  const runtime=loadRoutes({selectedStation:{name:'Bristol Temple Meads',crs:'BRI'}}),api=runtime.api;
  assert.equal(api.state.fromCrs,'');
  assert.equal(api.selectDestination({name:'Birmingham New Street',crs:'BHM'},{reload:false}),true);
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(api.state.fromCrs,'BRI');
  assert.equal(api.state.destination.crs,'BHM');
  assert.equal(runtime.elements.trainDestinationQuery.value,'Birmingham New Street');
  assert.equal(runtime.refreshClicks,0);
});

test('route owner corrects a stale origin before attaching a new destination',()=>{
  const runtime=loadRoutes({selectedStation:{name:'Bristol Temple Meads',crs:'BRI'}}),api=runtime.api;
  assert.equal(api.setFromCrs('BHM'),true);
  assert.equal(api.selectDestination({name:'Gloucester',crs:'GLO'},{reload:false}),true);
  assert.equal(api.state.fromCrs,'BRI');
  assert.equal(api.state.destination.crs,'GLO');
});

test('route owner still refuses a destination when no origin exists anywhere',()=>{
  const runtime=loadRoutes(),api=runtime.api;
  assert.equal(api.selectDestination({name:'Birmingham New Street',crs:'BHM'},{reload:false}),false);
  assert.equal(api.state.fromCrs,'');
  assert.equal(api.state.destination,null);
});

test('all destination activation paths share the hardened route selector',()=>{
  assert.match(routeSource,/suggest\.addEventListener\('pointerdown',commit\)/);
  assert.match(routeSource,/suggest\.addEventListener\('click',commit,true\)/);
  assert.match(routeSource,/function selectDestination\(station,\{reload=true\}=\{\}\)\{\s*if\(!station \|\| !ensureFromCrs\(\)\) return false;/);
  assert.match(routeSource,/async function submitDestination\(\)\{\s*const input = \$\('trainDestinationQuery'\);\s*if\(!input \|\| !ensureFromCrs\(\)\) return;/);
  assert.match(plannerSource,/function selectOrigin\(item\)\{[\s\S]*?syncRouteOrigin\(item\);[\s\S]*?go\.click\(\);/);
  assert.doesNotMatch(plannerWrapperSource,/kerbsideDestinationOriginGuard|syncRouteOriginForDestination/);
});

"""
replace_once('kerbside-backend/test/train-route-swap.test.mjs', old_guard_test, new_guard_test, 'replace wrapper guard regression with route invariant coverage')

bus = Path('bus.html')
bus_text = bus.read_text(encoding='utf-8')
asset_count = bus_text.count('?v=0.9.3')
if asset_count < 10:
    raise SystemExit(f'rail cache keys: expected at least 10 0.9.3 assets, found {asset_count}')
bus.write_text(bus_text.replace('?v=0.9.3', '?v=0.9.4'), encoding='utf-8')

replace_once('kerbside-journey-planner-ui.js', "const PLANNER_CORE_URL='kerbside-journey-planner-core.js?v=0.9.3';", "const PLANNER_CORE_URL='kerbside-journey-planner-core.js?v=0.9.4';", 'planner core cache key')
replace_once('kerbside-journey-planner-ui.js', "const RAIL_HEALTH_URL='kerbside-rail-health.js?v=0.9.3';", "const RAIL_HEALTH_URL='kerbside-rail-health.js?v=0.9.4';", 'rail health cache key')
replace_once('kerbside-status.js', "const VERSION='0.9.3';", "const VERSION='0.9.4';", 'status release version')

subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)
print('Staged Kerbside 0.9.4 route-state hardening release.')
