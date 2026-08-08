from pathlib import Path

path = Path('kerbside-backend/tests/browser-regression.mjs')
text = path.read_text(encoding='utf-8')

old = r'''assert.match(busSource, /function ukWallClockEpoch\(year,month,day,hour,minute\)/);
assert.match(busSource, /return new Date\(ukWallClockEpoch\(/);
assert.doesNotMatch(busSource, /at\.setHours\(Math\.floor\(minuteOfDay\/60\),minuteOfDay%60,0,0\)/);
assert.match(busSource, /serviceDepartureTime\(serviceDate,mins\)/);'''

new = r'''assert.match(busSource, /function ukWallClockEpoch\(year,month,day,hour,minute\)/);
assert.match(busSource, /function serviceDayStartEpoch\(serviceDate\)/);
assert.match(busSource, /const noon=ukWallClockEpoch\(/);
assert.match(busSource, /return noon-12\*3600000;/);
assert.match(busSource, /return new Date\(serviceDayStartEpoch\(serviceDate\)\+total\*60000\);/);
assert.doesNotMatch(busSource, /return new Date\(ukWallClockEpoch\(/);
assert.doesNotMatch(busSource, /at\.setHours\(Math\.floor\(minuteOfDay\/60\),minuteOfDay%60,0,0\)/);
assert.match(busSource, /serviceDepartureTime\(serviceDate,mins\)/);'''

count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected one stale DST browser assertion block, found {count}')

path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Updated Kerbside browser regression to assert GTFS elapsed-time DST semantics.')
