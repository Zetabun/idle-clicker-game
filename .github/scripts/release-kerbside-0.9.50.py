from pathlib import Path
import re
import subprocess
import sys

NEW = "0.9.50"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path, old, new, label):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match in {path}, found {count}")
    write(path, text.replace(old, new, 1))


def sub_once(path, pattern, replacement, label, flags=0):
    text = read(path)
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match in {path}, found {count}")
    write(path, next_text)


write("VERSION", NEW + "\n")
subprocess.run([sys.executable, ".github/scripts/sync-version.py"], check=True)

# Formation-length fallback: never compare a local service with an arbitrary
# mixed-station median. Prefer exact operator+destination peers, then allow a
# same-operator or same-destination fallback only when its observed lengths are
# internally tight. If evidence is heterogeneous, suppress the signal.
sub_once(
    "kerbside-train-forecast-v4.js",
    r"/\* Formation comparison needs a few known train lengths to have a median worth[\s\S]*?function formationBaseline\(services\)\{[\s\S]*?\n\}",
    """/* Formation comparison is only useful when the peer trains are actually
   comparable. A mixed station can have four-car locals beside nine/eleven-car
   intercity services, so an unfiltered median creates a false crowding signal.
   Prefer operator+destination peers; broader fallbacks are accepted only when
   their observed lengths are already tightly clustered. */
function stableFormationLengths(rows){
  const lengths=(Array.isArray(rows)?rows:[]).map(row=>Number(row&&row.length)||0).filter(Boolean).sort((a,b)=>a-b);
  if(lengths.length<3)return [];
  const min=lengths[0],max=lengths[lengths.length-1];
  return min>0&&max/min<=1.5?lengths:[];
}
function comparableFormationLengths(service,rows){
  const list=(Array.isArray(rows)?rows:[]).filter(row=>Number(row&&row.length)>0),op=operatorIdentity(service),destination=profileDestinationIdentity(service);
  if(op!=='unknown'&&destination!=='unknown'){
    const exact=stableFormationLengths(list.filter(row=>operatorIdentity(row)===op&&profileDestinationIdentity(row)===destination));
    if(exact.length>=3)return exact;
  }
  if(op!=='unknown'){
    const sameOperator=stableFormationLengths(list.filter(row=>operatorIdentity(row)===op));
    if(sameOperator.length>=3)return sameOperator;
  }
  if(destination!=='unknown'){
    const sameDestination=stableFormationLengths(list.filter(row=>profileDestinationIdentity(row)===destination));
    if(sameDestination.length>=3)return sameDestination;
  }
  return [];
}
function formationBaseline(service,services){
  const own=comparableFormationLengths(service,services);
  if(own.length>=3)return own;
  const overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
  const board=overlay&&overlay.state&&Array.isArray(overlay.state.services)?overlay.state.services:[];
  return comparableFormationLengths(service,board);
}""",
    "formation baseline comparator",
)
replace_once(
    "kerbside-train-forecast-v4.js",
    "    const lengths=formationBaseline(services).sort((a,b)=>a-b);\n    if(lengths.length>=3){baseline=lengths[Math.floor(lengths.length/2)];source='nearby live formations';}",
    "    const lengths=formationBaseline(service,services).sort((a,b)=>a-b);\n    if(lengths.length>=3){baseline=lengths[Math.floor(lengths.length/2)];source='comparable nearby live formations';}",
    "formation signal filtered baseline",
)

# Saved Journeys are explicit user intent, while the caches below can be
# recreated from public/live sources. If localStorage is full, reclaim only
# Kerbside's regenerable cache/model data and retry the save synchronously.
replace_once(
    "kerbside-journey-planner-core.js",
    "const PLAN_SAVED_KEY='kerbside.rail.plan.saved.v1';\nconst PLAN_BUFFER_OPTIONS=new Set([0,5,10,15]);",
    "const PLAN_SAVED_KEY='kerbside.rail.plan.saved.v1';\nconst PLAN_SAVED_META_KEY='kerbside.rail.plan.saved-meta.v2';\nconst PLAN_RECLAIMABLE_CACHE_PATTERNS=[/^kerbside\\.rail\\.wikidata\\./,/^kerbside\\.rail\\.fixtures\\./,/^kerbside\\.rail\\.forecast\\.v\\d+\\.calendar(?:\\.|$)/];\nconst PLAN_RECLAIMABLE_DERIVED_KEYS=['kerbside.rail.crowding.v2','kerbside.rail.forecast.accuracy.v1'];\nconst PLAN_BUFFER_OPTIONS=new Set([0,5,10,15]);",
    "saved journey storage reclaim constants",
)
sub_once(
    "kerbside-journey-planner-core.js",
    r"function writeSavedJourneys\(rows\)\{[\s\S]*?\n\}\nfunction planSavedLocatorForCandidate",
    """function planQuotaError(error){return !!error&&(error.name==='QuotaExceededError'||error.name==='NS_ERROR_DOM_QUOTA_REACHED'||Number(error.code)===22||Number(error.code)===1014);}
function planStorageKeys(){const keys=[];try{for(let index=0;index<localStorage.length;index++){const key=localStorage.key(index);if(key)keys.push(key);}}catch(error){}return keys;}
function planReclaimableCacheStorage(){
  let removed=0;for(const key of planStorageKeys()){if(!PLAN_RECLAIMABLE_CACHE_PATTERNS.some(pattern=>pattern.test(key)))continue;try{const value=localStorage.getItem(key);removed+=String(value||'').length;localStorage.removeItem(key);}catch(error){}}
  return removed;
}
function planReclaimDerivedStorage(){let removed=0;for(const key of PLAN_RECLAIMABLE_DERIVED_KEYS){try{const value=localStorage.getItem(key);if(value!=null){removed+=String(value).length;localStorage.removeItem(key);}}catch(error){}}return removed;}
function planCompactSavedMeta(rows){
  try{
    const raw=JSON.parse(localStorage.getItem(PLAN_SAVED_META_KEY)||'null');if(!raw||!raw.entries||typeof raw.entries!=='object')return 0;
    const ids=new Set((Array.isArray(rows)?rows:[]).map(item=>item&&item.id).filter(Boolean)),nextEntries={};let removed=0;
    for(const [id,value] of Object.entries(raw.entries)){if(ids.has(id))nextEntries[id]=value;else removed++;}
    if(!removed)return 0;localStorage.setItem(PLAN_SAVED_META_KEY,JSON.stringify({...raw,entries:nextEntries}));return removed;
  }catch(error){return 0;}
}
function planPersistSavedJourneys(next,payload){
  localStorage.setItem(PLAN_SAVED_KEY,payload);
  const persisted=readSavedJourneys();
  if(persisted.length!==next.length||persisted.some((item,index)=>item.id!==next[index].id))throw new Error('Saved journey storage verification failed');
  planState.saved=persisted;return persisted;
}
function writeSavedJourneys(rows){
  const next=[],seen=new Set();for(const value of Array.isArray(rows)?rows:[]){const item=normaliseSavedJourney(value);if(!item||seen.has(item.id))continue;seen.add(item.id);next.push(item);}
  const payload=JSON.stringify(next);
  try{return planPersistSavedJourneys(next,payload);}catch(error){
    if(!planQuotaError(error)){console.warn('Kerbside could not persist saved journeys:',error);return null;}
    planReclaimableCacheStorage();
    try{return planPersistSavedJourneys(next,payload);}catch(secondError){
      if(!planQuotaError(secondError)){console.warn('Kerbside could not persist saved journeys after cache reclaim:',secondError);return null;}
      planReclaimDerivedStorage();planCompactSavedMeta(next);
      try{return planPersistSavedJourneys(next,payload);}catch(finalError){console.warn('Kerbside could not persist saved journeys after storage reclaim:',finalError);return null;}
    }
  }
}
function planSavedLocatorForCandidate""",
    "quota-safe saved journey persistence",
)

# Regression: formation fallback must not mix unrelated operators/routes.
insert_before = "test('DfT aggregate benchmark can backtest forecast bands without user feedback',()=>{"
formation_test = """test('formation fallback ignores heterogeneous station traffic',()=>{
  const c=load(),v4=c.window.__KERBSIDE_FORECAST_V4__;
  const local={length:4,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}};
  c.window.__KERBSIDE_TRAIN_OVERLAY__.state.services=[
    {length:9,operator:'Avanti West Coast',operatorCode:'VT',destination:[{crs:'EUS'}],displayDestination:{crs:'EUS'}},
    {length:9,operator:'Avanti West Coast',operatorCode:'VT',destination:[{crs:'EUS'}],displayDestination:{crs:'EUS'}},
    {length:11,operator:'Avanti West Coast',operatorCode:'VT',destination:[{crs:'EUS'}],displayDestination:{crs:'EUS'}}
  ];
  assert.deepEqual(Array.from(v4.formationBaseline(local,[local])),[],'mixed intercity rows must not form a local-service baseline');
  c.window.__KERBSIDE_TRAIN_OVERLAY__.state.services=[
    {length:4,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}},
    {length:4,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}},
    {length:5,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}}
  ];
  assert.deepEqual(Array.from(v4.formationBaseline(local,[local])),[4,4,5]);
  c.window.__KERBSIDE_TRAIN_OVERLAY__.state.services=[
    {length:4,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}},
    {length:9,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}},
    {length:9,operator:'West Midlands Railway',operatorCode:'LM',destination:[{crs:'LTV'}],displayDestination:{crs:'LTV'}}
  ];
  assert.deepEqual(Array.from(v4.formationBaseline(local,[local])),[],'a wide length spread must suppress the fallback even within one operator/route');
});

"""
replace_once(
    "kerbside-backend/test/train-forecast-v4-official-data.test.mjs",
    insert_before,
    formation_test + insert_before,
    "formation comparator regression",
)

# Regression: reproduce the desktop QuotaExceededError and prove the save
# reclaims a stale Kerbside cache then persists in the same click.
replace_once(
    "kerbside-backend/tests/train-journey-planner-regression.mjs",
    "  const quietCard=page.locator('#planJourneyResults .plan-journey-result').filter({hasText:'Quiet Rail'});\n  const immediateSave=await quietCard.locator('[data-plan-save-key]').evaluate(button=>{button.click();let stored=[];try{stored=JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]');}catch{}return {stored:stored.length,workspace:window.__KERBSIDE_SAVED_JOURNEYS_V2__?.state?.saved?.length||0,label:(button.textContent||'').trim()};});",
    "  const quietCard=page.locator('#planJourneyResults .plan-journey-result').filter({hasText:'Quiet Rail'});\n  await page.evaluate(()=>{\n    localStorage.setItem('kerbside.rail.fixtures.v3','synthetic stale fixture cache');\n    const original=Storage.prototype.setItem;window.__KERBSIDE_TEST_STORAGE_SET_ITEM__=original;let injected=false;\n    Storage.prototype.setItem=function(key,value){if(this===localStorage&&key==='kerbside.rail.plan.saved.v1'&&!injected){injected=true;throw new DOMException('Synthetic saved-journey quota','QuotaExceededError');}return original.call(this,key,value);};\n  });\n  const immediateSave=await quietCard.locator('[data-plan-save-key]').evaluate(button=>{button.click();let stored=[];try{stored=JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]');}catch{}return {stored:stored.length,workspace:window.__KERBSIDE_SAVED_JOURNEYS_V2__?.state?.saved?.length||0,label:(button.textContent||'').trim(),staleCache:localStorage.getItem('kerbside.rail.fixtures.v3')};});\n  await page.evaluate(()=>{const original=window.__KERBSIDE_TEST_STORAGE_SET_ITEM__;if(original)Storage.prototype.setItem=original;delete window.__KERBSIDE_TEST_STORAGE_SET_ITEM__;});",
    "saved journey quota browser fixture",
)
replace_once(
    "kerbside-backend/tests/train-journey-planner-regression.mjs",
    "  assert.deepEqual(immediateSave,{stored:1,workspace:1,label:'Saved'},'Save journey must persist and synchronise the Saved journeys workspace in the same click, not via a delayed listener');",
    "  assert.deepEqual(immediateSave,{stored:1,workspace:1,label:'Saved',staleCache:null},'Save journey must reclaim regenerable Kerbside cache storage, persist and synchronise the Saved journeys workspace in the same click');",
    "saved journey quota assertion",
)

print(f"Prepared Kerbside {NEW} forecast baseline and saved-storage hardening patch.")
