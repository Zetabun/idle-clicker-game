# Build 12.132 — Selection Feedback audit

## Scope

- Give every match setup choice card an obvious selected state: Formation, Team
  Approach, Engagement Range, Map Selection and Team Priority.
- Give the same cards immediate press feedback so a click or tap is visibly
  registered on both the desktop Command Centre and the compact interface.
- Keep gameplay, tactical fit calculations, persistence, saves and match
  simulation unchanged. This is a presentation-only release.

## Problem

Selecting a choice card produced no perceptible response.

- `-webkit-tap-highlight-color: transparent` is set globally, so touch had no
  native highlight and the cards defined no `:active` state of their own.
- Choosing an option re-renders the tactics panel, which replaces the button
  element and discards the browser's own `:active` state, so any press feedback
  that did exist was destroyed before it could be seen.
- The selected `.active` treatment was a low-contrast border and background
  tint. For `.club-formation-card` it was not visible at all: the Command Skin
  layer puts that class in a
  `.menu-shell :is(…):not(:disabled):not(.primary)` group — specificity
  (0,4,1) — that sets `border-color` and `box-shadow` with `!important`,
  overriding the selected-state rule at (0,2,0). Selected and unselected
  formation cards therefore computed to identical borders and shadows.

## Implementation

### `css/game.css` — Build 12.132 layer (release end of file)

One new layer, last in the cascade, owning hover, press, focus and selected
presentation for `.club-formation-card` and `.club-plan-option`.

- Selected: a full-width top accent bar (`::before`, absolutely positioned, so
  no layout shift), a stronger border, a double ring via `box-shadow`, a
  brighter surface gradient and white primary copy. Formation cards keep the
  existing blue hue; plan options keep the existing amber hue and widen their
  left rule from 3px to 4px.
- Press: `:active` plus an `.is-pressing` class, giving `scale(.982)` and a
  2px inset ring. `:active` fires on pointer-down, ahead of the re-render.
- Hover: scoped to `@media (hover: hover) and (pointer: fine)` so a touch
  never leaves a card stuck in a hover state.
- Focus: a visible `:focus-visible` outline in each card family's hue.
- Confirmation: `.just-selected` runs a 580ms ring pulse
  (`tacticalChoiceConfirmBlue` / `tacticalChoiceConfirmAmber`).
- Compact (`max-width: 1023px`) thickens the accent bar to 4px and the ring to
  3px so the states read on a phone.
- `prefers-reduced-motion: reduce` drops the transitions, the press transform
  and the confirmation pulse, keeping the colour changes.

Cascade handling: the state rules repeat their own class
(`.club-plan-option.club-plan-option…`) for a (0,5,0)+ specificity and mark the
contested properties `!important`. This is required to clear the Command Skin's
bare `button { border: … !important }` rule and the (0,4,1) `:is()` group
described above. Uncontested declarations are left unmarked.

### `js/76-tactical-selection-feedback.js` — new module

Presentation only; it never reads or writes tactical state.

- Capture-phase `pointerdown` adds `.is-pressing` to the pressed card;
  `pointerup`, `pointercancel` and window `blur` remove it.
- Capture-phase `click` records which choice was activated, then polls on
  `requestAnimationFrame` for up to 700ms for the replacement element carrying
  that choice value and the `.active` class, and applies `.just-selected` to
  it for 620ms. This is what survives the re-render; keyboard activation is
  covered because Enter and Space dispatch `click` without `pointerdown`.
- Registered last in `build.py` `MODULES`, after `75-ui-clarity-hotfix.js`.

## Verification gates

- `py -3 build.py` succeeds; two consecutive builds produce byte-identical
  bundle and standalone output.
- The standalone parses and boots: `document.title`,
  `window.__STRIKEWATCH_BUILD__` and both visible version labels resolve to
  12.132 / `12.132.0-selection-feedback`.
- Browser console reports no errors across load and interaction.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.132.html`.

### Live computed-style verification

Measured in-browser on the built standalone, on card markup mounted inside
`.menu-shell` so the full cascade applies, with transitions suppressed to
isolate resolved values from animation timing.

| Width | Card | Idle border | Selected border | Pressed border | Selected ring | Top bar |
| --- | --- | --- | --- | --- | --- | --- |
| 390 | Formation | `rgba(104,210,181,.30)` | `rgba(120,205,255,.92)` | `rgba(140,214,255,.82)` | 3px | 4px |
| 390 | Plan option | `rgba(160,190,210,.16)` | `rgba(248,199,106,.80)` | `rgba(255,205,120,.74)` | 3px | 4px |
| 833 | Formation | `rgba(104,210,181,.30)` | `rgba(120,205,255,.92)` | `rgba(140,214,255,.82)` | 3px | 4px |
| 833 | Plan option | `rgba(160,190,210,.16)` | `rgba(248,199,106,.80)` | `rgba(255,205,120,.74)` | 3px | 4px |
| 1440 | Formation | `rgba(104,210,181,.30)` | `rgba(120,205,255,.92)` | `rgba(140,214,255,.82)` | 2px | 3px |
| 1440 | Plan option | `rgba(160,190,210,.16)` | `rgba(248,199,106,.80)` | `rgba(255,205,120,.74)` | 2px | 3px |

Selected plan options resolve `border-left-width: 4px` against 1px idle. The
selected top accent bar resolves `opacity: 1` against `0` when unselected.
Pressed cards resolve `transform: matrix(0.982, 0, 0, 0.982, 0, 0)`.

Hover was verified at 1440 by collecting every `:hover` rule matching these
elements and re-evaluating it through a marker class: three rules compete, and
the 12.132 declarations win border, background and shadow, with the skin's
`filter: brightness(1.08)` still layering on top.

Module behaviour verified with dispatched `PointerEvent`s: `pointerdown` adds
`.is-pressing`, `pointerup` and `pointercancel` remove it, and a simulated
select-then-re-render applies `.just-selected` with the correct 0.58s keyframe
name for each card family, clearing afterwards.

`document.documentElement.scrollWidth` equals `clientWidth` at 1440, so the
4px left rule introduces no horizontal overflow.

## Responsive review targets

Manual visual checks should cover 320, 375, 390, 430, 1024, 1366 and 1920 CSS
pixels, exercising selection on all five card groups in the Tactics tab.
