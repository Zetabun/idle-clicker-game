# Audit 12.66 — Mobile Interface Clarity

## Scope

Build 12.66 improves three mobile management interfaces without changing recruitment logic, onboarding progression, Inbox data, gameplay or persistence:

- the First Match Journey panel can collapse into a thin one-line summary and expand again;
- Recruitment candidate profiles have clearer complete-card boundaries;
- Inbox feed rows keep their sender, date, subject and preview inside the correct message row.

## Documentation review

All incoming Markdown files were read before implementation. Historical audit records remain unchanged. The current authority documents, handoff contract, documentation index and release metadata were updated for Build 12.66.

## Root causes

### First Match Journey density

The onboarding strip always rendered its full title, explanation, action and progress state. On a phone it could occupy a large part of the initial management viewport and had no presentation-only way to reduce its height.

### Recruitment profile boundaries

Candidate rows used the existing market table background and only a subtle divider. Because mobile rows expand into long profile cards, the end of one candidate and start of the next were not visually explicit enough while scrolling.

### Inbox alignment

The mobile readability pass enlarged mail copy while retained rules still forced each feed row into the earlier fixed height. A legacy narrow-phone rule also placed the preview in grid column two. Together these rules allowed sender/date, subject and preview content to compete for the same row space and visually overlap neighbouring content.

## Implementation

### Collapsible mobile journey strip

- Added transient `mobileFirstMatchGuideCollapsed` presentation state in `js/50-ui-menus.js`.
- Added a real `first-match-guide-toggle` button with `aria-expanded`, changing accessible labels and a visible chevron.
- Kept the established onboarding action as a separate `management-priority-action` control while expanded.
- Added delegated toggle handling before normal management route handling in `js/70-runtime.js`.
- Added a 48-pixel collapsed bar containing journey progress, an overflow-safe task summary, milestone step and expand chevron.
- Kept the toggle hidden at `1024px` and wider. If a viewport is widened after collapsing, the ordinary desktop panel remains fully visible.
- Did not add the collapsed state to local storage or the schema-19 career save.

### Recruitment separation

- Added a complete border, stronger left accent, small radius, shadow and explicit list gap to every `.recruitment-market-row`.
- Preserved shortlist and comparison accents with distinct left-edge colours.
- Kept candidate ordering, data, scouting, comparison, profile and negotiation code unchanged.

### Inbox feed alignment

- Removed the mobile fixed row height in favour of content-sized rows with a readable minimum target.
- Reset the mail-copy grid to one column and explicitly returned metadata, subject and preview to that column, overriding the retained legacy preview-column rule.
- Kept sender/date metadata in a full-width flex row and retained two-line limits for subject and preview.
- Kept the Inbox list scroll-contained so the feed does not consume the full page.

### Test support

- Added `seedMobileInterfaceClarityForTest()` to the existing debug surface so focused UI geometry tests can mount a deterministic career, populated market and Inbox without changing normal game state authority.

## Verification

### Supported viewport geometry

Focused standalone-browser checks passed at `320×720`, `390×844`, `430×932` and compact landscape `844×390`:

- expanded journey chevron control: `44×44` CSS pixels;
- collapsed journey control: `48` CSS pixels high (`50` including the strip borders);
- `aria-expanded` transitions `true → false → true` through collapse and expansion;
- expanded content and action are removed only in the mobile collapsed presentation;
- collapsed summary remains on one overflow-safe line;
- document horizontal overflow remains zero.

At `1366×768`, the toggle is hidden and the established full journey panel remains visible. A live resize check also confirmed that a mobile-collapsed panel restores its main content and action on desktop, then returns to the collapsed presentation when resized back to mobile.

### Recruitment boundaries

The focused opening market mounted six real candidate rows at every tested viewport. Mobile rows retained a complete `1px` outer border, a `4px` left accent and an `11px` inter-card gap with zero document overflow. Desktop retained a subtler `3px` accent and `8px` gap.

### Inbox containment

At all four mobile viewports:

- every sender/date, subject, preview, star and decision badge rectangle remained inside its owning `.club-mail-row`;
- adjacent row rectangles did not overlap;
- the list remained scroll-contained when its content exceeded the visible feed window;
- document horizontal overflow remained zero.

The `390×844` visual pass confirmed the metadata occupies its own first line, followed by the full-width subject and preview, with no text crossing into another message.

### Retained diagnostics

The following existing diagnostics returned `ok: true` in both `390×844` mobile and `1366×768` desktop harnesses:

- `firstMatchGuidanceForTest()`
- `recruitmentRoleGuideForTest()`
- `recruitmentDecisionSupportForTest()`
- `recruitmentComparisonInteractionForTest()`
- `mobilePageHelpForTest()`
- `stateIntegrityForTest()`
- `typographyConsistencyForTest()`

### Build and package gates

- All modular JavaScript syntax checks passed.
- `build.py` compilation passed.
- Generated development-bundle syntax passed.
- Extracted standalone inline-script syntax passed.
- Two consecutive production builds were byte-identical.
- The final source ZIP passed archive-integrity testing.

The container's headless Chromium does not expose WebGL, so the UI harness records the existing renderer startup warning. The management interface continues to initialise and all focused DOM, interaction and geometry checks complete; rendering code was not changed in this release.

## Result

Mobile onboarding can now be reduced to a clear, reversible one-line task bar, Recruitment profiles have unambiguous card boundaries, and Inbox messages remain aligned within their own rows across supported phone and compact-landscape layouts.
