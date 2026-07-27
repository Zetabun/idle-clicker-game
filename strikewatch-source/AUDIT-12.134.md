# Build 12.134 — Durable Career audit

## Scope

1. Investigate reported loss of Gold Coins awarded after a match.
2. Audit and fix compact presentation defects across the management routes.
3. Fix the after-action Combat Effectiveness dial at phone widths.
4. Found every club with one inherited assistant manager.
5. State the fixture type in the post-match report.

## 1. Gold Coin loss

### What was tested

The award path was exercised end to end rather than inspected. Two hooks were
added:

- `goldCoinMatchPersistenceForTest(balance)` runs the real `completeCareerMatch`
  settlement and compares the live balance with what a fresh `loadCareerState()`
  reads, before settlement, after settlement and after the report stage.
- `goldCoinLedgerIntegrityForTest(matches, days)` asserts the invariant that the
  balance always equals the sum of `goldCoinHistory`, across real match
  settlements interleaved with calendar advances.

Results: the award is granted, added and persisted correctly at every stage.
Six matches plus eighteen calendar days produced **0** mismatches between
balance, ledger and stored save. The multi-kill contribution also lands
(`multiKillSettlementForTest` reports a gold delta of 22 for an 11-point base
award plus an 11-point multi-kill bonus). `careerState.goldCoins` has only
three production writers — match settlement, crate purchase and normalisation —
and none of them drops the value.

**No defect was reproduced in the settlement or save path.**

### What was fixed

The investigation did surface two ways a banked reward could be lost silently,
both in `saveCareerState`:

- **Last-writer-wins across sessions.** A second tab, or a page restored from
  the back/forward cache, still held the career it loaded before the match. Its
  next autosave overwrote the newer save wholesale. Saves are now sequenced: the
  save metadata carries a monotonic `saveSequence`, and a session whose sequence
  is behind storage refuses to write and surfaces `SAVE HELD BACK` rather than
  destroying the newer progress. Deliberate manager actions — import and backup
  restore — pass `force: true` and still win.
- **Rejected writes reported as success.** A failed `localStorage.setItem`
  (quota, private browsing, full disk) was caught and discarded, so play
  continued against a balance that was never stored. The write is now read back
  and compared before the save is treated as durable, and a failure raises a
  persistent `PROGRESS IS NOT BEING SAVED` notice telling the manager to export
  the career.

`careerSaveHealth()` exposes sequence, staleness and last failure;
`staleSaveGuardForTest()` proves a stale session is refused and a forced write
recovers.

## 2. Compact interface audit

`mobileInterfaceAuditForTest({ minFont, minTouch, routes })` walks all 22
management routes at the current viewport and reports content escaping its
container, text below a readable floor and undersized touch targets. Content
inside a deliberate horizontal scroller (the recruitment carousel) is measured
against that scroller, not the page, so the working carousel is not reported.

Measured at 390px:

| Metric | Before | After |
| --- | --- | --- |
| Horizontal overflow | 51 | **0** |
| Touch targets under 40px | 0 | **0** |
| Distinct sub-11px text nodes | — | 88 (4 below 9px) |
| Smallest rendered copy | 5.5px | 7px |

Fixes land in the Build 12.134 layer at the release end of `css/game.css`, in
three passes driven by successive audit runs. The first pass floors the shared
command chrome (`.menu-pill`, `.command-hero-meta`, `.career-xp-panel`,
`.club-response-group`, armoury slot labels) and contains nowrap copy that was
escaping its column on seven routes. The second and third passes floor
route-specific copy identified by selector from the audit output: league
pyramid tiers, formation cards, squad cards, stat-point banners, weapon
inspector callouts, commercial offers, Inbox view tabs, squad dynamics,
opponent preparation, dashboard tiles, player telemetry, armoury trade-offs,
supporter expectations and coaching advice. Label-weight text lands on 11px and
meaningful copy on 12px, consistent with the 12.118/12.120 floors.

## 3. Combat Effectiveness dial

The `COMBAT EFFECTIVENESS` caption sat inside the ring. At phone widths it
wrapped to two lines at 6px and printed over both the ring stroke and the
grade. Below 1024px the caption is now absolutely positioned as a single-line
11px label beneath a 138px ring (124px below 380px), which gives the grade
(40px) and score (21px) the whole dial. The influence legend wraps and centres
instead of overflowing. Verified: caption top sits at or below the ring bottom,
so the overlap is gone.

## 4. Inherited assistant manager

`clubEnsureFoundingAssistant()` appoints one assistant during club-operations
bootstrap, once per career, guarded by a persisted
`staff.foundingAssistantAppointed` flag so releasing or replacing them never
re-seeds another.

- The name is generated per club from the club name, manager name and market
  seed, so it differs between careers (observed `Fraser Morgan`, `Priya Reed`).
- They carry a wage (roughly 1,400–1,700/week) from day one and no signing fee,
  having been under contract before the manager arrived.
- Ratings are drawn from the bottom of the Division 3 range (observed 3–4 out
  of 10). They feed `clubPlayerSelectionScore` exactly like any purchased
  assistant, so their judgement is measurably weak and better advice has to be
  bought. Nothing about the appointment touches match simulation, so the advice
  cannot produce an automatic win.
- Replacement works through the existing `hireAssistantManager`, which already
  releases the incumbent; the assistant remains required for the existing
  delegated-selection tasks.
- A founding mail introduces them by name, states the wage and frames the
  recommendations as an opinion.

This also fixed a latent defect in `clubNormaliseStaffMember`, where
`Number(signingFee) || 5000` replaced a genuine zero fee with 5,000.

## 5. Fixture type in the post-match report

`careerMatchTypeDescriptor(summary)` is the single authority for what kind of
match was played, preferring the settled league record, then the stored match
presentation, then the live presentation. It returns league (with division and
matchday), exhibition or guided orientation.

The detailed report's competition row previously rendered only when a league
settlement existed, so exhibition and orientation results carried no fixture
type at all. It now always renders, and the staged first-match outcome header
carries the same label and detail line.

## Verification gates

- `py -3 build.py` succeeds; two consecutive builds byte-identical.
- Standalone parses and boots; title, `window.__STRIKEWATCH_BUILD__` and both
  visible labels resolve to 12.134 / `12.134.0-durable-career`.
- No console errors across load, seeding, settlement and route walking.
- Root `cod.html` byte-identical to `dist/strikewatch-build-12.134.html`.
- `scrollWidth === clientWidth` at 390px.

### Regression summary

| Check | Result |
| --- | --- |
| Gold ledger integrity (5 matches, 15 days) | 0 mismatches, balance 43 = ledger 43 |
| Stale-save guard | stale write refused, forced write succeeds |
| Recommended-plan warning (keep) | plan unchanged, warns again |
| Decision rotation (120 days) | 30 decisions, 0 repeat violations |
| Compact audit (390px) | 0 overflow, 0 undersized targets |
| First Match Guide seed | guide present, fixture countdown live |

## Responsive review targets

320, 375, 390, 430, 1024, 1366 and 1920 CSS pixels, with attention to the
after-action report, Armoury, Squad Dynamics, League and Commercial routes.
