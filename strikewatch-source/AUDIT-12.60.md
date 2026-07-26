# Strikewatch Build 12.60 Audit — Desktop Readability Pass

## Scope and preparation

Build 12.60 responds to the reported desktop readability problem in the Command Centre, where objective descriptions, manager-priority metadata and Command Index copy still used phone-scale typography on large PC displays.

All 60 existing Markdown files in the Build 12.59 source package were reviewed before implementation. This audit is the 61st Markdown file in the Build 12.60 package. Current authority documents and the reusable handoff contract were updated; historical audits remain unchanged.

## Implementation

### Desktop-only typography authority

The final `@media (min-width: 1024px)` layer in `css/game.css` now defines four bounded scalable typography tokens:

- `--desktop-type-micro`
- `--desktop-type-label`
- `--desktop-type-small`
- `--desktop-type-body`

These values establish separate desktop baselines for micro labels, labels, supporting copy and ordinary body text. They scale modestly from the supported 1024-pixel baseline through wide desktop viewports without stretching the overall layout.

### Command Centre readability

The following desktop presentation received targeted increases in font size, line-height and spacing:

- Active Club Objectives titles, descriptions, counters and route actions;
- Manager Priority Queue titles, explanations and status metadata;
- Recent League Form and supporting momentum copy;
- Command Index search field, group headings, page summaries and locked-page explanations;
- topbar and sidebar supporting labels.

Objective and action rows now have slightly more vertical breathing room. Disabled and locked destinations retain stronger contrast while remaining clearly inactive.

### Retained management modules

A second component-specific pass raises legacy phone-scale labels that survived inside Calendar, Reports, Telemetry, Opening Week, Training, Staff, Gold, Supporters, Commercial, Supply Depot and related desktop cards. These remain subordinate to primary headings, but no longer depend on extremely small text or very low opacity for hierarchy.

### Diagnostics

`typographyConsistencyForTest()` now checks:

- the desktop secondary-copy floor;
- Command Centre objective title and description sizes;
- Command Index supporting-copy size;
- the retained shared typography checks.

No second presentation or route authority was introduced.

## Compatibility

This release changes presentation only.

- The Build 12.59 first-match onboarding flow is unchanged.
- The Build 12.58 desktop layout structure is unchanged.
- All rules added for this pass are isolated to `min-width: 1024px`.
- Targeted computed-style comparison at 430×932 confirmed the sampled mobile objective, directory and navigation typography is byte-for-byte equivalent in computed values between Builds 12.59 and 12.60.
- Gameplay, renderer, maps, AI, economy, progression, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Verification

### Visual and computed typography

The user-reported Command Centre state was recreated with an empty Active Five and the Command Index filtered to “training”. The revised desktop presentation was visually reviewed against the Build 12.59 baseline.

Measured target sizes:

| Element | 1024×768 | 1992×1078 |
|---|---:|---:|
| Objective/action title | 11.5px | 13px |
| Objective/action description | 10.75px | 12.25px |
| Command-directory heading | 11.5px | 13px |
| Command-directory supporting copy | 10.75px | 12.25px |

At 430×932, the same sampled mobile values remain at their Build 12.59 sizes, including 10px objective titles and 9px objective descriptions.

### Route and viewport matrix

All 24 management routes were audited at five viewports:

- 1024×768
- 1366×768
- 1992×1078
- 430×932 portrait
- 844×390 mobile landscape

Across 120 route/viewport cases:

- 0 hard failures;
- 0 JavaScript page-error cases;
- 0 document, body or content horizontal-overflow cases;
- 0 visible text-clipping cases;
- 0 undersized desktop-control cases;
- 0 `typographyConsistencyForTest()` failures.

### Retained diagnostics

The following deterministic checks passed in the generated standalone release:

- `typographyConsistencyForTest()`
- `onboardingClarityForTest()`
- `newPlayerOrientationForTest()`
- `firstMatchGuidanceForTest()`
- `recruitmentRoleGuideForTest()`
- `recruitmentDecisionSupportForTest()`
- `stateIntegrityForTest()`

No browser page errors were raised during the diagnostic pass.

### Build and packaging

- `python3 -m py_compile build.py` passed.
- Every modular JavaScript file passed `node --check`.
- The generated development bundle passed `node --check`.
- The extracted standalone inline application script passed `node --check`.
- Two consecutive production builds produced identical SHA-256 hashes for both the development bundle and standalone release.
- The final source archive passed ZIP integrity testing.

## Environment limitation

The available headless Chromium environment does not expose WebGL. The management UI, routing, responsive geometry, computed styles and diagnostics were tested, but rendered arena pixels were not visually inspected in that environment. Build 12.60 does not modify the renderer, arena geometry, operator models or match gameplay.
