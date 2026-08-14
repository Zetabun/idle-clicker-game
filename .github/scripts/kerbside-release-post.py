#!/usr/bin/env python3
from pathlib import Path

path=Path('kerbside-train-timetable.js')
text=path.read_text(encoding='utf-8')
old="const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMETABLE_REQUEST_TIMEOUT_MS);\n  try{\n    const response=await fetch(path,{...options,signal:controller.signal});"
new="const controller=typeof AbortController==='function'?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),TIMETABLE_REQUEST_TIMEOUT_MS):null;\n  try{\n    const response=await fetch(path,controller?{...options,signal:controller.signal}:options);"
if text.count(old)!=1:
    raise SystemExit(f'kerbside-train-timetable.js: expected timeout helper anchor once, found {text.count(old)}')
text=text.replace(old,new,1)
old_finally="}finally{clearTimeout(timer);}"
new_finally="}finally{if(timer)clearTimeout(timer);}"
if text.count(old_finally)!=1:
    raise SystemExit(f'kerbside-train-timetable.js: expected timeout finally anchor once, found {text.count(old_finally)}')
path.write_text(text.replace(old_finally,new_finally,1),encoding='utf-8')
print('Made static timetable timeout compatible with VM test contexts.')

# The bus manifest release changes the stale fallback source from a hard-coded
# 'stored' label to a source-aware fallbackSource ('memory-stale' or 'stored').
# Keep the browser regression aligned with that stronger diagnostic contract.
test_path=Path('kerbside-backend/tests/browser-regression.mjs')
test_text=test_path.read_text(encoding='utf-8')
old_assert="assert.match(busSource, /DATA_MANIFEST_SOURCE='stored'/);"
new_assert="assert.match(busSource, /const fallbackSource=memoryFallback\?'memory-stale':'stored'/);\nassert.match(busSource, /DATA_MANIFEST_SOURCE=fallbackSource/);"
if test_text.count(old_assert)!=1:
    raise SystemExit(f'browser-regression.mjs: expected stale-manifest assertion once, found {test_text.count(old_assert)}')
test_path.write_text(test_text.replace(old_assert,new_assert,1),encoding='utf-8')
print('Updated browser regression for source-aware stale manifest fallback.')
