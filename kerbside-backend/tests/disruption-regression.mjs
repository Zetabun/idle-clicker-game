import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as playwright from 'playwright';

const ENGINE_NAME = process.env.KERBSIDE_BROWSER || 'webkit';
const engine = playwright[ENGINE_NAME];
if (!engine || typeof engine.launch !== 'function') throw new Error(`Unsupported browser engine: ${ENGINE_NAME}`);
console.log(`Disruption regression engine: ${ENGINE_NAME}`);

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..', '..');
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname === '/' ? 'bus.html' : pathname.replace(/^\/+/, '');
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) && target !== path.join(root, 'bus.html')) throw new Error('outside root');
    const body = await readFile(target);
    const extension = path.extname(target);
    const type = extension === '.css' ? 'text/css; charset=utf-8' : extension === '.js' ? 'text/javascript; charset=utf-8' : extension === '.json' ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const browser = await engine.launch({ headless: true });
const page = await browser.newPage({ timezoneId: 'Europe/London' });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(`http://127.0.0.1:${port}/bus.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__KERBSIDE_TEST__), null, { timeout: 20000 });

  const result = await page.evaluate(() => {
    const api = window.__KERBSIDE_TEST__, state = api.liveState, now = Date.now();
    const saved = {
      stop: state.stop, ttStop: state.ttStop, timetable: state.timetable,
      timetableSource: state.timetableSource, timetableFallback: state.timetableFallback,
      timetableRegion: state.timetableRegion, timetableRun: state.timetableRun,
      dir: state.dir, destFilter: state.destFilter, onlyServing: state.onlyServing
    };
    try {
      const departure = new Date(now + 30 * 60000);
      const mins = departure.getHours() * 60 + departure.getMinutes();
      const trip = 'DISRUPTION-TRIP', pattern = 'dd-disruption-pattern';
      state.stop = { id: '1800TEST', timetableId: '1800TEST', atco: '1800TEST', lat: 52.5, lon: -2.1, name: 'Test Stop', d: 0 };
      state.ttStop = { id: '1800TEST', d: [[mins, '61', 'City Centre', 'daily', 'in', trip, pattern, 'R61', 'BNSM', 1, mins - 20]] };
      state.timetable = {
        services: { daily: { days: '1111111', start: '20260101', end: '20261231', add: [], remove: [] } },
        tripPatterns: { [trip]: pattern },
        patterns: {
          [pattern]: {
            p: [[52.49, -2.1], [52.5, -2.1], [52.51, -2.1]],
            s: [['1800PREV', 'Previous Stop', 52.49, -2.1], ['1800TEST', 'Test Stop', 52.5, -2.1], ['1800NEXT', 'Next Stop', 52.51, -2.1]],
            g: 1
          }
        }
      };
      state.timetableSource = 'national'; state.timetableFallback = false; state.timetableRegion = 'west_midlands'; state.timetableRun++;
      state.dir = 'all'; state.destFilter = null; state.onlyServing = true;

      const situations = [
        { id: 'active', planned: false, summary: 'Active line 61 works', from: new Date(now - 60000).toISOString(), to: new Date(now + 3600000).toISOString(), stops: ['1800TEST'], lines: ['61'], operators: ['BNSM'] },
        { id: 'wrong-line', planned: false, summary: 'Wrong line', from: new Date(now - 60000).toISOString(), to: new Date(now + 3600000).toISOString(), stops: ['1800TEST'], lines: ['99'], operators: ['BNSM'] },
        { id: 'upcoming', planned: true, summary: 'Tomorrow closure', from: new Date(now + 24 * 3600000).toISOString(), to: new Date(now + 26 * 3600000).toISOString(), stops: ['1800TEST'], lines: ['61'], operators: ['BNSM'] },
        { id: 'expired', planned: true, summary: 'Expired', from: new Date(now - 7200000).toISOString(), to: new Date(now - 3600000).toISOString(), stops: ['1800TEST'], lines: ['61'], operators: ['BNSM'] },
        { id: 'network', planned: false, summary: 'Service-wide line 61 change', from: new Date(now - 60000).toISOString(), to: '', stops: [], lines: ['61'], operators: ['BNSM'] },
        { id: 'network-wrong-operator', planned: false, summary: 'Other operator', from: new Date(now - 60000).toISOString(), to: '', stops: [], lines: ['61'], operators: ['OTHER'] },
        { id: 'downstream', planned: false, summary: 'Next stop closure', from: new Date(now - 60000).toISOString(), to: '', stops: ['1800NEXT'], lines: ['61'], operators: ['BNSM'] }
      ];
      api.setDisruptionFeedForTest({
        version: 1, scope: 'kerbside-disruptions', built: new Date(now).toISOString(), situations,
        byStop: { '1800TEST': [0, 1, 2, 3], '1800NEXT': [6] }
      });

      const matches = api.disruptionMatches(now);
      const delayedFeed = { version: 1, scope: 'kerbside-disruptions', built: new Date(now - 48 * 3600000).toISOString(), situations: [], byStop: {} };
      const expiredFeed = { ...delayedFeed, built: new Date(now - 73 * 3600000).toISOString() };
      return {
        states: {
          active: api.disruptionState(situations[0], now),
          upcoming: api.disruptionState(situations[2], now),
          expired: api.disruptionState(situations[3], now)
        },
        ids: matches.map(entry => entry.situation.id),
        networkOnly: matches.find(entry => entry.situation.id === 'network')?.networkOnly || false,
        downstreamOffset: matches.find(entry => entry.situation.id === 'downstream')?.offset,
        upcomingTiming: api.disruptionTimingText(situations[2], 'upcoming'),
        lineCase: api.disruptionAppliesToService({ lines: ['61A'], operators: [] }, '61a', '', false),
        wrongLine: api.disruptionAppliesToService({ lines: ['61'], operators: [] }, '99', '', false),
        operatorMatch: api.disruptionAppliesToService({ lines: ['61'], operators: ['BNSM'] }, '61', 'BNSM', true),
        operatorMismatch: api.disruptionAppliesToService({ lines: ['61'], operators: ['BNSM'] }, '61', 'OTHER', true),
        opaqueAbstains: api.disruptionAppliesToService({ lines: ['61'], operators: ['BNSM'] }, '61', 'OP539', false),
        opaqueCannotStrictMatch: api.disruptionAppliesToService({ lines: ['61'], operators: ['BNSM'] }, '61', 'OP539', true),
        delayedFeedValid: api.validDisruptionFeed(delayedFeed),
        delayedFeedWarns: api.disruptionFeedDelayed(delayedFeed, now),
        expiredFeedValid: api.validDisruptionFeed(expiredFeed)
      };
    } finally {
      Object.assign(state, saved);
    }
  });

  assert.deepEqual(result.states, { active: 'active', upcoming: 'upcoming', expired: 'expired' });
  assert.equal(result.ids.includes('active'), true);
  assert.equal(result.ids.includes('upcoming'), true);
  assert.equal(result.ids.includes('network'), true);
  assert.equal(result.ids.includes('downstream'), true);
  assert.equal(result.ids.includes('wrong-line'), false);
  assert.equal(result.ids.includes('expired'), false);
  assert.equal(result.ids.includes('network-wrong-operator'), false);
  assert.equal(result.networkOnly, true);
  assert.equal(result.downstreamOffset, 1);
  assert.match(result.upcomingTiming, /^Starts /);
  assert.equal(result.lineCase, true);
  assert.equal(result.wrongLine, false);
  assert.equal(result.operatorMatch, true);
  assert.equal(result.operatorMismatch, false);
  assert.equal(result.opaqueAbstains, true);
  assert.equal(result.opaqueCannotStrictMatch, false);
  assert.equal(result.delayedFeedValid, true, 'a bounded last-good disruption feed should survive a short upstream outage');
  assert.equal(result.delayedFeedWarns, true, 'passengers must be told when disruption updates are delayed');
  assert.equal(result.expiredFeedValid, false, 'disruptions older than the bounded outage window must be rejected');
  assert.deepEqual(pageErrors, []);
  console.log('Kerbside disruption matching regression checks passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
