# Strikewatch Build 12.71 Audit

## Release identity

- **Build:** 12.71 — Compact Recruitment & Comparison Tray
- **Build ID:** `12.71.0-compact-recruitment-comparison-tray`
- **Source:** `strikewatch-source-12.71/`
- **Standalone:** `dist/strikewatch-build-12.71.html`
- **Save schema:** 19, unchanged
- **Diagnostics schema:** 1, unchanged

## Scope completed

Build 12.71 restructures the Recruitment market around faster comparison without changing its underlying candidates or commercial rules.

- Replaced long market rows with fixed-height, two-faced candidate cards.
- Kept identity, role, scouting confidence, ability, potential, fee, wage, squad-fit interpretation and direct shortlist/compare/report/negotiate actions on the front face.
- Added an explicit flip interaction for the role brief, strongest known attributes, medical status, market context and predicted Active Five impact.
- Added visible face semantics through `aria-hidden` and `inert`, focus restoration after each flip and a reduced-motion fallback.
- Added a sticky three-slot comparison tray with candidate removal, clear, review and hide controls.
- Kept the empty mobile tray to a compact 60-pixel summary until the first candidate is selected.
- Automatically opens the existing detailed squad-fit recommendation after a second comparison selection.
- Retained recommendation scoring across immediate impact, future ceiling, current squad need and budget fit.
- Kept flip IDs, comparison IDs and expanded state transient; no new career-save fields were introduced.
- Updated the release metadata, current authority documentation and generated output naming.

## Gameplay and persistence boundaries

No recruitment values, candidate ordering, report knowledge, transfer terms, negotiation logic, signing logic, economy, match simulation, combat, AI, progression or persistence rules changed. Build 12.70 presentation and Build 12.69 guided-navigation behaviour remain intact.

## Verification

### Source and build

- Read all Markdown files before editing.
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript file passed `node --check`.
- Generated `js/strikewatch.dev.js` passed `node --check`.
- Inline JavaScript extracted from `dist/strikewatch-build-12.71.html` passed `node --check`.
- Two consecutive builds produced identical generated-bundle and standalone hashes.
- Generated bundle SHA-256: `3d0ffa2f2617c0c6022a26dc2bca2db4c4d3025a48d2f9022956ba5be843703d`.
- Standalone SHA-256: `bccab427f75cac68415af75e6e8452d94e2a4aa8823a9048846588ecf62fecb8`.

### Responsive browser matrix

Headless Chromium checks ran at:

- 390 × 844 portrait
- 430 × 932 portrait
- 844 × 390 compact landscape
- 1024 × 768 tablet/desktop
- 1366 × 768 desktop

Across all five sizes:

- six compact candidates rendered in the guided Recruitment market;
- no document or menu horizontal overflow occurred;
- the front and reverse face changed correctly;
- only the visible face remained interactive;
- focus returned to the opposite face's flip control;
- selecting two candidates filled two tray slots and opened two detailed comparison cards;
- the **Best Current Fit** recommendation remained visible;
- no page errors or runtime faults were recorded.

Portrait card heights were 382–394 pixels, compact landscape was 350 pixels and desktop was 342 pixels. Active mobile card controls retained a minimum 44-pixel height. The empty portrait comparison tray measured approximately 60 pixels.

### Retained diagnostics

The following runtime diagnostics passed at every tested viewport:

- state integrity;
- typography consistency;
- First Match Journey guidance;
- Recruitment role guide;
- Recruitment decision support;
- Recruitment comparison interaction;
- compact Recruitment cards;
- runtime fault scan.

## Known boundaries

- The flip interaction is deliberately explicit through the candidate identity/header control rather than making every point on the card clickable; this prevents accidental flips when using shortlist, comparison, report or negotiation actions.
- The reverse face is a concise scout view, not a replacement for the authoritative full operator report.
- The detailed comparison workspace remains vertically rich on small screens, but it is hidden until requested or until a second candidate makes a recommendation useful.
