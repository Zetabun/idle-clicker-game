import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const browserName = (process.env.KERBSIDE_BROWSER || 'webkit').toLowerCase();
const browserType = browserName === 'chromium' ? chromium : webkit;
function londonStamp(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function addCalendarDays(stamp,days){
  const [year,month,day]=stamp.split('-').map(Number);
  return new Date(Date.UTC(year,month-1,day+days,12)).toISOString().slice(0,10);
}
const TODAY=londonStamp();
const TOMORROW=addCalendarDays(TODAY,1);
const FUTURE_DATE=addCalendarDays(TODAY,4);

const mime = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.svg':'image/svg+xml; charset=utf-8', '.woff2':'font/woff2'
};

const server = http.createServer(async (req,res)=>{
  try{
    const raw = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const rel = raw === '/' ? '/bus.html' : raw;
    const target = path.resolve(repoRoot,'.' + rel);
    if(!target.startsWith(repoRoot + path.sep)) throw new Error('outside root');
    const body = await fs.readFile(target);
    res.writeHead(200,{'content-type':mime[path.extname(target)] || 'application/octet-stream'});
    res.end(body);
  }catch(error){
    res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});
    res.end('not found');
  }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port} = server.address();

const stationResults = [
  {stationName:'Bristol Temple Meads',crsCode:'BRI'},
  {stationName:'Bristol Parkway',crsCode:'BPW'},
  {stationName:'Birmingham New Street',crsCode:'BHM'}
];

const allBoard = {
  generatedAt:'2026-08-10T13:20:00Z',
  locationName:'Birmingham New Street',
  crs:'BHM',
  nrccMessages:[],
  trainServices:[
    {
      origin:[{locationName:'Manchester Piccadilly',crs:'MAN'}],
      destination:[{locationName:'Plymouth',crs:'PLY'}],
      serviceIdUrlSafe:'BHM-BRI-1',std:'14:12',etd:'On time',platform:'11A',
      operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
    },
    {
      origin:[{locationName:'Birmingham New Street',crs:'BHM'}],
      destination:[{locationName:'Liverpool Lime Street',crs:'LIV'}],
      serviceIdUrlSafe:'BHM-LIV-1',std:'14:18',etd:'14:21',platform:'4C',
      operator:'West Midlands Railway',operatorCode:'LM',length:4,isCancelled:false
    }
  ]
};

const directBoard = {
  ...allBoard,
  filterLocationName:'Bristol Temple Meads',
  filtercrs:'BRI',
  trainServices:[allBoard.trainServices[0]]
};

function attachDiagnostics(page){
  const diagnostics = {requests:[],pageErrors:[],consoleErrors:[]};
  page.on('pageerror',error=>diagnostics.pageErrors.push(String(error && error.stack || error)));
  page.on('console',message=>{
    if(message.type() === 'error') diagnostics.consoleErrors.push(message.text());
  });
  return diagnostics;
}

async function mockExternal(page,diagnostics){
  const handle = async route=>{
    const url = new URL(route.request().url());
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/,'') || '/';
    diagnostics.requests.push(pathname);
    if(pathname.startsWith('/crs/')){
      const query = pathname.slice('/crs/'.length).toLowerCase();
      const results = stationResults.filter(item=>
        item.stationName.toLowerCase().includes(query) || item.crsCode.toLowerCase() === query
      );
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(results.length ? results : stationResults)});
      return;
    }
    if(pathname === '/departures/BHM/9'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(allBoard)});
      return;
    }
    if(pathname === '/departures/BHM/to/BRI/9'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(directBoard)});
      return;
    }
    if(pathname.startsWith('/service/')){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({})});
      return;
    }
    await route.fulfill({status:404,contentType:'application/json',body:'{}'});
  };
  await page.route('**://huxley2.azurewebsites.net/**', handle);
  await page.route('**://hux.azurewebsites.net/**', handle);
}

async function waitForServiceCount(page,count){
  await page.waitForFunction(expected=>document.querySelectorAll('.train-service').length === expected,count,{timeout:10000});
}

async function selectBirmingham(page){
  await page.fill('#trainStationQuery','BHM');
  // The legacy origin button remains only as a compatibility hook for the train
  // modules; the combined journey planner deliberately hides it from users.
  await page.evaluate(()=>document.getElementById('trainStationGo').click());
  await waitForServiceCount(page,2);
  assert.equal(await page.locator('#trainStationName').textContent(),'Birmingham New Street');
  assert.equal(await page.locator('#trainDestinationQuery').isDisabled(),false);
}

async function selectBristol(page,diagnostics){
  await page.fill('#trainDestinationQuery','Bristol');
  await page.waitForSelector('#trainDestinationSuggest button');
  assert.match(await page.locator('#trainDestinationSuggest').textContent(),/Bristol Temple Meads/);
  await page.locator('#trainDestinationSuggest button').filter({hasText:'Bristol Temple Meads'}).click();
  await waitForServiceCount(page,1);
  assert.ok(diagnostics.requests.includes('/departures/BHM/to/BRI/9'),
    `expected direct Huxley request, got ${JSON.stringify(diagnostics.requests)}`);
}

function departureRequestCount(diagnostics){
  return diagnostics.requests.filter(item=>item.startsWith('/departures/')).length;
}

async function runDesktop(browser){
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  const diagnostics = attachDiagnostics(page);
  await mockExternal(page,diagnostics);
  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  await page.waitForSelector('#trainDestinationQuery');
  await page.waitForSelector('#trainJourneyGo');

  assert.equal(await page.locator('label[for="trainStationQuery"]').textContent(),'From');
  assert.equal(await page.locator('label[for="trainDestinationQuery"]').textContent(),'To');
  assert.equal(await page.locator('#trainDestinationQuery').isDisabled(),false);
  assert.equal(await page.locator('label[for="trainTravelDate"]').textContent(),'Travel date');
  assert.equal(await page.locator('#trainTravelDate').inputValue(),TODAY);
  const visibleFindActions = await page.locator('.train-planner button').evaluateAll(buttons=>buttons.filter(button=>{
    const style=getComputedStyle(button),box=button.getBoundingClientRect();
    return /find/i.test(button.textContent||'') && style.display!=='none' && Number(style.opacity)>0 && box.width>2 && box.height>2;
  }).map(button=>(button.textContent||'').trim()));
  assert.deepEqual(visibleFindActions,['Find trains']);

  await selectBirmingham(page);
  await selectBristol(page,diagnostics);

  // Future dates are planning state, never today's Darwin board. This pins the
  // screenshot regression where a complete BHM -> BRI journey still showed
  // "Choose a station" and "Live journey loaded" after tomorrow was selected.
  const liveRequestsBeforeFuture = departureRequestCount(diagnostics);
  await page.locator('#trainTravelDate').fill(FUTURE_DATE);
  await page.locator('#trainTravelDate').dispatchEvent('change');
  await page.waitForFunction(()=>document.getElementById('trainTravelDateMeta')?.dataset.mode === 'planning');
  assert.match(await page.locator('#trainTravelDateMeta').textContent(),/advance journey.*timetabled services/i);
  await page.waitForSelector('#trainBoard .train-future-date');
  assert.equal(await page.locator('.train-service').count(),0);
  assert.equal(await page.locator('#trainStationName').textContent(),'Birmingham New Street → Bristol Temple Meads');
  assert.match(await page.locator('#trainStationMeta').textContent(),/BHM → BRI.*timetabled services/i);
  assert.equal(await page.locator('#trainRefresh').isDisabled(),true);
  assert.equal((await page.locator('#trainRefresh').textContent()).trim(),'Advance');
  assert.match(await page.locator('#trainBoard').textContent(),/Advance timetable/);
  assert.match(await page.locator('#trainBoard').textContent(),/Exact future train times need the scheduled timetable feed/i);
  assert.equal(await page.evaluate(()=>localStorage.getItem('kerbside.rail.travel-date.v1')),FUTURE_DATE);

  await page.click('#trainJourneyGo');
  await page.waitForFunction(()=>/Advance journey ready/i.test(document.getElementById('trainPlannerMessage')?.textContent||''));
  assert.doesNotMatch(await page.locator('#trainPlannerMessage').textContent(),/Live journey loaded/i);
  assert.equal(departureRequestCount(diagnostics),liveRequestsBeforeFuture,
    `future Find trains must not request today's live departures: ${JSON.stringify(diagnostics.requests)}`);
  assert.equal(await page.locator('#trainStationName').textContent(),'Birmingham New Street → Bristol Temple Meads');

  await page.click('#trainTravelToday');
  await page.waitForFunction(()=>document.getElementById('trainTravelDateMeta')?.dataset.mode === 'live');
  assert.match(await page.locator('#trainTravelDateMeta').textContent(),/live departures.*live-adjusted/i);
  await waitForServiceCount(page,1);

  assert.equal(await page.locator('.train-service').count(),1);
  assert.match(await page.locator('.train-service').first().textContent(),/Plymouth/,
    'a through train should remain visible when it calls at the selected destination');
  assert.doesNotMatch(await page.locator('#trainBoard').textContent(),/Liverpool Lime Street/);
  assert.match(await page.locator('#trainJourneySummary').textContent(),/BHM → BRI/);
  assert.match(await page.locator('#trainJourneySummary').textContent(),/Direct trains to Bristol Temple Meads only/);

  const stored = await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.route.v1') || 'null'));
  assert.deepEqual(stored,{fromCrs:'BHM',destination:{name:'Bristol Temple Meads',crs:'BRI'}});

  const directRequestsBeforeReload = diagnostics.requests.filter(item=>item === '/departures/BHM/to/BRI/9').length;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#trainDestinationQuery');
  await waitForServiceCount(page,1);
  await page.waitForFunction(()=>document.getElementById('trainDestinationQuery')?.value === 'Bristol Temple Meads');
  const directRequestsAfterReload = diagnostics.requests.filter(item=>item === '/departures/BHM/to/BRI/9').length;
  assert.ok(directRequestsAfterReload > directRequestsBeforeReload,'saved route should restore the direct board after reload');
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');

  await page.click('#trainDestinationClear');
  await waitForServiceCount(page,2);
  assert.match(await page.locator('#trainBoard').textContent(),/Liverpool Lime Street/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('kerbside.rail.route.v1')),null);
  assert.match(await page.locator('#trainJourneySummary').textContent(),/Showing all upcoming trains/);

  assert.deepEqual(diagnostics.pageErrors,[],`Unexpected page errors: ${diagnostics.pageErrors.join('\n')}`);
  await page.close();
}

async function runMobile(browser){
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const diagnostics = attachDiagnostics(page);
  await mockExternal(page,diagnostics);
  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  await page.waitForSelector('#trainDestinationQuery');
  await page.waitForSelector('#trainJourneyGo');
  await selectBirmingham(page);
  await selectBristol(page,diagnostics);

  const destinationBox = await page.locator('.train-destination-wrap').boundingBox();
  assert.ok(destinationBox,'destination controls should be visible on mobile');
  assert.ok(destinationBox.x >= -0.5 && destinationBox.x + destinationBox.width <= 390.5,
    `destination controls should fit the viewport: ${JSON.stringify(destinationBox)}`);

  const mobileLayout = await page.evaluate(()=>{
    const top=document.getElementById('topbar').getBoundingClientRect();
    const brand=document.querySelector('#topbar .brand').getBoundingClientRect();
    const mode=document.querySelector('#topbar .transport-switch').getBoundingClientRect();
    const settings=document.getElementById('setBtn').getBoundingClientRect();
    const planner=document.querySelector('.train-planner').getBoundingClientRect();
    const centres=[brand,mode,settings].map(rect=>rect.top+rect.height/2);
    return {
      topHeight:top.height,
      rowSpread:Math.max(...centres)-Math.min(...centres),
      ordered:brand.right<=mode.left+2&&mode.right<=settings.left+2,
      within:brand.left>=-0.5&&settings.right<=innerWidth+0.5,
      plannerHeight:planner.height,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
    };
  });
  assert.ok(mobileLayout.topHeight<105,`train header should stay compact: ${JSON.stringify(mobileLayout)}`);
  assert.ok(mobileLayout.rowSpread<=12,`brand, mode and settings should share a row: ${JSON.stringify(mobileLayout)}`);
  assert.ok(mobileLayout.ordered&&mobileLayout.within,`train header controls should not overlap: ${JSON.stringify(mobileLayout)}`);
  assert.ok(mobileLayout.plannerHeight<440,`journey planner should not dominate the phone viewport: ${JSON.stringify(mobileLayout)}`);
  assert.ok(mobileLayout.overflow<=1,`mobile route filter should not overflow: ${JSON.stringify(mobileLayout)}`);

  const liveRequestsBeforeFuture = departureRequestCount(diagnostics);
  await page.locator('#trainTravelDate').fill(TOMORROW);
  await page.locator('#trainTravelDate').dispatchEvent('change');
  await page.waitForSelector('#trainBoard .train-future-card');
  await page.click('#trainJourneyGo');
  await page.waitForFunction(()=>/Advance journey ready/i.test(document.getElementById('trainPlannerMessage')?.textContent||''));
  assert.equal(departureRequestCount(diagnostics),liveRequestsBeforeFuture);
  assert.match(await page.locator('#trainStationName').textContent(),/Birmingham New Street → Bristol Temple Meads/);
  assert.doesNotMatch(await page.locator('#trainBoard').textContent(),/Choose a station/);

  assert.deepEqual(diagnostics.pageErrors,[],`Unexpected mobile page errors: ${diagnostics.pageErrors.join('\n')}`);
  await page.close();
}

let browser;
try{
  browser = await browserType.launch({headless:true});
  await runDesktop(browser);
  await runMobile(browser);
  console.log(`Kerbside train From → To, future-date and mobile layout regression passed in ${browserName}.`);
}finally{
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
