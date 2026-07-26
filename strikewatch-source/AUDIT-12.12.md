# Strikewatch Build 12.12 Audit

Audit date: 18 July 2026  
Build: `12.12.0-20260718` — **AI Pacing & Team Spacing Pass**

## Trigger

A completed real-device Build 12.11 diagnostic showed stable combat and no runtime faults, but retained short AI simulation spikes up to 115 ms, 389 path changes across three rounds and repeated five-operator occupancy/blocked firing lanes. Operators visually collapsed into shared routes and destinations even when the selected tactic did not require a tight stack.

## Root causes

- Combat approach/flank recovery scored many candidate positions by running a complete A* path search for each candidate, bypassing the intended navigation-plan pacing and concentrating expensive work in one update.
- Perception/tactical work limits were not shared across all fixed updates inside one rendered frame.
- Regroup/follow destinations and dynamic-goal crowding considered some teammate positions but did not consistently reserve distinct role/tactic-aware lanes or threat angles.

## Corrections

- Added per-rendered-frame perception and tactical work budgets scaled by the reversible runtime quality tier.
- Preserved per-frame current-target and pending-candidate visibility/reaction truth.
- Replaced per-candidate combat-route A* with cheap bounded candidate scoring and at most one shared, budgeted path search.
- Added role-, engagement- and priority-aware spacing profiles, deterministic formation offsets and collision-tested local separation.
- Expanded dynamic goal/traffic crowding to include active and reserved goals, next waypoints and duplicate firing angles.
- Added diagnostic counters for AI deferrals, route-search work and spacing/lane corrections.

## Verification

- Modular, generated-bundle and standalone JavaScript syntax checks passed.
- `botWorkBudgetForTest()` enforced the Full-tier four-scan/four-tactical budget and reset cleanly on the following rendered frame.
- `combatRouteBudgetForTest()` produced a valid route with one navigation-plan consumption and one A* search.
- `teamSpacingForTest()` separated a deliberately clustered team and confirmed Stay Grouped remained tighter than Trade while maintaining a non-overlap floor.
- Staggered target acquisition, close-threat retargeting, friendly-body occlusion and operator line-blocking checks passed.
- A five-round Dune simulation completed 3–2 with 33 paired elimination/death events, no runtime faults, tactical flanks and active spacing corrections. In the headless simulation, path-change frequency was materially lower than the prior real-device diagnostic; this is not a substitute for a new real-device performance export.
- Dune arena/engagement audits passed and the navigation benchmark completed 160/160 routes with zero failures and one 494-node/2,752-edge component.
- Retained Office arena, engagement, courtyard, door-pocket, screen, furniture and walkway audits passed.
- Page width remained contained at 320, 375, 390, 402 and 430 CSS pixels plus 844 × 390 landscape.
- Corpse/first-elimination WebGL presentation helpers could not execute in the headless environment because WebGL was unavailable; runtime-fault capture remained empty and the retained source logic was unchanged.

## Compatibility

Career save schema remains 17 and diagnostics schema remains 1. No weapon, health, damage, movement-speed, economy, reward, progression, opponent-strength or result-selection value changed.

## Deterministic release output

Rebuilding twice produced byte-identical output:

- `js/strikewatch.dev.js`: `a746fb5dc29cb4e2bbdd46394ce7a3e2546a81eaa834d3a13e9e160c3a852d7e`
- `dist/strikewatch-build-12.12.html`: `0f1ef020befed8b2d1fbd9e663bd8a5a28b25d97d4b71425972143adfce90407`
