from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


def replace_between(path, start, end, new):
    text = read(path)
    count = text.count(start)
    if count != 1:
        raise SystemExit(f'{path}: start marker count was {count}: {start[:120]!r}')
    i = text.index(start)
    j = text.index(end, i)
    write(path, text[:i] + new + text[j:])


# ---------------------------------------------------------------------------
# kerbside-trains.js: keep v2 as a useful legacy implementation, but expose a
# clean baseline to Forecast v3 so live effects are not scored in both layers.
# ---------------------------------------------------------------------------
trains = 'kerbside-trains.js'

replace_once(
    trains,
    "function destinationIdentity(service){\n  const destination = primaryDestination(service);\n  return normaliseToken(destination.crs || destination.name || 'unknown');\n}\n",
    "function destinationIdentity(service){\n  const destination = primaryDestination(service);\n  return normaliseToken(destination.crs || destination.name || 'unknown');\n}\n\n/* The route board deliberately rewrites service.destination to the user's\n   selected destination. Local history, however, was learned from the live\n   board under the train's real terminus. Keep those two identities separate\n   so BHM -> BRI on a Plymouth train can reuse the same historical profile. */\nfunction profileDestinationIdentity(service){\n  const display=service&&service.displayDestination;\n  const terminus=display&&(display.crs||display.name||display.locationName);\n  return normaliseToken(terminus||destinationIdentity(service)||'unknown');\n}\n"
)

replace_once(
    trains,
    "  return [stationCode,operatorIdentity(service),destinationIdentity(service),dayClassFor(date),band].join('|');",
    "  return [stationCode,operatorIdentity(service),profileDestinationIdentity(service),dayClassFor(date),band].join('|');"
)

replace_once(
    trains,
    "function crowdingForecast(service,index,allServices,options={}){\n  if(service.isCancelled){",
    "function crowdingForecast(service,index,allServices,options={}){\n  const v3Baseline = options.modelLayer === 'v3-baseline';\n  if(service.isCancelled){"
)

replace_between(
    trains,
    "  const length = Number(service.length) || 0;\n",
    "  const precedingGap = context.precedingGap;\n",
    """  if(!v3Baseline){
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

"""
)

replace_between(
    trains,
    "  if(context.cancelledBefore){\n",
    "  const etd = String(service.etd || '').trim();\n",
    """  if(!v3Baseline){
    if(context.cancelledBefore){
      add(Math.min(1.25,context.cancelledBefore*0.6),
        `${context.cancelledBefore} earlier similar service${context.cancelledBefore===1?' was':'s were'} cancelled`,0.65);
    }
    if(context.cancelledAfter){
      add(Math.min(0.45,context.cancelledAfter*0.25),
        'a nearby later similar service is cancelled',0.25);
    }
  }

"""
)

replace_between(
    trains,
    "  const etd = String(service.etd || '').trim();\n",
    "  const startsHere = stationMatchesOrigin(service,station);\n",
    """  if(!v3Baseline){
    const etd = String(service.etd || '').trim();
    const delay = delayMinutes(service);
    if(/^delayed$/i.test(etd)) add(0.55,'service is currently reported delayed',0.45);
    else if(delay >= 20) add(0.7,`current delay is ${delay} minutes`,0.5);
    else if(delay >= 10) add(0.45,`current delay is ${delay} minutes`,0.45);
    else if(delay >= 5) add(0.2,`current delay is ${delay} minutes`,0.35);
    else evidence += 0.2;
  }

"""
)

replace_between(
    trains,
    "  const startsHere = stationMatchesOrigin(service,station);\n",
    "  const disruption = disruptionMessageSignal(messages);\n",
    """  if(!v3Baseline){
    const startsHere = stationMatchesOrigin(service,station);
    if(startsHere === true) add(-0.25,'train starts at this station',0.35);
    else if(startsHere === false) add(0.25,'through train may already carry passengers',0.35);
  }

"""
)

replace_once(
    trains,
    "  if(feedbackCount > 0 && Number.isFinite(Number(profile.feedbackMean))){",
    "  if(!v3Baseline && options.includeFeedback !== false && feedbackCount > 0 && Number.isFinite(Number(profile.feedbackMean))){"
)

replace_once(
    trains,
    "  return 'Live running times use the Huxley 2 community JSON proxy for National Rail Darwin. Crowding model v2 combines time-band demand, formation versus comparable trains, service gaps, delays, cancellations, through-train status and locally learned patterns. It is not ticket-sales data and not live occupancy.';",
    "  return 'Live running evidence comes from National Rail Darwin with the app\'s configured fallbacks. Forecast v3 combines timetable demand, service spacing, events, calendar effects, DfT calibration and live Darwin evidence when available. Passenger-submitted crowding reports do not alter the Forecast v3 score. It is not ticket-sales data and not live occupancy.';"
)
replace_once(trains, '<span class="train-model-label">Crowding model v2</span>', '<span class="train-model-label">Forecast v3</span>')
replace_once(trains, '<strong>Service-relative prediction</strong>', '<strong>Timetable + live prediction</strong>')
replace_once(
    trains,
    '<p>Kerbside now compares formation and headway with similar trains, accounts for delays, cancellations and through-train loading, and learns recurring patterns locally. Optional crowding feedback calibrates future predictions on this device.</p>',
    '<p>Kerbside combines timetable demand, service spacing, events, calendar effects and measured DfT calibration, then adds Darwin delays, cancellations, formation and route-loading evidence when those live fields become available. Passenger crowding reports are stored locally for accuracy checks, not score calibration.</p>'
)

replace_once(
    trains,
    "function forecastFor(service,index){\n  return crowdingForecast(service,index,state.services,{\n    station:state.station,\n    referenceDate:referenceDateFromBoard(),\n    messages:state.board && state.board.nrccMessages\n  });\n}",
    "function forecastFor(service,index){\n  const context={station:state.station,referenceDate:referenceDateFromBoard(),messages:state.board&&state.board.nrccMessages};\n  const v3=window.__KERBSIDE_FORECAST_V3__;\n  if(v3&&typeof v3.forecast==='function')return v3.forecast(service,index,state.services,context);\n  return crowdingForecast(service,index,state.services,context);\n}"
)

replace_once(
    trains,
    "  const learningText = forecast.feedbackSamples > 0\n    ? `${forecast.historySamples} local service observation${forecast.historySamples===1?'':'s'} · ${forecast.feedbackSamples} crowding report${forecast.feedbackSamples===1?'':'s'}`\n    : `${forecast.historySamples} local service observation${forecast.historySamples===1?'':'s'} so far`;",
    "  const historySamples=Number(forecast.historySamples)||0;\n  const learningText=`${historySamples} local service observation${historySamples===1?'':'s'} available`;\n  const modelLabel=Number(forecast.modelVersion)>=3?'Forecast v3':`model v${MODEL_VERSION}`;"
)
replace_once(
    trains,
    '<div><i></i><strong>${esc(forecast.label)}</strong><span>${esc(forecast.confidence)} confidence · model v${MODEL_VERSION}</span></div>',
    '<div><i></i><strong>${esc(forecast.label)}</strong><span>${esc(forecast.confidence)} confidence · ${esc(modelLabel)}</span></div>'
)
replace_once(trains, '<span class="train-model-label">Help calibrate this forecast</span>', '<span class="train-model-label">Record actual crowding</span>')
replace_once(
    trains,
    '<p>If you are on this train, or have just used it, one tap adds a local crowding label for similar future services. Nothing is uploaded.</p>',
    '<p>If you are on this train, or have just used it, one tap saves a local observation for later accuracy checks. It does not change the Forecast v3 score and nothing is uploaded.</p>'
)


# ---------------------------------------------------------------------------
# Forecast v3: one owner per phenomenon, shared history identity across the
# timetable/live boundary, and static prediction inputs that do not change
# merely because midnight has passed.
# ---------------------------------------------------------------------------
forecast = 'kerbside-train-forecast-v3.js'

replace_once(
    forecast,
    "function destinationIdentity(service){const item=Array.isArray(service&&service.destination)?service.destination.find(Boolean):null;return normalise(item&&(item.crs||item.locationName)||'unknown');}\nfunction operatorIdentity(service){return normalise(service&&(service.operatorCode||service.operator)||'unknown');}\nfunction profileKey(service,station,date){const stationCode=normalise(station&&(station.crs||station.name)||'unknown');const minute=parseMinutes(service&&service.std);const band=minute==null?'unknown':String(Math.floor(minute/120)*2).padStart(2,'0');return [stationCode,operatorIdentity(service),destinationIdentity(service),dayClass(date),band].join('|');}\nfunction getProfile(api,service,date){const model=api&&api.state&&api.state.crowdingModel;if(!model||!model.profiles)return null;return model.profiles[profileKey(service,api.state.station,date)]||null;}",
    "function destinationIdentity(service){const item=Array.isArray(service&&service.destination)?service.destination.find(Boolean):null;return normalise(item&&(item.crs||item.locationName)||'unknown');}\nfunction profileDestinationIdentity(service){const display=service&&service.displayDestination;return normalise((display&&(display.crs||display.name||display.locationName))||destinationIdentity(service)||'unknown');}\nfunction operatorIdentity(service){return normalise(service&&(service.operatorCode||service.operator)||'unknown');}\nfunction profileKey(service,station,date){const stationCode=normalise(station&&(station.crs||station.name)||'unknown');const minute=parseMinutes(service&&service.std);const band=minute==null?'x':String(Math.floor(minute/120));return [stationCode,operatorIdentity(service),profileDestinationIdentity(service),dayClass(date),band].join('|');}\nfunction getProfile(api,service,date,station){const model=api&&api.state&&api.state.crowdingModel;if(!model||!model.profiles)return null;const at=station||(api&&api.state&&api.state.station);return model.profiles[profileKey(service,at,date)]||null;}"
)

replace_once(
    forecast,
    "function calendarSignal(date,minute){let amount=0;const reasons=[];const weekday=day(date),dateStamp=stamp(date);if(state.bankHolidays.has(dateStamp)){amount+=.55;reasons.push('bank-holiday travel pattern');}if(weekday==='Fri'&&minute!=null&&minute>=840&&minute<1200){amount+=.35;reasons.push('Friday leisure and commuter demand');}if((weekday==='Sat'||weekday==='Sun')&&minute!=null&&minute>=600&&minute<1140){amount+=.2;reasons.push('weekend daytime demand');}const month=Number(dateStamp.slice(5,7)),dom=Number(dateStamp.slice(8,10));if(month===12&&dom>=18){amount+=.45;reasons.push('Christmas travel period');}if((month===7||month===8)&&(weekday==='Fri'||weekday==='Sat')){amount+=.2;reasons.push('summer leisure travel');}return {amount,reasons};}",
    "function calendarSignal(date,minute){let amount=0;const reasons=[];const dateStamp=stamp(date);if(state.bankHolidays.has(dateStamp)){amount+=.55;reasons.push('bank-holiday travel pattern');}const month=Number(dateStamp.slice(5,7)),dom=Number(dateStamp.slice(8,10));if(month===12&&dom>=18&&dom<20){amount+=.45;reasons.push('pre-Christmas travel period');}return {amount,reasons};}"
)

replace_once(
    forecast,
    "  const planned=parseMinutes(service&&service.std);\n  if(planned==null||!Array.isArray(services))return {amount:0,reasons:[]};\n  let amount=0,count=0,nearest=null;",
    "  const planned=parseMinutes(service&&service.std);\n  if(planned==null||!Array.isArray(services))return {amount:0,reasons:[]};\n  const flow=destinationIdentity(service);\n  let amount=0,count=0,nearest=null;"
)
replace_once(
    forecast,
    "    const item=services[i];\n    if(!item||!item.isCancelled)continue;\n    const when=parseMinutes(item.std);",
    "    const item=services[i];\n    if(!item||!item.isCancelled)continue;\n    if(flow&&flow!=='unknown'&&destinationIdentity(item)!==flow)continue;\n    const when=parseMinutes(item.std);"
)

replace_between(
    forecast,
    "function liveSignal(service,index,services){",
    "/* The old guard bailed out for any future date",
    """function liveSignal(service,index,services){
  let amount=0;const reasons=[];
  if(service&&service.isCancelled)return {amount:-5,reasons:['service cancelled']};
  const planned=parseMinutes(service&&service.std),expected=parseMinutes(service&&service.etd);
  if(planned!=null&&expected!=null){
    let delay=expected-planned;if(delay<-720)delay+=1440;if(delay>720)delay-=1440;
    if(delay>=20){amount+=.8;reasons.push(`${delay}-minute delay increasing passenger accumulation`);}
    else if(delay>=8){amount+=.4;reasons.push('current delay increasing platform demand');}
  }
  const knock=cancellationKnockOn(service,index,services);
  amount+=knock.amount;knock.reasons.forEach(r=>reasons.push(r));
  return {amount,reasons};
}
function historicalSignal(api,service,date,station){
  const profile=getProfile(api,service,date,station);
  if(!profile)return {amount:0,reasons:[],profile:null,samples:0};
  const samples=Number(profile.samples||profile.count||profile.observationCount)||0;
  /* History is evidence, not passenger demand by itself. Earlier builds
     added +0.3 merely because three observations existed, so services with
     more instrumentation looked busier without any behavioural evidence. */
  return {amount:0,reasons:[],profile,samples};
}
function formationSignal(api,service,services,date,station){
  const length=Number(service&&service.length)||0;
  if(!length)return {amount:0,reasons:[]};
  const profile=getProfile(api,service,date,station);
  const lengthSamples=profile?Number(profile.lengthSamples)||0:0;
  const typical=profile?Number(profile.avgLength||profile.lengthMean||profile.typicalLength)||0:0;
  let baseline=0,source='';
  if(lengthSamples>=3&&typical>0){baseline=typical;source='its historical formation';}
  else{
    const lengths=formationBaseline(services).sort((a,b)=>a-b);
    if(lengths.length>=3){baseline=lengths[Math.floor(lengths.length/2)];source='nearby live formations';}
  }
  if(!baseline)return {amount:0,reasons:[]};
  const ratio=length/baseline;
  if(ratio<=.65)return {amount:.8,reasons:[`formation is much shorter than ${source}`]};
  if(ratio<=.8)return {amount:.45,reasons:[`formation is shorter than ${source}`]};
  if(ratio>=1.35)return {amount:-.35,reasons:[`formation is much longer than ${source}`]};
  if(ratio>=1.2)return {amount:-.2,reasons:[`formation is longer than ${source}`]};
  return {amount:0,reasons:[]};
}
"""
)

replace_between(
    forecast,
    "function journeyShapeSignal(service){\n",
    "\n\n/* School holidays.",
    """function stationMatchesOrigin(service,station){
  const origins=Array.isArray(service&&service.origin)?service.origin.filter(Boolean):[];
  if(!origins.length||!station)return null;
  const crs=String(station.crs||'').toUpperCase(),name=normalise(station.name);
  return origins.some(origin=>{
    const originCrs=String(origin.crs||'').toUpperCase(),originName=normalise(origin.locationName||origin.name);
    return (crs&&originCrs===crs)||(name&&originName===name);
  });
}
function journeyShapeSignal(service,station){
  const before=callingPoints(service&&service.previousCallingPoints);
  const after=callingPoints(service&&service.subsequentCallingPoints);
  const startsHere=stationMatchesOrigin(service,station);
  let amount=0;const reasons=[];
  if(before.length>=12){amount+=.7;reasons.push('long run before this stop, so the train arrives already loaded');}
  else if(before.length>=6){amount+=.45;reasons.push('several stops already made, so passengers have accumulated');}
  else if(before.length>=2){amount+=.2;reasons.push('a few stops already made');}
  else if(startsHere===true){amount-=.25;reasons.push('train starts at this station');}
  else if(startsHere===false){amount+=.25;reasons.push('through train may already carry passengers');}
  /* Expanded Darwin calling points replace the binary starts-here proxy when
     they arrive. That improves the same row instead of adding a second copy
     of through-train loading on top of the timetable estimate. */
  if(before.some(p=>(STATION_TIER[String(p.crs||'').toUpperCase()]||1)>=3)){
    amount+=.35;reasons.push('has already called at a major hub');
  }
  if(after.length&&after.length<=3&&after.some(p=>(STATION_TIER[String(p.crs||'').toUpperCase()]||1)>=3)){
    amount+=.3;reasons.push('fast service to a major destination');
  }
  const evidence=(before.length||after.length)?1:(startsHere==null?0:.5);
  return {amount,reasons,evidence};
}"""
)

replace_between(
    forecast,
    "function forecast(service,index,services,context={}){",
    "/* options.mode overrides",
    """function forecast(service,index,services,context={}){
  const api=window.__KERBSIDE_TRAINS__;
  const date=context.referenceDate instanceof Date?context.referenceDate:new Date(context.referenceDate||Date.now());
  const station=context.station||(api&&api.state&&api.state.station);
  const baseContext={...context,station,referenceDate:date,modelLayer:'v3-baseline',includeFeedback:false};
  const base=api&&typeof api.crowdingForecast==='function'
    ?api.crowdingForecast(service,index,services,baseContext)
    :{score:1.8,reasons:[],confidence:'Low'};
  if(service&&service.isCancelled)return {score:null,level:base.level||'unknown',label:base.label||'Not applicable',confidence:base.confidence||'—',reasons:base.reasons&&base.reasons.length?base.reasons:['This service is cancelled.'],modelVersion:VERSION,eventPressure:0,historySamples:Number(base.historySamples)||0,cancelled:true};

  const minute=parseMinutes(service&&service.std),future=isFuture(date);
  const calendar=calendarSignal(date,minute);
  const historical=historicalSignal(api,service,date,station);
  const events=eventSignal(service,date);
  const live=future?{amount:0,reasons:[]}:liveSignal(service,index,services);
  const formation=future?{amount:0,reasons:[]}:formationSignal(api,service,services,date,station);
  const shape=journeyShapeSignal(service,station);
  const scale=stationScaleSignal(station);
  const school=schoolHolidaySignal(date,minute);
  const offpeak=offPeakSignal(date,minute);
  const shapeCal=calibratedDemandSignal(station,minute,date);
  const serviceClass=serviceClassSignal(service,station,minute,date);

  let score=Number(base.score);if(!Number.isFinite(score))score=1.8;
  score=clamp(score+calendar.amount+events.amount+live.amount+formation.amount+shape.amount+scale.amount+school.amount+offpeak.amount+shapeCal.amount+serviceClass.amount,.25,5);
  const reasons=unique([
    ...(base.reasons||[]).filter(r=>!/passenger feedback|local feedback|reported crowding/i.test(r)),
    ...shape.reasons,...events.reasons,...live.reasons,...formation.reasons,
    ...serviceClass.reasons,...school.reasons,...offpeak.reasons,...shapeCal.reasons,...calendar.reasons,...scale.reasons
  ]).slice(0,6);
  const calibrated=!!(scale.reasons.length&&calibration()&&calibration().profileFor&&calibration().profileFor(station));
  const historySamples=Math.max(Number(base.historySamples)||0,Number(historical.samples)||0);
  const historyEvidence=historySamples>=3?1:(historySamples?0.5:0);
  const evidence=2+historyEvidence+(calendar.reasons.length?1:0)+(events.reasons.length?1:0)+(live.reasons.length?2:0)+(formation.reasons.length?1:0)+(shape.evidence?1:0)+(school.reasons.length?.5:0)+(calibrated?1:0)+(serviceClass.reasons.length?.5:0);
  const confidence=evidence>=6?'High':evidence>=4?'Medium-high':evidence>=3?'Medium':'Low';
  const cal=calibration();
  let calibrationNote='';
  if(cal&&typeof cal.contextNote==='function'){try{calibrationNote=cal.contextNote(station,minute,date)||'';}catch(error){calibrationNote='';}}
  return {score,level:levelFor(score),label:labelFor(score),confidence,reasons:reasons.length?reasons:['service time and route demand baseline'],modelVersion:VERSION,eventPressure:events.amount,historySamples,calibrated,calibrationNote,calibrationSource:cal?cal.source:''};
}
"""
)

replace_once(
    forecast,
    "window.__KERBSIDE_FORECAST_V3__={version:VERSION,state,forecast,apply,detailMarkup,calendarSignal,liveSignal,historicalSignal,eventSignal,journeyShapeSignal,stationScaleSignal,schoolHolidaySignal,offPeakSignal,cancellationKnockOn,formationBaseline,calibratedDemandSignal,serviceClassSignal,calibration,easterSunday,removeLegacyFeedback,STATION_TIER,MAX_EVENT_PRESSURE};",
    "window.__KERBSIDE_FORECAST_V3__={version:VERSION,state,forecast,apply,detailMarkup,calendarSignal,liveSignal,historicalSignal,formationSignal,eventSignal,journeyShapeSignal,stationMatchesOrigin,profileKey,profileDestinationIdentity,stationScaleSignal,schoolHolidaySignal,offPeakSignal,cancellationKnockOn,formationBaseline,calibratedDemandSignal,serviceClassSignal,calibration,easterSunday,removeLegacyFeedback,STATION_TIER,MAX_EVENT_PRESSURE};"
)


# ---------------------------------------------------------------------------
# Events: scheduled arrival is a valid fallback, but a live expected arrival
# at the selected destination must win once Darwin calling points are present.
# ---------------------------------------------------------------------------
events = 'kerbside-train-events.js'
replace_between(
    events,
    "function serviceArrival(service,destinationCrs){\n",
    "\nfunction normalise(raw){",
    """function serviceArrival(service,destinationCrs){
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
"""
)


# ---------------------------------------------------------------------------
# Keep the browser regression's wording aligned with the new Forecast v3 UI.
# It still deliberately exercises the legacy v2 API separately.
# ---------------------------------------------------------------------------
browser_test = 'kerbside-backend/tests/train-regression.mjs'
replace_once(browser_test, "assert.match(await page.locator('.train-provider-note').textContent(),/crowding model v2/i);", "assert.match(await page.locator('.train-provider-note').textContent(),/Forecast v3/i);")
replace_once(browser_test, "assert.match(detailText,/Help calibrate this forecast/i);", "assert.match(detailText,/Record actual crowding/i);")


# ---------------------------------------------------------------------------
# Focused regression: exercise real v2 + v3 together so future timetable,
# same-day timetable and live-enriched scoring cannot silently diverge again.
# ---------------------------------------------------------------------------
test_path = ROOT / 'kerbside-backend/tests/train-forecast-v3-dual-timetable.mjs'
test_path.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const trainsSource=await fs.readFile(path.join(root,'kerbside-trains.js'),'utf8');
const forecastSource=await fs.readFile(path.join(root,'kerbside-train-forecast-v3.js'),'utf8');
const eventsSource=await fs.readFile(path.join(root,'kerbside-train-events.js'),'utf8');

class FixedDate extends Date{
  constructor(...args){super(...(args.length?args:['2026-08-12T08:00:00Z']));}
  static now(){return new Date('2026-08-12T08:00:00Z').getTime();}
}

function storage(){
  const data=new Map();
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
const documentStub={readyState:'loading',addEventListener(){},getElementById(){return null;},createElement(){return {innerHTML:'',textContent:''};}};

function loadPrediction({station={name:'Test Station',crs:'ZZZ'},model=null,overlayServices=[]}={}){
  const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_TRAIN_OVERLAY__:{state:{services:overlayServices}}};
  const context={window,document:documentStub,Date:FixedDate,Intl,console,localStorage:storage(),setTimeout,clearTimeout,setInterval,clearInterval,AbortController,Blob,Response,TextDecoder,DecompressionStream,requestAnimationFrame(){return 1;},MutationObserver:class{observe(){} disconnect(){}}};
  vm.createContext(context);
  vm.runInContext(trainsSource,context);
  context.window.__KERBSIDE_TRAINS__.state.station=station;
  context.window.__KERBSIDE_TRAINS__.state.crowdingModel=model;
  vm.runInContext(forecastSource,context);
  return {trains:context.window.__KERBSIDE_TRAINS__,v3:context.window.__KERBSIDE_FORECAST_V3__,station,context};
}

function loadEvents(){
  const window={addEventListener(){},dispatchEvent(){},__KERBSIDE_FORECAST_V3__:{apply(){}}};
  const context={window,document:documentStub,Date:FixedDate,Intl,console,localStorage:storage(),setTimeout,clearTimeout,AbortController,fetch:async()=>{throw new Error('network not expected');}};
  vm.createContext(context);
  vm.runInContext(eventsSource,context);
  return context.window.__KERBSIDE_EVENTS__;
}

function service(overrides={}){
  return {std:'10:00',etd:'',operator:'Test Rail',operatorCode:'ZZ',length:0,isCancelled:false,scheduledOnly:true,origin:[{locationName:'Earlier Town',crs:'AAA'}],destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],...overrides};
}

test('Forecast v3 and v2 share the same two-hour profile key and real-terminus identity',()=>{
  const station={name:'Birmingham New Street',crs:'BHM'};
  const key='bhm|xc|ply|weekday|5';
  const model={version:2,profiles:{[key]:{samples:5,lengthSamples:0,avgLength:0,headwaySamples:0,feedbackCount:0,updatedAt:FixedDate.now()}},seen:{},feedbackSeen:{}};
  const {trains,v3}=loadPrediction({station,model});
  const row=service({operatorCode:'XC',destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],displayDestination:{name:'Plymouth',crs:'PLY'}});
  assert.equal(v3.profileKey(row,station,new FixedDate('2026-08-12T12:00:00Z')),key);
  const base=trains.crowdingForecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z'),modelLayer:'v3-baseline',includeFeedback:false});
  assert.equal(base.historySamples,5);
  assert.equal(v3.historicalSignal(trains,row,new FixedDate('2026-08-12T12:00:00Z'),station).samples,5);
});

test('history increases evidence without increasing passenger-demand score by itself',()=>{
  const station={name:'Test Station',crs:'ZZZ'};
  const row=service({origin:[{locationName:'Test Station',crs:'ZZZ'}]});
  const empty=loadPrediction({station,model:{version:2,profiles:{},seen:{},feedbackSeen:{}}});
  const plain=empty.v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  const key='zzz|zz|bri|weekday|5';
  const model={version:2,profiles:{[key]:{samples:6,lengthSamples:0,avgLength:0,headwaySamples:0,feedbackCount:0,updatedAt:FixedDate.now()}},seen:{},feedbackSeen:{}};
  const learned=loadPrediction({station,model});
  const withHistory=learned.v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  assert.equal(withHistory.score,plain.score);
  assert.equal(learned.v3.historicalSignal(learned.trains,row,new FixedDate('2026-08-12T12:00:00Z'),station).amount,0);
});

test('passenger feedback stored in the legacy profile cannot leak into Forecast v3',()=>{
  const station={name:'Test Station',crs:'ZZZ'};
  const row=service({origin:[{locationName:'Test Station',crs:'ZZZ'}]});
  const none=loadPrediction({station,model:{version:2,profiles:{},seen:{},feedbackSeen:{}}});
  const expected=none.v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  const key='zzz|zz|bri|weekday|5';
  const model={version:2,profiles:{[key]:{samples:0,lengthSamples:0,avgLength:0,headwaySamples:0,feedbackCount:12,feedbackMean:4.45,updatedAt:FixedDate.now()}},seen:{},feedbackSeen:{}};
  const reported=loadPrediction({station,model});
  const actual=reported.v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  assert.equal(actual.score,expected.score);
  assert.ok(!actual.reasons.some(reason=>/feedback|reported crowding/i.test(reason)));
});

test('future timetable and same-day timetable retain the same static prediction',()=>{
  const station={name:'Test Station',crs:'ZZZ'};
  const {v3}=loadPrediction({station});
  const row=service();
  const today=v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  const future=v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-13T12:00:00Z')});
  assert.equal(future.score,today.score);
  assert.equal(future.label,today.label);
});

test('live delay, formation and route shape enrich the same row exactly once',()=>{
  const station={name:'Test Station',crs:'ZZZ'};
  const overlayServices=[{length:8},{length:8},{length:8}];
  const {trains,v3}=loadPrediction({station,overlayServices});
  const scheduled=service();
  const date=new FixedDate('2026-08-12T12:00:00Z');
  const before=v3.forecast(scheduled,0,[scheduled],{station,referenceDate:date});
  const live=service({etd:'10:20',length:4,liveEvidence:true,previousCallingPoints:[{callingPoint:[{crs:'AAA'},{crs:'AAB'},{crs:'AAC'},{crs:'AAD'},{crs:'AAE'},{crs:'AAF'}]}],subsequentCallingPoints:[{callingPoint:[{crs:'BRI'}]}]});
  const after=v3.forecast(live,0,[live],{station,referenceDate:date});
  const liveAmount=v3.liveSignal(live,0,[live]).amount;
  const formationAmount=v3.formationSignal(trains,live,[live],date,station).amount;
  const shapeDelta=v3.journeyShapeSignal(live,station).amount-v3.journeyShapeSignal(scheduled,station).amount;
  const expectedDelta=liveAmount+formationAmount+shapeDelta;
  assert.ok(Math.abs((after.score-before.score)-expectedDelta)<1e-9,{before,after,expectedDelta});
  assert.equal(after.reasons.filter(reason=>/delay/i.test(reason)).length,1);
  assert.equal(after.reasons.filter(reason=>/formation/i.test(reason)).length,1);
});

test('cancellation knock-on ignores an unrelated destination on the station board',()=>{
  const {v3}=loadPrediction();
  const current=service({std:'10:00'});
  const unrelated=service({std:'09:45',destination:[{crs:'CDF'}],isCancelled:true});
  const related=service({std:'09:45',destination:[{crs:'BRI'}],isCancelled:true});
  assert.equal(v3.cancellationKnockOn(current,1,[unrelated,current]).amount,0);
  assert.ok(v3.cancellationKnockOn(current,1,[related,current]).amount>0);
});

test('Friday and weekend demand are not added a second time by the v3 calendar layer',()=>{
  const {v3}=loadPrediction();
  const friday=v3.calendarSignal(new FixedDate('2026-08-14T12:00:00Z'),16*60);
  const saturday=v3.calendarSignal(new FixedDate('2026-08-15T12:00:00Z'),12*60);
  assert.equal(friday.amount,0);
  assert.equal(saturday.amount,0);
});

test('Forecast v3 explicitly requests the de-duplicated baseline',()=>{
  const station={name:'Test Station',crs:'ZZZ'};
  const {trains,v3}=loadPrediction({station});
  let seen=null;
  const real=trains.crowdingForecast;
  trains.crowdingForecast=(service,index,services,options)=>{seen=options;return real(service,index,services,options);};
  const row=service();
  v3.forecast(row,0,[row],{station,referenceDate:new FixedDate('2026-08-12T12:00:00Z')});
  assert.equal(seen.modelLayer,'v3-baseline');
  assert.equal(seen.includeFeedback,false);
});

test('scheduled destination arrival drives event pressure before live calling points exist',()=>{
  const events=loadEvents();
  const row={std:'13:00',arrival:'14:30'};
  assert.equal(events.serviceArrival(row,'BRI'),14*60+30);
  const match=events.relevance(
    {title:'Bristol event',place:'Bristol',start:16*60,end:18*60,attendance:30000,confidence:.9},
    row,
    {origin:'Birmingham New Street',destination:'Bristol Temple Meads',destinationCrs:'BRI'}
  );
  assert.ok(match&&match.nearDest,{match});
  assert.ok(match.amount>0);
});

test('live expected destination arrival overrides the scheduled timetable arrival',()=>{
  const events=loadEvents();
  const row={arrival:'14:30',subsequentCallingPoints:[{callingPoint:[{crs:'BRI',et:'15:10',st:'14:30'}]}]};
  assert.equal(events.serviceArrival(row,'BRI'),15*60+10);
});

test('midnight expected arrival remains a valid zero-minute value',()=>{
  const events=loadEvents();
  const row={subsequentCallingPoints:[{callingPoint:[{crs:'BRI',et:'00:00',st:'23:59'}]}]};
  assert.equal(events.serviceArrival(row,'BRI'),0);
});
''', encoding='utf-8')


# Release/cache version.
write('VERSION', '0.7.40\n')
bus = read('bus.html')
if '?v=0.7.39' not in bus:
    raise SystemExit('bus.html: expected 0.7.39 cache-busters were not found')
write('bus.html', bus.replace('?v=0.7.39', '?v=0.7.40'))
