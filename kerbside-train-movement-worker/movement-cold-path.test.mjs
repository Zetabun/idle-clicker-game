import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { applyFeedMessages } from './movement-core.js';
import {
  isColdSnapshot,
  makeColdSnapshot,
  promoteColdSnapshot,
  shouldUseColdPath
} from './movement-cold-path.js';
import { compactRecoverySnapshot, shouldQueueRecovery } from './movement-storage-policy.js';

const NOW = 1_710_000_000_000;
const TRAIN_ID = '123A45';
const CORPUS = {
  '10001': ['ALPHA', 'AAA', '1001', 'Alpha Central'],
  '10002': ['BRAVO', 'BBB', '1002', 'Bravo Junction']
};

function movement(overrides = {}) {
  return {
    header: { msg_type: '0003' },
    body: {
      train_id: TRAIN_ID,
      event_type: 'DEPARTURE',
      loc_stanox: '10001',
      next_report_stanox: '10002',
      actual_timestamp: NOW - 60_000,
      planned_timestamp: NOW - 120_000,
      gbtt_timestamp: NOW - 120_000,
      timetable_variation: '1',
      variation_status: 'LATE',
      next_report_run_time: '4',
      offroute_ind: 'false',
      train_terminated: 'false',
      auto_expected: 'true',
      correction_ind: 'false',
      event_source: 'AUTOMATIC',
      platform: '4',
      line_ind: 'UP',
      route: '1',
      current_train_id: TRAIN_ID,
      ...overrides
    }
  };
}

function priorSnapshot() {
  return {
    trainId: TRAIN_ID,
    uid: 'C12345',
    headcode: '1A23',
    date: '2024-03-09',
    status: 'running',
    updatedAt: NOW - 300_000,
    activation: {
      trainId: TRAIN_ID,
      uid: 'C12345',
      headcode: '1A23',
      date: '2024-03-09',
      origin: { stanox: '10001', crs: 'AAA', name: 'Alpha Central' },
      originDepartureTimestamp: NOW - 600_000
    },
    history: [{ eventType: 'ARRIVAL', actualTimestamp: NOW - 300_000 }]
  };
}

test('ordinary cold 0003 keeps raw STANOX and sheds rolling history', () => {
  const message = movement();
  assert.equal(shouldUseColdPath(message, false), true);
  assert.equal(shouldUseColdPath(message, true), false);

  const cold = makeColdSnapshot(message, priorSnapshot(), NOW);
  assert.ok(cold);
  assert.equal(isColdSnapshot(cold), true);
  assert.equal(cold.uid, 'C12345');
  assert.equal(cold.headcode, '1A23');
  assert.equal(cold.lastEvent.locationStanox, '10001');
  assert.equal(cold.lastEvent.nextLocationStanox, '10002');
  assert.equal(Object.hasOwn(cold.lastEvent, 'location'), false);
  assert.equal(Object.hasOwn(cold.lastEvent, 'nextLocation'), false);
  assert.equal(Object.hasOwn(cold, 'history'), false);
});

test('first promotion resolves locations and matches the rich movement payload', () => {
  const message = movement();
  const prior = priorSnapshot();
  const cold = makeColdSnapshot(message, prior, NOW);
  let corpusReads = 0;
  const countedCorpus = new Proxy(CORPUS, {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/.test(property)) corpusReads += 1;
      return Reflect.get(target, property, receiver);
    }
  });

  assert.equal(corpusReads, 0);
  assert.equal(promoteColdSnapshot(cold, countedCorpus), true);
  assert.equal(corpusReads, 2);
  assert.equal(isColdSnapshot(cold), false);
  assert.equal(cold.lastEvent.location.crs, 'AAA');
  assert.equal(cold.lastEvent.nextLocation.crs, 'BBB');
  assert.equal(cold.history.length, 1);

  const rich = applyFeedMessages([message], new Map([[TRAIN_ID, prior]]), CORPUS, NOW).snapshots.get(TRAIN_ID);
  assert.deepEqual(cold.lastEvent, rich.lastEvent);
});

test('termination never uses the cheap cold path', () => {
  const terminated = movement({ train_terminated: 'true' });
  assert.equal(shouldUseColdPath(terminated, false), false);
  assert.equal(makeColdSnapshot(terminated, priorSnapshot(), NOW), null);
  const rich = applyFeedMessages([terminated], new Map([[TRAIN_ID, priorSnapshot()]]), CORPUS, NOW).snapshots.get(TRAIN_ID);
  assert.equal(rich.status, 'terminated');
  assert.equal(rich.lastEvent.terminated, true);
  assert.equal(rich.lastEvent.location.crs, 'AAA');
});

test('idle/recovery checkpoint compaction preserves a cold latest position', () => {
  const cold = makeColdSnapshot(movement(), priorSnapshot(), NOW);
  const compact = compactRecoverySnapshot(cold);
  assert.equal(compact.lastEvent.locationStanox, '10001');
  assert.equal(compact.lastEvent.nextLocationStanox, '10002');
  assert.equal(compact.lastEvent.cold, true);
  assert.equal(Object.hasOwn(compact, 'history'), false);
  assert.equal(promoteColdSnapshot(compact, CORPUS), true);
  assert.equal(compact.lastEvent.location.crs, 'AAA');
});

test('20,000 ordinary cold movements make zero persistence decisions', () => {
  let writes = 0;
  let prior = priorSnapshot();
  for (let i = 0; i < 20_000; i += 1) {
    const snapshot = makeColdSnapshot(movement({ actual_timestamp: NOW + i }), prior, NOW + i);
    const plan = shouldQueueRecovery({ types: ['0003'], snapshot, hot: false, now: NOW + i });
    if (plan.queue) writes += 1;
    prior = snapshot;
  }
  assert.equal(writes, 0);
});

test('0.9.36 wrapper keeps the hot movement path free of direct storage mutation', () => {
  const source = fs.readFileSync(new URL('./worker-v0.9.36.js', import.meta.url), 'utf8');
  assert.match(source, /shouldUseColdPath\(message, this\.isHot\(trainId, now\)\)/);
  assert.match(source, /promoteColdSnapshot\(snapshot, CORPUS\)/);
  assert.doesNotMatch(source, /sql\.exec|ctx\.storage\.(?:put|delete)/i);
});
