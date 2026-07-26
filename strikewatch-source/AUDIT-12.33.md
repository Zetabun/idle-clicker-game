# Strikewatch Build 12.33 Audit

## Scope

Build 12.33 improves the recruitment portion of the opening tutorial so a new manager understands what Entry, Support, Anchor, Flanker, Marksman, Shot Caller and Flex mean before signing operators.

## Implementation review

### Shared beginner role reference

- `TEAM_ROLE_BEGINNER_GUIDE` adds plain-language main jobs, useful attributes and trade-offs without changing authoritative `TEAM_ROLES` weights or IDs.
- Recruitment shows all seven roles and a clearly labelled beginner-friendly active-five example that is explicitly optional.
- The guide opens automatically during the recruitment/profile/first-signing/active-five stages and remains collapsible afterward.

### Guided recruitment destination

- Base and enhanced market views use one `.recruitment-candidate-zone` destination containing the role guide, table and candidate rows.
- Recruit Operator and Continue Recruiting therefore land on the role explanation before the available candidates.
- Existing management-pane scrolling, fixed page shell and no-focus-transfer contracts remain unchanged.

### Candidate profile clarity

- Recruitment-target profiles show focused primary and secondary role cards.
- Flanker copy explicitly explains alternate routes and side/rear attack angles rather than assuming prior tactical terminology.

## Verification

- `recruitmentRoleGuideForTest().ok === true`.
- `firstMatchGuidanceForTest().ok === true`, including the combined role-guide/candidate destination.
- All seven roles render with Look For and Watch For rows; Flanker plain-language checks pass.
- Source modules, generated development bundle and standalone inline JavaScript pass syntax checks.
- `build.py` compiles and deterministic source rebuild parity passes.
- 320×720, 375×812, 390×844, 430×932 and 844×390 layouts have no document, management-content, candidate-zone, role-guide or role-card horizontal overflow.
- Retained onboarding, progressive access, first-match payoff, purchases and state-integrity checks remain green.

## Preservation

- Career save schema remains **19**.
- Diagnostics schema remains **1**.
- Role weights, player generation, AI decisions, weapon/armour balance, fees, wages and reward arithmetic are unchanged.
- No external assets, fonts, libraries or network calls were added.
