# Build 12.198 — Fixed-Step Match Clock & Stutter Recovery

## Scope

Build 12.197 made perception, tactical decisions and navigation device-independent, but the display loop still capped every rendered frame to 33ms before the match saw it. A 50ms frame therefore advanced only 33ms of simulation, making sustained 20 FPS matches run at roughly two-thirds real-time speed even though their operator intelligence was now fair.

## Changes

- Added `MATCH_CLOCK_POLICY` in `js/70-runtime.js`: a 1/60-second fixed step, eight steps per displayed frame, 500ms bounded debt, a 750ms background-gap threshold and the existing 33ms presentation delta cap.
- The display loop now supplies both capped presentation time and the actual visible frame interval. Management/UI animation remains bounded while match time enters the accumulator without the old 33ms truncation.
- `advanceMatchClock()` conserves normal visible elapsed time, applies 1×/2× speed before stepping, carries bounded debt across short hitches and records overload drops instead of creating an unbounded spiral.
- 60, 30, 20 and 15 FPS all advance exact fixed-step match time at both 1× and 2×. Eight steps are sufficient for 15 FPS at 2×.
- Intervals above 750ms and hidden-page resumes are treated as background gaps. They clear debt and never replay seconds of combat after a locked phone or background tab returns.
- Pausing, resuming, changing speed, starting a round and exiting a match explicitly clear old debt. Match introductions and other non-running states clear through the central update gate.
- Runtime telemetry now exposes debt, steps, catch-up steps, dropped milliseconds and background-gap counts. `matchClockIntegrityForTest()`, `matchClockModelForTest()` and `matchClockForTest()` expose deterministic diagnostics.

## Behaviour boundaries

The 12.197 `SIMULATION_WORK_POLICY` remains unchanged and continues to define intelligence quality. Weapon values, AI decisions, movement, path scoring, line of sight, damage, results, rewards, saves and schemas are unchanged. This release changes only how visible elapsed time is delivered to the existing fixed simulation steps.

## Verification

- `matchClockIntegrityForTest()` proves exact one-second advancement at 60/30/20/15 FPS in 1× and two-second advancement in 2×.
- A 120ms short stutter is conserved without a drop and never exceeds eight steps in one displayed frame.
- A two-second background interval is discarded without catch-up; pause/resume does not replay paused time.
- Source gates verify the old `Math.min(0.033, rawFrameIntervalMs / 1000)` match-time truncation and render-frame simulation loop are absent.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- Existing simulation-quality, spectator, renderer, navigation, arena, persistence and loadout hooks remain present.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
