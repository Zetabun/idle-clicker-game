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
    "const APP_VERSION = '0.6.11';",
    "const APP_VERSION = '0.6.12';",
    "app version",
)

bus = replace_once(
    bus,
    ".leaflet-control-attribution{background:rgba(11,17,25,.8)!important;color:#5C6B7D!important;font-size:10px!important}\n.leaflet-control-attribution a{color:#7D8FA3!important}\n.leaflet-bar a{background:var(--ink-2)!important;color:var(--text)!important;border-color:var(--rule)!important}",
    ".leaflet-control-attribution{background:rgba(11,17,25,.8)!important;color:#5C6B7D!important;font-size:10px!important}\n.leaflet-control-attribution a{color:#7D8FA3!important}\n.source-links{margin:8px 0 0;color:var(--text-dim);font-size:11px;line-height:1.5}\n.source-links a{color:var(--text-dim);text-underline-offset:2px}\n.source-links a:hover{color:var(--led)}\n@media (pointer:coarse){\n  .leaflet-control-attribution{pointer-events:none}\n}\n.leaflet-bar a{background:var(--ink-2)!important;color:var(--text)!important;border-color:var(--rule)!important}",
    "touch attribution styling",
)

bus = replace_once(
    bus,
    ".chip.live-gps{border-color:rgba(63,217,164,.6);background:rgba(63,217,164,.08);color:#A9EED7}\n.chip.schedule-source",
    ".chip.live-gps{border-color:rgba(63,217,164,.6);background:rgba(63,217,164,.08);color:#A9EED7}\n.chip.gps-delayed{border-color:var(--led-dim);background:rgba(255,176,0,.06);color:var(--led)}\n.chip.schedule-source",
    "delayed GPS badge styling",
)

bus = replace_once(
    bus,
    "const MIN_SPEED = 1.8, MAX_SPEED = 16;\nconst MAX_AGE_MS = 2*60*1000;  // old AVL positions are never silently revived",
    "const MIN_SPEED = 1.8, MAX_SPEED = 16;\nconst GPS_FRESH_MS = 2*60*1000;\nconst MAX_AGE_MS = 4*60*1000;  // retain delayed operator reports briefly, but never revive old ghost buses",
    "GPS age thresholds",
)

bus = replace_once(
    bus,
    "L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{\n  attribution:'&copy; OpenStreetMap contributors &copy; CARTO &middot; vehicles via BODS',\n  subdomains:'abcd', maxZoom:19\n}).addTo(map);",
    "L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{\n  attribution:'&copy; OpenStreetMap contributors &copy; CARTO &middot; vehicles via BODS',\n  subdomains:'abcd', maxZoom:19\n}).addTo(map);\nconst attributionEl=map.attributionControl&&map.attributionControl.getContainer();\nif(attributionEl){\n  attributionEl.querySelectorAll('a').forEach(link=>{link.target='_blank';link.rel='noopener noreferrer';});\n}",
    "map attribution behaviour",
)

old_draw = """function drawOrigin(){
  if(!S.origin) return;
  const ll=[S.origin.lat,S.origin.lon];
  if(meMarker) meMarker.setLatLng(ll);
  else meMarker=L.marker(ll,{icon:L.divIcon({className:'',html:'<div class=\"me\"></div>',iconSize:[18,18],iconAnchor:[9,9]}),zIndexOffset:600}).addTo(map);
  if(ring) map.removeLayer(ring);
  ring=L.circle(ll,{radius:S.radius,color:'#FFB000',weight:1,opacity:.22,fillOpacity:.03,dashArray:'4 6'}).addTo(map);
}
function drawAnchor(){
  if(!S.anchor) return;
  const ll=[S.anchor.lat,S.anchor.lon];
  const html='<div class=\"anchormark\">'+esc(S.anchor.name)+'</div>';
  if(anchorMarker){ anchorMarker.setLatLng(ll); anchorMarker.setIcon(L.divIcon({className:'',html,iconSize:null})); }
  else anchorMarker=L.marker(ll,{icon:L.divIcon({className:'',html,iconSize:null}),interactive:false,zIndexOffset:100}).addTo(map);
}
"""
new_draw = """function drawOrigin(){
  if(!S.origin) return;
  const ll=[S.origin.lat,S.origin.lon];
  const label=S.origin.label==='My location'?'Your location':'Search point';
  if(meMarker){ meMarker.setLatLng(ll); meMarker.setTooltipContent(label); }
  else{
    meMarker=L.marker(ll,{icon:L.divIcon({className:'',html:'<div class=\"me\"></div>',iconSize:[18,18],iconAnchor:[9,9]}),zIndexOffset:600}).addTo(map);
    meMarker.bindTooltip(label,{direction:'top',offset:[0,-12],className:'stoptip'});
  }
  if(ring) map.removeLayer(ring);
  ring=L.circle(ll,{radius:S.radius,color:'#FFB000',weight:1,opacity:.22,fillOpacity:.03,dashArray:'4 6'}).addTo(map);
}
function drawAnchor(){
  // The town anchor is an internal direction reference, not a user location.
  // Keeping it off the map avoids a fallback \"Town centre\" label appearing
  // on top of the real green search-point marker when the lookup is busy.
  if(anchorMarker){ map.removeLayer(anchorMarker); anchorMarker=null; }
}
"""
bus = replace_once(bus, old_draw, new_draw, "origin and anchor markers")

old_anchor = """    if(run!==S.locationRun) return;
    if(best){ S.anchor=best; drawAnchor(); }
    else { S.anchor={lat,lon,name:'Town centre'}; drawAnchor(); }
  }catch(e){
    if(run!==S.locationRun) return;
    S.anchor={lat,lon,name:'Town centre'}; drawAnchor();
  }
  if(run===S.locationRun) updateDirLabels();
}
function updateDirLabels(){
  const n = S.anchor ? S.anchor.name : 'town';
  $('dIn').querySelector('.lbl').textContent = 'Into '+n;
  $('dOut').querySelector('.lbl').textContent = 'Out of '+n;
}
"""
new_anchor = """    if(run!==S.locationRun) return;
    S.anchor=best||{lat,lon,name:'Local area',synthetic:true};
    drawAnchor();
  }catch(e){
    if(run!==S.locationRun) return;
    S.anchor={lat,lon,name:'Local area',synthetic:true};
    drawAnchor();
  }
  if(run===S.locationRun) updateDirLabels();
}
function updateDirLabels(){
  const named=S.anchor&&!S.anchor.synthetic;
  const n=named?S.anchor.name:'';
  $('dIn').querySelector('.lbl').textContent = n?'Into '+n:'Inbound';
  $('dOut').querySelector('.lbl').textContent = n?'Out of '+n:'Outbound';
}
"""
bus = replace_once(bus, old_anchor, new_anchor, "town anchor fallback")

bus = replace_once(
    bus,
    "          <p class=\"note\">Live positions come from the Department for Transport's <b style=\"color:var(--led)\">Bus Open Data Service</b>. For a public copy, use your Cloudflare Worker so the BODS key stays off the page. The national timetable verifies which routes and destinations actually call at a stop.</p>",
    "          <p class=\"note\">Live positions come from the Department for Transport's <b style=\"color:var(--led)\">Bus Open Data Service</b>. For a public copy, use your Cloudflare Worker so the BODS key stays off the page. The national timetable verifies which routes and destinations actually call at a stop.</p>\n          <p class=\"source-links\">Map data: <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener noreferrer\">OpenStreetMap</a> · tiles by <a href=\"https://carto.com/attributions\" target=\"_blank\" rel=\"noopener noreferrer\">CARTO</a> · live vehicles via <a href=\"https://www.bus-data.dft.gov.uk/\" target=\"_blank\" rel=\"noopener noreferrer\">BODS</a>.</p>",
    "settings source links",
)

bus = replace_once(
    bus,
    "          <div class=\"confidence-guide\"><b>LIVE GPS</b> means a real bus is currently broadcasting a fresh BODS position and has been matched to this stop. Later timetable departures remain <b>scheduled</b> until a matching vehicle begins service. <b>Likely</b> means route and direction evidence strongly suggest the live bus will serve the stop, while <b>Verified</b> has stronger journey/stop evidence and <b>rough</b> has limited evidence.</div>",
    "          <div class=\"confidence-guide\"><b>LIVE GPS</b> means a real bus has reported a position within the last two minutes. <b>GPS DELAYED</b> means the last confirmed report is two to four minutes old; Kerbside keeps it briefly instead of making the bus flicker out, but marks its ETA as estimated. Later timetable departures remain <b>scheduled</b> until a matching vehicle begins service. <b>Likely</b> means route and direction evidence strongly suggest the live bus will serve the stop, while <b>Verified</b> has stronger journey/stop evidence and <b>rough</b> has limited evidence.</div>",
    "board GPS explanation",
)

bus = replace_once(
    bus,
    "            <p class=\"gps-note\"><b>GPS supported.</b> The map uses operator vehicle-position snapshots from the BODS live feed. Between reports, Kerbside shows a short estimated glide based on recent confirmed movement; stop matching and ETAs continue to use confirmed GPS records.</p>",
    "            <p class=\"gps-note\"><b>GPS supported.</b> The map uses operator vehicle-position snapshots from the BODS live feed. Between reports, Kerbside shows a short estimated glide based on recent confirmed movement; stop matching and ETAs continue to use confirmed GPS records. Positions older than two minutes are labelled GPS delayed and retained only until four minutes old so irregular operator updates do not make an approaching bus vanish immediately.</p>",
    "GPS stats explanation",
)

old_empty = """      const dirWord=S.dir==='in'?'into '+(S.anchor?S.anchor.name:'town'):S.dir==='out'?'out of '+(S.anchor?S.anchor.name:'town'):'either way';
      showEmpty('<strong>Nothing verified heading '+esc(dirWord)+'</strong>'
        +(S.vehicles.size?S.vehicles.size+' fresh buses are broadcasting nearby, but none currently have enough route and movement evidence for this stop. Try <button id=\"flipDir\">the other direction</button> or Both.'
        :'No fresh vehicle positions have come through yet. Refresh, or check the Worker in settings.'));
"""
new_empty = """      const namedAnchor=S.anchor&&!S.anchor.synthetic?S.anchor.name:'';
      const dirWord=S.dir==='in'?(namedAnchor?'into '+namedAnchor:'inbound'):S.dir==='out'?(namedAnchor?'out of '+namedAnchor:'outbound'):'either way';
      showEmpty('<strong>Nothing verified heading '+esc(dirWord)+'</strong>'
        +(S.vehicles.size?S.vehicles.size+' tracked buses are broadcasting nearby, but none currently have enough route and movement evidence for this stop. Try <button id=\"flipDir\">the other direction</button> or Both.'
        :'No recent vehicle positions have come through yet. Refresh, or check the Worker in settings.'));
"""
bus = replace_once(bus, old_empty, new_empty, "empty live-board wording")

old_live_row = """      const mins=Math.max(0,Math.round(r.secs/60));
      const due=r.confidence!=='low' && mins<=1;
      const age=Date.now()-r.v.ts, tight=S.walkSecs>90 && r.secs<S.walkSecs-30;
      const dirChip=S.destFilter?fmtDist(r.metres)+' away':r.dir==='in'?'→ '+(S.anchor?S.anchor.name:'town'):r.dir==='out'?'← Outbound':'Direction unclear';
      const confLabel=r.confidence==='high'?'verified':r.confidence==='medium'?'likely':'rough';
      const confHelp=r.confidence==='high'?'Journey or timetable evidence strongly confirms this bus serves the selected stop.':r.confidence==='medium'?'Live GPS, route and direction evidence suggest this bus serves the stop, but the journey is not fully matched.':'Limited route or movement evidence; treat this ETA as approximate.';
      const etaText=due?'due':(r.confidence==='low'?'~':'')+mins;
"""
new_live_row = """      const mins=Math.max(0,Math.round(r.secs/60));
      const age=Date.now()-r.v.ts, gpsFresh=age<=GPS_FRESH_MS;
      const due=gpsFresh && r.confidence!=='low' && mins<=1;
      const tight=S.walkSecs>90 && r.secs<S.walkSecs-30;
      const namedAnchor=S.anchor&&!S.anchor.synthetic?S.anchor.name:'Inbound';
      const dirChip=S.destFilter?fmtDist(r.metres)+' away':r.dir==='in'?'→ '+namedAnchor:r.dir==='out'?'← Outbound':'Direction unclear';
      const confLabel=r.confidence==='high'?'verified':r.confidence==='medium'?'likely':'rough';
      const confHelp=r.confidence==='high'?'Journey or timetable evidence strongly confirms this bus serves the selected stop.':r.confidence==='medium'?'Live GPS, route and direction evidence suggest this bus serves the stop, but the journey is not fully matched.':'Limited route or movement evidence; treat this ETA as approximate.';
      const gpsLabel=gpsFresh?'live GPS':'GPS delayed';
      const gpsHelp=gpsFresh?'Fresh vehicle position from BODS':'Last confirmed BODS position is over two minutes old; retained briefly while waiting for the next report.';
      const etaText=due?'due':((!gpsFresh||r.confidence==='low')?'~':'')+mins;
"""
bus = replace_once(bus, old_live_row, new_live_row, "live row age handling")

bus = replace_once(
    bus,
    "        +'<span class=\"chip live-gps\" title=\"Fresh vehicle position from BODS\">live GPS</span>'",
    "        +'<span class=\"chip '+(gpsFresh?'live-gps':'gps-delayed')+'\" title=\"'+esc(gpsHelp)+'\">'+gpsLabel+'</span>'",
    "live GPS badge",
)

bus = replace_once(
    bus,
    "        +'</span></span><span class=\"eta'+(due?' due':'')+'\">'+etaText+'<small>'+(due?'arriving':r.confidence==='low'?'est':'min')+'</small></span></button>'",
    "        +'</span></span><span class=\"eta'+(due?' due':'')+'\">'+etaText+'<small>'+(due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')+'</small></span></button>'",
    "delayed ETA label",
)

bus = replace_once(
    bus,
    "function startPolling(){\n  stopPolling();\n  document.documentElement.style.setProperty('--glide','950ms');\n  S.vehicles.clear(); clearVehicleMarkers(); poll(true);",
    "function startPolling(){\n  stopPolling();\n  document.documentElement.style.setProperty('--glide','950ms');\n  poll(true);",
    "polling resume retention",
)

old_poll_status = """    const hidden=!S.demo&&S.feedStale?' · '+S.feedStale+' stale hidden':'';
    const tt=S.ttStop?' · timetable checked':'';
    const updated=' · updated '+formatClock(S.lastFeedAt), cached=S.feedFallback?' · cached during BODS outage':'';
    setStatus(S.demo?'Simulated · '+S.vehicles.size+' buses':'Live · '+S.vehicles.size+' fresh'+hidden+tt+cached+updated,S.demo?'demo':'');
"""
new_poll_status = """    const now=Date.now(), tracked=[...S.vehicles.values()].filter(v=>now-v.ts<=MAX_AGE_MS);
    const fresh=tracked.filter(v=>now-v.ts<=GPS_FRESH_MS).length, delayed=tracked.length-fresh;
    const hidden=!S.demo&&S.feedStale?' · '+S.feedStale+' stale hidden':'';
    const delayedText=!S.demo&&delayed?' · '+delayed+' delayed':'';
    const tt=S.ttStop?' · timetable checked':'';
    const updated=' · updated '+formatClock(S.lastFeedAt), cached=S.feedFallback?' · cached during BODS outage':'';
    setStatus(S.demo?'Simulated · '+S.vehicles.size+' buses':'Live · '+fresh+' fresh'+delayedText+hidden+tt+cached+updated,S.demo?'demo':'');
"""
bus = replace_once(bus, old_poll_status, new_poll_status, "live status counts")

old_resume = """document.addEventListener('visibilitychange',()=>{
  if(document.hidden) stopPolling();
  else if(S.origin) startPolling();     // returning to the tab refetches immediately
});
// iOS keeps pages alive in the back/forward cache; treat that as a fresh load too
window.addEventListener('pageshow', e=>{ if(e.persisted && S.origin) startPolling(); });
"""
new_resume = """function repairLayoutAfterResume(){
  const active=document.activeElement;
  if(active&&active!==document.body&&typeof active.blur==='function') active.blur();
  document.documentElement.scrollTop=0; document.body.scrollTop=0;
  try{ window.scrollTo(0,0); }catch(e){}
  const repair=()=>{ try{ map.invalidateSize({pan:false,animate:false}); }catch(e){} };
  requestAnimationFrame(()=>{ repair(); requestAnimationFrame(repair); });
  setTimeout(()=>{ try{ window.scrollTo(0,0); }catch(e){} repair(); },180);
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden) stopPolling();
  else{
    repairLayoutAfterResume();
    if(S.origin) startPolling();     // retain the last board while the fresh request arrives
  }
});
// iOS keeps pages alive in the back/forward cache; repair every return,
// including external attribution links opened from the installed app.
window.addEventListener('pageshow',()=>{
  repairLayoutAfterResume();
  if(S.origin&&!S.timer) startPolling();
});
window.addEventListener('orientationchange',()=>setTimeout(repairLayoutAfterResume,180));
"""
bus = replace_once(bus, old_resume, new_resume, "iOS return layout repair")

old_stats = """function renderGpsStats(){
  const now=Date.now();
  const fresh=[...S.vehicles.values()].filter(v=>now-v.ts<=MAX_AGE_MS).length;
  const hidden=(Number(S.feedStale)||0)+(Number(S.feedUnknownAge)||0);
  $('statGpsVehicles').textContent=formatStat(fresh);
"""
new_stats = """function renderGpsStats(){
  const now=Date.now(), tracked=[...S.vehicles.values()].filter(v=>now-v.ts<=MAX_AGE_MS);
  const fresh=tracked.filter(v=>now-v.ts<=GPS_FRESH_MS).length, delayed=tracked.length-fresh;
  const hidden=(Number(S.feedStale)||0)+(Number(S.feedUnknownAge)||0);
  $('statGpsVehicles').textContent=formatStat(fresh);
"""
bus = replace_once(bus, old_stats, new_stats, "GPS stats counts")

bus = replace_once(
    bus,
    "  else if(S.workerOk===true){status.textContent='BODS GPS · Worker connected'+(S.workerVersion?' · '+S.workerVersion:'');status.style.color='var(--live)';}",
    "  else if(S.workerOk===true){status.textContent='BODS GPS · Worker connected'+(S.workerVersion?' · '+S.workerVersion:'')+(delayed?' · '+delayed+' delayed':'');status.style.color='var(--live)';}",
    "GPS stats delayed status",
)

if "Town centre</div>" in bus:
    raise SystemExit("persistent town centre marker still present")
if "S.vehicles.clear(); clearVehicleMarkers(); poll(true);" in bus:
    raise SystemExit("polling still clears vehicles on resume")
if "const APP_VERSION = '0.6.12';" not in bus:
    raise SystemExit("new app version missing")

bus_path.write_text(bus, encoding="utf-8")

package_path = Path("kerbside-backend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
if package.get("version") != "0.6.11":
    raise SystemExit(f"unexpected package predecessor: {package.get('version')}")
package["version"] = "0.6.12"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

readme_path = Path("kerbside-backend/README.md")
readme = readme_path.read_text(encoding="utf-8")
anchor = "Kerbside 0.6.11 pins the leave-alert bell to the compact departure header when live details expand, labels every real tracked vehicle with a clear `LIVE GPS` badge, and explains why future timetable rows remain scheduled until a vehicle begins broadcasting. Background OpenStreetMap anchor and route lookups no longer display a misleading stop-service error, and official national timetable stops skip the redundant route lookup entirely.\n"
addition = "\nKerbside 0.6.12 removes the misleading visible town-centre direction marker, labels the green point as the user's search location, and prevents accidental taps on map attribution links on touch devices while preserving clickable source links in Settings. Returning from an external page now repairs the iOS layout and refetches without clearing the existing board. Fresh GPS reports retain the `LIVE GPS` badge; reports between two and four minutes old remain briefly visible as `GPS DELAYED` rather than disappearing between irregular operator updates.\n"
if addition.strip() not in readme:
    readme = replace_once(readme, anchor, anchor + addition, "README release note")
readme_path.write_text(readme, encoding="utf-8")

print("Prepared Kerbside 0.6.12 map, resume and GPS continuity fixes")
