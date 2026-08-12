#!/usr/bin/env python3
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text=read(path)
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:120]!r}')
    write(path,text.replace(old,new,1))


# The provider-level connectionRiskFor is deliberately public to tests. The UI
# wrapper must have a distinct name or function hoisting turns it recursive.
timetable='kerbside-train-timetable.js'
replace_once(
    timetable,
    "function connectionRiskFor(minutes,minimum){return timetableProvider.connectionRiskFor(minutes,minimum);}",
    "function liveConnectionRiskFor(minutes,minimum){return timetableProvider.connectionRiskFor(minutes,minimum);}"
)
replace_once(
    timetable,
    "service.connectionRisk=service.isCancelled?'at-risk':connectionRiskFor(minutes,minimum);",
    "service.connectionRisk=service.isCancelled?'at-risk':liveConnectionRiskFor(minutes,minimum);"
)

# A station can temporarily be stored as {name:'BHM', crs:'BHM'} while the
# combined journey planner changes route. The timetable rows themselves were
# built from locations.json and therefore carry the authoritative display name.
# Resolve that before renderRows() calls setHeader(), so scheduled journeys do
# not expose a CRS in place of the station name.
replace_once(
    timetable,
    """function renderServices(items,{mode,manifest}){
  return renderRows(items.map(normalise),{mode,manifest});
}
""",
    """function renderServices(items,{mode,manifest}){
  const raw=Array.isArray(items)?items:[],r=route();
  const origin=raw.map(item=>item&&(item.from||(Array.isArray(item.legs)&&item.legs[0]&&item.legs[0].from))).find(item=>item&&String(item.crs||'').toUpperCase()===String(r.from&&r.from.crs||'').toUpperCase());
  const resolved=displayName(origin,'');
  if(r.from&&resolved&&resolved!==r.from.crs)r.from.name=resolved;
  return renderRows(raw.map(normalise),{mode,manifest});
}
"""
)

# The hidden live board and visible scheduled board share a header. A late live
# board response may still render after the timetable has taken ownership, so
# protect only the shared header/meta controls while continuing to keep the
# hidden live board itself and the canonical station name up to date.
trains='kerbside-trains.js'
replace_once(
    trains,
    "  const services = state.services;\n",
    """  const services = state.services;
  /* The scheduled timetable and hidden live board share these controls. A
     late Darwin response must not collapse BHM → GLO back to just BHM. */
  const timetableOwned=$('trainMain')?.dataset.railView==='scheduled'&&!$('trainScheduledBoard')?.hidden;
"""
)
replace_once(
    trains,
    """  name.textContent = payload.locationName || state.station.name || state.station.crs;
  state.station.name = name.textContent;
""",
    """  const resolvedStationName=payload.locationName||state.station.name||state.station.crs;
  state.station.name=resolvedStationName;
  if(!timetableOwned)name.textContent=resolvedStationName;
"""
)
replace_once(
    trains,
    """  meta.textContent = `${state.station.crs} · ${freshText}`;
  if(refresh){ refresh.disabled=false; refresh.textContent='Refresh'; }
""",
    """  if(!timetableOwned){
    meta.textContent = `${state.station.crs} · ${freshText}`;
    if(refresh){ refresh.disabled=false; refresh.textContent='Refresh'; }
  }
"""
)

# The browser fixture uses fixed 10:xx train times but CI can run at any hour.
# Force only the BHM -> GLO fixture into live-eligible mode, then restore the
# real production clock before the test returns to the direct journey.
browser='kerbside-backend/tests/train-browser-core-regression.mjs'
replace_once(
    browser,
    "  await findJourney(page,'BHM','GLO');",
    """  // Fixed daytime fixture: make this one scenario independent of CI clock.
  await page.evaluate(()=>{
    const api=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;
    window.__KERBSIDE_TEST_LIVE_WINDOW_FOR__=api.liveWindowFor;
    api.liveWindowFor=()=>({mode:'live',offset:0,window:120});
  });
  await findJourney(page,'BHM','GLO');"""
)
replace_once(
    browser,
    "  assert.doesNotMatch(await connectionDetail.textContent(),/10:52/);",
    """  assert.doesNotMatch(await connectionDetail.textContent(),/10:52/);
  await page.evaluate(()=>{
    const api=window.__KERBSIDE_TRAIN_LIVE_WINDOW__;
    if(window.__KERBSIDE_TEST_LIVE_WINDOW_FOR__)api.liveWindowFor=window.__KERBSIDE_TEST_LIVE_WINDOW_FOR__;
    delete window.__KERBSIDE_TEST_LIVE_WINDOW_FOR__;
    window.__KERBSIDE_TRAIN_OVERLAY__?.stop?.();
  });"""
)

print('Finalized Kerbside 0.8.0 live-risk helper, authoritative timetable station names, header ownership and deterministic browser fixture.')
