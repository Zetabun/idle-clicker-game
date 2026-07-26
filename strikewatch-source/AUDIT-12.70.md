# Strikewatch Build 12.70 Audit

## Release

- **Build:** 12.70 — FM Interface & Recruitment Clarity
- **Build ID:** `12.70.0-fm-interface-recruitment-clarity`
- **Source:** `strikewatch-source-12.70/`
- **Standalone:** `dist/strikewatch-build-12.70.html`
- **Save schema:** 19, unchanged
- **Diagnostics schema:** 1, unchanged

## Scope

This release reconciles a user-edited standalone-style `index.html` back into the maintainable modular source project. The edited HTML was treated as the visual source of truth for this task. Its two CSS changes introduce a navy, pitch-green and gold management theme plus a clearer mobile Recruitment candidate layout.

The edited HTML's embedded JavaScript was byte-equivalent to the supplied generated development bundle. No JavaScript, gameplay, save data, recruitment values, transfer logic, tactical effects, match simulation, combat or economy required reconciliation.

## Source reconciliation

- Extracted the complete edited `<style>` block into `css/game.css` without dropping either edited CSS hunk.
- Restored `index.html` to versioned external references for `css/game.css` and `js/strikewatch.dev.js`.
- Preserved all document markup from the edited HTML.
- Kept `js/strikewatch.dev.js` generated from the modular JavaScript files rather than editing it directly.
- Updated release metadata and generated output naming to Build 12.70.
- Retained Build 12.69 guided navigation and destination-specific advice routing unchanged.

## Visual changes

- Added the boardroom-style navy/pitch-green/gold palette and flatter management panels, navigation rows and data tables.
- Improved mobile Recruitment cards so candidate identity spans the card width and rating, confidence and actions are easier to distinguish.
- Kept mobile action controls at 44 CSS pixels and desktop actions at 40 CSS pixels in the tested Recruitment states.
- Retained the existing responsive breakpoints and source ownership boundaries.

## Automated source and build verification

- `build.py` passed Python bytecode compilation.
- Every modular JavaScript file passed `node --check`.
- Generated `js/strikewatch.dev.js` passed `node --check`.
- Inline JavaScript extracted from `dist/strikewatch-build-12.70.html` passed `node --check`.
- The edited HTML's embedded JavaScript matched the supplied generated bundle before reconciliation.
- The edited HTML's complete CSS block became the modular `css/game.css` authority.
- Two consecutive builds produced identical SHA-256 hashes:
  - `js/strikewatch.dev.js`: `aa141ea729766bbce5e9537a071cf23eaa4551275458282c037701b3f0cfc1f8`
  - `dist/strikewatch-build-12.70.html`: `8a07051141c5c3b3c0c91117d0c656ff4dec90729745e836c948e0e8b9f320f6`
  - `css/game.css`: `a9ed405aca0dd5b99ada172ba14a760983ac8aac1d9b8d3a23312a3bd507cd8d`
  - `index.html`: `8ebccdec056167e6ca030f1f05150064572feb3d0fc6ab9192f96fd6c3fcf7e7`

## Browser verification

The generated standalone release was exercised in headless Chromium at five supported viewports:

| Viewport | State integrity | Typography | First-match guidance | Recruitment role guide | Recruitment decision support | Horizontal overflow | Page errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 390 × 844 portrait | Pass | Pass | Pass | Pass | Pass | 0 px | 0 |
| 430 × 932 portrait | Pass | Pass | Pass | Pass | Pass | 0 px | 0 |
| 844 × 390 compact landscape | Pass | Pass | Pass | Pass | Pass | 0 px | 0 |
| 1024 × 768 desktop | Pass | Pass | Pass | Pass | Pass | 0 px | 0 |
| 1366 × 768 desktop | Pass | Pass | Pass | Pass | Pass | 0 px | 0 |

Recruitment cards remained inside the management viewport at each size. The first action button measured 44 CSS pixels on mobile/compact landscape and 40 CSS pixels on desktop. The runtime fault diagnostic returned no faults.

## Second-pass review

A second pass confirmed:

- source `index.html` contains neither the full CSS block nor the generated JavaScript bundle;
- the standalone release contains both assets inline as intended;
- release metadata is aligned across `index.html`, `js/00-core.js`, build output and current documentation;
- no document-level horizontal overflow appears in the tested viewports;
- the current theme and mobile Recruitment layout are present in both source development mode and the generated standalone release; and
- Build 12.69 gameplay/navigation code was not modified.

## Test limitation

Automated browser verification covers layout, diagnostics and rendered screenshots. It does not replace a final subjective touch-feel pass on physical mobile hardware or a complete multi-season playthrough.
