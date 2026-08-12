#!/usr/bin/env python3
from pathlib import Path

def read(p): return Path(p).read_text(encoding='utf-8')
def write(p,t): Path(p).write_text(t,encoding='utf-8')
def once(p,old,new):
    t=read(p); n=t.count(old)
    if n!=1: raise SystemExit(f'{p}: expected one match, found {n}: {old[:160]!r}')
    write(p,t.replace(old,new,1))

# The main patch adds new measured signals before the existing calibration-note
# section. Keep their local calibration reference distinct from the later one.
p='kerbside-train-forecast-v4.js'
once(p,
"""  const cal=calibration(),destination=destinationForModel(service,context);
  const routeFlow=cal&&typeof cal.routeFlowSignal==='function'?cal.routeFlowSignal(station,destination):{amount:0,reasons:[],measured:false};
  const operatorCrowding=cal&&typeof cal.operatorCrowdingSignal==='function'?cal.operatorCrowdingSignal(service,station,minute):{amount:0,reasons:[],measured:false};
  const peakCapacity=cal&&typeof cal.peakCapacitySignal==='function'?cal.peakCapacitySignal(station,minute):{amount:0,reasons:[],measured:false};
""",
"""  const calV4=calibration(),destination=destinationForModel(service,context);
  const routeFlow=calV4&&typeof calV4.routeFlowSignal==='function'?calV4.routeFlowSignal(station,destination):{amount:0,reasons:[],measured:false};
  const operatorCrowding=calV4&&typeof calV4.operatorCrowdingSignal==='function'?calV4.operatorCrowdingSignal(service,station,minute):{amount:0,reasons:[],measured:false};
  const peakCapacity=calV4&&typeof calV4.peakCapacitySignal==='function'?calV4.peakCapacitySignal(station,minute):{amount:0,reasons:[],measured:false};
""")

# RAI0216 is explicitly a weekday PEAK utilisation distribution. Do not treat
# it as an all-day prior. The measured time-band and all-day model continue to
# handle non-peak trains.
cal='kerbside-rail-calibration.js'
once(cal,
"""function utilisationPrior(service,station){
  const data=v4Data(),u=data&&data.utilisation;if(!u||!u.priors)return null;const code=String(service&&(service.operatorCode||'')).toUpperCase(),name=String(service&&(service.operator||'')).toLowerCase(),profile=profileFor(station),usage=stationUsageRecord(station);
""",
"""function utilisationPrior(service,station,minute,date){
  const data=v4Data(),u=data&&data.utilisation;if(!u||!u.priors||!isWeekday(date)||!peakDirection(minute))return null;const code=String(service&&(service.operatorCode||'')).toUpperCase(),name=String(service&&(service.operator||'')).toLowerCase(),profile=profileFor(station),usage=stationUsageRecord(station);
""")

once(p,
"""function ordinalProbabilities(score,service,station,evidence){
  const cal=calibration(),prior=cal&&typeof cal.utilisationPrior==='function'?cal.utilisationPrior(service,station):null,base=prior&&Array.isArray(prior.probabilities)?prior.probabilities:[.18,.34,.36,.12],temperature=clamp(1.22-Math.min(8,Number(evidence)||0)*.065,.62,1.18);
""",
"""function ordinalProbabilities(score,service,station,evidence,date){
  const cal=calibration(),minute=parseMinutes(service&&service.std),prior=cal&&typeof cal.utilisationPrior==='function'?cal.utilisationPrior(service,station,minute,date):null,base=prior&&Array.isArray(prior.probabilities)?prior.probabilities:[.18,.34,.36,.12],temperature=clamp(1.22-Math.min(8,Number(evidence)||0)*.065,.62,1.18);
""")
once(p,
"const probabilityModel=ordinalProbabilities(score,service,station,evidence),accuracyBucket=accuracyBucketFor",
"const probabilityModel=ordinalProbabilities(score,service,station,evidence,date),accuracyBucket=accuracyBucketFor")

# Keep the official-data regression explicit about the peak context.
test='kerbside-backend/test/train-forecast-v4-official-data.test.mjs'
once(test,
"const operator=cal.operatorCrowdingSignal(service,station,8*60),capacity=cal.peakCapacitySignal(station,8*60),prior=cal.utilisationPrior(service,station);",
"const operator=cal.operatorCrowdingSignal(service,station,8*60),capacity=cal.peakCapacitySignal(station,8*60),prior=cal.utilisationPrior(service,station,8*60,new FixedDate('2026-08-12T12:00:00Z'));"
)
# Prove the same empirical distribution is not used off peak.
once(test,
"assert.equal(capacity.measured,true,capacity);assert.equal(prior.group,'longDistance');assert.ok(Math.abs(prior.probabilities.reduce((a,b)=>a+b,0)-1)<1e-5);",
"assert.equal(capacity.measured,true,capacity);assert.equal(prior.group,'longDistance');assert.ok(Math.abs(prior.probabilities.reduce((a,b)=>a+b,0)-1)<1e-5);assert.equal(cal.utilisationPrior(service,station,13*60,new FixedDate('2026-08-12T12:00:00Z')),null);"
)

print('Applied Forecast v4 staging-scope and peak-prior fixes.')
