# Strikewatch Build 12.18 Audit — AR-4 Procedural Model Pass

## Scope

Build 12.18 upgrades the AR-4 Sentinel visual model across the shared Armoury, first-person and operator-held presentation paths. It does not alter weapon balance, inventory, AI, primary/sidearm switching, armour, economy or save schema 19.

## Implementation

- Added shared part-shape metadata in `js/35-career.js`. Existing weapon parts remain boxes by default.
- Re-authored the AR-4 with rounded stock, receiver, handguard, grip, magazine and optic-mount surfaces.
- Added genuine cylindrical stock rail, gas tube, barrel, muzzle assembly and optic/lens geometry.
- Added CSS 3D cylinder markup for the interactive Armoury and compact inventory previews.
- Updated first-person and third-person WebGL renderers to select cube, rounded-box or cylinder meshes from the same shared part data.
- Far operator LOD retains its cheap core silhouette and all grip/support attachment rules.
- Added `careerAr4ModelAudit()` and `window.__strikeDebug.ar4WeaponModelForTest()`.

## Verification target

- AR-4 model audit passes with finite bounds, required connected parts and minimum rounded/cylindrical coverage.
- Existing attachment, mixed-loadout, weapon-slot, switching, armour, AI and map tests remain green.
- Modular, generated-bundle and standalone JavaScript syntax pass.
- Two consecutive builds are byte-identical, responsive Loadout presentation remains contained and the final ZIP passes integrity/rebuild checks.

## Limitation

Headless Chromium may not provide dependable hardware WebGL. When unavailable, geometry metadata, DOM/CSS structure, mock/runtime debug checks and source-level renderer routing are verified; subtle final lighting should still receive a normal-device glance.

## Completed verification

- `ar4WeaponModelForTest().ok === true`: 49 parts, 21 rounded parts, eight cylindrical parts, all required assemblies present, 841-unit connected length and 81-unit authored depth.
- `operatorWeaponAttachmentForTest()`, `operatorWeaponLoadoutMappingForTest()`, `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()`, `weaponSwitchingForTest()` and `stateIntegrityForTest()` passed.
- `armourSystemForTest()`, `armourMatchAttritionForTest()`, `spectatorArmourHudForTest()`, `operatorPresentationForTest()`, `teamSpacingForTest()` and `duneBastionAuditForTest()` passed as unrelated regressions.
- The live Armoury DOM rendered eight cylinder elements and 21 rounded cuboids for the selected AR-4 with no page exceptions.
- A 390 × 844 portrait validation retained the top bar, contained the Armoury at 390 CSS pixels with no horizontal overflow, and fitted the complete rifle after the small-screen scale correction.
- Modular source, generated bundle and extracted standalone inline JavaScript all passed `node --check`.
- The standalone contains no external script, stylesheet or HTTP asset dependency.
- Two consecutive builds were byte-identical: bundle SHA-256 `9a5c058b09206899e8ea84e518c36afb3cffd91fc8fa6b78ee8577e03537a8de`; standalone SHA-256 `e4ee52bc68f3bf90d64a3d75ad4183a7f564a2a6310b64e0d9148c2ffa58ddb2`.
