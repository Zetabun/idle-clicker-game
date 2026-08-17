import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../../kerbside-train-movement.js', import.meta.url), 'utf8');
const workerSource = fs.readFileSync(new URL('../../kerbside-train-movement-worker/worker.js', import.meta.url), 'utf8');
const timetableSource = fs.readFileSync(new URL('../../kerbside-train-timetable.js', import.meta.url), 'utf8');
const version = fs.readFileSync(new URL('../../VERSION', import.meta.url), 'utf8').trim().replace(/\./g,'\\.');

assert.match(source, new RegExp(`const VERSION='${version}'`), 'movement frontend must identify the current app release');
assert.match(source, /const MAX_REFS_PER_REQUEST=60;/, 'movement frontend must use the Worker-supported 60-ref batch size');
assert.match(source, /chunk\(\[\.\.\.set\],MAX_REFS_PER_REQUEST\)/, 'movement requests must be chunked by the configured batch limit');
assert.match(workerSource, /const MAX_LOOKUP_REFS = 60;/, 'frontend batch size must remain aligned with the movement Worker lookup cap');

assert.match(source, /plan-result-details\[open\]/, 'planner polling must be scoped to an opened journey result');
assert.match(source, /__KERBSIDE_SAVED_JOURNEYS_V2__/, 'saved-journey screen state must participate in movement scope selection');
assert.match(source, /activeOnSaved/, 'an Active Journey being viewed on Saved journeys must be recognised as a special scope');
assert.match(source, /finishScope\(activeOnSaved\?'saved-active':'active',targets\)/, 'Saved journeys may poll only the one service that owns Active Journey');
assert.match(source, /if\(savedApi\?\.state\?\.active\)return finishScope\('saved',targets\);/, 'ordinary saved-journey overview must still avoid polling every saved train');
assert.match(source, /ensureCard\(card,following\?snapshot:null,\{compact:true\}\)/, 'the followed saved card must receive the detailed Network Rail movement card');
assert.doesNotMatch(source, /readSavedJourneys\(\)\|\|\[\]\)\{\s*if\(saved\.date!==today\)/, 'the legacy all-saved polling loop must be removed');
assert.match(source, /trainActiveJourney/, 'active journey visibility must be an explicit polling scope');
assert.match(source, /train-service\.open\[data-service-id\]/, 'an opened board service must narrow the polling scope');
assert.match(source, /scopeSignature/, 'scope changes must be detected independently of the 15-second timer');
assert.match(source, /scopeChanged/, 'scope changes must bypass the normal refresh throttle');
assert.match(source, /document\.addEventListener\('click'.*scheduleRefresh/s, 'screen interactions must schedule a scope re-check');
assert.match(source, /document\.addEventListener\('toggle'.*scheduleRefresh/s, 'opening planner details must schedule a scope re-check');

assert.match(
  source,
  /\(boardId==='trainBoard'\|\|boardId==='trainScheduledBoard'\)/,
  'both live and scheduled boards must use the selected board station as the journey start'
);
assert.match(timetableSource,/flattenCallingPoints\(target\.previousCallingPoints\)/,'scheduled/live-adjusted timelines must retain previous calling points');
assert.match(timetableSource,/renderPoint\(point,'passed'\)/,'previous calling points must render as completed timeline rows');
assert.match(timetableSource,/data-save-scheduled-journey/,'scheduled train rows must expose a persistent Save journey action');
const plannerSource=fs.readFileSync(new URL('../../kerbside-journey-planner-core.js', import.meta.url), 'utf8');
assert.match(plannerSource,/planSaveBoardService/,'board services must be saved through the normal Saved Journeys locator store');
assert.match(plannerSource,/data-saved-v2-follow/,'Saved Journeys must expose an in-place live follow action');
assert.match(plannerSource,/Match & event context/,'the followed saved card must retain event context');

console.log('Screen-scoped movement polling and timetable-origin regression guards passed.');
