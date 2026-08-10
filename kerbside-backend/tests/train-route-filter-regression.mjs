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

const mime = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2'
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
  await page.route('**://huxley2.azurewebsites.net/**',async route=>{
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
    if(pathname === '/departures/BHM/20'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(allBoard)});
      return;
    }
    if(pathname === '/departures/BHM/to/BRI/20'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(directBoard)});
      return;
    }
    if(pathname.startsWith('/service/')){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({})});
      return;
    }
    await route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
}

async function waitForServiceCount(page,count){
  await page.waitForFunction(expected=>document.querySelectorAll('.train-service').length === expected,count,{timeout:10000});
}

async function selectBirmingham(page){
  await page.fill('#trainStationQuery','BHM');
  await page.click('#trainStationGo');
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
  assert.ok(diagnostics.requests.includes('/departures/BHM/to/BRI/20'),
    `expected direct Huxley request, got ${JSON.stringify(diagnostics.requests)}`);
}

async function runDesktop(browser){
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  const diagnostics = attachDiagnostics(page);
  await mockExternal(page,diagnostics);
  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  await page.waitForSelector('#trainDestinationQuery');

  assert.equal(await page.locator('label[for="trainStationQuery"]').textContent(),'From');
  assert.equal(await page.locator('label[for="trainDestinationQuery"]').textContent(),'To');
  assert.equal(await page.locator('#trainDestinationQuery').isDisabled(),true);

  await selectBirmingham(page);
  await selectBristol(page,diagnostics);

  assert.equal(await page.locator('.train-service').count(),1);
  assert.match(await page.locator('.train-service').first().textContent(),/Plymouth/,
    'a through train should remain visible when it calls at the selected destination');
  assert.doesNotMatch(await page.locator('#trainBoard').textContent(),/Liverpool Lime Street/);
  assert.match(await page.locator('#trainJourneySummary').textContent(),/BHM → BRI/);
  assert.match(await page.locator('#trainJourneySummary').textContent(),/Direct trains to Bristol Temple Meads only/);

  const stored = await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.route.v1') || 'null'));
  assert.deepEqual(stored,{fromCrs:'BHM',destination:{name:'Bristol Temple Meads',crs:'BRI'}});

  const directRequestsBeforeReload = diagnostics.requests.filter(item=>item === '/departures/BHM/to/BRI/20').length;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#trainDestinationQuery');
  await waitForServiceCount(page,1);
  await page.waitForFunction(()=>document.getElementById('trainDestinationQuery')?.value === 'Bristol Temple Meads');
  const directRequestsAfterReload = diagnostics.requests.filter(item=>item === '/departures/BHM/to/BRI/20').length;
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
  await selectBirmingham(page);
  await selectBristol(page,diagnostics);

  const destinationBox = await page.locator('.train-destination-wrap').boundingBox();
  assert.ok(destinationBox,'destination controls should be visible on mobile');
  assert.ok(destinationBox.x >= -0.5 && destinationBox.x + destinationBox.width <= 390.5,
    `destination controls should fit the viewport: ${JSON.stringify(destinationBox)}`);
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow <= 1,`mobile route filter should not overflow; got ${overflow}px`);
  assert.deepEqual(diagnostics.pageErrors,[],`Unexpected mobile page errors: ${diagnostics.pageErrors.join('\n')}`);
  await page.close();
}

let browser;
try{
  browser = await browserType.launch({headless:true});
  await runDesktop(browser);
  await runMobile(browser);
  console.log(`Kerbside train From → To route filter regression passed in ${browserName}.`);
}finally{
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
