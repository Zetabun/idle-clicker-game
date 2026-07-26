# Build 12.110 – Natural operator silhouettes

## Scope

Make third-person operators read as less blocky and robotic while preserving
gameplay, the authored visual identity and Build 12.109 match performance.

## Implementation

- Replaced the five-ring torso profile with a seven-ring ribcage, clavicle and
  waist silhouette, still submitted as one draw.
- Refined the pelvis into a six-ring transition between torso and legs.
- Replaced box-like knee and elbow protection with one tapered,
  forward-profiled joint-shell mesh in the existing draw slots.
- Replaced the rounded-box shoe with a longitudinal boot mesh that includes a
  rounded heel, raised instep and tapered toe in the existing draw slot.
- Added restrained presentation-only pelvis counter-yaw/roll, torso
  counter-sway and head stabilisation.
- Shoulder placement now follows torso roll and gait subtly. Elbows derive from
  the shoulder-to-hand chain, while the authored weapon hand anchors remain
  unchanged.
- Living and fallen operators share the revised geometry.
- Added deterministic `operatorPreview=1` and `operatorAudit=1` query paths for
  visual and regression checks.

## Boundaries

- No hitbox, collision, navigation, line-of-sight, AI, movement, weapon,
  damage, health, match, economy or progression value changed.
- Operator body draw-call count is unchanged.
- Build 12.109 static batching, conservative culling, collision broad phase and
  door-collider caching remain intact.
- Save schema remains 19 and diagnostics schema remains 1.

## Verification

- Rifle and sidearm close-range previews were inspected in the live Citadel
  renderer. Hand placement remained on the authored grips and the revised
  shoulder/elbow chain stayed connected.
- `operatorAudit=1` passed the living lower-body geometry, compact proportions,
  shared living/corpse geometry and all weapon attachment checks. All nine
  corpse samples (three poses at 3 m, 12 m and 24 m) rendered without faults.
- The operator surface audit reports zero additional body draw calls.
- A ten-operator Citadel performance run reported 1,298 total draws, 102 static
  batch draws, 5.40 ms average frame work, 1.93 ms average updates and 3.46 ms
  average rendering at the full quality tier. No runtime fault occurred.
- The retained release audit passed Citadel, Dune and Office geometry, Citadel
  route connectivity, Citadel spawn clearance and career-state integrity.
- The collision broad phase matched all 165,888 brute-force samples across the
  three arenas with zero mismatches.
- Every modular source, the generated development bundle and the standalone
  script parsed successfully.
- Two consecutive builds produced identical development-bundle and standalone
  SHA-256 hashes.
- The source ZIP contains all required source and documentation, exactly one
  standalone release, no Python cache files, and every archived stream passes
  an integrity read.
