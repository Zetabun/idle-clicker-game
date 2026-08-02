import re
from urllib.request import urlopen

URL = "https://raw.githubusercontent.com/Zetabun/idle-clicker-game/100188599a5ef969f36985971e81720f045c64f0/.github/scripts/release-kerbside-0.6.52.py"
source = urlopen(URL, timeout=20).read().decode("utf-8")

old = '"if(S.timetableSource===\'national\')?\' · official timetable stop\'"'
new = '"S.timetableSource===\'national\'?\' · official timetable stop\'"'
if source.count(old) != 1:
    raise SystemExit(f"release loader: expected one stop-label replacement, found {source.count(old)}")
source = source.replace(old, new, 1)
source = source.replace(
    '"if(S.timetableSource===\'national\')?(S.timetableFallback?',
    '"S.timetableSource===\'national\'?(S.timetableFallback?',
    1,
)
source = source.replace("let node=$('mapTileError');", "let node=document.getElementById('mapTileError');")
source = source.replace("$('map').appendChild(node);", "document.getElementById('map').appendChild(node);")

release_note = "Stale map ghosts are removed, complete basemap failure shows a persistent warning"
release_note_new = "Live feed refreshes now update atomically without clearing the displayed board. Stale map ghosts are removed, complete basemap failure shows a persistent warning"
if source.count(release_note) != 1:
    raise SystemExit(f"release loader: expected one README release note, found {source.count(release_note)}")
source = source.replace(release_note, release_note_new, 1)

for label in ("browser source guards", "map source guards"):
    pattern = rf'^browser = replace_once\(browser, .*?, "{re.escape(label)}"\)\n'
    source, count = re.subn(pattern, "browser = browser\n", source, count=1, flags=re.M)
    if count != 1:
        raise SystemExit(f"release loader: could not remove {label}")

bad_resolver = 'bus = sub_once(bus, r"\\n  if\\(!id&&journeyKey\\)\\{.*?\\n  \\}\\n  if\\(!id\\) return null;", "\\n  if(!id) return null;", "remove duplicate pattern resolver", re.S)'
good_resolver = 'bus = sub_once(bus, r"(const id=timetablePatternId\\(journey,preferredPatternId\\);)\\n  if\\(!id&&journeyKey\\)\\{.*?\\n  \\}\\n  if\\(!id\\) return null;", r"\\1\\n  if(!id) return null;", "remove duplicate pattern resolver", re.S)'
if source.count(bad_resolver) != 1:
    raise SystemExit(f"release loader: expected one resolver cleanup, found {source.count(bad_resolver)}")
source = source.replace(bad_resolver, good_resolver, 1)

bus_write = 'write("bus.html", bus)'
bus_guard = '''old_map_helper = "function mapVehicleVisible(v,shown,now=Date.now()){return !!(shown||(v&&now-Number(v.ts)<=MAX_AGE_MS));}"
new_map_helper = "function mapVehicleVisible(v,shown,now=Date.now()){const age=now-Number(v&&v.ts);return !!(shown||(Number.isFinite(age)&&age>=0&&age<=4*60*1000));}"
if bus.count(old_map_helper) == 1:
    bus = bus.replace(old_map_helper, new_map_helper, 1)
elif bus.count(new_map_helper) != 1:
    raise SystemExit(f"map visibility helper: expected old or new helper once, found old={bus.count(old_map_helper)} new={bus.count(new_map_helper)}")

bus = replace_once(
    bus,
    "timer:null, tick:null, motionTimer:null, busy:false, pollAgain:false, lastOk:0, lastFeedAt:0,",
    "timer:null, tick:null, motionTimer:null, busy:false, feedRefreshing:false, pollAgain:false, lastOk:0, lastFeedAt:0,",
    "background refresh state",
)
bus = replace_once(
    bus,
    "finally{S.patternPending.delete(requestKey);render();}",
    "finally{S.patternPending.delete(requestKey);if(boardRefreshCanRender()) render();}",
    "defer pattern repaint during live refresh",
)
bus = replace_once(
    bus,
    "if(vehicles.length){ ingest(vehicles); learnDests(); renderDests(); render(); }",
    "if(vehicles.length){ ingest(vehicles); learnDests(); renderDests(); if(boardRefreshCanRender()) render(); else renderLiveDiagnostics(); }",
    "defer route-scan repaint during live refresh",
)
bus = replace_once(
    bus,
    "  S.tick=setInterval(()=>{ if(S.stop) render(); },5000);",
    "  S.tick=setInterval(()=>{ if(S.stop&&boardRefreshCanRender()) render(); },5000);",
    "defer timer repaint during live refresh",
)
bus = replace_once(
    bus,
    "  S.timer=S.tick=S.motionTimer=null;S.pollAbort=null;S.routeScanAbort=null;S.routeScanBusy=false;",
    "  S.timer=S.tick=S.motionTimer=null;S.pollAbort=null;S.routeScanAbort=null;S.routeScanBusy=false;S.feedRefreshing=false;",
    "reset background refresh state",
)
bus = replace_once(
    bus,
    "let lastPoll=Date.now();\nasync function poll(force){",
    "function boardRefreshCanRender(){return !S.feedRefreshing;}\nlet lastPoll=Date.now();\nasync function poll(force){",
    "background refresh render gate",
)
bus = replace_once(
    bus,
    "  S.busy=true;\n  const ctl=new AbortController(); S.pollAbort=ctl;",
    "  S.busy=true; S.feedRefreshing=true;\n  const ctl=new AbortController(); S.pollAbort=ctl;",
    "begin atomic live refresh",
)
bus = replace_once(
    bus,
    "    renderGpsStats();\n    render();",
    "    renderGpsStats();\n    S.feedRefreshing=false;\n    render();",
    "commit atomic live refresh",
)
bus = replace_once(
    bus,
    "      if(Date.now()-S.lastOk>25000) toast(msg,true);\n      render();",
    "      if(Date.now()-S.lastOk>25000) toast(msg,true);\n      S.feedRefreshing=false;\n      render();",
    "release failed live refresh",
)
bus = replace_once(
    bus,
    "  }finally{\n    if(S.pollAbort===ctl) S.pollAbort=null;",
    "  }finally{\n    S.feedRefreshing=false;\n    if(S.pollAbort===ctl) S.pollAbort=null;",
    "finalise atomic live refresh",
)
bus = replace_once(
    bus,
    "gpsMovementDirection,inferDirection,approachStrength,mapVehicleVisible};",
    "gpsMovementDirection,inferDirection,approachStrength,mapVehicleVisible,boardRefreshCanRender};",
    "background refresh test export",
)
write("bus.html", bus)'''
if source.count(bus_write) != 1:
    raise SystemExit(f"release loader: expected one bus write, found {source.count(bus_write)}")
source = source.replace(bus_write, bus_guard, 1)

marker = 'browser = read("kerbside-backend/tests/browser-regression.mjs").replace(OLD, NEW)\n'
addition = (
    'browser = browser.replace("assert.match(busSource, /if\\\\(!shown&&!nearby\\\\) continue/);", "assert.match(busSource, /function mapVehicleVisible/);")\n'
    'browser = browser.replace("assert.match(busSource, /const APP_VERSION = \'0\\\\.6\\\\.51\'/);", "assert.match(busSource, /const APP_VERSION = \'0\\\\.6\\\\.52\'/);")\n'
    'browser = browser.replace("  await page.goto(`http://127.0.0.1:${address.port}/bus.html`, { waitUntil: \'domcontentloaded\' });", "  const pageErrors=[];\\n  page.on(\'pageerror\',error=>pageErrors.push(error.message));\\n  await page.goto(`http://127.0.0.1:${address.port}/bus.html`, { waitUntil: \'domcontentloaded\' });")\n'
    'browser = browser.replace("  assert.equal(await page.locator(\'#map.leaflet-container\').count(), 1);", "  assert.equal(await page.locator(\'#map.leaflet-container\').count(), 1, pageErrors.join(\'\\\\n\'));" )\n'
)
if source.count(marker) != 1:
    raise SystemExit(f"release loader: expected one browser test load, found {source.count(marker)}")
source = source.replace(marker, marker + addition, 1)

browser_write = 'write("kerbside-backend/tests/browser-regression.mjs", browser)'
browser_guard = '''browser = replace_once(
    browser,
    "assert.match(busSource, /const APP_VERSION = '0\\\\.6\\\\.52'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\\\.6\\\\.52'/);\\nassert.match(busSource, /age<=4\\\\*60\\\\*1000/);\\nassert.match(busSource, /function boardRefreshCanRender/);\\nassert.match(busSource, /feedRefreshing:false/);",
    "resilience source guards",
)
browser = browser.replace(
    "assert.equal(resilience.staleMap,false);",
    "assert.equal(resilience.staleMap,false,JSON.stringify(resilience));",
)
refresh_anchor = "assert.deepEqual(resilience.fallback,['north_west']);\\n\\n  const emptyFeed = await page.evaluate"
refresh_test = """assert.deepEqual(resilience.fallback,['north_west']);

  const refreshGate = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,saved=state.feedRefreshing;
    try{
      state.feedRefreshing=true;const busy=api.boardRefreshCanRender();
      state.feedRefreshing=false;const idle=api.boardRefreshCanRender();
      return {busy,idle};
    }finally{state.feedRefreshing=saved;}
  });
  assert.equal(refreshGate.busy,false);
  assert.equal(refreshGate.idle,true);

  const emptyFeed = await page.evaluate"""
if browser.count(refresh_anchor) != 1:
    raise SystemExit(f"background refresh browser test: expected one anchor, found {browser.count(refresh_anchor)}")
browser = browser.replace(refresh_anchor, refresh_test, 1)
write("kerbside-backend/tests/browser-regression.mjs", browser)'''
if source.count(browser_write) != 1:
    raise SystemExit(f"release loader: expected one browser write, found {source.count(browser_write)}")
source = source.replace(browser_write, browser_guard, 1)

exec(compile(source, URL, "exec"), {"__name__": "__main__"})
