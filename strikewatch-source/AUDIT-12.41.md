# Strikewatch Build 12.41 Audit — Procedural 3D Armour Stock

## Scope

Replace the flat armour silhouette used in the Supply Depot and Armoury with a shared procedural CSS-3D rig.

## Implemented

- Added `careerArmourRigMarkup()` and routed store, inventory and detail previews through `careerArmourVisualMarkup()`.
- Added layered shells, plates, straps, side panels, pockets and belt geometry.
- Preserved armour purchase, assignment, durability, penetration and save behaviour.

## Schemas

Save schema remains 19. Diagnostics schema remains 1.
