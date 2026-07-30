# Build 12.192 — Directional Operator Contact Shadows

## Scope

This release implements the third low-cost battle-visual improvement: more grounded and directional living-operator shadows. The previous shadow used one or two fixed flattened discs centred beneath every standing operator, regardless of facing, movement or stance. It read as a generic oval rather than a shadow responding to the battle presentation.

## Changes

- Added one `OPERATOR_CONTACT_SHADOW` policy in `js/62-character-renderer.js`.
- The broad existing disc now rotates with the operator's presented movement direction and offsets away from the renderer's established key-light direction.
- The second existing disc remains closer to the feet as a denser contact component.
- Crouching widens and slightly densifies both components.
- Running and movement lengthen both components while slightly lowering opacity, creating a softer moving silhouette.
- Added `operatorContactShadowProfile()` with one reusable scratch object, avoiding new per-frame profile allocations.
- Added `operatorContactShadowForTest()` to guard direction normalisation, stance/motion behaviour, LOD draw counts and zero-cost boundaries.

## Performance and stability

The low-detail path still draws one disc; medium and full detail still draw two. No mesh, texture, shader pass, shader uniform, shadow map, framebuffer or light trace was added. The change introduces only a bounded set of scalar calculations before the same existing draws. Corpse shadow and blood-stain rendering are unchanged. Operator geometry, animation, environmental lighting, silhouette lighting, AO, culling, collision, navigation, line of sight, combat, saves and schemas remain unchanged.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and every standalone inline script parse with Node.
- Source checks confirm the normalised fixed light-away direction and the unchanged 1/2/2 low/medium/full draw budget.
- Crouch profiles are wider and denser than idle; running profiles are longer and softer than idle.
- The tighter component remains closer to the operator than the broad directional component.
- Existing environmental-light, silhouette-light, surface-space, operator-AO and dynamic-culling diagnostic hooks remain present.
- Arena integrity and navigation hooks remain present.
- CSS debt remains within the inherited budget.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.

The release validates deterministic profile behaviour and render-cost boundaries. Exact visual strength and frame pacing on a particular device still require direct observation in a live match.
