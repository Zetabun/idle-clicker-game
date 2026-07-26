# Strikewatch Build 12.30 Audit

## Scope

Build 12.30 reduces first-hour tutorial overload. The nine-step First Match Guide becomes the sole visible progress and next-action system, while older guidance remains available only as optional or post-guide support.

## Implementation review

### One authoritative journey

- The persistent First Match Guide remains unchanged as the nine-step source of truth.
- The Foundation Plan is not rendered while a guide step exists. It returns only after completion as **Opening Week Handoff**.
- The Command Centre removes its separate next-action aside during the guided journey.
- The Command Index does not render another Recommended Next list while the guide is active.

### Optional supporting explanation

- Existing six-stage tutorial state and completion flags remain compatible.
- Manager Induction content is presented inside a closed **Optional Context** disclosure during the guide.
- The disclosure has no route button, so navigation remains owned by the guide strip.
- High-level game-loop, loan and topbar details remain available when expanded rather than occupying the default view.
- One-time section tutorials are delayed until the guide is complete.

## Verification

- Every numbered source module, generated development bundle and standalone inline script passed `node --check`.
- `build.py` passed Python compilation and generated Build 12.30 deterministically.
- `guidanceConsolidationForTest().ok === true`.
- `firstMatchGuidanceForTest()`, `progressiveInterfaceForTest()`, `newPlayerOrientationForTest()`, `onboardingClarityForTest()` and `stateIntegrityForTest()` passed in two independent standalone browser passes.
- A real new club produced one First Match Guide strip, no Foundation Plan, one closed Optional Context panel, no one-time section tutorial and no Command Index recommendation.
- Expanding Optional Context exposed supporting detail with no competing route action.
- 320×720, 375×812, 390×844, 430×932 and 844×390 layouts had no document or management-content horizontal overflow; the topbar and disclosure remained contained.
- No unexpected browser errors occurred in the regression passes.

## Preservation

- Career save schema remains **19**.
- Diagnostics schema remains **1**.
- Build 12.29 candidate scrolling, Build 12.28 orientation, Build 12.27 progressive route access and all gameplay systems remain unchanged.
- No external assets, fonts, libraries or network calls were added.
