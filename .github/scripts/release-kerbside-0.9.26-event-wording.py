#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new):
    target=Path(path)
    text=target.read_text(encoding='utf-8')
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one anchor, found {count}')
    target.write_text(text.replace(old,new,1),encoding='utf-8')

replace_once(
    'kerbside-train-events.js',
    """    delta=signedGap(event.start,arrival);
    phase='before';
    ideal=75;
""",
    """    delta=signedGap(event.start,arrival);
    phase=delta<0?'late':'before';
    ideal=75;
"""
)

replace_once(
    'kerbside-train-events.js',
    """  const when=best.phase==='before'?'arriving before':'leaving after';
  return {
    amount:Math.min(MAX_EVENT_PRESSURE,best.amount),
    reasons:[`${best.event.title} — trains ${when} it carry extra demand`],
    events:matches.slice(0,3)
  };
""",
    """  const when=best.phase==='before'?'arriving before it':best.phase==='late'?'arriving soon after kick-off':'leaving after it';
  return {
    amount:Math.min(MAX_EVENT_PRESSURE,best.amount),
    reasons:[`${best.event.title} — trains ${when} can carry extra demand`],
    events:matches.slice(0,3)
  };
"""
)

replace_once(
    'kerbside-backend/tests/train-forecast-v3-dual-timetable.mjs',
    """  const deepIntoMatch=events.relevance(fixture,{std:'14:42',arrival:'16:07'},journey);
  assert.ok(lateFirstHalf&&lateFirstHalf.amount>=.16,{lateFirstHalf});
  assert.equal(deepIntoMatch,null);
});
""",
    """  const deepIntoMatch=events.relevance(fixture,{std:'14:42',arrival:'16:07'},journey);
  assert.ok(lateFirstHalf&&lateFirstHalf.amount>=.16,{lateFirstHalf});
  assert.equal(lateFirstHalf.phase,'late');
  assert.equal(deepIntoMatch,null);

  events.setEvents([{title:'Bristol City FC v Portsmouth FC',place:'Bristol',startTime:'15:00',capacity:27000,confidence:.9,type:'football'}],{date:'2026-08-29',sources:['football']});
  const pressure=events.pressureForJourney({std:'14:12',arrival:'15:36'},journey);
  assert.ok(pressure.amount>=.16,{pressure});
  assert.match(pressure.reasons[0],/Bristol City FC v Portsmouth FC/);
  assert.match(pressure.reasons[0],/arriving soon after kick-off/);
});
"""
)

print('Hardened late match-arrival event explanation for Kerbside 0.9.26.')
