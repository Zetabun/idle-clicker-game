from pathlib import Path
import re

R=Path(__file__).resolve().parents[2]
B=R/'bus.html'; T=R/'kerbside-backend/tests/browser-regression.mjs'; D=R/'kerbside-backend/README.md'
P=R/'kerbside-backend/package.json'; W=R/'kerbside-backend/src/worker.js'; WT=R/'kerbside-backend/test/worker.test.js'

def rep(s,a,b,n):
 c=s.count(a)
 if c!=1: raise SystemExit(f'{n}: {c}')
 return s.replace(a,b,1)

def sub(s,p,b,n):
 s,c=re.subn(p,b,s,count=1,flags=re.S)
 if c!=1: raise SystemExit(f'{n}: {c}')
 return s

s=B.read_text()
s=rep(s,"const APP_VERSION = '0.6.48';","const APP_VERSION = '0.6.49';",'version')
s=rep(s,".chip.route-scan{border-color:rgba(92,143,189,.55);background:rgba(92,143,189,.1);color:#A9C9E6}\n",
      ".chip.route-scan{border-color:rgba(92,143,189,.55);background:rgba(92,143,189,.1);color:#A9C9E6}\n.chip.direction-gps{border-color:rgba(63,217,164,.5);background:rgba(63,217,164,.08);color:#8CE8C6}\n.chip.gps-lost{border-color:rgba(255,122,122,.5);background:rgba(255,122,122,.08);color:#FFAAAA}\n",'chip css')
s=rep(s,"const ROUTE_SCAN_PATTERN_LIMIT = 36;\n","const ROUTE_SCAN_PATTERN_LIMIT = 36;\nconst CORRIDOR_TAG_GRACE_MS = 5*60*1000;\nconst GPS_RESULT_GRACE_MS = 6*60*1000;\n",'constants')

s=rep(s,"function timetablePatternRecord(journey){\n  const tt=S.timetable;\n  if(!tt||!journey||!tt.tripPatterns) return null;\n  const journeyKey=String(journey), aliasKey='trip:'+journeyKey;\n  let id=tt.tripPatterns[journeyKey];\n  if(!id){\n",
"function timetablePatternRecord(journey,preferredPatternId){\n  const tt=S.timetable;\n  if(!tt||!tt.tripPatterns) return null;\n  const journeyKey=String(journey||''), aliasKey='trip:'+journeyKey;\n  let id=String(preferredPatternId||'')||tt.tripPatterns[journeyKey];\n  if(!id&&journeyKey){\n",'pattern id')
s=rep(s,"  const pattern=timetablePatternRecord(vehicleJourneyRef(v));\n","  const pattern=timetablePatternRecord(v.progressTrip||vehicleJourneyRef(v),v.progressPattern);\n",'geometry progress ref')
s=rep(s,"function journeyProgress(v){\n  const pattern=timetablePatternRecord(vehicleJourneyRef(v));\n","function journeyProgress(v){\n  const pattern=timetablePatternRecord(v&&v.progressTrip||vehicleJourneyRef(v),v&&v.progressPattern);\n",'progress ref')

s=rep(s,"  v.corridorTrip=match.trip; v.corridorTracked=true; v.corridorRemaining=remaining;\n",
      "  v.corridorTrip=match.trip; v.corridorTracked=true; v.corridorRemaining=remaining; v.corridorConfirmedAt=Date.now();\n",'corridor time')
s=rep(s,"  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads,fetchLive,ingest,relevant,liveState:S,pointAlongPattern,vehicleJourneyRef,routeScanPlans,matchRouteScanVehicle,pollRouteCorridor};\n",
      "  window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads,fetchLive,ingest,relevant,liveState:S,pointAlongPattern,vehicleJourneyRef,routeScanPlans,matchRouteScanVehicle,pollRouteCorridor,journeyProgress,gpsMovementDirection};\n",'test api')
s=rep(s,"    if(prev&&prev.journey&&v.journey&&prev.journey!==v.journey){ delete rec.routeProjection; delete rec.corridorTrip; delete rec.corridorRemaining; }\n    if(!v.corridorTracked){ delete rec.corridorTrip; delete rec.corridorRemaining; }\n    Object.assign(rec, v);\n",
"    const sameJourney=!prev||!prev.journey||!v.journey||prev.journey===v.journey;\n    const keepCorridor=!!(prev&&!v.corridorTracked&&sameJourney&&prev.corridorTrip&&now-Number(prev.corridorConfirmedAt||0)<=CORRIDOR_TAG_GRACE_MS);\n    const corridor=keepCorridor?{trip:prev.corridorTrip,remaining:prev.corridorRemaining,at:prev.corridorConfirmedAt}:null;\n    if(prev&&prev.journey&&v.journey&&prev.journey!==v.journey){ delete rec.routeProjection; delete rec.corridorTrip; delete rec.corridorRemaining; delete rec.corridorConfirmedAt; }\n    Object.assign(rec, v);\n    if(corridor){ rec.corridorTrip=corridor.trip; rec.corridorRemaining=corridor.remaining; rec.corridorConfirmedAt=corridor.at; rec.corridorTracked=true; }\n",'corridor persistence')
s=rep(s,"    if(now - v.ts > MAX_AGE_MS) S.vehicles.delete(id);\n","    if(now-v.ts>MAX_AGE_MS+GPS_RESULT_GRACE_MS) S.vehicles.delete(id);\n",'vehicle retention')

# Hard direction uses only sustained GPS movement; bearing remains display evidence.
s=rep(s,"function inferDirection(v){\n","function gpsMovementDirection(v){\n  if(!S.anchor||!v||!Array.isArray(v.hist)||v.hist.length<2) return 'unknown';\n  const a=v.hist[0],b=v.hist[v.hist.length-1];\n  if(dist(a.lat,a.lon,b.lat,b.lon)<=60) return 'unknown';\n  const d0=dist(a.lat,a.lon,S.anchor.lat,S.anchor.lon),d1=dist(b.lat,b.lon,S.anchor.lat,S.anchor.lon);\n  return Math.abs(d0-d1)>40?(d1<d0?'in':'out'):'unknown';\n}\nfunction inferDirection(v){\n",'gps movement direction')

# Resolve the matched timetable trip before geometry so aliased live refs can use the direct pattern id.
s=rep(s,"    const journeyRef=vehicleJourneyRef(v), evidence=routeEvidence(v.line,v.dest,journeyRef);\n    const geometry=journeyGeometry(v,S.stop);\n",
"    const journeyRef=vehicleJourneyRef(v), evidence=routeEvidence(v.line,v.dest,journeyRef);\n    const matchedRow=evidence.matchedTrip?timetableRowsForLine(v.line,new Date()).find(row=>String(row.trip)===String(evidence.matchedTrip)):null;\n    v.progressTrip=evidence.matchedTrip||v.corridorTrip||v.journey||'';\n    v.progressPattern=String(matchedRow&&matchedRow.pattern||'');\n    const geometry=journeyGeometry(v,S.stop);\n",'matched progress row')

old="""    const dir=inferDirection(v);
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
"""
new="""    const dir=inferDirection(v), gpsMoveDir=gpsMovementDirection(v);
    if(S.dir!=='all'){
      const timetableContradicts=scheduledDir!=='unknown' && scheduledDir!==S.dir;
      const gpsContradicts=gpsMoveDir!=='unknown' && gpsMoveDir!==S.dir;
      if(timetableContradicts || gpsContradicts){ rejectLive(diagnostics,'direction'); continue; }
    }
    if(gpsMoveDir!=='unknown'&&scheduledDir!=='unknown'&&gpsMoveDir!==scheduledDir){ rejectLive(diagnostics,'direction'); continue; }
    if(diagnostics) diagnostics.direction++;

    if(S.hideAway && strength<0 && d>100){
      rejectLive(diagnostics,'away'); continue;
    }
"""
s=rep(s,old,new,'strict direction')

old="""    out.push({
      v,dir,app:strength>=0,strength,secs:est.secs,metres:est.metres,
      routeMetres:est.routeMetres,geometry:est.geometry,confidence:est.confidence,
      spread:est.spread,evidence:est.evidence,schedule:est.schedule,recovered,match
    });
"""
new="""    if(est.schedule){ v.progressTrip=est.schedule.trip||v.progressTrip; v.progressPattern=String(est.schedule.pattern||v.progressPattern||''); }
    const namedAnchor=S.anchor&&!S.anchor.synthetic?S.anchor.name:'';
    const shownDir=gpsMoveDir!=='unknown'?gpsMoveDir:scheduledDir!=='unknown'?scheduledDir:dir;
    const directionWord=shownDir==='in'?(namedAnchor?'into '+namedAnchor:'inbound'):shownDir==='out'?(namedAnchor?'out of '+namedAnchor:'outbound'):'direction unclear';
    const directionLabel=(gpsMoveDir!=='unknown'?'GPS movement: ':scheduledDir!=='unknown'?'Journey: ':dir!=='unknown'?'Live: ':'')+directionWord;
    const row={
      v,dir:shownDir,app:strength>=0,strength,secs:est.secs,metres:est.metres,
      routeMetres:est.routeMetres,geometry:est.geometry,confidence:est.confidence,
      spread:est.spread,evidence:est.evidence,schedule:est.schedule,recovered,match,directionLabel
    };
    v.lastShownStopId=String(S.stop.id); v.lastShownAt=now; v.lastShownArrivalAt=now+Math.max(0,row.secs)*1000;
    v.lastShownSnapshot={...row,v:null};
    out.push(row);
"""
s=rep(s,old,new,'row snapshot')

# Hold a previously verified row when the operator feed pauses, but never show a stale countdown.
s=rep(s,"    if(age>MAX_AGE_MS){ rejectLive(diagnostics,'stale'); continue; }\n",
"    if(age>MAX_AGE_MS){\n      const held=v.lastShownSnapshot&&v.lastShownStopId===String(S.stop.id)&&now-Number(v.lastShownAt||0)<=GPS_RESULT_GRACE_MS&&Number(v.lastShownArrivalAt||0)>=now-3*60000;\n      if(held){ out.push({...v.lastShownSnapshot,v,secs:Math.max(0,(v.lastShownArrivalAt-now)/1000),gpsLost:true,confidence:'low',recovered:false}); }\n      else rejectLive(diagnostics,'stale');\n      continue;\n    }\n",'stale row grace')

s=rep(s,"      const age=Date.now()-r.v.ts, gpsFresh=age<=GPS_FRESH_MS, gpsAge=formatPositionAge(age);\n      const due=gpsFresh && r.confidence!=='low' && mins<=1;\n",
"      const age=Date.now()-r.v.ts, gpsLost=!!r.gpsLost, gpsFresh=!gpsLost&&age<=GPS_FRESH_MS, gpsAge=formatPositionAge(age);\n      const due=!gpsLost&&gpsFresh&&r.confidence!=='low'&&mins<=1;\n",'lost state')
s=rep(s,"      const dirChip=S.destFilter?fmtDist(r.metres)+' away':r.dir==='in'?'→ '+namedAnchor:r.dir==='out'?'← Outbound':'Direction unclear';\n",
      "      const dirChip=r.directionLabel||(S.destFilter?fmtDist(r.metres)+' away':r.dir==='in'?'→ '+namedAnchor:r.dir==='out'?'← Outbound':'Direction unclear');\n",'direction label')
s=rep(s,"      const gpsLabel=gpsFresh?'live GPS':'GPS delayed';\n      const gpsHelp=gpsFresh?'Fresh vehicle position from BODS':'Last confirmed BODS position is over two minutes old; retained briefly while waiting for the next report.';\n      const etaText=due?'due':((!gpsFresh||r.confidence==='low')?'~':'')+mins;\n",
"      const gpsLabel=gpsLost?'GPS signal lost':gpsFresh?'live GPS':'GPS delayed';\n      const gpsHelp=gpsLost?'The operator feed stopped reporting this previously verified bus. Kerbside is holding the row briefly without a live countdown.':gpsFresh?'Fresh vehicle position from BODS':'Last confirmed BODS position is over two minutes old; retained briefly while waiting for the next report.';\n      const etaText=gpsLost?'—':due?'due':((!gpsFresh||r.confidence==='low')?'~':'')+mins;\n",'lost labels')
s=rep(s,"        +'<span class=\"chip'+(!S.destFilter&&r.dir==='in'?' in':'')+'\">'+esc(dirChip)+'</span>'\n",
      "        +'<span class=\"chip direction-gps'+(!S.destFilter&&r.dir==='in'?' in':'')+'\">'+esc(dirChip)+'</span>'\n",'direction css')
s=rep(s,"        +'<span class=\"chip '+(gpsFresh?'live-gps':'gps-delayed')+'\" title=\"'+esc(gpsHelp)+'\">'+gpsLabel+'</span>'\n",
      "        +'<span class=\"chip '+(gpsLost?'gps-lost':gpsFresh?'live-gps':'gps-delayed')+'\" title=\"'+esc(gpsHelp)+'\">'+gpsLabel+'</span>'\n",'lost css')
s=rep(s,"        +'<span class=\"eta'+(due?' due':'')+'\">'+etaText+'<small>'+(due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')+'</small></span></button>'\n",
      "        +'<span class=\"eta'+(due?' due':'')+'\">'+etaText+'<small>'+(gpsLost?'last seen':due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')+'</small></span></button>'\n",'lost eta')
s=rep(s,"    ['Heading',isFinite(v.bearing)?compass(v.bearing):'unknown'],\n    ['Route evidence',r.evidence?r.evidence.label:'unverified'],\n",
      "    ['Heading',isFinite(v.bearing)?compass(v.bearing):'unknown'],\n    ['Travel direction',r.directionLabel||'direction unclear'],\n    ['GPS state',r.gpsLost?'signal lost · countdown paused':'position active'],\n    ['Route evidence',r.evidence?r.evidence.label:'unverified'],\n",'detail facts')

# Clear stop-specific retained evidence.
s=rep(s,"    S.routeScanBoxes=0; S.routeScanPatterns=0; S.routeScanVehicles=0; S.routeScanError='';\n    S.destFilter=null; S.selected=null; S.manualStop=manual===true;\n",
"    S.routeScanBoxes=0; S.routeScanPatterns=0; S.routeScanVehicles=0; S.routeScanError='';\n    for(const vehicle of S.vehicles.values()){ delete vehicle.lastShownSnapshot; delete vehicle.lastShownStopId; delete vehicle.lastShownAt; delete vehicle.lastShownArrivalAt; delete vehicle.corridorTrip; delete vehicle.corridorRemaining; delete vehicle.corridorConfirmedAt; vehicle.corridorTracked=false; }\n    S.destFilter=null; S.selected=null; S.manualStop=manual===true;\n",'stop reset')

B.write_text(s)
P.write_text(rep(P.read_text(),'\"version\": \"0.6.48\"','\"version\": \"0.6.49\"','package'))
W.write_text(rep(W.read_text(),"version: '0.6.48'","version: '0.6.49'",'worker'))
WT.write_text(rep(WT.read_text(),"body.version, '0.6.48'","body.version, '0.6.49'",'worker test'))

r=D.read_text(); a='Kerbside 0.6.48 adds bounded timetable-guided route-corridor GPS discovery.'
pos=r.find(a)
if pos<0: raise SystemExit('README anchor')
end=r.find('\n',pos)
note="\n\nKerbside 0.6.49 prevents verified GPS results from disappearing during short operator-feed gaps and makes ETA direction checks stricter. Route-scan trip identity now survives ordinary nearby refreshes for five minutes. A previously verified row can remain for up to six minutes as `GPS signal lost`, but its live countdown is removed. Sustained GPS movement that conflicts with the selected town direction, the matched timetable direction, or movement towards the stop now rejects the live ETA. The result row states whether direction comes from GPS movement or the matched journey. Journey progress now resolves through the timetable trip and direct pattern ID retained on the live vehicle, allowing aliased journey references to display the ordered stop timeline."
r=r[:end]+note+r[end:]; D.write_text(r)

# Regression: version, static guarantees, and one runtime scenario.
t=T.read_text(); t=rep(t,"const APP_VERSION = '0\\.6\\.48'","const APP_VERSION = '0\\.6\\.49'",'test version')
t=rep(t,"version: '0.6.48'","version: '0.6.49'",'health stub'); t=rep(t,'app 0.6.48','app 0.6.49','app text')
a="assert.match(busSource, /route scan<\\/span>/);\n"
t=rep(t,a,a+"assert.match(busSource, /const GPS_RESULT_GRACE_MS = 6\\*60\\*1000/);\nassert.match(busSource, /function gpsMovementDirection\\(v\\)/);\nassert.match(busSource, /GPS signal lost/);\nassert.match(busSource, /v\\.progressPattern/);\n",'static')
a="  assert.equal(corridorBoard.passedRejected,true);\n\n"
block=a+r"""  const gpsFixes = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now(),saved={stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,onlyServing:state.onlyServing,hideAway:state.hideAway,destFilter:state.destFilter,demo:state.demo,vehicles:state.vehicles,ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,timetableSource:state.timetableSource,timetableRegion:state.timetableRegion};
    const trip='gps-fix-trip',pattern='aa49gpsfixpattern0001',at=new Date(now+30*60000),mins=at.getHours()*60+at.getMinutes();
    state.stop={id:'gps-fix-stop',timetableId:'gps-fix-stop',lat:52.5,lon:-2.1,name:'GPS fix stop',d:0};state.origin={lat:52.5,lon:-2.1,label:'GPS fix'};state.anchor={lat:52.6,lon:-2.1,name:'Town Centre',synthetic:false};state.dir='in';state.onlyServing=true;state.hideAway=true;state.destFilter=null;state.demo=false;state.vehicles=new Map();state.ttStop={id:'gps-fix-stop',d:[[mins,'61','Town Centre','daily','in',trip,pattern]]};state.timetable={services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},tripPatterns:{[trip]:pattern},patterns:{[pattern]:{p:[[52.2,-2.1],[52.35,-2.1],[52.5,-2.1],[52.6,-2.1]],s:[['start','Start',52.2,-2.1],['gps-fix-stop','GPS fix stop',52.5,-2.1],['town','Town Centre',52.6,-2.1]],g:1}}};state.timetableSource='national';state.timetableRegion='west_midlands';state.timetableRun++;
    try{
      const v={id:'GPSFIX|journey|'+trip,journey:trip,line:'61',lineRef:'61',dest:'Town Centre',operator:'GPSFIX',declaredDir:'',lat:52.35,lon:-2.1,bearing:0,feedSpeed:8,ts:now,timestampKnown:true,corridorTracked:true,corridorTrip:trip,corridorRemaining:17000,corridorConfirmedAt:now,hist:[{lat:52.32,lon:-2.1,ts:now-60000},{lat:52.35,lon:-2.1,ts:now}]};api.ingest([v]);const ordinary={...v,lat:52.36,ts:now+15000,corridorTracked:false};delete ordinary.corridorTrip;delete ordinary.corridorRemaining;delete ordinary.corridorConfirmedAt;delete ordinary.hist;api.ingest([ordinary]);const live=api.relevant(),kept=state.vehicles.get(v.id),progress=api.journeyProgress(kept);kept.ts=now-5*60000;const held=api.relevant();const away={...kept,id:'away',ts:now,hist:[{lat:52.37,lon:-2.1,ts:now-60000},{lat:52.34,lon:-2.1,ts:now}],bearing:180};state.vehicles=new Map([[away.id,away]]);const wrong=api.relevant();return {corridor:kept.corridorTracked&&kept.corridorTrip===trip,live:live.length,progress:!!progress,held:held.some(r=>r.gpsLost),away:wrong.some(r=>r.v.id==='away')};
    }finally{Object.assign(state,saved);}
  });
  assert.equal(gpsFixes.corridor,true);assert.equal(gpsFixes.live,1);assert.equal(gpsFixes.progress,true);assert.equal(gpsFixes.held,true);assert.equal(gpsFixes.away,false);

"""
t=rep(t,a,block,'runtime'); T.write_text(t)
print('Prepared Kerbside 0.6.49 GPS direction, persistence and progress release')
