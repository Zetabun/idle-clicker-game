# Build 12.83 Audit — Mobile Recruitment Touch & Flip Restoration

## Scope

- Prevented mobile touch, active, focus and emulated-hover states from replacing the dark recruitment-card surface with the legacy pale silver fill.
- Preserved distinct gold shortlist and teal comparison card accents across those interaction states.
- Restored a visible **Flip for Details** control to the compact mobile candidate summary.
- Added a dedicated mobile scout side containing role brief, key attributes, medical, market history and Active Five impact, plus a clear **Summary** return control.
- Reused the established transient flip state and scroll-position restoration rather than creating saved UI state.
- Desktop recruitment cards, mobile carousel navigation, comparison logic, candidate data, scouting, negotiations, economy, infrastructure, save schema 19 and diagnostics schema 1 remain unchanged.

## Regression requirements

- Mobile cards must retain the same dark boardroom background before and during touch/emulated hover.
- The mobile compact summary must expose a visible Flip for Details control.
- Flip and Summary must rerender the correct side without losing the current candidate or page position.
- View Report, comparison selection and Negotiate must remain available.
- Desktop and compact-landscape cards above `820px` must retain the existing desktop flip stage.
- Supported viewports must have no document-level horizontal overflow or runtime errors.

## Verification executed

- Read the current and retained authority Markdown files before implementation.
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- `python3 build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.83.html` successfully.
- Two consecutive builds produced identical SHA-256 hashes:
  - `js/strikewatch.dev.js`: `10e74c6ec9bec00930abf66b2fde17cebfd47e444313f5d3078ff1c215731665`
  - `dist/strikewatch-build-12.83.html`: `f3226a5527beb5b6892c7c0ef126e89c68a58af8f069c1ad5866985434f64395`
  - `css/game.css`: `650663e437b85f21eaa90e7c9c704e10311516bfea8a4f4ccc2431a947840c1c`
  - `index.html`: `fc9760242a3b1459982d414250a151d00c5a909d619b482fcc8caa8e107f7ff0`
- Browser interaction checks passed at `390x844`, `430x932`, `844x390`, `1024x768` and `1366x768` using the complete standalone build loaded through Chromium.
- At `390x844` and `430x932`, the computed card background remained identical before and during forced hover, the computed filter remained `none`, the mobile Flip for Details control was visible, Flip opened the scouting side, Summary returned to the compact side, View Report still expanded, and comparison selection updated the persistent tray. The collapsed card measured approximately `616px` and `534px` respectively, with no page overflow.
- At `844x390`, `1024x768` and `1366x768`, the mobile summary remained hidden and the established desktop flip stage remained visible.
- All tested sizes rendered six guided candidates, recorded zero page errors and zero document-level horizontal overflow.
- A second syntax/build and browser-interaction pass was completed after the final CSS and documentation updates.
