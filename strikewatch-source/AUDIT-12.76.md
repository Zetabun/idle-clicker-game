# Build 12.76 Audit — Mobile Recruitment Card Carousel

## Scope

- Retained the Build 12.75 darker boardroom recruitment-card styling and premium visual polish.
- Changed only the mobile recruitment browsing pattern: candidate cards now present as a horizontal one-card-at-a-time carousel with scroll snapping, subtle neighbour peeks and a compact swipe hint.
- Preserved the compact two-faced card structure, flip behaviour, shortlist/compare actions, negotiation entry points and recruitment data hierarchy.
- Left desktop/tablet grid browsing, candidate calculations, scouting confidence, negotiations, signing logic, economy, persistence, save schema 19 and diagnostics schema 1 unchanged.

## Regression requirements

- Mobile recruitment browsing must not create document-level horizontal overflow.
- Cards must remain fully readable on the front and back faces while preserving flip interactions and action accessibility.
- Desktop/tablet recruitment presentation must remain grid-based and unaffected.
- No runtime regressions in `js/39-recruitment-commercial.js`, no build failures and no changes to recruitment/gameplay logic.

## Verification executed

- Read the required Markdown files before implementation.
- `python -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- `python build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.76.html` successfully.
- Source review confirmed the recruitment logic changes are limited to inserting mobile swipe-hint markup while preserving candidate behaviour.
- CSS review confirmed the Build 12.76 carousel overrides load after the Build 12.75 recruitment rules and therefore override mobile layout deterministically without affecting desktop/tablet layouts.
- ZIP packaging was regenerated for the updated source tree.

## Limitations

- Verification in this pass is code/build level only; the mobile carousel was validated through source inspection and deterministic CSS cascade review rather than a full manual device walkthrough.
