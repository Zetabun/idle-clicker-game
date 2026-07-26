# Strikewatch Build 12.13 Audit

Audit date: 19 July 2026  
Build: `12.13.0-20260719` — **Tactical Readability & Coaching Pass**

## Goal

Make the existing tactical simulation legible to the manager without turning autonomous matches into direct control or weakening the Build 12.12 AI pacing and team-spacing systems.

## Changes

- Added a deployment preview based on the live arena engagement-plan definition: actual first-round plan, five numbered operator objectives, role/weapon range information, likely contact area and plan-fit warnings.
- Captured `openingPlanId`, name and zone in the tactical plan. Round one now selects that exact plan; later rounds still rotate dynamically or accept between-round changes.
- Added owned-operator live explanation fields for current action, human-readable reason, visible target, current/preferred range, team instruction and route intent, plus a compact portrait line.
- Persisted five owned diagnostic operator summaries into the completed career report.
- Rebuilt post-match coaching as six intent-versus-execution rows, five role-execution cards, a primary result-driver assessment and evidence-based recommendations.
- Coaching buttons open and highlight Tactics, the relevant Training card or the relevant Armoury loadout. They do not auto-apply tactics, allocate points or equip weapons, and victory actions remain queued behind the reward flow.
- Older stored reports without the new row/card structure rebuild the richer analysis when viewed.

## Feature verification

- `tacticalPreviewForTest('dune')`: five lane rows, five distinct objectives, live opening-plan copy and warnings rendered.
- `openingPlanParityForTest('dune')`: round one selected `central-gate`; all five bot opening objectives matched the deployment preview.
- `liveDecisionExplanationForTest()`: action, reason, range, instruction and route matched the viewed owned bot and the portrait summary populated.
- `tacticalCoachingAnalysisForTest()`: six intent rows, five player cards and working Tactics/Training/Loadout recommendation routes.
- `tacticalCoachingDestinationForTest()` found and opened all three management targets.
- A forced three-round match completed 3–0 with five persisted operator summaries, six stored intent rows, five stored role reviews and no runtime faults.
- Portrait deployment and report inspection at 402 × 874 showed contained content, an internal scroll region, five visible lane records in sequence and eight coaching buttons in the completed report.

## Retained regression verification

- AI work budget: four broad scans and four ordinary tactical decisions at Full quality, resetting per rendered frame.
- Combat route budget: 18 candidates, one navigation-plan use and one A* search.
- Team spacing separated a deliberate cluster and retained `Grouped < Trade < Hold < Flank` gaps.
- Staggered acquisition, close-threat retargeting, friendly-body occlusion and operator line blocking passed.
- Procedural animation/LOD/reload feature audit passed.
- Runtime quality profiles and downgrade/recovery governor passed.
- Dune and Office engagement plans passed; Dune navigation completed 160/160 routes with zero failures, 494 nodes, 2,752 edges and one component.
- Office courtyard, door-pocket, furniture, screen and walkway audits passed.
- State integrity passed with zero issues; runtime faults and browser exceptions remained empty.
- Headless Chromium did not provide WebGL, so corpse-presentation and first-elimination rendering helpers correctly reported renderer unavailable. Their retained source logic was not changed in 12.13.
- Page width remained contained at 320, 375, 390, 402 and 430 CSS pixels plus 844 × 390 landscape.

## Compatibility

Career save schema remains 17 and diagnostics schema remains 1. No weapon, health, damage, movement-speed, economy, reward, progression, opponent-strength or result-selection value changed.

## Release requirements

- Modular, generated-bundle and standalone JavaScript syntax must pass.
- Two consecutive builds must be byte-identical.
- The packaged ZIP must pass integrity checking and rebuild to identical generated output after fresh extraction.

## Deterministic generated output

Two consecutive builds produced byte-identical output:

- `js/strikewatch.dev.js`: `c7aac54aabcad69c9d17303593112c327131f62dae7d30a224229fb6aa140e09`
- `dist/strikewatch-build-12.13.html`: `e63af105523c7350cb9287f15bcb6cbcd65d874dcd166b6b4a9fb35fbd68e7a3`
