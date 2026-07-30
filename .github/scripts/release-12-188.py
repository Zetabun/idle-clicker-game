from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'strikewatch-source'


def write(path, text):
    path.write_text(text, encoding='utf-8', newline='\n')


def replace_once(path, old, new, label):
    text = path.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Missing {label} in {path}')
    write(path, text.replace(old, new, 1))


def replace_regex(path, pattern, replacement, label):
    text = path.read_text(encoding='utf-8')
    updated, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'Could not update {label} in {path}; count={count}')
    write(path, updated)


# Canonical release metadata.
core = SRC / 'js' / '00-core.js'
replace_regex(core, r"const BUILD_VERSION = '[^']+'", "const BUILD_VERSION = '12.188'", 'BUILD_VERSION')
replace_regex(core, r"const BUILD_ID = '[^']+'", "const BUILD_ID = '12.188.0-armour-preview-optimisation'", 'BUILD_ID')
replace_regex(core, r"const BUILD_NAME = '[^']+'", "const BUILD_NAME = 'Armour Preview Optimisation'", 'BUILD_NAME')

# Pull every non-interactive armour still back slightly so the complete set has
# consistent breathing room in the Armoury and other still-image surfaces.
stills = SRC / 'js' / '57-loadout-stills.js'
text = stills.read_text(encoding='utf-8')
old = """    const thumbnail = Boolean(options.thumbnail);\n    const key = `a|${id}|${width}x${height}|${thumbnail ? 't' : 'd'}`;\n    return loadoutStillDataUrl(key, () => loadoutStillRender(\n      thumbnail && typeof careerArmourThumbnailParts === 'function'\n        ? careerArmourThumbnailParts(armour)\n        : careerArmour3dParts(armour),\n      { width, height, fixedHeight: thumbnail, yaw: LOADOUT_STILL_ARMOUR_VIEW.yaw, pitch: LOADOUT_STILL_ARMOUR_VIEW.pitch, armour: true }\n    ));"""
new = """    const thumbnail = Boolean(options.thumbnail);\n    const margin = Number.isFinite(Number(options.margin)) ? Number(options.margin) : 0.82;\n    const key = `a|${id}|${width}x${height}|${thumbnail ? 't' : 'd'}|m${margin.toFixed(3)}`;\n    return loadoutStillDataUrl(key, () => loadoutStillRender(\n      thumbnail && typeof careerArmourThumbnailParts === 'function'\n        ? careerArmourThumbnailParts(armour)\n        : careerArmour3dParts(armour),\n      { width, height, fixedHeight: thumbnail, margin, yaw: LOADOUT_STILL_ARMOUR_VIEW.yaw, pitch: LOADOUT_STILL_ARMOUR_VIEW.pitch, armour: true }\n    ));"""
if old not in text:
    raise SystemExit('Could not locate armour still renderer block')
text = text.replace(old, new, 1)
anchor = "  function loadoutStillAuditForTest() {"
diagnostic = """  function armourPreviewOptimisationForTest() {\n    const sample = typeof getCareerArmour === 'function' ? getCareerArmour('response-carrier') : null;\n    const first = sample ? careerArmourStillDataUrl(sample, { width: 240, height: 280 }) : null;\n    const second = sample ? careerArmourStillDataUrl(sample, { width: 240, height: 280 }) : null;\n    return {\n      ok: Boolean(sample && first && second && first === second),\n      defaultMargin: 0.82,\n      forwardFacingYaw: LOADOUT_STILL_ARMOUR_VIEW.yaw,\n      forwardFacingPitch: LOADOUT_STILL_ARMOUR_VIEW.pitch,\n      cacheReused: Boolean(first && first === second),\n      cachedStills: LOADOUT_STILL_CACHE.size\n    };\n  }\n\n"""
if 'function armourPreviewOptimisationForTest()' not in text:
    if anchor not in text:
        raise SystemExit('Could not locate still-audit anchor')
    text = text.replace(anchor, diagnostic + anchor, 1)
write(stills, text)

# The Field Crate Exchange armour stock was still mounting four live CSS-3D
# rigs. It now consumes the existing cached canvas renderer used by Armoury.
development = SRC / 'js' / '38-development.js'
replace_once(
    development,
    "${typeof careerArmourVisualMarkup === 'function' ? careerArmourVisualMarkup(armour, 'store') : ''}",
    "${typeof careerArmourStillMarkup === 'function' ? careerArmourStillMarkup(armour, { width: 240, height: 280, margin: 0.80, className: 'field-crate-armour-still armour' }) : ''}",
    'Field Crate Exchange armour preview'
)

# Give the cached store still a stable bounded box while preserving the card.
css = SRC / 'css' / 'loadout-stills.css'
css_text = css.read_text(encoding='utf-8')
css_block = """
/* --- Build 12.188: Field Crate Exchange cached armour stills ---------------
   Store cards use the same forward-facing cached canvas renderer as Armoury,
   rather than keeping four continuously composited CSS-3D rigs alive. */
.cash-armour-visual .career-loadout-still.field-crate-armour-still {
  width: min(100%, 240px);
  max-height: 280px;
  margin: 0 auto;
  object-fit: contain;
}
"""
if 'Build 12.188: Field Crate Exchange cached armour stills' not in css_text:
    css_text += css_block
write(css, css_text)

# Expose the deterministic browser diagnostic with the established debug API.
runtime = SRC / 'js' / '70-runtime.js'
runtime_text = runtime.read_text(encoding='utf-8')
needle = "careerReportXpSafetyForTest: () => (typeof careerReportXpSafetyForTest === 'function' ? careerReportXpSafetyForTest() : null),"
addition = needle + "\n      armourPreviewOptimisationForTest: () => (typeof armourPreviewOptimisationForTest === 'function' ? armourPreviewOptimisationForTest() : null),"
if 'armourPreviewOptimisationForTest: () =>' not in runtime_text:
    if needle not in runtime_text:
        raise SystemExit('Could not locate debug API insertion point')
    runtime_text = runtime_text.replace(needle, addition, 1)
write(runtime, runtime_text)

# Static HTML metadata, cache keys and visible version labels.
index = SRC / 'index.html'
index_text = index.read_text(encoding='utf-8')
index_text = index_text.replace('STRIKEWATCH BUILD 12.187', 'STRIKEWATCH BUILD 12.188')
index_text = index_text.replace('BUILD 12.187', 'BUILD 12.188')
index_text = index_text.replace('12.187', '12.188')
write(index, index_text)

release = {
    'version': '12.188',
    'name': 'Armour Preview Optimisation',
    'build_id': '12.188.0-armour-preview-optimisation'
}
write(SRC / 'RELEASE.json', json.dumps(release, indent=2) + '\n')

audit = """# Build 12.188 — Armour Preview Optimisation

## Scope

This release responds to the compact Armoury framing issue and the Field Crate Exchange performance hotspot. It changes presentation only: armour geometry, materials, item statistics, purchase rules, assignments, saves and gameplay are unchanged.

## Changes

- The shared armour still renderer now uses a 0.82 default fit margin, pulling the camera back enough for complete sets to sit comfortably inside the Armoury stage.
- Field Crate Exchange armour cards now use `careerArmourStillMarkup()` instead of `careerArmourVisualMarkup()`, so the four stock items are forward-facing cached canvas renders rather than live rotating CSS-3D rigs.
- Store stills retain the authoritative `careerArmour3dParts()` geometry and CSS-derived materials; no second armour model or palette was introduced.
- Added a bounded store-still CSS rule and `armourPreviewOptimisationForTest()` for forward-angle, cache-reuse and render-availability checks.

## Performance boundary

The optimisation removes four continuously composited armour rigs from the Supply Depot route. The interactive Armoury **Inspect in 3D** viewer remains unchanged and is still mounted only on demand. This release makes no unmeasured battery or thermal claims.

## Stable boundaries

Save schema remains 19 and diagnostics schema remains 1. Armour inventory, durability, purchase prices, assignments and match behaviour are unchanged; no migration is required.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- The Supply Depot source contains the cached still call and no store call to `careerArmourVisualMarkup()`.
- The armour still cache key includes the fit margin and the forward-facing view remains yaw 0 / pitch -6.
- Existing `loadoutStillAuditForTest`, `armour3dPresentationForTest`, `armourSystemForTest` and `loadoutStillForTest` hooks remain present.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.
"""
write(SRC / 'AUDIT-12.188.md', audit)

# Concise release routing documentation.
changelog = SRC / 'CHANGELOG.md'
ch = changelog.read_text(encoding='utf-8')
entry = """## 12.188 — Armour Preview Optimisation

- Pulls cached Armoury armour stills back for complete-set framing.
- Replaces four live Field Crate Exchange armour rigs with forward-facing cached still renders while leaving Inspect in 3D unchanged.
- See `AUDIT-12.188.md`.

"""
if '## 12.188 — Armour Preview Optimisation' not in ch:
    pos = ch.find('## ')
    ch = ch[:pos] + entry + ch[pos:] if pos >= 0 else ch + '\n' + entry
write(changelog, ch)

handoff = SRC / 'HANDOFF.md'
h = handoff.read_text(encoding='utf-8')
h = h.replace('- Build: **12.187 — Report XP Safety**', '- Build: **12.188 — Armour Preview Optimisation**', 1)
h = h.replace('- Build ID: `12.187.0-report-xp-safety`', '- Build ID: `12.188.0-armour-preview-optimisation`', 1)
h = h.replace('strikewatch-source/dist/strikewatch-build-12.187.html', 'strikewatch-source/dist/strikewatch-build-12.188.html', 1)
marker = 'Build 12.187 closes SW-003.'
paragraph = "Build 12.188 owns armour preview framing and Supply Depot armour-card performance. Cached armour stills use a 0.82 default fit margin, while Field Crate Exchange stock must use `careerArmourStillMarkup()` and must not remount live `careerArmourVisualMarkup()` rigs. Keep the forward-facing yaw 0 / pitch -6 view, on-demand Inspect in 3D path and `armourPreviewOptimisationForTest()` green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.188.md`.\n\n"
if paragraph.strip() not in h:
    idx = h.find(marker)
    if idx < 0:
        raise SystemExit('Could not find HANDOFF release-history anchor')
    h = h[:idx] + paragraph + h[idx:]
write(handoff, h)

agents = SRC / 'AGENTS.md'
a = agents.read_text(encoding='utf-8')
a = a.replace('Build 12.187 owns report XP safety.', 'Build 12.188 owns armour preview framing and Supply Depot armour-card performance. Cached armour stills must retain the shared `careerArmour3dParts()` geometry and CSS-derived materials, use the forward-facing yaw 0 / pitch -6 view, and keep a 0.82 default fit margin. Field Crate Exchange stock must use `careerArmourStillMarkup()` rather than live `careerArmourVisualMarkup()` rigs; the on-demand interactive Armoury inspector remains unchanged. Keep `armourPreviewOptimisationForTest()`, `loadoutStillAuditForTest()`, `armour3dPresentationForTest()`, `armourSystemForTest()` and `loadoutStillForTest()` green. Save schema 19 and diagnostics schema 1 remain unchanged. See `AUDIT-12.188.md`.\n\nBuild 12.187 owns report XP safety.', 1)
write(agents, a)

for name in ['README.md', 'PROJECT.md', '00-READ-FIRST-GPT.md']:
    path = SRC / name
    if not path.exists():
        continue
    value = path.read_text(encoding='utf-8')
    value = value.replace('12.187 — Report XP Safety', '12.188 — Armour Preview Optimisation')
    value = value.replace('12.187.0-report-xp-safety', '12.188.0-armour-preview-optimisation')
    value = value.replace('strikewatch-build-12.187.html', 'strikewatch-build-12.188.html')
    write(path, value)

# Final source assertions before the build starts.
if "careerArmourVisualMarkup(armour, 'store')" in development.read_text(encoding='utf-8'):
    raise SystemExit('Live store armour rig call remains')
if "careerArmourStillMarkup(armour, { width: 240, height: 280, margin: 0.80" not in development.read_text(encoding='utf-8'):
    raise SystemExit('Cached store armour still call missing')
print('Prepared Build 12.188 source and documentation changes.')
