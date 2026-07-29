# Build 12.185 — Blood Visibility & Deployment CSS Ownership

## Scope

Two bounded presentation changes ship together: improve the legibility of the recently added nearby-wall blood on compact portrait screens, and complete the next SW-020 ownership item at the end of `game.css`.

## Blood visibility

Placement and simulation are unchanged. `30-bot-ai.js` still calls the cosmetic path only after positive health damage. `spawnBloodSplatter()` still starts just beyond the struck operator, reuses the shared `castRay` continuation direction, rejects surfaces beyond 1.25m and stores at most 18 transient events. Armour-only absorption still creates no blood, and round reset still clears the pool.

The procedural presentation is now deliberately distinct from Build 12.155 bullet chips. The minimum core is wider than the largest pale bullet-chip rim, the dark-red palette is more saturated, the mark is flatter against the wall, the cluster starts with three surrounding droplets and every event includes at least one narrow downward drip. A non-fatal body hit therefore uses five bounded draws rather than the previous three, while headshots and fatal hits remain within a seven-spot maximum. No texture, asset, shader pass, hitbox, damage, armour, AI, collision, navigation, line-of-sight or settlement change is introduced.

## Confirm Deployment CSS ownership

The complete Build 12.133 `Confirm Deployment: readable at every width` section is removed from the end of `css/game.css` and placed in `css/deployment-readability.css`. Selectors, declarations and the 1023px breakpoint are unchanged. The new sheet loads immediately after `game.css`, before `economy-guide.css`, preserving the section's former cascade position.

The desktop roster remains a 26px index, 54px portrait, flexible identity and 128–250px role band with a 60px minimum row. Below 1024px it remains a 24px index, 50px portrait and flexible identity in three columns with a 62px minimum row. Deployment heading, map, operator, tactic and lane typography retain their authored desktop and compact values.

## Stable contracts and documentation

`CONTRACTS.md` now records the visual distinction between blood and bullet chips at compact portrait widths while retaining the existing transient-renderer boundaries. `ARCHITECTURE.md` records the new deployment owner and complete cascade order. `HANDOFF.md`, `AGENTS.md`, `README.md`, `PROJECT.md`, `00-READ-FIRST-GPT.md` and `CHANGELOG.md` carry current release/routing updates. Save schema remains 19 and diagnostics schema remains 1.

## Debt guardrails

The CSS report records the deployment-readability layer separately. The `game.css` budget falls from 30,785 to 30,730 lines. Existing `!important` and media-query budgets do not increase.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and standalone inline JavaScript parse.
- The Confirm Deployment marker is absent from `game.css` and present exactly once in `deployment-readability.css`.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS`; standalone output retains no external development stylesheet.
- Headless Chromium captures the complete deployment computed-style snapshot before extraction and after extraction at 500px, 833px and 1440px; every sampled value is identical.
- The compact roster remains three columns with a 62px minimum row; the desktop roster remains four columns with a 60px minimum row.
- `bloodSplatterForTest()` verifies zero health damage is ignored, the mark rests on shared-raycast solid geometry within 1.25m, the core exceeds the bullet-chip rim by at least 1.5×, the cluster contains at least five spots and a downward drip is present.
- Repeated blood tests settle at the 18-event cap with 90 spots for the non-fatal body-hit fixture; the direct blood render pass reports exactly one draw per bounded procedural spot.
- Existing `impactDecalForTest()` remains green.
- CSS debt remains within budget.
- Root `cod.html` is byte-identical to the standalone.

No manual live play session is claimed. Browser evidence is the automated before/after deployment comparison plus the 500px compact renderer probe, deterministic builds, parse gates, retained hooks and artifact identity.
