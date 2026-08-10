#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

VERSION = '0.7.32'

version_file = Path('VERSION')
version_file.write_text(VERSION + '\n', encoding='utf-8')
subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)

bus = Path('bus.html')
source = bus.read_text(encoding='utf-8')
script = '<script src="kerbside-train-live-window.js"></script>'
anchor = '<script src="kerbside-journey-planner-ui.js"></script>'
if script not in source:
    if anchor not in source:
        raise SystemExit('journey planner script anchor is missing from bus.html')
    source = source.replace(anchor, anchor + '\n' + script, 1)
    bus.write_text(source, encoding='utf-8')

print(f'Prepared Kerbside {VERSION} with same-day live train window support.')
