# Build 12.104 – blocker links, darker hover and portrait HUD repair

## Scope

This release repairs three reported regressions without changing match balance, recruitment calculations, sponsorship economics or save data.

## Implementation

### Required-action navigation
- `js/39-workflow-integrity.js` now permits blocking management actions to bypass opening-week progressive route locks.
- `js/50-ui-menus.js` explicitly exposes Commercial with a **Respond** state whenever sponsorship proposals are pending.
- Existing `data-management-target-id="sponsor:<offer-id>"` anchors remain authoritative, so arrival handling opens Commercial and scrolls/highlights the exact offer.

### Desktop recruitment hover
- The 12.103 hover is overridden with a restrained two-pixel lift, darker cyan glow and almost-neutral brightness.
- Details and shortlist controls now receive only a subtle correlated hover state.
- Shortlisted and compared cards retain their gold/teal identity without brightening the whole surface.

### Portrait match HUD
- `js/00-core.js` creates one `.match-stage-viewport` and moves the canvas plus in-viewport overlays into it.
- The scoreboard bar and round-objective bar remain direct children of `.match-stage`.
- Portrait windowed CSS lays out scoreboard, objective and 16:9 viewport as three separate rows.
- Landscape/maximised presentation continues to use absolute overlay positioning.

## Verification targets
- Clicking either sponsorship item in the red Must Respond banner opens Commercial despite opening-week locks and targets the correct offer.
- Large-desktop recruitment cards remain three across and use a darker hover than Build 12.103.
- At portrait mobile dimensions, scoreboard and objective rectangles finish above the viewport rectangle with no overlap.
- Build metadata, source-folder name and audit filename all match 12.104.
- Save schema remains 19; diagnostics schema remains 1.
## Verification completed
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript file passed `node --check`.
- `python3 build.py` produced the development bundle and standalone 12.104 release successfully.
- Two consecutive builds produced identical SHA-256 hashes for both `js/strikewatch.dev.js` and `dist/strikewatch-build-12.104.html`.
- A real click on the first red Must Respond sponsorship item opened `commercial`, scrolled the menu content and applied `management-arrival-target` to the correct `sponsor:OFR-1` card. The second offer generated its own unique blocker/target pair.
- Portrait geometry at 390 × 844 measured scoreboard bottom `123.69`, objective bottom `156.69` and viewport top `161.69`; both HUD rows were fully above the viewport.
- Portrait stage children were exactly `topbar`, `match-objective`, `match-stage-viewport`, `scoreboard-overlay`, confirming a single wrapper and no scoreboard/objective nesting inside the live canvas area.
- Landscape geometry at 900 × 430 confirmed the viewport and canvas still fill the complete 900 × 354 match stage, with one wrapper and no containment regression.
- Desktop recruitment hover computed to a two-pixel lift, `saturate(1.01) brightness(1.005)` and a dark navy gradient rather than the previous silver washout.
- The only headless-browser console error was the expected unavailable WebGL context caused by software rendering being disabled in the test browser; DOM, routing and layout tests completed normally.

