from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PATH = '.github/scripts/release-kerbside-0.6.48.py'

source = subprocess.check_output(['git', 'show', f'HEAD^:{PATH}'], cwd=ROOT, text=True)
old = "bus = replace_count(bus, \"const pattern=timetablePatternRecord(v.journey);\", \"const pattern=timetablePatternRecord(vehicleJourneyRef(v));\", 2, 'resolved journey geometry')"
new = """bus = replace_once(bus, \"const pattern=timetablePatternRecord(v.journey);\", \"const pattern=timetablePatternRecord(vehicleJourneyRef(v));\", 'resolved journey geometry')
bus = replace_once(bus, \"const pattern=timetablePatternRecord(v&&v.journey);\", \"const pattern=timetablePatternRecord(vehicleJourneyRef(v));\", 'resolved journey progress')"""
if source.count(old) != 1:
    raise SystemExit(f'Expected one geometry transformation, found {source.count(old)}')
source = source.replace(old, new, 1)
impl = ROOT / '.github/scripts/kerbside-0.6.48-impl.py'
try:
    impl.write_text(source, encoding='utf-8')
    namespace = {'__name__': '__main__', '__file__': str(impl)}
    exec(compile(source, str(impl), 'exec'), namespace)
finally:
    impl.unlink(missing_ok=True)
