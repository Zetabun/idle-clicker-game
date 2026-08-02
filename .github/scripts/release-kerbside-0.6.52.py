from pathlib import Path
import re

OLD = "0.6.51"
NEW = "0.6.52"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label, flags=0):
    text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text


bus = read("bus.html")
bus = replace_once(bus, f"const APP_VERSION = '{OLD}';", f"const APP_VERSION = '{NEW}';", "browser version")
bus = replace_once(bus, "const DATA_SHARD_MAX_AGE = 14*24*3600*1000;", "const DATA_SHARD_MAX_AGE = 14*24*3600*1000;\nconst DATA_DEPARTURE_MAX_AGE = 3*24*3600*1000;", "departure snapshot age")
bus = replace_once(
    bus,
    "timetable:null, fallbackTimetable:null, timetableSource:'', timetableRegion:'', timetableRun:0, patternPending:new Set(), ttStop:null, ttError:null, feedFallback:false,",
    "timetable:null, fallbackTimetable:null, timetableSource:'', timetableRegion:'', timetableBuilt:'', timetableFallback:false, timetableRun:0, patternPending:new Set(), ttStop:null, ttError:null, feedFallback:false,",
    "timetable fallback state",
)

bus = replace_once(
    bus,
    "</style>",
    """.map-tile-error{position:absolute;left:50%;top:18px;transform:translateX(-50%);z-index:1200;width:min(440px,calc(100% - 32px));padding:11px 14px;border:1px solid var(--warn);border-radius:9px;background:rgba(17,26,38,.96);box-shadow:0 12px 32px rgba(0,0,0,.5);text-align:center;pointer-events:none}\n.map-tile-error[hidden]{display:none}\n.map-tile-error strong{display:block;color:#FFD0CA;font-size:13px}\n.map-tile-error span{display:block;margin-top:3px;color:var(--text-dim);font-size:11.5px;line-height:1.45}\n</style>""",
    "map failure styles",
)

old_map = """let baseLayer=null,tileProviderIndex=-1,tileErrorCount=0;
function currentTileProvider(){return TILE_PROVIDERS[tileProviderIndex]&&TILE_PROVIDERS[tileProviderIndex].name||'';}
function useTileProvider(index,reason){
  const provider=TILE_PROVIDERS[index];
  if(!provider||index===tileProviderIndex) return;
  if(baseLayer) map.removeLayer(baseLayer);
  tileProviderIndex=index;tileErrorCount=0;
  baseLayer=L.tileLayer(provider.url,provider.options);
  baseLayer.on('tileload',()=>{if(tileProviderIndex===index) tileErrorCount=Math.max(0,tileErrorCount-1);});
  baseLayer.on('tileerror',()=>{
    if(tileProviderIndex!==index) return;
    tileErrorCount++;
    if(tileErrorCount>=TILE_ERROR_THRESHOLD&&index+1<TILE_PROVIDERS.length){
      useTileProvider(index+1,'Primary map tiles unavailable');
    }
  });
  baseLayer.addTo(map);
  if(reason) toast(reason+' — using '+provider.name+'.');
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),currentTileProvider};
}
useTileProvider(0);
const attributionEl=map.attributionControl&&map.attributionControl.getContainer();
if(attributionEl){
  attributionEl.querySelectorAll('a').forEach(link=>{link.target='_blank';link.rel='noopener noreferrer';});
}
"""
new_map = """let baseLayer=null,tileProviderIndex=-1,tileErrorCount=0,mapTileFailureWarned=false;
function currentTileProvider(){return TILE_PROVIDERS[tileProviderIndex]&&TILE_PROVIDERS[tileProviderIndex].name||'';}
function hardenMapAttributionLinks(){
  const attribution=map.attributionControl&&map.attributionControl.getContainer();
  if(attribution) attribution.querySelectorAll('a').forEach(link=>{link.target='_blank';link.rel='noopener noreferrer';});
}
function setMapTileFailure(failed){
  let node=$('mapTileError');
  if(!node){
    node=document.createElement('div');node.id='mapTileError';node.className='map-tile-error';node.hidden=true;node.setAttribute('role','alert');
    node.innerHTML='<strong>Map tiles unavailable</strong><span>The departure board is still working. Check your connection and retry the map shortly.</span>';
    $('map').appendChild(node);
  }
  node.hidden=!failed;
  if(!failed) mapTileFailureWarned=false;
}
function useTileProvider(index,reason){
  const provider=TILE_PROVIDERS[index];
  if(!provider||index===tileProviderIndex) return;
  if(baseLayer) map.removeLayer(baseLayer);
  setMapTileFailure(false);tileProviderIndex=index;tileErrorCount=0;
  baseLayer=L.tileLayer(provider.url,provider.options);
  baseLayer.on('tileload',()=>{if(tileProviderIndex===index){tileErrorCount=Math.max(0,tileErrorCount-1);setMapTileFailure(false);hardenMapAttributionLinks();}});
  baseLayer.on('tileerror',()=>{
    if(tileProviderIndex!==index) return;
    tileErrorCount++;
    if(tileErrorCount<TILE_ERROR_THRESHOLD) return;
    if(index+1<TILE_PROVIDERS.length) useTileProvider(index+1,'Primary map tiles unavailable');
    else{
      setMapTileFailure(true);
      if(!mapTileFailureWarned){mapTileFailureWarned=true;toast('Map tiles are unavailable. Live times remain available.',true);}
    }
  });
  baseLayer.addTo(map);hardenMapAttributionLinks();
  if(reason) toast(reason+' — using '+provider.name+'.');
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),currentTileProvider,hardenMapAttributionLinks,setMapTileFailure};
}
useTileProvider(0);hardenMapAttributionLinks();
"""
bus = replace_once(bus, old_map, new_map, "terminal map fallback")

bus = replace_once(
    bus,
    "function dataRegionsFor(lat,lon,radius,manifest){\n  const latPad=radius/111320, lonPad=radius/(111320*Math.max(.2,Math.cos(rad(lat))));\n  const names=[];\n  for(const [name,info] of Object.entries((manifest&&manifest.regions)||{})){\n    const b=info&&info.bounds; if(!Array.isArray(b)||b.length!==4) continue;\n    if(lon+lonPad>=b[0]&&lat+latPad>=b[1]&&lon-lonPad<=b[2]&&lat-latPad<=b[3]) names.push(name);\n  }\n  return names.length?names:Object.keys((manifest&&manifest.regions)||{});\n}",
    "function dataRegionsFor(lat,lon,radius,manifest,fallbackAll=true){\n  const latPad=radius/111320, lonPad=radius/(111320*Math.max(.2,Math.cos(rad(lat))));\n  const names=[];\n  for(const [name,info] of Object.entries((manifest&&manifest.regions)||{})){\n    const b=info&&info.bounds; if(!Array.isArray(b)||b.length!==4) continue;\n    if(lon+lonPad>=b[0]&&lat+latPad>=b[1]&&lon-lonPad<=b[2]&&lat-latPad<=b[3]) names.push(name);\n  }\n  return names.length||!fallbackAll?names:Object.keys((manifest&&manifest.regions)||{});\n}",
    "region lookup control",
)
bus = replace_once(bus, "now-Number(record.ts)>DATA_SHARD_MAX_AGE) return null;\n    return validDataDeparture", "now-Number(record.ts)>DATA_DEPARTURE_MAX_AGE) return null;\n    return validDataDeparture", "departure cache lifetime")

bus = sub_once(
    bus,
    r"async function nationalStopCandidates\(stop\)\{.*?\n\}\nasync function loadBestNationalStop\(stop\)\{",
    """function nationalStopRegionPlan(stop,manifest){
  const all=Object.keys((manifest&&manifest.regions)||{}), likely=dataRegionsFor(stop.lat,stop.lon,250,manifest,false);
  const primary=[...new Set([stop.region,...likely].filter(region=>region&&all.includes(region)))];
  const first=primary.length?primary:all;
  return {primary:first,fallback:all.filter(region=>!first.includes(region))};
}
async function loadNationalStopCandidates(stop,tile,regions){
  const settled=await Promise.allSettled(regions.map(async region=>({region,tile,data:await loadDataTile(region,tile)})));
  const candidates=[];
  for(const result of settled){
    if(result.status!=='fulfilled'||!result.value.data) continue;
    const matched=matchNationalTileStop(result.value.data,stop);
    if(matched) candidates.push({...result.value,...matched,tileSource:DATA_TILE_SOURCE.get(tileLogicalKey(result.value.region,tile))||''});
  }
  return candidates;
}
async function nationalStopCandidates(stop){
  const manifest=await loadDataManifest(false), tile=stop.tile||dataTileKey(stop.lat,stop.lon), plan=nationalStopRegionPlan(stop,manifest);
  const primary=await loadNationalStopCandidates(stop,tile,plan.primary);
  return primary.length||!plan.fallback.length?primary:loadNationalStopCandidates(stop,tile,plan.fallback);
}
async function loadBestNationalStop(stop){""",
    "staged timetable region search",
    re.S,
)
bus = replace_once(
    bus,
    "return {...candidate,shard,data,timetableStop,departureCount:Array.isArray(timetableStop.d)?timetableStop.d.length:0};",
    "const departureSource=DATA_DEPARTURE_SOURCE.get(departureLogicalKey(candidate.region,shard))||'';\n    return {...candidate,shard,data,timetableStop,departureSource,departureCount:Array.isArray(timetableStop.d)?timetableStop.d.length:0};",
    "departure source tracking",
)
bus = replace_once(
    bus,
    "  return valid[0];\n}",
    "  const best=valid[0], sources=[best.tileSource,best.departureSource].filter(Boolean);\n  return {...best,fallback:sources.some(source=>source!=='network')};\n}",
    "timetable fallback result",
)

bus = replace_once(
    bus,
    "function activateTimetable(data,source,region){\n  S.timetable=data||null; S.timetableSource=source||''; S.timetableRegion=region||''; PATTERN_CACHE.clear();\n}",
    "function activateTimetable(data,source,region,meta){\n  const info=meta||{};S.timetable=data||null;S.timetableSource=source||'';S.timetableRegion=region||'';\n  S.timetableBuilt=String(info.built||(data&&data.built)||'');S.timetableFallback=!!info.fallback;PATTERN_CACHE.clear();\n}",
    "timetable metadata",
)
bus = replace_once(bus, "activateTimetable(matched.data,'national',matched.region); S.ttError=null;", "activateTimetable(matched.data,'national',matched.region,{built:matched.data&&matched.data.built,fallback:matched.fallback}); S.ttError=null;", "national timetable metadata")

bus = replace_once(
    bus,
    "function timetablePatternRecord(journey,preferredPatternId){\n  const tt=S.timetable;\n  if(!tt||!tt.tripPatterns) return null;\n  const journeyKey=String(journey||''), aliasKey='trip:'+journeyKey;\n  let id=String(preferredPatternId||'')||tt.tripPatterns[journeyKey];",
    "function timetablePatternId(journey,preferredPatternId){\n  const tt=S.timetable;if(!tt||!tt.tripPatterns) return '';\n  const journeyKey=String(journey||''), aliasKey='trip:'+journeyKey;\n  let id=String(preferredPatternId||'')||tt.tripPatterns[journeyKey];\n  if(!id&&journeyKey){\n    if(PATTERN_CACHE.has(aliasKey)) id=PATTERN_CACHE.get(aliasKey)||'';\n    else{const match=uniqueCompatibleTrips(Object.keys(tt.tripPatterns),journeyKey,ref=>ref);id=match.items.length?tt.tripPatterns[match.ref]:'';PATTERN_CACHE.set(aliasKey,id||'');}\n  }\n  return String(id||'');\n}\nfunction timetablePatternLoadState(journey,preferredPatternId){\n  const id=timetablePatternId(journey,preferredPatternId);if(!id) return 'unavailable';\n  if(S.timetable&&S.timetable.patterns&&S.timetable.patterns[id]) return 'ready';\n  if(S.timetableSource!=='national') return 'unavailable';\n  const prefix=id.toLowerCase().replace(/[^a-f0-9]/g,'').slice(0,2), key=prefix.length===2?patternLogicalKey(S.timetableRegion,prefix):'';\n  if(key&&Date.now()<(DATA_PATTERN_RETRY.get(key)||0)) return 'failed';\n  return 'loading';\n}\nfunction timetablePatternRecord(journey,preferredPatternId){\n  const tt=S.timetable;\n  if(!tt||!tt.tripPatterns) return null;\n  const id=timetablePatternId(journey,preferredPatternId);",
    "pattern loading state",
)
bus = sub_once(bus, r"\n  if\(!id&&journeyKey\)\{.*?\n  \}\n  if\(!id\) return null;", "\n  if(!id) return null;", "remove duplicate pattern resolver", re.S)
bus = replace_once(bus, "finally{S.patternPending.delete(requestKey);}", "finally{S.patternPending.delete(requestKey);render();}", "pattern render completion")

bus = replace_once(
    bus,
    "function journeyProgressHtml(v){\n  const progress=journeyProgress(v);\n  if(!progress){\n    return '<div class=\"journey-progress journey-progress-unavailable\"><b>Journey progress unavailable.</b> Kerbside only shows route progress after this live vehicle is matched to an exact ordered timetable journey.</div>';\n  }",
    "function journeyProgressHtml(v){\n  const progress=journeyProgress(v);\n  if(!progress){\n    const state=timetablePatternLoadState(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern);\n    if(state==='loading') return '<div class=\"journey-progress journey-progress-unavailable\"><b>Loading journey progress…</b> Kerbside is fetching the ordered route for this exact journey.</div>';\n    if(state==='failed') return '<div class=\"journey-progress journey-progress-unavailable\"><b>Journey progress could not be loaded.</b> Kerbside will retry the route data shortly.</div>';\n    return '<div class=\"journey-progress journey-progress-unavailable\"><b>Journey progress unavailable.</b> Kerbside only shows route progress after this live vehicle is matched to an exact ordered timetable journey.</div>';\n  }",
    "journey loading copy",
)

bus = replace_once(
    bus,
    "function updateStopMeta(){",
    "function timetableBuildLabel(){const d=new Date(S.timetableBuilt||'');return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});}\nfunction timetableSourceLabel(){return S.timetableFallback?'last-known timetable':'scheduled';}\nfunction updateStopMeta(){",
    "timetable source helpers",
)
bus = replace_once(bus, "if(S.timetableSource==='national')?' · official timetable stop'", "if(S.timetableSource==='national')?(S.timetableFallback?' · last-known timetable'+(timetableBuildLabel()?' · built '+timetableBuildLabel():''):' · official timetable stop')", "stop fallback label")

bus = replace_once(
    bus,
    "    if(prev && Number(v.ts)<Number(prev.ts)){\n      mergeOlderVehicleEvidence(prev,v,now);\n      continue;\n    }\n    if(prev && v.ts>prev.ts){",
    "    if(prev && Number(v.ts)<Number(prev.ts)){mergeOlderVehicleEvidence(prev,v,now);continue;}\n    const journeyChanged=!!(prev&&prev.journey&&v.journey&&prev.journey!==v.journey);\n    if(journeyChanged){rec.hist=[];rec.speed=null;rec.cadence=null;}\n    if(prev && !journeyChanged && v.ts>prev.ts){",
    "journey movement reset",
)
bus = replace_once(bus, "if(prev && (prev.lat!==v.lat || prev.lon!==v.lon)){", "if(prev && !journeyChanged && (prev.lat!==v.lat || prev.lon!==v.lon)){", "journey speed reset")
bus = replace_once(bus, "const sameJourney=!prev||!prev.journey||!v.journey||prev.journey===v.journey;", "const sameJourney=!journeyChanged&&(!prev||!prev.journey||!v.journey||prev.journey===v.journey);", "same journey state")
bus = replace_once(bus, "if(prev&&prev.journey&&v.journey&&prev.journey!==v.journey){ delete rec.routeProjection; delete rec.corridorTrip; delete rec.corridorRemaining; delete rec.corridorConfirmedAt; }", "if(journeyChanged){delete rec.routeProjection;delete rec.corridorTrip;delete rec.corridorRemaining;delete rec.corridorConfirmedAt;delete rec.lastShownSnapshot;delete rec.lastShownAt;delete rec.lastShownArrivalAt;}", "journey cleanup")

bus = sub_once(
    bus,
    r"/\* inbound = getting closer to the town anchor \*/.*?function approaching\(v, stop\)\{ return approachStrength\(v,stop\)>=0; \}",
    """/* inbound = getting closer to the town anchor */
const MOVEMENT_WINDOW_POINTS=4;
function recentMovementPoints(v){
  const out=[];
  for(const p of Array.isArray(v&&v.hist)?v.hist:[]){const lat=Number(p.lat),lon=Number(p.lon),ts=Number(p.ts),last=out[out.length-1];if(isFinite(lat)&&isFinite(lon)&&isFinite(ts)&&(!last||ts>last.ts)) out.push({lat,lon,ts});}
  return out.slice(-MOVEMENT_WINDOW_POINTS);
}
function movementTrend(v,target){
  if(!target) return 0;const points=recentMovementPoints(v);if(points.length<3) return 0;
  let toward=0,away=0;
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(dist(a.lat,a.lon,b.lat,b.lon)<12) continue;const delta=dist(a.lat,a.lon,target.lat,target.lon)-dist(b.lat,b.lon,target.lat,target.lon);if(delta>10)toward++;else if(delta<-10)away++;}
  return toward>=2&&toward>away?1:away>=2&&away>toward?-1:0;
}
function gpsMovementDirection(v){if(!S.anchor||S.anchor.synthetic) return 'unknown';const trend=movementTrend(v,S.anchor);return trend>0?'in':trend<0?'out':'unknown';}
function inferDirection(v){
  const movement=gpsMovementDirection(v);if(movement!=='unknown') return movement;
  if(v.declaredDir){if(v.declaredDir.startsWith('in')) return 'in';if(v.declaredDir.startsWith('out')) return 'out';}
  if(S.anchor&&!S.anchor.synthetic&&isFinite(v.bearing)){const toAnchor=bearingTo(v.lat,v.lon,S.anchor.lat,S.anchor.lon),diff=Math.abs(((v.bearing-toAnchor+540)%360)-180);return diff<75?'in':diff>105?'out':'unknown';}
  return 'unknown';
}
function approachStrength(v,stop){
  const trend=movementTrend(v,stop);if(trend) return trend>0?2:-2;
  if(isFinite(v.bearing)){const toStop=bearingTo(v.lat,v.lon,stop.lat,stop.lon),diff=Math.abs(((v.bearing-toStop+540)%360)-180);if(diff<70)return 1;if(diff>115)return -1;}
  return 0;
}
function approaching(v, stop){ return approachStrength(v,stop)>=0; }""",
    "recent movement direction",
    re.S,
)

bus = replace_once(bus, "function renderScheduledRow(r){\n  const s=r.schedule, mins=Math.max(0,Math.round(r.secs/60)), due=mins<=1;", "function renderScheduledRow(r){\n  const s=r.schedule, mins=Math.max(0,Math.round(r.secs/60)), due=mins<=1, source=timetableSourceLabel();", "schedule source")
bus = replace_once(bus, "<span class=\"chip schedule-source\">scheduled</span>", "<span class=\"chip schedule-source\">'+esc(source)+'</span>", "schedule fallback badge")

bus = replace_once(bus, "function renderVehicles(rows){\n  const wanted = new Map(rows.map(r=>[r.v.id,r]));", "function mapVehicleVisible(v,shown,now=Date.now()){return !!(shown||(v&&now-Number(v.ts)<=MAX_AGE_MS));}\nfunction renderVehicles(rows){\n  const wanted = new Map(rows.map(r=>[r.v.id,r])),now=Date.now();", "map freshness helper")
bus = replace_once(bus, "const keep=wanted.has(id)||(v&&S.stop&&dist(v.lat,v.lon,S.stop.lat,S.stop.lon)<=MAX_VEH_DIST);", "const shown=wanted.has(id),keep=mapVehicleVisible(v,shown,now)&&(shown||(v&&S.stop&&dist(v.lat,v.lon,S.stop.lat,S.stop.lon)<=MAX_VEH_DIST));", "stale marker removal")
bus = replace_once(bus, "if(!shown&&!nearby) continue;", "if(!mapVehicleVisible(v,shown,now)||(!shown&&!nearby)) continue;", "fresh map loop")

bus = replace_once(
    bus,
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads,fetchLive,ingest,relevant,liveState:S,pointAlongPattern,vehicleJourneyRef,routeScanPlans,matchRouteScanVehicle,pollRouteCorridor,journeyProgress,gpsMovementDirection};",
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads,fetchLive,ingest,relevant,liveState:S,pointAlongPattern,vehicleJourneyRef,routeScanPlans,matchRouteScanVehicle,pollRouteCorridor,journeyProgress,journeyProgressHtml,timetablePatternLoadState,nationalStopRegionPlan,recentMovementPoints,movementTrend,gpsMovementDirection,inferDirection,approachStrength,mapVehicleVisible};",
    "test exports",
)
write("bus.html", bus)

package = replace_once(read("kerbside-backend/package.json"), f'"version": "{OLD}"', f'"version": "{NEW}"', "package version")
write("kerbside-backend/package.json", package)
worker = replace_once(read("kerbside-backend/src/worker.js"), f"version: '{OLD}'", f"version: '{NEW}'", "Worker version")
write("kerbside-backend/src/worker.js", worker)
worker_test = replace_once(read("kerbside-backend/test/worker.test.js"), f"assert.equal(body.version, '{OLD}');", f"assert.equal(body.version, '{NEW}');", "Worker test version")
write("kerbside-backend/test/worker.test.js", worker_test)

browser = read("kerbside-backend/tests/browser-regression.mjs").replace(OLD, NEW)
browser = replace_once(browser, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.52'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.52'/);\nassert.match(busSource, /const MOVEMENT_WINDOW_POINTS=4/);\nassert.match(busSource, /function timetablePatternLoadState/);\nassert.match(busSource, /Loading journey progress/);\nassert.match(busSource, /last-known timetable/);\nassert.match(busSource, /function mapVehicleVisible/);", "browser source guards")
browser = replace_once(browser, "assert.match(busSource, /function useTileProvider\\(index,reason\\)/);", "assert.match(busSource, /function useTileProvider\\(index,reason\\)/);\nassert.match(busSource, /function hardenMapAttributionLinks/);\nassert.match(busSource, /function setMapTileFailure/);\nassert.match(busSource, /Map tiles unavailable/);", "map source guards")
fixture_marker = "  assert.equal(gpsSafety.wrongBoardDirection,false);\n\n  const emptyFeed = await page.evaluate(async () => {"
fixture = """  assert.equal(gpsSafety.wrongBoardDirection,false);

  const resilience = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now(),saved={anchor:state.anchor,timetable:state.timetable,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion,patternPending:new Set(state.patternPending)};
    try{
      const vehicle={hist:[{lat:52.40,lon:-2.1,ts:now-80000},{lat:52.45,lon:-2.1,ts:now-60000},{lat:52.44,lon:-2.1,ts:now-40000},{lat:52.43,lon:-2.1,ts:now-20000},{lat:52.42,lon:-2.1,ts:now}],bearing:NaN};
      state.anchor={lat:52.6,lon:-2.1,name:'Town',synthetic:false};const direction=api.gpsMovementDirection(vehicle),recent=api.recentMovementPoints(vehicle).length;
      state.anchor={lat:52.6,lon:-2.1,name:'Local',synthetic:true};const synthetic=api.gpsMovementDirection(vehicle);
      const staleMap=api.mapVehicleVisible({ts:now-5*60000},false,now),heldMap=api.mapVehicleVisible({ts:now-5*60000},true,now);
      const id='aa52loadingpattern0001';state.timetable={tripPatterns:{trip:id},patterns:{}};state.timetableSource='national';state.timetableRegion='west_midlands';state.patternPending.add('west_midlands/aa');
      const loading=api.timetablePatternLoadState('trip',''),html=api.journeyProgressHtml({journey:'trip',progressTrip:'trip',progressPattern:id});
      const plan=api.nationalStopRegionPlan({region:'west_midlands',lat:52.5,lon:-2.1},{regions:{west_midlands:{bounds:[-3,51,-1,53]},north_west:{bounds:[-4,53,-1,56]}}});
      return {direction,recent,synthetic,staleMap,heldMap,loading,html,primary:plan.primary,fallback:plan.fallback};
    }finally{state.patternPending.clear();for(const item of saved.patternPending)state.patternPending.add(item);Object.assign(state,{anchor:saved.anchor,timetable:saved.timetable,timetableSource:saved.timetableSource,timetableRegion:saved.timetableRegion});}
  });
  assert.equal(resilience.direction,'out');assert.equal(resilience.recent,4);assert.equal(resilience.synthetic,'unknown');assert.equal(resilience.staleMap,false);assert.equal(resilience.heldMap,true);assert.equal(resilience.loading,'loading');assert.match(resilience.html,/Loading journey progress/);assert.deepEqual(resilience.primary,['west_midlands']);assert.deepEqual(resilience.fallback,['north_west']);

  const emptyFeed = await page.evaluate(async () => {"""
browser = replace_once(browser, fixture_marker, fixture, "resilience browser fixture")
write("kerbside-backend/tests/browser-regression.mjs", browser)

readme = read("kerbside-backend/README.md")
readme = replace_once(
    readme,
    "\nThe Worker remains backwards-compatible for live data:",
    "\nKerbside 0.6.52 improves timetable and interface resilience. Direction and approach decisions now use the most recent monotonic GPS segments, synthetic search anchors no longer act as strong direction evidence, and movement state resets on a confirmed journey change. Lazy journey patterns display loading and retry states, stop matching checks likely regions before widening nationally, and snapshot-backed schedules are labelled as last-known timetable data with a shorter departure fallback lifetime. Stale map ghosts are removed, complete basemap failure shows a persistent warning, and replacement attribution links remain hardened.\n\nThe Worker remains backwards-compatible for live data:",
    "README release note",
)
write("kerbside-backend/README.md", readme)

for path, needles in {
    "bus.html": [f"const APP_VERSION = '{NEW}';", "MOVEMENT_WINDOW_POINTS=4", "Loading journey progress", "last-known timetable", "Map tiles unavailable"],
    "kerbside-backend/tests/browser-regression.mjs": ["const resilience = await page.evaluate", f"version: '{NEW}'"],
    "kerbside-backend/README.md": ["Kerbside 0.6.52 improves timetable and interface resilience"],
}.items():
    text = read(path)
    for needle in needles:
        if needle not in text:
            raise SystemExit(f"{path}: missing release guard {needle!r}")

print(f"Prepared Kerbside {NEW}")
