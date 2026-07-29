# Build 12.184 — Economy Guide CSS Ownership

## Audit item

Continues SW-020 component by component. After the Inbox extraction, the next bounded EOF section is the Build 12.133 after-action reward and economy guide presentation.

## Change

The complete `After-action rewards / economy guide typography` section is removed from the tail of `css/game.css` and placed in `css/economy-guide.css`. Selectors, declarations and both responsive breakpoints are unchanged. The new sheet loads immediately after `game.css`, before `inbox-scroll.css`, preserving the section's former cascade position.

The extracted declarations remain unchanged: 10px header kicker, 15px title, 11px header/body/aside copy, 9.5px article metadata, 17px article value and the existing line heights and letter spacing. Below 1024px, the card area retains its authored two-column grid with an 8px gap and the compact size declarations; below 561px, it retains the authored single-column grid. Older, more-specific readability rules elsewhere in the cascade still win where they did before extraction. The browser gate therefore compares the complete final computed-style snapshot before and after the move rather than assuming every raw declaration is the winning value.

The later `compact-readability.css` layer still raises `#menuContent .club-economy-guide article > span` to the established 12px compact floor. This ordering is deliberate and verified. No reward calculation, Club Cash, Gold Coins, payout, finance ledger, post-match settlement, gameplay, persistence, save schema or diagnostics schema changes.

## Documentation

`ARCHITECTURE.md` records the new owner and complete cascade order. `HANDOFF.md` and `AGENTS.md` carry the operational order and regression hooks. `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Existing stylesheet-order, compact-layout and economy invariants remain sufficient, so `CONTRACTS.md` is intentionally unchanged.

## Debt guardrails

The CSS report records the economy-guide layer separately. The `game.css` budget falls from 30,810 to 30,785 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The economy marker is absent from `game.css` and present exactly once in `economy-guide.css`.
- Representative desktop, 1023px and 560px declarations remain present.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS` order.
- Standalone output contains no external development stylesheet links.
- Headless Chromium captures the complete economy-guide computed-style snapshot before extraction and after extraction at 1440px, 1023px and 560px; every value is identical. The compact grid remains two columns with an 8px gap, the phone grid remains one column and the later compact metadata floor remains intact.
- The generated bundle retains `economyGuidanceForTest`, `firstMatchPayoffForTest`, `typographyConsistencyForTest`, `mobileInterfaceAuditForTest` and `renderRouteForTest`.
- CSS debt remains within budget.
- Root `cod.html` is byte-identical to the standalone.
- Save schema 19 and diagnostics schema 1 are unchanged.

This release is an ownership-only extraction. No manual live-browser play session is claimed; browser evidence is the automated before/after computed-style comparison plus deterministic builds, parse gates, retained hooks and artifact identity.
