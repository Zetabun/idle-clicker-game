from pathlib import Path
import os
import subprocess


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, content):
    Path(path).write_text(content, encoding='utf-8')


def replace_exact(path, old, new, count=1):
    content = read(path)
    actual = content.count(old)
    if actual != count:
        raise SystemExit(f'{path}: expected {count} occurrence(s), found {actual}: {old!r}')
    write(path, content.replace(old, new, count))


def run(*args):
    subprocess.run(args, check=True)


# Point 1: reduce billable idle socket time while keeping the durable replay gap
# comfortably below five minutes.
replace_exact(
    'kerbside-train-movement-worker/movement-idle-policy.js',
    'export const IDLE_SYNC_INTERVAL_MS = 3 * 60 * 1000;\nexport const IDLE_CATCHUP_MS = 30 * 1000;',
    'export const IDLE_SYNC_INTERVAL_MS = 4 * 60 * 1000;\nexport const IDLE_CATCHUP_MS = 15 * 1000;'
)

worker = 'kerbside-train-movement-worker/worker.js'

# Point 2: recovery/checkpoint pruning no longer rebuilds the three memory indexes
# repeatedly when the object is about to hibernate. A dirty flag guarantees any
# interleaved lookup rebuilds lazily before using the indexes.
replace_exact(
    worker,
    '    this.lastIndexRebuildAt = 0;\n    this.lastStorageCleanupAt = 0;',
    '    this.lastIndexRebuildAt = 0;\n    this.memoryIndexesDirty = false;\n    this.lastStorageCleanupAt = 0;'
)

replace_exact(
    worker,
    '        this.pruneMemory(now, true);\n        if (reachedCheckpoint || rows.size < RECOVERY_LOAD_PAGE_SIZE || !oldest) break;',
    '        this.pruneMemory(now, true, { rebuildIndexes: false });\n        if (reachedCheckpoint || rows.size < RECOVERY_LOAD_PAGE_SIZE || !oldest) break;'
)

replace_exact(
    worker,
    "  rebuildMemoryIndexes(now = Date.now()) {\n    this.memoryServiceIndex = new Map();\n    this.memoryHeadIndex = new Map();\n    this.memoryOriginIndex = new Map();\n    for (const [trainId, snapshot] of this.recoveredSnapshots) if (!this.liveSnapshots.has(trainId)) this.registerSnapshot(snapshot);\n    for (const snapshot of this.liveSnapshots.values()) this.registerSnapshot(snapshot);\n    this.lastIndexRebuildAt = now;\n  }\n\n  pruneMemory(now = Date.now(), force = false) {\n    if (!force && now - this.lastMemoryPruneAt < 60000) return;\n    this.lastMemoryPruneAt = now;\n    for (const [trainId, until] of this.hotTrainUntil) if (until <= now) this.hotTrainUntil.delete(trainId);\n    this.trimSnapshotMap(this.liveSnapshots, LIVE_RETENTION_MS, MAX_LIVE_SNAPSHOTS, now);\n    this.trimSnapshotMap(this.recoveredSnapshots, RECOVERY_RETENTION_MS, MAX_RECOVERED_SNAPSHOTS, now);\n    for (const trainId of [...this.lastCheckpointAt.keys()]) {\n      if (!this.liveSnapshots.has(trainId) && !this.recoveredSnapshots.has(trainId)) this.lastCheckpointAt.delete(trainId);\n    }\n    if (force || now - this.lastIndexRebuildAt >= INDEX_REBUILD_MS) this.rebuildMemoryIndexes(now);\n  }",
    "  rebuildMemoryIndexes(now = Date.now()) {\n    this.memoryServiceIndex = new Map();\n    this.memoryHeadIndex = new Map();\n    this.memoryOriginIndex = new Map();\n    for (const [trainId, snapshot] of this.recoveredSnapshots) if (!this.liveSnapshots.has(trainId)) this.registerSnapshot(snapshot);\n    for (const snapshot of this.liveSnapshots.values()) this.registerSnapshot(snapshot);\n    this.lastIndexRebuildAt = now;\n    this.memoryIndexesDirty = false;\n  }\n\n  ensureMemoryIndexes(now = Date.now()) {\n    if (this.memoryIndexesDirty) this.rebuildMemoryIndexes(now);\n  }\n\n  pruneMemory(now = Date.now(), force = false, { rebuildIndexes = true } = {}) {\n    if (!force && now - this.lastMemoryPruneAt < 60000) return;\n    this.lastMemoryPruneAt = now;\n    for (const [trainId, until] of this.hotTrainUntil) if (until <= now) this.hotTrainUntil.delete(trainId);\n    this.trimSnapshotMap(this.liveSnapshots, LIVE_RETENTION_MS, MAX_LIVE_SNAPSHOTS, now);\n    this.trimSnapshotMap(this.recoveredSnapshots, RECOVERY_RETENTION_MS, MAX_RECOVERED_SNAPSHOTS, now);\n    for (const trainId of [...this.lastCheckpointAt.keys()]) {\n      if (!this.liveSnapshots.has(trainId) && !this.recoveredSnapshots.has(trainId)) this.lastCheckpointAt.delete(trainId);\n    }\n    if (!rebuildIndexes) {\n      if (force || now - this.lastIndexRebuildAt >= INDEX_REBUILD_MS) this.memoryIndexesDirty = true;\n      return;\n    }\n    if (this.memoryIndexesDirty || force || now - this.lastIndexRebuildAt >= INDEX_REBUILD_MS) this.rebuildMemoryIndexes(now);\n  }"
)

replace_exact(
    worker,
    '  async writeIdleCheckpoint(now = Date.now()) {\n    this.pruneMemory(now, true);',
    '  async writeIdleCheckpoint(now = Date.now()) {\n    this.pruneMemory(now, true, { rebuildIndexes: false });'
)

replace_exact(
    worker,
    "  lookup(url) {\n    const date = text(url.searchParams.get('date')) || londonDate();\n    const refs = url.searchParams.getAll('ref').map(normaliseLookupRef).filter(Boolean).slice(0, MAX_LOOKUP_REFS);",
    "  lookup(url) {\n    const date = text(url.searchParams.get('date')) || londonDate();\n    const refs = url.searchParams.getAll('ref').map(normaliseLookupRef).filter(Boolean).slice(0, MAX_LOOKUP_REFS);\n    if (refs.length) this.ensureMemoryIndexes();"
)

# Regression coverage for the duration policy and lazy index rebuild safety.
test_path = 'kerbside-train-movement-worker/movement-idle-policy.test.mjs'
replace_exact(
    test_path,
    "test('idle sync stays safely inside Network Rail five-minute durable TTL', () => {\n  assert.ok(IDLE_SYNC_INTERVAL_MS <= 3 * 60 * 1000);\n  assert.ok(IDLE_SYNC_INTERVAL_MS + IDLE_CATCHUP_MS < 5 * 60 * 1000);\n});",
    "test('idle catch-up reduces socket-held duration while staying inside Network Rail five-minute durable TTL', () => {\n  assert.equal(IDLE_SYNC_INTERVAL_MS, 4 * 60 * 1000);\n  assert.equal(IDLE_CATCHUP_MS, 15 * 1000);\n  assert.ok(IDLE_SYNC_INTERVAL_MS + IDLE_CATCHUP_MS < 5 * 60 * 1000);\n});"
)

replace_exact(
    test_path,
    "  assert.match(source.slice(idleStart, idleEnd), /await this\\.closeSocket\\(true\\);[\\s\\S]*await this\\.writeIdleCheckpoint/);\n  // Keep the behaviour regression tied to the repository release instead of a stale hard-coded version.",
    "  assert.match(source.slice(idleStart, idleEnd), /await this\\.closeSocket\\(true\\);[\\s\\S]*await this\\.writeIdleCheckpoint/);\n\n  const recoveryStart = source.indexOf('async restoreRecoveryEntries(');\n  const recoveryEnd = source.indexOf('async restoreRecoveryState(', recoveryStart);\n  assert.ok(recoveryStart >= 0 && recoveryEnd > recoveryStart);\n  assert.match(source.slice(recoveryStart, recoveryEnd), /pruneMemory\\(now, true, \\{ rebuildIndexes: false \\}\\)/);\n\n  const checkpointStart = source.indexOf('async writeIdleCheckpoint(');\n  const checkpointEnd = source.indexOf('async setNextAlarm(', checkpointStart);\n  assert.ok(checkpointStart >= 0 && checkpointEnd > checkpointStart);\n  assert.match(source.slice(checkpointStart, checkpointEnd), /pruneMemory\\(now, true, \\{ rebuildIndexes: false \\}\\)/);\n\n  const lookupStart = source.indexOf('lookup(url)');\n  const lookupEnd = source.indexOf('async ensureConnected(', lookupStart);\n  assert.ok(lookupStart >= 0 && lookupEnd > lookupStart);\n  assert.match(source.slice(lookupStart, lookupEnd), /if \\(refs\\.length\\) this\\.ensureMemoryIndexes\\(\\);/);\n  assert.match(source, /this\\.memoryIndexesDirty = false;/);\n\n  // Keep the behaviour regression tied to the repository release instead of a stale hard-coded version."
)

# Publish this as movement component 0.9.37 while leaving the browser/app release
# at 0.9.38 because no browser-served behaviour changes in this optimisation.
old_wrapper = Path('kerbside-train-movement-worker/worker-v0.9.36.js')
new_wrapper = Path('kerbside-train-movement-worker/worker-v0.9.37.js')
wrapper_content = old_wrapper.read_text(encoding='utf-8')
if wrapper_content.count("const VERSION = '0.9.36';") != 1:
    raise SystemExit('Unexpected deployed movement wrapper version marker')
new_wrapper.write_text(wrapper_content.replace("const VERSION = '0.9.36';", "const VERSION = '0.9.37';", 1), encoding='utf-8')

replace_exact(
    'kerbside-train-movement-worker/wrangler.toml',
    'main = "worker-v0.9.36.js"',
    'main = "worker-v0.9.37.js"'
)
replace_exact(
    'kerbside-train-movement-worker/package.json',
    'node --check worker-v0.9.36.js',
    'node --check worker-v0.9.37.js'
)
replace_exact(
    test_path,
    "const source = fs.readFileSync(new URL('./worker-v0.9.36.js', import.meta.url), 'utf8');",
    "const source = fs.readFileSync(new URL('./worker-v0.9.37.js', import.meta.url), 'utf8');"
)
replace_exact(
    test_path,
    "  assert.match(source, /requestedRetryAt <= now && priorUntil <= now/);\n});",
    "  assert.match(source, /requestedRetryAt <= now && priorUntil <= now/);\n  assert.match(source, /const VERSION = '0\\.9\\.37';/);\n});"
)

# Fast, dependency-free movement checks run before committing. The repository's
# normal release workflow and PR movement verification provide the wider gates.
run('npm', 'run', 'check', '--prefix', 'kerbside-train-movement-worker')
run('npm', 'test', '--prefix', 'kerbside-train-movement-worker')
run('git', 'diff', '--check')

product_paths = [
    'kerbside-train-movement-worker/movement-idle-policy.js',
    'kerbside-train-movement-worker/movement-idle-policy.test.mjs',
    'kerbside-train-movement-worker/worker.js',
    'kerbside-train-movement-worker/worker-v0.9.37.js',
    'kerbside-train-movement-worker/wrangler.toml',
    'kerbside-train-movement-worker/package.json',
]

run('git', 'config', 'user.name', 'github-actions[bot]')
run('git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
run('git', 'add', '--', *product_paths)
run('git', 'commit', '-m', 'Optimize Kerbside movement idle duration')

branch = os.environ.get('GITHUB_HEAD_REF', '').strip()
if not branch:
    branch = subprocess.check_output(['git', 'branch', '--show-current'], text=True).strip()
if not branch:
    raise SystemExit('Could not determine release branch')
run('git', 'push', 'origin', f'HEAD:{branch}')
