#!/usr/bin/env python3
"""Small guarded launcher for the Trusted Connections release patch.

The original patch body is retained in this branch's history.  Keeping this
launcher tiny makes follow-up syntax fixes reviewable without rewriting a large
staging script through the Contents API.
"""
from pathlib import Path
import subprocess

SOURCE_COMMIT='2f8fe308b590de644b56446ca3e73fb72268dd4d'
SOURCE_PATH='.github/scripts/release-kerbside-0.8.6.py'
source=subprocess.check_output(['git','show',f'{SOURCE_COMMIT}:{SOURCE_PATH}'],text=True)
old='''    "function loadProvider(date='2026-08-12',departAfter='09:00'){\n  const context={",'''
new='''    """function loadProvider(date='2026-08-12',departAfter='09:00'){\n  const context={""",'''
if source.count(old)!=1:
    raise SystemExit(f'Expected one multiline-string repair anchor, found {source.count(old)}')
source=source.replace(old,new,1)
namespace={'__file__':str(Path(__file__).resolve()),'__name__':'__main__'}
exec(compile(source,'trusted-connections-release-body','exec'),namespace)
