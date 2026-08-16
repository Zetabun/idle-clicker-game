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

const VERSION='0.9.30';
const API_BASE='https://kerbside-train-movement.adambullas.workers.dev';
const REFRESH_MS=15000;
const REQUEST_TIMEOUT_MS=6500;
const MAX_REFS_PER_REQUEST=40;
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
function refsFor(service){
  if(!service||typeof service!=='object')return[];
  const refs=[];
  const uid=upper(service.uid||service.serviceUid||service.trainUid);if(uid)refs.push(`uid:${uid}`);
  const head=headcode(service.trainId||service.trainid||service.headcode);if(head)refs.push(`head:${head}`);
  return [...new Set(refs)];
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
function serviceTargets(){
  const today=todayLondon(),targets=[];
  const baseDate=selectedDate();
  const live=window.__KERBSIDE_TRAINS__?.state?.services||[];
  if(baseDate===today)live.forEach(service=>targets.push({service,date:baseDate,kind:'live'}));
  const scheduled=window.__KERBSIDE_TRAIN_TIMETABLE__?.state?.services||[];
  if(baseDate===today)scheduled.forEach(service=>{if(service?.journeyType==='connection'&&Array.isArray(service.legs))service.legs.forEach(leg=>targets.push({service:leg,date:baseDate,kind:'scheduled'}));else targets.push({service,date:baseDate,kind:'scheduled'});});
  const plan=window.__KERBSIDE_JOURNEY_PLANNER__,pDate=plannerDate();
  if(pDate===today)(plan?.planState?.results||[]).forEach(candidate=>{const legs=candidate?.journeyType==='connection'&&Array.isArray(candidate.legs)?candidate.legs:[candidate];legs.filter(Boolean).forEach(leg=>targets.push({service:leg,date:pDate,kind:'plan'}));});
  if(pDate===today&&typeof plan?.readSavedJourneys==='function')for(const saved of plan.readSavedJourneys()||[]){
    if(saved.date!==today)continue;
    const selectors=saved.journeyType==='connection'?[saved.first,saved.onward]:[saved.service];
    selectors.filter(Boolean).forEach(service=>targets.push({service,date:saved.date,kind:'saved'}));
  }
  const activeApi=window.__KERBSIDE_ACTIVE_JOURNEY__,active=activeApi?.state?.active;
  if(active&&text(active.date)===today){
    const services=active.journeyType==='connection'?[active.first,active.onward]:[active.service];
    services.filter(Boolean).forEach(service=>targets.push({service,date:today,kind:'active'}));
  }
  return targets;
}
function refsByDate(){
  const grouped=new Map();
  for(const target of serviceTargets())for(const ref of refsFor(target.service)){
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
  if(document.hidden&&!force)return false;
  const grouped=refsByDate();if(!grouped.size){state.status='idle';decorate();return false;}
  if(!force&&state.lastFetchAt&&Date.now()-state.lastFetchAt<REFRESH_MS-1000){decorate();return true;}
  state.status='loading';state.error='';state.lastFetchAt=Date.now();
  try{
    for(const [date,set] of grouped){
      for(const refs of chunk([...set],MAX_REFS_PER_REQUEST)){
        const url=new URL('/movement/lookup',API_BASE);url.searchParams.set('date',date);refs.forEach(ref=>url.searchParams.append('ref',ref));
        state.requests++;const payload=await fetchJson(url.toString());state.lastMessageAt=Number(payload&&payload.lastMessageAt)||state.lastMessageAt;
        const results=payload&&payload.results||{};for(const ref of refs)cacheMovement(date,ref,results[ref]||null);
      }
    }
    let matches=0;for(const target of serviceTargets())if(attachMovement(target.service,target.date))matches++;
    state.matches=matches;state.status='ready';state.lastSuccessAt=Date.now();state.error='';decorate();
    document.dispatchEvent(new CustomEvent('kerbside:train-movement',{detail:{matches,lastMessageAt:state.lastMessageAt,status:state.status}}));
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
  const stale=Boolean(snapshot.stale)||ageSeconds(snapshot)>180;
  if(snapshot.status==='cancelled'){
    const at=locationLabel(snapshot.cancellation&&snapshot.cancellation.location);return {tone:'warn',short:`${stale?'NR last confirmed':'NR live'} · cancellation recorded`,title:'Network Rail operational cancellation recorded',meta:`Recorded at ${at}${ageLabel(snapshot)?` · ${ageLabel(snapshot)}`:''}`,stale};
  }
  const event=snapshot.lastEvent;
  if(!event){const origin=locationLabel(snapshot.activation&&snapshot.activation.origin);return {tone:'idle',short:`${stale?'NR last confirmed':'NR live'} · train activated`,title:'Train activated in Network Rail TRUST',meta:`Origin ${origin}${ageLabel(snapshot)?` · ${ageLabel(snapshot)}`:''}`,stale};}
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
  return {tone:stale?'stale':'live',short,title,meta:bits.join(' · '),stale};
}
function primaryMovement(candidate,date){
  if(!candidate)return null;
  const legs=candidate.journeyType==='connection'&&Array.isArray(candidate.legs)?candidate.legs:[candidate];
  const movements=legs.map(leg=>attachMovement(leg,date)).filter(Boolean);
  if(!movements.length)return null;
  return movements.find(item=>item.status==='running'&&!item.stale)||movements.find(item=>item.status==='running')||movements[0];
}
function setText(node,value){if(node&&node.textContent!==value)node.textContent=value;}
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
    const article=articleFor(board,key),snapshot=attachMovement(service,date),info=progress(snapshot);if(!article)return;
    ensureInline(article,info);ensureCard(article.querySelector('.train-service-detail'),snapshot);
  });
}
function decoratePlanner(){
  const api=window.__KERBSIDE_JOURNEY_PLANNER__,date=plannerDate();if(!api||!isToday(date))return;
  const rows=api.planState?.results||[],list=document.getElementById('planJourneyResults');if(!list)return;
  for(const article of list.querySelectorAll('.plan-journey-result')){
    const rank=Number(article.getAttribute('data-plan-rank'))||0,candidate=rank?rows[rank-1]:null;if(!candidate)continue;
    const snapshot=primaryMovement(candidate,date),info=progress(snapshot);let inline=article.querySelector(':scope > .plan-movement-inline');
    if(!info){if(inline)inline.remove();continue;}
    if(!inline){inline=document.createElement('div');inline.className='plan-movement-inline';const route=article.querySelector('.plan-result-route');(route||article.firstElementChild)?.insertAdjacentElement('afterend',inline);}
    inline.className=`plan-movement-inline movement-${info.tone}`;setText(inline,info.short);ensureCard(article.querySelector('.plan-details-body'),snapshot,{compact:true});
  }
}
function savedSelectorMovement(saved,date){const selectors=saved?.journeyType==='connection'?[saved.first,saved.onward]:[saved?.service];for(const selector of selectors){const value=movementFor(selector,date);if(value)return value;}return null;}
function decorateSaved(){
  const api=window.__KERBSIDE_JOURNEY_PLANNER__;if(!api||typeof api.readSavedJourneys!=='function')return;
  const byId=new Map((api.readSavedJourneys()||[]).map(item=>[String(item.id),item]));
  for(const card of document.querySelectorAll('[data-saved-v2-id]')){
    const saved=byId.get(String(card.getAttribute('data-saved-v2-id'))),snapshot=saved&&isToday(saved.date)?savedSelectorMovement(saved,saved.date):null,info=progress(snapshot);let node=card.querySelector(':scope > .saved-movement-inline');
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
@media(max-width:820px){.train-movement-card{padding:9px;margin-bottom:8px}.train-movement-inline{font-size:8.5px}}
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
  state.timer=setInterval(()=>refresh().catch(()=>{}),REFRESH_MS);
  scheduleRefresh(true);return true;
}
function stop(){if(state.timer)clearInterval(state.timer);state.timer=null;if(state.observer)state.observer.disconnect();state.observer=null;state.installed=false;}

window.__KERBSIDE_TRAIN_MOVEMENT__={version:VERSION,state,install,stop,refresh,decorate,refsFor,movementFor,attachMovement,attachJourney,progress,API_BASE};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
