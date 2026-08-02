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


def replace_count(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} matches, found {count}')
    return text.replace(old, new)


def sub_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one regex match, found {count}')
    return updated


bus_path = 'bus.html'
bus = read(bus_path)
bus = replace_once(bus, "const APP_VERSION = '0.6.47';", "const APP_VERSION = '0.6.48';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.47 also validates and snapshots national stop-index tiles, while genuine empty-tile responses use a five-minute negative cache instead of remaining unavailable for the life of the tab.",
    "Version 0.6.48 also follows ordered timetable journeys upstream, checking at most three additional route-corridor areas once per minute and retaining only exact live journeys that have not passed this stop.",
    'coverage release note'
)
bus = replace_once(
    bus,
    ".chip.conf-low{border-color:var(--rule);color:var(--text-dim)}",
    ".chip.conf-low{border-color:var(--rule);color:var(--text-dim)}\n.chip.route-scan{border-color:rgba(92,143,189,.55);background:rgba(92,143,189,.1);color:#A9C9E6}",
    'route scan badge style'
)
bus = replace_once(
    bus,
    "const VISUAL_MAX_LEAD_METRES = 180;",
    """const VISUAL_MAX_LEAD_METRES = 180;
const ROUTE_SCAN_INTERVAL_MS = 60*1000;
const ROUTE_SCAN_LOOKAHEAD_MS = 3*60*60*1000;
const ROUTE_SCAN_OFFSETS = [16000,32000,48000];
const ROUTE_SCAN_BOX_RADIUS = 8000;
const ROUTE_SCAN_MAX_BOXES = 3;
const ROUTE_SCAN_MAX_ROUTE_METRES = 55000;
const ROUTE_SCAN_PATTERN_LIMIT = 36;""",
    'route scan constants'
)
bus = replace_once(
    bus,
    "  lastWideFetch:0\n};",
    """  lastWideFetch:0,
  routeScanBusy:false, routeScanAbort:null, lastRouteScan:0,
  routeScanBoxes:0, routeScanPatterns:0, routeScanVehicles:0, routeScanError:''
};""",
    'route scan state'
)
bus = replace_once(
    bus,
    "  if(changed){ S.destFilter=null; S.selected=null; S.manualStop=manual===true; } else if(manual===true) S.manualStop=true;",
    """  if(changed){
    if(S.routeScanAbort) S.routeScanAbort.abort();
    S.routeScanAbort=null; S.routeScanBusy=false; S.lastRouteScan=0;
    S.routeScanBoxes=0; S.routeScanPatterns=0; S.routeScanVehicles=0; S.routeScanError='';
    S.destFilter=null; S.selected=null; S.manualStop=manual===true;
  } else if(manual===true) S.manualStop=true;""",
    'route scan reset on stop change'
)

projection_hook = """if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),patternProjectionCandidates,choosePatternProjection};
}
function journeyGeometry(v,stop){
"""
projection_helpers = """if(typeof window!=='undefined'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost')){
  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),patternProjectionCandidates,choosePatternProjection};
}
function pointAlongPattern(points,along){
  if(!Array.isArray(points)||points.length<2) return null;
  const metrics=patternMetrics(points), wanted=Math.max(0,Math.min(metrics.total,Number(along)||0));
  for(let i=0;i<points.length-1;i++){
    const start=metrics.starts[i], length=metrics.lengths[i];
    if(!isFinite(length)||length<1) continue;
    if(wanted<=start+length){
      const fraction=Math.max(0,Math.min(1,(wanted-start)/length));
      return {lat:points[i].lat+(points[i+1].lat-points[i].lat)*fraction,lon:points[i].lon+(points[i+1].lon-points[i].lon)*fraction,along:wanted};
    }
  }
  const last=points[points.length-1];
  return {lat:last.lat,lon:last.lon,along:metrics.total};
}
function vehicleJourneyRef(v){ return String(v&&(v.corridorTrip||v.journey)||''); }
function journeyGeometry(v,stop){
"""
bus = replace_once(bus, projection_hook, projection_helpers, 'route scan geometry helpers')
bus = replace_count(bus, "const pattern=timetablePatternRecord(v.journey);", "const pattern=timetablePatternRecord(vehicleJourneyRef(v));", 2, 'resolved journey geometry')
bus = replace_once(bus, "  const evidence=routeEvidence(v.line,v.dest,v.journey);", "  const journeyRef=vehicleJourneyRef(v);\n  const evidence=routeEvidence(v.line,v.dest,journeyRef);", 'estimate route evidence')
bus = replace_once(bus, "  const schedules=scheduledMatches(v.line,v.dest,spatial,v.journey);", "  const schedules=scheduledMatches(v.line,v.dest,spatial,journeyRef);", 'estimate schedule match')
bus = replace_once(bus, "  const schedules=scheduledMatches(v.line,v.dest,r.secs,v.journey).slice(0,4);", "  const schedules=scheduledMatches(v.line,v.dest,r.secs,vehicleJourneyRef(v)).slice(0,4);", 'detail schedule match')

old_feed_urls = """function feedUrls(wide){
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
}
"""
new_feed_urls = """function feedUrlsForBoxes(boxes){
  const list=Array.isArray(boxes)?boxes.filter(Boolean):[];
  if(S.proxy){
    return list.map(box=>{
      const u = new URL(S.proxy, location.href);
      u.searchParams.set('bbox',box);
      return u.toString();
    });
  }
  if(!S.key) return [];
  return list.map(box=>'https://data.bus-data.dft.gov.uk/api/v1/datafeed/?api_key='
       + encodeURIComponent(S.key) + '&boundingBox=' + box);
}
function feedUrls(wide){ return feedUrlsForBoxes(bboxes(wide)); }
function mergeRouteScanMatches(target,items){
  const seen=new Set(target.map(item=>String(item.trip)));
  for(const item of items) if(item&&item.trip&&!seen.has(String(item.trip))){target.push(item);seen.add(String(item.trip));}
}
function routeScanPlans(now=Date.now()){
  if(!S.stop||!S.ttStop||!S.timetable) return [];
  const rows=timetableRows(new Date(now)).filter(row=>
    row.trip&&row.at>=now-2*60000&&row.at<=now+ROUTE_SCAN_LOOKAHEAD_MS
  ).sort((a,b)=>a.at-b.at).slice(0,ROUTE_SCAN_PATTERN_LIMIT);
  const groups=new Map();
  for(const row of rows){
    const pattern=timetablePatternRecord(row.trip); if(!pattern) continue;
    const ordered=orderedPatternStops(pattern), selectedIndex=selectedPatternStopIndex(ordered);
    const selected=selectedIndex>=0?ordered[selectedIndex]:null;
    const projected=selected?null:projectToPattern(pattern.points,S.stop.lat,S.stop.lon);
    const targetAlong=selected?selected.along:projected&&projected.along;
    const targetOffset=selected?dist(selected.lat,selected.lon,S.stop.lat,S.stop.lon):projected&&projected.metres;
    if(!isFinite(targetAlong)||!isFinite(targetOffset)||targetOffset>250) continue;
    const key=pattern.id+'|'+Math.round(targetAlong/50), existing=groups.get(key);
    const match={trip:String(row.trip),line:String(row.line),head:row.head||'',pattern,targetAlong};
    if(existing){existing.due=Math.min(existing.due,row.at);mergeRouteScanMatches(existing.matches,[match]);}
    else groups.set(key,{pattern,targetAlong,due:row.at,matches:[match]});
  }
  const candidates=[];
  for(const group of groups.values()){
    for(const offset of ROUTE_SCAN_OFFSETS){
      if(group.targetAlong<offset+1000) continue;
      const centre=pointAlongPattern(group.pattern.points,group.targetAlong-offset);
      if(!centre||dist(centre.lat,centre.lon,S.stop.lat,S.stop.lon)<FAR_VEH_DIST-1000) continue;
      candidates.push({
        lat:centre.lat,lon:centre.lon,offset,due:group.due,
        bbox:boxAround(centre,ROUTE_SCAN_BOX_RADIUS),matches:[...group.matches]
      });
    }
  }
  candidates.sort((a,b)=>a.due-b.due||a.offset-b.offset);
  const selected=[];
  for(const candidate of candidates){
    const existing=selected.find(item=>dist(item.lat,item.lon,candidate.lat,candidate.lon)<ROUTE_SCAN_BOX_RADIUS+1000);
    if(existing){ mergeRouteScanMatches(existing.matches,candidate.matches); continue; }
    selected.push(candidate);
    if(selected.length>=ROUTE_SCAN_MAX_BOXES) break;
  }
  return selected;
}
function matchRouteScanVehicle(plan,v){
  if(!plan||!v||!v.journey) return null;
  const tripMatch=uniqueCompatibleTrips(plan.matches,v.journey,item=>item.trip);
  if(!tripMatch.items.length||tripMatch.ambiguous) return null;
  const match=tripMatch.items[0];
  if(String(v.line)!==String(match.line)) return null;
  if(v.dest&&match.head&&destinationSimilarity(v.dest,match.head)<.34) return null;
  const position=projectVehicleToPattern(match.pattern,v);
  if(!position||position.metres>800) return null;
  const remaining=match.targetAlong-position.along;
  if(remaining < -120 || remaining > ROUTE_SCAN_MAX_ROUTE_METRES) return null;
  v.corridorTrip=match.trip; v.corridorTracked=true; v.corridorRemaining=remaining;
  return v;
}
"""
bus = replace_once(bus, old_feed_urls, new_feed_urls, 'route corridor planning')
bus = replace_once(bus, "        id,journey,vehicleRef:f.VehicleRef||'',", "        id,journey,vehicleRef:f.VehicleRef||'',corridorTracked:false,", 'normal feed corridor source')
old_test_hook = "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads,fetchLive,ingest,relevant,liveState:S};"
new_test_hook = "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads,fetchLive,ingest,relevant,liveState:S,pointAlongPattern,vehicleJourneyRef,routeScanPlans,matchRouteScanVehicle,pollRouteCorridor};"
bus = replace_once(bus, old_test_hook, new_test_hook, 'route scan test hooks')

route_scan_runtime = """
async function pollRouteCorridor(){
  if(S.demo||!S.origin||!S.stop||!S.ttStop||S.routeScanBusy||Date.now()-S.lastRouteScan<ROUTE_SCAN_INTERVAL_MS) return [];
  const started=Date.now(), stopId=String(S.stop.id), timetableRun=S.timetableRun;
  S.lastRouteScan=started;
  const plans=routeScanPlans(started);
  S.routeScanBoxes=plans.length;
  S.routeScanPatterns=new Set(plans.flatMap(plan=>plan.matches.map(match=>match.pattern.id))).size;
  S.routeScanVehicles=0; S.routeScanError='';
  if(!plans.length){ renderLiveDiagnostics(); return []; }
  const urls=feedUrlsForBoxes(plans.map(plan=>plan.bbox));
  if(urls.length!==plans.length){ S.routeScanError='Upstream route scan is not configured'; renderLiveDiagnostics(); return []; }
  const ctl=new AbortController(); S.routeScanAbort=ctl; S.routeScanBusy=true; renderLiveDiagnostics();
  try{
    const settled=await Promise.allSettled(urls.map((url,index)=>fetchLiveResponse(url,ctl.signal).then(item=>({item,plan:plans[index]}))));
    if(ctl.signal.aborted||!S.stop||String(S.stop.id)!==stopId||S.timetableRun!==timetableRun) return [];
    const merged=new Map();
    for(const result of settled){
      if(result.status!=='fulfilled') continue;
      const parsed=parseLivePayloads([result.value.item],Date.now());
      for(const vehicle of parsed.vehicles){
        const matched=matchRouteScanVehicle(result.value.plan,vehicle); if(!matched) continue;
        const current=merged.get(matched.id); if(!current||matched.ts>current.ts) merged.set(matched.id,matched);
      }
    }
    const vehicles=[...merged.values()];
    S.routeScanVehicles=vehicles.length;
    const failures=settled.filter(result=>result.status==='rejected').length;
    if(failures===settled.length) S.routeScanError='Upstream route scan temporarily unavailable';
    else if(failures) S.routeScanError='Part of the upstream route scan was unavailable';
    if(vehicles.length){ ingest(vehicles); learnDests(); renderDests(); render(); }
    else renderLiveDiagnostics();
    return vehicles;
  }catch(e){
    if(!ctl.signal.aborted) S.routeScanError='Upstream route scan temporarily unavailable';
    return [];
  }finally{
    if(S.routeScanAbort===ctl) S.routeScanAbort=null;
    S.routeScanBusy=false; renderLiveDiagnostics();
  }
}
"""
bus = replace_once(bus, "\n/* ============================================================\n   Simulator — invented vehicles, real geography", route_scan_runtime + "\n/* ============================================================\n   Simulator — invented vehicles, real geography", 'route scan runtime')

bus = replace_once(
    bus,
    "    Object.assign(rec, v);",
    """    if(prev&&prev.journey&&v.journey&&prev.journey!==v.journey){ delete rec.routeProjection; delete rec.corridorTrip; delete rec.corridorRemaining; }
    if(!v.corridorTracked){ delete rec.corridorTrip; delete rec.corridorRemaining; }
    Object.assign(rec, v);""",
    'corridor metadata lifecycle'
)

old_collect = """    const d=dist(v.lat,v.lon,S.stop.lat,S.stop.lon), far=d>MAX_VEH_DIST;
    if(d>(gate?FAR_VEH_DIST:1300)){ rejectLive(diagnostics,'range'); continue; }
    if(diagnostics) diagnostics.nearby++;

    const evidence=routeEvidence(v.line,v.dest,v.journey);
    const geometry=journeyGeometry(v,S.stop);
    if(geometry && geometry.passed){ rejectLive(diagnostics,'passed'); continue; }
    // The expanded search area remains exact-only. This prevents a vehicle
    // on another branch of a long route being attached to this stop.
    if(far && (!gate || !evidence.journeyMatch)){ rejectLive(diagnostics,'route'); continue; }
"""
new_collect = """    const d=dist(v.lat,v.lon,S.stop.lat,S.stop.lon), far=d>MAX_VEH_DIST;
    const journeyRef=vehicleJourneyRef(v), evidence=routeEvidence(v.line,v.dest,journeyRef);
    const geometry=journeyGeometry(v,S.stop);
    if(geometry && geometry.passed){ rejectLive(diagnostics,'passed'); continue; }
    const corridorFar=!!(v.corridorTracked&&geometry&&geometry.remaining>80&&geometry.remaining<=ROUTE_SCAN_MAX_ROUTE_METRES&&evidence.journeyMatch&&evidence.pathMatch);
    const range=corridorFar?ROUTE_SCAN_MAX_ROUTE_METRES:(gate?FAR_VEH_DIST:1300);
    if(d>range){ rejectLive(diagnostics,'range'); continue; }
    if(diagnostics) diagnostics.nearby++;

    // Beyond the ordinary 18 km scan, only a vehicle found in a timetable-
    // guided corridor and uniquely matched to the ordered journey can pass.
    if(far && (!gate || !evidence.journeyMatch || (d>FAR_VEH_DIST&&!corridorFar))){ rejectLive(diagnostics,'route'); continue; }
"""
bus = replace_once(bus, old_collect, new_collect, 'far corridor board filtering')
bus = replace_once(bus, "    if(v.dest && servesHere(v.line,v.dest) && dist(v.lat,v.lon,S.stop.lat,S.stop.lon)<MAX_VEH_DIST) live[v.dest]=true;", "    if(v.dest && servesHere(v.line,v.dest) && (dist(v.lat,v.lon,S.stop.lat,S.stop.lon)<MAX_VEH_DIST||v.corridorTracked)) live[v.dest]=true;", 'far destination activity')

old_diag = """  const upstreamHidden=(Number(S.feedStale)||0)+(Number(S.feedUnknownAge)||0);
  el.innerHTML='<div class="diag-title">Live matching for this stop</div><div class="diag-grid">'
"""
new_diag = """  const upstreamHidden=(Number(S.feedStale)||0)+(Number(S.feedUnknownAge)||0);
  const routeScanNote=!S.ttStop?'':S.routeScanBusy
    ? '<br><b>Upstream route scan:</b> checking '+S.routeScanBoxes+' timetable-guided area'+(S.routeScanBoxes===1?'':'s')+'.'
    : S.routeScanBoxes
      ? '<br><b>Upstream route scan:</b> '+S.routeScanBoxes+' area'+(S.routeScanBoxes===1?'':'s')+' across '+S.routeScanPatterns+' route pattern'+(S.routeScanPatterns===1?'':'s')+' · '+S.routeScanVehicles+' matching bus'+(S.routeScanVehicles===1?'':'es')+'.'
      : '<br><b>Upstream route scan:</b> waiting for eligible ordered journey patterns.';
  el.innerHTML='<div class="diag-title">Live matching for this stop</div><div class="diag-grid">'
"""
bus = replace_once(bus, old_diag, new_diag, 'route scan diagnostics setup')
bus = replace_once(
    bus,
    "    +(upstreamHidden?'<br><b>Hidden before matching:</b> '+upstreamHidden+' stale or timestamp-invalid BODS positions.':'')\n    +'</div>';",
    "    +(upstreamHidden?'<br><b>Hidden before matching:</b> '+upstreamHidden+' stale or timestamp-invalid BODS positions.':'')\n    +routeScanNote+(S.routeScanError?'<br><b>Route scan note:</b> '+esc(S.routeScanError)+'.':'')\n    +'</div>';",
    'route scan diagnostics output'
)
bus = replace_once(
    bus,
    "        +'<span class=\"chip gps-age\">'+esc(gpsAge)+'</span>'",
    "        +'<span class=\"chip gps-age\">'+esc(gpsAge)+'</span>'\n        +(r.v.corridorTracked?'<span class=\"chip route-scan\" title=\"Found farther upstream through this exact timetable journey\">route scan</span>':'')",
    'route scan row badge'
)
bus = replace_once(
    bus,
    "  if(S.timer) clearInterval(S.timer);if(S.tick) clearInterval(S.tick);if(S.motionTimer) clearInterval(S.motionTimer);\n  if(S.pollAbort) S.pollAbort.abort();\n  S.timer=S.tick=S.motionTimer=null;S.pollAbort=null;",
    "  if(S.timer) clearInterval(S.timer);if(S.tick) clearInterval(S.tick);if(S.motionTimer) clearInterval(S.motionTimer);\n  if(S.pollAbort) S.pollAbort.abort(); if(S.routeScanAbort) S.routeScanAbort.abort();\n  S.timer=S.tick=S.motionTimer=null;S.pollAbort=null;S.routeScanAbort=null;S.routeScanBusy=false;",
    'route scan cancellation'
)
bus = replace_once(
    bus,
    "    renderGpsStats();\n    render();",
    "    renderGpsStats();\n    render();\n    if(!S.demo) void pollRouteCorridor();",
    'route scan polling hook'
)
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.47"', '"version": "0.6.48"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.47'", "version: '0.6.48'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.47');", "assert.equal(body.version, '0.6.48');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.47'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.48'/);", 'browser static version')
browser_test = replace_once(browser_test, "version: '0.6.47'", "version: '0.6.48'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.47')", "includes('app 0.6.48')", 'browser settings version')
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /const key=region\\+'\\/'\\+tile; if\\(DATA_TILE_CACHE\\.has\\(key\\)\\)/);",
    """assert.doesNotMatch(busSource, /const key=region\\+'\\/'\\+tile; if\\(DATA_TILE_CACHE\\.has\\(key\\)\\)/);
assert.match(busSource, /const ROUTE_SCAN_INTERVAL_MS = 60\\*1000/);
assert.match(busSource, /const ROUTE_SCAN_MAX_BOXES = 3/);
assert.match(busSource, /const ROUTE_SCAN_MAX_ROUTE_METRES = 55000/);
assert.match(busSource, /function routeScanPlans\\(now=Date\\.now\\(\\)\\)/);
assert.match(busSource, /function matchRouteScanVehicle\\(plan,v\\)/);
assert.match(busSource, /uniqueCompatibleTrips\\(plan\\.matches,v\\.journey,item=>item\\.trip\\)/);
assert.match(busSource, /if\\(d>FAR_VEH_DIST&&!corridorFar\\)/);
assert.match(busSource, /void pollRouteCorridor\\(\\)/);
assert.match(busSource, /route scan<\\/span>/);""",
    'route scan static checks'
)

corridor_fixture = """  const corridorBoard = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const saved={
      stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,onlyServing:state.onlyServing,
      hideAway:state.hideAway,destFilter:state.destFilter,demo:state.demo,vehicles:state.vehicles,
      ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,
      timetableSource:state.timetableSource,timetableRegion:state.timetableRegion,
      lastRouteScan:state.lastRouteScan,routeScanBoxes:state.routeScanBoxes,
      routeScanPatterns:state.routeScanPatterns,routeScanVehicles:state.routeScanVehicles,
      routeScanError:state.routeScanError
    };
    const at=new Date(now+45*60000),base=at.getHours()*60+at.getMinutes();
    const trips=[1,2,3,4,5].map(index=>`corridor-trip-${index}`);
    const patternId='aa48corridorpattern0001';
    state.stop={id:'corridor-stop',timetableId:'corridor-stop',lat:52.54,lon:-2.1,name:'Corridor stop',d:0};
    state.origin={lat:52.54,lon:-2.1,label:'Corridor stop'};state.anchor=null;state.dir='all';
    state.onlyServing=true;state.hideAway=true;state.destFilter=null;state.demo=false;state.vehicles=new Map();
    state.ttStop={id:'corridor-stop',d:trips.map((trip,index)=>[base+index*3,'9','Town Centre','daily','',trip,patternId])};
    state.timetable={
      services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},
      tripPatterns:Object.fromEntries(trips.map(trip=>[trip,patternId])),
      patterns:{[patternId]:{p:[[51.95,-2.1],[52.1,-2.1],[52.25,-2.1],[52.4,-2.1],[52.54,-2.1],[52.62,-2.1]],s:[['route-start','Route start',51.95,-2.1],['corridor-stop','Corridor stop',52.54,-2.1],['route-end','Route end',52.62,-2.1]],g:1}}
    };
    state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun=Number(state.timetableRun||0)+1;
    state.lastRouteScan=0;state.routeScanBoxes=0;state.routeScanPatterns=0;state.routeScanVehicles=0;state.routeScanError='';
    try{
      const plans=api.routeScanPlans(now);
      const positions=[52.08,52.13,52.18,52.23,52.28];
      const accepted=trips.map((trip,index)=>{
        const vehicle={id:`CORRIDOR|journey|${trip}`,journey:trip,vehicleRef:'shared',line:'9',lineRef:'9',dest:'Town Centre',operator:'CORRIDOR',declaredDir:'',lat:positions[index],lon:-2.1,bearing:0,feedSpeed:8,ts:now,timestampKnown:true,corridorTracked:false};
        return plans.map(plan=>api.matchRouteScanVehicle(plan,vehicle)).find(Boolean)||null;
      }).filter(Boolean);
      const wrong={id:'wrong',journey:'wrong-trip',line:'9',dest:'Town Centre',lat:52.2,lon:-2.1,bearing:0,ts:now,corridorTracked:false};
      const passed={id:'passed',journey:trips[0],line:'9',dest:'Town Centre',lat:52.58,lon:-2.1,bearing:0,ts:now,corridorTracked:false};
      const wrongRejected=!plans.some(plan=>api.matchRouteScanVehicle(plan,wrong));
      const passedRejected=!plans.some(plan=>api.matchRouteScanVehicle(plan,passed));
      api.ingest(accepted);
      const rows=api.relevant();
      const spans=plans.map(plan=>{const b=plan.bbox.split(',').map(Number);return [b[2]-b[0],b[3]-b[1]];});
      return {
        boxes:plans.length,patterns:new Set(plans.flatMap(plan=>plan.matches.map(match=>match.pattern.id))).size,
        matches:plans[0]?.matches.length||0,accepted:accepted.length,stored:state.vehicles.size,shown:rows.length,
        shownIds:rows.map(row=>row.v.id).sort(),allTagged:rows.every(row=>row.v.corridorTracked),
        minStraight:Math.min(...rows.map(row=>row.metres)),maxRoute:Math.max(...rows.map(row=>row.routeMetres||0)),
        spansSafe:spans.every(([lon,lat])=>lon<=0.34001&&lat<=0.34001),wrongRejected,passedRejected
      };
    }finally{Object.assign(state,saved);}
  });
  assert.equal(corridorBoard.boxes,3);
  assert.equal(corridorBoard.patterns,1);
  assert.equal(corridorBoard.matches,5);
  assert.equal(corridorBoard.accepted,5);
  assert.equal(corridorBoard.stored,5);
  assert.equal(corridorBoard.shown,5);
  assert.deepEqual(corridorBoard.shownIds,[1,2,3,4,5].map(index=>`CORRIDOR|journey|corridor-trip-${index}`));
  assert.equal(corridorBoard.allTagged,true);
  assert.ok(corridorBoard.minStraight>18000);
  assert.ok(corridorBoard.maxRoute<=55000);
  assert.equal(corridorBoard.spansSafe,true);
  assert.equal(corridorBoard.wrongRejected,true);
  assert.equal(corridorBoard.passedRejected,true);

"""
browser_test = replace_once(browser_test, "  const wideFallback = await page.evaluate(async () => {", corridor_fixture + "  const wideFallback = await page.evaluate(async () => {", 'executed route corridor fixture')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.48 adds bounded timetable-guided route-corridor GPS discovery. The ordinary 9 km feed and periodic 18 km expansion remain unchanged. Once per minute, Kerbside may derive at most three additional 8 km boxes from ordered journeys due at the selected stop within three hours. A returned vehicle is retained only when its live journey uniquely matches one of those scheduled trips, its position lies close to that ordered pattern, and the selected stop remains ahead by no more than 55 km of route. Wrong journeys, conflicting branches and already-passed vehicles are rejected. The live diagnostics and each recovered departure identify route-scan results. WebKit builds five simultaneous long-route journeys 20–50 km upstream and verifies that all five remain separate stop-result rows while invalid vehicles are excluded.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.48 route-corridor GPS release')
