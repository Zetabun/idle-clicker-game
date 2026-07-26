# Build 12.109 – Citadel match performance

## Scope

Remove the heavy frame stutter that appeared in the guided demo after the Build
12.108 Citadel Depot quality rework, without changing gameplay or the authored
visual result.

## Root cause

The denser environment exposed two independent per-frame costs:

1. `drawStaticWorld()` submitted almost four thousand Citadel static primitives
   every rendered frame, including objects outside the spectator camera.
2. Every operator clearance sample scanned the complete prop list and rebuilt
   the sliding-door collider array. Clearance is sampled repeatedly by movement,
   navigation and combat positioning, so this allocation and full scan dominated
   the operator update once the prop count increased.

The pre-fix guided-demo trace measured approximately 4,635 total draw calls,
3,998 static candidates, 33.70 ms in operator updates, 3.74 ms in rendering and
48.01 ms of frame work.

## Implementation

### Static world rendering

- Base meshes retain their local source geometry and conservative bounding
  spheres.
- On Citadel's first render, opaque time-invariant static primitives are
  transformed into world space and grouped into indexed GPU meshes by their exact
  colour, emissive, alpha, surface and roughness inputs.
- Groups split before the 16-bit index limit. Translucent draws, doors, warning
  lights and time-dependent effects stay on the original path.
- Remaining static draws use conservative camera-frustum sphere tests.
- `staticBatching=0` and `staticCulling=0` remain non-persistent comparison
  switches.

### Collision

- Static prop colliders are indexed into two-metre spatial cells whenever the
  active arena changes.
- A circle query examines only cells touched by its exact query radius, then
  applies the unchanged `circleIntersectsLevelProp()` narrow phase.
- Segment queries use a conservative bounding rejection before the unchanged
  segment/collider intersection equations.
- Sliding-door collider geometry is cached by exact door state rather than
  reconstructed by every clearance sample.

## Behaviour and visual boundaries

- No Citadel layout, prop, stair, gate, catwalk, decor, material, light or effect
  was changed.
- No operator decision, work budget, update cadence, navigation result, line of
  sight, collision narrow phase, weapon value, health value, match rule, reward,
  economy or progression value was changed.
- Save schema remains 19 and diagnostics schema remains 1.

## Verification

- Live guided demo, optimized path: about 1,300 total draw calls, 102 static batch
  draws, 2.00 ms operator updates, 2.80–3.08 ms rendering and 4.96–5.65 ms frame
  work after warm-up.
- Original static submission path with the collision optimisation retained:
  4,642 draw calls, 2.60 ms operator updates and 7.96 ms rendering. This isolates
  the collision and renderer improvements.
- `propCollisionBroadphaseForTest()` compared 165,888 point/radius queries across
  Citadel, Dune and Office with the brute-force collider list: zero mismatches.
- Guided-demo screenshots were captured from both optimized and diagnostic
  fallback paths; map geometry, materials, lighting, HUD and operator
  presentation remained intact.
- Every modular JavaScript file, the generated development bundle and the
  extracted standalone script parsed successfully.
- Two consecutive builds produced identical bundle and standalone SHA-256
  hashes. The release audit reported all three arena-geometry gates, Citadel
  route connectivity, Citadel spawn clearance and career-state integrity as
  passing, with no runtime faults.
- The source ZIP contains 144 entries, all required source and documentation
  files, and exactly one generated release:
  `dist/strikewatch-build-12.109.html`. Every archived file stream passed the
  integrity read.
