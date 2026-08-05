import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as playwright from 'playwright';

const ENGINE_NAME = process.env.KERBSIDE_BROWSER || 'webkit';
const engine = playwright[ENGINE_NAME];
if (!engine || typeof engine.launch !== 'function') throw new Error(`Unsupported browser engine: ${ENGINE_NAME}`);
console.log(`Audit regression engine: ${ENGINE_NAME}`);

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
    const api = window.__KERBSIDE_TEST__;
    const state = api.liveState;
    const saved = {
      stop: state.stop,
      ttStop: state.ttStop,
      timetable: state.timetable,
      timetableSource: state.timetableSource,
      timetableFallback: state.timetableFallback,
      ttError: state.ttError,
      timetableRun: state.timetableRun,
      onlyServing: state.onlyServing,
      selected: state.selected,
      vehicles: state.vehicles
    };
    try {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes() + 10;
      state.stop = { id: 'STOP', name: 'Audit Stop', lat: 52.5, lon: -1.9 };
      state.ttStop = {
        id: 'STOP',
        d: [
          [minutes, '1', 'Town Centre', '', '', 'TRIP-A', '', 'ROUTE-A', 'OP-A', 10],
          [minutes + 1, '1', 'Other Branch', '', '', 'TRIP-B', '', 'ROUTE-B', 'OP-B', 20]
        ]
      };
      state.timetable = { services: {}, tripPatterns: {}, patterns: {} };
      state.timetableSource = 'national';
      state.timetableFallback = false;
      state.ttError = null;
      state.timetableRun = Number(state.timetableRun || 0) + 1;
      state.selected = null;
      api.setServingForTest({ STOP: { '2': { last: Date.now(), count: 2, vehicles: ['x', 'y'], confirmed: true, source: 'observed' } } });

      /* The shipping data does not put these two identifiers in the same
         namespace: the national GTFS export labels every route with an opaque
         BODS agency id (OP539) while SIRI-VM publishes a National Operator
         Code (BNSM). Reading that as a different operator rejected every
         timetable row for every live bus in 0.6.93 and 0.6.94 — no route
         evidence, no buses on the map, every scheduled row reporting
         "no unique journey match". An opaque id must abstain, not object. */
      const opaqueRow = { line: '1', trip: 'TRIP-A', head: 'Town Centre', routeId: '10423673', operator: 'OP539' };
      const nocVehicle = { owner: 'BNSM', operator: 'BNSM', lineRef: '1' };
      const opaqueAgreement = api.routeIdentityAgreement(opaqueRow, nocVehicle);
      const opaqueIdentityRows = api.timetableIdentityRows([opaqueRow], nocVehicle);
      const comparableConflict = api.routeIdentityAgreement({ operator: 'BNML', routeId: 'R1' }, nocVehicle);

      /* A bus terminating at the selected stop serves it by definition, but the
         departure rows at a stand are its onward journeys, so every headsign
         there is an outbound terminus and none can match. Two buses inbound to
         Piccadilly Gardens itself were scored 1 and dropped from the board and
         the map. The admission is narrow: only a destination that resolves to
         this stop's own name, never merely an unmatched one. */
      const terminatingHere = api.routeEvidence('1', 'Audit Stop', '', { owner: 'OP-A', operator: 'OP-A', lineRef: 'ROUTE-A' });
      const unrelatedDestination = api.routeEvidence('1', 'Southport', '', { owner: 'OP-A', operator: 'OP-A', lineRef: 'ROUTE-A' });

      const wrongBranch = api.routeEvidence('1', 'Other Branch', '', { owner: 'OP-A', operator: 'OP-A', lineRef: 'ROUTE-A' });
      const correctOperator = api.routeEvidence('1', 'Other Branch', '', { owner: 'OP-B', operator: 'OP-B', lineRef: 'ROUTE-B' });
      const displayFallback = api.routeEvidence('1', 'Town Centre', '', {});
      const observedAgainstTimetable = api.routeEvidence('2', 'Anywhere', '', { owner: 'OP-Z', operator: 'OP-Z', lineRef: '2' });

      const vehicles = new Map([
        ['wrong', { id: 'wrong', line: '1', lineRef: 'ROUTE-A', owner: 'OP-A', operator: 'OP-A', dest: 'Other Branch', journey: '', lat: 52.501, lon: -1.9, ts: Date.now(), corridorTracked: false }],
        ['right', { id: 'right', line: '1', lineRef: 'ROUTE-B', owner: 'OP-B', operator: 'OP-B', dest: 'Other Branch', journey: '', lat: 52.502, lon: -1.9, ts: Date.now(), corridorTracked: false }],
        ['observed', { id: 'observed', line: '2', lineRef: '2', owner: 'OP-Z', operator: 'OP-Z', dest: 'Anywhere', journey: '', lat: 52.503, lon: -1.9, ts: Date.now(), corridorTracked: false }]
      ]);
      state.vehicles = vehicles;
      state.onlyServing = true;
      const filteredIds = api.vehicleMarkerPlan([], Date.now()).draw.map(item => item.v.id).sort();
      state.onlyServing = false;
      const unfilteredIds = api.vehicleMarkerPlan([], Date.now()).draw.map(item => item.v.id).sort();

      const calls = [
        { id: 'STOP', sequence: 10, along: 0, lat: 52.5, lon: -1.9 },
        { id: 'MID', sequence: 15, along: 1000, lat: 52.51, lon: -1.89 },
        { id: 'STOP', sequence: 20, along: 2000, lat: 52.5, lon: -1.9 }
      ];
      const repeatedStopIndex = api.selectedPatternStopIndex(calls, state.stop, undefined, 20);

      const timingNow = Date.now();
      const timingLabel = api.liveTimingLabel({
        gpsLost: false,
        schedule: { at: timingNow + 10 * 60000 },
        secs: 15.8 * 60,
        liveSecs: 20 * 60
      });

      return {
        opaqueAgreement,
        opaqueRowsKept: opaqueIdentityRows.rows.length,
        opaqueConflict: opaqueIdentityRows.conflict,
        comparableConflict,
        terminatingHereScore: terminatingHere.score,
        terminatingHereLabel: terminatingHere.label,
        unrelatedDestinationScore: unrelatedDestination.score,
        // 0.6.93 moved the ordinary timetable-verified case from 4 to 3 but left
        // two consumers testing score>=4, so schedule blending fell from .32 to
        // .18 and scheduleBacked became unreachable. They read the flag now.
        displayFallbackTrusted: api.timetableTrusted(displayFallback),
        wrongBranchTrusted: api.timetableTrusted(wrongBranch),
        wrongBranchScore: wrongBranch.score,
        correctOperatorScore: correctOperator.score,
        displayFallbackScore: displayFallback.score,
        observedAgainstTimetableScore: observedAgainstTimetable.score,
        filteredIds,
        unfilteredIds,
        repeatedStopIndex,
        timingLabel
      };
    } finally {
      Object.assign(state, saved);
      api.setServingForTest({});
    }
  });

  assert.equal(result.opaqueAgreement, 0, 'an opaque BODS agency id cannot disagree with a SIRI operator code');
  assert.equal(result.opaqueRowsKept, 1, 'an opaque agency id must not discard the timetable row');
  assert.equal(result.opaqueConflict, false, 'incomparable operator namespaces are not a conflict');
  assert.equal(result.comparableConflict, -1, 'two real operator codes that differ still conflict');
  assert.ok(result.terminatingHereScore >= 2, 'a bus terminating at the selected stop must be admitted');
  assert.match(result.terminatingHereLabel, /terminates at this stop/);
  assert.equal(result.unrelatedDestinationScore, 1, 'an unmatched destination is not a terminus here');
  assert.equal(result.displayFallbackTrusted, true, 'a timetable-verified route must count as timetable-backed');
  assert.equal(result.wrongBranchTrusted, false, 'a rejected branch must not count as timetable-backed');
  assert.ok(result.wrongBranchScore < 2, 'a different operator branch must not be admitted by display line');
  assert.ok(result.correctOperatorScore >= 4, 'matching operator and route should be strongly verified');
  assert.equal(result.displayFallbackScore, 3, 'display line remains a weaker fallback');
  assert.equal(result.observedAgainstTimetableScore, 1, 'authoritative timetable must outrank observed dwell evidence');
  assert.deepEqual(result.filteredIds, ['right']);
  assert.deepEqual(result.unfilteredIds, ['observed', 'right', 'wrong']);
  assert.equal(result.repeatedStopIndex, 2);
  assert.equal(result.timingLabel, '10 min late');
  assert.deepEqual(pageErrors, []);
  console.log('Kerbside audit regressions passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
