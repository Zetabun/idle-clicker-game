# Build 12.155 — Still Armoury

Two requests: replace the Armoury's live 3D previews with stills and put the
rotating model behind an inspect button, one at a time; and mark surfaces where
bullets land.

## 1. Still previews

### What was wrong

The Armoury drew every model as a live CSS-3D rig at once — the weapon
inspector, the armour inspector and every inventory thumbnail. Nothing on that
page rotates unless the manager asks it to, so almost all of it produced a
picture that never changed while still costing a 3D quad per face on any
repaint.

| | 12.154 | 12.155 |
| --- | --- | --- |
| CSS-3D quads on the loadout page | 804 | **0** |
| DOM nodes under `#menuContent` | 1,361 | **387** |
| Live rigs | up to 4 | **0, or exactly 1 while inspecting** |

### How the stills are made

`js/57-loadout-stills.js` projects the same part list every other renderer
consumes and paints it into a canvas, then hands the result over as a data URL.
Two rules keep it from becoming a second source of truth:

- **Geometry has one authority still.** It calls `careerWeaponVisualParts()`,
  `careerWeaponThumbnailParts()`, `careerArmour3dParts()` and
  `careerArmourThumbnailParts()`. It never forks a part list.
- **Materials are not copied either.** Rather than duplicating the palette out
  of `css/game.css` into a table that would drift the first time a colour
  changed, the gradient stops and the per-face `filter()` values are read back
  from the live stylesheet through a hidden probe element whose ancestor chain
  matches a real rig — `.career-armour-model-system` for armour, the weapon rig
  for weapons — so the correct rules win. 148 material/face combinations
  resolved and cached on the loadout page. Change a material in CSS and the
  stills change with it.

Cylinders are drawn as the same ten-strip prism the CSS builds, so a barrel
keeps its round silhouette rather than turning into a box. Thin-part face
culling from 12.151 is honoured, so a still draws exactly the faces the live rig
would.

The detail frames size themselves to the model's own proportions — a pistol and
a rifle have very different aspect ratios and a fixed box leaves the squarer one
floating in empty space. Thumbnails keep fixed frames so the inventory rows stay
aligned.

### The inspect flow

One control mounts a live rig, and only ever one:

| Step | Quads | Weapon rig | Armour rig |
| --- | --- | --- | --- |
| Stills only | 0 | 0 | 0 |
| INSPECT IN 3D on the weapon | 394 | 1 | 0 |
| INSPECT IN 3D on the armour | 202 | **0** | 1 |
| CLOSE 3D VIEW | 0 | 0 | 0 |

Opening one inspector closes the other, and selecting a different weapon or vest
closes an inspector opened on the previous one, so the live rig always belongs
to what is on screen.

### An honest note on what this did and did not improve

Menu **re-render** time is a wash — 14.22ms before, 15.27ms after, measured over
twelve full route renders. Parsing a few large data URLs costs about what
building 800 tiny elements did.

The win is not there; it is in what the page costs **between** renders. 804
3D quads that the compositor had to transform and sort on every repaint are
gone. That is the same quad-bound cost 12.153 measured directly on the Supply
Depot, where hiding the rigs took a page from 58ms per frame to 4.2ms. **That
relationship is measured; the resulting frame rate here is not**, because the
browser pane still does not composite and `requestAnimationFrame` fires zero
frames in it.

The stills also cost memory: roughly 400KB of cached data-URL strings for the
loadout page. That is a deliberate trade against per-frame compositor work.

## 2. Impact decals

`spawnTracer` already knew the shooter, the target and the spread, but a missed
shot simply ended in mid-air. Misses now continue to whatever they hit.

`spawnImpactDecal()` walks the same grid raycaster the renderer and
line-of-sight checks use, so a mark can only land on a surface those already
agree is solid. Height comes from carrying the shot's own rise or fall past the
target; if that puts the round below the floor it becomes a floor mark instead,
which is where most wild shots go. The mark is nudged out of the surface so it
cannot z-fight with the wall it sits on.

Each decal is a pale chipped rim under a dark core — two draws rather than one,
because a single black plate reads as a sticker stuck on the wall while a rim
gives the mark an edge the scene lighting can catch.

| | |
| --- | --- |
| Ring buffer cap | 48 decals |
| Cost per decal | 2 draw calls |
| Worst case | 96 draw calls |
| Measured, 26 decals in view | 713 → 765 draw calls |

Verified spawning on both wall orientations in all four arenas, and that 200
spawns settle at the 48 cap. They are drawn in the dynamic pass, never inside
`drawStaticWorld`, so Build 12.154's batching cannot bake and freeze them —
which is exactly the hazard that build's contract warns about. They are cleared
with the tracers on round reset.

## Checks run

| Check | Result |
| --- | --- |
| `py -3 build.py` | pass |
| Double build, bundle and standalone hashes | **identical** |
| Root `cod.html` vs standalone | **byte-identical** |
| 42 modular files + bundle + standalone inline script parse | **42/42, 1/1** |
| `loadoutStillForTest()` | ok — all 4 weapons and all 5 vests rasterise, 148 materials cached |
| `impactDecalForTest()` | ok on citadel, dune, aurora and office; both wall orientations |
| Ring buffer cap | 48 after 200 spawns |
| Inspect toggle, four-step sequence | never more than one live rig |
| `ar4WeaponModelForTest`, `weaponGeometryIntegrityForTest` | pass |
| `weaponSlotSystemForTest`, `weaponSwitchingForTest`, `viewmodelWeaponPresentationForTest`, `operatorWeaponAttachmentForTest` | pass |
| `armourSystemForTest`, `armour3dPresentationForTest`, `armourLoadoutMappingForTest` | pass |
| `cashWeaponStoreForTest`, `typographyConsistencyForTest`, `firstMatchGuidanceForTest` | pass |
| `allArenaGeometryIntegrityForTest`, `arenaSurfaceSampleForTest`, `staticOcclusionForTest` | pass |
| `mobileInterfaceAuditForTest()` | overlapping 0, collapsed 0, overflow 0, tiny text 0, small targets 0 |
| Console/runtime errors | none |
| Rendered captures reviewed | still sheet for every weapon and vest; decals in a Citadel corridor |
| **Frame rate** | **not measured — the browser pane does not composite** |

Weapon and armour statistics, geometry, collision, navigation, saves and match
simulation are untouched. The Supply Depot store cards keep their live orbit;
that animation is a deliberate presentation choice and was out of scope here.

## For anyone adding to this

- A still is a **renderer**, not a geometry authority. Feed it the shared part
  list; never give it its own.
- Do not hard-code material colours into it. The probe reads them from CSS on
  purpose, and a hand-written table would be wrong the first time a material
  changed.
- Only one live rig may be mounted at a time. `careerInspectState` is the single
  record of which, and every path that changes the selected item must clear it.
- Impact decals must stay outside `drawStaticWorld`. Batching bakes model
  matrices, so a decal captured into a batch would be frozen on the wall for the
  rest of the session.
