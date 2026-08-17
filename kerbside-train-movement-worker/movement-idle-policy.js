export const DEMAND_TTL_MS = 90 * 1000;
export const IDLE_SYNC_INTERVAL_MS = 4 * 60 * 1000;
export const IDLE_CATCHUP_MS = 15 * 1000;
export const NETWORK_RAIL_SESSION_COOLDOWN_MS = 25 * 60 * 1000;
export const NETWORK_RAIL_SESSION_COOLDOWN_KEY = 'network-rail-session-cooldown:v1';
export const IDLE_CHECKPOINT_MANIFEST_KEY = 'movement-idle-checkpoint:manifest';
export const IDLE_CHECKPOINT_PREFIX = 'movement-idle-checkpoint:';
export const IDLE_CHECKPOINT_MAX_VALUE_BYTES = 1_250_000;
export const IDLE_CHECKPOINT_MAX_SNAPSHOTS = 12_000;

const encoder = new TextEncoder();

export function hasRecentDemand(lastDemandAt, now = Date.now(), ttlMs = DEMAND_TTL_MS) {
  const stamp = Number(lastDemandAt) || 0;
  return stamp > 0 && Number(now) - stamp < Number(ttlMs);
}

export function isNetworkRailSessionAllocationError(value) {
  return /(?:AMQ339009|Exception getting session)/i.test(String(value == null ? '' : value));
}

export function sessionCooldownRetryAt({
  now = Date.now(),
  currentUntil = 0,
  retryAt = 0,
  cooldownMs = NETWORK_RAIL_SESSION_COOLDOWN_MS
} = {}) {
  const stamp = Number(now) || Date.now();
  const existing = Math.max(Number(currentUntil) || 0, Number(retryAt) || 0);
  if (existing > stamp) return existing;
  return stamp + Math.max(60_000, Number(cooldownMs) || NETWORK_RAIL_SESSION_COOLDOWN_MS);
}

export function nextActiveAlarmAt({
  lastDemandAt = 0,
  connectionStartedAt = 0,
  now = Date.now(),
  demandTtlMs = DEMAND_TTL_MS,
  socketRenewMs
} = {}) {
  const candidates = [];
  const demand = Number(lastDemandAt) || 0;
  const connected = Number(connectionStartedAt) || 0;
  const renew = Number(socketRenewMs) || 0;
  if (demand) candidates.push(demand + Number(demandTtlMs));
  if (connected && renew) candidates.push(connected + renew);
  const target = candidates.length ? Math.min(...candidates) : Number(now) + Number(demandTtlMs);
  return Math.max(Number(now) + 1000, target);
}

export function alternateCheckpointSlot(slot) {
  return slot === 'a' ? 'b' : 'a';
}

export function checkpointChunkKey(slot, index) {
  const safeSlot = slot === 'b' ? 'b' : 'a';
  const safeIndex = Math.max(0, Math.floor(Number(index) || 0));
  return `${IDLE_CHECKPOINT_PREFIX}${safeSlot}:${String(safeIndex).padStart(3, '0')}`;
}

export function splitCheckpointSnapshots(snapshots, maxBytes = IDLE_CHECKPOINT_MAX_VALUE_BYTES) {
  const source = Array.isArray(snapshots) ? snapshots.filter(Boolean) : [];
  const limit = Math.max(1024, Math.floor(Number(maxBytes) || IDLE_CHECKPOINT_MAX_VALUE_BYTES));
  if (!source.length) return [];

  const chunks = [];
  let rows = [];
  let bytes = 2;

  const flush = () => {
    if (!rows.length) return;
    chunks.push(`[${rows.join(',')}]`);
    rows = [];
    bytes = 2;
  };

  for (const snapshot of source) {
    const row = JSON.stringify(snapshot);
    const rowBytes = encoder.encode(row).byteLength;
    if (rowBytes + 2 > limit) throw new RangeError('Idle checkpoint snapshot exceeds maximum value size');
    const nextBytes = bytes + rowBytes + (rows.length ? 1 : 0);
    if (rows.length && nextBytes > limit) flush();
    rows.push(row);
    bytes += rowBytes + (rows.length > 1 ? 1 : 0);
  }
  flush();
  return chunks;
}
