(function(){
'use strict';

const $=id=>document.getElementById(id);
const DATA_BASE='kerbside-rail-timetable';
const MAX_RESULTS=24;
const CONNECTION_MAX_WAIT=75;
const CONNECTION_MAX_TOTAL=360;
const CONNECTION_FIRST_LEGS=48;
const CONNECTION_SECOND_CHOICES=6;
const CONNECTION_COMFORT_MARGIN=8;
const CONNECTION_LONG_WAIT=40;
const CONNECTION_DETOUR_REJECT_EXCESS=12;
const CONNECTION_RECOVERY_WINDOW=120;
const CONNECTION_RECOVERY_CHOICES=3;
/* The compact Darwin snapshot does not carry the official National Rail
   minimum-connection-time dataset. These are deliberately conservative
   Kerbside planning buffers: 10 minutes generally, 12 at the largest or
   more complex hubs. Cross-station transfers are never invented. */
const CONNECTION_HUB_MINUTES={
  BHM:15,MAN:15,LDS:15,EDB:15,GLC:15,EUS:15,KGX:15,STP:15,PAD:15,WAT:15,VIC:15,LBG:15,LST:15,CLJ:15,
  GLQ:12,NCL:12,YRK:12,SHF:12,RDG:12,BRI:12,CDF:12,CHX:12,MYB:12
};
const MANIFEST_CACHE_MS=5*60*1000;
const TIMETABLE_REQUEST_TIMEOUT_MS=12000;
const EDGE_MANIFEST_RECHECK_MS=2*60*1000;
const WATCH_STORE_KEY='kerbside.rail.journey-watch.v1';
const state={loading:false,request:0,services:[],signature:'',mode:'live',manifest:null,lastError:'',sourceDate:'',openId:'',edgeRefreshAt:0,watch:null};
const dataState={manifestPromise:null,manifestCheckedAt:0,locationsPromise:null,datePromises:new Map()};

function dateApi(){return window.__KERBSIDE_TRAIN_DATE__||null;}
function selectedDate(){return dateApi()&&dateApi().state&&dateApi().state.date||'';}
function railNowTime(){
  const live=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;if(live&&typeof live.currentRailTime==='function')return live.currentRailTime();
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));let hour=Number(map.hour)||0;if(hour===24)hour=0;return `${String(hour).padStart(2,'0')}:${String(Number(map.minute)||0).padStart(2,'0')}`;
}
function effectiveDepartAfter(value=$('trainDepartAfter')?.value||'00:00'){
  const selected=String(value||'00:00'),api=dateApi();if(!api||typeof api.isToday!=='function'||!api.isToday())return selected;
  const now=railNowTime(),selectedMinute=parseMinutes(selected),nowMinute=parseMinutes(now);return selectedMinute!=null&&nowMinute!=null&&selectedMinute>=nowMinute?selected:now;
}
function currentTime(){return effectiveDepartAfter();}
function liveWindowInfo(){const live=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;return live&&typeof live.liveWindowFor==='function'?live.liveWindowFor(currentTime()):null;}
function liveWindowPhase(){const api=dateApi();if(!api||typeof api.isToday!=='function'||!api.isToday())return'advance';const info=liveWindowInfo();if(!info)return'pending';return info.mode==='planning'?'scheduled-only':'live-eligible';}
function liveOverlayEligible(){return liveWindowPhase()==='live-eligible';}
function overlayMatchesRoute(overlay){const r=route(),s=overlay&&overlay.state;return !!(s&&r.from&&String(s.crs||'').toUpperCase()===String(r.from.crs||'').toUpperCase()&&String(s.date||'')===String(r.date||''));}
function route(){const api=window.__KERBSIDE_TRAINS__,r=window.__KERBSIDE_TRAIN_ROUTES__;return {from:api&&api.state&&api.state.station,to:r&&r.state&&r.state.destination,date:selectedDate(),departAfter:currentTime()};}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function displayName(station,fallback){return station&&(station.name||station.locationName||station.crs)||fallback;}
function dateLabel(value,{short=false}={}){const d=value?new Date(`${value}T12:00:00`):null;if(!d||Number.isNaN(d.getTime()))return value||'Selected date';return d.toLocaleDateString('en-GB',short?{weekday:'short',day:'numeric',month:'short'}:{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
function parseMinutes(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;const h=Number(m[1]),n=Number(m[2]);return h>=0&&h<24&&n>=0&&n<60?h*60+n:null;}
function addDays(stamp,days){const d=new Date(`${stamp}T12:00:00Z`);if(Number.isNaN(d.getTime()))return stamp;d.setUTCDate(d.getUTCDate()+Number(days||0));return d.toISOString().slice(0,10);}
function timetableIdLabel(id){const m=String(id||'').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);if(!m)return'';const d=new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`);return Number.isNaN(d.getTime())?'':d.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
/* ------------------------------------------------------------------
   Mode.

   This used to be planningMode(): the timetable only took over when the
   live Darwin window could not answer, so the board swapped source - and
   shrank from 24 rows to Darwin's 9-row detailed cap - at exactly the
   moment the user was closest to travelling.

   The snapshot is now the spine for any journey it covers, today
   included, and kerbside-train-live-overlay.js decorates today's rows
   with Darwin evidence. Two honest cases remain for the live departure
   board in kerbside-trains.js:

     - no destination chosen, so there is no journey to search;
     - the snapshot does not cover the requested date, which for today
       means the published snapshot has gone stale.

   Both fall back to live rather than showing nothing.
------------------------------------------------------------------ */
function snapshotCovers(date){const m=state.manifest;return !!(m&&Array.isArray(m.dates)&&m.dates.includes(date));}
function journeyMode(){
  const r=route();
  if(!r.from||!r.to||!r.date||!dateApi())return'';
  /* Claim the journey board before the manifest has loaded for both today
     and future dates. load() is what fetches that manifest, so refusing to
     claim today's board here creates a bootstrap loop where today's timetable
     can never prove that it has coverage. A stale same-day snapshot still
     falls back to the live board after load() checks the manifest. */
  if(!state.manifest)return dateApi().isToday()?'today':'advance';
  if(!snapshotCovers(r.date))return dateApi().isToday()?'':'advance';
  return dateApi().isToday()?'today':'advance';
}
function planningMode(){return journeyMode();}
function routeSignature(){const r=route();return `${r.from&&r.from.crs||''}|${r.to&&r.to.crs||''}|${r.date}|${r.departAfter}|${journeyMode()||'live'}|${liveWindowPhase()}`;}

function scheduledBoard(){
  let board=$('trainScheduledBoard');
  if(board){bindBoard(board);return board;}
  const live=$('trainBoard');
  if(!live)return null;
  board=document.createElement('div');
  board.id='trainScheduledBoard';
  board.className=live.className||'train-board';
  board.hidden=true;
  live.insertAdjacentElement('afterend',board);
  bindBoard(board);
  return board;
}
/* The live board re-renders itself on every toggle. Scheduled rows are a
   pure function of a timetable snapshot that does not change under us, so
   a delegated listener that flips hidden/open is enough - and it keeps the
   forecast markup in place rather than rebuilding it on each tap. */
function bindBoard(board){
  if(!board||board.dataset.scheduledBound)return;
  board.dataset.scheduledBound='1';
  board.addEventListener('click',event=>{
    const closest=event.target&&event.target.closest?event.target.closest.bind(event.target):null;
    const recovery=closest?closest('[data-use-recovery]'):null;
    if(recovery&&board.contains(recovery)){event.preventDefault();event.stopPropagation();adoptRecoveryByKey(recovery.getAttribute('data-use-recovery'));return;}
    const watch=closest?closest('[data-watch-journey]'):null;
    if(watch&&board.contains(watch)){event.preventDefault();event.stopPropagation();toggleJourneyWatchByKey(watch.getAttribute('data-watch-journey'));return;}
    const button=closest?closest('[data-scheduled-toggle]'):null;
    if(!button||!board.contains(button))return;
    toggleService(button.getAttribute('data-scheduled-toggle'));
  });
}
function toggleService(key){
  const board=$('trainScheduledBoard');
  if(!board)return;
  state.openId=state.openId===key?'':key;
  board.querySelectorAll('.train-scheduled-service').forEach(article=>{
    const id=article.getAttribute('data-service-id'),open=!!id&&id===state.openId;
    article.classList.toggle('open',open);
    const button=article.querySelector('[data-scheduled-toggle]');
    if(button)button.setAttribute('aria-expanded',open?'true':'false');
    const detail=article.querySelector('.train-service-detail');
    if(detail)detail.hidden=!open;
  });
}
function setScheduledVisibility(active){
  const live=$('trainBoard'),scheduled=scheduledBoard();
  if(live)live.hidden=!!active;
  if(scheduled)scheduled.hidden=!active;
}

async function fetchTimetableBytes(path,options={}){
  const controller=typeof AbortController==='function'?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),TIMETABLE_REQUEST_TIMEOUT_MS):null;
  try{
    const response=await fetch(path,controller?{...options,signal:controller.signal}:options);
    if(!response.ok)throw new Error(`Timetable data returned ${response.status}`);
    const bytes=new Uint8Array(await response.arrayBuffer());
    return bytes;
  }catch(error){
    if(error&&error.name==='AbortError')throw new Error('Timetable data timed out. Please retry.');
    throw error;
  }finally{if(timer)clearTimeout(timer);}
}
async function fetchJson(path){const bytes=await fetchTimetableBytes(path,{cache:'no-cache',headers:{Accept:'application/json'}});return JSON.parse(new TextDecoder().decode(bytes));}
async function fetchGzipJson(path){
  const bytes=await fetchTimetableBytes(path,{cache:'no-cache'});
  let text='';
  if(bytes.length>=2&&bytes[0]===0x1f&&bytes[1]===0x8b){
    if(typeof DecompressionStream!=='function')throw new Error('This browser cannot decompress the timetable file.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    text=await new Response(stream).text();
  }else text=new TextDecoder().decode(bytes);
  return JSON.parse(text);
}
function loadManifest({force=false}={}){const expired=!dataState.manifestCheckedAt||Date.now()-dataState.manifestCheckedAt>=MANIFEST_CACHE_MS;if(!dataState.manifestPromise||force||expired){const previous=state.manifest,previousId=previous&&previous.timetableId||'';dataState.manifestPromise=fetchJson(`${DATA_BASE}/manifest.json`).then(value=>{const nextId=value&&value.timetableId||'';if(previousId&&nextId&&nextId!==previousId){dataState.datePromises.clear();dataState.locationsPromise=null;}state.manifest=value;dataState.manifestCheckedAt=Date.now();return value;}).catch(error=>{dataState.manifestPromise=null;if(previous)return previous;throw error;});}return dataState.manifestPromise;}
function loadLocations(){if(!dataState.locationsPromise)dataState.locationsPromise=fetchJson(`${DATA_BASE}/locations.json`);return dataState.locationsPromise;}
function loadDate(date){if(!dataState.datePromises.has(date))dataState.datePromises.set(date,fetchGzipJson(`${DATA_BASE}/${encodeURIComponent(date)}.json.gz`).catch(error=>{dataState.datePromises.delete(date);throw error;}));return dataState.datePromises.get(date);}
function coverageFor(manifest,date){return manifest&&manifest.coverage&&manifest.coverage[date]||null;}
function coverageIncludesTime(coverage,value){if(!coverage)return false;if(!coverage.partial)return true;const minute=parseMinutes(value),from=parseMinutes(coverage.from),to=parseMinutes(coverage.to);if(minute==null)return true;return (from==null||minute>=from)&&(to==null||minute<=to);}
function location(locations,crs){const row=locations&&locations[String(crs||'').toUpperCase()];return {name:row&&row[0]||crs||'',crs:String(crs||'').toUpperCase()};}
function actualCallDate(row,call){return addDays(row[4],Number(call&&call[4])||0);}
function operatorName(manifest,code){return manifest&&manifest.tocNames&&manifest.tocNames[code]||code||'Scheduled service';}

function officialConnectionMinimumFor(crs){
  const code=String(crs||'').toUpperCase(),map=window.__KERBSIDE_OFFICIAL_CONNECTION_TIMES__||{},raw=map&&map[code];
  const structured=raw&&typeof raw==='object'&&!Array.isArray(raw);
  if(!structured)return null;
  const minutes=Number(raw.minutes),authority=String(raw.authority||'').trim(),dataset=String(raw.dataset||'').trim(),asOf=String(raw.asOf||'').trim(),licence=String(raw.licence||raw.license||'').trim();
  /* Kerbside may become a paid product, so an injected interchange dataset is
     trusted only when its own metadata explicitly permits commercial use and
     identifies both the publisher and licence. A bare number, scraped value or
     ambiguous feed can never silently become an "official" planning rule. */
  if(!Number.isFinite(minutes)||minutes<1||minutes>60||raw.commercialUse!==true||!authority||!dataset||!licence)return null;
  return {minutes,source:'licensed',authority,dataset,asOf,licence,commercialUse:true};
}
function connectionMinimumInfo(crs,graph=null){
  const code=String(crs||'').toUpperCase(),official=officialConnectionMinimumFor(code);
  /* The Darwin timetable gives Kerbside factual train times, but it does not
     currently provide a commercially-cleared station minimum-change dataset.
     Until one is explicitly supplied through the guarded adapter above, this
     value remains a Kerbside planning buffer and is labelled as such in the UI. */
  if(official)return official;
  const fixed=CONNECTION_HUB_MINUTES[code]||10,degree=graph&&graph.get(code)?graph.get(code).size:0,topology=degree>=12?15:degree>=7?12:10;
  return {minutes:Math.max(fixed,topology),source:'kerbside-planning-buffer',authority:'',dataset:'',asOf:'',licence:'',commercialUse:false};
}
function connectionMinimum(crs,graph=null){return connectionMinimumInfo(crs,graph).minutes;}
function callMinute(baseDate,row,call,value){
  const minute=parseMinutes(value);if(minute==null)return null;
  const actual=actualCallDate(row,call),base=new Date(`${baseDate}T12:00:00Z`),at=new Date(`${actual}T12:00:00Z`);
  if(Number.isNaN(base.getTime())||Number.isNaN(at.getTime()))return minute;
  return Math.round((at-base)/86400000)*1440+minute;
}
function rowIdentity(row){return String(row&&((row[0]||row[1]||row[2]))||'');}
function legFromRow(row,fromIndex,toIndex,locations,manifest,date){
  const calls=Array.isArray(row&&row[5])?row[5]:[];
  if(fromIndex<0||toIndex<=fromIndex||toIndex>=calls.length)return null;
  const originCall=calls[fromIndex],targetCall=calls[toIndex],terminusCall=calls[calls.length-1];
  const dep=originCall[2]||originCall[1]||'',arr=targetCall[1]||targetCall[2]||'';
  const departureMinute=callMinute(date,row,originCall,dep),arrivalMinute=callMinute(date,row,targetCall,arr);
  if(departureMinute==null||arrivalMinute==null||arrivalMinute<=departureMinute)return null;
  const from=location(locations,originCall[0]),to=location(locations,targetCall[0]);
  const terminus=location(locations,terminusCall&&terminusCall[0]);
  const serviceOrigin=location(locations,calls[0]&&calls[0][0]);
  return {
    std:dep,departure:dep,arrival:arr,platform:originCall[3]||'',arrivalPlatform:targetCall[3]||'',
    operator:operatorName(manifest,row[3]),operatorCode:row[3]||'',serviceID:row[0]||'',serviceId:row[0]||'',uid:row[1]||'',trainId:row[2]||'',
    origin:[{locationName:serviceOrigin.name,crs:serviceOrigin.crs}],
    destination:[{locationName:terminus.name,crs:terminus.crs}],
    routeDestination:to,serviceTerminus:terminus,from,to,
    departureMinute,arrivalMinute,scheduledOnly:true,isCancelled:false,length:0
  };
}
function originIndexFor(row,fromCode,date){
  const calls=Array.isArray(row&&row[5])?row[5]:[];
  for(let i=0;i<calls.length-1;i++){
    const call=calls[i];
    if(call&&call[0]===fromCode&&actualCallDate(row,call)===date)return i;
  }
  return -1;
}
function destinationIndexAfter(row,toCode,start){
  const calls=Array.isArray(row&&row[5])?row[5]:[];
  for(let i=start+1;i<calls.length;i++)if(calls[i]&&calls[i][0]===toCode)return i;
  return -1;
}
function servicesFromRows(rows,locations,manifest,{from,to,date,departAfter}){
  const fromCode=String(from||'').toUpperCase(),toCode=String(to||'').toUpperCase(),after=parseMinutes(departAfter);
  if(!/^[A-Z0-9]{3}$/.test(fromCode)||!/^[A-Z0-9]{3}$/.test(toCode)||fromCode===toCode)return[];
  const found=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const originIndex=originIndexFor(row,fromCode,date);if(originIndex<0)continue;
    const destinationIndex=destinationIndexAfter(row,toCode,originIndex);if(destinationIndex<0)continue;
    const leg=legFromRow(row,originIndex,destinationIndex,locations,manifest,date);if(!leg)continue;
    if(after!=null&&leg.departureMinute<after)continue;
    found.push({...leg,journeyType:'direct',changes:0,totalMinutes:leg.arrivalMinute-leg.departureMinute,rankScore:leg.arrivalMinute});
  }
  found.sort((a,b)=>a.departureMinute-b.departureMinute||a.arrivalMinute-b.arrivalMinute);
  return found.slice(0,MAX_RESULTS);
}
function departureIndexForRows(rows,date){
  const index=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const calls=Array.isArray(row&&row[5])?row[5]:[];
    for(let i=0;i<calls.length-1;i++){
      const call=calls[i],value=call&&(call[2]||call[1])||'',minute=callMinute(date,row,call,value);
      if(!call||minute==null||minute<0||minute>2879)continue;
      const code=String(call[0]||'').toUpperCase();if(!code)continue;
      const list=index.get(code)||[];list.push({row,callIndex:i,departureMinute:minute});index.set(code,list);
    }
  }
  for(const list of index.values())list.sort((a,b)=>a.departureMinute-b.departureMinute);
  return index;
}
function lowerBound(list,value){let lo=0,hi=list.length;while(lo<hi){const mid=(lo+hi)>>1;if(list[mid].departureMinute<value)lo=mid+1;else hi=mid;}return lo;}
function buildStationGraph(rows){
  const graph=new Map(),link=(a,b)=>{if(!a||!b||a===b)return;if(!graph.has(a))graph.set(a,new Set());if(!graph.has(b))graph.set(b,new Set());graph.get(a).add(b);graph.get(b).add(a);};
  for(const row of Array.isArray(rows)?rows:[]){const calls=Array.isArray(row&&row[5])?row[5]:[];for(let i=1;i<calls.length;i++)link(String(calls[i-1]&&calls[i-1][0]||'').toUpperCase(),String(calls[i]&&calls[i][0]||'').toUpperCase());}
  return graph;
}
function shortestNetworkStops(graph,from,to){
  const start=String(from||'').toUpperCase(),target=String(to||'').toUpperCase();if(!graph||!start||!target)return Infinity;if(start===target)return 0;
  const seen=new Set([start]),queue=[[start,0]];for(let head=0;head<queue.length;head++){const [node,depth]=queue[head];if(depth>=40)continue;for(const next of graph.get(node)||[]){if(next===target)return depth+1;if(!seen.has(next)){seen.add(next);queue.push([next,depth+1]);}}}return Infinity;
}
function pathCodes(row,start,end){const calls=Array.isArray(row&&row[5])?row[5]:[];return calls.slice(start,end+1).map(call=>String(call&&call[0]||'').toUpperCase()).filter(Boolean);}
function connectionRouteQuality(firstRow,firstStart,changeIndex,secondRow,secondStart,destinationIndex,graph,shortest){
  const first=pathCodes(firstRow,firstStart,changeIndex),second=pathCodes(secondRow,secondStart,destinationIndex);if(first.length<2||second.length<2)return {reject:true,reason:'invalid path'};
  const earlier=new Set(first.slice(0,-1)),returned=second.slice(1).find(code=>earlier.has(code));
  if(returned)return {reject:true,reason:`backtracks through ${returned}`};
  const edges=(first.length-1)+(second.length-1),base=Number.isFinite(shortest)&&shortest>0?shortest:null;
  const detourRatio=base?edges/base:1,excess=base?edges-base:0;
  if(base&&excess>=CONNECTION_DETOUR_REJECT_EXCESS&&detourRatio>2.5)return {reject:true,reason:'excessive network detour',edges,shortest:base,detourRatio};
  const penalty=base?Math.max(0,excess-3)*2+Math.max(0,detourRatio-1.8)*8:0;
  return {reject:false,reason:penalty?'indirect route':'direct network progression',edges,shortest:base,detourRatio,penalty};
}
function connectionRiskFor(minutes,minimum){
  if(!Number.isFinite(minutes))return'scheduled';
  if(minutes<minimum)return'at-risk';
  if(minutes<minimum+5)return'tight';
  return'good';
}
function connectionQuality(minutes,minimum){const margin=minutes-minimum;return margin<CONNECTION_COMFORT_MARGIN?'tight':minutes>CONNECTION_LONG_WAIT?'long':'comfortable';}
function connectionsFromRows(rows,locations,manifest,{from,to,date,departAfter}){
  const fromCode=String(from||'').toUpperCase(),toCode=String(to||'').toUpperCase(),after=parseMinutes(departAfter);
  if(!/^[A-Z0-9]{3}$/.test(fromCode)||!/^[A-Z0-9]{3}$/.test(toCode)||fromCode===toCode)return[];
  const graph=buildStationGraph(rows),shortest=shortestNetworkStops(graph,fromCode,toCode);
  const departures=departureIndexForRows(rows,date),first=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const originIndex=originIndexFor(row,fromCode,date);if(originIndex<0)continue;
    const calls=Array.isArray(row&&row[5])?row[5]:[],call=calls[originIndex],dep=call&&(call[2]||call[1])||'';
    const departureMinute=callMinute(date,row,call,dep);if(departureMinute==null)continue;
    if(after!=null&&departureMinute<after)continue;
    first.push({row,calls,originIndex,departureMinute});
  }
  first.sort((a,b)=>a.departureMinute-b.departureMinute);
  const found=[],seen=new Set();
  for(const candidate of first.slice(0,CONNECTION_FIRST_LEGS)){
    let choices=0;
    for(let changeIndex=candidate.originIndex+1;changeIndex<candidate.calls.length;changeIndex++){
      const changeCall=candidate.calls[changeIndex],changeCode=String(changeCall&&changeCall[0]||'').toUpperCase();
      if(!changeCode||changeCode===fromCode||changeCode===toCode)continue;
      const arrivalValue=changeCall[1]||changeCall[2]||'',arrivalMinute=callMinute(date,candidate.row,changeCall,arrivalValue);
      if(arrivalMinute==null||arrivalMinute<=candidate.departureMinute||arrivalMinute-candidate.departureMinute>CONNECTION_MAX_TOTAL)continue;
      const minimumInfo=connectionMinimumInfo(changeCode,graph),minimum=minimumInfo.minutes,earliest=arrivalMinute+minimum,latest=arrivalMinute+CONNECTION_MAX_WAIT;
      const list=departures.get(changeCode)||[];let pos=lowerBound(list,earliest),examined=0;
      for(;pos<list.length&&list[pos].departureMinute<=latest&&examined<CONNECTION_SECOND_CHOICES;pos++,examined++){
        const second=list[pos];if(rowIdentity(second.row)===rowIdentity(candidate.row))continue;
        const destinationIndex=destinationIndexAfter(second.row,toCode,second.callIndex);if(destinationIndex<0)continue;
        const firstLeg=legFromRow(candidate.row,candidate.originIndex,changeIndex,locations,manifest,date);
        const secondLeg=legFromRow(second.row,second.callIndex,destinationIndex,locations,manifest,date);
        if(!firstLeg||!secondLeg)continue;
        const routeQuality=connectionRouteQuality(candidate.row,candidate.originIndex,changeIndex,second.row,second.callIndex,destinationIndex,graph,shortest);if(routeQuality.reject)continue;
        const connectionMinutes=second.departureMinute-arrivalMinute,totalMinutes=secondLeg.arrivalMinute-candidate.departureMinute;
        if(connectionMinutes<minimum||connectionMinutes>CONNECTION_MAX_WAIT||totalMinutes<=0||totalMinutes>CONNECTION_MAX_TOTAL)continue;
        const key=`${firstLeg.serviceID}|${changeCode}|${secondLeg.serviceID}`;if(seen.has(key))continue;seen.add(key);
        const interchange=location(locations,changeCode),operators=[...new Set([firstLeg.operator,secondLeg.operator].filter(Boolean))];
        const margin=connectionMinutes-minimum,tightPenalty=margin<CONNECTION_COMFORT_MARGIN?(CONNECTION_COMFORT_MARGIN-margin)*6:0,longPenalty=connectionMinutes>CONNECTION_LONG_WAIT?(connectionMinutes-CONNECTION_LONG_WAIT)*.8:0,routePenalty=Number(routeQuality.penalty)||0;
        const recoveryOptions=[];
        const recoveryLimit=second.departureMinute+CONNECTION_RECOVERY_WINDOW;
        for(let recoveryPos=pos+1;recoveryPos<list.length&&recoveryOptions.length<CONNECTION_RECOVERY_CHOICES;recoveryPos++){
          const alternative=list[recoveryPos];if(alternative.departureMinute>recoveryLimit)break;
          if(rowIdentity(alternative.row)===rowIdentity(candidate.row)||rowIdentity(alternative.row)===rowIdentity(second.row))continue;
          const alternativeDestination=destinationIndexAfter(alternative.row,toCode,alternative.callIndex);if(alternativeDestination<0)continue;
          const alternativeLeg=legFromRow(alternative.row,alternative.callIndex,alternativeDestination,locations,manifest,date);if(!alternativeLeg)continue;
          const alternativeQuality=connectionRouteQuality(candidate.row,candidate.originIndex,changeIndex,alternative.row,alternative.callIndex,alternativeDestination,graph,shortest);if(alternativeQuality.reject)continue;
          recoveryOptions.push({...alternativeLeg,routeQuality:alternativeQuality});
        }
        found.push({
          journeyType:'connection',changes:1,std:firstLeg.std,departure:firstLeg.std,arrival:secondLeg.arrival,
          platform:firstLeg.platform,arrivalPlatform:secondLeg.arrivalPlatform,
          operator:operators.join(' + ')||'Scheduled services',operatorCode:firstLeg.operatorCode||'',
          serviceID:`connection:${firstLeg.serviceID}:${changeCode}:${secondLeg.serviceID}`,
          serviceId:`connection:${firstLeg.serviceID}:${changeCode}:${secondLeg.serviceID}`,
          origin:firstLeg.origin,destination:[{locationName:secondLeg.routeDestination.name,crs:secondLeg.routeDestination.crs}],
          routeDestination:secondLeg.routeDestination,serviceTerminus:secondLeg.routeDestination,
          departureMinute:candidate.departureMinute,arrivalMinute:secondLeg.arrivalMinute,totalMinutes,
          connectionMinutes,minimumConnectionMinutes:minimum,minimumConnectionSource:minimumInfo.source,minimumConnectionAuthority:minimumInfo.authority||'',minimumConnectionDataset:minimumInfo.dataset||'',minimumConnectionAsOf:minimumInfo.asOf||'',minimumConnectionLicence:minimumInfo.licence||'',minimumConnectionCommercialUse:minimumInfo.commercialUse===true,recoveryOptions,
          interchange:{...interchange,arrival:firstLeg.arrival,departure:secondLeg.std,minutes:connectionMinutes,minimum,margin,quality:connectionQuality(connectionMinutes,minimum),routeQuality},
          legs:[firstLeg,secondLeg],rankScore:secondLeg.arrivalMinute+14+tightPenalty+longPenalty+routePenalty,
          scheduledOnly:true,isCancelled:false,length:0
        });
        choices++;
        if(choices>=3)break;
      }
      if(choices>=3)break;
    }
  }
  found.sort((a,b)=>a.rankScore-b.rankScore||a.departureMinute-b.departureMinute);
  return found.slice(0,MAX_RESULTS);
}
function connectionDominated(connection,directs){
  return directs.some(direct=>{
    const depGap=direct.departureMinute-connection.departureMinute;
    return depGap>=-10&&depGap<=30&&direct.arrivalMinute<=connection.arrivalMinute+20;
  });
}
function connectionVariantDominated(connection,all){
  const first=connection&&connection.legs&&connection.legs[0],change=connection&&connection.interchange&&connection.interchange.crs;
  if(!first||!change)return false;
  return all.some(other=>other!==connection&&other&&other.legs&&other.legs[0]&&other.legs[0].serviceID===first.serviceID&&other.interchange&&other.interchange.crs===change&&other.arrivalMinute<=connection.arrivalMinute&&other.rankScore<=connection.rankScore);
}
function addJourneyLabel(service,label){if(!service||!label)return;const list=Array.isArray(service.journeyLabels)?service.journeyLabels:(service.journeyLabels=[]);if(!list.includes(label))list.push(label);}
function applyJourneyLabels(items){
  const list=Array.isArray(items)?items:[];if(!list.length)return list;
  list.forEach(item=>{item.journeyLabels=[];if(item.changes===0)addJourneyLabel(item,'Direct');});
  const fastest=list.reduce((best,item)=>!best||item.arrivalMinute<best.arrivalMinute?item:best,null);if(fastest)addJourneyLabel(fastest,'Fastest');
  const connections=list.filter(item=>item.journeyType==='connection');
  if(connections.length){
    const best=connections.reduce((winner,item)=>!winner||item.rankScore<winner.rankScore?item:winner,null);if(best)addJourneyLabel(best,'Best connection');
    const safest=connections.reduce((winner,item)=>!winner||(Number(item.interchange&&item.interchange.margin)||0)>(Number(winner.interchange&&winner.interchange.margin)||0)?item:winner,null);
    if(safest&&safest!==best&&(Number(safest.interchange&&safest.interchange.margin)||0)>=(Number(best&&best.interchange&&best.interchange.margin)||0)+5)addJourneyLabel(safest,'Safer change');
  }
  return list;
}
function journeysFromRows(rows,locations,manifest,options){
  const direct=servicesFromRows(rows,locations,manifest,options);
  const rawConnections=connectionsFromRows(rows,locations,manifest,options);
  const connections=rawConnections.filter(item=>!connectionVariantDominated(item,rawConnections)&&!connectionDominated(item,direct));
  const ranked=[...direct,...connections]
    .sort((a,b)=>a.departureMinute-b.departureMinute||a.changes-b.changes||a.rankScore-b.rankScore||a.arrivalMinute-b.arrivalMinute)
    .slice(0,MAX_RESULTS);
  return applyJourneyLabels(ranked);
}

const timetableProvider={
  state:dataState,
  async getCoverage(options={}){return loadManifest(options);},
  async refreshCoverage(){return loadManifest({force:true});},
  async getServices({from,to,date,departAfter='00:00'}){
    const manifest=await loadManifest();
    if(!manifest||!Array.isArray(manifest.dates)||!manifest.dates.includes(date))return[];
    const nextDate=addDays(date,1),dates=[date,...(manifest.dates.includes(nextDate)?[nextDate]:[])];
    const [locations,...sets]=await Promise.all([loadLocations(),...dates.map(loadDate)]);
    const rows=[],seen=new Set();for(const set of sets)for(const row of (Array.isArray(set)?set:[])){const key=rowIdentity(row);if(key&&seen.has(key))continue;if(key)seen.add(key);rows.push(row);}
    return journeysFromRows(rows,locations,manifest,{from,to,date,departAfter});
  },
  servicesFromRows,connectionsFromRows,journeysFromRows,connectionMinimum,connectionMinimumInfo,connectionRiskFor,buildStationGraph,shortestNetworkStops,connectionRouteQuality
};
window.__KERBSIDE_TIMETABLE_PROVIDER__=timetableProvider;

function normaliseLeg(item){
  const routeTarget=item.routeDestination||item.to||null;
  return {
    std:item.std||item.departure||'',etd:item.etd||'',arrival:item.arrival||'',platform:item.platform||'',scheduledPlatform:item.platform||'',arrivalPlatform:item.arrivalPlatform||'',
    destination:item.destination||[],displayDestination:item.serviceTerminus||((item.destination&&item.destination[0])||routeTarget)||null,
    origin:item.origin||[],operator:item.operator||'',operatorCode:item.operatorCode||'',length:Number(item.length)||0,isCancelled:!!item.isCancelled,
    serviceID:item.serviceID||item.serviceId||item.uid||'',uid:item.uid||'',trainId:item.trainId||'',from:item.from||null,to:item.to||routeTarget||null,
    departureMinute:Number(item.departureMinute),arrivalMinute:Number(item.arrivalMinute),scheduledOnly:true,liveEvidence:false,liveVia:'',cancelReason:'',delayReason:''
  };
}
function normalise(item){
  const routeTarget=item.routeDestination||null,connection=item.journeyType==='connection'||(Number(item.changes)===1&&Array.isArray(item.legs));
  const legs=connection?(item.legs||[]).map(normaliseLeg):[];
  return {
    /* etd stays empty until the overlay supplies one. The old build
       hardcoded 'On time', which told Forecast v4 that a train three days
       out was running to time and made the row indistinguishable from a
       live one. */
    std:item.std||item.departure||item.departureTime||'',etd:'',arrival:item.arrival||'',platform:item.platform||'',
    scheduledPlatform:item.platform||'',arrivalPlatform:item.arrivalPlatform||'',
    destination:routeTarget?[{locationName:routeTarget.name||routeTarget.locationName||'',crs:routeTarget.crs||''}]:(item.destination||[{locationName:item.destinationName||'',crs:item.destinationCrs||''}]),
    displayDestination:connection?(routeTarget||item.serviceTerminus||null):(item.serviceTerminus||((item.destination&&item.destination[0])||routeTarget)||null),
    origin:item.origin||[],operator:item.operator||item.operatorName||'',operatorCode:item.operatorCode||'',length:Number(item.length)||0,
    isCancelled:!!item.isCancelled,serviceID:item.serviceID||item.serviceId||item.uid||'',uid:item.uid||'',trainId:item.trainId||'',
    journeyType:connection?'connection':'direct',changes:connection?1:0,legs,interchange:item.interchange?{...item.interchange}:null,
    connectionMinutes:Number(item.connectionMinutes)||0,minimumConnectionMinutes:Number(item.minimumConnectionMinutes)||0,totalMinutes:Number(item.totalMinutes)||0,
    departureMinute:Number(item.departureMinute),arrivalMinute:Number(item.arrivalMinute),rankScore:Number(item.rankScore)||0,
    liveConnectionMinutes:null,liveInterchangeArrival:'',connectionRisk:'scheduled',secondLiveEvidence:false,onwardCancelled:false,
    recoveryOptions:connection?(item.recoveryOptions||[]).map(normaliseLeg):[],recoveryChoice:null,minimumConnectionSource:item.minimumConnectionSource||'kerbside-planning-buffer',minimumConnectionAuthority:item.minimumConnectionAuthority||'',minimumConnectionDataset:item.minimumConnectionDataset||'',minimumConnectionAsOf:item.minimumConnectionAsOf||'',minimumConnectionLicence:item.minimumConnectionLicence||'',minimumConnectionCommercialUse:item.minimumConnectionCommercialUse===true,journeyLabels:Array.isArray(item.journeyLabels)?item.journeyLabels.slice():[],
    scheduledOnly:true,liveEvidence:false,liveVia:'',cancelReason:'',delayReason:''
  };
}
/* A live-only service: something Darwin is running that the snapshot was
   built too early to know about. Shaped like a normalised timetable row so
   the renderer and the forecast cannot tell the difference. */
function normaliseLive(service,toCrs){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  const ahead=overlay?overlay.flattenCallingPoints(service.subsequentCallingPoints):[];
  const target=String(toCrs||'').toUpperCase();
  const at=ahead.find(point=>String(point&&point.crs||'').toUpperCase()===target);
  const terminus=(Array.isArray(service.destination)?service.destination.find(Boolean):null)||null;
  return {
    std:service.std||'',etd:String(service.etd||'').trim()||'On time',
    arrival:String(at&&(at.st||at.et)||'').trim(),platform:String(service.platform||'').trim(),scheduledPlatform:'',
    destination:terminus?[{locationName:terminus.locationName||'',crs:terminus.crs||''}]:[],
    displayDestination:terminus?{name:terminus.locationName||'',crs:terminus.crs||''}:null,
    origin:service.origin||[],operator:service.operator||'',operatorCode:service.operatorCode||'',
    length:Number(service.length)||0,isCancelled:!!service.isCancelled,
    serviceID:service.serviceIdGuid||service.serviceID||'',uid:service.uid||'',trainId:service.trainid||service.trainId||'',
    serviceIdUrlSafe:service.serviceIdUrlSafe||'',serviceIdGuid:service.serviceIdGuid||'',
    previousCallingPoints:service.previousCallingPoints||null,subsequentCallingPoints:service.subsequentCallingPoints||null,
    scheduledOnly:false,liveEvidence:true,liveVia:'live-only',liveOnly:true,
    cancelReason:String(service.cancelReason||'').trim(),delayReason:String(service.delayReason||'').trim()
  };
}
function setHeader(mode,manifest){
  const r=route(),name=$('trainStationName'),meta=$('trainStationMeta'),refresh=$('trainRefresh'),main=$('trainMain');
  const from=displayName(r.from,'Departure station'),to=displayName(r.to,'destination'),sourceManifest=state.sourceManifest||manifest,snap=timetableIdLabel(sourceManifest&&sourceManifest.timetableId);
  if(main)main.dataset.railView='scheduled';
  setScheduledVisibility(true);
  if(name)name.textContent=r.from&&r.to?`${from} → ${to}`:'Scheduled journey';
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,phase=liveWindowPhase(),sameRoute=overlayMatchesRoute(overlay);
  let liveNote='advance timetable';
  if(mode==='today'){
    if(phase==='scheduled-only')liveNote='timetable · scheduled forecast';
    else if(phase==='live-eligible')liveNote=sameRoute&&overlay.state.status==='ready'?'timetable + live':sameRoute&&overlay.state.status==='error'?'timetable · live unavailable':'timetable · checking live';
    else liveNote='timetable · checking live window';
  }
  if(meta)meta.textContent=r.from&&r.to?`${r.from.crs||''} → ${r.to.crs||''} · ${dateLabel(r.date,{short:true})} · ${liveNote}${snap?` · snapshot ${snap}`:''}`:dateLabel(r.date);
  if(refresh){const canRefresh=mode==='today'&&phase==='live-eligible';refresh.disabled=!canRefresh;refresh.textContent=canRefresh?'Refresh':'Schedule';}
}
function setLiveMode(){const main=$('trainMain');if(main)main.dataset.railView='live';setScheduledVisibility(false);}
/* Disruption messages were hardcoded to [] here, which quietly disabled
   disruptionMessageSignal on what is now the primary board - Darwin telling
   us "reduced service" is one of the strongest same-day flags there is. */
function liveMessages(){
  if(state.mode!=='today'||!liveOverlayEligible())return [];
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  if(!overlay||!overlayMatchesRoute(overlay)||overlay.state.status!=='ready')return [];
  return typeof overlay.messages==='function'?overlay.messages():[];
}
function serviceForLoading(service){
  if(!service||service.formation)return service;
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,evidence=overlay&&typeof overlay.evidenceFor==='function'?overlay.evidenceFor(service):null,formation=evidence&&evidence.service&&evidence.service.formation;
  return formation?{...service,formation}:service;
}
function crowdSourceText(result,peak=false){const loading=window.__KERBSIDE_TRAIN_LOADING__;return loading&&typeof loading.sourceText==='function'?loading.sourceText(result,{peak}):`${result&&result.confidence||'Low'} confidence${peak?' · peak leg':''}`;}
function forecastOne(service,index,services,station=route().from,messages=liveMessages(),extraContext={}){const v3=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__,api=window.__KERBSIDE_TRAINS__,loading=window.__KERBSIDE_TRAIN_LOADING__,date=new Date(`${route().date}T12:00:00`),context={station,referenceDate:date,messages,...(extraContext||{})};let base;if(v3&&typeof v3.forecast==='function')base=v3.forecast(service,index,services,context);else if(api&&typeof api.crowdingForecast==='function')base=api.crowdingForecast(service,index,services,context);else base={label:'Moderate',level:'moderate',confidence:'Low',reasons:['service time and route demand baseline']};const candidate=serviceForLoading(service);return loading&&typeof loading.applyToForecast==='function'?loading.applyToForecast(base,candidate):base;}
function confidenceFloor(results){const rank={Low:0,Medium:1,'Medium-high':2,High:3};let best=3;for(const result of results){const value=rank[result&&result.confidence];if(Number.isFinite(value))best=Math.min(best,value);}return Object.keys(rank).find(key=>rank[key]===best)||'Low';}
function forecastIdentity(service){return String(service&&(service.serviceID||service.serviceIdGuid||service.serviceIdGuId||service.rid||service.uid||((service.trainId||service.trainid)&&service.std?`${service.trainId||service.trainid}|${service.std}`:''))||'').toUpperCase();}
function forecastBoardContext(service,board,fallback=[]){
  const rows=(Array.isArray(board)&&board.length?board:fallback).filter(Boolean).slice(),wanted=forecastIdentity(service);let index=wanted?rows.findIndex(item=>forecastIdentity(item)===wanted):-1;
  if(index>=0){const liveRow=rows[index];if(!service.formation&&liveRow&&liveRow.formation)service.formation=liveRow.formation;rows[index]=service;}else{rows.push(service);rows.sort((a,b)=>(parseMinutes(a&&a.std)??9999)-(parseMinutes(b&&b.std)??9999));index=rows.indexOf(service);}
  return {services:rows,index:Math.max(0,index)};
}
function legEventJourney(leg){return {origin:displayName(leg&&leg.from,'Departure'),destination:displayName(leg&&leg.to,'Destination'),destinationCrs:leg&&leg.to&&leg.to.crs||''};}
function connectionLegForecast(connection,leg,legIndex){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,r=route(),change=connection&&connection.interchange&&connection.interchange.crs||'',to=r.to&&r.to.crs||'';
  const board=legIndex===0?(overlay&&overlay.state&&overlay.state.services||[]):(overlay&&typeof overlay.onwardServices==='function'?overlay.onwardServices(change,to):[]),context=forecastBoardContext(leg,board,connection&&connection.legs||[leg]);
  return forecastOne(leg,context.index,context.services,leg&&leg.from||r.from,legIndex===0?liveMessages():[],{eventJourney:legEventJourney(leg),connectionRole:legIndex===0?'first-leg':'onward-leg'});
}
function forecastConnection(service){
  const legs=Array.isArray(service&&service.legs)?service.legs:[];if(!legs.length)return forecastOne(service,0,[service]);
  const results=legs.map((leg,index)=>connectionLegForecast(service,leg,index));
  if(results[0]&&results[0].cancelled)return {...results[0],reasons:['the first train in this connection is cancelled'],journeyLegResults:results,peakLeg:0};
  let peakLeg=0,peakScore=-Infinity;results.forEach((result,index)=>{const score=Number(result&&result.score);if(Number.isFinite(score)&&score>peakScore){peakScore=score;peakLeg=index;}});
  const peak=results[peakLeg]||results[0],leg=legs[peakLeg]||{},from=displayName(leg.from,'first leg'),to=displayName(leg.to,'interchange');
  return {...peak,confidence:confidenceFloor(results),reasons:[`Peak crowding is forecast on ${from} → ${to}`,...(peak.reasons||[])].slice(0,6),journeyLegResults:results,peakLeg};
}
function forecastRecovery(service){
  if(!service||service.journeyType!=='connection'||!service.recoveryChoice)return null;
  const option=(service.recoveryOptions||[]).find(item=>String(item&&item.serviceID||'')===String(service.recoveryChoice.serviceID||''));
  if(!option)return null;
  const displacement=service.connectionRisk==='onward-cancelled'?.7:service.connectionRisk==='at-risk'?.45:0;
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,r=route(),change=service.interchange&&service.interchange.crs||'',to=r.to&&r.to.crs||'',board=overlay&&typeof overlay.onwardServices==='function'?overlay.onwardServices(change,to):[],context=forecastBoardContext(option,board,service.legs||[option]);
  return forecastOne(option,context.index,context.services,option.from||service.interchange,[],{eventJourney:legEventJourney(option),connectionRole:'recovery-leg',connectionDisplacement:displacement});
}
function forecast(service,index,services){return service&&service.journeyType==='connection'?forecastConnection(service):forecastOne(service,index,services);}
function coverageNote(manifest,date){const c=coverageFor(manifest,date);if(!c)return'';return c.partial?`Timetable coverage for this edge date is partial (${c.from}–${c.to}).`: `Full-day Darwin timetable coverage (${c.from}–${c.to}).`;}

/* ------------------------------------------------------------------
   Presentation. The scheduled board used to emit its own ad-hoc markup
   (.train-service-main / .train-destination), neither of which has ever
   had a rule in kerbside-trains.css - so every advance row rendered as
   raw stacked text with the operator welded onto the destination. These
   rows now use exactly the live board's structure (summary button with
   time / route / crowding / formation columns, collapsible detail) and
   hand the reasons to Forecast v4's bullet card.
------------------------------------------------------------------ */
function serviceKey(service,index){return String((service&&(service.serviceID||service.uid||service.trainId))||`${(service&&service.std)||'time'}-${index}`);}
function readJourneyWatch(){
  try{if(typeof localStorage==='undefined')return null;const value=JSON.parse(localStorage.getItem(WATCH_STORE_KEY)||'null');return value&&value.v===1?value:null;}catch(error){return null;}
}
function persistJourneyWatch(value){
  state.watch=value||null;
  try{if(typeof localStorage!=='undefined'){if(value)localStorage.setItem(WATCH_STORE_KEY,JSON.stringify(value));else localStorage.removeItem(WATCH_STORE_KEY);}}catch(error){}
  return state.watch;
}
function stableServiceId(service){return String(service&&(service.serviceID||service.serviceId||service.uid||service.trainId)||'');}
function watchRouteMatches(watch=state.watch){
  if(!watch)return false;const r=route();return String(watch.date||'')===String(r.date||'')&&String(watch.from||'').toUpperCase()===String(r.from&&r.from.crs||'').toUpperCase()&&String(watch.to||'').toUpperCase()===String(r.to&&r.to.crs||'').toUpperCase();
}
function watchMatches(service){
  const watch=state.watch;if(!watch||!watchRouteMatches(watch)||!service)return false;
  if(service.journeyType!=='connection')return String(watch.serviceID||'')===stableServiceId(service);
  const first=service.legs&&service.legs[0],second=service.legs&&service.legs[1],change=String(service.interchange&&service.interchange.crs||'').toUpperCase();
  if(String(watch.firstID||'')!==stableServiceId(first)||String(watch.change||'').toUpperCase()!==change)return false;
  const wanted=String(watch.onwardID||'');if(!wanted)return true;
  if(wanted===stableServiceId(second))return true;
  return (service.recoveryOptions||[]).some(option=>stableServiceId(option)===wanted);
}
function journeyWatchPayload(service){
  const r=route(),connection=service&&service.journeyType==='connection',first=connection&&service.legs&&service.legs[0],second=connection&&service.legs&&service.legs[1];
  return {v:1,date:r.date||'',from:String(r.from&&r.from.crs||'').toUpperCase(),to:String(r.to&&r.to.crs||'').toUpperCase(),journeyType:connection?'connection':'direct',serviceID:stableServiceId(service),firstID:connection?stableServiceId(first):'',onwardID:connection?stableServiceId(second):'',change:connection?String(service.interchange&&service.interchange.crs||'').toUpperCase():'',updatedAt:new Date().toISOString()};
}
function updateWatchedJourney(service){if(watchMatches(service))persistJourneyWatch(journeyWatchPayload(service));}
function connectionMinimumProvenance(service){
  const minimum=Number(service&&service.minimumConnectionMinutes)||10;
  if(service&&service.minimumConnectionSource==='licensed'&&service.minimumConnectionCommercialUse===true){
    const authority=String(service.minimumConnectionAuthority||'').trim(),dataset=String(service.minimumConnectionDataset||'').trim(),licence=String(service.minimumConnectionLicence||'').trim(),asOf=String(service.minimumConnectionAsOf||'').trim();
    return `${authority?`${authority} · `:''}licensed station minimum: ${minimum} min${dataset?` · ${dataset}`:''}${licence?` · ${licence}`:''}${asOf?` · ${asOf}`:''}`;
  }
  return `Kerbside planning buffer: ${minimum} min`;
}
function connectionEvidenceProvenance(service){
  const first=service&&service.legs&&service.legs[0],second=service&&service.legs&&service.legs[1];
  if(first&&first.liveEvidence&&second&&second.liveEvidence)return'both trains live-checked';
  if(first&&first.liveEvidence||second&&second.liveEvidence)return'one train live-checked';
  return'timetable evidence only';
}
function journeyWatchStatus(service){
  if(!service)return {label:'Journey unavailable',note:'',warn:true};
  if(service.journeyType==='connection'){
    const minutes=Number.isFinite(service.liveConnectionMinutes)?service.liveConnectionMinutes:Number(service.connectionMinutes)||0,minimum=Number(service.minimumConnectionMinutes)||10,evidence=connectionEvidenceProvenance(service),provenance=connectionMinimumProvenance(service);
    if(service.connectionRisk==='first-cancelled')return {label:'First train cancelled',note:`${evidence} · re-plan from the origin.`,warn:true};
    if(service.connectionRisk==='onward-cancelled')return {label:'Onward train cancelled',note:`${evidence}${service.recoveryChoice?' · backup available':''}.`,warn:true};
    if(service.connectionRisk==='at-risk')return {label:`Connection at risk · ${minutes} min`,note:`Below ${minimum} min · ${evidence} · ${provenance}.`,warn:true};
    if(service.connectionRisk==='tight')return {label:`Tight connection · ${minutes} min`,note:`${evidence} · ${provenance}.`,warn:true};
    return {label:`${service.replanned?'Replanned · ':''}${minutes} min change`,note:`${evidence} · ${provenance}.`,warn:false};
  }
  const status=statusFor(service);return {label:status.label,note:service.liveEvidence?'Live Darwin evidence is attached to this train.':'Timetable watch; live Darwin evidence will be added when available.',warn:status.cls==='cancelled'||status.cls==='late'};
}
function journeyWatchMarkup(service,key){
  const active=watchMatches(service),status=journeyWatchStatus(service),cls=`train-watch-card${active?' is-active':''}${active&&status.warn?' is-warn':''}`;
  const label=active?status.label:'Keep this journey together',note=active?`${status.note} Kerbside refreshes this watch while the app is open.`:'Pin this journey so its live status, connection margin and recovery option stay together while Kerbside is open.';
  return `<div class="${cls}"><div><span>Journey Watch</span><strong>${esc(label)}</strong><small>${esc(note)}</small></div><button type="button" class="train-watch-action" data-watch-journey="${esc(key)}" aria-pressed="${active?'true':'false'}">${active?'Stop watching':'Watch journey'}</button></div>`;
}
function toggleJourneyWatchByKey(key){
  const index=state.services.findIndex((service,i)=>serviceKey(service,i)===String(key||''));if(index<0)return false;const service=state.services[index];
  if(watchMatches(service))persistJourneyWatch(null);else persistJourneyWatch(journeyWatchPayload(service));
  renderRows(state.services,{mode:state.mode,manifest:state.manifest});return true;
}

function durationLabel(from,to){const start=parseMinutes(from),end=parseMinutes(to);if(start==null||end==null)return'';let span=end-start;if(span<0)span+=1440;if(span<=0)return'';const h=Math.floor(span/60),m=span%60;return h?`${h}h ${String(m).padStart(2,'0')}m`:`${m}m`;}
function terminusText(service,fallback){const d=service&&service.displayDestination;return (d&&(d.name||d.locationName||d.crs))||fallback;}
function originText(service){const list=service&&Array.isArray(service.origin)?service.origin.find(Boolean):null;return (list&&(list.locationName||list.name||list.crs))||'Origin not published';}
function modeLabel(mode){if(mode!=='today')return'Advance timetable';return liveOverlayEligible()?'Live-adjusted':'Same-day timetable';}
function serviceDateLabel(mode,date=state.sourceDate||route().date){return mode==='advance'&&date?dateLabel(date,{short:true}).replace(/,/g,''):'';}
function connectionBufferMinutes(arrival,departure){const a=parseMinutes(arrival),d=parseMinutes(departure);if(a==null||d==null)return null;let span=d-a;while(span<0)span+=1440;return span;}
function liveConnectionRiskFor(minutes,minimum){return timetableProvider.connectionRiskFor(minutes,minimum);}
function connectionTimingInfo(service){
  const scheduled=Number(service&&service.connectionMinutes)||0,live=Number.isFinite(service&&service.liveConnectionMinutes)?Number(service.liveConnectionMinutes):null,minimum=Number(service&&service.minimumConnectionMinutes)||10,available=live==null?scheduled:live;
  return {scheduled,live,minimum,available,margin:available-minimum};
}
function connectionTimingText(service){
  const timing=connectionTimingInfo(service),parts=[`Scheduled wait ${timing.scheduled} min`];
  if(timing.live!=null)parts.push(`Live-adjusted wait ${timing.live} min`);
  parts.push(timing.margin>=0?`${timing.margin} min spare`:`${Math.abs(timing.margin)} min short`);
  return parts.join(' · ');
}
function connectionChangeText(service){const timing=connectionTimingInfo(service);return `${timing.live==null?'scheduled':'live'} ${timing.available}m wait`;}
function journeyBadgesMarkup(service){const labels=Array.isArray(service&&service.journeyLabels)?service.journeyLabels:[];return labels.length?`<span class="train-journey-badges">${labels.map(label=>`<em>${esc(label)}</em>`).join('')}</span>`:'';}
function recoverySummary(service){const choice=service&&service.recoveryChoice;if(!choice)return'';return `Backup ${choice.departure||choice.std||'—'} → ${choice.arrival||'—'}${choice.live?' · live':''}`;}
function connectionWarning(service){
  if(!service||service.journeyType!=='connection')return'';
  const change=displayName(service.interchange,'the interchange'),minimum=Number(service.minimumConnectionMinutes)||10,minutes=Number.isFinite(service.liveConnectionMinutes)?service.liveConnectionMinutes:Number(service.connectionMinutes)||0,arrival=service.liveInterchangeArrival?` at ${service.liveInterchangeArrival}`:'',backup=recoverySummary(service),minimumName=service.minimumConnectionSource==='licensed'&&service.minimumConnectionCommercialUse===true?'licensed station minimum':'Kerbside planning buffer';
  if(service.connectionRisk==='first-cancelled')return `The first train is cancelled, so Kerbside cannot assume you can reach ${change}. Re-plan from the origin rather than relying on the onward leg.`;
  if(service.connectionRisk==='onward-cancelled')return `The planned onward train from ${change} is cancelled.${backup?` ${backup} is the next workable timetable option Kerbside found.`:''}`;
  if(service.connectionRisk==='at-risk')return `Live evidence reaches ${change}${arrival}, leaving ${minutes} minutes for the change — below the ${minimum}-minute ${minimumName}.${backup?` ${backup} is the next workable option if this connection is missed.`:''}`;
  if(service.connectionRisk==='tight')return `Live evidence leaves ${minutes} minutes at ${change}, only ${minutes-minimum} minutes above the ${minimum}-minute ${minimumName}.`;
  return'';
}
function recoveryMarkup(service,key){
  if(!service||service.journeyType!=='connection'||!['at-risk','onward-cancelled'].includes(service.connectionRisk))return'';
  const choice=service.recoveryChoice;
  if(!choice)return `<div class="train-recovery-card train-recovery-none"><span>Recovery</span><strong>No later workable onward train found</strong><small>Kerbside checked the loaded timetable recovery window. Refresh as live information changes.</small></div>`;
  const platform=choice.platform?` · Plat ${choice.platform}`:'',live=choice.live?'Live Darwin evidence':'Scheduled timetable',prediction=forecastRecovery(service),reason=prediction&&prediction.reasons&&prediction.reasons[0]||'';
  const forecastMarkup=prediction?`<div class="train-recovery-forecast crowd-${esc(prediction.level||'unknown')}" title="${esc((prediction.reasons||[]).join(', '))}"><i></i><b>${esc(prediction.label||'Forecast pending')}</b><small>${esc(`${crowdSourceText(prediction)}${reason?` · ${reason}`:''}`)}</small></div>`:'';
  return `<div class="train-recovery-card"><span>Backup if missed</span><strong>${esc(`${choice.departure||choice.std||'—'} → ${choice.arrival||'—'}`)}</strong><small>${esc(`${choice.operator||'Onward service'}${platform} · ${live}`)}</small>${forecastMarkup}<div class="train-recovery-actions"><button type="button" class="train-recovery-use" data-use-recovery="${esc(key)}">Use this backup</button><small>Replace the onward leg in this Kerbside journey.</small></div></div>`;
}
function connectionItineraryMarkup(service,result){
  if(!service||service.journeyType!=='connection'||!Array.isArray(service.legs))return'';
  const results=Array.isArray(result&&result.journeyLegResults)?result.journeyLegResults:[];
  const legs=service.legs.map((leg,index)=>{
    const crowd=results[index]||{label:'Forecast pending',level:'unknown',confidence:'Low'};
    const from=displayName(leg.from,'Departure'),to=displayName(leg.to,'Destination'),live=!!leg.liveEvidence;
    const depart=live&&/^\d{1,2}:\d{2}$/.test(String(leg.etd||''))?leg.etd:leg.std,arrive=leg.liveArrival||leg.arrival;
    const platform=leg.platform?`Plat ${leg.platform}`:'Plat TBC',train=leg.trainId?` · ${leg.trainId}`:'';
    const loading=window.__KERBSIDE_TRAIN_LOADING__,coachDetail=crowd&&crowd.liveLoading&&loading&&typeof loading.coachMarkup==='function'?loading.coachMarkup(crowd):'';
    return `<div class="train-connection-leg"><span class="train-connection-time"><b>${esc(depart||'—')}</b><small>${esc(arrive||'—')}${live?' · live':''}</small></span><span class="train-connection-route"><b>${esc(`${from} → ${to}`)}</b><small>${esc(`${leg.operator||'Scheduled service'}${train} · ${platform} · ${live?'live':'scheduled'}`)}</small></span><span class="train-connection-crowd crowd-${esc(crowd.level||'unknown')}" title="${esc((crowd.reasons||[]).join(', '))}"><i></i><b>${esc(crowd.label||'Forecast pending')}</b><small>${esc(crowdSourceText(crowd))}</small></span></div>${coachDetail}`;
  });
  const change=service.interchange||{},timing=connectionTimingInfo(service),risk=service.connectionRisk||change.quality||'scheduled';
  const quality=service.connectionRisk==='at-risk'?'At risk':service.connectionRisk==='tight'?'Tight':service.connectionRisk==='onward-cancelled'?'Onward cancelled':service.connectionRisk==='first-cancelled'?'First train cancelled':String(change.quality||'comfortable').replace(/^./,c=>c.toUpperCase());
  const evidence=connectionEvidenceProvenance(service),source=connectionMinimumProvenance(service),timingText=connectionTimingText(service);
  const changeRow=`<div class="train-connection-change connection-risk-${esc(risk)}"><span>Change at ${esc(displayName(change,'interchange'))}</span><b>${esc(`${timing.available} min available`)}</b><small>${esc(`${quality} connection · ${timingText} · ${source} · ${evidence}`)}</small></div>`;
  return `<div class="train-connection-itinerary"><div class="train-detail-title">Journey plan</div>${legs[0]||''}${changeRow}${legs[1]||''}</div>`;
}


/* ------------------------------------------------------------------
   Overlay merge. Darwin evidence is written onto the timetabled rows in
   place, so the row keeps its identity, its position and its open/closed
   state while gaining expected times, platform changes, cancellations,
   formation and calling points.
------------------------------------------------------------------ */
function resetLegLive(leg){
  if(!leg)return;leg.etd='';leg.platform=leg.scheduledPlatform||leg.platform;leg.isCancelled=false;leg.length=0;leg.formation=null;leg.liveEvidence=false;leg.liveVia='';leg.liveArrival='';leg.cancelReason='';leg.delayReason='';leg.previousCallingPoints=null;leg.subsequentCallingPoints=null;
}
function clearConnectionLive(service){
  if(!service||service.journeyType!=='connection')return false;
  const had=!!(service.liveEvidence||service.secondLiveEvidence||Number.isFinite(service.liveConnectionMinutes)||service.connectionRisk!=='scheduled'||service.recoveryChoice);
  (service.legs||[]).forEach(resetLegLive);(service.recoveryOptions||[]).forEach(resetLegLive);
  service.etd='';service.platform=service.scheduledPlatform||service.platform;service.isCancelled=false;service.length=0;service.liveEvidence=false;service.secondLiveEvidence=false;service.onwardCancelled=false;service.liveVia='';service.cancelReason='';service.delayReason='';service.liveConnectionMinutes=null;service.liveInterchangeArrival='';service.connectionRisk='scheduled';service.recoveryChoice=null;
  return had;
}
function applyEvidence(target,evidence){
  target.etd=evidence.etd;if(evidence.platform)target.platform=evidence.platform;target.isCancelled=evidence.isCancelled;target.length=evidence.length;target.formation=evidence&&evidence.service&&evidence.service.formation||null;
  target.cancelReason=evidence.cancelReason;target.delayReason=evidence.delayReason;target.serviceIdUrlSafe=evidence.serviceIdUrlSafe;target.serviceIdGuid=evidence.serviceIdGuid;
  if(evidence.serviceID)target.liveServiceID=evidence.serviceID;if(evidence.previousCallingPoints)target.previousCallingPoints=evidence.previousCallingPoints;if(evidence.subsequentCallingPoints)target.subsequentCallingPoints=evidence.subsequentCallingPoints;
  target.liveEvidence=true;target.liveVia=evidence.via;
}
function evidenceArrivalAt(overlay,evidence,crs,fallback=''){
  const points=overlay&&evidence?overlay.flattenCallingPoints(evidence.subsequentCallingPoints):[],code=String(crs||'').toUpperCase(),point=points.find(item=>String(item&&item.crs||'').toUpperCase()===code);
  return String(point&&(point.at||point.et||point.st)||fallback||'').trim();
}
function liveDepartureFor(leg){const etd=String(leg&&leg.etd||'').trim();return /^\d{1,2}:\d{2}$/.test(etd)?etd:String(leg&&leg.std||'').trim();}
function updateRecoveryChoice(service,overlay,toCrs,interchangeArrival){
  service.recoveryChoice=null;const change=String(service.interchange&&service.interchange.crs||'').toUpperCase(),minimum=Number(service.minimumConnectionMinutes)||10;
  for(const option of service.recoveryOptions||[]){
    const evidence=overlay&&typeof overlay.evidenceForOnward==='function'?overlay.evidenceForOnward(option,change,toCrs):null;
    if(evidence)applyEvidence(option,evidence);else resetLegLive(option);
    if(option.isCancelled)continue;
    const departure=liveDepartureFor(option),gap=interchangeArrival?connectionBufferMinutes(interchangeArrival,departure):null;
    if(interchangeArrival&&(!Number.isFinite(gap)||gap<minimum))continue;
    const arrival=evidenceArrivalAt(overlay,evidence,toCrs,option.arrival);
    service.recoveryChoice={serviceID:option.serviceID,std:option.std,departure,arrival,operator:option.operator,platform:option.platform,trainId:option.trainId,live:!!evidence};return;
  }
}

function adoptRecoveryOption(service,option,{updateWatch=true}={}){
  if(!service||service.journeyType!=='connection'||!option)return false;
  const first=service.legs&&service.legs[0],previous=service.legs&&service.legs[1];if(!first||!previous)return false;
  const wasWatched=watchMatches(service),next={...option};
  if(!service.replannedFrom)service.replannedFrom={serviceID:stableServiceId(previous),std:previous.std||'',arrival:previous.arrival||''};
  service.legs[1]=next;service.replanned=true;service.replannedFromServiceID=service.replannedFrom.serviceID;service.replannedToServiceID=stableServiceId(next);
  addJourneyLabel(service,'Replanned');
  service.arrival=next.liveArrival||next.arrival||service.arrival;service.arrivalMinute=Number(next.arrivalMinute)||service.arrivalMinute;service.arrivalPlatform=next.arrivalPlatform||'';
  if(Number.isFinite(service.departureMinute)&&Number.isFinite(next.arrivalMinute))service.totalMinutes=next.arrivalMinute-service.departureMinute;
  const scheduledGap=connectionBufferMinutes(first.arrival,next.std),minimum=Number(service.minimumConnectionMinutes)||10;
  if(Number.isFinite(scheduledGap)){service.connectionMinutes=scheduledGap;if(service.interchange){service.interchange.departure=next.std;service.interchange.minutes=scheduledGap;service.interchange.minimum=minimum;service.interchange.margin=scheduledGap-minimum;service.interchange.quality=connectionQuality(scheduledGap,minimum);}}
  const liveGap=service.liveInterchangeArrival?connectionBufferMinutes(service.liveInterchangeArrival,liveDepartureFor(next)):null;
  service.liveConnectionMinutes=Number.isFinite(liveGap)?liveGap:null;service.secondLiveEvidence=!!next.liveEvidence;service.onwardCancelled=!!next.isCancelled;service.liveEvidence=!!(first.liveEvidence||next.liveEvidence);
  const effectiveGap=Number.isFinite(liveGap)?liveGap:scheduledGap;
  service.connectionRisk=first.isCancelled?'first-cancelled':next.isCancelled?'onward-cancelled':liveConnectionRiskFor(effectiveGap,minimum);
  const chosenMinute=Number(next.departureMinute);service.recoveryOptions=(service.recoveryOptions||[]).filter(candidate=>stableServiceId(candidate)!==stableServiceId(next)&&(!Number.isFinite(chosenMinute)||!Number.isFinite(candidate.departureMinute)||candidate.departureMinute>chosenMinute));
  service.recoveryChoice=null;
  if(updateWatch&&wasWatched)persistJourneyWatch(journeyWatchPayload(service));
  return true;
}
function restoreWatchedChoice(service){
  if(!service||service.journeyType!=='connection'||!watchMatches(service)||!state.watch||!state.watch.onwardID)return false;
  const current=stableServiceId(service.legs&&service.legs[1]);if(current===String(state.watch.onwardID))return false;
  const option=(service.recoveryOptions||[]).find(candidate=>stableServiceId(candidate)===String(state.watch.onwardID));return option?adoptRecoveryOption(service,option,{updateWatch:false}):false;
}
function adoptRecoveryByKey(key){
  const index=state.services.findIndex((service,i)=>serviceKey(service,i)===String(key||''));if(index<0)return false;const service=state.services[index],choice=service&&service.recoveryChoice;if(!choice)return false;
  const option=(service.recoveryOptions||[]).find(candidate=>stableServiceId(candidate)===String(choice.serviceID||''));if(!option||!adoptRecoveryOption(service,option))return false;
  renderRows(state.services,{mode:state.mode,manifest:state.manifest});requestOverlay();return true;
}

function mergeOverlay(){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  if(!overlay||state.mode!=='today'||!liveOverlayEligible())return false;
  if(overlay.state.status!=='ready'||!overlayMatchesRoute(overlay))return false;
  const r=route(),toCrs=r.to&&r.to.crs||'';
  const matched=[];let changed=false;
  state.services.forEach(service=>{
    if(service.liveOnly)return;
    if(service.journeyType==='connection'){
      const first=service.legs&&service.legs[0],second=service.legs&&service.legs[1],change=String(service.interchange&&service.interchange.crs||'').toUpperCase();
      const firstEvidence=first?overlay.evidenceFor(first):null,secondEvidence=second&&typeof overlay.evidenceForOnward==='function'?overlay.evidenceForOnward(second,change,toCrs):null;
      if(!firstEvidence&&!secondEvidence){if(clearConnectionLive(service))changed=true;return;}
      if(firstEvidence)matched.push(firstEvidence.index);
      const before=JSON.stringify([service.etd,service.platform,service.isCancelled,service.liveConnectionMinutes,service.connectionRisk,service.secondLiveEvidence,service.recoveryChoice&&service.recoveryChoice.serviceID,first&&first.etd,second&&second.etd,second&&second.isCancelled]);
      if(firstEvidence){applyEvidence(first,firstEvidence);service.etd=first.etd;if(firstEvidence.platform)service.platform=firstEvidence.platform;service.isCancelled=first.isCancelled;service.length=first.length;service.cancelReason=first.cancelReason;service.delayReason=first.delayReason;}
      else resetLegLive(first);
      if(secondEvidence){applyEvidence(second,secondEvidence);second.liveArrival=evidenceArrivalAt(overlay,secondEvidence,toCrs,second.arrival);}else resetLegLive(second);
      const firstArrival=firstEvidence?evidenceArrivalAt(overlay,firstEvidence,change,first&&first.arrival):String(first&&first.arrival||''),secondDeparture=second?liveDepartureFor(second):'',hasLiveTiming=!!(firstEvidence||secondEvidence),minutes=firstArrival&&secondDeparture&&hasLiveTiming?connectionBufferMinutes(firstArrival,secondDeparture):null,minimum=Number(service.minimumConnectionMinutes)||10;
      if(first)first.liveArrival=firstArrival;
      service.liveInterchangeArrival=firstArrival;service.liveConnectionMinutes=Number.isFinite(minutes)?minutes:null;service.secondLiveEvidence=!!secondEvidence;service.onwardCancelled=!!(second&&second.isCancelled);service.liveEvidence=!!(firstEvidence||secondEvidence);
      service.liveVia=firstEvidence&&secondEvidence?'both-legs':firstEvidence?`first-leg-${firstEvidence.via}`:`onward-${secondEvidence&&secondEvidence.via||'live'}`;
      service.connectionRisk=first&&first.isCancelled?'first-cancelled':second&&second.isCancelled?'onward-cancelled':liveConnectionRiskFor(minutes,minimum);
      if(['at-risk','onward-cancelled'].includes(service.connectionRisk))updateRecoveryChoice(service,overlay,toCrs,firstArrival);else service.recoveryChoice=null;
      const after=JSON.stringify([service.etd,service.platform,service.isCancelled,service.liveConnectionMinutes,service.connectionRisk,service.secondLiveEvidence,service.recoveryChoice&&service.recoveryChoice.serviceID,first&&first.etd,second&&second.etd,second&&second.isCancelled]);if(before!==after)changed=true;
      return;
    }
    const evidence=overlay.evidenceFor(service);
    if(!evidence){
      if(service.liveEvidence){service.liveEvidence=false;service.liveVia='';service.etd='';service.platform=service.scheduledPlatform||service.platform;service.isCancelled=false;service.length=0;service.cancelReason='';service.delayReason='';changed=true;}
      return;
    }
    matched.push(evidence.index);
    const before=`${service.etd}|${service.platform}|${service.isCancelled}|${service.length}`;applyEvidence(service,evidence);if(before!==`${service.etd}|${service.platform}|${service.isCancelled}|${service.length}`)changed=true;
  });
  const existing=new Set(state.services.filter(s=>s.liveOnly).map(s=>String(s.serviceID||'')));
  const extras=overlay.extraServices(matched,toCrs).map(({service})=>normaliseLive(service,toCrs)).filter(row=>row.std&&!existing.has(String(row.serviceID||'')));
  if(extras.length){state.services=state.services.concat(extras).sort((a,b)=>(parseMinutes(a.std)??9999)-(parseMinutes(b.std)??9999));changed=true;}
  return changed;
}


/* The status line under the departure time. A timetabled row says so
   plainly rather than borrowing the confidence of a live one. */
function statusFor(service){
  if(service.journeyType==='connection'){
    if(service.connectionRisk==='first-cancelled')return {label:'First train cancelled',cls:'cancelled'};
    if(service.connectionRisk==='onward-cancelled')return {label:'Onward cancelled',cls:'cancelled'};
    if(service.connectionRisk==='at-risk')return {label:'Connection at risk',cls:'late'};
    if(service.connectionRisk==='tight')return {label:'Tight change',cls:'late'};
    return {label:'1 change',cls:'connection'};
  }
  if(service.isCancelled)return {label:'Cancelled',cls:'cancelled'};
  if(!service.liveEvidence)return {label:'Timetabled',cls:'timetabled'};
  const etd=String(service.etd||'').trim();
  if(!etd||/^on time$/i.test(etd))return {label:'On time',cls:'ontime'};
  if(/^\d{1,2}:\d{2}$/.test(etd)){
    const late=parseMinutes(etd),planned=parseMinutes(service.std);let delay=late!=null&&planned!=null?late-planned:null;if(delay!=null&&delay<-720)delay+=1440;if(delay!=null&&delay>720)delay-=1440;
    return {label:`Expected ${etd}`,cls:delay!=null&&delay>=5?'late':'ontime'};
  }
  if(/delay/i.test(etd))return {label:etd,cls:'late'};
  return {label:etd,cls:'ontime'};
}
function modeNote(mode){
  if(mode!=='today')return 'Live delays, cancellations and formation are folded in automatically on the day of travel.';
  return liveOverlayEligible()
    ?'Timetabled services carry live Darwin evidence where it exists: expected times, platform changes, cancellations and formation.'
    :'This service is outside the live Darwin window. Forecast v4 is using the scheduled timetable and planning signals; live Darwin evidence will take priority automatically when the service enters the live window.';
}
/* Forecast v4 owns the bullet-card markup, so the scheduled board asks it
   for the same card the live board shows rather than keeping a second,
   drifting copy. The fallback only matters if v3 has not loaded yet. */
function explainMarkup(result,mode){
  const loading=window.__KERBSIDE_TRAIN_LOADING__;if(result&&result.liveLoading&&loading&&typeof loading.explainMarkup==='function')return loading.explainMarkup(result);
  const v3=window.__KERBSIDE_FORECAST_V3__,date=new Date(`${state.sourceDate||route().date}T12:00:00`);
  if(v3&&typeof v3.detailMarkup==='function')return v3.detailMarkup(result,date,{mode:modeLabel(mode),note:modeNote(mode)});
  const items=(result.reasons||[]).map(reason=>`<li>${esc(reason)}</li>`).join('');
  return `<div class="train-forecast-head"><span class="train-forecast-status"><i></i><strong>${esc(result.label)}</strong></span><span class="train-forecast-meta">${esc(result.confidence)} confidence · Forecast v4 · ${esc(modeLabel(mode))}</span></div><div class="train-forecast-reasons"><span>Why this forecast</span><ul>${items}</ul></div><div class="train-forecast-method">Forecast estimate only — no ticket sales, seat reservations or live carriage occupancy. ${esc(modeNote(mode))}</div>`;
}
/* Calling points only exist once Darwin has been asked with expand=true,
   so they appear on today's rows and stay absent on advance ones rather
   than being faked from the snapshot's own stop list. */
function callingMarkup(service){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,target=service&&service.journeyType==='connection'&&service.legs&&service.legs[0]?service.legs[0]:service;
  if(!overlay||!target||!target.liveEvidence)return '';
  const ahead=overlay.flattenCallingPoints(target.subsequentCallingPoints);
  if(!ahead.length)return '';
  const rows=ahead.slice(0,12).map(point=>{
    const when=String(point.et||point.st||'').trim();
    const cancelled=!!point.isCancelled;
    return `<div class="train-call ahead${cancelled?' cancelled':''}"><i></i><span><b>${esc(point.locationName||point.crs||'Station')}</b><small>${esc(when)}${cancelled?' · cancelled':''}</small></span></div>`;
  }).join('');
  return `<div class="train-calling"><div class="train-detail-title">First-leg calling points</div>${rows}</div>`;
}
function timetableSourceName(){return state.scheduleSource==='network-rail'?'Network Rail Open Data SCHEDULE':'the National Rail Darwin Timetable Files';}
function sourceNote(service){
  if(service.liveOnly)return 'Added by National Rail Darwin after this timetable snapshot was published. Live evidence only.';
  if(service.journeyType==='connection'){
    const minimumText=connectionMinimumProvenance(service),evidence=connectionEvidenceProvenance(service);
    if(service.secondLiveEvidence)return `Both legs are timetabled from ${timetableSourceName()}; ${evidence}. The connection uses ${minimumText}.`;
    if(service.liveEvidence)return `Both legs are timetabled from ${timetableSourceName()}; ${evidence}. The connection uses ${minimumText}.`;
    return `Both legs are timetabled from ${timetableSourceName()}; ${evidence}. The connection uses ${minimumText}; Kerbside does not treat the Connecting Train Identifiers feed as a station minimum-time source.`;
  }
  if(service.liveEvidence)return `Timetabled from ${timetableSourceName()}, matched to live Darwin data by ${service.liveVia==='rid'?'service ID':service.liveVia==='uid'?'schedule UID':service.liveVia==='headcode'?'headcode':'departure time'}.`;
  return `Timetabled from ${timetableSourceName()}. Live expected times, platform changes, cancellations and formation are added automatically once this service enters the live Darwin window.`;
}
function serviceMarkup(service,index,forecastResult,{mode,destinationFallback,explains}){
  const key=serviceKey(service,index),open=!!state.openId&&state.openId===key,connection=service.journeyType==='connection';
  const explain=explainMarkup(forecastResult,mode);
  if(Array.isArray(explains))explains.push(explain);
  const terminus=connection?displayName(service.displayDestination,destinationFallback):terminusText(service,destinationFallback);
  const duration=service.totalMinutes?durationLabel('00:00',`${String(Math.floor(service.totalMinutes/60)%24).padStart(2,'0')}:${String(service.totalMinutes%60).padStart(2,'0')}`):durationLabel(service.std,service.arrival);
  const status=statusFor(service),line=[];
  if(connection){
    line.push(`via ${displayName(service.interchange,'interchange')}`);
    line.push(connectionChangeText(service));
    if(service.arrival)line.push(`arr ${service.arrival}`);
  }else{
    line.push(service.operator||'Scheduled service');
    if(service.arrival)line.push(`arr ${service.arrival}`);
    line.push(service.platform?`Plat ${service.platform}`:'Plat TBC');
    if(service.liveOnly)line.push('extra service');
  }
  const arrivesLabel=duration?`Arrives · ${duration}`:'Arrives';
  const warning=connection?connectionWarning(service):'';
  const disruption=service.isCancelled
    ?`This service is cancelled.${service.cancelReason?` ${service.cancelReason}.`:''} Its knock-on demand is included in the trains either side of it.`
    :(warning||(service.delayReason?`${service.delayReason}.`:''));
  const formation=Number(service.length)||0;
  const serviceDate=serviceDateLabel(mode);
  const shownChange=connection&&Number.isFinite(service.liveConnectionMinutes)?service.liveConnectionMinutes:service.connectionMinutes;
  const rightLabel=connection?`${shownChange}m`:(formation?`${formation} coach${formation===1?'':'es'}`:(duration||'—'));
  const rightNote=connection?(Number.isFinite(service.liveConnectionMinutes)?'live change':'scheduled change'):(formation?'formation':(duration?'journey time':'duration unknown'));
  const crowdNote=service.isCancelled?'service cancelled':connection?crowdSourceText(forecastResult,true):crowdSourceText(forecastResult);
  const detailGrid=connection
    ?`<div class="train-detail-grid"><div><span>Depart</span><b>${esc(`${service.std||'—'} · ${displayName(service.legs&&service.legs[0]&&service.legs[0].from,'Departure')}`)}</b></div><div><span>Change</span><b>${esc(displayName(service.interchange,'Interchange'))}</b></div><div><span>Connection</span><b>${esc(connectionChangeText(service))}</b></div><div><span>Arrive</span><b>${esc(`${service.arrival||'—'} · ${destinationFallback}`)}</b></div></div>`
    :`<div class="train-detail-grid"><div><span>From</span><b>${esc(originText(service))}</b></div><div><span>Operator</span><b>${esc(service.operator||'Unknown')}</b></div><div><span>Platform</span><b>${esc(service.platform||'TBC')}</b></div><div><span>${esc(arrivesLabel)}</span><b>${esc(service.arrival||'Not timetabled')}</b></div></div>`;
  return `<article class="train-service train-scheduled-service${connection?' train-connection-service':''}${open?' open':''}" data-service-id="${esc(key)}">
      <button class="train-service-summary" type="button" data-scheduled-toggle="${esc(key)}" aria-expanded="${open?'true':'false'}" aria-controls="train-scheduled-detail-${esc(key)}">
        <span class="train-time"><b>${esc(service.std||'—')}</b><small class="train-status train-status-${esc(status.cls)}">${esc(status.label)}</small>${serviceDate?`<small class="train-service-date">${esc(serviceDate)}</small>`:''}</span>
        <span class="train-route">${journeyBadgesMarkup(service)}<strong>${esc(terminus)}</strong><small>${esc(line.join(' · '))}</small></span>
        <span class="train-crowding crowd-${esc(forecastResult.level)}" title="${esc((forecastResult.reasons||[]).join(', '))}"><i></i><b>${esc(forecastResult.label)}</b><small>${esc(crowdNote)}</small></span>
        <span class="train-formation"><b>${esc(rightLabel)}</b><small>${esc(rightNote)}</small></span>
        <span class="train-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="train-service-detail" id="train-scheduled-detail-${esc(key)}"${open?'':' hidden'}>
        ${detailGrid}
        ${connection?connectionItineraryMarkup(service,forecastResult):''}
        ${connection?recoveryMarkup(service,key):''}
        ${journeyWatchMarkup(service,key)}
        <div class="train-crowding-explain crowd-${esc(forecastResult.level)}">${explain}</div>
        ${disruption?`<div class="train-detail-note train-detail-warn">${esc(disruption)}</div>`:''}
        ${callingMarkup(service)}
        <div class="train-detail-note">${esc(sourceNote(service))}</div>
      </div>
    </article>`;
}
function renderServices(items,{mode,manifest}){
  const raw=Array.isArray(items)?items:[],r=route();
  const origin=raw.map(item=>item&&(item.from||(Array.isArray(item.legs)&&item.legs[0]&&item.legs[0].from))).find(item=>item&&String(item.crs||'').toUpperCase()===String(r.from&&r.from.crs||'').toUpperCase());
  const resolved=displayName(origin,'');
  if(r.from&&resolved&&resolved!==r.from.crs)r.from.name=resolved;
  const normalised=raw.map(normalise);normalised.forEach(restoreWatchedChoice);
  const rendered=renderRows(normalised,{mode,manifest});
  if(typeof document.dispatchEvent==='function'&&typeof CustomEvent==='function')setTimeout(()=>document.dispatchEvent(new CustomEvent('kerbside:timetable-services-ready',{detail:{date:r.date,connections:state.services.filter(service=>service&&service.journeyType==='connection').length}})),0);
  return rendered;
}
/* Re-rendering after an overlay merge must not run normalise() again: the
   rows already carry live evidence and normalise() would strip it straight
   back out. renderServices() normalises raw provider output; renderRows()
   paints rows that are already in shape. */
function renderRows(rows,{mode,manifest}){
  const board=scheduledBoard();if(!board)return;setHeader(mode,manifest);state.services=rows;state.mode=mode;state.sourceDate=route().date;
  const r=route(),coverage=coverageNote(manifest,r.date);
  const keys=new Set(state.services.map((s,i)=>serviceKey(s,i)));
  if(state.openId&&!keys.has(state.openId))state.openId='';
  if(!state.services.length){board.innerHTML=`<div class="train-empty train-future-date train-future-card"><span class="train-future-badge">Official timetable</span><strong>No suitable direct or one-change journeys found</strong><span>${esc(coverage||'The timetable snapshot returned no matching journeys for this date and departure time.')}</span></div>`;return;}
  const destinationFallback=displayName(r.to,'Destination'),explains=[];
  board.innerHTML=state.services.map((s,i)=>serviceMarkup(s,i,forecast(s,i,state.services),{mode,destinationFallback,explains})).join('')
    +`<div class="train-empty train-future-date train-future-card train-scheduled-foot"><span class="train-future-badge">Official timetable</span><span class="train-future-note">${esc(coverage)} Scheduled journey options come from ${esc(timetableSourceName())}. Where an authoritative station minimum is not loaded, one-change results use an explicit conservative Kerbside fallback; CTI is not treated as a minimum-time feed. Live Darwin evidence can update both legs and recovery options.</span></div>`;
  /* Prime the markup cache refreshForecasts() compares against, so the first
     Forecast v4 pass after render is a genuine no-op rather than a rewrite. */
  board.querySelectorAll('.train-scheduled-service .train-crowding-explain').forEach((el,i)=>{el.__kerbsideMarkup=explains[i];});
}

/* Called by Forecast v4 whenever its inputs change after render - the bank
   holiday calendar resolving, or the events module returning fixtures for
   the chosen date. Previously v3.apply() only walked #trainBoard, so an
   advance journey kept whatever score it happened to have at first paint
   and never saw event pressure at all. Writes are compared before they are
   applied so a no-op refresh produces no DOM mutation. */
function refreshForecasts(){
  const board=$('trainScheduledBoard');
  if(!board||board.hidden||!state.services.length)return false;
  let changed=false;
  board.querySelectorAll('.train-scheduled-service').forEach((article,position)=>{
    const id=article.getAttribute('data-service-id');
    let index=state.services.findIndex((s,i)=>serviceKey(s,i)===id);
    if(index<0)index=position;
    const service=state.services[index];
    if(!service)return;
    const result=forecast(service,index,state.services);
    const statusEl=article.querySelector('.train-status');
    if(statusEl){
      const status=statusFor(service),cls=`train-status train-status-${status.cls}`;
      if(statusEl.className!==cls){statusEl.className=cls;changed=true;}
      if(statusEl.textContent!==status.label){statusEl.textContent=status.label;changed=true;}
    }
    const crowd=article.querySelector('.train-crowding');
    if(crowd){
      const cls=`train-crowding crowd-${result.level}`,title=(result.reasons||[]).join(', ');
      const conf=service.isCancelled?'service cancelled':service.journeyType==='connection'?crowdSourceText(result,true):crowdSourceText(result);
      const b=crowd.querySelector('b'),small=crowd.querySelector('small');
      if(crowd.className!==cls){crowd.className=cls;changed=true;}
      if(b&&b.textContent!==result.label){b.textContent=result.label;changed=true;}
      if(small&&small.textContent!==conf){small.textContent=conf;changed=true;}
      if(crowd.title!==title){crowd.title=title;changed=true;}
    }
    if(service.journeyType==='connection'&&Array.isArray(result.journeyLegResults)){
      article.querySelectorAll('.train-connection-crowd').forEach((legEl,legIndex)=>{
        const legResult=result.journeyLegResults[legIndex];if(!legResult)return;
        const cls=`train-connection-crowd crowd-${legResult.level||'unknown'}`,b=legEl.querySelector('b'),small=legEl.querySelector('small');
        if(legEl.className!==cls){legEl.className=cls;changed=true;}
        if(b&&b.textContent!==legResult.label){b.textContent=legResult.label;changed=true;}
        const note=crowdSourceText(legResult);if(small&&small.textContent!==note){small.textContent=note;changed=true;}
        const legTitle=(legResult.reasons||[]).join(', ');if(legEl.title!==legTitle){legEl.title=legTitle;changed=true;}
      });
      const recoveryEl=article.querySelector('.train-recovery-forecast'),recoveryResult=forecastRecovery(service);
      if(recoveryEl&&recoveryResult){
        const cls=`train-recovery-forecast crowd-${recoveryResult.level||'unknown'}`,b=recoveryEl.querySelector('b'),small=recoveryEl.querySelector('small'),reason=recoveryResult.reasons&&recoveryResult.reasons[0]||'',note=`${crowdSourceText(recoveryResult)}${reason?` · ${reason}`:''}`,title=(recoveryResult.reasons||[]).join(', ');
        if(recoveryEl.className!==cls){recoveryEl.className=cls;changed=true;}if(b&&b.textContent!==recoveryResult.label){b.textContent=recoveryResult.label;changed=true;}if(small&&small.textContent!==note){small.textContent=note;changed=true;}if(recoveryEl.title!==title){recoveryEl.title=title;changed=true;}
      }
    }
    const explain=article.querySelector('.train-crowding-explain');
    if(explain){
      const cls=`train-crowding-explain crowd-${result.level}`,markup=explainMarkup(result,state.mode);
      if(explain.className!==cls){explain.className=cls;changed=true;}
      if(explain.__kerbsideMarkup!==markup){explain.__kerbsideMarkup=markup;explain.innerHTML=markup;changed=true;}
    }
  });
  return changed;
}
function renderUnavailable(message,{mode='future',manifest=null}={}){const board=scheduledBoard();if(!board)return;setHeader(mode,manifest);state.services=[];state.mode=mode;const r=route(),from=displayName(r.from,'Departure station'),to=displayName(r.to,'destination'),complete=!!(r.from&&r.to);board.innerHTML=`<div class="train-empty train-future-date train-future-card"><span class="train-future-badge">Official timetable</span><strong>${esc(complete?dateLabel(r.date):'Choose your journey')}</strong><span class="train-future-route">${esc(complete?`${from} → ${to}`:'Select both From and To stations')}</span><span class="train-future-note">${esc(message||'Scheduled services are not available for this date in the current timetable snapshot.')}</span></div>`;}
async function load(options={}){
  const mode=options.mode||journeyMode();
  if(!mode){setLiveMode();return false;}
  const r=route();state.signature=routeSignature();
  if(!r.from||!r.to){renderUnavailable('Select both stations, then use Find trains to search the official timetable.',{mode});return true;}
  const id=++state.request;state.loading=true;state.lastError='';
  const board=scheduledBoard();setScheduledVisibility(true);if(board)board.innerHTML='<div class="train-empty train-future-date train-future-card"><span class="train-future-badge">Official timetable</span><strong>Loading scheduled services…</strong><span>Reading the official timetable snapshot and preparing Forecast v4.</span></div>';
  try{
    const manifest=await timetableProvider.getCoverage();
    if(id!==state.request)return true;
    clampDatePicker(manifest);
    if(!manifest.dates.includes(r.date)){
      /* For today a stale snapshot is not a dead end - the live board can
         still answer. Only an uncovered future date has nothing to fall
         back to. */
      if(dateApi()&&dateApi().isToday()){state.mode='live';setLiveMode();maybeReturnToLive('today');return false;}
      const range=manifest.dates.length?`${dateLabel(manifest.dates[0],{short:true})} to ${dateLabel(manifest.dates[manifest.dates.length-1],{short:true})}`:'the current snapshot';
      renderUnavailable(`The available timetable covers ${range}. Choose a date inside that range.`,{mode,manifest});return true;
    }
    const requestedTime=options.departAfter||r.departAfter||'00:00';
    const edgeCoverage=coverageFor(manifest,r.date);
    if(edgeCoverage&&edgeCoverage.partial&&!coverageIncludesTime(edgeCoverage,requestedTime)){
      state.edgeRefreshAt=Date.now();
      renderUnavailable(`The current Darwin snapshot only covers ${edgeCoverage.from}–${edgeCoverage.to} on this edge date. ${requestedTime} is beyond that window. Kerbside is checking automatically for today's newer timetable snapshot; this is not being treated as proof that there are no trains.`,{mode,manifest});
      return true;
    }
    const items=await timetableProvider.getServices({from:r.from.crs,to:r.to.crs,date:r.date,departAfter:requestedTime});
    if(id!==state.request)return true;
    renderServices(items,{mode,manifest});
    requestOverlay();
  }catch(e){
    if(id===state.request){
      state.lastError=e&&e.message||String(e);
      if(mode==='advance'||(dateApi()&&typeof dateApi().isToday==='function'&&!dateApi().isToday())){
        setScheduledVisibility(true);
        renderUnavailable(`Timetable temporarily unavailable. ${state.lastError} Retry this journey in a moment.`,{mode,manifest:state.manifest});
      }else setLiveMode();
    }
    return false;
  }finally{if(id===state.request)state.loading=false;}
  return true;
}
/* Retained for callers that predate the unified board. 'same-day' is no
   longer a mode of its own - today is just a journey with a live overlay. */
function loadSameDay({departAfter=currentTime()}={}){return load({mode:'today',departAfter});}
/* Leaving the journey board for any reason - destination cleared, snapshot
   gone stale - has to put the live departure board back. The old guard only
   fired for the retired 'same-day' mode, so clearing a destination left the
   user staring at a hidden board. */
function maybeReturnToLive(previousMode){if(!previousMode||previousMode==='live')return;const live=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;if(live&&typeof live.handleJourneyChange==='function')setTimeout(()=>live.handleJourneyChange(),0);}
/* Clamp the date picker to the combined published timetable coverage. Darwin
   normally owns the near term while Network Rail SCHEDULE extends the same
   journey planner across the rolling long-range window. */
function clampDatePicker(manifest){
  const input=$('trainTravelDate'),dates=manifest&&Array.isArray(manifest.dates)?manifest.dates:[];
  if(!input||!dates.length)return;
  const last=dates[dates.length-1];
  if(last&&input.max!==last)input.max=last;
}
function requestOverlay(){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,r=route();
  if(!overlay)return false;
  if(state.mode!=='today'||!r.from||!r.from.crs||!liveOverlayEligible()){
    if(typeof overlay.stop==='function')overlay.stop();
    if(typeof overlay.clear==='function')overlay.clear();
    return false;
  }
  const connections=state.services.filter(service=>service&&service.journeyType==='connection'),connectionTargets=[...new Set(connections.map(service=>service.interchange&&service.interchange.crs).filter(Boolean))],onwardTargets=connections.map(service=>({from:service.interchange&&service.interchange.crs,to:r.to&&r.to.crs})).filter(item=>item.from&&item.to);
  const pending=overlay.refresh({crs:r.from.crs,date:r.date,connectionTargets,onwardTargets});
  /* A route sync can repaint scheduled rows while the matching live board is
     still fresh. refresh() deliberately does not emit another event on a
     cache hit, so re-apply the cached evidence after every successful call. */
  Promise.resolve(pending).then(ok=>{if(ok)handleOverlay();}).catch(()=>{});
  overlay.start();
  return true;
}
function handleOverlay(){
  if(state.mode!=='today')return;
  if(!mergeOverlay())return;
  /* A merge can add rows, so re-render rather than patch. renderServices
     keeps the open row and reuses the same forecast pipeline. */
  renderRows(state.services,{mode:state.mode,manifest:state.manifest});
}
async function refreshEdgeManifest(){const r=route(),manifest=state.darwinManifest||state.manifest;if(state.loading||!r.date||!manifest||!Array.isArray(manifest.dates)||!manifest.dates.length)return false;const coverage=coverageFor(manifest,r.date),last=manifest.dates[manifest.dates.length-1],needs=r.date===last&&coverage&&coverage.partial&&!coverageIncludesTime(coverage,r.departAfter||'00:00');if(!needs)return false;if(state.edgeRefreshAt&&Date.now()-state.edgeRefreshAt<EDGE_MANIFEST_RECHECK_MS)return false;state.edgeRefreshAt=Date.now();const before=String(manifest.timetableId||'');try{const next=await timetableProvider.refreshCoverage(),nextDarwin=state.darwinManifest||next;if(!nextDarwin||String(nextDarwin.timetableId||'')===before)return false;state.signature='';await load({mode:journeyMode()||(dateApi()&&dateApi().isToday()?'today':'advance')});return true;}catch(error){return false;}}
function sync(){
  const sig=routeSignature();
  if(sig===state.signature){if(journeyMode()&&state.mode!=='live')setHeader(state.mode,state.manifest);return;}
  const previous=state.mode;state.signature=sig;const mode=journeyMode();
  if(mode)load({mode});else{
    state.mode='live';setLiveMode();
    const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;if(overlay){overlay.stop();overlay.clear();}
    maybeReturnToLive(previous);
  }
}
function init(){
  state.watch=readJourneyWatch();
  document.addEventListener('kerbside:live-overlay',()=>setTimeout(handleOverlay,0));
  document.addEventListener('kerbside:train-date-change',()=>setTimeout(sync,60));
  document.addEventListener('kerbside:train-route-change',()=>setTimeout(sync,60));
  window.addEventListener('kerbside:journey-planner-change',()=>setTimeout(sync,120));
  state.signature='';setTimeout(sync,0);setInterval(sync,1000);setInterval(()=>refreshEdgeManifest(),30*1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,recoverySummary,forecastConnection,forecastRecovery,effectiveDepartAfter,railNowTime,adoptRecoveryByKey,toggleJourneyWatchByKey,watchMatches,connectionMinimumProvenance,connectionEvidenceProvenance,provider:timetableProvider};
})();


/* ------------------------------------------------------------------
   Long-range Network Rail SCHEDULE adapter.

   The existing Darwin timetable provider remains the preferred near-term
   source. This adapter adds the separately deployed Network Rail SCHEDULE
   snapshot underneath it and only takes over when Darwin does not genuinely
   cover the requested date/time. The returned row shape is identical, so the
   established direct/connection planner and Forecast v4 stay single-source.
------------------------------------------------------------------ */
;(function(){
'use strict';
const api=window.__KERBSIDE_TRAIN_TIMETABLE__,provider=window.__KERBSIDE_TIMETABLE_PROVIDER__;
if(!api||!provider||provider.__kerbsideDualSource)return;
const NETWORK_RAIL_DATA_BASE='https://kerbside-rail-data-zetabun.pages.dev';
const MANIFEST_CACHE_MS=5*60*1000,REQUEST_TIMEOUT_MS=12000;
const original={
  getCoverage:provider.getCoverage.bind(provider),
  refreshCoverage:provider.refreshCoverage.bind(provider),
  getServices:provider.getServices.bind(provider)
};
const nr={manifestPromise:null,manifest:null,checkedAt:0,locationsPromise:null,datePromises:new Map()};

function addDays(stamp,days){const d=new Date(`${stamp}T12:00:00Z`);if(Number.isNaN(d.getTime()))return stamp;d.setUTCDate(d.getUTCDate()+Number(days||0));return d.toISOString().slice(0,10);}
function parseMinutes(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;const h=Number(m[1]),n=Number(m[2]);return h>=0&&h<24&&n>=0&&n<60?h*60+n:null;}
function coverageIncludes(coverage,value){
  if(typeof api.coverageIncludesTime==='function')return api.coverageIncludesTime(coverage,value);
  if(!coverage)return false;if(!coverage.partial)return true;
  const minute=parseMinutes(value),from=parseMinutes(coverage.from),to=parseMinutes(coverage.to);if(minute==null)return true;
  return (from==null||minute>=from)&&(to==null||minute<=to);
}
async function fetchBytes(url,{json=false}={}){
  const controller=typeof AbortController==='function'?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS):null;
  try{
    const response=await fetch(url,{cache:json?'no-cache':'default',headers:json?{Accept:'application/json'}:undefined,...(controller?{signal:controller.signal}:{})});
    if(!response.ok)throw new Error(`Long-range timetable returned ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }catch(error){
    if(error&&error.name==='AbortError')throw new Error('Long-range timetable request timed out.');
    throw error;
  }finally{if(timer)clearTimeout(timer);}
}
async function fetchJson(url){const bytes=await fetchBytes(url,{json:true});return JSON.parse(new TextDecoder().decode(bytes));}
async function fetchGzipJson(url){
  const bytes=await fetchBytes(url);let text='';
  if(bytes.length>=2&&bytes[0]===0x1f&&bytes[1]===0x8b){
    if(typeof DecompressionStream!=='function')throw new Error('This browser cannot decompress the long-range timetable file.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    text=await new Response(stream).text();
  }else text=new TextDecoder().decode(bytes);
  return JSON.parse(text);
}
function clearNetworkRailCaches(){nr.locationsPromise=null;nr.datePromises.clear();}
function loadNetworkRailManifest({force=false}={}){
  const expired=!nr.checkedAt||Date.now()-nr.checkedAt>=MANIFEST_CACHE_MS;
  if(!nr.manifestPromise||force||expired){
    const previousId=nr.manifest&&nr.manifest.timetableId||'';
    nr.manifestPromise=fetchJson(`${NETWORK_RAIL_DATA_BASE}/manifest.json`).then(value=>{
      const nextId=value&&value.timetableId||'';if(previousId&&nextId&&previousId!==nextId)clearNetworkRailCaches();
      nr.manifest=value;nr.checkedAt=Date.now();return value;
    }).catch(error=>{nr.manifestPromise=null;if(nr.manifest)return nr.manifest;throw error;});
  }
  return nr.manifestPromise;
}
function loadNetworkRailLocations(){if(!nr.locationsPromise)nr.locationsPromise=fetchJson(`${NETWORK_RAIL_DATA_BASE}/locations.json`).catch(error=>{nr.locationsPromise=null;throw error;});return nr.locationsPromise;}
function loadNetworkRailDate(stamp){if(!nr.datePromises.has(stamp))nr.datePromises.set(stamp,fetchGzipJson(`${NETWORK_RAIL_DATA_BASE}/${encodeURIComponent(stamp)}.json.gz`).catch(error=>{nr.datePromises.delete(stamp);throw error;}));return nr.datePromises.get(stamp);}
function unionCoverage(a,b){
  if(!a)return b||null;if(!b)return a||null;
  const from=[a.from,b.from].filter(Boolean).sort()[0]||'',to=[a.to,b.to].filter(Boolean).sort().slice(-1)[0]||'';
  return {from,to,partial:!!a.partial&&!!b.partial};
}
function combinedManifest(darwin,networkRail){
  const dateSet=new Set([...(darwin&&Array.isArray(darwin.dates)?darwin.dates:[]),...(networkRail&&Array.isArray(networkRail.dates)?networkRail.dates:[])]),dates=[...dateSet].sort(),coverage={};
  for(const stamp of dates)coverage[stamp]=unionCoverage(darwin&&darwin.coverage&&darwin.coverage[stamp],networkRail&&networkRail.coverage&&networkRail.coverage[stamp]);
  return {
    schema:1,source:'Kerbside combined rail timetable',
    timetableId:darwin&&darwin.timetableId||networkRail&&networkRail.timetableId||'',dates,coverage,
    tocNames:{...(networkRail&&networkRail.tocNames||{}),...(darwin&&darwin.tocNames||{})},
    sources:{darwin:darwin||null,networkRail:networkRail||null}
  };
}
async function loadCoverage({force=false}={}){
  const darwinPromise=force?original.refreshCoverage():original.getCoverage();
  const [darwinResult,networkRailResult]=await Promise.allSettled([darwinPromise,loadNetworkRailManifest({force})]);
  const darwin=darwinResult.status==='fulfilled'?darwinResult.value:null,networkRail=networkRailResult.status==='fulfilled'?networkRailResult.value:null;
  if(!darwin&&!networkRail)throw (darwinResult.reason||networkRailResult.reason||new Error('No timetable source is available.'));
  api.state.darwinManifest=darwin;api.state.networkRailManifest=networkRail;
  const combined=combinedManifest(darwin,networkRail);api.state.manifest=combined;return {darwin,networkRail,combined};
}
function manifestCovers(manifest,stamp,time){return !!(manifest&&Array.isArray(manifest.dates)&&manifest.dates.includes(stamp)&&coverageIncludes(manifest.coverage&&manifest.coverage[stamp],time));}
function selectSource(name,manifest){api.state.scheduleSource=name;api.state.sourceManifest=manifest||null;}
async function networkRailServices(manifest,options){
  const next=addDays(options.date,1),dates=[options.date,...(manifest.dates.includes(next)?[next]:[])];
  const [locations,...sets]=await Promise.all([loadNetworkRailLocations(),...dates.map(loadNetworkRailDate)]),rows=[],seen=new Set();
  for(const set of sets)for(const row of Array.isArray(set)?set:[]){const key=String(row&&((row[0]||row[1]||row[2]))||'');if(key&&seen.has(key))continue;if(key)seen.add(key);rows.push(row);}
  return provider.journeysFromRows(rows,locations,manifest,options);
}
provider.getCoverage=async(options={})=>(await loadCoverage({force:!!options.force})).combined;
provider.refreshCoverage=async()=>(await loadCoverage({force:true})).combined;
provider.getServices=async options=>{
  const coverage=await loadCoverage(),time=options.departAfter||'00:00';
  if(manifestCovers(coverage.darwin,options.date,time)){
    selectSource('darwin',coverage.darwin);
    try{return await original.getServices(options);}catch(error){
      if(!manifestCovers(coverage.networkRail,options.date,time))throw error;
    }
  }
  if(manifestCovers(coverage.networkRail,options.date,time)){
    selectSource('network-rail',coverage.networkRail);
    return networkRailServices(coverage.networkRail,options);
  }
  selectSource('',null);return [];
};
provider.__kerbsideDualSource=true;
window.__KERBSIDE_LONG_RANGE_TIMETABLE__={state:nr,base:NETWORK_RAIL_DATA_BASE,loadCoverage,manifestCovers};
})();
