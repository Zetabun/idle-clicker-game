#!/usr/bin/env python3
from pathlib import Path

path = Path('kerbside-journey-planner-core.js')
text = path.read_text(encoding='utf-8')
old = "if(!saved)return false;setPlanView(true);await planApplyCoverage();"
new = "if(!saved)return false;if(!planState.active)setPlanView(true);await planApplyCoverage();"
count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected one saved-journey Plan-view transition, found {count}.')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Made saved-journey reopen idempotent while Plan My Journey is already active.')
