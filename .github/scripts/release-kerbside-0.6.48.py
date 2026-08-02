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
    if "Prepared Kerbside 0.6.48 route-corridor GPS release" in candidate:
        source = candidate
        break
if source is None:
    raise SystemExit('Could not locate the original 0.6.48 release implementation in branch history')

old_geometry = "bus = replace_count(bus, \"const pattern=timetablePatternRecord(v.journey);\", \"const pattern=timetablePatternRecord(vehicleJourneyRef(v));\", 2, 'resolved journey geometry')"
new_geometry = """bus = replace_once(bus, \"const pattern=timetablePatternRecord(v.journey);\", \"const pattern=timetablePatternRecord(vehicleJourneyRef(v));\", 'resolved journey geometry')
bus = replace_once(bus, \"const pattern=timetablePatternRecord(v&&v.journey);\", \"const pattern=timetablePatternRecord(vehicleJourneyRef(v));\", 'resolved journey progress')"""
if source.count(old_geometry) != 1:
    raise SystemExit(f'Expected one geometry transformation, found {source.count(old_geometry)}')
source = source.replace(old_geometry, new_geometry, 1)

old_evidence = "bus = replace_once(bus, \"  const evidence=routeEvidence(v.line,v.dest,v.journey);\", \"  const journeyRef=vehicleJourneyRef(v);\\n  const evidence=routeEvidence(v.line,v.dest,journeyRef);\", 'estimate route evidence')"
new_evidence = """estimate_evidence_old = \"  const evidence=routeEvidence(v.line,v.dest,v.journey);\"
if bus.count(estimate_evidence_old) < 1:
    raise SystemExit('estimate route evidence: expected at least one match')
bus = bus.replace(estimate_evidence_old, \"  const journeyRef=vehicleJourneyRef(v);\\n  const evidence=routeEvidence(v.line,v.dest,journeyRef);\", 1)"""
if source.count(old_evidence) != 1:
    raise SystemExit(f'Expected one estimate evidence transformation, found {source.count(old_evidence)}')
source = source.replace(old_evidence, new_evidence, 1)

impl = ROOT / '.github/scripts/kerbside-0.6.48-impl.py'
try:
    impl.write_text(source, encoding='utf-8')
    namespace = {'__name__': '__main__', '__file__': str(impl)}
    exec(compile(source, str(impl), 'exec'), namespace)
finally:
    impl.unlink(missing_ok=True)
