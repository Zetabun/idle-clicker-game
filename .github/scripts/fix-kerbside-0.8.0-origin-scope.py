#!/usr/bin/env python3
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text=read(path)
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:140]!r}')
    write(path,text.replace(old,new,1))


# ---------------------------------------------------------------------------
# Connection evidence is more precise when it is filtered to the known
# interchange instead of asking for a broad origin board. Preserve an explicit
# /to/{CRS} filter in the live-window adapter; only unfiltered calls should fall
# back to the journey's final destination.
live_window='kerbside-train-live-window.js'
replace_once(
    live_window,
    """  const originScoped=url.searchParams.get('kerbsideScope')==='origin';
  const selected=originScoped?null:journey().to;
  const to=originScoped?'':(stationCrs(selected)||info.to);
""",
    """  const selected=journey().to;
  const to=info.to||stationCrs(selected);
"""
)

# ---------------------------------------------------------------------------
# The overlay keeps the normal final-destination board for direct evidence, and
# adds one bounded, destination-filtered board for each interchange represented
# in the currently displayed connection options. This avoids unrelated origin
# services and avoids any private query/header protocol between fetch wrappers.
overlay='kerbside-train-live-overlay.js'
replace_once(
    overlay,
    "const state={crs:'',date:'',services:[],messages:[],index:null,updatedAt:0,status:'idle',error:'',seq:0,timer:null,includeConnections:false};",
    "const state={crs:'',date:'',services:[],messages:[],index:null,updatedAt:0,status:'idle',error:'',seq:0,timer:null,includeConnections:false,connectionTargets:[]};"
)
replace_once(
    overlay,
    """async function requestBoard(crs,signal,{originScoped=false}={}){
  const scope=originScoped?'&kerbsideScope=origin':'';
  const detailed=`${PROVIDER_BASE}/departures/${encodeURIComponent(crs)}/${DETAILED_ROWS}?expand=true${scope}`;
  try{
    const response=await fetch(detailed,{signal,headers:{Accept:'application/json'}});
    if(response&&response.ok)return response.json();
  }catch(error){if(signal&&signal.aborted)throw error;}
  /* Same fallback kerbside-trains.js uses: the detailed board caps at 9
     rows and some providers do not implement expand at all. A plain
     20-row board still carries times, platforms and cancellations. */
  const plain=`${PROVIDER_BASE}/departures/${encodeURIComponent(crs)}/${PLAIN_ROWS}${originScoped?'?kerbsideScope=origin':''}`;
  const response=await fetch(plain,{signal,headers:{Accept:'application/json'}});
  if(!response||!response.ok)throw new Error(`Departure board returned ${response?response.status:'no response'}`);
  return response.json();
}
""",
    """async function requestBoard(crs,signal,{target=''}={}){
  const to=String(target||'').trim().toUpperCase();
  const route=to?`/departures/${encodeURIComponent(crs)}/to/${encodeURIComponent(to)}`:`/departures/${encodeURIComponent(crs)}`;
  const detailed=`${PROVIDER_BASE}${route}/${DETAILED_ROWS}?expand=true`;
  try{
    const response=await fetch(detailed,{signal,headers:{Accept:'application/json'}});
    if(response&&response.ok)return response.json();
  }catch(error){if(signal&&signal.aborted)throw error;}
  /* Same fallback kerbside-trains.js uses: the detailed board caps at 9
     rows and some providers do not implement expand at all. A plain
     20-row board still carries times, platforms and cancellations. */
  const plain=`${PROVIDER_BASE}${route}/${PLAIN_ROWS}`;
  const response=await fetch(plain,{signal,headers:{Accept:'application/json'}});
  if(!response||!response.ok)throw new Error(`Departure board returned ${response?response.status:'no response'}`);
  return response.json();
}
"""
)
replace_once(
    overlay,
    "async function refresh({crs,date,force=false,includeConnections=state.includeConnections}={}){",
    "async function refresh({crs,date,force=false,connectionTargets=state.connectionTargets}={}){"
)
replace_once(
    overlay,
    """  const wantsConnections=!!includeConnections;
  const fresh=state.crs===code&&state.status==='ready'&&state.includeConnections===wantsConnections&&Date.now()-state.updatedAt<FRESH_MS;
  if(fresh&&!force)return true;
  const seq=++state.seq;
  state.crs=code;
  state.date=String(date);
  state.includeConnections=wantsConnections;
  state.status='loading';
  try{
    const primary=await requestBoard(code);
    const origin=wantsConnections?await requestBoard(code,undefined,{originScoped:true}):null;
    const json=mergeBoards(primary,origin);
""",
    """  const targets=[...new Set((Array.isArray(connectionTargets)?connectionTargets:[]).map(value=>String(value||'').trim().toUpperCase()).filter(value=>/^[A-Z0-9]{3}$/.test(value)&&value!==code))].slice(0,4);
  const targetKey=targets.join(',');
  const wantsConnections=targets.length>0;
  const fresh=state.crs===code&&state.status==='ready'&&state.connectionTargets.join(',')===targetKey&&Date.now()-state.updatedAt<FRESH_MS;
  if(fresh&&!force)return true;
  const seq=++state.seq;
  state.crs=code;
  state.date=String(date);
  state.includeConnections=wantsConnections;
  state.connectionTargets=targets;
  state.status='loading';
  try{
    const boards=await Promise.all([requestBoard(code),...targets.map(target=>requestBoard(code,undefined,{target}))]);
    const json=boards.slice(1).reduce((merged,board)=>mergeBoards(merged,board),boards[0]||{});
"""
)
replace_once(
    overlay,
    "state.crs='';state.date='';state.services=[];state.messages=[];state.index=null;state.updatedAt=0;state.status='idle';state.error='';state.includeConnections=false;",
    "state.crs='';state.date='';state.services=[];state.messages=[];state.index=null;state.updatedAt=0;state.status='idle';state.error='';state.includeConnections=false;state.connectionTargets=[];"
)
# Both forced refresh sites were patched by the augment script to carry the old
# boolean. Replace both together and fail if a future refactor changes the count.
text=read(overlay)
old="refresh({crs:state.crs,date:state.date,force:true,includeConnections:state.includeConnections});"
new="refresh({crs:state.crs,date:state.date,force:true,connectionTargets:state.connectionTargets});"
if text.count(old)!=2:
    raise SystemExit(f'{overlay}: expected two forced connection refresh calls, found {text.count(old)}')
write(overlay,text.replace(old,new))

# Timetable supplies the exact interchange CRS values represented by displayed
# connection options. Duplicates are removed before the overlay sees them.
timetable='kerbside-train-timetable.js'
replace_once(
    timetable,
    "const pending=overlay.refresh({crs:r.from.crs,date:r.date,includeConnections:state.services.some(service=>service&&service.journeyType==='connection')});",
    "const pending=overlay.refresh({crs:r.from.crs,date:r.date,connectionTargets:[...new Set(state.services.filter(service=>service&&service.journeyType==='connection').map(service=>service.interchange&&service.interchange.crs).filter(Boolean))]});"
)

# Browser mock: an explicit CNM filter returns the delayed first-leg train; GLO
# still returns no direct service. The assertion pins the exact provider request
# so a future fetch-wrapper regression cannot silently remove connection live data.
browser='kerbside-backend/tests/train-browser-core-regression.mjs'
replace_once(
    browser,
    "trainServices:crs==='BRI'?[liveService('reverse')]:filter==='BRI'?[liveService('direct')]:filter==='GLO'?[]:[liveService('connection'),liveService('direct')]",
    "trainServices:crs==='BRI'?[liveService('reverse')]:filter==='BRI'?[liveService('direct')]:filter==='CNM'?[liveService('connection')]:filter==='GLO'?[]:[liveService('connection'),liveService('direct')]"
)
replace_once(
    browser,
    "assert.ok(diagnostics.railRequests.some(value=>/^\\/departures\\/BHM\\/9\\?/.test(value)),'connection overlay should request an origin-scoped BHM board');",
    "assert.ok(diagnostics.railRequests.some(value=>/^\\/departures\\/BHM\\/to\\/CNM\\/9\\?/.test(value)),'connection overlay should request a BHM → CNM interchange board');"
)
replace_once(
    browser,
    "assert.equal(diagnostics.railRequests.some(value=>value.includes('kerbsideScope')),false,'private live-scope marker must be stripped before the provider request');",
    "assert.equal(diagnostics.railRequests.some(value=>value.includes('kerbsideScope')),false,'connection evidence must use normal provider URLs only');"
)

print('Replaced Kerbside 0.8.0 origin-scoped live board with precise interchange-filtered live boards.')
