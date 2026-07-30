# Build 12.197 — Device-Independent Match Simulation

## Scope

The adaptive runtime tier previously controlled both presentation cost and match intelligence. Under frame pressure, Constrained mode increased perception intervals, reduced perception/tactical work from 4/4 to 2/2 and reduced normal navigation plans from two to one per rendered frame. Because those counters reset from the display loop, device refresh rate and thermal performance could change operator awareness and routing opportunities.

## Changes

- Added the fixed `SIMULATION_WORK_POLICY` in `js/00-core.js`: 1/60-second simulation windows, 45ms combat perception, 68ms idle perception, four perception scans, four tactical decisions, two normal route plans and three urgent route plans per window.
- `runtimeQualityTier` remains adaptive but is now render-only. It still controls operator LOD and resolution floors; it no longer enters perception, tactical or navigation policy.
- Added `simulationWorkWindowIndexForTime()`, `beginSimulationWorkWindow()` and `resetSimulationWorkWindow()`. Work budgets reset from `simulationClock`, not `requestAnimationFrame` frequency.
- `updateMatchStep()` opens the relevant simulation-time window before advancing the match. Low-refresh frames are split into 1/60-second substeps, the display-loop reset was removed, and round starts explicitly invalidate the prior work window.
- `js/30-bot-ai.js` and `js/20-navigation.js` consume only the fixed policy. Their snapshots report the current simulation window, policy revision and render tier separately.
- Added `simulationQualityIndependenceForTest()` plus `simulationWorkPolicyForTest()`. The legacy `runtimeQualityProfileForTest()` now routes to the independence diagnostic.

## Behaviour boundaries

The former Full-tier perception, tactical and navigation throughput becomes the one match policy on every device. Weapon values, player statistics, tactics, movement rules, path scoring, line of sight, damage, rewards, saves and schemas are unchanged. Slow devices may still lower resolution and model detail, and the existing rendered-frame delta cap may slow wall-clock match progress rather than skipping simulation work.

## Verification

- The independence diagnostic proves all three render tiers expose identical perception, tactical and navigation policy while operator detail remains tier-sensitive.
- Source gates prove `runtimeQualityTier` is absent from perception, bot-budget and route-budget decision functions.
- The simulation window is opened only from `updateMatchStep()`, substeps are capped at 1/60 second and the old display-frame budget reset is absent.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- Existing spectator, renderer, navigation, arena, persistence and loadout hooks remain present.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
