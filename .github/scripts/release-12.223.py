from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
OLD = '12.222'
NEW = '12.223'
OLD_NAME = 'League Fixtures Submenu'
NEW_NAME = 'Desktop Must Respond Layout'
OLD_ID = '12.222.0-league-fixtures-submenu'
NEW_ID = '12.223.0-desktop-must-respond-layout'


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

css = SRC / 'css/compact-navigation.css'
text = read(css)
marker = 'Build 12.223: desktop MUST RESPOND disclosure correction'
if marker in text:
    raise SystemExit('desktop MUST RESPOND correction already present')
text = text.rstrip() + '''

/* --- Build 12.223: desktop MUST RESPOND disclosure correction ------------
   The expanded disclosure previously allowed its summary and body to share
   the old desktop grid, placing summary copy, explanatory copy and actions in
   three squeezed horizontal columns. Desktop now uses one disclosure flow:
   full-width summary first, then the actionable groups beneath it. */
@media (min-width: 1024px) {
  #menuContent .club-must-respond-strip {
    display: block !important;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    overflow: hidden;
  }

  #menuContent .club-must-respond-strip > summary {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 28px !important;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-width: 0;
    min-height: 68px;
    box-sizing: border-box;
    padding: 13px 16px 13px 18px;
    cursor: pointer;
    list-style: none;
  }

  #menuContent .club-must-respond-strip > summary::marker { content: ""; }
  #menuContent .club-must-respond-strip > summary::-webkit-details-marker { display: none; }

  #menuContent .club-must-respond-strip > summary > span {
    display: grid !important;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: baseline;
    gap: 4px 14px;
    min-width: 0;
  }

  #menuContent .club-must-respond-strip > summary b {
    grid-column: 1;
    white-space: nowrap;
    font-size: 11px;
    letter-spacing: .15em;
  }

  #menuContent .club-must-respond-strip > summary strong {
    grid-column: 2;
    min-width: 0;
    font-size: 16px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  #menuContent .club-must-respond-strip > summary small {
    grid-column: 1 / -1;
    min-width: 0;
    font-size: 12px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  #menuContent .club-must-respond-strip > summary > i {
    position: relative;
    width: 24px;
    height: 24px;
    justify-self: end;
    border: 1px solid currentColor;
    border-radius: 50%;
    opacity: .82;
  }

  #menuContent .club-must-respond-strip > summary > i::before,
  #menuContent .club-must-respond-strip > summary > i::after {
    content: "";
    position: absolute;
    left: 6px;
    right: 6px;
    top: 11px;
    height: 2px;
    background: currentColor;
  }

  #menuContent .club-must-respond-strip > summary > i::after {
    transform: rotate(90deg);
    transition: transform .16s ease;
  }

  #menuContent .club-must-respond-strip[open] > summary {
    border-bottom: 1px solid rgba(255,255,255,.10);
  }

  #menuContent .club-must-respond-strip[open] > summary > i::after {
    transform: rotate(0deg);
  }

  #menuContent .club-must-respond-strip[open] > summary small {
    display: none;
  }

  #menuContent .club-must-respond-strip:not([open]) > .club-must-respond-body {
    display: none !important;
  }

  #menuContent .club-must-respond-strip[open] > .club-must-respond-body {
    display: block !important;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  #menuContent .club-must-respond-body > header {
    display: none !important;
  }

  #menuContent .club-response-groups {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)) !important;
    gap: 12px;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 14px 16px 16px;
  }

  #menuContent .club-response-group,
  #menuContent .club-response-group > div,
  #menuContent .club-response-group button {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  #menuContent .club-response-group button {
    width: 100%;
  }

  #menuContent .club-response-group button > span,
  #menuContent .club-response-group button > small {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  #menuContent .club-response-group button > b {
    white-space: nowrap;
  }
}
''' + '\n'
write(css, text)

index = SRC / 'index.html'
text = read(index)
text = text.replace(f'Strikewatch {OLD}: {OLD_NAME}', f'Strikewatch {NEW}: {NEW_NAME}')
text = text.replace(OLD_ID, NEW_ID)
text = replace_one(text, f'id="managerBuildVersion">{OLD}</b>', f'id="managerBuildVersion">{NEW}</b>', 'desktop build label')
text = replace_one(text, f'id="mobileCommandBuildVersion">{OLD}</b>', f'id="mobileCommandBuildVersion">{NEW}</b>', 'mobile build label')
write(index, text)

note = f"Build {NEW} repairs the expanded desktop MUST RESPOND disclosure. Its summary now occupies the full row, the action groups open beneath it, duplicate explanatory copy is suppressed on desktop, and the compact/mobile disclosure rules remain unchanged. See `AUDIT-{NEW}.md`.\n\n"
for path in (SRC / 'HANDOFF.md', SRC / 'AGENTS.md'):
    text = read(path)
    text = replace_one(text, f'Build {OLD} gives', note + f'Build {OLD} gives', path.name)
    if path.name == 'HANDOFF.md':
        text = replace_one(text, f'- Build: **{OLD} — {OLD_NAME}**', f'- Build: **{NEW} — {NEW_NAME}**', 'handoff build')
        text = replace_one(text, f'- Build ID: `{OLD_ID}`', f'- Build ID: `{NEW_ID}`', 'handoff id')
        text = replace_one(text, f'strikewatch-build-{OLD}.html', f'strikewatch-build-{NEW}.html', 'handoff standalone')
    write(path, text)

readme = SRC / 'README.md'
text = read(readme)
text = replace_one(text, f'# Strikewatch Source {OLD}', f'# Strikewatch Source {NEW}', 'readme title')
text = replace_one(text, f'dist/strikewatch-build-{OLD}.html', f'dist/strikewatch-build-{NEW}.html', 'readme standalone')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
text = replace_one(
    text,
    f'Build {OLD} moves the full league fixture calendar into its own responsive submenu while preserving the single league schedule and standings authority. See `HANDOFF.md` and `AUDIT-{OLD}.md`.',
    f'Build {NEW} repairs the expanded desktop MUST RESPOND disclosure while preserving the existing compact/mobile presentation and blocker authority. See `HANDOFF.md` and `AUDIT-{NEW}.md`.',
    'project release note'
)
write(project, text)

write(SRC / f'AUDIT-{NEW}.md', f'''# Build {NEW} audit — {NEW_NAME}

## Problem
When MUST RESPOND was expanded on desktop, the disclosure summary and its body participated in the inherited horizontal grid. The summary copy, secondary explanatory header and action group were consequently squeezed into adjacent columns, producing merged text and an obviously broken wide-screen layout.

## Change
- Added a desktop-only correction at the established 1024px breakpoint in the final `compact-navigation.css` cascade layer.
- The `<details>` disclosure now uses a normal block flow on desktop.
- Its summary occupies the complete available width with a bounded copy column and an explicit plus/minus control.
- The expanded action groups render beneath the summary instead of beside it.
- The redundant expanded explanatory header is hidden on desktop; the actionable category and button remain visible.
- The summary detail is shown while collapsed and suppressed while expanded to avoid repeating the same blocker text above the action card.
- Long labels and descriptions wrap within their own columns and action cards cannot exceed the disclosure width.
- The explicit closed-state rule prevents the body from being exposed by later desktop display overrides.
- All rules are inside `@media (min-width: 1024px)`. Existing compact/mobile disclosure behaviour and navigation remain unchanged.
- Gameplay, blocker authority, save schema 19 and diagnostics schema 1 are unchanged.

## Verification
The release requires deterministic double builds; parsing of modular, generated and standalone JavaScript; source-level confirmation that the correction is desktop-scoped; computed-style checks in headless Chrome at 1024px and 1440px confirming that the summary and expanded body each occupy the full disclosure width, the body begins below the summary, the duplicate desktop header is hidden, the closed body is hidden, and no horizontal overflow is introduced; preservation of the compact `max-width: 1023px` disclosure rules; and byte identity between the standalone and root `cod.html`.
''')

css_text = read(css)
required = [
    'Build 12.223: desktop MUST RESPOND disclosure correction',
    '#menuContent .club-must-respond-strip {',
    'display: block !important;',
    '#menuContent .club-must-respond-strip[open] > .club-must-respond-body {',
    '#menuContent .club-must-respond-body > header {',
    '#menuContent .club-must-respond-strip:not([open]) > .club-must-respond-body {'
]
for value in required:
    if value not in css_text:
        raise SystemExit(f'missing CSS assertion: {value}')
if '@media (max-width: 1023px)' not in css_text:
    raise SystemExit('compact MUST RESPOND rules missing')

print(f'Applied Build {NEW}: {NEW_NAME}')
