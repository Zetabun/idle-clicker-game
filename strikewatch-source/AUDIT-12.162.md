# Build 12.162 — Visible Geometry

## Scope

Adds conservative whole-operator camera-frustum culling before procedural body, armour, shadow and weapon assembly. Operators are skipped only when a 1.85-unit guard sphere is wholly outside the camera.

## Visual fidelity

No meshes, materials, shaders, transforms, animation, LOD thresholds or colours changed. `?dynamicCulling=0` disables only this optimisation and remains the visual-reference path. Actors intersecting the viewport guard band continue to render.

## Behaviour boundaries

AI, collision, hit detection, navigation, line of sight, match simulation, saves and gameplay state are untouched. Living and fallen operators use the same conservative radius.

## Verification

- `dynamicActorCullingForTest()` covers centred, edge-guard, behind-camera, side and far-plane cases.
- Modular, generated and standalone JavaScript parse.
- Two builds are byte-identical.
- Root `cod.html` is byte-identical to the standalone.
