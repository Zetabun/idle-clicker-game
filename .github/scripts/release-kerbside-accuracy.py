#!/usr/bin/env python3
"""Apply the reviewed Kerbside 0.7.3 accuracy patch fail-closed.

The complete exact-match patch is retained in the temporary branch workflow so
it can be audited in the PR. This release adapter extracts only that Python
patch body, compiles it before execution, verifies the exact changed-file set,
and performs browser-script syntax checks before the repository release workflow
runs its backend and WebKit suites.
"""
from __future__ import annotations

import re
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

WORKFLOW = Path('.github/workflows/apply-kerbside-accuracy.yml')
START = "          python3 - <<'PY'\n"
END = "\n          PY\n\n          python3 .github/scripts/sync-version.py"
EXPECTED_CHANGED = {
    'VERSION',
    'bus.html',
    'kerbside-backend/package.json',
    'kerbside-backend/src/worker.js',
    'kerbside-backend/test/worker.test.js',
    'kerbside-backend/tests/browser-regression.mjs',
    'kerbside-backend/tests/audit-regression.mjs',
}


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def main() -> int:
    if not WORKFLOW.is_file():
        raise SystemExit(f'Missing reviewed patch source: {WORKFLOW}')

    source = WORKFLOW.read_text(encoding='utf-8')
    if source.count(START) != 1 or source.count(END) != 1:
        raise SystemExit('Reviewed workflow patch markers are missing or ambiguous')

    patch = source.split(START, 1)[1].split(END, 1)[0]
    patch = textwrap.dedent(patch)
    compile(patch, str(WORKFLOW) + ':accuracy-patch', 'exec')
    namespace = {'__name__': '__kerbside_accuracy_release__'}
    exec(patch, namespace, namespace)

    run(sys.executable, '.github/scripts/sync-version.py')

    changed = set(
        subprocess.check_output(['git', 'diff', '--name-only', '--'], text=True)
        .splitlines()
    )
    if changed != EXPECTED_CHANGED:
        missing = sorted(EXPECTED_CHANGED - changed)
        unexpected = sorted(changed - EXPECTED_CHANGED)
        raise SystemExit(
            f'Accuracy patch changed the wrong files; missing={missing}, unexpected={unexpected}'
        )

    version = Path('VERSION').read_text(encoding='utf-8').strip()
    if version != '0.7.3':
        raise SystemExit(f'Expected VERSION 0.7.3, found {version!r}')

    bus = Path('bus.html').read_text(encoding='utf-8')
    required = [
        "const APP_VERSION = '0.7.3';",
        'const MAX_SCHEDULED_ROWS = 72;',
        'function requestBestLocation(',
        'function scheduleCandidateReason(',
        "matching GPS is delayed",
        'vehicleRejections:new Map()',
        'journeyBearingOverride',
    ]
    missing_tokens = [token for token in required if token not in bus]
    if missing_tokens:
        raise SystemExit(f'Missing required accuracy changes: {missing_tokens}')
    if 'possible GPS match was filtered' in bus:
        raise SystemExit('Generic GPS-filter wording remains in bus.html')

    scripts = re.findall(
        r'<script(?![^>]*\\bsrc=)[^>]*>(.*?)</script>',
        bus,
        flags=re.I | re.S,
    )
    if not scripts:
        raise SystemExit('No inline browser scripts found')
    with tempfile.TemporaryDirectory() as directory:
        for index, script in enumerate(scripts, start=1):
            target = Path(directory) / f'inline-{index}.js'
            target.write_text(script, encoding='utf-8')
            run('node', '--check', str(target))

    run('git', 'diff', '--check')
    print('Applied and statically validated Kerbside 0.7.3 accuracy patch.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
