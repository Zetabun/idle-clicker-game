# Audit — Build 12.130 (Aurora Terminal)

Build ID: `12.130.0-aurora-terminal`

## Scope

Add a fourth playable arena that is thematically distinct from Citadel Depot
(industrial), Dune Bastion (desert) and Skyline Offices (office), with full
minimap, deployment-preview, navigation and diagnostics compatibility.

## The arena

**AURORA TERMINAL** (`aurora`, short `AUR`) — a polar transit terminal built
on the existing `summit` render theme, which the renderer and minimap have
carried since the Summit Terminal era: bright glacial palette, luminous roof
panels, teal/orange lane accents and summit minimap colours. The `summit`
arena-id redirect to `dune` is untouched, so historical saves and the retired
summit test hooks behave exactly as before.

Layout: one level, 36×24, four-way symmetric (every row palindromic about
x=18; southern half mirrors northern about z=12), so all four quadrants play
identically. Structure: north/south check-in concourses with kiosk islands
(long precision lanes), four boarding-lounge pods with dual entrances
(close-quarters), a 10×10 central Cryo Atrium with fountain centrepiece,
seating ring and departure boards (mid-range contests), an east–west transit
spine on the mirror line, and open flank corridors carrying the five spawn
points per team. No doors, stairs or vertical profile — all elevation, door
and stair machinery stays inert.

Content: 6 zones (NORTH/SOUTH concourses, WEST/EAST lounges, CRYO ATRIUM,
CENTRAL TRANSIT fallback), 20 hotspots, 6 engagement plans (5+5 points each),
47 props using only established renderer kinds (bench, planter, sofa,
barrier, crate-stack, desk, terminal, vending-machine, server-rack, fountain,
plant). `decor: {}` — the summit theme consumes no decor arrays.

## Changes

- `js/00-core.js` — `aurora` entry in `ARENA_LIBRARY`; `BUILD_*` bumped.
- `js/61-world-renderer.js` — `aurora` presentation contract in
  `arenaGeometryPresentationSnapshot`: summit theme, 5 luminous roof ribs,
  zone floor count, 9-point prop wall-clearance sampling, exactly one
  centred fountain, 4 benches/planters/terminals, no doors/stairs/vertical.
- `js/70-runtime.js` — `auroraTerminalAuditForTest()` (symmetry, flood-fill
  connectivity, spawn/destination reachability via `findPath` and
  `canStandForNavigation`, prop collision audit, geometry contract);
  `allArenaGeometryIntegrityForTest` now covers `aurora`; the
  `releaseAudit=1` boot audit includes the aurora flags, renders a visible
  results panel, and also triggers on a `releaseaudit` filename marker
  (the Windows shell strips query strings from `file://` launches).
- `index.html` — title, asset queries, build stamp, both version labels.

No gameplay-balance, save-schema-19, diagnostics-schema-1 or responsive
changes. `careerState.tactics.arenaId` already persists arbitrary arena ids,
so the new map is selectable in deployment with no migration.

## Design-time verification (pre-source, scripted)

`aurora-validate.py` (kept outside the repo) validated the authored data
before it entered `00-core.js`: row width/palindrome/mirror symmetry, single
connected open region (608 open cells), all 10 spawns + 20 hotspots + 60
engagement points on open cells, clear of prop-expanded footprints
(bot radius 0.245) and BFS-reachable from every spawn, prop footprints clear
of walls with four-way mirror counterparts. Result: 0 problems.

## Release verification (in engine)

- `py -3 build.py` ×2 → byte-identical output
  (bundle SHA256 `653a3025…67a2c9` → final rebuild `see release log`).
- Bundle delimiter balance clean; standalone boots from `file://` with no
  console-visible faults (`runtimeFaults: []`).
- Boot release audit on the built standalone reported:
  `geometryOk:true`, arenas `{citadel:true, office:true, dune:true,
  aurora:true}`, `auroraOk:true`, `auroraSymmetric:true`,
  `auroraConnected:true`, `auroraDestinationsOk:true`,
  `auroraGeometryOk:true`, `auroraPropCollisionOk:true`,
  `stateIssues: []`, `runtimeFaults: []`.

Outstanding (recommended): play a full match on Aurora Terminal and confirm
bot flow through the atrium and lounge pods reads well; compact-width visual
pass on the deployment card and minimap.
