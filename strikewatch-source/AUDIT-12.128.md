# Build 12.128 audit

## Scope

- Move portrait-windowed play-by-play and match-moment commentary out of the
  rendered arena.
- Place the shared commentary dock between the scoreboard strip and round
  objective so the broadcast hierarchy remains clear.
- Preserve the existing landscape/maximised commentary dock, gameplay,
  persistence schemas and desktop management presentation.

## Implementation

- `js/41-live-command-pulses.js` now keeps the shared commentary dock in the
  portrait match stage only while the viewport is portrait and windowed, then
  restores it beside the stage for landscape/maximised layouts. Match moments
  temporarily take priority over feed rows within the compact strip.
- `js/50-ui-menus.js` synchronises commentary placement whenever view mode,
  orientation or fullscreen state changes.
- `css/game.css` adds a Build 12.128 portrait-only normal-flow layout with the
  order scoreboard → commentary → objective → arena. Match moments use a
  readable two-line detail treatment, while ordinary play-by-play exposes up
  to two contained rows.
- `js/70-runtime.js` adds `matchCommentaryPlacementForTest()` so release checks
  can verify element order, geometry, placement and overflow directly.

## Verification

- All modular JavaScript files, the generated development bundle and the
  standalone inline script parse successfully.
- Portrait match-moment geometry passed at 320×720, 375×812, 390×844,
  402×874, 430×932 and 768×1024. At every width:
  - the dock was parented to `.match-stage` immediately before the objective;
  - scoreboard, commentary, objective and arena rectangles were vertically
    separated with no overlap;
  - document-level horizontal overflow was zero;
  - runtime logs contained no exceptions;
  - `stateIntegrityForTest()` passed.
- A dedicated 390×844 play-by-play check showed two feed rows fully contained
  in the dock, followed by the objective and arena with no overlap.
- Landscape/desktop checks at 844×390, 1024×768 and 1366×768 retained the
  existing `match-view` placement and passed `landscapeCommentaryForTest()`'s
  separation checks with zero overflow or runtime errors.
- A live viewport transition 390×844 → 844×390 → 390×844 moved the dock from
  `portrait-stage` → `match-view` → `portrait-stage` without errors.
- Save schema 19 round-trip output and pre/post `stateIntegrityForTest()` both
  passed. The portrait performance snapshot remained at FULL quality with no
  long frames during the layout check.
- Two consecutive builds were byte-identical:
  - bundle SHA-256:
    `22c84882d925d4357569fc54817e1177731092b2685bfd3769adbeef7a1c2865`
  - standalone/root SHA-256:
    `a95cf4b33c31b54a284999038d751eadf33ba8cbc4a9b9e267d9b3cfbb2ff46b`
- Root `cod.html` is byte-identical to the verified standalone.

## Release result

Build 12.128 removes portrait commentary from the action viewport and gives it
an explicit broadcast row without changing the match simulation or the
established landscape/desktop presentation.
