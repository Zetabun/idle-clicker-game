(function(){
'use strict';

const $=id=>document.getElementById(id);
const DATA_BASE='kerbside-rail-timetable';
const MAX_RESULTS=24;
const state={loading:false,request:0,services:[],signature:'',mode:'live',manifest:null,lastError:'',sourceDate:'',openId:''};
const dataState={manifestPromise:null,locationsPromise:null,datePromises:new Map()};

function dateApi(){return window.__KERBSIDE_TRAIN_DATE__||null;}
function selectedDate(){return dateApi()&&dateApi().state&&dateApi().state.date||'';}
function currentTime(){return $('trainDepartAfter')?.value||'00:00';}
function liveWindowInfo(){const live=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;return live&&typeof live.liveWindowFor==='function'?live.liveWindowFor(currentTime()):null;}
function liveWindowPhase(){const api=dateApi();if(!api||typeof api.isToday!=='function'||!api.isToday())return'advance';const info=liveWindowInfo();if(!info)return'pending';return info.mode==='planning'?'scheduled-only':'live-eligible';}
function liveOverlayEligible(){return liveWindowPhase()==='live-eligible';}
function overlayMatchesRoute(overlay){const r=route(),s=overlay&&overlay.state;return !!(s&&r.from&&String(s.crs||'').toUpperCase()===String(r.from.crs||'').toUpperCase()&&String(s.date||'')===String(r.date||''));}
function route(){const api=window.__KERBSIDE_TRAINS__,r=window.__KERBSIDE_TRAIN_ROUTES__;return {from:api&&api.state&&api.state.station,to:r&&r.state&&r.state.destination,date:selectedDate(),departAfter:currentTime()};}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function displayName(station,fallback){return station&&(station.name||station.locationName||station.crs)||fallback;}
function dateLabel(value,{short=false}={}){const d=value?new Date(`${value}T12:00:00`):null;if(!d||Number.isNaN(d.getTime()))return value||'Selected date';return d.toLocaleDateString('en-GB',short?{weekday:'short',day:'numeric',month:'short'}:{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
function parseMinutes(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;const h=Number(m[1]),n=Number(m[2]);return h>=0&&h<24&&n>=0&&n<60?h*60+n:null;}
function addDays(stamp,days){const d=new Date(`${stamp}T12:00:00Z`);if(Number.isNaN(d.getTime()))return stamp;d.setUTCDate(d.getUTCDate()+Number(days||0));return d.toISOString().slice(0,10);}
function timetableIdLabel(id){const m=String(id||'').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);if(!m)return'';const d=new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`);return Number.isNaN(d.getTime())?'':d.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
/* ------------------------------------------------------------------
   Mode.

   This used to be planningMode(): the timetable only took over when the
   live Darwin window could not answer, so the board swapped source - and
   shrank from 24 rows to Darwin's 9-row detailed cap - at exactly the
   moment the user was closest to travelling.

   The snapshot is now the spine for any journey it covers, today
   included, and kerbside-train-live-overlay.js decorates today's rows
   with Darwin evidence. Two honest cases remain for the live departure
   board in kerbside-trains.js:

     - no destination chosen, so there is no journey to search;
     - the snapshot does not cover the requested date, which for today
       means the published snapshot has gone stale.

   Both fall back to live rather than showing nothing.
------------------------------------------------------------------ */
function snapshotCovers(date){const m=state.manifest;return !!(m&&Array.isArray(m.dates)&&m.dates.includes(date));}
function journeyMode(){
  const r=route();
  if(!r.from||!r.to||!r.date||!dateApi())return'';
  /* Claim the journey board before the manifest has loaded for both today
     and future dates. load() is what fetches that manifest, so refusing to
     claim today's board here creates a bootstrap loop where today's timetable
     can never prove that it has coverage. A stale same-day snapshot still
     falls back to the live board after load() checks the manifest. */
  if(!state.manifest)return dateApi().isToday()?'today':'advance';
  if(!snapshotCovers(r.date))return dateApi().isToday()?'':'advance';
  return dateApi().isToday()?'today':'advance';
}
function planningMode(){return journeyMode();}
function routeSignature(){const r=route();return `${r.from&&r.from.crs||''}|${r.to&&r.to.crs||''}|${r.date}|${r.departAfter}|${journeyMode()||'live'}|${liveWindowPhase()}`;}

function scheduledBoard(){
  let board=$('trainScheduledBoard');
  if(board){bindBoard(board);return board;}
  const live=$('trainBoard');
  if(!live)return null;
  board=document.createElement('div');
  board.id='trainScheduledBoard';
  board.className=live.className||'train-board';
  board.hidden=true;
  live.insertAdjacentElement('afterend',board);
  bindBoard(board);
  return board;
}
/* The live board re-renders itself on every toggle. Scheduled rows are a
   pure function of a timetable snapshot that does not change under us, so
   a delegated listener that flips hidden/open is enough - and it keeps the
   forecast markup in place rather than rebuilding it on each tap. */
function bindBoard(board){
  if(!board||board.dataset.scheduledBound)return;
  board.dataset.scheduledBound='1';
  board.addEventListener('click',event=>{
    const button=event.target&&event.target.closest?event.target.closest('[data-scheduled-toggle]'):null;
    if(!button||!board.contains(button))return;
    toggleService(button.getAttribute('data-scheduled-toggle'));
  });
}
function toggleService(key){
  const board=$('trainScheduledBoard');
  if(!board)return;
  state.openId=state.openId===key?'':key;
  board.querySelectorAll('.train-scheduled-service').forEach(article=>{
    const id=article.getAttribute('data-service-id'),open=!!id&&id===state.openId;
    article.classList.toggle('open',open);
    const button=article.querySelector('[data-scheduled-toggle]');
    if(button)button.setAttribute('aria-expanded',open?'true':'false');
    const detail=article.querySelector('.train-service-detail');
    if(detail)detail.hidden=!open;
  });
}
function setScheduledVisibility(active){
  const live=$('trainBoard'),scheduled=scheduledBoard();
  if(live)live.hidden=!!active;
  if(scheduled)scheduled.hidden=!active;
}

async function fetchJson(path){const response=await fetch(path,{cache:'no-cache',headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Timetable data returned ${response.status}`);return response.json();}
async function fetchGzipJson(path){
  const response=await fetch(path,{cache:'no-cache'});
  if(!response.ok)throw new Error(`Timetable data returned ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  let text='';
  if(bytes.length>=2&&bytes[0]===0x1f&&bytes[1]===0x8b){
    if(typeof DecompressionStream!=='function')throw new Error('This browser cannot decompress the Darwin timetable file.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    text=await new Response(stream).text();
  }else text=new TextDecoder().decode(bytes);
  return JSON.parse(text);
}
function loadManifest(){if(!dataState.manifestPromise)dataState.manifestPromise=fetchJson(`${DATA_BASE}/manifest.json`).then(value=>{state.manifest=value;return value;});return dataState.manifestPromise;}
function loadLocations(){if(!dataState.locationsPromise)dataState.locationsPromise=fetchJson(`${DATA_BASE}/locations.json`);return dataState.locationsPromise;}
function loadDate(date){if(!dataState.datePromises.has(date))dataState.datePromises.set(date,fetchGzipJson(`${DATA_BASE}/${encodeURIComponent(date)}.json.gz`).catch(error=>{dataState.datePromises.delete(date);throw error;}));return dataState.datePromises.get(date);}
function coverageFor(manifest,date){return manifest&&manifest.coverage&&manifest.coverage[date]||null;}
function location(locations,crs){const row=locations&&locations[String(crs||'').toUpperCase()];return {name:row&&row[0]||crs||'',crs:String(crs||'').toUpperCase()};}
function actualCallDate(row,call){return addDays(row[4],Number(call&&call[4])||0);}
function operatorName(manifest,code){return manifest&&manifest.tocNames&&manifest.tocNames[code]||code||'Scheduled service';}

function servicesFromRows(rows,locations,manifest,{from,to,date,departAfter}){
  const fromCode=String(from||'').toUpperCase(),toCode=String(to||'').toUpperCase(),after=parseMinutes(departAfter);
  if(!/^[A-Z0-9]{3}$/.test(fromCode)||!/^[A-Z0-9]{3}$/.test(toCode)||fromCode===toCode)return[];
  const found=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const calls=Array.isArray(row&&row[5])?row[5]:[];
    let originIndex=-1,destinationIndex=-1;
    for(let i=0;i<calls.length-1;i++){
      const call=calls[i];
      if(call&&call[0]===fromCode&&actualCallDate(row,call)===date){originIndex=i;break;}
    }
    if(originIndex<0)continue;
    for(let i=originIndex+1;i<calls.length;i++){if(calls[i]&&calls[i][0]===toCode){destinationIndex=i;break;}}
    if(destinationIndex<0)continue;
    const originCall=calls[originIndex],targetCall=calls[destinationIndex],terminusCall=calls[calls.length-1];
    const dep=originCall[2]||originCall[1]||'',depMinute=parseMinutes(dep);
    if(after!=null&&depMinute!=null&&depMinute<after)continue;
    const selected=location(locations,toCode),terminus=location(locations,terminusCall&&terminusCall[0]);
    const serviceOrigin=location(locations,calls[0]&&calls[0][0]);
    found.push({
      std:dep,departure:dep,arrival:targetCall[1]||targetCall[2]||'',platform:originCall[3]||'',
      operator:operatorName(manifest,row[3]),operatorCode:row[3]||'',serviceID:row[0]||'',serviceId:row[0]||'',uid:row[1]||'',trainId:row[2]||'',
      origin:[{locationName:serviceOrigin.name,crs:serviceOrigin.crs}],
      destination:[{locationName:terminus.name,crs:terminus.crs}],
      routeDestination:selected,
      serviceTerminus:terminus,
      scheduledOnly:true,isCancelled:false,length:0
    });
  }
  found.sort((a,b)=>(parseMinutes(a.std)??9999)-(parseMinutes(b.std)??9999));
  return found.slice(0,MAX_RESULTS);
}

const timetableProvider={
  state:dataState,
  async getCoverage(){return loadManifest();},
  async getServices({from,to,date,departAfter='00:00'}){
    const manifest=await loadManifest();
    if(!manifest||!Array.isArray(manifest.dates)||!manifest.dates.includes(date))return[];
    const [locations,rows]=await Promise.all([loadLocations(),loadDate(date)]);
    return servicesFromRows(rows,locations,manifest,{from,to,date,departAfter});
  },
  servicesFromRows
};
window.__KERBSIDE_TIMETABLE_PROVIDER__=timetableProvider;

function normalise(item){
  const routeTarget=item.routeDestination||null;
  return {
    /* etd stays empty until the overlay supplies one. The old build
       hardcoded 'On time', which told Forecast v3 that a train three days
       out was running to time and made the row indistinguishable from a
       live one. */
    std:item.std||item.departure||item.departureTime||'',etd:'',arrival:item.arrival||'',platform:item.platform||'',
    scheduledPlatform:item.platform||'',
    destination:routeTarget?[{locationName:routeTarget.name||routeTarget.locationName||'',crs:routeTarget.crs||''}]:(item.destination||[{locationName:item.destinationName||'',crs:item.destinationCrs||''}]),
    displayDestination:item.serviceTerminus||((item.destination&&item.destination[0])||routeTarget)||null,
    origin:item.origin||[],operator:item.operator||item.operatorName||'',operatorCode:item.operatorCode||'',length:Number(item.length)||0,
    isCancelled:!!item.isCancelled,serviceID:item.serviceID||item.serviceId||item.uid||'',uid:item.uid||'',trainId:item.trainId||'',
    scheduledOnly:true,liveEvidence:false,liveVia:'',cancelReason:'',delayReason:''
  };
}
/* A live-only service: something Darwin is running that the snapshot was
   built too early to know about. Shaped like a normalised timetable row so
   the renderer and the forecast cannot tell the difference. */
function normaliseLive(service,toCrs){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  const ahead=overlay?overlay.flattenCallingPoints(service.subsequentCallingPoints):[];
  const target=String(toCrs||'').toUpperCase();
  const at=ahead.find(point=>String(point&&point.crs||'').toUpperCase()===target);
  const terminus=(Array.isArray(service.destination)?service.destination.find(Boolean):null)||null;
  return {
    std:service.std||'',etd:String(service.etd||'').trim()||'On time',
    arrival:String(at&&(at.st||at.et)||'').trim(),platform:String(service.platform||'').trim(),scheduledPlatform:'',
    destination:terminus?[{locationName:terminus.locationName||'',crs:terminus.crs||''}]:[],
    displayDestination:terminus?{name:terminus.locationName||'',crs:terminus.crs||''}:null,
    origin:service.origin||[],operator:service.operator||'',operatorCode:service.operatorCode||'',
    length:Number(service.length)||0,isCancelled:!!service.isCancelled,
    serviceID:service.serviceIdGuid||service.serviceID||'',uid:service.uid||'',trainId:service.trainid||service.trainId||'',
    serviceIdUrlSafe:service.serviceIdUrlSafe||'',serviceIdGuid:service.serviceIdGuid||'',
    previousCallingPoints:service.previousCallingPoints||null,subsequentCallingPoints:service.subsequentCallingPoints||null,
    scheduledOnly:false,liveEvidence:true,liveVia:'live-only',liveOnly:true,
    cancelReason:String(service.cancelReason||'').trim(),delayReason:String(service.delayReason||'').trim()
  };
}
function setHeader(mode,manifest){
  const r=route(),name=$('trainStationName'),meta=$('trainStationMeta'),refresh=$('trainRefresh'),main=$('trainMain');
  const from=displayName(r.from,'Departure station'),to=displayName(r.to,'destination'),snap=timetableIdLabel(manifest&&manifest.timetableId);
  if(main)main.dataset.railView='scheduled';
  setScheduledVisibility(true);
  if(name)name.textContent=r.from&&r.to?`${from} → ${to}`:'Scheduled journey';
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,phase=liveWindowPhase(),sameRoute=overlayMatchesRoute(overlay);
  let liveNote='advance timetable';
  if(mode==='today'){
    if(phase==='scheduled-only')liveNote='timetable · scheduled forecast';
    else if(phase==='live-eligible')liveNote=sameRoute&&overlay.state.status==='ready'?'timetable + live':sameRoute&&overlay.state.status==='error'?'timetable · live unavailable':'timetable · checking live';
    else liveNote='timetable · checking live window';
  }
  if(meta)meta.textContent=r.from&&r.to?`${r.from.crs||''} → ${r.to.crs||''} · ${dateLabel(r.date,{short:true})} · ${liveNote}${snap?` · snapshot ${snap}`:''}`:dateLabel(r.date);
  if(refresh){const canRefresh=mode==='today'&&phase==='live-eligible';refresh.disabled=!canRefresh;refresh.textContent=canRefresh?'Refresh':'Schedule';}
}
function setLiveMode(){const main=$('trainMain');if(main)main.dataset.railView='live';setScheduledVisibility(false);}
/* Disruption messages were hardcoded to [] here, which quietly disabled
   disruptionMessageSignal on what is now the primary board - Darwin telling
   us "reduced service" is one of the strongest same-day flags there is. */
function liveMessages(){
  if(state.mode!=='today'||!liveOverlayEligible())return [];
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  if(!overlay||!overlayMatchesRoute(overlay)||overlay.state.status!=='ready')return [];
  return typeof overlay.messages==='function'?overlay.messages():[];
}
function forecast(service,index,services){const v3=window.__KERBSIDE_FORECAST_V3__,api=window.__KERBSIDE_TRAINS__,date=new Date(`${route().date}T12:00:00`),messages=liveMessages();if(v3&&typeof v3.forecast==='function')return v3.forecast(service,index,services,{station:route().from,referenceDate:date,messages});if(api&&typeof api.crowdingForecast==='function')return api.crowdingForecast(service,index,services,{station:route().from,referenceDate:date,messages});return {label:'Moderate',level:'moderate',confidence:'Low',reasons:['service time and route demand baseline']};}
function coverageNote(manifest,date){const c=coverageFor(manifest,date);if(!c)return'';return c.partial?`Timetable coverage for this edge date is partial (${c.from}–${c.to}).`: `Full-day Darwin timetable coverage (${c.from}–${c.to}).`;}

/* ------------------------------------------------------------------
   Presentation. The scheduled board used to emit its own ad-hoc markup
   (.train-service-main / .train-destination), neither of which has ever
   had a rule in kerbside-trains.css - so every advance row rendered as
   raw stacked text with the operator welded onto the destination. These
   rows now use exactly the live board's structure (summary button with
   time / route / crowding / formation columns, collapsible detail) and
   hand the reasons to Forecast v3's bullet card.
------------------------------------------------------------------ */
function serviceKey(service,index){return String((service&&(service.serviceID||service.uid||service.trainId))||`${(service&&service.std)||'time'}-${index}`);}
function durationLabel(from,to){const start=parseMinutes(from),end=parseMinutes(to);if(start==null||end==null)return'';let span=end-start;if(span<0)span+=1440;if(span<=0)return'';const h=Math.floor(span/60),m=span%60;return h?`${h}h ${String(m).padStart(2,'0')}m`:`${m}m`;}
function terminusText(service,fallback){const d=service&&service.displayDestination;return (d&&(d.name||d.locationName||d.crs))||fallback;}
function originText(service){const list=service&&Array.isArray(service.origin)?service.origin.find(Boolean):null;return (list&&(list.locationName||list.name||list.crs))||'Origin not published';}
function modeLabel(mode){if(mode!=='today')return'Advance timetable';return liveOverlayEligible()?'Live-adjusted':'Same-day timetable';}

/* ------------------------------------------------------------------
   Overlay merge. Darwin evidence is written onto the timetabled rows in
   place, so the row keeps its identity, its position and its open/closed
   state while gaining expected times, platform changes, cancellations,
   formation and calling points.
------------------------------------------------------------------ */
function mergeOverlay(){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  if(!overlay||state.mode!=='today'||!liveOverlayEligible()||!state.services.length)return false;
  if(overlay.state.status!=='ready'||!overlayMatchesRoute(overlay))return false;
  const r=route(),toCrs=r.to&&r.to.crs||'';
  const matched=[];
  let changed=false;
  state.services.forEach(service=>{
    if(service.liveOnly)return;
    const evidence=overlay.evidenceFor(service);
    if(!evidence){
      if(service.liveEvidence){service.liveEvidence=false;service.liveVia='';service.etd='';changed=true;}
      return;
    }
    matched.push(evidence.index);
    const before=`${service.etd}|${service.platform}|${service.isCancelled}|${service.length}`;
    service.etd=evidence.etd;
    /* Darwin's platform wins when it has one; a snapshot platform is a
       plan, and platform alterations are exactly what a traveller needs. */
    if(evidence.platform)service.platform=evidence.platform;
    service.isCancelled=evidence.isCancelled;
    service.length=evidence.length;
    service.cancelReason=evidence.cancelReason;
    service.delayReason=evidence.delayReason;
    service.serviceIdUrlSafe=evidence.serviceIdUrlSafe;
    service.serviceIdGuid=evidence.serviceIdGuid;
    if(evidence.serviceID)service.liveServiceID=evidence.serviceID;
    if(evidence.previousCallingPoints)service.previousCallingPoints=evidence.previousCallingPoints;
    if(evidence.subsequentCallingPoints)service.subsequentCallingPoints=evidence.subsequentCallingPoints;
    service.liveEvidence=true;
    service.liveVia=evidence.via;
    if(before!==`${service.etd}|${service.platform}|${service.isCancelled}|${service.length}`)changed=true;
  });
  /* Short-notice additions Darwin is running but the snapshot predates.
     extraServices() only returns those whose calling points prove they
     reach the destination, so an unfiltered fallback board cannot inject
     trains that never go there. */
  const existing=new Set(state.services.filter(s=>s.liveOnly).map(s=>String(s.serviceID||'')));
  const extras=overlay.extraServices(matched,toCrs)
    .map(({service})=>normaliseLive(service,toCrs))
    .filter(row=>row.std&&!existing.has(String(row.serviceID||'')));
  if(extras.length){
    state.services=state.services.concat(extras)
      .sort((a,b)=>(parseMinutes(a.std)??9999)-(parseMinutes(b.std)??9999));
    changed=true;
  }
  return changed;
}

/* The status line under the departure time. A timetabled row says so
   plainly rather than borrowing the confidence of a live one. */
function statusFor(service){
  if(service.isCancelled)return {label:'Cancelled',cls:'cancelled'};
  if(!service.liveEvidence)return {label:'Timetabled',cls:'timetabled'};
  const etd=String(service.etd||'').trim();
  if(!etd||/^on time$/i.test(etd))return {label:'On time',cls:'ontime'};
  if(/^\d{1,2}:\d{2}$/.test(etd)){
    const late=parseMinutes(etd),planned=parseMinutes(service.std);
    let delay=late!=null&&planned!=null?late-planned:null;
    if(delay!=null&&delay<-720)delay+=1440;
    if(delay!=null&&delay>720)delay-=1440;
    return {label:`Expected ${etd}`,cls:delay!=null&&delay>=5?'late':'ontime'};
  }
  if(/delay/i.test(etd))return {label:etd,cls:'late'};
  return {label:etd,cls:'ontime'};
}
function modeNote(mode){
  if(mode!=='today')return 'Live delays, cancellations and formation are folded in automatically on the day of travel.';
  return liveOverlayEligible()
    ?'Timetabled services carry live Darwin evidence where it exists: expected times, platform changes, cancellations and formation.'
    :'This service is outside the live Darwin window. Forecast v3 is using the scheduled timetable and planning signals; live Darwin evidence will take priority automatically when the service enters the live window.';
}
/* Forecast v3 owns the bullet-card markup, so the scheduled board asks it
   for the same card the live board shows rather than keeping a second,
   drifting copy. The fallback only matters if v3 has not loaded yet. */
function explainMarkup(result,mode){
  const v3=window.__KERBSIDE_FORECAST_V3__,date=new Date(`${state.sourceDate||route().date}T12:00:00`);
  if(v3&&typeof v3.detailMarkup==='function')return v3.detailMarkup(result,date,{mode:modeLabel(mode),note:modeNote(mode)});
  const items=(result.reasons||[]).map(reason=>`<li>${esc(reason)}</li>`).join('');
  return `<div class="train-forecast-head"><span class="train-forecast-status"><i></i><strong>${esc(result.label)}</strong></span><span class="train-forecast-meta">${esc(result.confidence)} confidence · Forecast v3 · ${esc(modeLabel(mode))}</span></div><div class="train-forecast-reasons"><span>Why this forecast</span><ul>${items}</ul></div><div class="train-forecast-method">Forecast estimate only — no ticket sales, seat reservations or live carriage occupancy. ${esc(modeNote(mode))}</div>`;
}
/* Calling points only exist once Darwin has been asked with expand=true,
   so they appear on today's rows and stay absent on advance ones rather
   than being faked from the snapshot's own stop list. */
function callingMarkup(service){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  if(!overlay||!service.liveEvidence)return '';
  const ahead=overlay.flattenCallingPoints(service.subsequentCallingPoints);
  if(!ahead.length)return '';
  const rows=ahead.slice(0,12).map(point=>{
    const when=String(point.et||point.st||'').trim();
    const cancelled=!!point.isCancelled;
    return `<div class="train-call ahead${cancelled?' cancelled':''}"><i></i><span><b>${esc(point.locationName||point.crs||'Station')}</b><small>${esc(when)}${cancelled?' · cancelled':''}</small></span></div>`;
  }).join('');
  return `<div class="train-calling"><div class="train-detail-title">Calling points</div>${rows}</div>`;
}
function sourceNote(service){
  if(service.liveOnly)return 'Added by National Rail Darwin after this timetable snapshot was published. Live evidence only.';
  if(service.liveEvidence)return `Timetabled from the National Rail Darwin Timetable Files, matched to live Darwin data by ${service.liveVia==='rid'?'service ID':service.liveVia==='uid'?'schedule UID':service.liveVia==='headcode'?'headcode':'departure time'}.`;
  return 'Timetabled from the National Rail Darwin Timetable Files. Live expected times, platform changes, cancellations and formation are added automatically once this service enters the live Darwin window.';
}
function serviceMarkup(service,index,forecastResult,{mode,destinationFallback,explains}){
  const key=serviceKey(service,index),open=!!state.openId&&state.openId===key;
  const explain=explainMarkup(forecastResult,mode);
  if(Array.isArray(explains))explains.push(explain);
  const terminus=terminusText(service,destinationFallback);
  const duration=durationLabel(service.std,service.arrival);
  const status=statusFor(service);
  const line=[service.operator||'Scheduled service'];
  if(service.arrival)line.push(`arr ${service.arrival}`);
  line.push(service.platform?`Plat ${service.platform}`:'Plat TBC');
  if(service.liveOnly)line.push('extra service');
  const arrivesLabel=duration?`Arrives · ${duration}`:'Arrives';
  const disruption=service.isCancelled
    ?`This service is cancelled.${service.cancelReason?` ${service.cancelReason}.`:''} Its knock-on demand is included in the trains either side of it.`
    :(service.delayReason?`${service.delayReason}.`:'');
  const formation=Number(service.length)||0;
  const rightLabel=formation?`${formation} coach${formation===1?'':'es'}`:(duration||'—');
  const rightNote=formation?'formation':(duration?'journey time':'duration unknown');
  return `<article class="train-service train-scheduled-service${open?' open':''}" data-service-id="${esc(key)}">
      <button class="train-service-summary" type="button" data-scheduled-toggle="${esc(key)}" aria-expanded="${open?'true':'false'}" aria-controls="train-scheduled-detail-${esc(key)}">
        <span class="train-time"><b>${esc(service.std||'—')}</b><small class="train-status train-status-${esc(status.cls)}">${esc(status.label)}</small></span>
        <span class="train-route"><strong>${esc(terminus)}</strong><small>${esc(line.join(' · '))}</small></span>
        <span class="train-crowding crowd-${esc(forecastResult.level)}" title="${esc((forecastResult.reasons||[]).join(', '))}"><i></i><b>${esc(forecastResult.label)}</b><small>${esc(service.isCancelled?'service cancelled':`${forecastResult.confidence} confidence`)}</small></span>
        <span class="train-formation"><b>${esc(rightLabel)}</b><small>${esc(rightNote)}</small></span>
        <span class="train-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="train-service-detail" id="train-scheduled-detail-${esc(key)}"${open?'':' hidden'}>
        <div class="train-detail-grid">
          <div><span>From</span><b>${esc(originText(service))}</b></div>
          <div><span>Operator</span><b>${esc(service.operator||'Unknown')}</b></div>
          <div><span>Platform</span><b>${esc(service.platform||'TBC')}</b></div>
          <div><span>${esc(arrivesLabel)}</span><b>${esc(service.arrival||'Not timetabled')}</b></div>
        </div>
        <div class="train-crowding-explain crowd-${esc(forecastResult.level)}">${explain}</div>
        ${disruption?`<div class="train-detail-note train-detail-warn">${esc(disruption)}</div>`:''}
        ${callingMarkup(service)}
        <div class="train-detail-note">${esc(sourceNote(service))}</div>
      </div>
    </article>`;
}
function renderServices(items,{mode,manifest}){
  return renderRows(items.map(normalise),{mode,manifest});
}
/* Re-rendering after an overlay merge must not run normalise() again: the
   rows already carry live evidence and normalise() would strip it straight
   back out. renderServices() normalises raw provider output; renderRows()
   paints rows that are already in shape. */
function renderRows(rows,{mode,manifest}){
  const board=scheduledBoard();if(!board)return;setHeader(mode,manifest);state.services=rows;state.mode=mode;state.sourceDate=route().date;
  const r=route(),coverage=coverageNote(manifest,r.date);
  const keys=new Set(state.services.map((s,i)=>serviceKey(s,i)));
  if(state.openId&&!keys.has(state.openId))state.openId='';
  if(!state.services.length){board.innerHTML=`<div class="train-empty train-future-date train-future-card"><span class="train-future-badge">Darwin timetable</span><strong>No scheduled direct services found</strong><span>${esc(coverage||'The timetable snapshot returned no matching direct trains for this journey, date and departure time.')}</span></div>`;return;}
  const destinationFallback=displayName(r.to,'Destination'),explains=[];
  board.innerHTML=state.services.map((s,i)=>serviceMarkup(s,i,forecast(s,i,state.services),{mode,destinationFallback,explains})).join('')
    +`<div class="train-empty train-future-date train-future-card train-scheduled-foot"><span class="train-future-badge">Official timetable</span><span class="train-future-note">${esc(coverage)} Scheduled services come from National Rail Darwin Timetable Files. Live delays, cancellations and formations take precedence when LDB data is available.</span></div>`;
  /* Prime the markup cache refreshForecasts() compares against, so the first
     Forecast v3 pass after render is a genuine no-op rather than a rewrite. */
  board.querySelectorAll('.train-scheduled-service .train-crowding-explain').forEach((el,i)=>{el.__kerbsideMarkup=explains[i];});
}

/* Called by Forecast v3 whenever its inputs change after render - the bank
   holiday calendar resolving, or the events module returning fixtures for
   the chosen date. Previously v3.apply() only walked #trainBoard, so an
   advance journey kept whatever score it happened to have at first paint
   and never saw event pressure at all. Writes are compared before they are
   applied so a no-op refresh produces no DOM mutation. */
function refreshForecasts(){
  const board=$('trainScheduledBoard');
  if(!board||board.hidden||!state.services.length)return false;
  let changed=false;
  board.querySelectorAll('.train-scheduled-service').forEach((article,position)=>{
    const id=article.getAttribute('data-service-id');
    let index=state.services.findIndex((s,i)=>serviceKey(s,i)===id);
    if(index<0)index=position;
    const service=state.services[index];
    if(!service)return;
    const result=forecast(service,index,state.services);
    const statusEl=article.querySelector('.train-status');
    if(statusEl){
      const status=statusFor(service),cls=`train-status train-status-${status.cls}`;
      if(statusEl.className!==cls){statusEl.className=cls;changed=true;}
      if(statusEl.textContent!==status.label){statusEl.textContent=status.label;changed=true;}
    }
    const crowd=article.querySelector('.train-crowding');
    if(crowd){
      const cls=`train-crowding crowd-${result.level}`,title=(result.reasons||[]).join(', ');
      const conf=service.isCancelled?'service cancelled':`${result.confidence} confidence`;
      const b=crowd.querySelector('b'),small=crowd.querySelector('small');
      if(crowd.className!==cls){crowd.className=cls;changed=true;}
      if(b&&b.textContent!==result.label){b.textContent=result.label;changed=true;}
      if(small&&small.textContent!==conf){small.textContent=conf;changed=true;}
      if(crowd.title!==title){crowd.title=title;changed=true;}
    }
    const explain=article.querySelector('.train-crowding-explain');
    if(explain){
      const cls=`train-crowding-explain crowd-${result.level}`,markup=explainMarkup(result,state.mode);
      if(explain.className!==cls){explain.className=cls;changed=true;}
      if(explain.__kerbsideMarkup!==markup){explain.__kerbsideMarkup=markup;explain.innerHTML=markup;changed=true;}
    }
  });
  return changed;
}
function renderUnavailable(message,{mode='future',manifest=null}={}){const board=scheduledBoard();if(!board)return;setHeader(mode,manifest);state.services=[];state.mode=mode;const r=route(),from=displayName(r.from,'Departure station'),to=displayName(r.to,'destination'),complete=!!(r.from&&r.to);board.innerHTML=`<div class="train-empty train-future-date train-future-card"><span class="train-future-badge">Darwin timetable</span><strong>${esc(complete?dateLabel(r.date):'Choose your journey')}</strong><span class="train-future-route">${esc(complete?`${from} → ${to}`:'Select both From and To stations')}</span><span class="train-future-note">${esc(message||'Scheduled services are not available for this date in the current timetable snapshot.')}</span></div>`;}
async function load(options={}){
  const mode=options.mode||journeyMode();
  if(!mode){setLiveMode();return false;}
  const r=route();
  if(!r.from||!r.to){renderUnavailable('Select both stations, then use Find trains to search the Darwin timetable.',{mode});return true;}
  const id=++state.request;state.loading=true;state.lastError='';
  const board=scheduledBoard();setScheduledVisibility(true);if(board)board.innerHTML='<div class="train-empty train-future-date train-future-card"><span class="train-future-badge">Darwin timetable</span><strong>Loading scheduled services…</strong><span>Reading the official timetable snapshot and preparing Forecast v3.</span></div>';
  try{
    const manifest=await timetableProvider.getCoverage();
    if(id!==state.request)return true;
    clampDatePicker(manifest);
    if(!manifest.dates.includes(r.date)){
      /* For today a stale snapshot is not a dead end - the live board can
         still answer. Only an uncovered future date has nothing to fall
         back to. */
      if(dateApi()&&dateApi().isToday()){state.mode='live';setLiveMode();maybeReturnToLive('today');return false;}
      const range=manifest.dates.length?`${dateLabel(manifest.dates[0],{short:true})} to ${dateLabel(manifest.dates[manifest.dates.length-1],{short:true})}`:'the current snapshot';
      renderUnavailable(`This Darwin snapshot covers ${range}. Choose a date inside that range.`,{mode,manifest});return true;
    }
    const items=await timetableProvider.getServices({from:r.from.crs,to:r.to.crs,date:r.date,departAfter:options.departAfter||r.departAfter||'00:00'});
    if(id!==state.request)return true;
    renderServices(items,{mode,manifest});
    requestOverlay();
  }catch(e){
    if(id===state.request){
      state.lastError=e&&e.message||String(e);
      setLiveMode();
    }
    return false;
  }finally{if(id===state.request)state.loading=false;}
  return true;
}
/* Retained for callers that predate the unified board. 'same-day' is no
   longer a mode of its own - today is just a journey with a live overlay. */
function loadSameDay({departAfter=currentTime()}={}){return load({mode:'today',departAfter});}
/* Leaving the journey board for any reason - destination cleared, snapshot
   gone stale - has to put the live departure board back. The old guard only
   fired for the retired 'same-day' mode, so clearing a destination left the
   user staring at a hidden board. */
function maybeReturnToLive(previousMode){if(!previousMode||previousMode==='live')return;const live=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;if(live&&typeof live.handleJourneyChange==='function')setTimeout(()=>live.handleJourneyChange(),0);}
/* The date picker offers 90 days but the snapshot holds about 48 hours, so
   most reachable dates used to land on a coverage error. Clamp to what the
   published manifest can actually answer. */
function clampDatePicker(manifest){
  const input=$('trainTravelDate'),dates=manifest&&Array.isArray(manifest.dates)?manifest.dates:[];
  if(!input||!dates.length)return;
  const last=dates[dates.length-1];
  if(last&&input.max!==last)input.max=last;
}
function requestOverlay(){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,r=route();
  if(!overlay)return false;
  if(state.mode!=='today'||!r.from||!r.from.crs||!liveOverlayEligible()){
    if(typeof overlay.stop==='function')overlay.stop();
    if(typeof overlay.clear==='function')overlay.clear();
    return false;
  }
  overlay.refresh({crs:r.from.crs,date:r.date});
  overlay.start();
  return true;
}
function handleOverlay(){
  if(state.mode!=='today')return;
  if(!mergeOverlay())return;
  /* A merge can add rows, so re-render rather than patch. renderServices
     keeps the open row and reuses the same forecast pipeline. */
  renderRows(state.services,{mode:state.mode,manifest:state.manifest});
}
function sync(){
  const sig=routeSignature();
  if(sig===state.signature){if(journeyMode()&&state.mode!=='live')setHeader(state.mode,state.manifest);return;}
  const previous=state.mode;state.signature=sig;const mode=journeyMode();
  if(mode)load({mode});else{
    state.mode='live';setLiveMode();
    const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;if(overlay){overlay.stop();overlay.clear();}
    maybeReturnToLive(previous);
  }
}
function init(){
  document.addEventListener('kerbside:live-overlay',()=>setTimeout(handleOverlay,0));
  document.addEventListener('kerbside:train-date-change',()=>setTimeout(sync,60));
  document.addEventListener('kerbside:train-route-change',()=>setTimeout(sync,60));
  window.addEventListener('kerbside:journey-planner-change',()=>setTimeout(sync,120));
  state.signature='';setTimeout(sync,0);setInterval(sync,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,requestOverlay,provider:timetableProvider};
})();
