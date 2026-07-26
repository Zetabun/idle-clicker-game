# Audit 12.68 — Mobile Onboarding & HUD Clarity

## Scope

Build 12.68 corrects five mobile presentation and onboarding problems without changing simulation, recruitment data or persistence:

- every new-club emblem option now updates the large preview immediately while cycling through choices;
- the portrait windowed-match objective becomes a slim, single-line strip flush beneath the scoreboard;
- the compact Inbox unread-count badge is centred inside its existing topbar bubble;
- **What does each operator role mean?** starts closed but remains expandable;
- the ambiguous Recruitment `knowledge` percentage is presented as **Scouting Confidence** and explains exactly which estimates it qualifies.

Desktop layout, match outcomes, combat, recruitment ordering, scouting progression, economy, save schema 19 and diagnostics schema 1 remain unchanged.

## Documentation review

All incoming Markdown authority and historical audit files were read before implementation. Historical audits remain unchanged. `00-READ-FIRST-GPT.md`, `AGENTS.md`, `PROJECT.md`, `README.md`, `DOCUMENTATION-INDEX.md` and `GPT-HANDOFF-PROMPT.txt` now identify Build 12.68 and preserve the retained Build 12.67 and earlier contracts.

## Implementation

### Live team-emblem preview

`js/35-career.js` retains `careerDraft.teamIdentity.logoId` as the identity authority. After a `[data-team-logo]` option is selected, the handler now:

- updates the selected class and `aria-checked` state as before;
- replaces the large `[data-team-logo-preview]` SVG with a newly rendered emblem;
- updates the large preview label;
- leaves colour selection and final saved identity behaviour unchanged.

Replacing the SVG rather than only changing option state avoids retaining the original path geometry in the visible preview.

### Compact portrait objective

The final Build 12.68 mobile CSS authority in `css/game.css` applies only to portrait, windowed matches at `900px` and below. It:

- keeps the scoreboard at a minimum 37-pixel height;
- positions the objective directly beneath it with the same left and right inset;
- reduces the objective to approximately 25 pixels high;
- uses one compact label/value row with overflow-safe ellipsis;
- hides only the secondary plan line in this compact presentation.

Landscape and desktop match layouts retain their established presentation.

### Inbox unread badge

Below `1024px`, `.manager-mail-badge:not([hidden])` uses flex centring with a normalised line height and tabular numerals. A separate `[hidden]` rule preserves the authoritative zero/unread-hidden behaviour, so alignment cannot accidentally force an empty badge back into layout.

### Recruitment role guide

`js/36-team-management.js` now emits the Recruitment role `<details>` without the `open` attribute. The guide remains a native, keyboard-accessible disclosure containing every existing role explanation and can be opened or closed normally. No state is persisted.

### Scouting-confidence explanation

`js/39-recruitment-commercial.js` retains the internal `knowledge` property and every scout-assignment/progression calculation. Presentation now uses **Scouting Confidence** or **Report Confidence** and states that the percentage represents reliability of the displayed:

- ability estimate;
- potential estimate;
- transfer-fee estimate;
- wage estimate;
- medical estimate.

The same explanation is available through visible Recruitment copy plus `title` and `aria-label` text on the compact confidence bar.

### Retained diagnostics

`js/70-runtime.js` extends the Recruitment presentation regression helper to check that the role guide starts closed and that scouting confidence is explained. Existing role-definition, profile, state-integrity and typography checks remain active.

## Second-pass verification

### Emblem cycling

A real browser interaction cycled through all five available emblem options: `shield`, `wings`, `target`, `bolt` and `crown`. Every selection:

- became the selected/`aria-checked` option;
- produced distinct preview SVG path geometry;
- produced the correct distinct preview label;
- generated no page error.

### Role and confidence presentation

The focused Recruitment regression passed all checks, including:

- all seven roles still explained;
- role guide closed by default;
- native click opens and closes the guide;
- Scouting Confidence visible in the candidate card;
- help text names ability, potential, fee, wage and medical estimates;
- candidate rows and guide remain inside the Recruitment zone.

### Badge geometry and hidden state

At `390×844`, the visible unread badge computed to flex layout with centred alignment. Text-centre deviation was `0px` horizontally and `0.5px` vertically. The `[hidden]` state computed to `display: none`; restoring a count computed to `display: flex` without moving the topbar cell.

### Objective geometry

The compact objective was measured at all supported portrait widths:

- `320×720`;
- `375×812`;
- `390×844`;
- `402×874`;
- `430×932`.

At every size it was approximately 25 pixels high, had zero measured gap beneath the scoreboard, differed from the scoreboard by less than `0.16px` in width and less than `0.08px` at the left edge, hid the secondary plan line and produced no objective or document overflow.

### Responsive and retained checks

The complete Recruitment/mobile-header matrix passed at:

- `320×720`;
- `375×812`;
- `390×844`;
- `402×874`;
- `430×932`;
- `844×390` compact landscape;
- `1024×768` desktop baseline;
- `1366×768` desktop.

Across the matrix:

- document horizontal overflow was zero;
- Recruitment cards and confidence controls remained within the viewport;
- candidate separation remained present;
- the role guide started closed;
- confidence wording and accessible explanation remained present;
- mobile badge centring remained active below `1024px` and desktop retained its prior grid layout;
- `stateIntegrityForTest()` returned `ok: true` with zero issues;
- `typographyConsistencyForTest()` returned `ok: true`;
- browser page-error capture remained empty.

### Syntax and deterministic build

All 33 modular source JavaScript files plus `js/strikewatch.dev.js` passed `node --check`. Two consecutive builds produced identical SHA-256 hashes:

- `js/strikewatch.dev.js` — `0e94676bd84e194c472f8a152f98aadea6c12ecde4e21307555eb92705d951f0`
- `dist/strikewatch-build-12.68.html` — `848d3f94a99df2d0f288ec3e76c9e36caba7b9ea1b7deddc8c069e540d3afbd7`

The standalone was loaded in headless Chromium through in-memory document content because this environment blocks local browser navigation. The tested changes are management/HUD presentation changes; the live WebGL renderer was not the subject of this release.

## Preserved authorities

Build 12.68 does not change:

- saved club identity data or available emblem definitions;
- scouting values, assignments, reveal progression or market ordering;
- fixture outcomes, match settlement, Man of the Match or living-world press from Build 12.67;
- combat AI, perception, navigation, tactics, weapons or armour;
- credits, wages, loans, sponsorship or store balance;
- desktop navigation and desktop match presentation;
- save schema 19 or diagnostics schema 1.

## Release package integrity

The source archive contains the authoritative `strikewatch-source-12.68/` folder, including updated current documentation and `AUDIT-12.68.md`. Its `dist/` directory contains only `strikewatch-build-12.68.html`. The separately copied standalone matches the deterministic dist hash, and `unzip -t` reports no compressed-data errors.
