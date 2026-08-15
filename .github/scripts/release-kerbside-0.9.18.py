from pathlib import Path
import subprocess
import sys

version_path = Path('VERSION')
current = version_path.read_text(encoding='utf-8').strip()
if current != '0.9.17':
    raise SystemExit(f'Expected VERSION 0.9.17 before corrective release, found {current!r}')

version_path.write_text('0.9.18\n', encoding='utf-8')
subprocess.run([sys.executable, '.github/scripts/sync-version.py'], check=True)

# The train-route browser regression exercises route/date/source behaviour, not
# the optional football-event provider. Keep it deterministic and offline-safe:
# WebKit can surface a cross-origin fetch failure as pageerror even though the
# production event loader catches and degrades that optional feed.
test_path = Path('kerbside-backend/tests/train-route-filter-regression.mjs')
test_source = test_path.read_text(encoding='utf-8')
old = """  await page.route('**://huxley2.azurewebsites.net/**', handle);\n  await page.route('**://hux.azurewebsites.net/**', handle);\n}"""
new = """  await page.route('**://huxley2.azurewebsites.net/**', handle);\n  await page.route('**://hux.azurewebsites.net/**', handle);\n  await page.route('https://raw.githubusercontent.com/openfootball/football.json/**', route=>\n    json(route,200,{matches:[]})\n  );\n}"""
if test_source.count(old) != 1:
    raise SystemExit(f'Expected one train-route external mock block, found {test_source.count(old)}')
test_path.write_text(test_source.replace(old, new, 1), encoding='utf-8')
