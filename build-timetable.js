#!/usr/bin/env node
/**
 * build-timetable.js — turn a BODS GTFS region into a small file
 * the app can actually load.
 *
 * WHY THIS EXISTS
 * A region's GTFS is tens of megabytes and stop_times.txt runs to
 * millions of rows. No browser should download that, and it won't
 * fit in a Cloudflare Worker's 10ms CPU budget either. So this runs
 * on your machine, keeps only the stops near you, and writes a
 * timetable.json of a few hundred KB that you commit alongside
 * index.html. Re-run it when timetables change — a few times a year.
 *
 * USAGE
 *   1. Download the GTFS for your region from
 *      https://data.bus-data.dft.gov.uk/timetable/
 *   2. Unzip it into a folder, e.g. ./gtfs
 *   3. node build-timetable.js ./gtfs 51.4849 -2.6899 8000
 *                              folder  lat     lon     radius(m)
 *   4. Copy timetable.json next to your index.html and push.
 *
 * No dependencies. Node 18+.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const [dir, latS, lonS, radS] = process.argv.slice(2);
if (!dir || !latS || !lonS) {
  console.error('\n  node build-timetable.js <gtfs-folder> <lat> <lon> [radius-metres]\n');
  process.exit(1);
}
const LAT = Number(latS), LON = Number(lonS), RAD = Number(radS) || 8000;
const OUT = path.join(process.cwd(), 'timetable.json');

const R = 6371000, rad = d => d * Math.PI / 180;
function dist(a, b, c, d) {
  const p1 = rad(a), p2 = rad(c), dp = rad(c - a), dl = rad(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* minimal CSV reader — GTFS is well-formed but does use quoted fields */
function splitCsv(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
async function eachRow(file, fn) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) throw new Error('Missing ' + file + ' in ' + dir);
  const rl = readline.createInterface({ input: fs.createReadStream(p), crlfDelay: Infinity });
  let head = null, n = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cells = splitCsv(line);
    if (!head) { head = cells.map(h => h.trim().replace(/^\uFEFF/, '')); continue; }
    const row = {};
    for (let i = 0; i < head.length; i++) row[head[i]] = cells[i];
    fn(row, ++n);
  }
  return n;
}

(async () => {
  console.log('  Reading stops…');
  const stops = new Map();          // stop_id -> {name, lat, lon, code}
  await eachRow('stops.txt', r => {
    const lat = Number(r.stop_lat), lon = Number(r.stop_lon);
    if (!isFinite(lat) || !isFinite(lon)) return;
    if (dist(LAT, LON, lat, lon) > RAD) return;
    stops.set(r.stop_id, {
      name: r.stop_name || '', lat, lon,
      code: r.stop_code || r.stop_id
    });
  });
  console.log(`  ${stops.size} stops within ${RAD} m`);
  if (!stops.size) { console.error('  Nothing nearby — check your coordinates.'); process.exit(1); }

  console.log('  Reading routes and trips…');
  const routes = new Map();
  await eachRow('routes.txt', r => routes.set(r.route_id, r.route_short_name || r.route_long_name || ''));

  const trips = new Map();          // trip_id -> {line, head, service}
  await eachRow('trips.txt', r => trips.set(r.trip_id, {
    line: routes.get(r.route_id) || '',
    head: r.trip_headsign || '',
    service: r.service_id
  }));

  console.log('  Reading calendar…');
  const cal = new Map();            // service_id -> 7-bit day mask, Mon=1
  await eachRow('calendar.txt', r => {
    const bits = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
      .map(d => r[d] === '1' ? 1 : 0);
    cal.set(r.service_id, bits.join(''));
  }).catch(() => console.log('  (no calendar.txt — days will be unknown)'));

  console.log('  Scanning stop_times — this is the slow part…');
  const byStop = new Map();
  let scanned = 0;
  await eachRow('stop_times.txt', (r, n) => {
    scanned = n;
    if (n % 2000000 === 0) console.log(`    ${(n / 1e6).toFixed(0)}M rows…`);
    if (!stops.has(r.stop_id)) return;
    const t = trips.get(r.trip_id);
    if (!t) return;
    const dep = (r.departure_time || r.arrival_time || '').slice(0, 5);
    if (!dep) return;
    const arr = byStop.get(r.stop_id) || [];
    arr.push([dep, t.line, t.head, cal.get(t.service) || '1111111']);
    byStop.set(r.stop_id, arr);
  });
  console.log(`  Scanned ${scanned.toLocaleString()} rows`);

  const out = { built: new Date().toISOString(), centre: [LAT, LON], radius: RAD, stops: {} };
  let total = 0;
  for (const [id, list] of byStop) {
    const s = stops.get(id);
    list.sort((a, b) => a[0].localeCompare(b[0]));
    out.stops[id] = {
      n: s.name, c: s.code, ll: [+s.lat.toFixed(5), +s.lon.toFixed(5)],
      d: list
    };
    total += list.length;
  }
  fs.writeFileSync(OUT, JSON.stringify(out));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`\n  Wrote timetable.json — ${Object.keys(out.stops).length} stops, ${total.toLocaleString()} departures, ${kb} KB`);
  console.log('  Copy it next to index.html and push.\n');
})().catch(e => { console.error('\n  Failed:', e.message, '\n'); process.exit(1); });
