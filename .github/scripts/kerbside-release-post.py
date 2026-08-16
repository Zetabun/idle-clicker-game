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
    "  Sat Jan 16\\n           Bristol City FC         v Norwich City FC\\n`,'2026-27');",
    "  Sat Jan 16\\n    12:00  Bristol City FC         v Norwich City FC\\n`,'2026-27');"
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

print('Activated train forecast/event dual-timetable regression.')
