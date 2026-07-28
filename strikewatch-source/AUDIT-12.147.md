# Build 12.147 — Weapon Form

## Correction to AUDIT-12.141

`AUDIT-12.141.md` reported that weapon geometry had **two independent
authorities** — `careerWeapon3dParts()` for menus and
`operatorSharedWeaponRig()`/`drawFirstPersonWeapon()` for the live match — and
that they shared no geometry, so a change had to be made twice.

**That was wrong.** The finding came from grepping `careerWeapon3dParts`, which
is a one-line wrapper. The real authority is `careerWeaponVisualParts()`
(`js/35-career.js:3330`), and it is consumed by all three surfaces:

| Consumer | File |
| --- | --- |
| CSS-3D menu surfaces (crate reveal, inventory, armoury, store) | `js/35-career.js:3531` via `careerWeapon3dParts` |
| In-match operator weapon | `js/62-character-renderer.js:516` |
| First-person viewmodel | `js/63-viewmodel-renderer.js:161` |

There is also a shared scale authority, `CAREER_WEAPON_RENDER_SCALES`, and
`careerWeaponGeometryIntegrityAudit()` already verifies every model class is
connected in both the `world` and `viewmodel` contexts. Authored weapon parts
therefore reach every surface from one place, and the `CONTRACTS.md` rule added
in 12.141 has been corrected accordingly.

## Reported problem

The guns do not look good. Supplied capture: the armoury inspector showing a
sidearm covered in loud diagonal banding, with every surface reading as a flat
slab.

## Root cause

Two separate faults, both in presentation rather than in the authored parts.

### 1. No directional face shading on weapons

`.career-weapon-cuboid .face` gave all six faces of every box the same
gradient. A cuboid therefore had no light direction: top, bottom and sides were
identical, so barrels, receivers and magazines resolved as flat slabs whatever
the viewing angle.

The armour rig already solves this — `.career-armour-model-system` carries
per-face `brightness`/`saturate` filters from 0.48 on the bottom to 1.28 on the
top. Weapons never received the equivalent.

### 2. Grip texture aliasing

The `rubber` material used
`repeating-linear-gradient(135deg, #1a252a 0 5px, #0c1316 5px 9px)` — a 9px
period at high contrast. At inspection scale that reads as hazard tape rather
than as a textured grip, and it dominated the model in the capture.

This is the same class of fault as the Build 12.145 scanlines at 130 cycles per
world unit and the Build 12.144 sandstone noise: detail authored at a frequency
the display scale cannot resolve.

## Changes

`css/game.css`, release end:

- Per-face directional shading for `.career-weapon-rig .career-weapon-cuboid`,
  matched to the armour rig's light direction:

| Face | Brightness |
| --- | --- |
| top | 1.30 |
| front | 1.12 |
| right | 1.04 |
| left | 0.84 |
| back | 0.80 |
| bottom | 0.50 |

- The same treatment for `.career-weapon-cylinder` sides, so barrels and
  suppressors do not read as flat bands against a now-shaded receiver.
- The `rubber` grip texture drops to a 4px period at much lower contrast.

WebGL surfaces are untouched: they light the shared authored parts for real, so
this raises only the CSS-3D menu surfaces — the crate reveal, inventory
thumbnails, the armoury inspector and store cards.

## Verification

- All 41 modular files, the generated bundle and the standalone inline script
  parse.
- The armoury inspector resolves six distinct face treatments spanning
  0.50–1.30, confirmed through computed style on a live rig of 18 cuboids.
- `ar4WeaponModelForTest()` passes: 58 parts, 23 rounded, 6 cylindrical, and
  `connectedInEveryRenderer: true` with both the `world` and `viewmodel`
  samples green — the authored geometry still reaches every renderer intact.
- `weaponSlotSystemForTest`, `weaponRoleBalanceForTest`,
  `weaponSwitchingForTest`, `crateAttachmentForTest`,
  `armour3dPresentationForTest`, `stateIntegrityForTest` and
  `typographyConsistencyForTest` all pass.

No gameplay, economy, save schema (19) or diagnostics schema (1) change. No
authored weapon part was moved, so no hitbox, attachment anchor or handling
value is affected.

## Not in this build

The authored silhouettes themselves are unchanged. The models now have form
and material, but they remain assemblies of boxes and cylinders — the sidearm
in particular is still a slab-sided receiver. Reshaping the authored parts is a
larger piece of work that would move real geometry, so it needs the attachment
audits and the world/viewmodel connectivity check re-run against each change,
and is better judged against fresh captures of the improved shading.
