#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

OLD_VERSION = '0.7.20'
NEW_VERSION = '0.7.21'


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

# Some operators publish a locality in SIRI (for example "Digbeth") while the
# national timetable names the exact terminus stop (for example "Moor St
# Queensway"). A text mismatch is only useful branch evidence when another
# timetable journey for this same line/stop actually agrees with the live text.
# Centralise that distinction so exact GTFS-RT matches, unique origin-departure
# matches and the continuity fallback all make the same decision.
replace_once(
    'bus.html',
    "function journeyDestinationAlternative(rows,matchedRows,dest){\n  const live=String(dest||'').trim();\n  if(!live) return false;\n  const matchedTrips=new Set((Array.isArray(matchedRows)?matchedRows:[])\n    .map(row=>String(row&&row.trip||'')).filter(Boolean));\n  return (Array.isArray(rows)?rows:[]).some(row=>{\n    if(!row||!row.head) return false;\n    const trip=String(row.trip||'');\n    if(trip&&matchedTrips.has(trip)) return false;\n    return destinationSimilarity(live,row.head)>=.34;\n  });\n}\n",
    "function journeyDestinationAlternative(rows,matchedRows,dest){\n  const live=String(dest||'').trim();\n  if(!live) return false;\n  const matchedTrips=new Set((Array.isArray(matchedRows)?matchedRows:[])\n    .map(row=>String(row&&row.trip||'')).filter(Boolean));\n  return (Array.isArray(rows)?rows:[]).some(row=>{\n    if(!row||!row.head) return false;\n    const trip=String(row.trip||'');\n    if(trip&&matchedTrips.has(trip)) return false;\n    return destinationSimilarity(live,row.head)>=.34;\n  });\n}\nfunction journeyDestinationWordingOnly(rows,matchedRows,dest){\n  const destination=journeyDestinationAgreement(matchedRows,dest);\n  return !!(destination.conflict&&!journeyDestinationAlternative(rows,matchedRows,dest));\n}\n",
    'destination wording-only helper',
)

# Exact realtime identity is stronger than a locality-vs-stop-name mismatch.
# Keep the existing handover protection only when a genuinely different branch
# exists that matches the live destination text.
replace_once(
    'bus.html',
    "      const destination=journeyDestinationAgreement(realtimeMatchRows.items,dest);\n      const lag=Number(identity&&identity.matchedLagMs);\n      const newerSiriIdentity=!!(identity&&(String(identity.journey||'').trim()||Number.isFinite(Number(identity.aimedOriginAt))));\n      const handoverRisk=!!(destination.conflict&&Number.isFinite(lag)&&lag>MATCHED_HANDOVER_MAX_LAG_MS&&newerSiriIdentity);\n      if(!handoverRisk){\n        const path=!!timetablePattern(realtimeMatchRows.ref);\n        return {\n          score:path?6:5,\n          label:path?'BODS matched journey and stop sequence':'BODS matched journey',\n          journeyMatch:true,pathMatch:path,matchStrength:realtimeMatchRows.strength,matchedTrip:realtimeMatchRows.ref,matchedRealtime:true,\n          journeyDestinationConflict:!!destination.conflict,\n          routeIdentityMatch:realtimeInfo.strong\n        };\n      }\n",
    "      const destination=journeyDestinationAgreement(realtimeMatchRows.items,dest);\n      const wordingOnlyConflict=journeyDestinationWordingOnly(allRows,realtimeMatchRows.items,dest);\n      const lag=Number(identity&&identity.matchedLagMs);\n      const newerSiriIdentity=!!(identity&&(String(identity.journey||'').trim()||Number.isFinite(Number(identity.aimedOriginAt))));\n      const handoverRisk=!!(destination.conflict&&!wordingOnlyConflict&&Number.isFinite(lag)&&lag>MATCHED_HANDOVER_MAX_LAG_MS&&newerSiriIdentity);\n      if(!handoverRisk){\n        const path=!!timetablePattern(realtimeMatchRows.ref);\n        return {\n          score:path?6:5,\n          label:(path?'BODS matched journey and stop sequence':'BODS matched journey')+(wordingOnlyConflict?'; destination wording differs':''),\n          journeyMatch:true,pathMatch:path,matchStrength:realtimeMatchRows.strength,matchedTrip:realtimeMatchRows.ref,matchedRealtime:true,\n          journeyDestinationConflict:!!(destination.conflict&&!wordingOnlyConflict),journeyDestinationWordingMismatch:wordingOnlyConflict,\n          routeIdentityMatch:realtimeInfo.strong\n        };\n      }\n",
    'exact realtime wording-only handling',
)

# 0.7.16 only allowed wording disagreement on a comparable SIRI journey alias.
# Nationally the more reliable cross-feed identity is the unique aimed origin
# departure time. Give that strong identity the same wording-only treatment.
replace_once(
    'bus.html',
    "  const originMatch=uniqueOriginTrips(ttRows,identity);\n  if(originMatch.items.length){\n    const destination=journeyDestinationAgreement(originMatch.items,dest);\n    if(!destination.conflict){\n      const path=!!timetablePattern(originMatch.ref);\n      return {\n        score:path?6:5,\n        label:path?'origin departure and stop sequence matched':'origin departure matched to timetable',\n        journeyMatch:true,pathMatch:path,matchStrength:tripMatch.strength,matchedTrip:originMatch.ref,\n        originMatch:true,routeIdentityMatch:identityInfo.strong\n      };\n    }\n    journeyDestinationConflict=true; conflictingTrip=String(originMatch.ref||conflictingTrip||'');\n  }\n",
    "  const originMatch=uniqueOriginTrips(ttRows,identity);\n  if(originMatch.items.length){\n    const destination=journeyDestinationAgreement(originMatch.items,dest);\n    const wordingOnlyConflict=journeyDestinationWordingOnly(ttRows,originMatch.items,dest);\n    if(!destination.conflict||wordingOnlyConflict){\n      const path=!!timetablePattern(originMatch.ref);\n      return {\n        score:path?6:5,\n        label:(path?'origin departure and stop sequence matched':'origin departure matched to timetable')+(wordingOnlyConflict?'; destination wording differs':''),\n        journeyMatch:true,pathMatch:path,matchStrength:tripMatch.strength,matchedTrip:originMatch.ref,\n        originMatch:true,journeyDestinationWordingMismatch:wordingOnlyConflict,routeIdentityMatch:identityInfo.strong\n      };\n    }\n    journeyDestinationConflict=true; conflictingTrip=String(originMatch.ref||conflictingTrip||'');\n  }\n",
    'origin identity wording-only handling',
)

# A weak refresh can still arrive with a conflict object left over from fallback
# matching. Do not let that bypass established route continuity unless the
# destination actually identifies another timetable branch. Unknown conflicts
# remain fail-closed.
replace_once(
    'bus.html',
    "function routeEvidenceWithContinuity(v,evidence,now=Date.now()){\n  if(!v||!evidence||Number(evidence.score)>=2||!S.stop) return evidence;\n  if(evidence.journeyDestinationConflict||evidence.conflictingTrip) return evidence;\n  if(!routeContinuityContextMatches(v)) return evidence;\n",
    "function routeEvidenceWithContinuity(v,evidence,now=Date.now()){\n  if(!v||!evidence||Number(evidence.score)>=2||!S.stop) return evidence;\n  if(evidence.journeyDestinationConflict){\n    const conflictingTrip=String(evidence.conflictingTrip||'');\n    const rows=timetableRowsForLine(v.line,new Date(now));\n    const matchedRows=conflictingTrip?rows.filter(row=>String(row&&row.trip||'')===conflictingTrip):[];\n    if(!matchedRows.length||!journeyDestinationWordingOnly(rows,matchedRows,v.dest)) return evidence;\n  }\n  if(!routeContinuityContextMatches(v)) return evidence;\n",
    'allow wording-only conflict through established continuity',
)

replace_once(
    'bus.html',
    'routeContinuityGapMs,journeyDestinationAgreement,setVehicleProgressIdentity,',
    'routeContinuityGapMs,journeyDestinationAgreement,journeyDestinationWordingOnly,setVehicleProgressIdentity,',
    'expose destination wording regression hook',
)

# Regression: a locality-vs-terminus-stop mismatch is wording-only when no
# alternative trip agrees with the live headsign, but becomes a real branch
# conflict the moment such an alternative exists.
replace_once(
    'kerbside-backend/tests/browser-regression.mjs',
    "  const adaptiveRouteContinuity = await page.evaluate(() => {\n",
    "  const destinationWordingOnly = await page.evaluate(() => {\n    const api=window.__KERBSIDE_TEST__;\n    const matched=[{trip:'A',head:'Moor St Queensway'}];\n    return {\n      localityOnly:api.journeyDestinationWordingOnly([...matched,{trip:'B',head:'Frankley'}],matched,'Digbeth'),\n      realAlternative:api.journeyDestinationWordingOnly([...matched,{trip:'B',head:'Digbeth'}],matched,'Digbeth'),\n      exact:api.journeyDestinationWordingOnly(matched,matched,'Moor St Queensway')\n    };\n  });\n  assert.deepEqual(destinationWordingOnly,{localityOnly:true,realAlternative:false,exact:false});\n  assert.ok(busSource.includes(\"const wordingOnlyConflict=journeyDestinationWordingOnly(ttRows,originMatch.items,dest);\"));\n  assert.ok(busSource.includes(\"if(!matchedRows.length||!journeyDestinationWordingOnly(rows,matchedRows,v.dest)) return evidence;\"));\n\n  const adaptiveRouteContinuity = await page.evaluate(() => {\n",
    'destination wording regression',
)

subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)
print('Prepared Kerbside 0.7.21: journey locality/terminus wording no longer causes refresh flicker without a real alternative branch')
