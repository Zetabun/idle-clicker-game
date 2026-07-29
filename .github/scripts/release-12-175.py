from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.175'
name = 'Calendar Agenda CSS Ownership'
build_id = '12.175.0-calendar-agenda-css-ownership'


def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:180]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


replace('js/00-core.js', "const BUILD_VERSION = '12.174';", "const BUILD_VERSION = '12.175';")
replace('js/00-core.js', "const BUILD_NAME = 'Training Readability CSS Ownership';", "const BUILD_NAME = 'Calendar Agenda CSS Ownership';")
replace('js/00-core.js', "const BUILD_ID = '12.174.0-training-readability-css-ownership';", "const BUILD_ID = '12.175.0-calendar-agenda-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Event agenda: readable at both targets'
position = css.find(marker)
if position < 0:
    raise SystemExit('Calendar agenda readability CSS marker missing')
block = css[position:].strip() + '\n'
if block.count('Event agenda: readable at both targets') != 1:
    raise SystemExit('Unexpected duplicate calendar agenda marker')
required = (
    '#menuContent .club-calendar-agenda-item > time b { font-size: 10px !important; }',
    '#menuContent .club-calendar-agenda-item > time strong { font-size: 22px !important; }',
    '#menuContent .club-calendar-agenda-item > div strong { font-size: 13px !important; }',
    '#menuContent .club-calendar-agenda-item > div small { font-size: 11px !important; }',
    '#menuContent .club-calendar-agenda-action { min-width: 118px; }',
    '@media (max-width: 1023px)',
    'grid-template-columns: 62px minmax(0, 1fr) !important',
    '#menuContent .club-calendar-agenda-item > time strong { font-size: 24px !important; }',
    '#menuContent .club-calendar-agenda-item > div strong { font-size: 15px !important; white-space: normal !important; }',
    '#menuContent .club-calendar-agenda-item > div small { font-size: 12px !important; white-space: normal !important; line-height: 1.45 !important; }',
    'grid-column: 2',
    'min-width: 150px !important',
    'min-height: 44px !important',
)
if any(item not in block for item in required):
    raise SystemExit('Calendar agenda presentation rule missing from extracted block')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/calendar-agenda.css').write_text(
    '/* Club calendar agenda typography, compact reflow and action-target ownership.\n'
    '   Extracted from the Build 12.135 release layer in Build 12.175 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.174: Training Readability CSS Ownership', 'Strikewatch 12.175: Calendar Agenda CSS Ownership')
text = text.replace('12.174.0-training-readability-css-ownership', build_id)
text = text.replace('>12.174</b>', '>12.175</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/training-readability.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.175.0-calendar-agenda-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/calendar-agenda.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/training-readability.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.175.0-calendar-agenda-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.175.0-calendar-agenda-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.174 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "training-readability.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "calendar-agenda.css", ROOT / "css" / "training-readability.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    1,
)
text = text.replace(
    '        "owned_training_readability_lines": texts["training-readability.css"].count("\\n"),',
    '        "owned_calendar_agenda_lines": texts["calendar-agenda.css"].count("\\n"),\n        "owned_training_readability_lines": texts["training-readability.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31275', '"game_css_lines_max": 31230', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/training-readability.css` | Training/development typography floors and programme-control sizing |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/calendar-agenda.css` | Calendar agenda typography, compact two-column reflow and action-target sizing |\n'
    '| `css/training-readability.css` | Training/development typography floors and programme-control sizing |',
    1,
)
text = text.replace(
    'The current order is `game.css`, `training-readability.css`,\n`training-programme.css`, `management-feedback.css`, `compact-readability.css`,\n`reward-reveal.css`, `armour-viewer.css`, `weapon-presentation.css`,\n`loadout-stills.css`, `12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.',
    'The current order is `game.css`, `calendar-agenda.css`,\n`training-readability.css`, `training-programme.css`, `management-feedback.css`,\n`compact-readability.css`, `reward-reveal.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.',
    1,
)
architecture.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.174 — Training Readability CSS Ownership**', 'Build: **12.175 — Calendar Agenda CSS Ownership**', 1)
text = text.replace('Build ID: `12.174.0-training-readability-css-ownership`', 'Build ID: `12.175.0-calendar-agenda-css-ownership`', 1)
text = text.replace('strikewatch-build-12.174.html', 'strikewatch-build-12.175.html', 1)
text = text.replace(
    'The sheet follows `game.css` before the later training workflow and component layers.',
    'The sheet follows `calendar-agenda.css` before the later training workflow and component layers.',
    1,
)
position = text.find('Build 12.174 continues SW-020')
if position < 0:
    raise SystemExit('12.174 handoff note missing')
note = 'Build 12.175 continues SW-020 by moving the Build 12.135 club calendar agenda typography, compact two-column reflow and action-target sizing into `css/calendar-agenda.css`. Date, title and detail floors, wrapped compact copy and the 44px action target are unchanged. The sheet follows `game.css` before all later component layers. See `AUDIT-12.175.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.175 owns club calendar agenda typography, compact two-column reflow and action-target sizing in `css/calendar-agenda.css`. Keep it immediately after `game.css`, before `training-readability.css`. Preserve the 62px date column, wrapped compact title/detail copy, second-column action placement and 44px compact target. Verify `clubCalendarAgendaActionMarkup`, `clubCalendarAgendaMarkup`, `renderClubCalendarTab`, `mobileInterfaceAuditForTest()` and `typographyConsistencyForTest()` alongside the CSS ownership gates. See `AUDIT-12.175.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.174 owns training/development typography floors and programme-control sizing in `css/training-readability.css`. Keep it immediately after `game.css`, before `training-programme.css`.',
    'Build 12.174 owns training/development typography floors and programme-control sizing in `css/training-readability.css`. Keep it after `calendar-agenda.css`, before `training-programme.css`.',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# Strikewatch Source 12.174', '# Strikewatch Source 12.175', 1)
text = text.replace('dist/strikewatch-build-12.174.html', 'dist/strikewatch-build-12.175.html', 1)
readme.write_text(text, encoding='utf-8', newline='\n')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.175 continues the staged CSS ownership programme by moving the club
calendar agenda typography, compact reflow and action-target sizing into
`css/calendar-agenda.css` without changing selectors, declarations, breakpoint
or cascade order. See `HANDOFF.md` and `AUDIT-12.175.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

read_first = root / '00-READ-FIRST-GPT.md'
text = read_first.read_text(encoding='utf-8')
text = text.replace('Current release: **Strikewatch Build 12.174 — Training Readability CSS Ownership**.', 'Current release: **Strikewatch Build 12.175 — Calendar Agenda CSS Ownership**.', 1)
read_first.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.175 — Calendar Agenda CSS Ownership

- Moves the Build 12.135 club calendar agenda typography, compact two-column reflow and action-target sizing rules from `game.css` into `css/calendar-agenda.css` without changing selectors, declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before training and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.175.md`.

'''
if '## 12.175 — Calendar Agenda CSS Ownership' not in text:
    text = header + entry + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.175.md').write_text('''# Build 12.175 — Calendar Agenda CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.135 club calendar agenda readability and compact reflow layer.

## Change

The complete event-agenda block is removed from the tail of `css/game.css` and placed in `css/calendar-agenda.css`. Selectors, declarations and the `max-width: 1023px` breakpoint are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before training readability, training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The presentation contract is unchanged. Desktop date/type/title/detail floors and the 118px action width remain intact. Below 1024px the agenda remains a 62px date column plus flexible content column; title and detail copy wrap; the action moves under the description in column two and remains at least 150px wide by 44px high. Event generation, labels, accessible names, calendar navigation, gameplay and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. Existing compact, touch-target and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the calendar-agenda layer separately. The `game.css` budget falls from 31,275 to 31,230 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The event-agenda marker exists exactly once in `calendar-agenda.css` and no longer exists in `game.css`.
- Desktop and compact agenda declarations remain present, including the 62px compact date column and 150x44px action target.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `clubCalendarAgendaActionMarkup`, `clubCalendarAgendaMarkup`, `renderClubCalendarTab`, `mobileInterfaceAuditForTest` and `typographyConsistencyForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')
