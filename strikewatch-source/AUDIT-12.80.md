# Build 12.80 Audit — Mobile Recruitment Compact Summaries

## Scope

- Reworked the mobile recruitment candidate default presentation into a compact collapsed summary while leaving desktop boardroom flip cards unchanged.
- Kept name, role, ability, potential, fee and wage visible immediately on mobile and compact-tablet widths.
- Reduced stacked mobile actions to a single primary **Negotiate** action plus compact shortlist, comparison and report controls.
- Added an inline expandable report containing scouting explanation, squad-fit detail, history/context and role brief sections.
- Preserved the sticky comparison tray so two or three selected candidates remain visible while browsing.
- Recruitment data, recommendation logic, scouting confidence values, negotiations, signings, gameplay, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Regression requirements

- Mobile recruitment candidates must be materially shorter in their collapsed state than the prior full-detail cards.
- The collapsed summary must immediately show name, role, ability, potential, fee and wage.
- Only one primary Negotiate action should be visible before the report is expanded.
- Expanding/collapsing the report must not lose the manager's browsing position or comparison selections.
- Desktop recruitment cards and the sticky comparison tray must continue to function normally.
- No new horizontal overflow or syntax/runtime-breaking regressions may be introduced in the rebuilt standalone.

## Verification executed

- Read the required Markdown files before implementation.
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- `python3 build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.80.html` successfully.
- Verified by source inspection that the compact mobile summary keeps name, role, ability, potential, fee and wage outside the expandable report and exposes a single primary **NEGOTIATE** action in the collapsed state.
- Verified by source inspection that the inline report owns scouting explanation, squad-fit detail, history/context and role brief content only after expansion, while desktop flip-card markup remains intact.
- Verified by source inspection that the sticky comparison tray rules remain active and unchanged in authority, while the new mobile presentation is isolated to `max-width: 820px`.
- Completed a second syntax/build pass after documentation cleanup to confirm the final source tree still rebuilds cleanly.
