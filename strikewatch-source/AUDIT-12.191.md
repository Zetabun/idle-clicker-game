# Build 12.191 — Operator Silhouette Separation

## Scope

This release implements the second low-cost battle-visual improvement: third-person operator silhouette separation. Dark kit and armour could merge into dark arena surfaces even after Build 12.190 restored restrained environmental light pickup.

## Changes

- Extends the existing local-detail uniform into three values: 0 static geometry, 1 third-person operators and corpses, and 2 the first-person viewmodel.
- Adds a 0.028 neutral base lift plus up to 0.052 additional edge lift for mode-1 geometry only.
- Reuses the existing rim calculation, so no extra power operation is required.
- Living and fallen operators share the effect through the existing `drawSoldier()` wrapper.
- The first-person viewmodel keeps model-space texture stability but is explicitly assigned mode 2 and receives no silhouette lift.
- Adds `operatorSilhouetteSeparationForTest()` to guard mode separation, bounded strength and zero-cost boundaries.

## Performance and stability

The release adds no meshes, draw calls, textures, framebuffer passes, shader uniforms or light sources. Static arena geometry is unchanged because its operator weight is zero. The viewmodel is unchanged because mode 2 also produces zero operator weight. Geometry, materials, contact AO, environmental light pickup, culling, collision, navigation, line of sight, combat, saves and schemas remain authoritative and unchanged.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and every standalone inline script parse with Node.
- Source checks confirm static/operator/viewmodel modes 0/1/2 and bounded 0.028/0.052 lift values.
- Existing environmental-light, surface-space, operator-AO and dynamic-culling diagnostics remain present.
- Arena integrity and navigation hooks remain present.
- CSS debt remains within the inherited budget.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.

The release validates separation and cost boundaries in source and build gates. Visual strength and frame pacing on a specific device still require direct device observation.
