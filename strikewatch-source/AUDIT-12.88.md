# Build 12.88 Audit — Mobile Recruitment Header Alignment

## Scope

- Matched the compact mobile recruitment summary header structure to the flipped scouting side so both faces now share the same left-info / right-actions composition.
- Removed the front-face shortlist and compare chips from the mobile summary.
- Added a compact shortlist star button next to the front-face Details button.
- Kept compare on the flipped scouting side, with report and negotiate still available from the compact summary.
- Desktop recruitment cards, desktop sidebar changes from 12.87, onboarding, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Regression requirements

- Mobile recruitment summaries must show the same top-header layout pattern as the flipped side.
- The shortlist action must remain available from the mobile summary via the compact star button.
- The comparison action must remain available from the detailed scouting side.
- View Report and Negotiate must remain available from the mobile summary.
- Desktop recruitment cards and wider layouts above 820px must remain unchanged.
- Supported viewports must have no document-level horizontal overflow or runtime errors.

## Verification executed

- Read the current authority Markdown before implementation.
- A second-pass regression/build verification was run after the final edits.
