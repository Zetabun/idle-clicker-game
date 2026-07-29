# Architecture and ownership

Load this file when locating implementation ownership or changing dependencies.
All source fragments are concatenated by `build.py` into one strict IIFE and
share application scope in the listed order.

## Package boundaries

| Path | Authority |
| --- | --- |
| `index.html` | Static shell, visible release labels and ordered bundle entry |
| `css/game.css` | Legacy/base responsive and visual presentation; no new component-owned tail blocks |
| `css/operator-portrait.css` | Asset-free operator complexion, kit, headgear, rig and deployment portrait presentation |
| `css/command-chrome.css` | Compact shared command typography floors and nowrap containment |
| `css/combat-effectiveness.css` | Compact after-action score ring, caption and influence typography |
| `css/match-type.css` | Detailed-report competition row and first-match fixture-type line |
| `css/route-readability.css` | Route-specific compact typography floors and dense-grid containment |
| `css/management-grid.css` | Management-route grid track sizing and top-aligned content flow |
| `css/league-table.css` | League-table typography, compact row height and club-name wrapping |
| `css/calendar-agenda.css` | Calendar agenda typography, compact two-column reflow and action-target sizing |
| `css/training-readability.css` | Training/development typography floors and programme-control sizing |
| `css/training-programme.css` | Training workflow wrapper and outstanding-programme accent state |
| `css/management-feedback.css` | Management live-status surface and visible blocked/ready match-state presentation |
| `css/compact-readability.css` | Compact 12px management typography floors for dates, locks, access and action state |
| `css/reward-reveal.css` | Crate-to-award phase visibility and full-width weapon reveal placement |
| `css/armour-viewer.css` | Armour inspector rotation pivot, transition and scoped compositor promotion |
| `css/weapon-presentation.css` | CSS-3D weapon face/cylinder lighting and grip-material presentation |
| `css/loadout-stills.css` | Loadout still stages and on-demand 3D inspector controls |
| `css/12.161-audit-fixes.css` | Cross-route compact readability and accessibility fixes from 12.161 |
| `css/armoury-inventory.css` | Compact Armoury inventory card layout |
| `css/compact-navigation.css` | Compact club navigation and fixed management-alert layout |
| `build.py` | Module order, generated bundle and standalone packaging |
| `js/strikewatch.dev.js` | Generated development bundle; never hand-edit |
| `dist/strikewatch-build-*.html` | Generated standalone releases |
| root `cod.html` | Deployed copy of the verified current standalone |

## JavaScript ownership

| Module | Primary responsibility |
| --- | --- |
| `00-core.js` | Build metadata, constants, maps, zones, decor, props, weapons, shared state and utilities |
| `10-audio.js` | Audio graph, cues and audio controls |
| `20-navigation.js` | Navigation-grid construction, paths, support geometry and doors |
| `30-bot-ai.js` | Operator state, perception, movement, tactics, combat decisions and animation state |
| `31-match-diagnostics.js` | Diagnostics schema, bounded samples/events and exports |
| `32-tactical-minimap.js` | Tactical minimap projection and presentation data |
| `33-season-narrative-state.js` | Persistent season-story state and normalisation |
| `34-squad-dynamics.js` | Partnerships, morale/cohesion relationships and settlement |
| `35-career.js` | Core career state, creation, saves, inventory, matches, reports and progression |
| `39-medical.js` | Injury, recovery and medical state |
| `36-team-management.js` | Command Centre, team routes, recruitment presentation and profiles |
| `37-league.js` | League clubs, fixtures, standings, promotion and season transitions |
| `38-development.js` | Player/team development and training presentation |
| `39-infrastructure.js` | Persistent facilities and construction |
| `39-club-operations.js` | Staff and related club operations |
| `39-opposition-intelligence.js` | Scouting staff, reports and preparation reads |
| `39-matchday.js` | Matchday readiness, deployment and fixture entry |
| `39-transfers.js` | Transfer offers and negotiations |
| `39-recruitment-commercial.js` | Recruitment department, sponsors and searches |
| `39-dynamic-market-mail.js` | Market simulation and organic Inbox messages |
| `39-calendar-finance.js` | Calendar events, contracts and finance/loan settlement |
| `39-workflow-integrity.js` | Blockers, pending decisions and routed integrity checks |
| `40-match-flow.js` | Round/match lifecycle, feed events and career settlement |
| `41-live-command-pulses.js` | Explicit live manager command system |
| `50-ui-menus.js` | Menu shell, sections, subtabs, guidance and route rendering |
| `52-season-narratives.js` | Story recognition, presentation and narrative settlement |
| `55-opening-week.js` | Opening-week agenda and safe advance-to-event flow |
| `56-world-press-awards.js` | Press, awards and honours presentation |
| `60-renderer-core.js` | WebGL setup and shared drawing primitives |
| `61-world-renderer.js` | Arenas, props, decor, doors and world geometry |
| `62-character-renderer.js` | Operators, corpses, armour fit and held weapons |
| `63-viewmodel-renderer.js` | First-person weapon/viewmodel rendering |
| `64-reward-renderer.js` | Reward and crate presentation |
| `70-runtime.js` | DOM binding, main loop, input, startup and public test hooks |

`build.py` is the module-order authority. When adding a module, place it after
everything it consumes and before everything that consumes it.

## State boundaries

- `careerState` is the persistent management authority.
- Match/runtime objects are transient unless explicitly captured in career
  reports or progression.
- Menu selection, disclosure controls, comparison state and temporary guidance
  should remain transient.
- Save normalisation and schema migrations belong with career persistence.
- Diagnostics are exported separately from career saves.

## Presentation flow

Management UI is assembled by `50-ui-menus.js` and route-specific renderers,
then inserted into the shell owned by `index.html`. `build.py`'s `CSS_PATHS` is
the cascade-order authority, and `index.html` must load the same files in the
same order. The current order is `game.css`, `operator-portrait.css`, `command-chrome.css`,
`combat-effectiveness.css`, `match-type.css`, `route-readability.css`, `management-grid.css`,
`league-table.css`, `calendar-agenda.css`, `training-readability.css`,
`training-programme.css`, `management-feedback.css`, `compact-readability.css`,
`reward-reveal.css`, `armour-viewer.css`, `weapon-presentation.css`,
`loadout-stills.css`, `12.161-audit-fixes.css`, `armoury-inventory.css`, then
`compact-navigation.css`. Prefer component-scoped selectors and verify the
final computed style, especially when pseudo-elements are reused.

The live match loop is coordinated by `70-runtime.js`, with simulation in
`30-bot-ai.js`/`40-match-flow.js` and rendering in `60-64-*.js`.

## Test and audit discovery

- Public regression hooks normally end in `ForTest()` and are exposed from
  `70-runtime.js`.
- Search source before adding a new hook:
  `rg -n "<system>|ForTest" js`.
- Locate historical contracts without loading every audit:
  `rg -l "<system or function>" AUDIT-*.md`.
- Read the newest matching audit first; older audits are retained only when the
  newer record explicitly depends on them.
