# Strikewatch Documentation Index

## Repository plan

- Root `cod.html` is the live GitHub Pages release.
- `strikewatch-source/` is the complete editable source and documentation authority.
- Root `other/` contains unrelated games/assets and retired automation, not Strikewatch dependencies.
- Each playable release commit must include the verified source changes, current Markdown/audit updates and the standalone copied to root `cod.html`.

- `AUDIT-12.116.md` - desktop breadcrumb/build split-row verification.
- `AUDIT-12.115.md` - retained wide-desktop centre-placement history and compact negotiation readability verification.
- `AUDIT-12.114.md` - compact readability, portrait broadcast feed, desktop currency fit and version-baseline verification.
- `AUDIT-12.113.md` - retained desktop version badge alignment, mobile-version retention and release verification.
- `AUDIT-12.112.md` - visible version header: desktop header identity, mobile Help-bar identity and build-metadata enforcement.
- `AUDIT-12.111.md` - realistic operator heads: anatomical skull planes, fitted helmet, contoured mask, elliptical goggles and regression evidence.
- `AUDIT-12.110.md` - natural operator silhouettes: procedural anatomy, hand-anchored articulation, shared corpse geometry and regression evidence.
- `AUDIT-12.109.md` - Citadel live-match performance: static GPU batching/culling, collision broad phase, door-collider caching and regression evidence.
- `AUDIT-12.108.md` – Citadel Depot environment rework: layout symmetry, prop and gate placement, stair landings, catwalk anchoring and the industrial decor layer.
- `AUDIT-12.107.md` – recruitment card surface isolation after configurable page-background colours.
- `AUDIT-12.106.md` – current configurable management page-background authority.
- `AUDIT-12.105.md` – retained windowed-match legacy-label cleanup authority.
- `AUDIT-12.104.md` – retained blocker-link, recruitment-hover and portrait-HUD repair authority.
- `AUDIT-12.103.md` is not present; Builds 12.98–12.103 were interim UI iterations consolidated into this release.

## Current release

- **Playable build:** Strikewatch Build 12.116 — Desktop Header Split
- **Source folder:** `strikewatch-source/`
- **Standalone release:** `dist/strikewatch-build-12.116.html`
- **Save schema:** 19
- **Diagnostics schema:** 1

## Required reading order

1. `00-READ-FIRST-GPT.md` — release summary, source rules and supported targets.
2. `AGENTS.md` — coding-agent invariants and retained system contracts.
3. `PROJECT.md` — architecture, ownership boundaries, build workflow and release tree.
4. `README.md` — developer-facing build and feature overview.
5. `AUDIT-12.116.md` — implementation and verification record for the current release.
6. `AUDIT-12.115.md` — retained compact negotiation readability and superseded centre-placement history.
7. `AUDIT-12.114.md` — retained compact readability and portrait feed authority.
7. `AUDIT-12.113.md` — retained desktop version-alignment authority.
7. `AUDIT-12.112.md` — retained visible-version-header authority.
7. `AUDIT-12.111.md` — retained realistic-operator-head authority.
7. `AUDIT-12.110.md` — retained natural-operator-silhouette authority.
8. `AUDIT-12.109.md` — retained Citadel match-performance authority.
9. `AUDIT-12.108.md` — retained Citadel environment authority.
8. `AUDIT-12.107.md` — retained recruitment-card surface-isolation authority.
9. `AUDIT-12.106.md` — retained configurable management page-background authority.
10. `AUDIT-12.105.md` — retained windowed-match legacy-label cleanup authority.
11. `AUDIT-12.104.md` — retained blocker-link, recruitment-hover and portrait-HUD repair authority.
12. `AUDIT-12.96.md` — retained streamlined opponent-preparation authority.
9. `AUDIT-12.95.md` — retained desktop recruitment-action authority.
10. `AUDIT-12.94.md` — retained mobile recruitment-action alignment authority.
11. `AUDIT-12.93.md` — retained portrait match-HUD intent; Build 12.104 is the corrected source implementation.
12. `AUDIT-12.92.md` — retained desktop-sidebar alignment authority.
13. `AUDIT-12.91.md` — retained natural-height desktop-sidebar authority.
14. `AUDIT-12.90.md` — retained slim-sidebar visual direction.
15. `AUDIT-12.89.md` — retained flat-header authority.
16. `AUDIT-12.86.md` — retained compact desktop-sidebar foundation.
17. `AUDIT-12.85.md` — retained onboarding-focus and Saved Mail authority.
18. `AUDIT-12.84.md` — retained portrait bottom-clearance authority.
19. `AUDIT-12.83.md` — retained mobile recruitment touch and flip authority.
20. `AUDIT-12.82.md` — retained compact-landscape Command Centre panel-height authority.
21. `AUDIT-12.81.md` — retained persistent Club Infrastructure authority.
22. `AUDIT-12.80.md` — retained mobile recruitment compact-summary authority.
23. `AUDIT-12.79.md` — retained accessibility and visual-hierarchy authority.
24. `AUDIT-12.78.md` — retained desktop Inbox spacing authority.
25. Every remaining Markdown file before editing.

`GPT-HANDOFF-PROMPT.txt` mirrors the current release invariants for future coding sessions.

## Current desktop header split authority

- From `1024px`, `.manager-context-topline` uses `justify-content: space-between`.
- `#managerBreadcrumb` remains in normal flow at the upper-left; `.manager-build-version` remains in normal flow at the upper-right immediately before the shortcut controls.
- Mobile continues to expose its version only through the existing Help-revealed current-page bar.
- Build 12.116 changes desktop presentation and metadata only.

## Retained header and negotiation readability authority

- `css/game.css` independently centres `.manager-build-version` against `.manager-topbar` from `1280px`, while a non-visual placeholder preserves the breadcrumb's established position.
- At `1024px–1279px`, the badge remains inline with the breadcrumb. Mobile continues to expose its version only through the existing Help-revealed current-page bar.
- At `820px` and below, component-scoped rules raise negotiation round/status labels, scouting captions, safety guidance, seller requests, editable values and step captions.
- `js/39-transfers.js` remains authoritative for negotiation content, values, state transitions and signing. Build 12.115 changes presentation and metadata only.

## Retained live-feed readability authority

- `css/game.css` raises compact operator-profile, market-context, Active Five Needs and role-guide typography without changing the underlying content.
- `index.html` owns one decorative `.portrait-live-bug`; portrait windowed CSS places it at the upper-left of the live image and places up to three existing feed rows at the upper-right.
- `js/40-match-flow.js` continues to own feed content, ordering and lifetime. No event-generation or gameplay code changed.
- Desktop recruitment values retain both `CR` labels and use a bounded no-wrap font treatment. The desktop version badge now aligns its text baseline with the breadcrumb.
- Build 12.114 changes presentation and release metadata only. Recruitment calculations, match simulation, AI, combat, map visuals, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Retained desktop version-alignment authority

- `css/game.css` owns the Build 12.113 desktop correction. From `1024px`, `.manager-context-topline` is a single vertically centred flex row, `#managerBreadcrumb` has a stable text line box and `.manager-build-version` resets positioning, margins and transforms while centring its content with inline flex.
- `index.html` keeps the badge immediately beside `#managerBreadcrumb`; the markup order and mobile location are unchanged.
- `js/00-core.js` continues to synchronise both version labels from `BUILD_VERSION`.
- Build 12.113 changes desktop presentation and release metadata only. Gameplay, navigation, saves, match rendering, performance systems, save schema 19 and diagnostics schema 1 remain unchanged.

## Retained visible version-header authority

- `js/00-core.js` owns the authoritative build metadata and synchronises the desktop `#managerBuildVersion` and mobile `#mobileCommandBuildVersion` labels.
- `index.html` owns both static labels, the document title, asset query strings and main-menu build stamp. Every numbered playable release must update all of them.
- `css/game.css` keeps the desktop version in the main management header and the mobile version inside the current-page bar revealed by the existing `?` Help button.
- `build.py` rejects stale desktop or mobile source labels before generating a bundle or standalone release.
- Build 12.112 established the visible-version system. Gameplay, navigation, match presentation, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Current realistic operator head authority

- `js/60-renderer-core.js` owns the nine-ring skull with tapered jaw, cheek volume, recessed eye sockets, brow ridge and restrained nose bridge, plus the fitted helmet and nose-contoured face cover.
- `js/62-character-renderer.js` owns head dimensions and the shared living/corpse assembly. Split goggle frames and lenses use elliptical geometry while retaining the existing headset, rail, chin-strap and team-tab attachments.
- The Build 12.57 pale natural complexion family, dedicated matte skin material and visible-face coverage limits remain authoritative.
- Head geometry remains inside `OPERATOR_PROPORTIONS.modelTop`; hit detection and collision are unchanged and do not derive from the presentation mesh.
- Build 12.111 adds no head draw calls and changes no gameplay, persistence, save schema 19 or diagnostics schema 1.

## Current natural operator silhouette authority

- `js/60-renderer-core.js` owns the seven-ring ribcage/waist mesh, six-ring pelvis, tapered forward-profiled joint shell and longitudinal heel/instep/toe boot mesh.
- `js/61-world-renderer.js` registers these meshes once during renderer initialisation.
- `js/62-character-renderer.js` owns presentation-only pelvis counter-motion, torso/head stabilisation, articulated shoulder placement and elbows derived from the shoulder-to-hand chain. Authored weapon hand anchors remain authoritative.
- Living and fallen operators use the same revised geometry. The replacements occupy existing draw slots, so `additionalBodyDrawCalls` remains zero.
- `js/70-runtime.js` retains the deterministic operator preview and exposes `operatorAudit=1` for geometry, weapon attachment and corpse-render regression checks.
- Build 12.110 changes no hitbox, collision, AI, movement, navigation, line of sight, weapon value, match rule, economy, persistence, save schema 19 or diagnostics schema 1.

## Current Citadel match-performance authority

- `js/60-renderer-core.js` owns conservative static-world bounds, Citadel opaque GPU-batch capture and renderer counters. Batching preserves exact material inputs and world-space geometry; translucent and time-varying draws remain on the original path.
- `js/61-world-renderer.js` marks doors, warning lights and time-dependent effects as dynamic so they are never captured into a static batch.
- `js/00-core.js` owns the exact prop-collision spatial broad phase and cached dynamic-door collider list. `circleIntersectsLevelProp` and the segment narrow phase remain authoritative.
- `js/63-viewmodel-renderer.js` owns batch capture/replay at the existing static-world render boundary. `js/70-runtime.js` exposes diagnostic timing counters and `propCollisionBroadphaseForTest()`.
- The test-only `staticCulling=0` and `staticBatching=0` URL switches retain the original static submission paths for direct performance and visual comparisons.
- Build 12.109 changes no map data, materials, lighting, AI decisions, collision answers, navigation, line of sight, combat, economy, persistence, save schema 19 or diagnostics schema 1.

## Retained Build 12.108 Citadel environment authority

- `js/00-core.js` owns the Citadel layout, hotspots, engagement plans, spawn points, zones, props and the `decor` block. The depot is authored as its northern half and mirrored by a 180-degree rotation about the map centre; both halves must stay identical.
- `js/61-world-renderer.js` owns the industrial presentation: the stair assembly (flight, landing, stringer and recessed wall access hatch), catwalk end anchorage, hazard floor markings, authored service runs, the scalable plant core and the `openRunSegments` helper that keeps roof steel and services out of wall tops.
- `decor.walkways`, `decor.lowCeilings`, `decor.hazardZones` and `decor.pipeRuns` are presentation only. They create no colliders and do not affect navigation, collision or line of sight; every body-height object is authored under `props` so it receives a collider.
- The plant core is one `reactor` machine on the map centre with an authored 2.0 × 2.0 footprint, so its rendered shell and its collider are the same size.
- Citadel carries six gates, six tanks, two stair assemblies and two catwalks. `arenaGeometryPresentationSnapshot` fails unless every stair has a landing that meets a wall, both catwalks are clear of wall columns and anchored at both ends, every gate sits in a real opening, and every prop footprint is clear of masonry.
- Build 12.108 changes arena geometry, arena decoration and industrial-theme rendering only. Skyline Offices, Dune Bastion, bot AI, match simulation, economy, recruitment, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Current configurable management page-background authority

- `js/50-ui-menus.js` owns the independent `strikewatch.interfaceBackgroundColour.v1` preference, six dark presets, custom colour picker, safe hex validation, derived top/bottom shading and reset-to-default behaviour.
- `js/70-runtime.js` routes Configuration click/input/change events to the appearance handlers before general career handlers.
- `css/game.css` applies the selected colour only to the management `.menu-content` canvas and styles the preview, picker and preset controls. Cards, panels, sidebar chrome, route accents and match rendering remain unchanged.
- The default is Command Navy `#07131d`. The setting persists independently of career saves, so save schema 19 and diagnostics schema 1 remain unchanged.

## Current streamlined opponent-preparation authority

- `js/39-matchday.js` owns the Build 12.96 compact briefing, recommended response, optional match focus, advanced disclosure state and existing response/focus interaction handlers.
- `js/39-opposition-intelligence.js` continues to own opponent identities, scouting depth, uncertainty thresholds, opposition staff and infrastructure effects.
- The default Tactics presentation shows one quick read, one recommended response and one optional match focus. Full facts, alternative responses and all focuses remain behind one disclosure control.
- Response selection stages the existing formation, approach, engagement and priority controls. Fixture focuses influence the post-match evidence review only; neither system grants hidden outcome bonuses.
- The complete post-match opponent-preparation evaluation remains active and compares the preparation snapshot with actual support, range, trade, route and priority execution.
- Build 12.96 adds transient disclosure state only. Save schema 19 and diagnostics schema 1 remain unchanged.

## Current aligned desktop sidebar authority

- `css/game.css` owns the Build 12.92 desktop rail alignment. From `1024px` to `1279px`, the sidebar is `232px`, matching the header's `48px` Back and `184px` Gold Balance columns. At `1280px` and wider, it is `266px`, matching the `52px` and `214px` header columns.
- The sidebar/content gap is zero so the rail boundary forms one continuous vertical line with the header division.
- Desktop rows remain natural-height one-line controls: `42px` high with `10px` labels, `19px` SVGs and inline access badges. The selected club crest remains unboxed.
- `index.html` continues to own the five department SVGs. Mobile and compact-landscape navigation remain under their existing breakpoint authorities.

## Current onboarding-focus and Saved Mail authority

- `js/36-team-management.js` uses the existing `firstMatchGuidance()` result to simplify the Operations Command Centre during onboarding. The First Match Journey, optional context, club hero and Team XP remain; the normal calendar, fixture/status dashboard, objectives, priority queue, momentum, command directory, match-preparation and line-up panels return automatically when the guide ends.
- `js/39-club-operations.js` owns the Inbox and Saved Mail folders. Inbox contains unread messages plus unresolved decision mail; read unsaved messages are hidden. Saved Mail contains every message whose additive `saved` flag is true.
- Save/unsave controls exist in both the two-pane reader and full-email modal. Marking a message unread returns it to Inbox. Unresolved decision mail remains visible until the decision is resolved, even after it has been opened.
- `css/game.css` owns the folder tabs, saved-message indicators and responsive toolbar layout. The Build 12.78 desktop Inbox spacing and Build 12.66 mobile row readability remain intact.
- Build 12.85 changes onboarding presentation and mail retention behaviour only. Match simulation, mail generation, decision outcomes, End Day blockers, economy, infrastructure, save schema 19 and diagnostics schema 1 remain unchanged.

## Current portrait mobile bottom-clearance authority

- `css/game.css` owns the Build 12.84 correction. Portrait `.menu-content` retains only its normal 10-pixel bottom inset because `.menu-layout` already reserves the fixed department bar and safe-area height.
- The internal `#menuContent` route scroller must extend to the usable workspace edge so the next Command Centre section appears directly after Team XP instead of leaving a false 74-pixel blank band.
- The fixed department bar remains the navigation authority and must stay visible, touchable and free of content overlap.
- Compact landscape, desktop, Command Centre content, gameplay, recruitment, infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Current mobile Command Centre panel-height authority

- `css/game.css` owns the Build 12.82 correction. `.command-planning-grid` aligns its children to the start, and the Objectives and Recommended Actions panels explicitly size to their own content.
- Compact landscape may continue to show the two dashboard panels side by side, but the shorter Manager Priority Queue must not stretch to match the taller objectives list.
- Portrait stacking, persistent mobile navigation, Command Centre data, action ordering, gameplay, infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.
- Build 12.82 is a presentation-only correction.

## Current persistent club-infrastructure authority

- `js/39-infrastructure.js` owns the six facility branches, capacity rules, costs, construction timing, irreversible project state, academy intake generation, interface markup and infrastructure interaction handling.
- Division capacity is 8 / 10 / 12 / 14 for tiers 3 / 2 / 1 / 0. The complete tree contains 24 levels, so even a top-division club must specialise. One funded active project reserves one slot immediately and no refund or cancellation path exists.
- Infrastructure effects are integrated through the existing system owners: `js/38-development.js`, `js/39-recruitment-commercial.js`, `js/39-medical.js`, `js/39-opposition-intelligence.js`, `js/39-club-operations.js` and `js/39-dynamic-market-mail.js`.
- Academy prospects enter the existing recruitment market with no transfer fee, club-derived report knowledge and protection from rival bids or routine market rotation during their availability window.
- Build 12.81 retains Club Cash as the only infrastructure funding source and records spending in the existing finance ledger. Save schema 19 and diagnostics schema 1 remain unchanged.

## Current mobile recruitment compact-summary authority

- `js/39-recruitment-commercial.js` owns the Build 12.80 compact-summary state and content for mobile recruitment cards. At mobile and compact-tablet widths it keeps name, role, ability, potential, fee and wage visible immediately, exposes one primary Negotiate action, and reveals scouting explanation, squad-fit detail, history/context and role brief content only when the inline report is expanded.
- `css/game.css` owns the Build 12.80 compact-summary presentation. The desktop boardroom flip cards remain the authority above `820px`; below that threshold, the desktop stage is hidden and the compact summary/report stack becomes the only recruitment-card presentation.
- The sticky comparison tray remains the Build 12.71 comparison authority and stays visible while browsing so two or three selected candidates remain in view. No comparison logic, recommendation factors, transfer terms, signing behaviour, economy, persistence, save schema 19 or diagnostics schema 1 changed.
- Build 12.80 changes presentation and transient report-expansion state only. Candidate generation, scouting confidence values, recommendation calculations, budgets, negotiations, signings and progression remain unchanged.

## Current desktop Inbox authority

- `css/game.css` owns the Build 12.78 desktop Inbox correction. At `1024px` and wider, mail rows use content-aware heights, the list fills the available column, and the reader returns to zero outer padding so its header, subject, body and action sections own spacing exactly once.
- `js/39-club-operations.js` remains the owner of mail ordering, selection, unread state, previews, decisions and modal actions; Build 12.78 does not change mail data or behaviour.
- Mobile Inbox rules remain under the Build 12.66 readability authority and are intentionally unchanged.
- Build 12.78 is a desktop presentation correction only. Mail content, decisions, onboarding, gameplay, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Current recruitment-card authority

- `css/game.css` owns the Build 12.77 mobile carousel controls and retains the Build 12.76 horizontal snap track plus the Build 12.75 dark boardroom card presentation. Large previous/next arrows and a live candidate counter are visible below `820px`.
- `js/39-recruitment-commercial.js` owns candidate content, flip state, comparison selection, recommendation logic and mobile carousel navigation state. It moves the track by card, updates the live counter and preserves the active candidate across rerenders.
- Desktop and tablet recruitment browsing remain card-grid based; only the mobile browsing pattern changes. No candidate data, scouting confidence, recommendation, transfer, signing or economy logic changed.
- Build 12.77 changes navigation presentation and transient UI state only. Candidate data, recruitment ordering, scouting confidence, recommendation factors, transfer terms, signing logic, economy, match simulation, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Verification gates

Primary gates are modular/generated/standalone syntax, deterministic build parity, onboarding Command Centre simplification, Inbox read-message disappearance, save/unsave persistence, unresolved-decision retention, mobile/desktop containment, runtime cleanliness and ZIP integrity. Results and limitations are recorded in `AUDIT-12.85.md`.

## Historical release records

Files named `AUDIT-<version>.md` below Build 12.85 are historical release records. Their build names, filenames, schema references and statements describe the release audited at that time and are intentionally retained. `AUDIT-12.75.md` remains the authority for the dark-boardroom recruitment-card visual rollback; `AUDIT-12.72.md` remains the authority for mobile recruitment readability and layout integrity; `AUDIT-12.71.md` remains the authority for compact recruitment cards and the comparison tray; `AUDIT-12.70.md` remains the authority for FM interface and visual-source reconciliation; `AUDIT-12.69.md` remains the authority for guided navigation and advice routing; `AUDIT-12.68.md` remains the authority for mobile onboarding and HUD clarity; `AUDIT-12.67.md` for living press and player honours; `AUDIT-12.66.md` for mobile interface clarity; `AUDIT-12.63.md` for Armoury 3D preview optimisation; `AUDIT-12.62.md` for mobile navigation consolidation; `AUDIT-12.61.md` for mobile readability; `AUDIT-12.60.md` for desktop readability; `AUDIT-12.59.md` for first-match onboarding; and `AUDIT-12.58.md` for the Desktop Command Centre.

## Documentation maintenance rule

When gameplay, UI, navigation, rendering, economy, progression, persistence, tests or release files change, update the current authority documents and add or amend the current release audit in the same task. Keep this index and exact output filenames aligned with `js/00-core.js` and `build.py`.

## BUILD 12.98 · Recruitment header alignment fix
- Fixed the desktop recruitment card header so the player identity no longer competes with the shortlist/details controls.
- Moved the desktop shortlist/details controls onto their own full-width action row within the streamlined parity card layout.
- Preserved the 12.97 streamlined card presentation while removing the cramped/overlapping appearance shown in QA.

## BUILD 12.99 · Three-column recruitment desktop
- Changed the desktop recruitment candidate grid to three columns on large screens and two columns on medium desktop widths.
- Preserved the streamlined mobile-style recruitment card treatment while giving each card more horizontal room.
- Intended to resolve the cramped appearance reported after the 12.98 header alignment pass.

## BUILD 12.100 · Recruitment action row fix
- Fixed the desktop recruitment action-row alignment so the shortlist control stays as a square icon button and the Details button fills the remaining space cleanly.
- Preserved the three-column large-desktop and two-column medium-desktop recruitment layouts from 12.99.
- Intended to remove the stretched/offset button bar seen in the desktop recruitment cards.

## BUILD 12.101 · Recruitment top-right header actions
- Restored the desktop recruitment header to a two-column layout so shortlist and Details sit at the top-right of each summary card, matching the preferred mobile composition.
- Removed the full-width action-row treatment introduced during the overlap fix while preserving the three-column large-desktop and two-column medium-desktop card grid.
- Kept the shortlist button square and the Details button compact so the header stays visually balanced.

## BUILD 12.102 · Recruitment desktop hover parity
- Added the stronger hover treatment used by the mobile-style recruitment cards to desktop recruitment cards as well.
- Desktop cards now lift slightly and gain a brighter glow on hover/focus, with gold hover emphasis for shortlisted cards and teal hover emphasis for compared cards.
- Kept the existing desktop card layout and top-right action-button placement unchanged.

## BUILD 12.103 · Recruitment desktop premium hover
- Refined desktop recruitment-card hover so it feels a little more premium rather than only brighter.
- Increased the lift/glow slightly and added a subtle saturation/brightness bump on desktop hover and focus.
- Top-right Details and shortlist controls now also brighten with the card on desktop hover, matching the nicer interactive feel of the mobile cards more closely.

## BUILD 12.109 · Citadel match performance
- Reduced Citadel's static environment submission cost through exact-material opaque GPU batching and conservative static view culling.
- Replaced full-list prop checks and repeated sliding-door collider reconstruction with an exact spatial broad phase and state-keyed collider cache.
- Preserved the Build 12.108 map, visuals, collision answers, navigation, operator AI, combat, economy and persistence.

## BUILD 12.108 · Citadel Depot environment rework
- Rebuilt the Citadel Depot layout as a mirrored half so both teams play identical geometry, and reshaped the wall masses into readable racking, partitions, loading bays and a central plant hall.
- Fixed catwalks passing through sixteen wall columns, stairs terminating against blank wall, three props and one gate embedded in masonry, five AI hotspots inside walls, and overhead runs clipping wall tops.
- Added an industrial decor layer (hazard floor markings, authored service runs, per-room suspended ceilings, data-driven catwalks) that creates no colliders, plus a stricter geometry integrity gate covering all of the above.
