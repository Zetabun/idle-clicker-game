(function(){
'use strict';
const MAX_EVENT_PRESSURE=0.8;
const state={events:[],updatedAt:0,status:'idle'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mins=t=>{const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);return m?+m[1]*60 + +m[2]:null};
const unique=a=>[...new Set(a.filter(Boolean))];
function stationName(v){return String(v&&((v.locationName||v.name)||v.crs)||'').trim()}
function currentJourney(){const trains=window.__KERBSIDE_TRAINS__;const route=window.__KERBSIDE_TRAIN_ROUTE__;return {origin:stationName(trains&&trains.state&&trains.state.station),destination:stationName(route&&route.state&&route.state.destination)}}
function normalise(raw){if(!raw)return null;const title=String(raw.title||raw.name||'').trim();const place=String(raw.place||raw.location||raw.venue||'').trim();const start=mins(raw.startTime||raw.start||raw.time);const end=mins(raw.endTime||raw.end)|| (start==null?null:start+150);const attendance=Number(raw.attendance||raw.capacity||0);const confidence=clamp(Number(raw.confidence)||0.65,0,1);if(!title||start==null)return null;return {title,place,start,end,attendance,confidence,type:String(raw.type||'event')};}
function relevance(event,service){const journey=currentJourney();const dep=mins(service&&service.std);if(dep==null)return null;const place=event.place.toLowerCase();const origin=journey.origin.toLowerCase(),dest=journey.destination.toLowerCase();const nearOrigin=origin&&place&&(place.includes(origin)||origin.includes(place));const nearDest=dest&&place&&(place.includes(dest)||dest.includes(place));if(!nearOrigin&&!nearDest)return null;let delta,phase;if(nearOrigin){delta=event.start-dep;phase='before';}else{delta=dep-event.end;phase='after';}if(delta<-180||delta>240)return null;const timing=delta>=0?clamp(1-Math.abs(delta-75)/180,.15,1):clamp(1-Math.abs(delta)/180,.15,.8);const size=event.attendance>=50000?1:event.attendance>=20000?.8:event.attendance>=8000?.6:event.attendance>=2500?.4:.25;const amount=clamp(size*timing*event.confidence,0,MAX_EVENT_PRESSURE);if(amount<.16)return null;return {amount,event,phase,nearOrigin,nearDest};}
function pressureForJourney(service){const matches=state.events.map(e=>relevance(e,service)).filter(Boolean).sort((a,b)=>b.amount-a.amount);if(!matches.length)return {amount:0,reasons:[]};const best=matches[0];return {amount:Math.min(MAX_EVENT_PRESSURE,best.amount),reasons:[`${best.event.title} may increase ${best.phase==='before'?'pre-event':'post-event'} demand`],events:matches.slice(0,3)};}
function setEvents(events){state.events=(events||[]).map(normalise).filter(Boolean);state.updatedAt=Date.now();state.status='ready';window.__KERBSIDE_FORECAST_V3__?.apply?.();}
async function refresh(){const provider=window.__KERBSIDE_EVENT_SOURCE__;if(!provider||typeof provider.eventsForJourney!=='function'){state.status='unavailable';return;}state.status='loading';try{const journey=currentJourney();const rows=await provider.eventsForJourney({...journey,date:new Date()});setEvents(rows);}catch(e){state.status='error';}}
window.addEventListener('kerbside:journey-planner-change',refresh);
document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,0),{once:true});
window.__KERBSIDE_EVENTS__={state,setEvents,refresh,pressureForJourney,MAX_EVENT_PRESSURE};
})();