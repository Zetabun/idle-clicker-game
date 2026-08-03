from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / 'kerbside-backend/tests/browser-regression.mjs'
text = path.read_text(encoding='utf-8')

replacements = [
    (r"0\.6\.60", r"0\.6\.61", 'escaped browser version assertion'),
    (
        r"assert.match(busSource, /function matchRouteScanVehicle\(plan,v\)/);",
        r"assert.match(busSource, /function matchRouteScanVehicle\(plan,v,claimedTrips/);",
        'route scan matcher signature assertion',
    ),
]
for old, new, label in replacements:
    count = text.count(old)
    if count < 1:
        raise SystemExit(f'{label}: expected at least one match, found {count}')
    text = text.replace(old, new)
    print(f'Updated {count} {label}(s).')

path.write_text(text, encoding='utf-8')
