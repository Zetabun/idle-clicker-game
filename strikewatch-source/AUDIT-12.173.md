# Build 12.173 — Training Programme CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.139 training workflow presentation that keeps the save control and roster together and makes an outstanding programme requirement visually explicit.

## Change

The complete Build 12.139 training-programme block is removed from the tail of `css/game.css` and placed in `css/training-programme.css`. Selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The workflow contract is unchanged. `.training-programmes-zone` remains an unclipped grid that inherits the route gap and keeps the draft/save bar with the roster panel. `.needs-programme` retains the accent rail and accent requirement kicker. Requirement-copy transitions, draft persistence, training progression, guided scrolling, gameplay and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. No cross-release behavioural invariant changes, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the training-programme layer separately. The `game.css` budget falls from 31,320 to 31,300 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.139 training marker exists exactly once in `training-programme.css` and no longer exists in `game.css`.
- The unclipped grid wrapper, inherited gap, accent rail and accent kicker declarations remain present.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `renderTrainingFacilityTab`, `workflowSaveTrainingDrafts`, `firstMatchGuidanceForTest`, `mobileInterfaceAuditForTest` and `guidanceConsolidationForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
