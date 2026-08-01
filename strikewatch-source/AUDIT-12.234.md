# Build 12.234 — Board Surface & Compact Blocker Header

## Summary

Two reported presentation defects, both long-standing, both caused by a rule
that stopped matching the markup it was written for.

1. **Board Expectations was painted near-black.** Its authored background has
   never applied, because the Command Skin outranks it. The skin's default pair
   fades to `rgba(11, 17, 30, .95)` at the bottom, and three objectives in a
   two-column grid leave one empty cell — so the fade showed as a black hole
   beside the cards.
2. **The expanded MUST RESPOND disclosure printed its header as one unbroken
   run of text on compact.** `game.css` styles
   `.club-must-respond-strip > header`; Build 12.201 moved that header inside
   `.club-must-respond-body`, so the selector stopped matching and its children
   fell back to `display: inline` in a zero-height block.

Presentation only. No gameplay, blocker, route or persistence behaviour
changes. Save schema 19 and diagnostics schema 1 are unchanged.

## 1 — Board Expectations surface

### Cause

`css/compact-navigation.css` (Build 12.205 block) declares:

```
.board-expectations-panel { background: linear-gradient(145deg, rgba(29,30,39,.97), rgba(12,23,37,.97)) }
```

The Command Skin paints every `#menuContent > section[class]`, a far more
specific selector, so this declaration has never won. Measured on the 12.233
artifact, the panel computes to the skin default:

```
linear-gradient(rgba(24, 33, 54, .92), rgba(11, 17, 30, .95))
```

The lower stop composites to roughly `#0b111d` over the page ground — the
"black" in the report. This is the same class of fault Build 12.230 documented
for `.command-today-panel`.

### The empty cell

`.board-objectives-grid` used `repeat(auto-fit, minmax(min(100%, 190px), 1fr))`.
Three objectives divide evenly into one or three columns but not two, so at two
columns the third orphans and the grid reserves a dead cell beside it. Measured
by forcing the grid width on the 12.233 artifact:

| Grid width | Rows | Dead space right of last card |
| --- | --- | --- |
| 360 | 1+1+1 | 0 |
| 400 | 2+1 | **204px** |
| 450 | 2+1 | **229px** |
| 500 | 2+1 | **254px** |
| 560 | 2+1 | **284px** |
| 585 | 2+1 | **297px** |
| 600 | 3 | 0 |
| 750 | 3 | 0 |

So the defect is real for any grid width between 388px and 585px, and invisible
outside it — which is why it had not been reported before.

### Fix

- The panel sets `--skin-panel-hi: rgba(27, 38, 60, .95)` and
  `--skin-panel-lo: rgba(20, 29, 46, .95)`, redefining the two variables the
  skin reads rather than declaring a background the skin will outrank. Keeps a
  shallow top-lit fall, never reaches near-black, and stays in the blue-grey
  family the rest of the command chrome uses.
- `.board-objectives-grid` becomes `display: flex; flex-wrap: wrap` with
  `.board-objective-card { flex: 1 1 190px }`, so a short final row stretches to
  fill. Same reasoning and same fix as the five columns of Operations Today.

Re-measured after the fix: **dead space is 0 at every width in the table
above.**

Note the near-black fade is the skin default on **every** panel; this one is
simply the only surface that exposes it. The correction is deliberately scoped
to Board Expectations rather than changing the global skin, which would restyle
the whole application.

## 2 — Compact MUST RESPOND header

### Cause

The render site is `js/39-club-operations.js`:

```
<details class="club-must-respond-strip">
  <summary>…</summary>
  <div class="club-must-respond-body">
    <header><span>MUST RESPOND</span><strong>N ACTIONS REQUIRED…</strong><small>Resolve…</small></header>
```

`game.css` styles `.club-must-respond-strip > header` — a **direct** child.
There is no direct-child header in any render path; verified live,
`strip.querySelector(':scope > header')` is `null`. The rule is dead, so the
header had no display, no gap and no padding: `span`, `strong` and `small`
computed to `display: inline` inside a zero-height block and painted as

> MUST RESPOND2 ACTIONS REQUIRED BEFORE ENDING THE DAYResolve these items before advancing the calendar.

running past the panel edge.

### Fix

The header is hidden across the compact range, which is what Build 12.223
already does on desktop (`#menuContent .club-must-respond-body > header
{ display: none }`). Both targets now agree.

Laying the header out was considered and rejected: it restates the summary two
lines above it. With one blocker the summary already names that action; with
more, `summaryLabel` is already `"N REQUIRED ACTIONS"`, so the count survives on
both branches. Verified live at 390px:

- summary — `MUST RESPOND | 2 REQUIRED ACTIONS | RESPOND TO SPONSORSHIP OFFER · 1 more`
- body — `COMMERCIAL | 2 | RESPOND TO SPONSORSHIP OFFER | REDLINE MOBILE is waiting… | OPEN →`

The two now-dead rules in the `430px` portrait block that trimmed this header
are removed. `game.css`'s `> header` rules are **left in place, not
retargeted**: their 7px type predates the compact readability floors and would
fail them if they started matching.

## Verification

Career driven to a settled post-first-match state, then compared side by side
against `dist/strikewatch-build-12.233.html` in a second tab at the same
viewport and the same seeded state.

### Audit parity at 390×844

| Metric | 12.233 | 12.234 |
| --- | --- | --- |
| `overlapping` | 0 | 0 |
| `collapsed` | 0 | 0 |
| `overflow` | 1 | 1 |
| `smallTargets` | 0 | 0 |
| `tinyText` | 231 | 219 |
| `tinyText` (`play`) | 37 | 33 |

`typographyConsistencyForTest()` fails only on the pre-existing
`tutorialReadable`, identical to 12.233.

### Geometry

- 390px: objectives 1+1+1 at 335px, zero card overflow, zero document overflow.
- 1024px: 3 across at 194px, no dead space.
- 1440px: 3 across at 320px, no dead space.
- Expanded disclosure at 390px: header `display: none`, height 0, groups start
  at offset 0 within the body, zero horizontal overflow on the strip.

### Release gate

- All 44 source modules parse; generated bundle parses; both standalone inline
  scripts parse. Standalone contains zero external `css/` links.
- Two consecutive builds byte-identical: bundle `fdabc875d50bcc06…`, standalone
  `e8521a2a2d2dd533…`. Root `cod.html` byte-identical to the standalone.
- CSS debt within budget: **important 2269/2270**, **media 484/484**,
  `game.css` 30724/31090. No flagged declaration and no media query added.
- No new browser console errors.

## Trap worth keeping

**The CSS-debt gate counts raw string occurrences, comments included.**
`build.py` does `combined.count("!important")` over the concatenated
stylesheets, so writing that token in *prose* spends budget exactly as a real
declaration does. A draft of the Board Expectations comment named it and pushed
the count to 2270/2270 — sitting exactly on the ceiling and blocking the next
genuine need — for a comment. Reworded to "flagged declaration" / "override-flag
token"; the count returned to 2269.

## Still outstanding

The reported request to make team and player names clickable wherever they
appear is **not** in this build. It is not a polish item, and the reason is
structural:

- **Own squad and market players** already have a working destination
  (`data-team-profile` → the `profile` route, resolved by `teamPlayerById()`).
- **Rival and world players** named in press, League Pulse and mail are plain
  strings. `js/39-dynamic-market-mail.js` carries `playerName` as text and there
  is no rival-player store anywhere in the project — no `worldPlayers`,
  `rivalPlayers` or club squad collection exists. Giving those names a
  destination means generating and persisting world players, which changes the
  save schema.
- **Club names** have objects (`leagueClubById`) but **no destination at all**:
  there is no club or opponent profile route in `menuSections`. One would have
  to be designed and built.

Scoping this is a product decision and is left to the next build.
