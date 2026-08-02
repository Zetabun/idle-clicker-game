from pathlib import Path
from textwrap import dedent
import json


def block(value: str) -> str:
    return dedent(value).lstrip('\n')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bus_path = Path('bus.html')
source = bus_path.read_text(encoding='utf-8')
source = replace_once(source, "const APP_VERSION = '0.6.3';", "const APP_VERSION = '0.6.4';", 'app version')

css = block('''
    /* Kerbside 0.6.4 compact board, inline settings tabs and GPS motion */
    .board-head{padding:9px 13px 8px}
    .stopline{gap:8px}
    .stopname{font-size:15px;line-height:1.2}
    .stopmeta{font-size:10.5px;margin-top:2px}
    .board-actions{display:flex;align-items:center;gap:10px;margin-top:6px;min-height:24px}
    .changestop{margin-top:0;font-size:11.5px}
    .pairbtn{margin-left:0;padding:3px 9px}
    .board-info-btn{margin-left:auto;width:24px;height:24px;border:1px solid var(--rule);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:700;font-size:13px;color:var(--text-dim);line-height:1}
    .board-info-btn:hover,.board-info-btn[aria-expanded="true"]{border-color:var(--led-dim);color:var(--led);background:var(--ink-3)}
    .board-info-panel{margin-top:7px;padding:9px 10px;border:1px solid var(--rule);border-radius:7px;background:var(--ink);font-size:10.5px;color:var(--text-dim);line-height:1.5}
    .board-info-panel[hidden]{display:none}
    .confidence-guide{padding-bottom:8px;border-bottom:1px solid var(--rule)}
    .confidence-guide b{color:var(--text);font-weight:600}
    .walkline{margin-top:6px;font-size:11px}
    .destbar{display:flex;flex-wrap:nowrap;gap:6px;margin-top:8px;overflow-x:auto;overflow-y:hidden;padding:1px 0 3px;scrollbar-width:none;overscroll-behavior-x:contain}
    .destbar::-webkit-scrollbar{display:none}
    .destchip{flex:0 0 auto;max-width:none;font-size:11.5px;padding:4px 10px;white-space:nowrap;overflow:visible;text-overflow:clip}

    .sheet header{padding:13px 16px;gap:12px}
    .settings-heading{display:flex;align-items:center;gap:13px;min-width:0;flex:1;flex-wrap:wrap}
    .sheet header h2{flex:0 0 auto}
    .settings-tabs{display:flex;align-items:center;gap:5px;padding:0;border:0;background:transparent}
    .settings-tab{padding:6px 10px;border:1px solid var(--rule);border-radius:7px;color:var(--text-dim);font-size:12px;font-weight:700;line-height:1.2}
    .settings-tab:hover{color:var(--text);border-color:var(--led-dim)}
    .settings-tab[aria-selected="true"]{background:var(--ink-3);border-color:var(--led-dim);color:var(--led);transform:none}
    .gps-stats-section{margin-bottom:17px}
    .gps-grid{margin-bottom:10px}
    .gps-grid .stat-value{font-size:clamp(16px,4vw,21px);letter-spacing:-.05em}
    .gps-note{margin:0;padding:10px 11px;border-left:2px solid var(--live);background:rgba(63,217,164,.045);color:var(--text-dim);font-size:10.5px;line-height:1.55}
    .gps-note b{color:#A9EED7;font-weight:600}

    .leaflet-marker-icon.vehmark{transition:transform var(--glide,950ms) linear;will-change:transform}

    @media (max-width:820px){
      .sheet header{padding:11px 13px;gap:8px}
      .settings-heading{gap:8px;flex-wrap:nowrap}
      .settings-tab{padding:6px 8px;font-size:11.5px}
      .board-head{padding:8px 12px 7px}
    }
''')
source = replace_once(source, '</style>', css + '\n</style>', 'css overrides')

source = replace_once(
    source,
    block('''
        <button class="changestop" id="changeStop">Choose a different stop</button>
        <button class="changestop pairbtn" id="pairBtn" style="display:none"></button>
        <div class="walkline" id="walkLine" style="display:none"></div>
        <div class="destbar" id="destBar" role="group" aria-label="Filter by destination"></div>
        <div class="destnote" id="destNote" style="display:none"></div>
        <div class="servenote" id="serveNote" style="display:none"></div>
    '''),
    block('''
        <div class="board-actions">
          <button class="changestop" id="changeStop">Change stop</button>
          <button class="changestop pairbtn" id="pairBtn" style="display:none"></button>
          <button class="board-info-btn" id="boardInfoBtn" aria-expanded="false" aria-controls="boardInfoPanel" title="Explain board labels and data" aria-label="Board information">i</button>
        </div>
        <div class="walkline" id="walkLine" style="display:none"></div>
        <div class="destbar" id="destBar" role="group" aria-label="Filter by destination"></div>
        <div class="board-info-panel" id="boardInfoPanel" hidden>
          <div class="confidence-guide"><b>Likely</b> means live GPS, route and direction evidence strongly suggest this bus will serve the stop, but its live journey is not fully matched. <b>Verified</b> has stronger journey/stop evidence; <b>rough</b> has limited evidence.</div>
          <div class="destnote" id="destNote" style="display:none"></div>
          <div class="servenote" id="serveNote" style="display:none"></div>
        </div>
    '''),
    'board information markup',
)

source = replace_once(
    source,
    block('''
    <header>
      <h2>Settings</h2>
      <button id="closeSet" style="font-size:22px;color:var(--text-dim);line-height:1" aria-label="Close settings">&times;</button>
    </header>
    <div class="settings-tabs" role="tablist" aria-label="Settings sections">
      <button class="settings-tab" id="dataTab" role="tab" aria-selected="true" aria-controls="dataPanel">Data source</button>
      <button class="settings-tab" id="statsTab" role="tab" aria-selected="false" aria-controls="statsPanel">Stats</button>
    </div>
    '''),
    block('''
    <header>
      <div class="settings-heading">
        <h2>Settings</h2>
        <div class="settings-tabs" role="tablist" aria-label="Settings sections">
          <button class="settings-tab" id="dataTab" role="tab" aria-selected="true" aria-controls="dataPanel">Data source</button>
          <button class="settings-tab" id="statsTab" role="tab" aria-selected="false" aria-controls="statsPanel">Stats</button>
        </div>
      </div>
      <button id="closeSet" style="font-size:22px;color:var(--text-dim);line-height:1" aria-label="Close settings">&times;</button>
    </header>
    '''),
    'settings header markup',
)

source = replace_once(
    source,
    block('''
          <div class="stats-section">
            <div class="stats-section-head"><h3>Regional coverage</h3><span id="statsAppVersion">App —</span></div>
    '''),
    block('''
          <div class="stats-section gps-stats-section">
            <div class="stats-section-head"><h3>Live GPS positions</h3><span id="statsGpsStatus">Checking feed</span></div>
            <div class="stats-grid gps-grid">
              <div class="stat-card"><span class="stat-value" id="statGpsVehicles">—</span><span class="stat-label">Fresh live positions</span></div>
              <div class="stat-card"><span class="stat-value" id="statGpsHidden">—</span><span class="stat-label">Stale or invalid hidden</span></div>
              <div class="stat-card"><span class="stat-value" id="statGpsRefresh">—</span><span class="stat-label">Browser refresh interval</span></div>
              <div class="stat-card"><span class="stat-value" id="statGpsUpdated">—</span><span class="stat-label">Last live update</span></div>
            </div>
            <p class="gps-note"><b>GPS supported.</b> The map uses operator vehicle-position snapshots from the BODS live feed. Between reports, Kerbside shows a short estimated glide based on recent confirmed movement; stop matching and ETAs continue to use confirmed GPS records.</p>
          </div>

          <div class="stats-section">
            <div class="stats-section-head"><h3>Regional coverage</h3><span id="statsAppVersion">App —</span></div>
    '''),
    'gps stats markup',
)

source = replace_once(
    source,
    block('''
  timer:null, tick:null, busy:false, pollAgain:false, lastOk:0, lastFeedAt:0,
  locationRun:0, pollAbort:null,
  feedStale:0, feedUnknownAge:0,
    '''),
    block('''
  timer:null, tick:null, motionTimer:null, busy:false, pollAgain:false, lastOk:0, lastFeedAt:0,
  locationRun:0, pollAbort:null,
  feedStale:0, feedUnknownAge:0, workerOk:null, workerVersion:'', workerBods:false,
    '''),
    'gps runtime state',
)
source = replace_once(
    source,
    block('''
const MAX_AGE_MS = 2*60*1000;  // old AVL positions are never silently revived
const MAX_VEH_DIST = 9000;
const FETCH_TIMEOUT_MS = 12000;
    '''),
    block('''
const MAX_AGE_MS = 2*60*1000;  // old AVL positions are never silently revived
const MAX_VEH_DIST = 9000;
const FETCH_TIMEOUT_MS = 12000;
const VISUAL_MOTION_TICK_MS = 1000;
const VISUAL_MAX_LEAD_SECONDS = 20;
const VISUAL_MAX_LEAD_METRES = 180;
    '''),
    'motion constants',
)

source = replace_once(
    source,
    block('''
    const prev = S.vehicles.get(v.id);
    const rec = prev || {hist:[], speed:null};
    if(prev && (prev.lat!==v.lat || prev.lon!==v.lon)){
    '''),
    block('''
    const prev = S.vehicles.get(v.id);
    const rec = prev || {hist:[], speed:null, cadence:null};
    if(prev && v.ts>prev.ts){
      const gap=(v.ts-prev.ts)/1000;
      if(gap>=2 && gap<=180) rec.cadence=rec.cadence==null?gap:rec.cadence*.65+gap*.35;
    }
    if(prev && (prev.lat!==v.lat || prev.lon!==v.lon)){
    '''),
    'gps cadence learning',
)
source = replace_once(
    source,
    block('''
    rec.hist.push({lat:v.lat,lon:v.lon,ts:v.ts});
    if(rec.hist.length>6) rec.hist.shift();
    '''),
    block('''
    const latest=rec.hist[rec.hist.length-1];
    if(!latest || latest.ts!==v.ts || latest.lat!==v.lat || latest.lon!==v.lon){
      rec.hist.push({lat:v.lat,lon:v.lon,ts:v.ts});
      if(rec.hist.length>8) rec.hist.shift();
    }
    '''),
    'gps history deduplication',
)
source = replace_once(
    source,
    block('''
  for(const [id,v] of S.vehicles){
    if(now - v.ts > MAX_AGE_MS) S.vehicles.delete(id);
  }
}

/* inbound = getting closer to the town anchor */
    '''),
    block('''
  for(const [id,v] of S.vehicles){
    if(now - v.ts > MAX_AGE_MS) S.vehicles.delete(id);
  }
}

function visualVehiclePosition(v,now=Date.now()){
  const confirmed={lat:v.lat,lon:v.lon,estimated:false};
  if(S.demo||!Array.isArray(v.hist)||v.hist.length<2) return confirmed;
  const b=v.hist[v.hist.length-1];
  let a=null;
  for(let i=v.hist.length-2;i>=0;i--){
    const point=v.hist[i];
    if(point.ts<b.ts && dist(point.lat,point.lon,b.lat,b.lon)>8){a=point;break;}
  }
  if(!a) return confirmed;
  const dt=(b.ts-a.ts)/1000,moved=dist(a.lat,a.lon,b.lat,b.lon);
  if(dt<3||dt>180||moved<8) return confirmed;
  const speed=moved/dt,age=Math.max(0,(now-b.ts)/1000),cadence=Number(v.cadence)||dt;
  if(speed<.8||speed>18||age>Math.max(60,cadence*2.5)) return confirmed;
  const lead=Math.min(age,VISUAL_MAX_LEAD_SECONDS,Math.max(4,cadence*.9));
  const metres=Math.min(speed*lead,VISUAL_MAX_LEAD_METRES);
  if(metres<1) return confirmed;
  const fraction=metres/moved;
  return {lat:b.lat+(b.lat-a.lat)*fraction,lon:b.lon+(b.lon-a.lon)*fraction,estimated:true};
}
function updateVehicleMotion(){
  if(document.hidden||document.body.classList.contains('mapmoving')) return;
  const now=Date.now();
  for(const [id,m] of S.markers){
    const v=S.vehicles.get(id);if(!v) continue;
    const p=visualVehiclePosition(v,now);m.setLatLng([p.lat,p.lon]);
  }
}

/* inbound = getting closer to the town anchor */
    '''),
    'bounded visual gps motion',
)

source = replace_once(
    source,
    '    const brg = isFinite(v.bearing)?v.bearing:0;\n',
    '    const brg = isFinite(v.bearing)?v.bearing:0;\n    const visual=visualVehiclePosition(v);\n',
    'visual marker position',
)
source = replace_once(source, '      m = L.marker([v.lat,v.lon],{', '      m = L.marker([visual.lat,visual.lon],{', 'new marker visual position')
source = replace_once(source, '      m.setLatLng([v.lat,v.lon]);', '      m.setLatLng([visual.lat,visual.lon]);', 'existing marker visual position')
source = replace_once(
    source,
    block('''
  if(v && S.selected){
    map.panTo([v.lat,v.lon],{animate:true});
    '''),
    block('''
  if(v && S.selected){
    const visual=visualVehiclePosition(v);
    map.panTo([visual.lat,visual.lon],{animate:true});
    '''),
    'focus visual position',
)
source = replace_once(
    source,
    block('''
  document.documentElement.style.setProperty('--glide',Math.max(1.5,S.interval*.8)+'s');
  S.vehicles.clear(); clearVehicleMarkers(); poll(true);
  S.timer=setInterval(poll,S.interval*1000);
  S.tick=setInterval(()=>{ if(S.stop) render(); },5000);
    '''),
    block('''
  document.documentElement.style.setProperty('--glide','950ms');
  S.vehicles.clear(); clearVehicleMarkers(); poll(true);
  S.timer=setInterval(poll,S.interval*1000);
  S.motionTimer=setInterval(updateVehicleMotion,VISUAL_MOTION_TICK_MS);
  S.tick=setInterval(()=>{ if(S.stop) render(); },5000);
    '''),
    'start motion timer',
)
source = replace_once(
    source,
    block('''
function stopPolling(){
  if(S.timer) clearInterval(S.timer); if(S.tick) clearInterval(S.tick);
  if(S.pollAbort) S.pollAbort.abort();
  S.timer=S.tick=null; S.pollAbort=null;
}
    '''),
    block('''
function stopPolling(){
  if(S.timer) clearInterval(S.timer);if(S.tick) clearInterval(S.tick);if(S.motionTimer) clearInterval(S.motionTimer);
  if(S.pollAbort) S.pollAbort.abort();
  S.timer=S.tick=S.motionTimer=null;S.pollAbort=null;
}
    '''),
    'stop motion timer',
)
source = replace_once(
    source,
    "    setStatus(S.demo?'Simulated · '+S.vehicles.size+' buses':'Live · '+S.vehicles.size+' fresh'+hidden+tt+cached+updated,S.demo?'demo':'');\n    render();",
    "    setStatus(S.demo?'Simulated · '+S.vehicles.size+' buses':'Live · '+S.vehicles.size+' fresh'+hidden+tt+cached+updated,S.demo?'demo':'');\n    renderGpsStats();\n    render();",
    'refresh gps stats after poll',
)

source = replace_once(
    source,
    "      const confLabel=r.confidence==='high'?'verified':r.confidence==='medium'?'likely':'rough';\n      const etaText=due?'due':(r.confidence==='low'?'~':'')+mins;",
    "      const confLabel=r.confidence==='high'?'verified':r.confidence==='medium'?'likely':'rough';\n      const confHelp=r.confidence==='high'?'Journey or timetable evidence strongly confirms this bus serves the selected stop.':r.confidence==='medium'?'Live GPS, route and direction evidence suggest this bus serves the stop, but the journey is not fully matched.':'Limited route or movement evidence; treat this ETA as approximate.';\n      const etaText=due?'due':(r.confidence==='low'?'~':'')+mins;",
    'confidence help text',
)
source = replace_once(
    source,
    "+'<span class=\"chip conf-'+r.confidence+'\">'+confLabel+'</span>'",
    "+'<span class=\"chip conf-'+r.confidence+'\" title=\"'+esc(confHelp)+'\" aria-label=\"'+esc(confLabel+': '+confHelp)+'\">'+confLabel+'</span>'",
    'confidence tooltip',
)

source = replace_once(
    source,
    block('''
/* ============================================================
   Polling
   ============================================================ */
    '''),
    block('''
function setBoardInfo(open){
  const expanded=!!open;
  $('boardInfoBtn').setAttribute('aria-expanded',String(expanded));
  $('boardInfoPanel').hidden=!expanded;
}
$('boardInfoBtn').addEventListener('click',()=>setBoardInfo($('boardInfoBtn').getAttribute('aria-expanded')!=='true'));

/* ============================================================
   Polling
   ============================================================ */
    '''),
    'board info toggle',
)

source = replace_once(
    source,
    block('''
function prettyRegionName(name){
  return String(name||'').split('_').map(word=>word?word[0].toUpperCase()+word.slice(1):'').join(' ');
}
function renderNetworkStats(manifest,error){
    '''),
    block('''
function prettyRegionName(name){
  return String(name||'').split('_').map(word=>word?word[0].toUpperCase()+word.slice(1):'').join(' ');
}
function renderGpsStats(){
  const now=Date.now();
  const fresh=[...S.vehicles.values()].filter(v=>now-v.ts<=MAX_AGE_MS).length;
  const hidden=(Number(S.feedStale)||0)+(Number(S.feedUnknownAge)||0);
  $('statGpsVehicles').textContent=formatStat(fresh);
  $('statGpsHidden').textContent=formatStat(hidden);
  $('statGpsRefresh').textContent=S.interval+' s';
  $('statGpsUpdated').textContent=S.lastFeedAt?formatClock(S.lastFeedAt):'Waiting';
  const status=$('statsGpsStatus');
  if(S.demo){status.textContent='Simulator, not live GPS';status.style.color='var(--led)';}
  else if(S.workerOk===true){status.textContent='BODS GPS · Worker connected'+(S.workerVersion?' · '+S.workerVersion:'');status.style.color='var(--live)';}
  else if(S.workerOk===false){status.textContent='Worker health check failed';status.style.color='var(--warn)';}
  else if(S.proxy){status.textContent='BODS GPS · checking Worker';status.style.color='var(--text-dim)';}
  else{status.textContent='Live GPS not configured';status.style.color='var(--text-dim)';}
}
function renderNetworkStats(manifest,error){
    '''),
    'gps stats renderer',
)
source = replace_once(
    source,
    "  }).join(''):'<div class=\"region-stat\"><b>No regional statistics available</b></div>';\n}",
    "  }).join(''):'<div class=\"region-stat\"><b>No regional statistics available</b></div>';\n  renderGpsStats();\n}",
    'network stats gps refresh',
)
source = replace_once(
    source,
    "  if(stats){\n    if(DATA_MANIFEST) renderNetworkStats(DATA_MANIFEST,null);\n    else refreshNetworkStats(false);\n  }",
    "  if(stats){\n    renderGpsStats();\n    if(DATA_MANIFEST) renderNetworkStats(DATA_MANIFEST,null);\n    else refreshNetworkStats(false);\n  }",
    'stats tab gps refresh',
)
source = replace_once(
    source,
    "  if(S.demo){el.className='settings-status good';el.textContent='Simulator active · '+dataText+' · app '+APP_VERSION;return;}\n  if(!S.proxy){el.className='settings-status';el.textContent=(S.key?'Local key mode selected':'Add your Cloudflare Worker URL')+' · '+dataText+' · app '+APP_VERSION;return;}",
    "  if(S.demo){S.workerOk=null;renderGpsStats();el.className='settings-status good';el.textContent='Simulator active · '+dataText+' · app '+APP_VERSION;return;}\n  if(!S.proxy){S.workerOk=null;renderGpsStats();el.className='settings-status';el.textContent=(S.key?'Local key mode selected':'Add your Cloudflare Worker URL')+' · '+dataText+' · app '+APP_VERSION;return;}",
    'gps source precheck',
)
source = replace_once(
    source,
    "    if(!r.ok) throw new Error(j.error||('HTTP '+r.status));\n    el.className='settings-status good';el.textContent='Live Worker reachable · BODS secret '+(j.bods?'configured':'missing')+' · '+dataText+' · app '+APP_VERSION;\n  }catch(e){el.className='settings-status bad';el.textContent='Live Worker check failed: '+(e.message||'unreachable')+' · '+dataText+' · app '+APP_VERSION;}",
    "    if(!r.ok) throw new Error(j.error||('HTTP '+r.status));\n    S.workerOk=true;S.workerVersion=String(j.version||'');S.workerBods=!!j.bods;renderGpsStats();\n    el.className='settings-status good';el.textContent='Live Worker reachable · BODS secret '+(j.bods?'configured':'missing')+' · '+dataText+' · app '+APP_VERSION;\n  }catch(e){S.workerOk=false;S.workerVersion='';S.workerBods=false;renderGpsStats();el.className='settings-status bad';el.textContent='Live Worker check failed: '+(e.message||'unreachable')+' · '+dataText+' · app '+APP_VERSION;}",
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
    'Kerbside 0.6.3 adds a Settings Stats tab that reads current network totals and per-region coverage directly from the live Pages manifest. It also wraps long destination filters and gives scheduled ETA values a wider, clearer column.\n',
    'Kerbside 0.6.3 adds a Settings Stats tab that reads current network totals and per-region coverage directly from the live Pages manifest. It also wraps long destination filters and gives scheduled ETA values a wider, clearer column.\n\nKerbside 0.6.4 places the settings tabs beside the dialog title, adds live GPS and Worker statistics, and continuously animates a short bounded visual estimate between confirmed vehicle snapshots. The compact Times header keeps destination filters on one horizontal scroller and moves route-source and confidence explanations behind its information button. Timetable matching and ETA calculations continue to use confirmed vehicle records rather than the visual estimate.\n',
    'readme release note',
)
readme_path.write_text(readme, encoding='utf-8')

for marker in [
    "const APP_VERSION = '0.6.4';",
    'id="boardInfoBtn"',
    'id="statsGpsStatus"',
    'function visualVehiclePosition',
    'function updateVehicleMotion',
    'S.motionTimer=setInterval(updateVehicleMotion',
    "title=\"'+esc(confHelp)+'\"",
]:
    if marker not in source:
        raise SystemExit(f'missing release marker: {marker}')

print('Kerbside 0.6.4 patch applied')
