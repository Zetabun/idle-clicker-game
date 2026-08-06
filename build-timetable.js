#!/usr/bin/env node
/**
 * Build Kerbside's compact local timetable from a BODS regional GTFS folder.
 *
 * Output version 3 adds deduplicated ordered-stop patterns, so Kerbside can tell
 * whether a bus is before or after the selected stop and estimate distance along
 * the route. Version 5 adds each departure's journey origin time, because the
 * VehicleJourneyRef a live bus broadcasts is a short numeric code that cannot be
 * compared to a GTFS trip_id — the origin departure is the reference that can.
 *
 * Usage:
 *   node build-timetable.js <gtfs-folder> <latitude> <longitude> [radius-metres]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const [dir, latS, lonS, radiusS] = process.argv.slice(2);
if (!dir || latS == null || lonS == null) {
  console.error('\nUsage: node build-timetable.js <gtfs-folder> <lat> <lon> [radius-metres]\n');
  process.exit(1);
}

const LAT = Number(latS);
const LON = Number(lonS);
const RADIUS = radiusS == null ? 8000 : Number(radiusS);
const TRACK_RADIUS = Math.min(50000, RADIUS + 15000);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) fail(`GTFS folder not found: ${dir}`);
if (!isFinite(LAT) || LAT < 49 || LAT > 61 || !isFinite(LON) || LON < -9 || LON > 3) fail('Centre must be valid Great Britain latitude/longitude coordinates.');
if (!isFinite(RADIUS) || RADIUS < 250 || RADIUS > 50000) fail('Radius must be between 250 and 50,000 metres.');

const OUT = path.join(process.cwd(), 'timetable.json');
const R = 6371000;
const rad = d => d * Math.PI / 180;
function distance(a, b, c, d) {
  const p1 = rad(a), p2 = rad(c), dp = rad(c - a), dl = rad(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function fail(message) {
  console.error(`\nFailed: ${message}\n`);
  process.exit(1);
}

function splitCsv(line) {
  const out = [];
  let current = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else quoted = false;
      } else current += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { out.push(current); current = ''; }
    else current += char;
  }
  out.push(current);
  return out;
}

async function eachRow(file, onRow, { optional = false } = {}) {
  const filename = path.join(dir, file);
  if (!fs.existsSync(filename)) {
    if (optional) return 0;
    throw new Error(`Missing ${file} in ${dir}`);
  }
  const input = fs.createReadStream(filename);
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let headers = null, count = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cells = splitCsv(line);
    if (!headers) {
      headers = cells.map(h => h.trim().replace(/^\uFEFF/, ''));
      continue;
    }
    const row = {};
    for (let i = 0; i < headers.length; i++) row[headers[i]] = cells[i] == null ? '' : cells[i];
    onRow(row, ++count);
  }
  return count;
}

function parseGtfsMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,3}):(\d{2})(?::\d{2})?$/);
  if (!match) return NaN;
  const hours = Number(match[1]), minutes = Number(match[2]);
  if (!isFinite(hours) || minutes < 0 || minutes > 59) return NaN;
  return hours * 60 + minutes;
}
function dateKey(value) {
  const key = String(value || '').replace(/[^0-9]/g, '');
  return /^\d{8}$/.test(key) ? key : '';
}
function numericSequence(value, fallback) {
  const n = Number(value);
  return isFinite(n) ? n : fallback;
}

(async () => {
  console.log('Reading stops...');
  const localStops = new Map();
  const trackStops = new Map();
  await eachRow('stops.txt', row => {
    const lat = Number(row.stop_lat), lon = Number(row.stop_lon);
    if (!isFinite(lat) || !isFinite(lon)) return;
    const metres = distance(LAT, LON, lat, lon);
    if (metres > TRACK_RADIUS) return;
    const stop = {
      name: row.stop_name || '',
      lat,
      lon,
      code: row.stop_code || row.stop_id
    };
    const id = String(row.stop_id);
    trackStops.set(id, stop);
    if (metres <= RADIUS) localStops.set(id, stop);
  });
  console.log(`${localStops.size} local stops within ${RADIUS} m; ${trackStops.size} route-pattern stops within ${TRACK_RADIUS} m`);
  if (!localStops.size) throw new Error('No GTFS stops were found near the selected centre.');

  console.log('Reading routes and trips...');
  const routes = new Map();
  await eachRow('routes.txt', row => {
    routes.set(String(row.route_id), { line: row.route_short_name || row.route_long_name || String(row.route_id), routeId: String(row.route_id || ''), operator: String(row.agency_id || '') });
  });

  const trips = new Map();
  await eachRow('trips.txt', row => {
    const tripId = String(row.trip_id || '');
    if (!tripId) return;
    const route = routes.get(String(row.route_id)) || {};
    trips.set(tripId, {
      line: route.line || row.route_short_name || '',
      routeId: route.routeId || String(row.route_id || ''),
      operator: route.operator || '',
      head: row.trip_headsign || '',
      service: String(row.service_id || ''),
      direction: row.direction_id == null ? '' : String(row.direction_id)
    });
  });

  console.log('Reading service calendars...');
  const services = new Map();
  await eachRow('calendar.txt', row => {
    const id = String(row.service_id || '');
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
    const id = String(row.service_id || '');
    const date = dateKey(row.date);
    if (!id || !date) return;
    const service = services.get(id) || { days: '0000000', start: '', end: '', add: [], remove: [] };
    if (String(row.exception_type) === '1') service.add.push(date);
    if (String(row.exception_type) === '2') service.remove.push(date);
    services.set(id, service);
  }, { optional: true });

  console.log('Scanning stop_times.txt for local departures...');
  const byStop = new Map();
  const usedServices = new Set();
  const usedTrips = new Set();
  let scanned = 0, invalidTimes = 0;
  await eachRow('stop_times.txt', (row, number) => {
    scanned = number;
    if (number % 2000000 === 0) console.log(`  ${(number / 1e6).toFixed(0)}M rows...`);
    const tripId = String(row.trip_id || '');
    const trip = trips.get(tripId);
    /* Each journey's true first call, so the app can match a live bus by the
       origin departure time it broadcasts. Tracked before the local-stop filter
       because a journey can begin outside the radius, and the live
       OriginAimedDepartureTime always names its real origin — the lowest
       sequence among the stops we happen to keep would be the wrong call. */
    if (trip) {
      const originSeq = numericSequence(row.stop_sequence, number);
      const originMins = parseGtfsMinutes(row.departure_time || row.arrival_time);
      if (isFinite(originMins) && (trip.originSeq === undefined || originSeq < trip.originSeq)) {
        trip.originSeq = originSeq;
        trip.originMins = originMins;
      }
    }
    const stopId = String(row.stop_id || '');
    if (!localStops.has(stopId)) return;
    if (!trip) return;
    const minutes = parseGtfsMinutes(row.departure_time || row.arrival_time);
    if (!isFinite(minutes)) { invalidTimes++; return; }
    const list = byStop.get(stopId) || [];
    list.push([minutes, trip.line, trip.head, trip.service, trip.direction, tripId, '', trip.routeId, trip.operator, numericSequence(row.stop_sequence, list.length), '']);
    byStop.set(stopId, list);
    usedTrips.add(tripId);
    if (trip.service) usedServices.add(trip.service);
  });

  /* Filled in after the scan rather than inside it: stop_times.txt is not
     required to be sorted, so a journey's origin can be read after a later call
     of the same journey has already been recorded. */
  for (const list of byStop.values()) {
    for (const entry of list) {
      const trip = trips.get(String(entry[5] || ''));
      entry[10] = trip && isFinite(Number(trip.originMins)) ? Number(trip.originMins) : '';
    }
  }
  console.log(`Scanned ${scanned.toLocaleString()} rows`);
  if (invalidTimes) console.log(`Ignored ${invalidTimes.toLocaleString()} rows with invalid GTFS times`);

  console.log(`Building ordered stop patterns for ${usedTrips.size.toLocaleString()} local trips...`);
  const tripStops = new Map();
  let patternRows = 0;
  await eachRow('stop_times.txt', row => {
    const tripId = String(row.trip_id || '');
    if (!usedTrips.has(tripId)) return;
    const stopId = String(row.stop_id || '');
    if (!trackStops.has(stopId)) return;
    const list = tripStops.get(tripId) || [];
    list.push([numericSequence(row.stop_sequence, list.length), stopId]);
    tripStops.set(tripId, list);
    patternRows++;
  });

  const output = {
    version: 5,
    built: new Date().toISOString(),
    centre: [LAT, LON],
    radius: RADIUS,
    trackRadius: TRACK_RADIUS,
    services: {},
    stops: {},
    tripPatterns: {},
    patterns: {}
  };

  for (const serviceId of usedServices) {
    const service = services.get(serviceId);
    if (!service) continue;
    service.add = [...new Set(service.add)].sort();
    service.remove = [...new Set(service.remove)].sort();
    output.services[serviceId] = service;
  }

  let total = 0;
  for (const [id, list] of byStop) {
    const stop = localStops.get(id);
    list.sort((a, b) => a[0] - b[0] || String(a[1]).localeCompare(String(b[1])));
    const unique = [];
    let previous = '';
    for (const row of list) {
      const signature = row.join('\u001f');
      if (signature === previous) continue;
      unique.push(row);
      previous = signature;
    }
    output.stops[id] = {
      n: stop.name,
      c: stop.code,
      ll: [Number(stop.lat.toFixed(6)), Number(stop.lon.toFixed(6))],
      d: unique
    };
    total += unique.length;
  }

  const patternBySignature = new Map();
  for (const tripId of usedTrips) {
    const rows = (tripStops.get(tripId) || []).sort((a, b) => a[0] - b[0]);
    const stopCalls = rows.map(([sequence, stopId]) => ({ sequence, stopId }));
    if (stopCalls.length < 2) continue;
    const signature = stopCalls.map(call => `${call.sequence}\u001d${call.stopId}`).join('\u001f');
    let patternId = patternBySignature.get(signature);
    if (!patternId) {
      patternId = `p${patternBySignature.size.toString(36)}`;
      patternBySignature.set(signature, patternId);
      output.patterns[patternId] = {
        p: stopCalls.map(call => {
          const s = trackStops.get(call.stopId);
          return [Number(s.lat.toFixed(6)), Number(s.lon.toFixed(6))];
        }),
        s: stopCalls.map(call => {
          const s = trackStops.get(call.stopId);
          return [call.stopId, s.name, Number(s.lat.toFixed(6)), Number(s.lon.toFixed(6)), call.sequence];
        }),
        g: 0
      };
    }
    output.tripPatterns[tripId] = patternId;
  }

  fs.writeFileSync(OUT, JSON.stringify(output));
  const sizeKb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`\nWrote ${OUT}`);
  console.log(`${Object.keys(output.stops).length} stops, ${total.toLocaleString()} departures, ${Object.keys(output.services).length} services`);
  console.log(`${Object.keys(output.tripPatterns).length.toLocaleString()} trip mappings, ${Object.keys(output.patterns).length.toLocaleString()} unique route patterns from ${patternRows.toLocaleString()} rows, ${sizeKb} KB\n`);
})().catch(error => fail(error.message || String(error)));

module.exports = { parseGtfsMinutes, splitCsv, numericSequence };
