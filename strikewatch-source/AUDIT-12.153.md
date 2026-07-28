# Build 12.153 — Ground Shade

Extends the Build 12.146 baked occlusion to the floor and gives it a contact
falloff. Items 2 and 3 from the 12.152 review of "baked AO + extend static
batching".

**This build does not add shadows.** There is still no shadow map, no
depth-from-light pass and no screen-space AO anywhere in the renderer; nothing
casts anything. What follows makes the existing occlusion legible. Real cast
shadows remain outstanding.

## What was wrong

The 12.146 occlusion was applied at exactly three draw calls — wall, kick plate
and trim — and fed the raw enclosure ratio straight into a 0.22 strength. Three
consequences, all measured:

1. **The floor had no occlusion at all.** It was a single `drawMesh` spanning
   the whole map at one flat colour, and the ceiling likewise. In a first-person
   view that is most of the screen.
2. **The values were a flat tint, not shading.** A typical Citadel wall came out
   at 0.336 and 76% of wall rectangles sat inside a 3.7% brightness band. Aurora
   had **three** distinct levels across the entire arena, spanning 11%.
3. **Walls were sampled at their own centre**, which is *inside* the wall, so
   most of the 24 samples hit the wall itself. The value measured how long a
   wall was more than how enclosed the space in front of it was — which is why
   Aurora's long straight walls all collapsed onto one level.

## Changes

### The occlusion curve

`staticOcclusionCurve()` remaps the raw ratio through a smoothstep between an
open threshold (0.20) and an enclosed threshold (0.86) before quantising. Below
the open threshold a point is left completely alone. That is what makes a higher
strength safe: the arena as a whole does not dim, only corners deepen. Citadel's
mean wall occlusion drops from 0.336 to 0.264 while its contrast range nearly
doubles.

### Walls sampled from the space that faces them

`staticWallOcclusion(rect)` walks the open cells along the rectangle's perimeter
and averages their enclosure, instead of taking one sample at the centre. A
rectangle with no open neighbour is buried inside a wall mass and returns a
stable 1.

### The floor is shaded per cell and merged

`createFloorRectangles()` shades every cell and then merges runs of equal level
into rectangles with the same greedy sweep the walls use. Quantisation is what
makes that affordable — five levels collapse 864 cells into a few hundred
rectangles and leave the batcher with five material groups rather than hundreds.
Wall cells are shaded too rather than skipped, so the floor stays gap-free under
every wall base.

### A contact falloff for the floor

The first attempt reused the wall sampler's 2.6-unit radius and **did not read**:
a three-wide corridor is entirely within 2.6 units of a wall, so every cell in it
darkened by the same amount and the result looked like the corridor was simply
dimmer. Measured against a captured frame, the mean pixel difference was 0.63/255.

The floor now samples at 0.72 and 1.45 units, with the curve re-centred on the
lower values that produces (`STATIC_FLOOR_OCCLUSION_OPEN` 0.08,
`..._ENCLOSED` 0.62). Only cells against a wall darken, which is what reads as
contact shading. Citadel's floor histogram went from clustered to genuinely
graded:

| Level | 0.00 | 0.25 | 0.50 | 0.75 | 1.00 |
| --- | --- | --- | --- | --- | --- |
| Citadel floor tiles | 61 | 88 | 65 | 71 | 59 |

### Ground plates take the floor's shading

Shading the base floor alone was still nearly invisible, because zone plates,
floor patches, lane strips and decals sit a few thousandths above it and cover
most of the ground a camera sees. A shaded floor under an unshaded plate is no
change at all. `shadeGroundDecor()` stamps the floor's occlusion onto
`zoneFloors`, `floorPatches`, `laneStrips`, `floorDecals`, `officeRugs` and
`officeFloorMarkings` once at build time. `floorLines` are deliberately excluded
— they are map-length hairlines a single sample could not describe.

Office carpet bands span the full map width and cannot take a per-cell value, so
their opacity drops from 0.58 to 0.44 and the shaded floor reads through instead.

### Strengths raised

Floor and ground plates 0.50, kick plates 0.52, trims 0.48, walls 0.22 → 0.42.
Safe only because the curve leaves open space at exactly zero.

## Result

Wall colour multiplier, and floor where there was none before:

| Arena | Wall contrast before | Wall contrast after | Floor contrast | Floor tiles |
| --- | --- | --- | --- | --- |
| Citadel | 18.3% | **35%** | **50%** | 344 |
| Dune Bastion | 18.3% | **35%** | **50%** | 224 |
| Aurora Terminal | 11% (3 levels) | **21%** (4 levels) | **50%** | 247 |
| Skyline Offices | 14.7% | **28%** | **50%** | 364 |

Verified against captured frames rather than by eye: at a Citadel corridor the
floor along the wall base is now visibly darker with a gradient away from it,
where 12.152 was uniformly pale to the wall line.

## Cost

The floor went from one draw call to a few hundred merged rectangles:

| Arena | Draw calls before | after | Delta |
| --- | --- | --- | --- |
| Citadel (batched) | 1,401 | 1,420 | **+19 (+1.4%)** |
| Dune Bastion | 2,318 | 2,482 | +164 (+7.1%) |
| Aurora Terminal | 1,906 | 2,071 | +165 (+8.7%) |
| Skyline Offices | 2,982 | 3,227 | +245 (+8.2%) |

**Citadel absorbs the whole change for 1.4% because it is batched** — the five
occlusion levels collapse into five extra batch draws. The other three arenas
pay 7–9% because static batching has never been extended to them. That is the
strongest argument yet for finishing that work, and this build measures the size
of the prize.

## Correction to the 12.146 documentation

`AGENTS.md` stated that `setStaticWorldBatchEligibility()` "currently exists but
is never called", and gave that as the blocker to extending batching. **That is
false** — it is called in five wrapped regions inside `drawStaticWorld`, and has
been since before 12.146. The note is corrected.

The real blocker is narrower and nameable. Four time-dependent draws inside
`drawStaticWorld` are **not** wrapped, and batching bakes model matrices, so
extending it to another arena today would freeze exactly these:

| Draw | `js/61-world-renderer.js` | Animation |
| --- | --- | --- |
| Dune lamp glow | ~2243 | `sin(time * 2.2)` on the glow sphere's height |
| Dune banner cloth | ~2322 | `sin(time * 1.6)` on banner roll |
| Dune torch flame | ~2345 | `sin(time * 8.2)` scaling the flame |
| Coolant tank pulse | ~2976 | `sin(time * 2.0)` on a drawn segment |

Three of the four are Dune decor, so Dune is the arena that would break first.

## Checks run

| Check | Result |
| --- | --- |
| `py -3 build.py` | pass |
| Double build, bundle and standalone hashes | **identical** |
| Root `cod.html` vs standalone | **byte-identical** |
| 41 modular files + bundle + standalone inline script parse | **41/41, 1/1** |
| `allArenaGeometryIntegrityForTest()` | pass |
| `arenaGeometryIntegrityForTest()` per arena | pass on all four |
| `auroraTerminalAuditForTest()` | pass |
| `arenaSurfaceSampleForTest()` | pass |
| `operatorViewOcclusionForTest()` | pass (line of sight, untouched) |
| `staticOcclusionForTest()` | ok on all four arenas, quantisation budget intact, legacy 12.146 result shape retained |
| Frame captures, before vs after, four viewpoints | contact band present at wall bases; see cost table |
| Console/runtime errors | none |
| `summitWholeMapConnectivityAuditForTest()` | **false — pre-existing**, identical on 12.152: 0 unreachable, all floors reachable, but the summit id redirects to a single-level arena so `upper: 0` fails its own assertion |

Collision, navigation, line of sight, gameplay, saves and match simulation are
untouched. Every change is renderer colour and draw partitioning.

## Still outstanding

Real cast shadows. This is contact shading derived from map enclosure; it cannot
put an operator's shadow on the floor or darken the ground beside a crate,
because nothing in the renderer traces occlusion from a light. That remains the
next piece of work if the arenas are to look lit rather than shaded.
