# Build 12.163 — Compact Navigation Alignment

## Scope

Fixes two mobile-only alignment defects reported from the club-navigation overlay: destination cards could paint into neighbouring rows, and the fixed management status/alert retained a desktop three-column layout at phone width.

## Implementation

- Compact route lists now use `grid-auto-rows: max-content`.
- Route buttons explicitly use auto height, bounded copy, two-line support text and a contained status column.
- The management status uses safe-area-aware inline insets and a two-column/two-row phone layout with a full-width dismiss action.
- Desktop and landscape layouts are unchanged.

## Documentation

`HANDOFF.md` now records the separated script → workflow → trigger publishing procedure as a ChatGPT-only user preference. Other agents are explicitly instructed to ignore that subsection.

## Verification

- Build succeeds twice with byte-identical bundle and standalone output.
- Modular, generated and standalone JavaScript parse.
- Root `cod.html` matches the verified standalone byte-for-byte.
- Compact CSS assertions cover 320, 353, 375, 390, 402 and 430 CSS-pixel portrait widths.
