import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

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
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
    res.end(body);
  }catch(error){res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();

const board={generatedAt:'2026-08-11T15:15:00+01:00',locationName:'Birmingham New Street',crs:'BHM',nrccMessages:[],trainServices:[]};
const hits={primary:[],secondary:[]};
let browser;
try{
  browser=await browserType.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error&&error.stack||error)));
  await page.addInitScript(()=>{
    localStorage.removeItem('kerbside.rail.depart-after.v1');
    localStorage.removeItem('kerbside.rail.route.v1');
    localStorage.removeItem('kerbside.rail.v1');
  });
  await page.route('https://huxley2.azurewebsites.net/**',async route=>{
    hits.primary.push(route.request().url());
    // Simulate the failure mode that the old regression missed: the primary
    // host accepts the connection but never produces a response. The live
    // window's per-provider timer must abort this attempt before the board's
    // outer 10-second timeout expires and then try the backup host.
    await new Promise(resolve=>setTimeout(resolve,6000));
    try{await route.fulfill({status:503,contentType:'application/json',body:'{}'});}catch(error){}
  });
  await page.route('https://hux.azurewebsites.net/**',async route=>{
    hits.secondary.push(route.request().url());
    const pathname=decodeURIComponent(new URL(route.request().url()).pathname).replace(/\/+$/,'');
    if(pathname==='/departures/BHM/20'){
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(board)});
      return;
    }
    await route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });

  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__KERBSIDE_TRAIN_LIVE_WINDOW__?.state?.installed===true);

  const first=await page.evaluate(async()=>{
    const started=performance.now();
    const response=await fetch('https://huxley2.azurewebsites.net/departures/BHM/20?expand=true');
    const json=await response.json();
    const live=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;
    const provider=window.__KERBSIDE_RAIL_PROVIDER__;
    return {elapsed:performance.now()-started,status:response.status,crs:json.crs,attempts:live.state.attempts,active:provider.state.active,fallbacks:live.state.fallbacks,attemptMs:live.PROVIDER_ATTEMPT_MS};
  });

  assert.equal(first.status,200);
  assert.equal(first.crs,'BHM');
  assert.equal(first.attemptMs,4000);
  assert.ok(first.elapsed>=3000&&first.elapsed<9500,`fallback should complete inside the outer request budget, got ${first.elapsed}ms`);
  assert.equal(first.active,'https://hux.azurewebsites.net');
  assert.ok(first.fallbacks>=1);
  assert.equal(first.attempts.length,2,JSON.stringify(first.attempts));
  assert.equal(first.attempts[0].provider,'https://huxley2.azurewebsites.net');
  assert.equal(first.attempts[0].timedOut,true);
  assert.equal(first.attempts[1].provider,'https://hux.azurewebsites.net');
  assert.equal(first.attempts[1].status,200);

  const primaryBefore=hits.primary.length;
  const secondaryBefore=hits.secondary.length;
  const second=await page.evaluate(async()=>{
    const started=performance.now();
    const response=await fetch('https://huxley2.azurewebsites.net/departures/BHM/20?expand=true');
    await response.json();
    return {status:response.status,elapsed:performance.now()-started,attempts:window.__KERBSIDE_TRAIN_LIVE_WINDOW__.state.attempts};
  });
  assert.equal(second.status,200);
  assert.ok(second.elapsed<2500,`known-good provider should be preferred on the next request, got ${second.elapsed}ms`);
  assert.equal(hits.primary.length,primaryBefore,'a known-bad primary should not be retried before the known-good backup');
  assert.ok(hits.secondary.length>secondaryBefore);
  assert.equal(second.attempts[0].provider,'https://hux.azurewebsites.net');
  assert.deepEqual(pageErrors,[],`Unexpected page errors: ${pageErrors.join('\n')}`);
  console.log(`Kerbside hanging-primary rail failover regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
