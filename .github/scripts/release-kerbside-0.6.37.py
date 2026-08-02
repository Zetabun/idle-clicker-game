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
bus = replace_once(bus, "const APP_VERSION = '0.6.36';", "const APP_VERSION = '0.6.37';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.36 also falls back immediately to the normal 9 km live feed when an expanded 18 km scan fails, while every expanded attempt now observes the 45-second cooldown instead of retrying on each poll.",
    "Version 0.6.37 also supplements any incomplete split 18 km scan with the normal 9 km box, retaining successful distant results while restoring nearby coverage from the failed half.",
    'coverage release note'
)
bus = replace_once(
    bus,
    "return {successful:[],failure:{soft:true,msg:'No Worker URL or local API key is configured.'}};",
    "return {requested:0,successful:[],failure:{soft:true,msg:'No Worker URL or local API key is configured.'}};",
    'empty batch count'
)
bus = replace_once(
    bus,
    "  return {\n    successful:settled.filter(result=>result.status==='fulfilled').map(result=>result.value),\n    failure:(settled.find(result=>result.status==='rejected')||{}).reason||{soft:true,msg:'Could not reach the live feed.'}\n  };",
    "  return {\n    requested:urls.length,\n    successful:settled.filter(result=>result.status==='fulfilled').map(result=>result.value),\n    failure:(settled.find(result=>result.status==='rejected')||{}).reason||{soft:true,msg:'Could not reach the live feed.'}\n  };",
    'batch request count'
)
old_fallback = """  // Expanded scans are optional discovery work. If every wide request fails,
  // retry the ordinary nearby box immediately so a distant outage cannot
  // blank an otherwise healthy local departure board.
  if(wide&&!batch.successful.length&&!(signal&&signal.aborted)){
    batch=await fetchLiveBatch(false,signal);
  }
"""
new_fallback = """  // Expanded scans are optional discovery work. Any missing split box is
  // supplemented with the ordinary nearby box, retaining successful distant
  // results while restoring complete local coverage around the selected stop.
  if(wide&&batch.successful.length<batch.requested&&!(signal&&signal.aborted)){
    const nearby=await fetchLiveBatch(false,signal);
    batch={
      requested:batch.requested,
      successful:[...batch.successful,...nearby.successful],
      failure:batch.successful.length?(batch.failure||nearby.failure):(nearby.failure||batch.failure)
    };
  }
"""
bus = replace_once(bus, old_fallback, new_fallback, 'partial wide supplement')
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.36"', '"version": "0.6.37"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.36'", "version: '0.6.37'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.36');", "assert.equal(body.version, '0.6.37');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.36'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.37'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.match(busSource, /batch=await fetchLiveBatch\\(false,signal\\)/);",
    "assert.match(busSource, /requested:urls\\.length/);\nassert.match(busSource, /batch\\.successful\\.length<batch\\.requested/);\nassert.match(busSource, /successful:\\[\\.\\.\\.batch\\.successful,\\.\\.\\.nearby\\.successful\\]/);",
    'partial recovery static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.36'", "version: '0.6.37'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.36')", "includes('app 0.6.37')", 'browser settings version')

route_pattern = r"  await page\.route\(/\^https:\\\/\\\/kerbside-bus\\\.adambullas\\\.workers\\\.dev\\\/\\\?bbox=/, route => \{.*?  \}\);\n\n  await page\.goto"
route_replacement = r"""  await page.route(/^https:\/\/kerbside-bus\.adambullas\.workers\.dev\/\?bbox=/, route => {
    const url=new URL(route.request().url());
    const box=(url.searchParams.get('bbox')||'').split(',').map(Number);
    const latitudeSpan=box.length===4?box[3]-box[1]:0;
    const liveXml=(operator,vehicle,lat)=>{
      const recorded=new Date().toISOString();
      return `<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery><VehicleActivity>
        <RecordedAtTime>${recorded}</RecordedAtTime><MonitoredVehicleJourney><LineRef>9</LineRef><PublishedLineName>9</PublishedLineName>
        <OperatorRef>${operator}</OperatorRef><VehicleRef>${vehicle}</VehicleRef><DatedVehicleJourneyRef>${vehicle}-trip</DatedVehicleJourneyRef>
        <DestinationName>Town Centre</DestinationName><VehicleLocation><Longitude>-2.1000</Longitude><Latitude>${lat}</Latitude></VehicleLocation>
        <Bearing>0</Bearing></MonitoredVehicleJourney></VehicleActivity></VehicleMonitoringDelivery></ServiceDelivery></Siri>`;
    };
    if(latitudeSpan>0.25){
      wideFeedRequests++;
      if(wideFeedRequests===1) return route.fulfill({status:200,contentType:'application/xml',body:liveXml('WIDE','wide-1','52.6000')});
      return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'synthetic partial wide outage'})});
    }
    nearbyFeedRequests++;
    return route.fulfill({status:200,contentType:'application/xml',body:liveXml('NEAR','nearby-1','52.5010')});
  });

  await page.goto"""
browser_test = sub_once(browser_test, route_pattern, route_replacement, 'partial wide network fixture')
old_assert = """  assert.deepEqual(wideFallback,{count:1,id:'TEST|vehicle|nearby-1',cooldown:true});
  assert.ok(wideFeedRequests>=1);
  assert.equal(nearbyFeedRequests,1);
"""
new_assert = """  assert.deepEqual(wideFallback,{count:2,ids:['NEAR|vehicle|nearby-1','WIDE|vehicle|wide-1'],cooldown:true});
  assert.ok(wideFeedRequests>=2);
  assert.equal(nearbyFeedRequests,1);
"""
browser_test = replace_once(
    browser_test,
    "return {count:vehicles.length,id:vehicles[0]?.id,cooldown:Date.now()-state.lastWideFetch<5000};",
    "return {count:vehicles.length,ids:vehicles.map(vehicle=>vehicle.id).sort(),cooldown:Date.now()-state.lastWideFetch<5000};",
    'partial wide result shape'
)
browser_test = replace_once(browser_test, old_assert, new_assert, 'partial wide assertions')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.37 completes expanded-scan recovery for partial failures. If one split 18 km box succeeds and another fails, the ordinary 9 km box is fetched once and merged with the successful distant response. SIRI identity deduplication keeps the newest copy of overlapping vehicles while preserving unique distant and nearby buses. WebKit verifies one wide success, one wide failure and one nearby supplement in the same refresh.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.37 partial wide recovery release')
