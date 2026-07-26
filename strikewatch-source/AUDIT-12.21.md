# Strikewatch Build 12.21 Audit — Reload Cover & Hit Reactions

## Scope

Build 12.21 improves combat behaviour when an operator is reloading without a usable alternate weapon and adds bounded gameplay flinch on a subset of non-fatal hits. It preserves weapon damage, magazines, reload times, armour calculation, navigation geometry, economy, career save schema 19 and diagnostics schema 1.

## Implementation

- Added loaded-alternate detection and explicit reload-cover intent to the Bot combat system.
- Exposed reloaders without an alternate use the existing cover finder and fallback movement while the reload continues.
- Operators continue toward committed cover if the magazine change finishes before arrival.
- Added armour/resilience-aware probabilistic flinch with a 44% chance cap, 0.11–0.22s duration, 0.58–0.82s repeat cooldown and at most 14% temporary movement reduction.
- Flinch interrupts a burst and offsets aim briefly, but does not cancel reloads, weapon swaps or navigation. Fatal hits bypass flinch and retain the established death flow.
- Added restrained third-person and first-person weapon twitch presentation.
- Added optional diagnostic events/counters for reload-cover and flinch activity.
- Added `reloadCoverBehaviourForTest()` and `hitReactionFlinchForTest()`.

## Completed verification

- `reloadCoverBehaviourForTest().ok === true`: no-alternate reload raised cover intent, selected a valid anchor, reduced distance from 1.72m to approximately 0.21m and registered arrival; a distinct loaded sidearm avoided the forced rule.
- `hitReactionFlinchForTest().ok === true`: protected light impact did not flinch, deterministic strong impact triggered within the capped chance/duration, repeat impact was blocked by cooldown and firing was briefly suppressed.
- A 90-second fixed-step Dune match simulation completed a round with active flinch and reload-cover behaviour, with no page exceptions or recorded runtime faults. Observed event counts are validation evidence rather than fixed balance targets.
- `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()`, `weaponSwitchingForTest()`, `stateIntegrityForTest()`, `armourSystemForTest()`, `armourMatchAttritionForTest()`, `spectatorArmourHudForTest()`, `operatorPresentationForTest()`, `operatorWeaponAttachmentForTest()`, `teamSpacingForTest()` and `duneBastionAuditForTest()` passed.
- Changed modular files, generated bundle and extracted standalone inline JavaScript passed syntax checks; `build.py` passed `py_compile`.
- The standalone retains no external script, stylesheet or HTTP asset dependency. The headless validation browser did not expose WebGL, so renderer-independent combat simulation and deterministic presentation audits were used for automated verification.
