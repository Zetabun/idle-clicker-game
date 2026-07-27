# Build 12.125 audit

## Scope

- Cap the desktop Inbox feed at five visible rows, with roughly four rows on
  shorter desktop viewports, before the feed scrolls internally.
- Preserve both the main content and Inbox-list scroll positions when opening
  a message in the adjacent desktop reader.
- Give the desktop header, sidebar, sticky sub-navigation and history controls
  a restrained translucent/backdrop-blur treatment without fading their text.
- Preserve the compact/mobile mail modal and navigation presentation.

## Implementation

- `css/game.css` adds a desktop-only 12.125 release layer with a 588px maximum
  mail layout, a 540px maximum feed, and alpha-backed glass command surfaces.
- `js/39-club-operations.js` captures scroll positions before the Inbox route
  refresh and restores them after focus and layout settle.
- `js/70-runtime.js` exposes read-only mail viewport diagnostics for responsive
  release checks.

## Verification

- All 34 modular JavaScript files, the generated bundle and the standalone
  inline script parse successfully.
- At 1366 × 900 the desktop layout is 588px tall and exposes 5.04 row-heights;
  at 1024 × 768 it is 528px tall and exposes 3.96 row-heights.
- Both desktop checks have zero document-level horizontal overflow. Opening a
  desktop message retained the content position at 185px and kept the adjacent
  reader active without opening the modal.
- At 390 × 844 the presentation remains `modal`; selecting a message opens the
  accessible mail dialog and introduces no horizontal overflow.
- Computed desktop chrome uses backdrop blur with alpha backgrounds while
  retaining element opacity `1`; browser runtime logs were empty.
- Two consecutive builds were byte-identical:
  - bundle SHA-256:
    `A2CF67AA7F59B38C5039CD40167A38A3ECA8BFDBE18C4ED5BA271B5D832AA534`
  - standalone/root SHA-256:
    `D849CB36F73F5D78180F08AD63DD72DC61E3A7AF2660DE6D27AB1BA8AB9B3CE0`
- Root `cod.html` is byte-identical to the verified standalone.
