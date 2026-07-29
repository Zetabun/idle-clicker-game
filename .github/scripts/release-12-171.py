from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.171'
name = 'Compact Readability CSS Ownership'
build_id = '12.171.0-compact-readability-css-ownership'


def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:160]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


replace('js/00-core.js', "const BUILD_VERSION = '12.170';", "const BUILD_VERSION = '12.171';")
replace('js/00-core.js', "const BUILD_NAME = 'Reward Reveal CSS Ownership';", "const BUILD_NAME = 'Compact Readability CSS Ownership';")
replace('js/00-core.js', "const BUILD_ID = '12.170.0-reward-reveal-css-ownership';", "const BUILD_ID = '12.171.0-compact-readability-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Build 12.140: compact readability floors'
position = css.find(marker)
if position < 0:
    raise SystemExit('Build 12.140 compact-readability CSS marker missing')
block = css[position:].strip() + '\n'
if block.count('Build 12.140: compact readability floors') != 1:
    raise SystemExit('Unexpected duplicate compact-readability marker')
required = (
    '@media (max-width: 1023px)',
    '#managerDateDay { font-size: 12px !important; }',
    '#managerDateMeta { font-size: 12px !important; }',
    '.menu-shell .menu-subtab-lock { font-size: 12px !important; }',
    '.menu-shell .menu-tab-access { font-size: 12px !important; }',
    '#menuContent .club-economy-guide article > span { font-size: 12px !important; }',
    '.manager-topbar-action-state { font-size: 12px; }',
)
if any(item not in block for item in required):
    raise SystemExit('Compact readability floor missing from extracted block')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/compact-readability.css').write_text(
    '/* Compact management typography-floor ownership.\n'
    '   Extracted from game.css in Build 12.171 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.170: Reward Reveal CSS Ownership', 'Strikewatch 12.171: Compact Readability CSS Ownership')
text = text.replace('12.170.0-reward-reveal-css-ownership', build_id)
text = text.replace('>12.170</b>', '>12.171</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.171.0-compact-readability-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.171.0-compact-readability-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.171.0-compact-readability-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.170 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    1,
)
text = text.replace(
    '        "owned_reward_reveal_lines": texts["reward-reveal.css"].count("\\n"),',
    '        "owned_compact_readability_lines": texts["compact-readability.css"].count("\\n"),\n        "owned_reward_reveal_lines": texts["reward-reveal.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31420', '"game_css_lines_max": 31405', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/reward-reveal.css` | Crate-to-award phase visibility and full-width weapon reveal placement |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/compact-readability.css` | Compact 12px management typography floors for dates, locks, access and action state |\n'
    '| `css/reward-reveal.css` | Crate-to-award phase visibility and full-width weapon reveal placement |',
    1,
)
text = text.replace(
    'The current order is `game.css`, `reward-reveal.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.',
    'The current order is `game.css`, `compact-readability.css`,\n`reward-reveal.css`, `armour-viewer.css`, `weapon-presentation.css`,\n`loadout-stills.css`, `12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.',
    1,
)
architecture.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.170 — Reward Reveal CSS Ownership**', 'Build: **12.171 — Compact Readability CSS Ownership**', 1)
text = text.replace('Build ID: `12.170.0-reward-reveal-css-ownership`', 'Build ID: `12.171.0-compact-readability-css-ownership`', 1)
text = text.replace('strikewatch-build-12.170.html', 'strikewatch-build-12.171.html', 1)
text = text.replace(
    'The declarations are unchanged, and the new sheet follows `game.css` before all later component layers.',
    'The declarations are unchanged; after the 12.171 extraction it follows `compact-readability.css` before the later component layers.',
    1,
)
position = text.find('Build 12.170 continues SW-020')
if position < 0:
    raise SystemExit('12.170 handoff note missing')
note = 'Build 12.171 continues SW-020 by moving the Build 12.140 compact 12px typography floors into `css/compact-readability.css`. The date lines, subnav lock/access chips, economy-guide metadata and visible match-state label keep the same selectors, declarations and 1023px breakpoint. The sheet follows `game.css` before all later component layers. See `AUDIT-12.171.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.171 owns the compact 12px management typography floors in `css/compact-readability.css`. Keep it immediately after `game.css`, before `reward-reveal.css`. Do not weaken the 12px floors for the date lines, subnav lock/access chips, economy-guide metadata or match-state label below 1024px. Verify `typographyConsistencyForTest()`, `mobileInterfaceAuditForTest()` and `economyGuidanceForTest()` alongside the CSS ownership gates. See `AUDIT-12.171.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.170 owns crate-to-award phase visibility and full-width award placement in `css/reward-reveal.css`. Keep it immediately after `game.css`, before `armour-viewer.css`.',
    'Build 12.170 owns crate-to-award phase visibility and full-width award placement in `css/reward-reveal.css`. Keep it after `compact-readability.css`, before `armour-viewer.css`.',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# Strikewatch Source 12.170', '# Strikewatch Source 12.171', 1)
text = text.replace('dist/strikewatch-build-12.170.html', 'dist/strikewatch-build-12.171.html', 1)
readme.write_text(text, encoding='utf-8', newline='\n')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.171 continues the staged CSS ownership programme by moving the compact
12px management typography floors into `css/compact-readability.css` without
changing selectors, declarations, breakpoint or cascade order. See `HANDOFF.md`
and `AUDIT-12.171.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

read_first = root / '00-READ-FIRST-GPT.md'
text = read_first.read_text(encoding='utf-8')
text = text.replace('Current release: **Strikewatch Build 12.170 — Reward Reveal CSS Ownership**.', 'Current release: **Strikewatch Build 12.171 — Compact Readability CSS Ownership**.', 1)
read_first.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.171 — Compact Readability CSS Ownership

- Moves the Build 12.140 compact 12px management typography floors from `game.css` into `css/compact-readability.css` without changing selectors, declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before reward, armour, weapon and loadout presentation.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.171.md`.

'''
if '## 12.171 — Compact Readability CSS Ownership' not in text:
    text = header + entry + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.171.md').write_text('''# Build 12.171 — Compact Readability CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.140 compact typography floor that protects management date text, navigation lock/access chips, economy-guide metadata and the visible match-control state.

## Change

The complete Build 12.140 compact-readability block is removed from the tail of `css/game.css` and placed in `css/compact-readability.css`. Selectors, declarations and the `max-width: 1023px` breakpoint are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The readability contract is unchanged: `#managerDateDay`, `#managerDateMeta`, `.menu-shell .menu-subtab-lock`, `.menu-shell .menu-tab-access`, economy-guide metadata and `.manager-topbar-action-state` remain at a 12px compact floor. Desktop density, gameplay, navigation behaviour and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. The existing `CONTRACTS.md` stylesheet-order and compact-target invariants remain sufficient and are unchanged.

## Debt guardrails

The CSS report records the compact-readability layer separately. The `game.css` budget falls from 31,420 to 31,405 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.140 marker exists exactly once in `compact-readability.css` and no longer exists in `game.css`.
- All six compact 12px floor declarations and the 1023px media query remain present.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `typographyConsistencyForTest`, `mobileInterfaceAuditForTest` and `economyGuidanceForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')
