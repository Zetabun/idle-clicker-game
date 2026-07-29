from pathlib import Path
import json

root = Path('strikewatch-source')

def replace(path, old, new, count=1):
    p = root / path
    text = p.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:100]!r}')
    p.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')

replace(Path('js/00-core.js'), "const BUILD_VERSION = '12.164';", "const BUILD_VERSION = '12.165';")
replace(Path('js/00-core.js'), "const BUILD_NAME = 'Lean Standalone';", "const BUILD_NAME = 'CSS Ownership Baseline';")
replace(Path('js/00-core.js'), "const BUILD_ID = '12.164.0-lean-standalone';", "const BUILD_ID = '12.165.0-css-ownership-baseline';")

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.164: Lean Standalone', 'Strikewatch 12.165: CSS Ownership Baseline')
text = text.replace('12.164.0-lean-standalone', '12.165.0-css-ownership-baseline')
text = text.replace('>12.164</b>', '>12.165</b>')
link = '<link rel="stylesheet" href="css/game.css?v=12.165.0-css-ownership-baseline" />'
text = text.replace(link, link + '\n<link rel="stylesheet" href="css/compact-navigation.css?v=12.165.0-css-ownership-baseline" />', 1)
index.write_text(text, encoding='utf-8', newline='\n')

(root / 'RELEASE.json').write_text(json.dumps({
    'version': '12.165',
    'name': 'CSS Ownership Baseline',
    'build_id': '12.165.0-css-ownership-baseline'
}, indent=2) + '\n', encoding='utf-8', newline='\n')

css_path = root / 'css/game.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* --- Build 12.163: compact navigator and alert alignment'
position = css.find(marker)
if position < 0:
    raise SystemExit('Build 12.163 compact CSS marker missing')
block = css[position:].strip() + '\n'
css_path.write_text(css[:position].rstrip() + '\n', encoding='utf-8', newline='\n')
(root / 'css/compact-navigation.css').write_text(
    '/* Compact club navigation and fixed management-alert ownership.\n'
    '   Extracted from game.css in Build 12.165 without changing cascade order. */\n\n' + block,
    encoding='utf-8', newline='\n'
)

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace(
    'BUNDLE_PATH = ROOT / "js" / "strikewatch.dev.js"\n',
    'BUNDLE_PATH = ROOT / "js" / "strikewatch.dev.js"\nCSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "compact-navigation.css")\n', 1
)
text = text.replace(
'''    css_path = ROOT / "css" / "game.css"
    release_css_path = ROOT / "css" / "12.161-audit-fixes.css"
    index_path = ROOT / "index.html"
    if not css_path.exists() or not index_path.exists():
        raise FileNotFoundError("index.html or css/game.css is missing")
''',
'''    index_path = ROOT / "index.html"
    if not all(path.exists() for path in CSS_PATHS) or not index_path.exists():
        raise FileNotFoundError("index.html or an ordered CSS source is missing")
''', 1)
text = text.replace(
'''    css = css_path.read_text(encoding="utf-8").rstrip() + "\n\n" + release_css_path.read_text(encoding="utf-8").rstrip()
''',
'''    css_sources = [path.read_text(encoding="utf-8").rstrip() for path in CSS_PATHS]
    css = "\n\n".join(css_sources)
''', 1)
text = text.replace(
'''    html = re.sub(
        r'<link rel="stylesheet" href="css/game\.css\?v=[^"]+"\s*/>',
        lambda _match: '<style>\n' + release_css + '\n</style>',
        html,
        count=1,
    )
''',
'''    html = re.sub(
        r'<link rel="stylesheet" href="css/game\.css\?v=[^"]+"\s*/>\s*<link rel="stylesheet" href="css/compact-navigation\.css\?v=[^"]+"\s*/>',
        lambda _match: '<style>\n' + release_css + '\n</style>',
        html,
        count=1,
    )
''', 1)
report_fn = '''

def css_debt_report(version: str) -> dict:
    texts = {path.name: path.read_text(encoding="utf-8") for path in CSS_PATHS}
    combined = "\n".join(texts.values())
    report = {
        "version": version,
        "stylesheets": len(texts),
        "total_lines": sum(value.count("\n") for value in texts.values()),
        "game_css_lines": texts["game.css"].count("\n"),
        "important_declarations": combined.count("!important"),
        "media_queries": combined.count("@media"),
        "owned_compact_navigation_lines": texts["compact-navigation.css"].count("\n"),
    }
    budgets = {
        "game_css_lines_max": 31700,
        "important_declarations_max": 2182,
        "media_queries_max": 474,
    }
    report["budgets"] = budgets
    report["within_budget"] = (
        report["game_css_lines"] <= budgets["game_css_lines_max"]
        and report["important_declarations"] <= budgets["important_declarations_max"]
        and report["media_queries"] <= budgets["media_queries_max"]
    )
    return report
'''
text = text.replace('\ndef main() -> None:\n', report_fn + '\ndef main() -> None:\n', 1)
text = text.replace(
'''    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    if report["javascript_raw_reduction_percent"] < 2.5:
''',
'''    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    css_report = css_debt_report(version)
    css_report_path = ROOT / "dist" / f"strikewatch-build-{version}-css-debt.json"
    css_report_path.write_text(json.dumps(css_report, indent=2) + "\n", encoding="utf-8", newline="\n")
    if not css_report["within_budget"]:
        raise RuntimeError(f"CSS debt budget exceeded: {css_report}")
    if report["javascript_raw_reduction_percent"] < 2.5:
''', 1)
text = text.replace('    print(f"Release size report: {report_path}")\n', '    print(f"Release size report: {report_path}")\n    print(f"CSS debt report: {css_report_path}")\n', 1)
build.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.164 — Lean Standalone**', 'Build: **12.165 — CSS Ownership Baseline**', 1)
text = text.replace('Build ID: `12.164.0-lean-standalone`', 'Build ID: `12.165.0-css-ownership-baseline`', 1)
text = text.replace('strikewatch-build-12.164.html', 'strikewatch-build-12.165.html', 1)
position = text.find('Build 12.164')
note = 'Build 12.165 begins the staged CSS-debt cleanup by moving the compact navigator and mobile management-alert rules out of the 31k-line monolith into `css/compact-navigation.css` while preserving their final cascade position. The build now emits and enforces a CSS-debt report. See `AUDIT-12.165.md`.\n\n'
text = text[:position] + note + text[position:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
anchor = '## Current release note\n\n'
note = 'Build 12.165 owns the first CSS boundary: compact navigation and the phone management alert live in `css/compact-navigation.css`, loaded after the legacy and 12.161 layers. Do not move them back into `game.css`. Keep the CSS debt report within budget and preserve stylesheet order. See `AUDIT-12.165.md`.\n\n'
text = text.replace(anchor, anchor + note, 1)
agents.write_text(text, encoding='utf-8', newline='\n')

for name in ['README.md', 'PROJECT.md', '00-READ-FIRST-GPT.md']:
    path = root / name
    text = path.read_text(encoding='utf-8').replace('12.164', '12.165', 1)
    path.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
entry = '''## 12.165 — CSS Ownership Baseline

- Extracts compact navigation and mobile alert rules from `game.css` into an owned stylesheet without changing cascade order.
- Adds deterministic CSS debt reporting and non-growth budgets for monolith lines, `!important` declarations and media queries.
- See `AUDIT-12.165.md`.

'''
text = text.replace('# Strikewatch changelog\n', '# Strikewatch changelog\n\n' + entry, 1)
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.165.md').write_text('''# Build 12.165 — CSS Ownership Baseline

## Audit item

Begins the staged response to the CSS override-debt finding. A wholesale cascade rewrite is too risky, so this release creates the first explicit ownership boundary and prevents further silent growth.

## Change

The Build 12.163 compact-navigation and mobile management-alert block is removed from the tail of `css/game.css` and placed in `css/compact-navigation.css`. The development page loads it after `game.css`; the standalone build concatenates it after the existing 12.161 audit layer, preserving its effective final cascade position. Declarations are unchanged.

## Debt guardrails

`dist/strikewatch-build-12.165-css-debt.json` records total CSS lines, monolith lines, `!important` count, media-query count and owned compact-layer lines. The build fails when the established non-growth budgets are exceeded.

## Verification

- Two builds produce identical bundle, standalone, size report and CSS debt report hashes.
- Source, generated and standalone JavaScript parse.
- Ordered CSS concatenation contains the compact layer exactly once and after the legacy layers.
- Root `cod.html` is byte-identical to the standalone.
- No selectors or declarations in the extracted block changed.
''', encoding='utf-8', newline='\n')
