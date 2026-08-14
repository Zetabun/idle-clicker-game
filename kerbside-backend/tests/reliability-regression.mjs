import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');

test('bus polls cannot publish across a location generation change',()=>{
  const bus=source('bus.html');
  assert.match(bus,/const pollLocationRun=S\.locationRun;/);
  assert.match(bus,/ctl\.signal\.aborted\|\|pollLocationRun!==S\.locationRun/);
  assert.ok(bus.indexOf('pollLocationRun!==S.locationRun')<bus.indexOf('feedReceived=true;\n    ingest(list);'));
});

test('bus manifest memory is periodically revalidated',()=>{
  const bus=source('bus.html');
  assert.match(bus,/DATA_MANIFEST_MEMORY_TTL = 10\*60\*1000/);
  assert.match(bus,/const memoryFresh=DATA_MANIFEST&&DATA_MANIFEST_CHECKED_AT/);
  assert.match(bus,/DATA_MANIFEST_CHECKED_AT=Date\.now\(\)/);
});

test('future timetable failures stay on the scheduled journey board',()=>{
  const timetable=source('kerbside-train-timetable.js');
  assert.match(timetable,/mode==='advance'.*setScheduledVisibility\(true\);.*renderUnavailable/s);
  assert.match(timetable,/TIMETABLE_REQUEST_TIMEOUT_MS=12000/);
  assert.match(timetable,/await response\.arrayBuffer\(\)/);
});

test('optional connection live boards degrade independently',()=>{
  const overlay=source('kerbside-train-live-overlay.js');
  assert.match(overlay,/Promise\.allSettled\(targets\.map/);
  assert.match(overlay,/Promise\.allSettled\(onward\.map/);
  assert.match(overlay,/state\.status=failures\?'partial':'ready'/);
});

test('station autocomplete has a body-aware local-data timeout',()=>{
  const ui=source('kerbside-journey-planner-ui.js');
  assert.match(ui,/LOCAL_STATION_TIMEOUT_MS=10000/);
  assert.match(ui,/fetchLocalStations\(\)/);
  assert.match(ui,/await response\.arrayBuffer\(\)/);
});

test('live station board combines detailed evidence with the 20-row listing',()=>{
  const trains=source('kerbside-trains.js');
  assert.match(trains,/mergeLiveBoards\(detailedJson,plainJson\)/);
  assert.match(trains,/\/9\?expand=true/);
  assert.match(trains,/\/20`/);
});

test('train dependency retries are bounded and status version follows release',()=>{
  for(const name of ['kerbside-train-date.js','kerbside-train-routes.js','kerbside-journey-planner-core.js']){
    const text=source(name);assert.doesNotMatch(text,/setTimeout\(init,0\)/,name);
    assert.match(text,/INIT_RETRY_MAX/,name);
  }
  assert.match(source('kerbside-status.js'),/const VERSION='0\.9\.12';/);
});
