# Build 12.183 — Surface Blood & Inbox CSS Ownership

## Scope

Two bounded changes ship together: the next SW-020 ownership item, and an FPS presentation feature requested for live matches.

## Nearby-wall blood splatters

A landed shot already resolves authoritative health damage in `30-bot-ai.js`. After positive health damage is applied, the cosmetic path calls `spawnBloodSplatter(shooter, target, hit)`. Armour-only absorption does not create blood. The continuation direction is the real shooter-to-target line; from just beyond the target, `castRay` finds the first solid surface. A splatter is created only when that surface is no more than 1.25 metres behind the operator. This reuses the same grid authority as line of sight and Build 12.155 bullet chips.

Each splatter is a small cluster of flattened procedural spheres: one central mark and two to four droplets, with modest extra spread for headshots and fatal hits. It is presentation only. `BLOOD_DECAL_LIMIT` caps the pool at 18 events, the dynamic renderer draws it after world geometry and outside `drawStaticWorld`, and round reset clears it beside tracers and bullet chips. No texture, asset, shader pass, navigation, collision, hitbox, damage, armour, AI or settlement change is introduced.

## Inbox scroll CSS ownership

The complete Build 12.133 `Inbox feed: inert until the manager clicks into it` tail is removed from `css/game.css` and placed in `css/inbox-scroll.css`. The declarations are unchanged: `.club-mail-list` remains `overflow-y: hidden` with contained overscroll until `body.mail-scroll-armed` restores automatic vertical scrolling, and `mail-scroll-overflow` retains the bottom mask that signals hidden rows.

The new sheet loads immediately after `game.css`, before `operator-portrait.css`, preserving the block's former cascade position.

## Stable contracts and documentation

`CONTRACTS.md` now records that bullet and blood decals are bounded transient presentation, use the shared raycaster, remain outside static batching, clear on round reset and never influence simulation. `ARCHITECTURE.md` records Inbox CSS ownership and transient surface decals under the world renderer. Current release, handoff, agent, overview and history documents are updated. Save schema remains 19 and diagnostics schema remains 1.

## Verification

- `python3 -m py_compile build.py` passes.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Every modular JavaScript file, the generated development bundle and each standalone inline JavaScript block parse.
- `game.css` no longer contains the Inbox marker; `inbox-scroll.css` contains the complete unchanged block exactly once.
- `index.html` stylesheet hrefs exactly match `CSS_PATHS`; standalone output retains no external development stylesheet.
- CSS debt stays within the existing `!important` and media-query budgets, with a tighter `game.css` limit.
- Headless Chromium loads the development build without page or console errors.
- The computed-style Inbox probe is hidden by default, becomes scrollable only with `mail-scroll-armed`, retains `overscroll-behavior: contain` and exposes the overflow mask.
- `bloodSplatterForTest()` locates a valid adjacent wall lane, creates a multi-spot splatter on solid geometry within the 1.25m threshold and reports the bounded pool.
- Repeated blood tests settle exactly at the 18-event cap; `clearBloodSplatterForTest()` returns the pool to zero.
- Existing `impactDecalForTest()` remains green.
- Root `cod.html` is byte-identical to the standalone.

No live manual play session is claimed. Browser evidence is automated headless Chromium plus source, parse, deterministic-build, computed-style, raycast-placement and pool-bound gates.
