# Strikewatch Build 12.38 Audit — Tactical Adaptation

## Scope

Build 12.38 extends the existing between-round intervention without adding a second tactics engine. It adds truthful round diagnosis, one next-round route category, opponent counter-adaptation through established AI behaviours, visible live notices and post-match evaluation of manager decisions.

## Implemented behaviour

- Three evidence cards: round execution, scouting accuracy and opponent-response forecast.
- An explicit opponent adaptation read with a manager counterpoint and forecast disclaimer.
- Four reversible categories: approach, engagement, priority and route/territory.
- Hard maximum of two changed categories.
- Route changes use existing arena engagement plans and become the next round's selected engagement plan.
- Match-scoped opponent adaptation reacts to successful long/close control, grouping, flanking, isolation and established adaptive identity changes.
- Opponent changes use existing formation, approach, engagement and priority behaviour only; no raw attribute bonus is applied.
- Manager and opponent changes generate live match feed/moment context.
- Each manager adjustment records its expected effect and is evaluated against the following round's support, accuracy, trade, damage and route telemetry.
- Final-round evaluation occurs before match settlement.
- Debrief shows both manager adjustment outcomes and opponent response chronology.
- The intervention is reparented to `document.body` so portrait window transforms cannot clip it.

## Information boundaries

The opposition system internally needs a concrete next-round identity so autonomous bots can act consistently. User-facing preparation, between-round, live and debrief copy does not print that exact internal target. It presents visible evidence, a likely response trigger, reasoning, a counterpoint and an explicit forecast disclaimer. Build 12.37's under-50% pre-match scouting redaction remains unchanged.

## Automated validation

- Standalone boot and debug API availability: passed.
- Three diagnosis cards and four valid route buttons: passed.
- Route plus priority selection: passed.
- Third changed category rejection with first two preserved: passed.
- Applied route captured as next-round `roundPlanId`: passed.
- Expected-effect and labelled change record: passed.
- Opponent adaptation applied to red-bot formation/approach/engagement/priority in the next round: passed.
- Following-round manager-adjustment evaluation: passed.
- 320x700, 375x812, 390x844, 430x900 and 844x390 horizontal containment: passed.
- Modular JavaScript syntax, generated development bundle syntax and standalone inline JavaScript syntax: passed.
- Deterministic rebuild and clean-archive rebuild parity: passed.

## Renderer note

The headless Chromium environment does not expose a WebGL context. Renderer-independent match flow, DOM, state capture and AI configuration tests were used. No 3D renderer, visibility, shooting or navigation implementation was changed in this build.

## Schemas

- Career save schema: 19, unchanged.
- Diagnostics schema: 1, unchanged.
