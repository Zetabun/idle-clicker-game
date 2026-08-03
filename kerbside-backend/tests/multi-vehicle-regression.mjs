import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..', '..');
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.png', 'image/png'], ['.svg', 'image/svg+xml']
]);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname === '/' ? 'bus.html' : pathname.replace(/^\/+/, '');
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) && target !== path.join(root, 'bus.html')) throw new Error('outside root');
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': types.get(path.extname(target)) || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const browser = await webkit.launch({ headless: true });
const page = await browser.newPage({ timezoneId: 'Europe/London' });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(`http://127.0.0.1:${port}/bus.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__KERBSIDE_TEST__), null, { timeout: 20000 });

  const result = await page.evaluate(() => {
    const api = window.__KERBSIDE_TEST__;
    const state = api.liveState;
    const now = Date.now();
    const saved = {
      stop: state.stop, origin: state.origin, anchor: state.anchor, dir: state.dir,
      onlyServing: state.onlyServing, destFilter: state.destFilter, ttStop: state.ttStop,
      timetable: state.timetable, timetableRun: state.timetableRun, vehicles: state.vehicles,
      hideAway: state.hideAway, demo: state.demo, liveDiag: state.liveDiag,
      filterFellBack: state.filterFellBack, timetableSource: state.timetableSource,
      timetableRegion: state.timetableRegion, lastRouteScan: state.lastRouteScan,
      routeScanBoxes: state.routeScanBoxes, routeScanPatterns: state.routeScanPatterns,
      routeScanVehicles: state.routeScanVehicles, routeScanError: state.routeScanError
    };

    const wrap = content => `<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery>${content}</VehicleMonitoringDelivery></ServiceDelivery></Siri>`;
    const activity = (index, time = now - index * 1000) => `<VehicleActivity>
      <ItemIdentifier>route-61-activity-${index}</ItemIdentifier>
      <RecordedAtTime>${new Date(time).toISOString()}</RecordedAtTime>
      <MonitoredVehicleJourney><LineRef>61</LineRef><PublishedLineName>61</PublishedLineName>
      <OperatorRef>OP-FIVE</OperatorRef><VehicleRef>SHARED-FLEET-CODE</VehicleRef>
      <DatedVehicleJourneyRef>SHARED-JOURNEY-CODE</DatedVehicleJourneyRef>
      <DestinationName>Town Centre</DestinationName>
      <OriginAimedDepartureTime>${new Date(now + (index - 1) * 10 * 60000).toISOString()}</OriginAimedDepartureTime>
      <VehicleLocation><Longitude>-2.1000</Longitude><Latitude>${52.4988 + index * 0.00012}</Latitude></VehicleLocation>
      <Bearing>0</Bearing><Velocity>6</Velocity></MonitoredVehicleJourney></VehicleActivity>`;

    try {
      const parsed = api.parseLivePayloads([{ text: wrap([1, 2, 3, 4, 5].map(index => activity(index)).join('')) }], now);
      const clock = new Date(now);
      const base = clock.getHours() * 60 + clock.getMinutes() + 4;
      state.stop = { id: 'multi-bus-stop', lat: 52.5, lon: -2.1, name: 'Multi bus stop', d: 0 };
      state.origin = { lat: 52.5, lon: -2.1, label: 'Test' };
      state.anchor = null; state.dir = 'all'; state.onlyServing = true;
      state.destFilter = null; state.hideAway = true; state.demo = false; state.vehicles = new Map();
      state.ttStop = { id: 'multi-bus-stop', d: [1, 2, 3, 4, 5].map(index => [
        base + (index - 1) * 10, '61', 'Town Centre', 'daily', '', 'SHARED-JOURNEY-CODE', ''
      ]) };
      state.timetable = { services: { daily: { days: '1111111', start: '20260101', end: '20261231', add: [], remove: [] } }, tripPatterns: {}, patterns: {} };
      state.timetableRun = Number(state.timetableRun || 0) + 1;
      api.ingest(parsed.vehicles);
      const partial = api.parseLivePayloads([{ text: wrap(activity(3, now + 15000)) }], now + 15000);
      api.ingest(partial.vehicles);
      const rows = api.relevant();

      const trips = [1, 2, 3, 4, 5].map(index => `corridor-trip-${index}`);
      const patternId = 'aa68multivehiclepattern';
      const due = [55, 42, 28, 17, 7];
      state.stop = { id: 'corridor-stop', timetableId: 'corridor-stop', lat: 52.54, lon: -2.1, name: 'Corridor stop', d: 0 };
      state.origin = { lat: 52.54, lon: -2.1, label: 'Corridor stop' };
      state.dir = 'all'; state.vehicles = new Map(); state.lastRouteScan = 0;
      state.ttStop = { id: 'corridor-stop', d: trips.map((trip, index) => [
        base + due[index], '9', 'Town Centre', 'daily', '', trip, patternId
      ]) };
      state.timetable = {
        services: { daily: { days: '1111111', start: '20260101', end: '20261231', add: [], remove: [] } },
        tripPatterns: Object.fromEntries(trips.map(trip => [trip, patternId])),
        patterns: { [patternId]: { p: [[52.20, -2.1], [52.30, -2.1], [52.36, -2.1], [52.42, -2.1], [52.47, -2.1], [52.51, -2.1], [52.54, -2.1], [52.60, -2.1]], s: [['start', 'Start', 52.20, -2.1], ['corridor-stop', 'Corridor stop', 52.54, -2.1], ['end', 'End', 52.60, -2.1]], g: 1 } }
      };
      state.timetableSource = 'national'; state.timetableRegion = 'west_midlands'; state.timetableRun++;
      const plans = api.routeScanPlans(now);
      const positions = [52.30, 52.36, 52.42, 52.47, 52.51];
      const accepted = positions.map((lat, index) => {
        const vehicle = {
          id: `CORRIDOR|activity|${index}`, journey: 'operator-private-block', vehicleRef: 'shared',
          line: '9', lineRef: '9', dest: 'Town Centre', operator: 'CORRIDOR', declaredDir: '',
          lat, lon: -2.1, bearing: 0, feedSpeed: 8, speed: 8, ts: now,
          timestampKnown: true, corridorTracked: false,
          hist: [{ lat: lat - 0.004, lon: -2.1, ts: now - 60000 }, { lat, lon: -2.1, ts: now }]
        };
        return plans.map(plan => api.matchRouteScanVehicle(plan, vehicle)).find(Boolean) || null;
      }).filter(Boolean);

      return {
        parsed: parsed.vehicles.length,
        collisions: parsed.identityCollisions,
        parsedIds: parsed.vehicles.map(vehicle => vehicle.id).sort(),
        partialId: partial.vehicles[0]?.id,
        storedAfterPartial: state.vehicles.size,
        shown: rows.length,
        shownLines: [...new Set(rows.map(row => row.v.line))],
        accepted: accepted.length,
        distinctTrips: new Set(accepted.map(vehicle => vehicle.corridorTrip)).size,
        inferred: accepted.every(vehicle => vehicle.inferredTrip && vehicle.corridorTracked)
      };
    } finally {
      Object.assign(state, saved);
    }
  });

  const expectedIds = [1, 2, 3, 4, 5].map(index => `OP-FIVE|journey|SHARED-JOURNEY-CODE|vehicle|SHARED-FLEET-CODE|activity|item|route-61-activity-${index}`);
  assert.equal(result.parsed, 5);
  assert.equal(result.collisions, 4);
  assert.deepEqual(result.parsedIds, expectedIds);
  assert.equal(result.partialId, expectedIds[2]);
  assert.equal(result.storedAfterPartial, 5);
  assert.equal(result.shown, 5);
  assert.deepEqual(result.shownLines, ['61']);
  assert.equal(result.accepted, 5);
  assert.equal(result.distinctTrips, 5);
  assert.equal(result.inferred, true);
  assert.deepEqual(pageErrors, []);
  console.log('Kerbside multi-vehicle regression passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
