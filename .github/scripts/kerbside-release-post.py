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

# The live-window regression is meant to exercise the live-board fallback that
# renders a truthful "Later today" state when Darwin's live horizon is too
# short. Today's scheduled timetable can legitimately own the board during a
# CI run, in which case renderSameDayPlanning() must stand down. Put only this
# isolated assertion into live-fallback mode so the test no longer depends on
# the runner clock or whether today's published snapshot currently covers it.
test_path=Path('kerbside-backend/tests/train-live-window-regression.mjs')
test_text=test_path.read_text(encoding='utf-8')
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
print('Corrected Plan My Journey wording and deterministic live-window regression.')
