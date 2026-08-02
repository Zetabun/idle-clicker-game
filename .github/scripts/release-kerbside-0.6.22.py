from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.21';", "const APP_VERSION = '0.6.22';")
replace_once('kerbside-backend/package.json', '"version": "0.6.21"', '"version": "0.6.22"')
replace_once("kerbside-backend/src/worker.js", "version: '0.6.21',", "version: '0.6.22',")
replace_once("kerbside-backend/test/worker.test.js", "assert.equal(body.version, '0.6.21');", "assert.equal(body.version, '0.6.22');")

replace_once(
    'bus.html',
    "          <div id=\"sourceStatus\" class=\"settings-status\">No source check has run yet.</div>\n          <button class=\"copybtn\" id=\"copyStopBtn\" type=\"button\">Copy current stop for Cloudflare recorder</button>\n",
    "          <div id=\"sourceStatus\" class=\"settings-status\">No source check has run yet.</div>\n"
)
replace_once(
    'bus.html',
    "  workerHistory:{}, lastWideFetch:0\n",
    "  lastWideFetch:0\n"
)
replace_once(
    'bus.html',
    """async function loadWorkerHistory(stop){
  if(!S.proxy || !stop) return;
  const id=String(stop.code || (S.ttStop&&S.ttStop.id) || stop.id);
  try{
    const u=new URL(S.proxy,location.href); u.pathname=u.pathname.replace(/\/$/,'')+'/history';
    u.searchParams.set('days','30'); u.searchParams.set('stop',id);
    const r=await fetchTimed(u.toString(),{headers:{Accept:'application/json'},cache:'no-store'},8000);
    if(!r.ok) return;
    const j=await r.json();
    if(!Array.isArray(j.arrivals)) return;
    S.workerHistory[id]=j.arrivals;
    const sid=String(stop.id), bag=SERVING[sid]||(SERVING[sid]={});
    const lines={};
    j.arrivals.forEach(a=>{ const l=cleanLine(a.l||a.line||''); if(l) lines[l]=(lines[l]||0)+1; });
    Object.entries(lines).forEach(([line,count])=>{
      const old=normaliseServingRecord(bag[line]);
      bag[line]={last:Date.now(),count:Math.max(old.count,count),vehicles:old.vehicles||[],confirmed:count>=2,source:'worker'};
    });
    saveServing(); renderServingNote(); render();
  }catch(e){}
}

""",
    ""
)
replace_once(
    'bus.html',
    "  loadWorkerHistory(s); loadStopTimetable(s); savePrefs(); render();",
    "  loadStopTimetable(s); savePrefs(); render();"
)
replace_once(
    'bus.html',
    "  $('copyStopBtn').disabled=!S.stop; $('copyStopBtn').style.opacity=S.stop?'1':'.45';\n",
    ""
)
replace_once(
    'bus.html',
    """$('copyStopBtn').addEventListener('click',async()=>{
  if(!S.stop){ toast('Choose a stop first.',true); return; }
  const item={id:String(S.stop.code||(S.ttStop&&S.ttStop.id)||S.stop.id),name:S.stop.name,lat:+S.stop.lat.toFixed(6),lon:+S.stop.lon.toFixed(6)};
  const text=JSON.stringify([item]);
  try{ await navigator.clipboard.writeText(text); toast('Stop configuration copied for WATCHED_STOPS.'); }
  catch(e){ toast(text); }
});
""",
    ""
)
replace_once(
    'bus.html',
    "  S.remember=false; S.key=''; S.proxy=''; S.demo=true; S.destsByStop={}; S.workerHistory={};",
    "  S.remember=false; S.key=''; S.proxy=''; S.demo=true; S.destsByStop={};"
)
replace_once(
    'bus.html',
    "    if(S.stop) loadWorkerHistory(S.stop);\n",
    ""
)

replace_once(
    'bus.html',
    "Version 0.6.21 also clears the previous town anchor immediately when a new location is chosen, preventing old-area direction evidence from filtering buses while the new anchor lookup is still running.",
    "Version 0.6.22 also removes the retired Cloudflare recorder controls and silent /history requests; the public Worker is now represented accurately as a live-feed proxy only."
)

readme_marker = "Kerbside 0.6.21 resets location-dependent direction state immediately. Choosing a new address or device location now clears the previous town anchor before stops or live vehicles are loaded, so a slow place lookup cannot temporarily classify buses using the town centre from the user's former area. Inbound/outbound remains neutral until the new anchor resolves.\n"
readme_addition = readme_marker + "\nKerbside 0.6.22 removes the retired recorder/history client. The Settings button for copying `WATCHED_STOPS`, the silent `/history` request, its in-memory state and all call sites have been deleted because the live-only Worker exposes only `/`, `/feed` and `/health`. Local observed-arrival learning remains available in the browser, but the interface no longer implies that a Cloudflare recorder is active.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.21'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.22'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /S\\.anchor=null; drawAnchor\\(\\); updateDirLabels\\(\\);/);",
    """assert.match(busSource, /S\\.anchor=null; drawAnchor\\(\\); updateDirLabels\\(\\);/);
assert.doesNotMatch(busSource, /loadWorkerHistory/);
assert.doesNotMatch(busSource, /copyStopBtn/);
assert.doesNotMatch(busSource, /WATCHED_STOPS/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.21'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.22'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.21', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.22', bods: true })"
)

print('Prepared Kerbside 0.6.22 retired recorder cleanup.')
