# Build 12.180 — Combat Effectiveness CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded EOF block is the Build 12.134 compact Combat Effectiveness dial fix: ring sizing, score/grade typography, an external caption and a wrapped influence legend.

## Change

The complete `After-action Combat Effectiveness ring` block is removed from the tail of `css/game.css` and placed in `css/combat-effectiveness.css`. Selectors, declarations and both compact breakpoints are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before match type, route readability, management grid, league table, calendar agenda, training readability, training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The presentation contract is unchanged. Below 1024px the ring remains 138px with a 30px lower margin; the 40px grade and 21px score own the dial while the 11px `COMBAT EFFECTIVENESS` caption sits at `top: calc(100% + 9px)` beneath it. The influence legend remains centred and wrapping, and influence labels stay at 11px. Below 381px the ring remains 124px, the grade 35px, score 19px and caption 10.5px.

No report markup, scoring, grade calculation, match settlement, gameplay, economy, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order and regression hooks. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing report, compact-layout and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the Combat Effectiveness layer separately. The `game.css` budget falls from 31,055 to 30,995 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Combat Effectiveness marker exists in `combat-effectiveness.css` and no longer exists in `game.css`.
- The 1023px and 380px media blocks and representative ring/caption/influence declarations remain present exactly once.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `firstMatchPayoffForTest`, `mobileInterfaceAuditForTest`, `renderRouteForTest` and `typographyConsistencyForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No live-browser execution is claimed; the release evidence is exact declaration/cascade preservation, deterministic builds, parse gates and retained regression hooks.
