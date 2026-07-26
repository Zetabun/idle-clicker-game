# Strikewatch Build 12.49 Audit — Consolidated Economy Guidance

## Scope

Deep-audit the currency and resource tutorial flow, remove repetition, preserve essential information and ensure each concept appears before the player must act on it.

## Findings

- Foundation-loan terms were repeated in a long note and a second fact row before appearing again in Mail and Club Finances.
- Recruitment mentioned affordability but did not plainly explain that transfer fees consume Club Cash immediately while wage headroom is a weekly limit and payroll later consumes Club Cash.
- Gold Coins could appear in the top bar before their restricted purpose was explained.
- The first-match reward screen used the inconsistent label **Credits** and implied all rewards funded the same activities.
- Team XP and Player XP were shown in separate stages without one concise explanation of how levels produce Team Points and Stat Points.
- The Supply Depot contains cash equipment and Gold Coin crates, while free victory crates are a third source that needed clearer separation.

## Implemented flow

1. **Before the first contract** — the existing optional induction contains one Economy Guide for Club Cash, wage headroom and foundation-loan commitments. The authoritative First Match Guide states the immediate-fee and recurring-wage distinction directly.
2. **After the first match** — the reward reveal uses the same guide framework to distinguish Club Cash, Gold Coins, Team XP and Player XP by exact destination, then states that the victory Supply Drop is not currency.
3. **After onboarding** — Finance, Gold Coin and Training guides focus on reading their page and using the resource, while the Supply Depot guide explains Cash equipment, Gold Coin crates and free match crates.

## Consolidation safeguards

- The nine-step First Match Guide remains the only authoritative progress tracker.
- The six-stage induction remains optional supporting context during that guide and contains no competing route button.
- Duplicate long-form loan facts were removed from the opening panel. Full terms remain available in the compact guide, Finance Mail, Calendar and Club Finances.
- No currency, wage, reward, loan, XP or progression value changed.

## Verification

- `economyGuidanceForTest()` checks one recruitment guide, no duplicate loan-fact row, just-in-time contract guidance, exact reward destinations, consistent Club Cash terminology, non-currency Supply Drop copy and page-specific post-guide tutorials.
- `guidanceConsolidationForTest()`, `firstMatchGuidanceForTest()` and `stateIntegrityForTest()` remain passing.
- Save schema remains 19 and diagnostics schema remains 1.
