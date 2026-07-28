# Build 12.149 — Grip Rake

## Reported problem

Both visible pistols have the handle "pointing inwards" and do not read as real
pistol grips.

## Root cause

The rake was applied in the wrong direction, on every sidearm.

The model space has **+x toward the muzzle** (the P12 barrel is authored at
`x: 142`) and **+y downward** (the magazine at `y: 124` sits below the grip at
`y: 68`). Parts are placed with a CSS `rotateZ(var(--rz))`, so under that
transform a point at local `+y` — the bottom of the grip — moves by
`−sin(rz)` in x.

A **negative** `gripRz` therefore swings the butt of the grip **toward the
muzzle**: a forward rake, with the handle pointing at the target. Every sidearm
carried one:

| Model | Authored rake | Effect |
| --- | --- | --- |
| `scrap-p12` | −13° | forward rake, clearly visible |
| `service-p12` | −1° | forward rake, too slight to notice |
| `viper-9` | 0° | no rake at all — a vertical handle |

This predates Build 12.148. What 12.148 changed was the magnitude: raising
`scrap-p12` from −2° to −13° took a long-standing sign error from invisible to
obvious. The reporter spotted it immediately.

## Change

All three sidearms now take a positive rake, so the butt trails away from the
muzzle:

| Model | Before | After |
| --- | --- | --- |
| `scrap-p12` | −13° | **+14°** |
| `viper-9` | 0° | **+12°** |
| `service-p12` | −1° | **+12°** |

`ar4-sentinel` authors its `pistol-grip` directly rather than through
`addGripAssembly()` and is unaffected.

The convention is now recorded in a comment above the assembly, since the sign
is not self-evident from the code and was got wrong once already.

## Verification

Checked numerically rather than by eye, reading the rendered rig:

| Measure | Value |
| --- | --- |
| Grip x | −70 |
| Mag base x | **−93.5** |
| Barrel x | +142 (muzzle is +x) |
| Mag base rearward of grip | **yes** |

The magazine base sits 23.5 units behind the grip centre, away from the muzzle
— a correct pistol rake. Under the previous −13° the same part resolved to
x −61.3, i.e. 8.7 units *in front* of the grip centre.

- `weaponGeometryIntegrityForTest()` passes with **all eight model/context
  samples at one component**, magazine base gap 0 and
  `magazineBaseConnected: true` throughout. Moving three grip assemblies did
  not detach anything.
- `ar4WeaponModelForTest`, `weaponSlotSystemForTest`,
  `weaponRoleBalanceForTest`, `weaponSwitchingForTest`,
  `crateAttachmentForTest`, `armour3dPresentationForTest`,
  `stateIntegrityForTest`, `typographyConsistencyForTest`,
  `firstMatchGuidanceForTest`, `leagueMatchFlowForTest`,
  `matchPlanPersistenceForTest` and all-arena geometry integrity pass.
- All 41 modular files, the generated bundle and the standalone inline script
  parse.

Model geometry only. Weapon statistics, ranges, penetration and handling are
untouched. Because `careerWeaponVisualParts()` is the single authority, the
corrected rake reaches every surface — crate reveal, inventory, armoury, store,
the in-match operator weapon and the first-person viewmodel.

## Note

The rigid-assembly fix from Build 12.148 is what makes a 12–14° rake viable at
all. Before it, sub-parts rotated about their own centres and the magazine
sheared away from the grip, which is why the authored values were all near
zero — the shallow angles were hiding a broken assembly as much as a wrong
sign.
