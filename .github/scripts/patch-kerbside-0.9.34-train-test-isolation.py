#!/usr/bin/env python3
from pathlib import Path
import subprocess

path=Path('kerbside-backend/tests/train-regression.mjs')
text=path.read_text(encoding='utf-8')
old="""async function mockExternal(page, diagnostics){
  await page.route('**/__nrcc_probe.png', route=>{ nrccProbeRequests++; return route.fulfill({status:404,body:''}); });
"""
new="""async function mockExternal(page, diagnostics){
  // This regression exercises the core train board and crowding model, not the
  // Network Rail movement overlay. The dedicated movement regression validates
  // that overlay in both WebKit and Chromium. When this fixture becomes same-day
  // after a London date rollover, prevent the unrelated overlay from polling the
  // production Worker and introducing a CORS/network dependency into this test.
  await page.context().route('**/kerbside-train-movement.js*', route=>
    route.fulfill({status:200,contentType:'text/javascript',body:'/* movement disabled in train regression */'})
  );
  await page.route('**/__nrcc_probe.png', route=>{ nrccProbeRequests++; return route.fulfill({status:404,body:''}); });
"""
count=text.count(old)
if count!=1:
    raise SystemExit(f'expected one mockExternal anchor, found {count}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
subprocess.run(['node','--check',str(path)],check=True)
print('train regression isolated from movement overlay')
