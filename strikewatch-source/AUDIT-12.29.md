# Strikewatch Build 12.29 Audit

## Scope

Build 12.29 makes the recruitment actions in the first-match guide lead directly to the available operator candidates. The guide still uses ordinary route navigation, then scrolls only the Command HQ content pane to the candidate list and briefly marks the arrival point.

## Implementation review

### Exact recruitment destination

- The `first-signing` and `active-five` stages in `firstMatchGuidance()` carry `scrollTarget: 'recruitment-candidates'`.
- The priority action exposes that target through `data-team-scroll-target`.
- Both the base and enhanced Recruitment market renderers expose the matching `data-guide-target` anchor, preventing the later enhanced override from dropping the destination.
- The delegated team-management route handler restores the Recruitment `market` subview, completes `setMenuRoute()` and only then requests the destination scroll, so shortlist or assignment state cannot hide the target.

### Viewport-safe movement

- `scrollMenuGuideTargetIntoView()` delegates to the established `scrollCommandContentTargetIntoView()` helper.
- Only `.menu-content` moves. Document, menu shell and layout scroll positions are restored to zero.
- Candidate focus is not changed automatically.
- A short blue outline confirms arrival and is disabled when reduced motion is preferred.

## Automated verification

The following checks passed against the modular source and generated standalone Build 12.29 release:

- Real opening-career interaction from an operator profile: **Recruit Operator** routed to Recruitment and scrolled the content pane to the candidate list.
- The same action repeated while already on Recruitment reached the same destination.
- A shortlisted candidate was opened from the Shortlist subview; the guide action restored the Market subview before scrolling to the candidates.
- At 390×844 the destination settled at `scrollTop 1086`, remained visible, retained the arrival cue and left document, shell and layout scroll at zero.
- The active element was not moved onto a candidate profile.
- The same route-and-scroll interaction passed at 320×720, 375×812, 390×844, 430×932 and 844×390 with zero document or management-content horizontal overflow.
- `firstMatchGuidanceForTest().ok === true`, including first-signing target metadata, priority-button attribute and candidate-list anchor.
- `progressiveInterfaceForTest()`, `newPlayerOrientationForTest()`, `onboardingClarityForTest()`, `typographyConsistencyForTest()`, `cashWeaponStoreForTest()`, `cashWeaponPurchaseFeedbackForTest()` and `stateIntegrityForTest()` all returned `ok === true`.
- Every numbered source module, generated development bundle and extracted standalone inline JavaScript passed `node --check`; `build.py` passed Python compilation.
- No unexpected page errors occurred. The restricted headless browser emitted only the established missing-WebGL capability warning.

## Preservation

- Career save schema remains **19**.
- Diagnostics schema remains **1**.
- No market, contract, finance, tutorial-completion, AI, combat or renderer value changed.
- No external assets, libraries or network calls were added.
