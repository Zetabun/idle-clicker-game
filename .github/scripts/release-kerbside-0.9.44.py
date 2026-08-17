#!/usr/bin/env python3
from pathlib import Path
import subprocess

TARGET_VERSION = "0.9.44"


def replace_once(path, old, new, label):
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one {label}, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# ---------------------------------------------------------------------------
# Saved journeys: make persistence transactional and synchronise the dedicated
# Saved journeys workspace synchronously. The old path updated planner memory
# before localStorage and relied on a delayed document-level listener to catch
# up, so a storage failure or a fast tab switch could make a save disappear.
# ---------------------------------------------------------------------------
core = "kerbside-journey-planner-core.js"
replace_once(
    core,
    "function writeSavedJourneys(rows){const next=[],seen=new Set();for(const value of Array.isArray(rows)?rows:[]){const item=normaliseSavedJourney(value);if(!item||seen.has(item.id))continue;seen.add(item.id);next.push(item);}planState.saved=next;try{localStorage.setItem(PLAN_SAVED_KEY,JSON.stringify(next));}catch(error){}return next;}",
    '''function writeSavedJourneys(rows){
  const next=[],seen=new Set();for(const value of Array.isArray(rows)?rows:[]){const item=normaliseSavedJourney(value);if(!item||seen.has(item.id))continue;seen.add(item.id);next.push(item);}
  try{
    localStorage.setItem(PLAN_SAVED_KEY,JSON.stringify(next));
    const persisted=readSavedJourneys();
    if(persisted.length!==next.length||persisted.some((item,index)=>item.id!==next[index].id))throw new Error('Saved journey storage verification failed');
    planState.saved=persisted;return persisted;
  }catch(error){console.warn('Kerbside could not persist saved journeys:',error);return null;}
}
function planSyncSavedWorkspace({savedId='',refresh=false}={}){
  const workspace=window.__KERBSIDE_SAVED_JOURNEYS_V2__;if(!workspace||typeof workspace.syncSaved!=='function')return null;
  const rows=workspace.syncSaved({sourceHint:planState.source||''});
  if(refresh&&savedId&&typeof workspace.refreshSavedJourney==='function')Promise.resolve(workspace.refreshSavedJourney(savedId,{force:true,reason:'planner-save'})).catch(()=>{});
  return rows;
}''',
    "transactional saved-journey writer",
)
replace_once(
    core,
    "function planSaveBoardService(service,context={}){\n  const locator=planSavedLocatorForBoardService(service,context);if(!locator)return null;const rows=readSavedJourneys(),existing=rows.find(item=>item.id===locator.id);if(existing)return existing;\n  writeSavedJourneys([locator,...rows]);renderSavedJourneys();planSyncSaveButtons();const saved=window.__KERBSIDE_SAVED_JOURNEYS_V2__;if(saved&&typeof saved.syncSaved==='function')saved.syncSaved();if(saved&&typeof saved.refreshSavedJourney==='function')Promise.resolve(saved.refreshSavedJourney(locator.id,{force:true,reason:'board-save'})).catch(()=>{});return locator;\n}",
    '''function planSaveBoardService(service,context={}){
  const locator=planSavedLocatorForBoardService(service,context);if(!locator)return null;const rows=readSavedJourneys(),existing=rows.find(item=>item.id===locator.id);if(existing)return existing;
  if(!writeSavedJourneys([locator,...rows]))return null;renderSavedJourneys();planSyncSaveButtons();planSyncSavedWorkspace({savedId:locator.id,refresh:true});return locator;
}''',
    "board save persistence",
)
replace_once(
    core,
    "function planToggleSavedByKey(key){const row=planState.results.find(item=>planCandidateKey(item)===String(key||''));if(!row)return false;const existing=planSavedEntryForCandidate(row);if(existing){writeSavedJourneys(planState.saved.filter(item=>item.id!==existing.id));if(planState.savedFocus&&planState.savedFocus.id===existing.id)planState.savedFocus=null;planSetMessage('Saved journey removed.');}else{const item=planSavedLocatorForCandidate(row);if(!item)return false;writeSavedJourneys([item,...planState.saved.filter(saved=>saved.id!==item.id)]);const panel=$('planSavedPanel');if(panel)panel.open=true;planSetMessage('Journey saved. Kerbside will keep it up to date automatically and recalculate Forecast v4 whenever it refreshes.');}renderSavedJourneys();planSyncSaveButtons();return true;}",
    '''function planToggleSavedByKey(key){
  const row=planState.results.find(item=>planCandidateKey(item)===String(key||''));if(!row)return false;const existing=planSavedEntryForCandidate(row);
  if(existing){
    if(!writeSavedJourneys(planState.saved.filter(item=>item.id!==existing.id))){planSetMessage('Kerbside could not remove this saved journey on this device. Check browser storage permissions and try again.',true);return false;}
    if(planState.savedFocus&&planState.savedFocus.id===existing.id)planState.savedFocus=null;planSyncSavedWorkspace();planSetMessage('Saved journey removed.');
  }else{
    const item=planSavedLocatorForCandidate(row);if(!item)return false;
    if(!writeSavedJourneys([item,...planState.saved.filter(saved=>saved.id!==item.id)])){planSetMessage('Kerbside could not save this journey on this device. Check browser storage permissions and try again.',true);return false;}
    const panel=$('planSavedPanel');if(panel)panel.open=true;planSyncSavedWorkspace({savedId:item.id,refresh:true});planSetMessage('Journey saved. Kerbside will keep it up to date automatically and recalculate Forecast v4 whenever it refreshes.');
  }
  renderSavedJourneys();planSyncSaveButtons();return true;
}''',
    "planner save toggle persistence",
)
replace_once(
    core,
    "function planRemoveSavedJourney(id){const before=planState.saved.length;writeSavedJourneys(planState.saved.filter(item=>item.id!==String(id||'')));if(planState.savedFocus&&planState.savedFocus.id===String(id||''))planState.savedFocus=null;renderSavedJourneys();planSyncSaveButtons();if(planState.saved.length!==before)planSetMessage('Saved journey removed.');return planState.saved.length!==before;}",
    '''function planRemoveSavedJourney(id){const before=planState.saved.length,persisted=writeSavedJourneys(planState.saved.filter(item=>item.id!==String(id||'')));if(!persisted){planSetMessage('Kerbside could not remove this saved journey on this device. Check browser storage permissions and try again.',true);return false;}if(planState.savedFocus&&planState.savedFocus.id===String(id||''))planState.savedFocus=null;planSyncSavedWorkspace();renderSavedJourneys();planSyncSaveButtons();if(planState.saved.length!==before)planSetMessage('Saved journey removed.');return planState.saved.length!==before;}''',
    "saved journey remove persistence",
)

# ---------------------------------------------------------------------------
# Football events: use two mirrors of the maintained Football.TXT repository.
# The generated football.json mirror can lag a new season and currently makes
# a transient raw GitHub failure turn into a guaranteed 404 for 2026-27.
# ---------------------------------------------------------------------------
events = "kerbside-train-events.js"
replace_once(
    events,
    "const FOOTBALL_BASE='https://raw.githubusercontent.com/openfootball/football.json/master';\nconst FOOTBALL_TEXT_BASE='https://raw.githubusercontent.com/openfootball/england/master';",
    '''const FOOTBALL_TEXT_BASES=[
  'https://raw.githubusercontent.com/openfootball/england/master',
  'https://cdn.jsdelivr.net/gh/openfootball/england@master'
];''',
    "football maintained-source mirrors",
)
replace_once(events, "const FIXTURE_STORE='kerbside.rail.fixtures.v3';", "const FIXTURE_STORE='kerbside.rail.fixtures.v4';", "football fixture cache version")
replace_once(
    events,
    '''async function loadFootballLeague(season,league){
  /* Football.TXT is the maintained source. football.json is an auto-generated
     convenience mirror and has historically appeared later at season rollover. */
  try{
    const text=await fetchText(`${FOOTBALL_TEXT_BASE}/${season}/${league.text}`);
    const matches=parseFootballText(text,season);
    if(matches.length)return matches;
  }catch(e){}
  try{
    const json=await fetchJson(`${FOOTBALL_BASE}/${season}/${league.json}.json`);
    return Array.isArray(json&&json.matches)?json.matches:[];
  }catch(e){return [];}
}''',
    '''async function loadFootballLeague(season,league){
  /* Football.TXT is the maintained source. Try a second CDN mirror of the
     same repository before giving up; do not fall through to the generated
     football.json mirror, which can legitimately lag a new season. */
  for(const base of FOOTBALL_TEXT_BASES){
    try{
      const text=await fetchText(`${base}/${season}/${league.text}`);
      const matches=parseFootballText(text,season);
      if(matches.length)return matches;
    }catch(e){}
  }
  return [];
}''',
    "football source fallback",
)

# ---------------------------------------------------------------------------
# Live timeline: rebuild from cached service detail, live/scheduled calling
# points and rows already present in the DOM, so passed stops do not vanish.
# ---------------------------------------------------------------------------
movement = "kerbside-train-movement.js"
replace_once(
    movement,
    "function serviceStartName(service,api,boardId,snapshot){const leg=firstLeg(service);if(boardId==='trainBoard'||boardId==='trainScheduledBoard'){const station=window.__KERBSIDE_TRAINS__?.state?.station||api&&api.state&&api.state.station;const label=text(station&&(station.name||station.crs));if(label)return label;}const origin=Array.isArray(leg&&leg.origin)?leg.origin.find(Boolean):leg&&leg.origin;return text(leg&&leg.from&&(leg.from.name||leg.from.locationName||leg.from.crs)||origin&&(origin.locationName||origin.name||origin.crs)||snapshot&&snapshot.activation&&snapshot.activation.origin&&(snapshot.activation.origin.name||snapshot.activation.origin.crs));}",
    '''function serviceStartName(service,api,boardId,snapshot){
  const leg=firstLeg(service),origin=Array.isArray(leg&&leg.origin)?leg.origin.find(Boolean):leg&&leg.origin;
  const routeStart=text(origin&&(origin.locationName||origin.name||origin.crs)||snapshot&&snapshot.activation&&snapshot.activation.origin&&(snapshot.activation.origin.name||snapshot.activation.origin.crs)||leg&&leg.from&&(leg.from.name||leg.from.locationName||leg.from.crs));if(routeStart)return routeStart;
  if(boardId==='trainBoard'||boardId==='trainScheduledBoard'){const station=window.__KERBSIDE_TRAINS__?.state?.station||api&&api.state&&api.state.station;return text(station&&(station.name||station.crs));}
  return '';
}''',
    "full-route timeline origin",
)
replace_once(
    movement,
    '''function flattenTimelinePoints(service){
  const leg=firstLeg(service),points=[];
  const add=value=>{for(const group of Array.isArray(value)?value:[]){const rows=Array.isArray(group&&group.callingPoint)?group.callingPoint:Array.isArray(group&&group.callingPoints)?group.callingPoints:[group];for(const point of rows){if(!point)continue;const name=text(point.locationName||point.name||point.stationName||point.crs),when=text(point.et||point.eta||point.etd||point.st||point.sta||point.std);if(name)points.push({name,when,cancelled:!!point.isCancelled});}}};
  add(leg&&leg.previousCallingPoints);add(leg&&leg.callingPoints);add(leg&&leg.subsequentCallingPoints);
  const end=serviceEndName(leg),endTime=serviceEndTime(leg);if(end&&!points.some(point=>normalisePlace(point.name)===normalisePlace(end)))points.push({name:end,when:endTime,cancelled:false});
  const seen=new Set();return points.filter(point=>{const key=normalisePlace(point.name);if(!key||seen.has(key))return false;seen.add(key);return true;});
}''',
    '''function flattenTimelinePoints(service,detailData=null){
  const leg=firstLeg(service),points=[];
  const add=(value,phase='ahead')=>{for(const group of Array.isArray(value)?value:[]){const rows=Array.isArray(group&&group.callingPoint)?group.callingPoint:Array.isArray(group&&group.callingPoints)?group.callingPoints:[group];for(const point of rows){if(!point)continue;const name=text(point.locationName||point.name||point.stationName||point.crs),when=text(point.et||point.eta||point.etd||point.st||point.sta||point.std);if(name)points.push({name,when,cancelled:!!point.isCancelled,phase});}}};
  add(detailData&&detailData.previousCallingPoints,'passed');add(leg&&leg.previousCallingPoints,'passed');add(leg&&leg.callingPoints);add(detailData&&detailData.subsequentCallingPoints);add(leg&&leg.subsequentCallingPoints);
  const end=serviceEndName(leg),endTime=serviceEndTime(leg);if(end&&!points.some(point=>normalisePlace(point.name)===normalisePlace(end)))points.push({name:end,when:endTime,cancelled:false,phase:'ahead'});
  const merged=[],seen=new Map();for(const point of points){const key=normalisePlace(point.name);if(!key)continue;const existing=seen.get(key);if(existing){if(point.phase==='passed')existing.phase='passed';if(!existing.when&&point.when)existing.when=point.when;existing.cancelled=existing.cancelled||point.cancelled;continue;}const copy={...point};seen.set(key,copy);merged.push(copy);}return merged;
}
function timelineDomPoints(calling){return timelineSourceRows(calling).map(row=>{const small=text(row.querySelector('small')&&row.querySelector('small').textContent),match=small.match(/\\b(\\d{1,2}:\\d{2})\\b/);return {name:text(row.querySelector('b')&&row.querySelector('b').textContent),when:match?match[1]:'',cancelled:row.classList.contains('cancelled'),phase:row.classList.contains('passed')||row.classList.contains('progress-complete')?'passed':'ahead'};}).filter(point=>point.name);}
function timelineMinute(value,startMinute){const match=text(value).match(/^(\\d{1,2}):(\\d{2})$/);if(!match)return Number.POSITIVE_INFINITY;let minute=Number(match[1])*60+Number(match[2]);if(Number.isFinite(startMinute)&&minute<startMinute-720)minute+=1440;return minute;}
function mergeTimelinePoints(primary,existing,startTime){
  const rows=[],byKey=new Map();for(const point of [...(Array.isArray(primary)?primary:[]),...(Array.isArray(existing)?existing:[])]){const key=normalisePlace(point&&point.name);if(!key)continue;const found=byKey.get(key);if(found){if(point.phase==='passed')found.phase='passed';if(!found.when&&point.when)found.when=point.when;found.cancelled=found.cancelled||!!point.cancelled;continue;}const copy={name:point.name,when:point.when||'',cancelled:!!point.cancelled,phase:point.phase==='passed'?'passed':'ahead',order:rows.length};byKey.set(key,copy);rows.push(copy);}
  const startMatch=text(startTime).match(/^(\\d{1,2}):(\\d{2})$/),startMinute=startMatch?Number(startMatch[1])*60+Number(startMatch[2]):null;
  return rows.sort((a,b)=>{const av=timelineMinute(a.when,startMinute),bv=timelineMinute(b.when,startMinute);if(av!==bv)return av-bv;return a.order-b.order;});
}
function ensureBoardTimeline(container,service,detailData=null){
  if(!container)return null;let calling=container.querySelector('.train-calling');const points=mergeTimelinePoints(flattenTimelinePoints(service,detailData),calling?timelineDomPoints(calling):[],serviceStartTime(service));if(!points.length)return calling;
  if(!calling){calling=document.createElement('div');calling.className='train-calling';const unavailable=[...container.querySelectorAll('.train-detail-note')].find(node=>/Calling-point data is unavailable/i.test(text(node.textContent)));if(unavailable)unavailable.remove();container.appendChild(calling);}
  const sourceSignature=points.map(point=>`${normalisePlace(point.name)}|${point.when}|${point.cancelled}|${point.phase}`).join('||');
  if(calling.dataset.trainFullRouteSource!==sourceSignature){calling.dataset.trainFullRouteSource=sourceSignature;calling.dataset.trainProgressSignature='';calling.innerHTML=`<div class="train-detail-title">Calling points</div>${points.map(point=>`<div class="train-call ${point.phase==='passed'?'passed':'ahead'}${point.cancelled?' cancelled':''}"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.when)}${point.cancelled?' · cancelled':''}</small></span></div>`).join('')}`;}
  return calling;
}''',
    "full route timeline point merger",
)
replace_once(
    movement,
    "if(calling.dataset.trainProgressSource!==sourceSignature){calling.dataset.trainProgressSource=sourceSignature;calling.dataset.trainProgressSignature='';calling.innerHTML=`<div class=\"train-detail-title\">Journey progress</div>${points.map(point=>`<div class=\"train-call ahead${point.cancelled?' cancelled':''}\"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.when)}${point.cancelled?' · cancelled':''}</small></span></div>`).join('')}`;}",
    "if(calling.dataset.trainProgressSource!==sourceSignature){calling.dataset.trainProgressSource=sourceSignature;calling.dataset.trainProgressSignature='';calling.innerHTML=`<div class=\"train-detail-title\">Journey progress</div>${points.map(point=>`<div class=\"train-call ${point.phase==='passed'?'passed':'ahead'}${point.cancelled?' cancelled':''}\"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.when)}${point.cancelled?' · cancelled':''}</small></span></div>`).join('')}`;}",
    "planner timeline passed phases",
)
replace_once(
    movement,
    "const detail=article.querySelector('.train-service-detail'),leg=firstLeg(service),timeline=decorateCallingTimeline(detail&&detail.querySelector('.train-calling'),leg,snapshot,{startName:serviceStartName(service,api,boardId,snapshot),startTime:serviceStartTime(leg)});",
    "const detail=article.querySelector('.train-service-detail'),leg=firstLeg(service),detailCache=api&&api.state&&api.state.detailCache instanceof Map?api.state.detailCache.get(key):null,calling=ensureBoardTimeline(detail,leg,detailCache),timeline=decorateCallingTimeline(calling,leg,snapshot,{startName:serviceStartName(service,api,boardId,snapshot),startTime:serviceStartTime(leg)});",
    "board timeline full-route reconstruction",
)

# ---------------------------------------------------------------------------
# Browser regressions.
# ---------------------------------------------------------------------------
planner_test = "kerbside-backend/tests/train-journey-planner-regression.mjs"
replace_once(
    planner_test,
    "const diagnostics={primary:[],fallback:[],events:[],pageErrors:[],consoleErrors:[]};",
    "const diagnostics={primary:[],fallback:[],events:[],footballPrimary:[],footballMirror:[],footballJson:[],pageErrors:[],consoleErrors:[]};",
    "planner event diagnostics",
)
replace_once(
    planner_test,
    '''  await page.route('https://raw.githubusercontent.com/openfootball/england/**',route=>{
    const pathname=new URL(route.request().url()).pathname;
    const body=pathname.includes('/2026-27/2-championship.txt')?'Sat Aug 29\\n15:00 Bristol City FC v Portsmouth FC\\n':'= Synthetic empty OpenFootball season\\n';
    return route.fulfill({status:200,contentType:'text/plain',body});
  });
  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**',route=>
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({matches:[]})})
  );''',
    '''  await page.route('https://raw.githubusercontent.com/openfootball/england/**',route=>{
    diagnostics.footballPrimary.push(new URL(route.request().url()).pathname);
    return route.fulfill({status:200,contentType:'text/plain',body:'= Synthetic empty primary OpenFootball response\\n'});
  });
  await page.route('https://cdn.jsdelivr.net/gh/openfootball/england@master/**',route=>{
    const pathname=new URL(route.request().url()).pathname;diagnostics.footballMirror.push(pathname);
    const body=pathname.includes('/2026-27/2-championship.txt')?'Sat Aug 29\\n15:00 Bristol City FC v Portsmouth FC\\n':'= Synthetic empty OpenFootball mirror response\\n';
    return route.fulfill({status:200,contentType:'text/plain',body});
  });
  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**',route=>{
    diagnostics.footballJson.push(new URL(route.request().url()).pathname);
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });''',
    "maintained football mirror routes",
)
replace_once(
    planner_test,
    "  assert.ok(bristolFixture.reasons.some(reason=>/Bristol City FC v Portsmouth FC/.test(reason)),`Forecast reason should name the Bristol fixture: ${JSON.stringify(bristolFixture)}`);",
    "  assert.ok(bristolFixture.reasons.some(reason=>/Bristol City FC v Portsmouth FC/.test(reason)),`Forecast reason should name the Bristol fixture: ${JSON.stringify(bristolFixture)}`);\n  assert.ok(diagnostics.footballMirror.some(pathname=>pathname.includes('/2026-27/2-championship.txt')),`maintained football CDN mirror should be used when the primary text response has no fixtures: ${JSON.stringify(diagnostics)}`);\n  assert.equal(diagnostics.footballJson.length,0,`generated football.json mirror must not be queried for a season it may not have published: ${JSON.stringify(diagnostics.footballJson)}`);",
    "football mirror regression assertions",
)
replace_once(
    planner_test,
    '''  const quietCard=page.locator('#planJourneyResults .plan-journey-result').filter({hasText:'Quiet Rail'});
  await quietCard.locator('[data-plan-save-key]').click();
  await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').length===1&&Boolean(window.__KERBSIDE_SAVED_JOURNEYS_V2__?.state?.installed);}catch{return false;}});
  let savedJourney=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1'))[0]);''',
    '''  const quietCard=page.locator('#planJourneyResults .plan-journey-result').filter({hasText:'Quiet Rail'});
  const immediateSave=await quietCard.locator('[data-plan-save-key]').evaluate(button=>{button.click();let stored=[];try{stored=JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]');}catch{}return {stored:stored.length,workspace:window.__KERBSIDE_SAVED_JOURNEYS_V2__?.state?.saved?.length||0,label:(button.textContent||'').trim()};});
  assert.deepEqual(immediateSave,{stored:1,workspace:1,label:'Saved'},'Save journey must persist and synchronise the Saved journeys workspace in the same click, not via a delayed listener');
  await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').length===1&&window.__KERBSIDE_SAVED_JOURNEYS_V2__?.state?.saved?.length===1;}catch{return false;}});
  let savedJourney=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1'))[0]);''',
    "immediate saved journey persistence regression",
)

movement_test = "kerbside-backend/tests/train-movement-browser-regression.mjs"
replace_once(
    movement_test,
    "    const service={serviceID:'20260816C21373',std:'20:12',arrival:'21:33',operator:'CrossCountry',destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}]};",
    "    const service={serviceID:'20260816C21373',uid:'C21373',trainId:'5F25',std:'20:12',arrival:'21:33',operator:'CrossCountry',origin:[{locationName:'Wolverhampton',crs:'WVH'}],destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}]};",
    "movement live service route origin",
)
replace_once(
    movement_test,
    "    const trains=window.__KERBSIDE_TRAINS__,liveKey=trains.serviceKey(service,0);trains.state.station={crs:'BHM',name:'Birmingham New Street'};trains.state.services=[service];",
    "    const trains=window.__KERBSIDE_TRAINS__,liveKey=trains.serviceKey(service,0);trains.state.station={crs:'BHM',name:'Birmingham New Street'};trains.state.services=[service];trains.state.detailCache.set(liveKey,{previousCallingPoints:[{callingPoint:[{locationName:'Wolverhampton',crs:'WVH',st:'19:40',at:'19:42',isCancelled:false},{locationName:'Sandwell & Dudley',crs:'SAD',st:'19:55',at:'19:56',isCancelled:false},{locationName:'Smethwick Galton Bridge',crs:'SGB',st:'20:03',at:'20:04',isCancelled:false}]}],subsequentCallingPoints:[{callingPoint:[{locationName:'University',crs:'UNI',st:'20:20',et:'20:22',isCancelled:false},{locationName:'Selly Oak',crs:'SLY',st:'20:24',et:'20:25',isCancelled:false},{locationName:'Cheltenham Spa',crs:'CNM',st:'21:00',et:'21:02',isCancelled:false},{locationName:'Bristol Temple Meads',crs:'BRI',st:'21:33',et:'21:35',isCancelled:false}]}]});",
    "movement cached full route fixture",
)
replace_once(
    movement_test,
    "  assert.match(result.liveTimeline,/Birmingham New Street/i);\n  assert.match(result.liveTimeline,/Between Birmingham New Street and University/i);",
    "  assert.match(result.liveTimeline,/Wolverhampton/i,'live timeline should include calling points before the selected/current station');\n  assert.match(result.liveTimeline,/Sandwell & Dudley/i,'live timeline should retain the earlier route');\n  assert.match(result.liveTimeline,/Smethwick Galton Bridge/i,'live timeline should retain the last passed stop');\n  assert.match(result.liveTimeline,/Bristol Temple Meads/i,'live timeline should retain the destination as part of the full route');\n  assert.match(result.liveTimeline,/Between Birmingham New Street and University/i);",
    "live full timeline assertions",
)
replace_once(
    movement_test,
    "  assert.equal(result.matches,1,'opened scheduled service should narrow movement matching to one scoped target');",
    '''  assert.equal(result.matches,1,'opened scheduled service should narrow movement matching to one scoped target');

  const restoredRoute=await page.evaluate(async()=>{
    const calling=document.querySelector('#trainBoard .train-calling');calling.innerHTML='<div class="train-detail-title">Calling points</div><div class="train-call ahead"><i></i><span><b>University</b><small>20:20</small></span></div><div class="train-call ahead"><i></i><span><b>Selly Oak</b><small>20:24</small></span></div>';
    await window.__KERBSIDE_TRAIN_MOVEMENT__.refresh({force:true});
    return calling.textContent||'';
  });
  assert.match(restoredRoute,/Wolverhampton/i,'a later board/detail rerender must not erase previous calling points from the full route');
  assert.match(restoredRoute,/Smethwick Galton Bridge/i,'cached previous calling points should be restored after rerender');
  assert.match(restoredRoute,/Bristol Temple Meads/i,'cached future calling points should be restored after rerender');''',
    "timeline rerender restoration regression",
)

# Version bump last so a failed patch cannot leave a partial release version.
version_path = Path("VERSION")
current = version_path.read_text(encoding="utf-8").strip()
if current != "0.9.43":
    raise SystemExit(f"Expected VERSION 0.9.43 before release, found {current}")
version_path.write_text(TARGET_VERSION + "\n", encoding="utf-8")
subprocess.run(["python3", ".github/scripts/sync-version.py"], check=True)
subprocess.run(["python3", ".github/scripts/sync-version.py", "--check"], check=True)

print("Prepared Kerbside 0.9.44: durable saved journeys, resilient football fixtures, and full live timelines.")
