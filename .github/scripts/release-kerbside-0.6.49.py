from pathlib import Path
import subprocess

PATH = '.github/scripts/release-kerbside-0.6.49.py'
source = subprocess.check_output(['git', 'show', 'HEAD^:' + PATH], text=True)
lines = source.splitlines()
index = next((i for i, line in enumerate(lines) if "'lost eta')" in line), -1)
if index < 1 or not lines[index - 1].startswith('s=rep(s,'):
    raise SystemExit('Could not locate the fragile lost ETA replacement')
lines[index - 1:index + 1] = [
    "s=rep(s,\"(due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')\",",
    "      \"(gpsLost?'last seen':due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')\",'lost eta')"
]
source = '\n'.join(lines) + '\n'
exec(compile(source, PATH, 'exec'))
