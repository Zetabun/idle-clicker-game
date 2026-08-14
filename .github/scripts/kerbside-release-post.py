#!/usr/bin/env python3
from pathlib import Path

# The first-pass release patch intentionally keeps the main generated source
# replacement simple. Correct the one JavaScript expression whose grammar
# cannot mix ?? with && without explicit grouping.
path=Path('kerbside-rail-calibration.js')
text=path.read_text(encoding='utf-8')
old="  try{raw=typeof feed.flow==='function'?feed.flow(a,b):(feed.flows&&feed.flows[`${a}|${b}`]??feed.flows&&feed.flows[a]&&feed.flows[a][b]);}catch(error){return null;}"
new="  try{if(typeof feed.flow==='function')raw=feed.flow(a,b);else{const direct=feed.flows&&feed.flows[`${a}|${b}`],nested=feed.flows&&feed.flows[a]&&feed.flows[a][b];raw=direct!=null?direct:nested;}}catch(error){return null;}"
if text.count(old)!=1:
    raise SystemExit('route-load adapter expression not found exactly once')
path.write_text(text.replace(old,new,1),encoding='utf-8')

# Browser regression carries the app version inside a JavaScript regex, so the
# ordinary literal 0.9.5 -> 0.9.6 release replacement cannot see the escaped
# dots. Keep that assertion release-locked as well.
test_path=Path('kerbside-backend/tests/browser-regression.mjs')
test_text=test_path.read_text(encoding='utf-8')
old_version=r"0\.9\.5"
new_version=r"0\.9\.6"
if test_text.count(old_version)!=1:
    raise SystemExit(f'expected one escaped browser version assertion, found {test_text.count(old_version)}')
test_path.write_text(test_text.replace(old_version,new_version,1),encoding='utf-8')
