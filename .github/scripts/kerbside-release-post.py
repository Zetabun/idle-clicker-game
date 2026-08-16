#!/usr/bin/env python3
from pathlib import Path

path=Path('kerbside-backend/test/train-forecast-v4-temporal.test.mjs')
text=path.read_text(encoding='utf-8')
old="""test('GB public holidays are recognised without inventing extra substitute weekdays',()=>{\n  const c=load(),v4=c.window.__KERBSIDE_FORECAST_V4__;\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-12T12:00:00Z')),false);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-03T12:00:00Z')),true);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-31T12:00:00Z')),true);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-11-30T12:00:00Z')),true);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-01T12:00:00Z')),false);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-28T12:00:00Z')),true);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-29T12:00:00Z')),false);\n});\n"""
new="""test('GB public holidays are region-aware without inventing extra substitute weekdays',()=>{\n  const c=load(),v4=c.window.__KERBSIDE_FORECAST_V4__,glasgow={name:'Glasgow Central',crs:'GLC'};\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-12T12:00:00Z'),station),false);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-03T12:00:00Z'),station),false);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-03T12:00:00Z'),glasgow),true);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-31T12:00:00Z'),station),true);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-08-31T12:00:00Z'),glasgow),false);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-11-30T12:00:00Z'),station),false);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-11-30T12:00:00Z'),glasgow),true);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-01T12:00:00Z'),glasgow),false);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-28T12:00:00Z'),station),true);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-28T12:00:00Z'),glasgow),true);\n  assert.equal(v4.isBankHoliday(new FixedDate('2026-12-29T12:00:00Z'),station),false);\n});\n"""
if text.count(old)!=1:
    raise SystemExit(f'Expected one old public-holiday test, found {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8')

planner=Path('kerbside-journey-planner-core.js')
planner_text=planner.read_text(encoding='utf-8')
old_message="planSetMessage(pending?`${planComparisonMessage(windowCandidates.length,eligibleCandidates.length)} Event sources still updating…`:planComparisonMessage(windowCandidates.length,eligibleCandidates.length,{eventsReady:true}));"
new_message="planSetMessage(pending?`${planComparisonMessage(windowCandidates.length,eligibleCandidates.length)} Using the latest available information while event sources still update…`:planComparisonMessage(windowCandidates.length,eligibleCandidates.length,{eventsReady:true}));"
if planner_text.count(old_message)!=1:
    raise SystemExit(f'Expected one progressive event message anchor, found {planner_text.count(old_message)}')
planner.write_text(planner_text.replace(old_message,new_message,1),encoding='utf-8')

events_path=Path('kerbside-train-events.js')
events_text=events_path.read_text(encoding='utf-8')
old_refresh="""  state.status='loading';\n  const date=journeyDate();\n"""
new_refresh="""  const date=journeyDate();\n  /* Keep already-resolved context usable while a same-date background refresh\n     checks for fresher source data. Per-source health still exposes loading. */\n  if(!(state.status==='ready'&&state.date===date))state.status='loading';\n"""
if events_text.count(old_refresh)!=1:
    raise SystemExit(f'Expected one event refresh-state anchor, found {events_text.count(old_refresh)}')
events_path.write_text(events_text.replace(old_refresh,new_refresh,1),encoding='utf-8')

# These files are staging-only and must not survive the repository-safe release.
Path('.github/scripts/kerbside-0.9.27-body.py').unlink(missing_ok=True)
Path('.github/release-trigger-0.9.27.txt').unlink(missing_ok=True)
print('Updated regional holiday regression, progressive event wording, refresh continuity and removed 0.9.27 staging-only files.')
