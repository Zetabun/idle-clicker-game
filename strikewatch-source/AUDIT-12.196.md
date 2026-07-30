# Build 12.196 — Clean Spectator Handoffs

## Scope

Build 12.195 improved which owned operator AUTO mode watches, but the first-person renderer still retained one canvas-session weapon state across every viewed operator. A cut could therefore inherit turn sway, recoil spring velocity, recoil impulse, smoke, locomotion bob, muzzle flash, hit pulse or shake from the previous subject.

## Changes

- Added `SPECTATOR_HANDOFF_PRESENTATION`, `viewWeaponPresentedAngle()`, `resetViewWeaponPresentationState()` and `ensureViewWeaponPresentationSubject()` in `js/60-renderer-core.js`.
- `js/63-viewmodel-renderer.js` now checks the actual camera object before measuring angular velocity. A new subject is seeded with its own rendered aim angle and all transient first-person motion is cleared.
- Subject changes clear the shared muzzle, shake and hit-pulse presentation signals so the outgoing operator cannot visually affect the incoming view.
- Established handoffs use a canvas-only 140ms opacity recovery from 0.72 to 1. HUD controls remain stable and `prefers-reduced-motion: reduce` disables the animation.
- Added `spectatorHandoffPresentationForTest()` and exposed it through the public debug API.

## Behaviour boundaries

No spectator index, AUTO-director score, hold time, death delay, input control, bot, target, movement, health, weapon, match result, reward, persistence or schema state is changed. The renderer observes whichever camera the existing systems already selected and resets only transient first-person presentation state. The transition does not delay selection.

## Verification

- `python3 -m py_compile build.py` passes with bytecode directed outside the repository.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- `spectatorHandoffPresentationForTest()` verifies incoming-angle seeding, complete transient-state clearing, the 100–160ms transition bound, canvas-only presentation and zero simulation writes.
- Existing spectator director, two-second death handoff, tracer, muzzle-light, operator-lighting, shadow, AO, culling and arena integrity hooks remain present.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
