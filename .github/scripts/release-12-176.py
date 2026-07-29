from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.176'
name = 'League Table CSS Ownership'
build_id = '12.176.0-league-table-css-ownership'


def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:180]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


replace('js/00-core.js', "const BUILD_VERSION = '12.175';", "const BUILD_VERSION = '12.176';")
replace('js/00-core.js', "const BUILD_NAME = 'Calendar Agenda CSS Ownership';", "const BUILD_NAME = 'League Table CSS Ownership';")
replace('js/00-core.js', "const BUILD_ID = '12.175.0-calendar-agenda-css-ownership';", "const BUILD_ID = '12.176.0-league-table-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- League table: readable at both targets'
position = css.find(marker)
if position < 0:
    raise SystemExit('League-table readability CSS marker missing')
block = css[position:].strip() + '\n'
if block.count('League table: readable at both targets') != 1:
    raise SystemExit('Unexpected duplicate league-table marker')
required = (
    '#menuContent .league-table-head { font-size: 10px !important; letter-spacing: .1em !important; }',
    '#menuContent .league-table-row { font-size: 11px !important; }',
    '#menuContent .league-table-row .position { font-size: 14px !important; }',
    '#menuContent .league-table-row .club strong { font-size: 12px !important; }',
    '#menuContent .league-table-row .club small { font-size: 10.5px !important; }',
    '@media (max-width: 1023px)',
    '#menuContent .league-table-head { font-size: 11px !important; }',
    '#menuContent .league-table-row { font-size: 12px !important; min-height: 52px; }',
    '#menuContent .league-table-row .position { font-size: 15px !important; }',
    '#menuContent .league-table-row .club strong { font-size: 13px !important; }',
    '#menuContent .league-table-row .club small { font-size: 11px !important; white-space: normal; }',
)
if any(item not in block for item in required):
    raise SystemExit('League-table presentation rule missing from extracted block')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/league-table.css').write_text(
    '/* League-table typography, compact row height and club-name wrapping ownership.\n'
    '   Extracted from the Build 12.135 release layer in Build 12.176 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.175: Calendar Agenda CSS Ownership', 'Strikewatch 12.176: League Table CSS Ownership')
text = text.replace('12.175.0-calendar-agenda-css-ownership', build_id)
text = text.replace('>12.175</b>', '>12.176</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/calendar-agenda.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/training-readability.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.176.0-league-table-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/league-table.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/calendar-agenda.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/training-readability.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.176.0-league-table-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.176.0-league-table-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.175 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "calendar-agenda.css", ROOT / "css" / "training-readability.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "league-table.css", ROOT / "css" / "calendar-agenda.css", ROOT / "css" / "training-readability.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    1,
)
text = text.replace(
    '        "owned_calendar_agenda_lines": texts["calendar-agenda.css"].count("\\n"),',
    '        "owned_league_table_lines": texts["league-table.css"].count("\\n"),\n        "owned_calendar_agenda_lines": texts["calendar-agenda.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31230', '"game_css_lines_max": 31210', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/calendar-agenda.css` | Calendar agenda typography, compact two-column reflow and action-target sizing |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/league-table.css` | League-table typography, compact row height and club-name wrapping |\n'
    '| `css/calendar-agenda.css` | Calendar agenda typography, compact two-column reflow and action-target sizing |',
    1,
)
text = text.replace(
    'The current order is `game.css`, `calendar-agenda.css`,\n`training-readability.css`, `training-programme.css`, `management-feedback.css`,\n`compact-readability.css`, `reward-reveal.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.',
    'The current order is `game.css`, `league-table.css`, `calendar-agenda.css`,\n`training-readability.css`, `training-programme.css`, `management-feedback.css`,\n`compact-readability.css`, `reward-reveal.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.',
    1,
)
architecture.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.175 — Calendar Agenda CSS Ownership**', 'Build: **12.176 — League Table CSS Ownership**', 1)
text = text.replace('Build ID: `12.175.0-calendar-agenda-css-ownership`', 'Build ID: `12.176.0-league-table-css-ownership`', 1)
text = text.replace('strikewatch-build-12.175.html', 'strikewatch-build-12.176.html', 1)
old_note = 'Build 12.175 continues SW-020 by moving the Build 12.135 club calendar agenda typography, compact two-column reflow and action-target sizing into `css/calendar-agenda.css`. Date, title and detail floors, wrapped compact copy and the 44px action target are unchanged. The sheet follows `game.css` before all later component layers. See `AUDIT-12.175.md`.'
new_old_note = 'Build 12.175 continues SW-020 by moving the Build 12.135 club calendar agenda typography, compact two-column reflow and action-target sizing into `css/calendar-agenda.css`. Date, title and detail floors, wrapped compact copy and the 44px action target are unchanged. The sheet follows `league-table.css` before all later component layers. See `AUDIT-12.175.md`.'
if old_note not in text:
    raise SystemExit('12.175 handoff note missing')
text = text.replace(old_note, new_old_note, 1)
position = text.find(new_old_note)
note = 'Build 12.176 continues SW-020 by moving the Build 12.135 league-table typography, compact row height and club-name wrapping into `css/league-table.css`. Desktop and compact type floors, the 52px compact row and wrapped club sub-line are unchanged. The sheet follows `game.css` before all later component layers. See `AUDIT-12.176.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.176 owns league-table typography, compact row height and club-name wrapping in `css/league-table.css`. Keep it immediately after `game.css`, before `calendar-agenda.css`. Preserve the 52px compact row, the 1023px breakpoint and the desktop/compact header, position, club-name and sub-line floors. Verify `leagueMatchFlowForTest()`, `orphanedLeagueFixtureForTest()`, `renderRouteForTest()`, `mobileInterfaceAuditForTest()` and `typographyConsistencyForTest()` alongside the CSS ownership gates. See `AUDIT-12.176.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.175 owns club calendar agenda typography, compact two-column reflow and action-target sizing in `css/calendar-agenda.css`. Keep it immediately after `game.css`, before `training-readability.css`.',
    'Build 12.175 owns club calendar agenda typography, compact two-column reflow and action-target sizing in `css/calendar-agenda.css`. Keep it after `league-table.css`, before `training-readability.css`.',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# Strikewatch Source 12.175', '# Strikewatch Source 12.176', 1)
text = text.replace('dist/strikewatch-build-12.175.html', 'dist/strikewatch-build-12.176.html', 1)
readme.write_text(text, encoding='utf-8', newline='\n')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.176 continues the staged CSS ownership programme by moving the league-
table typography, compact row height and club-name wrapping into
`css/league-table.css` without changing selectors, declarations, breakpoint or
cascade order. See `HANDOFF.md` and `AUDIT-12.176.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

read_first = root / '00-READ-FIRST-GPT.md'
text = read_first.read_text(encoding='utf-8')
text = text.replace('Current release: **Strikewatch Build 12.175 — Calendar Agenda CSS Ownership**.', 'Current release: **Strikewatch Build 12.176 — League Table CSS Ownership**.', 1)
read_first.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.176 — League Table CSS Ownership

- Moves the Build 12.135 league-table typography, compact row height and club-name wrapping rules from `game.css` into `css/league-table.css` without changing selectors, declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before the calendar agenda and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.176.md`.

'''
if '## 12.176 — League Table CSS Ownership' not in text:
    text = header + entry + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.176.md').write_text('''# Build 12.176 — League Table CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.135 league-table readability layer.

## Change

The complete league-table block is removed from the tail of `css/game.css` and placed in `css/league-table.css`. Selectors, declarations and the `max-width: 1023px` breakpoint are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before calendar agenda, training readability, training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The presentation contract is unchanged. Desktop and compact header, row, position, club-name and sub-line type floors remain intact. Compact rows remain at least 52px high and club sub-lines may wrap. League scheduling, fixture recovery, result settlement, standings calculations, gameplay and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. Existing compact, league and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the league-table layer separately. The `game.css` budget falls from 31,230 to 31,210 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The league-table marker exists exactly once in `league-table.css` and no longer exists in `game.css`.
- Desktop and compact league declarations remain present, including the 52px compact row and wrapping club sub-line.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `leagueMatchFlowForTest`, `orphanedLeagueFixtureForTest`, `renderRouteForTest`, `mobileInterfaceAuditForTest` and `typographyConsistencyForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')
