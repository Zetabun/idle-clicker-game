#!/usr/bin/env python3
from pathlib import Path
import subprocess
import tempfile

BASE_COMMIT='0da452571cb4ff3dc39ab4b6969409282f9cdf7c'
BASE_PATH='.github/scripts/release-kerbside-0.9.25.py'

# Reuse the already-applied-cleanly 0.9.25 release patch byte-for-byte from
# the previous commit, then adjust only the regression expectation that
# Darwin may legitimately classify a same-day service as delayed.
source=subprocess.run(
    ['git','show',f'{BASE_COMMIT}:{BASE_PATH}'],
    check=True,capture_output=True,text=True
).stdout
with tempfile.NamedTemporaryFile('w',suffix='.py',delete=False,encoding='utf-8') as handle:
    handle.write(source)
    temp_path=handle.name
subprocess.run(['python3',temp_path],check=True)
Path(temp_path).unlink(missing_ok=True)

test=Path('kerbside-backend/tests/train-active-journey-regression.mjs')
text=test.read_text(encoding='utf-8')
old="  assert.equal(savedSetup.status,'today');"
new="  assert.ok(['today','delayed'].includes(savedSetup.status),'same-day saved service may be on time or delayed');"
if text.count(old)!=1:
    raise SystemExit(f'active handoff status assertion: expected one anchor, found {text.count(old)}')
test.write_text(text.replace(old,new,1),encoding='utf-8')
print('Adjusted 0.9.25 active-handoff regression for delayed same-day service state.')
