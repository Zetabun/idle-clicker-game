# Build 12.235 — Club Profile

## Summary

Club names are now controls. Clicking one anywhere in the interface opens a
dedicated club page carrying that club's season record, tactical identity,
head-to-head history against the player and its registered operators.

This is the first of the three "clickable names" cases to be built. It was
chosen because it is the only one the existing data already supports: clubs are
real objects with rosters, so the page needs **no new persistence and no save
schema change**. Save schema 19 and diagnostics schema 1 are unchanged.

## What the data already provided

`careerState.league.clubs[]` persists `{ id, name, short, rating, style, roster }`
and each roster entry persists a full normalised player. `leagueNormaliseClub()`
restores `styleDetail` and `reputation` from `LEAGUE_RIVAL_TEMPLATES`, and
`leagueTable()` already computes position, played, wins, losses, rounds for and
against, points and form. Every field the page shows is derived from that; the
build adds no new state to the save.

## Route

- `club-profile`, registered in the `league` section of `menuSections` as
  `contextOnly: true`, so it appears when reached rather than crowding the
  League submenu — the same treatment the `profile` player page gets.
- **A route also has to be added to `menuTabMeta`.** `setMenuRoute()` opens with
  `if (!menuTabMeta[route]) return false;` and returns silently, leaving the
  previous page rendered. Registering the route in `menuSections` alone looks
  correct, changes nothing, and reports no error — that cost a debugging pass
  during this build.

## Selection state

`selectedLeagueClubId` is **module state in `js/37-league.js`, deliberately not
persisted**. Which club the manager last looked at is a view position, not
career progress; storing it would add a field to the save and force a schema
bump for no gameplay benefit. `leagueSelectedClubId()` resolves the selection,
falling back to the next fixture's opponent and then to the first rival, so a
reload lands on a sensible club rather than on nothing.

## Page content

- **Identity** — name, short code, competition, club rating with the existing
  star conversion. The player's own club is tinted gold and labelled `YOUR CLUB`.
- **Season record** — position out of the division size with promotion or
  relegation context, points, played, won, lost, round difference, rounds for
  and against, and recent form using the existing form markup.
- **Tactical identity** — `style` plus `styleDetail`.
- **Head to head** — every scheduled meeting with the player's club, results
  rendered win/loss with the score from the player's side, upcoming meetings
  marked scheduled, and a sentence naming the next meeting and its venue.
  Suppressed on the player's own club, which cannot play itself.
- **Registered operators** — the club's five, with role and overall. The
  player's own club reads `careerState.squad` instead, because a user club
  deliberately keeps an empty league roster.

## Where club names became clickable

| Surface | File | Notes |
| --- | --- | --- |
| League table rows | `js/37-league.js` | Link nested **inside** the existing `<strong>` |
| Opposition brief | `js/37-league.js` | Next opponent heading |
| Fixtures list | `js/52-season-narratives.js` | See the shadowing note below |
| League Pulse press reports | `js/56-world-press-awards.js` | Uses the report's stored `homeId`/`awayId`; falls back to plain text on older reports that predate them |

### Two hazards this hit

**`renderLeagueFixtures` is reassigned.** `js/52-season-narratives.js` does
`renderLeagueFixtures = function renderLeagueFixturesWithNarrative() {…}` and
does **not** delegate to the original for the normal path. Editing the
definition in `js/37-league.js` therefore changed nothing on the fixtures route
— the links were verified absent at runtime while the source clearly contained
them. Any change to a fixture row must be made in both places.
`renderLeagueTab` is also wrapped twice, by
`js/39-opposition-intelligence.js` and `js/52-season-narratives.js`, but both of
those call the base, which is why the table and opposition-brief edits worked
first time.

**The 7px fallback.** `.menu-shell button { font-size: max(7px, 0.44rem) }` is a
broad fallback (Build 12.226), so a bare `button` with no size rule renders at
7.04px. The club link inherits its typography explicitly and is selected as
`#menuContent .league-club-link`, (1,1,0) against that rule's (0,1,1), rather
than relying on source order. The league-table link also stays **inside** its
original `<strong>`, because `css/league-table.css` sizes
`.league-table-row .club strong` with the override flag; replacing that element
would have dropped the club name to 7px. Verified: table and fixture links both
compute to 13px on compact.

## Type-scale finding

`game.css` sets `#menuContent small { font-size: … }` **with the override flag**
in both the `>=1024px` and `<=1023px` bands, and `css/12.161-audit-fixes.css`
sets it again below 1100px. An unflagged rule cannot win however specific it is.
Five `font-size` declarations on `small` in the new block were therefore dead
and have been removed; weight, colour and letter-spacing are not flagged and do
apply. The practical effect is good — every `small` on this page follows the
house scale automatically and cannot fall through the compact readability floor.

One genuine floor violation was found and fixed: the `/ 20` suffix beside the
league position was `font-size: .5em`, which against the compact 18px minimum
computed to 9px. It is now `clamp(11px, .5em, 14px)`.

## Verification

Career driven to a settled post-first-match state, then measured on the
**standalone artifact with a cache-busting query**, not the development page —
see the note below.

### Responsive matrix — club profile

| Width | Panel | Overflow right | Descendants overflowing | Doc overflow-x | Text under 11px |
| --- | --- | --- | --- | --- | --- |
| 320 | 299×1314 | 0 | 0 | 0 | none |
| 390 | 369×1243 | 0 | 0 | 0 | none |
| 844×390 | 691×854 | 0 | 0 | 0 | none |
| 1024 | 633×979 | 0 | 0 | 0 | house kicker only |
| 1440 | 1008×977 | 0 | 0 | 0 | house kicker + house `small` |
| 1920 | 1485×997 | 0 | 0 | 0 | house kicker only |

The remaining sub-11px values on desktop are `.career-section-head span` at 8px
and `small` at the 10.75px desktop house scale — both shared by every panel in
the game, both above the compact floor where it applies, and neither introduced
here. No touch target under 40px.

### Links

- League overview: 33 club links; clicking opens the correct profile.
- Fixtures route: 76 club links across 38 fixtures; clicking opens the correct
  profile; zero row overflow.
- Table and fixture links compute to 13px on compact — the 7px fallback is not
  reached.

### Audit parity at 390×844

Run against `dist/strikewatch-build-12.234.html` in a second tab, same seeded
state and same route sequence.

| Metric | 12.234 | 12.235 |
| --- | --- | --- |
| `overlapping` | 0 | 0 |
| `collapsed` | 0 | 0 |
| `overflow` | 1 | 1 |
| `tinyText` | 231 | 231 |
| `smallTargets` | 0 | 0 |

`typographyConsistencyForTest()` is green on both. `navigationSubmenuForTest()`
returns ok with the new contextOnly route present.

### Release gate

- All 44 source modules parse; generated bundle parses; both standalone inline
  scripts parse. Standalone contains zero external `css/` links.
- Two consecutive builds byte-identical: bundle `508ad0b7a96cfe1f…`, standalone
  `fc7f91c20b4a8105…`. Root `cod.html` byte-identical to the standalone.
- CSS debt within budget: **important 2269/2270**, **media 484/484**,
  `game.css` 30724/31090. No flagged declaration and no media query added.
- No new browser console errors.

## Verification hazard worth keeping

**The development page caches the bundle by build id.** `index.html` requests
`js/strikewatch.dev.js?v=<BUILD_ID>`, so every rebuild *within the same version*
reuses one URL and the browser serves the previous bundle. During this build the
served file on disk contained the fixtures change while the running page did not
— which looks exactly like a code fault and is not one. Verify against
`dist/strikewatch-build-<version>.html?cb=<n>`, where the buster is on the
document URL itself and the script is inlined, or bump the build id between
rebuilds.

## Still outstanding from the original request

- **Own squad and market players** already have a working destination
  (`data-team-profile` → the `profile` route). Their names are not yet linked in
  mail, calendar and report copy where they appear as plain text; that is a
  small, self-contained follow-up.
- **Rival players** now have a visible home on this page, but their names in
  press and mail copy remain plain text. `js/39-dynamic-market-mail.js` carries
  `playerName` as a string, and `teamPlayerById()` resolves only the squad and
  the market, so linking them needs a resolvable world-player record and a
  read-only profile view.
