# Strikewatch Build 12.44 Audit — Operator-Fitted 3D Armour

## Scope

Refine armour proportions, make the Bastion Heavy visually premium and show the selected armour fitted to an operator without changing armour balance.

## Implemented behaviour

- Added `careerArmourOperatorBodyParts()` using the same cuboid/cylinder part renderer used by weapons and armour.
- The Armoury detail inspector now rotates and zooms the fitted operator and armour as one model.
- Store previews remain armour-only and retain staggered idle rotation plus reduced-motion support.
- Refined Light, Medium Flex, Medium Plate and Heavy dimensions and materials.
- Bastion Heavy now has enlarged front/back shells, deeper side plates, larger shoulders, collar/neck protection, abdomen plate, groin protection, radio and wraparound pouches.
- Expanded `operatorArmourRenderProfile()` and both active/corpse WebGL rendering paths to mirror the class silhouettes in live matches.
- Extended `armour3dPresentationForTest()` to verify operator fit, shared 3D primitives, heavy-specific parts and WebGL heavy-versus-light separation.

## Invariants

- Armour protection, rating, price, movement penalty, handling penalty, fatigue load, penetration, durability, assignment and break behaviour are unchanged.
- Save schema remains 19 and diagnostics schema remains 1.
- No external assets or network dependency were added.

## Verification

- All edited modules, the rebuilt bundle and build script pass syntax checks.
- Model construction test produced four store models with 17/20/24/27 cuboids, a fitted heavy detail model with 40 cuboids and 9 cylinders, and all expected operator/heavy features.
- Heavy WebGL profile is 1.49× the light width and 2.84× the light depth and includes shoulders, collar, abdomen and groin protection.
- Source rebuild generated the standalone Build 12.44 release.
