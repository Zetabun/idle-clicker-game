#!/usr/bin/env python3
from pathlib import Path
import json

package_path=Path('kerbside-backend/package.json')
package=json.loads(package_path.read_text(encoding='utf-8'))

# The pre-0.7.39 route-filter and journey-planner browser scripts assert the
# retired live-board takeover UI (and even query the retired .train-route-planner
# class). Keep them syntax checked for archaeology, but replace their runtime
# role with a deterministic dual-timetable browser flow matching the production
# architecture now on main.
package['scripts']['test:train-route']=(
    'node tests/train-browser-core-regression.mjs && '
    'node tests/train-provider-timeout-regression.mjs && '
    'node tests/train-mobile-layout-regression.mjs'
)
check=package['scripts']['check']
if 'tests/train-browser-core-regression.mjs' not in check:
    check += ' && node --check tests/train-browser-core-regression.mjs'
package['scripts']['check']=check
package_path.write_text(json.dumps(package,indent=2)+'\n',encoding='utf-8')

core=r'''import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const browserName=(process.env.KERBSIDE_BROWSER||'webkit').toLowerCase();
const browserType=browserName==='chromium'?chromium:webkit;

function londonStamp(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function addDays(stamp,days){
  const [year,month,day]=stamp.split('-').map(Number);
  return new Date(Date.UTC(year,month-1,day+days,12)).toISOString().slice(0,10);
}
const TODAY=londonStamp();
const TOMORROW=addDays(TODAY,1);

const manifest={
  schema:1,source:'National Rail Darwin Timetable Files',timetableId:`${TODAY.replaceAll('-','')}020500`,
  dates:[TODAY,TOMORROW],
  coverage:{
    [TODAY]:{from:'00:01',to:'23:59',partial:false},
    [TOMORROW]:{from:'00:01',to:'23:59',partial:false}
  },
  tocNames:{XC:'CrossCountry'}
};
const locations={
  BHM:['Birmingham New Street','BHAMNWS',''],
  BRI:['Bristol Temple Meads','BRSTLTM','']
};
function rowsFor(date){return [
  [`rid-forward-${date}`,`uid-forward-${date}`,'1A01','XC',date,[['BHM','','10:42','7',0],['BRI','12:07','','3',0]]],
  [`rid-reverse-${date}`,`uid-reverse-${date}`,'1A02','XC',date,[['BRI','','10:50','3',0],['BHM','12:15','','7',0]]]
];}
const gz={
  [TODAY]:gzipSync(Buffer.from(JSON.stringify(rowsFor(TODAY)))),
  [TOMORROW]:gzipSync(Buffer.from(JSON.stringify(rowsFor(TOMORROW))))
};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml; charset=utf-8','.woff2':'font/woff2'};

const server=http.createServer(async(req,res)=>{
  try{
    const raw=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(raw==='/kerbside-rail-timetable/manifest.json'){
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(manifest));return;
    }
    if(raw==='/kerbside-rail-timetable/locations.json'){
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(locations));return;
    }
    const dateMatch=raw.match(/^\/kerbside-rail-timetable\/(\d{4}-\d{2}-\d{2})\.json\.gz$/);
    if(dateMatch&&gz[dateMatch[1]]){
      res.writeHead(200,{'content-type':'application/gzip','cache-control':'no-store'});res.end(gz[dateMatch[1]]);return;
    }
    const rel=raw==='/'?'/bus.html':raw;
    const target=path.resolve(root,'.'+rel);
    if(!target.startsWith(root+path.sep))throw new Error('outside root');
    const body=await fs.readFile(target);
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
  }catch(error){res.writeHead(404,{'content-type':'text/plain'});res.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();

const stations=[
  {stationName:'Birmingham New Street',crsCode:'BHM'},
  {stationName:'Bristol Temple Meads',crsCode:'BRI'}
];
const liveBoard=(crs)=>({
  generatedAt:new Date().toISOString(),locationName:crs==='BRI'?'Bristol Temple Meads':'Birmingham New Street',crs,nrccMessages:[],
  trainServices:crs==='BRI'?[{
    origin:[{locationName:'Bristol Temple Meads',crs:'BRI'}],destination:[{locationName:'Birmingham New Street',crs:'BHM'}],
    serviceIdUrlSafe:'live-reverse',std:'10:50',etd:'On time',platform:'3',operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
  }]:[{
    origin:[{locationName:'Birmingham New Street',crs:'BHM'}],destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
    serviceIdUrlSafe:'live-forward',std:'10:42',etd:'On time',platform:'7',operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
  }]
});

async function mockExternal(page,diagnostics){
  const rail=async route=>{
    const url=new URL(route.request().url()),pathname=decodeURIComponent(url.pathname).replace(/\/+$/,'')||'/';
    diagnostics.railRequests.push(pathname+url.search);
    if(pathname.startsWith('/crs/')){
      const q=pathname.slice(5).toLowerCase();
      const rows=stations.filter(item=>item.stationName.toLowerCase().includes(q)||item.crsCode.toLowerCase()===q);
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows.length?rows:stations)});return;
    }
    const match=pathname.match(/^\/departures\/([A-Z0-9]{3})(?:\/to\/[A-Z0-9]{3})?\/\d+$/i);
    if(match){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(liveBoard(match[1].toUpperCase()))});return;}
    if(pathname.startsWith('/service/')){await route.fulfill({status:200,contentType:'application/json',body:'{}'});return;}
    if(pathname==='/health'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,ldbConfigured:true,bods:true,version:'test'})});return;}
    await route.fulfill({status:404,contentType:'application/json',body:'{}'});
  };
  await page.route('**://huxley2.azurewebsites.net/**',rail);
  await page.route('**://hux.azurewebsites.net/**',rail);
  await page.route('**://kerbside-rail.adambullas.workers.dev/**',rail);
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)(?!huxley2\.azurewebsites\.net)(?!hux\.azurewebsites\.net)(?!kerbside-rail\.adambullas\.workers\.dev)/,route=>route.abort());
}

async function waitRoute(page,from,to){
  await page.waitForFunction(({from,to})=>{
    const trains=window.__KERBSIDE_TRAINS__,routes=window.__KERBSIDE_TRAIN_ROUTES__;
    return String(trains?.state?.station?.crs||'').toUpperCase()===from
      && String(routes?.state?.fromCrs||'').toUpperCase()===from
      && String(routes?.state?.destination?.crs||'').toUpperCase()===to;
  },{from,to},{timeout:10000});
}
async function findJourney(page,from,to){
  await page.fill('#trainStationQuery',from);
  await page.fill('#trainDestinationQuery',to);
  await page.click('#trainJourneyGo');
  await waitRoute(page,from,to);
  await page.waitForFunction(()=>document.querySelectorAll('#trainScheduledBoard .train-scheduled-service').length>0,null,{timeout:10000});
}

let browser;
try{
  browser=await browserType.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const diagnostics={pageErrors:[],railRequests:[]};
  page.on('pageerror',error=>diagnostics.pageErrors.push(String(error&&error.stack||error)));
  await page.addInitScript(today=>{
    localStorage.setItem('kerbside.rail.travel-date.v1',today);
    localStorage.setItem('kerbside.rail.depart-after.v1','09:00');
    localStorage.removeItem('kerbside.rail.route.v1');
  },TODAY);
  await mockExternal(page,diagnostics);
  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  await page.waitForSelector('#trainPlanner');

  const visibleFind=await page.locator('.train-planner button').evaluateAll(buttons=>buttons.filter(button=>{
    const style=getComputedStyle(button),box=button.getBoundingClientRect();
    return /find trains/i.test(button.textContent||'')&&style.display!=='none'&&Number(style.opacity)>0&&box.width>2&&box.height>2;
  }).map(button=>(button.textContent||'').trim()));
  assert.deepEqual(visibleFind,['Find trains'],'combined planner should expose one visible journey action');

  await findJourney(page,'BHM','BRI');
  assert.equal((await page.locator('#trainStationName').textContent()).trim(),'Birmingham New Street → Bristol Temple Meads');
  assert.equal(await page.locator('#trainScheduledBoard .train-scheduled-service').count(),1);
  assert.match(await page.locator('#trainScheduledBoard .train-scheduled-service').first().textContent(),/10:42/);
  assert.match(await page.locator('#trainScheduledBoard .train-scheduled-service').first().textContent(),/Bristol Temple Meads/);
  assert.equal(await page.locator('#trainScheduledBoard .train-service-date').count(),0,'today must not repeat the date on each row');

  // Open a forecast card through the real delegated summary handler.
  await page.locator('#trainScheduledBoard [data-scheduled-toggle]').first().click();
  const detail=page.locator('#trainScheduledBoard .train-service-detail').first();
  await detail.waitFor({state:'visible'});
  assert.match(await detail.textContent(),/Forecast v3|Why this forecast/i);

  // Swap and swap back through the visible mobile control. The route must stay
  // internally complete after each transition, which protects the 0.7.43 fix.
  await page.click('#trainRouteSwap');
  await waitRoute(page,'BRI','BHM');
  assert.equal(await page.locator('#trainStationQuery').inputValue(),'Bristol Temple Meads');
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Birmingham New Street');
  await page.waitForFunction(()=>document.querySelectorAll('#trainScheduledBoard .train-scheduled-service').length===1);

  await page.click('#trainRouteSwap');
  await waitRoute(page,'BHM','BRI');
  assert.equal(await page.locator('#trainStationQuery').inputValue(),'Birmingham New Street');
  assert.equal(await page.locator('#trainDestinationQuery').inputValue(),'Bristol Temple Meads');

  // Tomorrow uses the same timetable spine, does not need a live board request,
  // and every future row carries the selected date added in 0.7.45.
  const liveBefore=diagnostics.railRequests.filter(value=>value.startsWith('/departures/')).length;
  await page.locator('#trainTravelDate').fill(TOMORROW);
  await page.locator('#trainTravelDate').dispatchEvent('change');
  await page.waitForFunction(()=>document.getElementById('trainTravelDateMeta')?.dataset.mode==='planning');
  await page.click('#trainJourneyGo');
  await page.waitForFunction(()=>/Advance journey ready/i.test(document.getElementById('trainPlannerMessage')?.textContent||''));
  await page.waitForFunction(()=>document.querySelectorAll('#trainScheduledBoard .train-scheduled-service').length===1);
  const liveAfter=diagnostics.railRequests.filter(value=>value.startsWith('/departures/')).length;
  assert.equal(liveAfter,liveBefore,'future timetable search must not request a live departure board');
  const futureDate=(await page.locator('#trainScheduledBoard .train-service-date').first().textContent()).trim();
  assert.match(futureDate,/\d{1,2} [A-Z][a-z]{2}/);
  assert.equal(await page.locator('#trainScheduledBoard .train-service-date').count(),1);

  // Return to today and ensure the same complete route survives the mode switch.
  await page.click('#trainTravelToday');
  await page.waitForFunction(()=>document.getElementById('trainTravelDateMeta')?.dataset.mode==='live');
  await waitRoute(page,'BHM','BRI');
  await page.waitForFunction(()=>document.querySelectorAll('#trainScheduledBoard .train-scheduled-service').length===1);

  const layout=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    planner:document.getElementById('trainPlanner')?.getBoundingClientRect().height||0,
    top:document.getElementById('topbar')?.getBoundingClientRect().height||0
  }));
  assert.ok(layout.overflow<=1,`core train flow must not create horizontal overflow: ${JSON.stringify(layout)}`);
  assert.ok(layout.planner>0&&layout.planner<520,`combined planner should remain usable on mobile: ${JSON.stringify(layout)}`);
  assert.ok(layout.top<110,`train header should stay compact: ${JSON.stringify(layout)}`);
  assert.deepEqual(diagnostics.pageErrors,[],`unexpected page errors: ${diagnostics.pageErrors.join('\n')}`);

  console.log(`Kerbside dual-timetable core browser regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
'''
Path('kerbside-backend/tests/train-browser-core-regression.mjs').write_text(core,encoding='utf-8')
print('Installed current dual-timetable browser regression coverage for Kerbside 0.7.46.')
