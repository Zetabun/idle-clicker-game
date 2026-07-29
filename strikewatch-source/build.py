#!/usr/bin/env python3
"""Build Strikewatch development and standalone distributions."""

from pathlib import Path
import re
import json

ROOT = Path(__file__).resolve().parent
MODULES = ['00-core.js', '10-audio.js', '20-navigation.js', '30-bot-ai.js', '31-match-diagnostics.js', '32-tactical-minimap.js', '33-season-narrative-state.js', '34-squad-dynamics.js', '35-career.js', '81-career-indexeddb.js', '39-medical.js', '36-team-management.js', '37-league.js', '38-development.js', '39-infrastructure.js', '39-club-operations.js', '39-opposition-intelligence.js', '39-matchday.js', '39-transfers.js', '39-recruitment-commercial.js', '39-dynamic-market-mail.js', '39-calendar-finance.js', '39-workflow-integrity.js', '40-match-flow.js', '41-live-command-pulses.js', '50-ui-menus.js', '52-season-narratives.js', '55-opening-week.js', '56-world-press-awards.js', '57-loadout-stills.js', '60-renderer-core.js', '61-world-renderer.js', '62-character-renderer.js', '63-viewmodel-renderer.js', '64-reward-renderer.js', '65-sky-dome.js', '70-runtime.js', '75-ui-clarity-hotfix.js', '76-tactical-selection-feedback.js', '77-mail-scroll-guard.js', '78-management-status.js', '79-save-checkpoints.js', '80-durable-results.js', '82-audit-recovery.js']
BUNDLE_PATH = ROOT / "js" / "strikewatch.dev.js"


def build_metadata() -> tuple[str, str, str]:
    release = json.loads((ROOT / "RELEASE.json").read_text(encoding="utf-8"))
    version = str(release.get("version") or "").strip()
    name = str(release.get("name") or "").strip()
    build_id = str(release.get("build_id") or "").strip()
    if not version or not name or not build_id:
        raise RuntimeError("RELEASE.json must define version, name and build_id")
    return version, name, build_id


def read_modules() -> str:
    chunks = []
    for name in MODULES:
        path = ROOT / "js" / name
        if not path.exists():
            raise FileNotFoundError(f"Missing source module: {path}")
        chunks.append(path.read_text(encoding="utf-8").rstrip())
    return "(() => {\n  'use strict';\n\n" + "\n\n".join(chunks) + "\n})();\n"


def main() -> None:
    css_path = ROOT / "css" / "game.css"
    release_css_path = ROOT / "css" / "12.161-audit-fixes.css"
    index_path = ROOT / "index.html"
    if not css_path.exists() or not index_path.exists():
        raise FileNotFoundError("index.html or css/game.css is missing")

    version, build_name, build_id = build_metadata()
    dist_path = ROOT / "dist" / f"strikewatch-build-{version}.html"
    bundle = read_modules()
    bundle = re.sub(r"const BUILD_VERSION = '[^']+';", f"const BUILD_VERSION = '{version}';", bundle, count=1)
    bundle = re.sub(r"const BUILD_NAME = '[^']+';", f"const BUILD_NAME = '{build_name}';", bundle, count=1)
    bundle = re.sub(r"const BUILD_ID = '[^']+';", f"const BUILD_ID = '{build_id}';", bundle, count=1)
    BUNDLE_PATH.write_text(bundle, encoding="utf-8", newline="\n")

    html = index_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8").rstrip() + "\n\n" + release_css_path.read_text(encoding="utf-8").rstrip()
    for element_id in ("managerBuildVersion", "mobileCommandBuildVersion"):
        label_match = re.search(rf'id="{element_id}">([^<]+)</b>', html)
        if not label_match or label_match.group(1) != version:
            raise RuntimeError(
                f"{element_id} must show BUILD_VERSION {version} in index.html"
            )
    html = re.sub(
        r'<link rel="stylesheet" href="css/game\.css\?v=[^"]+"\s*/>',
        lambda _match: '<style>\n' + css + '\n</style>',
        html,
        count=1,
    )
    html = re.sub(
        r'<script src="js/strikewatch\.dev\.js\?v=[^"]+"></script>',
        lambda _match: '<script>\n' + bundle.rstrip() + '\n</script>',
        html,
        count=1,
    )

    if build_id not in (ROOT / "index.html").read_text(encoding="utf-8"):
        raise RuntimeError(f"index.html asset query does not match BUILD_ID {build_id}")

    concise_docs = [ROOT / "HANDOFF.md", ROOT / "README.md", ROOT / "PROJECT.md", ROOT / "00-READ-FIRST-GPT.md"]
    for document in concise_docs:
        text = document.read_text(encoding="utf-8")
        if version not in text:
            raise RuntimeError(f"{document.name} does not declare current BUILD_VERSION {version}")
    if f"Strikewatch {version}:" not in index_path.read_text(encoding="utf-8"):
        raise RuntimeError("index.html title does not declare the current build version")

    dist_path.parent.mkdir(parents=True, exist_ok=True)
    dist_path.write_text(html, encoding="utf-8", newline="\n")
    print(f"Built development bundle: {BUNDLE_PATH}")
    print(f"Built standalone release: {dist_path}")


if __name__ == "__main__":
    main()
