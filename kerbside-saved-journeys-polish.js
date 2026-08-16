(function(root){
'use strict';

/* Kerbside 0.9.28 — Saved Journeys polish.

   This layer deliberately sits on top of Saved Journeys v2 instead of
   duplicating its timetable resolution, live evidence or Active Journey
   handoff. v2 remains the authority for resolving a saved locator; this file
   owns the lifecycle around that locator: editing, repeating, archiving,
   grouping and defensive localStorage migration/recovery.
*/
const VERSION='0.9.34';
const SCHEMA=3;
const SAVED_KEY='kerbside.rail.plan.saved.v1';
const META_KEY='kerbside.rail.plan.saved-meta.v2';
const POLISH_KEY='kerbside.rail.plan.saved-polish.v3';
const RECOVERY_PREFIX='kerbside.rail.plan.recovery';
const MAX_ACTIVE=12;
const INIT_RETRY_MS=60;
const INIT_RETRY_MAX=180;
const PREF_LABELS={balanced:'Balanced',fastest:'Fastest',quieter:'Quieter','fewer-changes':'Fewer changes','least-stressful':'Least stressful'};

const runtime={
  installed:false,
  attempts:0,
  editingId:'',
  store:null,
  observer:null,
  resultsObserver:null,
  renderQueued:false,
  recovery:[],
  notice:'',
  noticeTone:'',
  flashId:''
};

const global=root||globalThis;
const hasDom=()=>typeof document!=='undefined'&&typeof document.createElement==='function';
const $=id=>hasDom()?document.getElementById(id):null;
const planner=()=>global.__KERBSIDE_JOURNEY_PLANNER__||null;
const savedV2=()=>global.__KERBSIDE_SAVED_JOURNEYS_V2__||null;
const nowIso=()=>new Date().toISOString();
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function selector(value){
  const row=value||{};
  return {
    serviceID:String(row.serviceID||row.serviceId||''),
    uid:String(row.uid||''),
    trainId:String(row.trainId||row.trainid||''),
    std:String(row.std||row.departure||'')
  };
}
function selectorIdentity(value){
  const item=selector(value);
  return String(item.uid||item.serviceID||item.trainId||item.std||'');
}
function journeyIdentity(journey){
  if(!journey||typeof journey!=='object')return'';
  const date=String(journey.date||''),from=String(journey.from&&journey.from.crs||'').toUpperCase(),to=String(journey.to&&journey.to.crs||'').toUpperCase();
  if(!date||!from||!to)return journey.id?`id:${journey.id}`:'';
  const connection=journey.journeyType==='connection';
  const service=connection
    ? `connection:${selectorIdentity(journey.first)}:${String(journey.change||'').toUpperCase()}:${selectorIdentity(journey.onward)}`
    : `direct:${selectorIdentity(journey.service)}`;
  return `${date}|${from}|${to}|${service}|${String(journey.scheduledDeparture||'')}`;
}
function dedupeJourneys(rows){
  const kept=[],removed=[],seenIds=new Set(),seenIdentity=new Set();
  for(const row of Array.isArray(rows)?rows:[]){
    if(!row||typeof row!=='object')continue;
    const id=String(row.id||''),identity=journeyIdentity(row);
    if((id&&seenIds.has(id))||(identity&&seenIdentity.has(identity))){removed.push(row);continue;}
    if(id)seenIds.add(id);if(identity)seenIdentity.add(identity);kept.push(row);
  }
  return {rows:kept,removed};
}
function dateFrom(value){const match=String(value||'').match(/^\d{4}-\d{2}-\d{2}$/);return match?new Date(`${value}T12:00:00Z`):null;}
function addDays(value,days){const date=dateFrom(value);if(!date||Number.isNaN(date.getTime()))return'';date.setUTCDate(date.getUTCDate()+Number(days||0));return date.toISOString().slice(0,10);}
function todayLondon(reference=new Date()){
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(reference);}catch(error){return reference.toISOString().slice(0,10);}
}
function londonMinutes(reference=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(reference);
    const hour=Number(parts.find(part=>part.type==='hour')?.value),minute=Number(parts.find(part=>part.type==='minute')?.value);
    return Number.isFinite(hour)&&Number.isFinite(minute)?hour*60+minute:0;
  }catch(error){return reference.getHours()*60+reference.getMinutes();}
}
function timeMinutes(value){const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!match)return null;const hour=Number(match[1]),minute=Number(match[2]);return hour>=0&&hour<24&&minute>=0&&minute<60?hour*60+minute:null;}
function sortJourneys(a,b){return `${a.date||''}|${a.scheduledDeparture||'99:99'}`.localeCompare(`${b.date||''}|${b.scheduledDeparture||'99:99'}`);}
function splitJourneys(rows,{today=todayLondon(),nowMinutes=londonMinutes()}={}){
  const active=(Array.isArray(rows)?rows:[]).slice().sort(sortJourneys),past=active.filter(item=>String(item.date||'')<today).sort((a,b)=>sortJourneys(b,a)),allUpcoming=active.filter(item=>String(item.date||'')>=today);
  const next=allUpcoming.find(item=>String(item.date||'')>today||(timeMinutes(item.scheduledDeparture)==null||timeMinutes(item.scheduledDeparture)>=nowMinutes-15))||allUpcoming[0]||null;
  return {next,upcoming:allUpcoming.filter(item=>!next||item.id!==next.id),past,allUpcoming};
}
function nextRepeatDate(journeyDate,today=todayLondon()){
  let next=addDays(journeyDate,7);
  if(!next)next=addDays(today,7);
  while(next&&next<today)next=addDays(next,7);
  return next||today;
}
function hashText(value){let hash=2166136261;for(const char of String(value||'')){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(36);}
function repeatedId(journey,date,stamp){return `repeat-${hashText(`${journeyIdentity({...journey,date})}|${stamp}`)}-${String(stamp||'').replace(/\D/g,'').slice(-10)}`;}
function buildRepeatedJourney(journey,date,stamp=nowIso()){
  if(!journey||!dateFrom(date))return null;
  const next={...journey,
    v:1,
    id:'',
    date:String(date),
    savedAt:String(stamp),
    refreshedAt:'',
    from:journey.from?{...journey.from}:journey.from,
    to:journey.to?{...journey.to}:journey.to,
    service:selector(journey.service),
    first:selector(journey.first),
    onward:selector(journey.onward),
    constraints:journey.constraints?{...journey.constraints}:{maxChanges:1,connectionBuffer:0}
  };
  next.id=repeatedId(next,date,stamp);return next;
}
function buildEditedJourney(saved,row,context={},stamp=nowIso()){
  if(!saved||!row)return null;
  const from=context.from||{},to=context.to||{},date=String(context.date||'');
  if(!from.crs||!to.crs||String(from.crs).toUpperCase()===String(to.crs).toUpperCase()||!dateFrom(date))return null;
  const connection=row.journeyType==='connection'&&Array.isArray(row.legs)&&row.legs.length>=2,first=connection?row.legs[0]:null,onward=connection?row.legs[1]:null;
  return {
    ...saved,
    v:1,
    id:String(saved.id||''),
    savedAt:String(saved.savedAt||stamp),
    refreshedAt:String(stamp),
    date,
    from:{crs:String(from.crs).toUpperCase(),name:String(from.name||from.stationName||from.crs)},
    to:{crs:String(to.crs).toUpperCase(),name:String(to.name||to.stationName||to.crs)},
    journeyType:connection?'connection':'direct',
    service:selector(row),
    first:connection?selector(first):selector(null),
    onward:connection?selector(onward):selector(null),
    change:connection?String(row.interchange&&row.interchange.crs||'').toUpperCase():'',
    scheduledDeparture:String(row.std||row.departure||''),
    scheduledArrival:String(row.arrival||''),
    searchStart:String(context.searchStart||''),
    searchEnd:String(context.searchEnd||''),
    preference:String(context.preference||'balanced'),
    constraints:{
      maxChanges:Number(context.constraints&&context.constraints.maxChanges)===0?0:1,
      connectionBuffer:[0,5,10,15].includes(Number(context.constraints&&context.constraints.connectionBuffer))?Number(context.constraints.connectionBuffer):0
    }
  };
}
function usableJourney(value,idHint=''){
  if(!value||typeof value!=='object')return null;
  const id=String(value.id||idHint||''),date=String(value.date||''),from=String(value.from&&value.from.crs||''),to=String(value.to&&value.to.crs||'');
  return id&&dateFrom(date)&&from&&to?{...value,id}:null;
}
function normaliseArchiveEntry(value,idHint=''){
  if(!value||typeof value!=='object')return null;
  const journey=usableJourney(value.journey||value,idHint);if(!journey)return null;
  const meta=value.journey?(value.meta&&typeof value.meta==='object'?value.meta:null):null;
  return {journey,meta,archivedAt:String(value.archivedAt||'')};
}
function migratePolishValue(value,stamp=nowIso()){
  const store={schema:SCHEMA,archived:{},updatedAt:'',migratedAt:''};let changed=false;
  let archivedInput={};
  if(Array.isArray(value)){archivedInput=value;changed=true;}
  else if(value&&typeof value==='object'){
    archivedInput=value.archived||{};
    changed=Number(value.schema)!==SCHEMA;
    store.updatedAt=String(value.updatedAt||'');store.migratedAt=String(value.migratedAt||'');
  }else{changed=true;archivedInput={};}
  const entries=Array.isArray(archivedInput)?archivedInput.map((item,index)=>[String(item&&item.id||index),item]):Object.entries(archivedInput||{});
  for(const [key,valueEntry] of entries){const entry=normaliseArchiveEntry(valueEntry,key);if(!entry){changed=true;continue;}store.archived[entry.journey.id]=entry;if(key!==entry.journey.id)changed=true;}
  if(changed&&!store.migratedAt)store.migratedAt=String(stamp);
  return {store,changed};
}
function memorySafeJson(value){try{return JSON.stringify(value);}catch(error){return'';}}
function backupStorage(storage,key,raw,label,stamp=nowIso()){
  if(!storage||typeof storage.setItem!=='function'||raw==null)return'';
  const compact=String(stamp).replace(/[^0-9A-Za-z]/g,'').slice(0,24)||String(Date.now()),base=`${RECOVERY_PREFIX}.${label}.${compact}`;let target=base,index=1;
  try{while(storage.getItem(target)!=null){target=`${base}.${index++}`;}storage.setItem(target,String(raw));return target;}catch(error){return'';}
}
function readPolishStore(storage=global.localStorage,stamp=nowIso()){
  const fallback={schema:SCHEMA,archived:{},updatedAt:'',migratedAt:''};if(!storage)return {store:fallback,recovered:false,backupKey:''};
  const raw=storage.getItem(POLISH_KEY);if(!raw)return {store:fallback,recovered:false,backupKey:''};
  try{
    const parsed=JSON.parse(raw),migration=migratePolishValue(parsed,stamp);let backupKey='';
    if(migration.changed){backupKey=backupStorage(storage,POLISH_KEY,raw,'polish-v3',stamp);migration.store.updatedAt=String(stamp);storage.setItem(POLISH_KEY,JSON.stringify(migration.store));}
    return {store:migration.store,recovered:migration.changed,backupKey};
  }catch(error){
    const backupKey=backupStorage(storage,POLISH_KEY,raw,'polish-v3-corrupt',stamp);storage.setItem(POLISH_KEY,JSON.stringify(fallback));return {store:fallback,recovered:true,backupKey,error:String(error&&error.message||error)};
  }
}
function writePolishStore(store=runtime.store,storage=global.localStorage,stamp=nowIso()){
  if(!storage||!store)return false;store.schema=SCHEMA;store.updatedAt=String(stamp);try{storage.setItem(POLISH_KEY,JSON.stringify(store));return true;}catch(error){return false;}
}
function emptyMeta(){return {entries:{},coverageKey:'',updatedAt:''};}
function parseMeta(raw){
  const value=JSON.parse(raw||'{}');
  if(!value||typeof value!=='object'||Array.isArray(value)||!value.entries||typeof value.entries!=='object'||Array.isArray(value.entries))throw new Error('Saved journey metadata has an invalid shape');
  return {entries:value.entries,coverageKey:String(value.coverageKey||''),updatedAt:String(value.updatedAt||'')};
}
function repairMetaStore(storage=global.localStorage,stamp=nowIso()){
  if(!storage)return {meta:emptyMeta(),repaired:false,backupKey:''};const raw=storage.getItem(META_KEY);if(!raw)return {meta:emptyMeta(),repaired:false,backupKey:''};
  try{return {meta:parseMeta(raw),repaired:false,backupKey:''};}
  catch(error){const backupKey=backupStorage(storage,META_KEY,raw,'saved-meta-v2-corrupt',stamp),meta=emptyMeta();storage.setItem(META_KEY,JSON.stringify(meta));return {meta,repaired:true,backupKey,error:String(error&&error.message||error)};}
}
function repairSavedStore(storage=global.localStorage,plannerApi=planner(),stamp=nowIso()){
  if(!storage)return {rows:[],repaired:false,backupKey:'',removed:[]};const raw=storage.getItem(SAVED_KEY);if(!raw)return {rows:[],repaired:false,backupKey:'',removed:[]};
  let parsed;
  try{parsed=JSON.parse(raw);if(!Array.isArray(parsed))throw new Error('Saved journeys must be an array');}
  catch(error){const backupKey=backupStorage(storage,SAVED_KEY,raw,'saved-v1-corrupt',stamp);storage.setItem(SAVED_KEY,'[]');return {rows:[],repaired:true,backupKey,removed:[],error:String(error&&error.message||error)};}
  let normalised=parsed;
  try{if(plannerApi&&typeof plannerApi.readSavedJourneys==='function')normalised=plannerApi.readSavedJourneys();}catch(error){normalised=parsed.filter(item=>usableJourney(item));}
  const result=dedupeJourneys(normalised),rows=result.rows.slice(0,MAX_ACTIVE),changed=result.removed.length>0||rows.length!==parsed.length||memorySafeJson(rows)!==memorySafeJson(parsed);
  if(!changed)return {rows,repaired:false,backupKey:'',removed:result.removed};
  const backupKey=backupStorage(storage,SAVED_KEY,raw,'saved-v1-migrated',stamp);storage.setItem(SAVED_KEY,JSON.stringify(rows));return {rows,repaired:true,backupKey,removed:result.removed};
}
function readMetaStore(storage=global.localStorage){try{return parseMeta(storage&&storage.getItem(META_KEY)||JSON.stringify(emptyMeta()));}catch(error){return emptyMeta();}}
function writeMetaStore(meta,storage=global.localStorage){try{meta.updatedAt=nowIso();storage.setItem(META_KEY,JSON.stringify(meta));return true;}catch(error){return false;}}
function activeRows(){const api=planner();try{return api&&typeof api.readSavedJourneys==='function'?api.readSavedJourneys():JSON.parse(global.localStorage.getItem(SAVED_KEY)||'[]');}catch(error){return[];}}
function writeActiveRows(rows){
  const api=planner();try{global.localStorage.setItem(SAVED_KEY,JSON.stringify((Array.isArray(rows)?rows:[]).slice(0,MAX_ACTIVE)));if(api&&api.planState&&typeof api.readSavedJourneys==='function')api.planState.saved=api.readSavedJourneys();return true;}catch(error){return false;}
}
function removeMeta(id){const meta=readMetaStore();if(meta.entries&&Object.prototype.hasOwnProperty.call(meta.entries,id)){delete meta.entries[id];writeMetaStore(meta);}const v2=savedV2();if(v2&&v2.state&&v2.state.meta)v2.state.meta=meta;}
function restoreMeta(id,value){if(!value||typeof value!=='object')return;const meta=readMetaStore();meta.entries[id]=value;writeMetaStore(meta);const v2=savedV2();if(v2&&v2.state)v2.state.meta=meta;}
function duplicateLocation(journey,{excludeId=''}={}){
  const identity=journeyIdentity(journey);if(!identity)return null;
  for(const item of activeRows()){if(item.id!==excludeId&&journeyIdentity(item)===identity)return {where:'saved',journey:item};}
  const archived=runtime.store&&runtime.store.archived||{};for(const entry of Object.values(archived)){const item=entry&&entry.journey;if(item&&item.id!==excludeId&&journeyIdentity(item)===identity)return {where:'archived',journey:item};}
  return null;
}
function dateLabel(value){const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});}
function intentLabel(saved){const start=String(saved&&saved.searchStart||''),end=String(saved&&saved.searchEnd||''),windowText=start&&end?`${start}–${end}`:'saved time window',preference=PREF_LABELS[saved&&saved.preference]||'Balanced',constraints=saved&&saved.constraints||{},changes=Number(constraints.maxChanges)===0?'Direct only':'Up to 1 change',buffer=Number(constraints.connectionBuffer)||0;return `${windowText} · ${preference} · ${changes}${buffer?` · +${buffer} min buffer`:''}`;}
function setNotice(message,tone=''){
  runtime.notice=String(message||'');runtime.noticeTone=String(tone||'');const node=$('savedJourneyPolishNotice');if(node){node.textContent=runtime.notice;node.dataset.tone=runtime.noticeTone;node.hidden=!runtime.notice;}
}
function plannerMessage(message,isError=false){const node=$('planJourneyMessage');if(node){node.textContent=String(message||'');node.classList.toggle('error',!!isError);}}
function ensureNotice(){const head=$('savedJourneySurface')?.querySelector('.saved-v2-head');if(!head||$('savedJourneyPolishNotice'))return;const note=document.createElement('p');note.id='savedJourneyPolishNotice';note.className='saved-polish-notice';note.setAttribute('aria-live','polite');note.hidden=!runtime.notice;note.textContent=runtime.notice;note.dataset.tone=runtime.noticeTone;head.appendChild(note);}
function ensureNextSummary(split){
  const sidebar=$('savedJourneySidebar');if(!sidebar)return;let node=$('savedJourneyNextSummary');if(!node){node=document.createElement('div');node.id='savedJourneyNextSummary';node.className='saved-polish-next-summary';const summary=sidebar.querySelector('.saved-v2-summary');if(summary)summary.insertAdjacentElement('afterend',node);else sidebar.appendChild(node);}
  if(!split.next){node.hidden=true;node.innerHTML='';return;}node.hidden=false;node.innerHTML=`<span>Next journey</span><strong>${esc(split.next.from&&split.next.from.name||split.next.from&&split.next.from.crs||'Journey')} → ${esc(split.next.to&&split.next.to.name||split.next.to&&split.next.to.crs||'')}</strong><small>${esc(dateLabel(split.next.date))} · ${esc(split.next.scheduledDeparture||'—')}</small>`;
}
function installStyles(){if(!hasDom()||$('kerbsideSavedJourneysPolishStyles'))return;const style=document.createElement('style');style.id='kerbsideSavedJourneysPolishStyles';style.textContent=`
.saved-polish-notice{margin:9px 0 0!important;padding:8px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--ink);color:var(--text-dim)!important}.saved-polish-notice[data-tone="success"]{border-color:rgb(var(--led-rgb) / .35);color:var(--led)!important}.saved-polish-notice[data-tone="warn"]{color:var(--warn)!important}.saved-polish-next-summary{display:grid;gap:3px;padding:10px;border:1px solid rgb(var(--led-rgb) / .32);border-radius:10px;background:rgb(var(--led-rgb) / .055)}.saved-polish-next-summary[hidden]{display:none}.saved-polish-next-summary span{color:var(--led);font-size:8.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.saved-polish-next-summary strong{font-size:10.5px;line-height:1.4}.saved-polish-next-summary small{color:var(--text-dim);font-size:9px}
.saved-polish-group{display:grid;gap:9px}.saved-polish-group-heading{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:3px 2px;color:var(--text)}.saved-polish-group-heading strong{font-size:11px}.saved-polish-group-heading span{color:var(--text-mute);font-size:9px}.saved-polish-next>.saved-polish-group-heading strong{color:var(--led);font-size:12px}.saved-polish-next .saved-v2-card{border-color:rgb(var(--led-rgb) / .52);box-shadow:inset 3px 0 0 var(--led)}.saved-polish-next-badge{display:inline-flex;margin-left:6px;padding:3px 6px;border:1px solid rgb(var(--led-rgb) / .35);border-radius:999px;color:var(--led);font-size:8px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}.saved-polish-details{border:0}.saved-polish-details>summary{display:flex;justify-content:space-between;gap:8px;cursor:pointer;padding:6px 2px;color:var(--text);font-size:11px;font-weight:800}.saved-polish-details>summary span{color:var(--text-mute);font-size:9px}.saved-polish-details-body{display:grid;gap:9px;margin-top:4px}
.saved-polish-actions{display:contents}.saved-v2-card button.saved-polish-edit,.saved-v2-card button.saved-polish-repeat{color:var(--led)}.saved-v2-card button.saved-polish-archive{color:var(--text-dim)}.saved-v2-card button.saved-polish-delete{color:var(--warn)}.saved-polish-inline{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,170px) auto auto;gap:6px;align-items:end;padding:9px;border:1px solid var(--rule);border-radius:9px;background:var(--ink)}.saved-polish-inline label{display:grid;gap:4px;color:var(--text-dim);font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.saved-polish-inline input{min-height:36px;padding:7px 8px;border:1px solid var(--rule);border-radius:8px;background:var(--ink-2);color:var(--text);font-size:16px}.saved-polish-inline button{min-height:36px!important}.saved-polish-archived-card{opacity:.9}.saved-polish-archived-card .saved-v2-status{color:var(--text-dim)}
.saved-polish-edit-banner{display:grid;gap:6px;padding:10px;border:1px solid rgb(var(--led-rgb) / .42);border-radius:10px;background:rgb(var(--led-rgb) / .06)}.saved-polish-edit-banner strong{color:var(--led);font-size:11px}.saved-polish-edit-banner span{color:var(--text-dim);font-size:10px;line-height:1.45}.saved-polish-edit-banner button{justify-self:start;min-height:32px;padding:6px 9px;border:1px solid var(--rule);border-radius:8px;background:var(--ink);color:var(--text);font-size:9.5px;font-weight:800}
@media(max-width:820px){.saved-polish-inline{grid-template-columns:1fr 1fr}.saved-polish-inline label{grid-column:1/-1}.saved-polish-next-summary{padding:8px}.saved-polish-group-heading{padding-inline:1px}}
`;document.head.appendChild(style);}
function decorateCard(card,saved,isNext=false){
  if(!card||!saved)return card;card.classList.toggle('saved-polish-is-next',!!isNext);const id=String(saved.id||'');
  const header=card.querySelector('header');if(header){header.querySelectorAll('.saved-polish-next-badge').forEach(node=>node.remove());if(isNext){const badge=document.createElement('span');badge.className='saved-polish-next-badge';badge.textContent='Next journey';const left=header.querySelector('div');if(left)left.appendChild(badge);}}
  const actions=card.querySelector('footer>div');if(actions){
    const legacy=actions.querySelector('[data-saved-v2-remove]');if(legacy){legacy.removeAttribute('data-saved-v2-remove');legacy.setAttribute('data-saved-polish-delete',id);legacy.classList.add('saved-polish-delete');legacy.textContent='Delete';}
    if(!actions.querySelector('[data-saved-polish-edit]'))actions.insertAdjacentHTML('beforeend',`<button type="button" class="saved-polish-edit" data-saved-polish-edit="${esc(id)}">Edit</button><button type="button" class="saved-polish-repeat" data-saved-polish-repeat="${esc(id)}">Repeat</button><button type="button" class="saved-polish-archive" data-saved-polish-archive="${esc(id)}">Archive</button>`);
  }
  return card;
}
function archivedCard(entry){
  const saved=entry&&entry.journey;if(!saved)return null;const meta=entry.meta&&typeof entry.meta==='object'?entry.meta:{},resolved=meta.lastResolved||{},times=`${resolved.departure||saved.scheduledDeparture||'—'} → ${resolved.arrival||saved.scheduledArrival||'—'}`;const card=document.createElement('article');card.className='saved-v2-card saved-polish-archived-card';card.dataset.savedPolishArchivedId=saved.id;card.innerHTML=`<header><div><span class="saved-v2-date">${esc(dateLabel(saved.date))}</span><h3>${esc(saved.from&&saved.from.name||saved.from&&saved.from.crs||'')} → ${esc(saved.to&&saved.to.name||saved.to&&saved.to.crs||'')}</h3></div><span class="saved-v2-status">Archived</span></header><div class="saved-v2-times"><strong>${esc(times)}</strong></div><div class="saved-v2-intent"><span>Saved plan</span><strong>${esc(intentLabel(saved))}</strong></div><footer><span>${entry.archivedAt?`Archived ${esc(dateLabel(String(entry.archivedAt).slice(0,10)))}`:'Archived journey'}</span><div><button type="button" data-saved-polish-restore="${esc(saved.id)}">Restore</button><button type="button" class="saved-polish-repeat" data-saved-polish-repeat-archived="${esc(saved.id)}">Repeat</button><button type="button" class="saved-polish-delete" data-saved-polish-delete-archived="${esc(saved.id)}">Delete</button></div></footer></article>`;return card;
}
function sectionHeading(title,count){const head=document.createElement('div');head.className='saved-polish-group-heading';head.innerHTML=`<strong>${esc(title)}</strong><span>${Number(count)||0}</span>`;return head;}
function renderFromBase(){
  runtime.renderQueued=false;const list=$('savedJourneyList'),v2=savedV2();if(!list||!v2||!v2.state)return false;
  const baseCards=[...list.children].filter(node=>node.classList&&node.classList.contains('saved-v2-card')),baseEmpty=[...list.children].find(node=>node.classList&&node.classList.contains('saved-v2-empty'));
  if(!baseCards.length&&!baseEmpty)return false;
  const rows=Array.isArray(v2.state.saved)?v2.state.saved.slice():activeRows(),byId=new Map(baseCards.map(card=>[String(card.dataset.savedV2Id||''),card])),split=splitJourneys(rows),fragment=document.createDocumentFragment();
  if(split.next){const wrap=document.createElement('section');wrap.className='saved-polish-group saved-polish-next';wrap.appendChild(sectionHeading('Next journey',1));const card=byId.get(String(split.next.id));if(card)wrap.appendChild(decorateCard(card,split.next,true));fragment.appendChild(wrap);}
  if(split.upcoming.length){const wrap=document.createElement('section');wrap.className='saved-polish-group saved-polish-upcoming';wrap.appendChild(sectionHeading('Upcoming',split.upcoming.length));for(const saved of split.upcoming){const card=byId.get(String(saved.id));if(card)wrap.appendChild(decorateCard(card,saved,false));}fragment.appendChild(wrap);}
  if(split.past.length){const details=document.createElement('details');details.className='saved-polish-details saved-polish-past';details.open=!split.allUpcoming.length;details.innerHTML=`<summary>Past journeys <span>${split.past.length}</span></summary>`;const body=document.createElement('div');body.className='saved-polish-details-body';for(const saved of split.past){const card=byId.get(String(saved.id));if(card)body.appendChild(decorateCard(card,saved,false));}details.appendChild(body);fragment.appendChild(details);}
  const archived=Object.values(runtime.store&&runtime.store.archived||{}).sort((a,b)=>sortJourneys(b.journey||{},a.journey||{}));if(archived.length){const details=document.createElement('details');details.className='saved-polish-details saved-polish-archived';details.innerHTML=`<summary>Archived <span>${archived.length}</span></summary>`;const body=document.createElement('div');body.className='saved-polish-details-body';for(const entry of archived){const card=archivedCard(entry);if(card)body.appendChild(card);}details.appendChild(body);fragment.appendChild(details);}
  if(!rows.length&&!archived.length){fragment.appendChild(baseEmpty||(()=>{const empty=document.createElement('div');empty.className='saved-v2-empty';empty.innerHTML='<strong>No saved journeys yet</strong><span>Save an option from Plan my journey. It will appear here.</span>';return empty;})());}
  list.replaceChildren(fragment);ensureNotice();ensureNextSummary(split);
  const activeCount=rows.length,tabCount=$('savedJourneyTabCount'),headCount=$('savedJourneyCount'),sideCount=$('savedJourneySidebarCount');if(tabCount)tabCount.textContent=activeCount?String(activeCount):'';if(headCount)headCount.textContent=String(activeCount);if(sideCount)sideCount.textContent=String(activeCount);const auto=$('savedJourneyAutoMeta');if(auto)auto.textContent=`${split.allUpcoming.length} upcoming · ${split.past.length} past · ${archived.length} archived. Upcoming journeys keep refreshing automatically.`;
  if(runtime.flashId){const flash=[...list.querySelectorAll('[data-saved-v2-id]')].find(node=>String(node.dataset&&node.dataset.savedV2Id||'')===runtime.flashId);if(flash){flash.classList.add('saved-polish-is-next');setTimeout(()=>flash.classList.remove('saved-polish-is-next'),1800);}runtime.flashId='';}
  return true;
}
function queueRender(){if(runtime.renderQueued)return;runtime.renderQueued=true;setTimeout(renderFromBase,0);}
function rerender(){const v2=savedV2();if(v2&&typeof v2.syncSaved==='function')v2.syncSaved();else queueRender();}
function addRepeatForm(card,id,journey,archived=false){
  card.querySelectorAll('.saved-polish-inline').forEach(node=>node.remove());const form=document.createElement('form');form.className='saved-polish-inline';form.dataset.savedPolishRepeatForm=id;form.dataset.archived=archived?'true':'false';const date=nextRepeatDate(journey&&journey.date);form.innerHTML=`<label>Repeat on<input name="date" type="date" min="${esc(todayLondon())}" value="${esc(date)}" required></label><button type="submit">Save repeat</button><button type="button" data-saved-polish-repeat-cancel>Cancel</button>`;card.appendChild(form);form.querySelector('input')?.focus();}
async function saveRepeat(id,date,{archived=false}={}){
  const source=archived?runtime.store?.archived?.[id]?.journey:activeRows().find(item=>item.id===id);if(!source)return false;if(activeRows().length>=MAX_ACTIVE){setNotice('You already have 12 active saved journeys. Archive or delete one before repeating another.','warn');return false;}
  const repeated=buildRepeatedJourney(source,date);if(!repeated){setNotice('Choose a valid date for the repeated journey.','warn');return false;}const duplicate=duplicateLocation(repeated);if(duplicate){setNotice(`That journey is already ${duplicate.where==='archived'?'in Archived':'saved'}.`,'warn');return false;}
  if(!writeActiveRows([repeated,...activeRows()]))return false;runtime.flashId=repeated.id;const v2=savedV2();if(v2&&typeof v2.syncSaved==='function')v2.syncSaved();setNotice(`Repeated journey saved for ${dateLabel(date)}.`,'success');if(v2&&typeof v2.refreshSavedJourney==='function')v2.refreshSavedJourney(repeated.id,{force:true,reason:'repeat'}).catch?.(()=>{});return true;
}
function archiveJourney(id){
  const rows=activeRows(),saved=rows.find(item=>item.id===id);if(!saved)return false;const meta=readMetaStore(),snapshot=meta.entries&&meta.entries[id]||null;runtime.store.archived[id]={journey:saved,meta:snapshot,archivedAt:nowIso()};if(!writePolishStore())return false;if(meta.entries)delete meta.entries[id];writeMetaStore(meta);writeActiveRows(rows.filter(item=>item.id!==id));const v2=savedV2();if(v2&&v2.state)v2.state.meta=meta;if(v2&&typeof v2.syncSaved==='function')v2.syncSaved();setNotice('Journey archived. It will no longer auto-refresh until you restore it.','success');return true;
}
function restoreJourney(id){
  const entry=runtime.store?.archived?.[id];if(!entry||!entry.journey)return false;const rows=activeRows();if(rows.length>=MAX_ACTIVE){setNotice('You already have 12 active saved journeys. Archive or delete one before restoring this trip.','warn');return false;}const duplicate=duplicateLocation(entry.journey,{excludeId:id});if(duplicate&&duplicate.where==='saved'){setNotice('This journey is already saved, so the archived copy was not restored.','warn');return false;}
  if(!writeActiveRows([entry.journey,...rows]))return false;if(entry.meta)restoreMeta(id,entry.meta);delete runtime.store.archived[id];writePolishStore();runtime.flashId=id;rerender();setNotice('Journey restored and automatic refresh is back on.','success');const v2=savedV2();if(v2&&typeof v2.refreshSavedJourney==='function')v2.refreshSavedJourney(id,{force:true,reason:'restore'}).catch?.(()=>{});return true;
}
function confirmDelete(label){return typeof global.confirm!=='function'||global.confirm(`Delete ${label||'this saved journey'} permanently? This cannot be undone.`);}
function deleteActive(id){const rows=activeRows(),saved=rows.find(item=>item.id===id);if(!saved||!confirmDelete(`${saved.from?.name||'this journey'} → ${saved.to?.name||''}`))return false;writeActiveRows(rows.filter(item=>item.id!==id));removeMeta(id);rerender();setNotice('Saved journey deleted.','success');return true;}
function deleteArchived(id){const entry=runtime.store?.archived?.[id];if(!entry||!confirmDelete(`${entry.journey?.from?.name||'this archived journey'} → ${entry.journey?.to?.name||''}`))return false;delete runtime.store.archived[id];writePolishStore();rerender();setNotice('Archived journey deleted.','success');return true;}
function editContext(){const state=planner()?.planState||{};return {from:state.from,to:state.to,date:$('planJourneyDate')?.value||'',searchStart:$('planJourneyStart')?.value||'',searchEnd:$('planJourneyEnd')?.value||'',preference:$('planJourneyPreference')?.value||state.preference||'balanced',constraints:{maxChanges:Number($('planJourneyMaxChanges')?.value||state.constraints?.maxChanges||1),connectionBuffer:Number($('planJourneyConnectionBuffer')?.value||state.constraints?.connectionBuffer||0)}};}
function ensureEditBanner(saved){const form=$('planJourneyForm');if(!form)return;let banner=$('savedJourneyEditBanner');if(!banner){banner=document.createElement('div');banner.id='savedJourneyEditBanner';banner.className='saved-polish-edit-banner';const anchor=form.querySelector('p');if(anchor)anchor.insertAdjacentElement('afterend',banner);else form.prepend(banner);}banner.innerHTML=`<strong>Editing saved journey</strong><span>${esc(saved?.from?.name||'')} → ${esc(saved?.to?.name||'')}. Change the route, date, time window or preferences, compare journeys, then choose <b>Save changes</b> on the option you want to keep.</span><button type="button" data-saved-polish-cancel-edit>Cancel editing</button>`;}
function updateEditButtons(){if(!runtime.editingId)return;for(const button of document.querySelectorAll('#planJourneyResults [data-plan-save-key]')){if(!button.dataset.savedPolishOriginalText)button.dataset.savedPolishOriginalText=button.textContent||'';if(button.textContent!=='Save changes')button.textContent='Save changes';button.setAttribute('aria-pressed','false');button.dataset.savedPolishSaveChanges='true';}}
function cancelEdit({message='Editing cancelled.'}={}){runtime.editingId='';$('savedJourneyEditBanner')?.remove();for(const button of document.querySelectorAll('#planJourneyResults [data-saved-polish-save-changes]')){button.textContent=button.dataset.savedPolishOriginalText||'Save journey';delete button.dataset.savedPolishOriginalText;delete button.dataset.savedPolishSaveChanges;}if(message)plannerMessage(message,false);}
async function beginEdit(id){
  const api=planner(),saved=activeRows().find(item=>item.id===id);if(!api||!saved||typeof api.planOpenSavedJourney!=='function')return false;runtime.editingId=id;const v2=savedV2();if(v2&&typeof v2.exitSavedView==='function')v2.exitSavedView();await api.planOpenSavedJourney(id);ensureEditBanner(saved);updateEditButtons();plannerMessage('Edit the journey, compare options, then choose Save changes.',false);return true;
}
function rowForSaveButton(button){const article=button&&button.closest&&button.closest('[data-plan-rank]'),index=Number(article&&article.getAttribute('data-plan-rank'))-1,results=planner()?.planState?.results||[];return Number.isInteger(index)&&index>=0?results[index]||null:null;}
async function commitEdit(button){
  const id=runtime.editingId,saved=activeRows().find(item=>item.id===id),row=rowForSaveButton(button);if(!id||!saved||!row)return false;const edited=buildEditedJourney(saved,row,editContext());if(!edited){plannerMessage('Kerbside could not build the edited journey. Re-select the route and compare journeys again.',true);return false;}const duplicate=duplicateLocation(edited,{excludeId:id});if(duplicate){plannerMessage(`That exact journey is already ${duplicate.where==='archived'?'in Archived':'saved'}. Choose another option or remove the duplicate first.`,true);return false;}
  const rows=activeRows().map(item=>item.id===id?edited:item);if(!writeActiveRows(rows)){plannerMessage('Kerbside could not save the edited journey on this device.',true);return false;}removeMeta(id);const v2=savedV2();if(v2&&typeof v2.syncSaved==='function')v2.syncSaved({render:false});runtime.editingId='';$('savedJourneyEditBanner')?.remove();runtime.flashId=id;if(v2&&typeof v2.refreshSavedJourney==='function')await v2.refreshSavedJourney(id,{force:true,reason:'edit'});setNotice('Saved journey updated. Its timetable baseline now reflects the option you chose.','success');if(v2&&typeof v2.enterSavedView==='function')v2.enterSavedView();else rerender();return true;
}
function onListClick(event){
  const target=event.target&&event.target.closest?event.target:null;if(!target)return;const edit=target.closest('[data-saved-polish-edit]'),repeat=target.closest('[data-saved-polish-repeat]'),repeatArchived=target.closest('[data-saved-polish-repeat-archived]'),archive=target.closest('[data-saved-polish-archive]'),restore=target.closest('[data-saved-polish-restore]'),del=target.closest('[data-saved-polish-delete]'),delArchived=target.closest('[data-saved-polish-delete-archived]'),cancel=target.closest('[data-saved-polish-repeat-cancel]');
  if(edit){event.preventDefault();beginEdit(edit.getAttribute('data-saved-polish-edit'));return;}if(repeat){event.preventDefault();const id=repeat.getAttribute('data-saved-polish-repeat'),saved=activeRows().find(item=>item.id===id),card=repeat.closest('.saved-v2-card');if(saved&&card)addRepeatForm(card,id,saved,false);return;}if(repeatArchived){event.preventDefault();const id=repeatArchived.getAttribute('data-saved-polish-repeat-archived'),saved=runtime.store?.archived?.[id]?.journey,card=repeatArchived.closest('.saved-v2-card');if(saved&&card)addRepeatForm(card,id,saved,true);return;}if(archive){event.preventDefault();archiveJourney(archive.getAttribute('data-saved-polish-archive'));return;}if(restore){event.preventDefault();restoreJourney(restore.getAttribute('data-saved-polish-restore'));return;}if(del){event.preventDefault();deleteActive(del.getAttribute('data-saved-polish-delete'));return;}if(delArchived){event.preventDefault();deleteArchived(delArchived.getAttribute('data-saved-polish-delete-archived'));return;}if(cancel){event.preventDefault();cancel.closest('.saved-polish-inline')?.remove();}
}
function onListSubmit(event){const form=event.target&&event.target.closest&&event.target.closest('[data-saved-polish-repeat-form]');if(!form)return;event.preventDefault();const date=form.elements&&form.elements.date&&form.elements.date.value||'',id=form.dataset.savedPolishRepeatForm,archived=form.dataset.archived==='true';saveRepeat(id,date,{archived}).then(ok=>{if(ok)form.remove();});}
function onDocumentCapture(event){
  const target=event.target&&event.target.closest?event.target:null;if(!target)return;if(runtime.editingId){const save=target.closest('#planJourneyResults [data-plan-save-key]');if(save){event.preventDefault();event.stopImmediatePropagation();commitEdit(save);return;}const leave=target.closest('[data-train-view="trains"],[data-train-view="saved"]');if(leave)cancelEdit({message:''});}
  const cancel=target.closest('[data-saved-polish-cancel-edit]');if(cancel){event.preventDefault();event.stopImmediatePropagation();cancelEdit();}
}
function installObservers(){
  const list=$('savedJourneyList');if(list&&typeof MutationObserver==='function'&&!runtime.observer){runtime.observer=new MutationObserver(()=>{const base=[...list.children].some(node=>node.classList&&(node.classList.contains('saved-v2-card')||node.classList.contains('saved-v2-empty')));if(base)queueRender();});runtime.observer.observe(list,{childList:true});}
  const results=$('planJourneyResults');if(results&&typeof MutationObserver==='function'&&!runtime.resultsObserver){runtime.resultsObserver=new MutationObserver(()=>{if(runtime.editingId)updateEditButtons();});runtime.resultsObserver.observe(results,{childList:true,subtree:true});}
}
function recoverStores(){
  const stamp=nowIso(),savedRepair=repairSavedStore(global.localStorage,planner(),stamp),metaRepair=repairMetaStore(global.localStorage,stamp),polish=readPolishStore(global.localStorage,stamp);runtime.store=polish.store;runtime.recovery=[savedRepair,metaRepair,polish].filter(item=>item&&(item.recovered||item.repaired));const v2=savedV2();if(v2&&v2.state)v2.state.meta=metaRepair.meta;if(runtime.recovery.length)setNotice('Kerbside repaired older or damaged saved-journey data and kept a recovery copy on this device.','warn');return {savedRepair,metaRepair,polish};
}
function install(){
  if(runtime.installed)return true;if(!hasDom())return false;const api=planner(),v2=savedV2(),list=$('savedJourneyList');if(!api||!api.planState||!api.planState.installed||!v2||!v2.state||!v2.state.installed||!list)return false;installStyles();recoverStores();ensureNotice();installObservers();list.addEventListener('click',onListClick);list.addEventListener('submit',onListSubmit);document.addEventListener('click',onDocumentCapture,true);global.addEventListener?.('storage',event=>{if(event.key===POLISH_KEY){runtime.store=readPolishStore(global.localStorage).store;rerender();}});runtime.installed=true;v2.syncSaved();queueRender();return true;
}
function init(){if(install())return;if(++runtime.attempts<INIT_RETRY_MAX)setTimeout(init,INIT_RETRY_MS);else console.warn('Kerbside Saved Journeys polish could not attach.');}

const publicApi={version:VERSION,schema:SCHEMA,keys:{saved:SAVED_KEY,meta:META_KEY,polish:POLISH_KEY,recoveryPrefix:RECOVERY_PREFIX},runtime,install,render:renderFromBase,beginEdit,cancelEdit,commitEdit,archiveJourney,restoreJourney,deleteActive,deleteArchived,saveRepeat,repairSavedStore,repairMetaStore,readPolishStore,writePolishStore,helpers:{selector,selectorIdentity,journeyIdentity,dedupeJourneys,splitJourneys,nextRepeatDate,buildRepeatedJourney,buildEditedJourney,migratePolishValue,normaliseArchiveEntry,backupStorage,hashText}};
global.__KERBSIDE_SAVED_JOURNEYS_POLISH__=publicApi;
if(hasDom()){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();}

})(typeof window!=='undefined'?window:globalThis);
