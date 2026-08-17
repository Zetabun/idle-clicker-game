#!/usr/bin/env python3
"""Run the reviewed 0.9.42 patch from the pre-wrapper commit with one
corrected static invariant. The original guard over-escaped an HTML class
needle; the generated JavaScript itself was correct."""
import re
import subprocess

path = ".github/scripts/release-kerbside-0.9.42.py"
source = subprocess.check_output(["git", "show", f"HEAD~2:{path}"], text=True)
source, count = re.subn(
    r'^\s*"class=.*?plan-result-events.*?",\s*$',
    '        "plan-result-events",',
    source,
    count=1,
    flags=re.MULTILINE,
)
if count != 1:
    raise SystemExit(f"Could not correct the 0.9.42 planner-event invariant; replacements={count}")
exec(compile(source, path, "exec"), {"__name__": "__main__"})
