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
  await page.waitForSelector('#trainViewTabs [data-train-view="saved"]',{timeout:10000});

  const roomyDesktop=await page.evaluate(()=>{
    const sidebar=document.querySelector('.train-sidebar'),card=document.querySelector('.train-sidebar .train-card'),tab=document.querySelector('#trainViewTabs button');
    return {sidebarWidth:sidebar.getBoundingClientRect().width,cardPadding:parseFloat(getComputedStyle(card).paddingLeft)||0,tabHeight:tab.getBoundingClientRect().height};
  });
  assert.ok(roomyDesktop.sidebarWidth>=420,`1440px desktop rail should have breathing room: ${JSON.stringify(roomyDesktop)}`);
  assert.ok(roomyDesktop.cardPadding>=15,`desktop train cards should keep comfortable padding: ${JSON.stringify(roomyDesktop)}`);
  assert.ok(roomyDesktop.tabHeight>=41,`desktop train tabs should not feel compressed: ${JSON.stringify(roomyDesktop)}`);

  await page.setViewportSize({width:980,height:900});
  await page.waitForTimeout(80);
  const compactDesktop=await page.evaluate(()=>{
    const shell=document.querySelector('.train-shell'),sidebar=document.querySelector('.train-sidebar'),content=document.querySelector('.train-content'),card=document.querySelector('.train-sidebar .train-card');
    return {display:getComputedStyle(shell).display,sidebarWidth:sidebar.getBoundingClientRect().width,contentWidth:content.getBoundingClientRect().width,cardWidth:card.getBoundingClientRect().width};
  });
  assert.equal(compactDesktop.display,'grid','980px should remain the two-pane desktop train layout');
  assert.ok(compactDesktop.sidebarWidth>=350,`sub-1000 desktop rail must not collapse back to 260px: ${JSON.stringify(compactDesktop)}`);
  assert.ok(compactDesktop.contentWidth>=500,`wider desktop rail must still leave a usable train board: ${JSON.stringify(compactDesktop)}`);
  assert.ok(compactDesktop.cardWidth>=310,`desktop train cards should retain usable content width: ${JSON.stringify(compactDesktop)}`);
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(80);

  await page.click('#trainViewTabs [data-train-view="saved"]');
  await page.locator('#savedJourneySidebar').waitFor({state:'visible'});
  await page.locator('#savedJourneySurface').waitFor({state:'visible'});
  const savedIsolation=await page.evaluate(()=>{
    const sidebar=document.querySelector('.train-sidebar'),content=document.querySelector('.train-content');
    for(const child of sidebar.children){if(child.id!=='trainViewTabs'&&child.id!=='savedJourneySidebar')child.hidden=false;}
    for(const child of content.children){if(child.id!=='savedJourneySurface')child.hidden=false;}
    window.__KERBSIDE_STATION_DATA__?.restoreBaseTrainView?.();
    const normalSidebar=document.getElementById('trainPlanner'),normalBoard=document.querySelector('.train-board');
    return {
      selected:document.querySelector('#trainViewTabs [data-train-view="saved"]').getAttribute('aria-selected'),
      sidebarGuard:sidebar.classList.contains('saved-view-active'),
      contentGuard:content.classList.contains('saved-view-active'),
      savedSidebarDisplay:getComputedStyle(document.getElementById('savedJourneySidebar')).display,
      savedSurfaceDisplay:getComputedStyle(document.getElementById('savedJourneySurface')).display,
      normalSidebarDisplay:normalSidebar?getComputedStyle(normalSidebar).display:'missing',
      normalBoardDisplay:normalBoard?getComputedStyle(normalBoard).display:'missing'
    };
  });
  assert.equal(savedIsolation.selected,'true','Saved journeys tab should remain selected');
  assert.equal(savedIsolation.sidebarGuard,true,'Saved journeys should own the sidebar surface');
  assert.equal(savedIsolation.contentGuard,true,'Saved journeys should own the content surface');
  assert.notEqual(savedIsolation.savedSidebarDisplay,'none','Saved journeys sidebar must remain visible');
  assert.notEqual(savedIsolation.savedSurfaceDisplay,'none','Saved journeys cards surface must remain visible');
  assert.equal(savedIsolation.normalSidebarDisplay,'none','ordinary train controls must not leak into Saved journeys');
  assert.equal(savedIsolation.normalBoardDisplay,'none','ordinary train listings must not replace Saved journeys');

  await page.click('#trainViewTabs [data-train-view="trains"]');
  await trainPlanner.waitFor({state:'visible'});
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
      guardCss:style&&style.textContent||'',darkInk:getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),contentRect:document.querySelector('.train-content').getBoundingClientRect().toJSON(),headRect:document.querySelector('#planJourneySurface .plan-results-head').getBoundingClientRect().toJSON(),headFlexShrink:getComputedStyle(document.querySelector('#planJourneySurface .plan-results-head')).flexShrink
    };
  });
  assert.equal(sticky.position,'sticky','desktop train view tabs should remain sticky');
  assert.ok(sticky.tabsTop>=sticky.sidebarTop-1&&sticky.tabsTop<sticky.sidebarTop+24,`tabs should stay at the top of the desktop sidebar: ${JSON.stringify(sticky)}`);
  assert.ok(sticky.tabsBottom<=sticky.sidebarBottom+1,`tabs should remain visible inside the sidebar: ${JSON.stringify(sticky)}`);
  assert.match(sticky.guardCss,/input\[type="time"\]::\-webkit-calendar-picker-indicator/,'dark-theme time inputs should force a visible clock glyph');
  assert.match(sticky.guardCss,/calendar-picker-indicator\{filter:invert\(1\)/,'dark-theme date/time inputs should force visible native glyphs');
  assert.equal(sticky.darkInk,'#0E0F11');assert.equal(sticky.headFlexShrink,'0');assert.ok(sticky.headRect.top>=sticky.contentRect.top-1&&sticky.headRect.bottom<=sticky.contentRect.bottom+1,`planner results header should remain fully visible: ${JSON.stringify(sticky)}`);
  assert.match(sticky.guardCss,/overflow-anchor:none/,'desktop train sidebar should opt out of browser scroll anchoring while views are restored');

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

  await page.waitForFunction(()=>document.querySelector('.train-sidebar')?.scrollTop===0,null,{timeout:2000});
  const sidebarState=await page.evaluate(()=>({scrollTop:document.querySelector('.train-sidebar').scrollTop,selected:document.querySelector('#trainViewTabs [data-train-view="trains"]').getAttribute('aria-selected')}));
  assert.equal(sidebarState.scrollTop,0,'switching train views should return the desktop sidebar to its navigation after layout settles');
  assert.equal(sidebarState.selected,'true');
  assert.deepEqual(pageErrors,[],`unexpected page errors: ${pageErrors.join('\n')}`);

  console.log(`Kerbside desktop train UI recovery regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
