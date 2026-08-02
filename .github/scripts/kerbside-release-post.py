from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / 'kerbside-backend/tests/browser-regression.mjs'
text = path.read_text(encoding='utf-8')
old = "assert.match(busSource, /far && \\(!gate \\|\\| !evidence\\.journeyMatch\\)/);\n"
if text.count(old) != 1:
    raise SystemExit(f'Expected one superseded far-range assertion, found {text.count(old)}')
path.write_text(text.replace(old, '', 1), encoding='utf-8')
print('Removed superseded far-range assertion for route-corridor release')
