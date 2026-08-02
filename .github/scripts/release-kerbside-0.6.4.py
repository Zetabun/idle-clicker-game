from pathlib import Path
import json


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bus_path = Path('bus.html')
source = bus_path.read_text(encoding='utf-8')

source = replace_once(source, "const APP_VERSION = '0.6.3';", "const APP_VERSION = '0.6.4';", 'app version')

source = replace_once(
    source,
    ".board-head{padding:12px 16px 10px;border-bottom:1px solid var(--rule)}\n"
    ".stopline{display:flex;align-items:flex-start;gap:9px}",
    ".board-head{padding:9px 13px 8px;border-bottom:1px solid var(--rule)}\n"
    ".stopline{display:flex;align-items:flex-start;gap:8px}",
    'compact board header',
)
source = replace_once(
    source,
    ".stopname{font-weight:600;font-size:15.5px;letter-spacing:-.01em;line-height:1.25}\n"
    ".stopmeta{color:var(--text-dim);font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;margin-top:3px}",
    ".stopname{font-weight:600;font-size:15px;letter-spacing:-.01em;line-height:1.2}\n"
    ".stopmeta{color:var(--text-dim);font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;margin-top:2px}",
    'compact stop heading',
)
source = replace_once(
    source,
    ".changestop{margin-top:9px;font-size:12px;color:var(--text-dim);text-decoration:underline;text-underline-offset:3px}\n"
    ".changestop:hover{color:var(--led)}\n"
    ".pairbtn{\n"
    "  margin-left:14px;align-items:center;gap:5px;text-decoration:none;\n"
    "  border:1px solid var(--rule);border-radius:14px;padding:4px 10px;font-weight:600;\n"
    "}\n"
    ".pairbtn:hover{border-color:var(--led-dim);color:var(--led)}",
    ".board-actions{display:flex;align-items:center;gap:10px;margin-top:6px;min-height:24px}\n"
    ".changestop{margin-top:0;font-size:11.5px;color:var(--text-dim);text-decoration:underline;text-underline-offset:3px}\n"
    ".changestop:hover{color:var(--led)}\n"
    ".pairbtn{\n"
    "  margin-left:0;align-items:center;gap:5px;text-decoration:none;\n"
    "  border:1px solid var(--rule);border-radius:14px;padding:3px 9px;font-weight:600;\n"
    "}\n"
    ".pairbtn:hover{border-color:var(--led-dim);color:var(--led)}\n"
    ".board-info-btn{margin-left:auto;width:24px;height:24px;border:1px solid var(--rule);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:13px;color:var(--text-dim);line-height:1}\n"
    ".board-info-btn:hover,.board-info-btn[aria-expanded=\"true\"]{border-color:var(--led-dim);color:var(--led);background:var(--ink-3)}\n"
    ".board-info-panel{margin-top:7px;padding:9px 10px;border:1px solid var(--rule);border-radius:7px;background:var(--ink);font-size:10.5px;color:var(--text-dim);line-height:1.5}\n"
    ".board-info-panel[hidden]{display:none}\n"
    ".confidence-guide b{color:var(--text);font-weight:600}\n"
    ".confidence-guide{padding-bottom:8px;border-bottom:1px solid var(--rule)}",
    'board actions and info',
)
source = replace_once(
    source,
    "  display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11.5px;color:var(--text-dim);",
    "  display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;color:var(--text-dim);",
    'compact walk line',
)
source = replace_once(
    source,
    ".destbar{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px;overflow:visible;padding-bottom:2px}\n"
    ".destbar:empty{display:none}\n"
    ".destchip{\n"
    "  flex:0 1 auto;max-width:100%;font-size:12px;font-weight:600;padding:5px 11px;border-radius:14px;\n"
    "  border:1px solid var(--rule);color:var(--text-dim);white-space:normal;overflow-wrap:anywhere;text-align:left;line-height:1.25;transition:background .12s,color .12s;\n"
    "}",
    ".destbar{display:flex;flex-wrap:nowrap;gap:6px;margin-top:8px;overflow-x:auto;overflow-y:hidden;padding:1px 0 3px;scrollbar-width:none;overscroll-behavior-x:contain}\n"
    ".destbar::-webkit-scrollbar{display:none}\n"
    ".destbar:empty{display:none}\n"
    ".destchip{\n"
    "  flex:0 0 auto;max-width:none;font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:14px;\n"
    "  border:1px solid var(--rule);color:var(--text-dim);white-space:nowrap;text-align:left;line-height:1.25;transition:background .12s,color .12s;\n"
    "}",
    'single line destination scroller',
)

source = replace_once(
    source,
    ".sheet header{padding:16px 20px 12px;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;align-items:center}\n"
    ".sheet header h2{margin:0;font-size:16px;letter-spacing:-.02em}\n"
    ".settings-tabs{display:flex;gap:6px;padding:9px 14px 0;border-bottom:1px solid var(--rule);background:var(--ink)}\n"
    ".settings-tab{padding:8px 13px 9px;border:1px solid transparent;border-bottom:0;border-radius:8px 8px 0 0;color:var(--text-dim);font-size:12.5px;font-weight:700}\n"
    ".settings-tab:hover{color:var(--text)}\n"
    ".settings-tab[aria-selected=\"true\"]{background:var(--ink-2);border-color:var(--rule);color:var(--led);transform:translateY(1px)}",
    ".sheet header{padding:13px 16px;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;align-items:center;gap:12px}\n"
    ".settings-heading{display:flex;align-items:center;gap:13px;min-width:0;flex:1;flex-wrap:wrap}\n"
    ".sheet header h2{margin:0;font-size:16px;letter-spacing:-.02em;flex:0 0 auto}\n"
    ".settings-tabs{display:flex;align-items:center;gap:5px;padding:0;border:0;background:transparent}\n"
    ".settings-tab{padding:6px 10px;border:1px solid var(--rule);border-radius:7px;color:var(--text-dim);font-size:12px;font-weight:700;line-height:1.2}\n"
    ".settings-tab:hover{color:var(--text);border-color:var(--led-dim)}\n"
    ".settings-tab[aria-selected=\"true\"]{background:var(--ink-3);border-color:var(--led-dim);color:var(--led)}",
    'settings tabs beside title',
)
source = replace_once(
    source,
    ".stats-foot{margin:14px 0 0;font-size:10.5px;color:var(--text-dim);line-height:1.55}\n",
    ".stats-foot{margin:14px 0 0;font-size:10.5px;color:var(--text-dim);line-height:1.55}\n"
    ".gps-stats-section{margin-bottom:17px}\n"
    ".gps-grid{margin-bottom:10px}\n"
    ".gps-grid .stat-value{font-size:clamp(16px,4vw,21px);letter-spacing:-.05em}\n"
    ".gps-note{margin:0;padding:10px 11px;border-left:2px solid var(--live);background:rgba(63,217,164,.045);color:var(--text-dim);font-size:10.5px;line-height:1.55}\n"
    ".gps-note b{color:#A9EED7;font-weight:600}\n",
    'gps stats styles',
)
source = replace_once(
    source,
    "/* Vehicle markers glide between polls instead of jumping. Leaflet\n"
    "   positions markers with a transform, so easing that is enough.\n"
    "   Duration is set from the refresh interval at runtime. */\n"
    ".leaflet-marker-icon.vehmark{transition:transform var(--glide, 3s) linear}",
    "/* Vehicle markers glide between confirmed GPS snapshots instead of jumping.\n"
    "   Each vehicle learns its own recent reporting cadence and uses a short,\n"
    "   capped visual lead. Routing and ETAs still use confirmed coordinates. */\n"
    ".leaflet-marker-icon.vehmark{transition:transform var(--glide, 950ms) linear;will-change:transform}",
    'continuous marker motion styles',
)
source = replace_once(
    source,
    "  .dfacts{grid-template-columns:repeat(2,1fr)}\n"
    "  .region-stats{grid-template-columns:1fr}\n",
    "  .dfacts{grid-template-columns:repeat(2,1fr)}\n"
    "  .region-stats{grid-template-columns:1fr}\n"
    "  .sheet header{padding:11px 13px;gap:8px}\n"
    "  .settings-heading{gap:8px;flex-wrap:nowrap}\n"
    "  .settings-tab{padding:6px 8px;font-size:11.5px}\n",
    'mobile settings header',
)

source = replace_once(
    source,
    "        <button class=\"changestop\" id=\"changeStop\">Choose a different stop</button>\n"
    "        <button class=\"changestop pairbtn\" id=\"pairBtn\" style=\"display:none\"></button>\n"
    "        <div class=\"walkline\" id=\"walkLine\" style=\"display:none\"></div>\n"
    "        <div class=\"destbar\" id=\"destBar\" role=\"group\" aria-label=\"Filter by destination\"></div>\n"
    "        <div class=\"destnote\" id=\"destNote\" style=\"display:none\"></div>\n"
    "        <div class=\"servenote\" id=\"serveNote\" style=\"display:none\"></div>",
    "        <div class=\"board-actions\">\n"
    "          <button class=\"changestop\" id=\"changeStop\">Change stop</button>\n"
    "          <button class=\"changestop pairbtn\" id=\"pairBtn\" style=\"display:none\"></button>\n"
    "          <button class=\"board-info-btn\" id=\"boardInfoBtn\" aria-expanded=\"false\" aria-controls=\"boardInfoPanel\" title=\"Explain board labels and data\" aria-label=\"Board information\">i</button>\n"
    "        </div>\n"
    "        <div class=\"walkline\" id=\"walkLine\" style=\"display:none\"></div>\n"
    "        <div class=\"destbar\" id=\"destBar\" role=\"group\" aria-label=\"Filter by destination\"></div>\n"
    "        <div class=\"board-info-panel\" id=\"boardInfoPanel\" hidden>\n"
    "          <div class=\"confidence-guide\"><b>Likely</b> means live GPS, route and direction evidence strongly suggest this bus will serve the stop, but its live journey is not fully matched. <b>Verified</b> has stronger journey/stop evidence; <b>rough</b> has limited evidence.</div>\n"
    "          <div class=\"destnote\" id=\"destNote\" style=\"display:none\"></div>\n"
    "          <div class=\"servenote\" id=\"serveNote\" style=\"display:none\"></div>\n"
    "        </div>",
    'compact board information panel',
)

source = replace_once(
    source,
    "    <header>\n"
    "      <h2>Settings</h2>\n"
    "      <button id=\"closeSet\" style=\"font-size:22px;color:var(--text-dim);line-height:1\" aria-label=\"Close settings\">&times;</button>\n"
    "    </header>\n"
    "    <div class=\"settings-tabs\" role=\"tablist\" aria-label=\"Settings sections\">\n"
    "      <button class=\"settings-tab\" id=\"dataTab\" role=\"tab\" aria-selected=\"true\" aria-controls=\"dataPanel\">Data source</button>\n"
    "      <button class=\"settings-tab\" id=\"statsTab\" role=\"tab\" aria-selected=\"false\" aria-controls=\"statsPanel\">Stats</button>\n"
    "    </div>",
    "    <header>\n"
    "      <div class=\"settings-heading\">\n"
    "        <h2>Settings</h2>\n"
    "        <div class=\"settings-tabs\" role=\"tablist\" aria-label=\"Settings sections\">\n"
    "          <button class=\"settings-tab\" id=\"dataTab\" role=\"tab\" aria-selected=\"true\" aria-controls=\"dataPanel\">Data source</button>\n"
    "          <button class=\"settings-tab\" id=\"statsTab\" role=\"tab\" aria-selected=\"false\" aria-controls=\"statsPanel\">Stats</button>\n"
    "        </div>\n"
    "      </div>\n"
    "      <button id=\"closeSet\" style=\"font-size:22px;color:var(--text-dim);line-height:1\" aria-label=\"Close settings\">&times;</button>\n"
    "    </header>",
    'settings header markup',
)

source = replace_once(
    source,
    "          <div class=\"stats-section\">\n"
    "            <div class=\"stats-section-head\"><h3>Regional coverage</h3><span id=\"statsAppVersion\">App —</span></div>",
    "          <div class=\"stats-section gps-stats-section\">\n"
    "            <div class=\"stats-section-head\"><h3>Live GPS positions</h3><span id=\"statsGpsStatus\">Checking feed</span></div>\n"
    "            <div class=\"stats-grid gps-grid\">\n"
    "              <div class=\"stat-card\"><span class=\"stat-value\" id=\"statGpsVehicles\">—</span><span class=\"stat-label\">Fresh live positions</span></div>\n"
    "              <div class=\"stat-card\"><span class=\"stat-value\" id=\"statGpsHidden\">—</span><span class=\"stat-label\">Stale or invalid hidden</span></div>\n"
    "              <div class=\"stat-card\"><span class=\"stat-value\" id=\"statGpsRefresh\">—</span><span class=\"stat-label\">Browser refresh interval</span></div>\n"
    "              <div class=\"stat-card\"><span class=\"stat-value\" id=\"statGpsUpdated\">—</span><span class=\"stat-label\">Last live update</span></div>\n"
    "            </div>\n"
    "            <p class=\"gps-note\"><b>GPS supported.</b> The map uses operator vehicle-position snapshots from the BODS live feed. Between reports, Kerbside shows a short estimated glide based on recent confirmed movement; stop matching and ETAs continue to use confirmed GPS records.</p>\n"
    "          </div>\n\n"
    "          <div class=\"stats-section\">\n"
    "            <div class=\"stats-section-head\"><h3>Regional coverage</h3><span id=\"statsAppVersion\">App —</span></div>",
    'gps stats markup',
)

source = replace_once(
    source,
    "  timer:null, tick:null, busy:false, pollAgain:false, lastOk:0, lastFeedAt:0,\n"
    "  locationRun:0, pollAbort:null,\n"
    "  feedStale:0, feedUnknownAge:0,",
    "  timer:null, tick:null, motionTimer:null, busy:false, pollAgain:false, lastOk:0, lastFeedAt:0,\n"
    "  locationRun:0, pollAbort:null,\n"
    "  feedStale:0, feedUnknownAge:0, workerOk:null, workerVersion:'', workerBods:false,",
    'gps runtime state',
)
source = replace_once(
    source,
    "const MAX_AGE_MS = 2*60*1000;  // old AVL positions are never silently revived\n"
    "const MAX_VEH_DIST = 9000;\n"
    "const FETCH_TIMEOUT_MS = 12000;",
    "const MAX_AGE_MS = 2*60*1000;  // old AVL positions are never silently revived\n"
    "const MAX_VEH_DIST = 9000;\n"
    "const FETCH_TIMEOUT_MS = 12000;\n"
    "const VISUAL_MOTION_TICK_MS = 1000;\n"
    "const VISUAL_MAX_LEAD_SECONDS = 20;\n"
    "const VISUAL_MAX_LEAD_METRES = 180;",
    'visual motion constants',
)

source = replace_once(
    source,
    "    const prev = S.vehicles.get(v.id);\n"
    "    const rec = prev || {hist:[], speed:null};\n"
    "    if(prev && (prev.lat!==v.lat || prev.lon!==v.lon)){
",
    "    const prev = S.vehicles.get(v.id);\n"
    "    const rec = prev || {hist:[], speed:null, cadence:null};\n"
    "    if(prev && v.ts>prev.ts){\n"
    "      const gap=(v.ts-prev.ts)/1000;\n"
    "      if(gap>=2 && gap<=180) rec.cadence=rec.cadence==null?gap:rec.cadence*.65+gap*.35;\n"
    "    }\n"
    "    if(prev && (prev.lat!==v.lat || prev.lon!==v.lon)){
",
    'learn gps reporting cadence',
)
source = replace_once(
    source,
    "    rec.hist.push({lat:v.lat,lon:v.lon,ts:v.ts});\n"
    "    if(rec.hist.length>6) rec.hist.shift();",
    "    const latest=rec.hist[rec.hist.length-1];\n"
    "    if(!latest || latest.ts!==v.ts || latest.lat!==v.lat || latest.lon!==v.lon){\n"
    "      rec.hist.push({lat:v.lat,lon:v.lon,ts:v.ts});\n"
    "      if(rec.hist.length>8) rec.hist.shift();\n"
    "    }",
    'deduplicate gps history',
)

source = replace_once(
    source,
    "  for(const [id,v] of S.vehicles){\n"
    "    if(now - v.ts > MAX_AGE_MS) S.vehicles.delete(id);\n"
    "  }\n"
    "}\n\n"
    "/* inbound = getting closer to the town anchor */",
    "  for(const [id,v] of S.vehicles){\n"
    "    if(now - v.ts > MAX_AGE_MS) S.vehicles.delete(id);\n"
    "  }\n"
    "}\n\n"
    "function visualVehiclePosition(v,now=Date.now()){\n"
    "  const confirmed={lat:v.lat,lon:v.lon,estimated:false};\n"
    "  if(!v||S.demo||!Array.isArray(v.hist)||v.hist.length<2) return confirmed;\n"
    "  const b=v.hist[v.hist.length-1];\n"
    "  let a=null;\n"
    "  for(let i=v.hist.length-2;i>=0;i--){\n"
    "    const point=v.hist[i];\n"
    "    if(point.ts<b.ts && dist(point.lat,point.lon,b.lat,b.lon)>8){ a=point; break; }\n"
    "  }\n"
    "  if(!a) return confirmed;\n"
    "  const dt=(b.ts-a.ts)/1000, moved=dist(a.lat,a.lon,b.lat,b.lon);\n"
    "  if(dt<3||dt>180||moved<8) return confirmed;\n"
    "  const speed=moved/dt, age=Math.max(0,(now-b.ts)/1000), cadence=Number(v.cadence)||dt;\n"
    "  if(speed<.8||speed>18||age>Math.max(60,cadence*2.5)) return confirmed;\n"
    "  const lead=Math.min(age,VISUAL_MAX_LEAD_SECONDS,Math.max(4,cadence*.9));\n"
    "  const metres=Math.min(speed*lead,VISUAL_MAX_LEAD_METRES);\n"
    "  if(metres<1) return confirmed;\n"
    "  const fraction=metres/moved;\n"
    "  return {lat:b.lat+(b.lat-a.lat)*fraction,lon:b.lon+(b.lon-a.lon)*fraction,estimated:true};\n"
    "}\n"
    "function updateVehicleMotion(){\n"
    "  if(document.hidden||document.body.classList.contains('mapmoving')) return;\n"
    "  const now=Date.now();\n"
    "  for(const [id,m] of S.markers){\n"
    "    const v=S.vehicles.get(id); if(!v) continue;\n"
    "    const p=visualVehiclePosition(v,now); m.setLatLng([p.lat,p.lon]);\n"
    "  }\n"
    "}\n\n"
    "/* inbound = getting closer to the town anchor */",
    'visual gps interpolation',
)

source = replace_once(
    source,
    "    const brg = isFinite(v.bearing)?v.bearing:0;\n"
    "    // Replacing the icon rebuilds the DOM node, which cancels the CSS",
    "    const brg = isFinite(v.bearing)?v.bearing:0;\n"
    "    const visual=visualVehiclePosition(v);\n"
    "    // Replacing the icon rebuilds the DOM node, which cancels the CSS",
    'visual position in marker rendering',
)
source = replace_once(source, "      m = L.marker([v.lat,v.lon],{", "      m = L.marker([visual.lat,visual.lon],{", 'new marker visual position')
source = replace_once(source, "      m.setLatLng([v.lat,v.lon]);", "      m.setLatLng([visual.lat,visual.lon]);", 'existing marker visual position')
source = replace_once(
    source,
    "  if(v && S.selected){\n"
    "    map.panTo([v.lat,v.lon],{animate:true});",
    "  if(v && S.selected){\n"
    "    const visual=visualVehiclePosition(v);\n"
    "    map.panTo([visual.lat,visual.lon],{animate:true});",
    'focus visual gps position',
)

source = replace_once(
    source,
    "  document.documentElement.style.setProperty('--glide',Math.max(1.5,S.interval*.8)+'s');\n"
    "  S.vehicles.clear(); clearVehicleMarkers(); poll(true);\n"
    "  S.timer=setInterval(poll,S.interval*1000);\n"
    "  S.tick=setInterval(()=>{ if(S.stop) render(); },5000);",
    "  document.documentElement.style.setProperty('--glide','950ms');\n"
    "  S.vehicles.clear(); clearVehicleMarkers(); poll(true);\n"
    "  S.timer=setInterval(poll,S.interval*1000);\n"
    "  S.motionTimer=setInterval(updateVehicleMotion,VISUAL_MOTION_TICK_MS);\n"
    "  S.tick=setInterval(()=>{ if(S.stop) render(); },5000);",
    'start continuous visual motion',
)
source = replace_once(
    source,
    "function stopPolling(){\n"
    "  if(S.timer) clearInterval(S.timer); if(S.tick) clearInterval(S.tick);\n"
    "  if(S.pollAbort) S.pollAbort.abort();\n"
    "  S.timer=S.tick=null; S.pollAbort=null;\n"
    "}",
    "function stopPolling(){\n"
    "  if(S.timer) clearInterval(S.timer); if(S.tick) clearInterval(S.tick); if(S.motionTimer) clearInterval(S.motionTimer);\n"
    "  if(S.pollAbort) S.pollAbort.abort();\n"
    "  S.timer=S.tick=S.motionTimer=null; S.pollAbort=null;\n"
    "}",
    'stop visual motion timer',
)
source = replace_once(
    source,
    "    setStatus(S.demo?'Simulated · '+S.vehicles.size+' buses':'Live · '+S.vehicles.size+' fresh'+hidden+tt+cached+updated,S.demo?'demo':'');\n"
    "    render();",
    "    setStatus(S.demo?'Simulated · '+S.vehicles.size+' buses':'Live · '+S.vehicles.size+' fresh'+hidden+tt+cached+updated,S.demo?'demo':'');\n"
    "    renderGpsStats();\n"
    "    render();",
    'refresh gps stats after poll',
)

source = replace_once(
    source,
    "      const confLabel=r.confidence==='high'?'verified':r.confidence==='medium'?'likely':'rough';\n"
    "      const etaText=due?'due':(r.confidence==='low'?'~':'')+mins;",
    "      const confLabel=r.confidence==='high'?'verified':r.confidence==='medium'?'likely':'rough';\n"
    "      const confHelp=r.confidence==='high'?'Journey or timetable evidence strongly confirms this bus serves the selected stop.':r.confidence==='medium'?'Live GPS, route and direction evidence suggest this bus serves the stop, but the journey is not fully matched.':'Limited route or movement evidence; treat this ETA as approximate.';\n"
    "      const etaText=due?'due':(r.confidence==='low'?'~':'')+mins;",
    'confidence explanation',
)
source = replace_once(
    source,
    "+'<span class=\"chip conf-'+r.confidence+'\">'+confLabel+'</span>'",
    "+'<span class=\"chip conf-'+r.confidence+'\" title=\"'+esc(confHelp)+'\" aria-label=\"'+esc(confLabel+': '+confHelp)+'\">'+confLabel+'</span>'",
    'confidence tooltip',
)

source = replace_once(
    source,
    "}\n\n"
    "/* ============================================================\n"
    "   Polling\n"
    "   ============================================================ */\n"
    "function startPolling(){",
    "}\n\n"
    "function setBoardInfo(open){\n"
    "  const expanded=!!open;\n"
    "  $('boardInfoBtn').setAttribute('aria-expanded',String(expanded));\n"
    "  $('boardInfoPanel').hidden=!expanded;\n"
    "}\n"
    "$('boardInfoBtn').addEventListener('click',()=>setBoardInfo($('boardInfoBtn').getAttribute('aria-expanded')!=='true'));\n\n"
    "/* ============================================================\n"
    "   Polling\n"
    "   ============================================================ */\n"
    "function startPolling(){",
    'board info toggle',
)

source = replace_once(
    source,
    "function prettyRegionName(name){\n"
    "  return String(name||'').split('_').map(word=>word?word[0].toUpperCase()+word.slice(1):'').join(' ');\n"
    "}\n"
    "function renderNetworkStats(manifest,error){",
    "function prettyRegionName(name){\n"
    "  return String(name||'').split('_').map(word=>word?word[0].toUpperCase()+word.slice(1):'').join(' ');\n"
    "}\n"
    "function renderGpsStats(){\n"
    "  const now=Date.now();\n"
    "  const fresh=[...S.vehicles.values()].filter(v=>now-v.ts<=MAX_AGE_MS).length;\n"
    "  const hidden=(Number(S.feedStale)||0)+(Number(S.feedUnknownAge)||0);\n"
    "  $('statGpsVehicles').textContent=formatStat(fresh);\n"
    "  $('statGpsHidden').textContent=formatStat(hidden);\n"
    "  $('statGpsRefresh').textContent=S.interval+' s';\n"
    "  $('statGpsUpdated').textContent=S.lastFeedAt?formatClock(S.lastFeedAt):'Waiting';\n"
    "  const status=$('statsGpsStatus');\n"
    "  if(S.demo){ status.textContent='Simulator, not live GPS'; status.style.color='var(--led)'; }\n"
    "  else if(S.workerOk===true){ status.textContent='BODS GPS · Worker connected'+(S.workerVersion?' · '+S.workerVersion:''); status.style.color='var(--live)'; }\n"
    "  else if(S.workerOk===false){ status.textContent='Worker health check failed'; status.style.color='var(--warn)'; }\n"
    "  else if(S.proxy){ status.textContent='BODS GPS · checking Worker'; status.style.color='var(--text-dim)'; }\n"
    "  else { status.textContent='Live GPS not configured'; status.style.color='var(--text-dim)'; }\n"
    "}\n"
    "function renderNetworkStats(manifest,error){",
    'render gps stats',
)
source = replace_once(
    source,
    "  $('regionStats').innerHTML=regions.length?regions.map(([name,info])=>{\n"
    "    return '<div class=\"region-stat\"><b>'+esc(prettyRegionName(name))+'</b><small>'\n"
    "      +formatStat(info&&info.stops)+' stops · '+formatStat(info&&info.departures)+' departures</small></div>';\n"
    "  }).join(''):'<div class=\"region-stat\"><b>No regional statistics available</b></div>';\n"
    "}",
    "  $('regionStats').innerHTML=regions.length?regions.map(([name,info])=>{\n"
    "    return '<div class=\"region-stat\"><b>'+esc(prettyRegionName(name))+'</b><small>'\n"
    "      +formatStat(info&&info.stops)+' stops · '+formatStat(info&&info.departures)+' departures</small></div>';\n"
    "  }).join(''):'<div class=\"region-stat\"><b>No regional statistics available</b></div>';\n"
    "  renderGpsStats();\n"
    "}",
    'gps stats alongside network stats',
)
source = replace_once(
    source,
    "  if(stats){\n"
    "    if(DATA_MANIFEST) renderNetworkStats(DATA_MANIFEST,null);\n"
    "    else refreshNetworkStats(false);\n"
    "  }",
    "  if(stats){\n"
    "    renderGpsStats();\n"
    "    if(DATA_MANIFEST) renderNetworkStats(DATA_MANIFEST,null);\n"
    "    else refreshNetworkStats(false);\n"
    "  }",
    'gps stats on tab open',
)
source = replace_once(
    source,
    "  if(S.demo){el.className='settings-status good';el.textContent='Simulator active · '+dataText+' · app '+APP_VERSION;return;}\n"
    "  if(!S.proxy){el.className='settings-status';el.textContent=(S.key?'Local key mode selected':'Add your Cloudflare Worker URL')+' · '+dataText+' · app '+APP_VERSION;return;}\n"
    "  try{",
    "  if(S.demo){S.workerOk=null;renderGpsStats();el.className='settings-status good';el.textContent='Simulator active · '+dataText+' · app '+APP_VERSION;return;}\n"
    "  if(!S.proxy){S.workerOk=null;renderGpsStats();el.className='settings-status';el.textContent=(S.key?'Local key mode selected':'Add your Cloudflare Worker URL')+' · '+dataText+' · app '+APP_VERSION;return;}\n"
    "  try{",
    'gps stats source precheck',
)
source = replace_once(
    source,
    "    if(!r.ok) throw new Error(j.error||('HTTP '+r.status));\n"
    "    el.className='settings-status good';el.textContent='Live Worker reachable · BODS secret '+(j.bods?'configured':'missing')+' · '+dataText+' · app '+APP_VERSION;\n"
    "  }catch(e){el.className='settings-status bad';el.textContent='Live Worker check failed: '+(e.message||'unreachable')+' · '+dataText+' · app '+APP_VERSION;}",
    "    if(!r.ok) throw new Error(j.error||('HTTP '+r.status));\n"
    "    S.workerOk=true;S.workerVersion=String(j.version||'');S.workerBods=!!j.bods;renderGpsStats();\n"
    "    el.className='settings-status good';el.textContent='Live Worker reachable · BODS secret '+(j.bods?'configured':'missing')+' · '+dataText+' · app '+APP_VERSION;\n"
    "  }catch(e){S.workerOk=false;S.workerVersion='';S.workerBods=false;renderGpsStats();el.className='settings-status bad';el.textContent='Live Worker check failed: '+(e.message||'unreachable')+' · '+dataText+' · app '+APP_VERSION;}",
    'worker gps health stats',
)

bus_path.write_text(source, encoding='utf-8')

package_path = Path('kerbside-backend/package.json')
package_data = json.loads(package_path.read_text(encoding='utf-8'))
if package_data.get('version') != '0.6.3':
    raise SystemExit(f"package version: expected 0.6.3, found {package_data.get('version')}")
package_data['version'] = '0.6.4'
package_path.write_text(json.dumps(package_data, indent=2) + '\n', encoding='utf-8')

readme_path = Path('kerbside-backend/README.md')
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    "Kerbside 0.6.3 adds a Settings Stats tab that reads current network totals and per-region coverage directly from the live Pages manifest. It also wraps long destination filters and gives scheduled ETA values a wider, clearer column.\n",
    "Kerbside 0.6.3 adds a Settings Stats tab that reads current network totals and per-region coverage directly from the live Pages manifest. It also wraps long destination filters and gives scheduled ETA values a wider, clearer column.\n\n"
    "Kerbside 0.6.4 places the settings tabs beside the dialog title, adds live GPS/Worker statistics, and continuously animates a short bounded visual estimate between confirmed vehicle snapshots. The compact Times header keeps destination filters on one horizontal scroller and moves route-source and confidence explanations behind its information button. Timetable matching and ETA calculations continue to use confirmed vehicle records rather than the visual estimate.\n",
    'readme release note',
)
readme_path.write_text(readme, encoding='utf-8')

required = [
    "const APP_VERSION = '0.6.4';",
    'id="boardInfoBtn"',
    'id="statsGpsStatus"',
    'function visualVehiclePosition',
    'function updateVehicleMotion',
    "S.motionTimer=setInterval(updateVehicleMotion",
    "title=\"'+esc(confHelp)+'\"",
]
for marker in required:
    if marker not in source:
        raise SystemExit(f'missing release marker: {marker}')

print('Kerbside 0.6.4 patch applied')
