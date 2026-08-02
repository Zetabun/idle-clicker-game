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
`);

const stops = new Map();
const routes = new Map();
const trips = new Map();
const services = new Map();
const tripPattern = new Map();
let stopTimeRows = 0;
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
    if (id) routes.set(id, row.route_short_name || row.route_long_name || id);
  });

  await eachRow('trips.txt', row => {
    const id = String(row.trip_id || '').trim();
    if (!id) return;
    trips.set(id, {
      line: routes.get(String(row.route_id || '')) || row.route_short_name || '',
      head: row.trip_headsign || '',
      service: String(row.service_id || ''),
      direction: row.direction_id == null ? '' : String(row.direction_id)
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

  console.log(`[${region}] Deduplicating ordered journey patterns...`);
  const putPattern = db.prepare('INSERT OR IGNORE INTO patterns(pattern_id, coords) VALUES (?, ?)');
  let currentTrip = '';
  let sequenceStops = [];

  function flushPattern() {
    if (!currentTrip || sequenceStops.length < 2) {
      sequenceStops = [];
      return;
    }
    const signature = sequenceStops.join('\u001f');
    const patternId = shortHash(signature);
    const coordinates = sequenceStops
      .map(id => stops.get(id))
      .filter(Boolean)
      .map(stop => [stop.lat, stop.lon]);
    if (coordinates.length >= 2) {
      tripPattern.set(currentTrip, patternId);
      putPattern.run(patternId, JSON.stringify(coordinates));
    }
    sequenceStops = [];
  }

  for (const row of db.prepare('SELECT trip_id, stop_id FROM stop_times ORDER BY trip_id, seq').iterate()) {
    if (row.trip_id !== currentTrip) {
      flushPattern();
      currentTrip = row.trip_id;
    }
    if (sequenceStops[sequenceStops.length - 1] !== row.stop_id) sequenceStops.push(row.stop_id);
  }
  flushPattern();

  console.log(`[${region}] Writing compact pattern shards...`);
  let shardPrefix = '';
  let shard = {};
  let patternCount = 0;

  function flushShard() {
    if (!shardPrefix) return;
    writeJson(path.join(patternRoot, `${shardPrefix}.json`), {
      version: 2,
      built: nowIso,
      region,
      patterns: shard
    });
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
      if (!service) continue;
      serviceSubset[id] = {
        ...service,
        add: [...new Set(service.add)].sort(),
        remove: [...new Set(service.remove)].sort()
      };
    }

    const filename = path.join(departureRoot, `${currentShard}.json`);
    writeJson(filename, {
      version: 7,
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

  for (const row of db.prepare('SELECT shard, stop_id, trip_id, mins FROM stop_times ORDER BY shard, stop_id, mins, trip_id').iterate()) {
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
    departures.push([row.mins, trip.line, trip.head, trip.service, trip.direction, row.trip_id, patternId]);
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
    tiles: tileCount,
    departureShards: departureShardCount,
    files: tileCount + departureShardCount + Math.min(16 ** PATTERN_PREFIX_LENGTH, patternCount) + 1,
    maxTileBytes: maxAssetBytes,
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
