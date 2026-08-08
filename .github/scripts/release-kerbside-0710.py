#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
import subprocess
import sys

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count == 1:
        write(path, text.replace(old, new, 1))
        return
    if count > 1:
        raise SystemExit(f'{path}: expected one replacement, found {count}: {old[:120]!r}')

    # Multiline JavaScript embedded in the release scripts has occasionally
    # picked up different leading indentation. Match the exact line contents
    # while allowing indentation to vary, and still fail closed on ambiguity.
    old_lines = [line.strip() for line in old.splitlines() if line.strip()]
    if not old_lines:
        raise SystemExit(f'{path}: empty replacement target')
    parts = [r'^[ \t]*' + re.escape(line) + r'[ \t]*$' for line in old_lines]
    matches = list(re.finditer(r'\n'.join(parts), text, flags=re.MULTILINE))
    if len(matches) != 1:
        raise SystemExit(
            f'{path}: expected one indentation-tolerant replacement, found {len(matches)}: '
            f'{old_lines[0][:120]!r}'
        )
    match = matches[0]
    replacement = new.rstrip()
    write(path, text[:match.start()] + replacement + text[match.end():])


version_path = ROOT / 'VERSION'
current = version_path.read_text(encoding='utf-8').strip()
if current != '0.7.9':
    raise SystemExit(f'Expected Kerbside 0.7.9 base, found {current!r}')
version_path.write_text('0.7.10\n', encoding='utf-8')

replace_once(
    'bus.html',
    '''const ETA_MIN_FRESH_SECONDS = 30;
const ETA_MAX_FRESH_SECONDS = 75;
const ETA_CADENCE_MULTIPLIER = 1.75;''',
    '''const ETA_MIN_FRESH_SECONDS = 30;
const ETA_MAX_FRESH_SECONDS = 75;
const ETA_CADENCE_MULTIPLIER = 1.75;
const GPS_LIVE_DISPLAY_SECONDS = 120;''',
)

replace_once(
    'bus.html',
    '''function etaGpsQuality(v,now=Date.now()){
  const age=Math.max(0,(Number(now)-Number(v&&v.ts))/1000);
  const cadence=Number(v&&v.cadence);
  const freshWindow=etaFreshWindowSeconds(cadence);
  return {age,cadence:Number.isFinite(cadence)&&cadence>0?cadence:null,freshWindow,fresh:age<=freshWindow};
}''',
    '''function etaGpsQuality(v,now=Date.now()){
  const age=Math.max(0,(Number(now)-Number(v&&v.ts))/1000);
  const cadence=Number(v&&v.cadence);
  const freshWindow=etaFreshWindowSeconds(cadence);
  return {age,cadence:Number.isFinite(cadence)&&cadence>0?cadence:null,freshWindow,fresh:age<=freshWindow};
}
function gpsLiveDisplayFresh(v,now=Date.now()){
  const age=Math.max(0,(Number(now)-Number(v&&v.ts))/1000);
  return Number.isFinite(age)&&age<=GPS_LIVE_DISPLAY_SECONDS;
}''',
)

replace_once(
    'bus.html',
    "if(!etaGpsQuality(v,now).fresh&&!decisive.has(rejection)) return 'matching GPS is delayed';",
    "if(!gpsLiveDisplayFresh(v,now)&&!decisive.has(rejection)) return 'matching GPS is delayed';",
)

replace_once(
    'bus.html',
    '''const now=Date.now(), age=now-r.v.ts, gpsLost=!!r.gpsLost, gpsQuality=etaGpsQuality(r.v,now), gpsFresh=!gpsLost&&gpsQuality.fresh, gpsAge=formatPositionAge(age);
      const due=!gpsLost&&gpsFresh&&r.confidence!=='low'&&dueWithin(r.secs,LIVE_DUE_SECONDS);''',
    '''const now=Date.now(), age=now-r.v.ts, gpsLost=!!r.gpsLost, gpsQuality=etaGpsQuality(r.v,now), gpsLive=!gpsLost&&gpsLiveDisplayFresh(r.v,now), etaFresh=!gpsLost&&gpsQuality.fresh, gpsAge=formatPositionAge(age);
      const due=!gpsLost&&etaFresh&&r.confidence!=='low'&&dueWithin(r.secs,LIVE_DUE_SECONDS);''',
)

replace_once(
    'bus.html',
    '''const gpsLabel=gpsLost?(r.scheduleFallback?'GPS lost · schedule':'GPS signal lost'):gpsFresh?'live GPS':'GPS delayed';
      const gpsHelp=gpsLost?(r.scheduleFallback?'Fresh GPS stopped for this matched departure; its row is temporarily using the timetable instead of creating a duplicate scheduled bus.':'The operator feed stopped reporting this previously verified bus. Kerbside is holding the row briefly without a live countdown.'):gpsFresh?'Fresh vehicle position from BODS; current for this bus\\'s reporting cadence.':'Last confirmed BODS position was '+gpsAge+'; ETA confidence is reduced until a fresh report arrives.';
      const etaText=gpsLost?(r.scheduleFallback?(scheduleDue?'due':'~'+mins):'—'):due?'due':((!gpsFresh||r.confidence==='low')?'~':'')+mins;''',
    '''const gpsLabel=gpsLost?(r.scheduleFallback?'GPS lost · schedule':'GPS signal lost'):gpsLive?'live GPS':'GPS delayed';
      const gpsHelp=gpsLost?(r.scheduleFallback?'Fresh GPS stopped for this matched departure; its row is temporarily using the timetable instead of creating a duplicate scheduled bus.':'The operator feed stopped reporting this previously verified bus. Kerbside is holding the row briefly without a live countdown.'):gpsLive?(etaFresh?'Live vehicle position from BODS; current for this bus\\'s reporting cadence.':'Live vehicle position from BODS; still under two minutes old, but older than this bus\\'s normal reporting cadence so its ETA is estimated.'):'Last confirmed BODS position was '+gpsAge+'; the position is over two minutes old and ETA confidence is reduced.';
      const etaText=gpsLost?(r.scheduleFallback?(scheduleDue?'due':'~'+mins):'—'):due?'due':((!etaFresh||r.confidence==='low')?'~':'')+mins;''',
)

replace_once(
    'bus.html',
    "+'<span class=\"route'+(age>75000?' stale':'')+'\">'+esc(r.v.line)+'</span>'",
    "+'<span class=\"route'+(!gpsLive?' stale':'')+'\">'+esc(r.v.line)+'</span>'",
)
replace_once(
    'bus.html',
    "+'<span class=\"chip '+(gpsLost?'gps-lost':gpsFresh?'live-gps':'gps-delayed')+'\" title=\"'+esc(gpsHelp)+'\">'+gpsLabel+'</span>'",
    "+'<span class=\"chip '+(gpsLost?'gps-lost':gpsLive?'live-gps':'gps-delayed')+'\" title=\"'+esc(gpsHelp)+'\">'+gpsLabel+'</span>'",
)
replace_once(
    'bus.html',
    "(!gpsFresh||r.confidence==='low')?'est':'min'",
    "(!etaFresh||r.confidence==='low')?'est':'min'",
)

text = read('bus.html')
old_stats = 'tracked.filter(v=>etaGpsQuality(v,now).fresh).length'
if text.count(old_stats) != 2:
    raise SystemExit(f'bus.html: expected two footer/stat freshness uses, found {text.count(old_stats)}')
write('bus.html', text.replace(old_stats, 'tracked.filter(v=>gpsLiveDisplayFresh(v,now)).length'))

replace_once(
    'bus.html',
    "<b>LIVE GPS</b> means the latest bus position is still inside Kerbside's cadence-aware freshness window (30 to 75 seconds, depending on how often that vehicle reports). <b>GPS DELAYED</b> means the last confirmed report is still recent enough to retain, but old enough that ETA confidence has been reduced;",
    "<b>LIVE GPS</b> means the latest bus position was reported within the last two minutes. ETA confidence is stricter and still uses the vehicle's normal 30 to 75 second reporting cadence. <b>GPS DELAYED</b> means the last confirmed report is two to four minutes old;",
)
replace_once(
    'bus.html',
    "Positions outside each vehicle's cadence-aware 30 to 75 second freshness window are labelled GPS delayed and retained only until four minutes old so irregular operator updates do not make an approaching bus vanish immediately.",
    "Positions over two minutes old are labelled GPS delayed and retained only until four minutes old so irregular operator updates do not make an approaching bus vanish immediately. ETA confidence still follows each vehicle's normal 30 to 75 second reporting cadence.",
)
replace_once(
    'bus.html',
    "return 'no bus is working this departure yet';",
    "return 'no matching live bus yet';",
)
replace_once(
    'bus.html',
    'etaFreshWindowSeconds,etaGpsQuality,scheduleEtaBlendWeight',
    'etaFreshWindowSeconds,etaGpsQuality,gpsLiveDisplayFresh,GPS_LIVE_DISPLAY_SECONDS,scheduleEtaBlendWeight',
)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    r'''assert.match(busSource, /tracked\.filter\(v=>etaGpsQuality\(v,now\)\.fresh\)/);''',
    r'''assert.match(busSource, /const GPS_LIVE_DISPLAY_SECONDS = 120/);
assert.match(busSource, /function gpsLiveDisplayFresh\(v,now=Date\.now\(\)\)/);
assert.match(busSource, /tracked\.filter\(v=>gpsLiveDisplayFresh\(v,now\)\)/);
assert.ok(busSource.includes("const due=!gpsLost&&etaFresh&&r.confidence!=='low'&&dueWithin(r.secs,LIVE_DUE_SECONDS);"));
assert.ok(busSource.includes("return 'no matching live bus yet';"));
assert.doesNotMatch(busSource, /no bus is working this departure yet/);''',
)

subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
subprocess.run([sys.executable, '.github/scripts/sync-version.py', '--check'], check=True)

bus = read('bus.html')
required = [
    "const APP_VERSION = '0.7.10';",
    'const GPS_LIVE_DISPLAY_SECONDS = 120;',
    'function gpsLiveDisplayFresh(v,now=Date.now())',
    'gpsLive=!gpsLost&&gpsLiveDisplayFresh(r.v,now)',
    'etaFresh=!gpsLost&&gpsQuality.fresh',
    "return 'no matching live bus yet';",
    'tracked.filter(v=>gpsLiveDisplayFresh(v,now)).length',
]
missing = [token for token in required if token not in bus]
if missing:
    raise SystemExit(f'Missing required 0.7.10 changes: {missing}')
for forbidden in [
    "return 'no bus is working this departure yet';",
    'tracked.filter(v=>etaGpsQuality(v,now).fresh).length',
]:
    if forbidden in bus:
        raise SystemExit(f'Forbidden 0.7.9 display logic remains: {forbidden}')

changed = set(subprocess.check_output(['git', 'diff', '--name-only', '--'], text=True).splitlines())
expected = {
    'VERSION',
    'bus.html',
    'kerbside-backend/package.json',
    'kerbside-backend/src/worker.js',
    'kerbside-backend/test/worker.test.js',
    'kerbside-backend/tests/browser-regression.mjs',
}
if changed != expected:
    raise SystemExit(
        '0.7.10 patch changed the wrong files; '
        f'missing={sorted(expected - changed)}, unexpected={sorted(changed - expected)}'
    )

print('Prepared Kerbside 0.7.10: 120s LIVE GPS display window with cadence-aware ETA confidence retained.')
