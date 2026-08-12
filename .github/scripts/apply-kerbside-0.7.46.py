#!/usr/bin/env python3
from pathlib import Path
import json


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Release/cache busting.
if read('VERSION').strip() != '0.7.45':
    raise SystemExit(f"VERSION: expected 0.7.45, found {read('VERSION').strip()!r}")
Path('VERSION').write_text('0.7.46\n', encoding='utf-8')

bus = read('bus.html')
if "const APP_VERSION = '0.7.45';" not in bus:
    raise SystemExit('bus.html: expected APP_VERSION 0.7.45')
if '?v=0.7.45' not in bus:
    raise SystemExit('bus.html: expected 0.7.45 cache busters')
bus = bus.replace("const APP_VERSION = '0.7.45';", "const APP_VERSION = '0.7.46';", 1)
bus = bus.replace('?v=0.7.45', '?v=0.7.46')
write('bus.html', bus)
replace_once('kerbside-status.js', "const VERSION='0.7.45';", "const VERSION='0.7.46';")


# ---------------------------------------------------------------------------
# Mobile train summary alignment.
#
# 0.7.45 put the future date into the time column, but the mobile grid still
# gave that column only 56px. More importantly, the inherited align-items:center
# made the route block vertically centre against the now-taller time/date block.
# Give identity/time information a deliberate column, align both blocks at the
# top, and let the time block span the two summary rows so its date cannot push
# the destination downward.
css = 'kerbside-trains.css'
replace_once(
    css,
    """  .train-service-summary{
    grid-template-columns:56px minmax(0,1fr) 18px;gap:8px;min-height:68px;padding:9px 7px
  }
  .train-time b{font-size:16px}
  .train-route strong{font-size:13px}
  .train-route small{font-size:9.5px}
  .train-crowding{
    grid-column:2;display:flex;flex-direction:row;align-items:center;gap:5px;padding-left:12px;margin-top:-4px
  }
""",
    """  .train-service-summary{
    grid-template-columns:82px minmax(0,1fr) 18px;
    align-items:start;column-gap:14px;row-gap:6px;min-height:68px;padding:9px 7px
  }
  .train-time{grid-column:1;grid-row:1 / span 2;align-self:start}
  .train-route{grid-column:2;grid-row:1;align-self:start;padding-top:1px}
  .train-time b{font-size:16px}
  .train-route strong{font-size:13px}
  .train-route small{font-size:9.5px}
  .train-crowding{
    grid-column:2;grid-row:2;align-self:start;display:flex;flex-direction:row;align-items:center;gap:5px;padding-left:12px;margin-top:0
  }
"""
)

# The chevron should remain visually centred against the complete two-row
# summary even though the grid itself now aligns content to the top.
replace_once(
    css,
    "  .train-chevron{grid-column:3;grid-row:1 / span 2}\n",
    "  .train-chevron{grid-column:3;grid-row:1 / span 2;align-self:center}\n"
)

# Very narrow devices retain a comfortable route column without reverting to
# the old cramped 56px time/date column.
replace_once(
    css,
    """@media (max-width:430px){
  #topbar .transport-switch{right:52px}
""",
    """@media (max-width:430px){
  .train-service-summary{grid-template-columns:76px minmax(0,1fr) 18px;column-gap:12px}
  #topbar .transport-switch{right:52px}
"""
)


# ---------------------------------------------------------------------------
# A real browser layout regression. It deliberately renders the same future
# row shape reported from iPhone: time + Timetabled + date on the left,
# destination/operator on the right and crowding beneath it. The assertions
# are geometric, so a future CSS change that reintroduces overlap fails in
# WebKit and Chromium instead of needing a screenshot to catch it.
mobile_test = r'''import assert from 'node:assert/strict';
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
  await page.waitForFunction(()=>!!document.querySelector('link[href*="kerbside-trains.css?v=0.7.46"]'));

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
'''
Path('kerbside-backend/tests/train-mobile-layout-regression.mjs').write_text(mobile_test,encoding='utf-8')


# Keep the permanent validator aware of the new browser regression. It already
# executes test:train-route once in WebKit and once in Chromium.
package_path=Path('kerbside-backend/package.json')
package=json.loads(package_path.read_text(encoding='utf-8'))
check=package['scripts']['check']
if 'tests/train-mobile-layout-regression.mjs' not in check:
    package['scripts']['check']=check + ' && node --check tests/train-mobile-layout-regression.mjs'
route=package['scripts']['test:train-route']
if 'train-mobile-layout-regression.mjs' not in route:
    package['scripts']['test:train-route']=route + ' && node tests/train-mobile-layout-regression.mjs'
package_path.write_text(json.dumps(package,indent=2)+'\n',encoding='utf-8')

print('Applied Kerbside 0.7.46 mobile rail alignment and browser hardening.')
