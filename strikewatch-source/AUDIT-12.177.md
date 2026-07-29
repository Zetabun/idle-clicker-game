# Build 12.177 — Management Grid CSS Ownership

## Audit item

Continues SW-020 component by component. After the league-table, calendar-agenda and training blocks were extracted, the final bounded tail block is the Build 12.135/12.136 management grid-track fix.

## Change

The remaining `#menuContent` row-sizing block is removed from the tail of `css/game.css` and placed in `css/management-grid.css`. The selector and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before league table, calendar agenda, training readability, training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The layout contract is unchanged. `grid-auto-rows: max-content` sizes each management route row to its content, while `align-content: start` prevents the definite-height grid from distributing spare space through route tracks. This remains a track-level fix; the superseded item-level `#menuContent > * { min-height: max-content; }` rule must not return because it allows panels to overflow undersized rows and overlap following content.

No route markup, navigation, gameplay, economy, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order and row-sizing hazard. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing compact-layout and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the management-grid layer separately. The `game.css` budget falls from 31,210 to 31,185 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The collapsed-panel marker and `#menuContent` row-sizing rule exist in `management-grid.css` and no longer exist in `game.css`.
- `grid-auto-rows: max-content` and `align-content: start` remain present exactly once; the superseded direct-child `min-height: max-content` rule remains absent.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `mobileInterfaceAuditForTest`, `renderRouteForTest` and `typographyConsistencyForTest`, including the collapsed/overlapping diagnostics used by the original fix.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No live-browser execution is claimed; the release evidence is exact declaration/cascade preservation, deterministic builds, parse gates and retained regression hooks.
