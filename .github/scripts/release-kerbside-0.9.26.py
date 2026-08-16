#!/usr/bin/env python3
from pathlib import Path
import subprocess

VERSION='0.9.26'

def replace_once(path, old, new):
    target=Path(path)
    text=target.read_text(encoding='utf-8')
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one anchor, found {count}')
    target.write_text(text.replace(old,new,1),encoding='utf-8')

# Use OpenFootball's authoritative public-domain Football.TXT source first.
# The generated football.json mirror can lag a newly published season by weeks.
replace_once('kerbside-train-events.js',
"""const FOOTBALL_BASE='https://raw.githubusercontent.com/openfootball/football.json/master';
const FOOTBALL_LEAGUES=['en.1','en.2'];
const FETCH_TIMEOUT_MS=7000;
const MEMORY_CACHE_MS=30*60*1000;
const FIXTURE_CACHE_MS=7*24*60*60*1000;
const FIXTURE_STORE='kerbside.rail.fixtures.v1';
""",
"""const FOOTBALL_BASE='https://raw.githubusercontent.com/openfootball/football.json/master';
const FOOTBALL_TEXT_BASE='https://raw.githubusercontent.com/openfootball/england/master';
const FOOTBALL_LEAGUES=[
  {json:'en.1',text:'1-premierleague.txt'},
  {json:'en.2',text:'2-championship.txt'}
];
const FETCH_TIMEOUT_MS=7000;
const MEMORY_CACHE_MS=30*60*1000;
const FIXTURE_CACHE_MS=7*24*60*60*1000;
/* v2 deliberately invalidates the old cache: v1 could contain the previous
   season after the generated JSON mirror returned 404 for a new season. */
const FIXTURE_STORE='kerbside.rail.fixtures.v2';
""")

replace_once('kerbside-train-events.js',
"""async function fetchJson(url,signal){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),FETCH_TIMEOUT_MS);
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
/* One fetch per season covers every fixture date for months, so this is
   cached in localStorage for a week rather than hit per journey. */
""",
"""async function fetchJson(url,signal){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),FETCH_TIMEOUT_MS);
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
  for(const line of String(text||'').split(/\\r?\\n/)){
    const day=line.match(/^\\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s+([A-Za-z]{3})\\s+(\\d{1,2})(?:\\s+(\\d{4}))?\\s*$/);
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
    const row=line.match(/^\\s*(?:(\\d{1,2}:\\d{2})\\s+)?(.+?)\\s+v\\s+(.+?)\\s*$/);
    if(!row)continue;
    if(row[1])time=row[1];
    if(!time)continue;
    const team1=String(row[2]||'').trim();
    const team2=String(row[3]||'').replace(/\\s+\\d+\\s*-\\s*\\d+(?:\\s+\\([^)]*\\))?\\s*$/,'').trim();
    if(team1&&team2)matches.push({date,time,team1,team2});
  }
  return matches;
}
async function loadFootballLeague(season,league){
  /* Football.TXT is the maintained source. football.json is an auto-generated
     convenience mirror and has historically appeared later at season rollover. */
  try{
    const text=await fetchText(`${FOOTBALL_TEXT_BASE}/${season}/${league.text}`);
    const matches=parseFootballText(text,season);
    if(matches.length)return matches;
  }catch(e){}
  try{
    const json=await fetchJson(`${FOOTBALL_BASE}/${season}/${league.json}.json`);
    return Array.isArray(json&&json.matches)?json.matches:[];
  }catch(e){return [];}
}
/* One fetch per season covers every fixture date for months, so this is
   cached in localStorage for a week rather than hit per journey. */
""")

replace_once('kerbside-train-events.js',
"""    for(const season of seasonsFor(dateStamp)){
      let any=false;
      for(const league of FOOTBALL_LEAGUES){
        try{
          const json=await fetchJson(`${FOOTBALL_BASE}/${season}/${league}.json`);
          const matches=Array.isArray(json&&json.matches)?json.matches:[];
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
        }catch(e){}
      }
      if(any)break;
    }
""",
"""    for(const season of seasonsFor(dateStamp)){
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
""")

# A small amount of match traffic can still be relevant just after kick-off,
# but do not inflate trains arriving well into the match.
replace_once('kerbside-train-events.js',
"""  if(delta==null||delta<-30||delta>240)return null;

  const timing=clamp(1-Math.abs(delta-ideal)/180,.15,1);
""",
"""  const earlyLimit=nearDest?-60:-30;
  if(delta==null||delta<earlyLimit||delta>240)return null;

  const timing=clamp(1-Math.abs(delta-ideal)/180,.15,1);
""")

replace_once('kerbside-train-events.js',
"""  wikidataEventsForJourney,footballEventsFor,loadFixtures,clubFor,
  currentJourney,timetableInterchanges,journeyDate,serviceArrival,signedGap,seasonsFor
""",
"""  wikidataEventsForJourney,footballEventsFor,loadFixtures,clubFor,
  currentJourney,timetableInterchanges,journeyDate,serviceArrival,signedGap,seasonsFor,parseFootballText,loadFootballLeague
""")

# Plan My Journey should preserve fast football results even when Wikidata is slow,
# and show enough reasons for the event reason not to disappear behind generic ones.
replace_once('kerbside-journey-planner-core.js',
"""  const reasons=(forecast.reasons||[]).slice(0,2).map(reason=>`<li>${esc(reason)}</li>`).join('');
""",
"""  const reasons=(forecast.reasons||[]).slice(0,3).map(reason=>`<li>${esc(reason)}</li>`).join('');
""")

replace_once('kerbside-journey-planner-core.js',
"""  const work=Promise.allSettled([
    typeof api.footballEventsFor==='function'?api.footballEventsFor(date):Promise.resolve([]),
    typeof api.wikidataEventsForJourney==='function'?api.wikidataEventsForJourney(journey):Promise.resolve([])
  ]).then(results=>{
    const rows=[];for(const result of results)if(result.status==='fulfilled'&&Array.isArray(result.value))rows.push(...result.value);
    const seen=new Set();return rows.filter(item=>{const key=`${String(item&&item.title||'').toLowerCase()}|${String(item&&item.startTime||'')}`;if(!key||seen.has(key))return false;seen.add(key);return true;});
  });
  return withTimeout(work,PLAN_EVENT_TIMEOUT_MS);
""",
"""  const source=async work=>{
    try{const rows=await withTimeout(Promise.resolve().then(work),PLAN_EVENT_TIMEOUT_MS);return Array.isArray(rows)?rows:[];}
    catch(error){return [];}
  };
  const [football,wikidata]=await Promise.all([
    source(()=>typeof api.footballEventsFor==='function'?api.footballEventsFor(date):[]),
    source(()=>typeof api.wikidataEventsForJourney==='function'?api.wikidataEventsForJourney(journey):[])
  ]);
  const rows=[...football,...wikidata],seen=new Set();
  return rows.filter(item=>{const key=`${String(item&&item.title||'').toLowerCase()}|${String(item&&item.startTime||'')}`;if(!key||seen.has(key))return false;seen.add(key);return true;});
""")

# Test the actual season-rollover failure and the screenshot's late-arrival edge.
replace_once('kerbside-backend/tests/train-forecast-v3-dual-timetable.mjs',
"""function loadEvents(){
  const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_FORECAST_V3__:{apply(){}}};
  const context={window,document:documentStub,Date:FixedDate,Intl,console,localStorage:storage(),setTimeout,clearTimeout,AbortController,fetch:async()=>{throw new Error('network not expected');}};
  vm.createContext(context);
  vm.runInContext(eventsSource,context);
  return context.window.__KERBSIDE_EVENTS__;
}
""",
"""function loadEvents({fetchImpl=null,store=null}={}){
  const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_FORECAST_V3__:{apply(){}}};
  const context={window,document:documentStub,Date:FixedDate,Intl,console,localStorage:store||storage(),setTimeout,clearTimeout,AbortController,fetch:fetchImpl||(async()=>{throw new Error('network not expected');})};
  vm.createContext(context);
  vm.runInContext(eventsSource,context);
  return context.window.__KERBSIDE_EVENTS__;
}
""")

anchor="""test('scheduled destination arrival drives event pressure before live calling points exist',()=>{
"""
insert="""test('OpenFootball Football.TXT parser inherits kick-off times and season years',()=>{
  const events=loadEvents();
  const rows=events.parseFootballText(`= English Championship 2026/27\n  Sat Aug 29 2026\n    15:00  Norwich City FC         v Burnley FC\n           Bristol City FC         v Portsmouth FC\n  Fri Jan 1 2027\n    12:00  Bristol City FC         v West Ham United FC\n  Sat Jan 16\n           Bristol City FC         v Norwich City FC\n`,'2026-27');
  const plain=JSON.parse(JSON.stringify(rows));
  assert.deepEqual(plain,[
    {date:'2026-08-29',time:'15:00',team1:'Norwich City FC',team2:'Burnley FC'},
    {date:'2026-08-29',time:'15:00',team1:'Bristol City FC',team2:'Portsmouth FC'},
    {date:'2027-01-01',time:'12:00',team1:'Bristol City FC',team2:'West Ham United FC'},
    {date:'2027-01-16',time:'12:00',team1:'Bristol City FC',team2:'Norwich City FC'}
  ]);
});

test('current-season Football.TXT supplies Bristol City when football.json has not rolled over',async()=>{
  const calls=[];
  const championship=`= English Championship 2026/27\n  Sat Aug 29 2026\n    15:00  Norwich City FC         v Burnley FC\n           Bristol City FC         v Portsmouth FC\n`;
  const fetchImpl=async url=>{
    calls.push(String(url));
    if(String(url).endsWith('/2026-27/2-championship.txt'))return {ok:true,status:200,text:async()=>championship};
    if(String(url).endsWith('/2026-27/1-premierleague.txt'))return {ok:true,status:200,text:async()=>'= English Premier League 2026/27\\n'};
    return {ok:false,status:404,json:async()=>({}),text:async()=>''};
  };
  const events=loadEvents({fetchImpl});
  const rows=await events.footballEventsFor('2026-08-29');
  const bristol=rows.find(item=>/Bristol City FC v Portsmouth FC/.test(item.title));
  assert.ok(bristol,{rows,calls});
  assert.equal(bristol.place,'Bristol');
  assert.equal(bristol.startTime,'15:00');
  assert.equal(bristol.type,'football');
  assert.ok(!calls.some(url=>url.includes('/2025-26/')),{calls});
});

test('football pressure tapers through the first hour after kick-off but not deep into the match',()=>{
  const events=loadEvents();
  const fixture={title:'Bristol City FC v Portsmouth FC',place:'Bristol',start:15*60,end:17*60+30,attendance:22950,confidence:.9,type:'football'};
  const journey={origin:'Birmingham New Street',destination:'Bristol Temple Meads',destinationCrs:'BRI'};
  const lateFirstHalf=events.relevance(fixture,{std:'14:12',arrival:'15:36'},journey);
  const deepIntoMatch=events.relevance(fixture,{std:'14:42',arrival:'16:07'},journey);
  assert.ok(lateFirstHalf&&lateFirstHalf.amount>=.16,{lateFirstHalf});
  assert.equal(deepIntoMatch,null);
});

"""+anchor
replace_once('kerbside-backend/tests/train-forecast-v3-dual-timetable.mjs',anchor,insert)

Path('VERSION').write_text(VERSION+'\n',encoding='utf-8')
subprocess.run(['python3','.github/scripts/sync-version.py'],check=True)
print('Prepared Kerbside',VERSION,'football fixture reliability release.')
