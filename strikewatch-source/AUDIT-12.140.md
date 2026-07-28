# Build 12.140 — Answered Actions

## Reported problem

Pressing the match control sometimes appeared to loop. The reporter noted it
was not necessarily a defect: what actually needed to happen was End Day, and
the interface never said so.

## Root cause

Two faults, one of them systemic.

### 1. Every management refusal was invisible

`showStatus()` writes to `.status`, which lives inside the match stage and is
hidden by `body[data-app-state="menu"] .status { display: none }`. There are
roughly eighty `showStatus()` call sites across the management modules. Every
one of them — refusals, confirmations and lock explanations alike — wrote to an
element with `display: none`.

Measured: pressing the header MATCH control with the fixture five days away set
the message `THE NEXT LEAGUE FIXTURE IS SCHEDULED IN 5 DAYS. USE END DAY TO
ADVANCE THE CALENDAR.` and reported `visible: false`. The manager saw the route
change to the league table and nothing else. Pressing again repeated it.

This also silently swallowed `MATCH PLAN CONFIRMED`, `WEAPON ISSUED & SAVED`,
`TEAM BENEFIT UPGRADED`, `STAT POINT CANNOT BE MOVED THERE`, `LOCKED · <route> ·
<reason>` and every other management message, which is why completed actions
could also read as "nothing happened".

### 2. The match control never stated its own availability

`careerDeployLabel()` already computed the truthful state — `LEAGUE MATCH IN 5
DAYS`, `REVIEW MATCH PLAN`, `RECRUIT SQUAD 3 / 5` — but it was applied only to
`aria-label` and `title`. The visible label was the hardcoded `MATCH`, the
button was never disabled or marked, and the refusal routed to the league table
rather than to the control that clears the blocker.

## Changes

- `js/78-management-status.js` (new, registered in `build.py`) — a live region
  inside the menu shell. `showStatus()` is wrapped so that management-context
  messages are mirrored into it; the match HUD keeps its own status line during
  play. Auto-dismisses after 7.2s, dismissible, `role="status"` with
  `aria-live="polite"` so it never steals focus mid-task. Repeating the same
  message restarts the entry transition, so pressing a refused control twice
  still reads as a response rather than a frozen page. This adds a surface; it
  does not change what any caller says.
- `js/35-career.js` — `careerMatchLaunchState()`, one authority for whether a
  match can start and what the manager must do otherwise, returning
  `{ ready, short, reason, route }` for: create club, recruit N, confirm plan,
  already played today, season complete, fixture N days away, ready.
- `js/50-ui-menus.js`
  - The MATCH control renders `careerMatchLaunchState().short` as a visible
    state line and takes a `blocked` class.
  - `startNewMatch()` refusals route to `careerMatchLaunchState().route` — the
    calendar for an End Day requirement, tactics for an unconfirmed plan,
    recruitment for a short squad — instead of sending every refusal to the
    league table, and pass `tone: 'blocked'`.
- `index.html` — `.manager-topbar-action-state` element inside the MATCH button.
- `css/game.css` (release end) — `.management-status` surface, the match-control
  state label, and compact readability floors (below).

### Readability floors

`typographyConsistencyForTest()` was already failing before this build:
`#managerDateDay` 10.5px, `#managerDateMeta` 9px, `.menu-tab-access` 10.5px and
`.club-economy-guide article > span` 10px against a 12px compact floor. All four
are raised to 12px below 1024px, and the new state label is held to the same
floor. The gate now passes.

No gameplay, economy, save schema (19) or diagnostics schema (1) change.

## Verification

- All 39 modular files (38 existing plus the new module), the generated bundle
  and the standalone inline script parse.
- Match control behaviour, driven through the real button:

| Career state | Visible state | Routes to | Message on screen |
| --- | --- | --- | --- |
| 3 operators | `RECRUIT 2` | market | yes |
| 5 operators, plan unconfirmed | `CONFIRM PLAN` | tactics | yes |
| Plan confirmed, fixture 5 days away | `IN 5 DAYS` | calendar | yes |
| Matchday, plan confirmed | `READY` | — starts matchmaking | n/a |

- `typographyConsistencyForTest()` passes on `play`, `operators`, `tactics`,
  `training`, `barracks` and `market` at 390px, and on all four sampled routes
  at 320px and at 1440px. It was failing before this build.
- The status surface stays inside the viewport and clear of the compact bottom
  navigation: at 320px the banner occupies 604–740 with the navigation at 782;
  at 390px, 670–750 against 782; at 1440px, 740–804. Zero horizontal overflow at
  every width checked.
- `mobileInterfaceAuditForTest()` at 320px: zero overlapping, zero collapsed.
- Adjacent hooks pass: `firstMatchGuidanceForTest`, `recruitmentRoleGuideForTest`,
  `openingWeekFlowForTest`, `onboardingClarityForTest`,
  `guidanceConsolidationForTest`, `newPlayerOrientationForTest`,
  `economyGuidanceForTest`, `firstMatchPayoffForTest`, `stateIntegrityForTest`,
  `matchPlanPersistenceForTest`, `weaponSlotSystemForTest`,
  `tacticalCoachingDestinationForTest`, `leagueMatchFlowForTest`,
  `firstDebriefGuideForTest`.
- Running `firstMatchGuidanceForTest()` leaves a loaded career byte-intact.
- Two consecutive builds produce identical bundle and standalone hashes
  (`fdb4d4c9…`, `76082670…`); root `cod.html` is byte-identical.

## Observed, not changed

- One horizontal overflow remains on the `profile` route at 320px: an SVG
  overshooting by 16px. Present identically on 12.139, so it predates this
  build and is a graphic rather than text or a control.
- The End Day control was checked against the same standard and already states
  its blocked state in visible text (`END DAY LOCKED`, `N RESPONSES`, `FINISH
  GUIDE`), so it needed no change. The MATCH control was the outlier.
- With the surface now visible, management messages appear that never did
  before. They are unchanged strings from existing call sites; any that read
  poorly are now discoverable and can be revised individually.
