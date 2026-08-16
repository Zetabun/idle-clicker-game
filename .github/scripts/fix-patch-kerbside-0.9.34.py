#!/usr/bin/env python3
from pathlib import Path
import subprocess

path=Path('.github/scripts/patch-kerbside-0.9.34.py')
text=path.read_text(encoding='utf-8')
replacements={
    "w=replace_method(w,start,end,helpers+end,'replace persistence helpers')":"w=replace_method(w,start,end,helpers,'replace persistence helpers')",
    "w=replace_method(w,lookup_start,lookup_end,lookup+lookup_end,'lookup memory')":"w=replace_method(w,lookup_start,lookup_end,lookup,'lookup memory')",
    "w=replace_method(w,persist_start,persist_end,persist+persist_end,'persist memory')":"w=replace_method(w,persist_start,persist_end,persist,'persist memory')",
    "w=replace_method(w,cleanup_start,cleanup_end,cleanup+cleanup_end,'cleanup legacy')":"w=replace_method(w,cleanup_start,cleanup_end,cleanup,'cleanup legacy')",
}
for old,new in replacements.items():
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'expected one patch splice match, found {count}: {old}')
    text=text.replace(old,new,1)
path.write_text(text,encoding='utf-8')
subprocess.run(['python3',str(path)],check=True)
