#!/usr/bin/env python3
from pathlib import Path

path=Path('kerbside-backend/tests/train-browser-core-regression.mjs')
text=path.read_text(encoding='utf-8')
old="  assert.match(await connectionDetail.textContent(),/live evidence on both legs/i);"
new="  assert.match(await connectionDetail.textContent(),/Both legs are timetabled from the National Rail Darwin Timetable Files; both trains live-checked/i);"
count=text.count(old)
if count!=1:
    raise SystemExit(f'Expected exactly one stale connection-evidence assertion, found {count}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Updated the Trusted Connections provenance regression assertion.')
