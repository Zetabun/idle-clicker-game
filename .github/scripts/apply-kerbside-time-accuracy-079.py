from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one exact replacement, found {count}: {old[:100]!r}')
    write(path, text.replace(old, new, 1))

version_path = ROOT / 'VERSION'
current = version_path.read_text(encoding='utf-8').strip()
if current != '0.7.8':
    raise SystemExit(f'Expected Kerbside 0.7.8 base, found {current!r}')
version_path.write_text('0.7.9\n', encoding='utf-8')

replace_once('bus.html', '''function serviceDepartureTime(serviceDate,mins){
  const numeric=Number(mins);
  if(!isFinite(numeric)) return new Date(NaN);
  const total=Math.max(0,Math.floor(numeric));
  const dayOffset=Math.floor(total/1440), minuteOfDay=total%1440;
  const target=shiftServiceDate(serviceDate,dayOffset);
  return new Date(ukWallClockEpoch(
    target.getUTCFullYear(),target.getUTCMonth()+1,target.getUTCDate(),
    Math.floor(minuteOfDay/60),minuteOfDay%60
  ));
}''', '''function serviceDayStartEpoch(serviceDate){
  // GTFS Time is elapsed time from "noon minus 12h" of the service day, not a
  // civil wall-clock timestamp. Anchoring at local noon (which is never inside
  // the UK clock-change gap/repeat) and subtracting twelve real hours preserves
  // the required elapsed-time behaviour on both DST transition dates.
  const noon=ukWallClockEpoch(
    serviceDate.getUTCFullYear(),serviceDate.getUTCMonth()+1,serviceDate.getUTCDate(),12,0
  );
  return noon-12*3600000;
}
function serviceDepartureTime(serviceDate,mins){
  const numeric=Number(mins);
  if(!isFinite(numeric)) return new Date(NaN);
  const total=Math.max(0,Math.floor(numeric));
  return new Date(serviceDayStartEpoch(serviceDate)+total*60000);
}''')

replace_once('bus.html', '''const MIN_SPEED = 1.8, MAX_SPEED = 16;
const GPS_FRESH_MS = 2*60*1000;
const MAX_AGE_MS = 4*60*1000;  // retain delayed operator reports briefly, but never revive old ghost buses
const LOCATION_TARGET_ACCURACY_METRES = 60;''', '''const MIN_SPEED = 1.8, MAX_SPEED = 16;
const MAX_AGE_MS = 4*60*1000;  // retain delayed operator reports briefly, but never revive old ghost buses
const LIVE_FUTURE_SKEW_MS = 2*60*1000; // tolerate producer clock skew, but never let it advance the app clock
const LIVE_DUE_SECONDS = 45;
const SCHEDULE_DUE_SECONDS = 45;
const LOCATION_TARGET_ACCURACY_METRES = 60;''')

replace_once('bus.html', '''      const parsed=f.RecordedAtTime?Date.parse(f.RecordedAtTime):NaN;
      if(!isFinite(parsed)){unknownAge++;continue;}
      const validUntil=f.ValidUntilTime?Date.parse(f.ValidUntilTime):NaN;
      const ts=parsed,age=observedAt-ts;
      if(age>MAX_AGE_MS||age < -120000||(isFinite(validUntil)&&observedAt>validUntil)){stale++;continue;}
      const journey=f.DatedVehicleJourneyRef||f.VehicleJourneyRef||'';''', '''      const parsed=f.RecordedAtTime?Date.parse(f.RecordedAtTime):NaN;
      if(!isFinite(parsed)){unknownAge++;continue;}
      const validUntil=f.ValidUntilTime?Date.parse(f.ValidUntilTime):NaN;
      const sourceTs=parsed,sourceAge=observedAt-sourceTs;
      if(sourceAge>MAX_AGE_MS||sourceAge < -LIVE_FUTURE_SKEW_MS||(isFinite(validUntil)&&observedAt>validUntil)){stale++;continue;}
      // Preserve the producer timestamp for diagnostics/identity provenance, but
      // cap the operational timestamp at receipt time. Otherwise one producer
      // clock 90-120 seconds fast makes corrected reports look "older" and the
      // bus freezes until wall time catches up with that future observation.
      const ts=Math.min(sourceTs,observedAt);
      const journey=f.DatedVehicleJourneyRef||f.VehicleJourneyRef||'';''')
replace_once('bus.html', '''        validUntilAt:validUntil,ts,timestampKnown:true
      });''', '''        validUntilAt:validUntil,sourceTs,ts,timestampKnown:true
      });''')

replace_once('bus.html', '''    if(Number.isFinite(scheduledAt)){
      row.secs=Math.max(0,(scheduledAt-now)/1000);
      row.scheduleFallback=true;
    }''', '''    if(Number.isFinite(scheduledAt)&&scheduledAt>=now){
      row.secs=(scheduledAt-now)/1000;
      row.scheduleFallback=true;
    }''')

replace_once('bus.html', '''  if(now-Number(v.ts)>GPS_FRESH_MS&&!decisive.has(rejection)) return 'matching GPS is delayed';''', '''  if(!etaGpsQuality(v,now).fresh&&!decisive.has(rejection)) return 'matching GPS is delayed';''')

replace_once('bus.html', '''function liveTimingLabel(r){
  if(r.gpsLost||!r.schedule) return '';
  const comparisonSecs=Number.isFinite(Number(r.liveSecs))?Number(r.liveSecs):Number(r.secs);
  const diff=Math.round(((Date.now()+comparisonSecs*1000)-r.schedule.at)/60000);
  if(Math.abs(diff)<=1) return 'on schedule';
  return diff>0?diff+' min late':Math.abs(diff)+' min early';
}
function renderScheduledRow(r){
  const s=r.schedule, mins=Math.max(0,Math.round(r.secs/60)), due=mins<=1, source=timetableSourceLabel();''', '''function dueWithin(seconds,limit){
  const value=Number(seconds);
  return Number.isFinite(value)&&value>=0&&value<=Number(limit);
}
function liveTimingLabel(r){
  if(r.gpsLost||!r.schedule) return '';
  const comparisonSecs=Number.isFinite(Number(r.liveSecs))?Number(r.liveSecs):Number(r.secs);
  const diffSecs=((Date.now()+comparisonSecs*1000)-r.schedule.at)/1000;
  if(Math.abs(diffSecs)<=60) return 'on schedule';
  const mins=Math.max(1,Math.round(Math.abs(diffSecs)/60));
  return diffSecs>0?mins+' min late':mins+' min early';
}
function renderScheduledRow(r){
  const s=r.schedule, mins=Math.max(0,Math.round(r.secs/60)), due=dueWithin(r.secs,SCHEDULE_DUE_SECONDS), source=timetableSourceLabel();''')

replace_once('bus.html', '''    if(r.at<now-60000 || r.at>end) return false;''', '''    if(r.at<now || r.at>end) return false;''')

replace_once('bus.html', '''      const mins=Math.max(0,Math.round(r.secs/60));
      const age=Date.now()-r.v.ts, gpsLost=!!r.gpsLost, gpsFresh=!gpsLost&&age<=GPS_FRESH_MS, gpsAge=formatPositionAge(age);
      const due=!gpsLost&&gpsFresh&&r.confidence!='low'&&mins<=1;
      const tight=!gpsLost&&S.walkSecs>90 && r.secs<S.walkSecs-30;'''.replace("confidence!='low'", "confidence!=='low'"), '''      const mins=Math.max(0,Math.round(r.secs/60));
      const now=Date.now(), age=now-r.v.ts, gpsLost=!!r.gpsLost, gpsQuality=etaGpsQuality(r.v,now), gpsFresh=!gpsLost&&gpsQuality.fresh, gpsAge=formatPositionAge(age);
      const due=!gpsLost&&gpsFresh&&r.confidence!=='low'&&dueWithin(r.secs,LIVE_DUE_SECONDS);
      const scheduleDue=dueWithin(r.secs,SCHEDULE_DUE_SECONDS);
      const tight=!gpsLost&&S.walkSecs>90 && r.secs<S.walkSecs-30;''')

replace_once('bus.html', '''      const gpsHelp=gpsLost?(r.scheduleFallback?'Fresh GPS stopped for this matched departure; its row is temporarily using the timetable instead of creating a duplicate scheduled bus.':'The operator feed stopped reporting this previously verified bus. Kerbside is holding the row briefly without a live countdown.'):gpsFresh?'Fresh vehicle position from BODS':'Last confirmed BODS position is over two minutes old; retained briefly while waiting for the next report.';
      const etaText=gpsLost?(r.scheduleFallback?(mins<=1?'due':'~'+mins):'—'):due?'due':((!gpsFresh||r.confidence==='low')?'~':'')+mins;''', '''      const gpsHelp=gpsLost?(r.scheduleFallback?'Fresh GPS stopped for this matched departure; its row is temporarily using the timetable instead of creating a duplicate scheduled bus.':'The operator feed stopped reporting this previously verified bus. Kerbside is holding the row briefly without a live countdown.'):gpsFresh?'Fresh vehicle position from BODS; current for this bus\\'s reporting cadence.':'Last confirmed BODS position was '+gpsAge+'; ETA confidence is reduced until a fresh report arrives.';
      const etaText=gpsLost?(r.scheduleFallback?(scheduleDue?'due':'~'+mins):'—'):due?'due':((!gpsFresh||r.confidence==='low')?'~':'')+mins;''')

replace_once('bus.html', '''        +'</span></span><span class="eta'+(due?' due':'')+'">'+etaText+'<small>'+(gpsLost?(r.scheduleFallback?(mins<=1?'scheduled':'min'):'last seen'):due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')+'</small></span></button>''', '''        +'</span></span><span class="eta'+(due?' due':'')+'">'+etaText+'<small>'+(gpsLost?(r.scheduleFallback?(scheduleDue?'scheduled':'min'):'last seen'):due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')+'</small></span></button>''')

replace_once('bus.html', '''    const now=Date.now(), tracked=[...S.vehicles.values()].filter(v=>now-v.ts<=MAX_AGE_MS);
    const fresh=tracked.filter(v=>now-v.ts<=GPS_FRESH_MS).length, delayed=tracked.length-fresh;''', '''    const now=Date.now(), tracked=[...S.vehicles.values()].filter(v=>now-v.ts<=MAX_AGE_MS);
    const fresh=tracked.filter(v=>etaGpsQuality(v,now).fresh).length, delayed=tracked.length-fresh;''')
replace_once('bus.html', '''  const now=Date.now(), tracked=[...S.vehicles.values()].filter(v=>now-v.ts<=MAX_AGE_MS);
  const fresh=tracked.filter(v=>now-v.ts<=GPS_FRESH_MS).length, delayed=tracked.length-fresh;''', '''  const now=Date.now(), tracked=[...S.vehicles.values()].filter(v=>now-v.ts<=MAX_AGE_MS);
  const fresh=tracked.filter(v=>etaGpsQuality(v,now).fresh).length, delayed=tracked.length-fresh;''')

replace_once('bus.html', '''<div class="confidence-guide"><b>LIVE GPS</b> means a real bus reported its position within the last two minutes. <b>GPS DELAYED</b> means the last confirmed report is two to four minutes old; Kerbside holds the row briefly rather than letting the bus flicker out, and marks the ETA as estimated.''', '''<div class="confidence-guide"><b>LIVE GPS</b> means the latest bus position is still inside Kerbside's cadence-aware freshness window (30 to 75 seconds, depending on how often that vehicle reports). <b>GPS DELAYED</b> means the last confirmed report is still recent enough to retain, but old enough that ETA confidence has been reduced; Kerbside holds the row briefly rather than letting the bus flicker out.''')
replace_once('bus.html', '''Positions older than two minutes are labelled GPS delayed and retained only until four minutes old so irregular operator updates do not make an approaching bus vanish immediately.''', '''Positions outside each vehicle's cadence-aware 30 to 75 second freshness window are labelled GPS delayed and retained only until four minutes old so irregular operator updates do not make an approaching bus vanish immediately.''')

replace_once('bus.html', '''window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),mappedRecordTtl,mappedRecordFresh,canQueryExactOsmStop,routeLookupQueries,knownRoutes,timetableRouteSet,routeEvidence,journeyDestinationAgreement,setVehicleProgressIdentity,routeIdentityAgreement,timetableIdentityRows,destinationSimilarity,destinationTerminatesHere,timetableTrusted,originTimeMatches,uniqueOriginTrips,ORIGIN_MATCH_TOLERANCE_MS,physicalVehicleKey,estimate,etaFreshWindowSeconds,etaGpsQuality,scheduleEtaBlendWeight,remainingStopsToTarget,etaMotionModel,inferVehicleJourneyPattern,inferredRouteEvidence,inferredRouteScanMatch,authoritativeDiscoveredStopId,likelyOppositeStopPair,stopSelectionCandidates,stopSelectionNeedsChoice,matchTimetableStop,visualVehiclePosition,savedOriginSource,ukDateTimeParts,ukServiceDate,serviceDateKey,ukWallClockEpoch,formatClock,journeyGeometry,selectedPatternStopIndex,liveTimingLabel,newLiveDiagnostics,noteLiveRejection,setServingForTest:value=>{SERVING=value||{};}};''', '''window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),mappedRecordTtl,mappedRecordFresh,canQueryExactOsmStop,routeLookupQueries,knownRoutes,timetableRouteSet,routeEvidence,journeyDestinationAgreement,setVehicleProgressIdentity,routeIdentityAgreement,timetableIdentityRows,destinationSimilarity,destinationTerminatesHere,timetableTrusted,originTimeMatches,uniqueOriginTrips,ORIGIN_MATCH_TOLERANCE_MS,physicalVehicleKey,estimate,etaFreshWindowSeconds,etaGpsQuality,scheduleEtaBlendWeight,remainingStopsToTarget,etaMotionModel,inferVehicleJourneyPattern,inferredRouteEvidence,inferredRouteScanMatch,authoritativeDiscoveredStopId,likelyOppositeStopPair,stopSelectionCandidates,stopSelectionNeedsChoice,matchTimetableStop,visualVehiclePosition,savedOriginSource,ukDateTimeParts,ukServiceDate,serviceDateKey,ukWallClockEpoch,formatClock,journeyGeometry,selectedPatternStopIndex,liveTimingLabel,dueWithin,LIVE_DUE_SECONDS,SCHEDULE_DUE_SECONDS,newLiveDiagnostics,noteLiveRejection,setServingForTest:value=>{SERVING=value||{};}};''')

replace_once('kerbside-backend/tests/accuracy-hardening-regression.mjs', '''    springGap0130: '2026-03-29T01:30:00.000Z',
    autumnRepeated0130: '2026-10-25T00:30:00.000Z',''', '''    springGap0130: '2026-03-29T00:30:00.000Z',
    autumnRepeated0130: '2026-10-25T01:30:00.000Z',''')
replace_once('kerbside-backend/tests/accuracy-hardening-regression.mjs', '''    assert.deepEqual(clock, expectedClock, `UK timetable clock changed in browser timezone ${timezoneId}`);
    await pair.context.close();''', '''    assert.deepEqual(clock, expectedClock, `UK timetable clock changed in browser timezone ${timezoneId}`);
    const dueEdges = await pair.page.evaluate(() => {
      const api = window.__KERBSIDE_TEST__;
      return {
        live45: api.dueWithin(45, api.LIVE_DUE_SECONDS),
        live46: api.dueWithin(46, api.LIVE_DUE_SECONDS),
        schedule45: api.dueWithin(45, api.SCHEDULE_DUE_SECONDS),
        schedule46: api.dueWithin(46, api.SCHEDULE_DUE_SECONDS),
        past: api.dueWithin(-1, api.SCHEDULE_DUE_SECONDS)
      };
    });
    assert.deepEqual(dueEdges, { live45: true, live46: false, schedule45: true, schedule46: false, past: false });
    await pair.context.close();''')

replace_once('kerbside-backend/tests/identity-regression.mjs', '''      const expired = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-EXP', journey: 'J', vehicle: 'V', item: 'expired', lat: 52.40, validUntil: now - 1 })) }], now);
      const valid = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-VALID', journey: 'J', vehicle: 'V', item: 'valid', lat: 52.40, validUntil: now + 60000 })) }], now);

      return {''', '''      const expired = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-EXP', journey: 'J', vehicle: 'V', item: 'expired', lat: 52.40, validUntil: now - 1 })) }], now);
      const valid = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-VALID', journey: 'J', vehicle: 'V', item: 'valid', lat: 52.40, validUntil: now + 60000 })) }], now);

      state.vehicles = new Map();
      const futureSource = now + 110000;
      const future = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-FUTURE', journey: 'J', vehicle: 'V', item: 'future', lat: 52.40, time: futureSource })) }], now);
      api.ingest(future.vehicles);
      const futureCappedTs = future.vehicles[0]?.ts;
      const futureSourceTs = future.vehicles[0]?.sourceTs;
      const correctedSource = now + 14000;
      const corrected = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-FUTURE', journey: 'J', vehicle: 'V', item: 'future', lat: 52.401, time: correctedSource })) }], now + 15000);
      api.ingest(corrected.vehicles);
      const futureCorrectedTs = [...state.vehicles.values()][0]?.ts;

      return {''')
replace_once('kerbside-backend/tests/identity-regression.mjs', '''        changingItemStableUniqueIdentities,
        reformattedCachedIdentities,
        producerOwners
      };''', '''        changingItemStableUniqueIdentities,
        reformattedCachedIdentities,
        producerOwners,
        futureCappedTs,
        futureSourceTs,
        futureCorrectedTs,
        futureSource,
        correctedSource
      };''')
replace_once('kerbside-backend/tests/identity-regression.mjs', '''  assert.equal(result.reformattedCachedIdentities, 1);
  assert.deepEqual(result.producerOwners, ['PROD-A', 'PROD-B']);
  assert.deepEqual(pageErrors, []);''', '''  assert.equal(result.reformattedCachedIdentities, 1);
  assert.deepEqual(result.producerOwners, ['PROD-A', 'PROD-B']);
  assert.equal(result.futureCappedTs, result.futureSource - 110000, 'future producer timestamp must be capped to receipt time');
  assert.equal(result.futureSourceTs, result.futureSource, 'raw producer timestamp must remain available as provenance');
  assert.equal(result.futureCorrectedTs, result.correctedSource, 'a corrected next report must advance instead of freezing behind the future timestamp');
  assert.deepEqual(pageErrors, []);''')

replace_once('kerbside-backend/tests/listing-reliability-regression.mjs', '''      const plainLostClaims = api.scheduleClaimedByLive({ gpsLost: true, schedule });

      state.lastFeedAt = now - 5 * 60000; state.feedFallback = true;''', '''      const plainLostClaims = api.scheduleClaimedByLive({ gpsLost: true, schedule });
      const pastSchedule = { ...schedule, at: now - 1000 };
      const pastVehicle = vehicle(320000);
      pastVehicle.lastShownSnapshot = { ...snapshot, schedule: pastSchedule, matchedSchedule: pastSchedule };
      const heldPastSchedule = api.retainedSnapshotRow(pastVehicle, now);
      const pastScheduleFallback = !!(heldPastSchedule && heldPastSchedule.scheduleFallback);
      const pastScheduleClaimed = api.scheduleClaimedByLive(heldPastSchedule);

      state.lastFeedAt = now - 5 * 60000; state.feedFallback = true;''')
replace_once('kerbside-backend/tests/listing-reliability-regression.mjs', '''        scheduleClaimed, duplicateScheduledRows, plainLostClaims,
        keptOutage: !!keptOutage,''', '''        scheduleClaimed, duplicateScheduledRows, plainLostClaims,
        pastScheduleFallback, pastScheduleClaimed,
        keptOutage: !!keptOutage,''')
replace_once('kerbside-backend/tests/listing-reliability-regression.mjs', '''  assert.equal(result.plainLostClaims, false);
  assert.equal(result.keptOutage, true);''', '''  assert.equal(result.plainLostClaims, false);
  assert.equal(result.pastScheduleFallback, false);
  assert.equal(result.pastScheduleClaimed, false);
  assert.equal(result.keptOutage, true);''')

replace_once('kerbside-backend/tests/browser-regression.mjs', '''assert.match(busSource, /mode:'feed-speed'/);
assert.match(busSource, /mode:'gps-average'/);
assert.match(busSource, /feedRefreshing:false/);''', '''assert.match(busSource, /mode:'feed-speed'/);
assert.match(busSource, /mode:'gps-average'/);
assert.doesNotMatch(busSource, /GPS_FRESH_MS/);
assert.match(busSource, /gpsQuality=etaGpsQuality\\(r\\.v,now\\)/);
assert.match(busSource, /tracked\\.filter\\(v=>etaGpsQuality\\(v,now\\)\\.fresh\\)/);
assert.match(busSource, /const LIVE_DUE_SECONDS = 45/);
assert.match(busSource, /const SCHEDULE_DUE_SECONDS = 45/);
assert.match(busSource, /if\\(r\\.at<now \\|\\| r\\.at>end\\) return false;/);
assert.match(busSource, /sourceTs,ts,timestampKnown:true/);
assert.match(busSource, /const ts=Math\\.min\\(sourceTs,observedAt\\)/);
assert.match(busSource, /feedRefreshing:false/);''')

subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)
subprocess.run(['python3', '.github/scripts/sync-version.py', '--check'], check=True)
for path in [
    'build-timetable.js',
    'kerbside-backend/tests/accuracy-hardening-regression.mjs',
    'kerbside-backend/tests/identity-regression.mjs',
    'kerbside-backend/tests/browser-regression.mjs',
    'kerbside-backend/tests/listing-reliability-regression.mjs',
]:
    subprocess.run(['node', '--check', path], check=True)

bus = read('bus.html')
required = [
    "const APP_VERSION = '0.7.9';",
    'function serviceDayStartEpoch(serviceDate)',
    'return new Date(serviceDayStartEpoch(serviceDate)+total*60000);',
    'const ts=Math.min(sourceTs,observedAt);',
    'gpsQuality=etaGpsQuality(r.v,now)',
    'dueWithin(r.secs,LIVE_DUE_SECONDS)',
    'if(r.at<now || r.at>end) return false;',
]
missing = [token for token in required if token not in bus]
if missing:
    raise SystemExit(f'Missing required Kerbside time-accuracy changes: {missing}')
for forbidden in ['const GPS_FRESH_MS =', 'age<=GPS_FRESH_MS', 'now-v.ts<=GPS_FRESH_MS', 'r.at<now-60000', 'due=mins<=1']:
    if forbidden in bus:
        raise SystemExit(f'Forbidden stale timing logic remains: {forbidden}')

scripts = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', bus, flags=re.I | re.S)
if not scripts:
    raise SystemExit('No inline browser scripts found in bus.html')
with TemporaryDirectory() as directory:
    for index, script in enumerate(scripts, 1):
        target = Path(directory) / f'inline-{index}.js'
        target.write_text(script, encoding='utf-8')
        subprocess.run(['node', '--check', str(target)], check=True)

subprocess.run(['git', 'diff', '--check'], check=True)
print('Kerbside 0.7.9 time/GPS accuracy patch applied and statically validated.')
