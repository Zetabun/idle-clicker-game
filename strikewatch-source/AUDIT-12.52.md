# Strikewatch Build 12.52 Audit — Arena Geometry Integrity

## Scope

Audit every current playable arena for disconnected, floating, wall-embedded, collider-misaligned or visually primitive geometry; repair presentation defects while preserving the established map, navigation, line-of-sight, spawn, engagement-plan and gameplay authorities.

All 52 Markdown files in the incoming package were read in full before source inspection or editing.

## Citadel Depot repairs

- Replaced each five-plate staircase with five grounded solid risers, continuous tread caps, high-contrast nosing and two side stringers. The complete visible footprint remains inside the existing stair collider profile.
- Added eight ceiling hangers, four transverse beams, deck/ceiling anchor plates and an underside spine to each overhead walkway, eliminating unsupported floating decks.
- Added shared structural wall returns and flush thresholds to all five door portals.
- Added grounded skids/plinths to industrial containers and terminals.
- Added a grounded tank base plus a visibly connected pipe, nozzle ring, cap and valve bar to both large tanks.

## Skyline Offices repairs

- Mounted all four acoustic baffles to either the local lowered ceiling or the main ceiling with four hangers and attachment plates each.
- Added top/bottom channels and three mullions to each of the four glass bands.
- Added two mounting rails and a wall raceway to each of the five wall displays.
- Replaced twenty primitive chair blocks with connected seats, backs, stems, four-spoke bases and grounded casters.
- Expanded both benches to four legs plus two back supports and both sofas to four feet.
- Added shared wall returns and thresholds to all eight door portals.
- Moved the conference table from `(18.0, 21.55)` to `(18.0, 20.40)` and rotated it by 90 degrees. The table and all six chair sample footprints now lie in open map cells, and the generated collider uses the same source position and yaw.

## Dune Bastion repairs

- Centralised canopy presentation dimensions in `DUNE_CANOPY_PRESENTATION` so visible posts and `canopy-post` colliders use identical offsets.
- Completed every one of the four canopy frames with four posts, four perimeter headers, eight knee braces, one longitudinal ridge member and three transverse rafters; all beams now follow the same pitched plane as the cloth instead of remaining level beneath it.
- Added complete perimeter headers and post collars to market stalls.
- Rebuilt each amphora handle as an outward segment plus a return segment that reconnects to the vessel.
- Retained and re-audited the authored arch inner-lintel, landmark-backing and emblem attachment contracts.

## Geometry integrity tooling

- Added `ARENA_GEOMETRY_PRESENTATION` as the shared visual-dimension contract.
- Added `arenaGeometryPresentationSnapshot()` for deterministic map-specific attachment and collider-parity evidence.
- Added `arenaGeometryIntegrityForTest(arenaId)` and `allArenaGeometryIntegrityForTest()` to `window.__strikeDebug`.
- Extended the Office contract to sample the complete conference table and six chair footprints against authored open cells and verify collider yaw/position parity.

## Verification

### Build and syntax

- `python3 build.py` completed successfully.
- Every modular JavaScript file, `js/strikewatch.dev.js` and the extracted inline standalone script passed `node --check`.
- The generated standalone release loaded through a real WebGL/SwiftShader browser session as Build `12.52.0-arena-geometry-integrity` with no runtime exceptions and no warning/error console messages.

### Targeted arena gates

- `allArenaGeometryIntegrityForTest()` passed for Citadel Depot, Skyline Offices and Dune Bastion.
- Existing Citadel, Office and Dune arena route/spawn audits remained clear.
- Citadel and Office door-placement audits passed.
- Office screen, furniture-clearance and walkway audits passed.
- Dune Bastion's authored support/collider audit passed with 58/58 static colliders, zero decor-support overlaps, zero support-pair overlaps and all decorative supports clear.
- Navigation benchmarks passed Citadel 80/80, Office 80/80 and Dune 160/160.
- Dune retained exactly 494 navigation nodes, 2,752 edges and one connected component.
- Thirty simulated seconds were exercised independently on each current arena with matching minimap identity, geometry checks still true, no runtime faults and no browser exceptions. The Office combat-deadlock regression also passed in its valid test lane.

### Unrelated retained gates

- Build 12.51 `dynamicTransferMarketForTest()` passed all twelve checks.
- Career state integrity, onboarding clarity, performance classification and runtime-quality governor checks passed.
- The retained typography helper reports the same 8px main/sub-navigation result in both Build 12.51 and Build 12.52; this is baseline parity rather than a geometry-pass regression.

### Visual inspection

WebGL free-roam captures were inspected for Citadel stairs and walkways, Office baffles/workstations/conference furniture, and Dune canopies/amphorae. The repaired masses read as grounded or structurally attached, the canopy frame and valance meet the pitched fabric, and no wall-embedded conference body remains visible.

## Invariants

- No weapon, health, armour, movement, AI, economy, reward, league, transfer or progression value changed.
- Spawn points, engagement plans and authored map grids are unchanged.
- The only static prop relocation is the Office conference set; its source prop and collider move and rotate together, and retained protected-route/furniture audits pass.
- Save schema remains 19 and diagnostics schema remains 1.
