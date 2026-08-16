#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess


def load(path):
    return Path(path).read_text(encoding='utf-8')


def save(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = load(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected 1 exact match, found {count}')
    save(path, text.replace(old, new, 1))


def regex_once(path, pattern, new):
    text = load(path)
    out, count = re.subn(pattern, lambda _m: new, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{path}: expected 1 regex match, found {count}: {pattern}')
    save(path, out)


save('VERSION', '0.9.33\n')

# ---------------------------------------------------------------------------
# TRUST core: keep an ambiguity-safe activation index by origin CRS + local
# departure minute. It is deliberately separate from the exact UID/headcode
# indexes because more than one train may share an origin/minute.
# ---------------------------------------------------------------------------
core = 'kerbside-train-movement-worker/movement-core.js'
regex_once(
    core,
    r"export function londonDateStamp\(value\) \{.*?\n\}\n",
    '''export function londonDateStamp(value) {
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
  return /^\\d{2}$/.test(hour) && /^\\d{2}$/.test(minute) ? `${hour}:${minute}` : '';
}
'''
)
replace_once(
    core,
    '''function indexFromActivation(activation) {
  const refs = [];
  if (!activation || !activation.trainId || !activation.date) return refs;
  if (activation.uid) refs.push({ kind: 'uid', date: activation.date, value: activation.uid, trainId: activation.trainId });
  if (activation.headcode) refs.push({ kind: 'head', date: activation.date, value: activation.headcode, trainId: activation.trainId });
  return refs;
}
''',
    '''function indexFromActivation(activation) {
  const refs = [];
  if (!activation || !activation.trainId || !activation.date) return refs;
  if (activation.uid) refs.push({ kind: 'uid', date: activation.date, value: activation.uid, trainId: activation.trainId });
  if (activation.headcode) refs.push({ kind: 'head', date: activation.date, value: activation.headcode, trainId: activation.trainId });
  return refs;
}

export function originIndexFromActivation(activation) {
  const crs = upper(activation && activation.origin && activation.origin.crs);
  const departure = londonClockStamp(activation && activation.originDepartureTimestamp);
  if (!activation || !activation.trainId || !activation.date || !/^[A-Z0-9]{3}$/.test(crs) || !/^\\d{2}:\\d{2}$/.test(departure)) return null;
  return { kind: 'origin', date: activation.date, value: `${crs}|${departure}`, trainId: activation.trainId };
}
'''
)
replace_once(core, '  const fallbackIndexes = [];\n  const counts = {};', '  const fallbackIndexes = [];\n  const originIndexes = [];\n  const counts = {};')
replace_once(core, '      indexes.push(...indexFromActivation(activation));\n', "      indexes.push(...indexFromActivation(activation));\n      const originIndex = originIndexFromActivation(activation);\n      if (originIndex) originIndexes.push(originIndex);\n")
replace_once(core, '  return { snapshots, indexes, fallbackIndexes, counts, touched: [...touched] };', '  return { snapshots, indexes, fallbackIndexes, originIndexes, counts, touched: [...touched] };')
replace_once(core, "  if (!['uid', 'head', 'train'].includes(kind) || !item) return null;", "  if (!['uid', 'head', 'train', 'origin'].includes(kind) || !item) return null;")
replace_once(
    core,
    '''  if (parsed.kind === 'train') return `train:${parsed.value}`;
  const stamp = dateStamp(date);
  if (!stamp) return '';
  return `${parsed.kind === 'uid' ? 'service' : 'head'}:${stamp}:${parsed.value}`;''',
    '''  if (parsed.kind === 'train') return `train:${parsed.value}`;
  const stamp = dateStamp(date);
  if (!stamp) return '';
  if (parsed.kind === 'origin') return `origin:${stamp}:${parsed.value}`;
  return `${parsed.kind === 'uid' ? 'service' : 'head'}:${stamp}:${parsed.value}`;'''
)

# ---------------------------------------------------------------------------
# Worker: store origin/minute candidates in a many-to-one table, accept a
# +/-2 minute public-vs-working timetable difference, resolve only one unique
# train, and backfill the table from already-persisted activation snapshots.
# ---------------------------------------------------------------------------
worker = 'kerbside-train-movement-worker/worker.js'
replace_once(worker, '  normaliseLookupRef,\n  parseMovementBatch,', '  normaliseLookupRef,\n  originIndexFromActivation,\n  parseMovementBatch,')
replace_once(
    worker,
    '''function londonDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
''',
    '''function londonDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function originLookupKeys(ref, date, windowMinutes = 2) {
  const match = upper(ref && ref.value).match(/^([A-Z0-9]{3})\\|(\\d{2}):(\\d{2})$/);
  const stamp = text(date);
  if (!match || !/^\\d{4}-\\d{2}-\\d{2}$/.test(stamp)) return [];
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
'''
)
replace_once(
    worker,
    '''    this.sql.exec(`CREATE INDEX IF NOT EXISTS head_fallback_updated ON head_fallback_index(updated_at)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (''',
    '''    this.sql.exec(`CREATE INDEX IF NOT EXISTS head_fallback_updated ON head_fallback_index(updated_at)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS origin_fallback_index (
      key TEXT NOT NULL,
      train_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY(key, train_id)
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS origin_fallback_updated ON origin_fallback_index(updated_at)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta ('''
)
replace_once(worker, '    this.restoreStatus();\n  }', '    this.restoreStatus();\n    this.backfillOriginIndexes();\n  }')
replace_once(
    worker,
    '''  saveStatus() {
    this.sql.exec('INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)', 'status', JSON.stringify(this.status));
  }
''',
    '''  saveStatus() {
    this.sql.exec('INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)', 'status', JSON.stringify(this.status));
  }

  backfillOriginIndexes() {
    try {
      const marker = [...this.sql.exec('SELECT value FROM meta WHERE key = ?', 'origin-index-v1')];
      if (marker[0] && marker[0].value) return;
      const now = Date.now(), cutoff = now - SNAPSHOT_RETENTION_MS;
      for (const row of this.sql.exec('SELECT train_id,payload,updated_at FROM snapshots WHERE updated_at >= ?', cutoff)) {
        let snapshot;
        try { snapshot = JSON.parse(row.payload); } catch { continue; }
        const index = originIndexFromActivation(snapshot && snapshot.activation);
        if (!index) continue;
        const key = lookupIndexKey({ kind: 'origin', value: index.value }, index.date);
        if (!key) continue;
        this.sql.exec('INSERT OR REPLACE INTO origin_fallback_index(key,train_id,updated_at) VALUES(?,?,?)', key, index.trainId || row.train_id, Number(row.updated_at) || now);
      }
      this.sql.exec('INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)', 'origin-index-v1', String(now));
    } catch {}
  }
'''
)
replace_once(
    worker,
    '''        if (!trainId && ref.kind === 'head' && key) {
          const fallbackRows = [...this.sql.exec('SELECT train_id FROM head_fallback_index WHERE key = ? ORDER BY updated_at DESC LIMIT 2', key)];
          if (fallbackRows.length === 1) trainId = fallbackRows[0].train_id || '';
        }
''',
    '''        if (!trainId && ref.kind === 'head' && key) {
          const fallbackRows = [...this.sql.exec('SELECT train_id FROM head_fallback_index WHERE key = ? ORDER BY updated_at DESC LIMIT 2', key)];
          if (fallbackRows.length === 1) trainId = fallbackRows[0].train_id || '';
        }
        if (!trainId && ref.kind === 'origin' && key) {
          const candidates = new Set();
          for (const candidateKey of originLookupKeys(ref, date)) {
            for (const row of this.sql.exec('SELECT train_id FROM origin_fallback_index WHERE key = ? ORDER BY updated_at DESC LIMIT 2', candidateKey)) {
              if (row && row.train_id) candidates.add(row.train_id);
              if (candidates.size > 1) break;
            }
            if (candidates.size > 1) break;
          }
          if (candidates.size === 1) trainId = [...candidates][0];
        }
'''
)
replace_once(
    worker,
    '''    for (const index of applied.fallbackIndexes || []) {
      const key = lookupIndexKey({ kind: index.kind, value: index.value }, index.date);
      if (!key) continue;
      this.sql.exec('INSERT OR REPLACE INTO head_fallback_index(key,train_id,updated_at) VALUES(?,?,?)', key, index.trainId, now);
    }
''',
    '''    for (const index of applied.fallbackIndexes || []) {
      const key = lookupIndexKey({ kind: index.kind, value: index.value }, index.date);
      if (!key) continue;
      this.sql.exec('INSERT OR REPLACE INTO head_fallback_index(key,train_id,updated_at) VALUES(?,?,?)', key, index.trainId, now);
    }
    for (const index of applied.originIndexes || []) {
      const key = lookupIndexKey({ kind: 'origin', value: index.value }, index.date);
      if (!key) continue;
      this.sql.exec('INSERT OR REPLACE INTO origin_fallback_index(key,train_id,updated_at) VALUES(?,?,?)', key, index.trainId, now);
    }
'''
)
replace_once(worker, "    this.sql.exec('DELETE FROM head_fallback_index WHERE updated_at < ?', cutoff);", "    this.sql.exec('DELETE FROM head_fallback_index WHERE updated_at < ?', cutoff);\n    this.sql.exec('DELETE FROM origin_fallback_index WHERE updated_at < ?', cutoff);")

# ---------------------------------------------------------------------------
# Browser overlay: when strong UID/headcode identity is absent, Darwin/VSTP
# rows may ask for a conservative origin CRS + scheduled minute match. Improve
# the no-movement timeline states at the same time.
# ---------------------------------------------------------------------------
front = 'kerbside-train-movement.js'
replace_once(
    front,
    "function headcode(value){const raw=upper(value);return raw?raw.slice(0,4):'';}\n",
    "function headcode(value){const raw=upper(value);return raw?raw.slice(0,4):'';}\nfunction movementTime(value){const m=text(value).match(/^(\\d{1,2}):(\\d{2})$/);if(!m)return'';const h=Number(m[1]),n=Number(m[2]);return h>=0&&h<24&&n>=0&&n<60?`${String(h).padStart(2,'0')}:${m[2]}`:'';}\nfunction originCrsFor(service){const direct=upper(service&&service.from&&(service.from.crs||service.from.crsCode));if(direct)return direct;const origin=Array.isArray(service&&service.origin)?service.origin.find(Boolean):service&&service.origin;const code=upper(origin&&(origin.crs||origin.crsCode));if(code)return code;if(service&&service.liveOnly)return upper(window.__KERBSIDE_TRAINS__?.state?.station?.crs);return'';}\nfunction originFallbackRef(service){const crs=originCrsFor(service),when=movementTime(service&&(service.std||service.departure||service.sta));return /^[A-Z0-9]{3}$/.test(crs)&&when?`origin:${crs}|${when}`:'';}\n"
)
regex_once(
    front,
    r"function refsFor\(service\)\{.*?\n\}\nfunction cacheKey",
    '''function refsFor(service){
  if(!service||typeof service!=='object')return[];
  const refs=[];
  for(const candidate of identityCandidates(service)){
    const uid=upper(candidate.uid||candidate.serviceUid||candidate.trainUid);if(uid)refs.push(`uid:${uid}`);
    const head=headcode(candidate.trainId||candidate.trainid||candidate.headcode);if(head)refs.push(`head:${head}`);
  }
  const strong=[...new Set(refs)];if(strong.length)return strong;
  const fallbacks=[service,...identityCandidates(service)].map(originFallbackRef).filter(Boolean);
  return [...new Set(fallbacks)].slice(0,1);
}
function cacheKey'''
)
replace_once(
    front,
    "function serviceStartName(service,api,boardId,snapshot){const leg=firstLeg(service);if(boardId==='trainBoard'){const station=api&&api.state&&api.state.station;const label=text(station&&(station.name||station.crs));if(label)return label;}return text(leg&&leg.from&&(leg.from.name||leg.from.locationName||leg.from.crs)||snapshot&&snapshot.activation&&snapshot.activation.origin&&(snapshot.activation.origin.name||snapshot.activation.origin.crs));}",
    "function serviceStartName(service,api,boardId,snapshot){const leg=firstLeg(service);if(boardId==='trainBoard'){const station=api&&api.state&&api.state.station;const label=text(station&&(station.name||station.crs));if(label)return label;}const origin=Array.isArray(leg&&leg.origin)?leg.origin.find(Boolean):leg&&leg.origin;return text(leg&&leg.from&&(leg.from.name||leg.from.locationName||leg.from.crs)||origin&&(origin.locationName||origin.name||origin.crs)||snapshot&&snapshot.activation&&snapshot.activation.origin&&(snapshot.activation.origin.name||snapshot.activation.origin.crs));}"
)
replace_once(
    front,
    "function timelineSourceRows(calling){return [...calling.querySelectorAll('.train-call')].filter(row=>!row.hasAttribute('data-train-progress-marker')&&!row.hasAttribute('data-train-progress-origin'));}\n",
    "function timelineSourceRows(calling){return [...calling.querySelectorAll('.train-call')].filter(row=>!row.hasAttribute('data-train-progress-marker')&&!row.hasAttribute('data-train-progress-origin'));}\nfunction londonNowMinutes(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));let hour=Number(map.hour)||0;if(hour===24)hour=0;return hour*60+(Number(map.minute)||0);}\nfunction trackingFallbackState(startTime){const when=movementTime(startTime);if(!when)return'unavailable';const [h,m]=when.split(':').map(Number),scheduled=h*60+m,now=londonNowMinutes();let elapsed=now-scheduled;if(elapsed>720)elapsed-=1440;if(elapsed<-720)elapsed+=1440;return elapsed<=4?'awaiting':'unavailable';}\n"
)
replace_once(
    front,
    "function timelineSignature(calling,snapshot,startName,startTime){const rows=timelineSourceRows(calling).map(row=>`${rowPlace(row)}|${text(row.querySelector('small')&&row.querySelector('small').textContent)}`).join('||'),event=snapshot&&snapshot.lastEvent,ageBucket=snapshot?Math.floor((ageSeconds(snapshot)||0)/15):0;return [rows,normalisePlace(startName),startTime,snapshot&&snapshot.status,snapshot&&snapshot.stale?'stale':'live',snapshot&&snapshot.updatedAt,event&&event.eventType,locationLabel(event&&event.location),locationLabel(event&&event.nextLocation),event&&event.actualTimestamp,ageBucket].join('|');}",
    "function timelineSignature(calling,snapshot,startName,startTime){const rows=timelineSourceRows(calling).map(row=>`${rowPlace(row)}|${text(row.querySelector('small')&&row.querySelector('small').textContent)}`).join('||'),event=snapshot&&snapshot.lastEvent,ageBucket=snapshot?Math.floor((ageSeconds(snapshot)||0)/15):0;return [rows,normalisePlace(startName),startTime,snapshot&&snapshot.status,snapshot&&snapshot.stale?'stale':'live',snapshot&&snapshot.updatedAt,event&&event.eventType,locationLabel(event&&event.location),locationLabel(event&&event.nextLocation),event&&event.actualTimestamp,ageBucket,snapshot?'':trackingFallbackState(startTime)].join('|');}"
)
replace_once(
    front,
    '''  let title=calling.querySelector('.train-detail-title');if(!title){title=document.createElement('div');title.className='train-detail-title';calling.prepend(title);}title.textContent=snapshot?'Live journey progress':'Journey progress';
  const badge=document.createElement('span');badge.className=`train-progress-badge ${snapshot&&snapshot.stale?'is-stale':snapshot?'is-live':'is-idle'}`;badge.setAttribute('data-train-progress-badge','');badge.textContent=snapshot?(snapshot.stale?'NR last confirmed':'NR live'):'Live position unavailable';title.appendChild(badge);
  let origin=null;if(startName&&(!sourceRows[0]||normalisePlace(startName)!==rowPlace(sourceRows[0]))){origin=makeProgressOrigin(startName,startTime);title.insertAdjacentElement('afterend',origin);}
  const rows=[...(origin?[origin]:[]),...sourceRows],event=snapshot&&snapshot.lastEvent;
  if(!snapshot||!event){if(origin)setProgressClass(origin,'progress-future');return true;}
''',
    '''  let title=calling.querySelector('.train-detail-title');if(!title){title=document.createElement('div');title.className='train-detail-title';calling.prepend(title);}title.textContent=snapshot?'Live journey progress':'Journey progress';
  const event=snapshot&&snapshot.lastEvent,fallbackState=!snapshot?trackingFallbackState(startTime):'',activated=!!(snapshot&&!event&&snapshot.status==='activated');
  const badge=document.createElement('span');badge.className=`train-progress-badge ${snapshot&&snapshot.stale?'is-stale':snapshot||fallbackState==='awaiting'?'is-live':'is-idle'}`;badge.setAttribute('data-train-progress-badge','');badge.textContent=snapshot?(activated?'Train activated':snapshot.stale?'NR last confirmed':'NR live'):(fallbackState==='awaiting'?'Awaiting departure':'Live position unavailable');title.appendChild(badge);
  let origin=null;if(startName&&(!sourceRows[0]||normalisePlace(startName)!==rowPlace(sourceRows[0]))){origin=makeProgressOrigin(startName,startTime);title.insertAdjacentElement('afterend',origin);}
  const rows=[...(origin?[origin]:[]),...sourceRows];
  if(!snapshot||!event){if(origin){if(fallbackState==='awaiting'||activated){setProgressClass(origin,'progress-current');const now=document.createElement('em');now.className='train-progress-now';now.textContent=activated?'Network Rail has activated this service · awaiting first movement report':`Train starts here${startTime?` · scheduled ${startTime}`:''} · Live Network Rail tracking will begin when the train moves.`;origin.querySelector('span')?.appendChild(now);}else setProgressClass(origin,'progress-future');}return true;}
'''
)

# ---------------------------------------------------------------------------
# Tests.
# ---------------------------------------------------------------------------
core_test = 'kerbside-train-movement-worker/movement-core.test.mjs'
replace_once(
    core_test,
    '''  assert.deepEqual(result.indexes.map(item => [item.kind, item.date, item.value]), [
    ['uid', '2026-08-16', 'C21373'],
    ['head', '2026-08-16', '5F25']
  ]);
  assert.equal(lookupIndexKey(normaliseLookupRef('uid:C21373'), '2026-08-16'), 'service:2026-08-16:C21373');
  assert.equal(lookupIndexKey(normaliseLookupRef('head:5f25'), '2026-08-16'), 'head:2026-08-16:5F25');
''',
    '''  assert.deepEqual(result.indexes.map(item => [item.kind, item.date, item.value]), [
    ['uid', '2026-08-16', 'C21373'],
    ['head', '2026-08-16', '5F25']
  ]);
  assert.deepEqual(result.originIndexes.map(item => [item.kind, item.date, item.value]), [
    ['origin', '2026-08-16', 'BHM|09:12']
  ]);
  assert.equal(lookupIndexKey(normaliseLookupRef('uid:C21373'), '2026-08-16'), 'service:2026-08-16:C21373');
  assert.equal(lookupIndexKey(normaliseLookupRef('head:5f25'), '2026-08-16'), 'head:2026-08-16:5F25');
  assert.equal(lookupIndexKey(normaliseLookupRef('origin:BHM|09:12'), '2026-08-16'), 'origin:2026-08-16:BHM|09:12');
'''
)
replace_once(
    core_test,
    "test('movement preserves activation identity and resolves current/next locations', () => {",
    '''test('origin fallback keeps duplicate origin/minute candidates separate for ambiguity checks', () => {
  const secondActivation = message('0001', { ...activation.body, train_id: '775F26MP16', train_uid: 'C21374' });
  const result = applyFeedMessages([activation, secondActivation], new Map(), corpus, now);
  assert.equal(result.originIndexes.length, 2);
  assert.equal(new Set(result.originIndexes.map(item => item.value)).size, 1);
  assert.equal(new Set(result.originIndexes.map(item => item.trainId)).size, 2);
});

test('movement preserves activation identity and resolves current/next locations', () => {'''
)

browser = 'kerbside-backend/tests/train-movement-browser-regression.mjs'
replace_once(
    browser,
    '    const trains=window.__KERBSIDE_TRAINS__,liveKey=trains.serviceKey(service,0);trains.state.services=[service];',
    "    const trains=window.__KERBSIDE_TRAINS__,liveKey=trains.serviceKey(service,0);trains.state.station={crs:'BHM',name:'Birmingham New Street'};trains.state.services=[service];"
)
replace_once(
    browser,
    '''  assert.ok(result.matches>=2,`expected movement matches, got ${result.matches}`);

  const atStation=await page.evaluate(()=>{''',
    '''  assert.ok(result.matches>=2,`expected movement matches, got ${result.matches}`);

  const liveOnly=await page.evaluate(async()=>{
    const api=window.__KERBSIDE_TRAIN_MOVEMENT__,timetable=window.__KERBSIDE_TRAIN_TIMETABLE__,board=document.getElementById('trainScheduledBoard');
    const service={serviceID:'darwin-vstp-2303',std:'23:03',arrival:'23:24',operator:'LNR & WMR',operatorCode:'LM',origin:[{locationName:'Birmingham New Street',crs:'BHM'}],destination:[{locationName:'Bromsgrove',crs:'BMV'}],displayDestination:{name:'Bromsgrove',crs:'BMV'},liveOnly:true,scheduledOnly:false,liveEvidence:true};
    const key=timetable.serviceKey(service,0);timetable.state.services=[service];board.innerHTML=`<article class="train-service train-scheduled-service open" data-service-id="${key}"><button class="train-service-summary"><span class="train-route"><strong>Bromsgrove</strong><small>LNR & WMR</small></span></button><div class="train-service-detail"><div class="train-calling"><div class="train-detail-title">First-leg calling points</div><div class="train-call ahead"><i></i><span><b>Five Ways</b><small>23:07</small></span></div><div class="train-call ahead"><i></i><span><b>University</b><small>23:10</small></span></div></div></div></article>`;
    await api.refresh({force:true});
    return {refs:api.refsFor(service),timeline:board.querySelector('.train-live-progress')?.textContent||'',attached:service.networkRailMovement?.trainId||''};
  });
  assert.deepEqual(liveOnly.refs,['origin:BHM|23:03']);
  assert.match(liveOnly.timeline,/Birmingham New Street/i);
  assert.match(liveOnly.timeline,/Between Birmingham New Street and University/i);
  assert.equal(liveOnly.attached,'775F25MP16');

  const awaiting=await page.evaluate(()=>{
    const api=window.__KERBSIDE_TRAIN_MOVEMENT__,wrap=document.createElement('div'),parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));let minute=(Number(map.hour==='24'?'0':map.hour)||0)*60+(Number(map.minute)||0)+2;minute%=1440;const start=`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;wrap.className='train-calling';wrap.innerHTML='<div class="train-detail-title">Calling points</div><div class="train-call ahead"><i></i><span><b>Five Ways</b><small>Later</small></span></div>';document.body.appendChild(wrap);api.decorateCallingTimeline(wrap,{std:start},null,{startName:'Birmingham New Street',startTime:start});return {badge:wrap.querySelector('[data-train-progress-badge]')?.textContent||'',current:wrap.querySelector('.progress-current b')?.textContent||'',note:wrap.querySelector('.train-progress-now')?.textContent||''};
  });
  assert.match(awaiting.badge,/Awaiting departure/i);
  assert.equal(awaiting.current,'Birmingham New Street');
  assert.match(awaiting.note,/tracking will begin when the train moves/i);

  const atStation=await page.evaluate(()=>{'''
)

# Central version propagation and cheap syntax/unit checks before the workflow
# is allowed to commit anything.
subprocess.run(['python', '.github/scripts/sync-version.py'], check=True)
subprocess.run(['python', '.github/scripts/sync-version.py', '--check'], check=True)
subprocess.run(['node', '--check', 'kerbside-train-movement.js'], check=True)
subprocess.run(['node', '--check', 'kerbside-train-movement-worker/movement-core.js'], check=True)
subprocess.run(['node', '--check', 'kerbside-train-movement-worker/worker.js'], check=True)
subprocess.run(['node', '--test', 'kerbside-train-movement-worker/movement-core.test.mjs'], check=True)
print('Kerbside 0.9.33 patch applied successfully.')
