import {
  epochMs,
  londonDateStamp,
  messageType,
  resolveLocation,
  trainIdOf,
  trustHeadcode
} from './movement-core.js';

function text(value) {
  return String(value == null ? '' : value).trim();
}

function upper(value) {
  return text(value).toUpperCase();
}

function bool(value) {
  return value === true || value === 1 || /^(?:1|true|yes|y)$/i.test(text(value));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stanox(value) {
  return text(value).replace(/\.0$/, '');
}

function movementPhase(body, eventType) {
  if (bool(body.train_terminated)) return 'terminated';
  if (eventType === 'ARRIVAL') return 'at-station';
  if (eventType === 'DEPARTURE') return 'departed';
  if (eventType === 'PASS') return 'passing';
  return 'running';
}

function actualTrustTimestamp(value, reference = Date.now()) {
  const stamp = epochMs(value);
  if (stamp == null) return null;
  // Keep the same long-standing TRUST BST correction used by the rich path.
  if (stamp > reference + 10 * 60 * 1000 && stamp < reference + 90 * 60 * 1000) return stamp - 60 * 60 * 1000;
  return stamp;
}

export function shouldUseColdPath(message, hot = false) {
  if (hot || messageType(message) !== '0003') return false;
  const body = message && message.body || {};
  return !bool(body.train_terminated);
}

export function normaliseColdMovement(message, now = Date.now()) {
  const body = message && message.body || {};
  const eventType = upper(body.event_type || body.eventType);
  return {
    trainId: text(body.train_id),
    eventType,
    phase: movementPhase(body, eventType),
    locationStanox: stanox(body.loc_stanox),
    nextLocationStanox: stanox(body.next_report_stanox),
    actualTimestamp: actualTrustTimestamp(body.actual_timestamp, now),
    plannedTimestamp: epochMs(body.planned_timestamp),
    gbttTimestamp: epochMs(body.gbtt_timestamp),
    variationMinutes: number(body.timetable_variation),
    variationStatus: text(body.variation_status),
    nextReportRunTime: text(body.next_report_run_time),
    offRoute: bool(body.offroute_ind || body.off_route_ind),
    terminated: false,
    autoExpected: bool(body.auto_expected),
    correction: bool(body.correction_ind),
    eventSource: text(body.event_source),
    platform: text(body.platform),
    line: text(body.line_ind),
    route: text(body.route),
    currentTrainId: text(body.current_train_id),
    receivedAt: now,
    cold: true
  };
}

function copyIdentityAndLifecycle(prior, trainId) {
  const source = prior && typeof prior === 'object' ? prior : {};
  const out = {
    trainId,
    uid: text(source.uid),
    headcode: text(source.headcode),
    date: text(source.date),
    status: text(source.status) || 'unknown',
    updatedAt: Number(source.updatedAt) || 0
  };
  for (const key of [
    'activation',
    'cancellation',
    'reinstatement',
    'originChange',
    'identityChange',
    'locationChange',
    'currentTrainId'
  ]) {
    if (source[key] != null) out[key] = source[key];
  }
  return out;
}

export function makeColdSnapshot(message, prior = null, now = Date.now()) {
  if (!shouldUseColdPath(message, false)) return null;
  const trainId = trainIdOf(message);
  if (!trainId) return null;
  const movement = normaliseColdMovement(message, now);
  const snapshot = copyIdentityAndLifecycle(prior, trainId);
  snapshot.headcode = snapshot.headcode || trustHeadcode(trainId);
  snapshot.date = snapshot.date || londonDateStamp(movement.actualTimestamp || movement.plannedTimestamp);
  snapshot.lastEvent = movement;
  snapshot.status = 'running';
  snapshot.updatedAt = now;
  // Deliberately do not retain rolling history for a cold train. If a train was
  // previously hot, the first later cold movement sheds the old history too.
  delete snapshot.history;
  return snapshot;
}

export function isColdSnapshot(snapshot) {
  return Boolean(snapshot && snapshot.lastEvent && snapshot.lastEvent.cold === true);
}

export function promoteColdSnapshot(snapshot, corpus = {}) {
  if (!isColdSnapshot(snapshot)) return false;
  const event = snapshot.lastEvent;
  const enriched = {
    ...event,
    location: resolveLocation(event.locationStanox, corpus),
    nextLocation: resolveLocation(event.nextLocationStanox, corpus)
  };
  delete enriched.locationStanox;
  delete enriched.nextLocationStanox;
  delete enriched.cold;
  // Mutate the existing snapshot object. The base /movement/train handler may
  // already hold this object when markHot() is called, so in-place promotion
  // guarantees that the very first response contains resolved locations.
  snapshot.lastEvent = enriched;
  snapshot.history = [enriched];
  return true;
}
