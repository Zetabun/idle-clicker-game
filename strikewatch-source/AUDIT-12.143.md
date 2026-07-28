# Build 12.143 — Desert Sky

## Reported problem

Dune Bastion needed a visual pass, and the skybox was "just a mucky brown".

## Root cause

Dune Bastion is the only open-air arena: `drawStaticWorld()` skips the ceiling
block for the desert theme, so everything above the ramparts is whatever the
GL clear colour happens to be. There was no sky pass at all.

The clear colour was derived from the fog:

```
baseFog   = [0.25, 0.18, 0.10]                     // RGB(64, 46, 26)
clearColor = zoneFog * [0.86, 0.90, 0.94]
```

So the "sky" was literally the fog colour — a flat, dark, desaturated brown,
with no gradient and no response to looking up. The same value also fogged all
distant geometry, so the far end of the arena faded into mud rather than heat
haze.

## Changes

- `js/65-sky-dome.js` (new, registered in `build.py`) draws a procedural
  gradient sky before any world geometry. A full-screen triangle reconstructs
  the view ray from the camera basis and the projection slopes, then picks a
  colour from the ray's elevation:
  - warm horizon haze into pale upper sky into a deep zenith;
  - a distinct below-horizon ground haze so the ramparts do not appear to
    float;
  - a broad low sun that warms one side of the sky and fixes the time of day;
  - a small dither to stop banding on 8-bit displays.
  It runs with depth testing and depth writes disabled, restores the previous
  `DEPTH_TEST`/`CULL_FACE` state and rebinds the world program afterwards.
  Shader or buffer creation failure sets `skyInitFailed` and falls back to the
  old clear colour rather than taking the match renderer down.
- `js/63-viewmodel-renderer.js` calls `drawArenaSky(eye, target)` immediately
  after the clear, passing the same vectors given to `mat4LookAt`, so the sky
  ray can never disagree with the camera the world is drawn through.
- The desert fog becomes `[0.72, 0.62, 0.47]`, a warm haze matched to the sky
  horizon, so distant sandstone fades into the sky instead of into brown murk.
  The sky is no longer coupled to the fog: they are now two separate decisions.

Only the `desert` theme has a sky preset. Every other arena is roofed and is
untouched.

## Geometry safety

`CONTRACTS.md` requires that presentation must not move hitboxes, navigation,
collision or line of sight. The sky pass writes no depth and draws no world
geometry. Measured against the `AUDIT-12.07.md` Dune baseline:

| Check | Baseline | This build |
| --- | --- | --- |
| Dune navigation nodes | 494 | 494 |
| Dune navigation edges | 2,752 | 2,752 |
| Navigation components | 1 | 1 |
| Dune route benchmark | 0 failures | 60 successes, 0 failures |

`allArenaGeometryIntegrityForTest()` passes for citadel, office, dune and
aurora. The boot release audit reports `geometryOk: true`, all four arenas
true, `citadelRoutesConnected`, `citadelSpawnsClear`, the full aurora set,
`stateOk: true`, no state issues and **no runtime faults**.

## Sky verification

The canvas has no `preserveDrawingBuffer`, so sampling after a frame has been
presented returns an empty buffer. `skyDomeSampleForTest()` therefore draws and
reads back inside the same task. Sampled in free roam on Dune, top to bottom of
the viewport:

| View | Top | Upper | Middle | Lower |
| --- | --- | --- | --- | --- |
| Level, away from sun | 67, 116, 184 | 109, 143, 184 | 227, 201, 154 | 105, 79, 53 |
| Pitched up | 39, 82, 152 | 47, 88, 157 | 66, 108, 172 | 125, 170, 225 |
| Side on | 78, 126, 191 | — | 235, 208, 160 | 105, 79, 53 |

All three gates hold in every direction sampled: `hasVerticalGradient`,
`coolerOverhead` (more blue overhead than at the horizon) and `notFlatBrown`.
No channel clips except when looking directly into the sun, which is intended.

For comparison, the previous sky was a single flat RGB(55, 42, 24) everywhere.

## Adjacent regressions

`stateIntegrityForTest`, `firstMatchGuidanceForTest`,
`typographyConsistencyForTest`, `armour3dPresentationForTest`,
`weaponSlotSystemForTest`, `leagueMatchFlowForTest`,
`matchPlanPersistenceForTest`, `openingWeekFlowForTest`,
`crateAttachmentForTest`, `onboardingClarityForTest`,
`spectatorArmourHudForTest`, `armourSystemForTest` all pass. All 41 modular
files, the generated bundle and the standalone inline script parse.

No gameplay, economy, save schema (19) or diagnostics schema (1) change.

## Not in this build

The wider Dune *model* pass — the sandstone palette, arches, banners, bazaar
props — is untouched. This build fixes the sky and the haze it was polluting.
Reworking the arena's decor geometry is a separate piece of work against
`AUDIT-12.07.md`, and would need the arena visible while changing it.
