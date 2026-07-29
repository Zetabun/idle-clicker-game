from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.170'
name = 'Reward Reveal CSS Ownership'
build_id = '12.170.0-reward-reveal-css-ownership'


def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:160]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


replace('js/00-core.js', "const BUILD_VERSION = '12.169';", "const BUILD_VERSION = '12.170';")
replace('js/00-core.js', "const BUILD_NAME = 'Armour Viewer CSS Ownership';", "const BUILD_NAME = 'Reward Reveal CSS Ownership';")
replace('js/00-core.js', "const BUILD_ID = '12.169.0-armour-viewer-css-ownership';", "const BUILD_ID = '12.170.0-reward-reveal-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Build 12.141: reward reveal shows the weapon alone'
position = css.find(marker)
if position < 0:
    raise SystemExit('Build 12.141 reward-reveal CSS marker missing')
block = css[position:].strip() + '\n'
if block.count('Build 12.141: reward reveal shows the weapon alone') != 1:
    raise SystemExit('Unexpected duplicate reward-reveal marker')
required = (
    '.career-crate-overlay.cycling .career-crate-core',
    '.career-crate-overlay.revealed .career-crate-core',
    '.career-crate-overlay.cycling .career-crate-model',
    '.career-crate-overlay.revealed .career-crate-model',
    'display: none',
    'grid-column: 1 / -1',
    'justify-self: center',
)
if any(item not in block for item in required):
    raise SystemExit('Reward-reveal phase rule missing from extracted block')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/reward-reveal.css').write_text(
    '/* Crate-to-award phase presentation ownership.\n'
    '   Extracted from game.css in Build 12.170 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.169: Armour Viewer CSS Ownership', 'Strikewatch 12.170: Reward Reveal CSS Ownership')
text = text.replace('12.169.0-armour-viewer-css-ownership', build_id)
text = text.replace('>12.169</b>', '>12.170</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.170.0-reward-reveal-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.170.0-reward-reveal-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.170.0-reward-reveal-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.169 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    1,
)
text = text.replace(
    '        "owned_armour_viewer_lines": texts["armour-viewer.css"].count("\\n"),',
    '        "owned_reward_reveal_lines": texts["reward-reveal.css"].count("\\n"),\n        "owned_armour_viewer_lines": texts["armour-viewer.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31430', '"game_css_lines_max": 31420', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/armour-viewer.css` | Armour inspector rotation pivot, transition and scoped compositor promotion |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/reward-reveal.css` | Crate-to-award phase visibility and full-width weapon reveal placement |\n'
    '| `css/armour-viewer.css` | Armour inspector rotation pivot, transition and scoped compositor promotion |',
    1,
)
text = text.replace(
    'The current order is `game.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.',
    'The current order is `game.css`, `reward-reveal.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.',
    1,
)
architecture.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.169 — Armour Viewer CSS Ownership**', 'Build: **12.170 — Reward Reveal CSS Ownership**', 1)
text = text.replace('Build ID: `12.169.0-armour-viewer-css-ownership`', 'Build ID: `12.170.0-reward-reveal-css-ownership`', 1)
text = text.replace('strikewatch-build-12.169.html', 'strikewatch-build-12.170.html', 1)
text = text.replace(
    'The sheet follows `game.css` and precedes weapon/loadout presentation, preserving the prior cascade.',
    'The sheet follows `reward-reveal.css` and precedes weapon/loadout presentation, preserving the prior cascade.',
    1,
)
position = text.find('Build 12.169 continues SW-020')
if position < 0:
    raise SystemExit('12.169 handoff note missing')
note = 'Build 12.170 continues SW-020 by moving the Build 12.141 reward-phase visibility rules into `css/reward-reveal.css`. During `cycling` and `revealed`, the crate core remains hidden and the awarded weapon model owns the full reveal grid. The declarations are unchanged, and the new sheet follows `game.css` before all later component layers. See `AUDIT-12.170.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.170 owns crate-to-award phase visibility and full-width award placement in `css/reward-reveal.css`. Keep it immediately after `game.css`, before `armour-viewer.css`. In `cycling` and `revealed`, the crate core must be hidden and the weapon model must span the reveal grid. Verify `crateSpinForTest()`, `crateAttachmentForTest()` and `firstMatchPayoffForTest()` alongside the CSS ownership gates. See `AUDIT-12.170.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.169 owns the armour inspector rotation pivot, drag/auto-rotate transition behaviour and inspector-only compositor promotion in `css/armour-viewer.css`. Keep it immediately after `game.css`, before `weapon-presentation.css`.',
    'Build 12.169 owns the armour inspector rotation pivot, drag/auto-rotate transition behaviour and inspector-only compositor promotion in `css/armour-viewer.css`. Keep it after `reward-reveal.css`, before `weapon-presentation.css`.',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# Strikewatch Source 12.169', '# Strikewatch Source 12.170', 1)
text = text.replace('dist/strikewatch-build-12.169.html', 'dist/strikewatch-build-12.170.html', 1)
readme.write_text(text, encoding='utf-8', newline='\n')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.170 continues the staged CSS ownership programme by moving the
crate-to-award phase visibility and full-width weapon reveal placement into
`css/reward-reveal.css` without changing declarations or cascade order. See
`HANDOFF.md` and `AUDIT-12.170.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

read_first = root / '00-READ-FIRST-GPT.md'
text = read_first.read_text(encoding='utf-8')
text = text.replace('Current release: **Strikewatch Build 12.169 — Armour Viewer CSS Ownership**.', 'Current release: **Strikewatch Build 12.170 — Reward Reveal CSS Ownership**.', 1)
read_first.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.170 — Reward Reveal CSS Ownership

- Moves the Build 12.141 crate-to-award phase visibility and full-width weapon placement rules from `game.css` into `css/reward-reveal.css` without changing declarations.
- Preserves the layer immediately after `game.css`, before armour, weapon and loadout presentation.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.170.md`.

'''
if '## 12.170 — Reward Reveal CSS Ownership' not in text:
    text = header + entry + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.170.md').write_text('''# Build 12.170 — Reward Reveal CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.141 reward-phase presentation that retires the crate once the award scan begins and gives the weapon model the complete reveal area.

## Change

The complete Build 12.141 reward-reveal block is removed from the tail of `css/game.css` and placed in `css/reward-reveal.css`. Selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The phase contract is unchanged: the crate core is hidden in both `cycling` and `revealed`; the awarded weapon model spans the complete grid and remains centred. Crate animation timing, reward selection, inventory settlement, Gold Coins, career saves and WebGL reward rendering are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. The existing `CONTRACTS.md` stylesheet-order invariant remains sufficient and is unchanged.

## Debt guardrails

The CSS report records the reward-reveal layer separately. The `game.css` budget falls from 31,430 to 31,420 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.141 reward marker exists exactly once in `reward-reveal.css` and no longer exists in `game.css`.
- The extracted phase selectors and declarations remain present and unchanged.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `renderCareerCrate3D`, `crateSpinForTest`, `crateAttachmentForTest` and `firstMatchPayoffForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')
