from pathlib import Path

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


bus_path = 'bus.html'
bus = read(bus_path)
bus = replace_once(bus, "const APP_VERSION = '0.6.43';", "const APP_VERSION = '0.6.44';", 'browser version')
bus = replace_once(
    bus,
    "Version 0.6.43 also validates the complete national timetable manifest and keeps a recent last-known-good copy, so malformed or incomplete data deployments cannot replace working timetable coverage.",
    "Version 0.6.44 also identifies live buses by their globally unique journey reference before falling back to the vehicle code, so several buses running the same route remain separate even when an operator reuses a generic VehicleRef.",
    'coverage release note'
)
old_identity = """function liveVehicleIdentity(fields){
  const operator=String(fields&&fields.OperatorRef||'').trim();
  const vehicle=String(fields&&fields.VehicleRef||'').trim();
  const journey=String(fields&&(fields.DatedVehicleJourneyRef||fields.VehicleJourneyRef)||'').trim();
  if(vehicle) return (operator?operator+'|':'')+'vehicle|'+vehicle;
  if(journey) return (operator?operator+'|':'')+'journey|'+journey;
  return '';
}
"""
new_identity = """function liveVehicleIdentity(fields){
  const operator=String(fields&&fields.OperatorRef||'').trim();
  const producer=String(fields&&fields.ProducerRef||'').trim();
  const vehicle=String(fields&&fields.VehicleRef||'').trim();
  const journey=String(fields&&(fields.DatedVehicleJourneyRef||fields.VehicleJourneyRef)||'').trim();
  const item=String(fields&&fields.ItemIdentifier||'').trim();
  const owner=operator||producer||'unknown';
  // BODS specifies VehicleJourneyRef as globally unique. Use it before the
  // physical vehicle code because some real feeds reuse placeholder or fleet
  // values in VehicleRef across several simultaneous journeys.
  if(journey) return owner+'|journey|'+journey;
  if(vehicle) return owner+'|vehicle|'+vehicle;
  if(item) return owner+'|item|'+item;
  return '';
}
"""
bus = replace_once(bus, old_identity, new_identity, 'journey-first live identity')
bus = replace_once(
    bus,
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads,fetchLive,liveState:S};",
    "window.__KERBSIDE_TEST__={...(window.__KERBSIDE_TEST__||{}),liveVehicleIdentity,parseLivePayloads,fetchLive,ingest,relevant,liveState:S};",
    'multi-vehicle test hooks'
)
write(bus_path, bus)

package_path = 'kerbside-backend/package.json'
write(package_path, replace_once(read(package_path), '"version": "0.6.43"', '"version": "0.6.44"', 'package version'))
worker_path = 'kerbside-backend/src/worker.js'
write(worker_path, replace_once(read(worker_path), "version: '0.6.43'", "version: '0.6.44'", 'Worker health version'))
worker_test_path = 'kerbside-backend/test/worker.test.js'
write(worker_test_path, replace_once(read(worker_test_path), "assert.equal(body.version, '0.6.43');", "assert.equal(body.version, '0.6.44');", 'Worker test version'))

browser_test_path = 'kerbside-backend/tests/browser-regression.mjs'
browser_test = read(browser_test_path)
browser_test = replace_once(browser_test, "assert.match(busSource, /const APP_VERSION = '0\\.6\\.43'/);", "assert.match(busSource, /const APP_VERSION = '0\\.6\\.44'/);", 'browser static version')
browser_test = replace_once(
    browser_test,
    "assert.doesNotMatch(busSource, /cache:force\\?'reload':'force-cache'/);",
    "assert.doesNotMatch(busSource, /cache:force\\?'reload':'force-cache'/);\nassert.match(busSource, /if\\(journey\\) return owner\\+'\\|journey\\|'\\+journey/);\nassert.match(busSource, /if\\(vehicle\\) return owner\\+'\\|vehicle\\|'\\+vehicle/);\nassert.match(busSource, /fetchLive,ingest,relevant,liveState:S/);\nassert.doesNotMatch(busSource, /if\\(vehicle\\) return \\(operator\\?operator\\+'\\|':\'\'\\)\\+'vehicle\\|'\\+vehicle;\\n  if\\(journey\\)/);",
    'multi-vehicle static checks'
)
browser_test = replace_once(browser_test, "version: '0.6.43'", "version: '0.6.44'", 'browser mocked Worker version')
browser_test = replace_once(browser_test, "includes('app 0.6.43')", "includes('app 0.6.44')", 'browser settings version')

fixture = r"""  const multiVehicleBoard = await page.evaluate(() => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,now=Date.now();
    const activity=(index)=>`<VehicleActivity><RecordedAtTime>${new Date(now-index*1000).toISOString()}</RecordedAtTime>
      <MonitoredVehicleJourney><LineRef>9</LineRef><PublishedLineName>9</PublishedLineName>
      <OperatorRef>OP-FIVE</OperatorRef><VehicleRef>SHARED-FLEET-CODE</VehicleRef>
      <DatedVehicleJourneyRef>route-9-trip-${index}</DatedVehicleJourneyRef><DestinationName>Town Centre</DestinationName>
      <VehicleLocation><Longitude>-2.1000</Longitude><Latitude>${52.4988+index*.00012}</Latitude></VehicleLocation>
      <Bearing>0</Bearing><Velocity>6</Velocity></MonitoredVehicleJourney></VehicleActivity>`;
    const xml=`<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><VehicleMonitoringDelivery>${[1,2,3,4,5].map(activity).join('')}</VehicleMonitoringDelivery></ServiceDelivery></Siri>`;
    const parsed=api.parseLivePayloads([{text:xml}],now);
    const saved={
      stop:state.stop,origin:state.origin,anchor:state.anchor,dir:state.dir,onlyServing:state.onlyServing,
      destFilter:state.destFilter,ttStop:state.ttStop,timetable:state.timetable,timetableRun:state.timetableRun,
      vehicles:state.vehicles,hideAway:state.hideAway,demo:state.demo,liveDiag:state.liveDiag,filterFellBack:state.filterFellBack
    };
    const at=new Date(now),base=at.getHours()*60+at.getMinutes()+4;
    state.stop={id:'multi-bus-stop',lat:52.5,lon:-2.1,name:'Multi bus stop',d:0};
    state.origin={lat:52.5,lon:-2.1,label:'Test'};state.anchor=null;state.dir='all';state.onlyServing=true;
    state.destFilter=null;state.hideAway=true;state.demo=false;state.vehicles=new Map();
    state.ttStop={id:'multi-bus-stop',d:parsed.vehicles.map((vehicle,index)=>[
      base+index*3,'9','Town Centre','daily','',vehicle.journey,''
    ])};
    state.timetable={services:{daily:{days:'1111111',start:'20260101',end:'20261231',add:[],remove:[]}},tripPatterns:{},patterns:{}};
    state.timetableRun=Number(state.timetableRun||0)+1;
    try{
      api.ingest(parsed.vehicles);
      const rows=api.relevant();
      return {
        parsed:parsed.vehicles.length,
        parsedIds:parsed.vehicles.map(vehicle=>vehicle.id).sort(),
        stored:state.vehicles.size,
        shown:rows.length,
        shownIds:rows.map(row=>row.v.id).sort(),
        lines:[...new Set(rows.map(row=>row.v.line))]
      };
    }finally{
      Object.assign(state,saved);
    }
  });
  assert.deepEqual(multiVehicleBoard,{
    parsed:5,
    parsedIds:[1,2,3,4,5].map(index=>`OP-FIVE|journey|route-9-trip-${index}`),
    stored:5,shown:5,
    shownIds:[1,2,3,4,5].map(index=>`OP-FIVE|journey|route-9-trip-${index}`),
    lines:['9']
  });

"""
browser_test = replace_once(browser_test, "  const wideFallback = await page.evaluate(async () => {", fixture + "  const wideFallback = await page.evaluate(async () => {", 'executed five-vehicle fixture')
write(browser_test_path, browser_test)

readme_path = 'kerbside-backend/README.md'
readme = read(readme_path)
readme_note = "Kerbside 0.6.44 fixes live multi-vehicle identity. The DfT SIRI-VM profile defines `VehicleJourneyRef` as globally unique, while `VehicleRef` identifies the physical vehicle. Kerbside previously preferred `VehicleRef`, allowing a non-compliant operator that reused a placeholder or fleet code to collapse several simultaneous journeys into one record. Live identity now uses operator plus journey first, then falls back to vehicle and item identifiers only when no journey reference exists. WebKit parses five simultaneous route-9 activities with one shared vehicle code and verifies all five survive ingestion, stop matching and board-row generation.\n\n"
readme = replace_once(readme, 'The Worker remains backwards-compatible for live data:\n', readme_note + 'The Worker remains backwards-compatible for live data:\n', 'README release note')
write(readme_path, readme)

print('Prepared Kerbside 0.6.44 multi-vehicle release')
