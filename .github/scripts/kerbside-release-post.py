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
new_assert=r"assert.match(busSource, /const fallbackSource=memoryFallback\?'memory-stale':'stored'/);"+"\n"+r"assert.match(busSource, /DATA_MANIFEST_SOURCE=fallbackSource/);"
if test_text.count(old_assert)!=1:
    raise SystemExit(f'browser-regression.mjs: expected stale-manifest assertion once, found {test_text.count(old_assert)}')
test_path.write_text(test_text.replace(old_assert,new_assert,1),encoding='utf-8')
print('Updated browser regression for source-aware stale manifest fallback.')

# This regression had not been executed by CI. It selected today + 4 even
# though the checked-in rolling Darwin snapshot exposes roughly 48 hours and
# the UI now clamps its date input to that real coverage. Test the same safety
# invariant on tomorrow instead: planning must own the scheduled board and
# must not make a request for today\'s live departures.
route_test=Path('kerbside-backend/tests/train-route-filter-regression.mjs')
route_text=route_test.read_text(encoding='utf-8')
old_date="const FUTURE_DATE=addCalendarDays(TODAY,4);"
new_date="const FUTURE_DATE=TOMORROW;"
if route_text.count(old_date)!=1:
    raise SystemExit(f'train-route-filter-regression.mjs: expected future-date constant once, found {route_text.count(old_date)}')
route_text=route_text.replace(old_date,new_date,1)
old_block="""  await page.waitForSelector('#trainBoard .train-future-date');
  assert.equal(await page.locator('.train-service').count(),0);
  assert.equal(await page.locator('#trainStationName').textContent(),'Birmingham New Street → Bristol Temple Meads');
  assert.match(await page.locator('#trainStationMeta').textContent(),/BHM → BRI.*timetabled services/i);
  assert.equal(await page.locator('#trainRefresh').isDisabled(),true);
  assert.equal((await page.locator('#trainRefresh').textContent()).trim(),'Advance');
  assert.match(await page.locator('#trainBoard').textContent(),/Advance timetable/);
  assert.match(await page.locator('#trainBoard').textContent(),/Exact future train times need the scheduled timetable feed/i);
  assert.equal(await page.evaluate(()=>localStorage.getItem('kerbside.rail.travel-date.v1')),FUTURE_DATE);

  await page.click('#trainJourneyGo');
  await page.waitForFunction(()=>/Advance journey ready/i.test(document.getElementById('trainPlannerMessage')?.textContent||''));
  assert.doesNotMatch(await page.locator('#trainPlannerMessage').textContent(),/Live journey loaded/i);
  assert.equal(departureRequestCount(diagnostics),liveRequestsBeforeFuture,
    `future Find trains must not request today's live departures: ${JSON.stringify(diagnostics.requests)}`);
  assert.equal(await page.locator('#trainStationName').textContent(),'Birmingham New Street → Bristol Temple Meads');
"""
new_block="""  await page.waitForFunction(()=>{
    const scheduled=document.getElementById('trainScheduledBoard');
    return scheduled && !scheduled.hidden && (scheduled.querySelector('.train-scheduled-service') || scheduled.querySelector('.train-future-date'));
  });
  assert.equal(await page.locator('#trainBoard').isHidden(),true);
  assert.equal(await page.locator('#trainScheduledBoard').isHidden(),false);
  assert.equal(await page.locator('#trainStationName').textContent(),'Birmingham New Street → Bristol Temple Meads');
  assert.match(await page.locator('#trainStationMeta').textContent(),/BHM → BRI.*timetable/i);
  assert.equal(await page.locator('#trainRefresh').isDisabled(),true);
  assert.equal((await page.locator('#trainRefresh').textContent()).trim(),'Schedule');
  assert.equal(await page.evaluate(()=>localStorage.getItem('kerbside.rail.travel-date.v1')),FUTURE_DATE);
  assert.equal(departureRequestCount(diagnostics),liveRequestsBeforeFuture,
    `selecting a future date must not request today's live departures: ${JSON.stringify(diagnostics.requests)}`);

  await page.click('#trainJourneyGo');
  await page.waitForFunction(()=>{
    const scheduled=document.getElementById('trainScheduledBoard');
    return scheduled && !scheduled.hidden && (scheduled.querySelector('.train-scheduled-service') || scheduled.querySelector('.train-future-date'));
  });
  assert.doesNotMatch(await page.locator('#trainPlannerMessage').textContent(),/Live journey loaded/i);
  assert.equal(departureRequestCount(diagnostics),liveRequestsBeforeFuture,
    `future Find trains must not request today's live departures: ${JSON.stringify(diagnostics.requests)}`);
  assert.equal(await page.locator('#trainStationName').textContent(),'Birmingham New Street → Bristol Temple Meads');
"""
if route_text.count(old_block)!=1:
    raise SystemExit(f'train-route-filter-regression.mjs: expected obsolete future-date assertion block once, found {route_text.count(old_block)}')
route_test.write_text(route_text.replace(old_block,new_block,1),encoding='utf-8')
print('Updated dormant route-filter regression to use current Darwin snapshot coverage.')
