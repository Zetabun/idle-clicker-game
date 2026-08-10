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
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml; charset=utf-8','.woff2':'font/woff2'};

const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const rel=pathname==='/'?'/bus.html':pathname;
    const target=path.resolve(root,'.'+rel);
    if(!target.startsWith(root+path.sep))throw new Error('outside root');
    const body=await fs.readFile(target);
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
    res.end(body);
  }catch(error){res.writeHead(404,{'content-type':'text/plain'});res.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();

const stations=[
  {stationName:'Birmingham New Street',crsCode:'BHM'},
  {stationName:'Bristol Temple Meads',crsCode:'BRI'}
];
const directBoard={
  generatedAt:'2026-08-10T20:30:00Z',locationName:'Birmingham New Street',crs:'BHM',nrccMessages:[],
  filterLocationName:'Bristol Temple Meads',filtercrs:'BRI',
  trainServices:[{
    origin:[{locationName:'Birmingham New Street',crs:'BHM'}],
    destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
    serviceIdUrlSafe:'BHM-BRI-LIVE',std:'21:45',etd:'On time',platform:'11A',
    operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
  }]
};
const allBoard={...directBoard,filterLocationName:null,filtercrs:null,trainServices:[
  directBoard.trainServices[0],
  {...directBoard.trainServices[0],serviceIdUrlSafe:'BHM-LIV',std:'21:50',destination:[{locationName:'Liverpool Lime Street',crs:'LIV'}]}
]};

const diagnostics={primary:[],fallback:[],pageErrors:[],consoleErrors:[]};
let browser;
try{
  browser=await browserType.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page.on('pageerror',error=>diagnostics.pageErrors.push(String(error&&error.stack||error)));
  page.on('console',message=>{if(message.type()==='error')diagnostics.consoleErrors.push(message.text());});

  await page.route('https://huxley2.azurewebsites.net/**',route=>{
    diagnostics.primary.push(new URL(route.request().url()).pathname);
    return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'synthetic primary outage'})});
  });
  await page.route('https://hux.azurewebsites.net/**',async route=>{
    const pathname=decodeURIComponent(new URL(route.request().url()).pathname).replace(/\/+$/,'')||'/';
    diagnostics.fallback.push(pathname);
    if(pathname.startsWith('/crs/')){
      const query=pathname.slice('/crs/'.length).toLowerCase();
      const result=stations.filter(item=>item.stationName.toLowerCase().includes(query)||item.crsCode.toLowerCase()===query);
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result.length?result:stations)});
    }
    if(pathname==='/departures/BHM/20')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(allBoard)});
    if(pathname==='/departures/BHM/to/BRI/20')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(directBoard)});
    if(pathname.startsWith('/service/'))return route.fulfill({status:200,contentType:'application/json',body:'{}'});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });

  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  await page.waitForSelector('#trainJourneyGo');

  assert.equal(await page.locator('#trainDestinationQuery').isDisabled(),false,'destination should be available as part of the same journey form');
  const findButtons=await page.locator('.train-route-planner button').evaluateAll(buttons=>buttons.filter(button=>{
    const style=getComputedStyle(button),box=button.getBoundingClientRect();
    return /find/i.test(button.textContent||'')&&style.display!=='none'&&Number(style.opacity)>0&&box.width>2&&box.height>2;
  }).map(button=>(button.textContent||'').trim()));
  assert.deepEqual(findButtons,['Find trains'],'the journey planner should expose one visible find action');

  await page.fill('#trainStationQuery','Birmingham New Street');
  assert.equal(await page.locator('#trainDestinationQuery').isDisabled(),false,'typing an origin must not disable destination entry');
  await page.fill('#trainDestinationQuery','Bristol Temple Meads');
  await page.click('#trainJourneyGo');
  await page.waitForFunction(()=>document.querySelectorAll('.train-service').length===1,{timeout:10000});

  assert.match(await page.locator('#trainBoard').textContent(),/Bristol Temple Meads/);
  assert.doesNotMatch(await page.locator('#trainBoard').textContent(),/Live train data unavailable/);
  assert.match(await page.locator('#trainJourneySummary').textContent(),/BHM → BRI/);
  assert.ok(diagnostics.primary.length>0,'primary Huxley endpoint should have been attempted');
  assert.ok(diagnostics.fallback.includes('/departures/BHM/to/BRI/20'),`fallback direct request missing: ${JSON.stringify(diagnostics)}`);
  const provider=await page.evaluate(()=>window.__KERBSIDE_RAIL_PROVIDER__&&({active:window.__KERBSIDE_RAIL_PROVIDER__.state.active,fallbacks:window.__KERBSIDE_RAIL_PROVIDER__.state.fallbacks,providers:window.__KERBSIDE_RAIL_PROVIDER__.providers}));
  assert.equal(provider.active,'https://hux.azurewebsites.net');
  assert.ok(provider.fallbacks>0);
  assert.deepEqual(provider.providers,['https://huxley2.azurewebsites.net','https://hux.azurewebsites.net']);

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=1,`combined train planner should not overflow mobile viewport; got ${overflow}px`);
  assert.deepEqual(diagnostics.pageErrors,[],`Unexpected page errors: ${diagnostics.pageErrors.join('\n')}`);
  console.log(`Kerbside combined train journey planner regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
