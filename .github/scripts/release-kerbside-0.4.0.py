#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import tempfile

PATH = Path('bus.html')
text = PATH.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)


def sub_once(pattern: str, replacement: str, label: str, flags: int = re.S) -> None:
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')


replace_once(
    "const APP_VERSION = '0.3.0';",
    "const APP_VERSION = '0.4.0';",
    'version bump',
)

replace_once(
    ".rsrc{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-dim);margin-top:7px}\n",
    ".rsrc{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-dim);margin-top:7px}\n"
    ".dep.schedule-only{grid-template-columns:46px minmax(0,1fr) 64px;cursor:default;opacity:.82}\n"
    ".dep.schedule-only:hover{background:transparent}\n"
    ".dep.schedule-only .route{background:var(--ink-3);color:var(--led);border:1px solid var(--led-dim)}\n"
    ".eta.scheduled{color:var(--text-dim);text-shadow:none}\n"
    ".eta.scheduled small{color:var(--text-dim);opacity:.7}\n"
    ".chip.timing{border-color:rgba(63,217,164,.35);color:#A9EED7}\n"
    ".chip.schedule-source{border-color:var(--rule);color:var(--text-dim)}\n",
    'scheduled-row styles',
)

replace_once(
    "  stops:[], stop:null, pendingStopId:null, loadingRoutes:false, filterFellBack:false,\n",
    "  stops:[], stop:null, pendingStopId:null, loadingRoutes:false, filterFellBack:false, manualStop:false,\n",
    'manual stop state',
)
replace_once(
    "  timer:null, tick:null, busy:false, lastOk:0,\n",
    "  timer:null, tick:null, busy:false, pollAgain:false, lastOk:0, lastFeedAt:0,\n",
    'poll queue state',
)

replace_once(
    "  S.stop=null; S.ttStop=null; S.destFilter=null; S.stops=[]; S.vehicles.clear(); clearVehicleMarkers();\n",
    "  S.stop=null; S.ttStop=null; S.manualStop=false; S.destFilter=null; S.stops=[]; S.vehicles.clear(); clearVehicleMarkers();\n",
    'reset manual stop state',
)
replace_once(
    "  await Promise.all([findAnchor(lat,lon,run), findStops(lat,lon,run)]);\n"
    "  if(run===S.locationRun) startPolling();",
    "  const anchorPromise=findAnchor(lat,lon,run);\n"
    "  await findStops(lat,lon,run);\n"
    "  if(run===S.locationRun) startPolling();\n"
    "  await anchorPromise;",
    'start polling as soon as stops are ready',
)

sub_once(
    r"S\.stops = \(j\.elements\|\|\[\]\)\.map\(el=>\(\{\n"
    r"\s+id:el\.id,\n"
    r"\s+name: titleCase\(el\.tags\.name \|\| el\.tags\['naptan:CommonName'\] \|\| 'Unnamed stop'\),\n"
    r"\s+code: el\.tags\['naptan:AtcoCode'\] \|\| el\.tags\['naptan:Indicator'\] \|\| el\.tags\.ref \|\| '',\n"
    r"\s+ind: el\.tags\['naptan:Indicator'\] \|\| el\.tags\.local_ref \|\| '',\n"
    r"\s+lat:el\.lat, lon:el\.lon,\n"
    r"\s+d: dist\(lat,lon,el\.lat,el\.lon\)\n"
    r"\s+\}\)\)\.filter",
    "S.stops = (j.elements||[]).map(el=>{\n"
    "      const tags=el.tags||{};\n"
    "      const atco=tags['naptan:AtcoCode']||'';\n"
    "      const naptan=tags['naptan:NaptanCode']||tags['naptan:SmsCode']||'';\n"
    "      return {\n"
    "        id:el.id,\n"
    "        name:titleCase(tags.name||tags['naptan:CommonName']||'Unnamed stop'),\n"
    "        atco,naptan, code:atco||naptan||tags.ref||'',\n"
    "        ind:tags['naptan:Indicator']||tags.local_ref||'',\n"
    "        lat:el.lat, lon:el.lon, d:dist(lat,lon,el.lat,el.lon)\n"
    "      };\n"
    "    }).filter",
    'retain authoritative stop identifiers',
)
replace_once(
    "    m.on('click',()=>selectStop(s));",
    "    m.on('click',()=>selectStop(s,true));",
    'manual map stop selection',
)

sub_once(
    r"async function loadTimetable\(\)\{.*?\n\}\nfunction matchTimetableStop\(stop\)\{.*?\n\}\nfunction timetableRows",
    "async function loadTimetable(){\n"
    "  S.ttError=null;\n"
    "  try{\n"
    "    const r=await fetchTimed('timetable.json',{cache:'no-cache'},12000);\n"
    "    if(!r.ok) throw new Error(r.status===404?'not installed':'HTTP '+r.status);\n"
    "    const raw=await r.text();\n"
    "    if(!raw.trim()) throw new Error('empty timetable file');\n"
    "    const data=JSON.parse(raw);\n"
    "    if(!data || !data.stops || typeof data.stops!=='object' || !Object.keys(data.stops).length) throw new Error('no stop data');\n"
    "    S.timetable=data; PATTERN_CACHE.clear();\n"
    "  }catch(e){\n"
    "    S.timetable=null; S.ttStop=null;\n"
    "    S.ttError=(e&&e.name==='AbortError')?'timed out':String((e&&e.message)||'could not be read');\n"
    "  }\n"
    "  if(S.stop){\n"
    "    S.ttStop=matchTimetableStop(S.stop);\n"
    "    updateStopMeta(); renderServingNote(); renderDests(); render();\n"
    "  }\n"
    "}\n"
    "function looksLikeAtco(value){ return /^\\d{3}0[A-Za-z0-9]{4,8}$/.test(String(value||'').trim()); }\n"
    "function matchTimetableStop(stop){\n"
    "  if(!S.timetable || !stop) return null;\n"
    "  const entries=Object.entries(S.timetable.stops);\n"
    "  const codes=[stop.atco,stop.naptan,looksLikeAtco(stop.code)?stop.code:'']\n"
    "    .map(v=>String(v||'').trim().toLowerCase()).filter(Boolean);\n"
    "  if(codes.length){\n"
    "    for(const [id,t] of entries){\n"
    "      const candidates=[id,t&&t.c,t&&t.sms].map(v=>String(v||'').trim().toLowerCase());\n"
    "      if(codes.some(code=>candidates.includes(code))) return {id,...t,match:'code'};\n"
    "    }\n"
    "  }\n"
    "  const strict=!!S.manualStop, maxDistance=strict?60:140;\n"
    "  let best=null, bestScore=-Infinity;\n"
    "  for(const [id,t] of entries){\n"
    "    if(!Array.isArray(t.ll)) continue;\n"
    "    const d=dist(stop.lat,stop.lon,Number(t.ll[0]),Number(t.ll[1]));\n"
    "    if(d>maxDistance) continue;\n"
    "    const sim=nameSimilarity(stop.name,t.n||'');\n"
    "    if(strict && sim<.45) continue;\n"
    "    const score=sim*120-d;\n"
    "    if(score>bestScore){ bestScore=score; best={id,...t,match:'nearby',distance:d,similarity:sim}; }\n"
    "  }\n"
    "  if(strict) return best && best.distance<=60 && best.similarity>=.45 ? best : null;\n"
    "  return best && (bestScore>-45 || best.distance<45) ? best : null;\n"
    "}\n"
    "function timetableRows",
    'robust timetable loading and strict stop matching',
)

sub_once(
    r"function selectStop\(s\)\{.*?\n\}\n\n/\* stop picker \*/",
    "function updateStopMeta(){\n"
    "  if(!S.stop) return;\n"
    "  const s=S.stop, displayCode=s.atco||s.naptan||s.code||'';\n"
    "  const code=displayCode?' · '+esc(displayCode):'';\n"
    "  let tt=' · checking timetable';\n"
    "  if(S.ttStop) tt=S.ttStop.match==='code'?' · exact timetable stop':' · nearby timetable match';\n"
    "  else if(S.timetable) tt=' · live only';\n"
    "  else if(S.ttError) tt=' · timetable unavailable';\n"
    "  $('stopMeta').innerHTML='<b>'+fmtDist(s.d)+'</b> from your point'+code+tt;\n"
    "}\n"
    "function selectStop(s,manual){\n"
    "  if(!s) return;\n"
    "  const changed=!S.stop || String(S.stop.id)!==String(s.id);\n"
    "  S.stop=s;\n"
    "  if(changed){ S.destFilter=null; S.selected=null; S.manualStop=manual===true; }\n"
    "  else if(manual===true) S.manualStop=true;\n"
    "  S.ttStop=matchTimetableStop(s);\n"
    "  $('stopName').textContent=s.name+(s.ind?' ('+s.ind+')':'');\n"
    "  updateStopMeta();\n"
    "  drawStops(); closePicker(); renderWalk(); renderDests(); renderPair(); renderServingNote();\n"
    "  if(!MAPPED[String(s.id)]){\n"
    "    S.loadingRoutes=true; renderServingNote();\n"
    "    fetchRoutesFor(s).then(()=>{\n"
    "      S.loadingRoutes=false;\n"
    "      if(S.stop && S.stop.id===s.id){ renderServingNote(); render(); }\n"
    "    });\n"
    "  }\n"
    "  loadWorkerHistory(s);\n"
    "  savePrefs(); render();\n"
    "  if(changed && S.timer){\n"
    "    setStatus('Refreshing selected stop','');\n"
    "    poll(true);\n"
    "  }\n"
    "}\n\n"
    "/* stop picker */",
    'stop selection refresh and status',
)
replace_once(
    "  [...box.children].forEach(b=>b.addEventListener('click',()=>selectStop(S.stops[+b.dataset.i])));",
    "  [...box.children].forEach(b=>b.addEventListener('click',()=>selectStop(S.stops[+b.dataset.i],true)));",
    'manual stop picker selection',
)
replace_once(
    "  return timetableRouteSet().size>0 || !!mappedRefs(true) || knownRouteCount()>0;",
    "  return !!S.ttStop || timetableRouteSet().size>0 || !!mappedRefs(true) || knownRouteCount()>0;",
    'authoritative timetable gating',
)
replace_once(
    "  if(!out.length && gated){\n"
    "    out=collect(false);\n"
    "    S.filterFellBack=out.length>0;\n"
    "  }",
    "  // A matched timetable stop is authoritative. Never replace an empty,\n"
    "  // verified board with nearby buses that may belong to an adjacent stop.\n"
    "  if(!out.length && gated && !S.ttStop){\n"
    "    out=collect(false);\n"
    "    S.filterFellBack=out.length>0;\n"
    "  }",
    'disable geographic fallback for timetable stops',
)

replace_once(
    "  }else{\n"
    "    el.innerHTML='<b>No verified route list is available yet.</b> Kerbside will show only buses close to the stop and moving towards it. Add timetable.json for much stronger route and branch matching.';\n"
    "  }\n"
    "}\nfunction relevant(){",
    "  }else if(S.timetable){\n"
    "    el.innerHTML='<b>This selected stop is outside the installed timetable pack.</b> Live GPS remains available, but scheduled departures and exact journey verification are unavailable here.';\n"
    "  }else if(S.ttError){\n"
    "    el.innerHTML='<b>Timetable unavailable.</b> '+esc(S.ttError)+'. Live GPS remains available while Kerbside retries on the next page load.';\n"
    "  }else{\n"
    "    el.innerHTML='<b>No verified route list is available yet.</b> Kerbside will show only buses close to the stop and moving towards it.';\n"
    "  }\n"
    "}\nfunction relevant(){",
    'clear timetable coverage status',
)

replace_once(
    "function showEmpty(html){\n",
    "function scheduleKey(r){\n"
    "  const trip=String((r&&r.trip)||'').trim();\n"
    "  return trip ? 'trip|'+trip+'|'+r.at : [r&&r.at,r&&r.line,normName(r&&r.head)].join('|');\n"
    "}\n"
    "function scheduledBoardRows(liveRows){\n"
    "  if(!S.ttStop) return [];\n"
    "  const now=Date.now(), end=now+3*3600000, claimed=new Set(), seen=new Set();\n"
    "  liveRows.forEach(r=>{ if(r.schedule) claimed.add(scheduleKey(r.schedule)); });\n"
    "  return timetableRows(new Date(now)).filter(r=>{\n"
    "    if(r.at<now-60000 || r.at>end) return false;\n"
    "    if(S.destFilter && r.head && destinationSimilarity(r.head,S.destFilter)<.75) return false;\n"
    "    const key=scheduleKey(r);\n"
    "    if(claimed.has(key) || seen.has(key)) return false;\n"
    "    seen.add(key); return true;\n"
    "  }).sort((a,b)=>a.at-b.at).slice(0,36)\n"
    "    .map(schedule=>({kind:'scheduled',schedule,secs:Math.max(0,(schedule.at-now)/1000)}));\n"
    "}\n"
    "function liveTimingLabel(r){\n"
    "  if(!r.schedule) return '';\n"
    "  const diff=Math.round(((Date.now()+r.secs*1000)-r.schedule.at)/60000);\n"
    "  if(Math.abs(diff)<=1) return 'on schedule';\n"
    "  return diff>0?diff+' min late':Math.abs(diff)+' min early';\n"
    "}\n"
    "function renderScheduledRow(r){\n"
    "  const s=r.schedule, mins=Math.max(0,Math.round(r.secs/60)), due=mins<=1;\n"
    "  return '<div class=\"dep schedule-only\" aria-label=\"Scheduled '+esc(s.line)+' to '+esc(s.head||'destination unknown')+'\">'\n"
    "    +'<span class=\"route\">'+esc(s.line)+'</span>'\n"
    "    +'<span style=\"min-width:0\"><span class=\"dest\">'+esc(s.head||'Destination unknown')+'</span><span class=\"deprow2\">'\n"
    "    +'<span class=\"chip schedule-source\">scheduled</span><span class=\"chip\">'+esc(formatClock(s.at))+'</span></span></span>'\n"
    "    +'<span class=\"eta scheduled\">'+(due?'due':mins)+'<small>'+(due?'scheduled':'sched min')+'</small></span></div>';\n"
    "}\n\n"
    "function showEmpty(html){\n",
    'scheduled departure helpers',
)

replace_once(
    "function render(){\n  const rows=relevant(), deps=$('deps');",
    "function render(){\n"
    "  const liveRows=relevant(), scheduledRows=scheduledBoardRows(liveRows);\n"
    "  const rows=[...liveRows.map(r=>({...r,kind:'live'})),...scheduledRows].sort((a,b)=>a.secs-b.secs);\n"
    "  const deps=$('deps');",
    'merge live and scheduled rows',
)
replace_once(
    "    deps.innerHTML=rows.map(r=>{\n      const mins=Math.max(0,Math.round(r.secs/60));",
    "    deps.innerHTML=rows.map(r=>{\n"
    "      if(r.kind==='scheduled') return renderScheduledRow(r);\n"
    "      const mins=Math.max(0,Math.round(r.secs/60));",
    'render scheduled rows',
)
replace_once(
    "+'<span class=\"chip conf-'+r.confidence+'\">'+confLabel+'</span>'+(tight?'<span class=\"chip tight\">Tight</span>':'')\n",
    "+'<span class=\"chip conf-'+r.confidence+'\">'+confLabel+'</span>'\n"
    "+(r.schedule?'<span class=\"chip timing\">'+esc(liveTimingLabel(r))+'</span>':'')\n"
    "+(tight?'<span class=\"chip tight\">Tight</span>':'')\n",
    'live schedule status chip',
)
replace_once(
    "    [...deps.querySelectorAll('.dep')].forEach(b=>b.addEventListener('click',()=>focusVehicle(b.dataset.id)));",
    "    [...deps.querySelectorAll('.dep[data-id]')].forEach(b=>b.addEventListener('click',()=>focusVehicle(b.dataset.id)));",
    'only live rows are interactive',
)
replace_once(
    "      const row=rows.find(r=>String(r.v.id)===String(b.dataset.bell));",
    "      const row=liveRows.find(r=>String(r.v.id)===String(b.dataset.bell));",
    'alarm lookup uses live rows',
)
replace_once("    checkAlarms(rows);", "    checkAlarms(liveRows);", 'alarms use live rows')
replace_once("  renderVehicles(rows); renderServingNote();", "  renderVehicles(liveRows); renderServingNote();", 'map uses live rows')

replace_once(
    "function startPolling(){\n"
    "  stopPolling();\n"
    "  document.documentElement.style.setProperty('--glide',Math.max(1.5,S.interval*.8)+'s');\n"
    "  S.vehicles.clear(); clearVehicleMarkers(); poll();",
    "function startPolling(){\n"
    "  stopPolling();\n"
    "  document.documentElement.style.setProperty('--glide',Math.max(1.5,S.interval*.8)+'s');\n"
    "  S.vehicles.clear(); clearVehicleMarkers(); poll(true);",
    'force initial live poll',
)
sub_once(
    r"async function poll\(\)\{.*?\n\}\ndocument\.addEventListener\('visibilitychange'",
    "async function poll(force){\n"
    "  if(!S.origin) return;\n"
    "  if(S.busy){ if(force) S.pollAgain=true; return; }\n"
    "  S.busy=true;\n"
    "  const ctl=new AbortController(); S.pollAbort=ctl;\n"
    "  const dt=Math.min(90,(Date.now()-lastPoll)/1000)||S.interval; lastPoll=Date.now();\n"
    "  try{\n"
    "    const list=S.demo?fetchSim(dt):await fetchLive(ctl.signal);\n"
    "    ingest(list); learnDests(); learnServing(); S.lastOk=Date.now(); S.lastFeedAt=Date.now();\n"
    "    const hidden=!S.demo&&S.feedStale?' · '+S.feedStale+' stale hidden':'';\n"
    "    const tt=S.ttStop?' · timetable checked':'';\n"
    "    const updated=' · updated '+formatClock(S.lastFeedAt);\n"
    "    setStatus(S.demo?'Simulated · '+S.vehicles.size+' buses':'Live · '+S.vehicles.size+' fresh'+hidden+tt+updated,S.demo?'demo':'');\n"
    "    render();\n"
    "  }catch(e){\n"
    "    if(!ctl.signal.aborted){\n"
    "      const msg=e&&e.msg?e.msg:'The live feed could not be reached.';\n"
    "      setStatus('Feed problem','err');\n"
    "      if(Date.now()-S.lastOk>25000) toast(msg,true);\n"
    "      render();\n"
    "    }\n"
    "  }finally{\n"
    "    if(S.pollAbort===ctl) S.pollAbort=null;\n"
    "    S.busy=false;\n"
    "    if(S.pollAgain){ S.pollAgain=false; setTimeout(()=>poll(false),0); }\n"
    "  }\n"
    "}\n"
    "document.addEventListener('visibilitychange'",
    'queued immediate polling',
)
replace_once(
    "$('refreshBtn').addEventListener('click',()=>{ poll(); toast('Refreshing…'); });",
    "$('refreshBtn').addEventListener('click',()=>{ poll(true); toast('Refreshing…'); });",
    'manual refresh queues poll',
)
replace_once(
    "  if(S.pair) selectStop(S.pair);",
    "  if(S.pair) selectStop(S.pair,true);",
    'opposite stop is manual selection',
)

PATH.write_text(text, encoding='utf-8')

required = [
    "const APP_VERSION = '0.4.0';",
    'scheduledBoardRows(liveRows)',
    "if(!out.length && gated && !S.ttStop){",
    "poll(true);",
    "exact timetable stop",
    "outside the installed timetable pack",
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'missing expected marker after patch: {marker}')

scripts = re.findall(r'<script(?![^>]*\\bsrc=)[^>]*>(.*?)</script>', text, flags=re.I | re.S)
if not scripts:
    raise SystemExit('no inline scripts found for syntax validation')

with tempfile.TemporaryDirectory() as tmp:
    for index, script in enumerate(scripts, start=1):
        filename = Path(tmp) / f'inline-{index}.js'
        filename.write_text(script, encoding='utf-8')
        subprocess.run(['node', '--check', str(filename)], check=True)

subprocess.run(['git', 'diff', '--check', '--', str(PATH)], check=True)
print('Kerbside 0.4.0 patch applied and inline JavaScript validated.')
