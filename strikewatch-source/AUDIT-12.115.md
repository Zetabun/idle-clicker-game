# Strikewatch Build 12.115 Audit

Date: 2026-07-27
Build: `12.115.0-header-negotiation-readability` — **Header & Negotiation Readability**

## Scope

Build 12.115 corrects the wide-desktop position of the visible build badge and raises undersized text on the compact incoming-player negotiation screen. It is a presentation and release-metadata update only.

## Ownership

- `css/game.css` owns the wide-desktop badge placement and compact negotiation type floors.
- `index.html` owns matching source metadata and static desktop/mobile version labels.
- `js/00-core.js` owns authoritative runtime build metadata and label synchronisation.
- `js/39-transfers.js` remains unchanged and authoritative for negotiation copy, values, state and actions.

## Preserved behavior

- At `1024px–1279px`, the desktop build badge remains inline with the breadcrumb to protect the narrower header.
- Mobile version identity remains inside the existing Help-revealed current-page bar.
- Requested and offered fees, wages and contract lengths are unchanged.
- Negotiation submission, counter-offer, acceptance, withdrawal and signing logic are unchanged.
- Recruitment calculations, gameplay, match presentation, economy, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Verification

- At `1791 × 768`, the build badge centre was `895.66, 39.66` against a header centre of `895.66, 40.00`; the badge and breadcrumb did not overlap and document overflow was zero.
- At `1024 × 768`, the inline badge did not overlap either the breadcrumb or the page title and document overflow was zero.
- At `390 × 844`, compact negotiation sizes resolved to `9.5px` round/status/field labels, `8.5px` scouting captions, `11px` safety copy, `11.5px` explanatory/request copy, `14px` editable values and `8.75px` step captions. Card and document overflow were both zero.
- At the `820px` compact boundary, the same type floors held with zero card or document overflow.
- The real creation → recruitment → incoming-negotiation browser flow passed, and browser logs contained no warnings or errors.
- `python -m py_compile build.py`: pass.
- All 35 modular/generated JavaScript files: `node --check` pass.
- Standalone inline JavaScript compilation: pass.
- Two consecutive builds were byte-identical.
- Generated bundle SHA-256: `452CAAFFD407673CD668231640842463730F16D354993675960D6907EBB4B0C7`.
- Standalone SHA-256: `97DE1558F1E8E0613238A2248BAB60513F9F7E4E622FA73BCDD4B5264C1EAF93`.
- Source archive creation, extraction and extracted rebuild parity: pass across 150 project files.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.115.html`.
