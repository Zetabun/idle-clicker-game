import subprocess

PATH = '.github/scripts/release-kerbside-0.6.49.py'
ORIGINAL = '9a1f695bcc895103dbbf00062552b98f2ae92223'
source = subprocess.check_output(['git', 'show', ORIGINAL + ':' + PATH], text=True)
lines = source.splitlines()

eta_index = next((i for i, line in enumerate(lines) if "'lost eta')" in line), -1)
if eta_index < 1 or not lines[eta_index - 1].startswith('s=rep(s,'):
    raise SystemExit('Could not locate the fragile lost ETA replacement')
lines[eta_index - 1:eta_index + 1] = [
    "s=rep(s,\"(due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')\",",
    "      \"(gpsLost?'last seen':due?'arriving':(!gpsFresh||r.confidence==='low')?'est':'min')\",'lost eta')"
]

read_index = next((i for i, line in enumerate(lines) if line.startswith('t=T.read_text();')), -1)
if read_index < 0:
    raise SystemExit('Could not locate browser test patch section')
lines.insert(read_index + 1,
    "t=rep(t,\"assert.match(busSource, /function timetablePatternRecord\\\\(journey\\\\)/);\",\"assert.match(busSource, /function timetablePatternRecord\\\\(journey,preferredPatternId\\\\)/);\",'pattern signature assertion')")

source = '\n'.join(lines) + '\n'
exec(compile(source, PATH, 'exec'))
