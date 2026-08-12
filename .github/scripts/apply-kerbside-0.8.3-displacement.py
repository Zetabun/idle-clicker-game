#!/usr/bin/env python3
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path,text):
    Path(path).write_text(text,encoding='utf-8')


def replace_once(path,old,new):
    text=read(path);count=text.count(old)
    if count!=1:raise SystemExit(f'{path}: expected one match, found {count}: {old[:150]!r}')
    write(path,text.replace(old,new,1))

forecast='kerbside-train-forecast-v3.js'
replace_once(
    forecast,
    """function eventSignal(service,date,context={}){const provider=window.__KERBSIDE_EVENTS__;
if(provider&&provider.state&&provider.state.date&&provider.state.date!==stamp(date))return {amount:0,reasons:[]};if(!provider||typeof provider.pressureForJourney!=='function')return {amount:0,reasons:[]};try{const result=provider.pressureForJourney(service,context&&context.eventJourney||undefined)||{};const amount=clamp(Number(result.amount)||0,0,MAX_EVENT_PRESSURE);return {amount,reasons:amount>=.16?unique(result.reasons||[]):[]};}catch(error){return {amount:0,reasons:[]};}}
""",
    """function eventSignal(service,date,context={}){const provider=window.__KERBSIDE_EVENTS__;
if(provider&&provider.state&&provider.state.date&&provider.state.date!==stamp(date))return {amount:0,reasons:[]};if(!provider||typeof provider.pressureForJourney!=='function')return {amount:0,reasons:[]};try{const result=provider.pressureForJourney(service,context&&context.eventJourney||undefined)||{};const amount=clamp(Number(result.amount)||0,0,MAX_EVENT_PRESSURE);return {amount,reasons:amount>=.16?unique(result.reasons||[]):[]};}catch(error){return {amount:0,reasons:[]};}}
/* A missed connection moves demand rather than creating it. The original
   onward service is not inflated when the traveller may miss it; instead the
   first viable recovery train receives a bounded pressure signal because the
   same displaced passengers are likely to roll onto that service. */
function connectionDisplacementSignal(context={}){
  const raw=Number(context&&context.connectionDisplacement)||0,amount=clamp(raw,0,.8);
  if(amount<.1)return {amount:0,reasons:[]};
  return {amount,reasons:[amount>=.65?'cancelled or missed-connection passengers may roll onto this backup train':'missed-connection passengers may roll onto this backup train']};
}
"""
)
replace_once(
    forecast,
    '  const events=eventSignal(service,date,context);\n  const live=future?{amount:0,reasons:[]}:liveSignal(service,index,services);',
    '  const events=eventSignal(service,date,context);\n  const displacement=connectionDisplacementSignal(context);\n  const live=future?{amount:0,reasons:[]}:liveSignal(service,index,services);'
)
replace_once(
    forecast,
    '  score=clamp(score+calendar.amount+events.amount+live.amount+formation.amount+shape.amount+scale.amount+school.amount+offpeak.amount+shapeCal.amount+serviceClass.amount,.25,5);',
    '  score=clamp(score+calendar.amount+events.amount+displacement.amount+live.amount+formation.amount+shape.amount+scale.amount+school.amount+offpeak.amount+shapeCal.amount+serviceClass.amount,.25,5);'
)
replace_once(
    forecast,
    '    ...shape.reasons,...events.reasons,...live.reasons,...formation.reasons,',
    '    ...shape.reasons,...events.reasons,...displacement.reasons,...live.reasons,...formation.reasons,'
)
replace_once(
    forecast,
    "const evidence=2+historyEvidence+(calendar.reasons.length?1:0)+(events.reasons.length?1:0)+(live.reasons.length?2:0)+(formation.reasons.length?1:0)+(shape.evidence?1:0)+(school.reasons.length?.5:0)+(calibrated?1:0)+(serviceClass.reasons.length?.5:0);",
    "const evidence=2+historyEvidence+(calendar.reasons.length?1:0)+(events.reasons.length?1:0)+(displacement.reasons.length?1:0)+(live.reasons.length?2:0)+(formation.reasons.length?1:0)+(shape.evidence?1:0)+(school.reasons.length?.5:0)+(calibrated?1:0)+(serviceClass.reasons.length?.5:0);"
)
replace_once(
    forecast,
    'window.__KERBSIDE_FORECAST_V3__={version:VERSION,state,forecast,apply,detailMarkup,calendarSignal,liveSignal,historicalSignal,formationSignal,eventSignal,journeyShapeSignal,stationMatchesOrigin,profileKey,profileDestinationIdentity,stationScaleSignal,schoolHolidaySignal,offPeakSignal,cancellationKnockOn,formationBaseline,calibratedDemandSignal,serviceClassSignal,calibration,scoreThresholds,easterSunday,removeLegacyFeedback,STATION_TIER,MAX_EVENT_PRESSURE};',
    'window.__KERBSIDE_FORECAST_V3__={version:VERSION,state,forecast,apply,detailMarkup,calendarSignal,liveSignal,historicalSignal,formationSignal,eventSignal,connectionDisplacementSignal,journeyShapeSignal,stationMatchesOrigin,profileKey,profileDestinationIdentity,stationScaleSignal,schoolHolidaySignal,offPeakSignal,cancellationKnockOn,formationBaseline,calibratedDemandSignal,serviceClassSignal,calibration,scoreThresholds,easterSunday,removeLegacyFeedback,STATION_TIER,MAX_EVENT_PRESSURE};'
)

tt='kerbside-train-timetable.js'
replace_once(
    tt,
    "  return option?connectionLegForecast(service,option,1):null;",
    "  if(!option)return null;\n  const displacement=service.connectionRisk==='onward-cancelled'?.7:service.connectionRisk==='at-risk'?.45:0;\n  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,r=route(),change=service.interchange&&service.interchange.crs||'',to=r.to&&r.to.crs||'',board=overlay&&typeof overlay.onwardServices==='function'?overlay.onwardServices(change,to):[],context=forecastBoardContext(option,board,service.legs||[option]);\n  return forecastOne(option,context.index,context.services,option.from||service.interchange,[],{eventJourney:legEventJourney(option),connectionRole:'recovery-leg',connectionDisplacement:displacement});"
)

test='kerbside-backend/tests/train-forecast-v3-dual-timetable.mjs'
text=read(test)
if 'connection displacement raises only the recovery-train context' in text:raise SystemExit('displacement regression already present')
write(test,text+r'''

test('connection displacement raises only the recovery-train context',()=>{
  const station={name:'Cheltenham Spa',crs:'CNM'},loaded=loadPrediction({station});
  const row=service({std:'11:20',origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}]});
  const date=new FixedDate('2026-08-12T12:00:00Z');
  const plain=loaded.v3.forecast(row,0,[row],{station,referenceDate:date});
  const displaced=loaded.v3.forecast(row,0,[row],{station,referenceDate:date,connectionDisplacement:.45});
  assert.ok(displaced.score>plain.score,{plain,displaced});
  assert.ok(displaced.reasons.some(reason=>/missed-connection passengers/i.test(reason)));
  assert.equal(loaded.v3.connectionDisplacementSignal({connectionDisplacement:0}).amount,0);
});
''')

browser='kerbside-backend/tests/train-browser-core-regression.mjs'
replace_once(
    browser,
    "  assert.match(await recoveryForecast.textContent(),/(Quiet|Moderate|Busy|Very busy)/);",
    "  assert.match(await recoveryForecast.textContent(),/(Quiet|Moderate|Busy|Very busy)/);\n  assert.match(await recoveryForecast.getAttribute('title'),/missed-connection passengers/i);"
)

print('Applied Kerbside 0.8.3 missed-connection displacement pressure.')
