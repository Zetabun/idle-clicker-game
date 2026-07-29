from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.177'
name = 'Management Grid CSS Ownership'
build_id = '12.177.0-management-grid-css-ownership'


def must_replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    actual = text.count(old)
    if actual < count:
        raise SystemExit(f'{path}: expected at least {count} occurrence(s), found {actual}: {old[:180]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


current_release = json.loads((root / 'RELEASE.json').read_text(encoding='utf-8'))
expected_release = {
    'version': '12.176',
    'name': 'League Table CSS Ownership',
    'build_id': '12.176.0-league-table-css-ownership',
}
if current_release != expected_release:
    raise SystemExit(f'Authoritative release moved; expected {expected_release}, got {current_release}')

must_replace('js/00-core.js', "const BUILD_VERSION = '12.176';", "const BUILD_VERSION = '12.177';")
must_replace('js/00-core.js', "const BUILD_NAME = 'League Table CSS Ownership';", "const BUILD_NAME = 'Management Grid CSS Ownership';")
must_replace('js/00-core.js', "const BUILD_ID = '12.176.0-league-table-css-ownership';", "const BUILD_ID = '12.177.0-management-grid-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
section_marker = '''/* ==========================================================================\n   Build 12.135 - Container collapse, league table and agenda layer\n   ========================================================================== */'''
section_position = css.find(section_marker)
if section_position < 0:
    raise SystemExit('Build 12.135 container-collapse section marker missing')
rule_marker = '/* --- Collapsed panels'
rule_position = css.find(rule_marker, section_position)
if rule_position < 0:
    raise SystemExit('Collapsed-panel row-sizing marker missing')
block = css[rule_position:].strip() + '\n'
required_css = (
    '#menuContent {',
    'grid-auto-rows: max-content;',
    'align-content: start;',
)
if any(item not in block for item in required_css):
    raise SystemExit('Management grid declaration missing from extracted block')
if block.count('#menuContent {') != 1:
    raise SystemExit('Unexpected extra selector in management grid tail block')
css_path.write_text(css[:section_position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/management-grid.css').write_text(
    '/* Management route grid-track ownership.\n'
    '   Extracted from the Build 12.135/12.136 tail in Build 12.177 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
if text.count('>12.176</b>') != 2:
    raise SystemExit('Expected exactly two visible 12.176 build labels')
text = text.replace('Strikewatch 12.176: League Table CSS Ownership', 'Strikewatch 12.177: Management Grid CSS Ownership', 1)
text = text.replace('12.176.0-league-table-css-ownership', build_id)
text = text.replace('>12.176</b>', '>12.177</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/league-table.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/calendar-agenda.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/training-readability.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.177.0-management-grid-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/management-grid.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/league-table.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/calendar-agenda.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/training-readability.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.177.0-management-grid-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.177.0-management-grid-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.176 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
old_css_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "league-table.css", ROOT / "css" / "calendar-agenda.css", ROOT / "css" / "training-readability.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")'
new_css_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "management-grid.css", ROOT / "css" / "league-table.css", ROOT / "css" / "calendar-agenda.css", ROOT / "css" / "training-readability.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")'
if text.count(old_css_paths) != 1:
    raise SystemExit('Expected 12.176 CSS_PATHS sequence missing')
text = text.replace(old_css_paths, new_css_paths, 1)
text = text.replace(
    '        "owned_league_table_lines": texts["league-table.css"].count("\\n"),',
    '        "owned_management_grid_lines": texts["management-grid.css"].count("\\n"),\n        "owned_league_table_lines": texts["league-table.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31210', '"game_css_lines_max": 31185', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
old_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/league-table.css` | League-table typography, compact row height and club-name wrapping |'
new_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/management-grid.css` | Management-route grid track sizing and top-aligned content flow |\n| `css/league-table.css` | League-table typography, compact row height and club-name wrapping |'
if old_owner not in text:
    raise SystemExit('Architecture CSS owner insertion point missing')
text = text.replace(old_owner, new_owner, 1)
old_order = 'The current order is `game.css`, `league-table.css`, `calendar-agenda.css`,\n`training-readability.css`, `training-programme.css`, `management-feedback.css`,\n`compact-readability.css`, `reward-reveal.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.'
new_order = 'The current order is `game.css`, `management-grid.css`, `league-table.css`,\n`calendar-agenda.css`, `training-readability.css`, `training-programme.css`,\n`management-feedback.css`, `compact-readability.css`, `reward-reveal.css`,\n`armour-viewer.css`, `weapon-presentation.css`, `loadout-stills.css`,\n`12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.'
if old_order not in text:
    raise SystemExit('Architecture stylesheet order paragraph missing')
architecture.write_text(text.replace(old_order, new_order, 1), encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.176 — League Table CSS Ownership**', 'Build: **12.177 — Management Grid CSS Ownership**', 1)
text = text.replace('Build ID: `12.176.0-league-table-css-ownership`', 'Build ID: `12.177.0-management-grid-css-ownership`', 1)
text = text.replace('strikewatch-build-12.176.html', 'strikewatch-build-12.177.html', 1)
old_note = 'Build 12.176 continues SW-020 by moving the Build 12.135 league-table typography, compact row height and club-name wrapping into `css/league-table.css`. Desktop and compact type floors, the 52px compact row and wrapped club sub-line are unchanged. The sheet follows `game.css` before all later component layers. See `AUDIT-12.176.md`.'
new_old_note = 'Build 12.176 continues SW-020 by moving the Build 12.135 league-table typography, compact row height and club-name wrapping into `css/league-table.css`. Desktop and compact type floors, the 52px compact row and wrapped club sub-line are unchanged. After the 12.177 extraction, the sheet follows `management-grid.css` before all later component layers. See `AUDIT-12.176.md`.'
if old_note not in text:
    raise SystemExit('12.176 handoff note missing')
new_note = 'Build 12.177 continues SW-020 by moving the Build 12.135/12.136 management grid-track sizing into `css/management-grid.css`. `grid-auto-rows: max-content` and `align-content: start` remain unchanged, so route panels keep content-height rows without clipping or overlap. The sheet follows `game.css` before all later component layers. See `AUDIT-12.177.md`.\n\n'
text = text.replace(old_note, new_note + new_old_note, 1)
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
if anchor not in text:
    raise SystemExit('AGENTS current release anchor missing')
note = 'Build 12.177 owns management-route grid track sizing in `css/management-grid.css`. Keep it immediately after `game.css`, before `league-table.css`. `#menuContent` must retain `grid-auto-rows: max-content` and `align-content: start`; item-level `min-height: max-content` reintroduces overlap and must not return. Verify `mobileInterfaceAuditForTest()`, `renderRouteForTest()` and `typographyConsistencyForTest()` alongside the CSS ownership gates. See `AUDIT-12.177.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.176 owns league-table typography, compact row height and club-name wrapping in `css/league-table.css`. Keep it immediately after `game.css`, before `calendar-agenda.css`.',
    'Build 12.176 owns league-table typography, compact row height and club-name wrapping in `css/league-table.css`. Keep it after `management-grid.css`, before `calendar-agenda.css`.',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

must_replace('README.md', '# Strikewatch Source 12.176', '# Strikewatch Source 12.177')
must_replace('README.md', 'dist/strikewatch-build-12.176.html', 'dist/strikewatch-build-12.177.html')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.177 continues the staged CSS ownership programme by moving management-
route grid track sizing into `css/management-grid.css` without changing the
selector or declarations. See `HANDOFF.md` and `AUDIT-12.177.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

must_replace(
    '00-READ-FIRST-GPT.md',
    'Current release: **Strikewatch Build 12.176 — League Table CSS Ownership**.',
    'Current release: **Strikewatch Build 12.177 — Management Grid CSS Ownership**.',
)

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.177 — Management Grid CSS Ownership

- Moves the remaining Build 12.135/12.136 `#menuContent` grid-track sizing from `game.css` into `css/management-grid.css` without changing the selector or declarations.
- Preserves the layer immediately after `game.css`, before league-table and all later presentation layers.
- Keeps content-height management rows top-aligned, preventing the clipping/overlap regression the original row-sizing hotfix resolved.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.177.md`.

'''
if '## 12.177 — Management Grid CSS Ownership' in text:
    raise SystemExit('12.177 changelog entry already exists')
if not text.startswith(header):
    raise SystemExit('Unexpected changelog header')
changelog.write_text(header + entry + text[len(header):], encoding='utf-8', newline='\n')

(root / 'AUDIT-12.177.md').write_text('''# Build 12.177 — Management Grid CSS Ownership

## Audit item

Continues SW-020 component by component. After the league-table, calendar-agenda and training blocks were extracted, the final bounded tail block is the Build 12.135/12.136 management grid-track fix.

## Change

The remaining `#menuContent` row-sizing block is removed from the tail of `css/game.css` and placed in `css/management-grid.css`. The selector and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before league table, calendar agenda, training readability, training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The layout contract is unchanged. `grid-auto-rows: max-content` sizes each management route row to its content, while `align-content: start` prevents the definite-height grid from distributing spare space through route tracks. This remains a track-level fix; the superseded item-level `#menuContent > * { min-height: max-content; }` rule must not return because it allows panels to overflow undersized rows and overlap following content.

No route markup, navigation, gameplay, economy, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order and row-sizing hazard. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing compact-layout and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the management-grid layer separately. The `game.css` budget falls from 31,210 to 31,185 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The collapsed-panel marker and `#menuContent` row-sizing rule exist in `management-grid.css` and no longer exist in `game.css`.
- `grid-auto-rows: max-content` and `align-content: start` remain present exactly once; the superseded direct-child `min-height: max-content` rule remains absent.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `mobileInterfaceAuditForTest`, `renderRouteForTest` and `typographyConsistencyForTest`, including the collapsed/overlapping diagnostics used by the original fix.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No live-browser execution is claimed; the release evidence is exact declaration/cascade preservation, deterministic builds, parse gates and retained regression hooks.
''', encoding='utf-8', newline='\n')
