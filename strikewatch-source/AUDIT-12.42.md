# Strikewatch Build 12.42 Audit — Interactive 3D Armour Inspection

## Scope

Improve the procedural armour models with interaction, stronger class identity and restrained store motion.

## Implemented behaviour

- Added a dedicated armour viewer with drag/swipe rotation, wheel/button zoom, reset and optional auto-rotation.
- Kept armour and weapon viewer state independent.
- Added staggered slow idle rotation to Supply Depot armour previews with `prefers-reduced-motion` support.
- Differentiated Light, Medium Flex, Medium Plate and Heavy rigs through geometry, material, shoulders, side panels, collars, radio modules, abdomen plates and lower guards.
- Added `armour3dPresentationForTest()` for shared-model and interaction verification.

## Invariants

- Armour values, prices, ownership, assignment, penetration, integrity and break behaviour are unchanged.
- No external models or network assets are required.
- Save schema remains 19 and diagnostics schema remains 1.

## Required verification

- Modular and standalone JavaScript syntax.
- Store model presence for all four purchasable armour classes.
- Detail control presence and independent transform updates.
- Responsive containment and reduced-motion fallback.
- Deterministic source rebuild.
