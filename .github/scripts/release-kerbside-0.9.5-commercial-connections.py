#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys


def replace_once(path, old, new):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


# ---------------------------------------------------------------------------
# Connection-time provenance and commercial-use guardrails.
# ---------------------------------------------------------------------------
replace_once(
    'kerbside-train-timetable.js',
    """function officialConnectionMinimumFor(crs){
  const code=String(crs||'').toUpperCase(),map=window.__KERBSIDE_OFFICIAL_CONNECTION_TIMES__||{},raw=map&&map[code];
  const structured=raw&&typeof raw==='object'&&!Array.isArray(raw),minutes=Number(structured?raw.minutes:raw);
  if(!Number.isFinite(minutes)||minutes<1||minutes>60)return null;
  return {minutes,source:'official',authority:String(structured&&raw.authority||'').trim(),dataset:String(structured&&raw.dataset||'').trim(),asOf:String(structured&&raw.asOf||'').trim()};
}
function connectionMinimumInfo(crs,graph=null){
  const code=String(crs||'').toUpperCase(),official=officialConnectionMinimumFor(code);
  /* National Rail's CTI feed identifies connecting trains; it is not a
     substitute for the station minimum interchange times used by the Journey
     Planner. Until a licensed/machine-readable MCT source is loaded, Kerbside
     keeps an explicit conservative fallback instead of presenting guesses as
     official data. The structured adapter above is intentionally dormant
     unless an authorised dataset is supplied by the host application. */
  if(official)return official;
  const fixed=CONNECTION_HUB_MINUTES[code]||10,degree=graph&&graph.get(code)?graph.get(code).size:0,topology=degree>=12?15:degree>=7?12:10;
  return {minutes:Math.max(fixed,topology),source:'kerbside-topology',authority:'',dataset:'',asOf:''};
}
""",
    """function officialConnectionMinimumFor(crs){
  const code=String(crs||'').toUpperCase(),map=window.__KERBSIDE_OFFICIAL_CONNECTION_TIMES__||{},raw=map&&map[code];
  const structured=raw&&typeof raw==='object'&&!Array.isArray(raw);
  if(!structured)return null;
  const minutes=Number(raw.minutes),authority=String(raw.authority||'').trim(),dataset=String(raw.dataset||'').trim(),asOf=String(raw.asOf||'').trim(),licence=String(raw.licence||raw.license||'').trim();
  /* Kerbside may become a paid product, so an injected interchange dataset is
     trusted only when its own metadata explicitly permits commercial use and
     identifies both the publisher and licence. A bare number, scraped value or
     ambiguous feed can never silently become an "official" planning rule. */
  if(!Number.isFinite(minutes)||minutes<1||minutes>60||raw.commercialUse!==true||!authority||!dataset||!licence)return null;
  return {minutes,source:'licensed',authority,dataset,asOf,licence,commercialUse:true};
}
function connectionMinimumInfo(crs,graph=null){
  const code=String(crs||'').toUpperCase(),official=officialConnectionMinimumFor(code);
  /* The Darwin timetable gives Kerbside factual train times, but it does not
     currently provide a commercially-cleared station minimum-change dataset.
     Until one is explicitly supplied through the guarded adapter above, this
     value remains a Kerbside planning buffer and is labelled as such in the UI. */
  if(official)return official;
  const fixed=CONNECTION_HUB_MINUTES[code]||10,degree=graph&&graph.get(code)?graph.get(code).size:0,topology=degree>=12?15:degree>=7?12:10;
  return {minutes:Math.max(fixed,topology),source:'kerbside-planning-buffer',authority:'',dataset:'',asOf:'',licence:'',commercialUse:false};
}
"""
)

replace_once(
    'kerbside-train-timetable.js',
    "minimumConnectionSource:minimumInfo.source,minimumConnectionAuthority:minimumInfo.authority||'',minimumConnectionDataset:minimumInfo.dataset||'',minimumConnectionAsOf:minimumInfo.asOf||'',recoveryOptions,",
    "minimumConnectionSource:minimumInfo.source,minimumConnectionAuthority:minimumInfo.authority||'',minimumConnectionDataset:minimumInfo.dataset||'',minimumConnectionAsOf:minimumInfo.asOf||'',minimumConnectionLicence:minimumInfo.licence||'',minimumConnectionCommercialUse:minimumInfo.commercialUse===true,recoveryOptions,"
)

replace_once(
    'kerbside-train-timetable.js',
    "recoveryOptions:connection?(item.recoveryOptions||[]).map(normaliseLeg):[],recoveryChoice:null,minimumConnectionSource:item.minimumConnectionSource||'kerbside-topology',minimumConnectionAuthority:item.minimumConnectionAuthority||'',minimumConnectionDataset:item.minimumConnectionDataset||'',minimumConnectionAsOf:item.minimumConnectionAsOf||'',journeyLabels:Array.isArray(item.journeyLabels)?item.journeyLabels.slice():[],",
    "recoveryOptions:connection?(item.recoveryOptions||[]).map(normaliseLeg):[],recoveryChoice:null,minimumConnectionSource:item.minimumConnectionSource||'kerbside-planning-buffer',minimumConnectionAuthority:item.minimumConnectionAuthority||'',minimumConnectionDataset:item.minimumConnectionDataset||'',minimumConnectionAsOf:item.minimumConnectionAsOf||'',minimumConnectionLicence:item.minimumConnectionLicence||'',minimumConnectionCommercialUse:item.minimumConnectionCommercialUse===true,journeyLabels:Array.isArray(item.journeyLabels)?item.journeyLabels.slice():[],"
)

replace_once(
    'kerbside-train-timetable.js',
    """function connectionMinimumProvenance(service){
  const minimum=Number(service&&service.minimumConnectionMinutes)||10;
  if(service&&service.minimumConnectionSource==='official'){
    const authority=String(service.minimumConnectionAuthority||'').trim(),asOf=String(service.minimumConnectionAsOf||'').trim();
    return `${authority?`${authority} · `:''}official station minimum: ${minimum} min${asOf?` · ${asOf}`:''}`;
  }
  return `Kerbside conservative minimum: ${minimum} min`;
}
""",
    """function connectionMinimumProvenance(service){
  const minimum=Number(service&&service.minimumConnectionMinutes)||10;
  if(service&&service.minimumConnectionSource==='licensed'&&service.minimumConnectionCommercialUse===true){
    const authority=String(service.minimumConnectionAuthority||'').trim(),dataset=String(service.minimumConnectionDataset||'').trim(),licence=String(service.minimumConnectionLicence||'').trim(),asOf=String(service.minimumConnectionAsOf||'').trim();
    return `${authority?`${authority} · `:''}licensed station minimum: ${minimum} min${dataset?` · ${dataset}`:''}${licence?` · ${licence}`:''}${asOf?` · ${asOf}`:''}`;
  }
  return `Kerbside planning buffer: ${minimum} min`;
}
"""
)

replace_once(
    'kerbside-train-timetable.js',
    """function connectionBufferMinutes(arrival,departure){const a=parseMinutes(arrival),d=parseMinutes(departure);if(a==null||d==null)return null;let span=d-a;while(span<0)span+=1440;return span;}
function liveConnectionRiskFor(minutes,minimum){return timetableProvider.connectionRiskFor(minutes,minimum);}
function connectionChangeText(service){const live=Number.isFinite(service&&service.liveConnectionMinutes)?service.liveConnectionMinutes:null,value=live==null?Number(service&&service.connectionMinutes)||0:live;return `${live==null?'': 'live '}${value}m change`;}
""",
    """function connectionBufferMinutes(arrival,departure){const a=parseMinutes(arrival),d=parseMinutes(departure);if(a==null||d==null)return null;let span=d-a;while(span<0)span+=1440;return span;}
function liveConnectionRiskFor(minutes,minimum){return timetableProvider.connectionRiskFor(minutes,minimum);}
function connectionTimingInfo(service){
  const scheduled=Number(service&&service.connectionMinutes)||0,live=Number.isFinite(service&&service.liveConnectionMinutes)?Number(service.liveConnectionMinutes):null,minimum=Number(service&&service.minimumConnectionMinutes)||10,available=live==null?scheduled:live;
  return {scheduled,live,minimum,available,margin:available-minimum};
}
function connectionTimingText(service){
  const timing=connectionTimingInfo(service),parts=[`Scheduled wait ${timing.scheduled} min`];
  if(timing.live!=null)parts.push(`Live-adjusted wait ${timing.live} min`);
  parts.push(timing.margin>=0?`${timing.margin} min spare`:`${Math.abs(timing.margin)} min short`);
  return parts.join(' · ');
}
function connectionChangeText(service){const timing=connectionTimingInfo(service);return `${timing.live==null?'scheduled':'live'} ${timing.available}m wait`;}
"""
)

replace_once(
    'kerbside-train-timetable.js',
    """function connectionWarning(service){
  if(!service||service.journeyType!=='connection')return'';
  const change=displayName(service.interchange,'the interchange'),minimum=Number(service.minimumConnectionMinutes)||10,minutes=Number.isFinite(service.liveConnectionMinutes)?service.liveConnectionMinutes:Number(service.connectionMinutes)||0,arrival=service.liveInterchangeArrival?` at ${service.liveInterchangeArrival}`:'',backup=recoverySummary(service);
  if(service.connectionRisk==='first-cancelled')return `The first train is cancelled, so Kerbside cannot assume you can reach ${change}. Re-plan from the origin rather than relying on the onward leg.`;
  if(service.connectionRisk==='onward-cancelled')return `The planned onward train from ${change} is cancelled.${backup?` ${backup} is the next workable timetable option Kerbside found.`:''}`;
  if(service.connectionRisk==='at-risk')return `Live evidence reaches ${change}${arrival}, leaving ${minutes} minutes for the change — below the ${minimum}-minute planning buffer.${backup?` ${backup} is the next workable option if this connection is missed.`:''}`;
  if(service.connectionRisk==='tight')return `Live evidence leaves ${minutes} minutes at ${change}, only ${minutes-minimum} minutes above the ${minimum}-minute planning buffer.`;
  return'';
}
""",
    """function connectionWarning(service){
  if(!service||service.journeyType!=='connection')return'';
  const change=displayName(service.interchange,'the interchange'),minimum=Number(service.minimumConnectionMinutes)||10,minutes=Number.isFinite(service.liveConnectionMinutes)?service.liveConnectionMinutes:Number(service.connectionMinutes)||0,arrival=service.liveInterchangeArrival?` at ${service.liveInterchangeArrival}`:'',backup=recoverySummary(service),minimumName=service.minimumConnectionSource==='licensed'&&service.minimumConnectionCommercialUse===true?'licensed station minimum':'Kerbside planning buffer';
  if(service.connectionRisk==='first-cancelled')return `The first train is cancelled, so Kerbside cannot assume you can reach ${change}. Re-plan from the origin rather than relying on the onward leg.`;
  if(service.connectionRisk==='onward-cancelled')return `The planned onward train from ${change} is cancelled.${backup?` ${backup} is the next workable timetable option Kerbside found.`:''}`;
  if(service.connectionRisk==='at-risk')return `Live evidence reaches ${change}${arrival}, leaving ${minutes} minutes for the change — below the ${minimum}-minute ${minimumName}.${backup?` ${backup} is the next workable option if this connection is missed.`:''}`;
  if(service.connectionRisk==='tight')return `Live evidence leaves ${minutes} minutes at ${change}, only ${minutes-minimum} minutes above the ${minimum}-minute ${minimumName}.`;
  return'';
}
"""
)

replace_once(
    'kerbside-train-timetable.js',
    """  const change=service.interchange||{},minutes=Number.isFinite(service.liveConnectionMinutes)?service.liveConnectionMinutes:Number(service.connectionMinutes)||0,minimum=Number(service.minimumConnectionMinutes)||10,risk=service.connectionRisk||change.quality||'scheduled';
  const quality=service.connectionRisk==='at-risk'?'At risk':service.connectionRisk==='tight'?'Tight':service.connectionRisk==='onward-cancelled'?'Onward cancelled':service.connectionRisk==='first-cancelled'?'First train cancelled':String(change.quality||'comfortable').replace(/^./,c=>c.toUpperCase());
  const evidence=connectionEvidenceProvenance(service),source=connectionMinimumProvenance(service);
  const changeRow=`<div class=\"train-connection-change connection-risk-${esc(risk)}\"><span>Change at ${esc(displayName(change,'interchange'))}</span><b>${esc(`${minutes} min`)}</b><small>${esc(`${quality} connection · ${source} · ${evidence}`)}</small></div>`;
""",
    """  const change=service.interchange||{},timing=connectionTimingInfo(service),risk=service.connectionRisk||change.quality||'scheduled';
  const quality=service.connectionRisk==='at-risk'?'At risk':service.connectionRisk==='tight'?'Tight':service.connectionRisk==='onward-cancelled'?'Onward cancelled':service.connectionRisk==='first-cancelled'?'First train cancelled':String(change.quality||'comfortable').replace(/^./,c=>c.toUpperCase());
  const evidence=connectionEvidenceProvenance(service),source=connectionMinimumProvenance(service),timingText=connectionTimingText(service);
  const changeRow=`<div class=\"train-connection-change connection-risk-${esc(risk)}\"><span>Change at ${esc(displayName(change,'interchange'))}</span><b>${esc(`${timing.available} min available`)}</b><small>${esc(`${quality} connection · ${timingText} · ${source} · ${evidence}`)}</small></div>`;
"""
)

# ---------------------------------------------------------------------------
# Provider tests: a station minimum is trusted only with explicit commercial
# permission and licence provenance. The fallback remains app-derived.
# ---------------------------------------------------------------------------
replace_once(
    'kerbside-backend/test/train-timetable-provider.test.js',
    "assert.deepEqual({...provider.connectionMinimumInfo('CNM')},{minutes:10,source:'kerbside-topology',authority:'',dataset:'',asOf:''});",
    "assert.deepEqual({...provider.connectionMinimumInfo('CNM')},{minutes:10,source:'kerbside-planning-buffer',authority:'',dataset:'',asOf:'',licence:'',commercialUse:false});"
)

replace_once(
    'kerbside-backend/test/train-timetable-provider.test.js',
    """test('authoritative station minima can be supplied with provenance without changing the fallback dataset',()=>{
  const provider=loadProvider('2026-08-12','09:00',{CNM:{minutes:8,authority:'Licensed MCT fixture',dataset:'station-mct',asOf:'2026-08-12'}});
  assert.deepEqual({...provider.connectionMinimumInfo('CNM')},{minutes:8,source:'official',authority:'Licensed MCT fixture',dataset:'station-mct',asOf:'2026-08-12'});
  assert.deepEqual({...provider.connectionMinimumInfo('BHM')},{minutes:15,source:'kerbside-topology',authority:'',dataset:'',asOf:''});
});
""",
    """test('station minima require explicit commercial-use licence provenance',()=>{
  const rejected=loadProvider('2026-08-12','09:00',{CNM:{minutes:8,authority:'Restricted fixture',dataset:'station-mct',asOf:'2026-08-12',licence:'research-only',commercialUse:false}});
  assert.deepEqual({...rejected.connectionMinimumInfo('CNM')},{minutes:10,source:'kerbside-planning-buffer',authority:'',dataset:'',asOf:'',licence:'',commercialUse:false});
  const provider=loadProvider('2026-08-12','09:00',{CNM:{minutes:8,authority:'Licensed MCT fixture',dataset:'station-mct',asOf:'2026-08-12',licence:'commercial-fixture-v1',commercialUse:true}});
  assert.deepEqual({...provider.connectionMinimumInfo('CNM')},{minutes:8,source:'licensed',authority:'Licensed MCT fixture',dataset:'station-mct',asOf:'2026-08-12',licence:'commercial-fixture-v1',commercialUse:true});
  assert.deepEqual({...provider.connectionMinimumInfo('BHM')},{minutes:15,source:'kerbside-planning-buffer',authority:'',dataset:'',asOf:'',licence:'',commercialUse:false});
});
"""
)

# Browser regressions prove that the UI distinguishes factual train waits from
# Kerbside's fallback transfer buffer.
replace_once('kerbside-backend/tests/train-browser-core-regression.mjs', "assert.match(await connection.textContent(),/live 7m change/);", "assert.match(await connection.textContent(),/live 7m wait/);")
replace_once('kerbside-backend/tests/train-browser-core-regression.mjs', "assert.match(await connectionDetail.textContent(),/Kerbside conservative minimum: 10 min/);", "assert.match(await connectionDetail.textContent(),/Kerbside planning buffer: 10 min/);\n  assert.match(await connectionDetail.textContent(),/Scheduled wait 15 min/);\n  assert.match(await connectionDetail.textContent(),/Live-adjusted wait 7 min/);\n  assert.match(await connectionDetail.textContent(),/3 min short/);")
replace_once('kerbside-backend/tests/train-browser-core-regression.mjs', "assert.match(await connectionDetail.textContent(),/10-minute planning buffer/);", "assert.match(await connectionDetail.textContent(),/10-minute Kerbside planning buffer/);")
replace_once('kerbside-backend/tests/train-browser-core-regression.mjs', "assert.match(await connection.textContent(),/live 27m change/);", "assert.match(await connection.textContent(),/live 27m wait/);")

# ---------------------------------------------------------------------------
# Release/version/cache synchronisation.
# ---------------------------------------------------------------------------
Path('VERSION').write_text('0.9.5\n', encoding='utf-8')
subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)

replace_once('kerbside-status.js', "const VERSION='0.9.4';", "const VERSION='0.9.5';")
replace_once('kerbside-journey-planner-ui.js', "const PLANNER_CORE_URL='kerbside-journey-planner-core.js?v=0.9.4';\nconst RAIL_HEALTH_URL='kerbside-rail-health.js?v=0.9.4';", "const PLANNER_CORE_URL='kerbside-journey-planner-core.js?v=0.9.5';\nconst RAIL_HEALTH_URL='kerbside-rail-health.js?v=0.9.5';")

bus = Path('bus.html')
text = bus.read_text(encoding='utf-8')
old_count = text.count('?v=0.9.4')
if old_count < 10:
    raise SystemExit(f'bus.html: expected the rail asset cache set, found only {old_count} version keys')
bus.write_text(text.replace('?v=0.9.4', '?v=0.9.5'), encoding='utf-8')

print('Prepared Kerbside 0.9.5 commercial-safe connection timing release.')
