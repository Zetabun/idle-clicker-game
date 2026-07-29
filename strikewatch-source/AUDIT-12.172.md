# Build 12.172 — Management Feedback CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the complete Build 12.140 management feedback layer: the menu live-status surface plus the visible match-control availability state.

## Change

The complete Build 12.140 management-feedback block is removed from the tail of `css/game.css` and placed in `css/management-feedback.css`. Selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before compact readability, reward reveal, armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The behaviour contract is unchanged. Management-context `showStatus()` messages remain mirrored into a dismissible polite live region above compact navigation. Repeated refusals still restart the entry transition. The visible match-state line retains its blocked opacity and blocked/ready colours. Match launch routing, status strings, dismiss timing, gameplay and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. The existing `CONTRACTS.md` stylesheet-order, compact-target and visible-feedback invariants remain sufficient and are unchanged.

## Debt guardrails

The CSS report records the management-feedback layer separately. The `game.css` budget falls from 31,405 to 31,320 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.140 management-feedback marker exists exactly once in `management-feedback.css` and no longer exists in `game.css`.
- The live-status surface, compact offset, blocked tone, entry state and visible match-state selectors remain present.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `managementStatusForTest`, `showManagementStatusForTest`, `careerMatchLaunchState`, `typographyConsistencyForTest` and `mobileInterfaceAuditForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
