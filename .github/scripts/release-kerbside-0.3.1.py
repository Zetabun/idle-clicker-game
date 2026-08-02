#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import tempfile

PATH = Path('bus.html')
text = PATH.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    "const APP_VERSION = '0.3.0';",
    "const APP_VERSION = '0.3.1';",
    'version bump',
)

replace_once(
    "  await Promise.all([findAnchor(lat,lon,run), findStops(lat,lon,run)]);\n"
    "  if(run===S.locationRun) startPolling();",
    "  const anchorPromise=findAnchor(lat,lon,run);\n"
    "  await findStops(lat,lon,run);\n"
    "  if(run===S.locationRun) startPolling();\n"
    "  await anchorPromise;",
    'start polling as soon as stops are ready',
)

replace_once(
    "  loadWorkerHistory(s);\n"
    "  savePrefs(); render();\n"
    "}",
    "  loadWorkerHistory(s);\n"
    "  savePrefs(); render();\n"
    "  if(changed && S.timer){\n"
    "    setStatus('Refreshing selected stop','');\n"
    "    poll();\n"
    "  }\n"
    "}",
    'refresh immediately after stop change',
)

replace_once(
    "  if(!out.length && gated){\n"
    "    out=collect(false);\n"
    "    S.filterFellBack=out.length>0;\n"
    "  }",
    "  // A matched timetable stop is authoritative. Never replace an empty,\n"
    "  // verified board with nearby buses that may belong to an adjacent stop.\n"
    "  if(!out.length && gated && !S.ttStop){\n"
    "    out=collect(false);\n"
    "    S.filterFellBack=out.length>0;\n"
    "  }",
    'disable geographic fallback for timetable-matched stops',
)

PATH.write_text(text, encoding='utf-8')

required = [
    "const APP_VERSION = '0.3.1';",
    'const anchorPromise=findAnchor(lat,lon,run);',
    "if(changed && S.timer){",
    'if(!out.length && gated && !S.ttStop){',
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'missing expected marker after patch: {marker}')

scripts = re.findall(r'<script(?![^>]*\\bsrc=)[^>]*>(.*?)</script>', text, flags=re.I | re.S)
if not scripts:
    raise SystemExit('no inline scripts found for syntax validation')

with tempfile.TemporaryDirectory() as tmp:
    for index, script in enumerate(scripts, start=1):
        filename = Path(tmp) / f'inline-{index}.js'
        filename.write_text(script, encoding='utf-8')
        subprocess.run(['node', '--check', str(filename)], check=True)

print('Kerbside 0.3.1 patch applied and inline JavaScript validated.')
