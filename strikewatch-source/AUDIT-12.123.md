# Build 12.123 – Command Skin depth pass

## Reported failure

After Build 12.122, real gameplay routes (Team Overview, Recruitment, Club)
still looked unchanged. The 12.122 layer restyled shared primitives, but the
routes are composed of bespoke surfaces (`section-hub-*`,
`management-priority-strip`, `progressive-section-gate`,
`career-section-head`, `recruitment-*`, `team-market-row` and generic
top-level route panels) that kept their flat, square, legacy-navy styling.

## Changes

One appended chrome-only layer at the end of `css/game.css`
("Build 12.123 — Command Skin depth pass") plus the standard version bump.

- Generic rule: every direct `section[class]`/`article[class]` page panel in
  `#menuContent` receives the elevated 14px-radius instrument-panel face with
  a route-accent wash (transparent wrappers, `*-zone` containers, the market
  list and the guided strip are excluded from the generic rule).
- Guided `management-priority-strip` keeps its guided-edge authority and
  gains only the modern shell chrome.
- `section-hub-hero` gets a route-accent radial hero wash;
  `progressive-section-gate` gets a hatched locked texture.
- `section-hub-metrics > article` become FM-style stat tiles with hover glow
  and route-accent kickers; `section-priority-card` keeps semantic tints
  (urgent red) and gains modern chrome.
- `career-section-head` gains a route-accent left tick rail.
- Recruitment beginner/needs/comparison panels and the role guide get the
  panel face; the comparison tray gets a gold-tinted variant;
  `team-market-row` candidate cards get hairline borders, elevation and
  route-accent hover glow.
- The `.menu-content` canvas deepens further so panels clearly separate.
- Concise compatibility handoffs, the documentation index, project guide and
  source README now identify Build 12.123 as the current release.

## Invariants

- Chrome-only: no geometry, grid, padding-affecting-width, font-size or
  touch-target changes; 12px/14px compact floors untouched.
- Guided-blocker semantics, `NEXT` badge geometry and `.menu-subtab::after`
  untouched.
- Save schema 19 and diagnostics schema 1 unchanged.

## Verification

- All 35 modules, generated bundle and standalone inline script parse.
- Two consecutive `python3 build.py` runs are byte-identical.
- Live headless-Chromium end-to-end: club created through the real UI, then
  Operations, Team Overview, Recruitment (top + scrolled candidate cards) and
  Club screenshotted at 1600px and Operations at 390px: zero page errors and
  `scrollWidth - clientWidth = 0` in every state.
- Confirmed the previously unchanged surfaces (journey strip, stat tiles,
  recruitment panels, comparison tray, candidate cards) now render the new
  chrome on the routes from the player's report.
- Source metadata, visible labels and concise current-release documentation
  all identify Build 12.123 and its standalone artifact.
