#!/usr/bin/env python3
"""Run the reviewed 0.9.42 patch, correct its static invariant, then update
one legacy movement-scope regression whose old expectation conflicts with the
new requirement to track same-day Saved journeys."""
from pathlib import Path
import re
import subprocess

path = ".github/scripts/release-kerbside-0.9.42.py"
original_commit = "f6229456b87f5f6b66c0dea1afe333958544687c"
source = subprocess.check_output(["git", "show", f"{original_commit}:{path}"], text=True)
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

scope_path = Path("kerbside-backend/tests/train-movement-scope-regression.mjs")
scope = scope_path.read_text(encoding="utf-8")
old = """assert.match(source, /if\\(savedApi\\?\\.state\\?\\.active\\)return finishScope\\('saved',targets\\);/, 'ordinary saved-journey overview must still avoid polling every saved train');
assert.match(source, /ensureCard\\(card,following\\?snapshot:null,\\{compact:true\\}\\)/, 'the followed saved card must receive the detailed Network Rail movement card');
assert.doesNotMatch(source, /readSavedJourneys\\(\\)\\|\\|\\[\\]\\)\\{\\s*if\\(saved\\.date!==today\\)/, 'the legacy all-saved polling loop must be removed');
"""
new = """assert.match(source, /if\\(savedApi\\?\\.state\\?\\.active\\)\\{/, 'Saved journeys must have an explicit movement-tracking scope');
assert.match(source, /if\\(text\\(saved&&saved\\.date\\)!==today\\)continue;/, 'Saved journeys movement polling must stay restricted to today');
assert.match(source, /services\\.filter\\(Boolean\\)\\.forEach\\(service=>addTarget\\(targets,service,today,'saved'\\)\\);/, 'today’s saved services must remain live movement targets after their origin departure');
assert.match(source, /ensureCard\\(card,snapshot,\\{compact:true\\}\\)/, 'same-day saved cards must receive Network Rail movement progress when evidence exists');
assert.doesNotMatch(source, /readSavedJourneys\\(\\)\\|\\|\\[\\]\\)\\{\\s*if\\(saved\\.date!==today\\)/, 'the legacy unscoped all-saved polling loop must remain removed');
"""
if scope.count(old) != 1:
    raise SystemExit(f"Expected exactly one legacy saved movement-scope assertion block, found {scope.count(old)}")
scope_path.write_text(scope.replace(old, new, 1), encoding="utf-8")

print("Updated movement-scope regression for same-day Saved journey tracking.")
