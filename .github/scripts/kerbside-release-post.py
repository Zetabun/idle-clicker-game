#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

subprocess.run([sys.executable,'.github/scripts/sync-version.py'],check=True)

path=Path('kerbside-train-timetable.js')
text=path.read_text(encoding='utf-8')
path.write_text(text.rstrip()+'\n',encoding='utf-8')
print('Synchronized Kerbside 0.9.23 version markers and normalized Active Journey timetable EOF.')
