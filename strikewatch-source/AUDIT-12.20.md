# Strikewatch Build 12.20 Audit — AR-4 Held-Pose Refinement

## Scope

Build 12.20 improves the third-person/operator-held AR-4 posture. It does not alter the shared rifle model, first-person placement, weapon balance, inventory, AI decisions, armour, economy, collision, hit detection, save schema 19 or diagnostics schema 1.

## Implementation

- Added `OPERATOR_LONG_GUN_POSE` in `js/62-character-renderer.js` for contextual third-person placement of the complete shared rifle rig.
- Shifted the operator-held AR-4 toward the dominant shoulder, lifted it to a ready height and pulled it rearward so the butt pad seats in the shoulder pocket.
- Kept the firing hand attached to the authored `pistol-grip`, the support hand attached to `support-grip`, and the muzzle attached to the shared model bounds.
- Extended `operatorSharedWeaponRig()` to expose the stock-seat point derived from the authored butt-pad component.
- Extended `operatorWeaponAttachmentAudit()` with `stockSeat` / `stockSeatGap` and a 0.075m maximum rifle-seat threshold.
- Added `operatorHeldPoseForTest()` to create a frozen three-quarter WebGL inspection pose with an AR-4-equipped target.

## Completed verification

- `operatorWeaponAttachmentForTest().ok === true`.
- AR-4 stock seat: `{ x: 0.2000, y: 1.2812, z: 0.0364 }`; shoulder-pocket gap: `0.0095m`.
- Existing AR-4 hand/muzzle thresholds remain green: dominant-hand gap `0.0517m`, support-hand gap `0.0487m`, muzzle gap `0.0300m`.
- `operatorHeldPoseForTest().ok === true` in a live 1280×720 WebGL renderer with no page exceptions or runtime faults.
- `ar4WeaponModelForTest()`, `operatorWeaponLoadoutMappingForTest()`, `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()`, `weaponSwitchingForTest()` and `stateIntegrityForTest()` passed.
- `armourSystemForTest()`, `armourMatchAttritionForTest()`, `spectatorArmourHudForTest()`, `operatorPresentationForTest()`, `teamSpacingForTest()` and `duneBastionAuditForTest()` passed as unrelated regressions.
- `node --check` passed for changed modular files and the extracted standalone inline script; `build.py` passed `py_compile`.
- The standalone contains no external script, stylesheet or HTTP asset dependency.
- Two consecutive builds were byte-identical: bundle SHA-256 `cc8f3636ad3d1ef05d24bc29590863aa77174441a735a8fc9edf78c57ef6e3b1`; standalone SHA-256 `064535acd78a073ee1894ad2c8a949883a34727e44b328336866ea435bb692a3`.
