# Strikewatch Build 12.114 Audit

Audit date: 27 July 2026
Build: `12.114.0-live-feed-readability` — **Live Feed Readability**

## Scope

Build 12.114 raises compact-screen typography in the operator technical profile, live market context, Active Five Needs panel and recruitment role guide. Portrait windowed matches gain a decorative red **LIVE** bug and a Counter-Strike-style upper-right treatment for up to three existing feed rows. Desktop recruitment fee and wage estimates keep both `CR` labels on one line, and the desktop version badge uses text-baseline alignment with its breadcrumb.

## Source and documentation

- Editable changes are confined to `strikewatch-source/`.
- `css/game.css` owns compact type floors, portrait overlay/feed placement, desktop currency fit and version-baseline alignment.
- `index.html` owns one decorative `.portrait-live-bug` and matching Build 12.114 metadata.
- `js/00-core.js` owns Build 12.114 metadata and continues to synchronise both visible version labels.
- `js/40-match-flow.js` remains unchanged and continues to own feed events, ordering and lifetime.
- Root `cod.html` is generated from the verified standalone output.

## Boundaries

- No candidate value, recruitment calculation or decision changed.
- No feed event, match timing, AI, navigation, collision, combat, map geometry, map rendering, economy, progression or operator renderer changed.
- Save schema remains 19 and diagnostics schema remains 1.

## Verification

- Root authority and all 108 pre-existing Markdown files under `strikewatch-source/` were read before this implementation; this audit brings the source Markdown total to 109.
- A real new-club browser flow completed the four-step portrait orientation and one-round demo. The live view showed the `LIVE` bug at upper-left and three existing feed rows at upper-right; the fourth row remained hidden, the two overlays did not overlap and document overflow was zero at `390 × 844`.
- Compact profile checks passed at `390 × 844` and the supplied-capture width `729 × 613`. Attribute labels/help/value resolved to `11.5px` / `9.75px` / `16px`; market labels/headlines/body resolved to `10px` / `12.5px` / `11.5px`, with zero document overflow.
- Active Five Needs resolved to `10px` labels, `12px` statuses and `10.5px` explanations. The role-guide title/body resolved to `16px` / `12.5px`, with zero document overflow.
- All twelve tested desktop fee/wage strings retained both `CR` labels, resolved to `white-space: nowrap`, fitted their value boxes and produced zero document overflow at `1365 × 768`.
- Desktop header checks at `1024px`, `1365px` and `1600px` confirmed baseline alignment, a flex badge and zero document overflow.
- The complete browser flow produced no console warning or error.
- `python -m py_compile build.py`: pass.
- All 35 modular/generated JavaScript files: `node --check` pass.
- Standalone inline JavaScript: `node --check` pass.
- Two consecutive builds were byte-identical.
- Generated bundle SHA-256: `07B81BE67F33953FF6E3767868CE9352CC4ABA09E6B09773245D66FB2677E8E5`.
- Standalone SHA-256: `2E9318BFFB60181756A79BEC770CB5946C3BD32AA5571E46508DF06D204BE654`.
- Source archive creation, extraction and extracted rebuild parity: pass across 149 project files.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.114.html`.
