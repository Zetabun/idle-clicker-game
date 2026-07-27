# Build 12.124 — Desktop club identity and inline Inbox

## Scope

This release makes two desktop-only management improvements without changing
compact/mobile interaction:

- the active team name appears directly beneath the club crest in the left
  navigation rail;
- selecting an email at 1024px and wider reads it in the existing adjacent
  right-hand panel instead of opening the compact mail modal.

## Implementation

- `css/game.css` restores the desktop `.menu-club-brand-copy` name beneath the
  crest, supports two-line long names and leaves the secondary navigation meta
  hidden.
- `js/39-club-operations.js` selects the mail presentation at the established
  1024px breakpoint. Desktop retains the selected read email in the list while
  its full content is visible in `#clubMailReader`; compact/mobile continues to
  call `openClubMailModal()`. Crossing the breakpoint re-renders the Inbox and
  converts an open mobile mail dialog into the desktop reader.
- Desktop decision emails render their response controls in the reader so
  removing the modal does not remove required gameplay actions.
- `js/39-workflow-integrity.js` avoids re-opening a management-arrival email
  after the desktop inline reader has already selected it.
- `js/70-runtime.js` exposes targeted mail-presentation diagnostics.

No save-schema, economy, match, onboarding or compact navigation behaviour
changes.

## Verification

- All 34 modular JavaScript files and the generated development bundle passed
  `node --check`.
- The standalone contains one inline application script and it parsed through
  `vm.Script`.
- Two consecutive builds were byte-identical:
  - bundle SHA-256:
    `B79C264343145D632C9BF14D71FCAEA0C3C1B423A2ACC792F7F4B08FDF1DF42B`;
  - standalone SHA-256:
    `E3AD4B8C69E6294F197EF2D918C3188EB7FFE64D1B2BD0128A78E62795AEE76E`.
- Root `cod.html` is byte-identical to
  `dist/strikewatch-build-12.124.html`.
- Live local-browser checks:
  - 1366 × 900: the active team name is visible beneath the crest; selecting
    an email updates the adjacent reader; no mail modal opens;
  - 1024 × 768: the same desktop behaviour applies at the exact breakpoint;
  - 390 × 844: the sidebar club lockup remains hidden and selecting an email
    opens the established mobile modal;
  - crossing from 390px to 1366px with a mobile mail dialog open closes the
    dialog and preserves that email in the desktop reader.
- The checked widths had zero document-level horizontal overflow and the
  browser produced no warnings or errors.
- `git diff --check` passed.
