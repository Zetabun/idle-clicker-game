# Build 12.169 — Armour Viewer CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.142 armour inspector rotation pivot plus the Build 12.152 inspector-only compositor-promotion refinement.

## Change

The complete armour pivot block is removed from the tail of `css/game.css` and placed in `css/armour-viewer.css`. Selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The performance contract is unchanged: `syncCareerArmourViewerTransform()` writes `transform` on one `.career-armour-viewer-pivot`. It must not write inherited yaw/pitch properties on the rig root, which previously invalidated the computed style of 384–618 face elements per rotation step. `will-change` and transition removal remain inspector-scoped so thumbnails and product views do not keep unused compositor layers.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` correct older operational order wording now that the armour layer sits between `game.css` and weapon presentation. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. The existing `CONTRACTS.md` stylesheet-order invariant remains sufficient and is unchanged.

## Debt guardrails

The CSS report records the armour-viewer layer separately. The `game.css` budget falls from 31,460 to 31,430 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.142 and Build 12.152 pivot markers exist exactly once in `armour-viewer.css` and no longer exist in `game.css`.
- The extracted selectors and declarations preserve the previous tail block.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `syncCareerArmourViewerTransform`, `armour3dPresentationForTest`, `armourSystemForTest` and `loadoutStillForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
