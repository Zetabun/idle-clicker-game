# Strikewatch Build 12.05 Audit

Audit date: 18 July 2026  
Build: `12.05.0-20260718` — **Dune Bastion Fortress Pass**

## Scope

Build 12.05 upgrades Dune Bastion's asset-free procedural presentation while preserving its 36 × 24, single-floor, left/right-symmetrical competitive layout. The pass adds richer fortress architecture, exterior desert silhouettes, floor patterns, torches and higher-detail mirrored props without changing weapons, AI strength, rewards, economy or progression.

## Dune Bastion release gate

- `duneBastionAuditForTest().ok === true`
- 554/554 open layout cells connected
- one floor; zero stairs; zero doors
- 52 static colliders, all mirrored where applicable
- complete prop/support collision audit with zero issues
- all hotspots and engagement destinations clear and reachable from every spawn
- North Rampart, Central Transit, South Bazaar, West Flank and East Flank route checks all connected
- renderer presentation batches present: 4 canopies, 6 arches, 6 banners, 6 mosaics, 10 rubble clusters, 8 torches, 85 crenellations and 10 exterior backdrop pieces

## Navigation and playability

- `navigationBenchmarkForTest('dune', 160)`: 160 successes, 0 failures
- graph: 500 nodes, 2,832 edges, 1 connected component
- all Citadel, Summit compatibility alias, Office and Dune generic arena route/spawn audits passed
- Free Roam entered Dune Bastion on the ground floor, moved 3.675 map units while remaining collision-clear, changed view direction and exited safely
- tactical minimap: arena `dune`, 310 wall cells, 52 props and 10 operator markers
- deployment preview rendered with non-empty image data

## Compatibility and regression

- career state integrity passed with zero issues
- diagnostic circular-buffer retention passed at the 1,800-event limit
- no page-level JavaScript errors were reported by the headless browser run
- no horizontal document overflow at 320, 375, 390, 402 or 430px portrait, or 844 × 390 landscape
- all modular JavaScript, the generated development bundle and the standalone inline script passed `node --check`
- two consecutive builds produced the same standalone SHA-256:
  `54c424aa8e821a85b96766b40e76f9a9f62b7ee3066d73ae50c44d982b9279ba`

## Visual validation limitation

Headless Chromium in the audit environment could not initialise WebGL, including with software-renderer flags. Renderer batch construction, map data, collision, navigation, minimap, preview and DOM/runtime behavior were validated, but subtle GPU-only presentation issues such as lighting, depth overlap or device-specific clipping should still receive a brief real-device visual check.
