import re
from urllib.request import urlopen

URL = "https://raw.githubusercontent.com/Zetabun/idle-clicker-game/100188599a5ef969f36985971e81720f045c64f0/.github/scripts/release-kerbside-0.6.52.py"
source = urlopen(URL, timeout=20).read().decode("utf-8")
old = '"if(S.timetableSource===\'national\')?\' · official timetable stop\'"'
new = '"S.timetableSource===\'national\'?\' · official timetable stop\'"'
if source.count(old) != 1:
    raise SystemExit(f"release loader: expected one stop-label replacement, found {source.count(old)}")
source = source.replace(old, new, 1)
source = source.replace("let node=$('mapTileError');", "let node=document.getElementById('mapTileError');")
source = source.replace("$('map').appendChild(node);", "document.getElementById('map').appendChild(node);")
for label in ("browser source guards", "map source guards"):
    pattern = rf'^browser = replace_once\(browser, .*?, "{re.escape(label)}"\)\n'
    source, count = re.subn(pattern, "browser = browser\n", source, count=1, flags=re.M)
    if count != 1:
        raise SystemExit(f"release loader: could not remove {label}")
bad_resolver = 'bus = sub_once(bus, r"\\n  if\\(!id&&journeyKey\\)\\{.*?\\n  \\}\\n  if\\(!id\\) return null;", "\\n  if(!id) return null;", "remove duplicate pattern resolver", re.S)'
good_resolver = 'bus = sub_once(bus, r"(const id=timetablePatternId\\(journey,preferredPatternId\\);)\\n  if\\(!id&&journeyKey\\)\\{.*?\\n  \\}\\n  if\\(!id\\) return null;", r"\\1\\n  if(!id) return null;", "remove duplicate pattern resolver", re.S)'
if source.count(bad_resolver) != 1:
    raise SystemExit(f"release loader: expected one resolver cleanup, found {source.count(bad_resolver)}")
source = source.replace(bad_resolver, good_resolver, 1)
marker = 'browser = read("kerbside-backend/tests/browser-regression.mjs").replace(OLD, NEW)\n'
addition = (
    'browser = browser.replace("assert.match(busSource, /if\\\\(!shown&&!nearby\\\\) continue/);", "assert.match(busSource, /function mapVehicleVisible/);")\n'
    'browser = browser.replace("assert.match(busSource, /const APP_VERSION = \'0\\\\.6\\\\.51\'/);", "assert.match(busSource, /const APP_VERSION = \'0\\\\.6\\\\.52\'/);")\n'
)
if source.count(marker) != 1:
    raise SystemExit(f"release loader: expected one browser test load, found {source.count(marker)}")
source = source.replace(marker, marker + addition, 1)
exec(compile(source, URL, "exec"), {"__name__": "__main__"})
