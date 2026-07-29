# Build 12.168 — Weapon Presentation CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.147 CSS-3D weapon presentation layer shared by crate reveals, inventory thumbnails, the Armoury inspector and store cards.

## Change

The complete Build 12.147 weapon face-lighting, cylinder-shading and grip-texture block is removed from the tail of `css/game.css` and placed in `css/weapon-presentation.css`. Selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before `loadout-stills.css`, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The rules affect CSS-3D menu models only. WebGL match/world/viewmodel lighting, weapon geometry authorities, combat statistics and career state are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md`, `AGENTS.md`, `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. The existing `CONTRACTS.md` stylesheet-order invariant remains sufficient and is unchanged.

## Debt guardrails

The CSS report records the weapon-presentation layer separately. The `game.css` budget falls from 31,500 to 31,460 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.147 marker exists exactly once in `weapon-presentation.css` and no longer exists in `game.css`.
- The extracted declarations match the previous tail block byte-for-byte.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- Weapon geometry, AR-4 model, viewmodel presentation and loadout-still regression hooks remain green where browser execution is available.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
