#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import sys


def sub_once(path, pattern, replacement, *, flags=0):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    updated, count = re.subn(pattern, lambda _m: replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one replacement, found {count}')
    target.write_text(updated, encoding='utf-8')


def replace_once(path, old, new):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one literal replacement, found {count}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


# DfT RAI0202/RAI0203 already give Kerbside a measured passenger/seat ratio
# for each supported station/city time band. Use that once: demandShape keeps
# the measured *shape* of demand through the day, while the load factor becomes
# the ordinal probability prior below. This prevents one aggregate load figure
# from pushing both the score and the class prior in the same direction.
sub_once(
    'kerbside-rail-calibration.js',
    r"  if\(measured&&Number\.isFinite\(measured\.share\)\)\{\n.*?    return \{amount,reasons,measured\};\n  \}\n  /\* Suppressed/missing cells",
    """  if(measured&&Number.isFinite(measured.share)){
    const ratio=measured.flatShare>0?measured.share/measured.flatShare:1;
    const shapeAmount=clamp(Math.log2(Math.max(.25,ratio))*.22,-.35,.45);
    const amount=shapeAmount,reasons=[];
    const where=measured.scope==='station'?measured.name:(profile.city||profile.name);
    if(Math.abs(shapeAmount)>=.04)reasons.push(`DfT 2025 measured ${where} departures are ${ratio>=1?'above':'below'} its all-day time-normalised average in this band`);
    return {amount,reasons,measured};
  }
  /* Suppressed/missing cells""",
    flags=re.S,
)

# Convert the measured load factor into a soft four-band prior without inventing
# new thresholds. The four centres are derived directly from the existing DfT
# interpretation boundaries, and probability is linearly shared between the
# two nearest centres. Peak-only RAI0216 priors remain as a fallback where the
# station/city time-band tables have no usable seat figure.
sub_once(
    'kerbside-rail-calibration.js',
    r"function utilisationPrior\(service,station,minute,date,isBankHoliday=false\)\{\n.*?\n\}\n\nwindow\.__KERBSIDE_CALIBRATION__",
    """function loadFactorPrior(loadFactor){
  const value=Number(loadFactor);if(!Number.isFinite(value)||value<0)return null;
  const centres=[
    LOAD_FACTOR_BANDS.moderate/2,
    (LOAD_FACTOR_BANDS.moderate+LOAD_FACTOR_BANDS.busy)/2,
    (LOAD_FACTOR_BANDS.busy+LOAD_FACTOR_BANDS.veryBusy)/2,
    LOAD_FACTOR_BANDS.veryBusy+(LOAD_FACTOR_BANDS.veryBusy-LOAD_FACTOR_BANDS.busy)/2
  ];
  const probabilities=[0,0,0,0];
  if(value<=centres[0]){probabilities[0]=1;return probabilities;}
  for(let i=0;i<centres.length-1;i++){
    if(value<=centres[i+1]){
      const span=centres[i+1]-centres[i],share=span>0?clamp((value-centres[i])/span,0,1):0;
      probabilities[i]=1-share;probabilities[i+1]=share;return probabilities;
    }
  }
  probabilities[3]=1;return probabilities;
}
function utilisationPrior(service,station,minute,date,isBankHoliday=false){
  if(!isDftReferenceDay(date,isBankHoliday))return null;
  const measured=measuredBand(station,minute,'departures'),measuredProbabilities=measured&&loadFactorPrior(measured.loadFactor);
  if(measuredProbabilities){
    return {group:'timeBand',probabilities:measuredProbabilities,mean:Number(measured.loadFactor),loadFactor:Number(measured.loadFactor),band:measured.label,scope:measured.scope,source:'DfT RAI0202/RAI0203 2025 measured time-band seat utilisation',aggregateOnly:true};
  }
  const data=v4Data(),u=data&&data.utilisation;if(!u||!u.priors||!peakDirection(minute))return null;
  const code=String(service&&(service.operatorCode||'')).toUpperCase(),name=String(service&&(service.operator||'')).toLowerCase(),profile=profileFor(station),usage=stationUsageRecord(station);
  const longDistance=['XC','VT','GR'].includes(code)||/crosscountry|avanti|lner|london north eastern/.test(name),group=longDistance?'longDistance':(profile&&profile.area==='london')||(usage&&String(usage.region).toLowerCase()==='london')?'london':'regional';
  const probabilities=u.priors[group]||u.priors.all,mean=u.means&&u.means[group];return {group,probabilities:Array.isArray(probabilities)?probabilities.slice():null,mean:Number(mean),source:'DfT RAI0216 2025 empirical peak utilisation'};
}

window.__KERBSIDE_CALIBRATION__""",
    flags=re.S,
)
replace_once(
    'kerbside-rail-calibration.js',
    'stationUsageRecord,stationUsageSignal,routeFlowSignal,routeLoadSignal,orrOdmDataset,odmFlow,flowShareToTargets,benchmarkForecast,operatorCrowdingSignal,peakCapacitySignal,utilisationPrior,',
    'stationUsageRecord,stationUsageSignal,routeFlowSignal,routeLoadSignal,orrOdmDataset,odmFlow,flowShareToTargets,benchmarkForecast,operatorCrowdingSignal,peakCapacitySignal,loadFactorPrior,utilisationPrior,',
)

# School-holiday dates are useful context, but Kerbside has no measured dataset
# proving a blanket +0.3 leisure uplift to every off-peak train. Keep the
# directional weekday-peak reduction and otherwise stay neutral; measured time
# bands, events, route flow and live evidence can still move an individual train.
sub_once(
    'kerbside-train-forecast-v4.js',
    r"function schoolHolidaySignal\(date,minute\)\{\n.*?\n\}\n\n/\* The first off-peak departure\.",
    """function schoolHolidaySignal(date,minute){
  const value=stamp(date);
  const year=Number(value.slice(0,4)),month=Number(value.slice(5,7)),dom=Number(value.slice(8,10));
  const utc=Date.UTC(year,month-1,dom);
  let holiday='';
  if(month===12&&dom>=20)holiday='Christmas holidays';
  else if(month===1&&dom<=2)holiday='Christmas holidays';
  else if((month===7&&dom>=23)||month===8||(month===9&&dom<=1))holiday='summer holidays';
  else if(month===2&&dom>=11&&dom<=19)holiday='February half-term';
  else if(month===5&&dom>=24&&dom<=31)holiday='May half-term';
  else if(month===10&&dom>=23&&dom<=31)holiday='October half-term';
  else{
    const gap=daysBetween(utc,easterSunday(year).getTime());
    if(gap>=-14&&gap<=10)holiday='Easter holidays';
  }
  if(!holiday)return {amount:0,reasons:[]};
  const weekday=day(date)!=='Sat'&&day(date)!=='Sun';
  const peak=minute!=null&&weekday&&((minute>=420&&minute<540)||(minute>=990&&minute<1110));
  if(peak)return {amount:-.4,reasons:[`${holiday} reduce commuter and school demand`]};
  return {amount:0,reasons:[]};
}

/* The first off-peak departure.""",
    flags=re.S,
)

# With no empirical utilisation prior, do not start the ordinal model with a
# Moderate/Busy preference. A uniform prior lets the score/evidence decide.
replace_once(
    'kerbside-train-forecast-v4.js',
    "prior&&Array.isArray(prior.probabilities)?prior.probabilities:[.18,.34,.36,.12]",
    "prior&&Array.isArray(prior.probabilities)?prior.probabilities:[.25,.25,.25,.25]",
)

# Update the official-data regression: supported time bands should now be the
# utilisation prior at all times of day, and Birmingham's measured 21:00 band
# should lean Quiet because the source table has 2,995 passengers / 10,729 seats.
sub_once(
    'kerbside-backend/test/train-forecast-v4-official-data.test.mjs',
    r"test\('DfT 2025 operator and peak-capacity tables feed the measured signals',\(\)=>\{.*?\n\}\);\n\ntest\('Forecast v4 returns an empirical ordinal probability distribution'",
    """test('DfT 2025 operator, capacity and time-band utilisation feed measured signals',()=>{
  const c=load(),cal=c.window.__KERBSIDE_CALIBRATION__,station={name:'Birmingham New Street',crs:'BHM'},service={operator:'CrossCountry',operatorCode:'XC'},date=new FixedDate('2026-08-12T12:00:00Z');
  const operator=cal.operatorCrowdingSignal(service,station,8*60),capacity=cal.peakCapacitySignal(station,8*60),peakPrior=cal.utilisationPrior(service,station,8*60,date),middayPrior=cal.utilisationPrior(service,station,13*60,date),latePrior=cal.utilisationPrior(service,station,21*60,date);
  assert.equal(operator.measured,true,operator);assert.ok(operator.reasons.some(r=>/DfT 2025 measured/.test(r)),operator);
  assert.equal(capacity.measured,true,capacity);assert.equal(peakPrior.group,'timeBand');assert.match(peakPrior.source,/RAI0202\/RAI0203/);assert.ok(Math.abs(peakPrior.probabilities.reduce((a,b)=>a+b,0)-1)<1e-5);
  assert.equal(middayPrior.group,'timeBand');assert.equal(latePrior.band,'21:00-21:59');assert.ok(Math.abs(latePrior.loadFactor-(2995/10729))<1e-12,latePrior);assert.ok(latePrior.probabilities[0]>latePrior.probabilities[1],latePrior);
});

test('Forecast v4 returns an empirical ordinal probability distribution'""",
    flags=re.S,
)

# Protect against future reintroduction of an unsourced holiday uplift or a
# hidden Moderate/Busy fallback prior.
temporal = Path('kerbside-backend/test/train-forecast-v4-temporal.test.mjs')
temporal_text = temporal.read_text(encoding='utf-8')
temporal_text += """

test('summer holidays stay neutral off peak and unmeasured probability fallback is neutral',()=>{
  const c=load(),v4=c.window.__KERBSIDE_FORECAST_V4__,date=new FixedDate('2026-08-14T12:00:00Z');
  assert.equal(v4.schoolHolidaySignal(date,13*60).amount,0);
  assert.equal(v4.schoolHolidaySignal(date,21*60).amount,0);
  const unmeasured={name:'Fixture station',crs:'ZZZ'},fixture={...service,std:'21:00',operator:'Fixture Rail',operatorCode:'ZZ'};
  const model=v4.ordinalProbabilities(2.625,fixture,unmeasured,4,date,21*60,false);
  assert.equal(model.prior,null);assert.ok(Math.abs(model.probabilities[1]-model.probabilities[2])<1e-12,model.probabilities);
});
"""
temporal.write_text(temporal_text, encoding='utf-8')

# The time-band demand-shape score must no longer contain the same load-factor
# capacity adjustment that is now used by the probability prior.
timebands_test = Path('kerbside-backend/test/train-dft-timebands.test.mjs')
timebands_text = timebands_test.read_text(encoding='utf-8')
timebands_text += """

test('measured load factor is not double-counted inside the demand-shape score',()=>{
  const {cal}=load(),date=new Date('2026-08-12T12:00:00Z'),station={crs:'BHM'},measured=cal.measuredBand(station,21*60),shape=cal.demandShape(station,21*60,date);
  const ratio=measured.share/measured.flatShare,expected=Math.max(-.35,Math.min(.45,Math.log2(Math.max(.25,ratio))*.22));
  assert.ok(Math.abs(shape.amount-expected)<1e-12,{shape,measured,expected});
});
"""
timebands_test.write_text(timebands_text, encoding='utf-8')

Path('VERSION').write_text('0.9.13\n', encoding='utf-8')
replace_once('kerbside-status.js', "const VERSION='0.9.12';", "const VERSION='0.9.13';")
subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
print('Prepared Kerbside 0.9.13 crowding-calibration release.')
