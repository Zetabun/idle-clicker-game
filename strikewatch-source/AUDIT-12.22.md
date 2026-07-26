# Strikewatch Build 12.22 Audit — Supply Depot 3D Weapon Stock

## Scope

Build 12.22 restores clear direct access to the AR-4 Sentinel in the Supply Depot and gives every direct weapon offer the same shared 3D presentation used in Team Armoury. It does not change weapon combat values, crate odds, assignment rules, AI, armour, career save schema 19 or diagnostics schema 1.

## Implementation

- Added a permanent AR-4 Sentinel direct cash offer at 58,000 CR and retained the Viper-9 Compact at 32,000 CR.
- Ordered the AR-4 first for immediate visibility on narrow mobile screens.
- Added `cashStoreWeaponVisualMarkup()`, which renders `careerWeapon3dMarkup(weapon, 'store', false, null)` for every offer.
- Added store-specific framing and responsive scaling without creating separate weapon parts.
- Added weapon purchase entries to the cash finance ledger.
- Updated store guidance and active-stock copy.
- Added `cashWeaponStoreForTest()`.

## Completed verification

- `cashWeaponStoreForTest().ok === true`: AR-4 and Viper offers, purchase buttons and shared 3D markup are all present. The AR-4 store card contains 57 authored parts and the Viper card contains 21.
- Direct AR-4 purchase deducted 58,000 CR and added one owned copy; direct Viper purchase deducted 32,000 CR and added one owned copy.
- Store cards and model stages remained contained with no document overflow at 320, 375, 390 and 430px portrait widths and 844x390 landscape.
- `ar4WeaponModelForTest()`, `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()`, `weaponSwitchingForTest()`, `stateIntegrityForTest()`, `armourSystemForTest()`, `operatorWeaponAttachmentForTest()`, `reloadCoverBehaviourForTest()`, `hitReactionFlinchForTest()` and `duneBastionAuditForTest()` passed.
- The headless page reported no JavaScript exceptions or runtime faults.
- Changed modular JavaScript, generated bundle and extracted standalone inline JavaScript passed syntax checks; `build.py` passed `py_compile`.
- Deterministic rebuild and clean extracted-ZIP parity passed.
