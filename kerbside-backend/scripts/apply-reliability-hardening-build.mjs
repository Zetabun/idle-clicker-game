#!/usr/bin/env node
import fs from 'node:fs';

const version=String(process.argv[2]||'').trim();
if(!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Usage: node apply-reliability-hardening-build.mjs <semver>');

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

replaceExact(
  'healthy-feed GPS retention grace',
  "const GPS_RESULT_GRACE_MS = 6*60*1000;\nconst LIVE_ID_COLLISION_TTL_MS = MAX_AGE_MS+GPS_RESULT_GRACE_MS;",
  "const GPS_RESULT_GRACE_MS = 6*60*1000;      // extended hold only when the overall feed is unhealthy\nconst GPS_RESULT_HEALTHY_GRACE_MS = 90*1000; // one missing vehicle on a healthy feed must not linger for ten minutes\nconst LIVE_ID_COLLISION_TTL_MS = MAX_AGE_MS+GPS_RESULT_GRACE_MS;"
);

replaceExact(
  'initialise sampled motion speed',
  "    const rec = prev || {hist:[], speed:null, cadence:null};",
  "    const rec = prev || {hist:[], speed:null, motionSpeed:null, cadence:null};"
);

replaceExact(
  'reset sampled motion speed with journey discontinuity',
  "      rec.hist=[];rec.speed=null;rec.cadence=null;delete rec.routeProjection;delete rec.stationaryAt;",
  "      rec.hist=[];rec.speed=null;rec.motionSpeed=null;rec.cadence=null;delete rec.routeProjection;delete rec.stationaryAt;"
);

replaceSection(
  'track GPS-sampled speed separately from operator velocity',
  "    const stationaryFix=!!(prev&&!journeyChanged&&!routeIdentityChanged&&!trackDiscontinuity&&reportGap>=2&&reportGap<=180&&reportMove<8);",
  "    const latest=rec.hist[rec.hist.length-1];",
  `    const stationaryFix=!!(prev&&!journeyChanged&&!routeIdentityChanged&&!trackDiscontinuity&&reportGap>=2&&reportGap<=180&&reportMove<8);
    if(prev && !journeyChanged && !routeIdentityChanged && !trackDiscontinuity && reportMove>=8){
      const dt=Math.max(1,reportGap),inst=reportMove/dt;
      if(dt<180&&reportMove<3000){
        rec.motionSpeed=rec.motionSpeed==null?inst:rec.motionSpeed*.6+inst*.4;
        rec.speed=rec.speed==null?inst:rec.speed*.6+inst*.4;
      }
      delete rec.stationaryAt;
    }
    const feedSpeed=Number(v.feedSpeed);
    if(stationaryFix){
      rec.motionSpeed=0;rec.speed=0;rec.stationaryAt=v.ts;
    }else if(isFinite(feedSpeed) && feedSpeed>=0 && feedSpeed<=35){
      // Keep display/glide speed responsive to the producer's velocity, but do
      // not mix it into motionSpeed: ETA dwell logic needs to know whether the
      // speed came from an instantaneous feed value or from distance over time.
      rec.speed = rec.speed==null ? feedSpeed : rec.speed*0.72 + feedSpeed*0.28;
    }
`
);

replaceSection(
  'avoid double-counting dwell in GPS-derived average speed',
  "function etaMotionModel(v,stop){",
  "function estimate(v, stop, evidenceOverride, geometryOverride){",
  `function etaMotionModel(v,stop){
  const remainingStops=remainingStopsToTarget(v,stop);
  const feed=Number(v&&v.feedSpeed);
  const feedMoving=Number.isFinite(feed)&&feed>=MIN_SPEED&&feed<=MAX_SPEED;
  if(feedMoving){
    // SIRI Velocity is a point-in-time speed, so future stop dwell is not in it.
    return {speed:feed,dwell:remainingStops*ETA_DWELL_SECONDS_PER_STOP,remainingStops,mode:'feed-speed',stationary:false};
  }
  const sampled=Number(v&&v.motionSpeed);
  const sampledMoving=Number.isFinite(sampled)&&sampled>=MIN_SPEED&&sampled<=MAX_SPEED;
  if(sampledMoving){
    // Distance divided by the reporting interval can already contain time spent
    // dwelling. Treat it as an interval average instead of adding every stop a
    // second time.
    return {speed:sampled,dwell:0,remainingStops,mode:'gps-average',stationary:false};
  }
  const raw=Number(v&&v.speed);
  const stationary=(Number.isFinite(feed)&&feed===0)||(Number.isFinite(sampled)&&sampled===0)||raw===0||Number(v&&v.stationaryAt)===Number(v&&v.ts);
  if(!stationary&&Number.isFinite(raw)&&raw>=MIN_SPEED&&raw<=MAX_SPEED){
    return {speed:raw,dwell:0,remainingStops,mode:'smoothed-average',stationary:false};
  }
  // lineSpeed()/DEFAULT_SPEED are learned end-to-end averages and therefore
  // already include time spent stopped. Adding dwell again double-counts it.
  const average=lineSpeed(v);
  return {speed:average,dwell:0,remainingStops,mode:'average',stationary};
}
`
);

replaceSection(
  'bound lost-GPS retention by overall feed health and use schedule fallback',
  "function retainedSnapshotRow(v,now=Date.now(),gpsLost=true){",
  "/* ------------------------------------------------------------\n   Hold-open for transient matching failures.",
  `function liveFeedHealthyForRetention(now=Date.now()){
  const last=Number(S.lastFeedAt)||0;
  const recentWindow=Math.max(45000,(Number(S.interval)||15)*3000);
  return !S.feedFallback&&!S.feedPartial&&last>0&&now-last<=recentWindow;
}
function retainedGpsGraceMs(now=Date.now()){
  return liveFeedHealthyForRetention(now)?GPS_RESULT_HEALTHY_GRACE_MS:GPS_RESULT_GRACE_MS;
}
function retainedSnapshotRow(v,now=Date.now(),gpsLost=true){
  if(!v||!v.lastShownSnapshot||!S.stop) return null;
  if(v.lastShownStopId!==String(S.stop.id)) return null;
  if(v.lastShownBoardDir!==S.dir) return null;
  if(String(v.lastShownDestFilter||'')!==String(S.destFilter||'')) return null;
  const gpsAt=Number(v.ts)||0;
  if(gpsAt&&now-gpsAt>MAX_AGE_MS+retainedGpsGraceMs(now)) return null;
  if(now-Number(v.lastShownAt||0)>GPS_RESULT_GRACE_MS) return null;
  if(Number(v.lastShownArrivalAt||0)<now-3*60000) return null;
  const row={...v.lastShownSnapshot,v,secs:Math.max(0,(v.lastShownArrivalAt-now)/1000),gpsLost,confidence:'low',recovered:!gpsLost};
  if(gpsLost){
    const fallback=row.schedule||row.matchedSchedule, scheduledAt=Number(fallback&&fallback.at);
    if(Number.isFinite(scheduledAt)){
      row.secs=Math.max(0,(scheduledAt-now)/1000);
      row.scheduleFallback=true;
    }
  }
  return row;
}
`
);

replaceExact(
  'export retention health helpers for regression coverage',
  'retainFiredAlarm,alarmRowEligible,retainedSnapshotRow,scheduleClaimedByLive',
  'retainFiredAlarm,alarmRowEligible,liveFeedHealthyForRetention,retainedGpsGraceMs,retainedSnapshotRow,scheduleClaimedByLive'
);

replaceExact(
  'lost GPS row claims a timetable departure only when using schedule fallback',
  "function claimedScheduleFor(row){ return row&&!row.gpsLost?(row.schedule||row.matchedSchedule||null):null; }",
  `function claimedScheduleFor(row){
  if(!row) return null;
  if(row.gpsLost&&!row.scheduleFallback) return null;
  return row.schedule||row.matchedSchedule||null;
}`
);

replaceExact(
  'lost GPS detail state',
  "    ['GPS state',r.gpsLost?'signal lost · countdown paused':'position active'],",
  "    ['GPS state',r.gpsLost?(r.scheduleFallback?'signal lost · scheduled fallback':'signal lost · countdown paused'):'position active'],"
);

replaceExact(
  'lost GPS detail explanation',
  "  const note=r.gpsLost\n    ? 'This row is held at the last confirmed GPS position. Its countdown, journey progress and leave alert are paused until a fresh position arrives.'",
  "  const note=r.gpsLost\n    ? (r.scheduleFallback?'GPS has stopped updating. This is still the same matched departure, so the countdown now follows its timetable while journey progress and the leave alert stay paused.':'This row is held at the last confirmed GPS position. Its countdown, journey progress and leave alert are paused until a fresh position arrives.')"
);

replaceExact(
  'lost GPS board labels and fallback ETA',
  "      const gpsLabel=gpsLost?'GPS signal lost':gpsFresh?'live GPS':'GPS delayed';\n      const gpsHelp=gpsLost?'The operator feed stopped reporting this previously verified bus. Kerbside is holding the row briefly without a live countdown.':gpsFresh?'Fresh vehicle position from BODS':'Last confirmed BODS position is over two minutes old; retained briefly while waiting for the next report.';\n      const etaText=gpsLost?'—':due?'due':((!gpsFresh||r.confidence==='low')?'~':'')+mins;",
  "      const gpsLabel=gpsLost?(r.scheduleFallback?'GPS lost · schedule':'GPS signal lost'):gpsFresh?'live GPS':'GPS delayed';\n      const gpsHelp=gpsLost?(r.scheduleFallback?'Fresh GPS stopped for this matched departure; its row is temporarily using the timetable instead of creating a duplicate scheduled bus.':'The operator feed stopped reporting this previously verified bus. Kerbside is holding the row briefly without a live countdown.'):gpsFresh?'Fresh vehicle position from BODS':'Last confirmed BODS position is over two minutes old; retained briefly while waiting for the next report.';\n      const etaText=gpsLost?(r.scheduleFallback?(mins<=1?'due':'~'+mins):'—'):due?'due':((!gpsFresh||r.confidence==='low')?'~':'')+mins;"
);

replaceExact(
  'lost GPS ETA suffix',
  "+'<span class=\"eta'+(due?' due':'')+'\">'+etaText+'<small>'+(gpsLost?'last seen':due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')+'</small></span></button>'",
  "+'<span class=\"eta'+(due?' due':'')+'\">'+etaText+'<small>'+(gpsLost?(r.scheduleFallback?(mins<=1?'scheduled':'min'):'last seen'):due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')+'</small></span></button>'"
);

replaceSection(
  'classify active and upcoming disruption timing',
  "function disruptionActive(situation,now){",
  "function boardPatternRecords(now){",
  `function disruptionState(situation,now){
  const moment=isFinite(now)?Number(now):Date.now();
  const from=situation&&situation.from?Date.parse(situation.from):NaN;
  const to=situation&&situation.to?Date.parse(situation.to):NaN;
  // Progress=open is not a validity guarantee. End time wins first; a planned
  // future event is relevant but is never labelled as already active.
  if(isFinite(to)&&to<moment) return 'expired';
  if(isFinite(from)&&from>moment) return situation&&situation.planned?'upcoming':'future';
  return 'active';
}
function disruptionActive(situation,now){ return disruptionState(situation,now)==='active'; }
function disruptionRelevant(situation,now){
  const state=disruptionState(situation,now);
  return state==='active'||state==='upcoming';
}
`
);

replaceSection(
  'retain line and operator pairs for disruption matching',
  "function boardPatternRecords(now){",
  "/* The anchor is whichever OSM town or city centre is nearest, scored by",
  `function addPatternService(entry,row){
  const line=String(row&&row.line||'').trim(), operator=String(row&&row.operator||'').trim();
  if(line) entry.lines.add(line);
  if(!line&&!operator) return;
  const key=routeIdentityToken(line)+'|'+routeIdentityToken(operator);
  if(!entry.services.some(service=>service.key===key)) entry.services.push({key,line,operator});
}
function boardPatternRecords(now){
  const out=new Map();
  if(!S.timetable) return out;
  for(const row of timetableRows(new Date(now))){
    if(!isFinite(row.at)||row.at<now-30*60000||row.at>now+4*3600000) continue;
    const record=timetablePatternRecord(row.trip,row.pattern);
    if(!record||!Array.isArray(record.stops)||!record.stops.length) continue;
    const existing=out.get(record.id);
    if(existing){ addPatternService(existing,row); continue; }
    const entry={record,lines:new Set(),services:[]};
    addPatternService(entry,row);
    out.set(record.id,entry);
  }
  return out;
}
`
);

replaceSection(
  'filter disruption matches by published line and comparable operator',
  "function disruptionMatches(now){",
  "const DISRUPTION_REASONS={",
  `function disruptionTokens(values){
  return [...new Set((Array.isArray(values)?values:[]).map(routeIdentityToken).filter(Boolean))];
}
function disruptionAppliesToService(situation,line,operator,requireOperator=false){
  const publishedLines=disruptionTokens(situation&&situation.lines);
  const serviceLine=routeIdentityToken(line);
  if(publishedLines.length&&(!serviceLine||!publishedLines.includes(serviceLine))) return false;
  const publishedOperators=disruptionTokens(situation&&situation.operators);
  if(!publishedOperators.length) return !requireOperator;
  const serviceOperator=routeIdentityToken(operator);
  // National timetable agencies are usually opaque OP<digits> while SIRI-SX
  // uses NOCs. An opaque id cannot prove either a match or a conflict.
  const comparable=!!serviceOperator&&!OPAQUE_AGENCY_ID.test(serviceOperator);
  if(requireOperator&&!comparable) return false;
  if(comparable&&!publishedOperators.includes(serviceOperator)) return false;
  return true;
}
function disruptionMatches(now){
  if(!disruptionFeedReady()||!S.stop) return [];
  const moment=isFinite(now)?Number(now):Date.now();
  const situations=DISRUPTIONS.situations, codes=nationalStopCodes(S.stop), found=new Map();
  const patterns=[...boardPatternRecords(moment).values()];
  const note=(position,line,operator,offset,stopName,networkOnly=false)=>{
    const situation=situations[position];
    if(!situation||!disruptionRelevant(situation,moment)) return false;
    if((line||operator)&&!disruptionAppliesToService(situation,line,operator,false)) return false;
    let entry=found.get(position);
    if(!entry){
      entry={situation,lines:new Set(),offset:null,stopName:'',state:disruptionState(situation,moment),networkOnly:false};
      found.set(position,entry);
    }
    if(line) entry.lines.add(line);
    if(networkOnly) entry.networkOnly=true;
    if(offset!=null&&(entry.offset==null||Math.abs(offset)<Math.abs(entry.offset))){
      entry.offset=offset; if(stopName) entry.stopName=stopName;
    }else if(!entry.stopName&&stopName) entry.stopName=stopName;
    return true;
  };
  for(const {record,lines,services} of patterns){
    const seq=record.stops;
    let boardIndex=-1;
    for(let i=0;i<seq.length;i++){
      if(codes.includes(String(seq[i].id).trim().toLowerCase())){ boardIndex=i; break; }
    }
    const serviceList=services&&services.length?services:[...lines].map(line=>({line,operator:''}));
    for(let i=0;i<seq.length;i++){
      const hits=DISRUPTIONS_INDEX.get(String(seq[i].id).trim().toLowerCase());
      if(!hits) continue;
      const offset=boardIndex>=0?i-boardIndex:null;
      for(const position of hits){
        if(serviceList.length){
          for(const service of serviceList) note(position,service.line,service.operator,offset,seq[i].name);
        }else note(position,'','',offset,seq[i].name);
      }
    }
  }
  const currentRoutes=knownRoutes();
  for(const code of codes){
    const hits=DISRUPTIONS_INDEX.get(code);
    if(!hits) continue;
    for(const position of hits){
      const situation=situations[position], publishedLines=disruptionTokens(situation&&situation.lines);
      if(publishedLines.length&&currentRoutes.length){
        let matched=false;
        for(const line of currentRoutes){
          if(disruptionAppliesToService(situation,line,'',false)) matched=note(position,line,'',0,S.stop.name)||matched;
        }
        if(!matched) continue;
      }else note(position,'','',0,S.stop.name);
    }
  }
  const strictServices=[];
  for(const entry of patterns){
    for(const service of entry.services||[]){
      if(service.line&&service.operator&&!OPAQUE_AGENCY_ID.test(routeIdentityToken(service.operator))) strictServices.push(service);
    }
  }
  situations.forEach((situation,position)=>{
    if((Array.isArray(situation&&situation.stops)&&situation.stops.length)||!disruptionRelevant(situation,moment)) return;
    if(!disruptionTokens(situation&&situation.lines).length||!disruptionTokens(situation&&situation.operators).length) return;
    for(const service of strictServices){
      if(disruptionAppliesToService(situation,service.line,service.operator,true)) note(position,service.line,service.operator,null,'',true);
    }
  });
  return [...found.values()].sort((a,b)=>{
    const stateRank=entry=>entry.state==='active'?0:1;
    const offsetRank=entry=>entry.offset==null?9999:Math.abs(entry.offset);
    const start=entry=>Date.parse(entry.situation&&entry.situation.from||'')||0;
    return stateRank(a)-stateRank(b)||offsetRank(a)-offsetRank(b)||start(a)-start(b)||String(a.situation.summary||'').localeCompare(String(b.situation.summary||''));
  });
}
`
);

replaceSection(
  'describe network-wide disruption fallback safely',
  "function disruptionWhereText(entry){",
  "function disruptionUntilText(situation){",
  `function disruptionWhereText(entry){
  if(entry.networkOnly) return 'Affects this service · location not supplied by publisher';
  const where=entry.stopName?esc(entry.stopName):'';
  if(entry.offset==null) return where?'Affects <b>'+where+'</b> on this route':'';
  if(entry.offset===0) return 'At <b>'+(where||'this stop')+'</b>';
  if(entry.offset<0) return 'Before your stop, at <b>'+where+'</b> — buses may arrive late';
  return '<b>'+entry.offset+' stop'+(entry.offset===1?'':'s')+'</b> after yours, at <b>'+where+'</b>';
}
`
);

replaceSection(
  'show upcoming disruption start time and UK-local timing',
  "function disruptionUntilText(situation){",
  "function renderDisruptions(){",
  `function disruptionTimingText(situation,state){
  const timing=state||disruptionState(situation,Date.now());
  const value=timing==='upcoming'?situation&&situation.from:situation&&situation.to;
  if(!value) return timing==='upcoming'?'Upcoming':'Ongoing';
  const stamp=Date.parse(value);
  if(!isFinite(stamp)) return timing==='upcoming'?'Upcoming':'Ongoing';
  const date=new Date(stamp), today=new Date();
  const sameDay=serviceDateKey(ukServiceDate(date))===serviceDateKey(ukServiceDate(today));
  const day=sameDay?'':date.toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:UK_TIME_ZONE})+' · ';
  return (timing==='upcoming'?'Starts ':'Until ')+day+formatClock(stamp);
}
`
);

replaceSection(
  'render active and upcoming disruptions distinctly',
  "function renderDisruptions(){",
  "function render(){",
  `function renderDisruptions(){
  const host=$('disruptions');
  if(!host) return;
  if(!disruptionFeedReady()){
    host.hidden=true; host.innerHTML='';
    loadDisruptions().then(data=>{ if(data&&disruptionFeedReady()) renderDisruptions(); });
    return;
  }
  if(Date.now()-DISRUPTIONS_AT>=DISRUPTIONS_REFRESH_MS) loadDisruptions();
  const matches=disruptionMatches(Date.now());
  if(!matches.length){ host.hidden=true; host.innerHTML=''; return; }
  const shown=matches.slice(0,DISRUPTIONS_MAX_SHOWN), hidden=matches.length-shown.length;
  host.hidden=false;
  host.innerHTML='<div class="disruptions-head">'
    +esc(matches.length===1?'1 disruption or planned change on your routes':matches.length+' disruptions or planned changes on your routes')+'</div>'
    +shown.map(entry=>{
      const situation=entry.situation, id=String(situation.id||''), open=DISRUPTIONS_EXPANDED.has(id), upcoming=entry.state==='upcoming';
      const routes=[...entry.lines].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
      const where=disruptionWhereText(entry);
      return '<div class="disrupt'+(situation.planned?' planned':'')+'">'
        +'<div class="disrupt-reason">'+esc(disruptionReasonLabel(situation))
        +(upcoming?' · upcoming':situation.planned?' · planned':'')+'</div>'
        +'<div class="disrupt-sum">'+esc(situation.summary||'Disruption reported')+'</div>'
        +(where?'<div class="disrupt-where">'+where+'</div>':'')
        +'<div class="disrupt-meta">'
        +(routes.length?'<span class="chip in">'+esc(routes.slice(0,6).join(', '))
          +(routes.length>6?' +'+(routes.length-6):'')+'</span>':'')
        +'<span class="chip">'+esc(disruptionTimingText(situation,entry.state))+'</span>'
        +'</div>'
        +(situation.detail?'<button class="disrupt-toggle" data-disrupt="'+esc(id)+'" aria-expanded="'+open+'">'
          +(open?'Hide detail':'Show detail')+'</button>':'')
        +(open&&situation.detail?'<div class="disrupt-detail">'+esc(situation.detail)
          +(situation.source?'<div class="disrupt-src">Reported by '+esc(situation.source)+'</div>':'')
          +'</div>':'')
        +'</div>';
    }).join('')
    +(hidden>0?'<div class="disrupt-src">'+hidden+' further disruption'+(hidden===1?'':'s')+' or planned change'+(hidden===1?'':'s')+' on these routes not shown.</div>':'');
  [...host.querySelectorAll('[data-disrupt]')].forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.disrupt;
    if(DISRUPTIONS_EXPANDED.has(id)) DISRUPTIONS_EXPANDED.delete(id); else DISRUPTIONS_EXPANDED.add(id);
    renderDisruptions();
  }));
}

`
);

replaceExact(
  'export disruption reliability helpers',
  'validDisruptionFeed,disruptionActive,disruptionMatches,disruptionReasonLabel,loadDisruptions',
  'validDisruptionFeed,disruptionState,disruptionActive,disruptionRelevant,disruptionAppliesToService,boardPatternRecords,disruptionMatches,disruptionReasonLabel,disruptionTimingText,loadDisruptions'
);

if(source===original) throw new Error('Reliability hardening patch made no changes');
fs.writeFileSync(busPath,source,'utf8');
fs.writeFileSync('VERSION',version+'\n','utf8');

const packagePath='kerbside-backend/package.json';
const pkg=JSON.parse(fs.readFileSync(packagePath,'utf8'));
if(!pkg.scripts||typeof pkg.scripts!=='object') throw new Error('kerbside-backend/package.json has no scripts object');
for(const test of ['tests/disruption-regression.mjs','tests/listing-reliability-regression.mjs']){
  if(!String(pkg.scripts.check||'').includes(test)) pkg.scripts.check=String(pkg.scripts.check||'')+' && node --check '+test;
}
pkg.scripts['test:disruptions']='node tests/disruption-regression.mjs';
pkg.scripts['test:listing-reliability']='node tests/listing-reliability-regression.mjs';
fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n','utf8');

const browserRegressionPath='kerbside-backend/tests/browser-regression.mjs';
let browserRegression=fs.readFileSync(browserRegressionPath,'utf8');
function replaceBrowserAssertion(label,oldText,newText){
  const count=browserRegression.split(oldText).length-1;
  if(count!==1) throw new Error(`${label}: expected exactly one legacy assertion, found ${count}`);
  browserRegression=browserRegression.replace(oldText,newText);
}
replaceBrowserAssertion(
  'GPS retention assertions',
  'assert.match(busSource, /const GPS_RESULT_GRACE_MS = 6\\*60\\*1000/);',
  "assert.match(busSource, /const GPS_RESULT_GRACE_MS = 6\\*60\\*1000/);\nassert.match(busSource, /const GPS_RESULT_HEALTHY_GRACE_MS = 90\\*1000/);\nassert.match(busSource, /function liveFeedHealthyForRetention\\(now=Date\\.now\\(\\)\\)/);\nassert.match(busSource, /row\\.scheduleFallback=true/);"
);
replaceBrowserAssertion(
  'schedule fallback claim assertion',
  "assert.match(busSource, /function claimedScheduleFor\\(row\\)\\{ return row&&!row\\.gpsLost\\?\\(row\\.schedule\\|\\|row\\.matchedSchedule\\|\\|null\\):null; \\}/);",
  "assert.match(busSource, /function claimedScheduleFor\\(row\\)\\{[\\s\\S]{0,180}if\\(row\\.gpsLost&&!row\\.scheduleFallback\\) return null;[\\s\\S]{0,120}return row\\.schedule\\|\\|row\\.matchedSchedule\\|\\|null;/);"
);
replaceBrowserAssertion(
  'reliability source invariants',
  'assert.match(busSource, /function boardRefreshCanRender/);',
  "assert.match(busSource, /function boardRefreshCanRender/);\nassert.match(busSource, /function disruptionState\\(situation,now\\)/);\nassert.match(busSource, /function disruptionAppliesToService\\(situation,line,operator,requireOperator=false\\)/);\nassert.match(busSource, /Affects this service · location not supplied by publisher/);\nassert.match(busSource, /mode:'feed-speed'/);\nassert.match(busSource, /mode:'gps-average'/);"
);
fs.writeFileSync(browserRegressionPath,browserRegression,'utf8');

console.log(`Applied Kerbside reliability hardening build ${version}.`);
