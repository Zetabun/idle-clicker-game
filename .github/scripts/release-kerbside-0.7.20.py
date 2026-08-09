#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

OLD_VERSION = '0.7.19'
NEW_VERSION = '0.7.20'


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

# 0.7.18 established a short-lived route continuity state after a real route
# match, and 0.7.19 stopped treating crow-flies retreat as proof that a bus had
# left the route. Two holes remained:
#
# 1. The continuity timeout was fixed at 90 seconds even though Kerbside calls a
#    GPS position live for up to 120 seconds and some operators naturally report
#    near that cadence. Let the window adapt to the bus's measured reporting
#    cadence, capped by the same 120-second live-GPS contract.
# 2. A continuity-backed bus could pass the route gate and then be rejected by
#    the low-confidence gate because that gate only trusted exact journey or
#    schedule evidence. Let established route continuity count there too. The
#    bus then reaches the normal final-row path, refreshing lastShownAt instead
#    of depending on an old retained snapshot that eventually expires.
replace_once(
    'bus.html',
    "const ROUTE_CONTINUITY_MAX_GAP_MS = 90*1000;\nconst ROUTE_CONTINUITY_MAX_METRES = 2500;\n",
    "const ROUTE_CONTINUITY_MIN_GAP_MS = 90*1000;\nconst ROUTE_CONTINUITY_MAX_GAP_MS = GPS_LIVE_DISPLAY_SECONDS*1000;\nconst ROUTE_CONTINUITY_MAX_METRES = 2500;\nfunction routeContinuityGapMs(v){\n  const cadence=Number(v&&v.cadence);\n  if(!Number.isFinite(cadence)||cadence<=0) return ROUTE_CONTINUITY_MIN_GAP_MS;\n  const adaptive=(cadence*ETA_CADENCE_MULTIPLIER+15)*1000;\n  return Math.max(ROUTE_CONTINUITY_MIN_GAP_MS,Math.min(ROUTE_CONTINUITY_MAX_GAP_MS,adaptive));\n}\n",
    'adaptive route continuity window',
)

replace_once(
    'bus.html',
    "  const gpsTs=Number(v.ts)||0, previousTs=Number(v.routeVerifiedGpsTs)||0;\n  const verifiedAt=Number(v.routeVerifiedAt)||0;\n  if(!gpsTs||!previousTs||gpsTs<previousTs||!verifiedAt) return evidence;\n  if(now-verifiedAt>ROUTE_CONTINUITY_MAX_GAP_MS||!gpsLiveDisplayFresh(v,now)) return evidence;\n  if(gpsTs>previousTs){\n    const gap=gpsTs-previousTs;\n    if(gap>ROUTE_CONTINUITY_MAX_GAP_MS) return evidence;\n",
    "  const gpsTs=Number(v.ts)||0, previousTs=Number(v.routeVerifiedGpsTs)||0;\n  const verifiedAt=Number(v.routeVerifiedAt)||0;\n  const continuityGap=routeContinuityGapMs(v);\n  if(!gpsTs||!previousTs||gpsTs<previousTs||!verifiedAt) return evidence;\n  if(now-verifiedAt>continuityGap||!gpsLiveDisplayFresh(v,now)) return evidence;\n  if(gpsTs>previousTs){\n    const gap=gpsTs-previousTs;\n    if(gap>continuityGap) return evidence;\n",
    'use adaptive route continuity window',
)

replace_once(
    'bus.html',
    "    const scheduleBacked=!!(est.schedule && timetableTrusted(evidence));\n    const trustedJourney=!!(evidence.journeyMatch || geometry);\n",
    "    const scheduleBacked=!!(est.schedule && timetableTrusted(evidence));\n    const trustedJourney=!!(evidence.journeyMatch || geometry);\n    const continuityBacked=!!evidence.routeContinuity;\n",
    'mark established route continuity for confidence recovery',
)

replace_once(
    'bus.html',
    "      const recoverable=trustedJourney || (scheduleBacked && d<=MAX_VEH_DIST);\n",
    "      const recoverable=trustedJourney || continuityBacked || (scheduleBacked && d<=MAX_VEH_DIST);\n",
    'allow route continuity through low-confidence gate',
)

replace_once(
    'bus.html',
    "    const recovered=!!((trustedJourney || scheduleBacked) && (strength<0 || directionDisagreed || est.confidence==='low'));\n",
    "    const recovered=!!(continuityBacked || ((trustedJourney || scheduleBacked) && (strength<0 || directionDisagreed || est.confidence==='low')));\n",
    'label continuity-backed rows as retained',
)

replace_once(
    'bus.html',
    'timetableRouteSet,routeEvidence,routeEvidenceWithContinuity,rememberRouteContinuity,journeyDestinationAgreement,',
    'timetableRouteSet,routeEvidence,routeEvidenceWithContinuity,rememberRouteContinuity,routeContinuityGapMs,journeyDestinationAgreement,',
    'expose adaptive continuity regression hook',
)

# Pin both parts of the regression: the adaptive window follows measured
# cadence but never exceeds the 120-second live-GPS definition, and route
# continuity is an explicit low-confidence recovery path rather than being sent
# back to the expiring snapshot hold.
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "  assert.deepEqual(freshRouteContinuity,{seeded:true,continuedScore:2,continued:true,sameFixExpired:1,branch:1,away:2,jump:1});\n\n  const routeOverlayRetention = await page.evaluate(() => {\n",
    "  assert.deepEqual(freshRouteContinuity,{seeded:true,continuedScore:2,continued:true,sameFixExpired:1,branch:1,away:2,jump:1});\n\n  const adaptiveRouteContinuity = await page.evaluate(() => {\n    const api=window.__KERBSIDE_TEST__;\n    return {\n      fast:api.routeContinuityGapMs({cadence:15}),\n      slow:api.routeContinuityGapMs({cadence:70}),\n      unknown:api.routeContinuityGapMs({cadence:null})\n    };\n  });\n  assert.deepEqual(adaptiveRouteContinuity,{fast:90000,slow:120000,unknown:90000});\n  assert.ok(busSource.includes(\"const continuityBacked=!!evidence.routeContinuity;\"));\n  assert.ok(busSource.includes(\"const recoverable=trustedJourney || continuityBacked || (scheduleBacked && d<=MAX_VEH_DIST);\"));\n  assert.ok(busSource.includes(\"const recovered=!!(continuityBacked || ((trustedJourney || scheduleBacked) && (strength<0 || directionDisagreed || est.confidence==='low')));\"));\n\n  const routeOverlayRetention = await page.evaluate(() => {\n",
    'confidence continuity regression',
)

subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
print('Prepared Kerbside 0.7.20: cadence-aware route continuity now survives low-confidence refreshes')
