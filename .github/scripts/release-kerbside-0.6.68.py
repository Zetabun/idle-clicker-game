from pathlib import Path
import json
import re


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


bus_path = Path('bus.html')
bus = bus_path.read_text(encoding='utf-8')
bus = once(bus, "const APP_VERSION = '0.6.67';", "const APP_VERSION = '0.6.68';", 'app version')
bus = once(bus, 'const ROUTE_SCAN_PATTERN_LIMIT = 36;', 'const ROUTE_SCAN_PATTERN_LIMIT = 72;', 'scan budget')
bus = once(
    bus,
    'const GPS_RESULT_GRACE_MS = 6*60*1000;\n',
    'const GPS_RESULT_GRACE_MS = 6*60*1000;\n'
    'const LIVE_ID_COLLISION_TTL_MS = MAX_AGE_MS+GPS_RESULT_GRACE_MS;\n'
    'const LIVE_ID_COLLISIONS = new Map();\n'
    'const SHARED_PHYSICAL_KEYS = new Map();\n',
    'identity caches',
)

bus = once(
    bus,
    "    const match={trip:String(row.trip),line:String(row.line),head:row.head||'',pattern,targetAlong};",
    "    const match={trip:String(row.trip),line:String(row.line),head:row.head||'',pattern,targetAlong,at:Number(row.at)||0};",
    'route scan time',
)

old = '''function inferredRouteScanMatch(plan,v){
  const byPattern=new Map();
  for(const match of plan.matches||[]){
    if(String(v.line)!==String(match.line)) continue;
    const similarity=v.dest&&match.head?destinationSimilarity(v.dest,match.head):1;
    if(v.dest&&match.head&&similarity<.34) continue;
    const fit=routePatternMovementFit(match.pattern,v,S.stop);
    if(!fit) continue;
    const score=fit.meanOffset*.55+fit.current.metres*.45+(1-similarity)*90;
    const candidate={trip:String(match.trip),pattern:match.pattern,fit,score,row:match};
    const current=byPattern.get(match.pattern.id);
    if(!current||candidate.score<current.score) byPattern.set(match.pattern.id,candidate);
  }
  const best=chooseInferredJourneyCandidate([...byPattern.values()]);
  return best&&best.row||null;
}
'''
new = '''function inferredRouteScanMatch(plan,v,now=Date.now()){
  const byPattern=new Map();
  for(const match of plan.matches||[]){
    if(String(v.line)!==String(match.line)) continue;
    const similarity=v.dest&&match.head?destinationSimilarity(v.dest,match.head):1;
    if(v.dest&&match.head&&similarity<.34) continue;
    const fit=routePatternMovementFit(match.pattern,v,S.stop);
    if(!fit) continue;
    const rawSpeed=Number(v.speed),feedSpeed=Number(v.feedSpeed);
    const speed=isFinite(rawSpeed)&&rawSpeed>=MIN_SPEED&&rawSpeed<=MAX_SPEED?rawSpeed:isFinite(feedSpeed)&&feedSpeed>=MIN_SPEED&&feedSpeed<=MAX_SPEED?feedSpeed:DEFAULT_SPEED;
    const routeSecs=Math.max(0,fit.remaining)/speed+(Math.max(0,fit.remaining)/1000)*24;
    const scheduleSecs=(Number(match.at)-now)/1000;
    const scheduleGap=isFinite(scheduleSecs)?Math.abs(scheduleSecs-routeSecs):0;
    const score=fit.meanOffset*.55+fit.current.metres*.45+(1-similarity)*90+Math.min(900,scheduleGap*.45);
    const candidate={trip:String(match.trip),pattern:match.pattern,fit,score,scheduleGap,row:match};
    const current=byPattern.get(match.pattern.id);
    if(!current||candidate.score<current.score) byPattern.set(match.pattern.id,candidate);
  }
  const best=chooseInferredJourneyCandidate([...byPattern.values()]);
  return best&&best.row||null;
}
'''
bus = once(bus, old, new, 'schedule-aware scan matching')

old = '''function matchRouteScanVehicle(plan,v){
  if(!plan||!v) return null;
  let match=null,inferred=false;
  if(v.journey){
    const tripMatch=uniqueCompatibleTrips(plan.matches,v.journey,item=>item.trip);
    if(!tripMatch.items.length||tripMatch.ambiguous) return null;
    match=tripMatch.items[0];
  }else{
    match=inferredRouteScanMatch(plan,v); inferred=!!match;
    if(!match) return null;
  }
'''
new = '''function matchRouteScanVehicle(plan,v){
  if(!plan||!v) return null;
  let match=null,inferred=false;
  if(v.journey){
    const tripMatch=uniqueCompatibleTrips(plan.matches,v.journey,item=>item.trip);
    if(tripMatch.items.length&&!tripMatch.ambiguous) match=tripMatch.items[0];
  }
  // Private operator journey aliases often do not equal the public timetable trip.
  // Fall back to ordered route movement and schedule timing rather than hiding the bus.
  if(!match){
    match=inferredRouteScanMatch(plan,v); inferred=!!match;
    if(!match) return null;
  }
'''
bus = once(bus, old, new, 'private journey alias fallback')

physical = '''function physicalVehicleKey(v){
  const owner=String(v&&v.operator||'').trim()||'unknown';
  const vehicle=String(v&&v.vehicleRef||'').trim();
  return vehicle?owner+'|'+vehicle:'';
}
'''
helpers = physical + '''function liveActivityDiscriminator(fields){
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
  for(const [key,expires] of SHARED_PHYSICAL_KEYS) if(Number(expires)<=now) SHARED_PHYSICAL_KEYS.delete(key);
}
function collisionVehicleIdentity(baseId,discriminator){
  return discriminator?baseId+'|activity|'+discriminator:baseId;
}
'''
bus = once(bus, physical, helpers, 'identity helpers')

parser = r'''function parseLivePayloads(items,now){
  const observedAt=isFinite(now)?Number(now):Date.now(), candidates=[];
  let stale=0,unknownAge=0,malformed=0;
  for(const item of Array.isArray(items)?items:[]){
    const xml=new DOMParser().parseFromString(String(item&&item.text||''),'application/xml');
    if(xml.querySelector('parsererror')){malformed++;continue;}
    const acts=[...xml.getElementsByTagName('*')].filter(node=>node.localName==='VehicleActivity');
    for(const activity of acts){
      const f=flatten(activity);
      const lat=parseFloat(f.Latitude),lon=parseFloat(f.Longitude);
      if(!isFinite(lat)||!isFinite(lon)) continue;
      const parsed=f.RecordedAtTime?Date.parse(f.RecordedAtTime):NaN;
      if(!isFinite(parsed)){unknownAge++;continue;}
      const ts=parsed,age=observedAt-ts;
      if(age>MAX_AGE_MS||age < -120000){stale++;continue;}
      const journey=f.DatedVehicleJourneyRef||f.VehicleJourneyRef||'';
      const baseId=liveVehicleIdentity(f);
      if(!baseId) continue;
      candidates.push({
        id:baseId,baseId,activityDiscriminator:liveActivityDiscriminator(f),itemIdentifier:f.ItemIdentifier||'',
        journey,vehicleRef:f.VehicleRef||'',corridorTracked:false,
        line:cleanLine(f.PublishedLineName||f.LineRef||'?'),lineRef:f.LineRef||'',
        dest:cleanName(f.DestinationName||f.DirectionName||''),destRef:f.DestinationRef||'',
        origin:cleanName(f.OriginName||''),originRef:f.OriginRef||'',operator:f.OperatorRef||'',
        declaredDir:(f.DirectionRef||'').toLowerCase(),lat,lon,bearing:parseFloat(f.Bearing),
        feedSpeed:parseFloat(f.Velocity),aimedOriginAt:f.OriginAimedDepartureTime?Date.parse(f.OriginAimedDepartureTime):NaN,
        aimedDestinationAt:f.DestinationAimedArrivalTime?Date.parse(f.DestinationAimedArrivalTime):NaN,
        ts,timestampKnown:true
      });
    }
  }
  pruneLiveIdentityCaches(observedAt);
  const groups=new Map();
  for(const record of candidates){const group=groups.get(record.baseId)||[];group.push(record);groups.set(record.baseId,group);}
  const byId=new Map();let identityCollisions=0;
  for(const [baseId,records] of groups){
    const discriminators=new Set(records.map(record=>record.activityDiscriminator).filter(Boolean));
    if(discriminators.size>1){LIVE_ID_COLLISIONS.set(baseId,observedAt+LIVE_ID_COLLISION_TTL_MS);identityCollisions+=discriminators.size-1;}
    const split=LIVE_ID_COLLISIONS.has(baseId);
    for(const original of records){
      const id=split?collisionVehicleIdentity(baseId,original.activityDiscriminator):baseId;
      const record={...original,id};delete record.baseId;delete record.activityDiscriminator;
      const current=byId.get(id);if(!current||record.ts>current.ts) byId.set(id,record);
    }
  }
  return {vehicles:[...byId.values()],stale,unknownAge,malformed,identityCollisions};
}'''
bus, count = re.subn(
    r'function parseLivePayloads\(items,now\)\{.*?\n\}\nif\(typeof window',
    lambda match: parser + '\nif(typeof window',
    bus,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'parser replacement count {count}')

old = '''function ingestBatchIndex(list){
  const ids=new Set(), shared=new Set(), seen=new Set();
  for(const v of Array.isArray(list)?list:[]){
    ids.add(v.id);
    const key=physicalVehicleKey(v);
    if(!key) continue;
    if(seen.has(key)) shared.add(key); else seen.add(key);
  }
  return {ids,shared};
}
'''
new = '''function ingestBatchIndex(list,now=Date.now()){
  pruneLiveIdentityCaches(now);
  const ids=new Set(), shared=new Set(), seen=new Set();
  for(const v of Array.isArray(list)?list:[]){
    ids.add(v.id);
    const key=physicalVehicleKey(v);
    if(!key) continue;
    if(seen.has(key)){shared.add(key);SHARED_PHYSICAL_KEYS.set(key,now+LIVE_ID_COLLISION_TTL_MS);}else seen.add(key);
  }
  // Shared placeholders remain shared across partial and overlapping feed responses.
  for(const [key,expires] of SHARED_PHYSICAL_KEYS) if(Number(expires)>now) shared.add(key);
  return {ids,shared};
}
'''
bus = once(bus, old, new, 'persistent shared identifiers')
bus = once(bus, '  const now=Date.now(), batch=ingestBatchIndex(list);', '  const now=Date.now(), batch=ingestBatchIndex(list,now);', 'batch timestamp')
bus_path.write_text(bus, encoding='utf-8')

browser = Path('kerbside-backend/tests/browser-regression.mjs')
text = browser.read_text(encoding='utf-8')
text = once(text, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.67'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.68'/);", 'browser version')
browser.write_text(text, encoding='utf-8')

multi = Path('kerbside-backend/tests/multi-vehicle-regression.mjs')
text = multi.read_text(encoding='utf-8')
text = once(
    text,
    '      const rows = api.relevant();\n\n      const trips =',
    '      const rows = api.relevant();\n      const storedAfterPartial = state.vehicles.size;\n\n      const trips =',
    'capture multi-vehicle count',
)
text = once(text, '        storedAfterPartial: state.vehicles.size,', '        storedAfterPartial,', 'use captured multi-vehicle count')
multi.write_text(text, encoding='utf-8')

worker = Path('kerbside-backend/src/worker.js')
worker.write_text(once(worker.read_text(encoding='utf-8'), "version: '0.6.60',", "version: '0.6.68',", 'worker version'), encoding='utf-8')
worker_test = Path('kerbside-backend/test/worker.test.js')
worker_test.write_text(once(worker_test.read_text(encoding='utf-8'), "assert.equal(body.version, '0.6.60');", "assert.equal(body.version, '0.6.68');", 'worker test version'), encoding='utf-8')
package = Path('kerbside-backend/package.json')
data = json.loads(package.read_text(encoding='utf-8'))
data['version'] = '0.6.68'
package.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
readme = Path('kerbside-backend/README.md')
readme.write_text(
    readme.read_text(encoding='utf-8')
    + "\nKerbside 0.6.68 preserves simultaneous buses even when an operator reuses both journey and vehicle references. Stable SIRI activity identifiers now separate colliding records, shared fleet placeholders remain shared across partial polls, and timetable corridor matching can recover from private journey aliases using ordered route movement and schedule timing. The larger busy-stop scan budget and dedicated five-bus regression apply to every route.\n",
    encoding='utf-8',
)
