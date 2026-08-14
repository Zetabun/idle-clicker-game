(function(){
'use strict';

const PROVIDER_ORIGIN = 'https://huxley2.azurewebsites.net';
const STORE_KEY = 'kerbside.rail.route.v1';
const SEARCH_DELAY_MS = 280;
const REQUEST_TIMEOUT_MS = 10000;

const routeState = {
  fromCrs:'',
  destination:null,
  searchTimer:null,
  searchAbort:null,
  searchSeq:0,
  suggestions:[],
  lastDirectRequest:''
};

const nativeFetch = window.fetch.bind(window);
const $ = id => document.getElementById(id);
const esc = value => String(value == null ? '' : value)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/\"/g,'&quot;').replace(/'/g,'&#39;');

function readStoredRoute(){
  try{
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if(!parsed || typeof parsed !== 'object') return null;
    const fromCrs = String(parsed.fromCrs || '').trim().toUpperCase();
    const destination = parsed.destination && typeof parsed.destination === 'object'
      ? {name:String(parsed.destination.name || '').trim(),crs:String(parsed.destination.crs || '').trim().toUpperCase()}
      : null;
    if(!/^[A-Z0-9]{3}$/.test(fromCrs) || !destination || !/^[A-Z0-9]{3}$/.test(destination.crs)) return null;
    if(destination.crs === fromCrs) return null;
    return {fromCrs,destination};
  }catch(error){ return null; }
}

function saveRoute(){
  try{
    if(!routeState.fromCrs || !routeState.destination){
      localStorage.removeItem(STORE_KEY);
      return;
    }
    localStorage.setItem(STORE_KEY,JSON.stringify({
      fromCrs:routeState.fromCrs,
      destination:{name:routeState.destination.name,crs:routeState.destination.crs}
    }));
  }catch(error){}
}

function restoreRoute(){
  const stored = readStoredRoute();
  if(!stored) return;
  routeState.fromCrs = stored.fromCrs;
  routeState.destination = stored.destination;
}

function setDestinationEnabled(enabled){
  const input = $('trainDestinationQuery');
  const go = $('trainDestinationGo');
  if(input){
    input.disabled = !enabled;
    input.placeholder = enabled ? 'e.g. Bristol Temple Meads or BRI' : 'Choose a departure station first';
  }
  if(go) go.disabled = !enabled;
}

function updateSummary(){
  const summary = $('trainJourneySummary');
  const input = $('trainDestinationQuery');
  const clear = $('trainDestinationClear');
  if(input && routeState.destination && document.activeElement !== input){
    input.value = routeState.destination.name || routeState.destination.crs;
  }
  if(clear) clear.hidden = !routeState.destination;
  if(!summary) return;
  if(!routeState.fromCrs){
    summary.hidden = true;
    summary.textContent = '';
    return;
  }
  summary.hidden = false;
  if(!routeState.destination){
    summary.innerHTML = `<strong>${esc(routeState.fromCrs)}</strong><span>Showing all upcoming trains</span>`;
    return;
  }
  summary.innerHTML = `<strong>${esc(routeState.fromCrs)} → ${esc(routeState.destination.crs)}</strong><span>Direct trains to ${esc(routeState.destination.name || routeState.destination.crs)} only</span>`;
}

function clearDestination({reload=false,disable=false}={}){
  routeState.destination = null;
  routeState.lastDirectRequest = '';
  const input = $('trainDestinationQuery');
  if(input) input.value = '';
  closeSuggestions();
  saveRoute();
  if(disable) setDestinationEnabled(false);
  updateSummary();
  if(reload) deferReload();
}

function setFromCrs(value){
  const next = String(value || '').trim().toUpperCase();
  if(!/^[A-Z0-9]{3}$/.test(next)) return false;
  if(routeState.fromCrs && routeState.fromCrs !== next){
    routeState.destination = null;
    routeState.lastDirectRequest = '';
    const input = $('trainDestinationQuery');
    if(input) input.value = '';
    saveRoute();
  }
  routeState.fromCrs = next;
  setDestinationEnabled(true);
  updateSummary();
  return true;
}

function selectedOriginCrs(){
  const api = window.__KERBSIDE_TRAINS__;
  const selected = api && api.state && api.state.station;
  const crs = String(selected && (selected.crs || selected.crsCode) || '').trim().toUpperCase();
  return /^[A-Z0-9]{3}$/.test(crs) ? crs : '';
}

function ensureFromCrs(){
  const selected = selectedOriginCrs();
  if(selected){
    if(routeState.fromCrs === selected) return true;
    return setFromCrs(selected);
  }
  return /^[A-Z0-9]{3}$/.test(String(routeState.fromCrs || '').trim().toUpperCase());
}

function departureRequest(url){
  if(url.origin !== PROVIDER_ORIGIN) return null;
  const match = decodeURIComponent(url.pathname).match(/^\/departures\/([A-Za-z0-9]{3})\/(\d+)\/?$/i);
  return match ? {crs:match[1].toUpperCase(),rows:match[2]} : null;
}

function rewrittenDepartureUrl(input){
  let url;
  try{
    const raw = typeof input === 'string' || input instanceof URL ? String(input) : input && input.url;
    if(!raw) return null;
    url = new URL(raw,location.href);
  }catch(error){ return null; }

  const request = departureRequest(url);
  if(!request) return null;
  setFromCrs(request.crs);
  if(!routeState.destination || routeState.destination.crs === request.crs) return null;

  const filtered = new URL(url.toString());
  filtered.pathname = `/departures/${encodeURIComponent(request.crs)}/to/${encodeURIComponent(routeState.destination.crs)}/${encodeURIComponent(request.rows)}`;
  routeState.lastDirectRequest = filtered.pathname;
  updateSummary();
  return filtered.toString();
}

restoreRoute();
window.fetch = function kerbsideRouteAwareFetch(input,init){
  const rewritten = rewrittenDepartureUrl(input);
  if(!rewritten) return nativeFetch(input,init);
  if(typeof Request !== 'undefined' && input instanceof Request){
    return nativeFetch(new Request(rewritten,input),init);
  }
  return nativeFetch(rewritten,init);
};

function closeSuggestions(){
  clearTimeout(routeState.searchTimer);
  routeState.searchTimer = null;
  routeState.suggestions = [];
  if(routeState.searchAbort){
    routeState.searchAbort.abort();
    routeState.searchAbort = null;
  }
  const suggest = $('trainDestinationSuggest');
  if(suggest){ suggest.hidden = true; suggest.innerHTML = ''; }
}

function fetchWithTimeout(url,signal){
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  let detach = null;
  if(signal){
    const abort = ()=>controller.abort();
    if(signal.aborted) abort();
    else{
      signal.addEventListener('abort',abort,{once:true});
      detach = ()=>signal.removeEventListener('abort',abort);
    }
  }
  return nativeFetch(url,{signal:controller.signal,headers:{Accept:'application/json'}})
    .finally(()=>{ clearTimeout(timeout); if(detach) detach(); });
}

function stationResults(json){
  return (Array.isArray(json) ? json : [])
    .map(item=>({
      name:String(item && item.stationName || '').trim(),
      crs:String(item && item.crsCode || '').trim().toUpperCase()
    }))
    .filter(item=>item.name && /^[A-Z0-9]{3}$/.test(item.crs) && item.crs !== routeState.fromCrs);
}

function renderSuggestions(items){
  const suggest = $('trainDestinationSuggest');
  if(!suggest) return;
  routeState.suggestions = items.slice(0,8);
  if(!routeState.suggestions.length){
    suggest.innerHTML = '<div class="train-suggest-empty">No matching destination stations found.</div>';
    suggest.hidden = false;
    return;
  }
  suggest.innerHTML = routeState.suggestions.map((item,index)=>
    `<button type="button" role="option" data-destination-index="${index}"><span>${esc(item.name)}</span><b>${esc(item.crs)}</b></button>`
  ).join('');
  suggest.hidden = false;
}

function stationFromSuggestionButton(button){
  if(!button) return null;
  const ownIndexAttr = button.getAttribute('data-destination-index');
  if(ownIndexAttr !== null){
    const ownIndex = Number(ownIndexAttr);
    if(Number.isInteger(ownIndex) && ownIndex >= 0 && routeState.suggestions[ownIndex]){
      return routeState.suggestions[ownIndex];
    }
  }
  const name = String(button.querySelector('span')?.textContent || '').trim();
  const crs = String(button.querySelector('b')?.textContent || '').trim().toUpperCase();
  return name && /^[A-Z0-9]{3}$/.test(crs) ? {name,crs} : null;
}

function suggestionButtonFromEvent(event,suggest){
  const target = event && event.target;
  if(!target || !target.closest) return null;
  const button = target.closest('[data-destination-index],[data-k-to]');
  return button && suggest.contains(button) ? button : null;
}

function destinationMatchesInput(){
  const destination = routeState.destination;
  const input = $('trainDestinationQuery');
  if(!destination || !input) return false;
  const value = String(input.value || '').trim().toLowerCase();
  return value === String(destination.name || '').trim().toLowerCase()
    || value.toUpperCase() === String(destination.crs || '').trim().toUpperCase();
}

function installSuggestionHandlers(){
  const suggest = $('trainDestinationSuggest');
  if(!suggest || suggest.dataset.kerbsideRouteDelegated === '1') return;
  suggest.dataset.kerbsideRouteDelegated = '1';

  const commit = event=>{
    const button = suggestionButtonFromEvent(event,suggest);
    if(!button) return;
    const station = stationFromSuggestionButton(button);
    if(!station) return;
    event.preventDefault();
    event.stopPropagation();
    selectDestination(station);
  };

  // Commit on pointerdown so an iOS predictive-text input event or a late
  // autocomplete response cannot replace the tapped button before click fires.
  suggest.addEventListener('pointerdown',commit);
  // Capture click as the keyboard/accessibility fallback and to suppress the
  // per-render click listeners installed by the journey-planner module.
  suggest.addEventListener('click',commit,true);

  if(typeof MutationObserver !== 'undefined'){
    new MutationObserver(()=>{
      // The journey planner owns a second async station lookup. If that older
      // request resolves after a destination was committed, discard its stale
      // repaint instead of letting the suggestions reappear over the selection.
      if(routeState.destination && destinationMatchesInput() && suggest.childNodes.length){
        suggest.hidden = true;
        suggest.innerHTML = '';
      }
    }).observe(suggest,{childList:true});
  }
}

async function searchDestinations(query){
  if(!ensureFromCrs()) return [];
  const q = String(query || '').trim();
  if(q.length < 2){ closeSuggestions(); return []; }
  if(routeState.searchAbort) routeState.searchAbort.abort();
  const controller = new AbortController();
  routeState.searchAbort = controller;
  const seq = ++routeState.searchSeq;
  try{
    const response = await fetchWithTimeout(`${PROVIDER_ORIGIN}/crs/${encodeURIComponent(q)}`,controller.signal);
    if(!response.ok) throw new Error(`Destination search returned ${response.status}`);
    const items = stationResults(await response.json());
    if(controller.signal.aborted || seq !== routeState.searchSeq) return [];
    renderSuggestions(items);
    return items;
  }catch(error){
    if(!controller.signal.aborted) renderSuggestions([]);
    return [];
  }finally{
    if(routeState.searchAbort === controller) routeState.searchAbort = null;
  }
}

function scheduleSearch(){
  clearTimeout(routeState.searchTimer);
  routeState.searchTimer = setTimeout(()=>searchDestinations($('trainDestinationQuery') ? $('trainDestinationQuery').value : ''),SEARCH_DELAY_MS);
}

function selectDestination(station,{reload=true}={}){
  if(!station || !ensureFromCrs()) return false;
  const crs = String(station.crs || '').trim().toUpperCase();
  if(!/^[A-Z0-9]{3}$/.test(crs) || crs === routeState.fromCrs) return false;
  routeState.destination = {name:String(station.name || crs),crs};
  routeState.lastDirectRequest = '';
  const input = $('trainDestinationQuery');
  if(input) input.value = routeState.destination.name;
  saveRoute();
  updateSummary();
  closeSuggestions();
  if(reload) deferReload();
  return true;
}

async function submitDestination(){
  const input = $('trainDestinationQuery');
  if(!input || !ensureFromCrs()) return;
  const q = input.value.trim();
  if(q.length < 2) return;
  const items = await searchDestinations(q);
  const exact = items.find(item=>item.crs === q.toUpperCase())
    || items.find(item=>item.name.toLowerCase() === q.toLowerCase())
    || (items.length === 1 ? items[0] : null);
  if(exact) selectDestination(exact);
}

function reloadBoard(){
  const refresh = $('trainRefresh');
  if(refresh && !refresh.disabled){
    refresh.click();
    return;
  }
  const api = window.__KERBSIDE_TRAINS__;
  const station = api && api.state && api.state.station;
  const input = $('trainStationQuery');
  const go = $('trainStationGo');
  if(!station || !input || !go) return;
  const previous = input.value;
  input.value = station.crs || station.name || previous;
  go.click();
  input.value = previous;
}

function deferReload(){ setTimeout(reloadBoard,0); }

function installStyles(){
  if($('trainRouteFilterStyles')) return;
  const style = document.createElement('style');
  style.id = 'trainRouteFilterStyles';
  style.textContent = `
    .train-destination-wrap{margin-top:-5px}
    .train-destination-wrap .train-search-box{align-items:stretch}
    .train-destination-wrap input:disabled{opacity:.58;cursor:not-allowed}
    .train-destination-wrap button:disabled{opacity:.45;cursor:default}
    .train-destination-clear{margin-top:7px;padding:0;border:0!important;background:transparent!important;color:var(--text-dim)!important;font-size:10.5px!important;text-decoration:underline;text-underline-offset:2px}
    .train-destination-clear:hover{color:var(--led)!important}
    .train-journey-summary{display:flex;flex-direction:column;gap:2px;margin-top:5px;color:var(--text-dim);font-size:10.5px;line-height:1.35}
    .train-journey-summary strong{color:var(--led);font-family:'Martian Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.02em}
    .train-journey-summary[hidden]{display:none}
    @media (max-width:820px){.train-destination-wrap{margin-top:-2px;margin-bottom:8px}.train-journey-summary{font-size:9.5px}}
  `;
  document.head.appendChild(style);
}

function installUi(){
  if($('trainDestinationQuery')){ installSuggestionHandlers(); return true; }
  const fromInput = $('trainStationQuery');
  const fromWrap = fromInput && fromInput.closest('.train-search-wrap');
  const stationMeta = $('trainStationMeta');
  if(!fromInput || !fromWrap || !stationMeta) return false;

  const fromLabel = fromWrap.querySelector('label');
  if(fromLabel) fromLabel.textContent = 'From';
  fromInput.placeholder = 'e.g. Birmingham New Street or BHM';

  const wrap = document.createElement('div');
  wrap.className = 'train-search-wrap train-destination-wrap';
  wrap.innerHTML = `
    <label for="trainDestinationQuery">To</label>
    <div class="train-search-box">
      <input id="trainDestinationQuery" type="text" autocomplete="off" spellcheck="false" disabled aria-autocomplete="list" aria-controls="trainDestinationSuggest" placeholder="Choose a departure station first">
      <button id="trainDestinationGo" type="button" disabled>Find</button>
    </div>
    <div id="trainDestinationSuggest" class="train-suggest" role="listbox" hidden></div>
    <button id="trainDestinationClear" class="train-destination-clear" type="button" hidden>Clear destination · show all trains</button>`;
  fromWrap.insertAdjacentElement('afterend',wrap);

  const summary = document.createElement('div');
  summary.id = 'trainJourneySummary';
  summary.className = 'train-journey-summary';
  summary.hidden = true;
  stationMeta.insertAdjacentElement('afterend',summary);

  const destinationInput = $('trainDestinationQuery');
  destinationInput.addEventListener('input',()=>{
    if(routeState.destination){
      routeState.destination = null;
      saveRoute();
      updateSummary();
    }
    scheduleSearch();
  });
  destinationInput.addEventListener('keydown',event=>{
    if(event.key === 'Enter'){ event.preventDefault(); submitDestination(); }
    if(event.key === 'Escape') closeSuggestions();
  });
  $('trainDestinationGo').addEventListener('click',submitDestination);
  $('trainDestinationClear').addEventListener('click',()=>clearDestination({reload:true}));
  installSuggestionHandlers();

  fromInput.addEventListener('input',()=>{
    if(!routeState.destination) return;
    const api = window.__KERBSIDE_TRAINS__;
    const selected = api && api.state && api.state.station;
    const value = fromInput.value.trim().toLowerCase();
    const name = selected ? String(selected.name || '').trim().toLowerCase() : '';
    const crs = selected ? String(selected.crs || '').trim().toLowerCase() : '';
    if(value !== name && value !== crs){
      routeState.fromCrs = '';
      clearDestination({disable:true});
    }
  });

  document.addEventListener('click',event=>{
    const destinationWrap = $('trainDestinationQuery')?.closest('.train-destination-wrap') || document.querySelector('.train-destination-wrap');
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const inside = !!(destinationWrap && (path.includes(destinationWrap)
      || (event.target && destinationWrap.contains(event.target))));
    if(!inside) closeSuggestions();
  });

  const api = window.__KERBSIDE_TRAINS__;
  const selected = api && api.state && api.state.station;
  if(selected && selected.crs) setFromCrs(selected.crs);
  else if(routeState.fromCrs) setDestinationEnabled(true);
  else setDestinationEnabled(false);
  updateSummary();
  return true;
}

function improveEmptyState(){
  if(!routeState.destination) return;
  const board = $('trainBoard');
  if(!board || board.querySelector('.train-service')) return;
  const empty = board.querySelector('.train-empty');
  if(!empty) return;
  const strong = empty.querySelector('strong');
  const span = empty.querySelector('span');
  if(!strong || strong.textContent.trim() !== 'No departures reported') return;
  strong.textContent = `No direct trains to ${routeState.destination.name || routeState.destination.crs}`;
  const message = 'No upcoming direct service was returned in the current departure window. Clear the destination to see all trains.';
  if(span && span.textContent !== message) span.textContent = message;
}

function observeBoard(){
  const board = $('trainBoard');
  if(!board) return;
  new MutationObserver(()=>{
    updateSummary();
    improveEmptyState();
  }).observe(board,{childList:true,subtree:true});
}

function init(){
  installStyles();
  if(!installUi()){
    setTimeout(init,0);
    return;
  }
  observeBoard();
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();

window.__KERBSIDE_TRAIN_ROUTES__ = {
  state:routeState,
  clearDestination,
  setFromCrs,
  ensureFromCrs,
  selectedOriginCrs,
  selectDestination,
  reloadBoard,
  rewrittenDepartureUrl
};

})();
