# Build 12.146 — Contact Shading

Step one of the shadow work agreed after the cost review. Two items were
proposed: baked ambient occlusion, and extending static world batching to fund
it. **Only the first was implemented** — see "Batching: why it was not
extended".

## Baked ambient occlusion

### Approach

Enclosure is sampled once from the collision grid when the world batches are
built and folded into the existing per-draw colour. It costs **no extra draw
calls, no texture and no shader work**: a corridor simply resolves darker than
an open room, which is most of what makes a space read as lit.

`staticOcclusionAt(x, z)` in `js/60-renderer-core.js` samples two rings of
twelve points at 1.17 and 2.6 units and returns the blocked fraction.
`applyStaticOcclusion(colour, occlusion, strength)` darkens only — this is
contact shading, not a lighting model. It is applied to wall rectangles at 0.22
strength, wall trims at 0.26 and kick plates at 0.30, since the kick plate sits
at floor level and carries the contact most strongly.

### Quantisation, and why it matters

The static batcher groups draws by exact material
(`colour|emissive|alpha|surface|roughness`). A continuous occlusion factor would
give every wall rectangle a unique colour and shatter one merged batch into
dozens. Occlusion is therefore quantised to six steps.

Measured per arena:

| Arena | Wall rects | Distinct levels | Range | Mean | Within budget |
| --- | --- | --- | --- | --- | --- |
| office | 78 | 5 | 0.17 – 0.83 | 0.348 | yes |
| dune | 30 | 6 | 0.00 – 0.83 | 0.422 | yes |
| citadel | 58 | 6 | 0.00 – 0.83 | 0.336 | yes |
| aurora | 36 | 3 | 0.17 – 0.67 | 0.273 | yes |

Every arena stays within the eight-level budget, so the effect has real spread
without fragmenting materials. Citadel — the only arena that batches — still
reports **120 batch draw calls**, up from 102 before, which is the expected cost
of the extra material variants and is a fraction of what an unquantised factor
would have cost.

Because occlusion only changes the colour argument, it cannot add a single
`drawMesh` call.

## Batching: why it was not extended

The plan was to extend `STATIC_WORLD_BATCHING_ENABLED` past citadel to fund the
shadow work. Investigation found the reason it was never extended, and it is a
correctness problem rather than an oversight:

- The batcher bakes each draw's model matrix into world-space vertices at
  capture time, so anything animated in the static pass freezes.
- `drawStaticWorld(time)` contains many time-dependent draws — desert canopy
  lamp sway, banner flutter, torch flicker, tank and cylinder pulses, warning
  light pulses.
- `setStaticWorldBatchEligibility()` exists in `js/60-renderer-core.js` and is
  **never called from anywhere**. There is no guard excluding animated draws
  from capture.

Enabling batching for dune, office or aurora today would freeze their animated
decor. Doing it properly means wrapping every time-dependent static draw in the
existing eligibility helper and re-verifying each arena's animation, which is
its own piece of work.

Draw calls at three fixed camera poses, measured through
`rendererFrameStatsForTest()`:

| Arena | Mean draw calls | Batching |
| --- | --- | --- |
| citadel | 368 | on (120 batch draws) |
| aurora | 603 | off |
| dune | 824 | off |
| office | 1,088 | off |

Citadel is roughly a third of office's cost for a comparable map, which is the
headroom still available once the eligibility guards are in place.

## Measurement note

The renderer statistics published to `document.body.dataset` refresh on a
countdown and stall when the animation frame is throttled. Comparing builds
through them gives frozen, identical values across arenas and poses — the first
three attempts at this measurement were invalid for that reason. Draw calls are
also view-dependent through frustum culling, so any comparison has to fix the
camera pose. `rendererFrameStatsForTest()` now forces frames and reads the
renderer's own counters directly, and all figures above use fixed poses.

## Verification

- All 41 modular files, the generated bundle and the standalone inline script
  parse.
- `allArenaGeometryIntegrityForTest()` passes for citadel, office, dune and
  aurora.

| Arena | Nodes | Edges | Components | Routes |
| --- | --- | --- | --- | --- |
| office | 464 | 1,948 | 1 | 60/60 |
| dune | 494 | 2,752 | 1 | 60/60 |
| citadel | 502 | 2,160 | 1 | 60/60 |
| aurora | 540 | 2,552 | 5 | 60/60 |

- Dune stays on its `AUDIT-12.07.md` baseline of 494 / 2,752 / 1.
- `auroraTerminalAuditForTest()`, `officeDoorPocketAuditForTest()` and
  `officeCourtyardRotationAuditForTest()` pass.
- The Build 12.143 sky is unaffected.
- Adjacent hooks pass: `stateIntegrityForTest`, `firstMatchGuidanceForTest`,
  `typographyConsistencyForTest`, `armour3dPresentationForTest`,
  `weaponSlotSystemForTest`, `leagueMatchFlowForTest`,
  `crateAttachmentForTest`.

No gameplay, economy, save schema (19) or diagnostics schema (1) change.
Occlusion is presentation only and never touches collision or navigation.

## Not in this build

- Batching for office, dune and aurora, pending eligibility guards on animated
  static draws.
- The static shadow map, which was always step two.
- Occlusion on props. Only walls, trims and kick plates carry it so far; solid
  props are the obvious next surface.
