# Build 12.126 audit

## Scope

- Repair severe compact tactics overlap and keep each detailed section in
  normal vertical flow.
- Remove the duplicate floating plan-confirmation control and retain one
  reachable final check after the settings it confirms.
- Keep confirmed preparation valid while advancing days toward the same
  fixture, without daily readiness changes creating a preparation loop.
- Make the compact guided Next Day control display readable status text.

## Root causes

- The compact tactics content is a fixed-height scroll grid. Build 12.121 gave
  its complex direct children a zero minimum size, allowing auto tracks to
  shrink to panel borders while full-height descendants overflowed across
  neighbouring sections.
- `clubMatchPrepState()` discarded preparation whenever the calendar day
  changed, and the plan signature included readiness and core stats that can
  change during ordinary daily simulation.
- Guided End Day deliberately hid every text node and displayed only a lock
  glyph, leaving no visible explanation in the top-right control.

## Implementation

- Compact tactics now uses max-content grid rows aligned to the start of its
  scroll viewport. The former sticky mobile action is removed from markup, and
  the workflow summary now leads to the single final check instead of starting
  matchmaking from a second location.
- Match preparation stores the scheduled fixture ID. Day advancement and
  readiness variation no longer invalidate the signature; fixture, line-up,
  role, loadout and tactical changes still do.
- Guided Next Day now shows `NEXT DAY` and `FINISH GUIDE` in place of the
  unexplained lock-only presentation.
- Save schema 19 normalisation now preserves the additive `fixtureId` field.

## Verification

- Pre-fix browser reproduction at 390 × 844 measured the affected direct
  tactics panels at only 1–31px high while their children were 121–1,055px
  high, confirming grid-track collapse rather than corrupt content.
- Targeted source assertions pass for fixture-key persistence, removal of the
  calendar-day reset, exclusion of daily readiness from the confirmation
  signature, material-change invalidation, save normalisation, content-sized
  mobile rows and guided Next Day copy.
- The rendered tactics template contains one confirm action and one deployment
  action, both in the final check, with no floating action markup.
- All 34 modular JavaScript files, the generated bundle and the standalone
  inline script parse successfully.
- Two consecutive builds were byte-identical:
  - bundle SHA-256:
    `4CFB6EEB8BBD31187FAD33BE249840BC6C7C94543C7FB97BB3344E2488E0AAE0`
  - standalone/root SHA-256:
    `C53FF7AAFA46F65F8D661BAA42522FA0BFB2D50F3A644BB79AAAE171C5ECBF70`
- Root `cod.html` is byte-identical to the verified standalone.
