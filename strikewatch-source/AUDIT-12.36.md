# Strikewatch Build 12.36 Audit

## Scope

Presentation-only refinement of the persistent End Day control while the First Match Guide intentionally blocks calendar progression.

## Changed

- Replaced the visible **END DAY UNAVAILABLE** and **FOLLOW FIRST MATCH GUIDE** lines with one centred padlock in a neutral grey End Day cell.
- Added a dedicated decorative SVG lock inside the existing single End Day button.
- Retained the complete tutorial restriction reason in the button's accessible label and tooltip.
- Extended `calendarHeaderForTest()` with guided-lock, lock-icon and visible-text state.

## Invariants

- `openingWeekTutorialDayRestriction()` remains the only unlock authority.
- End Day remains disabled at the same guide stages and unlocks at the same match-stage condition.
- Normal End Day, matchday and required-response blocker states are unchanged.
- No calendar settlement, tutorial sequence, blocker, economy, training, match, save or diagnostic behaviour changed.
- Save schema remains 19 and diagnostics schema remains 1.

## Required checks

- Modular, bundled and standalone JavaScript syntax.
- Fresh guided state: disabled End Day, `.guided-lock`, visible padlock, blank visible text nodes and a complete accessible reason.
- Unlocked first-match calendar state: no padlock and ordinary End Day copy restored.
- Non-tutorial blocker state: existing red treatment, visible lock copy and count badge retained.
- Responsive containment at 320x720, 375x812, 390x844, 430x932 and 844x390.
- Deterministic rebuild parity and ZIP extraction.
