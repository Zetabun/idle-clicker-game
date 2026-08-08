export function gtfsRealtimeBoundingBox(bbox) {
  const [minLon, minLat, maxLon, maxLat] = String(bbox || '').split(',');
  return [minLat, maxLat, minLon, maxLon].join(',');
}

function pbVarint(bytes, state) {
  let value = 0, shift = 0;
  while (state.i < bytes.length && shift <= 49) {
    const byte = bytes[state.i++];
    value += (byte & 0x7f) * 2 ** shift;
    if (!(byte & 0x80)) return value;
    shift += 7;
  }
  throw new Error('Invalid protobuf varint');
}

function pbSlice(bytes, state) {
  const length = pbVarint(bytes, state);
  const end = state.i + length;
  if (length < 0 || end > bytes.length) throw new Error('Invalid protobuf length');
  const out = bytes.subarray(state.i, end);
  state.i = end;
  return out;
}

function pbString(bytes, state) {
  return new TextDecoder().decode(pbSlice(bytes, state));
}

function pbFloat(bytes, state) {
  if (state.i + 4 > bytes.length) throw new Error('Invalid protobuf float');
  const value = new DataView(bytes.buffer, bytes.byteOffset + state.i, 4).getFloat32(0, true);
  state.i += 4;
  return value;
}

function pbSkip(bytes, state, wire) {
  if (wire === 0) { pbVarint(bytes, state); return; }
  if (wire === 1) state.i += 8;
  else if (wire === 2) { pbSlice(bytes, state); return; }
  else if (wire === 5) state.i += 4;
  else throw new Error('Unsupported protobuf wire type');
  if (state.i > bytes.length) throw new Error('Invalid protobuf field');
}

function parseTrip(bytes) {
  const state = { i: 0 }, out = {};
  while (state.i < bytes.length) {
    const tag = pbVarint(bytes, state), field = Math.floor(tag / 8), wire = tag & 7;
    if (wire === 2 && field === 1) out.tripId = pbString(bytes, state);
    else if (wire === 2 && field === 2) out.startTime = pbString(bytes, state);
    else if (wire === 2 && field === 3) out.startDate = pbString(bytes, state);
    else if (wire === 2 && field === 5) out.routeId = pbString(bytes, state);
    else if (wire === 0 && field === 6) out.directionId = pbVarint(bytes, state);
    else pbSkip(bytes, state, wire);
  }
  return out;
}

function parsePosition(bytes) {
  const state = { i: 0 }, out = {};
  while (state.i < bytes.length) {
    const tag = pbVarint(bytes, state), field = Math.floor(tag / 8), wire = tag & 7;
    if (wire === 5 && field === 1) out.lat = pbFloat(bytes, state);
    else if (wire === 5 && field === 2) out.lon = pbFloat(bytes, state);
    else if (wire === 5 && field === 3) out.bearing = pbFloat(bytes, state);
    else if (wire === 5 && field === 5) out.speed = pbFloat(bytes, state);
    else pbSkip(bytes, state, wire);
  }
  return out;
}

function parseVehicleDescriptor(bytes) {
  const state = { i: 0 }, out = {};
  while (state.i < bytes.length) {
    const tag = pbVarint(bytes, state), field = Math.floor(tag / 8), wire = tag & 7;
    if (wire === 2 && field === 1) out.vehicleId = pbString(bytes, state);
    else if (wire === 2 && field === 2) out.label = pbString(bytes, state);
    else if (wire === 2 && field === 3) out.licensePlate = pbString(bytes, state);
    else pbSkip(bytes, state, wire);
  }
  return out;
}

function parseVehiclePosition(bytes) {
  const state = { i: 0 }, out = {};
  while (state.i < bytes.length) {
    const tag = pbVarint(bytes, state), field = Math.floor(tag / 8), wire = tag & 7;
    if (wire === 2 && field === 1) Object.assign(out, parseTrip(pbSlice(bytes, state)));
    else if (wire === 2 && field === 2) Object.assign(out, parsePosition(pbSlice(bytes, state)));
    else if (wire === 0 && field === 3) out.currentStopSequence = pbVarint(bytes, state);
    else if (wire === 0 && field === 4) out.currentStatus = pbVarint(bytes, state);
    else if (wire === 0 && field === 5) out.timestamp = pbVarint(bytes, state);
    else if (wire === 2 && field === 7) out.stopId = pbString(bytes, state);
    else if (wire === 2 && field === 8) Object.assign(out, parseVehicleDescriptor(pbSlice(bytes, state)));
    else pbSkip(bytes, state, wire);
  }
  return out;
}

function parseEntity(bytes) {
  const state = { i: 0 }, out = {};
  while (state.i < bytes.length) {
    const tag = pbVarint(bytes, state), field = Math.floor(tag / 8), wire = tag & 7;
    if (wire === 2 && field === 1) out.entityId = pbString(bytes, state);
    else if (wire === 2 && field === 4) Object.assign(out, parseVehiclePosition(pbSlice(bytes, state)));
    else pbSkip(bytes, state, wire);
  }
  return out;
}

function parseHeader(bytes) {
  const state = { i: 0 }, out = {};
  while (state.i < bytes.length) {
    const tag = pbVarint(bytes, state), field = Math.floor(tag / 8), wire = tag & 7;
    if (wire === 2 && field === 1) out.version = pbString(bytes, state);
    else if (wire === 0 && field === 3) out.timestamp = pbVarint(bytes, state);
    else pbSkip(bytes, state, wire);
  }
  return out;
}

export function parseGtfsRealtimeVehicleFeed(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer || new ArrayBuffer(0));
  const state = { i: 0 }, vehicles = [];
  let header = null;
  while (state.i < bytes.length) {
    const tag = pbVarint(bytes, state), field = Math.floor(tag / 8), wire = tag & 7;
    if (wire === 2 && field === 1) header = parseHeader(pbSlice(bytes, state));
    else if (wire === 2 && field === 2) {
      const vehicle = parseEntity(pbSlice(bytes, state));
      if (vehicle.tripId && Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lon)) vehicles.push(vehicle);
    } else pbSkip(bytes, state, wire);
  }
  if (!header || !header.version) throw new Error('Invalid GTFS-Realtime feed header');
  return { header, vehicles };
}
