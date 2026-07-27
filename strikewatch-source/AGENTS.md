# Coding-agent instructions

## Default reading

Read `HANDOFF.md` and this file. Do not preload `PROJECT.md`, `README.md`,
`ARCHITECTURE.md`, `CONTRACTS.md`, `CHANGELOG.md` or the audit collection.
Use the routing table in `HANDOFF.md` to load only the relevant section or
audit.

## Working rules

- Inspect the owning source and final CSS/JavaScript cascade before editing.
- Search with `rg` and reuse established helpers before adding a new authority.
- Make the narrowest change that satisfies the request.
- Preserve unrelated user changes in a dirty worktree.
- Edit source, never generated bundle/standalone output directly.
- Keep gameplay, schemas and the other responsive target unchanged unless the
  task explicitly requires them.
- UI fixes require computed-style or live-browser verification at affected
  widths, not source inspection alone.
- Gameplay fixes require targeted `*ForTest()` hooks plus nearby regressions.
- Map/rendering work requires the newest relevant arena audit and integrity
  gates.
- Persistence changes require normalisation, migration and round-trip checks.

## Documentation rules

Documentation is part of a completed change, but avoid duplication.

- Current release state and immediate hazards: `HANDOFF.md`.
- Cross-release invariant: one relevant section in `CONTRACTS.md`.
- Module ownership/dependency change: `ARCHITECTURE.md`.
- Player/developer overview or build command: `README.md`.
- Release-specific implementation and evidence: the current `AUDIT-*.md`.
- Historical routing only: `CHANGELOG.md`.

Do not copy a release narrative into every document. Keep historical detail in
its audit and let Git history preserve superseded wording.

Documentation-only maintenance does not require a game version bump or rebuilt
artifacts when no source, metadata or generated output changes. It still
requires link/routing validation and a clean diff.

## Playable release gate

- `BUILD_VERSION`, `BUILD_NAME`, `BUILD_ID` and static labels agree.
- `py -3 build.py` succeeds.
- Every modular JavaScript file and generated bundle parses.
- Standalone inline JavaScript parses.
- Targeted behaviour and adjacent regressions pass.
- Affected responsive widths have no unexpected overflow.
- Browser/runtime logs have no new errors.
- Two builds produce identical bundle and standalone hashes.
- Root `cod.html` is byte-identical to the standalone.
- Source, concise docs, audit and generated artifacts are committed together.

## Current release note

Build 12.133 owns the readability, alignment and portrait layer at the release end of `css/game.css`, `js/77-mail-scroll-guard.js`, the recommended-plan change warning in `js/39-matchday.js` and the per-player decision cooldown in the same file. Keep the Inbox feed inert until it is clicked, keep the plan warning firing only while an intact recommendation is applied, and keep operator portraits deterministic and asset-free. See `AUDIT-12.133.md`.

Build 12.132 owns the match setup selection feedback layer at the release end of `css/game.css` plus `js/76-tactical-selection-feedback.js`. Keep the choice cards' selected, pressed, hover, focus and confirmation states distinct at every width, and keep the layer last in the cascade: the Command Skin sets `border` on a bare `button` with `!important` and puts `.club-formation-card` in a (0,4,1) `!important` group, so those rules need their specificity bump to reach the element. See `AUDIT-12.132.md`.

Build 12.131 owns the consolidated tactical clarity presentation and persistent End Day / Next Day contrast. Keep every calendar-control state on the same readable slate surface with white primary copy, mint supporting copy and full opacity; preserve the existing button lock, blocker and progression behaviour. See `AUDIT-12.131.md`.

Build 12.130 owns the Aurora Terminal arena (`aurora`, summit theme, single
level, four-way symmetric, no doors/stairs/vertical profile). Keep its
presentation contract, `auroraTerminalAuditForTest()` and the all-arena
geometry gate passing; do not repurpose the `summit` arena-id redirect. See
`AUDIT-12.130.md`.

Build 12.129 owns the guided opening flow. Keep First Match Guide steps
forward-only (derived from existing career state, no saved progression
authority), keep a visible match-launch or End Day action available on the
guided `match` step, and keep the opening-week day restriction releasing when
recruitment is stalled by affordability. See `AUDIT-12.129.md`.

Build 12.128 owns portrait-windowed commentary placement. Keep the shared
commentary dock between the scoreboard and round objective, keep match moments
and feed rows in normal flow rather than over the arena, and restore the dock
to its existing match-view position for landscape/maximised presentation. See
`AUDIT-12.128.md`.

Build 12.127 owns the compact combat-effectiveness presentation. Keep its
score header and legend in normal flow, hide the tiny SVG perimeter labels
below 1024px, expose all five values through readable HTML stat tiles, retain
the narrow-container single-column fallback and preserve the desktop chart. See
`AUDIT-12.127.md`.

Build 12.126 owns compact tactics flow and fixture-persistent match
preparation. Keep tactics panels in content-sized grid rows, retain one
normal-flow final check, show readable guided Next Day status, and invalidate
a confirmed plan only for a new fixture or material setup change. See
`AUDIT-12.126.md`.

Build 12.125 owns the desktop Inbox viewport, email-selection scroll retention
and translucent command chrome. Keep the feed at no more than five visible
rows, preserve both page and feed position through a reader refresh, and keep
the compact/mobile presentation unchanged. See `AUDIT-12.125.md`.

Build 12.124 owns desktop club identification and Inbox presentation:
the active team name appears beneath the desktop crest, desktop email rows
select the adjacent reader, and compact/mobile rows retain the mail modal.
Preserve inline decision actions and the 1024px presentation boundary. See
`AUDIT-12.124.md`.

Builds 12.122–12.123 add the Command Skin theme layers near the end of
`css/game.css` (12.123 covers bespoke route surfaces).
Visual/chrome changes belong in that layer; it must stay chrome-only (no
geometry, font-size or touch-target changes). Preserve the compact 12px
meaningful-copy floor, 14px explanatory floor, the Build 12.121 tactics
containment and the Build 12.120 onboarding/accessibility safeguards.
See `AUDIT-12.123.md` and `AUDIT-12.122.md`.
