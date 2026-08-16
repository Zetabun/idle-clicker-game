const TEXT_DECODER = new TextDecoder();

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

export function epochMs(value) {
  const raw = number(value);
  if (raw == null || raw <= 0) return null;
  return raw < 1e12 ? Math.round(raw * 1000) : Math.round(raw);
}

export function dateStamp(value) {
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const stamp = epochMs(value);
  if (stamp != null) return new Date(stamp).toISOString().slice(0, 10);
  return '';
}

export function londonDateStamp(value) {
  const stamp = epochMs(value);
  if (stamp == null) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(stamp));
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function londonClockStamp(value) {
  const stamp = epochMs(value);
  if (stamp == null) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date(stamp));
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const hour = map.hour === '24' ? '00' : text(map.hour);
  const minute = text(map.minute);
  return /^\d{2}$/.test(hour) && /^\d{2}$/.test(minute) ? `${hour}:${minute}` : '';
}

export function decodeStompHeader(value) {
  return String(value || '')
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\c/g, ':')
    .replace(/\\\\/g, '\\');
}

export function encodeStompHeader(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/:/g, '\\c');
}

export function stompFrame(command, headers = {}, body = '') {
  const lines = [String(command || '').trim()];
  for (const [name, value] of Object.entries(headers)) {
    if (value == null || value === '') continue;
    lines.push(`${encodeStompHeader(name)}:${encodeStompHeader(value)}`);
  }
  const payload = String(body == null ? '' : body);
  if (payload && !Object.prototype.hasOwnProperty.call(headers, 'content-length')) {
    lines.push(`content-length:${new TextEncoder().encode(payload).byteLength}`);
  }
  lines.push('', payload);
  return `${lines.join('\n')}\0`;
}

export function stompAckFrame(headers = {}) {
  const ack = text(headers.ack);
  if (ack) return stompFrame('ACK', { id: ack });
  const messageId = text(headers['message-id']);
  if (!messageId) return '';
  return stompFrame('ACK', {
    'message-id': messageId,
    subscription: text(headers.subscription)
  });
}

export class StompFrameParser {
  constructor() {
    this.buffer = '';
    this.decoder = new TextDecoder();
  }

  push(chunk) {
    if (chunk == null) return [];
    if (typeof chunk === 'string') this.buffer += chunk;
    else this.buffer += this.decoder.decode(chunk, { stream: true });
    const frames = [];
    while (true) {
      while (this.buffer.startsWith('\n') || this.buffer.startsWith('\r\n')) {
        this.buffer = this.buffer.startsWith('\r\n') ? this.buffer.slice(2) : this.buffer.slice(1);
      }
      const nullIndex = this.buffer.indexOf('\0');
      if (nullIndex < 0) break;
      const raw = this.buffer.slice(0, nullIndex);
      this.buffer = this.buffer.slice(nullIndex + 1);
      if (!raw.trim()) continue;
      const split = raw.search(/\r?\n\r?\n/);
      const head = split >= 0 ? raw.slice(0, split) : raw;
      const body = split >= 0 ? raw.slice(split).replace(/^\r?\n\r?\n/, '') : '';
      const lines = head.split(/\r?\n/);
      const command = text(lines.shift());
      const headers = {};
      for (const line of lines) {
        const colon = line.indexOf(':');
        if (colon <= 0) continue;
        const key = decodeStompHeader(line.slice(0, colon));
        const value = decodeStompHeader(line.slice(colon + 1));
        headers[key] = value;
      }
      frames.push({ command, headers, body, raw });
    }
    return frames;
  }
}

export function parseMovementBatch(value) {
  let parsed = value;
  if (typeof value === 'string' || value instanceof Uint8Array || value instanceof ArrayBuffer) {
    const raw = typeof value === 'string' ? value : TEXT_DECODER.decode(value instanceof Uint8Array ? value : new Uint8Array(value));
    parsed = JSON.parse(raw);
  }
  const rows = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? [parsed] : []);
  return rows.filter(item => item && typeof item === 'object' && item.body && typeof item.body === 'object');
}

export function messageType(message) {
  return text(message && message.header && (message.header.msg_type || message.header.message_type));
}

export function trainIdOf(message) {
  const body = message && message.body || {};
  return text(body.train_id || body.trainId || body.revised_train_id || body.revisedTrainId);
}

export function resolveLocation(stanox, corpus = {}) {
  const code = text(stanox).replace(/\.0$/, '');
  const row = code && corpus && corpus[code];
  if (!code) return null;
  if (!row) return { stanox: code, tiploc: '', crs: '', nlc: '', name: '' };
  if (Array.isArray(row)) {
    return {
      stanox: code,
      tiploc: text(row[0]),
      crs: upper(row[1]),
      nlc: text(row[2]),
      name: text(row[3])
    };
  }
  return {
    stanox: code,
    tiploc: upper(row.tiploc || row.TIPLOC),
    crs: upper(row.crs || row['3alpha'] || row['3ALPHA']),
    nlc: text(row.nlc || row.NLC),
    name: text(row.name || row.description || row.NLCDESC || row.NLCDESC16)
  };
}

export function trustHeadcode(value) {
  const trainId = upper(value);
  return trainId.length >= 6 ? trainId.slice(2, 6) : '';
}

function activationHeadcode(body) {
  const explicit = upper(body.signalling_id || body.schedule_train_id);
  if (explicit) return explicit.slice(0, 4);
  const wtt = upper(body.schedule_wtt_id);
  if (wtt) return wtt.slice(0, 4);
  return trustHeadcode(body.train_id);
}

export function normaliseActivation(message, corpus = {}, now = Date.now()) {
  const body = message && message.body || {};
  const trainId = text(body.train_id);
  const uid = upper(body.train_uid);
  const headcode = activationHeadcode(body);
  const date = londonDateStamp(body.origin_dep_timestamp) || dateStamp(body.tp_origin_timestamp);
  const originStanox = text(body.tp_origin_stanox || body.sched_origin_stanox || body.schedule_origin_stanox || body.origin_stanox);
  return {
    trainId,
    uid,
    headcode,
    date,
    scheduleType: text(body.schedule_type),
    serviceCode: text(body.train_service_code),
    tocId: text(body.toc_id),
    origin: resolveLocation(originStanox, corpus),
    originDepartureTimestamp: epochMs(body.origin_dep_timestamp),
    scheduleStartDate: dateStamp(body.schedule_start_date),
    activatedAt: now
  };
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
  // TRUST documents a long-standing BST quirk where several event timestamps
  // can be one hour in the future. Only correct event timestamps when they are
  // implausibly ahead of receipt; never apply this heuristic to planned times.
  if (stamp > reference + 10 * 60 * 1000 && stamp < reference + 90 * 60 * 1000) return stamp - 60 * 60 * 1000;
  return stamp;
}

export function normaliseMovement(message, corpus = {}, now = Date.now()) {
  const body = message && message.body || {};
  const eventType = upper(body.event_type || body.eventType);
  return {
    trainId: text(body.train_id),
    eventType,
    phase: movementPhase(body, eventType),
    location: resolveLocation(body.loc_stanox, corpus),
    nextLocation: resolveLocation(body.next_report_stanox, corpus),
    actualTimestamp: actualTrustTimestamp(body.actual_timestamp, now),
    plannedTimestamp: epochMs(body.planned_timestamp),
    gbttTimestamp: epochMs(body.gbtt_timestamp),
    variationMinutes: number(body.timetable_variation),
    variationStatus: text(body.variation_status),
    nextReportRunTime: text(body.next_report_run_time),
    offRoute: bool(body.offroute_ind || body.off_route_ind),
    terminated: bool(body.train_terminated),
    autoExpected: bool(body.auto_expected),
    correction: bool(body.correction_ind),
    eventSource: text(body.event_source),
    platform: text(body.platform),
    line: text(body.line_ind),
    route: text(body.route),
    currentTrainId: text(body.current_train_id),
    receivedAt: now
  };
}

export function normaliseCancellation(message, corpus = {}, now = Date.now()) {
  const body = message && message.body || {};
  return {
    trainId: text(body.train_id),
    location: resolveLocation(body.loc_stanox || body.canx_location, corpus),
    reasonCode: text(body.canx_reason_code || body.cancel_reason_code),
    type: text(body.canx_type),
    timestamp: actualTrustTimestamp(body.canx_timestamp || body.actual_timestamp, now),
    receivedAt: now
  };
}

export function normaliseReinstatement(message, corpus = {}, now = Date.now()) {
  const body = message && message.body || {};
  return {
    trainId: text(body.train_id),
    location: resolveLocation(body.loc_stanox, corpus),
    timestamp: actualTrustTimestamp(body.reinstatement_timestamp || body.reinstate_timestamp || body.actual_timestamp, now),
    receivedAt: now
  };
}

export function normaliseOriginChange(message, corpus = {}, now = Date.now()) {
  const body = message && message.body || {};
  return {
    trainId: text(body.train_id),
    location: resolveLocation(body.loc_stanox, corpus),
    originalLocation: resolveLocation(body.original_loc_stanox, corpus),
    reasonCode: text(body.reason_code),
    departureTimestamp: epochMs(body.dep_timestamp),
    eventTimestamp: actualTrustTimestamp(body.coo_timestamp || body.event_timestamp, now),
    receivedAt: now
  };
}

export function normaliseIdentityChange(message, now = Date.now()) {
  const body = message && message.body || {};
  return {
    trainId: text(body.train_id),
    previousCurrentTrainId: text(body.current_train_id),
    revisedTrainId: text(body.revised_train_id),
    eventTimestamp: actualTrustTimestamp(body.event_timestamp, now),
    receivedAt: now
  };
}

export function normaliseLocationChange(message, corpus = {}, now = Date.now()) {
  const body = message && message.body || {};
  return {
    trainId: text(body.train_id),
    location: resolveLocation(body.loc_stanox, corpus),
    originalLocation: resolveLocation(body.original_loc_stanox, corpus),
    departureTimestamp: epochMs(body.dep_timestamp),
    originalLocationTimestamp: epochMs(body.original_loc_timestamp),
    eventTimestamp: actualTrustTimestamp(body.event_timestamp, now),
    receivedAt: now
  };
}

function cloneSnapshot(value, trainId) {
  return value && typeof value === 'object'
    ? { ...value, history: Array.isArray(value.history) ? value.history.slice() : [] }
    : { trainId, uid: '', headcode: '', date: '', status: 'unknown', history: [], updatedAt: 0 };
}

function historyKey(event) {
  return [event && event.actualTimestamp, event && event.eventType, event && event.location && event.location.stanox].join('|');
}

function pushHistory(snapshot, event) {
  const key = historyKey(event);
  const history = Array.isArray(snapshot.history) ? snapshot.history : [];
  if (!history.some(item => historyKey(item) === key)) history.push(event);
  snapshot.history = history.slice(-24);
}

function indexFromActivation(activation) {
  const refs = [];
  if (!activation || !activation.trainId || !activation.date) return refs;
  if (activation.uid) refs.push({ kind: 'uid', date: activation.date, value: activation.uid, trainId: activation.trainId });
  if (activation.headcode) refs.push({ kind: 'head', date: activation.date, value: activation.headcode, trainId: activation.trainId });
  return refs;
}

export function originIndexFromActivation(activation) {
  const crs = upper(activation && activation.origin && activation.origin.crs);
  const departure = londonClockStamp(activation && activation.originDepartureTimestamp);
  if (!activation || !activation.trainId || !activation.date || !/^[A-Z0-9]{3}$/.test(crs) || !/^\d{2}:\d{2}$/.test(departure)) return null;
  return { kind: 'origin', date: activation.date, value: `${crs}|${departure}`, trainId: activation.trainId };
}

function fallbackIndexFromMovement(snapshot, movement) {
  const trainId = text(movement && movement.trainId || snapshot && snapshot.trainId);
  const headcode = upper(snapshot && snapshot.headcode || trustHeadcode(trainId));
  const date = text(snapshot && snapshot.date) || londonDateStamp(movement && (movement.actualTimestamp || movement.plannedTimestamp));
  if (!trainId || !headcode || !date) return null;
  return { kind: 'head', date, value: headcode, trainId };
}

export function applyFeedMessages(messages, existing = new Map(), corpus = {}, now = Date.now()) {
  const snapshots = new Map();
  const indexes = [];
  const fallbackIndexes = [];
  const originIndexes = [];
  const counts = {};
  const touched = new Set();

  for (const message of parseMovementBatch(messages)) {
    const type = messageType(message) || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
    const trainId = trainIdOf(message);
    if (!trainId) continue;
    const prior = snapshots.has(trainId) ? snapshots.get(trainId) : existing.get(trainId);
    const snapshot = cloneSnapshot(prior, trainId);

    if (type === '0001') {
      const activation = normaliseActivation(message, corpus, now);
      snapshot.activation = activation;
      snapshot.uid = activation.uid || snapshot.uid || '';
      snapshot.headcode = activation.headcode || snapshot.headcode || '';
      snapshot.date = activation.date || snapshot.date || '';
      if (!snapshot.lastEvent && snapshot.status !== 'cancelled') snapshot.status = 'activated';
      indexes.push(...indexFromActivation(activation));
      const originIndex = originIndexFromActivation(activation);
      if (originIndex) originIndexes.push(originIndex);
    } else if (type === '0002') {
      snapshot.cancellation = normaliseCancellation(message, corpus, now);
      snapshot.status = 'cancelled';
    } else if (type === '0003') {
      const movement = normaliseMovement(message, corpus, now);
      snapshot.headcode = snapshot.headcode || trustHeadcode(trainId);
      snapshot.date = snapshot.date || londonDateStamp(movement.actualTimestamp || movement.plannedTimestamp);
      snapshot.lastEvent = movement;
      snapshot.status = movement.terminated ? 'terminated' : 'running';
      pushHistory(snapshot, movement);
      const fallbackIndex = fallbackIndexFromMovement(snapshot, movement);
      if (fallbackIndex) fallbackIndexes.push(fallbackIndex);
    } else if (type === '0005') {
      snapshot.reinstatement = normaliseReinstatement(message, corpus, now);
      snapshot.status = snapshot.lastEvent && snapshot.lastEvent.terminated ? 'terminated' : 'running';
      delete snapshot.cancellation;
    } else if (type === '0006') {
      snapshot.originChange = normaliseOriginChange(message, corpus, now);
    } else if (type === '0007') {
      snapshot.identityChange = normaliseIdentityChange(message, now);
      if (snapshot.identityChange.revisedTrainId) snapshot.currentTrainId = snapshot.identityChange.revisedTrainId;
    } else if (type === '0008') {
      snapshot.locationChange = normaliseLocationChange(message, corpus, now);
    } else {
      snapshot.lastOperationalMessage = { type, receivedAt: now };
    }

    snapshot.updatedAt = now;
    snapshots.set(trainId, snapshot);
    touched.add(trainId);
  }

  return { snapshots, indexes, fallbackIndexes, originIndexes, counts, touched: [...touched] };
}

export function publicSnapshot(snapshot, now = Date.now()) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const updatedAt = Number(snapshot.updatedAt) || 0;
  const ageSeconds = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  return {
    ...snapshot,
    ageSeconds,
    stale: ageSeconds == null || ageSeconds > 180
  };
}

export function normaliseLookupRef(value) {
  const raw = text(value);
  const colon = raw.indexOf(':');
  if (colon <= 0) return null;
  const kind = raw.slice(0, colon).toLowerCase();
  const item = raw.slice(colon + 1).trim();
  if (!['uid', 'head', 'train', 'origin'].includes(kind) || !item) return null;
  return { raw, kind, value: kind === 'train' ? item : upper(item) };
}

export function lookupIndexKey(ref, date) {
  const parsed = typeof ref === 'string' ? normaliseLookupRef(ref) : ref;
  if (!parsed) return '';
  if (parsed.kind === 'train') return `train:${parsed.value}`;
  const stamp = dateStamp(date);
  if (!stamp) return '';
  if (parsed.kind === 'origin') return `origin:${stamp}:${parsed.value}`;
  return `${parsed.kind === 'uid' ? 'service' : 'head'}:${stamp}:${parsed.value}`;
}
