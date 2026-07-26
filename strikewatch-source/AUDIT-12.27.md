# Strikewatch Build 12.27 Audit

## Scope

Build 12.27 reduces first-hour overload by progressively revealing the management interface. Future systems remain visible and identifiable, but are greyed and temporarily locked until the player reaches the relevant first-match milestone.

## Implementation review

### State-derived access

- `firstMatchInterfaceFacts()` reads the existing guide, squad, plan, match, report and training state.
- `progressiveRouteAccess()` defines one shared unlock matrix for direct navigation, sub-navigation and management directories.
- `progressiveSectionAccess()` labels primary sections as open, partially open or feature-locked.
- No access state is saved. The layer automatically retires after the guide or after two matches, preventing established careers from being re-locked.

### Discoverable locked features

- Every primary section remains visible. A locked section opens its overview preview rather than disappearing.
- Locked sub-tabs remain visible in grey with a compact milestone and an accessible reason.
- Section overviews show a staged-access panel and the names of locked pages.
- The Command Index and section directories use the same lock reason; notifications from locked routes are excluded from inaccessible badge counts.
- `setMenuRoute()` blocks ordinary direct and routed-action bypass attempts; history traversal skips or rejects locked entries so it cannot reopen a gated page.

### Unlock sequence

1. Recruitment, Inbox, Configuration and overview pages are available immediately.
2. Five operators unlock Active Five Operators, Tactics and Team Armoury.
3. A confirmed plan unlocks League and Calendar.
4. The first match unlocks Team Telemetry, After Action and Supplies.
5. Debrief review unlocks Training.
6. One training focus unlocks Transfers, Staff, Finances, Gold Coins, Commercial and Fans.

## Validation completed

- All modular JavaScript files, the generated development bundle and standalone inline script passed `node --check`.
- `build.py` passed Python compilation and deterministic rebuild checks.
- `progressiveInterfaceForTest().ok === true` across opening, active-five, confirmed-plan, first-match, debrief and completed-guide phases.
- A real locked Armoury tab opened the Armoury overview and displayed its staged unlock panel; attempting the locked Team Armoury sub-route left the overview active.
- `onboardingClarityForTest()`, `typographyConsistencyForTest()`, `firstMatchGuidanceForTest()`, `cashWeaponStoreForTest()`, `cashWeaponPurchaseFeedbackForTest()` and `stateIntegrityForTest()` passed.
- 320x720, 375x812, 390x844, 430x932 and 844x390 layouts showed no document or management-content horizontal overflow and retained the topbar.
- No uncaught page errors occurred. The restricted headless browser retained the expected WebGL capability warning only.

## Preservation

- Career save schema remains 19.
- Diagnostics schema remains 1.
- Fixed mobile viewport, readable typography, random names, first-match guidance, live match clarity, purchase safety and gameplay systems remain unchanged.
- No external assets, fonts, libraries or network calls were added.
