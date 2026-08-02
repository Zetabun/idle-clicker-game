from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PATH = '.github/scripts/release-kerbside-0.6.48.py'

source = None
for revision in subprocess.check_output(['git', 'rev-list', 'HEAD'], cwd=ROOT, text=True).splitlines():
    try:
        candidate = subprocess.check_output(['git', 'show', f'{revision}:{PATH}'], cwd=ROOT, text=True, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        continue
    if len(candidate) > 20000 and "Prepared Kerbside 0.6.48 route-corridor GPS release" in candidate:
        source = candidate
        break
if source is None:
    raise SystemExit('Could not locate the original 0.6.48 release implementation in branch history')

lines = source.splitlines()
geometry = [index for index, line in enumerate(lines) if "'resolved journey geometry'" in line]
if len(geometry) != 1:
    raise SystemExit(f'Expected one labelled geometry transformation, found {len(geometry)}')
lines[geometry[0]:geometry[0] + 1] = [
    "bus = replace_once(bus, \"const pattern=timetablePatternRecord(v.journey);\", \"const pattern=timetablePatternRecord(vehicleJourneyRef(v));\", 'resolved journey geometry')",
    "bus = replace_once(bus, \"const pattern=timetablePatternRecord(v&&v.journey);\", \"const pattern=timetablePatternRecord(vehicleJourneyRef(v));\", 'resolved journey progress')",
]

evidence = [index for index, line in enumerate(lines) if "'estimate route evidence'" in line]
if len(evidence) != 1:
    raise SystemExit(f'Expected one labelled estimate transformation, found {len(evidence)}')
lines[evidence[0]:evidence[0] + 1] = [
    "estimate_evidence_old = \"  const evidence=routeEvidence(v.line,v.dest,v.journey);\"",
    "if bus.count(estimate_evidence_old) < 1:",
    "    raise SystemExit('estimate route evidence: expected at least one match')",
    "bus = bus.replace(estimate_evidence_old, \"  const journeyRef=vehicleJourneyRef(v);\\n  const evidence=routeEvidence(v.line,v.dest,journeyRef);\", 1)",
]
source = '\n'.join(lines) + '\n'

impl = ROOT / '.github/scripts/kerbside-0.6.48-impl.py'
try:
    impl.write_text(source, encoding='utf-8')
    namespace = {'__name__': '__main__', '__file__': str(impl)}
    exec(compile(source, str(impl), 'exec'), namespace)
finally:
    impl.unlink(missing_ok=True)
