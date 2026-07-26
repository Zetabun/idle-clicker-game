# Strikewatch Build 12.14 Audit

Audit date: 19 July 2026  
Build: `12.14.0-20260719` — **Weapon Attachment Integrity Pass**

## Goal

Verify that each operator displays the weapon actually issued to that slot and correct shared-model attachment drift across first person, living operators, corpses and distance LOD without changing combat or inventory behaviour.

## Findings corrected

- The AR-4 first-person dominant hand searched only for a pistol-style `grip`; because the rifle authors `pistol-grip`, it fell back to a generic hand position.
- Living shared-model operators used generic pistol/rifle hand coordinates instead of the equipped model's authored grip and support geometry.
- Living hand height added `bodyBob` a second time after `rifleY` already contained it, allowing movement bob to separate hands from the weapon.
- Shared-model muzzle flashes used legacy hard-coded distances rather than the actual model bounds, leaving a visible gap in front of P12/Viper weapons and a larger gap in front of the AR-4.
- Far AR-4 LOD did not classify `pistol-grip` or `support-grip` as essential held-silhouette geometry.

## Changes

- Added shared `careerWeaponGripPart()` and `careerWeaponSupportPart()` resolvers.
- Added `operatorSharedWeaponRig()` using the exact world-model origin, scale, pitch and roll to derive dominant hand, support hand and muzzle positions.
- Living operators now use those model-driven anchors for P12 Scrapline, P12 Service, Viper-9, AR-4 and the three simulated starter variants.
- First-person AR-4 now anchors the dominant hand to `pistol-grip`.
- Shared-model muzzle flashes now sit 0.022m beyond pistol bounds and 0.030m beyond AR-4 bounds.
- Operator hand world placement applies body bob once.
- Far LOD retains AR-4 pistol/support grips.
- Added `operatorWeaponAttachmentForTest()` and `operatorWeaponLoadoutMappingForTest()`.

## Verification

- Attachment audit passed all seven owned/simulated catalog entries with zero failures.
- Pistol dominant-hand gap: 0.0495m; support-hand gap: 0.0910m; muzzle gap: 0.0220m.
- AR-4 dominant-hand gap: 0.0517m; support-hand gap: 0.0487m; muzzle gap: 0.0300m.
- All anchors were finite and every AR-4 far-LOD grip requirement was retained.
- A mixed five-player loadout mapped Scrapline, Service, Viper, AR-4 and Service to owned slots 0–4 exactly; all ten active operators reported matching primary/active model IDs.
- Operator animation and reload phase audits remained clean.
- Runtime fault list and browser page-error list remained empty in the no-WebGL headless runtime.
- The fixed-step match test helper now resets the same AI work budget as a rendered frame, keeping automated combat simulations representative after Build 12.12 pacing.
- A fresh mixed-loadout Dune simulation retained exact weapon mapping through live combat and produced no runtime faults.
- The fresh simulation recorded eight eliminations and eight matching `eliminated` events while retaining all mixed-loadout mappings.
- Dune engagement and geometry audits remained clean; the navigation benchmark completed 160/160 routes with zero failures.
- Office engagement, courtyard, furniture, walkway and door-placement audits remained clean.
- Document width remained contained at 320, 375, 390 and 430px portrait plus 844x390 landscape.

## Compatibility

Career save schema remains 17 and diagnostics schema remains 1. No weapon damage, accuracy, fire rate, range, magazine, reload, recoil, inventory, AI, health, economy, reward or progression values changed.

## Visual limitation

The container's headless Chromium did not provide a usable WebGL context. Attachment correctness was validated from the authoritative shared geometry, the exact renderer transforms and runtime audit helpers. A brief real-device visual check remains required for subtle GPU-only depth/lighting issues.
