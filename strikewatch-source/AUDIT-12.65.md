# Audit 12.65 — Mobile Help Icon Alignment

## Scope

Build 12.65 corrects the visual centring of the mobile topbar `?` Help glyph while preserving the exact topbar cell, neighbouring shortcut alignment and Build 12.64 Help-toggle behaviour.

## Documentation review

All incoming Markdown files were read before implementation. Historical audit records remain unchanged. Current authority documents and the documentation index were updated for Build 12.65.

## Root cause

The mobile Help rule changed the shared `.manager-topbar-action` control from grid to flex. Unlike the neighbouring Inbox and Calendar shortcuts, the Help control had no flex centring declarations, so its glyph was laid out from the inline start of the cell even though the three button cells themselves remained aligned.

## Implementation

- Restored `display: grid` and `place-items: center` for the mobile Help control.
- Kept the existing topbar grid column, button dimensions, border and active underline unchanged.
- Kept the glyph in the button's central grid area.
- Preserved white/off and gold/on states, persistence, ARIA state, contextual bar behaviour and desktop isolation.

## Verification

- Confirmed the Help button cell keeps the same width and top/bottom bounds as Inbox and Calendar.
- Confirmed the Help glyph uses the same horizontal and vertical centre offsets as the neighbouring Calendar icon.
- Confirmed white/off and gold/on states retain the same centred geometry.
- Confirmed Help toggle state, ARIA expansion and contextual-bar visibility remain functional.
- Passed focused checks at 320×720, 390×844, 430×932 and 844×390 with zero horizontal overflow or browser exceptions.
- Confirmed the Help control remains hidden at 1366×768.
- JavaScript syntax, generated bundle syntax and standalone syntax passed.
- Two consecutive production builds were byte-identical.
- The final source ZIP passed integrity testing.

## Result

The `?` is now visually centred inside its container while the entire shortcut row retains its established alignment and behaviour.
