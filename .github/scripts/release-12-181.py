from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.181'
name = 'Command Chrome CSS Ownership'
build_id = '12.181.0-command-chrome-css-ownership'


def replace_once(path, old, new):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise SystemExit(f'{path}: expected exactly one occurrence of {old[:160]!r}, found {text.count(old)}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')


expected_release = {
    'version': '12.180',
    'name': 'Combat Effectiveness CSS Ownership',
    'build_id': '12.180.0-combat-effectiveness-css-ownership',
}
current_release = json.loads((root / 'RELEASE.json').read_text(encoding='utf-8'))
if current_release != expected_release:
    raise SystemExit(f'Authoritative release moved; expected {expected_release}, got {current_release}')

replace_once('js/00-core.js', "const BUILD_VERSION = '12.180';", "const BUILD_VERSION = '12.181';")
replace_once('js/00-core.js', "const BUILD_NAME = 'Combat Effectiveness CSS Ownership';", "const BUILD_NAME = 'Command Chrome CSS Ownership';")
replace_once('js/00-core.js', "const BUILD_ID = '12.180.0-combat-effectiveness-css-ownership';", "const BUILD_ID = '12.181.0-command-chrome-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

# Move the remaining Build 12.134 EOF block into its own owner while preserving
# the media query and every selector/declaration byte-for-byte.
game_path = root / 'css/game.css'
game = game_path.read_text(encoding='utf-8')
marker = '/* ==========================================================================\n   Build 12.134 — Compact readability and containment layer'
position = game.find(marker)
if position < 0:
    raise SystemExit('Build 12.134 command-chrome marker missing')
tail = game[position:]
media_marker = '@media (max-width: 1023px) {'
media_position = tail.find(media_marker)
if media_position < 0:
    raise SystemExit('Build 12.134 command-chrome media block missing')
block = tail[media_position:].strip() + '\n'
required = (
    '#menuContent .menu-pill { font-size: 12px !important; line-height: 1.25 !important; }',
    '#menuContent .command-currency-link { font-size: 12px !important; }',
    '#menuContent .career-xp-panel .career-xp-footer > span { font-size: 12px !important; }',
    '#menuContent .club-response-group button > span { font-size: 12px !important; }',
    '#menuContent .club-response-group button > b { font-size: 11px !important; }',
    '#menuContent .command-fixture-card > header > b { font-size: 11px !important; }',
    '#menuContent .career-inventory-state { font-size: 11.5px !important; }',
    '#menuContent .career-section-head > p { font-size: 12px !important; }',
    '#menuContent .club-staff-card dd { font-size: 11px !important; }',
    'overflow-wrap: anywhere;',
    'white-space: normal !important;',
    'flex-wrap: wrap;',
    'row-gap: 6px;',
)
if any(item not in block for item in required):
    raise SystemExit('A command-chrome declaration is missing from the extracted block')
if block.count('@media (max-width: 1023px)') != 1:
    raise SystemExit('Unexpected command-chrome media-query count')
if block.count('#menuContent .command-hero-meta') != 2:
    raise SystemExit('Unexpected command-hero-meta selector count')
game_path.write_text(game[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/command-chrome.css').write_text(
    '/* Compact shared command-chrome typography and containment ownership.\n'
    '   Extracted from the Build 12.134 tail in Build 12.181 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
if text.count('>12.180</b>') != 2:
    raise SystemExit('Expected exactly two visible 12.180 build labels')
text = text.replace('Strikewatch 12.180: Combat Effectiveness CSS Ownership', 'Strikewatch 12.181: Command Chrome CSS Ownership', 1)
text = text.replace('12.180.0-combat-effectiveness-css-ownership', build_id)
text = text.replace('>12.180</b>', '>12.181</b>')
game_link = '<link rel="stylesheet" href="css/game.css?v=12.181.0-command-chrome-css-ownership" />'
command_link = '<link rel="stylesheet" href="css/command-chrome.css?v=12.181.0-command-chrome-css-ownership" />'
if text.count(game_link) != 1 or command_link in text:
    raise SystemExit('Unexpected index stylesheet insertion state')
index.write_text(text.replace(game_link, game_link + '\n' + command_link, 1), encoding='utf-8', newline='\n')

build_path = root / 'build.py'
text = build_path.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "combat-effectiveness.css",',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "command-chrome.css", ROOT / "css" / "combat-effectiveness.css",',
    1,
)
text = text.replace(
    '        "owned_combat_effectiveness_lines": texts["combat-effectiveness.css"].count("\\n"),',
    '        "owned_command_chrome_lines": texts["command-chrome.css"].count("\\n"),\n        "owned_combat_effectiveness_lines": texts["combat-effectiveness.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 30995', '"game_css_lines_max": 30930', 1)
if 'command-chrome.css' not in text or 'owned_command_chrome_lines' not in text:
    raise SystemExit('build.py command-chrome ownership update failed')
build_path.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/combat-effectiveness.css` | Compact after-action score ring, caption and influence typography |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/command-chrome.css` | Compact shared command typography floors and nowrap containment |\n| `css/combat-effectiveness.css` | Compact after-action score ring, caption and influence typography |',
    1,
)
text = text.replace(
    'The current order is `game.css`, `combat-effectiveness.css`,\n`match-type.css`,',
    'The current order is `game.css`, `command-chrome.css`,\n`combat-effectiveness.css`, `match-type.css`,',
    1,
)
if 'css/command-chrome.css' not in text:
    raise SystemExit('ARCHITECTURE command-chrome owner update failed')
architecture.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.180 — Combat Effectiveness CSS Ownership**', 'Build: **12.181 — Command Chrome CSS Ownership**', 1)
text = text.replace('Build ID: `12.180.0-combat-effectiveness-css-ownership`', 'Build ID: `12.181.0-command-chrome-css-ownership`', 1)
text = text.replace('strikewatch-build-12.180.html', 'strikewatch-build-12.181.html', 1)
old_note = 'Build 12.180 continues SW-020 by moving the Build 12.134 compact Combat Effectiveness ring into `css/combat-effectiveness.css`. The 138px compact ring, 124px narrow-phone ring, caption below the dial, grade/score sizing and wrapped influence legend remain unchanged. The sheet follows `game.css` before all later component layers. See `AUDIT-12.180.md`.'
new_note = 'Build 12.181 continues SW-020 by moving the remaining Build 12.134 compact shared command typography and nowrap containment into `css/command-chrome.css`. The 11–12px floors, 11.5px Armoury state labels, wrapping and `min-width: 0` safeguards remain unchanged. The sheet follows `game.css` before all later component layers. See `AUDIT-12.181.md`.\n\nBuild 12.180 continues SW-020 by moving the Build 12.134 compact Combat Effectiveness ring into `css/combat-effectiveness.css`. The 138px compact ring, 124px narrow-phone ring, caption below the dial, grade/score sizing and wrapped influence legend remain unchanged. After the 12.181 extraction, the sheet follows `command-chrome.css` before all later component layers. See `AUDIT-12.180.md`.'
if old_note not in text:
    raise SystemExit('12.180 HANDOFF note missing')
handoff.write_text(text.replace(old_note, new_note, 1), encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.181 owns compact shared command typography and containment in `css/command-chrome.css`. Keep it immediately after `game.css`, before `combat-effectiveness.css`. Preserve the 11–12px floors, 11.5px Armoury labels, `overflow-wrap: anywhere`, normalised Armoury small-copy wrapping and wrapped command metadata. Verify `mobileInterfaceAuditForTest()`, `typographyConsistencyForTest()`, `economyGuidanceForTest()` and `renderRouteForTest()` alongside the CSS ownership gates. See `AUDIT-12.181.md`.\n\n'
if anchor not in text:
    raise SystemExit('AGENTS current release anchor missing')
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.180 owns the compact after-action Combat Effectiveness ring in `css/combat-effectiveness.css`. Keep it immediately after `game.css`, before `match-type.css`.',
    'Build 12.180 owns the compact after-action Combat Effectiveness ring in `css/combat-effectiveness.css`. Keep it after `command-chrome.css`, before `match-type.css`.',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

replace_once('README.md', '# Strikewatch Source 12.180', '# Strikewatch Source 12.181')
replace_once('README.md', 'dist/strikewatch-build-12.180.html', 'dist/strikewatch-build-12.181.html')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
old = '''Build 12.180 continues the staged CSS ownership programme by moving the Build
12.134 compact Combat Effectiveness ring into `css/combat-effectiveness.css`
without changing declarations, breakpoints or report behaviour. See `HANDOFF.md`
and `AUDIT-12.180.md`.'''
new = '''Build 12.181 continues the staged CSS ownership programme by moving the
remaining Build 12.134 compact shared command typography and containment into
`css/command-chrome.css` without changing declarations or breakpoint. See
`HANDOFF.md` and `AUDIT-12.181.md`.'''
if old not in text:
    raise SystemExit('PROJECT current release paragraph missing')
project.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')

replace_once('00-READ-FIRST-GPT.md', 'Current release: **Strikewatch Build 12.180 — Combat Effectiveness CSS Ownership**.', 'Current release: **Strikewatch Build 12.181 — Command Chrome CSS Ownership**.')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.181 — Command Chrome CSS Ownership

- Moves the remaining Build 12.134 compact shared command typography and nowrap containment from `game.css` into `css/command-chrome.css` without changing declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before Combat Effectiveness and all later presentation layers.
- Keeps shared labels and meaningful copy at their existing 11–12px floors while retaining `min-width: 0`, `overflow-wrap: anywhere` and wrapped command metadata.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.181.md`.

'''
if not text.startswith(header):
    raise SystemExit('CHANGELOG header missing')
changelog.write_text(header + entry + text[len(header):], encoding='utf-8', newline='\n')

(root / 'AUDIT-12.181.md').write_text('''# Build 12.181 — Command Chrome CSS Ownership

## Audit item

Continues SW-020 component by component. After the match-type and Combat Effectiveness extractions, the remaining Build 12.134 EOF block owns compact shared command typography floors and containment for nowrap copy.

## Change

The complete remaining Build 12.134 compact command block is removed from the tail of `css/game.css` and placed in `css/command-chrome.css`. Its single `max-width: 1023px` media block, selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving its previous cascade position before Combat Effectiveness, match type, route readability and every later component layer.

The presentation contract is unchanged. Menu pills, command metadata, career XP copy, response labels and section headings retain their 12px floors. Response secondary labels, fixture labels and staff definition lists remain 11px; Armoury slot/action/state labels remain 11.5px. Shared small/em/pill copy retains `min-width: 0`, `max-width: 100%` and `overflow-wrap: anywhere`; Armoury small copy still permits normal wrapping; command metadata remains wrapped with a 6px row gap.

No route markup, navigation, report scoring, gameplay, economy, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and cascade order. `HANDOFF.md` and `AGENTS.md` carry the operational order and regression hooks. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing compact-layout and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the command-chrome layer separately. The `game.css` budget falls from 30,995 to 30,930 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.134 tail marker is absent from `game.css`; the compact command media block and representative typography/containment declarations exist exactly once in `command-chrome.css`.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `mobileInterfaceAuditForTest`, `typographyConsistencyForTest`, `economyGuidanceForTest` and `renderRouteForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No live-browser execution is claimed; the release evidence is exact declaration/cascade preservation, deterministic builds, parse gates and retained regression hooks.
''', encoding='utf-8', newline='\n')
