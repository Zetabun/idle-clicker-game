# Strikewatch Build 12.19 Audit — AR-4 Iron-Sight Refinement

## Scope

Build 12.19 refines the shared AR-4 Sentinel model and removes its scope across Armoury, first-person and operator-held presentation. It does not alter weapon balance, inventory, AI, armour, economy, save schema 19 or diagnostics schema 1.

## Implementation

- Removed `optic-base`, `optic-body`, both optic lenses and `optic-hood` from the authoritative AR-4 part list.
- Replaced the scope with compact front/rear flip-up iron sights on a lower top rail.
- Tightened stock, receiver, handguard, grip and muzzle proportions and added small receiver/endcap details.
- Kept the existing shared model pipeline, functional hand anchors, reload movement and model-bounds muzzle placement.
- Updated the AR-4 deterministic audit to require iron sights, reject legacy optic parts and enforce a lower upper profile.

## Verification target

- `ar4WeaponModelForTest()` reports `scopeRemoved === true`, `lowProfileSights === true` and passes finite/connected geometry thresholds.
- Live Armoury markup contains no `optic-*` elements and includes both front/rear iron-sight assemblies.
- Existing attachment, mixed-loadout, weapon-slot, switching, armour, state and map regressions remain green.
- Source bundle and standalone syntax pass, two builds are byte-identical, and the packaged ZIP rebuilds to the delivered standalone.

## Completed verification

- `ar4WeaponModelForTest().ok === true`: 57 connected parts, 23 rounded parts and six cylindrical parts; all required front/rear iron-sight parts are present, all legacy optic parts are absent, and the authored top bound is reduced to `-138`.
- The live Armoury rendered the selected AR-4 with zero `optic-*` elements, two rear-sight elements, two front-sight elements, six CSS 3D cylinders and 23 rounded cuboids.
- `operatorWeaponAttachmentForTest()`, `operatorWeaponLoadoutMappingForTest()`, `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()`, `weaponSwitchingForTest()` and `stateIntegrityForTest()` passed.
- `armourSystemForTest()`, `armourMatchAttritionForTest()`, `spectatorArmourHudForTest()`, `operatorPresentationForTest()`, `teamSpacingForTest()` and `duneBastionAuditForTest()` passed as unrelated regressions; runtime fault capture remained empty.
- At 320, 375, 390 and 430 CSS-pixel portrait widths, document/body scroll width matched the viewport, the inspector stayed inside its content bounds, the top bar remained visible and no optic elements appeared.
- Every modular/generated JavaScript file and the extracted standalone inline script passed `node --check`; `build.py` passed `py_compile`.
- The standalone contains no external script, stylesheet or HTTP asset dependency and no authored AR-4 optic-construction call.
- Two consecutive builds were byte-identical: bundle SHA-256 `f97b1360916ded2d2a14a926bee0ae35cdb7b71579312def2adf70488ee9602a`; standalone SHA-256 `6b146649267b186d2e81b37638c1a38921b69910f2e1c726ed95263032a14b83`.
