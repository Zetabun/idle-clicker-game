# Strikewatch Build 12.54 Audit

**Release:** Strikewatch Build 12.54 — Full-Depth 3D Armour  
**Build ID:** `12.54.0-full-depth-3d-armour`  
**Audit date:** 23 July 2026  
**Career save schema:** 19  
**Diagnostics schema:** 1

## Scope and source authority

The complete Build 12.53 source archive was used as the authority for this release. All 54 incoming Markdown files were enumerated and read before source changes began. Historical audits were retained unchanged. The current authority documents, documentation index and reusable handoff were then updated for Build 12.54, and this audit brings the package to 55 Markdown files.

Build 12.54 is a presentation and rendering release. It redesigns the purchasable armour models and their Supply Depot / Armoury presentation without changing protection, penetration, movement, handling, fatigue, prices, ownership, assignment, durability, break behaviour, combat rewards, economy, career persistence or live-match balance.

## Root cause

The previous armour was already assembled from CSS-3D primitives, but two presentation faults made it read like a flat layered image:

1. the model was front-heavy, with much less authored rear and wraparound structure than the gun models; and
2. parent `filter` and reduced `opacity` effects were applied to nested CSS-3D rig groups.

Those parent compositing effects flattened descendants that otherwise used `transform-style: preserve-3d`. The result was a stack of similarly lit panels rather than one coherent volume. Build 12.54 removes those effects from the parent store-form, operator-body and armour-system rigs and applies subdued lighting to individual faces instead.

## Implementation

### Full-depth shared armour geometry

`js/35-career.js` remains the single procedural armour-model authority. `careerArmourModelProfile()` now defines additional class-specific depth and rear-assembly proportions. `careerArmour3dParts()` now authors:

- faceted front shell cores and wings;
- faceted rear shell cores and wings;
- full-depth shoulder bridges and yoke structure;
- wraparound cummerbund and rib structures;
- connected side pockets, plates and buckles;
- layered front plate pockets, plates, MOLLE, pouches and clips;
- rear plate pocket and hard plate;
- rear MOLLE, identification panel and drag handle;
- front and rear straps, collars, shoulder protection and hems;
- class-specific abdomen, groin, radio and full-wrap utility details.

The Supply Depot products contain 75, 83, 97 and 105 armour primitives respectively for Scout Weave, Response Carrier, Guardian Plate and Bastion Heavy, plus a ten-part display form in each card. All geometry remains authored HTML/CSS with no external image, texture or model dependency.

### Store product presentation

`careerArmourStoreFormParts()` adds a restrained headless product form with a connected torso, neck, shoulders, stand and base. Store cards now use:

- a full-width perspective stage;
- class-specific scale normalisation;
- face-specific directional lighting;
- a complete 360-degree 18-second orbit with readable front and rear three-quarter pauses;
- hover/focus pause behaviour;
- a static three-quarter reduced-motion fallback;
- a clear Full-Depth 3D / Front–Side–Rear presentation label.

At the release viewports, the live card stages measured 315×222 CSS pixels in 390×844 portrait and 230×206 CSS pixels in 844×390 landscape. Both layouts contained four cards with no page-level horizontal overflow.

### Armoury inspection

`careerArmourOperatorBodyParts()` now uses a larger upper-body fitting mannequin so the armour remains the focus while neck, shoulder, waist and arm fit can still be judged. The Armoury stage was enlarged and keeps all existing interaction:

- pointer drag and touch swipe rotation;
- rotate buttons;
- wheel and button zoom;
- reset;
- optional auto-rotation.

The final Bastion Heavy detail stage measured 344×318 CSS pixels at 390×844. The mounted interaction check changed the rig from `-30deg` yaw / `1.1600` scale to `-6deg` yaw / `1.2992` scale after Rotate Right and Zoom In, confirming that the retained controls still update the model.

### No-flattening invariant

The following parent groups are explicitly required to retain `filter: none`, opacity `1` and `transform-style: preserve-3d`:

- `.career-armour-store-form`;
- `.career-armour-operator-body`;
- `.career-armour-weapon-system`.

`armour3dPresentationForTest()` mounts the store and detail markup and checks this computed-style contract in addition to shared-pipeline use, full-depth feature parts, centred child rigs, large responsive stages, full orbit, operator fit and class-separated live WebGL silhouettes.

## Verification

### Source, build and packaging gates

- Every modular JavaScript file passed `node --check`.
- `build.py` passed Python bytecode compilation.
- `build.py` generated the development bundle and standalone Build 12.54 release successfully.
- `js/strikewatch.dev.js` passed `node --check`.
- The extracted standalone inline script passed `node --check`.
- The standalone contains zero external stylesheet links and zero external script sources.
- Two consecutive builds were byte-identical.

Deterministic generated-file SHA-256 values:

- `js/strikewatch.dev.js`: `7371f8e2877431830d09bc90130082486b352163ad4c6cf4ccf5620c2042ddc1`
- `dist/strikewatch-build-12.54.html`: `cd7591453b6152105d74a4e85655ad9e08d933d0eb9c22cb82e29e05d6137845`

### 3D presentation and responsive gates

`armour3dPresentationForTest()` passed in both 390×844 portrait and 844×390 landscape. The mounted checks confirmed:

- four unique purchasable armour classes;
- shared cuboid/cylinder model pipeline;
- a store display form in every card;
- full-depth front, side and rear feature geometry;
- centred store and detail rigs;
- complete store orbit animation and active perspective;
- unflattened parent 3D groups;
- operator-fitted detail model and interactive controls;
- heavy armour remaining broader and deeper than light armour in the retained live-render profile.

All tested pages recorded zero uncaught page exceptions. The CSS-3D armour/store presentation rendered and was visually inspected in generated portrait and landscape screenshots.

### Retained deterministic systems

The following retained checks completed successfully:

- `armourSystemForTest()`;
- `armourMatchAttritionForTest()`;
- `armourLoadoutMappingForTest()`;
- `cashWeaponStoreForTest()`;
- seeded `dynamicTransferMarketForTest()`;
- `openingWeekFlowForTest()`;
- `performanceClassificationForTest()`;
- `runtimeQualityGovernorForTest()` lowered quality and restored state;
- `workflowIntegrityForTest()` reported no dirty current route and no pending action;
- `allArenaGeometryIntegrityForTest()`.

Navigation benchmarks retained their requested success counts:

- Citadel Depot: **80/80**, zero failures;
- Skyline Offices: **80/80**, zero failures;
- Dune Bastion: **160/160**, zero failures.

Dune retained its exact 494-node, 2,752-edge, one-component navigation baseline. Existing Build 12.53 command-pulse code, landscape commentary docking and Build 12.52 arena presentation/collision authorities were not modified.

## Environment limitation

The available headless Chromium executable did not expose a WebGL context, including when SwiftShader-related launch flags were tested. It therefore emitted the existing WebGL/reward-renderer availability messages and could not provide a new live WebGL scene render pass in this environment. This is recorded rather than treated as a product-code regression: the Build 12.54 feature itself is the browser CSS-3D store/inspection pipeline, all tested pages had zero uncaught page exceptions, and the deterministic `operatorArmourRenderProfile()` class comparisons plus all retained armour gameplay tests passed.

## Release files

- Modular development entry: `index.html`
- Generated development bundle: `js/strikewatch.dev.js`
- Standalone release: `dist/strikewatch-build-12.54.html`
- Complete source package: `strikewatch-source-12.54.zip`
