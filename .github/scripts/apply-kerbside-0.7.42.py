#!/usr/bin/env python3
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


# Release/cache busting.
replace_once('bus.html', "const APP_VERSION = '0.7.41';", "const APP_VERSION = '0.7.42';")
bus = read('bus.html')
if '?v=0.7.41' not in bus:
    raise SystemExit('bus.html: expected 0.7.41 cache-busters')
write('bus.html', bus.replace('?v=0.7.41', '?v=0.7.42'))
Path('VERSION').write_text('0.7.42\n', encoding='utf-8')

# A 502 from the rail Worker is explicitly its retryable "official upstream is
# temporarily unavailable" response. It should be amber, not a hard red, because
# liveWindowFetch immediately tries Huxley2/Huxley after the official attempt.
status = read('kerbside-status.js')
status = status.replace("const VERSION='0.7.41';", "const VERSION='0.7.42';", 1)
helper_anchor = "function busManifestFreshness(manifest){return timestampFreshness(manifest&&manifest.built,{healthyMs:36*3600*1000,degradedMs:72*3600*1000});}\n"
helper = helper_anchor + "function liveRailProbeState(status){return [408,429,502,504].includes(Number(status))?'degraded':'down';}\n"
if status.count(helper_anchor) != 1:
    raise SystemExit('kerbside-status.js: helper anchor not found once')
status = status.replace(helper_anchor, helper, 1)
old_probe = "    {...byId['rdm-darwin'],probe:async source=>{const r=await request(`${RAIL_WORKER}/departures/BHM/1?timeWindow=1`,{type:'json',headers:{Accept:'application/json'}});if(!r.response.ok)return result(source,r.response.status===429?'degraded':'down',`Official live rail probe returned HTTP ${r.response.status}.`,r.latency);const valid=r.body&&String(r.body.crs||'').toUpperCase()==='BHM'&&Object.prototype.hasOwnProperty.call(r.body,'trainServices');return result(source,valid?'healthy':'down',valid?'Official Darwin departure board returned valid data.':'Official Darwin response was not a valid departure board.',r.latency);}},"
new_probe = "    {...byId['rdm-darwin'],probe:async source=>{let last=null,totalLatency=0;for(let attempt=0;attempt<2;attempt++){const r=await request(`${RAIL_WORKER}/departures/BHM/1?timeWindow=1`,{type:'json',headers:{Accept:'application/json'}});last=r;totalLatency+=Number(r.latency)||0;if(r.response.ok){const valid=r.body&&String(r.body.crs||'').toUpperCase()==='BHM'&&Object.prototype.hasOwnProperty.call(r.body,'trainServices');return result(source,valid?'healthy':'down',valid?(attempt?'Official Darwin recovered on retry and returned valid data.':'Official Darwin departure board returned valid data.'):'Official Darwin response was not a valid departure board.',totalLatency);}if(liveRailProbeState(r.response.status)!=='degraded')return result(source,'down',`Official live rail probe returned HTTP ${r.response.status}.`,totalLatency);if(attempt===0)await new Promise(resolve=>setTimeout(resolve,300));}const status=last&&last.response&&last.response.status||0;return result(source,'degraded',`Official Darwin is temporarily unavailable (HTTP ${status}). Kerbside will use Huxley fallbacks for live boards while it recovers.`,totalLatency,'Degraded');}},"
if status.count(old_probe) != 1:
    raise SystemExit('kerbside-status.js: RDM probe not found once')
status = status.replace(old_probe, new_probe, 1)
old_export = "window.__KERBSIDE_STATUS_SWITCHBOARD__={version:VERSION,state,SOURCE_META,coverageHealth,overallState,sourceDefinitions,refresh,install};"
new_export = "window.__KERBSIDE_STATUS_SWITCHBOARD__={version:VERSION,state,SOURCE_META,coverageHealth,overallState,liveRailProbeState,sourceDefinitions,refresh,install};"
if status.count(old_export) != 1:
    raise SystemExit('kerbside-status.js: export line not found once')
status = status.replace(old_export, new_export, 1)
write('kerbside-status.js', status)

# Regression: temporary official upstream failures are degraded, while auth/
# configuration failures remain hard-down conditions.
test_path = Path('kerbside-backend/test/status-switchboard.test.mjs')
test_text = test_path.read_text(encoding='utf-8')
addition = r'''

test('retryable official rail HTTP failures are degraded rather than hard down',()=>{
  const api=load();
  assert.equal(api.liveRailProbeState(408),'degraded');
  assert.equal(api.liveRailProbeState(429),'degraded');
  assert.equal(api.liveRailProbeState(502),'degraded');
  assert.equal(api.liveRailProbeState(504),'degraded');
  assert.equal(api.liveRailProbeState(401),'down');
  assert.equal(api.liveRailProbeState(403),'down');
  assert.equal(api.liveRailProbeState(500),'down');
  assert.equal(api.liveRailProbeState(503),'down');
});
'''
if 'retryable official rail HTTP failures are degraded rather than hard down' not in test_text:
    test_path.write_text(test_text + addition, encoding='utf-8')

print('Applied Kerbside 0.7.42 rail status semantics fix.')
