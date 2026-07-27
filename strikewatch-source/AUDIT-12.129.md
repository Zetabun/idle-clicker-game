# Audit — Build 12.129 (Guided Opening Flow)

Build ID: `12.129.0-guided-opening-flow`

## Problem

Player report: the new-player onboarding felt confusing and muddled, with
moments that presented as a progression lock. Source inspection confirmed
three concrete causes inside the First Match Guide flow.

1. **Matchday dead-end.** While `firstMatchGuidance()` is active the Command
   Centre guide branch (`renderTeamOperationsDashboard`) hid the entire
   dashboard, including the only `START MATCHMAKING` control. The guide's
   `match` step pointed at the `play` route with no working action, and on
   matchday `openingWeekTutorialDayRestriction()` also disabled End Day. The
   guided path therefore had no visible way to start the first match.
2. **Backwards guide steps.** The `recruitment`, `profile` and `lineup` steps
   completed only through route-view flags (`tutorial.marketViewed`,
   `profileViewed`, `squadViewed`). A player who signed an operator without
   opening a profile page saw the guide step jump back to "INSPECT ONE
   OPERATOR PROFILE" after real progress, reading as a stall.
3. **Recruitment cash stall.** During the recruitment steps the tutorial day
   restriction blocked End Day unconditionally. With no affordable market
   candidate (fee above cash or wage above headroom) and no open negotiation,
   recruitment could not continue and time could not advance — a genuine
   progression lock, violating the contract that the restriction "must
   release when time genuinely needs to advance".

## Changes

- `js/50-ui-menus.js` — `firstMatchGuidance()`:
  - `recruitment`/`profile` steps also complete once any operator is signed;
    `lineup` also completes once the plan is confirmed or the first match is
    played. Steps now only move forward. No saved tutorial-progression state
    was added; completion is still derived from existing career state.
  - The `match` step is now dynamic. With a confirmed plan and the fixture
    days away it becomes "ADVANCE N DAYS TO MATCHDAY" (route `calendar`,
    which is unlocked at that point) and explains End Day. On matchday it
    keeps route `play` and carries `leagueAction: 'play-league'`, so the
    priority-strip action starts matchmaking directly through the existing
    guarded `startNewMatch('league')` path (squad and plan guards intact).
- `js/36-team-management.js` — `renderTeamOperationsDashboard()` guide branch
  now renders a fixture card when the guide is on the `match` step: opponent,
  date, and either `START MATCHMAKING` (due, ready, plan confirmed, not
  paused) or a calendar/End Day pointer. Reuses existing
  `command-fixture-card` chrome; no CSS changes.
- `js/55-opening-week.js`:
  - New `openingWeekRecruitmentStalled(guide)`: true during recruitment guide
    steps when no market candidate fits both current cash and wage headroom
    and no incoming negotiation is open.
  - `openingWeekTutorialDayRestriction()` also releases when recruitment is
    stalled, so End Day (income + weekly market refresh) becomes available.
  - `openingWeekFlowForTest()` now reports `recruitmentStalled`.
- Version metadata: `js/00-core.js` (`BUILD_VERSION`, `BUILD_NAME`,
  `BUILD_ID`), `index.html` (title, asset queries, build stamp, both visible
  version labels), `CHANGELOG.md`, `HANDOFF.md`, `AGENTS.md`.

No gameplay balance, save schema 19, diagnostics schema 1 or responsive
presentation boundaries changed. Guided presentation still never auto-signs,
auto-confirms or auto-resolves anything; every new control is a player action
that routes through existing guarded handlers.

## Verification

Performed in this session (static, file-tool inspection):

- Traced `firstMatchGuidance()` step derivation for all nine steps before and
  after the change; step index is monotonic across every reachable ordering
  of view flags, signings, plan confirmation and first match.
- Traced the matchday path: guide `match` step → priority strip
  `data-league-action="play-league"` → `handleLeagueClick` →
  `startNewMatch('league')` guards; and the play-route guide branch now
  containing the launch card.
- Traced the stall release: `openingWeekRecruitmentStalled` →
  `openingWeekTutorialDayRestriction` → `clubEndDayBlockers` /
  `clubCanEndDay` / End Day button enablement in `updateMenuUI`.

Outstanding (this session could not execute commands — the isolated build
shell was unavailable on this machine). Run before publishing:

1. `py -3 build.py` from `strikewatch-source/` (twice; require byte-identical
   `js/strikewatch.dev.js` and `dist/strikewatch-build-12.129.html`).
2. Syntax parse of every module, the generated bundle and the standalone
   inline script (e.g. `node --check`).
3. Behaviour checks: `openingWeekFlowForTest()` (expects `ok: true` and the
   new `recruitmentStalled` field), guide walk-through to the first match on
   a fresh club, matchday launch from the guided Command Centre, End Day
   release with an unaffordable market, guide non-regression after signing
   without profile view.
4. Compact widths 320–430 and desktop 1024+ for the new guided fixture card
   (existing chrome, no overflow expected).
5. Copy the verified standalone to root `cod.html` (byte-identical).
