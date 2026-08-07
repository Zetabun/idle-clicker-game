#!/usr/bin/env node
import fs from 'node:fs';

function replaceOnce(source, label, oldText, newText) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one target, found ${count}`);
  return source.replace(oldText, newText);
}

const browserPath = 'kerbside-backend/tests/browser-regression.mjs';
let browser = fs.readFileSync(browserPath, 'utf8');

browser = replaceOnce(
  browser,
  'legacy local-clock source assertion',
  "assert.match(busSource, /at\\.setHours\\(Math\\.floor\\(minuteOfDay\\/60\\),minuteOfDay%60,0,0\\)/);\n",
  "assert.match(busSource, /const UK_TIME_ZONE = 'Europe\\/London'/);\n" +
    "assert.match(busSource, /function ukWallClockEpoch\\(year,month,day,hour,minute\\)/);\n" +
    "assert.match(busSource, /return new Date\\(ukWallClockEpoch\\(/);\n" +
    "assert.doesNotMatch(busSource, /at\\.setHours\\(Math\\.floor\\(minuteOfDay\\/60\\),minuteOfDay%60,0,0\\)/);\n"
);

browser = replaceOnce(
  browser,
  'route scan source assertion',
  "assert.match(busSource, /uniqueCompatibleTrips\\(plan\\.matches,v\\.journey,item=>item\\.trip\\)/);\n",
  "assert.match(busSource, /const compatible=\\(plan\\.matches\\|\\|\\[\\]\\)\\.filter/);\n" +
    "assert.match(busSource, /uniqueCompatibleTrips\\(compatible,v\\.journey,item=>item\\.trip\\)/);\n" +
    "assert.match(busSource, /const patternOnly=inferredRouteScanMatch\\(plan,v\\)/);\n"
);

for (const [label, oldText, newText] of [
  ['spring service date', 'api.serviceDepartureTime(new Date(2026,2,29),180)', 'api.serviceDepartureTime(new Date(Date.UTC(2026,2,29)),180)'],
  ['autumn service date', 'api.serviceDepartureTime(new Date(2026,9,25),180)', 'api.serviceDepartureTime(new Date(Date.UTC(2026,9,25)),180)'],
  ['overnight service date', 'api.serviceDepartureTime(new Date(2026,7,2),1530)', 'api.serviceDepartureTime(new Date(Date.UTC(2026,7,2)),1530)'],
  ['removed service calendar date', "api.serviceRuns('1111100',new Date(2026,7,3))", "api.serviceRuns('1111100',new Date(Date.UTC(2026,7,3)))"],
  ['added service calendar date', "api.serviceRuns('1111100',new Date(2026,7,1))", "api.serviceRuns('1111100',new Date(Date.UTC(2026,7,1)))"],
  ['legacy Monday calendar date', "api.serviceRuns('1000000',new Date(2026,7,3))", "api.serviceRuns('1000000',new Date(Date.UTC(2026,7,3)))"],
  ['legacy Saturday calendar date', "api.serviceRuns('1000000',new Date(2026,7,1))", "api.serviceRuns('1000000',new Date(Date.UTC(2026,7,1)))"]
]) {
  browser = replaceOnce(browser, label, oldText, newText);
}

browser = replaceOnce(
  browser,
  'distant pattern-only runtime expectation',
  "remoteInferred:!!(remoteMatched&&remoteMatched.corridorTracked&&remoteMatched.inferredTrip==='remote-trip')",
  "remotePatternOnly:!remoteMatched&&remote.inferredPattern==='remote-pattern'&&!remote.inferredTrip&&!remote.corridorTracked"
);
browser = replaceOnce(
  browser,
  'distant pattern-only result assertion',
  "assert.deepEqual(reliability,{stationaryHeld:true,historyReset:true,bothShown:true,inShown:true,remoteInferred:true});",
  "assert.deepEqual(reliability,{stationaryHeld:true,historyReset:true,bothShown:true,inShown:true,remotePatternOnly:true});"
);

fs.writeFileSync(browserPath, browser, 'utf8');

const multiPath = 'kerbside-backend/tests/multi-vehicle-regression.mjs';
let multi = fs.readFileSync(multiPath, 'utf8');
const oldScan = `      const accepted = positions.map((lat, index) => {
        const vehicle = {
          id: \`CORRIDOR|activity|\${index}\`, journey: 'operator-private-block', vehicleRef: 'shared',
          line: '9', lineRef: '9', dest: 'Town Centre', operator: 'CORRIDOR', declaredDir: '',
          lat, lon: -2.1, bearing: 0, feedSpeed: 8, speed: 8, ts: now,
          timestampKnown: true, corridorTracked: false,
          hist: [{ lat: lat - 0.004, lon: -2.1, ts: now - 60000 }, { lat, lon: -2.1, ts: now }]
        };
        return plans.map(plan => api.matchRouteScanVehicle(plan, vehicle)).find(Boolean) || null;
      }).filter(Boolean);
`;
const newScan = `      const scanned = positions.map((lat, index) => {
        const vehicle = {
          id: \`CORRIDOR|activity|\${index}\`, journey: 'operator-private-block', vehicleRef: 'shared',
          line: '9', lineRef: '9', dest: 'Town Centre', operator: 'CORRIDOR', declaredDir: '',
          lat, lon: -2.1, bearing: 0, feedSpeed: 8, speed: 8, ts: now,
          timestampKnown: true, corridorTracked: false,
          hist: [{ lat: lat - 0.004, lon: -2.1, ts: now - 60000 }, { lat, lon: -2.1, ts: now }]
        };
        const matched = plans.map(plan => api.matchRouteScanVehicle(plan, vehicle)).find(Boolean) || null;
        return { matched, vehicle };
      });
      const accepted = scanned.map(item => item.matched).filter(Boolean);
`;
multi = replaceOnce(multi, 'multi-vehicle pattern-only scan setup', oldScan, newScan);
multi = replaceOnce(
  multi,
  'multi-vehicle pattern-only scan result',
  "        accepted: accepted.length,\n        distinctTrips: new Set(accepted.map(vehicle => vehicle.corridorTrip)).size,\n        inferred: accepted.every(vehicle => vehicle.inferredTrip && vehicle.corridorTracked)\n",
  "        accepted: accepted.length,\n        distinctTrips: new Set(accepted.map(vehicle => vehicle.corridorTrip)).size,\n        patternOnly: scanned.filter(item => !item.matched && item.vehicle.inferredPattern === patternId && !item.vehicle.inferredTrip && !item.vehicle.corridorTracked).length\n"
);
multi = replaceOnce(multi, 'multi-vehicle accepted assertion', '  assert.equal(result.accepted, 5);\n', '  assert.equal(result.accepted, 0);\n');
multi = replaceOnce(multi, 'multi-vehicle distinct trip assertion', '  assert.equal(result.distinctTrips, 5);\n', '  assert.equal(result.distinctTrips, 0);\n');
multi = replaceOnce(multi, 'multi-vehicle inference assertion', '  assert.equal(result.inferred, true);\n', '  assert.equal(result.patternOnly, 5);\n');

fs.writeFileSync(multiPath, multi, 'utf8');
console.log('Aligned legacy browser regressions with Kerbside 0.7.5 UK-time and pattern-only inference semantics.');
