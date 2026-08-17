/* Kerbside rail demand events.
 *
 * Every source here is free to use AND licensed for commercial redistribution,
 * because this app may ship on the App Store:
 *
 *   Wikidata SPARQL      CC0 1.0 (public domain dedication). No key, no quota
 *                        published, but be polite: results are cached hard.
 *   openfootball         Public domain. Served as static JSON from GitHub raw,
 *                        so no key and no rate limit worth worrying about.
 *                        Football fixtures are the single biggest predictable
 *                        spike in GB rail demand.
 *
 * Deliberately NOT used: Ticketmaster/Eventbrite (commercial restrictions on
 * free tiers), football-data.org and API-Football (free tiers are prototype
 * only), Open-Meteo's free endpoint (data is CC-BY but the free *service* is
 * non-commercial; a paid plan or self-host is required to ship commercially).
 *
 * Club locations and stadium capacities below are plain factual data.
 */
(function(){
'use strict';

const MAX_EVENT_PRESSURE=0.8;
const WIKIDATA_ENDPOINT='https://query.wikidata.org/sparql';
const FOOTBALL_TEXT_BASES=[
  'https://raw.githubusercontent.com/openfootball/england/master',
  'https://cdn.jsdelivr.net/gh/openfootball/england@master'
];
const FOOTBALL_LEAGUES=[
  {json:'en.1',text:'1-premierleague.txt'},
  {json:'en.2',text:'2-championship.txt'}
];
const FETCH_TIMEOUT_MS=7000;
const WIKIDATA_TIMEOUT_MS=15000;
const MEMORY_CACHE_MS=30*60*1000;
const WIKIDATA_CACHE_MS=6*60*60*1000;
const WIKIDATA_STALE_MS=72*60*60*1000;
const WIKIDATA_STORE='kerbside.rail.wikidata.v1';
const WIKIDATA_MAX_ENTRIES=32;
const FIXTURE_CACHE_MS=24*60*60*1000;
/* v3 is season-aware. v2 could keep an empty/new-season miss for a week, so
   a fixture published after that first lookup never reached Forecast v4. */
const FIXTURE_STORE='kerbside.rail.fixtures.v4';

const state={events:[],updatedAt:0,status:'idle',date:'',sources:[],sourceStatus:{football:{status:'idle',updatedAt:0},wikidata:{status:'idle',updatedAt:0}}};
const cache=new Map();
let fixtureIndex=null;
let fixtureSeasonKey='';
let fixturePromise=null;
let fixturePromiseSeason='';
const fixtureMissChecked=new Set();
function markSource(name,status,detail={}){state.sourceStatus[name]={status,updatedAt:Date.now(),...detail};return state.sourceStatus[name];}
function readWikidataStore(){try{const raw=JSON.parse(localStorage.getItem(WIKIDATA_STORE)||'null');return raw&&raw.entries&&typeof raw.entries==='object'?raw:{entries:{}};}catch(error){return {entries:{}};}}
function writeWikidataStore(store){try{const entries=Object.entries(store&&store.entries||{}).sort((a,b)=>Number(b[1]&&b[1].ts||0)-Number(a[1]&&a[1].ts||0)).slice(0,WIKIDATA_MAX_ENTRIES);localStorage.setItem(WIKIDATA_STORE,JSON.stringify({entries:Object.fromEntries(entries)}));}catch(error){}}
function wikidataStoredEntry(key){const store=readWikidataStore(),entry=store.entries[key];return entry&&Array.isArray(entry.rows)&&Number(entry.ts)?{store,entry}:null;}
function saveWikidataEntry(key,rows){const store=readWikidataStore();store.entries[key]={ts:Date.now(),rows:Array.isArray(rows)?rows:[]};writeWikidataStore(store);}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const unique=a=>[...new Set(a.filter(Boolean))];
const mins=t=>{const m=String(t||'').match(/^(\d{1,2}):(\d{2})/);return m?+m[1]*60 + +m[2]:null;};

/* ---------------------------------------------------------------
   Clubs. Matching a fixture to a station needs a place, and the
   openfootball feed only gives club names. Capacity stands in for
   crowd size; the home city is what we match against station names.
--------------------------------------------------------------- */
const CLUBS={
  'arsenal':{city:'London',capacity:60704},
  'aston villa':{city:'Birmingham',capacity:42657},
  'bournemouth':{city:'Bournemouth',capacity:11307},
  'brentford':{city:'London',capacity:17250},
  'brighton':{city:'Brighton',capacity:31800},
  'burnley':{city:'Burnley',capacity:21944},
  'chelsea':{city:'London',capacity:40343},
  'crystal palace':{city:'London',capacity:25486},
  'everton':{city:'Liverpool',capacity:52888},
  'fulham':{city:'London',capacity:24500},
  'liverpool':{city:'Liverpool',capacity:61276},
  'manchester city':{city:'Manchester',capacity:52900},
  'manchester united':{city:'Manchester',capacity:74310},
  'newcastle':{city:'Newcastle',capacity:52305},
  'nottingham forest':{city:'Nottingham',capacity:30404},
  'tottenham':{city:'London',capacity:62850},
  'west ham':{city:'London',capacity:62500},
  'wolverhampton':{city:'Wolverhampton',capacity:31750},
  'leeds':{city:'Leeds',capacity:37645},
  'sunderland':{city:'Sunderland',capacity:49000},
  'birmingham':{city:'Birmingham',capacity:29409},
  'blackburn':{city:'Blackburn',capacity:31367},
  'bristol city':{city:'Bristol',capacity:27000},
  'cardiff':{city:'Cardiff',capacity:33280},
  'charlton':{city:'London',capacity:27111},
  'coventry':{city:'Coventry',capacity:32609},
  'derby':{city:'Derby',capacity:33597},
  'hull':{city:'Hull',capacity:25586},
  'ipswich':{city:'Ipswich',capacity:30311},
  'leicester':{city:'Leicester',capacity:32262},
  'middlesbrough':{city:'Middlesbrough',capacity:34742},
  'millwall':{city:'London',capacity:20146},
  'norwich':{city:'Norwich',capacity:27359},
  'oxford':{city:'Oxford',capacity:12500},
  'portsmouth':{city:'Portsmouth',capacity:21100},
  'preston':{city:'Preston',capacity:23404},
  'queens park rangers':{city:'London',capacity:18439},
  'sheffield united':{city:'Sheffield',capacity:32050},
  'sheffield wednesday':{city:'Sheffield',capacity:39732},
  'southampton':{city:'Southampton',capacity:32384},
  'stoke':{city:'Stoke',capacity:30089},
  'swansea':{city:'Swansea',capacity:21088},
  'watford':{city:'Watford',capacity:22200},
  'west bromwich':{city:'Birmingham',capacity:26688},
  'wrexham':{city:'Wrexham',capacity:13000}
};
function clubFor(name){
  const n=String(name||'').toLowerCase().replace(/\b(fc|afc|city|united|town|rovers|wanderers|albion|county|hotspur)\b/g,' ').replace(/\s+/g,' ').trim();
  const raw=String(name||'').toLowerCase();
  for(const key of Object.keys(CLUBS)){
    if(raw.includes(key)||n.includes(key))return {name:String(name||'').trim(),...CLUBS[key]};
  }
  return null;
}

/* --------------------------------------------------------------- */
function londonDate(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function stationName(v){return String(v&&((v.locationName||v.name)||v.crs)||'').trim();}
function locality(value){
  /* Station names lead with the place: "Bristol Temple Meads" -> "Bristol".
     Two words are kept for the compound ones ("Milton Keynes Central"), and
     anything shorter than three letters is dropped so "St Albans" does not
     become the useless token "st". */
  const words=String(value||'').trim().split(/\s+/).filter(Boolean);
  if(!words.length)return '';
  const first=words[0];
  if(first.length<3&&words[1])return `${first} ${words[1]}`;
  return first;
}
function timetableInterchanges(){
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
/* The travel date the user actually picked, not today. This is what makes
   days-in-advance forecasting possible at all: the old build hardcoded
   new Date() here, so an advance journey was scored against today's events. */
function journeyDate(){
  const api=window.__KERBSIDE_TRAIN_DATE__;
  const value=api&&api.state&&api.state.date;
  if(value&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  return londonDate();
}
function placeMatches(place,station){
  const p=String(place||'').toLowerCase();
  const name=String(station||'').toLowerCase();
  const city=locality(station).toLowerCase();
  return !!(p&&name&&(p.includes(name)||name.includes(p)||(city.length>=3&&p.includes(city))));
}
function signedGap(later,earlier){
  if(later==null||earlier==null)return null;
  let delta=later-earlier;
  while(delta<-720)delta+=1440;
  while(delta>720)delta-=1440;
  return delta;
}

/* Arrival time at the journey destination.
 *
 * The old build looked for service.sta / service.eta, which a departure board
 * never carries, so this always returned null and destination-side event
 * pressure could never fire. With ?expand=true the board now returns
 * subsequentCallingPoints inline, so the arrival is right there in the same
 * response at no extra request cost.
 */
function serviceArrival(service,destinationCrs){
  const groups=Array.isArray(service&&service.subsequentCallingPoints)?service.subsequentCallingPoints:[];
  const wanted=String(destinationCrs||'').toUpperCase();
  let last=null;
  for(const group of groups){
    const points=Array.isArray(group&&group.callingPoint)?group.callingPoint
      :Array.isArray(group&&group.callingPoints)?group.callingPoints
      :Array.isArray(group)?group:[];
    for(const point of points){
      if(!point)continue;
      const expected=mins(point.et),scheduled=mins(point.st);
      const at=expected!=null?expected:scheduled;
      if(at==null)continue;
      last=at;
      if(wanted&&String(point.crs||'').toUpperCase()===wanted)return at;
    }
  }
  /* The scheduled timetable provider already supplies arrival at the user's
     selected destination. Use it whenever live calling points have not yet
     arrived, which keeps destination-side events active for future and
     same-day timetable-only journeys. */
  const direct=mins(service&&(service.destinationArrival||service.arrival||service.sta||service.eta));
  if(direct!=null)return direct;
  return wanted?null:last;
}

function normalise(raw){
  if(!raw)return null;
  const title=String(raw.title||raw.name||'').trim();
  const place=String(raw.place||raw.location||raw.venue||'').trim();
  const start=mins(raw.startTime||raw.start||raw.time);
  const end=mins(raw.endTime||raw.end)||(start==null?null:start+150);
  const attendance=Number(raw.attendance||raw.capacity||0);
  const confidence=clamp(Number(raw.confidence)||0.65,0,1);
  if(!title||start==null)return null;
  return {title,place,start,end,attendance,confidence,type:String(raw.type||'event'),source:String(raw.source||'Wikidata')};
}

/* --------------------------------------------------------------- */
function seasonsFor(dateStamp){
  /* GB football seasons run Aug-May and are published as "2025-26". Try the
     season this date falls in, then the one before, because the upcoming
     season is not uploaded until shortly before it starts. */
  const year=Number(dateStamp.slice(0,4));
  const month=Number(dateStamp.slice(5,7));
  const startYear=month>=7?year:year-1;
  const label=y=>`${y}-${String((y+1)%100).padStart(2,'0')}`;
  return [label(startYear),label(startYear-1)];
}
function fixtureSeason(dateStamp){return seasonsFor(dateStamp)[0]||'';}
function readFixtureStore(dateStamp){
  try{
    const raw=JSON.parse(localStorage.getItem(FIXTURE_STORE)||'null'),season=fixtureSeason(dateStamp);
    if(raw&&raw.season===season&&Date.now()-Number(raw.ts||0)<FIXTURE_CACHE_MS&&raw.byDate)return raw;
  }catch(e){}
  return null;
}
function writeFixtureStore(byDate,season){
  try{localStorage.setItem(FIXTURE_STORE,JSON.stringify({ts:Date.now(),season,byDate}));}catch(e){}
}
async function fetchJson(url,signal,timeoutMs=FETCH_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  if(signal){
    if(signal.aborted)controller.abort();
    else signal.addEventListener('abort',()=>controller.abort(),{once:true});
  }
  try{
    const response=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw new Error(`${url} returned ${response.status}`);
    return await response.json();
  }finally{clearTimeout(timer);}
}
async function fetchText(url,signal){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),FETCH_TIMEOUT_MS);
  if(signal){
    if(signal.aborted)controller.abort();
    else signal.addEventListener('abort',()=>controller.abort(),{once:true});
  }
  try{
    const response=await fetch(url,{headers:{Accept:'text/plain'},signal:controller.signal});
    if(!response.ok)throw new Error(`${url} returned ${response.status}`);
    return await response.text();
  }finally{clearTimeout(timer);}
}
const FOOTBALL_MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function parseFootballText(text,season){
  const startYear=Number(String(season||'').slice(0,4));
  if(!Number.isFinite(startYear))return [];
  let year=startYear,lastMonth=0,date='',time='';
  const matches=[];
  for(const line of String(text||'').split(/\r?\n/)){
    const day=line.match(/^\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Za-z]{3})\s+(\d{1,2})(?:\s+(\d{4}))?\s*$/);
    if(day){
      const month=FOOTBALL_MONTHS[String(day[1]||'').toLowerCase()];
      if(!month){date='';time='';continue;}
      if(day[3])year=Number(day[3]);
      else if(lastMonth&&month<lastMonth)year+=1;
      lastMonth=month;time='';
      date=`${year}-${String(month).padStart(2,'0')}-${String(Number(day[2])).padStart(2,'0')}`;
      continue;
    }
    if(!date)continue;
    const row=line.match(/^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)\s*$/);
    if(!row)continue;
    if(row[1])time=row[1];
    if(!time)continue;
    const team1=String(row[2]||'').trim();
    const team2=String(row[3]||'').replace(/\s+\d+\s*-\s*\d+(?:\s+\([^)]*\))?\s*$/,'').trim();
    if(team1&&team2)matches.push({date,time,team1,team2});
  }
  return matches;
}
async function loadFootballLeague(season,league){
  /* Football.TXT is the maintained source. Try a second CDN mirror of the
     same repository before giving up; do not fall through to the generated
     football.json mirror, which can legitimately lag a new season. */
  for(const base of FOOTBALL_TEXT_BASES){
    try{
      const text=await fetchText(`${base}/${season}/${league.text}`);
      const matches=parseFootballText(text,season);
      if(matches.length)return matches;
    }catch(e){}
  }
  return [];
}
/* One fetch per season covers every fixture date for months, so this is
   cached in localStorage for a week rather than hit per journey. */
async function loadFixtures(dateStamp){
  const seasonKey=fixtureSeason(dateStamp);
  if(fixtureIndex&&fixtureSeasonKey===seasonKey){
    if(fixtureIndex[dateStamp]||fixtureMissChecked.has(dateStamp))return fixtureIndex;
    fixtureMissChecked.add(dateStamp);
  }
  if(fixturePromise){if(fixturePromiseSeason===seasonKey)return fixturePromise;await fixturePromise;}
  const stored=readFixtureStore(dateStamp);
  if(stored){fixtureIndex=stored.byDate;fixtureSeasonKey=stored.season;if(fixtureIndex[dateStamp]||fixtureMissChecked.has(dateStamp))return fixtureIndex;fixtureMissChecked.add(dateStamp);}
  fixturePromiseSeason=seasonKey;
  fixturePromise=(async()=>{
    const byDate={};
    for(const season of seasonsFor(dateStamp)){
      let any=false;
      const leagues=await Promise.all(FOOTBALL_LEAGUES.map(league=>loadFootballLeague(season,league)));
      for(const matches of leagues){
        matches.forEach(match=>{
          const club=clubFor(match&&match.team1);
          if(!club||!match.date)return;
          (byDate[match.date]=byDate[match.date]||[]).push({
            title:`${match.team1} v ${match.team2}`,
            place:club.city,
            startTime:match.time||'15:00',
            capacity:club.capacity,
            type:'football'
          });
        });
        any=any||matches.length>0;
      }
      if(any)break;
    }
    fixtureIndex=byDate;fixtureSeasonKey=seasonKey;
    writeFixtureStore(byDate,seasonKey);
    return byDate;
  })().finally(()=>{fixturePromise=null;fixturePromiseSeason='';});
  return fixturePromise;
}
async function footballEventsFor(dateStamp){
  markSource('football','loading',{date:dateStamp});
  try{
    const index=await loadFixtures(dateStamp),rows=(index[dateStamp]||[]).map(match=>({
      title:match.title,place:match.place,startTime:match.startTime,endTime:'',attendance:Math.round(match.capacity*0.85),confidence:0.9,type:'football',source:'openfootball (public domain)'
    }));
    markSource('football','ready',{date:dateStamp,count:rows.length});return rows;
  }catch(error){markSource('football','error',{date:dateStamp,error:String(error&&error.message||error||'unavailable')});return [];}
}

/* --------------------------------------------------------------- */
function sparqlForJourney({origin,destination,interchanges=[],date}){
  const cities=unique([locality(origin),locality(destination),...(Array.isArray(interchanges)?interchanges.map(locality):[])])
    .filter(v=>v.length>=3)
    .map(v=>v.toLowerCase().replace(/["\\]/g,''));
  if(!cities.length)return '';
  const [y,m,d]=String(date||londonDate()).split('-').map(Number);
  const cityFilter=cities.map(city=>`CONTAINS(LCASE(STR(?areaLabel)), "${city}")`).join(' || ');
  return `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?event ?eventLabel ?time ?end ?locationLabel ?areaLabel ?attendance ?capacity WHERE {
  { ?event wdt:P585 ?time. } UNION { ?event wdt:P580 ?time. }
  FILTER(YEAR(?time)=${y} && MONTH(?time)=${m} && DAY(?time)=${d})
  ?event wdt:P276 ?location.
  ?location wdt:P131* ?area.
  ?event rdfs:label ?eventLabel. FILTER(LANG(?eventLabel)="en")
  ?location rdfs:label ?locationLabel. FILTER(LANG(?locationLabel)="en")
  ?area rdfs:label ?areaLabel. FILTER(LANG(?areaLabel)="en")
  FILTER(${cityFilter})
  OPTIONAL { ?event wdt:P582 ?end. }
  OPTIONAL { ?event wdt:P1110 ?attendance. }
  OPTIONAL { ?location wdt:P1083 ?capacity. }
}
LIMIT 80`;
}
function bindingValue(row,key){return row&&row[key]&&row[key].value||'';}
function rowsToEvents(rows){
  const hhmm=value=>{
    const date=new Date(value);
    return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
  };
  return (rows||[]).map(row=>{
    const attendance=Number(bindingValue(row,'attendance')||bindingValue(row,'capacity')||0);
    return {
      title:bindingValue(row,'eventLabel'),
      place:[bindingValue(row,'locationLabel'),bindingValue(row,'areaLabel')].filter(Boolean).join(', '),
      startTime:hhmm(bindingValue(row,'time')),
      endTime:bindingValue(row,'end')?hhmm(bindingValue(row,'end')):'',
      attendance,
      confidence:attendance?0.8:0.62,
      source:'Wikidata (CC0)'
    };
  }).filter(event=>event.title&&event.startTime);
}
async function wikidataEventsForJourney(journey){
  const query=sparqlForJourney(journey);if(!query)return [];
  const places=[locality(journey.origin),locality(journey.destination),...(Array.isArray(journey.interchanges)?journey.interchanges.map(locality):[])].filter(Boolean).sort().join('|');
  const key=`wd|${journey.date}|${places}`.toLowerCase(),memory=cache.get(key);
  if(memory&&Date.now()-memory.ts<MEMORY_CACHE_MS){markSource('wikidata','cached',{date:journey.date,count:memory.rows.length,ageMs:Date.now()-memory.ts});return memory.rows;}
  const stored=wikidataStoredEntry(key),age=stored?Date.now()-stored.entry.ts:Infinity;
  if(stored&&age<WIKIDATA_CACHE_MS){cache.set(key,stored.entry);markSource('wikidata','cached',{date:journey.date,count:stored.entry.rows.length,ageMs:age});return stored.entry.rows;}
  markSource('wikidata','loading',{date:journey.date});
  try{
    const json=await fetchJson(`${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`,null,WIKIDATA_TIMEOUT_MS),rows=rowsToEvents(json&&json.results&&json.results.bindings);
    const entry={ts:Date.now(),rows};cache.set(key,entry);saveWikidataEntry(key,rows);markSource('wikidata','ready',{date:journey.date,count:rows.length});return rows;
  }catch(error){
    if(stored&&age<WIKIDATA_STALE_MS){cache.set(key,stored.entry);markSource('wikidata','stale',{date:journey.date,count:stored.entry.rows.length,ageMs:age,error:String(error&&error.message||error||'unavailable')});return stored.entry.rows;}
    markSource('wikidata','error',{date:journey.date,error:String(error&&error.message||error||'unavailable')});throw error;
  }
}
if(!window.__KERBSIDE_EVENT_SOURCE__){
  window.__KERBSIDE_EVENT_SOURCE__={name:'Wikidata (CC0)',eventsForJourney:wikidataEventsForJourney};
}

/* --------------------------------------------------------------- */
function relevance(event,service,journey){
  const dep=mins(service&&service.std);
  if(dep==null)return null;
  const nearOrigin=placeMatches(event.place,journey.origin);
  const nearDest=journey.destination?placeMatches(event.place,journey.destination):false;
  if(!nearOrigin&&!nearDest)return null;

  let delta,phase,ideal;
  if(nearDest){
    /* Travelling toward the event: the trains that fill up are the ones
       arriving in the hour or two before it starts. */
    const arrival=serviceArrival(service,journey.destinationCrs);
    if(arrival==null)return null;
    delta=signedGap(event.start,arrival);
    phase=delta<0?'late':'before';
    ideal=75;
  }else{
    /* Leaving the event's city: the spike is the trains just after it ends. */
    delta=signedGap(dep,event.end);
    phase='after';
    ideal=45;
  }
  const earlyLimit=nearDest?-60:-30;
  if(delta==null||delta<earlyLimit||delta>240)return null;

  const timing=clamp(1-Math.abs(delta-ideal)/180,.15,1);
  const size=event.attendance>=50000?1:event.attendance>=20000?.8:event.attendance>=8000?.6:event.attendance>=2500?.4:.25;
  const amount=clamp(size*timing*event.confidence,0,MAX_EVENT_PRESSURE);
  if(amount<.16)return null;
  return {amount,event,phase,nearOrigin,nearDest,delta};
}
function pressureForJourney(service,journeyOverride={}){
  const journey={...currentJourney(),...(journeyOverride||{})};
  const route=window.__KERBSIDE_TRAIN_ROUTES__;
  if(!journey.destinationCrs)journey.destinationCrs=route&&route.state&&route.state.destination?route.state.destination.crs:'';
  const matches=state.events.map(e=>relevance(e,service,journey)).filter(Boolean).sort((a,b)=>b.amount-a.amount);
  if(!matches.length)return {amount:0,reasons:[]};
  const best=matches[0];
  const when=best.phase==='before'?'arriving before it':best.phase==='late'?'arriving soon after kick-off':'leaving after it';
  return {
    amount:Math.min(MAX_EVENT_PRESSURE,best.amount),
    reasons:[`${best.event.title} — trains ${when} can carry extra demand`],
    events:matches.slice(0,3)
  };
}
function setEvents(events,{date='',sources=[]}={}){
  state.events=(events||[]).map(normalise).filter(Boolean);
  state.updatedAt=Date.now();
  state.date=date;
  state.sources=sources;
  state.status='ready';
  window.__KERBSIDE_FORECAST_V3__?.apply?.();
}

let refreshSeq=0;
async function refresh(){
  const seq=++refreshSeq;
  const journey=currentJourney();
  /* A destination is no longer required. A plain departure board still
     benefits from knowing a 60,000-seat fixture just finished up the road. */
  if(!journey.origin){state.status='waiting';return;}
  const date=journeyDate();
  /* Keep already-resolved context usable while a same-date background refresh
     checks for fresher source data. Per-source health still exposes loading. */
  if(!(state.status==='ready'&&state.date===date))state.status='loading';
  try{
    const [football,wikidata]=await Promise.all([
      footballEventsFor(date),
      (async()=>{
        const provider=window.__KERBSIDE_EVENT_SOURCE__;
        if(!provider||typeof provider.eventsForJourney!=='function')return [];
        try{return await provider.eventsForJourney({...journey,date});}catch(e){return [];}
      })()
    ]);
    if(seq!==refreshSeq)return;
    /* Football first: a known fixture beats a Wikidata row of the same match. */
    const seen=new Set();
    const merged=[...football,...wikidata].filter(event=>{
      const key=`${String(event.title||'').toLowerCase()}|${event.startTime}`;
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
    setEvents(merged,{date,sources:unique(merged.map(e=>e.source))});
  }catch(e){
    if(seq!==refreshSeq)return;
    state.status='error';
    state.events=[];
  }
}

window.addEventListener('kerbside:journey-planner-change',refresh);
document.addEventListener('kerbside:train-route-change',refresh);
document.addEventListener('kerbside:train-date-change',refresh);
document.addEventListener('kerbside:timetable-services-ready',refresh);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,0),{once:true});
else setTimeout(refresh,0);

window.__KERBSIDE_EVENTS__={
  state,setEvents,refresh,pressureForJourney,MAX_EVENT_PRESSURE,
  normalise,relevance,locality,placeMatches,sparqlForJourney,rowsToEvents,
  wikidataEventsForJourney,footballEventsFor,loadFixtures,clubFor,
  currentJourney,timetableInterchanges,journeyDate,serviceArrival,signedGap,seasonsFor,parseFootballText,loadFootballLeague
};
})();
