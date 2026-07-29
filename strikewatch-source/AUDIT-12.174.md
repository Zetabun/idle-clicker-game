# Build 12.174 — Training Readability CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.135 training/development readability layer for operator cards, programme controls, metrics and the development introduction.

## Change

The complete training/development readability block is removed from the tail of `css/game.css` and placed in `css/training-readability.css`. Selectors, declarations and the `max-width: 1023px` breakpoint are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before training programme, management feedback, compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The readability contract is unchanged. Training card labels, operator names, metadata, result notes, metrics and development-intro copy retain their desktop and compact floors. Programme selects remain 40px high on desktop and 46px below 1024px. Training assignment, draft saving, guided scrolling, gameplay and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. Existing compact and stylesheet-order invariants remain sufficient, so `CONTRACTS.md` is unchanged.

## Debt guardrails

The CSS report records the training-readability layer separately. The `game.css` budget falls from 31,300 to 31,275 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The training/development readability marker exists exactly once in `training-readability.css` and no longer exists in `game.css`.
- Desktop and compact card, select, metrics and introduction declarations remain present, including 40/46px programme-control heights.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `renderTrainingFacilityTab`, `typographyConsistencyForTest`, `mobileInterfaceAuditForTest` and `firstMatchGuidanceForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
