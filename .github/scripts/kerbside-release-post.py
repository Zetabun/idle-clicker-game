from pathlib import Path

NEW = "0.9.47"

def read(path):
    return Path(path).read_text(encoding="utf-8")

def write(path, text):
    Path(path).write_text(text, encoding="utf-8")

def replace_once(path, old, new, label):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match in {path}, found {count}")
    write(path, text.replace(old, new, 1))

replace_once(
    "kerbside-backend/tests/browser-regression.mjs",
    "assert.match(busSource, /const APP_VERSION = '0\\.9\\.46'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.9\\.47'/);",
    "browser regression app version",
)

replace_once(
    "kerbside-backend/tests/train-browser-core-regression.mjs",
    "  const watchButton=connectionDetail.getByRole('button',{name:'Watch journey'});\n  await watchButton.click();\n  await connectionDetail.getByRole('button',{name:'Stop watching'}).waitFor();\n  assert.match(await connectionDetail.textContent(),/Journey Watch/i);\n  assert.match(await connectionDetail.textContent(),/Connection at risk/i);\n  const watchedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.journey-watch.v1')||'null'));",
    "  const watchButton=connectionDetail.getByRole('button',{name:'Save & follow'});\n  await watchButton.click();\n  await page.waitForFunction(()=>Boolean(JSON.parse(localStorage.getItem('kerbside.rail.journey-watch.v1')||'null')));\n  assert.match(await connectionDetail.textContent(),/Connection at risk/i);\n  const watchedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.journey-watch.v1')||'null'));",
    "browser core unified journey action",
)
replace_once(
    "kerbside-backend/tests/train-browser-core-regression.mjs",
    "  assert.equal(await connectionDetail.getByRole('button',{name:'Stop watching'}).count(),1);\n  const watchedAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.journey-watch.v1')||'null'));\n  assert.equal(watchedAfter?.onwardID,`rid-change-recovery-${TODAY}`,'Journey Watch must follow the adopted backup leg');\n  await connectionDetail.getByRole('button',{name:'Stop watching'}).click();\n  assert.equal(await page.evaluate(()=>localStorage.getItem('kerbside.rail.journey-watch.v1')),null);",
    "  const watchedAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.journey-watch.v1')||'null'));\n  assert.equal(watchedAfter?.onwardID,`rid-change-recovery-${TODAY}`,'Journey Watch must follow the adopted backup leg');\n  await page.evaluate(()=>localStorage.removeItem('kerbside.rail.journey-watch.v1'));\n  assert.equal(await page.evaluate(()=>localStorage.getItem('kerbside.rail.journey-watch.v1')),null);",
    "browser core unified journey cleanup",
)

replace_once(
    "kerbside-backend/test/train-forecast-layout.test.mjs",
    "  assert.match(forecast,/train-forecast-calibration[^\\n]+<i>/,'calibration source should still render inside its semantic source element');\n",
    "  assert.match(forecast,/train-forecast-calibration[^\\n]+<i>/,'calibration source should still render inside its semantic source element');\n  assert.match(forecast,/<p>\\$\\{esc\\(method\\)\\}<\\/p>\\$\\{calibrationMarkup\\}<\\/details>\\$\\{probabilityMarkup\\}/,'measured baseline should be grouped inside How this is worked out');\n  assert.doesNotMatch(forecast,/<\\/details>\\$\\{calibrationMarkup\\}/,'measured baseline must not remain a standalone top-level forecast block');\n",
    "forecast layout nesting regression",
)

replace_once(
    "kerbside-backend/tests/train-mobile-layout-regression.mjs",
    "      <details class=\"train-forecast-method\" open><summary>How this is worked out</summary><p>Kerbside combines measured demand with the timetable, live evidence and the selected travel time.</p></details>\n      <div class=\"train-forecast-calibration\"><span>Measured baseline</span><b>DfT measured baseline: 16 passengers per 100 seats.</b><i>DfT rail passenger numbers and crowding, autumn 2025 (OGL v3)</i></div>",
    "      <details class=\"train-forecast-method\" open><summary>How this is worked out</summary><p>Kerbside combines measured demand with the timetable, live evidence and the selected travel time.</p><div class=\"train-forecast-calibration\"><span>Measured baseline</span><b>DfT measured baseline: 16 passengers per 100 seats.</b><i>DfT rail passenger numbers and crowding, autumn 2025 (OGL v3)</i></div></details>",
    "mobile forecast measured baseline fixture",
)

replace_once(
    "kerbside-backend/tests/train-mobile-layout-regression.mjs",
    "      timeTop:time.top,timeRight:time.right,dateRight:date.right,\n",
    "      timeTop:time.top,timeRight:time.right,dateRight:date.right,statusSize:parseFloat(getComputedStyle(summary.querySelector('.train-status')).fontSize)||0,timeSize:parseFloat(getComputedStyle(summary.querySelector('.train-time b')).fontSize)||0,\n",
    "mobile train status type metrics",
)
replace_once(
    "kerbside-backend/tests/train-mobile-layout-regression.mjs",
    "  assert.ok(metrics.summaryOverflow<=1,`train summary should not overflow its card: ${JSON.stringify(metrics)}`);\n",
    "  assert.ok(metrics.summaryOverflow<=1,`train summary should not overflow its card: ${JSON.stringify(metrics)}`);\n  assert.ok(metrics.statusSize<=7.6,`timetabled status label should stay compact: ${JSON.stringify(metrics)}`);\n  assert.ok(metrics.timeSize>=16,`departure time should keep its prominent size: ${JSON.stringify(metrics)}`);\n",
    "mobile train status type assertions",
)

replace_once(
    "kerbside-backend/tests/train-mobile-layout-regression.mjs",
    "  assert.ok(forecastType.overflow<=1,`larger mobile forecast type must not overflow: ${JSON.stringify(forecastType)}`);\n  assert.deepEqual(pageErrors,[],`unexpected page errors: ${pageErrors.join('\\n')}`);",
    "  assert.ok(forecastType.overflow<=1,`larger mobile forecast type must not overflow: ${JSON.stringify(forecastType)}`);\n\n  await page.waitForSelector('[data-train-view=\"plan\"]',{timeout:10000});\n  await page.click('[data-train-view=\"plan\"]');\n  const planMetrics=await page.evaluate(()=>{\n    const card=document.querySelector('.plan-when-card'),grid=card&&card.querySelector('.plan-time-grid'),date=document.getElementById('planJourneyDate'),start=document.getElementById('planJourneyStart'),end=document.getElementById('planJourneyEnd');\n    const box=node=>node&&node.getBoundingClientRect().toJSON();\n    return {card:box(card),grid:box(grid),date:box(date),start:box(start),end:box(end),pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};\n  });\n  assert.ok(planMetrics.card&&planMetrics.grid&&planMetrics.date&&planMetrics.start&&planMetrics.end,`planner date/time controls should render: ${JSON.stringify(planMetrics)}`);\n  assert.ok(planMetrics.date.width<=planMetrics.card.width+1,`planner date must stay inside its card: ${JSON.stringify(planMetrics)}`);\n  assert.ok(planMetrics.start.right<=planMetrics.grid.right+1&&planMetrics.end.right<=planMetrics.grid.right+1,`planner time fields must stay inside the two-column grid: ${JSON.stringify(planMetrics)}`);\n  assert.ok(planMetrics.date.height<=44&&planMetrics.start.height<=44&&planMetrics.end.height<=44,`planner date/time controls should remain compact: ${JSON.stringify(planMetrics)}`);\n  assert.ok(planMetrics.pageOverflow<=1,`planner controls must not create horizontal overflow: ${JSON.stringify(planMetrics)}`);\n  assert.deepEqual(pageErrors,[],`unexpected page errors: ${pageErrors.join('\\n')}`);",
    "planner mobile geometry regression",
)

old_saved_block = """  const savedStart=page.locator(`#savedJourneyList [data-saved-v2-active=\"${savedSetup.id}\"]`);
  await savedStart.waitFor({state:'visible',timeout:10000});
  assert.equal(await savedStart.textContent(),'Start active journey');
  const savedFollow=page.locator(`#savedJourneyList [data-saved-v2-follow=\"${savedSetup.id}\"]`);
  await savedFollow.waitFor({state:'visible',timeout:10000});
  assert.equal(await savedFollow.textContent(),'Follow live here');
  await savedStart.click();
  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_ACTIVE_JOURNEY__?.state?.active&&document.querySelector('#trainActiveJourney:not([hidden])')),null,{timeout:10000});
  const handoff=await page.evaluate(()=>({active:window.__KERBSIDE_ACTIVE_JOURNEY__.state.active,station:window.__KERBSIDE_TRAINS__.state.station,route:window.__KERBSIDE_TRAIN_ROUTES__.state.destination,date:window.__KERBSIDE_TRAIN_DATE__.state.date,savedHidden:document.getElementById('savedJourneySurface').hidden,panel:document.getElementById('trainActiveJourney').textContent.replace(/\\s+/g,' ').trim()}));
"""
new_saved_block = """  const savedFollow=page.locator(`#savedJourneyList [data-saved-v2-follow=\"${savedSetup.id}\"]`);
  await savedFollow.waitFor({state:'visible',timeout:10000});
  assert.equal(await savedFollow.textContent(),'Follow live');
  assert.equal(await page.locator(`#savedJourneyList [data-saved-v2-active=\"${savedSetup.id}\"]`).count(),0,'saved card should expose one live/active action at a time');
  assert.equal((await page.locator(`#savedJourneyList [data-saved-v2-id=\"${savedSetup.id}\"] .saved-v2-refresh-state`).textContent()).trim(),'Live refresh: On');
  await savedFollow.click();
  await page.waitForFunction(id=>Boolean(window.__KERBSIDE_ACTIVE_JOURNEY__?.state?.active&&document.querySelector(`[data-saved-v2-active=\"${id}\"]`)),savedSetup.id,{timeout:10000});
  const inPlace=await page.evaluate(()=>({savedHidden:document.getElementById('savedJourneySurface').hidden}));
  assert.equal(inPlace.savedHidden,false,'Follow live should keep the user in Saved journeys');
  const savedStart=page.locator(`#savedJourneyList [data-saved-v2-active=\"${savedSetup.id}\"]`);
  await savedStart.waitFor({state:'visible',timeout:10000});
  assert.equal(await savedStart.textContent(),'Open active journey');
  await savedStart.click();
  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_ACTIVE_JOURNEY__?.state?.active&&document.querySelector('#trainActiveJourney:not([hidden])')),null,{timeout:10000});
  const handoff=await page.evaluate(()=>({active:window.__KERBSIDE_ACTIVE_JOURNEY__.state.active,station:window.__KERBSIDE_TRAINS__.state.station,route:window.__KERBSIDE_TRAIN_ROUTES__.state.destination,date:window.__KERBSIDE_TRAIN_DATE__.state.date,savedHidden:document.getElementById('savedJourneySurface').hidden,panel:document.getElementById('trainActiveJourney').textContent.replace(/\\s+/g,' ').trim()}));
"""
replace_once(
    "kerbside-backend/tests/train-active-journey-regression.mjs",
    old_saved_block,
    new_saved_block,
    "active journey consolidated saved action regression",
)

replace_once(
    "kerbside-backend/tests/train-active-journey-regression.mjs",
    "  const following=page.locator(`#savedJourneyList [data-saved-v2-follow=\"${savedSetup.id}\"]`);\n  await following.waitFor({state:'visible',timeout:10000});\n  assert.equal(await following.textContent(),'Following live');\n  await openActive.click();",
    "  assert.equal(await page.locator(`#savedJourneyList [data-saved-v2-follow=\"${savedSetup.id}\"]`).count(),0,'active saved card should not show a second Follow live action');\n  assert.equal((await page.locator(`#savedJourneyList [data-saved-v2-id=\"${savedSetup.id}\"] .saved-v2-refresh-state`).textContent()).trim(),'Live refresh: On');\n  await openActive.click();",
    "active saved action remains singular",
)

replace_once(
    "kerbside-backend/tests/train-movement-scope-regression.mjs",
    "assert.match(timetableSource,/data-save-scheduled-journey/,'scheduled train rows must expose a persistent Save journey action');",
    "assert.match(timetableSource,/data-save-follow-journey/,'scheduled train rows must expose one persistent Save and follow action');",
    "movement regression unified action marker",
)
replace_once(
    "kerbside-backend/tests/train-movement-scope-regression.mjs",
    "assert.match(plannerSource,/data-saved-v2-follow/,'Saved Journeys must expose an in-place live follow action');\n",
    "assert.match(plannerSource,/data-saved-v2-follow/,'Saved Journeys must expose an in-place live follow action');\nassert.match(plannerSource,/Live refresh: On/,'Saved Journeys must show an explicit live-refresh state');\n",
    "movement regression live refresh state",
)

Path("kerbside-backend/test/train-journey-ux.test.mjs").write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const [timetable,planner,forecast,css]=await Promise.all([
  fs.readFile(path.join(root,'kerbside-train-timetable.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-journey-planner-core.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-train-forecast-v4.js'),'utf8'),
  fs.readFile(path.join(root,'kerbside-trains.css'),'utf8')
]);

test('scheduled journey card exposes one combined save/follow action',()=>{
  const markup=timetable.match(/function journeyWatchMarkup\\(service,key\\)\\{([\\s\\S]*?)\\n\\}/)?.[1]||'';
  assert.match(markup,/data-save-follow-journey/);
  assert.doesNotMatch(markup,/data-watch-journey/);
  assert.doesNotMatch(markup,/data-save-scheduled-journey/);
  assert.match(timetable,/function saveAndFollowJourneyByKey/);
  assert.match(timetable,/followSavedJourney\\(saved\\.id\\)/);
});

test('saved cards make live refresh explicit and use one live action slot',()=>{
  const card=planner.match(/function cardMarkup\\(saved\\)\\{([\\s\\S]*?)\\nfunction renderSavedView/)?.[1]||'';
  assert.match(card,/Live refresh: On/);
  assert.match(card,/Live refresh: Off until travel day/);
  assert.match(card,/liveAction=startable/);
  assert.match(card,/Follow live/);
  assert.match(card,/Open active journey/);
  assert.doesNotMatch(card,/Start active journey/);
});

test('planner time controls are compact and overflow-safe',()=>{
  assert.match(planner,/min-height:42px/);
  assert.match(planner,/font-size:14px;line-height:1\\.2/);
  assert.match(planner,/grid-template-columns:minmax\\(0,1fr\\) minmax\\(0,1fr\\)/);
  assert.match(planner,/input\\[type=\\\"date\\\"\\],\\.plan-when-card input\\[type=\\\"time\\\"\\]\\{max-width:100%\\}/);
});

test('forecast baseline is nested under methodology and timetabled label is small',()=>{
  assert.match(forecast,/<p>\\$\\{esc\\(method\\)\\}<\\/p>\\$\\{calibrationMarkup\\}<\\/details>/);
  assert.doesNotMatch(forecast,/<\\/details>\\$\\{calibrationMarkup\\}/);
  assert.match(css,/\\.train-scheduled-service \\.train-time \\.train-status\\{font-size:7\\.5px;line-height:1\\.2\\}/);
});
""", encoding="utf-8")

for required_path in [
    "kerbside-train-timetable.js",
    "kerbside-train-forecast-v4.js",
    "kerbside-trains.css",
    "kerbside-journey-planner-core.js",
    "kerbside-backend/tests/train-mobile-layout-regression.mjs",
    "kerbside-backend/tests/train-active-journey-regression.mjs",
    "kerbside-backend/tests/train-browser-core-regression.mjs",
    "kerbside-backend/tests/train-movement-scope-regression.mjs",
    "kerbside-backend/test/train-journey-ux.test.mjs",
]:
    if not Path(required_path).exists():
        raise SystemExit(f"expected release path missing: {required_path}")

print(f"Prepared Kerbside {NEW} journey UX regression patch.")
