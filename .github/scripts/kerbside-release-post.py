from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / 'kerbside-backend/tests/browser-regression.mjs'
text = path.read_text(encoding='utf-8')
old = r"0\.6\.60"
new = r"0\.6\.61"
count = text.count(old)
if count < 1:
    raise SystemExit(f'escaped browser version assertion: expected at least one match, found {count}')
path.write_text(text.replace(old, new), encoding='utf-8')
print(f'Updated {count} escaped browser version assertion(s) to Kerbside 0.6.61.')
