#!/usr/bin/env python3
from pathlib import Path

path = Path('kerbside-backend/tests/browser-regression.mjs')
text = path.read_text(encoding='utf-8')
old = "assert.match(busSource, /fetchLive,ingest,relevant,liveState:S/);"
new = "assert.match(busSource, /fetchLive,fetchMatchedBatch,applyMatchedIdentities,retainMatchedIdentity,ingest,relevant,liveState:S/);"
count = text.count(old)
if count != 1:
    raise SystemExit(f'{path}: expected exactly one old test export assertion, found {count}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Updated browser regression to cover the expanded matched-identity test API.')
