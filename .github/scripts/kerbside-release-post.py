#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

ROOT = Path.cwd()


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one exact match, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


def regex_once(path, pattern, replacement, flags=0):
    text = read(path)
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{path}: expected one regex match, found {count}: {pattern[:160]!r}')
    write(path, next_text)


version_path = ROOT / 'VERSION'
old_version = version_path.read_text(encoding='utf-8').strip()
if old_version != '0.9.39':
    raise SystemExit(f'Expected VERSION 0.9.39, found {old_version!r}')
version_path.write_text('0.9.40\n', encoding='utf-8')

# Bus board: past timetable placeholders disappear immediately; fresh late buses
# remain visible through the independent realtime/GPS rows until they pass.
replace_once(
    'bus.html',
    "const LIVE_DUE_SECONDS = 45;\nconst SCHEDULE_DUE_SECONDS = 45;\n// An untracked late bus must not disappear exactly as its scheduled minute\n// passes. Retain it briefly, explicitly as an overdue schedule rather than GPS.\nconst SCHEDULE_UNVERIFIED_PAST_MS = 15*60*1000;",
    "const LIVE_DUE_SECONDS = 45;\nconst SCHEDULE_DUE_SECONDS = 45;\n// Timetable-only rows are future calls only. A genuinely late bus is kept by\n// the separate realtime/GPS path until stop-progress evidence says it passed;\n// we do not keep an unverified schedule placeholder around as a misleading Past row."
)
replace_once('bus.html', "    if(r.at<now-SCHEDULE_UNVERIFIED_PAST_MS || r.at>end) return false;", "    if(r.at<now || r.at>end) return false;")
replace_once(
    'bus.html',
    "  return eligible.slice(0,MAX_SCHEDULED_ROWS).map(schedule=>{\n    const overdue=schedule.at<now, reason=scheduleLiveReason(schedule,liveRows,evidenceCache);\n    return {kind:'scheduled',schedule,overdue,secs:Math.max(0,(schedule.at-now)/1000),\n      liveReason:overdue?'scheduled time passed · '+reason:reason};\n  });",
    "  return eligible.slice(0,MAX_SCHEDULED_ROWS).map(schedule=>{\n    const reason=scheduleLiveReason(schedule,liveRows,evidenceCache);\n    return {kind:'scheduled',schedule,secs:Math.max(0,(schedule.at-now)/1000),liveReason:reason};\n  });"
)
replace_once(
    'bus.html',
    "function renderScheduledRow(r){\n  const s=r.schedule, mins=Math.max(0,Math.round(r.secs/60)), overdue=!!r.overdue, due=!overdue&&dueWithin(r.secs,SCHEDULE_DUE_SECONDS), source=timetableSourceLabel();",
    "function renderScheduledRow(r){\n  const s=r.schedule, mins=Math.max(0,Math.round(r.secs/60)), due=dueWithin(r.secs,SCHEDULE_DUE_SECONDS), source=timetableSourceLabel();"
)
replace_once(
    'bus.html',
    "    +'<span class=\"eta scheduled\">'+(overdue?'past':due?'due':mins)+'<small>'+(overdue||due?'scheduled':'min')+'</small></span></div>';",
    "    +'<span class=\"eta scheduled\">'+(due?'due':mins)+'<small>'+(due?'scheduled':'min')+'</small></span></div>';"
)

# Planner: save exact currently-rendered board services into the Saved Journeys
# locator store and repeat the selected travel date on each result row.
replace_once(
    'kerbside-journey-planner-core.js',
    "function planSavedSelector(service){return {serviceID:String(service&&(service.serviceID||service.serviceId)||''),uid:String(service&&service.uid||''),trainId:String(service&&service.trainId||''),std:String(service&&(service.std||service.departure)||'')};}",
    "function planSavedSelector(service){return {serviceID:String(service&&(service.serviceID||service.serviceId||service.serviceIdUrlSafe||service.serviceIdGuid)||''),uid:String(service&&service.uid||''),trainId:String(service&&(service.trainId||service.trainid)||''),std:String(service&&(service.std||service.departure)||'')};}"
)
board_helpers = r'''
function planBoardArrival(service,to){
  const direct=String(service&&(service.arrival||service.sta||service.eta)||'');if(/^\d{1,2}:\d{2}$/.test(direct))return direct;
  const wanted=String(to&&to.crs||'').toUpperCase(),groups=Array.isArray(service&&service.subsequentCallingPoints)?service.subsequentCallingPoints:[];let last='';
  for(const group of groups){const points=Array.isArray(group&&group.callingPoint)?group.callingPoint:Array.isArray(group&&group.callingPoints)?group.callingPoints:[];for(const point of points){if(!point)continue;const value=String(point.et||point.at||point.st||'');if(/^\d{1,2}:\d{2}$/.test(value))last=value;if(wanted&&String(point.crs||'').toUpperCase()===wanted&&last)return last;}}
  return last;
}
function planSavedLocatorForBoardService(row,context={}){
  if(!row)return null;const trains=window.__KERBSIDE_TRAINS__,routes=window.__KERBSIDE_TRAIN_ROUTES__,dates=window.__KERBSIDE_TRAIN_DATE__,connection=row.journeyType==='connection',first=connection&&row.legs&&row.legs[0],onward=connection&&row.legs&&row.legs[1],rawDestination=Array.isArray(row.destination)?row.destination.find(Boolean):null;
  const from=planStation(context.from||trains&&trains.state&&trains.state.station||row.from),to=planStation(context.to||routes&&routes.state&&routes.state.destination||row.to||(rawDestination?{name:rawDestination.locationName||rawDestination.name,crs:rawDestination.crs}:null)),date=String(context.date||dates&&dates.state&&dates.state.date||'');
  if(!from||!to||from.crs===to.crs||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  const departure=String(connection?(first&&first.std||row.std||row.departure||''):(row.std||row.departure||'')),arrival=String(connection?(onward&&onward.arrival||row.arrival||''):planBoardArrival(row,to)),minute=planTimeMinutes(departure),searchStart=minute==null?'':planClock(Math.max(0,minute-30)),searchEnd=minute==null?'':planClock(Math.min(1439,minute+90));
  const item={v:1,id:'',savedAt:new Date().toISOString(),refreshedAt:'',date,from,to,journeyType:connection?'connection':'direct',service:connection?normaliseSavedSelector(null):planSavedSelector(row),first:connection?planSavedSelector(first):normaliseSavedSelector(null),onward:connection?planSavedSelector(onward):normaliseSavedSelector(null),change:connection?String(row.interchange&&row.interchange.crs||'').toUpperCase():'',scheduledDeparture:departure,scheduledArrival:arrival,searchStart,searchEnd,preference:planPreference(),constraints:{maxChanges:connection?1:0,connectionBuffer:0}};
  item.id=planSavedLocatorId(item);return normaliseSavedJourney(item);
}
function planBoardServiceSaved(service,context={}){const locator=planSavedLocatorForBoardService(service,context);if(!locator)return null;return readSavedJourneys().find(item=>item.id===locator.id)||null;}
function planSaveBoardService(service,context={}){
  const locator=planSavedLocatorForBoardService(service,context);if(!locator)return null;const rows=readSavedJourneys(),existing=rows.find(item=>item.id===locator.id);if(existing)return existing;
  writeSavedJourneys([locator,...rows]);renderSavedJourneys();planSyncSaveButtons();const saved=window.__KERBSIDE_SAVED_JOURNEYS_V2__;if(saved&&typeof saved.syncSaved==='function')saved.syncSaved();if(saved&&typeof saved.refreshSavedJourney==='function')Promise.resolve(saved.refreshSavedJourney(locator.id,{force:true,reason:'board-save'})).catch(()=>{});return locator;
}
'''.strip('\n')
regex_once(
    'kerbside-journey-planner-core.js',
    r"(function planSavedLocatorForCandidate\(row,preserve=null\)\{.*?return normaliseSavedJourney\(item\);\})\n(function planSavedEntryForCandidate)",
    lambda m: m.group(1) + "\n" + board_helpers + "\n" + m.group(2),
    re.S
)
replace_once(
    'kerbside-journey-planner-core.js',
    "    <div class=\"plan-result-rank\"><span>${index===0?'Best match':`#${index+1}`}</span><b>${esc(row.std||row.departure||'')} → ${esc(row.arrival||'')}</b></div>",
    "    <div class=\"plan-result-rank\"><span>${index===0?'Best match':`#${index+1}`}</span><b>${esc(row.std||row.departure||'')} → ${esc(row.arrival||'')}</b><small class=\"plan-result-date\">${esc(planDateLabel(planDateValue()))}</small></div>"
)
replace_once(
    'kerbside-journey-planner-core.js',
    ".plan-result-rank b{margin-top:4px;font-family:'Martian Mono',monospace;font-size:13px;color:var(--text)}",
    ".plan-result-rank b{margin-top:4px;font-family:'Martian Mono',monospace;font-size:13px;color:var(--text)}.plan-result-date{margin-top:4px;color:var(--text-dim);font-size:9px;line-height:1.35}"
)
replace_once(
    'kerbside-journey-planner-core.js',
    "window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,isFutureJourney,syncRouteOrigin,refreshJourneyBoard,syncDepartAfterForDate,railNow,installPlanJourney,setPlanView,searchPlanJourneys,planRankEnriched,preferenceScore,planConnectionStress,normalisePlanConstraints,planCandidateMeetsConstraints,planFilterCandidates,readSavedJourneys,planMatchSavedJourney,planOpenSavedJourney,planRemoveSavedJourney,planToggleSavedByKey,get planState(){return planState;},get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};",
    "window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,isFutureJourney,syncRouteOrigin,refreshJourneyBoard,syncDepartAfterForDate,railNow,installPlanJourney,setPlanView,searchPlanJourneys,planRankEnriched,preferenceScore,planConnectionStress,normalisePlanConstraints,planCandidateMeetsConstraints,planFilterCandidates,readSavedJourneys,planMatchSavedJourney,planOpenSavedJourney,planRemoveSavedJourney,planToggleSavedByKey,planBoardServiceSaved,planSaveBoardService,planEventDisplayRows,get planState(){return planState;},get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};"
)

# Saved Journeys can keep one same-day save live in place. Only that save gets
# movement polling and event context; the rest of the saved overview stays idle.
replace_once(
    'kerbside-journey-planner-core.js',
    "const state={installed:false,active:false,saved:[],meta:{entries:{},coverageKey:'',updatedAt:''},live:new Map(),hidden:new Map(),refreshing:new Set(),starting:new Set(),actionMessages:new Map(),refreshAllPromise:null,timer:null,coverageTimer:null,lastRefreshAt:0};",
    "const state={installed:false,active:false,saved:[],meta:{entries:{},coverageKey:'',updatedAt:''},live:new Map(),events:new Map(),hidden:new Map(),refreshing:new Set(),starting:new Set(),actionMessages:new Map(),refreshAllPromise:null,timer:null,coverageTimer:null,lastRefreshAt:0};"
)
event_helpers = r'''
function savedEventMarkup(saved,sameActive){const rows=sameActive&&Array.isArray(state.events.get(saved.id))?state.events.get(saved.id):[];if(!rows.length)return'';return `<div class="saved-v2-events"><span>Match & event context</span><div>${rows.map(event=>{const at=Number.isFinite(Number(event.start))?clock(Number(event.start)):'Time TBC',football=String(event.type||'').toLowerCase()==='football'?'Football · ':'';return `<div class="saved-v2-event"><b>${esc(`${football}${event.title||'Event'}`)}</b><small>${esc(`${at}${event.place?` · ${event.place}`:''}`)}</small></div>`;}).join('')}</div></div>`;}
async function refreshFollowEvents(saved,service=null){
  const events=window.__KERBSIDE_EVENTS__,plan=planner();if(!saved||!events||!plan||typeof plan.planEventDisplayRows!=='function'){if(saved)state.events.set(saved.id,[]);return[];}
  const row=service||window.__KERBSIDE_ACTIVE_JOURNEY__&&window.__KERBSIDE_ACTIVE_JOURNEY__.activeService&&window.__KERBSIDE_ACTIVE_JOURNEY__.activeService(),interchanges=row&&row.journeyType==='connection'?[String(row.interchange&&row.interchange.name||row.interchange&&row.interchange.crs||'')].filter(Boolean):[],journey={origin:saved.from.name,originCrs:saved.from.crs,destination:saved.to.name,destinationCrs:saved.to.crs,interchanges,date:saved.date};
  const tasks=[];if(typeof events.footballEventsFor==='function')tasks.push(Promise.resolve().then(()=>events.footballEventsFor(saved.date)));if(typeof events.wikidataEventsForJourney==='function')tasks.push(Promise.resolve().then(()=>events.wikidataEventsForJourney(journey)));const settled=await Promise.allSettled(tasks),raw=[];for(const result of settled)if(result.status==='fulfilled'&&Array.isArray(result.value))raw.push(...result.value);const rows=plan.planEventDisplayRows(raw,row?[row]:[],saved.from,saved.to,saved.date);state.events.set(saved.id,rows);if(state.active)renderSavedView();return rows;
}
'''.strip('\n')
replace_once(
    'kerbside-journey-planner-core.js',
    "function savedSort(a,b){const ax=`${a.date}|${a.scheduledDeparture||'99:99'}`,bx=`${b.date}|${b.scheduledDeparture||'99:99'}`,today=todayLondon(),ap=a.date<today,bp=b.date<today;if(ap!==bp)return ap?1:-1;return ax.localeCompare(bx);}",
    "function savedSort(a,b){const ax=`${a.date}|${a.scheduledDeparture||'99:99'}`,bx=`${b.date}|${b.scheduledDeparture||'99:99'}`,today=todayLondon(),ap=a.date<today,bp=b.date<today;if(ap!==bp)return ap?1:-1;return ax.localeCompare(bx);}\n" + event_helpers
)
new_card = r'''function cardMarkup(saved){const meta=ensureMeta(saved),resolved=meta.lastResolved||baselineFromSaved(saved,meta.source),live=state.live.get(saved.id),changes=Array.isArray(meta.changes)?meta.changes:[],busy=state.refreshing.has(saved.id),starting=state.starting.has(saved.id),sameActive=activeMatchesSaved(saved),startable=sameActive||canStartActiveSavedJourney(saved,meta,live),status=meta.status||'planned',times=`${resolved.departure||saved.scheduledDeparture||'—'} → ${resolved.arrival||saved.scheduledArrival||'—'}`,source=sourceLabel(resolved.source||meta.source),changeMarkup=changes.length?`<ul class="saved-v2-changes">${changes.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class="saved-v2-nochange">No timetable changes detected since this journey was saved.</p>',liveMarkup=liveText(live)?`<div class="saved-v2-live">${esc(liveText(live))}</div>`:'',eventMarkup=savedEventMarkup(saved,sameActive),actionMessage=state.actionMessages.get(saved.id)||'',error=meta.lastError||actionMessage?`<div class="saved-v2-error">${esc(actionMessage||meta.lastError)}</div>`:'',followAction=startable?`<button type="button" class="saved-v2-follow" data-saved-v2-follow="${esc(saved.id)}" aria-pressed="${sameActive?'true':'false'}"${busy||starting?' disabled':''}>${sameActive?'Following live':starting?'Starting…':'Follow live here'}</button>`:'',activeAction=startable?`<button type="button" class="saved-v2-active" data-saved-v2-active="${esc(saved.id)}"${busy||starting?' disabled':''}>${sameActive?'Open active journey':starting?'Starting…':'Start active journey'}</button>`:'';return `<article class="saved-v2-card" data-saved-v2-id="${esc(saved.id)}"><header><div><span class="saved-v2-date">${esc(dateLabel(saved.date))}</span><h3>${esc(saved.from.name)} → ${esc(saved.to.name)}</h3></div>${statusMarkup(status)}</header><div class="saved-v2-times"><strong>${esc(times)}</strong><span>${esc(source)}</span></div>${liveMarkup}${eventMarkup}<div class="saved-v2-intent"><span>Saved plan</span><strong>${esc(intentLabel(saved))}</strong></div><div class="saved-v2-changes-wrap"><span>Since you saved it</span>${changeMarkup}</div>${error}<footer><span>${esc(relativeCheck(meta.lastChecked))}${busy?' · Refreshing…':''}</span><div>${followAction}${activeAction}<button type="button" data-saved-v2-open="${esc(saved.id)}">Open in planner</button><button type="button" data-saved-v2-refresh="${esc(saved.id)}"${busy?' disabled':''}>Refresh now</button><button type="button" class="saved-v2-remove" data-saved-v2-remove="${esc(saved.id)}">Remove</button></div></footer></article>`;}'''
regex_once('kerbside-journey-planner-core.js', r"function cardMarkup\(saved\)\{.*?\}\nfunction renderSavedView", new_card + "\nfunction renderSavedView", re.S)
replace_once(
    'kerbside-journey-planner-core.js',
    "function enterSavedView(){const api=planner(),sidebar=document.querySelector('.train-sidebar'),content=document.querySelector('.train-content'),tabs=$('trainViewTabs'),side=$('savedJourneySidebar'),surface=$('savedJourneySurface');if(!api||!sidebar||!content||!tabs||!side||!surface)return false;if(typeof api.setPlanView==='function')api.setPlanView(false);state.hidden.clear();snapshotHidden(sidebar,new Set([tabs,side]));snapshotHidden(content,new Set([surface]));side.hidden=false;surface.hidden=false;state.active=true;tabs.querySelectorAll('[data-train-view]').forEach(button=>{const selected=button.dataset.trainView==='saved';button.setAttribute('aria-selected',String(selected));button.setAttribute('aria-pressed',String(selected));});syncSaved();refreshAll({force:true,reason:'saved-tab'});return true;}",
    "function enterSavedView(){const api=planner(),sidebar=document.querySelector('.train-sidebar'),content=document.querySelector('.train-content'),tabs=$('trainViewTabs'),side=$('savedJourneySidebar'),surface=$('savedJourneySurface');if(!api||!sidebar||!content||!tabs||!side||!surface)return false;if(typeof api.setPlanView==='function')api.setPlanView(false);state.hidden.clear();snapshotHidden(sidebar,new Set([tabs,side]));snapshotHidden(content,new Set([surface]));side.hidden=false;surface.hidden=false;state.active=true;tabs.querySelectorAll('[data-train-view]').forEach(button=>{const selected=button.dataset.trainView==='saved';button.setAttribute('aria-selected',String(selected));button.setAttribute('aria-pressed',String(selected));});syncSaved();refreshAll({force:true,reason:'saved-tab'});const followed=state.saved.find(activeMatchesSaved);if(followed){refreshFollowEvents(followed).catch(()=>{});setTimeout(()=>window.__KERBSIDE_TRAIN_MOVEMENT__?.refresh?.({force:true}),0);}return true;}"
)
replace_once('kerbside-journey-planner-core.js', "async function startActiveSavedJourney(id){", "async function startActiveSavedJourney(id,{stayInSaved=false}={}){")
replace_once(
    'kerbside-journey-planner-core.js',
    "  if(activeMatchesSaved(saved)){state.actionMessages.delete(saved.id);return showActiveJourney();}",
    "  if(activeMatchesSaved(saved)){state.actionMessages.delete(saved.id);if(stayInSaved){refreshFollowEvents(saved).catch(()=>{});renderSavedView();setTimeout(()=>window.__KERBSIDE_TRAIN_MOVEMENT__?.refresh?.({force:true}),0);return true;}return showActiveJourney();}"
)
replace_once(
    'kerbside-journey-planner-core.js',
    "    state.actionMessages.delete(saved.id);return showActiveJourney();",
    "    state.actionMessages.delete(saved.id);if(stayInSaved){refreshFollowEvents(saved,match.candidate).catch(()=>{});renderSavedView();setTimeout(()=>window.__KERBSIDE_TRAIN_MOVEMENT__?.refresh?.({force:true}),0);return true;}return showActiveJourney();"
)
replace_once(
    'kerbside-journey-planner-core.js',
    "  finally{state.starting.delete(saved&&saved.id||String(id||''));if(state.active)renderSavedView();}\n}\nasync function refreshSavedJourney",
    "  finally{state.starting.delete(saved&&saved.id||String(id||''));if(state.active)renderSavedView();}\n}\nasync function followSavedJourney(id){return startActiveSavedJourney(id,{stayInSaved:true});}\nasync function refreshSavedJourney"
)
replace_once(
    'kerbside-journey-planner-core.js',
    "$('savedJourneyList').addEventListener('click',async event=>{const active=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-active]'),open=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-open]'),refresh=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-refresh]'),remove=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-remove]');if(active){await startActiveSavedJourney(active.getAttribute('data-saved-v2-active'));}else if(open){const id=open.getAttribute('data-saved-v2-open');exitSavedView();await api.planOpenSavedJourney(id);syncSaved();}else if(refresh){state.actionMessages.delete(refresh.getAttribute('data-saved-v2-refresh'));await refreshSavedJourney(refresh.getAttribute('data-saved-v2-refresh'),{force:true,reason:'manual'});}else if(remove){const id=remove.getAttribute('data-saved-v2-remove');api.planRemoveSavedJourney(id);delete state.meta.entries[id];state.live.delete(id);state.actionMessages.delete(id);writeMeta();syncSaved();}});",
    "$('savedJourneyList').addEventListener('click',async event=>{const follow=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-follow]'),active=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-active]'),open=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-open]'),refresh=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-refresh]'),remove=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-remove]');if(follow){await followSavedJourney(follow.getAttribute('data-saved-v2-follow'));}else if(active){await startActiveSavedJourney(active.getAttribute('data-saved-v2-active'));}else if(open){const id=open.getAttribute('data-saved-v2-open');exitSavedView();await api.planOpenSavedJourney(id);syncSaved();}else if(refresh){state.actionMessages.delete(refresh.getAttribute('data-saved-v2-refresh'));await refreshSavedJourney(refresh.getAttribute('data-saved-v2-refresh'),{force:true,reason:'manual'});}else if(remove){const id=remove.getAttribute('data-saved-v2-remove');api.planRemoveSavedJourney(id);delete state.meta.entries[id];state.live.delete(id);state.events.delete(id);state.actionMessages.delete(id);writeMeta();syncSaved();}});"
)
replace_once(
    'kerbside-journey-planner-core.js',
    ".saved-v2-live{padding:8px 9px;border:1px solid rgb(var(--led-rgb) / .24);border-radius:8px;background:rgb(var(--led-rgb) / .06);font-size:10px;font-weight:800}",
    ".saved-v2-live{padding:8px 9px;border:1px solid rgb(var(--led-rgb) / .24);border-radius:8px;background:rgb(var(--led-rgb) / .06);font-size:10px;font-weight:800}.saved-v2-events{display:grid;gap:6px;padding:9px;border:1px solid rgb(var(--led-rgb) / .22);border-radius:9px;background:rgb(var(--led-rgb) / .04)}.saved-v2-events>span{color:var(--led);font-size:8.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.saved-v2-events>div{display:flex;gap:6px;flex-wrap:wrap}.saved-v2-event{display:grid;gap:2px;min-width:170px;padding:7px 8px;border:1px solid var(--rule);border-radius:8px;background:var(--ink)}.saved-v2-event b{font-size:10px}.saved-v2-event small{color:var(--text-dim);font-size:9px;line-height:1.35}"
)
replace_once(
    'kerbside-journey-planner-core.js',
    ".saved-v2-card .saved-v2-active{border-color:rgb(var(--live-rgb) / .38);background:rgb(var(--live-rgb) / .07);color:var(--live)}",
    ".saved-v2-card .saved-v2-active{border-color:rgb(var(--live-rgb) / .38);background:rgb(var(--live-rgb) / .07);color:var(--live)}.saved-v2-card .saved-v2-follow{border-color:rgb(var(--led-rgb) / .38);background:rgb(var(--led-rgb) / .07);color:var(--led)}.saved-v2-card .saved-v2-follow[aria-pressed=\"true\"]{border-color:rgb(var(--live-rgb) / .42);background:rgb(var(--live-rgb) / .08);color:var(--live)}"
)
replace_once(
    'kerbside-journey-planner-core.js',
    "window.__KERBSIDE_SAVED_JOURNEYS_V2__={state,install,enterSavedView,exitSavedView,syncSaved,refreshSavedJourney,refreshAll,checkCoverageSnapshot,changesSinceSaved,statusFor,summaryFromCandidate,chooseAlternative,canStartActiveSavedJourney,activeMatchesSaved,startActiveSavedJourney};",
    "window.__KERBSIDE_SAVED_JOURNEYS_V2__={state,install,enterSavedView,exitSavedView,syncSaved,refreshSavedJourney,refreshAll,checkCoverageSnapshot,changesSinceSaved,statusFor,summaryFromCandidate,chooseAlternative,canStartActiveSavedJourney,activeMatchesSaved,startActiveSavedJourney,followSavedJourney,refreshFollowEvents};"
)

# Movement: Saved Journeys polls only the saved item that owns Active Journey.
replace_once(
    'kerbside-train-movement.js',
    "  const activeApi=window.__KERBSIDE_ACTIVE_JOURNEY__,active=activeApi?.state?.active,activeRoot=document.getElementById('trainActiveJourney');\n  if(active&&text(active.date)===today&&elementVisible(activeRoot)){\n    const services=active.journeyType==='connection'?[active.first,active.onward]:[active.service];\n    services.filter(Boolean).forEach(service=>addTarget(targets,service,today,'active'));\n    return finishScope('active',targets);\n  }",
    "  const activeApi=window.__KERBSIDE_ACTIVE_JOURNEY__,active=activeApi?.state?.active,activeRoot=document.getElementById('trainActiveJourney'),savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__,activeOnSaved=!!(active&&savedApi?.state?.active&&Array.isArray(savedApi.state.saved)&&typeof savedApi.activeMatchesSaved==='function'&&savedApi.state.saved.some(saved=>savedApi.activeMatchesSaved(saved)));\n  if(active&&text(active.date)===today&&(elementVisible(activeRoot)||activeOnSaved)){\n    const services=active.journeyType==='connection'?[active.first,active.onward]:[active.service];\n    services.filter(Boolean).forEach(service=>addTarget(targets,service,today,activeOnSaved?'saved-active':'active'));\n    return finishScope(activeOnSaved?'saved-active':'active',targets);\n  }"
)
replace_once('kerbside-train-movement.js', "  const savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__;\n  if(savedApi?.state?.active)return finishScope('saved',targets);", "  if(savedApi?.state?.active)return finishScope('saved',targets);")
replace_once(
    'kerbside-train-movement.js',
    "  for(const card of document.querySelectorAll('[data-saved-v2-id]')){\n    const saved=byId.get(String(card.getAttribute('data-saved-v2-id'))),snapshot=saved&&isToday(saved.date)?savedSelectorMovement(saved,saved.date):null,info=progress(snapshot);let node=card.querySelector(':scope > .saved-movement-inline');\n    if(!info){if(node)node.remove();continue;}if(!node){node=document.createElement('div');node.className='saved-movement-inline';const times=card.querySelector('.saved-v2-times');(times||card.firstElementChild)?.insertAdjacentElement('afterend',node);}node.className=`saved-movement-inline movement-${info.tone}`;setText(node,info.short);\n  }",
    "  const savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__;\n  for(const card of document.querySelectorAll('[data-saved-v2-id]')){\n    const saved=byId.get(String(card.getAttribute('data-saved-v2-id'))),snapshot=saved&&isToday(saved.date)?savedSelectorMovement(saved,saved.date):null,info=progress(snapshot),following=!!(saved&&savedApi&&typeof savedApi.activeMatchesSaved==='function'&&savedApi.activeMatchesSaved(saved));let node=card.querySelector(':scope > .saved-movement-inline');\n    ensureCard(card,following?snapshot:null,{compact:true});\n    if(!info){if(node)node.remove();continue;}if(!node){node=document.createElement('div');node.className='saved-movement-inline';const times=card.querySelector('.saved-v2-times');(times||card.firstElementChild)?.insertAdjacentElement('afterend',node);}node.className=`saved-movement-inline movement-${info.tone}`;setText(node,info.short);\n  }"
)

# Scheduled board: add Save journey next to Journey Watch.
replace_once(
    'kerbside-train-timetable.js',
    "    const watch=closest?closest('[data-watch-journey]'):null;\n    if(watch&&board.contains(watch)){event.preventDefault();event.stopPropagation();toggleJourneyWatchByKey(watch.getAttribute('data-watch-journey'));return;}\n    const button=closest?closest('[data-scheduled-toggle]'):null;",
    "    const save=closest?closest('[data-save-scheduled-journey]'):null;\n    if(save&&board.contains(save)){event.preventDefault();event.stopPropagation();saveJourneyByKey(save.getAttribute('data-save-scheduled-journey'));return;}\n    const watch=closest?closest('[data-watch-journey]'):null;\n    if(watch&&board.contains(watch)){event.preventDefault();event.stopPropagation();toggleJourneyWatchByKey(watch.getAttribute('data-watch-journey'));return;}\n    const button=closest?closest('[data-scheduled-toggle]'):null;"
)
new_watch = r'''function journeyWatchMarkup(service,key){
  const active=watchMatches(service),status=journeyWatchStatus(service),cls=`train-watch-card${active?' is-active':''}${active&&status.warn?' is-warn':''}`,r=route(),plan=window.__KERBSIDE_JOURNEY_PLANNER__,saved=!!(plan&&typeof plan.planBoardServiceSaved==='function'&&plan.planBoardServiceSaved(service,{date:r.date,from:r.from,to:r.to}));
  const label=active?status.label:'Keep this journey together',note=active?`${status.note} Kerbside refreshes this watch while the app is open.`:'Pin this journey so its live status, connection margin and recovery option stay together while Kerbside is open.';
  return `<div class="${cls}"><div><span>Journey Watch</span><strong>${esc(label)}</strong><small>${esc(note)}</small></div><div class="train-watch-actions"><button type="button" class="train-watch-action" data-watch-journey="${esc(key)}" aria-pressed="${active?'true':'false'}">${active?'Stop watching':'Watch journey'}</button><button type="button" class="train-watch-action" data-save-scheduled-journey="${esc(key)}"${saved?' disabled':''}>${saved?'Saved':'Save journey'}</button></div></div>`;
}'''
regex_once('kerbside-train-timetable.js', r"function journeyWatchMarkup\(service,key\)\{.*?\n\}", new_watch, re.S)
replace_once(
    'kerbside-train-timetable.js',
    "function toggleJourneyWatchByKey(key){\n  const index=state.services.findIndex((service,i)=>serviceKey(service,i)===String(key||''));if(index<0)return false;const service=state.services[index];\n  if(watchMatches(service))persistJourneyWatch(null);else persistJourneyWatch(journeyWatchPayload(service));\n  renderRows(state.services,{mode:state.mode,manifest:state.manifest});return true;\n}",
    "function toggleJourneyWatchByKey(key){\n  const index=state.services.findIndex((service,i)=>serviceKey(service,i)===String(key||''));if(index<0)return false;const service=state.services[index];\n  if(watchMatches(service))persistJourneyWatch(null);else persistJourneyWatch(journeyWatchPayload(service));\n  renderRows(state.services,{mode:state.mode,manifest:state.manifest});return true;\n}\nfunction saveJourneyByKey(key){const index=state.services.findIndex((service,i)=>serviceKey(service,i)===String(key||''));if(index<0)return false;const plan=window.__KERBSIDE_JOURNEY_PLANNER__,r=route();if(!plan||typeof plan.planSaveBoardService!=='function')return false;const saved=plan.planSaveBoardService(state.services[index],{date:r.date,from:r.from,to:r.to});if(!saved)return false;renderRows(state.services,{mode:state.mode,manifest:state.manifest});return true;}"
)
replace_once(
    'kerbside-train-timetable.js',
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,recoverySummary,forecastConnection,forecastRecovery,forecast,effectiveDepartAfter,railNowTime,adoptRecoveryByKey,toggleJourneyWatchByKey,watchMatches,journeyWatchStatus,journeyWatchPayload,persistJourneyWatch,stableServiceId,connectionMinimumProvenance,connectionEvidenceProvenance,provider:timetableProvider};",
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,recoverySummary,forecastConnection,forecastRecovery,forecast,effectiveDepartAfter,railNowTime,adoptRecoveryByKey,toggleJourneyWatchByKey,saveJourneyByKey,watchMatches,journeyWatchStatus,journeyWatchPayload,persistJourneyWatch,stableServiceId,connectionMinimumProvenance,connectionEvidenceProvenance,provider:timetableProvider};"
)
replace_once(
    'kerbside-trains.css',
    ".train-watch-card>div{display:flex;flex-direction:column;min-width:0;gap:2px}",
    ".train-watch-card>div{display:flex;flex-direction:column;min-width:0;gap:2px}.train-watch-card>.train-watch-actions{flex-direction:row;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap}"
)
replace_once('kerbside-trains.css', "  .train-watch-action{justify-self:start}", "  .train-watch-card>.train-watch-actions{justify-content:flex-start}\n  .train-watch-action{justify-self:start}")

# Live Darwin board: equivalent Save journey action inside an opened service.
replace_once(
    'kerbside-trains.js',
    "  const key = serviceKey(service,index);\n  const recorded = feedbackForService(service,index);",
    "  const key = serviceKey(service,index);\n  const planner=window.__KERBSIDE_JOURNEY_PLANNER__,savedJourney=!!(planner&&typeof planner.planBoardServiceSaved==='function'&&planner.planBoardServiceSaved(service)),saveMarkup=planner&&typeof planner.planSaveBoardService==='function'?`<div class=\"train-model-card\"><span class=\"train-model-label\">Saved journey</span><strong>${savedJourney?'This journey is saved':'Keep following this train'}</strong><p>${savedJourney?'Open Saved journeys to refresh or follow it live.':'Save this exact service so it remains available after it leaves the departure board.'}</p><div class=\"train-search-box\" style=\"margin-top:8px\"><button type=\"button\" data-save-train-service=\"${esc(key)}\"${savedJourney?' disabled':''}>${savedJourney?'Saved':'Save journey'}</button></div></div>`:'';\n  const recorded = feedbackForService(service,index);"
)
replace_once(
    'kerbside-trains.js',
    "    ${liveLoading&&loadingApi&&typeof loadingApi.coachMarkup==='function'?loadingApi.coachMarkup(forecast):''}\n    <div class=\"train-model-card\">",
    "    ${liveLoading&&loadingApi&&typeof loadingApi.coachMarkup==='function'?loadingApi.coachMarkup(forecast):''}\n    ${saveMarkup}\n    <div class=\"train-model-card\">"
)
replace_once(
    'kerbside-trains.js',
    "  document.addEventListener('click',event=>{\n    const feedbackButton = event.target && event.target.closest ? event.target.closest('[data-crowd-feedback]') : null;\n    if(feedbackButton){ handleFeedbackClick(feedbackButton); return; }",
    "  document.addEventListener('click',event=>{\n    const saveButton = event.target && event.target.closest ? event.target.closest('[data-save-train-service]') : null;\n    if(saveButton){const key=saveButton.getAttribute('data-save-train-service'),index=state.services.findIndex((service,serviceIndex)=>serviceKey(service,serviceIndex)===key),planner=window.__KERBSIDE_JOURNEY_PLANNER__;if(index>=0&&planner&&typeof planner.planSaveBoardService==='function'&&planner.planSaveBoardService(state.services[index]))renderBoard();return;}\n    const feedbackButton = event.target && event.target.closest ? event.target.closest('[data-crowd-feedback]') : null;\n    if(feedbackButton){ handleFeedbackClick(feedbackButton); return; }"
)

# Regression updates.
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const SCHEDULE_UNVERIFIED_PAST_MS = 15\\*60\\*1000/);\nassert.match(busSource, /if\\(r\\.at<now-SCHEDULE_UNVERIFIED_PAST_MS \\|\\| r\\.at>end\\) return false;/);",
    "assert.doesNotMatch(busSource, /SCHEDULE_UNVERIFIED_PAST_MS/);\nassert.match(busSource, /if\\(r\\.at<now \\|\\| r\\.at>end\\) return false;/);\nassert.doesNotMatch(busSource, /overdue\\?'past'/);\nassert.match(busSource, /const liveRows=relevant\\(\\), scheduledRows=scheduledBoardRows\\(liveRows\\)/, 'late buses with current realtime evidence must keep using the independent live path');"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "  assert.deepEqual({...duplicateDeparture,overdueReason:undefined},{future:1,overdue:true,overdueFlag:true,expired:false,matchedOnly:0,identityOnly:0,blended:0,lost:1,overdueReason:undefined});\n  assert.match(duplicateDeparture.overdueReason,/^scheduled time passed · /,'a recently overdue unmatched departure must remain explicitly schedule-only');",
    "  assert.deepEqual({...duplicateDeparture,overdueReason:undefined},{future:1,overdue:false,overdueFlag:false,expired:false,matchedOnly:0,identityOnly:0,blended:0,lost:1,overdueReason:undefined});\n  assert.equal(duplicateDeparture.overdueReason,'','a past schedule-only departure must disappear instead of rendering Past');"
)
replace_once(
    'kerbside-backend/tests/train-movement-scope-regression.mjs',
    "assert.match(source, /if\\(savedApi\\?\\.state\\?\\.active\\)return finishScope\\('saved',targets\\);/, 'saved-journey overview must not continuously poll every saved train');",
    "assert.match(source, /activeOnSaved/, 'an Active Journey being viewed on Saved journeys must be recognised as a special scope');\nassert.match(source, /finishScope\\(activeOnSaved\\?'saved-active':'active',targets\\)/, 'Saved journeys may poll only the one service that owns Active Journey');\nassert.match(source, /if\\(savedApi\\?\\.state\\?\\.active\\)return finishScope\\('saved',targets\\);/, 'ordinary saved-journey overview must still avoid polling every saved train');\nassert.match(source, /ensureCard\\(card,following\\?snapshot:null,\\{compact:true\\}\\)/, 'the followed saved card must receive the detailed Network Rail movement card');"
)
replace_once(
    'kerbside-backend/tests/train-journey-planner-regression.mjs',
    "  await page.waitForFunction(()=>document.querySelectorAll('#planJourneyResults .plan-journey-result').length===3,undefined,{timeout:10000});",
    "  await page.waitForFunction(()=>document.querySelectorAll('#planJourneyResults .plan-journey-result').length===3,undefined,{timeout:10000});\n  const resultDates=await page.locator('#planJourneyResults .plan-result-date').allTextContents();\n  assert.equal(resultDates.length,3,'every planned result should repeat the selected travel date');\n  assert.ok(resultDates.every(text=>/12 Aug 2026/.test(text)),`future result dates should make the selected day explicit: ${JSON.stringify(resultDates)}`);"
)
replace_once(
    'kerbside-backend/tests/train-active-journey-regression.mjs',
    "  assert.equal(await savedStart.textContent(),'Start active journey');\n  await savedStart.click();",
    "  assert.equal(await savedStart.textContent(),'Start active journey');\n  const savedFollow=page.locator(`#savedJourneyList [data-saved-v2-follow=\"${savedSetup.id}\"]`);\n  await savedFollow.waitFor({state:'visible',timeout:10000});\n  assert.equal(await savedFollow.textContent(),'Follow live here');\n  await savedStart.click();"
)
replace_once(
    'kerbside-backend/tests/train-active-journey-regression.mjs',
    "  assert.equal(await openActive.textContent(),'Open active journey');\n  await openActive.click();",
    "  assert.equal(await openActive.textContent(),'Open active journey');\n  const following=page.locator(`#savedJourneyList [data-saved-v2-follow=\"${savedSetup.id}\"]`);\n  await following.waitFor({state:'visible',timeout:10000});\n  assert.equal(await following.textContent(),'Following live');\n  await openActive.click();"
)
replace_once(
    'kerbside-backend/tests/train-movement-scope-regression.mjs',
    "assert.match(timetableSource,/renderPoint\\(point,'passed'\\)/,'previous calling points must render as completed timeline rows');",
    "assert.match(timetableSource,/renderPoint\\(point,'passed'\\)/,'previous calling points must render as completed timeline rows');\nassert.match(timetableSource,/data-save-scheduled-journey/,'scheduled train rows must expose a persistent Save journey action');\nconst plannerSource=fs.readFileSync(new URL('../../kerbside-journey-planner-core.js', import.meta.url), 'utf8');\nassert.match(plannerSource,/planSaveBoardService/,'board services must be saved through the normal Saved Journeys locator store');\nassert.match(plannerSource,/data-saved-v2-follow/,'Saved Journeys must expose an in-place live follow action');\nassert.match(plannerSource,/Match & event context/,'the followed saved card must retain event context');"
)

subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)
subprocess.run(['python3', '.github/scripts/sync-version.py', '--check'], check=True)
print('Prepared Kerbside 0.9.40: persistent train saves/live follow, intelligent bus expiry, and explicit planner dates.')
