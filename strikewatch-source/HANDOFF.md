# Strikewatch handoff

This is the default project handoff. Read this file and `AGENTS.md` before
editing. Load `ARCHITECTURE.md`, `CONTRACTS.md` or a historical audit only when
the task-routing table below says they are relevant.

## ChatGPT-only publishing preference

This subsection is a user preference for ChatGPT sessions only. Other coding agents should ignore it and follow their normal supported publishing workflow.

For ChatGPT releases when direct Git push is unavailable, prefer the proven separated GitHub workaround:

1. Commit the release patch/script first.
2. Commit the release workflow separately so it already exists on the default branch.
3. Trigger it with a third, distinct commit.
4. The workflow must build twice, require identical hashes, parse source/generated/standalone JavaScript, run targeted checks, copy the verified standalone to root `cod.html`, confirm byte identity, commit the complete release, and remove its temporary script/workflow/trigger files.
5. Never claim deployment until the generated release commit is visible on `main` and `RELEASE.json` plus `cod.html` confirm the new build.

## Current release

- Build: **12.164 — Lean Standalone**
- Build ID: `12.164.0-lean-standalone`
- Editable source: `strikewatch-source/`
- Generated development bundle: `strikewatch-source/js/strikewatch.dev.js`
- Generated standalone: `strikewatch-source/dist/strikewatch-build-12.164.html`
- Live GitHub Pages artifact: root `cod.html`
- Save schema: **19**
- Diagnostics schema: **1**
- Historical release detail: `AUDIT-*.md`, located through `CHANGELOG.md`

Build 12.164 reduces the shipped standalone without changing executable tokens or visual declarations: the release copy strips only whole-line comments and redundant blank runs, while the readable source modules and development bundle remain unchanged. `dist/strikewatch-build-12.164-size.json` records raw and deterministic gzip sizes. See `AUDIT-12.164.md`.

Build 12.163 fixes compact club-navigation destination rows that could overlap at phone widths and reflows the fixed management alert into a safe two-row mobile layout. See `AUDIT-12.163.md`.

Build 12.162 adds conservative whole-operator frustum culling before procedural body, armour and weapon assembly. A 1.85-unit guard sphere must be wholly outside the camera before any draw is skipped. Use `?dynamicCulling=0` as the visual reference and keep `dynamicActorCullingForTest()` green. See `AUDIT-12.162.md`.

Build 12.161 fixes the returning-career startup migration crash by initialising the durable career store before finance modules. It restores pinch zoom, adds compact type and touch floors, improves wrapping in management and match interfaces, and makes scoreboard telemetry diagnostics side-effect free. See `AUDIT-12.161.md`.

Build 12.160 settles the operator surface and deepens their contact occlusion. **Surface detail for anything that moves must be anchored to the model, not the world** — that is the whole build. Every surface mode reads `vWorldPosition`, which is right for a wall and wrong for a person: the detail did not travel with them, so the room swept across them as they walked. The kit weave ran at 95 and 88 cycles per world unit against 12.145's roughly-40 aliasing threshold, the skin at 31 and 17, and the overhead light pools pulsed an operator several times a second as they crossed the room grid. The vertex shader now carries model space too and `withLocalSurfaceDetail()` selects it, wrapping exactly two things: the operator draw (living and fallen) and the viewmodel. `mix(a, b, 0.0)` returns `a` exactly, so the world takes the identical path — verified at **0.0000% pixels changed, max 1/255, in all four arenas back to back with identical draw calls**. Operator AO from 12.157 was already enabled but at 8–18%, too shallow to read; it is now 16–32%, still colour-baked, tunable via `OPERATOR_AMBIENT_OCCLUSION.factors`. **Never put backticks inside the shader source — it lives in a template literal and a backtick in a GLSL comment closes the string.** See `AUDIT-12.160.md`.

Build 12.159 adds IndexedDB as the career's durable tier (`js/81-career-indexeddb.js`) and reports save size on the configuration page. **It is a tier, not a replacement, and that is deliberate**: IndexedDB is asynchronous, and Build 12.141's `pagehide`/`visibilitychange` checkpoints only land because `localStorage.setItem` completes inside the handler, so making the save path async would reintroduce the defect 12.141 fixed. localStorage stays the synchronous write-through and boot-read tier; IndexedDB holds every committed save and is the only tier that can still accept a career once localStorage is full — quota there measured 5.54GB against roughly 5MB. `saveSequence` is the sole arbiter when the tiers disagree: higher is newer. Two new behaviours: a quota rejection now falls through to the durable tier instead of reporting lost progress, and a career the browser evicted from localStorage is adopted back on the next boot, guarded so it can only take a strictly newer save and never overwrite one this session has already been playing. Save schema stays 19. See `AUDIT-12.159.md`.

Build 12.158 makes the primary career save the durability authority under browser-storage pressure. The new primary is written and read back before the optional recovery backup is refreshed; an unprotected backup may be discarded only when it blocks the primary or its sequence metadata. A stale match still may not overwrite a newer career unless that displaced career has first been preserved and verified. Keep `storagePressureSaveForTest()`, `durableMatchSettlementForTest()` and `staleSaveGuardForTest()` green. See `AUDIT-12.158.md`.

Build 12.157 adds baked contact ambient occlusion to living and fallen operator models by selecting darker variants from the existing procedural palette at authored overlap zones. It adds no meshes, draw calls, textures, shader passes or uniforms. The compact Armoury inventory is also a bounded card grid at every supported phone/Fold width: comparison badges remain visible, issue state is horizontal, and the list no longer relies on the broken portrait carousel. Keep `operatorAmbientOcclusionForTest()` and the loadout-only responsive matrix green. See `AUDIT-12.157.md`.

Build 12.156 makes completed match settlement a protected durability boundary. If another tab or restored session advances the save sequence during a match, the displaced stored career is preserved as the recovery backup and the fully settled result — Gold Coins, league fixture, finances, player progression and any pending victory crate — is written before the reward presentation can be left. Ordinary stale autosaves remain blocked. `durableMatchSettlementForTest()` covers the stale-save round trip. See `AUDIT-12.156.md`.

Build 12.155 replaces the Armoury's live 3D previews with stills rasterised from the same part lists, and puts the rotating model behind INSPECT IN 3D — **804 CSS-3D quads and 1,361 DOM nodes down to zero quads and 387 nodes**, with at most one live rig mounted at a time (`careerInspectState`). `js/57-loadout-stills.js` owns it. Two things must not be broken there: it is a *renderer*, so it consumes the shared part lists and never forks one, and it reads material colours back out of `css/game.css` through a hidden probe rather than duplicating the palette, so a CSS change carries into the stills automatically. **Menu re-render time is a wash (14.2ms to 15.3ms)** — parsing a few large data URLs costs about what building 800 elements did — so the saving is per-frame compositor work, not render time, and the frame rate itself is still unmeasured because the browser pane does not composite. Also adds impact decals for missed shots, placed with the same grid raycaster line-of-sight uses, capped at 48 and drawn **outside** `drawStaticWorld` so 12.154's batching cannot bake and freeze them. See `AUDIT-12.155.md`.

Build 12.154 extends static world batching to every arena — 58–75% fewer draw calls on Dune, Aurora and Offices, which had never been batched. The blocker was four animated draws left unwrapped (Dune lamp glow, banner cloth, torch flame; coolant tank column); they are wrapped now. **There was a second, independent `activeArenaId === 'citadel'` gate inside `drawMesh()`** as well as the one in the render path, and clearing only the render-path one produced no batches at all — if batching ever appears not to apply, check both. Faithfulness was proven against the renderer's own `?staticBatching=0` reference (99% of pixels within 1/255; the Offices view, which has no animated decor, differs by at most 1 across the frame), and nothing froze: on the pixels the unbatched build animates strongly, the batched build animates them by exactly the same amount. **Any new draw in `drawStaticWorld` that depends on `time` or any per-frame state must be wrapped in `setStaticWorldBatchEligibility(false)`, or batching will bake it and freeze it for the session.** See `AUDIT-12.154.md`.

Build 12.153 makes the baked occlusion legible. **It does not add shadows** — there is still no shadow map, light-space pass or screen-space AO anywhere in the renderer, so nothing casts anything; that work remains outstanding. What 12.146 shipped was applied to three draw calls (wall, kick, trim) and fed the raw enclosure ratio into a 0.22 strength, so the floor had no occlusion at all and 76% of Citadel's walls sat inside a 3.7% brightness band. The floor is now shaded per cell and merged by the greedy sweep the walls use, walls are sampled from the open cells facing them rather than from their own centre, and the raw ratio is remapped so open space is left at exactly zero — which is what makes the higher strengths safe. **The contact radius is the thing that decides whether any of this reads:** the first attempt reused the walls' 2.6-unit radius, and because a three-wide corridor sits entirely within that, every cell darkened equally and a captured frame moved by 0.63/255. The floor samples at 0.72/1.45 instead. Ground plates (`zoneFloors`, `floorPatches`, `laneStrips`, `floorDecals`) had to be shaded too — they cover most of the ground a camera sees, and a shaded floor under an unshaded plate is no change. Wall contrast roughly doubles everywhere; floor gains a 50% range. Cost is **+1.4% draw calls on batched Citadel against 7–9% on the three unbatched arenas**, which is the clearest argument yet for finishing the batching work. `AGENTS.md`'s claim that `setStaticWorldBatchEligibility()` is never called was false and is corrected; the real blocker is four unwrapped animated draws, named in the audit. See `AUDIT-12.153.md`.

Build 12.152 fixes a regression 12.151 shipped and finishes the preview work. **A pre-existing `.career-weapon-inspector.ar4-sentinel` rule is (0,3,0) and outranked the new (0,2,0) `.career-weapon-viewer-pivot > .career-weapon-rig` rule**, so it kept re-applying `rotateX(var(--viewer-pitch)) rotateY(var(--viewer-yaw))` — variables that are now static defaults — and the AR-4 inspector rendered at a fixed compound angle while dragging turned an already-turned frame. Only that model was affected, because it is the only one with a per-class inspector override: when you move a transform to a wrapper, grep for every per-model override of the element you moved it off. The AR-4 magazine is now a computed chain of three segments rather than two hand-placed ones whose walls crossed. Weapon previews frame themselves — the rig publishes `--model-span`/`--model-centre-*` from the parts it actually draws and each context declares `--fit-span`, replacing four hand-tuned AR-4 scales that still left the thumbnail cropped at 1.6x its box. `careerWeaponThumbnailParts()` gives weapons the thumbnail LOD armour has had since 12.54, and `will-change` now sits only on elements that animate (seven promoted layers on the Armoury down to two). Armoury quads 1,270 to 1,046; the depot is unchanged at 1,268. **Frame rate is still unmeasured — `requestAnimationFrame` fires zero frames in a browser pane that is not displayed, confirmed with a probe.** See `AUDIT-12.152.md`.

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
