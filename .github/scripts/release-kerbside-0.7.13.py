#!/usr/bin/env python3
from pathlib import Path
import subprocess

VERSION = '0.7.13'


def replace_exact(path, label, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: {label}: expected exactly one target, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_exact(
    'bus.html',
    'allow ordered route geometry to outrank destination wording',
    """function inferenceCandidate(row,pattern,fit,v,now){
  const rawSpeed=Number(v.speed),speed=isFinite(rawSpeed)&&rawSpeed>=MIN_SPEED&&rawSpeed<=MAX_SPEED?rawSpeed:DEFAULT_SPEED;
  const routeSecs=Math.max(0,fit.remaining)/speed;
  const scheduleSecs=(Number(row.at)-now)/1000;
  const scheduleGap=Math.abs(scheduleSecs-routeSecs);
  const similarity=v.dest&&row.head?destinationSimilarity(v.dest,row.head):1;
  if(v.dest&&row.head&&similarity<.34) return null;
  const points=pattern.points,segment=Math.max(0,Math.min(points.length-2,fit.current.segment));
  const routeBearing=bearingTo(points[segment].lat,points[segment].lon,points[segment+1].lat,points[segment+1].lon);
  const bearingGap=isFinite(Number(v.bearing))?headingDifference(Number(v.bearing),routeBearing):0;
  const score=fit.meanOffset*.55+fit.current.metres*.45+Math.min(420,scheduleGap*.18)+bearingGap*.7+(1-similarity)*90;
  return {row,trip:String(row.trip),pattern,fit,score,scheduleGap,similarity};
}
""",
    """function inferenceCandidate(row,pattern,fit,v,now){
  const rawSpeed=Number(v.speed),speed=isFinite(rawSpeed)&&rawSpeed>=MIN_SPEED&&rawSpeed<=MAX_SPEED?rawSpeed:DEFAULT_SPEED;
  const routeSecs=Math.max(0,fit.remaining)/speed;
  const scheduleSecs=(Number(row.at)-now)/1000;
  const scheduleGap=Math.abs(scheduleSecs-routeSecs);
  const similarity=v.dest&&row.head?destinationSimilarity(v.dest,row.head):1;
  const destinationConflict=!!(v.dest&&row.head&&similarity<.34);
  /* SIRI destinations are often localities while timetable headsigns are the
     named terminus stop (for example Digbeth versus Moor St Queensway). The
     ordered route pattern plus measured forward GPS movement is stronger
     evidence of which side of a stop the bus will serve than those words.
     Keep the text disagreement as a scoring penalty, but do not discard a
     geometry-proven pattern before it gets a chance to disambiguate direction. */
  const points=pattern.points,segment=Math.max(0,Math.min(points.length-2,fit.current.segment));
  const routeBearing=bearingTo(points[segment].lat,points[segment].lon,points[segment+1].lat,points[segment+1].lon);
  const bearingGap=isFinite(Number(v.bearing))?headingDifference(Number(v.bearing),routeBearing):0;
  const score=fit.meanOffset*.55+fit.current.metres*.45+Math.min(420,scheduleGap*.18)+bearingGap*.7+(1-similarity)*90;
  return {row,trip:String(row.trip),pattern,fit,score,scheduleGap,similarity,destinationConflict};
}
"""
)

replace_exact(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    'add Brightstone-style destination alias route inference regression',
    """      const handover=api.routeEvidence('61','Digbeth Moor Street Queensway','OUTBOUND',{...baseVehicle,journey:'INBOUND',matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedLagMs:60000});

      const stickyIncoming={...baseVehicle,sourceTs:now,ts:now,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};
""",
    """      const handover=api.routeEvidence('61','Digbeth Moor Street Queensway','OUTBOUND',{...baseVehicle,journey:'INBOUND',matchedTrip:'OUTBOUND',matchedRouteId:'R61',matchedLagMs:60000});

      // Some operators publish a locality ("Digbeth") while the timetable uses
      // the actual terminus stop ("Moor St Queensway"). Text similarity is low,
      // but two GPS fixes moving forward on the ordered inbound pattern prove
      // which side of Brightstone Road the bus will serve. This must recover a
      // live route pattern without claiming a specific scheduled departure.
      const aliasPatternId='brightstone-61-inbound';
      state.ttStop={id:'BRIGHTSTONE',d:[[
        minuteAt(8),'61','Moor St Queensway','','in','BRIGHTSTONE-INBOUND',aliasPatternId,'R61','',3,minuteAt(-30)
      ]]};
      state.timetable={
        services:{},
        tripPatterns:{'BRIGHTSTONE-INBOUND':aliasPatternId},
        patterns:{
          [aliasPatternId]:{
            p:[[52.4600,-1.9600],[52.4550,-1.9600],[52.4500,-1.9600]],
            s:[
              ['UPSTREAM','Upstream',52.4600,-1.9600,1],
              ['MID','Middle',52.4550,-1.9600,2],
              ['BRIGHTSTONE','Brightstone Road',52.4500,-1.9600,3]
            ],
            g:1
          }
        }
      };
      state.timetableRun=Number(state.timetableRun||0)+1;
      const aliasVehicle={
        id:'61-inbound-alias',line:'61',lineRef:'61',owner:'',operator:'',dest:'Digbeth',journey:'',
        lat:52.4550,lon:-1.9600,bearing:180,ts:now,sourceTs:now,hist:[
          {lat:52.4590,lon:-1.9600,ts:now-30000},
          {lat:52.4550,lon:-1.9600,ts:now}
        ],speed:6,cadence:20
      };
      const aliasBaseEvidence=api.routeEvidence('61',aliasVehicle.dest,'',aliasVehicle);
      const aliasInference=api.inferVehicleJourneyPattern(aliasVehicle,stop,now);
      const aliasEvidence=api.inferredRouteEvidence(aliasBaseEvidence,aliasInference);

      const stickyIncoming={...baseVehicle,sourceTs:now,ts:now,matchedTrip:'',matchedTripAt:undefined,matchSource:'',matchedSticky:false};
"""
)

replace_exact(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    'return Brightstone alias regression result',
    """        handover:{realtime:!!handover.matchedRealtime,trip:String(handover.matchedTrip||''),conflict:!!handover.journeyDestinationConflict},
        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,lag:Number(stickyIncoming.matchedLagMs),expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},
""",
    """        handover:{realtime:!!handover.matchedRealtime,trip:String(handover.matchedTrip||''),conflict:!!handover.journeyDestinationConflict},
        destinationAliasPattern:{
          inferred:!!aliasInference,
          patternOnly:!!(aliasInference&&aliasInference.patternOnly),
          patternId:String(aliasInference&&aliasInference.patternId||''),
          score:Number(aliasEvidence&&aliasEvidence.score||0),
          journeyMatch:!!(aliasEvidence&&aliasEvidence.journeyMatch),
          matchedTrip:String(aliasEvidence&&aliasEvidence.matchedTrip||'')
        },
        sticky:{retained:stickyRetained,trip:stickyIncoming.matchedTrip,sticky:!!stickyIncoming.matchedSticky,lag:Number(stickyIncoming.matchedLagMs),expired:stickyExpired,expiredTrip:String(expiredIncoming.matchedTrip||'')},
"""
)

replace_exact(
    'kerbside-backend/tests/journey-identity-regression.mjs',
    'assert Brightstone alias route inference without false trip identity',
    """  assert.deepEqual(result.handover,{realtime:false,trip:'INBOUND',conflict:false},'an older conflicting matched identity must yield to newer SIRI journey evidence during a terminus handover');
  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,lag:30000,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap, age its observation lag, and expire rather than stick indefinitely');
""",
    """  assert.deepEqual(result.handover,{realtime:false,trip:'INBOUND',conflict:false},'an older conflicting matched identity must yield to newer SIRI journey evidence during a terminus handover');
  assert.deepEqual(result.destinationAliasPattern,{
    inferred:true,patternOnly:true,patternId:'brightstone-61-inbound',score:4,journeyMatch:false,matchedTrip:''
  },'GPS movement on the ordered 61 pattern must recover a Digbeth versus Moor St Queensway naming mismatch without inventing a scheduled trip identity');
  assert.deepEqual(result.sticky,{retained:true,trip:'OUTBOUND',sticky:true,lag:30000,expired:false,expiredTrip:''},'matched identity should survive a short auxiliary-feed gap, age its observation lag, and expire rather than stick indefinitely');
"""
)

Path('VERSION').write_text(VERSION + '\n', encoding='utf-8')
subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)
print(f'Prepared Kerbside {VERSION} destination/route-pattern matching fix.')
