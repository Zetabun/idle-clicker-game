from pathlib import Path
import base64
import gzip

CORE = Path('kerbside-journey-planner-core.js')
PROVIDER_TEST = Path('kerbside-backend/test/train-timetable-provider.test.js')
RANKING_TEST = Path('kerbside-backend/test/plan-my-journey.test.js')
BROWSER_TEST = Path('kerbside-backend/tests/train-journey-planner-regression.mjs')
TRIGGER = Path('.github/triggers/release-kerbside-0.9.19.txt')

trigger = TRIGGER.read_text(encoding='utf-8')
marker = 'PLAN_GZIP_BASE64='
encoded = next((line[len(marker):].strip() for line in trigger.splitlines() if line.startswith(marker)), '')
if not encoded:
    raise SystemExit('Plan My Journey payload is missing from release trigger')
plan_js = gzip.decompress(base64.b64decode(encoded)).decode('utf-8').strip() + '\n\n'

core = CORE.read_text(encoding='utf-8')
if 'const PLAN_PREF_KEY=' in core:
    raise SystemExit('Plan My Journey is already present in planner core')
old_timeout = """  setTimeout(()=>{\n    watchForDateRow();\n    bindRobustInputs();\n    planner.dataset.mode=isFutureJourney()?'future':'live';\n  },0);"""
new_timeout = """  setTimeout(()=>{\n    watchForDateRow();\n    bindRobustInputs();\n    installPlanJourney();\n    planner.dataset.mode=isFutureJourney()?'future':'live';\n  },0);"""
if core.count(old_timeout) != 1:
    raise SystemExit(f'Expected one planner install timeout, found {core.count(old_timeout)}')
core = core.replace(old_timeout, new_timeout, 1)
init_marker = "function init(){if(!install()){if(++initAttempts<INIT_RETRY_MAX)setTimeout(init,INIT_RETRY_MS);else console.warn('Kerbside journey planner could not attach.');return;}initAttempts=0;}"
if core.count(init_marker) != 1:
    raise SystemExit(f'Expected one planner init marker, found {core.count(init_marker)}')
core = core.replace(init_marker, plan_js + init_marker, 1)
old_export = "window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,isFutureJourney,syncRouteOrigin,refreshJourneyBoard,syncDepartAfterForDate,railNow,get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};"
new_export = "window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,isFutureJourney,syncRouteOrigin,refreshJourneyBoard,syncDepartAfterForDate,railNow,installPlanJourney,setPlanView,searchPlanJourneys,planRankEnriched,preferenceScore,planConnectionStress,get planState(){return planState;},get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};"
if core.count(old_export) != 1:
    raise SystemExit(f'Expected one planner API export, found {core.count(old_export)}')
CORE.write_text(core.replace(old_export, new_export, 1), encoding='utf-8')

provider_test = PROVIDER_TEST.read_text(encoding='utf-8')
if 'journey option API can return a wider bounded window' in provider_test:
    raise SystemExit('Journey-option provider regressions already present')
provider_test += r'''

test('journey option API can return a wider bounded window without changing the normal 24-row board cap',()=>{
  const provider=loadProvider();
  const clock=minute=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
  const manyRows=Array.from({length:36},(_,index)=>{
    const departure=360+index*5,arrival=departure+60;
    return [`rid-many-${index}`,`uid-many-${index}`,`1M${String(index).padStart(2,'0')}`,'XC','2026-08-12',[["BHM","",clock(departure),"",0],["BRI",clock(arrival),"","",0]]];
  });
  const normal=provider.journeysFromRows(manyRows,locations,manifest,{from:'BHM',to:'BRI',date:'2026-08-12',departAfter:'06:00'});
  const expanded=provider.journeysFromRows(manyRows,locations,manifest,{from:'BHM',to:'BRI',date:'2026-08-12',departAfter:'06:00',departBefore:'09:00',maxResults:40});
  const bounded=provider.journeysFromRows(manyRows,locations,manifest,{from:'BHM',to:'BRI',date:'2026-08-12',departAfter:'06:00',departBefore:'07:00',maxResults:40});
  assert.equal(normal.length,24);
  assert.equal(expanded.length,36);
  assert.equal(bounded.length,13);
  assert.ok(bounded.every(item=>item.departureMinute<=420));
});

test('long-range journey option API identifies Network Rail as its source',async()=>{
  const {provider}=loadDualProvider();
  const services=await provider.getJourneyOptions({from:'BHM',to:'BRI',date:'2026-09-10',departAfter:'09:30',departBefore:'10:30',maxResults:72});
  assert.equal(services.length,1);
  assert.equal(services[0].std,'10:00');
  assert.equal(services.kerbsideSource,'network-rail');
});

test('journey option windows spanning partial Darwin coverage merge the source intervals',async()=>{
  const {provider}=loadDualProvider({darwinPartial:true});
  const services=await provider.getJourneyOptions({from:'BHM',to:'BRI',date:'2026-08-12',departAfter:'07:00',departBefore:'10:00',maxResults:72});
  assert.ok(services.some(item=>item.serviceID==='nr-overlap'));
  assert.equal(services.kerbsideSource,'mixed');
});
'''
PROVIDER_TEST.write_text(provider_test, encoding='utf-8')

ranking_test = r'''import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(here,'..','..');
const source=await fs.readFile(path.join(repoRoot,'kerbside-journey-planner-core.js'),'utf8');

function loadPlanner(){
  const store=new Map();
  const context={
    console,URL,AbortController,Response,setTimeout,clearTimeout,setInterval(){return 0;},clearInterval(){},
    location:{href:'https://example.test/bus.html'},
    localStorage:{getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value))},
    document:{readyState:'loading',addEventListener(){},getElementById(){return null;}},
    window:{fetch:async()=>new Response('{}',{status:200})}
  };
  vm.createContext(context);vm.runInContext(source,context);return context.window.__KERBSIDE_JOURNEY_PLANNER__;
}
function candidates(){return [
  {id:'fast',departureMinute:540,arrivalMinute:600,totalMinutes:60,changes:1,connectionMinutes:14,minimumConnectionMinutes:10,recoveryOptions:[],forecast:{score:4.0}},
  {id:'quiet-direct',departureMinute:550,arrivalMinute:630,totalMinutes:80,changes:0,recoveryOptions:[],forecast:{score:1.0}},
  {id:'later-direct',departureMinute:560,arrivalMinute:650,totalMinutes:90,changes:0,recoveryOptions:[],forecast:{score:2.4}}
];}

test('Fastest preference ranks the earliest-arriving candidate first',()=>{
  const api=loadPlanner();assert.equal(api.planRankEnriched(candidates(),'fastest')[0].id,'fast');
});
test('Quieter preference is driven by Forecast v4 score',()=>{
  const api=loadPlanner();assert.equal(api.planRankEnriched(candidates(),'quieter')[0].id,'quiet-direct');
});
test('Fewer changes preference favours a direct train',()=>{
  const api=loadPlanner();assert.equal(api.planRankEnriched(candidates(),'fewer-changes')[0].changes,0);
});
test('Least stressful preference penalises tight changes and high forecast crowding',()=>{
  const api=loadPlanner(),rows=candidates(),ranked=api.planRankEnriched(rows,'least-stressful');
  assert.equal(ranked[0].id,'quiet-direct');
  assert.ok(api.planConnectionStress(rows.find(row=>row.id==='fast'))>.5);
});
'''
RANKING_TEST.write_text(ranking_test, encoding='utf-8')

browser_test = BROWSER_TEST.read_text(encoding='utf-8')
if 'Plan My Journey ranks the quiet Forecast v4 option first' in browser_test:
    raise SystemExit('Plan My Journey browser regression already present')
needle = """  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);"""
addition = r'''
  // Plan My Journey is a separate comparison view over the same timetable
  // provider and Forecast v4. Keep the regression deterministic by replacing
  // only the candidate/event responses used by this comparison.
  await page.waitForSelector('#trainViewTabs');
  await page.evaluate(()=>{
    const provider=window.__KERBSIDE_TIMETABLE_PROVIDER__;
    provider.getCoverage=async()=>({dates:['2026-08-12'],coverage:{'2026-08-12':{from:'00:01',to:'23:59',partial:false}}});
    provider.getJourneyOptions=async()=>{
      const rows=[
        {serviceID:'PLAN-FAST',std:'09:00',arrival:'10:00',departureMinute:540,arrivalMinute:600,totalMinutes:60,changes:0,journeyType:'direct',operator:'Fast Rail'},
        {serviceID:'PLAN-QUIET',std:'09:10',arrival:'10:15',departureMinute:550,arrivalMinute:615,totalMinutes:65,changes:0,journeyType:'direct',operator:'Quiet Rail'}
      ];
      Object.defineProperty(rows,'kerbsideSource',{value:'network-rail'});return rows;
    };
    const forecast=window.__KERBSIDE_FORECAST_V4__;
    forecast.forecast=service=>service.serviceID==='PLAN-QUIET'
      ?{score:.8,label:'Quiet',level:'quiet',confidence:'High',probabilities:{quiet:.75,moderate:.18,busy:.05,veryBusy:.02},reasons:['lower measured demand at this time']}
      :{score:3.9,label:'Busy',level:'busy',confidence:'High',probabilities:{quiet:.06,moderate:.19,busy:.58,veryBusy:.17},reasons:['higher measured demand at this time']};
    const events=window.__KERBSIDE_EVENTS__;events.footballEventsFor=async()=>[];events.wikidataEventsForJourney=async()=>[];
    if(window.__KERBSIDE_TRAIN_TIMETABLE__)window.__KERBSIDE_TRAIN_TIMETABLE__.sync=()=>true;
  });
  await page.click('[data-train-view="plan"]');
  assert.equal(await page.locator('#planJourneyForm').isVisible(),true);
  assert.equal(await page.locator('#trainPlanner').isVisible(),false);
  assert.match(await page.locator('#planJourneyFrom').inputValue(),/Birmingham New Street/);
  assert.match(await page.locator('#planJourneyTo').inputValue(),/Bristol Temple Meads/);
  await page.fill('#planJourneyDate','2026-08-12');
  await page.fill('#planJourneyStart','09:00');
  await page.fill('#planJourneyEnd','11:00');
  await page.selectOption('#planJourneyPreference','quieter');
  await page.click('#planJourneySearch');
  await page.waitForFunction(()=>document.querySelectorAll('#planJourneyResults .plan-journey-result').length===2,undefined,{timeout:10000});
  const planCards=await page.locator('#planJourneyResults .plan-journey-result').allTextContents();
  assert.match(planCards[0],/Quiet Rail/,'Plan My Journey ranks the quiet Forecast v4 option first');
  assert.match(planCards[0],/Best match for Quieter/);
  assert.match(await page.locator('#planJourneyMeta').textContent(),/Network Rail SCHEDULE/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('kerbside.rail.plan.preference.v1')),'quieter');
  await page.click('[data-train-view="trains"]');
  assert.equal(await page.locator('#trainPlanner').isVisible(),true,'normal train planner should be restored after leaving Plan My Journey');

'''
if browser_test.count(needle) != 1:
    raise SystemExit(f'Expected one browser overflow assertion marker, found {browser_test.count(needle)}')
BROWSER_TEST.write_text(browser_test.replace(needle, addition + needle, 1), encoding='utf-8')
