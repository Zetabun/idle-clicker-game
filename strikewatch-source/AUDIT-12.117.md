# Build 12.117 – Skyline Offices environment rework

## Scope

Rebuild the Skyline Offices environment so the arena reads as a coherent
corporate floorplate. The reported symptoms were props in odd positions,
decoration and detail that looked wrong, and building structures clashing and
clipping through one another. The layout was permitted to change where doing so
made the level more logical. This is the same treatment Build 12.108 applied to
Citadel Depot.

## Root cause

An automated geometry pass over the shipped arena (authored footprints from
`js/00-core.js` and rendered decor from `js/61-world-renderer.js` checked
against the collision grid) found **24 authoring defects**, not a shading or
material problem:

1. **The courtyard was not a courtyard.** The `decor.courtyards` rectangle was
   `9.0 × 5.6` centred on `(18.0, 12.0)`, covering `z` 9.2–14.8. The actual open
   floor there was two cells deep (rows 11–12). The slab therefore covered
   **14 wall cells**, and because that same rectangle is used by the renderer to
   cut the ceiling into four blocks, the paving, planting strips, skylight *and
   the ceiling void* all passed straight through the room walls at rows 9, 10,
   13 and 14. This was the single largest source of the "structures clipping
   through each other" appearance.
2. **Seven props embedded in masonry** — storage lockers at `(7.5, 22.35)`,
   low storage at `(28.5, 20.35)`, desks at `(11.5, 3.5)` and `(23.2, 3.5)`, a
   workstation pod at `(16.8, 2.8)` and planting at `(14.1, 12.7)` and
   `(21.9, 11.3)`.
3. **Four glass bands floating in open floor.** All four spanned walkway, not a
   wall line, so the glazing had nothing to sit in.
4. **Three floor rugs painted over walls**, and one AI hotspot at `(30.5, 6.5)`
   authored inside a wall.
5. **Office suspended ceilings were three hard-coded boxes** in
   `js/61-world-renderer.js` at `(7.0, 5.2)`, `(29.0, 5.2)` and `(18.0, 18.5)` —
   the same defect class Citadel carried before Build 12.108. One of them hung
   across the courtyard void.
6. **No authored decor for the office beyond the five legacy lists.** The office
   never received `lowCeilings`; those sit in the non-office branch.
7. **Layout noise.** Rows 6–10 and 13–17 were duplicated rather than mirrored,
   so the two halves of the building did not match and the floorplate read as a
   tile grid rather than a building.
8. **The integrity gate could not catch any of it.** The office branch of
   `arenaGeometryPresentationSnapshot` checked only prop *counts* and chair
   connection heights. It never compared a prop, a glass band, a screen, a
   courtyard or a ceiling against the collision grid.

Skyline Offices has `stairs: []`, so the "stairs leading nowhere" symptom from
the Citadel report does not literally apply to this arena.

## Implementation

### Layout

- The floorplate is now authored as its **north-west quadrant only** (18 × 12
  cells) and mirrored about `x = 18` and `z = 12`. Both team halves are
  therefore identical, and the building reads as one symmetrical office floor.
- The plan is a real corporate floorplate rather than a tile grid: spawn halls
  at each end, a partition spine, service cores in all four corners, an
  open-plan bay to the north, a conference wing to the south, two full-width
  circulation corridors with offset structural columns, side rooms (break room
  west, server suite east) and a link corridor onto the atrium.
- **The courtyard is now a real courtyard**: an 8 × 6 open atrium at
  `x` 14–22, `z` 9–15 (48 cells) with four symmetric entrances — two-cell
  portals north and south at `x` 17–18, and four-cell arcades west and east at
  `z` 10–13. The `decor.courtyards` rectangle matches that open floor exactly,
  so the ceiling void, paving, planting and skylight now align with the space
  they belong to.
- Walkable cells: 568. Layout symmetry is verified in both axes by the
  integrity gate.

### Props

- 66 solid props: 22 containers, 29 machines and 15 tanks, every one of them
  clear of masonry across all nine sample points of its authored footprint.
- Furniture is authored for the **west half only and mirrored about `x = 18`**.
  Walls are symmetric in both axes for fairness; furniture is symmetric in `x`
  only, which lets the north wing be dressed as open-plan office and the south
  wing as a conference suite without giving either team an advantage.
- The conference table sits on the map centre line at `(18.0, 20.8)` with its
  six chairs inside authored open geometry and its collider aligned to the
  rendered prop.
- 12 sliding doors, three authored per quadrant and mirrored four ways. Every
  door occupies a genuine single-cell opening with solid wall on both flanks and
  open floor on both approaches.

### Decoration

- New authored `decor.floorMarkings` layer plus `decor.lowCeilings` for the
  office. `LEVEL_DECOR_LAYOUT` and `cloneArenaDecor` in `js/00-core.js` carry
  the new key.
- The three hard-coded ceiling boxes are gone. Ten suspended ceilings are now
  authored one per room, so no ceiling plane hangs over the courtyard void or
  crosses a partition it does not own.
- Ten painted wayfinding markings run the corridors, the spawn halls and the
  link corridors. `drawOfficeFloorMarking` renders each as a flush decal with a
  lighter inner line and end caps. Like Citadel's hazard markings, all of it is
  painted on the floor, so **none of it takes part in collision, navigation or
  line of sight** and no new collider is created.
- Eight glass bands now sit on the courtyard-facing plane of a real wall line
  rather than floating in walkway.
- Ten wall displays are mounted on genuine wall faces: masonry behind the
  backing plate, open floor in front of the screen face. Screen yaw is now
  authored so the display faces the room rather than the wall.
- Eight acoustic baffles hang under an authored suspended ceiling and clear of
  wall columns.

### Zones and plans

- Seven named sectors: RECEPTION, OPEN OFFICE, EXECUTIVE WING, CENTRAL
  COURTYARD, BREAK ROOM, SERVER SUITE and CONFERENCE WING, plus the CENTRAL
  TRANSIT fallback. `SERVER` and `CONFERENCE` are new short codes.
- Seven engagement plans. The retired `executive` plan is replaced by
  `server-suite` (`SERVER SUITE PUSH`) covering the east room band; the other
  six ids are retained.
- The four `OFFICE_COURTYARD_ROTATION_LANES` in `js/30-bot-ai.js` now run
  between the west and east atrium arcades at `z` 10.5 and 13.5.

### Integrity gate

`arenaGeometryPresentationSnapshot` for Skyline Offices now fails unless:

- every container, machine and tank is clear of masonry at all nine sample
  points of its footprint;
- every glass band has masonry on one side and open floor on the other along its
  whole span;
- every wall display is backed by masonry and faces open floor;
- the courtyard rectangle contains no solid cell and no suspended ceiling
  overlaps it;
- every acoustic baffle clears wall columns and hangs under an authored ceiling;
- every floor marking lies on open floor;
- every door sits in a real opening with solid flanks;
- the layout is mirror-symmetric in both axes;
- counts hold at 8 baffles, 8 glass bands, 10 screens, 38 chairs, 4 benches,
  4 sofas and 12 doors.

`officeFurnitureClearanceAuditForTest` and `officeDoorPocketAuditForTest` in
`js/70-runtime.js` are updated to the new desk and door counts, and the
protected circulation routes now cover the two corridors, both spawn halls, the
open-office bay and the conference wing.

### Tactical minimap and deployment preview

No change was required. Both are already fully data-driven: the minimap reads
`MAP`, `LEVEL_ZONES`, `LEVEL_DECOR_LAYOUT.courtyards`, `LEVEL_PROP_LAYOUT` and
`ACTIVE_DOOR_STATES`, and the deployment preview reads `arena.layout` and
`arena.decor.courtyards`. Both were verified against the reworked arena rather
than assumed — the minimap snapshot reports the new 296 wall cells, 114 drawn
props, 12 doors and one courtyard at their new positions.

## Verification

- `allArenaGeometryIntegrityForTest` — `ok: true` for citadel, office and dune.
- `arenaGeometryIntegrityForTest('office')` — 8 baffles, 8 glass bands,
  10 screens, 38 chairs, 4 benches, 4 sofas, 12 doors, 66 cleared props,
  10 markings, 10 ceilings; courtyard 48 open cells / 0 solid cells /
  0 ceiling overlaps; `mirroredX` and `mirroredZ` both true.
- `officeFurnitureClearanceAuditForTest`, `officeWalkwayAuditForTest`,
  `officeScreenAuditForTest`, `officeWallDisplayAuditForTest`,
  `officeDoorPocketAuditForTest`, `doorPlacementAuditForTest`,
  `doorInteractionForTest`, `arenaAuditForTest`, `arenaPointAuditForTest`,
  `engagementPlanAuditForTest`, `engagementRotationAuditForTest`,
  `officeCourtyardRotationAuditForTest`,
  `officeCourtyardOpeningTraversalForTest`,
  `officeCourtyardRotationDecisionForTest`,
  `forceOfficeCourtyardRotationForTest`, `navigationGoalRecoveryForTest`,
  `propCollisionBroadphaseForTest`, `zoneAnalyticsForTest`,
  `stateIntegrityForTest`, `buildVersionHeaderForTest` — all `ok: true`.
- `navigationGraphForTest('office')` — 464 nodes, 1,948 edges,
  **1 connected component**.
- `navigationBenchmarkForTest` — office, citadel and dune all pass with zero
  route failures.
- Unrelated regressions: citadel and dune geometry integrity, citadel door
  placement, citadel and dune engagement plans and `duneBastionAuditForTest` all
  remain `ok: true`.
- Offline footprint audit — **0 issues** across 18 check classes: no prop, door,
  decal, glass band, screen, baffle or ceiling overlaps a wall cell; no prop
  overlaps another prop; every hotspot, spawn, engagement-plan objective,
  rotation lane and protected route is standable and reachable on a
  navigation-padded graph; layout symmetry holds in both axes; the walkable
  floor is one connected component.
- Modular, generated and standalone syntax all parse. `python3 build.py`
  reproduces `js/strikewatch.dev.js` and
  `dist/strikewatch-build-12.117.html` byte-identically across repeated
  rebuilds.
- First-run UI was exercised at 1440 × 900 and 390 × 844. Team creation,
  orientation focus, the skip-demo route and guided recruitment all complete
  without console errors, horizontal overflow, duplicate ids, unnamed visible
  buttons or missing image alternatives. The compact disabled calendar control
  now says `CREATE TEAM FIRST`; the previous longer label clipped to
  `CREATE TEAM TO BE` at 390 pixels and obscured the required action.
- The standalone `releaseAudit`, `collisionAudit`, `operatorAudit` and
  `performanceAudit` entry points all complete without runtime faults. The live
  performance sample retained full quality while the Citadel regression path
  exercised static batching, culling, navigation and door colliders.

`summitStructuralIntegrityAuditForTest` remains unavailable, as it has since
Build 12.04 replaced Summit Terminal with Dune Bastion. This is a pre-existing
retired hook and is not affected by this release.

## Boundaries

- Citadel Depot, Dune Bastion, their decor and their audits are untouched.
- No weapon, bot-AI decision, match-simulation, economy, recruitment, mail or
  progression behaviour changed. The only shared UI correction is shorter
  first-run calendar microcopy for compact screens.
- Every piece of new decoration is overhead or painted on the floor, so
  collision, navigation and line of sight gain no new blockers.
- Save schema remains 19 and diagnostics schema remains 1.
