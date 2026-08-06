import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const script = path.resolve('scripts/build-region.js');

async function csv(filename, text) {
  await writeFile(filename, text.trim() + '\n', 'utf8');
}

test('regional builder retains GTFS shape geometry and ordered stops', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kerbside-shape-test-'));
  const gtfs = path.join(root, 'gtfs');
  const out = path.join(root, 'out');
  await mkdir(gtfs);
  try {
    await csv(path.join(gtfs, 'stops.txt'), `
stop_id,stop_code,stop_name,stop_lat,stop_lon,platform_code
A,A,Alpha Stop,52.500000,-1.900000,A
B,B,Beta Stop,52.501000,-1.898000,B
C,C,Gamma Stop,52.502000,-1.896000,C`);
    await csv(path.join(gtfs, 'routes.txt'), `
route_id,agency_id,route_short_name,route_long_name
R,OP-A,10,Test Route`);
    await csv(path.join(gtfs, 'trips.txt'), `
route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
R,S,T,Gamma,0,SHAPE
R,S,U,Gamma,0,`);
    /* Trip U begins at Z, a stop absent from stops.txt, standing in for a
       journey that starts outside this region. Its origin departure must still
       be published, because the live OriginAimedDepartureTime names that first
       call and not the earliest one this region happens to keep. Rows are also
       deliberately out of sequence order to prove the origin is chosen by
       stop_sequence rather than by position in the file. */
    await csv(path.join(gtfs, 'stop_times.txt'), `
trip_id,arrival_time,departure_time,stop_id,stop_sequence
T,08:05:00,08:05:00,B,2
T,08:00:00,08:00:00,A,1
T,08:10:00,08:10:00,C,3
T,08:15:00,08:15:00,A,4
U,09:10:00,09:10:00,B,2
U,09:20:00,09:20:00,C,3
U,09:00:00,09:00:00,Z,1`);
    await csv(path.join(gtfs, 'calendar.txt'), `
service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
S,1,1,1,1,1,1,1,20260101,20261231`);
    await csv(path.join(gtfs, 'shapes.txt'), `
shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence
SHAPE,52.500000,-1.900000,1
SHAPE,52.500400,-1.899600,2
SHAPE,52.500650,-1.898650,3
SHAPE,52.501000,-1.898000,4
SHAPE,52.501450,-1.897650,5
SHAPE,52.501700,-1.896500,6
SHAPE,52.502000,-1.896000,7`);

    await run(process.execPath, [script, gtfs, 'test_region', out], { cwd: path.resolve('.') });
    const departureFiles = await readdir(path.join(out, 'regions', 'test_region', 'departures'));
    let patternId = '';
    const departureRows = [];
    const departureVersions = new Set();
    for (const name of departureFiles) {
      const data = JSON.parse(await readFile(path.join(out, 'regions', 'test_region', 'departures', name), 'utf8'));
      if (data.tripPatterns && data.tripPatterns.T) patternId = data.tripPatterns.T;
      departureVersions.add(data.version);
      for (const stop of Object.values(data.stops || {})) if (Array.isArray(stop.d)) departureRows.push(...stop.d);
    }
    // Adding the origin departure to every row is a shard format change.
    assert.deepEqual([...departureVersions], [10]);
    assert.ok(patternId, 'trip should reference a pattern');
    const patternFile = path.join(out, 'regions', 'test_region', 'patterns', patternId.slice(0, 2) + '.json');
    const shard = JSON.parse(await readFile(patternFile, 'utf8'));
    const pattern = shard.patterns[patternId];
    assert.equal(shard.version, 4);
    assert.equal(shard.scope, 'pattern-shard');
    assert.equal(shard.region, 'test_region');
    assert.equal(shard.shard, patternId.slice(0, 2));
    assert.equal(pattern.g, 1, 'shape geometry should be marked authoritative');
    assert.ok(pattern.p.length > 3, 'shape should retain intermediate road geometry');
    assert.deepEqual(pattern.s.map(stop => stop[0]), ['A', 'B', 'C', 'A']);
    assert.deepEqual(pattern.s.map(stop => stop[1]), ['Alpha Stop', 'Beta Stop', 'Gamma Stop', 'Alpha Stop']);
    assert.deepEqual(pattern.s.map(stop => stop[4]), [1, 2, 3, 4]);
    const repeatedDeparture = departureRows.find(row => row[5] === 'T' && row[9] === 4);
    assert.ok(repeatedDeparture, 'second call at the same stop should remain a distinct departure');
    assert.equal(repeatedDeparture[7], 'R');
    assert.equal(repeatedDeparture[8], 'OP-A');
    /* The journey's own first departure, which is what a live bus broadcasts.
       The 08:15 second call at A must still report the 08:00 origin, and trip U
       must report 09:00 even though that call is at a stop this region dropped. */
    assert.equal(repeatedDeparture[10], 480, 'a repeated call must still carry the journey origin, not its own time');
    const firstDeparture = departureRows.find(row => row[5] === 'T' && row[9] === 1);
    assert.equal(firstDeparture[10], 480);
    const outOfRegionOrigin = departureRows.filter(row => row[5] === 'U');
    assert.ok(outOfRegionOrigin.length, 'trip U should still produce departures');
    for (const row of outOfRegionOrigin) {
      assert.equal(row[10], 540, 'origin outside the region must still be published');
    }
    const manifest = JSON.parse(await readFile(path.join(out, 'regions', 'test_region', 'manifest.json'), 'utf8'));
    assert.equal(manifest.shapedPatterns, 1);
    assert.equal(manifest.shapePoints, 7);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
