from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

bus_path = ROOT / 'bus.html'
bus = bus_path.read_text(encoding='utf-8')
old_overlap = "if(!centre||dist(centre.lat,centre.lon,S.stop.lat,S.stop.lon)<FAR_VEH_DIST-1000) continue;"
new_overlap = "if(!centre||dist(centre.lat,centre.lon,S.stop.lat,S.stop.lon)+ROUTE_SCAN_BOX_RADIUS<=FAR_VEH_DIST) continue;"
if bus.count(old_overlap) != 1:
    raise SystemExit(f'Expected one centre-only corridor overlap check, found {bus.count(old_overlap)}')
bus_path.write_text(bus.replace(old_overlap, new_overlap, 1), encoding='utf-8')

path = ROOT / 'kerbside-backend/tests/browser-regression.mjs'
text = path.read_text(encoding='utf-8')

superseded = r"assert.match(busSource, /far && \(!gate \|\| !evidence\.journeyMatch\)/);" + "\n"
if text.count(superseded) != 1:
    raise SystemExit(f'Expected one superseded far-range assertion, found {text.count(superseded)}')
text = text.replace(superseded, '', 1)

fragile = r"assert.match(busSource, /if\(d>FAR_VEH_DIST&&!corridorFar\)/);" + "\n"
robust = r"assert.match(busSource, /d>FAR_VEH_DIST&&!corridorFar/);" + "\n"
if text.count(fragile) != 1:
    raise SystemExit(f'Expected one fragile route-corridor assertion, found {text.count(fragile)}')
text = text.replace(fragile, robust, 1)

anchor = robust
coverage_assertion = r"assert.match(busSource, /dist\(centre\.lat,centre\.lon,S\.stop\.lat,S\.stop\.lon\)\+ROUTE_SCAN_BOX_RADIUS<=FAR_VEH_DIST/);" + "\n"
if text.count(anchor) != 1:
    raise SystemExit('Could not locate route-corridor static assertion anchor')
text = text.replace(anchor, anchor + coverage_assertion, 1)

path.write_text(text, encoding='utf-8')
print('Updated route-corridor overlap logic and assertions')
