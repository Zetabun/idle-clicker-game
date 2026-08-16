#!/usr/bin/env python3
from pathlib import Path
import subprocess


def read(path):
    return Path(path).read_text(encoding='utf-8')

def write(path, text):
    target=Path(path); target.parent.mkdir(parents=True,exist_ok=True); target.write_text(text,encoding='utf-8')

def replace_once(text, old, new, label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)

def replace_method(text, start_marker, end_marker, replacement, label):
    start=text.find(start_marker)
    if start<0: raise SystemExit(f'{label}: start not found')
    end=text.find(end_marker,start)
    if end<0: raise SystemExit(f'{label}: end not found')
    return text[:start]+replacement+text[end:]

policy=r'''const SIGNIFICANT_TYPES=new Set(['0001','0002','0005','0006','0007','0008']);
export const RECOVERY_FLUSH_MS=60*1000;
export const HOT_TRAIN_TTL_MS=30*60*1000;
export const HOT_CHECKPOINT_MS=10*60*1000;
export const LIVE_RETENTION_MS=12*60*60*1000;
export const RECOVERY_RETENTION_MS=48*60*60*1000;
export const RECOVERY_CHUNK_SIZE=300;
export const RECOVERY_PREFIX='movement-recovery:';
function text(v){return String(v==null?'':v).trim();}
export function shouldQueueRecovery({types=[],snapshot=null,hot=false,lastCheckpointAt=0,now=Date.now()}={}){const set=new Set((types||[]).map(text));if([...set].some(t=>SIGNIFICANT_TYPES.has(t)))return{queue:true,reason:'lifecycle'};if(snapshot&&snapshot.status==='terminated')return{queue:true,reason:'terminated'};if(hot&&now-Number(lastCheckpointAt||0)>=HOT_CHECKPOINT_MS)return{queue:true,reason:'hot-checkpoint'};return{queue:false,reason:'live-memory'};}
export function compactRecoverySnapshot(s){if(!s||typeof s!=='object')return null;const out={trainId:text(s.trainId),uid:text(s.uid),headcode:text(s.headcode),date:text(s.date),status:text(s.status)||'unknown',updatedAt:Number(s.updatedAt)||Date.now()};for(const k of ['activation','lastEvent','cancellation','reinstatement','originChange','identityChange','locationChange','currentTrainId'])if(s[k]!=null)out[k]=s[k];return out.trainId?out:null;}
export function splitRecoveryEntries(rows,size=RECOVERY_CHUNK_SIZE){rows=Array.isArray(rows)?rows.filter(Boolean):[];size=Math.max(1,Number(size)||RECOVERY_CHUNK_SIZE);const out=[];for(let i=0;i<rows.length;i+=size)out.push(rows.slice(i,i+size));return out;}
export function recoveryKey(now=Date.now(),chunk=0){return`${RECOVERY_PREFIX}${Math.max(0,Math.floor(Number(now)||Date.now()))}:${Math.max(0,Math.floor(Number(chunk)||0))}`;}
export function recoveryKeyTimestamp(key){const m=text(key).match(/^movement-recovery:(\d+):\d+$/);return m?Number(m[1]):null;}
export function recoveryKeyExpired(key,now=Date.now(),retentionMs=RECOVERY_RETENTION_MS){const stamp=recoveryKeyTimestamp(key);return stamp!=null&&Number(now)-stamp>Number(retentionMs);}
'''
write('kerbside-train-movement-worker/movement-storage-policy.js',policy)

test=r'''import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import{HOT_CHECKPOINT_MS,RECOVERY_PREFIX,compactRecoverySnapshot,recoveryKey,recoveryKeyExpired,shouldQueueRecovery,splitRecoveryEntries}from'./movement-storage-policy.js';
test('ordinary movement is memory-only',()=>{for(let i=0;i<20000;i++)assert.equal(shouldQueueRecovery({types:['0003'],snapshot:{status:'running'},hot:false,now:1_000_000}).queue,false);});
test('lifecycle and termination are recoverable',()=>{for(const type of['0001','0002','0005','0006','0007','0008'])assert.equal(shouldQueueRecovery({types:[type],snapshot:{status:'running'}}).queue,true);assert.equal(shouldQueueRecovery({types:['0003'],snapshot:{status:'terminated'}}).queue,true);});
test('only hot trains checkpoint ordinary movement',()=>{const now=2_000_000;assert.equal(shouldQueueRecovery({types:['0003'],snapshot:{status:'running'},hot:true,lastCheckpointAt:now-HOT_CHECKPOINT_MS-1,now}).queue,true);assert.equal(shouldQueueRecovery({types:['0003'],snapshot:{status:'running'},hot:true,lastCheckpointAt:now-HOT_CHECKPOINT_MS+1,now}).queue,false);});
test('compact recovery omits rolling history',()=>{const row=compactRecoverySnapshot({trainId:'123A45',status:'running',updatedAt:99,history:[{x:1}],lastEvent:{eventType:'DEPARTURE'}});assert.equal(row.lastEvent.eventType,'DEPARTURE');assert.equal(Object.hasOwn(row,'history'),false);});
test('buckets are bounded and expire',()=>{assert.deepEqual(splitRecoveryEntries(Array.from({length:601},(_,i)=>({trainId:String(i)})),300).map(x=>x.length),[300,300,1]);const key=recoveryKey(1_000_000,2);assert.ok(key.startsWith(RECOVERY_PREFIX));assert.equal(recoveryKeyExpired(key,1_000_100,200),false);assert.equal(recoveryKeyExpired(key,1_000_201,200),true);});
test('worker has no hot-path SQL mutation',()=>{const source=fs.readFileSync(new URL('./worker.js',import.meta.url),'utf8');assert.doesNotMatch(source,/INSERT OR REPLACE|DELETE FROM/i);assert.match(source,/storage\.put\(recoveryKey\(/);});
'''
write('kerbside-train-movement-worker/movement-storage-policy.test.mjs',test)

w=read('kerbside-train-movement-worker/worker.js')
w=replace_once(w,"  lookupIndexKey,\n  normaliseLookupRef,","  lookupIndexKey,\n  messageType,\n  normaliseLookupRef,",'messageType import')
anchor="} from './movement-core.js';\n"
extra="""import {\n  HOT_TRAIN_TTL_MS, LIVE_RETENTION_MS, RECOVERY_CHUNK_SIZE, RECOVERY_FLUSH_MS, RECOVERY_PREFIX, RECOVERY_RETENTION_MS,\n  compactRecoverySnapshot, recoveryKey, recoveryKeyExpired, shouldQueueRecovery, splitRecoveryEntries\n} from './movement-storage-policy.js';\n"""
w=replace_once(w,anchor,anchor+extra,'policy import')
ctor_anchor="    this.sql = ctx.storage.sql;\n"
ctor_extra="""    this.liveSnapshots=new Map(); this.recoveredSnapshots=new Map();\n    this.memoryServiceIndex=new Map(); this.memoryHeadIndex=new Map(); this.memoryOriginIndex=new Map();\n    this.hotTrainUntil=new Map(); this.lastCheckpointAt=new Map(); this.recoveryBuffer=new Map();\n    this.lastRecoveryFlushAt=0; this.lastMemoryPruneAt=0; this.lastStorageCleanupAt=0; this.recoveryFlushPromise=null;\n    this.storageStats={mode:'memory-first',writes:0,writeFailures:0,lastFlushAt:0,lastWriteError:'',legacyRestored:0,recoveryRestored:0};\n"""
w=replace_once(w,ctor_anchor,ctor_anchor+ctor_extra,'constructor memory')
w=replace_once(w,"    this.restoreStatus();\n    this.backfillOriginIndexes();","    this.restoreStatus();\n    this.ctx.blockConcurrencyWhile(()=>this.restoreRecoveryState());",'constructor restore')

start="  saveStatus() {\n"
end="  async fetch(request) {\n"
helpers=r'''  saveStatus() {
    // Health counters are deliberately memory-only. Persisting them for every
    // TRUST batch was a major source of Durable Object rows_written.
  }

  addMemoryIndex(map,key,trainId){if(!key||!trainId)return;if(!map.has(key))map.set(key,new Set());map.get(key).add(trainId);}
  registerSnapshot(snapshot){if(!snapshot||!snapshot.trainId)return;const date=text(snapshot.date||snapshot.activation&&snapshot.activation.date),uid=upper(snapshot.uid||snapshot.activation&&snapshot.activation.uid),head=upper(snapshot.headcode||snapshot.activation&&snapshot.activation.headcode);if(uid&&date)this.addMemoryIndex(this.memoryServiceIndex,lookupIndexKey({kind:'uid',value:uid},date),snapshot.trainId);if(head&&date)this.addMemoryIndex(this.memoryHeadIndex,lookupIndexKey({kind:'head',value:head},date),snapshot.trainId);const origin=originIndexFromActivation(snapshot.activation);if(origin)this.addMemoryIndex(this.memoryOriginIndex,lookupIndexKey({kind:'origin',value:origin.value},origin.date),snapshot.trainId);}
  rememberRecovered(snapshot,source='recovery'){if(!snapshot||!snapshot.trainId)return;const prior=this.recoveredSnapshots.get(snapshot.trainId);if(!prior||Number(snapshot.updatedAt||0)>=Number(prior.updatedAt||0)){this.recoveredSnapshots.set(snapshot.trainId,snapshot);this.lastCheckpointAt.set(snapshot.trainId,Number(snapshot.updatedAt)||0);this.registerSnapshot(snapshot);if(source==='legacy')this.storageStats.legacyRestored+=1;else this.storageStats.recoveryRestored+=1;}}
  async restoreRecoveryState(){const now=Date.now(),cutoff=now-RECOVERY_RETENTION_MS;try{for(const row of this.sql.exec('SELECT train_id,payload,updated_at FROM snapshots WHERE updated_at >= ?',cutoff)){let snapshot;try{snapshot=JSON.parse(row.payload);}catch{continue;}if(snapshot&&!snapshot.trainId)snapshot.trainId=text(row.train_id);this.rememberRecovered(snapshot,'legacy');}}catch{}try{const rows=await this.ctx.storage.list({prefix:RECOVERY_PREFIX});for(const[key,value]of rows){if(recoveryKeyExpired(key,now,RECOVERY_RETENTION_MS))continue;for(const snapshot of Array.isArray(value&&value.snapshots)?value.snapshots:[])this.rememberRecovered(snapshot);}}catch(error){this.storageStats.lastWriteError=`Recovery read: ${safeMessage(error)}`;}}
  uniqueMemory(map,key){const set=key&&map.get(key);return set&&set.size===1?[...set][0]:'';}
  markHot(trainId,now=Date.now()){if(trainId)this.hotTrainUntil.set(trainId,now+HOT_TRAIN_TTL_MS);}
  isHot(trainId,now=Date.now()){return Number(this.hotTrainUntil.get(trainId)||0)>now;}
  responseSnapshot(trainId){const snapshot=this.snapshotByTrainId(trainId);if(!snapshot)return null;const live=this.liveSnapshots.has(trainId),response=publicSnapshot(snapshot);response.reacquiring=!live&&this.status.state==='connected'&&['activated','running'].includes(text(snapshot.status));response.storageSource=live?'memory-live':'recovery-checkpoint';return response;}
  queueRecovery(snapshot,reason){const compact=compactRecoverySnapshot(snapshot);if(!compact)return;compact.recoveryReason=reason;this.recoveryBuffer.set(compact.trainId,compact);}
  async maybeFlushRecovery(force=false){const now=Date.now();if(!this.recoveryBuffer.size)return false;if(!force&&now-this.lastRecoveryFlushAt<RECOVERY_FLUSH_MS)return false;if(this.recoveryFlushPromise)return this.recoveryFlushPromise;this.recoveryFlushPromise=this.flushRecoveryBuffer(now).finally(()=>{this.recoveryFlushPromise=null;});return this.recoveryFlushPromise;}
  async flushRecoveryBuffer(now=Date.now()){const captured=[...this.recoveryBuffer.entries()];if(!captured.length)return false;const chunks=splitRecoveryEntries(captured.map(([,s])=>s),RECOVERY_CHUNK_SIZE);try{for(let i=0;i<chunks.length;i++)await this.ctx.storage.put(recoveryKey(now,i),{createdAt:now,snapshots:chunks[i]});for(const[trainId,snapshot]of captured){const current=this.recoveryBuffer.get(trainId);if(current&&Number(current.updatedAt||0)<=Number(snapshot.updatedAt||0))this.recoveryBuffer.delete(trainId);this.rememberRecovered(snapshot);}this.lastRecoveryFlushAt=now;this.storageStats.writes+=chunks.length;this.storageStats.lastFlushAt=now;this.storageStats.lastWriteError='';return true;}catch(error){this.storageStats.writeFailures+=1;this.storageStats.lastWriteError=safeMessage(error);return false;}}
  pruneMemory(now=Date.now()){if(now-this.lastMemoryPruneAt<60000)return;this.lastMemoryPruneAt=now;for(const[trainId,until]of this.hotTrainUntil)if(until<=now)this.hotTrainUntil.delete(trainId);for(const[trainId,snapshot]of this.liveSnapshots)if(now-Number(snapshot.updatedAt||0)>LIVE_RETENTION_MS)this.liveSnapshots.delete(trainId);for(const[trainId,snapshot]of this.recoveredSnapshots)if(now-Number(snapshot.updatedAt||0)>RECOVERY_RETENTION_MS){this.recoveredSnapshots.delete(trainId);this.lastCheckpointAt.delete(trainId);}}
  async cleanupRecoveryStorage(now=Date.now()){if(now-this.lastStorageCleanupAt<6*60*60*1000)return;this.lastStorageCleanupAt=now;try{const rows=await this.ctx.storage.list({prefix:RECOVERY_PREFIX}),expired=[...rows.keys()].filter(key=>recoveryKeyExpired(key,now,RECOVERY_RETENTION_MS));for(let i=0;i<expired.length;i+=100)await this.ctx.storage.delete(expired.slice(i,i+100));}catch(error){this.storageStats.lastWriteError=`Recovery cleanup: ${safeMessage(error)}`;}}

'''
w=replace_method(w,start,end,helpers+end,'replace persistence helpers')

health_anchor="      server: this.status.server || '',\n      corpus: CORPUS_META,"
health_new="""      server: this.status.server || '',\n      storage: { ...this.storageStats, liveSnapshots:this.liveSnapshots.size, recoveredSnapshots:this.recoveredSnapshots.size, hotTrains:[...this.hotTrainUntil.values()].filter(until=>until>now).length, recoveryBuffered:this.recoveryBuffer.size, recoveryFlushSeconds:RECOVERY_FLUSH_MS/1000 },\n      corpus: CORPUS_META,"""
w=replace_once(w,health_anchor,health_new,'health storage')

old_snapshot=r'''  snapshotByTrainId(trainId) {
    const id = text(trainId);
    if (!id) return null;
    const rows = [...this.sql.exec('SELECT payload FROM snapshots WHERE train_id = ?', id)];
    if (!rows[0] || !rows[0].payload) return null;
    try { return JSON.parse(rows[0].payload); } catch { return null; }
  }
'''
new_snapshot=r'''  snapshotByTrainId(trainId) {
    const id=text(trainId);if(!id)return null;
    const memory=this.liveSnapshots.get(id)||this.recoveredSnapshots.get(id);if(memory)return memory;
    const rows=[...this.sql.exec('SELECT payload FROM snapshots WHERE train_id = ?',id)];if(!rows[0]||!rows[0].payload)return null;
    try{const snapshot=JSON.parse(rows[0].payload);this.rememberRecovered(snapshot,'legacy');return snapshot;}catch{return null;}
  }
'''
w=replace_once(w,old_snapshot,new_snapshot,'snapshot memory')

lookup_start="  lookup(url) {\n"
lookup_end="  async ensureConnected() {\n"
lookup=r'''  lookup(url) {
    const date=text(url.searchParams.get('date'))||londonDate(),refs=url.searchParams.getAll('ref').map(normaliseLookupRef).filter(Boolean).slice(0,MAX_LOOKUP_REFS),results={};
    for(const ref of refs){let trainId='';const key=ref.kind==='train'?'':lookupIndexKey(ref,date);if(ref.kind==='train')trainId=ref.value;else if(ref.kind==='uid'){trainId=this.uniqueMemory(this.memoryServiceIndex,key);if(!trainId){const rows=key?[...this.sql.exec('SELECT train_id FROM service_index WHERE key = ?',key)]:[];trainId=rows[0]&&rows[0].train_id||'';}}else if(ref.kind==='head'){trainId=this.uniqueMemory(this.memoryHeadIndex,key);if(!trainId){const rows=key?[...this.sql.exec('SELECT train_id FROM service_index WHERE key = ?',key)]:[];trainId=rows[0]&&rows[0].train_id||'';}if(!trainId&&key){const rows=[...this.sql.exec('SELECT train_id FROM head_fallback_index WHERE key = ? ORDER BY updated_at DESC LIMIT 2',key)];if(rows.length===1)trainId=rows[0].train_id||'';}}else if(ref.kind==='origin'){const candidates=new Set();for(const candidateKey of originLookupKeys(ref,date)){for(const id of this.memoryOriginIndex.get(candidateKey)||[])candidates.add(id);if(candidates.size>1)break;if(!candidates.size){for(const row of this.sql.exec('SELECT train_id FROM origin_fallback_index WHERE key = ? ORDER BY updated_at DESC LIMIT 2',candidateKey)){if(row&&row.train_id)candidates.add(row.train_id);if(candidates.size>1)break;}}if(candidates.size>1)break;}if(candidates.size===1)trainId=[...candidates][0];}if(trainId)this.markHot(trainId);results[ref.raw]=trainId?this.responseSnapshot(trainId):null;}
    return json({ok:true,date,generatedAt:Date.now(),connected:this.status.state==='connected',lastMessageAt:this.status.lastMessageAt||null,storageMode:'memory-first',results},200,{'Cache-Control':'no-store','X-Kerbside-Movement-Source':'network-rail-trust'});
  }

'''
w=replace_method(w,lookup_start,lookup_end,lookup+lookup_end,'lookup memory')

persist_start="  async persistMovementBatch(body) {\n"
persist_end="  startHeartbeat() {\n"
persist=r'''  async persistMovementBatch(body) {
    let messages;try{messages=parseMovementBatch(body);}catch(error){throw new Error(`Invalid Network Rail movement JSON: ${safeMessage(error)}`);}const now=Date.now();this.status.batches+=1;this.status.lastMessageAt=now;if(!messages.length)return;const existing=this.existingSnapshotsFor(messages),applied=applyFeedMessages(messages,existing,CORPUS,now),typesByTrain=new Map();for(const message of messages){const trainId=trainIdOf(message),type=messageType(message);if(!trainId)continue;if(!typesByTrain.has(trainId))typesByTrain.set(trainId,new Set());typesByTrain.get(trainId).add(type);}for(const[trainId,snapshot]of applied.snapshots){this.liveSnapshots.set(trainId,snapshot);this.registerSnapshot(snapshot);const plan=shouldQueueRecovery({types:[...(typesByTrain.get(trainId)||[])],snapshot,hot:this.isHot(trainId,now),lastCheckpointAt:this.lastCheckpointAt.get(trainId)||0,now});if(plan.queue)this.queueRecovery(snapshot,plan.reason);}this.status.messages+=messages.length;this.pruneMemory(now);await this.maybeFlushRecovery(false);
  }

'''
w=replace_method(w,persist_start,persist_end,persist+persist_end,'persist memory')

cleanup_start="  cleanup() {\n"
cleanup_end="  async alarm() {\n"
cleanup=r'''  cleanup() { this.pruneMemory(Date.now()); }

'''
w=replace_method(w,cleanup_start,cleanup_end,cleanup+cleanup_end,'cleanup legacy')
old_alarm="""  async alarm() {\n    this.cleanup();\n    if (this.status.state === 'auth-error') return;"""
new_alarm="""  async alarm() {\n    const now=Date.now();\n    await this.maybeFlushRecovery(true);\n    this.cleanup();\n    await this.cleanupRecoveryStorage(now);\n    if (this.status.state === 'auth-error') return;"""
w=replace_once(w,old_alarm,new_alarm,'alarm recovery')
write('kerbside-train-movement-worker/worker.js',w)

m=read('kerbside-train-movement.js')
m=replace_once(m,"function progress(snapshot){\n  if(!snapshot)return null;\n  const stale=Boolean(snapshot.stale)||ageSeconds(snapshot)>180;","function progress(snapshot){\n  if(!snapshot)return null;\n  const reacquiring=Boolean(snapshot.reacquiring);\n  const stale=Boolean(snapshot.stale)||ageSeconds(snapshot)>180||reacquiring;",'progress reacquire')
m=replace_once(m,"  const event=snapshot.lastEvent;\n  if(!event){const origin=locationLabel(snapshot.activation&&snapshot.activation.origin);return {tone:'idle',short:`${stale?'NR last confirmed':'NR live'} · train activated`,title:'Train activated in Network Rail TRUST',meta:`Origin ${origin}${ageLabel(snapshot)?` · ${ageLabel(snapshot)}`:''}`,stale};}","  const event=snapshot.lastEvent;\n  if(!event){const origin=locationLabel(snapshot.activation&&snapshot.activation.origin);if(reacquiring)return {tone:'stale',short:'NR reacquiring · waiting for next report',title:'Reacquiring live position',meta:`Recovered Network Rail identity for ${origin} · waiting for the next TRUST movement report`,stale:true,reacquiring:true};return {tone:'idle',short:`${stale?'NR last confirmed':'NR live'} · train activated`,title:'Train activated in Network Rail TRUST',meta:`Origin ${origin}${ageLabel(snapshot)?` · ${ageLabel(snapshot)}`:''}`,stale};}",'no event reacquire')
m=replace_once(m,"  return {tone:stale?'stale':'live',short,title,meta:bits.join(' · '),stale};","  if(reacquiring)bits.unshift('Reacquiring live feed');\n  return {tone:stale?'stale':'live',short:reacquiring?short.replace(/^NR (?:last confirmed|live)/,'NR reacquiring'):short,title,meta:bits.join(' · '),stale,reacquiring};",'progress return')
m=replace_once(m,"snapshot&&snapshot.status,snapshot&&snapshot.stale?'stale':'live'","snapshot&&snapshot.status,snapshot&&snapshot.stale?'stale':'live',snapshot&&snapshot.reacquiring?'reacquiring':'current'",'timeline signature')
m=replace_once(m,"  const event=snapshot&&snapshot.lastEvent,fallbackState=!snapshot?trackingFallbackState(startTime):'',activated=!!(snapshot&&!event&&snapshot.status==='activated');\n  const badge=document.createElement('span');badge.className=`train-progress-badge ${snapshot&&snapshot.stale?'is-stale':snapshot||fallbackState==='awaiting'?'is-live':'is-idle'}`;badge.setAttribute('data-train-progress-badge','');badge.textContent=snapshot?(activated?'Train activated':snapshot.stale?'NR last confirmed':'NR live'):(fallbackState==='awaiting'?'Awaiting departure':'Live position unavailable');title.appendChild(badge);","  const event=snapshot&&snapshot.lastEvent,fallbackState=trackingFallbackState(startTime),activated=!!(snapshot&&!event&&snapshot.status==='activated'),reacquiring=!!(snapshot&&snapshot.reacquiring&&fallbackState!=='awaiting');\n  const badge=document.createElement('span');badge.className=`train-progress-badge ${snapshot&&(snapshot.stale||reacquiring)?'is-stale':snapshot||fallbackState==='awaiting'?'is-live':'is-idle'}`;badge.setAttribute('data-train-progress-badge','');badge.textContent=snapshot?(fallbackState==='awaiting'&&activated?'Awaiting departure':reacquiring?'Reacquiring live position':activated?'Train activated':snapshot.stale?'NR last confirmed':'NR live'):(fallbackState==='awaiting'?'Awaiting departure':'Live position unavailable');title.appendChild(badge);",'timeline state')
m=replace_once(m,"  if(!snapshot||!event){if(origin){if(fallbackState==='awaiting'||activated){setProgressClass(origin,'progress-current');const now=document.createElement('em');now.className='train-progress-now';now.textContent=activated?'Network Rail has activated this service · awaiting first movement report':`Train starts here${startTime?` · scheduled ${startTime}`:''} · Live Network Rail tracking will begin when the train moves.`;origin.querySelector('span')?.appendChild(now);}else setProgressClass(origin,'progress-future');}return true;}","  if(!snapshot||!event){if(origin){if(fallbackState==='awaiting'||activated||reacquiring){setProgressClass(origin,'progress-current');const now=document.createElement('em');now.className='train-progress-now';now.textContent=fallbackState==='awaiting'?`Train starts here${startTime?` · scheduled ${startTime}`:''} · Live Network Rail tracking will begin when the train moves.`:reacquiring?'Reacquiring live position · identity recovered, waiting for the next Network Rail movement report.':'Network Rail has activated this service · awaiting first movement report';origin.querySelector('span')?.appendChild(now);}else setProgressClass(origin,'progress-future');}return true;}",'timeline note')
write('kerbside-train-movement.js',m)

b=read('kerbside-backend/tests/train-movement-browser-regression.mjs')
anchor="  assert.equal(atStation.current,'University');\n  assert.match(atStation.now,/Train here/i);\n  assert.match(atStation.now,/Arrived/i);\n"
reacq=r'''  const reacquiring=await page.evaluate(()=>{const api=window.__KERBSIDE_TRAIN_MOVEMENT__,service=window.__KERBSIDE_TRAINS__.state.services[0],base=service.networkRailMovement,wrap=document.createElement('div'),snapshot={...base,reacquiring:true,stale:true,updatedAt:Date.now()-600_000,lastEvent:null,status:'activated'};wrap.className='train-calling';wrap.innerHTML='<div class="train-detail-title">Calling points</div><div class="train-call ahead"><i></i><span><b>Five Ways</b><small>Later</small></span></div>';document.body.appendChild(wrap);api.decorateCallingTimeline(wrap,service,snapshot,{startName:'Birmingham New Street',startTime:'20:12'});const info=api.progress(snapshot);return{badge:wrap.querySelector('[data-train-progress-badge]')?.textContent||'',note:wrap.querySelector('.train-progress-now')?.textContent||'',short:info?.short||'',title:info?.title||''};});
  assert.match(reacquiring.badge,/Reacquiring live position/i);assert.match(reacquiring.note,/waiting for the next Network Rail movement report/i);assert.match(reacquiring.short,/NR reacquiring/i);assert.match(reacquiring.title,/Reacquiring live position/i);
'''
b=replace_once(b,anchor,anchor+reacq,'browser reacquire')
write('kerbside-backend/tests/train-movement-browser-regression.mjs',b)

wf=read('.github/workflows/verify-kerbside-train-movement.yml')
wf=replace_once(wf,"          node --check kerbside-train-movement-worker/movement-core.js\n","          node --check kerbside-train-movement-worker/movement-core.js\n          node --check kerbside-train-movement-worker/movement-storage-policy.js\n",'workflow check')
wf=replace_once(wf,"          node --test kerbside-train-movement-worker/movement-core.test.mjs\n","          node --test kerbside-train-movement-worker/movement-core.test.mjs\n          node --test kerbside-train-movement-worker/movement-storage-policy.test.mjs\n",'workflow test')
write('.github/workflows/verify-kerbside-train-movement.yml',wf)

write('VERSION','0.9.34\n')
subprocess.run(['python3','.github/scripts/sync-version.py'],check=True)
for path in['kerbside-train-movement.js','kerbside-train-movement-worker/worker.js','kerbside-train-movement-worker/movement-storage-policy.js','kerbside-backend/tests/train-movement-browser-regression.mjs']:subprocess.run(['node','--check',path],check=True)
subprocess.run(['node','--test','kerbside-train-movement-worker/movement-core.test.mjs'],check=True)
subprocess.run(['node','--test','kerbside-train-movement-worker/movement-storage-policy.test.mjs'],check=True)
subprocess.run(['python3','.github/scripts/sync-version.py','--check'],check=True)
print('0.9.34 patch and fast checks passed')
