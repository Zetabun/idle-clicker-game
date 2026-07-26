# Strikewatch Build 12.35 Audit

## Scope

Opening-week Command Centre rhythm, meaningful calendar progression and tutorial-aware End Day availability. Existing calendar settlement, blockers, training, recovery, scouting, transfers, finances, matchday and save rules remain authoritative.

## Added

- Club Daily Agenda replacing the retired post-guide Opening Week Handoff checklist.
- Required, Recommended and Optional activity groups with direct route actions.
- Six-point Fixture Preparation meter for Active Five selection, medical availability, training, opposition scouting, confirmed tactics and weapon-range compatibility.
- Advance to Next Event with a 21-day safety horizon and stops for blockers, matchday, medical clearance, scouting/transfer changes, report-depth thresholds and training milestones/improvements.
- Transient one-day and multi-day change summaries with routed readiness, fatigue, familiarity, scouting, training, cash and action-required rows.
- Tutorial-aware End Day lock during recruitment and other no-time-needed First Match Guide stages.
- End Day availability during the match stage when a confirmed plan exists and calendar advancement to the fixture is required.
- `openingWeekFlowForTest()`, `seedFirstMatchCalendarForTest()` and `seedOpeningWeekForTest()` release hooks.

## Invariants

- Save schema remains 19 and diagnostics schema remains 1.
- `openingWeekAdvanceSummaryState` and batch state are transient and never persisted.
- All advancement calls the established `advanceCareerDay()` settlement path.
- No Inbox, contract, commercial, medical or transfer decision is auto-resolved.
- No tactic, training programme, loadout, lineup or plan confirmation is chosen automatically.
- A due fixture is never skipped and multi-day advance stops at the first meaningful event or blocker.
- First Match Guide plan completion remains historical after the first career match, preventing later plan invalidation from regressing onboarding.

## Required checks

- Modular, bundled and standalone inline JavaScript syntax.
- Python build-script compilation and deterministic rebuild hashes.
- Fresh recruitment tutorial: End Day disabled with Follow First Match Guide copy.
- First-match calendar seed: match step active, plan confirmed, fixture in future and End Day enabled.
- Post-guide agenda: three groups, six preparation checks and no horizontal overflow at 320x720, 375x812, 390x844, 430x932 and 844x390.
- One-day End Day summary and multi-day Advance to Next Event summary.
- Onboarding, typography, first-match guidance, guidance consolidation, progressive access, recruitment role guide, recruitment decision support, first-match payoff, cash purchase and state-integrity hooks.
- ZIP extraction, clean rebuild and byte-identical standalone output.
