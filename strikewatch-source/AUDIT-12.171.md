# Build 12.171 — Compact Readability CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.140 compact typography floor that protects management date text, navigation lock/access chips, economy-guide metadata and the visible match-control state.

## Change

The complete Build 12.140 compact-readability block is removed from the tail of `css/game.css` and placed in `css/compact-readability.css`. Selectors, declarations and the `max-width: 1023px` breakpoint are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The readability contract is unchanged: `#managerDateDay`, `#managerDateMeta`, `.menu-shell .menu-subtab-lock`, `.menu-shell .menu-tab-access`, economy-guide metadata and `.manager-topbar-action-state` remain at a 12px compact floor. Desktop density, gameplay, navigation behaviour and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. The existing `CONTRACTS.md` stylesheet-order and compact-target invariants remain sufficient and are unchanged.

## Debt guardrails

The CSS report records the compact-readability layer separately. The `game.css` budget falls from 31,420 to 31,405 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.140 marker exists exactly once in `compact-readability.css` and no longer exists in `game.css`.
- All six compact 12px floor declarations and the 1023px media query remain present.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `typographyConsistencyForTest`, `mobileInterfaceAuditForTest` and `economyGuidanceForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
