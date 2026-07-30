# Build 12.195 — Combat-Aware Spectator Director

## Scope

AUTO spectating previously rotated through living owned operators every four to seven seconds, even when the current operator was in contact and the next operator was idle. This release replaces that blind timer with a bounded presentation-only director.

## Changes

- Added `SPECTATOR_CAMERA_DIRECTOR`, `spectatorDirectorInterest()` and `spectatorDirectorDecision()` in `js/70-runtime.js`.
- AUTO mode now ranks only state the simulation already computed: visible target, sight candidate, real-shot flash/recoil, incoming-hit presentation, distance, movement, health, reload and weapon-swap state.
- The current view receives a stability bias, ordinary switches require a 3.2-second minimum hold and 18-point margin, live fire can cut in after 1.25 seconds, and an 8.5-second maximum hold permits a near-equal rotation.
- Manual previous/next still disables AUTO immediately. The existing two-second death handoff remains authoritative and unchanged.
- Added `spectatorDirectorForTest()` to verify ranking, hold boundaries and the live-fire exception.

## Behaviour boundaries

The director does not call perception, line-of-sight, pathfinding or combat routines. It does not write bot targets, tactics, movement, health, weapons, match rules, rewards, saves or schemas. It changes only which already-living owned operator supplies the first-person spectator presentation while AUTO is enabled.

## Verification

- `python3 -m py_compile build.py` passes with bytecode directed outside the repository.
- Every modular JavaScript file, generated bundle and standalone inline script parses with Node.
- Source checks confirm the old random 4–7 second round-robin block is absent, the 2-second death handoff is intact and manual controls reset the director.
- `spectatorDirectorForTest()` plus the existing spectator handoff and renderer/combat diagnostics remain present.
- Two builds produce identical outputs and root `cod.html` is byte-identical to the standalone.
