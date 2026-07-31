# Build 12.231 — Operations Today Typography and Contrast

Review follow-up to Build 12.230. Four requested corrections, one of which had a
cause worth recording.

## The font never changed — the weight did

The report was that the panel used a different typeface from the rest of the UI
and that the older one was preferred. Measured, the family is `Inter` on both
sides; nothing in this build or 12.230 ever declared a `font-family`.

The real fault is that **these cards are `<button>` elements and `game.css` sets
`button { font-weight: 900 }`**. Build 12.230 set explicit weights on the label,
title and status but not on `small`, so the supporting copy inherited 900 — it
was rendering heavier than the title above it. A body paragraph at 900 against a
heading at 800 reads as a different, chunkier face, which is exactly what was
reported.

The weights are now taken from the surrounding UI rather than invented:

| Role | House reference | Was | Now |
| --- | --- | --- | --- |
| Panel kicker | `.menu-subtab-label` 900 | 800 | **900** |
| Panel date | `.command-centre-hero h2` 700 | 800 | **700** |
| Week/season | card header spans 900-950 | 700 | **900** |
| Card label | `.menu-subtab-label` 900 | 800 | **900** |
| Card title | `.command-fixture-card header strong` 700 | 800 | **700** |
| Card detail | `.command-fixture-card header small` 400 | *inherited 900* | **400** |
| Card status | all-caps kicker convention | 800 | **900** |

The house scale is: display headlines 700, all-caps kickers 900-950, supporting
copy 400. **Anything inside a `<button>` here needs an explicit weight or it
silently becomes 900.**

## Resting brightness

The 12.230 resting state was too dark and the hover was doing the work the
default should have done. The former hover values are now the resting values,
and hover moves up another step so the interaction is still legible:

| State | Tone wash | Base |
| --- | --- | --- |
| Resting | 13% | `#0b1420` → `#080e17` → `#04080e` |
| Hover / focus | 21% | `#131e2c` → `#0d1622` → `#070d16` |

Verified with a real pointer hover: the hovered card's background and ring both
resolve differently from its resting neighbours.

## Card edges

Raised so neighbouring cards separate against the near-black housing.

Done with an **inset 1px ring in `box-shadow`, not `border-color`** — and that
was forced, not stylistic. The skin flags `border` on a bare `button` with
`!important` (Build 12.132), so brightening the border directly costs two
flagged declarations. The first attempt did exactly that and **the CSS-debt gate
rejected the build at 2271 against its 2270 ceiling**. The ring achieves the
same read for zero flagged declarations; final count is 2269/2270.

Hover lifts the ring to 50% of the column's tone, which is what makes the
hovered card obvious without a colour change.

## Card titles in caps

`text-transform: uppercase` with `.035em` tracking, matching every other
headline in the command chrome. The panel date was already uppercase from the
data, so the card titles were the only headings still in sentence case.

## Verification

Uppercase titles wrap differently from sentence case, so the responsive matrix
was re-measured rather than assumed:

| Width | Rows | Card widths | Ragged | Overflow |
| --- | --- | --- | --- | --- |
| 320 | 5 | 279 | 0 | none |
| 375 | 3 | 164 ×4, 335 | 0 | none |
| 860 | 2 | 167 ×4, 688 | 0 | none |
| 1280 | 1 | 159 ×5 | 0 | none |
| 1920 | 1 | 282 ×5 | 0 | none |

Green: `typographyConsistencyForTest`, `navigationSubmenuForTest`,
`matchGestureForTest`, `economyGuidanceForTest`, `guidanceConsolidationForTest`,
`firstMatchPayoffForTest`.

All 45 modular files and both standalone inline scripts parse. Two builds
produced identical dev-bundle and standalone hashes. Root `cod.html` is
byte-identical to `dist/strikewatch-build-12.231.html`. CSS debt: media 484/484,
important 2269/2270. Save schema 19 and diagnostics schema 1 are unchanged.

## Do not

- Do not leave text inside these cards without an explicit `font-weight`.
  `button { font-weight: 900 }` in `game.css` will claim it, and the result
  reads as a typeface change rather than a weight change — which is how the
  12.230 report came in.
- Do not brighten the card edge with `border-color`. The skin flags `border` on
  `button`, the important budget is full, and the gate will reject the build.
- Do not restore the 12.230 resting darkness. It was the reason hover looked
  like the correct state.
