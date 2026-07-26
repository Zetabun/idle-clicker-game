# Strikewatch Build 12.46 Audit — Tailored Armour Finish

## Scope

Improve the final look of the procedural armour models so each class reads more like fitted wearable equipment rather than a stack of simple blocks, while preserving the shared 3D pipeline, the centred-preview fix, the operator-fitted detail view and all gameplay balance.

## Implemented behaviour

- Refined `careerArmourModelProfile()` with class-specific taper, side-angle, shell-width and accessory settings so Light, Medium Flex, Medium Plate and Heavy each have a more natural silhouette.
- Rebuilt `careerArmour3dParts()` around segmented front/back shells, integrated plate pockets, improved straps and buckles, angled side wraps, more believable shoulder structures, richer abdomen/groin pieces and upgraded radio detailing.
- Adjusted `careerArmourOperatorBodyParts()` so the mannequin arms sit slightly wider, helping the armour read more clearly in the detailed viewer.
- Upgraded `css/game.css` preview lighting and material separation for fabric, plate pockets, hard armour, clips, rubber pads and cable details.
- Lightly retuned the live `operatorArmourRenderProfile()` so in-match proportions better match the improved showcase rigs.

## Invariants

- Armour protection, rating, price, movement penalty, handling penalty, fatigue load, penetration, durability, assignment and break behaviour are unchanged.
- The Build 12.45 centred-rig fix remains in place.
- The Build 12.44 operator-mannequin preview and live WebGL class-specific armour silhouettes remain intact.
- Save schema remains 19 and diagnostics schema remains 1.
- No external assets or network dependency were added.

## Verification

- Rebuilt `js/strikewatch.dev.js` from source after the changes.
- Source modules and rebuilt bundle pass `node --check` syntax validation.
- `armour3dPresentationForTest()` remains the regression surface for shared-pipeline, heavy-feature, centred-rig and live-profile armour coverage.
