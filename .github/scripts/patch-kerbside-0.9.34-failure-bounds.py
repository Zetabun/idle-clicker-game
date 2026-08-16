#!/usr/bin/env python3
from pathlib import Path
import subprocess

p=Path('kerbside-train-movement-worker/worker.js')
text=p.read_text(encoding='utf-8')

def one(old,new,label):
    global text
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text=text.replace(old,new,1)

one('HOT_TRAIN_TTL_MS, INDEX_REBUILD_MS, LIVE_RETENTION_MS, MAX_LIVE_SNAPSHOTS, MAX_RECOVERED_SNAPSHOTS, RECOVERY_CHUNK_SIZE,',
    'HOT_TRAIN_TTL_MS, INDEX_REBUILD_MS, LIVE_RETENTION_MS, MAX_LIVE_SNAPSHOTS, MAX_RECOVERED_SNAPSHOTS, MAX_RECOVERY_BUFFER, RECOVERY_CHUNK_SIZE,',
    'recovery buffer import')
one("this.storageStats={mode:'memory-first',writes:0,writeFailures:0,lastFlushAt:0,lastWriteError:'',legacyRestored:0,recoveryRestored:0};",
    "this.storageStats={mode:'memory-first',writes:0,writeFailures:0,recoveryDropped:0,lastFlushAt:0,lastWriteError:'',legacyRestored:0,recoveryRestored:0};",
    'storage stats')
one("for(const snapshot of Array.isArray(value&&value.snapshots)?value.snapshots:[])this.rememberRecovered(snapshot);}if(rows.size<RECOVERY_LOAD_PAGE_SIZE||!oldest)break;end=oldest;",
    "for(const snapshot of Array.isArray(value&&value.snapshots)?value.snapshots:[])this.rememberRecovered(snapshot);}this.pruneMemory(now,true);if(rows.size<RECOVERY_LOAD_PAGE_SIZE||!oldest)break;end=oldest;",
    'page prune')
one("queueRecovery(snapshot,reason){const compact=compactRecoverySnapshot(snapshot);if(!compact)return;compact.recoveryReason=reason;this.recoveryBuffer.set(compact.trainId,compact);}",
    "queueRecovery(snapshot,reason){const compact=compactRecoverySnapshot(snapshot);if(!compact)return;compact.recoveryReason=reason;if(!this.recoveryBuffer.has(compact.trainId)&&this.recoveryBuffer.size>=MAX_RECOVERY_BUFFER){const oldest=this.recoveryBuffer.keys().next().value;if(oldest){this.recoveryBuffer.delete(oldest);this.storageStats.recoveryDropped+=1;}}this.recoveryBuffer.set(compact.trainId,compact);}",
    'recovery buffer cap')
p.write_text(text,encoding='utf-8')
subprocess.run(['node','--check',str(p)],check=True)
subprocess.run(['node','--test','kerbside-train-movement-worker/movement-core.test.mjs'],check=True)
print('0.9.34 failure bounds passed')
