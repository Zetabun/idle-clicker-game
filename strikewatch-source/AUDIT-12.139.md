# Build 12.139 — Stated Requirement

## Reported problem

After Build 12.138 the manager could reach the training programme selects but
still could not complete `SET ONE TRAINING FOCUS`. The report was not that the
control was broken but that nothing said what was required: "it needs to tell
the player that the players need to be allocated a programme selection".

That reading was correct, and the save was not at fault. The reporter's career
was loaded into 12.138 and driven end to end: the selection staged, `SAVE
CHANGES` persisted `trainingFocus: "marksmanship"`, and the guide advanced. The
data was healthy; the interface was not.

## Root cause

`renderTrainingFacilityTab()` rendered the workflow draft bar fourth from the
top of the route and the roster panel last. Build 12.138 then added a guided
scroll that takes the manager down to the selects. Measured at 1440 × 900 with
the reporter's save, with the first `PROGRAMME SELECTION` on screen:

| Element | Position |
| --- | --- |
| Guide instruction card | 743px off-screen **above** |
| `SAVE CHANGES` bar | 631px off-screen **above** |
| Training Squad panel | visible |
| First `PROGRAMME SELECTION` | visible |

So the manager arrived at the only control the objective names, with the
instruction that a second step exists and the button that performs it both far
above the fold. Nothing in view stated the requirement, nothing announced that
a pending change existed, and the panel's own copy was descriptive
("Technical programmes build progress slowly") rather than instructional.
Build 12.138's scroll fix made this worse: it delivered the manager to the
control and away from the explanation.

## Changes

- `js/38-development.js` — `renderTrainingFacilityTab()` wraps the draft bar
  and the roster panel in a single `.training-programmes-zone`, and the guide
  anchor `data-guide-target="training-programmes"` moves to that wrapper. The
  save control now travels with the controls it saves. The panel head states
  the requirement and tracks the manager's progress through it:
  - nothing assigned → `ACTION REQUIRED` · "No operator has a training
    programme. Pick one from PROGRAMME SELECTION on any operator below, then
    press SAVE CHANGES above."
  - chosen but unsaved → `ONE STEP LEFT` · "1 programme is chosen but not yet
    active. Press SAVE CHANGES above to confirm."
  - satisfied → the original descriptive copy returns.
  Saved focus decides whether the objective is outstanding; staged focus
  decides what has been chosen but not committed.
- `css/game.css` — `.training-programmes-zone` at the release end of the file:
  a grid wrapper inheriting the `#menuContent` gap, with no overflow clipping
  (see `AUDIT-12.135.md` for the container-collapse hazard). `.needs-programme`
  adds an accent rail and accent kicker so the requirement reads as required.
- `js/39-workflow-integrity.js` — `workflowSaveTrainingDrafts()` honours the
  result of `setPlayerTrainingFocus()`. That function refuses while a match is
  live, but the save path set `changed = true` regardless, cleared every draft,
  saved and re-rendered — reporting a save that never happened and silently
  reverting the selection. Rejected drafts now stay staged and the manager is
  told why.
- `js/70-runtime.js`
  - `firstMatchGuidanceForTest()` suppresses persistence for the whole replay.
    The hook blanks `careerState.squad`, `market`, `tutorial` and
    `totalMatches` to replay earlier steps, and several renders it drives call
    `saveCareerState()`, so running it against a real career persisted an empty
    squad over it. Reproduced on the reporter's save during this investigation
    and recovered from the backup key. The body moved to
    `firstMatchGuidanceReplayForTest()`; the public hook wraps it.
  - The training destination assertions follow the new structure: the anchor is
    the programmes zone, and it must carry the save control, the roster panel
    and the requirement copy.
- Version metadata: `js/00-core.js`, `index.html`.

No gameplay, economy, save schema (19) or diagnostics schema (1) change.

## Verification

Driven against the reporter's own career save on the built standalone.

- All 38 modular files, the generated bundle and the standalone inline script
  parse.
- Requirement copy transitions correctly: `ACTION REQUIRED` → (choose) `ONE
  STEP LEFT` → (save) `ACTIVE PROGRAMMES`, with `marksmanship` persisted to the
  save, the squad intact at five operators and the next priority becoming
  Tactics.
- Arrival geometry after scrolling to the objective:

| Width | Save control visible | Requirement copy visible | Select visible | Zone collapsed | Horizontal overflow |
| --- | --- | --- | --- | --- | --- |
| 320 | yes | yes | yes | no | 0 |
| 390 | yes | yes | yes | no | 0 |
| 430 | yes | yes | yes | no | 0 |
| 1024 | yes | yes | yes | no | 0 |
| 1920 | yes | yes | yes | no | 0 |
| 844 × 390 | yes | yes | no | no | 0 |

- `firstMatchGuidanceForTest()` returns `ok: true` with every check passing, and
  leaves the save byte-intact: squad 5 and `totalMatches` 1 before and after.
- `mobileInterfaceAuditForTest()` at 390px: zero overlapping, zero collapsed and
  zero overflowing panels across the audited routes.
- Adjacent hooks pass: `recruitmentRoleGuideForTest`, `openingWeekFlowForTest`,
  `onboardingClarityForTest`, `guidanceConsolidationForTest`,
  `newPlayerOrientationForTest`, `economyGuidanceForTest`,
  `typographyConsistencyForTest`, `firstMatchPayoffForTest`,
  `stateIntegrityForTest`, `matchPlanPersistenceForTest`,
  `weaponSlotSystemForTest`, `tacticalCoachingDestinationForTest`.

## Observed, not changed

- At 844 × 390 the content pane is 317px tall. The requirement copy and the
  save control are both on screen on arrival, but the first select sits just
  below the fold. The manager is now told what to do before they scroll, which
  was the actual failure.
- A native `<select>` popup cannot be driven from the automation used here, so
  the click-to-choose interaction itself is verified only through dispatched
  `change` events and the surrounding geometry.
