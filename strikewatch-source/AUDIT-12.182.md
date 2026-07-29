# Build 12.182 — Operator Portrait CSS Ownership

## Audit item

Continues SW-020 component by component. After the Build 12.134 tail extractions, the next bounded EOF section is the Build 12.133 asset-free operator portrait presentation used across team cards and Confirm Deployment.

## Change

The complete `Operator portrait: deeper procedural variation` section is removed from the tail of `css/game.css` and placed in `css/operator-portrait.css`. Selectors, declarations and the single 1023px compact breakpoint are unchanged. The new sheet loads immediately after `game.css`, preserving the section's former cascade position before command chrome, Combat Effectiveness, match type, route readability and every later component layer.

The presentation contract is unchanged. Six complexion slots remain driven by `--skin-light`, `--skin-mid` and `--skin-dark`; kit variants remain independent through `--kit-light`, `--kit-mid` and `--kit-dark`. Helmet variants retain their authored dimensions, including `helmet-3` as a low headband. Shoulder, chest-plate and rig variants remain intact, and comms keeps the role accent and glow. Confirm Deployment retains a 54×52px portrait with a `.88` bust scale and 6.5px footer copy on desktop, plus a 50×50px portrait and 7px footer copy below 1024px.

Deterministic identity generation remains in `teamPlayerVisualMarkup(player, role)`, which derives silhouette, complexion, headgear and rig classes from independent seed slices and emits the existing helmet, head, visor, neck, shoulders, body, rig, plate and comms elements. No player generation, attributes, role logic, deployment markup, gameplay, economy, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order and regression hooks. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing compact-layout, deterministic-generation and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the operator portrait layer separately. The `game.css` budget falls from 30,930 to 30,830 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The operator portrait marker is absent from `game.css` and present exactly once in `operator-portrait.css`.
- Representative palette, tone, kit, helmet, shoulder, plate, comms, desktop sizing and compact sizing declarations remain present.
- `teamPlayerVisualMarkup` retains independent portrait, complexion, headgear and rig seeds plus all authored portrait element classes.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `teamPlayerVisualMarkup`, `mobileInterfaceAuditForTest`, `renderRouteForTest` and `typographyConsistencyForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No live-browser execution is claimed; the release evidence is exact declaration/cascade preservation, deterministic builds, parse gates, retained source markup and retained regression hooks.
