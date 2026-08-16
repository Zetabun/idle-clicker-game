import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const testsDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(testsDir,'..','..');
const polishSource=await readFile(path.join(root,'kerbside-saved-journeys-polish.js'),'utf8');

const fixture=`<!doctype html><html><head><meta charset="utf-8"><style>
[hidden]{display:none!important}body{font-family:sans-serif}.train-sidebar,.train-content{padding:8px}.saved-v2-card{border:1px solid #999;padding:8px;margin:4px}.saved-v2-card footer>div{display:flex;gap:4px;flex-wrap:wrap}
</style></head><body>
<div class="train-sidebar">
  <div id="trainViewTabs"><button data-train-view="trains">Trains</button><button data-train-view="plan">Plan my journey</button><button data-train-view="saved">Saved journeys <span id="savedJourneyTabCount"></span></button></div>
  <section id="planJourneyForm"><div class="train-kicker">Journey planner</div><h2>Plan my journey</h2><p>Compare options.</p>
    <input id="planJourneyDate" type="date"><input id="planJourneyStart" type="time"><input id="planJourneyEnd" type="time">
    <select id="planJourneyPreference"><option value="balanced">Balanced</option><option value="quieter">Quieter</option></select>
    <select id="planJourneyMaxChanges"><option value="1">1</option><option value="0">0</option></select>
    <select id="planJourneyConnectionBuffer"><option value="0">0</option><option value="5">5</option><option value="10">10</option></select>
    <div id="planJourneyMessage"></div>
  </section>
  <section id="savedJourneySidebar" class="saved-v2-sidebar"><div class="saved-v2-summary"><span>Saved journeys</span><strong id="savedJourneySidebarCount">0</strong></div><p id="savedJourneyAutoMeta"></p></section>
</div>
<div class="train-content">
  <section id="planJourneySurface"><div id="planJourneyResults"></div></section>
  <section id="savedJourneySurface" class="saved-v2-surface"><header class="saved-v2-head"><h2>Saved journeys</h2><p><span id="savedJourneyCount">0</span> saved</p></header><div id="savedJourneyList"></div></section>
</div>
<script>
(function(){
  const iso=()=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=type=>parts.find(part=>part.type===type)?.value;return get('year')+'-'+get('month')+'-'+get('day')};
  const add=(value,days)=>{const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
  const today=iso(),tomorrow=add(today,1),later=add(today,2),past=add(today,-1);
  const make=(id,date,std,uid,to='BRI')=>({v:1,id,savedAt:'2026-08-01T08:00:00.000Z',refreshedAt:'',date,from:{crs:'BHM',name:'Birmingham New Street'},to:{crs:to,name:to==='PAD'?'London Paddington':'Bristol Temple Meads'},journeyType:'direct',service:{uid,std},first:{},onward:{},change:'',scheduledDeparture:std,scheduledArrival:'10:35',searchStart:'08:30',searchEnd:'10:30',preference:'balanced',constraints:{maxChanges:1,connectionBuffer:0}});
  const initial=[make('journey-next',tomorrow,'09:10','NEXT'),make('journey-upcoming',later,'11:10','LATER'),make('journey-past',past,'08:10','PAST')];
  localStorage.setItem('kerbside.rail.plan.saved.v1',JSON.stringify(initial));
  localStorage.setItem('kerbside.rail.plan.saved-meta.v2',JSON.stringify({entries:{},coverageKey:'',updatedAt:''}));
  const planner={planState:{installed:true,saved:initial,from:initial[0].from,to:initial[0].to,results:[],preference:'balanced',constraints:{maxChanges:1,connectionBuffer:0}},readSavedJourneys(){try{return JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]')}catch(e){return[]}},async planOpenSavedJourney(id){const saved=this.readSavedJourneys().find(item=>item.id===id);if(!saved)return false;this.planState.saved=this.readSavedJourneys();this.planState.from=saved.from;this.planState.to=saved.to;this.planState.preference=saved.preference;this.planState.constraints=saved.constraints;document.getElementById('planJourneyDate').value=saved.date;document.getElementById('planJourneyStart').value=saved.searchStart;document.getElementById('planJourneyEnd').value=saved.searchEnd;document.getElementById('planJourneyPreference').value=saved.preference;document.getElementById('planJourneyMaxChanges').value=String(saved.constraints.maxChanges);document.getElementById('planJourneyConnectionBuffer').value=String(saved.constraints.connectionBuffer);this.planState.results=[{journeyType:'direct',uid:'EDITED',std:'12:15',arrival:'13:40',operator:'Test Rail'}];document.getElementById('planJourneyResults').innerHTML='<article data-plan-rank="1"><button type="button" data-plan-save-key="edited">Saved</button></article>';return true;}};
  window.__KERBSIDE_JOURNEY_PLANNER__=planner;
  function card(saved){return '<article class="saved-v2-card" data-saved-v2-id="'+saved.id+'"><header><div><span class="saved-v2-date">'+saved.date+'</span><h3>'+saved.from.name+' → '+saved.to.name+'</h3></div><span class="saved-v2-status">Planned</span></header><div class="saved-v2-times"><strong>'+saved.scheduledDeparture+' → '+saved.scheduledArrival+'</strong></div><div class="saved-v2-intent"><span>Saved plan</span><strong>Balanced</strong></div><footer><span>Checked just now</span><div><button data-saved-v2-open="'+saved.id+'">Open in planner</button><button data-saved-v2-refresh="'+saved.id+'">Refresh now</button><button class="saved-v2-remove" data-saved-v2-remove="'+saved.id+'">Remove</button></div></footer></article>'}
  const v2={state:{installed:true,active:true,saved:initial,meta:{entries:{},coverageKey:'',updatedAt:''},live:new Map(),refreshing:new Set(),starting:new Set()},syncSaved(options={}){this.state.saved=planner.readSavedJourneys();planner.planState.saved=this.state.saved;if(options.render!==false){const list=document.getElementById('savedJourneyList');list.innerHTML=this.state.saved.length?this.state.saved.map(card).join(''):'<div class="saved-v2-empty"><strong>No saved journeys yet</strong><span>Empty.</span></div>';}return this.state.saved},async refreshSavedJourney(id){const meta=this.state.meta.entries[id]||(this.state.meta.entries[id]={});meta.lastChecked=new Date().toISOString();this.syncSaved();return true},exitSavedView(){this.state.active=false},enterSavedView(){this.state.active=true;this.syncSaved();return true}};
  window.__KERBSIDE_SAVED_JOURNEYS_V2__=v2;v2.syncSaved();
  window.__fixtureDates={today,tomorrow,later,past,add};
})();
</script>
<script src="/kerbside-saved-journeys-polish.js"></script>
</body></html>`;

const server=http.createServer((req,res)=>{
  if(req.url==='/kerbside-saved-journeys-polish.js'){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8'});res.end(polishSource);return;}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(fixture);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const browser=await webkit.launch({headless:true});
const context=await browser.newContext({timezoneId:'Europe/London'});
const page=await context.newPage();
page.on('dialog',dialog=>dialog.accept());
const pageErrors=[];page.on('pageerror',error=>pageErrors.push(String(error&&error.stack||error)));
const targetStage=String(process.env.KERBSIDE_BROWSER_STAGE||'delete').toLowerCase();
const stageOrder=['attach','next','groups','badge','repeat','archive','edit','delete'];
const targetIndex=Math.max(0,stageOrder.indexOf(targetStage));
const runs=stage=>targetIndex>=stageOrder.indexOf(stage);

try{
  await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__KERBSIDE_SAVED_JOURNEYS_POLISH__?.runtime?.installed===true);
  if(runs('next')) await page.waitForSelector('.saved-polish-next');
  if(runs('groups')){
    assert.match(await page.locator('#savedJourneyList').innerText(),/Next journey/);
    assert.match(await page.locator('#savedJourneyList').innerText(),/Upcoming/);
    assert.match(await page.locator('#savedJourneyList').innerText(),/Past journeys/);
  }
  if(runs('badge')) assert.equal((await page.locator('.saved-polish-next .saved-polish-next-badge').textContent())?.trim(),'Next journey');

  if(runs('repeat')){
  const repeatDate=await page.evaluate(()=>window.__fixtureDates.add(window.__fixtureDates.tomorrow,7));
  await page.click('[data-saved-polish-repeat="journey-next"]');
  await page.fill('[data-saved-polish-repeat-form="journey-next"] input[name="date"]',repeatDate);
  await page.click('[data-saved-polish-repeat-form="journey-next"] button[type="submit"]');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').length===4);
  assert.match(await page.locator('#savedJourneyPolishNotice').innerText(),/Repeated journey saved/);

  await page.click('[data-saved-polish-repeat="journey-next"]');
  await page.fill('[data-saved-polish-repeat-form="journey-next"] input[name="date"]',repeatDate);
  await page.click('[data-saved-polish-repeat-form="journey-next"] button[type="submit"]');
  await page.waitForFunction(()=>document.getElementById('savedJourneyPolishNotice')?.textContent.includes('already saved'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').length),4,'duplicate repeat created another saved journey');
  }

  if(runs('archive')){
  await page.click('[data-saved-polish-archive="journey-upcoming"]');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').every(item=>item.id!=='journey-upcoming'));
  const archived=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved-polish.v3')||'{}').archived||{});
  assert.ok(archived['journey-upcoming'],'archive did not persist the complete journey');
  await page.waitForSelector('.saved-polish-archived');
  await page.click('.saved-polish-archived > summary');
  await page.waitForSelector('.saved-polish-archived');
  await page.click('.saved-polish-archived > summary');
  await page.waitForSelector('[data-saved-polish-restore="journey-upcoming"]');
  await page.click('[data-saved-polish-restore="journey-upcoming"]');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').some(item=>item.id==='journey-upcoming'));
  assert.equal(await page.evaluate(()=>Boolean(JSON.parse(localStorage.getItem('kerbside.rail.plan.saved-polish.v3')||'{}').archived?.['journey-upcoming'])),false);
  }

  if(runs('edit')){
  const editDate=await page.evaluate(()=>window.__fixtureDates.add(window.__fixtureDates.tomorrow,5));
  const beforeEditCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').length);
  await page.locator('[data-saved-polish-edit="journey-next"]').dispatchEvent('click');
  await page.waitForSelector('#savedJourneyEditBanner');
  assert.equal(await page.locator('#planJourneyResults [data-plan-save-key]').innerText(),'Save changes');
  await page.fill('#planJourneyDate',editDate);
  await page.locator('#planJourneyResults [data-plan-save-key]').dispatchEvent('click');
  await page.waitForFunction(date=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').find(item=>item.id==='journey-next')?.date===date,editDate);
  const edited=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').find(item=>item.id==='journey-next'));
  assert.equal(edited.id,'journey-next');
  assert.equal(edited.service.uid,'EDITED');
  assert.equal(edited.scheduledDeparture,'12:15');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').length),beforeEditCount,'editing created or removed an extra saved journey');
  await page.waitForFunction(()=>document.getElementById('savedJourneyPolishNotice')?.textContent.includes('updated'));
  }

  if(runs('delete')){
  const deleteId=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').find(item=>item.id!=='journey-next')?.id);
  const preDelete=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').length);
  await page.click(`[data-saved-polish-delete="${deleteId}"]`);
  await page.waitForFunction(count=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').length===count-1,preDelete);
  assert.deepEqual(pageErrors,[]);
  }
  assert.deepEqual(pageErrors,[]);
  console.log(`Kerbside 0.9.28 Saved Journeys browser harness passed through stage: ${targetStage}.`);
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
