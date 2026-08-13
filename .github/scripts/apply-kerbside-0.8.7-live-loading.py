#!/usr/bin/env python3
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]


def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')

def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old,new,1)

def regex_once(text,pattern,repl,label,flags=0):
    updated,count=re.subn(pattern,repl,text,count=1,flags=flags)
    if count!=1: raise SystemExit(f'{label}: expected exactly one regex anchor, found {count}')
    return updated

# ---------- bus.html: load the live-loading interpreter before train consumers ----------
bus=read('bus.html')
if 'kerbside-train-loading.js' not in bus:
    pattern=r'(<script\s+src="kerbside-train-forecast-v4\.js[^\"]*"\s*></script>)'
    bus=regex_once(bus,pattern,r'<script src="kerbside-train-loading.js?v=0.8.7"></script>\n\1','bus loading script')
# Bust Kerbside train JS/CSS assets together so a release cannot mix old/new modules.
def bust(match):
    attr,path=match.group(1),match.group(2)
    return f'{attr}="{path}?v=0.8.7"'
bus=re.sub(r'(src|href)="(kerbside-(?:trains|train-[^\"?]+)\.(?:js|css))(?:\?[^\"]*)?"',bust,bus)
write('bus.html',bus)

# ---------- direct live-board forecast/render ----------
trains=read('kerbside-trains.js')
old="""function forecastFor(service,index){
  const context={station:state.station,referenceDate:referenceDateFromBoard(),messages:state.board&&state.board.nrccMessages};
  const v4=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__;
  if(v4&&typeof v4.forecast==='function')return v4.forecast(service,index,state.services,context);
  return crowdingForecast(service,index,state.services,context);
}"""
new="""function forecastFor(service,index){
  const context={station:state.station,referenceDate:referenceDateFromBoard(),messages:state.board&&state.board.nrccMessages};
  const v4=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__,loading=window.__KERBSIDE_TRAIN_LOADING__;
  const base=v4&&typeof v4.forecast==='function'?v4.forecast(service,index,state.services,context):crowdingForecast(service,index,state.services,context);
  return loading&&typeof loading.applyToForecast==='function'?loading.applyToForecast(base,service):base;
}"""
trains=replace_once(trains,old,new,'direct forecastFor')
trains=replace_once(trains,'<small>${esc(forecast.confidence)} confidence</small>','<small>${esc(forecast.evidenceLabel||`${forecast.confidence} confidence`)}</small>','direct crowd source')
old="""  const modelLabel=Number(forecast.modelVersion)>=4?'Forecast v4':Number(forecast.modelVersion)>=3?'Forecast v3':`model v${MODEL_VERSION}`;
  const feedbackButtons = Object.keys(FEEDBACK_LABEL).map(level=>"""
new="""  const modelLabel=Number(forecast.modelVersion)>=4?'Forecast v4':Number(forecast.modelVersion)>=3?'Forecast v3':`model v${MODEL_VERSION}`;
  const loadingApi=window.__KERBSIDE_TRAIN_LOADING__,liveLoading=forecast&&forecast.liveLoading;
  const evidenceMeta=liveLoading?(forecast.evidenceLabel||'Live train-loading evidence'):`${forecast.confidence} confidence · ${modelLabel}`;
  const methodText=liveLoading?'Darwin operator-supplied estimated coach loading is available for this train, so it takes priority over Forecast v4 for the displayed crowding band. It is not a physical passenger count or ticket-sales figure.':'Kerbside does not use ticket sales, seat reservations or live carriage occupancy, so it deliberately avoids an exact percentage.';
  const feedbackButtons = Object.keys(FEEDBACK_LABEL).map(level=>"""
trains=replace_once(trains,old,new,'direct detail setup')
trains=replace_once(trains,'<div><i></i><strong>${esc(forecast.label)}</strong><span>${esc(forecast.confidence)} confidence · ${esc(modelLabel)}</span></div>','<div><i></i><strong>${esc(forecast.label)}</strong><span>${esc(evidenceMeta)}</span></div>','direct detail provenance')
trains=replace_once(trains,'<p>Why: ${esc(forecast.reasons.join(\', \'))}. Kerbside does not use ticket sales, seat reservations or live carriage occupancy, so it deliberately avoids an exact percentage.</p>','<p>Why: ${esc(forecast.reasons.join(\', \'))}. ${esc(methodText)}</p>','direct detail method')
trains=replace_once(trains,"""      <p>${esc(learningText)}</p>
    </div>
    <div class=\"train-model-card\">""","""      <p>${esc(learningText)}</p>
    </div>
    ${liveLoading&&loadingApi&&typeof loadingApi.coachMarkup==='function'?loadingApi.coachMarkup(forecast):''}
    <div class=\"train-model-card\">""",'direct coach detail')
write('kerbside-trains.js',trains)

# ---------- timetable / connection forecast and presentation ----------
tt=read('kerbside-train-timetable.js')
old="""function forecastOne(service,index,services,station=route().from,messages=liveMessages(),extraContext={}){const v3=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__,api=window.__KERBSIDE_TRAINS__,date=new Date(`${route().date}T12:00:00`),context={station,referenceDate:date,messages,...(extraContext||{})};if(v3&&typeof v3.forecast==='function')return v3.forecast(service,index,services,context);if(api&&typeof api.crowdingForecast==='function')return api.crowdingForecast(service,index,services,context);return {label:'Moderate',level:'moderate',confidence:'Low',reasons:['service time and route demand baseline']};}"""
new="""function serviceForLoading(service){
  if(!service||service.formation)return service;
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,evidence=overlay&&typeof overlay.evidenceFor==='function'?overlay.evidenceFor(service):null,formation=evidence&&evidence.service&&evidence.service.formation;
  return formation?{...service,formation}:service;
}
function crowdSourceText(result,peak=false){const loading=window.__KERBSIDE_TRAIN_LOADING__;return loading&&typeof loading.sourceText==='function'?loading.sourceText(result,{peak}):`${result&&result.confidence||'Low'} confidence${peak?' · peak leg':''}`;}
function forecastOne(service,index,services,station=route().from,messages=liveMessages(),extraContext={}){const v3=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__,api=window.__KERBSIDE_TRAINS__,loading=window.__KERBSIDE_TRAIN_LOADING__,date=new Date(`${route().date}T12:00:00`),context={station,referenceDate:date,messages,...(extraContext||{})};let base;if(v3&&typeof v3.forecast==='function')base=v3.forecast(service,index,services,context);else if(api&&typeof api.crowdingForecast==='function')base=api.crowdingForecast(service,index,services,context);else base={label:'Moderate',level:'moderate',confidence:'Low',reasons:['service time and route demand baseline']};const candidate=serviceForLoading(service);return loading&&typeof loading.applyToForecast==='function'?loading.applyToForecast(base,candidate):base;}"""
tt=replace_once(tt,old,new,'timetable forecastOne')
old="""  if(index>=0)rows[index]=service;else{rows.push(service);rows.sort((a,b)=>(parseMinutes(a&&a.std)??9999)-(parseMinutes(b&&b.std)??9999));index=rows.indexOf(service);}"""
new="""  if(index>=0){const liveRow=rows[index];if(!service.formation&&liveRow&&liveRow.formation)service.formation=liveRow.formation;rows[index]=service;}else{rows.push(service);rows.sort((a,b)=>(parseMinutes(a&&a.std)??9999)-(parseMinutes(b&&b.std)??9999));index=rows.indexOf(service);}"""
tt=replace_once(tt,old,new,'connection formation carry-over')
# Direct timetable rows gain formation at overlay merge time; connection/onward rows also use this when available.
old="""function applyEvidence(target,evidence){
  target.etd=evidence.etd;if(evidence.platform)target.platform=evidence.platform;target.isCancelled=evidence.isCancelled;target.length=evidence.length;"""
new="""function applyEvidence(target,evidence){
  target.etd=evidence.etd;if(evidence.platform)target.platform=evidence.platform;target.isCancelled=evidence.isCancelled;target.length=evidence.length;target.formation=evidence&&evidence.service&&evidence.service.formation||null;"""
tt=replace_once(tt,old,new,'overlay formation apply')
old="""  if(!leg)return;leg.etd='';leg.platform=leg.scheduledPlatform||leg.platform;leg.isCancelled=false;leg.length=0;leg.liveEvidence=false;leg.liveVia='';leg.liveArrival='';leg.cancelReason='';leg.delayReason='';leg.previousCallingPoints=null;leg.subsequentCallingPoints=null;"""
new="""  if(!leg)return;leg.etd='';leg.platform=leg.scheduledPlatform||leg.platform;leg.isCancelled=false;leg.length=0;leg.formation=null;leg.liveEvidence=false;leg.liveVia='';leg.liveArrival='';leg.cancelReason='';leg.delayReason='';leg.previousCallingPoints=null;leg.subsequentCallingPoints=null;"""
tt=replace_once(tt,old,new,'reset live formation')
# Source labels on journey legs, backups and headline.
tt=replace_once(tt,"<small>${esc(`${crowd.confidence||'Low'} confidence`)}</small>","<small>${esc(crowdSourceText(crowd))}</small>",'connection leg source')
tt=replace_once(tt,"const forecastMarkup=prediction?`<div class=\"train-recovery-forecast crowd-${esc(prediction.level||'unknown')}\" title=\"${esc((prediction.reasons||[]).join(', '))}\"><i></i><b>${esc(prediction.label||'Forecast pending')}</b><small>${esc(`${prediction.confidence||'Low'} confidence${reason?` · ${reason}`:''}`)}</small></div>`:'';","const forecastMarkup=prediction?`<div class=\"train-recovery-forecast crowd-${esc(prediction.level||'unknown')}\" title=\"${esc((prediction.reasons||[]).join(', '))}\"><i></i><b>${esc(prediction.label||'Forecast pending')}</b><small>${esc(`${crowdSourceText(prediction)}${reason?` · ${reason}`:''}`)}</small></div>`:'';",'recovery source')
old="""  const crowdNote=service.isCancelled?'service cancelled':connection?`${forecastResult.confidence} confidence · peak leg`:`${forecastResult.confidence} confidence`;"""
new="""  const crowdNote=service.isCancelled?'service cancelled':connection?crowdSourceText(forecastResult,true):crowdSourceText(forecastResult);"""
tt=replace_once(tt,old,new,'scheduled crowd source')
# Direct live evidence gets an explanation tailored to its provenance.
old="""function explainMarkup(result,mode){
  const v3=window.__KERBSIDE_FORECAST_V3__,date=new Date(`${state.sourceDate||route().date}T12:00:00`);"""
new="""function explainMarkup(result,mode){
  const loading=window.__KERBSIDE_TRAIN_LOADING__;if(result&&result.liveLoading&&loading&&typeof loading.explainMarkup==='function')return loading.explainMarkup(result);
  const v3=window.__KERBSIDE_FORECAST_V3__,date=new Date(`${state.sourceDate||route().date}T12:00:00`);"""
tt=replace_once(tt,old,new,'scheduled live explanation')
# Live refresh must preserve the same source wording instead of reverting to confidence text.
tt=replace_once(tt,"const conf=service.isCancelled?'service cancelled':service.journeyType==='connection'?`${result.confidence} confidence · peak leg`:`${result.confidence} confidence`;","const conf=service.isCancelled?'service cancelled':service.journeyType==='connection'?crowdSourceText(result,true):crowdSourceText(result);",'refresh crowd source')
tt=replace_once(tt,"const note=`${legResult.confidence||'Low'} confidence`;if(small&&small.textContent!==note){small.textContent=note;changed=true;}","const note=crowdSourceText(legResult);if(small&&small.textContent!==note){small.textContent=note;changed=true;}",'refresh leg source')
tt=replace_once(tt,"reason=recoveryResult.reasons&&recoveryResult.reasons[0]||'',note=`${recoveryResult.confidence||'Low'} confidence${reason?` · ${reason}`:''}`,title=","reason=recoveryResult.reasons&&recoveryResult.reasons[0]||'',note=`${crowdSourceText(recoveryResult)}${reason?` · ${reason}`:''}`,title=",'refresh recovery source')
# Add coach detail beneath connection legs when direct values are available.
old="""    return `<div class=\"train-connection-leg\"><span class=\"train-connection-time\"><b>${esc(depart||'—')}</b><small>${esc(arrive||'—')}${live?' · live':''}</small></span><span class=\"train-connection-route\"><b>${esc(`${from} → ${to}`)}</b><small>${esc(`${leg.operator||'Scheduled service'}${train} · ${platform} · ${live?'live':'scheduled'}`)}</small></span><span class=\"train-connection-crowd crowd-${esc(crowd.level||'unknown')}\" title=\"${esc((crowd.reasons||[]).join(', '))}\"><i></i><b>${esc(crowd.label||'Forecast pending')}</b><small>${esc(crowdSourceText(crowd))}</small></span></div>`;"""
new="""    const loading=window.__KERBSIDE_TRAIN_LOADING__,coachDetail=crowd&&crowd.liveLoading&&loading&&typeof loading.coachMarkup==='function'?loading.coachMarkup(crowd):'';
    return `<div class=\"train-connection-leg\"><span class=\"train-connection-time\"><b>${esc(depart||'—')}</b><small>${esc(arrive||'—')}${live?' · live':''}</small></span><span class=\"train-connection-route\"><b>${esc(`${from} → ${to}`)}</b><small>${esc(`${leg.operator||'Scheduled service'}${train} · ${platform} · ${live?'live':'scheduled'}`)}</small></span><span class=\"train-connection-crowd crowd-${esc(crowd.level||'unknown')}\" title=\"${esc((crowd.reasons||[]).join(', '))}\"><i></i><b>${esc(crowd.label||'Forecast pending')}</b><small>${esc(crowdSourceText(crowd))}</small></span></div>${coachDetail}`;"""
tt=replace_once(tt,old,new,'connection coach detail')
write('kerbside-train-timetable.js',tt)

# ---------- presentation styles ----------
css=read('kerbside-trains.css')
if '.train-live-loading{' not in css:
    css += """

/* Kerbside 0.8.7 — direct Darwin coach-loading evidence. */
.train-live-loading{margin:12px 0;padding:11px;border:1px solid var(--rule);border-radius:var(--radius);background:rgb(var(--ink-rgb) / .22)}
.train-loading-summary{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:6px 0 9px}.train-loading-summary strong{font-family:'Martian Mono',monospace;color:var(--led);font-size:13px}.train-loading-summary span{font-size:11px;color:var(--text-dim);text-align:right}
.train-loading-coaches{display:grid;grid-template-columns:repeat(auto-fit,minmax(86px,1fr));gap:6px}.train-loading-coach{display:flex;flex-direction:column;gap:2px;padding:7px;border:1px solid var(--rule);border-radius:6px;background:var(--ink-2)}.train-loading-coach b{font-size:11px}.train-loading-coach small{font-size:10px;color:var(--text-dim)}
.train-loading-tip{margin:9px 0 0;font-size:11px;color:var(--live-soft)}.train-loading-note{margin:8px 0 0;font-size:10.5px;line-height:1.5;color:var(--text-dim)}
.train-connection-itinerary .train-live-loading{margin:0 0 8px 96px}
@media(max-width:520px){.train-loading-summary{align-items:flex-start;flex-direction:column}.train-loading-summary span{text-align:left}.train-connection-itinerary .train-live-loading{margin-left:0}}
"""
write('kerbside-trains.css',css)

# ---------- version ----------
write('VERSION','0.8.7\n')
wrangler=read('kerbside-backend/wrangler.toml')
wrangler=re.sub(r'# Production alignment marker for Kerbside [^\n]+', '# Production alignment marker for Kerbside 0.8.7 Live Loading, 2026-08-13.',wrangler,count=1)
write('kerbside-backend/wrangler.toml',wrangler)
subprocess.run(['python3','.github/scripts/sync-version.py'],cwd=ROOT,check=True)

# ---------- deterministic release guards ----------
checks={
  'bus loading script': 'kerbside-train-loading.js?v=0.8.7' in read('bus.html'),
  'direct loading wrapper': 'loading.applyToForecast(base,service)' in read('kerbside-trains.js'),
  'timetable loading wrapper': 'loading.applyToForecast(base,candidate)' in read('kerbside-train-timetable.js'),
  'connection coach detail': 'coachDetail=crowd&&crowd.liveLoading' in read('kerbside-train-timetable.js'),
  'live evidence provenance': 'Live train-loading evidence' in read('kerbside-train-loading.js'),
  'strict loading flag': 'coach.loadingSpecified!==true' in read('kerbside-train-loading.js'),
  'fallback guarantee': 'falls back to Forecast v4' in read('kerbside-train-loading.js'),
}
failed=[name for name,ok in checks.items() if not ok]
if failed: raise SystemExit('release guards failed: '+', '.join(failed))
print('Kerbside 0.8.7 live-loading patch applied and guarded.')
