# Build 12.75 Audit — Recruitment Card Visual Refresh

## Scope

- Reverted the Build 12.74 silver-shield recruitment surface and returned the cards to the prior darker boardroom identity.
- Restyled the candidate cards to feel more visually impressive while retaining the existing compact two-faced structure, actions, comparison flow and data hierarchy.
- Kept the clarified gold/platinum scouting-star language from Build 12.73.
- Retained wider desktop cards and wrapped identity lines so names do not clip.
- Candidate data, recruitment ordering, scouting confidence, negotiations, signing logic, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Regression requirements

- Recruitment cards must preserve the Build 12.71/12.72 compact-card/mobile-containment behaviour.
- Desktop widths must continue to avoid candidate-name clipping.
- Ability and potential stars must remain clearly legible: full stars gold, half stars split gold/platinum and empty stars muted platinum.
- No logic regressions in `js/39-recruitment-commercial.js`, no document-level horizontal overflow and no runtime errors.

## Verification executed

- Read the required Markdown files before implementation.
- `python -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- `python build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.75.html` successfully.
- Source review confirmed the visual refresh is CSS-only and recruitment logic in `js/39-recruitment-commercial.js` remained unchanged.
- CSS review confirmed the darker premium recruitment styling loads after the Build 12.74 silver layer and therefore overrides it deterministically.
