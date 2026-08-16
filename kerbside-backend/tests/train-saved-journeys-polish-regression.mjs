import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const testsDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(testsDir,'..','..');
const source=await readFile(path.join(root,'kerbside-saved-journeys-polish.js'),'utf8');
const loader=await readFile(path.join(root,'kerbside-journey-planner-ui.js'),'utf8');
const version=(await readFile(path.join(root,'VERSION'),'utf8')).trim();

const sandbox={console};
vm.runInNewContext(source,sandbox,{filename:'kerbside-saved-journeys-polish.js'});
const api=sandbox.__KERBSIDE_SAVED_JOURNEYS_POLISH__;
assert.ok(api,'Saved Journeys polish API did not initialise in a non-DOM context');
assert.equal(api.version,version);
assert.equal(api.schema,3);
assert.match(version,/^\d+\.\d+\.\d+$/);
const escapedVersion=version.replace(/\./g,'\\.');
assert.match(loader,new RegExp(`kerbside-journey-planner-core\\.js\\?v=${escapedVersion}`));
assert.match(loader,new RegExp(`kerbside-saved-journeys-polish\\.js\\?v=${escapedVersion}`));
assert.match(loader,new RegExp(`kerbside-rail-health\\.js\\?v=${escapedVersion}`));
assert.match(source,/data-saved-polish-edit/);
assert.match(source,/data-saved-polish-repeat/);
assert.match(source,/data-saved-polish-archive/);
assert.match(source,/data-saved-polish-restore/);
assert.match(source,/Delete .* permanently/);
assert.match(source,/Save changes/);
assert.match(source,/Next journey/);
assert.match(source,/Past journeys/);
assert.match(source,/Archived/);
assert.match(source,/kerbside\.rail\.plan\.saved-polish\.v3/);
assert.match(source,/kerbside\.rail\.plan\.recovery/);

const h=api.helpers;
const base={
  v:1,id:'journey-a',savedAt:'2026-08-01T08:00:00.000Z',refreshedAt:'',date:'2026-08-18',
  from:{crs:'BHM',name:'Birmingham New Street'},to:{crs:'BRI',name:'Bristol Temple Meads'},
  journeyType:'direct',service:{uid:'C12345',serviceID:'svc-a',trainId:'1A01',std:'09:10'},first:{},onward:{},change:'',
  scheduledDeparture:'09:10',scheduledArrival:'10:35',searchStart:'08:45',searchEnd:'10:15',preference:'balanced',constraints:{maxChanges:1,connectionBuffer:5}
};
const duplicate={...base,id:'journey-b',savedAt:'2026-08-02T08:00:00.000Z'};
assert.equal(h.journeyIdentity(base),h.journeyIdentity(duplicate),'duplicate identity must not depend on storage id');
assert.notEqual(h.journeyIdentity(base),h.journeyIdentity({...duplicate,date:'2026-08-19'}),'date must be part of duplicate identity');
const deduped=h.dedupeJourneys([base,duplicate,{...base,id:'journey-c',date:'2026-08-19'}]);
assert.deepEqual(JSON.parse(JSON.stringify(deduped.rows.map(item=>item.id))),['journey-a','journey-c']);
assert.equal(deduped.removed.length,1);

const repeated=h.buildRepeatedJourney(base,'2026-08-25','2026-08-16T17:30:00.000Z');
assert.ok(repeated);
assert.equal(repeated.date,'2026-08-25');
assert.notEqual(repeated.id,base.id);
assert.equal(repeated.savedAt,'2026-08-16T17:30:00.000Z');
assert.equal(repeated.refreshedAt,'');
assert.equal(repeated.service.uid,base.service.uid);
assert.equal(repeated.from.crs,'BHM');
assert.equal(h.nextRepeatDate('2026-07-07','2026-08-16'),'2026-08-18','repeat should advance by whole weeks until it reaches the future');

const connection={journeyType:'connection',std:'11:00',arrival:'13:10',interchange:{crs:'CNM'},legs:[{uid:'FIRST',std:'11:00'},{uid:'SECOND',std:'12:20'}]};
const edited=h.buildEditedJourney(base,connection,{
  from:{crs:'BHM',name:'Birmingham New Street'},to:{crs:'PAD',name:'London Paddington'},date:'2026-08-20',searchStart:'10:30',searchEnd:'12:00',preference:'quieter',constraints:{maxChanges:1,connectionBuffer:10}
},'2026-08-16T17:45:00.000Z');
assert.ok(edited);
assert.equal(edited.id,base.id,'editing must preserve the saved journey id');
assert.equal(edited.savedAt,base.savedAt,'editing must preserve the original saved-at timestamp');
assert.equal(edited.refreshedAt,'2026-08-16T17:45:00.000Z');
assert.equal(edited.date,'2026-08-20');
assert.equal(edited.to.crs,'PAD');
assert.equal(edited.journeyType,'connection');
assert.equal(edited.first.uid,'FIRST');
assert.equal(edited.onward.uid,'SECOND');
assert.equal(edited.change,'CNM');
assert.equal(edited.preference,'quieter');
assert.deepEqual(JSON.parse(JSON.stringify(edited.constraints)),{maxChanges:1,connectionBuffer:10});

const split=h.splitJourneys([
  {...base,id:'past',date:'2026-08-15',scheduledDeparture:'09:00'},
  {...base,id:'departed-today',date:'2026-08-16',scheduledDeparture:'08:00'},
  {...base,id:'next-today',date:'2026-08-16',scheduledDeparture:'18:30'},
  {...base,id:'tomorrow',date:'2026-08-17',scheduledDeparture:'07:30'}
],{today:'2026-08-16',nowMinutes:18*60});
assert.equal(split.next.id,'next-today');
assert.deepEqual(JSON.parse(JSON.stringify(split.upcoming.map(item=>item.id))),['departed-today','tomorrow']);
assert.deepEqual(JSON.parse(JSON.stringify(split.past.map(item=>item.id))),['past']);

const migratedArray=h.migratePolishValue([{...base,id:'archived-a'}],'2026-08-16T17:50:00.000Z');
assert.equal(migratedArray.store.schema,3);
assert.ok(migratedArray.changed);
assert.equal(migratedArray.store.archived['archived-a'].journey.id,'archived-a');
assert.equal(migratedArray.store.migratedAt,'2026-08-16T17:50:00.000Z');
const migratedV2=h.migratePolishValue({schema:2,archived:{old:{journey:{...base,id:'old'},meta:{status:'expired'},archivedAt:'2026-08-10T10:00:00.000Z'}}},'2026-08-16T17:51:00.000Z');
assert.equal(migratedV2.store.archived.old.meta.status,'expired');
assert.equal(migratedV2.store.schema,3);

class MemoryStorage{
  constructor(entries={}){this.map=new Map(Object.entries(entries));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(String(key),String(value));}
  removeItem(key){this.map.delete(String(key));}
  keys(){return [...this.map.keys()];}
}
const corruptSaved=new MemoryStorage({'kerbside.rail.plan.saved.v1':'{not json'});
const repairedSaved=api.repairSavedStore(corruptSaved,null,'2026-08-16T18:00:00.000Z');
assert.equal(repairedSaved.repaired,true);
assert.equal(corruptSaved.getItem('kerbside.rail.plan.saved.v1'),'[]');
assert.ok(corruptSaved.keys().some(key=>key.startsWith('kerbside.rail.plan.recovery.saved-v1-corrupt.')),'corrupt saved data must be backed up before reset');

const legacyRows=[base,duplicate,{garbage:true}];
const migratable=new MemoryStorage({'kerbside.rail.plan.saved.v1':JSON.stringify(legacyRows)});
const plannerMock={readSavedJourneys(){return [base,duplicate];}};
const repairedLegacy=api.repairSavedStore(migratable,plannerMock,'2026-08-16T18:01:00.000Z');
assert.equal(repairedLegacy.repaired,true);
assert.deepEqual(JSON.parse(migratable.getItem('kerbside.rail.plan.saved.v1')).map(item=>item.id),['journey-a']);
assert.ok(migratable.keys().some(key=>key.startsWith('kerbside.rail.plan.recovery.saved-v1-migrated.')));

const corruptMeta=new MemoryStorage({'kerbside.rail.plan.saved-meta.v2':'[]'});
const repairedMeta=api.repairMetaStore(corruptMeta,'2026-08-16T18:02:00.000Z');
assert.equal(repairedMeta.repaired,true);
assert.deepEqual(JSON.parse(corruptMeta.getItem('kerbside.rail.plan.saved-meta.v2')).entries,{});
assert.ok(corruptMeta.keys().some(key=>key.startsWith('kerbside.rail.plan.recovery.saved-meta-v2-corrupt.')));

const corruptPolish=new MemoryStorage({'kerbside.rail.plan.saved-polish.v3':'{broken'});
const repairedPolish=api.readPolishStore(corruptPolish,'2026-08-16T18:03:00.000Z');
assert.equal(repairedPolish.recovered,true);
assert.equal(repairedPolish.store.schema,3);
assert.ok(corruptPolish.keys().some(key=>key.startsWith('kerbside.rail.plan.recovery.polish-v3-corrupt.')));

console.log('Kerbside 0.9.28 Saved Journeys polish regression passed: edit, repeat, duplicate prevention, lifecycle grouping, archive schema migration and corrupt-store recovery.');
