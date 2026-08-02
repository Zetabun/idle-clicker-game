from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one regex match, found {count}')
    return updated


bus_path = 'bus.html'
bus = read(bus_path)
bus = replace_once(bus, "const APP_VERSION = '0.6.34';", "const APP_VERSION = '0.6.35';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.34 also recovers from repeated CARTO basemap tile failures by switching once to the standard OpenStreetMap tile endpoint with visible attribution; the live board continues to work throughout.",
    "Version 0.6.35 also parses namespaced SIRI-VM payloads through an executed fixture suite and scopes vehicle identities by operator, preventing two operators that reuse the same VehicleRef from overwriting one another.",
    'coverage release note'
)

flatten_block = """/* flatten a <VehicleActivity> subtree into {localName: text} */
function flatten(node, out){
  out = out || {};
  for(let c=node.firstElementChild; c; c=c.nextElementSibling){
    if(c.firstElementChild) flatten(c,out);
    else if(!(c.localName in out)) out[c.localName]=c.textContent.trim();
  }
  return out;
}
"""
parser_block = flatten_block + """
function liveVehicleIdentity(fields){
  const operator=String(fields&&fields.OperatorRef||'').trim();
  const vehicle=String(fields&&fields.VehicleRef||'').trim();
  const journey=String(fields&&(fields.DatedVehicleJourneyRef||fields.VehicleJourneyRef)||'').trim();
  if(vehicle) return (operator?operator+'|':'')+'vehicle|'+vehicle;
  if(journey) return (operator?operator+'|':'')+'journey|'+journey;
  return '';
}
function parseLivePayloads(items,now){
  const observedAt=isFinite(now)?Number(now):Date.now(), byId=new Map();
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
      const timestampKnown=isFinite(parsed);
      if(!timestampKnown){unknownAge++;continue;}
      const ts=parsed,age=observedAt-ts;
      if(age>MAX_AGE_MS||age < -120000){stale++;continue;}
      const journey=f.DatedVehicleJourneyRef||f.VehicleJourneyRef||'';
      const id=liveVehicleIdentity(f);
      if(!id) continue;
      const record={
        id,journey,vehicleRef:f.VehicleRef||'',
        line:cleanLine(f.PublishedLineName||f.LineRef||'?'),
        lineRef:f.LineRef||'',
        dest:cleanName(f.DestinationName||f.DirectionName||''),
        destRef:f.DestinationRef||'',
        origin:cleanName(f.OriginName||''),originRef:f.OriginRef||'',
        operator:f.OperatorRef||'',
        declaredDir:(f.DirectionRef||'').toLowerCase(),
        lat,lon,
        bearing:parseFloat(f.Bearing),
        feedSpeed:parseFloat(f.Velocity),
        aimedOriginAt:f.OriginAimedDepartureTime?Date.parse(f.OriginAimedDepartureTime):NaN,
        aimedDestinationAt:f.DestinationAimedArrivalTime?Date.parse(f.DestinationAimedArrivalTime):NaN,
        ts,timestampKnown
      };
      const current=byId.get(id);
      if(!current||record.ts>current.ts) byId.set(id,record);
    }
  }
  return {vehicles:[...byId.values()],stale,unknownAge,malformed};
}
if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads};
}
"""
bus = replace_once(bus, flatten_block, parser_block, 'SIRI parser helpers')

fetch_pattern = r"  S\.feedFallback=successful\.some\(item=>item\.fallback\);\n  const now = Date\.now\(\), byId=new Map\(\);.*?  return out;\n}\n\n/\* ============================================================\n   Simulator"
fetch_replacement = """  S.feedFallback=successful.some(item=>item.fallback);
  const parsed=parseLivePayloads(successful,Date.now());
  const out=parsed.vehicles;
  S.feedStale=parsed.stale;S.feedUnknownAge=parsed.unknownAge;
  if(!out.length&&parsed.malformed===successful.length) throw {soft:true,msg:'The live feed returned malformed XML.'};
  if(!out.length&&(parsed.stale||parsed.unknownAge)) throw {soft:true,msg:'BODS returned no fresh timestamped vehicle positions, so Kerbside hid them instead of showing ghost buses.'};
  if(!out.length) throw {soft:true,msg:'The live feed returned no usable vehicle positions for this area.'};
  return out;
}

/* ============================================================
   Simulator"""
bus = sub_once(bus, fetch_pattern, fetch_replacement, 'fetchLive parser integration')
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
package = read(package_path)
package = replace_once(package, '"version": "0.6.34"', '"version": "0.6.35"', 'package version')
write(package_path, package)

worker_path = 'kerbside-backend/src/worker.js'
worker = read(worker_path)
worker = replace_once(worker, "version: '0.6.34'", "version: '0.6.35'", 'Worker health version')
write(worker_path, worker)

worker_test_path = 'kerbside-backend/test/worker.test.js'
worker_test = read(worker_test_path)
worker_test = replace_once(worker_test, "assert.equal(body.version, '0.6.34');", "assert.equal(body.version, '0.6.35');", 'Worker test version')
write(worker_test_path, worker_test)

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.34'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.35'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.match(busSource, /currentTileProvider/);",
    "assert.match(busSource, /currentTileProvider/);\nassert.match(busSource, /function liveVehicleIdentity\\(fields\\)/);\nassert.match(busSource, /function parseLivePayloads\\(items,now\\)/);\nassert.match(busSource, /vehicleRef:f\\.VehicleRef\\|\\|''/);\nassert.doesNotMatch(busSource, /const id = f\\.VehicleRef \\|\\| journey/);",
    'SIRI parser static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.34'", "version: '0.6.35'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.34')", "includes('app 0.6.35')", 'browser settings version')

fixture = r"""  const liveParsing = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,now=Date.now(),iso=value=>new Date(value).toISOString();
    const activity=({operator,vehicle,journey,time,lat,line='009',dest='ST HELENS'})=>`<VehicleActivity>
      ${time===null?'':`<RecordedAtTime>${time}</RecordedAtTime>`}
      <MonitoredVehicleJourney><LineRef>${line}</LineRef><PublishedLineName>${line}</PublishedLineName>
      <OperatorRef>${operator}</OperatorRef><VehicleRef>${vehicle}</VehicleRef><DatedVehicleJourneyRef>${journey}</DatedVehicleJourneyRef>
      <DestinationName>${dest}</DestinationName><VehicleLocation><Longitude>-2.1000</Longitude><Latitude>${lat}</Latitude></VehicleLocation>
      <Bearing>90</Bearing><Velocity>8.5</Velocity></MonitoredVehicleJourney></VehicleActivity>`;
    const wrap=activities=>`<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery>${activities}</VehicleMonitoringDelivery></ServiceDelivery></Siri>`;
    const parsed=api.parseLivePayloads([
      {text:wrap(
        activity({operator:'OP-A',vehicle:'42',journey:'trip-a',time:iso(now-30000),lat:'52.5000'})+
        activity({operator:'OP-X',vehicle:'stale',journey:'old',time:iso(now-300001),lat:'52.4900'})+
        activity({operator:'OP-X',vehicle:'unknown',journey:'unknown',time:null,lat:'52.4900'})
      )},
      {text:wrap(
        activity({operator:'OP-A',vehicle:'42',journey:'trip-a',time:iso(now-5000),lat:'52.5010'})+
        activity({operator:'OP-B',vehicle:'42',journey:'trip-b',time:iso(now-6000),lat:'52.5020'})+
        activity({operator:'OP-X',vehicle:'future',journey:'future',time:iso(now+120001),lat:'52.4900'})
      )},
      {text:'<Siri><broken>'}
    ],now);
    const vehicles=parsed.vehicles.sort((a,b)=>a.id.localeCompare(b.id));
    return {
      ids:vehicles.map(v=>v.id),count:vehicles.length,
      newestLat:vehicles.find(v=>v.operator==='OP-A')?.lat,
      rawRef:vehicles[0]?.vehicleRef,line:vehicles[0]?.line,dest:vehicles[0]?.dest,
      stale:parsed.stale,unknownAge:parsed.unknownAge,malformed:parsed.malformed
    };
  });
  assert.deepEqual(liveParsing, {
    ids:['OP-A|vehicle|42','OP-B|vehicle|42'],count:2,newestLat:52.501,
    rawRef:'42',line:'9',dest:'St Helens',stale:2,unknownAge:1,malformed:1
  });

"""
browser_test = replace_once(browser_test, "  const tripMatching = await page.evaluate(() => {", fixture + "  const tripMatching = await page.evaluate(() => {", 'executed SIRI fixtures')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.35 extracts SIRI-VM parsing into a fixture-tested path. Namespaced XML fixtures cover fresh, stale, future, timestamp-free, malformed and overlapping records. Live identities now combine OperatorRef with VehicleRef (or the journey fallback), preventing operator-local vehicle codes from overwriting one another while still deduplicating overlapping bounding-box responses by newest timestamp.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.35 SIRI parser release')
