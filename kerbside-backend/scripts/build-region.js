#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import crypto from 'node:crypto';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const [gtfsDir, regionArg, outArg] = process.argv.slice(2);
if (!gtfsDir || !regionArg || !outArg) {
  console.error('Usage: node scripts/build-region.js <gtfs-folder> <region> <output-folder>');
  process.exit(1);
}

const region = String(regionArg).trim().toLowerCase();
if (!/^[a-z_]+$/.test(region)) fail('Region must contain lower-case letters and underscores only.');
if (!fs.existsSync(gtfsDir) || !fs.statSync(gtfsDir).isDirectory()) fail(`GTFS folder not found: ${gtfsDir}`);

const outRoot = path.resolve(outArg);
const regionRoot = path.join(outRoot, 'regions', region);
const tileRoot = path.join(regionRoot, 'tiles');
const departureRoot = path.join(regionRoot, 'departures');
const patternRoot = path.join(regionRoot, 'patterns');
fs.rmSync(regionRoot, { recursive: true, force: true });
for (const directory of [tileRoot, departureRoot, patternRoot]) fs.mkdirSync(directory, { recursive: true });

const TILE_SIZE = 0.05;
const DEPARTURE_PREFIX_LENGTH = 2;
const PATTERN_PREFIX_LENGTH = 2;
const nowIso = new Date().toISOString();
const dbPath = path.join(os.tmpdir(), `kerbside-${region}-${process.pid}.sqlite`);
fs.rmSync(dbPath, { force: true });
const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode=OFF;
  PRAGMA synchronous=OFF;
  PRAGMA temp_store=MEMORY;
  PRAGMA cache_size=-200000;
  CREATE TABLE stop_times (
    tile TEXT NOT NULL,
    shard TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    trip_id TEXT NOT NULL,
    mins INTEGER NOT NULL,
    seq REAL NOT NULL
  );
  CREATE TABLE patterns (
    pattern_id TEXT PRIMARY KEY,
    coords TEXT NOT NULL
  );
  CREATE TABLE shape_points (
    shape_id TEXT NOT NULL,
    seq REAL NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL
  );
`);

const stops = new Map();
const routes = new Map();
const trips = new Map();
const services = new Map();
const tripPattern = new Map();
let stopTimeRows = 0;
let shapePointRows = 0;
let invalidTimes = 0;

function fail(message) {
  console.error(`\nFailed: ${message}\n`);
  try { db.close(); } catch {}
  try { fs.rmSync(dbPath, { force: true }); } catch {}
  process.exit(1);
}

function tileKey(lat, lon) {
  const y = Math.floor((Number(lat) + 90) / TILE_SIZE);
  const x = Math.floor((Number(lon) + 180) / TILE_SIZE);
  return `${y}-${x}`;
}

function splitCsv(line) {
  const out = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      out.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

async function eachRow(file, onRow, { optional = false } = {}) {
  const filename = path.join(gtfsDir, file);
  if (!fs.existsSync(filename)) {
    if (optional) return 0;
    throw new Error(`Missing ${file} in ${gtfsDir}`);
  }

  const input = fs.createReadStream(filename);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let headers = null;
  let count = 0;

  for await (const line of lines) {
    if (!line.trim()) continue;
    const cells = splitCsv(line);
    if (!headers) {
      headers = cells.map(value => value.trim().replace(/^\uFEFF/, ''));
      continue;
    }
    const row = {};
    for (let i = 0; i < headers.length; i++) row[headers[i]] = cells[i] == null ? '' : cells[i];
    await onRow(row, ++count);
  }
  return count;
}

function parseGtfsMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,3}):(\d{2})(?::\d{2})?$/);
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return Number.isFinite(hours) && minutes >= 0 && minutes <= 59 ? hours * 60 + minutes : NaN;
}

function dateKey(value) {
  const key = String(value || '').replace(/[^0-9]/g, '');
  return /^\d{8}$/.test(key) ? key : '';
}

function sequence(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function shortHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);
}

function departureShardKey(value) {
  return shortHash(String(value)).slice(0, DEPARTURE_PREFIX_LENGTH);
}

function writeJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(value));
}

function updateBounds(bounds, stop) {
  bounds[0] = Math.min(bounds[0], stop.lon);
  bounds[1] = Math.min(bounds[1], stop.lat);
  bounds[2] = Math.max(bounds[2], stop.lon);
  bounds[3] = Math.max(bounds[3], stop.lat);
}

async function main() {
  console.log(`[${region}] Reading stops...`);
  await eachRow('stops.txt', row => {
    const id = String(row.stop_id || '').trim();
    const lat = Number(row.stop_lat);
    const lon = Number(row.stop_lon);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    if (lat < 49 || lat > 61 || lon < -9 || lon > 3) return;
    stops.set(id, {
      name: row.stop_name || '',
      code: row.stop_code || '',
      sms: row.stop_code || '',
      ind: row.platform_code || '',
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6)),
      tile: tileKey(lat, lon)
    });
  });
  if (!stops.size) throw new Error('No valid stops found.');

  console.log(`[${region}] Reading routes, trips and service calendars...`);
  await eachRow('routes.txt', row => {
    const id = String(row.route_id || '').trim();
    if (id) routes.set(id, { line: row.route_short_name || row.route_long_name || id, routeId: id, operator: String(row.agency_id || '') });
  });

  await eachRow('trips.txt', row => {
    const id = String(row.trip_id || '').trim();
    if (!id) return;
    const route = routes.get(String(row.route_id || '')) || {};
    trips.set(id, {
      line: route.line || row.route_short_name || '',
      routeId: route.routeId || String(row.route_id || ''),
      operator: route.operator || '',
      head: row.trip_headsign || '',
      service: String(row.service_id || ''),
      direction: row.direction_id == null ? '' : String(row.direction_id),
      shape: String(row.shape_id || '').trim()
    });
  });

  await eachRow('calendar.txt', row => {
    const id = String(row.service_id || '').trim();
    if (!id) return;
    services.set(id, {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        .map(day => row[day] === '1' ? '1' : '0').join(''),
      start: dateKey(row.start_date),
      end: dateKey(row.end_date),
      add: [],
      remove: []
    });
  }, { optional: true });

  await eachRow('calendar_dates.txt', row => {
    const id = String(row.service_id || '').trim();
    const date = dateKey(row.date);
    if (!id || !date) return;
    const service = services.get(id) || { days: '0000000', start: '', end: '', add: [], remove: [] };
    if (String(row.exception_type) === '1') service.add.push(date);
    if (String(row.exception_type) === '2') service.remove.push(date);
    services.set(id, service);
  }, { optional: true });

  console.log(`[${region}] Importing optional GTFS route shapes...`);
  const insertShape = db.prepare('INSERT INTO shape_points(shape_id, seq, lat, lon) VALUES (?, ?, ?, ?)');
  db.exec('BEGIN');
  let shapeBatch = 0;
  await eachRow('shapes.txt', (row, number) => {
    const id = String(row.shape_id || '').trim();
    const lat = Number(row.shape_pt_lat);
    const lon = Number(row.shape_pt_lon);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    insertShape.run(id, sequence(row.shape_pt_sequence, number), lat, lon);
    shapePointRows++;
    shapeBatch++;
    if (shapeBatch >= 50000) {
      db.exec('COMMIT; BEGIN');
      shapeBatch = 0;
    }
  }, { optional: true });
  db.exec('COMMIT');
  if (shapePointRows) db.exec('CREATE INDEX idx_shape_sequence ON shape_points(shape_id, seq);');

  console.log(`[${region}] Importing stop_times into temporary SQLite...`);
  const insert = db.prepare('INSERT INTO stop_times(tile, shard, stop_id, trip_id, mins, seq) VALUES (?, ?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  let batch = 0;

  await eachRow('stop_times.txt', (row, number) => {
    const stopId = String(row.stop_id || '').trim();
    const tripId = String(row.trip_id || '').trim();
    const stop = stops.get(stopId);
    if (!stop || !trips.has(tripId)) return;
    const mins = parseGtfsMinutes(row.departure_time || row.arrival_time);
    if (!Number.isFinite(mins)) {
      invalidTimes++;
      return;
    }
    insert.run(stop.tile, departureShardKey(stopId), stopId, tripId, mins, sequence(row.stop_sequence, number));
    stopTimeRows++;
    batch++;
    if (batch >= 50000) {
      db.exec('COMMIT; BEGIN');
      batch = 0;
    }
    if (number % 2000000 === 0) console.log(`[${region}] ${(number / 1000000).toFixed(0)}M stop-time rows scanned...`);
  });
  db.exec('COMMIT');

  if (!stopTimeRows) throw new Error('No usable stop times found.');
  db.exec('CREATE INDEX idx_trip_sequence ON stop_times(trip_id, seq);');
  db.exec('CREATE INDEX idx_shard_stop_time ON stop_times(shard, stop_id, mins, trip_id);');

  console.log(`[${region}] Deduplicating ordered journey patterns and authoritative shapes...`);
  const putPattern = db.prepare('INSERT OR IGNORE INTO patterns(pattern_id, coords) VALUES (?, ?)');
  const readShape = db.prepare('SELECT lat, lon FROM shape_points WHERE shape_id = ? ORDER BY seq');
  const builtPatterns = new Set();
  let currentTrip = '';
  let sequenceStops = [];
  let shapedPatternCount = 0;

  function pointSegmentDistanceSquared(point, start, end) {
    const scaleX = 111320 * Math.cos(((point.lat + start.lat + end.lat) / 3) * Math.PI / 180);
    const px = point.lon * scaleX, py = point.lat * 111320;
    const ax = start.lon * scaleX, ay = start.lat * 111320;
    const bx = end.lon * scaleX, by = end.lat * 111320;
    const dx = bx - ax, dy = by - ay;
    const denom = dx * dx + dy * dy;
    const t = denom ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denom)) : 0;
    const x = ax + dx * t, y = ay + dy * t;
    return (px - x) ** 2 + (py - y) ** 2;
  }

  function simplifyShape(points, tolerance = 8) {
    if (points.length <= 2) return points;
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    const threshold = tolerance * tolerance;
    while (stack.length) {
      const [start, end] = stack.pop();
      let best = threshold, index = -1;
      for (let i = start + 1; i < end; i++) {
        const distance = pointSegmentDistanceSquared(points[i], points[start], points[end]);
        if (distance > best) { best = distance; index = i; }
      }
      if (index >= 0) {
        keep[index] = 1;
        stack.push([start, index], [index, end]);
      }
    }
    return points.filter((_, index) => keep[index]);
  }

  function flushPattern() {
    if (!currentTrip || sequenceStops.length < 2) {
      sequenceStops = [];
      return;
    }
    const trip = trips.get(currentTrip);
    const shapeId = String(trip && trip.shape || '');
    const signature = sequenceStops.map(call => `${call.seq}\u001d${call.id}`).join('\u001f') + '\u001e' + shapeId;
    const patternId = shortHash(signature);
    tripPattern.set(currentTrip, patternId);
    if (builtPatterns.has(patternId)) {
      sequenceStops = [];
      return;
    }
    const orderedStops = sequenceStops
      .map(call => [call, stops.get(call.id)])
      .filter(([, stop]) => Boolean(stop));
    let routePoints = [];
    if (shapeId && shapePointRows) {
      routePoints = [...readShape.iterate(shapeId)].map(row => ({ lat: Number(row.lat), lon: Number(row.lon) }));
    }
    const hasShape = routePoints.length >= 2;
    if (hasShape) routePoints = simplifyShape(routePoints);
    else routePoints = orderedStops.map(([, stop]) => ({ lat: stop.lat, lon: stop.lon }));
    if (routePoints.length >= 2 && orderedStops.length >= 2) {
      putPattern.run(patternId, JSON.stringify({
        p: routePoints.map(point => [Number(point.lat.toFixed(6)), Number(point.lon.toFixed(6))]),
        s: orderedStops.map(([call, stop]) => [call.id, stop.name, stop.lat, stop.lon, call.seq]),
        g: hasShape ? 1 : 0
      }));
      builtPatterns.add(patternId);
      if (hasShape) shapedPatternCount++;
    }
    sequenceStops = [];
  }

  for (const row of db.prepare('SELECT trip_id, stop_id, seq FROM stop_times ORDER BY trip_id, seq').iterate()) {
    if (row.trip_id !== currentTrip) {
      flushPattern();
      currentTrip = row.trip_id;
    }
    sequenceStops.push({ id: row.stop_id, seq: Number(row.seq) });
  }
  flushPattern();

  console.log(`[${region}] Writing compact pattern shards...`);
  let shardPrefix = '';
  let shard = {};
  let patternCount = 0;
  let maxPatternBytes = 0;

  function flushShard() {
    if (!shardPrefix) return;
    const filename = path.join(patternRoot, `${shardPrefix}.json`);
    writeJson(filename, {
      version: 4,
      built: nowIso,
      scope: 'pattern-shard',
      region,
      shard: shardPrefix,
      patterns: shard
    });
    maxPatternBytes = Math.max(maxPatternBytes, fs.statSync(filename).size);
    shard = {};
  }

  for (const row of db.prepare('SELECT pattern_id, coords FROM patterns ORDER BY pattern_id').iterate()) {
    const prefix = row.pattern_id.slice(0, PATTERN_PREFIX_LENGTH);
    if (prefix !== shardPrefix) {
      flushShard();
      shardPrefix = prefix;
    }
    shard[row.pattern_id] = JSON.parse(row.coords);
    patternCount++;
  }
  flushShard();

  console.log(`[${region}] Writing balanced departure shards...`);
  let currentShard = '';
  let currentStop = '';
  let departures = [];
  let shardStops = {};
  let shardServices = new Set();
  let shardTripPatterns = {};
  let activeStopCount = 0;
  let departureCount = 0;
  let departureShardCount = 0;
  let maxAssetBytes = 0;
  const activeStopIds = new Set();
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];

  function flushStop() {
    if (!currentStop || !departures.length) {
      departures = [];
      return;
    }
    const stop = stops.get(currentStop);
    const unique = [];
    let previous = '';
    for (const departure of departures) {
      const signature = departure.join('\u001f');
      if (signature === previous) continue;
      unique.push(departure);
      previous = signature;
    }
    shardStops[currentStop] = {
      n: stop.name,
      c: currentStop,
      sms: stop.sms,
      ind: stop.ind,
      ll: [stop.lat, stop.lon],
      d: unique
    };
    activeStopIds.add(currentStop);
    updateBounds(bounds, stop);
    activeStopCount++;
    departureCount += unique.length;
    departures = [];
  }

  function flushDepartureShard() {
    flushStop();
    if (!currentShard || !Object.keys(shardStops).length) {
      shardStops = {};
      shardServices = new Set();
      shardTripPatterns = {};
      return;
    }

    const serviceSubset = {};
    for (const id of shardServices) {
      const service = services.get(id);
      // Skipping this silently shipped a departure whose calendar was missing.
      // The browser cannot tell an absent calendar from an all-week one, so it
      // used to show the journey every day. Fail the build for this region
      // instead: the other regions run independently.
      if (!service) {
        throw new Error(`Shard ${currentShard}: departure references service_id "${id}" with no calendar entry. Refusing to publish a shard whose service calendar is incomplete.`);
      }
      serviceSubset[id] = {
        ...service,
        add: [...new Set(service.add)].sort(),
        remove: [...new Set(service.remove)].sort()
      };
    }

    const filename = path.join(departureRoot, `${currentShard}.json`);
    writeJson(filename, {
      version: 9,
      built: nowIso,
      scope: 'departure-shard',
      region,
      shard: currentShard,
      services: serviceSubset,
      stops: shardStops,
      tripPatterns: shardTripPatterns,
      patterns: {}
    });
    maxAssetBytes = Math.max(maxAssetBytes, fs.statSync(filename).size);
    departureShardCount++;
    shardStops = {};
    shardServices = new Set();
    shardTripPatterns = {};
  }

  for (const row of db.prepare('SELECT shard, stop_id, trip_id, mins, seq FROM stop_times ORDER BY shard, stop_id, mins, trip_id, seq').iterate()) {
    if (row.shard !== currentShard) {
      flushDepartureShard();
      currentShard = row.shard;
      currentStop = '';
    }
    if (row.stop_id !== currentStop) {
      flushStop();
      currentStop = row.stop_id;
    }
    const trip = trips.get(row.trip_id);
    if (!trip) continue;
    const patternId = tripPattern.get(row.trip_id) || '';
    departures.push([row.mins, trip.line, trip.head, trip.service, trip.direction, row.trip_id, patternId, trip.routeId, trip.operator, Number(row.seq)]);
    if (trip.service) shardServices.add(trip.service);
    if (patternId) shardTripPatterns[row.trip_id] = patternId;
  }
  flushDepartureShard();

  console.log(`[${region}] Writing lightweight stop-index tiles...`);
  const tileStops = new Map();
  for (const stopId of [...activeStopIds].sort()) {
    const stop = stops.get(stopId);
    if (!stop) continue;
    if (!tileStops.has(stop.tile)) tileStops.set(stop.tile, {});
    tileStops.get(stop.tile)[stopId] = {
      n: stop.name,
      c: stopId,
      sms: stop.sms,
      ind: stop.ind,
      ll: [stop.lat, stop.lon],
      shard: departureShardKey(stopId)
    };
  }

  let tileCount = 0;
  for (const tile of [...tileStops.keys()].sort()) {
    const filename = path.join(tileRoot, `${tile}.json`);
    writeJson(filename, {
      version: 7,
      built: nowIso,
      scope: 'stop-index',
      region,
      tile,
      tileSize: TILE_SIZE,
      stops: tileStops.get(tile)
    });
    maxAssetBytes = Math.max(maxAssetBytes, fs.statSync(filename).size);
    tileCount++;
  }

  const manifest = {
    version: 2,
    built: nowIso,
    region,
    tileSize: TILE_SIZE,
    departurePrefixLength: DEPARTURE_PREFIX_LENGTH,
    patternPrefixLength: PATTERN_PREFIX_LENGTH,
    bounds: bounds.every(Number.isFinite) ? bounds.map(value => Number(value.toFixed(6))) : null,
    stops: activeStopCount,
    departures: departureCount,
    patterns: patternCount,
    shapedPatterns: shapedPatternCount,
    shapePoints: shapePointRows,
    tiles: tileCount,
    departureShards: departureShardCount,
    files: tileCount + departureShardCount + Math.min(16 ** PATTERN_PREFIX_LENGTH, patternCount) + 1,
    maxTileBytes: Math.max(maxAssetBytes, maxPatternBytes),
    invalidTimes
  };

  writeJson(path.join(regionRoot, 'manifest.json'), manifest);
  console.log(JSON.stringify(manifest, null, 2));
}

main().then(() => {
  db.close();
  fs.rmSync(dbPath, { force: true });
}).catch(error => fail(error && error.message ? error.message : String(error)));

export { departureShardKey, parseGtfsMinutes, splitCsv, tileKey };
