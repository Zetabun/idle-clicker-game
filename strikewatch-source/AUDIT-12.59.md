# Strikewatch Build 12.59 Audit — First Match Onboarding Refinement

## Scope and preparation

All 59 Markdown files supplied in the Build 12.58 source package were enumerated and read before source modification. This audit is the 60th Markdown file in the updated source tree.

Build 12.59 improves the first-career onboarding presentation while retaining the established gameplay and persistence authorities. Save schema 19 and diagnostics schema 1 are unchanged. No historical audit was rewritten.

## Implementation

### Club creation

- Replaced the repeated long-form opening explanation with a concise three-step first-15-minute path.
- Suppressed the global required-action strip before a club exists because the entire page is already the required creation interface.
- Moved **Create Team & Begin Orientation** before optional emblem customisation.
- Added compact desktop treatment so the creation action remains reachable at the supported 1024 × 768 baseline.

### First Match Journey

- Preserved all nine internal `firstMatchGuidance()` states and their existing completion authorities.
- Grouped them into six visible milestones: Build Active Five, Review Line-up, Prepare Team, Watch Match, Review Match and Improve Team.
- Added milestone and substep progress without saving a second checklist or completion counter.

### Focused opening Recruitment

- Added a transient focused mode only before the first completed match, with fewer than five contracted operators and during the guide's recruitment sequence.
- Selects six deterministic candidates from the real market using affordability, current Active Five needs and role diversity.
- Places recommended candidates and ordinary comparison/signing actions ahead of long-term department detail.
- Keeps Active Five needs and the role guide available as supporting context; the role guide begins collapsed in focused mode.
- Keeps the complete 18-player market, scouting pools, market movement, searches and department tools available through **Show All Candidates & Advanced Tools**.
- Saves no beginner-mode, shortlist, unlock or expanded-view field.
- Adds a derived **Active Five N / 5** signing completion banner after each opening signing.

### Orientation semantics

- Hides the skip action after the one-round demo has already completed.
- Retains the normal skip path while orientation is active or incomplete.

### Responsive correction found during regression

- At the narrow 1024-pixel desktop baseline, the Supply Depot ledger header could force paragraph overflow. The compact ledger header now uses one column at that width.

## Authority and compatibility

The following remain unchanged:

- nine-step first-match state and route authority;
- ordinary player market, dynamic listings and rival activity;
- scouting, comparison, reporting, shortlisting, negotiation and signing rules;
- transfer fees, wages, affordability and squad limits;
- progressive route locks and the guided active-negotiation exception;
- calendar, training, match, AI, renderer, weapon, armour and economy behaviour;
- Build 12.58 desktop shell and established sub-1024 mobile shell;
- save schema 19 and diagnostics schema 1.

## Verification

The final verification pass covers:

- modular, generated bundle and standalone inline JavaScript syntax;
- Python build-script compilation;
- onboarding clarity, new-player orientation, first-match guidance, recruitment role guide, recruitment decision support, guidance consolidation, progressive interface, typography and state integrity diagnostics;
- a real club-creation → orientation skip → focused Recruitment browser click-through;
- six focused candidates and the one-click 18-candidate advanced market;
- completed-demo skip-button semantics;
- mobile containment and desktop creation/recruitment presentation;
- every management route at 1024 × 768, 1366 × 768 and 1920 × 1080;
- deterministic consecutive build parity;
- source-package content and ZIP integrity.

### Final results

- All nine targeted deterministic diagnostics returned `ok: true`: onboarding clarity, new-player orientation, first-match guidance, recruitment role guide, recruitment decision support, guidance consolidation, progressive interface, typography consistency and state integrity.
- A real browser click-through created a club, skipped the optional orientation and reached focused Recruitment with exactly six candidate rows, no advanced toolbar, the First Match Journey at milestone 1/6 and the first candidate visible in the initial 1440 × 900 viewport.
- The advanced-tools control restored all 18 market candidates, the Recruitment toolbar and the player search pool; returning to the guided shortlist remained available.
- Creation and focused Recruitment produced zero document horizontal overflow at 1024 × 768, 1366 × 768, 1440 × 900, 1920 × 1080, 430 × 932, 390 × 844 and 844 × 390. The create action was fully visible without scrolling at every supported desktop viewport, including 1024 × 768. On phone and mobile-landscape sizes the established scrollable management layout remained intact.
- All 24 management routes were audited at 1024 × 768, 1366 × 768 and 1920 × 1080: 72 route/viewport combinations, zero document or content horizontal overflow, zero unintended horizontal window scroll and zero visible controls below the audit floor.
- Browser execution produced zero page exceptions and zero non-WebGL console errors.
- Every modular JavaScript source file, the generated development bundle and the standalone inline script passed `node --check`. `build.py` passed Python byte-compilation.
- Two consecutive production builds were byte-identical. Final SHA-256 values: `f249aa56c6f03392ca4dbe27ba825fe0ec48ab07c4337b1755a8bb0c90eeabd7` for `js/strikewatch.dev.js` and `7e4f16451a6bd3a10ce0ce9956c1e00625941916f9a584795bd8724275822772` for `dist/strikewatch-build-12.59.html`.
- The final source tree contains 60 Markdown files, with all current authority documents and the handoff contract updated for Build 12.59. Temporary screenshots, browser reports, caches and extraction directories are excluded from the release package.
- `Strikewatch-Source-12.59-First-Match-Onboarding-Refinement.zip` passed a complete `unzip -t` integrity check with no compressed-data errors.

## Environment limitation

The available headless Chromium environment does not expose a WebGL context. The onboarding DOM, responsive presentation, state transitions, controls, diagnostics and route behaviour can therefore be exercised directly, while the live arena's rendered pixels cannot be visually judged in that browser. Build 12.59 makes no renderer or live-match gameplay changes; renderer source and retained deterministic checks remain part of the syntax/regression pass.
