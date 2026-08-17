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

const stations=[
  {stationName:'Birmingham New Street',crsCode:'BHM'},
  {stationName:'Bristol Temple Meads',crsCode:'BRI'}
];
const directBoard={
  generatedAt:'2026-08-10T20:30:00Z',locationName:'Birmingham New Street',crs:'BHM',nrccMessages:[],
  filterLocationName:'Bristol Temple Meads',filtercrs:'BRI',
  trainServices:[{
    origin:[{locationName:'Birmingham New Street',crs:'BHM'}],
    destination:[{locationName:'Bristol Temple Meads',crs:'BRI'}],
    serviceIdUrlSafe:'BHM-BRI-LIVE',std:'21:45',etd:'On time',platform:'11A',
    operator:'CrossCountry',operatorCode:'XC',length:8,isCancelled:false
  }]
};
const allBoard={...directBoard,filterLocationName:null,filtercrs:null,trainServices:[
  directBoard.trainServices[0],
  {...directBoard.trainServices[0],serviceIdUrlSafe:'BHM-LIV',std:'21:50',destination:[{locationName:'Liverpool Lime Street',crs:'LIV'}]}
]};
const eventResults={
  head:{vars:['event','eventLabel','time','end','locationLabel','areaLabel','attendance']},
  results:{bindings:[{
    event:{type:'uri',value:'https://www.wikidata.org/entity/QTEST'},
    eventLabel:{type:'literal','xml:lang':'en',value:'Birmingham Arena Concert'},
    time:{type:'literal',datatype:'http://www.w3.org/2001/XMLSchema#dateTime',value:'2026-08-10T19:00:00Z'},
    end:{type:'literal',datatype:'http://www.w3.org/2001/XMLSchema#dateTime',value:'2026-08-10T20:30:00Z'},
    locationLabel:{type:'literal','xml:lang':'en',value:'Birmingham Arena'},
    areaLabel:{type:'literal','xml:lang':'en',value:'Birmingham'},
    attendance:{type:'literal',datatype:'http://www.w3.org/2001/XMLSchema#decimal',value:'15000'}
  }]}
};

const diagnostics={primary:[],fallback:[],events:[],pageErrors:[],consoleErrors:[]};
let browser;
try{
  browser=await browserType.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page.on('pageerror',error=>diagnostics.pageErrors.push(String(error&&error.stack||error)));
  page.on('console',message=>{if(message.type()==='error')diagnostics.consoleErrors.push(message.text());});

  await page.route('https://huxley2.azurewebsites.net/**',route=>{
    diagnostics.primary.push(new URL(route.request().url()).pathname);
    return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'synthetic primary outage'})});
  });
  await page.route('https://hux.azurewebsites.net/**',async route=>{
    const pathname=decodeURIComponent(new URL(route.request().url()).pathname).replace(/\/+$/,'')||'/';
    diagnostics.fallback.push(pathname);
    if(pathname.startsWith('/crs/')){
      const query=pathname.slice('/crs/'.length).toLowerCase();
      const result=stations.filter(item=>item.stationName.toLowerCase().includes(query)||item.crsCode.toLowerCase()===query);
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result.length?result:stations)});
    }
    if(pathname==='/departures/BHM/9')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(allBoard)});
    if(pathname==='/departures/BHM/to/BRI/9')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(directBoard)});
    if(pathname.startsWith('/service/'))return route.fulfill({status:200,contentType:'application/json',body:'{}'});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
  await page.route('https://query.wikidata.org/**',route=>{
    diagnostics.events.push(route.request().url());
    return route.fulfill({status:200,contentType:'application/sparql-results+json',body:JSON.stringify(eventResults)});
  });
  await page.route('https://raw.githubusercontent.com/openfootball/england/**',route=>{
    const pathname=new URL(route.request().url()).pathname;
    const body=pathname.includes('/2026-27/2-championship.txt')?'Sat Aug 29\n15:00 Bristol City FC v Portsmouth FC\n':'= Synthetic empty OpenFootball season\n';
    return route.fulfill({status:200,contentType:'text/plain',body});
  });
  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**',route=>
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({matches:[]})})
  );
  await page.route('https://kerbside-train-movement.adambullas.workers.dev/**',route=>{
    const url=new URL(route.request().url());
    const results=Object.fromEntries(url.searchParams.getAll('ref').map(ref=>[ref,null]));
    return route.fulfill({
      status:200,
      contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'},
      body:JSON.stringify({
        ok:true,
        date:url.searchParams.get('date')||'',
        generatedAt:Date.now(),
        connected:false,
        lastMessageAt:null,
        results
      })
    });
  });

  await page.goto(`http://127.0.0.1:${port}/bus.html`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#transportTrain');
  await page.click('#transportTrain');
  await page.waitForSelector('#trainJourneyGo');

  assert.equal(await page.locator('#trainDestinationQuery').isDisabled(),false,'destination should be available as part of the same journey form');
  const findButtons=await page.locator('.train-planner button').evaluateAll(buttons=>buttons.filter(button=>{
    const style=getComputedStyle(button),box=button.getBoundingClientRect();
    return /find/i.test(button.textContent||'')&&style.display!=='none'&&Number(style.opacity)>0&&box.width>2&&box.height>2;
  }).map(button=>(button.textContent||'').trim()));
  assert.deepEqual(findButtons,['Find trains'],'the journey planner should expose one visible find action');

  await page.fill('#trainStationQuery','Birmingham New Street');
  assert.equal(await page.locator('#trainDestinationQuery').isDisabled(),false,'typing an origin must not disable destination entry');
  await page.fill('#trainDestinationQuery','Bristol Temple Meads');
  await page.click('#trainJourneyGo');
  await page.waitForFunction(()=>document.querySelectorAll('#trainBoard .train-service').length===1,undefined,{timeout:10000});
  await page.waitForFunction(()=>window.__KERBSIDE_EVENTS__?.state?.status==='ready'&&window.__KERBSIDE_EVENTS__.state.events.length===1,undefined,{timeout:10000});

  assert.match(await page.locator('#trainBoard').textContent(),/Bristol Temple Meads/);
  assert.doesNotMatch(await page.locator('#trainBoard').textContent(),/Live train data unavailable/);
  assert.match(await page.locator('#trainJourneySummary').textContent(),/BHM → BRI/);
  assert.ok(diagnostics.primary.length>0,'primary Huxley endpoint should have been attempted');
  assert.ok(diagnostics.fallback.includes('/departures/BHM/to/BRI/9'),`fallback direct request missing: ${JSON.stringify(diagnostics)}`);
  assert.ok(diagnostics.events.length>0,'same-day event source should be queried after a complete journey is selected');

  const provider=await page.evaluate(()=>window.__KERBSIDE_RAIL_PROVIDER__&&({active:window.__KERBSIDE_RAIL_PROVIDER__.state.active,fallbacks:window.__KERBSIDE_RAIL_PROVIDER__.state.fallbacks,providers:window.__KERBSIDE_RAIL_PROVIDER__.providers}));
  assert.equal(provider.active,'https://hux.azurewebsites.net');
  assert.ok(provider.fallbacks>0);
  assert.deepEqual(provider.providers,['https://huxley2.azurewebsites.net','https://hux.azurewebsites.net']);

  const eventForecast=await page.evaluate(()=>{
    const api=window.__KERBSIDE_TRAINS__;
    const events=window.__KERBSIDE_EVENTS__;
    const forecast=window.__KERBSIDE_FORECAST_V3__;
    const service=api.state.services[0];
    const result=forecast.forecast(service,0,api.state.services,{station:api.state.station,referenceDate:new Date(),messages:[]});
    return {journey:events.currentJourney(),status:events.state.status,eventCount:events.state.events.length,eventPressure:result.eventPressure,reasons:result.reasons};
  });
  assert.equal(eventForecast.journey.origin,'Birmingham New Street');
  assert.equal(eventForecast.journey.destination,'Bristol Temple Meads');
  assert.equal(eventForecast.status,'ready');
  assert.equal(eventForecast.eventCount,1);
  assert.ok(eventForecast.eventPressure>0&&eventForecast.eventPressure<=0.8,`event pressure should be positive and bounded: ${JSON.stringify(eventForecast)}`);
  assert.ok(eventForecast.reasons.some(reason=>/Birmingham Arena Concert/.test(reason)),`forecast should name the contributing event: ${JSON.stringify(eventForecast)}`);

  const bristolFixture=await page.evaluate(async()=>{
    const events=window.__KERBSIDE_EVENTS__,forecast=window.__KERBSIDE_FORECAST_V4__;
    const rows=await events.footballEventsFor('2026-08-29');
    const previous={events:events.state.events,date:events.state.date,status:events.state.status,sources:events.state.sources};
    events.state.events=rows.map(row=>events.normalise(row)).filter(Boolean);events.state.date='2026-08-29';events.state.status='ready';events.state.sources=['openfootball (public domain)'];
    const service={std:'12:12',arrival:'13:32',destinationArrival:'13:32',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}};
    const result=forecast.forecast(service,0,[service],{station:{name:'Birmingham New Street',crs:'BHM'},referenceDate:new Date('2026-08-29T12:00:00'),eventJourney:{origin:'Birmingham New Street',originCrs:'BHM',destination:'Bristol Temple Meads',destinationCrs:'BRI',interchanges:[],date:'2026-08-29'},messages:[]});
    Object.assign(events.state,previous);
    return {rows:rows.map(row=>row.title),pressure:result.eventPressure,reasons:result.reasons};
  });
  assert.ok(bristolFixture.rows.some(title=>/Bristol City FC v Portsmouth FC/.test(title)),`29 Aug Bristol fixture should survive fixture caching: ${JSON.stringify(bristolFixture)}`);
  assert.ok(bristolFixture.pressure>0,`Bristol fixture should contribute Forecast v4 event pressure to a 13:32 arrival: ${JSON.stringify(bristolFixture)}`);
  assert.ok(bristolFixture.reasons.some(reason=>/Bristol City FC v Portsmouth FC/.test(reason)),`Forecast reason should name the Bristol fixture: ${JSON.stringify(bristolFixture)}`);


  // Plan My Journey is a separate comparison view over the same timetable
  // provider and Forecast v4. Keep the regression deterministic by replacing
  // only the candidate/event responses used by this comparison.
  await page.waitForSelector('#trainViewTabs');
  await page.evaluate(()=>{
    const provider=window.__KERBSIDE_TIMETABLE_PROVIDER__;
    provider.getCoverage=async()=>({dates:['2026-08-12'],coverage:{'2026-08-12':{from:'00:01',to:'23:59',partial:false}}});
    provider.getJourneyOptions=async options=>{
      window.__KERBSIDE_PLAN_TEST_ARGS__={...options};
      const rows=[
        {serviceID:'PLAN-FAST',std:'09:00',arrival:'10:00',departureMinute:540,arrivalMinute:600,totalMinutes:60,changes:0,journeyType:'direct',operator:'Fast Rail',platform:'4',arrivalPlatform:'9',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}},
        {serviceID:'PLAN-CHANGE',std:'09:05',arrival:'10:12',departureMinute:545,arrivalMinute:612,totalMinutes:67,changes:1,journeyType:'connection',operator:'Change Rail',connectionMinutes:10,minimumConnectionMinutes:7,minimumConnectionSource:'kerbside-planning-buffer',recoveryOptions:[{serviceID:'PLAN-RECOVERY',std:'09:55',arrival:'10:25',operator:'Recovery Rail',platform:'4',arrivalPlatform:'8',from:{name:'Cheltenham Spa',crs:'CNM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}],interchange:{crs:'CNM',name:'Cheltenham Spa',margin:3},legs:[{serviceID:'PLAN-CHANGE-A',std:'09:05',arrival:'09:35',operator:'Change Rail',platform:'5',arrivalPlatform:'1',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Cheltenham Spa',crs:'CNM'}},{serviceID:'PLAN-CHANGE-B',std:'09:45',arrival:'10:12',operator:'Change Rail',platform:'3',arrivalPlatform:'8',from:{name:'Cheltenham Spa',crs:'CNM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}]},
        {serviceID:'PLAN-QUIET',uid:'UID-QUIET',trainId:'1Q10',std:'09:10',arrival:'10:15',departureMinute:550,arrivalMinute:615,totalMinutes:65,changes:0,journeyType:'direct',operator:'Quiet Rail',platform:'6',arrivalPlatform:'10',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}},
        {serviceID:'PLAN-OUTSIDE',std:'12:15',arrival:'13:15',departureMinute:735,arrivalMinute:795,totalMinutes:60,changes:0,journeyType:'direct',operator:'Outside Window Rail',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}
      ];
      Object.defineProperty(rows,'kerbsideSource',{value:'network-rail'});return rows;
    };
    const forecast=window.__KERBSIDE_FORECAST_V4__;
    forecast.forecast=service=>{
      const id=String(service&&service.serviceID||''),lateEvent=window.__KERBSIDE_EVENTS__?.state?.events?.some(event=>/Bristol Arena Concert/.test(String(event&&event.title||'')));
      if(id==='PLAN-QUIET')return lateEvent?{score:1.8,label:'Moderate',level:'moderate',confidence:'High',probabilities:{quiet:.25,moderate:.55,busy:.16,veryBusy:.04},reasons:['Bristol Arena Concert — general event context arrived after the first results']}:{score:.8,label:'Quiet',level:'quiet',confidence:'High',probabilities:{quiet:.75,moderate:.18,busy:.05,veryBusy:.02},reasons:['lower measured demand at this time']};
      if(id.startsWith('PLAN-CHANGE'))return {score:2.1,label:'Moderate',level:'moderate',confidence:'High',probabilities:{quiet:.24,moderate:.56,busy:.16,veryBusy:.04},reasons:['typical measured demand at this time']};
      return {score:3.9,label:'Busy',level:'busy',confidence:'High',probabilities:{quiet:.06,moderate:.19,busy:.58,veryBusy:.17},reasons:['higher measured demand at this time']};
    };
    const events=window.__KERBSIDE_EVENTS__;events.footballEventsFor=async()=>[{title:'Birmingham City v Bristol City',place:'Birmingham',startTime:'10:00',capacity:29000,confidence:.9,type:'football',source:'openfootball (public domain)'}];events.wikidataEventsForJourney=async()=>{await new Promise(resolve=>setTimeout(resolve,650));return [{title:'Bristol Arena Concert',place:'Bristol',startTime:'10:00',capacity:15000,confidence:.8,type:'event',source:'Wikidata (CC0)'}];};
    if(window.__KERBSIDE_TRAIN_TIMETABLE__)window.__KERBSIDE_TRAIN_TIMETABLE__.sync=()=>true;
  });
  await page.click('[data-train-view="plan"]');
  assert.equal(await page.locator('#planJourneyForm').isVisible(),true);
  assert.equal(await page.locator('#trainPlanner').isVisible(),false);
  assert.match(await page.locator('#planJourneyFrom').inputValue(),/Birmingham New Street/);
  assert.match(await page.locator('#planJourneyTo').inputValue(),/Bristol Temple Meads/);
  await page.fill('#planJourneyDate','2026-08-12');
  await page.fill('#planJourneyStart','09:00');
  await page.fill('#planJourneyEnd','11:00');
  await page.selectOption('#planJourneyPreference','quieter');
  await page.click('#planJourneySearch');
  await page.waitForFunction(()=>document.querySelectorAll('#planJourneyResults .plan-journey-result').length===3,undefined,{timeout:10000});
  const resultDates=await page.locator('#planJourneyResults .plan-result-date').allTextContents();
  assert.equal(resultDates.length,3,'every planned result should repeat the selected travel date');
  assert.ok(resultDates.every(text=>/12 Aug 2026/.test(text)),`future result dates should make the selected day explicit: ${JSON.stringify(resultDates)}`);
  const planCards=await page.locator('#planJourneyResults .plan-journey-result').allTextContents();
  const appliedFilter=await page.evaluate(()=>window.__KERBSIDE_PLAN_TEST_ARGS__);
  assert.deepEqual({from:appliedFilter.from,to:appliedFilter.to,date:appliedFilter.date,departAfter:appliedFilter.departAfter,departBefore:appliedFilter.departBefore},{from:'BHM',to:'BRI',date:'2026-08-12',departAfter:'09:00',departBefore:'11:00'});
  assert.equal(planCards.length,3);assert.doesNotMatch(planCards.join(' '),/Outside Window Rail/);
  assert.match(await page.locator('#planJourneyMeta').textContent(),/Wed, 12 Aug 2026 · departures 09:00–11:00/);
  await page.waitForFunction(()=>/Birmingham City v Bristol City/.test(document.querySelector('#planJourneyEvents')?.textContent||''),undefined,{timeout:4000});
  assert.match(await page.locator('#planJourneyEvents').textContent(),/Football · Birmingham City v Bristol City/);
  assert.match(await page.locator('#planJourneyResults .plan-result-events').first().textContent(),/Football · Birmingham City v Bristol City/,'relevant event context should be visible on the result card, not only in the header');
  assert.match(planCards[0],/Quiet Rail/,'Plan My Journey ranks the quiet Forecast v4 option first');
  assert.match(planCards[0],/Best match for Quieter/);
  assert.equal(await page.locator('#planJourneySearch').isDisabled(),false,'initial ranked results must be usable before slow Wikidata settles');
  await page.waitForFunction(()=>/Bristol Arena Concert/.test(document.querySelector('#planJourneyResults')?.textContent||''),undefined,{timeout:4000});
  const readability=await page.evaluate(()=>({reason:parseFloat(getComputedStyle(document.querySelector('.plan-result-reasons')).fontSize),detail:parseFloat(getComputedStyle(document.querySelector('.plan-result-details summary')).fontSize),route:parseFloat(getComputedStyle(document.querySelector('.plan-result-route span')).fontSize)}));
  assert.ok(readability.reason>=11.5&&readability.detail>=11.5&&readability.route>=11.5,`planner secondary text should meet the 0.9.42 readability floor: ${JSON.stringify(readability)}`);
  assert.match(await page.locator('#planJourneyMeta').textContent(),/Network Rail SCHEDULE/);
  assert.match(await page.locator('#planJourneyMeta').textContent(),/Up to 1 change/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('kerbside.rail.plan.preference.v1')),'quieter');
  assert.equal(await page.locator('#planJourneyMaxChanges').inputValue(),'1');
  assert.equal(await page.locator('#planJourneyConnectionBuffer').inputValue(),'0');
  const changeCard=page.locator('#planJourneyResults .plan-journey-result').filter({hasText:'Change Rail'});
  const journeyDetails=changeCard.locator('.plan-result-details');
  assert.equal(await journeyDetails.count(),1,'connection option should expose journey details');
  assert.equal(await journeyDetails.evaluate(node=>node.open),false,'journey details should start collapsed');
  await journeyDetails.locator('summary').click();
  assert.equal(await journeyDetails.evaluate(node=>node.open),true,'journey details should expand');
  const journeyDetailText=await journeyDetails.textContent();
  assert.match(journeyDetailText,/09:05 Birmingham New Street → 09:35 Cheltenham Spa/);
  assert.match(journeyDetailText,/09:45 Cheltenham Spa → 10:12 Bristol Temple Meads/);
  assert.match(journeyDetailText,/Scheduled platforms 5 → 1/);
  assert.match(journeyDetailText,/Change at Cheltenham Spa · 10 min/);
  assert.match(journeyDetailText,/Base minimum 7 min/);
  assert.match(journeyDetailText,/3 min margin/);
  assert.match(journeyDetailText,/Kerbside planning buffer/);
  assert.match(journeyDetailText,/Next: 09:55 → 10:25 · Recovery Rail/);
  assert.match(journeyDetailText,/Ticket validity for an alternative service depends on your ticket/);
  const pureConstraints=await page.evaluate(()=>{const planner=window.__KERBSIDE_JOURNEY_PLANNER__;return {defaults:planner.normalisePlanConstraints(null),direct:planner.planCandidateMeetsConstraints({changes:0},{maxChanges:0,connectionBuffer:15}),bufferPass:planner.planCandidateMeetsConstraints({changes:1,connectionMinutes:12,minimumConnectionMinutes:7},{maxChanges:1,connectionBuffer:5}),bufferFail:planner.planCandidateMeetsConstraints({changes:1,connectionMinutes:11,minimumConnectionMinutes:7},{maxChanges:1,connectionBuffer:5})};});
  assert.deepEqual(pureConstraints,{defaults:{maxChanges:1,connectionBuffer:0},direct:true,bufferPass:true,bufferFail:false});

  await page.selectOption('#planJourneyMaxChanges','0');
  assert.equal(await page.locator('#planJourneyConnectionBuffer').isDisabled(),true,'connection buffer should be disabled for direct-only journeys');
  await page.click('#planJourneySearch');
  await page.waitForFunction(()=>document.querySelectorAll('#planJourneyResults .plan-journey-result').length===2&&/2 of 3 journey options meet your constraints/.test(document.querySelector('#planJourneyMessage')?.textContent||''),undefined,{timeout:10000});
  let constrainedCards=await page.locator('#planJourneyResults .plan-journey-result').allTextContents();
  assert.doesNotMatch(constrainedCards.join(' '),/Change Rail/,'Direct only must remove connection journeys');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.constraints.v1'))),{maxChanges:0,connectionBuffer:0});

  await page.selectOption('#planJourneyMaxChanges','1');
  assert.equal(await page.locator('#planJourneyConnectionBuffer').isDisabled(),false,'connection buffer should return when changes are allowed');
  await page.selectOption('#planJourneyConnectionBuffer','5');
  await page.click('#planJourneySearch');
  await page.waitForFunction(()=>document.querySelectorAll('#planJourneyResults .plan-journey-result').length===2&&/2 of 3 journey options meet your constraints/.test(document.querySelector('#planJourneyMessage')?.textContent||''),undefined,{timeout:10000});
  constrainedCards=await page.locator('#planJourneyResults .plan-journey-result').allTextContents();
  assert.doesNotMatch(constrainedCards.join(' '),/Change Rail/,'extra connection buffer must reject a change that only has three spare minutes');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.constraints.v1'))),{maxChanges:1,connectionBuffer:5});

  await page.selectOption('#planJourneyConnectionBuffer','0');
  await page.click('#planJourneySearch');
  await page.waitForFunction(()=>document.querySelectorAll('#planJourneyResults .plan-journey-result').length===3&&/Compared 3 journey options/.test(document.querySelector('#planJourneyMessage')?.textContent||''),undefined,{timeout:10000});
  constrainedCards=await page.locator('#planJourneyResults .plan-journey-result').allTextContents();
  assert.match(constrainedCards.join(' '),/Change Rail/,'recommended minimum must allow the valid connection again');

  // Saved Journeys v2 keeps the saved object as a locator/intent, moves saved
  // trips into their own tab, refreshes them automatically, and records only a
  // tiny resolved summary for change detection. Forecast/live evidence must
  // never become persisted saved state.
  const quietCard=page.locator('#planJourneyResults .plan-journey-result').filter({hasText:'Quiet Rail'});
  await quietCard.locator('[data-plan-save-key]').click();
  await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1')||'[]').length===1&&Boolean(window.__KERBSIDE_SAVED_JOURNEYS_V2__?.state?.installed);}catch{return false;}});
  let savedJourney=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1'))[0]);
  assert.equal(savedJourney.date,'2026-08-12');
  assert.equal(savedJourney.from.crs,'BHM');assert.equal(savedJourney.to.crs,'BRI');
  assert.equal(savedJourney.service.uid,'UID-QUIET');
  assert.equal(savedJourney.scheduledDeparture,'09:10');
  assert.equal(savedJourney.searchStart,'09:00');assert.equal(savedJourney.searchEnd,'11:00');
  assert.equal(savedJourney.preference,'quieter');
  assert.deepEqual(savedJourney.constraints,{maxChanges:1,connectionBuffer:0});
  assert.doesNotMatch(JSON.stringify(savedJourney),/forecast|probabilities|reasons|lower measured demand/i,'saved journeys must not freeze Forecast v4 output');

  await page.click('[data-train-view="saved"]');
  await page.waitForFunction(()=>document.querySelector('#savedJourneySurface:not([hidden])')&&document.querySelector('#savedJourneyList .saved-v2-card'),undefined,{timeout:10000});
  assert.equal(await page.locator('#planJourneyForm').isHidden(),true,'Plan My Journey form should be hidden in Saved journeys');
  assert.equal(await page.locator('#trainPlanner').isHidden(),true,'normal train planner should be hidden in Saved journeys');
  let savedTabText=await page.locator('#savedJourneySurface').textContent();
  assert.match(savedTabText,/Birmingham New Street → Bristol Temple Meads/);
  assert.match(savedTabText,/09:10 → 10:15/);
  assert.match(savedTabText,/09:00–11:00 · Quieter · Up to 1 change · base connection minimum/,'saved planning intent should be visible');
  await page.waitForFunction(id=>window.__KERBSIDE_SAVED_JOURNEYS_V2__?.state?.meta?.entries?.[id]?.lastResolved?.source==='network-rail',savedJourney.id,{timeout:10000});
  const initialMeta=await page.evaluate(id=>window.__KERBSIDE_SAVED_JOURNEYS_V2__.state.meta.entries[id],savedJourney.id);
  assert.equal(initialMeta.baseline.departure,'09:10');
  assert.equal(initialMeta.baseline.arrival,'10:15');
  assert.equal(initialMeta.baseline.source,'network-rail');
  assert.doesNotMatch(JSON.stringify(initialMeta),/probabilities|reasons|liveEvidence/i,'Saved Journeys v2 metadata must not persist Forecast/live evidence');

  const lifecycle=await page.evaluate(()=>{
    const api=window.__KERBSIDE_SAVED_JOURNEYS_V2__;
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const shift=days=>{const d=new Date(`${today}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
    return {
      planned:api.statusFor({date:shift(7)},{source:'network-rail',departure:'09:00'},'exact',[],null),
      liveSoon:api.statusFor({date:shift(1)},{source:'darwin',departure:'09:00'},'identity',[],null),
      today:api.statusFor({date:today},{source:'darwin',departure:'09:00'},'exact',[],{etd:'On time'}),
      delayed:api.statusFor({date:today},{source:'darwin',departure:'09:00'},'exact',[],{etd:'Delayed'}),
      cancelled:api.statusFor({date:today},{source:'darwin',departure:'09:00'},'exact',[],{isCancelled:true}),
      alternative:api.statusFor({date:shift(1)},{source:'darwin',departure:'09:20'},'alternative',[],null),
      expired:api.statusFor({date:shift(-1)},{source:'darwin',departure:'09:00'},'exact',[],null)
    };
  });
  assert.deepEqual(lifecycle,{planned:'planned',liveSoon:'live-soon',today:'today',delayed:'delayed',cancelled:'cancelled',alternative:'alternative',expired:'expired'});

  await page.evaluate(()=>{
    const provider=window.__KERBSIDE_TIMETABLE_PROVIDER__;
    provider.getJourneyOptions=async options=>{
      window.__KERBSIDE_PLAN_TEST_ARGS__={...options};
      const rows=[
        {serviceID:'PLAN-FAST',std:'09:00',arrival:'10:00',departureMinute:540,arrivalMinute:600,totalMinutes:60,changes:0,journeyType:'direct',operator:'Fast Rail',platform:'4',arrivalPlatform:'9',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}},
        {serviceID:'PLAN-CHANGE',std:'09:05',arrival:'10:12',departureMinute:545,arrivalMinute:612,totalMinutes:67,changes:1,journeyType:'connection',operator:'Change Rail',connectionMinutes:10,minimumConnectionMinutes:7,minimumConnectionSource:'kerbside-planning-buffer',recoveryOptions:[],interchange:{crs:'CNM',name:'Cheltenham Spa',margin:3},legs:[{serviceID:'PLAN-CHANGE-A',std:'09:05',arrival:'09:35',operator:'Change Rail',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Cheltenham Spa',crs:'CNM'}},{serviceID:'PLAN-CHANGE-B',std:'09:45',arrival:'10:12',operator:'Change Rail',from:{name:'Cheltenham Spa',crs:'CNM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}]},
        {serviceID:'PLAN-QUIET-DARWIN',uid:'UID-QUIET',trainId:'1Q10',std:'09:14',arrival:'10:19',departureMinute:554,arrivalMinute:619,totalMinutes:65,changes:0,journeyType:'direct',operator:'Quiet Rail',platform:'7',arrivalPlatform:'10',from:{name:'Birmingham New Street',crs:'BHM'},to:{name:'Bristol Temple Meads',crs:'BRI'}}
      ];Object.defineProperty(rows,'kerbsideSource',{value:'darwin'});return rows;
    };
    window.__KERBSIDE_FORECAST_V4__.forecast=service=>{
      if(String(service&&service.uid||'')==='UID-QUIET')return {score:1.8,label:'Moderate',level:'moderate',confidence:'High',probabilities:{quiet:.30,moderate:.55,busy:.12,veryBusy:.03},reasons:['updated demand closer to travel']};
      if(String(service&&service.serviceID||'').startsWith('PLAN-CHANGE'))return {score:2.1,label:'Moderate',level:'moderate',confidence:'High',probabilities:{quiet:.24,moderate:.56,busy:.16,veryBusy:.04},reasons:['typical measured demand at this time']};
      return {score:3.9,label:'Busy',level:'busy',confidence:'High',probabilities:{quiet:.06,moderate:.19,busy:.58,veryBusy:.17},reasons:['higher measured demand at this time']};
    };
  });
  await page.locator('#savedJourneyList [data-saved-v2-refresh]').click();
  await page.waitForFunction(id=>window.__KERBSIDE_SAVED_JOURNEYS_V2__?.state?.meta?.entries?.[id]?.lastResolved?.source==='darwin',savedJourney.id,{timeout:10000});
  savedTabText=await page.locator('#savedJourneySurface').textContent();
  assert.match(savedTabText,/09:14 → 10:19/);
  assert.match(savedTabText,/Darwin/);
  assert.match(savedTabText,/Departure changed from 09:10 to 09:14/);
  assert.match(savedTabText,/Arrival changed from 10:15 to 10:19/);
  assert.match(savedTabText,/Now covered by Darwin/,'saved journey should explain the automatic long-range to Darwin upgrade');
  savedJourney=await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1'))[0]);
  assert.equal(savedJourney.service.serviceID,'PLAN-QUIET-DARWIN','automatic strong UID refresh should carry the Darwin service locator forward');
  assert.equal(savedJourney.scheduledDeparture,'09:14');
  assert.doesNotMatch(JSON.stringify(savedJourney),/forecast|probabilities|reasons|updated demand/i);
  const v2Meta=await page.evaluate(id=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved-meta.v2')).entries[id],savedJourney.id);
  assert.equal(v2Meta.baseline.departure,'09:10','change baseline should remain the originally saved timetable time');
  assert.equal(v2Meta.lastResolved.departure,'09:14');
  assert.equal(v2Meta.lastResolved.source,'darwin');
  assert.doesNotMatch(JSON.stringify(v2Meta),/probabilities|reasons|updated demand|platform|etd/i,'change metadata must remain a tiny scheduled summary');

  await page.locator('#savedJourneyList [data-saved-v2-open]').click();
  await page.waitForFunction(()=>/09:14/.test(document.querySelector('#planJourneyResults .plan-journey-result.is-saved-focus')?.textContent||''),undefined,{timeout:10000});
  const refreshedSavedCard=await page.locator('#planJourneyResults .plan-journey-result.is-saved-focus').textContent();
  assert.match(refreshedSavedCard,/09:14 → 10:19/);
  assert.match(refreshedSavedCard,/Moderate/,'saved journey must use the newly calculated Forecast v4 result');
  assert.match(refreshedSavedCard,/Saved journey · refreshed from current data/);
  assert.match(await page.locator('#planJourneyMessage').textContent(),/latest available information/);

  const fallbackMatch=await page.evaluate(()=>{
    const planner=window.__KERBSIDE_JOURNEY_PLANNER__,saved=planner.readSavedJourneys()[0];
    const nearby={serviceID:'OTHER-SERVICE',uid:'OTHER-UID',trainId:'9Z99',std:'09:20',arrival:'10:24',departureMinute:560,arrivalMinute:624,totalMinutes:64,changes:0,journeyType:'direct'};
    const far={...nearby,serviceID:'FAR',std:'11:00',departureMinute:660,arrivalMinute:724};
    return {near:planner.planMatchSavedJourney(saved,[nearby])?.confidence||'',far:planner.planMatchSavedJourney(saved,[far])};
  });
  assert.equal(fallbackMatch.near,'closest','a nearby service without stable identity must be labelled only as a closest match');
  assert.equal(fallbackMatch.far,null,'distant alternatives must not be silently substituted for a saved train');

  await page.click('[data-train-view="saved"]');
  await page.waitForFunction(()=>document.querySelector('#savedJourneySurface:not([hidden])')&&document.querySelector('#savedJourneyList .saved-v2-card'),undefined,{timeout:10000});
  await page.waitForSelector('#savedJourneyList [data-saved-polish-delete]');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#savedJourneyList [data-saved-polish-delete]').click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kerbside.rail.plan.saved.v1'))),[]);
  assert.match(await page.locator('#savedJourneySurface').textContent(),/No saved journeys yet/);

  await page.click('[data-train-view="trains"]');
  assert.equal(await page.locator('#trainPlanner').isVisible(),true,'normal train planner should be restored after leaving Plan My Journey');

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=1,`combined train planner should not overflow mobile viewport; got ${overflow}px`);
  assert.deepEqual(diagnostics.pageErrors,[],`Unexpected page errors: ${diagnostics.pageErrors.join('\n')}`);
  console.log(`Kerbside combined train journey planner and event-pressure regression passed in ${browserName}.`);
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
