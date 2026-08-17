(function(){
'use strict';

/* Kerbside 0.9.30 — Network Rail TRUST movement overlay.

   This layer is deliberately additive. The timetable remains the service
   spine and Darwin remains the passenger-information source for expected
   times, platforms, cancellations and formations. TRUST MOVEMENT contributes
   a different fact: the last operational point the physical train reached.

   A departure from one reporting point plus the next report location can be
   described as estimated progress between those points, but it is never
   presented as GPS. If this service is unavailable, every existing Kerbside
   rail feature continues without it. */

const VERSION='0.9.42';
const API_BASE='https://kerbside-train-movement.adambullas.workers.dev';
const REFRESH_MS=15000;
const REQUEST_TIMEOUT_MS=6500;
const MAX_REFS_PER_REQUEST=60;
const STYLE_ID='kerbsideTrainMovementStyles';
const state={status:'idle',lastFetchAt:0,lastSuccessAt:0,lastMessageAt:0,error:'',requests:0,matches:0,cache:new Map(),timer:null,observer:null,installed:false};

function text(value){return String(value==null?'':value).trim();}
function upper(value){return text(value).toUpperCase();}
function esc(value){return text(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function todayLondon(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));return `${map.year}-${map.month}-${map.day}`;}
function selectedDate(){return text(window.__KERBSIDE_TRAIN_DATE__?.state?.date)||todayLondon();}
function plannerDate(){return text(document.getElementById('planJourneyDate')?.value)||selectedDate();}
function isToday(value){return text(value)===todayLondon();}
function headcode(value){const raw=upper(value);return raw?raw.slice(0,4):'';}
function movementTime(value){const m=text(value).match(/^(\d{1,2}):(\d{2})$/);if(!m)return'';const h=Number(m[1]),n=Number(m[2]);return h>=0&&h<24&&n>=0&&n<60?`${String(h).padStart(2,'0')}:${m[2]}`:'';}
function originCrsFor(service){const direct=upper(service&&service.from&&(service.from.crs||service.from.crsCode));if(direct)return direct;const origin=Array.isArray(service&&service.origin)?service.origin.find(Boolean):service&&service.origin;const code=upper(origin&&(origin.crs||origin.crsCode));if(code)return code;if(service&&service.liveOnly)return upper(window.__KERBSIDE_TRAINS__?.state?.station?.crs);return'';}
function originFallbackRef(service){const crs=originCrsFor(service),when=movementTime(service&&(service.std||service.departure||service.sta));return /^[A-Z0-9]{3}$/.test(crs)&&when?`origin:${crs}|${when}`:'';}
function identityCandidates(service){
  const candidates=[];
  if(service&&typeof service==='object')candidates.push(service);
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  if(service&&overlay&&typeof overlay.evidenceFor==='function'){
    try{
      const resolved=overlay.evidenceFor(service)?.service;
      if(resolved&&typeof resolved==='object'&&!candidates.includes(resolved))candidates.push(resolved);
    }catch(error){}
  }
  return candidates;
}
function refsFor(service){
  if(!service||typeof service!=='object')return[];
  const refs=[];
  for(const candidate of identityCandidates(service)){
    const uid=upper(candidate.uid||candidate.serviceUid||candidate.trainUid);if(uid)refs.push(`uid:${uid}`);
    const head=headcode(candidate.trainId||candidate.trainid||candidate.headcode);if(head)refs.push(`head:${head}`);
  }
  const strong=[...new Set(refs)];if(strong.length)return strong;
  const fallbacks=[service,...identityCandidates(service)].map(originFallbackRef).filter(Boolean);
  return [...new Set(fallbacks)].slice(0,1);
}
function cacheKey(date,ref){return `${date}|${upper(ref)}`;}
function cacheMovement(date,ref,value){state.cache.set(cacheKey(date,ref),value||null);}
function movementFor(service,date=selectedDate()){
  const embedded=service&&service.networkRailMovement;if(embedded)return embedded;
  for(const ref of refsFor(service)){const key=cacheKey(date,ref);if(state.cache.has(key)&&state.cache.get(key))return state.cache.get(key);}
  return null;
}
function attachMovement(service,date){
  if(!service||typeof service!=='object')return null;
  const movement=movementFor(service,date);
  service.networkRailMovement=movement||null;
  return movement;
}
function attachJourney(candidate,date){
  if(!candidate||typeof candidate!=='object')return[];
  const legs=candidate.journeyType==='connection'&&Array.isArray(candidate.legs)?candidate.legs:[candidate];
  const movements=legs.map(leg=>attachMovement(leg,date));
  try{candidate.networkRailMovements=movements;}catch(error){}
  return movements;
}
function elementVisible(node){
  if(!node||node.hidden||node.closest&&node.closest('[hidden]'))return false;
  if(typeof window.getComputedStyle!=='function')return true;
  const style=window.getComputedStyle(node);return style.display!=='none'&&style.visibility!=='hidden';
}
function addTarget(targets,service,date,kind){
  if(!service)return;
  const services=service?.journeyType==='connection'&&Array.isArray(service.legs)?service.legs:[service];
  services.filter(Boolean).forEach(item=>targets.push({service:item,date,kind}));
}
function finishScope(mode,targets){state.scopeMode=mode;state.scopeTargets=targets.length;return targets;}
function serviceForArticle(api,services,article){
  if(!article)return null;const key=text(article.getAttribute('data-service-id'));
  if(!key)return null;
  return (services||[]).find((service,index)=>text(typeof api?.serviceKey==='function'?api.serviceKey(service,index):'')===key)||null;
}
function serviceTargets(){
  const today=todayLondon(),targets=[];
  const scrim=document.querySelector('#scrim.show');if(scrim&&elementVisible(scrim))return finishScope('settings',targets);
  const activeApi=window.__KERBSIDE_ACTIVE_JOURNEY__,active=activeApi?.state?.active,activeRoot=document.getElementById('trainActiveJourney'),savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__,activeOnSaved=!!(active&&savedApi?.state?.active&&Array.isArray(savedApi.state.saved)&&typeof savedApi.activeMatchesSaved==='function'&&savedApi.state.saved.some(saved=>savedApi.activeMatchesSaved(saved)));
  if(active&&text(active.date)===today&&(elementVisible(activeRoot)||activeOnSaved)){
    const services=active.journeyType==='connection'?[active.first,active.onward]:[active.service];
    services.filter(Boolean).forEach(service=>addTarget(targets,service,today,activeOnSaved?'saved-active':'active'));
    return finishScope(activeOnSaved?'saved-active':'active',targets);
  }
  const plan=window.__KERBSIDE_JOURNEY_PLANNER__,pDate=plannerDate();
  if(plan?.planState?.active){
    if(pDate!==today)return finishScope('planner-future',targets);
    const details=document.querySelector('#planJourneyResults .plan-result-details[open]'),article=details&&details.closest('.plan-journey-result'),rank=Number(article&&article.getAttribute('data-plan-rank'))||0,candidate=rank?(plan.planState.results||[])[rank-1]:null;
    if(candidate)addTarget(targets,candidate,pDate,'plan-open');
    return finishScope(candidate?'planner-open':'planner',targets);
  }
  if(savedApi?.state?.active){
    for(const saved of Array.isArray(savedApi.state.saved)?savedApi.state.saved:[]){
      if(text(saved&&saved.date)!==today)continue;
      const services=saved&&saved.journeyType==='connection'?[saved.first,saved.onward]:[saved&&saved.service];
      services.filter(Boolean).forEach(service=>addTarget(targets,service,today,'saved'));
    }
    return finishScope('saved',targets);
  }
  const baseDate=selectedDate();if(baseDate!==today)return finishScope('board-future',targets);
  const scheduledBoard=document.getElementById('trainScheduledBoard'),liveBoard=document.getElementById('trainBoard'),scheduledVisible=elementVisible(scheduledBoard),board=scheduledVisible?scheduledBoard:liveBoard;
  const api=scheduledVisible?window.__KERBSIDE_TRAIN_TIMETABLE__:window.__KERBSIDE_TRAINS__,services=api?.state?.services||[];
  if(!board||!elementVisible(board))return finishScope('board-hidden',targets);
  const open=board.querySelector('.train-service.open[data-service-id]'),selected=serviceForArticle(api,services,open);
  if(selected)addTarget(targets,selected,baseDate,scheduledVisible?'scheduled-open':'live-open');
  else services.forEach(service=>addTarget(targets,service,baseDate,scheduledVisible?'scheduled-board':'live-board'));
  return finishScope(selected?(scheduledVisible?'scheduled-open':'live-open'):(scheduledVisible?'scheduled-board':'live-board'),targets);
}
function scopeSignature(targets){
  const refs=[];for(const target of targets)for(const ref of refsFor(target.service))refs.push(`${target.date}|${upper(ref)}`);
  return `${state.scopeMode||'idle'}|${[...new Set(refs)].sort().join(',')}`;
}
function refsByDate(targets=serviceTargets()){
  const grouped=new Map();
  for(const target of targets)for(const ref of refsFor(target.service)){
    if(!grouped.has(target.date))grouped.set(target.date,new Set());grouped.get(target.date).add(ref);
  }
  return grouped;
}
function chunk(values,size){const out=[];for(let i=0;i<values.length;i+=size)out.push(values.slice(i,i+size));return out;}
async function fetchJson(url){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal});if(!response.ok)throw new Error(`Movement service returned ${response.status}`);return await response.json();}
  finally{clearTimeout(timer);}
}
async function refresh({force=false}={}){
  if(document.hidden){state.scopeMode='hidden';return false;}
  const targets=serviceTargets(),signature=scopeSignature(targets),scopeChanged=signature!==state.scopeSignature;
  if(scopeChanged){state.scopeSignature=signature;state.scopeChanges=(Number(state.scopeChanges)||0)+1;}
  const grouped=refsByDate(targets);state.scopeRefs=[...grouped.values()].reduce((total,set)=>total+set.size,0);
  if(!grouped.size){state.status='idle';decorate();return false;}
  if(!force&&!scopeChanged&&state.lastFetchAt&&Date.now()-state.lastFetchAt<REFRESH_MS-1000){decorate();return true;}
  state.status='loading';state.error='';state.lastFetchAt=Date.now();
  try{
    for(const [date,set] of grouped){
      for(const refs of chunk([...set],MAX_REFS_PER_REQUEST)){
        const url=new URL('/movement/lookup',API_BASE);url.searchParams.set('date',date);refs.forEach(ref=>url.searchParams.append('ref',ref));
        state.requests++;const payload=await fetchJson(url.toString());state.lastMessageAt=Number(payload&&payload.lastMessageAt)||state.lastMessageAt;
        const results=payload&&payload.results||{};for(const ref of refs)cacheMovement(date,ref,results[ref]||null);
      }
    }
    let matches=0;for(const target of targets)if(attachMovement(target.service,target.date))matches++;
    state.matches=matches;state.status='ready';state.lastSuccessAt=Date.now();state.error='';decorate();
    document.dispatchEvent(new CustomEvent('kerbside:train-movement',{detail:{matches,lastMessageAt:state.lastMessageAt,status:state.status,scope:state.scopeMode,targets:state.scopeTargets,refs:state.scopeRefs}}));
    return true;
  }catch(error){state.status='error';state.error=error&&error.name==='AbortError'?'Movement request timed out':text(error&&error.message||error);decorate();return false;}
}

function locationLabel(location){return text(location&&(location.name||location.crs||location.tiploc||location.stanox))||'a Network Rail reporting point';}
function timeLabel(timestamp){if(!Number.isFinite(Number(timestamp)))return'';return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(Number(timestamp)));}
function runMinutes(value){const match=text(value).match(/^(\d+)(?:\.(\d+))?$/);if(!match)return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=180?n:null;}
function ageSeconds(snapshot){const updated=Number(snapshot&&snapshot.updatedAt)||0;return updated?Math.max(0,Math.round((Date.now()-updated)/1000)):Number(snapshot&&snapshot.ageSeconds)||null;}
function ageLabel(snapshot){const age=ageSeconds(snapshot);if(age==null)return'';if(age<60)return `${age}s ago`;const minutes=Math.floor(age/60);return minutes<60?`${minutes} min ago`:`${Math.floor(minutes/60)}h ${minutes%60}m ago`;}
function variationLabel(event){const n=Number(event&&event.variationMinutes);if(Number.isFinite(n)){if(n===0)return'on time';if(n>0)return`${Math.round(n)} min late`;return`${Math.abs(Math.round(n))} min early`;}return text(event&&event.variationStatus).toLowerCase();}
function nextEstimate(event){const run=runMinutes(event&&event.nextReportRunTime),actual=Number(event&&event.actualTimestamp);if(run==null||!Number.isFinite(actual))return'';return timeLabel(actual+run*60*1000);}
function progress(snapshot){
  if(!snapshot)return null;
  const reacquiring=Boolean(snapshot.reacquiring);
  const stale=Boolean(snapshot.stale)||ageSeconds(snapshot)>180||reacquiring;
  if(snapshot.status==='cancelled'){
    const at=locationLabel(snapshot.cancellation&&snapshot.cancellation.location);return {tone:'warn',short:`${stale?'NR last confirmed':'NR live'} · cancellation recorded`,title:'Network Rail operational cancellation recorded',meta:`Recorded at ${at}${ageLabel(snapshot)?` · ${ageLabel(snapshot)}`:''}`,stale};
  }
  const event=snapshot.lastEvent;
  if(!event){const origin=locationLabel(snapshot.activation&&snapshot.activation.origin);if(reacquiring)return {tone:'stale',short:'NR reacquiring · waiting for next report',title:'Reacquiring live position',meta:`Recovered Network Rail identity for ${origin} · waiting for the next TRUST movement report`,stale:true,reacquiring:true};return {tone:'idle',short:`${stale?'NR last confirmed':'NR live'} · train activated`,title:'Train activated in Network Rail TRUST',meta:`Origin ${origin}${ageLabel(snapshot)?` · ${ageLabel(snapshot)}`:''}`,stale};}
  const where=locationLabel(event.location),next=event.nextLocation&&locationLabel(event.nextLocation),actual=timeLabel(event.actualTimestamp),variation=variationLabel(event),eta=nextEstimate(event),bits=[];
  if(actual)bits.push(actual);if(variation)bits.push(variation);if(ageLabel(snapshot))bits.push(`feed ${ageLabel(snapshot)}`);
  let title='',short='';
  if(event.terminated||snapshot.status==='terminated'){title=`Train terminated at ${where}`;short=`NR ${stale?'last confirmed':'live'} · arrived ${where}`;}
  else if(event.eventType==='ARRIVAL'){title=`Last confirmed arrival: ${where}`;short=`NR ${stale?'last confirmed':'live'} · at ${where}`;}
  else if(event.eventType==='DEPARTURE'&&next){title=`Estimated progress: ${where} → ${next}`;short=`NR ${stale?'last confirmed':'live'} · between ${where} and ${next}`;}
  else if(event.eventType==='DEPARTURE'){title=`Last confirmed departure: ${where}`;short=`NR ${stale?'last confirmed':'live'} · departed ${where}`;}
  else{title=`Last confirmed movement: ${where}`;short=`NR ${stale?'last confirmed':'live'} · ${where}`;}
  if(next){const nextBits=[`Next report ${next}`];if(eta)nextBits.push(`estimated about ${eta}`);bits.push(nextBits.join(' · '));}
  if(event.offRoute)bits.push('off-route report');
  if(reacquiring)bits.unshift('Reacquiring live feed');
  return {tone:stale?'stale':'live',short:reacquiring?short.replace(/^NR (?:last confirmed|live)/,'NR reacquiring'):short,title,meta:bits.join(' · '),stale,reacquiring};
}
function primaryMovement(candidate,date){
  if(!candidate)return null;
  const legs=candidate.journeyType==='connection'&&Array.isArray(candidate.legs)?candidate.legs:[candidate];
  const movements=legs.map(leg=>attachMovement(leg,date)).filter(Boolean);
  if(!movements.length)return null;
  return movements.find(item=>item.status==='running'&&!item.stale)||movements.find(item=>item.status==='running')||movements[0];
}
function setText(node,value){if(node&&node.textContent!==value)node.textContent=value;}
const TRAIN_PROGRESS_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3.5h10a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/><path d="M8 7h8M8 11h8M8 18l-2 2M16 18l2 2"/><circle cx="8.5" cy="15" r="1"/><circle cx="15.5" cy="15" r="1"/></svg>';
function normalisePlace(value){return text(value).toLowerCase().replace(/&/g,' and ').replace(/\b(?:railway|rail)\s+station\b/g,' ').replace(/\bstation\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();}
function locationTokens(location){const values=[location&&location.crs,location&&location.name,location&&location.tiploc].map(normalisePlace).filter(Boolean);return [...new Set(values)];}
function rowPlace(row){return normalisePlace(row&&row.querySelector('b')&&row.querySelector('b').textContent);}
function rowMatchesLocation(row,location){const key=rowPlace(row),tokens=locationTokens(location);if(!key||!tokens.length)return false;if(tokens.includes(key))return true;return tokens.some(token=>token.length>=4&&key.length>=4&&(token.includes(key)||key.includes(token)));}
function firstLeg(service){return service&&service.journeyType==='connection'&&Array.isArray(service.legs)&&service.legs[0]?service.legs[0]:service;}
function serviceStartName(service,api,boardId,snapshot){const leg=firstLeg(service);if(boardId==='trainBoard'||boardId==='trainScheduledBoard'){const station=window.__KERBSIDE_TRAINS__?.state?.station||api&&api.state&&api.state.station;const label=text(station&&(station.name||station.crs));if(label)return label;}const origin=Array.isArray(leg&&leg.origin)?leg.origin.find(Boolean):leg&&leg.origin;return text(leg&&leg.from&&(leg.from.name||leg.from.locationName||leg.from.crs)||origin&&(origin.locationName||origin.name||origin.crs)||snapshot&&snapshot.activation&&snapshot.activation.origin&&(snapshot.activation.origin.name||snapshot.activation.origin.crs));}
function serviceStartTime(service){const leg=firstLeg(service);return text(leg&&(leg.std||leg.departure));}
function serviceEndName(service){const leg=firstLeg(service),destination=Array.isArray(leg&&leg.destination)&&leg.destination[0];return text(leg&&leg.to&&(leg.to.name||leg.to.locationName||leg.to.crs)||leg&&leg.routeDestination&&(leg.routeDestination.name||leg.routeDestination.locationName||leg.routeDestination.crs)||destination&&(destination.name||destination.locationName||destination.crs));}
function serviceEndTime(service){const leg=firstLeg(service);return text(leg&&leg.arrival);}
function timelineEventMeta(snapshot,event){const bits=[],actual=timeLabel(event&&event.actualTimestamp),variation=variationLabel(event),age=ageLabel(snapshot);if(actual)bits.push(`${event&&event.eventType==='ARRIVAL'?'Arrived':event&&event.eventType==='DEPARTURE'?'Departed':'Reported'} ${actual}`);if(variation)bits.push(variation);if(age)bits.push(`${snapshot&&snapshot.stale?'Last report':'Feed'} ${age}`);return bits.join(' · ');}
function timelineSourceRows(calling){return [...calling.querySelectorAll('.train-call')].filter(row=>!row.hasAttribute('data-train-progress-marker')&&!row.hasAttribute('data-train-progress-origin'));}
function londonNowMinutes(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));let hour=Number(map.hour)||0;if(hour===24)hour=0;return hour*60+(Number(map.minute)||0);}
function trackingFallbackState(startTime){const when=movementTime(startTime);if(!when)return'unavailable';const [h,m]=when.split(':').map(Number),scheduled=h*60+m,now=londonNowMinutes();let elapsed=now-scheduled;if(elapsed>720)elapsed-=1440;if(elapsed<-720)elapsed+=1440;return elapsed<=4?'awaiting':'unavailable';}
function timelineSignature(calling,snapshot,startName,startTime){const rows=timelineSourceRows(calling).map(row=>`${rowPlace(row)}|${text(row.querySelector('small')&&row.querySelector('small').textContent)}`).join('||'),event=snapshot&&snapshot.lastEvent,ageBucket=snapshot?Math.floor((ageSeconds(snapshot)||0)/15):0;return [rows,normalisePlace(startName),startTime,snapshot&&snapshot.status,snapshot&&snapshot.stale?'stale':'live',snapshot&&snapshot.reacquiring?'reacquiring':'current',snapshot&&snapshot.updatedAt,event&&event.eventType,locationLabel(event&&event.location),locationLabel(event&&event.nextLocation),event&&event.actualTimestamp,ageBucket,snapshot?'':trackingFallbackState(startTime)].join('|');}
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
  const event=snapshot&&snapshot.lastEvent,fallbackState=trackingFallbackState(startTime),activated=!!(snapshot&&!event&&snapshot.status==='activated'),reacquiring=!!(snapshot&&snapshot.reacquiring&&fallbackState!=='awaiting');
  const badge=document.createElement('span');badge.className=`train-progress-badge ${snapshot&&(snapshot.stale||reacquiring)?'is-stale':snapshot||fallbackState==='awaiting'?'is-live':'is-idle'}`;badge.setAttribute('data-train-progress-badge','');badge.textContent=snapshot?(fallbackState==='awaiting'&&activated?'Awaiting departure':reacquiring?'Reacquiring live position':activated?'Train activated':snapshot.stale?'NR last confirmed':'NR live'):(fallbackState==='awaiting'?'Awaiting departure':'Live position unavailable');title.appendChild(badge);
  let origin=null;if(startName&&(!sourceRows[0]||normalisePlace(startName)!==rowPlace(sourceRows[0]))){origin=makeProgressOrigin(startName,startTime);title.insertAdjacentElement('afterend',origin);}
  const rows=[...(origin?[origin]:[]),...sourceRows];
  if(!snapshot||!event){if(origin){if(fallbackState==='awaiting'||activated||reacquiring){setProgressClass(origin,'progress-current');const now=document.createElement('em');now.className='train-progress-now';now.textContent=fallbackState==='awaiting'?`Train starts here${startTime?` · scheduled ${startTime}`:''} · Live Network Rail tracking will begin when the train moves.`:reacquiring?'Reacquiring live position · identity recovered, waiting for the next Network Rail movement report.':'Network Rail has activated this service · awaiting first movement report';origin.querySelector('span')?.appendChild(now);}else setProgressClass(origin,'progress-future');}return true;}
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
  add(leg&&leg.previousCallingPoints);add(leg&&leg.callingPoints);add(leg&&leg.subsequentCallingPoints);
  const end=serviceEndName(leg),endTime=serviceEndTime(leg);if(end&&!points.some(point=>normalisePlace(point.name)===normalisePlace(end)))points.push({name:end,when:endTime,cancelled:false});
  const seen=new Set();return points.filter(point=>{const key=normalisePlace(point.name);if(!key||seen.has(key))return false;seen.add(key);return true;});
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
function ensureInline(article,info){
  const meta=article&&article.querySelector('.train-route small');if(!meta)return;
  let node=meta.querySelector('.train-movement-inline');if(!info){if(node)node.remove();return;}
  if(!node){node=document.createElement('span');node.className=`train-movement-inline movement-${info.tone}`;meta.appendChild(node);}
  if(node.className!==`train-movement-inline movement-${info.tone}`)node.className=`train-movement-inline movement-${info.tone}`;
  setText(node,info.short);
}
function movementCard(snapshot,{compact=false}={}){
  const info=progress(snapshot);if(!info)return'';
  return `<div class="train-movement-card movement-${esc(info.tone)}" data-train-movement-card><div><span>${info.stale?'Network Rail last confirmed':'Network Rail movement'}</span><strong>${esc(info.title)}</strong></div><p>${esc(info.meta)}</p>${compact?'':'<small>Operational movement evidence from TRUST. Between-point position is estimated, not GPS; Darwin remains the passenger-facing expected-time and platform source.</small>'}</div>`;
}
function ensureCard(container,snapshot,options){if(!container)return;let node=container.querySelector(':scope > [data-train-movement-card]');const html=movementCard(snapshot,options);if(!html){if(node)node.remove();return;}if(!node){container.insertAdjacentHTML('afterbegin',html);return;}const wrapper=document.createElement('div');wrapper.innerHTML=html;const next=wrapper.firstElementChild;if(node.outerHTML!==next.outerHTML)node.replaceWith(next);}
function articleFor(board,key){return [...(board?.querySelectorAll('[data-service-id]')||[])].find(node=>node.getAttribute('data-service-id')===String(key))||null;}
function decorateBoard(api,boardId,services,date){
  const board=document.getElementById(boardId);if(!api||!board||!isToday(date))return;
  services.forEach((service,index)=>{
    const key=typeof api.serviceKey==='function'?api.serviceKey(service,index):'';if(!key)return;
    const article=articleFor(board,key),snapshot=service&&service.journeyType==='connection'?primaryMovement(service,date):attachMovement(service,date),info=progress(snapshot);if(!article)return;
    const detail=article.querySelector('.train-service-detail'),leg=firstLeg(service),timeline=decorateCallingTimeline(detail&&detail.querySelector('.train-calling'),leg,snapshot,{startName:serviceStartName(service,api,boardId,snapshot),startTime:serviceStartTime(leg)});
    ensureInline(article,info);ensureCard(detail,timeline?null:snapshot);
  });
}
function decoratePlanner(){
  const api=window.__KERBSIDE_JOURNEY_PLANNER__,date=plannerDate();if(!api||!isToday(date))return;
  const rows=api.planState?.results||[],list=document.getElementById('planJourneyResults');if(!list)return;
  for(const article of list.querySelectorAll('.plan-journey-result')){
    const rank=Number(article.getAttribute('data-plan-rank'))||0,candidate=rank?rows[rank-1]:null;if(!candidate)continue;
    const snapshot=primaryMovement(candidate,date),info=progress(snapshot);let inline=article.querySelector(':scope > .plan-movement-inline');
    if(!info){if(inline)inline.remove();ensurePlannerTimeline(article.querySelector('.plan-details-body'),candidate,null);continue;}
    if(!inline){inline=document.createElement('div');inline.className='plan-movement-inline';const route=article.querySelector('.plan-result-route');(route||article.firstElementChild)?.insertAdjacentElement('afterend',inline);}
    inline.className=`plan-movement-inline movement-${info.tone}`;setText(inline,info.short);const body=article.querySelector('.plan-details-body'),timeline=ensurePlannerTimeline(body,candidate,snapshot);ensureCard(body,timeline?null:snapshot,{compact:true});
  }
}
function savedSelectorMovement(saved,date){const selectors=saved?.journeyType==='connection'?[saved.first,saved.onward]:[saved?.service];for(const selector of selectors){const value=movementFor(selector,date);if(value)return value;}return null;}
function decorateSaved(){
  const api=window.__KERBSIDE_JOURNEY_PLANNER__;if(!api||typeof api.readSavedJourneys!=='function')return;
  const byId=new Map((api.readSavedJourneys()||[]).map(item=>[String(item.id),item]));
  const savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__;
  for(const card of document.querySelectorAll('[data-saved-v2-id]')){
    const saved=byId.get(String(card.getAttribute('data-saved-v2-id'))),snapshot=saved&&isToday(saved.date)?savedSelectorMovement(saved,saved.date):null,info=progress(snapshot),following=!!(saved&&savedApi&&typeof savedApi.activeMatchesSaved==='function'&&savedApi.activeMatchesSaved(saved));let node=card.querySelector(':scope > .saved-movement-inline');
    ensureCard(card,snapshot,{compact:true});
    if(!info){if(node)node.remove();continue;}if(!node){node=document.createElement('div');node.className='saved-movement-inline';const times=card.querySelector('.saved-v2-times');(times||card.firstElementChild)?.insertAdjacentElement('afterend',node);}node.className=`saved-movement-inline movement-${info.tone}`;setText(node,info.short);
  }
}
function decorateActive(){
  const active=window.__KERBSIDE_ACTIVE_JOURNEY__?.state?.active,root=document.getElementById('trainActiveJourney');if(!root||!active||!isToday(active.date))return;
  const services=active.journeyType==='connection'?[active.first,active.onward]:[active.service];const snapshot=services.map(service=>movementFor(service,active.date)).find(Boolean);ensureCard(root,snapshot);
}
function decorate(){
  const date=selectedDate();
  decorateBoard(window.__KERBSIDE_TRAINS__,'trainBoard',window.__KERBSIDE_TRAINS__?.state?.services||[],date);
  decorateBoard(window.__KERBSIDE_TRAIN_TIMETABLE__,'trainScheduledBoard',window.__KERBSIDE_TRAIN_TIMETABLE__?.state?.services||[],date);
  decoratePlanner();decorateSaved();decorateActive();
}
function installStyles(){if(document.getElementById(STYLE_ID))return;const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
.train-movement-inline{display:block;margin-top:3px;font-size:9px;font-style:normal;font-weight:700;color:var(--live)}
.train-movement-inline::before{content:"NR · ";font-family:'Martian Mono',ui-monospace,monospace;font-size:8px;letter-spacing:.05em}
.train-movement-inline.movement-stale,.plan-movement-inline.movement-stale,.saved-movement-inline.movement-stale{color:var(--text-dim)}
.train-movement-inline.movement-warn,.plan-movement-inline.movement-warn,.saved-movement-inline.movement-warn{color:var(--warn)}
.train-movement-card{display:grid;gap:5px;margin:0 0 10px;padding:10px 11px;border:1px solid rgb(var(--live-rgb) / .28);border-radius:10px;background:rgb(var(--live-rgb) / .06)}
.train-movement-card>div{display:grid;gap:2px}.train-movement-card span{color:var(--live);font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.train-movement-card strong{font-size:11px}.train-movement-card p,.train-movement-card small{margin:0;color:var(--text-dim);font-size:9.5px;line-height:1.45}.train-movement-card.movement-stale{border-color:var(--rule);background:var(--ink-3)}.train-movement-card.movement-stale span{color:var(--text-dim)}.train-movement-card.movement-warn{border-color:rgb(var(--warn-rgb) / .3);background:rgb(var(--warn-rgb) / .06)}.train-movement-card.movement-warn span{color:var(--warn)}
.plan-movement-inline,.saved-movement-inline{padding:6px 8px;border:1px solid rgb(var(--live-rgb) / .2);border-radius:7px;background:rgb(var(--live-rgb) / .05);color:var(--live);font-size:9px;font-weight:800}.plan-movement-inline{grid-column:1/-1}.saved-movement-inline{margin-top:-3px}.plan-movement-inline.movement-stale,.saved-movement-inline.movement-stale{border-color:var(--rule);background:var(--ink-3)}.plan-movement-inline.movement-warn,.saved-movement-inline.movement-warn{border-color:rgb(var(--warn-rgb) / .25);background:rgb(var(--warn-rgb) / .05)}
.train-calling.train-live-progress{padding-bottom:6px}.train-live-progress .train-detail-title{display:flex;align-items:center;justify-content:space-between;gap:10px}.train-progress-badge{flex:0 0 auto;padding:3px 6px;border:1px solid var(--rule);border-radius:999px;color:var(--text-mute);font-size:7.5px;letter-spacing:.06em;text-transform:uppercase}.train-progress-badge.is-live{border-color:rgb(var(--live-rgb) / .28);background:rgb(var(--live-rgb) / .07);color:var(--live)}.train-progress-badge.is-stale{background:var(--ink-3);color:var(--text-dim)}
.train-live-progress .train-call{min-height:42px}.train-live-progress .train-call.progress-complete>i{background:var(--live);opacity:.78}.train-live-progress .train-call.progress-complete:before{background:rgb(var(--live-rgb) / .42)}.train-live-progress .train-call.progress-future>i{box-sizing:border-box;border:2px solid var(--text-mute);background:var(--ink-2)}.train-live-progress .train-call.progress-current>i:not(.train-progress-vehicle){width:11px;height:11px;margin-top:2px;margin-left:-2px;background:var(--live);box-shadow:0 0 0 3px var(--ink-2),0 0 0 6px rgb(var(--live-rgb) / .12)}
.train-progress-marker{min-height:54px!important;align-items:flex-start}.train-progress-marker:before{top:25px!important}.train-progress-marker>i.train-progress-vehicle{display:grid;place-items:center;flex:0 0 auto;width:24px;height:24px;margin:-2px 0 0 -6px;border-radius:50%;background:var(--live);box-shadow:0 0 0 3px var(--ink-2),0 0 0 6px rgb(var(--live-rgb) / .13);opacity:1}.train-progress-marker>i.train-progress-vehicle svg{width:14px;height:14px;fill:none;stroke:var(--ink);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.train-progress-marker.movement-stale>i.train-progress-vehicle{background:var(--text-dim);box-shadow:0 0 0 3px var(--ink-2)}.train-progress-marker b{color:var(--live)!important;font-weight:800!important}.train-progress-marker.movement-stale b{color:var(--text-dim)!important}.train-progress-marker small{max-width:48rem;line-height:1.45}.train-progress-now{display:block;margin-top:3px;color:var(--live);font-size:9px;font-style:normal;font-weight:700;line-height:1.35}.train-progress-generated{margin:2px 0 10px;padding:10px 11px;border:1px solid rgb(var(--live-rgb) / .22);border-radius:10px;background:rgb(var(--live-rgb) / .035)}
@media(max-width:820px){.train-movement-card{padding:9px;margin-bottom:8px}.train-movement-inline{font-size:8.5px}.train-progress-generated{padding:9px}.train-progress-marker small{font-size:9px}}
`;document.head.appendChild(style);}
function scheduleRefresh(force=false){setTimeout(()=>refresh({force}).catch(()=>{}),force?0:120);}
function install(){
  if(state.installed)return true;state.installed=true;installStyles();
  const roots=['trainBoard','trainScheduledBoard','planJourneyResults','savedJourneyList','trainActiveJourney'].map(id=>document.getElementById(id)).filter(Boolean);
  if(typeof MutationObserver==='function'){
    state.observer=new MutationObserver(()=>{decorate();scheduleRefresh(false);});
    roots.forEach(root=>state.observer.observe(root,{childList:true,subtree:true}));
    state.observer.observe(document.body,{childList:true,subtree:true});
  }
  ['kerbside:live-overlay','kerbside:train-date-change','kerbside:train-route-change','kerbside:train-movement'].forEach(name=>document.addEventListener(name,()=>scheduleRefresh(name!=='kerbside:train-movement')));
  window.addEventListener('kerbside:journey-planner-change',()=>scheduleRefresh(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleRefresh(true);});
  document.addEventListener('click',()=>setTimeout(()=>scheduleRefresh(false),0),true);
  document.addEventListener('toggle',event=>{if(event.target&&event.target.matches&&event.target.matches('.plan-result-details'))scheduleRefresh(false);},true);
  state.timer=setInterval(()=>refresh().catch(()=>{}),REFRESH_MS);
  scheduleRefresh(true);return true;
}
function stop(){if(state.timer)clearInterval(state.timer);state.timer=null;if(state.observer)state.observer.disconnect();state.observer=null;state.installed=false;}

window.__KERBSIDE_TRAIN_MOVEMENT__={version:VERSION,state,install,stop,refresh,decorate,refsFor,movementFor,attachMovement,attachJourney,progress,decorateCallingTimeline,ensurePlannerTimeline,API_BASE};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
