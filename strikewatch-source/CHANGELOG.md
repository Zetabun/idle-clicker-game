# Release history router

## 12.143 — Desert Sky

- Replaces the flat muddy brown above Dune Bastion with a procedural gradient sky: warm horizon haze, pale upper sky, deep zenith, a low sun and a below-horizon ground haze.
- Dune is the only open-air arena and had no sky pass at all; the sky was whatever the clear colour was, and that was derived from the fog.
- Warms the desert fog to match the sky horizon, so distant sandstone fades into haze instead of into mud.
- Arena geometry, collision and navigation are untouched: Dune stays at 494 navigation nodes, 2,752 edges and one component, with 60/60 route successes.
- The arena's decor models are not changed in this build.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.143.md`.


## 12.142 — Armour Pass

- Fixes the armour viewer lagging the game: rotating the model rewrote inherited CSS custom properties on the rig root, invalidating the computed style of all 384+ model faces every frame.
- Rotation now uses a dedicated pivot element — measured 9.60ms per rotation step before, 0.01–0.03ms after (226–263x), or 0.1% of a 60fps frame.
- Zoom, drag easing, per-model scaling and per-width scaling are unchanged.
- Fixes a readability floor from 12.140 that lost a specificity contest and left compact lock copy at 10.5px against a 12px floor.
- The armour models themselves still look bad; that is not addressed in this build.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.142.md`.


## 12.141 — Banked Progress

- Fixes Gold Coins being lost by closing the browser after returning to HQ: the return-to-HQ path never wrote a save, and nothing saved on tab close or background.
- Career progress is now written on returning to HQ from a match or free roam, and whenever the page is hidden or closed. End Day already saved and is unchanged.
- The reward crate rotates automatically while it is on screen, and the awarded weapon is now shown on its own once revealed instead of sitting in front of the crate.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.141.md`. Dune visuals, the armour viewer and the weapon-model pass are not in this build.


## 12.140 — Answered Actions

- Fixes the match control appearing to loop: pressing it when the fixture was days away routed to the league table and said nothing, because the message explaining that End Day was required went to an element hidden in the menu.
- Management messages now appear in a dismissible live region, which un-silences roughly eighty call sites — refusals, confirmations such as MATCH PLAN CONFIRMED and WEAPON ISSUED & SAVED, and route lock explanations.
- The MATCH control states its own availability (RECRUIT 2, CONFIRM PLAN, IN 5 DAYS, READY) instead of hiding it in a tooltip, and a refused press now routes to the control that clears the blocker rather than to the league table.
- Raises four compact text sizes to the 12px readability floor, fixing a typography gate that had been failing for several builds.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.140.md`.


## 12.139 — Stated Requirement

- Fixes the remaining onboarding wall at `SET ONE TRAINING FOCUS`: scrolling to the programme selects left the `SAVE CHANGES` bar ~630px above the fold, so a programme could be chosen with nothing on screen saying a second step existed or where to perform it.
- The save control now sits directly above the Training Squad roster, and the panel head states the requirement and tracks progress through it: `ACTION REQUIRED` → `ONE STEP LEFT` → `ACTIVE PROGRAMMES`.
- Fixes a save path that reported success without writing: `setPlayerTrainingFocus()` refuses while a match is live, and the caller cleared every staged draft regardless, silently reverting the selection.
- Fixes a debug hook that could destroy a career: `firstMatchGuidanceForTest()` blanks the squad to replay earlier guide steps, and renders it drives were persisting that empty squad.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.139.md`.


## 12.138 — Reachable Training

- Fixes a First Match Guide soft lock: the closing `SET ONE TRAINING FOCUS` objective opened Training Facility at the top, with the programme selects 1100–2900px below the fold and nothing pointing at them, so the guide could not be completed and the remaining club systems stayed locked.
- The step now scrolls to Training Squad on arrival, and its copy names Programme Selection and Save Changes instead of assuming a debrief recommendation exists.
- Fixes guided scrolling below 1024px, which had never worked: the scroll helper always targeted the desktop scroll container, so the existing recruitment destination was inert on mobile too. Previous/next scroll restoration on compact is fixed by the same change.
- Restores `firstMatchGuidanceForTest()` to a meaningful gate — its journey-strip assertion had been case-sensitive and always failing — and extends it to cover the training step.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.138.md`.


## 12.137 — Kept Rewards

- Fixes victory crates being lost: the awarded weapon lived only in memory until the reveal was clicked through, so refreshing or closing the tab destroyed it.
- The crate is now banked to the career save the moment it is awarded, re-offered if the session is interrupted, and cleared on claim so it can never be granted twice.
- Save schema stays at 19; the field is additive with a null default.
- Evidence: `AUDIT-12.137.md`.


## 12.136 — Row Sizing

- Hotfix: Build 12.135 stopped panels being clipped but left the grid rows undersized, so management panels overlapped each other on existing saves.
- Sizes the scroll container's rows to their content instead of giving the items a minimum height, which resolves clipping and overlapping together.
- Adds an overlap check to the compact interface audit so this regression class fails the gate.
- Evidence: `AUDIT-12.136.md`.


## 12.135 — Open Containers

- Fixes eighteen panels across thirteen routes that rendered as empty boxes on mobile, including Training Squad, Team XP Benefits, the league table, squad dynamics, the calendar agenda, the loadout panel and the tactical analysis.
- Stops a league result being discarded when its prepared fixture id no longer resolves, and refuses to reuse a stale match context.
- Makes the league table readable on both presentation targets.
- Removes the duplicated title and detail from Event Agenda rows and replaces it with a short action label, with readable type on both targets.
- Raises training and development readability on desktop and mobile.
- Evidence: `AUDIT-12.135.md`.


## 12.134 — Durable Career

- Sequences and verifies every career save: a stale second tab can no longer overwrite newer progress, and a rejected write now raises a visible warning instead of being discarded.
- Closes every horizontal overflow at 390px and raises the smallest rendered copy from 5.5px to 11px readability floors across all 22 management routes.
- Fixes the after-action Combat Effectiveness dial, whose caption overlapped the ring and grade on phones.
- Founds every club with one inherited assistant manager: generated name, weekly wage, no signing fee, weak Division 3 judgement, replaceable at any time.
- States the fixture type (league, exhibition or orientation) in the post-match report.
- Investigated the reported Gold Coin loss: settlement, ledger and persistence verified correct across matches and calendar advances; no defect reproduced in the award path.
- Evidence: `AUDIT-12.134.md`.


## 12.133 — Readable Command

- Enlarges Opponent Quick Read, Active Operator Match Roles, Confirm Deployment and after-action reward typography, and removes the dead space in the match-roles rows.
- Stops the Inbox feed capturing page scroll until the manager clicks into it.
- Warns before a response template or tactical control replaces an applied scout recommendation.
- Fixes repeated Inbox decision mail from the same player via a per-player, per-type cooldown.
- Gives operator portraits independent complexion, headgear, kit and rig variation, still asset-free and deterministic.
- Save schema, match simulation, tactical fit and the economy are unchanged.
- Evidence: `AUDIT-12.133.md`.


## 12.132 — Selection Feedback

- Gives the Formation, Team Approach, Engagement Range, Map Selection and Team Priority cards a clearly distinct selected state at every width.
- Adds pressed, pointer-only hover, keyboard focus and post-selection confirmation feedback so a click or tap is always visibly registered.
- Presentation-only release; save schema, gameplay, tactical fit calculations and match simulation are unchanged.
- Evidence: `AUDIT-12.132.md`.


## 12.131 — Calendar Clarity

- Promotes the tactical summary-tag and Active Operator Match Roles alignment fixes into a numbered release.
- Keeps End Day / Next Day readable with one consistent slate, white and mint colour scheme across enabled, locked, blocked and matchday states.
- Presentation-only release; save schema, gameplay, calendar progression and match simulation are unchanged.
- Evidence: `AUDIT-12.131.md`.


This file routes historical questions to detailed audits without putting all
release history into the default GPT context.

## Current line

| Build | Focus | Detailed record |
| --- | --- | --- |
| 12.136 | Scroll container row sizing hotfix | `AUDIT-12.136.md` |
| 12.135 | Collapsed panels and lost league results | `AUDIT-12.135.md` |
| 12.134 | Career save durability and compact interface audit | `AUDIT-12.134.md` |
| 12.133 | Command-surface readability, Inbox scroll and portraits | `AUDIT-12.133.md` |
| 12.132 | Match setup selection feedback | `AUDIT-12.132.md` |
| 12.131 | Tactical clarity consolidation and End Day contrast | `AUDIT-12.131.md` |
| 12.130 | Fourth arena: Aurora Terminal (summit-theme polar transit hub) | `AUDIT-12.130.md` |
| 12.129 | First Match Guide streamlining and opening progression-lock fixes | `AUDIT-12.129.md` |
| 12.128 | Portrait match commentary in normal scoreboard/objective flow | `AUDIT-12.128.md` |
| 12.127 | Responsive mobile combat-effectiveness graph and stat readout | `AUDIT-12.127.md` |
| 12.126 | Mobile tactics layout and fixture-persistent preparation | `AUDIT-12.126.md` |
| 12.125 | Compact desktop Inbox, retained scroll and glass command chrome | `AUDIT-12.125.md` |
| 12.124 | Desktop club identity and inline Inbox reader | `AUDIT-12.124.md` |
| 12.123 | Command Skin depth pass on bespoke route surfaces | `AUDIT-12.123.md` |
| 12.122 | FM-inspired Command Skin visual revamp | `AUDIT-12.122.md` |
| 12.121 | Mobile tactics action reachability and section containment | `AUDIT-12.121.md` |
| 12.120 | Mobile flow, readability and modal accessibility | `AUDIT-12.120.md` |
| 12.119 | Guided navigation `NEXT` label visibility | `AUDIT-12.119.md` |
| 12.118 | Mobile typography readability | `AUDIT-12.118.md` |
| 12.117 | Skyline Offices environment rework | `AUDIT-12.117.md` |
| 12.116 | Desktop header split | `AUDIT-12.116.md` |
| 12.115 | Header and negotiation readability | `AUDIT-12.115.md` |
| 12.114 | Compact live-feed/readability pass | `AUDIT-12.114.md` |
| 12.113 | Desktop version alignment | `AUDIT-12.113.md` |
| 12.112 | Visible version header | `AUDIT-12.112.md` |
| 12.111 | Realistic operator heads | `AUDIT-12.111.md` |
| 12.110 | Natural operator silhouettes | `AUDIT-12.110.md` |
| 12.109 | Citadel match performance | `AUDIT-12.109.md` |
| 12.108 | Citadel Depot environment rework | `AUDIT-12.108.md` |
| 12.107 | Recruitment-card surface isolation | `AUDIT-12.107.md` |
| 12.106 | Configurable management background | `AUDIT-12.106.md` |
| 12.105 | Windowed-match label cleanup | `AUDIT-12.105.md` |
| 12.104 | Blocker links, recruitment hover and portrait HUD | `AUDIT-12.104.md` |

## Historical domains

Use the indicated audit ranges, then select only the newest file relevant to
the task.

| Domain | Audit route |
| --- | --- |
| Recruitment, transfers and comparison UX | `AUDIT-12.33.md`–`AUDIT-12.34.md`, `AUDIT-12.47.md`–`AUDIT-12.51.md`, `AUDIT-12.69.md`–`AUDIT-12.97.md` |
| First Match Guide and opening week | `AUDIT-12.24.md`–`AUDIT-12.36.md`, `AUDIT-12.58.md`–`AUDIT-12.68.md` |
| Mobile/desktop navigation and readability | `AUDIT-12.60.md`–`AUDIT-12.66.md`, `AUDIT-12.78.md`–`AUDIT-12.92.md`, `AUDIT-12.104.md`–`AUDIT-12.121.md` |
| Weapons, armour and operator presentation | `AUDIT-12.08-retained.md`–`AUDIT-12.23.md`, `AUDIT-12.41.md`–`AUDIT-12.57.md`, `AUDIT-12.110.md`–`AUDIT-12.111.md` |
| Match AI, diagnostics and live command | `AUDIT-12.09.md`–`AUDIT-12.13.md`, `AUDIT-12.21.md`, `AUDIT-12.37.md`–`AUDIT-12.40.md`, `AUDIT-12.53.md`, `AUDIT-12.109.md` |
| Arenas, navigation and rendering | `AUDIT-11.99.md`, `AUDIT-12.05.md`–`AUDIT-12.07.md`, `AUDIT-12.52.md`, `AUDIT-12.108.md`–`AUDIT-12.109.md`, `AUDIT-12.117.md` |
| Economy, calendar, staff and infrastructure | `AUDIT-12.15.md`–`AUDIT-12.16.md`, `AUDIT-12.35.md`, `AUDIT-12.51.md`, `AUDIT-12.67.md`, `AUDIT-12.81.md` |

Older Build 11 records and every detailed Build 12 record remain in their
individual `AUDIT-*.md` files. Use:

```text
rg -l "keyword or function name" AUDIT-*.md
```

Do not load the full audit collection by default.
