from pathlib import Path
import re

EXPECTED_VERSION = "0.6.14"
NEW_VERSION = "0.6.15"


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one exact match, found {count}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


def regex_replace_once(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex match, found {count}: {pattern[:120]!r}")
    write(path, updated)


bus = "bus.html"
package = "kerbside-backend/package.json"
readme = "kerbside-backend/README.md"
builder = "kerbside-backend/scripts/build-region.js"
builder_test = "kerbside-backend/test/build-region.test.js"
browser_test = "kerbside-backend/tests/browser-regression.mjs"

if f"const APP_VERSION = '{EXPECTED_VERSION}';" not in read(bus):
    raise SystemExit(f"Expected Kerbside {EXPECTED_VERSION} before applying release")
if f'"version": "{EXPECTED_VERSION}"' not in read(package):
    raise SystemExit(f"Expected package version {EXPECTED_VERSION} before applying release")

replace_once(bus, f"const APP_VERSION = '{EXPECTED_VERSION}';", f"const APP_VERSION = '{NEW_VERSION}';")
replace_once(package, f'"version": "{EXPECTED_VERSION}"', f'"version": "{NEW_VERSION}"')

replace_once(
    bus,
    ".depwrap .detail{border-top:1px solid rgba(34,48,63,.55);border-bottom:0}\n",
    ".depwrap .detail{border-top:1px solid rgba(34,48,63,.55);border-bottom:0}\n"
    ".journey-progress{margin-bottom:12px;padding:12px;border:1px solid var(--rule);border-radius:9px;background:rgba(11,17,25,.55)}\n"
    ".journey-progress-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:9px}\n"
    ".journey-progress-title{font-size:12px;font-weight:700;color:var(--text)}\n"
    ".journey-progress-sub{margin-top:2px;font-size:10px;color:var(--text-dim);line-height:1.4}\n"
    ".journey-progress-pct{font-family:'Martian Mono',monospace;color:var(--led);font-size:16px;font-weight:700;letter-spacing:-.05em}\n"
    ".journey-progress-track{height:6px;border-radius:999px;background:var(--rule);overflow:hidden}\n"
    ".journey-progress-fill{height:100%;background:linear-gradient(90deg,var(--live),var(--led));border-radius:inherit}\n"
    ".journey-progress-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}\n"
    ".journey-progress-stats span{padding:7px 8px;border:1px solid rgba(34,48,63,.75);border-radius:6px;min-width:0}\n"
    ".journey-progress-stats b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n"
    ".journey-progress-stats small{display:block;margin-top:2px;font-size:8.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-dim)}\n"
    ".route-map-btn{width:100%;margin-top:9px;padding:8px 10px;border:1px solid var(--led-dim);border-radius:7px;color:var(--led);font-size:11.5px;font-weight:700}\n"
    ".route-map-btn:hover{background:rgba(255,176,0,.07)}\n"
    ".route-map-btn:disabled{border-color:var(--rule);color:var(--text-dim);opacity:.7}\n"
    ".journey-stops{margin-top:10px;max-height:210px;overflow:auto;border-top:1px solid var(--rule);padding-top:6px;scrollbar-width:thin}\n"
    ".journey-stop{position:relative;display:grid;grid-template-columns:16px minmax(0,1fr);gap:7px;padding:5px 2px;font-size:10.5px;color:var(--text-dim)}\n"
    ".journey-stop::before{content:'';position:absolute;left:7px;top:0;bottom:0;width:1px;background:var(--rule)}\n"
    ".journey-stop:first-child::before{top:50%}.journey-stop:last-child::before{bottom:50%}\n"
    ".journey-stop-dot{position:relative;z-index:1;align-self:center;width:7px;height:7px;margin-left:4px;border-radius:50%;background:var(--ink-2);border:1px solid var(--text-dim)}\n"
    ".journey-stop.passed{opacity:.55}.journey-stop.passed .journey-stop-dot{background:#526276;border-color:#526276}\n"
    ".journey-stop.next{color:var(--live);font-weight:700}.journey-stop.next .journey-stop-dot{background:var(--live);border-color:var(--live);box-shadow:0 0 8px rgba(63,217,164,.5)}\n"
    ".journey-stop.selected{color:var(--led)}.journey-stop.selected .journey-stop-dot{background:var(--led);border-color:var(--led);box-shadow:0 0 8px rgba(255,176,0,.45)}\n"
    ".journey-stop em{display:block;margin-top:1px;font-size:8.5px;font-style:normal;text-transform:uppercase;letter-spacing:.07em;color:inherit;opacity:.78}\n"
    ".journey-progress-unavailable{font-size:10.5px;color:var(--text-dim);line-height:1.5}\n"
)

replace_once(
    bus,
    "let meMarker=null, anchorMarker=null, stopLayer=L.layerGroup().addTo(map), vehLayer=L.layerGroup().addTo(map);",
    "let meMarker=null, anchorMarker=null, routeLayer=L.layerGroup().addTo(map), stopLayer=L.layerGroup().addTo(map), vehLayer=L.layerGroup().addTo(map);",
)
replace_once(
    bus,
    "  S.stop=null; S.ttStop=null; S.manualStop=false; S.destFilter=null; S.stops=[]; S.vehicles.clear(); clearVehicleMarkers();",
    "  S.stop=null; S.ttStop=null; S.manualStop=false; S.destFilter=null; S.stops=[]; S.vehicles.clear(); clearVehicleMarkers(); routeLayer.clearLayers();",
)

pattern_block = r"function timetablePattern\(journey\)\{.*?\n\}\nfunction scheduledMatches"
pattern_replacement = r"""function timetablePatternRecord(journey){
  const tt=S.timetable;
  if(!tt||!journey||!tt.tripPatterns) return null;
  const id=tt.tripPatterns[String(journey)]; if(!id) return null;
  if(PATTERN_CACHE.has(id)) return PATTERN_CACHE.get(id);
  const raw=tt.patterns&&tt.patterns[id];
  if(!raw){ if(S.timetableSource==='national') queuePattern(id); PATTERN_CACHE.set(id,null); return null; }
  const pointRows=Array.isArray(raw)?raw:raw&&raw.p;
  const stopRows=Array.isArray(raw&&raw.s)?raw.s:[];
  if(!Array.isArray(pointRows)||pointRows.length<2){ if(S.timetableSource==='national') queuePattern(id); PATTERN_CACHE.set(id,null); return null; }
  const points=pointRows.map(p=>({lat:Number(p&&p[0]),lon:Number(p&&p[1])})).filter(p=>isFinite(p.lat)&&isFinite(p.lon));
  const stops=stopRows.map(s=>({
    id:String(s&&s[0]||''), name:cleanName(s&&s[1]||'Unnamed stop'),
    lat:Number(s&&s[2]), lon:Number(s&&s[3])
  })).filter(s=>s.id&&isFinite(s.lat)&&isFinite(s.lon));
  const value=points.length>=2?{id,points,stops,shape:!Array.isArray(raw)&&raw.g===1,stopProgress:null}:null;
  PATTERN_CACHE.set(id,value); return value;
}
function timetablePattern(journey){
  const pattern=timetablePatternRecord(journey);
  return pattern&&pattern.points;
}
function patternMetrics(points){
  if(points._kerbsideMetrics) return points._kerbsideMetrics;
  const lengths=[], starts=[]; let total=0;
  for(let i=0;i<points.length-1;i++){
    starts.push(total);
    const seg=dist(points[i].lat,points[i].lon,points[i+1].lat,points[i+1].lon);
    lengths.push(isFinite(seg)?seg:0); total+=isFinite(seg)?seg:0;
  }
  const value={lengths,starts,total};
  try{ Object.defineProperty(points,'_kerbsideMetrics',{value,enumerable:false}); }catch(e){ points._kerbsideMetrics=value; }
  return value;
}
function projectToPattern(points,lat,lon,minSegment){
  const metrics=patternMetrics(points); let best=null;
  const start=Math.max(0,Math.min(points.length-2,Number(minSegment)||0));
  for(let i=start;i<points.length-1;i++){
    const a=points[i], b=points[i+1], seg=metrics.lengths[i];
    if(!isFinite(seg) || seg<1) continue;
    const scaleX=111320*Math.cos(rad((a.lat+b.lat+lat)/3));
    const dx=(b.lon-a.lon)*scaleX, dy=(b.lat-a.lat)*111320;
    const px=(lon-a.lon)*scaleX, py=(lat-a.lat)*111320;
    const denom=dx*dx+dy*dy;
    const t=denom?Math.max(0,Math.min(1,(px*dx+py*dy)/denom)):0;
    const metres=Math.hypot(px-dx*t,py-dy*t);
    if(!best || metres<best.metres) best={metres,along:metrics.starts[i]+seg*t,segment:i,t};
  }
  return best ? {...best,total:metrics.total} : null;
}
function journeyGeometry(v,stop){
  if(!v || !stop) return null;
  const pattern=timetablePatternRecord(v.journey);
  if(!pattern) return null;
  const vehicle=projectToPattern(pattern.points,v.lat,v.lon);
  const target=projectToPattern(pattern.points,stop.lat,stop.lon);
  if(!vehicle || !target || vehicle.metres>650 || target.metres>250) return null;
  const remaining=target.along-vehicle.along;
  return {
    remaining,
    passed:remaining < -120,
    vehicleOffset:vehicle.metres,
    stopOffset:target.metres,
    total:vehicle.total,
    pattern
  };
}
function orderedPatternStops(pattern){
  if(!pattern||!pattern.stops||pattern.stops.length<2) return [];
  if(pattern.stopProgress) return pattern.stopProgress;
  let minSegment=0, lastAlong=0;
  const projected=[];
  for(const stop of pattern.stops){
    const point=projectToPattern(pattern.points,stop.lat,stop.lon,Math.max(0,minSegment-1));
    if(!point||point.metres>900){ pattern.stopProgress=[]; return pattern.stopProgress; }
    const along=Math.max(lastAlong,point.along);
    projected.push({...stop,along,segment:point.segment});
    lastAlong=along; minSegment=Math.max(minSegment,point.segment);
  }
  pattern.stopProgress=projected;
  return projected;
}
function selectedPatternStopIndex(stops){
  if(!stops.length||!S.stop) return -1;
  const ids=[S.ttStop&&S.ttStop.id,S.stop.timetableId,S.stop.atco,S.stop.code,S.stop.id].map(v=>String(v||'')).filter(Boolean);
  let index=stops.findIndex(stop=>ids.includes(String(stop.id)));
  if(index>=0) return index;
  let best=-1,bestDistance=Infinity;
  stops.forEach((stop,i)=>{ const metres=dist(stop.lat,stop.lon,S.stop.lat,S.stop.lon); if(metres<bestDistance){bestDistance=metres;best=i;} });
  return bestDistance<=180?best:-1;
}
function journeyProgress(v){
  const pattern=timetablePatternRecord(v&&v.journey);
  if(!pattern) return null;
  const vehicle=projectToPattern(pattern.points,v.lat,v.lon);
  if(!vehicle||vehicle.metres>800) return null;
  const stops=orderedPatternStops(pattern);
  if(stops.length<2) return {pattern,vehicle,stops:[],nextIndex:-1,selectedIndex:-1,remainingStops:0,percent:Math.max(0,Math.min(100,vehicle.along/Math.max(1,vehicle.total)*100))};
  let nextIndex=stops.findIndex(stop=>stop.along>=vehicle.along-25);
  if(nextIndex<0) nextIndex=stops.length;
  const selectedIndex=selectedPatternStopIndex(stops);
  return {
    pattern,vehicle,stops,nextIndex,selectedIndex,
    remainingStops:Math.max(0,stops.length-nextIndex),
    percent:Math.max(0,Math.min(100,vehicle.along/Math.max(1,vehicle.total)*100))
  };
}
function pointAtProjection(points,projection){
  const a=points[projection.segment],b=points[projection.segment+1];
  return {lat:a.lat+(b.lat-a.lat)*projection.t,lon:a.lon+(b.lon-a.lon)*projection.t};
}
function splitPatternAt(pattern,projection){
  const here=pointAtProjection(pattern.points,projection);
  return {
    passed:[...pattern.points.slice(0,projection.segment+1),here],
    remaining:[here,...pattern.points.slice(projection.segment+1)]
  };
}
function scheduledMatches"""
regex_replace_once(bus, pattern_block, pattern_replacement)

line_detail_pattern = r"function lineDetail\(r\)\{.*?\n\}\nfunction compass"
line_detail_replacement = r"""function journeyProgressHtml(v){
  const progress=journeyProgress(v);
  if(!progress){
    return '<div class="journey-progress journey-progress-unavailable"><b>Journey progress unavailable.</b> Kerbside only shows route progress after this live vehicle is matched to an exact ordered timetable journey.</div>';
  }
  const next=progress.nextIndex>=0&&progress.nextIndex<progress.stops.length?progress.stops[progress.nextIndex]:null;
  const selected=progress.selectedIndex>=0?progress.stops[progress.selectedIndex]:null;
  const shapeNote=progress.pattern.shape?'Official GTFS route shape':'Ordered stops available · road shape awaiting timetable rebuild';
  const stopList=progress.stops.length?'<div class="journey-stops">'+progress.stops.map((stop,index)=>{
    const states=[];
    if(index<progress.nextIndex) states.push('passed');
    if(index===progress.nextIndex) states.push('next');
    if(index===progress.selectedIndex) states.push('selected');
    const labels=[];
    if(index===progress.nextIndex) labels.push('next stop');
    if(index===progress.selectedIndex) labels.push(index<progress.nextIndex?'your stop · passed':'your stop');
    return '<div class="journey-stop '+states.join(' ')+'"><span class="journey-stop-dot"></span><span>'+esc(stop.name)+(labels.length?'<em>'+esc(labels.join(' · '))+'</em>':'')+'</span></div>';
  }).join('')+'</div>':'';
  return '<div class="journey-progress">'
    +'<div class="journey-progress-head"><div><div class="journey-progress-title">Live journey progress</div><div class="journey-progress-sub">'+esc(shapeNote)+'</div></div><div class="journey-progress-pct">'+Math.round(progress.percent)+'%</div></div>'
    +'<div class="journey-progress-track"><div class="journey-progress-fill" style="width:'+progress.percent.toFixed(1)+'%"></div></div>'
    +'<div class="journey-progress-stats">'
    +'<span><b>'+esc(next?next.name:'Route complete')+'</b><small>Next stop</small></span>'
    +'<span><b>'+progress.remainingStops+'</b><small>Stops remaining</small></span>'
    +'<span><b>'+esc(selected?(progress.selectedIndex<progress.nextIndex?'Passed':Math.max(0,progress.selectedIndex-progress.nextIndex)+' ahead'):'Not identified')+'</b><small>Your stop</small></span>'
    +'</div>'
    +'<button class="route-map-btn" data-route-map="'+esc(v.id)+'" '+(progress.pattern.shape?'':'disabled')+'>'+(progress.pattern.shape?'View accurate route on map':'Accurate road shape unavailable')+'</button>'
    +stopList+'</div>';
}
function lineDetail(r){
  const v=r.v, rec=LINES[v.line];
  const speed=(v.speed==null || !isFinite(v.speed))?'unknown':v.speed<.6?'stationary':Math.round(v.speed*2.237)+' mph';
  const facts=[
    ['Distance',fmtDist(r.metres)+' away'+(r.routeMetres&&r.routeMetres>r.metres+80?' · '+fmtDist(r.routeMetres)+' by route':'')],
    ['Speed',speed],
    ['Position age',(function(){ const n=Math.max(0,Math.round((Date.now()-v.ts)/1000)); return n<90?n+' s':Math.round(n/60)+' min'; })()],
    ['Heading',isFinite(v.bearing)?compass(v.bearing):'unknown'],
    ['Route evidence',r.evidence?r.evidence.label:'unverified'],
    ['Estimate confidence',r.confidence==='high'?'higher':r.confidence==='medium'?'moderate':'rough']
  ];
  const schedules=scheduledMatches(v.line,v.dest,r.secs,v.journey).slice(0,4);
  const times=schedules.length?'<div class="dlabel">Nearby scheduled departures</div><div class="dtimes">'+schedules.map((x,i)=>'<span class="dtime">'+esc(formatClock(x.at))+(i===0?'<i>closest</i>':'')+'</span>').join('')+'</div>':'';
  return '<div class="detail">'+journeyProgressHtml(v)+times
    +'<div class="dfacts">'+facts.map(([k,val])=>'<div><span class="dk">'+esc(k)+'</span><span class="dv">'+esc(val)+'</span></div>').join('')+'</div>'
    +'<div class="dnote">ETA is calculated from the fresh vehicle position, movement towards this stop, locally observed speed and '
    +(r.geometry?'the matched journey geometry':'route factor')
    +(r.schedule?', then checked against the timetable':'')+'. It is an estimate, not an operator prediction.'
    +(v.origin?' Running '+esc(v.origin)+' to '+esc(v.dest||'?')+(v.operator?' · '+esc(v.operator):'')+'.':'')+'</div></div>';
}
function compass"""
regex_replace_once(bus, line_detail_pattern, line_detail_replacement)

replace_once(
    bus,
    "    [...deps.querySelectorAll('[data-bell]')].forEach(b=>b.addEventListener('click',()=>{\n      const row=liveRows.find(r=>String(r.v.id)===String(b.dataset.bell));\n      if(row) toggleAlarm(row.v.line,row.v.dest);\n    }));\n    checkAlarms(liveRows);",
    "    [...deps.querySelectorAll('[data-bell]')].forEach(b=>b.addEventListener('click',()=>{\n      const row=liveRows.find(r=>String(r.v.id)===String(b.dataset.bell));\n      if(row) toggleAlarm(row.v.line,row.v.dest);\n    }));\n    [...deps.querySelectorAll('[data-route-map]')].forEach(b=>b.addEventListener('click',event=>{\n      event.stopPropagation(); showJourneyOnMap(b.dataset.routeMap);\n    }));\n    checkAlarms(liveRows);",
)

render_vehicles_pattern = r"function clearVehicleMarkers\(\)\{.*?\n\}\n\nfunction focusVehicle"
render_vehicles_replacement = r"""function clearVehicleMarkers(){ vehLayer.clearLayers(); routeLayer.clearLayers(); S.markers.clear(); }

function renderSelectedJourney(rows){
  routeLayer.clearLayers();
  if(!S.selected) return;
  const row=rows.find(item=>String(item.v.id)===String(S.selected));
  const progress=row&&journeyProgress(row.v);
  if(!progress||!progress.pattern.shape) return;
  const split=splitPatternAt(progress.pattern,progress.vehicle);
  if(split.passed.length>1) L.polyline(split.passed,{color:'#526276',weight:4,opacity:.72,dashArray:'5 7',interactive:false}).addTo(routeLayer);
  if(split.remaining.length>1) L.polyline(split.remaining,{color:'#FFB000',weight:5,opacity:.92,interactive:false}).addTo(routeLayer);
  progress.stops.forEach((stop,index)=>{
    const selected=index===progress.selectedIndex, next=index===progress.nextIndex, passed=index<progress.nextIndex;
    const marker=L.circleMarker([stop.lat,stop.lon],{
      radius:selected?6:next?5:3,
      color:selected?'#FFB000':next?'#3FD9A4':passed?'#526276':'#9AAABD',
      weight:selected||next?2:1,
      fillColor:selected?'#FFB000':next?'#3FD9A4':passed?'#526276':'#111A26',
      fillOpacity:selected||next?.95:.78,
      opacity:passed?.58:.9
    }).addTo(routeLayer);
    marker.bindTooltip(stop.name+(selected?' · your stop':next?' · next stop':''),{direction:'top',className:'stoptip'});
  });
}
function renderVehicles(rows){
  const wanted = new Map(rows.map(r=>[r.v.id,r]));
  for(const [id,m] of S.markers){
    const v=S.vehicles.get(id);
    const keep=wanted.has(id)||(v&&S.stop&&dist(v.lat,v.lon,S.stop.lat,S.stop.lon)<=MAX_VEH_DIST);
    if(!keep){ vehLayer.removeLayer(m); S.markers.delete(id); }
  }
  for(const v of S.vehicles.values()){
    const shown = wanted.has(v.id);
    const nearby=!S.stop||dist(v.lat,v.lon,S.stop.lat,S.stop.lon)<=MAX_VEH_DIST;
    if(!shown&&!nearby) continue;
    const cls = 'veh'+(shown?'':' dim')+(S.selected===v.id?' sel':'');
    const brg = isFinite(v.bearing)?v.bearing:0;
    const visual=visualVehiclePosition(v);
    const sig = cls+'|'+Math.round(brg/5)+'|'+v.line;
    let m = S.markers.get(v.id);
    if(!m){
      const html = '<div class="'+cls+'"><div class="cone" style="transform:rotate('+brg+'deg)"></div>'
                 + '<div class="body">'+esc(String(v.line).slice(0,4))+'</div></div>';
      m = L.marker([visual.lat,visual.lon],{
        icon:L.divIcon({className:'vehmark',html,iconSize:[34,34],iconAnchor:[17,17]}),
        zIndexOffset: shown?400:200
      }).addTo(vehLayer);
      m._sig = sig;
      m.on('click',()=>focusVehicle(v.id));
      S.markers.set(v.id,m);
    } else {
      if(m._sig !== sig){
        const el = m.getElement();
        const inner = el && el.firstElementChild;
        if(inner){
          inner.className = cls;
          const cone = inner.querySelector('.cone');
          if(cone) cone.style.transform = 'rotate('+brg+'deg)';
          const body = inner.querySelector('.body');
          if(body) body.textContent = String(v.line).slice(0,4);
        }
        m._sig = sig;
      }
      m.setLatLng([visual.lat,visual.lon]);
    }
    m.setZIndexOffset(shown ? (S.selected===v.id?700:400) : 150);
    const r = wanted.get(v.id);
    const popup = '<b>'+esc(v.line)+'</b> to '+esc(v.dest||'?')
      + (r ? '<br>'+Math.max(1,Math.round(r.secs/60))+' min to '+esc(S.stop.name) : '<br>Not calling at your stop')
      + (v.operator&&v.operator!=='SIM' ? '<br><span style="color:#7D8FA3;font-size:11px">'+esc(v.operator)+'</span>':'');
    if(m.getPopup()) m.setPopupContent(popup); else m.bindPopup(popup);
  }
  renderSelectedJourney(rows);
}
function showJourneyOnMap(id){
  const v=S.vehicles.get(id); if(!v) return;
  S.selected=id; render(); setAppView('map');
  const progress=journeyProgress(v);
  if(progress&&progress.pattern.shape){
    setTimeout(()=>{ try{ map.fitBounds(progress.pattern.points.map(p=>[p.lat,p.lon]),{padding:[24,24],maxZoom:15,animate:true}); }catch(e){} },80);
  }
}

function focusVehicle"""
regex_replace_once(bus, render_vehicles_pattern, render_vehicles_replacement)

replace_once(
    bus,
    "          <div class=\"confidence-guide\"><b>LIVE GPS</b> means a real bus has reported a position within the last two minutes. <b>GPS DELAYED</b> means the last confirmed report is two to four minutes old; Kerbside keeps it briefly instead of making the bus flicker out, but marks its ETA as estimated. Later timetable departures remain <b>scheduled</b> until a matching vehicle begins service. <b>Likely</b> means route and direction evidence strongly suggest the live bus will serve the stop, while <b>Verified</b> has stronger journey/stop evidence and <b>rough</b> has limited evidence.</div>",
    "          <div class=\"confidence-guide\"><b>LIVE GPS</b> means a real bus has reported a position within the last two minutes. <b>GPS DELAYED</b> means the last confirmed report is two to four minutes old; Kerbside keeps it briefly instead of making the bus flicker out, but marks its ETA as estimated. Later timetable departures remain <b>scheduled</b> until a matching vehicle begins service. <b>Likely</b> means route and direction evidence strongly suggest the live bus will serve the stop, while <b>Verified</b> has stronger journey/stop evidence and <b>rough</b> has limited evidence. Tap a matched live bus for its ordered stop progress; a map route is drawn only when the national GTFS feed supplies an official shape for that exact journey.</div>",
)

# Upgrade the national builder to retain authoritative GTFS shapes and ordered stop metadata.
replace_once(
    builder,
    """  CREATE TABLE patterns (
    pattern_id TEXT PRIMARY KEY,
    coords TEXT NOT NULL
  );""",
    """  CREATE TABLE patterns (
    pattern_id TEXT PRIMARY KEY,
    coords TEXT NOT NULL
  );
  CREATE TABLE shape_points (
    shape_id TEXT NOT NULL,
    seq REAL NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL
  );""",
)
replace_once(
    builder,
    """const tripPattern = new Map();
let stopTimeRows = 0;
let invalidTimes = 0;""",
    """const tripPattern = new Map();
let stopTimeRows = 0;
let shapePointRows = 0;
let invalidTimes = 0;""",
)
replace_once(
    builder,
    """      service: String(row.service_id || ''),
      direction: row.direction_id == null ? '' : String(row.direction_id)
    });""",
    """      service: String(row.service_id || ''),
      direction: row.direction_id == null ? '' : String(row.direction_id),
      shape: String(row.shape_id || '').trim()
    });""",
)
replace_once(
    builder,
    """  await eachRow('calendar_dates.txt', row => {
    const id = String(row.service_id || '').trim();
    const date = dateKey(row.date);
    if (!id || !date) return;
    const service = services.get(id) || { days: '0000000', start: '', end: '', add: [], remove: [] };
    if (String(row.exception_type) === '1') service.add.push(date);
    if (String(row.exception_type) === '2') service.remove.push(date);
    services.set(id, service);
  }, { optional: true });

  console.log(`[${region}] Importing stop_times into temporary SQLite...`);""",
    """  await eachRow('calendar_dates.txt', row => {
    const id = String(row.service_id || '').trim();
    const date = dateKey(row.date);
    if (!id || !date) return;
    const service = services.get(id) || { days: '0000000', start: '', end: '', add: [], remove: [] };
    if (String(row.exception_type) === '1') service.add.push(date);
    if (String(row.exception_type) === '2') service.remove.push(date);
    services.set(id, service);
  }, { optional: true });

  console.log(`[${region}] Importing optional GTFS route shapes...`);
  const insertShape = db.prepare('INSERT INTO shape_points(shape_id, seq, lat, lon) VALUES (?, ?, ?, ?)');
  db.exec('BEGIN');
  let shapeBatch = 0;
  await eachRow('shapes.txt', (row, number) => {
    const id = String(row.shape_id || '').trim();
    const lat = Number(row.shape_pt_lat);
    const lon = Number(row.shape_pt_lon);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    insertShape.run(id, sequence(row.shape_pt_sequence, number), lat, lon);
    shapePointRows++;
    shapeBatch++;
    if (shapeBatch >= 50000) {
      db.exec('COMMIT; BEGIN');
      shapeBatch = 0;
    }
  }, { optional: true });
  db.exec('COMMIT');
  if (shapePointRows) db.exec('CREATE INDEX idx_shape_sequence ON shape_points(shape_id, seq);');

  console.log(`[${region}] Importing stop_times into temporary SQLite...`);""",
)

old_patterns = """  console.log(`[${region}] Deduplicating ordered journey patterns...`);
  const putPattern = db.prepare('INSERT OR IGNORE INTO patterns(pattern_id, coords) VALUES (?, ?)');
  let currentTrip = '';
  let sequenceStops = [];

  function flushPattern() {
    if (!currentTrip || sequenceStops.length < 2) {
      sequenceStops = [];
      return;
    }
    const signature = sequenceStops.join('\\u001f');
    const patternId = shortHash(signature);
    const coordinates = sequenceStops
      .map(id => stops.get(id))
      .filter(Boolean)
      .map(stop => [stop.lat, stop.lon]);
    if (coordinates.length >= 2) {
      tripPattern.set(currentTrip, patternId);
      putPattern.run(patternId, JSON.stringify(coordinates));
    }
    sequenceStops = [];
  }

  for (const row of db.prepare('SELECT trip_id, stop_id FROM stop_times ORDER BY trip_id, seq').iterate()) {
    if (row.trip_id !== currentTrip) {
      flushPattern();
      currentTrip = row.trip_id;
    }
    if (sequenceStops[sequenceStops.length - 1] !== row.stop_id) sequenceStops.push(row.stop_id);
  }
  flushPattern();

  console.log(`[${region}] Writing compact pattern shards...`);
  let shardPrefix = '';
  let shard = {};
  let patternCount = 0;

  function flushShard() {
    if (!shardPrefix) return;
    writeJson(path.join(patternRoot, `${shardPrefix}.json`), {
      version: 2,
      built: nowIso,
      region,
      patterns: shard
    });
    shard = {};
  }
"""
new_patterns = """  console.log(`[${region}] Deduplicating ordered journey patterns and authoritative shapes...`);
  const putPattern = db.prepare('INSERT OR IGNORE INTO patterns(pattern_id, coords) VALUES (?, ?)');
  const readShape = db.prepare('SELECT lat, lon FROM shape_points WHERE shape_id = ? ORDER BY seq');
  const builtPatterns = new Set();
  let currentTrip = '';
  let sequenceStops = [];
  let shapedPatternCount = 0;

  function pointSegmentDistanceSquared(point, start, end) {
    const scaleX = 111320 * Math.cos(((point.lat + start.lat + end.lat) / 3) * Math.PI / 180);
    const px = point.lon * scaleX, py = point.lat * 111320;
    const ax = start.lon * scaleX, ay = start.lat * 111320;
    const bx = end.lon * scaleX, by = end.lat * 111320;
    const dx = bx - ax, dy = by - ay;
    const denom = dx * dx + dy * dy;
    const t = denom ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denom)) : 0;
    const x = ax + dx * t, y = ay + dy * t;
    return (px - x) ** 2 + (py - y) ** 2;
  }

  function simplifyShape(points, tolerance = 8) {
    if (points.length <= 2) return points;
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    const threshold = tolerance * tolerance;
    while (stack.length) {
      const [start, end] = stack.pop();
      let best = threshold, index = -1;
      for (let i = start + 1; i < end; i++) {
        const distance = pointSegmentDistanceSquared(points[i], points[start], points[end]);
        if (distance > best) { best = distance; index = i; }
      }
      if (index >= 0) {
        keep[index] = 1;
        stack.push([start, index], [index, end]);
      }
    }
    return points.filter((_, index) => keep[index]);
  }

  function flushPattern() {
    if (!currentTrip || sequenceStops.length < 2) {
      sequenceStops = [];
      return;
    }
    const trip = trips.get(currentTrip);
    const shapeId = String(trip && trip.shape || '');
    const signature = sequenceStops.join('\\u001f') + '\\u001e' + shapeId;
    const patternId = shortHash(signature);
    tripPattern.set(currentTrip, patternId);
    if (builtPatterns.has(patternId)) {
      sequenceStops = [];
      return;
    }
    const orderedStops = sequenceStops
      .map(id => [id, stops.get(id)])
      .filter(([, stop]) => Boolean(stop));
    let routePoints = [];
    if (shapeId && shapePointRows) {
      routePoints = [...readShape.iterate(shapeId)].map(row => ({ lat: Number(row.lat), lon: Number(row.lon) }));
    }
    const hasShape = routePoints.length >= 2;
    if (hasShape) routePoints = simplifyShape(routePoints);
    else routePoints = orderedStops.map(([, stop]) => ({ lat: stop.lat, lon: stop.lon }));
    if (routePoints.length >= 2 && orderedStops.length >= 2) {
      putPattern.run(patternId, JSON.stringify({
        p: routePoints.map(point => [Number(point.lat.toFixed(6)), Number(point.lon.toFixed(6))]),
        s: orderedStops.map(([id, stop]) => [id, stop.name, stop.lat, stop.lon]),
        g: hasShape ? 1 : 0
      }));
      builtPatterns.add(patternId);
      if (hasShape) shapedPatternCount++;
    }
    sequenceStops = [];
  }

  for (const row of db.prepare('SELECT trip_id, stop_id FROM stop_times ORDER BY trip_id, seq').iterate()) {
    if (row.trip_id !== currentTrip) {
      flushPattern();
      currentTrip = row.trip_id;
    }
    if (sequenceStops[sequenceStops.length - 1] !== row.stop_id) sequenceStops.push(row.stop_id);
  }
  flushPattern();

  console.log(`[${region}] Writing compact pattern shards...`);
  let shardPrefix = '';
  let shard = {};
  let patternCount = 0;
  let maxPatternBytes = 0;

  function flushShard() {
    if (!shardPrefix) return;
    const filename = path.join(patternRoot, `${shardPrefix}.json`);
    writeJson(filename, {
      version: 3,
      built: nowIso,
      region,
      patterns: shard
    });
    maxPatternBytes = Math.max(maxPatternBytes, fs.statSync(filename).size);
    shard = {};
  }
"""
replace_once(builder, old_patterns, new_patterns)
replace_once(
    builder,
    """      version: 7,
      built: nowIso,
      scope: 'departure-shard',""",
    """      version: 8,
      built: nowIso,
      scope: 'departure-shard',""",
)
replace_once(
    builder,
    """    patterns: patternCount,
    tiles: tileCount,""",
    """    patterns: patternCount,
    shapedPatterns: shapedPatternCount,
    shapePoints: shapePointRows,
    tiles: tileCount,""",
)
replace_once(builder, "    maxTileBytes: maxAssetBytes,", "    maxTileBytes: Math.max(maxAssetBytes, maxPatternBytes),")

write(
    builder_test,
    """import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const script = path.resolve('scripts/build-region.js');

async function csv(filename, text) {
  await writeFile(filename, text.trim() + '\\n', 'utf8');
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
route_id,route_short_name,route_long_name
R,10,Test Route`);
    await csv(path.join(gtfs, 'trips.txt'), `
route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
R,S,T,Gamma,0,SHAPE`);
    await csv(path.join(gtfs, 'stop_times.txt'), `
trip_id,arrival_time,departure_time,stop_id,stop_sequence
T,08:00:00,08:00:00,A,1
T,08:05:00,08:05:00,B,2
T,08:10:00,08:10:00,C,3`);
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
    for (const name of departureFiles) {
      const data = JSON.parse(await readFile(path.join(out, 'regions', 'test_region', 'departures', name), 'utf8'));
      if (data.tripPatterns && data.tripPatterns.T) patternId = data.tripPatterns.T;
    }
    assert.ok(patternId, 'trip should reference a pattern');
    const patternFile = path.join(out, 'regions', 'test_region', 'patterns', patternId.slice(0, 2) + '.json');
    const shard = JSON.parse(await readFile(patternFile, 'utf8'));
    const pattern = shard.patterns[patternId];
    assert.equal(shard.version, 3);
    assert.equal(pattern.g, 1, 'shape geometry should be marked authoritative');
    assert.ok(pattern.p.length > 3, 'shape should retain intermediate road geometry');
    assert.deepEqual(pattern.s.map(stop => stop[0]), ['A', 'B', 'C']);
    assert.deepEqual(pattern.s.map(stop => stop[1]), ['Alpha Stop', 'Beta Stop', 'Gamma Stop']);
    const manifest = JSON.parse(await readFile(path.join(out, 'regions', 'test_region', 'manifest.json'), 'utf8'));
    assert.equal(manifest.shapedPatterns, 1);
    assert.equal(manifest.shapePoints, 7);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
""",
)

replace_once(
    browser_test,
    """assert.match(busSource, /const FAR_VEH_DIST = 18000/);
assert.match(busSource, /function bboxes\\(wide\\)/);
assert.match(busSource, /far && \\(!gate \\|\\| !evidence\\.journeyMatch\\)/);
assert.match(busSource, /if\\(!shown&&!nearby\\) continue/);""",
    """assert.match(busSource, /const FAR_VEH_DIST = 18000/);
assert.match(busSource, /function bboxes\\(wide\\)/);
assert.match(busSource, /far && \\(!gate \\|\\| !evidence\\.journeyMatch\\)/);
assert.match(busSource, /if\\(!shown&&!nearby\\) continue/);
assert.match(busSource, /function timetablePatternRecord\\(journey\\)/);
assert.match(busSource, /function journeyProgress\\(v\\)/);
assert.match(busSource, /routeLayer=L\\.layerGroup/);
assert.match(busSource, /data-route-map/);
assert.match(busSource, /progress\\.pattern\\.shape/);""",
)
replace_once(
    browser_test,
    """        setView(){ return this; }, on(){ return this; }, removeLayer(){},
        invalidateSize(){ return this; }, panTo(){ return this; }
      };
    },
    tileLayer(){ return passiveLayer(); }, layerGroup(){ return passiveLayer(); },
    marker, circle(){ return passiveLayer(); }, divIcon(options){ return options; }""",
    """        setView(){ return this; }, on(){ return this; }, removeLayer(){},
        invalidateSize(){ return this; }, panTo(){ return this; }, fitBounds(){ return this; }, getZoom(){ return 16; }
      };
    },
    tileLayer(){ return passiveLayer(); }, layerGroup(){ return passiveLayer(); },
    marker, circle(){ return passiveLayer(); }, polyline(){ return passiveLayer(); },
    circleMarker(){ return { ...passiveLayer(), bindTooltip(){ return this; } }; },
    divIcon(options){ return options; }""",
)
replace_once(browser_test, "app 0.6.14", "app 0.6.15")

replace_once(
    readme,
    "Kerbside 0.6.14 periodically expands live GPS coverage to an 18 km area around the selected stop. The wider area is guarded by exact timetable journey matching: distant vehicles are shown only when the live journey is scheduled to call at that stop, while the existing nearby route matching and dim background markers remain limited to the original 9 km area. Wide scans run less often than nearby refreshes to limit extra BODS traffic.\n",
    "Kerbside 0.6.14 periodically expands live GPS coverage to an 18 km area around the selected stop. The wider area is guarded by exact timetable journey matching: distant vehicles are shown only when the live journey is scheduled to call at that stop, while the existing nearby route matching and dim background markers remain limited to the original 9 km area. Wide scans run less often than nearby refreshes to limit extra BODS traffic.\n\nKerbside 0.6.15 adds exact live journey progress. Tapping a timetable-matched vehicle shows its ordered stops, passed stops, next stop, selected-stop position, stops remaining and percentage through the journey. The national builder now retains optional GTFS `shapes.txt` geometry and stop metadata. Kerbside draws the map route only when that exact journey has an authoritative GTFS shape; older or shape-less patterns continue to support matching but never produce a guessed road line.\n",
)

print(f"Prepared Kerbside {NEW_VERSION} route progress release")
