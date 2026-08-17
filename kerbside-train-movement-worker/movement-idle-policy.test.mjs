import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  DEMAND_TTL_MS,
  IDLE_CATCHUP_MS,
  IDLE_CHECKPOINT_MAX_VALUE_BYTES,
  IDLE_SYNC_INTERVAL_MS,
  alternateCheckpointSlot,
  checkpointChunkKey,
  hasRecentDemand,
  nextActiveAlarmAt,
  splitCheckpointSnapshots
} from './movement-idle-policy.js';

test('idle sync stays safely inside Network Rail five-minute durable TTL', () => {
  assert.ok(IDLE_SYNC_INTERVAL_MS <= 3 * 60 * 1000);
  assert.ok(IDLE_SYNC_INTERVAL_MS + IDLE_CATCHUP_MS < 5 * 60 * 1000);
});

test('demand window keeps active viewers connected without indefinite pinning', () => {
  const now = 1_000_000;
  assert.equal(hasRecentDemand(now - DEMAND_TTL_MS + 1, now), true);
  assert.equal(hasRecentDemand(now - DEMAND_TTL_MS, now), false);
  assert.equal(hasRecentDemand(0, now), false);
});

test('active alarm chooses demand expiry before socket renewal when sooner', () => {
  const now = 1_000_000;
  assert.equal(nextActiveAlarmAt({
    now,
    lastDemandAt: now - 10_000,
    connectionStartedAt: now - 60_000,
    demandTtlMs: 90_000,
    socketRenewMs: 11 * 60_000
  }), now + 80_000);
  assert.equal(nextActiveAlarmAt({
    now,
    lastDemandAt: now,
    connectionStartedAt: now - 10 * 60_000,
    demandTtlMs: 90_000,
    socketRenewMs: 11 * 60_000
  }), now + 60_000);
});

test('checkpoint slots alternate so manifest switch is crash-safe', () => {
  assert.equal(alternateCheckpointSlot(''), 'a');
  assert.equal(alternateCheckpointSlot('a'), 'b');
  assert.equal(alternateCheckpointSlot('b'), 'a');
  assert.equal(checkpointChunkKey('b', 7), 'movement-idle-checkpoint:b:007');
});

test('checkpoint splitter respects byte limit and round-trips unicode snapshots', () => {
  const snapshots = Array.from({ length: 1000 }, (_, i) => ({
    trainId: `T${String(i).padStart(5, '0')}`,
    uid: `U${i}`,
    status: 'running',
    updatedAt: 1_000_000 + i,
    lastEvent: { eventType: 'DEPARTURE', location: { name: `Birmingham New Street ${i} - cafe` } }
  }));
  const chunks = splitCheckpointSnapshots(snapshots, 16_000);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) assert.ok(new TextEncoder().encode(chunk).byteLength <= 16_000);
  assert.deepEqual(chunks.flatMap(chunk => JSON.parse(chunk)), snapshots);
  assert.ok(IDLE_CHECKPOINT_MAX_VALUE_BYTES < 2_000_000);
});

test('worker keeps health passive and closes TRUST before checkpointing idle state', () => {
  const source = fs.readFileSync(new URL('./worker.js', import.meta.url), 'utf8');
  const healthStart = source.indexOf("if (url.pathname === '/movement/health')");
  const healthEnd = source.indexOf("if (url.pathname === '/movement/lookup')", healthStart);
  assert.ok(healthStart >= 0 && healthEnd > healthStart);
  assert.doesNotMatch(source.slice(healthStart, healthEnd), /ensureConnected/);
  const idleStart = source.indexOf('async enterIdle(');
  const idleEnd = source.indexOf('async runIdleCatchup(', idleStart);
  assert.ok(idleStart >= 0 && idleEnd > idleStart);
  assert.match(source.slice(idleStart, idleEnd), /await this\.closeSocket\(true\);[\s\S]*await this\.writeIdleCheckpoint/);
  assert.match(source, /const VERSION = '0\.9\.35';/);
});
