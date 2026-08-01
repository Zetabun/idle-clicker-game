# Build 12.237 — Development Alert Pulse

## Summary

The development alert cards — `N POINTS READY`, `N STAT POINTS READY`,
`N ITEMS NEED ATTENTION` — now pulse. They announce rewards the manager has
already earned and not yet spent, and they were the quietest thing on a page
that also carries MUST RESPOND, the season objectives and the fixture card.

Presentation only. No gameplay, persistence or schema change. Save schema 19
and diagnostics schema 1 are unchanged.

## Why the smaller alert and not the larger one

MUST RESPOND is deliberately **not** given motion. It already commands the page
by size, colour and position, so adding a pulse there would compete rather than
guide. Motion is spent on the alert that is easy to miss, which puts the two
surfaces on a comparable footing without making either louder than it should be.

## How it animates

The pulse is `opacity` on a pseudo-element, never on the card itself:

```
.development-alert-strip button { position: relative; }
.development-alert-strip button::after { … opacity: 0; animation: developmentAlertPulse 2.4s ease-in-out infinite; }
@keyframes developmentAlertPulse { 0%, 100% { opacity: 0; } 50% { opacity: .9; } }
```

- **Opacity is a compositor property.** The browser promotes the layer for the
  animation's duration and repaints nothing. Animating `box-shadow` or
  `border-color` on the button directly would repaint the whole card every
  frame.
- **`will-change` is deliberately omitted** (Build 12.152). An actively
  animating element is promoted anyway, and declaring it would hold a permanent
  compositor layer for a card that is usually absent from the page entirely.
- **The glow sits outside the button** (`inset: -1px`) so it never disturbs the
  copy, and carries `pointer-events: none` so the whole card stays clickable
  through it.
- **Staggered** by `.35s` and `.7s` on the second and third cards, so two or
  three alerts read as a sequence rather than one block flashing in unison.

## Reduced motion

The rule is added to the **existing** `@media (prefers-reduced-motion: reduce)`
block in `css/game.css`, not a new one — the debt gate caps media queries and
sits on that cap at 484/484.

It uses no override flag and needs none: the reduced-motion block is at CSSOM
rule index 2121 against the animation rule's 1539, so equal specificity wins on
source order. Verified live. The budget has exactly one flagged declaration left
in the whole project, so this mattered.

The glow settles at `opacity: .5` rather than disappearing, so the card is still
marked as live for anyone who has asked for reduced motion.

## Verification

Career driven to a state carrying both alert cards — `25 POINTS READY` and
`5 STAT POINTS READY`, matching the reported screenshot — then measured on the
standalone artifact with a cache-busting query.

### Animation

The browser pane was not compositing during this session
(`document.timeline.currentTime` advanced 0ms and `requestAnimationFrame` fired
0 frames in 600ms), so the pulse could not be watched. It was verified instead
by **scrubbing the animation manually** — setting `animation.currentTime` and
reading the computed value at each point, which does not need frames:

| `currentTime` | `::after` opacity |
| --- | --- |
| 0ms | 0 |
| 600ms | 0.45 |
| 1200ms | 0.9 |
| 1800ms | 0.45 |
| 2400ms | 0 |

That is the intended curve exactly. Applied state confirmed on both cards:
`animation-name: developmentAlertPulse`, `2.4s`, `infinite`, delays `0s` and
`0.35s`, `pointer-events: none`, and `position: relative` on the buttons.

### Clickability

Clicking the first card navigated to **TEAM & PLAYER DEVELOPMENT**, so the glow
does not intercept. `elementFromPoint` was not usable — the strip sits at
y=1137 in an 844px viewport and scroll does not settle without frames — so the
functional click plus the computed `pointer-events: none` are the evidence.

### Audit

`mobileInterfaceAuditForTest()` at 390×844 reported 235 against the 12.236
artifact's 231, which looked like a regression and is not one. Two findings:

1. A node-level diff of every sub-11px element on the `play` route showed the
   `.development-alert-strip` contribution **identical** in both builds (2
   nodes). The differences were `BUTTON.warning` vs `BUTTON.complete` counts in
   `opening-week-preparation` and a `B.minor` vs `B.fit` medical flag in the
   line-up — **career state that diverges between page loads**, not markup.
2. Decisive check: deleting all four Build 12.237 rules from the live CSSOM and
   re-running the audit returned **223 both with and without them**. The CSS
   provably does not affect the metric.

`overlapping` 0, `collapsed` 0, `overflow` 1, `smallTargets` 0 and
`typographyConsistencyForTest()` green, all matching 12.236.

**Note for future comparisons:** `tinyText` is state-sensitive. Two runs of the
same build can differ by a few nodes because injuries and preparation states are
simulated. Compare the node lists, or toggle the rules under test in the live
CSSOM, rather than trusting the raw total across separate page loads.

### Release gate

- All 44 source modules parse; generated bundle parses; both standalone inline
  scripts parse; `@keyframes developmentAlertPulse` present in the standalone.
  Standalone contains zero external `css/` links.
- Two consecutive builds byte-identical: bundle `f1c62b86137f0090…`, standalone
  `dc4016321059d14a…`. Root `cod.html` byte-identical to the standalone.
- CSS debt within budget: **important 2269/2270**, **media 484/484**,
  `game.css` 30767/31090. No flagged declaration and no media query added.
- No new browser console errors.
