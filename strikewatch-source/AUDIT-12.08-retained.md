# Strikewatch 12.08 Audit — Operator Silhouette Pass

## Scope

Build 12.08 improves the visual construction of living operators and corpses without replacing the custom WebGL engine or changing simulation behaviour. All supplied Markdown files were read before source edits.

## Implemented rendering changes

- Added one shared shaped torso mesh with a narrower waist, fuller ribcage and sloped shoulders.
- Added one shared tapered capsule mesh for upper/lower arms, upper/lower legs and narrow armour runs.
- Added one shared rounded superellipsoid mesh for pelvis, boots, armour plates, shoulder armour, pouches and fittings.
- Increased the existing shared head sphere from 12 × 8 to 14 × 10 segments.
- Applied the same upgraded body geometry to living operators and corpses.
- Preserved the existing two-bone leg solver, animation blending, reload poses, hit reactions, death poses and weapon anchors.
- Kept operator body draw-call count unchanged; the pass substitutes shared meshes on existing draws rather than adding duplicate layers.
- Added `operatorSurfaceGeometryAudit()` and deterministic `operatorPresentationForTest(distance)` coverage.

## Gameplay invariants

The pass does not change operator collision radius, hit detection, line of sight, pathfinding, AI decisions, weapon values, health, damage, rewards, economy, progression, career schema or diagnostic schema.

## Source and build checks

- All modular `js/*.js` files: `node --check` passed.
- Generated `js/strikewatch.dev.js`: `node --check` passed.
- Standalone inline JavaScript extracted from `dist/strikewatch-build-12.08.html`: `node --check` passed.
- `python3 build.py`: passed.
- Deterministic second build: generated bundle and standalone matched byte-for-byte.
- Final SHA-256:
  - development bundle: `c7037d3c955a640fedd7b07c3512459c1785cfc7017b8ab13b906bb9e5db133c`
  - standalone HTML: `8a6097d8078a589a9d10a90f2f1ef01ce647353b2404ae0016eabfd93e5ab449`

## WebGL runtime and visual regression

The self-contained release was injected directly into Chromium through DevTools because the environment's enterprise browser policy blocks both `file:` and localhost navigation.

- Runtime build: `12.08.0-20260718`.
- Renderer selected: WebGL.
- Mobile landscape viewport: 844 × 390.
- Deterministic living-operator presentation: passed at 2.45 world units.
- Surface audit: shaped torso, tapered limbs, rounded equipment, shared living/corpse geometry, zero additional body draw calls and no collision/hitbox changes.
- Operator proportions: 1.81 model height, 0.68 shoulder width, compact-silhouette and readable-head checks passed.
- Two-bone leg audit retained 32 geometry samples.
- Operator animation audit passed movement-angle smoothing, aim smoothing, acceleration, strafe/backpedal, shoulder switching, corner readiness, hit/death phases and reload-phase visibility.
- Adaptive-resolution regression changed scale from 1.00 to 0.92 under the deterministic pressure test.
- No application JavaScript exceptions were recorded. Chromium emitted only environment-specific SwiftShader deprecation and screenshot `ReadPixels` performance warnings.

## Retained unrelated regressions

- Career state integrity: passed with zero issues.
- Dune Bastion authoritative audit: passed.
- Dune engagement-plan audit: passed.
- Dune navigation benchmark: 160/160 successful routes, zero failures; graph remained 494 nodes, 2,752 edges and one component.
- Dune deployment preview: rendered at 320 × 176 with non-empty image data.
- Skyline Offices walkway audit: passed.
- Career schema round trip: retained schema 17 data.

## Second-pass findings

- Corrected the shaped torso top/bottom cap winding after checking it against active back-face culling.
- Replaced spherical shoulder pads with flatter rounded armour forms after the first close-range visual inspection.
- Confirmed generated output remained deterministic after both corrections.
