# Strikewatch Build 12.47 Audit — Recruitment Negotiation Fix

## Scope

Resolve the opening recruitment tutorial bug where tapping **Negotiate** appeared to do nothing.

## Root cause

`startIncomingTransferNegotiation()` correctly created the incoming deal and then routed to the Transfer Centre. The First Match Guide's progressive access rules still classified Transfers as locked until the complete first-match/debrief/training sequence, so routing failed after the deal was created. The user remained on Recruitment with no visible negotiation controls.

## Implemented behaviour

- `progressiveRouteAccess()` now temporarily permits the Transfer Centre when an incoming candidate negotiation exists during the Recruitment, Profile, First Signing or Active Five guide steps.
- Transfers remains locked before a negotiation and returns to normal progressive access when no incoming deal is active.
- Recruitment-list and candidate-profile Negotiate controls both use the fixed route.
- Tutorial text now states the intended sequence: Negotiate, Submit Offer and Complete Signing.
- Candidate Negotiate controls include a descriptive accessible label.
- `firstMatchGuidanceForTest()` verifies Transfers is locked before a deal and available during an active tutorial negotiation.

## Invariants

- Negotiation values, acceptance logic, transfer-window rules, squad limits, wages and fees are unchanged.
- No player joins the squad until Complete Signing is pressed.
- Save schema remains 19 and diagnostics schema remains 1.

## Verification

- A real button click from both Recruitment and candidate Profile opens the Transfer Centre, displays one negotiation card and exposes Submit Offer.
- Passed at 320×700, 375×812, 390×844, 430×900 and 844×390 without horizontal overflow.
- Retained First Match Guidance, Recruitment Role Guide and Recruitment Decision Support tests pass.
- Updated modules and rebuilt bundle pass syntax validation.
