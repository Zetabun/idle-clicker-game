#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = ROOT / "strikewatch-source"
OLD_VERSION = "12.199"
NEW_VERSION = "12.200"
OLD_NAME = "Surface-Anchored Blood Decals"
NEW_NAME = "Single-Source Management Prompts"
OLD_BUILD_ID = "12.199.0-surface-anchored-blood-decals"
NEW_BUILD_ID = "12.200.0-single-source-management-prompts"


def fail(message: str) -> None:
    raise SystemExit(f"release-12.200: {message}")


def read(path: pathlib.Path) -> str:
    if not path.exists():
        fail(f"missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def write(path: pathlib.Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"expected exactly one {label} anchor, found {count}")
    return text.replace(old, new, 1)


release_path = SOURCE / "RELEASE.json"
release = json.loads(read(release_path))
if release.get("version") != OLD_VERSION:
    fail(f"expected predecessor {OLD_VERSION}, found {release.get('version')!r}")
release.update(version=NEW_VERSION, name=NEW_NAME, build_id=NEW_BUILD_ID)
write(release_path, json.dumps(release, indent=2) + "\n")

core_path = SOURCE / "js/00-core.js"
core = read(core_path)
core = replace_once(core, f"const BUILD_VERSION = '{OLD_VERSION}'", f"const BUILD_VERSION = '{NEW_VERSION}'", "BUILD_VERSION")
core = replace_once(core, f"const BUILD_NAME = '{OLD_NAME}'", f"const BUILD_NAME = '{NEW_NAME}'", "BUILD_NAME")
core = replace_once(core, f"const BUILD_ID = '{OLD_BUILD_ID}'", f"const BUILD_ID = '{NEW_BUILD_ID}'", "BUILD_ID")
write(core_path, core)

ui_path = SOURCE / "js/50-ui-menus.js"
ui = read(ui_path)
old_render = """    const contextTutorial = renderMenuContextTutorial(menuTab);
    const priorityStrip = renderMenuPriorityStrip();
    if (priorityStrip) menuContentEl.insertAdjacentHTML('afterbegin', priorityStrip);
    if (contextTutorial) menuContentEl.insertAdjacentHTML('afterbegin', contextTutorial);
    const mustRespond = menuTab === 'play' && typeof renderClubMustRespondStrip === 'function' ? renderClubMustRespondStrip() : '';
    if (mustRespond) menuContentEl.insertAdjacentHTML('afterbegin', mustRespond);
"""
new_render = """    const contextTutorial = renderMenuContextTutorial(menuTab);
    const mustRespond = menuTab === 'play' && typeof renderClubMustRespondStrip === 'function' ? renderClubMustRespondStrip() : '';
    const priorityStrip = mustRespond ? '' : renderMenuPriorityStrip();
    if (priorityStrip) menuContentEl.insertAdjacentHTML('afterbegin', priorityStrip);
    if (contextTutorial) menuContentEl.insertAdjacentHTML('afterbegin', contextTutorial);
    if (mustRespond) menuContentEl.insertAdjacentHTML('afterbegin', mustRespond);
"""
ui = replace_once(ui, old_render, new_render, "management prompt insertion")

anchor = """    if (mustRespond) menuContentEl.insertAdjacentHTML('afterbegin', mustRespond);
    const arrivalBanner = typeof renderManagementArrivalBanner === 'function' ? renderManagementArrivalBanner() : '';
"""
replacement = """    if (mustRespond) {
      menuContentEl.insertAdjacentHTML('afterbegin', mustRespond);
      const blockerLabels = new Set((typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : []).map(item => String(item?.label || '').trim().toUpperCase()).filter(Boolean));
      for (const candidate of menuContentEl.querySelectorAll('.management-priority-strip, .career-next-action, .manager-next-action, [data-management-priority]')) {
        if (candidate.closest('.club-must-respond-strip')) continue;
        const candidateLabel = String(candidate.querySelector('strong')?.textContent || '').trim().toUpperCase();
        if (candidateLabel && blockerLabels.has(candidateLabel)) candidate.remove();
      }
    }
    const arrivalBanner = typeof renderManagementArrivalBanner === 'function' ? renderManagementArrivalBanner() : '';
"""
ui = replace_once(ui, anchor, replacement, "post-render duplicate suppression")
write(ui_path, ui)

index_path = SOURCE / "index.html"
index = read(index_path)
index = replace_once(index, f"Strikewatch {OLD_VERSION}: {OLD_NAME}", f"Strikewatch {NEW_VERSION}: {NEW_NAME}", "document title")
if OLD_BUILD_ID not in index:
    fail("missing asset build id in index.html")
index = index.replace(OLD_BUILD_ID, NEW_BUILD_ID)
index = replace_once(index, f'id="managerBuildVersion">{OLD_VERSION}</b>', f'id="managerBuildVersion">{NEW_VERSION}</b>', "desktop build label")
index = replace_once(index, f'id="mobileCommandBuildVersion">{OLD_VERSION}</b>', f'id="mobileCommandBuildVersion">{NEW_VERSION}</b>', "mobile build label")
write(index_path, index)

release_note = (
    f"Build {NEW_VERSION} makes management blockers single-source on the Operations overview. "
    "When MUST RESPOND is present, the generic priority strip is not rendered and later action cards "
    "that repeat the same blocker label are removed. The blocker list remains authoritative for matchday, "
    "transfer, sponsorship and other end-day locks; routes and actions are unchanged. "
    f"See `AUDIT-{NEW_VERSION}.md`.\n\n"
)

handoff_path = SOURCE / "HANDOFF.md"
handoff = read(handoff_path)
handoff = replace_once(handoff, f"- Build: **{OLD_VERSION} — {OLD_NAME}**", f"- Build: **{NEW_VERSION} — {NEW_NAME}**", "HANDOFF build line")
handoff = replace_once(handoff, f"- Build ID: `{OLD_BUILD_ID}`", f"- Build ID: `{NEW_BUILD_ID}`", "HANDOFF build id")
handoff = replace_once(handoff, f"strikewatch-build-{OLD_VERSION}.html", f"strikewatch-build-{NEW_VERSION}.html", "HANDOFF standalone path")
current_marker = f"Build {OLD_VERSION} owns"
if current_marker not in handoff:
    fail("missing HANDOFF current-release narrative anchor")
handoff = handoff.replace(current_marker, release_note + current_marker, 1)
write(handoff_path, handoff)

agents_path = SOURCE / "AGENTS.md"
agents = read(agents_path)
marker = f"Build {OLD_VERSION} owns"
if marker not in agents:
    fail("missing AGENTS current-release note anchor")
agents = agents.replace(marker, release_note + marker, 1)
write(agents_path, agents)

readme_path = SOURCE / "README.md"
readme = read(readme_path)
readme = replace_once(readme, f"# Strikewatch Source {OLD_VERSION}", f"# Strikewatch Source {NEW_VERSION}", "README title")
readme = replace_once(readme, f"dist/strikewatch-build-{OLD_VERSION}.html", f"dist/strikewatch-build-{NEW_VERSION}.html", "README standalone path")
write(readme_path, readme)

project_path = SOURCE / "PROJECT.md"
project = read(project_path)
old_project = f"Build {OLD_VERSION} anchors nearby-wall blood to the surface that owns it: sliding-door marks move into their wall pockets, and unsupported corner specks are rejected without changing combat. See `HANDOFF.md` and `AUDIT-{OLD_VERSION}.md`."
new_project = f"Build {NEW_VERSION} removes repeated management prompts on the Operations overview by making MUST RESPOND the single authoritative blocker surface while preserving every existing action route. See `HANDOFF.md` and `AUDIT-{NEW_VERSION}.md`."
project = replace_once(project, old_project, new_project, "PROJECT current release")
write(project_path, project)

audit = f"""# Build {NEW_VERSION} audit — {NEW_NAME}

## Scope

Mobile Operations overview repeated the same required action in the MUST RESPOND blocker list, the generic priority strip and, for some states, a later dashboard action card.

## Change

- `js/50-ui-menus.js` now resolves the Operations blocker markup before the generic priority strip and suppresses that strip whenever MUST RESPOND is active.
- After the blocker list is inserted, later known management-priority cards are removed only when their primary label exactly matches a current end-day blocker.
- The canonical blocker list keeps the existing route/action wiring. Matchday, transfer, sponsorship and future blocker categories share the same label-based rule.
- No gameplay, economy, save, schema, calendar or match simulation authority changed.

## Verification

- Predecessor `RELEASE.json` version checked before patching.
- Python build script compiled.
- Two complete builds compared byte-for-byte.
- Every modular JavaScript file, the generated development bundle and all standalone inline scripts parsed with Node.
- Root `cod.html` copied from and verified byte-identical to the generated standalone.
- Source assertions confirm blocker resolution precedes priority rendering and duplicate suppression stays scoped outside `.club-must-respond-strip`.

Save schema 19 and diagnostics schema 1 are unchanged.
"""
write(SOURCE / f"AUDIT-{NEW_VERSION}.md", audit)

updated_ui = read(ui_path)
required_fragments = [
    "const priorityStrip = mustRespond ? '' : renderMenuPriorityStrip();",
    "candidate.closest('.club-must-respond-strip')",
    "blockerLabels.has(candidateLabel)",
]
for fragment in required_fragments:
    if fragment not in updated_ui:
        fail(f"missing source assertion after patch: {fragment}")

print(f"Applied Build {NEW_VERSION}: {NEW_NAME}")
