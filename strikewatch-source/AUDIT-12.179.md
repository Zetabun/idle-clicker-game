# Build 12.179 — Match Type CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded EOF block is the Build 12.134 post-match fixture-type presentation shared by the detailed report competition row and the staged first-match outcome.

## Change

The complete `Post-match report: match type row` block is removed from the tail of `css/game.css` and placed in `css/match-type.css`. Selectors, declarations and both `max-width: 1023px` media blocks are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before route readability, management grid, league table, calendar agenda, training readability, training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The presentation contract is unchanged. The detailed report competition kicker remains bold with its existing tracking, while compact kicker, opposition name and match detail retain their 11px/15px/11px floors. `.first-match-type-line` keeps its 11px desktop size, 12px compact floor, spacing, colour, weight and line height.

Match classification is unchanged and remains owned by `careerMatchTypeDescriptor(summary)`, which prefers the settled league record, then stored match presentation, then live presentation and distinguishes league, exhibition and guided orientation. No match settlement, league state, first-match staging, gameplay, economy, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order and regression hooks. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing report, compact-layout and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the match-type layer separately. The `game.css` budget falls from 31,080 to 31,055 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The post-match match-type marker exists in `match-type.css` and no longer exists in `game.css`.
- Both 1023px media blocks and every detailed-report/first-match declaration remain present exactly once.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `careerMatchTypeDescriptor`, `firstMatchPayoffForTest`, `leagueMatchFlowForTest`, `renderRouteForTest` and `typographyConsistencyForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No live-browser execution is claimed; the release evidence is exact declaration/cascade preservation, deterministic builds, parse gates and retained regression hooks.
