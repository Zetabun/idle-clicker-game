# Strikewatch Build 12.06 Audit

Build 12.06 is a targeted Dune Bastion prop-alignment correction based on the supplied Free Roam inspection at Central Gate (`x 13.426`, `z 9.581`, angle `-3.1547`, pitch `0.19`).

## Corrections verified

- All eight Dune wall braziers are now authored on real masonry faces.
- Each brazier has wall material behind its anchor, open space in front and a visible mounting plate/bracket.
- The brazier visible from the supplied Central Gate position no longer appears as an isolated floating flame.
- The mirrored courtyard crate stacks moved from `(5.4, 13.7)` / `(30.6, 13.7)` to `(6.0, 13.9)` / `(30.0, 13.9)` so they no longer intersect canopy posts.
- `duneBastionAuditForTest()` now exposes `allTorchesWallMounted`, `torchAnchors`, `canopySupportsClear` and `supportOverlaps`.

## Targeted map and navigation results

- `duneBastionAuditForTest().ok === true`
- Eight of eight brazier anchors: wall-backed and front-clear
- `canopySupportsClear === true`
- `supportOverlaps.length === 0`
- 52 expected/static colliders; zero collision-audit issues
- 554/554 open layout cells connected
- Live navigation graph: 494 nodes, 2,792 edges, one component
- `navigationBenchmarkForTest('dune', 160)`: 160 successes, zero failures
- All five principal route bands connected
- All spawns, hotspots and engagement destinations clear and reachable
- `arenaAuditForTest('dune')` and `engagementPlanAuditForTest('dune')` pass
- Dune deployment preview renders non-empty image data
- Free Roam can stand and navigate at the supplied Central Gate coordinates

## Second-pass regression results

- Citadel, Office and Dune generic arena route/spawn audits pass.
- Citadel, Office and Dune engagement-plan audits pass.
- Office furniture clearance, walkway, door-pocket and courtyard-rotation audits pass.
- State integrity and diagnostic event-retention audits pass.
- Headed Chromium under Xvfb exposed WebGL successfully and logged no page or console errors.
- Visual regression screenshots were taken at the supplied Central Gate position and beside the corrected west canopy/crate cluster.
- No document-level horizontal overflow at 320×690, 375×760, 390×844, 430×932 or 844×390 in menu or Free Roam.
- Development bundle and standalone inline JavaScript pass `node --check`.
- Deterministic rebuild and final ZIP integrity are required before packaging.

Career save schema remains 17 and diagnostics schema remains 1. No weapon, AI-strength, economy, reward or progression values changed.
