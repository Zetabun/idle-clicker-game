import { DurableObject } from 'cloudflare:workers';
import { connect } from 'cloudflare:sockets';
import { CORPUS, CORPUS_META } from './corpus.generated.js';
import {
  StompFrameParser,
  applyFeedMessages,
  lookupIndexKey,
  messageType,
  normaliseLookupRef,
  originIndexFromActivation,
  parseMovementBatch,
  publicSnapshot,
  stompAckFrame,
  stompFrame,
  trainIdOf
} from './movement-core.js';
import {
  HOT_TRAIN_TTL_MS,
  INDEX_REBUILD_MS,
  LIVE_RETENTION_MS,
  MAX_LIVE_SNAPSHOTS,
  MAX_RECOVERED_SNAPSHOTS,
  MAX_RECOVERY_BUFFER,
  RECOVERY_CHUNK_SIZE,
  RECOVERY_FLUSH_MS,
  RECOVERY_LOAD_MAX_PAGES,
  RECOVERY_LOAD_PAGE_SIZE,
  RECOVERY_PREFIX,
  RECOVERY_RETENTION_MS,
  compactLiveSnapshot,
  compactRecoverySnapshot,
  recoveryKey,
  recoveryKeyExpired,
  recoveryKeyTimestamp,
  shouldQueueRecovery,
  splitRecoveryEntries
} from './movement-storage-policy.js';
import {
  DEMAND_TTL_MS,
  IDLE_CATCHUP_MS,
  IDLE_CHECKPOINT_MANIFEST_KEY,
  IDLE_CHECKPOINT_MAX_SNAPSHOTS,
  IDLE_SYNC_INTERVAL_MS,
  alternateCheckpointSlot,
  checkpointChunkKey,
  hasRecentDemand,
  nextActiveAlarmAt,
  splitCheckpointSnapshots
} from './movement-idle-policy.js';

const VERSION = '0.9.38';
const STOMP_HOST = 'publicdatafeeds.networkrail.co.uk';
const STOMP_PORT = 61618;
const STOMP_TOPIC = '/topic/TRAIN_MVT_ALL_TOC';
const SUBSCRIPTION_ID = 'kerbside-train-movement';
const SUBSCRIPTION_NAME = 'kerbside-train-mvt-v1';
const SOCKET_RENEW_MS = 11 * 60 * 1000;
const HEARTBEAT_MS = 15 * 1000;
const CONNECT_TIMEOUT_MS = 12 * 1000;
const SNAPSHOT_RETENTION_MS = 36 * 60 * 60 * 1000;
const MAX_LOOKUP_REFS = 60;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_DEFAULT = 180;
const RATE_BUCKETS = new Map();
const MAX_RATE_BUCKETS = 2048;

function text(value) { return String(value == null ? '' : value).trim(); }
function upper(value) { return text(value).toUpperCase(); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function safeMessage(error) { return text(error && error.message || error || 'Unknown error').slice(0, 500); }
function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}
function londonDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function originLookupKeys(ref, date, windowMinutes = 2) {
  const match = upper(ref && ref.value).match(/^([A-Z0-9]{3})\|(\d{2}):(\d{2})$/);
  const stamp = text(date);
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return [];
  const hour = Number(match[2]), minute = Number(match[3]);
  if (hour > 23 || minute > 59) return [];
  const base = new Date(`${stamp}T12:00:00Z`), out = [];
  for (let delta = -windowMinutes; delta <= windowMinutes; delta += 1) {
    let total = hour * 60 + minute + delta, dayShift = 0;
    while (total < 0) { total += 1440; dayShift -= 1; }
    while (total >= 1440) { total -= 1440; dayShift += 1; }
    const day = new Date(base); day.setUTCDate(day.getUTCDate() + dayShift);
    const dayStamp = day.toISOString().slice(0, 10);
    const clock = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    out.push(`origin:${dayStamp}:${match[1]}|${clock}`);
  }
  return out;
}
function configuredOrigins(env) {
  return text(env.ALLOWED_ORIGINS || 'https://zetabun.github.io')
    .split(',').map(value => value.trim()).filter(Boolean);
}
function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const configured = configuredOrigins(env);
  if (!origin) return configured[0] || '*';
  return configured.includes('*') || configured.includes(origin) ? origin : '';
}
function requestOriginAllowed(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!origin) return true;
  const configured = configuredOrigins(env);
  return configured.includes('*') || configured.includes(origin);
}
function corsHeaders(request, env) {
  const headers = {};
  const origin = allowedOrigin(request, env);
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  headers.Vary = 'Origin';
  headers['Access-Control-Expose-Headers'] = 'X-Kerbside-Movement-Source,X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset,Retry-After';
  return headers;
}
function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function preflight(request, env) {
  const headers = new Headers(corsHeaders(request, env));
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Accept,Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}
function configuredRateLimit(env) {
  const value = Number(env.RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(value) ? Math.max(20, Math.min(1200, Math.floor(value))) : RATE_LIMIT_DEFAULT;
}
function pruneRateBuckets(now) {
  for (const [key, bucket] of RATE_BUCKETS) if (!bucket || bucket.resetAt <= now) RATE_BUCKETS.delete(key);
  while (RATE_BUCKETS.size > MAX_RATE_BUCKETS) RATE_BUCKETS.delete(RATE_BUCKETS.keys().next().value);
}
function consumeRateLimit(request, env) {
  const limit = configuredRateLimit(env), now = Date.now();
  const ip = text(request.headers.get('CF-Connecting-IP'));
  if (!ip) return { allowed: true, limit, remaining: limit, resetAt: now + RATE_WINDOW_MS, retryAfter: 0 };
  if (RATE_BUCKETS.size >= MAX_RATE_BUCKETS) pruneRateBuckets(now);
  const key = `ip:${ip}`;
  let bucket = RATE_BUCKETS.get(key);
  if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
  bucket.count += 1; RATE_BUCKETS.set(key, bucket);
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}
function withRate(response, rate) {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', String(rate.limit));
  headers.set('X-RateLimit-Remaining', String(rate.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(rate.resetAt / 1000)));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return preflight(request, env);
    if (!['GET', 'POST'].includes(request.method)) return withCors(json({ error: 'Method not allowed' }, 405), request, env);
    if (!requestOriginAllowed(request, env)) return withCors(json({ error: 'Origin is not allowed' }, 403, { 'Cache-Control': 'no-store' }), request, env);
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/movement/')) return withCors(json({ error: 'Not found' }, 404), request, env);
    const rate = consumeRateLimit(request, env);
    if (!rate.allowed) {
      return withCors(withRate(json({ error: 'Too many movement requests', retryable: true }, 429, {
        'Retry-After': String(rate.retryAfter), 'Cache-Control': 'no-store'
      }), rate), request, env);
    }
    const id = env.TRAIN_MOVEMENT.idFromName('network-rail-train-movement');
    const stub = env.TRAIN_MOVEMENT.get(id);
    let response;
    try { response = await stub.fetch(request); }
    catch (error) { response = json({ error: 'Movement service unavailable', detail: safeMessage(error), retryable: true }, 503, { 'Cache-Control': 'no-store' }); }
    return withCors(withRate(response, rate), request, env);
  }
};

export class TrainMovementHub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.socket = null;
    this.writer = null;
    this.reader = null;
    this.readLoopPromise = null;
    this.parser = new StompFrameParser();
    this.connectPromise = null;
    this.connectedResolve = null;
    this.connectedReject = null;
    this.heartbeatTimer = null;
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.connectionStartedAt = 0;
    this.lastDemandAt = 0;
    this.nextAlarmAt = 0;
    this.idleTransition = false;
    this.status = {
      state: 'idle', connectedAt: 0, lastFrameAt: 0, lastMessageAt: 0,
      lastError: '', batches: 0, messages: 0, reconnects: 0, protocol: '', server: ''
    };
    this.sql = ctx.storage.sql;
    this.liveSnapshots = new Map();
    this.recoveredSnapshots = new Map();
    this.memoryServiceIndex = new Map();
    this.memoryHeadIndex = new Map();
    this.memoryOriginIndex = new Map();
    this.hotTrainUntil = new Map();
    this.lastCheckpointAt = new Map();
    this.recoveryBuffer = new Map();
    this.lastRecoveryFlushAt = 0;
    this.lastMemoryPruneAt = 0;
    this.lastIndexRebuildAt = 0;
    this.lastStorageCleanupAt = 0;
    this.recoveryFlushPromise = null;
    this.idleCheckpoint = {
      loaded: false,
      slot: '',
      createdAt: 0,
      snapshotCount: 0,
      chunkCount: 0,
      maxUpdatedAt: 0,
      lastMessageAt: 0,
      lastStorageCleanupAt: 0
    };
    this.idleStats = {
      mode: 'idle',
      idleSince: 0,
      lastCatchupAt: 0,
      lastCheckpointAt: 0,
      checkpointSnapshots: 0,
      checkpointChunks: 0,
      restoredSnapshots: 0
    };
    this.storageStats = {
      mode: 'memory-first', writes: 0, writeFailures: 0, recoveryDropped: 0,
      checkpointWrites: 0, checkpointWriteFailures: 0,
      lastFlushAt: 0, lastWriteError: '', legacyRestored: 0, recoveryRestored: 0, idleRestored: 0
    };

    this.sql.exec(`CREATE TABLE IF NOT EXISTS snapshots (
      train_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS snapshots_updated ON snapshots(updated_at)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS service_index (
      key TEXT PRIMARY KEY,
      train_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS service_index_updated ON service_index(updated_at)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS head_fallback_index (
      key TEXT NOT NULL,
      train_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY(key, train_id)
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS head_fallback_updated ON head_fallback_index(updated_at)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS origin_fallback_index (
      key TEXT NOT NULL,
      train_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY(key, train_id)
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS origin_fallback_updated ON origin_fallback_index(updated_at)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
    this.restoreStatus();
    this.ctx.blockConcurrencyWhile(() => this.restoreRecoveryState());
  }

  restoreStatus() {
    try {
      const rows = [...this.sql.exec('SELECT value FROM meta WHERE key = ?', 'status')];
      if (rows[0] && rows[0].value) this.status = { ...this.status, ...JSON.parse(rows[0].value), state: 'idle' };
    } catch {}
  }

  saveStatus() {
    // Health counters remain memory-only. Persisting them per TRUST batch would
    // recreate the rows_written problem fixed in 0.9.34.
  }

  addMemoryIndex(map, key, trainId) {
    if (!key || !trainId) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(trainId);
  }

  registerSnapshot(snapshot) {
    if (!snapshot || !snapshot.trainId) return;
    const date = text(snapshot.date || snapshot.activation && snapshot.activation.date);
    const uid = upper(snapshot.uid || snapshot.activation && snapshot.activation.uid);
    const head = upper(snapshot.headcode || snapshot.activation && snapshot.activation.headcode);
    if (uid && date) this.addMemoryIndex(this.memoryServiceIndex, lookupIndexKey({ kind: 'uid', value: uid }, date), snapshot.trainId);
    if (head && date) this.addMemoryIndex(this.memoryHeadIndex, lookupIndexKey({ kind: 'head', value: head }, date), snapshot.trainId);
    const origin = originIndexFromActivation(snapshot.activation);
    if (origin) this.addMemoryIndex(this.memoryOriginIndex, lookupIndexKey({ kind: 'origin', value: origin.value }, origin.date), snapshot.trainId);
  }

  rememberRecovered(snapshot, source = 'recovery') {
    const compact = compactRecoverySnapshot(snapshot);
    if (!compact) return false;
    const prior = this.recoveredSnapshots.get(compact.trainId);
    if (prior && Number(compact.updatedAt || 0) < Number(prior.updatedAt || 0)) return false;
    this.recoveredSnapshots.set(compact.trainId, compact);
    this.lastCheckpointAt.set(compact.trainId, Number(compact.updatedAt) || 0);
    this.registerSnapshot(compact);
    if (source === 'legacy') this.storageStats.legacyRestored += 1;
    else if (source === 'idle') this.storageStats.idleRestored += 1;
    else if (source === 'recovery') this.storageStats.recoveryRestored += 1;
    return true;
  }

  async restoreIdleCheckpoint() {
    try {
      const manifest = await this.ctx.storage.get(IDLE_CHECKPOINT_MANIFEST_KEY, { noCache: true });
      if (!manifest || !['a', 'b'].includes(manifest.slot) || !Number.isFinite(Number(manifest.chunkCount))) return null;
      const chunkCount = Math.max(0, Math.min(128, Math.floor(Number(manifest.chunkCount) || 0)));
      let restored = 0;
      for (let offset = 0; offset < chunkCount; offset += 100) {
        const keys = [];
        for (let i = offset; i < Math.min(chunkCount, offset + 100); i += 1) keys.push(checkpointChunkKey(manifest.slot, i));
        const values = keys.length ? await this.ctx.storage.get(keys, { noCache: true }) : new Map();
        for (const key of keys) {
          const raw = values && typeof values.get === 'function' ? values.get(key) : null;
          if (typeof raw !== 'string') continue;
          let rows;
          try { rows = JSON.parse(raw); } catch { continue; }
          for (const snapshot of Array.isArray(rows) ? rows : []) if (this.rememberRecovered(snapshot, 'idle')) restored += 1;
        }
      }
      this.idleCheckpoint = {
        loaded: true,
        slot: manifest.slot,
        createdAt: Number(manifest.createdAt) || 0,
        snapshotCount: Number(manifest.snapshotCount) || restored,
        chunkCount,
        maxUpdatedAt: Number(manifest.maxUpdatedAt) || 0,
        lastMessageAt: Number(manifest.lastMessageAt) || 0,
        lastStorageCleanupAt: Number(manifest.lastStorageCleanupAt) || 0
      };
      this.idleStats.lastCheckpointAt = this.idleCheckpoint.createdAt;
      this.idleStats.checkpointSnapshots = this.idleCheckpoint.snapshotCount;
      this.idleStats.checkpointChunks = chunkCount;
      this.idleStats.restoredSnapshots = restored;
      this.status.lastMessageAt = Math.max(Number(this.status.lastMessageAt) || 0, this.idleCheckpoint.lastMessageAt);
      this.lastStorageCleanupAt = Number(manifest.lastStorageCleanupAt) || 0;
      return this.idleCheckpoint;
    } catch (error) {
      this.storageStats.lastWriteError = `Idle checkpoint read: ${safeMessage(error)}`;
      return null;
    }
  }

  async restoreRecoveryEntries(afterTimestamp = 0) {
    const now = Date.now();
    try {
      let end = '';
      for (let page = 0; page < RECOVERY_LOAD_MAX_PAGES; page += 1) {
        const options = { prefix: RECOVERY_PREFIX, reverse: true, limit: RECOVERY_LOAD_PAGE_SIZE, noCache: true };
        if (end) options.end = end;
        const rows = await this.ctx.storage.list(options);
        if (!rows.size) break;
        let oldest = '';
        let reachedCheckpoint = false;
        for (const [key, value] of rows) {
          oldest = key;
          const stamp = Number(recoveryKeyTimestamp(key)) || 0;
          if (afterTimestamp && stamp && stamp <= afterTimestamp) { reachedCheckpoint = true; break; }
          if (recoveryKeyExpired(key, now, RECOVERY_RETENTION_MS)) continue;
          for (const snapshot of Array.isArray(value && value.snapshots) ? value.snapshots : []) this.rememberRecovered(snapshot, 'recovery');
        }
        this.pruneMemory(now, true);
        if (reachedCheckpoint || rows.size < RECOVERY_LOAD_PAGE_SIZE || !oldest) break;
        end = oldest;
      }
    } catch (error) {
      this.storageStats.lastWriteError = `Recovery read: ${safeMessage(error)}`;
    }
  }

  async restoreRecoveryState() {
    const now = Date.now(), cutoff = now - RECOVERY_RETENTION_MS;
    const idle = await this.restoreIdleCheckpoint();
    if (!idle) {
      try {
        for (const row of this.sql.exec(
          'SELECT train_id,payload,updated_at FROM snapshots WHERE updated_at >= ? ORDER BY updated_at DESC LIMIT ?',
          cutoff, MAX_RECOVERED_SNAPSHOTS
        )) {
          let snapshot;
          try { snapshot = JSON.parse(row.payload); } catch { continue; }
          if (snapshot && !snapshot.trainId) snapshot.trainId = text(row.train_id);
          this.rememberRecovered(snapshot, 'legacy');
        }
      } catch {}
    }
    await this.restoreRecoveryEntries(idle && idle.createdAt || 0);
    this.pruneMemory(now, true);
  }

  uniqueMemory(map, key) {
    const set = key && map.get(key);
    return set && set.size === 1 ? [...set][0] : '';
  }

  markHot(trainId, now = Date.now()) { if (trainId) this.hotTrainUntil.set(trainId, now + HOT_TRAIN_TTL_MS); }
  isHot(trainId, now = Date.now()) { return Number(this.hotTrainUntil.get(trainId) || 0) > now; }

  recordDemand(now = Date.now()) {
    const becameActive = !hasRecentDemand(this.lastDemandAt, now);
    this.lastDemandAt = now;
    this.idleStats.mode = 'active';
    this.idleStats.idleSince = 0;
    return becameActive;
  }

  hasDemand(now = Date.now()) { return hasRecentDemand(this.lastDemandAt, now); }

  responseSnapshot(trainId) {
    const snapshot = this.snapshotByTrainId(trainId);
    if (!snapshot) return null;
    const live = this.liveSnapshots.has(trainId), response = publicSnapshot(snapshot);
    response.reacquiring = !live && ['idle', 'connecting', 'connected', 'disconnected'].includes(this.status.state)
      && ['activated', 'running'].includes(text(snapshot.status));
    response.storageSource = live ? 'memory-live' : 'recovery-checkpoint';
    return response;
  }

  queueRecovery(snapshot, reason) {
    const compact = compactRecoverySnapshot(snapshot);
    if (!compact) return;
    compact.recoveryReason = reason;
    if (!this.recoveryBuffer.has(compact.trainId) && this.recoveryBuffer.size >= MAX_RECOVERY_BUFFER) {
      const oldest = this.recoveryBuffer.keys().next().value;
      if (oldest) { this.recoveryBuffer.delete(oldest); this.storageStats.recoveryDropped += 1; }
    }
    this.recoveryBuffer.set(compact.trainId, compact);
  }

  async maybeFlushRecovery(force = false) {
    const now = Date.now();
    if (!this.recoveryBuffer.size) return false;
    if (!force && now - this.lastRecoveryFlushAt < RECOVERY_FLUSH_MS) return false;
    if (this.recoveryFlushPromise) return this.recoveryFlushPromise;
    this.recoveryFlushPromise = this.flushRecoveryBuffer(now).finally(() => { this.recoveryFlushPromise = null; });
    return this.recoveryFlushPromise;
  }

  async flushRecoveryBuffer(now = Date.now()) {
    const captured = [...this.recoveryBuffer.entries()];
    if (!captured.length) return false;
    const chunks = splitRecoveryEntries(captured.map(([, snapshot]) => snapshot), RECOVERY_CHUNK_SIZE);
    try {
      for (let i = 0; i < chunks.length; i += 1) {
        await this.ctx.storage.put(recoveryKey(now, i), { createdAt: now, snapshots: chunks[i] });
      }
      for (const [trainId, snapshot] of captured) {
        const current = this.recoveryBuffer.get(trainId);
        if (current && Number(current.updatedAt || 0) <= Number(snapshot.updatedAt || 0)) this.recoveryBuffer.delete(trainId);
        this.rememberRecovered(snapshot, 'memory');
      }
      this.lastRecoveryFlushAt = now;
      this.storageStats.writes += chunks.length;
      this.storageStats.lastFlushAt = now;
      this.storageStats.lastWriteError = '';
      return true;
    } catch (error) {
      this.storageStats.writeFailures += 1;
      this.storageStats.lastWriteError = safeMessage(error);
      return false;
    }
  }

  trimSnapshotMap(map, retention, max, now) {
    for (const [trainId, snapshot] of map) if (now - Number(snapshot.updatedAt || 0) > retention) map.delete(trainId);
    if (map.size > max) {
      const oldest = [...map.entries()].sort((a, b) => Number(a[1] && a[1].updatedAt || 0) - Number(b[1] && b[1].updatedAt || 0));
      for (let i = 0; i < oldest.length - max; i += 1) map.delete(oldest[i][0]);
    }
  }

  rebuildMemoryIndexes(now = Date.now()) {
    this.memoryServiceIndex = new Map();
    this.memoryHeadIndex = new Map();
    this.memoryOriginIndex = new Map();
    for (const [trainId, snapshot] of this.recoveredSnapshots) if (!this.liveSnapshots.has(trainId)) this.registerSnapshot(snapshot);
    for (const snapshot of this.liveSnapshots.values()) this.registerSnapshot(snapshot);
    this.lastIndexRebuildAt = now;
  }

  pruneMemory(now = Date.now(), force = false) {
    if (!force && now - this.lastMemoryPruneAt < 60000) return;
    this.lastMemoryPruneAt = now;
    for (const [trainId, until] of this.hotTrainUntil) if (until <= now) this.hotTrainUntil.delete(trainId);
    this.trimSnapshotMap(this.liveSnapshots, LIVE_RETENTION_MS, MAX_LIVE_SNAPSHOTS, now);
    this.trimSnapshotMap(this.recoveredSnapshots, RECOVERY_RETENTION_MS, MAX_RECOVERED_SNAPSHOTS, now);
    for (const trainId of [...this.lastCheckpointAt.keys()]) {
      if (!this.liveSnapshots.has(trainId) && !this.recoveredSnapshots.has(trainId)) this.lastCheckpointAt.delete(trainId);
    }
    if (force || now - this.lastIndexRebuildAt >= INDEX_REBUILD_MS) this.rebuildMemoryIndexes(now);
  }

  async cleanupRecoveryStorage(now = Date.now()) {
    if (now - this.lastStorageCleanupAt < 6 * 60 * 60 * 1000) return;
    this.lastStorageCleanupAt = now;
    try {
      for (let page = 0; page < 8; page += 1) {
        const rows = await this.ctx.storage.list({ prefix: RECOVERY_PREFIX, limit: 100, noCache: true });
        if (!rows.size) break;
        const expired = [];
        let sawFresh = false;
        for (const key of rows.keys()) {
          if (recoveryKeyExpired(key, now, RECOVERY_RETENTION_MS)) expired.push(key);
          else { sawFresh = true; break; }
        }
        if (expired.length) await this.ctx.storage.delete(expired);
        if (sawFresh || expired.length < 100) break;
      }
    } catch (error) {
      this.storageStats.lastWriteError = `Recovery cleanup: ${safeMessage(error)}`;
    }
  }

  checkpointSnapshots() {
    const merged = new Map(this.recoveredSnapshots);
    for (const [trainId, snapshot] of this.liveSnapshots) merged.set(trainId, snapshot);
    return [...merged.values()]
      .sort((a, b) => Number(b && b.updatedAt || 0) - Number(a && a.updatedAt || 0))
      .slice(0, Math.min(IDLE_CHECKPOINT_MAX_SNAPSHOTS, MAX_RECOVERED_SNAPSHOTS))
      .map(compactRecoverySnapshot)
      .filter(Boolean);
  }

  async writeIdleCheckpoint(now = Date.now()) {
    this.pruneMemory(now, true);
    const snapshots = this.checkpointSnapshots();
    const maxUpdatedAt = snapshots.reduce((max, snapshot) => Math.max(max, Number(snapshot.updatedAt) || 0), 0);
    const lastMessageAt = Number(this.status.lastMessageAt) || 0;
    if (this.idleCheckpoint.loaded
      && this.idleCheckpoint.snapshotCount === snapshots.length
      && this.idleCheckpoint.maxUpdatedAt === maxUpdatedAt
      && this.idleCheckpoint.lastMessageAt === lastMessageAt
      && this.idleCheckpoint.lastStorageCleanupAt === this.lastStorageCleanupAt) {
      return true;
    }

    let chunks;
    try { chunks = splitCheckpointSnapshots(snapshots); }
    catch (error) {
      this.storageStats.checkpointWriteFailures += 1;
      this.storageStats.lastWriteError = `Idle checkpoint encode: ${safeMessage(error)}`;
      return false;
    }
    if (chunks.length > 128) {
      this.storageStats.checkpointWriteFailures += 1;
      this.storageStats.lastWriteError = `Idle checkpoint requires too many chunks: ${chunks.length}`;
      return false;
    }

    const slot = alternateCheckpointSlot(this.idleCheckpoint.slot);
    try {
      for (let offset = 0; offset < chunks.length; offset += 100) {
        const entries = {};
        for (let i = offset; i < Math.min(chunks.length, offset + 100); i += 1) entries[checkpointChunkKey(slot, i)] = chunks[i];
        if (Object.keys(entries).length) await this.ctx.storage.put(entries);
      }
      const manifest = {
        version: 1,
        slot,
        createdAt: now,
        snapshotCount: snapshots.length,
        chunkCount: chunks.length,
        maxUpdatedAt,
        lastMessageAt,
        lastStorageCleanupAt: this.lastStorageCleanupAt
      };
      await this.ctx.storage.put(IDLE_CHECKPOINT_MANIFEST_KEY, manifest);
      const writes = chunks.length + 1;
      this.storageStats.writes += writes;
      this.storageStats.checkpointWrites += writes;
      this.storageStats.lastFlushAt = now;
      this.storageStats.lastWriteError = '';
      this.idleCheckpoint = { loaded: true, ...manifest };
      this.idleStats.lastCheckpointAt = now;
      this.idleStats.checkpointSnapshots = snapshots.length;
      this.idleStats.checkpointChunks = chunks.length;
      return true;
    } catch (error) {
      this.storageStats.checkpointWriteFailures += 1;
      this.storageStats.lastWriteError = `Idle checkpoint write: ${safeMessage(error)}`;
      return false;
    }
  }

  async setNextAlarm(when) {
    const stamp = Math.max(Date.now() + 1000, Math.floor(Number(when) || 0));
    this.nextAlarmAt = stamp;
    await this.ctx.storage.setAlarm(stamp);
    return stamp;
  }

  async scheduleActiveAlarm(now = Date.now()) {
    const when = nextActiveAlarmAt({
      now,
      lastDemandAt: this.lastDemandAt,
      connectionStartedAt: this.connectionStartedAt,
      socketRenewMs: SOCKET_RENEW_MS
    });
    return this.setNextAlarm(when);
  }

  async ensureDemandConnection(becameActive = false) {
    try {
      await this.ensureConnected();
      if (becameActive) await this.scheduleActiveAlarm();
    } catch (error) {
      await this.connectionFailed(error);
    }
  }

  async enterIdle(now = Date.now()) {
    this.idleTransition = true;
    this.idleStats.mode = 'idle-transition';
    try {
      await this.closeSocket(true);
      if (this.hasDemand()) {
        await this.ensureConnected();
        await this.scheduleActiveAlarm();
        this.idleStats.mode = 'active';
        return false;
      }
      await this.maybeFlushRecovery(true);
      const checkpointed = await this.writeIdleCheckpoint(Date.now());
      if (!checkpointed) {
        try { await this.ensureConnected(); } catch (error) { await this.connectionFailed(error); return false; }
        await this.setNextAlarm(Date.now() + Math.min(DEMAND_TTL_MS, 60_000));
        this.idleStats.mode = 'checkpoint-retry';
        return false;
      }
      if (this.hasDemand()) {
        await this.ensureConnected();
        await this.scheduleActiveAlarm();
        this.idleStats.mode = 'active';
        return false;
      }
      this.idleStats.mode = 'idle';
      if (!this.idleStats.idleSince) this.idleStats.idleSince = Date.now();
      await this.setNextAlarm(Date.now() + IDLE_SYNC_INTERVAL_MS);
      return true;
    } finally {
      this.idleTransition = false;
    }
  }

  async runIdleCatchup() {
    this.idleStats.mode = 'catchup';
    this.idleStats.lastCatchupAt = Date.now();
    try {
      await this.ensureConnected();
    } catch (error) {
      await this.connectionFailed(error);
      return false;
    }
    await sleep(IDLE_CATCHUP_MS);
    if (this.hasDemand()) {
      this.idleStats.mode = 'active';
      await this.scheduleActiveAlarm();
      return true;
    }
    return this.enterIdle(Date.now());
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/movement/start') {
      if (request.method !== 'POST' && request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      this.recordDemand();
      try {
        await this.ensureConnected();
        await this.scheduleActiveAlarm();
        return json({ ok: true, ...this.healthPayload() }, 200, { 'Cache-Control': 'no-store', 'X-Kerbside-Movement-Source': 'network-rail-trust' });
      } catch (error) {
        await this.connectionFailed(error);
        return json({ ok: false, ...this.healthPayload(), error: safeMessage(error) }, 503, { 'Cache-Control': 'no-store' });
      }
    }
    if (url.pathname === '/movement/health') {
      // Health is deliberately passive: monitoring must not pin the TRUST TCP
      // socket open and defeat idle hibernation.
      return json(this.healthPayload(), 200, { 'Cache-Control': 'no-store', 'X-Kerbside-Movement-Source': 'network-rail-trust' });
    }
    if (url.pathname === '/movement/lookup') {
      const becameActive = this.recordDemand();
      if (becameActive || this.status.state === 'idle' || this.status.state === 'disconnected') {
        this.ctx.waitUntil(this.ensureDemandConnection(becameActive));
      }
      return this.lookup(url);
    }
    if (url.pathname.startsWith('/movement/train/')) {
      const becameActive = this.recordDemand();
      if (becameActive || this.status.state === 'idle' || this.status.state === 'disconnected') {
        this.ctx.waitUntil(this.ensureDemandConnection(becameActive));
      }
      const trainId = decodeURIComponent(url.pathname.slice('/movement/train/'.length));
      const snapshot = this.snapshotByTrainId(trainId);
      if (snapshot) this.markHot(trainId);
      return snapshot
        ? json({ ok: true, movement: publicSnapshot(snapshot) }, 200, { 'Cache-Control': 'no-store' })
        : json({ ok: false, movement: null }, 404, { 'Cache-Control': 'no-store' });
    }
    return json({ error: 'Not found' }, 404);
  }

  healthPayload() {
    const now = Date.now();
    const demandAge = this.lastDemandAt ? Math.max(0, Math.round((now - this.lastDemandAt) / 1000)) : null;
    return {
      ok: true,
      service: 'kerbside-train-movement',
      version: VERSION,
      source: 'Network Rail TRUST Train Movements',
      topic: STOMP_TOPIC,
      state: this.status.state,
      connected: this.status.state === 'connected',
      connectedAt: this.status.connectedAt || null,
      connectionAgeSeconds: this.status.connectedAt ? Math.round((now - this.status.connectedAt) / 1000) : null,
      lastFrameAt: this.status.lastFrameAt || null,
      lastMessageAt: this.status.lastMessageAt || null,
      lastMessageAgeSeconds: this.status.lastMessageAt ? Math.round((now - this.status.lastMessageAt) / 1000) : null,
      lastError: this.status.lastError || '',
      batches: this.status.batches || 0,
      messages: this.status.messages || 0,
      reconnects: this.status.reconnects || 0,
      protocol: this.status.protocol || '',
      server: this.status.server || '',
      hibernation: {
        enabled: true,
        mode: this.hasDemand(now) ? 'active' : this.idleStats.mode,
        demandAgeSeconds: demandAge,
        demandTtlSeconds: DEMAND_TTL_MS / 1000,
        idleSyncSeconds: IDLE_SYNC_INTERVAL_MS / 1000,
        catchupSeconds: IDLE_CATCHUP_MS / 1000,
        idleSince: this.idleStats.idleSince || null,
        lastCatchupAt: this.idleStats.lastCatchupAt || null,
        nextAlarmAt: this.nextAlarmAt || null,
        checkpointAt: this.idleStats.lastCheckpointAt || null,
        checkpointSnapshots: this.idleStats.checkpointSnapshots || 0,
        checkpointChunks: this.idleStats.checkpointChunks || 0,
        restoredSnapshots: this.idleStats.restoredSnapshots || 0
      },
      storage: {
        ...this.storageStats,
        liveSnapshots: this.liveSnapshots.size,
        recoveredSnapshots: this.recoveredSnapshots.size,
        hotTrains: [...this.hotTrainUntil.values()].filter(until => until > now).length,
        recoveryBuffered: this.recoveryBuffer.size,
        recoveryFlushSeconds: RECOVERY_FLUSH_MS / 1000
      },
      corpus: CORPUS_META,
      credentialsConfigured: Boolean(this.env.NETWORK_RAIL_USERNAME && this.env.NETWORK_RAIL_PASSWORD)
    };
  }

  snapshotByTrainId(trainId) {
    const id = text(trainId);
    if (!id) return null;
    const memory = this.liveSnapshots.get(id) || this.recoveredSnapshots.get(id);
    if (memory) return memory;
    const rows = [...this.sql.exec('SELECT payload FROM snapshots WHERE train_id = ?', id)];
    if (!rows[0] || !rows[0].payload) return null;
    try {
      const snapshot = JSON.parse(rows[0].payload);
      this.rememberRecovered(snapshot, 'legacy');
      return snapshot;
    } catch { return null; }
  }

  lookup(url) {
    const date = text(url.searchParams.get('date')) || londonDate();
    const refs = url.searchParams.getAll('ref').map(normaliseLookupRef).filter(Boolean).slice(0, MAX_LOOKUP_REFS);
    const results = {};
    for (const ref of refs) {
      let trainId = '';
      const key = ref.kind === 'train' ? '' : lookupIndexKey(ref, date);
      if (ref.kind === 'train') trainId = ref.value;
      else if (ref.kind === 'uid') {
        trainId = this.uniqueMemory(this.memoryServiceIndex, key);
        if (!trainId) {
          const rows = key ? [...this.sql.exec('SELECT train_id FROM service_index WHERE key = ?', key)] : [];
          trainId = rows[0] && rows[0].train_id || '';
        }
      } else if (ref.kind === 'head') {
        trainId = this.uniqueMemory(this.memoryHeadIndex, key);
        if (!trainId) {
          const rows = key ? [...this.sql.exec('SELECT train_id FROM service_index WHERE key = ?', key)] : [];
          trainId = rows[0] && rows[0].train_id || '';
        }
        if (!trainId && key) {
          const rows = [...this.sql.exec('SELECT train_id FROM head_fallback_index WHERE key = ? ORDER BY updated_at DESC LIMIT 2', key)];
          if (rows.length === 1) trainId = rows[0].train_id || '';
        }
      } else if (ref.kind === 'origin') {
        const candidates = new Set();
        for (const candidateKey of originLookupKeys(ref, date)) {
          for (const id of this.memoryOriginIndex.get(candidateKey) || []) candidates.add(id);
          if (candidates.size > 1) break;
          if (!candidates.size) {
            for (const row of this.sql.exec('SELECT train_id FROM origin_fallback_index WHERE key = ? ORDER BY updated_at DESC LIMIT 2', candidateKey)) {
              if (row && row.train_id) candidates.add(row.train_id);
              if (candidates.size > 1) break;
            }
          }
          if (candidates.size > 1) break;
        }
        if (candidates.size === 1) trainId = [...candidates][0];
      }
      if (trainId) this.markHot(trainId);
      results[ref.raw] = trainId ? this.responseSnapshot(trainId) : null;
    }
    return json({
      ok: true,
      date,
      generatedAt: Date.now(),
      connected: this.status.state === 'connected',
      lastMessageAt: this.status.lastMessageAt || null,
      storageMode: 'memory-first',
      results
    }, 200, { 'Cache-Control': 'no-store', 'X-Kerbside-Movement-Source': 'network-rail-trust' });
  }

  async ensureConnected() {
    if (this.status.state === 'connected' && this.socket && Date.now() - this.connectionStartedAt < SOCKET_RENEW_MS) return true;
    if (this.connectPromise) return this.connectPromise;
    if (!this.env.NETWORK_RAIL_USERNAME || !this.env.NETWORK_RAIL_PASSWORD) throw new Error('Network Rail credentials are not configured');
    this.connectPromise = this.connectOnce().finally(() => { this.connectPromise = null; });
    return this.connectPromise;
  }

  async connectOnce() {
    await this.closeSocket(true);
    this.intentionalClose = false;
    this.status.state = 'connecting';
    this.status.lastError = '';
    this.saveStatus();
    this.parser = new StompFrameParser();
    this.connectionStartedAt = Date.now();
    const socket = connect({ hostname: STOMP_HOST, port: STOMP_PORT });
    this.socket = socket;
    this.writer = socket.writable.getWriter();
    let resolveConnected, rejectConnected;
    const connected = new Promise((resolve, reject) => { resolveConnected = resolve; rejectConnected = reject; });
    this.connectedResolve = resolveConnected;
    this.connectedReject = rejectConnected;
    const loopPromise = this.readLoop(socket)
      .catch(error => { if (socket === this.socket) return this.connectionFailed(error); });
    this.readLoopPromise = loopPromise;
    loopPromise.finally(() => { if (this.readLoopPromise === loopPromise) this.readLoopPromise = null; });
    await this.write(stompFrame('CONNECT', {
      'accept-version': '1.2,1.1',
      host: '/',
      login: this.env.NETWORK_RAIL_USERNAME,
      passcode: this.env.NETWORK_RAIL_PASSWORD,
      'client-id': this.env.NETWORK_RAIL_USERNAME,
      'heart-beat': `${HEARTBEAT_MS},${HEARTBEAT_MS}`
    }));
    const timeout = sleep(CONNECT_TIMEOUT_MS).then(() => { throw new Error('Network Rail STOMP connection timed out'); });
    try {
      await Promise.race([connected, timeout]);
    } catch (error) {
      if (socket === this.socket) {
        this.status.state = error && error.authenticationFailure ? 'auth-error' : 'disconnected';
        this.status.lastError = safeMessage(error);
        this.saveStatus();
        await this.closeSocket(false);
      }
      throw error;
    }
    return true;
  }

  async readLoop(socket) {
    const reader = socket.readable.getReader();
    this.reader = reader;
    try {
      while (socket === this.socket) {
        const { value, done } = await reader.read();
        if (done) throw new Error('Network Rail STOMP socket closed');
        if (!value || !value.byteLength) continue;
        this.status.lastFrameAt = Date.now();
        for (const frame of this.parser.push(value)) await this.handleFrame(frame);
      }
    } finally {
      try { reader.releaseLock(); } catch {}
      if (this.reader === reader) this.reader = null;
    }
  }

  async handleFrame(frame) {
    if (!frame || !frame.command) return;
    if (frame.command === 'CONNECTED') {
      this.status.state = 'connected';
      this.status.connectedAt = Date.now();
      this.status.protocol = text(frame.headers.version);
      this.status.server = text(frame.headers.server);
      this.status.lastError = '';
      this.reconnectAttempt = 0;
      this.saveStatus();
      await this.write(stompFrame('SUBSCRIBE', {
        id: SUBSCRIPTION_ID,
        destination: STOMP_TOPIC,
        ack: 'client-individual',
        'activemq.subscriptionName': SUBSCRIPTION_NAME
      }));
      this.startHeartbeat();
      if (this.connectedResolve) this.connectedResolve(true);
      this.connectedResolve = this.connectedReject = null;
      return;
    }
    if (frame.command === 'MESSAGE') {
      await this.persistMovementBatch(frame.body);
      const ack = stompAckFrame(frame.headers);
      if (ack) await this.write(ack);
      return;
    }
    if (frame.command === 'ERROR') {
      const detail = text(frame.headers.message || frame.body || 'Network Rail STOMP error');
      const error = new Error(detail);
      error.authenticationFailure = /auth|login|password|security|not authorized|unauthorized/i.test(detail);
      if (this.connectedReject) this.connectedReject(error);
      this.connectedResolve = this.connectedReject = null;
      throw error;
    }
  }

  existingSnapshotsFor(messages) {
    const map = new Map();
    const ids = [...new Set(messages.map(trainIdOf).filter(Boolean))];
    for (const trainId of ids) {
      const snapshot = this.snapshotByTrainId(trainId);
      if (snapshot) map.set(trainId, snapshot);
    }
    return map;
  }

  async persistMovementBatch(body) {
    let messages;
    try { messages = parseMovementBatch(body); }
    catch (error) { throw new Error(`Invalid Network Rail movement JSON: ${safeMessage(error)}`); }
    const now = Date.now();
    this.status.batches += 1;
    this.status.lastMessageAt = now;
    if (!messages.length) return;
    const existing = this.existingSnapshotsFor(messages);
    const applied = applyFeedMessages(messages, existing, CORPUS, now);
    const typesByTrain = new Map();
    for (const message of messages) {
      const trainId = trainIdOf(message), type = messageType(message);
      if (!trainId) continue;
      if (!typesByTrain.has(trainId)) typesByTrain.set(trainId, new Set());
      typesByTrain.get(trainId).add(type);
    }
    for (const [trainId, snapshot] of applied.snapshots) {
      const live = compactLiveSnapshot(snapshot, { historyLimit: this.isHot(trainId, now) ? 4 : 0 });
      if (live) { this.liveSnapshots.set(trainId, live); this.registerSnapshot(live); }
      const plan = shouldQueueRecovery({
        types: [...(typesByTrain.get(trainId) || [])],
        snapshot,
        hot: this.isHot(trainId, now),
        lastCheckpointAt: this.lastCheckpointAt.get(trainId) || 0,
        now
      });
      if (plan.queue) this.queueRecovery(snapshot, plan.reason);
    }
    this.status.messages += messages.length;
    this.pruneMemory(now);
    await this.maybeFlushRecovery(false);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.status.state !== 'connected') return;
      this.write('\n').catch(error => this.connectionFailed(error));
    }, HEARTBEAT_MS);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  async write(value) {
    if (!this.writer) throw new Error('Network Rail STOMP writer is unavailable');
    await this.writer.write(new TextEncoder().encode(value));
  }

  async closeSocket(intentional = false) {
    this.intentionalClose = intentional;
    this.stopHeartbeat();
    const socket = this.socket;
    const writer = this.writer;
    const reader = this.reader;
    const loop = this.readLoopPromise;
    this.socket = null;
    this.writer = null;
    this.reader = null;
    if (reader) { try { await reader.cancel(); } catch {} }
    if (writer) {
      try { await writer.close(); } catch {}
      try { writer.releaseLock(); } catch {}
    }
    if (socket) { try { socket.close(); } catch {} }
    if (loop) {
      try { await loop; } catch {}
    }
    if (intentional && this.status.state !== 'idle') {
      this.status.state = 'idle';
      this.saveStatus();
    }
  }

  async connectionFailed(error) {
    if (this.intentionalClose) return;
    const auth = Boolean(error && error.authenticationFailure);
    this.status.state = auth ? 'auth-error' : 'disconnected';
    this.status.lastError = safeMessage(error);
    this.saveStatus();
    this.stopHeartbeat();
    if (this.connectedReject) this.connectedReject(error);
    this.connectedResolve = this.connectedReject = null;
    try { if (this.reader) await this.reader.cancel(); } catch {}
    try { if (this.socket) this.socket.close(); } catch {}
    this.socket = null;
    this.writer = null;
    this.reader = null;
    if (auth) return;
    const maxDelay = this.hasDemand() ? 5 * 60 * 1000 : IDLE_SYNC_INTERVAL_MS;
    const delay = Math.min(maxDelay, 1000 * (2 ** Math.min(8, this.reconnectAttempt++)));
    this.status.reconnects += 1;
    this.saveStatus();
    await this.setNextAlarm(Date.now() + delay);
  }

  cleanup() { this.pruneMemory(Date.now()); }

  async alarm() {
    const now = Date.now();
    this.nextAlarmAt = 0;
    await this.maybeFlushRecovery(true);
    this.cleanup();
    await this.cleanupRecoveryStorage(now);
    if (this.status.state === 'auth-error') return;

    if (this.hasDemand(now)) {
      const aged = this.connectionStartedAt && now - this.connectionStartedAt >= SOCKET_RENEW_MS;
      if (aged) await this.closeSocket(true);
      try { await this.ensureConnected(); }
      catch (error) { await this.connectionFailed(error); return; }
      this.idleStats.mode = 'active';
      await this.scheduleActiveAlarm();
      return;
    }

    if (this.status.state === 'connected' && this.socket) {
      await this.enterIdle(now);
      return;
    }

    await this.runIdleCatchup();
  }
}
