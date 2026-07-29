# Strikewatch 12.161 — Recovery & Readability audit

## Scope

Build 12.161 works through the actionable 12.160 whole-game audit backlog, prioritising the release-blocking returning-career migration defect and the highest-impact compact UI/accessibility problems. Gameplay balance, operator rendering, arenas and economy rules are intentionally unchanged.

## Completed fixes

- **SW-001 / SW-025:** `81-career-indexeddb.js` now initialises immediately after `35-career.js`, before finance modules can invoke a save. This removes the returning-career temporal-dead-zone crash during the foundation-loan migration.
- **SW-011 / SW-012 / SW-013:** browser pinch zoom is restored; compact body, metadata and decision-support type floors are enforced; touch controls use a 44px minimum hit area with targeted `touch-action: manipulation`.
- **SW-007 / SW-008 / SW-009 / SW-010:** global controls wrap rather than clip, 1024–1100px receives an intermediate shell, and mail/loadout metadata wraps at narrow widths.
- **SW-014 / SW-015 / SW-016:** portrait objective/operator/loadout text can wrap; landscape commentary is bounded and scrollable; between-round content has a bounded scrolling body and sticky decision footer with compact type floors.
- **SW-004 / SW-005 / SW-006:** onboarding copy and actions receive compact readability and sticky-action treatment; numbered first-step cards use a stable grid; repeated guidance occupies less first-viewport space.
- **SW-021 / SW-022:** generated files use LF deterministically and concise release documents are updated together.
- **SW-023 / SW-024:** scoreboard telemetry no longer navigates or mutates selected operator state.

## Engineering-health items

SW-017 through SW-020 are incremental architecture programmes rather than safe one-release rewrites. This build adds guardrails and avoids increasing route or renderer work, but it does not claim real-device frame-time, battery or thermal acceptance without physical-device measurement. Static batching and single-live-rig work from 12.154–12.155 remain intact. CSS consolidation should continue component by component behind screenshot and geometry gates rather than by deleting historical overrides wholesale.

## Verification gates

- Build twice and compare generated standalone hashes.
- Parse the generated bundle with Node.
- Confirm source module order places IndexedDB durability before finance modules.
- Confirm viewport permits user scaling.
- Confirm current version/build ID across source, HTML and concise documentation.
- Confirm root `cod.html` is byte-identical to the verified standalone.
