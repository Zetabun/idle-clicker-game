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
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:140]!r}')
    write(path,text.replace(old,new,1))


# ---------------------------------------------------------------------------
# The query-marker version proved too fragile because kerbside-journey-planner-
# ui.js removes the marker while rebuilding a provider URL, and the later live-
# window wrapper therefore cannot tell that the same request must remain origin
# scoped. Carry this strictly internal bit through Fetch's init dictionary
# instead. It is deleted immediately before the native fetch call.
planner='kerbside-journey-planner-ui.js'
replace_once(
    planner,
    "function routeAwarePath(url){",
    "function routeAwarePath(url,init){"
)
replace_once(
    planner,
    "  const originScoped=url.searchParams.get('kerbsideScope')==='origin';",
    "  const originScoped=!!(init&&init.kerbsideOriginScoped)||url.searchParams.get('kerbsideScope')==='origin';"
)
replace_once(
    planner,
    "function providerCandidates(url){\n  const path=routeAwarePath(url);",
    "function providerCandidates(url,init){\n  const path=routeAwarePath(url,init);"
)
replace_once(
    planner,
    "  const candidates=providerCandidates(url);",
    "  const candidates=providerCandidates(url,init);"
)
replace_once(
    planner,
    """  try{
    return await previousFetch(url,{...(init||{}),signal:controller.signal});
  }finally{
""",
    """  try{
    const clean={...(init||{})};delete clean.kerbsideOriginScoped;
    return await previousFetch(url,{...clean,signal:controller.signal});
  }finally{
"""
)

# live-window sits outside the resilient provider wrapper. It must read the
# same internal flag when building the preferred official RDM/LDB URL, and then
# pass the init object through to the inner wrapper unchanged.
live_window='kerbside-train-live-window.js'
replace_once(
    live_window,
    "function officialBoardUrl(url){",
    "function officialBoardUrl(url,init){"
)
replace_once(
    live_window,
    "  const originScoped=url.searchParams.get('kerbsideScope')==='origin';",
    "  const originScoped=!!(init&&init.kerbsideOriginScoped)||url.searchParams.get('kerbsideScope')==='origin';"
)
replace_once(
    live_window,
    "  const official=officialEnabled()?officialBoardUrl(next):null;",
    "  const official=officialEnabled()?officialBoardUrl(next,init):null;"
)

# The overlay no longer puts scope information in the URL at all. The private
# init member is visible to Kerbside's wrappers, then stripped by fetchAttempt
# before a real network request is issued. This avoids CORS/preflight changes.
overlay='kerbside-train-live-overlay.js'
replace_once(
    overlay,
    """async function requestBoard(crs,signal,{originScoped=false}={}){
  const scope=originScoped?'&kerbsideScope=origin':'';
  const detailed=`${PROVIDER_BASE}/departures/${encodeURIComponent(crs)}/${DETAILED_ROWS}?expand=true${scope}`;
  try{
    const response=await fetch(detailed,{signal,headers:{Accept:'application/json'}});
    if(response&&response.ok)return response.json();
  }catch(error){if(signal&&signal.aborted)throw error;}
  /* Same fallback kerbside-trains.js uses: the detailed board caps at 9
     rows and some providers do not implement expand at all. A plain
     20-row board still carries times, platforms and cancellations. */
  const plain=`${PROVIDER_BASE}/departures/${encodeURIComponent(crs)}/${PLAIN_ROWS}${originScoped?'?kerbsideScope=origin':''}`;
  const response=await fetch(plain,{signal,headers:{Accept:'application/json'}});
  if(!response||!response.ok)throw new Error(`Departure board returned ${response?response.status:'no response'}`);
  return response.json();
}
""",
    """async function requestBoard(crs,signal,{originScoped=false}={}){
  const init={signal,headers:{Accept:'application/json'},...(originScoped?{kerbsideOriginScoped:true}:{})};
  const detailed=`${PROVIDER_BASE}/departures/${encodeURIComponent(crs)}/${DETAILED_ROWS}?expand=true`;
  try{
    const response=await fetch(detailed,init);
    if(response&&response.ok)return response.json();
  }catch(error){if(signal&&signal.aborted)throw error;}
  /* Same fallback kerbside-trains.js uses: the detailed board caps at 9
     rows and some providers do not implement expand at all. A plain
     20-row board still carries times, platforms and cancellations. */
  const plain=`${PROVIDER_BASE}/departures/${encodeURIComponent(crs)}/${PLAIN_ROWS}`;
  const response=await fetch(plain,init);
  if(!response||!response.ok)throw new Error(`Departure board returned ${response?response.status:'no response'}`);
  return response.json();
}
"""
)

# The browser regression should now see a genuinely unfiltered origin request
# during BHM -> GLO. No private scope token is allowed in the URL because the
# mechanism is entirely internal to the Fetch init dictionary.
browser='kerbside-backend/tests/train-browser-core-regression.mjs'
replace_once(
    browser,
    "assert.equal(diagnostics.railRequests.some(value=>value.includes('kerbsideScope')),false,'private live-scope marker must be stripped before the provider request');",
    "assert.equal(diagnostics.railRequests.some(value=>value.includes('kerbsideScope')),false,'origin scope must stay out of provider URLs');"
)

print('Replaced Kerbside 0.8.0 origin query marker with an internal Fetch init scope.')
