from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.25';", "const APP_VERSION = '0.6.26';")
replace_once('kerbside-backend/package.json', '"version": "0.6.25"', '"version": "0.6.26"')
replace_once('kerbside-backend/src/worker.js', "version: '0.6.25',", "version: '0.6.26',")
replace_once('kerbside-backend/test/worker.test.js', "assert.equal(body.version, '0.6.25');", "assert.equal(body.version, '0.6.26');")

replace_once(
    'bus.html',
    """let ALARMS = [];   // {stopId, line, dest, lead, fired}
let audioCtx = null;

function alarmKey(stopId,line,dest){ return stopId+'|'+line+'|'+(dest||''); }
""",
    """const ALERT_MISSING_GRACE_MS = 120*1000;
let ALARMS = [];   // {stopId,line,dest,fired,vehicleId,lastSeenAt}
let audioCtx = null;

function alarmKey(stopId,line,dest){ return stopId+'|'+line+'|'+(dest||''); }
function retainFiredAlarm(alarm,now){
  return !!(alarm&&alarm.fired&&alarm.lastSeenAt&&now-alarm.lastSeenAt<=ALERT_MISSING_GRACE_MS);
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),retainFiredAlarm};
}
"""
)
replace_once(
    'bus.html',
    "ALARMS.push({k, stopId:S.stop.id, line, dest, fired:false});",
    "ALARMS.push({k, stopId:S.stop.id, line, dest, fired:false, vehicleId:null, lastSeenAt:0});"
)
replace_once(
    'bus.html',
    """function checkAlarms(rows){
  if(!ALARMS.length || !S.stop) return;
  const walk = S.walkSecs || 0;
  for(const a of ALARMS){
    if(a.stopId !== S.stop.id) continue;
    const hit = rows.find(r=>String(r.v.line)===String(a.line) && (!a.dest || r.v.dest===a.dest));
    if(!hit){ a.fired=false; a.vehicleId=null; continue; }
    const vehicleId=String(hit.v.journey||hit.v.id);
    if(a.vehicleId && a.vehicleId!==vehicleId){ a.fired=false; a.vehicleId=null; }
    const slack = hit.secs - walk;
    if(!a.fired && slack <= 60){
      a.fired = true; a.vehicleId=vehicleId;
""",
    """function checkAlarms(rows){
  if(!ALARMS.length || !S.stop) return;
  const walk = S.walkSecs || 0, now=Date.now();
  for(const a of ALARMS){
    if(a.stopId !== S.stop.id) continue;
    const hit = rows.find(r=>String(r.v.line)===String(a.line) && (!a.dest || r.v.dest===a.dest));
    if(!hit){
      if(retainFiredAlarm(a,now)) continue;
      a.fired=false; a.vehicleId=null; a.lastSeenAt=0; continue;
    }
    a.lastSeenAt=now;
    const vehicleId=String(hit.v.journey||hit.v.id);
    if(a.vehicleId && a.vehicleId!==vehicleId){ a.fired=false; a.vehicleId=null; }
    const slack = hit.secs - walk;
    if(!a.fired && slack <= 60){
      a.fired = true; a.vehicleId=vehicleId; a.lastSeenAt=now;
"""
)
replace_once(
    'bus.html',
    """    } else if(a.fired && slack > 300){
      a.fired=false; a.vehicleId=null;
    }
""",
    """    } else if(a.fired && slack > 300){
      a.fired=false; a.vehicleId=null; a.lastSeenAt=0;
    }
"""
)

replace_once(
    'bus.html',
    "Version 0.6.25 also preserves ambiguous `St` place-name abbreviations instead of expanding them blindly to `Street`, preventing destinations such as St Helens and Bury St Edmunds from being corrupted.",
    "Version 0.6.26 also keeps a fired leave alert through a brief two-minute missing-GPS gap, preventing the same bus from generating duplicate notifications when it disappears for one poll and returns."
)

readme_marker = "Kerbside 0.6.25 corrects ambiguous `St` name cleanup. The app no longer expands every standalone `St` token to `Street`; it keeps the readable abbreviation instead, preserving place names such as St Helens and Bury St Edmunds while still normalising unambiguous road suffixes.\n"
readme_addition = readme_marker + "\nKerbside 0.6.26 adds a leave-alert disappearance grace period. Once an alert has fired for a particular vehicle or journey, a missing live row is retained for up to two minutes rather than resetting immediately. The alert still resets for a genuinely different vehicle or after the grace period, preventing duplicate notifications caused by one missed GPS poll.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.25'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.26'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /if\\(bare==='st'\\) return 'St'/);",
    """assert.match(busSource, /if\\(bare==='st'\\) return 'St'/);
assert.match(busSource, /const ALERT_MISSING_GRACE_MS = 120\\*1000/);
assert.match(busSource, /function retainFiredAlarm\\(alarm,now\\)/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    """  assert.deepEqual(cleanedNames, ['St Helens', 'Bury St Edmunds', 'High St']);

  await page.locator('#setBtn').click();
""",
    """  assert.deepEqual(cleanedNames, ['St Helens', 'Bury St Edmunds', 'High St']);
  const alertGrace = await page.evaluate(() => {
    const retain=window.__KERBSIDE_TEST__.retainFiredAlarm;
    const alarm={fired:true,lastSeenAt:1000};
    return [retain(alarm,120999),retain(alarm,121001),retain({fired:false,lastSeenAt:1000},2000)];
  });
  assert.deepEqual(alertGrace, [true,false,false]);

  await page.locator('#setBtn').click();
"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.25'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.26'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.25', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.26', bods: true })"
)

print('Prepared Kerbside 0.6.26 leave-alert grace period.')
