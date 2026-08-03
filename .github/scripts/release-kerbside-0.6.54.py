from pathlib import Path

OLD = "0.6.53"
NEW = "0.6.54"


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
bus = replace_once(
    bus,
    "#map{flex:1;background:#0A0F16;z-index:1}",
    "#map{flex:1;background:#0A0F16;z-index:1;-webkit-touch-callout:none}",
    "map touch callout suppression",
)
old_context = """map.on('contextmenu', e=>{
  S.anchor={lat:e.latlng.lat, lon:e.latlng.lng, name:'Town centre'};
  drawAnchor(); updateDirLabels(); render();
  toast('Town centre moved. \"Into town\" now means heading here.');
});"""
new_context = """function ignoreMapContextMenu(e){
  const original=e&&e.originalEvent;
  if(original){
    L.DomEvent.preventDefault(original);
    L.DomEvent.stopPropagation(original);
  }
  return false;
}
map.on('contextmenu',ignoreMapContextMenu);"""
bus = replace_once(bus, old_context, new_context, "map context-menu behaviour")
bus = replace_once(
    bus,
    "mapVehicleVisible,boardRefreshCanRender,journeyRouteContext,shouldClearJourneyRoute",
    "mapVehicleVisible,boardRefreshCanRender,ignoreMapContextMenu,journeyRouteContext,shouldClearJourneyRoute",
    "map context-menu test export",
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
browser = replace_once(
    browser,
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.53'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.54'/);",
    "browser version guard",
)
browser = replace_once(
    browser,
    "assert.match(busSource, /function shouldClearJourneyRoute/);",
    """assert.match(busSource, /function shouldClearJourneyRoute/);
assert.match(busSource, /function ignoreMapContextMenu\\(e\\)/);
assert.match(busSource, /map\\.on\\('contextmenu',ignoreMapContextMenu\\)/);
assert.match(busSource, /-webkit-touch-callout:none/);
assert.doesNotMatch(busSource, /Town centre moved/);
assert.doesNotMatch(busSource, /S\\.anchor=\\{lat:e\\.latlng\\.lat/);""",
    "map hold source guards",
)
map_test_anchor = """  assert.deepEqual(cleanedNames, ['St Helens', 'Bury St Edmunds', 'High St']);
  const alertGrace = await page.evaluate(() => {"""
map_test = """  assert.deepEqual(cleanedNames, ['St Helens', 'Bury St Edmunds', 'High St']);
  const mapContextMenu = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,previous=state.anchor;
    const anchor={lat:52.509,lon:-2.087,name:'Original town'};
    let prevented=false,stopped=false;
    state.anchor=anchor;
    try{
      const result=api.ignoreMapContextMenu({originalEvent:{
        preventDefault(){prevented=true;},
        stopPropagation(){stopped=true;}
      }});
      return {same:state.anchor===anchor,prevented,stopped,result};
    }finally{state.anchor=previous;}
  });
  assert.deepEqual(mapContextMenu,{same:true,prevented:true,stopped:true,result:false});
  const alertGrace = await page.evaluate(() => {"""
browser = replace_once(browser, map_test_anchor, map_test, "map hold browser regression")
browser = replace_once(
    browser,
    "textContent.includes('app 0.6.53')",
    "textContent.includes('app 0.6.54')",
    "settings version expectation",
)
write("kerbside-backend/tests/browser-regression.mjs", browser)

readme = read("kerbside-backend/README.md")
release_note = """Kerbside 0.6.54 removes the hidden map long-press/right-click shortcut that previously redefined the town anchor. Mobile press-and-hold and desktop context-menu gestures are now suppressed without changing the selected town, stop, direction filters or map position; location changes remain available only through the explicit search and current-location controls. WebKit regression verifies the gesture is cancelled and the existing town anchor remains untouched.

"""
readme = replace_once(
    readme,
    "The Worker remains backwards-compatible for live data:",
    release_note + "The Worker remains backwards-compatible for live data:",
    "release note",
)
write("kerbside-backend/README.md", readme)

print(f"Prepared Kerbside {NEW} map long-press safety release.")
