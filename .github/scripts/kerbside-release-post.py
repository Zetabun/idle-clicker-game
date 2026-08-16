#!/usr/bin/env python3
from pathlib import Path

path=Path('kerbside-journey-planner-core.js')
text=path.read_text(encoding='utf-8')
replacements={
"function planConstraintLabel(settings=planState.constraints){const value=normalisePlanConstraints(settings),changes=value.maxChanges===0?'Direct only':'Up to 1 change',buffer=value.connectionBuffer?`+${value.connectionBuffer} min connection buffer`:'recommended connection minimum';return `${changes} · ${buffer}`;}":
"function planConstraintLabel(settings=planState.constraints){const value=normalisePlanConstraints(settings);if(value.maxChanges===0)return'Direct only';const buffer=value.connectionBuffer?`+${value.connectionBuffer} min connection buffer`:'base connection minimum';return `Up to 1 change · ${buffer}`;}",
">Recommended minimum</option>":">Base minimum</option>",
"The connection buffer is added to Kerbside's station-specific recommended minimum. It never shortens the recommended change time.":
"The connection buffer is added on top of the minimum already used by Kerbside. That is a licensed station rule where available, otherwise Kerbside's conservative planning buffer; the extra buffer never shortens it."
}
for old,new in replacements.items():
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'kerbside-journey-planner-core.js: expected one post-release anchor, found {count}: {old[:70]}')
    text=text.replace(old,new,1)
path.write_text(text,encoding='utf-8')

# This regression is specifically about the live-board fallback. Today's
# scheduled timetable can legitimately own the same journey during CI, so
# after the destination is committed let any scheduled load settle, then hand
# the isolated assertion back to the live module and trigger its normal refresh.
test_path=Path('kerbside-backend/tests/train-live-window-regression.mjs')
test_text=test_path.read_text(encoding='utf-8')
route_old="""  await page.locator('#trainDestinationSuggest button').filter({hasText:'Bristol Parkway'}).click();
  await page.waitForFunction(()=>window.__KERBSIDE_TRAIN_ROUTES__?.state?.destination?.crs==='BPW');

  // Empty live data must preserve the complete journey identity. Wait for the
"""
route_new="""  await page.locator('#trainDestinationSuggest button').filter({hasText:'Bristol Parkway'}).click();
  await page.waitForFunction(()=>window.__KERBSIDE_TRAIN_ROUTES__?.state?.destination?.crs==='BPW');
  await page.waitForFunction(()=>window.__KERBSIDE_TRAIN_TIMETABLE__?.state?.loading===false);
  await page.evaluate(()=>{
    const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
    if(timetable?.state)timetable.state.mode='live';
    window.__KERBSIDE_TRAIN_LIVE_WINDOW__.handleJourneyChange();
  });

  // Empty live data must preserve the complete journey identity. Wait for the
"""
count=test_text.count(route_old)
if count!=1:
    raise SystemExit(f'{test_path}: expected one live ownership anchor, found {count}')
test_text=test_text.replace(route_old,route_new,1)

# The later-today assertion must likewise exercise the live fallback rather
# than stand down just because the scheduled board owns today's journey.
old="""  const departuresBefore=requests.filter(value=>value.startsWith('/departures/')).length;
  await page.evaluate(()=>{
    const input=document.getElementById('trainDepartAfter');
    input.value='09:00';
    window.__KERBSIDE_TRAIN_LIVE_WINDOW__.renderSameDayPlanning(
      window.__KERBSIDE_TRAIN_LIVE_WINDOW__.liveWindowFor('09:00',16)
    );
  });
"""
new="""  const departuresBefore=requests.filter(value=>value.startsWith('/departures/')).length;
  await page.evaluate(()=>{
    const input=document.getElementById('trainDepartAfter');
    input.value='09:00';
    const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;
    const previousMode=timetable?.state?.mode;
    if(timetable?.state)timetable.state.mode='live';
    try{
      window.__KERBSIDE_TRAIN_LIVE_WINDOW__.renderSameDayPlanning(
        window.__KERBSIDE_TRAIN_LIVE_WINDOW__.liveWindowFor('09:00',16)
      );
    }finally{
      if(timetable?.state)timetable.state.mode=previousMode;
    }
  });
"""
count=test_text.count(old)
if count!=1:
    raise SystemExit(f'{test_path}: expected one live-window fallback anchor, found {count}')
test_path.write_text(test_text.replace(old,new,1),encoding='utf-8')
print('Corrected Plan My Journey wording and isolated live-window regression ownership.')
