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
6. A release commit created by the workflow must be followed by a distinct user-authored push so branch-based GitHub Pages rebuilds; verify the public `cod.html` build identity before calling it live.

## Current release

- Build: **12.215 — Ops-Only Required Action**
- Build ID: `12.215.0-ops-only-required-action`
- Editable source: `strikewatch-source/`
- Generated development bundle: `strikewatch-source/js/strikewatch.dev.js`
- Generated standalone: `strikewatch-source/dist/strikewatch-build-12.215.html`
- Live GitHub Pages artifact: root `cod.html`
- Save schema: **19**
- Diagnostics schema: **1**
- Historical release detail: `AUDIT-*.md`, located through `CHANGELOG.md`

Build 12.215 keeps the collapsible MUST RESPOND panel on Operations Overview only. It starts collapsed and no longer repeats on Team, League, Equipment, Club or their subpages; the global End Day lock and blocker authority remain unchanged. See `AUDIT-12.215.md`.

Build 12.214 removes repeated red required-action panels from every route except Team > Squad (the operator page). The End Day lock and blocker authority remain global, but the detailed warning card now has one intentional home. See `AUDIT-12.214.md`.

Build 12.213 clarifies section ownership: Ops handles immediate day work, Team owns telemetry, Equipment removes the redundant Supply Overview from its normal submenu, and low-frequency Gold and Configuration pages no longer crowd Club. See `AUDIT-12.213.md`.

Build 12.212 removes the authored `open` state from the authoritative MUST RESPOND disclosure, so it is genuinely collapsed on first render rather than relying on a post-render observer. See `AUDIT-12.212.md`.

Build 12.211 adds a dedicated full-screen boot presentation that masks incomplete layout while assets initialise, and makes MUST RESPOND disclosures collapsed when first rendered on mobile and desktop. See `AUDIT-12.211.md`.

Build 12.210 promotes League to the five-item primary navigation and consolidates Armoury plus Supplies under Equipment. Operations now focuses on daily work, while existing route and data authorities remain unchanged. See `AUDIT-12.210.md`.

Build 12.209 wires the contextual mobile header buttons directly to the authoritative `setMenuRoute()` navigation path, so every visible submenu item now opens its intended page. See `AUDIT-12.209.md`.

Build 12.208 corrects the compact contextual header geometry so Back and Forward occupy fixed edge columns and the active department submenu fills the centre without clipping or overlap. See `AUDIT-12.208.md`.

Build 12.207 fixes the empty compact header introduced in 12.206 by rendering the active department's real route buttons directly between the Back and Forward controls. The active page is centred and highlighted; Operations Overview still retains its original shortcut header. See `AUDIT-12.207.md`.

Build 12.206 turns the compact management header into contextual navigation. Operations Overview retains the universal shortcuts and End Day; every other mobile route hides the bulky header content and promotes the current department's route list into a sticky, horizontally scrollable top submenu. Desktop routing and gameplay are unchanged. See `AUDIT-12.206.md`.

Build 12.205 adds Board Expectations: one division-scaled primary league target, two secondary objectives, live progress, status labels and a derived board-confidence score on Operations and League. It reuses existing standings and squad state and does not introduce dismissal or a new save authority. See `AUDIT-12.205.md`.

Build 12.204 adds a compact Operator Career Story above each accolade timeline, summarising appearances, wins, K/D, awards, best rating, milestones, seasons, clubs and the latest defining moment from existing career and world-press records. It adds no new persistence or award authority. See `AUDIT-12.204.md`.

Build 12.203 adds League Pulse to the League page, exposing recent rival reports, scorelines, Man of the Match coverage, seasonal award leaders and the next opposition from the existing living press authority. It adds no fixture or award simulation path and does not duplicate Inbox stories. Gameplay and schemas are unchanged. See `AUDIT-12.203.md`.

Build 12.202 adds the Operations Today timeline: a compact, live summary of the next fixture, active-five readiness, unread mail, scheduled commitments and end-day readiness. It links into existing routes and deliberately points mandatory decisions back to the authoritative MUST RESPOND surface instead of creating another action authority. Gameplay, calendar rules and schemas are unchanged. See `AUDIT-12.202.md`.

Build 12.201 establishes a compact management action hierarchy. MUST RESPOND is the single urgent surface, uses a native disclosure summary on compact screens and can collapse without losing the blocker count or first action. When no urgent blocker exists, the existing priority strip is marked as the recommended action. Routes, blocker authority, gameplay and schemas are unchanged. See `AUDIT-12.201.md`.

Build 12.200 makes management blockers single-source on the Operations overview. When MUST RESPOND is present, the generic priority strip is not rendered and later action cards that repeat the same blocker label are removed. The blocker list remains authoritative for matchday, transfer, sponsorship and other end-day locks; routes and actions are unchanged. See `AUDIT-12.200.md`.

Build 12.199 owns blood surface attachment in `js/61-world-renderer.js`. Preserve `BLOOD_SURFACE_ATTACHMENT`, nearest visible-door-panel selection, material-local door coordinates, wall-pocket clipping, three-point static backing checks and `bloodSurfaceAttachmentForTest()`. Blood remains positive-health-damage-only, shared-raycast, within 1.25m, capped at 18 events, transient and cleared each round. Do not move collision, navigation, line of sight or damage authority into the renderer. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.199.md`.

Build 12.198 owns the visible-time match clock in `js/70-runtime.js`, with lifecycle resets in `js/40-match-flow.js` and `js/50-ui-menus.js`. Preserve `MATCH_CLOCK_POLICY`, the 1/60 fixed step, eight-step frame cap, 500ms debt bound, 750ms background-gap discard, capped presentation delta and `matchClockIntegrityForTest()`. Normal visible intervals must be conserved at 60/30/20/15 FPS in both speed modes; hidden pages, pauses, round changes, speed changes and match exits must not replay stale debt. Build 12.197 remains the intelligence-quality authority. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.198.md`.

Build 12.197 owns the device-independent simulation-work boundary across `js/00-core.js`, `js/20-navigation.js`, `js/30-bot-ai.js`, `js/40-match-flow.js` and `js/70-runtime.js`. Preserve `SIMULATION_WORK_POLICY`, the 1/60-second simulation window, fixed former-Full perception/tactical/navigation limits, render-only `runtimeQualityTier`, round invalidation and `simulationQualityIndependenceForTest()`. Budget resets must originate from `updateMatchStep()`/`simulationClock`, never the display frame. Adaptive resolution and operator LOD may vary by device; match intelligence may not. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.197.md`.

Build 12.196 owns clean first-person subject handoffs across `js/60-renderer-core.js` and `js/63-viewmodel-renderer.js`. Preserve `SPECTATOR_HANDOFF_PRESENTATION`, `spectatorHandoffPresentationForTest()`, incoming rendered-angle seeding, complete clearing of sway/recoil/smoke/bob plus shared muzzle/shake/hit-pulse signals, the 140ms canvas-only opacity recovery and reduced-motion bypass. The renderer observes subject changes only; it must not write spectator selection, delay a cut or alter the Build 12.195 director and two-second death handoff. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.196.md`.

Build 12.195 owns the AUTO spectator director in `js/70-runtime.js`. Preserve `SPECTATOR_CAMERA_DIRECTOR`, `spectatorDirectorForTest()`, the 3.2-second ordinary hold, 1.25-second live-fire exception, 8.5-second maximum hold and current-view stability bias. Rank only already-computed bot presentation state; never call perception, LOS, navigation or combat from the director. Manual previous/next must disable AUTO and the existing two-second death handoff must remain unchanged. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.195.md`.

Build 12.194 owns muzzle-anchored third-person tracers across `js/61-world-renderer.js` and `js/62-character-renderer.js`. Preserve `OPERATOR_TRACER_ORIGIN`, `operatorTracerOriginForTest()`, the one reusable `bot.renderMuzzlePoint` and the exact `operatorSharedWeaponRig(...).muzzle` transform. `spawnTracer()` must prefer the rendered muzzle and retain the old torso origin only as a bounded startup fallback. Keep the 28-tracer cap, 0.085 lifetime, endpoint spread, misses, impacts and all combat authority unchanged. Do not add draws, meshes, textures, passes, uniforms or per-frame allocations. Keep Builds 12.190-12.193 and arena/navigation integrity green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.194.md`.

Build 12.193 owns the scoped third-person operator muzzle-light response across `js/60-renderer-core.js` and `js/62-character-renderer.js`. Preserve `OPERATOR_MUZZLE_LIGHT_RESPONSE`, `operatorMuzzleLightResponseForTest()`, the persistent state/colour scratch buffers and the exact authored muzzle anchor. Only a living mode-1 operator with authoritative `bot.flash > 0` may warm opaque surfaces 3-8 inside the 1.20-unit radius. Static geometry, shadows, transparent effects, corpses, other operators and mode-2 viewmodels remain unchanged. Do not add lights, draws, meshes, textures, passes or uniforms. Keep Builds 12.190-12.192, operator AO, culling and arena/navigation integrity green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.193.md`.

Build 12.192 owns directional living-operator contact shadows in `js/62-character-renderer.js`. Preserve `OPERATOR_CONTACT_SHADOW`, the reusable `operatorContactShadowScratch`, `operatorContactShadowProfile()` and `operatorContactShadowForTest()`. Low detail remains one disc and medium/full remain two; the broad component offsets away from the shared key light, the inner component stays contact-weighted, crouch is wider/denser and run is longer/softer. Corpse shadows remain unchanged. Do not add shadow maps, meshes, textures, passes, uniforms or draw calls. Keep Builds 12.190/12.191 lighting gates, operator AO, culling and arena/navigation integrity green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.192.md`.

Build 12.191 owns third-person operator silhouette separation. The existing local-detail uniform now carries mode 0 for static geometry, 1 for living/fallen operators and 2 for the first-person viewmodel. Only mode 1 receives the bounded 0.028 base plus 0.052 edge lift; static geometry and viewmodels remain unchanged. Preserve `OPERATOR_SILHOUETTE_LIGHTING`, `operatorSilhouetteSeparationForTest()`, Build 12.190 environmental pickup, model-space surface detail, operator AO and culling. No new draws, meshes, textures, passes or uniforms are allowed. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.191.md`.

Build 12.190 owns stable environmental light pickup for moving local-detail geometry. Operators, corpses and the first-person viewmodel blend 25% of the existing smooth positional cool/warm pools with 75% of the Build 12.160 averages; stepped moving flicker remains disabled and static geometry remains on the original path. Preserve `OPERATOR_ENVIRONMENT_LIGHTING`, `operatorEnvironmentalLightPickupForTest()`, model-space surface detail, operator AO and dynamic actor culling. The change adds no draws, meshes, textures, passes or uniforms. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.190.md`.

Build 12.189 owns compact weapon and armour inspector framing. Below 1024px both inspectors open at 0.78 zoom through shared `careerLoadoutViewerDefaultZoom()` logic; desktop remains at 1.0 and the manual 0.72–1.35 range stays intact. The portrait-mobile callout remains above the model with a bounded backing. Keep `mobileLoadoutPreviewFramingForTest()`, `mobileInterfaceAuditForTest()`, `typographyConsistencyForTest()` and the Build 12.188 armour/still gates green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.189.md`.

Build 12.188 owns armour preview framing and Supply Depot armour-card performance. Large cached armour stills use a 0.82 fit margin, thumbnails retain 0.94, and Field Crate Exchange stock uses forward-facing `careerArmourStillMarkup()` renders at 0.80 instead of live `careerArmourVisualMarkup()` rigs. Keep the yaw 0 / pitch -6 view, on-demand Inspect in 3D path and `armourPreviewOptimisationForTest()` green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.188.md`.

Build 12.187 closes SW-003. Historic, imported and partial after-action summaries now pass visible XP through `careerSafeXpAward()`, preventing `undefined XP` while preserving the existing match-reward calculation and settlement path. Keep `careerReportXpSafetyForTest()` green. Save schema 19 and diagnostics schema 1 are unchanged. See `AUDIT-12.187.md`.

Build 12.186 closes SW-002. Configuration now measures the career save, recovery backup and local career records synchronously, while the asynchronous browser estimate has an explicit MEASURING state, refreshes the open route when settled and is labelled as all site-origin data rather than a career allowance. `saveCareerState()` remains synchronous and save schema 19 is unchanged. Keep `careerStorageReportingForTest()`, `careerIndexedDbForTest()` and the existing persistence gates green. See `AUDIT-12.186.md`.

Build 12.185 makes nearby-wall blood read clearly on compact portrait screens without touching combat: the procedural core is larger and more saturated, every event includes a downward drip, placement still requires real health damage and a surface within 1.25m, and the pool remains capped at 18. The same release continues SW-020 by moving the complete Build 12.133 Confirm Deployment typography and roster-layout block into `css/deployment-readability.css` immediately after `game.css`. See `AUDIT-12.185.md`.

Build 12.184 continues SW-020 by moving the complete Build 12.133 after-action reward and economy-guide typography into `css/economy-guide.css`. Desktop type, the two-column compact grid, the single-column phone grid and all 9.5–19px authored floors remain unchanged. After the 12.185 extraction, the sheet follows `deployment-readability.css` before Inbox and every later component layer; the later `compact-readability.css` 12px metadata floor still wins below 1024px. See `AUDIT-12.184.md`.

Build 12.183 adds bounded wall blood splatters when real health damage lands with a solid surface within 1.25m behind the struck operator. The continuation ray reuses `castRay`, splatters stay in the dynamic pass, cap at 18 and clear on round reset. The same release continues SW-020 by moving the Build 12.133 Inbox scroll arming and overflow mask into `css/inbox-scroll.css`. After the 12.184 extraction, the Inbox sheet follows `economy-guide.css` before operator portraits and all later component layers. See `AUDIT-12.183.md`.

Build 12.182 continues SW-020 by moving the Build 12.133 asset-free operator portrait presentation into `css/operator-portrait.css`. Independent complexion and kit variables, helmet and rig variants, comms accent, 54px desktop deployment portrait and 50px compact portrait remain unchanged. After the 12.183 extraction, the sheet follows `inbox-scroll.css` before all later component layers. Portrait identity generation remains owned by `teamPlayerVisualMarkup(player, role)`. See `AUDIT-12.182.md`.

Build 12.181 continues SW-020 by moving the remaining Build 12.134 compact shared command typography and nowrap containment into `css/command-chrome.css`. The 11–12px floors, 11.5px Armoury state labels, wrapping and `min-width: 0` safeguards remain unchanged. After the 12.182 extraction, the sheet follows `operator-portrait.css` before all later component layers. See `AUDIT-12.181.md`.

Build 12.180 continues SW-020 by moving the Build 12.134 compact Combat Effectiveness ring into `css/combat-effectiveness.css`. The 138px compact ring, 124px narrow-phone ring, caption below the dial, grade/score sizing and wrapped influence legend remain unchanged. After the 12.181 extraction, the sheet follows `command-chrome.css` before all later component layers. See `AUDIT-12.180.md`.

Build 12.179 continues SW-020 by moving the Build 12.134 post-match fixture-type presentation into `css/match-type.css`. The detailed report competition row and staged first-match type line keep the same font sizes, spacing and 1023px breakpoint. After the 12.180 extraction, the sheet follows `combat-effectiveness.css` before all later component layers. Match classification remains owned by `careerMatchTypeDescriptor(summary)`. See `AUDIT-12.179.md`.

Build 12.178 continues SW-020 by moving the Build 12.134 route-specific compact typography floors and dense-grid containment into `css/route-readability.css`. The 11–12px label/copy floors, 1023px breakpoint and `min-width: 0` containment remain unchanged. After the 12.179 extraction, the sheet follows `match-type.css` before all later component layers. See `AUDIT-12.178.md`.

Build 12.177 continues SW-020 by moving the Build 12.135/12.136 management grid-track sizing into `css/management-grid.css`. `grid-auto-rows: max-content` and `align-content: start` remain unchanged, so route panels keep content-height rows without clipping or overlap. After the 12.178 extraction, the sheet follows `route-readability.css` before all later component layers. See `AUDIT-12.177.md`.

Build 12.176 continues SW-020 by moving the Build 12.135 league-table typography, compact row height and club-name wrapping into `css/league-table.css`. Desktop and compact type floors, the 52px compact row and wrapped club sub-line are unchanged. After the 12.177 extraction, the sheet follows `management-grid.css` before all later component layers. See `AUDIT-12.176.md`.

Build 12.175 continues SW-020 by moving the Build 12.135 club calendar agenda typography, compact two-column reflow and action-target sizing into `css/calendar-agenda.css`. Date, title and detail floors, wrapped compact copy and the 44px action target are unchanged. The sheet follows `league-table.css` before all later component layers. See `AUDIT-12.175.md`.

Build 12.174 continues SW-020 by moving the Build 12.135 training/development typography and programme-control floors into `css/training-readability.css`. Desktop and compact font sizes, the 40/46px select heights and the 1023px breakpoint are unchanged. The sheet follows `calendar-agenda.css` before the later training workflow and component layers. See `AUDIT-12.174.md`.

Build 12.173 continues SW-020 by moving the Build 12.139 training-programme wrapper and outstanding-requirement accent rules into `css/training-programme.css`. The wrapper remains an unclipped grid that keeps the save control with the roster; `.needs-programme` still adds the accent rail and requirement kicker. The declarations are unchanged; after the 12.174 extraction the sheet follows `training-readability.css` before all later component layers. See `AUDIT-12.173.md`.

Build 12.172 continues SW-020 by moving the complete Build 12.140 management live-status surface and visible match-control state into `css/management-feedback.css`. The banner positioning, compact safe-area offset, blocked tone, entry transition and blocked/ready state colours are unchanged. The sheet follows `training-programme.css` before compact readability and all later component layers. See `AUDIT-12.172.md`.

Build 12.171 continues SW-020 by moving the Build 12.140 compact 12px typography floors into `css/compact-readability.css`. The date lines, subnav lock/access chips, economy-guide metadata and visible match-state label keep the same selectors, declarations and 1023px breakpoint. The sheet follows `management-feedback.css` before all later component layers. See `AUDIT-12.171.md`.

Build 12.170 continues SW-020 by moving the Build 12.141 reward-phase visibility rules into `css/reward-reveal.css`. During `cycling` and `revealed`, the crate core remains hidden and the awarded weapon model owns the full reveal grid. The declarations are unchanged; after the 12.171 extraction it follows `compact-readability.css` before the later component layers. See `AUDIT-12.170.md`.

Build 12.169 continues SW-020 by moving the Build 12.142/12.152 armour inspector rotation-pivot rules into `css/armour-viewer.css`. The pivot still owns live rotation on one element, while transition removal and `will-change` remain scoped to the inspector so thumbnails and store products do not hold unused compositor layers. The sheet follows `reward-reveal.css` and precedes weapon/loadout presentation, preserving the prior cascade. See `AUDIT-12.169.md`.

Build 12.168 continues SW-020 by moving the Build 12.147 CSS-3D weapon face lighting, cylinder shading and grip texture into `css/weapon-presentation.css`. The declarations are unchanged; after the 12.169 extraction it follows `armour-viewer.css` and remains before loadout and later audit layers. Keep weapon thumbnails, crate reveals, inspectors and store cards on the shared presentation layer. See `AUDIT-12.168.md`.

Build 12.167 continues SW-020 by moving the Build 12.155 loadout-still and on-demand inspector presentation into `css/loadout-stills.css`, preserving its position before the 12.161 layer. `build.py` now derives and validates the development stylesheet block from `CSS_PATHS` instead of maintaining a brittle hard-coded regular expression. Architecture and stable contracts now document the stylesheet ownership order. See `AUDIT-12.167.md`.

Build 12.166 continues the staged CSS ownership programme by moving the audited compact Armoury inventory layer into `css/armoury-inventory.css`. It also makes development and standalone stylesheet order identical and fails the build if a development stylesheet link survives standalone inlining. See `AUDIT-12.166.md`.

Build 12.165 begins the staged CSS-debt cleanup by moving the compact navigator and mobile management-alert rules out of the 31k-line monolith into `css/compact-navigation.css` while preserving their final cascade position. The build now emits and enforces a CSS-debt report. See `AUDIT-12.165.md`.

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
