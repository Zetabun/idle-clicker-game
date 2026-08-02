from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / 'kerbside-backend/tests/browser-regression.mjs'
text = path.read_text(encoding='utf-8')

superseded = r"assert.match(busSource, /far && \(!gate \|\| !evidence\.journeyMatch\)/);" + "\n"
if text.count(superseded) != 1:
    raise SystemExit(f'Expected one superseded far-range assertion, found {text.count(superseded)}')
text = text.replace(superseded, '', 1)

fragile = r"assert.match(busSource, /if\(d>FAR_VEH_DIST&&!corridorFar\)/);" + "\n"
robust = r"assert.match(busSource, /d>FAR_VEH_DIST&&!corridorFar/);" + "\n"
if text.count(fragile) != 1:
    raise SystemExit(f'Expected one fragile route-corridor assertion, found {text.count(fragile)}')
text = text.replace(fragile, robust, 1)

path.write_text(text, encoding='utf-8')
print('Updated route-corridor source assertions')
