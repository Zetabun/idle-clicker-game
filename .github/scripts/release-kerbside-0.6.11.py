from pathlib import Path
import json


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bus_path = Path("bus.html")
bus = bus_path.read_text(encoding="utf-8")

bus = replace_once(
    bus,
    "const APP_VERSION = '0.6.10';",
    "const APP_VERSION = '0.6.11';",
    "app version",
)

bus = replace_once(
    bus,
    ".depwrap{position:relative;border-bottom:1px solid var(--rule)}\n"
    ".depwrap .dep{border-bottom:0;padding-right:52px}\n"
    ".depwrap > .bell{position:absolute;right:15px;top:50%;transform:translateY(-50%);z-index:2}\n"
    ".depwrap .detail{border-top:1px solid rgba(34,48,63,.55);border-bottom:0}",
    ".depwrap{position:relative;border-bottom:1px solid var(--rule)}\n"
    ".depmain{position:relative}\n"
    ".depwrap .dep{border-bottom:0;padding-right:52px}\n"
    ".depmain > .bell{position:absolute;right:15px;top:50%;transform:translateY(-50%);z-index:2}\n"
    ".depwrap .detail{border-top:1px solid rgba(34,48,63,.55);border-bottom:0}",
    "fixed departure bell container",
)

bus = replace_once(
    bus,
    ".chip.timing{border-color:rgba(63,217,164,.35);color:#A9EED7}\n"
    ".chip.schedule-source{border-color:var(--rule);color:var(--text-dim)}",
    ".chip.timing{border-color:rgba(63,217,164,.35);color:#A9EED7}\n"
    ".chip.live-gps{border-color:rgba(63,217,164,.6);background:rgba(63,217,164,.08);color:#A9EED7}\n"
    ".chip.schedule-source{border-color:var(--rule);color:var(--text-dim)}",
    "live GPS badge style",
)

bus = replace_once(
    bus,
    '<div class="confidence-guide"><b>Likely</b> means live GPS, route and direction evidence strongly suggest this bus will serve the stop, but its live journey is not fully matched. <b>Verified</b> has stronger journey/stop evidence; <b>rough</b> has limited evidence.</div>',
    '<div class="confidence-guide"><b>LIVE GPS</b> means a real bus is currently broadcasting a fresh BODS position and has been matched to this stop. Later timetable departures remain <b>scheduled</b> until a matching vehicle begins service. <b>Likely</b> means route and direction evidence strongly suggest the live bus will serve the stop, while <b>Verified</b> has stronger journey/stop evidence and <b>rough</b> has limited evidence.</div>',
    "board GPS explanation",
)

bus = replace_once(
    bus,
    "async function overpass(query){",
    "async function overpass(query,quiet){",
    "quiet Overpass option",
)

bus = replace_once(
    bus,
    "    if(i===1) setStatus('Stop service busy — trying another map server','err');",
    "    if(i===1 && !quiet) setStatus('Map stop lookup busy — trying another server','err');",
    "background Overpass status",
)

bus = replace_once(
    bus,
    "async function findAnchor(lat,lon,run){\n"
    "  const q = `[out:json][timeout:25];\n"
    "(node[\"place\"~\"^(city|town)$\"](around:22000,${lat},${lon}););\n"
    "out body 40;`;\n"
    "  try{\n"
    "    const j = await overpass(q);",
    "async function findAnchor(lat,lon,run){\n"
    "  const q = `[out:json][timeout:25];\n"
    "(node[\"place\"~\"^(city|town)$\"](around:22000,${lat},${lon}););\n"
    "out body 40;`;\n"
    "  try{\n"
    "    const j = await overpass(q,true);",
    "quiet town anchor lookup",
)

bus = replace_once(bus, "parse(await overpass(exact))", "parse(await overpass(exact,true))", "quiet exact route lookup")
bus = replace_once(bus, "parse(await overpass(nearby))", "parse(await overpass(nearby,true))", "quiet nearby route lookup")
bus = replace_once(bus, "parse(await overpass(along))", "parse(await overpass(along,true))", "quiet road route lookup")

bus = replace_once(
    bus,
    "  if(!MAPPED[String(s.id)]){ S.loadingRoutes=true; renderServingNote(); fetchRoutesFor(s).then(()=>{ S.loadingRoutes=false; if(S.stop&&S.stop.id===s.id){ renderServingNote(); render(); } }); }",
    "  if(!MAPPED[String(s.id)] && !s.region && !s.shard && !s.timetableId){ S.loadingRoutes=true; renderServingNote(); fetchRoutesFor(s).then(()=>{ S.loadingRoutes=false; if(S.stop&&S.stop.id===s.id){ renderServingNote(); render(); } }); }",
    "skip redundant route lookup for official stop",
)

bus = replace_once(
    bus,
    "      return '<div class=\"depwrap\">'\n"
    "        +'<button class=\"dep'",
    "      return '<div class=\"depwrap\"><div class=\"depmain\">'\n"
    "        +'<button class=\"dep'",
    "departure header wrapper",
)

bus = replace_once(
    bus,
    "        +(S.destFilter?'':'<span class=\"chip'+(r.app?'':' away')+'\">'+fmtDist(r.metres)+'</span>')\n"
    "        +'<span class=\"chip conf-'+r.confidence+'\" title=\"'+esc(confHelp)+'\" aria-label=\"'+esc(confLabel+': '+confHelp)+'\">'+confLabel+'</span>'",
    "        +(S.destFilter?'':'<span class=\"chip'+(r.app?'':' away')+'\">'+fmtDist(r.metres)+'</span>')\n"
    "        +'<span class=\"chip live-gps\" title=\"Fresh vehicle position from BODS\">live GPS</span>'\n"
    "        +'<span class=\"chip conf-'+r.confidence+'\" title=\"'+esc(confHelp)+'\" aria-label=\"'+esc(confLabel+': '+confHelp)+'\">'+confLabel+'</span>'",
    "live GPS row badge",
)

bus = replace_once(
    bus,
    "        +'<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0\"/></svg></button>'\n"
    "        +(S.selected===r.v.id?lineDetail(r):'')+'</div>';",
    "        +'<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0\"/></svg></button></div>'\n"
    "        +(S.selected===r.v.id?lineDetail(r):'')+'</div>';",
    "close departure header wrapper",
)

bus_path.write_text(bus, encoding="utf-8")

package_path = Path("kerbside-backend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
if package.get("version") != "0.6.10":
    raise SystemExit(f"unexpected package predecessor: {package.get('version')}")
package["version"] = "0.6.11"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

readme_path = Path("kerbside-backend/README.md")
readme = readme_path.read_text(encoding="utf-8")
anchor = "Kerbside 0.6.10 avoids the WebKit installed-app viewport gap by removing `viewport-fit=cover` and switching from the translucent status bar to Apple's normally inset black standalone status bar. The saved iOS app now receives a stable viewport below the status bar instead of relying on the broken edge-to-edge height calculation; map pinch zoom remains available.\n"
addition = anchor + "\nKerbside 0.6.11 pins the leave-alert bell to the compact departure header when live details expand, labels every real tracked vehicle with a clear `LIVE GPS` badge, and explains why future timetable rows remain scheduled until a vehicle begins broadcasting. Background OpenStreetMap anchor and route lookups no longer display a misleading stop-service error, and official national timetable stops skip the redundant route lookup entirely.\n"
readme = replace_once(readme, anchor, addition, "README release note")
readme_path.write_text(readme, encoding="utf-8")

print("Prepared Kerbside 0.6.11 live GPS clarity release")
