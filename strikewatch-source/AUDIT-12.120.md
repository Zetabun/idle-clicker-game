# Build 12.120 – Mobile flow and accessibility fix

## Scope

This release resolves the compact-screen readability and early onboarding
defects identified during the Build 12.119 playthrough. Save schema 19,
diagnostics schema 1, balance, combat and simulation rules are unchanged.

## Changes

- Raised meaningful compact-screen microcopy to 12px and explanatory copy to
  14px across management and windowed-match surfaces.
- Removed visible 6.5px emblem captions on compact screens while retaining the
  complete emblem name as the button's accessible label.
- Routed `VIEW PROFILE` to a candidate from the same six-person recommended
  list shown in recruitment.
- Added Compare directly to the compact candidate summary face; Details is no
  longer a prerequisite for the comparison workflow.
- Isolated management-dialog background siblings with `inert`, trapped
  Tab/Shift+Tab inside the dialog and restored prior background state on close.
- Collapsed the compact First Match Guide after its action is used; the player
  can still expand it again.
- Added the First Match Guide calendar restriction to
  `clubEndDayBlockers()` so interface and simulation diagnostics report the
  same reason that progression is blocked.

## Regression coverage

New or strengthened deterministic hooks cover:

- recommended-candidate profile routing;
- Compare availability on the compact candidate front;
- modal initial focus, background isolation, bidirectional focus wrapping and
  restoration;
- canonical First Match Guide End Day blocker reporting;
- the 12px/14px compact typography contract.

The release gate requires modular/generated/standalone JavaScript parsing,
targeted behaviour hooks, compact-width containment and typography checks,
runtime-log inspection, deterministic double builds and byte identity between
the standalone and root `cod.html`.
