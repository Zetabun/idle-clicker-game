from pathlib import Path
import subprocess
import sys

TIMETABLE = Path('kerbside-train-timetable.js')
VERSION = Path('VERSION')
source = TIMETABLE.read_text(encoding='utf-8')


def replace_once(old, new):
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'Expected one timetable match, found {count}: {old[:120]!r}')
    source = source.replace(old, new, 1)


replace_once(
    "function destinationIndexAfter(row,toCode,start){\n  const calls=Array.isArray(row&&row[5])?row[5]:[];\n  for(let i=start+1;i<calls.length;i++)if(calls[i]&&calls[i][0]===toCode)return i;\n  return -1;\n}\nfunction servicesFromRows(rows,locations,manifest,{from,to,date,departAfter}){",
    "function destinationIndexAfter(row,toCode,start){\n  const calls=Array.isArray(row&&row[5])?row[5]:[];\n  for(let i=start+1;i<calls.length;i++)if(calls[i]&&calls[i][0]===toCode)return i;\n  return -1;\n}\nfunction journeyResultLimit(value){return Math.max(1,Math.min(160,Number(value)||MAX_RESULTS));}\nfunction servicesFromRows(rows,locations,manifest,{from,to,date,departAfter,departBefore='',maxResults=MAX_RESULTS}){",
)
replace_once(
    "function servicesFromRows(rows,locations,manifest,{from,to,date,departAfter,departBefore='',maxResults=MAX_RESULTS}){\n  const fromCode=String(from||'').toUpperCase(),toCode=String(to||'').toUpperCase(),after=parseMinutes(departAfter);",
    "function servicesFromRows(rows,locations,manifest,{from,to,date,departAfter,departBefore='',maxResults=MAX_RESULTS}){\n  const fromCode=String(from||'').toUpperCase(),toCode=String(to||'').toUpperCase(),after=parseMinutes(departAfter),before=parseMinutes(departBefore),limit=journeyResultLimit(maxResults);",
)
replace_once(
    "    if(after!=null&&leg.departureMinute<after)continue;\n    found.push({...leg,journeyType:'direct',changes:0,totalMinutes:leg.arrivalMinute-leg.departureMinute,rankScore:leg.arrivalMinute});",
    "    if(after!=null&&leg.departureMinute<after)continue;\n    if(before!=null&&leg.departureMinute>before)continue;\n    found.push({...leg,journeyType:'direct',changes:0,totalMinutes:leg.arrivalMinute-leg.departureMinute,rankScore:leg.arrivalMinute});",
)
replace_once(
    "  found.sort((a,b)=>a.departureMinute-b.departureMinute||a.arrivalMinute-b.arrivalMinute);\n  return found.slice(0,MAX_RESULTS);\n}\nfunction departureIndexForRows",
    "  found.sort((a,b)=>a.departureMinute-b.departureMinute||a.arrivalMinute-b.arrivalMinute);\n  return found.slice(0,limit);\n}\nfunction departureIndexForRows",
)
replace_once(
    "function connectionsFromRows(rows,locations,manifest,{from,to,date,departAfter}){\n  const fromCode=String(from||'').toUpperCase(),toCode=String(to||'').toUpperCase(),after=parseMinutes(departAfter);",
    "function connectionsFromRows(rows,locations,manifest,{from,to,date,departAfter,departBefore='',maxResults=MAX_RESULTS}){\n  const fromCode=String(from||'').toUpperCase(),toCode=String(to||'').toUpperCase(),after=parseMinutes(departAfter),before=parseMinutes(departBefore),limit=journeyResultLimit(maxResults);",
)
replace_once(
    "    if(after!=null&&departureMinute<after)continue;\n    first.push({row,calls,originIndex,departureMinute});",
    "    if(after!=null&&departureMinute<after)continue;\n    if(before!=null&&departureMinute>before)continue;\n    first.push({row,calls,originIndex,departureMinute});",
)
replace_once(
    "  for(const candidate of first.slice(0,CONNECTION_FIRST_LEGS)){",
    "  for(const candidate of first.slice(0,Math.max(CONNECTION_FIRST_LEGS,Math.min(160,limit*2)))){",
)
replace_once(
    "  found.sort((a,b)=>a.rankScore-b.rankScore||a.departureMinute-b.departureMinute);\n  return found.slice(0,MAX_RESULTS);\n}\nfunction connectionDominated",
    "  found.sort((a,b)=>a.rankScore-b.rankScore||a.departureMinute-b.departureMinute);\n  return found.slice(0,limit);\n}\nfunction connectionDominated",
)
replace_once(
    "function journeysFromRows(rows,locations,manifest,options){\n  const direct=servicesFromRows(rows,locations,manifest,options);\n  const rawConnections=connectionsFromRows(rows,locations,manifest,options);\n  const connections=rawConnections.filter(item=>!connectionVariantDominated(item,rawConnections)&&!connectionDominated(item,direct));\n  const ranked=[...direct,...connections]\n    .sort((a,b)=>a.departureMinute-b.departureMinute||a.changes-b.changes||a.rankScore-b.rankScore||a.arrivalMinute-b.arrivalMinute)\n    .slice(0,MAX_RESULTS);\n  return applyJourneyLabels(ranked);\n}",
    "function journeysFromRows(rows,locations,manifest,options){\n  const limit=journeyResultLimit(options&&options.maxResults);\n  const direct=servicesFromRows(rows,locations,manifest,{...(options||{}),maxResults:limit});\n  const rawConnections=connectionsFromRows(rows,locations,manifest,{...(options||{}),maxResults:limit});\n  const connections=rawConnections.filter(item=>!connectionVariantDominated(item,rawConnections)&&!connectionDominated(item,direct));\n  const ranked=[...direct,...connections]\n    .sort((a,b)=>a.departureMinute-b.departureMinute||a.changes-b.changes||a.rankScore-b.rankScore||a.arrivalMinute-b.arrivalMinute)\n    .slice(0,limit);\n  return applyJourneyLabels(ranked);\n}",
)
replace_once(
    "  async getServices({from,to,date,departAfter='00:00'}){\n    const manifest=await loadManifest();\n    if(!manifest||!Array.isArray(manifest.dates)||!manifest.dates.includes(date))return[];\n    const nextDate=addDays(date,1),dates=[date,...(manifest.dates.includes(nextDate)?[nextDate]:[])];\n    const [locations,...sets]=await Promise.all([loadLocations(),...dates.map(loadDate)]);\n    const rows=[],seen=new Set();for(const set of sets)for(const row of (Array.isArray(set)?set:[])){const key=rowIdentity(row);if(key&&seen.has(key))continue;if(key)seen.add(key);rows.push(row);}\n    return journeysFromRows(rows,locations,manifest,{from,to,date,departAfter});\n  },\n  servicesFromRows,connectionsFromRows,journeysFromRows,connectionMinimum,connectionMinimumInfo,connectionRiskFor,buildStationGraph,shortestNetworkStops,connectionRouteQuality",
    "  async getServices({from,to,date,departAfter='00:00'}){\n    const manifest=await loadManifest();\n    if(!manifest||!Array.isArray(manifest.dates)||!manifest.dates.includes(date))return[];\n    const nextDate=addDays(date,1),dates=[date,...(manifest.dates.includes(nextDate)?[nextDate]:[])];\n    const [locations,...sets]=await Promise.all([loadLocations(),...dates.map(loadDate)]);\n    const rows=[],seen=new Set();for(const set of sets)for(const row of (Array.isArray(set)?set:[])){const key=rowIdentity(row);if(key&&seen.has(key))continue;if(key)seen.add(key);rows.push(row);}\n    return journeysFromRows(rows,locations,manifest,{from,to,date,departAfter,maxResults:MAX_RESULTS});\n  },\n  async getJourneyOptions({from,to,date,departAfter='00:00',departBefore='',maxResults=MAX_RESULTS}){\n    const manifest=await loadManifest();\n    if(!manifest||!Array.isArray(manifest.dates)||!manifest.dates.includes(date))return[];\n    const nextDate=addDays(date,1),dates=[date,...(manifest.dates.includes(nextDate)?[nextDate]:[])];\n    const [locations,...sets]=await Promise.all([loadLocations(),...dates.map(loadDate)]);\n    const rows=[],seen=new Set();for(const set of sets)for(const row of (Array.isArray(set)?set:[])){const key=rowIdentity(row);if(key&&seen.has(key))continue;if(key)seen.add(key);rows.push(row);}\n    return journeysFromRows(rows,locations,manifest,{from,to,date,departAfter,departBefore,maxResults});\n  },\n  servicesFromRows,connectionsFromRows,journeysFromRows,connectionMinimum,connectionMinimumInfo,connectionRiskFor,buildStationGraph,shortestNetworkStops,connectionRouteQuality",
)
replace_once(
    "const original={\n  getCoverage:provider.getCoverage.bind(provider),\n  refreshCoverage:provider.refreshCoverage.bind(provider),\n  getServices:provider.getServices.bind(provider)\n};",
    "const original={\n  getCoverage:provider.getCoverage.bind(provider),\n  refreshCoverage:provider.refreshCoverage.bind(provider),\n  getServices:provider.getServices.bind(provider),\n  getJourneyOptions:typeof provider.getJourneyOptions==='function'?provider.getJourneyOptions.bind(provider):null\n};",
)
replace_once(
    "provider.getServices=async options=>{\n  const coverage=await loadCoverage(),time=options.departAfter||'00:00';\n  if(manifestCovers(coverage.darwin,options.date,time)){\n    selectSource('darwin',coverage.darwin);\n    try{return await original.getServices(options);}catch(error){\n      if(!manifestCovers(coverage.networkRail,options.date,time))throw error;\n    }\n  }\n  if(manifestCovers(coverage.networkRail,options.date,time)){\n    selectSource('network-rail',coverage.networkRail);\n    return networkRailServices(coverage.networkRail,options);\n  }\n  selectSource('',null);return [];\n};\nprovider.__kerbsideDualSource=true;",
    "provider.getServices=async options=>{\n  const coverage=await loadCoverage(),time=options.departAfter||'00:00';\n  if(manifestCovers(coverage.darwin,options.date,time)){\n    selectSource('darwin',coverage.darwin);\n    try{return await original.getServices(options);}catch(error){\n      if(!manifestCovers(coverage.networkRail,options.date,time))throw error;\n    }\n  }\n  if(manifestCovers(coverage.networkRail,options.date,time)){\n    selectSource('network-rail',coverage.networkRail);\n    return networkRailServices(coverage.networkRail,options);\n  }\n  selectSource('',null);return [];\n};\nfunction coverageRange(manifest,stamp){\n  if(!manifest||!Array.isArray(manifest.dates)||!manifest.dates.includes(stamp))return null;\n  const coverage=manifest.coverage&&manifest.coverage[stamp];if(!coverage)return null;\n  if(!coverage.partial)return {from:0,to:1439};\n  const from=parseMinutes(coverage.from),to=parseMinutes(coverage.to);return {from:from==null?0:from,to:to==null?1439:to};\n}\nfunction minuteClock(minute){const value=Math.max(0,Math.min(1439,Math.round(Number(minute)||0)));return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;}\nfunction tagJourneyOptions(items,source){const rows=Array.isArray(items)?items:[];try{Object.defineProperty(rows,'kerbsideSource',{value:source||'',enumerable:false,configurable:true});}catch(error){rows.kerbsideSource=source||'';}return rows;}\nfunction journeyOptionKey(item){return `${Number(item&&item.departureMinute)}|${Number(item&&item.arrivalMinute)}|${String(item&&item.uid||item&&item.trainId||'')}|${Number(item&&item.changes||0)}|${String(item&&item.interchange&&item.interchange.crs||'')}`;}\nasync function sourceJourneyOptions(sourceName,manifest,options){\n  if(sourceName==='darwin'){selectSource('darwin',manifest);return tagJourneyOptions(await original.getJourneyOptions(options),'darwin');}\n  selectSource('network-rail',manifest);return tagJourneyOptions(await networkRailServices(manifest,options),'network-rail');\n}\nprovider.getJourneyOptions=async options=>{\n  const coverage=await loadCoverage(),start=parseMinutes(options&&options.departAfter)||0,before=parseMinutes(options&&options.departBefore),limit=Math.max(1,Math.min(160,Number(options&&options.maxResults)||24));\n  if(before==null){\n    if(manifestCovers(coverage.darwin,options.date,options.departAfter||'00:00')){try{return await sourceJourneyOptions('darwin',coverage.darwin,{...options,maxResults:limit});}catch(error){if(!manifestCovers(coverage.networkRail,options.date,options.departAfter||'00:00'))throw error;}}\n    if(manifestCovers(coverage.networkRail,options.date,options.departAfter||'00:00'))return sourceJourneyOptions('network-rail',coverage.networkRail,{...options,maxResults:limit});\n    selectSource('',null);return tagJourneyOptions([],'');\n  }\n  const end=Math.max(start,before),darwinRange=coverageRange(coverage.darwin,options.date),networkRailRange=coverageRange(coverage.networkRail,options.date);\n  if(darwinRange&&start>=darwinRange.from&&end<=darwinRange.to)return sourceJourneyOptions('darwin',coverage.darwin,{...options,maxResults:limit});\n  if((!darwinRange||end<darwinRange.from||start>darwinRange.to)&&networkRailRange&&start>=networkRailRange.from&&end<=networkRailRange.to)return sourceJourneyOptions('network-rail',coverage.networkRail,{...options,maxResults:limit});\n  const segments=[];\n  if(darwinRange){\n    const overlapStart=Math.max(start,darwinRange.from),overlapEnd=Math.min(end,darwinRange.to);\n    if(start<overlapStart&&networkRailRange)segments.push(['network-rail',coverage.networkRail,start,overlapStart-1]);\n    if(overlapStart<=overlapEnd)segments.push(['darwin',coverage.darwin,overlapStart,overlapEnd]);\n    if(overlapEnd<end&&networkRailRange)segments.push(['network-rail',coverage.networkRail,overlapEnd+1,end]);\n  }else if(networkRailRange)segments.push(['network-rail',coverage.networkRail,start,end]);\n  const rows=[],seen=new Set(),used=new Set();\n  for(const [sourceName,manifest,segmentStart,segmentEnd] of segments){\n    if(segmentEnd<segmentStart)continue;\n    const part=await sourceJourneyOptions(sourceName,manifest,{...options,departAfter:minuteClock(segmentStart),departBefore:minuteClock(segmentEnd),maxResults:limit});used.add(sourceName);\n    for(const item of part){const key=journeyOptionKey(item);if(seen.has(key))continue;seen.add(key);rows.push(item);}\n  }\n  rows.sort((a,b)=>Number(a.departureMinute)-Number(b.departureMinute)||Number(a.arrivalMinute)-Number(b.arrivalMinute));\n  const result=rows.slice(0,limit),sourceName=used.size>1?'mixed':([...used][0]||'');\n  if(sourceName==='mixed')selectSource('mixed',coverage.combined);else if(sourceName==='darwin')selectSource('darwin',coverage.darwin);else if(sourceName==='network-rail')selectSource('network-rail',coverage.networkRail);else selectSource('',null);\n  return tagJourneyOptions(result,sourceName);\n};\nprovider.__kerbsideDualSource=true;",
)

TIMETABLE.write_text(source, encoding='utf-8')

if VERSION.read_text(encoding='utf-8').strip() != '0.9.18':
    raise SystemExit('Unexpected VERSION; rebase release patch before applying')
VERSION.write_text('0.9.19\n', encoding='utf-8')
subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
