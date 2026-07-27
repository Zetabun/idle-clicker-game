# Build 12.122 – Command Skin Revamp

## Request

The management interface read as a flat website page. The player asked for a
modern, Football-Manager-24-inspired management-game presentation.

## Changes

One appended chrome-only theme layer at the end of `css/game.css`
("Build 12.122 — Command Skin Revamp"), plus the standard version bump in
`js/00-core.js` and `index.html`. No JavaScript behaviour, layout geometry,
grid templates, font sizes or spacing floors were changed.

- Retuned the shared manager palette tokens to a unified ink/violet-slate
  base (`--skin-*` tokens) with an electric-green `--manager-accent`
  (`#31e8a6`) and a gold finance tone (`--skin-gold`).
- Gave `.menu-shell` a layered atmosphere: route-accent radial glow, faint
  violet counter-glow, vertical depth gradient and a fine grid, replacing the
  flat page background on both presentation targets.
- Restyled the manager top bar as a title-bar instrument strip: route-accent
  bottom edge, gold-tinted Gold Balance block, route-accent breadcrumb,
  accent-chipped build badge and accent-tinted hover states.
- Made the enabled End Day control an FM-style always-visible primary action:
  vivid green gradient CTA with dark ink labels and glow; a gold variant for
  `.matchday`; `.blocked` and `:disabled` states remain visibly muted slate.
- Reskinned the sidebar rail and tabs: dark dock, route-accent active fill,
  left rail and icon-chip glow. Desktop rules use `!important` only where
  Build 12.90 already fixed the same properties with `!important`.
- Unified the card system (`.menu-card`, `.menu-hero-*`, `.menu-info-tile`,
  `.menu-setting-card`, `.menu-roster-group`): 12px radius, gradient panel
  face, hairline border, inset top light, ambient shadow, hover accent
  border/glow, and a route-accent top strip via the existing `::before`.
- Modernised list rows, pills, sticky header row, subnav shell tint, focus
  outlines and desktop content scrollbars (route-accent thin scrollbars).
- Mobile below 1024px keeps its established structure; it receives only the
  shared palette, card chrome, route-bar and navigation-drawer tints.

## Invariants

- `.menu-subtab::after` rail and guided `NEXT` geometry untouched (computed
  `left/right/bottom/height` = `0/0/0/2px` verified live).
- Compact 12px meaningful-copy and 14px explanatory floors untouched; no
  font-size declarations in this layer.
- Touch-target sizes, grid templates, paddings-affecting-width and both
  responsive targets' structures unchanged.
- Desktop build version stays visible in the header; mobile version stays in
  the Help-revealed current-page bar (both show 12.122).
- Save schema 19 and diagnostics schema 1 unchanged.

## Verification

- All 35 modular JavaScript files and the generated bundle pass
  `node --check`; the standalone inline script parses via `new Function`.
- `python3 build.py` run three times; bundle and standalone hashes are
  byte-identical
  (`dist/strikewatch-build-12.122.html` sha256 `9653f542…4c53c7bd`).
- Live headless-Chromium checks at 1440, 1280, 1024, 390 and 320 portrait
  plus 844×390 landscape: `document.scrollWidth - clientWidth = 0` at every
  width, zero console/page errors, menu shell renders, and title/labels show
  12.122.
- Route navigation (Operations, Team, Club) exercised live at 1440 with no
  errors and no overflow; screenshots reviewed for the topbar, enabled and
  disabled End Day CTA, mobile 390/320, landscape and both routes.
