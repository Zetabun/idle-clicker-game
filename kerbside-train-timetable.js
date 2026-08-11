(function(){
'use strict';

const $=id=>document.getElementById(id);
const DATA_BASE='kerbside-rail-timetable';
const MAX_RESULTS=24;
const state={loading:false,request:0,services:[],signature:'',mode:'live',manifest:null,lastError:'',sourceDate:''};
const dataState={manifestPromise:null,locationsPromise:null,datePromises:new Map()};

function dateApi(){return window.__KERBSIDE_TRAIN_DATE__||null;}
function selectedDate(){return dateApi()&&dateApi().state&&dateApi().state.date||'';}
function currentTime(){return $('trainDepartAfter')?.value||'00:00';}
function route(){const api=window.__KERBSIDE_TRAINS__,r=window.__KERBSIDE_TRAIN_ROUTES__;return {from:api&&api.state&&api.state.station,to:r&&r.state&&r.state.destination,date:selectedDate(),departAfter:currentTime()};}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function displayName(station,fallback){return station&&(station.name||station.locationName||station.crs)||fallback;}
function dateLabel(value,{short=false}={}){const d=value?new Date(`${value}T12:00:00`):null;if(!d||Number.isNaN(d.getTime()))return value||'Selected date';return d.toLocaleDateString('en-GB',short?{weekday:'short',day:'numeric',month:'short'}:{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
function parseMinutes(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;const h=Number(m[1]),n=Number(m[2]);return h>=0&&h<24&&n>=0&&n<60?h*60+n:null;}
function addDays(stamp,days){const d=new Date(`${stamp}T12:00:00Z`);if(Number.isNaN(d.getTime()))return stamp;d.setUTCDate(d.getUTCDate()+Number(days||0));return d.toISOString().slice(0,10);}
function timetableIdLabel(id){const m=String(id||'').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);if(!m)return'';const d=new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`);return Number.isNaN(d.getTime())?'':d.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
function sameDayPlanning(){const api=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;if(!dateApi()?.isToday?.()||!api||typeof api.liveWindowFor!=='function')return false;return api.liveWindowFor(currentTime()).mode==='planning';}
function planningMode(){if(!dateApi())return'';if(!dateApi().isToday())return'future';return sameDayPlanning()?'same-day':'';}
function routeSignature(){const r=route();return `${r.from&&r.from.crs||''}|${r.to&&r.to.crs||''}|${r.date}|${r.departAfter}|${planningMode()||'live'}`;}

function scheduledBoard(){
  let board=$('trainScheduledBoard');
  if(board)return board;
  const live=$('trainBoard');
  if(!live)return null;
  board=document.createElement('div');
  board.id='trainScheduledBoard';
  board.className=live.className||'train-board';
  board.hidden=true;
  live.insertAdjacentElement('afterend',board);
  return board;
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
    std:item.std||item.departure||item.departureTime||'',etd:'On time',arrival:item.arrival||'',platform:item.platform||'',
    destination:routeTarget?[{locationName:routeTarget.name||routeTarget.locationName||'',crs:routeTarget.crs||''}]:(item.destination||[{locationName:item.destinationName||'',crs:item.destinationCrs||''}]),
    displayDestination:item.serviceTerminus||((item.destination&&item.destination[0])||routeTarget)||null,
    origin:item.origin||[],operator:item.operator||item.operatorName||'',operatorCode:item.operatorCode||'',length:Number(item.length)||0,
    isCancelled:!!item.isCancelled,serviceID:item.serviceID||item.serviceId||item.uid||'',uid:item.uid||'',trainId:item.trainId||'',scheduledOnly:true
  };
}
function setHeader(mode,manifest){
  const r=route(),name=$('trainStationName'),meta=$('trainStationMeta'),refresh=$('trainRefresh'),main=$('trainMain');
  const from=displayName(r.from,'Departure station'),to=displayName(r.to,'destination'),snap=timetableIdLabel(manifest&&manifest.timetableId);
  if(main)main.dataset.railView='scheduled';
  setScheduledVisibility(true);
  if(name)name.textContent=r.from&&r.to?`${from} → ${to}`:'Scheduled journey';
  if(meta)meta.textContent=r.from&&r.to?`${r.from.crs||''} → ${r.to.crs||''} · ${dateLabel(r.date,{short:true})} · ${mode==='same-day'?'scheduled later today':'advance timetable'}${snap?` · snapshot ${snap}`:''}`:dateLabel(r.date);
  if(refresh){refresh.disabled=true;refresh.textContent='Schedule';}
}
function setLiveMode(){const main=$('trainMain');if(main)main.dataset.railView='live';setScheduledVisibility(false);}
function forecast(service,index,services){const v3=window.__KERBSIDE_FORECAST_V3__,api=window.__KERBSIDE_TRAINS__,date=new Date(`${route().date}T12:00:00`);if(v3&&typeof v3.forecast==='function')return v3.forecast(service,index,services,{station:route().from,referenceDate:date,messages:[]});if(api&&typeof api.crowdingForecast==='function')return api.crowdingForecast(service,index,services,{station:route().from,referenceDate:date,messages:[]});return {label:'Moderate',level:'moderate',confidence:'Low',reasons:['service time and route demand baseline']};}
function coverageNote(manifest,date){const c=coverageFor(manifest,date);if(!c)return'';return c.partial?`Timetable coverage for this edge date is partial (${c.from}–${c.to}).`: `Full-day Darwin timetable coverage (${c.from}–${c.to}).`;}
function renderServices(items,{mode,manifest}){
  const board=scheduledBoard();if(!board)return;setHeader(mode,manifest);state.services=items.map(normalise);state.mode=mode;state.sourceDate=route().date;
  const r=route(),coverage=coverageNote(manifest,r.date);
  if(!state.services.length){board.innerHTML=`<div class="train-empty train-future-date train-future-card"><span class="train-future-badge">Darwin timetable</span><strong>No scheduled direct services found</strong><span>${esc(coverage||'The timetable snapshot returned no matching direct trains for this journey, date and departure time.')}</span></div>`;return;}
  board.innerHTML=state.services.map((s,i)=>{
    const f=forecast(s,i,state.services),dest=s.displayDestination&&(s.displayDestination.name||s.displayDestination.locationName||s.displayDestination.crs)||displayName(r.to,'Destination');
    const arrival=s.arrival?` · arrives ${s.arrival}`:'',platform=s.platform?` · platform ${s.platform}`:'';
    const reasons=(f.reasons||[]).slice(0,5);
    const dynamic=mode==='same-day'?'Live LDB evidence will replace this scheduled view automatically when the requested time enters the live window.':'The forecast will be recalculated with same-day Darwin data as departure approaches.';
    return `<article class="train-service train-scheduled-service"><div class="train-service-main"><div class="train-time">${esc(s.std||'—')}</div><div class="train-destination"><strong>${esc(dest)}</strong><span>${esc(s.operator||'Scheduled service')}${esc(arrival)}${esc(platform)}</span></div><div class="train-crowding crowd-${esc(f.level)}" title="${esc(reasons.join(', '))}"><b>${esc(f.label)}</b><small>${esc(f.confidence)} confidence · scheduled forecast</small></div></div><div class="train-crowding-explain crowd-${esc(f.level)}"><strong>${esc(f.label)}</strong><span>${esc(f.confidence)} confidence · forecast v3 · timetable baseline</span><p>Why: ${esc(reasons.join(', ')||'scheduled service time and route demand baseline')}. ${esc(dynamic)}</p></div></article>`;
  }).join('')+`<div class="train-empty train-future-date train-future-card" style="min-height:auto!important;margin-top:10px"><span class="train-future-badge">Official timetable</span><span class="train-future-note">${esc(coverage)} Scheduled services come from National Rail Darwin Timetable Files. Live delays, cancellations and formations take precedence when LDB data is available.</span></div>`;
}
function renderUnavailable(message,{mode='future',manifest=null}={}){const board=scheduledBoard();if(!board)return;setHeader(mode,manifest);state.services=[];state.mode=mode;const r=route(),from=displayName(r.from,'Departure station'),to=displayName(r.to,'destination'),complete=!!(r.from&&r.to);board.innerHTML=`<div class="train-empty train-future-date train-future-card"><span class="train-future-badge">Darwin timetable</span><strong>${esc(complete?dateLabel(r.date):'Choose your journey')}</strong><span class="train-future-route">${esc(complete?`${from} → ${to}`:'Select both From and To stations')}</span><span class="train-future-note">${esc(message||'Scheduled services are not available for this date in the current timetable snapshot.')}</span></div>`;}
async function load(options={}){
  const mode=options.mode||planningMode();
  if(!mode){setLiveMode();return false;}
  const r=route();
  if(!r.from||!r.to){renderUnavailable('Select both stations, then use Find trains to search the Darwin timetable.',{mode});return true;}
  const id=++state.request;state.loading=true;state.lastError='';
  const board=scheduledBoard();setScheduledVisibility(true);if(board)board.innerHTML='<div class="train-empty train-future-date train-future-card"><span class="train-future-badge">Darwin timetable</span><strong>Loading scheduled services…</strong><span>Reading the official timetable snapshot and preparing Forecast v3.</span></div>';
  try{
    const manifest=await timetableProvider.getCoverage();
    if(id!==state.request)return true;
    if(!manifest.dates.includes(r.date)){
      const range=manifest.dates.length?`${dateLabel(manifest.dates[0],{short:true})} to ${dateLabel(manifest.dates[manifest.dates.length-1],{short:true})}`:'the current snapshot';
      renderUnavailable(`This Darwin snapshot covers ${range}. Choose a date inside that range.`,{mode,manifest});return true;
    }
    const items=await timetableProvider.getServices({from:r.from.crs,to:r.to.crs,date:r.date,departAfter:options.departAfter||r.departAfter||'00:00'});
    if(id!==state.request)return true;
    renderServices(items,{mode,manifest});
  }catch(e){
    if(id===state.request){
      state.lastError=e&&e.message||String(e);
      setLiveMode();
    }
    return false;
  }finally{if(id===state.request)state.loading=false;}
  return true;
}
function loadSameDay({departAfter=currentTime()}={}){return load({mode:'same-day',departAfter});}
function maybeReturnToLive(previousMode){if(previousMode!=='same-day')return;const live=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;if(live&&typeof live.handleJourneyChange==='function')setTimeout(()=>live.handleJourneyChange(),0);}
function sync(){
  const sig=routeSignature();
  if(sig===state.signature){if(planningMode()&&state.mode!=='live')setHeader(state.mode,state.manifest);return;}
  const previous=state.mode;state.signature=sig;const mode=planningMode();
  if(mode)load({mode});else{state.mode='live';setLiveMode();maybeReturnToLive(previous);}
}
function init(){
  document.addEventListener('kerbside:train-date-change',()=>setTimeout(sync,60));
  document.addEventListener('kerbside:train-route-change',()=>setTimeout(sync,60));
  window.addEventListener('kerbside:journey-planner-change',()=>setTimeout(sync,120));
  state.signature='';setTimeout(sync,0);setInterval(sync,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,renderServices,renderUnavailable,setHeader,provider:timetableProvider};
})();
