#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUS = ROOT / 'bus.html'
PACKAGE = ROOT / 'kerbside-backend' / 'package.json'
README = ROOT / 'kerbside-backend' / 'README.md'


def replace_once(text: str, pattern: str, replacement: str, label: str, flags: int = 0) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'Expected one {label} replacement, found {count}.')
    return updated


source = BUS.read_text(encoding='utf-8')
if "const APP_VERSION = '0.6.1';" not in source:
    raise SystemExit('Expected Kerbside 0.6.1 predecessor in bus.html.')
source = source.replace("const APP_VERSION = '0.6.1';", "const APP_VERSION = '0.6.2';", 1)
source = source.replace("'kerbside.stops.v4.'", "'kerbside.stops.v5.'", 1)

national_lookup = r'''function nationalStopCodes(stop){
  const values=[stop&&stop.timetableId,stop&&stop.atco,stop&&stop.naptan,stop&&stop.code];
  if(stop&&(stop.source==='official'||looksLikeAtco(stop.id))) values.unshift(stop.id);
  return [...new Set(values.map(value=>String(value||'').trim().toLowerCase()).filter(Boolean))];
}
function matchNationalTileStop(tileData,stop){
  if(!tileData||!tileData.stops||!stop) return null;
  const entries=Object.entries(tileData.stops), codes=nationalStopCodes(stop);
  if(codes.length){
    for(const [id,raw] of entries){
      const candidates=[id,raw&&raw.c,raw&&raw.sms].map(value=>String(value||'').trim().toLowerCase());
      if(codes.some(code=>candidates.includes(code))) return {id:String(id),raw};
    }
    return null;
  }
  let best=null, bestScore=-Infinity;
  for(const [id,raw] of entries){
    const ll=raw&&raw.ll, lat=Number(ll&&ll[0]), lon=Number(ll&&ll[1]);
    if(!isFinite(lat)||!isFinite(lon)) continue;
    const metres=dist(stop.lat,stop.lon,lat,lon), similarity=nameSimilarity(stop.name,raw.n||'');
    if(metres>45||similarity<.72) continue;
    const score=similarity*100-metres;
    if(score>bestScore){ bestScore=score; best={id:String(id),raw}; }
  }
  return best;
}
async function nationalStopCandidates(stop){
  const manifest=await loadDataManifest(false), tile=stop.tile||dataTileKey(stop.lat,stop.lon);
  const allRegions=Object.keys((manifest&&manifest.regions)||{});
  const likely=dataRegionsFor(stop.lat,stop.lon,250,manifest);
  const regions=[...new Set([stop.region,...likely,...allRegions].filter(Boolean))];
  const settled=await Promise.allSettled(regions.map(async region=>({region,tile,data:await loadDataTile(region,tile)})));
  const candidates=[];
  for(const result of settled){
    if(result.status!=='fulfilled'||!result.value.data) continue;
    const matched=matchNationalTileStop(result.value.data,stop);
    if(matched) candidates.push({...result.value,...matched});
  }
  return candidates;
}
async function loadBestNationalStop(stop){
  const candidates=await nationalStopCandidates(stop);
  if(!candidates.length) throw new Error('official stop was not found in the national timetable tiles');
  const settled=await Promise.allSettled(candidates.map(async candidate=>{
    const shard=String(candidate.raw&&candidate.raw.shard||'');
    if(!shard) throw new Error('no Pages departure shard for this stop');
    const data=await loadDataDeparture(candidate.region,shard);
    const timetableStop=data&&data.stops&&data.stops[candidate.id];
    if(!timetableStop) throw new Error('no Pages timetable data for this stop');
    return {...candidate,shard,data,timetableStop,departureCount:Array.isArray(timetableStop.d)?timetableStop.d.length:0};
  }));
  const valid=settled.filter(result=>result.status==='fulfilled').map(result=>result.value);
  if(!valid.length) throw new Error('no regional timetable shard contained this official stop');
  valid.sort((a,b)=>b.departureCount-a.departureCount
    ||(a.region===stop.region?-1:b.region===stop.region?1:0)
    ||a.region.localeCompare(b.region));
  return valid[0];
}
async function fetchOfficialStops(lat,lon,radius){
  try{
    const manifest=await loadDataManifest(false), regions=dataRegionsFor(lat,lon,radius,manifest), tiles=dataTilesForRadius(lat,lon,radius);
    const settled=await Promise.allSettled(regions.flatMap(region=>tiles.map(async tile=>({region,tile,data:await loadDataTile(region,tile)}))));
    const loaded=settled.filter(result=>result.status==='fulfilled').map(result=>result.value);
    if(!loaded.length) return null;
    const unique=new Map();
    for(const item of loaded){
      if(!item.data||!item.data.stops) continue;
      for(const [id,raw] of Object.entries(item.data.stops)){
        const ll=raw&&raw.ll, stopLat=Number(ll&&ll[0]), stopLon=Number(ll&&ll[1]);
        if(!isFinite(stopLat)||!isFinite(stopLon)) continue;
        const metres=dist(lat,lon,stopLat,stopLon); if(metres>radius) continue;
        const stop={id:String(id),timetableId:String(id),name:titleCase(raw.n||'Unnamed stop'),atco:String(raw.c||id),naptan:String(raw.sms||''),code:String(raw.c||id),ind:String(raw.ind||''),lat:stopLat,lon:stopLon,region:item.region,tile:item.tile,shard:String(raw.shard||''),source:'official',d:metres};
        const old=unique.get(stop.id); if(!old||stop.d<old.d) unique.set(stop.id,stop);
      }
    }
    return [...unique.values()].sort((a,b)=>a.d-b.d).slice(0,120);
  }catch(e){ return null; }
}'''
source = replace_once(
    source,
    r"async function fetchOfficialStops\(lat,lon,radius\)\{.*?\n\}(?=\n\nasync function findStops)",
    national_lookup,
    'national stop lookup block',
    re.S,
)

stop_timetable = r'''async function loadStopTimetable(stop){
  const run=++S.timetableRun;
  S.ttError=null;
  activateTimetable(S.fallbackTimetable,S.fallbackTimetable?'regional':'',S.fallbackTimetable?'west_midlands':'');
  S.ttStop=matchTimetableStop(stop); updateStopMeta(); renderServingNote(); renderDests(); render();
  try{
    const matched=await loadBestNationalStop(stop);
    if(run!==S.timetableRun||!S.stop||String(S.stop.id)!==String(stop.id)) return;
    const raw=matched.raw||matched.timetableStop||{};
    stop.timetableId=matched.id; stop.region=matched.region; stop.tile=matched.tile; stop.shard=matched.shard; stop.source='official';
    stop.atco=String(raw.c||matched.id); stop.naptan=String(raw.sms||stop.naptan||''); stop.code=String(raw.c||matched.id);
    if(!stop.ind&&raw.ind) stop.ind=String(raw.ind);
    activateTimetable(matched.data,'national',matched.region); S.ttError=null;
    S.ttStop={id:matched.id,...matched.timetableStop,match:'code'};
  }catch(e){ if(run!==S.timetableRun) return; S.ttError=String((e&&e.message)||'national timetable unavailable'); }
  updateStopMeta(); renderServingNote(); renderDests(); render();
}'''
source = replace_once(
    source,
    r"async function loadStopTimetable\(stop\)\{.*?\n\}(?=\nfunction looksLikeAtco)",
    stop_timetable,
    'selected-stop timetable loader',
    re.S,
)

source = replace_once(
    source,
    r"else if\(S\.timetable\) tt=' · live only'; else if\(S\.ttError\) tt=' · timetable unavailable';",
    "else if(S.ttError) tt=' · timetable unavailable'; else if(S.timetable) tt=' · live only';",
    'stop metadata error priority',
)
source = replace_once(
    source,
    r"\}else if\(S\.timetable\)\{\n    el\.innerHTML='<b>This selected stop is outside the installed timetable pack\.</b> Live GPS remains available, but scheduled departures and exact journey verification are unavailable here\.';\n  \}else if\(S\.ttError\)\{\n    el\.innerHTML='<b>Timetable unavailable\.</b> '\+esc\(S\.ttError\)\+'\. Live GPS remains available while Kerbside retries on the next page load\.';",
    "}else if(S.ttError){\n    el.innerHTML='<b>Timetable unavailable.</b> '+esc(S.ttError)+'. Live GPS remains available while Kerbside retries on the next page load.';\n  }else if(S.timetable){\n    el.innerHTML='<b>This selected stop is outside the installed timetable pack.</b> Live GPS remains available, but scheduled departures and exact journey verification are unavailable here.';",
    'serving-note error priority',
)

required_markers = [
    "const APP_VERSION = '0.6.2';",
    "kerbside.stops.v5.",
    'async function loadBestNationalStop(stop)',
    "Promise.allSettled(regions.flatMap",
    "S.ttStop={id:matched.id,...matched.timetableStop,match:'code'};",
]
for marker in required_markers:
    if marker not in source:
        raise SystemExit(f'Missing expected 0.6.2 marker: {marker}')
BUS.write_text(source, encoding='utf-8')

package = json.loads(PACKAGE.read_text(encoding='utf-8'))
if package.get('version') != '0.6.1':
    raise SystemExit(f"Expected package version 0.6.1, found {package.get('version')!r}.")
package['version'] = '0.6.2'
PACKAGE.write_text(json.dumps(package, indent=2) + '\n', encoding='utf-8')

readme = README.read_text(encoding='utf-8')
needle = '`bus.html` uses that Pages hostname directly, so timetable traffic does not consume Worker requests.\n'
note = ('\nKerbside 0.6.2 tolerates individual regional tile failures and resolves cached or overlapping stop records '
        'against every matching timetable shard, preferring the regional copy with the fullest departure set.\n')
if note.strip() not in readme:
    if needle not in readme:
        raise SystemExit('README insertion point was not found.')
    readme = readme.replace(needle, needle + note, 1)
README.write_text(readme, encoding='utf-8')

print('Prepared Kerbside 0.6.2 national stop-resolution fix.')
