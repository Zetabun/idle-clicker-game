# Build 12.193 — Operator Muzzle-Light Response

## Scope

This release implements the fourth low-cost battle-visual improvement: a brief material-light response on the operator who has actually fired. The existing muzzle sphere made the shot origin visible, but nearby hands, weapon parts, armour and face materials did not react, so the flash could look detached from the operator producing it.

## Changes

- Added one `OPERATOR_MUZZLE_LIGHT_RESPONSE` policy in `js/60-renderer-core.js`.
- Reuses the authoritative `bot.flash` value, which is set only after exact-frame aim, visibility, exposure and blocker checks accept a real shot.
- Uses the already-authored weapon rig muzzle anchor, shared with the existing muzzle sphere.
- While that living operator is being drawn, existing opaque surface draws within 1.20 world units receive a squared distance falloff.
- The response mixes at most 30% toward a warm flash colour and adds at most 0.42 through the existing emissive uniform.
- The existing muzzle sphere remains transparent and is explicitly excluded from the scoped response.
- Static geometry, shadows, corpses, other operators and the first-person viewmodel receive zero response.
- Uses one persistent light-state object and one persistent colour scratch buffer, adding no per-draw allocations.
- Added `operatorMuzzleLightResponseForTest()` to guard falloff, signal gating, mode/surface exclusions and zero-cost boundaries.

## Performance and stability

No light object, shadow map, mesh, texture, framebuffer, shader pass, shader uniform or draw call was added. The existing `uColour` and `uEmissive` uploads are adjusted on the CPU for eligible draws only. The existing muzzle-flash sphere draw remains exactly one conditional draw. The simulation-owned firing signal, cadence, ammunition, recoil, damage, visibility, collision, navigation, line of sight, saves and schemas are unchanged.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and every standalone inline script parse with Node.
- Source checks confirm the 1.20-unit bounded falloff, 0.30 warm mix and 0.42 emissive ceiling.
- Near opaque operator surfaces receive more response than mid-range surfaces; outside-radius surfaces receive zero.
- Transparent draws, shadow surfaces, static mode, viewmodel mode and inactive-shot state receive zero.
- The existing real-shot authority remains `this.flash = 1` after blocker and wall rechecks; reload, weapon switch and blocked paths still clear it.
- The existing muzzle sphere remains a single conditional draw on the shared muzzle anchor.
- Existing environmental-light, silhouette-light, contact-shadow, operator-AO and dynamic-culling hooks remain present.
- Arena integrity and navigation hooks remain present.
- CSS debt remains within the inherited budget.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.

The release validates signal isolation, falloff and render-cost boundaries. Exact visual strength and frame pacing on a particular device still require direct observation in a live firefight.
