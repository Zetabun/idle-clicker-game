import baseWorker, { TrainMovementHub as BaseTrainMovementHub } from './worker.js';
import { CORPUS } from './corpus.generated.js';
import {
  applyFeedMessages,
  messageType,
  parseMovementBatch,
  trainIdOf
} from './movement-core.js';
import {
  compactLiveSnapshot,
  shouldQueueRecovery
} from './movement-storage-policy.js';
import {
  makeColdSnapshot,
  promoteColdSnapshot,
  shouldUseColdPath
} from './movement-cold-path.js';
import {
  NETWORK_RAIL_SESSION_COOLDOWN_KEY,
  isNetworkRailSessionAllocationError,
  sessionCooldownRetryAt
} from './movement-idle-policy.js';

function safeMessage(error) {
  return String(error && error.message || error || 'Unknown error').trim().slice(0, 500);
}

export default baseWorker;

export class TrainMovementHub extends BaseTrainMovementHub {
  constructor(ctx, env) {
    super(ctx, env);
    this.processingStats = {
      cheapColdEnabled: true,
      since: Date.now(),
      coldMovements: 0,
      richMovements: 0,
      lifecycleMessages: 0,
      coldPromotions: 0
    };
  }

  async restoreRecoveryState() {
    await super.restoreRecoveryState();
    try {
      const saved = await this.ctx.storage.get(NETWORK_RAIL_SESSION_COOLDOWN_KEY, { noCache: true });
      const until = Number(saved && saved.until) || 0;
      if (until > Date.now()) {
        this.sessionCooldownUntil = until;
        this.nextAlarmAt = until;
        this.status.state = 'disconnected';
        this.status.lastError = `Network Rail STOMP session cooldown active until ${new Date(until).toISOString()}`;
      } else {
        this.sessionCooldownUntil = 0;
      }
    } catch (error) {
      this.sessionCooldownUntil = 0;
      this.storageStats.lastWriteError = `Session cooldown read: ${safeMessage(error)}`;
    }
  }

  async ensureConnected() {
    const now = Date.now();
    const until = Number(this.sessionCooldownUntil) || 0;
    if (until > now) {
      const error = new Error(`Network Rail STOMP session cooldown active until ${new Date(until).toISOString()}`);
      error.sessionCooldown = true;
      error.retryAt = until;
      throw error;
    }
    if (until) this.sessionCooldownUntil = 0;
    return super.ensureConnected();
  }

  async handleFrame(frame) {
    if (frame && frame.command === 'ERROR') {
      const detail = String(frame.headers && frame.headers.message || frame.body || 'Network Rail STOMP error').trim();
      const error = new Error(detail);
      error.authenticationFailure = /auth|login|password|security|not authorized|unauthorized/i.test(detail);
      error.sessionCooldown = isNetworkRailSessionAllocationError(detail);
      if (this.connectedReject) this.connectedReject(error);
      this.connectedResolve = this.connectedReject = null;
      throw error;
    }
    const result = await super.handleFrame(frame);
    if (frame && frame.command === 'CONNECTED') this.sessionCooldownUntil = 0;
    return result;
  }

  async connectionFailed(error) {
    if (this.intentionalClose) return;
    const detail = safeMessage(error);
    const sessionBlocked = Boolean(error && error.sessionCooldown) || isNetworkRailSessionAllocationError(detail);
    if (!sessionBlocked) return super.connectionFailed(error);

    const now = Date.now();
    const priorUntil = Number(this.sessionCooldownUntil) || 0;
    const requestedRetryAt = Number(error && error.retryAt) || 0;
    const retryAt = sessionCooldownRetryAt({
      now,
      currentUntil: priorUntil,
      retryAt: requestedRetryAt
    });
    const newNetworkRejection = requestedRetryAt <= now && priorUntil <= now;

    this.sessionCooldownUntil = retryAt;
    this.status.state = 'disconnected';
    this.status.lastError = newNetworkRejection
      ? `${detail} - pausing new Network Rail STOMP sessions until ${new Date(retryAt).toISOString()}`
      : `Network Rail STOMP session cooldown active until ${new Date(retryAt).toISOString()}`;
    this.saveStatus();
    this.stopHeartbeat();
    if (this.connectedReject) this.connectedReject(error);
    this.connectedResolve = this.connectedReject = null;
    try { if (this.reader) await this.reader.cancel(); } catch {}
    try { if (this.socket) this.socket.close(); } catch {}
    this.socket = null;
    this.writer = null;
    this.reader = null;

    if (newNetworkRejection) {
      this.status.reconnects += 1;
      try {
        await this.ctx.storage.put(NETWORK_RAIL_SESSION_COOLDOWN_KEY, {
          until: retryAt,
          reason: detail,
          updatedAt: now
        });
        this.storageStats.writes += 1;
      } catch (storageError) {
        this.storageStats.writeFailures += 1;
        this.storageStats.lastWriteError = `Session cooldown write: ${safeMessage(storageError)}`;
      }
    }

    if (!this.nextAlarmAt || Math.abs(Number(this.nextAlarmAt) - retryAt) > 1000) {
      await this.setNextAlarm(retryAt);
    } else {
      this.nextAlarmAt = retryAt;
    }
  }

  markHot(trainId, now = Date.now()) {
    const wasHot = this.isHot(trainId, now);
    super.markHot(trainId, now);
    if (wasHot || !trainId) return false;
    const snapshot = this.liveSnapshots.get(trainId) || this.recoveredSnapshots.get(trainId);
    if (!snapshot || !promoteColdSnapshot(snapshot, CORPUS)) return false;
    this.processingStats.coldPromotions += 1;
    this.registerSnapshot(snapshot);
    return true;
  }

  healthPayload() {
    const payload = super.healthPayload();
    const now = Date.now();
    const until = Number(this.sessionCooldownUntil) || 0;
    return {
      ...payload,
      networkRailSessionCooldown: {
        active: until > now,
        until: until > now ? until : null,
        secondsRemaining: until > now ? Math.ceil((until - now) / 1000) : 0
      },
      processing: { ...this.processingStats }
    };
  }

  async persistMovementBatch(body) {
    let messages;
    try {
      messages = parseMovementBatch(body);
    } catch (error) {
      throw new Error(`Invalid Network Rail movement JSON: ${safeMessage(error)}`);
    }

    const now = Date.now();
    this.status.batches += 1;
    this.status.lastMessageAt = now;
    if (!messages.length) return;

    // Process in feed order so an activation/identity event earlier in the same
    // batch is available to a following cheap 0003 movement for that train.
    const snapshots = new Map();
    const typesByTrain = new Map();

    for (const message of messages) {
      const trainId = trainIdOf(message);
      const type = messageType(message);
      if (!trainId) continue;
      if (!typesByTrain.has(trainId)) typesByTrain.set(trainId, new Set());
      typesByTrain.get(trainId).add(type);

      const prior = snapshots.has(trainId)
        ? snapshots.get(trainId)
        : this.snapshotByTrainId(trainId);
      let snapshot = null;

      if (shouldUseColdPath(message, this.isHot(trainId, now))) {
        snapshot = makeColdSnapshot(message, prior, now);
        if (snapshot) this.processingStats.coldMovements += 1;
      } else {
        const existing = prior ? new Map([[trainId, prior]]) : new Map();
        const applied = applyFeedMessages([message], existing, CORPUS, now);
        snapshot = applied.snapshots.get(trainId) || null;
        if (type === '0003') this.processingStats.richMovements += 1;
        else this.processingStats.lifecycleMessages += 1;
      }

      if (snapshot) snapshots.set(trainId, snapshot);
    }

    for (const [trainId, snapshot] of snapshots) {
      const hot = this.isHot(trainId, now);
      const live = compactLiveSnapshot(snapshot, { historyLimit: hot ? 4 : 0 });
      if (live) {
        this.liveSnapshots.set(trainId, live);
        this.registerSnapshot(live);
      }
      const plan = shouldQueueRecovery({
        types: [...(typesByTrain.get(trainId) || [])],
        snapshot,
        hot,
        lastCheckpointAt: this.lastCheckpointAt.get(trainId) || 0,
        now
      });
      if (plan.queue) this.queueRecovery(snapshot, plan.reason);
    }

    this.status.messages += messages.length;
    this.pruneMemory(now);
    await this.maybeFlushRecovery(false);
  }
}
