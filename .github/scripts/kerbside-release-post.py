from pathlib import Path

target = Path('kerbside-backend/tests/browser-regression.mjs')
source = target.read_text(encoding='utf-8')
old = r"assert.match(busSource, /function claimedScheduleFor\(row\)\{[\s\S]{0,180}if\(row\.gpsLost&&!row\.scheduleFallback\) return null;[\s\S]{0,120}return row\.schedule\|\|row\.matchedSchedule\|\|null;/);"
new = r"assert.match(busSource, /function claimedScheduleFor\(row\)\{[\s\S]{0,180}if\(row\.gpsLost&&!row\.scheduleFallback\) return null;[\s\S]{0,180}return row\.schedule\|\|row\.matchedSchedule\|\|exactIdentityScheduleClaim\(row\)\|\|null;/);"
count = source.count(old)
if count != 1:
    raise RuntimeError(f'claimedScheduleFor browser guard: expected exactly one stale assertion, found {count}')
target.write_text(source.replace(old, new, 1), encoding='utf-8')
Path(__file__).unlink()
print('Updated 0.7.23 claimedScheduleFor browser regression guard')
