# Strikewatch Build 12.48 Audit — Recruitment Decision Tool

## Scope

Make the tutorial candidate-comparison feature produce intuitive, actionable management information rather than merely repeating report values in parallel columns.

## Problems identified

- The old comparison cards repeated ability, potential, role attributes, risk and cost without interpreting which candidate best suited the current squad.
- Candidates in different roles were difficult to compare because there was no shared decision framework.
- The comparison panel sat above the candidate list, so a player could add candidates without clearly seeing the completed result.
- The tutorial did not explain how Comparison should lead into a report or negotiation decision.

## Implemented behaviour

- Added scouting-aware candidate decision modelling through `recruitmentComparisonDecision()`.
- Added four readable decision categories: Immediate Impact, Future Ceiling, Squad Need and Budget Fit.
- Added a Best Current Fit recommendation that prioritises affordable options, explains the confidence of the current scouting report and moves the recommended candidate to the first comparison card.
- Added plain-language Why This Fits and Main Trade-off sections to every candidate.
- Retained the underlying ability, potential, role attributes, medical risk, fee, wage, cash-after-signing and Active Five impact facts.
- Highlighted selected-group leaders without treating overall rating as the only measure of quality.
- Added direct Open Report and Negotiate actions to comparison cards.
- Reworked the tutorial empty state into a three-step flow and updated First Match Guide copy.
- Renamed the candidate control to Add to Compare / Selected for clearer state feedback.
- After the second candidate is selected, the completed comparison receives focus and is brought into view.

## Invariants

- Comparison selection remains transient UI state and is not persisted.
- The candidate limit remains three.
- Scouting knowledge continues to control displayed certainty and estimated ranges.
- Transfer fees, wages, acceptance rules, squad limits and negotiation settlement are unchanged.
- Build 12.47's active-negotiation tutorial route exception remains intact.
- Save schema remains 19 and diagnostics schema remains 1.

## Verification

- `recruitmentDecisionSupportForTest()` passes with three candidates and verifies Best Current Fit, Why This Fits, Main Trade-off, all four score categories, direct Report/Negotiate actions and the tutorial empty-state flow.
- `recruitmentComparisonInteractionForTest()` verifies the real Add to Compare handler retains the first selection, builds a two-card comparison after the second selection, focuses the completed panel and exposes both negotiation actions.
- Comparison markup contains exactly one recommended candidate and three complete candidate cards in the deterministic decision-support scenario.
- Responsive containment passed at 320×700, 375×812, 390×844, 430×900 and 844×390 with panel and card widths contained inside the viewport.
- Updated modules and the rebuilt bundle pass syntax validation.
