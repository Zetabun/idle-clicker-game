# Build 12.236 — Operator Links & Plain Name Controls

## Summary

Two changes, both about names as controls.

1. **Operator names in press and market copy open their profile** — but only
   when a profile exists to open.
2. **Name controls read as ordinary text.** Build 12.235 gave club links a
   permanent underline, which made a league table look like a page of
   hyperlinks. At rest a club or operator name is now indistinguishable from
   the copy around it.

Presentation and navigation only. No gameplay, persistence or schema change.
Save schema 19 and diagnostics schema 1 are unchanged.

## The linking rule

`careerPlayerLinkMarkup(playerId, label)` in `js/36-team-management.js` is the
single authority. It emits a control **only** when `teamPlayerById()` resolves
the id, which covers `careerState.squad` and `careerState.market`. Everyone else
named in press or market copy — a rival club's operator, someone who has left
the pool — has no profile page to open, so their name stays plain text.

That conditional is the whole point: a name that looks and behaves like a
control but leads nowhere is worse than plain text. The helper takes the **raw**
name and escapes internally, so call sites must not pre-escape.

Verified live on a League Pulse feed carrying six Man of the Match credits:

| Name | In squad/market | Rendered |
| --- | --- | --- |
| Freya Thomas | yes | control |
| Jonah Roberts | no | plain text |
| Anya Bennett | no | plain text |
| Max Martin | no | plain text |
| Lewis Santos | no | plain text |
| Felix Lewis | no | plain text |

Award leaders in the same state were all rival players and all rendered plain,
as intended.

## Surfaces changed

| Surface | File | Result |
| --- | --- | --- |
| League Pulse Man of the Match credit | `js/56-world-press-awards.js` | 1 of 6 linked, correct one |
| League Pulse award leaders | `js/56-world-press-awards.js` | conditional, none resolvable in the tested state |
| Living market pulse headline | `js/39-dynamic-market-mail.js` | 5 of 5 arrivals linked |

Clicking "Freya Thomas" in a press report opened her profile; clicking
"Zara Cole" in the market pulse opened hers. Both verified by reading the
resulting page heading.

### Ordering hazard

`playerLink` is a `const` arrow used by **`reportMarkup`**, which is declared
first in `renderWorldPressLeaguePulse()`. Declaring the helper next to
`leadersMarkup`, where it was first needed, put it in the temporal dead zone for
`reportMarkup` and would have thrown at render. It is declared above
`pressClub`, ahead of both consumers.

## Plain-text presentation

`css/compact-navigation.css` now styles `.league-club-link` and
`.career-entity-link` together:

- `text-decoration: none` at rest (was `underline` with a tinted decoration
  colour in 12.235).
- Colour, font, weight, size, letter-spacing and alignment all inherit, so the
  control is pixel-identical to the copy it sits in.
- The only resting signal is `cursor: pointer`, which appears exactly when the
  name is worth clicking.
- Hover lifts the colour to `#bfe6ff` — no rule is added, so the affordance
  never reads as link styling.
- `:focus-visible` keeps a real 2px outline. That is an accessibility
  requirement rather than decoration, and it only appears during keyboard
  navigation.

Measured at rest, every link type is indistinguishable from its parent:

| Surface | Decoration | Colour vs parent | Size vs parent |
| --- | --- | --- | --- |
| Club in league table | none | identical | 12px / 12px |
| Player in press report | none | identical | 10.75px / 10.75px |
| Player in market pulse | none | identical | 9px / 9px |
| Club in fixtures list | none | identical | 7px / 7px |

The 7px and 9px values are the existing desktop house sizes of those rows, not
something this build sets; the link inheriting them is the correct behaviour and
they are raised on compact (fixtures links measure 13px at 390px).

## Verification

Career driven to a settled post-first-match state, measured on the standalone
artifact with a cache-busting query rather than the development page.

### Audit parity at 390×844

Same seeded state and route sequence as the 12.235 measurement.

| Metric | 12.235 | 12.236 |
| --- | --- | --- |
| `overlapping` | 0 | 0 |
| `collapsed` | 0 | 0 |
| `overflow` | 1 | 1 |
| `tinyText` | 231 | 231 |
| `smallTargets` | 0 | 0 |

`typographyConsistencyForTest()` green on both.

Note the market pulse needs `openDynamicMarketForTest()` to populate its event
log; a freshly seeded career renders the `quiet` empty state and advancing days
alone did not generate listings. Audit figures above are from the clean state
**without** that hook, so the two builds are compared like for like.

### Release gate

- All 44 source modules parse; generated bundle parses; both standalone inline
  scripts parse. Standalone contains zero external `css/` links.
- Two consecutive builds byte-identical: bundle `759db15c6e64df7d…`, standalone
  `79114e8b0fba694a…`. Root `cod.html` byte-identical to the standalone.
- CSS debt within budget: **important 2269/2270**, **media 484/484**. No flagged
  declaration and no media query added.
- No new browser console errors.

## Deliberately not done

**Mail bodies and calendar agenda titles.** Both are plain strings escaped as a
whole at render — `escapeCareerHtml(event.title)` in the agenda,
`String(body)` in `clubAddMail()`. Injecting a control would require splitting
those records into parts, which is a data-model change rather than a
presentation one, so mail and calendar copy still name players as plain text.

**Rival operator profiles.** Rival players are visible on the club profile page
added in 12.235, but they remain unlinkable in press copy because there is no
read-only profile view for a player outside the squad and market. That remains
the one outstanding piece of the original request, and it is the piece that
touches persistence.
