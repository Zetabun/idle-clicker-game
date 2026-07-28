# Build 12.151 — Sentinel Rebuild

## Reported problems

1. The AR-4 Sentinel's shape and detail do not look good.
2. Heavy performance problems on the Armoury individual-loadout screen.
3. Worse performance again on the Supply Depot armour store.

All three were real. Problems 2 and 3 turned out to have different causes.

## Measurement first

The Supply Depot was profiled before anything was changed, at 1440x900 with all
four store cards in view:

| Reading | Value |
| --- | --- |
| Frame interval (median of 90 rAF samples) | **58.3 ms** (~17 fps) |
| Frame interval p90 / max | 112.5 ms / 250 ms |
| `runtimeFrameMs` (the game's own JavaScript) | **1.59 ms** |
| `runtimeUpdateMs` / `runtimeRenderMs` / `runtimeHudMs` | 0.28 / 1.31 / 0.20 ms |
| `PerformanceObserver` long tasks over 70 frames | **0** |
| Face elements in the four armour rigs | **2,448** |

The game's own work accounted for 1.6 ms of a 58 ms frame and there were no long
tasks at all, so the cost was entirely browser style/layout/paint/composite.
Hiding the four rigs settled it:

| Variant | Median frame |
| --- | --- |
| Baseline | 58.3 ms |
| `.career-armour-rig { display: none }` | **4.2 ms** |
| One card's rig visible, three hidden | 12.5 ms |
| Half the faces hidden (`back`, `bottom`, `left`) | 37.5 ms |
| Faces flattened — no filter, no box-shadow, no border, solid colour | 58.4 ms |
| Orbit animation removed | 75 ms (no improvement) |

The last two rows are the important ones. Stripping every paint decoration off
the faces changed nothing, and removing the animation changed nothing, but
halving the **number** of face elements roughly halved the frame. These surfaces
are quad-bound: the cost is the count of 3D quads Chrome has to transform and
sort, not what is painted into them. That is now recorded in `CONTRACTS.md`.

## 1. The Armoury loadout screen — a repeat of the 12.142 defect

`syncCareerWeaponViewerTransform()` wrote `--viewer-yaw`, `--viewer-pitch` and
`--viewer-zoom` onto every `[data-career-weapon-rig]` in the menu, once per
rotation step. Those are **inherited custom properties**, so each write
invalidated the computed style of every cuboid face below the rig. This is
exactly the fault Build 12.142 diagnosed and fixed for the armour viewer; the
weapon viewer was never converted, and `CONTRACTS.md` has forbidden the pattern
since that build.

It was worse than the armour case had been, because the selector matched the
**inventory thumbnails** as well as the inspector. Those thumbnails override
`transform` in CSS and ignore the viewer variables entirely, so each one paid a
full subtree invalidation per frame to move nothing.

Measured on the Armoury with the AR-4 selected (three rigs, 804 faces):

| Path | Cost per rotation step |
| --- | --- |
| Custom properties on every rig (before) | **7.63 ms** |
| Direct `transform` on one pivot (after) | **0.015 ms** |

### Change

- `careerWeapon3dMarkup()` wraps the interactive rig in a
  `.career-weapon-viewer-pivot` carrying `data-career-weapon-pivot`, and emits
  no viewer style at all for non-interactive thumbnails.
- `syncCareerWeaponViewerTransform()` writes `transform` to the pivot only.
- Zoom moves to `syncCareerWeaponViewerZoom()` and stays on the custom property
  on purpose: it changes on a button press, never on the animation path. This
  matches the deliberate split 12.142 made for `--armour-viewer-scale`.
- `updateCareerWeaponViewer()` now also skips a hidden document and an
  off-screen viewer, as the armour equivalent already did.

Re-measured after the change on the same page: **0.015 ms** per step against
**6.54 ms** for the old path run side by side on the same DOM — a 436x
reduction on the rotation path.

## 2. The Supply Depot — detail authored for a screen ten times the size

The depot draws four carriers at once into 232px cards. Each card rendered the
full inspection model built for the 610px armour inspector: 360 parts and 2,184
faces across the four, plus 264 faces of store-form mannequin.

At 232px the trim in that model cannot resolve. Measured against the rendered
part dimensions on the heaviest rig, 42 of its 105 parts had a smallest
dimension of 7 model units or less — 3-unit MOLLE rows, a 3-unit centre seam,
5-unit buckles and pouch caps, a 2-unit radio antenna. Every one still cost a
set of quads.

### Change

Three reductions, none of which removes a volume that carries the silhouette:

1. **`careerArmourStoreParts()`** — a store level of detail that drops twenty
   classes of sub-resolution trim (MOLLE rows front and rear, centre seam,
   cummerbund ribs, strap anchors and buckles, side buckles, pouch clips and
   caps, plate cap, rear ID panel, radio screen/antenna/cable, drag-handle
   posts, rear straps, rear hems, radio clips). Shells, wings, plates, pockets,
   cummerbund, shoulders, collar, neck guard, abdomen, groin, belt, buckle,
   pouches and hems all stay.
2. **Thin-part face culling**, shared by every CSS-3D model
   (`careerWeaponCuboidFaces()`): a part whose smallest dimension is 6 model
   units or less emits only the two faces perpendicular to that axis. The other
   four are edge-on slivers at every scale the menus draw at. This applies to
   weapons as well — the P12 Scrapline drops from 210 faces to 138 with no
   visible change, verified against a render.
3. **Underside culling on the store orbit only.** `careerArmourStoreOrbit`
   holds pitch between -5deg and -7deg for its entire cycle, so the underside of
   every part faces away from the camera at all times.
   `backface-visibility: hidden` already stopped painting them; `display: none`
   removes the quad too.

Plus `content-visibility: auto` on the store viewport, so a card scrolled out of
the depot stops rendering its orbit entirely. The models were already clipped to
that box, so containment changes nothing that was visible.

### Result

| | Before | After |
| --- | --- | --- |
| Armour parts across the four cards | 360 | **214** |
| Face elements in the DOM | 2,448 | 1,508 |
| Face elements actually generating a quad | 2,448 | **1,268** |

A 48% reduction in rendered quads. Against the measured cost curve
(4.2 ms floor plus a term near-linear in quad count) that predicts roughly
32 ms, from 58 ms.

**This is a substantial improvement, not a complete fix.** The depot remains the
heaviest surface in the game, and four inspection-grade CSS-3D models on one
page is the underlying design problem. The next lever is a further cut to the
store LOD — the backing volumes behind plates (`plate-pocket lower`,
`rear-plate-pocket`, `abdomen-shell`, `groin-shell`, `side-pocket-*`) show only
a rim and are the safest remaining candidates, worth roughly another 25%.

### Verification status

The frame-interval re-measurement could not be completed: the browser pane
stopped compositing part-way through the work, and `requestAnimationFrame` does
not fire in a pane that is not displayed, so post-change frame timings would
have read as noise. The quad counts above are exact and were read from the live
DOM after the change; the frame-time figure is an extrapolation from the
measured before-curve and is labelled as such. **Re-run the depot benchmark with
the pane visible before treating the 32 ms figure as fact.**

## 3. The AR-4 Sentinel

The old model read as a stack of slabs. Reviewing it against a render found
specific faults rather than a general lack of polish:

- The stock hung off a bare `stock-rail` cylinder with no buffer tube.
- The "vents" were four flat black rectangles pasted on the **left flank only**;
  the right side of the handguard was bare.
- The top line was three different heights — a 382-unit rail floating above a
  separate `handguard-top` at another height above the upper receiver.
- The charging handle sat at y -84 and broke the top profile.
- The magazine was a straight box.
- The trigger guard was a single flat bar, the fault 12.150 fixed on the Viper.
- **The pistol grip raked at -12 degrees**, which under the convention Build
  12.149 established points the butt at the target. 12.149 corrected the sign on
  every sidearm through `addGripAssembly()`; the AR-4 authors its grip directly
  and was missed.

### Change

Rebuilt around real carbine landmarks, 62 parts to 75:

- **Stock**: a `buffer-tube` cylinder for the stock to ride, a comb and rubber
  cheek pad, an adjuster, a butt plate with a toe.
- **Handguard**: three recessed slots per flank, **mirrored**, using the 12.148
  recessed-port pattern of a shadow well with the cut standing proud of it.
- **Top line**: one continuous 380-unit flat-top rail from receiver to front
  sight. Rail cross-slots are a repeating-gradient `picatinny` material rather
  than dozens of extra cuboids — the surface is quad-bound, so geometry is the
  expensive way to draw a texture.
- **Receiver**: brass deflector, takedown pins, a smaller ejection port with a
  proud lip, charging handle dropped to y -68 and moved behind the rear sight.
- **Magazine**: two segments plus base plate at -5/-15/-15 degrees, so it curves
  **toward the muzzle** as a box magazine does.
- **Grip**: rake corrected to **+14 degrees**, with sub-part positions rotated
  about the grip centre per the 12.148 rigid-assembly rule, plus a beavertail
  tying it into the lower receiver and a grip cap.
- **Trigger**: three-piece guard bow with the trigger seated inside it.
- **Muzzle**: barrel step, collar and a brake with three port cuts.
- The blue accent is a thin inlay instead of a glowing stripe.

Despite 13 more parts the model is essentially face-neutral — 384 to 392 —
because thin-part culling pays for the additions.

### Magazine reload transform

`careerWeaponPartMovesWithMagazine()` matched exactly `magazine` and `mag-base`.
The AR-4's `mag-rib-front` and `mag-rib-rear` were **already** outside it and
hung in mid-air while the magazine dropped — a pre-existing defect the curved
lower segment would have made much more obvious. The predicate now matches
`magazine` and any `mag-` prefixed part (`magwell` does not match), and the
audit invariant changed from "exactly two parts" to "every authored magazine
part travels with the reload".

`careerWeaponGeometryIntegrityAudit()` changed correspondingly: the base plate
no longer has to touch the magazine body **directly**, because `mag-lower` now
sits between them. It walks the magazine parts and requires them to form one
connected group, which is the invariant that actually matters — the base cannot
float off during a drop.

## Checks run

| Check | Result |
| --- | --- |
| `py -3 build.py` | pass |
| `ar4WeaponModelForTest()` | **ok** — 75 parts, 29 rounded, 7 cylindrical, bounds x -368..457 (825 long), y -138.5..175.5, z -40..36 |
| `weaponGeometryIntegrityForTest()` | **ok** — all 4 model classes, both world and viewmodel contexts, 1 component each, magazine gap 0 |
| `weaponSlotSystemForTest`, `weaponRoleBalanceForTest`, `weaponSwitchingForTest` | pass |
| `viewmodelWeaponPresentationForTest`, `operatorWeaponAttachmentForTest` | pass |
| `operatorWeaponLoadoutMappingForTest` | pass (seeded career; it reports false on an unseeded page, which is state, not a regression) |
| `armourSystemForTest`, `armour3dPresentationForTest`, `armourLoadoutMappingForTest`, `armourMatchAttritionForTest`, `spectatorArmourHudForTest` | pass |
| `cashWeaponStoreForTest`, `typographyConsistencyForTest`, `firstMatchGuidanceForTest` | pass |
| P12 Scrapline reviewed against a render after face culling | no holes; slide, serrations, frame, grip, magazine and guard all intact |
| AR-4 reviewed against renders at four orbit angles | see above; two revision passes |
| Depot frame-interval re-measurement | **not completed — browser pane stopped compositing** |

Weapon and armour statistics, ranges, penetration, handling, saves and match
simulation are untouched. Every change is geometry, markup or presentation.

## Reviewing weapon geometry

The renders used for this build were produced by reading the live rig's
`--x/--y/--z/--w/--h/--d/--rx/--ry/--rz` custom properties out of the DOM,
projecting each part's eight corners through the same rotation order the CSS
uses, and drawing the faces the markup actually emitted with a painter's
algorithm onto a canvas. That is worth repeating: it caught the hollow stock,
the stepped rail line and a magazine curving the wrong way, none of which any
gate can see. As Build 12.150 recorded — `weaponGeometryIntegrityForTest()`
answers "is this one solid", never "does this look right".
