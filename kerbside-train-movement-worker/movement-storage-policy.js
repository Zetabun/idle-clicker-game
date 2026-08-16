const SIGNIFICANT_TYPES=new Set(['0001','0002','0005','0006','0007','0008']);
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
