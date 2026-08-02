from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.28';", "const APP_VERSION = '0.6.29';")
replace_once('kerbside-backend/package.json', '"version": "0.6.28"', '"version": "0.6.29"')
replace_once('kerbside-backend/src/worker.js', "version: '0.6.28',", "version: '0.6.29',")
replace_once('kerbside-backend/test/worker.test.js', "assert.equal(body.version, '0.6.28');", "assert.equal(body.version, '0.6.29');")

replace_once(
    'bus.html',
    """function timetableRows(now){
  const stop=S.ttStop;
  if(!stop || !Array.isArray(stop.d)) return [];
  const out=[];
  const today=localMidnight(now||new Date());
  for(const offset of [-1,0,1]){
    const serviceDate=new Date(today); serviceDate.setDate(serviceDate.getDate()+offset);
    for(const e of stop.d){
      if(!Array.isArray(e) || e.length<3) continue;
      const mins=parseDepMinutes(e[0]); if(!isFinite(mins)) continue;
      const service=e[3]||'';
      if(!serviceRuns(service,serviceDate)) continue;
      const at=new Date(serviceDate.getTime()+mins*60000);
      out.push({at:at.getTime(), mins, line:cleanLine(e[1]), head:cleanName(e[2]||''), service, direction:e[4], trip:e[5]||'', pattern:e[6]||''});
    }
  }
  return out;
}
function timetableRouteSet(){
  const now=Date.now();
  return new Set(timetableRows(new Date(now)).filter(r=>r.at>now-4*3600000 && r.at<now+20*3600000).map(r=>String(r.line)));
}
""",
    """let TIMETABLE_ROWS_CACHE={stop:null,timetable:null,run:-1,day:'',rows:[],byLine:new Map()};
let TIMETABLE_ROUTE_CACHE={rows:null,minute:-1,set:new Set()};
function indexTimetableRows(rows){
  const byLine=new Map();
  for(const row of rows||[]){
    const line=String(row&&row.line||'');
    if(!byLine.has(line)) byLine.set(line,[]);
    byLine.get(line).push(row);
  }
  return byLine;
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),indexTimetableRows};
}
function timetableRows(now){
  const stop=S.ttStop;
  if(!stop || !Array.isArray(stop.d)) return [];
  const moment=now||new Date(), day=ymd(moment), cache=TIMETABLE_ROWS_CACHE;
  if(cache.stop===stop&&cache.timetable===S.timetable&&cache.run===S.timetableRun&&cache.day===day) return cache.rows;
  const out=[];
  const today=localMidnight(moment);
  for(const offset of [-1,0,1]){
    const serviceDate=new Date(today); serviceDate.setDate(serviceDate.getDate()+offset);
    for(const e of stop.d){
      if(!Array.isArray(e) || e.length<3) continue;
      const mins=parseDepMinutes(e[0]); if(!isFinite(mins)) continue;
      const service=e[3]||'';
      if(!serviceRuns(service,serviceDate)) continue;
      const at=new Date(serviceDate.getTime()+mins*60000);
      out.push({at:at.getTime(), mins, line:cleanLine(e[1]), head:cleanName(e[2]||''), service, direction:e[4], trip:e[5]||'', pattern:e[6]||''});
    }
  }
  TIMETABLE_ROWS_CACHE={stop,timetable:S.timetable,run:S.timetableRun,day,rows:out,byLine:indexTimetableRows(out)};
  TIMETABLE_ROUTE_CACHE={rows:null,minute:-1,set:new Set()};
  return out;
}
function timetableRowsForLine(line,now){
  const rows=timetableRows(now), cache=TIMETABLE_ROWS_CACHE;
  return cache.rows===rows?(cache.byLine.get(String(line))||[]):rows.filter(row=>String(row.line)===String(line));
}
function timetableRouteSet(){
  const now=Date.now(), rows=timetableRows(new Date(now)), minute=Math.floor(now/60000), cache=TIMETABLE_ROUTE_CACHE;
  if(cache.rows===rows&&cache.minute===minute) return cache.set;
  const set=new Set(rows.filter(r=>r.at>now-4*3600000&&r.at<now+20*3600000).map(r=>String(r.line)));
  TIMETABLE_ROUTE_CACHE={rows,minute,set}; return set;
}
"""
)
replace_once(
    'bus.html',
    "const ttRows=timetableRows(new Date()).filter(r=>String(r.line)===l);",
    "const ttRows=timetableRowsForLine(l,new Date());"
)
replace_once(
    'bus.html',
    """  let rows=timetableRows(new Date(now)).filter(r=>{
    if(String(r.line)!==String(line)) return false;
    if(r.at<now-3*60000 || r.at>now+3*3600000) return false;
""",
    """  let rows=timetableRowsForLine(line,new Date(now)).filter(r=>{
    if(r.at<now-3*60000 || r.at>now+3*3600000) return false;
"""
)

replace_once(
    'bus.html',
    "Version 0.6.28 also versions timetable tiles, departure shards and route-pattern requests with the active national build timestamp, and clears open-tab caches when that build changes.",
    "Version 0.6.29 also caches each selected stop's three-day timetable expansion, indexes it once by route, and reuses the active route set for the current minute to reduce repeated mobile CPU work."
)

readme_marker = "Kerbside 0.6.28 versions static timetable assets by the national manifest build timestamp. Tile, departure and route-pattern requests now receive a stable `v` query for the active build, while the manifest itself remains unversioned so it can update. When a forced manifest refresh detects a new build, the browser clears its in-memory tile, departure and pattern caches before using the new assets.\n"
readme_addition = readme_marker + "\nKerbside 0.6.29 caches expanded timetable rows per selected stop, timetable object, load run and local service day. The cached rows are indexed once by displayed line, while the active route set is reused for the current minute. Route evidence and scheduled ETA matching now read the line index instead of repeatedly expanding and scanning the full three-day timetable for every live vehicle.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.28'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.29'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /DATA_TILE_CACHE\\.clear\\(\\); DATA_DEPARTURE_CACHE\\.clear\\(\\); PATTERN_CACHE\\.clear\\(\\);/);",
    """assert.match(busSource, /DATA_TILE_CACHE\\.clear\\(\\); DATA_DEPARTURE_CACHE\\.clear\\(\\); PATTERN_CACHE\\.clear\\(\\);/);
assert.match(busSource, /function indexTimetableRows\\(rows\\)/);
assert.match(busSource, /function timetableRowsForLine\\(line,now\\)/);
assert.match(busSource, /TIMETABLE_ROUTE_CACHE=\\{rows,minute,set\\}/);
assert.doesNotMatch(busSource, /const ttRows=timetableRows\\(new Date\\(\\)\\)\\.filter/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    """  assert.equal(new URL(dataUrls.manifest).searchParams.has('v'), false);
  assert.equal(new URL(dataUrls.pattern).searchParams.get('v'), dataUrls.build);

  await page.locator('#setBtn').click();
""",
    """  assert.equal(new URL(dataUrls.manifest).searchParams.has('v'), false);
  assert.equal(new URL(dataUrls.pattern).searchParams.get('v'), dataUrls.build);
  const timetableIndex = await page.evaluate(() => {
    const index=window.__KERBSIDE_TEST__.indexTimetableRows([
      {line:'9',id:1},{line:'9',id:2},{line:'X8',id:3}
    ]);
    return {nine:index.get('9').length,x8:index.get('X8').length,missing:index.get('1')||null};
  });
  assert.deepEqual(timetableIndex, {nine:2,x8:1,missing:null});

  await page.locator('#setBtn').click();
"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.28'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.29'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.28', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.29', bods: true })"
)

print('Prepared Kerbside 0.6.29 timetable computation cache.')
