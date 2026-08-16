import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const browserName=(process.env.KERBSIDE_BROWSER||'webkit').toLowerCase();
const browserType=browserName==='chromium'?chromium:webkit;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),rel=pathname==='/'?'/bus.html':pathname,target=path.resolve(root,'.'+rel);
    if(!target.startsWith(root+path.sep))throw new Error('outside root');
    const body=await fs.readFile(target);res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
  }catch(error){res.writeHead(404,{'content-type':'text/plain'});res.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
let browser;
try{
  browser=await browserType.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error&&error.stack||error)));
  await page.route('https://kerbside-train-movement.adambullas.workers.dev/**',async route=>{
    const url=new URL(route.request().url()),refs=url.searchParams.getAll('ref'),now=Date.now();
    const movement={
      trainId:'775F25MP16',uid:'C21373',headcode:'5F25',date:url.searchParams.get('date'),status:'running',updatedAt:now-12_000,ageSeconds:12,stale:false,
      activation:{origin:{stanox:'77301',crs:'BHM',tiploc:'BHMN',name:'Birmingham New Street'}},
      lastEvent:{eventType:'DEPARTURE',phase:'departed',location:{stanox:'77301',crs:'BHM',name:'Birmingham New Street'},nextLocation:{stanox:'16416',crs:'UNI',name:'University'},actualTimestamp:now-120_000,plannedTimestamp:now-240_000,variationMinutes:2,variationStatus:'LATE',nextReportRunTime:'8',offRoute:false,terminated:false}
    };
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,date:url.searchParams.get('date'),generatedAt:now,connected:true,lastMessageAt:now-5000,results:Object.fromEntries(refs.map(ref=>[ref,movement]))})});
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|kerbside-train-movement\.adambullas\.workers\.dev)/,route=>route.abort());
  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');await page.click('#transportTrain');
  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_TRAINS__&&window.__KERBSIDE_TRAIN_TIMETABLE__&&window.__KERBSIDE_JOURNEY_PLANNER__?.planState?.installed),null,{timeout:10000});
  await page.addScriptTag({url:`http://127.0.0.1:${port}/kerbside-train-movement.js`});
  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_TRAIN_MOVEMENT__));
  const setup=await page.evaluate(()=>{
    const today=(()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));return `${map.year}-${map.month}-${map.day}`;})();
    window.__KERBSIDE_TRAIN_DATE__.state.date=today;
    const planDate=document.getElementById('planJourneyDate');if(planDate)planDate.value=today;
    const service={serviceID:'20260816C21373',std:'20:12',arrival:'21:33',operator:'CrossCountry',destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}]};
    const overlay=window.__KERBSIDE_TRAIN_OVERLAY__,originalEvidenceFor=overlay&&overlay.evidenceFor;
    if(overlay)overlay.evidenceFor=row=>row===service?{service:{uid:'C21373',trainid:'5F25',serviceIdGuid:'20260816C21373'}}:(typeof originalEvidenceFor==='function'?originalEvidenceFor(row):null);
    const trains=window.__KERBSIDE_TRAINS__,liveKey=trains.serviceKey(service,0);trains.state.services=[service];
    document.getElementById('trainBoard').innerHTML=`<article class="train-service open" data-service-id="${liveKey}"><button class="train-service-summary"><span class="train-route"><strong>Bristol Temple Meads</strong><small>CrossCountry · Platform 11</small></span></button><div class="train-service-detail"><div class="train-calling"><div class="train-detail-title">Calling points</div><div class="train-call ahead"><i></i><span><b>University</b><small>20:20</small></span></div><div class="train-call ahead"><i></i><span><b>Selly Oak</b><small>20:24</small></span></div></div></div></article>`;
    const scheduled={...service,uid:'C21373',trainId:'5F25',serviceID:'20260816C21373',from:{crs:'BHM',name:'Birmingham New Street'},to:{crs:'BRI',name:'Bristol Temple Meads'}};
    const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__,scheduledKey=timetable.serviceKey(scheduled,0);timetable.state.services=[scheduled];
    let scheduledBoard=document.getElementById('trainScheduledBoard');if(!scheduledBoard){scheduledBoard=document.createElement('div');scheduledBoard.id='trainScheduledBoard';document.querySelector('.train-content').appendChild(scheduledBoard);}scheduledBoard.hidden=false;
    scheduledBoard.innerHTML=`<article class="train-service train-scheduled-service open" data-service-id="${scheduledKey}"><button class="train-service-summary"><span class="train-route"><strong>Bristol Temple Meads</strong><small>CrossCountry · arr 21:33</small></span></button><div class="train-service-detail"><div class="train-calling"><div class="train-detail-title">First-leg calling points</div><div class="train-call ahead"><i></i><span><b>Five Ways</b><small>20:16</small></span></div><div class="train-call ahead"><i></i><span><b>University</b><small>20:20</small></span></div><div class="train-call ahead"><i></i><span><b>Selly Oak</b><small>20:24</small></span></div></div></div></article>`;
    const plan=window.__KERBSIDE_JOURNEY_PLANNER__,candidate={...scheduled,journeyType:'direct',changes:0,totalMinutes:81,departureMinute:1212,arrivalMinute:1293};plan.planState.results=[candidate];
    document.getElementById('planJourneyResults').innerHTML='<article class="plan-journey-result" data-plan-rank="1"><div class="plan-result-route"><strong>CrossCountry</strong><span>Direct · 1h 21m</span></div><details><div class="plan-details-body"></div></details></article>';
    return {today,liveKey,scheduledKey};
  });
  assert.match(setup.today,/^\d{4}-\d{2}-\d{2}$/);
  await page.evaluate(()=>window.__KERBSIDE_TRAIN_MOVEMENT__.refresh({force:true}));
  await page.waitForFunction(()=>document.querySelectorAll('[data-train-progress-marker]').length>=3);
  const result=await page.evaluate(()=>({
    liveInline:document.querySelector('#trainBoard .train-movement-inline')?.textContent||'',
    liveTimeline:document.querySelector('#trainBoard .train-live-progress')?.textContent||'',
    liveTitle:document.querySelector('#trainBoard .train-live-progress .train-detail-title')?.textContent||'',
    scheduledInline:document.querySelector('#trainScheduledBoard .train-movement-inline')?.textContent||'',
    scheduledTimeline:document.querySelector('#trainScheduledBoard .train-live-progress')?.textContent||'',
    scheduledTitle:document.querySelector('#trainScheduledBoard .train-live-progress .train-detail-title')?.textContent||'',
    planInline:document.querySelector('#planJourneyResults .plan-movement-inline')?.textContent||'',
    planTimeline:document.querySelector('#planJourneyResults [data-train-progress-planner]')?.textContent||'',
    movementCards:document.querySelectorAll('#trainBoard [data-train-movement-card],#trainScheduledBoard [data-train-movement-card],#planJourneyResults [data-train-movement-card]').length,
    attached:window.__KERBSIDE_TRAINS__.state.services[0].networkRailMovement?.uid||'',
    matches:window.__KERBSIDE_TRAIN_MOVEMENT__.state.matches,
    resolvedRefs:window.__KERBSIDE_TRAIN_MOVEMENT__.refsFor(window.__KERBSIDE_TRAINS__.state.services[0])
  }));
  assert.match(result.liveInline,/between Birmingham New Street and University/i);
  assert.match(result.liveTitle,/Live journey progress/i);
  assert.match(result.liveTimeline,/Birmingham New Street/i);
  assert.match(result.liveTimeline,/Between Birmingham New Street and University/i);
  assert.match(result.liveTimeline,/2 min late/i);
  assert.match(result.liveTimeline,/not GPS/i);
  assert.match(result.scheduledInline,/between Birmingham New Street and University/i);
  assert.match(result.scheduledTitle,/Live journey progress/i);
  assert.match(result.scheduledTimeline,/Five Ways/i);
  assert.match(result.scheduledTimeline,/University/i);
  assert.match(result.scheduledTimeline,/Selly Oak/i);
  assert.doesNotMatch(result.scheduledTimeline,/First-leg calling points/i);
  assert.match(result.planInline,/between Birmingham New Street and University/i);
  assert.match(result.planTimeline,/Live journey progress/i);
  assert.match(result.planTimeline,/Between Birmingham New Street and University/i);
  assert.equal(result.movementCards,0,'timeline should replace duplicate movement cards when progress can be shown');
  assert.equal(result.attached,'C21373');
  assert.deepEqual(result.resolvedRefs,['uid:C21373','head:5F25']);
  assert.ok(result.matches>=2,`expected movement matches, got ${result.matches}`);

  const atStation=await page.evaluate(()=>{
    const api=window.__KERBSIDE_TRAIN_MOVEMENT__,service=window.__KERBSIDE_TRAINS__.state.services[0],base=service.networkRailMovement,now=Date.now(),snapshot={...base,updatedAt:now-5_000,ageSeconds:5,stale:false,lastEvent:{...base.lastEvent,eventType:'ARRIVAL',location:{stanox:'16416',crs:'UNI',name:'University'},nextLocation:{stanox:'16418',name:'Selly Oak'},actualTimestamp:now-30_000,plannedTimestamp:now-30_000,variationMinutes:0,variationStatus:'ON TIME'}};
    const calling=document.querySelector('#trainBoard .train-calling');api.decorateCallingTimeline(calling,service,snapshot,{startName:'Birmingham New Street',startTime:'20:12'});
    return {current:calling.querySelector('.train-call.progress-current b')?.textContent||'',now:calling.querySelector('.train-progress-now')?.textContent||''};
  });
  assert.equal(atStation.current,'University');
  assert.match(atStation.now,/Train here/i);
  assert.match(atStation.now,/Arrived/i);
  assert.deepEqual(pageErrors,[],`unexpected page errors: ${pageErrors.join('\n')}`);
  console.log(`Kerbside Network Rail movement browser regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
