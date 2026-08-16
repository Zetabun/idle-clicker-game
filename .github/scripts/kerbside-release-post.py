#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new):
    target=Path(path)
    text=target.read_text(encoding='utf-8')
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one post-release anchor, found {count}')
    target.write_text(text.replace(old,new,1),encoding='utf-8')

# Each new date in Football.TXT resets inherited kick-off time. Test year
# carry-over on a real-shaped row whose first fixture supplies that day's time.
replace_once(
    'kerbside-backend/tests/train-forecast-v3-dual-timetable.mjs',
    """  Sat Jan 16
           Bristol City FC         v Norwich City FC
`,'2026-27');""",
    """  Sat Jan 16
    12:00  Bristol City FC         v Norwich City FC
`,'2026-27');"""
)

# This regression file predates the current explicit browser/test script list and
# its name is not one of Node --test's default discovery patterns. Make it a
# permanent part of both syntax validation and the release train-route gate.
replace_once(
    'kerbside-backend/package.json',
    ' && node --check tests/train-active-journey-regression.mjs\",',
    ' && node --check tests/train-active-journey-regression.mjs && node --check tests/train-forecast-v3-dual-timetable.mjs\",'
)
replace_once(
    'kerbside-backend/package.json',
    ' && node tests/train-active-journey-regression.mjs\"',
    ' && node tests/train-active-journey-regression.mjs && node tests/train-forecast-v3-dual-timetable.mjs\"'
)

# The journey-planner regression is deliberately offline/deterministic. It used
# to rely on the generated football.json request finishing quickly enough. Mock
# both OpenFootball representations now so switching to Football.TXT cannot turn
# this test into an external-network timing test; the separate forecast test
# below proves the real Football.TXT parsing and Bristol fixture behaviour.
replace_once(
    'kerbside-backend/tests/train-journey-planner-regression.mjs',
    """  await page.route('https://query.wikidata.org/**',route=>{
    diagnostics.events.push(route.request().url());
    return route.fulfill({status:200,contentType:'application/sparql-results+json',body:JSON.stringify(eventResults)});
  });

  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
""",
    """  await page.route('https://query.wikidata.org/**',route=>{
    diagnostics.events.push(route.request().url());
    return route.fulfill({status:200,contentType:'application/sparql-results+json',body:JSON.stringify(eventResults)});
  });
  await page.route('https://raw.githubusercontent.com/openfootball/england/**',route=>
    route.fulfill({status:200,contentType:'text/plain',body:'= Synthetic empty OpenFootball season\\n'})
  );
  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**',route=>
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({matches:[]})})
  );

  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
"""
)

print('Activated train forecast/event dual-timetable regression and deterministic OpenFootball browser mocks.')
