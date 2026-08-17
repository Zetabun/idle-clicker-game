#!/usr/bin/env python3
from pathlib import Path
import runpy
import subprocess

impl = Path('.github/scripts/kerbside-release-0.9.40-impl.py')
text = impl.read_text(encoding='utf-8')
text = text.replace("\n}\nasync function refreshSavedJourney", "\n}\n\nasync function refreshSavedJourney")
impl.write_text(text, encoding='utf-8')
try:
    runpy.run_path(str(impl), run_name='__main__')
    browser_test = Path('kerbside-backend/tests/browser-regression.mjs')
    browser_text = browser_test.read_text(encoding='utf-8')
    old = "assert.match(busSource, /liveReason:overdue\\?'scheduled time passed/);"
    new = "assert.doesNotMatch(busSource, /liveReason:overdue\\?'scheduled time passed/);"
    if browser_text.count(old) != 1:
        raise SystemExit(f'{browser_test}: expected one legacy overdue assertion, found {browser_text.count(old)}')
    browser_test.write_text(browser_text.replace(old, new, 1), encoding='utf-8')
    subprocess.run(['python3', '.github/scripts/sync-version.py', '--check'], check=True)
except SystemExit as exc:
    print(f'::error file={impl}::{exc}')
    raise
except Exception as exc:
    print(f'::error file={impl}::{type(exc).__name__}: {exc}')
    raise
else:
    impl.unlink(missing_ok=True)
