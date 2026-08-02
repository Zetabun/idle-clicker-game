from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.20';", "const APP_VERSION = '0.6.21';")
replace_once('kerbside-backend/package.json', '"version": "0.6.20"', '"version": "0.6.21"')
replace_once("kerbside-backend/src/worker.js", "version: '0.6.20',", "version: '0.6.21',")
replace_once("kerbside-backend/test/worker.test.js", "assert.equal(body.version, '0.6.20');", "assert.equal(body.version, '0.6.21');")

replace_once(
    'bus.html',
    """  S.origin={lat,lon,label:label||'Chosen point'};
  S.stop=null; S.ttStop=null; S.manualStop=false; S.destFilter=null; S.stops=[]; S.vehicles.clear(); clearVehicleMarkers(); routeLayer.clearLayers();
  savePrefs();
  drawOrigin();
""",
    """  S.origin={lat,lon,label:label||'Chosen point'};
  // Never let the previous town centre influence a new search while the
  // replacement anchor lookup is still running.
  S.anchor=null; drawAnchor(); updateDirLabels();
  S.stop=null; S.ttStop=null; S.manualStop=false; S.destFilter=null; S.stops=[]; S.vehicles.clear(); clearVehicleMarkers(); routeLayer.clearLayers();
  savePrefs();
  drawOrigin();
"""
)

replace_once(
    'bus.html',
    "Version 0.6.20 also keeps routine live GPS polling fixed to 9 km around the selected stop, so widening the stop-search radius no longer downloads a much larger BODS feed every fifteen seconds.",
    "Version 0.6.21 also clears the previous town anchor immediately when a new location is chosen, preventing old-area direction evidence from filtering buses while the new anchor lookup is still running."
)

readme_marker = "Kerbside 0.6.20 separates stop discovery from live-feed coverage. The selectable 800 m to 6 km radius controls which nearby stops are loaded, but routine BODS polling is now always the existing 9 km vehicle area around the selected stop. The deliberate 18 km exact-journey scan remains periodic. This prevents a 6 km stop-search setting from expanding every normal live request to roughly 15 km and reduces XML size, mobile parsing work and upstream traffic.\n"
readme_addition = readme_marker + "\nKerbside 0.6.21 resets location-dependent direction state immediately. Choosing a new address or device location now clears the previous town anchor before stops or live vehicles are loaded, so a slow place lookup cannot temporarily classify buses using the town centre from the user's former area. Inbound/outbound remains neutral until the new anchor resolves.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.20'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.21'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.doesNotMatch(busSource, /S\\.radius\\+MAX_VEH_DIST/);",
    """assert.doesNotMatch(busSource, /S\\.radius\\+MAX_VEH_DIST/);
assert.match(busSource, /S\\.anchor=null; drawAnchor\\(\\); updateDirLabels\\(\\);/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.20'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.21'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.20', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.21', bods: true })"
)

print('Prepared Kerbside 0.6.21 location-anchor reset.')
