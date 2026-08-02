from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once('bus.html', "const APP_VERSION = '0.6.16';", "const APP_VERSION = '0.6.17';")
replace_once('kerbside-backend/package.json', '"version": "0.6.16"', '"version": "0.6.17"')

replace_once(
    'bus.html',
    """function timetableDirection(value){
  const direction=String(value||'').trim().toLowerCase();
  if(direction==='0' || direction.startsWith('in')) return 'in';
  if(direction==='1' || direction.startsWith('out')) return 'out';
  return 'unknown';
}
""",
    """function timetableDirection(value){
  const direction=String(value||'').trim().toLowerCase();
  if(direction==='in' || direction==='inbound' || direction.startsWith('inbound ')) return 'in';
  if(direction==='out' || direction==='outbound' || direction.startsWith('outbound ')) return 'out';
  return 'unknown';
}
function scheduledJourneyDirection(row){
  const explicit=timetableDirection(row&&row.direction);
  if(explicit!=='unknown') return explicit;
  if(!row||!S.anchor||S.anchor.synthetic) return 'unknown';
  const pattern=timetablePatternRecord(row.trip);
  if(!pattern) return 'unknown';
  const stops=orderedPatternStops(pattern), index=selectedPatternStopIndex(stops);
  if(index<0) return 'unknown';
  const before=stops[Math.max(0,index-1)], after=stops[Math.min(stops.length-1,index+1)];
  if(!before||!after||before===after) return 'unknown';
  const beforeDistance=dist(before.lat,before.lon,S.anchor.lat,S.anchor.lon);
  const afterDistance=dist(after.lat,after.lon,S.anchor.lat,S.anchor.lon);
  if(Math.abs(beforeDistance-afterDistance)<80) return 'unknown';
  return afterDistance<beforeDistance?'in':'out';
}
"""
)

replace_once(
    'bus.html',
    "const scheduledDir=timetableDirection(est.schedule&&est.schedule.direction);",
    "const scheduledDir=scheduledJourneyDirection(est.schedule);"
)
replace_once(
    'bus.html',
    "const rowDir=timetableDirection(r.direction);",
    "const rowDir=scheduledJourneyDirection(r);"
)
replace_once(
    'bus.html',
    "Version 0.6.16 also recovers timetable-linked GPS vehicles when exact route or scheduled-call evidence is stronger than a temporary bearing or town-centre direction estimate, and the board explains why each remaining timetable row has no live match.",
    "Version 0.6.17 recovers timetable-linked GPS vehicles when exact route or scheduled-call evidence is stronger than a temporary bearing or town-centre direction estimate, explains why timetable rows have no live match, and no longer treats raw GTFS direction values 0 and 1 as universal inbound/outbound labels."
)

readme_marker = "Kerbside 0.6.16 improves live-GPS recovery. It normalises compatible SIRI and timetable journey references, resolves uniquely matching route-pattern aliases, and lets exact journey geometry or a plausible scheduled call override weaker straight-line bearing and town-centre direction inferences. Official timetable direction still blocks a contradictory journey. The live diagnostics panel now reports rejection reasons and recovered vehicles, while each schedule-only row explains whether no GPS was received, no vehicle matched the route, the branch was uncertain, or a received position was filtered.\n"
readme_addition = readme_marker + "\nKerbside 0.6.17 corrects timetable direction handling. GTFS `direction_id` values `0` and `1` are route-local identifiers rather than universal inbound/outbound labels, so Kerbside no longer rejects vehicles or scheduled rows on that assumption. Explicit inbound/outbound text is still honoured, while other scheduled direction is derived conservatively from the ordered journey around the selected stop and the current town anchor.\n"
replace_once('kerbside-backend/README.md', readme_marker, readme_addition)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.16'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.17'/);"
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "assert.match(busSource, /function timetableDirection\\(value\\)/);",
    """assert.match(busSource, /function timetableDirection\\(value\\)/);
assert.match(busSource, /function scheduledJourneyDirection\\(row\\)/);
assert.match(busSource, /direction==='inbound'/);
assert.doesNotMatch(busSource, /direction==='0' \\|\\| direction\\.startsWith\\('in'\\)/);
assert.match(busSource, /scheduledJourneyDirection\\(est\\.schedule\\)/);
assert.match(busSource, /scheduledJourneyDirection\\(r\\)/);"""
)
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.16'));",
    "await page.waitForFunction(() => document.getElementById('sourceStatus')?.textContent.includes('app 0.6.17'));"
)

print('Prepared Kerbside 0.6.17 direction correction.')
