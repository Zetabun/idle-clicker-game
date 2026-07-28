# Build 12.141 — Banked Progress

Two of five reported items. The three remaining are visual passes (Dune arena,
armour, weapon models) and are deliberately not started here — see
"Not in this build".

## 1. Gold Coins lost on closing the browser after returning to HQ

### Root cause

`exitToMainMenu()` calls `createMatch()`, resets the menu context and drops
straight back to HQ **without writing a save**, and nothing wrote one when the
tab was closed, hidden or navigated away from. Anything banked into
`careerState` since the previous explicit save went with the session.

`advanceCareerDay()` (End Day) already saved and is unchanged.
`claimCareerCrate()` and `completeCareerMatch()` also already saved.

The reporter's own save is consistent with this: `goldCoins: 0`,
`goldCoinHistory: []` and `lastRound.goldCoinReward: null` despite
`totalMatches: 1`. Match settlement never reached that save.

### Change

`js/79-save-checkpoints.js` (new, registered in `build.py`) writes a career
save at the points where a manager reasonably believes progress is safe:

- any `match` or `free-roam` → `menu` transition (returning to HQ);
- `exitToMainMenu()`;
- `visibilitychange` → hidden, and `pagehide` (closing, backgrounding or
  navigating away — `pagehide` is the reliable signal on iOS Safari).

A 400ms floor prevents a burst of identical writes when a single action drives
several transitions. A rejected write does not update the floor, so it is
retried at the next checkpoint. `localStorage` is synchronous, so the write
completes inside the unload handler.

### Verification

Each checkpoint was isolated by desyncing the stored save (setting `goldCoins`
to 0 in `localStorage` without touching `careerState`) and then triggering only
that checkpoint:

| Checkpoint | Stored before | Stored after | Live value |
| --- | --- | --- | --- |
| `match` → `menu` | 0 | 250 | 250 |
| `visibilitychange` (hidden) | 0 | 250 | 250 |
| `pagehide` | 0 | 250 | 250 |

## 2. Reward reveal: rotating crate, weapon shown alone

### Change

- The crate rotates continuously while it is on screen. The rate is driven by
  the wall clock already passed into `renderCareerCrate3D(timeSeconds)`. A
  first attempt used a fixed per-call increment, which made the rate depend on
  how often the animation frame fired — measured at roughly a twentieth of the
  intended speed under a throttled frame rate. `spinBase` carries the manager's
  own drag across the automatic spin, so releasing a drag resumes from where
  they left it rather than snapping back.
- Once the reward scan begins, the crate is gone. `renderCareerCrate3D` no
  longer draws in the `cycling` or `revealed` phases, and
  `.career-crate-overlay.cycling/.revealed .career-crate-core` is hidden so no
  stale frame is left behind. The awarded weapon model takes the full display.

### Verification

| Overlay phase | Crate canvas | Weapon model |
| --- | --- | --- |
| `closed` | `block` | `none` |
| `opening` | `block` | `none` |
| `cycling` | `none` | `grid` |
| `revealed` | `none` | `grid` |

Rotation sampled through the new `crateSpinForTest()` hook: yaw advanced
monotonically from 0.2388 to 3.3012 rad over 4.66s with the crate in its
`closed` phase. The hook is registered from `js/79-save-checkpoints.js`, not
from the reward module, because `js/70-runtime.js` assigns
`window.__strikeDebug` wholesale and discards anything an earlier module
attached. The crate canvas is created without `preserveDrawingBuffer`, so
reading pixels back is not a valid way to confirm the rotation.

## Weapon model ownership (investigation only)

Requested before any weapon geometry is changed. There are **two independent
authorities**, and they do not share geometry:

| Authority | File | Feeds |
| --- | --- | --- |
| `careerWeapon3dParts(weapon)` → `careerWeapon3dMarkup()` (CSS 3D) | `js/35-career.js:3516` | crate reveal (`careerWeaponModelMarkup`), inventory thumbnails, armoury detail inspector, Supply Depot store cards |
| `operatorSharedWeaponRig()` / `drawUnifiedCareerWeapon()` (WebGL) | `js/62-character-renderer.js:440` | the weapon held by operators in a live match |
| `drawFirstPersonWeapon()` (WebGL) | `js/63-viewmodel-renderer.js:18` | the first-person viewmodel |

No WebGL renderer references `careerWeapon3dParts`. So every menu surface is
already consistent through one function, but a change made there will **not**
reach the in-match weapon, and vice versa. Any weapon rework has to change both
sides in step and re-run `operatorWeaponAttachmentAudit()`.

## Verification (release gates)

- All 40 modular files (38 existing plus two new), the generated bundle and the
  standalone inline script parse.
- Hooks pass: `firstMatchGuidanceForTest`, `recruitmentRoleGuideForTest`,
  `openingWeekFlowForTest`, `onboardingClarityForTest`,
  `guidanceConsolidationForTest`, `newPlayerOrientationForTest`,
  `economyGuidanceForTest`, `typographyConsistencyForTest`,
  `firstMatchPayoffForTest`, `stateIntegrityForTest`,
  `matchPlanPersistenceForTest`, `weaponSlotSystemForTest`,
  `tacticalCoachingDestinationForTest`, `leagueMatchFlowForTest`,
  `crateAttachmentForTest`.
- No gameplay, economy, save schema (19) or diagnostics schema (1) change.

## Not in this build

Three reported items are visual passes that need their own build rather than
being rushed alongside a persistence fix:

- **Dune arena and skybox.** The sky is a flat brown and the arena needs a
  visual pass. Constrained by the all-arena geometry integrity gates: appearance
  may change, collision and navigation may not.
- **Armour viewer.** Reported as lagging the game while the model is on screen,
  and as looking poor. The lag needs profiling before anything is restyled.
- **Weapon models.** The rifle is the worst offender. The ownership split above
  is the prerequisite finding; the work itself is a two-sided change.
