# Strikewatch Build 12.56 Audit

**Release:** Strikewatch Build 12.56 — Connected Weapon Geometry  
**Build ID:** `12.56.0-connected-weapon-geometry`  
**Audit date:** 23 July 2026  
**Career save schema:** 19  
**Diagnostics schema:** 1

## Scope and source authority

The complete Build 12.55 source archive was used as the authority for this release. All 56 incoming Markdown files were enumerated and read before source changes began. Historical audits were retained unchanged. The current authority documents, documentation index and reusable handoff were updated for Build 12.56, and this audit brings the package to 57 Markdown files.

Build 12.56 is a weapon-presentation integrity release. It repairs disconnected and apparently floating pieces in live WebGL weapon rendering while preserving the existing authored models, weapon balance, inventory, operator animation rig, AI, armour, economy and persistence.

## Reported fault

The visible symptom was a small piece floating beneath the magazine, most clearly on the AR-4 held by an operator. The detached piece was the authored `mag-base` plate. Additional close inspection found the same underlying risk across all sidearms and both live WebGL contexts, plus two smaller isolated presentation details: sidearm trigger guards and the AR-4 rear sight aperture.

The source weapon geometry itself was not authored with a gap. `careerWeaponVisualParts()` placed each magazine and base in contact. The separation was introduced later by the render transform.

## Root cause

The world-held and first-person renderers scaled authored vertical positions and vertical part sizes with different multipliers.

Before this release:

| Context | Model | Position scale | Size scale |
|---|---|---:|---:|
| World | AR-4 | 0.00104 | 0.00076 |
| World | Sidearms | 0.00132 | 0.00082 |
| Viewmodel | AR-4 | 0.00155 | 0.00102 |
| Viewmodel | Sidearms | 0.00215 | 0.00110 |

Every vertical centre-to-centre distance was therefore expanded more than the neighbouring part heights. A magazine and base that overlapped correctly in authored coordinates became visibly separated after rendering. The same drift also affected hand-anchor calculations because the held-weapon rig duplicated the position scale separately from the visible model.

## Implementation

### One shared WebGL scale authority

`js/35-career.js` now owns `CAREER_WEAPON_RENDER_SCALES` and `careerWeaponRenderScaleProfile()`. The profile resolves length, depth, vertical and first-person forward placement for long-gun and sidearm models in world and viewmodel contexts.

The vertical position and size fields are generated from the same value. Build 12.56 retains the established part sizes and compresses the stretched centre spacing back to the authored proportions:

| Context | AR-4 vertical scale | Sidearm vertical scale |
|---|---:|---:|
| World | 0.00076 | 0.00082 |
| Viewmodel | 0.00102 | 0.00110 |

`operatorSharedWeaponRig()` and `drawUnifiedCareerWeapon()` in `js/62-character-renderer.js` consume the same world profile. `drawViewmodel()` in `js/63-viewmodel-renderer.js` consumes the viewmodel profile. Visible geometry, dominant-hand grip, support-hand grip, muzzle location and AR-4 stock seat therefore use one transform authority.

### Connected magazine reload assembly

`careerWeaponPartMovesWithMagazine()` identifies both `magazine` and `mag-base`. The world and viewmodel reload paths now use this shared helper rather than repeating separate class-name conditions. Release, travel, lateral movement and insertion are applied to both pieces as one assembly.

Reload timing and ammunition behaviour are unchanged. The change only guarantees that the base cannot remain behind or drift away from the magazine during presentation.

### Remaining isolated details

The sidearm trigger guards are reseated through the existing context-aware fit-offset path so they visibly meet the frame in both world and first-person rendering.

The AR-4 rear aperture now includes a small `rear-sight-bridge` behind it. This closes the remaining isolated sight detail while retaining the established low-profile iron-sight silhouette and all weapon anchors.

The shared weapon visual revision is now `12.56-connected-render-scale-1`.

### Rendered connectivity diagnostics

`careerWeaponRenderedPartBounds()` reconstructs each part's scaled, fitted and rotated render bounds. `careerWeaponRenderedPartGap()` measures separation between those bounds. `careerWeaponGeometryIntegrityAudit()` then evaluates every unique model in both contexts and requires:

- four unique weapon models;
- eight model/context samples;
- identical vertical position and size scaling;
- one connected rendered component per sample;
- a present and connected magazine/base assembly;
- one shared reload transform for the magazine and base.

`operatorWeaponAttachmentAudit()` now includes the geometry audit and cannot pass while internal weapon parts are disconnected. `js/70-runtime.js` exposes `weaponGeometryIntegrityForTest()`, and the existing held-pose diagnostic now treats sidearms correctly without requiring a rifle stock seat.

## Preserved gameplay contracts

Build 12.56 does not change:

- damage, accuracy, fire rate, recoil, range or armour penetration;
- magazine capacity, reserve ammunition or reload duration;
- weapon prices, ownership, assignment or slot rules;
- operator movement, inverse-kinematics timing, collision or hit detection;
- AI weapon selection or tactical behaviour;
- armour protection, durability or store presentation;
- rewards, economy, recruitment or progression;
- career save schema 19 or diagnostics schema 1.

Build 12.55 operator geometry, Build 12.54 full-depth armour, Build 12.53 Live Command Pulses and commentary docking, and Build 12.52 arena geometry/navigation remain intact.

## Verification

### Static and generated-code validation

- Every one of the 32 modular source JavaScript files passed `node --check`.
- `build.py` passed Python bytecode compilation.
- The generated `js/strikewatch.dev.js` passed `node --check`.
- The standalone inline JavaScript extracted from `dist/strikewatch-build-12.56.html` passed `node --check`.
- Generated files were produced only through `python3 build.py`; the generated bundle and standalone release were not edited directly.

### Live WebGL weapon verification

Headed Chromium ran the standalone release at 1280×720 with software WebGL enabled. The active build was `12.56.0-connected-weapon-geometry`, the renderer reported WebGL ready, and the browser recorded no uncaught page errors, console errors or console warnings.

`weaponGeometryIntegrityForTest()` passed with:

- **4/4 unique models**;
- **8/8 world/viewmodel samples**;
- **1 connected component in every sample**;
- **0 positive magazine-base gap in every sample**;
- exact vertical position/size scale parity in every sample;
- no disconnected components or failures.

The four verified models were:

- P12 Scrapline — 18 parts;
- P12 Service — 19 parts;
- Viper-9 Compact — 21 parts;
- AR-4 Sentinel — 58 parts.

All four weapons passed `operatorHeldPoseForTest()` and `viewmodelWeaponPresentationForTest()`. The integrated attachment audit passed for career and NPC copies. The AR-4 retained a 0.0517 dominant-hand gap, 0.0487 support-hand gap, 0.0300 muzzle-flash gap and 0.0077 stock-seat gap, all inside the established tolerances. Sidearms retained finite shared-model anchors and do not require a stock-seat result.

The reload diagnostic retained magazine release, full travel, insertion, slide-lock and rack phases. Because both magazine pieces are selected through `careerWeaponPartMovesWithMagazine()`, they follow identical world and viewmodel reload transforms.

### Retained presentation and system regressions

The final browser suite also passed:

- AR-4 shared-model audit;
- weapon slot migration, role balance, switching and reload-audio coverage;
- operator near presentation;
- all corpse pose/distance presentation samples;
- first-elimination render continuity;
- armour system, 3D armour presentation and seeded armour loadouts;
- seeded primary/sidearm loadout mapping;
- Live Command Pulse issue, protected-field, completion and restoration paths;
- landscape commentary-dock containment;
- all-arena geometry integrity.

Navigation benchmarks passed at their retained baselines:

- Citadel Depot: **80/80**, zero failures;
- Skyline Offices: **80/80**, zero failures;
- Dune Bastion: **160/160**, zero failures.

Each arena completed an independent 30-simulated-second WebGL run. Citadel, Office and Dune each retained operator rendering with zero runtime faults, page errors, console errors or warnings.

### Determinism and packaging

The final source was rebuilt twice and the generated development bundle and standalone HTML were byte-identical between builds. The release archive passed a complete ZIP integrity test and an extracted file-by-file comparison against the packaged source tree.

## Files changed

- `index.html`
- `js/00-core.js`
- `js/35-career.js`
- `js/62-character-renderer.js`
- `js/63-viewmodel-renderer.js`
- `js/70-runtime.js`
- `00-READ-FIRST-GPT.md`
- `AGENTS.md`
- `PROJECT.md`
- `README.md`
- `DOCUMENTATION-INDEX.md`
- `GPT-HANDOFF-PROMPT.txt`
- `AUDIT-12.56.md`

Generated by the build process:

- `js/strikewatch.dev.js`
- `dist/strikewatch-build-12.56.html`

## Release outputs

- Source package: `strikewatch-source-12.56.zip`
- Standalone release: `strikewatch-source-12.56/dist/strikewatch-build-12.56.html`
- Audit: `strikewatch-source-12.56/AUDIT-12.56.md`
