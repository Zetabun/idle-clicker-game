#!/usr/bin/env python3
from pathlib import Path
import subprocess

TARGET_VERSION = "0.9.42"


def replace_once(path, old, new, label):
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one {label}, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def append_once(path, marker, block):
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    if marker in text:
        raise SystemExit(f"{path}: readability marker already present")
    path.write_text(text.rstrip() + "\n\n" + block.strip() + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# Saved journey retention and event context.
# Saved journeys are user-owned state: nothing should silently disappear just
# because a fixed list limit was reached or the scheduled departure has passed.
# ---------------------------------------------------------------------------
core_path = Path("kerbside-journey-planner-core.js")
replace_once(
    core_path,
    "const PLAN_SAVED_MAX=12;\n",
    "",
    "legacy saved-journey hard cap",
)
replace_once(
    core_path,
    "function readSavedJourneys(){\n  try{const raw=JSON.parse(localStorage.getItem(PLAN_SAVED_KEY)||'[]'),seen=new Set(),rows=[];for(const value of Array.isArray(raw)?raw:[]){const item=normaliseSavedJourney(value);if(!item||seen.has(item.id))continue;seen.add(item.id);rows.push(item);if(rows.length>=PLAN_SAVED_MAX)break;}return rows;}catch(error){return[];}\n}\nfunction writeSavedJourneys(rows){const next=[],seen=new Set();for(const value of Array.isArray(rows)?rows:[]){const item=normaliseSavedJourney(value);if(!item||seen.has(item.id))continue;seen.add(item.id);next.push(item);if(next.length>=PLAN_SAVED_MAX)break;}planState.saved=next;try{localStorage.setItem(PLAN_SAVED_KEY,JSON.stringify(next));}catch(error){}return next;}",
    "function readSavedJourneys(){\n  try{const raw=JSON.parse(localStorage.getItem(PLAN_SAVED_KEY)||'[]'),seen=new Set(),rows=[];for(const value of Array.isArray(raw)?raw:[]){const item=normaliseSavedJourney(value);if(!item||seen.has(item.id))continue;seen.add(item.id);rows.push(item);}return rows;}catch(error){return[];}\n}\nfunction writeSavedJourneys(rows){const next=[],seen=new Set();for(const value of Array.isArray(rows)?rows:[]){const item=normaliseSavedJourney(value);if(!item||seen.has(item.id))continue;seen.add(item.id);next.push(item);}planState.saved=next;try{localStorage.setItem(PLAN_SAVED_KEY,JSON.stringify(next));}catch(error){}return next;}",
    "saved-journey read/write retention logic",
)

replace_once(
    core_path,
    "function enrichPlanCandidates(candidates,from,to,date,events=null){\n  const restore=planEventSnapshot(events,date);\n  try{return (Array.isArray(candidates)?candidates:[]).map(candidate=>({...candidate,forecast:planForecastCandidate(candidate,from,to,date)}));}\n  finally{restore();}\n}",
    "function enrichPlanCandidates(candidates,from,to,date,events=null){\n  const restore=planEventSnapshot(events,date);\n  try{return (Array.isArray(candidates)?candidates:[]).map(candidate=>({...candidate,forecast:planForecastCandidate(candidate,from,to,date),planEvents:Array.isArray(events)?planEventDisplayRows(events,[candidate],from,to,date).slice(0,2):[]}));}\n  finally{restore();}\n}",
    "planner event enrichment",
)

replace_once(
    core_path,
    "  const reasons=(forecast.reasons||[]).slice(0,3).map(reason=>`<li>${esc(reason)}</li>`).join('');\n  const focusText=focus?(focus.resolution==='closest'?'Closest current match · review before relying on it':'Saved journey · refreshed from current data'):'';",
    "  const reasons=(forecast.reasons||[]).slice(0,3).map(reason=>`<li>${esc(reason)}</li>`).join('');\n  const eventRows=Array.isArray(row.planEvents)?row.planEvents:[],eventMarkup=eventRows.length?`<div class=\"plan-result-events\"><span>Event demand</span><div>${eventRows.map(event=>{const at=Number.isFinite(Number(event.start))?planClock(Number(event.start)):'Time TBC',football=String(event.type||'').toLowerCase()==='football'?'Football · ':'';return `<div><b>${esc(`${football}${event.title||'Event'}`)}</b><small>${esc(`${at}${event.place?` · ${event.place}`:''}`)}</small></div>`;}).join('')}</div></div>`:'';\n  const focusText=focus?(focus.resolution==='closest'?'Closest current match · review before relying on it':'Saved journey · refreshed from current data'):'';",
    "per-card planner event markup",
)
replace_once(
    core_path,
    "    ${reasons?`<ul class=\"plan-result-reasons\">${reasons}</ul>`:''}\n    <div class=\"plan-result-actions\">",
    "    ${reasons?`<ul class=\"plan-result-reasons\">${reasons}</ul>`:''}\n    ${eventMarkup}\n    <div class=\"plan-result-actions\">",
    "planner card event insertion",
)
replace_once(
    core_path,
    ".plan-result-tradeoff{grid-column:1/-1;margin:0;color:var(--text-dim);font-size:11px;line-height:1.45}.plan-result-reasons{grid-column:1/-1;display:grid;gap:3px;margin:0;padding-left:17px;color:var(--text-mute);font-size:10px;line-height:1.4}.plan-result-reasons li::marker{color:var(--led)}\n.plan-result-details",
    ".plan-result-tradeoff{grid-column:1/-1;margin:0;color:var(--text-dim);font-size:11px;line-height:1.45}.plan-result-reasons{grid-column:1/-1;display:grid;gap:3px;margin:0;padding-left:17px;color:var(--text-mute);font-size:10px;line-height:1.4}.plan-result-reasons li::marker{color:var(--led)}\n.plan-result-events{grid-column:1/-1;display:grid;gap:6px;padding:9px 10px;border:1px solid rgb(var(--led-rgb) / .22);border-radius:9px;background:rgb(var(--led-rgb) / .04)}.plan-result-events>span{color:var(--led);font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.plan-result-events>div{display:flex;gap:6px;flex-wrap:wrap}.plan-result-events>div>div{display:grid;gap:2px;min-width:180px;padding:7px 8px;border:1px solid var(--rule);border-radius:8px;background:var(--ink)}.plan-result-events b{font-size:10.5px}.plan-result-events small{color:var(--text-dim);font-size:9.5px;line-height:1.35}\n.plan-result-details",
    "planner event card styles",
)

replace_once(
    core_path,
    "function savedEventMarkup(saved,sameActive){const rows=sameActive&&Array.isArray(state.events.get(saved.id))?state.events.get(saved.id):[];if(!rows.length)return'';",
    "function savedEventMarkup(saved){const rows=Array.isArray(state.events.get(saved.id))?state.events.get(saved.id):[];if(!rows.length)return'';",
    "saved event visibility gate",
)
replace_once(
    core_path,
    "  const row=service||window.__KERBSIDE_ACTIVE_JOURNEY__&&window.__KERBSIDE_ACTIVE_JOURNEY__.activeService&&window.__KERBSIDE_ACTIVE_JOURNEY__.activeService(),interchanges=row&&row.journeyType==='connection'?[String(row.interchange&&row.interchange.name||row.interchange&&row.interchange.crs||'')].filter(Boolean):[],journey={origin:saved.from.name,originCrs:saved.from.crs,destination:saved.to.name,destinationCrs:saved.to.crs,interchanges,date:saved.date};",
    "  const activeRow=window.__KERBSIDE_ACTIVE_JOURNEY__&&window.__KERBSIDE_ACTIVE_JOURNEY__.activeService&&window.__KERBSIDE_ACTIVE_JOURNEY__.activeService(),row=service||activeMatchesSaved(saved)&&activeRow||{std:saved.scheduledDeparture,departure:saved.scheduledDeparture,arrival:saved.scheduledArrival,departureMinute:timeMinutes(saved.scheduledDeparture),arrivalMinute:timeMinutes(saved.scheduledArrival),journeyType:saved.journeyType,interchange:saved.change?{crs:saved.change,name:saved.change}:null},interchanges=row&&row.journeyType==='connection'?[String(row.interchange&&row.interchange.name||row.interchange&&row.interchange.crs||'')].filter(Boolean):[],journey={origin:saved.from.name,originCrs:saved.from.crs,destination:saved.to.name,destinationCrs:saved.to.crs,interchanges,date:saved.date};",
    "saved event pseudo-service",
)
replace_once(
    core_path,
    "eventMarkup=savedEventMarkup(saved,sameActive)",
    "eventMarkup=savedEventMarkup(saved)",
    "saved event card invocation",
)
replace_once(
    core_path,
    "function renderSavedView(){const list=$('savedJourneyList'),count=state.saved.length,tabCount=$('savedJourneyTabCount'),headCount=$('savedJourneyCount'),sidebarCount=$('savedJourneySidebarCount');if(tabCount)tabCount.textContent=count?String(count):'';if(headCount)headCount.textContent=String(count);if(sidebarCount)sidebarCount.textContent=String(count);if(!list)return;if(!count){list.innerHTML='<div class=\"saved-v2-empty\"><strong>No saved journeys yet</strong><span>Save an option from Plan my journey. Kerbside will keep it up to date here automatically.</span></div>';return;}list.innerHTML=state.saved.slice().sort(savedSort).map(cardMarkup).join('');const auto=$('savedJourneyAutoMeta');if(auto)auto.textContent='Upcoming journeys refresh automatically when Kerbside opens, when timetable coverage changes, and while this tab is in use.';}",
    "function renderSavedView(){const list=$('savedJourneyList'),count=state.saved.length,tabCount=$('savedJourneyTabCount'),headCount=$('savedJourneyCount'),sidebarCount=$('savedJourneySidebarCount');if(tabCount)tabCount.textContent=count?String(count):'';if(headCount)headCount.textContent=String(count);if(sidebarCount)sidebarCount.textContent=String(count);if(!list)return;if(!count){list.innerHTML='<div class=\"saved-v2-empty\"><strong>No saved journeys yet</strong><span>Save an option from Plan my journey. Kerbside will keep it up to date here automatically.</span></div>';return;}list.innerHTML=state.saved.slice().sort(savedSort).map(cardMarkup).join('');const auto=$('savedJourneyAutoMeta');if(auto)auto.textContent='Saved journeys stay here until you archive or delete them. Today’s journeys continue tracking after departure while live movement is available.';}",
    "saved retention help text",
)
replace_once(
    core_path,
    "function enterSavedView(){const api=planner(),sidebar=document.querySelector('.train-sidebar'),content=document.querySelector('.train-content'),tabs=$('trainViewTabs'),side=$('savedJourneySidebar'),surface=$('savedJourneySurface');if(!api||!sidebar||!content||!tabs||!side||!surface)return false;if(typeof api.setPlanView==='function')api.setPlanView(false);state.hidden.clear();snapshotHidden(sidebar,new Set([tabs,side]));snapshotHidden(content,new Set([surface]));side.hidden=false;surface.hidden=false;state.active=true;tabs.querySelectorAll('[data-train-view]').forEach(button=>{const selected=button.dataset.trainView==='saved';button.setAttribute('aria-selected',String(selected));button.setAttribute('aria-pressed',String(selected));});syncSaved();refreshAll({force:true,reason:'saved-tab'});const followed=state.saved.find(activeMatchesSaved);if(followed){refreshFollowEvents(followed).catch(()=>{});setTimeout(()=>window.__KERBSIDE_TRAIN_MOVEMENT__?.refresh?.({force:true}),0);}return true;}",
    "function enterSavedView(){const api=planner(),sidebar=document.querySelector('.train-sidebar'),content=document.querySelector('.train-content'),tabs=$('trainViewTabs'),side=$('savedJourneySidebar'),surface=$('savedJourneySurface');if(!api||!sidebar||!content||!tabs||!side||!surface)return false;if(typeof api.setPlanView==='function')api.setPlanView(false);state.hidden.clear();snapshotHidden(sidebar,new Set([tabs,side]));snapshotHidden(content,new Set([surface]));side.hidden=false;surface.hidden=false;state.active=true;tabs.querySelectorAll('[data-train-view]').forEach(button=>{const selected=button.dataset.trainView==='saved';button.setAttribute('aria-selected',String(selected));button.setAttribute('aria-pressed',String(selected));});syncSaved();refreshAll({force:true,reason:'saved-tab'});const today=todayLondon(),eventTargets=state.saved.filter(saved=>saved.date>=today).slice(0,24);Promise.allSettled(eventTargets.map(saved=>refreshFollowEvents(saved))).then(()=>{if(state.active)renderSavedView();});const followed=state.saved.find(activeMatchesSaved);if(followed)setTimeout(()=>window.__KERBSIDE_TRAIN_MOVEMENT__?.refresh?.({force:true}),0);else setTimeout(()=>window.__KERBSIDE_TRAIN_MOVEMENT__?.refresh?.({force:true}),0);return true;}",
    "saved view event/movement refresh",
)

# Remove the separate 12-item truncation in the Saved journeys polish layer.
polish_path = Path("kerbside-saved-journeys-polish.js")
replace_once(polish_path, "const MAX_ACTIVE=12;\n", "", "saved-polish hard cap")
replace_once(
    polish_path,
    "  const result=dedupeJourneys(normalised),rows=result.rows.slice(0,MAX_ACTIVE),changed=result.removed.length>0||rows.length!==parsed.length||memorySafeJson(rows)!==memorySafeJson(parsed);",
    "  const result=dedupeJourneys(normalised),rows=result.rows,changed=result.removed.length>0||rows.length!==parsed.length||memorySafeJson(rows)!==memorySafeJson(parsed);",
    "saved-polish repair truncation",
)
replace_once(
    polish_path,
    "  const api=planner();try{global.localStorage.setItem(SAVED_KEY,JSON.stringify((Array.isArray(rows)?rows:[]).slice(0,MAX_ACTIVE)));if(api&&api.planState&&typeof api.readSavedJourneys==='function')api.planState.saved=api.readSavedJourneys();return true;}catch(error){return false;}",
    "  const api=planner();try{global.localStorage.setItem(SAVED_KEY,JSON.stringify(Array.isArray(rows)?rows:[]));if(api&&api.planState&&typeof api.readSavedJourneys==='function')api.planState.saved=api.readSavedJourneys();return true;}catch(error){return false;}",
    "saved-polish write truncation",
)
replace_once(
    polish_path,
    "  const source=archived?runtime.store?.archived?.[id]?.journey:activeRows().find(item=>item.id===id);if(!source)return false;if(activeRows().length>=MAX_ACTIVE){setNotice('You already have 12 active saved journeys. Archive or delete one before repeating another.','warn');return false;}",
    "  const source=archived?runtime.store?.archived?.[id]?.journey:activeRows().find(item=>item.id===id);if(!source)return false;",
    "repeat saved cap",
)
replace_once(
    polish_path,
    "  const entry=runtime.store?.archived?.[id];if(!entry||!entry.journey)return false;const rows=activeRows();if(rows.length>=MAX_ACTIVE){setNotice('You already have 12 active saved journeys. Archive or delete one before restoring this trip.','warn');return false;}const duplicate=duplicateLocation(entry.journey,{excludeId:id});",
    "  const entry=runtime.store?.archived?.[id];if(!entry||!entry.journey)return false;const rows=activeRows();const duplicate=duplicateLocation(entry.journey,{excludeId:id});",
    "restore saved cap",
)

# ---------------------------------------------------------------------------
# Football event cache: cache by requested season and never let a cached miss
# for one date mask a newly published fixture on another date in that season.
# ---------------------------------------------------------------------------
events_path = Path("kerbside-train-events.js")
replace_once(
    events_path,
    "const FIXTURE_CACHE_MS=7*24*60*60*1000;\n/* v2 deliberately invalidates the old cache: v1 could contain the previous\n   season after the generated JSON mirror returned 404 for a new season. */\nconst FIXTURE_STORE='kerbside.rail.fixtures.v2';",
    "const FIXTURE_CACHE_MS=24*60*60*1000;\n/* v3 is season-aware. v2 could keep an empty/new-season miss for a week, so\n   a fixture published after that first lookup never reached Forecast v4. */\nconst FIXTURE_STORE='kerbside.rail.fixtures.v3';",
    "football fixture cache version",
)
replace_once(
    events_path,
    "let fixtureIndex=null;\nlet fixturePromise=null;",
    "let fixtureIndex=null;\nlet fixtureSeasonKey='';\nlet fixturePromise=null;\nlet fixturePromiseSeason='';\nconst fixtureMissChecked=new Set();",
    "football fixture cache state",
)
replace_once(
    events_path,
    "function readFixtureStore(){\n  try{\n    const raw=JSON.parse(localStorage.getItem(FIXTURE_STORE)||'null');\n    if(raw&&Date.now()-raw.ts<FIXTURE_CACHE_MS&&raw.byDate)return raw.byDate;\n  }catch(e){}\n  return null;\n}\nfunction writeFixtureStore(byDate){\n  try{localStorage.setItem(FIXTURE_STORE,JSON.stringify({ts:Date.now(),byDate}));}catch(e){}\n}",
    "function fixtureSeason(dateStamp){return seasonsFor(dateStamp)[0]||'';}\nfunction readFixtureStore(dateStamp){\n  try{\n    const raw=JSON.parse(localStorage.getItem(FIXTURE_STORE)||'null'),season=fixtureSeason(dateStamp);\n    if(raw&&raw.season===season&&Date.now()-Number(raw.ts||0)<FIXTURE_CACHE_MS&&raw.byDate)return raw;\n  }catch(e){}\n  return null;\n}\nfunction writeFixtureStore(byDate,season){\n  try{localStorage.setItem(FIXTURE_STORE,JSON.stringify({ts:Date.now(),season,byDate}));}catch(e){}\n}",
    "season-aware football fixture storage",
)
replace_once(
    events_path,
    "async function loadFixtures(dateStamp){\n  if(fixtureIndex)return fixtureIndex;\n  if(fixturePromise)return fixturePromise;\n  const stored=readFixtureStore();\n  if(stored){fixtureIndex=stored;return fixtureIndex;}\n  fixturePromise=(async()=>{\n    const byDate={};",
    "async function loadFixtures(dateStamp){\n  const seasonKey=fixtureSeason(dateStamp);\n  if(fixtureIndex&&fixtureSeasonKey===seasonKey){\n    if(fixtureIndex[dateStamp]||fixtureMissChecked.has(dateStamp))return fixtureIndex;\n    fixtureMissChecked.add(dateStamp);\n  }\n  if(fixturePromise){if(fixturePromiseSeason===seasonKey)return fixturePromise;await fixturePromise;}\n  const stored=readFixtureStore(dateStamp);\n  if(stored){fixtureIndex=stored.byDate;fixtureSeasonKey=stored.season;if(fixtureIndex[dateStamp]||fixtureMissChecked.has(dateStamp))return fixtureIndex;fixtureMissChecked.add(dateStamp);}\n  fixturePromiseSeason=seasonKey;\n  fixturePromise=(async()=>{\n    const byDate={};",
    "season-aware fixture loader entry",
)
replace_once(
    events_path,
    "    fixtureIndex=byDate;\n    writeFixtureStore(byDate);\n    return byDate;\n  })().finally(()=>{fixturePromise=null;});",
    "    fixtureIndex=byDate;fixtureSeasonKey=seasonKey;\n    writeFixtureStore(byDate,seasonKey);\n    return byDate;\n  })().finally(()=>{fixturePromise=null;fixturePromiseSeason='';});",
    "season-aware fixture loader completion",
)

# ---------------------------------------------------------------------------
# Live tracking and whole-journey timelines.
# ---------------------------------------------------------------------------
movement_path = Path("kerbside-train-movement.js")
replace_once(
    movement_path,
    "  if(savedApi?.state?.active)return finishScope('saved',targets);",
    "  if(savedApi?.state?.active){\n    for(const saved of Array.isArray(savedApi.state.saved)?savedApi.state.saved:[]){\n      if(text(saved&&saved.date)!==today)continue;\n      const services=saved&&saved.journeyType==='connection'?[saved.first,saved.onward]:[saved&&saved.service];\n      services.filter(Boolean).forEach(service=>addTarget(targets,service,today,'saved'));\n    }\n    return finishScope('saved',targets);\n  }",
    "saved journey movement scope",
)
replace_once(
    movement_path,
    "    ensureCard(card,following?snapshot:null,{compact:true});",
    "    ensureCard(card,snapshot,{compact:true});",
    "saved journey movement card visibility",
)
replace_once(
    movement_path,
    "  add(leg&&leg.subsequentCallingPoints);add(leg&&leg.callingPoints);",
    "  add(leg&&leg.previousCallingPoints);add(leg&&leg.callingPoints);add(leg&&leg.subsequentCallingPoints);",
    "full timeline source ordering",
)
replace_once(
    movement_path,
    "  const seen=new Set();return points.filter(point=>{const key=normalisePlace(point.name);if(!key||seen.has(key))return false;seen.add(key);return true;}).slice(0,18);",
    "  const seen=new Set();return points.filter(point=>{const key=normalisePlace(point.name);if(!key||seen.has(key))return false;seen.add(key);return true;});",
    "planner timeline stop cap",
)

# The timetable renderer already receives Darwin previous + subsequent calls;
# do not crop them to the nearest 12 each side when a journey is being tracked.
timetable_path = Path("kerbside-train-timetable.js")
replace_once(
    timetable_path,
    "  const rows=[...passed.slice(-12).map(point=>renderPoint(point,'passed')),...ahead.slice(0,12).map(point=>renderPoint(point,'ahead'))].join('');",
    "  const rows=[...passed.map(point=>renderPoint(point,'passed')),...ahead.map(point=>renderPoint(point,'ahead'))].join('');",
    "calling-point timeline crop",
)

# ---------------------------------------------------------------------------
# Readability / UX pass. These overrides deliberately establish a practical
# floor for secondary text without scaling controls or changing layout grids.
# The planner/saved/movement modules inject their styles later, hence !important
# on the small-text selectors owned by those modules.
# ---------------------------------------------------------------------------
readability_css = r'''
/* Kerbside 0.9.42 readability pass: preserve hierarchy, remove 8–10px body text. */
body[data-transport="train"] .train-kicker{font-size:11px}
body[data-transport="train"] .train-station-meta,
body[data-transport="train"] .train-alert,
body[data-transport="train"] .train-detail-loading,
body[data-transport="train"] .train-detail-note{font-size:12.5px}
body[data-transport="train"] .train-time small,
body[data-transport="train"] .train-route small,
body[data-transport="train"] .train-crowding small,
body[data-transport="train"] .train-formation small{font-size:11.5px;line-height:1.4}
body[data-transport="train"] .train-route strong{font-size:15px}
body[data-transport="train"] .train-crowding b,
body[data-transport="train"] .train-formation b{font-size:12.5px}
body[data-transport="train"] .train-detail-grid span{font-size:10.5px}
body[data-transport="train"] .train-detail-grid b{font-size:12.5px}
body[data-transport="train"] .train-crowding-explain{font-size:11.5px;line-height:1.55}
body[data-transport="train"] .train-forecast-meta{font-size:10.5px}
body[data-transport="train"] .train-forecast-reasons>span{font-size:10.5px}
body[data-transport="train"] .train-forecast-reasons li{font-size:12px;line-height:1.5}
body[data-transport="train"] .train-forecast-method,
body[data-transport="train"] .train-forecast-calibration,
body[data-transport="train"] .train-forecast-history{font-size:11px;line-height:1.5}
body[data-transport="train"] .train-call b{font-size:12.5px}
body[data-transport="train"] .train-call small{font-size:11.5px;line-height:1.4}
body[data-transport="train"] .train-connection-time small,
body[data-transport="train"] .train-connection-route small,
body[data-transport="train"] .train-connection-crowd small{font-size:11px}
body[data-transport="train"] .train-connection-route b{font-size:12.5px}

body[data-transport="train"] .plan-results-head p{font-size:12px!important}
body[data-transport="train"] .plan-event-context>span,
body[data-transport="train"] .plan-result-events>span{font-size:10.5px!important}
body[data-transport="train"] .plan-event-chip b,
body[data-transport="train"] .plan-result-events b{font-size:12px!important}
body[data-transport="train"] .plan-event-chip small,
body[data-transport="train"] .plan-result-events small{font-size:11px!important}
body[data-transport="train"] .plan-result-rank span{font-size:10.5px!important}
body[data-transport="train"] .plan-result-rank b{font-size:14px!important}
body[data-transport="train"] .plan-result-date{font-size:10.5px!important}
body[data-transport="train"] .plan-result-route strong{font-size:13.5px!important}
body[data-transport="train"] .plan-result-route span,
body[data-transport="train"] .plan-result-crowd span{font-size:11.5px!important}
body[data-transport="train"] .plan-result-crowd strong{font-size:12.5px!important}
body[data-transport="train"] .plan-result-tradeoff{font-size:12px!important;line-height:1.5!important}
body[data-transport="train"] .plan-result-reasons{font-size:11.5px!important;line-height:1.5!important}
body[data-transport="train"] .plan-result-details summary{font-size:11.5px!important}
body[data-transport="train"] .plan-detail-leg>span{font-size:10.5px!important}
body[data-transport="train"] .plan-detail-leg strong,
body[data-transport="train"] .plan-detail-change strong,
body[data-transport="train"] .plan-detail-recovery strong{font-size:12px!important}
body[data-transport="train"] .plan-detail-leg small,
body[data-transport="train"] .plan-detail-change span,
body[data-transport="train"] .plan-detail-recovery span,
body[data-transport="train"] .plan-detail-recovery small{font-size:11.5px!important;line-height:1.5!important}
body[data-transport="train"] .plan-save-action,
body[data-transport="train"] .plan-saved-actions button{font-size:11.5px!important}
body[data-transport="train"] .plan-saved-focus-note{font-size:11px!important}

body[data-transport="train"] .saved-v2-sidebar p{font-size:12px!important}
body[data-transport="train"] .saved-v2-summary span{font-size:11.5px!important}
body[data-transport="train"] .saved-v2-auto{font-size:11px!important;line-height:1.5!important}
body[data-transport="train"] .saved-v2-head p{font-size:12px!important}
body[data-transport="train"] .saved-v2-card h3{font-size:15px!important}
body[data-transport="train"] .saved-v2-date,
body[data-transport="train"] .saved-v2-status{font-size:10.5px!important}
body[data-transport="train"] .saved-v2-times strong{font-size:14px!important}
body[data-transport="train"] .saved-v2-times span{font-size:11.5px!important}
body[data-transport="train"] .saved-v2-live{font-size:11.5px!important;line-height:1.45!important}
body[data-transport="train"] .saved-v2-events>span,
body[data-transport="train"] .saved-v2-intent>span,
body[data-transport="train"] .saved-v2-changes-wrap>span{font-size:10.5px!important}
body[data-transport="train"] .saved-v2-event b,
body[data-transport="train"] .saved-v2-intent strong{font-size:12px!important}
body[data-transport="train"] .saved-v2-event small,
body[data-transport="train"] .saved-v2-changes,
body[data-transport="train"] .saved-v2-nochange,
body[data-transport="train"] .saved-v2-error{font-size:11.5px!important;line-height:1.5!important}
body[data-transport="train"] .saved-v2-card>footer>span{font-size:10.5px!important}
body[data-transport="train"] .saved-v2-card button{font-size:11.5px!important;min-height:36px!important}

body[data-transport="train"] .train-movement-inline,
body[data-transport="train"] .plan-movement-inline,
body[data-transport="train"] .saved-movement-inline{font-size:10.5px!important;line-height:1.4!important}
body[data-transport="train"] .train-movement-inline::before{font-size:9.5px!important}
body[data-transport="train"] .train-movement-card span{font-size:10px!important}
body[data-transport="train"] .train-movement-card strong{font-size:12.5px!important}
body[data-transport="train"] .train-movement-card p,
body[data-transport="train"] .train-movement-card small{font-size:11.5px!important;line-height:1.5!important}
body[data-transport="train"] .train-progress-badge{font-size:9.5px!important}
body[data-transport="train"] .train-progress-now{font-size:11px!important;line-height:1.45!important}
body[data-transport="train"] .train-progress-marker small{font-size:11.5px!important}

@media(max-width:430px){
  body[data-transport="train"] .saved-v2-card h3{font-size:14px!important}
  body[data-transport="train"] .saved-v2-times strong{font-size:13.5px!important}
}
'''
append_once("kerbside-trains.css", "Kerbside 0.9.42 readability pass", readability_css)

# ---------------------------------------------------------------------------
# Regression coverage.
# ---------------------------------------------------------------------------
planner_test = Path("kerbside-backend/tests/train-journey-planner-regression.mjs")
replace_once(
    planner_test,
    "  await page.route('https://raw.githubusercontent.com/openfootball/england/**',route=>\n    route.fulfill({status:200,contentType:'text/plain',body:'= Synthetic empty OpenFootball season\\n'})\n  );",
    "  await page.route('https://raw.githubusercontent.com/openfootball/england/**',route=>{\n    const pathname=new URL(route.request().url()).pathname;\n    const body=pathname.includes('/2026-27/2-championship.txt')?'Sat Aug 29\\n15:00 Bristol City FC v Portsmouth FC\\n':'= Synthetic empty OpenFootball season\\n';\n    return route.fulfill({status:200,contentType:'text/plain',body});\n  });",
    "synthetic Bristol fixture route",
)
fixture_anchor = "  assert.ok(eventForecast.reasons.some(reason=>/Birmingham Arena Concert/.test(reason)),`forecast should name the contributing event: ${JSON.stringify(eventForecast)}`);\n\n\n  // Plan My Journey"
fixture_replacement = """  assert.ok(eventForecast.reasons.some(reason=>/Birmingham Arena Concert/.test(reason)),`forecast should name the contributing event: ${JSON.stringify(eventForecast)}`);\n\n  const bristolFixture=await page.evaluate(async()=>{\n    const events=window.__KERBSIDE_EVENTS__,forecast=window.__KERBSIDE_FORECAST_V4__;\n    const rows=await events.footballEventsFor('2026-08-29');\n    const previous={events:events.state.events,date:events.state.date,status:events.state.status,sources:events.state.sources};\n    events.state.events=rows.map(row=>events.normalise(row)).filter(Boolean);events.state.date='2026-08-29';events.state.status='ready';events.state.sources=['openfootball (public domain)'];\n    const service={std:'12:12',arrival:'13:32',destinationArrival:'13:32',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}};\n    const result=forecast.forecast(service,0,[service],{station:{name:'Birmingham New Street',crs:'BHM'},referenceDate:new Date('2026-08-29T12:00:00'),eventJourney:{origin:'Birmingham New Street',originCrs:'BHM',destination:'Bristol Temple Meads',destinationCrs:'BRI',interchanges:[],date:'2026-08-29'},messages:[]});\n    Object.assign(events.state,previous);\n    return {rows:rows.map(row=>row.title),pressure:result.eventPressure,reasons:result.reasons};\n  });\n  assert.ok(bristolFixture.rows.some(title=>/Bristol City FC v Portsmouth FC/.test(title)),`29 Aug Bristol fixture should survive fixture caching: ${JSON.stringify(bristolFixture)}`);\n  assert.ok(bristolFixture.pressure>0,`Bristol fixture should contribute Forecast v4 event pressure to a 13:32 arrival: ${JSON.stringify(bristolFixture)}`);\n  assert.ok(bristolFixture.reasons.some(reason=>/Bristol City FC v Portsmouth FC/.test(reason)),`Forecast reason should name the Bristol fixture: ${JSON.stringify(bristolFixture)}`);\n\n\n  // Plan My Journey"""
replace_once(planner_test, fixture_anchor, fixture_replacement, "Bristol event regression")
replace_once(
    planner_test,
    "  assert.match(await page.locator('#planJourneyEvents').textContent(),/Football · Birmingham City v Bristol City/);\n  assert.match(planCards[0],/Quiet Rail/,'Plan My Journey ranks the quiet Forecast v4 option first');",
    "  assert.match(await page.locator('#planJourneyEvents').textContent(),/Football · Birmingham City v Bristol City/);\n  assert.match(await page.locator('#planJourneyResults .plan-result-events').first().textContent(),/Football · Birmingham City v Bristol City/,'relevant event context should be visible on the result card, not only in the header');\n  assert.match(planCards[0],/Quiet Rail/,'Plan My Journey ranks the quiet Forecast v4 option first');",
    "planner card event assertion",
)
replace_once(
    planner_test,
    "  await page.waitForFunction(()=>/Bristol Arena Concert/.test(document.querySelector('#planJourneyResults')?.textContent||''),undefined,{timeout:4000});\n  assert.match(await page.locator('#planJourneyMeta').textContent(),/Network Rail SCHEDULE/);",
    "  await page.waitForFunction(()=>/Bristol Arena Concert/.test(document.querySelector('#planJourneyResults')?.textContent||''),undefined,{timeout:4000});\n  const readability=await page.evaluate(()=>({reason:parseFloat(getComputedStyle(document.querySelector('.plan-result-reasons')).fontSize),detail:parseFloat(getComputedStyle(document.querySelector('.plan-result-details summary')).fontSize),route:parseFloat(getComputedStyle(document.querySelector('.plan-result-route span')).fontSize)}));\n  assert.ok(readability.reason>=11.5&&readability.detail>=11.5&&readability.route>=11.5,`planner secondary text should meet the 0.9.42 readability floor: ${JSON.stringify(readability)}`);\n  assert.match(await page.locator('#planJourneyMeta').textContent(),/Network Rail SCHEDULE/);",
    "planner readability regression",
)

movement_test = Path("kerbside-backend/tests/train-movement-browser-regression.mjs")
replace_once(
    movement_test,
    "    const scheduled={...service,uid:'C21373',trainId:'5F25',serviceID:'20260816C21373',from:{crs:'BHM',name:'Birmingham New Street'},to:{crs:'BRI',name:'Bristol Temple Meads'}};",
    "    const scheduled={...service,uid:'C21373',trainId:'5F25',serviceID:'20260816C21373',from:{crs:'BHM',name:'Birmingham New Street'},to:{crs:'BRI',name:'Bristol Temple Meads'},previousCallingPoints:[{callingPoint:[{locationName:'Wolverhampton',crs:'WVH',st:'19:55',at:'19:56',isCancelled:false}]}],subsequentCallingPoints:[{callingPoint:[{locationName:'University',crs:'UNI',st:'20:20',et:'20:22',isCancelled:false},{locationName:'Cheltenham Spa',crs:'CNM',st:'21:00',et:'21:02',isCancelled:false},{locationName:'Bristol Temple Meads',crs:'BRI',st:'21:33',et:'21:35',isCancelled:false}]}]};",
    "movement full-timeline fixture",
)
replace_once(
    movement_test,
    "  assert.match(result.planTimeline,/Between Birmingham New Street and University/i);\n  assert.equal(result.movementCards,0,'timeline should replace duplicate movement cards when progress can be shown');",
    "  assert.match(result.planTimeline,/Between Birmingham New Street and University/i);\n  assert.match(result.planTimeline,/Wolverhampton/i,'generated planner timeline should retain already-passed calling points');\n  assert.match(result.planTimeline,/Bristol Temple Meads/i,'generated planner timeline should retain the destination as well as passed stops');\n  assert.equal(result.movementCards,0,'timeline should replace duplicate movement cards when progress can be shown');",
    "movement whole-timeline assertions",
)

active_test = Path("kerbside-backend/tests/train-active-journey-regression.mjs")
retention_anchor = "  const savedSetup=await page.evaluate(async today=>{"
retention_replacement = """  const retainedCount=await page.evaluate(today=>{\n    const rows=Array.from({length:20},(_,index)=>({v:1,id:`retained-${index}`,savedAt:new Date().toISOString(),refreshedAt:'',date:today,from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'},journeyType:'direct',service:{serviceID:`RET-${index}`,uid:`RETUID-${index}`,trainId:'',std:'09:50'},first:{serviceID:'',uid:'',trainId:'',std:''},onward:{serviceID:'',uid:'',trainId:'',std:''},change:'',scheduledDeparture:'09:50',scheduledArrival:'10:30',searchStart:'09:00',searchEnd:'11:00',preference:'balanced',constraints:{maxChanges:1,connectionBuffer:0}}));\n    localStorage.setItem('kerbside.rail.plan.saved.v1',JSON.stringify(rows));\n    return window.__KERBSIDE_JOURNEY_PLANNER__.readSavedJourneys().length;\n  },setup.today);\n  assert.equal(retainedCount,20,'saved journeys must not silently disappear at the former 12-item limit');\n\n  const savedSetup=await page.evaluate(async today=>{"""
replace_once(active_test, retention_anchor, retention_replacement, "saved retention regression")

# Version bump is last so a failed code/test patch cannot leave a partial release.
version_path = Path("VERSION")
current = version_path.read_text(encoding="utf-8").strip()
if current != "0.9.41":
    raise SystemExit(f"Expected VERSION 0.9.41 before release, found {current}")
version_path.write_text(TARGET_VERSION + "\n", encoding="utf-8")
subprocess.run(["python3", ".github/scripts/sync-version.py"], check=True)
subprocess.run(["python3", ".github/scripts/sync-version.py", "--check"], check=True)

# Release invariants / second-pass static checks before the browser suite.
checks = {
    "kerbside-journey-planner-core.js": [
        "Saved journeys stay here until you archive or delete them",
        "class=\\\"plan-result-events\\\"",
        "Promise.allSettled(eventTargets.map(saved=>refreshFollowEvents(saved)))",
    ],
    "kerbside-train-events.js": ["kerbside.rail.fixtures.v3", "fixtureMissChecked", "raw.season===season"],
    "kerbside-train-movement.js": ["services.filter(Boolean).forEach(service=>addTarget(targets,service,today,'saved'))", "add(leg&&leg.previousCallingPoints)"],
    "kerbside-train-timetable.js": ["...passed.map(point=>renderPoint(point,'passed'))", "...ahead.map(point=>renderPoint(point,'ahead'))"],
    "kerbside-trains.css": ["Kerbside 0.9.42 readability pass", ".plan-result-reasons{font-size:11.5px!important"],
}
for filename, needles in checks.items():
    text = Path(filename).read_text(encoding="utf-8")
    missing = [needle for needle in needles if needle not in text]
    if missing:
        raise SystemExit(f"{filename}: release invariant missing {missing}")

print("Prepared Kerbside 0.9.42: persistent saved journeys, live saved tracking, event-card context, complete timelines and readability pass.")
