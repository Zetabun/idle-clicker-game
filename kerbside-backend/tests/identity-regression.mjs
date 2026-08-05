import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as playwright from 'playwright';

/* Engine chosen by KERBSIDE_BROWSER, defaulting to WebKit, so this suite runs
   under the same engines as the main browser regression. */
const ENGINE_NAME = process.env.KERBSIDE_BROWSER || 'webkit';
const engine = playwright[ENGINE_NAME];
if (!engine || typeof engine.launch !== 'function') {
  throw new Error(`KERBSIDE_BROWSER=${ENGINE_NAME} is not a Playwright engine (expected webkit, chromium or firefox)`);
}
console.log(`Regression engine: ${ENGINE_NAME}`);

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..', '..');
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname === '/' ? 'bus.html' : pathname.replace(/^\/+/, '');
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) && target !== path.join(root, 'bus.html')) throw new Error('outside root');
    const body = await readFile(target);
    const type = path.extname(target) === '.css' ? 'text/css; charset=utf-8' : path.extname(target) === '.js' ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8';
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
    const now = Date.now();
    const savedVehicles = state.vehicles;
    const wrap = content => `<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery>${content}</VehicleMonitoringDelivery></ServiceDelivery></Siri>`;
    const activity = ({ operator, journey, vehicle, item, lat, time = now - 1000, validUntil, originTime, destinationTime }) => `<VehicleActivity>
      ${item == null ? '' : `<ItemIdentifier>${item}</ItemIdentifier>`}
      <RecordedAtTime>${new Date(time).toISOString()}</RecordedAtTime>
      ${validUntil == null ? '' : `<ValidUntilTime>${new Date(validUntil).toISOString()}</ValidUntilTime>`}
      <MonitoredVehicleJourney><LineRef>61</LineRef><PublishedLineName>61</PublishedLineName>
      <OperatorRef>${operator}</OperatorRef><VehicleRef>${vehicle}</VehicleRef><DatedVehicleJourneyRef>${journey}</DatedVehicleJourneyRef>
      <DestinationName>Town Centre</DestinationName>
      ${originTime == null ? '' : `<OriginAimedDepartureTime>${new Date(originTime).toISOString()}</OriginAimedDepartureTime>`}
      ${destinationTime == null ? '' : `<DestinationAimedArrivalTime>${new Date(destinationTime).toISOString()}</DestinationAimedArrivalTime>`}
      <VehicleLocation><Longitude>-2.1000</Longitude><Latitude>${lat}</Latitude></VehicleLocation>
      <Bearing>0</Bearing><Velocity>6</Velocity></MonitoredVehicleJourney></VehicleActivity>`;

    try {
      const together = api.parseLivePayloads([
        { text: wrap(activity({ operator: 'OP-TOGETHER', journey: 'J', vehicle: 'V', item: 'A', lat: 52.40 })) },
        { text: wrap(activity({ operator: 'OP-TOGETHER', journey: 'J', vehicle: 'V', item: 'B', lat: 52.42 })) }
      ], now);

      state.vehicles = new Map();
      const first = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-SEPARATE', journey: 'J', vehicle: 'V', item: 'A', lat: 52.40 })) }], now);
      api.ingest(first.vehicles);
      const second = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-SEPARATE', journey: 'J', vehicle: 'V', item: 'B', lat: 52.42 })) }], now + 1000);
      api.ingest(second.vehicles);
      const separateIds = [...state.vehicles.keys()].sort();

      const anonymous = api.parseLivePayloads([{ text: wrap(
        activity({ operator: 'OP-ANON', journey: 'J', vehicle: 'V', item: null, lat: 52.40 }) +
        activity({ operator: 'OP-ANON', journey: 'J', vehicle: 'V', item: null, lat: 52.42 })
      ) }], now);

      state.vehicles = new Map();
      const anonymousFirst = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-ANON-SEPARATE', journey: 'J', vehicle: 'V', item: null, lat: 52.40 })) }], now);
      api.ingest(anonymousFirst.vehicles);
      const anonymousSecond = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-ANON-SEPARATE', journey: 'J', vehicle: 'V', item: null, lat: 52.42 })) }], now + 1000);
      api.ingest(anonymousSecond.vehicles);
      const anonymousSeparateIds = [...state.vehicles.keys()].sort();

      // Two bunched buses on one route sharing a placeholder fleet code, 20s
      // and ~300m apart. That gap is exactly the window the anonymous slot
      // matcher uses to recognise a single vehicle's *next* report, so without
      // a guard the second bus claims the first bus's slot, both land on one
      // identity and the board loses a bus. The cases above all report at the
      // same instant, so none of them could catch this.
      const bunched = api.parseLivePayloads([{ text: wrap(
        activity({ operator: 'OP-BUNCHED', journey: 'J', vehicle: 'V', item: null, lat: 52.4000, time: now - 30000 }) +
        activity({ operator: 'OP-BUNCHED', journey: 'J', vehicle: 'V', item: null, lat: 52.4027, time: now - 10000 })
      ) }], now);

      // The other direction, which a blanket "never reuse a slot" guard breaks:
      // one bus seen by two of the overlapping bounding boxes the app fetches.
      // Same gap as the bunched pair, but split across payloads, so it must
      // still merge onto a single vehicle carrying the newer position.
      const overlappingBoxes = api.parseLivePayloads([
        { text: wrap(activity({ operator: 'OP-OVERLAP', journey: 'J', vehicle: 'V', item: null, lat: 52.5000, time: now - 30000 })) },
        { text: wrap(activity({ operator: 'OP-OVERLAP', journey: 'J', vehicle: 'V', item: null, lat: 52.5010, time: now - 10000 })) }
      ], now);

      const duplicate = api.parseLivePayloads([
        { text: wrap(activity({ operator: 'OP-DUP', journey: 'J', vehicle: 'V', item: null, lat: 52.40 })) },
        { text: wrap(activity({ operator: 'OP-DUP', journey: 'J', vehicle: 'V', item: null, lat: 52.40 })) }
      ], now);

      const expired = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-EXP', journey: 'J', vehicle: 'V', item: 'expired', lat: 52.40, validUntil: now - 1 })) }], now);
      const valid = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-VALID', journey: 'J', vehicle: 'V', item: 'valid', lat: 52.40, validUntil: now + 60000 })) }], now);

      return {
        togetherCount: together.vehicles.length,
        togetherSplit: together.vehicles.every(vehicle => vehicle.id.includes('|activity|item|')),
        togetherPayloads: together.vehicles.map(vehicle => vehicle.payloadIndexes),
        separateCount: separateIds.length,
        separatePromoted: separateIds.every(id => id.includes('|activity|item|')),
        anonymousCount: anonymous.vehicles.length,
        anonymousDistinct: new Set(anonymous.vehicles.map(vehicle => vehicle.id)).size,
        anonymousNamed: anonymous.vehicles.every(vehicle => vehicle.id.includes('|activity|anonymous|')),
        anonymousSeparateCount: anonymousSeparateIds.length,
        anonymousSeparatePromoted: anonymousSeparateIds.every(id => id.includes('|activity|anonymous|')),
        bunchedCount: bunched.vehicles.length,
        bunchedDistinct: new Set(bunched.vehicles.map(vehicle => vehicle.id)).size,
        bunchedNamed: bunched.vehicles.every(vehicle => vehicle.id.includes('|activity|anonymous|')),
        overlappingCount: overlappingBoxes.vehicles.length,
        overlappingLat: overlappingBoxes.vehicles[0]?.lat,
        duplicateCount: duplicate.vehicles.length,
        duplicatePayloads: duplicate.vehicles[0]?.payloadIndexes,
        expiredCount: expired.vehicles.length,
        expiredStale: expired.stale,
        validCount: valid.vehicles.length,
        validUntilStored: Number.isFinite(valid.vehicles[0]?.validUntilAt)
      };
    } finally {
      state.vehicles = savedVehicles;
    }
  });

  assert.equal(result.togetherCount, 2);
  assert.equal(result.togetherSplit, true);
  assert.deepEqual(result.togetherPayloads, [[0], [1]]);
  assert.equal(result.separateCount, 2);
  assert.equal(result.separatePromoted, true);
  assert.equal(result.anonymousCount, 2);
  assert.equal(result.anonymousDistinct, 2);
  assert.equal(result.anonymousNamed, true);
  assert.equal(result.anonymousSeparateCount, 2);
  assert.equal(result.anonymousSeparatePromoted, true);
  assert.equal(result.bunchedCount, 2);
  assert.equal(result.bunchedDistinct, 2);
  assert.equal(result.bunchedNamed, true);
  assert.equal(result.overlappingCount, 1);
  assert.equal(result.overlappingLat, 52.501);
  assert.equal(result.duplicateCount, 1);
  assert.deepEqual(result.duplicatePayloads, [0, 1]);
  assert.equal(result.expiredCount, 0);
  assert.equal(result.expiredStale, 1);
  assert.equal(result.validCount, 1);
  assert.equal(result.validUntilStored, true);
  assert.deepEqual(pageErrors, []);
  console.log('Kerbside cross-poll identity and producer-expiry regression passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
