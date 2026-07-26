# Strikewatch Build 12.39 Audit — Squad Dynamics

## Scope

Build 12.39 adds a low-maintenance squad-relationship layer. Operators form persistent partnerships through shared matches, support spacing, trade conversion and joint performance. The system is deliberately positive-only: developing or weak relationships never reduce attributes, create hidden penalties, block End Day or require routine manager conversations.

## Implemented behaviour

- Persistent pair bonds for contracted operators, normalised safely inside career save schema 19.
- Four positive partnership milestones: Familiar, Linked, Trusted and Elite.
- Pair growth is settled once per completed match and is protected against duplicate settlement.
- The strongest active partnership for each starter supplies a small capped coordination buff.
- Buff types follow role combinations and use existing behaviour fields such as support radius, trade priority, group discipline, flank coordination, movement execution, awareness and reaction timing.
- No dynamics effect directly modifies health, damage, weapon values or rewards.
- Positive active-five atmosphere supplies a very small execution uplift; low atmosphere supplies no penalty.
- One natural mentor relationship may be derived automatically from age, experience, potential gap and role fit. The learner receives +6% training and match-development XP without requiring manual assignment.
- Reserve concerns appear only in a quiet Rotation Watch. They do not create blockers or pop-up decisions.
- Squad cards show a compact dynamics badge, the Squad screen contains the full overview and player profiles explain the exact current buff.
- Match debriefs show the strongest growth or at most three new milestones. Partnership mail is informational and never marked as a required response.

## Balance boundaries

- Every dynamics multiplier is at least neutral.
- A player uses only their strongest active partnership rather than stacking every pair.
- Atmosphere and pair execution bonuses are capped at a small combined uplift.
- Relationships do not decay, so rotation does not punish the player with maintenance work.
- A developing partnership provides no buff rather than a debuff.

## Automated validation

- Standalone boot and Build 12.39 identity: passed.
- Ten-match partnership progression through Trusted and Elite tiers: passed.
- One-match developing state with no active pair buff: passed.
- Active bot profiles receive the expected positive-only partnership data: passed.
- Exact buff values render on player profiles: passed.
- Automatic mentorship and +6% development multiplier: passed.
- Duplicate settlement protection: passed.
- Save normalisation and round-trip parity under schema 19: passed.
- Milestone report cap and non-blocking policy copy: passed.
- 320x700, 375x812, 390x844, 430x900 and 844x390 horizontal containment: passed.
- Retained onboarding, typography, recruitment decision support, guidance consolidation, progressive interface, opponent preparation, opening-week and tactical-adaptation smoke suites: passed.
- Modular JavaScript syntax, generated bundle syntax and standalone inline JavaScript syntax: passed.

## Renderer note

The headless Chromium environment does not expose WebGL. Renderer-independent state, DOM, save and bot-profile tests were used. No renderer, visibility, shooting, navigation or map implementation changed in this build.

## Schemas

- Career save schema: 19, unchanged. `squadDynamics` is an additive, backwards-compatible optional state object.
- Diagnostics schema: 1, unchanged.
