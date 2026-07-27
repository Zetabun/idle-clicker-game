# Build 12.121 – Mobile tactics controls fix

## Reported failure

On a compact portrait tactics view, the long configuration flow made the
Confirm Plan controls appear missing. Formation, plan and role sections could
also look squeezed or obscured, and the role-fit readout could be placed in the
28px sequence column.

## Changes

- Added a compact match-plan action dock immediately after Tactical
  Suitability. It stays reachable while detailed settings are reviewed and
  changes from **Confirm Plan** to **Start Matchmaking** after confirmation.
- Kept the existing full Final Check at the end of the page as the detailed
  confirmation authority.
- Forced formation, plan, role, delegation and Final Check containers to use
  content height and compact-width containment.
- Moved mobile role-fit readouts and role selectors into the usable content
  column.
- Stacked the full Final Check controls at phone widths and reserved enough
  scroll space for them to clear the compact action dock.
- Added `mobileTacticsControlsForTest()` to check action presence and document
  order without duplicating gameplay logic.

## Invariants

- Match confirmation and deployment still use the existing
  `data-matchday-action` handlers.
- Tactics edits continue to invalidate the confirmed snapshot.
- Desktop tactics layout, save schema 19 and diagnostics schema 1 are
  unchanged.

## Verification

- All 35 modular/generated JavaScript files pass `node --check`.
- The standalone contains one inline script and it parses successfully with
  `vm.Script`.
- Static release checks confirm the compact dock and full Final Check retain
  the existing matchday actions, and the new debug hook is present in source,
  bundle and standalone.
- The Build 12.121 compact rules are the final stylesheet authority and cover
  the 390px phone contract: one-column detailed settings, corrected role-fit
  placement, visible 48px Final Check controls and reserved bottom scroll
  space.
- Two consecutive builds produced identical bundle and standalone SHA-256
  hashes.
- Root `cod.html` is byte-identical to the Build 12.121 standalone.
- A connected live browser confirmed the deployed Build 12.120 markup still
  contains the full Final Check; target-width Build 12.121 visual confirmation
  remains a post-publish gate because the connected browser exposes a fixed
  1280px viewport.
