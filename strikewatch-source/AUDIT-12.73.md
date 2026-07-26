# Build 12.73 Audit — Platinum Recruitment Cards & Clear Gold Ratings

## Scope

- Restyled Recruitment candidate surfaces with a restrained silver/platinum material while preserving the 12.71/12.72 card structure and responsive layout.
- Replaced ambiguous outline stars with solid stateful stars. Full stars are gold, half stars are a true 50/50 gold/platinum fill, and empty stars are muted platinum.
- Removed the separate purple potential-star treatment so ability and potential share one immediately readable scale.
- Candidate values, star calculations, scouting confidence, negotiations, comparison recommendations and persistence are unchanged.

## Regression requirements

- Low, half and full ratings must render left-to-right with no isolated gold star after muted stars.
- Recruitment cards must retain readable contrast on portrait, compact landscape, tablet and desktop.
- Flip, compare, report and negotiate controls must remain functional.
- No document-level horizontal overflow or runtime errors.

## Verification completed

- Read all Markdown files in the source package before finalising the release.
- `python -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- Two consecutive builds produced identical bundle and standalone hashes.
- Browser regression checks passed at 360×800, 390×844, 430×932, 700×650, 844×390 and 964×408 before the extended run reached its execution limit; focused follow-up checks passed at 390×844, 1008×664, 1024×768 and 1366×768.
- Focused DOM inspection confirmed 2.5-star ratings render as two gold, one split and two muted platinum stars; 4.5-star ratings render as four gold and one split star.
- No horizontal overflow, page errors or runtime faults were recorded in the focused matrix.
- Card flip, comparison selection, recommendation and recruitment actions retained the Build 12.72 behaviour.


## Verification executed

- `python -m py_compile build.py` passed.
- Every modular JavaScript file in `js/` passed `node --check`.
- `python build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.73.html` successfully.
- Browser checks at `390×844`, `844×390` and `1366×768` confirmed no fit/action overlap, no document-level horizontal overflow, no onboarding/tray overlap, intact flip behaviour and preserved mobile reverse-face containment.
- Computed recruitment-star states confirmed gold full stars, split gold/platinum half stars and muted platinum empty stars.
