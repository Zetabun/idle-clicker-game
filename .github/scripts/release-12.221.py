from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
OLD = '12.220'
NEW = '12.221'
OLD_NAME = 'Mobile Mail Read Control'
NEW_NAME = 'Desktop Management Layout Restoration'
OLD_ID = '12.220.0-mobile-mail-read-control'
NEW_ID = '12.221.0-desktop-management-layout-restoration'


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8')


def replace_one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


release = SRC / 'RELEASE.json'
expected = {'version': OLD, 'name': OLD_NAME, 'build_id': OLD_ID}
if json.loads(read(release)) != expected:
    raise SystemExit('unexpected predecessor release')
write(release, json.dumps({'version': NEW, 'name': NEW_NAME, 'build_id': NEW_ID}, indent=2) + '\n')

core = SRC / 'js/00-core.js'
text = read(core)
text = replace_one(text, f"  const BUILD_VERSION = '{OLD}';", f"  const BUILD_VERSION = '{NEW}';", 'version')
text = replace_one(text, f"  const BUILD_NAME = '{OLD_NAME}';", f"  const BUILD_NAME = '{NEW_NAME}';", 'name')
text = replace_one(text, f"  const BUILD_ID = '{OLD_ID}';", f"  const BUILD_ID = '{NEW_ID}';", 'build id')
write(core, text)

css_path = SRC / 'css/compact-navigation.css'
css = read(css_path)
if 'Build 12.221: desktop management layout restoration' in css:
    raise SystemExit('desktop restoration block already exists')
css_block = r'''

/* --- Build 12.221: desktop management layout restoration -----------------
   Desktop management must occupy the full viewport. This guard is deliberately
   isolated to the established 1024px desktop breakpoint so compact/mobile
   navigation and its contextual header remain byte-for-byte unaffected. */
@media (min-width: 1024px) {
  #menuShell.menu-shell {
    inset: 0 !important;
    width: 100vw !important;
    max-width: none !important;
    min-width: 0 !important;
  }

  #menuShell .manager-topbar,
  #menuShell .menu-body,
  #menuShell .menu-layout {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
  }

  #menuShell .menu-layout {
    display: grid !important;
    grid-template-columns: minmax(260px, 340px) minmax(0, 1fr) !important;
  }

  #menuShell .menu-sidebar {
    position: relative !important;
    inset: auto !important;
    width: auto !important;
    max-width: none !important;
    min-width: 0 !important;
  }

  #menuShell .menu-content {
    width: auto !important;
    max-width: none !important;
    min-width: 0 !important;
  }

  #menuShell .mobile-header-submenu {
    display: none !important;
  }
}
'''
write(css_path, css.rstrip() + css_block)

build = SRC / 'build.py'
text = read(build)
text = replace_one(text, '"important_declarations_max": 2245,', '"important_declarations_max": 2270,', 'important budget')
text = replace_one(text, '"media_queries_max": 482,', '"media_queries_max": 483,', 'media budget')
write(build, text)

index = SRC / 'index.html'
text = read(index).replace(f'Strikewatch {OLD}: {OLD_NAME}', f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID, NEW_ID)
text = replace_one(text, f'id="managerBuildVersion">{OLD}</b>', f'id="managerBuildVersion">{NEW}</b>', 'desktop label')
text = replace_one(text, f'id="mobileCommandBuildVersion">{OLD}</b>', f'id="mobileCommandBuildVersion">{NEW}</b>', 'mobile label')
write(index, text)

note = f"Build {NEW} restores the desktop management shell to the full viewport with an explicit two-column sidebar/content grid at 1024px and wider. The correction is desktop-only and leaves compact/mobile navigation rules unchanged. See `AUDIT-{NEW}.md`.\n\n"
for path in (SRC / 'HANDOFF.md', SRC / 'AGENTS.md'):
    text = read(path)
    text = replace_one(text, f'Build {OLD} changes', note + f'Build {OLD} changes', path.name)
    if path.name == 'HANDOFF.md':
        text = replace_one(text, f'- Build: **{OLD} — {OLD_NAME}**', f'- Build: **{NEW} — {NEW_NAME}**', 'handoff build')
        text = replace_one(text, f'- Build ID: `{OLD_ID}`', f'- Build ID: `{NEW_ID}`', 'handoff id')
        text = replace_one(text, f'strikewatch-build-{OLD}.html', f'strikewatch-build-{NEW}.html', 'handoff standalone')
    write(path, text)

readme = SRC / 'README.md'
text = read(readme)
text = replace_one(text, f'# Strikewatch Source {OLD}', f'# Strikewatch Source {NEW}', 'readme title')
text = replace_one(text, f'dist/strikewatch-build-{OLD}.html', f'dist/strikewatch-build-{NEW}.html', 'readme dist')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
text = replace_one(
    text,
    f'Build {OLD} gives compact/mobile email dialogs an explicit Mark as Read action instead of automatically reading messages on open. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',
    f'Build {NEW} restores the desktop management interface to a full-width sidebar/content layout while preserving the compact/mobile presentation. See `HANDOFF.md` and `AUDIT-{NEW}.md`.',
    'project release note'
)
write(project, text)

write(SRC / f'AUDIT-{NEW}.md', f'''# Build {NEW} audit — {NEW_NAME}

## Problem
The desktop management interface could inherit a compact maximum width, leaving roughly half of a wide viewport blank and compressing the header, navigation and content into a narrow left-hand column.

## Change
- Added a final desktop-only layout guard at the established 1024px breakpoint.
- The management shell, top bar, body and layout now explicitly occupy the full viewport width on desktop.
- Desktop restores a bounded sidebar plus flexible content grid: `minmax(260px, 340px) minmax(0, 1fr)`.
- Sidebar and content minimum/maximum width constraints are normalised so content can expand without clipping.
- The injected mobile header submenu is explicitly hidden on desktop.
- Every rule is inside `@media (min-width: 1024px)`; compact/mobile selectors and behaviour below that breakpoint are unchanged.
- Gameplay, routes, mail behaviour, save schema 19 and diagnostics schema 1 are unchanged.

## Verification
The release requires deterministic bundle and standalone builds, parsing of all modular/generated/standalone JavaScript, targeted desktop-breakpoint assertions, confirmation that the compact `max-width: 760px` contextual-navigation rules remain present, and root/standalone byte identity. A source-level responsive isolation check is included; independent live-browser computed-style verification remains desirable at 1024px, 1366px and ultrawide widths.
''')

updated_css = read(css_path)
required = [
    'Build 12.221: desktop management layout restoration',
    '@media (min-width: 1024px)',
    '#menuShell.menu-shell',
    'width: 100vw !important',
    'grid-template-columns: minmax(260px, 340px) minmax(0, 1fr) !important',
    '#menuShell .mobile-header-submenu',
    '@media (max-width:760px)'
]
for anchor in required:
    if anchor not in updated_css:
        raise SystemExit(f'missing expected CSS anchor: {anchor}')

print(f'Applied Build {NEW}: {NEW_NAME}')
