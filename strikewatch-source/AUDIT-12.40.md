# Strikewatch Build 12.40 Audit — Season Stories

## Scope

Build 12.40 adds a low-maintenance season narrative layer across the existing League loop. Fixture stakes, supporter and board expectations, form storylines, rivalries and club history are derived from authoritative schedule, table, result, operator and squad-dynamics data. The system follows a recognise-don't-interrupt rule: it creates context and history without adding routine decisions or changing match outcomes.

## Implemented behaviour

- Persistent `seasonNarrative` state under unchanged career save schema 19, safely normalised for older careers.
- Evidence-based next-fixture context including season opener, table-neighbour, promotion race, promotion six-pointer, survival six-pointer, revenge match, form response and rivalry states.
- Fixture importance from 1–5 with readable table, supporter and board context.
- Rivalry records per opposing club, including meetings, wins, losses, close/decisive results and last meeting.
- Rivalry tiers at Standard 0, Emerging 20, Heated 45 and Fierce 75.
- Automatic storylines for promotion contention, surprise campaigns, form runs, home/away trends, breakout operators, famous partnerships and tactical identity.
- Club records for biggest win, biggest defeat and longest winning streak.
- Completed-season archives containing division, finish, points, results, round difference, movement, champion, top operator and strongest partnership.
- Long-term records for highest finish, highest points and best round difference.
- Consistent story presentation in the League dashboard, fixture list, Command operations panel, deployment brief, pre-match team reveal and match debrief.
- Occasional informational competition inbox headlines for major rivalry, record, high-stakes and season-history events.

## Low-maintenance and balance boundaries

- No mandatory conversations, responses, daily actions or End Day blockers.
- No combat, health, damage, accuracy, weapon, pathfinding, operator attribute, opponent attribute or fixture-result modifiers.
- High-stakes victories may grant only a positive reputation bonus from 0–2. Defeats never subtract reputation.
- Narrative fixture settlement is protected by the current fixture ID and the rivalry's last fixture ID.
- Completed seasons archive once. Headline, archive and mail-key arrays are capped.
- Existing scouting disclosure, supporter, League, squad-dynamics, tactical and match authorities remain authoritative.

## Automated validation

- Standalone boot and Build 12.40 identity: passed.
- Fresh League dashboard, next-fixture context, supporter/board views, storylines and record book rendering: passed.
- One-fixture form, rivalry, record and headline settlement: passed.
- Duplicate fixture settlement protection: passed.
- Save normalisation and narrative round-trip parity: passed.
- Repeated meetings and Emerging rivalry progression from real result evidence: passed.
- Positive-only reputation range and cap: passed.
- Completed-season archive, highest-finish record and retained new-season history headline: passed.
- No narrative-related required-response or End Day blocker: passed.
- 320x760, 375x812, 390x844, 430x932 and 844x390 horizontal containment: passed.
- Retained priority UX, opponent preparation, squad dynamics and tactical suitability smoke checks: passed.
- Modular JavaScript syntax, generated bundle syntax, deterministic rebuild and archive rebuild parity: passed.

## Renderer note

The headless Chromium environment does not expose WebGL. Renderer-independent state, DOM, save, League and match-presentation tests were used. No renderer, visibility, shooting, navigation or map implementation changed in this build.

## Schemas

- Career save schema: 19, unchanged. `seasonNarrative` is an additive, backwards-compatible state object.
- Narrative state version: 1.
- Diagnostics schema: 1, unchanged.
