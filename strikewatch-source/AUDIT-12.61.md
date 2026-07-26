# Strikewatch Build 12.61 Audit — Mobile Readability & UX Pass

## Scope

Build 12.61 is a presentation and interaction pass for phone portrait and compact mobile landscape. It does not alter combat, AI, balance, economy, persistence, save schema 19 or diagnostics schema 1. The Build 12.60 desktop Command Centre remains the presentation authority from 1024 CSS pixels upward.

All 61 Markdown files present in the Build 12.60 source package were read before implementation. Current project guidance was then updated to describe the new mobile rules, and this audit was added as the current release record.

## Problems confirmed in the incoming build

- Repeated mobile metadata, status, lock and navigation copy still fell into the 4–8px range even when the main headings were readable.
- Recruitment and other information-dense routes contained many repeated labels below a comfortable phone reading floor.
- Several standalone actions and live-match utility buttons were smaller than a 44px touch target.
- The seven-column calendar remained too dense on narrow portrait screens.
- Narrow navigation relied on clipped full words or presentation workarounds instead of concise real labels.
- The live spectator HUD still used micro-text in the score strip, objective, telemetry, commentary and controls.
- Enlarging the live HUD without changing its information density caused portrait overlays and compact-landscape telemetry to collide.

## Implementation

### Semantic mobile type and contrast authority

A final mobile-only cascade below 1024px now supplies consistent floors for micro labels, navigation, supporting copy, explanatory body text and controls. Meaningful direct text is kept at or above 9px in the tested mobile layouts, with ordinary body and decision copy using larger values. Disabled and locked content retains a subdued state without becoming illegible.

The authority covers Command HQ, objectives, priorities, route navigation, Recruitment, transfers, mail, reports, training, staff, supporters, Supply Depot, settings, first-session creation, First Match Journey locks and economy guidance.

### Touch and navigation improvements

- Recurring standalone mobile actions retain at least a 44px target.
- Narrow portrait primary navigation uses real alternate labels: `OPS`, `GEAR` and `SUPPLY`.
- The alternate labels are present in markup; no source word is hidden with a zero font size and no duplicate pseudo-content is generated.
- Compact-landscape rail, topbar and route labels use the same readable floor.

### Narrow portrait calendar

At 430px and below in portrait, the month grid becomes a chronological list containing the current date and event-bearing dates. Each row includes complete date text and readable 44px event actions. Wider portrait, landscape and desktop retain the full month grid.

### First-session readability

Club creation, random-name controls, orientation rules, guided-demo explanations, journey progress, locked access copy and economy guidance were raised to the new hierarchy. The existing state-driven onboarding and all nine internal first-match checks remain unchanged.

### Live spectator HUD

The mobile text and touch floors now also apply during a match:

- portrait score, round, objective, status, spectator dock and utility controls are readable;
- sound, diagnostics, minimap, view-mode and spectator controls use 44px targets;
- guided-orientation feed messages are suppressed in portrait because the coach already owns that explanation, preventing the feed from covering the objective;
- ordinary portrait matches retain one compact readable feed row rather than stacking several rows over the arena;
- compact landscape removes the duplicate spectator card because the owned-operator telemetry card already contains the same identity, health and weapon information;
- compact landscape keeps the plain-language decision reason but omits the four-field decision grid, which could not fit at a readable size beside a 314px-high arena;
- the complete spectator and decision-detail presentation remains available on taller landscape and desktop layouts.

### Diagnostics

`typographyConsistencyForTest()` now samples mobile hierarchy, lock/access copy, priority actions and economy guidance while retaining the existing desktop assertions. The first-signing economy explanation was also clarified so the transfer fee and wage-headroom effects match the established diagnostic contract.

## Verification

### Management route matrix

All 24 management routes were exercised at:

- 320 × 720
- 375 × 812
- 390 × 844
- 430 × 932
- 844 × 390
- 1024 × 768
- 1366 × 768
- 1992 × 1078

Across all 192 route/viewport combinations:

- no document or body horizontal overflow occurred;
- no route/sidebar or desktop sub-navigation overlap occurred;
- no page exceptions occurred;
- the typography diagnostic passed;
- every one of the 120 mobile route/viewport combinations had zero visible direct-text elements below 9px;
- every one of the 120 mobile route/viewport combinations had zero enabled interactive controls below the 44px target.

Five very narrow route cases retained small internal `#menuContent` scroll-width deltas from contained or transformed content (320px Reports/Recruitment and 844×390 Tactics/Recruitment/Supply Depot). None escaped to document/body overflow. Representative screenshots were reviewed after the final build; this metric remains recorded rather than being treated as a document-overflow failure.

### Live match matrix

The real first-time demo was started, inspected with the coach open, advanced through all four explanation steps and inspected again with the unobstructed live HUD at:

- 320 × 720
- 390 × 844
- 430 × 932
- 844 × 390

All eight coach/live states recorded:

- zero direct-text elements below 9px;
- zero enabled controls below 44px;
- zero document/body overflow;
- zero JavaScript page exceptions.

The final portrait and compact-landscape screenshots were also reviewed to confirm that the objective, status, telemetry and controls no longer collide.

### Retained functional diagnostics

The following returned successful results after the final implementation:

- `typographyConsistencyForTest()`
- `onboardingClarityForTest()`
- `newPlayerOrientationForTest()`
- `firstMatchGuidanceForTest()`
- `recruitmentRoleGuideForTest()`
- `recruitmentDecisionSupportForTest()`
- `progressiveInterfaceForTest()`
- `economyGuidanceForTest()`
- `openingWeekFlowForTest()`
- `stateIntegrityForTest()`

Calendar, Command Centre, context-tutorial and menu-viewport inspection helpers also executed without exceptions and returned their expected structural snapshots.

### Syntax and build integrity

- `build.py` passed Python compilation.
- Every modular source JavaScript file passed `node --check`.
- The generated development bundle passed `node --check`.
- The JavaScript extracted from the final standalone HTML passed `node --check`.
- Two consecutive production builds were byte-identical.
- The final source ZIP passed a complete `unzip -t` integrity check and contains no audit screenshots, JSON reports, cache directories or obsolete Build 12.60 standalone file.

Deterministic SHA-256 results:

- `js/strikewatch.dev.js`: `a0b21b57234aab72d43029a29930607ee22f3f0fdad211c27313bc6fff09847c`
- `dist/strikewatch-build-12.61.html`: `8e4c0a14aee290d20516e62ff8d66b57198e44d63c4bb804e3e2a50337ce07dd`

## Limitations

The headless Chromium environment did not expose the production WebGL rendering path. The real match state, HUD, coach sequence, routing, interaction geometry and responsive presentation were exercised, but rendered arena pixels and 3D operator/weapon output were not judged in this audit. Build 12.61 does not modify renderer or gameplay code.

## Release result

Build 12.61 resolves the confirmed mobile micro-text and touch-target problems while also reducing live-match information density where readable text would otherwise overlap. Desktop layout and type authority, the Build 12.59 onboarding state machine, gameplay systems and saved careers remain intact.
