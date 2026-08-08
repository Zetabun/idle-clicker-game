import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as playwright from 'playwright';

const ENGINE_NAME = process.env.KERBSIDE_BROWSER || 'webkit';
const engine = playwright[ENGINE_NAME];
if (!engine || typeof engine.launch !== 'function') throw new Error(`Unsupported browser engine: ${ENGINE_NAME}`);
console.log(`Listing reliability regression engine: ${ENGINE_NAME}`);

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..', '..');
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

const browser = await engine.launch({ headless: true });
const page = await browser.newPage({ timezoneId: 'Europe/London' });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(`http://127.0.0.1:${port}/bus.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__KERBSIDE_TEST__), null, { timeout: 20000 });

  const result = await page.evaluate(() => {
    const api = window.__KERBSIDE_TEST__, state = api.liveState, now = Date.now();
    const saved = {
      stop: state.stop, ttStop: state.ttStop, timetable: state.timetable,
      timetableSource: state.timetableSource, timetableRegion: state.timetableRegion,
      timetableRun: state.timetableRun, dir: state.dir, destFilter: state.destFilter,
      lastFeedAt: state.lastFeedAt, feedFallback: state.feedFallback,
      feedPartial: state.feedPartial, interval: state.interval
    };
    try {
      const departure = new Date(now + 10 * 60000);
      const mins = departure.getHours() * 60 + departure.getMinutes();
      const trip = 'ETA-TRIP', pattern = 'ee-eta-pattern';
      state.stop = { id: 'ETA-END', timetableId: 'ETA-END', atco: '1800ETAEND', lat: 52.52, lon: -2.1, name: 'ETA End', d: 0 };
      state.ttStop = { id: 'ETA-END', d: [[mins, '61', 'ETA End', 'daily', 'in', trip, pattern, 'R61', 'BNSM', 3, mins - 20]] };
      state.timetable = {
        services: { daily: { days: '1111111', start: '20260101', end: '20261231', add: [], remove: [] } },
        tripPatterns: { [trip]: pattern },
        patterns: {
          [pattern]: {
            p: [[52.5, -2.1], [52.51, -2.1], [52.52, -2.1]],
            s: [['ETA-START', 'ETA Start', 52.5, -2.1], ['ETA-MIDDLE', 'ETA Middle', 52.51, -2.1], ['ETA-END', 'ETA End', 52.52, -2.1]],
            g: 1
          }
        }
      };
      state.timetableSource = 'national'; state.timetableRegion = 'west_midlands'; state.timetableRun++;
      state.dir = 'all'; state.destFilter = null; state.interval = 15;

      const schedule = api.timetableRows(new Date(now))
        .filter(row => row.trip === trip)
        .reduce((best, row) => !best || Math.abs(row.at - departure.getTime()) < Math.abs(best.at - departure.getTime()) ? row : best, null);
      if (!schedule || Math.abs(schedule.at - departure.getTime()) > 60000) throw new Error('ETA regression timetable row did not resolve to the intended departure');
      const snapshot = {
        v: null, dir: 'in', app: true, strength: 1, secs: 900, liveSecs: 900,
        metres: 1000, routeMetres: 1500, geometry: null, confidence: 'high', spread: 90,
        evidence: { score: 5 }, schedule, matchedSchedule: schedule, recovered: false,
        match: 'exact journey', directionLabel: 'Journey: inbound', directionWord: 'towards ETA End'
      };
      const vehicle = ageMs => ({
        id: 'retained', journey: trip, progressTrip: trip, progressPattern: pattern,
        line: '61', dest: 'ETA End', lat: 52.5, lon: -2.1, ts: now - ageMs,
        lastShownStopId: 'ETA-END', lastShownAt: now - 1000,
        lastShownArrivalAt: now + 15 * 60000, lastShownBoardDir: 'all', lastShownDestFilter: '',
        lastShownSnapshot: snapshot
      });

      state.lastFeedAt = now; state.feedFallback = false; state.feedPartial = false;
      const healthy = api.liveFeedHealthyForRetention(now);
      const healthyGrace = api.retainedGpsGraceMs(now);
      const keptHealthy = api.retainedSnapshotRow(vehicle(320000), now);
      const droppedHealthy = api.retainedSnapshotRow(vehicle(340000), now);
      const scheduleClaimed = api.scheduleClaimedByLive(keptHealthy);
      const duplicateScheduledRows = api.scheduledBoardRows([keptHealthy])
        .filter(row => row && row.schedule && row.schedule.trip === schedule.trip && row.schedule.at === schedule.at).length;
      const plainLostClaims = api.scheduleClaimedByLive({ gpsLost: true, schedule });
      const pastSchedule = { ...schedule, at: now - 1000 };
      const pastVehicle = vehicle(320000);
      pastVehicle.lastShownSnapshot = { ...snapshot, schedule: pastSchedule, matchedSchedule: pastSchedule };
      const heldPastSchedule = api.retainedSnapshotRow(pastVehicle, now);
      const pastScheduleFallback = !!(heldPastSchedule && heldPastSchedule.scheduleFallback);
      const pastScheduleClaimed = api.scheduleClaimedByLive(heldPastSchedule);

      state.lastFeedAt = now - 5 * 60000; state.feedFallback = true;
      const unhealthy = api.liveFeedHealthyForRetention(now);
      const outageGrace = api.retainedGpsGraceMs(now);
      const keptOutage = api.retainedSnapshotRow(vehicle(8 * 60000), now);

      const baseVehicle = {
        progressTrip: trip, progressPattern: pattern, lat: 52.5005, lon: -2.1,
        ts: now, stationaryAt: null, speed: 7
      };
      const feedModel = api.etaMotionModel({ ...baseVehicle, feedSpeed: 8, motionSpeed: 4 }, state.stop);
      const sampledModel = api.etaMotionModel({ ...baseVehicle, feedSpeed: NaN, motionSpeed: 4, speed: 4 }, state.stop);
      const averageModel = api.etaMotionModel({ ...baseVehicle, feedSpeed: NaN, motionSpeed: null, speed: null }, state.stop);

      return {
        healthy, unhealthy, healthyGrace, outageGrace,
        keptHealthy: !!keptHealthy,
        droppedHealthy: !!droppedHealthy,
        scheduleFallback: !!(keptHealthy && keptHealthy.scheduleFallback),
        fallbackSecs: keptHealthy && keptHealthy.secs,
        scheduledSecs: Math.max(0, (schedule.at - now) / 1000),
        scheduleClaimed, duplicateScheduledRows, plainLostClaims,
        pastScheduleFallback, pastScheduleClaimed,
        keptOutage: !!keptOutage,
        feedModel, sampledModel, averageModel
      };
    } finally {
      Object.assign(state, saved);
    }
  });

  assert.equal(result.healthy, true);
  assert.equal(result.unhealthy, false);
  assert.equal(result.healthyGrace, 90000);
  assert.equal(result.outageGrace, 360000);
  assert.equal(result.keptHealthy, true);
  assert.equal(result.droppedHealthy, false);
  assert.equal(result.scheduleFallback, true);
  assert.ok(Math.abs(result.fallbackSecs - result.scheduledSecs) < 2);
  assert.equal(result.scheduleClaimed, true);
  assert.equal(result.duplicateScheduledRows, 0);
  assert.equal(result.plainLostClaims, false);
  assert.equal(result.pastScheduleFallback, false);
  assert.equal(result.pastScheduleClaimed, false);
  assert.equal(result.keptOutage, true);

  assert.equal(result.feedModel.mode, 'feed-speed');
  assert.ok(result.feedModel.remainingStops >= 1);
  assert.ok(result.feedModel.dwell >= 18);
  assert.equal(result.sampledModel.mode, 'gps-average');
  assert.ok(result.sampledModel.remainingStops >= 1);
  assert.equal(result.sampledModel.dwell, 0);
  assert.equal(result.averageModel.mode, 'average');
  assert.equal(result.averageModel.dwell, 0);
  assert.deepEqual(pageErrors, []);
  console.log('Kerbside listing reliability regression checks passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
