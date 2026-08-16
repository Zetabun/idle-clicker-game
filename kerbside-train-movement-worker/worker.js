import { DurableObject } from 'cloudflare:workers';
import { connect } from 'cloudflare:sockets';
import { CORPUS, CORPUS_META } from './corpus.generated.js';
import {
  StompFrameParser,
  applyFeedMessages,
  lookupIndexKey,
  normaliseLookupRef,
  parseMovementBatch,
  publicSnapshot,
  stompAckFrame,
  stompFrame,
  trainIdOf
} from './movement-core.js';

const VERSION = '0.9.31';
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
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
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
      return withCors(withRate(json({ error: 'Too many movement requests', retryable: true }, 429, { 'Retry-After': String(rate.retryAfter), 'Cache-Control': 'no-store' }), rate), request, env);
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
    this.parser = new StompFrameParser();
    this.connectPromise = null;
    this.connectedResolve = null;
    this.connectedReject = null;
    this.heartbeatTimer = null;
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.connectionStartedAt = 0;
    this.status = {
      state: 'idle', connectedAt: 0, lastFrameAt: 0, lastMessageAt: 0,
      lastError: '', batches: 0, messages: 0, reconnects: 0, protocol: '', server: ''
    };
    this.sql = ctx.storage.sql;
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
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
    this.restoreStatus();
  }

  restoreStatus() {
    try {
      const rows = [...this.sql.exec('SELECT value FROM meta WHERE key = ?', 'status')];
      if (rows[0] && rows[0].value) this.status = { ...this.status, ...JSON.parse(rows[0].value), state: 'idle' };
    } catch {}
  }

  saveStatus() {
    this.sql.exec('INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)', 'status', JSON.stringify(this.status));
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/movement/start') {
      if (request.method !== 'POST' && request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      try {
        await this.ensureConnected();
        return json({ ok: true, ...this.healthPayload() }, 200, { 'Cache-Control': 'no-store', 'X-Kerbside-Movement-Source': 'network-rail-trust' });
      } catch (error) {
        return json({ ok: false, ...this.healthPayload(), error: safeMessage(error) }, 503, { 'Cache-Control': 'no-store' });
      }
    }
    if (url.pathname === '/movement/health') {
      if (this.status.state === 'idle' || this.status.state === 'disconnected') this.ctx.waitUntil(this.ensureConnected().catch(() => {}));
      return json(this.healthPayload(), 200, { 'Cache-Control': 'no-store', 'X-Kerbside-Movement-Source': 'network-rail-trust' });
    }
    if (url.pathname === '/movement/lookup') {
      if (this.status.state === 'idle' || this.status.state === 'disconnected') this.ctx.waitUntil(this.ensureConnected().catch(() => {}));
      return this.lookup(url);
    }
    if (url.pathname.startsWith('/movement/train/')) {
      const trainId = decodeURIComponent(url.pathname.slice('/movement/train/'.length));
      const snapshot = this.snapshotByTrainId(trainId);
      return snapshot ? json({ ok: true, movement: publicSnapshot(snapshot) }, 200, { 'Cache-Control': 'no-store' }) : json({ ok: false, movement: null }, 404, { 'Cache-Control': 'no-store' });
    }
    return json({ error: 'Not found' }, 404);
  }

  healthPayload() {
    const now = Date.now();
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
      corpus: CORPUS_META,
      credentialsConfigured: Boolean(this.env.NETWORK_RAIL_USERNAME && this.env.NETWORK_RAIL_PASSWORD)
    };
  }

  snapshotByTrainId(trainId) {
    const id = text(trainId);
    if (!id) return null;
    const rows = [...this.sql.exec('SELECT payload FROM snapshots WHERE train_id = ?', id)];
    if (!rows[0] || !rows[0].payload) return null;
    try { return JSON.parse(rows[0].payload); } catch { return null; }
  }

  lookup(url) {
    const date = text(url.searchParams.get('date')) || londonDate();
    const refs = url.searchParams.getAll('ref').map(normaliseLookupRef).filter(Boolean).slice(0, MAX_LOOKUP_REFS);
    const results = {};
    for (const ref of refs) {
      let trainId = '';
      if (ref.kind === 'train') trainId = ref.value;
      else {
        const key = lookupIndexKey(ref, date);
        const rows = key ? [...this.sql.exec('SELECT train_id FROM service_index WHERE key = ?', key)] : [];
        trainId = rows[0] && rows[0].train_id || '';
        if (!trainId && ref.kind === 'head' && key) {
          const fallbackRows = [...this.sql.exec('SELECT train_id FROM head_fallback_index WHERE key = ? ORDER BY updated_at DESC LIMIT 2', key)];
          if (fallbackRows.length === 1) trainId = fallbackRows[0].train_id || '';
        }
      }
      const snapshot = trainId ? this.snapshotByTrainId(trainId) : null;
      results[ref.raw] = snapshot ? publicSnapshot(snapshot) : null;
    }
    return json({
      ok: true,
      date,
      generatedAt: Date.now(),
      connected: this.status.state === 'connected',
      lastMessageAt: this.status.lastMessageAt || null,
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
    this.readLoop(socket).catch(error => { if (socket === this.socket) this.connectionFailed(error); });
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
    await this.ctx.storage.setAlarm(Date.now() + SOCKET_RENEW_MS);
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
    this.status.batches += 1;
    this.status.lastMessageAt = Date.now();
    if (!messages.length) { this.saveStatus(); return; }
    const now = Date.now();
    const existing = this.existingSnapshotsFor(messages);
    const applied = applyFeedMessages(messages, existing, CORPUS, now);
    for (const [trainId, snapshot] of applied.snapshots) {
      this.sql.exec(
        'INSERT OR REPLACE INTO snapshots(train_id,payload,updated_at) VALUES(?,?,?)',
        trainId, JSON.stringify(snapshot), now
      );
    }
    for (const index of applied.indexes) {
      const key = lookupIndexKey({ kind: index.kind, value: index.value }, index.date);
      if (!key) continue;
      this.sql.exec('INSERT OR REPLACE INTO service_index(key,train_id,updated_at) VALUES(?,?,?)', key, index.trainId, now);
    }
    for (const index of applied.fallbackIndexes || []) {
      const key = lookupIndexKey({ kind: index.kind, value: index.value }, index.date);
      if (!key) continue;
      this.sql.exec('INSERT OR REPLACE INTO head_fallback_index(key,train_id,updated_at) VALUES(?,?,?)', key, index.trainId, now);
    }
    this.status.messages += messages.length;
    this.saveStatus();
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
    this.socket = null; this.writer = null;
    if (writer) {
      try { await writer.close(); } catch {}
      try { writer.releaseLock(); } catch {}
    }
    if (socket) { try { socket.close(); } catch {} }
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
    try { if (this.socket) this.socket.close(); } catch {}
    this.socket = null; this.writer = null;
    if (auth) return;
    const delay = Math.min(5 * 60 * 1000, 1000 * (2 ** Math.min(8, this.reconnectAttempt++)));
    this.status.reconnects += 1;
    this.saveStatus();
    await this.ctx.storage.setAlarm(Date.now() + delay);
  }

  cleanup() {
    const cutoff = Date.now() - SNAPSHOT_RETENTION_MS;
    this.sql.exec('DELETE FROM snapshots WHERE updated_at < ?', cutoff);
    this.sql.exec('DELETE FROM service_index WHERE updated_at < ?', cutoff);
    this.sql.exec('DELETE FROM head_fallback_index WHERE updated_at < ?', cutoff);
  }

  async alarm() {
    this.cleanup();
    if (this.status.state === 'auth-error') return;
    const aged = this.connectionStartedAt && Date.now() - this.connectionStartedAt >= SOCKET_RENEW_MS;
    if (aged) await this.closeSocket(true);
    try { await this.ensureConnected(); }
    catch (error) { await this.connectionFailed(error); }
    if (this.status.state === 'connected') await this.ctx.storage.setAlarm(Date.now() + SOCKET_RENEW_MS);
  }
}
