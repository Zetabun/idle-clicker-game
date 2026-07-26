# Strikewatch Build 12.45 Audit — Centred Armour Previews

## Scope

Fix the armour preview alignment regression so every armour card and the detailed Armoury viewer show the full rig cleanly, then add a regression check to stop the nested 3D rig drifting off-centre again.

## Implemented behaviour

- Corrected the nested `career-weapon-rig` alignment inside `.career-armour-model-system` so the armour rig is centred in both store and detail contexts.
- This restores full Light, Medium Flex, Medium Plate and Heavy silhouettes in the Supply Depot instead of showing only a cropped slice.
- The Armoury detail inspector continues to use the operator mannequin introduced in Build 12.44, but the fitted vest now remains fully visible while rotating and zooming.
- Extended `armour3dPresentationForTest()` so it mounts store and detail previews into the DOM, reads the positioned nested rigs and verifies they remain centred.

## Invariants

- Armour protection, rating, price, movement penalty, handling penalty, fatigue load, penetration, durability, assignment and break behaviour are unchanged.
- The Build 12.44 operator-mannequin preview and the live WebGL class-specific armour silhouettes remain intact.
- Save schema remains 19 and diagnostics schema remains 1.
- No external assets or network dependency were added.

## Verification

- Edited source modules and the rebuilt bundle pass syntax checks.
- `armour3dPresentationForTest()` now reports `centeredRigs: true` while preserving the existing shared-pipeline, heavy-feature and WebGL profile checks.
- Source rebuild generated the standalone Build 12.45 release.
