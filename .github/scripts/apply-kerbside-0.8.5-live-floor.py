#!/usr/bin/env python3
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text=read(path)
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:160]!r}')
    write(path, text.replace(old, new, 1))


# Release version. sync-version.py propagates the canonical version later.
if read('VERSION').strip() != '0.8.4':
    raise SystemExit(f"Expected VERSION 0.8.4, found {read('VERSION').strip()!r}")
write('VERSION', '0.8.5\n')
replace_once('kerbside-status.js', "const VERSION='0.8.4';", "const VERSION='0.8.5';")
html=read('bus.html')
if '?v=0.8.4' not in html:
    raise SystemExit('bus.html: expected 0.8.4 cache busters')
write('bus.html', html.replace('?v=0.8.4', '?v=0.8.5'))


# ---------------------------------------------------------------------------
# One canonical railway clock. GB timetable searches are based on Europe/London
# time rather than the device timezone. Expose exact minute time separately from
# defaultDepartAfter(), which intentionally rounds to a quarter hour for an
# untouched time picker.
live='kerbside-train-live-window.js'
replace_once(
    live,
    """function defaultDepartAfter(date=new Date()){
  const now=londonMinutes(date);
  const rounded=Math.min(1439,Math.ceil(now/15)*15);
  return hhmm(rounded);
}
""",
    """function currentRailTime(date=new Date()){return hhmm(londonMinutes(date));}
function defaultDepartAfter(date=new Date()){
  const now=londonMinutes(date);
  const rounded=Math.min(1439,Math.ceil(now/15)*15);
  return hhmm(rounded);
}
"""
)
replace_once(
    live,
    "state,install,liveWindowFor,defaultDepartAfter,renderSameDayPlanning,improveEmptyState,handleJourneyChange,journeyBoardActive,",
    "state,install,liveWindowFor,currentRailTime,defaultDepartAfter,renderSameDayPlanning,improveEmptyState,handleJourneyChange,journeyBoardActive,"
)


# ---------------------------------------------------------------------------
# Planner UI. A saved morning preference is useful for a future date, but it
# must never make Today's board travel backwards. Today shows the exact current
# railway minute; future dates restore the user's stored preference.
planner='kerbside-journey-planner-ui.js'
replace_once(planner, "let fromTimer=null,toTimer=null,fromAbort=null,toAbort=null;", "let fromTimer=null,toTimer=null,fromAbort=null,toAbort=null,timeFloorTimer=null;")
replace_once(
    planner,
    "function isFutureJourney(){const api=dateApi();return !!(api&&typeof api.isToday==='function'&&!api.isToday())}\n",
    """function isFutureJourney(){const api=dateApi();return !!(api&&typeof api.isToday==='function'&&!api.isToday())}
function timeMinutes(value){const match=String(value||'').match(/^(\\d{1,2}):(\\d{2})$/);if(!match)return null;const h=Number(match[1]),m=Number(match[2]);return h>=0&&h<24&&m>=0&&m<60?h*60+m:null;}
function fallbackRailNow(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  let hour=Number(map.hour)||0;if(hour===24)hour=0;return `${String(hour).padStart(2,'0')}:${String(Number(map.minute)||0).padStart(2,'0')}`;
}
function railNow(){const live=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;return live&&typeof live.currentRailTime==='function'?live.currentRailTime():fallbackRailNow();}
function syncDepartAfterForDate(){
  const input=$('trainDepartAfter');if(!input)return'';
  if(isFutureJourney()){const preferred=storedTime();if(input.value!==preferred)input.value=preferred;return input.value;}
  const now=railNow(),chosen=input.value||storedTime(),nowMinute=timeMinutes(now),chosenMinute=timeMinutes(chosen),next=chosenMinute!=null&&nowMinute!=null&&chosenMinute>=nowMinute?chosen:now;
  if(input.value!==next)input.value=next;
  return input.value;
}
"""
)
replace_once(
    planner,
    "time.innerHTML='<span>Depart after</span><input id=\"trainDepartAfter\" type=\"time\" step=\"900\">';",
    "time.innerHTML='<span>Depart after</span><input id=\"trainDepartAfter\" type=\"time\" step=\"60\">';"
)
replace_once(
    planner,
    """  const departAfter=$('trainDepartAfter');
  if(departAfter){
    departAfter.value=storedTime();
    departAfter.addEventListener('change',()=>{saveTime(departAfter.value);dispatch();});
  }

  document.addEventListener('kerbside:train-date-change',()=>{
    planner.dataset.mode=isFutureJourney()?'future':'live';
    plannerMessage('');
  });
""",
    """  const departAfter=$('trainDepartAfter');
  if(departAfter){
    departAfter.value=storedTime();
    syncDepartAfterForDate();
    departAfter.addEventListener('change',()=>{saveTime(departAfter.value);syncDepartAfterForDate();dispatch();});
  }

  document.addEventListener('kerbside:train-date-change',()=>{
    planner.dataset.mode=isFutureJourney()?'future':'live';
    syncDepartAfterForDate();
    plannerMessage('');
  });
  if(!timeFloorTimer)timeFloorTimer=setInterval(()=>{
    if(isFutureJourney())return;
    const before=$('trainDepartAfter')?.value||'',after=syncDepartAfterForDate();
    if(after&&after!==before)dispatch();
  },30*1000);
"""
)
replace_once(
    planner,
    "window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,isFutureJourney,syncRouteOrigin,refreshJourneyBoard,get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};",
    "window.__KERBSIDE_JOURNEY_PLANNER__={install,swap,findTrains,resilientRailFetch,isFutureJourney,syncRouteOrigin,refreshJourneyBoard,syncDepartAfterForDate,railNow,get departAfter(){return $('trainDepartAfter')?.value||storedTime()}};"
)


# ---------------------------------------------------------------------------
# Timetable hard floor. This is deliberately independent of the UI so a race,
# stale localStorage value, or caller that invokes load() directly cannot bring
# already-departed services back onto Today's board. Because routeSignature()
# includes currentTime(), the board naturally advances at the next minute even
# if it stays open.
tt='kerbside-train-timetable.js'
replace_once(
    tt,
    "function currentTime(){return $('trainDepartAfter')?.value||'00:00';}\n",
    """function railNowTime(){
  const live=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;if(live&&typeof live.currentRailTime==='function')return live.currentRailTime();
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));let hour=Number(map.hour)||0;if(hour===24)hour=0;return `${String(hour).padStart(2,'0')}:${String(Number(map.minute)||0).padStart(2,'0')}`;
}
function effectiveDepartAfter(value=$('trainDepartAfter')?.value||'00:00'){
  const selected=String(value||'00:00'),api=dateApi();if(!api||typeof api.isToday!=='function'||!api.isToday())return selected;
  const now=railNowTime(),selectedMinute=parseMinutes(selected),nowMinute=parseMinutes(now);return selectedMinute!=null&&nowMinute!=null&&selectedMinute>=nowMinute?selected:now;
}
function currentTime(){return effectiveDepartAfter();}
"""
)
replace_once(
    tt,
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,recoverySummary,forecastConnection,forecastRecovery,provider:timetableProvider};",
    "window.__KERBSIDE_TRAIN_TIMETABLE__={state,load,loadSameDay,sync,renderServices,renderUnavailable,setHeader,refreshForecasts,refreshEdgeManifest,toggleService,serviceKey,journeyMode,mergeOverlay,statusFor,serviceDateLabel,requestOverlay,coverageIncludesTime,connectionBufferMinutes,connectionRiskFor,recoverySummary,forecastConnection,forecastRecovery,effectiveDepartAfter,railNowTime,provider:timetableProvider};"
)


# ---------------------------------------------------------------------------
# Browser regression. Freeze the browser clock early enough that all existing
# 10:xx fixtures remain catchable, seed a deliberately stale saved time, and add
# a 07:45 train that must never appear on Today's board.
browser='kerbside-backend/tests/train-browser-core-regression.mjs'
replace_once(
    browser,
    """function rowsFor(date){return [
  [`rid-forward-${date}`,`uid-forward-${date}`,'1A01','XC',date,[['BHM','','10:42','7',0],['BRI','12:07','','3',0]]],
""",
    """function rowsFor(date){return [
  [`rid-completed-${date}`,`uid-completed-${date}`,'1A00','XC',date,[['BHM','','07:45','6',0],['BRI','09:00','','2',0]]],
  [`rid-forward-${date}`,`uid-forward-${date}`,'1A01','XC',date,[['BHM','','10:42','7',0],['BRI','12:07','','3',0]]],
"""
)
replace_once(
    browser,
    """  await page.addInitScript(today=>{
    localStorage.setItem('kerbside.rail.travel-date.v1',today);
    localStorage.setItem('kerbside.rail.depart-after.v1','09:00');
    localStorage.removeItem('kerbside.rail.route.v1');
  },TODAY);
""",
    """  const FIXED_NOW=`${TODAY}T08:30:00Z`;
  await page.addInitScript(({today,fixedNow})=>{
    const RealDate=Date,fixed=RealDate.parse(fixedNow);
    function FixedDate(...args){if(new.target)return new RealDate(...(args.length?args:[fixed]));return new RealDate(fixed).toString();}
    FixedDate.now=()=>fixed;FixedDate.parse=RealDate.parse;FixedDate.UTC=RealDate.UTC;FixedDate.prototype=RealDate.prototype;window.Date=FixedDate;
    localStorage.setItem('kerbside.rail.travel-date.v1',today);
    localStorage.setItem('kerbside.rail.depart-after.v1','00:01');
    localStorage.removeItem('kerbside.rail.route.v1');
  },{today:TODAY,fixedNow:FIXED_NOW});
"""
)
replace_once(
    browser,
    """  await page.waitForSelector('#trainPlanner');

  const visibleFind=await page.locator('.train-planner button').evaluateAll(buttons=>buttons.filter(button=>{
""",
    """  await page.waitForSelector('#trainPlanner');
  const railNow=await page.evaluate(()=>window.__KERBSIDE_TRAIN_LIVE_WINDOW__.currentRailTime());
  assert.equal(await page.locator('#trainDepartAfter').inputValue(),railNow,'Today should clamp a stale saved departure time to the current UK railway minute');

  const visibleFind=await page.locator('.train-planner button').evaluateAll(buttons=>buttons.filter(button=>{
"""
)
replace_once(
    browser,
    """  assert.equal(await page.locator('#trainScheduledBoard .train-scheduled-service').count(),1);
  assert.match(await page.locator('#trainScheduledBoard .train-scheduled-service').first().textContent(),/10:42/);
""",
    """  assert.equal(await page.locator('#trainScheduledBoard .train-scheduled-service').count(),1);
  assert.equal(await page.locator('#trainScheduledBoard').getByText('07:45',{exact:true}).count(),0,'a completed train must not be shown on Today even when localStorage contains an old departure preference');
  assert.match(await page.locator('#trainScheduledBoard .train-scheduled-service').first().textContent(),/10:42/);
"""
)

print('Applied Kerbside 0.8.5 live departure floor hotfix.')
