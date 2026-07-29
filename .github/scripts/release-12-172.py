from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.172'
name = 'Management Feedback CSS Ownership'
build_id = '12.172.0-management-feedback-css-ownership'


def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:160]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')


replace('js/00-core.js', "const BUILD_VERSION = '12.171';", "const BUILD_VERSION = '12.172';")
replace('js/00-core.js', "const BUILD_NAME = 'Compact Readability CSS Ownership';", "const BUILD_NAME = 'Management Feedback CSS Ownership';")
replace('js/00-core.js', "const BUILD_ID = '12.171.0-compact-readability-css-ownership';", "const BUILD_ID = '12.172.0-management-feedback-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Build 12.140: management status surface and match-control state'
position = css.find(marker)
if position < 0:
    raise SystemExit('Build 12.140 management-feedback CSS marker missing')
block = css[position:].strip() + '\n'
if block.count('Build 12.140: management status surface and match-control state') != 1:
    raise SystemExit('Unexpected duplicate management-feedback marker')
required = (
    '.management-status {',
    '.management-status.show',
    ".management-status[data-tone='blocked']",
    '.management-status > i::after',
    '.management-status > p',
    '.management-status > button',
    '@media (max-width: 1023px)',
    '.manager-topbar-action-state {',
    '.manager-match-btn.blocked',
    '.manager-match-btn:not(.blocked)',
)
if any(item not in block for item in required):
    raise SystemExit('Management-feedback rule missing from extracted block')
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/management-feedback.css').write_text(
    '/* Management live-status surface and visible match-state ownership.\n'
    '   Extracted from game.css in Build 12.172 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.171: Compact Readability CSS Ownership', 'Strikewatch 12.172: Management Feedback CSS Ownership')
text = text.replace('12.171.0-compact-readability-css-ownership', build_id)
text = text.replace('>12.171</b>', '>12.172</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.172.0-management-feedback-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/management-feedback.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/compact-readability.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/reward-reveal.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/armour-viewer.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/weapon-presentation.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/loadout-stills.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.172.0-management-feedback-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.172.0-management-feedback-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected 12.171 stylesheet sequence missing from index.html')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")',
    1,
)
text = text.replace(
    '        "owned_compact_readability_lines": texts["compact-readability.css"].count("\\n"),',
    '        "owned_management_feedback_lines": texts["management-feedback.css"].count("\\n"),\n        "owned_compact_readability_lines": texts["compact-readability.css"].count("\\n"),',
    1,
)
text = text.replace('"game_css_lines_max": 31405', '"game_css_lines_max": 31320', 1)
build.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
text = text.replace(
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/compact-readability.css` | Compact 12px management typography floors for dates, locks, access and action state |',
    '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n'
    '| `css/management-feedback.css` | Management live-status surface and visible blocked/ready match-state presentation |\n'
    '| `css/compact-readability.css` | Compact 12px management typography floors for dates, locks, access and action state |',
    1,
)
text = text.replace(
    'The current order is `game.css`, `compact-readability.css`,\n`reward-reveal.css`, `armour-viewer.css`, `weapon-presentation.css`,\n`loadout-stills.css`, `12.161-audit-fixes.css`, `armoury-inventory.css`, then\n`compact-navigation.css`.',
    'The current order is `game.css`, `management-feedback.css`,\n`compact-readability.css`, `reward-reveal.css`, `armour-viewer.css`,\n`weapon-presentation.css`, `loadout-stills.css`, `12.161-audit-fixes.css`,\n`armoury-inventory.css`, then `compact-navigation.css`.',
    1,
)
architecture.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.171 — Compact Readability CSS Ownership**', 'Build: **12.172 — Management Feedback CSS Ownership**', 1)
text = text.replace('Build ID: `12.171.0-compact-readability-css-ownership`', 'Build ID: `12.172.0-management-feedback-css-ownership`', 1)
text = text.replace('strikewatch-build-12.171.html', 'strikewatch-build-12.172.html', 1)
text = text.replace(
    'The sheet follows `game.css` before all later component layers.',
    'The sheet follows `management-feedback.css` before all later component layers.',
    1,
)
position = text.find('Build 12.171 continues SW-020')
if position < 0:
    raise SystemExit('12.171 handoff note missing')
note = 'Build 12.172 continues SW-020 by moving the complete Build 12.140 management live-status surface and visible match-control state into `css/management-feedback.css`. The banner positioning, compact safe-area offset, blocked tone, entry transition and blocked/ready state colours are unchanged. The sheet follows `game.css` before compact readability and all later component layers. See `AUDIT-12.172.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.172 owns the management live-status banner and visible blocked/ready match-state presentation in `css/management-feedback.css`. Keep it immediately after `game.css`, before `compact-readability.css`. The live region must remain above compact navigation, dismissible, and visible for repeated refusals; the match control must retain its visible state line and blocked/ready colours. Verify `managementStatusForTest()`, `showManagementStatusForTest()`, `typographyConsistencyForTest()` and `mobileInterfaceAuditForTest()` alongside the CSS ownership gates. See `AUDIT-12.172.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
text = text.replace(
    'Build 12.171 owns the compact 12px management typography floors in `css/compact-readability.css`. Keep it immediately after `game.css`, before `reward-reveal.css`.',
    'Build 12.171 owns the compact 12px management typography floors in `css/compact-readability.css`. Keep it after `management-feedback.css`, before `reward-reveal.css`.',
    1,
)
agents.write_text(text, encoding='utf-8', newline='\n')

readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('# Strikewatch Source 12.171', '# Strikewatch Source 12.172', 1)
text = text.replace('dist/strikewatch-build-12.171.html', 'dist/strikewatch-build-12.172.html', 1)
readme.write_text(text, encoding='utf-8', newline='\n')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
start = text.index('## Current release\n')
end = text.index('\nHistorical architecture narratives', start)
current = '''## Current release

Build 12.172 continues the staged CSS ownership programme by moving the
management live-status surface and visible blocked/ready match-state presentation
into `css/management-feedback.css` without changing selectors, declarations or
cascade order. See `HANDOFF.md` and `AUDIT-12.172.md`.
'''
project.write_text(text[:start] + current + text[end:], encoding='utf-8', newline='\n')

read_first = root / '00-READ-FIRST-GPT.md'
text = read_first.read_text(encoding='utf-8')
text = text.replace('Current release: **Strikewatch Build 12.171 — Compact Readability CSS Ownership**.', 'Current release: **Strikewatch Build 12.172 — Management Feedback CSS Ownership**.', 1)
read_first.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''
## 12.172 — Management Feedback CSS Ownership

- Moves the complete Build 12.140 management live-status surface and visible blocked/ready match-state rules from `game.css` into `css/management-feedback.css` without changing selectors or declarations.
- Preserves the layer immediately after `game.css`, before compact readability and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.172.md`.

'''
if '## 12.172 — Management Feedback CSS Ownership' not in text:
    text = header + entry + text[len(header):]
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.172.md').write_text('''# Build 12.172 — Management Feedback CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the complete Build 12.140 management feedback layer: the menu live-status surface plus the visible match-control availability state.

## Change

The complete Build 12.140 management-feedback block is removed from the tail of `css/game.css` and placed in `css/management-feedback.css`. Selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The behaviour contract is unchanged. Management-context `showStatus()` messages remain mirrored into a dismissible polite live region above compact navigation. Repeated refusals still restart the entry transition. The visible match-state line retains its blocked opacity and blocked/ready colours. Match launch routing, status strings, dismiss timing, gameplay and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. The existing `CONTRACTS.md` stylesheet-order, compact-target and visible-feedback invariants remain sufficient and are unchanged.

## Debt guardrails

The CSS report records the management-feedback layer separately. The `game.css` budget falls from 31,405 to 31,320 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.140 management-feedback marker exists exactly once in `management-feedback.css` and no longer exists in `game.css`.
- The live-status surface, compact offset, blocked tone, entry state and visible match-state selectors remain present.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `managementStatusForTest`, `showManagementStatusForTest`, `careerMatchLaunchState`, `typographyConsistencyForTest` and `mobileInterfaceAuditForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')
