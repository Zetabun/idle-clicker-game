#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import tempfile

PATH = Path('bus.html')
text = PATH.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)


def sub_once(pattern: str, replacement: str, label: str, flags: int = re.S) -> None:
    global text
    text, count = re.subn(pattern, lambda _match: replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')


replace_once(
    "const APP_VERSION = '0.5.0';",
    "const APP_VERSION = '0.6.0';",
    'version bump',
)
replace_once(
    "const MY_PROXY = '';",
    "const MY_PROXY = '';\nconst DATA_BASE = 'https://kerbside-data-zetabun.pages.dev';\nconst DATA_TILE_CACHE = new Map();\nlet DATA_MANIFEST = null;\nlet DATA_MANIFEST_PROMISE = null;",
    'static Pages data configuration',
)
replace_once(
    "  return 'kerbside.stops.v3.'+lat.toFixed(3)+','+lon.toFixed(3)+','+radius;",
    "  return 'kerbside.stops.v4.'+lat.toFixed(3)+','+lon.toFixed(3)+','+radius;",
    'invalidate pre-Pages stop cache',
)

sub_once(
    r"async function fetchOfficialStops\(lat,lon,radius\)\{.*?\n\}\n\nasync function findStops",
    "function dataUrl(path){ return DATA_BASE.replace(/\\/$/,'')+'/'+String(path||'').replace(/^\\//,''); }\n"
    "function dataTileKey(lat,lon){\n"
    "  const size=(DATA_MANIFEST&&Number(DATA_MANIFEST.tileSize))||.05;\n"
    "  return Math.floor((Number(lat)+90)/size)+'-'+Math.floor((Number(lon)+180)/size);\n"
    "}\n"
    "function dataTilesForRadius(lat,lon,radius){\n"
    "  const size=(DATA_MANIFEST&&Number(DATA_MANIFEST.tileSize))||.05;\n"
    "  const latPad=radius/111320, lonPad=radius/(111320*Math.max(.2,Math.cos(rad(lat))));\n"
    "  const minY=Math.floor((lat-latPad+90)/size), maxY=Math.floor((lat+latPad+90)/size);\n"
    "  const minX=Math.floor((lon-lonPad+180)/size), maxX=Math.floor((lon+lonPad+180)/size);\n"
    "  const keys=[]; for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) keys.push(y+'-'+x);\n"
    "  return keys;\n"
    "}\n"
    "async function loadDataManifest(force){\n"
    "  if(DATA_MANIFEST&&!force) return DATA_MANIFEST;\n"
    "  if(DATA_MANIFEST_PROMISE&&!force) return DATA_MANIFEST_PROMISE;\n"
    "  DATA_MANIFEST_PROMISE=(async()=>{\n"
    "    const r=await fetchTimed(dataUrl('/manifest.json'),{headers:{Accept:'application/json'},cache:force?'reload':'force-cache'},10000);\n"
    "    if(!r.ok) throw new Error('Pages timetable HTTP '+r.status);\n"
    "    const data=await r.json();\n"
    "    if(!data||!data.regions||!Object.keys(data.regions).length) throw new Error('Pages timetable manifest is empty');\n"
    "    DATA_MANIFEST=data; return data;\n"
    "  })();\n"
    "  try{return await DATA_MANIFEST_PROMISE;}finally{DATA_MANIFEST_PROMISE=null;}\n"
    "}\n"
    "function dataRegionsFor(lat,lon,radius,manifest){\n"
    "  const latPad=radius/111320, lonPad=radius/(111320*Math.max(.2,Math.cos(rad(lat))));\n"
    "  const names=[];\n"
    "  for(const [name,info] of Object.entries((manifest&&manifest.regions)||{})){\n"
    "    const b=info&&info.bounds; if(!Array.isArray(b)||b.length!==4) continue;\n"
    "    if(lon+lonPad>=b[0]&&lat+latPad>=b[1]&&lon-lonPad<=b[2]&&lat-latPad<=b[3]) names.push(name);\n"
    "  }\n"
    "  return names.length?names:Object.keys((manifest&&manifest.regions)||{});\n"
    "}\n"
    "async function loadDataTile(region,tile){\n"
    "  const key=region+'/'+tile; if(DATA_TILE_CACHE.has(key)) return DATA_TILE_CACHE.get(key);\n"
    "  const pending=(async()=>{\n"
    "    const r=await fetchTimed(dataUrl('/regions/'+encodeURIComponent(region)+'/tiles/'+encodeURIComponent(tile)+'.json'),{headers:{Accept:'application/json'},cache:'force-cache'},12000);\n"
    "    if(r.status===404) return null; if(!r.ok) throw new Error('Pages tile HTTP '+r.status);\n"
    "    const data=await r.json(); return data&&data.stops?data:null;\n"
    "  })();\n"
    "  DATA_TILE_CACHE.set(key,pending);\n"
    "  try{return await pending;}catch(e){DATA_TILE_CACHE.delete(key);throw e;}\n"
    "}\n"
    "async function fetchOfficialStops(lat,lon,radius){\n"
    "  try{\n"
    "    const manifest=await loadDataManifest(false), regions=dataRegionsFor(lat,lon,radius,manifest), tiles=dataTilesForRadius(lat,lon,radius);\n"
    "    const loaded=await Promise.all(regions.flatMap(region=>tiles.map(async tile=>({region,tile,data:await loadDataTile(region,tile)}))));\n"
    "    const unique=new Map();\n"
    "    for(const item of loaded){\n"
    "      if(!item.data||!item.data.stops) continue;\n"
    "      for(const [id,raw] of Object.entries(item.data.stops)){\n"
    "        const ll=raw&&raw.ll, stopLat=Number(ll&&ll[0]), stopLon=Number(ll&&ll[1]);\n"
    "        if(!isFinite(stopLat)||!isFinite(stopLon)) continue;\n"
    "        const metres=dist(lat,lon,stopLat,stopLon); if(metres>radius) continue;\n"
    "        const stop={id:String(id),name:titleCase(raw.n||'Unnamed stop'),atco:String(raw.c||id),naptan:String(raw.sms||''),code:String(raw.c||id),ind:String(raw.ind||''),lat:stopLat,lon:stopLon,region:item.region,tile:item.tile,source:'official',d:metres};\n"
    "        const old=unique.get(stop.id); if(!old||stop.d<old.d) unique.set(stop.id,stop);\n"
    "      }\n"
    "    }\n"
    "    return [...unique.values()].sort((a,b)=>a.d-b.d).slice(0,120);\n"
    "  }catch(e){ return null; }\n"
    "}\n\n"
    "async function findStops",
    'replace Worker/R2 official-stop lookup with Pages tiles',
)

sub_once(
    r"async function loadStopTimetable\(stop\)\{.*?\n\}\nfunction looksLikeAtco",
    "async function loadStopTimetable(stop){\n"
    "  const run=++S.timetableRun;\n"
    "  activateTimetable(S.fallbackTimetable,S.fallbackTimetable?'regional':'',S.fallbackTimetable?'west_midlands':'');\n"
    "  S.ttStop=matchTimetableStop(stop); updateStopMeta(); renderServingNote(); renderDests(); render();\n"
    "  if(!stop.region||!stop.tile) return;\n"
    "  try{\n"
    "    const data=await loadDataTile(stop.region,stop.tile);\n"
    "    if(!data||!data.stops||!Object.keys(data.stops).length) throw new Error('no Pages timetable tile');\n"
    "    if(run!==S.timetableRun||!S.stop||String(S.stop.id)!==String(stop.id)) return;\n"
    "    activateTimetable(data,'national',stop.region); S.ttError=null; S.ttStop=matchTimetableStop(stop);\n"
    "  }catch(e){ if(run!==S.timetableRun) return; S.ttError=String((e&&e.message)||'national timetable unavailable'); }\n"
    "  updateStopMeta(); renderServingNote(); renderDests(); render();\n"
    "}\n"
    "function looksLikeAtco",
    'load selected-stop timetable directly from Pages',
)

sub_once(
    r"async function queuePattern\(patternId\)\{.*?\n\}\nfunction timetablePattern",
    "async function queuePattern(patternId){\n"
    "  if(!patternId||!S.timetableRegion||S.patternPending.has(patternId)) return;\n"
    "  S.patternPending.add(patternId);\n"
    "  try{\n"
    "    const prefix=String(patternId).toLowerCase().replace(/[^a-f0-9]/g,'').slice(0,2); if(prefix.length!==2) return;\n"
    "    const r=await fetchTimed(dataUrl('/regions/'+encodeURIComponent(S.timetableRegion)+'/patterns/'+prefix+'.json'),{headers:{Accept:'application/json'},cache:'force-cache'},12000);\n"
    "    if(!r.ok) return; const data=await r.json();\n"
    "    if(data&&data.patterns&&S.timetable){Object.assign(S.timetable.patterns||(S.timetable.patterns={}),data.patterns);PATTERN_CACHE.clear();render();}\n"
    "  }catch(e){} finally{S.patternPending.delete(patternId);}\n"
    "}\n"
    "function timetablePattern",
    'load journey patterns directly from Pages',
)

sub_once(
    r"function bbox\(\)\{.*?\n\}\nfunction feedUrl",
    "function bbox(){\n"
    "  const c=S.origin, wanted=(S.radius+9000)/111320, maxHalf=.17;\n"
    "  const latPad=Math.min(wanted,maxHalf), lonPad=Math.min(wanted/Math.max(.2,Math.cos(rad(c.lat))),maxHalf);\n"
    "  const minLon=Math.max(-9,c.lon-lonPad), minLat=Math.max(49,c.lat-latPad);\n"
    "  const maxLon=Math.min(3,c.lon+lonPad), maxLat=Math.min(61,c.lat+latPad);\n"
    "  return [minLon.toFixed(5),minLat.toFixed(5),maxLon.toFixed(5),maxLat.toFixed(5)].join(',');\n"
    "}\n"
    "function feedUrl",
    'keep live BODS boxes below the 0.35 degree upstream limit',
)

sub_once(
    r"async function checkSourceStatus\(\)\{.*?\n\}\n\$\('setBtn'\)\.addEventListener",
    "async function checkSourceStatus(){\n"
    "  const el=$('sourceStatus'); el.className='settings-status'; el.textContent='Checking live Worker and timetable Pages…';\n"
    "  let dataText='national timetable unavailable';\n"
    "  try{const manifest=await loadDataManifest(true);dataText='national timetable '+((manifest&&manifest.built)?'updated '+new Date(manifest.built).toLocaleDateString():'connected');}\n"
    "  catch(e){dataText='national timetable unavailable';}\n"
    "  if(S.demo){el.className='settings-status good';el.textContent='Simulator active · '+dataText+' · app '+APP_VERSION;return;}\n"
    "  if(!S.proxy){el.className='settings-status';el.textContent=(S.key?'Local key mode selected':'Add your Cloudflare Worker URL')+' · '+dataText;return;}\n"
    "  try{\n"
    "    const u=new URL(S.proxy,location.href);u.pathname=u.pathname.replace(/\\/$/,'')+'/health';u.search='';\n"
    "    const r=await fetchTimed(u.toString(),{headers:{Accept:'application/json'},cache:'no-store'},7000);const j=await r.json().catch(()=>({}));\n"
    "    if(!r.ok) throw new Error(j.error||('HTTP '+r.status));\n"
    "    el.className='settings-status good';el.textContent='Live Worker reachable · BODS secret '+(j.bods?'configured':'missing')+' · '+dataText+' · app '+APP_VERSION;\n"
    "  }catch(e){el.className='settings-status bad';el.textContent='Live Worker check failed: '+(e.message||'unreachable')+' · '+dataText;}\n"
    "}\n"
    "$('setBtn').addEventListener",
    'report Worker and Pages health separately',
)

PATH.write_text(text, encoding='utf-8')

required = [
    "const APP_VERSION = '0.6.0';",
    "const DATA_BASE = 'https://kerbside-data-zetabun.pages.dev';",
    "return 'kerbside.stops.v4.'",
    'async function loadDataManifest(force)',
    'async function loadDataTile(region,tile)',
    "activateTimetable(data,'national',stop.region)",
    ".slice(0,2)",
    'const latPad=Math.min(wanted,maxHalf)',
    'Live Worker reachable',
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'missing expected marker after patch: {marker}')

scripts = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', text, flags=re.I | re.S)
if not scripts:
    raise SystemExit('no inline scripts found for syntax validation')

with tempfile.TemporaryDirectory() as tmp:
    for index, script in enumerate(scripts, start=1):
        filename = Path(tmp) / f'inline-{index}.js'
        filename.write_text(script, encoding='utf-8')
        subprocess.run(['node', '--check', str(filename)], check=True)

print('Kerbside 0.6.0 Pages integration applied and inline JavaScript validated.')
