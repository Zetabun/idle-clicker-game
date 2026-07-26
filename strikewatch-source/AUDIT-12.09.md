# Strikewatch 12.09 Audit — Match Intelligence & Motion Pass

## Scope

Build 12.09 deepens operator decision stability and animation while adding measured, reversible optimisation for older phones. All supplied Markdown files were read before source edits.

## Implemented

### Calmer, more deliberate operators

- The current target's visibility is still validated every simulation frame. Only broad scans for alternative targets are staggered.
- New target commitment and switch hysteresis prevent minor priority-score changes from producing rapid target swaps. A genuinely immediate close threat can still override the commitment.
- Tactical states now have mode-specific minimum commitment windows, so operators hold a push, angle, fallback, cover or reposition decision long enough to read as intentional.
- Useful paths receive a short lease. Small changes to a moving goal reuse the current route instead of rebuilding it immediately.
- Dynamic combat goals are resolved against walkability, local clearance and team-mate reservations before the single bounded A* request.
- Failed-goal cooldowns, urgent route exceptions and existing recovery escalation remain intact.

### More natural movement and combat animation

- Added smoothed turn anticipation so the body begins to organise around direction changes instead of rotating as one rigid unit.
- Added foot-plant weighting to reduce the appearance of sliding during acceleration, braking and weapon movement.
- Added locomotion/body lean that responds to movement and turning without changing collision or movement truth.
- Added subtle breathing and aim-stability motion, weighted down while moving and firing.
- Existing two-bone legs, shoulder switching, corner readiness, hit reactions, reload phases and death phases remain authoritative.

### Broad-device optimisation

- Added a non-persistent `FULL` / `BALANCED` / `CONSTRAINED` runtime quality governor driven by sustained measured frame, update and render pressure.
- The governor coordinates broad perception cadence, navigation-plan budgets, distant operator/weapon detail and adaptive render resolution.
- The governor never changes weapon values, movement speed, health, line-of-sight truth, tactical weights, collision or match results.
- Clearly constrained hardware may start conservatively; other devices start at full quality and only step down after sustained measured pressure.
- Quality can recover after a sustained healthy period.
- Distant and constrained operators omit small equipment surfaces and non-essential weapon fittings before any core silhouette geometry is reduced.
- Removed a per-weapon-render `Set` allocation so LOD filtering does not create avoidable frame garbage.
- Diagnostics and the debug API report active quality tier and label.

## Automated results

### Source and release integrity

- Every modular JavaScript source file: `node --check` passed.
- Generated `js/strikewatch.dev.js`: `node --check` passed.
- Standalone inline JavaScript extracted from `dist/strikewatch-build-12.09.html`: `node --check` passed.
- Runtime build ID: `12.09.0-20260718`.
- Runtime title: `Strikewatch 12.09: MATCH INTELLIGENCE & MOTION PASS`.
- Browser runtime exceptions: none recorded.

### AI, navigation and map regressions

- `stateIntegrityForTest()`: passed with zero issues.
- `duneBastionAuditForTest()`: passed.
- `duneDeploymentPreviewForTest()`: passed.
- `arenaAuditForTest('dune')`: passed.
- `engagementPlanAuditForTest('dune')`: passed.
- `navigationBenchmarkForTest('dune', 160)`: 160 successes, 0 failures, one connected 494-node / 2,752-edge graph.
- `navigationGoalRecoveryForTest('dune')`: passed with zero path failures.
- `operatorViewOcclusionForTest()`: passed.
- `operatorLineBlockerForTest()`: passed.

### Motion and quality regressions

- `operatorAnimationAuditForTest()` confirms smoothed movement/aim angles, visual acceleration, strafing/backpedalling, shoulder switching, corner readiness, turn anticipation, foot-plant weighting, breathing/aim stability and distance-based LOD.
- `runtimeQualityGovernorForTest(34, 12, 16, 70)` stepped from `FULL` to `BALANCED`, capped the render target at `0.94`, and restored the original runtime state after the test.
- `runtimeQualityProfileForTest()` confirmed:
  - constrained planning budget: 1 ordinary / 2 urgent plans per frame;
  - balanced planning budget: 2 ordinary / 2 urgent;
  - full planning budget: 2 ordinary / 3 urgent;
  - tier-specific perception intervals and near/medium/far operator detail levels.
- The deterministic presentation hook reports shared living/corpse geometry, unchanged collision and hit detection, zero added body draw calls, and active distance/constrained detail reduction.

### Responsive layout

The standalone build was injected at 320, 375, 390, 402 and 430 CSS-pixel portrait widths plus 844 × 390 landscape. Document and body scroll widths remained bounded to the viewport at every size. The subsection strip remains an intentional local horizontal scroller rather than causing page-level overflow.

## Runtime limitation

The available headless Chromium environment did not expose a working WebGL device, so it was not used to claim real GPU frame-rate results. Bootstrap, debug/runtime execution, generated-build integrity, layout and deterministic simulation audits all completed without unrelated JavaScript exceptions. Real-device diagnostics remain the authority for GPU performance, and Build 12.09 now adapts from measured device pressure instead of assuming one flagship phone represents the audience.
