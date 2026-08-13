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

let browser;
try{
  browser=await browserType.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error&&error.stack||error)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Array.from(document.styleSheets).some(sheet=>String(sheet.href||'').includes('/kerbside-trains.css')));

  const futureLabel=await page.evaluate(()=>window.__KERBSIDE_TRAIN_TIMETABLE__?.serviceDateLabel?.('advance','2026-08-13'));
  assert.match(String(futureLabel),/Thu/);
  assert.match(String(futureLabel),/13 Aug/);

  await page.evaluate(label=>{
    const host=document.createElement('div');
    host.id='mobileRailFixture';
    host.style.cssText='width:100%;box-sizing:border-box;padding:8px;';
    host.innerHTML=`<article class="train-service train-scheduled-service">
      <button class="train-service-summary" type="button">
        <span class="train-time"><b>10:42</b><small class="train-status train-status-timetabled">Timetabled</small><small class="train-service-date">${label}</small></span>
        <span class="train-route"><strong>Bristol Temple Meads</strong><small>CrossCountry · arr 12:07 · Plat 7</small></span>
        <span class="train-crowding crowd-moderate"><i></i><b>Moderate</b><small>Medium-high confidence</small></span>
        <span class="train-formation"><b>1h 25m</b><small>journey time</small></span>
        <span class="train-chevron">⌄</span>
      </button>
    </article>`;
    document.body.appendChild(host);
  },futureLabel);

  const metrics=await page.evaluate(()=>{
    const summary=document.querySelector('#mobileRailFixture .train-service-summary');
    const time=summary.querySelector('.train-time').getBoundingClientRect();
    const date=summary.querySelector('.train-service-date').getBoundingClientRect();
    const route=summary.querySelector('.train-route').getBoundingClientRect();
    const crowd=summary.querySelector('.train-crowding').getBoundingClientRect();
    const chevron=summary.querySelector('.train-chevron').getBoundingClientRect();
    const box=summary.getBoundingClientRect();
    return {
      viewport:document.documentElement.clientWidth,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      summaryOverflow:summary.scrollWidth-summary.clientWidth,
      timeTop:time.top,timeRight:time.right,dateRight:date.right,
      routeTop:route.top,routeLeft:route.left,routeRight:route.right,
      crowdLeft:crowd.left,crowdTop:crowd.top,
      chevronRight:chevron.right,summaryRight:box.right
    };
  });

  assert.ok(Math.abs(metrics.timeTop-metrics.routeTop)<=3,`time and destination should share a top edge: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.routeLeft-metrics.timeRight>=10,`time/date column needs a visible gap before destination: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.routeLeft-metrics.dateRight>=10,`future date must not encroach on destination: ${JSON.stringify(metrics)}`);
  assert.ok(Math.abs(metrics.crowdLeft-metrics.routeLeft)<=3,`crowding should align under destination: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.crowdTop>metrics.routeTop,`crowding should sit below route description: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.chevronRight<=metrics.summaryRight+1,`chevron must stay inside summary: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.summaryOverflow<=1,`train summary should not overflow its card: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.overflow<=1,`mobile page should not gain horizontal overflow: ${JSON.stringify(metrics)}`);
  assert.deepEqual(pageErrors,[],`unexpected page errors: ${pageErrors.join('\n')}`);

  console.log(`Kerbside future train row mobile alignment regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
