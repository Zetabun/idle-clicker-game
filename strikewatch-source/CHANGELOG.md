# Release history router

## 12.190 — Operator Environmental Light Pickup

- Restores restrained environmental light response to operators, corpses and the first-person viewmodel without reintroducing moving-surface flicker.
- Blends 25% smooth local cool/warm light with 75% of the established stable averages, using the existing shader pass and light-pool calculations.
- Adds no draw calls, meshes, textures, passes or uniforms and leaves gameplay, saves and schemas unchanged.
- See `AUDIT-12.190.md`.

## 12.189 — Mobile Equipment Preview Framing

- Pulls weapon and armour Inspect in 3D views back on compact screens while preserving desktop framing.
- Keeps the bottom-left interaction label readable above large armour and long-gun models on portrait phones.
- Leaves model geometry, manual zoom bounds, cached stills, gameplay and schemas unchanged.
- See `AUDIT-12.189.md`.

## 12.188 — Armour Preview Optimisation

- Pulls large cached Armoury armour stills back for complete-set framing while retaining the established thumbnail fit.
- Replaces four live Field Crate Exchange armour rigs with forward-facing cached still renders while leaving Inspect in 3D unchanged.
- See `AUDIT-12.188.md`.

## 12.187 — Report XP Safety

- Completes SW-003 by preventing missing or malformed historic report XP values from rendering as `undefined XP`.
- Adds one shared XP formatter and deterministic diagnostic coverage without changing reward calculation, saves or schemas.
- See `AUDIT-12.187.md`.

## 12.186 — Accurate Storage Reporting

- Closes SW-002 by separating local career-record sizes from browser-origin storage usage.
- Shows MEASURING while the asynchronous browser estimate is pending, then refreshes the open Configuration route when it settles.
- Labels the estimate as ALL SITE DATA and explains that it is not a career-specific allowance.
- Preserves synchronous save commits, the localStorage/IndexedDB tier split, save sequence arbitration and save schema 19.
- Adds `careerStorageReportingForTest()` to guard loading, ready, unavailable and scope labels.
- Evidence: `AUDIT-12.186.md`.


## 12.185 — Blood Visibility & Deployment CSS Ownership

- Enlarges and brightens nearby-wall blood clusters so they remain recognisable on compact portrait screens rather than resembling bullet chips.
- Gives every blood event a distinct downward drip while preserving positive-health-damage gating, shared-raycast placement, the 1.25m surface limit, the 18-event cap and round clearing.
- Moves the complete Build 12.133 Confirm Deployment typography and roster-layout block from `game.css` into `css/deployment-readability.css` without changing declarations or breakpoints.
- Preserves the new stylesheet immediately after `game.css`, before economy guidance and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.185.md`.


## 12.184 — Economy Guide CSS Ownership

- Moves the complete Build 12.133 after-action reward and economy-guide typography/reflow block from `game.css` into `css/economy-guide.css` without changing declarations or breakpoints.
- Preserves the layer immediately after `game.css`, before Inbox scroll and all later presentation layers.
- Keeps the desktop hierarchy, the two-column compact layout below 1024px and the one-column phone layout below 561px.
- Retains the later `compact-readability.css` 12px floor for economy metadata on compact screens.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.184.md`.


## 12.183 — Surface Blood & Inbox CSS Ownership

- Adds stylised blood splatters to nearby walls behind operators after real health damage, using the existing shared grid raycaster rather than a second collision authority.
- Keeps blood presentation transient, outside static batching, capped at 18 splatters and cleared on round reset; armour-only hits do not create blood.
- Moves the Build 12.133 Inbox scroll arming, overscroll containment and overflow mask from `game.css` into `css/inbox-scroll.css` without changing declarations.
- Preserves the new stylesheet immediately after `game.css`, before operator portraits and every later presentation layer.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.183.md`.


## 12.182 — Operator Portrait CSS Ownership

- Moves the Build 12.133 asset-free operator portrait palette, headgear, rig, comms and deployment sizing rules from `game.css` into `css/operator-portrait.css` without changing declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before command chrome and all later presentation layers.
- Keeps independent complexion and kit variation, the headband variant, role-coloured comms detail, the 54×52px desktop deployment portrait and the 50×50px compact portrait.
- Leaves deterministic portrait identity and class generation under `teamPlayerVisualMarkup(player, role)`.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.182.md`.


## 12.181 — Command Chrome CSS Ownership

- Moves the remaining Build 12.134 compact shared command typography and nowrap containment from `game.css` into `css/command-chrome.css` without changing declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before Combat Effectiveness and all later presentation layers.
- Keeps shared labels and meaningful copy at their existing 11–12px floors while retaining `min-width: 0`, `overflow-wrap: anywhere` and wrapped command metadata.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.181.md`.


## 12.180 — Combat Effectiveness CSS Ownership

- Moves the Build 12.134 compact Combat Effectiveness ring, external caption and influence typography from `game.css` into `css/combat-effectiveness.css` without changing declarations or breakpoints.
- Preserves the layer immediately after `game.css`, before match type and all later presentation layers.
- Keeps the 138px compact dial, 124px narrow-phone dial, 40px grade, 21px score and caption below the ring rather than over its stroke.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.180.md`.


## 12.179 — Match Type CSS Ownership

- Moves the Build 12.134 detailed-report competition row and staged first-match fixture-type line from `game.css` into `css/match-type.css` without changing declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before route readability and all later presentation layers.
- Leaves league, exhibition and guided-orientation classification under `careerMatchTypeDescriptor(summary)` with no gameplay or settlement change.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.179.md`.


## 12.178 — Route Readability CSS Ownership

- Moves the Build 12.134 route-specific compact typography floors and dense-grid containment from `game.css` into `css/route-readability.css` without changing declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before management-grid and all later presentation layers.
- Keeps label-weight text at 11–11.5px, meaningful copy at 12px and dense route cards contained with `min-width: 0`.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.178.md`.


## 12.177 — Management Grid CSS Ownership

- Moves the remaining Build 12.135/12.136 `#menuContent` grid-track sizing from `game.css` into `css/management-grid.css` without changing the selector or declarations.
- Preserves the layer immediately after `game.css`, before league-table and all later presentation layers.
- Keeps content-height management rows top-aligned, preventing the clipping/overlap regression the original row-sizing hotfix resolved.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.177.md`.


## 12.176 — League Table CSS Ownership

- Moves the Build 12.135 league-table typography, compact row height and club-name wrapping rules from `game.css` into `css/league-table.css` without changing selectors, declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before the calendar agenda and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.176.md`.


## 12.175 — Calendar Agenda CSS Ownership

- Moves the Build 12.135 club calendar agenda typography, compact two-column reflow and action-target sizing rules from `game.css` into `css/calendar-agenda.css` without changing selectors, declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before training and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.175.md`.


## 12.174 — Training Readability CSS Ownership

- Moves the Build 12.135 training/development typography and programme-control sizing rules from `game.css` into `css/training-readability.css` without changing selectors, declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before training workflow and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.174.md`.


## 12.173 — Training Programme CSS Ownership

- Moves the Build 12.139 training-programme wrapper and outstanding-requirement accent rules from `game.css` into `css/training-programme.css` without changing selectors or declarations.
- Preserves the layer immediately after `game.css`, before management feedback and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.173.md`.


## 12.172 — Management Feedback CSS Ownership

- Moves the complete Build 12.140 management live-status surface and visible blocked/ready match-state rules from `game.css` into `css/management-feedback.css` without changing selectors or declarations.
- Preserves the layer immediately after `game.css`, before compact readability and all later presentation layers.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.172.md`.


## 12.171 — Compact Readability CSS Ownership

- Moves the Build 12.140 compact 12px management typography floors from `game.css` into `css/compact-readability.css` without changing selectors, declarations or breakpoint.
- Preserves the layer immediately after `game.css`, before reward, armour, weapon and loadout presentation.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.171.md`.


## 12.170 — Reward Reveal CSS Ownership

- Moves the Build 12.141 crate-to-award phase visibility and full-width weapon placement rules from `game.css` into `css/reward-reveal.css` without changing declarations.
- Preserves the layer immediately after `game.css`, before armour, weapon and loadout presentation.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.170.md`.


## 12.169 — Armour Viewer CSS Ownership

- Moves the Build 12.142/12.152 armour inspector rotation-pivot, transition and scoped compositor-promotion rules from `game.css` into `css/armour-viewer.css` without changing declarations.
- Preserves the layer immediately after `game.css`, before weapon and loadout presentation.
- Corrects current operational documentation so all extracted stylesheet-order notes agree.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.169.md`.


## 12.168 — Weapon Presentation CSS Ownership

- Moves the Build 12.147 CSS-3D weapon face lighting, cylinder shading and grip texture from `game.css` into `css/weapon-presentation.css` without changing declarations.
- Preserves the layer immediately after `game.css`, before loadout and later audit/component overrides.
- Tightens the `game.css` line budget and records the new owner in the CSS debt report and architecture map.
- Evidence: `AUDIT-12.168.md`.


## 12.167 — Loadout CSS Ownership

- Moves the Build 12.155 loadout-still and on-demand inspector presentation from `game.css` into `css/loadout-stills.css` without changing selectors or declarations.
- Replaces the hard-coded standalone stylesheet regular expression with `CSS_PATHS`-derived order validation and inlining.
- Documents stylesheet ownership in `ARCHITECTURE.md` and the stable release contract.
- Evidence: `AUDIT-12.167.md`.

## 12.166 — Armoury CSS Ownership

- Moves the compact Armoury inventory layer into `css/armoury-inventory.css` and restores development/standalone CSS parity.
- Evidence: `AUDIT-12.166.md`.

## 12.165 — CSS Ownership Baseline

- Establishes CSS debt reporting and moves compact navigation and mobile management-alert rules into `css/compact-navigation.css`.
- Evidence: `AUDIT-12.165.md`.

## 12.164 — Lean Standalone

- Adds conservative release-only comment and redundant-blank stripping with deterministic size reporting.
- Evidence: `AUDIT-12.164.md`.

## 12.163 — Compact Navigation Alignment

- Repairs compact club-navigation destination rows and the fixed management-alert mobile layout.
- Evidence: `AUDIT-12.163.md`.

## 12.162 — Dynamic Actor Culling

- Adds conservative whole-operator frustum culling with a disabled reference path and deterministic guard.
- Evidence: `AUDIT-12.162.md`.

## 12.161 — Recovery & Readability

- Fixes returning-career startup migration, restores browser zoom and hardens compact readability, wrapping and touch targets.
- Evidence: `AUDIT-12.161.md`.


## 12.160 — Settled Operators

- Removes the shimmering surface on operators. Build 12.145 fixed the same symptom on walls, but operators had a different cause: every surface mode reads world position, which is correct for a wall that stays put and wrong for a person who walks — the detail did not travel with them, the world swept across them.
- Three terms were doing it: the kit weave at 95 and 88 cycles per world unit (12.145 established that anything above about 40 aliases), the skin variation at 31 and 17, and the overhead light pools, which brightened and dimmed an operator several times a second as they crossed the room grid.
- Surface detail for moving geometry is now anchored to the model. Operators, corpses and the first-person viewmodel draw inside `withLocalSurfaceDetail()`; everything else, including batch replay, is unchanged.
- The static world is provably untouched: the same free-roam viewpoint on both builds differs by **0.0000% of pixels, max 1/255**, in all four arenas, with identical draw calls.
- Deepens the operator contact ambient occlusion added in 12.157. It was enabled but only 8–18% — the same magnitude 12.153 measured as too shallow to read on walls. Now 16–32%, still colour-baked with zero extra meshes, draws, textures or uniforms.
- Geometry, collision, navigation, line of sight, gameplay, saves and match simulation are untouched.
- Evidence: `AUDIT-12.160.md`.


## 12.159 — Durable Store

- Adds IndexedDB as the career save's durable tier. Quota on the test machine is **5.54GB against localStorage's ~5MB**, so a career has room to grow for the life of the game.
- Keeps localStorage as the synchronous write-through tier on purpose. IndexedDB is asynchronous, and Build 12.141's page-hide save checkpoints only land because `localStorage.setItem` completes inside the handler — converting the save path to async would reintroduce the defect 12.141 fixed and 12.158 hardened.
- A career too large for localStorage is no longer lost. A quota rejection now falls through to the durable tier and the save succeeds; previously it reported "PROGRESS IS NOT BEING SAVED".
- A career evicted from localStorage by the browser is recovered on the next boot from the durable mirror, guarded so it can only ever adopt a strictly newer save and never over a career this session has already been playing.
- Adds save-size reporting to the configuration page: save file size, recovery backup size, career data total, browser allowance used, and durable storage state.
- Save schema stays 19; no persisted field changed shape, so no migration is required.
- Evidence: `AUDIT-12.159.md`.


## 12.158 — Storage-Safe Results

- Writes and verifies the new primary career before attempting to refresh the optional recovery backup.
- Allows an unprotected backup to be skipped or evicted when mature-career storage pressure would otherwise discard Gold Coins, league points, fixtures or calendar progress.
- Keeps protected recovery points protected and refuses stale-match overwrite unless the displaced newer career is safely backed up first.
- Adds `storagePressureSaveForTest()` with the reported 18 GC, three league points and two-day advance scenario.
- Save schema 19, match rewards, league scoring, IndexedDB usage and gameplay simulation are unchanged.
- Evidence: `AUDIT-12.158.md`.


## 12.157 — Operator Depth

- Adds baked contact ambient occlusion to operator models at the helmet, neck, joints, vest/webbing, belt equipment, ankles and gloves.
- Uses darker variants of the existing deterministic palette, so living and fallen operators gain depth with zero additional meshes, draw calls, textures, shader passes or uniforms.
- Rebuilds the compact Armoury inventory as bounded cards instead of a portrait horizontal carousel; comparison badges remain visible and issue state reads horizontally.
- Verifies the loadout route at 320, 375, 390, 430 and 823 CSS pixels plus 844 × 390 landscape with zero overflow or overlap.
- Gameplay geometry, hit detection, collision, navigation, line of sight, weapon values, saves and schemas are unchanged.
- Evidence: `AUDIT-12.157.md`.


## 12.156 — Durable Results

- Makes completed match settlement a protected save boundary after every reward and league mutation has been applied.
- Preserves a displaced stored career through Data & Recovery before a stale in-match session writes the completed result.
- Keeps ordinary stale-session autosaves blocked, so background tabs still cannot overwrite newer progress.
- Adds a save-and-reload regression covering Gold Coins, the played fixture, winner, backup and sequence advancement.
- Save schema, reward values, league scoring, match simulation and responsive presentation are unchanged.
- Evidence: `AUDIT-12.156.md`.


## 12.155 — Still Armoury

- Replaces the Armoury's live 3D previews with still images: the loadout page goes from 804 CSS-3D quads and 1,361 DOM nodes to **zero quads and 387 nodes**.
- Adds INSPECT IN 3D. Exactly one rotating model can be mounted at a time; opening one inspector closes the other, and changing the selected item closes an inspector opened on the previous one.
- Stills are rasterised from the same part lists every other renderer consumes, and read their material colours back out of the live stylesheet through a hidden probe rather than duplicating the palette — change a material in CSS and the stills change with it.
- Detail frames size themselves to the model's proportions so a pistol and a rifle both fill their panel; thumbnails keep fixed frames so inventory rows stay aligned.
- Adds impact decals: a missed shot now carries on and marks the surface it hits, placed with the same grid raycaster line-of-sight already uses. Capped at 48, two draw calls each, cleared on round reset, and drawn outside the static pass so batching cannot freeze them.
- Menu re-render time is unchanged (14.2ms to 15.3ms); the saving is in per-frame compositor work, and the resulting frame rate is not measured.
- Weapon and armour statistics, geometry, collision, navigation, saves and match simulation are untouched.
- Evidence: `AUDIT-12.155.md`.


## 12.154 — Batch Reach

- Extends static world batching from Citadel to every arena: 58–75% fewer draw calls on Dune Bastion, Aurora Terminal and Skyline Offices, which had never been batched.
- Wraps the four animated draws that were the real blocker — the Dune lamp glow, banner cloth and torch flame, and the coolant tank column — so batching cannot bake and freeze them.
- Removes a **second**, independent Citadel gate inside `drawMesh()`. Clearing only the one in the render path produced no batches at all on the other arenas; both had to go.
- Verified faithful against the renderer's own `?staticBatching=0` reference: 99% of pixels differ by at most 1/255, and the Offices view — which contains no animated decor — differs by at most 1 across the whole frame.
- Verified nothing froze: on the pixels the unbatched build animates strongly, the batched build animates them by exactly the same amount, in all three views tested.
- Verified batches follow the arena through repeated switching, so a stale batch can never draw the wrong arena.
- Repays Build 12.153's floor-shading cost, which was 7–9% on those same arenas, many times over.
- Collision, navigation, line of sight, gameplay, saves and match simulation are untouched; navigation graphs are identical to 12.153 on all four arenas.
- Evidence: `AUDIT-12.154.md`.


## 12.153 — Ground Shade

- Extends the Build 12.146 baked occlusion to the floor, which previously had none at all: it was a single flat draw for the whole map, and in a first-person view the floor is most of the screen.
- Gives the occlusion a contact falloff. The first attempt reused the walls' 2.6-unit sample radius and did not read, because a three-wide corridor is entirely within range of a wall so every cell darkened equally. The floor now samples at 0.72 and 1.45 units, so only cells against a wall darken.
- Remaps the raw enclosure ratio so open space is left completely alone, which is what makes a higher strength safe — the arena no longer dims as a whole, only corners deepen.
- Samples walls from the open cells facing them instead of from the wall's own centre, which was inside the wall and measured wall length rather than enclosure. Aurora goes from three distinct levels across the whole arena to four with double the contrast.
- Shades the zone plates, floor patches, lane strips and decals that sit on the floor and cover most of the ground a camera sees; a shaded floor under an unshaded plate was no change at all.
- Wall contrast roughly doubles on every arena and the floor gains a 50% range. Costs +1.4% draw calls on batched Citadel and 7–9% on the three arenas static batching has never been extended to.
- Corrects a false claim in the 12.146 notes: `setStaticWorldBatchEligibility()` is called, in five places. The real blocker to extending batching is four unwrapped animated draws, now named.
- **This build does not add shadows.** There is still no shadow map or light-space pass anywhere in the renderer. Cast shadows remain outstanding.
- Collision, navigation, line of sight, gameplay, saves and match simulation are untouched.
- Evidence: `AUDIT-12.153.md`.


## 12.152 — Preview Fit

- Fixes a Build 12.151 regression: a pre-existing `.career-weapon-inspector.ar4-sentinel` rule outranked the new pivot rule and kept re-applying the old rotation variables, so the AR-4 inspector rendered at a fixed compound angle and dragging turned an already-turned frame. It affected only the AR-4, because it is the only model with a per-class inspector override.
- Rebuilds the AR-4 magazine as a chain of three segments, each placed where the previous one ended, with the rake increasing five degrees at a time. The old two-segment version left the lower half standing 16 units proud of the joint, and its ribs stopped dead two thirds of the way down.
- Weapon previews now frame themselves. The rig publishes its own span and centre, each context declares how many model units it wants to show, and CSS derives the scale — the AR-4 thumbnail used to overflow its box by 1.6x and was being cropped. Three hand-tuned overrides deleted.
- Adds `careerWeaponThumbnailParts()`, the weapon equivalent of the armour thumbnail level of detail armour has had since 12.54. The two inventory thumbnails were 43% of everything on the Armoury page.
- Stops promoting static 3D rigs to compositor layers: seven permanently promoted elements on the Armoury, of which two ever move, down to two.
- Armoury page quads 1,270 to 1,046. Frame rate remains unmeasured — the browser pane does not composite.
- Model geometry and presentation only; weapon and armour statistics, ranges, penetration, handling, saves and match simulation are untouched.
- Evidence: `AUDIT-12.152.md`.


## 12.151 — Sentinel Rebuild

- Rebuilds the AR-4 Sentinel around real carbine landmarks: a buffer tube under the stock, mirrored recessed handguard cuts instead of black rectangles on one flank, one continuous flat-top rail instead of three stepped top lines, a magazine that curves toward the muzzle, a three-piece trigger guard and a muzzle brake with port cuts.
- Corrects the AR-4 pistol grip rake, which pointed the butt at the target. Build 12.149 fixed that sign on every sidearm through the shared grip assembly; the AR-4 authors its grip directly and was missed.
- Fixes the Armoury loadout screen, which wrote inherited custom properties onto every weapon rig once per rotation step — including the inventory thumbnails, which ignore them. 7.63ms per step down to 0.015ms.
- Cuts the Supply Depot's rendered 3D quads by 48%: a store level of detail, thin-part face culling shared by every model, underside culling on the fixed-pitch store orbit, and off-screen cards that stop rendering.
- The depot is improved but still the heaviest surface in the game, and its frame-time re-measurement is outstanding.
- Every magazine part now travels with the reload; the AR-4's magazine ribs used to hang in mid-air while the magazine dropped.
- Model geometry and presentation only; weapon and armour statistics, ranges, penetration, handling, saves and match simulation are untouched.
- Evidence: `AUDIT-12.151.md`.


## 12.150 — Grip Tang

- Closes the gap where the grip meets the frame. A raked grip met a horizontal frame underside at an angle, leaving a wedge that made the handle read as detached even though the parts genuinely overlapped.
- Every sidearm gains a grip tang carrying half the rake, which transitions between frame and grip the way a real frame does.
- Fixes the Viper 9 trigger, which was 32 units tall against an 11-unit guard bar and hung 22 units below its own guard. The Viper now has a proper three-piece guard bow with the trigger seated inside it.
- Model geometry only; weapon statistics, ranges, penetration and handling are untouched.
- Evidence: `AUDIT-12.150.md`.


## 12.149 — Grip Rake

- Fixes the pistol grips, which raked forward so the handle pointed at the target instead of trailing behind it.
- The sign was wrong on every sidearm and predates the 12.148 reshape: scrap-p12 at -13 degrees, service-p12 at -1 and viper-9 at 0. Raising the magnitude in 12.148 is what made a long-standing error visible.
- All three now rake rearward: +14, +12 and +12 degrees. The Viper had no rake at all before this.
- Verified numerically rather than by eye — the magazine base now resolves 23.5 units behind the grip centre instead of 8.7 in front of it.
- Model geometry only; weapon statistics, ranges, penetration and handling are untouched.
- Evidence: `AUDIT-12.149.md`.


## 12.148 — Sidearm Rebuild

- Reshapes the P12 Scrapline from a slab with a handle into a pistol: slimmer slide with cocking serrations over a distinct frame, a visible parting line, a three-piece trigger guard bow, cylindrical barrel and muzzle, and a recessed ejection port.
- Gives the grip a real −13 degree rake. It previously had two degrees because anything more sheared the assembly apart: `rz` rotates each part about its own centre, so the magazine swung away from the grip. Sub-part positions now rotate about the grip centre, making the assembly rigid.
- The geometry integrity audit caught a genuine break mid-build — slimming the slide detached the entire lower assembly — which a still render would not have shown.
- Model geometry only; weapon statistics, ranges, penetration and handling are untouched.
- Evidence: `AUDIT-12.148.md`.


## 12.147 — Weapon Form

- Gives weapons a light direction: every face of every weapon box used the same gradient, so guns read as flat slabs at any angle. Per-face shading now runs from 0.50 on the bottom to 1.30 on the top, matching the armour rig.
- Barrels and suppressors get the same treatment so they no longer read as flat bands against a shaded receiver.
- Fixes the grip texture, which repeated every 9px at high contrast and read as hazard tape rather than grip.
- Corrects AUDIT-12.141: weapon geometry has one authority, not two. `careerWeaponVisualParts()` feeds the menus, the operator weapon and the viewmodel alike.
- Presentation only — no authored weapon part moved, so no hitbox, anchor or handling value changed.
- Evidence: `AUDIT-12.147.md`.


## 12.146 — Contact Shading

- Adds baked ambient occlusion to every arena: corridors, corners and enclosed walls now resolve darker than open rooms.
- Costs nothing per frame — enclosure is sampled once from the collision grid when world batches are built and folded into the existing draw colour, so there are no extra draw calls, no texture and no shader work.
- Quantised to six steps so the static batcher's merged geometry is not fragmented; Citadel's batching still works.
- Static batching was not extended to the other arenas: they contain animated decor that batching would freeze, and the eligibility guard the renderer provides has never been wired up. Recorded for a follow-up.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.146.md`.


## 12.145 — Clean Surfaces

- Removes the mottled patchwork from every arena, not just Dune: the shared surface noise term hashed two mismatched grids together, and six surface modes read it.
- Office partitions now vary per panel module rather than per fragment, and the corduroy streaking is gone: std dev down 33.1%, horizontal roughness down 61.1%.
- Wall displays no longer read as hard corduroy — scanlines drop from 130 cycles per world unit to 34, at a third of the amplitude.
- Brushed metal grain drops from 92 cycles to 26 with a broad sheen, so it stops aliasing on large surfaces.
- Skyline Offices navigation measured and confirmed sound; six symmetric chokepoints are documented with coordinates but the layout is unchanged.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.145.md`.


## 12.144 — Sandstone Masonry

- Replaces the mottled patchwork on Dune walls with real masonry: horizontal courses in a running bond, soft mortar joints and gentle per-block tone.
- The old shader hashed two mismatched noise grids together, giving unstructured speckle that read as dirt; measured std dev is down 54.9% and horizontal roughness down 63.7%.
- Wall panels become inset tilework — carved surround, shadowed reveal, recessed glazed tile — in four desaturated tones, replacing two saturated slabs that read as stickers.
- Arena geometry, collision and navigation are untouched: Dune stays at 494 navigation nodes, 2,752 edges and one component, 60/60 routes.
- Banners and floor tiles are not changed in this build.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.144.md`.


## 12.143 — Desert Sky

- Replaces the flat muddy brown above Dune Bastion with a procedural gradient sky: warm horizon haze, pale upper sky, deep zenith, a low sun and a below-horizon ground haze.
- Dune is the only open-air arena and had no sky pass at all; the sky was whatever the clear colour was, and that was derived from the fog.
- Warms the desert fog to match the sky horizon, so distant sandstone fades into haze instead of into mud.
- Arena geometry, collision and navigation are untouched: Dune stays at 494 navigation nodes, 2,752 edges and one component, with 60/60 route successes.
- The arena's decor models are not changed in this build.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.143.md`.


## 12.142 — Armour Pass

- Fixes the armour viewer lagging the game: rotating the model rewrote inherited CSS custom properties on the rig root, invalidating the computed style of all 384+ model faces every frame.
- Rotation now uses a dedicated pivot element — measured 9.60ms per rotation step before, 0.01–0.03ms after (226–263x), or 0.1% of a 60fps frame.
- Zoom, drag easing, per-model scaling and per-width scaling are unchanged.
- Fixes a readability floor from 12.140 that lost a specificity contest and left compact lock copy at 10.5px against a 12px floor.
- The armour models themselves still look bad; that is not addressed in this build.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.142.md`.


## 12.141 — Banked Progress

- Fixes Gold Coins being lost by closing the browser after returning to HQ: the return-to-HQ path never wrote a save, and nothing saved on tab close or background.
- Career progress is now written on returning to HQ from a match or free roam, and whenever the page is hidden or closed. End Day already saved and is unchanged.
- The reward crate rotates automatically while it is on screen, and the awarded weapon is now shown on its own once revealed instead of sitting in front of the crate.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.141.md`. Dune visuals, the armour viewer and the weapon-model pass are not in this build.


## 12.140 — Answered Actions

- Fixes the match control appearing to loop: pressing it when the fixture was days away routed to the league table and said nothing, because the message explaining that End Day was required went to an element hidden in the menu.
- Management messages now appear in a dismissible live region, which un-silences roughly eighty call sites — refusals, confirmations such as MATCH PLAN CONFIRMED and WEAPON ISSUED & SAVED, and route lock explanations.
- The MATCH control states its own availability (RECRUIT 2, CONFIRM PLAN, IN 5 DAYS, READY) instead of hiding it in a tooltip, and a refused press now routes to the control that clears the blocker rather than to the league table.
- Raises four compact text sizes to the 12px readability floor, fixing a typography gate that had been failing for several builds.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.140.md`.


## 12.139 — Stated Requirement

- Fixes the remaining onboarding wall at `SET ONE TRAINING FOCUS`: scrolling to the programme selects left the `SAVE CHANGES` bar ~630px above the fold, so a programme could be chosen with nothing on screen saying a second step existed or where to perform it.
- The save control now sits directly above the Training Squad roster, and the panel head states the requirement and tracks progress through it: `ACTION REQUIRED` → `ONE STEP LEFT` → `ACTIVE PROGRAMMES`.
- Fixes a save path that reported success without writing: `setPlayerTrainingFocus()` refuses while a match is live, and the caller cleared every staged draft regardless, silently reverting the selection.
- Fixes a debug hook that could destroy a career: `firstMatchGuidanceForTest()` blanks the squad to replay earlier guide steps, and renders it drives were persisting that empty squad.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.139.md`.


## 12.138 — Reachable Training

- Fixes a First Match Guide soft lock: the closing `SET ONE TRAINING FOCUS` objective opened Training Facility at the top, with the programme selects 1100–2900px below the fold and nothing pointing at them, so the guide could not be completed and the remaining club systems stayed locked.
- The step now scrolls to Training Squad on arrival, and its copy names Programme Selection and Save Changes instead of assuming a debrief recommendation exists.
- Fixes guided scrolling below 1024px, which had never worked: the scroll helper always targeted the desktop scroll container, so the existing recruitment destination was inert on mobile too. Previous/next scroll restoration on compact is fixed by the same change.
- Restores `firstMatchGuidanceForTest()` to a meaningful gate — its journey-strip assertion had been case-sensitive and always failing — and extends it to cover the training step.
- No gameplay, economy or schema change; save schema stays at 19.
- Evidence: `AUDIT-12.138.md`.


## 12.137 — Kept Rewards

- Fixes victory crates being lost: the awarded weapon lived only in memory until the reveal was clicked through, so refreshing or closing the tab destroyed it.
- The crate is now banked to the career save the moment it is awarded, re-offered if the session is interrupted, and cleared on claim so it can never be granted twice.
- Save schema stays at 19; the field is additive with a null default.
- Evidence: `AUDIT-12.137.md`.


## 12.136 — Row Sizing

- Hotfix: Build 12.135 stopped panels being clipped but left the grid rows undersized, so management panels overlapped each other on existing saves.
- Sizes the scroll container's rows to their content instead of giving the items a minimum height, which resolves clipping and overlapping together.
- Adds an overlap check to the compact interface audit so this regression class fails the gate.
- Evidence: `AUDIT-12.136.md`.


## 12.135 — Open Containers

- Fixes eighteen panels across thirteen routes that rendered as empty boxes on mobile, including Training Squad, Team XP Benefits, the league table, squad dynamics, the calendar agenda, the loadout panel and the tactical analysis.
- Stops a league result being discarded when its prepared fixture id no longer resolves, and refuses to reuse a stale match context.
- Makes the league table readable on both presentation targets.
- Removes the duplicated title and detail from Event Agenda rows and replaces it with a short action label, with readable type on both targets.
- Raises training and development readability on desktop and mobile.
- Evidence: `AUDIT-12.135.md`.


## 12.134 — Durable Career

- Sequences and verifies every career save: a stale second tab can no longer overwrite newer progress, and a rejected write now raises a visible warning instead of being discarded.
- Closes every horizontal overflow at 390px and raises the smallest rendered copy from 5.5px to 11px readability floors across all 22 management routes.
- Fixes the after-action Combat Effectiveness dial, whose caption overlapped the ring and grade on phones.
- Founds every club with one inherited assistant manager: generated name, weekly wage, no signing fee, weak Division 3 judgement, replaceable at any time.
- States the fixture type (league, exhibition or orientation) in the post-match report.
- Investigated the reported Gold Coin loss: settlement, ledger and persistence verified correct across matches and calendar advances; no defect reproduced in the award path.
- Evidence: `AUDIT-12.134.md`.


## 12.133 — Readable Command

- Enlarges Opponent Quick Read, Active Operator Match Roles, Confirm Deployment and after-action reward typography, and removes the dead space in the match-roles rows.
- Stops the Inbox feed capturing page scroll until the manager clicks into it.
- Warns before a response template or tactical control replaces an applied scout recommendation.
- Fixes repeated Inbox decision mail from the same player via a per-player, per-type cooldown.
- Gives operator portraits independent complexion, headgear, kit and rig variation, still asset-free and deterministic.
- Save schema, match simulation, tactical fit and the economy are unchanged.
- Evidence: `AUDIT-12.133.md`.


## 12.132 — Selection Feedback

- Gives the Formation, Team Approach, Engagement Range, Map Selection and Team Priority cards a clearly distinct selected state at every width.
- Adds pressed, pointer-only hover, keyboard focus and post-selection confirmation feedback so a click or tap is always visibly registered.
- Presentation-only release; save schema, gameplay, tactical fit calculations and match simulation are unchanged.
- Evidence: `AUDIT-12.132.md`.


## 12.131 — Calendar Clarity

- Promotes the tactical summary-tag and Active Operator Match Roles alignment fixes into a numbered release.
- Keeps End Day / Next Day readable with one consistent slate, white and mint colour scheme across enabled, locked, blocked and matchday states.
- Presentation-only release; save schema, gameplay, calendar progression and match simulation are unchanged.
- Evidence: `AUDIT-12.131.md`.


This file routes historical questions to detailed audits without putting all
release history into the default GPT context.

## Current line

| Build | Focus | Detailed record |
| --- | --- | --- |
| 12.136 | Scroll container row sizing hotfix | `AUDIT-12.136.md` |
| 12.135 | Collapsed panels and lost league results | `AUDIT-12.135.md` |
| 12.134 | Career save durability and compact interface audit | `AUDIT-12.134.md` |
| 12.133 | Command-surface readability, Inbox scroll and portraits | `AUDIT-12.133.md` |
| 12.132 | Match setup selection feedback | `AUDIT-12.132.md` |
| 12.131 | Tactical clarity consolidation and End Day contrast | `AUDIT-12.131.md` |
| 12.130 | Fourth arena: Aurora Terminal (summit-theme polar transit hub) | `AUDIT-12.130.md` |
| 12.129 | First Match Guide streamlining and opening progression-lock fixes | `AUDIT-12.129.md` |
| 12.128 | Portrait match commentary in normal scoreboard/objective flow | `AUDIT-12.128.md` |
| 12.127 | Responsive mobile combat-effectiveness graph and stat readout | `AUDIT-12.127.md` |
| 12.126 | Mobile tactics layout and fixture-persistent preparation | `AUDIT-12.126.md` |
| 12.125 | Compact desktop Inbox, retained scroll and glass command chrome | `AUDIT-12.125.md` |
| 12.124 | Desktop club identity and inline Inbox reader | `AUDIT-12.124.md` |
| 12.123 | Command Skin depth pass on bespoke route surfaces | `AUDIT-12.123.md` |
| 12.122 | FM-inspired Command Skin visual revamp | `AUDIT-12.122.md` |
| 12.121 | Mobile tactics action reachability and section containment | `AUDIT-12.121.md` |
| 12.120 | Mobile flow, readability and modal accessibility | `AUDIT-12.120.md` |
| 12.119 | Guided navigation `NEXT` label visibility | `AUDIT-12.119.md` |
| 12.118 | Mobile typography readability | `AUDIT-12.118.md` |
| 12.117 | Skyline Offices environment rework | `AUDIT-12.117.md` |
| 12.116 | Desktop header split | `AUDIT-12.116.md` |
| 12.115 | Header and negotiation readability | `AUDIT-12.115.md` |
| 12.114 | Compact live-feed/readability pass | `AUDIT-12.114.md` |
| 12.113 | Desktop version alignment | `AUDIT-12.113.md` |
| 12.112 | Visible version header | `AUDIT-12.112.md` |
| 12.111 | Realistic operator heads | `AUDIT-12.111.md` |
| 12.110 | Natural operator silhouettes | `AUDIT-12.110.md` |
| 12.109 | Citadel match performance | `AUDIT-12.109.md` |
| 12.108 | Citadel Depot environment rework | `AUDIT-12.108.md` |
| 12.107 | Recruitment-card surface isolation | `AUDIT-12.107.md` |
| 12.106 | Configurable management background | `AUDIT-12.106.md` |
| 12.105 | Windowed-match label cleanup | `AUDIT-12.105.md` |
| 12.104 | Blocker links, recruitment hover and portrait HUD | `AUDIT-12.104.md` |

## Historical domains

Use the indicated audit ranges, then select only the newest file relevant to
the task.

| Domain | Audit route |
| --- | --- |
| Recruitment, transfers and comparison UX | `AUDIT-12.33.md`–`AUDIT-12.34.md`, `AUDIT-12.47.md`–`AUDIT-12.51.md`, `AUDIT-12.69.md`–`AUDIT-12.97.md` |
| First Match Guide and opening week | `AUDIT-12.24.md`–`AUDIT-12.36.md`, `AUDIT-12.58.md`–`AUDIT-12.68.md` |
| Mobile/desktop navigation and readability | `AUDIT-12.60.md`–`AUDIT-12.66.md`, `AUDIT-12.78.md`–`AUDIT-12.92.md`, `AUDIT-12.104.md`–`AUDIT-12.121.md` |
| Weapons, armour and operator presentation | `AUDIT-12.08-retained.md`–`AUDIT-12.23.md`, `AUDIT-12.41.md`–`AUDIT-12.57.md`, `AUDIT-12.110.md`–`AUDIT-12.111.md` |
| Match AI, diagnostics and live command | `AUDIT-12.09.md`–`AUDIT-12.13.md`, `AUDIT-12.21.md`, `AUDIT-12.37.md`–`AUDIT-12.40.md`, `AUDIT-12.53.md`, `AUDIT-12.109.md` |
| Arenas, navigation and rendering | `AUDIT-11.99.md`, `AUDIT-12.05.md`–`AUDIT-12.07.md`, `AUDIT-12.52.md`, `AUDIT-12.108.md`–`AUDIT-12.109.md`, `AUDIT-12.117.md` |
| Economy, calendar, staff and infrastructure | `AUDIT-12.15.md`–`AUDIT-12.16.md`, `AUDIT-12.35.md`, `AUDIT-12.51.md`, `AUDIT-12.67.md`, `AUDIT-12.81.md` |

Older Build 11 records and every detailed Build 12 record remain in their
individual `AUDIT-*.md` files. Use:

```text
rg -l "keyword or function name" AUDIT-*.md
```

Do not load the full audit collection by default.
