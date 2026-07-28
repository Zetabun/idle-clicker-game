# Build 12.145 — Clean Surfaces

Requested: the Dune treatment applied to Skyline Offices, working from
free-roam captures of Reception, the Break Room and the courtyard.

## 1. The mottling was global, not per-arena

`AUDIT-12.144.md` fixed the desert sandstone by replacing a hash of two
mismatched `floor()` grids. The same defect existed one level up, in the term
every surface mode reads:

```glsl
vec2 cell = floor(vWorldPosition.xz * 5.0);
float noise = hash21(cell + floor(vWorldPosition.xy * 2.0));
```

`xz` at 5.0 and `xy` at 2.0 summed and hashed gives hard per-cell steps, and
because one grid uses `z` and the other uses `y`, the result changes character
depending on which way a surface faces. Surfaces 1, 2, 3, 5, 6 and 7 all read
it, so this single line was the quilted patchwork on office partitions,
industrial floors and painted metal alike — the same visual fault the reporter
saw on Dune, on a different palette.

Replaced with smoothly interpolated value noise on one coherent grid
(`valueNoise()`, added beside `hash21`), sampled at `xz * 1.7` with a small
`y` offset so vertical and horizontal faces stay related but not identical.

## 2. Office partitions (surface 2)

Tone now varies per panel module rather than per fragment, and the streak term
— `sin((x + z) * 12.0 + noise * 8.0)`, twelve cycles per world unit — is gone.
At office scale it read as corduroy rather than wear. Seam contrast is softened
from `0.38` to `0.46` and the grime multipliers are roughly halved.

Measured by porting the shader maths to JavaScript and evaluating old and new
over the same 200 × 200 grid on a wall face, isolating the change from scene
geometry:

| | Old | New | Change |
| --- | --- | --- | --- |
| Mean tone | 0.9306 | 0.9650 | brighter, less arbitrary darkening |
| Standard deviation | 0.0851 | 0.0569 | **−33.1%** |
| Horizontal roughness | 0.00779 | 0.00303 | **−61.1%** |

## 3. Wall displays (surface 4)

The scanline ran at **130 cycles per world unit** with a 6% swing, which is why
every screen in the captures reads as hard corduroy rather than as a display.
Now 34 cycles at 1.8%:

| | Old | New |
| --- | --- | --- |
| Cycles per world unit | 130 | 34 |
| Peak-to-peak swing | 0.120 | 0.036 |

## 4. Painted and brushed metal (surface 3)

`sin(y * 92.0)` aliased into visible banding on anything larger than a
handrail. Replaced with a 26-cycle grain plus a broad 2.4-cycle sheen, and edge
wear eased from 0.16 to 0.12.

## Navigation chokepoints — measured, not changed

The reporter asked for layout adjustment where movement is blocked. Skyline
Offices is **not** broken: 464 navigation nodes, 1,948 edges, one component,
60/60 benchmark routes, and every courtyard traversal reachable.

To find where movement actually feels tight, every 0.5-unit position on the
floorplate was probed through the engine's own free-roam mover — 3,456 samples,
1,880 standable — and each standable cell scored by how many of its eight
neighbours are also standable. Excluding positions within 1.5 units of the
outer wall, where hugging the boundary is normal, **12 cells in 6 clusters**
have two or fewer free neighbours:

| Cluster | Location |
| --- | --- |
| (14.8, 9.3) | Courtyard portal corner, north-west |
| (21.3, 9.3) | Courtyard portal corner, north-east |
| (14.8, 14.8) | Courtyard portal corner, south-west |
| (21.3, 14.8) | Courtyard portal corner, south-east |
| (5.3, 19.5) | Conference wing, west |
| (30.8, 19.5) | Conference wing, east |

Every one is mirrored about `x = 18`, so the floorplate is symmetric and
neither team is disadvantaged by them. Four are the corners where the two-cell
courtyard portals meet the arcades — the squeeze felt entering the atrium.

**No layout change was made in this build.** The floorplate is authored as a
north-west quadrant mirrored twice, and `AUDIT-12.117.md` gates it on prop
clearance, glass banding, wall-display backing, courtyard emptiness, door
pockets and symmetry in both axes. Widening the portal corners is a real
option and the coordinates above are precise enough to act on, but it changes
sightlines into the atrium and therefore balance, so it belongs in a build of
its own rather than bolted onto a shader pass. The tactical minimap consumes
`MAP` directly, so it will follow any layout change automatically.

## Verification

- All 41 modular files, the generated bundle and the standalone inline script
  parse.
- `allArenaGeometryIntegrityForTest()` passes for citadel, office, dune and
  aurora. This shader change is global, so all four were checked:

| Arena | Nodes | Edges | Components | Routes |
| --- | --- | --- | --- | --- |
| office | 464 | 1,948 | 1 | 60/60 |
| dune | 494 | 2,752 | 1 | 60/60 |
| citadel | 502 | 2,160 | 1 | 60/60 |
| aurora | 540 | 2,552 | 5 | 60/60 |

- Dune stays on its `AUDIT-12.07.md` baseline of 494 / 2,752 / 1.
- `officeDoorPocketAuditForTest()` and `officeCourtyardRotationAuditForTest()`
  pass. `auroraTerminalAuditForTest()` passes.
- The Build 12.143 sky is unaffected: still gradient, still cooler overhead,
  top `67, 116, 184`.

No gameplay, economy, save schema (19) or diagnostics schema (1) change.

## Not in this build

- The six chokepoints above.
- Dune banners and floor tiles, still outstanding from `AUDIT-12.144.md`.
- Office lighting. The captures are dim overall, but ambient was left alone so
  the surface change could be judged on its own.
