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

const liveBoard={
  generatedAt:'2026-08-16T10:00:00+01:00',locationName:'Birmingham New Street',crs:'BHM',nrccMessages:[],
  filterLocationName:'Bristol Temple Meads',filtercrs:'BRI',
  trainServices:[{
    uid:'ACTIVE-UID',trainid:'1A10',serviceIdGuid:'ACTIVE-1',serviceIdUrlSafe:'ACTIVE-1-SAFE',std:'09:50',etd:'09:55',platform:'7',
    operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false,
    destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
    subsequentCallingPoints:[{callingPoint:[{locationName:'Bristol Temple Meads',crs:'BRI',st:'10:30',et:'10:35',isCancelled:false}]}]
  }]
};

function londonStamp(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date),map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function addDay(stamp){const d=new Date(`${stamp}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}

let browser;
try{
  browser=await browserType.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error&&error.stack||error)));
  await page.route('https://huxley2.azurewebsites.net/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(liveBoard)}));
  await page.route('https://hux.azurewebsites.net/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(liveBoard)}));
  await page.route('https://query.wikidata.org/**',route=>route.fulfill({status:200,contentType:'application/sparql-results+json',body:JSON.stringify({head:{vars:[]},results:{bindings:[]}})}));
  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({matches:[]})}));
  await page.route('https://kerbside-train-movement.adambullas.workers.dev/**',route=>{
    const url=new URL(route.request().url());
    const results=Object.fromEntries(url.searchParams.getAll('ref').map(ref=>[ref,null]));
    return route.fulfill({
      status:200,
      contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'},
      body:JSON.stringify({ok:true,date:url.searchParams.get('date')||'',generatedAt:Date.now(),connected:false,lastMessageAt:null,results})
    });
  });

  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_ACTIVE_JOURNEY__?.install&&window.__KERBSIDE_TRAIN_TIMETABLE__?.load&&window.__KERBSIDE_SAVED_JOURNEYS_V2__?.startActiveSavedJourney&&window.__KERBSIDE_TRAINS__?.selectStation),null,{timeout:10000});

  const setup=await page.evaluate(today=>{
    localStorage.removeItem('kerbside.rail.active-journey.v1');
    localStorage.removeItem('kerbside.rail.journey-watch.v1');
    const trains=window.__KERBSIDE_TRAINS__,routes=window.__KERBSIDE_TRAIN_ROUTES__,dates=window.__KERBSIDE_TRAIN_DATE__,tt=window.__KERBSIDE_TRAIN_TIMETABLE__,provider=window.__KERBSIDE_TIMETABLE_PROVIDER__,active=window.__KERBSIDE_ACTIVE_JOURNEY__;
    trains.state.station={name:'Birmingham New Street',crs:'BHM'};
    routes.state.fromCrs='BHM';
    routes.state.destination={name:'Bristol Temple Meads',crs:'BRI'};
    document.getElementById('trainStationQuery').value='Birmingham New Street';
    document.getElementById('trainDestinationQuery').value='Bristol Temple Meads';
    dates.setDate(today,{persist:false});
    tt.railNowTime=()=> '10:00';
    const manifest={schema:1,source:'Active journey test',timetableId:'ACTIVE-TEST',dates:[today],coverage:{[today]:{from:'00:01',to:'23:59',partial:false}},tocNames:{XC:'CrossCountry'}};
    tt.state.manifest=manifest;
    window.__ACTIVE_PROVIDER_CALLS__=[];
    const rows=()=>{
      const value=[
        {serviceID:'ACTIVE-1',uid:'ACTIVE-UID',trainId:'1A10',std:'09:50',arrival:'10:30',departureMinute:590,arrivalMinute:630,totalMinutes:40,changes:0,journeyType:'direct',operator:'CrossCountry',operatorCode:'XC',platform:'5',arrivalPlatform:'3',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}},
        {serviceID:'STALE-1',uid:'STALE-UID',trainId:'1S01',std:'09:55',arrival:'10:35',departureMinute:595,arrivalMinute:635,totalMinutes:40,changes:0,journeyType:'direct',operator:'Stale Rail',platform:'4',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}},
        {serviceID:'FUTURE-1',uid:'FUTURE-UID',trainId:'1F01',std:'10:45',arrival:'11:25',departureMinute:645,arrivalMinute:685,totalMinutes:40,changes:0,journeyType:'direct',operator:'Future Rail',platform:'6',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}
      ];
      Object.defineProperty(value,'kerbsideSource',{value:'darwin'});return value;
    };
    provider.getCoverage=async()=>manifest;
    provider.refreshCoverage=async()=>manifest;
    const fetchRows=async options=>{window.__ACTIVE_PROVIDER_CALLS__.push({...options});return rows();};
    provider.getServices=fetchRows;
    provider.getJourneyOptions=fetchRows;
    active.state.active=null;
    return tt.load({mode:'today',departAfter:'09:40'}).then(()=>({today,manifest}));
  },londonStamp());

  await page.waitForFunction(()=>document.querySelectorAll('#trainScheduledBoard .train-scheduled-service').length===3,null,{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('#trainScheduledBoard [data-service-id="ACTIVE-1"] .train-active-action-card'),null,{timeout:10000});
  await page.click('#trainScheduledBoard [data-service-id="ACTIVE-1"] [data-scheduled-toggle="ACTIVE-1"]');
  const start=page.locator('#trainScheduledBoard [data-service-id="ACTIVE-1"] [data-active-start]');
  await start.waitFor({state:'visible',timeout:10000});
  assert.equal(await start.textContent(),"I'm taking this");
  await start.click();

  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_ACTIVE_JOURNEY__?.state?.active&&document.querySelector('#trainActiveJourney:not([hidden])')),null,{timeout:10000});
  const panelText=(await page.locator('#trainActiveJourney').textContent()).replace(/\s+/g,' ').trim();
  assert.match(panelText,/Active journey/);
  assert.match(panelText,/Birmingham New Street → Bristol Temple Meads/);
  assert.match(panelText,/Get off at Bristol Temple Meads/,'post-departure guidance should prioritise the destination');
  assert.match(panelText,/Forecast v4/);
  assert.match(panelText,/cannot detect whether you boarded/i);

  const activeState=await page.evaluate(()=>({
    stored:JSON.parse(localStorage.getItem('kerbside.rail.active-journey.v1')||'null'),
    watch:window.__KERBSIDE_TRAIN_TIMETABLE__.state.watch,
    watchHidden:[...document.querySelectorAll('#trainScheduledBoard .train-watch-card')].every(node=>node.hidden),
    panelBox:document.getElementById('trainActiveJourney').getBoundingClientRect().toJSON()
  }));
  assert.equal(activeState.stored.date,setup.today);
  assert.equal(activeState.stored.from.crs,'BHM');
  assert.equal(activeState.stored.to.crs,'BRI');
  assert.equal(activeState.stored.service.uid,'ACTIVE-UID');
  assert.equal(activeState.stored.scheduledDeparture,'09:50');
  assert.equal(activeState.stored.watchOwned,true);
  assert.doesNotMatch(JSON.stringify(activeState.stored),/forecast|probabilities|reasons|liveEvidence|\"etd\"|platform/i,'Active Journey must not persist live/forecast snapshots');
  assert.equal(activeState.watch.serviceID,'ACTIVE-1','Active Journey should reuse Journey Watch');
  assert.equal(activeState.watchHidden,true,'separate Journey Watch controls should hide while an active journey owns the watch slot');
  assert.ok(activeState.panelBox.width<=390,'Active Journey panel overflows the mobile viewport');

  const pin=await page.evaluate(today=>window.__KERBSIDE_ACTIVE_JOURNEY__.pinnedDepartAfter({date:today,from:{crs:'BHM'},to:{crs:'BRI'}},'10:00'),setup.today);
  assert.equal(pin,'09:20','active timetable query should look back before the original scheduled departure');

  await page.evaluate(()=>window.__KERBSIDE_TRAIN_TIMETABLE__.load({mode:'today',departAfter:'10:00'}));
  await page.waitForFunction(()=>window.__KERBSIDE_TRAIN_TIMETABLE__.state.services.length===2,null,{timeout:10000});
  const reloaded=await page.evaluate(()=>({
    ids:window.__KERBSIDE_TRAIN_TIMETABLE__.state.services.map(row=>row.serviceID),
    lastCall:window.__ACTIVE_PROVIDER_CALLS__.at(-1),
    active:window.__KERBSIDE_ACTIVE_JOURNEY__.state.active
  }));
  assert.deepEqual(reloaded.ids,['ACTIVE-1','FUTURE-1'],'active query should keep the boarded train but discard unrelated past departures');
  assert.equal(reloaded.lastCall.departAfter,'09:20');
  assert.equal(reloaded.active.service.uid,'ACTIVE-UID');

  const connection=await page.evaluate(()=>{
    const active=window.__KERBSIDE_ACTIVE_JOURNEY__,saved=active.state.active;
    active.state.active={...saved,journeyType:'connection',first:{serviceID:'C1',uid:'',trainId:'',std:'09:30'},onward:{serviceID:'C2',uid:'',trainId:'',std:'10:05'},change:{crs:'CNM',name:'Cheltenham Spa'}};
    const result=active.guidanceFor({journeyType:'connection',connectionRisk:'at-risk',connectionMinutes:10,liveConnectionMinutes:10,minimumConnectionMinutes:12,minimumConnectionSource:'kerbside-planning-buffer',interchange:{crs:'CNM',name:'Cheltenham Spa'},legs:[{serviceID:'C1',std:'09:30',etd:'On time',arrival:'09:55',liveArrival:'09:55',platform:'4',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Cheltenham Spa',crs:'CNM'}},{serviceID:'C2',std:'10:05',etd:'On time',arrival:'11:00',platform:'2',from:{name:'Cheltenham Spa',crs:'CNM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}],recoveryOptions:[],recoveryChoice:null},'10:00');
    active.state.active=saved;
    return result;
  });
  assert.equal(connection.phase,'change');
  assert.match(connection.next,/Change at Cheltenham Spa/);
  assert.match(connection.detail,/10 min available/);
  assert.match(connection.detail,/2 min short/);
  assert.match(connection.warning,/Connection at risk/);

  await page.locator('#trainActiveJourney [data-active-stop]').click();
  await page.waitForFunction(()=>!window.__KERBSIDE_ACTIVE_JOURNEY__.state.active,null,{timeout:10000});
  const stopped=await page.evaluate(()=>({stored:localStorage.getItem('kerbside.rail.active-journey.v1'),watch:window.__KERBSIDE_TRAIN_TIMETABLE__.state.watch,panelHidden:document.getElementById('trainActiveJourney').hidden,watchVisible:[...document.querySelectorAll('#trainScheduledBoard .train-watch-card')].every(node=>!node.hidden)}));
  assert.equal(stopped.stored,null);
  assert.equal(stopped.watch,null,'ending an Active Journey should clear the Journey Watch it owns');
  assert.equal(stopped.panelHidden,true);
  assert.equal(stopped.watchVisible,true);

  const savedSetup=await page.evaluate(async today=>{
    const id='saved-active-handoff';
    const saved={v:1,id,savedAt:new Date().toISOString(),refreshedAt:'',date:today,from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'},journeyType:'direct',service:{serviceID:'ACTIVE-1',uid:'ACTIVE-UID',trainId:'1A10',std:'09:50'},first:{serviceID:'',uid:'',trainId:'',std:''},onward:{serviceID:'',uid:'',trainId:'',std:''},change:'',scheduledDeparture:'09:50',scheduledArrival:'10:30',searchStart:'09:00',searchEnd:'11:00',preference:'balanced',constraints:{maxChanges:1,connectionBuffer:0}};
    localStorage.setItem('kerbside.rail.plan.saved.v1',JSON.stringify([saved]));
    localStorage.removeItem('kerbside.rail.plan.saved-meta.v2');
    const savedApi=window.__KERBSIDE_SAVED_JOURNEYS_V2__,trains=window.__KERBSIDE_TRAINS__,routes=window.__KERBSIDE_TRAIN_ROUTES__;
    savedApi.state.meta={entries:{},coverageKey:'',updatedAt:''};savedApi.state.live.clear();savedApi.state.actionMessages.clear();savedApi.syncSaved();
    await savedApi.refreshSavedJourney(id,{force:true,reason:'regression'});
    trains.state.station={name:'Manchester Piccadilly',crs:'MAN'};routes.state.fromCrs='MAN';routes.state.destination={name:'Leeds',crs:'LDS'};
    document.getElementById('trainStationQuery').value='Manchester Piccadilly';document.getElementById('trainDestinationQuery').value='Leeds';
    savedApi.enterSavedView();
    return {id,resolution:savedApi.state.meta.entries[id].resolution,status:savedApi.state.meta.entries[id].status};
  },setup.today);
  assert.ok(['exact','identity'].includes(savedSetup.resolution),'saved service should strongly re-resolve before Active Journey is offered');
  assert.ok(['today','delayed'].includes(savedSetup.status),'same-day saved service may be on time or delayed');
  await page.waitForFunction(()=>!window.__KERBSIDE_SAVED_JOURNEYS_V2__.state.refreshing.size,null,{timeout:10000});
  const savedStart=page.locator(`#savedJourneyList [data-saved-v2-active="${savedSetup.id}"]`);
  await savedStart.waitFor({state:'visible',timeout:10000});
  assert.equal(await savedStart.textContent(),'Start active journey');
  const savedFollow=page.locator(`#savedJourneyList [data-saved-v2-follow="${savedSetup.id}"]`);
  await savedFollow.waitFor({state:'visible',timeout:10000});
  assert.equal(await savedFollow.textContent(),'Follow live here');
  await savedStart.click();
  await page.waitForFunction(()=>Boolean(window.__KERBSIDE_ACTIVE_JOURNEY__?.state?.active&&document.querySelector('#trainActiveJourney:not([hidden])')),null,{timeout:10000});
  const handoff=await page.evaluate(()=>({active:window.__KERBSIDE_ACTIVE_JOURNEY__.state.active,station:window.__KERBSIDE_TRAINS__.state.station,route:window.__KERBSIDE_TRAIN_ROUTES__.state.destination,date:window.__KERBSIDE_TRAIN_DATE__.state.date,savedHidden:document.getElementById('savedJourneySurface').hidden,panel:document.getElementById('trainActiveJourney').textContent.replace(/\s+/g,' ').trim()}));
  assert.equal(handoff.station.crs,'BHM','saved handoff should restore the saved origin');
  assert.equal(handoff.route.crs,'BRI','saved handoff should restore the saved destination');
  assert.equal(handoff.date,setup.today);
  assert.equal(handoff.active.service.uid,'ACTIVE-UID');
  assert.equal(handoff.savedHidden,true,'successful handoff should return to the Trains view');
  assert.match(handoff.panel,/Active journey/);
  const firstStartedAt=handoff.active.startedAt;

  await page.click('[data-train-view="saved"]');
  await page.waitForFunction(()=>!window.__KERBSIDE_SAVED_JOURNEYS_V2__.state.refreshing.size,null,{timeout:10000});
  const openActive=page.locator(`#savedJourneyList [data-saved-v2-active="${savedSetup.id}"]`);
  await openActive.waitFor({state:'visible',timeout:10000});
  assert.equal(await openActive.textContent(),'Open active journey');
  const following=page.locator(`#savedJourneyList [data-saved-v2-follow="${savedSetup.id}"]`);
  await following.waitFor({state:'visible',timeout:10000});
  assert.equal(await following.textContent(),'Following live');
  await openActive.click();
  await page.waitForFunction(()=>document.querySelector('#trainActiveJourney:not([hidden])'),null,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.__KERBSIDE_ACTIVE_JOURNEY__.state.active.startedAt),firstStartedAt,'opening the same active saved journey must not restart it');

  await page.locator('#trainActiveJourney [data-active-stop]').click();
  await page.waitForFunction(()=>!window.__KERBSIDE_ACTIVE_JOURNEY__.state.active,null,{timeout:10000});

  await page.evaluate(tomorrow=>{window.__KERBSIDE_TRAIN_DATE__.setDate(tomorrow,{persist:false});window.__KERBSIDE_ACTIVE_JOURNEY__.sync();},addDay(setup.today));
  await page.waitForFunction(()=>document.querySelectorAll('#trainScheduledBoard [data-active-start]').length===0,null,{timeout:10000});
  assert.equal(await page.locator('#trainScheduledBoard [data-active-start]').count(),0,'future services must not offer Active Journey');

  assert.deepEqual(errors,[],`Unexpected page errors: ${errors.join('\n')}`);
  console.log(`Kerbside Active Journey regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
