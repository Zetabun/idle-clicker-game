import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../../kerbside-train-movement.js', import.meta.url), 'utf8');

assert.match(source, /const VERSION='0\.9\.37'/, 'movement frontend must identify the screen-scoped build');
assert.match(source, /const MAX_REFS_PER_REQUEST=40;/, 'point 3 must remain out of this build');

assert.match(source, /plan-result-details\[open\]/, 'planner polling must be scoped to an opened journey result');
assert.match(source, /__KERBSIDE_SAVED_JOURNEYS_V2__/, 'saved-journey screen state must participate in movement scope selection');
assert.match(source, /if\(savedApi\?\.state\?\.active\)return targets;/, 'saved-journey overview must not continuously poll every saved train');
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

console.log('Screen-scoped movement polling and timetable-origin regression guards passed.');
