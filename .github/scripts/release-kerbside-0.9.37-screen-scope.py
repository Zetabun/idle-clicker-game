#!/usr/bin/env python3
from pathlib import Path
import subprocess

VERSION = '0.9.37'
BRANCH = 'agent/kerbside-0.9.37-screen-scoped-movement'


def replace_once(path, old, new):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if new in text:
        return
    if text.count(old) != 1:
        raise SystemExit(f'{path}: expected exactly one regression assertion to update')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


# Point 2 deliberately narrows an expanded scheduled service to one movement
# target. Keep the older end-to-end browser regression aligned with that new
# contract rather than expecting the pre-0.9.37 all-screens match count.
replace_once(
    'kerbside-backend/tests/train-movement-browser-regression.mjs',
    "  assert.ok(result.matches>=2,`expected movement matches, got ${result.matches}`);",
    "  assert.equal(result.matches,1,'opened scheduled service should narrow movement matching to one scoped target');",
)

# The dedicated static guard was written before serviceTargets() gained named
# finishScope() telemetry. Preserve the actual Saved Journeys behaviour while
# asserting the final implementation shape.
replace_once(
    'kerbside-backend/tests/train-movement-scope-regression.mjs',
    "assert.match(source, /if\\(savedApi\\?\\.state\\?\\.active\\)return targets;/, 'saved-journey overview must not continuously poll every saved train');",
    "assert.match(source, /if\\(savedApi\\?\\.state\\?\\.active\\)return finishScope\\('saved',targets\\);/, 'saved-journey overview must not continuously poll every saved train');",
)

Path('VERSION').write_text(VERSION + '\n', encoding='utf-8')
subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)

# The release workflow's ordinary publisher intentionally allow-lists browser
# files, while sync-version also covers a couple of consistency-only files.
# Commit the complete version sync here, then let the release workflow validate
# that exact branch state and remove this temporary release script/trigger in
# its final repository-safe commit. The two regression updates above stay
# unstaged here so the final atomic publisher commits them only after all tests
# have passed.
subprocess.run(['git', 'config', 'user.name', 'github-actions[bot]'], check=True)
subprocess.run(['git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], check=True)
subprocess.run([
    'git', 'add',
    'VERSION',
    'bus.html',
    'kerbside-status.js',
    'kerbside-saved-journeys-polish.js',
    'kerbside-train-movement.js',
    'kerbside-train-movement-worker/worker.js',
    'kerbside-backend/src/worker.js',
    'kerbside-backend/package.json',
    'kerbside-backend/test/worker.test.js',
    'kerbside-backend/tests/browser-regression.mjs',
    'kerbside-journey-planner-ui.js',
], check=True)
changed = subprocess.run(['git', 'diff', '--cached', '--quiet'], check=False).returncode != 0
if changed:
    subprocess.run(['git', 'commit', '-m', 'Sync Kerbside browser release to 0.9.37'], check=True)
    subprocess.run(['git', 'push', 'origin', f'HEAD:{BRANCH}'], check=True)
