#!/usr/bin/env python3
from pathlib import Path
import json
import re
import subprocess
import tempfile


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"{label}: start marker not found")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"{label}: end marker not found")
    return text[:start] + replacement + text[end:]


builder_path = Path('kerbside-backend/scripts/build-region.js')
builder = builder_path.read_text(encoding='utf-8')

builder = replace_once(
    builder,
    "const tileRoot = path.join(regionRoot, 'tiles');\nconst patternRoot = path.join(regionRoot, 'patterns');\nfs.rmSync(regionRoot, { recursive: true, force: true });\nfor (const directory of [tileRoot, patternRoot]) fs.mkdirSync(directory, { recursive: true });\n\nconst TILE_SIZE = 0.05;\nconst PATTERN_PREFIX_LENGTH = 2;",
    "const tileRoot = path.join(regionRoot, 'tiles');\nconst departureRoot = path.join(regionRoot, 'departures');\nconst patternRoot = path.join(regionRoot, 'patterns');\nfs.rmSync(regionRoot, { recursive: true, force: true });\nfor (const directory of [tileRoot, departureRoot, patternRoot]) fs.mkdirSync(directory, { recursive: true });\n\nconst TILE_SIZE = 0.05;\nconst DEPARTURE_PREFIX_LENGTH = 2;\nconst PATTERN_PREFIX_LENGTH = 2;",
    'builder output directories'
)

builder = replace_once(
    builder,
    "  CREATE TABLE stop_times (\n    tile TEXT NOT NULL,\n    stop_id TEXT NOT NULL,",
    "  CREATE TABLE stop_times (\n    tile TEXT NOT NULL,\n    shard TEXT NOT NULL,\n    stop_id TEXT NOT NULL,",
    'builder stop_times schema'
)

builder = replace_once(
    builder,
    "function shortHash(value) {\n  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);\n}",
    "function shortHash(value) {\n  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);\n}\n\nfunction departureShardKey(value) {\n  return shortHash(String(value)).slice(0, DEPARTURE_PREFIX_LENGTH);\n}",
    'builder departure shard helper'
)

builder = replace_once(
    builder,
    "const insert = db.prepare('INSERT INTO stop_times(tile, stop_id, trip_id, mins, seq) VALUES (?, ?, ?, ?, ?)');",
    "const insert = db.prepare('INSERT INTO stop_times(tile, shard, stop_id, trip_id, mins, seq) VALUES (?, ?, ?, ?, ?, ?)');",
    'builder insert statement'
)

builder = replace_once(
    builder,
    "insert.run(stop.tile, stopId, tripId, mins, sequence(row.stop_sequence, number));",
    "insert.run(stop.tile, departureShardKey(stopId), stopId, tripId, mins, sequence(row.stop_sequence, number));",
    'builder insert values'
)

builder = replace_once(
    builder,
    "  db.exec('CREATE INDEX idx_trip_sequence ON stop_times(trip_id, seq);');\n  db.exec('CREATE INDEX idx_tile_stop_time ON stop_times(tile, stop_id, mins, trip_id);');",
    "  db.exec('CREATE INDEX idx_trip_sequence ON stop_times(trip_id, seq);');\n  db.exec('CREATE INDEX idx_shard_stop_time ON stop_times(shard, stop_id, mins, trip_id);');",
    'builder indexes'
)

new_section = r'''  console.log(`[${region}] Writing balanced departure shards...`);
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

'''

builder = replace_between(
    builder,
    "  console.log(`[${region}] Writing combined stop and timetable tiles...`);",
    "  const manifest = {",
    new_section,
    'builder tile section'
)

builder = replace_once(
    builder,
    "    patternPrefixLength: PATTERN_PREFIX_LENGTH,",
    "    departurePrefixLength: DEPARTURE_PREFIX_LENGTH,\n    patternPrefixLength: PATTERN_PREFIX_LENGTH,",
    'builder manifest prefix lengths'
)

builder = replace_once(
    builder,
    "    tiles: tileCount,\n    files: tileCount + Math.min(16 ** PATTERN_PREFIX_LENGTH, patternCount) + 1,\n    maxTileBytes,",
    "    tiles: tileCount,\n    departureShards: departureShardCount,\n    files: tileCount + departureShardCount + Math.min(16 ** PATTERN_PREFIX_LENGTH, patternCount) + 1,\n    maxTileBytes: maxAssetBytes,",
    'builder manifest asset counts'
)

builder = replace_once(
    builder,
    "export { parseGtfsMinutes, splitCsv, tileKey };",
    "export { departureShardKey, parseGtfsMinutes, splitCsv, tileKey };",
    'builder exports'
)

builder_path.write_text(builder, encoding='utf-8')

bus_path = Path('bus.html')
bus = bus_path.read_text(encoding='utf-8')
bus = replace_once(bus, "const APP_VERSION = '0.6.0';", "const APP_VERSION = '0.6.1';", 'browser version')
bus = replace_once(
    bus,
    "const DATA_TILE_CACHE = new Map();\nlet DATA_MANIFEST = null;",
    "const DATA_TILE_CACHE = new Map();\nconst DATA_DEPARTURE_CACHE = new Map();\nlet DATA_MANIFEST = null;",
    'browser departure cache'
)

load_departure = r'''async function loadDataDeparture(region,shard){
  const key=region+'/'+shard; if(DATA_DEPARTURE_CACHE.has(key)) return DATA_DEPARTURE_CACHE.get(key);
  const pending=(async()=>{
    const r=await fetchTimed(dataUrl('/regions/'+encodeURIComponent(region)+'/departures/'+encodeURIComponent(shard)+'.json'),{headers:{Accept:'application/json'},cache:'force-cache'},12000);
    if(r.status===404) return null; if(!r.ok) throw new Error('Pages departures HTTP '+r.status);
    const data=await r.json(); return data&&data.stops?data:null;
  })();
  DATA_DEPARTURE_CACHE.set(key,pending);
  try{return await pending;}catch(e){DATA_DEPARTURE_CACHE.delete(key);throw e;}
}
'''

load_tile_end = "  try{return await pending;}catch(e){DATA_TILE_CACHE.delete(key);throw e;}\n}\nasync function fetchOfficialStops(lat,lon,radius){"
if load_tile_end not in bus:
    raise SystemExit('browser data tile insertion point not found')
bus = bus.replace(load_tile_end, "  try{return await pending;}catch(e){DATA_TILE_CACHE.delete(key);throw e;}\n}\n" + load_departure + "async function fetchOfficialStops(lat,lon,radius){", 1)

old_stop = "const stop={id:String(id),name:titleCase(raw.n||'Unnamed stop'),atco:String(raw.c||id),naptan:String(raw.sms||''),code:String(raw.c||id),ind:String(raw.ind||''),lat:stopLat,lon:stopLon,region:item.region,tile:item.tile,source:'official',d:metres};"
new_stop = "const stop={id:String(id),name:titleCase(raw.n||'Unnamed stop'),atco:String(raw.c||id),naptan:String(raw.sms||''),code:String(raw.c||id),ind:String(raw.ind||''),lat:stopLat,lon:stopLon,region:item.region,tile:item.tile,shard:String(raw.shard||''),source:'official',d:metres};"
bus = replace_once(bus, old_stop, new_stop, 'browser official stop shard')

old_timetable = r'''  try{
    const data=await loadDataTile(stop.region,stop.tile);
    if(!data||!data.stops||!Object.keys(data.stops).length) throw new Error('no Pages timetable tile');
    if(run!==S.timetableRun||!S.stop||String(S.stop.id)!==String(stop.id)) return;
    activateTimetable(data,'national',stop.region); S.ttError=null; S.ttStop=matchTimetableStop(stop);
  }catch(e){ if(run!==S.timetableRun) return; S.ttError=String((e&&e.message)||'national timetable unavailable'); }'''
new_timetable = r'''  try{
    const tileData=await loadDataTile(stop.region,stop.tile);
    const raw=tileData&&tileData.stops&&tileData.stops[String(stop.id)];
    const shard=String(stop.shard||(raw&&raw.shard)||'');
    if(!shard) throw new Error('no Pages departure shard for this stop');
    const data=await loadDataDeparture(stop.region,shard);
    if(!data||!data.stops||!data.stops[String(stop.id)]) throw new Error('no Pages timetable data for this stop');
    if(run!==S.timetableRun||!S.stop||String(S.stop.id)!==String(stop.id)) return;
    stop.shard=shard; activateTimetable(data,'national',stop.region); S.ttError=null; S.ttStop=matchTimetableStop(stop);
  }catch(e){ if(run!==S.timetableRun) return; S.ttError=String((e&&e.message)||'national timetable unavailable'); }'''
bus = replace_once(bus, old_timetable, new_timetable, 'browser stop timetable loader')

bus_path.write_text(bus, encoding='utf-8')

readme_path = Path('kerbside-backend/README.md')
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    "- `GET /regions/{region}/tiles/{tile}.json` - nearby official stops and scheduled departures for one geographic tile.\n- `GET /regions/{region}/patterns/{prefix}.json` - ordered journey patterns loaded only when needed.",
    "- `GET /regions/{region}/tiles/{tile}.json` - nearby official stop metadata for one geographic tile.\n- `GET /regions/{region}/departures/{prefix}.json` - a balanced timetable shard selected by the stop's hash.\n- `GET /regions/{region}/patterns/{prefix}.json` - ordered journey patterns loaded only when needed.",
    'README endpoints'
)
readme = replace_once(
    readme,
    "The builder writes one combined data file per 0.05-degree tile and two-character pattern shards.",
    "The builder writes lightweight 0.05-degree stop-index tiles plus balanced two-character departure and pattern shards.",
    'README data layout'
)
readme_path.write_text(readme, encoding='utf-8')

package_path = Path('kerbside-backend/package.json')
package = package_path.read_text(encoding='utf-8')
package = replace_once(package, '"version": "0.6.0"', '"version": "0.6.1"', 'package version')
package_path.write_text(package, encoding='utf-8')

source = bus_path.read_text(encoding='utf-8')
scripts = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', source, flags=re.I | re.S)
if not scripts:
    raise SystemExit('No inline browser scripts found')
with tempfile.TemporaryDirectory() as directory:
    for index, script in enumerate(scripts, start=1):
        filename = Path(directory) / f'inline-{index}.js'
        filename.write_text(script, encoding='utf-8')
        subprocess.run(['node', '--check', str(filename)], check=True)

with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    gtfs = root / 'gtfs'
    out = root / 'out'
    gtfs.mkdir()
    (gtfs / 'stops.txt').write_text(
        'stop_id,stop_code,stop_name,stop_lat,stop_lon,platform_code\n'
        'STOP_A,1001,Alpha,52.5000,-2.1000,A\n'
        'STOP_B,1002,Beta,52.5100,-2.0900,B\n'
        'STOP_C,1003,Gamma,52.5200,-2.0800,C\n', encoding='utf-8')
    (gtfs / 'routes.txt').write_text('route_id,route_short_name,route_long_name\nR1,9,Alpha to Gamma\n', encoding='utf-8')
    (gtfs / 'trips.txt').write_text(
        'route_id,service_id,trip_id,trip_headsign,direction_id\n'
        'R1,S1,T1,Gamma,0\n'
        'R1,S1,T2,Gamma,0\n', encoding='utf-8')
    (gtfs / 'stop_times.txt').write_text(
        'trip_id,arrival_time,departure_time,stop_id,stop_sequence\n'
        'T1,08:00:00,08:00:00,STOP_A,1\n'
        'T1,08:10:00,08:10:00,STOP_B,2\n'
        'T1,08:20:00,08:20:00,STOP_C,3\n'
        'T2,09:00:00,09:00:00,STOP_A,1\n'
        'T2,09:10:00,09:10:00,STOP_B,2\n'
        'T2,09:20:00,09:20:00,STOP_C,3\n', encoding='utf-8')
    (gtfs / 'calendar.txt').write_text(
        'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n'
        'S1,1,1,1,1,1,1,1,20260101,20271231\n', encoding='utf-8')
    subprocess.run(['node', 'kerbside-backend/scripts/build-region.js', str(gtfs), 'test_region', str(out)], check=True)
    manifest = json.loads((out / 'regions/test_region/manifest.json').read_text(encoding='utf-8'))
    if manifest.get('departureShards', 0) < 1 or manifest.get('tiles', 0) < 1:
        raise SystemExit('Synthetic build did not create departure shards and stop tiles')
    tile_files = list((out / 'regions/test_region/tiles').glob('*.json'))
    departure_files = list((out / 'regions/test_region/departures').glob('*.json'))
    if not tile_files or not departure_files:
        raise SystemExit('Synthetic build output is incomplete')
    tile = json.loads(tile_files[0].read_text(encoding='utf-8'))
    first_stop = next(iter(tile['stops'].values()))
    if 'shard' not in first_stop or 'd' in first_stop:
        raise SystemExit('Stop index tile has the wrong schema')
    departure = json.loads(departure_files[0].read_text(encoding='utf-8'))
    if not any(value.get('d') for value in departure.get('stops', {}).values()):
        raise SystemExit('Departure shard has no scheduled rows')

print('Kerbside 0.6.1 split-shard release patch validated.')
