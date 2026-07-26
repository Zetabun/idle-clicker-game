# Build 12.82 Audit — Mobile Command Centre Panel Height Correction

## Scope

- Removed the large false empty area beneath the mobile Command Centre's Manager Priority Queue.
- Preserved the compact-landscape two-column Objectives / Recommended Actions layout.
- Changed grid alignment so each panel sizes to its own content rather than the shorter panel stretching to match the taller objectives panel.
- Portrait layout, persistent mobile navigation, dashboard data, action priority, gameplay, Club Infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Root cause

At the compact-landscape breakpoint, `.command-planning-grid` returns to two columns. CSS Grid's default stretch alignment made both panels share the tallest row height. The Objectives panel contains four rows while the Manager Priority Queue may contain only two or three, so the shorter panel displayed a large empty block below its final action.

## Verification executed

- Read the current release and retained authority Markdown files before implementation.
- Reproduced the issue in Chromium at `844x390`: both panels measured `565.25px` despite the shorter action list.
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- `python3 build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.82.html` successfully.
- Two consecutive builds produced identical SHA-256 hashes:
  - `js/strikewatch.dev.js`: `f25795f69a23737b8e3c77f6a30f4c420a820472738746858d1a367233eae2fa`
  - `dist/strikewatch-build-12.82.html`: `ff045e40a5638406881c0ad956ecefa42616ee879b0fa26017393c0c816cc1e3`
  - `css/game.css`: `64bfa8ea09a8b24b4e2831b3d360735bc9c8e9eb32faeb04609915ce306f3eff`
  - `index.html`: `75c6fad0f5a8e3bb07757633d7458d29e06426381fb9711e396b7252fda9cf75`
- Compact-landscape verification confirmed independent panel heights at `844x390`: Objectives remained `565.25px` while Recommended Actions reduced to `381.69px`, removing the false blank area.
- Portrait verification confirmed the stacked dashboard remains contained above the persistent bottom navigation.
- No Command Centre action logic, ordering, gameplay or saved state changed.
