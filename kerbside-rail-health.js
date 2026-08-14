(function(){
'use strict';

if(typeof window==='undefined')return;

const VERSION=1;
const MANIFEST_URL='kerbside-rail-timetable/manifest.json';
const MANIFEST_REFRESH_MS=5*60*1000;
const REFRESH_MS=30*1000;
const SNAPSHOT_DEGRADED_MS=30*60*60*1000;
const SNAPSHOT_DOWN_MS=52*60*60*1000;
const OVERLAY_STALE_MS=2*60*1000;
const STATUS_ORDER={healthy:0,standby:0,checking:1,degraded:2,down:3};
const LABEL={healthy:'Healthy',standby:'Standby',checking:'Checking',degraded:'Degraded',down:'Down'};

const state={
  current:null,
  updatedAt:0,
  manifest:null,
  manifestCheckedAt:0,
  manifestError:'',
  manifestPromise:null,
  timer:null,
  installed:false,
  lastAttemptSignature:'',
  session:{liveFailures:0,liveTimeouts:0}
};

const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
const now=()=>Date.now();

function text(value){return String(value==null?'':value).trim();}
function upper(value){return text(value).toUpperCase();}
function parseMinute(value){
  const match=text(value).match(/^(\d{1,2}):(\d{2})$/);
  if(!match)return null;
  const hour=Number(match[1]),minute=Number(match[2]);
  return hour>=0&&hour<24&&minute>=0&&minute<60?hour*60+minute:null;
}
function snapshotDate(value){
  const match=text(value).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/);
  if(!match)return null;
  const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]),Number(match[4]),Number(match[5]),Number(match[6]||0)));
  return Number.isNaN(date.getTime())?null:date;
}
function ageLabel(ms){
  if(!Number.isFinite(ms)||ms<0)return'age unknown';
  if(ms<90*1000)return`${Math.max(0,Math.round(ms/1000))} sec old`;
  if(ms<90*60*1000)return`${Math.round(ms/60000)} min old`;
  if(ms<48*60*60*1000)return`${Math.round(ms/3600000)} hr old`;
  return`${Math.round(ms/86400000)} days old`;
}
function percent(value){return Number.isFinite(value)?`${Math.round(value*100)}%`:'—';}
function worse(a,b){return (STATUS_ORDER[b]||0)>(STATUS_ORDER[a]||0)?b:a;}
function londonStamp(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function selectedDate(){return text($('trainTravelDate')&&$('trainTravelDate').value);}
function selectedTime(){return text($('trainDepartAfter')&&$('trainDepartAfter').value);}

function coverageState(manifest,date,time){
  if(!manifest||!Array.isArray(manifest.dates))return{status:'down',partial:false,inside:false,detail:'Timetable manifest unavailable.'};
  const chosen=date||manifest.dates[0]||'';
  if(!chosen)return{status:'degraded',partial:false,inside:false,detail:'Timetable snapshot has no published dates.'};
  if(!manifest.dates.includes(chosen))return{status:'down',partial:false,inside:false,detail:`${chosen} is not in the current timetable snapshot.`};
  const coverage=manifest.coverage&&manifest.coverage[chosen];
  if(!coverage)return{status:'degraded',partial:false,inside:true,detail:`${chosen} has no coverage window metadata.`};
  if(!coverage.partial)return{status:'healthy',partial:false,inside:true,from:text(coverage.from),to:text(coverage.to),detail:`${chosen} full-day ${coverage.from||'00:00'}–${coverage.to||'23:59'}.`};
  const minute=parseMinute(time),from=parseMinute(coverage.from),to=parseMinute(coverage.to);
  const inside=minute==null||((from==null||minute>=from)&&(to==null||minute<=to));
  return{status:'degraded',partial:true,inside,from:text(coverage.from),to:text(coverage.to),detail:`${chosen} partial ${coverage.from||'?'}–${coverage.to||'?'}${time?` · ${time} ${inside?'inside':'outside'} coverage`:''}.`};
}

function timetableHealth(manifestOverride){
  const api=window.__KERBSIDE_TRAIN_TIMETABLE__,runtime=api&&api.state||null;
  const manifest=manifestOverride||runtime&&runtime.manifest||state.manifest;
  if(!manifest){
    const error=text(runtime&&runtime.lastError)||state.manifestError;
    return{status:error?'degraded':'checking',label:error?'Manifest unavailable':'Loading manifest',timetableId:'',ageMs:null,dates:[],coverage:null,detail:error||'Waiting for the local Darwin timetable manifest.',error};
  }
  const stamp=snapshotDate(manifest.timetableId),ageMs=stamp?Math.max(0,now()-stamp.getTime()):null;
  const dates=Array.isArray(manifest.dates)?manifest.dates:[],today=londonStamp();
  const date=selectedDate()||(dates.includes(today)?today:dates[0]||'');
  const coverage=coverageState(manifest,date,selectedTime());
  let status=coverage.status;
  if(ageMs!=null){
    if(ageMs>SNAPSHOT_DOWN_MS)status='down';
    else if(ageMs>SNAPSHOT_DEGRADED_MS)status=worse(status,'degraded');
  }else status=worse(status,'degraded');
  const id=text(manifest.timetableId);
  const detail=`Snapshot ${id||'unknown'}${ageMs!=null?` · ${ageLabel(ageMs)}`:''} · ${coverage.detail}`;
  return{status,label:LABEL[status],timetableId:id,ageMs,dates:Array.isArray(manifest.dates)?manifest.dates.slice():[],selectedDate:date,coverage,detail,error:text(runtime&&runtime.lastError)};
}

function stationHealth(){
  const api=window.__KERBSIDE_STATION_DATA__,source=api&&api.state||null;
  if(!source)return{status:'standby',label:'Not loaded',source:'missing',count:0,searches:0,fallbacks:0,detail:'Local station index has not loaded yet.',error:''};
  const mode=text(source.source)||'idle',count=Number(source.count)||0,searches=Number(source.searches)||0,fallbacks=Number(source.fallbacks)||0,error=text(source.error);
  let status='standby';
  if(mode==='local'&&count>0)status='healthy';
  else if(mode==='loading')status='checking';
  else if(mode==='fallback')status='degraded';
  else if(error)status='degraded';
  const detail=mode==='local'?`Local Darwin station index · ${count.toLocaleString('en-GB')} stations · ${searches} local search${searches===1?'':'es'}.`
    :mode==='fallback'?`Local station index unavailable; Huxley search fallback active${error?` · ${error}`:''}.`
    :mode==='loading'?'Loading the local Darwin station index.':'Station index is standing by.';
  return{status,label:LABEL[status],source:mode,count,searches,fallbacks,detail,error};
}

function trackAttempts(attempts,liveState){
  const list=Array.isArray(attempts)?attempts:[];
  if(!list.length)return;
  const signature=JSON.stringify([liveState&&liveState.lastUrl,liveState&&liveState.source,liveState&&liveState.lastStatus,list]);
  if(signature===state.lastAttemptSignature)return;
  state.lastAttemptSignature=signature;
  state.session.liveFailures+=list.filter(item=>item&&(item.error||item.timedOut||Number(item.status)>=400||Number(item.status)===0)).length;
  state.session.liveTimeouts+=list.filter(item=>item&&item.timedOut).length;
}

function liveHealth({track=true}={}){
  const api=window.__KERBSIDE_TRAIN_LIVE_WINDOW__,source=api&&api.state||null,provider=window.__KERBSIDE_RAIL_PROVIDER__&&window.__KERBSIDE_RAIL_PROVIDER__.state||null;
  if(!source)return{status:'standby',label:'Not loaded',source:'missing',attempts:[],failureCount:0,timeoutCount:0,fallbacks:0,detail:'Live rail layer has not loaded yet.',error:''};
  const attempts=Array.isArray(source.attempts)?source.attempts.map(item=>({...item})):[];
  if(track)trackAttempts(attempts,source);
  const mode=text(source.source),error=text(source.lastFailure||source.officialFailure),fallbacks=(Number(source.fallbacks)||0)+(Number(provider&&provider.fallbacks)||0);
  const failureCount=attempts.filter(item=>item&&(item.error||item.timedOut||Number(item.status)>=400||Number(item.status)===0)).length;
  const timeoutCount=attempts.filter(item=>item&&item.timedOut).length;
  let status='standby',label='Standby',detail='No live rail request has been made in this session.';
  if(mode==='official'){
    status='healthy';label='Official Darwin';detail=`Official Rail Data Marketplace source active${source.officialStatus?` · HTTP ${source.officialStatus}`:''}.`;
  }else if(mode==='community-fallback'){
    status='degraded';label='Fallback active';detail=`Community Huxley fallback is serving live rail data${source.lastProvider?` · ${source.lastProvider}`:''}.`;
  }else if(mode==='unavailable'){
    status='down';label='Live unavailable';detail=`Official and fallback live rail sources failed${error?` · ${error}`:''}.`;
  }else if(attempts.length&&failureCount){
    status='degraded';label='Retrying';detail=`${failureCount}/${attempts.length} live provider attempt${attempts.length===1?'':'s'} failed${timeoutCount?` · ${timeoutCount} timeout${timeoutCount===1?'':'s'}`:''}.`;
  }
  return{status,label,source:mode||'standby',lastProvider:text(source.lastProvider||provider&&provider.active),officialStatus:Number(source.officialStatus)||0,lastStatus:Number(source.lastStatus)||0,attempts,failureCount,timeoutCount,fallbacks,detail,error};
}

function overlayStats(){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
  const overlayState=overlay&&overlay.state||null,timetableState=timetable&&timetable.state||null;
  const services=timetableState&&Array.isArray(timetableState.services)?timetableState.services:[];
  let scheduled=0,withEvidence=0,liveOnly=0,legCount=0,matchedLegs=0;
  const originIndexes=new Set();
  for(const service of services){
    if(!service)continue;
    if(service.liveOnly){liveOnly++;continue;}
    scheduled++;
    if(service.liveEvidence)withEvidence++;
    if(!overlay||!overlayState||overlayState.status!=='ready')continue;
    if(service.journeyType==='connection'){
      const first=service.legs&&service.legs[0],second=service.legs&&service.legs[1];
      if(first){
        legCount++;
        const match=typeof overlay.matchEntry==='function'?overlay.matchEntry(first):null;
        if(match){matchedLegs++;if(match.entry&&Number.isInteger(match.entry.index))originIndexes.add(match.entry.index);}
      }
      if(second){
        legCount++;
        const change=upper(service.interchange&&service.interchange.crs),to=upper(window.__KERBSIDE_TRAIN_ROUTES__&&window.__KERBSIDE_TRAIN_ROUTES__.state&&window.__KERBSIDE_TRAIN_ROUTES__.state.destination&&window.__KERBSIDE_TRAIN_ROUTES__.state.destination.crs);
        const index=overlayState.onwardIndexes&&typeof overlayState.onwardIndexes.get==='function'?overlayState.onwardIndexes.get(`${change}|${to}`):null;
        const match=index&&typeof overlay.matchEntryIn==='function'?overlay.matchEntryIn(second,index):null;
        if(match)matchedLegs++;
      }
    }else{
      legCount++;
      const match=typeof overlay.matchEntry==='function'?overlay.matchEntry(service):null;
      if(match){matchedLegs++;if(match.entry&&Number.isInteger(match.entry.index))originIndexes.add(match.entry.index);}
    }
  }
  return{
    scheduledServices:scheduled,
    servicesWithLiveEvidence:withEvidence,
    evidenceRate:scheduled?withEvidence/scheduled:null,
    liveOnlyServices:liveOnly,
    eligibleLegs:legCount,
    matchedLegs,
    legMatchRate:legCount?matchedLegs/legCount:null,
    originLiveServices:overlayState&&Array.isArray(overlayState.services)?overlayState.services.length:0,
    matchedOriginServices:originIndexes.size
  };
}

function overlayHealth(){
  const api=window.__KERBSIDE_TRAIN_OVERLAY__,source=api&&api.state||null,timetable=window.__KERBSIDE_TRAIN_TIMETABLE__&&window.__KERBSIDE_TRAIN_TIMETABLE__.state||null;
  const stats=overlayStats();
  if(!source)return{status:'standby',label:'Not loaded',...stats,ageMs:null,detail:'Live overlay module has not loaded yet.',error:''};
  const mode=text(source.status)||'idle',ageMs=source.updatedAt?Math.max(0,now()-Number(source.updatedAt)):null,error=text(source.error);
  if(timetable&&timetable.mode&&timetable.mode!=='today')return{status:'standby',label:'Not needed',...stats,ageMs,detail:'Live overlay is not required for an advance-date journey.',error};
  if(mode==='idle')return{status:'standby',label:'Standby',...stats,ageMs,detail:'Live overlay is waiting for a same-day journey.',error};
  if(mode==='loading')return{status:'checking',label:'Loading',...stats,ageMs,detail:'Loading Darwin evidence for the scheduled journey.',error};
  if(mode==='error')return{status:'degraded',label:'Overlay unavailable',...stats,ageMs,detail:`Scheduled timetable remains usable; live overlay failed${error?` · ${error}`:''}.`,error};
  let status='healthy';
  if(ageMs!=null&&ageMs>OVERLAY_STALE_MS)status='degraded';
  if(stats.scheduledServices>=3&&Number.isFinite(stats.evidenceRate)&&stats.evidenceRate<0.35)status='degraded';
  const detail=`${stats.servicesWithLiveEvidence}/${stats.scheduledServices} scheduled service${stats.scheduledServices===1?'':'s'} carry live evidence${Number.isFinite(stats.evidenceRate)?` · ${percent(stats.evidenceRate)}`:''}${stats.liveOnlyServices?` · ${stats.liveOnlyServices} live-only addition${stats.liveOnlyServices===1?'':'s'}`:''}${ageMs!=null?` · overlay ${ageLabel(ageMs)}`:''}.`;
  return{status,label:LABEL[status],...stats,ageMs,detail,error};
}

function overallHealth(parts){
  const timetable=parts.timetable,station=parts.stationData,live=parts.live,overlay=parts.overlay;
  if(timetable.status==='down')return{status:'down',label:'Rail data needs attention'};
  if([station,live,overlay].some(item=>item.status==='down'))return{status:'degraded',label:'Rail data running with reduced resilience'};
  if([timetable,station,live,overlay].some(item=>item.status==='degraded'))return{status:'degraded',label:'Rail data partially degraded'};
  if([timetable,station,live,overlay].some(item=>item.status==='checking'))return{status:'checking',label:'Checking rail data'};
  if([timetable,station,live,overlay].every(item=>item.status==='standby'))return{status:'standby',label:'Rail data standing by'};
  return{status:'healthy',label:'Rail data healthy'};
}

function buildSnapshot({manifest,track=true}={}){
  const parts={
    timetable:timetableHealth(manifest),
    stationData:stationHealth(),
    live:liveHealth({track}),
    overlay:overlayHealth()
  };
  const overall=overallHealth(parts);
  return{version:VERSION,generatedAt:now(),status:overall.status,label:overall.label,...parts,session:{...state.session}};
}

async function loadManifest({force=false}={}){
  if(typeof fetch!=='function')return null;
  const expired=!state.manifestCheckedAt||now()-state.manifestCheckedAt>=MANIFEST_REFRESH_MS;
  if(!force&&state.manifest&&!expired)return state.manifest;
  if(state.manifestPromise)return state.manifestPromise;
  state.manifestPromise=fetch(`${MANIFEST_URL}?health=${now()}`,{cache:'no-cache',headers:{Accept:'application/json'}})
    .then(response=>{if(!response.ok)throw new Error(`Timetable manifest returned ${response.status}`);return response.json();})
    .then(manifest=>{state.manifest=manifest;state.manifestCheckedAt=now();state.manifestError='';return manifest;})
    .catch(error=>{state.manifestCheckedAt=now();state.manifestError=text(error&&error.message)||'Manifest unavailable';return state.manifest;})
    .finally(()=>{state.manifestPromise=null;});
  return state.manifestPromise;
}

function refresh({dispatch=true}={}){
  const snapshot=buildSnapshot();
  state.current=snapshot;state.updatedAt=snapshot.generatedAt;
  renderStatusPanel(snapshot);
  if(dispatch&&typeof document!=='undefined'&&typeof CustomEvent==='function')document.dispatchEvent(new CustomEvent('kerbside:rail-health',{detail:snapshot}));
  return snapshot;
}

function compactTimetable(value){
  if(!value)return'Unavailable';
  const id=value.timetableId?value.timetableId.slice(0,12):'Unknown snapshot';
  return `${id}${value.ageMs!=null?` · ${ageLabel(value.ageMs)}`:''}`;
}
function compactStation(value){
  if(value.source==='local')return `Local · ${value.count.toLocaleString('en-GB')} stations`;
  if(value.source==='fallback')return 'Huxley fallback';
  return value.label||'Standby';
}
function compactLive(value){
  if(value.source==='official')return 'Official Darwin';
  if(value.source==='community-fallback')return 'Huxley fallback';
  if(value.source==='unavailable')return 'Unavailable';
  return value.label||'Standby';
}
function compactOverlay(value){
  if(value.status==='standby')return value.label||'Standby';
  if(value.scheduledServices)return `${value.servicesWithLiveEvidence}/${value.scheduledServices} live · ${percent(value.evidenceRate)}`;
  return value.label||'No services';
}

function installPanelStyles(){
  if(typeof document==='undefined'||!document.head||$('kerbsideRailHealthStyles'))return;
  const style=document.createElement('style');style.id='kerbsideRailHealthStyles';style.textContent=`
    .rail-health-card{padding:13px;border:1px solid var(--rule);border-radius:10px;background:var(--ink);display:grid;gap:10px}
    .rail-health-head{display:flex;align-items:center;gap:9px}.rail-health-head>i{width:10px;height:10px;border-radius:50%;background:var(--text-mute);flex:0 0 auto}.rail-health-head strong{font-size:12.5px}.rail-health-head span{margin-left:auto;font-family:'Martian Mono',monospace;font-size:9px;color:var(--text-dim)}
    .rail-health-card[data-state="healthy"] .rail-health-head>i{background:var(--live);box-shadow:0 0 8px rgb(var(--live-rgb) / .5)}.rail-health-card[data-state="degraded"] .rail-health-head>i{background:var(--led);box-shadow:0 0 8px rgb(var(--led-rgb) / .4)}.rail-health-card[data-state="down"] .rail-health-head>i{background:var(--warn);box-shadow:0 0 8px rgb(var(--warn-rgb) / .5)}
    .rail-health-summary{margin:0;color:var(--text-dim);font-size:10px;line-height:1.45}.rail-health-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.rail-health-cell{min-width:0;padding:8px;border:1px solid var(--rule);border-radius:8px;background:var(--ink-2)}.rail-health-cell span{display:block;color:var(--text-mute);font-size:8.5px;text-transform:uppercase;letter-spacing:.05em}.rail-health-cell b{display:block;margin-top:2px;font-size:10.5px;overflow-wrap:anywhere}.rail-health-cell small{display:block;margin-top:3px;color:var(--text-dim);font-size:8.5px;line-height:1.35}.rail-health-session{color:var(--text-mute);font-family:'Martian Mono',monospace;font-size:8.5px;line-height:1.4}
    @media(max-width:420px){.rail-health-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
}

function ensureStatusPanel(){
  if(typeof document==='undefined')return null;
  const switchboard=document.querySelector&&document.querySelector('#statusPanel .status-switchboard');
  if(!switchboard)return null;
  let card=$('railRuntimeHealth');
  if(card)return card;
  installPanelStyles();
  card=document.createElement('section');card.id='railRuntimeHealth';card.className='rail-health-card';card.dataset.state='checking';
  card.innerHTML='<div class="rail-health-head"><i></i><strong>Rail runtime</strong><span data-rail-health-state>Checking</span></div><p class="rail-health-summary" data-rail-health-summary>Checking what the app is actually using right now.</p><div class="rail-health-grid"><div class="rail-health-cell"><span>Timetable</span><b data-rail-timetable>Checking</b><small data-rail-timetable-detail></small></div><div class="rail-health-cell"><span>Stations</span><b data-rail-stations>Checking</b><small data-rail-stations-detail></small></div><div class="rail-health-cell"><span>Live source</span><b data-rail-live>Checking</b><small data-rail-live-detail></small></div><div class="rail-health-cell"><span>Live overlay</span><b data-rail-overlay>Checking</b><small data-rail-overlay-detail></small></div></div><div class="rail-health-session" data-rail-session></div>';
  const overview=$('statusOverview'),note=switchboard.querySelector('.status-note');
  if(note)switchboard.insertBefore(card,note);else if(overview&&overview.nextSibling)switchboard.insertBefore(card,overview.nextSibling);else switchboard.appendChild(card);
  return card;
}
function setPanelText(card,selector,value){const node=card&&card.querySelector(selector),next=String(value||'');if(node&&node.textContent!==next)node.textContent=next;}
function renderStatusPanel(snapshot=state.current){
  const card=ensureStatusPanel();if(!card||!snapshot)return false;
  card.dataset.state=snapshot.status;
  setPanelText(card,'[data-rail-health-state]',snapshot.label);
  setPanelText(card,'[data-rail-health-summary]',`Runtime view · timetable ${snapshot.timetable.status} · stations ${snapshot.stationData.status} · live ${snapshot.live.status} · overlay ${snapshot.overlay.status}.`);
  setPanelText(card,'[data-rail-timetable]',compactTimetable(snapshot.timetable));setPanelText(card,'[data-rail-timetable-detail]',snapshot.timetable.coverage&&snapshot.timetable.coverage.detail||snapshot.timetable.detail);
  setPanelText(card,'[data-rail-stations]',compactStation(snapshot.stationData));setPanelText(card,'[data-rail-stations-detail]',snapshot.stationData.detail);
  setPanelText(card,'[data-rail-live]',compactLive(snapshot.live));setPanelText(card,'[data-rail-live-detail]',`${snapshot.live.detail}${snapshot.live.attempts.length?` ${snapshot.live.failureCount}/${snapshot.live.attempts.length} latest attempts failed.`:''}`);
  setPanelText(card,'[data-rail-overlay]',compactOverlay(snapshot.overlay));setPanelText(card,'[data-rail-overlay-detail]',snapshot.overlay.detail);
  const stationFallbacks=Number(snapshot.stationData.fallbacks)||0,liveFallbacks=Number(snapshot.live.fallbacks)||0;
  setPanelText(card,'[data-rail-session]',`Session API issues · ${snapshot.session.liveFailures} failed attempts · ${snapshot.session.liveTimeouts} timeouts · ${liveFallbacks} live fallbacks · ${stationFallbacks} station fallbacks`);
  return true;
}

function bind(){
  if(state.installed||typeof document==='undefined')return;
  state.installed=true;
  const update=()=>setTimeout(()=>refresh(),0);
  for(const name of ['kerbside:live-overlay','kerbside:train-route-change','kerbside:train-date-change','kerbside:station-data','kerbside:transportmode'])document.addEventListener(name,update);
  if(typeof window.addEventListener==='function')window.addEventListener('kerbside:journey-planner-change',update);
  if(typeof MutationObserver==='function'&&document.documentElement){
    const observer=new MutationObserver(()=>{if(ensureStatusPanel()){renderStatusPanel();}});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
  loadManifest().then(()=>refresh()).catch(()=>refresh());
  refresh();
  state.timer=setInterval(()=>{loadManifest().finally(()=>refresh());},REFRESH_MS);
}

window.__KERBSIDE_RAIL_HEALTH__={version:VERSION,state,coverageState,timetableHealth,stationHealth,liveHealth,overlayStats,overlayHealth,overallHealth,buildSnapshot,loadManifest,refresh,renderStatusPanel,install:bind};
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
}

})();
