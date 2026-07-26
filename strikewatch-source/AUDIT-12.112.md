# Build 12.112 – Visible version header

## Scope

Make the active playable version easy to identify from the management interface and establish a permanent release rule that prevents future GPT-authored versions from shipping with stale visible header metadata.

## Implementation

- Established the GitHub repository plan: root `cod.html` is the deployable release, `strikewatch-source/` is the complete source/documentation authority, and unrelated or retired repository files live under `other/`.
- Added `BUILD <version>` to the desktop management header.
- Added the same build identity to the mobile current-page bar, which appears when the player taps the existing `?` Help control.
- Kept both runtime labels synchronised with `BUILD_VERSION` in `js/00-core.js`.
- Updated the source document title, CSS and JavaScript asset query strings and main-menu build stamp.
- Added `build.py` validation that rejects desktop or mobile source labels that do not match `BUILD_VERSION`.
- Added `buildVersionHeaderForTest()` to verify both labels, the document build dataset and the public build ID from one diagnostic.
- Added the permanent numbered-release requirement to `AGENTS.md`, `00-READ-FIRST-GPT.md`, `PROJECT.md`, `README.md`, `DOCUMENTATION-INDEX.md` and `GPT-HANDOFF-PROMPT.txt`.

## Boundaries

- The mobile Help toggle and current-page navigation behaviour are unchanged.
- No match simulation, operator rendering, map presentation, collision, AI, combat, economy, progression or persistence value changed.
- Save schema remains 19 and diagnostics schema remains 1.

## Verification

- Desktop at 1280px and the 1024px desktop boundary showed `BUILD 12.112` in the management header with zero document overflow.
- Mobile Help-off/Help-on behaviour passed at 320, 375, 390 and 430px portrait widths plus 844 × 390 landscape. The current-page bar stayed hidden before activation, appeared after the `?` control was pressed, displayed `BUILD 12.112`, remained within the viewport and produced zero document overflow.
- `build.py` accepted the matching static labels and generated `js/strikewatch.dev.js` plus `dist/strikewatch-build-12.112.html`.
- Every modular source file, the generated development bundle and the standalone inline script parsed successfully.
- Two consecutive builds produced identical bundle and standalone SHA-256 hashes.
- The retained release audit passed Citadel Depot, Skyline Offices and Dune Bastion geometry, Citadel route connectivity, spawn clearance and career-state integrity with no runtime faults.
- The retained operator audit passed head, body, skin, weapon-attachment and all nine living/corpse presentation samples with zero additional body draw calls and no runtime faults.
- The collision broad phase matched all 165,888 brute-force samples with zero mismatches.
