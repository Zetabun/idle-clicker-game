#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

OLD_VERSION = '0.7.15'
NEW_VERSION = '0.7.16'


def replace_once(path, old, new, label):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if new in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source block, found {count}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


version_file = Path('VERSION')
version = version_file.read_text(encoding='utf-8').strip()
if version not in {OLD_VERSION, NEW_VERSION}:
    raise SystemExit(f'Expected Kerbside {OLD_VERSION} before release, found {version!r}')

bus_agreement_old = """function journeyDestinationAgreement(rows,dest){
  const live=String(dest||'').trim();
  const heads=[...new Set((Array.isArray(rows)?rows:[]).map(row=>String(row&&row.head||'').trim()).filter(Boolean))];
  if(!live||!heads.length) return {comparable:false,compatible:true,conflict:false,best:1,heads};
  const best=heads.reduce((score,head)=>Math.max(score,destinationSimilarity(live,head)),0);
  return {comparable:true,compatible:best>=.34,conflict:best<.34,best,heads};
}
"""

bus_agreement_new = bus_agreement_old + """/* A strong live journey reference can disagree with the timetable headsign
   simply because the operator publishes a locality while GTFS names the
   terminus stop. Before treating that as a branch contradiction, check whether
   the live destination actually agrees with a different scheduled journey at
   this stop. If it does, keep the handover protection. If it does not, the
   wording is non-comparable rather than evidence for the opposite branch. */
function journeyDestinationAlternative(rows,matchedRows,dest){
  const live=String(dest||'').trim();
  if(!live) return false;
  const matchedTrips=new Set((Array.isArray(matchedRows)?matchedRows:[])
    .map(row=>String(row&&row.trip||'')).filter(Boolean));
  return (Array.isArray(rows)?rows:[]).some(row=>{
    if(!row||!row.head) return false;
    const trip=String(row.trip||'');
    if(trip&&matchedTrips.has(trip)) return false;
    return destinationSimilarity(live,row.head)>=.34;
  });
}
"""

replace_once('bus.html', bus_agreement_old, bus_agreement_new, 'destination alternative helper')

trip_old = """  if(tripMatch.items.length){
    const destination=journeyDestinationAgreement(tripMatch.items,dest);
    if(!destination.conflict){
      const path=!!timetablePattern(tripMatch.ref), literal=tripMatch.strength===4;
      return {
        score:path?6:5,
        label:path?(literal?'exact journey and stop sequence matched':'unique journey alias and stop sequence matched'):(literal?'exact journey matched to timetable':'unique journey alias matched to timetable'),
        journeyMatch:true,pathMatch:path,matchStrength:tripMatch.strength,matchedTrip:tripMatch.ref,
        routeIdentityMatch:identityInfo.strong
      };
    }
    journeyDestinationConflict=true; conflictingTrip=String(tripMatch.ref||conflictingTrip||'');
  }
"""

trip_new = """  if(tripMatch.items.length){
    const destination=journeyDestinationAgreement(tripMatch.items,dest);
    const alternativeBranch=destination.conflict&&journeyDestinationAlternative(ttRows,tripMatch.items,dest);
    const wordingOnlyConflict=!!(destination.conflict&&tripMatch.strength>=3&&!alternativeBranch);
    if(!destination.conflict||wordingOnlyConflict){
      const path=!!timetablePattern(tripMatch.ref), literal=tripMatch.strength===4;
      const label=path?(literal?'exact journey and stop sequence matched':'unique journey alias and stop sequence matched'):(literal?'exact journey matched to timetable':'unique journey alias matched to timetable');
      return {
        score:path?6:5,
        label:label+(wordingOnlyConflict?'; destination wording differs':''),
        journeyMatch:true,pathMatch:path,matchStrength:tripMatch.strength,matchedTrip:tripMatch.ref,
        journeyDestinationWordingMismatch:wordingOnlyConflict,
        routeIdentityMatch:identityInfo.strong
      };
    }
    journeyDestinationConflict=true; conflictingTrip=String(tripMatch.ref||conflictingTrip||'');
  }
"""

replace_once('bus.html', trip_old, trip_new, 'strong journey destination wording rescue')

test_header_old = """assert.match(busSource,/function journeyDestinationAgreement\\(rows,dest\\)/);
assert.match(busSource,/journeyDestinationConflict/);
"""
test_header_new = """assert.match(busSource,/function journeyDestinationAgreement\\(rows,dest\\)/);
assert.match(busSource,/function journeyDestinationAlternative\\(rows,matchedRows,dest\\)/);
assert.match(busSource,/destination wording differs/);
assert.match(busSource,/journeyDestinationConflict/);
"""
replace_once('kerbside-backend/tests/journey-identity-regression.mjs', test_header_old, test_header_new, 'journey identity static guards')

alias_old = """      const aliasBaseEvidence=api.routeEvidence('61',aliasVehicle.dest,'',aliasVehicle);
      const aliasInference=api.inferVehicleJourneyPattern(aliasVehicle,stop,now);
      const aliasEvidence=api.inferredRouteEvidence(aliasBaseEvidence,aliasInference);
"""
alias_new = """      const aliasBaseEvidence=api.routeEvidence('61',aliasVehicle.dest,'',aliasVehicle);
      const aliasJourneyEvidence=api.routeEvidence('61',aliasVehicle.dest,'BRIGHTSTONE-INBOUND',{...aliasVehicle,journey:'BRIGHTSTONE-INBOUND'});
      const aliasInference=api.inferVehicleJourneyPattern(aliasVehicle,stop,now);
      const aliasEvidence=api.inferredRouteEvidence(aliasBaseEvidence,aliasInference);
"""
replace_once('kerbside-backend/tests/journey-identity-regression.mjs', alias_old, alias_new, 'destination wording journey regression setup')

return_old = """        handover:{realtime:!!handover.matchedRealtime,trip:String(handover.matchedTrip||''),conflict:!!handover.journeyDestinationConflict},
        destinationAliasPattern:{
"""
return_new = """        handover:{realtime:!!handover.matchedRealtime,trip:String(handover.matchedTrip||''),conflict:!!handover.journeyDestinationConflict},
        destinationAliasJourney:{
          score:Number(aliasJourneyEvidence&&aliasJourneyEvidence.score||0),
          journeyMatch:!!(aliasJourneyEvidence&&aliasJourneyEvidence.journeyMatch),
          matchedTrip:String(aliasJourneyEvidence&&aliasJourneyEvidence.matchedTrip||''),
          conflict:!!(aliasJourneyEvidence&&aliasJourneyEvidence.journeyDestinationConflict),
          wordingMismatch:!!(aliasJourneyEvidence&&aliasJourneyEvidence.journeyDestinationWordingMismatch),
          label:String(aliasJourneyEvidence&&aliasJourneyEvidence.label||'')
        },
        destinationAliasPattern:{
"""
replace_once('kerbside-backend/tests/journey-identity-regression.mjs', return_old, return_new, 'destination wording journey regression result')

assert_old = """  assert.deepEqual(result.handover,{realtime:false,trip:'INBOUND',conflict:false},'an older conflicting matched identity must yield to newer SIRI journey evidence during a terminus handover');
  assert.deepEqual(result.destinationAliasPattern,{
"""
assert_new = """  assert.deepEqual(result.handover,{realtime:false,trip:'INBOUND',conflict:false},'an older conflicting matched identity must yield to newer SIRI journey evidence during a terminus handover');
  assert.deepEqual(result.destinationAliasJourney,{
    score:6,journeyMatch:true,matchedTrip:'BRIGHTSTONE-INBOUND',conflict:false,wordingMismatch:true,
    label:'exact journey and stop sequence matched; destination wording differs'
  },'a strong exact journey calling at this stop must survive a locality-versus-terminus wording mismatch when no other branch matches the live destination');
  assert.deepEqual(result.destinationAliasPattern,{
"""
replace_once('kerbside-backend/tests/journey-identity-regression.mjs', assert_old, assert_new, 'destination wording journey regression assertion')

version_file.write_text(NEW_VERSION + '\n', encoding='utf-8')
subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
print(f'Prepared Kerbside {NEW_VERSION}: strong journey evidence survives non-branch destination wording mismatches')
