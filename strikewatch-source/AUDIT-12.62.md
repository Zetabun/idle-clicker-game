# Strikewatch Build 12.62 Audit

## Release

- **Build:** 12.62 — Mobile Navigation Consolidation
- **Build ID:** `12.62.0-mobile-navigation-consolidation`
- **Source folder:** `strikewatch-source-12.62/`
- **Standalone:** `dist/strikewatch-build-12.62.html`
- **Save schema:** 19, unchanged
- **Diagnostics schema:** 1, unchanged

All 62 incoming Markdown files were reviewed before implementation. Current authority documents were updated for this release; historical audit files were retained unchanged.

## Scope

This pass addresses the layered mobile menu system rather than adding another visual skin. The prior phone interface exposed several overlapping discovery mechanisms: the persistent five-section navigation, a horizontally scrolling subsection row, section-page directories, the Command Index, contextual player pages and history controls. Each layer was individually functional, but their responsibilities overlapped and made the route hierarchy harder to understand on a small screen.

Build 12.62 gives each navigation layer one purpose below `1024px`:

1. **Persistent departments** — primary movement between Operations, Team, Armoury, Supplies and Club.
2. **Current-page bar** — the single subsection entry point and visible location indicator.
3. **Club Navigator** — the single all-pages directory, department browser and global route search.
4. **Contextual routes** — remain attached to their owning player or workflow rather than becoming permanent top-level clutter.
5. **Back and forward controls** — retain route-history behaviour only.

Desktop navigation remains governed by the Build 12.58/12.60 section rail, route grid and Command Index.

## Implemented architecture

### Persistent department control

- Portrait uses a safe-area-aware five-department bottom bar positioned for thumb access.
- Compact landscape uses the same five departments in a slim left rail to preserve vertical workspace.
- Selecting a different unlocked department opens its overview directly.
- Selecting the active department opens the Club Navigator.
- Selecting a department whose functional pages are locked opens that department inside the navigator so the precise unlock reason is visible instead of silently rejecting the tap.
- Existing notification and progressive-access signals remain derived from the authoritative route state.

### Current-page control

- The mobile horizontal subsection carousel is hidden.
- A compact sticky current-page bar shows department, page, supporting hint and page position.
- Its **PAGES** action opens the Club Navigator in the current department.
- Route changes continue to use the established `setMenuRoute()` and route-history authorities.

### Full-screen Club Navigator

The navigator contains:

- all five departments;
- a vertical page list in portrait and a two-column page list in compact landscape;
- global search across non-context routes;
- current-page state and route notifications;
- the current First Match Journey objective where vertical space permits;
- exact progressive lock reasons and unlock labels;
- a Command Centre shortcut;
- Return to Match and Exit to Main Menu actions when opened from the pause context.

Selecting an available route closes the navigator automatically. Search, selected navigator department and open/closed state are transient and are not persisted.

### Duplicate mobile discovery removed

Below `1024px` the following redundant discovery surfaces are suppressed:

- the legacy horizontal subsection row;
- the Command Index route directory;
- section-hub page directories and recent-route blocks.

The underlying routes and feature depth remain available through the Club Navigator. These elements remain present and unchanged on desktop.

## Accessibility and mobile UX

- Navigator controls retain a 44-pixel minimum touch target in portrait and compact landscape, including the search field and Clear action.
- Meaningful navigator copy remains at or above the Build 12.61 mobile readability floor.
- X and Escape close the navigator.
- Focus is moved into the navigator, contained while it is open and returned to the invoking control when closed.
- Background document scrolling is locked while the navigator is open.
- Safe-area insets are respected at the portrait bottom edge and landscape sides.
- Compact landscape retains visible lock status and full unlock explanations rather than hiding them to save height.
- The navigator defaults closed and does not add any save field.

## Second-pass corrections

The verification pass found and corrected three issues before packaging:

1. Opening the navigator for a non-current department initially reset the browsed department to the active route because rendering occurred before the overlay entered its open state. The open order was corrected, and locked-department taps now display the intended department.
2. The compact-landscape search field inherited a 40-pixel height. It now meets the 44-pixel navigation target, as does the visible Clear control.
3. Compact landscape initially hid route status and lock explanations. Cards were reflowed so status and exact unlock reasons remain readable in the two-column layout.

## Verification

### Navigation interactions

The real mobile controls were exercised at:

- 320 × 720
- 390 × 844
- 430 × 932
- 844 × 390

At every size:

- selecting Team from Operations opened `team-hub` without opening the navigator;
- selecting Team again opened the navigator in Team;
- global search for `finance` returned the Finances route;
- the visible Clear action measured 44 pixels high;
- Escape closed the navigator;
- selecting locked Supplies opened the Supplies navigator and exposed the Supply Depot lock reason;
- searching for and selecting Inbox navigated to `mail` and closed the navigator;
- no non-WebGL console error occurred.

### Route and viewport matrix

All 24 management routes were checked at eight viewports:

- 320 × 720
- 375 × 812
- 390 × 844
- 430 × 932
- 844 × 390
- 1024 × 768
- 1366 × 768
- 1992 × 1078

This produced **192 route/viewport combinations**. Results:

- zero document-level horizontal-overflow failures;
- zero persistent-navigation viewport escapes;
- zero mobile/desktop navigation-authority conflicts;
- zero visible Club Navigator controls below 44 pixels;
- zero directly rendered meaningful Club Navigator text below 9 pixels;
- zero non-WebGL console errors.

### Retained diagnostics

The following diagnostics returned `ok: true` at 390 × 844 and 1366 × 768:

- `typographyConsistencyForTest()`
- `onboardingClarityForTest()`
- `newPlayerOrientationForTest()`
- `firstMatchGuidanceForTest()`
- `recruitmentRoleGuideForTest()`
- `recruitmentDecisionSupportForTest()`
- `progressiveInterfaceForTest()`
- `economyGuidanceForTest()`
- `openingWeekFlowForTest()`
- `stateIntegrityForTest()`

`stateIntegrityForTest()` reported build ID `12.62.0-mobile-navigation-consolidation` at both sizes.

### Source and build checks

- `python3 -m py_compile build.py` passed.
- Every modular JavaScript source file passed `node --check`.
- The generated `js/strikewatch.dev.js` passed `node --check`.
- The JavaScript extracted from the standalone HTML passed `node --check`.
- `index.html` contains 273 IDs with no duplicate ID.
- Two consecutive production builds were byte-identical.

Final SHA-256 values:

```text
cee09d5759719eba0d195dda6fc936a130ecefc5a5caf5e3161763d17a6ec019  js/strikewatch.dev.js
321d46ee7006c902a43283c6a02e0977d22ae4001149b0398a82854eaee07995  dist/strikewatch-build-12.62.html
```

## Preserved authorities

This release does not change:

- match simulation or operator AI;
- WebGL renderer geometry or materials;
- weapons, armour or economy balance;
- recruitment generation or transfer logic;
- onboarding progression state;
- league/calendar settlement;
- save schema 19;
- diagnostics schema 1;
- desktop navigation and Command Centre layout.

## Environment limitation

The automated Chromium environment did not expose a WebGL context. It could validate menu state, route transitions, layout geometry, mobile HUD DOM, diagnostics and console behaviour, but it could not visually judge rendered arena pixels. Build 12.62 does not modify the renderer or match gameplay.
