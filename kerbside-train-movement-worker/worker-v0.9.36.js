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

const VERSION = '0.9.36';

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
    return {
      ...payload,
      version: VERSION,
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
