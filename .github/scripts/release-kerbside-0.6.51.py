from pathlib import Path
import re

OLD = "0.6.50"
NEW = "0.6.51"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def insert_before(text, marker, addition, label):
    return replace_once(text, marker, addition + marker, label)


bus = read("bus.html")
bus = replace_once(bus, f"const APP_VERSION = '{OLD}';", f"const APP_VERSION = '{NEW}';", "browser version")
bus = replace_once(
    bus,
    "feedStale:0, feedUnknownAge:0, feedEmptyReason:'', workerOk:null, workerVersion:'', workerBods:false, liveDiag:null,",
    "feedStale:0, feedUnknownAge:0, feedEmptyReason:'', feedPartial:false, workerOk:null, workerVersion:'', workerBods:false, liveDiag:null,",
    "partial-feed state",
)
bus = replace_once(
    bus,
    "function vehicleJourneyRef(v){ return String(v&&(v.corridorTrip||v.journey)||''); }",
    "function vehicleJourneyRef(v){ return String(v&&((v.corridorTracked&&v.corridorTrip)||v.journey)||''); }",
    "active corridor journey identity",
)

bus = insert_before(
    bus,
    "function ingest(list){",
    """function mergeOlderVehicleEvidence(rec,v,now){
  const sameJourney=!rec.journey||!v.journey||rec.journey===v.journey;
  if(v.corridorTracked&&sameJourney&&v.corridorTrip){
    rec.corridorTrip=v.corridorTrip;
    rec.corridorRemaining=v.corridorRemaining;
    rec.corridorConfirmedAt=Number(v.corridorConfirmedAt)||now;
    rec.corridorTracked=true;
  }
}
""",
    "older observation evidence helper",
)
bus = replace_once(
    bus,
    """    const prev = S.vehicles.get(v.id);
    const rec = prev || {hist:[], speed:null, cadence:null};
    if(prev && v.ts>prev.ts){""",
    """    const prev = S.vehicles.get(v.id);
    const rec = prev || {hist:[], speed:null, cadence:null};
    if(prev && Number(v.ts)<Number(prev.ts)){
      mergeOlderVehicleEvidence(prev,v,now);
      continue;
    }
    if(prev && v.ts>prev.ts){""",
    "monotonic GPS ingestion",
)
bus = replace_once(
    bus,
    """    const keepCorridor=!!(prev&&!v.corridorTracked&&sameJourney&&prev.corridorTrip&&now-Number(prev.corridorConfirmedAt||0)<=CORRIDOR_TAG_GRACE_MS);
    const corridor=keepCorridor?{trip:prev.corridorTrip,remaining:prev.corridorRemaining,at:prev.corridorConfirmedAt}:null;
    if(prev&&prev.journey&&v.journey&&prev.journey!==v.journey){ delete rec.routeProjection; delete rec.corridorTrip; delete rec.corridorRemaining; delete rec.corridorConfirmedAt; }
    Object.assign(rec, v);
    if(corridor){ rec.corridorTrip=corridor.trip; rec.corridorRemaining=corridor.remaining; rec.corridorConfirmedAt=corridor.at; rec.corridorTracked=true; }""",
    """    const keepCorridor=!!(prev&&!v.corridorTracked&&sameJourney&&prev.corridorTrip&&now-Number(prev.corridorConfirmedAt||0)<=CORRIDOR_TAG_GRACE_MS);
    const corridorExpired=!!(prev&&!v.corridorTracked&&sameJourney&&prev.corridorTrip&&!keepCorridor);
    const corridor=keepCorridor?{trip:prev.corridorTrip,remaining:prev.corridorRemaining,at:prev.corridorConfirmedAt}:null;
    if(prev&&prev.journey&&v.journey&&prev.journey!==v.journey){ delete rec.routeProjection; delete rec.corridorTrip; delete rec.corridorRemaining; delete rec.corridorConfirmedAt; }
    Object.assign(rec, v);
    if(corridor){ rec.corridorTrip=corridor.trip; rec.corridorRemaining=corridor.remaining; rec.corridorConfirmedAt=corridor.at; rec.corridorTracked=true; }
    else if(corridorExpired){ delete rec.corridorTrip; delete rec.corridorRemaining; delete rec.corridorConfirmedAt; rec.corridorTracked=false; }""",
    "corridor grace expiry",
)

bus = insert_before(
    bus,
    "function relevant(){",
    """function retainedSnapshotRow(v,now=Date.now()){
  if(!v||!v.lastShownSnapshot||!S.stop) return null;
  if(v.lastShownStopId!==String(S.stop.id)) return null;
  if(v.lastShownBoardDir!==S.dir) return null;
  if(String(v.lastShownDestFilter||'')!==String(S.destFilter||'')) return null;
  if(now-Number(v.lastShownAt||0)>GPS_RESULT_GRACE_MS) return null;
  if(Number(v.lastShownArrivalAt||0)<now-3*60000) return null;
  return {...v.lastShownSnapshot,v,secs:Math.max(0,(v.lastShownArrivalAt-now)/1000),gpsLost:true,confidence:'low',recovered:false};
}
""",
    "snapshot context helper",
)
bus = replace_once(
    bus,
    """    if(age>MAX_AGE_MS){
      const held=v.lastShownSnapshot&&v.lastShownStopId===String(S.stop.id)&&now-Number(v.lastShownAt||0)<=GPS_RESULT_GRACE_MS&&Number(v.lastShownArrivalAt||0)>=now-3*60000;
      if(held){ out.push({...v.lastShownSnapshot,v,secs:Math.max(0,(v.lastShownArrivalAt-now)/1000),gpsLost:true,confidence:'low',recovered:false}); }
      else rejectLive(diagnostics,'stale');
      continue;
    }""",
    """    if(age>MAX_AGE_MS){
      const held=retainedSnapshotRow(v,now);
      if(held) out.push(held);
      else rejectLive(diagnostics,'stale');
      continue;
    }""",
    "context-safe lost GPS retention",
)
bus = replace_once(
    bus,
    """    const scheduleBacked=!!(est.schedule && evidence.score>=4);
    const trustedJourney=!!(evidence.journeyMatch || geometry);
    const scheduledDir=scheduledJourneyDirection(est.schedule);
    const candidateDest=v.dest || (est.schedule&&est.schedule.head) || '';""",
    """    const scheduleBacked=!!(est.schedule && evidence.score>=4);
    const trustedJourney=!!(evidence.journeyMatch || geometry);
    const directionSchedule=est.schedule||matchedRow;
    const scheduledDir=scheduledJourneyDirection(directionSchedule);
    const candidateDest=v.dest || (directionSchedule&&directionSchedule.head) || '';""",
    "matched-journey direction fallback",
)
bus = replace_once(
    bus,
    """    v.lastShownStopId=String(S.stop.id); v.lastShownAt=now; v.lastShownArrivalAt=now+Math.max(0,row.secs)*1000;
    v.lastShownSnapshot={...row,v:null};""",
    """    v.lastShownStopId=String(S.stop.id); v.lastShownAt=now; v.lastShownArrivalAt=now+Math.max(0,row.secs)*1000;
    v.lastShownBoardDir=S.dir; v.lastShownDestFilter=String(S.destFilter||'');
    v.lastShownSnapshot={...row,v:null};""",
    "snapshot board context",
)
bus = replace_once(
    bus,
    """    for(const vehicle of S.vehicles.values()){ delete vehicle.lastShownSnapshot; delete vehicle.lastShownStopId; delete vehicle.lastShownAt; delete vehicle.lastShownArrivalAt; delete vehicle.corridorTrip; delete vehicle.corridorRemaining; delete vehicle.corridorConfirmedAt; vehicle.corridorTracked=false; }""",
    """    for(const vehicle of S.vehicles.values()){ delete vehicle.lastShownSnapshot; delete vehicle.lastShownStopId; delete vehicle.lastShownAt; delete vehicle.lastShownArrivalAt; delete vehicle.lastShownBoardDir; delete vehicle.lastShownDestFilter; delete vehicle.corridorTrip; delete vehicle.corridorRemaining; delete vehicle.corridorConfirmedAt; vehicle.corridorTracked=false; }""",
    "stop-change snapshot cleanup",
)

bus = replace_once(
    bus,
    """function retainFiredAlarm(alarm,now){
  return !!(alarm&&alarm.fired&&alarm.lastSeenAt&&now-alarm.lastSeenAt<=ALERT_MISSING_GRACE_MS);
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),retainFiredAlarm};
}""",
    """function retainFiredAlarm(alarm,now){
  return !!(alarm&&alarm.fired&&alarm.lastSeenAt&&now-alarm.lastSeenAt<=ALERT_MISSING_GRACE_MS);
}
function alarmRowEligible(row){ return !!(row&&!row.gpsLost); }
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),retainFiredAlarm,alarmRowEligible,retainedSnapshotRow,scheduleClaimedByLive,scheduledBoardRows};
}""",
    "alarm and board test exports",
)
bus = replace_once(
    bus,
    """    const hit = rows.find(r=>String(r.v.line)===String(a.line) && (!a.dest || r.v.dest===a.dest));""",
    """    const hit = rows.find(r=>alarmRowEligible(r) && String(r.v.line)===String(a.line) && (!a.dest || r.v.dest===a.dest));""",
    "lost GPS alarm exclusion",
)

bus = insert_before(
    bus,
    "function scheduledBoardRows(liveRows){",
    """function scheduleClaimedByLive(row){ return !!(row&&row.schedule&&!row.gpsLost); }
""",
    "scheduled claim helper",
)
bus = replace_once(
    bus,
    """  liveRows.forEach(r=>{ if(r.schedule) claimed.add(scheduleKey(r.schedule)); });""",
    """  liveRows.forEach(r=>{ if(scheduleClaimedByLive(r)) claimed.add(scheduleKey(r.schedule)); });""",
    "lost GPS scheduled-row release",
)
bus = replace_once(
    bus,
    """function liveTimingLabel(r){
  if(!r.schedule) return '';""",
    """function liveTimingLabel(r){
  if(r.gpsLost||!r.schedule) return '';""",
    "lost GPS timing label",
)

bus = replace_once(
    bus,
    """function lineDetail(r){
  const v=r.v;
  const speed=""",
    """function lineDetail(r){
  const v=r.v;
  const progressHtml=r.gpsLost
    ? '<div class=\"journey-progress journey-progress-unavailable\"><b>Journey progress paused.</b> Kerbside is holding the last confirmed position until fresh GPS returns.</div>'
    : journeyProgressHtml(v);
  const speed=""",
    "lost GPS progress pause",
)
bus = replace_once(
    bus,
    """  return '<div class=\"detail\">'+journeyProgressHtml(v)+times
    +'<div class=\"dfacts\">'+facts.map(([k,val])=>'<div><span class=\"dk\">'+esc(k)+'</span><span class=\"dv\">'+esc(val)+'</span></div>').join('')+'</div>'
    +'<div class=\"dnote\">ETA is calculated from the fresh vehicle position, movement towards this stop, locally observed speed and '
    +(r.geometry?'the matched journey geometry':'route factor')
    +(r.schedule?', then checked against the timetable':'')+'. It is an estimate, not an operator prediction.'
    +(v.origin?' Running '+esc(v.origin)+' to '+esc(v.dest||'?')+(v.operator?' · '+esc(v.operator):'')+'.':'')+'</div></div>';""",
    """  const note=r.gpsLost
    ? 'This row is held at the last confirmed GPS position. Its countdown, journey progress and leave alert are paused until a fresh position arrives.'
    : 'ETA is calculated from the fresh vehicle position, movement towards this stop, locally observed speed and '
      +(r.geometry?'the matched journey geometry':'route factor')
      +(r.schedule?', then checked against the timetable':'')+'. It is an estimate, not an operator prediction.';
  return '<div class=\"detail\">'+progressHtml+times
    +'<div class=\"dfacts\">'+facts.map(([k,val])=>'<div><span class=\"dk\">'+esc(k)+'</span><span class=\"dv\">'+esc(val)+'</span></div>').join('')+'</div>'
    +'<div class=\"dnote\">'+note
    +(v.origin?' Running '+esc(v.origin)+' to '+esc(v.dest||'?')+(v.operator?' · '+esc(v.operator):'')+'.':'')+'</div></div>';""",
    "lost GPS detail note",
)
bus = replace_once(
    bus,
    """      const tight=S.walkSecs>90 && r.secs<S.walkSecs-30;""",
    """      const tight=!gpsLost&&S.walkSecs>90 && r.secs<S.walkSecs-30;""",
    "lost GPS tight warning",
)
bus = replace_once(
    bus,
    """+(r.schedule?'<span class=\"chip timing\">'+esc(liveTimingLabel(r))+'</span>':'')""",
    """+(!gpsLost&&r.schedule?'<span class=\"chip timing\">'+esc(liveTimingLabel(r))+'</span>':'')""",
    "lost GPS schedule timing chip",
)
bus = replace_once(
    bus,
    """  const row=rows.find(item=>String(item.v.id)===String(S.selected));
  const progress=row&&journeyProgress(row.v);""",
    """  const row=rows.find(item=>String(item.v.id)===String(S.selected));
  if(!row||row.gpsLost) return;
  const progress=journeyProgress(row.v);""",
    "lost GPS route overlay pause",
)
bus = replace_once(
    bus,
    """    const popup = '<b>'+esc(v.line)+'</b> to '+esc(v.dest||'?')
      + (r ? '<br>'+Math.max(1,Math.round(r.secs/60))+' min to '+esc(S.stop.name) : '<br>Not calling at your stop')""",
    """    const popup = '<b>'+esc(v.line)+'</b> to '+esc(v.dest||'?')
      + (r ? '<br>'+(r.gpsLost?'GPS signal lost · last position held':Math.max(1,Math.round(r.secs/60))+' min to '+esc(S.stop.name)) : '<br>Not calling at your stop')""",
    "lost GPS map popup",
)

bus = replace_once(
    bus,
    """async function fetchLive(signal){
  S.feedFallback=false; S.feedEmptyReason='';""",
    """async function fetchLive(signal){
  S.feedFallback=false; S.feedEmptyReason=''; S.feedPartial=false;""",
    "partial feed reset",
)
bus = replace_once(
    bus,
    """  if(wide&&batch.successful.length<batch.requested&&!(signal&&signal.aborted)){
    const nearby=await fetchLiveBatch(false,signal);
    batch={
      requested:batch.requested,
      successful:[...batch.successful,...nearby.successful],
      failure:batch.successful.length?(batch.failure||nearby.failure):(nearby.failure||batch.failure)
    };
  }""",
    """  if(wide&&batch.successful.length<batch.requested&&!(signal&&signal.aborted)){
    const nearby=await fetchLiveBatch(false,signal);
    const nearbyRecovered=nearby.requested>0&&nearby.successful.length===nearby.requested;
    S.feedPartial=!nearbyRecovered;
    batch={
      requested:batch.requested,
      successful:[...batch.successful,...nearby.successful],
      failure:batch.successful.length?(batch.failure||nearby.failure):(nearby.failure||batch.failure)
    };
  }""",
    "partial wide-feed tracking",
)
bus = replace_once(
    bus,
    """  if(!out.length&&parsed.malformed===successful.length) throw {soft:true,msg:'The live feed returned malformed XML.'};
  if(!out.length&&(parsed.stale||parsed.unknownAge)){""",
    """  if(!out.length&&parsed.malformed===successful.length) throw {soft:true,msg:'The live feed returned malformed XML.'};
  if(!out.length&&S.feedPartial) throw {soft:true,msg:'Live feed coverage was incomplete. Kerbside is keeping the last verified board while it retries.'};
  if(!out.length&&(parsed.stale||parsed.unknownAge)){""",
    "partial empty feed failure",
)
bus = replace_once(
    bus,
    """    const tt=S.ttStop?' · timetable checked':'';
    const updated=' · updated '+formatClock(S.lastFeedAt), cached=S.feedFallback?' · cached during BODS outage':'';
    const liveStatus=!list.length&&fresh===0&&!delayed
      ? 'Live · no fresh buses reported'+tt+cached+updated
      : 'Live · '+fresh+' fresh'+delayedText+hidden+tt+cached+updated;""",
    """    const tt=S.ttStop?' · timetable checked':'';
    const updated=' · updated '+formatClock(S.lastFeedAt), cached=S.feedFallback?' · cached during BODS outage':'';
    const partial=!S.demo&&S.feedPartial?' · partial coverage':'';
    const emptySummary=S.feedEmptyReason.includes('timestamped')?'no fresh GPS positions reported':'no buses reported';
    const liveStatus=!list.length&&fresh===0&&!delayed
      ? 'Live · '+emptySummary+tt+cached+partial+updated
      : 'Live · '+fresh+' fresh'+delayedText+hidden+tt+cached+partial+updated;""",
    "feed status detail",
)
bus = replace_once(
    bus,
    """  else if(S.workerOk===true){status.textContent='BODS GPS · Worker connected'+(S.workerVersion?' · '+S.workerVersion:'')+(delayed?' · '+delayed+' delayed':'');status.style.color='var(--live)';}""",
    """  else if(S.workerOk===true){status.textContent='BODS GPS · Worker connected'+(S.workerVersion?' · '+S.workerVersion:'')+(delayed?' · '+delayed+' delayed':'')+(S.feedPartial?' · partial coverage':'');status.style.color=S.feedPartial?'var(--warn)':'var(--live)';}""",
    "partial feed stats",
)
write("bus.html", bus)

worker = read("kerbside-backend/src/worker.js")
worker = replace_once(worker, f"version: '{OLD}'", f"version: '{NEW}'", "Worker version")
worker = replace_once(
    worker,
    """  const cached = await cache.match(cacheKey);
  const cacheAge = cachedAgeMs(cached);""",
    """  let cached = await cache.match(cacheKey);
  if (cached && !(await validCachedSiriResponse(cached))) {
    try { if (typeof cache.delete === 'function') await cache.delete(cacheKey); } catch {}
    cached = null;
  }
  const cacheAge = cachedAgeMs(cached);""",
    "cached SIRI validation",
)
worker = replace_once(
    worker,
    """      if (response.ok && body.byteLength) {""",
    """      if (response.ok && validSiriPayload(body, response.headers.get('Content-Type'))) {""",
    "upstream SIRI validation",
)
worker = insert_before(
    worker,
    "function cachedAgeMs(cached) {",
    """export function validSiriPayload(buffer, contentType = '') {
  if (!buffer || !buffer.byteLength) return false;
  const type = String(contentType || '').toLowerCase();
  if (type && !type.includes('xml') && !type.includes('text/plain') && !type.includes('application/octet-stream')) return false;
  let text = '';
  try {
    const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 65536));
    text = new TextDecoder().decode(bytes).replace(/^\uFEFF/, '').trimStart();
  } catch {
    return false;
  }
  if (!text.startsWith('<') || /^<(?:!doctype\s+html|html)\b/i.test(text)) return false;
  const siri = /<(?:[A-Za-z0-9_.-]+:)?Siri(?:\s|>)/i.test(text);
  const vehicleDelivery = /<(?:[A-Za-z0-9_.-]+:)?VehicleMonitoringDelivery(?:\s|>)/i.test(text);
  return siri && vehicleDelivery;
}

async function validCachedSiriResponse(response) {
  try {
    const body = await response.clone().arrayBuffer();
    return validSiriPayload(body, response.headers.get('Content-Type'));
  } catch {
    return false;
  }
}

""",
    "SIRI payload validator",
)
write("kerbside-backend/src/worker.js", worker)

package = read("kerbside-backend/package.json")
package = replace_once(package, f'"version": "{OLD}"', f'"version": "{NEW}"', "package version")
write("kerbside-backend/package.json", package)

worker_test = read("kerbside-backend/test/worker.test.js")
worker_test = replace_once(
    worker_test,
    "import { MAX_BBOX_SPAN, normaliseBoundingBox, resetWorkerStateForTests, routeRequest } from '../src/worker.js';",
    "import { MAX_BBOX_SPAN, normaliseBoundingBox, resetWorkerStateForTests, routeRequest, validSiriPayload } from '../src/worker.js';",
    "Worker test import",
)
worker_test = replace_once(
    worker_test,
    """const LIVE_URL = `https://example.test/feed?bbox=${encodeURIComponent(BBOX)}&lineRef=9`;
""",
    """const LIVE_URL = `https://example.test/feed?bbox=${encodeURIComponent(BBOX)}&lineRef=9`;
const EMPTY_SIRI = '<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery/></ServiceDelivery></Siri>';
const FRESH_SIRI = EMPTY_SIRI.replace('/>', '><ResponseTimestamp>2026-08-02T20:00:00Z</ResponseTimestamp></VehicleMonitoringDelivery>');
const CACHED_SIRI = EMPTY_SIRI.replace('/>', '><ResponseTimestamp>2026-08-02T19:59:00Z</ResponseTimestamp></VehicleMonitoringDelivery>');
const bytes = value => new TextEncoder().encode(value).buffer;
""",
    "Worker SIRI fixtures",
)
worker_test = worker_test.replace("'<cached/>'", "CACHED_SIRI").replace("'<fresh/>'", "FRESH_SIRI")
worker_test = replace_once(
    worker_test,
    """test('health describes the bounded cache-first Worker', async () => {""",
    """test('accepts only SIRI vehicle-monitoring payloads', () => {
  assert.equal(validSiriPayload(bytes(EMPTY_SIRI), 'application/xml'), true);
  assert.equal(validSiriPayload(bytes('<s:Siri xmlns:s="urn:siri"><s:ServiceDelivery><s:VehicleMonitoringDelivery/></s:ServiceDelivery></s:Siri>'), 'text/xml'), true);
  assert.equal(validSiriPayload(bytes('<html><body>temporary error</body></html>'), 'text/html'), false);
  assert.equal(validSiriPayload(bytes('{"error":"temporary"}'), 'application/json'), false);
  assert.equal(validSiriPayload(bytes('<Siri><ServiceDelivery><ErrorCondition/></ServiceDelivery></Siri>'), 'application/xml'), false);
});

test('health describes the bounded cache-first Worker', async () => {""",
    "SIRI validator tests",
)
worker_test = replace_once(worker_test, "assert.equal(body.version, '0.6.50');", "assert.equal(body.version, '0.6.51');", "Worker health test version")
worker_test = insert_before(
    worker_test,
    "test('limits an uncached outage to two upstream attempts', async () => {",
    """test('rejects and never caches non-SIRI HTTP 200 bodies', async () => {
  resetWorkerStateForTests();
  const payloads = [
    new Response('<html><body>upstream error</body></html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
    new Response('{"error":"upstream error"}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  ];
  const runtime = installRuntime(null, async () => payloads.shift());
  try {
    const response = await routeRequest(new Request(LIVE_URL), { BODS_KEY: 'present' });
    assert.equal(response.status, 502);
    assert.equal(runtime.state.fetches, 2);
    assert.equal(runtime.state.puts.length, 0);
  } finally {
    runtime.restore();
    resetWorkerStateForTests();
  }
});

""",
    "invalid 200 Worker test",
)
write("kerbside-backend/test/worker.test.js", worker_test)

browser_test = read("kerbside-backend/tests/browser-regression.mjs")
insert_marker = """  assert.equal(gpsFixes.corridor,true);assert.equal(gpsFixes.live,1);assert.equal(gpsFixes.progress,true);assert.equal(gpsFixes.held,true);assert.equal(gpsFixes.away,false);

  const emptyFeed = await page.evaluate(async () => {"""
insert_block = """  assert.equal(gpsFixes.corridor,true);assert.equal(gpsFixes.live,1);assert.equal(gpsFixes.progress,true);assert.equal(gpsFixes.held,true);assert.equal(gpsFixes.away,false);

  const gpsSafety = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,onlyServing:state.onlyServing,hideAway:state.hideAway,destFilter:state.destFilter,demo:state.demo,vehicles:state.vehicles,ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion};
    try{
      state.stop={id:'gps-safety-stop',timetableId:'gps-safety-stop',lat:52.5,lon:-2.1,name:'GPS safety stop',d:0};
      state.origin={lat:52.5,lon:-2.1,label:'GPS safety'};state.anchor={lat:52.5,lon:-2.1,name:'Local area',synthetic:true};state.dir='in';state.onlyServing=false;state.hideAway=false;state.destFilter=null;state.demo=false;state.vehicles=new Map();state.ttStop=null;state.timetable=null;state.timetableSource='';state.timetableRegion='';state.timetableRun++;
      api.ingest([{id:'ordered',journey:'ordered-trip',line:'77',dest:'Town Centre',lat:52.5,lon:-2.1,bearing:NaN,feedSpeed:8,ts:now,timestampKnown:true,corridorTracked:false}]);
      api.ingest([{id:'ordered',journey:'ordered-trip',line:'77',dest:'Town Centre',lat:51.5,lon:-3.1,bearing:180,feedSpeed:8,ts:now-60000,timestampKnown:true,corridorTracked:true,corridorTrip:'ordered-trip',corridorRemaining:12000,corridorConfirmedAt:now}]);
      const ordered=state.vehicles.get('ordered');
      const newestPositionKept=ordered.ts===now&&ordered.lat===52.5&&ordered.lon===-2.1&&ordered.hist[ordered.hist.length-1].ts===now;
      const olderEvidenceMerged=ordered.corridorTracked&&ordered.corridorTrip==='ordered-trip';
      ordered.corridorConfirmedAt=now-6*60000;
      api.ingest([{id:'ordered',journey:'ordered-trip',line:'77',dest:'Town Centre',lat:52.5001,lon:-2.1,bearing:NaN,feedSpeed:8,ts:now+1000,timestampKnown:true,corridorTracked:false}]);
      const expired=state.vehicles.get('ordered');
      const corridorExpired=!expired.corridorTracked&&!expired.corridorTrip&&api.vehicleJourneyRef(expired)==='ordered-trip';

      const snapshotVehicle={id:'snapshot',journey:'snapshot-trip',line:'9',dest:'Town Centre',lat:52.49,lon:-2.1,ts:now-5*60000,lastShownStopId:'gps-safety-stop',lastShownAt:now-1000,lastShownArrivalAt:now+5*60000,lastShownBoardDir:'in',lastShownDestFilter:'',lastShownSnapshot:{v:null,dir:'in',app:true,strength:1,secs:300,metres:500,routeMetres:null,geometry:null,confidence:'high',spread:90,evidence:{score:5},schedule:{trip:'snapshot-trip',at:now+5*60000},recovered:false,match:'exact journey',directionLabel:'Journey: inbound'}};
      state.dir='in';state.destFilter=null;const sameContext=!!api.retainedSnapshotRow(snapshotVehicle,now);
      state.dir='out';const wrongDirection=!!api.retainedSnapshotRow(snapshotVehicle,now);
      state.dir='in';state.destFilter='Other place';const wrongDestination=!!api.retainedSnapshotRow(snapshotVehicle,now);
      const lostRow={gpsLost:true,schedule:{trip:'lost-trip',at:now+5*60000}};
      const lostAlarm=api.alarmRowEligible(lostRow),lostClaims=api.scheduleClaimedByLive(lostRow),freshClaims=api.scheduleClaimedByLive({gpsLost:false,schedule:lostRow.schedule});

      const directionTrip='direction-trip',departure=new Date(now+150*60000),mins=departure.getHours()*60+departure.getMinutes();
      state.dir='out';state.destFilter=null;state.onlyServing=true;state.vehicles=new Map();
      state.ttStop={id:'gps-safety-stop',d:[[mins,'77','Town Centre','daily','in',directionTrip,'']]};
      state.timetable={services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},tripPatterns:{},patterns:{}};state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun++;
      api.ingest([{id:'direction',journey:directionTrip,line:'77',dest:'',lat:52.5005,lon:-2.1,bearing:NaN,feedSpeed:8,ts:now,timestampKnown:true,corridorTracked:false}]);
      const wrongBoardDirection=api.relevant().some(row=>row.v.id==='direction');
      return {newestPositionKept,olderEvidenceMerged,corridorExpired,sameContext,wrongDirection,wrongDestination,lostAlarm,lostClaims,freshClaims,wrongBoardDirection};
    }finally{Object.assign(state,saved);}
  });
  assert.equal(gpsSafety.newestPositionKept,true);
  assert.equal(gpsSafety.olderEvidenceMerged,true);
  assert.equal(gpsSafety.corridorExpired,true);
  assert.equal(gpsSafety.sameContext,true);
  assert.equal(gpsSafety.wrongDirection,false);
  assert.equal(gpsSafety.wrongDestination,false);
  assert.equal(gpsSafety.lostAlarm,false);
  assert.equal(gpsSafety.lostClaims,false);
  assert.equal(gpsSafety.freshClaims,true);
  assert.equal(gpsSafety.wrongBoardDirection,false);

  const emptyFeed = await page.evaluate(async () => {"""
browser_test = replace_once(browser_test, insert_marker, insert_block, "GPS safety browser fixtures")
partial_marker = """  assert.equal(emptyFeed.count,0);
  assert.match(emptyFeed.reason,/No buses were reported/);

  const wideFallback = await page.evaluate(async () => {"""
partial_block = """  assert.equal(emptyFeed.count,0);
  assert.match(emptyFeed.reason,/No buses were reported/);

  const partialFeed = await page.evaluate(async () => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,originalFetch=window.fetch;
    const saved={stop:state.stop,origin:state.origin,proxy:state.proxy,key:state.key,demo:state.demo,lastWideFetch:state.lastWideFetch,feedFallback:state.feedFallback,feedStale:state.feedStale,feedUnknownAge:state.feedUnknownAge,feedEmptyReason:state.feedEmptyReason,feedPartial:state.feedPartial};
    state.stop={id:'partial-feed-stop',lat:52.5,lon:-2.1,name:'Partial feed stop'};state.origin={lat:52.5,lon:-2.1,label:'Partial feed'};state.proxy='https://partial-feed.test';state.key='';state.demo=false;state.lastWideFetch=0;
    const empty='<?xml version="1.0"?><Siri><ServiceDelivery><VehicleMonitoringDelivery></VehicleMonitoringDelivery></ServiceDelivery></Siri>';let calls=0;
    window.fetch=async () => {calls++;if(calls===1)return new Response(empty,{status:200,headers:{'Content-Type':'application/xml'}});throw new TypeError('offline');};
    try{
      try{await api.fetchLive();return {resolved:true,calls,partial:state.feedPartial,msg:''};}
      catch(e){return {resolved:false,calls,partial:state.feedPartial,msg:String(e&&e.msg||e)};}
    }finally{window.fetch=originalFetch;Object.assign(state,saved);}
  });
  assert.equal(partialFeed.resolved,false);
  assert.equal(partialFeed.partial,true);
  assert.equal(partialFeed.calls,3);
  assert.match(partialFeed.msg,/coverage was incomplete/i);

  const wideFallback = await page.evaluate(async () => {"""
browser_test = replace_once(browser_test, partial_marker, partial_block, "partial coverage browser fixture")
write("kerbside-backend/tests/browser-regression.mjs", browser_test)

readme = read("kerbside-backend/README.md")
readme = replace_once(
    readme,
    """Kerbside 0.6.50 separates a healthy empty BODS response from a genuine feed failure. Valid XML with no fresh vehicles now reports `Live · no fresh buses reported` and retains any still-valid prior GPS rows instead of showing `Feed problem`. Real Worker, network or upstream failures now state `Live feed delayed · last GPS retained` or `Live feed unavailable · retrying`, while scheduled departures remain available when present. WebKit verifies that valid empty SIRI XML returns an empty live result without entering the error path.

The Worker remains backwards-compatible for live data:""",
    """Kerbside 0.6.50 separates a healthy empty BODS response from a genuine feed failure. Valid XML with no fresh vehicles now reports `Live · no fresh buses reported` and retains any still-valid prior GPS rows instead of showing `Feed problem`. Real Worker, network or upstream failures now state `Live feed delayed · last GPS retained` or `Live feed unavailable · retrying`, while scheduled departures remain available when present. WebKit verifies that valid empty SIRI XML returns an empty live result without entering the error path.

Kerbside 0.6.51 makes live GPS ordering and lost-signal behaviour safety-critical rather than cosmetic. Older responses from overlapping nearby, expanded and route-corridor requests can contribute compatible journey evidence but can no longer overwrite a newer position or timestamp. Held rows are bound to the active direction and destination filter, do not trigger leave alerts, tight-walk warnings, early/late labels or moving route progress, and no longer hide the corresponding scheduled departure. Exact matched timetable rows continue to provide direction and destination even when their ETA is too far from the spatial estimate to blend. Expired corridor identity is removed, incomplete expanded coverage enters the retry path, and the Worker validates SIRI vehicle-monitoring structure before caching or serving an upstream HTTP 200 response. Browser and Worker fixtures cover all of these cases.

The Worker remains backwards-compatible for live data:""",
    "README release note",
)
write("kerbside-backend/README.md", readme)

print(f"Prepared Kerbside {NEW}")
