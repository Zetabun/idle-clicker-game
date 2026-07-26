# Strikewatch Build 12.07 Audit

## Scope

Build 12.07 corrects unsupported Dune Bastion decoration seen during Free Roam without changing the arena wall grid, lane widths, combat balance, economy, progression or save schemas.

## Geometry corrections

- Rebuilt all six freestanding standards with grounded stone feet, full-height masts, connected top/lower rods and aligned `banner-post` colliders.
- Limited banner motion to cloth tails so structural supports remain fixed and visually grounded.
- Raised recessed arch lintels until they overlap their parent masonry instead of hanging beneath it.
- Replaced roof-line teal blocks with flush-mounted landmark plaques and visible sandstone backing on arch faces.
- Retained all eight verified wall-backed braziers and the Build 12.06 canopy/crate clearance corrections.

## Dune structural audit

- Arena size: 36 × 24.
- Floors: one.
- Stairs/doors: zero.
- Wall cells: 310.
- Open layout cells connected: 554/554.
- Static colliders: 58.
- Banner standards checked: 6/6 grounded with matching colliders.
- Arch attachment snapshots checked: 6/6 valid.
- Wall braziers checked: 8/8 wall-backed with open fronts.
- Ordinary-prop/support overlaps: 0.
- Support/support overlaps: 0.
- `allDecorSupportsClear`: true.
- Left/right collision symmetry: true.

## Navigation and gameplay regression

- Dune navigation graph: 494 nodes, 2,752 edges, one component.
- Dune benchmark: 160 successes, zero failures.
- North Rampart, Central Transit, South Bazaar, West Flank and East Flank route checks: all open.
- Every spawn, hotspot and engagement-plan destination: clear and reachable.
- Citadel benchmark: 80/80 routes, zero failures.
- Office benchmark: 80/80 routes, zero failures.
- Office furniture, walkway, door-pocket, wall-display, opening-traversal and rotation audits: pass.

## Runtime and presentation regression

- Dune deployment preview: non-empty.
- Tactical minimap: correct Dune ID, 310 wall cells and 58 colliders.
- Free Roam: enters/exits cleanly; supplied West Courtyard position remains standable and navigation-clear; WebGL renderer ready.
- Diagnostics event retention: pass.
- Career state integrity: pass.
- Browser console/page errors in audited run: none.

## Mobile layout

Tested menu and Free Roam at 320×690, 375×760, 390×844, 402×874, 430×932 and 844×390. Every viewport retained document width equal to the viewport with zero document-level horizontal overflow.

## Build/package checks

- Modular source JavaScript syntax: pass.
- Generated concatenated JavaScript syntax: pass.
- Standalone inline JavaScript syntax: pass.
- Deterministic rebuild: required and verified before final packaging.
- Source ZIP integrity: required and verified before delivery.

Career schema remains 17. Diagnostics schema remains 1.
