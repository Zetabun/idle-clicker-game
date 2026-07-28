# Build 12.144 — Sandstone Masonry

Follows `AUDIT-12.143.md`, which fixed the Dune sky. This build addresses the
arena surfaces, working from free-roam captures supplied by the reporter of the
South Bazaar, Central Gate and North Rampart.

## 1. Wall mottling

### Root cause

The desert surface mode (`uSurface == 7`) tinted every fragment with:

```glsl
float coarse = hash21(floor(vWorldPosition.xz * 8.0) + floor(vWorldPosition.xy * 3.0));
float strata = 0.93 + 0.07 * sin(vWorldPosition.y * 22.0 + ...);
base *= (0.88 + coarse * 0.18) * strata;
```

Two `floor()` grids at mismatched scales (8.0 on `xz`, 3.0 on `xy`) were summed
and hashed, producing unstructured white noise at roughly ±10%, then multiplied
by a high-frequency vertical sine. The result reads as a dirty quilt rather than
stonework, and it is the dominant visual texture in every supplied capture.

### Change

Replaced with actual masonry: horizontal courses of 0.44 units in a running
bond, blocks of 0.88 units along the course, gentle per-block and per-course
tone, soft mortar joints where a course line or block edge falls, and a slow
warm bedding gradient in place of the sine stripe. Dust near the ground is
retained.

### Measurement

Both formulas were evaluated in JavaScript over the same 220 × 220 grid of
world positions on a wall face, using an exact port of the shader's `hash21`.
This isolates the change from scene geometry:

| | Old | New | Change |
| --- | --- | --- | --- |
| Mean tone | 0.9022 | 0.9755 | brighter, less arbitrary darkening |
| Standard deviation | 0.0688 | 0.0310 | **−54.9%** |
| Horizontal roughness | 0.00933 | 0.00339 | **−63.7%** |
| Vertical roughness | 0.01217 | 0.00535 | −56.0% |

Horizontal roughness is the mean absolute difference between adjacent samples;
random per-patch noise drives it up, structured masonry does not. The remaining
variation is now courses and joints rather than speckle.

## 2. Wall tilework

### Root cause

Desert wall panels drew a flat slab in one of two saturated colours —
`[0.18, 0.38, 0.42]` teal and `[0.58, 0.20, 0.13]` red — proud of the wall,
with three near-white bars across it. Against warm sandstone these read as
bright stickers applied to the surface, and only two colours repeated across
the whole arena.

### Change

The panel is now inset tilework: a carved surround slightly proud of the wall,
a shadowed reveal behind it, and the glazed tile set back so it reads as
recessed. Four desaturated tones replace the two saturated ones, using the four
variants the batch already generated but never distinguished. The inlays are
warm sand rather than near-white, and there are two rather than three.

## Geometry safety

Presentation only. `CONTRACTS.md` requires that arena visuals never move
hitboxes, navigation, collision or line of sight. Verified against the
`AUDIT-12.07.md` Dune baseline:

| Check | Baseline | This build |
| --- | --- | --- |
| Dune navigation nodes | 494 | 494 |
| Dune navigation edges | 2,752 | 2,752 |
| Navigation components | 1 | 1 |
| Dune route benchmark | 0 failures | 60 successes, 0 failures |

`allArenaGeometryIntegrityForTest()` passes for citadel, office, dune and
aurora.

## Verification

- All 41 modular files, the generated bundle and the standalone inline script
  parse.
- The Build 12.143 sky is unaffected: still gradient, still cooler overhead,
  top `67, 116, 184` and lower `105, 79, 53`.
- New `arenaSurfaceSampleForTest()` forces a frame and reads it back in the
  same task, since the canvas has no `preserveDrawingBuffer`. Registered from
  `js/79-save-checkpoints.js` because `js/70-runtime.js` reassigns
  `window.__strikeDebug` wholesale.
- Adjacent hooks pass: `stateIntegrityForTest`, `firstMatchGuidanceForTest`,
  `typographyConsistencyForTest`, `armour3dPresentationForTest`,
  `weaponSlotSystemForTest`, `leagueMatchFlowForTest`,
  `openingWeekFlowForTest`, `crateAttachmentForTest`,
  `matchPlanPersistenceForTest`, `spectatorArmourHudForTest`.

No gameplay, economy, save schema (19) or diagnostics schema (1) change.

## Not in this build

Two items visible in the captures are unchanged and worth a later pass:

- **Banners** are still large flat single-colour slabs with one gold bar. They
  would benefit from a border, a device and some cloth shading.
- **Floor tiles** remain cool grey-tan against the now-warmer walls, and the
  grid lines are uniform. The floor was left alone because changing it while
  changing the wall shader would make each hard to judge.
