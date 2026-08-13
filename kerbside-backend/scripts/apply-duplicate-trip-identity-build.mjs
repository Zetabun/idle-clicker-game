#!/usr/bin/env node
import fs from 'node:fs';

const version=String(process.argv[2]||'').trim();
if(!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Usage: node apply-duplicate-trip-identity-build.mjs <semver>');
let source=fs.readFileSync('bus.html','utf8');
const original=source;

function once(label,oldText,newText){
  const count=source.split(oldText).length-1;
  if(count!==1) throw new Error(`${label}: expected 1 target, found ${count}`);
  source=source.replace(oldText,newText);
}
function insertBefore(label,marker,text){ once(label,marker,text+marker); }
function section(label,start,end,replacement){
  const a=source.indexOf(start),b=a<0?-1:source.indexOf(end,a+start.length);
  if(a<0||b<0||source.indexOf(start,a+start.length)>=0) throw new Error(`${label}: markers not unique`);
  source=source.slice(0,a)+replacement+source.slice(b);
}

insertBefore('duplicate origin helper','function journeyDestinationAgreement(rows,dest){',`/* A duplicate timetable trip id may still describe one physical working. This
   path is deliberately fail-closed: every duplicate must share one pattern,
   call this exact ATCO stop at the same time, agree on branch/direction, and
   exactly one physical live bus may match the origin departure. */
function equivalentAmbiguousOriginMatch(rows,identity,dest,line,now=Date.now()){
  if(!authoritativePatternStopRequired()||!identity||!S.stop) return null;
  const liveDest=String(dest||'').trim();
  if(!liveDest||!Number.isFinite(Number(identity.aimedOriginAt))) return null;
  const matches=(Array.isArray(rows)?rows:[]).filter(row=>row&&row.trip&&originTimeMatches(row,identity));
  const refs=[...new Set(matches.map(row=>String(row.trip||'')).filter(Boolean))];
  if(refs.length<2||!matches.length) return null;
  const first=matches[0],patternId=String(first.pattern||'').trim(),firstHead=String(first.head||'').trim();
  const firstAt=Number(first.at),firstDirection=String(first.direction||'').trim();
  const firstRoute=routeIdentityToken(first.routeId),firstOperator=routeIdentityToken(first.operator);
  const firstServiceDate=String(first.serviceDate||''),firstSequence=Number(first.stopSequence);
  if(!patternId||!firstHead||!Number.isFinite(firstAt)||destinationSimilarity(liveDest,firstHead)<.34) return null;
  for(const row of matches){
    if(String(row.pattern||'').trim()!==patternId) return null;
    if(!Number.isFinite(Number(row.at))||Math.abs(Number(row.at)-firstAt)>60000) return null;
    const head=String(row.head||'').trim();
    if(!head||destinationSimilarity(liveDest,head)<.34||destinationSimilarity(firstHead,head)<.75) return null;
    const direction=String(row.direction||'').trim();
    if(firstDirection&&direction&&direction!==firstDirection) return null;
    const route=routeIdentityToken(row.routeId); if(firstRoute&&route&&route!==firstRoute) return null;
    const operator=routeIdentityToken(row.operator);
    if(comparableIdentity(firstOperator,operator,OPAQUE_AGENCY_ID)&&operator!==firstOperator) return null;
    const serviceDate=String(row.serviceDate||''); if(firstServiceDate&&serviceDate&&serviceDate!==firstServiceDate) return null;
    const sequence=Number(row.stopSequence); if(Number.isFinite(firstSequence)&&Number.isFinite(sequence)&&sequence!==firstSequence) return null;
    const exact=exactTripSelectedStopEvidence(row.trip,row.pattern,S.stop,row.stopSequence);
    if(!exact.authoritative||!exact.known||!exact.serves) return null;
  }
  const liveKeys=new Set();
  for(const candidate of S.vehicles.values()){
    if(!candidate||now-Number(candidate.ts)>MAX_AGE_MS) continue;
    if(Number.isFinite(Number(candidate.validUntilAt))&&now>Number(candidate.validUntilAt)) continue;
    if(String(candidate.line)!==String(line)||!originTimeMatches(first,candidate)||routeIdentityAgreement(first,candidate)<0) continue;
    if(candidate.dest&&destinationSimilarity(candidate.dest,firstHead)<.34) continue;
    const key=physicalVehicleKey(candidate)||String(candidate.id||''); if(key) liveKeys.add(key);
  }
  const currentKey=physicalVehicleKey(identity)||String(identity.id||'');
  if(!currentKey||liveKeys.size!==1||!liveKeys.has(currentKey)) return null;
  return {items:matches,refs,patternId,at:firstAt};
}
function equivalentOriginSchedulesForVehicle(v,now=Date.now()){
  if(!v) return [];
  const line=String(v.line||''),info=timetableIdentityRows(timetableRowsForLine(line,new Date(now)),v);
  const match=equivalentAmbiguousOriginMatch(info.rows,v,v.dest,line,now);
  return match?match.items:[];
}
`);

insertBefore('bounded ambiguous origin evidence','  const tt=timetableRouteSet();',`  const equivalentOrigin=originMatch.ambiguous?equivalentAmbiguousOriginMatch(ttRows,identity,dest,l):null;
  if(equivalentOrigin){
    return {score:4,label:'origin departure matches duplicate-equivalent timetable journeys',journeyMatch:false,pathMatch:false,
      matchStrength:0,matchedTrip:'',originMatch:true,originEquivalentAmbiguous:true,patternId:equivalentOrigin.patternId,
      routeIdentityMatch:identityInfo.strong,timetableVerified:true};
  }
`);

once('pattern-only progress identity',
`  const inferredPattern=String(inference&&inference.patternId||'');
  const conflict=!!(evidence&&evidence.journeyDestinationConflict&&!evidence.matchedRealtime);
  v.progressIdentityBlocked=conflict&&!inferredPattern;
  if(inferredPattern){`,
`  const equivalentPattern=String(evidence&&evidence.originEquivalentAmbiguous&&evidence.patternId||'');
  const inferredPattern=String(inference&&inference.patternId||'');
  const conflict=!!(evidence&&evidence.journeyDestinationConflict&&!evidence.matchedRealtime);
  v.progressIdentityBlocked=conflict&&!inferredPattern&&!equivalentPattern;
  if(equivalentPattern){
    v.progressIdentityBlocked=false;v.progressTrip='';v.progressPattern=equivalentPattern;v.progressStopSequence=null;return;
  }
  if(inferredPattern){`);

once('do not infer competing pattern','    const inference=!evidence.journeyMatch?inferVehicleJourneyPattern(v,S.stop,now):null;','    const inference=!evidence.journeyMatch&&!evidence.originEquivalentAmbiguous?inferVehicleJourneyPattern(v,S.stop,now):null;');
once('restrict schedule lookup',
`  const scheduleLookup=scheduledMatches(v.line,v.dest,spatial,journeyRef);
  const schedules=scheduleLookup.items;`,
`  const equivalentSchedules=evidence&&evidence.originEquivalentAmbiguous?equivalentOriginSchedulesForVehicle(v):[];
  const scheduleTarget=Date.now()+Math.max(0,Number(spatial)||0)*1000;
  const scheduleLookup=equivalentSchedules.length?{items:[...equivalentSchedules].sort((a,b)=>Math.abs(Number(a.at)-scheduleTarget)-Math.abs(Number(b.at)-scheduleTarget)),tripMatched:false}:scheduledMatches(v.line,v.dest,spatial,journeyRef);
  const schedules=scheduleLookup.items;`);
once('do not promote duplicate trip','    if(est.schedule&&!v.progressIdentityBlocked){ v.progressTrip=est.schedule.trip||v.progressTrip; v.progressPattern=String(est.schedule.pattern||v.progressPattern||''); }','    if(est.schedule&&!v.progressIdentityBlocked&&!evidence.originEquivalentAmbiguous){ v.progressTrip=est.schedule.trip||v.progressTrip; v.progressPattern=String(est.schedule.pattern||v.progressPattern||''); }');

section('claim duplicate schedules','function claimedScheduleFor(row){','function scheduledBoardRows(liveRows){',`function claimedSchedulesFor(row){
  if(!row||row.gpsLost&&!row.scheduleFallback) return [];
  if(row.evidence&&row.evidence.originEquivalentAmbiguous&&row.v){
    const equivalent=equivalentOriginSchedulesForVehicle(row.v); if(equivalent.length) return equivalent;
  }
  const claimed=row.schedule||row.matchedSchedule||exactIdentityScheduleClaim(row)||null;
  return claimed?[claimed]:[];
}
function claimedScheduleFor(row){ return claimedSchedulesFor(row)[0]||null; }
function scheduleClaimedByLive(row){ return claimedSchedulesFor(row).length>0; }
`);
once('claim all duplicate schedule keys','  liveRows.forEach(r=>{ const s=claimedScheduleFor(r); if(s) claimed.add(scheduleKey(s)); });','  liveRows.forEach(r=>{ for(const s of claimedSchedulesFor(r)) claimed.add(scheduleKey(s)); });');

if(source===original) throw new Error('No bus source changes made');
fs.writeFileSync('bus.html',source,'utf8');
fs.writeFileSync('VERSION',version+'\n','utf8');
const packagePath='kerbside-backend/package.json',pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
const regression='tests/duplicate-trip-identity-regression.mjs';
if(!String(pkg.scripts.check||'').includes(regression)) pkg.scripts.check=String(pkg.scripts.check||'')+` && node --check ${regression}`;
pkg.scripts['test:listing-reliability']='node tests/listing-reliability-regression.mjs && node tests/duplicate-trip-identity-regression.mjs';
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n','utf8');
console.log(`Applied Kerbside duplicate trip identity build ${version}.`);
