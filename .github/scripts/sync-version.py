#!/usr/bin/env python3
"""Propagate the Kerbside version from VERSION into every file that repeats it.

The version lives in five places that must agree: the app constant, the Worker's
health payload, the backend package manifest, the Worker health test and two
assertions in the browser regression. Nothing enforced that, and it drifted more
than once — 0.6.70 shipped with the Worker still answering 0.6.69, and before
that the Worker sat on 0.6.60 while the app had reached 0.6.67. Production
verification compares the two, so each drift failed the smoke test after release
rather than before it.

  python .github/scripts/sync-version.py           rewrite every copy from VERSION
  python .github/scripts/sync-version.py --check   fail if any copy disagrees

--check runs in CI, so a mismatch is caught on the pull request instead of in
production.
"""
import io
import re
import sys
from pathlib import Path

VERSION_FILE = Path('VERSION')

# Each entry finds the version inside a known surrounding pattern, so a bare
# version-like string elsewhere in the file is never rewritten by accident.
TARGETS = [
    ('bus.html', r"(const APP_VERSION = ')(\d+\.\d+\.\d+)(';)"),
    ('kerbside-backend/src/worker.js', r"(    version: ')(\d+\.\d+\.\d+)(',)"),
    ('kerbside-backend/package.json', r'(  "version": ")(\d+\.\d+\.\d+)(",)'),
    ('kerbside-backend/test/worker.test.js', r"(assert\.equal\(body\.version, ')(\d+\.\d+\.\d+)('\);)"),
    ('kerbside-backend/tests/browser-regression.mjs', r"(const APP_VERSION = ')(\d+\\\.\d+\\\.\d+)('/\);)"),
    ('kerbside-backend/tests/browser-regression.mjs', r"(includes\('app )(\d+\.\d+\.\d+)('\))"),
]


def read_version():
    if not VERSION_FILE.is_file():
        raise SystemExit('VERSION file is missing')
    value = VERSION_FILE.read_text(encoding='utf-8').strip()
    if not re.fullmatch(r'\d+\.\d+\.\d+', value):
        raise SystemExit('VERSION must be a bare semantic version, got %r' % value)
    return value


def replacement_for(pattern, version):
    # The browser regression stores the app version as a regular expression, so
    # its dots arrive escaped and must be written back the same way.
    return version.replace('.', r'\.') if r'\d+\\\.' in pattern else version


def main():
    check = '--check' in sys.argv[1:]
    version = read_version()
    problems = []
    changed = []

    for path, pattern in TARGETS:
        target = Path(path)
        if not target.is_file():
            problems.append('%s is missing' % path)
            continue
        text = io.open(target, encoding='utf-8', newline='').read()
        matches = re.findall(pattern, text)
        if len(matches) != 1:
            problems.append('%s: expected exactly one version match, found %d' % (path, len(matches)))
            continue
        wanted = replacement_for(pattern, version)
        found = matches[0][1]
        if found == wanted:
            continue
        if check:
            problems.append('%s: has %s, VERSION says %s' % (path, found.replace('\\', ''), version))
            continue
        text = re.sub(pattern, lambda m: m.group(1) + wanted + m.group(3), text, count=1)
        io.open(target, 'w', encoding='utf-8', newline='').write(text)
        changed.append(path)

    if problems:
        for problem in problems:
            print('::error::%s' % problem)
        raise SystemExit(1)

    if check:
        print('Version %s is consistent across %d files.' % (version, len({path for path, _ in TARGETS})))
    elif changed:
        print('Wrote %s into: %s' % (version, ', '.join(sorted(set(changed)))))
    else:
        print('Version %s was already consistent.' % version)
    return 0


if __name__ == '__main__':
    sys.exit(main())
