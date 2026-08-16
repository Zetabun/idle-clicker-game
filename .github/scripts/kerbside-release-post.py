#!/usr/bin/env python3
from pathlib import Path

path=Path('kerbside-journey-planner-core.js')
text=path.read_text(encoding='utf-8')
replacements={
"function planConstraintLabel(settings=planState.constraints){const value=normalisePlanConstraints(settings),changes=value.maxChanges===0?'Direct only':'Up to 1 change',buffer=value.connectionBuffer?`+${value.connectionBuffer} min connection buffer`:'recommended connection minimum';return `${changes} · ${buffer}`;}":
"function planConstraintLabel(settings=planState.constraints){const value=normalisePlanConstraints(settings);if(value.maxChanges===0)return'Direct only';const buffer=value.connectionBuffer?`+${value.connectionBuffer} min connection buffer`:'base connection minimum';return `Up to 1 change · ${buffer}`;}",
">Recommended minimum</option>":">Base minimum</option>",
"The connection buffer is added to Kerbside's station-specific recommended minimum. It never shortens the recommended change time.":
"The connection buffer is added on top of the minimum already used by Kerbside. That is a licensed station rule where available, otherwise Kerbside's conservative planning buffer; the extra buffer never shortens it."
}
for old,new in replacements.items():
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'kerbside-journey-planner-core.js: expected one post-release anchor, found {count}: {old[:70]}')
    text=text.replace(old,new,1)
path.write_text(text,encoding='utf-8')

# This regression specifically tests the live-board fallback. Since the app
# now legitimately lets today's scheduled timetable own a covered journey,
# make the fixture declare that neither scheduled source covers any date.
# Production live/scheduled integration is covered separately by the live
# production smoke workflows; this browser regression remains fully local.
test_path=Path('kerbside-backend/tests/train-live-window-regression.mjs')
test_text=test_path.read_text(encoding='utf-8')
old="""  await page.route('**://huxley2.azurewebsites.net/**',handle);
  await page.route('**://hux.azurewebsites.net/**',handle);
}
"""
new="""  await page.route('**://huxley2.azurewebsites.net/**',handle);
  await page.route('**://hux.azurewebsites.net/**',handle);
  const emptyManifest={schema:1,source:'Kerbside live-window test',timetableId:'TEST-EMPTY',dates:[],coverage:{},tocNames:{}};
  const emptyManifestResponse=route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(emptyManifest)});
  await page.route('**/kerbside-rail-timetable/manifest.json',emptyManifestResponse);
  await page.route('https://kerbside-rail-data-zetabun.pages.dev/manifest.json',emptyManifestResponse);
}
"""
count=test_text.count(old)
if count!=1:
    raise SystemExit(f'{test_path}: expected one external-mock anchor, found {count}')
test_path.write_text(test_text.replace(old,new,1),encoding='utf-8')
print('Corrected Plan My Journey wording and isolated the live-window timetable fixture.')
