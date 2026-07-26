# Strikewatch Build 12.57 Audit

**Release:** Strikewatch Build 12.57 — Light Operator Skin  
**Build ID:** `12.57.0-light-operator-skin`  
**Save schema:** 19, unchanged  
**Diagnostics schema:** 1, unchanged

## Scope and source authority

The complete uploaded Build 12.56 source archive was used as the authority for this release. All **57 incoming Markdown files** were enumerated and read before implementation. This audit brings the package to **58 Markdown files**.

The 52 pre-existing historical audit files were SHA-256 compared with the uploaded Build 12.56 source and remain byte-identical. Current authority documents, the documentation index and the reusable handoff contract were updated for Build 12.57.

Build 12.57 is a presentation-only operator-complexion pass. It makes every visible operator face and neck consistently pale/light in the live WebGL match renderer and in the Armoury fitting mannequin while preserving the Build 12.55 model remaster and all gameplay systems.

## Design decision

The request was to make the skin visible behind the armour and across the face appear white. The implementation deliberately uses six closely related **pale natural tones** rather than one flat pure-white colour. This keeps all operators visibly light while retaining enough warm variation and directional shading for the cheeks, jaw, brow and nose to remain three-dimensional.

Operators remain gloved. No bare-hand geometry or skin material was added to the weapon-hold rig. The exposed-skin contract is the face and neck.

## Live WebGL implementation

### Shared pale palette

`js/62-character-renderer.js` now owns `OPERATOR_SKIN_PRESENTATION`, revision `12.57-light-natural-skin-4`. It contains six deterministic RGB tones:

- `[1.00, 0.91, 0.86]`
- `[0.98, 0.88, 0.82]`
- `[0.96, 0.84, 0.78]`
- `[1.00, 0.94, 0.90]`
- `[0.97, 0.86, 0.80]`
- `[0.99, 0.90, 0.85]`

`operatorVisualSeed()` and `operatorVisualProfile()` still select a stable variant from existing operator identity, slot and team data. No complexion field was added to career persistence.

The calculated palette luminances are:

`0.926, 0.897, 0.861, 0.950, 0.879, 0.916`

The minimum is `0.861` and the maximum is `0.950`; all six tones pass the light-palette contract.

### Dedicated matte skin material

`js/60-renderer-core.js` now owns `OPERATOR_SKIN_MATERIAL`, revision `12.57-light-natural-skin-material-1`:

- material surface: `8`;
- roughness: `0.64`;
- bounded ambient visibility lift: `0.42`.

Surface 8 retains directional key, fill, overhead, rim, fog and ground-occlusion response. The ambient lift prevents pale skin from collapsing into helmet and collar shadows without using the ordinary emissive channel, so it does not behave like a glowing white surface.

The shared living/corpse `drawOperatorHeadAssembly()` path and both living and corpse neck segments use the same surface and roughness. Existing transient hit feedback remains independent of the ordinary skin-lighting authority.

### More visible face exposure

The lower face covering was narrowed and lowered while retaining the helmet, goggles, brow assembly, headset and chin hardware. Its coverage is now:

- width ratio: `0.678` of the head width;
- height ratio: `0.342` of the head height.

Both remain within the documented `0.70` width and `0.36` height limits. The cheeks, upper jaw and neck therefore remain visible behind the protective equipment and armour collar.

## Armoury presentation

`css/game.css` aligns the CSS-3D Armoury mannequin with the live direction through the existing `.operator-skin` face and neck material:

`#fff0e5 → #e8bda7 → #a66d58`

The Supply Depot product forms remain intentionally headless. No mannequin head was added to armour product cards.

`armour3dPresentationForTest()` mounts the detailed Armoury preview, reads the computed `.operator-skin` material and requires all three authored RGB colours before the wider 3D-armour gate can pass.

## Diagnostics

`operatorSkinPresentationAudit()` reports:

- palette and material revision;
- six tone luminances and light-palette status;
- selected deterministic tone;
- surface 8, roughness 0.64 and ambient lift 0.42;
- dedicated skin-lighting status;
- face-cover coverage;
- visible cheeks, upper jaw and neck;
- shared head/neck and living/corpse material status;
- presentation-only collision and hit-detection guarantees.

`js/70-runtime.js` exposes the audit through `operatorSkinPresentationForTest()` and includes it in `operatorModel()`, `operatorHeadGeometryForTest()` and `operatorPresentationForTest()`.

## Preserved gameplay and persistence

Build 12.57 does not change:

- operator attributes, identity data or procedural generation;
- movement, animation timing, leg IK or weapon grips;
- collision volumes, hitboxes or hit detection;
- weapon damage, accuracy, range, ammunition or reload timing;
- armour protection, penetration, integrity or movement penalties;
- bot AI, tactical roles, routes or Live Command Pulse behaviour;
- match rewards, recruitment, transfers, finances or economy;
- save schema 19 or diagnostics schema 1.

## Verification

### Source and generated syntax

- All **32 source JavaScript modules** passed `node --check`.
- `build.py` passed Python bytecode compilation.
- `js/strikewatch.dev.js` passed `node --check`.
- The standalone inline script extracted from `dist/strikewatch-build-12.57.html` passed `node --check`.
- Two consecutive builds were byte-identical:
  - development bundle SHA-256: `3076f5f65f8178b8dae6a071fd9cb413b7b3170fe19fcba5f44beb774b2dd94a`;
  - standalone SHA-256: `87cab8dfbbf50c3ba98925a2d6928f0f22a32ef9cadaaba8eaf3f76bda40d508`.

### Live operator and skin checks

A headed Chromium session under Xvfb with SwiftShader WebGL ran the standalone release at 1280×720.

- Build ID resolved to `12.57.0-light-operator-skin`.
- All ten operator slots passed `operatorSkinPresentationForTest()`.
- All ten operator slots retained the anatomical head, helmet and attachment audit.
- The live close presentation passed with visible cheeks, upper jaw and neck.
- The renderer reported WebGL ready at the full 1280×634 match canvas.
- Runtime fault history remained empty.

The final in-game capture is `strikewatch-12.57-light-skin-preview.png`.

### Living, fallen and weapon presentation

- `operatorPresentationForTest(2.15)` passed with the new skin audit attached.
- Every weapon passed the operator-held presentation:
  - P12 Scrapline;
  - P12 Service;
  - Viper-9 Compact;
  - AR-4 Sentinel.
- Every weapon passed the first-person viewmodel presentation.
- `weaponGeometryIntegrityForTest()` and `operatorWeaponAttachmentForTest()` passed.
- All nine corpse combinations—three distances across three death poses—rendered successfully with the shared skin material.
- `firstEliminationContinuityForTest()` rendered the first elimination without adding a runtime fault.

### Armoury and store regression

`armour3dPresentationForTest()` passed all retained Build 12.54 checks and the new skin check:

- computed Armoury gradient present and light;
- shared full-depth 3D pipeline intact;
- store and detail rigs centred;
- nested 3D groups unflattened;
- four armour classes retained;
- heavy-rig silhouette retained.

### Live Command Pulse and landscape dock regression

A seeded live round produced exactly three context-sensitive command options. Regroup was issued, completed after its normal duration and retained an empty protected-field change list. The command state restored normally with no runtime or application-console faults.

The open command chooser remained inside the dedicated dock beneath the action canvas at:

- 1280×720;
- 844×390;
- 667×375;
- 568×320.

Every viewport reported:

- action stage and dock separated;
- canvas contained by the stage;
- open command panel contained by the dock;
- zero horizontal overflow;
- zero runtime or application-console faults.

### Arena geometry and navigation

All three retained arena-geometry audits passed.

Navigation benchmarks passed exactly:

- Citadel Depot: **80/80**;
- Skyline Offices: **80/80**;
- Dune Bastion: **160/160**.

Each arena then completed an independent **30 simulated seconds** in an isolated headed-Chromium page. Citadel, Office and Dune retained:

- WebGL readiness;
- the Build 12.57 skin audit;
- connected weapon geometry;
- their arena-geometry audit;
- zero runtime faults;
- zero application-originated console errors or warnings.

SwiftShader emitted its known Chromium `ReadPixels` GPU-driver performance notice during screenshot-capable runs. It was not emitted by Strikewatch code and was excluded from the application-console fault count.

### Source diff and documentation integrity

A direct diff against the uploaded Build 12.56 source confirmed that the only hand-edited runtime files are:

- `index.html`;
- `css/game.css`;
- `js/00-core.js`;
- `js/60-renderer-core.js`;
- `js/62-character-renderer.js`;
- `js/70-runtime.js`.

`js/strikewatch.dev.js` and the standalone HTML are generated outputs. No unrelated gameplay JavaScript module differs from Build 12.56.

The current authority documents changed for Build 12.57:

- `00-READ-FIRST-GPT.md`;
- `AGENTS.md`;
- `PROJECT.md`;
- `README.md`;
- `DOCUMENTATION-INDEX.md`;
- `GPT-HANDOFF-PROMPT.txt`;
- `AUDIT-12.57.md`.

All 52 earlier audits remain byte-identical to the uploaded source.

## Release outputs

- Source package: `strikewatch-source-12.57.zip`
- Standalone release: `strikewatch-source-12.57/dist/strikewatch-build-12.57.html`
- In-game preview: `strikewatch-12.57-light-skin-preview.png`
- Audit: `strikewatch-source-12.57/AUDIT-12.57.md`
