import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as playwright from 'playwright';

const ENGINE_NAME = process.env.KERBSIDE_BROWSER || 'webkit';
const engine = playwright[ENGINE_NAME];
if (!engine || typeof engine.launch !== 'function') throw new Error(`Unsupported browser engine: ${ENGINE_NAME}`);
console.log(`Accuracy hardening regression engine: ${ENGINE_NAME}`);

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..', '..');
const appVersion = String(await readFile(path.join(root, 'VERSION'), 'utf8')).trim();
function versionAtLeast(value, minimum) {
  const left = String(value).split('.').map(Number);
  const right = String(minimum).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const a = Number.isFinite(left[i]) ? left[i] : 0;
    const b = Number.isFinite(right[i]) ? right[i] : 0;
    if (a !== b) return a > b;
  }
  return true;
}
const expectsSpeedProvenance = versionAtLeast(appVersion, '0.7.8');
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname === '/' ? 'bus.html' : pathname.replace(/^\/+/, '');
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) && target !== path.join(root, 'bus.html')) throw new Error('outside root');
    const body = await readFile(target);
    const extension = path.extname(target);
    const type = extension === '.css' ? 'text/css; charset=utf-8' : extension === '.js' ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const url = `http://127.0.0.1:${port}/bus.html`;

const browser = await engine.launch({ headless: true });
const pageErrors = [];

async function newPage(timezoneId = 'Europe/London', mockGeolocation = false) {
  const context = await browser.newContext({ timezoneId });
  if (mockGeolocation) {
    await context.addInitScript(() => {
      const geo = { calls: 0, cleared: 0, success: null, error: null };
      Object.defineProperty(window, '__KERBSIDE_GEO_MOCK__', { value: geo, configurable: true });
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          watchPosition(success, error) {
            geo.calls += 1;
            geo.success = success;
            geo.error = error;
            return geo.calls;
          },
          clearWatch() { geo.cleared += 1; },
          getCurrentPosition(success, error) {
            geo.calls += 1;
            geo.success = success;
            geo.error = error;
          }
        }
      });
    });
  }
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(`${timezoneId}: ${error.message}`));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__KERBSIDE_TEST__), null, { timeout: 20000 });
  return { context, page };
}

try {
  const { context, page } = await newPage('Europe/London');
  const matrix = await page.evaluate(() => {
    const api = window.__KERBSIDE_TEST__;
    const state = api.liveState;
    const saved = {
      stop: state.stop,
      ttStop: state.ttStop,
      timetable: state.timetable,
      timetableSource: state.timetableSource,
      timetableFallback: state.timetableFallback,
      timetableRegion: state.timetableRegion,
      timetableRun: state.timetableRun,
      destFilter: state.destFilter,
      dir: state.dir,
      vehicles: state.vehicles
    };
    const now = Date.now();
    const stop = { id: 'STOP', timetableId: 'STOP', name: 'Matrix Stop', lat: 52.5, lon: -1.9 };
    const targetMinutes = deltaMs => {
      const p = api.ukDateTimeParts(new Date(now + deltaMs));
      return Number(p.hour) * 60 + Number(p.minute);
    };
    const makeTimetable = rows => {
      state.stop = stop;
      state.ttStop = { id: 'STOP', d: rows };
      state.timetable = { services: {}, tripPatterns: {}, patterns: {} };
      state.timetableSource = 'national';
      state.timetableFallback = false;
      state.timetableRegion = '';
      state.timetableRun = Number(state.timetableRun || 0) + 1;
      state.destFilter = null;
      state.dir = 'all';
    };
    const row = (deltaMs, trip, line = '1', head = 'Centre', pattern = '') => {
      const mins = targetMinutes(deltaMs);
      return [mins, line, head, '', '', trip, pattern, '', '', 10, Math.max(0, mins - 30)];
    };
    const vehicle = (overrides = {}) => ({
      id: 'matrix-bus', line: '1', lineRef: '1', owner: '', operator: '', dest: 'Centre', journey: '',
      lat: stop.lat, lon: stop.lon, bearing: 90, ts: now, hist: [], cadence: 20, speed: 6,
      ...overrides
    });
    const evidence = trip => ({ score: 6, label: 'exact', journeyMatch: true, pathMatch: true, matchedTrip: trip });

    try {
      makeTimetable([row(10 * 60000, 'EARLY')]);
      const early = api.estimate(vehicle(), stop, evidence('EARLY'), { remaining: 720, passed: false });

      makeTimetable([row(-2 * 60000, 'LATE')]);
      const late = api.estimate(vehicle(), stop, evidence('LATE'), { remaining: 2880, passed: false });

      makeTimetable([]);
      const age30 = api.estimate(vehicle({ ts: now - 30 * 1000 }), stop, { score: 3, label: 'route' }, { remaining: 1200, passed: false });
      const age60 = api.estimate(vehicle({ ts: now - 60 * 1000 }), stop, { score: 3, label: 'route' }, { remaining: 1200, passed: false });
      const age120 = api.estimate(vehicle({ ts: now - 120 * 1000 }), stop, { score: 3, label: 'route' }, { remaining: 1200, passed: false });
      const stationary = api.estimate(vehicle({ speed: 0, stationaryAt: now - 60 * 1000, ts: now - 60 * 1000 }), stop, { score: 3, label: 'route' }, { remaining: 1200, passed: false });
      const missingSpeed = api.estimate(vehicle({ speed: null, ts: now - 60 * 1000 }), stop, { score: 3, label: 'route' }, { remaining: 1200, passed: false });

      const patternId = 'aa-pattern';
      state.timetable = {
        services: {}, tripPatterns: {}, patterns: {
          [patternId]: {
            p: [[52.5, -1.91], [52.5, -1.905], [52.5, -1.9]],
            s: [
              ['START', 'Start', 52.5, -1.91, 1],
              ['MID', 'Middle', 52.5, -1.905, 2],
              ['STOP', 'Matrix Stop', 52.5, -1.9, 3]
            ]
          }
        }
      };
      state.timetableRun += 1;
      const movingModel = api.etaMotionModel(vehicle({
        lat: 52.5, lon: -1.909, progressPattern: patternId, feedSpeed: 6
      }), stop);
      const sampledModel = api.etaMotionModel(vehicle({
        lat: 52.5, lon: -1.909, progressPattern: patternId, feedSpeed: null, motionSpeed: 6
      }), stop);

      state.ttStop = { id: 'STOP', d: [row(5 * 60000, 'PATTERN-A', '9', 'Centre', patternId), row(15 * 60000, 'PATTERN-B', '9', 'Centre', patternId)] };
      state.timetable.tripPatterns = { 'PATTERN-A': patternId, 'PATTERN-B': patternId };
      state.timetableRun += 1;
      const inferenceBus = vehicle({
        id: 'pattern-bus', line: '9', lineRef: '9', journey: '', dest: 'Centre', speed: 6,
        lat: 52.5, lon: -1.907, ts: now,
        hist: [
          { lat: 52.5, lon: -1.9095, ts: now - 30000 },
          { lat: 52.5, lon: -1.907, ts: now }
        ]
      });
      const inference = api.inferVehicleJourneyPattern(inferenceBus, stop, now);
      const inferredEvidence = api.inferredRouteEvidence({ score: 3, label: 'route', journeyMatch: false, pathMatch: false }, inference);
      const scan = inference && api.inferredRouteScanMatch({ matches: [
        { trip: 'PATTERN-A', line: '9', head: 'Centre', pattern: inference.pattern, at: now + 5 * 60000, originAt: null },
        { trip: 'PATTERN-B', line: '9', head: 'Centre', pattern: inference.pattern, at: now + 15 * 60000, originAt: null }
      ] }, inferenceBus, now);

      state.stop = stop;
      state.dir = 'all';
      state.destFilter = null;
      const outageVehicle = {
        id: 'outage',
        lastShownSnapshot: { secs: 300, confidence: 'high' },
        lastShownStopId: 'STOP',
        lastShownBoardDir: 'all',
        lastShownDestFilter: '',
        lastShownAt: now - 90000,
        lastShownArrivalAt: now + 5 * 60000
      };
      const outage = api.retainedSnapshotRow(outageVehicle, now, true);

      const ambiguityDevice = api.stopSelectionNeedsChoice([
        { id: 'A', d: 18 }, { id: 'B', d: 42 }, { id: 'C', d: 90 }
      ], { source: 'device', accuracy: 55, label: 'My location' });
      const ambiguityManual = api.stopSelectionNeedsChoice([
        { id: 'A', d: 18 }, { id: 'B', d: 42 }
      ], { source: 'manual', accuracy: 55, label: 'High Street' });

      return {
        earlySecs: early.secs,
        earlyLiveSecs: early.liveSecs,
        lateSecs: late.secs,
        lateLiveSecs: late.liveSecs,
        age30: { delayed: age30.predictionDelayed, confidence: age30.confidence, age: age30.gpsAge },
        age60: { delayed: age60.predictionDelayed, confidence: age60.confidence, age: age60.gpsAge },
        age120: { delayed: age120.predictionDelayed, confidence: age120.confidence, age: age120.gpsAge },
        stationary: { mode: stationary.speedMode, dwell: stationary.dwellSeconds, stationary: stationary.stationary, secs: stationary.secs },
        missingSpeed: { mode: missingSpeed.speedMode, dwell: missingSpeed.dwellSeconds, secs: missingSpeed.secs },
        movingModel,
        sampledModel,
        inference: inference && { trip: inference.trip, patternOnly: inference.patternOnly, candidates: inference.tripCandidates, patternId: inference.patternId },
        inferredEvidence: { journeyMatch: inferredEvidence.journeyMatch, matchedTrip: inferredEvidence.matchedTrip, pathMatch: inferredEvidence.pathMatch },
        scan: scan && { trip: scan.trip, patternOnly: scan.patternOnly, candidates: scan.tripCandidates },
        outage: outage && { gpsLost: outage.gpsLost, confidence: outage.confidence },
        ambiguityDevice,
        ambiguityManual,
        legacyDevice: api.savedOriginSource({ label: 'My location' }),
        legacyManual: api.savedOriginSource({ label: 'High Street' })
      };
    } finally {
      Object.assign(state, saved);
    }
  });

  assert.ok(matrix.earlyLiveSecs < 3 * 60, 'fresh GPS early-bus baseline should be about two minutes');
  assert.ok(matrix.earlySecs < 3 * 60, 'a ten-minute schedule must not drag a fresh two-minute GPS ETA far from live geometry');
  assert.ok(matrix.lateLiveSecs > 7 * 60, 'late-bus GPS baseline should remain around eight minutes');
  assert.ok(matrix.lateSecs > 7 * 60, 'a past static schedule must not pull a late live bus close to due');
  assert.equal(matrix.age30.delayed, false, '30-second GPS should still be prediction-fresh at a 20-second cadence');
  assert.equal(matrix.age60.delayed, true, '60-second GPS should already be prediction-delayed at a 20-second cadence');
  assert.equal(matrix.age120.delayed, true, '120-second GPS may be retained but must not remain prediction-fresh');
  assert.equal(matrix.age60.confidence, 'low');
  assert.equal(matrix.age120.confidence, 'low');
  assert.equal(matrix.stationary.mode, 'average');
  assert.equal(matrix.stationary.dwell, 0, 'stationary fallback uses an all-stops average and must not add dwell twice');
  assert.equal(matrix.stationary.stationary, true);
  assert.ok(Number.isFinite(matrix.stationary.secs));
  assert.equal(matrix.missingSpeed.mode, 'average');
  assert.equal(matrix.missingSpeed.dwell, 0, 'missing-speed fallback must not add dwell to an average that already includes stops');
  assert.ok(Number.isFinite(matrix.missingSpeed.secs));
  assert.ok(matrix.stationary.secs > matrix.missingSpeed.secs, 'known stationary GPS must not receive moving age extrapolation');
  assert.ok(matrix.movingModel.remainingStops >= 1, 'moving-speed model should see the intermediate stop');
  if (expectsSpeedProvenance) {
    assert.ok(matrix.movingModel.dwell >= 18, 'instantaneous feed speed should add stop-based dwell');
    assert.equal(matrix.movingModel.mode, 'feed-speed');
    assert.ok(matrix.sampledModel.remainingStops >= 1, 'GPS-average model should see the intermediate stop');
    assert.equal(matrix.sampledModel.dwell, 0, 'GPS interval-average speed must not add dwell a second time');
    assert.equal(matrix.sampledModel.mode, 'gps-average');
  } else {
    assert.ok(matrix.movingModel.dwell >= 18, 'legacy moving-speed model should add stop-based dwell');
    assert.equal(matrix.movingModel.mode, 'moving');
  }
  assert.equal(matrix.inference?.patternOnly, true);
  assert.equal(matrix.inference?.trip, '', 'same-pattern geometry must not choose one successive timetable trip');
  assert.deepEqual(matrix.inference?.candidates?.sort(), ['PATTERN-A', 'PATTERN-B']);
  assert.equal(matrix.inferredEvidence.journeyMatch, false);
  assert.equal(matrix.inferredEvidence.matchedTrip, '');
  assert.equal(matrix.inferredEvidence.pathMatch, true);
  assert.equal(matrix.scan?.patternOnly, true, 'distant scan inference must also remain pattern-only');
  assert.equal(matrix.scan?.trip, '');
  assert.equal(matrix.outage?.gpsLost, true);
  assert.equal(matrix.outage?.confidence, 'low');
  assert.equal(matrix.ambiguityDevice, true, 'two stands inside device accuracy must require a choice');
  assert.equal(matrix.ambiguityManual, false, 'an explicit searched location must not be treated as uncertain device GPS');
  assert.equal(matrix.legacyDevice, 'device');
  assert.equal(matrix.legacyManual, 'manual');
  await context.close();

  const expectedClock = {
    springBefore: '2026-03-28T12:00:00.000Z',
    springAfter: '2026-03-29T11:00:00.000Z',
    autumnBefore: '2026-10-24T11:00:00.000Z',
    autumnAfter: '2026-10-25T12:00:00.000Z',
    springGap0130: '2026-03-29T00:30:00.000Z',
    autumnRepeated0130: '2026-10-25T01:30:00.000Z',
    displayedSpringNoon: '12:00'
  };
  for (const timezoneId of ['Europe/London', 'America/New_York', 'UTC']) {
    const pair = await newPage(timezoneId);
    const clock = await pair.page.evaluate(() => {
      const api = window.__KERBSIDE_TEST__;
      const atNoon = iso => api.serviceDepartureTime(api.ukServiceDate(new Date(iso)), 12 * 60).toISOString();
      return {
        springBefore: atNoon('2026-03-28T12:00:00Z'),
        springAfter: atNoon('2026-03-29T12:00:00Z'),
        autumnBefore: atNoon('2026-10-24T12:00:00Z'),
        autumnAfter: atNoon('2026-10-25T12:00:00Z'),
        springGap0130: api.serviceDepartureTime(api.ukServiceDate(new Date('2026-03-29T12:00:00Z')), 90).toISOString(),
        autumnRepeated0130: api.serviceDepartureTime(api.ukServiceDate(new Date('2026-10-25T12:00:00Z')), 90).toISOString(),
        displayedSpringNoon: api.formatClock(api.serviceDepartureTime(api.ukServiceDate(new Date('2026-03-29T12:00:00Z')), 12 * 60).getTime())
      };
    });
    assert.deepEqual(clock, expectedClock, `UK timetable clock changed in browser timezone ${timezoneId}`);
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
    await pair.context.close();
  }

  {
    const pair = await newPage('Europe/London', true);
    await pair.page.waitForFunction(() => window.__KERBSIDE_GEO_MOCK__?.calls === 1);
    await pair.page.locator('#q').fill('x');
    const cancelled = await pair.page.evaluate(() => ({
      cleared: window.__KERBSIDE_GEO_MOCK__.cleared,
      origin: window.__KERBSIDE_TEST__.liveState.origin
    }));
    assert.ok(cancelled.cleared >= 1, 'manual typing must clear the pending device watch');
    await pair.page.evaluate(() => {
      window.__KERBSIDE_GEO_MOCK__.success?.({
        coords: { latitude: 51.5, longitude: -0.12, accuracy: 10 }, timestamp: Date.now()
      });
    });
    const lateOrigin = await pair.page.evaluate(() => window.__KERBSIDE_TEST__.liveState.origin);
    assert.equal(lateOrigin, null, 'a late cancelled GPS callback must not overwrite manual location state');
    await pair.context.close();
  }

  {
    const pair = await newPage('Europe/London', true);
    await pair.page.evaluate(() => localStorage.setItem('kerbside.v2', JSON.stringify({
      remember: true, demo: true,
      origin: { lat: 51.5, lon: -0.12, label: 'My location', accuracy: 18, source: 'device' },
      stopId: 'OLD'
    })));
    await pair.page.reload({ waitUntil: 'domcontentloaded' });
    await pair.page.waitForFunction(() => Boolean(window.__KERBSIDE_TEST__) && window.__KERBSIDE_GEO_MOCK__?.calls === 1);
    const beforeFix = await pair.page.evaluate(() => window.__KERBSIDE_TEST__.liveState.origin);
    assert.equal(beforeFix, null, 'saved device coordinates must not be treated as a current fix');
    await pair.page.evaluate(() => {
      window.__KERBSIDE_GEO_MOCK__.success?.({
        coords: { latitude: 52.48, longitude: -1.89, accuracy: 20 }, timestamp: Date.now()
      });
    });
    await pair.page.waitForFunction(() => window.__KERBSIDE_TEST__.liveState.origin?.source === 'device');
    const current = await pair.page.evaluate(() => window.__KERBSIDE_TEST__.liveState.origin);
    assert.ok(Math.abs(current.lat - 52.48) < 1e-9);
    assert.equal(current.source, 'device');
    await pair.context.close();
  }

  {
    const pair = await newPage('Europe/London', true);
    await pair.page.evaluate(() => localStorage.setItem('kerbside.v2', JSON.stringify({
      remember: true, demo: true,
      origin: { lat: 52.1, lon: -2.1, label: 'High Street', accuracy: null, source: 'manual' },
      stopId: null
    })));
    await pair.page.reload({ waitUntil: 'domcontentloaded' });
    await pair.page.waitForFunction(() => window.__KERBSIDE_TEST__.liveState.origin?.source === 'manual');
    const restored = await pair.page.evaluate(() => ({
      origin: window.__KERBSIDE_TEST__.liveState.origin,
      calls: window.__KERBSIDE_GEO_MOCK__.calls
    }));
    assert.equal(restored.origin.label, 'High Street');
    assert.equal(restored.origin.source, 'manual');
    assert.equal(restored.calls, 0, 'saved manual location must not be replaced by an automatic device lookup');
    await pair.context.close();
  }

  assert.deepEqual(pageErrors, []);
  console.log('Kerbside accuracy hardening regressions passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
