(function(){
'use strict';

const PROVIDER_BASE = 'https://huxley2.azurewebsites.net';
const STORE_KEY = 'kerbside.rail.v1';
const MODEL_KEY = 'kerbside.rail.crowding.v2';
const MODEL_VERSION = 3;
const REFRESH_MS = 30000;
const SEARCH_DELAY_MS = 280;
const REQUEST_TIMEOUT_MS = 10000;
const MODEL_MAX_PROFILES = 180;
const MODEL_MAX_SEEN = 500;
const MODEL_PROFILE_MAX_AGE_MS = 120 * 24 * 60 * 60 * 1000;
const MODEL_SEEN_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000;
const MODEL_FEEDBACK_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const ACCURACY_KEY = 'kerbside.rail.forecast.accuracy.v1';
const ACCURACY_VERSION = 3;
const ACCURACY_RECENT_MAX = 120;
const CROWD_LEVEL_RANK = {quiet:0,moderate:1,busy:2,'very-busy':3};

const FEEDBACK_SCORE = {
  quiet: 0.75,
  moderate: 2.0,
  busy: 3.25,
  'very-busy': 4.45
};
const FEEDBACK_LABEL = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
  'very-busy': 'Very busy'
};

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
  searchSeq: 0,
  boardSeq: 0,
  crowdingModel: null,
  forecastAccuracy: null
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

function emptyCrowdingModel(){
  return {version:MODEL_VERSION, profiles:{}, patternProfiles:{}, seen:{}, feedbackSeen:{}, observedSeen:{}};
}

function safeReadCrowdingModel(){
  try{
    const raw = localStorage.getItem(MODEL_KEY);
    if(!raw) return emptyCrowdingModel();
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== 'object') return emptyCrowdingModel();
    if(parsed.version===2) parsed.version=MODEL_VERSION;
    if(parsed.version!==MODEL_VERSION) return emptyCrowdingModel();
    if(!parsed.profiles || typeof parsed.profiles !== 'object') parsed.profiles = {};
    if(!parsed.patternProfiles || typeof parsed.patternProfiles !== 'object') parsed.patternProfiles = {};
    if(!parsed.seen || typeof parsed.seen !== 'object') parsed.seen = {};
    if(!parsed.feedbackSeen || typeof parsed.feedbackSeen !== 'object') parsed.feedbackSeen = {};
    if(!parsed.observedSeen || typeof parsed.observedSeen !== 'object') parsed.observedSeen = {};
    return parsed;
  }catch(e){ return emptyCrowdingModel(); }
}

function pruneTimestampMap(map, maxAge, maxEntries){
  const now = Date.now();
  Object.keys(map).forEach(key=>{
    const value = map[key];
    const ts = Number(value && typeof value === 'object' ? value.ts : value) || 0;
    if(!ts || now - ts > maxAge) delete map[key];
  });
  const keys = Object.keys(map);
  if(keys.length <= maxEntries) return;
  keys.sort((a,b)=>{
    const aValue = map[a], bValue = map[b];
    const aTs = Number(aValue && typeof aValue === 'object' ? aValue.ts : aValue) || 0;
    const bTs = Number(bValue && typeof bValue === 'object' ? bValue.ts : bValue) || 0;
    return bTs - aTs;
  });
  keys.slice(maxEntries).forEach(key=>delete map[key]);
}

function pruneCrowdingModel(model){
  const now = Date.now();
  Object.keys(model.profiles).forEach(key=>{
    const profile = model.profiles[key];
    if(!profile || now - (Number(profile.updatedAt) || 0) > MODEL_PROFILE_MAX_AGE_MS) delete model.profiles[key];
  });
  const patternKeys=Object.keys(model.patternProfiles||{});if(patternKeys.length>240){patternKeys.sort((a,b)=>(Number(model.patternProfiles[b].updatedAt)||0)-(Number(model.patternProfiles[a].updatedAt)||0));patternKeys.slice(240).forEach(key=>delete model.patternProfiles[key]);}
  const profileKeys = Object.keys(model.profiles);
  if(profileKeys.length > MODEL_MAX_PROFILES){
    profileKeys.sort((a,b)=>(Number(model.profiles[b].updatedAt)||0)-(Number(model.profiles[a].updatedAt)||0));
    profileKeys.slice(MODEL_MAX_PROFILES).forEach(key=>delete model.profiles[key]);
  }
  pruneTimestampMap(model.seen, MODEL_SEEN_MAX_AGE_MS, MODEL_MAX_SEEN);
  pruneTimestampMap(model.feedbackSeen, MODEL_FEEDBACK_MAX_AGE_MS, MODEL_MAX_SEEN);
  pruneTimestampMap(model.observedSeen, MODEL_SEEN_MAX_AGE_MS, MODEL_MAX_SEEN);
}

function saveCrowdingModel(){
  try{
    if(!state.crowdingModel) return;
    pruneCrowdingModel(state.crowdingModel);
    localStorage.setItem(MODEL_KEY, JSON.stringify(state.crowdingModel));
  }catch(e){}
}


function emptyForecastAccuracy(){return {version:ACCURACY_VERSION,total:0,exact:0,withinOne:0,absoluteError:0,buckets:{},sources:{},recent:[]};}
function safeReadForecastAccuracy(){
  try{const parsed=JSON.parse(localStorage.getItem(ACCURACY_KEY)||'null');if(!parsed)return emptyForecastAccuracy();if(parsed.version===1){parsed.version=2;parsed.buckets={};}if(parsed.version===2){parsed.version=ACCURACY_VERSION;parsed.sources={feedback:{total:Number(parsed.total)||0,exact:Number(parsed.exact)||0,withinOne:Number(parsed.withinOne)||0,absoluteError:Number(parsed.absoluteError)||0}};if(Array.isArray(parsed.recent))parsed.recent.forEach(row=>{if(row&&!row.source)row.source='feedback';});}if(parsed.version!==ACCURACY_VERSION)return emptyForecastAccuracy();if(!parsed.buckets||typeof parsed.buckets!=='object')parsed.buckets={};if(!parsed.sources||typeof parsed.sources!=='object')parsed.sources={};if(!Array.isArray(parsed.recent))parsed.recent=[];return parsed;}catch(error){return emptyForecastAccuracy();}
}
function saveForecastAccuracy(){try{if(!state.forecastAccuracy)return;state.forecastAccuracy.recent=(state.forecastAccuracy.recent||[]).slice(-ACCURACY_RECENT_MAX);localStorage.setItem(ACCURACY_KEY,JSON.stringify(state.forecastAccuracy));}catch(error){}}
function forecastAccuracySummary(){const data=state.forecastAccuracy||safeReadForecastAccuracy(),total=Number(data.total)||0;return {total,exact:total?Number(data.exact||0)/total:0,withinOne:total?Number(data.withinOne||0)/total:0,meanAbsoluteError:total?Number(data.absoluteError||0)/total:0,recent:Array.isArray(data.recent)?data.recent.length:0,sources:{feedback:forecastAccuracyForSource('feedback'),observed:forecastAccuracyForSource('darwin-loading')}};}
function forecastAccuracyForSource(source){const data=state.forecastAccuracy||safeReadForecastAccuracy(),row=data.sources&&data.sources[String(source||'')],total=Number(row&&row.total)||0;return {total,exact:total?Number(row.exact||0)/total:0,withinOne:total?Number(row.withinOne||0)/total:0,meanAbsoluteError:total?Number(row.absoluteError||0)/total:0};}
function forecastAccuracyForBucket(bucket){const data=state.forecastAccuracy||safeReadForecastAccuracy(),row=data.buckets&&data.buckets[String(bucket||'')],total=Number(row&&row.total)||0;return {total,exact:total?Number(row.exact||0)/total:0,withinOne:total?Number(row.withinOne||0)/total:0,meanAbsoluteError:total?Number(row.absoluteError||0)/total:0};}
function recordForecastAccuracy(service,index,reportedLevel,date,source){
  const actual=CROWD_LEVEL_RANK[reportedLevel],api=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__;
  if(actual==null||!api||typeof api.forecast!=='function'||!state.station)return false;
  let result;try{result=api.forecast(service,index,state.services,{station:state.station,referenceDate:date,messages:state.board&&state.board.nrccMessages||[]});}catch(error){return false;}
  const predictedLevel=String(result&&result.level||''),predicted=CROWD_LEVEL_RANK[predictedLevel];if(predicted==null)return false;
  if(!state.forecastAccuracy)state.forecastAccuracy=safeReadForecastAccuracy();
  const error=Math.abs(predicted-actual),data=state.forecastAccuracy,ts=Date.now(),bucket=String(result&&result.accuracyBucket||'legacy');
  data.total=(Number(data.total)||0)+1;if(error===0)data.exact=(Number(data.exact)||0)+1;if(error<=1)data.withinOne=(Number(data.withinOne)||0)+1;data.absoluteError=(Number(data.absoluteError)||0)+error;
  const row=data.buckets[bucket]||(data.buckets[bucket]={total:0,exact:0,withinOne:0,absoluteError:0});row.total++;if(error===0)row.exact++;if(error<=1)row.withinOne++;row.absoluteError+=error;
  /* Which population this sample came from. Feedback is self-selected — a
     passenger presses it when the forecast feels wrong — so it cannot be
     averaged together with objective Darwin loading and still describe the
     model. Kept apart so each can be read on its own. */
  const origin=source==='darwin-loading'?'darwin-loading':'feedback';
  if(!data.sources||typeof data.sources!=='object')data.sources={};
  const originRow=data.sources[origin]||(data.sources[origin]={total:0,exact:0,withinOne:0,absoluteError:0});
  originRow.total++;if(error===0)originRow.exact++;if(error<=1)originRow.withinOne++;originRow.absoluteError+=error;
  /* Only evidence bucket + predicted/actual band/error are retained. No station, service, route, train ID or user identifier. */
  data.recent=(Array.isArray(data.recent)?data.recent:[]).concat([{ts,predicted:predictedLevel,actual:reportedLevel,error,bucket,source:origin}]).slice(-ACCURACY_RECENT_MAX);saveForecastAccuracy();return true;
}

async function fetchWithTimeout(url, options={}){
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
  try{
    const response = await fetch(url, {...options, signal:controller.signal, headers:{Accept:'application/json', ...(options.headers||{})}});
    /* fetch settles when the response headers arrive, not when its body has, so
       clearing the timer at that point left every body downloading untimed. A
       provider that answered and then stalled part-way through the JSON hung
       the awaiting caller for good — measured still hanging four seconds after
       a one-second timeout, against 1001ms once the body is read inside it.
       That is a live board stuck on "loading", a station search whose
       suggestions never arrive, and an expanded service that stays blank.
       Read the body while the timer is still armed, then hand back a response
       the callers read exactly as before. */
    const body = await response.arrayBuffer();
    const empty = response.status===204 || response.status===205 || response.status===304;
    return new Response(empty?null:body, {status:response.status, statusText:response.statusText, headers:response.headers});
  } finally {
    clearTimeout(timeout);
    if(detach) detach();
  }
}

/* National Rail publishes NRCC messages as HTML, so the text has to be pulled
   out of them before it is shown or pattern-matched. Doing that by assigning
   innerHTML to a detached <div> is not inert: the browser still builds the
   elements, still fetches every src inside them, and still runs an onload or
   onerror handler. Measured in Chromium, a handler fired and a network request
   was issued from a div that was never attached to the document — so a
   "sanitiser" was handing script execution to whatever the rail provider
   returned, and that provider is a community-hosted proxy rather than National
   Rail itself. A DOMParser document has no browsing context: same text out,
   nothing fetched, nothing executed. */
const HTML_TEXT_PARSER = typeof DOMParser === 'function' ? new DOMParser() : null;
function stripHtml(value){
  const raw = String(value || '');
  if(!raw) return '';
  if(!HTML_TEXT_PARSER) return raw.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const parsed = HTML_TEXT_PARSER.parseFromString(raw,'text/html');
  return ((parsed && parsed.body && parsed.body.textContent) || '').replace(/\s+/g,' ').trim();
}

function normaliseToken(value){
  return String(value || '').trim().toLowerCase().replace(/\s+/g,' ');
}

function parseMinutes(value){
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1])*60 + Number(m[2]) : null;
}

function forwardGap(fromMinute, toMinute){
  if(fromMinute == null || toMinute == null) return null;
  let gap = toMinute - fromMinute;
  if(gap < 0) gap += 1440;
  return gap;
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

function primaryDestination(service){
  const item = Array.isArray(service && service.destination) ? service.destination.find(Boolean) : null;
  return {
    name: item && item.locationName ? String(item.locationName) : destinationText(service),
    crs: item && item.crs ? String(item.crs).toUpperCase() : ''
  };
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

function referenceDateFromBoard(){
  const generated = state.board && state.board.generatedAt ? new Date(state.board.generatedAt) : null;
  return generated && !Number.isNaN(generated.getTime()) ? generated : new Date();
}

function gbDayIndex(date){
  const label = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short'}).format(date || new Date());
  return ({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6})[label] ?? (date || new Date()).getDay();
}

function gbDateStamp(date){
  const parts = new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(date || new Date());
  const map = Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${map.year || '0000'}-${map.month || '00'}-${map.day || '00'}`;
}

function dayClassFor(date){
  const day = gbDayIndex(date || new Date());
  if(day === 5) return 'friday';
  if(day === 0 || day === 6) return 'weekend';
  return 'weekday';
}

function demandSignal(date, minute){
  if(minute == null) return {amount:0.15, reason:'unknown departure-time demand'};
  const day = gbDayIndex(date || new Date());
  const weekday = day >= 1 && day <= 5;
  let amount = 0.1;
  let reason = 'lower-demand travel period';

  if(weekday){
    if(minute >= 7*60+30 && minute < 9*60){
      amount = 1.4; reason = 'strong weekday morning demand';
    }else if((minute >= 6*60+30 && minute < 7*60+30) || (minute >= 9*60 && minute < 10*60)){
      amount = 0.85; reason = 'weekday morning shoulder demand';
    }else if(minute >= 16*60+30 && minute < 18*60+30){
      amount = 1.3; reason = 'strong weekday evening demand';
    }else if((minute >= 15*60+30 && minute < 16*60+30) || (minute >= 18*60+30 && minute < 20*60)){
      amount = 0.75; reason = 'weekday evening shoulder demand';
    }else if(minute >= 10*60 && minute < 15*60+30){
      amount = 0.3; reason = 'weekday daytime demand';
    }else if(minute >= 20*60 && minute < 22*60){
      amount = 0.35; reason = 'weekday evening leisure demand';
    }
    if(day === 5 && minute >= 14*60 && minute < 20*60){
      amount += 0.3;
      reason = 'Friday afternoon and evening demand';
    }
  }else if(minute >= 10*60 && minute < 18*60){
    amount = 0.55; reason = 'weekend daytime demand';
  }else if(minute >= 18*60 && minute < 21*60){
    amount = 0.4; reason = 'weekend evening demand';
  }
  return {amount, reason};
}

function operatorIdentity(service){
  return normaliseToken(service && (service.operatorCode || service.operator || 'unknown'));
}

function destinationIdentity(service){
  const destination = primaryDestination(service);
  return normaliseToken(destination.crs || destination.name || 'unknown');
}

/* The route board deliberately rewrites service.destination to the user's
   selected destination. Local history, however, was learned from the live
   board under the train's real terminus. Keep those two identities separate
   so BHM -> BRI on a Plymouth train can reuse the same historical profile. */
function profileDestinationIdentity(service){
  const display=service&&service.displayDestination;
  const terminus=display&&(display.crs||display.name||display.locationName);
  return normaliseToken(terminus||destinationIdentity(service)||'unknown');
}

function isSimilarService(a,b){
  if(!a || !b) return false;
  const aDest = destinationIdentity(a);
  const bDest = destinationIdentity(b);
  if(!aDest || !bDest || aDest !== bDest) return false;
  const aOperator = operatorIdentity(a);
  const bOperator = operatorIdentity(b);
  return !aOperator || !bOperator || aOperator === bOperator;
}

function routeContext(service,index,allServices){
  const list = Array.isArray(allServices) ? allServices : [];
  const currentMinute = parseMinutes(service && service.std);
  let previous = null;
  let next = null;
  let cancelledBefore = 0;
  let cancelledAfter = 0;

  for(let i=index-1;i>=0;i--){
    const candidate = list[i];
    if(!isSimilarService(service,candidate)) continue;
    const candidateMinute = parseMinutes(candidate.std);
    const gap = forwardGap(candidateMinute,currentMinute);
    if(gap == null || gap > 180) continue;
    if(candidate.isCancelled){
      if(gap <= 90) cancelledBefore++;
      continue;
    }
    previous = {service:candidate,index:i,gap};
    break;
  }

  for(let i=index+1;i<list.length;i++){
    const candidate = list[i];
    if(!isSimilarService(service,candidate)) continue;
    const candidateMinute = parseMinutes(candidate.std);
    const gap = forwardGap(currentMinute,candidateMinute);
    if(gap == null || gap > 180) continue;
    if(candidate.isCancelled){
      if(gap <= 60) cancelledAfter++;
      continue;
    }
    next = {service:candidate,index:i,gap};
    break;
  }

  return {
    previous,
    next,
    precedingGap:previous ? previous.gap : null,
    followingGap:next ? next.gap : null,
    cancelledBefore,
    cancelledAfter
  };
}

function median(values){
  const nums = values.map(Number).filter(value=>Number.isFinite(value) && value > 0).sort((a,b)=>a-b);
  if(!nums.length) return 0;
  const middle = Math.floor(nums.length/2);
  return nums.length % 2 ? nums[middle] : (nums[middle-1]+nums[middle])/2;
}

function boardFormationBaseline(service,allServices){
  const operator = operatorIdentity(service);
  const sameOperator = (Array.isArray(allServices) ? allServices : [])
    .filter(candidate=>!candidate.isCancelled && operatorIdentity(candidate) === operator)
    .map(candidate=>Number(candidate.length) || 0)
    .filter(Boolean);
  if(sameOperator.length >= 2) return median(sameOperator);
  const allLengths = (Array.isArray(allServices) ? allServices : [])
    .filter(candidate=>!candidate.isCancelled)
    .map(candidate=>Number(candidate.length) || 0)
    .filter(Boolean);
  return allLengths.length >= 3 ? median(allLengths) : 0;
}

function stationMatchesOrigin(service,station){
  const origins = Array.isArray(service && service.origin) ? service.origin.filter(Boolean) : [];
  if(!origins.length || !station) return null;
  const stationCrs = String(station.crs || '').toUpperCase();
  const stationName = normaliseToken(station.name);
  return origins.some(origin=>{
    const originCrs = String(origin.crs || '').toUpperCase();
    const originName = normaliseToken(origin.locationName);
    return (stationCrs && originCrs === stationCrs) || (stationName && originName === stationName);
  });
}

function profileKeyFor(service,station,date){
  const stationCode = normaliseToken(station && (station.crs || station.name) || 'unknown');
  const minute = parseMinutes(service && service.std);
  const band = minute == null ? 'x' : String(Math.floor(minute / 120));
  return [stationCode,operatorIdentity(service),profileDestinationIdentity(service),dayClassFor(date),band].join('|');
}

function patternKeyFor(service,station,date){const stationCode=normaliseToken(station&&(station.crs||station.name)||'unknown'),minute=parseMinutes(service&&service.std),slot=minute==null?'x':String(Math.round(minute/30));return [stationCode,operatorIdentity(service),profileDestinationIdentity(service),dayClassFor(date),slot].join('|');}
function ensurePatternProfile(key){const model=state.crowdingModel||(state.crowdingModel=emptyCrowdingModel());if(!model.patternProfiles)model.patternProfiles={};if(!model.patternProfiles[key])model.patternProfiles[key]={samples:0,lengthSamples:0,avgLength:0,delaySamples:0,avgDelay:0,headwaySamples:0,avgHeadway:0,cancelledSamples:0,cancelledCount:0,updatedAt:Date.now()};return model.patternProfiles[key];}
function servicePatternProfile(service,station,date){const model=state.crowdingModel;if(!model||!model.patternProfiles)return null;return model.patternProfiles[patternKeyFor(service,station,date)]||null;}

function ensureProfile(key){
  const model = state.crowdingModel || (state.crowdingModel = emptyCrowdingModel());
  if(!model.profiles[key]){
    model.profiles[key] = {
      samples:0,
      lengthSamples:0,avgLength:0,
      headwaySamples:0,avgHeadway:0,
      delaySamples:0,avgDelay:0,
      cancelledSamples:0,cancelledCount:0,
      feedbackCount:0,feedbackMean:0,
      updatedAt:Date.now()
    };
  }
  return model.profiles[key];
}

function getProfile(service,station,date){
  const model = state.crowdingModel;
  if(!model) return null;
  return model.profiles[profileKeyFor(service,station,date)] || null;
}

function updateAverage(profile,valueField,countField,value){
  if(!Number.isFinite(value)) return;
  const count = Number(profile[countField]) || 0;
  const average = Number(profile[valueField]) || 0;
  profile[valueField] = count ? average + (value-average)/(count+1) : value;
  profile[countField] = count + 1;
}

function observationId(service,index,station,date){
  return [gbDateStamp(date),String(station && station.crs || '').toUpperCase(),serviceKey(service,index),service.std || ''].join('|');
}

/* Scoring the forecast against something that did not choose to be asked.

   recordForecastAccuracy() was reachable from exactly one place: the crowding
   feedback control. A passenger presses that when the forecast feels wrong, so
   the only measurement the model had of itself was drawn from a sample selected
   for disagreeing with it — and every attempt to improve the model was being
   judged by it.

   Darwin already supplies an objective outcome, free, whenever a service
   carries explicit coach loading, and kerbside-train-loading.js reduces it to
   the same four bands the forecast predicts in. Pair them at the moment both
   are in hand.

   The prediction being scored is the unblended Forecast v4 answer:
   recordForecastAccuracy calls api.forecast directly, while the live loading is
   layered on afterwards by forecastFor(). The evidence supplying the outcome is
   therefore never folded into the prediction it is judging.

   Probe rule 3 holds throughout — absent loading is not evidence of a quiet
   train, so a service without explicit loading is simply not sampled. */
function liveLoadingEvidence(service){
  const loading = window.__KERBSIDE_TRAIN_LOADING__;
  if(!loading || typeof loading.evidenceFor !== 'function') return null;
  let live = null;
  try{ live = loading.evidenceFor(service); }catch(error){ return null; }
  return live && live.available && CROWD_LEVEL_RANK[live.level] != null ? live : null;
}
function recordObservedAccuracy(){
  if(!state.station || !state.services.length) return 0;
  if(!state.crowdingModel) state.crowdingModel = safeReadCrowdingModel();
  const date = referenceDateFromBoard();
  let recorded = 0;
  state.services.forEach((service,index)=>{
    const live = liveLoadingEvidence(service);
    if(!live) return;
    /* The board refreshes every thirty seconds and a train keeps its loading
       between refreshes, so the same report must not be counted repeatedly.
       Keying on the reported average means a genuinely changed loading value
       for the same service scores again, which is a real second observation. */
    const id = observationId(service,index,state.station,date)+'|loading|'+live.average;
    if(state.crowdingModel.observedSeen[id]) return;
    if(!recordForecastAccuracy(service,index,live.level,date,'darwin-loading')) return;
    state.crowdingModel.observedSeen[id] = Date.now();
    recorded++;
  });
  if(recorded) saveCrowdingModel();
  return recorded;
}

function recordBoardObservations(){
  if(!state.station || !state.services.length) return;
  if(!state.crowdingModel) state.crowdingModel = safeReadCrowdingModel();
  const date = referenceDateFromBoard();
  let changed = false;

  state.services.forEach((service,index)=>{
    const id = observationId(service,index,state.station,date);
    if(state.crowdingModel.seen[id]) return;
    const profile = ensureProfile(profileKeyFor(service,state.station,date));
    const pattern = ensurePatternProfile(patternKeyFor(service,state.station,date));
    const context = routeContext(service,index,state.services);
    const length = Number(service.length) || 0;
    const delay = delayMinutes(service);
    const headway = context.precedingGap || context.followingGap;

    profile.samples = (Number(profile.samples) || 0) + 1;
    if(length > 0) updateAverage(profile,'avgLength','lengthSamples',length);
    if(headway != null && headway > 0 && headway <= 180) updateAverage(profile,'avgHeadway','headwaySamples',headway);
    if(!service.isCancelled && Number.isFinite(delay)) updateAverage(profile,'avgDelay','delaySamples',delay);
    profile.cancelledSamples = (Number(profile.cancelledSamples) || 0) + 1;
    if(service.isCancelled) profile.cancelledCount = (Number(profile.cancelledCount) || 0) + 1;
    profile.updatedAt = Date.now();
    pattern.samples=(Number(pattern.samples)||0)+1;if(length>0)updateAverage(pattern,'avgLength','lengthSamples',length);if(headway!=null&&headway>0&&headway<=180)updateAverage(pattern,'avgHeadway','headwaySamples',headway);if(!service.isCancelled&&Number.isFinite(delay))updateAverage(pattern,'avgDelay','delaySamples',delay);pattern.cancelledSamples=(Number(pattern.cancelledSamples)||0)+1;if(service.isCancelled)pattern.cancelledCount=(Number(pattern.cancelledCount)||0)+1;pattern.updatedAt=Date.now();
    state.crowdingModel.seen[id] = Date.now();
    changed = true;
  });

  if(changed) saveCrowdingModel();
}

function feedbackForService(service,index){
  if(!state.crowdingModel || !state.station) return '';
  const date = referenceDateFromBoard();
  const value = state.crowdingModel.feedbackSeen[observationId(service,index,state.station,date)];
  return value && typeof value === 'object' ? String(value.level || '') : '';
}

function recordCrowdingFeedback(service,index,level){
  if(!Object.prototype.hasOwnProperty.call(FEEDBACK_SCORE,level) || !state.station) return false;
  if(!state.crowdingModel) state.crowdingModel = safeReadCrowdingModel();
  const date = referenceDateFromBoard();
  const id = observationId(service,index,state.station,date);
  if(state.crowdingModel.feedbackSeen[id]) return false;

  recordForecastAccuracy(service,index,level,date);
  const profile = ensureProfile(profileKeyFor(service,state.station,date));
  const count = Number(profile.feedbackCount) || 0;
  const mean = Number(profile.feedbackMean) || 0;
  const value = FEEDBACK_SCORE[level];
  profile.feedbackMean = count ? mean + (value-mean)/(count+1) : value;
  profile.feedbackCount = count + 1;
  profile.updatedAt = Date.now();
  state.crowdingModel.feedbackSeen[id] = {level,ts:Date.now()};
  saveCrowdingModel();
  return true;
}

function disruptionMessageSignal(messages){
  const text = (Array.isArray(messages) ? messages : [])
    .map(item=>stripHtml(item && (item.value || item.message || item)))
    .join(' ')
    .toLowerCase();
  if(!text) return 0;
  if(/cancel|fewer train|reduced service|short formation|overcrowd|severe disruption|major disruption/.test(text)) return 0.35;
  if(/disrupt|delay|altered service|service change/.test(text)) return 0.18;
  return 0;
}

function confidenceLabel(evidence){
  if(evidence >= 4) return 'Medium–high';
  if(evidence >= 3) return 'Medium';
  if(evidence >= 1.75) return 'Low–medium';
  return 'Low';
}

function crowdingForecast(service,index,allServices,options={}){
  const v3Baseline = options.modelLayer === 'v3-baseline';
  if(service.isCancelled){
    return {
      level:'unknown',label:'Not applicable',confidence:'—',score:null,
      reasons:['This service is cancelled.'],historySamples:0,feedbackSamples:0,modelVersion:MODEL_VERSION
    };
  }

  const station = options.station || state.station || null;
  const date = options.referenceDate instanceof Date ? options.referenceDate : referenceDateFromBoard();
  const messages = options.messages || (state.board && state.board.nrccMessages) || [];
  const profile = getProfile(service,station,date);
  const depMinute = parseMinutes(service.std);
  const context = routeContext(service,index,allServices);
  const contributors = [];
  let score = 0.7;
  let evidence = 0.5;

  const add = (amount,reason,evidenceGain=0)=>{
    if(!Number.isFinite(amount) || !amount) return;
    score += amount;
    contributors.push({amount,reason});
    evidence += evidenceGain;
  };

  const demand = demandSignal(date,depMinute);
  add(demand.amount,demand.reason,0.35);

  if(!v3Baseline){
    const length = Number(service.length) || 0;
    let expectedLength = 0;
    let lengthSource = '';
    if(profile && Number(profile.lengthSamples) >= 3 && Number(profile.avgLength) > 0){
      expectedLength = Number(profile.avgLength);
      lengthSource = 'local history';
      evidence += 1.1;
    }else{
      expectedLength = boardFormationBaseline(service,allServices);
      if(expectedLength){ lengthSource = 'nearby services'; evidence += 0.55; }
    }

    if(length > 0){
      evidence += 0.45;
      if(expectedLength > 0){
        const ratio = length / expectedLength;
        if(ratio <= 0.7) add(1.0,`formation is much shorter than ${lengthSource} suggests`,0.15);
        else if(ratio <= 0.85) add(0.65,`formation is shorter than ${lengthSource} suggests`,0.15);
        else if(ratio <= 0.95) add(0.25,`formation is slightly shorter than ${lengthSource} suggests`,0.1);
        else if(ratio >= 1.3) add(-0.55,`formation is much longer than ${lengthSource} suggests`,0.15);
        else if(ratio >= 1.15) add(-0.3,`formation is longer than ${lengthSource} suggests`,0.1);
      }else if(length <= 3){
        add(0.45,'short formation reported',0.1);
      }else if(length >= 9){
        add(-0.25,'long formation reported',0.1);
      }
    }
  }

  const precedingGap = context.precedingGap;
  const historicalHeadway = profile && Number(profile.headwaySamples) >= 3 ? Number(profile.avgHeadway) : 0;
  if(precedingGap != null){
    evidence += 0.45;
    if(historicalHeadway > 0){
      const ratio = precedingGap / historicalHeadway;
      evidence += 0.8;
      if(ratio >= 1.6) add(0.7,'gap before this train is much longer than normal',0.1);
      else if(ratio >= 1.3) add(0.4,'gap before this train is longer than normal',0.1);
      else if(ratio <= 0.65) add(-0.2,'similar trains are running closer together than normal',0.1);
    }else if(precedingGap >= 45){
      add(0.35,'long gap since the previous similar train',0.05);
    }else if(precedingGap >= 25){
      add(0.15,'wider gap since the previous similar train',0.05);
    }else if(precedingGap <= 10){
      add(-0.15,'another similar train ran shortly before',0.05);
    }
  }

  if(!v3Baseline){
    if(context.cancelledBefore){
      add(Math.min(1.25,context.cancelledBefore*0.6),
        `${context.cancelledBefore} earlier similar service${context.cancelledBefore===1?' was':'s were'} cancelled`,0.65);
    }
    if(context.cancelledAfter){
      add(Math.min(0.45,context.cancelledAfter*0.25),
        'a nearby later similar service is cancelled',0.25);
    }
  }

  if(!v3Baseline){
    const etd = String(service.etd || '').trim();
    const delay = delayMinutes(service);
    if(/^delayed$/i.test(etd)) add(0.55,'service is currently reported delayed',0.45);
    else if(delay >= 20) add(0.7,`current delay is ${delay} minutes`,0.5);
    else if(delay >= 10) add(0.45,`current delay is ${delay} minutes`,0.45);
    else if(delay >= 5) add(0.2,`current delay is ${delay} minutes`,0.35);
    else evidence += 0.2;
  }

  if(!v3Baseline){
    const startsHere = stationMatchesOrigin(service,station);
    if(startsHere === true) add(-0.25,'train starts at this station',0.35);
    else if(startsHere === false) add(0.25,'through train may already carry passengers',0.35);
  }

  const disruption = disruptionMessageSignal(messages);
  if(disruption >= 0.3) add(disruption,'station disruption may shift passengers onto remaining trains',0.2);
  else if(disruption > 0) add(disruption,'current station disruption adds demand uncertainty',0.1);

  const feedbackCount = profile ? Number(profile.feedbackCount) || 0 : 0;
  if(!v3Baseline && options.includeFeedback !== false && feedbackCount > 0 && Number.isFinite(Number(profile.feedbackMean))){
    const target = Number(profile.feedbackMean);
    const weight = Math.min(0.5,0.12 + feedbackCount*0.06);
    const blended = score*(1-weight) + target*weight;
    const delta = blended - score;
    score = blended;
    if(Math.abs(delta) >= 0.05){
      contributors.push({amount:delta,reason:'local crowding feedback for similar trains and time bands'});
    }
    evidence += 1 + Math.min(1.2,feedbackCount*0.25);
  }

  score = Math.max(0,Math.min(5,score));
  let level = 'quiet', label = 'Expected quiet';
  if(score >= 3.7){ level='very-busy'; label='Expected very busy'; }
  else if(score >= 2.5){ level='busy'; label='Expected busy'; }
  else if(score >= 1.45){ level='moderate'; label='Expected moderate'; }

  contributors.sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount));
  const reasons = contributors.map(item=>item.reason).filter(Boolean).slice(0,5);
  if(!reasons.length) reasons.push('typical lower-demand operating conditions');

  return {
    level,
    label,
    confidence:confidenceLabel(evidence),
    score,
    reasons,
    historySamples:profile ? Number(profile.samples) || 0 : 0,
    feedbackSamples:feedbackCount,
    modelVersion:MODEL_VERSION
  };
}

function providerNotice(){
  return "Live running evidence comes from National Rail Darwin with the app's configured fallbacks. Forecast v4 combines timetable demand, service spacing, events, calendar effects, DfT calibration and live Darwin evidence when available. Passenger-submitted crowding reports do not alter the Forecast v4 score. It is not ticket-sales data and not live occupancy.";
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
          <span class="train-model-label">Forecast v4</span>
          <strong>Timetable + live prediction</strong>
          <p>Kerbside combines timetable demand, service spacing, events, calendar effects and measured DfT calibration, then adds Darwin delays, cancellations, formation and route-loading evidence when those live fields become available. Passenger crowding reports are stored locally for accuracy checks, not score calibration.</p>
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
  document.title = train ? 'Kerbside — live trains near you' : 'Kerbside — live buses near you';
  const brandModeLabel = $('brandModeLabel');
  if(brandModeLabel) brandModeLabel.textContent = train ? 'live trains' : 'live buses';
  const trainSourceNote = $('trainSourceNote');
  if(trainSourceNote) trainSourceNote.hidden = !train;
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
  clearTimeout(state.searchTimer);
  state.searchTimer = null;
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
  const seq = ++state.searchSeq;
  try{
    const response = await fetchWithTimeout(`${PROVIDER_BASE}/crs/${encodeURIComponent(q)}`, {signal:controller.signal});
    if(!response.ok) throw new Error(`Station search returned ${response.status}`);
    const json = await response.json();
    if(seq !== state.searchSeq || controller.signal.aborted) return;
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

function forecastFor(service,index){
  const context={station:state.station,referenceDate:referenceDateFromBoard(),messages:state.board&&state.board.nrccMessages};
  const v4=window.__KERBSIDE_FORECAST_V4__||window.__KERBSIDE_FORECAST_V3__,loading=window.__KERBSIDE_TRAIN_LOADING__;
  const base=v4&&typeof v4.forecast==='function'?v4.forecast(service,index,state.services,context):crowdingForecast(service,index,state.services,context);
  return loading&&typeof loading.applyToForecast==='function'?loading.applyToForecast(base,service):base;
}

function renderBoard(){
  const board = $('trainBoard');
  const name = $('trainStationName');
  const meta = $('trainStationMeta');
  const refresh = $('trainRefresh');
  if(!board || !name || !meta || !state.station) return;

  const payload = state.board || {};
  const services = state.services;
  /* The scheduled timetable and hidden live board share these controls. A
     late Darwin response must not collapse BHM → GLO back to just BHM. */
  const timetableOwned=$('trainMain')?.dataset.railView==='scheduled'&&!$('trainScheduledBoard')?.hidden;
  const resolvedStationName=payload.locationName||state.station.name||state.station.crs;
  state.station.name=resolvedStationName;
  if(!timetableOwned)name.textContent=resolvedStationName;
  const generated = payload.generatedAt ? new Date(payload.generatedAt) : null;
  const freshText = generated && !Number.isNaN(generated.getTime())
    ? `Live board · updated ${generated.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`
    : 'Live board';
  if(!timetableOwned){
    meta.textContent = `${state.station.crs} · ${freshText}`;
    if(refresh){ refresh.disabled=false; refresh.textContent='Refresh'; }
  }
  renderAlerts(payload.nrccMessages);

  if(!services.length){
    board.innerHTML = '<div class="train-empty"><strong>No departures reported</strong><span>The live board returned no upcoming train services for this station.</span></div>';
    return;
  }

  board.innerHTML = services.map((service,index)=>{
    const key = serviceKey(service,index);
    const status = statusFor(service);
    const forecast = forecastFor(service,index);
    const length = Number(service.length) || 0;
    const platform = service.platform ? `Platform ${esc(service.platform)}` : 'Platform TBC';
    const detailOpen = state.selectedServiceId === key;
    const coachText = length > 0 ? `${length} coach${length===1?'':'es'}` : 'Formation unknown';
    const reasonTitle = forecast.reasons.join(', ');
    return `<article class="train-service${detailOpen?' open':''}" data-service-id="${esc(key)}">
      <button class="train-service-summary" type="button" data-service-toggle="${esc(key)}" aria-expanded="${detailOpen?'true':'false'}">
        <span class="train-time"><b>${esc(service.std || '—')}</b><small>${esc(status.label)}</small></span>
        <span class="train-route"><strong>${esc(destinationText(service))}</strong><small>${esc(service.operator || 'Operator unavailable')} · ${platform}</small></span>
        <span class="train-crowding crowd-${esc(forecast.level)}" title="${esc(reasonTitle)}"><i></i><b>${esc(forecast.label)}</b><small>${esc(forecast.evidenceLabel||`${forecast.confidence} confidence`)}</small></span>
        <span class="train-formation"><b>${esc(coachText)}</b><small>train length</small></span>
        <span class="train-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="train-service-detail" id="train-detail-${esc(key)}" ${detailOpen?'':'hidden'}>${detailOpen ? renderDetailPlaceholder(key, service, index, forecast) : ''}</div>
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

function renderDetailPlaceholder(key, service, index, forecast){
  const cached = state.detailCache.get(key);
  if(cached) return renderServiceDetail(service,index,forecast,cached);
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

function renderServiceDetail(service,index,forecast,detail){
  const points = normaliseCallingPointGroups(detail);
  const calling = points.length ? `<div class="train-calling"><div class="train-detail-title">Calling points</div>${points.map(point=>
    `<div class="train-call ${point.phase}${point.cancelled?' cancelled':''}"><i></i><span><b>${esc(point.name)}</b><small>${esc(point.et || point.st || '')}${point.cancelled?' · cancelled':''}</small></span></div>`
  ).join('')}</div>` : '<div class="train-detail-note">Calling-point data is unavailable for this service.</div>';
  const length = Number(service.length) || 0;
  const key = serviceKey(service,index);
  const recorded = feedbackForService(service,index);
  const historySamples=Number(forecast.historySamples)||0;
  const learningText=`${historySamples} local service observation${historySamples===1?'':'s'} available`;
  const accuracy=forecastAccuracySummary();
  /* "reports" described a population that was entirely user taps. Most samples
     are now Darwin's own coach loading, checked automatically, so say which is
     which rather than counting them all as something the passenger did. */
  const observedSamples=Number(accuracy.sources&&accuracy.sources.observed&&accuracy.sources.observed.total)||0;
  const feedbackSamples=Number(accuracy.sources&&accuracy.sources.feedback&&accuracy.sources.feedback.total)||0;
  const sampleParts=[
    observedSamples?`${observedSamples} checked against reported train loading`:'',
    feedbackSamples?`${feedbackSamples} from your own report${feedbackSamples===1?'':'s'}`:''
  ].filter(Boolean).join(' · ');
  const accuracyText=accuracy.total?`Local Forecast v4 validation: ${Math.round(accuracy.exact*100)}% exact · ${Math.round(accuracy.withinOne*100)}% within one band${sampleParts?` · ${sampleParts}`:''}.`:'Local Forecast v4 validation starts once this train reports its loading, or you record actual crowding.';
  const modelLabel=Number(forecast.modelVersion)>=4?'Forecast v4':Number(forecast.modelVersion)>=3?'Forecast v3':`model v${MODEL_VERSION}`;
  const loadingApi=window.__KERBSIDE_TRAIN_LOADING__,liveLoading=forecast&&forecast.liveLoading;
  const evidenceMeta=liveLoading?(forecast.evidenceLabel||'Live train-loading evidence'):`${forecast.confidence} confidence · ${modelLabel}`;
  const methodText=liveLoading?'Darwin operator-supplied estimated coach loading is available for this train, so it takes priority over Forecast v4 for the displayed crowding band. It is not a physical passenger count or ticket-sales figure.':'Kerbside does not use ticket sales, seat reservations or live carriage occupancy, so it deliberately avoids an exact percentage.';
  const feedbackButtons = Object.keys(FEEDBACK_LABEL).map(level=>
    `<button type="button" data-crowd-feedback="${esc(level)}" data-service-id="${esc(key)}"${recorded?' disabled':''}>${esc(FEEDBACK_LABEL[level])}</button>`
  ).join('');
  return `<div class="train-detail-grid">
      <div><span>From</span><b>${esc(originText(service))}</b></div>
      <div><span>Operator</span><b>${esc(service.operator || 'Unknown')}</b></div>
      <div><span>Platform</span><b>${esc(service.platform || 'TBC')}</b></div>
      <div><span>Formation</span><b>${length ? `${length} coaches` : 'Not reported'}</b></div>
    </div>
    <div class="train-crowding-explain crowd-${esc(forecast.level)}">
      <div><i></i><strong>${esc(forecast.label)}</strong><span>${esc(evidenceMeta)}</span></div>
      <p>Why: ${esc(forecast.reasons.join(', '))}. ${esc(methodText)}</p>
      <p>${esc(learningText)}</p>
    </div>
    ${liveLoading&&loadingApi&&typeof loadingApi.coachMarkup==='function'?loadingApi.coachMarkup(forecast):''}
    <div class="train-model-card">
      <span class="train-model-label">Record actual crowding</span>
      <strong>What was the train actually like?</strong>
      <p>If you are on this train, or have just used it, one tap saves a local observation for later accuracy checks. It does not change the Forecast v4 score and nothing is uploaded.</p>
      <div class="train-search-box train-feedback" style="flex-wrap:wrap;margin-top:8px">${feedbackButtons}</div>
      ${recorded ? `<div class="train-detail-note">Saved locally: ${esc(FEEDBACK_LABEL[recorded] || recorded)}.</div>` : ''}
      <div class="train-detail-note">${esc(accuracyText)} Nothing is uploaded.</div>
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
  const forecast = forecastFor(service,index);
  const cached = state.detailCache.get(key);
  if(cached){ target.innerHTML = renderServiceDetail(service,index,forecast,cached); return; }
  const serviceId = service.serviceIdUrlSafe || service.serviceIdGuid || service.serviceID;
  if(!serviceId){ target.innerHTML = renderServiceDetail(service,index,forecast,{}); return; }
  if(state.detailAbort) state.detailAbort.abort();
  const controller = new AbortController();
  state.detailAbort = controller;
  try{
    const response = await fetchWithTimeout(`${PROVIDER_BASE}/service/${encodeURIComponent(serviceId)}`, {signal:controller.signal});
    if(!response.ok) throw new Error(`Service detail returned ${response.status}`);
    const json = await response.json();
    if(controller.signal.aborted || state.selectedServiceId !== key) return;
    state.detailCache.set(key,json || {});
    target.innerHTML = renderServiceDetail(service,index,forecast,json || {});
  }catch(error){
    if(controller.signal.aborted) return;
    target.innerHTML = renderServiceDetail(service,index,forecast,{});
  }finally{
    if(state.detailAbort === controller) state.detailAbort = null;
  }
}


function liveBoardIdentity(service){
  if(!service)return'';
  const id=String(service.serviceIdGuid||service.serviceIdUrlSafe||service.serviceID||service.uid||service.serviceUid||'').trim();
  if(id)return id;
  const train=String(service.trainid||service.trainId||'').trim(),std=String(service.std||'').trim();
  return [train,std,operatorIdentity(service),destinationIdentity(service)].join('|');
}
function mergeLiveBoards(detailed,plain){
  if(!detailed)return plain||{};
  if(!plain)return detailed||{};
  const services=[],seen=new Set();
  for(const source of [detailed,plain])for(const service of (Array.isArray(source&&source.trainServices)?source.trainServices:[])){
    const key=liveBoardIdentity(service);if(key&&seen.has(key))continue;if(key)seen.add(key);services.push(service);
  }
  const messages=[];for(const source of [detailed,plain])for(const message of (Array.isArray(source&&source.nrccMessages)?source.nrccMessages:[])){
    const key=JSON.stringify(message);if(!messages.some(item=>JSON.stringify(item)===key))messages.push(message);
  }
  return {...plain,...detailed,trainServices:services,nrccMessages:messages};
}

async function loadBoard(station, {silent=false}={}){
  if(!station || !station.crs) return;
  if(state.boardAbort) state.boardAbort.abort();
  const controller = new AbortController();
  state.boardAbort = controller;
  const seq = ++state.boardSeq;
  setBoardLoading(silent);
  try{
    /* expand=true asks Huxley for GetDepBoardWithDetails rather than
       GetDepartureBoard, returning subsequentCallingPoints inline so the
       crowding model knows when a train reaches the user's destination.

       The catch: Darwin caps numRows at "between 0 and 10 exclusive" for
       every *WithDetails method, while the plain board allows up to 150.
       Asking for 20 rows with expand=true is rejected outright, which is
       what took the board down. Nine is the most the detailed call permits.

       A full board matters more than calling points, so if the detailed
       request fails for any reason - an older proxy, a provider that does
       not implement expand, a future parameter change - fall back to the
       plain 20-row board and carry on with the signals that do not need
       calling points. resilientRailFetch throws once every provider has
       failed, so the detailed attempt can fail by exception as well as by
       status; both paths land on the fallback. */
    const [detailedAttempt,plainAttempt]=await Promise.allSettled([
      fetchWithTimeout(`${PROVIDER_BASE}/departures/${encodeURIComponent(station.crs)}/9?expand=true`, {signal:controller.signal}),
      fetchWithTimeout(`${PROVIDER_BASE}/departures/${encodeURIComponent(station.crs)}/20`, {signal:controller.signal})
    ]);
    if(controller.signal.aborted)return;
    const detailedResponse=detailedAttempt.status==='fulfilled'&&detailedAttempt.value&&detailedAttempt.value.ok?detailedAttempt.value:null;
    const plainResponse=plainAttempt.status==='fulfilled'&&plainAttempt.value&&plainAttempt.value.ok?plainAttempt.value:null;
    if(!detailedResponse&&!plainResponse)throw new Error('Departure board returned no usable response');
    const [detailedJson,plainJson]=await Promise.all([
      detailedResponse?detailedResponse.json():Promise.resolve(null),
      plainResponse?plainResponse.json():Promise.resolve(null)
    ]);
    const json=mergeLiveBoards(detailedJson,plainJson);
    if(controller.signal.aborted || seq !== state.boardSeq) return;
    state.board = json || {};
    state.services = Array.isArray(json && json.trainServices) ? json.trainServices : [];
    if(json && json.locationName) state.station.name = json.locationName;
    recordBoardObservations();
    recordObservedAccuracy();
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

function handleFeedbackClick(button){
  if(!button || !button.dataset) return;
  const key = button.dataset.serviceId;
  const level = button.dataset.crowdFeedback;
  const index = state.services.findIndex((service,serviceIndex)=>serviceKey(service,serviceIndex) === key);
  if(index < 0) return;
  if(recordCrowdingFeedback(state.services[index],index,level)) renderBoard();
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
    const feedbackButton = event.target && event.target.closest ? event.target.closest('[data-crowd-feedback]') : null;
    if(feedbackButton){ handleFeedbackClick(feedbackButton); return; }
    const wrap = event.target && event.target.closest ? event.target.closest('.train-search-wrap') : null;
    if(!wrap) closeSuggestions();
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden && state.mode==='train' && state.station) loadBoard(state.station,{silent:true});
  });
}

function restorePrefs(){
  state.crowdingModel = safeReadCrowdingModel();
  state.forecastAccuracy = safeReadForecastAccuracy();
  pruneCrowdingModel(state.crowdingModel);
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
  modelVersion: MODEL_VERSION,
  crowdingForecast,
  /* Exported so kerbside-train-forecast-v3.js can pair a rendered
     .train-service row with its service by data-service-id rather than by
     array position. */
  serviceKey,
  recordCrowdingFeedback,
  recordForecastAccuracy,
  forecastAccuracySummary,
  forecastAccuracyForBucket,
  forecastAccuracyForSource,
  recordObservedAccuracy,
  liveLoadingEvidence,
  servicePatternProfile,
  delayMinutes,
  statusFor,
  destinationText,
  routeContext,
  state
};

})();
