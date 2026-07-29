from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.168'
name = 'Weapon Presentation CSS Ownership'
build_id = '12.168.0-weapon-presentation-css-ownership'


def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:140]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


replace('js/00-core.js', "const BUILD_VERSION = '12.167';", "const BUILD_VERSION = '12.168';")
replace('js/00-core.js', "const BUILD_NAME = 'Loadout CSS Ownership';", "const BUILD_NAME = 'Weapon Presentation CSS Ownership';")
replace('js/00-core.js', "const BUILD_ID = '12.167.0-loadout-css-ownership';", "const BUILD_ID = '12.168.0-weapon-presentation-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Build 12.147: weapon form and grip texture'
position = css.find(marker)
if position < 0:
    raise SystemExit('Build 12.147 weapon-presentation CSS marker missing')
block = css[position:].strip() + '\n'
if block.count('Build 12.147: weapon form and grip texture') != 1:
    raise SystemExit('Unexpected duplicate weapon-presentation marker')
if not block.endswith('}\n'):
    raise SystemExit('Unexpected weapon-presentation CSS tail')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/weapon-presentation.css').write_text(
    '/* CSS-3D weapon face lighting and grip-material presentation ownership.\n'
    '   Extracted from game.css in Build 12.168 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.167: Loadout CSS Ownership', 'Strikewatch 12.168: Weapon Presentation CSS Ownership')
text = text.replace('12.167.0-loadout-css-ownership', build_id)
text = text.replace('>12.167</b>', '>12.168</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.168.0-weapon-presentation-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.168.0-weapon-presentation-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.168.0-weapon-presentation-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.168.0-weapon-presentation-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.168.0-weapon-presentation-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.168.0-weapon-presentation-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.168.0-weapon-presentation-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.168.0-weapon-presentation-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.168.0-weapon-presentation-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.168.0-weapon-presentation-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.168.0-weapon-presentation-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.167 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    1,
)
text = text.replace(
    '        "owned_loadout_stills_lines": texts["loadout-stills.css"].count("\\n"),',
    '        "owned_weapon_presentation_lines": texts["weapon-presentation.css"].count("\\n"),\n        "owned_loadout_stills_lines": texts["loadout-stills.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31500', '"game_css_lines_max": 31460', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/loadout-stills.css` | Loadout still stages and on-demand 3D inspector controls |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/weapon-presentation.css` | CSS-3D weapon face/cylinder lighting and grip-material presentation |\n'
    '| `css/loadout-stills.css` | Loadout still stages and on-demand 3D inspector controls |',
    1,
)
text = text.replace(
    'The current order is `game.css`, `loadout-stills.css`,\n`12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.',
    'The current order is `game.css`, `weapon-presentation.css`,\n`loadout-stills.css`, `12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.',
    1,
)
architecture.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.167 — Loadout CSS Ownership**', 'Build: **12.168 — Weapon Presentation CSS Ownership**', 1)
text = text.replace('Build ID: `12.167.0-loadout-css-ownership`', 'Build ID: `12.168.0-weapon-presentation-css-ownership`', 1)
text = text.replace('strikewatch-build-12.167.html', 'strikewatch-build-12.168.html', 1)
position = text.find('Build 12.167 continues SW-020')
if position < 0:
    raise SystemExit('12.167 handoff note missing')
note = 'Build 12.168 continues SW-020 by moving the Build 12.147 CSS-3D weapon face lighting, cylinder shading and grip texture into `css/weapon-presentation.css`. The declarations are unchanged and the sheet remains immediately after `game.css`, preserving its position before all later component and audit layers. Keep weapon thumbnails, crate reveals, inspectors and store cards on the shared presentation layer. See `AUDIT-12.168.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.168 owns CSS-3D weapon face/cylinder lighting and grip texture in `css/weapon-presentation.css`. Keep it immediately after `game.css` and before `loadout-stills.css`; the extraction changes no declarations and must remain shared by crate reveals, inventory thumbnails, Armoury inspectors and store cards. Verify weapon geometry/presentation and loadout still gates. See `AUDIT-12.168.md`.\n\n'
agents.write_text(text.replace(anchor, anchor + note, 1), encoding='utf-8', newline='\n')

readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# Strikewatch Source 12.167', '# Strikewatch Source 12.168', 1)
text = text.replace('dist/strikewatch-build-12.167.html', 'dist/strikewatch-build-12.168.html', 1)
readme.write_text(text, encoding='utf-8', newline='\n')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.168 continues the staged CSS ownership programme by moving shared
CSS-3D weapon face lighting, cylinder shading and grip presentation into
`css/weapon-presentation.css` without changing declarations or cascade order.
See `HANDOFF.md` and `AUDIT-12.168.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

read_first = root / '00-READ-FIRST-GPT.md'
text = read_first.read_text(encoding='utf-8')
text = text.replace('Current release: **Strikewatch Build 12.167 — Loadout CSS Ownership**.', 'Current release: **Strikewatch Build 12.168 — Weapon Presentation CSS Ownership**.', 1)
read_first.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.168 — Weapon Presentation CSS Ownership

- Moves the Build 12.147 CSS-3D weapon face lighting, cylinder shading and grip texture from `game.css` into `css/weapon-presentation.css` without changing declarations.
- Preserves the layer immediately after `game.css`, before loadout and later audit/component overrides.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.168.md`.

'''
if '## 12.168 — Weapon Presentation CSS Ownership' not in text:
    text = header + entry + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.168.md').write_text('''# Build 12.168 — Weapon Presentation CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.147 CSS-3D weapon presentation layer shared by crate reveals, inventory thumbnails, the Armoury inspector and store cards.

## Change

The complete Build 12.147 weapon face-lighting, cylinder-shading and grip-texture block is removed from the tail of `css/game.css` and placed in `css/weapon-presentation.css`. Selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before `loadout-stills.css`, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The rules affect CSS-3D menu models only. WebGL match/world/viewmodel lighting, weapon geometry authorities, combat statistics and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md`, `AGENTS.md`, `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. The existing `CONTRACTS.md` stylesheet-order invariant remains sufficient and is unchanged.

## Debt guardrails

The CSS report records the weapon-presentation layer separately. The `game.css` budget falls from 31,500 to 31,460 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.147 marker exists exactly once in `weapon-presentation.css` and no longer exists in `game.css`.
- The extracted declarations match the previous tail block byte-for-byte.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- Weapon geometry, AR-4 model, viewmodel presentation and loadout-still regression hooks remain green where browser execution is available.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')
