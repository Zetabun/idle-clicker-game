# Build 12.167 — Loadout CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.155 loadout-still and on-demand inspector presentation, which already has a single JavaScript owner (`57-loadout-stills.js`) and established one-live-rig contracts.

## Change

The complete Build 12.155 CSS block is removed from the tail of `css/game.css` and placed in `css/loadout-stills.css`. Selectors and declarations are unchanged. The new sheet is loaded immediately after `game.css`, preserving the block's previous position before the 12.161 audit layer, compact Armoury inventory layer and compact-navigation layer.

The standalone builder no longer carries a release-specific regular expression listing every stylesheet. It derives the expected `index.html` hrefs from ordered `CSS_PATHS`, requires an exact contiguous match, then replaces that block with the combined release CSS. This makes future ownership extraction fail clearly if development and standalone order diverge.

## Documentation repair

`ARCHITECTURE.md` now records each owned stylesheet and the authoritative cascade order, closing the omission left by Build 12.166. `CONTRACTS.md` records development/standalone order parity as a cross-release invariant. The concise current-release documents and missing 12.161–12.166 changelog routes are corrected in the same release.

## Debt guardrails

The CSS report records `stylesheet_order` and the loadout-still layer separately. The `game.css` budget falls from 31,560 to 31,500 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.155 marker exists exactly once in `loadout-stills.css` and no longer exists in `game.css`.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
