# Build 12.233 — Operations Today Status Board

## Summary

Operations Today is rebuilt from an instrument panel into a status board. The
surface was informative and evenly weighted, and the second of those was the
problem: a column reporting an End Day blocker was drawn exactly like a column
reporting that there was nothing to do, so the strip had to be read left to
right rather than glanced at. This release makes the tone states unequal, drops
one of the two horizontal rules inside every card, replaces the header's
explanatory sentence with a live count, and sets the card headlines in sentence
case.

Presentation only. No gameplay, calendar, blocker, route or persistence
behaviour changes. Save schema 19 and diagnostics schema 1 are unchanged.

## What was wrong

Measured on the 12.232 artifact at 1440×900 and 390×844:

1. **All five columns carried identical visual weight.** `urgent`, `attention`,
   `scheduled` and `complete` differed only in hue: the same card wash, the same
   rules, the same title colour. Nothing in the layout said which of the five
   areas wanted a decision.
2. **Two full-width rules per card.** A 2px accent rule under the label and a
   second above the status footer, inside a card 187px wide. Five across, that
   is fifteen horizontal bands in one strip.
3. **The headline was all-caps.** Build 12.231 uppercased these titles to match
   the command chrome. The strings are short sentences — "Calendar locked by 2
   responses" — and they wrap to two lines at every supported width. Capitals
   remove the word shapes that make a wrapped line scannable.
4. **The header explained itself.** "One compact view of the fixture, squad,
   inbox, commitments and end-day state" named the five columns rendered
   directly beneath it, right-aligned and ragged against a left-aligned date.
5. **The status value was the smallest thing on the card.** The one-word fact
   the manager actually scans — `TODAY`, `2 LOCK`, `11 PTS` — sat at the card
   floor at 10.5px, below the supporting copy.
6. **The footer reserved height it did not need.** `min-height: calc(2.6em +
   clamp(18px, 1.8vw, 24px))` existed because a bottom-anchored rule has to
   align across all five columns, so a wrapping value lifted its own rule out of
   line. Every card paid two lines of height so that one card could occasionally
   use them.

## What changed

### `css/compact-navigation.css`

- **A state is now one decision.** Each tone class sets `--today-accent`,
  `--today-wash`, `--today-band` and `--today-cap` together, so a card's hue,
  background wash, status-band solidity and top-cap brightness always agree.
- **The states are deliberately unequal.** `complete` is washed at 6%, capped at
  42% alpha and titled `#c6d6e0`; `urgent` is washed at 16%, capped at full
  accent and titled `#eef5fa`. Measured perceived luminance of the card's washed
  corner: complete 0.111, scheduled 0.125, urgent 0.159, attention 0.162 — the
  outstanding columns are 43–46% brighter than the resolved one. Status bands:
  complete 0.121 against urgent 0.190, a 57% difference.
- **The status footer becomes a filled band flush with the card floor**, escaping
  the card's side padding through `margin-inline: calc(var(--today-pad) * -1)`
  and clipped to the border by the card's existing `overflow: hidden`. The
  reserved two-line `min-height` is retired: a band anchored by its bottom edge
  can be taller on one card without reading as misalignment, which a rule that
  must align across five columns cannot.
- **One interior rule removed.** The accent rule beneath the label is gone; tone
  now arrives through the 3px top cap, the glyph and the band.
- **The top cap is `::before`, not `border-top`.** The Command Skin flags
  `border` on a bare `button` (Build 12.132), so a real border would have cost
  flagged declarations against a budget with one slot left in the project.
  `button::before` is outside that selector and costs none.
- **A chevron affordance** in the band, built from two borders on
  `b::after` — no markup, no glyph, no icon. Nothing previously said these cards
  opened a route.
- **Sentence-case headlines**, reversing 12.231. See the note below.
- **The note line** (`small > u`: "Plan confirmed", "1 medical flag") is now
  tone-tinted at weight 600, so it reads as a state rather than as a second
  sentence continuing the detail line above it.
- **Per-tone footer colours removed.** The three hand-picked values (`#ffab9f`,
  `#f0d17d`, `#79dfbd`) are replaced by one derived
  `color-mix(in srgb, var(--today-accent) 74%, #f4fbff)`, so a future tone needs
  no extra rule.

### `js/36-team-management.js`

- The header's explanatory sentence is replaced by `.command-today-pulse`, a
  status readout with a lamp dot: `3 OF 5 NEED ATTENTION` (tone `urgent` if any
  column is urgent, otherwise `attention`) or `ALL 5 AREAS CLEAR` (tone
  `complete`). Derived from the timeline that is already computed; no new
  authority and no new state.
- `teamCommandFixtureSnapshot()` returns `home` as data. The fixture column's
  detail line is composed locally as `Home · Matchday 3` rather than reusing the
  all-caps `location` tag, which would have been the only shouted line in the
  strip. `location` itself is unchanged — the fixture card and the guided flow
  still render it as a tag.

## The sentence-case reversal

Build 12.231 recorded "card titles stay uppercase" as an invariant. This build
reverses it deliberately, and the reason is scoped rather than general: uppercase
is right for a kicker of one or two words and wrong for a wrapped sentence. The
all-caps department label directly above each headline still gives the card its
command-chrome voice; the headline's job is to be read. Every other all-caps
kicker on the surface is unchanged.

## Verification

Career driven to a settled post-first-match state through
`seedReadabilityCareerForTest(5)` → `confirmMatchdayPlanForTest()` →
`leagueMatchFlowForTest(3,1)` → `reports` → a saved training programme, then
`setMenuRouteForTest('play')`.

### Responsive matrix — computed geometry

| Width | Panel | Wrap | Card widths | Bands flush | Item overflow | Doc overflow |
| --- | --- | --- | --- | --- | --- | --- |
| 1920 | 1485×304 | 5 | 282 ×5 | yes | 0 | 0 |
| 1440 | 1008×308 | 5 | 187 ×5 | yes | 0 | 0 |
| 1366 | 938×299 | 5 | 174 ×5 | yes | 0 | 0 |
| 1024 | 633×372 | 3+2 | 199×3, 302×2 | yes | 0 | 0 |
| 844×390 | 691×425 | 4+1 | 163×4, 672 | yes | 0 | 0 |
| 390 | 369×596 | 2+2+1 | 171×4, 349 | yes | 0 | 0 |
| 320 | 299×821 | 1×5 | 279 ×5 | yes | 0 | 0 |

"Bands flush" is the status band's bottom edge measured against the card's
bottom edge: −1px at every width, which is the card border. Every band is the
same height within a row.

**`31 AUG 2026 · 23D`**, the longest real value, holds one line at every width
including 320px, where all five bands measure 32px. The retired two-line reserve
was never being used.

### Panel height

- 1440px: 330 → 308 (−22px)
- 390px: 677 → 596 (−81px)

### Audits — 12.233 against the 12.232 artifact at 390×844

Run side by side, the new build in one tab and
`dist/strikewatch-build-12.232.html` in another, per the Build 12.230 note that
this audit must be compared against the previous artifact rather than against
zero.

| Metric | 12.232 | 12.233 |
| --- | --- | --- |
| `overlapping` | 0 | 0 |
| `collapsed` | 0 | 0 |
| `overflow` | 1 | 1 |
| `smallTargets` | 0 | 0 |
| `tinyText` (whole app) | 230 | 223 |
| `tinyText` (`play` route) | 36 | 34 |

`typographyConsistencyForTest()` returns the identical check set on both builds:
`tutorialReadable: false`, everything else true. That single failure is
pre-existing, belongs to the tutorial card and is untouched here.

### Computed presentation

All four tones verified through `getComputedStyle`, including pseudo-elements:
cap `3px` at the intended per-tone colour, band background and border resolving
from `--today-band`, `text-transform: none` on every headline, weights 700
(title) / 400 (detail) / 600 (note) / 900 (kickers and band), and the `6×6`
chevron present at `opacity .48`. `color-mix()` fed a percentage from a custom
property resolves correctly in every tone — the four card washes compute to four
distinct `color(srgb …)` values.

### Release gate

- All 44 source modules parse; the generated bundle parses; both standalone
  inline scripts parse. (`fetch` + `new Function`; there is no `node` on this
  machine.)
- Standalone contains zero external `css/` stylesheet links.
- Two consecutive builds are byte-identical:
  bundle `610f0e1aad5d81bf…`, standalone `203103a8f8d1d3d7…`.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.233.html`.
- CSS debt unchanged and within budget: **important 2269/2270**, **media
  484/484**, `game.css` 30724/31090. This build adds no `!important` and no
  media query; both compact blocks it touches already existed.
- No new browser console errors.

## Known limitation

The redesign was verified through computed geometry and computed style, not
against a rendered capture at every width. The browser pane stopped compositing
partway through the session (`requestAnimationFrame` fires zero frames and
screenshots time out; only the user can restore the pane), which is the trap
recorded against Build 12.152. Layout, colour and type were all read back
through forced synchronous layout, which remains valid — but a capture-based
review of the finished surface at 1024 and 320 has not been done.

## Adjacent observation, not changed here

`renderClubCalendarStrip()` renders directly above this panel on the Operations
overview and its first column repeats the same date the Today header now owns,
while its second repeats the fixture countdown the FIXTURE column reports. It is
shared by eight routes and also emits `renderDevelopmentAlertsStrip()`, so
suppressing it on Operations is a scoped product decision rather than a
presentation fix, and it was left alone.
