#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new, label):
    path = Path(path)
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one {label}, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


# ---------------------------------------------------------------------------
# A later board/detail render can replace the actual calling-point rows without
# clearing the movement overlay fingerprint. Compare the real DOM route too so
# the full route is rebuilt whenever earlier/future stops have disappeared.
# ---------------------------------------------------------------------------
movement = 'kerbside-train-movement.js'
replace_once(
    movement,
    """  const sourceSignature=points.map(point=>`${normalisePlace(point.name)}|${point.when}|${point.cancelled}|${point.phase}`).join('||');
  if(calling.dataset.trainFullRouteSource!==sourceSignature){calling.dataset.trainFullRouteSource=sourceSignature;calling.dataset.trainProgressSignature='';calling.innerHTML=`<div class=\"train-detail-title\">Calling points</div>${points.map(point=>`<div class=\"train-call ${point.phase==='passed'?'passed':'ahead'}${point.cancelled?' cancelled':''}\"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.when)}${point.cancelled?' · cancelled':''}</small></span></div>`).join('')}`;}
""",
    """  const sourceSignature=points.map(point=>`${normalisePlace(point.name)}|${point.when}|${point.cancelled}|${point.phase}`).join('||');
  const routeSignature=points.map(point=>normalisePlace(point.name)).join('||'),domRouteSignature=timelineDomPoints(calling).map(point=>normalisePlace(point.name)).join('||');
  if(calling.dataset.trainFullRouteSource!==sourceSignature||domRouteSignature!==routeSignature){calling.dataset.trainFullRouteSource=sourceSignature;calling.dataset.trainProgressSignature='';calling.innerHTML=`<div class=\"train-detail-title\">Calling points</div>${points.map(point=>`<div class=\"train-call ${point.phase==='passed'?'passed':'ahead'}${point.cancelled?' cancelled':''}\"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.when)}${point.cancelled?' · cancelled':''}</small></span></div>`).join('')}`;}
""",
    'generated timeline fingerprint block',
)

# ---------------------------------------------------------------------------
# The local Network Rail timetable previously discarded every intermediate
# call when turning a schedule row into a journey leg. Preserve compact
# previous/subsequent calling points. This gives Saved journeys and the live
# movement overlay a complete route even when Darwin service-detail is absent.
# ---------------------------------------------------------------------------
timetable = 'kerbside-train-timetable.js'
replace_once(
    timetable,
    """  const terminus=location(locations,terminusCall&&terminusCall[0]);
  const serviceOrigin=location(locations,calls[0]&&calls[0][0]);
  return {
""",
    """  const terminus=location(locations,terminusCall&&terminusCall[0]);
  const serviceOrigin=location(locations,calls[0]&&calls[0][0]);
  const routePoint=call=>{if(!call)return null;const place=location(locations,call[0]),scheduled=call[2]||call[1]||'';return {locationName:place.name,crs:place.crs,st:scheduled,isCancelled:false};};
  const previousCallingPoints=calls.slice(0,fromIndex).map(routePoint).filter(Boolean),subsequentCallingPoints=calls.slice(fromIndex+1).map(routePoint).filter(Boolean);
  return {
""",
    'timetable route-point extraction',
)
replace_once(
    timetable,
    """    routeDestination:to,serviceTerminus:terminus,from,to,
    departureMinute,arrivalMinute,scheduledOnly:true,isCancelled:false,length:0
""",
    """    routeDestination:to,serviceTerminus:terminus,from,to,
    previousCallingPoints:previousCallingPoints.length?[{callingPoint:previousCallingPoints}]:[],
    subsequentCallingPoints:subsequentCallingPoints.length?[{callingPoint:subsequentCallingPoints}]:[],
    departureMinute,arrivalMinute,scheduledOnly:true,isCancelled:false,length:0
""",
    'timetable route fields',
)

# ---------------------------------------------------------------------------
# Saved Journeys v2 now persists a compact station/time route in its metadata.
# The saved object itself remains a locator/intent; the route is regenerated
# whenever the service is refreshed so timetable changes still flow through.
# ---------------------------------------------------------------------------
core = 'kerbside-journey-planner-core.js'
replace_once(
    core,
    "function summaryFromCandidate(row,source){return {departure:String(row&&(row.std||row.departure)||''),arrival:String(row&&row.arrival||''),journeyType:row&&row.journeyType==='connection'?'connection':'direct',changes:Math.max(0,Number(row&&row.changes)||0),source:String(source||''),serviceKey:candidateServiceKey(row)};}",
    """function savedTimelinePoint(raw){if(!raw)return null;const name=String(raw.locationName||raw.name||raw.stationName||raw.crs||'').trim(),crs=String(raw.crs||raw.crsCode||'').trim().toUpperCase(),when=String(raw.at||raw.ata||raw.atd||raw.et||raw.eta||raw.etd||raw.st||raw.sta||raw.std||raw.when||'').trim();return name?{name,crs,when}:null;}
function savedTimelineFromCandidate(row){
  const out=[],seen=new Set(),legs=row&&row.journeyType==='connection'&&Array.isArray(row.legs)&&row.legs.length?row.legs:[row];
  const push=raw=>{const point=savedTimelinePoint(raw);if(!point)return false;const key=(point.crs||point.name.toLowerCase());if(seen.has(key))return false;seen.add(key);out.push(point);return true;};
  const values=value=>{const rows=[];for(const group of Array.isArray(value)?value:[]){if(Array.isArray(group&&group.callingPoint))rows.push(...group.callingPoint);else if(Array.isArray(group&&group.callingPoints))rows.push(...group.callingPoints);else if(group)rows.push(group);}return rows;};
  legs.filter(Boolean).forEach((leg,legIndex)=>{
    const target=leg&&leg.to||{},targetCrs=String(target.crs||target.crsCode||'').toUpperCase(),targetName=String(target.name||target.locationName||'').trim().toLowerCase();
    if(legIndex===0){const origin=Array.isArray(leg&&leg.origin)?leg.origin.find(Boolean):leg&&leg.origin;if(origin)push(origin);values(leg&&leg.previousCallingPoints).forEach(push);}
    if(leg&&leg.from)push(leg.from);
    let reached=false;for(const point of [...values(leg&&leg.callingPoints),...values(leg&&leg.subsequentCallingPoints)]){if(reached)break;push(point);const code=String(point&&point.crs||'').toUpperCase(),name=String(point&&(point.locationName||point.name)||'').trim().toLowerCase();if((targetCrs&&code===targetCrs)||(targetName&&name===targetName))reached=true;}
    if(leg&&leg.to)push(leg.to);
  });
  return out.slice(0,80);
}
function summaryFromCandidate(row,source){return {departure:String(row&&(row.std||row.departure)||''),arrival:String(row&&row.arrival||''),journeyType:row&&row.journeyType==='connection'?'connection':'direct',changes:Math.max(0,Number(row&&row.changes)||0),source:String(source||''),serviceKey:candidateServiceKey(row),route:savedTimelineFromCandidate(row)};}""",
    'saved route summary',
)
replace_once(
    core,
    "function cardMarkup(saved){const meta=ensureMeta(saved),resolved=meta.lastResolved||baselineFromSaved(saved,meta.source),live=state.live.get(saved.id),changes=Array.isArray(meta.changes)?meta.changes:[],busy=state.refreshing.has(saved.id),starting=state.starting.has(saved.id),sameActive=activeMatchesSaved(saved),startable=sameActive||canStartActiveSavedJourney(saved,meta,live),status=meta.status||'planned',times=`${resolved.departure||saved.scheduledDeparture||'—'} → ${resolved.arrival||saved.scheduledArrival||'—'}`,source=sourceLabel(resolved.source||meta.source),changeMarkup=changes.length?`<ul class=\"saved-v2-changes\">${changes.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class=\"saved-v2-nochange\">No timetable changes detected since this journey was saved.</p>',liveMarkup=liveText(live)?`<div class=\"saved-v2-live\">${esc(liveText(live))}</div>`:'',eventMarkup=savedEventMarkup(saved),actionMessage=state.actionMessages.get(saved.id)||'',error=meta.lastError||actionMessage?`<div class=\"saved-v2-error\">${esc(actionMessage||meta.lastError)}</div>`:'',followAction=startable?`<button type=\"button\" class=\"saved-v2-follow\" data-saved-v2-follow=\"${esc(saved.id)}\" aria-pressed=\"${sameActive?'true':'false'}\"${busy||starting?' disabled':''}>${sameActive?'Following live':starting?'Starting…':'Follow live here'}</button>`:'',activeAction=startable?`<button type=\"button\" class=\"saved-v2-active\" data-saved-v2-active=\"${esc(saved.id)}\"${busy||starting?' disabled':''}>${sameActive?'Open active journey':starting?'Starting…':'Start active journey'}</button>`:'';return `<article class=\"saved-v2-card\" data-saved-v2-id=\"${esc(saved.id)}\"><header><div><span class=\"saved-v2-date\">${esc(dateLabel(saved.date))}</span><h3>${esc(saved.from.name)} → ${esc(saved.to.name)}</h3></div>${statusMarkup(status)}</header><div class=\"saved-v2-times\"><strong>${esc(times)}</strong><span>${esc(source)}</span></div>${liveMarkup}${eventMarkup}<div class=\"saved-v2-intent\"><span>Saved plan</span><strong>${esc(intentLabel(saved))}</strong></div><div class=\"saved-v2-changes-wrap\"><span>Since you saved it</span>${changeMarkup}</div>${error}<footer><span>${esc(relativeCheck(meta.lastChecked))}${busy?' · Refreshing…':''}</span><div>${followAction}${activeAction}<button type=\"button\" data-saved-v2-open=\"${esc(saved.id)}\">Open in planner</button><button type=\"button\" data-saved-v2-refresh=\"${esc(saved.id)}\"${busy?' disabled':''}>Refresh now</button><button type=\"button\" class=\"saved-v2-remove\" data-saved-v2-remove=\"${esc(saved.id)}\">Remove</button></div></footer></article>`;}",
    """function savedTimelineMarkup(saved,resolved){const route=Array.isArray(resolved&&resolved.route)?resolved.route.filter(point=>point&&point.name):[];if(!route.length)return'';return `<div class=\"train-calling saved-v2-timeline\" data-saved-v2-timeline><div class=\"train-detail-title\">Journey timeline</div>${route.map(point=>`<div class=\"train-call ahead\"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.when||'')}</small></span></div>`).join('')}</div>`;}
function cardMarkup(saved){const meta=ensureMeta(saved),resolved=meta.lastResolved||baselineFromSaved(saved,meta.source),live=state.live.get(saved.id),changes=Array.isArray(meta.changes)?meta.changes:[],busy=state.refreshing.has(saved.id),starting=state.starting.has(saved.id),sameActive=activeMatchesSaved(saved),startable=sameActive||canStartActiveSavedJourney(saved,meta,live),status=meta.status||'planned',times=`${resolved.departure||saved.scheduledDeparture||'—'} → ${resolved.arrival||saved.scheduledArrival||'—'}`,source=sourceLabel(resolved.source||meta.source),changeMarkup=changes.length?`<ul class=\"saved-v2-changes\">${changes.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class=\"saved-v2-nochange\">No timetable changes detected since this journey was saved.</p>',liveMarkup=liveText(live)?`<div class=\"saved-v2-live\">${esc(liveText(live))}</div>`:'',eventMarkup=savedEventMarkup(saved),timelineMarkup=savedTimelineMarkup(saved,resolved),actionMessage=state.actionMessages.get(saved.id)||'',error=meta.lastError||actionMessage?`<div class=\"saved-v2-error\">${esc(actionMessage||meta.lastError)}</div>`:'',followAction=startable?`<button type=\"button\" class=\"saved-v2-follow\" data-saved-v2-follow=\"${esc(saved.id)}\" aria-pressed=\"${sameActive?'true':'false'}\"${busy||starting?' disabled':''}>${sameActive?'Following live':starting?'Starting…':'Follow live here'}</button>`:'',activeAction=startable?`<button type=\"button\" class=\"saved-v2-active\" data-saved-v2-active=\"${esc(saved.id)}\"${busy||starting?' disabled':''}>${sameActive?'Open active journey':starting?'Starting…':'Start active journey'}</button>`:'';return `<article class=\"saved-v2-card\" data-saved-v2-id=\"${esc(saved.id)}\"><header><div><span class=\"saved-v2-date\">${esc(dateLabel(saved.date))}</span><h3>${esc(saved.from.name)} → ${esc(saved.to.name)}</h3></div>${statusMarkup(status)}</header><div class=\"saved-v2-times\"><strong>${esc(times)}</strong><span>${esc(source)}</span></div>${liveMarkup}${eventMarkup}${timelineMarkup}<div class=\"saved-v2-intent\"><span>Saved plan</span><strong>${esc(intentLabel(saved))}</strong></div><div class=\"saved-v2-changes-wrap\"><span>Since you saved it</span>${changeMarkup}</div>${error}<footer><span>${esc(relativeCheck(meta.lastChecked))}${busy?' · Refreshing…':''}</span><div>${followAction}${activeAction}<button type=\"button\" data-saved-v2-open=\"${esc(saved.id)}\">Open in planner</button><button type=\"button\" data-saved-v2-refresh=\"${esc(saved.id)}\"${busy?' disabled':''}>Refresh now</button><button type=\"button\" class=\"saved-v2-remove\" data-saved-v2-remove=\"${esc(saved.id)}\">Remove</button></div></footer></article>`;}""",
    'saved timeline card markup',
)

# ---------------------------------------------------------------------------
# Give every progress timeline a bounded vertical viewport and centre a new
# live marker only once per movement update. Earlier stops remain above it and
# can always be reached by scrolling instead of being clipped out of the card.
# Also decorate the Saved journeys timeline with the same live progress UI.
# ---------------------------------------------------------------------------
replace_once(
    movement,
    "function timelineMinute(value,startMinute){const match=text(value).match(/^(\\d{1,2}):(\\d{2})$/);if(!match)return Number.POSITIVE_INFINITY;let minute=Number(match[1])*60+Number(match[2]);if(Number.isFinite(startMinute)&&minute<startMinute-720)minute+=1440;return minute;}",
    """function focusTimelineCurrent(calling){
  if(!calling)return;const current=calling.querySelector('[data-train-progress-marker],.progress-current');if(!current)return;const signature=`${calling.dataset.trainProgressSignature||''}|${text(current.textContent)}`;if(calling.dataset.trainProgressFocus===signature)return;calling.dataset.trainProgressFocus=signature;
  const apply=()=>{if(!calling.isConnected||calling.scrollHeight<=calling.clientHeight+4)return;const target=Math.max(0,current.offsetTop-Math.round(calling.clientHeight*.42));calling.scrollTop=target;};
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(apply);else setTimeout(apply,0);
}
function timelineMinute(value,startMinute){const match=text(value).match(/^(\\d{1,2}):(\\d{2})$/);if(!match)return Number.POSITIVE_INFINITY;let minute=Number(match[1])*60+Number(match[2]);if(Number.isFinite(startMinute)&&minute<startMinute-720)minute+=1440;return minute;}""",
    'timeline focus helper',
)
replace_once(
    movement,
    "  return decorateCallingTimeline(calling,leg,snapshot,{startName:start,startTime:serviceStartTime(leg)});",
    "  const decorated=decorateCallingTimeline(calling,leg,snapshot,{startName:start,startTime:serviceStartTime(leg)});if(decorated)focusTimelineCurrent(calling);return decorated;",
    'planner timeline focus',
)
replace_once(
    movement,
    "    const detail=article.querySelector('.train-service-detail'),leg=firstLeg(service),detailCache=api&&api.state&&api.state.detailCache instanceof Map?api.state.detailCache.get(key):null,calling=ensureBoardTimeline(detail,leg,detailCache),timeline=decorateCallingTimeline(calling,leg,snapshot,{startName:serviceStartName(service,api,boardId,snapshot),startTime:serviceStartTime(leg)});",
    "    const detail=article.querySelector('.train-service-detail'),leg=firstLeg(service),detailCache=api&&api.state&&api.state.detailCache instanceof Map?api.state.detailCache.get(key):null,calling=ensureBoardTimeline(detail,leg,detailCache),timeline=decorateCallingTimeline(calling,leg,snapshot,{startName:serviceStartName(service,api,boardId,snapshot),startTime:serviceStartTime(leg)});if(timeline)focusTimelineCurrent(calling);",
    'board timeline focus',
)
replace_once(
    movement,
    """function decorateSaved(){
  const api=window.__KERBSIDE_JOURNEY_PLANNER__;if(!api||typeof api.readSavedJourneys!=='function')return;
  const byId=new Map((api.readSavedJourneys()||[]).map(item=>[String(item.id),item]));
  const savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__;
  for(const card of document.querySelectorAll('[data-saved-v2-id]')){
    const saved=byId.get(String(card.getAttribute('data-saved-v2-id'))),snapshot=saved&&isToday(saved.date)?savedSelectorMovement(saved,saved.date):null,info=progress(snapshot),following=!!(saved&&savedApi&&typeof savedApi.activeMatchesSaved==='function'&&savedApi.activeMatchesSaved(saved));let node=card.querySelector(':scope > .saved-movement-inline');
    ensureCard(card,snapshot,{compact:true});
    if(!info){if(node)node.remove();continue;}if(!node){node=document.createElement('div');node.className='saved-movement-inline';const times=card.querySelector('.saved-v2-times');(times||card.firstElementChild)?.insertAdjacentElement('afterend',node);}node.className=`saved-movement-inline movement-${info.tone}`;setText(node,info.short);
  }
}
""",
    """function decorateSaved(){
  const api=window.__KERBSIDE_JOURNEY_PLANNER__;if(!api||typeof api.readSavedJourneys!=='function')return;
  const byId=new Map((api.readSavedJourneys()||[]).map(item=>[String(item.id),item]));
  const savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__;
  for(const card of document.querySelectorAll('[data-saved-v2-id]')){
    const saved=byId.get(String(card.getAttribute('data-saved-v2-id'))),snapshot=saved&&isToday(saved.date)?savedSelectorMovement(saved,saved.date):null,info=progress(snapshot),following=!!(saved&&savedApi&&typeof savedApi.activeMatchesSaved==='function'&&savedApi.activeMatchesSaved(saved));let node=card.querySelector(':scope > .saved-movement-inline');
    const calling=card.querySelector(':scope > [data-saved-v2-timeline]'),timeline=!!calling;if(calling&&saved&&isToday(saved.date)){decorateCallingTimeline(calling,null,snapshot,{startName:'',startTime:saved.scheduledDeparture||''});focusTimelineCurrent(calling);}
    ensureCard(card,timeline?null:snapshot,{compact:true});
    if(!info){if(node)node.remove();continue;}if(!node){node=document.createElement('div');node.className='saved-movement-inline';const times=card.querySelector('.saved-v2-times');(times||card.firstElementChild)?.insertAdjacentElement('afterend',node);}node.className=`saved-movement-inline movement-${info.tone}`;setText(node,info.short);
  }
}
""",
    'saved live timeline decoration',
)
replace_once(
    movement,
    """function decorateActive(){
  const active=window.__KERBSIDE_ACTIVE_JOURNEY__?.state?.active,root=document.getElementById('trainActiveJourney');if(!root||!active||!isToday(active.date))return;
  const services=active.journeyType==='connection'?[active.first,active.onward]:[active.service];const snapshot=services.map(service=>movementFor(service,active.date)).find(Boolean);ensureCard(root,snapshot);
}
""",
    """function decorateActive(){
  const active=window.__KERBSIDE_ACTIVE_JOURNEY__?.state?.active,root=document.getElementById('trainActiveJourney');if(!root||!active||!isToday(active.date))return;
  const services=active.journeyType==='connection'?[active.first,active.onward]:[active.service],service=services.find(Boolean),snapshot=services.map(item=>movementFor(item,active.date)).find(Boolean),calling=root.querySelector('.train-calling');const timeline=calling?decorateCallingTimeline(calling,service,snapshot,{startName:serviceStartName(service,null,'',snapshot),startTime:serviceStartTime(service)}):false;if(timeline)focusTimelineCurrent(calling);ensureCard(root,timeline?null:snapshot);
}
""",
    'active journey timeline focus',
)
replace_once(
    movement,
    ".train-calling.train-live-progress{padding-bottom:6px}.train-live-progress .train-detail-title{display:flex;align-items:center;justify-content:space-between;gap:10px}",
    ".train-calling.train-live-progress{padding-bottom:6px}.train-calling.train-live-progress,.saved-v2-timeline{max-height:min(52vh,430px);overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding-right:6px}.saved-v2-timeline{margin:2px 0 1px;padding-top:8px;border-top:1px solid var(--rule)}.train-live-progress .train-detail-title{display:flex;align-items:center;justify-content:space-between;gap:10px}",
    'scrollable timeline styles',
)
replace_once(
    movement,
    "@media(max-width:820px){.train-movement-card{padding:9px;margin-bottom:8px}.train-movement-inline{font-size:8.5px}.train-progress-generated{padding:9px}.train-progress-marker small{font-size:9px}}",
    "@media(max-width:820px){.train-movement-card{padding:9px;margin-bottom:8px}.train-movement-inline{font-size:8.5px}.train-progress-generated{padding:9px}.train-progress-marker small{font-size:9px}.train-calling.train-live-progress,.saved-v2-timeline{max-height:min(46vh,360px)}}",
    'mobile timeline height',
)

# ---------------------------------------------------------------------------
# Browser regressions: save at a desktop viewport, prove the Saved journeys
# card receives a complete route, prove the timeline is scrollable, and make
# non-football calendar/event behaviour explicit alongside the football tests.
# ---------------------------------------------------------------------------
planner_test = 'kerbside-backend/tests/train-journey-planner-regression.mjs'
replace_once(
    planner_test,
    "{serviceID:'PLAN-QUIET',uid:'UID-QUIET',trainId:'1Q10',std:'09:10',arrival:'10:15',departureMinute:550,arrivalMinute:615,totalMinutes:65,changes:0,journeyType:'direct',operator:'Quiet Rail',platform:'6',arrivalPlatform:'10',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}},",
    "{serviceID:'PLAN-QUIET',uid:'UID-QUIET',trainId:'1Q10',std:'09:10',arrival:'10:15',departureMinute:550,arrivalMinute:615,totalMinutes:65,changes:0,journeyType:'direct',operator:'Quiet Rail',platform:'6',arrivalPlatform:'10',origin:[{locationName:'Wolverhampton',crs:'WVH'}],previousCallingPoints:[{callingPoint:[{locationName:'Wolverhampton',crs:'WVH',st:'08:38'},{locationName:'Sandwell & Dudley',crs:'SAD',st:'08:55'}]}],subsequentCallingPoints:[{callingPoint:[{locationName:'University',crs:'UNI',st:'09:18'},{locationName:'Cheltenham Spa',crs:'CNM',st:'09:48'},{locationName:'Bristol Temple Meads',crs:'BRI',st:'10:15'}]}],from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}},",
    'saved timeline test candidate',
)
replace_once(
    planner_test,
    "  const quietCard=page.locator('#planJourneyResults .plan-journey-result').filter({hasText:'Quiet Rail'});\n  const immediateSave=await quietCard.locator('[data-plan-save-key]').evaluate(button=>{button.click();let stored=[];try{stored=JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]');}catch{}return {stored:stored.length,workspace:window.__KERBSIDE_SAVED_JOURNEYS_V2__?.state?.saved?.length||0,label:(button.textContent||'').trim()};});",
    "  await page.setViewportSize({width:1280,height:900});\n  const quietCard=page.locator('#planJourneyResults .plan-journey-result').filter({hasText:'Quiet Rail'});\n  const immediateSave=await quietCard.locator('[data-plan-save-key]').evaluate(button=>{button.click();let stored=[];try{stored=JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]');}catch{}return {stored:stored.length,workspace:window.__KERBSIDE_SAVED_JOURNEYS_V2__?.state?.saved?.length||0,label:(button.textContent||'').trim()};});",
    'desktop save viewport',
)
replace_once(
    planner_test,
    """  assert.equal(initialMeta.baseline.source,'network-rail');
  assert.doesNotMatch(JSON.stringify(initialMeta),/probabilities|reasons|liveEvidence/i,'Saved Journeys v2 metadata must not persist Forecast/live evidence');

  const lifecycle=await page.evaluate(()=>{
""",
    """  assert.equal(initialMeta.baseline.source,'network-rail');
  assert.doesNotMatch(JSON.stringify(initialMeta),/probabilities|reasons|liveEvidence/i,'Saved Journeys v2 metadata must not persist Forecast/live evidence');
  const savedTimeline=await page.locator('#savedJourneyList [data-saved-v2-timeline]').evaluate(node=>({text:node.textContent||'',overflowY:getComputedStyle(node).overflowY,maxHeight:getComputedStyle(node).maxHeight}));
  assert.match(savedTimeline.text,/Wolverhampton/,'Saved journeys should retain the service route before the selected boarding station');
  assert.match(savedTimeline.text,/Sandwell & Dudley/,'Saved journeys should show earlier calling points');
  assert.match(savedTimeline.text,/Bristol Temple Meads/,'Saved journeys should show the saved destination in the route timeline');
  assert.equal(savedTimeline.overflowY,'auto','Saved journey timelines should scroll vertically when their route exceeds the available height');
  assert.notEqual(savedTimeline.maxHeight,'none','Saved journey timelines should have a bounded vertical height');
  await page.setViewportSize({width:390,height:844});

  const lifecycle=await page.evaluate(()=>{
""",
    'saved timeline desktop assertions',
)
replace_once(
    planner_test,
    """  assert.ok(eventForecast.reasons.some(reason=>/Birmingham Arena Concert/.test(reason)),`forecast should name the contributing event: ${JSON.stringify(eventForecast)}`);

  const bristolFixture=await page.evaluate(async()=>{
""",
    """  assert.ok(eventForecast.reasons.some(reason=>/Birmingham Arena Concert/.test(reason)),`forecast should name the contributing event: ${JSON.stringify(eventForecast)}`);

  const nonFootballSignals=await page.evaluate(()=>{
    const forecast=window.__KERBSIDE_FORECAST_V4__,events=window.__KERBSIDE_EVENTS__,station={name:'Birmingham New Street',crs:'BHM'};
    const bank=forecast.calendarSignal(new Date('2026-08-31T12:00:00'),600,station);
    const cricket=events.normalise({title:'Edgbaston cricket match',place:'Edgbaston, Birmingham',startTime:'15:00',endTime:'20:30',attendance:25000,confidence:.8,type:'cricket',source:'Wikidata (CC0)'});
    const university=events.normalise({title:'University of Birmingham graduation',place:'University of Birmingham, Birmingham',startTime:'11:00',endTime:'16:30',attendance:6000,confidence:.75,type:'university',source:'Wikidata (CC0)'});
    const journey={origin:'Birmingham New Street',originCrs:'BHM',destination:'Bristol Temple Meads',destinationCrs:'BRI',interchanges:[]};
    return {bank,cricket:events.relevance(cricket,{std:'21:15'},journey),university:events.relevance(university,{std:'17:10'},journey)};
  });
  assert.ok(nonFootballSignals.bank.amount>0&&nonFootballSignals.bank.reasons.some(reason=>/bank-holiday/i.test(reason)),`England/Wales summer bank holiday should contribute calendar pressure: ${JSON.stringify(nonFootballSignals.bank)}`);
  assert.ok(nonFootballSignals.cricket&&nonFootballSignals.cricket.amount>0,`a venue/date cricket event should use the generic Wikidata event-pressure path: ${JSON.stringify(nonFootballSignals.cricket)}`);
  assert.ok(nonFootballSignals.university&&nonFootballSignals.university.amount>0,`a venue/date university event should use the generic Wikidata event-pressure path: ${JSON.stringify(nonFootballSignals.university)}`);

  const bristolFixture=await page.evaluate(async()=>{
""",
    'non-football event regressions',
)

movement_test = 'kerbside-backend/tests/train-movement-browser-regression.mjs'
replace_once(
    movement_test,
    """  assert.match(restoredRoute,/Bristol Temple Meads/i,'cached future calling points should be restored after rerender');
""",
    """  assert.match(restoredRoute,/Bristol Temple Meads/i,'cached future calling points should be restored after rerender');
  const timelineScroll=await page.locator('#trainBoard .train-calling').evaluate(node=>({overflowY:getComputedStyle(node).overflowY,maxHeight:getComputedStyle(node).maxHeight,names:[...node.querySelectorAll('.train-call b')].map(item=>(item.textContent||'').trim())}));
  assert.equal(timelineScroll.overflowY,'auto','live route timeline should be vertically scrollable');
  assert.notEqual(timelineScroll.maxHeight,'none','live route timeline should be height-bounded');
  assert.ok(timelineScroll.names.indexOf('Wolverhampton')>=0&&timelineScroll.names.indexOf('Wolverhampton')<timelineScroll.names.findIndex(name=>/Between Birmingham New Street and University/i.test(name)),`previous calling points should remain above the current train marker: ${JSON.stringify(timelineScroll.names)}`);
""",
    'movement scroll and order assertions',
)

print('Extended Kerbside 0.9.44 with saved journey timelines, full timetable routes, scrollable live progress and non-football signal regressions.')
