# Build 12.142 — Armour Pass

Reported as two problems: the armour viewer lags the game, and the armour
models look bad. This build fixes the first and quantifies it. The second is
not addressed — see "Not in this build".

## Armour viewer lag

### Root cause

The armour model is CSS 3D. Each part is a `.career-weapon-cuboid` with six
`.face` children, so the inspector alone carries **64 cuboids / 384 face
elements** for a light vest and **103 cuboids / 618 faces** for the heavy rig.
On the loadout route that is roughly two thirds of the entire page's DOM.

That alone was survivable. The cost came from how rotation was applied.
`syncCareerArmourViewerTransform()` wrote `--armour-viewer-yaw`,
`--armour-viewer-pitch` and `--armour-viewer-scale` onto the rig root once per
frame. Those are **inherited custom properties**, so every write invalidated
the computed style of every element beneath the rig — all 384+ faces — even
though only two elements in the subtree actually read them.

Measured on desktop, one rig, forcing style recalculation and layout after each
change:

| Path | ms per rotation step |
| --- | --- |
| Writing `--armour-viewer-*` on the rig root | **9.60** |
| Writing `transform` on a single element | **0.03** |

9.60ms is 57% of the whole 16.7ms frame budget at 60fps, for one decorative
model, before the renderer or anything else has run. On a phone it is several
times worse, which is the reported lag.

### Change

- `careerArmourRigMarkup()` wraps the model in a new
  `.career-armour-viewer-pivot`. The live rotation is applied to that element's
  own `transform`, so it touches one element and inherits nothing downward.
- `careerArmourViewerTransform()` now emits yaw and pitch as `0deg`. The pivot
  owns them.
- `syncCareerArmourViewerTransform()` writes only `pivot.style.transform`.
- Zoom keeps using `--armour-viewer-scale`, deliberately: the per-model and
  per-width scale factors are expressed in CSS on top of that property
  (`.career-armour-showcase .career-armour-model-system`, the `.90` multipliers
  at two breakpoints). Zoom changes on a button press, not once per frame, so
  the subtree invalidation is not on the animation path. A new
  `syncCareerArmourViewerZoom()` handles the zoom and reset actions.
- The pivot carries the drag/auto-rotate transition rules, so easing behaviour
  is unchanged.

Nothing else styles `.career-armour-viewer-pivot`, so it cannot collide with
the existing per-model or per-width cascade.

### Verification

| Width | Old path ms/step | New path ms/step | Speedup |
| --- | --- | --- | --- |
| Desktop | 9.60 → 2.63 (re-measured) | 0.01 | 263× |
| 390 | 2.26 | 0.01 | 226× |

The new path is 0.1% of a 60fps frame budget.

- Rotation still works through the real controls: the `ROTATE ▶` button moved
  the pivot from `rotateY(-30deg)` to `-6deg` to `42deg`.
- Zoom still works through the CSS cascade: `--armour-viewer-scale` went
  1.42 → 1.76 → 1.92 and back to 1.42 on reset.
- `armour3dPresentationForTest()` passes, including `shared3dPipeline`,
  `productOnlyDetail`, `compactInventory` and the part-count reductions, so the
  extra wrapper did not disturb the presentation contract.
- Adjacent hooks pass: `armourSystemForTest`, `armourLoadoutMappingForTest`,
  `armourMatchAttritionForTest`, `spectatorArmourHudForTest`,
  `weaponSlotSystemForTest`, `firstMatchGuidanceForTest`,
  `openingWeekFlowForTest`, `onboardingClarityForTest`,
  `stateIntegrityForTest`, `matchPlanPersistenceForTest`,
  `tacticalCoachingDestinationForTest`, `leagueMatchFlowForTest`,
  `crateAttachmentForTest`, `firstMatchPayoffForTest`,
  `newPlayerOrientationForTest`, `guidanceConsolidationForTest`.
- `mobileInterfaceAuditForTest()` at 390px: zero overlapping, zero collapsed,
  zero overflowing.

## Readability floor regression fixed

`typographyConsistencyForTest()` failed at 833px on `mobileLockCopyReadable`.
The Build 12.140 rule `.menu-tab-access { font-size: 12px !important }` lost to
an existing `.menu-shell .menu-tab-access` rule at 10.5px: both `!important`,
so the higher-specificity selector won. Build 12.140 was verified at 320, 390
and 1440, which happen to be governed by other rules, so the gap was missed.
Both new floors are now scoped `.menu-shell …`. The gate passes on `play`,
`loadout`, `operators` and `tactics` at 390px and 833px.

## Not in this build

**The armour models still look bad.** The reported appearance problem is not
addressed. The performance fix changes how the model is rotated, not what it
looks like.

What was established: the four vests are built from 75, 83, 97 and 105 cuboids
respectively via `careerArmour3dParts()`, and `NO ARMOUR` renders as a loose
scatter of grey boxes with no coherent silhouette. Reworking that geometry
needs the result to be seen while it is being changed, which the automated
browser used here cannot do reliably — the screenshot surface did not follow
programmatic scrolling to the inspector. Guessing at part positions without
seeing them would be worse than leaving it.
