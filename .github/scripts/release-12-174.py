from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.174'
name = 'Training Readability CSS Ownership'
build_id = '12.174.0-training-readability-css-ownership'


def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:180]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


replace('js/00-core.js', "const BUILD_VERSION = '12.173';", "const BUILD_VERSION = '12.174';")
replace('js/00-core.js', "const BUILD_NAME = 'Training Programme CSS Ownership';", "const BUILD_NAME = 'Training Readability CSS Ownership';")
replace('js/00-core.js', "const BUILD_ID = '12.173.0-training-programme-css-ownership';", "const BUILD_ID = '12.174.0-training-readability-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Training & development: desktop readability'
position = css.find(marker)
if position < 0:
    raise SystemExit('Training/development readability CSS marker missing')
block = css[position:].strip() + '\n'
if block.count('Training & development: desktop readability') != 1:
    raise SystemExit('Unexpected duplicate training-readability marker')
required = (
    '#menuContent .training-player-card header span { font-size: 10px !important;',
    '#menuContent .training-player-card header strong { font-size: 13px !important; }',
    '#menuContent .training-player-card header small { font-size: 10.5px !important; }',
    '#menuContent .training-player-card label > span { font-size: 10px !important; }',
    '#menuContent .training-player-card select { font-size: 11.5px !important; min-height: 40px !important; }',
    '#menuContent .training-player-card > p { font-size: 11px !important; line-height: 1.55 !important; }',
    '#menuContent .training-player-metrics span { font-size: 10.5px !important; }',
    '#menuContent .development-intro-panel p { font-size: 11.5px !important; }',
    '@media (max-width: 1023px)',
    '#menuContent .training-player-card select { font-size: 13px !important; min-height: 46px !important; }',
    '#menuContent .training-player-card > p { font-size: 12px !important; }',
    '#menuContent .development-intro-panel p { font-size: 12.5px !important; }',
)
if any(item not in block for item in required):
    raise SystemExit('Training readability rule missing from extracted block')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/training-readability.css').write_text(
    '/* Training and development typography/control-size ownership.\n'
    '   Extracted from the Build 12.135 release layer in Build 12.174 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.173: Training Programme CSS Ownership', 'Strikewatch 12.174: Training Readability CSS Ownership')
text = text.replace('12.173.0-training-programme-css-ownership', build_id)
text = text.replace('>12.173</b>', '>12.174</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.174.0-training-readability-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/training-readability.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.174.0-training-readability-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.174.0-training-readability-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.173 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "training-readability.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    1,
)
text = text.replace(
    '        "owned_training_programme_lines": texts["training-programme.css"].count("\\n"),',
    '        "owned_training_readability_lines": texts["training-readability.css"].count("\\n"),\n        "owned_training_programme_lines": texts["training-programme.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31300', '"game_css_lines_max": 31275', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/training-programme.css` | Training workflow wrapper and outstanding-programme accent state |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/training-readability.css` | Training/development typography floors and programme-control sizing |\n'
    '| `css/training-programme.css` | Training workflow wrapper and outstanding-programme accent state |',
    1,
)
text = text.replace(
    'The current order is `game.css`, `training-programme.css`,\n`management-feedback.css`, `compact-readability.css`, `reward-reveal.css`,\n`armour-viewer.css`, `weapon-presentation.css`, `loadout-stills.css`,\n`12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.',
    'The current order is `game.css`, `training-readability.css`,\n`training-programme.css`, `management-feedback.css`, `compact-readability.css`,\n`reward-reveal.css`, `armour-viewer.css`, `weapon-presentation.css`,\n`loadout-stills.css`, `12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.',
    1,
)
architecture.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.173 — Training Programme CSS Ownership**', 'Build: **12.174 — Training Readability CSS Ownership**', 1)
text = text.replace('Build ID: `12.173.0-training-programme-css-ownership`', 'Build ID: `12.174.0-training-readability-css-ownership`', 1)
text = text.replace('strikewatch-build-12.173.html', 'strikewatch-build-12.174.html', 1)
text = text.replace(
    'The declarations are unchanged, and the sheet follows `game.css` before all later component layers.',
    'The declarations are unchanged; after the 12.174 extraction the sheet follows `training-readability.css` before all later component layers.',
    1,
)
position = text.find('Build 12.173 continues SW-020')
if position < 0:
    raise SystemExit('12.173 handoff note missing')
note = 'Build 12.174 continues SW-020 by moving the Build 12.135 training/development typography and programme-control floors into `css/training-readability.css`. Desktop and compact font sizes, the 40/46px select heights and the 1023px breakpoint are unchanged. The sheet follows `game.css` before the later training workflow and component layers. See `AUDIT-12.174.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.174 owns training/development typography floors and programme-control sizing in `css/training-readability.css`. Keep it immediately after `game.css`, before `training-programme.css`. Preserve the 40px desktop and 46px compact select heights, the 1023px breakpoint and the existing card/intro copy floors. Verify `typographyConsistencyForTest()`, `mobileInterfaceAuditForTest()`, `firstMatchGuidanceForTest()` and the CSS ownership gates. See `AUDIT-12.174.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.173 owns the training workflow wrapper and outstanding-programme accent state in `css/training-programme.css`. Keep it immediately after `game.css`, before `management-feedback.css`.',
    'Build 12.173 owns the training workflow wrapper and outstanding-programme accent state in `css/training-programme.css`. Keep it after `training-readability.css`, before `management-feedback.css`.',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# Strikewatch Source 12.173', '# Strikewatch Source 12.174', 1)
text = text.replace('dist/strikewatch-build-12.173.html', 'dist/strikewatch-build-12.174.html', 1)
readme.write_text(text, encoding='utf-8', newline='\n')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.174 continues the staged CSS ownership programme by moving the training
and development typography floors and programme-control sizing into
`css/training-readability.css` without changing selectors, declarations,
breakpoint or cascade order. See `HANDOFF.md` and `AUDIT-12.174.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

read_first = root / '00-READ-FIRST-GPT.md'
text = read_first.read_text(encoding='utf-8')
text = text.replace('Current release: **Strikewatch Build 12.173 — Training Programme CSS Ownership**.', 'Current release: **Strikewatch Build 12.174 — Training Readability CSS Ownership**.', 1)
read_first.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.174 — Training Readability CSS Ownership

- Moves the Build 12.135 training/development typography and programme-control sizing rules from `game.css` into `css/training-readability.css` without changing selectors, declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before training workflow and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.174.md`.

'''
if '## 12.174 — Training Readability CSS Ownership' not in text:
    text = header + entry + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.174.md').write_text('''# Build 12.174 — Training Readability CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.135 training/development readability layer for operator cards, programme controls, metrics and the development introduction.

## Change

The complete training/development readability block is removed from the tail of `css/game.css` and placed in `css/training-readability.css`. Selectors, declarations and the `max-width: 1023px` breakpoint are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The readability contract is unchanged. Training card labels, operator names, metadata, result notes, metrics and development-intro copy retain their desktop and compact floors. Programme selects remain 40px high on desktop and 46px below 1024px. Training assignment, draft saving, guided scrolling, gameplay and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. Existing compact and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the training-readability layer separately. The `game.css` budget falls from 31,300 to 31,275 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The training/development readability marker exists exactly once in `training-readability.css` and no longer exists in `game.css`.
- Desktop and compact card, select, metrics and introduction declarations remain present, including 40/46px programme-control heights.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `renderTrainingFacilityTab`, `typographyConsistencyForTest`, `mobileInterfaceAuditForTest` and `firstMatchGuidanceForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')
