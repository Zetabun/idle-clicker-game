# Build 12.230 — Operations Today Instrument Panel

Restyles the Operations Today surface so it reads as a game console rather than
a row of web widgets. Presentation only: the same five items, the same routes,
the same underlying state.

## What changed

**Header.** The date and the week/season counter were one dot-joined run-on
(`SATURDAY 22 AUGUST 2026 · WEEK 3 · SEASON 1`). They are two different facts
and are now split by a rule, with the green kicker above and the explainer
pushed to the far edge. Sourced from `clubCurrentDateParts()`;
`clubCurrentDateLabel(false)` remains the fallback.

**Columns.** Each card now carries a line icon beside its label, an accent rule
under the label, and a status footer with its own icon and accent edge. One
`--today-accent` variable drives the glyph, the label, both rules and the status
text, so a tone change is a single declaration.

**Detail split.** Two items were cramming separate facts into one sentence.
Fixture was `HOME · MATCHDAY 3 · plan confirmed`; it is now `HOME · MATCHDAY 3`
with `Plan confirmed` beneath. Squad was readiness, fatigue and medical flags in
one line; the medical count moves to its own line.

**Icons** are inline SVG on the same 24-unit grid and stroke convention the
onboarding pills already use, so nothing is added to the asset-free boundary and
no new drawing authority appears. `currentColor` lets each glyph inherit its
column's tone.

## Five things that had to be worked around

**1. Flex, not grid, because five columns never divide evenly.** The first
attempt used `repeat(auto-fit, minmax(...))`. At four across the fifth column
orphaned and left a dead quarter-row beside it — visible and wrong. Flex wrap
lets a short final row stretch to fill, so 3+2, 4+1 and 2+2+1 all read as
deliberate and no width leaves dead space.

**2. The compact overrides silently did nothing.** They were added inside the
existing `@media (max-width: 1023px)` block near the top of
`compact-navigation.css`, but the Build 12.202 base rules are declared *later*
in the same file. At equal specificity the base won on source order, so the
mobile header stayed right-aligned. Every compact selector now carries a
`.command-today-panel` prefix. **This file is ordered media-queries-first,
base-rules-second — a compact override here needs specificity, not just
position.**

**3. The Command Skin outranks a single class.** `background` on
`.command-today-panel` never landed: the skin paints every
`#menuContent > section[class]:not(…)` with a far more specific selector. Rather
than fight it, the panel now redefines `--skin-panel-hi` / `--skin-panel-lo`
locally and lets the skin's own gradient paint the dark values — no
`!important`, and the panel stays inside the theming system.

**4. The card background did need `!important`.** A bare
`button { background: … !important }` in `game.css` beats any specificity — the
same hazard Build 12.132 recorded for `border`. That is the one flagged
declaration here. The card border is deliberately left to the skin: its value is
already the right weight and the important-declaration budget is nearly spent
(2268 of 2270).

**5. A wrapping status value made the row ragged.** The footer rule is
bottom-anchored, so when `31 AUG 2026 · 23D` wrapped to two lines it lifted its
own rule ~10px above its neighbours'. It wrapped at 320px *and* at 1280px. Fixed
by reserving two lines of footer height (`calc(2.6em + …)`) so the rule's
position is independent of the value's length, plus tighter tracking so the
common one-line case does not wrap at all. `lh` would express the height more
directly but is far too new to depend on.

## No new media queries

The CSS-debt gate caps them and the count was already sitting on its ceiling at
484/484. Everything scales through `clamp()` against the viewport; the only
compact rules added live inside the two media queries that already existed.
Final debt: **media 484/484, important 2268/2270, both within budget.**

## Responsive matrix

Measured with the panel rendered in situ. "Ragged" counts rows whose status
rules do not share a top edge.

| Width | Rows | Card widths | Ragged | Overflow |
| --- | --- | --- | --- | --- |
| 320 | 5 | 279 | 0 | none |
| 375 | 3 | 164 ×4, 335 | 0 | none |
| 430 | 3 | 191 ×4, 389 | 0 | none |
| 860 | 2 | 167 ×4, 688 | 0 | none |
| 844×390 | 2 | 172 ×4, 690 | 0 | none |
| 1024 | 2 | 199 ×3, 302 ×2 | 0 | none |
| 1280 | 1 | 159 ×5 | 0 | none |
| 1920 | 1 | 282 ×5 | 0 | none |

320px falls to one card per row rather than two; at that width a 137px column
would put "Readiness needs attention" on four lines, and a single readable
column is the better trade. Title type never drops below 13px, detail never
below 12px.

## After review feedback

Two adjustments were made after seeing the first pass:

- **Separation.** The columns were originally divided by a 1px hairline (the
  container background showing through a 1px gap). That read as a single ruled
  table — the cards blended together. The gap is now
  `clamp(7px, .75vw, 11px)` with per-card borders and shadows, so each card sits
  apart.
- **Darker.** The panel housing went to near-black (`#05090f` → `#02050a`) and
  the cards to `#04080e`, replacing the mid-blue gradient.
- **Card gradient.** Each card carries a shallow top-lit gradient with a 7% wash
  of its own tone colour, so the five columns are distinguishable at a glance
  before any text is read. Held under 8% or the panel stops looking black.

## Gates

Green: `typographyConsistencyForTest`, `navigationSubmenuForTest`,
`matchGestureForTest`, `guidanceConsolidationForTest`, `economyGuidanceForTest`,
`firstMatchPayoffForTest`, `leagueMatchFlowForTest`.

All 45 modular files and both standalone inline scripts parse. Two builds
produced identical dev-bundle and standalone hashes. Root `cod.html` is
byte-identical to `dist/strikewatch-build-12.230.html`. Save schema 19 and
diagnostics schema 1 are unchanged.

`mobileInterfaceAuditForTest()` at 375px reports overlapping 0, collapsed 0,
overflow 2, tinyText 223 — **identical to the untouched 12.229 artifact audited
in an iframe at the same width**, down to the same two offending nodes
(`nav.league-section-jumps` overshoot 10 on League, an SVG overshoot 8 on
Profile). Both predate this build; the new panel contributes none of it.

## Known pre-existing failure, not introduced here

`firstMatchGuidanceForTest()` still returns `ok: false` on its
`savesAdditionalChecklist` assertion, unchanged from 12.225 onward.

## Do not

- Do not put the compact overrides after the base rules without the
  `.command-today-panel` prefix, or restore the prefix-free selectors. This file
  declares its media queries before its base rules.
- Do not declare `background` on the panel expecting it to win. Redefine
  `--skin-panel-hi` / `--skin-panel-lo` instead.
- Do not remove the `!important` on the card background; a bare `button` rule
  carries the flag.
- Do not return to a 1px divider. It was tried and the cards blended.
- Do not remove the footer `min-height`. Without it any status value that wraps
  drags its accent rule out of line with the rest of the row.
