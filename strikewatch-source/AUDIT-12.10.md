# Strikewatch Build 12.10 Audit

Audit date: 18 July 2026  
Build: `12.10.0-20260718` — **Combat Perception Hotfix**

## Trigger

A real-device Build 12.09 diagnostic export showed a 43.57-second Dune round with both teams occupying contested combat areas but recording zero target changes, zero tactical changes, zero damage and zero eliminations.

## Root cause

Build 12.09 staggered expensive all-opponent scans. On a scheduled scan, an operator could assign a visible enemy to `sightCandidate`; on the next ordinary frame, `bestVisible` became null because the operator had no committed target and no full scan was requested. The code then cleared `sightCandidate` and reset `sightTime`, so the recognition delay could never complete.

## Correction

- Revalidate a pending `sightCandidate` every simulation frame.
- Accumulate recognition time continuously while the candidate remains visible.
- Keep full opponent/challenger searches staggered by quality tier.
- Immediately retarget a visible enemy physically occluding the previous target.
- Preserve friendly-body visual occlusion and lateral clearance behaviour.

## Verification

- Modular and generated JavaScript syntax checks passed.
- `staggeredPerceptionAcquisitionForTest()` retained the same candidate across skipped scans and acquired it within the reaction window.
- `closeThreatRetargetForTest()` passed with one close-threat override.
- `operatorViewOcclusionForTest()` passed for standing, crouched and shoulder-exposure cases.
- A 20-second deterministic Dune simulation produced target-change events, tactical-state events and an elimination.
- Build 12.09 quality governor, navigation and animation systems remain unchanged.

## Compatibility

Career save schema remains 17. Diagnostics schema remains 1. No weapon, health, damage, economy, progression, reward or map geometry values changed.

## Final release verification

- Runtime bundle identified itself as `12.10.0-20260718` and became ready without application exceptions.
- The staggered acquisition regression acquired its enemy on frame 4 while preserving the same candidate across the skipped scan frame.
- A 30-second Dune runtime simulation produced 60 target-change events, 100 tactical-state changes, five eliminations and zero path failures.
- Dune engagement-plan checks passed and the navigation benchmark completed 160 routes with 160 successes and zero failures.
- State-integrity audit passed with zero issues.
- The quality governor still lowered Full to Balanced under forced sustained pressure and restored its previous state afterwards.
- All modular scripts, the generated development bundle and the standalone inline script passed JavaScript syntax validation.
- Two consecutive builds produced identical SHA-256 hashes for both generated outputs.
- The packaged ZIP passed archive integrity, extracted-source syntax validation and an extracted deterministic rebuild comparison.

Headless Chromium did not provide a dependable hardware WebGL device, so this audit does not substitute its renderer for real-device GPU evidence. The JavaScript runtime, combat simulation and deterministic tests completed successfully.
