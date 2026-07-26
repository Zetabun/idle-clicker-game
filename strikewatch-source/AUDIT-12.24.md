# Strikewatch Build 12.24 Audit

## Scope

Build 12.24 responds to first-player feedback that the opening was difficult to understand, visually sparse and too small to read comfortably. The pass adds a random team-name action, explains the management premise and long-term objective before creation, strengthens the retained six-step induction, introduces asset-free visual guidance and improves first-run accessibility without changing career or diagnostic schemas.

## Implementation review

### Team-name generation

- `js/35-career.js` owns fictional prefix, suffix and codename pools.
- `careerRandomTeamName()` passes every result through `normaliseCareerName()`, keeps names within the existing 24-character limit and retries to avoid returning the currently displayed name.
- `applyRandomCareerTeamName()` updates the draft and input only. It does not save or create the club, does not unexpectedly move keyboard focus and announces the result through an `aria-live` status.
- The create button immediately reflects whether both team and manager names are valid.

### First-run explanation and graphics

- Team creation now states that Strikewatch is a tactical management game rather than a directly controlled shooter.
- It explains that the player recruits, equips and prepares five operators, while operators move, aim and fire autonomously.
- The first-to-three match format, the Recruit → Prepare → Watch → Improve loop and promotion to the Pro League are visible before creation.
- Inline SVG/CSS icons, a long-term-goal panel and four illustrated loop cards add visual structure without external assets or network dependencies.

### Tutorial and accessibility

- The existing six tutorial stages and save flags remain intact.
- Stage one now explains the player's role, autonomous combat, match format, division path, Pro League goal and foundation loan. Later steps explain why recruitment, profile review, line-up selection and debrief actions matter.
- Successful team creation resets the management scroller to the top and focuses the induction card, preventing the tutorial from being rendered above the player's retained form scroll position.
- First-run copy, navigation labels and tutorial text are larger; form controls and tutorial actions retain at least 44px touch targets; `:focus-visible` treatment is stronger.
- The viewport permits browser pinch zoom with `maximum-scale=5` and no `user-scalable=no` restriction.

## Automated verification

The following checks passed against both modular source and generated Build 12.24 output:

- `node --check` for every numbered source module.
- `node --check js/strikewatch.dev.js`.
- Extracted standalone inline JavaScript syntax check.
- `python3 -m py_compile build.py`.
- `randomTeamNameForTest(30)`: valid 2–24-character normalised names with multiple unique results.
- `onboardingClarityForTest()`: all explanation, visual-loop, control-size, input-type and browser-zoom checks passed.
- Real random-name button interaction updated the field and live status and enabled creation after a valid manager name.
- Real team creation displayed induction step 1/6, four loop stages, 13px tutorial body copy, scroll position 0 and focused the induction card.
- Responsive first-run checks at 320×700, 375×812, 390×844, 402×874, 430×932 and 844×390 found no document, content or creation-grid horizontal overflow.
- `cashWeaponStoreForTest().ok === true`.
- `cashWeaponPurchaseFeedbackForTest().ok === true`.
- `stateIntegrityForTest().ok === true` with zero issues.
- `teamIdentityForTest()` and `menuViewportIntegrityForTest()` completed normally.

The restricted headless browser did not expose WebGL, so the runtime reported its established WebGL capability error during DOM tests. This did not affect the management-screen, tutorial, store or state checks. No gameplay renderer code was changed in this build.

## Preservation result

- Career save schema remains **19**.
- Diagnostics schema remains **1**.
- Build 12.23 purchase confirmation, finite inventory and transaction behaviour remains green.
- No external assets, libraries, fonts or network calls were added.
