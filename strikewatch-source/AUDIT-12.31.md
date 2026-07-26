# Strikewatch Build 12.31 Audit

## Scope

Build 12.31 corrects the portrait guided-demo sequence so every explanation appears over the visible match viewport and the simulation does not begin behind the coach cards.

## Implementation review

### Consistent viewport overlay

- Portrait stages one through four now share the same top-centred safe-area placement previously used only by stages three and four.
- The coach card is width-bounded to the viewport and uses a bounded height with internal scrolling on short screens.
- The page and match shell remain fixed; no page-level scrolling or focus movement is introduced.

### Deliberate round start

- Every `NEW_PLAYER_DEMO_STEPS` entry is paused.
- Advancing between the four explanation cards cannot advance the combat simulation.
- Selecting **Watch the Round** on the fourth card hides the coach and clears the demo pause, revealing the match and beginning the real one-round AI simulation.
- Demo settlement, skip behaviour and Recruitment return remain unchanged.

## Verification

- All numbered source modules, the generated development bundle and the extracted standalone inline script passed syntax checks.
- `build.py` passed Python compilation and deterministic rebuild parity.
- `newPlayerOrientationForTest().ok === true`, including the all-steps-paused and final-action checks.
- Portrait geometry was checked at 320×720, 375×812, 390×844 and 430×932: stages one through four overlapped the match viewport, controls remained reachable and no horizontal overflow occurred.
- 844×390 landscape retained contained coach presentation.
- A real stage-advance pass kept the demo paused through card four; the final Watch the Round click hid the coach and released the simulation.
- Unrelated `guidanceConsolidationForTest()`, `firstMatchGuidanceForTest()`, `progressiveInterfaceForTest()`, `cashWeaponStoreForTest()`, `cashWeaponPurchaseFeedbackForTest()` and `stateIntegrityForTest()` checks remained green.

## Preservation

- Career save schema remains **19**.
- Diagnostics schema remains **1**.
- No AI, combat, navigation, map, weapon, finance, reward or progression value changed.
- No external assets, fonts, libraries or network calls were added.
