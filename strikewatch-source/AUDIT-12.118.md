# Build 12.118 – Mobile typography readability pass

## Scope

Find and correct compact-screen text that remained difficult to read after the
earlier mobile UI passes. The audit covered the onboarding Command Centre,
recruitment carousel and inline reports, full operator dossiers, team and
development surfaces, league/configuration legacy components, persistent
mobile navigation and the portrait live-match console.

## Findings

The shared Build 12.61 mobile scale still allowed 9–10.5px values, while
several later or legacy components bypassed it with fixed 5–9px declarations.
The most visible examples were recruitment-card metadata and report copy,
operator development/history labels, team telemetry, league rows and live-match
scoreboard, event and control labels. Raising dossier copy also exposed a
pre-existing fixed-minimum scouting grid that overflowed internally at 320px.

## Implementation

- Raised the final mobile semantic scale to a 10.5–11px micro range, 11–12px
  label range, 11.75–12.75px small-copy range, 12.75–13.75px body range and
  11.5–12.25px control range.
- Added component-scoped overrides for recruitment, operator profiles, team
  telemetry/armoury, development/training/supplies, league tables and
  Configuration appearance controls.
- Raised portrait match scoreboard, objective, feed, match-moment, telemetry
  and control copy while leaving transient damage tags and decorative glyphs
  compact.
- Added a narrow-phone scouting-estimate grid template so the larger attribute
  labels fit without horizontal overflow.
- Kept all rules below 1024px. Desktop typography and every game-data authority
  are untouched.

## Responsive verification

- At 320 × 700, the recruitment carousel and full operator profile both report
  equal client/scroll widths, root width equals viewport width, and no visible
  meaningful text under 10.5px.
- At 390 × 844, recruitment, operator profile and portrait match views remain
  horizontally contained. The match stage reports equal client/scroll
  dimensions.
- Compact landscape retains the raised semantic scale without changing the
  desktop breakpoint.
- Persistent touch controls remain at least 44px where this pass changes their
  typography.

## Release verification

- `BUILD_VERSION`, `BUILD_NAME`, `BUILD_ID`, title, asset query strings, build
  stamp and both visible version labels agree on Build 12.118.
- Modular, generated and standalone JavaScript parse successfully.
- Repeated `build.py` runs reproduce the development bundle and standalone
  output byte-identically.
- Root `cod.html` is byte-identical to
  `dist/strikewatch-build-12.118.html`.
- Release/runtime audits complete without faults; save schema remains 19 and
  diagnostics schema remains 1.

## Boundaries

No recruitment value, scouting estimate, negotiation decision, navigation,
match event, bot decision, combat rule, arena geometry, economy, persistence or
desktop layout behavior changed.
