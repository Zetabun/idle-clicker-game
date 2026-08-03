from pathlib import Path

OLD = "0.6.55"
NEW = "0.6.56"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bus = read("bus.html")
bus = replace_once(bus, f"const APP_VERSION = '{OLD}';", f"const APP_VERSION = '{NEW}';", "browser version")
old_stops = """function drawStops(){
  stopLayer.clearLayers();
  S.stops.slice(0,80).forEach(s=>{
    const sel = S.stop && s.id===S.stop.id;
    const m = L.marker([s.lat,s.lon],{
      icon:L.divIcon({className:'',html:'<div class=\"stopmark'+(sel?' sel':'')+'\"></div>',
        iconSize:sel?[15,15]:[11,11], iconAnchor:sel?[7,7]:[5,5]}),
      zIndexOffset: sel?500:0
    }).addTo(stopLayer);
    m.on('click',()=>selectStop(s,true));
    m.bindTooltip(s.name+(s.ind?' ('+s.ind+')':''),{direction:'top',offset:[0,-8],className:'stoptip'});
  });
}"""
new_stops = """function selectStopFromMap(s){
  if(!s) return;
  selectStop(s,true);
  setAppView('times');
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),selectStopFromMap};
}
function drawStops(){
  stopLayer.clearLayers();
  S.stops.slice(0,80).forEach(s=>{
    const sel = S.stop && s.id===S.stop.id;
    const m = L.marker([s.lat,s.lon],{
      icon:L.divIcon({className:'',html:'<div class=\"stopmark'+(sel?' sel':'')+'\"></div>',
        iconSize:sel?[15,15]:[11,11], iconAnchor:sel?[7,7]:[5,5]}),
      zIndexOffset: sel?500:0
    }).addTo(stopLayer);
    m.on('click',()=>selectStopFromMap(s));
    m.bindTooltip(s.name+(s.ind?' ('+s.ind+')':''),{direction:'top',offset:[0,-8],className:'stoptip'});
  });
}"""
bus = replace_once(bus, old_stops, new_stops, "map stop selection")
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
browser = replace_once(
    browser,
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.55'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.56'/);",
    "browser version guard",
)
browser = replace_once(
    browser,
    "assert.match(busSource, /function ignoreMapContextMenu\\(e\\)/);",
    """assert.match(busSource, /function ignoreMapContextMenu\\(e\\)/);
assert.match(busSource, /function selectStopFromMap\\(s\\)/);
assert.match(busSource, /selectStop\\(s,true\\);\\n  setAppView\\('times'\\);/);
assert.match(busSource, /m\\.on\\('click',\\(\\)=>selectStopFromMap\\(s\\)\\)/);
assert.doesNotMatch(busSource, /m\\.on\\('click',\\(\\)=>selectStop\\(s,true\\)\\)/);""",
    "map stop selection source guards",
)
map_test_anchor = """  assert.deepEqual(mapContextMenu,{same:true,prevented:true,stopped:true,result:false});
  const alertGrace = await page.evaluate(() => {"""
map_test = """  assert.deepEqual(mapContextMenu,{same:true,prevented:true,stopped:true,result:false});
  const mapStopSelection = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState;
    const before=state.stop&&String(state.stop.id);
    const base=state.stop||state.origin||{lat:52.509,lon:-2.087};
    const target={id:'map-test-stop',name:'Map-selected stop',ind:'B',lat:Number(base.lat)+.0001,lon:Number(base.lon)+.0001,d:120,region:'test',shard:'aa',timetableId:'map-test-stop'};
    state.stops=[...state.stops.filter(stop=>String(stop.id)!==target.id),target];
    document.getElementById('vMap').click();
    api.selectStopFromMap(target);
    return {
      changed:before!==String(state.stop&&state.stop.id),
      selected:String(state.stop&&state.stop.id),
      target:target.id,
      heading:document.getElementById('stopName').textContent,
      appView:state.appView,
      timesSelected:document.getElementById('vTimes').getAttribute('aria-selected'),
      mapSelected:document.getElementById('vMap').getAttribute('aria-selected')
    };
  });
  assert.deepEqual(mapStopSelection,{
    changed:true,selected:'map-test-stop',target:'map-test-stop',heading:'Map-selected stop (B)',
    appView:'times',timesSelected:'true',mapSelected:'false'
  });
  const alertGrace = await page.evaluate(() => {"""
browser = replace_once(browser, map_test_anchor, map_test, "map stop selection browser regression")
browser = replace_once(
    browser,
    "textContent.includes('app 0.6.55')",
    "textContent.includes('app 0.6.56')",
    "settings version expectation",
)
write("kerbside-backend/tests/browser-regression.mjs", browser)

readme = read("kerbside-backend/README.md")
release_note = """Kerbside 0.6.56 makes every bus-stop marker on the map use the same shared stop-selection path as the Times stop picker. Tapping a marker now updates the selected stop, timetable, route filters and departure board, then opens the Times view on mobile so the result is immediately visible. WebKit regression verifies the shared stop state, displayed stop heading and tab selection all update together.

"""
readme = replace_once(
    readme,
    "The Worker remains backwards-compatible for live data:",
    release_note + "The Worker remains backwards-compatible for live data:",
    "release note",
)
write("kerbside-backend/README.md", readme)

print(f"Prepared Kerbside {NEW} map stop selection release.")