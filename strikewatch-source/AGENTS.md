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

Build 12.144 owns the desert sandstone surface (`uSurface == 7` in `js/60-renderer-core.js`) and the Dune wall tilework. Keep surface variation structured — courses, bond and joints — rather than hashed noise, and keep the tile tones desaturated enough to sit against sandstone. Measure changes with `arenaSurfaceSampleForTest()` or by porting the shader maths, not by eye alone. See `AUDIT-12.144.md`.

Build 12.143 owns the open-air sky (`js/65-sky-dome.js`). Only the `desert` theme has a preset; every other arena is roofed. The sky pass must keep writing no depth and must restore `DEPTH_TEST`/`CULL_FACE` and rebind the world program, so it can never affect collision, navigation or line of sight — re-check the Dune nav baseline (494 nodes / 2,752 edges / 1 component) after touching it. Sky colour and fog colour are separate decisions now; do not re-couple them. See `AUDIT-12.143.md`.

Build 12.142 owns the armour viewer rotation pivot. Never drive a per-frame animation by writing an inherited custom property onto an ancestor of a large CSS-3D subtree: it invalidates every descendant's computed style. Rotate a dedicated wrapper instead. `--armour-viewer-scale` stays a custom property on purpose — the per-model and per-width scale factors are layered on it in CSS. See `AUDIT-12.142.md`.

Build 12.141 owns career save checkpoints (`js/79-save-checkpoints.js`): any path that returns the manager to HQ, and any page-hide or unload, must leave progress written. Do not add a route back to HQ that skips a save. The reward crate spins from the wall clock passed into `renderCareerCrate3D` — never a per-call increment, which makes the rate frame-dependent. Note that `js/70-runtime.js` assigns `window.__strikeDebug` wholesale, so a `*ForTest()` hook added by an earlier module is discarded; register from a module after 70. See `AUDIT-12.141.md`.

Build 12.140 owns the management status surface (`js/78-management-status.js`) and `careerMatchLaunchState()`. Any control that can refuse must state that before it is pressed and route to whatever clears the blocker; never rely on `showStatus()` alone, and never add a management message that only the match HUD could show. Keep `typographyConsistencyForTest()` green — it had been failing for several builds. See `AUDIT-12.140.md`.

Build 12.139 owns the training requirement statement and the `.training-programmes-zone` wrapper: the workflow draft bar must stay adjacent to the roster it saves, and the panel head must state the outstanding requirement rather than describe the system. The wrapper is a `#menuContent` grid child and must never clip its overflow. A `*ForTest()` hook that mutates `careerState` must suppress persistence for the duration — `firstMatchGuidanceForTest()` blanked a live squad into the save before this build. See `AUDIT-12.139.md`.

Build 12.138 owns guided scroll reachability. Every First Match Guide step whose control is not on the arrival screen needs a `scrollTarget` on the step and a matching `data-guide-target` anchor on the owning panel — the `training` step and `.training-roster-panel` are the current example. `menuHistoryScroller()` must keep resolving to the element that actually scrolls (`#menuContent` on compact, the `.menu-content` section on desktop); returning one of them unconditionally silently disables guided scrolling and history restore on the other target. Keep `firstMatchGuidanceForTest().ok` true — it had been permanently false because its journey-strip assertion was case-sensitive. See `AUDIT-12.138.md`.

Build 12.137 owns victory-crate persistence: `careerState.pendingMatchCrate` is written when the crate is awarded, restored by `queuePendingMatchCrate()` and cleared on claim. Any reward the manager has earned must reach the save before it is displayed, never only module state. See `AUDIT-12.137.md`.

Build 12.136 owns the scroll-container row sizing (`#menuContent { grid-auto-rows: max-content; align-content: start }`). Size the tracks, never the items: giving items a minimum height instead leaves rows undersized and makes panels overlap. Keep `mobileInterfaceAuditForTest()` reporting zero for both `overlapping` and `collapsed`. See `AUDIT-12.136.md`.

Build 12.135 owns the container-collapse fix (`#menuContent > * { min-height: max-content }` at the release end of `css/game.css`), league settlement recovery in `js/37-league.js` and the league/agenda/training readability rules. Keep `mobileInterfaceAuditForTest().collapsed` at zero, never let a league result settle to null, and keep the agenda action label short rather than repeating the row copy. See `AUDIT-12.135.md`.

Build 12.134 owns career save durability (`saveCareerState` sequencing and read-back in `js/35-career.js`), the compact readability/containment layer at the release end of `css/game.css`, the inherited founding assistant in `js/39-club-operations.js` and `careerMatchTypeDescriptor`. Keep saves sequenced, keep `mobileInterfaceAuditForTest` reporting zero overflow at 390px, and keep the founding assistant one-per-career and deliberately weak. See `AUDIT-12.134.md`.

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
