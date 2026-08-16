#!/usr/bin/env python3
from pathlib import Path
import subprocess

VERSION='0.9.25'

def replace_once(path, old, new):
    target=Path(path)
    text=target.read_text(encoding='utf-8')
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one anchor, found {count}')
    target.write_text(text.replace(old,new,1),encoding='utf-8')

# Expose the existing station-selection path without changing normal callers.
replace_once('kerbside-trains.js',
"""function selectStation(station){
  if(!station || !station.crs) return;
  state.station = {name:station.name || station.crs, crs:String(station.crs).toUpperCase()};
  state.board = null;
  state.selectedServiceId = '';
  closeSuggestions();
  const input = $('trainStationQuery');
  if(input) input.value = state.station.name;
  savePrefs();
  loadBoard(state.station, {silent:false});
}
""",
"""function selectStation(station,{load=true}={}){
  if(!station || !station.crs) return false;
  state.station = {name:station.name || station.crs, crs:String(station.crs).toUpperCase()};
  state.board = null;
  state.selectedServiceId = '';
  closeSuggestions();
  const input = $('trainStationQuery');
  if(input) input.value = state.station.name;
  savePrefs();
  if(load) loadBoard(state.station, {silent:false});
  return true;
}
""")
replace_once('kerbside-trains.js',
"""  destinationText,
  routeContext,
  state
};
""",
"""  destinationText,
  routeContext,
  selectStation,
  state
};
""")

# Saved Journeys v2: add a guarded same-day bridge into the existing Active Journey.
replace_once('kerbside-journey-planner-core.js',
"""const state={installed:false,active:false,saved:[],meta:{entries:{},coverageKey:'',updatedAt:''},live:new Map(),hidden:new Map(),refreshing:new Set(),refreshAllPromise:null,timer:null,coverageTimer:null,lastRefreshAt:0};
""",
"""const state={installed:false,active:false,saved:[],meta:{entries:{},coverageKey:'',updatedAt:''},live:new Map(),hidden:new Map(),refreshing:new Set(),starting:new Set(),actionMessages:new Map(),refreshAllPromise:null,timer:null,coverageTimer:null,lastRefreshAt:0};
""")

replace_once('kerbside-journey-planner-core.js',
"""function shouldRefresh(saved,meta,force){if(force)return true;const stamp=Date.parse(meta&&meta.lastChecked||'');return !Number.isFinite(stamp)||Date.now()-stamp>=refreshAgeLimit(saved);}
""",
r"""function shouldRefresh(saved,meta,force){if(force)return true;const stamp=Date.parse(meta&&meta.lastChecked||'');return !Number.isFinite(stamp)||Date.now()-stamp>=refreshAgeLimit(saved);}
function activeServiceKey(active){if(!active)return'';if(active.journeyType==='connection')return `connection:${selectorKey(active.first)}:${String(active.change&&active.change.crs||active.change||'').toUpperCase()}:${selectorKey(active.onward)}`;return `direct:${selectorKey(active.service)}`;}
function activeMatchesSaved(saved){const active=window.__KERBSIDE_ACTIVE_JOURNEY__&&window.__KERBSIDE_ACTIVE_JOURNEY__.state&&window.__KERBSIDE_ACTIVE_JOURNEY__.state.active;if(!active||!saved)return false;return String(active.date||'')===String(saved.date||'')&&String(active.from&&active.from.crs||'').toUpperCase()===String(saved.from&&saved.from.crs||'').toUpperCase()&&String(active.to&&active.to.crs||'').toUpperCase()===String(saved.to&&saved.to.crs||'').toUpperCase()&&activeServiceKey(active)===savedServiceKey(saved);}
function canStartActiveSavedJourney(saved,meta=ensureMeta(saved),live=saved&&state.live.get(saved.id)){if(!saved||saved.date!==todayLondon()||!meta||!meta.lastResolved)return false;if(!['exact','identity'].includes(String(meta.resolution||'')))return false;if(['cancelled','expired','unavailable'].includes(String(meta.status||''))||live&&live.isCancelled)return false;return true;}
function activeStartDepartAfter(saved,meta){const minute=timeMinutes(meta&&meta.lastResolved&&meta.lastResolved.departure||saved&&saved.scheduledDeparture||saved&&saved.searchStart);return clock(Math.max(0,(minute==null?0:minute)-30));}
function showActiveJourney(){const api=planner();if(state.active)exitSavedView();if(api&&typeof api.setPlanView==='function')api.setPlanView(false);const active=window.__KERBSIDE_ACTIVE_JOURNEY__;if(active&&typeof active.sync==='function')active.sync();setTimeout(()=>document.getElementById('trainActiveJourney')?.scrollIntoView({block:'start',behavior:'smooth'}),0);return true;}
async function startActiveSavedJourney(id){
  syncSaved({render:false});let saved=state.saved.find(item=>item.id===String(id||''));if(!saved)return false;
  if(activeMatchesSaved(saved)){state.actionMessages.delete(saved.id);return showActiveJourney();}
  if(saved.date!==todayLondon()){state.actionMessages.set(saved.id,'Active Journey is available only on the saved travel day.');renderSavedView();return false;}
  if(state.starting.has(saved.id)||state.refreshing.has(saved.id)){state.actionMessages.set(saved.id,'Wait for the current saved-journey refresh to finish, then try again.');renderSavedView();return false;}
  state.starting.add(saved.id);state.actionMessages.delete(saved.id);renderSavedView();
  try{
    const refreshed=await refreshSavedJourney(saved.id,{force:true,reason:'start-active'});syncSaved({render:false});saved=state.saved.find(item=>item.id===String(id||''));const meta=saved&&ensureMeta(saved),live=saved&&state.live.get(saved.id);
    if(!refreshed||!saved||!canStartActiveSavedJourney(saved,meta,live))throw new Error('This saved service no longer has a strong same-day timetable match. Open it in the planner to review the current options.');
    const trains=window.__KERBSIDE_TRAINS__,routes=window.__KERBSIDE_TRAIN_ROUTES__,dates=window.__KERBSIDE_TRAIN_DATE__,timetable=window.__KERBSIDE_TRAIN_TIMETABLE__,active=window.__KERBSIDE_ACTIVE_JOURNEY__,plan=planner();
    if(!trains||typeof trains.selectStation!=='function'||!routes||typeof routes.setFromCrs!=='function'||typeof routes.selectDestination!=='function'||!dates||typeof dates.setDate!=='function'||!timetable||typeof timetable.load!=='function'||typeof timetable.serviceKey!=='function'||!active||typeof active.startByKey!=='function'||!plan||typeof plan.planMatchSavedJourney!=='function')throw new Error('Active Journey is still loading. Please try again in a moment.');
    const departAfter=activeStartDepartAfter(saved,meta),input=$('trainDepartAfter');
    trains.selectStation(saved.from,{load:false});routes.setFromCrs(saved.from.crs);routes.selectDestination(saved.to,{reload:false});if(input)input.value=departAfter;dates.setDate(todayLondon());
    await timetable.load({mode:'today',departAfter});
    const services=Array.isArray(timetable.state&&timetable.state.services)?timetable.state.services:[],match=plan.planMatchSavedJourney(saved,services,{allowClosest:false});
    if(!match||!match.candidate||!['exact','identity'].includes(String(match.confidence||'')))throw new Error('The saved service changed while Active Journey was starting. Review the current timetable before boarding.');
    const index=services.indexOf(match.candidate),key=timetable.serviceKey(match.candidate,index);
    if(!active.startByKey(key))throw new Error('Kerbside could not pin this service as the active journey. Refresh the timetable and try again.');
    state.actionMessages.delete(saved.id);return showActiveJourney();
  }catch(error){state.actionMessages.set(saved.id,error&&error.message?error.message:'Active Journey could not be started.');renderSavedView();return false;}
  finally{state.starting.delete(saved&&saved.id||String(id||''));if(state.active)renderSavedView();}
}
""")

replace_once('kerbside-journey-planner-core.js',
"""  finally{state.refreshing.delete(saved.id);}
}
""",
"""  finally{state.refreshing.delete(saved.id);renderSavedView();}
}
""")

replace_once('kerbside-journey-planner-core.js',
"""function cardMarkup(saved){const meta=ensureMeta(saved),resolved=meta.lastResolved||baselineFromSaved(saved,meta.source),live=state.live.get(saved.id),changes=Array.isArray(meta.changes)?meta.changes:[],busy=state.refreshing.has(saved.id),status=meta.status||'planned',times=`${resolved.departure||saved.scheduledDeparture||'—'} → ${resolved.arrival||saved.scheduledArrival||'—'}`,source=sourceLabel(resolved.source||meta.source),changeMarkup=changes.length?`<ul class=\"saved-v2-changes\">${changes.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class=\"saved-v2-nochange\">No timetable changes detected since this journey was saved.</p>',liveMarkup=liveText(live)?`<div class=\"saved-v2-live\">${esc(liveText(live))}</div>`:'',error=meta.lastError?`<div class=\"saved-v2-error\">${esc(meta.lastError)}</div>`:'';return `<article class=\"saved-v2-card\" data-saved-v2-id=\"${esc(saved.id)}\"><header><div><span class=\"saved-v2-date\">${esc(dateLabel(saved.date))}</span><h3>${esc(saved.from.name)} → ${esc(saved.to.name)}</h3></div>${statusMarkup(status)}</header><div class=\"saved-v2-times\"><strong>${esc(times)}</strong><span>${esc(source)}</span></div>${liveMarkup}<div class=\"saved-v2-intent\"><span>Saved plan</span><strong>${esc(intentLabel(saved))}</strong></div><div class=\"saved-v2-changes-wrap\"><span>Since you saved it</span>${changeMarkup}</div>${error}<footer><span>${esc(relativeCheck(meta.lastChecked))}${busy?' · Refreshing…':''}</span><div><button type=\"button\" data-saved-v2-open=\"${esc(saved.id)}\">Open in planner</button><button type=\"button\" data-saved-v2-refresh=\"${esc(saved.id)}\"${busy?' disabled':''}>Refresh now</button><button type=\"button\" class=\"saved-v2-remove\" data-saved-v2-remove=\"${esc(saved.id)}\">Remove</button></div></footer></article>`;}
""",
"""function cardMarkup(saved){const meta=ensureMeta(saved),resolved=meta.lastResolved||baselineFromSaved(saved,meta.source),live=state.live.get(saved.id),changes=Array.isArray(meta.changes)?meta.changes:[],busy=state.refreshing.has(saved.id),starting=state.starting.has(saved.id),sameActive=activeMatchesSaved(saved),startable=sameActive||canStartActiveSavedJourney(saved,meta,live),status=meta.status||'planned',times=`${resolved.departure||saved.scheduledDeparture||'—'} → ${resolved.arrival||saved.scheduledArrival||'—'}`,source=sourceLabel(resolved.source||meta.source),changeMarkup=changes.length?`<ul class=\"saved-v2-changes\">${changes.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class=\"saved-v2-nochange\">No timetable changes detected since this journey was saved.</p>',liveMarkup=liveText(live)?`<div class=\"saved-v2-live\">${esc(liveText(live))}</div>`:'',actionMessage=state.actionMessages.get(saved.id)||'',error=meta.lastError||actionMessage?`<div class=\"saved-v2-error\">${esc(actionMessage||meta.lastError)}</div>`:'',activeAction=startable?`<button type=\"button\" class=\"saved-v2-active\" data-saved-v2-active=\"${esc(saved.id)}\"${busy||starting?' disabled':''}>${sameActive?'Open active journey':starting?'Starting…':'Start active journey'}</button>`:'';return `<article class=\"saved-v2-card\" data-saved-v2-id=\"${esc(saved.id)}\"><header><div><span class=\"saved-v2-date\">${esc(dateLabel(saved.date))}</span><h3>${esc(saved.from.name)} → ${esc(saved.to.name)}</h3></div>${statusMarkup(status)}</header><div class=\"saved-v2-times\"><strong>${esc(times)}</strong><span>${esc(source)}</span></div>${liveMarkup}<div class=\"saved-v2-intent\"><span>Saved plan</span><strong>${esc(intentLabel(saved))}</strong></div><div class=\"saved-v2-changes-wrap\"><span>Since you saved it</span>${changeMarkup}</div>${error}<footer><span>${esc(relativeCheck(meta.lastChecked))}${busy?' · Refreshing…':''}</span><div>${activeAction}<button type=\"button\" data-saved-v2-open=\"${esc(saved.id)}\">Open in planner</button><button type=\"button\" data-saved-v2-refresh=\"${esc(saved.id)}\"${busy?' disabled':''}>Refresh now</button><button type=\"button\" class=\"saved-v2-remove\" data-saved-v2-remove=\"${esc(saved.id)}\">Remove</button></div></footer></article>`;}
""")

replace_once('kerbside-journey-planner-core.js',
""".saved-v2-card button{min-height:34px;padding:7px 9px;border:1px solid var(--rule);border-radius:8px;background:var(--ink);color:var(--text);font-size:9.5px;font-weight:800}.saved-v2-card button[data-saved-v2-open]{color:var(--led)}.saved-v2-card .saved-v2-remove{color:var(--text-dim)}.saved-v2-empty{display:grid;gap:4px;padding:28px 18px;text-align:center;color:var(--text-dim)}
""",
""".saved-v2-card button{min-height:34px;padding:7px 9px;border:1px solid var(--rule);border-radius:8px;background:var(--ink);color:var(--text);font-size:9.5px;font-weight:800}.saved-v2-card button[data-saved-v2-open]{color:var(--led)}.saved-v2-card .saved-v2-active{border-color:rgb(var(--live-rgb) / .38);background:rgb(var(--live-rgb) / .07);color:var(--live)}.saved-v2-card button:disabled{opacity:.58;cursor:wait}.saved-v2-card .saved-v2-remove{color:var(--text-dim)}.saved-v2-empty{display:grid;gap:4px;padding:28px 18px;text-align:center;color:var(--text-dim)}
""")

replace_once('kerbside-journey-planner-core.js',
"""  $('savedJourneyList').addEventListener('click',async event=>{const open=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-open]'),refresh=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-refresh]'),remove=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-remove]');if(open){const id=open.getAttribute('data-saved-v2-open');exitSavedView();await api.planOpenSavedJourney(id);syncSaved();}else if(refresh){await refreshSavedJourney(refresh.getAttribute('data-saved-v2-refresh'),{force:true,reason:'manual'});}else if(remove){const id=remove.getAttribute('data-saved-v2-remove');api.planRemoveSavedJourney(id);delete state.meta.entries[id];state.live.delete(id);writeMeta();syncSaved();}});
""",
"""  $('savedJourneyList').addEventListener('click',async event=>{const active=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-active]'),open=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-open]'),refresh=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-refresh]'),remove=event.target&&event.target.closest&&event.target.closest('[data-saved-v2-remove]');if(active){await startActiveSavedJourney(active.getAttribute('data-saved-v2-active'));}else if(open){const id=open.getAttribute('data-saved-v2-open');exitSavedView();await api.planOpenSavedJourney(id);syncSaved();}else if(refresh){state.actionMessages.delete(refresh.getAttribute('data-saved-v2-refresh'));await refreshSavedJourney(refresh.getAttribute('data-saved-v2-refresh'),{force:true,reason:'manual'});}else if(remove){const id=remove.getAttribute('data-saved-v2-remove');api.planRemoveSavedJourney(id);delete state.meta.entries[id];state.live.delete(id);state.actionMessages.delete(id);writeMeta();syncSaved();}});
""")

replace_once('kerbside-journey-planner-core.js',
"""window.__KERBSIDE_SAVED_JOURNEYS_V2__={state,install,enterSavedView,exitSavedView,syncSaved,refreshSavedJourney,refreshAll,checkCoverageSnapshot,changesSinceSaved,statusFor,summaryFromCandidate,chooseAlternative};
""",
"""window.__KERBSIDE_SAVED_JOURNEYS_V2__={state,install,enterSavedView,exitSavedView,syncSaved,refreshSavedJourney,refreshAll,checkCoverageSnapshot,changesSinceSaved,statusFor,summaryFromCandidate,chooseAlternative,canStartActiveSavedJourney,activeMatchesSaved,startActiveSavedJourney};
""")

# Extend the existing Active Journey browser regression to cover Saved -> Active.
replace_once('kerbside-backend/tests/train-active-journey-regression.mjs',
"""  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_ACTIVE_JOURNEY__?.install&&window.__KERBSIDE_TRAIN_TIMETABLE__?.load),null,{timeout:10000});
""",
"""  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_ACTIVE_JOURNEY__?.install&&window.__KERBSIDE_TRAIN_TIMETABLE__?.load&&window.__KERBSIDE_SAVED_JOURNEYS_V2__?.startActiveSavedJourney&&window.__KERBSIDE_TRAINS__?.selectStation),null,{timeout:10000});
""")
replace_once('kerbside-backend/tests/train-active-journey-regression.mjs',
"""    provider.getServices=async options=>{window.__ACTIVE_PROVIDER_CALLS__.push({...options});return rows();};
""",
"""    const fetchRows=async options=>{window.__ACTIVE_PROVIDER_CALLS__.push({...options});return rows();};
    provider.getServices=fetchRows;
    provider.getJourneyOptions=fetchRows;
""")

replace_once('kerbside-backend/tests/train-active-journey-regression.mjs',
"""  assert.equal(stopped.watchVisible,true);

""",
r"""  assert.equal(stopped.watchVisible,true);

  const savedSetup=await page.evaluate(async today=>{
    const id='saved-active-handoff';
    const saved={v:1,id,savedAt:new Date().toISOString(),refreshedAt:'',date:today,from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'},journeyType:'direct',service:{serviceID:'ACTIVE-1',uid:'ACTIVE-UID',trainId:'1A10',std:'09:50'},first:{serviceID:'',uid:'',trainId:'',std:''},onward:{serviceID:'',uid:'',trainId:'',std:''},change:'',scheduledDeparture:'09:50',scheduledArrival:'10:30',searchStart:'09:00',searchEnd:'11:00',preference:'balanced',constraints:{maxChanges:1,connectionBuffer:0}};
    localStorage.setItem('kerbside.rail.plan.saved.v1',JSON.stringify([saved]));
    localStorage.removeItem('kerbside.rail.plan.saved-meta.v2');
    const savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__,trains=window.__KERBSIDE_TRAINS__,routes=window.__KERBSIDE_TRAIN_ROUTES__;
    savedApi.state.meta={entries:{},coverageKey:'',updatedAt:''};savedApi.state.live.clear();savedApi.state.actionMessages.clear();savedApi.syncSaved();
    await savedApi.refreshSavedJourney(id,{force:true,reason:'regression'});
    trains.state.station={name:'Manchester Piccadilly',crs:'MAN'};routes.state.fromCrs='MAN';routes.state.destination={name:'Leeds',crs:'LDS'};
    document.getElementById('trainStationQuery').value='Manchester Piccadilly';document.getElementById('trainDestinationQuery').value='Leeds';
    savedApi.enterSavedView();
    return {id,resolution:savedApi.state.meta.entries[id].resolution,status:savedApi.state.meta.entries[id].status};
  },setup.today);
  assert.ok(['exact','identity'].includes(savedSetup.resolution),'saved service should strongly re-resolve before Active Journey is offered');
  assert.equal(savedSetup.status,'today');
  await page.waitForFunction(()=>!window.__KERBSIDE_SAVED_JOURNEYS_V2__.state.refreshing.size,null,{timeout:10000});
  const savedStart=page.locator(`#savedJourneyList [data-saved-v2-active="${savedSetup.id}"]`);
  await savedStart.waitFor({state:'visible',timeout:10000});
  assert.equal(await savedStart.textContent(),'Start active journey');
  await savedStart.click();
  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_ACTIVE_JOURNEY__?.state?.active&&document.querySelector('#trainActiveJourney:not([hidden])')),null,{timeout:10000});
  const handoff=await page.evaluate(()=>({active:window.__KERBSIDE_ACTIVE_JOURNEY__.state.active,station:window.__KERBSIDE_TRAINS__.state.station,route:window.__KERBSIDE_TRAIN_ROUTES__.state.destination,date:window.__KERBSIDE_TRAIN_DATE__.state.date,savedHidden:document.getElementById('savedJourneySurface').hidden,panel:document.getElementById('trainActiveJourney').textContent.replace(/\s+/g,' ').trim()}));
  assert.equal(handoff.station.crs,'BHM','saved handoff should restore the saved origin');
  assert.equal(handoff.route.crs,'BRI','saved handoff should restore the saved destination');
  assert.equal(handoff.date,setup.today);
  assert.equal(handoff.active.service.uid,'ACTIVE-UID');
  assert.equal(handoff.savedHidden,true,'successful handoff should return to the Trains view');
  assert.match(handoff.panel,/Active journey/);
  const firstStartedAt=handoff.active.startedAt;

  await page.click('[data-train-view="saved"]');
  await page.waitForFunction(()=>!window.__KERBSIDE_SAVED_JOURNEYS_V2__.state.refreshing.size,null,{timeout:10000});
  const openActive=page.locator(`#savedJourneyList [data-saved-v2-active="${savedSetup.id}"]`);
  await openActive.waitFor({state:'visible',timeout:10000});
  assert.equal(await openActive.textContent(),'Open active journey');
  await openActive.click();
  await page.waitForFunction(()=>document.querySelector('#trainActiveJourney:not([hidden])'),null,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.__KERBSIDE_ACTIVE_JOURNEY__.state.active.startedAt),firstStartedAt,'opening the same active saved journey must not restart it');

  await page.locator('#trainActiveJourney [data-active-stop]').click();
  await page.waitForFunction(()=>!window.__KERBSIDE_ACTIVE_JOURNEY__.state.active,null,{timeout:10000});

""")

Path('VERSION').write_text(VERSION+'\n',encoding='utf-8')
subprocess.run(['python3','.github/scripts/sync-version.py'],check=True)
print('Prepared Kerbside',VERSION,'Saved Journeys -> Active Journey handoff release.')
