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
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml; charset=utf-8','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};

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
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error&&error.stack||error)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_STATION_DATA__&&window.__KERBSIDE_JOURNEY_PLANNER__?.planState?.installed&&document.querySelector('#trainViewTabs [data-train-view="trains"]')),{timeout:10000});

  const bridge=await page.evaluate(()=>{
    const api=window.__KERBSIDE_STATION_DATA__;
    const source=new URL('https://huxley2.azurewebsites.net/departures/BHM/to/BRI/20?expand=true&timeOffset=15&timeWindow=120');
    const parsed=api.departureRequest(source),official=api.hostedRailUrl(source);
    return {
      hosted:api.hostedRailBridgeEnabled('zetabun.github.io'),
      local:api.hostedRailBridgeEnabled('127.0.0.1'),
      parsed,
      official:official&&official.toString()
    };
  });
  assert.equal(bridge.hosted,true,'GitHub Pages should use the hosted rail bridge');
  assert.equal(bridge.local,false,'localhost should keep the test/provider path unchanged');
  assert.deepEqual(bridge.parsed,{from:'BHM',to:'BRI',rows:'20'});
  assert.match(bridge.official,/^https:\/\/kerbside-rail\.adambullas\.workers\.dev\/departures\/BHM\/to\/BRI\/20\?/);
  assert.match(bridge.official,/expand=true/);
  assert.match(bridge.official,/timeOffset=15/);

  const trainPlanner=page.locator('#trainPlanner');
  await trainPlanner.waitFor({state:'visible',timeout:10000});

  await page.click('#trainViewTabs [data-train-view="plan"]');
  await page.locator('#planJourneyForm').waitFor({state:'visible'});
  const sticky=await page.evaluate(()=>{
    const sidebar=document.querySelector('.train-sidebar'),tabs=document.getElementById('trainViewTabs'),style=document.getElementById('kerbsideTrainUiGuards');
    sidebar.scrollTop=sidebar.scrollHeight;
    const sidebarRect=sidebar.getBoundingClientRect(),tabsRect=tabs.getBoundingClientRect();
    return {
      position:getComputedStyle(tabs).position,
      sidebarTop:sidebarRect.top,
      tabsTop:tabsRect.top,
      tabsBottom:tabsRect.bottom,
      sidebarBottom:sidebarRect.bottom,
      guardCss:style&&style.textContent||''
    };
  });
  assert.equal(sticky.position,'sticky','desktop train view tabs should remain sticky');
  assert.ok(sticky.tabsTop>=sticky.sidebarTop-1&&sticky.tabsTop<sticky.sidebarTop+24,`tabs should stay at the top of the desktop sidebar: ${JSON.stringify(sticky)}`);
  assert.ok(sticky.tabsBottom<=sticky.sidebarBottom+1,`tabs should remain visible inside the sidebar: ${JSON.stringify(sticky)}`);
  assert.match(sticky.guardCss,/calendar-picker-indicator\{filter:invert\(1\)/,'dark-theme date inputs should force a visible calendar glyph');

  await page.click('#trainViewTabs [data-train-view="trains"]');
  await trainPlanner.waitFor({state:'visible'});
  assert.equal(await page.locator('.train-board-head').isVisible(),true,'train board header should return with the Trains tab');
  assert.equal(await page.locator('.train-legend').isVisible(),true,'train crowding legend should return with the Trains tab');

  const repaired=await page.evaluate(()=>{
    const tabs=document.getElementById('trainViewTabs'),sidebar=document.querySelector('.train-sidebar'),planner=document.getElementById('trainPlanner');
    planner.hidden=true;
    for(const child of sidebar.children){
      if(child!==tabs&&child.id!=='planJourneyForm'&&child.id!=='savedJourneySidebar')child.hidden=true;
    }
    return window.__KERBSIDE_STATION_DATA__.restoreBaseTrainView();
  });
  assert.equal(repaired,true,'the train view guard should repair a stale hidden-state snapshot');
  assert.equal(await trainPlanner.isVisible(),true,'normal train search/planner controls should be visible after repair');

  const sidebarState=await page.evaluate(()=>({scrollTop:document.querySelector('.train-sidebar').scrollTop,selected:document.querySelector('#trainViewTabs [data-train-view="trains"]').getAttribute('aria-selected')}));
  assert.equal(sidebarState.scrollTop,0,'switching train views should return the desktop sidebar to its navigation');
  assert.equal(sidebarState.selected,'true');
  assert.deepEqual(pageErrors,[],`unexpected page errors: ${pageErrors.join('\n')}`);

  console.log(`Kerbside desktop train UI recovery regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
