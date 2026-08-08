import test from 'node:test';
import assert from 'node:assert/strict';
import { gtfsRealtimeBoundingBox, parseGtfsRealtimeVehicleFeed } from '../src/gtfs-realtime.js';

const join = (...chunks) => {
  const arrays = chunks.map(chunk => chunk instanceof Uint8Array ? chunk : Uint8Array.from(chunk));
  const out = new Uint8Array(arrays.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of arrays) { out.set(chunk, offset); offset += chunk.length; }
  return out;
};
function varint(value) {
  const out = [];
  let number = Math.max(0, Math.floor(Number(value) || 0));
  do {
    let byte = number % 128;
    number = Math.floor(number / 128);
    if (number) byte |= 0x80;
    out.push(byte);
  } while (number);
  return Uint8Array.from(out);
}
const tag = (field, wire) => varint(field * 8 + wire);
const bytes = (field, body) => join(tag(field, 2), varint(body.length), body);
const string = (field, value) => bytes(field, new TextEncoder().encode(value));
const integer = (field, value) => join(tag(field, 0), varint(value));
function float(field, value) {
  const body = new Uint8Array(4);
  new DataView(body.buffer).setFloat32(0, value, true);
  return join(tag(field, 5), body);
}
function fixture() {
  const trip = join(string(1, 'trip-61-1945'), string(2, '19:45:00'), string(3, '20260808'), string(5, 'route-61'), integer(6, 1));
  const position = join(float(1, 52.45), float(2, -1.96), float(3, 180), float(5, 8.5));
  const vehicle = join(string(1, 'veh-123'), string(2, 'Fleet 123'));
  const vehiclePosition = join(bytes(1, trip), bytes(2, position), integer(3, 17), integer(5, 1786218000), string(7, 'stop-17'), bytes(8, vehicle));
  const entity = join(string(1, 'entity-1'), bytes(4, vehiclePosition));
  const header = join(string(1, '2.0'), integer(3, 1786218000));
  return join(bytes(1, header), bytes(2, entity));
}

test('converts Kerbside bbox order to the BODS GTFS-RT order', () => {
  assert.equal(gtfsRealtimeBoundingBox('-2.20000,52.40000,-2.00000,52.60000'), '52.40000,52.60000,-2.20000,-2.00000');
});

test('decodes matched trip and physical vehicle identity from GTFS-Realtime', () => {
  const parsed = parseGtfsRealtimeVehicleFeed(fixture());
  assert.equal(parsed.header.version, '2.0');
  assert.equal(parsed.vehicles.length, 1);
  const vehicle = parsed.vehicles[0];
  assert.equal(vehicle.entityId, 'entity-1');
  assert.equal(vehicle.vehicleId, 'veh-123');
  assert.equal(vehicle.tripId, 'trip-61-1945');
  assert.equal(vehicle.routeId, 'route-61');
  assert.equal(vehicle.startTime, '19:45:00');
  assert.equal(vehicle.startDate, '20260808');
  assert.equal(vehicle.stopId, 'stop-17');
  assert.equal(vehicle.currentStopSequence, 17);
  assert.equal(vehicle.timestamp, 1786218000);
  assert.ok(Math.abs(vehicle.lat - 52.45) < 0.0001);
  assert.ok(Math.abs(vehicle.lon + 1.96) < 0.0001);
});

test('rejects malformed protobuf without manufacturing identity', () => {
  assert.throws(() => parseGtfsRealtimeVehicleFeed(new Uint8Array([0x12, 0x00])), /header/);
});
