# Strikewatch Build 12.55 Audit

**Release:** Strikewatch Build 12.55 — Operator Model Remaster  
**Build ID:** `12.55.0-operator-model-remaster`  
**Audit date:** 23 July 2026  
**Career save schema:** 19  
**Diagnostics schema:** 1

## Scope and source authority

The complete Build 12.54 source archive was used as the authority for this release. All 55 incoming Markdown files were enumerated and read before source changes began. Historical audits were retained unchanged. The current authority documents, documentation index and reusable handoff were updated for Build 12.55, and this audit brings the package to 56 Markdown files.

Build 12.55 is a live WebGL presentation release. It remasters the operator head, helmet, face equipment and major body forms while preserving the established gameplay skeleton, collision and hit-detection dimensions, locomotion, inverse-kinematics anchors, weapon attachment, armour behaviour, combat balance, AI, rewards, economy and career persistence.

## Root cause

The previous operators already used procedural WebGL geometry, but the most visible forms still came from generic primitives:

1. the head and helmet were overlapping rounded volumes with nearly uniform width from brow to chin;
2. the face covering and goggles were box-like pieces placed over those volumes;
3. shoulders, pelvis, carrier and gloves were generic rounded boxes with limited anatomical or equipment-specific shaping; and
4. living and fallen operators had parallel rendering paths, making it easier for visual improvements to diverge between the two states.

At normal spectator distance this produced a readable tactical silhouette, but close views exposed a spherical/block-built head, a weak jaw profile, abrupt body transitions and equipment that appeared stacked rather than fitted.

## Implementation

### Profile-driven character mesh construction

`js/60-renderer-core.js` now provides `makeSmoothIndexedMesh()` and `makeProfiledCharacterMesh()`. The profile builder creates smooth indexed rings from authored width, depth and height samples and supports controlled front/rear modifiers. It is used to build dedicated procedural meshes instead of scaling one generic primitive for every body part.

The registered operator meshes now include:

- `makeOperatorHeadMesh()` with 20 radial segments;
- `makeOperatorHelmetMesh()` with 20 radial segments;
- `makeOperatorFaceCoverMesh()` with 16 radial segments;
- `makeOperatorPelvisMesh()` with 16 radial segments;
- `makeOperatorCarrierMesh()` with 16 radial segments;
- `makeOperatorShoulderPadMesh()` with 16 radial segments;
- `makeOperatorGloveMesh()` with 14 radial segments;
- increased practical tessellation for the existing torso, tapered-capsule limbs, rounded equipment and sphere/cylinder support meshes.

`js/61-world-renderer.js` remains the WebGL buffer-registration authority. No external model, texture, image or third-party rendering dependency was introduced.

### Anatomical head and fitted combat equipment

The new head profile has a narrowed chin and jaw, fuller cheek and brow regions, front/rear asymmetry and a restrained nose projection. The model top remains within the existing silhouette contract at approximately 1.804 world units in the deterministic head audit.

The helmet is now an open-bottom profiled shell rather than a second sphere. The shared head assembly adds:

- a curved and tapered lower-face cover;
- separate framed left and right goggle lenses plus a bridge;
- a shaped brow and front mounting block;
- smooth headset cups;
- visible helmet rails and connected chin straps at full detail;
- restrained team-colour helmet tabs;
- a reduced-detail visor path at distance.

`drawOperatorHeadAssembly()` is now the single living/corpse head authority. Both paths use the same geometry, palette and identity profile so a fallen operator does not revert to an older primitive model.

### Stable operator identity variation

`operatorVisualSeed()` and `operatorVisualProfile()` derive presentation-only variation from stable operator identity. Each operator receives small, bounded differences in head width, height and depth, helmet fit, mask profile and visor treatment, plus one of six deterministic skin tones.

The variation is intentionally subtle. It improves squad readability without changing model height contracts, collision, hitboxes, movement, attributes, AI or gameplay outcomes. The same operator retains the same profile across live, corpse and repeated render passes.

### Body silhouette and material separation

The remaster replaces generic major forms with profiled pelvis, tapered armour carrier, shaped shoulder shell and tapered glove meshes. The neck now uses an anatomical skin segment, limbs keep their established tapered capsule structure, and equipment/boots use softer rounded geometry. Palette and material separation were adjusted so helmet, fabric, carrier, gloves and skin read as distinct fitted layers rather than one dark block.

The existing animation skeleton and draw anchors remain authoritative. The new body meshes replace earlier primitives at those anchors rather than adding a second rig. The deterministic surface audit therefore reports zero additional body draw calls, while head detail remains distance-tiered at 6 low-detail, 12 medium-detail and 18 full-detail draw calls.

### Diagnostics

Build 12.55 adds or expands the following deterministic presentation diagnostics:

- `operatorHeadGeometryAudit()`;
- `operatorHeadGeometryForTest()`;
- `operatorSurfaceGeometryAudit()`;
- `operatorModel()`;
- `operatorPresentationForTest()`.

The diagnostics explicitly report anatomical/profiled mesh use, jaw/brow/nose shaping, open-bottom helmet construction, curved face covering, split lenses, connected headset/chin hardware, stable identity variation, shared living/corpse assembly, model-height compliance and unchanged collision/hit detection.

## Preserved gameplay contracts

The operator remaster does not change:

- navigation or arena collision;
- operator collision radius, hit-detection bounds or target selection;
- movement speed, crouch/run behaviour or animation timing;
- arm inverse kinematics, weapon grips, muzzle anchors or stock seating;
- weapon damage, accuracy, range, penetration, magazines or inventory;
- armour protection, movement penalties, durability, assignment or store values;
- live command behaviour or protected fields;
- rewards, economy, recruitment, progression or save data;
- career save schema 19 or diagnostics schema 1.

Build 12.54 armour presentation, Build 12.53 Live Command Pulses and commentary docking, and Build 12.52 arena geometry/navigation authorities remain intact.

## Verification

### Source, build and packaging gates

- Every modular JavaScript file passed `node --check`.
- `build.py` passed Python bytecode compilation.
- `build.py` generated the development bundle and standalone Build 12.55 release successfully.
- `js/strikewatch.dev.js` passed `node --check`.
- The extracted standalone inline script passed `node --check`.
- The standalone contains exactly one inline script, zero external script sources and zero external stylesheet links.
- Current authority documents contain no stale Build 12.54 source-folder, standalone-file or current-audit references.
- Two consecutive final builds were byte-identical.

Deterministic generated-file SHA-256 values:

- `js/strikewatch.dev.js`: `9eea76d2e45319eb786cbaf631ae5a5b3f37c76d8b264a0d032d051ee0a0edc5`
- `dist/strikewatch-build-12.55.html`: `b0cbeb3af262c0eafef9846f48350b5afaa955406d1548b7c4bebf215010e439`

### Live WebGL operator inspection

The final standalone was loaded in headed Chromium under Xvfb with an actual WebGL context at 1280×720. The renderer reported the Full quality tier and a 1280×634 action canvas above the retained 86-pixel commentary dock.

The deterministic head audit confirmed:

- anatomical profiled head mesh;
- tapered jaw and chin;
- cheek and brow volume;
- restrained nose profile;
- open-bottom helmet shell;
- curved face cover;
- separate goggle lenses;
- connected headset and chin-strap hardware;
- stable identity-based proportions;
- six skin tones;
- one shared living/corpse assembly;
- model-top compliance;
- unchanged gameplay collision and hit detection.

Near and medium-distance operator presentation checks both passed. The full model audit retained a compact silhouette, readable head scale, 1.81 model-top presentation, 0.68 shoulder width and the established animation geometry.

### Weapon, corpse and elimination continuity

The remastered hands, shoulders and head did not disturb weapon attachment:

- AR-4 Sentinel dominant-hand gap: **0.0517**;
- AR-4 Sentinel support-hand gap: **0.0487**;
- AR-4 Sentinel muzzle gap: **0.0300**;
- AR-4 Sentinel stock-seat gap: **0.0095**;
- P12 Service dominant-hand gap: **0.0495**;
- P12 Service support-hand gap: **0.0910**;
- P12 Service muzzle gap: **0.0220**.

All relevant anchors were finite and both weapon classes used the shared procedural weapon model. The aggregate weapon-attachment audit passed.

`corpsePresentationForTest()` passed all nine sampled combinations across three poses and distances of 3, 12 and 24 world units. `firstEliminationContinuityForTest()` also passed with the eliminated operator rendered and no runtime faults.

### Retained systems and layout

The following retained checks completed successfully:

- `allArenaGeometryIntegrityForTest()` for Citadel Depot, Skyline Offices and Dune Bastion;
- Citadel navigation: **80/80**, zero failures, 516 nodes and 2,536 edges;
- Skyline Offices navigation: **80/80**, zero failures, 505 nodes and 2,234 edges;
- Dune Bastion navigation: **160/160**, zero failures, 494 nodes, 2,752 edges and one connected component;
- `armourSystemForTest()`;
- `armour3dPresentationForTest()`;
- seeded armour-loadout mapping;
- seeded primary/sidearm loadout mapping;
- retained Regroup Live Command Pulse issue, active state, completion and one-use state;
- empty command protected-field change lists before and after completion;
- landscape commentary separation and containment.

The landscape check measured the action stage at 1280×634 and the commentary dock at 1280×86 directly below it. The canvas, commentary feed and current match moment remained inside their assigned regions with zero horizontal overflow.

### Thirty-second all-arena simulation

Each arena completed an independent 30-second fixed-step live simulation after the final corpse-shoulder correction:

- Citadel Depot: rendered, 5 vs 5 operators alive at sample end, zero application faults and zero console errors;
- Skyline Offices: rendered, 4 vs 1 operators alive at sample end, zero application faults and zero console errors;
- Dune Bastion: rendered, 5 vs 3 operators alive at sample end, zero application faults and zero console errors.

The complete browser regression run recorded zero uncaught page exceptions, zero console errors and empty runtime-fault arrays. Chromium emitted four repeated OpenGL `ReadPixels` performance warnings during one screenshot/readback path; these are driver-level readback warnings rather than application exceptions and did not occur in the Office or Dune simulation pages.

## Second-pass correction

A second source review after the initial successful browser pass found that one corpse-only mesh assignment had the shaped shoulder shell and soft rounded elbow primitive reversed. The mapping was corrected so the corpse shoulder uses `operatorShoulderPad` and the elbow uses the soft rounded mesh, matching the living assembly. The project was rebuilt, the full WebGL regression suite was rerun successfully, and the 30-second simulations were repeated after this correction.

## Release files

- Modular development entry: `index.html`
- Generated development bundle: `js/strikewatch.dev.js`
- Standalone release: `dist/strikewatch-build-12.55.html`
- Complete source package: `strikewatch-source-12.55.zip`
