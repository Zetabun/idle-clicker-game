#!/usr/bin/env python3
from pathlib import Path

path = Path('kerbside-backend/tests/train-route-filter-regression.mjs')
text = path.read_text(encoding='utf-8')

old_today = """  await page.click('#trainTravelToday');
  await page.waitForFunction(()=>document.getElementById('trainTravelDateMeta')?.dataset.mode === 'live');
  await page.waitForFunction(()=>{
    const tt=window.__KERBSIDE_TRAIN_TIMETABLE__,scheduled=document.getElementById('trainScheduledBoard');
    return tt?.state?.mode==='today' && scheduled && !scheduled.hidden && scheduled.querySelectorAll('.train-scheduled-service').length>0;
  });
  assert.equal(await page.locator('#trainBoard').isHidden(),true);
  assert.equal(await page.locator('#trainScheduledBoard').isHidden(),false);
  assert.ok(await page.locator('#trainScheduledBoard .train-scheduled-service').count()>0);
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');
"""
new_today = """  await page.click('#trainTravelToday');
  await page.waitForFunction(()=>document.getElementById('trainTravelDateMeta')?.dataset.mode === 'live');
  await page.waitForFunction(()=>{
    const tt=window.__KERBSIDE_TRAIN_TIMETABLE__,scheduled=document.getElementById('trainScheduledBoard');
    return tt?.state?.mode==='today' && tt.state.loading===false && scheduled && !scheduled.hidden;
  });
  assert.equal(await page.locator('#trainBoard').isHidden(),true);
  assert.equal(await page.locator('#trainScheduledBoard').isHidden(),false);
  const todayRows=await page.locator('#trainScheduledBoard .train-scheduled-service').count();
  if(todayRows===0){
    assert.match(await page.locator('#trainScheduledBoard').textContent(),/No suitable direct or one-change journeys found/i);
  }
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');
"""

old_reload = """  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#trainDestinationQuery');
  await page.waitForFunction(()=>{
    const tt=window.__KERBSIDE_TRAIN_TIMETABLE__,scheduled=document.getElementById('trainScheduledBoard'),destination=document.getElementById('trainDestinationQuery');
    return destination?.value==='Bristol Temple Meads' && tt?.state?.mode==='today' && scheduled && !scheduled.hidden && scheduled.querySelectorAll('.train-scheduled-service').length>0;
  });
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');
  assert.equal(await page.locator('#trainBoard').isHidden(),true);
  assert.equal(await page.locator('#trainScheduledBoard').isHidden(),false);
"""
new_reload = """  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#trainDestinationQuery');
  await page.waitForFunction(()=>{
    const tt=window.__KERBSIDE_TRAIN_TIMETABLE__,scheduled=document.getElementById('trainScheduledBoard'),destination=document.getElementById('trainDestinationQuery');
    return destination?.value==='Bristol Temple Meads' && tt?.state?.mode==='today' && tt.state.loading===false && scheduled && !scheduled.hidden;
  });
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');
  assert.equal(await page.locator('#trainBoard').isHidden(),true);
  assert.equal(await page.locator('#trainScheduledBoard').isHidden(),false);
  const restoredTodayRows=await page.locator('#trainScheduledBoard .train-scheduled-service').count();
  if(restoredTodayRows===0){
    assert.match(await page.locator('#trainScheduledBoard').textContent(),/No suitable direct or one-change journeys found/i);
  }
"""

for old, new, label in ((old_today, new_today, 'Today transition'), (old_reload, new_reload, 'Today reload')):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one block, found {count}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Made train route regression independent of late-night service availability.')
