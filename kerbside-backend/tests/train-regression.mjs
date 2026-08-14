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

let nrccProbeRequests = 0;
const stationResults = [
  {stationName:'Bristol Temple Meads', crsCode:'BRI'},
  {stationName:'Bristol Parkway', crsCode:'BPW'}
];
const board = {
  generatedAt:'2026-08-10T11:50:00Z',
  locationName:'Bristol Temple Meads',
  crs:'BRI',
  /* National Rail publishes NRCC messages as HTML and the rail provider is a
     community-hosted proxy, so this text is untrusted. Extracting it by
     assigning innerHTML to a detached div was not inert — the handler ran and
     the image was fetched from a node never added to the document. */
  nrccMessages:[{value:'<b>Test disruption</b> affecting one route.<img src="/__nrcc_probe.png" onerror="window.__NRCC_HANDLER_RAN=1">'}],
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

async function mockExternal(page, diagnostics){
  await page.route('**/__nrcc_probe.png', route=>{ nrccProbeRequests++; return route.fulfill({status:404,body:''}); });
  await page.route('**://huxley2.azurewebsites.net/**', async route=>{
    const url = new URL(route.request().url());
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/,'') || '/';
    diagnostics.huxley.push(pathname);
    if(pathname.startsWith('/crs/')){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stationResults)});
      return;
    }
    if(pathname === '/departures/BRI/20' || pathname === '/departures/BRI/9'){
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
  });
}

function attachDiagnostics(page){
  const diagnostics = {pageErrors:[], consoleErrors:[], huxley:[]};
  page.on('pageerror', error=>diagnostics.pageErrors.push(String(error && error.stack || error)));
  page.on('console', message=>{
    if(message.type()==='error') diagnostics.consoleErrors.push(message.text());
  });
  return diagnostics;
}

async function waitForServices(page, diagnostics){
  try{
    await page.waitForSelector('.train-service', {timeout:10000});
  }catch(error){
    const snapshot = await page.evaluate(()=>({
      mode:document.body.dataset.transport || '',
      station:document.getElementById('trainStationName')?.textContent || '',
      board:document.getElementById('trainBoard')?.textContent || '',
      trainState:window.__KERBSIDE_TRAINS__ ? {
        mode:window.__KERBSIDE_TRAINS__.state.mode,
        station:window.__KERBSIDE_TRAINS__.state.station,
        services:window.__KERBSIDE_TRAINS__.state.services.length
      } : null
    }));
    throw new Error(`Train services did not render. Huxley requests=${JSON.stringify(diagnostics.huxley)} pageErrors=${JSON.stringify(diagnostics.pageErrors)} consoleErrors=${JSON.stringify(diagnostics.consoleErrors)} snapshot=${JSON.stringify(snapshot)}`, {cause:error});
  }
}

async function assertCrowdingBaselineModel(page){
  const result = await page.evaluate(()=>{
    const api = window.__KERBSIDE_TRAINS__;
    const referenceDate = new Date('2026-08-10T07:30:00Z');
    const station = {name:'Bristol Temple Meads',crs:'BRI'};
    api.state.crowdingModel = {version:3,profiles:{},patternProfiles:{},seen:{},feedbackSeen:{}};

    const pressured = [
      {
        origin:[{locationName:'Bath Spa',crs:'BTH'}],
        destination:[{locationName:'Cardiff Central',crs:'CDF'}],
        serviceIdUrlSafe:'PRESSURE-CANCELLED',std:'08:00',etd:'Cancelled',
        operator:'Great Western Railway',operatorCode:'GW',length:9,isCancelled:true
      },
      {
        origin:[{locationName:'Bath Spa',crs:'BTH'}],
        destination:[{locationName:'Cardiff Central',crs:'CDF'}],
        serviceIdUrlSafe:'PRESSURE-NOW',std:'08:30',etd:'08:50',
        operator:'Great Western Railway',operatorCode:'GW',length:3,isCancelled:false
      },
      {
        origin:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
        destination:[{locationName:'Cardiff Central',crs:'CDF'}],
        serviceIdUrlSafe:'PRESSURE-NEXT',std:'09:00',etd:'On time',
        operator:'Great Western Railway',operatorCode:'GW',length:9,isCancelled:false
      }
    ];
    const quiet = [
      {
        origin:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
        destination:[{locationName:'Weston-super-Mare',crs:'WSM'}],
        serviceIdUrlSafe:'QUIET-PREV',std:'10:45',etd:'On time',
        operator:'Great Western Railway',operatorCode:'GW',length:9,isCancelled:false
      },
      {
        origin:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
        destination:[{locationName:'Weston-super-Mare',crs:'WSM'}],
        serviceIdUrlSafe:'QUIET-NOW',std:'11:00',etd:'On time',
        operator:'Great Western Railway',operatorCode:'GW',length:9,isCancelled:false
      }
    ];

    const pressuredForecast = api.crowdingForecast(pressured[1],1,pressured,{station,referenceDate,messages:[]});
    const quietForecast = api.crowdingForecast(quiet[1],1,quiet,{station,referenceDate,messages:[]});

    api.state.crowdingModel.profiles['bri|gw|cdf|weekday|4'] = {
      samples:12,
      lengthSamples:10,avgLength:9,
      headwaySamples:10,avgHeadway:15,
      delaySamples:10,avgDelay:4,
      cancelledSamples:12,cancelledCount:1,
      feedbackCount:5,feedbackMean:4.45,
      updatedAt:Date.now()
    };
    const learnedForecast = api.crowdingForecast(pressured[1],1,pressured,{station,referenceDate,messages:[]});
    return {modelVersion:api.modelVersion,pressuredForecast,quietForecast,learnedForecast};
  });

  assert.equal(result.modelVersion,3);
  assert.equal(result.pressuredForecast.level,'very-busy');
  assert.equal(result.quietForecast.level,'quiet');
  assert.ok(result.pressuredForecast.score > result.quietForecast.score + 2.5,
    `pressure scenario should score materially above quiet scenario: ${JSON.stringify(result)}`);
  assert.equal(result.learnedForecast.feedbackSamples,5);
  assert.match(result.learnedForecast.confidence,/Medium/);
  assert.ok(result.learnedForecast.reasons.some(reason=>/local crowding feedback|local history/.test(reason)),
    `learned forecast should explain historical calibration: ${JSON.stringify(result.learnedForecast)}`);
}

/* Read the body while the request timer is still armed. fetch settles on the
   response headers, so clearing the timeout there left every body downloading
   untimed: a provider that answered and then stalled mid-JSON hung the caller
   for good — measured still hanging four seconds after a one-second timeout. */
{
  const trains = await fs.readFile(path.join(repoRoot,'kerbside-trains.js'),'utf8');
  const routes = await fs.readFile(path.join(repoRoot,'kerbside-train-routes.js'),'utf8');
  const planner = await fs.readFile(path.join(repoRoot,'kerbside-journey-planner-core.js'),'utf8');
  for(const [name,source] of [['kerbside-trains.js',trains],['kerbside-train-routes.js',routes],['kerbside-journey-planner-core.js',planner]]){
    assert.match(source, /const body\s*=\s*await response\.arrayBuffer\(\);/, `${name} must read the body inside the timeout`);
    assert.match(source, /new Response\(empty\?null:body/, `${name} must hand back an equivalent response`);
    assert.doesNotMatch(source, /\.finally\(\(\)=>\{ clearTimeout\(timeout\); if\(detach\) detach\(\); \}\)/,
      `${name} must not disarm its timer on the response headers`);
  }
  assert.match(trains, /const HTML_TEXT_PARSER = typeof DOMParser === 'function'/);
  assert.match(trains, /HTML_TEXT_PARSER\.parseFromString\(raw,'text\/html'\)/);
  assert.doesNotMatch(trains, /div\.innerHTML = String\(value \|\| ''\);/,
    'NRCC text must not be parsed by assigning innerHTML to a detached div');
}

async function runDesktop(browser){
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  const diagnostics = attachDiagnostics(page);
  await mockExternal(page, diagnostics);
  await page.goto(`http://127.0.0.1:${port}/bus.html`, {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  assert.equal(await page.locator('body').getAttribute('data-transport'),'train');
  assert.equal(await page.locator('#transportTrain').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#trainMain').getAttribute('aria-hidden'),'false');
  assert.equal(await page.locator('#main').evaluate(el=>getComputedStyle(el).display),'none');

  await page.fill('#trainStationQuery','bris');
  await page.waitForSelector('#trainSuggest button');
  assert.match(await page.locator('#trainSuggest').textContent(),/Bristol Temple Meads/);

  await page.fill('#trainStationQuery','BRI');
  // The combined planner hides the legacy origin button from users, but the
  // underlying station-only board API remains available for this focused test.
  await page.evaluate(()=>document.getElementById('trainStationGo').click());
  await waitForServices(page, diagnostics);
  assert.equal(await page.locator('#trainStationName').textContent(),'Bristol Temple Meads');

  /* The provider's NRCC message still reads correctly, but nothing inside it
     may execute or fetch on the way to becoming text. */
  const nrcc = await page.evaluate(async ()=>{
    await new Promise(resolve=>setTimeout(resolve,400));
    const alerts=document.getElementById('trainAlerts');
    return {
      text:(alerts?alerts.textContent:'').replace(/\s+/g,' ').trim(),
      html:alerts?alerts.innerHTML:'',
      handlerRan:!!window.__NRCC_HANDLER_RAN
    };
  });
  assert.equal(nrcc.handlerRan,false,'NRCC message markup must never execute a handler');
  assert.equal(nrccProbeRequests,0,`NRCC message markup must never issue a request, saw ${nrccProbeRequests}`);
  assert.match(nrcc.text,/Test disruption affecting one route\./,'the message must still read as plain text');
  assert.doesNotMatch(nrcc.html,/<img/i,'the alert must not re-emit provider markup');
  const firstServiceText = await page.locator('.train-service').first().textContent();
  assert.match(firstServiceText,/Cardiff Central/);
  assert.match(firstServiceText,/Quiet|Moderate|Busy|Very busy/);
  assert.match(firstServiceText,/forecast v4/i);
  assert.equal(await page.evaluate(()=>window.__KERBSIDE_FORECAST_V4__?.version),4);
  const providerNote = await page.locator('.train-provider-note').textContent();
  assert.match(providerNote,/official National Rail Darwin data via Rail Data Marketplace/i);
  assert.match(providerNote,/Huxley community services as a resilience fallback/i);
  assert.match(providerNote,/Kerbside's forecast, not live occupancy/i);
  assert.match(await page.locator('#trainAlerts').textContent(),/Test disruption/);

  await page.locator('.train-service-summary').first().click();
  await page.waitForSelector('.train-call');
  const detailText = await page.locator('.train-service-detail').first().textContent();
  assert.match(detailText,/Bath Spa/);
  assert.match(detailText,/Passenger-submitted crowding reports do not affect the score/i);
  assert.match(detailText,/Record actual crowding/i);

  const feedbackButton = page.locator('[data-crowd-feedback="busy"]').first();
  await feedbackButton.click();
  await page.waitForFunction(()=>document.querySelector('.train-service-detail')?.textContent?.includes('Saved locally: Busy'));
  const feedbackStore = await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.crowding.v2') || '{}'));
  assert.equal(feedbackStore.version,3);
  assert.equal(typeof feedbackStore.patternProfiles,'object');
  assert.equal(Object.keys(feedbackStore.feedbackSeen || {}).length,1);

  await assertCrowdingBaselineModel(page);

  await page.click('#transportBus');
  assert.equal(await page.locator('body').getAttribute('data-transport'),'bus');
  assert.notEqual(await page.locator('#main').evaluate(el=>getComputedStyle(el).display),'none');
  assert.deepEqual(diagnostics.pageErrors, [], `Unexpected page errors: ${diagnostics.pageErrors.join('\n')}`);
  await page.close();
}

async function runMobile(browser){
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const diagnostics = attachDiagnostics(page);
  await mockExternal(page, diagnostics);
  await page.goto(`http://127.0.0.1:${port}/bus.html`, {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  const box = await page.locator('.transport-switch').boundingBox();
  assert.ok(box, 'transport toggle must be visible');
  assert.ok(box.x + box.width <= 390.5, 'transport toggle must fit the mobile header');
  assert.ok(box.y < 100, 'transport toggle should remain in the top header row');
  await page.click('#transportTrain');
  assert.equal(await page.locator('#trainMain').evaluate(el=>getComputedStyle(el).display),'flex');
  await page.fill('#trainStationQuery','BRI');
  await page.evaluate(()=>document.getElementById('trainStationGo').click());
  await waitForServices(page, diagnostics);
  await page.locator('.train-service-summary').first().click();
  await page.waitForSelector('.train-feedback');
  const feedbackOverflow = await page.locator('.train-feedback').evaluate(el=>el.scrollWidth-el.clientWidth);
  assert.ok(feedbackOverflow <= 1, `crowding feedback controls should wrap without overflow; got ${feedbackOverflow}px`);
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `mobile layout should not horizontally overflow; got ${overflow}px`);
  assert.deepEqual(diagnostics.pageErrors, [], `Unexpected mobile page errors: ${diagnostics.pageErrors.join('\n')}`);
  await page.close();
}

let browser;
try{
  browser = await browserType.launch({headless:true});
  await runDesktop(browser);
  await runMobile(browser);
  console.log(`Kerbside train crowding model v2 regression passed in ${browserName}.`);
}finally{
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
