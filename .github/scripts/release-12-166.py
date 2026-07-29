from pathlib import Path
import json

root = Path('strikewatch-source')
version = '12.166'
name = 'Armoury CSS Ownership'
build_id = '12.166.0-armoury-css-ownership'

def replace(path, old, new, count=1):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:100]!r}')
    target.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')

replace(Path('js/00-core.js'), "const BUILD_VERSION = '12.165';", "const BUILD_VERSION = '12.166';")
replace(Path('js/00-core.js'), "const BUILD_NAME = 'CSS Ownership Baseline';", "const BUILD_NAME = 'Armoury CSS Ownership';")
replace(Path('js/00-core.js'), "const BUILD_ID = '12.165.0-css-ownership-baseline';", "const BUILD_ID = '12.166.0-armoury-css-ownership';")
(root / 'RELEASE.json').write_text(json.dumps({'version': version, 'name': name, 'build_id': build_id}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Build 12.157: compact Armoury inventory reflow'
position = css.find(marker)
if position < 0:
    raise SystemExit('Build 12.157 Armoury CSS marker missing')
block = css[position:].strip() + '\n'
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/armoury-inventory.css').write_text(
    '/* Compact Armoury inventory ownership.\n'
    '   Extracted from game.css in Build 12.166 without changing declarations. */\n\n' + block,
    encoding='utf-8', newline='\n'
)

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.165: CSS Ownership Baseline', 'Strikewatch 12.166: Armoury CSS Ownership')
text = text.replace('12.165.0-css-ownership-baseline', build_id)
text = text.replace('>12.165</b>', '>12.166</b>')
old_links = '''<link rel="stylesheet" href="css/game.css?v=12.166.0-armoury-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.166.0-armoury-css-ownership" />'''
new_links = '''<link rel="stylesheet" href="css/game.css?v=12.166.0-armoury-css-ownership" />
<link rel="stylesheet" href="css/12.161-audit-fixes.css?v=12.166.0-armoury-css-ownership" />
<link rel="stylesheet" href="css/armoury-inventory.css?v=12.166.0-armoury-css-ownership" />
<link rel="stylesheet" href="css/compact-navigation.css?v=12.166.0-armoury-css-ownership" />'''
if old_links not in text:
    raise SystemExit('Expected authoritative 12.165 stylesheet sequence missing')
index.write_text(text.replace(old_links, new_links, 1), encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "compact-navigation.css")',
    'CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")', 1)
text = text.replace(
    '        "owned_compact_navigation_lines": texts["compact-navigation.css"].count("\\n"),',
    '        "owned_armoury_inventory_lines": texts["armoury-inventory.css"].count("\\n"),\n        "owned_compact_navigation_lines": texts["compact-navigation.css"].count("\\n"),', 1)
text = text.replace('"game_css_lines_max": 31700', '"game_css_lines_max": 31560', 1)
old_regex = '''        r'<link rel="stylesheet" href="css/game\\.css\\?v=[^"]+"\\s*/>\\s*<link rel="stylesheet" href="css/compact-navigation\\.css\\?v=[^"]+"\\s*/>',
        lambda _match: '<style>\\n' + release_css + '\\n</style>',
        html,
        count=1,
    )'''
new_regex = '''        r'<link rel="stylesheet" href="css/game\\.css\\?v=[^"]+"\\s*/>\\s*<link rel="stylesheet" href="css/12\\.161-audit-fixes\\.css\\?v=[^"]+"\\s*/>\\s*<link rel="stylesheet" href="css/armoury-inventory\\.css\\?v=[^"]+"\\s*/>\\s*<link rel="stylesheet" href="css/compact-navigation\\.css\\?v=[^"]+"\\s*/>',
        lambda _match: '<style>\\n' + release_css + '\\n</style>',
        html,
        count=1,
    )'''
if old_regex not in text:
    raise SystemExit('Standalone stylesheet replacement block missing')
text = text.replace(old_regex, new_regex, 1)
script_block = '''    html = re.sub(
        r'<script src="js/strikewatch\\.dev\\.js\\?v=[^"]+"></script>',
        lambda _match: '<script>\\n' + release_bundle.rstrip() + '\\n</script>',
        html,
        count=1,
    )
'''
if script_block not in text:
    raise SystemExit('Standalone JavaScript replacement block missing')
text = text.replace(script_block, script_block + '''    if re.search(r'<link rel="stylesheet" href="css/', html):
        raise RuntimeError("Standalone retained an external development stylesheet")
''', 1)
build.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.165 — CSS Ownership Baseline**', 'Build: **12.166 — Armoury CSS Ownership**', 1)
text = text.replace('Build ID: `12.165.0-css-ownership-baseline`', 'Build ID: `12.166.0-armoury-css-ownership`', 1)
text = text.replace('strikewatch-build-12.165.html', 'strikewatch-build-12.166.html', 1)
position = text.find('Build 12.165 begins the staged CSS-debt cleanup')
if position < 0:
    raise SystemExit('Build 12.165 handoff note missing')
note = 'Build 12.166 continues the staged CSS ownership programme by moving the audited compact Armoury inventory layer into `css/armoury-inventory.css`. It also makes development and standalone stylesheet order identical and fails the build if a development stylesheet link survives standalone inlining. See `AUDIT-12.166.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.166 owns compact Armoury inventory layout in `css/armoury-inventory.css`, ordered after `12.161-audit-fixes.css` and before `compact-navigation.css`. The development link order and `CSS_PATHS` order must match, and standalone output must contain no external `css/` stylesheet link. See `AUDIT-12.166.md`.\n\n'
agents.write_text(text.replace(anchor, anchor + note, 1), encoding='utf-8', newline='\n')

for filename in ['README.md', 'PROJECT.md', '00-READ-FIRST-GPT.md']:
    path = root / filename
    path.write_text(path.read_text(encoding='utf-8').replace('12.165', '12.166', 1), encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
entry = '''## 12.166 — Armoury CSS Ownership

- Moves the audited compact Armoury inventory rules from `game.css` into `css/armoury-inventory.css` without changing declarations.
- Aligns development stylesheet order with standalone concatenation and fails the build if any development CSS link remains in the standalone.
- Tightens the `game.css` line budget while preserving total `!important` and media-query budgets.
- See `AUDIT-12.166.md`.

'''
changelog.write_text(text.replace('# Strikewatch changelog\n', '# Strikewatch changelog\n\n' + entry, 1), encoding='utf-8', newline='\n')

(root / 'AUDIT-12.166.md').write_text('''# Build 12.166 — Armoury CSS Ownership

## Audit item

Continues SW-020 as a staged ownership programme rather than a wholesale cascade rewrite. The next bounded component is the compact Armoury inventory layer audited in Build 12.157.

## Change

The complete Build 12.157 compact Armoury block is removed from the tail of `css/game.css` and placed in `css/armoury-inventory.css`. Selectors and declarations are unchanged. Its effective order remains after the 12.161 audit layer and before the later compact-navigation layer.

Build 12.165 exposed a development/build parity defect: `CSS_PATHS` included `12.161-audit-fixes.css`, so standalone output contained that layer, but `index.html` omitted the stylesheet entirely. Development and standalone could therefore resolve different cascades. Build 12.166 makes the four-file order explicit in both places and fails if any external `css/` link survives standalone generation.

## Debt guardrails

The CSS report now records the Armoury-owned layer separately. The `game.css` budget is reduced to 31,560 lines; existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.157 marker exists exactly once in `armoury-inventory.css` and no longer exists in `game.css`.
- Development and build stylesheet orders are identical.
- Standalone output contains no external development stylesheet links.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
''', encoding='utf-8', newline='\n')