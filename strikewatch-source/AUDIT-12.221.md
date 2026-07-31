# Build 12.221 audit — Desktop Management Layout Restoration

## Problem
The desktop management interface could inherit a compact maximum width, leaving roughly half of a wide viewport blank and compressing the header, navigation and content into a narrow left-hand column.

## Change
- Added a final desktop-only layout guard at the established 1024px breakpoint.
- The management shell, top bar, body and layout now explicitly occupy the full viewport width on desktop.
- Desktop restores a bounded sidebar plus flexible content grid: `minmax(260px, 340px) minmax(0, 1fr)`.
- Sidebar and content minimum/maximum width constraints are normalised so content can expand without clipping.
- The injected mobile header submenu is explicitly hidden on desktop.
- Every rule is inside `@media (min-width: 1024px)`; compact/mobile selectors and behaviour below that breakpoint are unchanged.
- Gameplay, routes, mail behaviour, save schema 19 and diagnostics schema 1 are unchanged.

## Verification
The release requires deterministic bundle and standalone builds, parsing of all modular/generated/standalone JavaScript, targeted desktop-breakpoint assertions, confirmation that the compact `max-width: 760px` contextual-navigation rules remain present, and root/standalone byte identity. A source-level responsive isolation check is included; independent live-browser computed-style verification remains desirable at 1024px, 1366px and ultrawide widths.
