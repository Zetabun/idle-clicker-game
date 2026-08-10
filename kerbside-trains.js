(function(){
'use strict';

const PROVIDER_BASE = 'https://huxley2.azurewebsites.net';
const STORE_KEY = 'kerbside.rail.v1';
const REFRESH_MS = 30000;
const SEARCH_DELAY_MS = 280;
const REQUEST_TIMEOUT_MS = 10000;

const state = {
  mode: 'bus',
  station: null,
  board: null,
  services: [],
  selectedServiceId: '',
  detailCache: new Map(),
  searchAbort: null,
  boardAbort: null,
  detailAbort: null,
  searchTimer: null,
  refreshTimer: null,
  requestSeq: 0
};

const $ = id => document.getElementById(id);
const esc = value => String(value == null ? '' : value)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

function safeReadPrefs(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }catch(e){ return null; }
}

function savePrefs(){
  try{
    localStorage.setItem(STORE_KEY, JSON.stringify({
      mode: state.mode,
      station: state.station ? {name: state.station.name, crs: state.station.crs} : null
    }));
  }catch(e){}
}

function fetchWithTimeout(url, options={}){
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), REQUEST_TIMEOUT_MS);
  const outerSignal = options.signal;
  let detach = null;
  if(outerSignal){
    const abort = ()=>controller.abort();
    if(outerSignal.aborted) abort();
    else{
      outerSignal.addEventListener('abort', abort, {once:true});
      detach = ()=>outerSignal.removeEventListener('abort', abort);
    }
  }
  return fetch(url, {...options, signal:controller.signal, headers:{Accept:'application/json', ...(options.headers||{})}})
    .finally(()=>{ clearTimeout(timeout); if(detach) detach(); });
}

function stripHtml(value){
  const div = document.createElement('div');
  div.innerHTML = String(value || '');
  return (div.textContent || '').replace(/\s+/g,' ').trim();
}

function parseMinutes(value){
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1])*60 + Number(m[2]) : null;
}

function delayMinutes(service){
  const planned = parseMinutes(service.std);
  const expected = parseMinutes(service.etd);
  if(planned == null || expected == null) return 0;
  let delta = expected - planned;
  if(delta < -720) delta += 1440;
  if(delta > 720) delta -= 1440;
  return Math.max(0, delta);
}

function destinationText(service){
  const list = Array.isArray(service.destination) ? service.destination : [];
  const names = list.map(x=>x && x.locationName).filter(Boolean);
  return names.length ? names.join(' / ') : 'Destination unavailable';
}

function originText(service){
  const list = Array.isArray(service.origin) ? service.origin : [];
  const names = list.map(x=>x && x.locationName).filter(Boolean);
  return names.length ? names.join(' / ') : 'Origin unavailable';
}

function serviceKey(service, index){
  return String(service.serviceIdUrlSafe || service.serviceID || service.rsid || `${service.std || 'time'}-${index}`);
}

function statusFor(service){
  if(service.isCancelled) return {label:'Cancelled', cls:'cancelled'};
  const etd = String(service.etd || '').trim();
  if(!etd || /^on time$/i.test(etd)) return {label:'On time', cls:'on-time'};
  if(/^delayed$/i.test(etd)) return {label:'Delayed', cls:'delayed'};
  if(/^no report$/i.test(etd)) return {label:'No report', cls:'unknown'};
  const mins = delayMinutes(service);
  if(mins > 0) return {label:`+${mins} min`, cls:'delayed'};
  return {label:etd, cls:'expected'};
}

function isPeakMinute(minute){
  return (minute >= 6*60+30 && minute <= 9*60+30) || (minute >= 16*60 && minute <= 19*60);
}

function crowdingForecast(service, index, allServices){
  if(service.isCancelled){
    return {level:'unknown', label:'Not applicable', confidence:'—', score:null, reasons:['This service is cancelled.']};
  }

  const now = new Date();
  const day = now.getDay();
  const depMinute = parseMinutes(service.std);
  let score = 1;
  const reasons = [];

  if(depMinute != null && isPeakMinute(depMinute) && day >= 1 && day <= 5){
    score += 2;
    reasons.push('weekday peak departure');
  }
  if(day === 5 && depMinute != null && depMinute >= 14*60 && depMinute <= 20*60){
    score += 1;
    reasons.push('Friday travel period');
  }
  if((day === 0 || day === 6) && depMinute != null && depMinute >= 10*60 && depMinute <= 18*60){
    score += 0.5;
    reasons.push('weekend daytime demand');
  }

  const length = Number(service.length) || 0;
  if(length > 0 && length <= 4){
    score += 1;
    reasons.push('short formation reported');
  }else if(length >= 9){
    score -= 0.75;
    reasons.push('longer formation reported');
  }

  const delay = delayMinutes(service);
  if(delay >= 10){
    score += 0.5;
    reasons.push('meaningful delay may concentrate demand');
  }

  const dest = destinationText(service);
  const planned = parseMinutes(service.std);
  const disruptionPressure = (Array.isArray(allServices) ? allServices : []).some((other, otherIndex)=>{
    if(otherIndex >= index || !other || !other.isCancelled) return false;
    if(destinationText(other) !== dest) return false;
    const otherPlanned = parseMinutes(other.std);
    if(planned == null || otherPlanned == null) return false;
    let gap = planned - otherPlanned;
    if(gap < 0) gap += 1440;
    return gap <= 45;
  });
  if(disruptionPressure){
    score += 1.25;
    reasons.push('earlier similar service cancelled');
  }

  score = Math.max(0, Math.min(5, score));
  let level = 'quiet', label = 'Expected quiet';
  if(score >= 4){ level='very-busy'; label='Expected very busy'; }
  else if(score >= 2.8){ level='busy'; label='Expected busy'; }
  else if(score >= 1.6){ level='moderate'; label='Expected moderate'; }

  const confidence = length > 0 || disruptionPressure ? 'Low–medium' : 'Low';
  if(!reasons.length) reasons.push('typical off-peak demand');
  return {level, label, confidence, score, reasons};
}

function providerNotice(){
  return 'Live running times use the Huxley 2 community JSON proxy for National Rail Darwin. Crowding is a Kerbside prototype forecast from time of day, reported train length and current disruption pressure. It is not ticket-sales data and not live occupancy.';
}

function installMarkup(){
  const topbar = $('topbar');
  const app = $('app');
  const setBtn = $('setBtn');
  const viewbar = $('viewbar');
  if(!topbar || !app || !viewbar || $('trainMain')) return false;

  const transport = document.createElement('div');
  transport.className = 'transport-switch';
  transport.setAttribute('role','group');
  transport.setAttribute('aria-label','Transport mode');
  transport.innerHTML = '<button id="transportBus" type="button" aria-pressed="true">Bus</button><button id="transportTrain" type="button" aria-pressed="false">Train</button>';
  if(setBtn) topbar.insertBefore(transport, setBtn);
  else topbar.appendChild(transport);

  const main = document.createElement('section');
  main.id = 'trainMain';
  main.className = 'train-main';
  main.setAttribute('aria-label','Train departures');
  main.setAttribute('aria-hidden','true');
  main.innerHTML = `
    <div class="train-shell">
      <aside class="train-sidebar">
        <div class="train-kicker">National rail</div>
        <h2>Live trains</h2>
        <p class="train-intro">Search any Great Britain station by name or three-letter CRS code.</p>
        <div class="train-search-wrap">
          <label for="trainStationQuery">Station</label>
          <div class="train-search-box">
            <input id="trainStationQuery" type="text" autocomplete="off" spellcheck="false" placeholder="e.g. Bristol Temple Meads or BRI" aria-autocomplete="list" aria-controls="trainSuggest">
            <button id="trainStationGo" type="button">Find</button>
          </div>
          <div id="trainSuggest" class="train-suggest" role="listbox" hidden></div>
        </div>
        <div class="train-model-card">
          <span class="train-model-label">Crowding forecast</span>
          <strong>Prototype prediction</strong>
          <p>Kerbside combines typical demand periods, train length when reported, delay and nearby cancellations. Ticket-sales, reservation and live carriage data can be added later through the provider adapter.</p>
        </div>
        <p class="train-provider-note">${esc(providerNotice())}</p>
      </aside>
      <div class="train-content">
        <header class="train-board-head">
          <div>
            <div class="train-kicker">Departure board</div>
            <h2 id="trainStationName">Choose a station</h2>
            <div id="trainStationMeta" class="train-station-meta">Live departures will appear here.</div>
          </div>
          <button id="trainRefresh" class="train-refresh" type="button" disabled>Refresh</button>
        </header>
        <div id="trainAlerts" class="train-alerts" hidden></div>
        <div class="train-legend">
          <span><i class="crowd-dot quiet"></i>Quiet</span>
          <span><i class="crowd-dot moderate"></i>Moderate</span>
          <span><i class="crowd-dot busy"></i>Busy</span>
          <span><i class="crowd-dot very-busy"></i>Very busy</span>
          <b>forecast, not occupancy</b>
        </div>
        <div id="trainBoard" class="train-board">
          <div class="train-empty"><strong>No station selected</strong><span>Search for a station to see the next live departures.</span></div>
        </div>
      </div>
    </div>`;
  app.insertBefore(main, viewbar);
  return true;
}

function applyMode(mode, {persist=true}={}){
  state.mode = mode === 'train' ? 'train' : 'bus';
  document.body.dataset.transport = state.mode;
  const train = state.mode === 'train';
  const trainMain = $('trainMain');
  if(trainMain) trainMain.setAttribute('aria-hidden', train ? 'false' : 'true');
  const busBtn = $('transportBus');
  const trainBtn = $('transportTrain');
  if(busBtn) busBtn.setAttribute('aria-pressed', train ? 'false' : 'true');
  if(trainBtn) trainBtn.setAttribute('aria-pressed', train ? 'true' : 'false');
  if(persist) savePrefs();
  if(train){
    startRefreshLoop();
    if(state.station && !state.board) loadBoard(state.station, {silent:false});
    setTimeout(()=>{ if($('trainStationQuery') && !state.station) $('trainStationQuery').focus(); }, 0);
  }else{
    stopRefreshLoop();
    closeSuggestions();
  }
  window.dispatchEvent(new CustomEvent('kerbside:transportmode', {detail:{mode:state.mode}}));
}

function closeSuggestions(){
  const suggest = $('trainSuggest');
  if(suggest){ suggest.hidden = true; suggest.innerHTML=''; }
  if(state.searchAbort){ state.searchAbort.abort(); state.searchAbort=null; }
}

function renderSuggestions(items){
  const suggest = $('trainSuggest');
  if(!suggest) return;
  if(!items.length){
    suggest.innerHTML = '<div class="train-suggest-empty">No matching stations found.</div>';
    suggest.hidden = false;
    return;
  }
  suggest.innerHTML = items.slice(0,8).map((item,index)=>
    `<button type="button" role="option" data-station-index="${index}"><span>${esc(item.name)}</span><b>${esc(item.crs)}</b></button>`
  ).join('');
  suggest.hidden = false;
  [...suggest.querySelectorAll('[data-station-index]')].forEach((button,index)=>{
    button.addEventListener('click',()=>selectStation(items[index]));
  });
}

async function searchStations(query){
  const q = String(query || '').trim();
  if(q.length < 2){ closeSuggestions(); return; }
  if(state.searchAbort) state.searchAbort.abort();
  const controller = new AbortController();
  state.searchAbort = controller;
  const seq = ++state.requestSeq;
  try{
    const response = await fetchWithTimeout(`${PROVIDER_BASE}/crs/${encodeURIComponent(q)}`, {signal:controller.signal});
    if(!response.ok) throw new Error(`Station search returned ${response.status}`);
    const json = await response.json();
    if(seq !== state.requestSeq || controller.signal.aborted) return;
    const items = (Array.isArray(json) ? json : [])
      .map(x=>({name:String(x.stationName || '').trim(), crs:String(x.crsCode || '').trim().toUpperCase()}))
      .filter(x=>x.name && /^[A-Z0-9]{3}$/.test(x.crs));
    renderSuggestions(items);
  }catch(error){
    if(controller.signal.aborted) return;
    const suggest = $('trainSuggest');
    if(suggest){
      suggest.innerHTML = '<div class="train-suggest-empty">Station search is unavailable. You can still enter a three-letter CRS code.</div>';
      suggest.hidden = false;
    }
  }finally{
    if(state.searchAbort === controller) state.searchAbort = null;
  }
}

function scheduleSearch(){
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(()=>searchStations($('trainStationQuery') ? $('trainStationQuery').value : ''), SEARCH_DELAY_MS);
}

function submitStationSearch(){
  const input = $('trainStationQuery');
  if(!input) return;
  const q = input.value.trim();
  if(/^[a-z0-9]{3}$/i.test(q)){
    selectStation({name:q.toUpperCase(), crs:q.toUpperCase()});
    return;
  }
  searchStations(q);
}

function selectStation(station){
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

function setBoardLoading(silent){
  const refresh = $('trainRefresh');
  if(refresh){ refresh.disabled = true; refresh.textContent = 'Refreshing…'; }
  if(!silent){
    const board = $('trainBoard');
    if(board) board.innerHTML = '<div class="train-empty"><strong>Loading live departures…</strong><span>Checking the National Rail Darwin feed.</span></div>';
  }
}

function renderAlerts(messages){
  const el = $('trainAlerts');
  if(!el) return;
  const clean = (Array.isArray(messages) ? messages : [])
    .map(x=>stripHtml(x && (x.value || x.message || x)))
    .filter(Boolean).slice(0,3);
  if(!clean.length){ el.hidden=true; el.innerHTML=''; return; }
  el.innerHTML = clean.map(x=>`<div class="train-alert"><strong>Travel update</strong><span>${esc(x)}</span></div>`).join('');
  el.hidden=false;
}

function renderBoard(){
  const board = $('trainBoard');
  const name = $('trainStationName');
  const meta = $('trainStationMeta');
  const refresh = $('trainRefresh');
  if(!board || !name || !meta || !state.station) return;

  const payload = state.board || {};
  const services = state.services;
  name.textContent = payload.locationName || state.station.name || state.station.crs;
  state.station.name = name.textContent;
  const generated = payload.generatedAt ? new Date(payload.generatedAt) : null;
  const freshText = generated && !Number.isNaN(generated.getTime())
    ? `Live board · updated ${generated.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`
    : 'Live board';
  meta.textContent = `${state.station.crs} · ${freshText}`;
  if(refresh){ refresh.disabled=false; refresh.textContent='Refresh'; }
  renderAlerts(payload.nrccMessages);

  if(!services.length){
    board.innerHTML = '<div class="train-empty"><strong>No departures reported</strong><span>The live board returned no upcoming train services for this station.</span></div>';
    return;
  }

  board.innerHTML = services.map((service,index)=>{
    const key = serviceKey(service,index);
    const status = statusFor(service);
    const forecast = crowdingForecast(service,index,services);
    const length = Number(service.length) || 0;
    const platform = service.platform ? `Platform ${esc(service.platform)}` : 'Platform TBC';
    const detailOpen = state.selectedServiceId === key;
    const coachText = length > 0 ? `${length} coach${length===1?'':'es'}` : 'Formation unknown';
    const reasonTitle = forecast.reasons.join(', ');
    return `<article class="train-service${detailOpen?' open':''}" data-service-id="${esc(key)}">
      <button class="train-service-summary" type="button" data-service-toggle="${esc(key)}" aria-expanded="${detailOpen?'true':'false'}">
        <span class="train-time"><b>${esc(service.std || '—')}</b><small>${esc(status.label)}</small></span>
        <span class="train-route"><strong>${esc(destinationText(service))}</strong><small>${esc(service.operator || 'Operator unavailable')} · ${platform}</small></span>
        <span class="train-crowding crowd-${esc(forecast.level)}" title="${esc(reasonTitle)}"><i></i><b>${esc(forecast.label)}</b><small>${esc(forecast.confidence)} confidence</small></span>
        <span class="train-formation"><b>${esc(coachText)}</b><small>train length</small></span>
        <span class="train-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="train-service-detail" id="train-detail-${esc(key)}" ${detailOpen?'':'hidden'}>${detailOpen ? renderDetailPlaceholder(key, service, forecast) : ''}</div>
    </article>`;
  }).join('');

  [...board.querySelectorAll('[data-service-toggle]')].forEach(button=>{
    button.addEventListener('click',()=>toggleService(button.dataset.serviceToggle));
  });

  if(state.selectedServiceId){
    const selectedIndex = services.findIndex((service,index)=>serviceKey(service,index)===state.selectedServiceId);
    if(selectedIndex >= 0) hydrateDetail(services[selectedIndex], selectedIndex);
  }
}

function renderDetailPlaceholder(key, service, forecast){
  const cached = state.detailCache.get(key);
  if(cached) return renderServiceDetail(service, forecast, cached);
  return '<div class="train-detail-loading">Loading calling points…</div>';
}

function normaliseCallingPointGroups(detail){
  const groups = [];
  const add = (value, phase)=>{
    const source = Array.isArray(value) ? value : [];
    source.forEach(group=>{
      const points = Array.isArray(group && group.callingPoint) ? group.callingPoint
        : Array.isArray(group && group.callingPoints) ? group.callingPoints
        : Array.isArray(group) ? group : [];
      points.forEach(point=>{
        if(!point) return;
        groups.push({
          phase,
          name:point.locationName || point.location || point.crs || 'Station',
          crs:point.crs || '',
          st:point.st || point.sta || point.std || '',
          et:point.et || point.eta || point.etd || '',
          cancelled:!!point.isCancelled
        });
      });
    });
  };
  add(detail && detail.previousCallingPoints, 'passed');
  add(detail && detail.subsequentCallingPoints, 'ahead');
  return groups;
}

function renderServiceDetail(service, forecast, detail){
  const points = normaliseCallingPointGroups(detail);
  const calling = points.length ? `<div class="train-calling"><div class="train-detail-title">Calling points</div>${points.map(point=>
    `<div class="train-call ${point.phase}${point.cancelled?' cancelled':''}"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.et || point.st || '')}${point.cancelled?' · cancelled':''}</small></span></div>`
  ).join('')}</div>` : '<div class="train-detail-note">Calling-point data is unavailable for this service.</div>';
  const length = Number(service.length) || 0;
  return `<div class="train-detail-grid">
      <div><span>From</span><b>${esc(originText(service))}</b></div>
      <div><span>Operator</span><b>${esc(service.operator || 'Unknown')}</b></div>
      <div><span>Platform</span><b>${esc(service.platform || 'TBC')}</b></div>
      <div><span>Formation</span><b>${length ? `${length} coaches` : 'Not reported'}</b></div>
    </div>
    <div class="train-crowding-explain crowd-${esc(forecast.level)}">
      <div><i></i><strong>${esc(forecast.label)}</strong><span>${esc(forecast.confidence)} confidence</span></div>
      <p>Why: ${esc(forecast.reasons.join(', '))}. This first build does not use ticket sales, seat reservations or live carriage occupancy, so Kerbside deliberately avoids showing a percentage.</p>
    </div>
    ${calling}`;
}

async function toggleService(key){
  state.selectedServiceId = state.selectedServiceId === key ? '' : key;
  renderBoard();
}

async function hydrateDetail(service, index){
  const key = serviceKey(service,index);
  const target = document.getElementById(`train-detail-${key}`);
  if(!target || state.selectedServiceId !== key) return;
  const forecast = crowdingForecast(service,index,state.services);
  const cached = state.detailCache.get(key);
  if(cached){ target.innerHTML = renderServiceDetail(service, forecast, cached); return; }
  const serviceId = service.serviceIdUrlSafe || service.serviceIdGuid || service.serviceID;
  if(!serviceId){ target.innerHTML = renderServiceDetail(service, forecast, {}); return; }
  if(state.detailAbort) state.detailAbort.abort();
  const controller = new AbortController();
  state.detailAbort = controller;
  try{
    const response = await fetchWithTimeout(`${PROVIDER_BASE}/service/${encodeURIComponent(serviceId)}`, {signal:controller.signal});
    if(!response.ok) throw new Error(`Service detail returned ${response.status}`);
    const json = await response.json();
    if(controller.signal.aborted || state.selectedServiceId !== key) return;
    state.detailCache.set(key,json || {});
    target.innerHTML = renderServiceDetail(service, forecast, json || {});
  }catch(error){
    if(controller.signal.aborted) return;
    target.innerHTML = renderServiceDetail(service, forecast, {});
  }finally{
    if(state.detailAbort === controller) state.detailAbort = null;
  }
}

async function loadBoard(station, {silent=false}={}){
  if(!station || !station.crs) return;
  if(state.boardAbort) state.boardAbort.abort();
  const controller = new AbortController();
  state.boardAbort = controller;
  const seq = ++state.requestSeq;
  setBoardLoading(silent);
  try{
    const response = await fetchWithTimeout(`${PROVIDER_BASE}/departures/${encodeURIComponent(station.crs)}/20`, {signal:controller.signal});
    if(!response.ok) throw new Error(`Departure board returned ${response.status}`);
    const json = await response.json();
    if(controller.signal.aborted || seq !== state.requestSeq) return;
    state.board = json || {};
    state.services = Array.isArray(json && json.trainServices) ? json.trainServices : [];
    if(json && json.locationName) state.station.name = json.locationName;
    renderBoard();
    savePrefs();
  }catch(error){
    if(controller.signal.aborted) return;
    const refresh = $('trainRefresh');
    if(refresh){ refresh.disabled=false; refresh.textContent='Retry'; }
    const board = $('trainBoard');
    if(board && !silent){
      board.innerHTML = `<div class="train-empty error"><strong>Live train data unavailable</strong><span>${esc(error && error.message ? error.message : 'The rail provider could not be reached.')} Your bus view is unaffected.</span></div>`;
    }
  }finally{
    if(state.boardAbort === controller) state.boardAbort = null;
  }
}

function startRefreshLoop(){
  stopRefreshLoop();
  state.refreshTimer = setInterval(()=>{
    if(state.mode === 'train' && state.station && !document.hidden) loadBoard(state.station,{silent:true});
  }, REFRESH_MS);
}

function stopRefreshLoop(){
  if(state.refreshTimer){ clearInterval(state.refreshTimer); state.refreshTimer=null; }
}

function bindEvents(){
  $('transportBus').addEventListener('click',()=>applyMode('bus'));
  $('transportTrain').addEventListener('click',()=>applyMode('train'));
  $('trainStationQuery').addEventListener('input',scheduleSearch);
  $('trainStationQuery').addEventListener('keydown',event=>{
    if(event.key==='Enter'){ event.preventDefault(); submitStationSearch(); }
    if(event.key==='Escape') closeSuggestions();
  });
  $('trainStationGo').addEventListener('click',submitStationSearch);
  $('trainRefresh').addEventListener('click',()=>{ if(state.station) loadBoard(state.station,{silent:false}); });
  document.addEventListener('click',event=>{
    const wrap = event.target && event.target.closest ? event.target.closest('.train-search-wrap') : null;
    if(!wrap) closeSuggestions();
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden && state.mode==='train' && state.station) loadBoard(state.station,{silent:true});
  });
}

function restorePrefs(){
  const prefs = safeReadPrefs();
  if(prefs && prefs.station && prefs.station.crs){
    state.station = {name:prefs.station.name || prefs.station.crs, crs:String(prefs.station.crs).toUpperCase()};
    const input = $('trainStationQuery');
    if(input) input.value = state.station.name;
  }
  applyMode(prefs && prefs.mode === 'train' ? 'train' : 'bus', {persist:false});
}

function init(){
  if(!installMarkup()) return;
  bindEvents();
  restorePrefs();
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();

window.__KERBSIDE_TRAINS__ = {
  providerBase: PROVIDER_BASE,
  crowdingForecast,
  delayMinutes,
  statusFor,
  destinationText,
  state
};

})();
