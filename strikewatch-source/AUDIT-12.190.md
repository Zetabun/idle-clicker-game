# Build 12.190 — Operator Environmental Light Pickup

## Scope

This release implements the first low-cost operator-battle visual improvement: smooth environmental light pickup. Build 12.160 correctly stopped moving-surface shimmer by giving operators, corpses and the first-person viewmodel fixed average overhead pools and by disabling the stepped flicker. That was stable but made moving geometry feel detached from local arena lighting.

## Changes

- Added one `OPERATOR_ENVIRONMENT_LIGHTING` policy in `js/60-renderer-core.js`.
- Moving local-detail geometry now receives 75% of the established stable average plus 25% of the already-calculated smooth positional cool and warm pools.
- The stepped time/cell flicker remains fully disabled whenever `uLocalDetail` is active.
- Static geometry still receives the original local pools exactly because its `moving` blend remains zero.
- Added `operatorEnvironmentalLightPickupForTest()` to guard the blend weights, averages, disabled moving flicker and zero-cost boundaries.

## Performance and stability

The release adds no meshes, draw calls, textures, framebuffer passes, shader uniforms or light sources. It reuses values already calculated in the existing fragment shader and adds only a small number of scalar mix operations. Operator geometry, contact AO, culling, collision, navigation, line of sight, combat simulation, saves and schemas are unchanged.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and every standalone inline script parse with Node.
- Source validation confirms the 0.25 local / 0.75 stable policy and moving flicker value of 1.0.
- The static path remains algebraically unchanged: `moving == 0` selects the original cool and warm pools.
- Existing surface-space, operator AO, dynamic-culling, arena-integrity and navigation diagnostic hooks remain present.
- CSS debt remains within the inherited budget.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.

A back-to-back device capture remains the appropriate subjective check for the strength of the effect; this release does not claim a measured frame-rate gain or a hardware-specific visual result.
