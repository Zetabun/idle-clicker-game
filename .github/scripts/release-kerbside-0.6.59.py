from pathlib import Path
from urllib.parse import quote

OLD = "0.6.58"
NEW = "0.6.59"

HEADER_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192" role="img" aria-label="Kerbside bus and location icon"><defs><linearGradient id="kerbside-amber" x1="18" y1="22" x2="172" y2="174" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFD94A"/><stop offset="0.48" stop-color="#FFBF00"/><stop offset="1" stop-color="#FF9F00"/></linearGradient><mask id="bus-cutouts"><rect x="99" y="48" width="76" height="91" rx="18" fill="white"/><rect x="114" y="57" width="46" height="8" rx="4" fill="black"/><rect x="108" y="73" width="58" height="36" rx="6" fill="black"/><circle cx="118" cy="121" r="7" fill="black"/><circle cx="156" cy="121" r="7" fill="black"/></mask></defs><path fill="url(#kerbside-amber)" fill-rule="evenodd" d="M47 17C25.5 17 9 33.6 9 54.8c0 29.5 38 69.7 38 69.7s38-40.2 38-69.7C85 33.6 68.5 17 47 17Zm0 20.3a17.5 17.5 0 1 1 0 35 17.5 17.5 0 0 1 0-35Z"/><path d="M43 132h24c17 0 24 5 31 21l8 18c5 11 13 15 27 15h21c11 0 19-4 25-13" fill="none" stroke="url(#kerbside-amber)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><rect x="99" y="48" width="76" height="91" rx="18" fill="url(#kerbside-amber)" mask="url(#bus-cutouts)"/><rect x="107" y="132" width="15" height="18" rx="7.5" fill="url(#kerbside-amber)"/><rect x="152" y="132" width="15" height="18" rx="7.5" fill="url(#kerbside-amber)"/></svg>'''
HEADER_DATA_URI = "data:image/svg+xml," + quote(HEADER_SVG, safe="")


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bus = read("bus.html")
bus = replace_once(bus, f"const APP_VERSION = '{OLD}';", f"const APP_VERSION = '{NEW}';", "browser version")
bus = replace_once(
    bus,
    '<img class="brand-icon" src="kerbside-backend/icons/kerbside-header.svg" alt="" width="38" height="38">',
    f'<img class="brand-icon" src="{HEADER_DATA_URI}" alt="" width="38" height="38">',
    "embedded header icon",
)
write("bus.html", bus)

package = read("kerbside-backend/package.json")
package = replace_once(package, f'"version": "{OLD}"', f'"version": "{NEW}"', "package version")
write("kerbside-backend/package.json", package)

worker = read("kerbside-backend/src/worker.js")
worker = replace_once(worker, f"version: '{OLD}'", f"version: '{NEW}'", "worker version")
write("kerbside-backend/src/worker.js", worker)

worker_test = read("kerbside-backend/test/worker.test.js")
worker_test = replace_once(worker_test, f"assert.equal(body.version, '{OLD}');", f"assert.equal(body.version, '{NEW}');", "worker test version")
write("kerbside-backend/test/worker.test.js", worker_test)

browser = read("kerbside-backend/tests/browser-regression.mjs")
browser = replace_once(
    browser,
    "const headerIconSource = await readFile(path.join(root, 'kerbside-backend', 'icons', 'kerbside-header.svg'), 'utf8');\n",
    "",
    "remove external icon fixture",
)
browser = replace_once(
    browser,
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.58'/);",
    "assert.match(busSource, /const APP_VERSION = '0\\.6\\.59'/);",
    "browser version guard",
)
browser = replace_once(
    browser,
    '''assert.match(busSource, /class="brand-icon" src="kerbside-backend\\/icons\\/kerbside-header\\.svg"/);
assert.match(busSource, /\\.brand-icon\\{display:block;width:38px;height:38px;flex:0 0 38px;object-fit:contain\\}/);
assert.match(headerIconSource, /viewBox="0 0 192 192"/);
assert.match(headerIconSource, /linearGradient id="kerbside-amber"/);
assert.doesNotMatch(headerIconSource, /<rect[^>]+width="192"[^>]+height="192"[^>]+fill=/);''',
    '''assert.match(busSource, /class="brand-icon" src="data:image\\/svg\\+xml,%3Csvg/);
assert.match(busSource, /\\.brand-icon\\{display:block;width:38px;height:38px;flex:0 0 38px;object-fit:contain\\}/);
assert.match(busSource, /viewBox%3D%220%200%20192%20192%22/);
assert.match(busSource, /kerbside-amber/);
assert.doesNotMatch(busSource, /kerbside-header\\.svg/);
assert.doesNotMatch(busSource, /%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%22192%22%20height%3D%22192%22/);''',
    "embedded icon source guards",
)
browser = replace_once(
    browser,
    "      iconSrc:new URL(icon.getAttribute('src'),location.href).pathname,\n      iconLoaded:icon.complete&&icon.naturalWidth===192,",
    "      iconEmbedded:icon.getAttribute('src').startsWith('data:image/svg+xml,'),\n      iconLoaded:icon.complete&&icon.naturalWidth===192,",
    "runtime embedded icon check",
)
browser = replace_once(
    browser,
    "    topDisplay:'grid',iconDisplay:'block',iconSrc:'/kerbside-backend/icons/kerbside-header.svg',\n    iconLoaded:true,iconFit:'contain',",
    "    topDisplay:'grid',iconDisplay:'block',iconEmbedded:true,\n    iconLoaded:true,iconFit:'contain',",
    "runtime embedded icon expectation",
)
browser = replace_once(
    browser,
    "textContent.includes('app 0.6.58')",
    "textContent.includes('app 0.6.59')",
    "settings version expectation",
)
write("kerbside-backend/tests/browser-regression.mjs", browser)

readme = read("kerbside-backend/README.md")
release_note = """Kerbside 0.6.59 fixes the 0.6.58 deployment packaging gap by embedding the transparent yellow bus-and-location artwork directly inside `bus.html` as an SVG data URI. This keeps the icon background-free and preserves the validated 38-pixel mobile header layout while ensuring GitHub Pages receives the artwork atomically with the page instead of depending on a separately generated untracked asset. WebKit regression verifies that the embedded SVG loads at 192 × 192, uses `object-fit: contain`, has no full-canvas background rectangle and requires no external header-icon file.

"""
readme = replace_once(
    readme,
    "The Worker remains backwards-compatible for live data:",
    release_note + "The Worker remains backwards-compatible for live data:",
    "release note",
)
write("kerbside-backend/README.md", readme)

print(f"Prepared Kerbside {NEW} atomic embedded mobile header icon release.")
