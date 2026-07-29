from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.167'
name = 'Loadout CSS Ownership'
build_id = '12.167.0-loadout-css-ownership'


def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:120]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


replace('js/00-core.js', "const BUILD_VERSION = '12.166';", "const BUILD_VERSION = '12.167';")
replace('js/00-core.js', "const BUILD_NAME = 'Armoury CSS Ownership';", "const BUILD_NAME = 'Loadout CSS Ownership';")
replace('js/00-core.js', "const BUILD_ID = '12.166.0-armoury-css-ownership';", "const BUILD_ID = '12.167.0-loadout-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Build 12.155: loadout still previews'
position = css.find(marker)
if position < 0:
    raise SystemExit('Build 12.155 loadout-still CSS marker missing')
block = css[position:].strip() + '\n'
if block.count('Build 12.155: loadout still previews') != 1:
    raise SystemExit('Unexpected duplicate loadout-still marker')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/loadout-stills.css').write_text(
    '/* Loadout still and on-demand inspector presentation ownership.\n'
    '   Extracted from game.css in Build 12.167 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.166: Armoury CSS Ownership', 'Strikewatch 12.167: Loadout CSS Ownership')
text = text.replace('12.166.0-armoury-css-ownership', build_id)
text = text.replace('>12.166</b>', '>12.167</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.167.0-loadout-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.167.0-loadout-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.167.0-loadout-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.167.0-loadout-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.167.0-loadout-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.167.0-loadout-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.167.0-loadout-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.167.0-loadout-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.167.0-loadout-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.166 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    1,
)
text = text.replace(
    '        "owned_armoury_inventory_lines": texts["armoury-inventory.css"].count("\\n"),',
    '        "stylesheet_order": list(texts),\n        "owned_loadout_stills_lines": texts["loadout-stills.css"].count("\\n"),\n        "owned_armoury_inventory_lines": texts["armoury-inventory.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31560', '"game_css_lines_max": 31500', 1)
old_inline = '''    html = re.sub(
        r'<link rel="stylesheet" href="css/game\\.css\\?v=[^"]+"\\s*/>\\s*<link rel="stylesheet" href="css/12\\.161-audit-fixes\\.css\\?v=[^"]+"\\s*/>\\s*<link rel="stylesheet" href="css/armoury-inventory\\.css\\?v=[^"]+"\\s*/>\\s*<link rel="stylesheet" href="css/compact-navigation\\.css\\?v=[^"]+"\\s*/>',
        lambda _match: '<style>\\n' + release_css + '\\n</style>',
        html,
        count=1,
    )
'''
new_inline = '''    expected_css_hrefs = [f"css/{path.name}?v={build_id}" for path in CSS_PATHS]
    actual_css_hrefs = re.findall(r'<link rel="stylesheet" href="(css/[^"]+)"\\s*/>', html)
    if actual_css_hrefs != expected_css_hrefs:
        raise RuntimeError(
            f"index.html stylesheet order mismatch: expected {expected_css_hrefs}, got {actual_css_hrefs}"
        )
    stylesheet_block = "\\n".join(
        f'<link rel="stylesheet" href="{href}" />' for href in expected_css_hrefs
    )
    if stylesheet_block not in html:
        raise RuntimeError("Ordered development stylesheet block is not contiguous")
    html = html.replace(stylesheet_block, '<style>\\n' + release_css + '\\n</style>', 1)
'''
if old_inline not in text:
    raise SystemExit('Expected 12.166 hard-coded stylesheet inliner missing')
text = text.replace(old_inline, new_inline, 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Complete responsive and visual presentation |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/loadout-stills.css` | Loadout still stages and on-demand 3D inspector controls |\n'
    '| `css/12.161-audit-fixes.css` | Cross-route compact readability and accessibility fixes from 12.161 |\n'
    '| `css/armoury-inventory.css` | Compact Armoury inventory card layout |\n'
    '| `css/compact-navigation.css` | Compact club navigation and fixed management-alert layout |',
    1,
)
text = text.replace(
    'Management UI is assembled by `50-ui-menus.js` and route-specific renderers,\nthen inserted into the shell owned by `index.html`. `css/game.css` is one\ncascade; later build sections intentionally override older rules. Prefer\ncomponent-scoped selectors and verify the final computed style, especially\nwhen pseudo-elements are reused.',
    'Management UI is assembled by `50-ui-menus.js` and route-specific renderers,\nthen inserted into the shell owned by `index.html`. `build.py`\'s `CSS_PATHS` is\nthe cascade-order authority, and `index.html` must load the same files in the\nsame order. The current order is `game.css`, `loadout-stills.css`,\n`12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`. Prefer component-scoped selectors and verify the\nfinal computed style, especially when pseudo-elements are reused.',
    1,
)
architecture.write_text(text, encoding='utf-8', newline='\n')

contracts = root / 'CONTRACTS.md'
text = contracts.read_text(encoding='utf-8')
anchor = '- Never fix generated files independently of their source.\n'
contract = '- `build.py`\'s ordered `CSS_PATHS` and the development links in `index.html` must contain the same stylesheets in the same order. The standalone must inline that complete cascade and retain no external `css/` link. Component-owned stylesheets must not be folded back into `game.css` without an audited cascade migration.\n'
if contract not in text:
    text = text.replace(anchor, anchor + contract, 1)
contracts.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.166 — Armoury CSS Ownership**', 'Build: **12.167 — Loadout CSS Ownership**', 1)
text = text.replace('Build ID: `12.166.0-armoury-css-ownership`', 'Build ID: `12.167.0-loadout-css-ownership`', 1)
text = text.replace('strikewatch-build-12.166.html', 'strikewatch-build-12.167.html', 1)
position = text.find('Build 12.166 continues the staged CSS ownership programme')
if position < 0:
    raise SystemExit('12.166 handoff note missing')
note = 'Build 12.167 continues SW-020 by moving the Build 12.155 loadout-still and on-demand inspector presentation into `css/loadout-stills.css`, preserving its position before the 12.161 layer. `build.py` now derives and validates the development stylesheet block from `CSS_PATHS` instead of maintaining a brittle hard-coded regular expression. Architecture and stable contracts now document the stylesheet ownership order. See `AUDIT-12.167.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.167 owns loadout still stages and on-demand inspector controls in `css/loadout-stills.css`. Keep it immediately after `game.css`, before the 12.161 audit layer. `CSS_PATHS` and `index.html` must remain identical in file order; the build checks this and standalone CSS-link removal. See `AUDIT-12.167.md`.\n\n'
agents.write_text(text.replace(anchor, anchor + note, 1), encoding='utf-8', newline='\n')

readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# Strikewatch Source 12.166', '# Strikewatch Source 12.167', 1)
text = text.replace('dist/strikewatch-build-12.161.html', 'dist/strikewatch-build-12.167.html', 1)
readme.write_text(text, encoding='utf-8', newline='\n')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.167 continues the staged CSS ownership programme by moving loadout
still and on-demand inspector presentation into `css/loadout-stills.css` while
preserving cascade order. The build now validates that `index.html` and
`CSS_PATHS` declare the same stylesheet sequence. See `HANDOFF.md` and
`AUDIT-12.167.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

read_first = root / '00-READ-FIRST-GPT.md'
text = read_first.read_text(encoding='utf-8')
text = text.replace('Current release: **Strikewatch Build 12.166 — Recovery & Readability**.', 'Current release: **Strikewatch Build 12.167 — Loadout CSS Ownership**.', 1)
read_first.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
if not text.startswith(header):
    raise SystemExit('Unexpected changelog header')
entries = '''
## 12.167 — Loadout CSS Ownership

- Moves the Build 12.155 loadout-still and on-demand inspector presentation from `game.css` into `css/loadout-stills.css` without changing selectors or declarations.
- Replaces the hard-coded standalone stylesheet regular expression with `CSS_PATHS`-derived order validation and inlining.
- Documents stylesheet ownership in `ARCHITECTURE.md` and the stable release contract.
- Evidence: `AUDIT-12.167.md`.

## 12.166 — Armoury CSS Ownership

- Moves the compact Armoury inventory layer into `css/armoury-inventory.css` and restores development/standalone CSS parity.
- Evidence: `AUDIT-12.166.md`.

## 12.165 — CSS Ownership Baseline

- Establishes CSS debt reporting and moves compact navigation and mobile management-alert rules into `css/compact-navigation.css`.
- Evidence: `AUDIT-12.165.md`.

## 12.164 — Lean Standalone

- Adds conservative release-only comment and redundant-blank stripping with deterministic size reporting.
- Evidence: `AUDIT-12.164.md`.

## 12.163 — Compact Navigation Alignment

- Repairs compact club-navigation destination rows and the fixed management-alert mobile layout.
- Evidence: `AUDIT-12.163.md`.

## 12.162 — Dynamic Actor Culling

- Adds conservative whole-operator frustum culling with a disabled reference path and deterministic guard.
- Evidence: `AUDIT-12.162.md`.

## 12.161 — Recovery & Readability

- Fixes returning-career startup migration, restores browser zoom and hardens compact readability, wrapping and touch targets.
- Evidence: `AUDIT-12.161.md`.

'''
if '## 12.167 — Loadout CSS Ownership' not in text:
    text = header + entries + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.167.md').write_text('''# Build 12.167 — Loadout CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.155 loadout-still and on-demand inspector presentation, which already has a single JavaScript owner (`57-loadout-stills.js`) and established one-live-rig contracts.

## Change

The complete Build 12.155 CSS block is removed from the tail of `css/game.css` and placed in `css/loadout-stills.css`. Selectors and declarations are unchanged. The new sheet is loaded immediately after `game.css`, preserving the block's previous position before the 12.161 audit layer, compact Armoury inventory layer and compact-navigation layer.

The standalone builder no longer carries a release-specific regular expression listing every stylesheet. It derives the expected `index.html` hrefs from ordered `CSS_PATHS`, requires an exact contiguous match, then replaces that block with the combined release CSS. This makes future ownership extraction fail clearly if development and standalone order diverge.

## Documentation repair

`ARCHITECTURE.md` now records each owned stylesheet and the authoritative cascade order, closing the omission left by Build 12.166. `CONTRACTS.md` records development/standalone order parity as a cross-release invariant. The concise current-release documents and missing 12.161–12.166 changelog routes are corrected in the same release.

## Debt guardrails

The CSS report records `stylesheet_order` and the loadout-still layer separately. The `game.css` budget falls from 31,560 to 31,500 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.155 marker exists exactly once in `loadout-stills.css` and no longer exists in `game.css`.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')
