#!/usr/bin/env python3
"""Build Strikewatch development and standalone distributions."""

from pathlib import Path
import gzip
import json
import re

ROOT = Path(__file__).resolve().parent
MODULES = ['00-core.js', '10-audio.js', '20-navigation.js', '30-bot-ai.js', '31-match-diagnostics.js', '32-tactical-minimap.js', '33-season-narrative-state.js', '34-squad-dynamics.js', '35-career.js', '81-career-indexeddb.js', '39-medical.js', '36-team-management.js', '37-league.js', '38-development.js', '39-infrastructure.js', '39-club-operations.js', '39-opposition-intelligence.js', '39-matchday.js', '39-transfers.js', '39-recruitment-commercial.js', '39-dynamic-market-mail.js', '39-calendar-finance.js', '39-workflow-integrity.js', '40-match-flow.js', '41-live-command-pulses.js', '50-ui-menus.js', '52-season-narratives.js', '55-opening-week.js', '56-world-press-awards.js', '57-loadout-stills.js', '60-renderer-core.js', '61-world-renderer.js', '62-character-renderer.js', '63-viewmodel-renderer.js', '64-reward-renderer.js', '65-sky-dome.js', '70-runtime.js', '75-ui-clarity-hotfix.js', '76-tactical-selection-feedback.js', '77-mail-scroll-guard.js', '78-management-status.js', '79-save-checkpoints.js', '80-durable-results.js', '82-audit-recovery.js']
BUNDLE_PATH = ROOT / "js" / "strikewatch.dev.js"
CSS_PATHS = (ROOT / "css" / "game.css", ROOT / "css" / "training-programme.css", ROOT / "css" / "management-feedback.css", ROOT / "css" / "compact-readability.css", ROOT / "css" / "reward-reveal.css", ROOT / "css" / "armour-viewer.css", ROOT / "css" / "weapon-presentation.css", ROOT / "css" / "loadout-stills.css", ROOT / "css" / "12.161-audit-fixes.css", ROOT / "css" / "armoury-inventory.css", ROOT / "css" / "compact-navigation.css")


def build_metadata() -> tuple[str, str]:
    core = (ROOT / "js" / "00-core.js").read_text(encoding="utf-8")
    version_match = re.search(r"const BUILD_VERSION = '([^']+)'", core)
    id_match = re.search(r"const BUILD_ID = '([^']+)'", core)
    if not version_match or not id_match:
        raise RuntimeError("BUILD_VERSION or BUILD_ID is missing from js/00-core.js")
    return version_match.group(1), id_match.group(1)


def read_modules() -> str:
    chunks = []
    for name in MODULES:
        path = ROOT / "js" / name
        if not path.exists():
            raise FileNotFoundError(f"Missing source module: {path}")
        chunks.append(path.read_text(encoding="utf-8").rstrip())
    return "(() => {\n  'use strict';\n\n" + "\n\n".join(chunks) + "\n})();\n"


def _template_state_after(line: str, in_template: bool) -> bool:
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
        if char == "\\":
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
    return "\n".join(output) + "\n"


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
        "stylesheet_order": list(texts),
        "owned_training_programme_lines": texts["training-programme.css"].count("\n"),
        "owned_management_feedback_lines": texts["management-feedback.css"].count("\n"),
        "owned_compact_readability_lines": texts["compact-readability.css"].count("\n"),
        "owned_reward_reveal_lines": texts["reward-reveal.css"].count("\n"),
        "owned_armour_viewer_lines": texts["armour-viewer.css"].count("\n"),
        "owned_weapon_presentation_lines": texts["weapon-presentation.css"].count("\n"),
        "owned_loadout_stills_lines": texts["loadout-stills.css"].count("\n"),
        "owned_armoury_inventory_lines": texts["armoury-inventory.css"].count("\n"),
        "owned_compact_navigation_lines": texts["compact-navigation.css"].count("\n"),
    }
    budgets = {
        "game_css_lines_max": 31300,
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

def main() -> None:
    index_path = ROOT / "index.html"
    if not all(path.exists() for path in CSS_PATHS) or not index_path.exists():
        raise FileNotFoundError("index.html or an ordered CSS source is missing")

    version, build_id = build_metadata()
    dist_path = ROOT / "dist" / f"strikewatch-build-{version}.html"
    bundle = read_modules()
    BUNDLE_PATH.write_text(bundle, encoding="utf-8", newline="\n")
    release_bundle = strip_release_comment_lines(bundle, javascript=True)

    html = index_path.read_text(encoding="utf-8")
    css_sources = [path.read_text(encoding="utf-8").rstrip() for path in CSS_PATHS]
    css = "\n\n".join(css_sources)
    release_css = strip_release_comment_lines(css, javascript=False).rstrip()
    for element_id in ("managerBuildVersion", "mobileCommandBuildVersion"):
        label_match = re.search(rf'id="{element_id}">([^<]+)</b>', html)
        if not label_match or label_match.group(1) != version:
            raise RuntimeError(
                f"{element_id} must show BUILD_VERSION {version} in index.html"
            )
    expected_css_hrefs = [f"css/{path.name}?v={build_id}" for path in CSS_PATHS]
    actual_css_hrefs = re.findall(r'<link rel="stylesheet" href="(css/[^"]+)"\s*/>', html)
    if actual_css_hrefs != expected_css_hrefs:
        raise RuntimeError(
            f"index.html stylesheet order mismatch: expected {expected_css_hrefs}, got {actual_css_hrefs}"
        )
    stylesheet_block = "\n".join(
        f'<link rel="stylesheet" href="{href}" />' for href in expected_css_hrefs
    )
    if stylesheet_block not in html:
        raise RuntimeError("Ordered development stylesheet block is not contiguous")
    html = html.replace(stylesheet_block, '<style>\n' + release_css + '\n</style>', 1)
    html = re.sub(
        r'<script src="js/strikewatch\.dev\.js\?v=[^"]+"></script>',
        lambda _match: '<script>\n' + release_bundle.rstrip() + '\n</script>',
        html,
        count=1,
    )
    if re.search(r'<link rel="stylesheet" href="css/', html):
        raise RuntimeError("Standalone retained an external development stylesheet")

    if build_id not in (ROOT / "index.html").read_text(encoding="utf-8"):
        raise RuntimeError(f"index.html asset query does not match BUILD_ID {build_id}")

    dist_path.parent.mkdir(parents=True, exist_ok=True)
    dist_path.write_text(html, encoding="utf-8", newline="\n")
    report = release_size_report(version, bundle, release_bundle, css, release_css, html)
    report_path = ROOT / "dist" / f"strikewatch-build-{version}-size.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    css_report = css_debt_report(version)
    css_report_path = ROOT / "dist" / f"strikewatch-build-{version}-css-debt.json"
    css_report_path.write_text(json.dumps(css_report, indent=2) + "\n", encoding="utf-8", newline="\n")
    if not css_report["within_budget"]:
        raise RuntimeError(f"CSS debt budget exceeded: {css_report}")
    if report["javascript_raw_reduction_percent"] < 2.5:
        raise RuntimeError("Release JavaScript comment stripping saved less than the 2.5% minimum budget")
    print(f"Built development bundle: {BUNDLE_PATH}")
    print(f"Built standalone release: {dist_path}")
    print(f"Release size report: {report_path}")
    print(f"CSS debt report: {css_report_path}")
    print(f"JavaScript raw reduction: {report['javascript_raw_reduction_percent']}%")


if __name__ == "__main__":
    main()
