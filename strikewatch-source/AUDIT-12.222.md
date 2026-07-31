# Build 12.222 audit — League Fixtures Submenu

## Problem
The League Overview contained the entire 38-match fixture calendar beneath the standings, objectives, League Pulse and opposition brief. This made the main page unnecessarily long on both mobile and desktop.

## Change
- League now exposes two standard routes: Overview and Fixtures.
- Compact/mobile receives both routes through the existing contextual header submenu.
- Desktop receives both routes through the existing section navigation.
- The Overview retains the competition summary, pyramid, board objectives, League Pulse, table and next-opponent controls.
- The full season calendar and recorded results move to `renderLeagueFixturesTab()`.
- The dedicated page summarises played/remaining and home/away counts before the existing fixture list.
- The old in-page Fixtures jump and duplicate fixture panel are removed from Overview.
- `renderLeagueFixtures()` and the existing fixture, result and standings authorities are reused unchanged.
- No CSS or breakpoint rules are changed, so the Build 12.221 desktop restoration and established compact/mobile presentation remain intact.
- Save schema 19 and diagnostics schema 1 are unchanged.

## Verification
The release requires deterministic double builds; parsing of modular, generated and standalone JavaScript; targeted assertions for both League routes and single-source fixture rendering; preservation of the 1024px desktop guard and compact contextual navigation; and byte identity between the standalone and root `cod.html`.
