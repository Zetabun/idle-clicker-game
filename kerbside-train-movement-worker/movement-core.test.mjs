import assert from 'node:assert/strict';
import test from 'node:test';
import {
  StompFrameParser,
  applyFeedMessages,
  lookupIndexKey,
  normaliseLookupRef,
  parseMovementBatch,
  publicSnapshot,
  stompAckFrame,
  stompFrame
} from './movement-core.js';

const corpus = {
  '77301': ['BHMN', 'BHM', '123456', 'Birmingham New Street'],
  '16416': ['UNIV', 'UNI', '223456', 'University'],
  '36108': ['LIVBIO', '', '323456', 'Liverpool Biomass Terminal']
};
const now = Date.parse('2026-08-16T19:00:00Z');

function message(type, body) {
  return { header: { msg_type: type, source_system_id: 'TRUST' }, body };
}

const activation = message('0001', {
  train_id: '775F25MP16',
  train_uid: 'C21373',
  tp_origin_timestamp: '2026-08-16',
  origin_dep_timestamp: String(Date.parse('2026-08-16T08:12:00Z')),
  sched_origin_stanox: '77301',
  schedule_wtt_id: '5F25M',
  schedule_start_date: '2026-05-17',
  schedule_type: 'P',
  train_service_code: '25470001',
  toc_id: '25'
});
const departure = message('0003', {
  train_id: '775F25MP16',
  event_type: 'DEPARTURE',
  loc_stanox: '77301',
  next_report_stanox: '16416',
  actual_timestamp: String(Date.parse('2026-08-16T18:58:00Z')),
  planned_timestamp: String(Date.parse('2026-08-16T18:56:00Z')),
  timetable_variation: '2',
  variation_status: 'LATE',
  next_report_run_time: '8',
  event_source: 'SMART',
  platform: '11',
  train_terminated: 'false',
  offroute_ind: 'false'
});

test('STOMP parser accepts heartbeats and multiple frames', () => {
  const parser = new StompFrameParser();
  const connected = stompFrame('CONNECTED', { version: '1.1', server: 'ActiveMQ' });
  const batch = JSON.stringify([activation, departure]);
  const messageFrame = stompFrame('MESSAGE', { subscription: 'movement', 'message-id': 'm-1' }, batch);
  const bytes = new TextEncoder().encode(`\n${connected}${messageFrame}`);
  const first = parser.push(bytes.slice(0, 37));
  const second = parser.push(bytes.slice(37));
  assert.equal(first.length, 0);
  assert.equal(second.length, 2);
  assert.equal(second[0].command, 'CONNECTED');
  assert.equal(second[1].command, 'MESSAGE');
  assert.deepEqual(parseMovementBatch(second[1].body), [activation, departure]);
});

test('ACK is compatible with STOMP 1.1 and 1.2 message headers', () => {
  assert.match(stompAckFrame({ ack: 'ack-22' }), /^ACK\nid:ack-22/);
  const v11 = stompAckFrame({ 'message-id': 'msg-1', subscription: 'movement' });
  assert.match(v11, /^ACK\nmessage-id:msg-1\nsubscription:movement/);
});

test('activation links UID and four-character signalling ID to service date', () => {
  const result = applyFeedMessages([activation], new Map(), corpus, now);
  const snapshot = result.snapshots.get('775F25MP16');
  assert.equal(snapshot.uid, 'C21373');
  assert.equal(snapshot.headcode, '5F25');
  assert.equal(snapshot.date, '2026-08-16');
  assert.equal(snapshot.activation.origin.crs, 'BHM');
  assert.deepEqual(result.indexes.map(item => [item.kind, item.date, item.value]), [
    ['uid', '2026-08-16', 'C21373'],
    ['head', '2026-08-16', '5F25']
  ]);
  assert.equal(lookupIndexKey(normaliseLookupRef('uid:C21373'), '2026-08-16'), 'service:2026-08-16:C21373');
  assert.equal(lookupIndexKey(normaliseLookupRef('head:5f25'), '2026-08-16'), 'head:2026-08-16:5F25');
});

test('movement preserves activation identity and resolves current/next locations', () => {
  const first = applyFeedMessages([activation], new Map(), corpus, now);
  const second = applyFeedMessages([departure], first.snapshots, corpus, now + 5000);
  const snapshot = second.snapshots.get('775F25MP16');
  assert.equal(snapshot.uid, 'C21373');
  assert.equal(snapshot.status, 'running');
  assert.equal(snapshot.lastEvent.eventType, 'DEPARTURE');
  assert.equal(snapshot.lastEvent.location.name, 'Birmingham New Street');
  assert.equal(snapshot.lastEvent.nextLocation.name, 'University');
  assert.equal(snapshot.lastEvent.variationMinutes, 2);
  assert.equal(snapshot.lastEvent.platform, '11');
  assert.equal(snapshot.history.length, 1);
});

test('operational cancellation, reinstatement and change messages remain additive', () => {
  const existing = applyFeedMessages([activation, departure], new Map(), corpus, now).snapshots;
  const rows = [
    message('0002', { train_id: '775F25MP16', loc_stanox: '16416', canx_reason_code: 'XX', canx_timestamp: String(now) }),
    message('0005', { train_id: '775F25MP16', loc_stanox: '16416', reinstatement_timestamp: String(now + 1000) }),
    message('0006', { train_id: '775F25MP16', loc_stanox: '16416', original_loc_stanox: '77301', reason_code: 'TH', coo_timestamp: String(now + 2000) }),
    message('0007', { train_id: '775F25MP16', revised_train_id: '775F26MP16', event_timestamp: String(now + 3000) }),
    message('0008', { train_id: '775F25MP16', loc_stanox: '36108', original_loc_stanox: '16416', event_timestamp: String(now + 4000) })
  ];
  const result = applyFeedMessages(rows, existing, corpus, now + 5000);
  const snapshot = result.snapshots.get('775F25MP16');
  assert.equal(snapshot.status, 'running');
  assert.equal(snapshot.cancellation, undefined);
  assert.equal(snapshot.reinstatement.location.crs, 'UNI');
  assert.equal(snapshot.originChange.location.crs, 'UNI');
  assert.equal(snapshot.identityChange.revisedTrainId, '775F26MP16');
  assert.equal(snapshot.currentTrainId, '775F26MP16');
  assert.equal(snapshot.locationChange.location.name, 'Liverpool Biomass Terminal');
});

test('public snapshots explicitly mark stale movement evidence', () => {
  const snapshot = applyFeedMessages([activation, departure], new Map(), corpus, now).snapshots.get('775F25MP16');
  assert.equal(publicSnapshot(snapshot, now + 30_000).stale, false);
  assert.equal(publicSnapshot(snapshot, now + 181_000).stale, true);
});

test('TRUST BST future-hour anomaly is corrected only for actual event time', () => {
  const futureByHour = message('0003', {
    train_id: '775F25MP16', event_type: 'ARRIVAL', loc_stanox: '16416',
    actual_timestamp: String(now + 60 * 60 * 1000),
    planned_timestamp: String(now + 60 * 60 * 1000), timetable_variation: '0'
  });
  const result = applyFeedMessages([futureByHour], new Map(), corpus, now);
  const event = result.snapshots.get('775F25MP16').lastEvent;
  assert.equal(event.actualTimestamp, now);
  assert.equal(event.plannedTimestamp, now + 60 * 60 * 1000);
});
