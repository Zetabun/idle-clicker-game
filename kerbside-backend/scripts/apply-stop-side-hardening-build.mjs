#!/usr/bin/env node
import fs from 'node:fs';

const version = String(process.argv[2] || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Usage: node apply-stop-side-hardening-build.mjs <semver>');
}

const busPath = 'bus.html';
let source = fs.readFileSync(busPath, 'utf8');
const original = source;

function replaceExact(label, oldText, newText) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one target, found ${count}`);
  source = source.replace(oldText, newText);
}

function replaceSection(label, startMarker, endMarker, replacement) {
  const first = source.indexOf(startMarker);
  if (first < 0) throw new Error(`${label}: start marker not found`);
  if (source.indexOf(startMarker, first + startMarker.length) >= 0) throw new Error(`${label}: start marker is not unique`);
  const end = source.indexOf(endMarker, first + startMarker.length);
  if (end < 0) throw new Error(`${label}: end marker not found`);
  source = source.slice(0, first) + replacement + source.slice(end);
}

replaceSection(
  'authoritative stop identity and opposite-stand detection',
  'function sameDiscoveredStop(a,b){',
  'function mergeDiscoveredStops(primary,secondary,lat,lon){',
  `function authoritativeDiscoveredStopId(stop){
  if(!stop) return '';
  const values=[stop.timetableId,stop.atco,stop.source==='official'?stop.id:''];
  for(const value of values){
    const id=String(value||'').trim();
    if(!id) continue;
    if(stop.source==='official'||/^\\d{3}0[A-Za-z0-9]{4,8}$/.test(id)) return id.toLowerCase();
  }
  return '';
}
function stopIndicatorDirection(value){
  const text=String(value||'').trim().toLowerCase();
  if(!text) return '';
  if(/\\b(n|north)(?:\\s|-)?bound\\b/.test(text)||text==='nb') return 'n';
  if(/\\b(s|south)(?:\\s|-)?bound\\b/.test(text)||text==='sb') return 's';
  if(/\\b(e|east)(?:\\s|-)?bound\\b/.test(text)||text==='eb') return 'e';
  if(/\\b(w|west)(?:\\s|-)?bound\\b/.test(text)||text==='wb') return 'w';
  if(/\\b(ne|north\\s*east)(?:\\s|-)?bound\\b/.test(text)) return 'ne';
  if(/\\b(sw|south\\s*west)(?:\\s|-)?bound\\b/.test(text)) return 'sw';
  if(/\\b(nw|north\\s*west)(?:\\s|-)?bound\\b/.test(text)) return 'nw';
  if(/\\b(se|south\\s*east)(?:\\s|-)?bound\\b/.test(text)) return 'se';
  if(/\\bopp(?:osite)?\\b/.test(text)) return 'opp';
  if(/\\b(adj|adjacent)\\b/.test(text)) return 'adj';
  return '';
}
function likelyOppositeStopPair(a,b){
  if(!a||!b||!isFinite(a.lat)||!isFinite(a.lon)||!isFinite(b.lat)||!isFinite(b.lon)) return false;
  const metres=dist(a.lat,a.lon,b.lat,b.lon);
  if(!Number.isFinite(metres)||metres<4||metres>70) return false;
  if(nameSimilarity(a.name||'',b.name||'')<.65) return false;
  const authoritativeA=authoritativeDiscoveredStopId(a), authoritativeB=authoritativeDiscoveredStopId(b);
  if(authoritativeA&&authoritativeB&&authoritativeA===authoritativeB) return false;
  const rawA=String(a.ind||'').trim().toLowerCase(), rawB=String(b.ind||'').trim().toLowerCase();
  const dirA=stopIndicatorDirection(rawA), dirB=stopIndicatorDirection(rawB);
  const opposites={n:'s',s:'n',e:'w',w:'e',ne:'sw',sw:'ne',nw:'se',se:'nw',adj:'opp',opp:'adj'};
  if(dirA&&dirB&&opposites[dirA]===dirB) return true;
  if(dirA&&dirB&&dirA===dirB) return false;
  if(rawA&&rawB&&rawA===rawB) return false;
  if(authoritativeA&&authoritativeB&&authoritativeA!==authoritativeB) return true;
  return metres<=45;
}
function sameDiscoveredStop(a,b){
  const idA=String(a&&a.id||''), idB=String(b&&b.id||'');
  if(idA&&idA===idB) return true;
  const authoritativeA=authoritativeDiscoveredStopId(a), authoritativeB=authoritativeDiscoveredStopId(b);
  if(authoritativeA&&authoritativeB&&authoritativeA!==authoritativeB) return false;
  const codesA=discoveredStopCodes(a), codesB=discoveredStopCodes(b);
  if([...codesA].some(code=>codesB.has(code))) return true;
  if(!a||!b||!isFinite(a.lat)||!isFinite(a.lon)||!isFinite(b.lat)||!isFinite(b.lon)) return false;
  const indA=normName(a.ind||''), indB=normName(b.ind||'');
  if(indA&&indB&&indA!==indB) return false;
  return dist(a.lat,a.lon,b.lat,b.lon)<=12 && nameSimilarity(a.name||'',b.name||'')>=.6;
}
`
);

replaceSection(
  'accuracy-aware stop-side selection',
  'function stopSelectionCandidates(stops,origin){',
  'function showDiscoveredStops(stops,lat,lon,cacheable){',
  `const STOP_SIDE_DEVICE_FLOOR_METRES = 18;
const STOP_SIDE_PAIR_MARGIN_METRES = 45;
function stopSelectionCandidates(stops,origin){
  const list=(Array.isArray(stops)?stops:[])
    .filter(stop=>stop&&Number.isFinite(Number(stop.d)))
    .sort((a,b)=>Number(a.d)-Number(b.d));
  if(!list.length) return [];
  const kind=savedOriginSource(origin), nearest=list[0], chosen=[];
  const add=stop=>{ if(stop&&!chosen.some(item=>String(item.id)===String(stop.id))) chosen.push(stop); };
  if(kind==='device'){
    const accuracy=Number(origin&&origin.accuracy);
    const radius=Number.isFinite(accuracy)&&accuracy>0?Math.max(STOP_SIDE_DEVICE_FLOOR_METRES,accuracy):STOP_SIDE_DEVICE_FLOOR_METRES;
    list.filter(stop=>Number(stop.d)<=radius).forEach(add);
  } else {
    add(nearest);
  }
  for(const stop of list){
    if(stop===nearest) continue;
    if(likelyOppositeStopPair(nearest,stop)&&Number(stop.d)<=Number(nearest.d)+STOP_SIDE_PAIR_MARGIN_METRES) add(stop);
  }
  return chosen.sort((a,b)=>Number(a.d)-Number(b.d));
}
function stopSelectionNeedsChoice(stops,origin){
  const candidates=stopSelectionCandidates(stops,origin);
  if(candidates.length<2) return false;
  if(savedOriginSource(origin)==='device'){
    const accuracy=Number(origin&&origin.accuracy);
    const radius=Number.isFinite(accuracy)&&accuracy>0?Math.max(STOP_SIDE_DEVICE_FLOOR_METRES,accuracy):STOP_SIDE_DEVICE_FLOOR_METRES;
    if(candidates.filter(stop=>Number(stop.d)<=radius).length>=2) return true;
  }
  const first=candidates[0];
  return candidates.slice(1).some(stop=>likelyOppositeStopPair(first,stop));
}
function chooseDiscoveredStop(wanted){
  if(wanted){ selectStop(wanted); return true; }
  if(stopSelectionNeedsChoice(S.stops,S.origin)){
    $('stopName').textContent='Choose the correct stop';
    $('stopMeta').textContent='MORE THAN ONE PLAUSIBLE STAND';
    openStopPicker('Your location is close to more than one plausible stand. Choose the stop you are waiting at.');
    return false;
  }
  selectStop(S.stops[0]);
  return true;
}
`
);

replaceSection(
  'ambiguous timetable stop fallback',
  'function matchTimetableStop(stop){',
  'let TIMETABLE_ROWS_CACHE=',
  `function matchTimetableStop(stop){
  if(!S.timetable || !stop) return null;
  const entries=Object.entries(S.timetable.stops);
  const codes=[stop.atco,stop.naptan,looksLikeAtco(stop.code)?stop.code:'']
    .map(v=>String(v||'').trim().toLowerCase()).filter(Boolean);
  if(codes.length){
    for(const [id,t] of entries){
      const candidates=[id,t&&t.c,t&&t.sms].map(v=>String(v||'').trim().toLowerCase());
      if(codes.some(code=>candidates.includes(code))) return {id,...t,match:'code'};
    }
    // When the national data has an authoritative selected stop id but no exact
    // match, guessing a nearby stand can silently switch to the opposite kerb.
    if(S.timetableSource==='national'&&stop.source==='official') return null;
  }
  const strict=!!S.manualStop, maxDistance=strict?60:140;
  const ranked=[];
  for(const [id,t] of entries){
    if(!Array.isArray(t.ll)) continue;
    const lat=Number(t.ll[0]), lon=Number(t.ll[1]);
    const d=dist(stop.lat,stop.lon,lat,lon);
    if(d>maxDistance) continue;
    const sim=nameSimilarity(stop.name,t.n||'');
    if(strict && sim<.45) continue;
    const score=sim*120-d;
    ranked.push({id,...t,match:'nearby',distance:d,similarity:sim,score,_stop:{id,source:'official',name:t.n||stop.name||'',ind:t.ind||'',lat,lon}});
  }
  ranked.sort((a,b)=>b.score-a.score||a.distance-b.distance);
  const best=ranked[0];
  if(!best) return null;
  const ambiguous=ranked.slice(1).some(candidate=>
    Math.abs(candidate.distance-best.distance)<=35 &&
    Math.abs(candidate.score-best.score)<=30 &&
    likelyOppositeStopPair(best._stop,candidate._stop)
  );
  if(ambiguous) return null;
  const {score,_stop,...clean}=best;
  if(strict) return clean.distance<=60 && clean.similarity>=.45 ? clean : null;
  return (best.score>-45 || clean.distance<45) ? clean : null;
}
`
);

replaceSection(
  'ambiguous pattern-stop fallback',
  'function selectedPatternStopIndex(stops,selectedStop,fromAlong,stopSequence){',
  'function routePatternMovementFit(pattern,v,stop){',
  `function selectedPatternStopIndex(stops,selectedStop,fromAlong,stopSequence){
  const chosen=selectedStop||S.stop;
  if(!stops.length||!chosen) return -1;
  const ids=[chosen===S.stop&&S.ttStop&&S.ttStop.id,chosen.timetableId,chosen.atco,chosen.code,chosen.id].map(v=>String(v||'')).filter(Boolean);
  const hasProgress=fromAlong!==null&&fromAlong!==''&&Number.isFinite(Number(fromAlong));
  const hasSequence=stopSequence!==null&&stopSequence!==''&&Number.isFinite(Number(stopSequence));
  const pick=matches=>{
    if(!matches.length) return -1;
    if(hasSequence){
      const exact=matches.find(i=>Number(stops[i].sequence)===Number(stopSequence));
      if(exact!==undefined) return exact;
      const sequenced=matches.filter(i=>Number.isFinite(Number(stops[i].sequence)));
      if(sequenced.length) return sequenced.sort((a,b)=>Math.abs(Number(stops[a].sequence)-Number(stopSequence))-Math.abs(Number(stops[b].sequence)-Number(stopSequence)))[0];
    }
    if(!hasProgress) return matches[0];
    const threshold=Number(fromAlong)-PATTERN_STOP_PASSED_TOLERANCE;
    const ahead=matches.find(i=>Number(stops[i].along)>=threshold);
    return ahead===undefined?matches[matches.length-1]:ahead;
  };
  const byId=[];
  stops.forEach((stop,i)=>{ if(ids.includes(String(stop.id))) byId.push(i); });
  if(byId.length) return pick(byId);
  const metres=stops.map(stop=>dist(stop.lat,stop.lon,chosen.lat,chosen.lon));
  const nearest=Math.min(...metres);
  if(!isFinite(nearest)||nearest>180) return -1;
  const same=[];
  metres.forEach((m,i)=>{ if(m<=nearest+25) same.push(i); });
  // Sequence is authoritative. Without it, two similarly close same-name calls
  // on opposite kerbs are not enough evidence to choose a side by metres alone.
  if(!hasSequence&&same.length>1){
    const ranked=[...same].sort((a,b)=>metres[a]-metres[b]);
    const first=ranked[0];
    const ambiguous=ranked.slice(1).some(i=>{
      if(Math.abs(metres[i]-metres[first])>25) return false;
      const separation=dist(stops[first].lat,stops[first].lon,stops[i].lat,stops[i].lon);
      if(separation<6||separation>70) return false;
      const nameA=stops[first].name||stops[first].n||'', nameB=stops[i].name||stops[i].n||'';
      return !nameA||!nameB||nameSimilarity(nameA,nameB)>=.6;
    });
    if(ambiguous) return -1;
  }
  return pick(same);
}
`
);

replaceExact(
  'preserve route-corridor estimate metadata',
  "    return {lat:b.lat+(routed.lat-b.lat)*blend,lon:b.lon+(routed.lon-b.lon)*blend,estimated:true,routeGuided:true};\n",
  "    return {lat:b.lat+(routed.lat-b.lat)*blend,lon:b.lon+(routed.lon-b.lon)*blend,estimated:true,routeGuided:true,corridorOnly:!!routed.corridorOnly};\n"
);

replaceExact(
  'hold confirmed GPS near stop without an official route shape',
  "  const pattern=timetablePatternRecord(v.progressTrip||v.inferredTrip||vehicleJourneyRef(v),v.progressPattern||v.inferredPattern);\n  const routed=visualRoutePosition(v,pattern,metres);\n",
  "  const pattern=timetablePatternRecord(v.progressTrip||v.inferredTrip||vehicleJourneyRef(v),v.progressPattern||v.inferredPattern);\n  // Ordered-stop corridors are useful for progress, but near a stand they do not\n  // prove which carriageway the bus occupies. Keep the last confirmed GPS fix\n  // instead of projecting a visually precise marker onto the wrong kerb.\n  if(pattern&&!pattern.shape&&S.stop&&dist(b.lat,b.lon,S.stop.lat,S.stop.lon)<=180) return confirmed;\n  const routed=visualRoutePosition(v,pattern,metres);\n"
);

replaceExact(
  'estimated vehicle marker styling',
  ".veh.dim .body{background:var(--dot-idle);color:var(--on-accent)}\n.veh.dim .cone::before{border-bottom-color:var(--dot-idle)}\n.veh.sel .body{background:var(--live);box-shadow:0 0 0 2px var(--ink),0 0 16px var(--live)}\n",
  ".veh.dim .body{background:var(--dot-idle);color:var(--on-accent)}\n.veh.dim .cone::before{border-bottom-color:var(--dot-idle)}\n.veh.estimated .body{outline:1px solid var(--text-dim);outline-offset:2px}\n.veh.corridor .body{outline-style:dashed}\n.veh.sel .body{background:var(--live);box-shadow:0 0 0 2px var(--ink),0 0 16px var(--live)}\n"
);

replaceExact(
  'estimated vehicle marker classes',
  "  for(const {v,shown} of plan.draw){\n    const cls = 'veh'+(shown?'':' dim')+(S.selected===v.id?' sel':'');\n    const brg = isFinite(v.bearing)?v.bearing:0;\n    const visual=visualVehiclePosition(v);\n    const sig = cls+'|'+Math.round(brg/5)+'|'+v.line;\n",
  "  for(const {v,shown} of plan.draw){\n    const visual=visualVehiclePosition(v);\n    const cls = 'veh'+(shown?'':' dim')+(S.selected===v.id?' sel':'')+(visual.estimated?' estimated':'')+(visual.corridorOnly?' corridor':'');\n    const brg = isFinite(v.bearing)?v.bearing:0;\n    const sig = cls+'|'+Math.round(brg/5)+'|'+v.line;\n"
);

replaceExact(
  'estimated marker popup disclosure',
  "      + (v.operator&&v.operator!=='SIM' ? '<br><span style=\"color:#7D8FA3;font-size:11px\">'+esc(v.operator)+'</span>':'');\n",
  "      + (visual.estimated ? '<br><span style=\"color:#7D8FA3;font-size:11px\">'+(visual.corridorOnly?'Estimated between reports · route corridor':'Estimated between reports · route shape')+'</span>' : '')\n      + (v.operator&&v.operator!=='SIM' ? '<br><span style=\"color:#7D8FA3;font-size:11px\">'+esc(v.operator)+'</span>':'');\n"
);

replaceExact(
  'test API stop-side exports',
  'inferVehicleJourneyPattern,inferredRouteEvidence,inferredRouteScanMatch,stopSelectionCandidates,stopSelectionNeedsChoice,savedOriginSource,ukDateTimeParts',
  'inferVehicleJourneyPattern,inferredRouteEvidence,inferredRouteScanMatch,authoritativeDiscoveredStopId,likelyOppositeStopPair,stopSelectionCandidates,stopSelectionNeedsChoice,matchTimetableStop,visualVehiclePosition,savedOriginSource,ukDateTimeParts'
);

if(source===original) throw new Error('Stop-side hardening patch made no changes');
fs.writeFileSync(busPath,source,'utf8');
fs.writeFileSync('VERSION',version+'\n','utf8');

const packagePath='kerbside-backend/package.json';
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
if(!pkg.scripts||typeof pkg.scripts!=='object') throw new Error('kerbside-backend/package.json has no scripts object');
if(!String(pkg.scripts.check||'').includes('tests/stop-side-regression.mjs')){
  pkg.scripts.check=String(pkg.scripts.check||'')+' && node --check tests/stop-side-regression.mjs';
}
pkg.scripts['test:stop-side']='node tests/stop-side-regression.mjs';
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n','utf8');

console.log(`Applied Kerbside stop-side accuracy hardening build ${version}.`);
