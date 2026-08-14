#!/usr/bin/env python3
from pathlib import Path

path=Path('kerbside-backend/tests/train-route-filter-regression.mjs')
text=path.read_text(encoding='utf-8')
old="  assert.equal((await page.locator('#trainRefresh').textContent()).trim(),'Schedule');"
new="  assert.equal(await page.locator('#trainTravelDateMeta').getAttribute('data-mode'),'planning');"
if text.count(old)!=1:
    raise SystemExit(f'{path}: expected one copy-sensitive future-date assertion, found {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Made future-date route regression structural instead of copy-sensitive.')
