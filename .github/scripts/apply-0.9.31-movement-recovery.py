#!/usr/bin/env python3
from pathlib import Path
import re

VERSION = '0.9.31'


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one literal match, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


def sub_once(path, pattern, replacement):
    text = read(path)
    updated, count = re.subn(pattern, lambda _m: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{path}: expected one regex match, found {count}: {pattern[:120]!r}')
    write(path, updated)


Path('VERSION').write_text(VERSION + '\n', encoding='utf-8')

# Make the central version synchronizer own the three release markers introduced
# by the Saved Journeys and Network Rail movement layers so they cannot drift on
# the next release.
replace_once(
    '.github/scripts/sync-version.py',
    "    ('kerbside-status.js', r\"(const VERSION=')(\\d+\\.\\d+\\.\\d+)(';)\"),\n",
    "    ('kerbside-status.js', r\"(const VERSION=')(\\d+\\.\\d+\\.\\d+)(';)\"),\n"
    "    ('kerbside-saved-journeys-polish.js', r\"(const VERSION=')(\\d+\\.\\d+\\.\\d+)(';)\"),\n"
    "    ('kerbside-train-movement.js', r\"(const VERSION=')(\\d+\\.\\d+\\.\\d+)(';)\"),\n"
    "    ('kerbside-train-movement-worker/worker.js', r\"(const VERSION = ')(\\d+\\.\\d+\\.\\d+)(';)\"),\n"
)

# Normal live rows are Darwin-shaped and often do not carry UID/headcode
# directly. Reuse Kerbside's already-vetted Darwin-to-timetable identity
# resolver before asking the movement Worker for evidence.
sub_once(
    'kerbside-train-movement.js',
    r"function refsFor\(service\)\{.*?\n\}",
    """function identityCandidates(service){
  const candidates=[];
  if(service&&typeof service==='object')candidates.push(service);
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  if(service&&overlay&&typeof overlay.evidenceFor==='function'){
    try{
      const resolved=overlay.evidenceFor(service)?.service;
      if(resolved&&typeof resolved==='object'&&!candidates.includes(resolved))candidates.push(resolved);
    }catch(error){}
  }
  return candidates;
}
function refsFor(service){
  if(!service||typeof service!=='object')return[];
  const refs=[];
  for(const candidate of identityCandidates(service)){
    const uid=upper(candidate.uid||candidate.serviceUid||candidate.trainUid);if(uid)refs.push(`uid:${uid}`);
    const head=headcode(candidate.trainId||candidate.trainid||candidate.headcode);if(head)refs.push(`head:${head}`);
  }
  return [...new Set(refs)];
}"""
)

# TRUST activations may have happened before the collector came online. The
# existing activation fallback already derives the four-character signalling
# identity from TRUST train_id, so expose that rule and use it on movement-only
# cold starts too.
sub_once(
    'kerbside-train-movement-worker/movement-core.js',
    r"function activationHeadcode\(body\) \{.*?\n\}",
    """export function trustHeadcode(value) {
  const trainId = upper(value);
  return trainId.length >= 6 ? trainId.slice(2, 6) : '';
}

function activationHeadcode(body) {
  const explicit = upper(body.signalling_id || body.schedule_train_id);
  if (explicit) return explicit.slice(0, 4);
  const wtt = upper(body.schedule_wtt_id);
  if (wtt) return wtt.slice(0, 4);
  return trustHeadcode(body.train_id);
}"""
)
replace_once(
    'kerbside-train-movement-worker/movement-core.js',
    "\nexport function applyFeedMessages(messages, existing = new Map(), corpus = {}, now = Date.now()) {",
    """
function fallbackIndexFromMovement(snapshot, movement) {
  const trainId = text(movement && movement.trainId || snapshot && snapshot.trainId);
  const headcode = upper(snapshot && snapshot.headcode || trustHeadcode(trainId));
  const date = text(snapshot && snapshot.date) || londonDateStamp(movement && (movement.actualTimestamp || movement.plannedTimestamp));
  if (!trainId || !headcode || !date) return null;
  return { kind: 'head', date, value: headcode, trainId };
}

export function applyFeedMessages(messages, existing = new Map(), corpus = {}, now = Date.now()) {"""
)
replace_once(
    'kerbside-train-movement-worker/movement-core.js',
    "  const indexes = [];\n  const counts = {};",
    "  const indexes = [];\n  const fallbackIndexes = [];\n  const counts = {};"
)
replace_once(
    'kerbside-train-movement-worker/movement-core.js',
    """      const movement = normaliseMovement(message, corpus, now);
      snapshot.lastEvent = movement;
      snapshot.status = movement.terminated ? 'terminated' : 'running';
      pushHistory(snapshot, movement);""",
    """      const movement = normaliseMovement(message, corpus, now);
      snapshot.headcode = snapshot.headcode || trustHeadcode(trainId);
      snapshot.date = snapshot.date || londonDateStamp(movement.actualTimestamp || movement.plannedTimestamp);
      snapshot.lastEvent = movement;
      snapshot.status = movement.terminated ? 'terminated' : 'running';
      pushHistory(snapshot, movement);
      const fallbackIndex = fallbackIndexFromMovement(snapshot, movement);
      if (fallbackIndex) fallbackIndexes.push(fallbackIndex);"""
)
replace_once(
    'kerbside-train-movement-worker/movement-core.js',
    'return { snapshots, indexes, counts, touched: [...touched] };',
    'return { snapshots, indexes, fallbackIndexes, counts, touched: [...touched] };'
)

# Keep movement-only headcode recovery separate from activation-backed indexes.
# A fallback is returned only when exactly one live TRUST train owns that
# headcode/date, avoiding false matches when a headcode is ambiguous.
replace_once(
    'kerbside-train-movement-worker/worker.js',
    "    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (",
    """    this.sql.exec(`CREATE TABLE IF NOT EXISTS head_fallback_index (
      key TEXT NOT NULL,
      train_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY(key, train_id)
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS head_fallback_updated ON head_fallback_index(updated_at)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta ("""
)
replace_once(
    'kerbside-train-movement-worker/worker.js',
    "        trainId = rows[0] && rows[0].train_id || '';",
    """        trainId = rows[0] && rows[0].train_id || '';
        if (!trainId && ref.kind === 'head' && key) {
          const fallbackRows = [...this.sql.exec('SELECT train_id FROM head_fallback_index WHERE key = ? ORDER BY updated_at DESC LIMIT 2', key)];
          if (fallbackRows.length === 1) trainId = fallbackRows[0].train_id || '';
        }"""
)
replace_once(
    'kerbside-train-movement-worker/worker.js',
    '    this.status.messages += messages.length;',
    """    for (const index of applied.fallbackIndexes || []) {
      const key = lookupIndexKey({ kind: index.kind, value: index.value }, index.date);
      if (!key) continue;
      this.sql.exec('INSERT OR REPLACE INTO head_fallback_index(key,train_id,updated_at) VALUES(?,?,?)', key, index.trainId, now);
    }
    this.status.messages += messages.length;"""
)
replace_once(
    'kerbside-train-movement-worker/worker.js',
    "    this.sql.exec('DELETE FROM service_index WHERE updated_at < ?', cutoff);",
    "    this.sql.exec('DELETE FROM service_index WHERE updated_at < ?', cutoff);\n    this.sql.exec('DELETE FROM head_fallback_index WHERE updated_at < ?', cutoff);"
)

# Lock both regressions in: movement arriving without an earlier activation, and
# a normal Darwin live row that needs the existing timetable identity resolver.
replace_once(
    'kerbside-train-movement-worker/movement-core.test.mjs',
    "test('operational cancellation, reinstatement and change messages remain additive', () => {",
    """test('movement-only cold start derives a safe headcode/date fallback index', () => {
  const result = applyFeedMessages([departure], new Map(), corpus, now + 5000);
  const snapshot = result.snapshots.get('775F25MP16');
  assert.equal(snapshot.uid, '');
  assert.equal(snapshot.headcode, '5F25');
  assert.equal(snapshot.date, '2026-08-16');
  assert.deepEqual(result.fallbackIndexes.map(item => [item.kind, item.date, item.value, item.trainId]), [
    ['head', '2026-08-16', '5F25', '775F25MP16']
  ]);
});

test('operational cancellation, reinstatement and change messages remain additive', () => {"""
)
replace_once(
    'kerbside-backend/tests/train-movement-browser-regression.mjs',
    "    const service={uid:'C21373',trainId:'5F25',std:'20:12',arrival:'21:33',operator:'CrossCountry',destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}]};",
    """    const service={serviceID:'20260816C21373',std:'20:12',arrival:'21:33',operator:'CrossCountry',destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}]};
    const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,originalEvidenceFor=overlay&&overlay.evidenceFor;
    if(overlay)overlay.evidenceFor=row=>row===service?{service:{uid:'C21373',trainid:'5F25',serviceIdGuid:'20260816C21373'}}:(typeof originalEvidenceFor==='function'?originalEvidenceFor(row):null);"""
)
replace_once(
    'kerbside-backend/tests/train-movement-browser-regression.mjs',
    "    matches:window.__KERBSIDE_TRAIN_MOVEMENT__.state.matches\n  }));",
    """    matches:window.__KERBSIDE_TRAIN_MOVEMENT__.state.matches,
    resolvedRefs:window.__KERBSIDE_TRAIN_MOVEMENT__.refsFor(window.__KERBSIDE_TRAINS__.state.services[0])
  }));"""
)
replace_once(
    'kerbside-backend/tests/train-movement-browser-regression.mjs',
    "  assert.equal(result.attached,'C21373');\n  assert.ok(result.matches>=2,`expected movement matches, got ${result.matches}`);",
    "  assert.equal(result.attached,'C21373');\n  assert.deepEqual(result.resolvedRefs,['uid:C21373','head:5F25']);\n  assert.ok(result.matches>=2,`expected movement matches, got ${result.matches}`);"
)

print('Applied Kerbside 0.9.31 movement matching recovery patch.')
