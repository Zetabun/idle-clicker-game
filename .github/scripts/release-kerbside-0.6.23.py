from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.22';", "const APP_VERSION = '0.6.23';")
replace_once('kerbside-backend/package.json', '"version": "0.6.22"', '"version": "0.6.23"')
replace_once("kerbside-backend/src/worker.js", "version: '0.6.22',", "version: '0.6.23',")
replace_once("kerbside-backend/test/worker.test.js", "assert.equal(body.version, '0.6.22');", "assert.equal(body.version, '0.6.23');")

replace_once(
    'bus.html',
    "let sugTimer, sugItems=[], sugIdx=-1;",
    """let sugTimer, sugItems=[], sugIdx=-1, geocodeRun=0, geocodeAbort=null;
function cancelGeocode(){
  geocodeRun++;
  if(geocodeAbort){ geocodeAbort.abort(); geocodeAbort=null; }
}"""
)
replace_once(
    'bus.html',
    """  clearTimeout(sugTimer);
  if(v.length<3){ hideSuggest(); return; }
""",
    """  clearTimeout(sugTimer);
  if(v.length<3){ cancelGeocode(); hideSuggest(); return; }
"""
)
replace_once(
    'bus.html',
    "  } else if(e.key==='Escape') hideSuggest();",
    "  } else if(e.key==='Escape'){ cancelGeocode(); hideSuggest(); }"
)
replace_once(
    'bus.html',
    "document.addEventListener('click', e=>{ if(!e.target.closest('.searchwrap')) hideSuggest(); });",
    "document.addEventListener('click', e=>{ if(!e.target.closest('.searchwrap')){ cancelGeocode(); hideSuggest(); } });"
)
replace_once(
    'bus.html',
    """async function geocode(q, asSuggest){
  const c = S.origin || {lat:52.509,lon:-2.087};
  const url = 'https://photon.komoot.io/api/?q='+encodeURIComponent(q)
            + '&limit=6&lang=en&lat='+c.lat+'&lon='+c.lon;
  try{
    const r = await fetch(url);
    if(!r.ok) throw new Error(r.status);
    const j = await r.json();
    const feats = (j.features||[]).filter(f=>f.geometry && f.geometry.coordinates);
    if(!feats.length){ if(!asSuggest) toast('No match for that address. Try a postcode.',true); hideSuggest(); return; }
    if(asSuggest){ renderSuggest(feats); }
    else { hideSuggest(); pickPlace(feats[0]); }
  }catch(err){
    hideSuggest();
    if(!asSuggest) toast('Address lookup failed — check your connection.',true);
  }
}
""",
    """async function geocode(q, asSuggest){
  const run=++geocodeRun;
  if(geocodeAbort) geocodeAbort.abort();
  const ctl=new AbortController(); geocodeAbort=ctl;
  const c = S.origin || {lat:52.509,lon:-2.087};
  const url = 'https://photon.komoot.io/api/?q='+encodeURIComponent(q)
            + '&limit=6&lang=en&countrycode=GB&bbox=-9,49,3,61&lat='+c.lat+'&lon='+c.lon;
  try{
    const r = await fetchTimed(url,{signal:ctl.signal},8000);
    if(run!==geocodeRun) return;
    if(!r.ok) throw new Error(r.status);
    const j = await r.json();
    if(run!==geocodeRun) return;
    const feats = (j.features||[]).filter(f=>f.geometry && f.geometry.coordinates);
    if(!feats.length){ if(!asSuggest) toast('No match for that address. Try a postcode.',true); hideSuggest(); return; }
    if(asSuggest){ renderSuggest(feats); }
    else { hideSuggest(); pickPlace(feats[0]); }
  }catch(err){
    if(run!==geocodeRun || (err&&err.name==='AbortError')) return;
    hideSuggest();
    if(!asSuggest) toast('Address lookup failed — check your connection.',true);
  }finally{
    if(run===geocodeRun) geocodeAbort=null;
  }
}
"""
)
replace_once(
    'bus.html',
    """function pickPlace(f){
  const [lon,lat]=f.geometry.coordinates;
""",
    """function pickPlace(f){
  cancelGeocode();
  const [lon,lat]=f.geometry.coordinates;
"""
)

replace_once(
    'bus.html',
    "Version 0.6.22 also removes the retired Cloudflare recorder controls and silent /history requests; the public Worker is now represented accurately as a live-feed proxy only.",
    "Version 0.6.23 also cancels obsolete address lookups and restricts Photon suggestions to Great Britain, preventing a slower earlier query or unsupported overseas result from replacing the user's latest search."
)

readme_marker = "Kerbside 0.6.22 removes the retired recorder/history client. The Settings button for copying `WATCHED_STOPS`, the silent `/history` request, its in-memory state and all call sites have been deleted because the live-only Worker exposes only `/`, `/feed` and `/health`. Local observed-arrival learning remains available in the browser, but the interface no longer implies that a Cloudflare recorder is active.\n"
readme_addition = readme_marker + "\nKerbside 0.6.23 makes address lookup race-safe and country-scoped. Each Photon request cancels the preceding request, stale responses are ignored by a sequence guard, and clicking away, pressing Escape or reducing the query below three characters also cancels pending work. Forward searches now include both `countrycode=GB` and the Great Britain bounding box, matching the app's timetable and BODS coverage.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.22'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.23'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.doesNotMatch(busSource, /WATCHED_STOPS/);",
    """assert.doesNotMatch(busSource, /WATCHED_STOPS/);
assert.match(busSource, /geocodeRun=0, geocodeAbort=null/);
assert.match(busSource, /countrycode=GB&bbox=-9,49,3,61/);
assert.match(busSource, /fetchTimed\\(url,\\{signal:ctl\\.signal\\},8000\\)/);
assert.match(busSource, /if\\(run!==geocodeRun\\) return/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.22'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.23'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.22', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.23', bods: true })"
)

print('Prepared Kerbside 0.6.23 race-safe Great Britain address search.')
