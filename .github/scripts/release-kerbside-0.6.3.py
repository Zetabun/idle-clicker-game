#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
BUS_PATH = ROOT / 'bus.html'
PACKAGE_PATH = ROOT / 'kerbside-backend' / 'package.json'

source = BUS_PATH.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


source = replace_once(
    source,
    "const APP_VERSION = '0.6.2';",
    "const APP_VERSION = '0.6.3';",
    'browser version',
)

source = replace_once(
    source,
    ".destbar{display:flex;gap:6px;margin-top:11px;overflow-x:auto;padding-bottom:3px;scrollbar-width:none}\n.destbar::-webkit-scrollbar{display:none}\n.destbar:empty{display:none}\n.destchip{\n  flex:0 0 auto;font-size:12px;font-weight:600;padding:5px 11px;border-radius:14px;\n  border:1px solid var(--rule);color:var(--text-dim);white-space:nowrap;transition:background .12s,color .12s;\n}",
    ".destbar{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px;overflow:visible;padding-bottom:2px}\n.destbar:empty{display:none}\n.destchip{\n  flex:0 1 auto;max-width:100%;font-size:12px;font-weight:600;padding:5px 11px;border-radius:14px;\n  border:1px solid var(--rule);color:var(--text-dim);white-space:normal;overflow-wrap:anywhere;text-align:left;line-height:1.25;transition:background .12s,color .12s;\n}",
    'destination chip layout',
)

source = replace_once(
    source,
    ".dep.schedule-only{grid-template-columns:46px minmax(0,1fr) 64px;cursor:default;opacity:.82}\n.dep.schedule-only:hover{background:transparent}\n.dep.schedule-only .route{background:var(--ink-3);color:var(--led);border:1px solid var(--led-dim)}\n.eta.scheduled{color:var(--text-dim);text-shadow:none}\n.eta.scheduled small{color:var(--text-dim);opacity:.7}",
    ".dep.schedule-only{grid-template-columns:46px minmax(0,1fr) 82px;cursor:default;opacity:.82}\n.dep.schedule-only:hover{background:transparent}\n.dep.schedule-only .route{background:var(--ink-3);color:var(--led);border:1px solid var(--led-dim)}\n.eta.scheduled{min-width:82px;color:var(--text-dim);text-shadow:none}\n.eta.scheduled small{color:var(--text-dim);opacity:.7;letter-spacing:.08em;white-space:nowrap}",
    'scheduled ETA layout',
)

source = replace_once(
    source,
    ".sheet{\n  background:var(--ink-2);border:1px solid var(--rule);border-radius:14px;width:100%;max-width:480px;\n  max-height:88vh;overflow-y:auto;box-shadow:0 30px 70px rgba(0,0,0,.6);\n}\n.sheet header{padding:16px 20px 12px;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;align-items:center}\n.sheet header h2{margin:0;font-size:16px;letter-spacing:-.02em}\n.sheet .pad{padding:18px 20px}",
    ".sheet{\n  background:var(--ink-2);border:1px solid var(--rule);border-radius:14px;width:100%;max-width:520px;\n  max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 70px rgba(0,0,0,.6);\n}\n.sheet header{padding:16px 20px 12px;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;align-items:center}\n.sheet header h2{margin:0;font-size:16px;letter-spacing:-.02em}\n.settings-tabs{display:flex;gap:6px;padding:9px 14px 0;border-bottom:1px solid var(--rule);background:var(--ink)}\n.settings-tab{padding:8px 13px 9px;border:1px solid transparent;border-bottom:0;border-radius:8px 8px 0 0;color:var(--text-dim);font-size:12.5px;font-weight:700}\n.settings-tab:hover{color:var(--text)}\n.settings-tab[aria-selected=\"true\"]{background:var(--ink-2);border-color:var(--rule);color:var(--led);transform:translateY(1px)}\n.settings-body{overflow-y:auto;min-height:0;scrollbar-width:thin;scrollbar-color:var(--rule) transparent}\n.settings-panel[hidden]{display:none}\n.sheet .pad{padding:18px 20px}\n.stats-hero{padding:15px;border:1px solid var(--rule);border-radius:10px;background:linear-gradient(145deg,rgba(255,176,0,.08),rgba(11,17,25,.72));margin-bottom:12px}\n.stats-kicker{font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--led);font-weight:700}\n.stats-hero h3{margin:5px 0 4px;font-size:20px;letter-spacing:-.03em}\n.stats-summary{margin:0;color:var(--text-dim);font-size:12px;line-height:1.5}\n.stats-build{margin-top:10px;padding-top:10px;border-top:1px solid var(--rule);font-size:11px;color:#A9EED7}\n.stats-build.bad{color:#FFD0CA}\n.stats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-bottom:18px}\n.stat-card{min-width:0;padding:13px;background:var(--ink);border:1px solid var(--rule);border-radius:9px}\n.stat-value{display:block;font-family:'Martian Mono',monospace;font-size:clamp(18px,4.5vw,24px);font-weight:700;letter-spacing:-.08em;color:var(--led);overflow-wrap:anywhere}\n.stat-label{display:block;margin-top:5px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);line-height:1.35}\n.stats-section{border-top:1px solid var(--rule);padding-top:15px}\n.stats-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:9px}\n.stats-section-head h3{margin:0;font-size:13px}\n.stats-section-head span{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)}\n.region-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}\n.region-stat{min-width:0;padding:9px 10px;border:1px solid var(--rule);border-radius:7px;background:var(--ink)}\n.region-stat b{display:block;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.region-stat small{display:block;margin-top:3px;font-size:9.5px;color:var(--text-dim);line-height:1.4}\n.stats-foot{margin:14px 0 0;font-size:10.5px;color:var(--text-dim);line-height:1.55}",
    'settings and stats styles',
)

source = replace_once(
    source,
    "  .dep{grid-template-columns:42px minmax(0,1fr) 52px;gap:8px;padding:11px 13px}\n  .eta{font-size:21px;min-width:0}\n  .chip{font-size:9.5px;padding:2px 5px}\n  .dfacts{grid-template-columns:repeat(2,1fr)}",
    "  .dep{grid-template-columns:42px minmax(0,1fr) 52px;gap:8px;padding:11px 13px}\n  .dep.schedule-only{grid-template-columns:42px minmax(0,1fr) 68px}\n  .eta{font-size:21px;min-width:0}\n  .eta.scheduled{min-width:68px;font-size:20px}\n  .chip{font-size:9.5px;padding:2px 5px}\n  .dfacts{grid-template-columns:repeat(2,1fr)}\n  .region-stats{grid-template-columns:1fr}",
    'mobile scheduled ETA and stats layout',
)

settings_start = source.index('<div id="scrim" role="dialog" aria-modal="true" aria-label="Settings">')
settings_end = source.index('\n\n<div id="toast"', settings_start)
settings_html = r'''<div id="scrim" role="dialog" aria-modal="true" aria-label="Settings">
  <div class="sheet">
    <header>
      <h2>Settings</h2>
      <button id="closeSet" style="font-size:22px;color:var(--text-dim);line-height:1" aria-label="Close settings">&times;</button>
    </header>
    <div class="settings-tabs" role="tablist" aria-label="Settings sections">
      <button class="settings-tab" id="dataTab" role="tab" aria-selected="true" aria-controls="dataPanel">Data source</button>
      <button class="settings-tab" id="statsTab" role="tab" aria-selected="false" aria-controls="statsPanel">Stats</button>
    </div>
    <div class="settings-body">
      <section class="settings-panel" id="dataPanel" role="tabpanel" aria-labelledby="dataTab">
        <div class="pad">
          <p class="note">Live positions come from the Department for Transport's <b style="color:var(--led)">Bus Open Data Service</b>. For a public copy, use your Cloudflare Worker so the BODS key stays off the page. The national timetable verifies which routes and destinations actually call at a stop.</p>

          <div class="field" style="margin-top:16px">
            <label for="proxy">Cloudflare Worker URL</label>
            <input id="proxy" type="text" placeholder="https://kerbside-bus.your-name.workers.dev" autocomplete="off" inputmode="url">
            <div class="hint">Recommended. Enter the Worker base URL, without adding <code>?bbox=</code>. The browser sends only a small geographic box; your BODS key remains a Cloudflare secret.</div>
          </div>

          <div class="field">
            <label for="apiKey">BODS API key — local testing only</label>
            <input id="apiKey" type="password" placeholder="Leave empty when using the Worker" autocomplete="off">
            <div class="hint">Kept in memory for this tab only and never written to browser storage. Direct browser access normally fails because BODS does not provide browser CORS headers.</div>
          </div>

          <div id="sourceStatus" class="settings-status">No source check has run yet.</div>
          <button class="copybtn" id="copyStopBtn" type="button">Copy current stop for Cloudflare recorder</button>

          <div class="row">
            <div class="field">
              <label for="radius">Search radius</label>
              <select id="radius">
                <option value="800">800 m</option>
                <option value="1500" selected>1.5 km</option>
                <option value="3000">3 km</option>
                <option value="6000">6 km</option>
              </select>
            </div>
            <div class="field">
              <label for="interval">Refresh every</label>
              <select id="interval">
                <option value="10">10 seconds</option>
                <option value="15" selected>15 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
              </select>
            </div>
          </div>

          <div class="toggle">
            <div>
              <div class="t">Simulator</div>
              <div class="h">Invented buses on real roads near your location. Use it to try the app without a key.</div>
            </div>
            <button class="sw" id="demoSw" aria-pressed="true" aria-label="Toggle simulator"></button>
          </div>

          <div class="toggle">
            <div>
              <div class="t">Only routes seen at this stop</div>
              <div class="h">The app watches which buses actually pull in, then hides the rest. A far-off bus still shows if its route calls here.</div>
            </div>
            <button class="sw" id="serveSw" aria-pressed="true" aria-label="Toggle showing only routes seen at this stop"></button>
          </div>

          <div class="toggle">
            <div>
              <div class="t">Hide buses heading away</div>
              <div class="h">Drops anything already past your stop, even if the route matches.</div>
            </div>
            <button class="sw" id="awaySw" aria-pressed="true" aria-label="Toggle hiding buses heading away"></button>
          </div>

          <div class="toggle">
            <div>
              <div class="t">Remember on this device</div>
              <div class="h" id="rememberHint">Keeps the Worker URL, last stop and locally learned route evidence. The BODS key is never saved.</div>
            </div>
            <button class="sw" id="rememberSw" aria-pressed="true" aria-label="Toggle remembering settings on this device"></button>
          </div>

          <button class="primary" id="saveSet">Apply and refresh</button>
          <button id="forgetBtn" style="width:100%;margin-top:10px;font-size:12.5px;color:var(--text-dim);text-decoration:underline;text-underline-offset:3px;padding:6px">Forget everything saved on this device</button>
        </div>
      </section>

      <section class="settings-panel" id="statsPanel" role="tabpanel" aria-labelledby="statsTab" hidden aria-live="polite">
        <div class="pad">
          <div class="stats-hero">
            <div class="stats-kicker">National timetable network</div>
            <h3>Kerbside coverage</h3>
            <p class="stats-summary" id="statsCoverageText">Loading current national coverage…</p>
            <div class="stats-build" id="statsBuilt">Loading latest build information…</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card"><span class="stat-value" id="statStops">—</span><span class="stat-label">Official stops</span></div>
            <div class="stat-card"><span class="stat-value" id="statDepartures">—</span><span class="stat-label">Scheduled departure records</span></div>
            <div class="stat-card"><span class="stat-value" id="statPatterns">—</span><span class="stat-label">Route patterns</span></div>
            <div class="stat-card"><span class="stat-value" id="statRegions">—</span><span class="stat-label">English regions</span></div>
          </div>

          <div class="stats-section">
            <div class="stats-section-head"><h3>Regional coverage</h3><span id="statsAppVersion">App —</span></div>
            <div class="region-stats" id="regionStats"><div class="region-stat"><b>Loading regions…</b></div></div>
          </div>
          <p class="stats-foot">These figures are read directly from the live Cloudflare Pages manifest, so they update automatically after every successful national timetable build.</p>
        </div>
      </section>
    </div>
  </div>
</div>'''
source = source[:settings_start] + settings_html + source[settings_end:]

source = replace_once(
    source,
    "+'<span class=\"eta scheduled\">'+(due?'due':mins)+'<small>'+(due?'scheduled':'sched min')+'</small></span></div>';",
    "+'<span class=\"eta scheduled\">'+(due?'due':mins)+'<small>'+(due?'scheduled':'min')+'</small></span></div>';",
    'scheduled ETA label',
)

settings_js_start = source.index('async function checkSourceStatus(){')
settings_js_end = source.index("$('setBtn').addEventListener", settings_js_start)
settings_js = r'''const STAT_NUMBER = new Intl.NumberFormat('en-GB');
function formatStat(value){
  const number=Number(value);
  return Number.isFinite(number)?STAT_NUMBER.format(number):'—';
}
function prettyRegionName(name){
  return String(name||'').split('_').map(word=>word?word[0].toUpperCase()+word.slice(1):'').join(' ');
}
function renderNetworkStats(manifest,error){
  const totals=(manifest&&manifest.totals)||{};
  const regions=Object.entries((manifest&&manifest.regions)||{}).sort((a,b)=>a[0].localeCompare(b[0]));
  $('statStops').textContent=formatStat(totals.stops);
  $('statDepartures').textContent=formatStat(totals.departures);
  $('statPatterns').textContent=formatStat(totals.patterns);
  $('statRegions').textContent=formatStat(regions.length);
  $('statsAppVersion').textContent='App '+APP_VERSION;
  $('statsCoverageText').textContent=error
    ? 'The live timetable manifest could not be read.'
    : regions.length+' English regions are included in the current national build.';
  const built=manifest&&manifest.built?new Date(manifest.built):null;
  const buildText=built&&!Number.isNaN(built.getTime())
    ? 'Latest timetable build: '+built.toLocaleString([],{dateStyle:'medium',timeStyle:'short'})
    : 'Latest timetable build time unavailable';
  $('statsBuilt').textContent=error?'Stats unavailable: '+String(error.message||error):buildText;
  $('statsBuilt').className='stats-build'+(error?' bad':'');
  $('regionStats').innerHTML=regions.length?regions.map(([name,info])=>{
    return '<div class="region-stat"><b>'+esc(prettyRegionName(name))+'</b><small>'
      +formatStat(info&&info.stops)+' stops · '+formatStat(info&&info.departures)+' departures</small></div>';
  }).join(''):'<div class="region-stat"><b>No regional statistics available</b></div>';
}
async function refreshNetworkStats(force){
  try{
    const manifest=await loadDataManifest(!!force);
    renderNetworkStats(manifest,null);
    return manifest;
  }catch(e){
    renderNetworkStats(null,e);
    return null;
  }
}
function setSettingsTab(name){
  const stats=name==='stats';
  $('dataTab').setAttribute('aria-selected',String(!stats));
  $('statsTab').setAttribute('aria-selected',String(stats));
  $('dataPanel').hidden=stats;
  $('statsPanel').hidden=!stats;
  if(stats){
    if(DATA_MANIFEST) renderNetworkStats(DATA_MANIFEST,null);
    else refreshNetworkStats(false);
  }
}
async function checkSourceStatus(){
  const el=$('sourceStatus'); el.className='settings-status'; el.textContent='Checking live Worker and timetable Pages…';
  let dataText='national timetable unavailable';
  try{
    const manifest=await loadDataManifest(true);
    renderNetworkStats(manifest,null);
    dataText='national timetable '+((manifest&&manifest.built)?'updated '+new Date(manifest.built).toLocaleDateString():'connected');
  }catch(e){
    renderNetworkStats(null,e);
    dataText='national timetable unavailable';
  }
  if(S.demo){el.className='settings-status good';el.textContent='Simulator active · '+dataText+' · app '+APP_VERSION;return;}
  if(!S.proxy){el.className='settings-status';el.textContent=(S.key?'Local key mode selected':'Add your Cloudflare Worker URL')+' · '+dataText+' · app '+APP_VERSION;return;}
  try{
    const u=new URL(S.proxy,location.href);u.pathname=u.pathname.replace(/\/$/,'')+'/health';u.search='';
    const r=await fetchTimed(u.toString(),{headers:{Accept:'application/json'},cache:'no-store'},7000);const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||('HTTP '+r.status));
    el.className='settings-status good';el.textContent='Live Worker reachable · BODS secret '+(j.bods?'configured':'missing')+' · '+dataText+' · app '+APP_VERSION;
  }catch(e){el.className='settings-status bad';el.textContent='Live Worker check failed: '+(e.message||'unreachable')+' · '+dataText+' · app '+APP_VERSION;}
}
'''
source = source[:settings_js_start] + settings_js + source[settings_js_end:]

source = replace_once(
    source,
    "$('setBtn').addEventListener('click',()=>{\n  $('apiKey').value=S.key; $('proxy').value=S.proxy;",
    "$('setBtn').addEventListener('click',()=>{\n  setSettingsTab('data');\n  $('apiKey').value=S.key; $('proxy').value=S.proxy;",
    'settings open default tab',
)

source = replace_once(
    source,
    "$('closeSet').addEventListener('click',()=>$('scrim').classList.remove('show'));",
    "$('dataTab').addEventListener('click',()=>setSettingsTab('data'));\n$('statsTab').addEventListener('click',()=>setSettingsTab('stats'));\n$('closeSet').addEventListener('click',()=>$('scrim').classList.remove('show'));",
    'settings tab handlers',
)

required = [
    "const APP_VERSION = '0.6.3';",
    'id="statsTab"',
    'id="statStops"',
    'function renderNetworkStats',
    'Promise',
    "(due?'scheduled':'min')",
]
for token in required:
    if token not in source:
        raise SystemExit(f'missing expected release token: {token}')

BUS_PATH.write_text(source, encoding='utf-8')

package = json.loads(PACKAGE_PATH.read_text(encoding='utf-8'))
if package.get('version') != '0.6.2':
    raise SystemExit(f"package predecessor mismatch: {package.get('version')!r}")
package['version'] = '0.6.3'
PACKAGE_PATH.write_text(json.dumps(package, indent=2) + '\n', encoding='utf-8')

print('Prepared Kerbside 0.6.3 with live network stats and board layout fixes.')
