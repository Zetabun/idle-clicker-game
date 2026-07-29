# Build 12.165 — CSS Ownership Baseline

## Audit item

Begins the staged response to the CSS override-debt finding. A wholesale cascade rewrite is too risky, so this release creates the first explicit ownership boundary and prevents further silent growth.

## Change

The Build 12.163 compact-navigation and mobile management-alert block is removed from the tail of `css/game.css` and placed in `css/compact-navigation.css`. The development page loads it after `game.css`; the standalone build concatenates it after the existing 12.161 audit layer, preserving its effective final cascade position. Declarations are unchanged.

## Debt guardrails

`dist/strikewatch-build-12.165-css-debt.json` records total CSS lines, monolith lines, `!important` count, media-query count and owned compact-layer lines. The build fails when the established non-growth budgets are exceeded.

## Verification

- Two builds produce identical bundle, standalone, size report and CSS debt report hashes.
- Source, generated and standalone JavaScript parse.
- Ordered CSS concatenation contains the compact layer exactly once and after the legacy layers.
- Root `cod.html` is byte-identical to the standalone.
- No selectors or declarations in the extracted block changed.
