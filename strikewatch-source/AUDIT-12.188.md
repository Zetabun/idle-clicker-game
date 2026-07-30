# Build 12.188 — Armour Preview Optimisation

## Scope

This release responds to the compact Armoury framing issue and the Field Crate Exchange performance hotspot. It changes presentation only: armour geometry, materials, item statistics, purchase rules, assignments, saves and gameplay are unchanged.

## Changes

- Large armour stills now use a 0.82 fit margin, pulling the camera back enough for complete sets to sit comfortably inside the Armoury stage.
- Existing compact inventory thumbnails retain their prior 0.94 fit margin.
- Field Crate Exchange armour cards now use `careerArmourStillMarkup()` with a 0.80 margin instead of `careerArmourVisualMarkup()`, so all four stock items are forward-facing cached canvas renders rather than live rotating CSS-3D rigs.
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
- Large stills use a 0.82 default fit, thumbnails retain 0.94, store cards use 0.80, and the forward-facing view remains yaw 0 / pitch -6.
- Existing `loadoutStillAuditForTest`, `armour3dPresentationForTest`, `armourSystemForTest` and `loadoutStillForTest` hooks remain present.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.
