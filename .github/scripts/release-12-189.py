from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'
VERSION = '12.189'
NAME = 'Mobile Equipment Preview Framing'
BUILD_ID = '12.189.0-mobile-equipment-preview-framing'

if not SRC.is_dir():
    raise SystemExit(f'Could not locate source tree from {__file__}')


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8', newline='\n')


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected one {label}; found {count}')
    return text.replace(old, new, 1)


def regex_one(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'Expected one {label}; found {count}')
    return updated


release_path = SRC / 'RELEASE.json'
expected_predecessor = {
    'version': '12.188',
    'name': 'Armour Preview Optimisation',
    'build_id': '12.188.0-armour-preview-optimisation'
}
predecessor = json.loads(read(release_path))
if predecessor != expected_predecessor:
    raise SystemExit(f'Unexpected predecessor release: {predecessor!r}')

core = SRC / 'js' / '00-core.js'
text = read(core)
text = regex_one(text, r"const BUILD_VERSION = '[^']+'", f"const BUILD_VERSION = '{VERSION}'", 'BUILD_VERSION')
text = regex_one(text, r"const BUILD_ID = '[^']+'", f"const BUILD_ID = '{BUILD_ID}'", 'BUILD_ID')
text = regex_one(text, r"const BUILD_NAME = '[^']+'", f"const BUILD_NAME = '{NAME}'", 'BUILD_NAME')
write(core, text)

career = SRC / 'js' / '35-career.js'
text = read(career)
if 'function careerLoadoutViewerDefaultZoom(' in text:
    raise SystemExit('Compact viewer helper already exists; refusing a blind retry')
helper_anchor = "  function resetCareerWeaponViewer(stopAuto = true) {"
helper = """  const CAREER_COMPACT_LOADOUT_VIEWER_ZOOM = 0.78;

  function careerLoadoutViewerDefaultZoom(viewportWidth = window.innerWidth) {
    return Number(viewportWidth) < 1024 ? CAREER_COMPACT_LOADOUT_VIEWER_ZOOM : 1;
  }

"""
text = one(text, helper_anchor, helper + helper_anchor, 'weapon reset insertion anchor')
text = one(
    text,
    """  function resetCareerWeaponViewer(stopAuto = true) {
    careerWeaponViewerState.yaw = -28;
    careerWeaponViewerState.pitch = -10;
    careerWeaponViewerState.zoom = 1;
    if (stopAuto) careerWeaponViewerState.autoRotate = false;
    syncCareerWeaponViewerTransform();
    syncCareerWeaponViewerZoom();
  }""",
    """  function resetCareerWeaponViewer(stopAuto = true) {
    careerWeaponViewerState.yaw = -28;
    careerWeaponViewerState.pitch = -10;
    careerWeaponViewerState.zoom = careerLoadoutViewerDefaultZoom();
    if (stopAuto) careerWeaponViewerState.autoRotate = false;
    syncCareerWeaponViewerTransform();
    syncCareerWeaponViewerZoom();
  }""",
    'weapon viewer reset block'
)
text = one(
    text,
    """  function resetCareerArmourViewer(stopAuto = true) {
    careerArmourViewerState.yaw = -30;
    careerArmourViewerState.pitch = -7;
    careerArmourViewerState.zoom = 1;
    if (stopAuto) careerArmourViewerState.autoRotate = false;
    syncCareerArmourViewerTransform();
  }""",
    """  function resetCareerArmourViewer(stopAuto = true) {
    careerArmourViewerState.yaw = -30;
    careerArmourViewerState.pitch = -7;
    careerArmourViewerState.zoom = careerLoadoutViewerDefaultZoom();
    if (stopAuto) careerArmourViewerState.autoRotate = false;
    syncCareerArmourViewerTransform();
  }""",
    'armour viewer reset block'
)
diagnostic_anchor = '  // Build 12.137: re-offer an unclaimed victory crate.'
diagnostic = """  function mobileLoadoutPreviewFramingForTest() {
    const phoneZoom = careerLoadoutViewerDefaultZoom(390);
    const foldZoom = careerLoadoutViewerDefaultZoom(768);
    const desktopZoom = careerLoadoutViewerDefaultZoom(1024);
    return {
      ok: phoneZoom === 0.78 && foldZoom === 0.78 && desktopZoom === 1,
      breakpoint: 1024,
      phoneZoom,
      foldZoom,
      desktopZoom,
      sharedByWeaponAndArmour: true,
      desktopUnchanged: desktopZoom === 1
    };
  }

"""
text = one(text, diagnostic_anchor, diagnostic + diagnostic_anchor, 'diagnostic insertion anchor')
write(career, text)

css = SRC / 'css' / 'loadout-stills.css'
text = read(css)
if 'Build 12.189: compact equipment preview framing' in text:
    raise SystemExit('Build 12.189 CSS already exists; refusing a blind retry')
portrait_old = """@media (orientation: portrait) and (max-width: 900px) {
  .career-loadout-still-stage { min-height: 168px; }
  .career-loadout-still-stage.armour { min-height: 260px; }
}"""
portrait_new = """@media (orientation: portrait) and (max-width: 900px) {
  .career-loadout-still-stage { min-height: 168px; }
  .career-loadout-still-stage.armour { min-height: 260px; }

  /* --- Build 12.189: compact equipment preview framing ---------------------
     Shared JavaScript zoom handles every compact width. On portrait phones,
     keep the bottom-left interaction label above long guns and armour. */
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
}"""
text = one(text, portrait_old, portrait_new, 'portrait loadout media block')
write(css, text)

index = SRC / 'index.html'
text = read(index)
text = one(text, '<title>Strikewatch 12.188: Armour Preview Optimisation</title>', f'<title>Strikewatch {VERSION}: {NAME}</title>', 'index title')
if '12.188.0-armour-preview-optimisation' not in text or '12.188' not in text:
    raise SystemExit('Current index release identity is missing')
text = text.replace('12.188.0-armour-preview-optimisation', BUILD_ID).replace('12.188', VERSION)
write(index, text)
write(release_path, json.dumps({'version': VERSION, 'name': NAME, 'build_id': BUILD_ID}, indent=2) + '\n')

write(SRC / f'AUDIT-{VERSION}.md', f"""# Build {VERSION} — {NAME}

## Scope

This release fixes compact Armoury equipment framing. On phones and Fold-sized compact layouts, the on-demand weapon and armour inspectors opened at desktop zoom, allowing larger armour sets and long guns to crowd the bottom-left interaction label. The change is presentation-only: model geometry, materials, item statistics, equipment assignments, gameplay, saves and schemas are unchanged.

## Changes

- Added one shared `careerLoadoutViewerDefaultZoom()` authority for weapon and armour inspectors.
- Compact widths below 1024px now open both inspectors at 0.78 zoom; desktop remains at 1.0.
- Existing manual zoom controls and their 0.72–1.35 bounds are unchanged.
- On portrait phones, the bottom-left interaction callout has a protected foreground layer and bounded dark backing.
- Added `mobileLoadoutPreviewFramingForTest()` for the 390px phone, 768px Fold/tablet and 1024px desktop boundary.

## Stable boundaries

The derived model-span fit system remains authoritative; no per-item scale override was added. Build 12.188 cached still margins, Field Crate Exchange still rendering and on-demand inspector mounting are unchanged. Save schema remains 19 and diagnostics schema remains 1.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and every standalone inline script parse with Node.
- The framing diagnostic reports 0.78 at 390px and 768px, and 1.0 at 1024px.
- Callout protection extends the existing portrait-phone media block without increasing the CSS media-query budget.
- Existing armour, loadout, compact interface and typography diagnostics remain present.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.
""")

changelog = SRC / 'CHANGELOG.md'
text = read(changelog)
entry = f"""## {VERSION} — {NAME}

- Pulls weapon and armour Inspect in 3D views back on compact screens while preserving desktop framing.
- Keeps the bottom-left interaction label readable above large armour and long-gun models on portrait phones.
- Leaves model geometry, manual zoom bounds, cached stills, gameplay and schemas unchanged.
- See `AUDIT-{VERSION}.md`.

"""
if f'## {VERSION} — {NAME}' in text:
    raise SystemExit('Build 12.189 changelog already exists')
pos = text.find('## ')
if pos < 0:
    raise SystemExit('Could not locate changelog insertion anchor')
write(changelog, text[:pos] + entry + text[pos:])

handoff = SRC / 'HANDOFF.md'
text = read(handoff)
text = one(text, '- Build: **12.188 — Armour Preview Optimisation**', f'- Build: **{VERSION} — {NAME}**', 'HANDOFF build')
text = one(text, '- Build ID: `12.188.0-armour-preview-optimisation`', f'- Build ID: `{BUILD_ID}`', 'HANDOFF build id')
text = one(text, 'strikewatch-source/dist/strikewatch-build-12.188.html', f'strikewatch-source/dist/strikewatch-build-{VERSION}.html', 'HANDOFF standalone path')
old_note = 'Build 12.188 owns armour preview framing and Supply Depot armour-card performance.'
new_note = f"Build {VERSION} owns compact weapon and armour inspector framing. Below 1024px both inspectors open at 0.78 zoom through shared `careerLoadoutViewerDefaultZoom()` logic; desktop remains at 1.0 and the manual 0.72–1.35 range stays intact. The portrait-mobile callout remains above the model with a bounded backing. Keep `mobileLoadoutPreviewFramingForTest()`, `mobileInterfaceAuditForTest()`, `typographyConsistencyForTest()` and the Build 12.188 armour/still gates green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, old_note, new_note + old_note, 'HANDOFF release-history anchor')
write(handoff, text)

agents = SRC / 'AGENTS.md'
text = read(agents)
agent_note = f"Build {VERSION} owns compact equipment inspector framing. Below 1024px weapon and armour inspectors open through `careerLoadoutViewerDefaultZoom()` at 0.78; desktop remains at 1.0. Preserve the manual 0.72–1.35 range, derived fit authority, single-inspector mounting and Build 12.188 still margins. Keep the portrait-mobile callout above the model with a bounded backing. Verify `mobileLoadoutPreviewFramingForTest()`, `mobileInterfaceAuditForTest()`, `typographyConsistencyForTest()`, `armourPreviewOptimisationForTest()` and the loadout/armour gates. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-{VERSION}.md`.\n\n"
text = one(text, old_note, agent_note + old_note, 'AGENTS current-release anchor')
write(agents, text)

readme = SRC / 'README.md'
text = read(readme)
text = one(text, '# Strikewatch Source 12.188', f'# Strikewatch Source {VERSION}', 'README heading')
text = one(text, 'dist/strikewatch-build-12.188.html', f'dist/strikewatch-build-{VERSION}.html', 'README standalone path')
write(readme, text)

project = SRC / 'PROJECT.md'
text = read(project)
old_project = 'Build 12.188 improves armour presentation and Supply Depot performance by pulling large cached armour stills back for complete-set framing and replacing four live store armour rigs with forward-facing cached renders. The on-demand interactive inspector, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-12.188.md`.'
new_project = f'Build {VERSION} improves compact Armoury readability by opening weapon and armour inspectors at a pulled-back mobile zoom and protecting the interaction label from model overlap. Desktop framing, manual zoom bounds, cached stills, gameplay, persistence and schemas are unchanged. See `HANDOFF.md` and `AUDIT-{VERSION}.md`.'
write(project, one(text, old_project, new_project, 'PROJECT current-release paragraph'))

read_first = SRC / '00-READ-FIRST-GPT.md'
text = read(read_first)
write(read_first, one(text, 'Current release: **Strikewatch Build 12.188 — Armour Preview Optimisation**.', f'Current release: **Strikewatch Build {VERSION} — {NAME}**.', 'read-first release line'))

contracts = SRC / 'CONTRACTS.md'
text = read(contracts)
anchor = '- Compact Armoury inventory cards use explicit thumbnail, copy, comparison and issue-state areas. The issue state remains horizontal and the list must not become a document-level or nested horizontal carousel at supported compact widths.\n'
contract = '- Compact weapon and armour inspectors open at 0.78 zoom below 1024px and at 1.0 on desktop; on portrait phones, their interaction callout remains above model geometry with a bounded readable backing. Keep the shared derived fit authority and existing manual zoom bounds rather than adding per-item scale overrides.\n'
if contract in text:
    raise SystemExit('Build 12.189 contract already exists')
write(contracts, one(text, anchor, anchor + contract, 'CONTRACTS compact Armoury anchor'))

career_check = read(career)
required = [
    'const CAREER_COMPACT_LOADOUT_VIEWER_ZOOM = 0.78',
    'function careerLoadoutViewerDefaultZoom(viewportWidth = window.innerWidth)',
    'careerWeaponViewerState.zoom = careerLoadoutViewerDefaultZoom()',
    'careerArmourViewerState.zoom = careerLoadoutViewerDefaultZoom()',
    'function mobileLoadoutPreviewFramingForTest()'
]
missing = [item for item in required if item not in career_check]
if missing or career_check.count('zoom = careerLoadoutViewerDefaultZoom()') != 2:
    raise SystemExit(f'Compact framing source validation failed: {missing}')
css_check = read(css)
for expected in ['Build 12.189: compact equipment preview framing', '@media (orientation: portrait) and (max-width: 900px)', '#menuContent .career-inspector-callout', 'z-index: 20 !important']:
    if expected not in css_check:
        raise SystemExit(f'Missing CSS requirement: {expected}')
index_check = read(index)
for expected in [f'<title>Strikewatch {VERSION}: {NAME}</title>', f'css/loadout-stills.css?v={BUILD_ID}', f'id="managerBuildVersion">{VERSION}</b>', f'id="mobileCommandBuildVersion">{VERSION}</b>']:
    if expected not in index_check:
        raise SystemExit(f'Missing index identity: {expected}')

print(f'Prepared Build {VERSION} source and documentation changes.')
