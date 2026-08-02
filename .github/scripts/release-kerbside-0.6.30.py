from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


def replace_count(path, old, new, expected):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} occurrences, found {count}')
    file.write_text(text.replace(old, new), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.29';", "const APP_VERSION = '0.6.30';")
replace_once('kerbside-backend/package.json', '"version": "0.6.29"', '"version": "0.6.30"')
replace_once("kerbside-backend/src/worker.js", "version: '0.6.29',", "version: '0.6.30',")
replace_once("kerbside-backend/test/worker.test.js", "assert.equal(body.version, '0.6.29');", "assert.equal(body.version, '0.6.30');")

replace_once(
    'bus.html',
    "Version 0.6.29 also caches each selected stop's three-day timetable expansion, indexes it once by route, and reuses the active route set for the current minute to reduce repeated mobile CPU work.",
    "Version 0.6.30 also keeps matched journey progress continuous through loops and crossing route shapes by combining GPS bearing with the vehicle's previous along-route position, preventing false passed-stop and next-stop jumps."
)

old_projection = '''function projectToPattern(points,lat,lon,minSegment){
  const metrics=patternMetrics(points); let best=null;
  const start=Math.max(0,Math.min(points.length-2,Number(minSegment)||0));
  for(let i=start;i<points.length-1;i++){
    const a=points[i], b=points[i+1], seg=metrics.lengths[i];
    if(!isFinite(seg) || seg<1) continue;
    const scaleX=111320*Math.cos(rad((a.lat+b.lat+lat)/3));
    const dx=(b.lon-a.lon)*scaleX, dy=(b.lat-a.lat)*111320;
    const px=(lon-a.lon)*scaleX, py=(lat-a.lat)*111320;
    const denom=dx*dx+dy*dy;
    const t=denom?Math.max(0,Math.min(1,(px*dx+py*dy)/denom)):0;
    const metres=Math.hypot(px-dx*t,py-dy*t);
    if(!best || metres<best.metres) best={metres,along:metrics.starts[i]+seg*t,segment:i,t};
  }
  return best ? {...best,total:metrics.total} : null;
}
'''
new_projection = '''function patternProjectionCandidates(points,lat,lon,minSegment){
  const metrics=patternMetrics(points), candidates=[];
  const start=Math.max(0,Math.min(points.length-2,Number(minSegment)||0));
  for(let i=start;i<points.length-1;i++){
    const a=points[i], b=points[i+1], seg=metrics.lengths[i];
    if(!isFinite(seg) || seg<1) continue;
    const scaleX=111320*Math.cos(rad((a.lat+b.lat+lat)/3));
    const dx=(b.lon-a.lon)*scaleX, dy=(b.lat-a.lat)*111320;
    const px=(lon-a.lon)*scaleX, py=(lat-a.lat)*111320;
    const denom=dx*dx+dy*dy;
    const t=denom?Math.max(0,Math.min(1,(px*dx+py*dy)/denom)):0;
    candidates.push({
      metres:Math.hypot(px-dx*t,py-dy*t),
      along:metrics.starts[i]+seg*t,segment:i,t,total:metrics.total,
      heading:bearingTo(a.lat,a.lon,b.lat,b.lon)
    });
  }
  return candidates;
}
function headingDifference(a,b){
  if(!isFinite(a)||!isFinite(b)) return 0;
  return Math.abs(((a-b+540)%360)-180);
}
function choosePatternProjection(candidates,options){
  const list=Array.isArray(candidates)?candidates:[], o=options||{};
  if(!list.length) return null;
  const previous=o.previous&&isFinite(o.previous.along)?o.previous:null;
  const elapsed=previous&&isFinite(o.ts)&&isFinite(previous.ts)?Math.max(0,(o.ts-previous.ts)/1000):0;
  const ground=Math.max(0,Number(o.groundMovement)||0);
  const maxForward=Math.max(500,elapsed*32+350);
  const expected=previous?previous.along+Math.min(maxForward,ground):0;
  const ranked=list.map(candidate=>{
    let score=candidate.metres;
    if(isFinite(o.bearing)) score+=Math.max(0,headingDifference(candidate.heading,o.bearing)-25)*1.4;
    if(previous){
      const rollback=previous.along-candidate.along;
      if(rollback>80) score+=900+(rollback-80)*1.5;
      const forward=candidate.along-previous.along;
      if(forward>maxForward) score+=(forward-maxForward)*1.2;
      score+=Math.min(500,Math.abs(candidate.along-expected)*.08);
    }
    return {...candidate,score};
  });
  ranked.sort((a,b)=>a.score-b.score||a.metres-b.metres||(previous?Math.abs(a.along-previous.along)-Math.abs(b.along-previous.along):a.along-b.along));
  const best=ranked[0];
  return {metres:best.metres,along:best.along,segment:best.segment,t:best.t,total:best.total};
}
function projectToPattern(points,lat,lon,minSegment){
  return choosePatternProjection(patternProjectionCandidates(points,lat,lon,minSegment));
}
function projectVehicleToPattern(pattern,v){
  if(!pattern||!v) return null;
  const previous=v.routeProjection&&v.routeProjection.patternId===pattern.id?v.routeProjection:null;
  const ground=previous?dist(previous.lat,previous.lon,v.lat,v.lon):0;
  const best=choosePatternProjection(patternProjectionCandidates(pattern.points,v.lat,v.lon),{
    bearing:Number(v.bearing), previous, ts:Number(v.ts), groundMovement:ground
  });
  if(best&&best.metres<=900&&(!previous||!isFinite(previous.ts)||Number(v.ts)>=previous.ts)){
    v.routeProjection={patternId:pattern.id,along:best.along,segment:best.segment,t:best.t,ts:Number(v.ts),lat:v.lat,lon:v.lon};
  }
  return best;
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),patternProjectionCandidates,choosePatternProjection};
}
'''
replace_once('bus.html', old_projection, new_projection)
replace_count('bus.html', 'const vehicle=projectToPattern(pattern.points,v.lat,v.lon);', 'const vehicle=projectVehicleToPattern(pattern,v);', 2)

readme_marker = "Kerbside 0.6.29 caches expanded timetable rows per selected stop, timetable object, load run and local service day. The cached rows are indexed once by displayed line, while the active route set is reused for the current minute. Route evidence and scheduled ETA matching now read the line index instead of repeatedly expanding and scanning the full three-day timetable for every live vehicle.\n"
readme_addition = readme_marker + "\nKerbside 0.6.30 makes route projection continuity-aware. At loops, overlapping roads and crossing shapes, candidate segments are ranked using GPS bearing plus the vehicle's previous along-route position. Large backward jumps and physically implausible forward jumps are penalised, while ordinary GPS jitter remains possible. Passed-stop, next-stop, route split and progress displays now share the same retained projection.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.29'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.30'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.doesNotMatch(busSource, /const ttRows=timetableRows\\(new Date\\(\\)\\)\\.filter/);",
    """assert.doesNotMatch(busSource, /const ttRows=timetableRows\\(new Date\\(\\)\\)\\.filter/);
assert.match(busSource, /function patternProjectionCandidates\\(points,lat,lon,minSegment\\)/);
assert.match(busSource, /function choosePatternProjection\\(candidates,options\\)/);
assert.match(busSource, /function projectVehicleToPattern\\(pattern,v\\)/);
assert.match(busSource, /rollback>80/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.29', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.30', bods: true })"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    """  assert.deepEqual(timetableIndex, {nine:2,x8:1,missing:null});

  await page.locator('#setBtn').click();
""",
    """  assert.deepEqual(timetableIndex, {nine:2,x8:1,missing:null});
  const routeProjection = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__;
    const points=[
      {lat:0,lon:-.01},{lat:0,lon:.01},{lat:.01,lon:.01},
      {lat:-.01,lon:0},{lat:.01,lon:0}
    ];
    const candidates=api.patternProjectionCandidates(points,0,0);
    const east=api.choosePatternProjection(candidates,{bearing:90,ts:2000});
    const north=api.choosePatternProjection(candidates,{bearing:0,ts:2000});
    const continuous=api.choosePatternProjection(candidates,{previous:{along:north.along-10,ts:1000},ts:2000,groundMovement:12});
    return {east:east.segment,north:north.segment,continuous:continuous.segment,forward:continuous.along>=north.along-80};
  });
  assert.deepEqual(routeProjection, {east:0,north:3,continuous:3,forward:true});

  await page.locator('#setBtn').click();
"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.29'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.30'));"
)

print('Prepared Kerbside 0.6.30 continuity-aware route projection.')
