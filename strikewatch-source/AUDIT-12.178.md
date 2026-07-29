# Build 12.178 — Route Readability CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the second and third Build 12.134 compact-readability audit passes: route-specific typography floors plus containment for dense grids that grew when their copy was made legible.

## Change

The complete Build 12.134 part-two and part-three block is removed from the tail of `css/game.css` and placed in `css/route-readability.css`. Selectors, declarations and both `max-width: 1023px` media blocks are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before management grid, league table, calendar agenda, training readability, training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The readability contract is unchanged. Label-weight copy remains at 11–11.5px and meaningful copy at 12px across league pyramid, development alerts, formations, squad cards, player stat allocation, weapon inspector callouts, commercial offers, Inbox tabs, squad dynamics, opponent preparation, dashboard tiles, player telemetry, Armoury details, supporters, coaching advice, plan confirmation and accolade/attachment surfaces. Dense commercial, supporter, telemetry, squad-dynamics, dashboard, opponent-fact, attachment and accolade cards retain `min-width: 0` containment.

No route markup, navigation, gameplay, economy, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order and regression hooks. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing compact-layout and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the route-readability layer separately. The `game.css` budget falls from 31,185 to 31,080 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.134 part-two and part-three markers exist in `route-readability.css` and no longer exist in `game.css`.
- Both 1023px media blocks and representative typography/containment declarations remain present exactly once.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `mobileInterfaceAuditForTest`, `typographyConsistencyForTest`, `economyGuidanceForTest` and `renderRouteForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No live-browser execution is claimed; the release evidence is exact declaration/cascade preservation, deterministic builds, parse gates and retained regression hooks.
