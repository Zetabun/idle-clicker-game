# Build 12.133 — Readable Command audit

## Scope

Seven reported problems, six presentation and one gameplay-adjacent:

1. Opponent Quick Read "watch for" / "possible opening" tiles were unreadable
   on a phone.
2. Applying the scout recommendation and then changing a response template or
   a tactical control silently discarded it, with no warning.
3. Active Operator Match Roles rows carried large dead space and did not align
   with the surrounding interface.
4. The same player kept raising the same Inbox decision, so the mail read as a
   duplicate.
5. Scrolling over the Inbox feed scrolled the feed instead of the page.
6. Confirm Deployment used tiny type at every width and flat operator
   portraits.
7. The after-action rewards / economy guide used tiny type.

Save schema, match simulation, tactical fit calculation and the economy are
unchanged.

## Implementation

### Typography and layout — `css/game.css`, Build 12.133 layer (release end)

One new layer, last in the cascade.

- **Quick Read**: `dt` 7px → 9px desktop / 11px compact, `dd` 9px → 11px
  desktop / 14px compact, with the pair stacking to one column below 1024px
  rather than only below 430px.
- **Match roles**: the row grid becomes
  `28px / 1fr / minmax(150px,auto) / minmax(190px,250px)` with centred items,
  14px gaps and `min-height: 0` in place of the 12.131 hotfix's 112px floor,
  which is what produced the dead space. The index becomes a fixed 28px chip,
  the fit readout lays out horizontally and right-aligns, and the role select
  drops to a 42px control. Below 1024px the row collapses to two columns with
  everything left-aligned and a 46px select.
- **Confirm Deployment**: kickers 7px → 10/11px, headings 15px → 17/19px,
  sub-copy 8px → 11/13px, operator name 9px → 12/14px, meta 7px → 10/11px,
  range band 8px → 11/12px. The roster row gains a dedicated portrait column.
- **Economy guide**: label 6.5px → 9.5/11px, value 13px → 17/19px, title
  8px → 11/13px, body 8px → 11/12px. Four columns become two below 1024px and
  one below 560px.

### Inbox scroll — `js/77-mail-scroll-guard.js` + CSS

`.club-mail-list` is a nested scroll container, so a wheel or drag started over
it consumed the gesture. The feed is now `overflow-y: hidden` until armed.
Clicking or focusing inside adds `mail-scroll-armed` to `<body>`, which restores
`overflow-y: auto` with `overscroll-behavior: contain`; a pointerdown anywhere
else disarms it and resets the feed to the top. The flag lives on `<body>`
rather than the list because the Inbox re-renders whenever a message is
selected and would otherwise disarm itself mid-read. While inert and actually
overflowing, the list carries a bottom mask so the hidden rows are still
signposted.

### Recommended-plan warning — `js/39-matchday.js`

`matchdayGuardRecommendedPlanChange(kind, detail, returnFocus)` runs ahead of
the response-template, formation, approach, engagement and priority handlers.
It fires only when the scout recommendation is currently applied *and* still
intact (`opponentResponsePlanAdjusted` false), and never for a no-op change. It
opens the existing `openTeamNoteModal` management dialog with
**KEEP RECOMMENDED** / **CHANGE ANYWAY**, matching the established unsaved-changes
confirmation, and `handleMatchdayPlanWarningAction` is chained into
`handleTeamNoteModalAction`.

Acknowledgement is module-scoped session state, not career state, so no save
migration is needed. Choosing CHANGE ANYWAY suppresses further warnings until
the recommendation is re-applied; choosing KEEP RECOMMENDED changes nothing and
leaves the warning active.

### Duplicate decision mail — `js/39-matchday.js`

`clubMaybeGenerateDecision` picked the unhappiest reserve, the most fatigued
player and a rotating index with no memory, so the same player was re-selected
on every rotation and produced an identical subject line. A 24-day per
player-and-type cooldown (`clubDecisionPlayerOnCooldown`) now filters the
candidate list through `clubDecisionCandidate`. When every candidate is on
cooldown the branch advances `state.sequence` and yields, so the next day
offers a different decision type instead of repeating or stalling — the
previous code returned early without advancing the rotation.

### Operator portraits — `js/36-team-management.js` + CSS

The bust stays asset-free and deterministic. `teamPlayerVisualMarkup` now
derives four independent axes from separate seed slices — silhouette variant
(4), complexion (6), headgear (5) and rig (3) — and emits helmet, shoulder,
chest-plate and comms elements alongside the original head, visor, neck, body
and rig. CSS drives skin and kit through custom properties so complexion and
kit vary independently, `helmet-3` renders a headband instead of a shell, and
the deployment roster shows the portrait at 54px desktop / 50px compact.

## Verification gates

- `py -3 build.py` succeeds; two consecutive builds produce byte-identical
  bundle and standalone output.
- The standalone parses and boots: title, `window.__STRIKEWATCH_BUILD__` and
  both visible version labels resolve to 12.133 /
  `12.133.0-readable-command`.
- Browser console reports no errors across load, seeding and interaction.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.133.html`.
- `document.documentElement.scrollWidth === clientWidth` at 390 and 1440.

### Behaviour — `__strikeDebug` hooks added this release

`matchdayPlanWarningForTest(choice)` applies the recommendation, attempts a
change, and reports what the dialog did:

| Choice | Guard fired | Dialog | Plan changed | Selected response | Warns again |
| --- | --- | --- | --- | --- | --- |
| `keep` | yes | keep + proceed | no | `squad-strength` (recommended) | yes |
| `proceed` | yes | keep + proceed | yes | `direct-counter` | no |

The second attempt uses an approach the recommendation does not already use,
so the guard is genuinely exercised rather than short-circuited by a no-op.

`clubDecisionRotationForTest(days)` drives the generator across a calendar run
and reports any same-player, same-type repeat inside the cooldown:

| Days | Decisions | Distinct subjects | Repeat violations |
| --- | --- | --- | --- |
| 120 | 30 | 7 | 0 |
| 180 | 45 | 7 | 0 |

Types stay evenly distributed (11–12 of each across 180 days).

Nearby regressions: `seedReadabilityCareerForTest(5)` and
`seedFirstMatchCalendarForTest()` still report a created career, a live First
Match Guide, a 5-day fixture countdown and the expected End Day lock.

Inbox scroll verified with dispatched events: inert by default with the
overflow mask present, armed by a pointerdown or focus inside (scrolls, with
overscroll contained), disarmed and reset by a pointerdown elsewhere.

### Live computed styles

Measured on the built standalone with transitions suppressed.

| Area | Value | 390 | 833 | 1440 |
| --- | --- | --- | --- | --- |
| Quick Read | `dt` / `dd` | 11 / 14px | 11 / 14px | 9 / 11px |
| Quick Read | columns | 1 | 1 | 2 |
| Match roles | row columns | 2 | 2 | 4 |
| Match roles | `min-height` | 0 | 0 | 0 |
| Match roles | name / select | 15 / 14px | 15 / 14px | 13 / 12px |
| Deployment | heading / sub | 19 / 13px | 19 / 13px | 17 / 11px |
| Deployment | name / meta / band | 14 / 11 / 12px | 14 / 11 / 12px | 12 / 10 / 11px |
| Deployment | portrait | 50px | 50px | 54px |
| Economy guide | value / body | 19 / 12px | 19 / 12px | 17 / 11px |
| Economy guide | columns | 1 | 2 | 4 |

Portrait axes resolve independently: three sampled combinations produced three
distinct complexions (`#c9a68b` / `#8d6a51` / `#5f4433`), three distinct kit
colours (`#2b4351` / `#33473a` / `#4a3d30`) and three headgear heights
(11 / 12 / 5px).

## Responsive review targets

Manual visual checks should cover 320, 375, 390, 430, 1024, 1366 and 1920 CSS
pixels across Tactics, the Inbox, Confirm Deployment and the after-action
report.
