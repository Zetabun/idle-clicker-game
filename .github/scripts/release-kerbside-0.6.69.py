from pathlib import Path
import json
import re


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return updated


bus_path = Path("bus.html")
bus = bus_path.read_text()
bus = once(bus, "const APP_VERSION = '0.6.68';", "const APP_VERSION = '0.6.69';", "app version")

bus = once(
    bus,
    "const LIVE_ID_COLLISION_TTL_MS = MAX_AGE_MS+GPS_RESULT_GRACE_MS;\n"
    "const LIVE_ID_COLLISIONS = new Map();\n"
    "const SHARED_PHYSICAL_KEYS = new Map();\n",
    "const LIVE_ID_COLLISION_TTL_MS = MAX_AGE_MS+GPS_RESULT_GRACE_MS;\n"
    "const LIVE_ID_COLLISIONS = new Map();\n"
    "const LIVE_ID_ACTIVITIES = new Map();\n"
    "const LIVE_ANONYMOUS_TRACKS = new Map();\n"
    "const LIVE_ANONYMOUS_MATCH_MAX_METRES = 3000;\n"
    "let LIVE_ANONYMOUS_SLOT = 0;\n"
    "const SHARED_PHYSICAL_KEYS = new Map();\n",
    "identity state",
)

identity_helpers = r'''function liveActivityDiscriminator(fields){
  const item=String(fields&&fields.ItemIdentifier||'').trim();
  if(item) return 'item|'+item;
  const originTime=String(fields&&fields.OriginAimedDepartureTime||'').trim();
  if(originTime) return 'origin-time|'+originTime;
  const destinationTime=String(fields&&fields.DestinationAimedArrivalTime||'').trim();
  if(destinationTime) return 'destination-time|'+destinationTime;
  return '';
}
function pruneLiveIdentityCaches(now=Date.now()){
  for(const [key,expires] of LIVE_ID_COLLISIONS) if(Number(expires)<=now) LIVE_ID_COLLISIONS.delete(key);
  for(const [baseId,activities] of LIVE_ID_ACTIVITIES){
    for(const [identity,expires] of activities) if(Number(expires)<=now) activities.delete(identity);
    if(!activities.size) LIVE_ID_ACTIVITIES.delete(baseId);
  }
  for(const [baseId,tracks] of LIVE_ANONYMOUS_TRACKS){
    for(const [slot,track] of tracks) if(Number(track&&track.expires)<=now) tracks.delete(slot);
    if(!tracks.size) LIVE_ANONYMOUS_TRACKS.delete(baseId);
  }
  for(const [key,expires] of SHARED_PHYSICAL_KEYS) if(Number(expires)<=now) SHARED_PHYSICAL_KEYS.delete(key);
}
function rememberLiveActivity(baseId,identity,now=Date.now()){
  if(!baseId||!identity) return 0;
  let activities=LIVE_ID_ACTIVITIES.get(baseId);
  if(!activities){activities=new Map();LIVE_ID_ACTIVITIES.set(baseId,activities);}
  activities.set(identity,now+LIVE_ID_COLLISION_TTL_MS);
  return activities.size;
}
function anonymousActivityIdentity(baseId,record,usedSlots,now=Date.now()){
  let tracks=LIVE_ANONYMOUS_TRACKS.get(baseId);
  if(!tracks){tracks=new Map();LIVE_ANONYMOUS_TRACKS.set(baseId,tracks);}
  const signature=[record.line||'',record.dest||'',record.origin||''].join('|');
  let best=null;
  for(const [slot,track] of tracks){
    if(usedSlots.has(slot)||!track||track.signature!==signature) continue;
    const age=Math.max(0,(now-Number(track.ts||0))/1000);
    const maxMove=Math.min(LIVE_ANONYMOUS_MATCH_MAX_METRES,Math.max(120,age*30+80));
    const metres=dist(Number(track.lat),Number(track.lon),Number(record.lat),Number(record.lon));
    if(!isFinite(metres)||metres>maxMove) continue;
    if(!best||metres<best.metres) best={slot,metres};
  }
  const slot=best?best.slot:String(++LIVE_ANONYMOUS_SLOT);
  usedSlots.add(slot);
  tracks.set(slot,{slot,signature,lat:record.lat,lon:record.lon,ts:record.ts,expires:now+LIVE_ID_COLLISION_TTL_MS});
  return 'anonymous|'+slot;
}
function collisionVehicleIdentity(baseId,identity){
  return identity?baseId+'|activity|'+identity:baseId;
}
function promoteCollisionRecord(baseId){
  const legacy=S.vehicles.get(baseId);
  if(!legacy) return;
  const identity=String(legacy.activityIdentity||legacy.activityDiscriminator||'').trim();
  if(!identity) return;
  const promotedId=collisionVehicleIdentity(baseId,identity);
  if(promotedId===baseId) return;
  const current=S.vehicles.get(promotedId);
  S.vehicles.delete(baseId);
  legacy.id=promotedId;
  if(!current||Number(legacy.ts)>=Number(current.ts)) S.vehicles.set(promotedId,legacy);
}
'''

bus = regex_once(
    bus,
    r"function liveActivityDiscriminator\(fields\)\{.*?function collisionVehicleIdentity\(baseId,discriminator\)\{\n  return discriminator\?baseId\+'\|activity\|'\+discriminator:baseId;\n\}\n",
    identity_helpers,
    "identity helpers",
)

parser = r'''function parseLivePayloads(items,now){
  const observedAt=isFinite(now)?Number(now):Date.now(), candidates=[];
  let stale=0,unknownAge=0,malformed=0;
  const payloads=Array.isArray(items)?items:[];
  for(let payloadIndex=0;payloadIndex<payloads.length;payloadIndex++){
    const item=payloads[payloadIndex];
    const xml=new DOMParser().parseFromString(String(item&&item.text||''),'application/xml');
    if(xml.querySelector('parsererror')){malformed++;continue;}
    const acts=[...xml.getElementsByTagName('*')].filter(node=>node.localName==='VehicleActivity');
    for(const activity of acts){
      const f=flatten(activity);
      const lat=parseFloat(f.Latitude),lon=parseFloat(f.Longitude);
      if(!isFinite(lat)||!isFinite(lon)) continue;
      const parsed=f.RecordedAtTime?Date.parse(f.RecordedAtTime):NaN;
      if(!isFinite(parsed)){unknownAge++;continue;}
      const validUntil=f.ValidUntilTime?Date.parse(f.ValidUntilTime):NaN;
      const ts=parsed,age=observedAt-ts;
      if(age>MAX_AGE_MS||age < -120000||(isFinite(validUntil)&&observedAt>validUntil)){stale++;continue;}
      const journey=f.DatedVehicleJourneyRef||f.VehicleJourneyRef||'';
      const baseId=liveVehicleIdentity(f);
      if(!baseId) continue;
      candidates.push({
        id:baseId,baseId,activityDiscriminator:liveActivityDiscriminator(f),activityIdentity:'',payloadIndexes:[payloadIndex],itemIdentifier:f.ItemIdentifier||'',
        journey,vehicleRef:f.VehicleRef||'',corridorTracked:false,
        line:cleanLine(f.PublishedLineName||f.LineRef||'?'),lineRef:f.LineRef||'',
        dest:cleanName(f.DestinationName||f.DirectionName||''),destRef:f.DestinationRef||'',
        origin:cleanName(f.OriginName||''),originRef:f.OriginRef||'',operator:f.OperatorRef||'',
        declaredDir:(f.DirectionRef||'').toLowerCase(),lat,lon,bearing:parseFloat(f.Bearing),
        feedSpeed:parseFloat(f.Velocity),aimedOriginAt:f.OriginAimedDepartureTime?Date.parse(f.OriginAimedDepartureTime):NaN,
        aimedDestinationAt:f.DestinationAimedArrivalTime?Date.parse(f.DestinationAimedArrivalTime):NaN,
        validUntilAt:validUntil,ts,timestampKnown:true
      });
    }
  }
  pruneLiveIdentityCaches(observedAt);
  const uniqueCandidates=new Map();
  for(const record of candidates){
    const key=[record.baseId,record.activityDiscriminator,record.ts,Number(record.lat).toFixed(6),Number(record.lon).toFixed(6)].join('|');
    const current=uniqueCandidates.get(key);
    if(current){
      current.payloadIndexes=[...new Set([...(current.payloadIndexes||[]),...(record.payloadIndexes||[])])];
    }else uniqueCandidates.set(key,record);
  }
  const groups=new Map();
  for(const record of uniqueCandidates.values()){
    const group=groups.get(record.baseId)||[];group.push(record);groups.set(record.baseId,group);
  }
  const byId=new Map();let identityCollisions=0;
  for(const [baseId,records] of groups){
    const counts=new Map();
    for(const record of records){
      if(record.activityDiscriminator) counts.set(record.activityDiscriminator,(counts.get(record.activityDiscriminator)||0)+1);
    }
    const ordered=[...records].sort((a,b)=>
      String(a.activityDiscriminator||'').localeCompare(String(b.activityDiscriminator||''))||
      String(a.line||'').localeCompare(String(b.line||''),undefined,{numeric:true})||
      String(a.dest||'').localeCompare(String(b.dest||''))||Number(a.lat)-Number(b.lat)||Number(a.lon)-Number(b.lon)
    );
    const usedAnonymous=new Set(),identityByRecord=new Map();
    for(const record of ordered){
      const duplicate=record.activityDiscriminator&&(counts.get(record.activityDiscriminator)||0)>1;
      const identity=!record.activityDiscriminator||duplicate?anonymousActivityIdentity(baseId,record,usedAnonymous,observedAt):record.activityDiscriminator;
      identityByRecord.set(record,identity);rememberLiveActivity(baseId,identity,observedAt);
    }
    const known=LIVE_ID_ACTIVITIES.get(baseId),split=records.length>1||!!(known&&known.size>1)||LIVE_ID_COLLISIONS.has(baseId);
    if(split){
      LIVE_ID_COLLISIONS.set(baseId,observedAt+LIVE_ID_COLLISION_TTL_MS);
      identityCollisions+=Math.max(0,records.length-1,(known?known.size:0)-1);
      for(const record of records){
        const physical=physicalVehicleKey(record);
        if(physical) SHARED_PHYSICAL_KEYS.set(physical,observedAt+LIVE_ID_COLLISION_TTL_MS);
      }
    }
    for(const original of records){
      const activityIdentity=identityByRecord.get(original)||'';
      const id=split?collisionVehicleIdentity(baseId,activityIdentity):baseId;
      const record={...original,id,activityIdentity};
      const current=byId.get(id);
      if(!current){byId.set(id,record);continue;}
      const payloadIndexes=[...new Set([...(current.payloadIndexes||[]),...(record.payloadIndexes||[])])];
      if(record.ts>current.ts){record.payloadIndexes=payloadIndexes;byId.set(id,record);}
      else current.payloadIndexes=payloadIndexes;
    }
  }
  return {vehicles:[...byId.values()],stale,unknownAge,malformed,identityCollisions};
}'''

bus = regex_once(
    bus,
    r"function parseLivePayloads\(items,now\)\{.*?\n\}\nif\(typeof window",
    parser + "\nif(typeof window",
    "live parser",
)

bus = once(
    bus,
    "  for(const v of list){\n    const prev = S.vehicles.get(v.id);",
    "  for(const v of list){\n    if(v&&v.baseId&&v.id!==v.baseId) promoteCollisionRecord(v.baseId);\n    const prev = S.vehicles.get(v.id);",
    "collision promotion",
)

bus = once(
    bus,
    "  for(const [id,v] of S.vehicles){\n    if(now-v.ts>MAX_AGE_MS+GPS_RESULT_GRACE_MS) S.vehicles.delete(id);\n  }",
    "  for(const [id,v] of S.vehicles){\n    const producerExpired=isFinite(Number(v.validUntilAt))&&now>Number(v.validUntilAt);\n    if(producerExpired||now-v.ts>MAX_AGE_MS+GPS_RESULT_GRACE_MS) S.vehicles.delete(id);\n  }",
    "producer expiry cleanup",
)

bus = once(
    bus,
    "  for(const v of S.vehicles.values()){\n    const age=now-v.ts;\n    if(age>MAX_AGE_MS){",
    "  for(const v of S.vehicles.values()){\n    const age=now-v.ts;\n    const producerExpired=isFinite(Number(v.validUntilAt))&&now>Number(v.validUntilAt);\n    if(producerExpired){ rejectLive(diagnostics,'stale'); continue; }\n    if(age>MAX_AGE_MS){",
    "producer expiry filter",
)

old_route_scan = '''    const merged=new Map();
    for(const result of settled){
      if(result.status!=='fulfilled') continue;
      const parsed=parseLivePayloads([result.value.item],Date.now());
      for(const vehicle of parsed.vehicles){
        const tracked=rememberRouteScanVehicle(vehicle);
        const matched=matchRouteScanVehicle(result.value.plan,tracked); if(!matched) continue;
        const current=merged.get(matched.id); if(!current||matched.ts>current.ts) merged.set(matched.id,matched);
      }
    }
'''
new_route_scan = '''    const merged=new Map();
    const successful=settled.filter(result=>result.status==='fulfilled').map(result=>result.value);
    const parsed=parseLivePayloads(successful.map(entry=>entry.item),Date.now());
    for(const vehicle of parsed.vehicles){
      const tracked=rememberRouteScanVehicle(vehicle);
      const indexes=Array.isArray(vehicle.payloadIndexes)&&vehicle.payloadIndexes.length?vehicle.payloadIndexes:successful.map((_,index)=>index);
      let matched=null;
      for(const index of indexes){
        const plan=successful[index]&&successful[index].plan;if(!plan) continue;
        matched=matchRouteScanVehicle(plan,tracked);if(matched) break;
      }
      if(!matched) continue;
      const current=merged.get(matched.id); if(!current||matched.ts>current.ts) merged.set(matched.id,matched);
    }
'''
bus = once(bus, old_route_scan, new_route_scan, "route scan combined parsing")

bus_path.write_text(bus)

browser_path = Path("kerbside-backend/tests/browser-regression.mjs")
browser = browser_path.read_text()
version_occurrences = browser.count("0.6.68")
if version_occurrences < 2:
    raise SystemExit(f"browser version: expected at least two matches, found {version_occurrences}")
browser = browser.replace("0.6.68", "0.6.69")
needle = "assert.match(busSource, /function parseLivePayloads\\(items,now\\)/);\n"
addition = needle + "assert.match(busSource, /const LIVE_ID_ACTIVITIES = new Map\\(\\)/);\nassert.match(busSource, /function anonymousActivityIdentity\\(baseId,record,usedSlots,now=Date\\.now\\(\\)\\)/);\nassert.match(busSource, /function promoteCollisionRecord\\(baseId\\)/);\nassert.match(busSource, /validUntilAt:validUntil/);\nassert.match(busSource, /parseLivePayloads\\(successful\\.map\\(entry=>entry\\.item\\),Date\\.now\\(\\)\\)/);\nassert.doesNotMatch(busSource, /parseLivePayloads\\(\\[result\\.value\\.item\\],Date\\.now\\(\\)\\)/);\n"
browser = once(browser, needle, addition, "browser identity assertions")
browser_path.write_text(browser)

identity_test = r'''import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..', '..');
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname === '/' ? 'bus.html' : pathname.replace(/^\/+/, '');
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) && target !== path.join(root, 'bus.html')) throw new Error('outside root');
    const body = await readFile(target);
    const type = path.extname(target) === '.css' ? 'text/css; charset=utf-8' : path.extname(target) === '.js' ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const browser = await webkit.launch({ headless: true });
const page = await browser.newPage({ timezoneId: 'Europe/London' });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(`http://127.0.0.1:${port}/bus.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__KERBSIDE_TEST__), null, { timeout: 20000 });
  const result = await page.evaluate(() => {
    const api = window.__KERBSIDE_TEST__;
    const state = api.liveState;
    const now = Date.now();
    const savedVehicles = state.vehicles;
    const wrap = content => `<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery>${content}</VehicleMonitoringDelivery></ServiceDelivery></Siri>`;
    const activity = ({ operator, journey, vehicle, item, lat, time = now - 1000, validUntil, originTime, destinationTime }) => `<VehicleActivity>
      ${item == null ? '' : `<ItemIdentifier>${item}</ItemIdentifier>`}
      <RecordedAtTime>${new Date(time).toISOString()}</RecordedAtTime>
      ${validUntil == null ? '' : `<ValidUntilTime>${new Date(validUntil).toISOString()}</ValidUntilTime>`}
      <MonitoredVehicleJourney><LineRef>61</LineRef><PublishedLineName>61</PublishedLineName>
      <OperatorRef>${operator}</OperatorRef><VehicleRef>${vehicle}</VehicleRef><DatedVehicleJourneyRef>${journey}</DatedVehicleJourneyRef>
      <DestinationName>Town Centre</DestinationName>
      ${originTime == null ? '' : `<OriginAimedDepartureTime>${new Date(originTime).toISOString()}</OriginAimedDepartureTime>`}
      ${destinationTime == null ? '' : `<DestinationAimedArrivalTime>${new Date(destinationTime).toISOString()}</DestinationAimedArrivalTime>`}
      <VehicleLocation><Longitude>-2.1000</Longitude><Latitude>${lat}</Latitude></VehicleLocation>
      <Bearing>0</Bearing><Velocity>6</Velocity></MonitoredVehicleJourney></VehicleActivity>`;

    try {
      const together = api.parseLivePayloads([
        { text: wrap(activity({ operator: 'OP-TOGETHER', journey: 'J', vehicle: 'V', item: 'A', lat: 52.40 })) },
        { text: wrap(activity({ operator: 'OP-TOGETHER', journey: 'J', vehicle: 'V', item: 'B', lat: 52.42 })) }
      ], now);

      state.vehicles = new Map();
      const first = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-SEPARATE', journey: 'J', vehicle: 'V', item: 'A', lat: 52.40 })) }], now);
      api.ingest(first.vehicles);
      const second = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-SEPARATE', journey: 'J', vehicle: 'V', item: 'B', lat: 52.42 })) }], now + 1000);
      api.ingest(second.vehicles);
      const separateIds = [...state.vehicles.keys()].sort();

      const anonymous = api.parseLivePayloads([{ text: wrap(
        activity({ operator: 'OP-ANON', journey: 'J', vehicle: 'V', item: null, lat: 52.40 }) +
        activity({ operator: 'OP-ANON', journey: 'J', vehicle: 'V', item: null, lat: 52.42 })
      ) }], now);

      state.vehicles = new Map();
      const anonymousFirst = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-ANON-SEPARATE', journey: 'J', vehicle: 'V', item: null, lat: 52.40 })) }], now);
      api.ingest(anonymousFirst.vehicles);
      const anonymousSecond = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-ANON-SEPARATE', journey: 'J', vehicle: 'V', item: null, lat: 52.42 })) }], now + 1000);
      api.ingest(anonymousSecond.vehicles);
      const anonymousSeparateIds = [...state.vehicles.keys()].sort();

      const duplicate = api.parseLivePayloads([
        { text: wrap(activity({ operator: 'OP-DUP', journey: 'J', vehicle: 'V', item: null, lat: 52.40 })) },
        { text: wrap(activity({ operator: 'OP-DUP', journey: 'J', vehicle: 'V', item: null, lat: 52.40 })) }
      ], now);

      const expired = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-EXP', journey: 'J', vehicle: 'V', item: 'expired', lat: 52.40, validUntil: now - 1 })) }], now);
      const valid = api.parseLivePayloads([{ text: wrap(activity({ operator: 'OP-VALID', journey: 'J', vehicle: 'V', item: 'valid', lat: 52.40, validUntil: now + 60000 })) }], now);

      return {
        togetherCount: together.vehicles.length,
        togetherSplit: together.vehicles.every(vehicle => vehicle.id.includes('|activity|item|')),
        togetherPayloads: together.vehicles.map(vehicle => vehicle.payloadIndexes),
        separateCount: separateIds.length,
        separatePromoted: separateIds.every(id => id.includes('|activity|item|')),
        anonymousCount: anonymous.vehicles.length,
        anonymousDistinct: new Set(anonymous.vehicles.map(vehicle => vehicle.id)).size,
        anonymousNamed: anonymous.vehicles.every(vehicle => vehicle.id.includes('|activity|anonymous|')),
        anonymousSeparateCount: anonymousSeparateIds.length,
        anonymousSeparatePromoted: anonymousSeparateIds.every(id => id.includes('|activity|anonymous|')),
        duplicateCount: duplicate.vehicles.length,
        duplicatePayloads: duplicate.vehicles[0]?.payloadIndexes,
        expiredCount: expired.vehicles.length,
        expiredStale: expired.stale,
        validCount: valid.vehicles.length,
        validUntilStored: Number.isFinite(valid.vehicles[0]?.validUntilAt)
      };
    } finally {
      state.vehicles = savedVehicles;
    }
  });

  assert.equal(result.togetherCount, 2);
  assert.equal(result.togetherSplit, true);
  assert.deepEqual(result.togetherPayloads, [[0], [1]]);
  assert.equal(result.separateCount, 2);
  assert.equal(result.separatePromoted, true);
  assert.equal(result.anonymousCount, 2);
  assert.equal(result.anonymousDistinct, 2);
  assert.equal(result.anonymousNamed, true);
  assert.equal(result.anonymousSeparateCount, 2);
  assert.equal(result.anonymousSeparatePromoted, true);
  assert.equal(result.duplicateCount, 1);
  assert.deepEqual(result.duplicatePayloads, [0, 1]);
  assert.equal(result.expiredCount, 0);
  assert.equal(result.expiredStale, 1);
  assert.equal(result.validCount, 1);
  assert.equal(result.validUntilStored, true);
  assert.deepEqual(pageErrors, []);
  console.log('Kerbside cross-poll identity and producer-expiry regression passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
'''
Path("kerbside-backend/tests/identity-regression.mjs").write_text(identity_test)

worker_path = Path("kerbside-backend/src/worker.js")
worker = worker_path.read_text()
worker = once(worker, "version: '0.6.68',", "version: '0.6.69',", "worker version")
worker_path.write_text(worker)

worker_test_path = Path("kerbside-backend/test/worker.test.js")
worker_test = worker_test_path.read_text()
worker_test = once(worker_test, "assert.equal(body.version, '0.6.68');", "assert.equal(body.version, '0.6.69');", "worker test version")
worker_test_path.write_text(worker_test)

package_path = Path("kerbside-backend/package.json")
package_data = json.loads(package_path.read_text())
if package_data.get("version") != "0.6.68":
    raise SystemExit(f"package predecessor mismatch: {package_data.get('version')}")
package_data["version"] = "0.6.69"
package_path.write_text(json.dumps(package_data, indent=2) + "\n")

readme_path = Path("kerbside-backend/README.md")
readme = readme_path.read_text()
readme += "\nKerbside 0.6.69 closes the remaining cross-poll multi-bus identity gap. Corridor XML responses are parsed as one identity batch while retaining their source-plan indexes, activity identities persist across nearby and corridor polls, existing unsplit records are promoted when a later collision is discovered, and identifier-free activities use bounded nearest-track slots instead of silently overwriting one another. Exact duplicate observations across overlapping boxes are still deduplicated. SIRI ValidUntilTime is now respected as a hard producer expiry, and dedicated regressions cover combined boxes, separate polls, anonymous activities, overlapping responses and expired reports.\n"
readme_path.write_text(readme)
