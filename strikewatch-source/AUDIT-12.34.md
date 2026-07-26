# Strikewatch Build 12.34 Audit

## Scope

Recruitment decision support and Active Five composition clarity. No AI, combat, role-weight, candidate-generation, transfer-value, wage, economy or save-schema balance changes.

## Added

- Active Five Needs panel with six functional coverage states, remaining places, cash and wage use.
- Contextual What This Operator Adds assessment on every market candidate.
- Optional Best Immediate Fit, Best Affordable Option and Best Development Prospect recommendations.
- Transient comparison selection for up to three market or shortlisted candidates.
- Side-by-side role purpose, scouting-aware relevant attributes, ability, potential, medical risk, fee, wage, cash-after-signing and active-five impact.
- Post-signing Active Five update identifying newly covered functions and the next clearest need.
- `recruitmentDecisionSupportForTest()` deterministic release hook.

## Invariants

- Save schema remains 19 and diagnostics schema remains 1.
- Comparison and signing-summary state are not persisted.
- Role weights, operator generation, recruitment prices, wages, negotiation rules and match behaviour are unchanged. New decision readouts respect the existing scouting-knowledge estimate thresholds.
- Duplicate roles remain valid; the needs panel describes functions rather than enforcing one role of each type.
- Candidate recommendations explain options and never sign or shortlist automatically.

## Required checks

- Modular and bundled JavaScript syntax.
- Python build-script compilation.
- Deterministic development bundle and standalone build hashes.
- `recruitmentDecisionSupportForTest()` and all retained onboarding, progressive-access, first-match, purchase and save-integrity hooks.
- Market, shortlist and comparison containment at 320, 375, 390 and 430px portrait plus 844x390 landscape.
- ZIP extraction, rebuild and byte-identical standalone output.
