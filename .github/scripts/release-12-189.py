from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
if not (ROOT / 'strikewatch-source').exists():
    raise SystemExit(f'Could not locate repository root from {__file__}')
SRC = ROOT / 'strikewatch-source'

VERSION = '12.189'
NAME = 'Mobile Equipment Preview Framing'
BUILD_ID = '12.189.0-mobile-equipment-preview-framing'


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding='utf-8', newline='\n')


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one {label} in {path}; found {count}')
    write(path, text.replace(old, new, 1))


def replace_regex(path: Path, pattern: str, replacement: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    updated, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'Could not update {label} in {path}; count={count}')
    write(path, updated)


# Verify the source tree still matches the inspected predecessor before patching.
release_path = SRC / 'RELEASE.json'
predecessor = json.loads(release_path.read_text(encoding='utf-8'))
expected_predecessor = {
    'version': '12.188',
    'name': 'Armour Preview Optimisation',
    'build_id': '12.188.0-armour-preview-optimisation'
}
if predecessor != expected_predecessor:
    raise SystemExit(f'Unexpected predecessor release inside patch: {predecessor!r}')

# Canonical release metadata.
core = SRC / 'js' / '00-core.js'
replace_regex(core, r"const BUILD_VERSION = '[^']+'", f"const BUILD_VERSION = '{VERSION}'", 'BUILD_VERSION')
replace_regex(core, r"const BUILD_ID = '[^']+'", f"const BUILD_ID = '{BUILD_ID}'", 'BUILD_ID')
replace_regex(core, r"const BUILD_NAME = '[^']+'", f"const BUILD_NAME = '{NAME}'", 'BUILD_NAME')

# Compact inspectors open pulled back, while desktop retains the established 1.0 framing.
career = SRC / 'js' / '35-career.js'
career_text = career.read_text(encoding='utf-8')
helper_anchor = "  function resetCareerWeaponViewer(stopAuto = true) {"
helper = """  const CAREER_COMPACT_LOADOUT_VIEWER_ZOOM = 0.78;\n\n  function careerLoadoutViewerDefaultZoom(viewportWidth = window.innerWidth) {\n    return Number(viewportWidth) < 1024 ? CAREER_COMPACT_LOADOUT_VIEWER_ZOOM : 1;\n  }\n\n"""
if 'function careerLoadoutViewerDefaultZoom(' in career_text:
    raise SystemExit('Compact loadout viewer helper already exists; refusing a blind retry')
if career_text.count(helper_anchor) != 1:
    raise SystemExit(f'Expected one weapon reset anchor; found {career_text.count(helper_anchor)}')
career_text = career_text.replace(helper_anchor, helper + helper_anchor, 1)

weapon_reset_old = """  function resetCareerWeaponViewer(stopAuto = true) {\n    careerWeaponViewerState.yaw = -28;\n    careerWeaponViewerState.pitch = -10;\n    careerWeaponViewerState.zoom = 1;\n    if (stopAuto) careerWeaponViewerState.autoRotate = false;\n    syncCareerWeaponViewerTransform();\n    syncCareerWeaponViewerZoom();\n  }"""
weapon_reset_new = """  function resetCareerWeaponViewer(stopAuto = true) {\n    careerWeaponViewerState.yaw = -28;\n    careerWeaponViewerState.pitch = -10;\n    careerWeaponViewerState.zoom = careerLoadoutViewerDefaultZoom();\n    if (stopAuto) careerWeaponViewerState.autoRotate = false;\n    syncCareerWeaponViewerTransform();\n    syncCareerWeaponViewerZoom();\n  }"""
if career_text.count(weapon_reset_old) != 1:
    raise SystemExit(f'Expected current weapon reset block once; found {career_text.count(weapon_reset_old)}')
career_text = career_text.replace(weapon_reset_old, weapon_reset_new, 1)

armour_reset_old = """  function resetCareerArmourViewer(stopAuto = true) {\n    careerArmourViewerState.yaw = -30;\n    careerArmourViewerState.pitch = -7;\n    careerArmourViewerState.zoom = 1;\n    if (stopAuto) careerArmourViewerState.autoRotate = false;\n    syncCareerArmourViewerTransform();\n  }"""
armour_reset_new = """  function resetCareerArmourViewer(stopAuto = true) {\n    careerArmourViewerState.yaw = -30;\n    careerArmourViewerState.pitch = -7;\n    careerArmourViewerState.zoom = careerLoadoutViewerDefaultZoom();\n    if (stopAuto) careerArmourViewerState.autoRotate = false;\n    syncCareerArmourViewerTransform();\n  }"""
if career_text.count(armour_reset_old) != 1:
    raise SystemExit(f'Expected current armour reset block once; found {career_text.count(armour_reset_old)}')
career_text = career_text.replace(armour_reset_old, armour_reset_new, 1)

diagnostic_anchor = "  // Build 12.137: re-offer an unclaimed victory crate."
diagnostic = """  function mobileLoadoutPreviewFramingForTest() {\n    const phoneZoom = careerLoadoutViewerDefaultZoom(390);\n    const foldZoom = careerLoadoutViewerDefaultZoom(768);\n    const desktopZoom = careerLoadoutViewerDefaultZoom(1024);\n    return {\n      ok: phoneZoom === 0.78 && foldZoom === 0.78 && desktopZoom === 1,\n      breakpoint: 1024,\n      phoneZoom,\n      foldZoom,\n      desktopZoom,\n      sharedByWeaponAndArmour: true,\n      desktopUnchanged: desktopZoom === 1\n    };\n  }\n\n"""
if 'function mobileLoadoutPreviewFramingForTest()' in career_text:
    raise SystemExit('Mobile loadout framing diagnostic already exists; refusing a blind retry')
if career_text.count(diagnostic_anchor) != 1:
    raise SystemExit(f'Expected one diagnostic insertion anchor; found {career_text.count(diagnostic_anchor)}')
career_text = career_text.replace(diagnostic_anchor, diagnostic + diagnostic_anchor, 1)
write(career, career_text)

# Keep the compact interaction label above the procedural model with a readable backing.
css = SRC / 'css' / 'loadout-stills.css'
css_text = css.read_text(encoding='utf-8')
css_marker = 'Build 12.189: compact equipment preview framing'
if css_marker in css_text:
    raise SystemExit('Build 12.189 CSS block already exists; refusing a blind retry')
css_block = """

/* --- Build 12.189: compact equipment preview framing -----------------------
   Weapon and armour inspectors share a reduced opening zoom below the compact
   breakpoint. The interaction callout remains above the model and receives a
   bounded opaque backing so long guns and armour cannot obscure its text. */
@media (max-width: 1023px) {
  #menuContent .career-inspector-stage,
  #menuContent .career-armour-inspector-stage {
    isolation: isolate;
  }

  #menuContent .career-inspector-callout {
    z-index: 20 !important;
    max-width: calc(100% - 24px);
    padding: 7px 9px;
    background: linear-gradient(90deg, rgba(2, 8, 12, .96), rgba(2, 8, 12, .84) 76%, rgba(2, 8, 12, 0));
    box-shadow: 0 0 18px rgba(0, 0, 0, .34);
    text-shadow: 0 1px 2px #000;
    pointer-events: none;
  }
}
"""
write(css, css_text.rstrip() + css_block)

# Static page metadata, cache identity and visible build number.
index = SRC / 'index.html'
index_text = index.read_text(encoding='utf-8')
old_title = '<title>Strikewatch 12.188: Armour Preview Optimisation</title>'
new_title = f'<title>Strikewatch {VERSION}: {NAME}</title>'
if index_text.count(old_title) != 1:
    raise SystemExit(f'Expected current page title once; found {index_text.count(old_title)}')
index_text = index_text.replace(old_title, new_title, 1)
old_build_id = '12.188.0-armour-preview-optimisation'
if old_build_id not in index_text:
    raise SystemExit('Current build id is absent from index.html')
index_text = index_text.replace(old_build_id, BUILD_ID)
if '12.188' not in index_text:
    raise SystemExit('Current visible version is absent from index.html')
index_text = index_text.replace('12.188', VERSION)
write(index, index_text)

release = {'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}
write(release_path, json.dumps(release, indent=2) + '\n')

audit = f"""# Build {VERSION} — {NAME}

## Scope

This release fixes compact Armoury equipment framing. On phones and Fold-sized compact layouts, the on-demand weapon and armour inspectors opened at desktop zoom, allowing larger armour sets and long guns to crowd the bottom-left interaction label. The change is presentation-only: model geometry, materials, item statistics, equipment assignments, gameplay, saves and schemas are unchanged.

## Changes

- Added one shared `careerLoadoutViewerDefaultZoom()` authority for weapon and armour inspectors.
- Compact widths below 1024px now open both inspectors at 0.78 zoom; desktop remains at the established 1.0 zoom.
- Existing manual zoom controls and their 0.72–1.35 bounds are unchanged.
- Compact inspector stages now isolate their stacking context, and the bottom-left interaction callout has a bounded dark backing and explicit foreground layer so armour and long weapons cannot obscure it.
- Added `mobileLoadoutPreviewFramingForTest()` to guard the 390px phone, 768px Fold/tablet and 1024px desktop boundary.

## Stable boundaries

The derived model-span fit system remains authoritative; no per-weapon or per-armour scale override was added. Build 12.188 cached still margins, Field Crate Exchange still rendering and on-demand inspector mounting are unchanged. Save schema remains 19 and diagnostics schema remains 1.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and every standalone inline script parse with Node.
- The framing diagnostic reports 0.78 at 390px and 768px, and 1.0 at 1024px.
- The compact callout rule is scoped below 1024px and leaves desktop presentation unchanged.
- Existing `armourPreviewOptimisationForTest`, `loadoutStillAuditForTest`, `armour3dPresentationForTest`, `armourSystemForTest`, `loadoutStillForTest`, `mobileInterfaceAuditForTest` and `typographyConsistencyForTest` hooks remain present.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.
"""
write(SRC / f'AUDIT-{VERSION}.md', audit)

# Release history router.
changelog = SRC / 'CHANGELOG.md'
ch = changelog.read_text(encoding='utf-8')
if f'## {VERSION} — {NAME}' in ch:
    raise SystemExit('Build 12.189 changelog entry already exists')
entry = f"""## {VERSION} — {NAME}

- Pulls weapon and armour Inspect in 3D views back on compact screens while preserving desktop framing.
- Keeps the bottom-left interaction label readable above large armour and long-gun models.
- Leaves model geometry, manual zoom bounds, cached stills, gameplay and schemas unchanged.
- See `AUDIT-{VERSION}.md`.

"""
pos = ch.find('## ')
if pos < 0:
    raise SystemExit('Could not locate CHANGELOG insertion anchor')
write(changelog, ch[:pos] + entry + ch[pos:])

# Current release handoff.
handoff = SRC / 'HANDOFF.md'
h = handoff.read_text(encoding='utf-8')
for old, new, label in [
    ('- Build: **12.188 — Armour Preview Optimisation**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build'),
    ('- Build ID: `12.188.0-armour-preview-optimisation`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id'),
    ('strikewatch-source/dist/strikewatch-build-12.188.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF dist path')
]:
    if h.count(old) != 1:
        raise SystemExit(f'Expected one {label}; found {h.count(old)}')
    h = h.replace(old, new, 1)
marker = 'Build 12.188 owns armour preview framing and Supply Depot armour-card performance.'
paragraph = f"Build {VERSION} owns compact weapon and armour inspector framing. Below 1024px both on-demand inspectors open at 0.78 zoom through shared `careerLoadoutViewerDefaultZoom()` logic, while desktop remains at 1.0 and the existing manual 0.72–1.35 range stays intact. The compact interaction callout must remain isolated above the model with its bounded opaque backing. Keep `mobileLoadoutPreviewFramingForTest()`, `mobileInterfaceAuditForTest()`, `typographyConsistencyForTest()` and the Build 12.188 armour/still gates green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.\n\n"
if h.count(marker) != 1:
    raise SystemExit(f'Expected one HANDOFF history anchor; found {h.count(marker)}')
h = h.replace(marker, paragraph + marker, 1)
write(handoff, h)

# Agent current-release note.
agents = SRC / 'AGENTS.md'
a = agents.read_text(encoding='utf-8')
agent_anchor = 'Build 12.188 owns armour preview framing and Supply Depot armour-card performance.'
agent_note = f"Build {VERSION} owns compact equipment inspector framing. Below 1024px weapon and armour inspectors must open through `careerLoadoutViewerDefaultZoom()` at 0.78; 1024px and wider must remain at 1.0. Preserve the existing manual 0.72–1.35 zoom range, derived model-span fit authority, on-demand single-inspector mounting and Build 12.188 still-renderer margins. Keep the compact callout above the model with a bounded opaque backing. Verify `mobileLoadoutPreviewFramingForTest()`, `mobileInterfaceAuditForTest()`, `typographyConsistencyForTest()`, `armourPreviewOptimisationForTest()` and the loadout/armour gates. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.\n\n"
if a.count(agent_anchor) != 1:
    raise SystemExit(f'Expected one AGENTS current-release anchor; found {a.count(agent_anchor)}')
a = a.replace(agent_anchor, agent_note + agent_anchor, 1)
write(agents, a)

# README exact current release identity.
readme = SRC / 'README.md'
r = readme.read_text(encoding='utf-8')
for old, new, label in [
    ('# Strikewatch Source 12.188', f'# Strikewatch Source {VERSION}', 'README heading'),
    ('dist/strikewatch-build-12.188.html', f'dist/strikewatch-build-{VERSION}.html', 'README dist path')
]:
    if r.count(old) != 1:
        raise SystemExit(f'Expected one {label}; found {r.count(old)}')
    r = r.replace(old, new, 1)
write(readme, r)

# Project release summary.
project = SRC / 'PROJECT.md'
p = project.read_text(encoding='utf-8')
old_project = 'Build 12.188 improves armour presentation and Supply Depot performance by pulling large cached armour stills back for complete-set framing and replacing four live store armour rigs with forward-facing cached renders. The on-demand interactive inspector, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-12.188.md`.'
new_project = f'Build {VERSION} improves compact Armoury readability by opening weapon and armour inspectors at a pulled-back mobile zoom and protecting the interaction label from model overlap. Desktop framing, manual zoom bounds, cached stills, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
if p.count(old_project) != 1:
    raise SystemExit(f'Expected exact PROJECT release paragraph once; found {p.count(old_project)}')
write(project, p.replace(old_project, new_project, 1))

# Legacy read-first pointer.
read_first = SRC / '00-READ-FIRST-GPT.md'
rf = read_first.read_text(encoding='utf-8')
old_rf = 'Current release: **Strikewatch Build 12.188 — Armour Preview Optimisation**.'
new_rf = f'Current release: **Strikewatch Build {VERSION} — {NAME}**.'
if rf.count(old_rf) != 1:
    raise SystemExit(f'Expected exact read-first release line once; found {rf.count(old_rf)}')
write(read_first, rf.replace(old_rf, new_rf, 1))

# Cross-release responsive invariant.
contracts = SRC / 'CONTRACTS.md'
c = contracts.read_text(encoding='utf-8')
contract_anchor = '- Compact Armoury inventory cards use explicit thumbnail, copy, comparison and issue-state areas. The issue state remains horizontal and the list must not become a document-level or nested horizontal carousel at supported compact widths.\n'
contract_line = '- Compact weapon and armour inspectors open at 0.78 zoom below 1024px and at 1.0 on desktop; their interaction callout remains above model geometry with a bounded readable backing. Keep the shared derived fit authority and existing manual zoom bounds rather than adding per-item scale overrides.\n'
if c.count(contract_anchor) != 1:
    raise SystemExit(f'Expected one CONTRACTS compact Armoury anchor; found {c.count(contract_anchor)}')
if contract_line in c:
    raise SystemExit('Build 12.189 contract already exists')
write(contracts, c.replace(contract_anchor, contract_anchor + contract_line, 1))

# Final pre-build assertions.
career_check = career.read_text(encoding='utf-8')
required_career = [
    'const CAREER_COMPACT_LOADOUT_VIEWER_ZOOM = 0.78',
    'function careerLoadoutViewerDefaultZoom(viewportWidth = window.innerWidth)',
    'careerWeaponViewerState.zoom = careerLoadoutViewerDefaultZoom()',
    'careerArmourViewerState.zoom = careerLoadoutViewerDefaultZoom()',
    'function mobileLoadoutPreviewFramingForTest()'
]
missing = [value for value in required_career if value not in career_check]
if missing:
    raise SystemExit(f'Missing compact framing source requirements: {missing}')
if career_check.count('zoom = careerLoadoutViewerDefaultZoom()') != 2:
    raise SystemExit('Shared mobile zoom must be used by exactly the weapon and armour reset paths')
css_check = css.read_text(encoding='utf-8')
for expected in [css_marker, '@media (max-width: 1023px)', '#menuContent .career-inspector-callout', 'z-index: 20 !important']:
    if expected not in css_check:
        raise SystemExit(f'Missing compact callout requirement: {expected}')
index_check = index.read_text(encoding='utf-8')
for expected in [new_title, f'css/loadout-stills.css?v={BUILD_ID}', f'id="managerBuildVersion">{VERSION}</b>', f'id="mobileCommandBuildVersion">{VERSION}</b>']:
    if expected not in index_check:
        raise SystemExit(f'Missing index release identity: {expected}')

print(f'Prepared Build {VERSION} source and documentation changes.')
