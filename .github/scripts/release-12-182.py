from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.182'
name = 'Operator Portrait CSS Ownership'
build_id = '12.182.0-operator-portrait-css-ownership'


def replace_once(path, old, new):
    target = root / path
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one occurrence, found {count}: {old[:180]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')


expected_release = {
    'version': '12.181',
    'name': 'Command Chrome CSS Ownership',
    'build_id': '12.181.0-command-chrome-css-ownership',
}
current_release = json.loads((root / 'RELEASE.json').read_text(encoding='utf-8'))
if current_release != expected_release:
    raise SystemExit(f'Authoritative release moved; expected {expected_release}, got {current_release}')

replace_once('js/00-core.js', "const BUILD_VERSION = '12.181';", "const BUILD_VERSION = '12.182';")
replace_once('js/00-core.js', "const BUILD_NAME = 'Command Chrome CSS Ownership';", "const BUILD_NAME = 'Operator Portrait CSS Ownership';")
replace_once('js/00-core.js', "const BUILD_ID = '12.181.0-command-chrome-css-ownership';", "const BUILD_ID = '12.182.0-operator-portrait-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

# Extract the complete EOF portrait section. The new owner is inserted directly
# after game.css so it retains its original position before the later 12.134 layer.
game_path = root / 'css/game.css'
game = game_path.read_text(encoding='utf-8')
marker = '/* --- Operator portrait: deeper procedural variation --- */'
position = game.find(marker)
if position < 0:
    raise SystemExit('Operator portrait marker missing')
block = game[position:].strip() + '\n'
required = (
    marker,
    '--skin-light: #c9a68b;',
    '--skin-mid: #a07f66;',
    '--skin-dark: #6d5341;',
    '--kit-light: #5b7686;',
    '--kit-mid: #2b4351;',
    '--kit-dark: #16242d;',
    '.team-player-visual.tone-1',
    '.team-player-visual.tone-5',
    '.team-player-visual.variant-1',
    '.team-player-visual.variant-3',
    '.team-player-visual .operator-head {',
    '.team-player-visual .operator-helmet {',
    '.team-player-visual.helmet-3 .operator-helmet',
    '.team-player-visual .operator-shoulders {',
    '.team-player-visual .operator-plate {',
    '.team-player-visual.rig-2 .operator-plate',
    '.team-player-visual .operator-comms {',
    'background: var(--role-accent, #7fd4ff);',
    'width: 54px !important;',
    'height: 52px !important;',
    'transform: translateX(-50%) scale(.88) !important;',
    'font-size: 6.5px !important;',
    '@media (max-width: 1023px)',
    'width: 50px !important;',
    'height: 50px !important;',
    'font-size: 7px !important;',
)
missing = [item for item in required if item not in block]
if missing:
    raise SystemExit(f'Operator portrait declarations missing: {missing}')
if block.count(marker) != 1:
    raise SystemExit('Unexpected operator portrait marker count')
if block.count('@media (max-width: 1023px)') != 1:
    raise SystemExit('Unexpected operator portrait media-query count')
if not block.rstrip().endswith('}'):
    raise SystemExit('Operator portrait block does not end cleanly')
game_path.write_text(game[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/operator-portrait.css').write_text(
    '/* Asset-free deterministic operator portrait presentation ownership.\n'
    '   Extracted from the Build 12.133 tail in Build 12.182 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index_path = root / 'index.html'
text = index_path.read_text(encoding='utf-8')
if text.count('>12.181</b>') != 2:
    raise SystemExit('Expected exactly two visible 12.181 build labels')
text = text.replace('Strikewatch 12.181: Command Chrome CSS Ownership', 'Strikewatch 12.182: Operator Portrait CSS Ownership', 1)
text = text.replace('12.181.0-command-chrome-css-ownership', build_id)
text = text.replace('>12.181</b>', '>12.182</b>')
game_link = '<link rel="stylesheet" href="css/game.css?v=12.182.0-operator-portrait-css-ownership" />'
portrait_link = '<link rel="stylesheet" href="css/operator-portrait.css?v=12.182.0-operator-portrait-css-ownership" />'
if text.count(game_link) != 1 or portrait_link in text:
    raise SystemExit('Unexpected index stylesheet insertion state')
index_path.write_text(text.replace(game_link, game_link + '\n' + portrait_link, 1), encoding='utf-8', newline='\n')

build_path = root / 'build.py'
text = build_path.read_text(encoding='utf-8')
old_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "command-chrome.css",'
new_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "operator-portrait.css", ROOT / "css" / "command-chrome.css",'
if text.count(old_paths) != 1:
    raise SystemExit('Expected 12.181 CSS_PATHS prefix missing')
text = text.replace(old_paths, new_paths, 1)
old_metric = '        "owned_command_chrome_lines": texts["command-chrome.css"].count("\\n"),'
new_metric = '        "owned_operator_portrait_lines": texts["operator-portrait.css"].count("\\n"),\n        "owned_command_chrome_lines": texts["command-chrome.css"].count("\\n"),'
if text.count(old_metric) != 1:
    raise SystemExit('CSS debt metric insertion point missing')
text = text.replace(old_metric, new_metric, 1)
if text.count('"game_css_lines_max": 30930') != 1:
    raise SystemExit('12.181 game.css budget missing')
text = text.replace('"game_css_lines_max": 30930', '"game_css_lines_max": 30830', 1)
build_path.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
old_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/command-chrome.css` | Compact shared command typography floors and nowrap containment |'
new_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/operator-portrait.css` | Asset-free operator complexion, kit, headgear, rig and deployment portrait presentation |\n| `css/command-chrome.css` | Compact shared command typography floors and nowrap containment |'
if text.count(old_owner) != 1:
    raise SystemExit('Architecture owner insertion point missing')
text = text.replace(old_owner, new_owner, 1)
old_order = 'The current order is `game.css`, `command-chrome.css`,'
new_order = 'The current order is `game.css`, `operator-portrait.css`, `command-chrome.css`,'
if text.count(old_order) != 1:
    raise SystemExit('Architecture order insertion point missing')
architecture.write_text(text.replace(old_order, new_order, 1), encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.181 — Command Chrome CSS Ownership**', 'Build: **12.182 — Operator Portrait CSS Ownership**', 1)
text = text.replace('Build ID: `12.181.0-command-chrome-css-ownership`', 'Build ID: `12.182.0-operator-portrait-css-ownership`', 1)
text = text.replace('strikewatch-build-12.181.html', 'strikewatch-build-12.182.html', 1)
old_note = 'Build 12.181 continues SW-020 by moving the remaining Build 12.134 compact shared command typography and nowrap containment into `css/command-chrome.css`. The 11–12px floors, 11.5px Armoury state labels, wrapping and `min-width: 0` safeguards remain unchanged. The sheet follows `game.css` before all later component layers. See `AUDIT-12.181.md`.'
new_note = 'Build 12.182 continues SW-020 by moving the Build 12.133 asset-free operator portrait presentation into `css/operator-portrait.css`. Independent complexion and kit variables, helmet and rig variants, comms accent, 54px desktop deployment portrait and 50px compact portrait remain unchanged. The sheet follows `game.css` before all later component layers. Portrait identity generation remains owned by `teamPlayerVisualMarkup(player, role)`. See `AUDIT-12.182.md`.\n\nBuild 12.181 continues SW-020 by moving the remaining Build 12.134 compact shared command typography and nowrap containment into `css/command-chrome.css`. The 11–12px floors, 11.5px Armoury state labels, wrapping and `min-width: 0` safeguards remain unchanged. After the 12.182 extraction, the sheet follows `operator-portrait.css` before all later component layers. See `AUDIT-12.181.md`.'
if text.count(old_note) != 1:
    raise SystemExit('12.181 HANDOFF note missing')
handoff.write_text(text.replace(old_note, new_note, 1), encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.182 owns asset-free operator portrait presentation in `css/operator-portrait.css`. Keep it immediately after `game.css`, before `command-chrome.css`. Preserve the independent skin/kit custom properties, tone/variant/headgear/rig classes, role-accent comms light, 54×52px desktop deployment portrait, 50×50px compact portrait and `.88` bust scale. Identity and class generation remain in `teamPlayerVisualMarkup(player, role)`. Verify `mobileInterfaceAuditForTest()`, `renderRouteForTest()` and `typographyConsistencyForTest()` alongside source-markup and CSS ownership gates. See `AUDIT-12.182.md`.\n\n'
if text.count(anchor) != 1:
    raise SystemExit('AGENTS current release anchor missing')
text = text.replace(anchor, anchor + note, 1)
old_agent = 'Build 12.181 owns compact shared command typography and containment in `css/command-chrome.css`. Keep it immediately after `game.css`, before `combat-effectiveness.css`.'
new_agent = 'Build 12.181 owns compact shared command typography and containment in `css/command-chrome.css`. Keep it after `operator-portrait.css`, before `combat-effectiveness.css`.'
if text.count(old_agent) != 1:
    raise SystemExit('12.181 AGENTS order note missing')
agents.write_text(text.replace(old_agent, new_agent, 1), encoding='utf-8', newline='\n')

replace_once('README.md', '# Strikewatch Source 12.181', '# Strikewatch Source 12.182')
replace_once('README.md', 'dist/strikewatch-build-12.181.html', 'dist/strikewatch-build-12.182.html')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
old_current = '''Build 12.181 continues the staged CSS ownership programme by moving the
remaining Build 12.134 compact shared command typography and containment into
`css/command-chrome.css` without changing declarations or breakpoint. See
`HANDOFF.md` and `AUDIT-12.181.md`.'''
new_current = '''Build 12.182 continues the staged CSS ownership programme by moving the Build
12.133 asset-free operator portrait presentation into `css/operator-portrait.css`
without changing declarations, deterministic identity generation or responsive
sizing. See `HANDOFF.md` and `AUDIT-12.182.md`.'''
if text.count(old_current) != 1:
    raise SystemExit('PROJECT current release paragraph missing')
project.write_text(text.replace(old_current, new_current, 1), encoding='utf-8', newline='\n')

replace_once('00-READ-FIRST-GPT.md', 'Current release: **Strikewatch Build 12.181 — Command Chrome CSS Ownership**.', 'Current release: **Strikewatch Build 12.182 — Operator Portrait CSS Ownership**.')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.182 — Operator Portrait CSS Ownership

- Moves the Build 12.133 asset-free operator portrait palette, headgear, rig, comms and deployment sizing rules from `game.css` into `css/operator-portrait.css` without changing declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before command chrome and all later presentation layers.
- Keeps independent complexion and kit variation, the headband variant, role-coloured comms detail, the 54×52px desktop deployment portrait and the 50×50px compact portrait.
- Leaves deterministic portrait identity and class generation under `teamPlayerVisualMarkup(player, role)`.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.182.md`.

'''
if not text.startswith(header):
    raise SystemExit('CHANGELOG header missing')
changelog.write_text(header + entry + text[len(header):], encoding='utf-8', newline='\n')

(root / 'AUDIT-12.182.md').write_text('''# Build 12.182 — Operator Portrait CSS Ownership

## Audit item

Continues SW-020 component by component. After the Build 12.134 tail extractions, the next bounded EOF section is the Build 12.133 asset-free operator portrait presentation used across team cards and Confirm Deployment.

## Change

The complete `Operator portrait: deeper procedural variation` section is removed from the tail of `css/game.css` and placed in `css/operator-portrait.css`. Selectors, declarations and the single 1023px compact breakpoint are unchanged. The new sheet loads immediately after `game.css`, preserving the section's former cascade position before command chrome, Combat Effectiveness, match type, route readability and every later component layer.

The presentation contract is unchanged. Six complexion slots remain driven by `--skin-light`, `--skin-mid` and `--skin-dark`; kit variants remain independent through `--kit-light`, `--kit-mid` and `--kit-dark`. Helmet variants retain their authored dimensions, including `helmet-3` as a low headband. Shoulder, chest-plate and rig variants remain intact, and comms keeps the role accent and glow. Confirm Deployment retains a 54×52px portrait with a `.88` bust scale and 6.5px footer copy on desktop, plus a 50×50px portrait and 7px footer copy below 1024px.

Deterministic identity generation remains in `teamPlayerVisualMarkup(player, role)`, which derives silhouette, complexion, headgear and rig classes from independent seed slices and emits the existing helmet, head, visor, neck, shoulders, body, rig, plate and comms elements. No player generation, attributes, role logic, deployment markup, gameplay, economy, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order and regression hooks. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing compact-layout, deterministic-generation and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the operator portrait layer separately. The `game.css` budget falls from 30,930 to 30,830 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The operator portrait marker is absent from `game.css` and present exactly once in `operator-portrait.css`.
- Representative palette, tone, kit, helmet, shoulder, plate, comms, desktop sizing and compact sizing declarations remain present.
- `teamPlayerVisualMarkup` retains independent portrait, complexion, headgear and rig seeds plus all authored portrait element classes.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `teamPlayerVisualMarkup`, `mobileInterfaceAuditForTest`, `renderRouteForTest` and `typographyConsistencyForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No live-browser execution is claimed; the release evidence is exact declaration/cascade preservation, deterministic builds, parse gates, retained source markup and retained regression hooks.
''', encoding='utf-8', newline='\n')
