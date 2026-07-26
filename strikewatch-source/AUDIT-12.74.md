# Build 12.74 Audit — Silver Shield Recruitment Cards & Desktop Fit

## Scope

- Refined Recruitment candidate cards so the overall surface reads more clearly as a silver/platinum player-card while preserving the existing compact two-faced structure, controls and data flow.
- Preserved the explicit gold/platinum scouting-star language and strengthened the filled/half/empty states for readability.
- Reduced desktop card density so the recruitment grid shows fewer, wider cards per row, giving candidate names room to breathe.
- Allowed desktop/front-face names and identity lines to wrap cleanly instead of clipping.
- Candidate rankings, scouting confidence, negotiations, comparison logic, signing logic, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Regression requirements

- Recruitment cards must keep the Build 12.71/12.72 compact-card structure, comparison workflow and mobile containment safeguards.
- Desktop widths must avoid player-name clipping while keeping card actions visible and aligned.
- Ability and potential stars must stay legible: full stars gold, half stars split gold/platinum, empty stars muted platinum.
- No document-level horizontal overflow or runtime errors.

## Verification executed

- Read the required Markdown files before implementation.
- `python -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- `python build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.74.html` successfully.
- CSS/metadata review confirmed desktop recruitment now caps at two wider columns from 1024px and three columns from 1360px, with wrapped card names on desktop.
- Source review confirmed recruitment logic in `js/39-recruitment-commercial.js` was unchanged.
