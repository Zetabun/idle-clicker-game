# Build 12.135 — Open Containers audit

## Scope

1. Training Squad cards rendering as empty boxes on mobile.
2. League table not updating after a league match.
3. League table type too small.
4. Event Agenda readability on both targets, and duplicated row copy.
5. Training and development readability on desktop.

## 1. Collapsed containers — the "cards are not loading" defect

### Cause

`#menuContent` is a grid with a definite block size on compact viewports. Per
the grid sizing rules a grid item whose `overflow` is not `visible` gets an
**automatic minimum size of zero**, so when the grid distributes a definite
height those rows can be squashed to padding height. Every management panel in
this family declares `overflow: hidden`, so the panel rendered as an empty box
while its content still existed underneath, clipped.

Measured on the Training route at 390px: `.training-roster-panel` had
`clientHeight` 18px against `scrollHeight` 2724px, with five fully laid out
1400px cards inside it. Removing `overflow: hidden` restored the panel to
2725px, confirming the mechanism.

### Extent

A new detector — `mobileInterfaceAuditForTest().collapsed` — flags any direct
child of the scroll container clipping more than half its own content. It found
**18 collapsed containers across 13 routes**, not just Training:

| Route | Panel | Clipped to | Real height |
| --- | --- | --- | --- |
| training | `.training-roster-panel` | 18px | 2724px |
| training | `.development-benefits-panel` | 18px | 1106px |
| training | `.development-intro-panel` | 22px | 417px |
| league | `.league-table-panel` | 18px | 1041px |
| league | `.league-intro-panel` | 22px | 343px |
| reports | `.career-tactical-analysis` | 30px | 2579px |
| operators | `.squad-dynamics-panel` | 0px | 1490px |
| calendar | `.club-calendar-shell` | 0px | 549px |
| profile | `.player-development-panel` | 0px | 472px |
| store | `.ammo-store-panel` | 18px | 1012px |
| loadout | `.career-squad-loadout-panel` | 16px | 603px |
| mail | `.club-mail-client` | 323px | 782px |

### Fix

Restoring a content-based minimum on the scroll container's children fixes
every one at once:

```css
#menuContent > * { min-height: max-content; }
```

After: **0 collapsed containers on every route**, Training renders all five
cards, and the league table panel reports `clientHeight === scrollHeight`.

The detector also skips a closed `<details>`, which legitimately hides its own
content and was the only false positive in the first run.

## 2. League table not updating

### Cause

`settleLeagueAfterCareerMatch` resolved the fixture through
`league.activeFixtureId`. When that id stopped resolving the function returned
`null` — the match had been played and presented as a league fixture, but
nothing was written to the table and the result was discarded silently.

The id can stop resolving because the league state is rebuilt whenever
`careerState` is replaced (save reload, import, recovery): `ensureLeagueState`
caches by object identity, so a replaced career misses the fast path and
re-derives the schedule, invalidating stored ids. The Build 12.134 report
change made the symptom visible — the report showed the generic "Counts
towards the league table" line because `summary.league` was absent.

### Fix

- `leagueRecoverSettlementFixture` writes the result into the correct fixture
  when the prepared one is missing or already simulated: the same opponent's
  next unplayed fixture, otherwise the next unplayed user fixture. Only when the
  season genuinely has no fixture left does the settlement report a
  non-counting result, and it now says so explicitly (`unrecorded: true`)
  instead of returning nothing.
- `leaguePreparedContextValid` gates reuse of a stored context.
  `startMatchmakingSearch` previously skipped preparation whenever `activeMode`
  was set, which sent the manager into a "league" match built on a stale
  fixture. A stored context is now only reused while it resolves to a real,
  unplayed fixture.

### Verification

`orphanedLeagueFixtureForTest()` prepares a league match, then orphans
`activeFixtureId` before settlement:

| | Before | After |
| --- | --- | --- |
| Active fixture resolves | no | no |
| Settled mode | `null` | `league` |
| Result recorded | no | yes (points 6 → 9) |
| Recovered opponent | — | Longfield Protocol, matchday 3 |

`leagueMatchFlowForTest()` confirms the normal path is unchanged: mode
`league`, fixture played, points and position updated, all rival fixtures for
that matchday simulated.

## 3–5. Readability

Rules land in the Build 12.135 layer at the release end of `css/game.css`,
scoped to `#menuContent` because several older rules are already scoped there
and were winning on specificity.

**League table** — headers 6px → 10px desktop / 11px compact; rows 7px → 11/12px;
club name → 12/13px; sub-line → 10.5/11px, wrapping on compact with a 52px row.

**Event Agenda** — the row already printed the type, title and detail, and then
reused the calendar-grid button, which repeated the title *and* the detail a
second time inside the row. That is the duplicated ghost text in the report.
`clubCalendarAgendaActionMarkup` now renders a short action label
(`OPEN MATCH`, `REVIEW OFFER`, `OPEN FINANCES`…) keyed by event type, with the
full description kept on the accessible name and tooltip. Date chip 5.5–6px →
10/11px, day number → 22/24px, type → 10/11px, title → 13/15px, detail →
11/12px. Below 1024px the row drops to two columns and the action moves under
the description as a 44px target instead of squeezing into a third column.

**Training and development** — card header 5.8px → 10/11px, name 10px → 13/15px,
meta 6px → 10.5/11.5px, programme select 7px → 11.5/13px with a 40/46px control,
result note 6.3px → 11/12px, metrics → 10.5/11.5px, intro panel copy → 11.5/12.5px.

## Verification gates

- `py -3 build.py` succeeds; two consecutive builds byte-identical.
- Standalone parses and boots; title, `window.__STRIKEWATCH_BUILD__` and both
  visible labels resolve to 12.135 / `12.135.0-open-containers`.
- No console errors.
- Root `cod.html` byte-identical to `dist/strikewatch-build-12.135.html`.
- `scrollWidth === clientWidth` at 390 and 1440.

### Measured results

| Check | 390px | 1440px |
| --- | --- | --- |
| Collapsed containers | 0 | 0 |
| Horizontal overflow | 0 | 0 |
| Undersized touch targets | 0 | 2 |
| Training cards rendered | 5 | 5 |
| League panel clipped | no | no |
| Agenda action duplicates row copy | no | no |

Regressions: gold ledger integrity, stale-save guard, decision rotation and the
recommended-plan warning all still pass.

## Responsive review targets

320, 375, 390, 430, 1024, 1366 and 1920 CSS pixels, with attention to Training,
League, Calendar, Reports, Operators and the Armoury.
