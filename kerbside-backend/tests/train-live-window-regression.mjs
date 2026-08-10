import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const here=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(here,'..','..');
const browserName=(process.env.KERBSIDE_BROWSER||'webkit').toLowerCase();
const browserType=browserName==='chromium'?chromium:webkit;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml; charset=utf-8','.woff2':'font/woff2'};

const server=http.createServer(async(req,res)=>{
  try{
    const raw=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const rel=raw==='/'?'/bus.html':raw;
    const target=path.resolve(repoRoot,'.'+rel);
    if(!target.startsWith(repoRoot+path.sep))throw new Error('outside root');
    const body=await fs.readFile(target);
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'});
    res.end(body);
  }catch(error){res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();

const emptyBoard={generatedAt:'2026-08-11T00:16:00+01:00',locationName:'Birmingham Moor Street',crs:'BMO',nrccMessages:[],trainServices:[]};
const stations=[
  {stationName:'Birmingham Moor Street',crsCode:'BMO'},
  {stationName:'Bristol Parkway',crsCode:'BPW'}
];
function londonStamp(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
async function mockExternal(page,requests){
  const handle=async route=>{
    const url=new URL(route.request().url());
    requests.push(url.pathname+url.search);
    const pathname=decodeURIComponent(url.pathname).replace(/\/+$/,'')||'/';
    if(pathname.startsWith('/crs/')){
      const q=pathname.slice(5).toLowerCase();
      const rows=stations.filter(item=>item.stationName.toLowerCase().includes(q)||item.crsCode.toLowerCase()===q);
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows.length?rows:stations)});return;
    }
    if(pathname==='/departures/BMO/20'||pathname==='/departures/BMO/to/BPW/20'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(emptyBoard)});return;
    }
    if(pathname.startsWith('/service/')){await route.fulfill({status:200,contentType:'application/json',body:'{}'});return;}
    await route.fulfill({status:404,contentType:'application/json',body:'{}'});
  };
  await page.route('**://huxley2.azurewebsites.net/**',handle);
  await page.route('**://hux.azurewebsites.net/**',handle);
}

async function run(browser){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const requests=[];
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error&&error.stack||error)));
  await page.addInitScript(today=>{
    localStorage.setItem('kerbside.rail.travel-date.v1',today);
    localStorage.removeItem('kerbside.rail.depart-after.v1');
    localStorage.removeItem('kerbside.rail.route.v1');
    localStorage.removeItem('kerbside.rail.v1');
  },londonStamp());
  await mockExternal(page,requests);
  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  await page.waitForFunction(()=>window.__KERBSIDE_TRAIN_LIVE_WINDOW__?.state?.installed===true);

  const pure=await page.evaluate(()=>({
    later:window.__KERBSIDE_TRAIN_LIVE_WINDOW__.liveWindowFor('09:00',16),
    near:window.__KERBSIDE_TRAIN_LIVE_WINDOW__.liveWindowFor('02:00',60),
    midnightDefault:window.__KERBSIDE_TRAIN_LIVE_WINDOW__.defaultDepartAfter(new Date('2026-08-10T23:16:00Z'))
  }));
  assert.equal(pure.later.mode,'planning','09:00 at 00:16 must not be treated as a live-board request');
  assert.equal(pure.near.mode,'live');
  assert.equal(pure.near.offset,60);
  assert.equal(pure.near.window,120);
  assert.equal(pure.midnightDefault,'00:30','blank same-day time should default near now, not 09:00');

  await page.fill('#trainStationQuery','BMO');
  await page.evaluate(()=>document.getElementById('trainStationGo').click());
  await page.waitForFunction(()=>window.__KERBSIDE_TRAINS__?.state?.station?.crs==='BMO');
  await page.fill('#trainDestinationQuery','BPW');
  await page.waitForSelector('#trainDestinationSuggest button');
  await page.locator('#trainDestinationSuggest button').filter({hasText:'Bristol Parkway'}).click();
  await page.waitForFunction(()=>window.__KERBSIDE_TRAIN_ROUTES__?.state?.destination?.crs==='BPW');

  // Empty live data must preserve the journey identity instead of leaving the
  // board header at its initial "Choose a station" state.
  await page.waitForFunction(()=>/No direct live departures|No live departures/.test(document.getElementById('trainBoard')?.textContent||''));
  assert.equal((await page.locator('#trainStationName').textContent()).trim(),'Birmingham Moor Street → Bristol Parkway');
  assert.doesNotMatch(await page.locator('#trainBoard').textContent(),/Choose a station/);
  assert.match(await page.locator('#trainBoard').textContent(),/No direct live departures in this window/i);

  // Reproduce the screenshot clock/time combination deterministically. Rendering
  // the same-day planning state must not issue a live board request or imply
  // that an empty Darwin window means there are no trains later today.
  const departuresBefore=requests.filter(value=>value.startsWith('/departures/')).length;
  await page.evaluate(()=>{
    const input=document.getElementById('trainDepartAfter');
    input.value='09:00';
    window.__KERBSIDE_TRAIN_LIVE_WINDOW__.renderSameDayPlanning(
      window.__KERBSIDE_TRAIN_LIVE_WINDOW__.liveWindowFor('09:00',16)
    );
  });
  assert.equal(requests.filter(value=>value.startsWith('/departures/')).length,departuresBefore);
  assert.equal((await page.locator('#trainStationName').textContent()).trim(),'Birmingham Moor Street → Bristol Parkway');
  assert.match(await page.locator('#trainBoard').textContent(),/Later today/i);
  assert.match(await page.locator('#trainBoard').textContent(),/Same-day timetable needed/i);
  assert.match(await page.locator('#trainBoard').textContent(),/scheduled timetable feed/i);
  assert.doesNotMatch(await page.locator('#trainBoard').textContent(),/Choose a station/);
  assert.deepEqual(errors,[],`Unexpected page errors: ${errors.join('\n')}`);
  await page.close();
}

let browser;
try{
  browser=await browserType.launch({headless:true});
  await run(browser);
  console.log(`Kerbside same-day live-window regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
