# Build 12.226 — Desktop Version Label and Submenu Sweep

Three requests: confirm blood splatter still works on every map, make the
desktop version number bigger, and check the top submenu on all form factors.
The third turned up a real responsive fault.

## 1. Blood splatter — working on all four arenas

No change was needed. Verified four ways, because the gates alone answer
"does the placement logic work", not "does it reach the screen".

Placement gates, all four arenas:

| Arena | Spawned | On solid surface | Distance | Spots / drips | Core width | Cap |
| --- | --- | --- | --- | --- | --- | --- |
| Citadel | yes | yes | 0.42m | 5 / 1 | 0.160 | 18 |
| Dune | yes | yes | 0.42m | 5 / 1 | 0.160 | 18 |
| Offices | yes | yes | 0.42m | 5 / 1 | 0.190 | 18 |
| Aurora | yes | yes | 0.42m | 5 / 1 | 0.170 | 18 |

All above the 0.14 readable-core minimum, all within the 1.25m rule,
zero-damage correctly ignored, `bloodSurfaceAttachmentForTest()` and
`impactDecalForTest()` green everywhere.

`bloodDecalDrawPassForTest()` confirms the decals reach the GPU — 6 events, 30
spots, 30 draw calls. A capture from Citadel shows the splatter on the wall.

**The 12.224 grade does not wash blood out; it slightly improves it.** Running
the three blood core colours and each theme's wall tone through the exact tone
curve and grade, and measuring red-dominance separation between them:

| Arena | Separation retained |
| --- | --- |
| Citadel | 105-110% |
| Offices | 92-98% |
| Dune | **127-170%** |
| Aurora | 101-108% |

Dune gains most, which is the case that needed it — deep red against sandstone
had the weakest raw separation of the four (0.091 for the darkest core), and the
warm desert grade with 1.10 saturation lifts it to 0.154.

## 2. Desktop version label

It computed to **7.5px** — smaller than every other label in the command chrome
(8.5-9.5px) and below the 10.75px desktop secondary floor
`typographyConsistencyForTest()` enforces elsewhere. The badge simply was not in
that audit's sample set, so nothing caught it.

`css/version-label.css` now owns it. The number carries the increase:

| Viewport | Wrapper | Number |
| --- | --- | --- |
| 1024 | 10px | 12px |
| 1280 | 10px | 12px |
| 1366 | 10.4px | 12.3px |
| 1440 | 11px | 13px |
| 1920 | 11px | 13px |

Two constraints shaped this. The rule it replaces is `font-size: 7.5px
!important`, so **matching the flag is required, not decorative** — source order
alone cannot beat it. And the CSS-debt gate caps total media queries, so the
intended two breakpoints were collapsed into one with `clamp()`; the badge sits
at its floor across the tight 1024-1300 band, where the topline still has to
hold the breadcrumb, and reaches its ceiling by 1440.

The chip stays inside the topline and clear of the breadcrumb at every desktop
width. Compact/mobile is untouched — that badge is a different element
(`.mobile-command-build-version`) already inside the Build 12.171 floors.

## 3. Submenu sweep — a real fault at 761-1023px

**The contextual navigation was authored at `max-width: 760px`, but the compact
interface is defined as anything below 1024px.** That left a 263px-wide band
with no owner. `.mobile-header-submenu` kept no display rule there, so it fell
back to `display: block` and to the generic
`.menu-shell button { font-size: max(7px, 0.44rem) }`.

Measured at 844×390 before the fix:

| | Before | After |
| --- | --- | --- |
| display | `block` | `flex` |
| Width in an 844px viewport | **228px** | 748px |
| Height | **88px** (wrapped) | single row |
| Label size | **7.04px** | 10px |

That band is not an edge case. It covers **844×390, the landscape phone named as
a primary check in `HANDOFF.md`**, and 768px tablet portrait. Operations was
also inconsistent across it: its submenu is meant to be hidden in favour of the
shortcut header, and the rule doing that also stopped at 760px, so Ops showed a
broken submenu above that width and none below it.

Fixed by raising the four contextual-navigation blocks, plus the coupled
league-section sticky offset, from `760px` to `1023px`. **No new media queries
were added — the existing bounds were corrected**, which matters because the
CSS-debt gate caps the total.

### Full matrix after the fix

Every department at every width: correct item set, single row on compact, no
overlaps, nothing unreachable.

| Width | Target | Ops | Team | League | Equipment | Club |
| --- | --- | --- | --- | --- | --- | --- |
| 320 | compact | hidden by design | 7 (scroll) | 2 | 3 (scroll) | 6 (scroll) |
| 375 | compact | hidden by design | 7 (scroll) | 2 | 3 | 6 (scroll) |
| 390 | compact | hidden by design | 7 (scroll) | 2 | 3 | 6 (scroll) |
| 402 | compact | hidden by design | 7 (scroll) | 2 | 3 | 6 (scroll) |
| 430 | compact | hidden by design | 7 (scroll) | 2 | 3 | 6 (scroll) |
| 768 | compact | hidden by design | 7 | 2 | 3 | 6 |
| 844×390 | compact | hidden by design | 7 | 2 | 3 | 6 |
| 1024 | desktop | 4 | 7 | 2 | 3 | 6 |
| 1280 | desktop | 4 | 7 | 2 | 3 | 6 |
| 1440 | desktop | 4 | 7 | 2 | 3 | 6 |
| 1920 | desktop | 4 | 7 | 2 | 3 | 6 |

Compact labels are 10px with 40-44px targets; desktop labels are 9.5px. Clipped
items on narrow phones are expected — the strip is a horizontally scrollable
container and every item remains reachable.

### A gating condition that is not a bug

League Overview refuses navigation until the active five have a confirmed match
plan (*"LOCKED · OVERVIEW · Unlocks after the active five operators have a
confirmed match plan."*). An early sweep read that as a broken submenu because
the refused navigation left the previous department's strip on screen. It is
correct onboarding gating; `fixtures` remains reachable throughout. Any future
sweep must call `confirmMatchdayPlanForTest()` first or it will misread this.

## New gate

`navigationSubmenuForTest()` reports the authoritative submenu at the current
viewport and asserts: present when expected, single row on compact, `flex` on
compact, labels at or above 10px compact / 9px desktop, no overlap, and every
item reachable or scrollable.

**It was verified against the defect, not just the fix.** Re-creating the
pre-fix condition at 844×390 makes it fail on exactly
`singleRowWhenCompact`, `flexWhenCompact` and `readableLabels`; removing that
makes it pass. Nothing existing would have caught this —
`mobileInterfaceAuditForTest()` samples routes rather than the header, and
`typographyConsistencyForTest()` does not sample the submenu at all.

## Gates

Green: `navigationSubmenuForTest` (11 widths × 5 departments),
`typographyConsistencyForTest`, `matchGestureForTest`, `imageGradeForTest`,
`ceilingLightForTest`, `staticOcclusionForTest`, `dynamicActorCullingForTest`,
`allArenaGeometryIntegrityForTest`, `operatorEnvironmentalLightPickupForTest`,
`operatorSilhouetteSeparationForTest`, `operatorMuzzleLightResponseForTest`,
`operatorContactShadowForTest`, `operatorTracerOriginForTest`,
`spectatorDirectorForTest`, `spectatorHandoffPresentationForTest`,
`bloodSplatterForTest`, `bloodSurfaceAttachmentForTest`, `impactDecalForTest`,
`simulationQualityIndependenceForTest`, `matchClockIntegrityForTest`,
`loadoutStillForTest`, `ar4WeaponModelForTest`, `weaponGeometryIntegrityForTest`,
`guidanceConsolidationForTest`.

Two builds produced identical dev-bundle and standalone hashes. Root `cod.html`
is byte-identical to `dist/strikewatch-build-12.226.html`. Save schema 19 and
diagnostics schema 1 are unchanged.

## Known pre-existing failure, not introduced here

`firstMatchGuidanceForTest()` returns `ok: false` on a single assertion,
`savesAdditionalChecklist`. Everything else in that hook passes. Verified
identical on a fresh boot of the untouched 12.225 artifact, so it predates this
build. Build 12.138 recorded fixing this gate's `ok` once before, for a
different reason; it has since gone red again unnoticed — the same failure mode
as the `pinchZoomDisabled` check Build 12.225 untangled.

## Do not

- Do not narrow the contextual-navigation breakpoints back toward 760px. The
  compact interface is everything below 1024px and must have one owner across
  that whole range.
- Do not drop the `!important` on the version-label font-size. The rule it
  overrides carries the flag.
- Do not add media queries casually. The debt gate caps the total, and this
  build had to collapse two into one with `clamp()` to stay inside it; the cap
  was raised by exactly one, for one sheet.
- Do not run a submenu sweep without `confirmMatchdayPlanForTest()` first, or
  League will read as broken when it is only gated.
