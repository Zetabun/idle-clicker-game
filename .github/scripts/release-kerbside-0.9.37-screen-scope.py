#!/usr/bin/env python3
from pathlib import Path
import subprocess

VERSION = '0.9.37'
BRANCH = 'agent/kerbside-0.9.37-screen-scoped-movement'

Path('VERSION').write_text(VERSION + '\n', encoding='utf-8')
subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)

# The release workflow's ordinary publisher intentionally allow-lists browser
# files, while sync-version also covers a couple of consistency-only files.
# Commit the complete version sync here, then let the release workflow validate
# that exact branch state and remove this temporary release script/trigger in
# its final repository-safe commit.
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
