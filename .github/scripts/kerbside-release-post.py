from pathlib import Path

path = Path('kerbside-backend/tests/browser-regression.mjs')
source = path.read_text(encoding='utf-8')
old = r"assert.match(busSource, /officialResult&&officialResult\.complete/);"
new = r"assert.match(busSource, /if\(official\.length&&officialResult\.complete\)/);"
count = source.count(old)
if count != 1:
    raise SystemExit(f'partial stop assertion: expected one match, found {count}')
path.write_text(source.replace(old, new, 1), encoding='utf-8')
print('Corrected partial stop static assertion')
