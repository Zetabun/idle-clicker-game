#!/usr/bin/env python3
from pathlib import Path

path = Path('kerbside-backend/tests/browser-regression.mjs')
text = path.read_text(encoding='utf-8')
old = "assert.match(busSource, /fetchLive,fetchMatchedBatch,applyMatchedIdentities,retainMatchedIdentity,ingest,relevant,liveState:S/);"
new = "assert.match(busSource, /fetchLive,fetchMatchedBatch,matchedIdentityWithinBudget,applyMatchedIdentities,retainMatchedIdentity,ingest,relevant,liveState:S/);"
count = text.count(old)
if count != 1:
    raise SystemExit(f'expected one stale matched-export assertion, found {count}')
path.write_text(text.replace(old, new), encoding='utf-8', newline='\n')
print('Updated Kerbside 0.7.12 matched-export browser assertion.')
