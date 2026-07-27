# Build 12.130 UI clarity hotfix audit

## Scope

Presentation-only fixes requested against the existing **12.130 — Aurora Terminal** release:

- make the five tactical summary tags visually prominent;
- align Active Operator Match Roles consistently on desktop and compact/mobile;
- preserve readable End Day text when the calendar control is disabled or blocked.

No gameplay, persistence, tactical-fit calculation, role assignment, calendar progression, match simulation or arena data is changed.

## Source ownership

- `js/75-ui-clarity-hotfix.js` owns the scoped release-end presentation overrides.
- `build.py` includes that source fragment after runtime setup so it is present in the generated development bundle and standalone release.
- Build metadata remains 12.130 as requested; this is a corrective presentation rebuild of the current release rather than a new feature release.

## Expected presentation

### Tactical summary tags

The formation, approach, range, priority and Plan Fit tags use a bright blue/teal filled treatment, stronger border contrast and consistent minimum height. Compact layouts use a two-column grid, falling back to one column at 430px and below.

### Active operator roles

Desktop rows use three stable content columns: operator details, fit/effectiveness readout and role selector. Compact rows keep the numbered rail separate, then stack operator details, fit readout and selector in normal flow without overlap.

### End Day

Disabled/blocked states keep full opacity and use a lighter green-grey surface with high-contrast primary and secondary text. The lock and disabled behaviour are unchanged.

## Verification gates

The release rebuild workflow must:

1. run `python3 build.py` twice;
2. require byte-identical bundle and standalone hashes;
3. parse every modular JavaScript file and the generated bundle with Node;
4. copy `dist/strikewatch-build-12.130.html` to root `cod.html`;
5. require root `cod.html` to be byte-identical to the standalone;
6. commit generated artifacts back to the release branch.

Targeted live checks remain the affected widths: 390, 430, 1024, 1366 and 1920 CSS pixels.
