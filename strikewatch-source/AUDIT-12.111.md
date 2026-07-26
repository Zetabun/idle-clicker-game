# Build 12.111 – Realistic operator heads

## Scope

Improve the realism of third-person operator heads while preserving the
established tactical equipment, pale natural complexion, gameplay readability,
performance and all authoritative gameplay dimensions.

## Implementation

- Expanded the procedural head from eight to nine rings and reshaped it around
  a narrower chin and jaw, fuller cheeks, recessed eye sockets, a brow ridge
  and a restrained nose bridge.
- Refitted the open-bottom helmet closer to the skull with a smoother forehead,
  temple and rear-nape transition.
- Reprofiled the lower-face cover so it follows the chin, cheeks and nose bridge
  instead of reading as a horizontal block.
- Replaced rectangular-looking goggle frames and lenses with elliptical forms,
  retaining the separate lenses, bridge, headset, rails, chin straps and team
  tabs.
- Slightly lengthened and narrowed the presentation head while keeping its top
  inside the existing model-height contract.
- Living and fallen operators continue to use one shared head assembly.

## Boundaries

- No hitbox, hit detection, collision, operator height, AI, navigation,
  movement, weapon, combat, match, economy or progression value changed.
- The Build 12.57 pale natural skin palette, matte skin material and
  visible-face exposure contract remain intact.
- Existing head draw slots and distance-based LOD remain unchanged.
- Save schema remains 19 and diagnostics schema remains 1.

## Verification

- Close-range (2.1 m) and ordinary match-distance (3.5 m) previews were
  inspected in the live Citadel WebGL renderer.
- The head audit passed the anatomical skull, tapered jaw, eye socket, brow,
  nose bridge, fitted helmet, contoured face cover, elliptical goggles and
  model-height checks.
- The Build 12.57 skin audit passed all pale natural tones, the dedicated matte
  material, shared living/corpse presentation and visible-face exposure.
  Face-cover coverage is 0.646 of head width and 0.301 of head height, within
  the retained 0.70 and 0.36 limits.
- All weapon attachment checks passed with no grip or muzzle-anchor failures.
- All nine corpse samples (three poses at 3 m, 12 m and 24 m) rendered without
  a runtime fault.
- A ten-operator Citadel run reported 1,297 draws, 102 static batch draws,
  5.18 ms average frame work, 1.69 ms average updates and 3.49 ms average
  rendering at full quality. The head pass adds no draw calls.
- The retained release audit passed all three arenas, Citadel routes, spawn
  clearance and career-state integrity with no runtime faults.
- The collision broad phase matched all 165,888 brute-force samples with zero
  mismatches.
- Every modular source, generated bundle and standalone inline script parsed.
- Two consecutive builds produced identical bundle and standalone hashes.
- The final source archive contains exactly one standalone release, no cache
  files and no failed entry integrity reads.
