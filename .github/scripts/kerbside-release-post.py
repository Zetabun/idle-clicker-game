#!/usr/bin/env python3
from pathlib import Path
import re


def replace_once(path, old, new):
    target=Path(path); text=target.read_text(encoding='utf-8'); count=text.count(old)
    if count != 1: raise SystemExit(f'{path}: expected one replacement, found {count}: {old[:90]!r}')
    target.write_text(text.replace(old,new,1),encoding='utf-8')

# Keep the browser body-timeout, while allowing the VM unit harness (which has
# no AbortController global) to exercise the timetable logic.
replace_once('kerbside-train-timetable.js',
"const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMETABLE_REQUEST_TIMEOUT_MS);\n  try{\n    const response=await fetch(path,{...options,signal:controller.signal});",
"const controller=typeof AbortController==='function'?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),TIMETABLE_REQUEST_TIMEOUT_MS):null;\n  try{\n    const response=await fetch(path,controller?{...options,signal:controller.signal}:options);")
replace_once('kerbside-train-timetable.js','}finally{clearTimeout(timer);}','}finally{if(timer)clearTimeout(timer);}')

# Source-aware stale manifest diagnostics supersede the old hard-coded label.
replace_once('kerbside-backend/tests/browser-regression.mjs',
"assert.match(busSource, /DATA_MANIFEST_SOURCE='stored'/);",
"assert.match(busSource, /const fallbackSource=memoryFallback\\?'memory-stale':'stored'/);\nassert.match(busSource, /DATA_MANIFEST_SOURCE=fallbackSource/);")

# Clearing a destination changes the timetable owner synchronously, but the
# old route module waited for the timetable's periodic sync before relinquishing
# the scheduled journey board. Make that ownership transition explicit before
# reloading the station-wide live board.
replace_once('kerbside-train-routes.js',
"  updateSummary();\n  if(reload) deferReload();\n}",
"  updateSummary();\n  if(reload){\n    const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__;\n    if(timetable&&typeof timetable.sync==='function')timetable.sync();\n    deferReload();\n  }\n}")

# This formerly dormant regression predates the unified timetable + live-
# evidence journey board and used today+4 despite a rolling ~48h snapshot.
# Preserve its important route/date invariants but test the current UI contract.
route_path=Path('kerbside-backend/tests/train-route-filter-regression.mjs')
route=route_path.read_text(encoding='utf-8')
route,count=re.subn(r"const FUTURE_DATE=addCalendarDays\(TODAY,4\);","const FUTURE_DATE=TOMORROW;",route,count=1)
if count != 1: raise SystemExit(f'route test: future-date constant replacements={count}')

future_section="""  await page.waitForFunction(()=>{
    const scheduled=document.getElementById('trainScheduledBoard');
    return scheduled && !scheduled.hidden && (scheduled.querySelector('.train-scheduled-service') || scheduled.querySelector('.train-future-date'));
  });
  assert.equal(await page.locator('#trainBoard').isHidden(),true);
  assert.equal(await page.locator('#trainScheduledBoard').isHidden(),false);
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');
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
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');

"""
route,count=re.subn(
    r"  await page\.waitForSelector\('#trainBoard \.train-future-date'\);.*?(?=  await page\.click\('#trainTravelToday'\);)",
    future_section,route,count=1,flags=re.S)
if count != 1: raise SystemExit(f'route test: future section replacements={count}')

today_section="""  await page.click('#trainTravelToday');
  await page.waitForFunction(()=>document.getElementById('trainTravelDateMeta')?.dataset.mode === 'live');
  await page.waitForFunction(()=>{
    const tt=window.__KERBSIDE_TRAIN_TIMETABLE__,scheduled=document.getElementById('trainScheduledBoard');
    return tt?.state?.mode==='today' && scheduled && !scheduled.hidden && scheduled.querySelectorAll('.train-scheduled-service').length>0;
  });
  assert.equal(await page.locator('#trainBoard').isHidden(),true);
  assert.equal(await page.locator('#trainScheduledBoard').isHidden(),false);
  assert.ok(await page.locator('#trainScheduledBoard .train-scheduled-service').count()>0);
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');

  const stored = await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.route.v1') || 'null'));
  assert.deepEqual(stored,{fromCrs:'BHM',destination:{name:'Bristol Temple Meads',crs:'BRI'}});

  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#trainDestinationQuery');
  await page.waitForFunction(()=>{
    const tt=window.__KERBSIDE_TRAIN_TIMETABLE__,scheduled=document.getElementById('trainScheduledBoard'),destination=document.getElementById('trainDestinationQuery');
    return destination?.value==='Bristol Temple Meads' && tt?.state?.mode==='today' && scheduled && !scheduled.hidden && scheduled.querySelectorAll('.train-scheduled-service').length>0;
  });
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');
  assert.equal(await page.locator('#trainBoard').isHidden(),true);
  assert.equal(await page.locator('#trainScheduledBoard').isHidden(),false);

"""
route,count=re.subn(
    r"  await page\.click\('#trainTravelToday'\);.*?(?=  await page\.click\('#trainDestinationClear'\);)",
    today_section,route,count=1,flags=re.S)
if count != 1: raise SystemExit(f'route test: today section replacements={count}')

route=route.replace(
"  await waitForServiceCount(page,2);\n  assert.match(await page.locator('#trainBoard').textContent(),/Liverpool Lime Street/);",
"  await waitForServiceCount(page,2);\n  assert.equal(await page.locator('#trainBoard').isHidden(),false);\n  assert.equal(await page.locator('#trainScheduledBoard').isHidden(),true);\n  assert.match(await page.locator('#trainBoard').textContent(),/Liverpool Lime Street/);",
1)
route_path.write_text(route,encoding='utf-8')
print('Applied release compatibility and current rail regression contracts.')
