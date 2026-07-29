# Build 12.181 — Command Chrome CSS Ownership

## Audit item

Continues SW-020 component by component. After the match-type and Combat Effectiveness extractions, the remaining Build 12.134 EOF block owns compact shared command typography floors and containment for nowrap copy.

## Change

The complete remaining Build 12.134 compact command block is removed from the tail of `css/game.css` and placed in `css/command-chrome.css`. Its single `max-width: 1023px` media block, selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving its previous cascade position before Combat Effectiveness, match type, route readability and every later component layer.

The presentation contract is unchanged. Menu pills, command metadata, career XP copy, response labels and section headings retain their 12px floors. Response secondary labels, fixture labels and staff definition lists remain 11px; Armoury slot/action/state labels remain 11.5px. Shared small/em/pill copy retains `min-width: 0`, `max-width: 100%` and `overflow-wrap: anywhere`; Armoury small copy still permits normal wrapping; command metadata remains wrapped with a 6px row gap.

No route markup, navigation, report scoring, gameplay, economy, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and cascade order. `HANDOFF.md` and `AGENTS.md` carry the operational order and regression hooks. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing compact-layout and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the command-chrome layer separately. The `game.css` budget falls from 30,995 to 30,930 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.134 tail marker is absent from `game.css`; the compact command media block and representative typography/containment declarations exist exactly once in `command-chrome.css`.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `mobileInterfaceAuditForTest`, `typographyConsistencyForTest`, `economyGuidanceForTest` and `renderRouteForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No live-browser execution is claimed; the release evidence is exact declaration/cascade preservation, deterministic builds, parse gates and retained regression hooks.
