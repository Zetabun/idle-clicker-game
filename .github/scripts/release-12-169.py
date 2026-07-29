from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.169'
name = 'Armour Viewer CSS Ownership'
build_id = '12.169.0-armour-viewer-css-ownership'


def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:140]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


replace('js/00-core.js', "const BUILD_VERSION = '12.168';", "const BUILD_VERSION = '12.169';")
replace('js/00-core.js', "const BUILD_NAME = 'Weapon Presentation CSS Ownership';", "const BUILD_NAME = 'Armour Viewer CSS Ownership';")
replace('js/00-core.js', "const BUILD_ID = '12.168.0-weapon-presentation-css-ownership';", "const BUILD_ID = '12.169.0-armour-viewer-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Build 12.142: armour viewer rotation pivot'
position = css.find(marker)
if position < 0:
    raise SystemExit('Build 12.142 armour-viewer CSS marker missing')
block = css[position:].strip() + '\n'
if block.count('Build 12.142: armour viewer rotation pivot') != 1:
    raise SystemExit('Unexpected duplicate armour-viewer marker')
if block.count('Build 12.152: every armour rig emits a pivot') != 1:
    raise SystemExit('Build 12.152 pivot-promotion note missing')
if '.career-armour-inspector .career-armour-viewer-pivot' not in block:
    raise SystemExit('Inspector-scoped armour pivot rule missing')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/armour-viewer.css').write_text(
    '/* Armour inspector rotation-pivot and compositor-promotion ownership.\n'
    '   Extracted from game.css in Build 12.169 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.168: Weapon Presentation CSS Ownership', 'Strikewatch 12.169: Armour Viewer CSS Ownership')
text = text.replace('12.168.0-weapon-presentation-css-ownership', build_id)
text = text.replace('>12.168</b>', '>12.169</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.169.0-armour-viewer-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.169.0-armour-viewer-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.169.0-armour-viewer-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.168 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    1,
)
text = text.replace(
    '        "owned_weapon_presentation_lines": texts["weapon-presentation.css"].count("\\n"),',
    '        "owned_armour_viewer_lines": texts["armour-viewer.css"].count("\\n"),\n        "owned_weapon_presentation_lines": texts["weapon-presentation.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31460', '"game_css_lines_max": 31430', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/weapon-presentation.css` | CSS-3D weapon face/cylinder lighting and grip-material presentation |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/armour-viewer.css` | Armour inspector rotation pivot, transition and scoped compositor promotion |\n'
    '| `css/weapon-presentation.css` | CSS-3D weapon face/cylinder lighting and grip-material presentation |',
    1,
)
text = text.replace(
    'The current order is `game.css`, `weapon-presentation.css`,\n`loadout-stills.css`, `12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.',
    'The current order is `game.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.',
    1,
)
architecture.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.168 — Weapon Presentation CSS Ownership**', 'Build: **12.169 — Armour Viewer CSS Ownership**', 1)
text = text.replace('Build ID: `12.168.0-weapon-presentation-css-ownership`', 'Build ID: `12.169.0-armour-viewer-css-ownership`', 1)
text = text.replace('strikewatch-build-12.168.html', 'strikewatch-build-12.169.html', 1)
text = text.replace(
    'The declarations are unchanged and the sheet remains immediately after `game.css`, preserving its position before all later component and audit layers.',
    'The declarations are unchanged; after the 12.169 extraction it follows `armour-viewer.css` and remains before loadout and later audit layers.',
    1,
)
position = text.find('Build 12.168 continues SW-020')
if position < 0:
    raise SystemExit('12.168 handoff note missing')
note = 'Build 12.169 continues SW-020 by moving the Build 12.142/12.152 armour inspector rotation-pivot rules into `css/armour-viewer.css`. The pivot still owns live rotation on one element, while transition removal and `will-change` remain scoped to the inspector so thumbnails and store products do not hold unused compositor layers. The sheet follows `game.css` and precedes weapon/loadout presentation, preserving the prior cascade. See `AUDIT-12.169.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.169 owns the armour inspector rotation pivot, drag/auto-rotate transition behaviour and inspector-only compositor promotion in `css/armour-viewer.css`. Keep it immediately after `game.css`, before `weapon-presentation.css`. Never move rotation back to inherited `--armour-viewer-yaw/pitch` properties on the rig root; that invalidates hundreds of face styles per frame. Verify `armour3dPresentationForTest()`, `armourSystemForTest()` and `loadoutStillForTest()` alongside the CSS ownership gates. See `AUDIT-12.169.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.168 owns CSS-3D weapon face/cylinder lighting and grip texture in `css/weapon-presentation.css`. Keep it immediately after `game.css` and before `loadout-stills.css`;',
    'Build 12.168 owns CSS-3D weapon face/cylinder lighting and grip texture in `css/weapon-presentation.css`. Keep it after `armour-viewer.css` and before `loadout-stills.css`;',
    1,
)
text = text.replace(
    'Build 12.167 owns loadout still stages and on-demand inspector controls in `css/loadout-stills.css`. Keep it immediately after `game.css`, before the 12.161 audit layer.',
    'Build 12.167 owns loadout still stages and on-demand inspector controls in `css/loadout-stills.css`. Keep it after `weapon-presentation.css`, before the 12.161 audit layer.',
    1,
)
text = text.replace(
    'the compact Armoury inventory reflow in `css/game.css`',
    'the compact Armoury inventory reflow in `css/armoury-inventory.css`',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# Strikewatch Source 12.168', '# Strikewatch Source 12.169', 1)
text = text.replace('dist/strikewatch-build-12.168.html', 'dist/strikewatch-build-12.169.html', 1)
readme.write_text(text, encoding='utf-8', newline='\n')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.169 continues the staged CSS ownership programme by moving the armour
inspector rotation pivot, transition state and scoped compositor promotion into
`css/armour-viewer.css` without changing declarations or cascade order. See
`HANDOFF.md` and `AUDIT-12.169.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

read_first = root / '00-READ-FIRST-GPT.md'
text = read_first.read_text(encoding='utf-8')
text = text.replace('Current release: **Strikewatch Build 12.168 — Weapon Presentation CSS Ownership**.', 'Current release: **Strikewatch Build 12.169 — Armour Viewer CSS Ownership**.', 1)
read_first.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.169 — Armour Viewer CSS Ownership

- Moves the Build 12.142/12.152 armour inspector rotation-pivot, transition and scoped compositor-promotion rules from `game.css` into `css/armour-viewer.css` without changing declarations.
- Preserves the layer immediately after `game.css`, before weapon and loadout presentation.
- Corrects current operational documentation so all extracted stylesheet-order notes agree.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.169.md`.

'''
if '## 12.169 — Armour Viewer CSS Ownership' not in text:
    text = header + entry + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.169.md').write_text('''# Build 12.169 — Armour Viewer CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.142 armour inspector rotation pivot plus the Build 12.152 inspector-only compositor-promotion refinement.

## Change

The complete armour pivot block is removed from the tail of `css/game.css` and placed in `css/armour-viewer.css`. Selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The performance contract is unchanged: `syncCareerArmourViewerTransform()` writes `transform` on one `.career-armour-viewer-pivot`. It must not write inherited yaw/pitch properties on the rig root, which previously invalidated the computed style of 384–618 face elements per rotation step. `will-change` and transition removal remain inspector-scoped so thumbnails and product views do not keep unused compositor layers.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` correct older operational order wording now that the armour layer sits between `game.css` and weapon presentation. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. The existing `CONTRACTS.md` stylesheet-order invariant remains sufficient and is unchanged.

## Debt guardrails

The CSS report records the armour-viewer layer separately. The `game.css` budget falls from 31,460 to 31,430 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.142 and Build 12.152 pivot markers exist exactly once in `armour-viewer.css` and no longer exist in `game.css`.
- The extracted selectors and declarations preserve the previous tail block.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `syncCareerArmourViewerTransform`, `armour3dPresentationForTest`, `armourSystemForTest` and `loadoutStillForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')
