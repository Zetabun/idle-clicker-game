# Strikewatch Build 12.26 Audit

## Scope

Build 12.26 addresses new-player confusion after external playtesting. It turns the opening career into a visible first-match journey, replaces ambiguous starting-five language, adds lightweight operator graphics and explains the live autonomous match as it unfolds.

## Implementation review

### Guided first match

- `firstMatchGuidance()` derives one exact next objective from existing tutorial and career state.
- The persistent priority strip shows progress, specific action copy and the reason the step matters.
- The relevant primary section and sub-route receive a restrained NEXT treatment while all other pages remain usable.
- The older route tutorial is now labelled as a contextual briefing rather than showing a second competing progress counter.

### Operator clarity and graphics

- Opening copy now identifies the deployed group as the active five operators / active operator line-up.
- Recruitment and squad cards include generated operator busts and role identity graphics without external assets.
- Deployment rows include compact role glyphs and explicitly explain that the operators move, aim and fight autonomously.

### Live match understanding

- The match view shows the current round objective and a compact summary of the active tactical plan.
- The spectator card shows a derived autonomous intention such as engaging, flanking, investigating sound, moving to an assigned zone, holding cover, switching weapon or reloading.
- Round one adds a system-feed explanation that the five operators are executing the manager's plan.
- All live clarity is observational and does not mutate AI or combat state.

### First debrief

- The opening report now teaches the player to read What Worked, Biggest Issue and Next Manager Action in that order.
- Existing detailed intent-versus-execution evidence and linked coaching actions remain authoritative.

## Preservation

- Fixed mobile viewport and Build 12.25 typography remain intact.
- Build 12.24 random-name and onboarding behaviour remain intact.
- Career save schema remains 19.
- Diagnostics schema remains 1.
- No external assets, fonts, libraries or network calls were added.

## Validation completed

- All modular JavaScript files pass `node --check`.
- `build.py` passes Python compilation and produces a deterministic development bundle and standalone release.
- The generated standalone inline script passes `node --check`.
- Headless Chromium regression coverage passed for onboarding clarity, random team names, fixed-scale typography, first-match guidance, the guidance action route, active-operator visuals, deployment role graphics, live objective/intent copy, the three-step first debrief guide, store purchases and career-state integrity.
- Portrait layouts at 320, 375, 390 and 430 pixels and 844 × 390 landscape reported no horizontal document overflow.
- Runtime duplicate-ID and uncaught-page-error checks passed. The headless container does not expose WebGL, so renderer initialization reports the existing expected WebGL warning while DOM and management regression checks continue normally.
- A terminology sweep confirmed that user-facing `STARTING FIVE` wording is no longer present in the maintained HTML, CSS or modular JavaScript source.
