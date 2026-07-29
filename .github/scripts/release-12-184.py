from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.184'
name = 'Economy Guide CSS Ownership'
build_id = '12.184.0-economy-guide-css-ownership'


def replace_once(path, old, new):
    target = root / path
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one occurrence, found {count}: {old[:180]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')


expected_release = {
    'version': '12.183',
    'name': 'Surface Blood & Inbox CSS Ownership',
    'build_id': '12.183.0-surface-blood-inbox-css-ownership',
}
current_release = json.loads((root / 'RELEASE.json').read_text(encoding='utf-8'))
if current_release != expected_release:
    raise SystemExit(f'Authoritative release moved; expected {expected_release}, got {current_release}')

replace_once('js/00-core.js', "const BUILD_VERSION = '12.183';", "const BUILD_VERSION = '12.184';")
replace_once('js/00-core.js', "const BUILD_NAME = 'Surface Blood & Inbox CSS Ownership';", "const BUILD_NAME = 'Economy Guide CSS Ownership';")
replace_once('js/00-core.js', "const BUILD_ID = '12.183.0-surface-blood-inbox-css-ownership';", "const BUILD_ID = '12.184.0-economy-guide-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({
    'version': version,
    'name': name,
    'build_id': build_id,
}, indent=2) + '\n', encoding='utf-8', newline='\n')

# Extract the complete current EOF block. It originally preceded the Inbox block,
# so the new owner is inserted after game.css and before inbox-scroll.css.
game_path = root / 'css/game.css'
game = game_path.read_text(encoding='utf-8')
marker = '/* --- After-action rewards / economy guide typography --- */'
position = game.find(marker)
if position < 0:
    raise SystemExit('Economy guide marker missing')
block = game[position:].strip() + '\n'
required = (
    marker,
    '.club-economy-guide > header > span { font-size: 10px !important; }',
    '.club-economy-guide > header > strong { font-size: 15px !important; }',
    '.club-economy-guide > header > p { font-size: 11px !important; line-height: 1.55 !important; }',
    '.club-economy-guide article > span { font-size: 9.5px !important; letter-spacing: .1em !important; }',
    '.club-economy-guide article > strong { font-size: 17px !important; }',
    '.club-economy-guide article > b { font-size: 11px !important; line-height: 1.4 !important; }',
    '.club-economy-guide article > p { font-size: 11px !important; line-height: 1.55 !important; }',
    '.club-economy-guide > aside { font-size: 11px !important; line-height: 1.5 !important; }',
    '@media (max-width: 1023px)',
    'grid-template-columns: repeat(2, minmax(0, 1fr)) !important;',
    '.club-economy-guide > header > strong { font-size: 17px !important; }',
    '.club-economy-guide > header > p { font-size: 13px !important; }',
    '.club-economy-guide article > strong { font-size: 19px !important; }',
    '.club-economy-guide article > b { font-size: 13px !important; }',
    '.club-economy-guide article > p { font-size: 12px !important; line-height: 1.55 !important; }',
    '.club-economy-guide > aside { font-size: 12px !important; }',
    '@media (max-width: 560px)',
    '.club-economy-guide > div { grid-template-columns: 1fr !important; }',
)
missing = [item for item in required if item not in block]
if missing:
    raise SystemExit(f'Economy guide declarations missing: {missing}')
if block.count(marker) != 1:
    raise SystemExit('Unexpected economy guide marker count')
if block.count('@media (max-width: 1023px)') != 1 or block.count('@media (max-width: 560px)') != 1:
    raise SystemExit('Unexpected economy guide media-query count')
if not block.rstrip().endswith('}'):
    raise SystemExit('Economy guide block does not end cleanly')
game_path.write_text(game[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/economy-guide.css').write_text(
    '/* After-action rewards and economy-guide presentation ownership.\n'
    '   Extracted from the Build 12.133 tail in Build 12.184 without changing declarations. */\n\n'
    + block,
    encoding='utf-8', newline='\n',
)

index_path = root / 'index.html'
text = index_path.read_text(encoding='utf-8')
if text.count('>12.183</b>') != 2:
    raise SystemExit('Expected exactly two visible 12.183 build labels')
text = text.replace('Strikewatch 12.183: Surface Blood & Inbox CSS Ownership', 'Strikewatch 12.184: Economy Guide CSS Ownership', 1)
text = text.replace('12.183.0-surface-blood-inbox-css-ownership', build_id)
text = text.replace('>12.183</b>', '>12.184</b>')
game_link = '<link rel="stylesheet" href="css/game.css?v=12.184.0-economy-guide-css-ownership" />'
economy_link = '<link rel="stylesheet" href="css/economy-guide.css?v=12.184.0-economy-guide-css-ownership" />'
if text.count(game_link) != 1 or economy_link in text:
    raise SystemExit('Unexpected index stylesheet insertion state')
index_path.write_text(text.replace(game_link, game_link + '\n' + economy_link, 1), encoding='utf-8', newline='\n')

build_path = root / 'build.py'
text = build_path.read_text(encoding='utf-8')
old_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "inbox-scroll.css",'
new_paths = 'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "economy-guide.css", ROOT / "css" / "inbox-scroll.css",'
if text.count(old_paths) != 1:
    raise SystemExit('Expected 12.183 CSS_PATHS prefix missing')
text = text.replace(old_paths, new_paths, 1)
old_metric = '        "owned_inbox_scroll_lines": texts["inbox-scroll.css"].count("\\n"),'
new_metric = '        "owned_economy_guide_lines": texts["economy-guide.css"].count("\\n"),\n        "owned_inbox_scroll_lines": texts["inbox-scroll.css"].count("\\n"),'
if text.count(old_metric) != 1:
    raise SystemExit('CSS debt metric insertion point missing')
text = text.replace(old_metric, new_metric, 1)
if text.count('"game_css_lines_max": 30810') != 1:
    raise SystemExit('12.183 game.css budget missing')
text = text.replace('"game_css_lines_max": 30810', '"game_css_lines_max": 30785', 1)
build_path.write_text(text, encoding='utf-8', newline='\n')

architecture = root / 'ARCHITECTURE.md'
text = architecture.read_text(encoding='utf-8')
old_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/inbox-scroll.css` | Inbox nested-scroll arming, overscroll containment and overflow mask |'
new_owner = '| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |\n| `css/economy-guide.css` | After-action reward/economy typography and compact card reflow |\n| `css/inbox-scroll.css` | Inbox nested-scroll arming, overscroll containment and overflow mask |'
if text.count(old_owner) != 1:
    raise SystemExit('Architecture owner insertion point missing')
text = text.replace(old_owner, new_owner, 1)
old_order = 'The current order is `game.css`, `inbox-scroll.css`, `operator-portrait.css`, `command-chrome.css`,'
new_order = 'The current order is `game.css`, `economy-guide.css`, `inbox-scroll.css`, `operator-portrait.css`, `command-chrome.css`,'
if text.count(old_order) != 1:
    raise SystemExit('Architecture order insertion point missing')
architecture.write_text(text.replace(old_order, new_order, 1), encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.183 — Surface Blood & Inbox CSS Ownership**', 'Build: **12.184 — Economy Guide CSS Ownership**', 1)
text = text.replace('Build ID: `12.183.0-surface-blood-inbox-css-ownership`', 'Build ID: `12.184.0-economy-guide-css-ownership`', 1)
text = text.replace('strikewatch-build-12.183.html', 'strikewatch-build-12.184.html', 1)
old_note = 'Build 12.183 adds bounded wall blood splatters when real health damage lands with a solid surface within 1.25m behind the struck operator. The continuation ray reuses `castRay`, splatters stay in the dynamic pass, cap at 18 and clear on round reset. The same release continues SW-020 by moving the Build 12.133 Inbox scroll arming and overflow mask into `css/inbox-scroll.css` immediately after `game.css`. See `AUDIT-12.183.md`.'
new_note = 'Build 12.184 continues SW-020 by moving the complete Build 12.133 after-action reward and economy-guide typography into `css/economy-guide.css`. Desktop type, the two-column compact grid, the single-column phone grid and all 9.5–19px authored floors remain unchanged. The sheet follows `game.css` before Inbox and every later component layer; the later `compact-readability.css` 12px metadata floor still wins below 1024px. See `AUDIT-12.184.md`.\n\nBuild 12.183 adds bounded wall blood splatters when real health damage lands with a solid surface within 1.25m behind the struck operator. The continuation ray reuses `castRay`, splatters stay in the dynamic pass, cap at 18 and clear on round reset. The same release continues SW-020 by moving the Build 12.133 Inbox scroll arming and overflow mask into `css/inbox-scroll.css`. After the 12.184 extraction, the Inbox sheet follows `economy-guide.css` before operator portraits and all later component layers. See `AUDIT-12.183.md`.'
if text.count(old_note) != 1:
    raise SystemExit('12.183 HANDOFF note missing')
handoff.write_text(text.replace(old_note, new_note, 1), encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.184 owns after-action reward and economy-guide presentation in `css/economy-guide.css`. Keep it immediately after `game.css`, before `inbox-scroll.css`. Preserve the desktop 9.5–17px metadata/value hierarchy, 11px explanatory copy, 1023px two-column reflow, 560px single-column reflow and the later `compact-readability.css` 12px metadata override. Verify `economyGuidanceForTest()`, `firstMatchPayoffForTest()`, `typographyConsistencyForTest()`, `mobileInterfaceAuditForTest()` and the computed-style economy probe. See `AUDIT-12.184.md`.\n\n'
if text.count(anchor) != 1:
    raise SystemExit('AGENTS current release anchor missing')
text = text.replace(anchor, anchor + note, 1)
old_agent = 'Build 12.183 owns Inbox nested-scroll presentation in `css/inbox-scroll.css`; keep it immediately after `game.css`, before `operator-portrait.css`,'
new_agent = 'Build 12.183 owns Inbox nested-scroll presentation in `css/inbox-scroll.css`; keep it after `economy-guide.css`, before `operator-portrait.css`,'
if text.count(old_agent) != 1:
    raise SystemExit('12.183 AGENTS order note missing')
agents.write_text(text.replace(old_agent, new_agent, 1), encoding='utf-8', newline='\n')

replace_once('README.md', '# Strikewatch Source 12.183', '# Strikewatch Source 12.184')
replace_once('README.md', 'dist/strikewatch-build-12.183.html', 'dist/strikewatch-build-12.184.html')

project = root / 'PROJECT.md'
text = project.read_text(encoding='utf-8')
old_current = '''Build 12.183 adds bounded nearby-wall blood splatters to real body hits and\ncontinues the staged CSS ownership programme by moving Inbox scroll arming into\n`css/inbox-scroll.css` without changing its declarations. See `HANDOFF.md` and\n`AUDIT-12.183.md`.'''
new_current = '''Build 12.184 continues the staged CSS ownership programme by moving the\nafter-action reward and economy-guide typography/reflow into\n`css/economy-guide.css` without changing declarations or breakpoints. See\n`HANDOFF.md` and `AUDIT-12.184.md`.'''
if text.count(old_current) != 1:
    raise SystemExit('PROJECT current release paragraph missing')
project.write_text(text.replace(old_current, new_current, 1), encoding='utf-8', newline='\n')

replace_once('00-READ-FIRST-GPT.md', 'Current release: **Strikewatch Build 12.183 — Surface Blood & Inbox CSS Ownership**.', 'Current release: **Strikewatch Build 12.184 — Economy Guide CSS Ownership**.')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
header = '# Release history router\n'
entry = '''\n## 12.184 — Economy Guide CSS Ownership\n\n- Moves the complete Build 12.133 after-action reward and economy-guide typography/reflow block from `game.css` into `css/economy-guide.css` without changing declarations or breakpoints.\n- Preserves the layer immediately after `game.css`, before Inbox scroll and all later presentation layers.\n- Keeps the desktop hierarchy, the two-column compact layout below 1024px and the one-column phone layout below 561px.\n- Retains the later `compact-readability.css` 12px floor for economy metadata on compact screens.\n- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.\n- Evidence: `AUDIT-12.184.md`.\n\n'''
if not text.startswith(header):
    raise SystemExit('CHANGELOG header missing')
changelog.write_text(header + entry + text[len(header):], encoding='utf-8', newline='\n')

(root / 'AUDIT-12.184.md').write_text('''# Build 12.184 — Economy Guide CSS Ownership\n\n## Audit item\n\nContinues SW-020 component by component. After the Inbox extraction, the next bounded EOF section is the Build 12.133 after-action reward and economy guide presentation.\n\n## Change\n\nThe complete `After-action rewards / economy guide typography` section is removed from the tail of `css/game.css` and placed in `css/economy-guide.css`. Selectors, declarations and both responsive breakpoints are unchanged. The new sheet loads immediately after `game.css`, before `inbox-scroll.css`, preserving the section's former cascade position.\n\nThe desktop hierarchy remains unchanged: 10px header kicker, 15px title, 11px header/body/aside copy, 9.5px article metadata, 17px article value and the existing line heights and letter spacing. Below 1024px, the card area remains a two-column grid with an 8px gap, header/body copy grows to its authored compact sizes and article values remain 19px. Below 561px, the card area remains a single column.\n\nThe later `compact-readability.css` layer still raises `#menuContent .club-economy-guide article > span` to the established 12px compact floor. This ordering is deliberate and verified. No reward calculation, Club Cash, Gold Coins, payout, finance ledger, post-match settlement, gameplay, persistence, save schema or diagnostics schema changes.\n\n## Documentation\n\n`ARCHITECTURE.md` records the new owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the operational order and regression hooks. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing stylesheet-order, compact-layout and economy invariants remain sufficient, so `CONTRACTS.md` is intentionally unchanged.\n\n## Debt guardrails\n\nThe CSS report records the economy-guide layer separately. The `game.css` budget falls from 30,810 to 30,785 lines. Existing `!important` and media-query budgets do not increase.\n\n## Verification\n\n- `python3 -m py_compile build.py` passes.\n- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.\n- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.\n- The economy marker is absent from `game.css` and present exactly once in `economy-guide.css`.\n- Representative desktop, 1023px and 560px declarations remain present.\n- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.\n- Standalone output contains no external development stylesheet links.\n- Headless Chromium computed-style probes confirm the desktop type hierarchy, the two-column compact layout, the single-column phone layout and the later 12px compact metadata floor.\n- The generated bundle retains `economyGuidanceForTest`, `firstMatchPayoffForTest`, `typographyConsistencyForTest`, `mobileInterfaceAuditForTest` and `renderRouteForTest`.\n- CSS debt remains within budget.\n- Root `cod.html` is byte-identical to the standalone.\n- Save schema 19 and diagnostics schema 1 are unchanged.\n\nThis release is an ownership-only extraction. No manual live-browser play session is claimed; browser evidence is the automated computed-style probe plus deterministic builds, parse gates, retained hooks and artifact identity.\n''', encoding='utf-8', newline='\n')
