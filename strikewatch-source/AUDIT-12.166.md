# Build 12.166 — Armoury CSS Ownership

## Audit item

Continues SW-020 as a staged ownership programme rather than a wholesale cascade rewrite. The next bounded component is the compact Armoury inventory layer audited in Build 12.157.

## Change

The complete Build 12.157 compact Armoury block is removed from the tail of `css/game.css` and placed in `css/armoury-inventory.css`. Selectors and declarations are unchanged. Its effective order remains after the 12.161 audit layer and before the later compact-navigation layer.

Build 12.165 exposed a development/build parity defect: `CSS_PATHS` included `12.161-audit-fixes.css`, so standalone output contained that layer, but `index.html` omitted the stylesheet entirely. Development and standalone could therefore resolve different cascades. Build 12.166 makes the four-file order explicit in both places and fails if any external `css/` link survives standalone generation.

## Debt guardrails

The CSS report now records the Armoury-owned layer separately. The `game.css` budget is reduced to 31,560 lines; existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Build 12.157 marker exists exactly once in `armoury-inventory.css` and no longer exists in `game.css`.
- Development and build stylesheet orders are identical.
- Standalone output contains no external development stylesheet links.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.
