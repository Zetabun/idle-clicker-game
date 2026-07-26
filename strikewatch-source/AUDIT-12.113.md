# Strikewatch Build 12.113 Audit

Audit date: 26 July 2026
Build: `12.113.0-desktop-version-alignment` — **Desktop Version Alignment**

## Scope

Build 12.113 corrects the desktop management-header version badge shown beside the Operations breadcrumb. The topline remains one flex row, while the breadcrumb and badge now own explicit line boxes. The badge resets inherited positioning, margin and transform values and uses inline-flex content centring so later shared typography rules cannot make it appear raised.

The mobile version remains in the existing current-page bar revealed by the `?` Help control.

## Source and documentation

- Editable changes are confined to `strikewatch-source/`.
- `js/00-core.js` owns Build 12.113 metadata and continues to synchronise both visible version labels.
- `index.html` contains matching title, asset IDs, main-menu stamp and static desktop/mobile labels.
- `css/game.css` owns the desktop alignment correction.
- The root `cod.html` release is generated from the verified standalone output.

## Boundaries

- No header markup order or mobile Help behaviour changed.
- No gameplay, AI, navigation, collision, combat, economy, progression, operator rendering, match rendering or performance system changed.
- Save schema remains 19 and diagnostics schema remains 1.

## Verification

- Read root `AGENTS.md`, root `README.md` and all 107 pre-existing Markdown files under `strikewatch-source/` before implementation; this audit brings the maintained Markdown total to 108.
- Desktop geometry passed at 1024, 1280 and 1600px. The breadcrumb/badge centre delta was at most `0.000001px`, the authored gap remained `9px`, document overflow remained zero, and the badge resolved to `display: flex`, `position: static` and `transform: none`.
- The mobile `#mobileCommandBuildVersion` label remains in the unchanged Help-revealed current-page markup and reports `12.113`.
- `python -m py_compile build.py`: pass.
- All 35 modular/generated JavaScript files: `node --check` pass.
- Standalone inline JavaScript: `node --check` pass.
- Two consecutive builds were byte-identical.
- Generated bundle SHA-256: `8380D4710E9BD6CC6E237BC89331053CC2E23C72064BCCBDE5912D9D2353C844`.
- Standalone SHA-256: `55A311A7E80D541651075F48E8F02524D75CB87BEF1134336A249E37A0DA6763`.
- Source archive creation, extraction and extracted rebuild parity: pass across 148 project files.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.113.html`.
