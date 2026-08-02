from pathlib import Path

R = Path(__file__).resolve().parents[2]
B = R / 'bus.html'
T = R / 'kerbside-backend/tests/browser-regression.mjs'
D = R / 'kerbside-backend/README.md'
P = R / 'kerbside-backend/package.json'
W = R / 'kerbside-backend/src/worker.js'
WT = R / 'kerbside-backend/test/worker.test.js'


def rep(text, old, new, name):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{name}: expected one match, found {count}')
    return text.replace(old, new, 1)


s = B.read_text()
s = rep(s, "const APP_VERSION = '0.6.49';", "const APP_VERSION = '0.6.50';", 'app version')
s = rep(
    s,
    "  feedStale:0, feedUnknownAge:0, workerOk:null, workerVersion:'', workerBods:false, liveDiag:null,\n",
    "  feedStale:0, feedUnknownAge:0, feedEmptyReason:'', workerOk:null, workerVersion:'', workerBods:false, liveDiag:null,\n",
    'empty feed state',
)
s = rep(
    s,
    "async function fetchLive(signal){\n  S.feedFallback=false;\n",
    "async function fetchLive(signal){\n  S.feedFallback=false; S.feedEmptyReason='';\n",
    'reset empty feed state',
)
s = rep(
    s,
    "  if(!out.length&&(parsed.stale||parsed.unknownAge)) throw {soft:true,msg:'BODS returned no fresh timestamped vehicle positions, so Kerbside hid them instead of showing ghost buses.'};\n  if(!out.length) throw {soft:true,msg:'The live feed returned no usable vehicle positions for this area.'};\n  return out;\n",
    "  if(!out.length&&(parsed.stale||parsed.unknownAge)){\n    S.feedEmptyReason='No fresh timestamped GPS positions were reported in the latest feed.';\n    return [];\n  }\n  if(!out.length){\n    S.feedEmptyReason='No buses were reported in the latest feed for this area.';\n    return [];\n  }\n  return out;\n",
    'valid empty feed handling',
)
s = rep(
    s,
    "    const updated=' · updated '+formatClock(S.lastFeedAt), cached=S.feedFallback?' · cached during BODS outage':'';\n    setStatus(S.demo?'Simulated · '+S.vehicles.size+' buses':'Live · '+fresh+' fresh'+delayedText+hidden+tt+cached+updated,S.demo?'demo':'');\n",
    "    const updated=' · updated '+formatClock(S.lastFeedAt), cached=S.feedFallback?' · cached during BODS outage':'';\n    const liveStatus=!list.length&&fresh===0&&!delayed\n      ? 'Live · no fresh buses reported'+tt+cached+updated\n      : 'Live · '+fresh+' fresh'+delayedText+hidden+tt+cached+updated;\n    setStatus(S.demo?'Simulated · '+S.vehicles.size+' buses':liveStatus,S.demo?'demo':'');\n",
    'successful empty status',
)
s = rep(
    s,
    "      const msg=e&&e.msg?e.msg:'The live feed could not be reached.';\n      const scheduled=S.ttStop&&timetableRows(new Date()).some(row=>row.at>Date.now()-60000&&row.at<Date.now()+3*3600000);\n      setStatus(scheduled?'Live unavailable · scheduled times shown':'Feed problem','err');\n",
    "      const msg=e&&e.msg?e.msg:'The live feed could not be reached.';\n      const scheduled=S.ttStop&&timetableRows(new Date()).some(row=>row.at>Date.now()-60000&&row.at<Date.now()+3*3600000);\n      const retained=[...S.vehicles.values()].some(v=>Date.now()-v.ts<=MAX_AGE_MS+GPS_RESULT_GRACE_MS);\n      setStatus(scheduled?'Live unavailable · scheduled times shown':retained?'Live feed delayed · last GPS retained':'Live feed unavailable · retrying','err');\n",
    'specific failure status',
)
B.write_text(s)

P.write_text(rep(P.read_text(), '"version": "0.6.49"', '"version": "0.6.50"', 'package version'))
W.write_text(rep(W.read_text(), "version: '0.6.49'", "version: '0.6.50'", 'worker version'))
WT.write_text(rep(WT.read_text(), "body.version, '0.6.49'", "body.version, '0.6.50'", 'worker test version'))

readme = D.read_text()
anchor = 'Kerbside 0.6.49 prevents verified GPS results from disappearing during short operator-feed gaps and makes ETA direction checks stricter.'
pos = readme.find(anchor)
if pos < 0:
    raise SystemExit('README anchor not found')
end = readme.find('\n', pos)
note = (
    "\n\nKerbside 0.6.50 separates a healthy empty BODS response from a genuine feed failure. "
    "Valid XML with no fresh vehicles now reports `Live · no fresh buses reported` and retains any still-valid prior GPS rows instead of showing `Feed problem`. "
    "Real Worker, network or upstream failures now state `Live feed delayed · last GPS retained` or `Live feed unavailable · retrying`, while scheduled departures remain available when present. "
    "WebKit verifies that valid empty SIRI XML returns an empty live result without entering the error path."
)
readme = readme[:end] + note + readme[end:]
D.write_text(readme)

t = T.read_text()
t = rep(t, "const APP_VERSION = '0\\.6\\.49'", "const APP_VERSION = '0\\.6\\.50'", 'browser app version')
t = rep(t, "version: '0.6.49'", "version: '0.6.50'", 'browser health version')
t = rep(t, 'app 0.6.49', 'app 0.6.50', 'browser app status')
static_anchor = "assert.match(busSource, /v\\.progressPattern/);\n"
t = rep(
    t,
    static_anchor,
    static_anchor
    + "assert.match(busSource, /Live · no fresh buses reported/);\n"
    + "assert.match(busSource, /Live feed delayed · last GPS retained/);\n"
    + "assert.doesNotMatch(busSource, /setStatus\\(scheduled\\?'Live unavailable · scheduled times shown':'Feed problem'/);\n",
    'browser static feed assertions',
)
insert_anchor = "  assert.equal(gpsFixes.corridor,true);assert.equal(gpsFixes.live,1);assert.equal(gpsFixes.progress,true);assert.equal(gpsFixes.held,true);assert.equal(gpsFixes.away,false);\n\n"
empty_test = """  const emptyFeed = await page.evaluate(async () => {
    const api=window.__KERBSIDE_TEST__,state=api.liveState,originalFetch=window.fetch;
    const saved={stop:state.stop,origin:state.origin,proxy:state.proxy,key:state.key,demo:state.demo,lastWideFetch:state.lastWideFetch,feedFallback:state.feedFallback,feedStale:state.feedStale,feedUnknownAge:state.feedUnknownAge,feedEmptyReason:state.feedEmptyReason};
    state.stop={id:'empty-feed-stop',lat:52.5,lon:-2.1,name:'Empty feed stop'};
    state.origin={lat:52.5,lon:-2.1,label:'Empty feed'};
    state.proxy='https://empty-feed.test';state.key='';state.demo=false;state.lastWideFetch=Date.now();
    window.fetch=async () => new Response('<?xml version="1.0"?><Siri><ServiceDelivery><VehicleMonitoringDelivery></VehicleMonitoringDelivery></ServiceDelivery></Siri>',{status:200,headers:{'Content-Type':'application/xml'}});
    try{
      const rows=await api.fetchLive();
      return {count:rows.length,reason:state.feedEmptyReason};
    }finally{
      window.fetch=originalFetch;Object.assign(state,saved);
    }
  });
  assert.equal(emptyFeed.count,0);
  assert.match(emptyFeed.reason,/No buses were reported/);

"""
t = rep(t, insert_anchor, insert_anchor + empty_test, 'empty feed browser regression')
T.write_text(t)

print('Prepared Kerbside 0.6.50 feed status release')
