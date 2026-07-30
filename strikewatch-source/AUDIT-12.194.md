# Build 12.194 — Muzzle-Anchored Tracers

## Scope

This release aligns visible third-person bullet streaks with the held weapon. Tracers previously began at the operator centre and a fixed torso height, while the rendered muzzle flash used the authored weapon-rig muzzle point. The mismatch was most visible in side views and crouched firing.

## Changes

- Added `OPERATOR_TRACER_ORIGIN` and `operatorTracerOrigin()` in `js/61-world-renderer.js`.
- Each rendered living operator now maintains one reusable `renderMuzzlePoint` derived from the same `operatorSharedWeaponRig(...).muzzle` transform used by the muzzle flash.
- `spawnTracer()` prefers that exact cached world point and retains the previous torso origin only as a startup/stale-cache fallback.
- Added `operatorTracerOriginForTest()` to guard rendered-muzzle preference, fallback behaviour, stale-cache rejection and unchanged cost boundaries.

## Performance and stability

The update adds one persistent three-number object per rendered operator and no per-frame object allocation after first use. Tracer count, lifetime, target endpoint, spread, misses, impact decals, hit detection, damage, cadence, ammunition, recoil, AI, collision, navigation, line of sight, saves and schemas are unchanged. No draw, mesh, texture, pass, framebuffer, light or shader uniform was added.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- Source checks confirm `spawnTracer()` uses `operatorTracerOrigin()` and the operator renderer updates `renderMuzzlePoint` from the shared authored muzzle transform.
- The 28-tracer cap and 0.085-second lifetime remain unchanged.
- Build 12.193 muzzle-light, 12.192 contact-shadow, 12.191 silhouette-light and 12.190 environmental-light hooks remain present.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
