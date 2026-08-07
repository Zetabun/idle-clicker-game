#!/usr/bin/env node
import fs from 'node:fs';

const version=String(process.argv[2]||'').trim();
if(!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Usage: node apply-journey-identity-hardening-build.mjs <semver>');

const busPath='bus.html';
let source=fs.readFileSync(busPath,'utf8');
const original=source;

function replaceExact(label,oldText,newText){
  const count=source.split(oldText).length-1;
  if(count!==1) throw new Error(`${label}: expected exactly one target, found ${count}`);
  source=source.replace(oldText,newText);
}

function replaceSection(label,startMarker,endMarker,replacement){
  const first=source.indexOf(startMarker);
  if(first<0) throw new Error(`${label}: start marker not found`);
  if(source.indexOf(startMarker,first+startMarker.length)>=0) throw new Error(`${label}: start marker is not unique`);
  const end=source.indexOf(endMarker,first+startMarker.length);
  if(end<0) throw new Error(`${label}: end marker not found`);
  source=source.slice(0,first)+replacement+source.slice(end);
}

replaceSection(
  'destination-compatible journey identity',
  'function routeEvidence(line,dest,journey,identity){',
  'const ETA_MIN_FRESH_SECONDS = 30;',
  `function journeyDestinationAgreement(rows,dest){
  const live=String(dest||'').trim();
  const heads=[...new Set((Array.isArray(rows)?rows:[]).map(row=>String(row&&row.head||'').trim()).filter(Boolean))];
  if(!live||!heads.length) return {comparable:false,compatible:true,conflict:false,best:1,heads};
  const best=heads.reduce((score,head)=>Math.max(score,destinationSimilarity(live,head)),0);
  return {comparable:true,compatible:best>=.34,conflict:best<.34,best,heads};
}
function routeEvidence(line,dest,journey,identity){
  if(!S.stop) return {score:0,label:'unverified'};
  const l=String(line);
  const allRows=timetableRowsForLine(l,new Date());
  const identityInfo=timetableIdentityRows(allRows,identity);
  const ttRows=identityInfo.rows;
  const tripMatch=journey?uniqueCompatibleTrips(ttRows,journey):{items:[],ref:'',strength:0,ambiguous:false};
  let journeyDestinationConflict=false, conflictingTrip='';
  if(tripMatch.items.length){
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
    journeyDestinationConflict=true; conflictingTrip=String(tripMatch.ref||'');
  }
  /* The origin departure is strong identity evidence only while the live
     destination agrees with the timetable journey it selects. Around a terminus
     operators can roll the aimed origin / journey fields to the next working
     before the destination and GPS have caught up. Treat that disagreement as a
     handover state, not permission to draw the opposite journey with confidence. */
  const originMatch=uniqueOriginTrips(ttRows,identity);
  if(originMatch.items.length){
    const destination=journeyDestinationAgreement(originMatch.items,dest);
    if(!destination.conflict){
      const path=!!timetablePattern(originMatch.ref);
      return {
        score:path?6:5,
        label:path?'origin departure and stop sequence matched':'origin departure matched to timetable',
        journeyMatch:true,pathMatch:path,matchStrength:tripMatch.strength,matchedTrip:originMatch.ref,
        originMatch:true,routeIdentityMatch:identityInfo.strong
      };
    }
    journeyDestinationConflict=true; conflictingTrip=String(originMatch.ref||conflictingTrip||'');
  }
  const tt=timetableRouteSet();
  if(tt.has(l)){
    if(identityInfo.conflict) return {score:0,label:'route number belongs to another operator at this stop',routeIdentityConflict:true,journeyDestinationConflict,conflictingTrip};
    const heads=ttRows.map(r=>r.head).filter(Boolean);
    const headMatch=!dest || !heads.length || heads.some(h=>destinationSimilarity(dest,h)>=.34);
    const terminates=!headMatch&&destinationTerminatesHere(dest);
    const branchOk=headMatch||terminates;
    const label=journeyDestinationConflict
      ? (branchOk?'route verified; matched journey destination disagrees':'route number matched, but live destination disagrees with matched journey')
      : tripMatch.ambiguous
        ? (branchOk?'route verified; journey alias ambiguous':'route number matched, but branch and journey did not')
        : terminates?'timetable route verified; terminates at this stop'
        : branchOk?(identityInfo.strong?'operator and route verified':'timetable route verified'):'route number matched, but this branch does not serve the stop';
    return {score:branchOk?(identityInfo.strong?4:3):1,label,journeyAmbiguous:tripMatch.ambiguous,
      journeyDestinationConflict,conflictingTrip,
      routeIdentityMatch:identityInfo.strong,timetableVerified:branchOk};
  }
  const m=MAPPED[String(S.stop.id)];
  if(m && m.routes.some(r=>String(r.ref)===l)){
    if(m.source==='stop') return {score:3,label:'mapped at this stop',journeyDestinationConflict,conflictingTrip};
    if(m.source==='nearby') return {score:2,label:'mapped nearby',journeyDestinationConflict,conflictingTrip};
    return {score:1,label:'runs past stop',journeyDestinationConflict,conflictingTrip};
  }
  const bag=SERVING[String(S.stop.id)]||{};
  const rec=normaliseServingRecord(bag[l]);
  const authoritative=!!(S.ttStop&&S.timetableSource==='national'&&!S.timetableFallback&&!S.ttError);
  if(rec.confirmed || rec.count>=2){
    if(authoritative) return {score:1,label:'seen stopping, but not in the timetable for this stop',journeyDestinationConflict,conflictingTrip};
    return {score:3,label:rec.source==='worker'?'recorded arrivals':'seen stopping',journeyDestinationConflict,conflictingTrip};
  }
  if(rec.count===1) return {score:1,label:'seen once',journeyDestinationConflict,conflictingTrip};
  return {score:0,label:'unverified',journeyDestinationConflict,conflictingTrip};
}
`
);

replaceExact(
  'block route geometry when journey identity conflicts',
  "function journeyGeometry(v,stop){\n  if(!v || !stop) return null;\n",
  "function journeyGeometry(v,stop){\n  if(!v || !stop || v.progressIdentityBlocked) return null;\n"
);

replaceExact(
  'block detailed progress when journey identity conflicts',
  "function journeyProgress(v){\n  const pattern=timetablePatternRecord(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern);\n",
  "function journeyProgress(v){\n  if(v&&v.progressIdentityBlocked) return null;\n  const pattern=timetablePatternRecord(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern);\n"
);

replaceExact(
  'block dwell geometry when journey identity conflicts',
  "function remainingStopsToTarget(v,stop){\n  const pattern=timetablePatternRecord(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern||v&&v.inferredPattern);\n",
  "function remainingStopsToTarget(v,stop){\n  if(v&&v.progressIdentityBlocked) return 0;\n  const pattern=timetablePatternRecord(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern||v&&v.inferredPattern);\n"
);

replaceExact(
  'do not schedule-match through a conflicting raw journey id',
  "  const journeyRef=evidence.matchedTrip||baseJourneyRef;\n",
  "  const journeyRef=evidence&&evidence.journeyDestinationConflict?'':(evidence.matchedTrip||baseJourneyRef);\n"
);

replaceExact(
  'do not route-glide through a conflicting journey',
  "  const pattern=timetablePatternRecord(v.progressTrip||v.inferredTrip||vehicleJourneyRef(v),v.progressPattern||v.inferredPattern);\n",
  "  const pattern=v.progressIdentityBlocked?null:timetablePatternRecord(v.progressTrip||v.inferredTrip||vehicleJourneyRef(v),v.progressPattern||v.inferredPattern);\n"
);

replaceExact(
  'install progress identity handover helper',
  "function collect(gate,diagnostics){\n  const out=[], now=Date.now();\n",
  `function setVehicleProgressIdentity(v,evidence,inference,matchedRow){
  if(!v) return;
  const inferredPattern=String(inference&&inference.patternId||'');
  const conflict=!!(evidence&&evidence.journeyDestinationConflict);
  v.progressIdentityBlocked=conflict&&!inferredPattern;
  if(inferredPattern){
    v.progressTrip='';
    v.progressPattern=inferredPattern;
    return;
  }
  v.progressTrip=v.progressIdentityBlocked?'':String(evidence&&evidence.matchedTrip||v.corridorTrip||v.journey||'');
  v.progressPattern=String(matchedRow&&matchedRow.pattern||'');
}
function collect(gate,diagnostics){
  const out=[], now=Date.now();
`
);

replaceExact(
  'apply safe progress identity',
  "    v.progressTrip=evidence.matchedTrip||v.corridorTrip||v.journey||'';\n    v.progressPattern=String(inference&&inference.patternId||matchedRow&&matchedRow.pattern||'');\n",
  "    setVehicleProgressIdentity(v,evidence,inference,matchedRow);\n"
);

replaceExact(
  'do not promote a time-nearest schedule while identity is blocked',
  "    if(est.schedule){ v.progressTrip=est.schedule.trip||v.progressTrip; v.progressPattern=String(est.schedule.pattern||v.progressPattern||''); }\n",
  "    if(est.schedule&&!v.progressIdentityBlocked){ v.progressTrip=est.schedule.trip||v.progressTrip; v.progressPattern=String(est.schedule.pattern||v.progressPattern||''); }\n"
);

replaceExact(
  'explain journey handover instead of showing the wrong progress pattern',
  "function journeyProgressHtml(v){\n  const progress=journeyProgress(v);\n  if(!progress){\n    const state=timetablePatternLoadState(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern);\n",
  "function journeyProgressHtml(v){\n  const progress=journeyProgress(v);\n  if(!progress){\n    if(v&&v.progressIdentityBlocked) return '<div class=\"journey-progress journey-progress-unavailable\"><b>Journey identity is updating.</b> The live destination and timetable journey disagree, so Kerbside is withholding route progress until they line up again.</div>';\n    const state=timetablePatternLoadState(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern);\n"
);

replaceExact(
  'rename misleading GPS recovered chip and expose journey handover',
  "+(r.recovered?'<span class=\"chip timing\" title=\"Kept live because stronger timetable or journey evidence overruled weak direction or bearing evidence.\">GPS recovered</span>':'')\n",
  "+(r.evidence&&r.evidence.journeyDestinationConflict?'<span class=\"chip timing\" title=\"Live destination and matched timetable journey disagree; route progress is withheld until they line up.\">journey updating</span>':r.recovered?'<span class=\"chip timing\" title=\"Kept on the board because route or timetable evidence supports the match despite weak GPS or direction confidence.\">match retained</span>':'')\n"
);

replaceExact(
  'rename recovered diagnostics stage',
  "    ['confidence',d.confidence],['recovered',d.recovered],['shown',d.shown]\n",
  "    ['confidence',d.confidence],['retained',d.recovered],['shown',d.shown]\n"
);

replaceExact(
  'clear progress handover state when selecting another stop',
  "delete vehicle.inferenceStopId; delete vehicle.inferenceGpsTs; vehicle.corridorTracked=false; }\n",
  "delete vehicle.inferenceStopId; delete vehicle.inferenceGpsTs; delete vehicle.progressIdentityBlocked; vehicle.corridorTracked=false; }\n"
);

replaceExact(
  'export journey identity hardening helpers for regression tests',
  'routeEvidence,routeIdentityAgreement,timetableIdentityRows',
  'routeEvidence,journeyDestinationAgreement,setVehicleProgressIdentity,routeIdentityAgreement,timetableIdentityRows'
);

if(source===original) throw new Error('Journey identity hardening patch made no changes');
fs.writeFileSync(busPath,source,'utf8');
fs.writeFileSync('VERSION',version+'\n','utf8');

const packagePath='kerbside-backend/package.json';
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
if(!pkg.scripts||typeof pkg.scripts!=='object') throw new Error('kerbside-backend/package.json has no scripts object');
if(!String(pkg.scripts.check||'').includes('tests/journey-identity-regression.mjs')){
  pkg.scripts.check=String(pkg.scripts.check||'')+' && node --check tests/journey-identity-regression.mjs';
}
pkg.scripts['test:journey-identity']='node tests/journey-identity-regression.mjs';
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n','utf8');

const browserRegressionPath='kerbside-backend/tests/browser-regression.mjs';
let browserRegression=fs.readFileSync(browserRegressionPath,'utf8');
function replaceBrowserAssertion(label,oldText,newText){
  const count=browserRegression.split(oldText).length-1;
  if(count!==1) throw new Error(`${label}: expected exactly one legacy assertion, found ${count}`);
  browserRegression=browserRegression.replace(oldText,newText);
}
replaceBrowserAssertion(
  'browser wording migration',
  'assert.match(busSource, /GPS recovered/);',
  "assert.match(busSource, /match retained/);\nassert.match(busSource, /journey updating/);\nassert.doesNotMatch(busSource, /GPS recovered/);"
);
replaceBrowserAssertion(
  'authoritative route evidence migration',
  "assert.match(busSource, /if\\(authoritative\\) return \\{score:1,label:'seen stopping, but not in the timetable for this stop'\\};/);",
  "assert.match(busSource, /if\\(authoritative\\) return \\{score:1,label:'seen stopping, but not in the timetable for this stop',journeyDestinationConflict,conflictingTrip\\};/);\nassert.match(busSource, /function journeyDestinationAgreement\\(rows,dest\\)/);\nassert.match(busSource, /v\\.progressIdentityBlocked=conflict&&!inferredPattern/);"
);
fs.writeFileSync(browserRegressionPath,browserRegression,'utf8');

console.log(`Applied Kerbside journey identity hardening build ${version}.`);
