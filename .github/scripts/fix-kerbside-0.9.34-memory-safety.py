#!/usr/bin/env python3
from pathlib import Path
import subprocess

path=Path('.github/scripts/patch-kerbside-0.9.34-memory-safety.py')
text=path.read_text(encoding='utf-8')
old="history=Array.isArray(s.history)?s.history.slice(-limit):[];"
new="history=limit&&Array.isArray(s.history)?s.history.slice(-limit):[];"
count=text.count(old)
if count!=1:
    raise SystemExit(f'expected one zero-history compaction match, found {count}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
subprocess.run(['python3',str(path)],check=True)
