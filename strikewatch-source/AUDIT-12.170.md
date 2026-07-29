# Build 12.170 — Reward Reveal CSS Ownership

## Audit item

Continues SW-020 component by component. The next bounded tail block is the Build 12.141 reward-phase presentation that retires the crate once the award scan begins and gives the weapon model the complete reveal area.

## Change

The complete Build 12.141 reward-reveal block is removed from the tail of `css/game.css` and placed in `css/reward-reveal.css`. Selectors and declarations are unchanged. The new sheet loads immediately after `game.css`, preserving the block's previous position before armour viewer, weapon presentation, loadout stills, the 12.161 audit layer, compact Armoury inventory and compact navigation.

The phase contract is unchanged: the crate core is hidden in both `cycling` and `revealed`; the awarded weapon model spans the complete grid and remains centred. Crate animation timing, reward selection, inventory settlement, Gold Coins, career saves and WebGL reward rendering are unchanged.

## Documentation

`ARCHITECTURE.md` records the new stylesheet owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the current operational order. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry the current release/routing updates. The existing `CONTRACTS.md` stylesheet-order invariant remains sufficient and is unchanged.

## Debt guardrails

The CSS report records the reward-reveal layer separately. The `game.css` budget falls from 31,430 to 31,420 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.141 reward marker exists exactly once in `reward-reveal.css` and no longer exists in `game.css`.
- The extracted phase selectors and declarations remain present and unchanged.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- The generated bundle retains `renderCareerCrate3D`, `crateSpinForTest`, `crateAttachmentForTest` and `firstMatchPayoffForTest`.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
