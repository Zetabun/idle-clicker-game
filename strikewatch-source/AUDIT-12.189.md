# Build 12.189 — Mobile Equipment Preview Framing

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
