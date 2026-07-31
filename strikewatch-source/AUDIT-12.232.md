# Build 12.232 — Management Status Anchor Fix

One-line fix for a misaligned management status toast. The cause is a specific
class of CSS mistake worth naming.

## The fault

`css/management-feedback.css` (Build 12.140/12.172) centres the toast with a
**pair** of declarations that only work together:

```css
.management-status      { left: 50%; transform: translate(-50%, 10px); }
.management-status.show { transform: translate(-50%, 0); }
```

`css/12.161-audit-fixes.css` then re-anchors it to the right edge for every
viewport at or below 1100px:

```css
@media (max-width: 1100px) {
  .management-status {
    inset: auto max(10px, …) max(76px, …) auto;   /* left: auto, right: 10px */
    max-width: min(420px, calc(100vw - 20px));
  }
}
```

That sheet loads after `management-feedback.css`, so its `left: auto` wins —
**but it never overrode the transform**. The toast was therefore anchored to the
right edge and then dragged left by half its own width.

## Measured

Drift is a constant −210px (half of the 420px max-width), independent of
viewport:

| Viewport | Anchored left | Rendered left | Off-screen |
| --- | --- | --- | --- |
| 833 | 403 | 193 | none (looks off-centre) |
| 700 | 270 | 60 | none |
| 640 | 210 | 0 | at the edge |
| **500** | **70** | **−140** | **140px clipped** |

Below roughly 640px the toast starts leaving the viewport, taking the start of
the message with it — which is what the report showed, a status reading
"…AS READ" with the beginning cut off.

The affected band is **every width ≤1100px except portrait ≤430px**, because
`css/compact-navigation.css` (Build 12.163) loads later still and re-declares
both `left`/`right` *and* the transform for narrow portrait phones. That sheet
got it right; the 12.161 one did not. Landscape phones, tablets and small
desktop windows were all in the broken band — including the 844×390 landscape
check named in `HANDOFF.md`.

## The fix

Two declarations, in the same block that changed the anchoring:

```css
.management-status      { transform: translateY(10px); }
.management-status.show { transform: translateY(0); }
```

No `!important`, no new media query, no specificity games — the sheet already
loads after the one it is correcting.

## The rule worth keeping

**Anchoring and transform are one decision here.** `left: 50%` plus
`translateX(-50%)` is a centring idiom, and overriding only half of it leaves
the other half applying to a layout it was never meant for. Any future rule that
touches `left`, `right` or `inset` on this element must set `transform` in the
same breath.

## Verification

Toast fired through `showManagementStatusForTest()` and measured against the
viewport at each width:

| Viewport | translateX | Rendered | Inside viewport |
| --- | --- | --- | --- |
| 390 × 844 | 0 | 10 → 380 | yes |
| 500 × 700 | 0 | 70 → 490 | yes |
| 844 × 390 | 0 | 414 → 834 | yes |
| 1100 × 800 | 0 | 670 → 1090 | yes |
| 1101 × 800 | −310 | 241 → 861 | yes, centred to within 1px |

1101px confirms the desktop centred layout is untouched — above the 1100px
breakpoint the original transform still applies and the toast remains centred.

Green: `typographyConsistencyForTest`, `navigationSubmenuForTest`,
`matchGestureForTest`, `economyGuidanceForTest`, `guidanceConsolidationForTest`.
`managementStatusForTest()` reports the toast visible and on-screen.

All 45 modular files and both standalone inline scripts parse. Two builds
produced identical hashes; root `cod.html` is byte-identical to the standalone.
CSS debt unchanged at media 484/484, important 2269/2270. Save schema 19 and
diagnostics schema 1 are unchanged.

`mobileInterfaceAuditForTest()` at 500px reports one overflow,
`nav.league-section-jumps` overshooting by 10 — long-standing and unrelated; the
status element is not among the offenders.

## Do not

- Do not change `left`, `right` or `inset` on `.management-status` without
  setting `transform` in the same rule.
- Do not "fix" a future misalignment by nudging `left`. The drift was never a
  positioning value, it was a leftover centring transform.
