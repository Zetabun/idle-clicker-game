# Build 12.223 audit — Desktop Must Respond Layout

## Problem
When MUST RESPOND was expanded on desktop, the disclosure summary and its body participated in the inherited horizontal grid. The summary copy, secondary explanatory header and action group were consequently squeezed into adjacent columns, producing merged text and an obviously broken wide-screen layout.

## Change
- Added a desktop-only correction inside the existing final 1024px desktop guard in `compact-navigation.css`; no additional media query was introduced.
- The `<details>` disclosure now uses a normal block flow on desktop.
- Its summary occupies the complete available width with a bounded copy column and an explicit plus/minus control.
- The expanded action groups render beneath the summary instead of beside it.
- The redundant expanded explanatory header is hidden on desktop; the actionable category and button remain visible.
- The summary detail is shown while collapsed and suppressed while expanded to avoid repeating the same blocker text above the action card.
- Long labels and descriptions wrap within their own columns and action cards cannot exceed the disclosure width.
- The explicit closed-state rule prevents the body from being exposed by later desktop display overrides.
- Existing compact/mobile disclosure behaviour and navigation remain unchanged.
- Gameplay, blocker authority, save schema 19 and diagnostics schema 1 are unchanged.

## Verification
The release requires deterministic double builds; parsing of modular, generated and standalone JavaScript; preservation of the CSS debt budgets including the 483-media-query ceiling; source-level confirmation that the correction remains inside the existing desktop guard; preservation of the compact `max-width: 1023px` disclosure rules; and byte identity between the standalone and root `cod.html`. Independent live-browser visual confirmation at desktop width remains recommended.
