from pathlib import Path
import json

root = Path('strikewatch-source')

def replace(path, old, new, count=1):
    p = root / path
    text = p.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected text: {old[:100]!r}')
    p.write_text(text.replace(old, new, count), encoding='utf-8', newline='\n')

replace(Path('js/00-core.js'), "const BUILD_VERSION = '12.163';", "const BUILD_VERSION = '12.164';")
replace(Path('js/00-core.js'), "const BUILD_NAME = 'Compact Navigation Alignment';", "const BUILD_NAME = 'Lean Standalone';")
replace(Path('js/00-core.js'), "const BUILD_ID = '12.163.0-compact-navigation-alignment';", "const BUILD_ID = '12.164.0-lean-standalone';")

index = root / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('Strikewatch 12.163: Compact Navigation Alignment', 'Strikewatch 12.164: Lean Standalone')
text = text.replace('12.163.0-compact-navigation-alignment', '12.164.0-lean-standalone')
text = text.replace('>12.163</b>', '>12.164</b>')
index.write_text(text, encoding='utf-8', newline='\n')

(root / 'RELEASE.json').write_text(json.dumps({
    'version': '12.164',
    'name': 'Lean Standalone',
    'build_id': '12.164.0-lean-standalone'
}, indent=2) + '\n', encoding='utf-8', newline='\n')

build = root / 'build.py'
text = build.read_text(encoding='utf-8')
text = text.replace('from pathlib import Path\nimport re\n', 'from pathlib import Path\nimport gzip\nimport json\nimport re\n', 1)
anchor = '''def read_modules() -> str:
    chunks = []
    for name in MODULES:
        path = ROOT / "js" / name
        if not path.exists():
            raise FileNotFoundError(f"Missing source module: {path}")
        chunks.append(path.read_text(encoding="utf-8").rstrip())
    return "(() => {\\n  'use strict';\\n\\n" + "\\n\\n".join(chunks) + "\\n})();\\n"


'''
replacement = anchor + '''def _template_state_after(line: str, in_template: bool) -> bool:
    """Track backtick template regions conservatively for release comment stripping."""
    quote = None
    escaped = False
    index = 0
    while index < len(line):
        char = line[index]
        if escaped:
            escaped = False
            index += 1
            continue
        if char == "\\\\":
            escaped = True
            index += 1
            continue
        if in_template:
            if char == "`":
                in_template = False
            index += 1
            continue
        if quote:
            if char == quote:
                quote = None
            index += 1
            continue
        if char in ("'", '"'):
            quote = char
            index += 1
            continue
        if char == "`":
            in_template = True
            index += 1
            continue
        if char == "/" and index + 1 < len(line) and line[index + 1] == "/":
            break
        index += 1
    return in_template


def strip_release_comment_lines(text: str, *, javascript: bool) -> str:
    """Remove only whole-line comments and collapse blank runs.

    Executable tokens, CSS declarations, strings and template-literal contents are
    never rewritten. This is deliberately less aggressive than a general-purpose
    minifier so the standalone stays behaviourally and visually identical.
    """
    lines = text.splitlines()
    output = []
    in_template = False
    index = 0
    while index < len(lines):
        line = lines[index].rstrip()
        stripped = line.lstrip()
        if javascript and not in_template and stripped.startswith("//"):
            index += 1
            continue
        if not in_template and stripped.startswith("/*"):
            block = [line]
            end = index
            while "*/" not in block[-1] and end + 1 < len(lines):
                end += 1
                block.append(lines[end].rstrip())
            close_position = block[-1].find("*/")
            trailing = block[-1][close_position + 2:].strip() if close_position >= 0 else "content"
            if close_position >= 0 and not trailing:
                index = end + 1
                continue
        if javascript:
            in_template = _template_state_after(line, in_template)
        if not stripped:
            if output and output[-1] != "":
                output.append("")
        else:
            output.append(line)
        index += 1
    while output and output[-1] == "":
        output.pop()
    return "\\n".join(output) + "\\n"


def release_size_report(version: str, development_bundle: str, release_bundle: str, source_css: str, release_css: str, standalone: str) -> dict:
    def sizes(value: str) -> dict:
        raw = value.encode("utf-8")
        return {
            "raw_bytes": len(raw),
            "gzip_bytes": len(gzip.compress(raw, compresslevel=9, mtime=0)),
        }
    report = {
        "version": version,
        "development_bundle": sizes(development_bundle),
        "release_bundle": sizes(release_bundle),
        "source_css": sizes(source_css),
        "release_css": sizes(release_css),
        "standalone": sizes(standalone),
    }
    report["javascript_raw_reduction_percent"] = round(
        (1 - report["release_bundle"]["raw_bytes"] / max(1, report["development_bundle"]["raw_bytes"])) * 100,
        2,
    )
    report["css_raw_reduction_percent"] = round(
        (1 - report["release_css"]["raw_bytes"] / max(1, report["source_css"]["raw_bytes"])) * 100,
        2,
    )
    return report


'''
if anchor not in text:
    raise SystemExit('build.py module anchor missing')
text = text.replace(anchor, replacement, 1)
text = text.replace('''    bundle = read_modules()
    BUNDLE_PATH.write_text(bundle, encoding="utf-8", newline="\\n")

    html = index_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8").rstrip() + "\\n\\n" + release_css_path.read_text(encoding="utf-8").rstrip()
''', '''    bundle = read_modules()
    BUNDLE_PATH.write_text(bundle, encoding="utf-8", newline="\\n")
    release_bundle = strip_release_comment_lines(bundle, javascript=True)

    html = index_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8").rstrip() + "\\n\\n" + release_css_path.read_text(encoding="utf-8").rstrip()
    release_css = strip_release_comment_lines(css, javascript=False).rstrip()
''', 1)
text = text.replace("lambda _match: '<style>\\n' + css + '\\n</style>',", "lambda _match: '<style>\\n' + release_css + '\\n</style>',", 1)
text = text.replace("lambda _match: '<script>\\n' + bundle.rstrip() + '\\n</script>',", "lambda _match: '<script>\\n' + release_bundle.rstrip() + '\\n</script>',", 1)
text = text.replace('''    dist_path.parent.mkdir(parents=True, exist_ok=True)
    dist_path.write_text(html, encoding="utf-8", newline="\\n")
    print(f"Built development bundle: {BUNDLE_PATH}")
    print(f"Built standalone release: {dist_path}")
''', '''    dist_path.parent.mkdir(parents=True, exist_ok=True)
    dist_path.write_text(html, encoding="utf-8", newline="\\n")
    report = release_size_report(version, bundle, release_bundle, css, release_css, html)
    report_path = ROOT / "dist" / f"strikewatch-build-{version}-size.json"
    report_path.write_text(json.dumps(report, indent=2) + "\\n", encoding="utf-8", newline="\\n")
    if report["javascript_raw_reduction_percent"] < 5:
        raise RuntimeError("Release JavaScript comment stripping saved less than the 5% minimum budget")
    print(f"Built development bundle: {BUNDLE_PATH}")
    print(f"Built standalone release: {dist_path}")
    print(f"Release size report: {report_path}")
    print(f"JavaScript raw reduction: {report['javascript_raw_reduction_percent']}%")
''', 1)
build.write_text(text, encoding='utf-8', newline='\n')

handoff = root / 'HANDOFF.md'
text = handoff.read_text(encoding='utf-8')
text = text.replace('Build: **12.163 — Compact Navigation Alignment**', 'Build: **12.164 — Lean Standalone**', 1)
text = text.replace('Build ID: `12.163.0-compact-navigation-alignment`', 'Build ID: `12.164.0-lean-standalone`', 1)
text = text.replace('strikewatch-build-12.163.html', 'strikewatch-build-12.164.html', 1)
note = 'Build 12.164 reduces the shipped standalone without changing executable tokens or visual declarations: the release copy strips only whole-line comments and redundant blank runs, while the readable source modules and development bundle remain unchanged. `dist/strikewatch-build-12.164-size.json` records raw and deterministic gzip sizes. See `AUDIT-12.164.md`.\n\n'
pos = text.find('Build 12.163')
if pos < 0:
    raise SystemExit('HANDOFF current release note anchor missing')
text = text[:pos] + note + text[pos:]
handoff.write_text(text, encoding='utf-8', newline='\n')

agents = root / 'AGENTS.md'
text = agents.read_text(encoding='utf-8')
note = 'Build 12.164 owns conservative release-only comment stripping in `build.py`. The development bundle must remain readable. Never broaden this into token rewriting without a real JavaScript/CSS parser; template-literal contents, CSS declarations and executable code must remain byte-for-byte apart from removed comment-only/blank lines. Keep the 5% minimum reduction gate and the deterministic size report green. See `AUDIT-12.164.md`.\n\n'
anchor = '## Current release note\n\n'
if anchor not in text:
    raise SystemExit('AGENTS current release anchor missing')
text = text.replace(anchor, anchor + note, 1)
agents.write_text(text, encoding='utf-8', newline='\n')

contracts = root / 'CONTRACTS.md'
text = contracts.read_text(encoding='utf-8')
anchor = '- `js/strikewatch.dev.js` is generated from the ordered module list in\n'
note = '- The development bundle remains readable. The standalone may remove only comment-only lines and redundant blank runs through the deterministic build path; executable tokens, strings, template-literal contents and CSS declarations must not be rewritten by the conservative stripper. A size report is generated beside each standalone.\n'
pos = text.find(anchor)
if pos < 0:
    raise SystemExit('CONTRACTS release anchor missing')
text = text[:pos] + note + text[pos:]
contracts.write_text(text, encoding='utf-8', newline='\n')

for name in ['README.md', 'PROJECT.md', '00-READ-FIRST-GPT.md']:
    p = root / name
    text = p.read_text(encoding='utf-8')
    text = text.replace('12.163', '12.164', 1)
    p.write_text(text, encoding='utf-8', newline='\n')

changelog = root / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
entry = '''## 12.164 — Lean Standalone

- Reduces the shipped standalone by stripping only whole-line comments and redundant blank runs from release JavaScript and CSS.
- Keeps source modules and `js/strikewatch.dev.js` readable and unchanged in content.
- Adds deterministic raw/gzip size reporting and a minimum JavaScript reduction budget.
- See `AUDIT-12.164.md`.

'''
if entry not in text:
    text = text.replace('# Strikewatch changelog\n', '# Strikewatch changelog\n\n' + entry, 1)
changelog.write_text(text, encoding='utf-8', newline='\n')

(root / 'AUDIT-12.164.md').write_text('''# Build 12.164 — Lean Standalone

## Audit item

Addresses the next unresolved comprehensive-audit item: the roughly 4.7 MB monolithic standalone and the absence of repeatable release-size budgets.

## Implementation

`build.py` still emits the full readable development bundle. For the standalone only, it removes whole-line JavaScript/CSS comments and collapses redundant blank runs. It does not rename identifiers, compress expressions, alter strings, rewrite template literals, remove CSS declarations or change HTML structure.

A deterministic size report is written to `dist/strikewatch-build-12.164-size.json`, including raw and gzip sizes for the development bundle, release bundle, source/release CSS and final standalone. The build fails when JavaScript raw reduction is below 5%.

## Fidelity and behaviour

- Executable JavaScript tokens are unchanged.
- CSS declarations and selector order are unchanged.
- UI text, procedural geometry, materials, shaders, gameplay and persistence are unchanged.
- Source modules and the development bundle remain readable for maintenance.

## Verification gates

- Build succeeds twice and bundle, standalone and size-report hashes are identical.
- Every modular JavaScript file and the development bundle parse.
- Standalone inline JavaScript parses.
- Root `cod.html` is byte-identical to the standalone.
- Release JavaScript achieves at least 5% raw reduction against the development bundle.
''', encoding='utf-8', newline='\n')
