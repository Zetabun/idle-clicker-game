# Strikewatch Build 12.25 Audit

## Scope

Build 12.25 responds to follow-up accessibility feedback after the onboarding pass. Browser pinch zoom is deliberately disabled again, while management-screen typography is normalised and enlarged so the interface remains readable at its intended fixed scale without losing the compact tactical-console style.

## Implementation review

### Fixed mobile viewport

- `index.html` now uses `maximum-scale=1,user-scalable=no` with the existing safe-area viewport settings.
- The change applies to the modular source and generated standalone release.
- No JavaScript gesture blocker or custom touch interception was added; ordinary scrolling, tapping and form input remain unchanged.

### Typography consistency

- `css/game.css` adds a scoped management-interface readability layer rather than globally scaling the entire application.
- Primary navigation, section tabs, date/status copy, priority panels, tutorial text, section hubs, command-centre cards, line-up status labels, progress summaries and workflow controls now use consistent readable floors.
- The narrowest 320–350px layouts retain slightly smaller navigation values where required to avoid clipping, while body copy and instructional text remain larger.
- The same typography floor is applied to phone landscape layouts up to 900px wide.
- Match HUD, first-person rendering, world presentation and gameplay geometry were not changed.
- The topbar keeps the full calendar date in its accessible label/title while displaying a compact `MON 3 AUG · W1` form in constrained layouts.

### Regression tooling

- `onboardingClarityForTest()` now verifies the fixed-scale viewport rather than zoom availability.
- `typographyConsistencyForTest()` checks the viewport contract and representative navigation, date, priority and tutorial font floors.
- Existing random-name, onboarding, purchase-feedback, store and state-integrity helpers remain intact.

## Automated verification

The following checks passed against the modular source and generated Build 12.25 standalone output:

- `node --check` for every numbered source module.
- `node --check js/strikewatch.dev.js`.
- Extracted standalone inline JavaScript syntax check.
- `python3 -m py_compile build.py`.
- Real random-name button interaction changed the editable team-name field and announced the generated name.
- `randomTeamNameForTest(20).ok === true`.
- `onboardingClarityForTest().ok === true`.
- `typographyConsistencyForTest().ok === true` at 320×720, 375×812, 390×844, 430×932 and 844×390.
- No document or management-content horizontal overflow at those five dimensions.
- Topbar remained visible at every tested dimension.
- `cashWeaponStoreForTest().ok === true`.
- `cashWeaponPurchaseFeedbackForTest().ok === true`.
- `stateIntegrityForTest().ok === true` with zero issues.
- `teamIdentityForTest()` and `menuViewportIntegrityForTest()` completed normally.

The restricted headless browser did not expose production WebGL, so the established capability warning may appear during DOM-focused tests. No renderer, combat, pathfinding, map or weapon-presentation code changed in this release.

## Preservation result

- Career save schema remains **19**.
- Diagnostics schema remains **1**.
- Build 12.24 onboarding, random-name generation and six-stage induction remain intact.
- Build 12.23 purchase confirmation and finite-inventory behaviour remain green.
- No external assets, fonts, libraries or network calls were added.
