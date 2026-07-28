# Build 12.152 — Preview Fit

## Reported problems

1. The AR-4's magazine still looks strange.
2. The weapon previews in the Armoury inventory panel look odd.
3. The Armoury individual-loadout page is still heavy and laggy.

Investigating (2) uncovered a fourth problem that Build 12.151 introduced and
that explains a good deal of (1) and (3).

## 0. Regression from 12.151 — the AR-4 inspector was rotated twice

Build 12.151 moved the weapon viewer's rotation off the rig root and onto a
`.career-weapon-viewer-pivot`, and gave the rig this rule:

```css
.career-weapon-viewer-pivot > .career-weapon-rig { transform: translate3d(0,-8px,0) scale(var(--viewer-zoom)); }
```

That selector is specificity (0,2,0). A pre-existing rule was still in the sheet:

```css
.career-weapon-inspector.ar4-sentinel .career-weapon-rig {
  transform: translate3d(0,10px,0) rotateX(var(--viewer-pitch)) rotateY(var(--viewer-yaw)) scale(var(--viewer-zoom)) scale(.72);
}
```

That one is (0,3,0), so it won. `--viewer-pitch` and `--viewer-yaw` are no longer
written by JavaScript, but they still have their static defaults of `-10deg` and
`-28deg` in the base rule — so the AR-4's rig kept applying a fixed rotation on
top of the pivot's live one. Measured on the shipped 12.151 build, the inspector
rig's computed transform was a full rotation matrix rather than the pure scale
and offset it should have been.

The effect: the AR-4 inspector rendered at a permanent compound offset angle, and
dragging rotated a frame that had already been turned. **It affected only this
model**, because it is the only model with a per-class inspector override — which
is exactly why it was not caught. It also flattered the magazine complaint: the
magazine was being viewed from a skewed angle.

### Change

Every AR-4 inspector override now targets `.career-weapon-viewer-pivot > .career-weapon-rig.ar4-sentinel`
and carries scale and offset only. Rotation belongs to the pivot; the rig must
never re-apply it.

| | 12.151 | 12.152 |
| --- | --- | --- |
| Inspector rig computed transform | `matrix3d(0.6357, 0.0587, 0.3329, …)` — a rotation | `matrix(0.72, 0, 0, 0.72, 0, 10)` — scale and offset |

## 1. The magazine

12.151 built the magazine from two hand-placed segments at -5deg and -15deg.
Reading the rotated corners out of the live rig showed why it looked broken: the
lower segment's top-front corner sat at (23.7, 106.3) while the upper segment's
bottom-front corner sat at (25.1, 122.8). The lower segment stood **16 units
proud** of the joint, on a magazine only 70 units wide, and the two segments were
different widths so their walls crossed rather than continuing. That is the notch
in the report.

Two further faults in the same assembly: `mag-rib-front` ran from y 43 to y 121
and `mag-rib-rear` from 41 to 115, while the magazine continued to y 170 — so
both ribs stopped dead in mid-air two thirds of the way down. And the ribs sat at
z 22.4 against a lower segment only 44 deep, so they had nothing behind them.

### Change

The magazine is now a **chain**. Each segment is placed where the previous one
ended, computed rather than typed:

```js
const magSegments = [{ h: 46, rz: -4 }, { h: 46, rz: -9 }, { h: 44, rz: -14 }];
```

Rake increases 5 degrees at a time instead of 10, every segment is the same
width, each drawn 4 units taller than its step so no joint can open, and the base
plate inherits the last segment's rake. The ribs are gone — the seams between
chained segments already give the magazine its form, and the ribs were the part
that read as broken.

Part count 75 to 74. Verified against a render from both flanks with the
magazine highlighted: one continuous curve, no notch.

## 2. The inventory previews

The framing of a weapon in a preview box was a hand-tuned scale and nudge per
model class per context. Measured in the live DOM on 12.151:

| Preview | Box | Model projected | |
| --- | --- | --- | --- |
| P12 Scrapline thumbnail | 104x76 | 100x69 | fits |
| **AR-4 Sentinel thumbnail** | 104x76 | **166x70** | **cropped, 1.6x over** |

`.career-weapon-mini3d` sets `overflow: hidden`, so the AR-4 preview was showing
the middle third of the rifle with both ends cut off. There were four separate
hand-tuned AR-4 scale overrides in the sheet and it still did not fit.

### Change

The rig now publishes its own measurements — `--model-span`, `--model-rise`,
`--model-centre-x`, `--model-centre-y`, taken from the parts actually drawn — and
each context declares `--fit-span`, the number of model units it wants to show:

```css
transform:
  translate3d(0, -3px, 0)
  rotateX(-12deg) rotateY(-32deg)
  scale(calc(var(--fit-span) / var(--model-span, 304)))
  translate3d(calc(var(--model-centre-x, 0) * -1px), calc(var(--model-centre-y, 0) * -1px), 0);
```

The centring translate runs **innermost**, so it applies in unscaled model units
and puts the model's bounding-box centre on the rig origin. A rifle and a pistol
therefore both land centred in the same box with no per-model number. Three
hand-tuned overrides are deleted.

| Preview | Box | Projected | Fills |
| --- | --- | --- | --- |
| P12 Scrapline | 104x76 | 80x64 | 77% x 85% |
| AR-4 Sentinel | 104x76 | **93x36** | 90% x 48% |

Both fit. The AR-4 is letterboxed vertically because it is a long, thin object
shown at a size where its length is the constraint — that is correct, and it now
reads as a whole rifle instead of a cropped receiver.

## 3. The loadout page

Measured before changing anything, with the AR-4 selected:

| Element | Box | Quads |
| --- | --- | --- |
| P12 thumbnail | 104x76 | 150 |
| **AR-4 thumbnail** | **104x76** | **392** |
| AR-4 inspector | 592x310 | 392 |
| Armour thumbnail | 118x132 | 134 |
| Armour inspector | 592x426 | 202 |
| **Total** | | **1,270** |

The two list thumbnails were 43% of everything on the page, drawing full
inspection models into 104x76px boxes where one model unit is about a tenth of a
pixel. That is precisely the rule 12.151 added to `CONTRACTS.md` — detail
proportionate to the size drawn — applied to the depot but not to weapons.
Armour has had `careerArmourThumbnailParts()` since 12.54; weapons had no
equivalent.

### Changes

**`careerWeaponThumbnailParts()`** — a whitelist of the volumes that carry a
weapon's silhouette. Whitelisted rather than blacklisted so a new part is left
out of thumbnails until someone decides it belongs. Verified against a render:
both thumbnails read as complete weapons, nothing disconnected.

**`will-change` hygiene.** `will-change: transform` sat on the base
`.career-weapon-rig` and `.career-armour-model-system` rules, and on every
`.career-armour-viewer-pivot`. That promoted **seven** elements on the Armoury to
permanent compositor layers, each holding hundreds of 3D quads, when only two of
them ever move. Promotion now sits only on the elements that are actually
animated: the two inspector pivots and the depot's store orbits.
`syncCareerArmourViewerTransform()` selects
`[data-career-armour-viewer] [data-career-armour-pivot]`, so the armour promotion
is scoped to match that selector exactly.

| | before | after |
| --- | --- | --- |
| Loadout page quads | 1,270 | **1,046** |
| AR-4 thumbnail quads | 392 | 216 |
| P12 thumbnail quads | 150 | 102 |
| Promoted compositor layers | 7 | **2** |

The Supply Depot is unchanged at 1,268 quads and now promotes 4 layers — the four
store orbits, which genuinely animate.

### What was investigated and deliberately not changed

`update()` in `js/70-runtime.js` calls `updateHud()` **every frame** in the
management menu: the throttle is `hudRefreshAccumulator >= 0.05 || (!shouldSimulateMatch && appState !== 'free-roam')`,
and the second clause is always true there, so the match HUD — every element of
which is hidden in the menu — is rewritten sixty times a second. That looks like
an obvious win, so it was measured: writing to those elements and forcing a style
flush costs **0.01ms, and is identical with the 3D rigs present and with them
hidden**. The hidden HUD subtree contains its own invalidation and does not touch
the models. Throttling it would have been a change with no evidence behind it, so
it was not made. The inversion is real and worth fixing on its own merits, but it
is not why these pages are slow.

## Checks run

| Check | Result |
| --- | --- |
| `py -3 build.py` | pass |
| Double build, bundle and standalone hashes | **identical** |
| Root `cod.html` vs standalone | **byte-identical** |
| 41 modular files + bundle + standalone inline script parse | **41/41, 1/1** |
| `ar4WeaponModelForTest()` | ok — 74 parts, 30 rounded, 7 cylindrical |
| `weaponGeometryIntegrityForTest()` | ok — 4 model classes, both contexts, 1 component each |
| Magazine assembly | `magazine`, `mag-segment-1`, `mag-segment-2`, `mag-base`, all travelling with the reload, gaps 0 |
| Inspector rig transform | `matrix(0.72, 0, 0, 0.72, 0, 10)` — no rotation, regression closed |
| Thumbnails fit their boxes | P12 80x64 and AR-4 93x36 in 104x76 |
| `weaponSlotSystemForTest`, `weaponRoleBalanceForTest`, `weaponSwitchingForTest` | pass |
| `viewmodelWeaponPresentationForTest`, `operatorWeaponAttachmentForTest` | pass |
| `operatorWeaponLoadoutMappingForTest` | pass on a seeded career, 10 operators, 0 mismatches |
| `armourSystemForTest`, `armour3dPresentationForTest`, `armourLoadoutMappingForTest`, `armourMatchAttritionForTest`, `spectatorArmourHudForTest` | pass |
| `cashWeaponStoreForTest`, `typographyConsistencyForTest`, `firstMatchGuidanceForTest` | pass |
| `mobileInterfaceAuditForTest()` | overlapping 0, collapsed 0, **overflow 0** (12.151 had 12, 12.150 had 117) |
| Console/runtime errors | none |
| Renders reviewed | AR-4 side and both flanks with the magazine highlighted; both thumbnail LODs |
| **Frame-interval measurement** | **still not possible — the browser pane does not composite** |

## Verification limit, unchanged from 12.151

`requestAnimationFrame` fires zero frames in a browser pane that is not being
displayed, which was confirmed with an 8-frame probe before any timing work was
attempted. Quad counts, compositor-layer counts, computed transforms, projected
geometry and forced style-recalc timings are all exact and were read from the
live DOM. **Frame rate was not measured.** The loadout page sheds 18% of its
quads and five of its seven compositor layers; the depot is unchanged from
12.151. Re-run the benchmark with the pane visible before quoting a frame time.

Weapon and armour statistics, ranges, penetration, handling, saves and match
simulation are untouched. Every change is geometry, markup or presentation.
