# Strikewatch handoff

This is the default project handoff. Read this file and `AGENTS.md` before
editing. Load `ARCHITECTURE.md`, `CONTRACTS.md` or a historical audit only when
the task-routing table below says they are relevant.

## Current release

- Build: **12.151 — Sentinel Rebuild**
- Build ID: `12.151.0-sentinel-rebuild`
- Editable source: `strikewatch-source/`
- Generated development bundle: `strikewatch-source/js/strikewatch.dev.js`
- Generated standalone: `strikewatch-source/dist/strikewatch-build-12.151.html`
- Live GitHub Pages artifact: root `cod.html`
- Save schema: **19**
- Diagnostics schema: **1**
- Historical release detail: `AUDIT-*.md`, located through `CHANGELOG.md`

Build 12.151 rebuilds the AR-4 and attacks the menu 3D cost. Profiling the Supply Depot first settled what the cost actually was: the game's own JavaScript ran at 1.59ms with zero long tasks inside a 58ms frame, and hiding the four armour rigs dropped it to 4.2ms. Stripping every filter, shadow and border off the faces changed nothing; halving the *number* of faces halved the frame. **These surfaces are quad-bound, not paint-bound** — detail must be proportionate to the size drawn, which is now a `CONTRACTS.md` invariant. The Armoury had a separate and worse fault: `syncCareerWeaponViewerTransform()` wrote inherited `--viewer-*` properties onto every weapon rig per rotation step, including thumbnails that ignore them — the exact pattern 12.142 diagnosed, fixed for armour and then banned. Weapons now rotate a dedicated pivot: 7.63ms per step to 0.015ms. The depot sheds 48% of its rendered quads via a store LOD, thin-part face culling shared by every model, underside culling on the fixed-pitch store orbit, and off-screen cards that stop rendering. **The depot is better but still the heaviest surface in the game, and its frame-interval re-measurement is outstanding — the browser pane stopped compositing, and rAF does not fire in a pane that is not displayed.** The AR-4 gains a buffer tube, mirrored recessed handguard cuts, one continuous flat-top rail, a forward-curving magazine, a three-piece trigger guard, and a grip rake corrected from -12 to +14 (it pointed the butt at the target; 12.149 fixed that sign only through the shared sidearm assembly). See `AUDIT-12.151.md`.

Build 12.150 closes the grip joint and seats the triggers. A raked grip meets the horizontal underside of the frame at an angle, leaving a wedge gap that `weaponGeometryIntegrityForTest()` tolerates — overlapping parts still count as one component — but which reads as a detached handle. `addGripAssembly()` now emits a `grip-tang` carrying half the rake, so every sidearm gained one. The Viper's trigger was 32 tall at y 39 against a guard bar at y 27, so it hung 22 units below its own guard; it now has the three-piece bow and a trigger seated inside it. Note the gate cannot answer "does this look right" — review weapon changes against a capture. See `AUDIT-12.150.md`.

Build 12.149 corrects the grip rake direction on every sidearm. Model +x is toward the muzzle and +y is downward, and the transform is CSS `rotateZ`, so the grip bottom moves by `-sin(rz)` in x — a **negative** `gripRz` points the butt at the target. `scrap-p12` was -13, `service-p12` -1 and `viper-9` 0; all three are now positive (+14/+12/+12) so the butt trails away from the muzzle. The sign error predates 12.148, which only made it visible by raising the magnitude. Verified numerically: the mag base moved from x -61.3 to x -93.5 against a grip at -70. See `AUDIT-12.149.md`.

Build 12.148 reshapes the P12 Scrapline. `addGripAssembly()` applied `gripRz` to each part about its **own** centre, so raking the grip sheared the assembly apart — which is why it only ever had two degrees. Sub-part positions are now rotated about the grip centre, making the assembly rigid, and the grip carries a real −13° rake. The slide is slimmer with cocking serrations over a distinct frame, the trigger guard is a three-piece bow instead of a flat bar, and the ejection port is recessed. `weaponGeometryIntegrityForTest()` caught a genuine break during the work — slimming the slide detached the entire lower assembly — so re-run it after moving any weapon part. See `AUDIT-12.148.md`.

Build 12.147 gives weapons form. Every face of every weapon cuboid used one gradient, so guns read as flat slabs at any angle; per-face directional shading now runs 0.50 on the bottom to 1.30 on the top, matching the armour rig. The `rubber` grip texture dropped from a 9px high-contrast period to 4px, since at inspection scale it read as hazard tape. **Correction to AUDIT-12.141**: weapon geometry has one authority, `careerWeaponVisualParts()`, consumed by the menus, the operator weapon and the viewmodel alike — the earlier claim of two independent authorities was wrong and `CONTRACTS.md` is fixed. See `AUDIT-12.147.md`.

Build 12.146 adds baked ambient occlusion. Enclosure is sampled once from the collision grid when world batches are built and folded into the existing per-draw colour, so it costs no extra draw calls, no texture and no shader work — corridors resolve darker than open rooms. It is quantised to six steps because the static batcher groups by exact material; citadel's batching survives at 120 batch draws. Static batching was **not** extended past citadel: `drawStaticWorld` has many time-dependent draws and `setStaticWorldBatchEligibility()` is never called, so batching other arenas today would freeze their animated decor. See `AUDIT-12.146.md`.

Build 12.145 denoises every arena. The mottling fixed for sandstone in 12.144 existed one level up, in the shared `noise` term read by six surface modes: `hash21(floor(xz * 5.0) + floor(xy * 2.0))`, two mismatched grids whose result also changed with facing direction. It is now smoothly interpolated `valueNoise()` on one grid. Office partitions vary per module instead of per fragment (std dev down 33.1%, horizontal roughness down 61.1%), wall-display scanlines drop from 130 cycles per world unit to 34 at a third of the amplitude, and brushed metal from 92 to 26. Skyline Offices navigation is measured and sound (464 nodes / 1,948 edges / 1 component, 60/60 routes); six symmetric chokepoints are recorded in the audit but the layout is unchanged. See `AUDIT-12.145.md`.

Build 12.144 reworks the Dune surfaces. The desert shader mode multiplied two mismatched `floor()` noise grids, giving unstructured +/-10% speckle that read as a dirty quilt; it is now masonry with courses in a running bond, soft mortar joints and much gentler tone (std dev down 54.9%, horizontal roughness down 63.7%, measured by porting the shader's hash to JS over a fixed grid). Wall panels become inset tilework in four desaturated tones instead of two saturated slabs stuck on the surface. Dune navigation is unchanged at 494 nodes / 2,752 edges / 1 component. Banners and floor tiles are still outstanding. See `AUDIT-12.144.md`.

Build 12.143 gives Dune Bastion a real sky. It is the only open-air arena, and above the ramparts there was no sky pass at all — just the GL clear colour, which was derived from the desert fog `[0.25, 0.18, 0.10]`, a flat muddy brown. `js/65-sky-dome.js` draws a procedural gradient from the view ray's elevation before any world geometry, with depth writes off. The desert fog becomes a warm haze matched to the sky horizon. Dune navigation is unchanged at 494 nodes / 2,752 edges / 1 component and the boot release audit reports no runtime faults. The arena's decor models are untouched. See `AUDIT-12.143.md`.

Build 12.142 fixes the armour viewer lag. The rotation was written to `--armour-viewer-yaw/pitch` on the rig root, and those are inherited custom properties, so every frame invalidated the computed style of all 384+ cuboid faces beneath it — 9.60ms per rotation step against 0.03ms for a direct transform. Rotation now belongs to a dedicated `.career-armour-viewer-pivot`; zoom deliberately stays on the custom property because the per-model and per-width scale factors are layered on it in CSS and it only changes on a button press. The armour models still look bad — that half is not addressed. See `AUDIT-12.142.md`.

Build 12.141 stops earned progress being lost on closing the browser. `exitToMainMenu()` returned to HQ without writing a save and nothing saved on tab close, so Gold Coins banked since the last explicit save went with the session. `js/79-save-checkpoints.js` writes on any match/free-roam to menu transition, on exitToMainMenu, and on visibilitychange-hidden and pagehide. The reward crate now rotates on its own, and the awarded weapon is shown without the crate behind it. Weapon geometry has two independent authorities — `careerWeapon3dParts` for every menu surface and `operatorSharedWeaponRig`/`drawFirstPersonWeapon` for the live match — so a weapon change must be made on both sides. See `AUDIT-12.141.md`.

Build 12.140 makes management actions answer back. `showStatus()` writes to `.status`, which is `display:none` in the menu, so roughly eighty management call sites explained refusals, confirmations and locks to nobody — pressing MATCH with the fixture days away routed to the league table in silence and read as a loop. Management messages now land in a live region in the menu shell. `careerMatchLaunchState()` is the single authority for whether a match can start, the MATCH control shows that state instead of hiding it in a title attribute, and refusals route to the control that clears the blocker. Compact readability floors that had been failing `typographyConsistencyForTest()` are raised. See `AUDIT-12.140.md`.

Build 12.139 states the training requirement where the controls are. Reaching the selects was not enough: the `SAVE CHANGES` bar sat ~630px above the fold once the manager scrolled to them, so a programme could be chosen with no visible way to commit it and no copy saying a second step existed. The draft bar and the roster now share one `.training-programmes-zone`, and the panel head states the requirement and tracks it. Two defects found alongside: `workflowSaveTrainingDrafts()` ignored a refused write, and `firstMatchGuidanceForTest()` could persist an empty squad over a real career. See `AUDIT-12.139.md`.

Build 12.138 clears the First Match Guide soft lock at its final objective. `SET ONE TRAINING FOCUS` routed to the top of Training Facility while the programme selects sat 1100–2900px further down, so the screen the guide opened contained no way to finish the step and the career could not progress. The step now carries a `training-programmes` scroll target and the roster panel carries the matching anchor. The same work fixed guided scrolling below 1024px: `menuHistoryScroller()` returned the desktop `.menu-content` section unconditionally, but the compact interface scrolls `#menuContent`, so every guided scroll destination — including the existing recruitment one — was inert on mobile. See `AUDIT-12.138.md`.

Build 12.137 stops victory crates being lost. The reward existed only in a module variable between the final round and the reveal, so closing the tab or refreshing before claiming destroyed the weapon; the Build 12.134 save hardening could not help because the value never reached the save. The crate is now banked to `careerState.pendingMatchCrate` the moment it is awarded, re-offered if the session is interrupted, and cleared on claim. See `AUDIT-12.137.md`.

Build 12.136 is a hotfix for a Build 12.135 regression. 12.135 gave the scroll container's children a content-based minimum height, which stopped panels being clipped but left the grid rows undersized, so panels overflowed their own row and printed over the next one. The tracks are now sized instead (`grid-auto-rows: max-content`), which resolves clipping and overlapping together, and the compact audit gained an overlap check. See `AUDIT-12.136.md`.

Build 12.135 fixes the panels that rendered as empty boxes. `#menuContent` is a grid, and a grid item that clips its own overflow gets an automatic minimum size of zero, so eighteen panels across thirteen routes were being squashed to padding height with their content clipped underneath — Training Squad, Team XP Benefits, the league table, squad dynamics, the calendar agenda, the loadout panel and the tactical analysis. A league result can no longer be discarded when its fixture id stops resolving, and the league table, Event Agenda and training copy are readable on both targets. See `AUDIT-12.135.md`.

Build 12.134 hardens career persistence and clears the compact interface backlog. Saves are sequenced and read back, so a stale second tab can no longer overwrite newer progress and a rejected write is reported instead of silently discarded. A measured audit closed every horizontal overflow at 390px and lifted the smallest rendered copy from 5.5px to 11px floors. Clubs are now founded with one inherited assistant manager who carries a wage and weak Division 3 judgement, the after-action Combat Effectiveness dial no longer overlaps its caption, and the post-match report always states the fixture type. See `AUDIT-12.134.md`.

Build 12.133 makes the reported command surfaces readable and predictable. Opponent Quick Read tiles, Active Operator Match Roles, Confirm Deployment and the after-action reward guide all gain legible type and tighter alignment; the Inbox feed no longer steals page scroll; applying a scout recommendation and then changing it now asks for confirmation; the same player no longer raises the same Inbox decision repeatedly; and operator portraits carry independent complexion, headgear and kit variation. See `AUDIT-12.133.md`.

Build 12.132 makes match setup selection legible. The Formation, Team Approach, Engagement Range, Map Selection and Team Priority cards gain a distinct selected state (top accent bar, stronger border, ring and surface), a pressed state that fires on pointer-down, a pointer-only hover state, a visible focus outline and a short confirmation pulse re-applied after the panel re-renders. Presentation only; gameplay, tactical fit, saves and match simulation are unchanged. See `AUDIT-12.132.md`.

Build 12.131 consolidates the tactical UI clarity fixes into a numbered release and gives the desktop End Day / Next Day control one persistent high-contrast slate treatment across enabled, locked, blocked and matchday states. The button keeps white primary copy, mint calendar/status copy and its orange response badge, preventing inherited disabled-state opacity from making it unreadable. Tactical summary tags and Active Operator Match Roles retain the 12.130 UI hotfix alignment improvements. See `AUDIT-12.131.md`.

Build 12.130 adds the fourth arena, **Aurora Terminal** (`aurora`): a polar
transit terminal on the existing summit render theme — one bright four-way
symmetric level with twin concourses, lounge pods, a fountain atrium and a
transit spine. All-arena geometry integrity, the aurora audit hook and the
boot release audit pass in engine; the `summit`→`dune` redirect is untouched.
See `AUDIT-12.130.md` before changing this arena.

Build 12.129 streamlines the First Match Guide: guide steps only move forward
(signings and a confirmed plan satisfy the earlier view-flag steps), the
guided match step launches matchmaking directly on matchday and points to End
Day while the fixture is days away, the guided Command Centre shows a fixture
launch card during the match step, and the opening-week day restriction
releases when no market candidate is affordable so recruitment can never
dead-lock the calendar. Double build verified byte-identical and root
`cod.html` matches the standalone; in-game behaviour spot-checks remain
recommended — see `AUDIT-12.129.md`.

Build 12.128 places portrait-windowed match commentary in normal document flow
between the scoreboard strip and round objective. Match moments, play-by-play
and the idle tactical link no longer cover the arena; landscape/maximised
commentary placement remains unchanged. See `AUDIT-12.128.md`.

Build 12.127 restructures the combat-effectiveness graph below 1024px into a
normal-flow score header, readable legend, focused radar plot and HTML stat
tiles. Narrow graph containers use one stat column, medium containers use two,
and wide compact containers place the plot beside the readout; desktop remains
unchanged.
See `AUDIT-12.127.md`.

Build 12.126 keeps compact tactics panels in normal scroll flow, removes the
duplicate floating confirmation control, makes the guided Next Day status
readable, and binds confirmed preparation to the scheduled fixture instead of
the current day. See `AUDIT-12.126.md`.

Build 12.125 caps the desktop Inbox feed at five rows (about four on shorter
viewports), preserves page and list scroll position when a message opens, and
adds restrained translucent desktop command chrome. Compact/mobile mail and
navigation remain unchanged. See `AUDIT-12.125.md`.

Build 12.124 shows the active team name beneath the desktop sidebar crest and
owns the desktop-inline/compact-modal Inbox presentation split. Decision
responses remain available in both presentations. See `AUDIT-12.124.md`.

Build 12.123 extends the skin to the bespoke route surfaces (section hubs,
journey strip, gates, metric tiles, recruitment/market panels). Skin changes
belong in the 12.122/12.123 theme layers near the end of `css/game.css`. See
`AUDIT-12.123.md`.

Build 12.122 is the management-skin authority: a chrome-only theme layer at
the release end of `css/game.css` gives both presentation targets the modern
FM-inspired ink/violet palette, green End Day CTA, route-accent navigation and
elevated card chrome. Change skin colours/chrome there, not in older layers.
See `AUDIT-12.122.md`.

Build 12.121 remains the mobile tactics reachability and section-containment
authority. See `AUDIT-12.121.md`.

Build 12.120 remains the compact readability, recruitment-flow, modal
accessibility and canonical guided-blocker authority. See `AUDIT-12.120.md`.

Build 12.119 remains the guided `NEXT` badge geometry authority. See
`AUDIT-12.119.md`.

Build 12.117 remains the Skyline Offices environment authority. See
`AUDIT-12.117.md` before changing the office map, furniture, doors, ceilings,
floor markings, courtyard lanes or related geometry tests.

## Repository workflow

1. Work only in `strikewatch-source/`.
2. Do not hand-edit `js/strikewatch.dev.js`, `dist/*.html` or root `cod.html`.
3. Update the smallest relevant authority document and current audit.
4. Keep `BUILD_VERSION`, `BUILD_NAME`, `BUILD_ID`, title, asset queries, build
   stamp and both visible version labels aligned.
5. Run `py -3 build.py` from `strikewatch-source/`.
6. Check modular, generated and standalone JavaScript syntax.
7. Run targeted behaviour checks and nearby regressions.
8. Run the build twice and require byte-identical generated output.
9. Copy the verified standalone to root `cod.html` and require byte identity.
10. Commit and push source, concise documentation and release artifacts
    together.

Root `other/` contains unrelated or retired projects. Do not inspect or change
it unless the user explicitly includes it.

## Product boundaries

Strikewatch is an asset-free browser management game built with HTML, CSS,
JavaScript and custom WebGL renderers. The player creates a tactical club,
recruits and finances a persistent squad, selects an active five and watches
autonomous operators execute tactical elimination matches.

- Desktop Command Centre: `1024px` and wider.
- Compact/mobile interface: below `1024px`.
- Primary compact checks: 320, 375, 390, 402 and 430 CSS pixels.
- Primary landscape phone check: 844 × 390.
- Desktop checks: 1024, 1280, 1366, 1440 and 1920 CSS pixels.
- Do not change gameplay, persistence or another presentation target while
  fixing a scoped UI problem unless the task requires it.

## Task routing

Read only the rows relevant to the requested change.

| Task | Read next | Primary source |
| --- | --- | --- |
| Build, version or publishing | `CONTRACTS.md` → Release | `build.py`, `index.html`, `js/00-core.js` |
| Navigation or responsive UI | `CONTRACTS.md` → Interface | `css/game.css`, `js/50-ui-menus.js` |
| First Match Guide/onboarding | `CONTRACTS.md` → Onboarding | `js/50-ui-menus.js`, `js/55-opening-week.js` |
| Team, recruitment or transfers | `ARCHITECTURE.md` → Management | `js/36-team-management.js`, relevant `js/39-*.js` |
| Calendar, finance or progression | `CONTRACTS.md` → Persistence/economy | `js/35-career.js`, relevant `js/39-*.js` |
| Match AI or combat | `CONTRACTS.md` → Match | `js/30-bot-ai.js`, `js/40-match-flow.js` |
| Arenas, WebGL or operator models | `CONTRACTS.md` → Rendering/maps | `js/00-core.js`, `js/61-64-*.js` |
| Save migration or diagnostics | `CONTRACTS.md` → Persistence | `js/35-career.js`, `js/31-match-diagnostics.js` |
| Historical regression | `CHANGELOG.md`, then one matching audit | `AUDIT-<build>.md` |

Use `rg -l "<system or function>" AUDIT-*.md` to locate historical authority.
Do not read every audit by default.

## Completion handoff

Report:

- the user-visible outcome;
- files or systems changed;
- checks run and their results;
- build/version status;
- branch, commit and PR/deployment status when publishing.
