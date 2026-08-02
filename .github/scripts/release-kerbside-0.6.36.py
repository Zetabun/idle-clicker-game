from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one regex match, found {count}')
    return updated


bus_path = 'bus.html'
bus = read(bus_path)
bus = replace_once(bus, "const APP_VERSION = '0.6.35';", "const APP_VERSION = '0.6.36';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.35 also parses namespaced SIRI-VM payloads through an executed fixture suite and scopes vehicle identities by operator, preventing two operators that reuse the same VehicleRef from overwriting one another.",
    "Version 0.6.36 also falls back immediately to the normal 9 km live feed when an expanded 18 km scan fails, while every expanded attempt now observes the 45-second cooldown instead of retrying on each poll.",
    'coverage release note'
)
bus = replace_once(
    bus,
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads};",
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads,fetchLive,liveState:S};",
    'test live API exposure'
)

fetch_pattern = r"async function fetchLive\(signal\)\{.*?\n\}\n\n/\* ============================================================\n   Simulator"
fetch_replacement = """async function fetchLiveBatch(wide,signal){
  const urls=feedUrls(wide);
  if(!urls.length){
    return {successful:[],failure:{soft:true,msg:'No Worker URL or local API key is configured.'}};
  }
  const settled=await Promise.allSettled(urls.map(url=>fetchLiveResponse(url,signal)));
  return {
    successful:settled.filter(result=>result.status==='fulfilled').map(result=>result.value),
    failure:(settled.find(result=>result.status==='rejected')||{}).reason||{soft:true,msg:'Could not reach the live feed.'}
  };
}
async function fetchLive(signal){
  S.feedFallback=false;
  const wide=Date.now()-S.lastWideFetch>=FAR_FETCH_INTERVAL_MS;
  if(wide) S.lastWideFetch=Date.now();
  let batch=await fetchLiveBatch(wide,signal);
  // Expanded scans are optional discovery work. If every wide request fails,
  // retry the ordinary nearby box immediately so a distant outage cannot
  // blank an otherwise healthy local departure board.
  if(wide&&!batch.successful.length&&!(signal&&signal.aborted)){
    batch=await fetchLiveBatch(false,signal);
  }
  const successful=batch.successful;
  if(!successful.length) throw batch.failure;
  S.feedFallback=successful.some(item=>item.fallback);
  const parsed=parseLivePayloads(successful,Date.now());
  const out=parsed.vehicles;
  S.feedStale=parsed.stale;S.feedUnknownAge=parsed.unknownAge;
  if(!out.length&&parsed.malformed===successful.length) throw {soft:true,msg:'The live feed returned malformed XML.'};
  if(!out.length&&(parsed.stale||parsed.unknownAge)) throw {soft:true,msg:'BODS returned no fresh timestamped vehicle positions, so Kerbside hid them instead of showing ghost buses.'};
  if(!out.length) throw {soft:true,msg:'The live feed returned no usable vehicle positions for this area.'};
  return out;
}

/* ============================================================
   Simulator"""
bus = sub_once(bus, fetch_pattern, fetch_replacement, 'wide live fallback')
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
package = replace_once(read(package_path), '"version": "0.6.35"', '"version": "0.6.36"', 'package version')
write(package_path, package)

worker_path = 'kerbside-backend/src/worker.js'
worker = replace_once(read(worker_path), "version: '0.6.35'", "version: '0.6.36'", 'Worker health version')
write(worker_path, worker)

worker_test_path = 'kerbside-backend/test/worker.test.js'
worker_test = replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.35');", "assert.equal(body.version, '0.6.36');", 'Worker test version')
write(worker_test_path, worker_test)

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.35'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.36'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /const id = f\\.VehicleRef \\|\\| journey/);",
    "assert.doesNotMatch(busSource, /const id = f\\.VehicleRef \\|\\| journey/);\nassert.match(busSource, /async function fetchLiveBatch\\(wide,signal\\)/);\nassert.match(busSource, /if\\(wide\\) S\\.lastWideFetch=Date\\.now\\(\\)/);\nassert.match(busSource, /batch=await fetchLiveBatch\\(false,signal\\)/);\nassert.match(busSource, /liveState:S/);",
    'wide fallback static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.35'", "version: '0.6.36'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.35')", "includes('app 0.6.36')", 'browser settings version')
browser_test = replace_once(
    browser_test,
    "let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0;",
    "let leafletCdnRequests = 0, cartoTileRequests = 0, osmTileRequests = 0, wideFeedRequests = 0, nearbyFeedRequests = 0;",
    'feed request counters'
)

feed_route = r"""  await page.route(/^https:\/\/kerbside-bus\.adambullas\.workers\.dev\/\?bbox=/, route => {
    const url=new URL(route.request().url());
    const box=(url.searchParams.get('bbox')||'').split(',').map(Number);
    const latitudeSpan=box.length===4?box[3]-box[1]:0;
    if(latitudeSpan>0.25){
      wideFeedRequests++;
      return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'synthetic wide outage'})});
    }
    nearbyFeedRequests++;
    const recorded=new Date().toISOString();
    const body=`<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery><VehicleActivity>
      <RecordedAtTime>${recorded}</RecordedAtTime><MonitoredVehicleJourney><LineRef>9</LineRef><PublishedLineName>9</PublishedLineName>
      <OperatorRef>TEST</OperatorRef><VehicleRef>nearby-1</VehicleRef><DatedVehicleJourneyRef>nearby-trip</DatedVehicleJourneyRef>
      <DestinationName>Town Centre</DestinationName><VehicleLocation><Longitude>-2.1000</Longitude><Latitude>52.5010</Latitude></VehicleLocation>
      <Bearing>0</Bearing></MonitoredVehicleJourney></VehicleActivity></VehicleMonitoringDelivery></ServiceDelivery></Siri>`;
    return route.fulfill({status:200,contentType:'application/xml',body});
  });

"""
browser_test = replace_once(browser_test, "\n\n  await page.goto(`http://127.0.0.1:${address.port}/bus.html`, { waitUntil: 'domcontentloaded' });", "\n\n" + feed_route + "  await page.goto(`http://127.0.0.1:${address.port}/bus.html`, { waitUntil: 'domcontentloaded' });", 'feed route fixture')

wide_test = r"""  const wideFallback = await page.evaluate(async () => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState;
    const saved={
      stop:state.stop,origin:state.origin,proxy:state.proxy,key:state.key,lastWideFetch:state.lastWideFetch,
      feedFallback:state.feedFallback,feedStale:state.feedStale,feedUnknownAge:state.feedUnknownAge
    };
    state.stop={id:'test-stop',lat:52.5,lon:-2.1,name:'Test stop'};
    state.origin={lat:52.5,lon:-2.1,label:'Test'};
    state.proxy='https://kerbside-bus.adambullas.workers.dev';
    state.key='';state.lastWideFetch=0;
    try{
      const vehicles=await api.fetchLive();
      return {count:vehicles.length,id:vehicles[0]?.id,cooldown:Date.now()-state.lastWideFetch<5000};
    }finally{
      Object.assign(state,saved);
    }
  });
  assert.deepEqual(wideFallback,{count:1,id:'TEST|vehicle|nearby-1',cooldown:true});
  assert.ok(wideFeedRequests>=1);
  assert.equal(nearbyFeedRequests,1);

"""
browser_test = replace_once(browser_test, "  const tripMatching = await page.evaluate(() => {", wide_test + "  const tripMatching = await page.evaluate(() => {", 'executed wide fallback fixture')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.36 makes the periodic expanded live scan fail open. Every 18 km attempt records its 45-second cooldown immediately, including partial or complete failures. When all expanded requests fail, the browser retries the ordinary 9 km box in the same poll, so distant-feed trouble cannot blank healthy nearby departures or create repeated wide-request bursts. WebKit forces the expanded requests to fail and verifies the nearby SIRI response is still returned.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.36 wide-feed fallback release')
