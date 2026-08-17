from pathlib import Path
import os, subprocess


def r(p): return Path(p).read_text(encoding='utf-8')
def w(p,v): Path(p).write_text(v,encoding='utf-8')
def x(p,a,b,n=1):
    s=r(p); c=s.count(a)
    if c!=n: raise SystemExit(f'{p}: expected {n}, found {c}: {a!r}')
    w(p,s.replace(a,b,n))
def run(*a): subprocess.run(a,check=True)

p='kerbside-journey-planner-core.js'
x(p,"const planState={installed:false,active:false,from:null,to:null,results:[],preference:'balanced',constraints:{maxChanges:1,connectionBuffer:0},saved:[],savedFocus:null,eventsReady:false,source:'',searchSeq:0,eventSeq:0,hidden:new Map(),observer:null};","const planState={installed:false,active:false,from:null,to:null,results:[],preference:'balanced',constraints:{maxChanges:1,connectionBuffer:0},saved:[],savedFocus:null,eventsReady:false,events:[],filter:null,draftTouched:false,source:'',searchSeq:0,eventSeq:0,hidden:new Map(),observer:null};")
x(p,'.plan-journey-surface{display:flex;flex-direction:column;min-height:0}.plan-results-head{padding:18px 20px 14px;border-bottom:1px solid var(--rule);background:var(--ink-2)}','.plan-journey-surface{display:flex;flex-direction:column;min-height:0;overflow:hidden}.plan-results-head{flex:0 0 auto;overflow:visible;padding:18px 20px 14px;border-bottom:1px solid var(--rule);background:var(--ink-2)}')
x(p,'.plan-results-list{flex:1;min-height:0;overflow-y:auto;padding:12px 16px 24px;overscroll-behavior:contain}','.plan-results-list{flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px 16px 24px;overscroll-behavior:contain}')
x(p,'.plan-results-head h2{margin:5px 0 0;font-size:21px}.plan-results-head p{margin:4px 0 0;color:var(--text-dim);font-size:11px}', '.plan-results-head h2{margin:5px 0 0;font-size:21px}.plan-results-head p{margin:4px 0 0;color:var(--text-dim);font-size:11px}\n.plan-event-context{display:grid;gap:7px;margin-top:11px;padding:10px 11px;border:1px solid rgb(var(--led-rgb) / .24);border-radius:10px;background:rgb(var(--led-rgb) / .045)}.plan-event-context[hidden]{display:none!important}.plan-event-context>span{color:var(--led);font-size:8.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.plan-event-list{display:flex;gap:6px;flex-wrap:wrap}.plan-event-chip{display:grid;gap:1px;min-width:180px;max-width:360px;padding:7px 9px;border:1px solid var(--rule);border-radius:8px;background:var(--ink)}.plan-event-chip b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);font-size:10px}.plan-event-chip small{color:var(--text-dim);font-size:9px;line-height:1.35}')

x(p,"function planDateValue(){return $('planJourneyDate')?.value||'';}\nfunction planReferenceDate(value=planDateValue()){const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?new Date():date;}","function planDateValue(){return $('planJourneyDate')?.value||'';}\nfunction planDateLabel(value){const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});}\nfunction planCandidateDepartureMinute(item){const value=Number(item&&item.departureMinute);return Number.isFinite(value)?value:planTimeMinutes(item&&(item.std||item.departure));}\nfunction planFilterLabel(filter=planState.filter){return filter&&filter.date?`${planDateLabel(filter.date)} · departures ${filter.start}–${filter.end}`:'';}\nfunction planReferenceDate(value=planDateValue()){const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?new Date():date;}")

insert="""function planEventDisplayRows(events,candidates,from,to,date){
  const api=window.__KERBSIDE_EVENTS__;if(!api)return[];
  const interchanges=[...new Set((candidates||[]).map(item=>planInterchangeStation(item)?.name).filter(Boolean))],places=[from&&from.name,to&&to.name,...interchanges].filter(Boolean),journey={origin:from&&from.name||'',originCrs:from&&from.crs||'',destination:to&&to.name||'',destinationCrs:to&&to.crs||'',interchanges,date},rows=[];
  for(const raw of Array.isArray(events)?events:[]){
    const event=typeof api.normalise==='function'?api.normalise(raw):raw;if(!event)continue;
    const placeRelevant=places.some(place=>typeof api.placeMatches==='function'?api.placeMatches(event.place,place):String(event.place||'').toLowerCase().includes(String(place||'').toLowerCase()));if(!placeRelevant)continue;
    let relevant=false;if(typeof api.relevance==='function')relevant=(candidates||[]).some(candidate=>{try{return !!api.relevance(event,candidate,journey);}catch(error){return false;}});
    if(!relevant){const start=Number(event.start);relevant=Number.isFinite(start)&&(candidates||[]).some(candidate=>{const dep=planCandidateDepartureMinute(candidate),arr=Number(candidate&&candidate.arrivalMinute);return dep!=null&&start>=dep-180&&start<=(Number.isFinite(arr)?arr:dep)+180;});}
    if(relevant)rows.push(event);
  }
  const seen=new Set();return rows.filter(event=>{const key=`${String(event.title||'').toLowerCase()}|${Number(event.start)}`;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>Number(a.start)-Number(b.start)).slice(0,4);
}
function renderPlanEventContext(rows=planState.events){
  const root=$('planJourneyEvents');if(!root)return;const list=Array.isArray(rows)?rows:[];if(!list.length){root.hidden=true;root.innerHTML='';return;}root.hidden=false;root.innerHTML=`<span>Match & event context</span><div class="plan-event-list">${list.map(event=>{const at=Number.isFinite(Number(event.start))?planClock(Number(event.start)):'Time TBC',football=String(event.type||'').toLowerCase()==='football'?'Football · ':'';return `<div class="plan-event-chip"><b>${esc(`${football}${event.title||'Event'}`)}</b><small>${esc(`${at}${event.place?` · ${event.place}`:''}`)}</small></div>`;}).join('')}</div>`;
}
"""
x(p,'function planEventSnapshot(events,date){',insert+'function planEventSnapshot(events,date){')

old="""function renderPlanResults(rows,{eventsReady=false}={}){
  const list=$('planJourneyResults'),summary=$('planJourneySummary'),meta=$('planJourneyMeta');if(!list)return;
  const source=planSourceLabel();
  if(!rows.length){list.innerHTML='<div class="train-empty"><strong>No matching journeys</strong><span>Try a wider time window or relax your journey constraints.</span></div>';if(summary)summary.textContent='No journeys found';if(meta)meta.textContent=`${source} · ${planConstraintLabel()} · Forecast v4`;return;}
  const visible=planVisibleResults(rows);list.innerHTML=visible.map(row=>planResultMarkup(row,rows.indexOf(row),rows)).join('');
  const from=planState.from,to=planState.to,date=planDateValue();if(summary)summary.textContent=`${from?from.name:'From'} → ${to?to.name:'To'}`;
  if(meta)meta.textContent=`${date} · ${source} · ${PLAN_PREFERENCES[planState.preference]?.label||'Balanced'} ranking · ${planConstraintLabel()} · Forecast v4${eventsReady?' + event context':''}`;
}"""
new="""function renderPlanResults(rows,{eventsReady=false}={}){
  const list=$('planJourneyResults'),summary=$('planJourneySummary'),meta=$('planJourneyMeta');if(!list)return;
  const source=planSourceLabel(),filterText=planFilterLabel();renderPlanEventContext();
  if(!rows.length){list.innerHTML='<div class="train-empty"><strong>No matching journeys</strong><span>Try a wider time window or relax your journey constraints.</span></div>';if(summary)summary.textContent='No journeys found';if(meta)meta.textContent=`${filterText?`${filterText} · `:''}${source} · ${planConstraintLabel()} · Forecast v4`;return;}
  const visible=planVisibleResults(rows);list.innerHTML=visible.map(row=>planResultMarkup(row,rows.indexOf(row),rows)).join('');
  const from=planState.from,to=planState.to;if(summary)summary.textContent=`${from?from.name:'From'} → ${to?to.name:'To'}`;
  if(meta)meta.textContent=`${filterText||planDateLabel(planDateValue())} · ${source} · ${PLAN_PREFERENCES[planState.preference]?.label||'Balanced'} ranking · ${planConstraintLabel()} · Forecast v4${eventsReady?' + event context':''}`;
}"""
x(p,old,new)
x(p,'function syncPlanDefaultsFromActive(){\n  if(planState.results.length)return;','function syncPlanDefaultsFromActive(){\n  if(planState.results.length||planState.draftTouched)return;')
x(p,"  if(!options||options.keepSavedFocus!==true)planState.savedFocus=null;planState.eventsReady=false;","  if(!options||options.keepSavedFocus!==true)planState.savedFocus=null;planState.eventsReady=false;planState.events=[];")
x(p,"    if(startMinute==null||endMinute==null||endMinute<=startMinute){planSetMessage('Choose an end time later than the start time.',true);return;}\n    const provider=window.__KERBSIDE_TIMETABLE_PROVIDER__;if(!provider){throw new Error('The timetable provider is still loading.');}","    if(startMinute==null||endMinute==null||endMinute<=startMinute){planSetMessage('Choose an end time later than the start time.',true);return;}\n    planState.filter={date,start,end};renderPlanEventContext([]);\n    const provider=window.__KERBSIDE_TIMETABLE_PROVIDER__;if(!provider){throw new Error('The timetable provider is still loading.');}")
x(p,'    const windowCandidates=(candidates||[]).filter(item=>Number(item.departureMinute)>=startMinute&&Number(item.departureMinute)<=endMinute);','    const windowCandidates=(candidates||[]).filter(item=>{const minute=planCandidateDepartureMinute(item);return minute!=null&&minute>=startMinute&&minute<=endMinute;});')
x(p,"planState.results=updated;planState.eventsReady=true;renderPlanResults(updated,{eventsReady:true});","planState.results=updated;planState.events=planEventDisplayRows(events,eligibleCandidates,from,to,date);planState.eventsReady=true;renderPlanResults(updated,{eventsReady:true});")
x(p,'<p id="planJourneyMeta">Choose a route and time window to compare official timetable options.</p></header><div id="planJourneyResults"','<p id="planJourneyMeta">Choose a route and time window to compare official timetable options.</p><div id="planJourneyEvents" class="plan-event-context" hidden></div></header><div id="planJourneyResults"')
x(p,"  bindPlanAutocomplete('from');bindPlanAutocomplete('to');$('planJourneySearch').addEventListener('click',searchPlanJourneys);","  bindPlanAutocomplete('from');bindPlanAutocomplete('to');['planJourneyFrom','planJourneyTo','planJourneyDate','planJourneyStart','planJourneyEnd','planJourneyPreference','planJourneyMaxChanges','planJourneyConnectionBuffer'].forEach(id=>$(id)?.addEventListener('input',()=>{planState.draftTouched=true;}));$('planJourneySearch').addEventListener('click',searchPlanJourneys);")

# Include recent previous stops before future stops in the scheduled/live timeline.
t='kerbside-train-timetable.js'
old="""function callingMarkup(service){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,target=service&&service.journeyType==='connection'&&service.legs&&service.legs[0]?service.legs[0]:service;
  if(!overlay||!target||!target.liveEvidence)return '';
  const ahead=overlay.flattenCallingPoints(target.subsequentCallingPoints);
  if(!ahead.length)return '';
  const rows=ahead.slice(0,12).map(point=>{
    const when=String(point.et||point.st||'').trim();
    const cancelled=!!point.isCancelled;
    return `<div class="train-call ahead${cancelled?' cancelled':''}"><i></i><span><b>${esc(point.locationName||point.crs||'Station')}</b><small>${esc(when)}${cancelled?' · cancelled':''}</small></span></div>`;
  }).join('');
  return `<div class="train-calling"><div class="train-detail-title">First-leg calling points</div>${rows}</div>`;
}"""
new="""function callingMarkup(service){
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,target=service&&service.journeyType==='connection'&&service.legs&&service.legs[0]?service.legs[0]:service;
  if(!overlay||!target||!target.liveEvidence)return '';
  const passed=overlay.flattenCallingPoints(target.previousCallingPoints),ahead=overlay.flattenCallingPoints(target.subsequentCallingPoints);
  if(!passed.length&&!ahead.length)return '';
  const renderPoint=(point,phase)=>{const when=String(phase==='passed'?(point.at||point.et||point.st||''):(point.et||point.st||'')).trim(),cancelled=!!point.isCancelled;return `<div class="train-call ${phase}${cancelled?' cancelled':''}"><i></i><span><b>${esc(point.locationName||point.crs||'Station')}</b><small>${esc(when)}${cancelled?' · cancelled':''}</small></span></div>`;};
  const rows=[...passed.slice(-12).map(point=>renderPoint(point,'passed')),...ahead.slice(0,12).map(point=>renderPoint(point,'ahead'))].join('');
  return `<div class="train-calling"><div class="train-detail-title">First-leg calling points</div>${rows}</div>`;
}"""
x(t,old,new)

# Browser regressions for filters/events and desktop clipping/theme controls.
q='kerbside-backend/tests/train-journey-planner-regression.mjs'
x(q,'    provider.getJourneyOptions=async()=>{\n      const rows=[','    provider.getJourneyOptions=async options=>{\n      window.__KERBSIDE_PLAN_TEST_ARGS__={...options};\n      const rows=[')
x(q,"        {serviceID:'PLAN-QUIET',uid:'UID-QUIET',trainId:'1Q10',std:'09:10',arrival:'10:15',departureMinute:550,arrivalMinute:615,totalMinutes:65,changes:0,journeyType:'direct',operator:'Quiet Rail',platform:'6',arrivalPlatform:'10',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}\n      ];","        {serviceID:'PLAN-QUIET',uid:'UID-QUIET',trainId:'1Q10',std:'09:10',arrival:'10:15',departureMinute:550,arrivalMinute:615,totalMinutes:65,changes:0,journeyType:'direct',operator:'Quiet Rail',platform:'6',arrivalPlatform:'10',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}},\n        {serviceID:'PLAN-OUTSIDE',std:'12:15',arrival:'13:15',departureMinute:735,arrivalMinute:795,totalMinutes:60,changes:0,journeyType:'direct',operator:'Outside Window Rail',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}\n      ];")
x(q,"events.footballEventsFor=async()=>[];","events.footballEventsFor=async()=>[{title:'Birmingham City v Bristol City',place:'Birmingham',startTime:'10:00',capacity:29000,confidence:.9,type:'football',source:'openfootball (public domain)'}];")
x(q,"  const planCards=await page.locator('#planJourneyResults .plan-journey-result').allTextContents();\n  assert.match(planCards[0],/Quiet Rail/,'Plan My Journey ranks the quiet Forecast v4 option first');","  const planCards=await page.locator('#planJourneyResults .plan-journey-result').allTextContents();\n  const appliedFilter=await page.evaluate(()=>window.__KERBSIDE_PLAN_TEST_ARGS__);\n  assert.deepEqual({from:appliedFilter.from,to:appliedFilter.to,date:appliedFilter.date,departAfter:appliedFilter.departAfter,departBefore:appliedFilter.departBefore},{from:'BHM',to:'BRI',date:'2026-08-12',departAfter:'09:00',departBefore:'11:00'});\n  assert.equal(planCards.length,3);assert.doesNotMatch(planCards.join(' '),/Outside Window Rail/);\n  assert.match(await page.locator('#planJourneyMeta').textContent(),/Wed 12 Aug 2026 · departures 09:00–11:00/);\n  await page.waitForFunction(()=>/Birmingham City v Bristol City/.test(document.querySelector('#planJourneyEvents')?.textContent||''),undefined,{timeout:4000});\n  assert.match(await page.locator('#planJourneyEvents').textContent(),/Football · Birmingham City v Bristol City/);\n  assert.match(planCards[0],/Quiet Rail/,'Plan My Journey ranks the quiet Forecast v4 option first');")

d='kerbside-backend/tests/train-desktop-ui-regression.mjs'
x(d,"      guardCss:style&&style.textContent||''\n    };","      guardCss:style&&style.textContent||'',darkInk:getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),contentRect:document.querySelector('.train-content').getBoundingClientRect().toJSON(),headRect:document.querySelector('#planJourneySurface .plan-results-head').getBoundingClientRect().toJSON(),headFlexShrink:getComputedStyle(document.querySelector('#planJourneySurface .plan-results-head')).flexShrink\n    };")
x(d,"  assert.match(sticky.guardCss,/calendar-picker-indicator\\{filter:invert\\(1\\)/,'dark-theme date inputs should force a visible calendar glyph');","  assert.match(sticky.guardCss,/input\\[type=\"time\"\\]::\\-webkit-calendar-picker-indicator/,'dark-theme time inputs should force a visible clock glyph');\n  assert.match(sticky.guardCss,/calendar-picker-indicator\\{filter:invert\\(1\\)/,'dark-theme date/time inputs should force visible native glyphs');\n  assert.equal(sticky.darkInk,'#0E0F11');assert.equal(sticky.headFlexShrink,'0');assert.ok(sticky.headRect.top>=sticky.contentRect.top-1&&sticky.headRect.bottom<=sticky.contentRect.bottom+1,`planner results header should remain fully visible: ${JSON.stringify(sticky)}`);")

s='kerbside-backend/tests/train-movement-scope-regression.mjs'
x(s,"const workerSource = fs.readFileSync(new URL('../../kerbside-train-movement-worker/worker.js', import.meta.url), 'utf8');\n\nassert.match(source, /const VERSION='0\\.9\\.38'/, 'movement frontend must identify the 60-ref batching build');","const workerSource = fs.readFileSync(new URL('../../kerbside-train-movement-worker/worker.js', import.meta.url), 'utf8');\nconst timetableSource = fs.readFileSync(new URL('../../kerbside-train-timetable.js', import.meta.url), 'utf8');\nconst version = fs.readFileSync(new URL('../../VERSION', import.meta.url), 'utf8').trim().replace(/\\./g,'\\\\.');\n\nassert.match(source, new RegExp(`const VERSION='${version}'`), 'movement frontend must identify the current app release');")
x(s,"  'both live and scheduled boards must use the selected board station as the journey start'\n);","  'both live and scheduled boards must use the selected board station as the journey start'\n);\nassert.match(timetableSource,/flattenCallingPoints\\(target\\.previousCallingPoints\\)/,'scheduled/live-adjusted timelines must retain previous calling points');\nassert.match(timetableSource,/renderPoint\\(point,'passed'\\)/,'previous calling points must render as completed timeline rows');")

run('git','diff','--check')
run('node','--check','kerbside-journey-planner-core.js');run('node','--check','kerbside-train-timetable.js');run('npm','run','check','--prefix','kerbside-backend');run('npm','run','check','--prefix','kerbside-train-movement-worker');run('npm','test','--prefix','kerbside-train-movement-worker')

# Version-only movement paths are outside the browser publisher allowlist.
run('git','config','user.name','github-actions[bot]');run('git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
run('git','add','--','kerbside-train-movement.js','kerbside-train-movement-worker/worker.js')
if subprocess.run(['git','diff','--cached','--quiet']).returncode:
    run('git','commit','-m','Sync Kerbside movement version for 0.9.39 [skip ci]')
    branch=os.environ.get('GITHUB_HEAD_REF','').strip() or subprocess.check_output(['git','branch','--show-current'],text=True).strip()
    run('git','push','origin',f'HEAD:{branch}')
run('git','diff','--check')
