from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.173'
name = 'Training Programme CSS Ownership'
build_id = '12.173.0-training-programme-css-ownership'


def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:160]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


replace('js/00-core.js', "const BUILD_VERSION = '12.172';", "const BUILD_VERSION = '12.173';")
replace('js/00-core.js', "const BUILD_NAME = 'Management Feedback CSS Ownership';", "const BUILD_NAME = 'Training Programme CSS Ownership';")
replace('js/00-core.js', "const BUILD_ID = '12.172.0-management-feedback-css-ownership';", "const BUILD_ID = '12.173.0-training-programme-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Build 12.139: training programme requirement'
position = css.find(marker)
if position < 0:
    raise SystemExit('Build 12.139 training-programme CSS marker missing')
block = css[position:].strip() + '\n'
if block.count('Build 12.139: training programme requirement') != 1:
    raise SystemExit('Unexpected duplicate training-programme marker')
required = (
    '.training-programmes-zone {',
    'display: grid',
    'gap: inherit',
    'align-content: start',
    'min-width: 0',
    '.training-programmes-zone.needs-programme .training-roster-panel',
    'border-left: 2px solid var(--accent)',
    '.training-programmes-zone.needs-programme .career-section-head > div > span',
    'color: var(--accent)',
)
if any(item not in block for item in required):
    raise SystemExit('Training-programme rule missing from extracted block')
if 'overflow:' in block:
    raise SystemExit('Training-programme wrapper must not clip overflow')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/training-programme.css').write_text(
    '/* Training programme workflow wrapper and outstanding-requirement ownership.\n'
    '   Extracted from game.css in Build 12.173 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.172: Management Feedback CSS Ownership', 'Strikewatch 12.173: Training Programme CSS Ownership')
text = text.replace('12.172.0-management-feedback-css-ownership', build_id)
text = text.replace('>12.172</b>', '>12.173</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.173.0-training-programme-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/training-programme.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.173.0-training-programme-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.173.0-training-programme-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.172 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    1,
)
text = text.replace(
    '        "owned_management_feedback_lines": texts["management-feedback.css"].count("\\n"),',
    '        "owned_training_programme_lines": texts["training-programme.css"].count("\\n"),\n        "owned_management_feedback_lines": texts["management-feedback.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31320', '"game_css_lines_max": 31300', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/management-feedback.css` | Management live-status surface and visible blocked/ready match-state presentation |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/training-programme.css` | Training workflow wrapper and outstanding-programme accent state |\n'
    '| `css/management-feedback.css` | Management live-status surface and visible blocked/ready match-state presentation |',
    1,
)
text = text.replace(
    'The current order is `game.css`, `management-feedback.css`,\n`compact-readability.css`, `reward-reveal.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.',
    'The current order is `game.css`, `training-programme.css`,\n`management-feedback.css`, `compact-readability.css`, `reward-reveal.css`,\n`armour-viewer.css`, `weapon-presentation.css`, `loadout-stills.css`,\n`12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.',
    1,
)
architecture.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.172 — Management Feedback CSS Ownership**', 'Build: **12.173 — Training Programme CSS Ownership**', 1)
text = text.replace('Build ID: `12.172.0-management-feedback-css-ownership`', 'Build ID: `12.173.0-training-programme-css-ownership`', 1)
text = text.replace('strikewatch-build-12.172.html', 'strikewatch-build-12.173.html', 1)
text = text.replace(
    'The sheet follows `game.css` before compact readability and all later component layers.',
    'The sheet follows `training-programme.css` before compact readability and all later component layers.',
    1,
)
position = text.find('Build 12.172 continues SW-020')
if position < 0:
    raise SystemExit('12.172 handoff note missing')
note = 'Build 12.173 continues SW-020 by moving the Build 12.139 training-programme wrapper and outstanding-requirement accent rules into `css/training-programme.css`. The wrapper remains an unclipped grid that keeps the save control with the roster; `.needs-programme` still adds the accent rail and requirement kicker. The declarations are unchanged, and the sheet follows `game.css` before all later component layers. See `AUDIT-12.173.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.173 owns the training workflow wrapper and outstanding-programme accent state in `css/training-programme.css`. Keep it immediately after `game.css`, before `management-feedback.css`. The wrapper must stay an unclipped grid that inherits the route gap, and `.needs-programme` must retain the accent rail and kicker. Verify `firstMatchGuidanceForTest()`, `mobileInterfaceAuditForTest()`, `guidanceConsolidationForTest()` and the CSS ownership gates. See `AUDIT-12.173.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.172 owns the management live-status banner and visible blocked/ready match-state presentation in `css/management-feedback.css`. Keep it immediately after `game.css`, before `compact-readability.css`.',
    'Build 12.172 owns the management live-status banner and visible blocked/ready match-state presentation in `css/management-feedback.css`. Keep it after `training-programme.css`, before `compact-readability.css`.',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# Strikewatch Source 12.172', '# Strikewatch Source 12.173', 1)
text = text.replace('dist/strikewatch-build-12.172.html', 'dist/strikewatch-build-12.173.html', 1)
readme.write_text(text, encoding='utf-8', newline='\n')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.173 continues the staged CSS ownership programme by moving the training
workflow wrapper and outstanding-programme accent state into
`css/training-programme.css` without changing selectors, declarations or cascade
order. See `HANDOFF.md` and `AUDIT-12.173.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

read_first = root / '00-READ-FIRST-GPT.md'
text = read_first.read_text(encoding='utf-8')
text = text.replace('Current release: **Strikewatch Build 12.172 — Management Feedback CSS Ownership**.', 'Current release: **Strikewatch Build 12.173 — Training Programme CSS Ownership**.', 1)
read_first.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.173 — Training Programme CSS Ownership

- Moves the Build 12.139 training-programme wrapper and outstanding-requirement accent rules from `game.css` into `css/training-programme.css` without changing selectors or declarations.
- Preserves the layer immediately after `game.css`, before management feedback and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.173.md`.

'''
if '## 12.173 — Training Programme CSS Ownership' not in text:
    text = header + entry + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.173.md').write_text('''# Build 12.173 — Training Programme CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.139 training workflow presentation that keeps the save control and roster together and makes an outstanding programme requirement visually explicit.

## Change

The complete Build 12.139 training-programme block is removed from the tail of `css/game.css` and placed in `css/training-programme.css`. Selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The workflow contract is unchanged. `.training-programmes-zone` remains an unclipped grid that inherits the route gap and keeps the draft/save bar with the roster panel. `.needs-programme` retains the accent rail and accent requirement kicker. Requirement-copy transitions, draft persistence, training progression, guided scrolling, gameplay and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. No cross-release behavioural invariant changes, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the training-programme layer separately. The `game.css` budget falls from 31,320 to 31,300 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.139 training marker exists exactly once in `training-programme.css` and no longer exists in `game.css`.
- The unclipped grid wrapper, inherited gap, accent rail and accent kicker declarations remain present.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `renderTrainingFacilityTab`, `workflowSaveTrainingDrafts`, `firstMatchGuidanceForTest`, `mobileInterfaceAuditForTest` and `guidanceConsolidationForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')
