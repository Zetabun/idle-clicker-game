#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

OLD_VERSION = '0.7.18'
NEW_VERSION = '0.7.19'


def replace_once(path, old, new, label):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if new in text:
        return False
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source block, found {count}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


version_file = Path('VERSION')
version = version_file.read_text(encoding='utf-8').strip()
if version not in {OLD_VERSION, NEW_VERSION}:
    raise SystemExit(f'Expected Kerbside {OLD_VERSION} before release, found {version!r}')
if version == OLD_VERSION:
    version_file.write_text(NEW_VERSION + '\n', encoding='utf-8')

# Straight-line distance to the selected stop is not route progress. A correct
# bus can temporarily travel farther from the stop on loops, one-way systems,
# bends and indirect road layouts. Keep the strong safety checks (fresh GPS,
# same stop/filter/line/operator/destination context, plausible physical jump,
# explicit branch conflicts, confirmed passed geometry), but never end an
# already-established route continuity solely because crow-flies distance grew.
replace_once(
    'bus.html',
    "const ROUTE_CONTINUITY_MAX_METRES = 2500;\nconst ROUTE_CONTINUITY_MAX_STOP_RETREAT = 250;\n",
    "const ROUTE_CONTINUITY_MAX_METRES = 2500;\n",
    'remove straight-line retreat threshold',
)

replace_once(
    'bus.html',
    "  if(now-verifiedAt>ROUTE_CONTINUITY_MAX_GAP_MS||!gpsLiveDisplayFresh(v,now)) return evidence;\n  if(movementTrend(v,S.stop)<0) return evidence;\n  if(gpsTs>previousTs){\n",
    "  if(now-verifiedAt>ROUTE_CONTINUITY_MAX_GAP_MS||!gpsLiveDisplayFresh(v,now)) return evidence;\n  if(gpsTs>previousTs){\n",
    'do not reject continuity for straight-line retreat',
)

replace_once(
    'bus.html',
    "    const stopDistance=dist(lat,lon,S.stop.lat,S.stop.lon), previousStopDistance=Number(v.routeVerifiedStopDistance);\n    if(Number.isFinite(previousStopDistance)&&stopDistance>previousStopDistance+ROUTE_CONTINUITY_MAX_STOP_RETREAT) return evidence;\n    v.routeVerifiedAt=now; v.routeVerifiedGpsTs=gpsTs; v.routeVerifiedLat=lat; v.routeVerifiedLon=lon;\n    v.routeVerifiedStopDistance=stopDistance;\n",
    "    const stopDistance=dist(lat,lon,S.stop.lat,S.stop.lon);\n    v.routeVerifiedAt=now; v.routeVerifiedGpsTs=gpsTs; v.routeVerifiedLat=lat; v.routeVerifiedLon=lon;\n    v.routeVerifiedStopDistance=stopDistance;\n",
    'refresh continuity through plausible indirect route movement',
)

# The ordinary bearing/approach gates are useful for unverified nearby buses,
# but they must not overrule strong journey/path evidence or a continuity state
# that was seeded by a real route match. Timetable direction contradictions are
# still hard failures; this only removes crow-flies/bearing as a sole veto.
replace_once(
    'bus.html',
    "    const routeAhead=!!(geometry&&!geometry.passed&&geometry.remaining>=-120&&orderedMovement);\n    if(S.dir!=='all'){\n",
    "    const routeAhead=!!(geometry&&!geometry.passed&&geometry.remaining>=-120&&orderedMovement);\n    const routeDirectionTrusted=!!(evidence.routeContinuity||evidence.journeyMatch||evidence.pathMatch||evidence.matchedRealtime);\n    if(S.dir!=='all'){\n",
    'mark route-directed evidence for direction safety',
)

replace_once(
    'bus.html',
    "      if(timetableContradicts || (gpsContradicts&&scheduledDir==='unknown'&&!routeAhead&&!journeyBearingOverride)){ dropLive(out,v,diagnostics,'direction',now); continue; }\n",
    "      if(timetableContradicts || (gpsContradicts&&scheduledDir==='unknown'&&!routeAhead&&!journeyBearingOverride&&!routeDirectionTrusted)){ dropLive(out,v,diagnostics,'direction',now); continue; }\n",
    'do not let GPS direction alone evict route-directed bus',
)

replace_once(
    'bus.html',
    "    if(S.hideAway && strength<0 && d>100 && !routeAhead && !journeyBearingOverride){\n      dropLive(out,v,diagnostics,'away',now); continue;\n    }\n",
    "    if(S.hideAway && strength<0 && d>100 && !routeAhead && !journeyBearingOverride && !routeDirectionTrusted){\n      dropLive(out,v,diagnostics,'away',now); continue;\n    }\n",
    'do not let straight-line retreat alone evict route-directed bus',
)

# Pin the exact safety contract in the browser regression. The retained bus is
# allowed to move farther away in straight-line distance when the physical GPS
# jump is plausible; a different branch, stale/no-new GPS or an implausible jump
# still fails closed.
static_anchor = """  // Once a route has genuinely passed the gate, a new plausible GPS fix may\n"""
static_checks = """  assert.doesNotMatch(busSource,/ROUTE_CONTINUITY_MAX_STOP_RETREAT/);\n  assert.doesNotMatch(busSource,/if\\(movementTrend\\(v,S\\.stop\\)<0\\) return evidence;/);\n  assert.ok(busSource.includes(\"const routeDirectionTrusted=!!(evidence.routeContinuity||evidence.journeyMatch||evidence.pathMatch||evidence.matchedRealtime);\"));\n  assert.ok(busSource.includes(\"if(S.hideAway && strength<0 && d>100 && !routeAhead && !journeyBearingOverride && !routeDirectionTrusted){\"));\n\n  // Once a route has genuinely passed the gate, a new plausible GPS fix may\n"""
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    static_anchor,
    static_checks,
    'route-aware retention static regression guards',
)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "  // Re-rendering the same fix cannot extend it indefinitely, and a destination\n  // branch change, measured retreat, or implausible jump must still fail closed.\n",
    "  // Re-rendering the same fix cannot extend it indefinitely. A destination\n  // branch change or implausible jump still fails closed, while straight-line\n  // retreat alone is allowed because real road routes can temporarily bend away.\n",
    'route continuity regression explanation',
)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "      const away={...v,lat:52.477,ts:now+45000,hist:[{lat:52.485,lon:-2.1,ts:now+30000},{lat:52.477,lon:-2.1,ts:now+45000}]};\n",
    "      const away={...v,lat:52.482,ts:now+45000,hist:[{lat:52.485,lon:-2.1,ts:now+30000},{lat:52.482,lon:-2.1,ts:now+45000}]};\n",
    'plausible route bend retreat regression fixture',
)

replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "  assert.deepEqual(freshRouteContinuity,{seeded:true,continuedScore:2,continued:true,sameFixExpired:1,branch:1,away:1,jump:1});\n",
    "  assert.deepEqual(freshRouteContinuity,{seeded:true,continuedScore:2,continued:true,sameFixExpired:1,branch:1,away:2,jump:1});\n",
    'route bend retention expected result',
)

subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
print('Prepared Kerbside 0.7.19: route-aware retained buses no longer flicker on crow-flies retreat')
