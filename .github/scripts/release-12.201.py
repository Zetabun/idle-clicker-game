#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "strikewatch-source"
OLD_VERSION = "12.200"
NEW_VERSION = "12.201"
OLD_NAME = "Single-Source Management Prompts"
NEW_NAME = "Mobile Action Hierarchy"
OLD_ID = "12.200.0-single-source-management-prompts"
NEW_ID = "12.201.0-mobile-action-hierarchy"


def fail(message: str) -> None:
    raise SystemExit(f"release-12.201: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"expected one {label} anchor, found {count}")
    return text.replace(old, new, 1)


release_path = SRC / "RELEASE.json"
release = json.loads(read(release_path))
expected_release = {"version": OLD_VERSION, "name": OLD_NAME, "build_id": OLD_ID}
if release != expected_release:
    fail(f"unexpected predecessor release: {release!r}")
release = {"version": NEW_VERSION, "name": NEW_NAME, "build_id": NEW_ID}
write(release_path, json.dumps(release, indent=2) + "\n")

core_path = SRC / "js/00-core.js"
core = read(core_path)
core = replace_once(core, f"  const BUILD_VERSION = '{OLD_VERSION}';", f"  const BUILD_VERSION = '{NEW_VERSION}';", "BUILD_VERSION")
core = replace_once(core, f"  const BUILD_NAME = '{OLD_NAME}';", f"  const BUILD_NAME = '{NEW_NAME}';", "BUILD_NAME")
core = replace_once(core, f"  const BUILD_ID = '{OLD_ID}';", f"  const BUILD_ID = '{NEW_ID}';", "BUILD_ID")
write(core_path, core)

operations_path = SRC / "js/39-club-operations.js"
operations = read(operations_path)
old_render = '''  function renderClubMustRespondStrip() {
    const blockers = clubEndDayBlockers();
    if (!blockers.length || menuContext === 'pause') return '';
    const groups = new Map();
    for (const blocker of blockers) {
      const category = String(blocker.category || 'REQUIRED').toUpperCase();
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(blocker);
    }
    const groupedMarkup = [...groups.entries()].map(([category, items]) => `<section class="club-response-group"><header><span>${escapeCareerHtml(category)}</span><strong>${items.length}</strong></header><div>${items.map(blocker => {
      const actionId = typeof managementActionIdForBlocker === 'function' ? managementActionIdForBlocker(blocker) : '';
      return `<button ${actionId ? `data-management-action-id="${escapeCareerHtml(actionId)}"` : `data-team-route="${escapeCareerHtml(blocker.route)}"`}><span>${escapeCareerHtml(blocker.label)}</span><small>${escapeCareerHtml(blocker.detail)}</small><b>OPEN →</b></button>`;
    }).join('')}</div></section>`).join('');
    return `<section class="club-must-respond-strip" aria-label="Actions required before ending the day"><header><span>MUST RESPOND</span><strong>${blockers.length} ACTION${blockers.length === 1 ? '' : 'S'} REQUIRED BEFORE ENDING THE DAY</strong><small>Each item explains why the calendar is locked. Resolve it and the list updates immediately.</small></header><div class="club-response-groups">${groupedMarkup}</div></section>`;
  }
'''
new_render = '''  function renderClubMustRespondStrip() {
    const blockers = clubEndDayBlockers();
    if (!blockers.length || menuContext === 'pause') return '';
    const groups = new Map();
    for (const blocker of blockers) {
      const category = String(blocker.category || 'REQUIRED').toUpperCase();
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(blocker);
    }
    const groupedMarkup = [...groups.entries()].map(([category, items]) => `<section class="club-response-group"><header><span>${escapeCareerHtml(category)}</span><strong>${items.length}</strong></header><div>${items.map(blocker => {
      const actionId = typeof managementActionIdForBlocker === 'function' ? managementActionIdForBlocker(blocker) : '';
      return `<button ${actionId ? `data-management-action-id="${escapeCareerHtml(actionId)}"` : `data-team-route="${escapeCareerHtml(blocker.route)}"`}><span>${escapeCareerHtml(blocker.label)}</span><small>${escapeCareerHtml(blocker.detail)}</small><b>OPEN →</b></button>`;
    }).join('')}</div></section>`).join('');
    const first = blockers[0];
    const summaryLabel = blockers.length === 1 ? first.label : `${blockers.length} REQUIRED ACTIONS`;
    const summaryDetail = blockers.length === 1 ? first.detail : `${first.label} · ${blockers.length - 1} more`;
    return `<details class="club-must-respond-strip" data-management-action-rank="urgent" aria-label="Actions required before ending the day" open><summary><span><b>MUST RESPOND</b><strong>${escapeCareerHtml(summaryLabel)}</strong><small>${escapeCareerHtml(summaryDetail)}</small></span><i aria-hidden="true"></i></summary><div class="club-must-respond-body"><header><span>MUST RESPOND</span><strong>${blockers.length} ACTION${blockers.length === 1 ? '' : 'S'} REQUIRED BEFORE ENDING THE DAY</strong><small>Resolve ${blockers.length === 1 ? 'this item' : 'these items'} before advancing the calendar.</small></header><div class="club-response-groups">${groupedMarkup}</div></div></details>`;
  }
'''
operations = replace_once(operations, old_render, new_render, "MUST RESPOND renderer")
write(operations_path, operations)

ui_path = SRC / "js/50-ui-menus.js"
ui = read(ui_path)
old_block = '''    if (mustRespond) {
      menuContentEl.insertAdjacentHTML('afterbegin', mustRespond);
      const blockerLabels = new Set((typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : []).map(item => String(item?.label || '').trim().toUpperCase()).filter(Boolean));
      for (const candidate of menuContentEl.querySelectorAll('.management-priority-strip, .career-next-action, .manager-next-action, [data-management-priority]')) {
        if (candidate.closest('.club-must-respond-strip')) continue;
        const candidateLabel = String(candidate.querySelector('strong')?.textContent || '').trim().toUpperCase();
        if (candidateLabel && blockerLabels.has(candidateLabel)) candidate.remove();
      }
    }
'''
new_block = '''    if (mustRespond) {
      menuContentEl.insertAdjacentHTML('afterbegin', mustRespond);
      const blockerLabels = new Set((typeof clubEndDayBlockers === 'function' ? clubEndDayBlockers() : []).map(item => String(item?.label || '').trim().toUpperCase()).filter(Boolean));
      for (const candidate of menuContentEl.querySelectorAll('.management-priority-strip, .career-next-action, .manager-next-action, [data-management-priority]')) {
        if (candidate.closest('.club-must-respond-strip')) continue;
        const candidateLabel = String(candidate.querySelector('strong')?.textContent || '').trim().toUpperCase();
        if (candidateLabel && blockerLabels.has(candidateLabel)) candidate.remove();
      }
    }
    const urgentSurface = menuContentEl.querySelector('[data-management-action-rank="urgent"]');
    const recommendedSurface = urgentSurface ? null : menuContentEl.querySelector('.management-priority-strip');
    menuContentEl.classList.toggle('has-urgent-management-action', Boolean(urgentSurface));
    menuContentEl.classList.toggle('has-recommended-management-action', Boolean(recommendedSurface));
    if (recommendedSurface) recommendedSurface.dataset.managementActionRank = 'recommended';
'''
ui = replace_once(ui, old_block, new_block, "management action hierarchy")
write(ui_path, ui)

css_path = SRC / "css/compact-navigation.css"
css = read(css_path)
css_append = '''

/* --- Build 12.201: compact management action hierarchy --------------------
   One urgent surface remains visually dominant. MUST RESPOND uses native
   disclosure semantics so the player can collapse it to a compact summary
   after reading without losing the blocker count or primary action. */
@media (max-width: 1023px) {
  #menuContent.has-urgent-management-action > .club-must-respond-strip {
    order: -30;
  }

  .club-must-respond-strip > summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24px;
    align-items: center;
    gap: 10px;
    min-height: 68px;
    padding: 12px 14px;
    cursor: pointer;
    list-style: none;
    touch-action: manipulation;
  }

  .club-must-respond-strip > summary::-webkit-details-marker { display: none; }
  .club-must-respond-strip > summary > span {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .club-must-respond-strip > summary b {
    font-size: 11px;
    letter-spacing: .16em;
  }
  .club-must-respond-strip > summary strong {
    font-size: 14px;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .club-must-respond-strip > summary small {
    font-size: 12px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .club-must-respond-strip > summary i {
    position: relative;
    width: 22px;
    height: 22px;
    justify-self: end;
    border: 1px solid currentColor;
    border-radius: 50%;
    opacity: .8;
  }
  .club-must-respond-strip > summary i::before,
  .club-must-respond-strip > summary i::after {
    content: "";
    position: absolute;
    left: 5px;
    right: 5px;
    top: 10px;
    height: 2px;
    background: currentColor;
  }
  .club-must-respond-strip > summary i::after {
    transform: rotate(90deg);
    transition: transform .16s ease;
  }
  .club-must-respond-strip[open] > summary i::after { transform: rotate(0deg); }
  .club-must-respond-strip[open] > summary { border-bottom: 1px solid rgba(255,255,255,.10); }
  .club-must-respond-strip:not([open]) .club-must-respond-body { display: none; }
  .club-must-respond-strip[open] > summary small {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  .club-must-respond-body > header small {
    max-width: 52ch;
  }
}

@media (orientation: portrait) and (max-width: 430px) {
  .club-must-respond-strip > summary {
    min-height: 64px;
    padding: 10px 12px;
  }
  .club-must-respond-strip > summary strong { font-size: 13px; }
  .club-must-respond-body > header {
    padding-top: 10px;
  }
  .club-must-respond-body > header small {
    display: none;
  }
}
'''
if "Build 12.201: compact management action hierarchy" in css:
    fail("12.201 CSS block already exists")
write(css_path, css.rstrip() + css_append + "\n")

index_path = SRC / "index.html"
index = read(index_path)
index = index.replace(f"Strikewatch {OLD_VERSION}: {OLD_NAME}", f"Strikewatch {NEW_VERSION}: {NEW_NAME}")
index = index.replace(OLD_ID, NEW_ID)
index = replace_once(index, f'id="managerBuildVersion">{OLD_VERSION}</b>', f'id="managerBuildVersion">{NEW_VERSION}</b>', "desktop build label")
index = replace_once(index, f'id="mobileCommandBuildVersion">{OLD_VERSION}</b>', f'id="mobileCommandBuildVersion">{NEW_VERSION}</b>', "mobile build label")
write(index_path, index)

release_note = (
    f"Build {NEW_VERSION} establishes a compact management action hierarchy. MUST RESPOND is the single urgent surface, "
    "uses a native disclosure summary on compact screens and can collapse without losing the blocker count or first action. "
    "When no urgent blocker exists, the existing priority strip is marked as the recommended action. Routes, blocker authority, "
    f"gameplay and schemas are unchanged. See `AUDIT-{NEW_VERSION}.md`.\n\n"
)

handoff_path = SRC / "HANDOFF.md"
handoff = read(handoff_path)
handoff = replace_once(handoff, f"- Build: **{OLD_VERSION} — {OLD_NAME}**", f"- Build: **{NEW_VERSION} — {NEW_NAME}**", "HANDOFF build")
handoff = replace_once(handoff, f"- Build ID: `{OLD_ID}`", f"- Build ID: `{NEW_ID}`", "HANDOFF id")
handoff = replace_once(handoff, f"strikewatch-build-{OLD_VERSION}.html", f"strikewatch-build-{NEW_VERSION}.html", "HANDOFF standalone")
handoff = replace_once(handoff, f"Build {OLD_VERSION} makes", release_note + f"Build {OLD_VERSION} makes", "HANDOFF release note")
write(handoff_path, handoff)

agents_path = SRC / "AGENTS.md"
agents = read(agents_path)
agents = replace_once(agents, f"Build {OLD_VERSION} makes", release_note + f"Build {OLD_VERSION} makes", "AGENTS release note")
write(agents_path, agents)

readme_path = SRC / "README.md"
readme = read(readme_path)
readme = replace_once(readme, f"# Strikewatch Source {OLD_VERSION}", f"# Strikewatch Source {NEW_VERSION}", "README title")
readme = replace_once(readme, f"dist/strikewatch-build-{OLD_VERSION}.html", f"dist/strikewatch-build-{NEW_VERSION}.html", "README standalone")
write(readme_path, readme)

project_path = SRC / "PROJECT.md"
project = read(project_path)
old_project = f"Build {OLD_VERSION} removes repeated management prompts on the Operations overview by making MUST RESPOND the single authoritative blocker surface while preserving every existing action route. See `HANDOFF.md` and `AUDIT-{OLD_VERSION}.md`."
new_project = f"Build {NEW_VERSION} gives compact management pages one clear action hierarchy: collapsible urgent blockers first, otherwise one recommended priority. See `HANDOFF.md` and `AUDIT-{NEW_VERSION}.md`."
project = replace_once(project, old_project, new_project, "PROJECT current release")
write(project_path, project)

audit = f'''# Build {NEW_VERSION} audit — {NEW_NAME}

## Scope

Compact management pages needed a clearer visual order after repeated prompts were removed. The urgent blocker surface could still occupy most of a phone viewport after the player had read it.

## Change

- MUST RESPOND now renders as an open native `details` disclosure with a compact summary containing the blocker count, primary action and short context.
- Compact users can collapse the urgent surface while retaining the information needed to reopen it.
- The rendered management page explicitly records whether it owns an urgent or recommended action. Urgent blockers take precedence; the ordinary priority strip is recommended only when no urgent blocker exists.
- Phone presentation reduces repeated explanatory copy while preserving every blocker action and route.
- No calendar, transfer, sponsor, match, economy, persistence or simulation authority changed.

## Verification

- Exact Build {OLD_VERSION} predecessor metadata checked before patching.
- `build.py` compiled and ran twice with byte-identical bundle, standalone and report outputs.
- Every modular JavaScript file, generated bundle and standalone inline script parsed with Node.
- Source assertions covered disclosure markup, urgent/recommended rank ownership and compact CSS.
- Root `cod.html` was copied from and verified byte-identical to the generated standalone.

Save schema 19 and diagnostics schema 1 are unchanged.
'''
write(SRC / f"AUDIT-{NEW_VERSION}.md", audit)

for path, fragments in {
    operations_path: ['<details class="club-must-respond-strip"', 'data-management-action-rank="urgent"', '<summary>'],
    ui_path: ['has-urgent-management-action', 'has-recommended-management-action', "dataset.managementActionRank = 'recommended'"],
    css_path: ['Build 12.201: compact management action hierarchy', '.club-must-respond-strip > summary'],
}.items():
    text = read(path)
    missing = [fragment for fragment in fragments if fragment not in text]
    if missing:
        fail(f"missing post-patch anchors in {path.name}: {missing!r}")

print(f"Applied Build {NEW_VERSION}: {NEW_NAME}")
