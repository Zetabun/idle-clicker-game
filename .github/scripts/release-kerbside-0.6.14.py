from pathlib import Path
import json
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_regex_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match, found {count}")
    return updated


bus_path = Path("bus.html")
bus = bus_path.read_text(encoding="utf-8")

bus = replace_once(bus, "const APP_VERSION = '0.6.13';", "const APP_VERSION = '0.6.14';", "app version")

bus = replace_once(
    bus,
    "const VISUAL_MAX_LEAD_METRES = 180;",
    "const VISUAL_MAX_LEAD_METRES = 180;\nconst FAR_SCAN_INTERVAL_MS = 60*1000;\nconst FAR_SCAN_LOOKAHEAD_MS = 2*60*60*1000;\nconst FAR_SCAN_OFFSETS = [16000,32000,48000];\nconst FAR_SCAN_BOX_RADIUS = 8000;\nconst FAR_SCAN_MAX_BOXES = 3;\nconst FAR_ROUTE_MAX_METRES = 55000;",
    "route corridor constants",
)

bus = replace_once(
    bus,
    "  feedStale:0, feedUnknownAge:0, workerOk:null, workerVersion:'', workerBods:false, liveDiag:null,",
    "  feedStale:0, feedUnknownAge:0, workerOk:null, workerVersion:'', workerBods:false, liveDiag:null,\n  farBusy:false, lastFarScan:0, farScanBoxes:0, farScanVehicles:0, farScanError:'',",
    "route corridor state",
)

bus = replace_once(
    bus,
    ".chip.gps-age{text-transform:none;letter-spacing:0;color:var(--text-dim)}",
    ".chip.gps-age{text-transform:none;letter-spacing:0;color:var(--text-dim)}\n.chip.route-scan{border-color:rgba(92,143,189,.45);background:rgba(92,143,189,.08);color:#9AB8D4}",
    "route corridor badge styling",
)

bus = replace_once(
    bus,
    "          <div class=\"confidence-guide\"><b>LIVE GPS</b> means a real bus has reported a position within the last two minutes. <b>GPS DELAYED</b> means the last confirmed report is two to four minutes old; Kerbside keeps it briefly instead of making the bus flicker out, but marks its ETA as estimated. Later timetable departures remain <b>scheduled</b> until a matching vehicle begins service. <b>Likely</b> means route and direction evidence strongly suggest the live bus will serve the stop, while <b>Verified</b> has stronger journey/stop evidence and <b>rough</b> has limited evidence.</div>",
    "          <div class=\"confidence-guide\"><b>LIVE GPS</b> means a real bus has reported a position within the last two minutes. <b>GPS DELAYED</b> means the last confirmed report is two to four minutes old; Kerbside keeps it briefly instead of making the bus flicker out, but marks its ETA as estimated. Later timetable departures remain <b>scheduled</b> until a matching vehicle begins service. <b>Likely</b> means route and direction evidence strongly suggest the live bus will serve the stop, while <b>Verified</b> has stronger journey/stop evidence and <b>rough</b> has limited evidence. <b>Route scan</b> means the bus was found farther upstream by following an ordered timetable journey pattern.</div>",
    "route corridor explanation",
)

bus = replace_once(
    bus,
    "  if(changed){ S.destFilter=null; S.selected=null; S.manualStop=manual===true; } else if(manual===true) S.manualStop=true;",
    "  if(changed){ S.destFilter=null; S.selected=null; S.manualStop=manual===true; S.lastFarScan=0; S.farScanBoxes=0; S.farScanVehicles=0; S.farScanError=''; } else if(manual===true) S.manualStop=true;",
    "route corridor reset on stop change",
)

old_projection = """function journeyGeometry(v,stop){
  if(!v || !stop) return null;
  const points=timetablePattern(v.journey);
  if(!points) return null;
  const vehicle=projectToPattern(points,v.lat,v.lon);
  const target=projectToPattern(points,stop.lat,stop.lon);
  if(!vehicle || !target || vehicle.metres>650 || target.metres>250) return null;
  const remaining=target.along-vehicle.along;
  return {
    remaining,
    passed:remaining < -120,
    vehicleOffset:vehicle.metres,
    stopOffset:target.metres,
    total:vehicle.total
  };
}
"""
new_projection = """function pointAlongPattern(points,along){
  if(!Array.isArray(points)||!points.length) return null;
  const wanted=Math.max(0,Number(along)||0);
  let travelled=0;
  for(let i=0;i<points.length-1;i++){
    const a=points[i], b=points[i+1], seg=dist(a.lat,a.lon,b.lat,b.lon);
    if(!isFinite(seg)||seg<1) continue;
    if(wanted<=travelled+seg){
      const f=Math.max(0,Math.min(1,(wanted-travelled)/seg));
      return {lat:a.lat+(b.lat-a.lat)*f,lon:a.lon+(b.lon-a.lon)*f};
    }
    travelled+=seg;
  }
  return points[points.length-1];
}
function patternForVehicle(v){
  if(!v) return null;
  const direct=timetablePattern(v.patternTrip||v.journey);
  if(direct) return direct;
  if(!v.journey) return null;
  const row=timetableRows(new Date()).find(r=>String(r.line)===String(v.line)&&tripRefMatches(r.trip,v.journey));
  return row?timetablePattern(row.trip):null;
}
function journeyGeometry(v,stop){
  if(!v || !stop) return null;
  const points=patternForVehicle(v);
  if(!points) return null;
  const vehicle=projectToPattern(points,v.lat,v.lon);
  const target=projectToPattern(points,stop.lat,stop.lon);
  if(!vehicle || !target || vehicle.metres>800 || target.metres>250) return null;
  const remaining=target.along-vehicle.along;
  let patternDir='unknown';
  if(S.anchor){
    const before=pointAlongPattern(points,Math.max(0,target.along-1200));
    const after=pointAlongPattern(points,Math.min(target.total,target.along+1200));
    if(before&&after){
      const d0=dist(before.lat,before.lon,S.anchor.lat,S.anchor.lon), d1=dist(after.lat,after.lon,S.anchor.lat,S.anchor.lon);
      if(Math.abs(d0-d1)>100) patternDir=d1<d0?'in':'out';
    }
  }
  return {
    remaining,
    passed:remaining < -120,
    vehicleOffset:vehicle.metres,
    stopOffset:target.metres,
    total:vehicle.total,
    patternDir
  };
}
"""
bus = replace_once(bus, old_projection, new_projection, "journey pattern helpers")

old_feed = r'''function bbox(){
  const c=S.origin, wanted=(S.radius+9000)/111320, maxHalf=.17;
  const latPad=Math.min(wanted,maxHalf), lonPad=Math.min(wanted/Math.max(.2,Math.cos(rad(c.lat))),maxHalf);
  const minLon=Math.max(-9,c.lon-lonPad), minLat=Math.max(49,c.lat-latPad);
  const maxLon=Math.min(3,c.lon+lonPad), maxLat=Math.min(61,c.lat+latPad);
  return [minLon.toFixed(5),minLat.toFixed(5),maxLon.toFixed(5),maxLat.toFixed(5)].join(',');
}
function feedUrl(){
  if(S.proxy){
    const u = new URL(S.proxy, location.href);
    u.searchParams.set('bbox',bbox());
    return u.toString();
  }
  if(!S.key) return '';
  return 'https://data.bus-data.dft.gov.uk/api/v1/datafeed/?api_key='
       + encodeURIComponent(S.key) + '&boundingBox=' + bbox();
}

/* flatten a <VehicleActivity> subtree into {localName: text} */
function flatten(node, out){
  out = out || {};
  for(let c=node.firstElementChild; c; c=c.nextElementSibling){
    if(c.firstElementChild) flatten(c,out);
    else if(!(c.localName in out)) out[c.localName]=c.textContent.trim();
  }
  return out;
}

async function fetchLive(signal){
  S.feedFallback=false;
  const url=feedUrl();
  if(!url) throw {soft:true, msg:'No Worker URL or local API key is configured.'};
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
  S.feedFallback=r.headers.get('X-Kerbside-Stale')==='1';
  const xml = new DOMParser().parseFromString(await r.text(),'application/xml');
  if(xml.querySelector('parsererror')) throw {soft:true, msg:'Feed response was not valid XML.'};

  const acts = [...xml.getElementsByTagName('*')].filter(n=>n.localName==='VehicleActivity');
  const now = Date.now();
  const out = [];
  let stale = 0, unknownAge=0;
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
    if(!id) continue; // a stable identity is required for movement, learning and alarms
    out.push({
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
    });
  }
  S.feedStale=stale; S.feedUnknownAge=unknownAge;
  if(!out.length && (stale || unknownAge)) throw {soft:true,msg:'BODS returned no fresh timestamped vehicle positions, so Kerbside hid them instead of showing ghost buses.'};
  return out;
}
'''
new_feed = r'''function bboxAround(lat,lon,metres){
  const wanted=Math.max(1000,Number(metres)||0), maxHalf=.17;
  const latPad=Math.min(wanted/111320,maxHalf), lonPad=Math.min(wanted/(111320*Math.max(.2,Math.cos(rad(lat)))),maxHalf);
  const minLon=Math.max(-9,lon-lonPad), minLat=Math.max(49,lat-latPad);
  const maxLon=Math.min(3,lon+lonPad), maxLat=Math.min(61,lat+latPad);
  return [minLon.toFixed(5),minLat.toFixed(5),maxLon.toFixed(5),maxLat.toFixed(5)].join(',');
}
function bbox(){ return bboxAround(S.origin.lat,S.origin.lon,S.radius+9000); }
function feedUrl(box){
  const targetBox=box||bbox();
  if(S.proxy){
    const u = new URL(S.proxy, location.href);
    u.searchParams.set('bbox',targetBox);
    return u.toString();
  }
  if(!S.key) return '';
  return 'https://data.bus-data.dft.gov.uk/api/v1/datafeed/?api_key='
       + encodeURIComponent(S.key) + '&boundingBox=' + targetBox;
}
function farRouteFeedBoxes(){
  if(!S.stop||!S.ttStop||!S.timetable) return [];
  const now=Date.now(), rows=timetableRows(new Date(now))
    .filter(r=>r.trip&&r.at>=now-2*60000&&r.at<=now+FAR_SCAN_LOOKAHEAD_MS)
    .sort((a,b)=>a.at-b.at).slice(0,30);
  const candidates=[], seenPatterns=new Set();
  for(const row of rows){
    const patternId=S.timetable.tripPatterns&&S.timetable.tripPatterns[String(row.trip)]||String(row.trip);
    if(seenPatterns.has(patternId)) continue;
    seenPatterns.add(patternId);
    const points=timetablePattern(row.trip);
    if(!points) continue;
    const target=projectToPattern(points,S.stop.lat,S.stop.lon);
    if(!target||target.metres>250) continue;
    for(const offset of FAR_SCAN_OFFSETS){
      if(target.along<offset+1500) continue;
      const centre=pointAlongPattern(points,target.along-offset);
      if(!centre||dist(centre.lat,centre.lon,S.origin.lat,S.origin.lon)<9000) continue;
      candidates.push({lat:centre.lat,lon:centre.lon,bbox:bboxAround(centre.lat,centre.lon,FAR_SCAN_BOX_RADIUS),due:row.at,offset,matches:[{trip:row.trip,line:row.line,head:row.head||'',points,target}]});
    }
  }
  candidates.sort((a,b)=>a.due-b.due||a.offset-b.offset);
  const selected=[];
  for(const candidate of candidates){
    const existing=selected.find(item=>dist(item.lat,item.lon,candidate.lat,candidate.lon)<9000);
    if(existing){ existing.matches.push(...candidate.matches); continue; }
    selected.push(candidate);
    if(selected.length>=FAR_SCAN_MAX_BOXES) break;
  }
  return selected;
}
function farVehicleMatches(feed,v){
  for(const match of feed.matches){
    if(String(v.line)!==String(match.line)) continue;
    if(v.dest&&match.head&&destinationSimilarity(v.dest,match.head)<.34) continue;
    const position=projectToPattern(match.points,v.lat,v.lon);
    if(!position||position.metres>800) continue;
    const remaining=match.target.along-position.along;
    if(remaining < -120 || remaining > FAR_ROUTE_MAX_METRES) continue;
    v.patternTrip=match.trip;
    v.farTracked=true;
    v.farRemaining=remaining;
    return true;
  }
  return false;
}

/* flatten a <VehicleActivity> subtree into {localName: text} */
function flatten(node, out){
  out = out || {};
  for(let c=node.firstElementChild; c; c=c.nextElementSibling){
    if(c.firstElementChild) flatten(c,out);
    else if(!(c.localName in out)) out[c.localName]=c.textContent.trim();
  }
  return out;
}

async function fetchLiveBox(box,signal,primary){
  if(primary) S.feedFallback=false;
  const url=feedUrl(box);
  if(!url) throw {soft:true, msg:'No Worker URL or local API key is configured.'};
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
  if(primary) S.feedFallback=r.headers.get('X-Kerbside-Stale')==='1';
  const xml = new DOMParser().parseFromString(await r.text(),'application/xml');
  if(xml.querySelector('parsererror')) throw {soft:true, msg:'Feed response was not valid XML.'};

  const acts = [...xml.getElementsByTagName('*')].filter(n=>n.localName==='VehicleActivity');
  const now = Date.now(), out = [];
  let stale = 0, unknownAge=0;
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
    out.push({
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
      ts, timestampKnown,
      farTracked:false
    });
  }
  if(primary){ S.feedStale=stale; S.feedUnknownAge=unknownAge; }
  if(primary&&!out.length&&(stale||unknownAge)) throw {soft:true,msg:'BODS returned no fresh timestamped vehicle positions, so Kerbside hid them instead of showing ghost buses.'};
  return out;
}
async function fetchLive(signal){ return fetchLiveBox(bbox(),signal,true); }
async function pollFarRoutes(){
  if(S.demo||!S.origin||!S.stop||S.farBusy||Date.now()-S.lastFarScan<FAR_SCAN_INTERVAL_MS) return;
  const feeds=farRouteFeedBoxes();
  S.farScanBoxes=feeds.length;
  if(!feeds.length){ renderLiveDiagnostics(); return; }
  S.farBusy=true; S.lastFarScan=Date.now(); S.farScanError=''; renderLiveDiagnostics();
  try{
    const settled=await Promise.allSettled(feeds.map(async feed=>{
      const rows=await fetchLiveBox(feed.bbox,undefined,false);
      return rows.filter(v=>farVehicleMatches(feed,v));
    }));
    const merged=new Map();
    for(const result of settled){
      if(result.status!=='fulfilled') continue;
      for(const v of result.value){ const old=merged.get(v.id); if(!old||v.ts>old.ts) merged.set(v.id,v); }
    }
    const list=[...merged.values()];
    S.farScanVehicles=list.length;
    if(settled.every(result=>result.status==='rejected')) S.farScanError='Route scan temporarily unavailable';
    if(list.length){ ingest(list); learnDests(); learnServing(); renderDests(); render(); }
  }catch(e){
    S.farScanError='Route scan temporarily unavailable';
  }finally{
    S.farBusy=false; renderLiveDiagnostics();
  }
}
'''
bus = replace_once(bus, old_feed, new_feed, "route corridor live feed")

bus = replace_once(
    bus,
    "    Object.assign(rec, v);",
    "    if(prev&&prev.journey&&v.journey&&prev.journey!==v.journey) rec.patternTrip='';\n    Object.assign(rec, v);",
    "clear old route pattern on journey change",
)

old_collect = """    const d=dist(v.lat,v.lon,S.stop.lat,S.stop.lon);
    if(d>(gate?MAX_VEH_DIST:1300)) continue;
    if(diagnostics) diagnostics.nearby++;
    const evidence=routeEvidence(v.line,v.dest,v.journey);
    const geometry=journeyGeometry(v,S.stop);
    if(geometry && geometry.passed) continue;
    const strength=geometry && geometry.remaining>80 ? 2 : approachStrength(v,S.stop);
"""
new_collect = """    const d=dist(v.lat,v.lon,S.stop.lat,S.stop.lon);
    const journeyRef=v.patternTrip||v.journey;
    const evidence=routeEvidence(v.line,v.dest,journeyRef);
    const geometry=journeyGeometry(v,S.stop);
    if(geometry && geometry.passed) continue;
    const corridor=!!(geometry&&geometry.remaining>80&&geometry.remaining<=FAR_ROUTE_MAX_METRES&&evidence.score>=4);
    if(d>(corridor?FAR_ROUTE_MAX_METRES:(gate?MAX_VEH_DIST:1300))) continue;
    if(diagnostics) diagnostics.nearby++;
    const strength=geometry && geometry.remaining>80 ? 2 : approachStrength(v,S.stop);
"""
bus = replace_once(bus, old_collect, new_collect, "far vehicle matching range")

bus = replace_once(
    bus,
    "    const dir=inferDirection(v);",
    "    const dir=geometry&&geometry.patternDir&&geometry.patternDir!=='unknown'?geometry.patternDir:inferDirection(v);",
    "journey pattern direction",
)

bus = replace_once(
    bus,
    "    ['received',d.received],['recent',d.recent],['near stop',d.nearby],",
    "    ['received',d.received],['recent',d.recent],['scan range',d.nearby],",
    "diagnostics range label",
)

bus = replace_once(
    bus,
    "    +(d.gate?'Official timetable stop rules are active.':'Nearby fallback rules are active.')+'</div>';",
    "    +(d.gate?'Official timetable stop rules are active.':'Nearby fallback rules are active.')\n    +(S.farBusy?' Route-corridor GPS scan is running.':S.farScanBoxes?' Route scan checked '+S.farScanBoxes+' upstream area'+(S.farScanBoxes===1?'':'s')+' and retained '+S.farScanVehicles+' matching bus'+(S.farScanVehicles===1?'':'es')+'.':' Ordered route patterns are still loading for the upstream scan.')\n    +(S.farScanError?' '+S.farScanError+'.':'')+'</div>';",
    "route corridor diagnostics",
)

bus = replace_once(
    bus,
    "        +'<span class=\"chip gps-age\">'+esc(gpsAge)+'</span>'",
    "        +'<span class=\"chip gps-age\">'+esc(gpsAge)+'</span>'\n        +(r.v.farTracked?'<span class=\"chip route-scan\">route scan</span>':'')",
    "route corridor row badge",
)

bus = replace_once(
    bus,
    "  const evidence=routeEvidence(v.line,v.dest,v.journey);",
    "  const journeyRef=v.patternTrip||v.journey;\n  const evidence=routeEvidence(v.line,v.dest,journeyRef);",
    "estimate route evidence",
)

bus = replace_once(
    bus,
    "  const schedules=scheduledMatches(v.line,v.dest,spatial,v.journey);",
    "  const schedules=scheduledMatches(v.line,v.dest,spatial,journeyRef);",
    "estimate scheduled match",
)

bus = replace_once(
    bus,
    "    renderGpsStats();\n    render();",
    "    renderGpsStats();\n    render();\n    if(!S.demo) void pollFarRoutes();",
    "route corridor poll hook",
)

bus_path.write_text(bus, encoding="utf-8")

package_path = Path("kerbside-backend/package.json")
package = json.loads(package_path.read_text(encoding="utf-8"))
package["version"] = "0.6.14"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

test_path = Path("kerbside-backend/tests/browser-regression.mjs")
test = test_path.read_text(encoding="utf-8")
test = replace_once(test, "app 0.6.13", "app 0.6.14", "browser test app version")
test = replace_once(
    test,
    "  assert.match(await page.locator('#liveDiagnostics').textContent(), /Choose a location|Waiting for the first live matching pass/);",
    "  assert.match(await page.locator('#liveDiagnostics').textContent(), /Choose a location|Waiting for the first live matching pass/);\n\n  const routeScan = await page.evaluate(() => {\n    const values=bboxAround(52.48,-1.90,FAR_SCAN_BOX_RADIUS).split(',').map(Number);\n    return {values,interval:FAR_SCAN_INTERVAL_MS,maxBoxes:FAR_SCAN_MAX_BOXES,maxDistance:FAR_ROUTE_MAX_METRES};\n  });\n  assert.equal(routeScan.interval, 60000);\n  assert.equal(routeScan.maxBoxes, 3);\n  assert.equal(routeScan.maxDistance, 55000);\n  assert.ok(routeScan.values[2]-routeScan.values[0] <= 0.35001);\n  assert.ok(routeScan.values[3]-routeScan.values[1] <= 0.35001);",
    "browser route corridor checks",
)
test_path.write_text(test, encoding="utf-8")

readme_path = Path("kerbside-backend/README.md")
readme = readme_path.read_text(encoding="utf-8")
anchor = "Kerbside 0.6.13 makes the public Worker the default so new visitors start with real BODS data and Simulator becomes opt-in. The information panel now shows staged live-matching diagnostics, each live row displays its GPS position age, and WebKit mobile regression checks cover Settings, tabs, public-source defaults and viewport containment. The retired West Midlands-only timetable workflow is removed in favour of the national Pages build."
addition = anchor + "\n\nKerbside 0.6.14 adds timetable-guided route-corridor GPS scanning. For official stops, the browser uses ordered journey patterns to check up to three upstream BODS areas once per minute, retaining only vehicles that match the route corridor and have not passed the selected stop. This extends exact live tracking to roughly 55 km of remaining route while the normal nearby feed continues refreshing at the user's chosen interval."
readme = replace_once(readme, anchor, addition, "README release note")
readme_path.write_text(readme, encoding="utf-8")
