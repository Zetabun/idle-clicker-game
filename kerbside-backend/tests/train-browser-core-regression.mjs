import assert from 'node:assert/strict';
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
  tocNames:{XC:'CrossCountry',GW:'Great Western Railway'}
};
const locations={
  BHM:['Birmingham New Street','BHAMNWS',''],
  BRI:['Bristol Temple Meads','BRSTLTM',''],
  CNM:['Cheltenham Spa','CHLTNHM',''],
  GLO:['Gloucester','GLOSTER','']
};
function rowsFor(date){return [
  [`rid-completed-${date}`,`uid-completed-${date}`,'1A00','XC',date,[['BHM','','07:45','6',0],['BRI','09:00','','2',0]]],
  [`rid-forward-${date}`,`uid-forward-${date}`,'1A01','XC',date,[['BHM','','10:42','7',0],['BRI','12:07','','3',0]]],
  [`rid-reverse-${date}`,`uid-reverse-${date}`,'1A02','XC',date,[['BRI','','10:50','3',0],['BHM','12:15','','7',0]]],
  [`rid-change-a-${date}`,`uid-change-a-${date}`,'1C10','XC',date,[['BHM','','10:05','8',0],['CNM','10:45','','2',0]]],
  [`rid-change-tight-${date}`,`uid-change-tight-${date}`,'1G01','GW',date,[['CNM','','10:52','4',0],['GLO','11:25','','1',0]]],
  [`rid-change-b-${date}`,`uid-change-b-${date}`,'1G02','GW',date,[['CNM','','11:00','4',0],['GLO','11:32','','1',0]]],
  [`rid-change-recovery-${date}`,`uid-change-recovery-${date}`,'1G03','GW',date,[['CNM','','11:20','5',0],['GLO','11:52','','2',0]]]
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
  {stationName:'Bristol Temple Meads',crsCode:'BRI'},
  {stationName:'Cheltenham Spa',crsCode:'CNM'},
  {stationName:'Gloucester',crsCode:'GLO'}
];
const liveService=(kind)=>{
  if(kind==='connection')return {
    origin:[{locationName:'Birmingham New Street',crs:'BHM'}],destination:[{locationName:'Cheltenham Spa',crs:'CNM'}],
    serviceIdGuid:`rid-change-a-${TODAY}`,uid:`uid-change-a-${TODAY}`,trainid:'1C10',serviceIdUrlSafe:'live-change-a',
    std:'10:05',etd:'10:12',platform:'8',operator:'CrossCountry',operatorCode:'XC',length:4,isCancelled:false,
    subsequentCallingPoints:[{callingPoint:[{locationName:'Cheltenham Spa',crs:'CNM',st:'10:45',et:'10:53',isCancelled:false}]}]
  };
  if(kind==='onward-previous-cancelled')return {
    origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}],
    serviceIdGuid:`live-cancelled-${TODAY}`,uid:`live-cancelled-${TODAY}`,trainid:'1G00',serviceIdUrlSafe:'live-cancelled',
    std:'10:45',etd:'Cancelled',platform:'3',operator:'Great Western Railway',operatorCode:'GW',length:3,isCancelled:true,cancelReason:'Operational incident',
    subsequentCallingPoints:[{callingPoint:[{locationName:'Gloucester',crs:'GLO',st:'11:15',isCancelled:true}]}]
  };
  if(kind==='onward')return {
    origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}],
    serviceIdGuid:`rid-change-b-${TODAY}`,uid:`uid-change-b-${TODAY}`,trainid:'1G02',serviceIdUrlSafe:'live-change-b',
    std:'11:00',etd:'On time',platform:'4',operator:'Great Western Railway',operatorCode:'GW',length:3,isCancelled:false,
    subsequentCallingPoints:[{callingPoint:[{locationName:'Gloucester',crs:'GLO',st:'11:32',et:'11:32',isCancelled:false}]}]
  };
  if(kind==='recovery')return {
    origin:[{locationName:'Cheltenham Spa',crs:'CNM'}],destination:[{locationName:'Gloucester',crs:'GLO'}],
    serviceIdGuid:`rid-change-recovery-${TODAY}`,uid:`uid-change-recovery-${TODAY}`,trainid:'1G03',serviceIdUrlSafe:'live-change-recovery',
    std:'11:20',etd:'On time',platform:'5',operator:'Great Western Railway',operatorCode:'GW',length:5,isCancelled:false,
    subsequentCallingPoints:[{callingPoint:[{locationName:'Gloucester',crs:'GLO',st:'11:52',et:'11:52',isCancelled:false}]}]
  };
  if(kind==='direct')return {
    origin:[{locationName:'Birmingham New Street',crs:'BHM'}],destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
    serviceIdGuid:`rid-forward-${TODAY}`,uid:`uid-forward-${TODAY}`,trainid:'1A01',serviceIdUrlSafe:'live-forward',
    std:'10:42',etd:'On time',platform:'7',operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
  };
  return {
    origin:[{locationName:'Bristol Temple Meads',crs:'BRI'}],destination:[{locationName:'Birmingham New Street',crs:'BHM'}],
    serviceIdGuid:`rid-reverse-${TODAY}`,uid:`uid-reverse-${TODAY}`,trainid:'1A02',serviceIdUrlSafe:'live-reverse',
    std:'10:50',etd:'On time',platform:'3',operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
  };
};
const liveBoard=(crs,filter='')=>({
  generatedAt:new Date().toISOString(),locationName:crs==='BRI'?'Bristol Temple Meads':crs==='CNM'?'Cheltenham Spa':'Birmingham New Street',crs,nrccMessages:[],
  trainServices:crs==='BRI'?[liveService('reverse')]:crs==='CNM'&&filter==='GLO'?[liveService('onward-previous-cancelled'),liveService('onward'),liveService('recovery')]:filter==='BRI'?[liveService('direct')]:filter==='CNM'?[liveService('connection')]:filter==='GLO'?[]:[liveService('connection'),liveService('direct')]
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
    const match=pathname.match(/^\/departures\/([A-Z0-9]{3})(?:\/to\/([A-Z0-9]{3}))?\/\d+$/i);
    if(match){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(liveBoard(match[1].toUpperCase(),String(match[2]||'').toUpperCase()))});return;}
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
  const FIXED_NOW=`${TODAY}T08:30:00Z`;
  await page.addInitScript(({today,fixedNow})=>{
    const RealDate=Date,fixed=RealDate.parse(fixedNow);
    function FixedDate(...args){if(new.target)return new RealDate(...(args.length?args:[fixed]));return new RealDate(fixed).toString();}
    FixedDate.now=()=>fixed;FixedDate.parse=RealDate.parse;FixedDate.UTC=RealDate.UTC;FixedDate.prototype=RealDate.prototype;window.Date=FixedDate;
    localStorage.setItem('kerbside.rail.travel-date.v1',today);
    localStorage.setItem('kerbside.rail.depart-after.v1','09:00');
    localStorage.removeItem('kerbside.rail.route.v1');
  },{today:TODAY,fixedNow:FIXED_NOW});
  await mockExternal(page,diagnostics);
  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  await page.waitForSelector('#trainPlanner');
  const railNow=await page.evaluate(()=>window.__KERBSIDE_TRAIN_LIVE_WINDOW__.currentRailTime());
  assert.equal(await page.locator('#trainDepartAfter').inputValue(),railNow,'Today should clamp a stale saved departure time to the current UK railway minute');

  const visibleFind=await page.locator('.train-planner button').evaluateAll(buttons=>buttons.filter(button=>{
    const style=getComputedStyle(button),box=button.getBoundingClientRect();
    return /find trains/i.test(button.textContent||'')&&style.display!=='none'&&Number(style.opacity)>0&&box.width>2&&box.height>2;
  }).map(button=>(button.textContent||'').trim()));
  assert.deepEqual(visibleFind,['Find trains'],'combined planner should expose one visible journey action');

  await findJourney(page,'BHM','BRI');
  assert.equal((await page.locator('#trainStationName').textContent()).trim(),'Birmingham New Street → Bristol Temple Meads');
  assert.equal(await page.locator('#trainScheduledBoard .train-scheduled-service').count(),1);
  assert.equal(await page.locator('#trainScheduledBoard').getByText('07:45',{exact:true}).count(),0,'a completed train must not be shown on Today even when localStorage contains an old departure preference');
  assert.match(await page.locator('#trainScheduledBoard .train-scheduled-service').first().textContent(),/10:42/);
  assert.match(await page.locator('#trainScheduledBoard .train-scheduled-service').first().textContent(),/Bristol Temple Meads/);
  assert.equal(await page.locator('#trainScheduledBoard .train-service-date').count(),0,'today must not repeat the date on each row');

  // Open a forecast card through the real delegated summary handler.
  await page.locator('#trainScheduledBoard [data-scheduled-toggle]').first().click();
  const detail=page.locator('#trainScheduledBoard .train-service-detail').first();
  await detail.waitFor({state:'visible'});
  assert.match(await detail.textContent(),/Forecast v4|Why this forecast/i);

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

  // A route with no through train should now produce a conservative one-change
  // itinerary. The 10:52 connection is only seven minutes and must be absent;
  // the 11:00 departure leaves a 15-minute buffer and is accepted.
  // Fixed daytime fixture: make this one scenario independent of CI clock.
  await page.evaluate(()=>{
    const api=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;
    window.__KERBSIDE_TEST_LIVE_WINDOW_FOR__=api.liveWindowFor;
    api.liveWindowFor=()=>({mode:'live',offset:0,window:120});
  });
  await findJourney(page,'BHM','GLO');
  assert.equal((await page.locator('#trainStationName').textContent()).trim(),'Birmingham New Street → Gloucester');
  assert.equal(await page.locator('#trainScheduledBoard .train-connection-service').count(),1);
  const connection=page.locator('#trainScheduledBoard .train-connection-service').first();
  assert.match(await connection.textContent(),/Cheltenham Spa/);
  assert.match(await connection.textContent(),/Fastest/);
  assert.match(await connection.textContent(),/Best connection/);
  try{
    await page.waitForFunction(()=>/Connection at risk/.test(document.querySelector('#trainScheduledBoard .train-connection-service')?.textContent||''),null,{timeout:10000});
  }catch(error){
    const debug=await page.evaluate(()=>{
      const timetable=window.__KERBSIDE_TRAIN_TIMETABLE__,overlay=window.__KERBSIDE_TRAIN_OVERLAY__;
      return {
        header:document.getElementById('trainStationName')?.textContent||'',
        board:document.querySelector('#trainScheduledBoard .train-connection-service')?.textContent||'',
        mode:timetable?.state?.mode||'',
        route:{from:window.__KERBSIDE_TRAINS__?.state?.station,to:window.__KERBSIDE_TRAIN_ROUTES__?.state?.destination},
        timetableServices:(timetable?.state?.services||[]).map(service=>({
          type:service.journeyType,risk:service.connectionRisk,live:service.liveEvidence,
          liveMinutes:service.liveConnectionMinutes,connectionMinutes:service.connectionMinutes,
          minimum:service.minimumConnectionMinutes,interchange:service.interchange,
          first:service.legs?.[0]?{serviceID:service.legs[0].serviceID,uid:service.legs[0].uid,trainId:service.legs[0].trainId,std:service.legs[0].std,live:service.legs[0].liveEvidence,via:service.legs[0].liveVia,etd:service.legs[0].etd}:null,
          second:service.legs?.[1]?{serviceID:service.legs[1].serviceID,std:service.legs[1].std}:null
        })),
        overlay:{status:overlay?.state?.status,crs:overlay?.state?.crs,date:overlay?.state?.date,includeConnections:overlay?.state?.includeConnections,count:overlay?.state?.services?.length||0,services:(overlay?.state?.services||[]).map(service=>({rid:service.serviceIdGuid||service.serviceIdGuId||service.rid||'',uid:service.uid||'',trainid:service.trainid||service.trainId||'',std:service.std||'',etd:service.etd||'',destination:service.destination,calling:service.subsequentCallingPoints}))},
        liveWindow:window.__KERBSIDE_TRAIN_LIVE_WINDOW__?.liveWindowFor?.('09:00')
      };
    });
    console.error('KERBSIDE CONNECTION DEBUG',JSON.stringify({debug,requests:diagnostics.railRequests},null,2));
    throw error;
  }
  assert.match(await connection.textContent(),/Connection at risk/);
  assert.match(await connection.textContent(),/live 7m change/);
  assert.ok(diagnostics.railRequests.some(value=>/^\/departures\/BHM\/to\/CNM\/9\?/.test(value)),'connection overlay should request a BHM → CNM first-leg board');
  assert.ok(diagnostics.railRequests.some(value=>/^\/departures\/CNM\/to\/GLO\/9\?/.test(value)),'connection overlay should request a CNM → GLO onward board');
  const connectionState=await page.evaluate(()=>window.__KERBSIDE_TRAIN_TIMETABLE__.state.services.find(service=>service.journeyType==='connection'));
  assert.equal(connectionState.secondLiveEvidence,true,'onward leg should carry live Darwin evidence');
  assert.equal(connectionState.recoveryChoice?.serviceID,`rid-change-recovery-${TODAY}`);
  assert.equal(diagnostics.railRequests.some(value=>value.includes('kerbsideScope')),false,'connection evidence must use normal provider URLs only');
  await connection.locator('[data-scheduled-toggle]').click();
  const connectionDetail=connection.locator('.train-service-detail');
  await connectionDetail.waitFor({state:'visible'});
  assert.match(await connectionDetail.textContent(),/Journey plan/);
  assert.match(await connectionDetail.textContent(),/Great Western Railway/);
  assert.match(await connectionDetail.textContent(),/Kerbside conservative minimum: 10 min/);
  assert.match(await connectionDetail.textContent(),/both trains live-checked/i);
  assert.match(await connectionDetail.textContent(),/10-minute planning buffer/);
  assert.match(await connectionDetail.textContent(),/live evidence on both legs/i);
  assert.match(await connectionDetail.textContent(),/Backup if missed/);
  assert.match(await connectionDetail.textContent(),/11:20 → 11:52/);
  const legCrowds=connectionDetail.locator('.train-connection-crowd');
  assert.match(await legCrowds.nth(1).getAttribute('title'),/previous service was cancelled|cancelled, concentrating/i);
  const recoveryForecast=connectionDetail.locator('.train-recovery-forecast');
  await recoveryForecast.waitFor({state:'visible'});
  assert.match(await recoveryForecast.textContent(),/(Quiet|Moderate|Busy|Very busy)/);
  assert.match(await recoveryForecast.getAttribute('title'),/missed-connection passengers/i);
  assert.doesNotMatch(await connectionDetail.textContent(),/10:52/);

  // Trusted Connections: pin the affected journey, then explicitly adopt the
  // suggested backup. The selected watch must follow the replacement onward
  // leg and Forecast v4 must remain attached to the replanned itinerary.
  const watchButton=connectionDetail.getByRole('button',{name:'Watch journey'});
  await watchButton.click();
  await connectionDetail.getByRole('button',{name:'Stop watching'}).waitFor();
  assert.match(await connectionDetail.textContent(),/Journey Watch/i);
  assert.match(await connectionDetail.textContent(),/Connection at risk/i);
  const watchedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.journey-watch.v1')||'null'));
  assert.equal(watchedBefore?.onwardID,`rid-change-b-${TODAY}`);

  const useBackup=connectionDetail.getByRole('button',{name:'Use this backup'});
  await useBackup.click();
  await page.waitForFunction(today=>{
    const service=window.__KERBSIDE_TRAIN_TIMETABLE__.state.services.find(item=>item.journeyType==='connection');
    return service?.legs?.[1]?.serviceID===`rid-change-recovery-${today}`&&service?.connectionRisk==='good'&&service?.liveConnectionMinutes===27;
  },TODAY,{timeout:10000});
  assert.match(await connection.textContent(),/Replanned/);
  assert.match(await connection.textContent(),/live 27m change/);
  assert.doesNotMatch(await connection.textContent(),/Connection at risk/);
  assert.match(await connectionDetail.textContent(),/11:20/);
  assert.match(await connectionDetail.textContent(),/11:52/);
  assert.match(await connectionDetail.textContent(),/both trains live-checked/i);
  assert.match(await connectionDetail.textContent(),/Forecast v4|Why this forecast/i);
  assert.equal(await connectionDetail.getByRole('button',{name:'Use this backup'}).count(),0);
  assert.equal(await connectionDetail.getByRole('button',{name:'Stop watching'}).count(),1);
  const watchedAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.journey-watch.v1')||'null'));
  assert.equal(watchedAfter?.onwardID,`rid-change-recovery-${TODAY}`,'Journey Watch must follow the adopted backup leg');
  await connectionDetail.getByRole('button',{name:'Stop watching'}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('kerbside.rail.journey-watch.v1')),null);
  await page.evaluate(()=>{
    const api=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;
    if(window.__KERBSIDE_TEST_LIVE_WINDOW_FOR__)api.liveWindowFor=window.__KERBSIDE_TEST_LIVE_WINDOW_FOR__;
    delete window.__KERBSIDE_TEST_LIVE_WINDOW_FOR__;
    window.__KERBSIDE_TRAIN_OVERLAY__?.stop?.();
  });

  // Restore the direct journey before exercising the date-mode transition.
  await findJourney(page,'BHM','BRI');

  // Tomorrow uses the same timetable spine, does not need a live board request,
  // and every future row carries the selected date added in 0.7.45.
  const liveBefore=diagnostics.railRequests.filter(value=>value.startsWith('/departures/')).length;
  await page.locator('#trainTravelDate').fill(TOMORROW);
  await page.locator('#trainTravelDate').dispatchEvent('change');
  await page.waitForFunction(()=>document.getElementById('trainTravelDateMeta')?.dataset.mode==='planning');
  assert.equal(await page.locator('#trainDepartAfter').inputValue(),'09:00','future dates should restore the traveller\'s saved departure preference');
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
