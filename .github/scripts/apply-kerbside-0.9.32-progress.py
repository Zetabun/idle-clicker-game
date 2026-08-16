#!/usr/bin/env python3
from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)

movement_path = Path('kerbside-train-movement.js')
movement = movement_path.read_text(encoding='utf-8')

movement = replace_once(
    movement,
    "function setText(node,value){if(node&&node.textContent!==value)node.textContent=value;}\nfunction ensureInline(article,info){",
    r'''function setText(node,value){if(node&&node.textContent!==value)node.textContent=value;}
const TRAIN_PROGRESS_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3.5h10a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/><path d="M8 7h8M8 11h8M8 18l-2 2M16 18l2 2"/><circle cx="8.5" cy="15" r="1"/><circle cx="15.5" cy="15" r="1"/></svg>';
function normalisePlace(value){return text(value).toLowerCase().replace(/&/g,' and ').replace(/\b(?:railway|rail)\s+station\b/g,' ').replace(/\bstation\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();}
function locationTokens(location){const values=[location&&location.crs,location&&location.name,location&&location.tiploc].map(normalisePlace).filter(Boolean);return [...new Set(values)];}
function rowPlace(row){return normalisePlace(row&&row.querySelector('b')&&row.querySelector('b').textContent);}
function rowMatchesLocation(row,location){const key=rowPlace(row),tokens=locationTokens(location);if(!key||!tokens.length)return false;if(tokens.includes(key))return true;return tokens.some(token=>token.length>=4&&key.length>=4&&(token.includes(key)||key.includes(token)));}
function firstLeg(service){return service&&service.journeyType==='connection'&&Array.isArray(service.legs)&&service.legs[0]?service.legs[0]:service;}
function serviceStartName(service,api,boardId,snapshot){const leg=firstLeg(service);if(boardId==='trainBoard'){const station=api&&api.state&&api.state.station;const label=text(station&&(station.name||station.crs));if(label)return label;}return text(leg&&leg.from&&(leg.from.name||leg.from.locationName||leg.from.crs)||snapshot&&snapshot.activation&&snapshot.activation.origin&&(snapshot.activation.origin.name||snapshot.activation.origin.crs));}
function serviceStartTime(service){const leg=firstLeg(service);return text(leg&&(leg.std||leg.departure));}
function serviceEndName(service){const leg=firstLeg(service),destination=Array.isArray(leg&&leg.destination)&&leg.destination[0];return text(leg&&leg.to&&(leg.to.name||leg.to.locationName||leg.to.crs)||leg&&leg.routeDestination&&(leg.routeDestination.name||leg.routeDestination.locationName||leg.routeDestination.crs)||destination&&(destination.name||destination.locationName||destination.crs));}
function serviceEndTime(service){const leg=firstLeg(service);return text(leg&&leg.arrival);}
function timelineEventMeta(snapshot,event){const bits=[],actual=timeLabel(event&&event.actualTimestamp),variation=variationLabel(event),age=ageLabel(snapshot);if(actual)bits.push(`${event&&event.eventType==='ARRIVAL'?'Arrived':event&&event.eventType==='DEPARTURE'?'Departed':'Reported'} ${actual}`);if(variation)bits.push(variation);if(age)bits.push(`${snapshot&&snapshot.stale?'Last report':'Feed'} ${age}`);return bits.join(' · ');}
function timelineSourceRows(calling){return [...calling.querySelectorAll('.train-call')].filter(row=>!row.hasAttribute('data-train-progress-marker')&&!row.hasAttribute('data-train-progress-origin'));}
function timelineSignature(calling,snapshot,startName,startTime){const rows=timelineSourceRows(calling).map(row=>`${rowPlace(row)}|${text(row.querySelector('small')&&row.querySelector('small').textContent)}`).join('||'),event=snapshot&&snapshot.lastEvent,ageBucket=snapshot?Math.floor((ageSeconds(snapshot)||0)/15):0;return [rows,normalisePlace(startName),startTime,snapshot&&snapshot.status,snapshot&&snapshot.stale?'stale':'live',snapshot&&snapshot.updatedAt,event&&event.eventType,locationLabel(event&&event.location),locationLabel(event&&event.nextLocation),event&&event.actualTimestamp,ageBucket].join('|');}
function setProgressClass(row,value){row.classList.remove('progress-complete','progress-current','progress-future');if(value)row.classList.add(value);}
function makeProgressOrigin(name,time){const row=document.createElement('div');row.className='train-call progress-origin';row.setAttribute('data-train-progress-origin','');row.innerHTML=`<i></i><span><b>${esc(name)}</b><small>${time?`Scheduled ${esc(time)}`:'Journey start'}</small></span>`;return row;}
function makeProgressMarker(snapshot,event){const tone=snapshot&&snapshot.stale?'stale':'live',where=locationLabel(event&&event.location),next=event&&event.nextLocation&&locationLabel(event.nextLocation),arrival=event&&event.eventType==='ARRIVAL',between=event&&event.eventType==='DEPARTURE'&&next,title=arrival?`At ${where}`:between?`Between ${where} and ${next}`:`Last confirmed at ${where}`,meta=[timelineEventMeta(snapshot,event),between?'Estimated between Network Rail reports · not GPS':''].filter(Boolean).join(' · '),row=document.createElement('div');row.className=`train-call train-progress-marker progress-current movement-${tone}`;row.setAttribute('data-train-progress-marker','');row.innerHTML=`<i class="train-progress-vehicle">${TRAIN_PROGRESS_ICON}</i><span><b>${esc(title)}</b><small>${esc(meta)}</small></span>`;return row;}
function decorateCallingTimeline(calling,service,snapshot,{startName='',startTime=''}={}){
  if(!calling)return false;
  const sourceRows=timelineSourceRows(calling);if(!sourceRows.length&&!startName)return false;
  const signature=timelineSignature(calling,snapshot,startName,startTime);if(calling.dataset.trainProgressSignature===signature)return true;
  calling.dataset.trainProgressSignature=signature;calling.classList.add('train-live-progress');
  calling.querySelectorAll('[data-train-progress-marker],[data-train-progress-origin]').forEach(node=>node.remove());
  sourceRows.forEach(row=>{setProgressClass(row,row.classList.contains('passed')?'progress-complete':'progress-future');row.querySelectorAll('.train-progress-now').forEach(node=>node.remove());});
  let title=calling.querySelector('.train-detail-title');if(!title){title=document.createElement('div');title.className='train-detail-title';calling.prepend(title);}title.textContent=snapshot?'Live journey progress':'Journey progress';
  const badge=document.createElement('span');badge.className=`train-progress-badge ${snapshot&&snapshot.stale?'is-stale':snapshot?'is-live':'is-idle'}`;badge.setAttribute('data-train-progress-badge','');badge.textContent=snapshot?(snapshot.stale?'NR last confirmed':'NR live'):'Live position unavailable';title.appendChild(badge);
  let origin=null;if(startName&&(!sourceRows[0]||normalisePlace(startName)!==rowPlace(sourceRows[0]))){origin=makeProgressOrigin(startName,startTime);title.insertAdjacentElement('afterend',origin);}
  const rows=[...(origin?[origin]:[]),...sourceRows],event=snapshot&&snapshot.lastEvent;
  if(!snapshot||!event){if(origin)setProgressClass(origin,'progress-future');return true;}
  const eventIndex=rows.findIndex(row=>rowMatchesLocation(row,event.location)),nextIndex=rows.findIndex(row=>rowMatchesLocation(row,event.nextLocation));
  if(eventIndex>=0){
    rows.forEach((row,index)=>setProgressClass(row,index<eventIndex?'progress-complete':index>eventIndex?'progress-future':''));
    if(event.eventType==='ARRIVAL'&&!event.terminated&&snapshot.status!=='terminated'){
      setProgressClass(rows[eventIndex],'progress-current');const now=document.createElement('em');now.className='train-progress-now';now.textContent=`${snapshot.stale?'Last confirmed here':'Train here'}${timelineEventMeta(snapshot,event)?` · ${timelineEventMeta(snapshot,event)}`:''}`;rows[eventIndex].querySelector('span')?.appendChild(now);return true;
    }
    setProgressClass(rows[eventIndex],'progress-complete');
  }
  const marker=makeProgressMarker(snapshot,event);
  if(eventIndex>=0)rows[eventIndex].insertAdjacentElement('afterend',marker);
  else{
    const completed=rows.filter(row=>row.classList.contains('progress-complete'));
    if(completed.length)completed[completed.length-1].insertAdjacentElement('afterend',marker);
    else if(nextIndex>=0&&rows[nextIndex])calling.insertBefore(marker,rows[0]||null);
    else calling.insertBefore(marker,rows[0]||null);
  }
  return true;
}
function flattenTimelinePoints(service){
  const leg=firstLeg(service),points=[];
  const add=value=>{for(const group of Array.isArray(value)?value:[]){const rows=Array.isArray(group&&group.callingPoint)?group.callingPoint:Array.isArray(group&&group.callingPoints)?group.callingPoints:[group];for(const point of rows){if(!point)continue;const name=text(point.locationName||point.name||point.stationName||point.crs),when=text(point.et||point.eta||point.etd||point.st||point.sta||point.std);if(name)points.push({name,when,cancelled:!!point.isCancelled});}}};
  add(leg&&leg.subsequentCallingPoints);add(leg&&leg.callingPoints);
  const end=serviceEndName(leg),endTime=serviceEndTime(leg);if(end&&!points.some(point=>normalisePlace(point.name)===normalisePlace(end)))points.push({name:end,when:endTime,cancelled:false});
  const seen=new Set();return points.filter(point=>{const key=normalisePlace(point.name);if(!key||seen.has(key))return false;seen.add(key);return true;}).slice(0,18);
}
function ensurePlannerTimeline(container,candidate,snapshot){
  if(!container)return false;let calling=container.querySelector(':scope > [data-train-progress-planner]');if(!snapshot){if(calling)calling.remove();return false;}
  const leg=firstLeg(candidate),points=flattenTimelinePoints(leg);if(!leg||!points.length)return false;
  if(!calling){calling=document.createElement('div');calling.className='train-calling train-progress-generated';calling.setAttribute('data-train-progress-planner','');container.prepend(calling);}
  const sourceSignature=points.map(point=>`${normalisePlace(point.name)}|${point.when}|${point.cancelled}`).join('||');
  if(calling.dataset.trainProgressSource!==sourceSignature){calling.dataset.trainProgressSource=sourceSignature;calling.dataset.trainProgressSignature='';calling.innerHTML=`<div class="train-detail-title">Journey progress</div>${points.map(point=>`<div class="train-call ahead${point.cancelled?' cancelled':''}"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.when)}${point.cancelled?' · cancelled':''}</small></span></div>`).join('')}`;}
  const start=text(leg&&leg.from&&(leg.from.name||leg.from.locationName||leg.from.crs)||window.__KERBSIDE_JOURNEY_PLANNER__?.planState?.from?.name||snapshot&&snapshot.activation&&snapshot.activation.origin&&snapshot.activation.origin.name);
  return decorateCallingTimeline(calling,leg,snapshot,{startName:start,startTime:serviceStartTime(leg)});
}
function ensureInline(article,info){''',
    'movement timeline helpers'
)

movement = replace_once(
    movement,
    r'''function decorateBoard(api,boardId,services,date){
  const board=document.getElementById(boardId);if(!api||!board||!isToday(date))return;
  services.forEach((service,index)=>{
    const key=typeof api.serviceKey==='function'?api.serviceKey(service,index):'';if(!key)return;
    const article=articleFor(board,key),snapshot=attachMovement(service,date),info=progress(snapshot);if(!article)return;
    ensureInline(article,info);ensureCard(article.querySelector('.train-service-detail'),snapshot);
  });
}''',
    r'''function decorateBoard(api,boardId,services,date){
  const board=document.getElementById(boardId);if(!api||!board||!isToday(date))return;
  services.forEach((service,index)=>{
    const key=typeof api.serviceKey==='function'?api.serviceKey(service,index):'';if(!key)return;
    const article=articleFor(board,key),snapshot=service&&service.journeyType==='connection'?primaryMovement(service,date):attachMovement(service,date),info=progress(snapshot);if(!article)return;
    const detail=article.querySelector('.train-service-detail'),leg=firstLeg(service),timeline=decorateCallingTimeline(detail&&detail.querySelector('.train-calling'),leg,snapshot,{startName:serviceStartName(service,api,boardId,snapshot),startTime:serviceStartTime(leg)});
    ensureInline(article,info);ensureCard(detail,timeline?null:snapshot);
  });
}''',
    'decorateBoard'
)

movement = replace_once(
    movement,
    r'''function decoratePlanner(){
  const api=window.__KERBSIDE_JOURNEY_PLANNER__,date=plannerDate();if(!api||!isToday(date))return;
  const rows=api.planState?.results||[],list=document.getElementById('planJourneyResults');if(!list)return;
  for(const article of list.querySelectorAll('.plan-journey-result')){
    const rank=Number(article.getAttribute('data-plan-rank'))||0,candidate=rank?rows[rank-1]:null;if(!candidate)continue;
    const snapshot=primaryMovement(candidate,date),info=progress(snapshot);let inline=article.querySelector(':scope > .plan-movement-inline');
    if(!info){if(inline)inline.remove();continue;}
    if(!inline){inline=document.createElement('div');inline.className='plan-movement-inline';const route=article.querySelector('.plan-result-route');(route||article.firstElementChild)?.insertAdjacentElement('afterend',inline);}
    inline.className=`plan-movement-inline movement-${info.tone}`;setText(inline,info.short);ensureCard(article.querySelector('.plan-details-body'),snapshot,{compact:true});
  }
}''',
    r'''function decoratePlanner(){
  const api=window.__KERBSIDE_JOURNEY_PLANNER__,date=plannerDate();if(!api||!isToday(date))return;
  const rows=api.planState?.results||[],list=document.getElementById('planJourneyResults');if(!list)return;
  for(const article of list.querySelectorAll('.plan-journey-result')){
    const rank=Number(article.getAttribute('data-plan-rank'))||0,candidate=rank?rows[rank-1]:null;if(!candidate)continue;
    const snapshot=primaryMovement(candidate,date),info=progress(snapshot);let inline=article.querySelector(':scope > .plan-movement-inline');
    if(!info){if(inline)inline.remove();ensurePlannerTimeline(article.querySelector('.plan-details-body'),candidate,null);continue;}
    if(!inline){inline=document.createElement('div');inline.className='plan-movement-inline';const route=article.querySelector('.plan-result-route');(route||article.firstElementChild)?.insertAdjacentElement('afterend',inline);}
    inline.className=`plan-movement-inline movement-${info.tone}`;setText(inline,info.short);const body=article.querySelector('.plan-details-body'),timeline=ensurePlannerTimeline(body,candidate,snapshot);ensureCard(body,timeline?null:snapshot,{compact:true});
  }
}''',
    'decoratePlanner'
)

movement = replace_once(
    movement,
    r'''.plan-movement-inline,.saved-movement-inline{padding:6px 8px;border:1px solid rgb(var(--live-rgb) / .2);border-radius:7px;background:rgb(var(--live-rgb) / .05);color:var(--live);font-size:9px;font-weight:800}.plan-movement-inline{grid-column:1/-1}.saved-movement-inline{margin-top:-3px}.plan-movement-inline.movement-stale,.saved-movement-inline.movement-stale{border-color:var(--rule);background:var(--ink-3)}.plan-movement-inline.movement-warn,.saved-movement-inline.movement-warn{border-color:rgb(var(--warn-rgb) / .25);background:rgb(var(--warn-rgb) / .05)}
@media(max-width:820px){.train-movement-card{padding:9px;margin-bottom:8px}.train-movement-inline{font-size:8.5px}}''',
    r'''.plan-movement-inline,.saved-movement-inline{padding:6px 8px;border:1px solid rgb(var(--live-rgb) / .2);border-radius:7px;background:rgb(var(--live-rgb) / .05);color:var(--live);font-size:9px;font-weight:800}.plan-movement-inline{grid-column:1/-1}.saved-movement-inline{margin-top:-3px}.plan-movement-inline.movement-stale,.saved-movement-inline.movement-stale{border-color:var(--rule);background:var(--ink-3)}.plan-movement-inline.movement-warn,.saved-movement-inline.movement-warn{border-color:rgb(var(--warn-rgb) / .25);background:rgb(var(--warn-rgb) / .05)}
.train-calling.train-live-progress{padding-bottom:6px}.train-live-progress .train-detail-title{display:flex;align-items:center;justify-content:space-between;gap:10px}.train-progress-badge{flex:0 0 auto;padding:3px 6px;border:1px solid var(--rule);border-radius:999px;color:var(--text-mute);font-size:7.5px;letter-spacing:.06em;text-transform:uppercase}.train-progress-badge.is-live{border-color:rgb(var(--live-rgb) / .28);background:rgb(var(--live-rgb) / .07);color:var(--live)}.train-progress-badge.is-stale{background:var(--ink-3);color:var(--text-dim)}
.train-live-progress .train-call{min-height:42px}.train-live-progress .train-call.progress-complete>i{background:var(--live);opacity:.78}.train-live-progress .train-call.progress-complete:before{background:rgb(var(--live-rgb) / .42)}.train-live-progress .train-call.progress-future>i{box-sizing:border-box;border:2px solid var(--text-mute);background:var(--ink-2)}.train-live-progress .train-call.progress-current>i:not(.train-progress-vehicle){width:11px;height:11px;margin-top:2px;margin-left:-2px;background:var(--live);box-shadow:0 0 0 3px var(--ink-2),0 0 0 6px rgb(var(--live-rgb) / .12)}
.train-progress-marker{min-height:54px!important;align-items:flex-start}.train-progress-marker:before{top:25px!important}.train-progress-marker>i.train-progress-vehicle{display:grid;place-items:center;flex:0 0 auto;width:24px;height:24px;margin:-2px 0 0 -6px;border-radius:50%;background:var(--live);box-shadow:0 0 0 3px var(--ink-2),0 0 0 6px rgb(var(--live-rgb) / .13);opacity:1}.train-progress-marker>i.train-progress-vehicle svg{width:14px;height:14px;fill:none;stroke:var(--ink);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.train-progress-marker.movement-stale>i.train-progress-vehicle{background:var(--text-dim);box-shadow:0 0 0 3px var(--ink-2)}.train-progress-marker b{color:var(--live)!important;font-weight:800!important}.train-progress-marker.movement-stale b{color:var(--text-dim)!important}.train-progress-marker small{max-width:48rem;line-height:1.45}.train-progress-now{display:block;margin-top:3px;color:var(--live);font-size:9px;font-style:normal;font-weight:700;line-height:1.35}.train-progress-generated{margin:2px 0 10px;padding:10px 11px;border:1px solid rgb(var(--live-rgb) / .22);border-radius:10px;background:rgb(var(--live-rgb) / .035)}
@media(max-width:820px){.train-movement-card{padding:9px;margin-bottom:8px}.train-movement-inline{font-size:8.5px}.train-progress-generated{padding:9px}.train-progress-marker small{font-size:9px}}''',
    'movement progress styles'
)

movement = replace_once(
    movement,
    "window.__KERBSIDE_TRAIN_MOVEMENT__={version:VERSION,state,install,stop,refresh,decorate,refsFor,movementFor,attachMovement,attachJourney,progress,API_BASE};",
    "window.__KERBSIDE_TRAIN_MOVEMENT__={version:VERSION,state,install,stop,refresh,decorate,refsFor,movementFor,attachMovement,attachJourney,progress,decorateCallingTimeline,ensurePlannerTimeline,API_BASE};",
    'movement public API'
)
movement_path.write_text(movement, encoding='utf-8')

# Strengthen the existing live movement browser regression around the new timeline.
test_path = Path('kerbside-backend/tests/train-movement-browser-regression.mjs')
test = test_path.read_text(encoding='utf-8')

test = replace_once(
    test,
    "    document.getElementById('trainBoard').innerHTML=`<article class=\"train-service open\" data-service-id=\"${liveKey}\"><button class=\"train-service-summary\"><span class=\"train-route\"><strong>Bristol Temple Meads</strong><small>CrossCountry · Platform 11</small></span></button><div class=\"train-service-detail\"></div></article>`;",
    "    document.getElementById('trainBoard').innerHTML=`<article class=\"train-service open\" data-service-id=\"${liveKey}\"><button class=\"train-service-summary\"><span class=\"train-route\"><strong>Bristol Temple Meads</strong><small>CrossCountry · Platform 11</small></span></button><div class=\"train-service-detail\"><div class=\"train-calling\"><div class=\"train-detail-title\">Calling points</div><div class=\"train-call ahead\"><i></i><span><b>University</b><small>20:20</small></span></div><div class=\"train-call ahead\"><i></i><span><b>Selly Oak</b><small>20:24</small></span></div></div></div></article>`;",
    'live calling fixture'
)

test = replace_once(
    test,
    "    scheduledBoard.innerHTML=`<article class=\"train-service train-scheduled-service open\" data-service-id=\"${scheduledKey}\"><button class=\"train-service-summary\"><span class=\"train-route\"><strong>Bristol Temple Meads</strong><small>CrossCountry · arr 21:33</small></span></button><div class=\"train-service-detail\"></div></article>`;",
    "    scheduledBoard.innerHTML=`<article class=\"train-service train-scheduled-service open\" data-service-id=\"${scheduledKey}\"><button class=\"train-service-summary\"><span class=\"train-route\"><strong>Bristol Temple Meads</strong><small>CrossCountry · arr 21:33</small></span></button><div class=\"train-service-detail\"><div class=\"train-calling\"><div class=\"train-detail-title\">First-leg calling points</div><div class=\"train-call ahead\"><i></i><span><b>Five Ways</b><small>20:16</small></span></div><div class=\"train-call ahead\"><i></i><span><b>University</b><small>20:20</small></span></div><div class=\"train-call ahead\"><i></i><span><b>Selly Oak</b><small>20:24</small></span></div></div></div></article>`;",
    'scheduled calling fixture'
)

test = replace_once(
    test,
    "  await page.waitForFunction(()=>document.querySelectorAll('[data-train-movement-card]').length>=3);",
    "  await page.waitForFunction(()=>document.querySelectorAll('[data-train-progress-marker]').length>=3);",
    'progress wait'
)

old_result = r'''  const result=await page.evaluate(()=>({
    liveInline:document.querySelector('#trainBoard .train-movement-inline')?.textContent||'',
    liveCard:document.querySelector('#trainBoard [data-train-movement-card]')?.textContent||'',
    scheduledInline:document.querySelector('#trainScheduledBoard .train-movement-inline')?.textContent||'',
    planInline:document.querySelector('#planJourneyResults .plan-movement-inline')?.textContent||'',
    planCard:document.querySelector('#planJourneyResults [data-train-movement-card]')?.textContent||'',
    attached:window.__KERBSIDE_TRAINS__.state.services[0].networkRailMovement?.uid||'',
    matches:window.__KERBSIDE_TRAIN_MOVEMENT__.state.matches,
    resolvedRefs:window.__KERBSIDE_TRAIN_MOVEMENT__.refsFor(window.__KERBSIDE_TRAINS__.state.services[0])
  }));
  assert.match(result.liveInline,/between Birmingham New Street and University/i);
  assert.match(result.liveCard,/Estimated progress: Birmingham New Street → University/i);
  assert.match(result.liveCard,/2 min late/i);
  assert.match(result.liveCard,/not GPS/i);
  assert.match(result.scheduledInline,/between Birmingham New Street and University/i);
  assert.match(result.planInline,/between Birmingham New Street and University/i);
  assert.match(result.planCard,/Network Rail movement/i);
  assert.equal(result.attached,'C21373');
  assert.deepEqual(result.resolvedRefs,['uid:C21373','head:5F25']);
  assert.ok(result.matches>=2,`expected movement matches, got ${result.matches}`);'''
new_result = r'''  const result=await page.evaluate(()=>({
    liveInline:document.querySelector('#trainBoard .train-movement-inline')?.textContent||'',
    liveTimeline:document.querySelector('#trainBoard .train-live-progress')?.textContent||'',
    liveTitle:document.querySelector('#trainBoard .train-live-progress .train-detail-title')?.textContent||'',
    scheduledInline:document.querySelector('#trainScheduledBoard .train-movement-inline')?.textContent||'',
    scheduledTimeline:document.querySelector('#trainScheduledBoard .train-live-progress')?.textContent||'',
    scheduledTitle:document.querySelector('#trainScheduledBoard .train-live-progress .train-detail-title')?.textContent||'',
    planInline:document.querySelector('#planJourneyResults .plan-movement-inline')?.textContent||'',
    planTimeline:document.querySelector('#planJourneyResults [data-train-progress-planner]')?.textContent||'',
    movementCards:document.querySelectorAll('#trainBoard [data-train-movement-card],#trainScheduledBoard [data-train-movement-card],#planJourneyResults [data-train-movement-card]').length,
    attached:window.__KERBSIDE_TRAINS__.state.services[0].networkRailMovement?.uid||'',
    matches:window.__KERBSIDE_TRAIN_MOVEMENT__.state.matches,
    resolvedRefs:window.__KERBSIDE_TRAIN_MOVEMENT__.refsFor(window.__KERBSIDE_TRAINS__.state.services[0])
  }));
  assert.match(result.liveInline,/between Birmingham New Street and University/i);
  assert.match(result.liveTitle,/Live journey progress/i);
  assert.match(result.liveTimeline,/Birmingham New Street/i);
  assert.match(result.liveTimeline,/Between Birmingham New Street and University/i);
  assert.match(result.liveTimeline,/2 min late/i);
  assert.match(result.liveTimeline,/not GPS/i);
  assert.match(result.scheduledInline,/between Birmingham New Street and University/i);
  assert.match(result.scheduledTitle,/Live journey progress/i);
  assert.match(result.scheduledTimeline,/Five Ways/i);
  assert.match(result.scheduledTimeline,/University/i);
  assert.match(result.scheduledTimeline,/Selly Oak/i);
  assert.doesNotMatch(result.scheduledTimeline,/First-leg calling points/i);
  assert.match(result.planInline,/between Birmingham New Street and University/i);
  assert.match(result.planTimeline,/Live journey progress/i);
  assert.match(result.planTimeline,/Between Birmingham New Street and University/i);
  assert.equal(result.movementCards,0,'timeline should replace duplicate movement cards when progress can be shown');
  assert.equal(result.attached,'C21373');
  assert.deepEqual(result.resolvedRefs,['uid:C21373','head:5F25']);
  assert.ok(result.matches>=2,`expected movement matches, got ${result.matches}`);

  const atStation=await page.evaluate(()=>{
    const api=window.__KERBSIDE_TRAIN_MOVEMENT__,service=window.__KERBSIDE_TRAINS__.state.services[0],base=service.networkRailMovement,now=Date.now(),snapshot={...base,updatedAt:now-5_000,ageSeconds:5,stale:false,lastEvent:{...base.lastEvent,eventType:'ARRIVAL',location:{stanox:'16416',crs:'UNI',name:'University'},nextLocation:{stanox:'16418',name:'Selly Oak'},actualTimestamp:now-30_000,plannedTimestamp:now-30_000,variationMinutes:0,variationStatus:'ON TIME'}};
    const calling=document.querySelector('#trainBoard .train-calling');api.decorateCallingTimeline(calling,service,snapshot,{startName:'Birmingham New Street',startTime:'20:12'});
    return {current:calling.querySelector('.train-call.progress-current b')?.textContent||'',now:calling.querySelector('.train-progress-now')?.textContent||''};
  });
  assert.equal(atStation.current,'University');
  assert.match(atStation.now,/Train here/i);
  assert.match(atStation.now,/Arrived/i);'''

test = replace_once(test, old_result, new_result, 'movement browser assertions')
test_path.write_text(test, encoding='utf-8')

print('Applied Kerbside 0.9.32 live journey progress changes.')
