# Build 12.119 – Guided navigation label fix

## Scope

Correct the partially hidden `NEXT` badge shown on the inactive Recruitment
tab during the First Match Guide without changing guided-route selection or
the ordinary active-route indicator.

## Finding

`.menu-subtab::after` normally draws a two-pixel active-route rail with
`left: 0`, `right: 100%`, `bottom: 0` and a fixed height. The guided target
rule reused that same pseudo-element for the `NEXT` badge but changed only
`top`, `right` and visual styling. The inherited rail geometry therefore
stretched the cyan badge across the subtab and clipped its text.

## Implementation

- Reset all inherited inset geometry on inactive guided tabs and position the
  badge explicitly at the upper-right.
- Size the pseudo-element to its content, release the fixed rail height and
  disable the rail transition while the badge state is active.
- Preserve the normal `.menu-subtab.active::after` rail for active routes.
- Raise the desktop badge from the legacy 5.5px value to 8px.
- Apply the established 10.5px meaningful-microcopy floor on compact screens
  and tune its top padding so the badge cannot cover route copy.

## Verification

- Desktop and compact guided subtabs show the complete `NEXT` label as a
  bounded badge, with no stretched cyan strip.
- The badge does not overlap the route title or hint at 390px and 320px.
- Ordinary inactive subtabs retain no pseudo-element content; active subtabs
  retain the full-width bottom rail.
- Build metadata, static labels and asset query strings agree on Build 12.119.
- Modular, generated and standalone JavaScript parse successfully.
- Repeated builds are byte-identical and root `cod.html` matches the verified
  standalone release.

## Boundaries

This release changes CSS presentation and release metadata only. Guided step
derivation, route availability, navigation actions, simulation, economy,
persistence, save schema 19 and diagnostics schema 1 are unchanged.
