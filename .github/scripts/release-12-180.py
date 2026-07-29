from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.180'
name = 'Combat Effectiveness CSS Ownership'
build_id = '12.180.0-combat-effectiveness-css-ownership'


def must_replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    actual = text.count(old)
    if actual < count:
        raise SystemExit(f'{path}: expected at least {count} occurrence(s), found {actual}: {old[:180]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


current_release = json.loads((root / 'RELEASE.json').read_text(encoding='utf-8'))
expected_release = {
    'version': '12.179',
    'name': 'Match Type CSS Ownership',
    'build_id': '12.179.0-match-type-css-ownership',
}
if current_release != expected_release:
    raise SystemExit(f'Authoritative release moved; expected {expected_release}, got {current_release}')

must_replace('js/00-core.js', "const BUILD_VERSION = '12.179';", "const BUILD_VERSION = '12.180';")
must_replace('js/00-core.js', "const BUILD_NAME = 'Match Type CSS Ownership';", "const BUILD_NAME = 'Combat Effectiveness CSS Ownership';")
must_replace('js/00-core.js', "const BUILD_ID = '12.179.0-match-type-css-ownership';", "const BUILD_ID = '12.180.0-combat-effectiveness-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- After-action Combat Effectiveness ring --- */'
position = css.find(marker)
if position < 0:
    raise SystemExit('Combat Effectiveness marker missing')
block = css[position:].strip() + '\n'
required_css = (
    marker,
    '@media (max-width: 1023px)',
    '.career-report-analysis-panel { min-width: 0; }',
    'width: 138px !important;',
    'height: 138px !important;',
    'margin: 0 auto 30px !important;',
    '.career-report-score-content span { font-size: 40px !important; line-height: .84 !important; }',
    '.career-report-score-content strong { font-size: 21px !important; line-height: 1 !important; }',
    'top: calc(100% + 9px);',
    'max-width: min(240px, 78vw) !important;',
    'white-space: nowrap;',
    '.career-report-influence-legend {',
    '.career-report-influence-legend > span { font-size: 11px !important; }',
    '@media (max-width: 380px)',
    'width: 124px !important;',
    'height: 124px !important;',
    '.career-report-score-content small { font-size: 10.5px !important; }',
)
if any(item not in block for item in required_css):
    raise SystemExit('Combat Effectiveness declaration missing from extracted block')
if block.count('@media') != 2:
    raise SystemExit('Unexpected Combat Effectiveness media-query count')
if block.count('.career-report-score-ring') != 2:
    raise SystemExit('Unexpected Combat Effectiveness ring selector count')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/combat-effectiveness.css').write_text(
    '/* Compact after-action Combat Effectiveness ring ownership.\n'
    '   Extracted from the Build 12.134 tail in Build 12.180 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
if text.count('>12.179</b>') != 2:
    raise SystemExit('Expected exactly two visible 12.179 build labels')
text = text.replace('Strikewatch 12.179: Match Type CSS Ownership', 'Strikewatch 12.180: Combat Effectiveness CSS Ownership', 1)
text = text.replace('12.179.0-match-type-css-ownership', build_id)
text = text.replace('>12.179</b>', '>12.180</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/match-type.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/route-readability.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/management-grid.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/league-table.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/calendar-agenda.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/training-readability.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.180.0-combat-effectiveness-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/combat-effectiveness.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/match-type.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/route-readability.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/management-grid.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/league-table.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/calendar-agenda.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/training-readability.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.180.0-combat-effectiveness-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.180.0-combat-effectiveness-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.179 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
old_css_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "match-type.css", ROOT / "css" / "route-readability.css", ROOT / "css" / "management-grid.css", ROOT / "css" / "league-table.css", ROOT / "css" / "calendar-agenda.css", ROOT / "css" / "training-readability.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")'
new_css_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "combat-effectiveness.css", ROOT / "css" / "match-type.css", ROOT / "css" / "route-readability.css", ROOT / "css" / "management-grid.css", ROOT / "css" / "league-table.css", ROOT / "css" / "calendar-agenda.css", ROOT / "css" / "training-readability.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")'
if text.count(old_css_paths) != 1:
    raise SystemExit('Expected 12.179 CSS_PATHS sequence missing')
text = text.replace(old_css_paths, new_css_paths, 1)
text = text.replace(
    '        "owned_match_type_lines": texts["match-type.css"].count("\\n"),',
    '        "owned_combat_effectiveness_lines": texts["combat-effectiveness.css"].count("\\n"),\n        "owned_match_type_lines": texts["match-type.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31055', '"game_css_lines_max": 30995', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
old_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/match-type.css` | Detailed-report competition row and first-match fixture-type line |'
new_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/combat-effectiveness.css` | Compact after-action score ring, caption and influence typography |\n| `css/match-type.css` | Detailed-report competition row and first-match fixture-type line |'
if old_owner not in text:
    raise SystemExit('Architecture CSS owner insertion point missing')
text = text.replace(old_owner, new_owner, 1)
old_order = 'The current order is `game.css`, `match-type.css`, `route-readability.css`,\n`management-grid.css`, `league-table.css`, `calendar-agenda.css`,\n`training-readability.css`, `training-programme.css`, `management-feedback.css`,\n`compact-readability.css`, `reward-reveal.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.'
new_order = 'The current order is `game.css`, `combat-effectiveness.css`,\n`match-type.css`, `route-readability.css`, `management-grid.css`,\n`league-table.css`, `calendar-agenda.css`, `training-readability.css`,\n`training-programme.css`, `management-feedback.css`, `compact-readability.css`,\n`reward-reveal.css`, `armour-viewer.css`, `weapon-presentation.css`,\n`loadout-stills.css`, `12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.'
if old_order not in text:
    raise SystemExit('Architecture stylesheet order paragraph missing')
architecture.write_text(text.replace(old_order, new_order, 1), encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.179 — Match Type CSS Ownership**', 'Build: **12.180 — Combat Effectiveness CSS Ownership**', 1)
text = text.replace('Build ID: `12.179.0-match-type-css-ownership`', 'Build ID: `12.180.0-combat-effectiveness-css-ownership`', 1)
text = text.replace('strikewatch-build-12.179.html', 'strikewatch-build-12.180.html', 1)
old_note = 'Build 12.179 continues SW-020 by moving the Build 12.134 post-match fixture-type presentation into `css/match-type.css`. The detailed report competition row and staged first-match type line keep the same font sizes, spacing and 1023px breakpoint. The sheet follows `game.css` before all later component layers. Match classification remains owned by `careerMatchTypeDescriptor(summary)`. See `AUDIT-12.179.md`.'
new_old_note = 'Build 12.179 continues SW-020 by moving the Build 12.134 post-match fixture-type presentation into `css/match-type.css`. The detailed report competition row and staged first-match type line keep the same font sizes, spacing and 1023px breakpoint. After the 12.180 extraction, the sheet follows `combat-effectiveness.css` before all later component layers. Match classification remains owned by `careerMatchTypeDescriptor(summary)`. See `AUDIT-12.179.md`.'
if old_note not in text:
    raise SystemExit('12.179 handoff note missing')
new_note = 'Build 12.180 continues SW-020 by moving the Build 12.134 compact Combat Effectiveness ring into `css/combat-effectiveness.css`. The 138px compact ring, 124px narrow-phone ring, caption below the dial, grade/score sizing and wrapped influence legend remain unchanged. The sheet follows `game.css` before all later component layers. See `AUDIT-12.180.md`.\n\n'
text = text.replace(old_note, new_note + new_old_note, 1)
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
if anchor not in text:
    raise SystemExit('AGENTS current release anchor missing')
note = 'Build 12.180 owns the compact after-action Combat Effectiveness ring in `css/combat-effectiveness.css`. Keep it immediately after `game.css`, before `match-type.css`. Preserve the 138px ring and external 11px caption below 1024px, the 124px/10.5px narrow-phone adjustment below 381px, and the wrapped influence legend. Verify `firstMatchPayoffForTest()`, `mobileInterfaceAuditForTest()`, `renderRouteForTest()` and `typographyConsistencyForTest()` alongside the CSS ownership gates. See `AUDIT-12.180.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.179 owns post-match fixture-type presentation in `css/match-type.css`. Keep it immediately after `game.css`, before `route-readability.css`.',
    'Build 12.179 owns post-match fixture-type presentation in `css/match-type.css`. Keep it after `combat-effectiveness.css`, before `route-readability.css`.',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

must_replace('README.md', '# Strikewatch Source 12.179', '# Strikewatch Source 12.180')
must_replace('README.md', 'dist/strikewatch-build-12.179.html', 'dist/strikewatch-build-12.180.html')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
old_current = '''Build 12.179 continues the staged CSS ownership programme by moving the Build
12.134 post-match fixture-type presentation into `css/match-type.css` without
changing declarations, breakpoint or classification logic. See `HANDOFF.md` and
`AUDIT-12.179.md`.'''
new_current = '''Build 12.180 continues the staged CSS ownership programme by moving the Build
12.134 compact Combat Effectiveness ring into `css/combat-effectiveness.css`
without changing declarations, breakpoints or report behaviour. See `HANDOFF.md`
and `AUDIT-12.180.md`.'''
if old_current not in text:
    raise SystemExit('PROJECT current release paragraph missing')
project.write_text(text.replace(old_current, new_current, 1), encoding='utf-8', newline='\n')

must_replace('00-READ-FIRST-GPT.md', 'Current release: **Strikewatch Build 12.179 — Match Type CSS Ownership**.', 'Current release: **Strikewatch Build 12.180 — Combat Effectiveness CSS Ownership**.')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.180 — Combat Effectiveness CSS Ownership

- Moves the Build 12.134 compact Combat Effectiveness ring, external caption and influence typography from `game.css` into `css/combat-effectiveness.css` without changing declarations or breakpoints.
- Preserves the layer immediately after `game.css`, before match type and all later presentation layers.
- Keeps the 138px compact dial, 124px narrow-phone dial, 40px grade, 21px score and caption below the ring rather than over its stroke.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.180.md`.

'''
if not text.startswith(header):
    raise SystemExit('CHANGELOG header missing')
if '## 12.180 — Combat Effectiveness CSS Ownership' not in text:
    text = header + entry + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.180.md').write_text('''# Build 12.180 — Combat Effectiveness CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded EOF block is the Build 12.134 compact Combat Effectiveness dial fix: ring sizing, score/grade typography, an external caption and a wrapped influence legend.

## Change

The complete `After-action Combat Effectiveness ring` block is removed from the tail of `css/game.css` and placed in `css/combat-effectiveness.css`. Selectors, declarations and both compact breakpoints are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before match type, route readability, management grid, league table, calendar agenda, training readability, training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The presentation contract is unchanged. Below 1024px the ring remains 138px with a 30px lower margin; the 40px grade and 21px score own the dial while the 11px `COMBAT EFFECTIVENESS` caption sits at `top: calc(100% + 9px)` beneath it. The influence legend remains centred and wrapping, and influence labels stay at 11px. Below 381px the ring remains 124px, the grade 35px, score 19px and caption 10.5px.

No report markup, scoring, grade calculation, match settlement, gameplay, economy, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order and regression hooks. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing report, compact-layout and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the Combat Effectiveness layer separately. The `game.css` budget falls from 31,055 to 30,995 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Combat Effectiveness marker exists in `combat-effectiveness.css` and no longer exists in `game.css`.
- The 1023px and 380px media blocks and representative ring/caption/influence declarations remain present exactly once.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `firstMatchPayoffForTest`, `mobileInterfaceAuditForTest`, `renderRouteForTest` and `typographyConsistencyForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No live-browser execution is claimed; the release evidence is exact declaration/cascade preservation, deterministic builds, parse gates and retained regression hooks.
''', encoding='utf-8', newline='\n')
