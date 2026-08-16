#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys


def replace_once(path, old, new):
    target=Path(path)
    text=target.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected one release anchor, found {count}')
    target.write_text(text.replace(old,new,1),encoding='utf-8')

core='kerbside-journey-planner-core.js'
test='kerbside-backend/tests/train-journey-planner-regression.mjs'

old_result="""function planCrowdClass(level){return ['quiet','moderate','busy','very-busy'].includes(level)?level:'unknown';}
function planResultMarkup(row,index,all){
  const forecast=row.forecast&&row.forecast.primary||{},level=planCrowdClass(forecast.level),changeText=Number(row.changes||0)===0?'Direct':`1 change at ${esc(row.interchange&&row.interchange.name||row.interchange&&row.interchange.crs||'interchange')}`,confidence=forecast.confidence?`${forecast.confidence} confidence`:'Forecast v4';
  const reasons=(forecast.reasons||[]).slice(0,2).map(reason=>`<li>${esc(reason)}</li>`).join('');
  return `<article class=\"plan-journey-result${index===0?' best':''}\" data-plan-rank=\"${index+1}\">
    <div class=\"plan-result-rank\"><span>${index===0?'Best match':`#${index+1}`}</span><b>${esc(row.std||row.departure||'')} → ${esc(row.arrival||'')}</b></div>
    <div class=\"plan-result-route\"><strong>${esc(row.operator||'Scheduled services')}</strong><span>${changeText} · ${esc(planDuration(row.totalMinutes))}</span></div>
    <div class=\"plan-result-crowd crowd-${level}\"><i></i><strong>${esc(forecast.label||'Forecast unavailable')}</strong><span>${esc(confidence)}</span></div>
    <p class=\"plan-result-tradeoff\">${esc(planTradeoff(row,all,index))}</p>
    ${reasons?`<ul class=\"plan-result-reasons\">${reasons}</ul>`:''}
  </article>`;
}
"""
new_result="""function planCrowdClass(level){return ['quiet','moderate','busy','very-busy'].includes(level)?level:'unknown';}
function planPointName(point,fallback=''){return String(point&&(?:point.name||point.locationName||point.stationName||point.crs)||fallback||'').trim();}
function planPlatformText(leg){const depart=String(leg&&leg.platform||'').trim(),arrive=String(leg&&leg.arrivalPlatform||'').trim();if(depart&&arrive)return `Scheduled platforms ${depart} → ${arrive}`;if(depart)return `Scheduled departure platform ${depart}`;if(arrive)return `Scheduled arrival platform ${arrive}`;return'';}
function planLegDetailMarkup(leg,index,forecast,row){
  const first=index===0,from=planPointName(leg&&leg.from,first?planState.from&&planState.from.name:''),to=planPointName(leg&&(?:leg.to||leg.routeDestination),!first&&row&&row.interchange?row.interchange.name:planState.to&&planState.to.name),depart=String(leg&&(?:leg.std||leg.departure)||''),arrive=String(leg&&leg.arrival||''),operator=String(leg&&leg.operator||row&&row.operator||'Scheduled service'),platforms=planPlatformText(leg),forecastLabel=String(forecast&&forecast.label||'');
  const meta=[operator,platforms,forecastLabel?`Forecast v4: ${forecastLabel}`:''].filter(Boolean).join(' · ');
  return `<div class=\"plan-detail-leg\"><span>Leg ${index+1}</span><strong>${esc(depart)} ${esc(from||'Departure')} → ${esc(arrive)} ${esc(to||'Arrival')}</strong>${meta?`<small>${esc(meta)}</small>`:''}</div>`;
}
function planConnectionSourceLabel(row){if(String(row&&row.minimumConnectionSource||'')==='licensed'){const authority=String(row&&row.minimumConnectionAuthority||'').trim();return authority?`Licensed station minimum · ${authority}`:'Licensed station minimum';}return'Kerbside planning buffer';}
function planRecoveryDetailMarkup(row){
  const options=Array.isArray(row&&row.recoveryOptions)?row.recoveryOptions:[];if(!options.length)return'';
  const next=options[0]||{},count=options.length,depart=String(next.std||next.departure||''),arrive=String(next.arrival||''),operator=String(next.operator||'Scheduled service');
  return `<div class=\"plan-detail-recovery\"><strong>Later timetable option${count===1?'':'s'} identified</strong><span>Next: ${esc(depart)} → ${esc(arrive)} · ${esc(operator)}${count>1?` · ${count} options found`:''}</span><small>Ticket validity for an alternative service depends on your ticket; Kerbside does not assess that here.</small></div>`;
}
function planJourneyDetailsMarkup(row){
  const isConnection=Number(row&&row.changes||0)>0&&Array.isArray(row&&row.legs)&&row.legs.length>1,legs=isConnection?row.legs:[row],forecasts=Array.isArray(row&&row.forecast&&row.forecast.legs)?row.forecast.legs:[];
  const legMarkup=legs.map((leg,index)=>planLegDetailMarkup(leg,index,forecasts[index]||row&&row.forecast&&row.forecast.primary,row)).join('');
  let changeMarkup='';
  if(isConnection){const interchange=row.interchange||{},name=String(interchange.name||interchange.locationName||interchange.crs||'Interchange'),minutes=Number(row.connectionMinutes),minimum=Number(row.minimumConnectionMinutes),margin=Number(interchange.margin),parts=[];if(Number.isFinite(minimum))parts.push(`Base minimum ${Math.round(minimum)} min`);if(Number.isFinite(margin))parts.push(`${Math.max(0,Math.round(margin))} min margin`);parts.push(planConnectionSourceLabel(row));changeMarkup=`<div class=\"plan-detail-change\"><strong>Change at ${esc(name)}${Number.isFinite(minutes)?` · ${Math.round(minutes)} min`:''}</strong><span>${esc(parts.filter(Boolean).join(' · '))}</span></div>`;}
  return `<details class=\"plan-result-details\"><summary>Journey details</summary><div class=\"plan-details-body\">${legMarkup}${changeMarkup}${planRecoveryDetailMarkup(row)}</div></details>`;
}
function planResultMarkup(row,index,all){
  const forecast=row.forecast&&row.forecast.primary||{},level=planCrowdClass(forecast.level),changeText=Number(row.changes||0)===0?'Direct':`1 change at ${esc(row.interchange&&row.interchange.name||row.interchange&&row.interchange.crs||'interchange')}`,confidence=forecast.confidence?`${forecast.confidence} confidence`:'Forecast v4';
  const reasons=(forecast.reasons||[]).slice(0,2).map(reason=>`<li>${esc(reason)}</li>`).join('');
  return `<article class=\"plan-journey-result${index===0?' best':''}\" data-plan-rank=\"${index+1}\">
    <div class=\"plan-result-rank\"><span>${index===0?'Best match':`#${index+1}`}</span><b>${esc(row.std||row.departure||'')} → ${esc(row.arrival||'')}</b></div>
    <div class=\"plan-result-route\"><strong>${esc(row.operator||'Scheduled services')}</strong><span>${changeText} · ${esc(planDuration(row.totalMinutes))}</span></div>
    <div class=\"plan-result-crowd crowd-${level}\"><i></i><strong>${esc(forecast.label||'Forecast unavailable')}</strong><span>${esc(confidence)}</span></div>
    <p class=\"plan-result-tradeoff\">${esc(planTradeoff(row,all,index))}</p>
    ${reasons?`<ul class=\"plan-result-reasons\">${reasons}</ul>`:''}
    ${planJourneyDetailsMarkup(row)}
  </article>`;
}
"""
# Python's parser cannot use JS optional-style expression syntax in text construction;
# the replacement above is plain text, so correct the two deliberately compact JS
# expressions before writing it.
new_result=new_result.replace("point&&(?:point.name||point.locationName||point.stationName||point.crs)","point&&(point.name||point.locationName||point.stationName||point.crs)")
new_result=new_result.replace("leg&&(?:leg.to||leg.routeDestination)","leg&&(leg.to||leg.routeDestination)")
new_result=new_result.replace("leg&&(?:leg.std||leg.departure)","leg&&(leg.std||leg.departure)")
replace_once(core,old_result,new_result)

replace_once(core,
".plan-result-tradeoff{grid-column:1/-1;margin:0;color:var(--text-dim);font-size:11px;line-height:1.45}.plan-result-reasons{grid-column:1/-1;display:grid;gap:3px;margin:0;padding-left:17px;color:var(--text-mute);font-size:10px;line-height:1.4}.plan-result-reasons li::marker{color:var(--led)}",
".plan-result-tradeoff{grid-column:1/-1;margin:0;color:var(--text-dim);font-size:11px;line-height:1.45}.plan-result-reasons{grid-column:1/-1;display:grid;gap:3px;margin:0;padding-left:17px;color:var(--text-mute);font-size:10px;line-height:1.4}.plan-result-reasons li::marker{color:var(--led)}\n.plan-result-details{grid-column:1/-1;border-top:1px solid var(--rule);padding-top:9px}.plan-result-details summary{width:max-content;max-width:100%;cursor:pointer;color:var(--led);font-size:10px;font-weight:800;letter-spacing:.03em}.plan-result-details summary:focus-visible{outline:2px solid var(--led);outline-offset:3px;border-radius:3px}.plan-details-body{display:grid;gap:8px;margin-top:10px}.plan-detail-leg,.plan-detail-change,.plan-detail-recovery{display:grid;gap:3px;padding:9px 10px;border:1px solid var(--rule);border-radius:9px;background:var(--ink)}.plan-detail-leg>span{color:var(--led);font-size:8.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.plan-detail-leg strong,.plan-detail-change strong,.plan-detail-recovery strong{font-size:10.5px;line-height:1.4}.plan-detail-leg small,.plan-detail-change span,.plan-detail-recovery span,.plan-detail-recovery small{color:var(--text-dim);font-size:9.5px;line-height:1.45}.plan-detail-recovery small{color:var(--text-mute)}")

old_rows="""        {serviceID:'PLAN-FAST',std:'09:00',arrival:'10:00',departureMinute:540,arrivalMinute:600,totalMinutes:60,changes:0,journeyType:'direct',operator:'Fast Rail'},
        {serviceID:'PLAN-CHANGE',std:'09:05',arrival:'10:12',departureMinute:545,arrivalMinute:612,totalMinutes:67,changes:1,journeyType:'connection',operator:'Change Rail',connectionMinutes:10,minimumConnectionMinutes:7,recoveryOptions:[],interchange:{crs:'CNM',name:'Cheltenham Spa',margin:3},legs:[{serviceID:'PLAN-CHANGE-A',std:'09:05',arrival:'09:35',operator:'Change Rail'},{serviceID:'PLAN-CHANGE-B',std:'09:45',arrival:'10:12',operator:'Change Rail'}]},
        {serviceID:'PLAN-QUIET',std:'09:10',arrival:'10:15',departureMinute:550,arrivalMinute:615,totalMinutes:65,changes:0,journeyType:'direct',operator:'Quiet Rail'}
"""
new_rows="""        {serviceID:'PLAN-FAST',std:'09:00',arrival:'10:00',departureMinute:540,arrivalMinute:600,totalMinutes:60,changes:0,journeyType:'direct',operator:'Fast Rail',platform:'4',arrivalPlatform:'9',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}},
        {serviceID:'PLAN-CHANGE',std:'09:05',arrival:'10:12',departureMinute:545,arrivalMinute:612,totalMinutes:67,changes:1,journeyType:'connection',operator:'Change Rail',connectionMinutes:10,minimumConnectionMinutes:7,minimumConnectionSource:'kerbside-planning-buffer',recoveryOptions:[{serviceID:'PLAN-RECOVERY',std:'09:55',arrival:'10:25',operator:'Recovery Rail',platform:'4',arrivalPlatform:'8',from:{name:'Cheltenham Spa',crs:'CNM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}],interchange:{crs:'CNM',name:'Cheltenham Spa',margin:3},legs:[{serviceID:'PLAN-CHANGE-A',std:'09:05',arrival:'09:35',operator:'Change Rail',platform:'5',arrivalPlatform:'1',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Cheltenham Spa',crs:'CNM'}},{serviceID:'PLAN-CHANGE-B',std:'09:45',arrival:'10:12',operator:'Change Rail',platform:'3',arrivalPlatform:'8',from:{name:'Cheltenham Spa',crs:'CNM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}]},
        {serviceID:'PLAN-QUIET',std:'09:10',arrival:'10:15',departureMinute:550,arrivalMinute:615,totalMinutes:65,changes:0,journeyType:'direct',operator:'Quiet Rail',platform:'6',arrivalPlatform:'10',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}
"""
replace_once(test,old_rows,new_rows)

replace_once(test,
"  assert.equal(await page.locator('#planJourneyConnectionBuffer').inputValue(),'0');\n  const pureConstraints=await page.evaluate(()=>{const planner=window.__KERBSIDE_JOURNEY_PLANNER__;return {defaults:planner.normalisePlanConstraints(null),direct:planner.planCandidateMeetsConstraints({changes:0},{maxChanges:0,connectionBuffer:15}),bufferPass:planner.planCandidateMeetsConstraints({changes:1,connectionMinutes:12,minimumConnectionMinutes:7},{maxChanges:1,connectionBuffer:5}),bufferFail:planner.planCandidateMeetsConstraints({changes:1,connectionMinutes:11,minimumConnectionMinutes:7},{maxChanges:1,connectionBuffer:5})};});",
"  assert.equal(await page.locator('#planJourneyConnectionBuffer').inputValue(),'0');\n  const changeCard=page.locator('#planJourneyResults .plan-journey-result').filter({hasText:'Change Rail'});\n  const journeyDetails=changeCard.locator('.plan-result-details');\n  assert.equal(await journeyDetails.count(),1,'connection option should expose journey details');\n  assert.equal(await journeyDetails.evaluate(node=>node.open),false,'journey details should start collapsed');\n  await journeyDetails.locator('summary').click();\n  assert.equal(await journeyDetails.evaluate(node=>node.open),true,'journey details should expand');\n  const journeyDetailText=await journeyDetails.textContent();\n  assert.match(journeyDetailText,/09:05 Birmingham New Street → 09:35 Cheltenham Spa/);\n  assert.match(journeyDetailText,/09:45 Cheltenham Spa → 10:12 Bristol Temple Meads/);\n  assert.match(journeyDetailText,/Scheduled platforms 5 → 1/);\n  assert.match(journeyDetailText,/Change at Cheltenham Spa · 10 min/);\n  assert.match(journeyDetailText,/Base minimum 7 min/);\n  assert.match(journeyDetailText,/3 min margin/);\n  assert.match(journeyDetailText,/Kerbside planning buffer/);\n  assert.match(journeyDetailText,/Next: 09:55 → 10:25 · Recovery Rail/);\n  assert.match(journeyDetailText,/Ticket validity for an alternative service depends on your ticket/);\n  const pureConstraints=await page.evaluate(()=>{const planner=window.__KERBSIDE_JOURNEY_PLANNER__;return {defaults:planner.normalisePlanConstraints(null),direct:planner.planCandidateMeetsConstraints({changes:0},{maxChanges:0,connectionBuffer:15}),bufferPass:planner.planCandidateMeetsConstraints({changes:1,connectionMinutes:12,minimumConnectionMinutes:7},{maxChanges:1,connectionBuffer:5}),bufferFail:planner.planCandidateMeetsConstraints({changes:1,connectionMinutes:11,minimumConnectionMinutes:7},{maxChanges:1,connectionBuffer:5})};});")

Path('VERSION').write_text('0.9.21\n',encoding='utf-8')
subprocess.run([sys.executable,'.github/scripts/sync-version.py'],check=True)
print('Staged Kerbside 0.9.21 Plan My Journey details.')
