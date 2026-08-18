import test from 'node:test';
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
  const markup=timetable.match(/function journeyWatchMarkup\(service,key\)\{([\s\S]*?)\n\}/)?.[1]||'';
  assert.match(markup,/data-save-follow-journey/);
  assert.doesNotMatch(markup,/data-watch-journey/);
  assert.doesNotMatch(markup,/data-save-scheduled-journey/);
  assert.match(timetable,/function saveAndFollowJourneyByKey/);
  assert.match(timetable,/await savedApi\.followSavedJourney\(saved\.id\)/);
  assert.match(timetable,/Saving…/);
  assert.match(timetable,/train-active-inline-action/);
  assert.match(timetable,/actions\.appendChild\(slot\)/);
});

test('saved cards make live refresh explicit and use one live action slot',()=>{
  const card=planner.match(/function cardMarkup\(saved\)\{([\s\S]*?)\nfunction renderSavedView/)?.[1]||'';
  assert.match(card,/Live refresh: On/);
  assert.match(card,/Live refresh: Off until travel day/);
  assert.match(card,/liveAction=startable/);
  assert.match(card,/Follow live/);
  assert.match(card,/Open active journey/);
  assert.doesNotMatch(card,/Start active journey/);
});

test('planner time controls are compact and overflow-safe',()=>{
  assert.match(planner,/min-height:42px/);
  assert.match(planner,/font-size:14px;line-height:1\.2/);
  assert.match(planner,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(planner,/input\[type=\"date\"\],\.plan-when-card input\[type=\"time\"\]\{max-width:100%\}/);
});

test('live calling evidence preserves the scheduled full route and manual scroll',()=>{
  assert.match(timetable,/scheduledPreviousCallingPoints/);
  assert.match(timetable,/scheduledSubsequentCallingPoints/);
});

test('forecast baseline is nested under methodology and timetabled label is small',()=>{
  assert.match(forecast,/<p>\$\{esc\(method\)\}<\/p>\$\{calibrationMarkup\}<\/details>/);
  assert.doesNotMatch(forecast,/<\/details>\$\{calibrationMarkup\}/);
  assert.match(css,/\.train-scheduled-service \.train-time \.train-status\{font-size:7\.5px;line-height:1\.2\}/);
});
