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
  await page.waitForFunction(()=>typeof window.__KERBSIDE_TRAIN_TIMETABLE__?.serviceDateLabel==='function');

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
      timeTop:time.top,timeRight:time.right,dateRight:date.right,statusSize:parseFloat(getComputedStyle(summary.querySelector('.train-status')).fontSize)||0,timeSize:parseFloat(getComputedStyle(summary.querySelector('.train-time b')).fontSize)||0,
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
  assert.ok(metrics.statusSize<=7.6,`timetabled status label should stay compact: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.timeSize>=16,`departure time should keep its prominent size: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.overflow<=1,`mobile page should not gain horizontal overflow: ${JSON.stringify(metrics)}`);

  // Forecast detail is a long-form reading surface on phones. Keep the
  // explanatory copy comfortably above the tiny metadata sizes used on the
  // desktop board, and prove the larger labels do not create horizontal scroll.
  await page.evaluate(()=>{
    const fixture=document.createElement('article');
    fixture.id='mobileForecastFixture';
    fixture.className='train-service is-sheet';
    fixture.innerHTML=`<div class="train-service-detail"><section class="train-crowding-explain crowd-quiet">
      <div class="train-forecast-head"><span class="train-forecast-status"><i></i><strong>Quiet</strong></span><span class="train-forecast-meta">High confidence · Forecast v4 · Live-adjusted</span></div>
      <div class="train-forecast-reasons"><span>Why this forecast</span><ul>
        <li class="reason-down"><span class="train-forecast-flag">Quieter</span><span class="train-forecast-reason-text">Train starts at this station, so there is no carried load from earlier calls</span></li>
        <li class="reason-up"><span class="train-forecast-flag">Busier</span><span class="train-forecast-reason-text">London Euston is in the busiest 5% of GB stations in ORR usage</span></li>
      </ul></div>
      <details class="train-forecast-method" open><summary>How this is worked out</summary><p>Kerbside combines measured demand with the timetable, live evidence and the selected travel time.</p><div class="train-forecast-calibration"><span>Measured baseline</span><b>DfT measured baseline: 16 passengers per 100 seats.</b><i>DfT rail passenger numbers and crowding, autumn 2025 (OGL v3)</i></div></details>
      <div class="train-forecast-probabilities"><span>Probability</span><b>Quiet 72% · Moderate 20% · Busy 8%</b></div>
    </section></div>`;
    document.body.appendChild(fixture);
  });

  const forecastType=await page.evaluate(()=>{
    const root=document.querySelector('#mobileForecastFixture .train-crowding-explain');
    const size=selector=>parseFloat(getComputedStyle(root.querySelector(selector)).fontSize)||0;
    return {
      meta:size('.train-forecast-meta'),
      heading:size('.train-forecast-reasons>span'),
      reason:size('.train-forecast-reason-text'),
      flag:size('.train-forecast-flag'),
      methodSummary:size('.train-forecast-method>summary'),
      methodBody:size('.train-forecast-method>p'),
      baseline:size('.train-forecast-calibration b'),
      source:size('.train-forecast-calibration i'),
      probability:size('.train-forecast-probabilities>b'),
      overflow:root.scrollWidth-root.clientWidth
    };
  });
  assert.ok(forecastType.meta>=12,`mobile forecast metadata should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.heading>=11.5,`mobile forecast section labels should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.reason>=14,`mobile forecast reasons should use body-sized text: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.flag>=10,`mobile forecast direction pills should remain legible: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.methodSummary>=11.5,`mobile forecast method heading should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.methodBody>=13,`mobile forecast method copy should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.baseline>=13,`mobile measured baseline should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.source>=11.5,`mobile forecast source note should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.probability>=13,`mobile probability copy should be readable: ${JSON.stringify(forecastType)}`);
  assert.ok(forecastType.overflow<=1,`larger mobile forecast type must not overflow: ${JSON.stringify(forecastType)}`);
  assert.deepEqual(pageErrors,[],`unexpected page errors: ${pageErrors.join('\n')}`);

  console.log(`Kerbside future train row mobile alignment regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
