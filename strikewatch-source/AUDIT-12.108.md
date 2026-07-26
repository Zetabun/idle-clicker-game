# Build 12.108 – Citadel Depot environment rework

## Scope

Rebuild the Citadel Depot environment so the arena reads as a coherent industrial
depot. The reported symptoms were props in odd positions, decoration that looked
wrong, building structures clashing and clipping through one another, and stairs
that led nowhere. The layout was permitted to change where doing so made the
level more logical.

## Root cause

An automated geometry pass over the shipped arena (rendered footprints from
`js/61-world-renderer.js` checked against the collision grid in `js/00-core.js`)
found ten distinct authoring defects, not a shading or material problem:

1. **Suspended catwalks driven through masonry.** Both walkways were hard-coded in
   the renderer at `z = 9.0` and `z = 14.1` spanning `x` 14.3–21.7. Between them
   they passed through sixteen wall columns. This was the single largest source
   of the "structures clipping through each other" appearance.
2. **Stairs that genuinely led nowhere.** Both flights rose 0.56 m over a 0.90 m
   run and terminated flat against blank wall, parked in dead-end nooks at
   `(7.5, 11.5)` and `(27.5, 12.5)`. Nothing stood above them and nothing was
   reachable from them.
3. **Props embedded in walls.** The container at `(5.2, 3.2)`, the container at
   `(18.5, 5.5)` and the generator at `(26.4, 18.4)` each overlapped solid cells.
4. **A gate inside a wall.** `citadel-delta-gate` at `(23.5, 19.5)` sat on wall
   cell `(23, 19)`, so its frame was buried in the partition.
5. **Five of eight AI hotspots inside walls**, at `(6.5, 4.5)`, `(10.5, 8.5)`,
   `(18, 6.5)`, `(18, 12)` and `(18, 17.5)`.
6. **Roof steel and services passing through wall tops.** Beams, cable trays and
   the two full-map pipes sit between 2.43 m and 2.79 m under a 2.82 m ceiling,
   while internal walls are full height, so every run intersected each wall it
   crossed.
7. **Layout noise.** Wall masses were largely one-cell stubs rather than readable
   buildings, and the two halves of the map were not consistent with each other.
8. **No decor layer.** Citadel was the only arena with no `decor` block at all;
   Dune Bastion and Skyline Offices both carry one.

## Implementation

### Layout

- The depot is now authored as its **northern half only** and mirrored by a
  180-degree rotation about the map centre. Both halves are therefore identical
  for the two teams, and every wall mass, prop, gate and route has a twin.
- Wall masses are now buildings rather than stubs: four racking runs with a cross
  aisle in ALPHA STORES, two gated partitions, three loading bays hanging off the
  north wall in DELTA LOADING, a dock block, and a tall central plant hall with
  ten entries.
- Blue spawns sit on a clean line at `x = 2.5`; red spawns are their exact
  rotational twins.

### Props

- 16 containers, 9 machines, 6 tanks, 6 gates and 2 stair assemblies, all
  mirrored pairs except the plant core, which sits on the map centre.
- The plant core is a single `reactor` machine at `(18, 12)` with an authored
  2.0 × 2.0 footprint. Its collider covers cells `(17,11)`–`(18,12)` exactly, so
  the rendered shell and the blocking volume are the same size with no passable
  slivers at its corners.
- Every gate now occupies a genuine single-cell opening with solid wall on both
  faces the leaves close against.

### Stairs

- `drawCitadelStair` now renders a **complete assembly**: the flight, a landing
  deck on legs, a continuous stringer that levels off over the landing, and a
  recessed access hatch with frame rails, handle and status lamp on the wall face
  the landing meets.
- The authored origin is the centre of the whole assembly and `depth` covers
  flight plus landing, so the collider and the rendered geometry agree and the
  landing edge lands exactly on the wall face.

### Catwalks

- Walkways are now authored per arena in `decor.walkways` rather than hard-coded,
  and each spans one bay wall-to-wall (`x` 14.0 → 22.0 at `z` 8.5 and 15.5).
- `drawCitadelWalkwayStructure` adds a bearing plate, bolts and an under-deck
  gusset at each end, so both ends visibly land on a partition.
- Hangers terminate at whatever ceiling is actually above them rather than always
  reaching the roof deck.

### Decoration

- New `decor` arrays: `walkways`, `lowCeilings`, `hazardZones` and `pipeRuns`.
  All of it is either overhead or painted on the floor, so **none of it takes part
  in collision, navigation or line of sight** and no new colliders are created.
- `hazardZones` render loading-bay outlines with corner chevrons, gate threshold
  striping, and a hatched keep-clear ring around the plant core.
- `pipeRuns` render service runs with termination flanges and support straps.
- Suspended ceilings are now authored per room instead of three hard-coded boxes.

### Overhead runs

- New `openRunSegments` helper splits roof steel and services into the stretches
  that actually cross open floor. Beams gain end plates and pipes gain flanges, so
  each run visibly dies into the wall it meets rather than passing through it.

### Integrity gate

`arenaGeometryPresentationSnapshot` for Citadel now fails unless:

- both stairs have a landing and the cell past the landing edge is solid wall;
- both catwalks are clear of wall columns along their whole span and anchored at
  both ends;
- all six gates sit in a real opening;
- every container, machine and tank is clear of masonry at all nine sample points
  of its footprint;
- hazard markings and service runs are present.

## Verification

- `allArenaGeometryIntegrityForTest` — `ok: true` for citadel, office and dune.
- `arenaAuditForTest`, `doorPlacementAuditForTest`, `engagementPlanAuditForTest`,
  `propCollision`, `navigationGoalRecoveryForTest`, `stateIntegrityForTest`,
  `officeWalkwayAuditForTest`, `duneBastionAuditForTest` — all `ok: true`.
- `navigationGraphForTest` — 502 nodes, 2160 edges, **1 connected component**.
- Offline footprint audit — 0 issues: no prop, gate, stair, catwalk or service run
  overlaps a wall cell; no prop overlaps another prop; no zone floor decal overlaps
  another; all spawns, hotspots and engagement-plan points are standable.
- Offline vertical clearance check — 0 issues: every prop clears the ceiling above
  it, no roof steel, cable tray or service run enters a catwalk envelope, and every
  authored service run stays over open floor.
- Modular, generated and standalone syntax all parse; `python3 build.py` reproduces
  `dist/strikewatch-build-12.108.html` deterministically.

## Boundaries

- Skyline Offices, Dune Bastion, their decor and their audits are untouched.
- No weapon, bot-AI, match-simulation, economy, recruitment, mail or progression
  behaviour changed. Only arena geometry, arena decoration and the industrial
  theme's rendering changed.
- The `zones` list gains three named sectors (LOWER CATWALK, ECHO STORES and the
  renamed SERVICE DOCKS) so all four corners of the map read by name. The five
  short codes used by engagement plans — ALPHA, MID, CORE, SERVICE, DELTA — are
  retained.
- Save schema remains 19 and diagnostics schema remains 1.
