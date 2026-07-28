# Build 12.138 — Reachable Training

## Reported problem

The First Match Guide reached its final objective, `SET ONE TRAINING FOCUS`,
and offered `OPEN TRAINING`. Pressing it opened the Training Facility on a
screen that contained no way to set a training focus, and the guide could not
be completed. Because the closing step also gates the remaining club systems
and the End Day restriction, the career could not progress.

## Root cause

Two independent defects combined.

### 1. The closing guide step had no scroll destination

`firstMatchGuidance()` gives the two recruitment steps a `scrollTarget`
(`recruitment-candidates`), which `handleTeamManagementClick` forwards to
`scrollMenuGuideTargetIntoView()`. The `training` step had no `scrollTarget`,
and `.training-roster-panel` carried no `data-guide-target` anchor, so the
guide routed to the top of Training Facility and stopped.

The programme selects are the last panel on that route, below the development
intro, the alert strip, the draft bar, the hero and the Team XP benefit grid.
Measured on Build 12.137 with a five-operator squad and no active focus:

| Width | Scroll viewport | First `[data-training-focus]` offset | Visible on arrival |
| --- | --- | --- | --- |
| 390 | 713 | 2841 | no |
| 1024 | 719 | 1580 | no |
| 1440 | 819 | 1637 | no |
| 1920 | 999 | 1142 | no |

The `MANAGER RECOMMENDATION` highlight and `scrollTrainingRecommendationIntoView()`
only exist once `careerState.trainingRecommendation` has been set, which happens
only when the player opens a Manager Insight card in the debrief and uses its
`open-training` action. A player who reaches the step through the guide button
has no recommendation, so nothing pointed at the control.

### 2. Guided scrolling never worked below 1024px

`menuHistoryScroller()` returned `menuContentEl.closest('.menu-content')`
unconditionally. That element is the scrolling container on the desktop
Command Centre, but on the compact interface the scrolling container is
`#menuContent` itself and the `.menu-content` ancestor does not scroll.
`scrollCommandContentTargetIntoView()` therefore scrolled a non-scrolling
element and did nothing on every compact width.

This affected the existing `recruitment-candidates` destination introduced in
Build 12.129 as well as the new training destination. Measured on Build 12.137
at 390px, pressing `RECRUIT OPERATOR` left `scrollTop` at 0.

`menuHistorySnapshot()` read the same wrong element, so previous/next scroll
restoration was also inert on compact.

## Changes

- `js/50-ui-menus.js`
  - `firstMatchGuidance()` — the `training` step gains
    `scrollTarget: 'training-programmes'`. Its detail copy now names the
    control and the two-stage save (`Programme Selection` → `Save Changes`)
    instead of assuming a debrief recommendation exists.
  - `menuHistoryScroller()` — returns whichever of `#menuContent` or the
    `.menu-content` section can actually scroll, falling back to the previous
    result when neither overflows.
- `js/38-development.js` — `.training-roster-panel` carries
  `data-guide-target="training-programmes"`.
- `js/70-runtime.js`
  - `firstMatchGuidanceForTest()` replays the training step with a real squad,
    a reviewed debrief and no active focus, and asserts the step targets the
    programmes anchor, the objective button carries the scroll attribute, the
    anchor is the roster panel and it holds one select per contracted player.
    Reports `trainingSampled` so a career without five operators is not scored
    as a silent pass.
  - The `FIRST MATCH JOURNEY` strip assertion is now case-insensitive. The
    priority-strip kicker renders as `First match journey · …` and is uppercased
    by CSS, so the hook had been returning `ok: false` regardless of state.
- Version metadata: `js/00-core.js` (`BUILD_VERSION`, `BUILD_NAME`,
  `BUILD_ID`), `index.html` (title, asset queries, both visible labels).

No gameplay, economy, save schema (19) or diagnostics schema (1) change.

## Verification

Standalone `dist/strikewatch-build-12.138.html` served over HTTP and driven in
a live browser.

- All 38 modular files, the generated bundle and the standalone inline script
  parse.
- `firstMatchGuidanceForTest().ok` is `true` (was `false` on 12.137).
  `trainingSampled: true`, `trainingSelects: 5`, every `scrollChecks` entry
  passes.
- Guided arrival, measured after pressing `OPEN TRAINING` from the objective
  strip on a career seeded to the training step:

| Width | Viewport | scrollTop after arrival | Roster panel visible | First select visible | Horizontal overflow |
| --- | --- | --- | --- | --- | --- |
| 320 | 669 | 2410 | yes | yes | 0 |
| 375 | 681 | 2335 | yes | yes | 0 |
| 390 | 713 | 2329 | yes | yes | 0 |
| 430 | 801 | 2332 | yes | yes | 0 |
| 402 | 743 | 2332 | yes | yes | 0 |
| 1024 | 719 | 1580 | yes | yes | 0 |
| 1280 | 719 | 1269 | yes | yes | 0 |
| 1366 | 687 | 1204 | yes | yes | 0 |
| 1440 | 819 | 1191 | yes | yes | 0 |
| 1920 | 999 | 1142 | yes | yes | 0 |
| 844 × 390 | 317 | 1335 | yes | no — 131px below the fold | 0 |

- End to end at every width above: change one `Programme Selection`, press
  `Save Changes`, and `firstMatchGuidance()` returns `null` — the guide
  completes and the remaining club systems unlock.
- Recruitment regression at the same widths: pressing `RECRUIT OPERATOR` now
  scrolls the candidate list into view on compact (390px: `scrollTop` 0 → 775).
  Desktop behaviour is unchanged.
- Adjacent hooks pass: `openingWeekFlowForTest`, `recruitmentRoleGuideForTest`,
  `onboardingClarityForTest`, `guidanceConsolidationForTest`,
  `newPlayerOrientationForTest`, `economyGuidanceForTest`,
  `firstDebriefGuideForTest`, `firstMatchPayoffForTest`,
  `typographyConsistencyForTest`, `matchPlanPersistenceForTest`,
  `stateIntegrityForTest`, `weaponSlotSystemForTest`,
  `leagueMatchFlowForTest`, `tacticalCoachingDestinationForTest`.
- No console errors during the guided walkthrough.
- Two consecutive builds produce identical bundle and standalone hashes
  (`268eaf9e…`, `71ce23ca…`); root `cod.html` is byte-identical to the
  standalone.

On the landscape phone check (844 × 390) the content pane is only 317px tall.
The guide lands on the highlighted `TRAINING SQUAD` panel and the first operator
card, but that card's header and metrics consume the remaining height, so the
select itself sits 131px below the fold. The control cannot share a 317px
viewport with its own card header without redesigning the card, and the player
now arrives on the named panel instead of 2800px away from it, so the short
scroll is accepted rather than special-cased.

Guided scroll uses `requestAnimationFrame` with a 180ms timeout fallback. In a
backgrounded browser tab rAF does not fire and the smooth scroll does not
animate, which reads as "the scroll did not happen". Verify guided scrolling
on a fronted tab.

## Observed, not changed

- `tacticalCoachingDestinationForTest()` returns `ok: false` when called on a
  career that has not yet reviewed a debrief, on 12.137 and 12.138 alike. The
  Training route is legitimately locked at that point, so the hook is failing
  its own precondition rather than reporting a product defect. It passes once
  the debrief has been reviewed.
- The `plan` step lands on the top of Tactics with `CONFIRM PLAN` roughly 4250px
  further down at 1440px. That is the intended flow — the player is meant to
  work through the selections first — and `CONTRACTS.md` forbids a second
  floating confirmation, so no scroll target was added.
- On the Training route the End Day restriction card renders with the guide's
  own action as its title (`OPEN TRAINING · Complete the current First Match
  Guide objective first: SET ONE TRAINING FOCUS`). It is accurate but reads as
  circular while the player is already on that route.
