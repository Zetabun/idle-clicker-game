# Build 12.93 – portrait match HUD above viewport

Build 12.93 moves the portrait windowed-match scoreboard bar and round objective into a dedicated HUD strip above the live viewport. The live game image now starts beneath those two strips, matching the requested mobile mock-up more closely and making the round state easier to read before watching the action.

## What changed
- portrait windowed match view now lays out the scoreboard first
- the round objective now sits directly below the scoreboard
- the playable/observable viewport is wrapped in its own framed stage area below both HUD strips
- the standalone build metadata is updated to 12.93

## Notes
- landscape match layout is unchanged
- portrait console dock, controls, onboarding flow, save schema 19 and diagnostics schema 1 are unchanged
