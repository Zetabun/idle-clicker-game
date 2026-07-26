# Strikewatch Build 12.11 Audit

Audit date: 18 July 2026  
Build: `12.11.0-20260718` — **First Elimination Stability Hotfix**

## Trigger

A real-device Build 12.10 diagnostic export stopped at simulation time 17.243 seconds immediately after the first `elimination` event. The page remained responsive enough to export, but no later performance frames, snapshots or the normal paired `eliminated` event were recorded.

## Root cause

Build 12.09 added distance-based corpse detail conditions inside `drawCorpse()`, but `fullDetail` was declared only inside `drawSoldier()`. The first nearby corpse entered a full-detail headset/strap branch, raised `ReferenceError: fullDetail is not defined`, and terminated the requestAnimationFrame callback before it could queue another frame.

## Correction

- Derive `mediumDetail` and `fullDetail` locally inside `drawCorpse()`.
- Validate all corpse poses at near, medium and distant LOD.
- Wrap update/audio/render/performance frame phases in bounded runtime-fault capture.
- Always request the next animation frame in `finally`.
- Include optional runtime-fault snapshots in diagnostic schema-1 exports.

## Verification

- Modular and generated JavaScript syntax checks passed.
- Mock-WebGL `corpsePresentationForTest()` rendered 9/9 pose-distance combinations without error.
- `firstEliminationContinuityForTest()` completed one elimination and a full scene render without a runtime fault.
- A 60-second Dune simulation produced nine `elimination` and nine paired `eliminated` events, with no runtime faults or page errors.
- A deliberately injected synthetic render exception was captured as a render-phase runtime fault while subsequent frames continued.
- Build 12.10 target acquisition, Build 12.09 quality/animation/navigation, Dune routing and retained state checks remain required.

## Compatibility

Career save schema remains 17. Diagnostics schema remains 1. No weapon, health, damage, economy, reward, progression, map geometry or AI-strength value changed.

## Final release regression

- The complete Build 12.10 perception hotfix remained active: staggered acquisition, close-threat retargeting and friendly-body occlusion all passed.
- Operator animation, runtime quality-governor and state-integrity audits passed.
- Dune Bastion arena and engagement-plan audits passed.
- Dune navigation benchmark completed 160/160 routes with zero failures and one connected component.
- All retained Office audits passed: arena, engagement plans, courtyard rotation, wall display placement, door pockets, screen placement, door placement, furniture clearance and walkway clearance.
- Responsive page width remained contained at 320, 375, 390, 402 and 430 CSS pixels in portrait, plus 844 x 390 landscape, with no page-level horizontal overflow.
- Rebuilding twice was deterministic:
  - `js/strikewatch.dev.js`: `42097140979717a3c5ab5bbac066afb73cd4e73bae3647edfb21a7ca8f8f9317`
  - `dist/strikewatch-build-12.11.html`: `428f0bd95ad6bc8e54187105b7a040a56227b072c23d634bac5f737392b25b38`
