from pathlib import Path
import re

OLD = "0.6.52"
NEW = "0.6.53"


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
bus = replace_once(
    bus,
    "let meMarker=null, anchorMarker=null, routeLayer=L.layerGroup().addTo(map), stopLayer=L.layerGroup().addTo(map), vehLayer=L.layerGroup().addTo(map);\nlet ring=null;",
    "let meMarker=null, anchorMarker=null, routeLayer=L.layerGroup().addTo(map), stopLayer=L.layerGroup().addTo(map), vehLayer=L.layerGroup().addTo(map);\nlet renderedJourneyContext='';\nlet ring=null;",
    "route overlay state",
)

old_route_block = r"""function clearVehicleMarkers\(\)\{ vehLayer\.clearLayers\(\); routeLayer\.clearLayers\(\); S\.markers\.clear\(\); \}\n\nfunction renderSelectedJourney\(rows\)\{.*?\n\}\nfunction mapVehicleVisible"""
new_route_block = """function journeyRouteContext(selectedId){
  if(selectedId==null||selectedId==='') return '';
  return [String(selectedId),S.stop?String(S.stop.id):'',S.dir,String(S.destFilter||'')].join('|');
}
function shouldClearJourneyRoute(nextContext,currentContext){
  return !nextContext || (!!currentContext&&String(nextContext)!==String(currentContext));
}
function clearJourneyRoute(){ routeLayer.clearLayers(); renderedJourneyContext=''; }
function clearVehicleMarkers(){ vehLayer.clearLayers(); clearJourneyRoute(); S.markers.clear(); }

function renderSelectedJourney(rows){
  const selectedId=S.selected==null?'':String(S.selected), nextContext=journeyRouteContext(selectedId);
  if(shouldClearJourneyRoute(nextContext,renderedJourneyContext)){
    clearJourneyRoute();
    if(!nextContext) return;
  }
  const row=rows.find(item=>String(item.v.id)===selectedId);
  // Preserve the last valid exact route for this same selection when one
  // intermediate render temporarily lacks the row or lazy-loaded pattern.
  if(!row) return;
  // A held lost-signal row must not continue to present moving route progress.
  if(row.gpsLost){ clearJourneyRoute(); return; }
  const progress=journeyProgress(row.v);
  if(!progress||!progress.pattern.shape) return;
  routeLayer.clearLayers(); renderedJourneyContext=nextContext;
  const split=splitPatternAt(progress.pattern,progress.vehicle);
  if(split.passed.length>1) L.polyline(split.passed,{color:'#526276',weight:4,opacity:.72,dashArray:'5 7',interactive:false}).addTo(routeLayer);
  if(split.remaining.length>1) L.polyline(split.remaining,{color:'#FFB000',weight:5,opacity:.92,interactive:false}).addTo(routeLayer);
  progress.stops.forEach((stop,index)=>{
    const selected=index===progress.selectedIndex, next=index===progress.nextIndex, passed=index<progress.nextIndex;
    const marker=L.circleMarker([stop.lat,stop.lon],{
      radius:selected?6:next?5:3,
      color:selected?'#FFB000':next?'#3FD9A4':passed?'#526276':'#9AAABD',
      weight:selected||next?2:1,
      fillColor:selected?'#FFB000':next?'#3FD9A4':passed?'#526276':'#111A26',
      fillOpacity:(selected||next)?0.95:0.78,
      opacity:passed?0.58:0.9
    }).addTo(routeLayer);
    marker.bindTooltip(stop.name+(selected?' · your stop':next?' · next stop':''),{direction:'top',className:'stoptip'});
  });
}
function mapVehicleVisible"""
bus = sub_once(bus, old_route_block, new_route_block, "route overlay retention", re.S)

bus = replace_once(
    bus,
    "gpsMovementDirection,inferDirection,approachStrength,mapVehicleVisible,boardRefreshCanRender};",
    "gpsMovementDirection,inferDirection,approachStrength,mapVehicleVisible,boardRefreshCanRender,journeyRouteContext,shouldClearJourneyRoute,renderSelectedJourney,clearJourneyRoute,journeyRouteLayerSize:()=>routeLayer.getLayers().length};",
    "route overlay test exports",
)
write("bus.html", bus)

package = read("kerbside-backend/package.json")
package = replace_once(package, f'"version": "{OLD}"', f'"version": "{NEW}"', "package version")
write("kerbside-backend/package.json", package)

worker = read("kerbside-backend/src/worker.js")
worker = replace_once(worker, f"version: '{OLD}'", f"version: '{NEW}'", "worker version")
write("kerbside-backend/src/worker.js", worker)

worker_test = read("kerbside-backend/test/worker.test.js")
worker_test = replace_once(worker_test, f"assert.equal(body.version, '{OLD}');", f"assert.equal(body.version, '{NEW}');", "worker test version")
write("kerbside-backend/test/worker.test.js", worker_test)

browser = read("kerbside-backend/tests/browser-regression.mjs")
old_version_regex = OLD.replace('.', '\\.')
new_version_regex = NEW.replace('.', '\\.')
browser = replace_once(browser, f"assert.match(busSource, /const APP_VERSION = '{old_version_regex}'/);", f"assert.match(busSource, /const APP_VERSION = '{new_version_regex}'/);", "browser version guard")
browser = replace_once(
    browser,
    "assert.match(busSource, /feedRefreshing:false/);",
    "assert.match(busSource, /feedRefreshing:false/);\nassert.match(busSource, /function clearJourneyRoute/);\nassert.match(busSource, /function journeyRouteContext/);\nassert.match(busSource, /function shouldClearJourneyRoute/);\nassert.doesNotMatch(busSource, /function renderSelectedJourney\\(rows\\)\\{\\n  routeLayer\\.clearLayers\\(\\);/);",
    "route overlay source guards",
)

refresh_anchor = """  assert.equal(refreshGate.busy,false);
  assert.equal(refreshGate.idle,true);

  const emptyFeed = await page.evaluate"""
route_test = """  assert.equal(refreshGate.busy,false);
  assert.equal(refreshGate.idle,true);

  const routeOverlayRetention = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={
      selected:state.selected,stop:state.stop,dir:state.dir,destFilter:state.destFilter,
      timetable:state.timetable,timetableSource:state.timetableSource,
      timetableRegion:state.timetableRegion,timetableRun:state.timetableRun,
      vehicles:state.vehicles
    };
    const trip='route-overlay-trip',patternId='aa53routeoverlaypattern',vehicleId='route-overlay-vehicle';
    try{
      state.stop={id:'route-overlay-stop',timetableId:'route-overlay-stop',lat:52.5,lon:-2.1,name:'Route overlay stop',d:0};
      state.dir='all';state.destFilter=null;state.selected=vehicleId;
      state.timetable={services:{},tripPatterns:{[trip]:patternId},patterns:{
        [patternId]:{p:[[52.4,-2.1],[52.5,-2.1],[52.6,-2.1]],s:[
          ['start','Start',52.4,-2.1],['route-overlay-stop','Route overlay stop',52.5,-2.1],['end','End',52.6,-2.1]
        ],g:1}
      }};
      state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun++;
      const vehicle={id:vehicleId,journey:trip,progressTrip:trip,progressPattern:patternId,lat:52.45,lon:-2.1,bearing:0,ts:now,hist:[]};
      state.vehicles=new Map([[vehicleId,vehicle]]);
      api.clearJourneyRoute();
      api.renderSelectedJourney([{v:vehicle,gpsLost:false}]);
      const initial=api.journeyRouteLayerSize();
      api.renderSelectedJourney([]);
      const retained=api.journeyRouteLayerSize();
      api.renderSelectedJourney([{v:vehicle,gpsLost:true}]);
      const lostCleared=api.journeyRouteLayerSize();
      api.renderSelectedJourney([{v:vehicle,gpsLost:false}]);
      const redrawn=api.journeyRouteLayerSize();
      state.dir='in';
      api.renderSelectedJourney([]);
      const contextCleared=api.journeyRouteLayerSize();
      return {initial,retained,lostCleared,redrawn,contextCleared};
    }finally{
      api.clearJourneyRoute();
      Object.assign(state,saved);
    }
  });
  assert.ok(routeOverlayRetention.initial>0,JSON.stringify(routeOverlayRetention));
  assert.equal(routeOverlayRetention.retained,routeOverlayRetention.initial,JSON.stringify(routeOverlayRetention));
  assert.equal(routeOverlayRetention.lostCleared,0,JSON.stringify(routeOverlayRetention));
  assert.ok(routeOverlayRetention.redrawn>0,JSON.stringify(routeOverlayRetention));
  assert.equal(routeOverlayRetention.contextCleared,0,JSON.stringify(routeOverlayRetention));

  const emptyFeed = await page.evaluate"""
browser = replace_once(browser, refresh_anchor, route_test, "route overlay browser regression")
write("kerbside-backend/tests/browser-regression.mjs", browser)

readme = read("kerbside-backend/README.md")
release_note = """Kerbside 0.6.53 keeps an already displayed exact journey route visible when an intermediate board render temporarily lacks the selected row or its lazy-loaded pattern. The overlay is still cleared immediately when the user changes vehicle, stop, direction or destination context, and it is removed when GPS enters the held lost-signal state so stale movement is never presented as live progress. WebKit regression now draws a real route layer, verifies it survives a transient empty render, and confirms GPS-loss and context changes clear it.

"""
readme = replace_once(readme, "The Worker remains backwards-compatible for live data:", release_note + "The Worker remains backwards-compatible for live data:", "release note")
write("kerbside-backend/README.md", readme)

print(f"Prepared Kerbside {NEW} route overlay retention release.")
