import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const browserName = (process.env.KERBSIDE_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;

const mime = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2'
};

const server = http.createServer(async (req,res)=>{
  try{
    const raw = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const rel = raw === '/' ? '/bus.html' : raw;
    const target = path.resolve(repoRoot, '.' + rel);
    if(!target.startsWith(repoRoot + path.sep)) throw new Error('outside root');
    const body = await fs.readFile(target);
    res.writeHead(200, {'content-type':mime[path.extname(target)] || 'application/octet-stream'});
    res.end(body);
  }catch(error){
    res.writeHead(404, {'content-type':'text/plain; charset=utf-8'});
    res.end('not found');
  }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port} = server.address();

const stationResults = [
  {stationName:'Bristol Temple Meads', crsCode:'BRI'},
  {stationName:'Bristol Parkway', crsCode:'BPW'}
];
const board = {
  generatedAt:'2026-08-10T11:50:00Z',
  locationName:'Bristol Temple Meads',
  crs:'BRI',
  nrccMessages:[{value:'<b>Test disruption</b> affecting one route.'}],
  trainServices:[
    {
      origin:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
      destination:[{locationName:'Cardiff Central',crs:'CDF'}],
      serviceIdUrlSafe:'SVC1', std:'12:10', etd:'12:18', platform:'5',
      operator:'Great Western Railway', operatorCode:'GW', length:3,
      isCancelled:false
    },
    {
      origin:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
      destination:[{locationName:'London Paddington',crs:'PAD'}],
      serviceIdUrlSafe:'SVC2', std:'12:20', etd:'On time', platform:'13',
      operator:'Great Western Railway', operatorCode:'GW', length:9,
      isCancelled:false
    }
  ]
};
const serviceDetail = {
  previousCallingPoints:[],
  subsequentCallingPoints:[{
    callingPoint:[
      {locationName:'Bath Spa',crs:'BTH',st:'12:24',et:'12:25',isCancelled:false},
      {locationName:'Chippenham',crs:'CPM',st:'12:37',et:'On time',isCancelled:false},
      {locationName:'Cardiff Central',crs:'CDF',st:'13:02',et:'On time',isCancelled:false}
    ]
  }]
};

async function mockExternal(page){
  await page.route('https://**', async route=>{
    const url = new URL(route.request().url());
    if(url.hostname === 'huxley2.azurewebsites.net'){
      const pathname = decodeURIComponent(url.pathname);
      if(pathname.startsWith('/crs/')){
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stationResults)});
        return;
      }
      if(pathname === '/departures/BRI/20'){
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(board)});
        return;
      }
      if(pathname === '/service/SVC1'){
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(serviceDetail)});
        return;
      }
      if(pathname === '/service/SVC2'){
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({})});
        return;
      }
      await route.fulfill({status:404,contentType:'application/json',body:'{}'});
      return;
    }
    await route.abort();
  });
}

async function runDesktop(browser){
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  await mockExternal(page);
  await page.goto(`http://127.0.0.1:${port}/bus.html`, {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  assert.equal(await page.locator('body').getAttribute('data-transport'),'train');
  assert.equal(await page.locator('#transportTrain').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#trainMain').getAttribute('aria-hidden'),'false');
  assert.equal(await page.locator('#main').evaluate(el=>getComputedStyle(el).display),'none');

  await page.fill('#trainStationQuery','bris');
  await page.waitForSelector('#trainSuggest button');
  await page.locator('#trainSuggest button').first().click();
  await page.waitForSelector('.train-service');
  assert.equal(await page.locator('#trainStationName').textContent(),'Bristol Temple Meads');
  assert.match(await page.locator('.train-service').first().textContent(),/Cardiff Central/);
  assert.match(await page.locator('.train-service').first().textContent(),/Expected/);
  assert.match(await page.locator('.train-provider-note').textContent(),/not ticket-sales data and not live occupancy/i);
  assert.match(await page.locator('#trainAlerts').textContent(),/Test disruption/);

  await page.locator('.train-service-summary').first().click();
  await page.waitForSelector('.train-call');
  assert.match(await page.locator('.train-service-detail').first().textContent(),/Bath Spa/);
  assert.match(await page.locator('.train-service-detail').first().textContent(),/does not use ticket sales/i);

  await page.click('#transportBus');
  assert.equal(await page.locator('body').getAttribute('data-transport'),'bus');
  assert.notEqual(await page.locator('#main').evaluate(el=>getComputedStyle(el).display),'none');
  await page.close();
}

async function runMobile(browser){
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await mockExternal(page);
  await page.goto(`http://127.0.0.1:${port}/bus.html`, {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  const box = await page.locator('.transport-switch').boundingBox();
  assert.ok(box, 'transport toggle must be visible');
  assert.ok(box.x + box.width <= 390.5, 'transport toggle must fit the mobile header');
  assert.ok(box.y < 100, 'transport toggle should remain in the top header row');
  await page.click('#transportTrain');
  assert.equal(await page.locator('#trainMain').evaluate(el=>getComputedStyle(el).display),'flex');
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `mobile layout should not horizontally overflow; got ${overflow}px`);
  await page.close();
}

let browser;
try{
  browser = await browserType.launch({headless:true});
  await runDesktop(browser);
  await runMobile(browser);
  console.log(`Kerbside train regression passed in ${browserName}.`);
}finally{
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
