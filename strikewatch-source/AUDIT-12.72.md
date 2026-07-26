# Strikewatch Build 12.72 Audit

## Release identity

- **Build:** 12.72 — Mobile Recruitment Readability & Layout Integrity
- **Build ID:** `12.72.0-mobile-recruitment-readability-layout-integrity`
- **Source:** `strikewatch-source-12.72/`
- **Standalone:** `dist/strikewatch-build-12.72.html`
- **Save schema:** 19, unchanged
- **Diagnostics schema:** 1, unchanged

## Scope completed

Build 12.72 corrects the mobile regressions found after the Build 12.71 compact-card release without changing Recruitment decisions or commercial rules.

- Read all Markdown authority and historical audit files before editing.
- Changed mobile and compact-tablet Recruitment to one full-width candidate card per row so identity, ratings, financial ranges and controls no longer compete inside narrow two-card columns.
- Raised the mobile card hierarchy: metric labels now render at a 9-pixel floor, values at 15 pixels, ability/potential stars at 12–13 pixels, squad-fit labels at 9.5 pixels and squad-fit conclusions at 12 pixels.
- Allowed narrow fee and wage ranges to wrap rather than being lost to ellipsis.
- Reserved a real 70–84-pixel squad-fit region above the action grid. **Fills an Important Gap**, **Development Prospect** and related guidance can no longer collapse behind the buttons.
- Increased mobile card height only where required to contain the larger copy and two-row action grid.
- Removed the reverse face's nested mobile scrollbar. Role brief, key attributes, medical status, market context and Active Five impact now fit within the card and scroll only with the main Recruitment page.
- Kept the desktop reverse-face scroller from Build 12.71, where the smaller multi-column cards are intentionally bounded.
- Put the expanded First Match Journey and comparison tray back into normal mobile document flow so they cannot cover each other or candidate content.
- Retained sticky behaviour only for the deliberately collapsed 48-pixel First Match Journey summary.
- Preserved the flip interaction, visible-face semantics, comparison limit, automatic two-candidate recommendation and transient UI state.
- Removed the copied Build 12.71 standalone from the new source tree so `dist/` contains only the current release.

## Gameplay and persistence boundaries

No candidate data, scouting values, recommendation factors, candidate order, transfer terms, negotiation logic, signing logic, budgets, economy, match simulation, combat, AI, progression or persistence rules changed. Build 12.71 card-flip and comparison behaviour, Build 12.70 presentation ownership and Build 12.69 guided routing remain intact.

## Verification

### Source and deterministic build

- `python -m py_compile build.py` passed.
- Every modular JavaScript file passed `node --check`.
- Generated `js/strikewatch.dev.js` passed `node --check`.
- Inline CSS in the standalone release exactly matched `css/game.css`.
- Inline JavaScript in the standalone release exactly matched `js/strikewatch.dev.js`.
- Two consecutive builds produced identical generated-bundle and standalone hashes.
- Generated bundle SHA-256: `35cf7ad38e1c9d7d65a5736d50d78cb8ac15d56362c8db303cf6c198720c0042`.
- Standalone SHA-256: `6237c2b18012f8bd8ba3be66760a419cd490d2729aa3469adb6e270f7f70332f`.

### Responsive browser matrix

Headless Chromium checks ran at:

- 360 × 800 portrait
- 390 × 844 portrait
- 430 × 932 portrait
- 700 × 650 compact layout
- 844 × 390 compact landscape
- 964 × 408 wide-phone landscape
- 1008 × 664 compact tablet
- 1024 × 768 desktop boundary
- 1366 × 768 desktop

Across all nine sizes:

- no squad-fit/action overlap occurred;
- no document or management-pane horizontal overflow occurred;
- the front face fitted its card without clipped sections;
- flip controls changed the visible face and retained `aria-hidden`/`inert` ownership;
- reverse-face content and actions remained separate;
- selecting two candidates filled two tray slots and opened the existing **Best Current Fit** recommendation;
- no page errors or runtime faults were recorded.

At every width below 1024 pixels:

- candidate cards rendered one per row;
- the expanded First Match Journey and comparison tray computed as `position: relative`;
- the collapsed First Match Journey computed as `position: sticky` and stayed approximately 48 pixels high;
- reverse-face `scrollHeight` stayed within its `clientHeight` with mobile overflow hidden;
- mobile text and star floors met the Build 12.72 thresholds.

Measured mobile card sizes ranged from 336 × 532 pixels on a 360-pixel portrait viewport to 964 × 438 pixels on a 1008-pixel tablet viewport. Compact landscape cards were 424 pixels high. Desktop cards remained at the Build 12.71 height of 342 pixels.

### Retained diagnostics

The following diagnostics passed in representative mobile and desktop runs:

- state integrity;
- typography consistency;
- First Match Journey guidance;
- Recruitment role guide;
- Recruitment decision support;
- Recruitment comparison interaction;
- compact Recruitment cards;
- runtime fault scan.

## Known boundaries

- Mobile cards are intentionally taller than Build 12.71. The extra vertical space is the trade-off for readable ratings, complete financial ranges, a usable squad-fit explanation and non-overlapping actions.
- The comparison tray remains sticky on desktop but uses normal flow below 1024 pixels to avoid competing with onboarding and mobile browser chrome.
- The reverse face remains a concise scouting summary. The full operator report is still the authoritative detailed profile.
