#!/usr/bin/env python3
from pathlib import Path
import subprocess

VERSION = '0.9.38'
BRANCH = 'agent/kerbside-0.9.38-movement-batch-60'


def replace_once(path, old, new):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if new in text:
        return
    if text.count(old) != 1:
        raise SystemExit(f'{path}: expected exactly one target to update')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


# Point 3: the movement Worker already accepts 60 lookup refs per request.
# Match that limit in the browser so board screens with 41-60 refs can use one
# Durable Object lookup rather than two, without changing the 15-second cadence
# or any of the screen-scoping behaviour introduced in 0.9.37.
replace_once(
    'kerbside-train-movement.js',
    'const MAX_REFS_PER_REQUEST=40;',
    'const MAX_REFS_PER_REQUEST=60;',
)

replace_once(
    'kerbside-backend/tests/train-movement-scope-regression.mjs',
    "const source = fs.readFileSync(new URL('../../kerbside-train-movement.js', import.meta.url), 'utf8');\n\nassert.match(source, /const VERSION='0\\.9\\.37'/, 'movement frontend must identify the screen-scoped build');\nassert.match(source, /const MAX_REFS_PER_REQUEST=40;/, 'point 3 must remain out of this build');",
    "const source = fs.readFileSync(new URL('../../kerbside-train-movement.js', import.meta.url), 'utf8');\nconst workerSource = fs.readFileSync(new URL('../../kerbside-train-movement-worker/worker.js', import.meta.url), 'utf8');\n\nassert.match(source, /const VERSION='0\\.9\\.38'/, 'movement frontend must identify the 60-ref batching build');\nassert.match(source, /const MAX_REFS_PER_REQUEST=60;/, 'movement frontend must use the Worker-supported 60-ref batch size');\nassert.match(source, /chunk\\(\\[\\.\\.\\.set\\],MAX_REFS_PER_REQUEST\\)/, 'movement requests must be chunked by the configured batch limit');\nassert.match(workerSource, /const MAX_LOOKUP_REFS = 60;/, 'frontend batch size must remain aligned with the movement Worker lookup cap');",
)

Path('VERSION').write_text(VERSION + '\n', encoding='utf-8')
subprocess.run(['python3', '.github/scripts/sync-version.py'], check=True)

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
    'kerbside-backend/tests/train-movement-scope-regression.mjs',
    'kerbside-journey-planner-ui.js',
], check=True)
changed = subprocess.run(['git', 'diff', '--cached', '--quiet'], check=False).returncode != 0
if changed:
    subprocess.run(['git', 'commit', '-m', 'Release Kerbside movement batching 0.9.38'], check=True)
    subprocess.run(['git', 'push', 'origin', f'HEAD:{BRANCH}'], check=True)
