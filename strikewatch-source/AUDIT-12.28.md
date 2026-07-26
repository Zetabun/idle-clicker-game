# Strikewatch Build 12.28 Audit

## Scope

Build 12.28 adds a concept-first orientation to the opening career. A new manager is told what Strikewatch is before ordinary recruitment tasks, then may watch one genuine autonomous round with contextual explanations of the scoreboard, objective, tactical preparation, spectator panel and live operator intention.

## Implementation review

### Concept-first opening

- Team creation advertises that creating the club begins an orientation.
- The first overlay explains the manager/operator distinction, Recruit → Prepare → Watch → Improve loop, five-operator no-respawn rounds and normal first-to-three format.
- Eligibility is limited to a created club with zero operators, zero completed matches and no completion/skip marker.
- Completion and skip markers reuse `careerState.tutorial.contextSeen`; no new persistent schema field was introduced.

### Guided one-round match

- The orientation uses the existing Citadel arena, AI, navigation, perception, weapons and round simulation with a temporary one-round target.
- Four coach steps progress from paused explanation to live observation and explain autonomous combat without exposing hidden enemy information.
- The HUD identifies the experience as `DEMO · ONE ROUND` and explains that normal matches are first to three.
- Match menu, speed, automatic spectating and hide-UI controls are unavailable during the demo; manual living-operator spectator switching remains available.
- Demo round completion branches before career settlement. No match/round/win total, finance, reward, operator condition, league result or report is recorded.
- Completion restores normal transient state and routes directly to Recruitment.

## Automated verification

The following checks passed against both modular source and the generated standalone release:

- `newPlayerOrientationForTest().ok === true`.
- `onboardingClarityForTest()`, `typographyConsistencyForTest()`, `firstMatchGuidanceForTest()`, `progressiveInterfaceForTest()` and `liveMatchClarityForTest()` all returned `ok === true`.
- Real team creation opened the concept overlay; the demo started paused, advanced through all coach stages, completed through the ordinary `finishRound()` path and returned to Recruitment.
- `totalRounds`, `totalMatches`, `totalWins` and `matchWins` were unchanged both immediately after `finishRound()` and after leaving the demo.
- The separate **Skip Demo & Recruit** path persisted its tutorial marker, routed to Recruitment and did not reopen after reload.
- Concept and coach cards remained fully inside 320×720, 375×812, 390×844, 430×932 and 844×390 viewports with zero document overflow.
- `cashWeaponStoreForTest()`, `cashWeaponPurchaseFeedbackForTest()` and `stateIntegrityForTest()` passed after the orientation flow.
- All numbered source modules, generated development bundle and extracted standalone inline JavaScript passed `node --check`; `build.py` passed Python compilation and deterministic rebuild parity.
- No unexpected page or console errors occurred. The restricted headless environment produced only the established WebGL capability warning.

## Preservation

- Career save schema remains **19**.
- Diagnostics schema remains **1**.
- Build 12.27 progressive interface reveal, Build 12.26 first-match guidance, fixed viewport, readable typography, purchase safety and all existing gameplay systems remain retained.
- No external assets, fonts, libraries or network calls were added.
