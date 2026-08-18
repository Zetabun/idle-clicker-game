from pathlib import Path
import re

OLD = "0.9.46"
NEW = "0.9.47"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path, old, new, label):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match in {path}, found {count}")
    write(path, text.replace(old, new, 1))


def regex_once(path, pattern, replacement, label, flags=0):
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match in {path}, found {count}")
    write(path, updated)


def replace_version(path):
    text = read(path)
    count = text.count(OLD)
    if count < 1:
        raise SystemExit(f"version sync: {path} does not contain {OLD}")
    write(path, text.replace(OLD, NEW))


Path("VERSION").write_text(NEW, encoding="utf-8")
for version_path in [
    "bus.html",
    "kerbside-backend/package.json",
    "kerbside-backend/src/worker.js",
    "kerbside-backend/test/worker.test.js",
    "kerbside-backend/tests/browser-regression.mjs",
    "kerbside-journey-planner-ui.js",
    "kerbside-saved-journeys-polish.js",
    "kerbside-status.js",
    "kerbside-train-movement-worker/worker.js",
    "kerbside-train-movement.js",
    "kerbside-trains.css",
]:
    replace_version(version_path)

replace_once(
    "kerbside-train-timetable.js",
    "    const recovery=closest?closest('[data-use-recovery]'):null;\n"
    "    if(recovery&&board.contains(recovery)){event.preventDefault();event.stopPropagation();adoptRecoveryByKey(recovery.getAttribute('data-use-recovery'));return;}\n"
    "    const save=closest?closest('[data-save-scheduled-journey]'):null;",
    "    const recovery=closest?closest('[data-use-recovery]'):null;\n"
    "    if(recovery&&board.contains(recovery)){event.preventDefault();event.stopPropagation();adoptRecoveryByKey(recovery.getAttribute('data-use-recovery'));return;}\n"
    "    const saveFollow=closest?closest('[data-save-follow-journey]'):null;\n"
    "    if(saveFollow&&board.contains(saveFollow)){event.preventDefault();event.stopPropagation();saveAndFollowJourneyByKey(saveFollow.getAttribute('data-save-follow-journey'));return;}\n"
    "    const save=closest?closest('[data-save-scheduled-journey]'):null;",
    "unified scheduled journey click handler",
)

regex_once(
    "kerbside-train-timetable.js",
    r"function journeyWatchMarkup\(service,key\)\{.*?\n\}\nfunction toggleJourneyWatchByKey",
    """function journeyWatchMarkup(service,key){
  const active=watchMatches(service),status=journeyWatchStatus(service),cls=`train-watch-card${active?' is-active':''}${active&&status.warn?' is-warn':''}`,r=route(),plan=window.__KERBSIDE_JOURNEY_PLANNER__,savedRecord=plan&&typeof plan.planBoardServiceSaved==='function'?plan.planBoardServiceSaved(service,{date:r.date,from:r.from,to:r.to}):null,saved=!!savedRecord,today=!!(dateApi()&&typeof dateApi().isToday==='function'&&dateApi().isToday());
  const label=active?status.label:saved?'Journey saved':'Keep this journey together';
  const note=active?(saved?`${status.note} Saved Journeys and Active Journey keep refreshing this service while Kerbside is open.`:`${status.note} This existing live watch is not saved yet; save it now to keep it in Saved journeys.`):saved?(today?'Saved. Live refresh is available for this journey today.':'Saved. Kerbside keeps its timetable refreshed here; live refresh turns on automatically on the travel day.'):(today?'Save once to keep live status, connection margin and recovery together; same-day saves begin live following.':'Save this journey so Kerbside can keep its timetable and Forecast v4 up to date.');
  const buttonLabel=active?(saved?'Saved · Following live':'Save & keep following'):saved?(today?'Follow saved journey':'Saved'):(today?'Save & follow':'Save journey'),disabled=(active&&saved)||(!today&&saved);
  return `<div class="${cls}"><div><span>Saved journey</span><strong>${esc(label)}</strong><small>${esc(note)}</small></div><div class="train-watch-actions"><button type="button" class="train-watch-action" data-save-follow-journey="${esc(key)}" aria-pressed="${active?'true':'false'}"${disabled?' disabled':''}>${esc(buttonLabel)}</button></div></div>`;
}
function toggleJourneyWatchByKey""",
    "unified scheduled journey card markup",
    flags=re.S,
)

replace_once(
    "kerbside-train-timetable.js",
    "function saveJourneyByKey(key){const index=state.services.findIndex((service,i)=>serviceKey(service,i)===String(key||''));if(index<0)return false;const plan=window.__KERBSIDE_JOURNEY_PLANNER__,r=route();if(!plan||typeof plan.planSaveBoardService!=='function')return false;const saved=plan.planSaveBoardService(state.services[index],{date:r.date,from:r.from,to:r.to});if(!saved)return false;renderRows(state.services,{mode:state.mode,manifest:state.manifest});return true;}\n",
    "function saveJourneyByKey(key){const index=state.services.findIndex((service,i)=>serviceKey(service,i)===String(key||''));if(index<0)return false;const plan=window.__KERBSIDE_JOURNEY_PLANNER__,r=route();if(!plan||typeof plan.planSaveBoardService!=='function')return false;const saved=plan.planSaveBoardService(state.services[index],{date:r.date,from:r.from,to:r.to});if(!saved)return false;renderRows(state.services,{mode:state.mode,manifest:state.manifest});return true;}\n"
    "function saveAndFollowJourneyByKey(key){\n"
    "  const index=state.services.findIndex((service,i)=>serviceKey(service,i)===String(key||''));if(index<0)return false;const service=state.services[index],plan=window.__KERBSIDE_JOURNEY_PLANNER__,r=route();if(!plan||typeof plan.planSaveBoardService!=='function')return false;\n"
    "  const saved=plan.planSaveBoardService(service,{date:r.date,from:r.from,to:r.to});if(!saved)return false;const today=!!(dateApi()&&typeof dateApi().isToday==='function'&&dateApi().isToday());\n"
    "  if(today&&!watchMatches(service))persistJourneyWatch(journeyWatchPayload(service));renderRows(state.services,{mode:state.mode,manifest:state.manifest});\n"
    "  const savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__;if(today&&savedApi&&typeof savedApi.followSavedJourney==='function')Promise.resolve(savedApi.followSavedJourney(saved.id)).catch(()=>false).finally(()=>renderRows(state.services,{mode:state.mode,manifest:state.manifest}));\n"
    "  return true;\n"
    "}\n",
    "save-and-follow implementation",
)

replace_once(
    "kerbside-train-timetable.js",
    "toggleJourneyWatchByKey,saveJourneyByKey,watchMatches",
    "toggleJourneyWatchByKey,saveJourneyByKey,saveAndFollowJourneyByKey,watchMatches",
    "save-and-follow public API",
)

replace_once(
    "kerbside-train-forecast-v4.js",
    "<details class=\"train-forecast-method\"><summary>How this is worked out</summary><p>${esc(method)}</p></details>${calibrationMarkup}${probabilityMarkup}${historyMarkup}",
    "<details class=\"train-forecast-method\"><summary>How this is worked out</summary><p>${esc(method)}</p>${calibrationMarkup}</details>${probabilityMarkup}${historyMarkup}",
    "measured baseline inside method disclosure",
)

replace_once(
    "kerbside-trains.css",
    ".train-scheduled-service .train-time small{\n  font-family:'Martian Mono',ui-monospace,monospace;\n  font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;\n}\n",
    ".train-scheduled-service .train-time small{\n  font-family:'Martian Mono',ui-monospace,monospace;\n  font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;\n}\n.train-scheduled-service .train-time .train-status{font-size:7.5px;line-height:1.2}\n",
    "smaller scheduled status label",
)

replace_once(
    "kerbside-journey-planner-core.js",
    ".plan-when-card .plan-field input,.plan-options-card .plan-field select{padding:12px;border-radius:12px;background:var(--ink-2)}\n.plan-when-card .plan-time-grid,.plan-options-card .plan-constraint-grid{gap:9px}",
    ".plan-when-card .plan-field input{box-sizing:border-box;width:100%;max-width:100%;min-width:0;min-height:42px;padding:9px 10px;border-radius:12px;background:var(--ink-2);font-size:14px;line-height:1.2}\n.plan-when-card input[type=\"date\"],.plan-when-card input[type=\"time\"]{max-width:100%}\n.plan-when-card .plan-time-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:9px}.plan-options-card .plan-constraint-grid{gap:9px}",
    "planner date/time sizing",
)
replace_once(
    "kerbside-journey-planner-core.js",
    "@media(max-width:430px){.plan-time-grid{grid-template-columns:1fr 1fr}.plan-constraint-grid{grid-template-columns:1fr}.plan-journey-result{grid-template-columns:82px minmax(0,1fr)}}",
    "@media(max-width:430px){.plan-time-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.plan-constraint-grid{grid-template-columns:1fr}.plan-journey-result{grid-template-columns:82px minmax(0,1fr)}}",
    "planner narrow-screen time grid",
)

regex_once(
    "kerbside-journey-planner-core.js",
    r"function cardMarkup\(saved\)\{.*?\nfunction renderSavedView",
    """function cardMarkup(saved){const meta=ensureMeta(saved),resolved=meta.lastResolved||baselineFromSaved(saved,meta.source),live=state.live.get(saved.id),changes=Array.isArray(meta.changes)?meta.changes:[],busy=state.refreshing.has(saved.id),starting=state.starting.has(saved.id),sameActive=activeMatchesSaved(saved),startable=sameActive||canStartActiveSavedJourney(saved,meta,live),status=meta.status||'planned',times=`${resolved.departure||saved.scheduledDeparture||'—'} → ${resolved.arrival||saved.scheduledArrival||'—'}`,source=sourceLabel(resolved.source||meta.source),changeMarkup=changes.length?`<ul class="saved-v2-changes">${changes.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class="saved-v2-nochange">No timetable changes detected since this journey was saved.</p>',liveMarkup=liveText(live)?`<div class="saved-v2-live">${esc(liveText(live))}</div>`:'',eventMarkup=savedEventMarkup(saved),timelineMarkup=savedTimelineMarkup(saved,resolved),actionMessage=state.actionMessages.get(saved.id)||'',error=meta.lastError||actionMessage?`<div class="saved-v2-error">${esc(actionMessage||meta.lastError)}</div>`:'',today=todayLondon(),liveRefreshOn=saved.date===today&&!['cancelled','expired','unavailable'].includes(status),liveRefreshLabel=liveRefreshOn?'Live refresh: On':saved.date>today?'Live refresh: Off until travel day':'Live refresh: Off',liveAction=startable?(sameActive?`<button type="button" class="saved-v2-active" data-saved-v2-active="${esc(saved.id)}"${busy||starting?' disabled':''}>Open active journey</button>`:`<button type="button" class="saved-v2-follow" data-saved-v2-follow="${esc(saved.id)}"${busy||starting?' disabled':''}>${starting?'Starting…':'Follow live'}</button>`):'';return `<article class="saved-v2-card" data-saved-v2-id="${esc(saved.id)}"><header><div><span class="saved-v2-date">${esc(dateLabel(saved.date))}</span><h3>${esc(saved.from.name)} → ${esc(saved.to.name)}</h3></div>${statusMarkup(status)}</header><div class="saved-v2-times"><strong>${esc(times)}</strong><span>${esc(source)}</span></div>${liveMarkup}${eventMarkup}${timelineMarkup}<div class="saved-v2-intent"><span>Saved plan</span><strong>${esc(intentLabel(saved))}</strong></div><div class="saved-v2-changes-wrap"><span>Since you saved it</span>${changeMarkup}</div><div class="saved-v2-refresh-state${liveRefreshOn?' is-on':''}">${esc(liveRefreshLabel)}</div>${error}<footer><span>${esc(relativeCheck(meta.lastChecked))}${busy?' · Refreshing…':''}</span><div>${liveAction}<button type="button" data-saved-v2-open="${esc(saved.id)}">Open in planner</button><button type="button" data-saved-v2-refresh="${esc(saved.id)}"${busy?' disabled':''}>Refresh now</button><button type="button" class="saved-v2-remove" data-saved-v2-remove="${esc(saved.id)}">Remove</button></div></footer></article>`;}
function renderSavedView""",
    "saved journey live refresh state and single live action",
    flags=re.S,
)

replace_once(
    "kerbside-journey-planner-core.js",
    ".saved-v2-times strong{font-family:'Martian Mono',monospace;font-size:13px}.saved-v2-times span{color:var(--text-dim);font-size:10px}.saved-v2-live{padding:8px 9px;border:1px solid rgb(var(--led-rgb) / .24);border-radius:8px;background:rgb(var(--led-rgb) / .06);font-size:10px;font-weight:800}.saved-v2-events{",
    ".saved-v2-times strong{font-family:'Martian Mono',monospace;font-size:13px}.saved-v2-times span{color:var(--text-dim);font-size:10px}.saved-v2-live{padding:8px 9px;border:1px solid rgb(var(--led-rgb) / .24);border-radius:8px;background:rgb(var(--led-rgb) / .06);font-size:10px;font-weight:800}.saved-v2-refresh-state{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:5px 8px;border:1px solid var(--rule);border-radius:999px;background:var(--ink);color:var(--text-dim);font-size:9px;font-weight:800}.saved-v2-refresh-state.is-on{border-color:rgb(var(--live-rgb) / .34);background:rgb(var(--live-rgb) / .06);color:var(--live)}.saved-v2-events{",
    "saved journey live refresh badge styles",
)

print(f"Prepared Kerbside {NEW} journey UX source patch.")
