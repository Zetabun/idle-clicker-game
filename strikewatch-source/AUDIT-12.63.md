# Strikewatch Build 12.63 Audit

## Release

- **Build:** 12.63 — Armoury 3D Preview Optimisation
- **Build ID:** `12.63.0-armoury-3d-preview-optimisation`
- **Source folder:** `strikewatch-source-12.63/`
- **Standalone:** `dist/strikewatch-build-12.63.html`
- **Save schema:** 19, unchanged
- **Diagnostics schema:** 1, unchanged

All 63 incoming Markdown files were reviewed before implementation. Current authority documents were updated for this release; historical audit files were retained unchanged.

## Scope

This pass targets the Armoury loadout page where several procedural 3D armour models were mounted at once. The selected armour inspector previously combined the complete vest with a 17-part operator inspection bust, even though the page only needed to present the chest protection. The inventory also mounted every vest with its complete detail geometry and promoted static thumbnails to compositor layers.

Build 12.63 keeps the shared full-depth CSS 3D armour pipeline and all front, side and rear inspection controls, but removes work that does not contribute to the Armoury decision:

1. the selected inspector renders the armour product only;
2. inventory cards use reduced full-depth thumbnail geometry;
3. static models no longer reserve transform compositor layers or use expensive parent drop shadows;
4. offscreen inventory rows use browser content visibility;
5. automatic rotation pauses when the inspector is outside the viewport.

The live in-match WebGL operator and armour renderer, Supply Depot product presentation and all armour gameplay values remain unchanged.

## Implementation

### Chest-piece-only inspector

`js/35-career.js` now gives `careerArmourRigMarkup()` explicit product-only and compact-thumbnail modes. `careerArmourVisualMarkup(..., 'detail')` uses the product-only mode, which mounts the complete authored vest without `careerArmourOperatorBodyParts()` or the Supply Depot product form.

- The heavy vest still mounts all **105 authored armour parts**.
- The former **17 operator-body parts** are absent.
- Front, side and rear volume, shoulder protection, neck guard, abdomen, groin, radio, plates, straps, cummerbund and rear structures remain present.
- Drag/swipe, rotate buttons, zoom, reset and optional auto rotation remain available.
- The stage label now accurately states **ARMOUR ONLY · COMPLETE 360° MODEL**.
- The product scale and centring were adjusted so removing the operator does not make the vest look undersized.

### Compact 3D inventory models

`careerArmourThumbnailParts()` derives a reduced geometry set from the same authoritative armour definitions. It retains the recognisable shell, plates, shoulder/neck protection, cummerbund, straps, pouches and class-specific equipment while omitting details too small to materially help a list-level decision.

For the four purchasable armour classes, full and compact authored part counts are:

| Armour order | Full parts | Compact parts |
|---|---:|---:|
| Scout Weave | 75 | 29 |
| Response Carrier | 83 | 33 |
| Guardian Plate | 97 | 35 |
| Bastion Heavy | 105 | 38 |

Including the No Armour harness shown in the inventory, the mounted list falls from **401 to 158 authored 3D parts**, a **60.6% reduction**. Every retained part remains a full-depth cuboid or cylinder with preserved 3D transforms rather than a flat image.

### Rendering and compositing controls

The final Build 12.63 layer in `css/game.css`:

- removes unconditional `will-change: transform` from Armoury models;
- promotes only an actively dragged or auto-rotating inspector;
- removes the parent drop-shadow filter from compact inventory rigs;
- applies containment to preview stages and inventory rows;
- enables `content-visibility: auto` for offscreen armour rows;
- preserves the Supply Depot's full product-form orbit and complete geometry.

`updateCareerArmourViewer()` now returns when the document is hidden, no inspector exists, or the inspector bounds are outside the viewport. Auto rotation resumes normally when the product is visible.

## Visual verification

The real Armoury route was seeded with all four armour classes, Bastion Heavy was selected, and the chest-only inspector was captured at:

- 390 × 844 portrait mobile;
- 844 × 390 compact landscape;
- 1366 × 768 desktop.

At all three sizes:

- the selected model was the vest alone;
- zero operator-body or store-form rigs were present;
- the heavy vest retained all 105 armour parts;
- the model was centred and readable;
- inspector controls remained reachable;
- document width matched viewport width.

## Interaction and performance verification

The mounted 390 × 844 Armoury inspector passed real interaction checks:

- Rotate Right changed yaw from `-30deg` to `-6deg`.
- Zoom In changed scale from `1.4200` to `1.5904`.
- A CDP pointer drag changed yaw and pitch and released the dragging state correctly.
- Auto rotation changed yaw while the inspector was visible.
- After the inspector was scrolled to more than 5,200 pixels below the viewport, yaw remained unchanged for the observation period, confirming offscreen pause.
- Five compact inventory rigs mounted 158 parts with zero operator-body rigs.

`armour3dPresentationForTest()` now verifies product-only detail, full retained heavy geometry, compact inventory reduction, static-layer behaviour, full-depth store presentation and the unchanged live WebGL class distinction. It returned `ok: true`.

## Route and retained-system regression

All 24 management routes were forced and measured at:

- 320 × 720;
- 390 × 844;
- 844 × 390;
- 1024 × 768;
- 1366 × 768.

This produced **120 route/viewport combinations** with:

- zero document-level horizontal-overflow failures;
- zero menu-shell viewport failures;
- zero non-WebGL console exceptions.

The following retained diagnostics returned `ok: true`:

- `armour3dPresentationForTest()`
- `armourLoadoutMappingForTest()`
- `typographyConsistencyForTest()`
- `onboardingClarityForTest()`
- `newPlayerOrientationForTest()`
- `firstMatchGuidanceForTest()`
- `progressiveInterfaceForTest()`
- `economyGuidanceForTest()`
- `stateIntegrityForTest()`

## Source and build checks

- `python3 -m py_compile build.py` passed.
- Every modular JavaScript source file passed `node --check`.
- The generated `js/strikewatch.dev.js` passed `node --check`.
- JavaScript extracted from the standalone HTML passed `node --check`.
- `index.html` contains 273 IDs with no duplicate ID.
- Two consecutive production builds were byte-identical.

Final SHA-256 values:

```text
e993c37396176d7e15952f5430e1bd3c13d03f2c7ac4cd84bc6493fcc067adb6  js/strikewatch.dev.js
e9975d35882d37d2c04f6a8e496f3b644e81a66abd18b239b490e764c9ffbdea  dist/strikewatch-build-12.63.html
```

## Preserved authorities

This release does not change:

- armour protection, rating, durability, penetration, mobility, handling, fatigue, pricing, ownership or assignment;
- live WebGL operator or armour geometry;
- the Supply Depot's full-depth headless product forms and orbit;
- match simulation, AI, weapons or animation;
- navigation, onboarding, progression, economy or calendar settlement;
- save schema 19 or diagnostics schema 1.

## Environment limitation

The automated Chromium environment did not expose a WebGL context. It fully rendered and exercised the Armoury's CSS 3D product models, DOM geometry, controls, scrolling and route state, but could not judge live arena WebGL pixels. Build 12.63 does not modify the live renderer.
