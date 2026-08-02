from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, replacement: str, label: str) -> str:
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f"{label}: start marker not found")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f"{label}: end marker not found")
    if text.find(start, start_index + len(start)) >= 0:
        raise SystemExit(f"{label}: start marker is not unique")
    return text[:start_index] + replacement + text[end_index:]


bus_path = Path('bus.html')
bus = bus_path.read_text(encoding='utf-8')

bus = replace_once(
    bus,
    "const APP_VERSION = '0.6.15';",
    "const APP_VERSION = '0.6.16';",
    'browser version',
)

old_trip_match = """function tripRefMatches(a,b){
  const A=String(a||'').trim(), B=String(b||'').trim();
  return !!A && !!B && A===B;
}
"""
new_trip_match = """function compactTripRef(value){
  return String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
}
function meaningfulTripTokens(value){
  return String(value||'').trim().toLowerCase().split(/[^a-z0-9]+/)
    .filter(token=>token.length>=8 && /[a-z]/.test(token) && /[0-9]/.test(token));
}
function tripRefMatches(a,b){
  const A=String(a||'').trim(), B=String(b||'').trim();
  if(!A || !B) return false;
  if(A===B) return true;
  const compactA=compactTripRef(A), compactB=compactTripRef(B);
  if(!compactA || !compactB) return false;
  if(compactA===compactB) return true;
  const shorter=compactA.length<=compactB.length?compactA:compactB;
  const longer=shorter===compactA?compactB:compactA;
  if(shorter.length>=12 && (longer.startsWith(shorter) || longer.endsWith(shorter))) return true;
  const tokensA=meaningfulTripTokens(A), tokensB=new Set(meaningfulTripTokens(B));
  return tokensA.some(token=>tokensB.has(token));
}
function timetableDirection(value){
  const direction=String(value||'').trim().toLowerCase();
  if(direction==='0' || direction.startsWith('in')) return 'in';
  if(direction==='1' || direction.startsWith('out')) return 'out';
  return 'unknown';
}
"""
bus = replace_once(bus, old_trip_match, new_trip_match, 'trip reference matching')

old_pattern_lookup = """function timetablePatternRecord(journey){
  const tt=S.timetable;
  if(!tt||!journey||!tt.tripPatterns) return null;
  const id=tt.tripPatterns[String(journey)]; if(!id) return null;
  if(PATTERN_CACHE.has(id)) return PATTERN_CACHE.get(id);
"""
new_pattern_lookup = """function timetablePatternRecord(journey){
  const tt=S.timetable;
  if(!tt||!journey||!tt.tripPatterns) return null;
  const journeyKey=String(journey), aliasKey='trip:'+journeyKey;
  let id=tt.tripPatterns[journeyKey];
  if(!id){
    if(PATTERN_CACHE.has(aliasKey)) id=PATTERN_CACHE.get(aliasKey)||null;
    else{
      const matches=Object.keys(tt.tripPatterns).filter(ref=>tripRefMatches(ref,journeyKey));
      id=matches.length===1?tt.tripPatterns[matches[0]]:null;
      PATTERN_CACHE.set(aliasKey,id||'');
    }
  }
  if(!id) return null;
  if(PATTERN_CACHE.has(id)) return PATTERN_CACHE.get(id);
"""
bus = replace_once(bus, old_pattern_lookup, new_pattern_lookup, 'pattern alias lookup')

matching_block = """function newLiveDiagnostics(gate){
  return {
    gate:!!gate,received:S.vehicles.size,recent:0,nearby:0,route:0,direction:0,
    approaching:0,confidence:0,recovered:0,shown:0,
    rejected:{stale:0,range:0,passed:0,route:0,destination:0,direction:0,away:0,confidence:0}
  };
}
function rejectLive(diagnostics,reason){
  if(diagnostics&&diagnostics.rejected&&reason in diagnostics.rejected) diagnostics.rejected[reason]++;
}
function relevant(){
  if(!S.stop){ S.liveDiag=null; return []; }
  S.filterFellBack=false;
  const gated=servingReady();
  let diagnostics=newLiveDiagnostics(gated);
  let out=collect(gated,diagnostics);
  // Only use the close-range fallback when no authoritative timetable stop
  // exists. A matched stop instead uses resilient timetable-linked recovery.
  if(!out.length && gated && !S.ttStop){
    diagnostics=newLiveDiagnostics(false);
    out=collect(false,diagnostics);
    S.filterFellBack=out.length>0;
  }
  diagnostics.shown=out.length;
  S.liveDiag=diagnostics;
  return out;
}
function collect(gate,diagnostics){
  const out=[], now=Date.now();
  for(const v of S.vehicles.values()){
    const age=now-v.ts;
    if(age>MAX_AGE_MS){ rejectLive(diagnostics,'stale'); continue; }
    if(diagnostics) diagnostics.recent++;
    const d=dist(v.lat,v.lon,S.stop.lat,S.stop.lon), far=d>MAX_VEH_DIST;
    if(d>(gate?FAR_VEH_DIST:1300)){ rejectLive(diagnostics,'range'); continue; }
    if(diagnostics) diagnostics.nearby++;

    const evidence=routeEvidence(v.line,v.dest,v.journey);
    const geometry=journeyGeometry(v,S.stop);
    if(geometry && geometry.passed){ rejectLive(diagnostics,'passed'); continue; }
    // The expanded search area remains exact-only. This prevents a vehicle
    // on another branch of a long route being attached to this stop.
    if(far && (!gate || !evidence.journeyMatch)){ rejectLive(diagnostics,'route'); continue; }

    const strength=geometry && geometry.remaining>80 ? 2 : approachStrength(v,S.stop);
    if(gate && evidence.score<2){ rejectLive(diagnostics,'route'); continue; }
    if(!gate && !(d<260 || (d<1300 && strength>=1))){ rejectLive(diagnostics,'route'); continue; }
    if(diagnostics) diagnostics.route++;

    // Calculate the timetable-linked estimate before direction and bearing
    // gates. Exact journey geometry and a plausible scheduled call are more
    // reliable than a straight-line town-centre or compass inference.
    const est=estimate(v,S.stop);
    const scheduleBacked=!!(est.schedule && evidence.score>=4);
    const trustedJourney=!!(evidence.journeyMatch || geometry);
    const scheduledDir=timetableDirection(est.schedule&&est.schedule.direction);
    const candidateDest=v.dest || (est.schedule&&est.schedule.head) || '';

    if(S.destFilter && destinationSimilarity(candidateDest,S.destFilter)<.75){
      rejectLive(diagnostics,'destination'); continue;
    }

    const dir=inferDirection(v);
    if(S.dir!=='all'){
      const timetableContradicts=scheduledDir!=='unknown' && scheduledDir!==S.dir;
      const liveDirectionOk=dir===S.dir || dir==='unknown';
      const timetableDirectionOk=scheduledDir===S.dir;
      if(timetableContradicts || (!liveDirectionOk && !timetableDirectionOk && !trustedJourney)){
        rejectLive(diagnostics,'direction'); continue;
      }
    }
    if(diagnostics) diagnostics.direction++;

    if(S.hideAway && strength<0 && d>100 && !trustedJourney && !scheduleBacked){
      rejectLive(diagnostics,'away'); continue;
    }
    if(diagnostics) diagnostics.approaching++;

    if(est.confidence==='low'){
      const recoverable=trustedJourney || (scheduleBacked && d<=MAX_VEH_DIST);
      if(!recoverable && (!gate || d>500)){ rejectLive(diagnostics,'confidence'); continue; }
    }
    if(far && !est.evidence.journeyMatch){ rejectLive(diagnostics,'route'); continue; }
    if(diagnostics) diagnostics.confidence++;

    const directionDisagreed=S.dir!=='all' && dir!==S.dir && dir!=='unknown';
    const recovered=!!((trustedJourney || scheduleBacked) && (strength<0 || directionDisagreed || est.confidence==='low'));
    if(recovered && diagnostics) diagnostics.recovered++;
    const match=geometry?'journey path':evidence.journeyMatch?'exact journey':scheduleBacked?'timetable linked':'route evidence';
    out.push({
      v,dir,app:strength>=0,strength,secs:est.secs,metres:est.metres,
      routeMetres:est.routeMetres,geometry:est.geometry,confidence:est.confidence,
      spread:est.spread,evidence:est.evidence,schedule:est.schedule,recovered,match
    });
  }
  out.sort((a,b)=>a.secs-b.secs);
  const limited=out.slice(0,25);
  if(diagnostics) diagnostics.shown=limited.length;
  return limited;
}

function renderLiveDiagnostics(){
  const el=$('liveDiagnostics');
  if(!el) return;
  if(!S.origin || !S.stop){
    el.textContent='Choose a location and stop to see why live buses are included or filtered out.';
    return;
  }
  const d=S.liveDiag;
  if(!d){ el.textContent='Waiting for the first live matching pass.'; return; }
  const stages=[
    ['received',d.received],['recent',d.recent],['within range',d.nearby],
    ['route evidence',d.route],['direction',d.direction],['approaching',d.approaching],
    ['confidence',d.confidence],['recovered',d.recovered],['shown',d.shown]
  ];
  const rejectionLabels={stale:'stale',range:'outside range',passed:'already passed',route:'route/journey',destination:'destination',direction:'direction',away:'heading away',confidence:'confidence'};
  const rejected=Object.entries(d.rejected||{}).filter(([,value])=>value>0)
    .map(([reason,value])=>value+' '+rejectionLabels[reason]).join(' · ');
  const upstreamHidden=(Number(S.feedStale)||0)+(Number(S.feedUnknownAge)||0);
  el.innerHTML='<div class="diag-title">Live matching for this stop</div><div class="diag-grid">'
    +stages.map(([label,value])=>'<span><b>'+value+'</b><small>'+esc(label)+'</small></span>').join('')
    +'</div><div class="diag-note">Counts narrow from fresh BODS positions to the buses shown for this stop. '
    +(d.gate?'Official timetable stop rules are active. ':'Nearby fallback rules are active. ')
    +(d.recovered?'Recovered buses were kept because an exact journey, route path or matching scheduled call outweighed weaker bearing or town-centre direction evidence. ':'')
    +(rejected?'<br><b>Filtered:</b> '+esc(rejected)+'. ':'')
    +(upstreamHidden?'<br><b>Hidden before matching:</b> '+upstreamHidden+' stale or timestamp-invalid BODS positions.':'')
    +'</div>';
}

"""
bus = replace_between(bus, 'function newLiveDiagnostics(gate){', 'function renderDests(){', matching_block, 'live matching block')

schedule_block = """function scheduleLiveReason(schedule){
  if(S.demo) return 'simulator only';
  if(S.feedFallback) return 'live feed delayed';
  const now=Date.now();
  const active=[...S.vehicles.values()].filter(v=>now-v.ts<=MAX_AGE_MS);
  if(!active.length) return 'operator GPS unavailable';
  const sameLine=active.filter(v=>String(v.line)===String(schedule.line));
  if(!sameLine.length) return 'no GPS matched';
  const sameBranch=sameLine.filter(v=>!schedule.head || !v.dest || destinationSimilarity(v.dest,schedule.head)>=.34);
  if(!sameBranch.length) return 'GPS branch uncertain';
  if(schedule.trip && sameBranch.some(v=>tripRefMatches(schedule.trip,v.journey))) return 'GPS received · filtered';
  return 'journey uncertain';
}
function scheduledBoardRows(liveRows){
  if(!S.ttStop) return [];
  const now=Date.now(), end=now+3*3600000, claimed=new Set(), seen=new Set();
  liveRows.forEach(r=>{ if(r.schedule) claimed.add(scheduleKey(r.schedule)); });
  return timetableRows(new Date(now)).filter(r=>{
    if(r.at<now-60000 || r.at>end) return false;
    if(S.destFilter && r.head && destinationSimilarity(r.head,S.destFilter)<.75) return false;
    const rowDir=timetableDirection(r.direction);
    if(S.dir!=='all' && rowDir!=='unknown' && rowDir!==S.dir) return false;
    const key=scheduleKey(r);
    if(claimed.has(key) || seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b)=>a.at-b.at).slice(0,36)
    .map(schedule=>({kind:'scheduled',schedule,secs:Math.max(0,(schedule.at-now)/1000),liveReason:scheduleLiveReason(schedule)}));
}
"""
bus = replace_between(bus, 'function scheduledBoardRows(liveRows){', 'function liveTimingLabel(r){', schedule_block, 'scheduled row matching')

scheduled_render = """function renderScheduledRow(r){
  const s=r.schedule, mins=Math.max(0,Math.round(r.secs/60)), due=mins<=1;
  const reason=r.liveReason||'no live match';
  return '<div class="dep schedule-only" aria-label="Scheduled '+esc(s.line)+' to '+esc(s.head||'destination unknown')+' · '+esc(reason)+'">'
    +'<span class="route">'+esc(s.line)+'</span>'
    +'<span style="min-width:0"><span class="dest">'+esc(s.head||'Destination unknown')+'</span><span class="deprow2">'
    +'<span class="chip schedule-source">scheduled</span><span class="chip">'+esc(reason)+'</span><span class="chip">'+esc(formatClock(s.at))+'</span></span></span>'
    +'<span class="eta scheduled">'+(due?'due':mins)+'<small>'+(due?'scheduled':'min')+'</small></span></div>';
}
"""
bus = replace_between(bus, 'function renderScheduledRow(r){', '\n\nfunction showEmpty', scheduled_render, 'scheduled row rendering')

bus = replace_once(
    bus,
    "+(r.schedule?'<span class=\"chip timing\">'+esc(liveTimingLabel(r))+'</span>':'')\n+(tight?'<span class=\"chip tight\">Tight</span>':'')",
    "+(r.recovered?'<span class=\"chip timing\" title=\"Kept live because stronger timetable or journey evidence overruled weak direction or bearing evidence.\">GPS recovered</span>':'')\n+(r.schedule?'<span class=\"chip timing\">'+esc(liveTimingLabel(r))+'</span>':'')\n+(tight?'<span class=\"chip tight\">Tight</span>':'')",
    'recovered live badge',
)

bus = replace_once(
    bus,
    "Positions older than two minutes are labelled GPS delayed and retained only until four minutes old so irregular operator updates do not make an approaching bus vanish immediately. Kerbside periodically scans up to 18 km around the selected stop, but buses beyond the normal nearby area appear only when their exact live journey is scheduled to call there.",
    "Positions older than two minutes are labelled GPS delayed and retained only until four minutes old so irregular operator updates do not make an approaching bus vanish immediately. Kerbside periodically scans up to 18 km around the selected stop, but buses beyond the normal nearby area appear only when their exact live journey is scheduled to call there. Version 0.6.16 also recovers timetable-linked GPS vehicles when exact route or scheduled-call evidence is stronger than a temporary bearing or town-centre direction estimate, and the board explains why each remaining timetable row has no live match.",
    'GPS settings explanation',
)

bus_path.write_text(bus, encoding='utf-8')

package_path = Path('kerbside-backend/package.json')
package = package_path.read_text(encoding='utf-8')
package = replace_once(package, '"version": "0.6.15"', '"version": "0.6.16"', 'package version')
package_path.write_text(package, encoding='utf-8')

readme_path = Path('kerbside-backend/README.md')
readme = readme_path.read_text(encoding='utf-8')
readme_anchor = "Kerbside 0.6.15 adds exact live journey progress. Tapping a timetable-matched vehicle shows its ordered stops, passed stops, next stop, selected-stop position, stops remaining and percentage through the journey. The national builder now retains optional GTFS `shapes.txt` geometry and stop metadata. Kerbside draws the map route only when that exact journey has an authoritative GTFS shape; older or shape-less patterns continue to support matching but never produce a guessed road line.\n"
readme_addition = readme_anchor + "\nKerbside 0.6.16 improves live-GPS recovery. It normalises compatible SIRI and timetable journey references, resolves uniquely matching route-pattern aliases, and lets exact journey geometry or a plausible scheduled call override weaker straight-line bearing and town-centre direction inferences. Official timetable direction still blocks a contradictory journey. The live diagnostics panel now reports rejection reasons and recovered vehicles, while each schedule-only row explains whether no GPS was received, no vehicle matched the route, the branch was uncertain, or a received position was filtered.\n"
readme = replace_once(readme, readme_anchor, readme_addition, 'README release note')
readme_path.write_text(readme, encoding='utf-8')

test_path = Path('kerbside-backend/tests/browser-regression.mjs')
test = test_path.read_text(encoding='utf-8')
test = replace_once(
    test,
    "assert.match(busSource, /progress\\.pattern\\.shape/);",
    "assert.match(busSource, /progress\\.pattern\\.shape/);\nassert.match(busSource, /const APP_VERSION = '0\\.6\\.16'/);\nassert.match(busSource, /function meaningfulTripTokens\\(value\\)/);\nassert.match(busSource, /function timetableDirection\\(value\\)/);\nassert.match(busSource, /diagnostics\\.recovered\\+\\+/);\nassert.match(busSource, /function scheduleLiveReason\\(schedule\\)/);\nassert.match(busSource, /GPS recovered/);\nassert.match(busSource, /operator GPS unavailable/);",
    'browser source assertions',
)
test = replace_once(test, "includes('app 0.6.15')", "includes('app 0.6.16')", 'browser visible version assertion')
test_path.write_text(test, encoding='utf-8')

print('Prepared Kerbside 0.6.16 live GPS recovery release.')
