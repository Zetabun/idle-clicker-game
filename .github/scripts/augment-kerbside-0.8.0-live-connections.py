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
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:140]!r}')
    write(path,text.replace(old,new,1))


# ---------------------------------------------------------------------------
# An origin-scoped live request is needed for the first leg of a connection.
# The existing fetch adapters intentionally rewrite unfiltered departure-board
# calls to the final destination, which is correct for direct journeys but
# would hide BHM -> CNM while planning BHM -> GLO. A private query marker tells
# both adapters not to add the final destination; it is stripped before the
# request leaves the browser.
planner='kerbside-journey-planner-ui.js'
replace_once(
    planner,
    """function routeAwarePath(url){
  let path=url.pathname;
  const match=decodeURIComponent(path).match(/^\\/departures\\/([A-Za-z0-9]{3})\\/(\\d+)\\/?$/i);
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  const destination=route&&route.state&&route.state.destination;
  if(match&&destination&&destination.crs&&destination.crs.toUpperCase()!==match[1].toUpperCase()){
    path=`/departures/${encodeURIComponent(match[1].toUpperCase())}/to/${encodeURIComponent(destination.crs.toUpperCase())}/${encodeURIComponent(match[2])}`;
  }
  return path+url.search;
}
""",
    """function routeAwarePath(url){
  let path=url.pathname;
  const match=decodeURIComponent(path).match(/^\\/departures\\/([A-Za-z0-9]{3})\\/(\\d+)\\/?$/i);
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  const destination=route&&route.state&&route.state.destination;
  const originScoped=url.searchParams.get('kerbsideScope')==='origin';
  if(match&&!originScoped&&destination&&destination.crs&&destination.crs.toUpperCase()!==match[1].toUpperCase()){
    path=`/departures/${encodeURIComponent(match[1].toUpperCase())}/to/${encodeURIComponent(destination.crs.toUpperCase())}/${encodeURIComponent(match[2])}`;
  }
  const params=new URLSearchParams(url.search);params.delete('kerbsideScope');
  const query=params.toString();
  return path+(query?`?${query}`:'');
}
"""
)

live_window='kerbside-train-live-window.js'
replace_once(
    live_window,
    """function officialBoardUrl(url){
  const info=departureRequest(url);
  if(!info)return null;
  const selected=journey().to;
  const to=stationCrs(selected)||info.to;
""",
    """function officialBoardUrl(url){
  const info=departureRequest(url);
  if(!info)return null;
  const originScoped=url.searchParams.get('kerbsideScope')==='origin';
  const selected=originScoped?null:journey().to;
  const to=originScoped?'':(stationCrs(selected)||info.to);
"""
)

# ---------------------------------------------------------------------------
# Keep the strong destination-filtered board for direct rows, then merge a
# second origin-scoped board only when one-change options are displayed.
overlay='kerbside-train-live-overlay.js'
replace_once(
    overlay,
    "const state={crs:'',date:'',services:[],messages:[],index:null,updatedAt:0,status:'idle',error:'',seq:0,timer:null};",
    "const state={crs:'',date:'',services:[],messages:[],index:null,updatedAt:0,status:'idle',error:'',seq:0,timer:null,includeConnections:false};"
)
replace_once(
    overlay,
    """async function requestBoard(crs,signal){
  const detailed=`${PROVIDER_BASE}/departures/${encodeURIComponent(crs)}/${DETAILED_ROWS}?expand=true`;
  try{
    const response=await fetch(detailed,{signal,headers:{Accept:'application/json'}});
    if(response&&response.ok)return response.json();
  }catch(error){if(signal&&signal.aborted)throw error;}
  /* Same fallback kerbside-trains.js uses: the detailed board caps at 9
     rows and some providers do not implement expand at all. A plain
     20-row board still carries times, platforms and cancellations. */
  const plain=await fetch(`${PROVIDER_BASE}/departures/${encodeURIComponent(crs)}/${PLAIN_ROWS}`,{signal,headers:{Accept:'application/json'}});
  if(!plain||!plain.ok)throw new Error(`Departure board returned ${plain?plain.status:'no response'}`);
  return plain.json();
}

async function refresh({crs,date,force=false}={}){
""",
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
function serviceIdentity(service){return ridOf(service)||uidOf(service)||(headcodeOf(service)&&departureOf(service)?`${headcodeOf(service)}|${departureOf(service)}`:'')||`${departureOf(service)}|${operatorOf(service)}|${destinationCrsOf(service)}`;}
function mergeBoards(primary,origin){
  const services=[],seen=new Set();
  for(const board of [primary,origin])for(const service of (board&&Array.isArray(board.trainServices)?board.trainServices:[])){
    const key=serviceIdentity(service);if(key&&seen.has(key))continue;if(key)seen.add(key);services.push(service);
  }
  const messages=[];for(const board of [primary,origin])for(const message of (board&&Array.isArray(board.nrccMessages)?board.nrccMessages:[])){
    const key=JSON.stringify(message);if(!messages.some(item=>JSON.stringify(item)===key))messages.push(message);
  }
  return {...(primary||origin||{}),trainServices:services,nrccMessages:messages};
}

async function refresh({crs,date,force=false,includeConnections=state.includeConnections}={}){
"""
)
replace_once(
    overlay,
    """  const fresh=state.crs===code&&state.status==='ready'&&Date.now()-state.updatedAt<FRESH_MS;
  if(fresh&&!force)return true;
  const seq=++state.seq;
  state.crs=code;
  state.date=String(date);
  state.status='loading';
  try{
    const json=await requestBoard(code);
""",
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
"""
)
replace_once(
    overlay,
    "state.crs='';state.date='';state.services=[];state.messages=[];state.index=null;state.updatedAt=0;state.status='idle';state.error='';",
    "state.crs='';state.date='';state.services=[];state.messages=[];state.index=null;state.updatedAt=0;state.status='idle';state.error='';state.includeConnections=false;"
)
replace_once(
    overlay,
    "refresh({crs:state.crs,date:state.date,force:true});",
    "refresh({crs:state.crs,date:state.date,force:true,includeConnections:state.includeConnections});"
)
# visibilitychange contains the same call; replace the remaining copy.
replace_once(
    overlay,
    "refresh({crs:state.crs,date:state.date,force:true});",
    "refresh({crs:state.crs,date:state.date,force:true,includeConnections:state.includeConnections});"
)
replace_once(
    overlay,
    "  flattenCallingPoints,buildIndex,matchEntry,isToday\n};",
    "  flattenCallingPoints,buildIndex,matchEntry,mergeBoards,isToday\n};"
)

# Timetable decides when the extra origin view is worth the second live call.
timetable='kerbside-train-timetable.js'
replace_once(
    timetable,
    "  overlay.refresh({crs:r.from.crs,date:r.date});\n",
    "  const pending=overlay.refresh({crs:r.from.crs,date:r.date,includeConnections:state.services.some(service=>service&&service.journeyType==='connection')});\n  /* A route sync can repaint scheduled rows while the matching live board is\n     still fresh. refresh() deliberately does not emit another event on a\n     cache hit, so re-apply the cached evidence after every successful call. */\n  Promise.resolve(pending).then(ok=>{if(ok)handleOverlay();}).catch(()=>{});\n"
)

# Load the following calendar date as well when available. This lets a 23:xx
# first leg connect to an after-midnight second train without changing the
# selected journey date or admitting next-day departures from the origin.
replace_once(
    timetable,
    """    const [locations,rows]=await Promise.all([loadLocations(),loadDate(date)]);
    return journeysFromRows(rows,locations,manifest,{from,to,date,departAfter});
""",
    """    const nextDate=addDays(date,1),dates=[date,...(manifest.dates.includes(nextDate)?[nextDate]:[])];
    const [locations,...sets]=await Promise.all([loadLocations(),...dates.map(loadDate)]);
    const rows=[],seen=new Set();for(const set of sets)for(const row of (Array.isArray(set)?set:[])){const key=rowIdentity(row);if(key&&seen.has(key))continue;if(key)seen.add(key);rows.push(row);}
    return journeysFromRows(rows,locations,manifest,{from,to,date,departAfter});
"""
)

# ---------------------------------------------------------------------------
# Browser regression gets a realistic origin-only connection train. The mock
# returns it only to the unfiltered origin request, so the test would fail if
# either fetch adapter accidentally reapplied the final GLO destination.
browser='kerbside-backend/tests/train-browser-core-regression.mjs'
replace_once(
    browser,
    """const liveBoard=(crs)=>({
  generatedAt:new Date().toISOString(),locationName:crs==='BRI'?'Bristol Temple Meads':'Birmingham New Street',crs,nrccMessages:[],
  trainServices:crs==='BRI'?[{
    origin:[{locationName:'Bristol Temple Meads',crs:'BRI'}],destination:[{locationName:'Birmingham New Street',crs:'BHM'}],
    serviceIdUrlSafe:'live-reverse',std:'10:50',etd:'On time',platform:'3',operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
  }]:[{
    origin:[{locationName:'Birmingham New Street',crs:'BHM'}],destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
    serviceIdUrlSafe:'live-forward',std:'10:42',etd:'On time',platform:'7',operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
  }]
});
""",
    """const liveService=(kind)=>kind==='connection'?{
  origin:[{locationName:'Birmingham New Street',crs:'BHM'}],destination:[{locationName:'Cheltenham Spa',crs:'CNM'}],
  serviceIdGuid:`rid-change-a-${TODAY}`,uid:`uid-change-a-${TODAY}`,trainid:'1C10',serviceIdUrlSafe:'live-change-a',
  std:'10:05',etd:'10:12',platform:'8',operator:'CrossCountry',operatorCode:'XC',length:4,isCancelled:false,
  subsequentCallingPoints:[{callingPoint:[{locationName:'Cheltenham Spa',crs:'CNM',st:'10:45',et:'10:53',isCancelled:false}]}]
}:kind==='direct'?{
  origin:[{locationName:'Birmingham New Street',crs:'BHM'}],destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
  serviceIdGuid:`rid-forward-${TODAY}`,uid:`uid-forward-${TODAY}`,trainid:'1A01',serviceIdUrlSafe:'live-forward',
  std:'10:42',etd:'On time',platform:'7',operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
}:{
  origin:[{locationName:'Bristol Temple Meads',crs:'BRI'}],destination:[{locationName:'Birmingham New Street',crs:'BHM'}],
  serviceIdGuid:`rid-reverse-${TODAY}`,uid:`uid-reverse-${TODAY}`,trainid:'1A02',serviceIdUrlSafe:'live-reverse',
  std:'10:50',etd:'On time',platform:'3',operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
};
const liveBoard=(crs,filter='')=>({
  generatedAt:new Date().toISOString(),locationName:crs==='BRI'?'Bristol Temple Meads':'Birmingham New Street',crs,nrccMessages:[],
  trainServices:crs==='BRI'?[liveService('reverse')]:filter==='BRI'?[liveService('direct')]:filter==='GLO'?[]:[liveService('connection'),liveService('direct')]
});
"""
)
replace_once(
    browser,
    """    const match=pathname.match(/^\\/departures\\/([A-Z0-9]{3})(?:\\/to\\/[A-Z0-9]{3})?\\/\\d+$/i);
    if(match){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(liveBoard(match[1].toUpperCase()))});return;}
""",
    """    const match=pathname.match(/^\\/departures\\/([A-Z0-9]{3})(?:\\/to\\/([A-Z0-9]{3}))?\\/\\d+$/i);
    if(match){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(liveBoard(match[1].toUpperCase(),String(match[2]||'').toUpperCase()))});return;}
"""
)
replace_once(
    browser,
    """  assert.match(await connection.textContent(),/15m change/);
  await connection.locator('[data-scheduled-toggle]').click();
""",
    """  await page.waitForFunction(()=>/Connection at risk/.test(document.querySelector('#trainScheduledBoard .train-connection-service')?.textContent||''));
  assert.match(await connection.textContent(),/Connection at risk/);
  assert.match(await connection.textContent(),/live 7m change/);
  assert.ok(diagnostics.railRequests.some(value=>/^\\/departures\\/BHM\\/9\\?/.test(value)),'connection overlay should request an origin-scoped BHM board');
  assert.equal(diagnostics.railRequests.some(value=>value.includes('kerbsideScope')),false,'private live-scope marker must be stripped before the provider request');
  await connection.locator('[data-scheduled-toggle]').click();
"""
)
replace_once(
    browser,
    """  assert.match(await connectionDetail.textContent(),/10 min minimum/);
  assert.doesNotMatch(await connectionDetail.textContent(),/10:52/);
""",
    """  assert.match(await connectionDetail.textContent(),/10 min minimum/);
  assert.match(await connectionDetail.textContent(),/below Kerbside's 10-minute planning buffer/);
  assert.doesNotMatch(await connectionDetail.textContent(),/10:52/);
"""
)

print('Augmented Kerbside 0.8.0 with origin-scoped live evidence, cached re-merge and overnight connection support.')
