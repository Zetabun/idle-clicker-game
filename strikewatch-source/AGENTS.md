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

Build 12.182 owns asset-free operator portrait presentation in `css/operator-portrait.css`. Keep it immediately after `game.css`, before `command-chrome.css`. Preserve the independent skin/kit custom properties, tone/variant/headgear/rig classes, role-accent comms light, 54×52px desktop deployment portrait, 50×50px compact portrait and `.88` bust scale. Identity and class generation remain in `teamPlayerVisualMarkup(player, role)`. Verify `mobileInterfaceAuditForTest()`, `renderRouteForTest()` and `typographyConsistencyForTest()` alongside source-markup and CSS ownership gates. See `AUDIT-12.182.md`.

Build 12.181 owns compact shared command typography and containment in `css/command-chrome.css`. Keep it after `operator-portrait.css`, before `combat-effectiveness.css`. Preserve the 11–12px floors, 11.5px Armoury labels, `overflow-wrap: anywhere`, normalised Armoury small-copy wrapping and wrapped command metadata. Verify `mobileInterfaceAuditForTest()`, `typographyConsistencyForTest()`, `economyGuidanceForTest()` and `renderRouteForTest()` alongside the CSS ownership gates. See `AUDIT-12.181.md`.

Build 12.180 owns the compact after-action Combat Effectiveness ring in `css/combat-effectiveness.css`. Keep it after `command-chrome.css`, before `match-type.css`. Preserve the 138px ring and external 11px caption below 1024px, the 124px/10.5px narrow-phone adjustment below 381px, and the wrapped influence legend. Verify `firstMatchPayoffForTest()`, `mobileInterfaceAuditForTest()`, `renderRouteForTest()` and `typographyConsistencyForTest()` alongside the CSS ownership gates. See `AUDIT-12.180.md`.

Build 12.179 owns post-match fixture-type presentation in `css/match-type.css`. Keep it after `combat-effectiveness.css`, before `route-readability.css`. Preserve the detailed-report competition kicker/name/detail floors and the staged first-match type line at the existing 1023px breakpoint; classification remains in `careerMatchTypeDescriptor(summary)`. Verify `firstMatchPayoffForTest()`, `leagueMatchFlowForTest()`, `renderRouteForTest()` and `typographyConsistencyForTest()` alongside the CSS ownership gates. See `AUDIT-12.179.md`.

Build 12.178 owns the Build 12.134 route-specific compact typography floors and dense-grid containment in `css/route-readability.css`. Keep it after `match-type.css`, before `management-grid.css`. Preserve the two 1023px media blocks, 11–12px label/copy floors and `min-width: 0` containment for dense route cards. Verify `mobileInterfaceAuditForTest()`, `typographyConsistencyForTest()`, `economyGuidanceForTest()` and `renderRouteForTest()` alongside the CSS ownership gates. See `AUDIT-12.178.md`.

Build 12.177 owns management-route grid track sizing in `css/management-grid.css`. Keep it after `route-readability.css`, before `league-table.css`. `#menuContent` must retain `grid-auto-rows: max-content` and `align-content: start`; item-level `min-height: max-content` reintroduces overlap and must not return. Verify `mobileInterfaceAuditForTest()`, `renderRouteForTest()` and `typographyConsistencyForTest()` alongside the CSS ownership gates. See `AUDIT-12.177.md`.

Build 12.176 owns league-table typography, compact row height and club-name wrapping in `css/league-table.css`. Keep it after `management-grid.css`, before `calendar-agenda.css`. Preserve the 52px compact row, the 1023px breakpoint and the desktop/compact header, position, club-name and sub-line floors. Verify `leagueMatchFlowForTest()`, `orphanedLeagueFixtureForTest()`, `renderRouteForTest()`, `mobileInterfaceAuditForTest()` and `typographyConsistencyForTest()` alongside the CSS ownership gates. See `AUDIT-12.176.md`.

Build 12.175 owns club calendar agenda typography, compact two-column reflow and action-target sizing in `css/calendar-agenda.css`. Keep it after `league-table.css`, before `training-readability.css`. Preserve the 62px date column, wrapped compact title/detail copy, second-column action placement and 44px compact target. Verify `clubCalendarAgendaActionMarkup`, `clubCalendarAgendaMarkup`, `renderClubCalendarTab`, `mobileInterfaceAuditForTest()` and `typographyConsistencyForTest()` alongside the CSS ownership gates. See `AUDIT-12.175.md`.

Build 12.174 owns training/development typography floors and programme-control sizing in `css/training-readability.css`. Keep it after `calendar-agenda.css`, before `training-programme.css`. Preserve the 40px desktop and 46px compact select heights, the 1023px breakpoint and the existing card/intro copy floors. Verify `typographyConsistencyForTest()`, `mobileInterfaceAuditForTest()`, `firstMatchGuidanceForTest()` and the CSS ownership gates. See `AUDIT-12.174.md`.

Build 12.173 owns the training workflow wrapper and outstanding-programme accent state in `css/training-programme.css`. Keep it after `training-readability.css`, before `management-feedback.css`. The wrapper must stay an unclipped grid that inherits the route gap, and `.needs-programme` must retain the accent rail and kicker. Verify `firstMatchGuidanceForTest()`, `mobileInterfaceAuditForTest()`, `guidanceConsolidationForTest()` and the CSS ownership gates. See `AUDIT-12.173.md`.

Build 12.172 owns the management live-status banner and visible blocked/ready match-state presentation in `css/management-feedback.css`. Keep it after `training-programme.css`, before `compact-readability.css`. The live region must remain above compact navigation, dismissible, and visible for repeated refusals; the match control must retain its visible state line and blocked/ready colours. Verify `managementStatusForTest()`, `showManagementStatusForTest()`, `typographyConsistencyForTest()` and `mobileInterfaceAuditForTest()` alongside the CSS ownership gates. See `AUDIT-12.172.md`.

Build 12.171 owns the compact 12px management typography floors in `css/compact-readability.css`. Keep it after `management-feedback.css`, before `reward-reveal.css`. Do not weaken the 12px floors for the date lines, subnav lock/access chips, economy-guide metadata or match-state label below 1024px. Verify `typographyConsistencyForTest()`, `mobileInterfaceAuditForTest()` and `economyGuidanceForTest()` alongside the CSS ownership gates. See `AUDIT-12.171.md`.

Build 12.170 owns crate-to-award phase visibility and full-width award placement in `css/reward-reveal.css`. Keep it after `compact-readability.css`, before `armour-viewer.css`. In `cycling` and `revealed`, the crate core must be hidden and the weapon model must span the reveal grid. Verify `crateSpinForTest()`, `crateAttachmentForTest()` and `firstMatchPayoffForTest()` alongside the CSS ownership gates. See `AUDIT-12.170.md`.

Build 12.169 owns the armour inspector rotation pivot, drag/auto-rotate transition behaviour and inspector-only compositor promotion in `css/armour-viewer.css`. Keep it after `reward-reveal.css`, before `weapon-presentation.css`. Never move rotation back to inherited `--armour-viewer-yaw/pitch` properties on the rig root; that invalidates hundreds of face styles per frame. Verify `armour3dPresentationForTest()`, `armourSystemForTest()` and `loadoutStillForTest()` alongside the CSS ownership gates. See `AUDIT-12.169.md`.

Build 12.168 owns CSS-3D weapon face/cylinder lighting and grip texture in `css/weapon-presentation.css`. Keep it after `armour-viewer.css` and before `loadout-stills.css`; the extraction changes no declarations and must remain shared by crate reveals, inventory thumbnails, Armoury inspectors and store cards. Verify weapon geometry/presentation and loadout still gates. See `AUDIT-12.168.md`.

Build 12.167 owns loadout still stages and on-demand inspector controls in `css/loadout-stills.css`. Keep it after `weapon-presentation.css`, before the 12.161 audit layer. `CSS_PATHS` and `index.html` must remain identical in file order; the build checks this and standalone CSS-link removal. See `AUDIT-12.167.md`.

Build 12.166 owns compact Armoury inventory layout in `css/armoury-inventory.css`, ordered after `12.161-audit-fixes.css` and before `compact-navigation.css`. The development link order and `CSS_PATHS` order must match, and standalone output must contain no external `css/` stylesheet link. See `AUDIT-12.166.md`.

Build 12.165 owns the first CSS boundary: compact navigation and the phone management alert live in `css/compact-navigation.css`, loaded after the legacy and 12.161 layers. Do not move them back into `game.css`. Keep the CSS debt report within budget and preserve stylesheet order. See `AUDIT-12.165.md`.

Build 12.164 owns conservative release-only comment stripping in `build.py`. The development bundle must remain readable. Never broaden this into token rewriting without a real JavaScript/CSS parser; template-literal contents, CSS declarations and executable code must remain byte-for-byte apart from removed comment-only/blank lines. Keep the 2.5% minimum reduction gate and the deterministic size report green. See `AUDIT-12.164.md`.

Build 12.162 owns whole-operator frustum culling. Keep the 1.85-unit guard radius conservative; `?dynamicCulling=0` is the reference path and `dynamicActorCullingForTest()` is the deterministic guard. See `AUDIT-12.162.md`.

Build 12.160 owns the surface-detail coordinate space. **World-space detail is only correct for geometry that stays put.** Anything that moves — operators, corpses, the viewmodel — must draw inside `withLocalSurfaceDetail()`, which switches the whole surface layer to model space; static geometry must never set it. Keep detail frequency under roughly 40 cycles per unit of whichever space is being sampled: the 12.145 threshold applies in model space too, and the operator kit had been running at 95. Operator AO is colour-baked and lives in `OPERATOR_AMBIENT_OCCLUSION.factors` — lower is darker, no meshes or draws involved. Two traps: **backticks inside the shader source terminate it**, because it is a JavaScript template literal, and a stray one in a GLSL comment produces a SyntaxError somewhere unrelated; and a pixel A/B is only meaningful when both sides are captured **back to back in one pass** — comparing capture sets from different turns produced a phantom 51% regression during this build. See `AUDIT-12.160.md`.

Build 12.159 owns the two-tier career store (`js/81-career-indexeddb.js`). **`saveCareerState()` must stay synchronous through its verified commit** — the durable tier is a mirror and a fallback, and turning the save path into a promise stops Build 12.141's unload-time checkpoints landing. localStorage is the synchronous write-through and the only tier that can be read at boot; IndexedDB is the durable mirror and the fallback when quota rejects a write. `saveSequence` is the only arbiter between them, higher is newer, and any future tier must maintain it. Adoption from the durable tier may only fire when the mirrored sequence is strictly higher **and** this session has not yet saved, or it becomes the silent overwrite 12.134 set out to prevent. Note that top-level navigations in the browser preview pane intermittently stall mid-boot — that is the pane, not the build; boot each build five times in an iframe to tell the difference. See `AUDIT-12.159.md`.

Build 12.158 owns storage-pressure-safe career commits in `js/35-career.js`, the mature-save regression in `js/70-runtime.js`, and stale-match preservation in `js/80-durable-results.js`. The primary career must be written and verified before refreshing an optional unprotected backup. If an old backup blocks the primary or its metadata, it may be evicted with a visible `CAREER SAVED · BACKUP LIMITED` warning. Never evict a protected backup, and never force a stale match over a newer primary unless the displaced career has been written and read back as recovery. See `AUDIT-12.158.md`.

Build 12.157 owns operator contact shading in `js/62-character-renderer.js` and the compact Armoury inventory reflow in `css/armoury-inventory.css`. Operator AO is deliberately colour-baked: contact parts use darker variants from the existing deterministic palette, with zero additional meshes, draws, textures or shader work; living and corpse paths must stay aligned. On compact Armoury routes, keep explicit `thumb/copy/compare/state` grid areas, horizontal issue state and no horizontal carousel at supported widths. Verify with `operatorAmbientOcclusionForTest()` and the 320/375/390/430/823/844×390 loadout matrix. See `AUDIT-12.157.md`.

Build 12.156 owns durable match settlement (`js/80-durable-results.js`). A completed match is a protected save boundary after all rewards and league state have settled; ordinary stale-session autosaves must remain blocked. If the protected write displaces a newer stored career, preserve that stored career through the existing recovery backup before writing. Keep `durableMatchSettlementForTest()` green and retain the final module ordering after `79-save-checkpoints.js`. See `AUDIT-12.156.md`.

Build 12.155 owns the loadout stills (`js/57-loadout-stills.js`) and impact decals. A still is a **renderer**, not a geometry authority — feed it `careerWeaponVisualParts()` / `careerArmour3dParts()` and never give it its own part list. Do not hard-code material colours into it either: it probes `css/game.css` through a hidden element whose ancestor chain matches a real rig, so the palette stays in one place. **Only one live CSS-3D rig may be mounted at a time**; `careerInspectState` is the record, and every path that changes the selected weapon or vest must clear it or a rig will outlive what it belongs to. Impact decals must stay outside `drawStaticWorld` — batching bakes model matrices, so a decal captured into a batch is frozen on that wall for the session. Note that this build did **not** make menu re-rendering faster (14.2ms to 15.3ms); it removed standing per-frame compositor work, which is a different thing, and the frame rate remains unmeasured. See `AUDIT-12.155.md`.

Build 12.154 owns static world batching, which is now on for **every** arena. Two things to know. First, **there are two gates**: the capture trigger in `js/63-viewmodel-renderer.js` and a per-draw `batchable` check inside `drawMesh()` in `js/60-renderer-core.js`. Both carried an `activeArenaId === 'citadel'` restriction and clearing only one produced no batches at all — if batching ever seems not to apply, check both. Second, **batching bakes model matrices**, so any draw in `drawStaticWorld` that depends on `time`, door state or anything else that changes per frame must be wrapped in `setStaticWorldBatchEligibility(false)` and restored, or it will freeze for the session; translucent draws are excluded automatically because merged blending is order-dependent. Verify a batching change against the renderer's own `?staticBatching=0` reference render, and prove nothing froze by measuring motion parity on the pixels the unbatched build animates — a plain two-frame diff is useless because the shader's `uTime` flicker moves nearly every pixel anyway. See `AUDIT-12.154.md`.

Build 12.153 owns the baked-occlusion contact model. **Occlusion is not shadows** — the renderer has no shadow map, light-space pass or screen-space AO, and nothing casts anything; do not describe this as shadows. Two rules decide whether occlusion reads at all. First, **the sample radius sets what the effect looks like**: at the walls' 2.6 units a three-wide corridor is entirely in range of a wall and darkens uniformly, which reads as the corridor being dimmer, not as shading — the floor samples at 0.72/1.45 so only cells against a wall darken. Second, **shade the plates, not just the floor**: `zoneFloors`, `floorPatches`, `laneStrips` and `floorDecals` sit thousandths above the floor and cover most of the ground a camera sees, so a shaded floor under an unshaded plate is no visible change (measured: 0.63/255 mean over a captured frame). Keep everything quantised — step count directly sets the merged floor-rectangle count and therefore the draw-call cost, and the batcher groups by exact material. Verify by capturing frames: `startFreeRoamForTest` + `freeRoamSetPositionForTest` + `rendererFrameStatsForTest`, then `canvas.toDataURL()` in the same task, which works even when the browser pane is not compositing. See `AUDIT-12.153.md`.

Build 12.152 owns the preview framing contract and the pivot/override hazard. **When you move a transform onto a wrapper element, every per-model or per-context override of the element you moved it off is now wrong** — those overrides usually have higher specificity and will silently re-apply the old transform. 12.151 moved weapon rotation to a pivot and left four `.career-weapon-inspector.ar4-sentinel` rules behind; the AR-4 was double-rotated for a whole release. Grep for the class you moved the transform off before shipping. Preview scale is **derived, never typed**: the rig publishes `--model-span` and `--model-centre-*` from the parts it actually draws, and each context declares `--fit-span`. Do not add another hand-tuned per-model scale. `will-change` belongs only on elements that are animated — putting it on a shared rig class promotes every instance to a permanent compositor layer. Weapon thumbnails use `careerWeaponThumbnailParts()`, a whitelist, so a new part stays out of thumbnails until someone adds it. Frame rate remains unmeasured across 12.151 and 12.152; probe for compositing with an 8-frame rAF race before promising any timing work. See `AUDIT-12.152.md`.

Build 12.151 owns the CSS-3D menu cost model and the AR-4 geometry. **These surfaces are quad-bound**: frame cost tracks the number of face elements and is independent of what they are painted with — stripping every filter, shadow and border off the Supply Depot changed nothing, halving the face count halved the frame. Keep detail proportionate to the size a surface draws at, and prefer a repeating material over geometry when drawing a texture. Diagnose with `document.body.dataset.runtimeFrameMs` against the measured frame interval: if the game's JavaScript is cheap and the interval is not, the geometry is the cost. Never write inherited `--viewer-*` properties on a rig root per frame — `careerWeaponPivotTransform()` and `careerArmourPivotTransform()` exist for this, and the weapon viewer violated the rule for nine builds after 12.142 banned it. The frame-interval re-measurement for the depot was **not** completed; re-run it with the browser pane visible, because `requestAnimationFrame` does not fire in a pane that is not displaying. Weapon geometry still cannot be reviewed by any gate — read the rig's custom properties out of the DOM and project them to a canvas; that is what caught a hollow stock, a stepped rail line and a backwards magazine curve in this build. See `AUDIT-12.151.md`.

Build 12.150 owns the grip tang and the trigger seating. A raked grip needs a tang carrying about half the rake or the joint reads as detached even though the connectivity audit passes. `weaponGeometryIntegrityForTest()` answers "is this one solid", never "does this look right" — three consecutive weapon builds produced faults it could not see, so review geometry changes against a rendered capture too. See `AUDIT-12.150.md`.

Build 12.149 owns the grip rake convention: model +x is toward the muzzle, +y is downward, and a POSITIVE `gripRz` rakes the grip rearward, which is what a pistol wants. Check a rake by reading the rendered mag-base x against the grip x rather than by eye. See `AUDIT-12.149.md`.

Build 12.148 owns the sidearm silhouette and the rigid grip assembly. `rz` rotates a part about its own centre, so any multi-part assembly that shares a rotation must also rotate its sub-part positions about the assembly origin or it shears apart. Always re-run `weaponGeometryIntegrityForTest()` after moving weapon geometry: a disconnected model still looks correct in a still render, so the audit is the only reliable check. See `AUDIT-12.148.md`.

Build 12.147 owns weapon presentation. `careerWeaponVisualParts()` is the single geometry authority for every surface — never fork parts per renderer, and re-run `ar4WeaponModelForTest()` for the world/viewmodel connectivity check after touching a model. Surface detail must resolve at the scale it is viewed: the grip texture, the 12.145 scanlines and the 12.144 sandstone noise were all the same fault. See `AUDIT-12.147.md`.

Build 12.146 owns baked occlusion (`staticOcclusionAt`/`applyStaticOcclusion` in `js/60-renderer-core.js`). Keep it quantised — the static batcher groups by exact material, so a continuous factor shatters merged batches. **Superseded by 12.154:** batching is now enabled for every arena, and the four draws that had been left unwrapped — the Dune lamp glow, banner cloth and torch flame, and the coolant tank column — are wrapped. Batching bakes model matrices, so any *new* draw in `drawStaticWorld` that depends on `time` or per-frame state must be wrapped in `setStaticWorldBatchEligibility(false)` or it will be frozen for the session. Renderer stats in `document.body.dataset` stall under a throttled animation frame — use `rendererFrameStatsForTest()` and fix the camera pose, since draw calls are view-dependent. See `AUDIT-12.146.md`.

Build 12.145 owns the shared surface `noise` term and `valueNoise()` in `js/60-renderer-core.js`. Six surface modes read it, so a change there affects every arena — re-run all-arena geometry integrity and per-arena navigation, not just the one being worked on. Keep surface detail at room scale: anything above roughly 40 cycles per world unit aliases into banding. See `AUDIT-12.145.md`.

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
