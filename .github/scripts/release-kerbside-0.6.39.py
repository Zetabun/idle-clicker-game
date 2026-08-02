from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


bus_path = 'bus.html'
bus = read(bus_path)
bus = replace_once(bus, "const APP_VERSION = '0.6.38';", "const APP_VERSION = '0.6.39';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.38 also prevents alphanumeric official stop codes from becoming invalid OpenStreetMap node queries and refreshes empty or low-confidence route lookups far sooner than verified stop mappings.",
    "Version 0.6.39 also preserves local timetable clock times across UK daylight-saving changes and applies calendar exceptions even when a GTFS service ID happens to resemble a seven-day binary mask.",
    'coverage release note'
)
bus = replace_once(
    bus,
    "const m=String(value||'').match(/^(\\d{1,2}):(\\d{2})/);",
    "const m=String(value||'').match(/^(\\d{1,3}):(\\d{2})/);",
    'extended GTFS hour parser'
)
old_service = """function serviceRuns(ref, serviceDate){
  if(!ref) return true;
  const day=(serviceDate.getDay()+6)%7;
  if(/^[01]{7}$/.test(String(ref))) return String(ref)[day]==='1';
  const svc=S.timetable && S.timetable.services && S.timetable.services[ref];
  if(!svc) return true;
  const key=ymd(serviceDate);
  if((svc.remove||[]).includes(key)) return false;
  if((svc.add||[]).includes(key)) return true;
  if(svc.start && key<svc.start) return false;
  if(svc.end && key>svc.end) return false;
  return !svc.days || String(svc.days)[day]==='1';
}
function activateTimetable(data,source,region){
"""
new_service = """function serviceDepartureTime(serviceDate,mins){
  const numeric=Number(mins);
  if(!isFinite(numeric)) return new Date(NaN);
  const total=Math.max(0,Math.floor(numeric));
  const dayOffset=Math.floor(total/1440), minuteOfDay=total%1440;
  const at=new Date(serviceDate);
  at.setDate(at.getDate()+dayOffset);
  at.setHours(Math.floor(minuteOfDay/60),minuteOfDay%60,0,0);
  return at;
}
function serviceRuns(ref, serviceDate){
  if(!ref) return true;
  const day=(serviceDate.getDay()+6)%7;
  const svc=S.timetable && S.timetable.services && S.timetable.services[ref];
  if(svc){
    const key=ymd(serviceDate);
    if((svc.remove||[]).includes(key)) return false;
    if((svc.add||[]).includes(key)) return true;
    if(svc.start && key<svc.start) return false;
    if(svc.end && key>svc.end) return false;
    return !svc.days || String(svc.days)[day]==='1';
  }
  // Regional legacy packs may store the seven weekday flags directly in
  // each departure. Only interpret a binary-looking value as that fallback
  // when it is not an actual service_id in the timetable service map.
  if(/^[01]{7}$/.test(String(ref))) return String(ref)[day]==='1';
  return true;
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),parseDepMinutes,serviceDepartureTime,serviceRuns};
}
function activateTimetable(data,source,region){
"""
bus = replace_once(bus, old_service, new_service, 'service calendar logic')
bus = replace_once(
    bus,
    "const at=new Date(serviceDate.getTime()+mins*60000);",
    "const at=serviceDepartureTime(serviceDate,mins);",
    'local service departure construction'
)
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.38"', '"version": "0.6.39"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.38'", "version: '0.6.39'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.38');", "assert.equal(body.version, '0.6.39');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.38'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.39'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /const MAPPED_TTL = 30\\*24\\*3600\\*1000/);",
    "assert.doesNotMatch(busSource, /const MAPPED_TTL = 30\\*24\\*3600\\*1000/);\nassert.match(busSource, /function serviceDepartureTime\\(serviceDate,mins\\)/);\nassert.match(busSource, /const svc=S\\.timetable && S\\.timetable\\.services && S\\.timetable\\.services\\[ref\\]/);\nassert.match(busSource, /if\\(svc\\)\\{/);\nassert.match(busSource, /at\\.setHours\\(Math\\.floor\\(minuteOfDay\\/60\\),minuteOfDay%60,0,0\\)/);\nassert.match(busSource, /serviceDepartureTime\\(serviceDate,mins\\)/);\nassert.doesNotMatch(busSource, /new Date\\(serviceDate\\.getTime\\(\\)\\+mins\\*60000\\)/);",
    'service time static checks'
)
browser_test = replace_once(
    browser_test,
    "const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });",
    "const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, timezoneId: 'Europe/London' });",
    'London browser timezone'
)
browser_test = replace_once(browser_test, "version: '0.6.38'", "version: '0.6.39'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.38')", "includes('app 0.6.39')", 'browser settings version')

calendar_test = r"""  const serviceCalendar = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,saved=state.timetable;
    state.timetable={services:{
      '1111100':{days:'1111100',start:'20260101',end:'20261231',add:['20260801'],remove:['20260803']}
    }};
    try{
      const spring=api.serviceDepartureTime(new Date(2026,2,29),180);
      const autumn=api.serviceDepartureTime(new Date(2026,9,25),180);
      const overnight=api.serviceDepartureTime(new Date(2026,7,2),1530);
      return {
        removedBinaryId:api.serviceRuns('1111100',new Date(2026,7,3)),
        addedBinaryId:api.serviceRuns('1111100',new Date(2026,7,1)),
        legacyMonday:api.serviceRuns('1000000',new Date(2026,7,3)),
        legacySaturday:api.serviceRuns('1000000',new Date(2026,7,1)),
        spring:[spring.getFullYear(),spring.getMonth()+1,spring.getDate(),spring.getHours(),spring.getMinutes()],
        autumn:[autumn.getFullYear(),autumn.getMonth()+1,autumn.getDate(),autumn.getHours(),autumn.getMinutes()],
        overnight:[overnight.getFullYear(),overnight.getMonth()+1,overnight.getDate(),overnight.getHours(),overnight.getMinutes()],
        extendedHours:api.parseDepMinutes('100:05')
      };
    }finally{state.timetable=saved;}
  });
  assert.deepEqual(serviceCalendar,{
    removedBinaryId:false,addedBinaryId:true,legacyMonday:true,legacySaturday:false,
    spring:[2026,3,29,3,0],autumn:[2026,10,25,3,0],overnight:[2026,8,3,1,30],extendedHours:6005
  });

"""
browser_test = replace_once(browser_test, "  const tripMatching = await page.evaluate(() => {", calendar_test + "  const tripMatching = await page.evaluate(() => {", 'executed service calendar fixtures')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.39 hardens service-calendar and overnight departure handling. A service reference is now resolved against the timetable `services` map before the legacy seven-bit weekday fallback, so a legitimate binary-looking GTFS `service_id` still honours date additions, removals and validity ranges. Departures are constructed by setting local calendar days and wall-clock hours rather than adding elapsed milliseconds to midnight, preventing one-hour shifts after the UK spring and autumn clock changes. The fallback parser now also accepts three-digit GTFS hours. WebKit runs in `Europe/London` and verifies both 2026 clock-change Sundays, a 25:30 overnight trip and binary-looking service exceptions.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.39 service calendar release')
