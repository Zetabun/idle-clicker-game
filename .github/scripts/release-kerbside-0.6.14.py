from pathlib import Path
import re

EXPECTED_VERSION = "0.6.13"
NEW_VERSION = "0.6.14"


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one exact match, found {count}: {old[:100]!r}")
    write(path, text.replace(old, new, 1))


def regex_replace_once(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex match, found {count}: {pattern[:100]!r}")
    write(path, updated)


bus = "bus.html"
package = "kerbside-backend/package.json"
readme = "kerbside-backend/README.md"
browser_test = "kerbside-backend/tests/browser-regression.mjs"

source = read(bus)
if f"const APP_VERSION = '{EXPECTED_VERSION}';" not in source:
    raise SystemExit(f"Expected Kerbside {EXPECTED_VERSION} before applying release")
if f'"version": "{EXPECTED_VERSION}"' not in read(package):
    raise SystemExit(f"Expected package version {EXPECTED_VERSION} before applying release")

replace_once(bus, f"const APP_VERSION = '{EXPECTED_VERSION}';", f"const APP_VERSION = '{NEW_VERSION}';")
replace_once(
    bus,
    """  workerHistory:{}
};""",
    """  workerHistory:{}, lastWideFetch:0
};""",
)
replace_once(
    bus,
    """const MAX_VEH_DIST = 9000;
const FETCH_TIMEOUT_MS = 12000;""",
    """const MAX_VEH_DIST = 9000;   // preserve the existing nearby route-matching and dim-marker area
const FAR_VEH_DIST = 18000;  // farther vehicles need an exact timetable journey match for this stop
const FAR_FETCH_INTERVAL_MS = 45*1000;
const FETCH_TIMEOUT_MS = 12000;""",
)

regex_replace_once(
    bus,
    r"function bbox\(\)\{.*?\n\}\nfunction feedUrl\(\)\{.*?\n\}",
    r"""function boxAround(c,metres){
  const maxHalf=.17, latPad=Math.min(metres/111320,maxHalf);
  const lonPad=Math.min(metres/(111320*Math.max(.2,Math.cos(rad(c.lat)))),maxHalf);
  const minLon=Math.max(-9,c.lon-lonPad), minLat=Math.max(49,c.lat-latPad);
  const maxLon=Math.min(3,c.lon+lonPad), maxLat=Math.min(61,c.lat+latPad);
  return [minLon.toFixed(5),minLat.toFixed(5),maxLon.toFixed(5),maxLat.toFixed(5)].join(',');
}
function bboxes(wide){
  const c=S.stop||S.origin;
  if(!c) return [];
  if(!wide) return [boxAround(c,S.radius+MAX_VEH_DIST)];
  const maxHalf=.17, latPad=Math.min(FAR_VEH_DIST/111320,maxHalf);
  const wantedLonPad=FAR_VEH_DIST/(111320*Math.max(.2,Math.cos(rad(c.lat))));
  const centres=wantedLonPad<=maxHalf
    ? [c.lon]
    : [c.lon-(wantedLonPad-maxHalf),c.lon+(wantedLonPad-maxHalf)];
  return [...new Set(centres.map(centerLon=>{
    const minLon=Math.max(-9,centerLon-maxHalf), minLat=Math.max(49,c.lat-latPad);
    const maxLon=Math.min(3,centerLon+maxHalf), maxLat=Math.min(61,c.lat+latPad);
    return [minLon.toFixed(5),minLat.toFixed(5),maxLon.toFixed(5),maxLat.toFixed(5)].join(',');
  }))];
}
function feedUrls(wide){
  const boxes=bboxes(wide);
  if(S.proxy){
    return boxes.map(box=>{
      const u = new URL(S.proxy, location.href);
      u.searchParams.set('bbox',box);
      return u.toString();
    });
  }
  if(!S.key) return [];
  return boxes.map(box=>'https://data.bus-data.dft.gov.uk/api/v1/datafeed/?api_key='
       + encodeURIComponent(S.key) + '&boundingBox=' + box);
}""",
)

regex_replace_once(
    bus,
    r"async function fetchLive\(signal\)\{.*?\n\}\n\n/\* ============================================================\n   Simulator",
    r"""async function fetchLiveResponse(url,signal){
  let r;
  try{
    r = await fetchTimed(url,{headers:{'Accept':'application/xml'},cache:'no-store',signal},FETCH_TIMEOUT_MS);
  }catch(e){
    if(e && e.name==='AbortError') throw {soft:true,msg:'The live feed timed out. The Worker or BODS may be busy.'};
    throw {soft:true,msg:'Could not reach the live feed.'};
  }
  if(!r.ok){
    let detail='';
    try{
      const ct=r.headers.get('content-type')||'';
      detail=ct.includes('json') ? (await r.json()).error : (await r.text()).slice(0,180);
    }catch(e){}
    if(r.status===401 || r.status===403) throw {soft:true, msg:detail||'BODS or the Worker rejected the credentials/origin.'};
    throw {soft:true, msg:detail||('Feed returned '+r.status+'.')};
  }
  return {fallback:r.headers.get('X-Kerbside-Stale')==='1',text:await r.text()};
}
async function fetchLive(signal){
  S.feedFallback=false;
  const wide=Date.now()-S.lastWideFetch>=FAR_FETCH_INTERVAL_MS;
  const urls=feedUrls(wide);
  if(!urls.length) throw {soft:true, msg:'No Worker URL or local API key is configured.'};
  const settled=await Promise.allSettled(urls.map(url=>fetchLiveResponse(url,signal)));
  const successful=settled.filter(result=>result.status==='fulfilled').map(result=>result.value);
  if(!successful.length){
    const failure=settled.find(result=>result.status==='rejected');
    throw failure ? failure.reason : {soft:true,msg:'Could not reach the live feed.'};
  }
  if(wide && successful.length===urls.length) S.lastWideFetch=Date.now();
  S.feedFallback=successful.some(item=>item.fallback);
  const now = Date.now(), byId=new Map();
  let stale = 0, unknownAge=0;
  for(const item of successful){
    const xml = new DOMParser().parseFromString(item.text,'application/xml');
    if(xml.querySelector('parsererror')) continue;
    const acts = [...xml.getElementsByTagName('*')].filter(n=>n.localName==='VehicleActivity');
    for(const a of acts){
      const f = flatten(a);
      const lat = parseFloat(f.Latitude), lon = parseFloat(f.Longitude);
      if(!isFinite(lat) || !isFinite(lon)) continue;
      const parsed = f.RecordedAtTime ? Date.parse(f.RecordedAtTime) : NaN;
      const timestampKnown = isFinite(parsed);
      if(!timestampKnown){ unknownAge++; continue; }
      const ts = parsed, age = now-ts;
      if(age>MAX_AGE_MS || age < -120000){ stale++; continue; }
      const journey = f.DatedVehicleJourneyRef || f.VehicleJourneyRef || '';
      const id = f.VehicleRef || journey;
      if(!id) continue;
      const record={
        id, journey,
        line: cleanLine(f.PublishedLineName || f.LineRef || '?'),
        lineRef: f.LineRef || '',
        dest: cleanName(f.DestinationName || f.DirectionName || ''),
        destRef: f.DestinationRef || '',
        origin: cleanName(f.OriginName || ''), originRef:f.OriginRef||'',
        operator: f.OperatorRef || '',
        declaredDir: (f.DirectionRef||'').toLowerCase(),
        lat, lon,
        bearing: parseFloat(f.Bearing),
        feedSpeed: parseFloat(f.Velocity),
        aimedOriginAt: f.OriginAimedDepartureTime ? Date.parse(f.OriginAimedDepartureTime) : NaN,
        aimedDestinationAt: f.DestinationAimedArrivalTime ? Date.parse(f.DestinationAimedArrivalTime) : NaN,
        ts, timestampKnown
      };
      const current=byId.get(id);
      if(!current || record.ts>current.ts) byId.set(id,record);
    }
  }
  const out=[...byId.values()];
  S.feedStale=stale; S.feedUnknownAge=unknownAge;
  if(!out.length && (stale || unknownAge)) throw {soft:true,msg:'BODS returned no fresh timestamped vehicle positions, so Kerbside hid them instead of showing ghost buses.'};
  if(!out.length) throw {soft:true,msg:'The live feed returned no usable vehicle positions for this area.'};
  return out;
}

/* ============================================================
   Simulator""",
)

regex_replace_once(
    bus,
    r"function collect\(gate,diagnostics\)\{.*?\n\}\n\nfunction renderLiveDiagnostics",
    r"""function collect(gate,diagnostics){
  const out=[], now=Date.now();
  for(const v of S.vehicles.values()){
    const age=now-v.ts;
    if(age>MAX_AGE_MS) continue;
    if(diagnostics) diagnostics.recent++;
    const d=dist(v.lat,v.lon,S.stop.lat,S.stop.lon), far=d>MAX_VEH_DIST;
    if(d>(gate?FAR_VEH_DIST:1300)) continue;
    if(diagnostics) diagnostics.nearby++;
    const evidence=routeEvidence(v.line,v.dest,v.journey);
    const geometry=journeyGeometry(v,S.stop);
    if(geometry && geometry.passed) continue;
    // The expanded search area is deliberately stricter: a distant bus is
    // eligible only when its exact live journey is scheduled at this stop.
    if(far && (!gate || !evidence.journeyMatch)) continue;
    const strength=geometry && geometry.remaining>80 ? 2 : approachStrength(v,S.stop);
    if(gate && evidence.score<2) continue;
    if(!gate && !(d<260 || (d<1300 && strength>=1))) continue;
    if(diagnostics) diagnostics.route++;
    const dir=inferDirection(v);
    if(S.destFilter){
      if(destinationSimilarity(v.dest,S.destFilter)<.75) continue;
    }else if(S.dir!=='all' && dir!==S.dir && dir!=='unknown') continue;
    if(diagnostics) diagnostics.direction++;
    if(S.hideAway && strength<0 && d>100) continue;
    if(diagnostics) diagnostics.approaching++;
    const est=estimate(v,S.stop);
    if(!gate && est.confidence==='low') continue;
    if(gate && est.confidence==='low' && d>500) continue;
    if(far && !est.evidence.journeyMatch) continue;
    if(diagnostics) diagnostics.confidence++;
    out.push({v,dir,app:strength>=0,strength,secs:est.secs,metres:est.metres,routeMetres:est.routeMetres,geometry:est.geometry,confidence:est.confidence,spread:est.spread,evidence:est.evidence,schedule:est.schedule});
  }
  out.sort((a,b)=>a.secs-b.secs);
  const limited=out.slice(0,25);
  if(diagnostics) diagnostics.shown=limited.length;
  return limited;
}

function renderLiveDiagnostics""",
)

replace_once(
    bus,
    """    ['received',d.received],['recent',d.recent],['near stop',d.nearby],""",
    """    ['received',d.received],['recent',d.recent],['within range',d.nearby],""",
)
replace_once(
    bus,
    """  for(const [id,m] of S.markers){
    if(!wanted.has(id) && !S.vehicles.has(id)){ vehLayer.removeLayer(m); S.markers.delete(id); }
  }
  for(const v of S.vehicles.values()){
    const shown = wanted.has(v.id);
    const cls = 'veh'+(shown?'':' dim')+(S.selected===v.id?' sel':'');""",
    """  for(const [id,m] of S.markers){
    const v=S.vehicles.get(id);
    const keep=wanted.has(id)||(v&&S.stop&&dist(v.lat,v.lon,S.stop.lat,S.stop.lon)<=MAX_VEH_DIST);
    if(!keep){ vehLayer.removeLayer(m); S.markers.delete(id); }
  }
  for(const v of S.vehicles.values()){
    const shown = wanted.has(v.id);
    const nearby=!S.stop||dist(v.lat,v.lon,S.stop.lat,S.stop.lon)<=MAX_VEH_DIST;
    if(!shown&&!nearby) continue;
    const cls = 'veh'+(shown?'':' dim')+(S.selected===v.id?' sel':'');""",
)
replace_once(
    bus,
    """<p class=\"gps-note\"><b>GPS supported.</b> The map uses operator vehicle-position snapshots from the BODS live feed. Between reports, Kerbside shows a short estimated glide based on recent confirmed movement; stop matching and ETAs continue to use confirmed GPS records. Positions older than two minutes are labelled GPS delayed and retained only until four minutes old so irregular operator updates do not make an approaching bus vanish immediately.</p>""",
    """<p class=\"gps-note\"><b>GPS supported.</b> The map uses operator vehicle-position snapshots from the BODS live feed. Between reports, Kerbside shows a short estimated glide based on recent confirmed movement; stop matching and ETAs continue to use confirmed GPS records. Positions older than two minutes are labelled GPS delayed and retained only until four minutes old so irregular operator updates do not make an approaching bus vanish immediately. Kerbside periodically scans up to 18 km around the selected stop, but buses beyond the normal nearby area appear only when their exact live journey is scheduled to call there.</p>""",
)

replace_once(package, f'"version": "{EXPECTED_VERSION}"', f'"version": "{NEW_VERSION}"')
replace_once(
    readme,
    """Kerbside 0.6.13 makes the public Worker the default so new visitors start with real BODS data and Simulator becomes opt-in. The information panel now shows staged live-matching diagnostics, each live row displays its GPS position age, and WebKit mobile regression checks cover Settings, tabs, public-source defaults and viewport containment. The retired West Midlands-only timetable workflow is removed in favour of the national Pages build.
""",
    """Kerbside 0.6.13 makes the public Worker the default so new visitors start with real BODS data and Simulator becomes opt-in. The information panel now shows staged live-matching diagnostics, each live row displays its GPS position age, and WebKit mobile regression checks cover Settings, tabs, public-source defaults and viewport containment. The retired West Midlands-only timetable workflow is removed in favour of the national Pages build.

Kerbside 0.6.14 periodically expands live GPS coverage to an 18 km area around the selected stop. The wider area is guarded by exact timetable journey matching: distant vehicles are shown only when the live journey is scheduled to call at that stop, while the existing nearby route matching and dim background markers remain limited to the original 9 km area. Wide scans run less often than nearby refreshes to limit extra BODS traffic.
""",
)
replace_once(browser_test, "app 0.6.13", "app 0.6.14")
replace_once(
    browser_test,
    """const root = path.resolve(testsDir, '..', '..');
const mime = new Map([""",
    r"""const root = path.resolve(testsDir, '..', '..');
const busSource = await readFile(path.join(root, 'bus.html'), 'utf8');
assert.match(busSource, /const FAR_VEH_DIST = 18000/);
assert.match(busSource, /function bboxes\(wide\)/);
assert.match(busSource, /far && \(!gate \|\| !evidence\.journeyMatch\)/);
assert.match(busSource, /if\(!shown&&!nearby\) continue/);
const mime = new Map([""",
)

final_bus = read(bus)
required = [
    f"const APP_VERSION = '{NEW_VERSION}';",
    "const FAR_VEH_DIST = 18000;",
    "function bboxes(wide)",
    "const wide=Date.now()-S.lastWideFetch>=FAR_FETCH_INTERVAL_MS;",
    "if(far && (!gate || !evidence.journeyMatch)) continue;",
    "if(!shown&&!nearby) continue;",
]
for needle in required:
    if needle not in final_bus:
        raise SystemExit(f"Missing expected release output: {needle}")
if EXPECTED_VERSION in final_bus or f'"version": "{EXPECTED_VERSION}"' in read(package):
    raise SystemExit("Old Kerbside version remains after release patch")

print(f"Prepared Kerbside {NEW_VERSION} far-stop GPS tracking release")
