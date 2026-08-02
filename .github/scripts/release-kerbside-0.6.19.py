from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.18';", "const APP_VERSION = '0.6.19';")
replace_once('kerbside-backend/package.json', '"version": "0.6.18"', '"version": "0.6.19"')
replace_once("kerbside-backend/src/worker.js", "version: '0.6.18',", "version: '0.6.19',")
replace_once("kerbside-backend/test/worker.test.js", "assert.equal(body.version, '0.6.18');", "assert.equal(body.version, '0.6.19');")

replace_once(
    'bus.html',
    """function compactTripRef(value){
  return String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
}
function meaningfulTripTokens(value){
  return String(value||'').trim().toLowerCase().split(/[^a-z0-9]+/)
    .filter(token=>token.length>=8 && /[a-z]/.test(token) && /[0-9]/.test(token));
}
function tripRefMatches(a,b){
  const A=String(a||'').trim(), B=String(b||'').trim();
  if(!A || !B) return false;
  if(A===B) return true;
  const compactA=compactTripRef(A), compactB=compactTripRef(B);
  if(!compactA || !compactB) return false;
  if(compactA===compactB) return true;
  const shorter=compactA.length<=compactB.length?compactA:compactB;
  const longer=shorter===compactA?compactB:compactA;
  if(shorter.length>=12 && (longer.startsWith(shorter) || longer.endsWith(shorter))) return true;
  const tokensA=meaningfulTripTokens(A), tokensB=new Set(meaningfulTripTokens(B));
  return tokensA.some(token=>tokensB.has(token));
}
""",
    """function compactTripRef(value){
  return String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
}
function meaningfulTripTokens(value){
  return String(value||'').trim().toLowerCase().split(/[^a-z0-9]+/)
    .filter(token=>token.length>=8 && /[a-z]/.test(token) && /[0-9]/.test(token));
}
function tripRefMatchStrength(a,b){
  const A=String(a||'').trim(), B=String(b||'').trim();
  if(!A || !B) return 0;
  if(A===B) return 4;
  const compactA=compactTripRef(A), compactB=compactTripRef(B);
  if(!compactA || !compactB) return 0;
  if(compactA===compactB) return 3;
  const shorter=compactA.length<=compactB.length?compactA:compactB;
  const longer=shorter===compactA?compactB:compactA;
  if(shorter.length>=12 && (longer.startsWith(shorter) || longer.endsWith(shorter))) return 2;
  const tokensA=meaningfulTripTokens(A), tokensB=new Set(meaningfulTripTokens(B));
  return tokensA.some(token=>tokensB.has(token))?1:0;
}
function tripRefMatches(a,b){ return tripRefMatchStrength(a,b)>0; }
function uniqueCompatibleTrips(items,journey,getRef){
  const refOf=typeof getRef==='function'?getRef:item=>item&&item.trip;
  const ranked=(Array.isArray(items)?items:[]).map(item=>{
    const ref=String(refOf(item)||'').trim();
    return {item,ref,strength:tripRefMatchStrength(ref,journey)};
  }).filter(match=>match.strength>0&&match.ref);
  if(!ranked.length) return {items:[],ref:'',strength:0,ambiguous:false};
  const strength=Math.max(...ranked.map(match=>match.strength));
  const strongest=ranked.filter(match=>match.strength===strength);
  const refs=[...new Set(strongest.map(match=>match.ref))];
  if(refs.length!==1) return {items:[],ref:'',strength,ambiguous:true};
  const ref=refs[0];
  return {items:strongest.filter(match=>match.ref===ref).map(match=>match.item),ref,strength,ambiguous:false};
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),tripRefMatchStrength,uniqueCompatibleTrips};
}
"""
)

replace_once(
    'bus.html',
    """      const matches=Object.keys(tt.tripPatterns).filter(ref=>tripRefMatches(ref,journeyKey));
      id=matches.length===1?tt.tripPatterns[matches[0]]:null;
""",
    """      const match=uniqueCompatibleTrips(Object.keys(tt.tripPatterns),journeyKey,ref=>ref);
      id=match.items.length?tt.tripPatterns[match.ref]:null;
"""
)

replace_once(
    'bus.html',
    """  const ttRows=timetableRows(new Date()).filter(r=>String(r.line)===l);
  if(journey && ttRows.some(r=>tripRefMatches(r.trip,journey))){
    const path=!!timetablePattern(journey);
    return {score:path?6:5,label:path?'journey and stop sequence matched':'journey matched to timetable',journeyMatch:true,pathMatch:path};
  }
  const tt=timetableRouteSet();
  if(tt.has(l)){
    const heads=ttRows.map(r=>r.head).filter(Boolean);
    const branchOk=!dest || !heads.length || heads.some(h=>destinationSimilarity(dest,h)>=.34);
    return {score:branchOk?4:2,label:branchOk?'timetable verified':'route verified; branch uncertain'};
  }
""",
    """  const ttRows=timetableRows(new Date()).filter(r=>String(r.line)===l);
  const tripMatch=journey?uniqueCompatibleTrips(ttRows,journey):{items:[],ref:'',strength:0,ambiguous:false};
  if(tripMatch.items.length){
    const path=!!timetablePattern(tripMatch.ref), literal=tripMatch.strength===4;
    return {
      score:path?6:5,
      label:path?(literal?'exact journey and stop sequence matched':'unique journey alias and stop sequence matched'):(literal?'exact journey matched to timetable':'unique journey alias matched to timetable'),
      journeyMatch:true,pathMatch:path,matchStrength:tripMatch.strength,matchedTrip:tripMatch.ref
    };
  }
  const tt=timetableRouteSet();
  if(tt.has(l)){
    const heads=ttRows.map(r=>r.head).filter(Boolean);
    const branchOk=!dest || !heads.length || heads.some(h=>destinationSimilarity(dest,h)>=.34);
    const label=tripMatch.ambiguous
      ? (branchOk?'route verified; journey alias ambiguous':'route verified; branch and journey uncertain')
      : (branchOk?'timetable verified':'route verified; branch uncertain');
    return {score:branchOk?4:2,label,journeyAmbiguous:tripMatch.ambiguous};
  }
"""
)

replace_once(
    'bus.html',
    """  const exact=journey ? rows.filter(r=>tripRefMatches(r.trip,journey)) : [];
  if(exact.length) rows=exact;
  return rows.sort((a,b)=>Math.abs(a.at-target)-Math.abs(b.at-target));
""",
    """  const tripMatch=journey?uniqueCompatibleTrips(rows,journey):{items:[],ambiguous:false};
  if(tripMatch.ambiguous) return [];
  if(tripMatch.items.length) rows=tripMatch.items;
  return rows.sort((a,b)=>Math.abs(a.at-target)-Math.abs(b.at-target));
"""
)

replace_once(
    'bus.html',
    """  if(schedule.trip && sameBranch.some(v=>tripRefMatches(schedule.trip,v.journey))) return 'GPS received · filtered';
  return 'journey uncertain';
""",
    """  const liveTrip=schedule.trip?uniqueCompatibleTrips(sameBranch,schedule.trip,v=>v.journey):{items:[],ambiguous:false};
  if(liveTrip.items.length) return 'GPS received · filtered';
  if(liveTrip.ambiguous) return 'possible GPS match ambiguous';
  return 'journey uncertain';
"""
)

replace_once(
    'bus.html',
    "const match=geometry?'journey path':evidence.journeyMatch?'exact journey':scheduleBacked?'timetable linked':'route evidence';",
    "const match=geometry?'journey path':evidence.journeyMatch?(evidence.matchStrength===4?'exact journey':'unique journey alias'):scheduleBacked?'timetable linked':'route evidence';"
)

replace_once(
    'bus.html',
    "Version 0.6.18 also makes the live Worker cache-first: a recent cached feed is returned within the browser deadline while slow BODS refreshes continue safely, instead of waiting through several long upstream attempts.",
    "Version 0.6.19 also requires fuzzy live and timetable trip references to resolve to one uniquely strongest journey before they receive exact-journey matching privileges."
)

readme_marker = "Kerbside 0.6.18 makes the live Worker cache-first and deadline-safe. Very recent cached responses are returned without another upstream call. For older cached positions, the Worker gives BODS a short opportunity to refresh, then returns the cache immediately and completes the refresh with `waitUntil`. Uncached requests use at most two four-second attempts, keeping the Worker within the browser's twelve-second request deadline. Cache keys now include optional `lineRef`, and Worker tests cover fresh cache hits, stale background refresh and bounded outages.\n"
readme_addition = readme_marker + "\nKerbside 0.6.19 makes compatible journey-reference matching uniqueness-safe. Literal, compact, prefix/suffix and shared-token matches are ranked; only one uniquely strongest timetable trip may receive exact-journey privileges, distant-bus admission or exact pattern geometry. Ambiguous aliases fall back to route-level evidence, are excluded from timetable ETA blending, and are reported explicitly. The WebKit regression suite now executes the matching helpers with exact, compact, unique-alias and ambiguous fixtures instead of checking source strings alone.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.18'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.19'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /function meaningfulTripTokens\\(value\\)/);",
    """assert.match(busSource, /function meaningfulTripTokens\\(value\\)/);
assert.match(busSource, /function tripRefMatchStrength\\(a,b\\)/);
assert.match(busSource, /function uniqueCompatibleTrips\\(items,journey,getRef\\)/);
assert.match(busSource, /possible GPS match ambiguous/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    """  assert.match(await page.title(), /Kerbside/i);
  assert.equal(await page.locator('#setBtn').isVisible(), true);

  await page.locator('#setBtn').click();
""",
    """  assert.match(await page.title(), /Kerbside/i);
  assert.equal(await page.locator('#setBtn').isVisible(), true);

  const tripMatching = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__;
    const unique=api.uniqueCompatibleTrips([{trip:'trip-AB12345678'},{trip:'unrelated-XY87654321'}],'operator:trip-AB12345678');
    const ambiguous=api.uniqueCompatibleTrips([{trip:'one|AB12345678'},{trip:'two|AB12345678'}],'live|AB12345678|x');
    return {
      exact:api.tripRefMatchStrength('trip-AB12345678','trip-AB12345678'),
      compact:api.tripRefMatchStrength('Trip-AB12345678','trip_AB12345678'),
      uniqueRef:unique.ref, uniqueStrength:unique.strength, uniqueCount:unique.items.length,
      ambiguous:ambiguous.ambiguous, ambiguousCount:ambiguous.items.length
    };
  });
  assert.deepEqual(tripMatching, {
    exact:4, compact:3,
    uniqueRef:'trip-AB12345678', uniqueStrength:2, uniqueCount:1,
    ambiguous:true, ambiguousCount:0
  });

  await page.locator('#setBtn').click();
"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.18'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.19'));"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.18', bods: true })",
    "body: JSON.stringify({ ok: true, service: 'kerbside-live', role: 'live-only', version: '0.6.19', bods: true })"
)

print('Prepared Kerbside 0.6.19 uniqueness-safe trip matching.')
