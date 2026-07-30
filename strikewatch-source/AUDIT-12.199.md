# Build 12.199 — Surface-Anchored Blood Decals

## Scope

Nearby-wall blood used fixed world coordinates after placement. A mark visually landing on a closed sliding door therefore stayed in the doorway when the panel opened. Individual procedural droplets could also extend beyond the supported wall face at a corner, leaving small red shapes apparently suspended beside the geometry.

## Changes

- Added `BLOOD_SURFACE_ATTACHMENT` in `js/61-world-renderer.js` with one bounded surface authority for static walls and dynamic door panels.
- The blood continuation ray now tests visible sliding-door panels before accepting the farther grid-wall hit. Broad panel faces are eligible; narrow panel edges are deliberately rejected.
- Door splatters retain panel side, material-local horizontal position and face direction. Rendering resolves that attachment from the current `openAmount`, so the complete cluster travels with the panel.
- Door spots are clipped to the currently visible part of the panel. When the marked material slides into the wall pocket, the blood disappears with it instead of remaining in the aperture or drawing through the wall.
- Static-wall spots now require open space in front and solid backing behind at their centre and both lateral edges. Unsupported corner specks are rejected, while generation makes bounded extra attempts to retain a readable cluster where space permits.
- The existing dark irregular core, downward drip, positive-health-damage gate, 1.25m range and 18-event cap remain unchanged.
- Added `bloodSurfaceAttachmentForTest()` covering door movement, wall-pocket concealment and corner-footprint rejection.

## Behaviour boundaries

This remains transient renderer presentation. Damage, armour, hitboxes, weapon values, line of sight, collision, navigation, AI, match results, rewards, saves and schemas are unchanged. No mesh, texture, shader pass, uniform or persistent field was added. The direct blood draw count can only stay equal or fall because unsupported or pocketed spots are skipped.

## Verification

- The attachment diagnostic proves a test mark moves more than 0.20m with a half-open panel and becomes hidden when that panel is fully pocketed.
- The same diagnostic proves a centred wall spot retains backing while a footprint crossing a 90-degree edge is rejected.
- Source gates preserve positive real-health-damage placement, shared `castRay`, the 1.25m threshold, the 18-event pool, at least one downward drip and round clearing.
- Existing `bloodSplatterForTest()` and `impactDecalForTest()` remain present.
- Build 12.198 match-clock and Build 12.197 simulation-quality hooks remain present and unchanged.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
