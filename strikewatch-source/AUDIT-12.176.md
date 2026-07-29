# Build 12.176 — League Table CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.135 league-table readability layer.

## Change

The complete league-table block is removed from the tail of `css/game.css` and placed in `css/league-table.css`. Selectors, declarations and the `max-width: 1023px` breakpoint are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before calendar agenda, training readability, training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The presentation contract is unchanged. Desktop and compact header, row, position, club-name and sub-line type floors remain intact. Compact rows remain at least 52px high and club sub-lines may wrap. League scheduling, fixture recovery, result settlement, standings calculations, gameplay and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. Existing compact, league and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the league-table layer separately. The `game.css` budget falls from 31,230 to 31,210 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The league-table marker exists exactly once in `league-table.css` and no longer exists in `game.css`.
- Desktop and compact league declarations remain present, including the 52px compact row and wrapping club sub-line.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `leagueMatchFlowForTest`, `orphanedLeagueFixtureForTest`, `renderRouteForTest`, `mobileInterfaceAuditForTest` and `typographyConsistencyForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
