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
bus = replace_once(bus, "const APP_VERSION = '0.6.39';", "const APP_VERSION = '0.6.40';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.39 also preserves local timetable clock times across UK daylight-saving changes and applies calendar exceptions even when a GTFS service ID happens to resemble a seven-day binary mask.",
    "Version 0.6.40 also generates the displayed three-day timetable window from each departure's actual arrival date, keeping extreme GTFS hours such as 100:05 on the correct day and service calendar.",
    'coverage release note'
)
bus = replace_once(
    bus,
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),indexTimetableRows};",
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),indexTimetableRows,timetableRows};",
    'timetableRows test exposure'
)
old_rows = """  const out=[];
  const today=localMidnight(moment);
  for(const offset of [-1,0,1]){
    const serviceDate=new Date(today); serviceDate.setDate(serviceDate.getDate()+offset);
    for(const e of stop.d){
      if(!Array.isArray(e) || e.length<3) continue;
      const mins=parseDepMinutes(e[0]); if(!isFinite(mins)) continue;
      const service=e[3]||'';
      if(!serviceRuns(service,serviceDate)) continue;
      const at=serviceDepartureTime(serviceDate,mins);
      out.push({at:at.getTime(), mins, line:cleanLine(e[1]), head:cleanName(e[2]||''), service, direction:e[4], trip:e[5]||'', pattern:e[6]||''});
    }
  }
"""
new_rows = """  const out=[];
  const today=localMidnight(moment);
  for(const e of stop.d){
    if(!Array.isArray(e) || e.length<3) continue;
    const mins=parseDepMinutes(e[0]); if(!isFinite(mins)) continue;
    const service=e[3]||'', departureDayOffset=Math.floor(mins/1440);
    // Build rows by the calendar day on which the departure is shown. GTFS
    // times above 24:00 belong to an earlier service day, so derive that
    // origin date before applying weekday and calendar exception rules.
    for(const targetOffset of [-1,0,1]){
      const serviceDate=new Date(today);
      serviceDate.setDate(serviceDate.getDate()+targetOffset-departureDayOffset);
      if(!serviceRuns(service,serviceDate)) continue;
      const at=serviceDepartureTime(serviceDate,mins);
      out.push({at:at.getTime(), mins, line:cleanLine(e[1]), head:cleanName(e[2]||''), service, direction:e[4], trip:e[5]||'', pattern:e[6]||''});
    }
  }
"""
bus = replace_once(bus, old_rows, new_rows, 'target-day timetable generation')
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.39"', '"version": "0.6.40"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.39'", "version: '0.6.40'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.39');", "assert.equal(body.version, '0.6.40');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.39'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.40'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /new Date\\(serviceDate\\.getTime\\(\\)\\+mins\\*60000\\)/);",
    "assert.doesNotMatch(busSource, /new Date\\(serviceDate\\.getTime\\(\\)\\+mins\\*60000\\)/);\nassert.match(busSource, /departureDayOffset=Math\\.floor\\(mins\\/1440\\)/);\nassert.match(busSource, /targetOffset-departureDayOffset/);\nassert.match(busSource, /indexTimetableRows,timetableRows/);\nassert.doesNotMatch(busSource, /for\\(const offset of \\[-1,0,1\\]\\)\\{\\n    const serviceDate/);",
    'target-day static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.39'", "version: '0.6.40'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.39')", "includes('app 0.6.40')", 'browser settings version')

target_test = r"""  const targetDayRows = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState;
    const saved={ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun};
    state.ttStop={id:'target-day-test',d:[
      ['23:55','L23','Late','daily','','trip-23',''],
      ['25:30','N25','Overnight','daily','','trip-25',''],
      ['100:05','X100','Extended','extreme','','trip-100','']
    ]};
    state.timetable={services:{
      daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]},
      extreme:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:['20260730']}
    }};
    state.timetableRun=Number(state.timetableRun||0)+1;
    try{
      const rows=api.timetableRows(new Date(2026,7,3,12,0));
      const summary=trip=>rows.filter(row=>row.trip===trip).sort((a,b)=>a.at-b.at).map(row=>{
        const at=new Date(row.at);
        return [at.getFullYear(),at.getMonth()+1,at.getDate(),at.getHours(),at.getMinutes()];
      });
      return {late:summary('trip-23'),overnight:summary('trip-25'),extended:summary('trip-100')};
    }finally{
      state.ttStop=saved.ttStop;state.timetable=saved.timetable;state.timetableRun=saved.timetableRun;
    }
  });
  assert.deepEqual(targetDayRows,{
    late:[[2026,8,2,23,55],[2026,8,3,23,55],[2026,8,4,23,55]],
    overnight:[[2026,8,2,1,30],[2026,8,3,1,30],[2026,8,4,1,30]],
    extended:[[2026,8,2,4,5],[2026,8,4,4,5]]
  });

"""
browser_test = replace_once(browser_test, "  const tripMatching = await page.evaluate(() => {", target_test + "  const tripMatching = await page.evaluate(() => {", 'executed target-day fixtures')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.40 generates timetable rows by their displayed target date rather than by a fixed set of nearby origin service dates. For each GTFS departure, the browser subtracts the number of whole days encoded in its extended hour before applying weekday and calendar-exception rules. This keeps ordinary, 25:30 and even 100:05 departures within the same yesterday/today/tomorrow board window while associating them with the correct originating service day. WebKit verifies all three time forms and confirms that a removed July 30 service suppresses only its August 3 100:05 departure.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.40 target-day timetable release')
