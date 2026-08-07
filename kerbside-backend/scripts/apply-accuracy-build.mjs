#!/usr/bin/env node
import fs from 'node:fs';

const filename = 'bus.html';
const version = String(process.argv[2] || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Usage: node apply-accuracy-build.mjs <semver>');
}

let source = fs.readFileSync(filename, 'utf8');
const original = source;

function replaceOnce(label, pattern, replacement) {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`${label}: expected exactly one match, found ${matches.length}`);
  source = source.replace(pattern, replacement);
}

function insertBeforeOnce(label, marker, insertion) {
  const first = source.indexOf(marker);
  const last = source.lastIndexOf(marker);
  if (first < 0 || first !== last) throw new Error(`${label}: expected exactly one marker`);
  source = source.slice(0, first) + insertion + source.slice(first);
}

// Freshness for retaining a vehicle and freshness for trusting a numerical ETA
// are deliberately separate. The latter follows the operator's observed report
// cadence and degrades much sooner than the two-minute board-retention window.
insertBeforeOnce(
  'ETA freshness helpers',
  'function estimate(v, stop, evidenceOverride, geometryOverride){',
`const ETA_MIN_FRESH_SECONDS = 30;\nconst ETA_MAX_FRESH_SECONDS = 75;\nconst ETA_CADENCE_MULTIPLIER = 1.75;\nfunction etaFreshWindowSeconds(cadence){\n  const seconds=Number(cadence);\n  if(!Number.isFinite(seconds)||seconds<=0) return 45;\n  return Math.max(ETA_MIN_FRESH_SECONDS,Math.min(ETA_MAX_FRESH_SECONDS,seconds*ETA_CADENCE_MULTIPLIER));\n}\nfunction etaGpsQuality(v,now=Date.now()){\n  const age=Math.max(0,(Number(now)-Number(v&&v.ts))/1000);\n  const cadence=Number(v&&v.cadence);\n  const freshWindow=etaFreshWindowSeconds(cadence);\n  return {age,cadence:Number.isFinite(cadence)&&cadence>0?cadence:null,freshWindow,fresh:age<=freshWindow};\n}\nfunction scheduleEtaBlendWeight(evidence,quality){\n  // Journey identity establishes *which* departure this is; it must not drag a\n  // fresh GPS prediction back towards the static timetable. Fresh live data gets\n  // only a small stabilising correction. Delayed positions may lean slightly\n  // more on schedule, but never at the old 32-42% weights.\n  if(!quality||!quality.fresh) return .12;\n  if(evidence&&evidence.inferredJourney) return .08;\n  if(evidence&&evidence.journeyMatch) return .06;\n  return timetableTrusted(evidence) ? .08 : .10;\n}\n`
);

replaceOnce(
  'GPS age compensation',
  /  const age = Math\.min\(Math\.max\(0,\(Date\.now\(\)-v\.ts\)\/1000\), 75\);\n  let spatial = Math\.max\(road\/MAX_SPEED, road\/sp \+ dwell - age\*0\.35\);/g,
`  const quality=etaGpsQuality(v);\n  // Credit elapsed time while the position remains prediction-fresh. Cap the\n  // extrapolation using the bus's own reporting cadence so a delayed feed does\n  // not keep counting down as if the vehicle were still moving normally.\n  const cadenceForAge=quality.cadence||Math.max(10,Number(S.interval)||15);\n  const ageCredit=Math.min(quality.age,Math.max(20,cadenceForAge*1.25),60);\n  let spatial = Math.max(road/MAX_SPEED, road/sp + dwell - ageCredit);`
);

replaceOnce(
  'schedule blend weight',
  /      const weight=evidence\.inferredJourney \? \.34 : evidence\.journeyMatch \? \.42 : timetableTrusted\(evidence\) \? \.32 : \.18;\n      spatial=spatial\*\(1-weight\)\+Math\.max\(0,schedSecs\)\*weight;/g,
`      const weight=scheduleEtaBlendWeight(evidence,quality);\n      spatial=spatial*(1-weight)+Math.max(0,schedSecs)*weight;`
);

replaceOnce(
  'prediction confidence degradation',
  /  const confidence=points>=6\?'high':points>=3\?'medium':'low';\n  const spread=confidence==='high'\?90:confidence==='medium'\?210:360;\n  const learned=LINES\[lineLearningKey\(v\)\];\n  return \{secs:spatial, liveSecs, metres:straight, routeMetres:geometry&&geometry\.remaining>0\?geometry\.remaining:null, geometry, learned:!!\(learned&&learned\.n>=3\), confidence, spread, evidence, schedule, matchedSchedule\};/g,
`  const baseConfidence=points>=6?'high':points>=3?'medium':'low';\n  const confidence=quality.fresh?baseConfidence:'low';\n  const baseSpread=confidence==='high'?90:confidence==='medium'?210:360;\n  const spread=quality.fresh?baseSpread:Math.max(420,baseSpread);\n  const learned=LINES[lineLearningKey(v)];\n  return {secs:spatial, liveSecs, metres:straight, routeMetres:geometry&&geometry.remaining>0?geometry.remaining:null, geometry, learned:!!(learned&&learned.n>=3), confidence, spread, evidence, schedule, matchedSchedule, predictionDelayed:!quality.fresh, gpsAge:quality.age, gpsFreshWindow:quality.freshWindow};`
);

// Expose the new helpers to the existing localhost-only regression harness.
replaceOnce(
  'test helper export',
  /timetableTrusted,originTimeMatches,uniqueOriginTrips,ORIGIN_MATCH_TOLERANCE_MS,physicalVehicleKey,estimate,journeyGeometry/g,
  'timetableTrusted,originTimeMatches,uniqueOriginTrips,ORIGIN_MATCH_TOLERANCE_MS,physicalVehicleKey,estimate,etaFreshWindowSeconds,etaGpsQuality,scheduleEtaBlendWeight,journeyGeometry'
);

if (source === original) throw new Error('Accuracy patch made no changes');
fs.writeFileSync(filename, source, 'utf8');
fs.writeFileSync('VERSION', version + '\n', 'utf8');
console.log(`Applied Kerbside ETA/GPS freshness build ${version}.`);
