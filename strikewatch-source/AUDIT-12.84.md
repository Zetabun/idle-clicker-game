# Build 12.84 Audit — Portrait Mobile Bottom Clearance Correction

## Scope

- Removed the remaining false blank band above the persistent department bar in portrait mobile.
- Kept `.menu-layout` as the single owner of fixed-navigation and safe-area clearance.
- Reduced portrait `.menu-content` bottom padding from a duplicated navigation-height reservation to the normal 10-pixel content inset.
- Preserved the fixed department bar, compact-landscape rail, desktop layout, Command Centre content, recruitment, Club Infrastructure, gameplay, persistence, save schema 19 and diagnostics schema 1.

## Root cause

Build 12.62 already reserved `66px + env(safe-area-inset-bottom)` on `.menu-layout` for the fixed department bar. A later portrait rule also applied `74px + env(safe-area-inset-bottom)` to `.menu-content`. Because `#menuContent` is the inner route scroller, the second reservation shortened it by roughly 74 pixels and displayed the unused padding as a dark blank band above the navigation.

## Regression requirements

- Portrait `#menuContent` must use the full workspace remaining above the fixed department bar.
- The next Command Centre section must appear directly after Team XP when scrolling.
- Content must not sit underneath the fixed department bar.
- Compact landscape and desktop geometry must remain unchanged.
- No syntax, runtime or horizontal-overflow regression may be introduced.

## Verification executed

- Read the current and retained authority Markdown files before implementation.
- Reproduced the issue at a short portrait viewport and measured a 74-pixel difference between `.menu-content` and the internal `#menuContent` scroller.
- Confirmed the existing `.menu-layout` already reserved the fixed navigation height.
- Applied the final portrait override and confirmed the inner scroller expanded by 64 pixels, leaving only the normal 10-pixel content inset.
- Confirmed the **Next Fixture** section flowed directly beneath the Team XP panel while the fixed department bar remained clear.
- Two consecutive builds produced identical SHA-256 hashes:
  - `js/strikewatch.dev.js`: `5efc20422997c16952d8e1fbfc28b397d2ab658edc33513b3f90d528b1664c5f`
  - `dist/strikewatch-build-12.84.html`: `7aea86c2485b7d68d68ce08f9390fdda3f62bdeb8f14ddc4fe337800d87971a6`
  - `css/game.css`: `5619724aa0c4751cb3cad599e419c54ce42f1bb41ef5fcd340ab6f03c3ecdef5`
  - `index.html`: `1ad88fd613504746ce872a1c50f4f4d0270629b4e67c2391bf57705426aa6e42`
- Chromium checks on the complete standalone build passed at `353x601`, `390x844`, `430x932`, `844x390` and `1024x768`.
- At all portrait sizes, the difference between the content pane bottom and the internal route scroller reduced to `11px` including borders and the intended 10-pixel inset; the fixed department bar began 4 pixels below the pane, so no overlap occurred.
- At `353x601`, Team XP ended at `431.77px` and the Next Fixture section began at `448.77px`, confirming normal 17-pixel section spacing instead of the previous false 74-pixel band.
- Compact landscape retained an 11-pixel content inset and zero document-level horizontal overflow.
- A second syntax, deterministic-build and responsive-geometry pass was completed after the final documentation update.
