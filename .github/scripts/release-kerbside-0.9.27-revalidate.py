#!/usr/bin/env python3
from pathlib import Path

checks={
    'VERSION':['0.9.27'],
    'kerbside-train-events.js':['kerbside.rail.wikidata.v1','WIKIDATA_STALE_MS','sourceStatus','if(!(state.status===\'ready\'&&state.date===date))state.status=\'loading\''],
    'kerbside-train-forecast-v4.js':['bankHolidaysByDivision','bankHolidayDivision','kerbside.rail.forecast.v4.calendar.v2','CACHE_STALE_MS'],
    'kerbside-journey-planner-core.js':['planMergeEventRows','Using the latest available information while event sources still update'],
    'kerbside-backend/test/train-event-source-reliability.test.mjs':['Birmingham Arena Concert','bank holidays remain separated by GOV.UK division'],
    '.github/workflows/verify-kerbside-event-sources.yml':['Probe GOV.UK bank holiday divisions','Probe Wikidata Query Service']
}
for path,needles in checks.items():
    text=Path(path).read_text(encoding='utf-8')
    for needle in needles:
        if needle not in text:
            raise SystemExit(f'{path}: missing expected 0.9.27 marker {needle!r}')
print('Kerbside 0.9.27 event-source reliability markers present; running full revalidation against current main.')
