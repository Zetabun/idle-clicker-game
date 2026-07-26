# Build 12.105 – windowed match label cleanup

## Scope

Remove the obsolete decorative **LIVE // SECURE FEED** text that remained visible behind the repositioned match HUD.

## Cause

An old `body[data-view-mode='windowed'] .match-view::before` pseudo-element still rendered the label. The match-stage restructuring in Build 12.104 correctly placed the scoreboard and objective above the viewport, but the pseudo-element belonged to the outer windowed match container and could peek through behind the HUD at the top-left.

## Implementation

- `css/game.css` disables the legacy pseudo-element with `content: none` and `display: none`.
- No match DOM, scoreboard geometry, objective geometry, viewport wrapping or simulation code changed.
- Landscape and maximised match presentation remain unchanged apart from the decorative label no longer appearing.

## Verification targets

- The standalone source contains no rendered `LIVE // SECURE FEED` pseudo-content.
- Computed `::before` content for a windowed `.match-view` is `none` and display is `none`.
- Build metadata, source folder and audit filename all match 12.105.
- Save schema remains 19; diagnostics schema remains 1.

## Verification completed

- `python3 -m py_compile build.py` passed.
- Every modular and generated JavaScript file passed `node --check`.
- `python3 build.py` produced the development bundle and standalone 12.105 release successfully.
- Two consecutive builds produced identical SHA-256 hashes for the generated JavaScript bundle and standalone HTML.
- A Chromium computed-style check at 390 × 844 returned `content: none` and `display: none` for `.match-view::before` in windowed mode.
- The match HUD DOM and geometry code from Build 12.104 were not changed.
