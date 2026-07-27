# Build 12.131 — Calendar Clarity audit

## Scope

- Publish the existing tactical-summary and Active Operator Match Roles presentation fixes as a correctly numbered release.
- Make the desktop End Day / Next Day control retain one readable colour scheme in every state, including enabled, locked, blocked, disabled and matchday variants.
- Keep gameplay, calendar blockers, progression, saves, tactical calculations and match simulation unchanged.

## Implementation

- Build metadata is aligned to `12.131`, `Calendar Clarity` and `12.131.0-calendar-clarity` in the source constants, document title, asset queries, desktop build label and mobile Help-bar build label.
- `js/75-ui-clarity-hotfix.js` remains the scoped presentation authority for the tactical tags and role rows. Its calendar-control rules now cover the base, `.blocked`, `.matchday`, `:disabled` and `[aria-disabled=true]` states with `!important` only where necessary to defeat older release layers.
- The calendar control uses a dark slate gradient, visible border, white primary copy, mint supporting copy, full opacity and an orange response badge in every state. Behaviour and disabled semantics are untouched.

## Verification gates

- `python3 build.py` succeeds twice with byte-identical bundle and standalone hashes.
- Every modular JavaScript source file and the generated bundle pass `node --check`.
- The standalone inline JavaScript parses successfully.
- Release metadata and both visible version labels resolve to 12.131.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.131.html`.
- Source, concise documentation, generated artifacts and the distributable ZIP are produced together.

## Responsive review targets

Manual visual checks should cover 390, 430, 1024, 1366 and 1920 CSS pixels, with particular attention to all calendar-control states.
