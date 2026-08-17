#!/usr/bin/env python3
from pathlib import Path
import runpy

impl = Path('.github/scripts/kerbside-release-0.9.40-impl.py')
text = impl.read_text(encoding='utf-8')
text = text.replace("\\n}\\nasync function refreshSavedJourney", "\\n}\\n\\nasync function refreshSavedJourney")
impl.write_text(text, encoding='utf-8')
try:
    runpy.run_path(str(impl), run_name='__main__')
except SystemExit as exc:
    print(f'::error file={impl}::{exc}')
    raise
except Exception as exc:
    print(f'::error file={impl}::{type(exc).__name__}: {exc}')
    raise
else:
    impl.unlink(missing_ok=True)
