#!/usr/bin/env python3
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text=read(path); count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:160]!r}')
    write(path,text.replace(old,new,1))


def replace_span(path,start,end,new):
    text=read(path); a=text.find(start)
    if a<0: raise SystemExit(f'{path}: missing start marker {start!r}')
    b=text.find(end,a)
    if b<0: raise SystemExit(f'{path}: missing end marker {end!r}')
    write(path,text[:a]+new+text[b:])


# ---------------------------------------------------------------------------
# Release version / browser cache wiring.
if read('VERSION').strip()!='0.8.2':
    raise SystemExit(f"Expected VERSION 0.8.2, found {read('VERSION').strip()!r}")
write('VERSION','0.8.3\n')
replace_once('kerbside-status.js',"const VERSION='0.8.2';","const VERSION='0.8.3';")
bus=read('bus.html')
if '?v=0.8.2' not in bus: raise SystemExit('bus.html: expected 0.8.2 cache busters')
write('bus.html',bus.replace('?v=0.8.2','?v=0.8.3'))


# ---------------------------------------------------------------------------
# Live overlay: expose the actual interchange departure-board rows to Forecast
# v3. The provider already fetched them in 0.8.2; this simply lets the model
# compare the selected onward train with its real neighbours (cancelled trains,
# formations, delays) rather than only with the two legs in the user's journey.
overlay='kerbside-train-live-overlay.js'
replace_once(
    overlay,
    '  return {byRid,byUid,byHead,byTime};',
    '  return {services:Array.isArray(services)?services.slice():[],byRid,byUid,byHead,byTime};'
)
replace_once(
    overlay,
    """function evidenceForOnward(row,fromCrs,toCrs){
  const key=`${upper(fromCrs)}|${upper(toCrs)}`,index=state.onwardIndexes.get(key);
  return evidenceFromMatch(matchEntryIn(row,index));
}
""",
    """function evidenceForOnward(row,fromCrs,toCrs){
  const key=`${upper(fromCrs)}|${upper(toCrs)}`,index=state.onwardIndexes.get(key);
  return evidenceFromMatch(matchEntryIn(row,index));
}
function onwardServices(fromCrs,toCrs){
  const key=`${upper(fromCrs)}|${upper(toCrs)}`,index=state.onwardIndexes.get(key);
  return index&&Array.isArray(index.services)?index.services:[];
}
"""
)
replace_once(
    overlay,
    '  state,refresh,clear,start,stop,evidenceFor,evidenceForOnward,extraServices,servesDestination,messages,\n  flattenCallingPoints,buildIndex,matchEntry,matchEntryIn,mergeBoards,isToday',
    '  state,refresh,clear,start,stop,evidenceFor,evidenceForOnward,onwardServices,extraServices,servesDestination,messages,\n  flattenCallingPoints,buildIndex,matchEntry,matchEntryIn,mergeBoards,isToday'
)


# ---------------------------------------------------------------------------
# Event context: load event data for interchange cities as well as the overall
# origin/final destination, and allow Forecast v3 to ask about one particular
# leg. This is what makes a Cheltenham event relevant to a CNM -> GLO leg even
# though the passenger's full journey began in Birmingham.
events='kerbside-train-events.js'
replace_once(
    events,
    """function currentJourney(){
  const trains=window.__KERBSIDE_TRAINS__;
  const route=window.__KERBSIDE_TRAIN_ROUTES__||window.__KERBSIDE_TRAIN_ROUTE__;
  return {
    origin:stationName(trains&&trains.state&&trains.state.station),
    destination:stationName(route&&route.state&&route.state.destination)
  };
}
""",
    """function timetableInterchanges(){
  const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__,services=timetable&&timetable.state&&Array.isArray(timetable.state.services)?timetable.state.services:[];
  return unique(services.filter(service=>service&&service.journeyType==='connection').map(service=>stationName(service.interchange)).filter(Boolean));
}
function currentJourney(){
  const trains=window.__KERBSIDE_TRAINS__;
  const route=window.__KERBSIDE_TRAIN_ROUTES__||window.__KERBSIDE_TRAIN_ROUTE__;
  return {
    origin:stationName(trains&&trains.state&&trains.state.station),
    destination:stationName(route&&route.state&&route.state.destination),
    interchanges:timetableInterchanges()
  };
}
"""
)
replace_once(
    events,
    'function sparqlForJourney({origin,destination,date}){\n  const cities=unique([locality(origin),locality(destination)])',
    'function sparqlForJourney({origin,destination,interchanges=[],date}){\n  const cities=unique([locality(origin),locality(destination),...(Array.isArray(interchanges)?interchanges.map(locality):[])])'
)
replace_once(
    events,
    "  const key=`wd|${journey.date}|${locality(journey.origin)}|${locality(journey.destination)}`.toLowerCase();",
    "  const places=[locality(journey.origin),locality(journey.destination),...(Array.isArray(journey.interchanges)?journey.interchanges.map(locality):[])].filter(Boolean).sort().join('|');\n  const key=`wd|${journey.date}|${places}`.toLowerCase();"
)
replace_once(
    events,
    """function pressureForJourney(service){
  const journey=currentJourney();
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  journey.destinationCrs=route&&route.state&&route.state.destination?route.state.destination.crs:'';
""",
    """function pressureForJourney(service,journeyOverride={}){
  const journey={...currentJourney(),...(journeyOverride||{})};
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  if(!journey.destinationCrs)journey.destinationCrs=route&&route.state&&route.state.destination?route.state.destination.crs:'';
"""
)
replace_once(
    events,
    "document.addEventListener('kerbside:train-date-change',refresh);",
    "document.addEventListener('kerbside:train-date-change',refresh);\ndocument.addEventListener('kerbside:timetable-services-ready',refresh);"
)
replace_once(
    events,
    '  currentJourney,journeyDate,serviceArrival,signedGap,seasonsFor',
    '  currentJourney,timetableInterchanges,journeyDate,serviceArrival,signedGap,seasonsFor'
)


# ---------------------------------------------------------------------------
# Forecast v3: event pressure can now carry a per-leg journey context. The
# score remains the same algorithm; only the geographic context becomes exact
# for connecting trains.
forecast='kerbside-train-forecast-v3.js'
replace_once(
    forecast,
    """function eventSignal(service,date){const provider=window.__KERBSIDE_EVENTS__;
if(provider&&provider.state&&provider.state.date&&provider.state.date!==stamp(date))return {amount:0,reasons:[]};if(!provider||typeof provider.pressureForJourney!=='function')return {amount:0,reasons:[]};try{const result=provider.pressureForJourney(service)||{};const amount=clamp(Number(result.amount)||0,0,MAX_EVENT_PRESSURE);return {amount,reasons:amount>=.16?unique(result.reasons||[]):[]};}catch(error){return {amount:0,reasons:[]};}}
""",
    """function eventSignal(service,date,context={}){const provider=window.__KERBSIDE_EVENTS__;
if(provider&&provider.state&&provider.state.date&&provider.state.date!==stamp(date))return {amount:0,reasons:[]};if(!provider||typeof provider.pressureForJourney!=='function')return {amount:0,reasons:[]};try{const result=provider.pressureForJourney(service,context&&context.eventJourney||undefined)||{};const amount=clamp(Number(result.amount)||0,0,MAX_EVENT_PRESSURE);return {amount,reasons:amount>=.16?unique(result.reasons||[]):[]};}catch(error){return {amount:0,reasons:[]};}}
"""
)
replace_once(forecast,'  const events=eventSignal(service,date);','  const events=eventSignal(service,date,context);')


# ---------------------------------------------------------------------------
# Timetable forecast wrapper: feed Forecast v3 the real live board surrounding
# each connection leg. That activates cancellation knock-on, delay and
# formation comparisons for the onward train. Recovery trains are forecast
# using the same board and shown with a crowding estimate in the recovery card.
tt='kerbside-train-timetable.js'
old_forecast="""function forecastOne(service,index,services,station=route().from,messages=liveMessages()){const v3=window.__KERBSIDE_FORECAST_V3__,api=window.__KERBSIDE_TRAINS__,date=new Date(`${route().date}T12:00:00`);if(v3&&typeof v3.forecast==='function')return v3.forecast(service,index,services,{station,referenceDate:date,messages});if(api&&typeof api.crowdingForecast==='function')return api.crowdingForecast(service,index,services,{station,referenceDate:date,messages});return {label:'Moderate',level:'moderate',confidence:'Low',reasons:['service time and route demand baseline']};}
function confidenceFloor(results){const rank={Low:0,Medium:1,'Medium-high':2,High:3};let best=3;for(const result of results){const value=rank[result&&result.confidence];if(Number.isFinite(value))best=Math.min(best,value);}return Object.keys(rank).find(key=>rank[key]===best)||'Low';}
function forecastConnection(service){
  const legs=Array.isArray(service&&service.legs)?service.legs:[];if(!legs.length)return forecastOne(service,0,[service]);
  const results=legs.map((leg,index)=>forecastOne(leg,index,legs,leg.from||route().from,index===0?liveMessages():[]));
  if(results[0]&&results[0].cancelled)return {...results[0],reasons:['the first train in this connection is cancelled'],journeyLegResults:results,peakLeg:0};
  let peakLeg=0,peakScore=-Infinity;results.forEach((result,index)=>{const score=Number(result&&result.score);if(Number.isFinite(score)&&score>peakScore){peakScore=score;peakLeg=index;}});
  const peak=results[peakLeg]||results[0],leg=legs[peakLeg]||{},from=displayName(leg.from,'first leg'),to=displayName(leg.to,'interchange');
  return {...peak,confidence:confidenceFloor(results),reasons:[`Peak crowding is forecast on ${from} → ${to}`,...(peak.reasons||[])].slice(0,6),journeyLegResults:results,peakLeg};
}
function forecast(service,index,services){return service&&service.journeyType==='connection'?forecastConnection(service):forecastOne(service,index,services);}
"""
new_forecast="""function forecastOne(service,index,services,station=route().from,messages=liveMessages(),extraContext={}){const v3=window.__KERBSIDE_FORECAST_V3__,api=window.__KERBSIDE_TRAINS__,date=new Date(`${route().date}T12:00:00`),context={station,referenceDate:date,messages,...(extraContext||{})};if(v3&&typeof v3.forecast==='function')return v3.forecast(service,index,services,context);if(api&&typeof api.crowdingForecast==='function')return api.crowdingForecast(service,index,services,context);return {label:'Moderate',level:'moderate',confidence:'Low',reasons:['service time and route demand baseline']};}
function confidenceFloor(results){const rank={Low:0,Medium:1,'Medium-high':2,High:3};let best=3;for(const result of results){const value=rank[result&&result.confidence];if(Number.isFinite(value))best=Math.min(best,value);}return Object.keys(rank).find(key=>rank[key]===best)||'Low';}
function forecastIdentity(service){return String(service&&(service.serviceID||service.serviceIdGuid||service.serviceIdGuId||service.rid||service.uid||((service.trainId||service.trainid)&&service.std?`${service.trainId||service.trainid}|${service.std}`:''))||'').toUpperCase();}
function forecastBoardContext(service,board,fallback=[]){
  const rows=(Array.isArray(board)&&board.length?board:fallback).filter(Boolean).slice(),wanted=forecastIdentity(service);let index=wanted?rows.findIndex(item=>forecastIdentity(item)===wanted):-1;
  if(index>=0)rows[index]=service;else{rows.push(service);rows.sort((a,b)=>(parseMinutes(a&&a.std)??9999)-(parseMinutes(b&&b.std)??9999));index=rows.indexOf(service);}
  return {services:rows,index:Math.max(0,index)};
}
function legEventJourney(leg){return {origin:displayName(leg&&leg.from,'Departure'),destination:displayName(leg&&leg.to,'Destination'),destinationCrs:leg&&leg.to&&leg.to.crs||''};}
function connectionLegForecast(connection,leg,legIndex){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,r=route(),change=connection&&connection.interchange&&connection.interchange.crs||'',to=r.to&&r.to.crs||'';
  const board=legIndex===0?(overlay&&overlay.state&&overlay.state.services||[]):(overlay&&typeof overlay.onwardServices==='function'?overlay.onwardServices(change,to):[]),context=forecastBoardContext(leg,board,connection&&connection.legs||[leg]);
  return forecastOne(leg,context.index,context.services,leg&&leg.from||r.from,legIndex===0?liveMessages():[],{eventJourney:legEventJourney(leg),connectionRole:legIndex===0?'first-leg':'onward-leg'});
}
function forecastConnection(service){
  const legs=Array.isArray(service&&service.legs)?service.legs:[];if(!legs.length)return forecastOne(service,0,[service]);
  const results=legs.map((leg,index)=>connectionLegForecast(service,leg,index));
  if(results[0]&&results[0].cancelled)return {...results[0],reasons:['the first train in this connection is cancelled'],journeyLegResults:results,peakLeg:0};
  let peakLeg=0,peakScore=-Infinity;results.forEach((result,index)=>{const score=Number(result&&result.score);if(Number.isFinite(score)&&score>peakScore){peakScore=score;peakLeg=index;}});
  const peak=results[peakLeg]||results[0],leg=legs[peakLeg]||{},from=displayName(leg.from,'first leg'),to=displayName(leg.to,'interchange');
  return {...peak,confidence:confidenceFloor(results),reasons:[`Peak crowding is forecast on ${from} → ${to}`,...(peak.reasons||[])].slice(0,6),journeyLegResults:results,peakLeg};
}
function forecastRecovery(service){
  if(!service||service.journeyType!=='connection'||!service.recoveryChoice)return null;
  const option=(service.recoveryOptions||[]).find(item=>String(item&&item.serviceID||'')===String(service.recoveryChoice.serviceID||''));
  return option?connectionLegForecast(service,option,1):null;
}
function forecast(service,index,services){return service&&service.journeyType==='connection'?forecastConnection(service):forecastOne(service,index,services);}
"""
replace_once(tt,old_forecast,new_forecast)

# Recovery card now tells the traveller how busy the fallback itself is likely
# to be, not just when it departs.
replace_once(
    tt,
    """function recoveryMarkup(service){
  if(!service||service.journeyType!=='connection'||!['at-risk','onward-cancelled'].includes(service.connectionRisk))return'';
  const choice=service.recoveryChoice;
  if(!choice)return `<div class=\"train-recovery-card train-recovery-none\"><span>Recovery</span><strong>No later workable onward train found</strong><small>Kerbside checked the loaded timetable recovery window. Refresh as live information changes.</small></div>`;
  const platform=choice.platform?` · Plat ${choice.platform}`:'',live=choice.live?'Live Darwin evidence':'Scheduled timetable';
  return `<div class=\"train-recovery-card\"><span>Backup if missed</span><strong>${esc(`${choice.departure||choice.std||'—'} → ${choice.arrival||'—'}`)}</strong><small>${esc(`${choice.operator||'Onward service'}${platform} · ${live}`)}</small></div>`;
}
""",
    """function recoveryMarkup(service){
  if(!service||service.journeyType!=='connection'||!['at-risk','onward-cancelled'].includes(service.connectionRisk))return'';
  const choice=service.recoveryChoice;
  if(!choice)return `<div class=\"train-recovery-card train-recovery-none\"><span>Recovery</span><strong>No later workable onward train found</strong><small>Kerbside checked the loaded timetable recovery window. Refresh as live information changes.</small></div>`;
  const platform=choice.platform?` · Plat ${choice.platform}`:'',live=choice.live?'Live Darwin evidence':'Scheduled timetable',prediction=forecastRecovery(service),reason=prediction&&prediction.reasons&&prediction.reasons[0]||'';
  const forecastMarkup=prediction?`<div class=\"train-recovery-forecast crowd-${esc(prediction.level||'unknown')}\" title=\"${esc((prediction.reasons||[]).join(', '))}\"><i></i><b>${esc(prediction.label||'Forecast pending')}</b><small>${esc(`${prediction.confidence||'Low'} confidence${reason?` · ${reason}`:''}`)}</small></div>`:'';
  return `<div class=\"train-recovery-card\"><span>Backup if missed</span><strong>${esc(`${choice.departure||choice.std||'—'} → ${choice.arrival||'—'}`)}</strong><small>${esc(`${choice.operator||'Onward service'}${platform} · ${live}`)}</small>${forecastMarkup}</div>`;
}
"""
)

# Give each leg's crowding badge its own evidence tooltip, useful on desktop
# and testable without changing the compact mobile layout.
replace_once(
    tt,
    'return `<div class="train-connection-leg"><span class="train-connection-time"><b>${esc(depart||\'—\')}</b><small>${esc(arrive||\'—\')}${live?\' · live\':\'\'}</small></span><span class="train-connection-route"><b>${esc(`${from} → ${to}`)}</b><small>${esc(`${leg.operator||\'Scheduled service\'}${train} · ${platform} · ${live?\'live\':\'scheduled\'}`)}</small></span><span class="train-connection-crowd crowd-${esc(crowd.level||\'unknown\')}"><i></i><b>${esc(crowd.label||\'Forecast pending\')}</b><small>${esc(`${crowd.confidence||\'Low\'} confidence`)}</small></span></div>`;',
    'return `<div class="train-connection-leg"><span class="train-connection-time"><b>${esc(depart||\'—\')}</b><small>${esc(arrive||\'—\')}${live?\' · live\':\'\'}</small></span><span class="train-connection-route"><b>${esc(`${from} → ${to}`)}</b><small>${esc(`${leg.operator||\'Scheduled service\'}${train} · ${platform} · ${live?\'live\':\'scheduled\'}`)}</small></span><span class="train-connection-crowd crowd-${esc(crowd.level||\'unknown\')}" title="${esc((crowd.reasons||[]).join(\', \'))}"><i></i><b>${esc(crowd.label||\'Forecast pending\')}</b><small>${esc(`${crowd.confidence||\'Low\'} confidence`)}</small></span></div>`;'
)

# Once provider rows exist, let the event module refresh its Wikidata query
# with the actual interchange cities. This fires only for a provider load, not
# each minute's live overlay repaint.
replace_once(
    tt,
    """  const resolved=displayName(origin,'');
  if(r.from&&resolved&&resolved!==r.from.crs)r.from.name=resolved;
  return renderRows(raw.map(normalise),{mode,manifest});
}
""",
    """  const resolved=displayName(origin,'');
  if(r.from&&resolved&&resolved!==r.from.crs)r.from.name=resolved;
  const rendered=renderRows(raw.map(normalise),{mode,manifest});
  if(typeof document.dispatchEvent==='function'&&typeof CustomEvent==='function')setTimeout(()=>document.dispatchEvent(new CustomEvent('kerbside:timetable-services-ready',{detail:{date:r.date,connections:state.services.filter(service=>service&&service.journeyType==='connection').length}})),0);
  return rendered;
}
"""
)

# Refresh per-leg evidence tooltips and the recovery crowding estimate when
# events/calendar/live evidence change after the card is already open.
replace_once(
    tt,
    """        if(b&&b.textContent!==legResult.label){b.textContent=legResult.label;changed=true;}
        const note=`${legResult.confidence||'Low'} confidence`;if(small&&small.textContent!==note){small.textContent=note;changed=true;}
      });
    }
    const explain=article.querySelector('.train-crowding-explain');
""",
    """        if(b&&b.textContent!==legResult.label){b.textContent=legResult.label;changed=true;}
        const note=`${legResult.confidence||'Low'} confidence`;if(small&&small.textContent!==note){small.textContent=note;changed=true;}
        const legTitle=(legResult.reasons||[]).join(', ');if(legEl.title!==legTitle){legEl.title=legTitle;changed=true;}
      });
      const recoveryEl=article.querySelector('.train-recovery-forecast'),recoveryResult=forecastRecovery(service);
      if(recoveryEl&&recoveryResult){
        const cls=`train-recovery-forecast crowd-${recoveryResult.level||'unknown'}`,b=recoveryEl.querySelector('b'),small=recoveryEl.querySelector('small'),reason=recoveryResult.reasons&&recoveryResult.reasons[0]||'',note=`${recoveryResult.confidence||'Low'} confidence${reason?` · ${reason}`:''}`,title=(recoveryResult.reasons||[]).join(', ');
        if(recoveryEl.className!==cls){recoveryEl.className=cls;changed=true;}if(b&&b.textContent!==recoveryResult.label){b.textContent=recoveryResult.label;changed=true;}if(small&&small.textContent!==note){small.textContent=note;changed=true;}if(recoveryEl.title!==title){recoveryEl.title=title;changed=true;}
      }
    }
    const explain=article.querySelector('.train-crowding-explain');
"""
)
replace_once(
    tt,
    'window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,recoverySummary,provider:timetableProvider};',
    'window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,recoverySummary,forecastConnection,forecastRecovery,provider:timetableProvider};'
)


# ---------------------------------------------------------------------------
# Styles for the backup-train crowding estimate.
css='kerbside-trains.css'
replace_once(
    css,
    '.train-recovery-card.train-recovery-none>span{color:var(--text-mute)}',
    """.train-recovery-card.train-recovery-none>span{color:var(--text-mute)}
.train-recovery-forecast{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:1px 6px;align-items:center;margin-top:5px;padding-left:13px;min-width:0}
.train-recovery-forecast>i{position:absolute;left:0;top:5px;width:7px;height:7px;border-radius:50%}
.train-recovery-forecast>b{font-size:10.5px;color:var(--text)}
.train-recovery-forecast>small{grid-column:2;font-size:9px;line-height:1.35;color:var(--text-dim);overflow-wrap:anywhere}"""
)


# ---------------------------------------------------------------------------
# Deterministic Forecast/event regressions.
forecast_test='kerbside-backend/tests/train-forecast-v3-dual-timetable.mjs'
append=r'''

test('event engine can score an interchange-specific connection leg',()=>{
  const events=loadEvents();
  events.setEvents([{title:'Cheltenham festival',place:'Cheltenham',startTime:'18:00',endTime:'20:00',attendance:30000,confidence:.9}],{date:'2026-08-12',sources:['test']});
  const row={std:'20:20',arrival:'20:50'};
  const result=events.pressureForJourney(row,{origin:'Cheltenham Spa',destination:'Gloucester',destinationCrs:'GLO'});
  assert.ok(result.amount>0,result);
  assert.match(result.reasons[0],/Cheltenham festival/);
});

test('Wikidata event query includes connection interchange cities',()=>{
  const events=loadEvents();
  const query=events.sparqlForJourney({origin:'Birmingham New Street',destination:'Gloucester',interchanges:['Cheltenham Spa'],date:'2026-08-12'}).toLowerCase();
  assert.match(query,/birmingham/);assert.match(query,/gloucester/);assert.match(query,/cheltenham/);
});

test('Forecast v3 forwards the exact leg geography to event pressure',()=>{
  const station={name:'Cheltenham Spa',crs:'CNM'},loaded=loadPrediction({station});let seen=null;
  loaded.context.window.__KERBSIDE_EVENTS__={state:{date:'2026-08-12'},pressureForJourney(row,journey){seen=journey;return {amount:.5,reasons:['interchange event pressure']};}};
  const row=service({std:'11:00',arrival:'11:32',origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}]});
  const result=loaded.v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z'),eventJourney:{origin:'Cheltenham Spa',destination:'Gloucester',destinationCrs:'GLO'}});
  assert.deepEqual({...seen},{origin:'Cheltenham Spa',destination:'Gloucester',destinationCrs:'GLO'});
  assert.equal(result.eventPressure,.5);assert.ok(result.reasons.some(reason=>/interchange event pressure/i.test(reason)));
});
'''
text=read(forecast_test)
if "event engine can score an interchange-specific connection leg" in text: raise SystemExit('Forecast connection tests already present')
write(forecast_test,text+append)


# ---------------------------------------------------------------------------
# Browser integration: put a cancelled Gloucester train immediately before the
# planned onward leg. The second-leg forecast must see that cancellation via
# the real CNM -> GLO board and expose the knock-on evidence; the recovery card
# must also contain its own crowding forecast.
browser='kerbside-backend/tests/train-browser-core-regression.mjs'
replace_once(
    browser,
    """  if(kind==='onward')return {
    origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}],
    serviceIdGuid:`rid-change-b-${TODAY}`,uid:`uid-change-b-${TODAY}`,trainid:'1G02',serviceIdUrlSafe:'live-change-b',
    std:'11:00',etd:'On time',platform:'4',operator:'Great Western Railway',operatorCode:'GW',length:3,isCancelled:false,
    subsequentCallingPoints:[{callingPoint:[{locationName:'Gloucester',crs:'GLO',st:'11:32',et:'11:32',isCancelled:false}]}]
  };
""",
    """  if(kind==='onward-previous-cancelled')return {
    origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}],
    serviceIdGuid:`live-cancelled-${TODAY}`,uid:`live-cancelled-${TODAY}`,trainid:'1G00',serviceIdUrlSafe:'live-cancelled',
    std:'10:45',etd:'Cancelled',platform:'3',operator:'Great Western Railway',operatorCode:'GW',length:3,isCancelled:true,cancelReason:'Operational incident',
    subsequentCallingPoints:[{callingPoint:[{locationName:'Gloucester',crs:'GLO',st:'11:15',isCancelled:true}]}]
  };
  if(kind==='onward')return {
    origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}],
    serviceIdGuid:`rid-change-b-${TODAY}`,uid:`uid-change-b-${TODAY}`,trainid:'1G02',serviceIdUrlSafe:'live-change-b',
    std:'11:00',etd:'On time',platform:'4',operator:'Great Western Railway',operatorCode:'GW',length:3,isCancelled:false,
    subsequentCallingPoints:[{callingPoint:[{locationName:'Gloucester',crs:'GLO',st:'11:32',et:'11:32',isCancelled:false}]}]
  };
"""
)
replace_once(
    browser,
    "trainServices:crs==='BRI'?[liveService('reverse')]:crs==='CNM'&&filter==='GLO'?[liveService('onward'),liveService('recovery')]:filter==='BRI'?[liveService('direct')]:filter==='CNM'?[liveService('connection')]:filter==='GLO'?[]:[liveService('connection'),liveService('direct')]",
    "trainServices:crs==='BRI'?[liveService('reverse')]:crs==='CNM'&&filter==='GLO'?[liveService('onward-previous-cancelled'),liveService('onward'),liveService('recovery')]:filter==='BRI'?[liveService('direct')]:filter==='CNM'?[liveService('connection')]:filter==='GLO'?[]:[liveService('connection'),liveService('direct')]"
)
replace_once(
    browser,
    "  assert.match(await connectionDetail.textContent(),/11:20 → 11:52/);",
    "  assert.match(await connectionDetail.textContent(),/11:20 → 11:52/);\n  const legCrowds=connectionDetail.locator('.train-connection-crowd');\n  assert.match(await legCrowds.nth(1).getAttribute('title'),/previous service was cancelled|cancelled, concentrating/i);\n  const recoveryForecast=connectionDetail.locator('.train-recovery-forecast');\n  await recoveryForecast.waitFor({state:'visible'});\n  assert.match(await recoveryForecast.textContent(),/(Quiet|Moderate|Busy|Very busy)/);"
)

print('Applied Kerbside 0.8.3 connection-aware crowding intelligence.')
