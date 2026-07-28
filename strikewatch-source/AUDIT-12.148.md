# Build 12.148 — Sidearm Rebuild

Build 12.147 gave weapons a light direction. With the shading fixed, the
supplied capture showed the remaining problem clearly: the P12 Scrapline is a
slab with a handle. This build reshapes the authored geometry.

## What was wrong with the model

Read from `careerWeaponVisualParts()`, `scrap-p12` branch:

| Part | Authored | Problem |
| --- | --- | --- |
| `slide` | 244 × **48** × 44 | One slab spanning the whole weapon; the block in the capture |
| `frame` | 186 × 34 × 38 | No visible separation from the slide |
| grip | `gripRz: -2` | Two degrees of rake — a vertical handle, not a pistol grip |
| `trigger-guard` | 72 × **12** × 32 | A flat bar projecting from the frame, not a bow |
| `muzzle` | box, 27 tall vs an 18-tall barrel | Flared into a boxy step |
| `ejection-port` | flat `black` panel at z 21.2 | Read as a sticker, no depth |

## The rigid-assembly fix that had to come first

`addGripAssembly()` applied `gripRz` to every sub-part, but `rz` rotates each
part **about its own centre**. The magazine sits 56 units below the grip
centre, so raking the grip rotated each piece in place and sheared the assembly
apart. That is why the grip had only two degrees of rake: anything more visibly
came apart.

Sub-part positions are now rotated about the grip centre as well, making the
assembly rigid:

```
x' = gripX + dx·cos θ − dy·sin θ
y' = gripY + dx·sin θ + dy·cos θ
```

Existing callers with small angles are unaffected, and the grip can now carry a
real rake.

## Changes to `scrap-p12`

- Slide slimmed from 48 to 38 and rounded, over a distinct frame.
- **Five pairs of cocking serrations** on the slide flanks.
- A `slide-rail` parting line between slide and frame.
- Grip rake from −2° to **−13°**, with the magazine and base plate following.
- Trigger guard rebuilt as a three-piece bow — front strap, bottom, rear post —
  instead of one flat bar.
- Barrel and muzzle converted to cylinders; the muzzle no longer flares.
- Ejection port becomes a recessed `ejection-well` with the cut standing proud
  of it, so the opening reads as depth.

Part count for the model class rises from 21 to 32.

## The integrity audit caught a real break

The first attempt **failed** `weaponGeometryIntegrityForTest()`:
`scrap-p12` reported **2 components** in both the world and viewmodel contexts,
with the disconnected set being `frame, rail, trigger, trigger-guard-bow,
trigger-guard-rear, trigger-guard, grip, mag-base, magazine, grip-panel-left,
grip-panel-right, grip-backstrap` — the entire lower assembly.

Cause: slimming the slide moved its underside from −13 to −21 while the frame
still started at −13, and the new parting rail only spanned −22.5 to −17.5. The
4.5-unit gap detached everything below it. The rail now spans −23 to −11 and
bridges both.

This is exactly what the audit exists for, and it is worth recording that the
break was invisible in a still render — the parts overlap visually while being
topologically separate.

## Verification

- All 41 modular files, the generated bundle and the standalone inline script
  parse.
- `weaponGeometryIntegrityForTest()` passes, **all eight samples at one
  component**:

| Model | Context | Parts | Components |
| --- | --- | --- | --- |
| scrap-p12 | world / viewmodel | 32 | 1 / 1 |
| service-p12 | world / viewmodel | 19 | 1 / 1 |
| viper-9 | world / viewmodel | 21 | 1 / 1 |
| ar4-sentinel | world / viewmodel | 58 | 1 / 1 |

  Magazine base gap is 0 and vertical scale parity holds on every sample.
- `ar4WeaponModelForTest`, `weaponSlotSystemForTest`,
  `weaponRoleBalanceForTest`, `weaponSwitchingForTest`,
  `crateAttachmentForTest`, `armour3dPresentationForTest`,
  `stateIntegrityForTest`, `typographyConsistencyForTest`,
  `firstMatchGuidanceForTest`, `leagueMatchFlowForTest`,
  `matchPlanPersistenceForTest` and all-arena geometry integrity all pass.
- The armoury inspector renders the reshaped model at 124 cuboids across the
  route.

Because `careerWeaponVisualParts()` is the single geometry authority, the
reshaped sidearm reaches the crate reveal, inventory thumbnails, the armoury
inspector, store cards, the in-match operator weapon and the first-person
viewmodel from this one change.

No gameplay, economy, save schema (19) or diagnostics schema (1) change.
Weapon statistics, ranges, penetration and handling are untouched — this is
model geometry only.

## Not in this build

`viper-9` and `service-p12` still carry the original slab silhouette and the
same two-degree grip rake. The rigid-assembly fix means they can now take a
proper rake whenever they are reworked; `ar4-sentinel` was already the
best-authored model and needs no equivalent pass.
