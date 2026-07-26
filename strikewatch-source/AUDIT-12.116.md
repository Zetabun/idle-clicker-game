# Strikewatch Build 12.116 Audit

Date: 2026-07-27
Build: `12.116.0-desktop-header-split` — **Desktop Header Split**

## Scope

Build 12.116 applies the clarified desktop header arrangement: breadcrumb at the upper-left and build badge at the upper-right of the available context, immediately before the shortcut controls.

## Ownership and boundaries

- `css/game.css` owns the desktop split-row presentation.
- `index.html` owns matching static desktop/mobile labels and source metadata.
- `js/00-core.js` remains the runtime build-metadata authority.
- Mobile version placement and Build 12.115 negotiation typography are unchanged.
- Navigation, negotiations, gameplay, match presentation, economy, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Verification

- At `1791 × 768`, the breadcrumb left inset and badge right inset inside `.manager-context-topline` were both exactly `0px`. The badge finished `18.66px` before the shortcut group.
- At `1024 × 768`, the breadcrumb left inset was `0px` and the badge right inset was within subpixel rounding of `0px`.
- Both desktop widths reported no breadcrumb/badge or title/badge overlap and zero document overflow.
- At `390 × 844`, the desktop context stayed hidden; tapping the existing Help control revealed `· BUILD 12.116` in the mobile current-page bar with zero document overflow.
- Browser logs contained no warnings or errors.
- `python -m py_compile build.py`: pass.
- All 35 modular/generated JavaScript files: `node --check` pass.
- Standalone inline JavaScript compilation: pass.
- Two consecutive builds were byte-identical.
- Generated bundle SHA-256: `FBB53DDBC7FFA05C5ACAA62D7D65A455A755EB61ECFE1136EAE48E228ABFB9D9`.
- Standalone SHA-256: `9F36DC395B48FA5B368457D0BB2A24DDE3102765201725A72D10B2A572A04801`.
- Source archive creation, extraction and extracted rebuild parity: pass across the complete project tree.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.116.html`.
