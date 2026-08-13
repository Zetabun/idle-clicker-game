#!/usr/bin/env python3
"""Release Kerbside 0.8.6 Trusted Connections from the guarded PR workflow.

The patch is deliberately anchor-based: if 0.8.5 has moved in a way that makes
an edit ambiguous, this script stops rather than guessing.  It keeps the
existing Darwin timetable/live-overlay/Forecast v4 architecture and adds:

* a structured adapter for licensed/authoritative station connection minima;
* explicit provenance separating live train evidence from connection minima;
* an actionable recovery leg ("Use this backup");
* an on-device Journey Watch that follows one selected journey while Kerbside
  is open and follows an adopted recovery service;
* regression coverage for the new behaviour.
"""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one anchor, found {count}: {old[:100]!r}')
    write(path, text.replace(old, new, 1))


def replace_regex_once(path, pattern, replacement, flags=0):
    text = read(path)
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one regex anchor, found {count}: {pattern!r}')
    write(path, next_text)


# ---------------------------------------------------------------------------
# Version and cache-busting.
# ---------------------------------------------------------------------------
write('VERSION', '0.8.6\n')
bus = read('bus.html')
bus, cache_count = re.subn(r'(kerbside-[^"\' ?]+\.(?:js|css)\?v=)0\.8\.5', r'\g<1>0.8.6', bus)
if cache_count < 10:
    raise SystemExit(f'bus.html: expected at least 10 Kerbside rail cache-busters, found {cache_count}')
write('bus.html', bus)
subprocess.run(['python3', '.github/scripts/sync-version.py'], cwd=ROOT, check=True)

# ---------------------------------------------------------------------------
# Timetable / connection model.
# ---------------------------------------------------------------------------
replace_once(
    'kerbside-train-timetable.js',
    "const EDGE_MANIFEST_RECHECK_MS=2*60*1000;\nconst state={loading:false,request:0,services:[],signature:'',mode:'live',manifest:null,lastError:'',sourceDate:'',openId:'',edgeRefreshAt:0};",
    "const EDGE_MANIFEST_RECHECK_MS=2*60*1000;\nconst WATCH_STORE_KEY='kerbside.rail.journey-watch.v1';\nconst state={loading:false,request:0,services:[],signature:'',mode:'live',manifest:null,lastError:'',sourceDate:'',openId:'',edgeRefreshAt:0,watch:null};"
)

old_bind = """function bindBoard(board){
  if(!board||board.dataset.scheduledBound)return;
  board.dataset.scheduledBound='1';
  board.addEventListener('click',event=>{
    const button=event.target&&event.target.closest?event.target.closest('[data-scheduled-toggle]'):null;
    if(!button||!board.contains(button))return;
    toggleService(button.getAttribute('data-scheduled-toggle'));
  });
}"""
new_bind = """function bindBoard(board){
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
}"""
replace_once('kerbside-train-timetable.js', old_bind, new_bind)

old_minimum = """function connectionMinimumInfo(crs,graph=null){
  const code=String(crs||'').toUpperCase(),officialMap=window.__KERBSIDE_OFFICIAL_CONNECTION_TIMES__||{},official=Number(officialMap&&officialMap[code]);
  /* National Rail's CTI feed identifies connecting trains; it is not a
     substitute for the station minimum interchange times used by the Journey
     Planner. Until a licensed/machine-readable MCT source is loaded, Kerbside
     keeps an explicit conservative fallback instead of presenting guesses as
     official data. */
  if(Number.isFinite(official)&&official>=1&&official<=60)return {minutes:official,source:'official'};
  const fixed=CONNECTION_HUB_MINUTES[code]||10,degree=graph&&graph.get(code)?graph.get(code).size:0,topology=degree>=12?15:degree>=7?12:10;
  return {minutes:Math.max(fixed,topology),source:'kerbside-topology'};
}"""
new_minimum = """function officialConnectionMinimumFor(crs){
  const code=String(crs||'').toUpperCase(),map=window.__KERBSIDE_OFFICIAL_CONNECTION_TIMES__||{},raw=map&&map[code];
  const structured=raw&&typeof raw==='object'&&!Array.isArray(raw),minutes=Number(structured?raw.minutes:raw);
  if(!Number.isFinite(minutes)||minutes<1||minutes>60)return null;
  return {minutes,source:'official',authority:String(structured&&raw.authority||'').trim(),dataset:String(structured&&raw.dataset||'').trim(),asOf:String(structured&&raw.asOf||'').trim()};
}
function connectionMinimumInfo(crs,graph=null){
  const code=String(crs||'').toUpperCase(),official=officialConnectionMinimumFor(code);
  /* National Rail's CTI feed identifies connecting trains; it is not a
     substitute for the station minimum interchange times used by the Journey
     Planner. Until a licensed/machine-readable MCT source is loaded, Kerbside
     keeps an explicit conservative fallback instead of presenting guesses as
     official data. The structured adapter above is intentionally dormant
     unless an authorised dataset is supplied by the host application. */
  if(official)return official;
  const fixed=CONNECTION_HUB_MINUTES[code]||10,degree=graph&&graph.get(code)?graph.get(code).size:0,topology=degree>=12?15:degree>=7?12:10;
  return {minutes:Math.max(fixed,topology),source:'kerbside-topology',authority:'',dataset:'',asOf:''};
}"""
replace_once('kerbside-train-timetable.js', old_minimum, new_minimum)

replace_once(
    'kerbside-train-timetable.js',
    "connectionMinutes,minimumConnectionMinutes:minimum,minimumConnectionSource:minimumInfo.source,recoveryOptions,",
    "connectionMinutes,minimumConnectionMinutes:minimum,minimumConnectionSource:minimumInfo.source,minimumConnectionAuthority:minimumInfo.authority||'',minimumConnectionDataset:minimumInfo.dataset||'',minimumConnectionAsOf:minimumInfo.asOf||'',recoveryOptions,"
)
replace_once(
    'kerbside-train-timetable.js',
    "recoveryOptions:connection?(item.recoveryOptions||[]).map(normaliseLeg):[],recoveryChoice:null,minimumConnectionSource:item.minimumConnectionSource||'kerbside-topology',journeyLabels:Array.isArray(item.journeyLabels)?item.journeyLabels.slice():[],",
    "recoveryOptions:connection?(item.recoveryOptions||[]).map(normaliseLeg):[],recoveryChoice:null,minimumConnectionSource:item.minimumConnectionSource||'kerbside-topology',minimumConnectionAuthority:item.minimumConnectionAuthority||'',minimumConnectionDataset:item.minimumConnectionDataset||'',minimumConnectionAsOf:item.minimumConnectionAsOf||'',journeyLabels:Array.isArray(item.journeyLabels)?item.journeyLabels.slice():[],"
)

watch_helpers = r"""
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
  if(service&&service.minimumConnectionSource==='official'){
    const authority=String(service.minimumConnectionAuthority||'').trim(),asOf=String(service.minimumConnectionAsOf||'').trim();
    return `${authority?`${authority} · `:''}official station minimum: ${minimum} min${asOf?` · ${asOf}`:''}`;
  }
  return `Kerbside conservative minimum: ${minimum} min`;
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
"""
replace_once(
    'kerbside-train-timetable.js',
    "function serviceKey(service,index){return String((service&&(service.serviceID||service.uid||service.trainId))||`${(service&&service.std)||'time'}-${index}`);}",
    "function serviceKey(service,index){return String((service&&(service.serviceID||service.uid||service.trainId))||`${(service&&service.std)||'time'}-${index}`);}" + watch_helpers
)

old_recovery = r"""function recoveryMarkup(service){
  if(!service||service.journeyType!=='connection'||!['at-risk','onward-cancelled'].includes(service.connectionRisk))return'';
  const choice=service.recoveryChoice;
  if(!choice)return `<div class="train-recovery-card train-recovery-none"><span>Recovery</span><strong>No later workable onward train found</strong><small>Kerbside checked the loaded timetable recovery window. Refresh as live information changes.</small></div>`;
  const platform=choice.platform?` · Plat ${choice.platform}`:'',live=choice.live?'Live Darwin evidence':'Scheduled timetable',prediction=forecastRecovery(service),reason=prediction&&prediction.reasons&&prediction.reasons[0]||'';
  const forecastMarkup=prediction?`<div class="train-recovery-forecast crowd-${esc(prediction.level||'unknown')}" title="${esc((prediction.reasons||[]).join(', '))}"><i></i><b>${esc(prediction.label||'Forecast pending')}</b><small>${esc(`${prediction.confidence||'Low'} confidence${reason?` · ${reason}`:''}`)}</small></div>`:'';
  return `<div class="train-recovery-card"><span>Backup if missed</span><strong>${esc(`${choice.departure||choice.std||'—'} → ${choice.arrival||'—'}`)}</strong><small>${esc(`${choice.operator||'Onward service'}${platform} · ${live}`)}</small>${forecastMarkup}</div>`;
}"""
new_recovery = r"""function recoveryMarkup(service,key){
  if(!service||service.journeyType!=='connection'||!['at-risk','onward-cancelled'].includes(service.connectionRisk))return'';
  const choice=service.recoveryChoice;
  if(!choice)return `<div class="train-recovery-card train-recovery-none"><span>Recovery</span><strong>No later workable onward train found</strong><small>Kerbside checked the loaded timetable recovery window. Refresh as live information changes.</small></div>`;
  const platform=choice.platform?` · Plat ${choice.platform}`:'',live=choice.live?'Live Darwin evidence':'Scheduled timetable',prediction=forecastRecovery(service),reason=prediction&&prediction.reasons&&prediction.reasons[0]||'';
  const forecastMarkup=prediction?`<div class="train-recovery-forecast crowd-${esc(prediction.level||'unknown')}" title="${esc((prediction.reasons||[]).join(', '))}"><i></i><b>${esc(prediction.label||'Forecast pending')}</b><small>${esc(`${prediction.confidence||'Low'} confidence${reason?` · ${reason}`:''}`)}</small></div>`:'';
  return `<div class="train-recovery-card"><span>Backup if missed</span><strong>${esc(`${choice.departure||choice.std||'—'} → ${choice.arrival||'—'}`)}</strong><small>${esc(`${choice.operator||'Onward service'}${platform} · ${live}`)}</small>${forecastMarkup}<div class="train-recovery-actions"><button type="button" class="train-recovery-use" data-use-recovery="${esc(key)}">Use this backup</button><small>Replace the onward leg in this Kerbside journey.</small></div></div>`;
}"""
replace_once('kerbside-train-timetable.js', old_recovery, new_recovery)

replace_once(
    'kerbside-train-timetable.js',
    "  const evidence=service.secondLiveEvidence?' · live evidence on both legs':service.liveEvidence?' · live first-leg evidence':'';\n  const source=service.minimumConnectionSource==='official'?'official station minimum':'Kerbside fallback minimum';\n  const changeRow=`<div class=\"train-connection-change connection-risk-${esc(risk)}\"><span>Change at ${esc(displayName(change,'interchange'))}</span><b>${esc(`${minutes} min`)}</b><small>${esc(`${quality} connection · ${source}: ${minimum} min${evidence}`)}</small></div>`;",
    "  const evidence=connectionEvidenceProvenance(service),source=connectionMinimumProvenance(service);\n  const changeRow=`<div class=\"train-connection-change connection-risk-${esc(risk)}\"><span>Change at ${esc(displayName(change,'interchange'))}</span><b>${esc(`${minutes} min`)}</b><small>${esc(`${quality} connection · ${source} · ${evidence}`)}</small></div>`;"
)

replace_once(
    'kerbside-train-timetable.js',
    "    const minimum=Number(service.minimumConnectionMinutes)||10,minimumText=service.minimumConnectionSource==='official'?`the official ${minimum}-minute station minimum`:`Kerbside's conservative ${minimum}-minute fallback buffer`;",
    "    const minimumText=connectionMinimumProvenance(service),evidence=connectionEvidenceProvenance(service);"
)
replace_once(
    'kerbside-train-timetable.js',
    "    if(service.secondLiveEvidence)return `Both legs are timetabled from the National Rail Darwin Timetable Files and both have been matched to live Darwin evidence. The connection uses ${minimumText}.`;\n    if(service.liveEvidence)return `Both legs are timetabled from the National Rail Darwin Timetable Files. Live Darwin evidence is currently available for one leg; the other remains scheduled. The connection uses ${minimumText}.`;\n    return `Both legs are timetabled from the National Rail Darwin Timetable Files. This one-change result uses ${minimumText}; Kerbside does not treat the Connecting Train Identifiers feed as a station minimum-time source.`;",
    "    if(service.secondLiveEvidence)return `Both legs are timetabled from the National Rail Darwin Timetable Files; ${evidence}. The connection uses ${minimumText}.`;\n    if(service.liveEvidence)return `Both legs are timetabled from the National Rail Darwin Timetable Files; ${evidence}. The connection uses ${minimumText}.`;\n    return `Both legs are timetabled from the National Rail Darwin Timetable Files; ${evidence}. The connection uses ${minimumText}; Kerbside does not treat the Connecting Train Identifiers feed as a station minimum-time source.`;"
)

replace_once(
    'kerbside-train-timetable.js',
    "        ${connection?recoveryMarkup(service):''}\n        <div class=\"train-crowding-explain crowd-${esc(forecastResult.level)}\">${explain}</div>",
    "        ${connection?recoveryMarkup(service,key):''}\n        ${journeyWatchMarkup(service,key)}\n        <div class=\"train-crowding-explain crowd-${esc(forecastResult.level)}\">${explain}</div>"
)

replace_once(
    'kerbside-train-timetable.js',
    "  const rendered=renderRows(raw.map(normalise),{mode,manifest});",
    "  const normalised=raw.map(normalise);normalised.forEach(restoreWatchedChoice);\n  const rendered=renderRows(normalised,{mode,manifest});"
)

recovery_functions = r"""
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
"""
replace_once(
    'kerbside-train-timetable.js',
    "function mergeOverlay(){",
    recovery_functions + "\nfunction mergeOverlay(){"
)

replace_once(
    'kerbside-train-timetable.js',
    "function init(){\n  document.addEventListener('kerbside:live-overlay',()=>setTimeout(handleOverlay,0));",
    "function init(){\n  state.watch=readJourneyWatch();\n  document.addEventListener('kerbside:live-overlay',()=>setTimeout(handleOverlay,0));"
)
replace_once(
    'kerbside-train-timetable.js',
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,recoverySummary,forecastConnection,forecastRecovery,effectiveDepartAfter,railNowTime,provider:timetableProvider};",
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,recoverySummary,forecastConnection,forecastRecovery,effectiveDepartAfter,railNowTime,adoptRecoveryByKey,toggleJourneyWatchByKey,watchMatches,connectionMinimumProvenance,connectionEvidenceProvenance,provider:timetableProvider};"
)

# ---------------------------------------------------------------------------
# Rail presentation.
# ---------------------------------------------------------------------------
css_anchor = ".train-recovery-forecast>small{grid-column:2;font-size:9px;line-height:1.35;color:var(--text-dim);overflow-wrap:anywhere}\n"
css_extra = r""".train-recovery-actions{display:flex;align-items:center;gap:8px;margin-top:7px;padding-top:7px;border-top:1px solid rgb(var(--live-rgb) / .18)}
.train-recovery-actions small{color:var(--text-mute);font-size:9px;line-height:1.35}
.train-recovery-use,.train-watch-action{flex:0 0 auto;padding:7px 10px;border:1px solid var(--led-dim);border-radius:7px;background:rgb(var(--led-rgb) / .08);color:var(--led);font-size:10px;font-weight:800;line-height:1.2}
.train-recovery-use:hover,.train-watch-action:hover{background:rgb(var(--led-rgb) / .14)}
.train-watch-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;margin:0 0 12px;padding:10px 11px;border:1px solid var(--rule);border-radius:9px;background:var(--ink)}
.train-watch-card>div{display:flex;flex-direction:column;min-width:0;gap:2px}
.train-watch-card>div>span{color:var(--text-mute);font-family:'Martian Mono',ui-monospace,monospace;font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.train-watch-card>div>strong{color:var(--text);font-size:11.5px}
.train-watch-card>div>small{color:var(--text-dim);font-size:9px;line-height:1.4}
.train-watch-card.is-active{border-color:rgb(var(--live-rgb) / .3);background:rgb(var(--live-rgb) / .045)}
.train-watch-card.is-active>div>span{color:var(--live-soft)}
.train-watch-card.is-warn{border-color:rgb(var(--warn-rgb) / .35);background:rgb(var(--warn-rgb) / .045)}
.train-watch-card.is-warn>div>span{color:var(--warn-soft)}
"""
replace_once('kerbside-trains.css', css_anchor, css_anchor + css_extra)
replace_once(
    'kerbside-trains.css',
    "  .train-connection-change{margin-left:20px}\n",
    "  .train-connection-change{margin-left:20px}\n  .train-recovery-actions,.train-watch-card{align-items:flex-start}\n  .train-recovery-actions{flex-direction:column}\n  .train-watch-card{grid-template-columns:1fr}\n  .train-watch-action{justify-self:start}\n"
)

# ---------------------------------------------------------------------------
# Unit regression: structured authorised MCT adapter and conservative fallback.
# ---------------------------------------------------------------------------
replace_once(
    'kerbside-backend/test/train-timetable-provider.test.js',
    "function loadProvider(date='2026-08-12',departAfter='09:00'){
  const context={",
    "function loadProvider(date='2026-08-12',departAfter='09:00',officialConnectionTimes=null){\n  const context={"
)
replace_once(
    'kerbside-backend/test/train-timetable-provider.test.js',
    "    window:{__KERBSIDE_TRAIN_DATE__:{state:{date},isToday(){return false;}}}\n",
    "    window:{__KERBSIDE_TRAIN_DATE__:{state:{date},isToday(){return false;}},__KERBSIDE_OFFICIAL_CONNECTION_TIMES__:officialConnectionTimes||undefined}\n"
)
unit_anchor = """test('connection buffer status distinguishes safe, tight and at-risk changes',()=>{
  const provider=loadProvider();
  assert.equal(provider.connectionMinimum('CNM'),10);
  assert.equal(provider.connectionMinimum('BHM'),15);
  assert.deepEqual({...provider.connectionMinimumInfo('CNM')},{minutes:10,source:'kerbside-topology'});
  assert.equal(provider.connectionRiskFor(18,10),'good');
  assert.equal(provider.connectionRiskFor(12,10),'tight');
  assert.equal(provider.connectionRiskFor(8,10),'at-risk');
});
"""
unit_new = """test('connection buffer status distinguishes safe, tight and at-risk changes',()=>{
  const provider=loadProvider();
  assert.equal(provider.connectionMinimum('CNM'),10);
  assert.equal(provider.connectionMinimum('BHM'),15);
  assert.deepEqual({...provider.connectionMinimumInfo('CNM')},{minutes:10,source:'kerbside-topology',authority:'',dataset:'',asOf:''});
  assert.equal(provider.connectionRiskFor(18,10),'good');
  assert.equal(provider.connectionRiskFor(12,10),'tight');
  assert.equal(provider.connectionRiskFor(8,10),'at-risk');
});

test('authoritative station minima can be supplied with provenance without changing the fallback dataset',()=>{
  const provider=loadProvider('2026-08-12','09:00',{CNM:{minutes:8,authority:'Licensed MCT fixture',dataset:'station-mct',asOf:'2026-08-12'}});
  assert.deepEqual({...provider.connectionMinimumInfo('CNM')},{minutes:8,source:'official',authority:'Licensed MCT fixture',dataset:'station-mct',asOf:'2026-08-12'});
  assert.deepEqual({...provider.connectionMinimumInfo('BHM')},{minutes:15,source:'kerbside-topology',authority:'',dataset:'',asOf:''});
});
"""
replace_once('kerbside-backend/test/train-timetable-provider.test.js', unit_anchor, unit_new)

# ---------------------------------------------------------------------------
# Browser regression: provenance, Journey Watch and actionable recovery.
# ---------------------------------------------------------------------------
replace_once(
    'kerbside-backend/tests/train-browser-core-regression.mjs',
    "  assert.match(await connectionDetail.textContent(),/Kerbside fallback minimum: 10 min/);",
    "  assert.match(await connectionDetail.textContent(),/Kerbside conservative minimum: 10 min/);\n  assert.match(await connectionDetail.textContent(),/both trains live-checked/i);"
)

browser_anchor = """  const recoveryForecast=connectionDetail.locator('.train-recovery-forecast');
  await recoveryForecast.waitFor({state:'visible'});
  assert.match(await recoveryForecast.textContent(),/(Quiet|Moderate|Busy|Very busy)/);
  assert.match(await recoveryForecast.getAttribute('title'),/missed-connection passengers/i);
  assert.doesNotMatch(await connectionDetail.textContent(),/10:52/);
"""
browser_new = """  const recoveryForecast=connectionDetail.locator('.train-recovery-forecast');
  await recoveryForecast.waitFor({state:'visible'});
  assert.match(await recoveryForecast.textContent(),/(Quiet|Moderate|Busy|Very busy)/);
  assert.match(await recoveryForecast.getAttribute('title'),/missed-connection passengers/i);
  assert.doesNotMatch(await connectionDetail.textContent(),/10:52/);

  // Trusted Connections: pin the affected journey, then explicitly adopt the
  // suggested backup. The selected watch must follow the replacement onward
  // leg and Forecast v4 must remain attached to the replanned itinerary.
  const watchButton=connectionDetail.getByRole('button',{name:'Watch journey'});
  await watchButton.click();
  await connectionDetail.getByRole('button',{name:'Stop watching'}).waitFor();
  assert.match(await connectionDetail.textContent(),/Journey Watch/i);
  assert.match(await connectionDetail.textContent(),/Connection at risk/i);
  const watchedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.journey-watch.v1')||'null'));
  assert.equal(watchedBefore?.onwardID,`rid-change-b-${TODAY}`);

  const useBackup=connectionDetail.getByRole('button',{name:'Use this backup'});
  await useBackup.click();
  await page.waitForFunction(today=>{
    const service=window.__KERBSIDE_TRAIN_TIMETABLE__.state.services.find(item=>item.journeyType==='connection');
    return service?.legs?.[1]?.serviceID===`rid-change-recovery-${today}`&&service?.connectionRisk==='good'&&service?.liveConnectionMinutes===27;
  },TODAY,{timeout:10000});
  assert.match(await connection.textContent(),/Replanned/);
  assert.match(await connection.textContent(),/live 27m change/);
  assert.doesNotMatch(await connection.textContent(),/Connection at risk/);
  assert.match(await connectionDetail.textContent(),/11:20/);
  assert.match(await connectionDetail.textContent(),/11:52/);
  assert.match(await connectionDetail.textContent(),/both trains live-checked/i);
  assert.match(await connectionDetail.textContent(),/Forecast v4|Why this forecast/i);
  assert.equal(await connectionDetail.getByRole('button',{name:'Use this backup'}).count(),0);
  assert.equal(await connectionDetail.getByRole('button',{name:'Stop watching'}).count(),1);
  const watchedAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.journey-watch.v1')||'null'));
  assert.equal(watchedAfter?.onwardID,`rid-change-recovery-${TODAY}`,'Journey Watch must follow the adopted backup leg');
  await connectionDetail.getByRole('button',{name:'Stop watching'}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('kerbside.rail.journey-watch.v1')),null);
"""
replace_once('kerbside-backend/tests/train-browser-core-regression.mjs', browser_anchor, browser_new)

# The release patch changes served rail files, so VERSION has already advanced.
# Finish by asserting every synchronized copy agrees before CI installs anything.
subprocess.run(['python3', '.github/scripts/sync-version.py', '--check'], cwd=ROOT, check=True)
print('Kerbside 0.8.6 Trusted Connections patch applied successfully.')
