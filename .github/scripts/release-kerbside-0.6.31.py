from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.30';", "const APP_VERSION = '0.6.31';")
replace_once('kerbside-backend/package.json', '"version": "0.6.30"', '"version": "0.6.31"')
replace_once("kerbside-backend/src/worker.js", "version: '0.6.30',", "version: '0.6.31',")
replace_once("kerbside-backend/test/worker.test.js", "assert.equal(body.version, '0.6.30');", "assert.equal(body.version, '0.6.31');")

replace_once(
    'bus.html',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">'
)
replace_once(
    'bus.html',
    '#scrim{touch-action:none;overscroll-behavior:contain}',
    '#scrim{touch-action:pan-x pan-y pinch-zoom;overscroll-behavior:contain}'
)
replace_once(
    'bus.html',
    '''function gestureIsOnMap(target){
  const el=target&&target.nodeType===1?target:target&&target.parentElement;
  return !!(el&&el.closest&&el.closest('#map'));
}
function stopUiPinch(event){
  if(event.touches&&event.touches.length>1&&!gestureIsOnMap(event.target)) event.preventDefault();
}
document.addEventListener('touchmove',stopUiPinch,{passive:false});
['gesturestart','gesturechange'].forEach(type=>{
  document.addEventListener(type,event=>{
    if(!gestureIsOnMap(event.target)) event.preventDefault();
  },{passive:false});
});
''',
    '''// Browser page zoom remains available for accessibility. Mobile form
// controls stay at 16px below, avoiding Safari focus zoom without suppressing
// the user's own pinch-to-zoom gesture. Leaflet continues to own map gestures.
'''
)
replace_once(
    'bus.html',
    "Version 0.6.30 also keeps matched journey progress continuous through loops and crossing route shapes by combining GPS bearing with the vehicle's previous along-route position, preventing false passed-stop and next-stop jumps.",
    "Version 0.6.31 also restores browser page zoom for accessibility while retaining 16 px mobile form controls to prevent unwanted Safari focus zoom; Leaflet map gestures continue to work normally."
)

readme_marker = "Kerbside 0.6.30 makes route projection continuity-aware. At loops, overlapping roads and crossing shapes, candidate segments are ranked using GPS bearing plus the vehicle's previous along-route position. Large backward jumps and physically implausible forward jumps are penalised, while ordinary GPS jitter remains possible. Passed-stop, next-stop, route split and progress displays now share the same retained projection.\n"
readme_addition = readme_marker + "\nKerbside 0.6.31 restores browser page zoom for accessibility. The viewport no longer disables user scaling, Settings no longer blocks two-finger zoom, and the document-level gesture suppression has been removed. Mobile inputs and selects remain at 16px to prevent Safari's automatic focus zoom, while Leaflet continues to handle map pinch gestures.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.30'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.31'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /rollback>80/);",
    """assert.match(busSource, /rollback>80/);
assert.doesNotMatch(busSource, /user-scalable=no/);
assert.doesNotMatch(busSource, /maximum-scale=1/);
assert.match(busSource, /#scrim\\{touch-action:pan-x pan-y pinch-zoom/);
assert.doesNotMatch(busSource, /gesturestart/);
assert.doesNotMatch(busSource, /function stopUiPinch/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.30', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.31', bods: true })"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    """  assert.match(await page.title(), /Kerbside/i);
  assert.equal(await page.locator('#setBtn').isVisible(), true);

  const tripMatching = await page.evaluate(() => {
""",
    """  assert.match(await page.title(), /Kerbside/i);
  assert.equal(await page.locator('#setBtn').isVisible(), true);
  const viewportContent=await page.locator('meta[name="viewport"]').getAttribute('content');
  assert.match(viewportContent, /width=device-width/);
  assert.doesNotMatch(viewportContent, /user-scalable|maximum-scale/);
  const scrimTouchAction=await page.evaluate(() => getComputedStyle(document.getElementById('scrim')).touchAction);
  assert.match(scrimTouchAction, /pinch-zoom/);

  const tripMatching = await page.evaluate(() => {
"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.30'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.31'));"
)

print('Prepared Kerbside 0.6.31 accessible page zoom.')
