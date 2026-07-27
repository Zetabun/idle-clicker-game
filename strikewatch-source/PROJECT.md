# Read This Before Doing Anything

This directory is the authoritative, maintainable source project for **Strikewatch Build 12.119: Guided Navigation Label Fix**.

## Current release essentials

## Build 12.119 guided navigation label fix

`css/game.css` now isolates the onboarding badge geometry from the shared
`.menu-subtab::after` active-route rail. Guided inactive tabs reset inherited
inset, height and transition values, size the pseudo-element to its `NEXT`
content and place it above the route copy. Compact layouts retain the 10.5px
meaningful-microcopy floor, desktop uses an 8px badge instead of the legacy
5.5px value, and both reserve enough space above the route copy.
`js/50-ui-menus.js` remains the owner of guided-route state and markup; no
navigation or onboarding logic changed.

## Build 12.118 mobile typography readability pass

`css/game.css` owns the final compact-screen typography authority. The shared
mobile semantic variables now use a 10.5px micro floor, an 11–12px label range,
an 11.75–12.75px small-copy range and an 11.5–12.25px control range.
Component-specific selectors cover legacy fixed-size text in recruitment,
operator profiles, team telemetry, development, supplies, league tables,
Configuration and the portrait match console. The `max-width: 360px` scouting
attribute grid contracts its columns so larger labels remain contained.
Desktop layout and all gameplay/data authorities are unchanged.

## Build 12.117 Skyline Offices environment rework

Build 12.117 rebuilds the Skyline Offices environment. `js/00-core.js` owns the reworked arena: the floorplate is authored as its north-west quadrant and mirrored about `x = 18` and `z = 12`, furniture is authored for the west half and mirrored about `x = 18` only, and the `decor.courtyards` rectangle now matches the real open atrium at `x` 14-22, `z` 9-15 exactly, so the ceiling void it drives no longer cuts through room walls. A new `decor.floorMarkings` layer and authored `decor.lowCeilings` replace the three hard-coded office ceiling boxes in `js/61-world-renderer.js`, which also gains `drawOfficeFloorMarking`. The office branch of `arenaGeometryPresentationSnapshot` is now a real gate: it rejects any prop, glass band, wall display, baffle, ceiling, floor marking or door that does not clear masonry, sit on a real wall face or occupy a genuine opening, and it requires layout symmetry in both axes. `js/30-bot-ai.js` retargets `OFFICE_COURTYARD_ROTATION_LANES` at the new atrium arcades, and `js/70-runtime.js` updates the office clearance, walkway and door-pocket audits to the new counts and circulation routes. The tactical minimap and deployment preview needed no change because both already derive from `MAP`, `LEVEL_ZONES`, `LEVEL_DECOR_LAYOUT` and `LEVEL_PROP_LAYOUT`; both were verified against the reworked arena. All new decoration is overhead or painted on the floor, so collision, navigation and line of sight are unchanged. Save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.116 desktop header split

`css/game.css` owns the Build 12.116 desktop header arrangement. At `1024px` and above, `.manager-context-topline` spans the available `.manager-context` width with `justify-content: space-between`: `#managerBreadcrumb` occupies the upper-left edge and `.manager-build-version` remains a static flex item at the upper-right edge. No absolute positioning or visual placeholder remains. The mobile version stays in `.mobile-command-route-bar`, and the Build 12.115 compact negotiation type floors remain authoritative. Build 12.116 changes no navigation, deal value, negotiation action, gameplay, match presentation, economy, persistence, save schema 19 or diagnostics schema 1.

## Build 12.115 header and negotiation readability

`css/game.css` owns the Build 12.115 presentation layer. From `1280px`, `.manager-build-version` is positioned against the relative `.manager-topbar` at the horizontal and vertical centre of the wide header, while a non-visual flex placeholder preserves the established breadcrumb position. The `1024px–1279px` desktop contract remains inline, and the mobile label remains inside `.mobile-command-route-bar`. At `820px` and below, component-scoped rules raise the compact type floors inside `.transfer-negotiation-card`, `.workflow-contract-safety`, `.transfer-demand-row` and `.transfer-value-control`. `js/39-transfers.js` remains the authority for negotiation content, values and actions. Build 12.115 changes no deal calculation, recruitment behavior, gameplay, match presentation, economy, persistence, save schema 19 or diagnostics schema 1.

## Build 12.114 live feed readability

`css/game.css` owns the compact-screen type floors for `.team-attribute-row`, `.dynamic-market-profile`, `.recruitment-needs-panel` and `.recruitment-role-guide`. It also owns desktop no-wrap currency presentation, the baseline-aligned desktop version badge, the portrait `.portrait-live-bug` presentation and the upper-right portrait placement of the existing `#feed` rows. `index.html` owns the decorative live-bug markup. `js/40-match-flow.js` remains the sole owner of feed events and contents; Build 12.114 does not create or alter eliminations. Recruitment values remain generated by the existing recruitment systems. Match simulation, operator decisions, rendering, economy, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.113 desktop version alignment

`css/game.css` now treats `.manager-context-topline` as one explicit desktop alignment unit. `#managerBreadcrumb` owns a stable text line box, while `.manager-build-version` resets inherited positioning, margins and transforms, uses `inline-flex` content centring and keeps a fixed minimum line box beside the breadcrumb. The markup order and Build 12.112 runtime synchronisation remain intact, including the mobile Help-revealed version. This is a desktop presentation and release-metadata change only; gameplay, navigation, saves, match rendering, performance systems, save schema 19 and diagnostics schema 1 are unchanged.

## GitHub repository layout and publishing ownership

The GitHub repository root owns the deployment boundary: `cod.html` is the live GitHub Pages file, `strikewatch-source/` contains this complete maintainable project, and `other/` preserves unrelated or retired repository content. All implementation and documentation edits begin under `strikewatch-source/`. After verification, `dist/strikewatch-build-<version>.html` is copied byte-for-byte to root `cod.html`; both source and output are committed together. Root `cod.html` must not become an independent source branch, and files under `other/` must not become implicit Strikewatch dependencies.

## Build 12.112 visible version header

`index.html` owns the desktop `#managerBuildVersion` label and the mobile `#mobileCommandBuildVersion` label. `js/00-core.js` synchronises both from the authoritative `BUILD_VERSION`, while `css/game.css` presents the desktop label in `.manager-context` and the mobile label inside the current-page Help bar. The mobile version remains hidden with that bar until `#managerHelpToggleBtn` is activated. `build.py` validates both source labels against `BUILD_VERSION` before generating outputs, preventing a release with stale visible metadata. `js/70-runtime.js` exposes `buildVersionHeaderForTest()` for metadata parity and retains `mobilePageHelpForTest()` for Help-off/Help-on visibility. This is interface metadata only; navigation, gameplay, match rendering, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.111 realistic operator heads

Build 12.111 refines the existing shared procedural head assembly. `js/60-renderer-core.js` owns a nine-ring skull profile with a tapered jaw, cheek volume, eye sockets, brow ridge and restrained nose bridge, plus a closer helmet shell and nose-contoured face cover. `js/62-character-renderer.js` owns the revised proportions and uses elliptical mesh treatment for the split goggles. These are presentation-only substitutions in existing draw slots: head hit detection, collision, operator dimensions, identity variation, pale natural skin, LOD thresholds, AI, combat and persistence remain unchanged.

## Build 12.110 natural operator silhouettes

Build 12.110 refines the existing asset-free WebGL operator renderer rather than replacing it with a heavier character system. `js/60-renderer-core.js` owns the revised seven-ring torso, six-ring pelvis, tapered joint shell and longitudinal boot meshes. `js/62-character-renderer.js` keeps the existing two-bone lower-body rig and authored weapon hand anchors, but layers in restrained pelvis counter-motion, torso/head stabilisation, articulated shoulder placement and elbow positions derived from the shoulder-to-hand chain. Living and fallen operators share the new surface geometry. Body draw-call count, collision, hit detection, AI, navigation, combat, economy, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.109 Citadel match performance

Build 12.109 fixes the live-match stutter exposed by the denser Build 12.108 Citadel environment. The renderer now captures Citadel's opaque static geometry into material-preserving GPU batches and applies conservative per-object view culling only to the remaining static draw path. Runtime collision keeps the same narrow-phase equations but uses a map-rebuilt spatial broad phase, and dynamic sliding-door colliders are reused until the door state changes instead of being reconstructed for every clearance sample. No authored map geometry, materials, lighting, animation, operator decisions, navigation result, line-of-sight result, weapon value, economy or progression rule changes. Save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.108 Citadel Depot environment rework

Build 12.108 rebuilds the Citadel Depot environment. An automated geometry pass found ten authoring defects: both suspended catwalks passed through sixteen wall columns between them, both stair flights climbed 0.56 m and stopped against blank wall in dead-end nooks, three props and one gate were embedded in masonry, five of eight AI hotspots sat inside walls, and the roof steel and service runs intersected the top of every wall they crossed. The depot is now authored as its northern half and mirrored by a 180-degree rotation, so both halves play identically. Wall masses read as buildings — racking runs with cross aisles, gated partitions, loading bays and a tall central plant hall. Stairs render a full assembly ending at a recessed wall access hatch, catwalks span a bay wall-to-wall with bearing plates at both ends, and a new industrial decor layer adds hazard floor markings, authored service runs and per-room suspended ceilings. All of the new decoration is overhead or painted on the floor, so collision, navigation and line of sight are unchanged. Save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.107 recruitment card surface isolation

Build 12.107 isolates recruitment candidate surfaces from the configurable management canvas. The old global alternating-row style could make even candidate cards translucent, so all recruitment cards now receive a dedicated opaque navy background and retain their darker desktop hover state. Recruitment logic and persistence are unchanged.

## Build 12.106 configurable management page background

Build 12.106 adds a persistent **Page Background** control to Club → Configuration. Managers can choose from six restrained dark presets or use the native custom-colour picker. The selected colour updates the large management canvas behind cards and panels immediately, survives reloads through a small independent local-storage preference, and can be reset to the original Command Navy default. Panel surfaces, text colours, route accents, sidebar chrome, match presentation, career save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.105 windowed match label cleanup

Build 12.105 removes the obsolete decorative **LIVE // SECURE FEED** pseudo-label from windowed matches. After the scoreboard and round objective were moved into dedicated HUD rows, that legacy label could remain visible behind the new layout at the top-left of the match panel. The scoreboard, objective, 16:9 viewport, landscape presentation, match simulation, save schema 19 and diagnostics schema 1 are otherwise unchanged.

## Build 12.104 blocker links, darker recruitment hover and portrait HUD repair

Build 12.104 repairs three regressions found during desktop and mobile QA. Mandatory management actions now bypass opening-week progressive locks when necessary, and pending sponsor offers explicitly expose the Commercial route so each red **Must Respond** item opens and scrolls to the exact offer. Desktop recruitment cards retain a small lift and glow, but the hover surface and action-button highlights are substantially darker and less washed out. Portrait windowed matches now use a real stage viewport wrapper: the scoreboard bar and round-objective bar occupy dedicated rows above a 16:9 live canvas rather than overlaying the rendered action. Save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.97 desktop recruitment card parity

Build 12.97 brings the desktop recruitment market onto the same visual treatment as the refreshed mobile cards. The old desktop flip-card presentation is suppressed in favour of the newer compact summary-first card, with inline report access and the same action grouping managers already preferred on mobile. Recruitment systems, scouting knowledge, comparison logic, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.96 streamlined opponent preparation

Build 12.96 keeps the existing opponent intelligence, response templates, fixture focuses and post-match evaluation, but presents them through progressive disclosure. The default Tactics view now shows one quick opponent read, one recommended response and one optional match focus. Full scouting facts, alternative plans and every available focus remain behind a single expandable control. Selecting a response still stages the real formation, approach, engagement range and team priority controls; no hidden outcome bonus was added. Post-match analysis continues to compare the selected preparation with what the autonomous operators actually executed.

## Build 12.92 aligned desktop sidebar and readable labels

Build 12.92 keeps the natural-height FM-style desktop department list from Build 12.91, enlarges the icon and label treatment, and aligns the sidebar's right edge with the desktop header division after Back and Gold Balance. The rail uses 232 pixels at 1024–1279px and 266 pixels at 1280px and wider, matching the corresponding header columns exactly. Rows remain compact, one-line and content-sized; the club crest remains unboxed. Mobile and compact-landscape navigation, gameplay, onboarding, recruitment, mail, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.91 natural-height desktop sidebar

Build 12.91 fixes the inherited desktop sidebar track stretching that made each department menu occupy a large vertical card. The desktop rail now uses content-sized navigation, fixed natural-height one-line rows, inline access badges and an unboxed club crest. Mobile navigation, route ownership, gameplay and persistence are unchanged.

## Build 12.88 mobile recruitment header alignment

Build 12.88 refines the compact mobile recruitment summary so its front face now mirrors the flipped scouting side's header structure. The front face removes the previous shortlist and compare chips, adds a compact shortlist star beside the Details button, and leaves compare on the flipped side. Desktop recruitment cards, the compact desktop rail, gameplay and persistence remain unchanged.

## Build 12.85 onboarding focus and saved mail

Build 12.85 simplifies the Command Centre while the First Match Journey is active and adds a task-led Inbox with Saved Mail. During onboarding, the calendar strip, fixture/status dashboard, club objectives, priority queue, momentum panel, command directory, match-preparation dashboard and line-up snapshot are withheld from the Command Centre; the First Match Journey, optional context, club identity and Team XP remain. The complete dashboard returns automatically when onboarding ends. Read unsaved emails now leave the Inbox immediately, unresolved decision emails remain visible until answered, and managers can save or unsave messages from the reader or full-email modal. A Saved Mail folder keeps marked messages available across saves. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.84 portrait mobile bottom clearance correction

Build 12.84 removes the remaining false gap above the persistent department bar in portrait mobile. The fixed bottom navigation was already reserved by the mobile menu layout, but a second 74-pixel padding rule on the content pane shortened the inner route scroller again. Portrait now keeps only the normal 10-pixel content inset, so the next Command Centre section flows directly beneath Team XP while the fixed navigation remains fully clear. Compact landscape, desktop, gameplay, recruitment, infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.82 mobile Command Centre panel height correction

Build 12.82 corrects the large false gap beneath the mobile Command Centre's Manager Priority Queue. In compact landscape, the Objectives and Recommended Actions panels remain side by side, but each now sizes to its own content instead of CSS Grid stretching the shorter panel to the height of the taller objectives list. Portrait layout, bottom navigation, dashboard content, gameplay, infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.81 persistent club infrastructure

Build 12.81 adds a permanent, capacity-limited Club Infrastructure system inside the existing Club department. Six four-level branches—Training, Scouting, Medical & Recovery, Youth Academy, Analysis and Commercial & Supporters—spend Club Cash, use one construction queue and permanently consume division-based capacity. Capacity expands from eight slots in Division 3 to fourteen in the top tier, while the full tree contains twenty-four levels, forcing long-term specialisation. Completed facilities feed existing training, recruitment, medical, academy, opposition-analysis, player-XP, sponsorship, match-income and supporter-growth authorities. Academy intakes enter the established recruitment market as fee-free club prospects. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.79 accessibility and visual hierarchy pass

Build 12.79 delivers a focused accessibility and visual-hierarchy pass without changing gameplay or persistence. Disabled controls now use a readable neutral surface at full opacity, including formerly confusing guided and locked actions. Keyboard focus uses a high-contrast cyan ring with a dark separation halo. Informational panels use quieter neutral borders while actionable controls receive stronger interactive edges and hover feedback. Routine labels and secondary guidance use sentence case and reduced letter spacing, while gold is reserved for primary actions, earned ratings and important states. The First Match Journey action now retains its bright guided treatment instead of combining dark text with a generic dark button background. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.78 desktop inbox spacing and readability

Build 12.78 repairs the desktop Inbox spacing conflict introduced when later readability passes enlarged mail copy while an older rule continued to force every message row into 78 pixels. Desktop rows now size to their sender, subject and two-line preview; the message list uses the available column height rather than stopping after two rows; and the reader no longer receives duplicate outer padding on top of its own message-section padding. The result keeps the existing two-pane mail-client style while removing clipped previews, row overlap and excessive reader offsets. Mobile mail presentation, mail data, decisions, gameplay, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.77 makes mobile recruitment carousel navigation explicit. Large previous and next arrow buttons now sit above the candidate track with a live '1 of 6' counter, while swipe and snap scrolling remain available. The current candidate is remembered across card flips and recruitment rerenders. The Build 12.75 dark boardroom card style, desktop/tablet grids, candidate data, scouting, comparison, negotiation, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.76 mobile recruitment card carousel

Build 12.76 keeps the Build 12.75 darker boardroom recruitment-card visuals and changes only the mobile browsing pattern. At mobile widths, recruitment candidates now appear in a swipeable one-card-at-a-time carousel with snap scrolling, rounded premium card framing, subtle neighbouring-card peeks and a compact swipe hint. Desktop/tablet presentation, candidate data, scouting calculations, comparison logic, negotiations, signings, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.75 recruitment card visual refresh

Build 12.75 intentionally rolls back the Build 12.74 silver-shield surface treatment and returns recruitment cards to the darker boardroom style. The cards are restyled to feel more visually impressive without abandoning the established UI: richer navy gradients, premium panel depth, stronger accent lighting and cleaner card framing. The gold/platinum scouting-star language remains, desktop still shows fewer wider cards per row and candidate names continue to wrap instead of clipping. Candidate data, scouting calculations, negotiations, signing logic, economy, match simulation, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.72 delivers **Mobile Recruitment Readability & Layout Integrity** while retaining the Build 12.71 card-flip and comparison systems. At mobile and compact-tablet widths, recruitment candidates now use one full-width card per row, larger decision text and substantially larger ability/potential stars. The squad-fit block receives guaranteed space above the action grid, so guidance such as **Fills an Important Gap** can no longer be compressed beneath the buttons. The reverse scouting face now expands within the card instead of creating a second internal scroll area. The expanded First Match Journey and the comparison tray remain in normal mobile document flow, preventing the tray from covering onboarding content; only the deliberately collapsed journey summary may remain sticky. Desktop presentation above 1023 pixels, candidate data, recommendation logic, negotiation/signing behaviour, economy, match simulation, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.71 delivers **Compact Recruitment & Comparison Tray** while preserving the Build 12.70 boardroom theme and all gameplay values. Recruitment-market candidates now use compact two-faced cards: the front concentrates identity, scouting confidence, ability, potential, fee, wage, squad fit and the primary decision actions, while an explicit flip control reveals the role brief, key attributes, medical status, market context and Active Five impact without navigating away or losing scroll position. A sticky three-slot comparison tray follows the shortlist through the market, supports removal and clearing, and automatically opens the existing squad-fit recommendation workspace when a second candidate is selected. The detailed comparison still evaluates immediate impact, future ceiling, current squad need and budget fit rather than simply choosing the highest rating. Flip, tray and expanded-comparison state are transient UI state only. Recruitment data, ordering, negotiation terms, signing logic, economy, match simulation, combat, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.69 delivers **Guided Navigation & Advice Routing** without changing gameplay or persistence. Starting an incoming negotiation now routes to Transfers and scrolls the active negotiation card into a clear start position, including while the First Match Journey is visible. Shared guided scrolling now resolves both tutorial guide targets and management target IDs. Opposition Manager Options name and target actionable destinations—the match plan, Active Five and squad loadouts—so choosing tactics advice from the Tactics page moves beyond the report instead of rerendering at the same review control. Recruitment data, transfer terms, tactical effects, match simulation, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.68 delivers **Mobile Onboarding & HUD Clarity** without changing match simulation, recruitment data or persistence. The new-club emblem chooser now replaces the large preview SVG and label immediately when a mobile player cycles between options. In portrait windowed matches, including the guided demo, the round objective is reduced to a single-line strip approximately 25 pixels high and sits flush beneath the scoreboard at the same width; the secondary planning line is hidden on this compact presentation. The mobile Inbox unread-count badge now uses true flex centring while preserving its hidden zero state. Recruitment's operator-role guide starts closed by default but remains a native expandable panel, and the ambiguous scouting `knowledge` presentation is now labelled **Scouting Confidence** with an explanation that it measures the reliability of displayed ability, potential, fee, wage and medical estimates. Desktop layout, team-emblem data, scouting progression, game balance, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.67 delivers **Living Press & Player Honours**. Every completed league or exhibition fixture now receives a deterministic impact-based Man of the Match award; a winning operator from the player club adds a one-time club award of `1,500 CR` in league play or `750 CR` in exhibitions. The non-settling guided orientation remains reward-neutral. AI-versus-AI fixtures now retain compact match reports, named award winners and rival-player performance histories. Each completed league round produces a press roundup containing results, award winners, table context and notable stories, while an upcoming-opponent watch email combines confirmed recent results, likely starters, award form and scout-depth tactical interpretation. Operator profiles now include a permanent accolades and achievements timeline, and **Team > Honours** provides club-wide leaders and recent history, including records for operators who later leave the active squad. Existing played fixtures receive a one-time historical backfill. Fixture outcomes, combat AI, weapon balance, save schema 19 and diagnostics schema 1 remain unchanged; all new state is additive under `careerState.worldPress`.

Build 12.66 delivers **Mobile Interface Clarity** without changing recruitment logic, onboarding progression or mail data. Below `1024px`, the First Match Journey panel now includes a visible chevron control and can collapse into a 48-pixel, one-line summary bar that can be expanded again with the same control. The collapsed state is presentation-only and is not added to the career save. Recruitment candidates now have stronger complete-card borders, spacing and left-edge accents so each profile has a clear beginning and end. Mobile Inbox rows no longer use the undersized fixed height inherited from the earlier layout; each message can grow to contain its metadata, subject and preview without clipping into the next row. Desktop presentation, gameplay, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.65 delivers the **Mobile Help Icon Alignment** correction without changing the Help toggle behaviour or topbar geometry. Below `1024px`, the `?` control now restores the same centred grid layout used by the neighbouring Inbox and Calendar shortcuts, keeping the glyph centred inside its existing button cell in both white/off and gold/on states. The page-help preference, contextual bar, Club Navigator access, desktop Match shortcut, gameplay, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.64 delivers the **Mobile Page Help Toggle** without changing route ownership, gameplay or desktop navigation. Below `1024px`, the former mobile Match shortcut is replaced by a persistent `?` Help control. It starts white and inactive; when enabled it turns gold and reveals the current-page guidance bar containing the department, page title, concise purpose, progress state and existing **Pages** entry to the Club Navigator. Disabling Help removes that bar completely so the management screen begins directly beneath the topbar. The preference is stored separately in local storage under `strikewatch.mobilePageHelpVisible`, is not part of the career save and restores on the next launch. The active department remains an independent route to the Club Navigator, so hiding Help never removes page access. At desktop widths the new Help control is hidden and the established Match shortcut remains unchanged. The onboarding shortcut guide now labels this control **HELP** on mobile and **MATCH** on desktop. Save schema 19, diagnostics schema 1 and all game authorities remain unchanged.

Build 12.63 delivers the **Armoury 3D Preview Optimisation** without flattening or replacing the procedural models. The Team Armoury detail inspector now mounts the complete armour chest piece by itself rather than combining it with the 17-part operator inspection bust. Its drag/swipe orbit, rotate controls, zoom, reset, auto rotation and front/side/rear depth remain intact. Inventory cards derive compact full-depth models from the same armour definitions, reducing the five mounted list models from 401 to 158 authored 3D parts (60.6%) while preserving shells, plates, straps, shoulder/neck protection, pouches and class identity. Static thumbnails no longer reserve compositor layers or use the expensive parent drop shadow, offscreen rows use content visibility, and automatic inspector rotation pauses outside the viewport. The Supply Depot's complete headless product forms, live WebGL armour, balance, ownership, assignment, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.62 delivers the **Mobile Navigation Consolidation** without changing desktop navigation, gameplay or persistence. Below `1024px`, the five authoritative departments now form one persistent primary control: a thumb-reachable bottom bar in portrait and a compact left rail in short landscape. The legacy horizontal subsection carousel is hidden on mobile and replaced by one current-page bar that opens a full-screen Club Navigator. The navigator switches departments without changing page, searches all non-context routes, shows the first-match task, notifications, current-page state and exact progressive-lock reasons, and closes through route selection, its X control or Escape. Tapping another unlocked persistent department opens its overview; tapping the active department reopens the navigator, while tapping a locked department opens that department inside the navigator so its exact unlock reason remains visible. Mobile Command Index and section-hub page directories are suppressed because the navigator now owns discovery, while desktop retains the complete Build 12.58/12.60 rail, route grid and Command Index. Pause-session Return and Exit actions are available inside the navigator. Focus containment, focus return, body scroll locking and safe-area handling are presentation-only; save schema 19, diagnostics schema 1 and all route/game authorities remain unchanged.

Build 12.61 delivers the **Mobile Readability & UX Pass** without changing desktop presentation or game behaviour. A final mobile-only authority in `css/game.css`, active below `1024px`, replaces legacy 4–8px decision copy with semantic micro, label, supporting-copy and body floors, raises recurring controls to a 44-pixel touch target, improves disabled-state contrast and gives the first-session creation, lock and economy guidance the same readable hierarchy. Narrow portrait navigation now uses real short labels (`OPS`, `GEAR`, `SUPPLY`) rather than clipped words or pseudo-content, while the seven-column month calendar becomes a concise list of the current and event-bearing dates at `430px` and below; mobile landscape retains the month grid with larger rail, route and topbar copy. The same floor now covers the live match: portrait objectives, scores, spectator dock, controls and utility buttons remain readable, orientation feed copy no longer covers the objective, and compact landscape removes the duplicate spectator panel plus the four-field decision grid instead of compressing them into overlapping micro-text. `typographyConsistencyForTest()` now covers mobile hierarchy, locks, priority actions and economy guidance in addition to the retained desktop checks. The Build 12.60 desktop typography, Build 12.59 onboarding flow, Build 12.58 desktop structure, gameplay, renderer, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.60 delivers the **Desktop Readability Pass** without changing mobile presentation or game behaviour. A final desktop-only typography layer in `css/game.css`, active from `1024px`, introduces scalable micro, label, supporting-copy and body tokens and applies them to the Command Centre objective queue, manager priorities, momentum panel, command-directory search/results, topbar, sidebar and retained management-module helper copy. Rows receive slightly more breathing room, disabled and locked explanations retain stronger contrast, and the reported secondary text now scales from a readable 1024-pixel baseline through wide desktop viewports instead of remaining at phone-sized values. `typographyConsistencyForTest()` now verifies desktop secondary text, Command Centre rows and directory copy. The Build 12.59 onboarding flow, Build 12.58 desktop structure, established interface below `1024px`, gameplay, renderer, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.59 delivers the **First Match Onboarding Refinement** without changing the persisted opening-week authority. The club-creation page now presents a concise three-step first-15-minute path, removes the duplicated required-action strip before a club exists and places the primary creation action ahead of optional emblem customisation. `firstMatchGuidance()` still derives the same nine internal state checks required by existing schema-19 careers, but the interface groups them into six player-facing milestones: Build Active Five, Review Line-up, Prepare Team, Watch Match, Review Match and Improve Team. Before the first real match, while the contracted squad contains fewer than five operators, Recruitment opens in a transient focused mode with six deterministic, affordable and role-diverse recommended candidates, immediate Active Five progress and the existing comparison tools; the complete 18-player scouting department remains available through one explicit advanced-tools control and no new state is saved. The demo now hides its obsolete skip action after completion, signing feedback tracks positions filled, and the desktop creation/recruitment handoff remains usable at the 1024-pixel baseline. The Build 12.58 Desktop Command Centre, established mobile presentation, gameplay, economy, renderer, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.58 delivers the **Desktop Command Centre** for PC Command HQ viewports at `1024px` and wider while leaving the established phone interface visually unchanged. A final isolated `@media (min-width: 1024px)` layer in `css/game.css` creates an 80-pixel command bar, readable labelled shortcuts, a wider section rail with live section identity, a non-scrolling multi-column route navigator, centred bounded workspaces and larger desktop controls/cards. Squad, recruitment, transfer, mail, finance, Armoury and Supply Depot presentations receive desktop-specific grids and two-pane layouts without changing their data or route authorities. `index.html` supplies desktop-only labels and semantic section hooks, while `js/50-ui-menus.js` updates the section kicker, title and supporting copy. Below `1024px`, the existing portrait and mobile-landscape cascade, route overflow controls, touch targets, safe areas and live-match dock remain authoritative. Gameplay, rendering geometry, AI, economy, persistence, save schema 19 and diagnostics schema 1 are unchanged.

Build 12.57 delivers **Light Operator Skin** across the live WebGL operator and Armoury inspection presentations. `OPERATOR_SKIN_PRESENTATION` in `js/62-character-renderer.js` owns six deterministic pale natural tones, while `OPERATOR_SKIN_MATERIAL` in `js/60-renderer-core.js` gives exposed skin its own matte surface (`8`), roughness (`0.64`) and bounded ambient visibility lift (`0.42`) instead of making the face self-illuminated. The lower face covering is narrower and lower so the cheeks, upper jaw and neck remain visible behind the helmet and armour, and the shared living/corpse head and neck paths use the same material. `css/game.css` aligns the Armoury mannequin through `.operator-skin`; Supply Depot product forms remain intentionally headless. `operatorSkinPresentationAudit()`, `operatorSkinPresentationForTest()` and the mounted skin check inside `armour3dPresentationForTest()` verify both presentation paths. Operators remain gloved, so no artificial bare-hand skin has been introduced. Geometry, hitboxes, collision, weapons, armour, AI, economy, save schema 19 and diagnostics schema 1 are unchanged.

Build 12.56 delivers **Connected Weapon Geometry** across every live WebGL weapon presentation. The authored parts were already adjacent, but world-held and first-person renderers used a larger vertical scale for part positions than for part sizes, stretching the gaps between neighbours and leaving pieces such as the magazine base visibly suspended. `js/35-career.js` now owns one `CAREER_WEAPON_RENDER_SCALES` authority and `careerWeaponRenderScaleProfile()` supplies identical vertical position/size scaling to `js/62-character-renderer.js` and `js/63-viewmodel-renderer.js`. `careerWeaponPartMovesWithMagazine()` keeps the magazine and base on one reload transform; the sidearm trigger guards are reseated and the AR-4 rear sight aperture gains a connected bridge. `careerWeaponGeometryIntegrityAudit()` verifies all four authored weapon models as one rendered component in both world and viewmodel contexts, and `weaponGeometryIntegrityForTest()` is folded into the existing attachment audit. Preserve the shared part authority, scale profile, connected-component diagnostic, reload assembly, grip/support/muzzle/stock anchors and all existing weapon gameplay values. Damage, accuracy, range, magazines, reload timing, inventory, AI, armour, economy, save schema 19 and diagnostics schema 1 are unchanged.

Build 12.55 delivers an **Operator Model Remaster** in the live WebGL renderer. `js/60-renderer-core.js` now owns dedicated profiled meshes for the anatomical head, open-bottom helmet, curved face cover, pelvis, armour carrier, shoulder shell and tapered glove; `js/61-world-renderer.js` registers those meshes at higher practical tessellation; and `js/62-character-renderer.js` draws one shared living/corpse assembly with separate goggle lenses, headset hardware, connected chin straps, subtle team helmet tabs, six deterministic appearance variants now constrained to a fair/light natural skin-tone family and stable identity-based head proportions. Major equipment uses softer connected geometry while the existing locomotion, weapon-grip, corpse, armour-class and distance-LOD authorities remain intact. Preserve `makeOperatorHeadMesh()`, `makeOperatorHelmetMesh()`, `makeOperatorFaceCoverMesh()`, `drawOperatorHeadAssembly()`, `operatorVisualProfile()`, `operatorHeadGeometryAudit()`, `operatorSurfaceGeometryAudit()`, `operatorHeadGeometryForTest()` and the existing hitbox/collision contract. Movement, animation anchors, weapons, armour balance, AI, rewards, economy, save schema 19 and diagnostics schema 1 are unchanged.

Build 12.54 delivers **Full-Depth 3D Armour** throughout the Supply Depot and Armoury. The shared procedural armour pipeline now builds connected faceted front and rear shells, shoulder bridges, wraparound cummerbund structures, class-specific side protection, rear plate pockets, rear MOLLE, drag handles and supporting product-form/operator geometry. Supply Depot cards use large full-width perspective stages with a restrained headless product form and a complete front/side/rear 360-degree orbit; the Armoury inspector is larger and retains drag, swipe, wheel/button zoom, reset and auto-rotation. Nested store-form, operator-body and armour-system rigs must remain unflattened with `filter: none`, `opacity: 1` and `transform-style: preserve-3d`; lighting and visual dimming belong on individual faces rather than parent 3D groups. Armour protection, penetration, movement, handling, fatigue, prices, ownership, assignment, durability, break behaviour, live WebGL balance, save schema 19 and diagnostics schema 1 are unchanged. Preserve `careerArmourModelProfile()`, `careerArmour3dParts()`, `careerArmourStoreFormParts()`, `careerArmourOperatorBodyParts()`, `careerArmourRigMarkup()`, `careerArmourVisualMarkup()`, `operatorArmourRenderProfile()` and `armour3dPresentationForTest()`.

Build 12.53 adds one autonomous **Live Command Pulse** per live round. The manager opens a viewport-level chooser and selects exactly one of three context-sensitive broad instructions drawn from Regroup, Commit, Disengage, Hold Territory and Switch Route. Operators interpret the pulse through the existing role, awareness, pressure, spacing, approach and authored engagement-route systems, so responses may be immediate, delayed or unable; no direct operator control or health, accuracy or damage configuration bonus is introduced. Each pulse snapshots and restores the affected tactical profile, records an evidence-led outcome in the current match report and resets for the next round. In mobile landscape, commentary, current match moments and the command chooser now occupy a dedicated row beneath the action viewport and must never overlay the canvas; portrait retains a contained viewport-level chooser. Preserve `LIVE_COMMAND_PULSE_DEFS`, `liveCommandPulseAvailability()`, `issueLiveCommandPulse()`, `completeLiveCommandPulse()`, `resetLiveCommandPulseForRound()`, `liveCommandPulseForTest()`, `landscapeCommentaryForTest()`, the existing autonomous AI/match/route authorities, the Build 12.52 arena-geometry baselines, save schema 19 and diagnostics schema 1.

Build 12.52 adds a presentation-only **Arena Geometry Integrity** layer to the existing procedural world renderer. `js/61-world-renderer.js` now owns shared structural specifications and attached render helpers for Citadel stairs, suspended walkways, doors and industrial equipment; Office baffles, glass, screens, seating and furniture supports; and Dune canopy/stall frames and amphora handles. `js/00-core.js` exposes the shared Dune canopy offsets used by both visible posts and colliders, and moves the previously wall-embedded Office conference set into the adjacent open bay while retaining collider parity. `js/70-runtime.js` exposes deterministic per-arena and all-arena geometry integrity snapshots. Gameplay balance, weapons, AI, engagement plans, spawn points, save schema 19 and diagnostics schema 1 are unchanged.

Build 12.51 adds the persistent **Living Transfer Market & Organic Mail** layer through `js/39-dynamic-market-mail.js`. The market generates unique fictional entrants from the current division or weaker pools, preserves origin/listing/demand/price metadata, lets rival clubs recruit against real role, tactical and budget needs, and retains completed AI moves in rival squads. Listing rotation protects shortlists, active negotiations and live rival bids. Long-form correspondence is generated from actual market activity, signings, match results, finances and squad context while retaining the established inbox and popup. Preserve `dynamicMarketProcessDay()`, `dynamicMarketGeneratePlayer()`, `dynamicMarketSelectRivalBid()`, `clubAddOrganicMail()`, `dynamicTransferMarketForTest()`, save schema 19 and diagnostics schema 1.

Build 12.50 Matchday Story & Payoff and Build 12.49 Consolidated Economy Guidance remain required retained systems. Their evidence, tutorial and balance boundaries are documented below and in their matching audit records.

## Build 12.39 retained squad dynamics

Build 12.39 adds passive **Squad Dynamics** without turning the game into a conversation-management simulator. Contracted operators build persistent pair bonds from shared matches, support spacing, trades, results and joint performance. Familiar, Linked, Trusted and Elite milestones unlock small positive-only coordination buffs through existing role-execution, support, trade, group, flank, movement, awareness and reaction fields; developing pairs simply receive no buff and never suffer a penalty. Each starter uses only their strongest active partnership, active-five atmosphere adds only a small positive uplift, and relationships do not decay. One natural mentor link may automatically grant a developing operator +6% training and match-development XP. Rotation Watch, milestone mail and debrief updates are advisory only: they never block End Day or demand routine responses. Preserve `makeDefaultSquadDynamicsState()`, `normaliseSquadDynamics()`, `settleSquadDynamicsAfterMatch()`, `squadDynamicsBuffForPlayer()`, `applySquadDynamicsToBot()`, `squadDynamicsDevelopmentMultiplier()`, `renderSquadDynamicsPanel()`, `renderPlayerDynamicsPanel()`, `renderSquadDynamicsMatchReport()`, the once-per-match settlement guard, positive-only multipliers, save schema 19 and diagnostics schema 1.

# Strikewatch Project Guide

## Build 12.61 mobile readability and UX pass

Build 12.61 is a presentational mobile pass. The final `<1024px` cascade in `css/game.css` owns the new semantic type floors, touch targets, compact primary-navigation labels and narrow-phone calendar list. Shared markup changes are limited to real alternate navigation labels and a mobile calendar date hook; they remain hidden or inert at desktop widths.

### Build 12.61 live-match mobile rules

- Portrait windowed matches retain the match objective, transient status, one readable feed row in ordinary matches and the full spectator command dock; guided orientation suppresses its duplicate feed messages because the coach already owns that explanation.
- Portrait sound, diagnostics, minimap, view-mode and spectator controls retain at least 44-pixel touch targets.
- Compact landscape uses one readable owned-operator telemetry card. The duplicate spectator card and four-field decision grid are hidden at 500px height and below; identity, health, accuracy, damage, weapon, behaviour and the plain-language decision reason remain visible.
- Taller landscape and desktop layouts retain the complete telemetry and decision detail presentation.

### Build 12.61 invariants

- Keep the desktop Command Centre and Build 12.60 desktop typography unchanged at `1024px` and wider.
- Keep meaningful mobile text at or above 9px; ordinary explanations and decision copy should use the larger supporting/body tokens rather than the microcopy floor.
- Keep interactive mobile controls at least 44px in either dimension where they are intended as standalone actions.
- Preserve real full navigation labels for desktop and real short labels for narrow portrait; do not restore clipped words, duplicated pseudo-content or zero-sized source text.
- At 430px and below, show the current date and dates containing events as a readable calendar list. Keep the complete month grid in landscape and wider layouts.
- Preserve the opening-week, First Match Journey, Recruitment, gameplay, AI, renderer, economy and persistence authorities; no new saved UI state is introduced.
- Run creation/journey checks, the 24-route mobile and desktop matrices, typography diagnostics, syntax, deterministic builds and archive integrity before release.

## Build 12.60 desktop readability pass

Build 12.60 addresses the remaining phone-scale secondary typography visible inside the otherwise desktop-specific Command Centre. The change is presentational only and lives in the final `@media (min-width: 1024px)` layer of `css/game.css`.

- Four scalable desktop type tokens now provide separate micro-label, label, supporting-copy and body baselines from 1024 pixels upward.
- The Active Club Objectives, Manager Priority Queue, momentum panel and Command Index now use larger titles, descriptions, metadata, search text and row spacing without changing their data or click authorities.
- Topbar, sidebar and retained management-module helper labels receive bounded desktop increases so the shell reads as a PC interface rather than a stretched phone layout.
- Disabled and locked copy retains stronger contrast while remaining clearly unavailable.
- `typographyConsistencyForTest()` now includes desktop secondary-copy, Command Centre row and directory checks.
- No mobile CSS, onboarding state, route authority, gameplay, economy, renderer, persistence or schema changes were made.

### Build 12.60 regression requirements

Validate all 24 management routes at 1024×768, 1366×768 and 1992×1078 plus 430×932 portrait and 844×390 mobile landscape. Require zero hard overflow, clipping, undersized-control or page-error failures, a passing typography diagnostic, unchanged targeted mobile computed typography, modular/generated/standalone syntax, deterministic rebuilding and ZIP integrity.

## Build 12.59 first match onboarding refinement

Build 12.59 refines the opening experience around one principle: the first real match should arrive through a clear sequence without exposing the entire long-term management simulation at once. The persisted tutorial, squad, transfer, calendar and progression authorities are unchanged. The release changes how those authorities are presented during the first career only.

`js/35-career.js` now keeps the creation pitch concise and places the team-creation action before optional emblem customisation. `js/50-ui-menus.js` maps the existing nine `firstMatchGuidance()` states onto six visible journey milestones while retaining the original state IDs and route behaviour. `js/39-recruitment-commercial.js` owns a transient focused Recruitment presentation and deterministic six-candidate selector; it reads the real market, affordability and Active Five needs, then exposes the unchanged full department through an advanced-tools toggle. `js/36-team-management.js` allows the supporting role guide to begin collapsed in this focused state. `js/40-match-flow.js` removes the skip control only after the orientation round is already complete. `js/70-runtime.js` extends the retained regression suite around these boundaries.

Key boundaries:

- no save or diagnostics schema change;
- no persisted onboarding checklist, shortlist or expanded-market flag;
- the same nine internal first-match states remain authoritative;
- six visible milestones are derived presentation only;
- recommended candidates come from the real market and still use ordinary reports, comparison, negotiation, affordability, wages, transfer fees and squad limits;
- the complete 18-player market remains one click away;
- Build 12.58 desktop and established sub-1024 mobile shells remain authoritative;
- no gameplay, AI, renderer, weapon, armour, economy or match-balance change.

Primary release gates are `onboardingClarityForTest()`, `newPlayerOrientationForTest()`, `firstMatchGuidanceForTest()`, `recruitmentRoleGuideForTest()`, `recruitmentDecisionSupportForTest()`, `guidanceConsolidationForTest()`, `progressiveInterfaceForTest()`, `typographyConsistencyForTest()` and `stateIntegrityForTest()`, plus real creation-to-recruitment click-through, the desktop route matrix, mobile containment, source/generated/standalone syntax, deterministic rebuild and archive integrity.

## Build 12.58 desktop command centre

Build 12.58 turns the PC Command HQ from an enlarged phone shell into a supported desktop workspace without touching the existing mobile presentation. The desktop system is deliberately additive: `css/game.css` ends with a guarded `@media (min-width: 1024px)` layer, `index.html` exposes desktop-only labels and section-identity hooks, and `updateMenuUI()` in `js/50-ui-menus.js` supplies the current department copy. No route ownership, data model or gameplay logic moved.

Desktop architecture:

- `.manager-topbar` becomes an 80-pixel command bar with explicit balance/context/shortcut/action zones and visible labels for Inbox, Calendar and Match.
- `.manager-menu-sidebar` expands to 252 pixels on compact PC layouts, 292 pixels from 1280 pixels and 304 pixels from 1440 pixels, with a dynamic department kicker, title and status line.
- `.menu-primary-tabs` become a readable vertical navigation rail with larger labels, active-state contrast and keyboard focus treatment.
- `.menu-subnav-shell` becomes a sticky, non-scrolling desktop route grid. It may wrap to multiple rows at 1024 pixels, and `.menu-content` must always begin below its measured height.
- `.menu-content` uses a centred bounded canvas with desktop gutters and section-specific responsive grids instead of stretching every card across the monitor.
- Squad, recruitment, transfer, mail, finance, Armoury and Supply Depot views receive desktop-specific density and layout treatment; the Inbox uses a proper list-and-reader split.
- All desktop-only shortcut labels remain hidden below `1024px`, and existing mobile portrait/landscape layout, route arrows, touch sizing and live-match commentary dock remain unchanged.

Release acceptance combines visual/geometry checks at 1024, 1280, 1366, 1440 and 1920 CSS pixels with unchanged mobile checks at 320, 375, 390, 402 and 430 portrait plus 844 × 390 landscape. Build 12.57 through 12.52 renderer and gameplay baselines, save schema 19 and diagnostics schema 1 remain authoritative.

## Retained Build 12.57 light operator skin

Build 12.57 keeps the Build 12.55 procedural operator remaster intact while aligning every visible operator complexion to a pale natural family. `OPERATOR_SKIN_PRESENTATION` in `js/62-character-renderer.js` contains six deterministic tones selected through the existing identity-based `operatorVisualProfile()` path. The active palette is not written to career persistence and does not affect operator identity, attributes or gameplay.

`OPERATOR_SKIN_MATERIAL` in `js/60-renderer-core.js` adds a dedicated matte skin surface. Surface `8` uses roughness `0.64` and a bounded ambient visibility lift of `0.42`, preserving cheek, brow, jaw and nose shading under dark arena lighting without routing ordinary skin through the emissive material path. The shared anatomical head and both living/corpse neck segments use this same surface. The lower face cover is also reduced to `0.678` of head width and `0.342` of head height, keeping the cheeks, upper jaw and neck visibly exposed behind the helmet, goggles and armour collar. Gloves, helmet equipment, face covering, armour and clothing remain separate materials.

The Armoury CSS-3D fitting mannequin uses a matching light natural `.operator-skin` gradient (`#fff0e5` → `#e8bda7` → `#a66d58`) for its face and neck. The Supply Depot continues to use the established headless product form. `operatorSkinPresentationAudit()` records palette luminance, material values, selected variant, face-cover coverage, visible areas and presentation-only guarantees; `js/70-runtime.js` exposes it through `operatorSkinPresentationForTest()` and includes the mounted Armoury computed-style check in `armour3dPresentationForTest()`.

### Build 12.57 regression requirements

- Require six finite pale natural WebGL variants, with every tone meeting the light-palette luminance and channel-floor contract.
- Require surface `8`, roughness `0.64` and ambient lift `0.42`, with the live/corpse head and neck paths sharing the same material.
- Require face-cover width and height coverage to remain at or below `0.70` and `0.36`, preserving visible cheeks, upper jaw and neck.
- Require the anatomical head, helmet, face cover, goggles, headset and chin hardware to retain the Build 12.55 geometry and attachment checks.
- Require the Armoury mannequin computed `.operator-skin` gradient to resolve to the authored light natural colours while Supply Depot remains headless.
- Run live operator, held-weapon, corpse and first-elimination presentation checks with zero runtime, page-console or warning events.
- Preserve all weapon, armour, command, arena and navigation diagnostics, including Citadel 80/80, Office 80/80 and Dune 160/160 route benchmarks.
- Preserve operator attributes, collision, hit detection, AI, combat balance, economy, save schema 19 and diagnostics schema 1.
## Build 12.56 connected weapon geometry

Build 12.56 keeps `careerWeaponVisualParts()` in `js/35-career.js` as the only authored weapon-part authority while repairing the live WebGL transform pipeline. The previous world-held and first-person renderers scaled authored Y positions more aggressively than part heights. That preserved individual dimensions but expanded every vertical centre-to-centre distance, visibly separating the magazine base, trigger guards and other neighbouring pieces.

`CAREER_WEAPON_RENDER_SCALES` now defines the world and viewmodel length, depth, vertical and forward values for long guns and sidearms. `careerWeaponRenderScaleProfile()` is the only WebGL scale resolver. Its `verticalPositionScale` and `verticalSizeScale` are deliberately identical; `operatorSharedWeaponRig()`, `drawUnifiedCareerWeapon()` and `drawViewmodel()` consume that same profile, so geometry and attachment anchors cannot drift onto different transforms.

`careerWeaponPartMovesWithMagazine()` identifies the complete reload assembly. Both WebGL renderers use it for magazine release, travel and insertion, keeping `magazine` and `mag-base` connected throughout the animation. `careerWeaponPartFitOffset()` also seats sidearm trigger guards against their frames, and the AR-4 model includes a rear-sight bridge so the aperture is visibly mounted rather than suspended.

`careerWeaponRenderedPartBounds()` and `careerWeaponRenderedPartGap()` reconstruct each rendered part's transformed bounds. `careerWeaponGeometryIntegrityAudit()` checks all four unique model classes in world and viewmodel contexts, requires exactly one connected component, requires position/size scale parity and explicitly checks the magazine-base connection. `operatorWeaponAttachmentAudit()` includes this result, while `weaponGeometryIntegrityForTest()`, `operatorHeldPoseForTest()` and `viewmodelWeaponPresentationForTest()` expose deterministic test paths.

### Build 12.56 regression requirements

- Require four unique models and eight world/viewmodel geometry samples.
- Require one connected rendered component and zero positive magazine-base gap in every sample.
- Require identical vertical position and size scaling in both contexts.
- Require the magazine and base to share the reload transform.
- Preserve dominant-hand, support-hand, muzzle and AR-4 stock-seat attachment tolerances.
- Exercise all four weapons in operator-held and first-person presentation.
- Preserve the Build 12.55 operator/corpse assembly, Build 12.54 armour, Build 12.53 live command/commentary layout and Build 12.52 arena/navigation baselines.
- Preserve weapon balance, inventory, save schema 19 and diagnostics schema 1.

## Build 12.55 operator model remaster

Build 12.55 replaces the remaining sphere-and-box operator presentation with a higher-detail procedural WebGL assembly while retaining the custom asset-free renderer. `js/60-renderer-core.js` adds smooth indexed profile construction and dedicated meshes for the head, helmet, face cover, pelvis, armour carrier, shoulder shell and gloves. The head profile contains a tapered chin, cheek/brow volume, front/rear asymmetry and a restrained nose projection; the helmet is an open-bottom shell rather than a second sphere.

`js/62-character-renderer.js` owns deterministic visual identity through `operatorVisualSeed()` and `operatorVisualProfile()`. Operators receive one of six deterministic appearance variants, now constrained by Build 12.57 to a fair/light natural skin-tone family, plus restrained head-width, height and depth variation. `drawOperatorHeadAssembly()` is the only head assembly authority for living and fallen operators. It combines the anatomical head, curved mask, profiled helmet, separate framed lenses, bridge, smooth ear cups, rails, chin straps and full-detail team tabs while retaining the established distance-based operator detail tier.

The existing body rig is preserved but now uses profiled pelvis, tapered carrier, deltoid shoulder-shell and glove meshes plus higher-resolution torso, capsule, sphere and cylinder meshes. These are presentation changes only: `OPERATOR_PROPORTIONS`, leg IK, movement, hit detection, collision, weapon anchors, armour classes and combat values remain authoritative and unchanged.

### Build 12.55 regression requirements

- Require the anatomical head, open-bottom helmet, curved face cover, split lenses, connected headset/chin straps and stable identity variation in `operatorHeadGeometryAudit()`.
- Require living and corpse rendering to call the shared `drawOperatorHeadAssembly()` path.
- Preserve `OPERATOR_PROPORTIONS`, `operatorLegGeometryAudit()`, `operatorWeaponAttachmentAudit()` and all movement/weapon attachment tolerances.
- Require `operatorHeadGeometryForTest()`, `operatorModel()` and `operatorPresentationForTest()` to report finite, contract-compliant geometry.
- Run a live WebGL presentation pass at full detail and corpse/detail-tier rendering checks without application exceptions.
- Preserve armour systems, Build 12.54 full-depth store presentation, Build 12.53 live commands, Build 12.52 arena/navigation baselines, save schema 19 and diagnostics schema 1.
- Rebuild twice and require byte-identical generated JavaScript and standalone HTML before packaging.

## Build 12.54 full-depth 3D armour

Build 12.54 replaces the visually flattened armour presentation with a genuinely volumetric shared CSS-3D pipeline. `js/35-career.js` remains the model authority: `careerArmourModelProfile()` defines class proportions; `careerArmour3dParts()` authors connected front, side and rear shell geometry; `careerArmourStoreFormParts()` supplies the subdued headless store display form; `careerArmourOperatorBodyParts()` supplies the larger fitting mannequin; and `careerArmourRigMarkup()` / `careerArmourVisualMarkup()` assemble the store and detail views.

The armour rigs now include faceted front and back cores and wings, shoulder bridges, wraparound cummerbund and rib structures, side pockets/plates/buckles, layered front plates and MOLLE, rear plate pocket and hard plate, rear MOLLE, drag handle, rear identification panel, collar/shoulder protection and class-specific lower or heavy protection. All pieces are procedural HTML/CSS geometry with no external texture or image dependency.

`css/game.css` gives Supply Depot armour cards large full-width perspective stages, a complete 360-degree auto-orbit with readable front and rear three-quarter pauses, class scale normalisation, face-specific lighting and a larger Armoury inspection stage. A critical renderer rule is that the nested store-form, operator-body and armour-system groups remain unflattened: their computed `filter` must be `none`, opacity must remain `1`, and `transform-style` must remain `preserve-3d`. Subdued product-form styling and light falloff are applied to individual faces because parent filter/opacity effects collapse nested CSS 3D into a layered-card appearance.

`js/70-runtime.js` extends `armour3dPresentationForTest()` to mount both contexts and require shared-model use, full-depth feature parts, centred child rigs, large responsive stages, full-orbit presentation, operator fit and unflattened computed styles. `operatorArmourRenderProfile()` remains the live WebGL silhouette authority and its class separation is retained. Protection, penetration, movement, handling, fatigue, prices, inventory, assignment, integrity and break rules are unchanged; save schema remains 19 and diagnostics schema remains 1.

### Build 12.54 regression requirements

- Mount Supply Depot previews in representative portrait and mobile-landscape viewports and require no page-level horizontal overflow.
- Require a large store stage, a complete 360-degree animation, readable front/side/rear geometry and a restrained display form rather than a flat armour silhouette.
- Mount the Armoury detail viewer and retain drag/swipe rotation, wheel/button zoom, reset, auto-rotation, caption/callout containment and full operator-fit context.
- Require the front/back shell cores, shoulder bridges, cummerbund, plate wings, rear plate and drag handle in generated markup.
- Require `filter: none`, opacity `1` and `transform-style: preserve-3d` on every nested parent 3D rig.
- Run `armour3dPresentationForTest()`, `armourSystemForTest()`, `armourMatchAttritionForTest()`, `armourLoadoutMappingForTest()`, `cashWeaponStoreForTest()`, all-arena geometry integrity and navigation benchmarks.
- Rebuild twice and require byte-identical generated JavaScript and standalone HTML before packaging.

## Build 12.53 live command pulses and landscape commentary dock

Build 12.53 adds one manager intervention during each live round without replacing autonomous operator control. `js/41-live-command-pulses.js` owns contextual command selection, one-use-per-round availability, role/awareness/pressure-led compliance, temporary tactical-profile snapshots, movement goals, authored route switching and evidence-led outcomes. `js/30-bot-ai.js` consumes those temporary goals only when operators can safely interpret them, `js/40-match-flow.js` owns round and match reset boundaries, `js/35-career.js` retains completed command outcomes in the existing match summary, and `js/70-runtime.js` binds controls and deterministic diagnostics.

The five command archetypes are Regroup, Commit, Disengage, Hold Territory and Switch Route. The live chooser always presents exactly three context-sensitive options. Responses may be immediate, delayed or unable, and the resulting tactical profile is restored when the pulse expires or the round ends. Commands may alter movement, spacing, approach, support behaviour and existing engagement routes only; they must never modify health, accuracy, weapon damage, armour protection, rewards, economy or opponent attributes.

`index.html` and `css/game.css` split the live landscape match into an action stage and a dedicated commentary row. The feed, current match moment and open command chooser remain wholly below the canvas in landscape. Portrait keeps a viewport-level chooser so the transformed windowed match frame cannot clip it. Save schema remains 19 and diagnostics schema remains 1.

### Build 12.53 regression requirements

- A live round must expose exactly three contextual choices and permit only one successfully issued command.
- All five command paths must produce at least one immediate responder in deterministic coverage, support delayed/unable responses and restore every temporary tactical field afterward.
- Protected health, skill, accuracy, damage, fire-rate, reload, armour and weapon configuration snapshots must remain unchanged.
- A new round must reset command availability; a completed match must retain command outcomes in the existing report without adding save fields.
- Landscape geometry checks must prove that the action canvas remains inside the action stage and that commentary, moment, feed and open command panel remain inside the dock below it with no horizontal overflow.
- Portrait checks must prove that the command trigger and viewport-level chooser remain visible and contained.
- Retain all Build 12.52 geometry, collision, navigation, spawn, route and Dune exact-baseline gates, plus independent 30-simulated-second arena runs, state-integrity checks and deterministic rebuild parity.

## Retained Build 12.52 arena geometry integrity

Build 12.52 repairs disconnected, floating and wall-embedded presentation geometry without replacing the established map, collision, navigation, line-of-sight or engagement-plan authorities.

- **Citadel Depot:** the two stair props are rendered as five grounded solid risers with continuous tread caps, nosing and side stringers; both overhead walkways gain ceiling hangers, anchor plates, transverse beams and an underside spine; door portals gain wall returns and thresholds; industrial containers, terminals and tanks gain skids, plinths and connected nozzle hardware.
- **Skyline Offices:** four acoustic baffles derive their hang points from the local or main ceiling; four glass bands gain top/bottom channels and three mullions; five wall screens gain rails and cable raceways; twenty chairs use grounded stems, four-spoke caster bases and connected backs; benches and sofas use complete supports; door frames use shared wall ties and thresholds. The conference table and its six chairs move from `(18.0, 21.55)` to `(18.0, 20.40)` with a 90-degree rotation so the complete set sits in open authored geometry rather than inside a wall, and the static collider follows the same source prop.
- **Dune Bastion:** four canopy structures use shared presentation/collider post offsets and now include four perimeter headers, eight knee braces and four rafters each, with the full frame following the cloth pitch; market stalls gain complete perimeter headers and post collars; amphora handles return to the vessel as two connected segments; retained arch lintel, backing and emblem attachment contracts remain authoritative.

`ARENA_GEOMETRY_PRESENTATION` centralises the visual dimensions used by the repair helpers. `arenaGeometryPresentationSnapshot()` derives map-specific attachment and parity evidence, while `arenaGeometryIntegrityForTest()` and `allArenaGeometryIntegrityForTest()` expose it through `window.__strikeDebug`. The release gate retains all existing door, screen, furniture, route, spawn, navigation, minimap and Dune support-overlap audits.

## Build 12.51 living transfer market and organic mail

Build 12.51 adds `js/39-dynamic-market-mail.js` as an additive simulation layer over the existing league, recruitment and transfer authorities. `generateTeamPlayer()` accepts a tier override so new entries can be generated from the current division or a weaker source pool without leaking stronger talent into lower leagues. Market entries receive persistent origin, listing, availability, demand, price-momentum and rival-bid metadata through unchanged save schema 19. Rival target selection reads each club's roster role deficits, tactical style, rating and persistent transfer/wage budgets before opening talks. Rival rosters retain up to eight operators across normalisation so completed AI moves remain part of the league. The paid search action rotates a maximum of three unprotected listings rather than erasing the complete market.

The correspondence layer extends `clubAddMail()` to retain bodies up to 6,000 characters plus optional sender, preview, organic and story metadata. `clubAddOrganicMail()` creates market digests, signing dossiers and expanded result reports from current save data. The existing inbox reader and popup are retained, with contained independent scrolling added for long-form messages. Static administrative mail remains available where appropriate, but important recruitment and match stories now reflect actual entrants, bids, signings, prices, squad needs, finances, results and highlights. `dynamicTransferMarketForTest()` verifies tier balance, unique names, intelligent role targeting, shortlist-safe searches, rival-roster persistence, long-mail persistence, responsive UI context and scrolling. No combat, reward, negotiation calculation, squad limit, save-schema or diagnostic-schema authority changed.

## Build 12.50 matchday story and payoff

Build 12.50 connects the central spectator match to the existing management loop without adding a second simulation or telemetry authority. `js/40-match-flow.js` records bounded visible match moments and derives one round explanation from existing support, trade, accuracy, damage and survival telemetry. `js/36-team-management.js` turns that evidence, player ratings, squad-dynamics growth and tactical-adjustment results into a saved Match Story panel and slowly earned presentation-only operator identities. `js/35-career.js` carries the evidence into the first-match payoff and detailed report, while `js/10-audio.js` adds restrained UI cues. Identity badges require repeated evidence, are capped at two per operator and never apply a gameplay modifier. Save schema remains 19 and diagnostics schema remains 1.

## Build 12.49 consolidated economy guidance

Build 12.49 consolidates the opening economy education without adding another tutorial tracker. `js/36-team-management.js` owns `clubEconomyGuideMarkup()`, a shared contextual resource map. Its recruitment mode explains Club Cash, wage headroom and the foundation loan inside the existing optional induction, while `firstMatchGuidance()` states the fee-versus-wage distinction directly at the first-signing step. Its reward mode is reused by `careerFirstMatchOutcomeMarkup()` to explain the exact destination of Club Cash, Gold Coins, Team XP and Player XP and to separate the free victory Supply Drop from currency. `MENU_CONTEXT_TUTORIALS` now teaches how to read Finances, Gold, Training and the Supply Depot rather than repeating basic resource definitions. `economyGuidanceForTest()` verifies timing, terminology, consolidation and retained guidance authority. Economy values and persistence are unchanged.

## Build 12.48 recruitment decision tool

Build 12.48 upgrades the existing transient comparison selection in `js/39-recruitment-commercial.js` rather than introducing a second recruitment authority. `recruitmentComparisonDecision()` interprets each currently selected candidate through the existing scouting-aware ability/potential estimates, role suitability, Active Five functional coverage, medical information, cash and wage constraints. `recruitmentComparisonDecisionSummaryMarkup()` identifies the strongest current fit among the selected candidates and states the recommendation confidence. Each card shows Immediate Impact, Future Ceiling, Squad Need and Budget Fit, plus plain-language reasons and trade-offs, while retaining the underlying facts and direct Report/Negotiate routes. The second selected candidate triggers an in-view comparison focus. `recruitmentDecisionSupportForTest()` now verifies the interpreted recommendation, scoring categories, tutorial flow and direct actions. Comparison IDs remain transient UI state; transfer logic, scouting authority, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.47 recruitment negotiation fix

Build 12.47 corrects a progressive-access conflict between the First Match Guide and the authoritative transfer negotiation workflow. `startIncomingTransferNegotiation()` creates the incoming deal before routing to Transfers, but earlier builds kept the Transfer Centre locked until the entire guide was complete. `progressiveRouteAccess()` now allows Transfers only while an incoming negotiation is active during the early recruitment guide steps. The route locks again normally when no deal is active. `firstMatchGuidanceForTest()` now verifies the before/after access contract, and the recruitment tutorial copy explains the full Negotiate → Submit Offer → Complete Signing sequence. No transfer calculations, signing limits, finance authority or save schema changed.

## Build 12.46 tailored armour finish

Build 12.46 improves the final armour presentation quality without changing armour gameplay. `js/35-career.js` reshapes each class into a more believable carrier with segmented upper/lower shells, tapered waists, better-fitted side plates, improved shoulder and collar integration, extra straps/buckles, plate-pocket layers and richer radio details. `careerArmourOperatorBodyParts()` slightly opens the mannequin pose so the armour remains readable when previewed on-body. `css/game.css` upgrades the preview staging and gives fabric, plate, pocket, clip, rubber and cable surfaces more distinct shading. `js/62-character-renderer.js` keeps the live WebGL armour-class differences and lightly retunes the worn proportions to better match the improved showcase rigs. No armour balance, save or inventory authority changed.

## Build 12.45 centred armour previews

Build 12.45 fixes a presentation regression in the shared armour viewer. `css/game.css` now centres the nested `career-weapon-rig` inside each `career-armour-model-system`, so both Supply Depot cards and the Armoury detail inspector render the full rig rather than clipping away the negative-space half of the model. `js/70-runtime.js` extends `armour3dPresentationForTest()` so it mounts store and detail previews in the DOM and verifies the nested rig stays centred in every armour context. The Build 12.44 operator-mannequin preview, heavy-versus-light geometry differences and live WebGL armour silhouettes remain intact. No balance or save authority changed.

## Build 12.44 operator-fitted 3D armour

Build 12.44 keeps the Build 12.43 shared weapon-style 3D part pipeline and improves how armour reads when worn. `js/35-career.js` now authors a procedural operator mannequin from the same cuboid/cylinder primitives and displays it behind the selected armour in the interactive detail viewer. Armour-only store cards continue to reuse the same armour model without the mannequin. `js/62-character-renderer.js` expands the live WebGL armour profile so light, flexible, plate and heavy classes have truthful class-specific width, depth, side protection, shoulder protection, collar, abdomen and lower protection. `armour3dPresentationForTest()` verifies the shared pipeline, operator-fit model, heavy-specific geometry and live-renderer class separation. No balance or save authority changed.

## Build 12.42 3D armour inspection

Build 12.42 refines the procedural armour presentation without changing armour balance or inventory authority. `js/35-career.js` owns the shared layered rig and its independent interactive viewer state. Store cards reuse the same rig with CSS-only idle rotation, while the Armoury detail card exposes drag/swipe, zoom, reset and auto controls. CSS tier modifiers make each class visually distinct, and reduced-motion users receive a stationary store preview. `armour3dPresentationForTest()` verifies shared models, interactive controls and layered parts. Save schema remains 19 and diagnostics schema remains 1.



## Build 12.40 season stories

Build 12.40 gives the existing league campaign memory and context. It recognises stakes from the real table and fixture history, allows rivalries to emerge from repeated meaningful meetings, presents supporter and board views, tracks automatic season storylines and archives club history. The player receives context rather than another workload: there are no required narrative decisions, relationship-style maintenance tasks or new progression blockers.

### Build 12.40 architecture notes

- `js/33-season-narrative-state.js` owns the additive version-1 narrative state, safe normalisation, rivalry thresholds, record objects, archive caps and headline/mail limits.
- `js/35-career.js` creates and normalises `careerState.seasonNarrative` inside unchanged career save schema 19.
- `js/52-season-narratives.js` observes the authoritative League, supporter, opponent, operator and squad-dynamics systems. It calculates fixture context, form storylines, rivalry progression, club records, season archives and all League/deployment/intro/debrief presentation.
- The League tab receives the full Stakes, Rivalries & Club History dashboard. The next fixture, deployment brief, team reveal and debrief reuse the same captured context rather than recalculating a conflicting narrative authority.
- Fixture settlement updates the system once. Repeated report rendering, reloads or debug settlement cannot add intensity, records, mail or reputation again.
- High-stakes victories may add a small positive reputation bonus capped at 2. No loss creates a reputation penalty, and no story affects combat, AI, health, weapons, economy payout or fixture simulation.
- `startNextLeagueSeason()` captures the completed campaign before the League resets, then archives it once into the new season's history and retains a new-season history headline.
- Save schema remains 19 and diagnostics schema remains 1.

### Build 12.40 regression requirements

- A fresh campaign must show one responsive Season Narrative dashboard with next-fixture importance, table context, supporter view, board view, active storylines, rivalries and record book.
- One settled fixture must advance form and exactly one rivalry meeting, add a headline and update applicable club records.
- Repeating the same settlement must leave the complete narrative snapshot unchanged.
- Normalise/save round-tripping must preserve rivalry values, records, current headlines, archive data and deduplication metadata.
- Repeated close and meaningful meetings must cross the 20/45/75 rivalry thresholds from real evidence only.
- Competition mail must remain informational and the narrative layer must add no End Day or required-response blocker.
- A completed season must archive once and update highest finish, points and round-difference records without losing the archive headline after the League reset.
- The full League presentation must remain horizontally contained at 320/375/390/430px portrait and 844x390 landscape.
- Preserve all Build 12.39 squad-dynamics, Build 12.38 tactical-adaptation, Build 12.37 scouting, recruitment, onboarding and first-match regression gates.

## Build 12.39 squad dynamics

Build 12.39 adds a passive relationship layer to the established squad-management loop. Operators form persistent pair bonds through real shared-match evidence, with small positive-only coordination effects becoming available at clear milestones. The system is designed to produce squad stories and useful tactical texture without daily morale chores, relationship decay or hidden punishment.

### Build 12.39 architecture notes

- `js/34-squad-dynamics.js` owns saved relationship state, pair normalisation, once-per-match settlement, tier snapshots, strongest-active-pair selection, positive coordination effects, automatic mentorship and all squad/profile/debrief markup.
- `js/35-career.js` creates and normalises `careerState.squadDynamics`, applies the selected owned-bot coordination effect after existing tactical fields and includes the relationship report in the debrief.
- `js/36-team-management.js` renders squad/profile dynamics and settles bonds once after a completed owned-team match.
- `js/38-development.js` applies the mentor's +6% multiplier to training and match-development XP only.
- An operator may use only their strongest qualifying active partnership. Effects adjust established role execution, support, trade, grouping, flanking, movement, awareness and reaction fields; they do not alter health, damage, weapons, rewards, opponents or tactical authorities.
- Active-five atmosphere provides only a small positive uplift. Low atmosphere and developing pairs are neutral rather than punitive.
- Save schema remains 19 and diagnostics schema remains 1.

### Build 12.39 regression requirements

- Repeated shared-match settlement must grow bonds and expose tier progress without creating a bonus below the Familiar threshold.
- Re-running settlement for the same match must leave all pair scores and update metadata unchanged.
- A qualifying starter must receive at most one strongest-partnership effect, and every multiplier must remain at or above neutral.
- Normalise/save round-tripping must preserve pair scores, tier progress, mentorship and deduplication metadata.
- Mentorship must add exactly +6% to the learner's training and match-development XP path and nothing else.
- Squad, profile and debrief explanations must state the source and exact active benefit, while milestone output remains capped at three cards.
- The complete interface must remain contained at 320/375/390/430px portrait and 844x390 landscape widths.
- Preserve all Build 12.38 tactical-adaptation, Build 12.37 scouting-redaction, recruitment, onboarding, first-match and opening-week regression gates.

## Build 12.38 retained tactical adaptation

Build 12.38 extends the established between-round tactical intervention into a complete Scout → Prepare → Watch → Diagnose → Adjust → Review loop. The non-final round break now presents a round-execution card, a scouting-accuracy card and an opponent-response forecast alongside a coaching recommendation. The manager may retain the plan or alter at most two categories: approach, engagement range, team priority and the next-round engagement route. The opponent can also alter its existing tactical identity for the following round when visible evidence indicates successful long/close control, grouping, flanking or exploitable isolation.

### Build 12.38 architecture notes

- `js/39-opposition-intelligence.js` owns transient `opponentMatchAdaptationState`. `prepareOpponentMatchAdaptation()` derives a next-round response from completed-round telemetry and the confirmed owned plan; `oppositionIdentityForClub()` overlays that response before red bots are reset.
- `js/40-match-flow.js` owns diagnosis, the four intervention categories, the two-change rule, capture into `careerState.tactics.activeMatchPlan`, live notices and next-round result evaluation.
- `roundPlanId`, `roundPlanName` and `roundPlanZone` are match-plan runtime fields only. They reuse `engagementPlanOptions()` and `selectRoundEngagementPlan()` rather than creating another navigation system.
- `#betweenRoundTactics` is moved to `document.body` when opened because the portrait match view uses a transformed 16:9 window. The modal therefore fills the device and retains an internally scrollable card with sticky header/actions.
- `js/39-matchday.js` renders manager interventions with intended effect and observed result, plus a separate opponent-adaptation chronology. User-facing copy describes interpretation and counterpoint without printing the opponent's exact internal next plan.
- No tactical adjustment changes raw attributes. Effects emerge from the existing formation, approach, engagement, priority and engagement-plan behaviour.
- Opponent adaptation is not persisted across matches. Save schema remains 19 and diagnostics schema remains 1.

### Build 12.38 regression requirements

- A forced break must render three evidence cards, an opponent forecast and valid route choices.
- A route plus one other category may be staged; a third category must be rejected without corrupting the first two.
- Applying a route must make it the authoritative engagement plan for the next round.
- When the opponent forecast changes, red bots in the next round must receive the forecast formation/approach/engagement/priority through the existing identity application path.
- The applied manager adjustment must receive exactly one result using the following round's real telemetry, including when that round ends the match.
- The modal must stay within 320/375/390/430 portrait and 844x390 landscape widths and remain independently scrollable.
- Preserve Build 12.37 low-confidence scouting redaction, all career settlement rules and the renderer-independent/WebGL boundary.



## Build 12.36 guided calendar lock

Build 12.36 simplifies the persistent End Day control while the First Match Guide intentionally prevents time progression. A guided restriction now renders the existing header cell as a greyed space with a single centred padlock. The former visible **END DAY UNAVAILABLE** and **FOLLOW FIRST MATCH GUIDE** lines are removed from the narrow cell; the complete restriction reason remains in `aria-label` and `title`, and the main First Match Guide remains the visible explanation and route authority. Unlock timing still comes exclusively from `openingWeekTutorialDayRestriction()`. Normal End Day, matchday and management-blocker states are unchanged. Save schema remains 19 and diagnostics schema remains 1.

### Build 12.36 architecture notes

- `index.html` contains one decorative `.manager-end-day-lock-icon` inside the existing `#menuEndDayBtn`; no second End Day action is introduced.
- `js/50-ui-menus.js` keeps the full guided restriction in the button's accessible label and tooltip but clears the two visible text nodes while `.guided-lock` is active.
- `css/game.css` hides the normal End Day copy and blocker badge only for `.guided-lock`, then centres the padlock in a neutral grey full-cell treatment.
- `calendarHeaderForTest()` reports `guidedLock`, `lockIconVisible` and the visible text nodes for deterministic UI checks.

### Build 12.36 regression requirements

- Fresh recruitment, profile, first-signing, active-five, lineup, plan, debrief and training guide stages must show one centred padlock, no visible End Day wording and no blocker badge.
- The button must remain disabled and retain a complete accessible reason and routed tutorial destination.
- The match guide step must remove the padlock and restore the ordinary End Day label when a confirmed plan requires calendar advancement.
- Required-response blockers outside the tutorial must retain their existing red treatment, text and count badge.
- Preserve all Build 12.35 opening-week flow, 320/375/390/430 portrait and 844x390 landscape containment, save schema 19 and diagnostics schema 1.


## Build 12.35 opening week command

Build 12.35 replaces the post-guide Opening Week Handoff with a live Club Daily Agenda. It separates required blockers, recommended preparation and optional club work, adds a six-point fixture-preparation meter and provides **Advance to Next Event** using the established calendar simulation. Time progression stops for meaningful training, medical, scouting, transfer, blocker or fixture events and then shows a transient routed summary. End Day is unavailable during tutorial stages that should be completed without consuming calendar time, but remains available when the first-match step genuinely requires advancing to matchday. No management decision is auto-resolved, no tactical/training/equipment choice is made for the player and no save field is added. Preserve `js/55-opening-week.js`, `openingWeekTutorialDayRestriction()`, `openingWeekAdvanceToNextEvent()`, `openingWeekPreparationChecks()`, `openingWeekAgendaGroups()`, `openingWeekFlowForTest()`, save schema 19 and diagnostics schema 1.


## Build 12.34 recruitment decision support

Build 12.34 adds recruitment decision support without changing role weights, operator generation, transfer prices, wages, AI behaviour or match balance. Recruitment now opens with an Active Five Needs panel that translates contracted operators into six team functions, highlights missing or partial coverage and shows remaining transfer cash plus wage use. Every market candidate receives a contextual What This Operator Adds assessment, role-fit readout, affordability/medical cautions and optional beginner recommendations for immediate fit, affordability and development upside. Managers can compare up to three market or shortlisted candidates side by side; comparison selection and the latest signing summary are transient UI state and are not added to save schema 19. After a completed signing, the market shows which team function improved and the clearest remaining need. Preserve `RECRUITMENT_TEAM_FUNCTIONS`, `recruitmentCompositionReport()`, `recruitmentCandidateAssessment()`, `recruitmentRecommendationMap()`, `recruitmentComparisonPanelMarkup()`, `recruitmentRecordSigningUpdate()`, `recruitmentDecisionSupportForTest()`, the three-candidate limit, mobile containment, save schema 19 and diagnostics schema 1.

## Current package

This is the maintainable source for **Strikewatch Build 12.71: Compact Recruitment & Comparison Tray**.

Strikewatch is an asset-free browser management game built with HTML, CSS, JavaScript and custom WebGL renderers. The player founds a tactical organisation, recruits and finances a persistent squad, selects an active five-operator line-up and watches all operators fight autonomously during tactical elimination matches.

The modular source files share one application scope after `build.py` concatenates them into an IIFE. Do not convert an individual fragment into an isolated ES module unless the entire dependency structure is deliberately refactored.

## Documentation maintenance

Documentation is part of completing a feature. Whenever gameplay, content, UI, navigation, rendering, progression, debug tooling or build behaviour changes, update the relevant Markdown files in the same task by default.

- `PROJECT.md` must describe current architecture, dependencies, invariants and tests.
- `README.md` must describe current player-facing behaviour and filenames.
- `AGENTS.md` and `00-READ-FIRST-GPT.md` must carry any workflow or preservation rule future coding agents need.
- `GPT-HANDOFF-PROMPT.txt` must be refreshed when the reusable project summary changes.

Do not knowingly package a playable release with stale project documentation.





## Build 12.35 architecture notes

- `js/55-opening-week.js` loads after `js/50-ui-menus.js` and before renderer/runtime modules. It wraps the established `advanceCareerDay()`, `clubCanEndDay()`, `renderFoundationPath()` and delegated management-click handler rather than duplicating calendar settlement.
- `openingWeekTutorialDayRestriction()` derives its lock from `firstMatchGuidance()`. It must block unnecessary time consumption during recruitment, squad review, plan setup, debrief and training, but must return no restriction during the match step when a confirmed plan exists and the fixture is still in the future.
- `openingWeekAdvanceToNextEvent()` advances through the normal day function for at most 21 days. It stops at an existing blocker, fixture arrival, medical clearance, scouting/transfer change, opposition-report threshold, training milestone or stat improvement. It never resolves a blocker, chooses a response, confirms a plan, changes a programme or skips a due fixture.
- `openingWeekAdvanceSummaryState` and batch-control state are module-level transient UI values. They are not written to `careerState`, exports or save schema 19.
- `renderFoundationPath()` remains empty while the First Match Guide is active. Once the guide ends, Build 12.35 renders the Club Daily Agenda, three priority columns, routed day summary and six-point Fixture Preparation meter in its place.
- `js/50-ui-menus.js` integrates the tutorial restriction into the persistent End Day control and retains the full reason in accessible labels. The first-match plan step is historically complete after the first career match so later plan invalidation cannot regress the guide.
- `css/game.css` owns the agenda, preparation meter, summary and guided-lock layouts. Phone portrait and short landscape must remain free of document-level horizontal overflow.
- `js/70-runtime.js` exposes `openingWeekFlowForTest()`, `seedFirstMatchCalendarForTest()` and `seedOpeningWeekForTest()` for deterministic release checks.

### Build 12.35 regression requirements

- Fresh recruitment/profile/first-signing/active-five/lineup/plan/debrief/training guide stages must disable End Day and explain that the First Match Guide should be followed.
- The match guide step must enable End Day when the plan is confirmed and calendar advancement is genuinely required before the fixture.
- The post-guide Command Centre must show all three agenda groups, six preparation checks and either Advance to Next Event or a clear blocker state.
- Advance to Next Event must use ordinary calendar settlement, stop on the first meaningful event or blocker and never advance more than 21 days.
- Both one-day and multi-day progression must produce a dismissible, routed summary without persisting summary state.
- Preserve onboarding, recruitment decision support, progressive access, first-match payoff, purchases, state integrity, deterministic output and archive rebuild parity at 320/375/390/430 portrait and 844x390 landscape.

## Build 12.34 architecture notes

- `js/39-recruitment-commercial.js` owns `RECRUITMENT_TEAM_FUNCTIONS`, function-coverage scoring, candidate impact summaries, optional recommendation badges, transient comparison selection and post-signing recruitment feedback.
- `recruitmentCompositionReport()` evaluates six team functions from primary/secondary roles and existing operator attributes. It describes coverage only and does not enforce a role quota or modify tactical behaviour.
- `recruitmentCandidateAssessment()` and `recruitmentRecommendationMap()` explain how each available candidate changes the current Active Five. Recommendation badges are explanatory and never sign, shortlist, sort or filter automatically.
- `recruitmentComparisonIds` and `recruitmentLastSigningUpdate` are module-level transient UI state. They must never be written into `careerState.recruitment` or any saved payload.
- Market and Shortlist views may compare at most three current candidates. `recruitmentComparisonPanelMarkup()` uses the existing scouting-knowledge estimate model for ability, potential, role attributes, medical risk, fee, wage and cash-after-signing while also displaying role purpose and Active Five impact.
- `css/game.css` owns the needs, impact, recommendation, comparison and signing-update layouts. Preserve single-column phone containment and the compact landscape rules.
- `js/70-runtime.js` exposes `recruitmentDecisionSupportForTest()` as the deterministic release gate.

### Build 12.34 regression requirements

- Require six functional-coverage cards and show contracted places, available cash and wage use.
- Require every market candidate to include **What This Operator Adds**, role fit and relevant medical/affordability context.
- Require all three optional recommendation labels when suitable candidates exist.
- Comparison must cap at three candidates and remain available from Market and Shortlist.
- A completed signing must show newly improved functions and the clearest remaining need without changing recruitment persistence.
- Verify no document, content, needs-panel, comparison-panel or comparison-card horizontal overflow at 320×720, 375×812, 390×844, 430×932 and 844×390.
- Preserve role-guide clarity, guided candidate scrolling, first-match payoff, progressive access, state integrity, deterministic output and archive rebuild parity.

## Build 12.33 architecture notes

- `js/36-team-management.js` owns `TEAM_ROLE_BEGINNER_GUIDE`, the shared role-card/glyph markup, the recruitment role reference and the focused candidate-profile role explanation. The guide describes existing role behaviour only; `TEAM_ROLES` IDs, weights and combat application remain unchanged.
- Base and enhanced Recruitment renderers wrap the role guide, table and market rows in `.recruitment-candidate-zone[data-guide-target="recruitment-candidates"]`. Guided recruitment scrolling therefore lands on the explanation and then the candidates while preserving the established management-pane-only scroll contract.
- The role guide opens automatically while `firstMatchGuidance()` is on recruitment, profile, first-signing or active-five. After onboarding it remains a collapsed reusable reference.
- `css/game.css` owns the responsive role grid, focused profile explanation and role accents for Marksman, Shot Caller and Flex. Seven role cards collapse from an auto-fit desktop grid to two columns and then one column at 390px.
- `js/70-runtime.js` exposes `recruitmentRoleGuideForTest()` and extends the first-match-guidance destination check.

### Build 12.33 regression requirements

- Require all seven role IDs in the role guide and plain-language Flanker copy that mentions an alternate route and side/rear angle.
- Every role card must show **Look For** attributes and a **Watch For** trade-off; the beginner first-five example must be visible.
- During the opening recruitment guide, the role reference must be open and inside the `recruitment-candidates` scroll destination.
- Candidate profile role context must render at least the primary role and, when distinct, the secondary role.
- Verify no document, candidate-zone, role-guide or card horizontal overflow at 320×720, 375×812, 390×844, 430×932 and 844×390.
- Preserve Build 12.32 payoff, Build 12.31 orientation, progressive access, state integrity, deterministic build and archive checks.

## Build 12.32 architecture notes

### Deployment and match introduction

- `js/50-ui-menus.js` extends the existing deployment renderer rather than creating a parallel match setup. `deploymentRosterMarkup()` uses the shared operator visual, and `.deployment-matchup-brief` combines the active opponent briefing, dynamic strength/expectation snapshot, supporter expectation, selected arena and first-to-three rules. Existing range, Foundation Parity and tactical-preview warnings remain authoritative.
- `careerMatchIntroState`, `showCareerMatchIntro()` and `dismissCareerMatchIntro()` own the post-matchmaking reveal. The retained intro node is reparented to `document.body` so portrait windowed mode cannot constrain it to the small spectator viewport. Both rosters come from `matchmakingRosterSource()`, and the plan comes from `clubActiveMatchPlan()`.
- `js/70-runtime.js` includes `careerMatchIntroActive()` in the production simulation gate. The match is created and rendered behind the reveal, but fixed updates do not progress until the player selects **Begin Match**.

### Live match spectacle and cause/effect

- `js/40-match-flow.js` owns one bounded `careerMatchMomentState` queue. It presents legitimate alive-count states (last operator, final duel and close-out), match point, applied between-round changes and three first-match coaching explanations derived from the viewed operator's assigned role, active weapon range and confirmed plan.
- The queue is non-interactive and read-only. It never supplies targets, destinations, hidden enemy information, stat modifiers or result logic. The established round-result and final match overlays remain the score/settlement authorities.

### First-match outcome sequence

- `completeCareerMatch()` marks the zero-to-one transition with `firstCareerMatch`, settles finance/XP/Gold Coins/operator development and league/supporter systems exactly once, then captures the resulting MATCH supporter reaction for presentation. Save schema remains 19 because the flag and reaction live in the ordinary latest-round summary.
- `careerFirstMatchOutcomeMarkup()` reveals five stages: result, banked rewards, active-five operator impact, supporter reaction and unlocked systems/next manager action. `continueCareerRoundReport()` advances the reveal, then opens the existing detailed report and ordinary reward flow. Direct coaching actions use the established route/player/target metadata and mark the displayed latest report reviewed before the queued route is applied, so the intended Training unlock cannot be blocked by its own recommendation.
- `css/game.css` keeps the team reveal full-device, the roster/report content internally scrollable and both decisive footer action rows sticky. `firstMatchPayoffForTest()` plus targeted intro/outcome debug helpers cover the new contract.

### Build 12.32 regression requirements

- Require `firstMatchPayoffForTest().ok === true`, five deployment portraits, four matchup facts, two five-operator intro rosters, confirmed-plan content, a rendered contextual moment and all five outcome stages with a direct final coaching action.
- Verify the production path reaches the full-device intro after matchmaking, hides matchmaking, and keeps the intro action visible.
- Verify no document, deployment, intro-card, report-card or report-content horizontal overflow at 320×720, 375×812, 390×844, 430×932 and 844×390; intro/report actions must remain inside their visible card at each size.
- Preserve `newPlayerOrientationForTest()`, `firstMatchGuidanceForTest()`, `guidanceConsolidationForTest()`, `progressiveInterfaceForTest()`, `cashWeaponStoreForTest()`, `cashWeaponPurchaseFeedbackForTest()`, `stateIntegrityForTest()`, syntax, deterministic build parity and archive integrity. Headless WebGL capability warnings may be reported but must not hide unrelated errors.

## Build 12.31 architecture notes

- `NEW_PLAYER_DEMO_STEPS` in `js/40-match-flow.js` now keeps all four coach stages paused. `advanceNewPlayerDemo()` remains the only release authority: the fourth **Watch the Round** action clears the pause and hides the coach before the real round proceeds.
- `css/game.css` applies one portrait placement contract to every demo stage: top-centred over the match viewport with the established safe-area offset. The coach card receives a bounded `max-height` and internal vertical scrolling so 320px-wide and short portrait screens retain full controls without moving the card below the visible match.
- `newPlayerOrientationForTest()` now verifies that every coach step is paused and that the final action explicitly starts the round. No career, combat, AI, navigation, reward or persistence value changes.

### Build 12.31 regression requirements

- In a real or synthetic portrait demo at 320×720, 375×812, 390×844 and 430×932, require stages 1–4 to overlap the visible match viewport and remain fully reachable without document overflow.
- Advancing through stages 1–4 must leave `newPlayerDemoState.paused === true`; the final Watch the Round action must hide the coach and set `paused === false`.
- Require `newPlayerOrientationForTest().ok === true`, source/bundle/standalone syntax checks, deterministic build parity and archive integrity.
- Preserve Build 12.30 guidance consolidation, Build 12.29 candidate scrolling, progressive interface locks, non-career demo settlement and unrelated state/store regressions.

## Build 12.30 architecture notes

- `firstMatchGuidance()` in `js/50-ui-menus.js` remains the authoritative nine-step opening journey. `renderFoundationPath()` now exits while that guide is active, preventing two progress trackers from competing. After completion Build 12.35 replaces the retired handoff with the live **Club Daily Agenda**.
- `renderTeamTutorialPanel()` in `js/36-team-management.js` preserves the existing six-stage flags but renders stage-specific explanation inside a closed `details.team-tutorial-optional` element during the guide. The disclosure contains no route action; the priority strip owns navigation. Detailed loan and shortcut information remains available only when the user opens the disclosure.
- `renderMenuContextTutorial()` delays one-time route explainers until the First Match Guide is complete. `renderCommandFeatureDirectory()` suppresses its separate recommended-route list during the journey.
- `renderTeamOperationsDashboard()` applies `guided-journey` to the Command Centre hero and removes its duplicate **Next Manager Action** aside while the guide is active.
- `css/game.css` owns the compact optional-disclosure presentation, accessible 50px summary target, expanded body and single-column guided Command Centre hero.
- `guidanceConsolidationForTest()` verifies the guide remains authoritative, Foundation Plan is hidden, induction is optional and non-navigational, section tutorials/recommendations are delayed, and the handoff returns after completion. No persistence or gameplay field changes.

### Build 12.30 regression requirements

- Require `guidanceConsolidationForTest().ok === true`, `firstMatchGuidanceForTest().ok === true`, `progressiveInterfaceForTest().ok === true`, `newPlayerOrientationForTest().ok === true`, `onboardingClarityForTest().ok === true` and `stateIntegrityForTest().ok === true`.
- In a real new club after skipping the demo, require exactly one First Match Guide strip, no Foundation Plan, one closed Optional Context disclosure, no one-time section tutorial and no competing Command Index recommendation.
- Expanding Optional Context must expose readable supporting detail without adding a `data-team-route` action or moving focus.
- Confirm no document or management-content horizontal overflow at 320×720, 375×812, 390×844, 430×932 and 844×390.
- Run source, bundle and standalone syntax checks, deterministic build parity and archive integrity. Preserve Build 12.29 guided recruitment scrolling and all retained systems.

## Build 12.29 architecture notes

- `firstMatchGuidance()` in `js/50-ui-menus.js` adds `scrollTarget: 'recruitment-candidates'` to the first-signing and active-five recruitment stages.
- `renderMenuPriorityStrip()` emits `data-team-scroll-target`; the base renderer in `js/36-team-management.js` and authoritative enhanced Recruitment renderer in `js/39-recruitment-commercial.js` expose the candidate list through `data-guide-target="recruitment-candidates"`.
- `handleTeamManagementClick()` first restores the enhanced Recruitment subview to `market`, then completes the ordinary route change before calling `scrollMenuGuideTargetIntoView()`. The helper uses the existing `scrollCommandContentTargetIntoView()` authority, so only `.menu-content` scrolls and document/shell/layout origin remains fixed.
- The arrival cue is presentation-only, expires after 1.6 seconds and honours reduced-motion preferences. No focus, tutorial completion, market state or persistence value changes.

### Build 12.29 regression requirements

- In a synthetic first-signing state, `firstMatchGuidanceForTest()` must confirm the guide target, priority-strip data attribute and candidate-list anchor.
- Clicking the real guide action from another route must open Recruitment and increase the management content scroll position until the candidate list is visible.
- Repeat the click while already on Recruitment and require the same candidate-list destination without document-level movement.
- Preserve all Build 12.28 orientation, Build 12.27 progressive access, responsive containment, state integrity, syntax, deterministic build and archive checks.

## Build 12.28 architecture notes

### Concept briefing and eligibility

`js/40-match-flow.js` owns the new-player orientation flags, eligibility and guided-demo state. The concept briefing is eligible only for a newly created club with zero completed matches, zero contracted operators and no prior completion/skip flag. It uses the existing `careerState.tutorial.contextSeen` object (`new-player-concept`, `new-player-demo-complete`, `new-player-demo-skipped`) and adds no schema field. Team creation advertises the orientation before submission, then opens the briefing at the start of the manager journey.

### One-round guided simulation

The demo starts a real Citadel Depot simulation with the normal AI, navigation, perception, weapon and round systems. `createMatch()` temporarily uses a one-round target while `newPlayerDemoState.active`; `finishRound()` exits through the orientation path before career statistics, rewards, finances, condition, league settlement or after-action persistence can run. The training opponent identity and `GUIDED ORIENTATION ROUND` competition presentation live in `js/37-league.js`. No combat modifier or scripted winner is introduced.

Four coach steps explain the manager/operator distinction, five-versus-five no-respawn objective, normal first-to-three format, effect of roles/loadouts/tactics and the live intention/spectator controls. Build 12.31 supersedes the original pause transition: all four cards now hold the simulation, and the fourth Watch the Round action hides the coach before live play begins. Menu, speed, automatic spectating and hide-UI controls are disabled during the orientation, while manual living-operator spectator switching remains available once the coach closes.

### Completion and presentation

`index.html` owns the accessible concept and in-match coach overlays. `css/game.css` owns portrait/landscape containment. `js/50-ui-menus.js` supplies demo-specific round objective/plan text and blocks the ordinary pause menu; `js/70-runtime.js` updates the orientation, binds controls, opens the first briefing and exposes deterministic test helpers. Completion or skip restores the selected arena, clears transient demo state and routes to Recruitment through the normal menu router.

### Build 12.28 regression requirements

- Require `newPlayerOrientationForTest().ok === true` in modular and standalone builds.
- Exercise real team creation, automatic concept briefing, all guided stages, forced round completion and return to Recruitment.
- Confirm orientation completion changes none of `totalRounds`, `totalMatches`, `totalWins` or `matchWins`.
- Confirm concept and coach cards remain inside the viewport with zero document overflow at 320×720, 375×812, 390×844, 430×932 and 844×390.
- Preserve `onboardingClarityForTest()`, `typographyConsistencyForTest()`, `firstMatchGuidanceForTest()`, `progressiveInterfaceForTest()`, `liveMatchClarityForTest()`, cash-store tests, state integrity, save schema 19 and diagnostics schema 1.


## Build 12.27 architecture notes

### Derived opening access

`js/50-ui-menus.js` owns `firstMatchInterfaceFacts()`, `progressiveRouteAccess()` and `progressiveSectionAccess()`. The access matrix reads the existing nine-step guide, squad count, confirmed plan, completed-match count, report-review state and operator training focus. It adds no persistent field and applies only while the guide is active and fewer than two matches have been completed.

Overview routes remain accessible so greyed primary sections can be inspected. `setMenuRoute()` guards ordinary direct and routed navigation, while menu-history traversal skips or rejects locked entries. The sub-navigation, Command Index and section directories display the same reason and milestone, while notifications from inaccessible pages are excluded from primary badge totals.

### Unlock sequence

- Opening: Command Centre, Recruitment, Inbox, section overviews and Configuration.
- Five contracted operators: Squad / Active Five Operators, Tactics and Team Armoury.
- Confirmed match plan: League and Calendar.
- First completed match: Team Telemetry, After Action and Supply Depot.
- Reviewed first debrief: Training.
- One training focus: Transfers, Staff, Finances, Gold Coins, Commercial and Fans; the progressive layer retires.

### Presentation and accessibility

`css/game.css` owns grey locked/partial primary tabs, locked sub-tabs, compact access badges and the overview unlock panel. Locked controls remain visibly present and carry accessible labels, titles and `aria-disabled` state where appropriate. Fixed viewport behaviour, typography floors and all existing touch targets remain unchanged.

### Build 12.27 regression requirements

- Require `progressiveInterfaceForTest().ok === true` across all six progression phases.
- Verify a locked primary section opens its overview preview, while a locked sub-route leaves the current route unchanged.
- Verify established careers with two or more completed matches are not progressively re-locked.
- Confirm no document or management-content horizontal overflow at 320/375/390/430 portrait and 844x390 landscape.
- Preserve onboarding, typography, first-match guidance, cash-store purchase feedback, state integrity, deterministic building, save schema 19 and diagnostics schema 1.

## Build 12.26 architecture notes

### First-match guidance

`js/50-ui-menus.js` owns `firstMatchGuidance()`. It derives a nine-step opening journey from established state: recruitment viewed, profile viewed, first signing, five contracted operators, squad review, confirmed plan, first match, reviewed debrief and training focus. The persistent management priority strip renders the next incomplete step and visually emphasises its primary section and sub-route. It does not add persistent state. Build 12.27 now uses that derived journey to lock unrelated opening routes visibly and temporarily.

### Active operator terminology and graphics

Opening-workflow user copy uses **active five operators** / **active operator line-up**. `js/36-team-management.js` owns the generated CSS operator bust markup on player cards; `js/50-ui-menus.js` owns deployment role glyph markup. `css/game.css` owns presentation. No external image or font dependency is introduced.

### Live clarity

`js/50-ui-menus.js` owns `spectatorIntentLabel()`, `liveMatchObjectiveText()` and `liveMatchPlanText()`. They read existing bot and match state to describe what the viewed autonomous operator is doing and what the current round requires. `js/40-match-flow.js` adds a first-round system-feed explanation. These features are presentation-only and may not alter AI decisions.

### First debrief guide

`js/35-career.js` inserts the first-match reading guide above the existing report grid. `js/39-matchday.js` retains the authoritative causal analysis and linked coaching actions. The guide disappears after the opening report.

### Build 12.26 regression requirements

- Verify the Next Objective sequence and route emphasis without a second saved checklist.
- Verify active-five terminology appears in recruitment, squad and deployment views.
- Verify the live objective, plan and operator intention update from current state and do not mutate bots.
- Verify the first-report reading guide appears on the opening report only.
- Run 320/375/390/430 portrait and 844×390 management/match containment, all source and standalone syntax checks, deterministic rebuild parity, onboarding clarity, typography consistency, purchase feedback and state integrity.

## Build 12.25 architecture notes

- `index.html` owns the fixed viewport contract: `width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover`. No JavaScript touch/gesture suppression is required.
- `css/game.css` owns a scoped management-interface typography layer. It raises representative 5–8px labels and body text while preserving the compact navigation rails and existing layout structure. The rules cover portrait phone widths and landscape phone widths up to 900px; 320–350px retains slightly reduced navigation values only where necessary for fit.
- `js/50-ui-menus.js` renders a compact date in the visible topbar while preserving the full date through existing accessible label/title text.
- `js/70-runtime.js` updates `onboardingClarityForTest()` to require the fixed viewport and adds `typographyConsistencyForTest()` for representative main-nav, subnav, date, priority and tutorial floors.
- This release changes management presentation only. Match HUD, WebGL renderers, simulation, AI, map geometry, weapon models, economy, save schema 19 and diagnostics schema 1 are unchanged.

### Build 12.25 regression requirements

- Require `typographyConsistencyForTest().ok === true` and `onboardingClarityForTest().ok === true`.
- Verify the viewport includes both `maximum-scale=1` and `user-scalable=no`.
- Confirm random-name interaction, editable generated text and real team creation remain operational.
- Confirm no document or `.menu-content` horizontal overflow at 320×720, 375×812, 390×844, 430×932 and 844×390.
- Keep the topbar visible and primary/subnavigation readable at each tested size.
- Preserve `cashWeaponStoreForTest()`, `cashWeaponPurchaseFeedbackForTest()`, `stateIntegrityForTest()` and all retained onboarding, store, weapon, armour, AI, map and build gates.

## Build 12.24 architecture notes

- `js/35-career.js` owns the fictional team-name word lists, `careerRandomTeamName()`, `applyRandomCareerTeamName()` and the expanded creation-screen explanation. Generated names pass through `normaliseCareerName()`, remain editable and do not persist until `createCareerOperator()` runs.
- The creation screen uses inline SVG and CSS-only cards for the Pro League objective and the recruit/prepare/watch/improve loop. No external image, font or network dependency was added.
- `js/36-team-management.js` retains the existing six tutorial stages and progression flags. Stage one now provides the high-level game model, autonomous-combat rule, match format, promotion path and loan explanation; later stages explain the purpose of each management action.
- `css/game.css` owns the first-run readability pass: larger copy, 44px-or-larger name controls and tutorial buttons, visible `:focus-visible` treatment and responsive one-column layouts on narrow screens.
- Build 12.24 originally allowed browser zoom. Build 12.25 deliberately supersedes that setting with the fixed-view contract while retaining all onboarding behaviour.
- `js/70-runtime.js` exposes deterministic `randomTeamNameForTest()` and DOM-based `onboardingClarityForTest()` gates.

### Build 12.24 regression requirements

- Generate at least twelve deterministic names; every result must be normalised, 2–24 characters long and the sample must contain more than one unique result.
- The creation screen must include the random-name control, four visual loop cards, autonomous-operator explanation and Pro League objective.
- At a 390px test host, the team-name input and random button must each be at least 44px high and the input must compute to at least 16px. Current viewport behaviour follows Build 12.25.
- Confirm no horizontal document overflow at 320, 375, 390, 402 and 430px portrait or 844x390 landscape.
- Preserve tutorial-stage progression, save schema 19, diagnostics schema 1, Build 12.23 purchase feedback and all retained state-integrity, weapon, armour, AI, map and build checks.

## Build 12.23 architecture notes

- `js/38-development.js` owns a transient Supply Depot purchase receipt. It is not part of `careerState` and must never be persisted.
- Successful weapon/armour purchases call `setCashStorePurchaseFeedback()`, re-render through `refreshSupplyDepotPurchaseUi()` and preserve the current store scroll offset.
- Store cards expose `data-store-owned-count` plus a live `data-store-purchase-feedback` region. The newly rendered button is temporarily disabled, then changes to an explicit `BUY ANOTHER` action.
- The 0.9-second UI lock prevents queued/double taps from applying a second transaction. `purchaseCareerCashWeapon()` and `purchaseCareerCashArmour()` remain the single transaction authorities.
- `cashWeaponPurchaseFeedbackForTest()` exercises the real delegated click path, verifies one exact deduction, one added copy, immediate DOM refresh, visible receipt and blocked repeat click.

### Build 12.23 regression requirements

- One AR-4 click deducts exactly 58,000 CR, adds exactly one copy and refreshes `OWNED COPIES` from 0 to 1.
- The immediate replacement button reads `PURCHASED · OWNED 1`, is disabled, and a forced second click changes neither credits nor inventory.
- After the lock, the action becomes `BUY ANOTHER`; a deliberate later click may purchase a second finite copy.
- Store scroll position, 320–430px portrait containment, shared 3D renders, save integrity and all retained weapon/armour/AI/map regressions remain green.

## Build 12.22 architecture notes

- `js/38-development.js` owns the direct cash weapon catalogue. It now exposes AR-4 Sentinel (58,000 CR, primary) and Viper-9 Compact (32,000 CR, sidearm), with the AR-4 listed first for narrow-screen discoverability.
- `cashStoreWeaponVisualMarkup()` wraps the authoritative `careerWeapon3dMarkup()` output in a store-specific stage. The store consumes `careerWeaponVisualParts()` indirectly and contains no renderer-specific dimensions or part definitions.
- `css/game.css` owns only the store stage, perspective and context scale. Pistol and AR-4 cards remain inside their card bounds from 320px portrait through 844x390 landscape.
- `purchaseCareerCashWeapon()` creates one finite inventory entry, deducts the offer price, normalises assignments, records a `WEAPON` finance transaction and persists state. Crate odds and weapon combat values are unchanged.
- `cashWeaponStoreForTest()` verifies required offers, direct purchase controls and shared 3D model markup/part coverage.

### Build 12.22 regression requirements

- Require `cashWeaponStoreForTest().ok === true`, with AR-4 57-part and Viper-9 21-part shared models present in store markup.
- Purchase both offers through `purchaseCashWeaponForTest()` and verify exact cash deductions and +1 owned copies.
- Confirm no document/card/preview horizontal overflow at 320/375/390/430 portrait and 844x390 landscape.
- Retain AR model, weapon slots/balance/switching, state integrity, armour, operator attachment, reload cover, hit flinch, Dune audit and runtime-fault checks.

## Build 12.21 architecture notes

- `js/30-bot-ai.js` owns both additions. `hasUsableAlternateWeapon()` distinguishes a genuinely loaded alternate from an empty/missing/identical slot; `reloadNeedsCover()` and `registerReloadCoverIntent()` feed the existing `findCombatCover()`, `assignCombatCover()`, `updateCoverCombat()` and fallback paths instead of adding a second cover planner.
- Reload-cover intent is raised only during a live reload with no usable alternate and known exposure/recent incoming fire. The reload continues while moving. `finishReload()` keeps an unreached cover commitment active rather than converting it into a stationary hold.
- `applyCombatFlinch()` is the single gameplay-flinch authority. Regular `hitReaction*` fields remain cosmetic and occur for all hits. Flinch is non-fatal, chance-based, armour/resilience-aware, capped, brief and protected by a repeat cooldown. It clears the current burst, applies a temporary aim offset and a small movement scale, but never cancels reload/switch state.
- `js/62-character-renderer.js` and `js/63-viewmodel-renderer.js` consume flinch state only for a restrained weapon twitch. They do not decide gameplay outcomes.
- `js/31-match-diagnostics.js` adds optional counter deltas for reload-cover and flinch activity while retaining diagnostics schema 1. No persistent save fields were added; career schema remains 19.

### Build 12.21 regression requirements

- `reloadCoverBehaviourForTest().ok === true`: an exposed reload with no loaded alternate raises cover intent and moves closer to cover/fallback, while a distinct loaded alternate avoids the forced rule.
- `hitReactionFlinchForTest().ok === true`: a light protected hit may avoid flinch, a strong deterministic hit triggers within bounded chance/duration, repeat impact is blocked by cooldown, and firing is briefly interrupted.
- At least one complete live simulation must produce no page exceptions or runtime faults and retain normal weapon switching, armour resolution, navigation and round progression.
- Preserve `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()`, `weaponSwitchingForTest()`, `stateIntegrityForTest()`, `armourSystemForTest()`, `armourMatchAttritionForTest()`, `operatorWeaponAttachmentForTest()`, `operatorPresentationForTest()`, `teamSpacingForTest()` and `duneBastionAuditForTest()`.

## Build 12.20 architecture notes

- `js/35-career.js` remains the sole AR-4 geometry/anchor authority. Build 12.20 does not edit the model part list.
- `OPERATOR_LONG_GUN_POSE` in `js/62-character-renderer.js` provides third-person contextual placement for the complete shared rifle: dominant-side lateral offset, ready-height lift and shoulder pullback.
- `operatorSharedWeaponRig()` applies those placement values before resolving the existing `pistol-grip`, `support-grip`, butt-pad and muzzle points. The weapon and both hands therefore move as one coherent rig.
- `operatorWeaponAttachmentAudit()` now includes `stockSeat` and `stockSeatGap`; rifle samples fail when the butt pad is more than 0.075m from the shoulder-pocket target. Existing hand, muzzle and far-LOD thresholds remain unchanged.
- `operatorHeldPoseForTest()` configures a frozen three-quarter live match view with an AR-4-equipped target for real WebGL screenshots.
- Build 12.20 changes third-person presentation only. First-person rendering, shared geometry, reload logic, combat values, inventory, AI, armour, save schema 19 and diagnostics schema 1 remain unchanged.

### Build 12.20 regression requirements

- Run `operatorWeaponAttachmentForTest()` and require AR-4 `stockSeatGap <= 0.075`.
- Run `operatorHeldPoseForTest()` in a WebGL-capable browser and visually confirm shoulder contact, firing-hand grip and support-hand reach.
- Retain `ar4WeaponModelForTest()`, loadout/slot/switching, armour, team-spacing, map, runtime-fault, deterministic-build and extracted-ZIP checks.

## Build 12.19 architecture notes

- `careerWeaponVisualParts()` remains the only AR-4 geometry authority. Build 12.19 removes the five `optic-*` pieces and replaces them with low-profile front/rear iron-sight assemblies.
- The refined model retains shape metadata consumed by CSS 3D, first-person WebGL and operator-held WebGL. No renderer-specific AR-4 copy is permitted.
- `careerAr4ModelAudit()` now verifies finite geometry, connected length/depth, minimum rounded/cylindrical coverage, required iron-sight parts, a bounded top profile and complete absence of legacy optic parts.
- Build 12.19 changes presentation only. Grip/support anchors, reload movement, model-derived muzzle placement, damage, range, recoil, inventory, AI switching, armour, economy, save schema 19 and diagnostics schema 1 remain unchanged.

### Build 12.19 regression requirements

- Run `ar4WeaponModelForTest()`, `operatorWeaponAttachmentForTest()`, `operatorWeaponLoadoutMappingForTest()`, `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()`, `weaponSwitchingForTest()` and `stateIntegrityForTest()`.
- Confirm the live Armoury AR-4 contains no `optic-*` DOM parts, includes both iron-sight assemblies and remains horizontally contained at 320/375/390/430 portrait widths.
- Run syntax, deterministic build, extracted standalone and ZIP-integrity checks.

## Build 12.18 architecture notes

- `js/35-career.js` extends the shared weapon-part schema with `shape`. Existing pistol parts default to `box`; the AR-4 uses `rounded` for broad manufactured surfaces and `cylinder-length` for longitudinal tubes. `careerWeaponVisualParts()` remains authoritative for placement and dimensions.
- `careerWeaponPartMarkup()` dispatches management previews to cuboid or CSS-cylinder markup. The CSS cylinder uses ten radial side faces and two end caps, preserving interactive rotation without an external asset.
- `js/62-character-renderer.js` and `js/63-viewmodel-renderer.js` map the same metadata to `glMeshes.cube`, `glMeshes.roundedBox` or `glMeshes.cylinder`. Cylinder orientation is adjusted because shared weapon length maps to local WebGL Z. Third-person far LOD deliberately downgrades procedural shapes to cubes while preserving essential parts.
- AR-4 dimensions, grip/support anchors, visual bounds, magazine identity and reload movement remain shared. No renderer owns a second rifle definition.
- `careerAr4ModelAudit()` verifies finite geometry, meaningful depth/length, required connected parts and minimum rounded/cylindrical coverage. `window.__strikeDebug.ar4WeaponModelForTest()` exposes it.
- Build 12.18 does not alter damage, cadence, range, recoil, inventory, economy, AI selection, primary/sidearm switching or save schema 19.

### Build 12.18 regression requirements

- `ar4WeaponModelForTest().ok === true`, with at least 12 rounded parts, six cylindrical parts and all required stock/receiver/handguard/barrel/grip/magazine/optic pieces.
- `operatorWeaponAttachmentForTest().ok === true` and `operatorWeaponLoadoutMappingForTest().ok === true`; dominant/support anchors and muzzle gap remain within existing tolerances.
- CSS inspector markup contains cylinder side faces/caps for the AR-4 and no cylinder markup for unchanged pistol parts.
- First-person and third-person renderer source consumes `part.shape` and retains full-detail procedural meshes plus cheap far-LOD fallback.
- Run modular/bundle/standalone syntax checks, deterministic build parity, state integrity, weapon-slot/switching tests, armour attrition tests, one unrelated AI/map regression, responsive Loadout checks and ZIP integrity.

## Build 12.17 architecture notes

- Career save schema is 19. Player records persist `equippedPrimaryWeaponId` and `equippedSidearmId`; `equippedWeaponId` remains a compatibility active-weapon field. Schema-18 pistol loadouts migrate to sidearm-only, while schema-18 rifle loadouts retain the rifle and gain the starter sidearm.
- `js/35-career.js` owns slot classification, migration, finite-copy assignment across both slots, weapon trade-off metadata and combat build application. `careerPlayerPrimaryWeaponId()`, `careerPlayerSidearmId()` and `careerPlayerActiveWeaponId()` are the canonical readers.
- `js/30-bot-ai.js` owns independent primary/sidearm magazines, timed switching, active handling refresh and situational draw/return decisions. Switches record `weapon_switched`; `js/31-match-diagnostics.js` aggregates `weaponSwitches` and `sidearmDraws`.
- The AR-4's balance is physical/operational: 5.5% carried movement cost, slower turning, moving accuracy and sprint settle, 2.2 fatigue load, longer reload and larger sound radius. Sidearms keep zero movement cost and faster draw/handling.
- `js/38-development.js` and the Armoury route expose slot, effective range, damage, magazine, penetration, movement cost, benefits and limitations. `js/50-ui-menus.js` displays live armour integrity beside HP and labels whether the viewed active weapon is PRIMARY or SIDEARM.
- Match tracking in `js/36-team-management.js` retains primary/sidearm IDs, weapon switches and sidearm draws so debriefs can explain actual use.

### Build 12.17 regression requirements

- Schema-19 migration and finite-copy integrity across both slots.
- Explicit pistol-versus-AR trade-off test and close-contact draw/range-return switching test.
- Mixed five-operator primary/sidearm mapping through combat, reload and death states.
- Spectator armour HUD at full, partial and no-armour states, including portrait telemetry.
- Live Dune combat with eliminations, matching death events, a validated switching scenario and no runtime faults.
- Dune 160/160 navigation and all retained Office geometry/navigation audits.
- 320/375/402/430 portrait and 844×390 landscape with no document-level horizontal overflow.
- Deterministic build, standalone syntax, ZIP integrity and extracted-source rebuild parity.

## Build 12.16 architecture notes

- `Bot.reset()` captures armour ID, integrity, broken state and cumulative absorption before a round reset, then restores surviving integrity after the ordinary career/simulated profile is reapplied. This keeps combat attributes rebuilt cleanly while making integrity match-long.
- `captureMatchArmourState()` and `restoreMatchArmourState()` own the carry contract. A different or removed equipped ID is never restored, which prevents broken owned copies from returning.
- Simulated opposition consults the transient `matchArmourCarry`; a previously broken rig resolves to `none` for subsequent rounds. New matches create new bots, which services surviving equipment back to full by design.
- Save schema remains 18 because in-progress match integrity is runtime state rather than persistent career inventory condition. Diagnostics schema remains 1.

### Build 12.16 regression requirements

- `armourSystemForTest().ok === true` and reports both `persistedBetweenRounds` and `restoredBetweenMatches`.
- `armourMatchAttritionForTest().ok === true`: owned partial integrity enters round two unchanged, a newly created match restores the surviving rig, and destroyed opposition armour remains `none` in the next round.
- User-facing Armoury and Supply Depot copy must say integrity carries through the full match and servicing happens between matches.
- Retain all Build 12.15 armour balance/economy tests plus weapon, AI, stability, tactical, map, responsive, syntax, deterministic-build and ZIP gates.

## Retained Build 12.15 architecture notes

- `js/35-career.js` owns `CAREER_ARMOUR_CATALOG`, armour inventory migration, finite-copy assignment, bot profile application, break/discard persistence and the Armoury presentation. Career save schema is 18; diagnostics schema remains 1.
- `js/38-development.js` owns four direct-CR armour offers. Purchases debit cash, enter the finance ledger and add exactly one inventory copy.
- `js/30-bot-ai.js` owns `resolveArmourHit()`. Resilience modifies incoming damage first; torso armour then absorbs a bounded share according to weapon penetration versus armour rating and loses integrity. Headshots bypass.
- `js/36-team-management.js` records absorbed damage, integrity loss, breaks and armour workload in match/player settlement.
- `js/31-match-diagnostics.js` adds optional armour identity/integrity fields, zone absorption totals and `armour_broken` events without changing diagnostics schema 1.
- `js/62-character-renderer.js` maps `none`, light, medium-flex, medium and heavy classes to distinct non-authoritative vest geometry. Collision and hitboxes remain unchanged.
- Armour integrity is carried across round resets by Build 12.16. A zero-integrity owned copy is removed immediately and does not return.

### Retained Build 12.15 regression requirements

- `armourSystemForTest().ok === true`: lower-penetration weapons are absorbed more strongly, headshots bypass, heavy movement is slower, partial integrity follows the current match-long attrition contract, finite assignment is enforced and zero integrity discards the owned copy without returning next round.
- `seedArmourLoadoutsForTest()` and `armourLoadoutMappingForTest()` map four armour classes plus no armour to the five-player squad and preserve opponent profiles. `equipPlayerArmourForTest()` and `roundTripCareerStateForTest()` cover assignment and schema-18 armour fields.
- Supply Depot renders four CR offers and one beginner guide; Team Armoury renders the armour guide and all owned/no-armour choices without mobile horizontal overflow.
- A live combat smoke test must produce matching elimination/death events, changing integrity, at least one possible break under sufficient damage, no runtime faults and no weapon mapping regression.
- Retain all 12.14 weapon attachment, 12.13 tactical coaching, 12.12 AI budget/spacing, 12.11 stability, 12.10 acquisition, Dune/Office navigation, syntax, deterministic build and ZIP gates.

## Retained Build 12.14 architecture notes

- `js/35-career.js` owns the shared visual weapon parts plus `careerWeaponGripPart()` and `careerWeaponSupportPart()` anchor resolution.
- `js/62-character-renderer.js` converts those authored parts into living-operator dominant/support hand anchors and model-bounds muzzle positions through `operatorSharedWeaponRig()`.
- `js/63-viewmodel-renderer.js` uses the same grip resolver, including the AR-4 `pistol-grip`, so first- and third-person hands cannot silently drift to different source geometry.
- Shared-model hand points include weapon pitch/roll and use the same origin/scales as `drawUnifiedCareerWeapon()`. The hand world transform must not add `bodyBob` twice.
- Core AR-4 grip geometry remains in far LOD. Cosmetic fittings may still be removed first.
- No gameplay or persistence value changed.

### Build 12.14 regression requirements

- `operatorWeaponAttachmentForTest().ok === true` for all four owned and three simulated starter weapon entries.
- Every sample has a real grip/support part, finite anchors, dominant/support hand gaps within the authored tolerances, model-bounds muzzle flash gap at or below 0.05 and retained long-gun grips at far LOD.
- A mixed five-player loadout maps Scrapline, Service, Viper and AR-4 IDs/model classes to slots 0–4 through `operatorWeaponLoadoutMappingForTest()`.
- Retain operator animation/reload, corpse continuity, acquisition, AI budget, spacing, map/navigation, responsive layout, syntax, deterministic build and ZIP checks.

## Retained Build 12.13 architecture notes

### Tactical preview and first-round parity

`js/39-matchday.js` selects a deterministic suggested opening from the live arena engagement plans and stores its ID/name/zone in the captured tactical plan. `clubTacticalPreviewSnapshot()` combines that plan with the starting five, assigned roles, weapon range bands, live objective coordinates and plan-fit warnings. `js/32-tactical-minimap.js` draws those exact numbered objectives on the deployment map. `js/40-match-flow.js` requests the captured opening only for round one; later rounds retain dynamic plan rotation and between-round management.

### Live decision explanation

`js/30-bot-ai.js` converts existing autonomous state into player-facing action/reason/target/range/instruction/route text. `js/50-ui-menus.js` renders it only for the owned operator currently being spectated, with a compact portrait summary. This layer does not modify decisions and must not expose hidden enemy state.

### Intent-versus-execution coaching

`js/35-career.js` persists the five owned operator summaries produced by diagnostics. `js/39-matchday.js` compares the captured plan with effective-range use, state mix, support/trades, opening fight location, lane obstruction, role execution, zones and AI stability. Recommendations carry explicit route/player/target metadata. Report click handling preserves the reward flow, then opens and highlights Tactics, Training or the relevant Loadout without applying changes automatically. Older stored reports without the new rows are rebuilt on display.

### Build 12.13 regression requirements

- Preview contains five lanes and the first live round uses the same opening plan/objectives.
- Live telemetry text matches `botDecisionExplanation()` for the viewed owned operator.
- Synthetic and completed-match reports produce six intent rows, five role-execution cards and routed coaching actions.
- Tactics, Training and Loadout destinations exist and can be highlighted at supported mobile widths.
- Re-run Build 12.12 budgets/spacing, perception, corpse continuity where WebGL is available, Dune/Office navigation, state integrity, syntax, deterministic build and archive checks.

## Retained Build 12.12 architecture notes

- `js/30-bot-ai.js` owns a shared per-rendered-frame AI work budget. `beginBotWorkFrame()` resets quality-tier perception and tactical slots once before all fixed simulation substeps; deferred scans/decisions are counted rather than silently discarded.
- Current-target LOS, pending `sightCandidate` validation and reaction-time accumulation remain per-frame. Only broad challenger discovery and non-emergency tactical reconsideration are budgeted.
- `Bot.findCombatApproachRoute()` now separates cheap candidate scoring from pathfinding and performs at most one `findPath()` call after consuming the shared navigation-plan slot. This removes the old candidate-by-candidate A* burst.
- `Bot.teamSpacingProfile()`, formation-point selection and local spacing derive separation from formation/approach/engagement/priority plus role. Stay Grouped is compact but non-overlapping; Trade, Hold and Flank widen lanes without becoming rigid scripted formations.
- Navigation goal crowding and traffic penalties include teammate locations, combat/cover/coordination/path reservations, next waypoints and duplicate firing angles around a threat.
- `js/31-match-diagnostics.js` exports perception/tactical deferrals, route searches/deferrals/candidate evaluations and team spacing/lane corrections. Diagnostics schema remains 1.
- `js/70-runtime.js` exposes `botWorkBudgetForTest()`, `combatRouteBudgetForTest()` and `teamSpacingForTest()`.

### Retained Build 12.12 regression requirements

- Shared AI budgets reset once per rendered frame and enforce their quality-tier limits across multiple fixed substeps.
- A combat-route request performs no more than one A* search and one navigation-plan consumption.
- A deliberately clustered team separates; Stay Grouped remains tighter than Trade/Flank while maintaining the physical gap floor.
- Initial target acquisition, close-threat retargeting and friendly-body occlusion remain intact.
- Complete multi-round combat without runtime faults, missing paired elimination events or tactical collapse.
- Re-run Dune 160-route benchmark, Dune/Office arena and engagement audits, responsive layout, syntax, deterministic build and archive checks.

## Retained Build 12.11 architecture notes

### Corpse LOD ownership

`js/62-character-renderer.js` now derives `mediumDetail` and `fullDetail` inside `drawCorpse()` from the corpse-to-camera distance. Build 12.09 had added conditional full-detail corpse accessories but accidentally relied on similarly named locals declared only inside `drawSoldier()`. The first nearby corpse therefore raised `ReferenceError: fullDetail is not defined` during rendering and stopped the requestAnimationFrame chain immediately after the first elimination.

### Runtime fault continuity

`js/70-runtime.js` wraps the frame phases in a bounded fault recorder and schedules the next requestAnimationFrame in `finally`. A presentation exception is logged with phase, message, abbreviated stack, simulation time, application state and arena. Diagnostics schema 1 remains compatible; exports now include optional root/performance `runtimeFaults` arrays. This is a safety net, not permission to ship known renderer faults.

### Build 12.11 regression requirements

- `corpsePresentationForTest()` must render all three death poses at near, medium and distant detail without a runtime fault.
- `firstEliminationContinuityForTest()` must kill one opponent and render the full scene successfully.
- A synthetic render exception must be captured while later frames continue to execute.
- A live Dune simulation must record paired `elimination` and `eliminated` events with no runtime faults.
- Re-run Build 12.10 perception, Build 12.09 quality/navigation/animation, map, state, syntax, deterministic build and archive checks.

## Retained Build 12.10 architecture notes

### Staggered initial acquisition

Build 12.09 correctly staggered expensive all-opponent searches but accidentally treated frames between those searches as proof that no pending enemy was visible. `Bot.updatePerception()` now distinguishes a committed target, a live unconfirmed `sightCandidate` and a newly scanned challenger. A pending candidate is revalidated with `canVisuallySee()` every frame and continues accumulating `sightTime`; only the challenger search is deferred. This restores normal reaction and firing without returning to an every-frame full enemy scan.

An enemy returned by `firstOperatorOccludingView()` may be committed immediately when it physically stands in front of the old target and is itself visible. Friendly occluders remain authoritative and continue using lateral view-clearance movement.

### Build 12.10 regression requirements

- `staggeredPerceptionAcquisitionForTest()` must retain the candidate across at least one skipped scan and acquire within the bounded reaction window.
- `closeThreatRetargetForTest()` must select the nearer enemy occluding the previous target.
- `operatorViewOcclusionForTest()` must continue blocking a standing friendly body while allowing crouched/shoulder exposure cases.
- A deterministic Dune simulation must produce target-change and tactical-state events plus confirmed combat damage or an elimination.
- Re-run Build 12.09 quality-tier, navigation, animation, syntax, deterministic-build and archive checks.

## Retained Build 12.09 architecture notes

### AI commitment and destination validation

`js/30-bot-ai.js` keeps current-target visibility authoritative every frame but schedules the expensive all-opponent scan through `runtimePerceptionInterval()`. `targetCommitUntil` and the stronger challenger score margin prevent harmless target oscillation while immediate close threats still override. `setCombatTactic()` applies mode-specific commitment floors, and repeated identical intents extend the current action rather than causing a visible decision reset.

Before an ordinary path request, `resolveCommittedNavigationGoal()` samples a small bounded set around the requested point, rejects blocked positions and scores team-mate reservations plus local clearance. This is still followed by one bounded `findPath()` request; no fallback A* ring is allowed. `pathLeaseUntil` lets a useful route absorb small moving-goal changes.

### Motion presentation

`js/30-bot-ai.js` derives render-only body lean, turn anticipation, foot planting, aim stability and breathing. `js/62-character-renderer.js` consumes those values for pelvis/torso roll, weapon stability and subtle weight transfer. Authoritative position, velocity, collision and aim remain unchanged.

### Broad-device performance

`runtimeQualityTier` begins constrained only on clearly weak hardware and otherwise reacts to sustained measured frame/update/render pressure. It is reversible and not saved. `js/20-navigation.js` lowers per-frame plan budgets only in constrained mode; `js/30-bot-ai.js` adjusts broad scan cadence; `js/62-character-renderer.js` removes small distant accessories and weapon fittings before core silhouette detail; and `js/70-runtime.js` coordinates tier changes with adaptive render resolution. Diagnostics include quality tier and label.

### Build 12.09 regression requirements

- Confirm current-target wall/occlusion truth at every frame and broad-scan staggering at all quality tiers.
- Confirm immediate-threat target overrides, target commitment, same-intent tactical stability and emergency interruption.
- Confirm dynamic goals are clear, separated from reserved team destinations and routed with at most one A* request per planning slot.
- Confirm animation values remain finite and render-only.
- Force FULL → BALANCED → CONSTRAINED transitions and verify recovery, distance LOD, plan budgets and diagnostics fields.
- Re-run Dune/Office audits, navigation benchmarks, combat deadlock tests, operator occlusion, state integrity, syntax and deterministic build/ZIP checks.

## Retained Build 12.08 architecture notes

### Operator surface geometry

- The project remains on its custom asset-free WebGL renderer. The existing shader, materials, animation state, adaptive resolution and mobile presentation already support the required improvement; no external engine or model-loader dependency has been introduced.
- `js/60-renderer-core.js` now provides three reusable procedural meshes: `makeRoundedBoxMesh()` for softened armour/equipment forms, `makeTaperedCapsuleMesh()` for limbs and narrow plate runs, and `makeOperatorTorsoMesh()` for a waist/ribcage/shoulder silhouette. `drawAnatomicalSegment()` aligns the tapered capsule to the existing joint endpoints.
- `js/61-world-renderer.js` creates these meshes once beside the existing cube, sphere and cylinder meshes. They are shared by every operator and corpse, avoiding per-frame geometry creation.
- `js/62-character-renderer.js` substitutes the new meshes on existing body draw calls. The torso receives a narrower waist, fuller ribcage and sloped shoulders; arms and legs taper between joints; pelvis, boots, plates, pouches, helmet fittings and other major forms use rounded surfaces. Weapon fallback geometry and non-character world geometry retain their existing meshes.
- Living operators and corpses use the same upgraded body geometry. The change is visual only: body collision, hit detection, navigation, line of sight, animation joints, weapon anchors and simulation values are unchanged.
- The pass remains draw-call neutral for the operator body. Mesh vertex counts rise modestly, but no duplicate anatomy layer, imported asset, skeletal runtime or per-frame mesh allocation is added.

### Build 12.08 diagnostics and regression requirements

- `operatorSurfaceGeometryAudit()` reports the active renderer, torso/limb/equipment strategy, shared living/corpse use, draw-call neutrality and the absence of gameplay collision/hitbox changes.
- `operatorModel()` exposes the surface audit alongside the retained leg-geometry, proportion and armour checks.
- `operatorPresentationForTest(distance)` creates a deterministic, frozen close-range living-operator view for visual regression without changing production gameplay.
- Validate source modules, generated bundle and standalone inline JavaScript with syntax checks. Load the self-contained release in WebGL at 844 × 390, confirm no application exceptions, and capture the close-range presentation.
- Retain state integrity, Dune Bastion, Office walkway, animation and adaptive-resolution checks, deterministic build parity and ZIP integrity.

## Build 12.07 architecture notes

### Current Map 3 source of truth

- `ARENA_LIBRARY.dune` in `js/00-core.js` is the authoritative Map 3 definition. It is a 36 × 24, single-floor, left/right-symmetrical arena named **Dune Bastion**.
- Dune has no `vertical` profile, no stairs and no automatic doors. `arenaElevationAt()` remains zero throughout this arena.
- `buildLevelPropColliders()` derives gameplay collision from ordinary props and small mirrored support colliders for visible canopy posts, masonry-arch posts and freestanding banner masts. Overhead shade fabric, banner cloth/tails, lintel facing, plaques and wall-top decoration remain non-blocking.
- `DUNE_BANNER_PRESENTATION` and `duneBannerMastPoint()` are the shared source of truth for banner mast/base placement. Each standard has `mount: 'standard'` and one `banner-post` collider aligned to the rendered grounded foot.
- `DUNE_ARCH_PRESENTATION` and `duneArchAttachmentSnapshot()` define/audit the recessed inner-lintel overlap and the flush landmark-plaque placement.
- `arenaMeta('summit')` intentionally resolves to `dune` so schema-17 careers saved on the removed map remain loadable. New selection, matchmaking, Free Roam and diagnostics use `dune`.

### Dune rendering and presentation

- `js/61-world-renderer.js` branches on `theme === 'desert'`. Dune uses sandstone/plaster surface 7, packed-earth floor colours, warm zone blending, open sky, subdued grid seams and warm prop shadows.
- Freestanding standards now render a grounded stone foot, continuous mast, finial, connected top brace/crossbar and lower tie before drawing cloth and tails. Animation is limited to the cloth tails; the support assembly does not sway or float.
- Recessed arch lintels now overlap the parent beam. Landmark emblems render as backed plaques on both vertical arch faces rather than isolated blocks above the roof line.
- The retained 12.05/12.06 scene layer includes perimeter crenellations, bounded exterior dunes/rocks/towers, mosaics, rubble, wall-backed braziers, striped canopies and upgraded Dune-specific props.
- Keep exterior backdrop, crenellations, mosaics, rubble, cloth, plaques and wall-top details presentation-only. Solid ordinary props and every visible canopy/arch/banner ground support are authored through `buildLevelPropColliders()`.
- `js/32-tactical-minimap.js` owns both the live one-floor minimap and generated deployment preview. They derive walls, props, spawns and bands from the arena definition rather than from a second hand-authored map.

### Balance and route intent

- North Rampart is the clearest long-range lane. Central Gate provides mixed cover and medium sightlines. South Bazaar and shaded courtyard routes preserve close-range and flank value.
- Six engagement plans and fourteen hotspots must remain directly clear and reachable. Mirrored colliders must keep equivalent dimensions and positions across the centre line, even when decorative colours differ.
- Dune receives no hidden combat modifiers. Build 12.07 changes support integrity only; it does not alter weapon, health, AI, economy, reward or progression values.

### Build 12.07 regression requirements

- `duneBastionAuditForTest()` must report exact row symmetry, one floor, zero stairs/doors, 58 mirrored static colliders, 554/554 open layout cells connected, one live graph component, complete ordinary/support collision, eight wall-backed/open-front braziers, six grounded banner standards with colliders, six attached arch-detail snapshots, zero support-to-prop overlaps, zero support-to-support overlaps, five connected route-band samples, all destinations clear/reachable and all engagement plans valid.
- Preserve audit fields `supportOverlaps`, `supportPairOverlaps`, `bannerSupportChecks`, `archAttachmentChecks`, `allBannersGrounded`, `allArchDecorAttached` and `allDecorSupportsClear`.
- `engagementPlanAuditForTest('dune')`, `arenaAuditForTest('dune')` and `navigationBenchmarkForTest('dune', 160)` must pass with zero route failures and one graph component. The current audited graph contains 494 nodes and 2,752 edges.
- `duneDeploymentPreviewForTest()` must render a non-empty preview. Tactical minimap output must report arena ID `dune`, 310 wall cells and 58 live colliders.
- Free Roam must list and enter Dune Bastion on ground floor, with collision and export using the correct ID/name.
- Retain Citadel, Office, career-state, tutorial, management, diagnostic, mobile-width, source/standalone syntax, deterministic-build and ZIP-integrity checks.
- All Summit architecture/test sections later in this file are historical and superseded by this current contract.

## Build 12.00 architecture notes

### Cached navigation graph and bounded planning

- `js/20-navigation.js` builds one static graph per active arena from map cells, static collision, elevation-valid edges and static clearance penalties. `setActiveArena()` invalidates it; `createMatch()` and Free Roam pre-warm it before the live frame loop.
- A stable binary min-heap replaces repeated linear open-list sorting. A* still applies live teammate traffic penalties while using cached static edges.
- Destination resolution is constrained to the mover's static connected component. The resolved endpoint is attached to the returned path so `Bot.pathGoal` records the real reachable target.
- `js/30-bot-ai.js` applies a short bounded cooldown after a repeated failed destination. The previous many-candidate fallback ring is forbidden because it could run dozens of complete A* searches during one mobile frame.

### Diagnostics allocation and stall classification

- `js/31-match-diagnostics.js` captures regular state at 0.5-second intervals. Full path nodes are limited to forced snapshots, live-overlay capture and periodic checkpoints.
- Events and snapshots are circular buffers. `diagnosticOrderedEvents()` and `diagnosticOrderedSamples()` are the canonical chronological views for exports, summaries and tests.
- Runtime stage timers are collected in `js/70-runtime.js` and passed into `diagnosticRecordPerformanceFrame()`. Reports include average/maximum cost by stage.
- Intervals above 250ms are recorded as browser/OS scheduling gaps and excluded from active FPS. Update execution above 100ms is separately counted as an active update stall.

### Free Roam inspection

- `js/70-runtime.js` owns Free Roam state, camera movement, drag-look input, map selection, isolated enter/exit, door activation and JSON inspection export.
- `js/50-ui-menus.js` embeds the Configuration card and treats Free Roam as an interactive view for fullscreen/orientation behavior.
- `js/63-viewmodel-renderer.js` renders the world/crosshair without bots or a weapon model. `js/32-tactical-minimap.js` shows the inspection camera instead of operator markers.
- Free Roam uses `BOT_RADIUS`, `canTravelBetween()` and the live elevation profile. It is an inspection tool, not noclip, and is deliberately blocked while a live match/deployment flow exists.
- `css/game.css` owns the safe-area header, movement pad, drag-look pad and responsive Configuration card.

### Build 12.00 regression helpers

- `navigationBenchmarkForTest(arenaId, iterations)` exercises cached planning across authored spawns, hotspots and objectives.
- `freeRoamConfigurationForTest()`, `startFreeRoamForTest()`, `freeRoamSnapshotForTest()`, `freeRoamMoveForTest()`, `freeRoamTravelForTest()` and `exitFreeRoamForTest()` cover the isolated inspection flow.
- Continue to run every retained Citadel, Office and Summit geometry/navigation audit, `diagnosticEventRetentionForTest()`, state integrity, mobile width, source/standalone syntax, deterministic-build and ZIP checks.

## Build 11.98 architecture notes

### Summit guardrail construction

- `summitPlatformRailSegments()` in `js/61-world-renderer.js` derives four platform edges and subtracts stair-mouth gaps using the authoritative ramp endpoints and travel direction. It currently produces ten valid rail runs and observes both retained stair IDs plus the upper-deck join.
- `drawSummitGuardrailSegment()` renders a constructed balustrade: top, mid and base rails, posts at bounded intervals and framed translucent panels. `drawSummitStairRails()` adds sloped handrails, lower stringers and posts outside each walkable stair width. These meshes are presentation-only.
- Do not restore the old full-width north/south pole. A landing blocked visually by a rail is a presentation regression even when navigation collision remains clear.

### Summit floor-material consistency

- Summit zone-floor rectangles now draw inside a temporary blend pass; their alpha is no longer ignored by the opaque render state. This prevents full-strength zone colours from replacing the terminal floor material.
- Summit floor patches and lane strips sample `arenaElevationAt()` before drawing, so upper-floor details sit on the deck instead of underneath its support plinth. Patch contrast, grid seams and emissive lane strips are intentionally subdued.
- Summit zone colours in `js/00-core.js` remain a cohesive slate palette with teal/orange light accents. This is presentation metadata only and does not alter analytics zones or AI.

### Inbox list/reader separation

- Build 11.98 adds a distinct navy list panel, bottom separator and shadow, while the reader uses a darker near-black surface. The list retains exactly two 76–78px rows before scrolling.
- Release checks should inspect computed list/reader backgrounds and boundaries at phone widths rather than relying only on source CSS.

### Build 11.98 regression helper

- `summitPresentationAuditForTest()` verifies the Summit theme, two platforms, two ramps, both stair-mouth gaps, valid rail lengths and blended zone-floor presentation. Run it with the retained structural, vertical and stair-only audits.

## Build 11.97 architecture notes retained

### Stair-only elevation transitions

- `arenaElevationTransitionAllowed()` is enforced by swept movement and navigation edge checks. A non-trivial elevation change is legal only when consecutive samples lie within the same authored Summit ramp corridor and progress primarily along its centreline.
- `prepareNavigationPath()` preserves the complete raw A* waypoint chain when a route spans different elevations. Never smooth an elevation-changing path into a diagonal platform-side climb.
- `Bot.findCombatApproachRoute(..., { verticalTransition:true })` is the only combat shortcut for changing floor. It still uses ordinary A* and cannot teleport, climb a wall or select a goal on the wrong floor.
- Preserve `summitStairOnlyAccessAuditForTest()`, `summitCrossFloorCombatRouteForTest()` and `summitStairTraversalSimulationForTest()`. Direct platform-edge transitions must fail while both ramps and audited ground-to-upper pairs pass gradually.

### Tactical flanking semantics

- `combatApproachKind === 'tactical-flank'` identifies a verified wide combat route. Ordinary firing-angle changes, lane yields and blocked-advance recoveries are not flanks.
- Flank selection is bounded by role/flank bias, team priority, health, ammunition, local numbers, distance, cooldown and urgent-endgame rules. It changes positioning only and applies no hidden damage, accuracy or perception bonus.
- Diagnostics count verified routes through `tacticalFlankRoutes`, `true_flank_route` and verified `flank_route` events. Preserve `summitTacticalFlankForTest()`.

### Diagnostic retention and failed-goal recovery

- The 11.96 device report contained two failed requests for `(17.5, 9.5)`. `Bot.ensurePath()` now probes the expanded bounded ring and resolves that point to a nearby reachable goal without incrementing path failures. Preserve `summitLoggedGoalRecoveryForTest()`.
- `matchDiagnostics.eventCounts` is cumulative for the full match and is not reduced when old detailed events leave the 1,800-event rolling retention window.
- Counter deltas remain in the summary but are not duplicated as `counter_increment` events when a dedicated semantic event already exists. Diagnostics schema remains 1.

## Build 11.96 architecture notes retained

- `ARENA_LIBRARY.summit.vertical` has two raised platform regions but only one non-zero elevation: `0.78`. Ground level plus that shared elevation are the only playable floors.
- Both retained Summit ramps connect ground level to the same raised elevation. Do not reintroduce an intermediate Skybridge elevation or describe Maintenance as a third floor.
- `ARENA_LIBRARY.summit.ceilingHeight` is authoritative for Summit walls, roof shell, beams and lights. It is currently `3.46`, providing `2.68m` of headroom above the raised floor.
- Summit uses the `summit` visual theme. It intentionally avoids Citadel's dense hazard tape, exposed pipes, grates, cable trays and decorative suspended walkways. Preserve its lighter panelled shell, cyan glazing/skylights and teal/orange wayfinding identity.
- Summit preview metadata must retain `2 LEVELS`, two labelled bands and two stair markers. The tactical minimap outlines both upper platforms from the authoritative vertical profile.
- Release acceptance includes one unique raised elevation, two playable floors, two clear/connected stair ramps, all fourteen route intents reachable in both directions, upper headroom of at least `2.55m`, syntax checks, deterministic output and mobile-width safety.

## Build 11.95 architecture notes retained

### Summit structural presentation

- `ARENA_LIBRARY.summit.vertical` remains the authoritative two-platform/six-ramp profile. `drawArenaVerticalGeometry()` now renders a ground-connected structural plinth beneath each elevated platform and solid risers beneath every tread; do not restore thin floating slabs or isolated stair plates.
- The lower-maintenance ramps are straight at `x=11.5` and `x=24.5`. Keep their AI route endpoints, preview markers and visual geometry aligned with the same authored coordinates.
- Summit stair mouths are open portals. Do not place automatic doors, containers, machines or tanks within the audited transition clearance. Industrial props must render from authored `width`, `depth`, `radius` and `yaw` so visual mass matches collision.

### Disconnected tactical-goal recovery

- `Bot.ensurePath()` may receive a point that passes local standability but belongs to a disconnected navigation sliver. Before counting a failure, it probes a small deterministic ring and selects the closest reachable substitute. The search is bounded and does not permit direct movement through walls.
- Preserve `summitStructuralIntegrityAuditForTest()`. It explicitly verifies that `(17.5, 10.5)` is not directly reachable from the lower west spawn but is safely replaced without incrementing `pathFailures`.
- Test helpers that call `Bot.update()` frame-by-frame must call `beginNavigationPlanningFrame()` each frame, matching the production runtime's bounded planning budget.
- A blocked operator line of fire remains a hard no-shot condition. `Bot.shoot()` now applies a short retry cooldown and advances the existing engagement-idle recovery when the blocker is friendly; do not remove realistic body obstruction or count every blocked simulation tick as a separate meaningful attempt.

## Build 11.94 architecture notes retained

### Summit elevation model

- `ARENA_LIBRARY.summit.vertical` in `js/00-core.js` is the authoritative elevation profile. Two platforms, one deck join and two ramps define presentation height through `arenaElevationAt()`; do not infer height from decorative stair props.
- Navigation remains the existing collision-tested 2D path graph, but operator/world rendering, the active spectator camera, tracers and objective markers sample the same elevation function. This creates visibly continuous stair ascent without introducing a second unsynchronised navmesh.
- `drawArenaVerticalGeometry()` renders stair steps from ground to their exact platform elevation. Side-stair props must not overlap collision props; the Summit tanks were moved away from the bridge approaches.

### Opening transitions and route distribution

- `prepareSummitOpeningTransitions()` runs after operator reset. It assigns bounded, role-aware stair commitments for CATWALK, SKYBRIDGE and MAINT opening plans before the normal mid-round director is allowed to choose optional rotations.
- An opening commitment survives distant sight candidates and ordinary coordination requests. It may be interrupted by a threat inside 5.2m, recent damage, health below 58 or an urgent hunt. This is a tactical commitment, not immunity or a hidden combat bonus.
- `SUMMIT_LAYER_ROTATION_ROUTES` owns fourteen entry/exit intents aligned with the authored ramps. Route goals must remain clear and reachable in both directions.
- Every Summit hotspot must be reachable from every spawn. Never rely on `nearestWalkablePoint()` to conceal a blocked or disconnected authored goal.

### Build 11.94 regression helpers

- `summitVerticalAccessAuditForTest()` validates all ramp samples, platform joins and cross-layer paths.
- `summitHotspotReachabilityAuditForTest()` rejects the stale unreachable `(17.5, 10.5)` goal and validates all current hotspots from every spawn.
- `summitOpeningTransitionForTest()` checks bounded two-team assignments for catwalk, maintenance and skybridge plans.
- `summitStairTraversalSimulationForTest()` runs real bot movement up both upper staircases and requires gradual elevation, zero path failures and arrival on the catwalk.
- `summitOpeningDistributionForTest()` runs ten operators with ordinary combat/perception enabled and requires both teams to reach the authored layer for CATWALK, MAINT and SKYBRIDGE openings.

## Build 11.93 architecture notes retained

### Summit deployment preview

- Summit's `preview` metadata lives with the arena definition in `js/00-core.js`. It owns the two labelled floor bands, `2 LEVELS` badge, feature tags and two stair markers.
- `drawDeploymentArenaPreview()` in `js/32-tactical-minimap.js` renders those bands and stair glyphs without maintaining a separate image asset. `renderDeploymentSelection()` adds the badge and tags to the existing map card.
- The preview must remain generated from arena data so map geometry and selection presentation cannot drift independently.

### Summit route director

- `SUMMIT_LAYER_ROTATION_ROUTES` in `js/30-bot-ai.js` defines ten bidirectional-valid route intents across catwalk, skybridge and lower maintenance layers.
- `Bot.summitLayerRotationSelection()` combines current-zone congestion, weapon range, player role, target-layer occupancy and route length. It operates only during quiet mid-round windows and never provides combat-stat bonuses.
- Marksman/long-range profiles prefer CATWALK, entry/short-range profiles prefer MAINT and support/medium-range profiles prefer SKYBRIDGE. These are weighted preferences, not hard locks.
- `Bot.updateMapSpecificRotation()` dispatches to Office courtyard or Summit layer logic. Confirmed contact and urgent combat state always interrupt the route.
- Summit stairs are rendered but `walkable: true`; `buildLevelPropColliders()` skips them so the visual traversal cues do not become invisible blockers.
- Diagnostics schema 1 may include `summitLayerRotations` and `summitLayerTraversals` counters plus `summit_layer_rotation` events.

### Inbox viewport

- `.club-mail-list` exposes two fixed-height rows before scrolling: 156px normally and 152px in portrait where rows are 76px. The full inbox remains in the DOM and scrollable.

### Build 11.93 debug and regression helpers

- Preserve `summitLayerRouteAuditForTest()`, `summitRoutingPreferenceForTest()` and `summitDeploymentPreviewForTest()`.
- Required acceptance: all ten routes clear/reachable both directions, no Summit stair colliders, role/range preference scenarios pass, preview renders to a non-empty canvas, three deployment cards fit at 320–430px, two-row inbox geometry, state integrity, syntax, deterministic rebuild and ZIP integrity.
- Save schema 17 and diagnostics schema 1 remain unchanged.

## Build 11.92 architecture notes retained

### Spectator presentation

- The base `.match-view::before` remains the full-view vignette, but the portrait/windowed override must explicitly reset `inset`, dimensions and background before using that pseudo-element as the **LIVE // SECURE FEED** label.
- Windowed scanline opacity is 0.035 and canvas brightness is 1.09. Do not reintroduce a translucent full-frame overlay to display a label.

### Office courtyard route commitment

- `Bot.officeCourtyardRotationScore()` in `js/30-bot-ai.js` now positively weights a selected Courtyard engagement plan and uses a 0.86 activation threshold. Courtyard and Atrium opening plans also assign two operators per side to opposite-side objectives, so the authored plan produces real crossings rather than two teams stopping at their own courtyard edge.
- Once a legal two-stage courtyard route begins, weak sound cues and transient sight candidates do not cancel it. Confirmed targets, remembered contact, combat-approach goals, late-round goals and urgent hunts remain valid interrupts.
- Entry/cross expiry windows are 24/18 simulation seconds. Preserve the simultaneous-rotator cap and all knowledge-safety rules.
- An active map rotation takes precedence over its earlier opening objective. `officeCourtyardRotationDecisionForTest()` must prove both weak-cue persistence and confirmed-contact interruption; `officeCourtyardOpeningTraversalForTest()` requires at least two reachable cross-centre objectives per team for both courtyard plans, and the four lane geometry checks remain authoritative.

### Latest-match diagnostics export

- `exportMatchDiagnostics()` continues to export the active diagnostic session from the viewport control.
- `exportLastCompletedMatchDiagnostics()` is the post-match path. It prioritises `lastCompletedDiagnosticReport`, then a completed current report, then the persisted summary-only fallback. It must never export a new active match in place of the report being reviewed.

### Supporter culture

- `js/39-opposition-intelligence.js` owns `supporterState()`, season expectations, gradual weekly fan growth and contextual reactions. The same state object is preserved through normalisation.
- Persistent values are fanbase, popularity, confidence, loyalty, season expectation, reaction history and compact trend history. They remain optional fields inside career schema 17.
- Season finish expectations are based on live club-strength order and division size. A new club and every new season receive one expectation mail.
- Match reactions use the existing pre-match probability. Signings compare current ability/development upside with the squad, departures consider player importance and fee context, and sponsorship reactions consider offer quality. Avoid arbitrary large jumps.
- The Fans route is `supporters` under the Club section. `renderSupportersTab()` is authoritative; do not duplicate fan calculations in UI code.
- Supporters never change health, damage, weapon values, AI ability or winner selection. Long-term fanbase changes are deliberately gradual.

### Mobile width contract

- At 361–430px, the Gold Coin cell may hide its icon and secondary labels so the quantity remains fully readable. Back, four shortcuts, End Day and Forward remain separate touch cells.
- Foundation Plan rows must keep `scrollWidth <= clientWidth`; subsection tabs reserve edge-arrow space and receive a second overflow calculation after classes change.

### Build 11.91 debug and regression helpers retained

- Preserve `supporterCultureForTest()`, `settleSupporterExpectationForTest()`, `officeCourtyardRotationDecisionForTest()`, `officeCourtyardRotationAuditForTest()`, `officeCourtyardOpeningTraversalForTest()`, diagnostic export helpers and all Build 11.90 Office audits.
- Required checks include 320/375/390/402/430 portrait widths, mobile landscape, post-match JSON download, supporter persistence/reactions, season expectation creation, weak-cue/confirmed-contact courtyard behaviour, source/standalone syntax, deterministic rebuild and ZIP integrity.
- Save schema 17 and diagnostics schema 1 remain unchanged.

## Build 11.90 architecture notes

### Door-pocket visual geometry

- `doorPanelDescriptors()` in `js/00-core.js` remains the full physical panel source used by dynamic collision while a door is opening.
- `visibleDoorPanelDescriptors()` clips those panels to the doorway aperture for presentation. Sections that have slid behind the adjacent wall are never rendered as free-standing wall objects.
- At `openAmount = 0`, the two visible panels total 0.86m. Visible width must decrease monotonically and total 0 at `openAmount = 1` for every one of the eight Office doors.
- `js/61-world-renderer.js` renders only the clipped descriptors and suppresses a detached handle when too little of the source panel remains visible.
- `officeDoorPocketAuditForTest()` is the authoritative regression. Do not “fix” the issue by deleting doors, moving their colliders or hiding genuine wall displays.

### Coordination-goal stability

- `Bot.setCoordinationGoal()` in `js/30-bot-ai.js` distinguishes a new team instruction from a moving support point within the same instruction.
- A useful same-intent regroup goal is held for a short bounded lock and is rebuilt only after a material shift. Emergency/contact decisions still override coordination through the existing tactical flow.
- Preserve `coordinationPathReuseForTest()`: a small moving-team-mate shift must retain the current path and objective, while a later material shift remains eligible to repath.

### Diagnostic event retention

- Navigation planner execution/deferral/path-hold totals remain in `summary.counterDeltas` and the performance/debug surfaces.
- Those high-frequency totals are summary-only and must not flood `events` as repeated `counter_increment` records. Tactical, path, recovery, door, block and combat events remain eligible for the retained event stream.
- Diagnostics schema remains 1. This change improves event-window usefulness without changing the exported summary contract.

## Build 11.89 architecture notes

### Authoritative Office furniture clearance

- `js/70-runtime.js` owns `officeFurnitureClearanceAuditForTest()`. It derives the six desk checks and eight door approaches from current `LEVEL_PROP_LAYOUT`/`ACTIVE_DOOR_STATES`, rather than maintaining a second minimap-only furniture list.
- Every desk must have a matching collision body, block its own centre, retain at least one valid circulation side and avoid every protected transit, door and courtyard-rotation segment.
- Every Office door approach is checked on both sides with door-ignoring navigation clearance, direct swept travel, A* reachability and a no-furniture-blocker assertion. Door posts remain valid frame collision and are excluded from the furniture-blocker list.
- Protected direct corridors cover the row-18 east/west transit lane, the north open-office lane and both conference approaches. Courtyard crossing lanes may route around intended courtyard cover but must remain reachable in both directions.
- The comprehensive result also requires `engagementPlanAuditForTest('office')`, `officeCourtyardRotationAuditForTest()` and the minimap furniture-presentation threshold. `officeWalkwayAuditForTest()` preserves its historical table/carpet fields and now nests/requires the comprehensive result.
- The north-office and atrium-rotation opening plans were corrected so all ten objectives per plan sit on clear navigable floor; do not reintroduce objectives inside wall cells, planters or workstation collision.

### Tactical minimap legibility

- `js/32-tactical-minimap.js` owns `TACTICAL_MINIMAP_PROP_PRESENTATION` and `tacticalMinimapPropPresentation()`. Office static furniture uses 0.18 opacity with a fine outline, round courtyard props use 0.24, and dynamic door panels remain high contrast at 0.72.
- The map continues to draw the same authoritative collider set used by movement and line-of-sight. Lower visual emphasis must never mean hiding a real collision object or maintaining separate stale minimap geometry.
- `tacticalMinimapForTest()` exposes the presentation snapshot. The deployment map preview uses the same quieter Office emphasis.
- Save schema 17 and diagnostics schema 1 remain unchanged. This pass changes Office validation, two invalid opening objectives and map presentation only; it does not change weapon, economy, health or reward balance.

## Build 11.88 architecture notes

### Dynamic club strength

- `js/39-opposition-intelligence.js` owns persistent rival identities, scouting, dynamic strength and supporter expectations. It is loaded after the existing league/club systems and wraps their public render, calendar, fixture-simulation and settlement entry points rather than replacing the underlying league model.
- `leagueClubStrengthSnapshot(club)` is the single current-strength calculation. It combines the active five-player roster rating, recent league form, fatigue/morale/sharpness readiness and a deliberately small reputation adjustment. It may update rival `dynamicRating`/`rating`, but it must not modify operator health, weapon damage or hidden result rolls.
- `leagueStrengthStars(rating)` is an absolute pyramid-wide grade, rounded to half stars. The current scale intentionally places ordinary Division 3 rivals around 1.0–2.5 stars; promotion and stronger squads may move beyond that range. Do not normalise every division back to five stars.
- `leagueDevelopRivalsAfterMatchday(matchday)` gives bounded, deterministic development/decline chances based on age, potential and match outcome. It also updates form, morale, happiness, sharpness and fatigue. The same matchday may be processed only once.

### Supporter expectations

- `leagueFixtureExpectationSnapshot()` compares current team strength, opponent strength and a modest home adjustment. It returns public win chance, uncertainty, expected first-to-three scoreline and one of the supported expectation tiers.
- Expectations are descriptive pressure, not outcome scripting. `supporterSettleExpectation()` changes supporter confidence according to the result and pre-match probability; upset wins earn more confidence and costly defeats lose more.
- Command HQ, League and Tactics use the same expectation snapshot. Do not create independent copies with different thresholds.

### Opposition identity and scouting retained from Build 11.87

- All 19 league play-style values resolve to distinct tactical identities that are applied to opponent AI through existing formation, approach, engagement and priority controls. Adaptive/Burst variants may change between rounds but gain no raw-stat bonus.
- Public reports begin at 22% depth. An employed Opposition Scout increases truthful report depth as calendar days process; quality caps maximum depth and controls how many recommendations are shown. Weak scouting stays incomplete rather than deliberately wrong.
- `oppositionScoutingState()` and `supporterState()` preserve object identity while normalising because callers can retain references across wage, mail, render and save operations. Replacing those objects inside an operation can silently discard appointments or confidence changes.
- Save schema remains 17 because unknown top-level keys are preserved by `normaliseCareerState()`. `oppositionScouting` and `supporters` must survive export/import and normalisation round trips.

### Required Build 11.88 regression coverage

- Validate all 19 styles map to distinct identities; scout hiring immediately develops a report; subsequent processed days deepen it; release/decay and normalisation persistence remain valid.
- Validate Division 3 starts in a low absolute rating/star range, strong and weak opponent cases change expectation tier, rival development changes at least one roster over a bounded multi-matchday run, and supporter confidence moves in the expected direction.
- Check Command HQ, League, Tactics and Staff at 320/375/390/430 portrait plus mobile landscape with no document-level horizontal overflow. Preserve state-integrity and Office courtyard-rotation audits.

## Build 11.87 architecture notes

Build 11.87 introduced the 19 rival tactical identities, Opposition Scout employment, progressively revealed reports and actionable but non-automatic counter-suggestions. Those systems are now implemented in `js/39-opposition-intelligence.js` alongside the Build 11.88 strength layer and remain authoritative.

## Build 11.86 architecture notes

### Multi-kill chain authority and presentation

- `js/35-career.js` owns `CAREER_MULTI_KILL_WINDOW`, the four reward tiers, reward aggregation and completed-match settlement. The chain window is 18 simulation seconds; only events recorded for the manager-owned team are eligible.
- `js/30-bot-ai.js` resets per-round chain state on each bot and calls `registerOwnedMultiKill(killer)` only after a legitimate elimination. `js/40-match-flow.js` validates same operator, same round, owned-team membership and timeout before recording cumulative tier events at kills 2, 3, 4 and 5.
- `#multiKillBanner` in `index.html`, DOM references in `js/00-core.js`, the queue/update lifecycle in `js/40-match-flow.js` and responsive styling in `css/game.css` form one non-blocking banner system. Events queue so a fast Triple/Ultra/Rampage sequence cannot replace an unseen earlier banner.
- Tier rewards are cumulative: Double = 1 GC / 8 XP / 1,500 CR; Triple = 2 GC / 16 XP / 3,000 CR; Ultra = 3 GC / 28 XP / 5,000 CR; Rampage = 5 GC / 50 XP / 9,000 CR. `completeCareerMatch()` adds Team XP, `careerSettleGoldCoinMatchReward()` adds Gold Coins and `settleTeamMatchManagement()` adds credits plus player honour counters. Opponent events must never enter any of those paths.
- `renderCareerAfterActionReport()` exposes the honour timeline and separates the bonus contribution from base match settlement. Existing match reward, commercial multiplier and result logic remain authoritative.

### Player Profile & Data consolidation

- `renderPlayerTelemetryProfileSection(player)` in `js/35-career.js` renders live/latest K/D, accuracy, critical profile, health/readiness, medical state, condition and chain status inside `renderTeamPlayerProfileTab()` in `js/36-team-management.js`.
- The authoritative context route is now `profile`. `setMenuRoute('player-telemetry')` redirects to Profile for old links/history, while `player-telemetry` is removed from `menuSections` and ordinary subnavigation. Team Telemetry remains an aggregate route and its player rows open Profile & Data.
- `normaliseTeamPlayerCareer()` supplies optional zero defaults for `doubleKills`, `tripleKills`, `ultraKills` and `rampages`; latest-match records may include `multiKillEvents` and `highestMultiKill`. These additions do not require a schema bump.
- Player-facing profile navigation should consolidate condition, performance, development, career honours, reflections and loadout context before creating another player-specific route. Team-level and club-level analytics remain on their aggregate pages.

### Immediate loadout persistence

- `renderCareerLoadoutTab()` issues/reassigns through `equipCareerWeapon()` immediately and displays an Autosave Active state. There is no staged selected weapon or route-level Save Changes action for loadouts.
- `js/39-workflow-integrity.js` excludes `loadout` from draft counting, dirty checks and leave-route guards. Legacy loadout draft helpers may remain for compatibility/debug callers but must not be used by current UI.
- Finite weapon-copy transfer, live-match locks, first-starter legacy mirror and loadout-driven tactical-confirmation invalidation remain unchanged.

### Verification and compatibility

- `js/70-runtime.js` exposes `multiKillRewardForTest()`, `multiKillSequenceForTest()`, `multiKillSettlementForTest()`, `playerProfileConsolidationForTest()` and the updated `equipPlayerWeaponForTest()`. Required checks cover cumulative reward arithmetic, banner queueing, opponent exclusion, timeout reset, Profile embedding, route aliasing, immediate persistence and a clean workflow-draft state.
- `build.py` writes `dist/strikewatch-build-12.19.html`. Acceptance includes source and standalone syntax, deterministic rebuilding, ZIP integrity and no document-level horizontal overflow at 320/375/390/430 portrait and 844x390 landscape. Headless WebGL absence may be reported but must not hide unrelated runtime errors.
- Career schema remains 17 and diagnostics schema remains 1.

## Build 11.85 architecture notes

### Between-round tactical intervention

- `index.html` owns the `#betweenRoundTactics` accessible overlay and its three option groups. `js/00-core.js` stores the DOM references.
- `js/40-match-flow.js` owns `betweenRoundTacticsState`, round evidence interpretation, preparation, rendering, option selection and commit. The result/sponsor sequence now reserves the round restart until the intervention is resolved.
- The intervention exposes only existing plan dimensions: `approachId`, `engagementId` and `priorityId`. At most two dimensions may differ from the round's base plan. Applying changes updates `careerState.tactics.activeMatchPlan`, records a compact `{ round, changes }` entry and then starts the next round. The saved manager tactics remain unchanged.
- `js/50-ui-menus.js` reports the blocked round-transition state in match controls. `js/35-career.js` labels the deployment control **Review Round Tactics** while intervention is outstanding.
- `css/game.css` owns the responsive portrait and landscape overlay. It may scroll internally on short viewports but must never create document-level horizontal overflow.

### Causal debrief

- `js/39-matchday.js` derives three high-level conclusions from completed telemetry: What Worked, Biggest Issue and Next Manager Action. Support ratio, trade conversion, shot sample, damage exchange, suitability, zone concentration and obstruction/stability evidence are evaluated in a stable priority order.
- Accuracy is considered reliable only from eight or more shots. A zero-shot or tiny sample must never be described as poor accuracy.
- The report renders the conclusion cards before detailed role, zone and AI-stability metrics, and shows any compact between-round adjustment timeline so the manager can relate interventions to the final result.

### Header history and verification

- The final mobile CSS override preserves normal-grid history controls. Forward occupies the far-right column and End Day uses the wider adjacent column at 361–430px; the <=360px layout keeps End Day on a full-width second row.
- `js/70-runtime.js` exposes `betweenRoundTacticsForTest()`, `forceBetweenRoundTacticsForTest()`, `selectBetweenRoundTacticForTest()` and `applyBetweenRoundTacticsForTest()` in addition to the retained tactical-analysis and menu-history helpers.
- `build.py` writes `dist/strikewatch-build-11.85.html`. Acceptance includes 320/375/390/430 portrait and 844x390 landscape geometry, real back/forward route restoration, two-change enforcement, adjustment logging, reliable-shot threshold checks, source/standalone syntax and deterministic output.
- Career schema remains 17 and diagnostics schema remains 1. No combat balance, economy or progression constants changed.

## Build 11.84 architecture notes

### Management priority and progressive disclosure

- `js/50-ui-menus.js` owns `menuPriorityItems()` and `renderMenuPriorityStrip()`. They combine the authoritative End Day blockers, deployment readiness and existing Command Centre recommendations into at most three ordered actions.
- `sectionHubPriorityCards()` turns Team, Armoury, Supplies and Club overviews into decision dashboards. `renderSectionHub()` renders the conclusions first and moves the complete route list into a native collapsed `<details class="section-hub-pages">` disclosure.
- `renderFoundationPath()` supplies the seven-step opening-week guide. `js/36-team-management.js` also places it in the Command Centre so the new-player route remains visible without requiring the Team hub.
- `css/game.css` owns the Build 11.84 sticky priority strip, dashboard cards, Foundation Plan, recovery panel and narrow-phone touch/readability overrides. The management pane remains the only vertical scroller under the retained Build 11.83 viewport contract.

### Career data recovery

- `js/35-career.js` owns active-save metadata, automatic previous-save rotation, portable JSON export, JSON import and restore-point swapping.
- Active save: `strikewatchCareerV1`. Automatic restore point: `strikewatchCareerBackupV1`. Save metadata: `strikewatchCareerSaveMetaV1`, including the protected-restore flag used after import or restore.
- Export wrapper format is `strikewatch-career`, format version 1. Import accepts that wrapper or a raw career object, then passes the data through the ordinary schema-17 normaliser.
- A successful import or restore resets transient match/menu state and returns to Command Centre. The replaced active career becomes the next restore point so one more restore reverses the swap.

### Build metadata and verification

- `js/00-core.js` is the single source for `BUILD_VERSION`, `BUILD_NAME` and `BUILD_ID`.
- `build.py` reads those constants, regenerates `js/strikewatch.dev.js`, inlines assets and writes `dist/strikewatch-build-12.19.html`. It rejects an `index.html` whose CSS or script cache ID does not match the source build ID.
- Build 11.84 debug coverage is exposed through `careerDataRecoveryForTest()`, `priorityUxForTest()`, `seedReadabilityCareerForTest()`, `createCareerBackupForTest()` and `restoreCareerBackupForTest()`.
- Career schema stays at 17 and diagnostics schema stays at 1. This release does not change match simulation, balance or the economy.

## Build 11.83 architecture notes

- `js/50-ui-menus.js` owns `restoreCommandViewportOrigin()` and `scrollCommandContentTargetIntoView()`. Routed actions may scroll `.menu-content` only; document, `.menu-shell` and `.menu-layout` scroll offsets must remain zero.
- `js/39-workflow-integrity.js` no longer calls `Element.scrollIntoView()` for arrival targets. `openManagementAction()` normalises the viewport before routing and runs the existing stabilisation pass without discarding the target content scroll.
- Route-tab activation now changes only `#menuSubnav.scrollLeft`, preventing horizontal tab discovery from vertically scrolling an overflow ancestor.
- The final portrait CSS marks the shell/layout as clipped, non-scrollable ancestors and leaves `.menu-content` as the only vertical Command HQ scroller.
- Preserve `menuViewportIntegrityForTest()` and `scrollManagementTargetForTest()`. Acceptance requires topbar visibility, zero window/shell/layout scroll, a valid content scroll, no bottom clipping and no horizontal overflow at 320/375/390/430 portrait widths.
- Save schema 17, diagnostic schema 1, balance, AI and economy values are unchanged.

## Build 11.82 architecture notes

- `index.html` keeps the existing header DOM order. `css/game.css` now converts that order into an explicit five-column portrait grid, placing Back, Gold balance, three manager shortcuts, End Day and Forward in independent cells.
- The portrait End Day control is a full-height integrated cell rather than a rounded inset card. Its title, compact status line and blocker badge are centred and clipped safely inside the assigned column.
- `js/50-ui-menus.js` retains the full accessible End Day reason while shortening only the visible blocked status line to prevent ellipsis on narrow phones.
- The 360-pixel override hides the Gold icon/supporting copy but retains the amount, while moving End Day into a dedicated 44-pixel second row. No save, diagnostic, balance, AI, match or economy logic changes.
- Acceptance requires static responsive geometry checks at 320/375/390/430 pixels, one End Day DOM control, no header overlap/overflow, source and standalone syntax checks and deterministic rebuild parity.

## Build 11.81 architecture notes

- `js/31-match-diagnostics.js` aggregates fight-location telemetry by authoritative `levelZoneAt()` labels. Each zone reports damage, hits, eliminations, active-combat time, contested time, congestion time, maximum friendly occupancy and team-mate movement/firing-lane blocks. `diagnosticBuildSummary()` adds compact `zoneAnalytics`, `fightLocation` and `aiStability` fields while keeping diagnostic schema 1.
- `js/30-bot-ai.js` stabilises ordinary movement and combat decisions: same-intent coordination goals preserve their current path, normal A* paths hold longer, non-urgent tactical choices occur less often and combat-approach routes accept modest target movement before refreshing. Emergency health/reload/contact and blocked-route recovery remain immediate.
- `js/35-career.js` copies only the compact completed zone/stability summary into `careerState.lastRound`; raw samples/events remain local diagnostics only. `js/39-matchday.js` renders the zone breakdown and uses concentration/congestion data for manager recommendations.
- `js/70-runtime.js` exposes `zoneAnalyticsForTest()`, `zoneAnalyticsScenarioForTest()`, `aiStabilityForTest()` and `coordinationPathReuseForTest()`. Acceptance requires same-intent path preservation, valid zone damage/elimination attribution, responsive report cards, all Office rotation/walkway/door checks and unchanged save schema 17/diagnostics schema 1.

## Build 11.80 architecture notes

- `js/30-bot-ai.js` adds four audited Office courtyard crossing lanes and per-operator two-stage rotation state (`entry` then `cross`). Selection uses personal contact silence, route staleness, role bias, friendly zone congestion and a team concurrency cap; no unseen enemy position is consulted.
- Rotation state is reset every round, cancelled by legitimate visual/audio contact or urgent hunt logic and bounded by entry/cross timeouts. Completed crossings return to the existing `chooseObjective()` patrol system rather than creating a second permanent navigation director.
- `js/31-match-diagnostics.js` records optional rotation state, `office_courtyard_rotation` events and two counters (`officeCourtyardRotations`, `officeCourtyardCrossings`) without changing diagnostics schema 1.
- `js/70-runtime.js` exposes `officeCourtyardRotationAuditForTest()` for four-lane bidirectional geometry and `forceOfficeCourtyardRotationForTest()` for a reachable live decision snapshot.
- Build 11.80 preserves the Build 11.79 Office prop clearance, weighted engagement plans, Viper-9 CR store offer and pending-transfer accent. Save schema 17 and diagnostics schema 1 remain unchanged.

## Build 11.79 architecture notes

- `js/00-core.js` refreshes the Office arena metadata: several north/south props are moved tighter to walls, courtyard-adjacent hotspots are expanded and engagement-plan rotation now tracks usage plus per-plan priority so the map uses more of the floorplan instead of over-favouring one lane.
- `js/38-development.js` extends the Supply Depot with a cash-purchase weapon offer. The depot can now sell a club-owned Viper-9 copy for CR while preserving the existing Gold Coin Field Crate flow.
- `css/game.css` strengthens the visual accent for pending transfer decisions and adds styling for the new depot cash-offer card.
- Build 11.79 keeps save schema 17 and diagnostics schema 1 unchanged. Acceptance requires Office walkway clearance on the marked props, more varied engagement-plan selection around the courtyard and a working Viper-9 CR purchase from Supplies.

## Build 11.78 architecture notes

- `js/39-workflow-integrity.js` owns exact management-action discovery/routing, arrival state, target highlighting, draft state and unsaved-navigation guards. It is concatenated after the career/league/management route modules and before match-flow/UI runtime modules.
- `js/50-ui-menus.js` consults the workflow guard before route/history changes, injects the active arrival banner and resolves notification-tab clicks through the exact action registry.
- `js/36-team-management.js`, `js/39-club-operations.js`, `js/39-matchday.js` and `js/38-development.js` render staged lineup, tactics and training values and commit them only through workflow Save Changes actions. Build 11.86 supersedes staged loadouts with immediate weapon-issue persistence.
- `js/39-club-operations.js` remains authoritative for End Day blockers. It supplies category, detail and exact target metadata; Operations renders grouped Must Respond actions without duplicating blocker logic.
- Transfer contracts remain owned by `js/39-transfers.js` and `js/39-recruitment-commercial.js`; the new workflow layer only routes to and explains their existing staged decisions.
- No draft enters persistence. Save schema 17 and diagnostic schema 1 are unchanged. Acceptance requires exact destination routing, unresolved-alert retention, save/discard boundaries, leave-page guards, grouped blockers, responsive fit and portrait/landscape diagnostic-segment checks.

## Build 11.76 architecture notes

- `js/38-development.js` owns the temporary personal-stat draft map, reversible delta validation, save/reset operations, the direct stat notification action and player allocation banner/action markup.
- `js/36-team-management.js` renders draft values without mutating the player and places Save Changes inside the contracted player's Technical Profile card.
- `index.html`, `js/50-ui-menus.js` and `css/game.css` own the single fixed top-right End Day control. The date panel is retired; the existing Calendar shortcut remains separate.
- `js/39-club-operations.js` remains authoritative for blockers and day advancement. A blocked attempt routes to `play`; `js/50-ui-menus.js` injects the red blocker strip only on that overview.
- No persistent schema field is added for drafts. Leaving or reloading before Save Changes safely discards them.

## Build 11.75 architecture notes

- `js/20-navigation.js` owns the per-frame planner budget and planner snapshot. `Bot.ensurePath()` in `js/30-bot-ai.js` consumes a slot before A*, briefly holds stable routes and uses local collision-tested bridging when deferred.
- `js/50-ui-menus.js` owns match viewport stabilisation and no longer renders the retired route locator. The section subnavigation is the only persistent management navigation beneath the topbar.
- `js/39-matchday.js` owns weapon-range compatibility copy for Tactics and deployment. This is a warning surface, not a hidden balance modifier.
- `js/00-core.js` owns one-event/one-sound door state. `js/31-match-diagnostics.js` exports optional planner counters without advancing diagnostics schema 1.
- Build 11.75 does not change save schema, diagnostic schema, finances, rewards, damage or opponent strength. Acceptance requires DPR-correct match startup, planner throttling, deduplicated doors, visible range warnings, removed locator space, mobile fit and unrelated regressions.

## Build 11.74 architecture notes

- `js/50-ui-menus.js` owns the route locator, primary-section defaults, section overview rendering, dynamic route/section notifications, recent-route tracking and Command Index filtering. `menuSections` is still the only authoritative route catalogue.
- `js/36-team-management.js` supplies route availability, locked explanations, actionable recommendations and route status text used by overview cards and the Command Index. These helpers read existing career state; they do not create a second navigation model.
- New overview routes are `play`, `team-hub`, `armoury-hub`, `supplies-hub` and `club-hub`. `profile` carries `contextOnly` metadata and appears in persistent subnavigation only while active. Build 11.86 retains `player-telemetry` only as a redirect alias to Profile.
- `index.html` contains `#menuRouteLocator` between the persistent manager header and the section tabs. `css/game.css` owns its mobile geometry, the overview cards, Command Index search/recommendation/recent surfaces and compact badges.
- `js/70-runtime.js` exposes `navigationDiscoverabilityForTest()` and `commandIndexSearchForTest(query)` and expands `commandIndexForTest()` with authoritative/discoverable/context route counts.
- Build 11.74 does not change save or diagnostic schemas. Required acceptance is 24 authoritative routes, 22 top-level discoverable routes, five section overview routes, two context-only routes, functional search/recommendations/recents/history, 44-pixel primary tabs and zero document overflow at 320/375/390/430 portrait widths, followed by unrelated state, league, crate, Office and door regressions.


## Build 11.73 architecture notes

- `js/39-matchday.js` owns the Role Effectiveness wording and arithmetic through `tacticalRoleExecutionMarkup()`. The rating affects role decision/coordination scaling already consumed by match creation; it does not add a second damage modifier.
- `js/30-bot-ai.js` owns operator-silhouette visibility. `firstOperatorOccludingView()` evaluates nearer living bodies using angular size, allows partial shoulder exposure, and treats crouched blockers as less obstructive. `resolveFriendlyViewOcclusion()` uses only the last legitimately seen point and is bounded by time/displacement.
- `index.html` places the single Back and Forward controls directly in `.manager-topbar`; `css/game.css` positions them at the outer edges and suppresses the retired main-context history rail. `js/50-ui-menus.js` remains the route-history authority.
- `js/70-runtime.js` exposes `roleExecutionCopyForTest()` and `operatorViewOcclusionForTest()` and includes temporary view-occlusion state in debug snapshots.

## Build 11.72 architecture notes

- `js/35-career.js` owns the five team-emblem definitions, identity normalisation, creation controls and shared SVG/name-lockup rendering. `teamIdentity` is an optional schema-17 field so older careers migrate without a schema bump.
- `js/50-ui-menus.js` owns the five-section primary navigation. The compatibility route ID `store` belongs to the player-facing **Supplies** section and renders **Supply Depot**.
- `js/40-match-flow.js` renders the small head/crosshair feed badge from the existing authoritative headshot flag.
- `js/00-core.js` owns Office wall-screen placement and `js/61-world-renderer.js` owns their shallow wall-mounted mesh. These displays remain decorative and must not intrude into the navigation corridor.
- `css/game.css` owns the white topbar-icon treatment, bounded legibility floors, responsive five-tab layout and reusable club-logo sizing.
- Release helpers added for this pass are `officeWallDisplayAuditForTest()` and `teamIdentityForTest()`. Existing award, Foundation Parity, performance-diagnostics, Office walkway/door, league and state-integrity helpers provide the balance/regression gates.

## Current release files

```text
strikewatch-source-12.82/
├── 00-READ-FIRST-GPT.md
├── AGENTS.md
├── DOCUMENTATION-INDEX.md
├── GPT-HANDOFF-PROMPT.txt
├── PROJECT.md
├── README.md
├── AUDIT-*.md                 # historical release records plus current AUDIT-12.82.md
├── build.py
├── index.html
├── css/
│   └── game.css
├── js/
│   ├── 00-core.js
│   ├── 10-audio.js
│   ├── 20-navigation.js
│   ├── 30-bot-ai.js
│   ├── 31-match-diagnostics.js
│   ├── 32-tactical-minimap.js
│   ├── 33-season-narrative-state.js
│   ├── 34-squad-dynamics.js
│   ├── 35-career.js
│   ├── 36-team-management.js
│   ├── 37-league.js
│   ├── 38-development.js
│   ├── 39-infrastructure.js
│   ├── 39-calendar-finance.js
│   ├── 39-club-operations.js
│   ├── 39-dynamic-market-mail.js
│   ├── 39-matchday.js
│   ├── 39-medical.js
│   ├── 39-opposition-intelligence.js
│   ├── 39-recruitment-commercial.js
│   ├── 39-transfers.js
│   ├── 39-workflow-integrity.js
│   ├── 40-match-flow.js
│   ├── 41-live-command-pulses.js
│   ├── 50-ui-menus.js
│   ├── 52-season-narratives.js
│   ├── 55-opening-week.js
│   ├── 56-world-press-awards.js
│   ├── 60-renderer-core.js
│   ├── 61-world-renderer.js
│   ├── 62-character-renderer.js
│   ├── 63-viewmodel-renderer.js
│   ├── 64-reward-renderer.js
│   ├── 70-runtime.js
│   └── strikewatch.dev.js     # generated; do not edit directly
└── dist/
    └── strikewatch-build-12.70.html
```


## Build 11.71 match-performance diagnostics architecture

Build 11.71 extends the local diagnostics recorder without changing diagnostic schema 1. `js/70-runtime.js` now measures two distinct timings: actual requestAnimationFrame interval for user-visible FPS/stutter and frame work time for update/render cost. `recordRuntimePerformance()` forwards those values to `diagnosticRecordPerformanceFrame()` after the existing adaptive-resolution decision, so recording remains read-only and cannot influence quality tiers or simulation.

`js/31-match-diagnostics.js` owns the per-match performance aggregate. It stores overall counters plus bounded segments keyed by orientation and view mode, such as `portrait:windowed` and `landscape:maximized`. Each segment records frame count, active duration, average/minimum FPS, min/max/average frame interval, average/max work cost, update/render averages, 22/34/50/100 ms spike counts, work-budget overruns, scale changes and first/last display geometry. The report also retains browser/platform capability metadata and at most 12 worst active frames with viewport, DPR, render scale and canvas dimensions.

Frames outside the live match, intervals above 250 ms and frames recorded while the document is hidden are excluded from FPS averages and counted separately. This prevents app switching or a suspended browser tab from appearing as live match stutter while preserving evidence that exclusions occurred. Orientation, view-mode and render-scale transitions are emitted as bounded diagnostic events. The existing 90-second/360-snapshot window now includes a compact performance object in each sample, while full-match aggregates continue beyond that rolling window.

`diagnosticBuildExportPayload()` adds top-level `performance`; the completed compact summary also retains the same report for summary-only exports. No network request is introduced, nothing enters the career save, and the localStorage key remains `strikewatchDiagnosticSummariesV1`. `window.__strikeDebug.performanceDiagnosticsForTest()` exposes the aggregate and `diagnosticsPerformanceFrameForTest()` injects deterministic timing samples for regression.

Required Build 11.71 checks:

- inject normal, slow, stutter, severe and excluded intervals and verify exact counts, average/minimum FPS and the 12-record worst-frame cap;
- exercise portrait/windowed and landscape/maximised states and require separate segments plus transition counts;
- confirm every retained diagnostic snapshot contains orientation, view mode, viewport, renderer and current frame timing;
- parse the modular and standalone JSON payloads and retain schema 1, ten bot states per complete snapshot and the existing event/snapshot caps;
- run Build 11.70 headshot/critical arithmetic, Foundation Parity and adaptive-resolution helpers, then unrelated doors, league schedule and state-integrity regressions.

Build 11.71 otherwise retains Build 11.70 gameplay, balance and rendering behaviour unchanged.


## Build 11.70 headshot, opening-balance and portrait-performance architecture

### Headshot and critical-hit resolution

- `js/35-career.js` owns `CAREER_BASE_HEADSHOT_CHANCE`, Marksmanship scaling, maximum chance, weapon multipliers, `headshotCombatProfile()`, `rollHeadshot()` and player-facing profile helpers. Every owned and generated opposition weapon carries `headshotMultiplier` in its authoritative catalogue record.
- `js/30-bot-ai.js` resolves a normal hit before location/critical rolls. Headshot and critical outcomes are independent and stack multiplicatively: `baseDamage × locationMultiplier × criticalMultiplier`. The same path records round headshots/critical headshots and fatal headshots for either team.
- `js/40-match-flow.js` owns HS/CRIT elimination badges and `HEADSHOT`, `CRIT HEADSHOT`, `HEADSHOT DOWN` and `CRIT HEADSHOT DOWN` floating labels. `js/61-world-renderer.js` raises a landed headshot tracer toward head height; misses retain wider endpoint spread.
- `js/36-team-management.js` persists optional headshot fields in match and career records and shows effective controlled-range headshot chance/power in player profiles. `js/31-match-diagnostics.js` adds headshot counters/events while retaining diagnostic export schema 1.

### Introductory Division 3 balance

- `js/37-league.js` owns `leagueFoundationBalanceProfile()`. During only the first three user league fixtures in Division 3, it compares the starting-five average with the active opponent. When that opponent is materially stronger, cloned match players are adjusted to a progressive cap: user average +1 on matchday 1, +2 on matchday 2 and +3 on matchday 3, clamped to 16–30. This prevents the cheapest valid foundation squad from being forced against the division's historical 22-rating floor immediately.
- The protection cannot raise opposition, does not mutate the persistent rival roster, does not affect exhibitions or later fixtures, and is shown in the final deployment tactics grid as **Foundation Parity Active** or **Naturally Balanced**. Ordinary Plan Fit and tactics continue to matter.

### Portrait rendering governor

- `js/61-world-renderer.js` caps effective DPR to 1.35 in portrait windowed matches, 1.55 in maximised mode and 1.65 elsewhere, then applies the adaptive resolution scale. This primarily reduces fragment work and canvas memory on high-DPR iPhones.
- `js/70-runtime.js` samples update/render/frame cost. Sustained slow frames lower the scale in 0.08 tiers to 0.72 portrait/0.80 otherwise; a long stable recovery raises it in 0.05 tiers. A tier change sets the new scale and resizes once. Per-frame interpolation and repeated canvas reallocations are prohibited.
- Portrait match CSS disables backdrop filters on live chrome and reduces the overlay composite while preserving interface readability and simulation timing. `portraitPerformanceForTest()` exposes frame averages, DPR, scale, canvas dimensions and long-frame count.

Build 11.70 retains career save schema 17, diagnostics schema 1, all Build 11.69 transfer/Office work, Build 11.68 door/Training behaviour, existing weapon ownership, reward odds and the 20-club/38-match league format.


## Build 11.69 negotiation-flow and Office-polish architecture

### One-popup incoming recruitment lifecycle

- `js/39-transfers.js` owns `acceptIncomingTransferCounter()`, `incomingTransferTermsLine()`, the popup action templates and `handleTransferModalAction()`. `js/36-team-management.js` delegates shared-note actions to the transfer handler before processing ordinary management notices.
- Submitting an incoming package calls `showIncomingTransferResponseModal()` immediately. A counter replaces the existing popup body/actions; accepting the counter copies the requested fee/wage/contract into the offered terms and re-renders that same popup as **Terms Agreed**; completion calls the authoritative enhanced `completeIncomingTransfer()` and replaces the popup again with the signed result.
- The popup terms line includes fee, weekly wage, contract length, signing bonus, appearance bonus and promised squad status. The enhanced overrides in `js/39-recruitment-commercial.js` continue to own scoring, deadlines, bonuses, transfer-window checks and contract promises. The popup layer presents and routes decisions but does not bypass those checks.
- `incomingTransferModalForTest()` exposes the active state and actions. `acceptIncomingCounterForTest()` covers counter acceptance. Back to Negotiation closes the shared overlay, keeps the active deal and returns to `transfers`; View Squad closes and routes to `operators`.

### Recruitment index rating presentation

- `recruitmentAbilityStars()` derives a five-step star visual from `recruitmentAbilityDisplay()`. Below 88 scouting knowledge, it converts the visible estimate range midpoint, preventing the index from leaking the exact hidden rating. Confirmed reports use the confirmed display value.
- `renderEnhancedRecruitmentMarket()` places both ability and potential rows inside every candidate card. `recruitmentIndexRatingsForTest()` exposes the displayed values and star strings for release checks.

### Header and Office environment presentation

- `css/game.css` removes the enclosing border, radius, fill and shadow from `.manager-date-panel` while retaining its established 44-pixel target, route listener, date hierarchy and focus/hover underline.
- The Office conference table is authored at `(18.0, 21.55)` with reduced dimensions, outside the row-18 east/west transit band. `officeWalkwayAuditForTest()` checks table clearance, direct prop clearance and A* reachability.
- `js/61-world-renderer.js` owns `OFFICE_CARPET_PRESENTATION` and `officeCarpetPresentationSnapshot()`. The Office floor uses a dark textile base, alternating one-unit row bands, restrained vertical weave and high roughness. Zone tinting is subdued and courtyard/rug materials remain layered above the carpet.

Build 11.69 does not advance career or diagnostics schemas, alter transfer persistence, change recruitment hidden attributes, modify match balance or change the Build 11.68 persistent-door lifecycle.


## Build 11.68 office-door and Training viewport architecture

### Persistent door lifecycle and visibility

- Door definitions remain in `ARENA_LIBRARY[*].props.doors`; `js/00-core.js` owns `ACTIVE_DOOR_STATES`, `openedPermanently`, moving panel descriptors and dynamic collision. `startRound()` resets them closed. The first living operator within 1.38 units latches the door open until the next round.
- The transition from `closed` to `opening` emits one cosmetic `doorOpen` event. `js/10-audio.js` owns its generated motor/rail/latch buffer and spatial profile. `openingSoundPlayed` prevents duplicate cues during the same round. Door audio is presentation-only and does not create AI hearing evidence.
- `js/61-world-renderer.js` draws the same state with wall-tie jambs, a header/lintel, metal threshold, more readable frosted glass and a safety strip. These additions visually bridge each frame into the neighbouring wall cells instead of creating a second decorative object.
- `doorPlacementAuditForTest()` checks the map opening and two flanking wall cells for every door. Nearby Office furniture is authored outside each approach/open-panel corridor. `doorInteractionForTest()` checks closed blocking, navigation planning, open clearance, automatic opening, occupant safety, one sound and persistent opening after the area clears.

### Atomic debrief-to-Training transition

- `handleTeamNoteModalAction()` writes the recommendation without an intermediate render, blurs the active modal control, closes the overlay without restoring focus and routes to Training.
- `scrollTrainingRecommendationIntoView()` calculates a target offset relative to `.menu-content` and calls that scroller directly. It must not invoke page-level `scrollIntoView()` or focus the programme `<select>`; both operations can alter the iOS visual viewport.
- `stabiliseMenuViewportAfterRoute()` refreshes `--strike-visual-viewport-height`, forces reflow without repeatedly resetting the route scroll, and restores the recommendation after the final viewport pass. Portrait CSS applies that measured height to `#app`, `.menu-shell` and the shared note overlay.
- Release checks use the actual modal action via `managerTrainingTransitionForTest()` at 320/375/390/430 pixels and assert route `training`, hidden modal, removed body lock, non-select focus, scrollable full-height content and a negligible app-to-viewport bottom gap.

Build 11.68 does not advance career or diagnostics schemas and does not alter door locations, route planning authority, weapon balance, crate rewards, Gold Coin cost or match settlement.


## Retained Build 11.63 — dynamic arenas, doors, spectator handoff and cash economy

### Engagement-plan ownership

`js/00-core.js` owns each arena's `engagementPlans`, the per-arena shuffled rotation bag, `currentEngagementPlan`, `selectRoundEngagementPlan()` and `openingObjectiveForBot()`. `js/40-match-flow.js` selects a plan before resetting operators at the start of each round. `js/30-bot-ai.js` stores the assigned opening objective for up to 24 simulated seconds, while visible/heard/remembered combat evidence remains higher priority. `js/31-match-diagnostics.js` records the selected plan and assigned opening objectives.

A plan contains exactly five blue and five red destinations. Destinations must be clear of authored props and reachable from the matching spawn. The release audits are `engagementPlanAuditForTest()`, `engagementRotationAuditForTest()` and `arenaPointAuditForTest()`. The rotation bag uses every plan once before reshuffling and prevents a boundary repeat.

### Dynamic-door ownership

Door definitions remain in `ARENA_LIBRARY[*].props.doors`. `js/00-core.js` owns `ACTIVE_DOOR_STATES`, panel descriptors, collision generation and proximity-driven lifecycle. Static posts are part of `LEVEL_PROP_COLLIDERS`; moving panels are supplied by `dynamicDoorColliders()`. Normal movement/LOS/projectile checks include panels. `js/20-navigation.js` uses the door-ignoring navigation clearance helpers so routes can be planned through a doorway and the local proximity sensor can open it. `js/61-world-renderer.js` and `js/32-tactical-minimap.js` consume the same live state.

Doors start closed, open near a living operator and remain latched open until the next round reset. `doorInteractionForTest()` verifies closed blocking, A* traversal, open clearance, proximity opening, anti-crush holding, one-shot audio and persistent opening; `doorPlacementAuditForTest()` verifies that authored frames sit between wall cells.

### Office environment ownership

Skyline Offices prop definitions remain in `js/00-core.js`; detailed procedural models remain in `js/61-world-renderer.js`. Build 11.63 adds workstation pods, improved desks, seating, storage lockers/cabinets, vending and kitchenette equipment while retaining clear routes and the central courtyard. All five information displays are wall-mounted and validated by `officeScreenAuditForTest()`.

### Spectator and finance ownership

`js/70-runtime.js` owns `updateSpectatorDeathHandoff()`. When the viewed owned operator dies and another owned operator is alive, the camera waits exactly two seconds before selecting the next available owned operator. `js/36-team-management.js` owns `teamMatchRewardBreakdown()`: defeat income is positive but substantially below victory income, and the result reward is itemised in the post-match finance panel. `js/50-ui-menus.js` now keeps the top-left Gold Coin header synchronised with `careerState.goldCoins`; ordinary `careerState.credits` remains visible in Finance and other cash-cost routes. The retained DOM IDs remain compatibility hooks.

At Build 11.63 the career save remained schema 14. Build 11.64 advanced it to schema 15, Build 11.65 to schema 16, and Build 11.66 to schema 17 with migration compatibility for earlier careers; diagnostic schema remains 1.



## Build 11.67 crate hierarchy and header architecture

### Shared crate transform hierarchy

- `js/64-reward-renderer.js` owns the shared crate transform. `rewardTransformFromRootPivot()` first transforms a body-local hinge pivot by the player-controlled root yaw and then transforms the lid/rail offset by root yaw plus local pitch.
- `rewardCrateLidPose()` is the sole centre/pitch calculation for the animated lid. Lid-mounted bands, latches and hinge pieces inherit that returned pose. `rewardCrateRailPose()` applies the same root hierarchy to the short support rails.
- `rewardCrateAttachmentAudit(yaw, openingProgress)` reverses the lid-centre offset and compares the recovered hinge with the expected rotated pivot. `js/70-runtime.js` exposes it as `window.__strikeDebug.crateAttachmentForTest()` for deterministic release tests.
- The transform fix is presentation-only. `#careerCrateCanvas`, `syncCareerCrateCanvasHost()`, crate opening state, the 60-GC Store cost, `CAREER_CRATE_REWARDS`, inventory settlement and duplicate-cosmetic conversion are unchanged.

### Command HQ header polish

- `css/game.css` owns the final Build 11.67 header override. `.manager-gold-brand` is a flat integrated shortcut with a subtle divider/accent rather than an enclosing pill, while retaining its coin glyph, live balance and 44-pixel target.
- `js/50-ui-menus.js` formats `#managerDateDay` as zero-padded `DD MON YYYY`. The date receives larger primary and metadata type; at 360 pixels and below the topbar reserves a 44-pixel second row so the Calendar shortcut remains readable and tappable.
- Existing click ownership remains in `js/70-runtime.js`: Gold routes to `gold`, date routes to `calendar`. Build 11.66 Command Index, account cross-links and finance analytics remain authoritative.

### Build 11.67 debug and acceptance helpers

- Preserve `crateAttachmentForTest(yaw, openingProgress)` alongside `sharedCrateHostForTest()`, `commandIndexForTest()`, `currencyLedgerForTest()` and the prior finance/league/combat helpers.
- Acceptance requires hinge-gap checks across negative/positive yaw and 0–1 opening progress, one shared canvas in both hosts, no retired substitute crate, 44-pixel Gold/date controls, readable date copy and no document-level overflow at 320/375/390/430 portrait widths.
- Run syntax checks on the modular/generated scripts, verify deterministic build parity, and perform a separate regression pass over reward pool, repeated weapon copies, 20-club/380-fixture league structure, management routing and combat diagnostics.
- Career save schema remains 17 with schema-16/schema-15/schema-14 migration compatibility. Diagnostics remain schema 1.


## Build 11.66 navigation and finance architecture

### Route discoverability

- `js/50-ui-menus.js` remains the authority for `menuSections` and `menuTabMeta`. The new `gold` route belongs to the Club section between Finances and Commercial.
- `renderCommandFeatureDirectory()` in `js/36-team-management.js` reads `menuSections` at render time. It must not persist duplicate route metadata. Route status is derived from live state such as unread mail, calendar events, development points, cash, Gold Coins and pending crates.
- `#managerGoldBtn` and `#managerDatePanel` are semantic buttons in `index.html`; their DOM references are owned by `js/00-core.js`, event routing by `js/70-runtime.js`, and state/accessibility labels by `updateMenuUI()`.

### Gold Coin account

- `renderGoldCoinOverviewTab()` in `js/38-development.js` owns the Gold Coin account page. `goldCoinAccountSummary()` derives earned, spent, match income, league/exhibition splits and average award from `careerState.goldCoinHistory` without mutating it.
- `renderGoldCoinTrend()` is a presentation-only recent movement graph. Exact earning rules continue to come from `careerGoldCoinRewardBreakdown()`; Store cost continues to come from `CAREER_GOLD_COIN_CRATE_PRICE`.
- The Gold account, Store and cash Finances routes cross-link through ordinary `data-team-route` buttons. Purchases remain Store-only and use the Build 11.65 shared 3D crate contract.

### Cash analytics

- `teamFinanceTransaction()` now stores `{id, week, day, type, amount, label}` and retains the newest 80 entries. New-team creation records the foundation-loan principal as a `FOUNDATION` income entry.
- `teamFinanceAnalyticsSnapshot()` derives income, outgoings, net, category groups, weekly groups and retained running-balance points. `renderFinanceCashflowChart()`, `renderFinanceBalanceChart()` and `renderFinanceCategoryBreakdown()` are pure render helpers.
- The running opening balance is inferred from the current balance minus the retained transaction delta. It is explicitly a retained-window view, not a complete audited history when older transactions have rolled out.
- Save schema 17 normalises legacy finance entries with generated migration ids and optional day values. Both cash and Gold Coin histories retain 80 entries. No currency is converted into the other.

### Build 11.66 debug and acceptance helpers

- `setMenuRouteForTest(route)` routes through the real menu system.
- `financeAnalyticsForTest()` exposes derived totals, weeks, categories, balance points and visible panel counts.
- `commandIndexForTest()` compares authoritative menu routes with the generated discoverability directory.
- `currencyLedgerForTest()` exposes full retained cash/Gold histories for non-mutating render checks.
- `addFinanceTransactionForTest()` and `addGoldCoinTransactionForTest()` seed deterministic presentation checks only.
- Acceptance requires mobile header/date bounds, Gold/date click routing, four Command Index groups, every real route discoverable, positive and negative finance categories, weekly and balance graphs, currency cross-links, no document overflow, schema-16 migration and prior shared-crate/arsenal/league regressions.


## Build 11.65 shared crate, counted arsenal, AR-4 and full-season architecture

- `js/64-reward-renderer.js` owns `syncCareerCrateCanvasHost()`. It moves the one `#careerCrateCanvas` between `#careerCrateCanvasHome` in the reward overlay and `[data-store-crate-host]` in the Store. The retired store-only SVG/CSS crate must not return.
- `js/35-career.js` owns schema 16, duplicate-preserving `inventory`, copy-count and assignment helpers, transfer-safe `equipCareerWeapon()`, the four-entry crate pool and the authoritative AR-4 weapon/stat/geometry record. Repeated weapon IDs are meaningful data and must not be deduplicated during saving or migration.
- `careerWeaponVisualParts()` contains the 34-part AR-4 model. `js/63-viewmodel-renderer.js`, `js/62-character-renderer.js` and the HTML reward/Armoury markup all consume those parts; context code may pose or scale the model but may not redefine its geometry.
- `js/37-league.js` owns the 20-club double round robin. `leagueBuildSchedule()` creates 19 first-leg matchdays plus a reversed 19-matchday second leg. League state version 2 expects 380 fixtures and migrates played legacy fixtures into the first compatible home/away slot.
- Runtime integrity checks compare finite weapon assignments against repeated inventory counts and audit 190 unordered league pairs, two reversed fixtures per pair, 38 user fixtures and matchdays 1–38.

## Build 11.64 Gold Coin economy and loot-shop contract

- Gold Coins (`goldCoins`) are a dedicated store currency and are not interchangeable with ordinary club credits. Transfer fees, wages, staff costs, loan repayments and sponsorship continue to use credits only.
- Every completed first-to-three match awards Gold Coins alongside normal cash income. League matches pay 3 participation coins, 1 coin per round won, 7 for victory and 2 for a clean sweep; exhibitions use 2 participation, 1 per round won, 5 for victory and 1 for a sweep. Defeats always earn less than victories but never zero.
- The active Field Crate costs 60 Gold Coins. This price is intended to require roughly four to six league victories for an additional purchased crate, while losses contribute more slowly. Victory crates remain free and unchanged.
- Store purchases use the exact same `CAREER_CRATE_REWARDS`, animation, three-dimensional renderer, duplicate conversion and claim logic as post-match victory crates. Do not create a separate store-only loot table or duplicate reward implementation.
- A purchased crate and its rolled reward are persisted in `pendingStoreCrate` before the overlay opens, so refreshing or leaving the page cannot consume coins without preserving the purchase. Claiming clears the pending purchase and returns to the Store.
- Build 11.64 used save schema 15. Build 11.65 now uses schema 16; schema-15/schema-14 careers migrate without losing Gold Coins, pending purchases, ordinary credits, squads, repeated weapon copies, skins, league data or diagnostics.
- The Command HQ top-left identity shows Gold Coins with the coin icon. Ordinary cash remains visible in Finances, recruitment, transfers and other relevant management screens.
- Required acceptance includes deterministic win/loss/sweep calculations, lower defeat awards, cash and Gold Coin settlement in the same report, insufficient-funds protection, single deduction per purchase, persisted pending crates, exact shared loot odds, duplicate conversion, Store return routing, responsive header/store layouts and save migration.

### Gold Coin source ownership

- `js/35-career.js` owns save schema 16, Gold Coin reward calculation and settlement, the bounded transaction history, the 60-GC price, persisted `pendingStoreCrate` purchases and the shared crate opening/claim flow.
- `js/38-development.js` owns the active Club Store route, balance/progress presentation, shared loot odds, recent transaction ledger and the purchase action.
- `js/50-ui-menus.js` owns the top-left Gold Coin balance display and Store navigation labels. It must not replace cash values in Finance or other ordinary club-cost routes.
- `js/70-runtime.js` exposes Gold Coin migration, calculation, purchase and claim debug helpers for deterministic release testing. These helpers are test-only and must not create a second production economy path.
- `css/game.css` owns responsive Gold Coin header, report and Store presentation. The full balance must remain legible at 320, 375, 390 and 430 CSS-pixel portrait widths.

## Build 11.62 — weapon reload audio

Reload handling now uses five spatial Web Audio cues aligned with the shared reload animation timeline: control release, magazine removal, magazine insertion, magazine seating and slide/bolt rack. `js/10-audio.js` synthesises profile-specific buffers for worn pistols, service pistols, compact pistols, SMGs, carbines and rifles. `Bot.updateReloadAudioCues()` in `js/30-bot-ai.js` owns threshold crossing so first-person and world-held reload presentation remain synchronised.

All combat-capable weapon records must declare `reloadAudioProfile`. `validateCareerWeaponReloadAudioCoverage()` treats missing or unsupported catalogue entries as a release failure. Future weapon work must update the authoritative weapon catalogue, loadout/reward exposure, geometry/presentation and reload audio together rather than creating audio-only aliases.

Reload cues remain cosmetic: they use spatial falloff and occlusion but are not inserted into AI evidence or perception. They respect mute and browser audio lifecycle state. Weapon damage, range, cadence, magazine size and reload duration are unchanged by Build 11.62.

## Build 11.61 movement and combat presentation ownership

### Module ownership

- `js/30-bot-ai.js` owns locomotion smoothing and the live presentation state derived from authoritative AI: visual velocity, body/aim render angles, forward/strafe/backpedal/turn blends, shoulder bias, corner readiness, weapon readiness, crouch timing, hit reaction state and death-impact state.
- `js/35-career.js` owns `careerWeaponReloadPhases()`, the shared reload timeline consumed by every renderer alongside `CAREER_WEAPON_CATALOG` and `careerWeaponVisualParts()`.
- `js/60-renderer-core.js` owns persistent first-person recoil and locomotion-bob spring state.
- `js/62-character-renderer.js` owns third-person lower/upper-body separation, directional leg posing, world-held reload articulation, hit reaction and procedural death staging.
- `js/63-viewmodel-renderer.js` owns first-person damped recoil, movement bob, hit flinch and shared reload articulation.
- `js/31-match-diagnostics.js` records selected visual-state values without changing diagnostics schema 1.
- `js/70-runtime.js` exposes pure/debug audit helpers and must snapshot/restore all animation fields in combat regression scenarios.

### Behavioural boundaries

- Authoritative `angle`, target visibility, shooting, collision and navigation remain gameplay truth. Render angles and blends only control presentation.
- `locomotionSpeed` changes actual velocity gradually but remains capped by the existing requested movement speed. No animation pass may create extra range, damage, teleportation or wall knowledge.
- Crouch decisions retain a minimum stance time. Existing stationary-crouch and out-of-range deadlock breakers remain higher-priority safeguards.
- Reload phases move the full magazine assembly and slide consistently in first- and third-person. Weapon balance values are not changed by this release.

### Required regression surface

- Validate finite blend values, capped angular lag, acceleration/deceleration convergence, directional movement snapshots and crouch stability.
- Validate magazine release, insertion, slide lock/rack and weapon lowering at representative reload progress values.
- Run live matches on both arenas long enough to confirm movement, target acquisition, eliminations and round progress.
- Repeat combat-deadlock, diagnostic replay, out-of-range crouch, operator-line-blocker and navigation-traffic tests.
- Recheck deployment, minimap, landscape rotation gate, post-report Training navigation, save/state integrity, deterministic standalone output and source ZIP integrity.

## Build 11.60 landscape view ownership

`js/50-ui-menus.js` owns physical-orientation detection, full-view request state and the rotation-gate lifecycle through `syncViewMode()`, `maximizeGameView()` and `restoreWindowedView()`. `index.html` owns the accessible `#landscapeRotationGate` markup and `#landscapeReturnPortraitBtn`; `css/game.css` owns the opaque prompt, safe-area-aware landscape control pair and panel sizing. `js/70-runtime.js` wires the return button and exposes `landscapeViewForTest()`, `requestLandscapeForTest()` and `restorePortraitForTest()`.

The minimap itself remains entirely in `js/32-tactical-minimap.js`. Landscape only exposes the existing button and canvas; it must not duplicate map geometry, visibility state or opponent data. A portrait full-view request shows the rotation gate until the viewport is genuinely landscape, instead of exposing the earlier rotated in-page fallback. The gate closes live minimap/diagnostic overlays and uses the standard restore path to leave full view.

Required Build 11.60 tests cover 320/375/390/430 portrait gate bounds and copy, the gate return button, actual 844×390/852×393/932×430 landscape transitions, safe-area spacing between diagnostic/minimap/restore controls, both-map marker counts, menu/scoreboard hiding, keyboard/close behaviour and retained Build 11.59 training-route, Build 11.58 deployment and Build 11.56 deadlock regressions.

Build 11.24 adds the Football Manager-style club-operations layer: a simulated daily calendar, End Day flow, persistent Inbox, assistant-manager recruitment and delegation, tactical formations, division-locked staff/player search pools, scouting stars and a four-tier league pyramid beginning in Division 3. Daily calendar progression now advances technical training, fatigue recovery and medical recovery. Low-health cover duels use deterministic initiative so both operators do not remain indefinitely hidden. Build 11.22 mobile combat, sprint audio, target exposure, damage feedback and environment polish remain authoritative.




Build 11.59 fixes the cross-route lifecycle from post-match operator comments into the Training Facility. `js/36-team-management.js` owns the atomic manager-feedback action and modal focus policy; `js/38-development.js` provides the silent `{ render: false }` training assignment used by compound actions; `js/50-ui-menus.js` owns `stabiliseMenuViewportAfterRoute()`; `js/70-runtime.js` owns viewport listeners and the regression helper; and `css/game.css` makes fixed insets, rather than an explicit `100dvh` height, authoritative for portrait Command HQ.

The failure was specific to an iOS-style modal/focus transition: Team Telemetry could be rendered once while the note was still open, then Safari could retain a smaller dynamic viewport and expose the black body background below the management shell. The corrected order is assign silently → persist selected player/recommendation → close without stale focus restoration → blur → route to Training → reset/reflow immediately, across two animation frames and after a short delay. Ordinary modal closes retain normal focus restoration.

Required Build 11.59 tests cover the clickable telemetry/debrief action at 320/375/390/430 widths, `managerTrainingTransitionForTest()`, app/shell bottom parity with `innerHeight`, body-lock/modal cleanup, recommendation persistence and top-of-route scrolling, plus unrelated deployment, all three shared weapon profiles and deadlock regression.

Build 11.58 inserts a final deployment review between tactical confirmation and timed matchmaking. `index.html` owns the deployment/session shells, `js/50-ui-menus.js` owns review state and transition logic, `js/32-tactical-minimap.js` owns non-mutating map-card previews, and `js/70-runtime.js` owns events/debug surfaces. Tactics retains a default arena, but the review is the final choice for a newly prepared match. It presents the opponent, both maps, starting five, temporary roles, equipped weapons and confirmed tactical plan before activating the arena. Intermediate rounds remain direct.

Build 11.58 also makes weapon presentation metadata explicit in the existing single source of truth. `CAREER_WEAPON_CATALOG` owns `viewmodelPose` and `muzzleProfile`; `careerWeaponPresentation()` derives player-facing range, cadence, recoil, reload and role-use language from the same gameplay entry. Armoury/loadout, deployment, matchmaking, renderer, diagnostics and reward paths must resolve that catalog entry rather than duplicating identity data. `js/63-viewmodel-renderer.js` uses those profiles for connected positioning, magazine/base removal and insertion, empty-magazine slide lock, rack motion, muzzle flash, bounded procedural smoke and ejected cases. Gameplay balance values remain unchanged.

Build 11.52 addresses long-standing combat-navigation failures at their shared causes. Visible targets are rescored continuously, closer operator blockers override distant targets, actor obstruction prevents shooting through operators, visible-combat and crouch locomotion watchdogs force movement when progress stops, repeated Entry support waits are bounded by a commitment window, and A* uses same-team traffic as a soft cost without leaking unseen enemy positions. Build 11.51 management notices, Build 11.50 portrait alignment and save schema 14 remain authoritative.

Build 11.50 makes Inbox chronology explicit and closes three portrait layout regressions. `clubMailNewestFirst()` renders the latest message first without rewriting save data; the popup envelope occupies a bounded header icon box; Armoury inventory cards fill the portrait panel instead of ending at 78vw; and Starting Five debrief notes no longer inherit the player-header flex rules that caused label, quote and insight overlap. Build 11.49 popup decisions, Build 11.48 overlay lifecycle, Build 11.46 Command Centre, Build 11.45 onboarding/navigation and save schema 14 remain authoritative.

Build 11.44 turns the club schedule into a proper simulated date system. Careers begin on Monday 3 August 2026, retain `absoluteDay` for deterministic progression and derive real day/month/year labels for the header, month calendar and agenda. The Calendar now renders a 42-cell month grid with navigation and descriptive glance labels. Sponsor presentation is also refined: the portrait partner bug aligns its logo and text, while the between-round branded bumper remains visible for five seconds and extends the round transition safely.

Build 11.43 improves sponsor presentation during live matches. The bottom-corner sponsor bug now keeps its **PARTNERS OF** label in portrait, and active deals trigger a short branded broadcast bumper between non-final rounds. The ordinary round result appears first, the bumper uses the current club name and sponsor identity, and the transition is cleared before the next round or any match-complete flow.

Build 11.42 adds a dedicated management calendar, converts the opening cash into a scheduled foundation loan and hardens long-standing audio/elimination paths. The Calendar uses a five-week block view plus an agenda for fixtures, finances, contracts, medical returns, scouting and commercial/transfer deadlines. Own-team scoreboard clicks now open individual telemetry, the Inbox is limited to four visible rows, audio is monitored by a recovery watchdog and kill-feed construction tolerates missing weapon metadata.

Build 11.41 corrects the shared career sidearm geometry so the grip, magazine and new supporting grip pieces read naturally everywhere that consumes the source-of-truth pistol profile. Inventory cards, Armoury inspection, reward-crate previews, world-held pistols and first-person pistols now inherit the same cleaner silhouette.

Build 11.40 refreshes the Command HQ header hierarchy. The top-left identity block now shows the active team name and team level instead of the static Strikewatch / Command HQ label, while the top-right header area is reserved for a larger club-date card so the day, week and season stay readable on phones. The manager profile no longer competes with the calendar for space, and the header must remain compact without introducing overflow at 320, 375, 390, 430 or representative mobile-landscape widths.

Build 11.39 connects tactical choices to the actual squad rather than treating them as fixed modifiers. The Tactics route now calculates Plan Fit from the starting five's attributes, readiness, weapons, temporary roles and familiarity, then adds a bounded opponent-style read. Every formation, approach, engagement range and team priority displays a comparative fit badge, while each starter receives an individual role-fit explanation. The confirmed suitability snapshot modestly scales live decision timing and tactical coordination without adding hidden weapon damage or replacing fatigue, injury, weapon and attribute effects. Repeated match use builds persistent tactical familiarity.

Build 11.36 introduces a dedicated Recruitment Department and commercial-partnership loop. Candidates now begin as uncertain scout reports, can be shortlisted and observed, and may be discovered through targeted three-day role/age/ability assignments. Permanent transfer registration uses opening, closed and run-in windows while free agents remain available; rival clubs bid, sign, list and replace players through their persistent league rosters. Incoming negotiations add signing bonuses, appearance bonuses and squad-status promises that can later affect morale or transfer requests. A new Commercial route offers five fictional sponsors whose upfront, weekly and performance payments scale with club reputation, results and league tier; accepted partner branding appears in the bottom-right live spectator feed.

Build 11.35 fixes a zero-value tier regression in the four-tier competition pyramid. Because the Pro League is stored as `divisionTier: 0`, several truthy fallback expressions treated it as missing and silently resolved the top tier as Division 3. The release introduces the shared zero-safe `normaliseLeagueTier()` helper, applies it to save migration, league identity, player-market generation and staff state, repairs stale top-tier names on load, and extends state-integrity/debug coverage so the Pro League cannot regress to a numbered division again.

Build 11.34 establishes a verified stability baseline before further feature work. The release synchronises source/build metadata, corrects the opening economy copy, prevents exhibitions from bypassing a due league fixture, strengthens save repair and adds a cross-system state-integrity audit. The mobile UI also enforces a route-control interaction floor of 44px in portrait and 40px in compact landscape while retaining scroll-based density rather than clipping or horizontal overflow.

Build 11.33 turns match deployment into a management sequence rather than a direct launch. The Operations dashboard and Tactics route now guide the player through an opposition briefing, starting-five review, temporary match-role assignments, approach, engagement distance, collective priority and confirmation before matchmaking. The captured plan is applied to live AI, where roles influence spacing, entry order, holding, flanking and trade response while retaining visibility and collision authority.

The match engine now records supported and isolated time, regroups, trade attempts/conversions, role-led actions and route replans. Post-match reports explain how the selected plan influenced the fixture and offer recommendations. Mandatory Inbox decisions can alter player wellbeing, training, promises, finances and reputation, and they extend the existing Must Respond/End Day gate.

Build 11.32 aligns the live spectator interface around one authoritative camera subject. The landscape and portrait telemetry cards now read directly from `bots[spectatorIndex]`, eliminating the previous mismatch with the player last selected in Command HQ. Portrait pause controls remain on the same 44-pixel history rail, landscape camera controls are compact and collision-free, and the fullscreen/windowed affordances use a cleaner utility-button treatment. Web Audio now schedules recovery after match deployment plus orientation and fullscreen transitions so portrait-started sessions are less likely to remain suspended on iOS.

Build 11.31 redesigns the top-right manager profile into separate club and calendar regions. `clubCurrentDateParts()` in `js/39-club-operations.js` provides the weekday, week and season used by `updateMenuUI()` to populate `#managerDateDay` and `#managerDateMeta`. The date panel must remain readable without increasing the persistent header height at 320, 375, 390 or 430 CSS-pixel widths.

Subnavigation counts are now real `.menu-subtab-notification` badges rather than numbers appended to route labels. `renderMenuSubnav()` owns the mail, transfer and development badge count, tone, accessible button label and zero-count removal.

Build 11.30 adds Football Manager-style continuation safeguards and navigation history. `clubEndDayBlockers()` now prevents calendar progression while a league match is due, an incoming negotiation or outgoing bid needs a response, or a completed season needs review. `renderClubMustRespondStrip()` exposes the current blockers and `advanceCareerDay()` routes to the first one without mutating time-dependent systems. Inbox, End Day and Match are three equal manager-topbar icons; the retired wide action row is replaced by an exact 44-pixel Back/Forward history rail that restores route context and scroll position.

Build 11.29 turns that persistent manager control into a paired shortcut group: Inbox and End Day use matching icon buttons in the topbar, while the redundant content-header End Day text button is removed. The mail route is now a conventional client with a toolbar, sender/category identity, previews, unread indicators, a reading pane and individual read/unread control. CSS explicitly enforces `[hidden]` on the unread badge so a zero badge cannot remain visible when author display rules override the browser default.

Build 11.25 adds a persistent Football Manager-style Inbox control to the manager topbar, including an unread-count badge and direct navigation to the mail route. The mobile Command HQ route labels are centred consistently, correcting the visual offset of short labels such as League. Spectator HP now uses a shared green-to-amber-to-red health mapping in portrait and landscape, and the health bar follows the same colour.

Build 11.24 adds negotiated incoming transfers, rival bids for contracted players, counter-offers, persistent transfer activity, a Division 3 economy rebalance, prominent development-point alerts and a mobile-only interaction/spacing review. Build 11.23 calendar, Inbox, assistant management, division pyramid and tactics remain authoritative.



## Build 11.57 office-courtyard and tactical-minimap architecture

`js/32-tactical-minimap.js` is concatenated immediately after diagnostics. It owns a bounded north-up Canvas 2D view of the active arena. `tacticalMinimapGeometry()` maps the authoritative 36 × 24 simulation grid into the live canvas; `drawTacticalMinimap()` layers zones, the optional courtyard footprint, wall cells, shared prop colliders, a viewed-operator facing cone and all ten operator markers. The UI is intentionally separate from WebGL so it remains readable if the 3D renderer falls back.

`index.html` owns `#minimapToggleBtn`, `#tacticalMinimapPanel`, `#tacticalMinimapCanvas` and the close button. `js/00-core.js` exposes those references. `js/70-runtime.js` binds tap, `M`, Escape and debug helpers, while `css/game.css` keeps the 30-pixel button beside diagnostics and constrains the panel within the compact 16:9 feed. `setTacticalMinimapVisible()` and `setDiagnosticOverlayVisible()` enforce mutual exclusion.

Skyline Offices keeps the same authoritative 36 × 24 navigation grid but replaces the former central meeting-table presentation with a landscaped courtyard. `LEVEL_DECOR_LAYOUT.courtyards` defines paving, planted edges, skylight and sky opening. Collision-relevant benches, planters, fountain and enhanced office furniture remain in `LEVEL_PROP_LAYOUT`, so `buildLevelPropColliders()` and the world renderer consume the same footprints. `js/61-world-renderer.js` adds courtyard floor/grass/skylight treatment plus dedicated bench, planter, fountain, coffee-station and copier geometry.

### Required Build 11.57 regression checks

- Start a prepared mobile match and switch to Skyline Offices; require one courtyard batch, office rugs/glass dressing and ten valid operator markers.
- Open the minimap and require wall, prop, zone, courtyard and both-team pixels. The viewed operator must have a focus ring/facing cone.
- Switch to Citadel Depot and require the same minimap renderer with no courtyard layer and ten markers.
- At 320, 375, 390 and 430 CSS-pixel portrait widths, require separate mute/export/minimap controls and a minimap panel fully contained by `#matchView`.
- Opening diagnostics must close the minimap and vice versa. Validate `M`, Escape, close-button, menu and scoreboard hiding.
- Run shared map connectivity/prop placement checks, Build 11.56 deadlock recovery, diagnostic export schema 1, state integrity, syntax checks, deterministic rebuild and ZIP integrity.
- When headless Chromium does not expose WebGL, state that limitation honestly; still validate renderer batch construction, collision parity and the Canvas minimap independently.

## Build 11.56 combat-deadlock-recovery architecture

The Build 11.55 diagnostic report captured a three-operator deadlock in Citadel Depot: two same-team attackers had nearly identical coordinates, non-zero forward intent, zero velocity, no path and repeated `push` recoveries, while the remaining defender crouched outside the 7.2-unit weapon range. Build 11.56 treats this report as a deterministic regression fixture rather than a visual-only bug description.

### Right-of-way and yielding

`Bot.nearestFriendlyCombatBlocker()` identifies a same-team operator occupying the immediate attack corridor. `combatRightOfWayValue()` ranks Entry and Flanker responsibilities above supporting/holding roles, with slot order as the deterministic tie-break. The operator with lower priority calls `findCombatApproachRoute()` in yielding mode and moves to an open local pocket; the right-of-way operator receives a separated attack route. Candidate scoring penalises overlap with team-mate goals and first waypoints.

### Escalating A* combat approaches

`forceCombatMobility()` now tracks the recovery target, origin, stage, cooldown and best displacement. A team-mate blocker, world obstruction, out-of-range contact or repeated no-progress recovery requests an A* `combatApproachPath` instead of another direct push. `navigateMove()` gives that temporary route priority over patrol/regroup goals, while target changes, material target movement, completion and expiry clear it safely.

The pathfinder still treats only same-team traffic as a soft occupancy cost. Visible enemy coordinates are used solely as the current combat objective and are never added to navigation traffic penalties, preserving the Build 11.52 hidden-information rule.

### Verified progress and crouch release

`updateCombatRecoveryProgress()` resets recovery state only after at least 0.58 units of actual translation. A retry without that displacement increases `combatRecoveryStage` and changes route/side. `updateEngagementProgress()` applies a shorter bounded threshold to a crouched visible engagement outside weapon range, forcing an alternate route instead of allowing the outnumbered hold rule to loop forever.

`js/31-match-diagnostics.js` now includes combat approach goal/reason, blocker identity/type, recovery stage, blocked duration and recovery displacement in compact snapshots and live overlay output. New counters distinguish routed approaches, lane yields, escalation attempts and verified movement successes; export schema 1 and the 90-second/360-sample cap remain unchanged.

### Required Build 11.56 regression checks

- Run `combatDeadlockRecoveryForTest()` and require separated approach goals, at least one deterministic yield and real movement by both attackers.
- Run `diagnosticDeadlockReplayForTest()` against the captured `(20.25, 8.00) / (20.25, 7.84)` attacker stack and the out-of-range crouched defender; no attacker may remain continuously stationary beyond the bounded recovery interval.
- Run `outOfRangeCrouchBreakForTest()` and `combatRecoveryDisplacementForTest()`; no recovery success may be recorded before 0.58 units of movement.
- Repeat the three core scenarios at least 20 times, then run every retained close-threat, line-blocker, combat-stall, crouch-stall, Entry-wait and traffic-penalty helper.
- Step at least 90 simulated seconds and confirm the diagnostic export remains schema 1, capped at 360 snapshots and includes the new deadlock counters.
- Verify the mute/export controls at 320, 375, 390 and 430 CSS pixels, long-press overlay behaviour, state integrity and an unrelated Calendar/management route.
- Syntax-check the modular output and extracted standalone script, rebuild deterministically and test the source ZIP.

## Build 11.55 local-match-diagnostics architecture

`js/31-match-diagnostics.js` is loaded immediately after bot AI so combat hooks can call its small recording helpers while the later career, renderer and runtime modules can consume its reports. `diagnosticBeginMatch()`, `diagnosticRoundStarted()`, `diagnosticRoundFinished()` and `diagnosticCompleteMatch()` are called from `js/40-match-flow.js`. `updateMatchDiagnostics()` is called from the fixed simulation step in `js/70-runtime.js`, not the render loop, so fast-forward and real-time play produce the same diagnostic cadence.

Detailed snapshots are intentionally bounded to 360 samples: ten compact operator states every 0.25 simulated seconds for the latest 90 seconds. Events are bounded to 1,800 entries and report an overflow count when older entries are trimmed. Per-operator aggregates continue across the full match and produce effective-range percentage, average target distance, movement distance, primary route zone/state, target/path/tactical changes, blocked shots, recoveries and flank/reposition counts.

`index.html` owns `#diagnosticExportBtn` and `#diagnosticOverlay`; `js/00-core.js` exposes their DOM references; `css/game.css` owns their portrait and landscape placement. `js/70-runtime.js` binds tap export, long-press overlay toggling, the `D` keyboard debug shortcut, render-loop performance forwarding and deterministic diagnostic test helpers. `careerReportMarkup()` appends `diagnosticReportMarkup()` after the existing tactical analysis.

The JSON export is generated locally with `Blob` and a temporary object URL. It contains no external requests and must not add diagnostic state to the career save. Build 11.71 adds orientation-aware performance aggregates, worst-frame records and compact per-snapshot renderer timings to that same schema-1 payload. Completed compact summaries may use localStorage under the independent `strikewatchDiagnosticSummariesV1` key.

### Required Build 11.55 regression checks

- Syntax-check the generated development bundle and the inline standalone script.
- At 320, 375, 390 and 430 CSS pixels, confirm the 38-pixel mute control and 30-pixel export control remain separate and inside the portrait match window.
- Long-press the export control for at least 650 ms and confirm the live overlay exposes state, role/plan, target reason, weapon/preferred range, goal/path, visible/memory counts, firing-line status and recovery timers without intercepting gameplay input.
- Step at least 90 simulated seconds and require no runtime exceptions, no more than 360 retained snapshots, ten operator records in every complete sample and a non-empty meaningful event set.
- Complete a match, require a diagnostic summary and After Action diagnostic panel, download the JSON and parse it successfully.
- Run state integrity and an unrelated Calendar or management-route check, then verify deterministic rebuilding and ZIP integrity.

## Build 11.54 office-environment and training-handoff architecture

Build 11.54 retains selectable Citadel Depot and Skyline Offices arenas, office-specific visual dressing and manager-feedback training handoffs. Feedback buttons select the relevant operator and recommended programme before routing into Training. These systems remain independent from diagnostics.

## Build 11.52 combat-navigation architecture

### Frame-by-frame visible-threat arbitration

`js/30-bot-ai.js` no longer returns the existing target before checking the rest of the visible field. `findVisibleEnemy()` and `targetPriorityScore()` compare range, screen offset, immediate danger, reload state and whether an operator occupies the shot corridor. `shouldSwitchVisibleTarget()` keeps ordinary switching stable with a cooldown while allowing a close threat or actual line blocker to override it immediately. This fixes the case where an operator looked past an enemy directly in front to continue engaging a farther player.

### Operator-safe firing corridors

`firstOperatorInLineOfFire()` projects every living operator onto the shooter-to-target segment and returns the nearest actor inside the body corridor. `Bot.shoot()` performs this check before recoil, ammo, muzzle flash or hit resolution. An exposed enemy blocker becomes the new visible target; a friendly blocker requests repositioning. Walls and target exposure remain authoritative and no actor data is used when the blocker is occluded.

### Engagement and crouch progress watchdogs

`updateEngagementProgress()` tracks shot count, damage and actual movement for each visible target. A bounded no-progress interval clears stale cover, uncrouches and selects the more open lateral flank before committing to push/reposition. `updateLocomotionStall()` separately detects a sustained stationary crouch during an actionable navigation/contact state and releases the posture, route, cover and repeated coordination hold. These watchdogs complement—not replace—the existing wall collision, route-progress, loop and late-round hunt recovery systems.

### Traffic-aware routing and bounded coordination

`navigationCellPenalty(cell, mover)` adds temporary cost for a same-team operator occupying or reserving a nearby waypoint, allowing A* to prefer another legal route through crowded doors without making team-mates permanent obstacles. Enemy positions are intentionally ignored. Entry support waits now transition into a 2.1–2.8 second commitment window instead of resetting into another pause on the next update.

### Build 11.52 debug and observability surface

`window.__strikeDebug` exposes deterministic checks for close-threat retargeting, operator blockers, visible-combat stalls, stationary crouches, coordination waiting and same-team traffic costs. `performance()` includes `targetSwitches`, `closeThreatOverrides`, `operatorBlockedShots`, `combatStallRecoveries`, `crouchStallRecoveries`, `coordinationWaitCommits` and `navigationRecoveries`. Per-bot snapshots include crouch-stall, movement intent/velocity, block/stuck state, engagement timers and tactical recovery reason.

### Required Build 11.52 regression checks

- Run all six deterministic combat/navigation helpers and require their success conditions.
- Start a prepared match with a valid five-player team and step at least 90 simulated seconds, sampling every 15 seconds. No living bot may retain a crouch-stall timer beyond its recovery threshold or a stuck timer above one second.
- Exercise a forced late-round duel/search and confirm the simulation continues to a contact, elimination or next-round transition without runtime errors.
- Confirm state integrity, a retained low-health stalemate break, an unrelated Calendar/Inbox or Recruitment route, development/standalone syntax, deterministic rebuilding and ZIP integrity.

## Build 11.51 transfer-feedback and management-notice architecture

### Transfer feedback ownership

`js/39-transfers.js` renders the horizontal `.transfer-player-scouting` grid, persistent `.transfer-submission-feedback` / `.transfer-counter-feedback` blocks and outgoing counter history. Incoming negotiation simulation is enhanced later by `js/39-recruitment-commercial.js`; both submission implementations populate the optional `lastSubmitted`, `lastResponseStatus` and `lastResponseMessage` fields. The transfer click handler opens the shared management notice immediately after a submission and rerenders the route so the same response remains visible after the popup closes.

### Shared blocked-action notices

`showManagementNotice()` and `showManagementBlocked()` in `js/36-team-management.js` build on `openTeamNoteModal()` using `mode: management`, tone/glyph metadata and optional route actions. `js/70-runtime.js` handles `[data-management-modal-dismiss]` and `[data-management-modal-route]`. Club operations, matchday, transfers, development and recruitment/commercial call the shared path when an invalid action needs a concrete explanation. Assistant delegation buttons remain enabled with a `requires-staff` presentation so they can open the notice rather than being inert.

### Portrait live-match audio

`index.html` defines `#portraitAudioBtn` beside the match overlays. `js/00-core.js` owns its reference, `js/10-audio.js` synchronises it in `updateAudioButton()`, and `js/70-runtime.js` routes it through `toggleAudio()`. Portrait CSS places it bottom-left only for a windowed live match; the sponsor bug remains bottom-right and scoreboard/menu states hide the sound shortcut.

### Required Build 11.51 regression checks

- At 320, 375, 390 and 430 CSS-pixel portrait widths, confirm Ability and Potential share one row, each star group is horizontal and the negotiation card remains inside the viewport.
- Submit an incoming offer and outgoing counter through the UI. Confirm an immediate response notice, persistent submitted-term feedback, revised-offer labelling and save round-trip retention.
- Trigger assistant lineup selection and Pick Now without an assistant. Confirm the notice title/body, X/backdrop/Escape closing and direct Staff route action.
- In portrait windowed match state, verify the sound button is bottom-left, sponsor branding is bottom-right, the two do not overlap and mute state/accessible labelling update together.
- Run unrelated Inbox, Armoury and state-integrity checks, syntax-check both bundles, reproduce the standalone from source and test ZIP integrity.

## Build 11.50 Inbox-order and portrait-alignment architecture

### Newest-first Inbox view

`js/39-club-operations.js` owns `clubMailSequenceValue()` and `clubMailNewestFirst()`. The latter sorts a copied `{item,index}` view by descending message sequence, then descending day and original position. `renderMailTab()` uses the derived order and `clubSelectedMail()` falls back to its first item. Persisted mail remains untouched. `mailOrderForTest()` in `js/70-runtime.js` exposes the resolved order.

### Mail popup header geometry

`openClubMailModal()` uses the text-presentation envelope glyph. `css/game.css` gives mail-mode `#teamNoteQuote` a fixed icon box beside the close control and reserves subject width at portrait breakpoints. The shared dialog markup and decision actions remain unchanged.

### Portrait Armoury and debrief card ownership

Portrait `.career-inventory-list` switches from a `78vw` horizontal carousel to a single full-width vertical column. Each card assigns explicit grid areas for the thumbnail, weapon copy, comparison and horizontal issued-state row.

`renderTeamLastMatchBreakdown()` now marks the player name/rating control with `.team-debrief-player-head`. Header selectors target only that class. `.team-debrief-note` owns a separate label/quotation/insight grid and appends its tap hint without allowing the arrow to collide with text.

### Required Build 11.50 regression checks

- Seed or load out-of-order mail and verify rendered IDs plus `mailOrderForTest()` are descending by message sequence, with the newest item at the top.
- At 320/375/390/430 portrait widths, verify the mail glyph and X do not intersect the kicker or subject and the dialog remains within the viewport.
- Verify Armoury inventory cards occupy the full panel width, have no horizontal list scroll or trailing seam, and retain comparison/current/issued-state information.
- Seed the Starting Five debrief and verify every note's label, quotation, insight and expand control have non-overlapping bounding boxes.
- Recheck popup decision resolution, X/backdrop/Escape closing, Calendar/Recruitment and state-integrity/source-release parity.

## Build 11.49 popup-Inbox and decision-mail architecture

### Shared popup extension

`index.html` adds `#teamNoteActions`, `#teamNoteQuote` and an identified dismiss hint to the existing shared overlay. `js/00-core.js` exposes those DOM nodes. `openTeamNoteModal()` in `js/36-team-management.js` now accepts `mode`, `glyph`, `actionsHtml`, `dismissHint` and `returnFocus`; close logic clears all mail-specific data and action markup before restoring focus. The overlay remains presentation-only and does not add persisted fields.

### Inbox ownership and decision routing

`js/39-club-operations.js` owns `clubMailById()`, popup composition, reader previews, row selection and `handleClubMailModalClick()`. Mail rows carry `aria-haspopup="dialog"`; unresolved decision rows receive a visible Decision badge. `renderClubDecisionMailActions()` in `js/39-matchday.js` remains the authoritative choice renderer, so popup choices continue to use the same decision IDs, option IDs and gameplay effects as the previous embedded reader.

`js/70-runtime.js` delegates clicks inside the shared overlay to `handleClubMailModalClick()` before applying backdrop behaviour. Decision choices call `clubResolveDecision()`, then reopen the source message with the resolved result. Mark-unread closes the popup after saving and rerendering; related routes close the popup before navigation.

### Required Build 11.49 regression checks

- Create a club, recruit five starters, generate a deterministic decision and confirm the source Inbox row carries a Decision badge and dialog semantics.
- Open the decision mail and verify popup mode, source ID, exact subject/body, option count and touch-sized choice controls. Resolve one option through the popup and confirm the same email refreshes to Decision Recorded with no remaining choice buttons and End Day blocker removal.
- Open an ordinary email, verify no decision choices, mark it unread from the popup and confirm the popup closes plus the Inbox unread class/badge returns.
- Verify X, backdrop and Escape closing; related-route navigation; four visible Inbox rows; hidden-overlay safety; 320/375/390/430 portrait and 844×390 landscape containment.
- Run unrelated Calendar and Recruitment checks, state-integrity audit, bundle/inline syntax checks, source-release parity and ZIP integrity.

## Build 11.48 portrait-UX and debrief-presentation architecture

### Overlay lifecycle and focus

`index.html` retains the shared `#teamNoteOverlay` shell and adds the decorative quote and dismissal hint. `css/game.css` enforces the hidden-state guard before any overlay presentation rules, then provides tone-aware personal/team/insight/debrief styling and reduced-motion behaviour. `js/36-team-management.js` stores the triggering element, copies `data-expand-*` content into the dialog, assigns the tone and restores focus on close. `js/70-runtime.js` continues to own X, backdrop and Escape routing.

### Portrait layout pass

The final Build 11.48 override block in `css/game.css` is intentionally shared across management routes. At up to 430 CSS pixels it normalises hero padding, section heading flow, pill wrapping, telemetry card copy, league fixture wrapping, calendar agenda detail and Command Centre result labels. Starting Five debrief cards become one column so each expand target has sufficient width.

### Debug and regression support

`seedStartingFiveDebriefForTest()` in `js/70-runtime.js` creates deterministic round statistics, settles five player `lastMatch` records and supplies a matching `careerState.lastRound` report exclusively for browser regression. It does not change production defaults or save schema.

### Required Build 11.48 regression checks

- Confirm the unopened overlay has `hidden=true`, `aria-hidden=true` and computed `display:none`, and does not intercept route controls.
- Confirm profile reflection and Starting Five debrief cards transfer their exact title/body/tone, open the overlay and close via X, backdrop and Escape; closing should restore focus to the trigger.
- Verify five deterministic debrief cards via `seedStartingFiveDebriefForTest()` and preserve state-integrity success afterwards.
- Check Back/title/Forward geometry, five primary tabs and page-width containment at 320, 375, 390 and 430 CSS pixels across Command Centre, League, Calendar, Player Telemetry, Squad, Recruitment, Training, Armoury, Finances and Commercial.
- Verify the Armoury current weapon has no `::after` guide line but retains a visible equipped highlight.
- Rebuild source and standalone independently, syntax-check both JavaScript forms and run unrelated Calendar and Recruitment checks.

## Build 11.47 reflection-modal and portrait-polish architecture

### Shared Team comment overlay

`index.html` owns `#teamNoteOverlay`, its close button and the text containers. `js/00-core.js` exposes the DOM references. `js/36-team-management.js` renders expandable reflection/debrief buttons and owns `openTeamNoteModal()`, `closeTeamNoteModal()` and the markup helper used by both Private Match Reflection and Starting Five debrief cards. `js/70-runtime.js` binds the close button, backdrop dismissal and Escape-key behaviour.

### Portrait header and Armoury polish

`css/game.css` owns the portrait-only split history-rail layout used by the main menu context, keeping the label centred while moving the Forward control to the far-right slot. The same stylesheet also replaces the old `.career-inventory-item.equipped::after` guide line with a subtler equipped-state highlight to avoid the portrait Armoury artefact.

### Required Build 11.47 regression checks

- Rebuild from modular source and confirm the standalone is fully inlined; source and release must contain the same 11.47 title/build stamp plus the Team comment overlay shell.
- In portrait management context, verify the history rail shows Back on the left, the route title centred and Forward on the far right without overlap at 320/375/390/430 widths.
- In the Armoury route, verify equipped inventory entries no longer show a stray vertical blue line in portrait and still retain a clear current/equipped state.
- In Team routes, verify Private Match Reflection cards and Starting Five debrief notes open a larger overlay, and that the overlay closes via the X button, backdrop tap and Escape key.
- Run a second unrelated regression pass covering one existing non-Team route (for example Calendar or Recruitment) plus state-integrity/build parity.

## Build 11.45 guided-command and Armoury-navigation architecture

### Tutorial state and live loan copy

`js/35-career.js` owns `makeDefaultCareerTutorialState()` and save normalisation for `careerState.tutorial.contextSeen`. `js/36-team-management.js` owns the six-stage beginner tutorial and uses `clubFinanceLoanState()` when available so the first-stage explanation reflects the authoritative loan principal, total repayable, payment count, instalment and interval. `index.html` owns the ordered 1–4 metadata on the persistent topbar buttons; `css/game.css` owns the stage-1 highlight and reduced-motion fallback.

### One-time contextual guidance

`MENU_CONTEXT_TUTORIALS` in `js/50-ui-menus.js` defines Calendar, Tactics, Transfers, Training, Finances, Commercial and Armoury guidance. `renderMenuContent()` inserts the guide at the top of the route after the main onboarding has completed or been dismissed. `handleMenuContextTutorialClick()` is wired before the normal career click handler in `js/70-runtime.js`, and dismissal saves the route flag immediately. Debug coverage is exposed through `completeTutorialForTest()`, `contextTutorialsForTest()` and `dismissContextTutorialForTest()`.

### Compact primary sections and Armoury ownership

`index.html` defines five primary `.menu-tab` buttons in this order: Operations, Team, Armoury, Supplies and Club. `MENU_SECTIONS` in `js/50-ui-menus.js` maps `loadout` exclusively to Armoury. Portrait CSS changes the sidebar navigation into five equal compact tabs; larger layouts retain concise copy and subdued numerical indices. Route history, direct player-loadout actions and the existing Armoury target/equipment logic remain unchanged.

### Required Build 11.45 regression checks

- Rebuild from the modular source and confirm the standalone is fully inlined; source and release must contain the same 11.45 title, four tutorial metadata attributes and five primary tabs.
- Verify the loan explanation, ordered topbar emphasis and all seven contextual guides, including dismissal persistence and malformed-state normalisation.
- Verify no page or navigation overflow at 320 × 700, 375 × 812, 390 × 844, 430 × 932 and 844 × 390.
- Verify menu Back/Forward returns to Armoury, recruitment still signs five affordable players and `stateIntegrityForTest()` reports no issues before and after interaction.

## Build 11.44 calendar-date and sponsor-polish architecture

### Deterministic Gregorian date layer

`js/39-club-operations.js` owns `CLUB_CALENDAR_EPOCH`, `clubDateObjectForAbsoluteDay()`, `clubAbsoluteDayForDate()` and `clubDatePartsForAbsoluteDay()`. The epoch is Monday 3 August 2026. Existing gameplay systems continue to store and compare integer absolute days/weeks; visible weekday/day/month/year values are derived in UTC so browser timezone cannot shift the date.

`clubCurrentDateParts()` now returns the full simulated date together with week and league season. `js/50-ui-menus.js` uses those fields in the persistent header. Do not store JavaScript `Date` objects in `careerState` or replace existing absolute-day scheduling with locale time.

### Month calendar and glance-value events

`js/39-calendar-finance.js` owns `clubCalendarMonthRange()`, the 42-cell month grid, month navigation and the 12-week agenda. Grid navigation is bounded from the career epoch to 36 months ahead. Event aggregation remains based on absolute days and covers fixtures, loan collections/arrears, contracts, injuries, scouting, sponsorship and transfers.

Each event stores a concise `compactTitle` for the month cell and a full `title`/`detail` for the agenda. Compact labels must identify the relevant opponent, player, bank amount, sponsor or deadline rather than presenting only `MD`, `CON`, `SPON` or another opaque code.

### Sponsor timing and portrait layout

`SPONSOR_ROUND_BUMPER_DURATION` is five seconds. `sponsorRoundBumperTotalDuration()` combines the normal result delay, bumper duration and a short tail; `finishRound()` uses that total for `roundRestartTimer`. CSS animation timing must match the five-second visible state so the sponsor frame does not fade after one second and remain blank.

Portrait windowed CSS uses `display: contents` for the compact logo wrapper, placing the icon in the first column and the `PARTNERS OF`/brand lines in the second. Other sponsor contexts retain the shared logo markup and brand colours.

## Build 11.43 sponsor broadcast architecture

### Ownership

- `index.html` owns `#sponsorRoundTransition`, its logo container, club label and upcoming-round title.
- `js/39-recruitment-commercial.js` owns active-brand lookup, persistent sponsor-bug content and the bumper lifecycle: `scheduleSponsorRoundBumper()`, `showSponsorRoundBumperNow()`, `updateSponsorRoundBumper()` and `hideSponsorRoundBumper()`.
- `js/40-match-flow.js` schedules the bumper only after a completed non-final round and extends that transition countdown slightly when a sponsor is present.
- `js/70-runtime.js` advances the bumper during the round-ending state. The bumper uses simulation transition time, so 2× mode shortens the presentation consistently with the rest of the inter-round flow.
- `css/game.css` owns the responsive broadcast treatment and must keep the **PARTNERS OF** label visible in portrait windowed mode.

### Invariants and regression surface

- No active deal means no sponsor bug and no between-round bumper.
- Match-winning rounds go directly to the normal match-complete/report flow and never schedule a bumper.
- The normal round result appears before the bumper; the bumper hides that result only when its own display phase begins.
- `createMatch()`, `startRound()` and `finishMatch()` clear stale bumper state.
- Preserve `sponsorRoundBumperForTest()`, `scheduleSponsorRoundBumperForTest()`, `showSponsorRoundBumperForTest()` and `hideSponsorRoundBumperForTest()`.
- Test both portrait and compact landscape, reduced-motion CSS and sponsor/no-sponsor round transitions.

## Build 11.42 calendar, finance and stability architecture

### Ownership

- `js/35-career.js` introduced save schema 17 for the Gold Coin and finance migration in this historical build. Current schema 18 retains schema-17/schema-16/schema-15/schema-14 compatibility, normalises `financeLoan`, and adds armour inventory/loadouts. New careers initialise the foundation loan; legacy created saves receive a migration-safe schedule.
- `js/39-calendar-finance.js` wraps weekly calendar processing after sponsorship/recruitment, takes scheduled repayments, records arrears and mails, flags expired contracts and renders the Calendar route.
- `js/50-ui-menus.js` owns the Calendar route registration, fourth topbar shortcut, scoreboard-to-telemetry routing and four-message Inbox presentation contract.
- `js/10-audio.js` owns the context watchdog/recovery pipeline. `js/40-match-flow.js` owns elimination-feed hardening.

### Calendar event contract

The five-week view begins on the Monday of the current career week. It displays user league fixtures sequentially from `calendar.nextLeagueDay`, loan instalments and arrears, zero/future contract expiries, medical return estimates, active scouting completion, sponsor proposal/payment dates and pending transfer-offer expiry. Agenda controls route to the relevant management page and player-specific items select that profile.

### Loan contract

The opening 350,000 credits are borrowed from Northstar Bank. Total repayable is 400,000 credits in ten 40,000-credit instalments every four weeks. Payments use available cash only; unpaid amounts remain as arrears and are added to the next scheduled collection. Loan transactions and notices enter the existing finance ledger/Inbox. Normalisation must preserve a zero balance and an inactive settled state.

## Build 11.41 shared-sidearm-geometry architecture

### Build 11.41 addendum

- `careerWeaponVisualParts()` in `js/35-career.js` owns the canonical career pistol part layout. Grip angle corrections and any cosmetic reinforcement pieces must be applied there, not patched per renderer.
- `js/62-character-renderer.js` and `js/63-viewmodel-renderer.js` both consume that geometry. World-held pistols, first-person pistols, reward previews and Armoury inspection therefore rise and fall together; regressions in one context are a regression in the shared source.
- `careerWeaponVisualPart()`, `careerWeaponVisualBounds()` and `careerWeaponPartFitOffset()` are part of the shared rendering contract. Preserve them for debug tooling, hand-placement anchoring and slide/ejection calculations.

## Build 11.40 command-header architecture

### Build 11.40 addendum

- The top-left `.manager-brand` block now reflects the player's club identity by showing `#managerOperatorName` and `#managerOperatorLevel`, replacing the static Strikewatch / Command HQ copy.
- `.manager-profile` is now dedicated to the calendar card so `#managerDateDay` and `#managerDateMeta` have more horizontal room.
- The header remains mobile-first; the refreshed spacing must stay readable without increasing the overall topbar height or causing horizontal overflow.

### Ownership and update flow

`index.html` owns the Command HQ topbar markup. `js/50-ui-menus.js` still populates `#managerOperatorName`, `#managerOperatorLevel`, `#managerDateDay` and `#managerDateMeta` through `updateMenuUI()`. `css/game.css` owns the responsive layout overrides that prioritise the left team identity block and the right-hand calendar card. Preserve `calendarHeaderForTest()` in `js/70-runtime.js`; it continues to read the same live DOM IDs even though the team identity has moved into the left header block.

## Build 11.39 tactical suitability and plan-fit architecture

### Build 11.39 addendum

- The post-match reward crate renderer now keeps the lid visually attached to the body throughout the open animation by driving the lid, hinge spine and support rails from the same rear pivot.
- The Team Armoury now compares every selected or browsed weapon directly against the currently equipped weapon for the selected operator. Inventory tiles show a quick better / worse / sidegrade badge, while the detail panel shows an overall comparison card plus per-stat deltas.

### Suitability inputs and ownership

`js/39-matchday.js` owns the suitability model. `clubTacticalSuitabilityReport(overrides)` evaluates the current starting five against the requested formation, approach, engagement range and team priority. It combines:

- weighted Marksmanship, Handling, Awareness, Mobility and Resilience requirements;
- formation and priority role-coverage targets;
- player readiness from form, sharpness, fatigue, morale, happiness and medical state;
- equipped-weapon fit for close, mixed or long engagements;
- individual temporary-role suitability, including bounded natural/secondary-role familiarity;
- persisted tactical familiarity for the four selected plan dimensions;
- a small bounded read of the active opponent's tactical style.

The overall score is converted to a bounded tactical execution scale. The UI labels scores as Poor, Stretched, Workable, Sound, Strong or Excellent and explains the strongest and limiting components.

### Live simulation contract

`clubTacticalPlanSnapshot()` stores a compact suitability snapshot when the plan is confirmed and captured for matchmaking. `applyCareerToBot()` reads the active snapshot for each owned starter, applies the correct captured formation/approach/range/priority and exposes `tacticalPlanFit`, `tacticalExecutionPercent`, `roleSuitabilityScore`, `roleExecutionScale` and `tacticalDecisionMultiplier`.

Plan fit can modestly affect decision cadence, movement/coordination execution, reaction timing and how strongly existing tactical instructions are expressed. It does not alter raw weapon damage, replace the base RPG-stat pipeline, remove fatigue/injury effects or grant information through walls. `Bot.updateTeamCoordination()` and tactical decision timers use the bounded decision multiplier.

### Familiarity, confirmation and explanation

Save schema version `13` adds `careerState.tactics.familiarity` buckets for formations, approaches, engagement plans and priorities. Completed matches raise familiarity for the plan used. Values are normalised to 0–100 and audited by `stateIntegrityForTest()`. Zero is a valid learned value and `tacticalFamiliarityBucket()` must preserve it with a finite-number check rather than a truthy fallback.

The match-plan signature includes tactics, starters, temporary roles, relevant player attributes/readiness and equipped loadouts. Any meaningful change invalidates the previous confirmation. The Tactics route presents overall Plan Fit, Live Execution, six component tiles, the opponent read, insights, alternative-option badges and individual role-fit cards. It explicitly tells the player that fit changes tactical behaviour and coordination, not hidden raw damage.

### Build 11.39 debug and regression surface

- `tacticalSuitabilityForTest(overrides)` returns the complete live report.
- `setTacticalFamiliarityForTest()` and `recordTacticalFamiliarityForTest()` verify persistence and learning.
- `setPlayerTacticalProfileForTest()`, `assignMatchRoleForTest()` and `clearMatchRolesForTest()` support deterministic attribute and role-fit checks.
- `matchdayForTest()` exposes captured plan suitability and each live bot's plan fit, role suitability, execution percentage and decision multiplier.
- Required regression proves that a statistically suitable squad improves the relevant plan score, natural-role fit does not trail a deliberate mismatch, familiarity raises its component, live bots receive the captured values and all 18 routes remain overflow-free across the mobile acceptance matrix.

## Retained Build 11.36 recruitment and commercial architecture

### Persistent state

Build 11.36 introduced the following state in save schema version `12`; current schema version `14` preserves it:

- `careerState.recruitment`: view, shortlist IDs, per-player knowledge reports, assignment draft, active/completed assignments, AI market activity and day sequencing;
- `careerState.sponsorship`: deterministic offer sequence, pending/declined/accepted offers, one active deal, weekly-payment checkpoint and completed history;
- negotiated player fields for `appearanceBonus`, `squadStatus` and `contractPromise`.

State getters normalise in place so nested operations cannot invalidate live references. The integrity audit verifies shortlist membership, knowledge bounds, assignment count, known sponsor IDs and non-negative deal terms.

### Scouting and recruitment

`js/39-recruitment-commercial.js` wraps the base market renderer. Market and profile screens show ranges until report knowledge crosses defined thresholds. Dossier views, shortlist monitoring and assignments improve knowledge. Assignments target a role, age band and minimum ability, take three career days and return up to five recommendations through the Inbox.

The permanent window is derived only from played fixtures involving `LEAGUE_USER_CLUB_ID`: opening through fixture two, closed for fixtures three to five and run-in from fixture six. Free agents remain available. Rival clubs operate on `league.clubs[].roster`; bid resolutions and replacement activity move the same player object between the market and club rosters without duplication.

Incoming negotiations extend the base fee/wage/term package with signing bonus, appearance bonus, response deadline and Prospect/Rotation/Starter/Key status. The promised status creates a later starts-based review. Broken promises can reduce morale and happiness and may produce a transfer request.

Player market value retains age, potential, form, recent rating, contract and injury effects from `38-development.js`, with a bounded league-level multiplier layered on top.

### Commercial partnerships

The five initial brands are Aegis Dynamics, VoltRush Energy, Northstar Finance, Redline Mobile and Ironclad Gear. Their offers differ across upfront payment, guaranteed weekly income, victory bonus, 3–0 sweep bonus, duration and minimum reputation profile. Offer strength is multiplied by a commercial performance score built from reputation, win rate, current tier, recent result and commercial-development points.

Pending proposals create a `commercial` notification badge and `clubEndDayBlockers()` entry. Accepting one immediately posts a SPONSOR ledger transaction, declines competing proposals, schedules weekly payments and enables `#sponsorBug`. Match settlement adds win/sweep income; completed terms move into sponsorship history and permit new proposals.

The spectator mark is asset-free HTML/CSS, uses a unique visual treatment per brand and occupies the bottom-right broadcast corner. Command HQ and no-deal states hide it. Compact portrait feeds reduce it to a small mark; full-view return controls move above it to avoid overlap.

### Build 11.36 debug and regression surface

Preserve:

- `recruitment()` and `sponsorship()` snapshots;
- `shortlistPlayerForTest()` and `startRecruitmentAssignmentForTest()`;
- `generateSponsorOffersForTest()`, `acceptSponsorOfferForTest()`, `rejectSponsorOfferForTest()`, `sponsorMatchBonusForTest()` and `sponsorWeeklyPaymentForTest()`;
- `setTransferWindowCompletedForTest()`, `forceAiListingForTest()` and `processRecruitmentDayForTest()`.

Regression acceptance includes 18 routes × five mobile viewports, scouting completion after three processed days, sponsor blocking/acceptance/weekly/match payment, exactly five brand definitions, stronger Pro League offer value than the equivalent Division 3 scenario, free-agent access during the closed window, club-owned-player rejection during that window, AI roster replacement/listing and a clean state-integrity report.

## Retained Build 11.35 Pro League tier architecture

### Zero-safe tier ownership

- `js/00-core.js` defines `normaliseLeagueTier(value, fallback = 3)`. It treats `0` as valid, clamps finite numbers to 0–3 and uses Division 3 only for missing or invalid input.
- `js/37-league.js` uses that helper for the current tier, division definitions, default state and save reconstruction. Tier 0 maps to `STRIKEWATCH PRO LEAGUE`, `PRO LEAGUE` and `PRO LEAGUE POOL`.
- `js/35-career.js`, `js/36-team-management.js` and `js/39-club-operations.js` use the same parser for saved pool access, player-market quality and staff records.
- `js/70-runtime.js` audits league-name and staff-pool agreement and exposes `leagueTierForTest()` plus `setLeagueTierForTest()`.

### Required Pro League regression

1. Assert tier mappings 3 → Division 3, 2 → Division 2, 1 → Division 1 and 0 → Pro League.
2. Load/normalise a save with `divisionTier: 0` and a stale Division 3 name; require the resulting competition name to be Strikewatch Pro League without changing the tier.
3. Generate a market and staff pool at tier 0 and verify Pro League quality/access rather than Division 3 values.
4. Complete a top-two Division 1 season and start the next season; require tier 0 and Pro League labels throughout the League route, match presentation and transfer market.
5. Complete a bottom-two Pro League season and start the next season; require relegation to Division 1.
6. Require `stateIntegrityForTest().ok === true` after both transitions.

## Retained Build 11.34 stability and audit architecture

### Cross-system ownership

- `js/35-career.js` owns save repair. It de-duplicates squad identifiers, derives weekday state from `absoluteDay`, preserves repeated weapon inventory and clamps finite assignments to the owned copy count and normalises persistent counters.
- `js/37-league.js` owns the match-type gate. League matchdays reject exhibitions at both the context layer and UI layer; clear non-matchdays allow exhibitions under the existing one-match-per-day limit.
- `js/39-club-operations.js` owns consistent mail sender names for Calendar, Competition, Result, Matchday, Transfer/Transfers and other departments.
- `js/70-runtime.js` exposes `stateIntegrityForTest()`, which audits finite economy/development values, squad IDs/stats/loadouts, calendar coherence, Inbox/decision links, transfer selections, tactical assignments and league schedule uniqueness. `normaliseStateForTest(raw)` validates repair without replacing the active career.
- `css/game.css` contains final interaction-floor overrides for all `#menuContent` buttons, selects and inputs on target mobile viewports.

### Required stability regression

1. Build and syntax-check both generated scripts.
2. Create a fresh team and recruit five viable Division 3 players.
3. Assert `stateIntegrityForTest().ok === true` and 28 valid league fixtures.
4. Confirm exhibitions prepare on a clear day but return `ok: false` on the scheduled league day; confirm the league fixture still prepares.
5. Generate a required Inbox decision and prove End Day changes no calendar/economy state until it is resolved.
6. Render every menu route at 320×700, 375×812, 390×844, 430×932 and 844×390. Require zero page exceptions, invalid visible values, duplicate DOM IDs, undersized route controls or horizontal overflow.
7. Run a live simulation sample and verify finite bot state plus Player Link parity for all five owned spectator slots.
8. Treat the expected headless WebGL-unavailable warning separately from JavaScript errors, and visually verify the 3D scene on a real supported browser when renderer work changes.

## Retained Build 11.33 tactical matchday architecture

### Match preparation state

`careerState.tactics` now persists `approachId`, `engagementId`, `priorityId`, per-player `assignments`, a per-day `matchPrep` object and `activeMatchPlan`. `clubMatchPrepState()` resets confirmation on a new simulated day. `clubLineupSignature()` combines the first five player IDs and their temporary match roles so lineup or responsibility changes invalidate confirmation.

`renderMatchPreparationPanel()` is shared by Operations and Tactics. `renderAdvancedTacticsTab()` owns formation, approach, range, priority, role assignment, delegation and final confirmation. `startNewMatch()` refuses fresh deployment until `clubMatchPlanConfirmed()` succeeds; `beginMatchmaking()` snapshots the plan through `clubCaptureActiveMatchPlan()`.

### Live role and team behaviour

`applyCareerToBot()` keeps the natural role in `bot.naturalPlayerRole` and applies the captured temporary role to `bot.playerRole`. It also maps the manager's approach, engagement and priority to bounded AI fields such as aggression, pace, preferred range, support radius, cover preference and low-health threshold.

`Bot.updateTeamCoordination()` is the collective-behaviour layer. It measures support spacing, asks Entries to wait briefly when evidence-led danger is unsupported, lets Supports follow Entries, regroups disconnected operators and gives Anchors/Hold priorities a territorial bias. Ally deaths create short-lived investigation/trade information based on the death position; they do not reveal live enemy coordinates. `chooseObjective()`, `preferredCombatRange()`, `chooseCombatTactic()` and navigation-recovery counters consume the plan without bypassing line of sight, cover or collision.

### Mandatory decisions and analysis

`careerState.decisions` stores unresolved and resolved management choices. `clubMaybeGenerateDecision()` creates playing-time, medical, board or discipline mail. `renderClubDecisionMailActions()` embeds the response controls in the Inbox. `clubDecisionBlockers()` is appended to `clubEndDayBlockers()` so time, training, recovery, payroll and transfers cannot advance before a required response.

`recordTeamMatchRound()` and `settleTeamManagementAfterMatch()` persist coordination telemetry per player and in team totals. `buildTacticalMatchAnalysis()` converts those totals plus the captured plan into supported-time, trade-response, regroup, role-action and route-replan metrics with recommendations. `careerReportMarkup()` includes the analysis in the immediate modal and archive.

## Build 11.32 live spectator and view-transition architecture

- `js/50-ui-menus.js` owns spectator identity, HUD telemetry, pause-menu layout state and view-mode transitions. `updateOwnedOperatorTelemetry()` must use the active `spectatorIndex`; Command HQ selection is not a valid fallback for the live card.
- `js/10-audio.js` owns `queueAudioRecovery()`. The helper retries only when audio is enabled and previously unlocked, then flushes queued spatial events when the context is running.
- `js/70-runtime.js` requests audio recovery after orientation/fullscreen events and exposes `spectatorTelemetryForTest()`.
- `css/game.css` owns the final Build 11.32 overrides: 44-pixel portrait pause rail, 264-pixel maximum landscape control deck, non-overlapping left telemetry/spectator panels and compact bottom-right portrait-return control.
- Regression checks must cover all five owned spectator slots, portrait pause rail geometry, 844 × 390 collision checks, zero horizontal overflow and running/unlocked audio after the view transition.

## Retained Build 11.31 manager date and route-badge architecture

- `index.html` owns the structured `.manager-profile-team` and `#managerDatePanel` markup.
- `js/39-club-operations.js` owns `clubCurrentDateParts()` and remains authoritative for weekday, week and season values.
- `js/50-ui-menus.js` updates the structured date fields and renders route notification badges. Do not put unread mail, transfer totals or unspent points back into `#managerOperatorLevel`; that line is intentionally limited to Team Level.
- Mail, transfer and training counts use `.menu-subtab-notification` with route-specific `mail`, `decision` and `progress` tones. A zero count must emit no badge element.
- The topbar remains the same height. At narrow portrait widths, the date panel may simplify its icon and labels but must retain the weekday plus Week and Season.
- `window.__strikeDebug.calendarHeaderForTest()` and `subnavNotificationsForTest()` expose rendered header and route-badge state for regression checks.

## Retained Build 11.30 Must Respond and command-history architecture

`index.html` owns the four-control `.manager-topbar-actions` group: `#managerMailBtn`, `#menuEndDayBtn`, `#managerCalendarBtn` and `#startMatchBtn`. `updateMenuUI()` owns their visibility, active/recruitment/matchday states, blocker badge, tooltip text and accessible labels. End Day and Match must not be reintroduced into `.menu-header-actions`.

`clubEndDayBlockers()` in `js/39-club-operations.js` is the single continuation gate. It returns routeable blocker objects for a due unplayed fixture, unresolved incoming negotiation, actionable outgoing bid and completed-season transition. `advanceCareerDay()` reads this list before all date mutation. `renderClubMustRespondStrip()` shows the same list in the current menu, ensuring the warning and authoritative logic cannot disagree.

`js/50-ui-menus.js` owns the bounded `menuNavigationHistory` stack. Each entry records route, selected player, selected mail, selected outgoing offer and content scroll position. `setMenuRoute()` saves the current state and branches history; `navigateMenuHistory()` restores it. The `.menu-history-bar` is a fixed 44-pixel rail and replaces the retired wide action row.

## Retained Build 11.29 Inbox architecture

`renderMailTab()` in `js/39-club-operations.js` owns the mail-client markup. It maps mail categories to recognisable senders, renders sender initials, unread dots, subject/body previews and a dedicated reader pane. The selected message may be toggled read/unread, and Mark All Read must disable at zero unread messages. `.manager-mail-badge[hidden]` and `.manager-topbar-action[hidden]` remain explicit `display: none !important` guards because class-level `display: grid` rules can otherwise override the user-agent hidden stylesheet.

Regression checks must cover: no visible zero badge, all three topbar actions equal and at least 48 CSS pixels wide at 320 pixels, clear-day End Day progression, zero mutation for every blocker type, Back/Forward routing, direct Inbox routing, read/unread counts and no horizontal overflow at 320, 375, 390 and 430 pixel portrait widths.

## Build 11.28 cache-safe compact-action architecture

The screenshot containing the full-width **Recruit Squad** and **New Team / Reset** controls is the retired Build 11.26 shell. Build 11.28 adds versioned asset URLs plus a defensive DOM migration so a host or browser cannot combine the old HTML controls with the current menu logic. The standalone output remains self-contained and should be opened by its new Build 11.28 filename.

### Opponent crit and compact-action behaviour

### Enemy critical support

`js/35-career.js` now exposes `refreshCriticalCombatProfile(bot)` as the shared bridge between generated operator attributes, the active weapon and live combat fields. `applySimulatedCareerToBot()` applies generated opposition stats and weapons through `applyCombatBuildToBot()` and then refreshes the same critical profile used by the owned squad. Red-team operators therefore receive their own effective chance, bonus damage and multiplier rather than using a separate fixed enemy value.

`Bot.shoot()` in `js/30-bot-ai.js` refreshes that profile after the normal hit roll succeeds. It increments each operator's `roundCriticalHits`, the global total and the appropriate entry in `combatDebug.criticalHitsByTeam`. Fatal criticals also increment `criticalEliminationsByTeam` and pass critical metadata into `Bot.die()`.

`js/40-match-flow.js` renders a gold `CRIT` badge on critical eliminations from either team. `js/50-ui-menus.js` includes current-round critical totals in both scoreboard team summaries. `window.__strikeDebug.enemyCriticalProfileForTest(slot, randomValue)` provides a deterministic red-team profile and roll check; `performance()` exposes both per-team critical arrays.

### Compact Command HQ actions

Build 11.28 first removed the full-width sidebar deployment card. Build 11.30 moves `#startMatchBtn` again into `.manager-topbar-actions`, where it is an equal icon beside Inbox and End Day. The regular Command HQ hides `.menu-side-actions`; that container remains reserved for the paired pause-menu actions.

The duplicate `#freshGameBtn` shortcut and its event wiring have been removed. The authoritative reset flow remains the confirmation-protected **New Team / Reset** danger card in Club > Configuration. This prevents a destructive career action from occupying permanent navigation space while retaining discoverability.

### Required Build 11.28 regression checks

- A generated red operator reports a stat-and-weapon critical profile with `source: OPPOSITION`, and a deterministic roll below its chance returns `critical: true`.
- Red-team landed criticals increment both the operator's round total and `criticalHitsByTeam[TEAM_RED]`; fatal criticals increment `criticalEliminationsByTeam[TEAM_RED]`.
- Critical eliminations from either team render the `feed-critical` marker, and both scoreboard summaries include CRITS.
- `#startMatchBtn` appears once inside `.manager-topbar-actions`, retains its SVG and matches the Inbox/End Day dimensions without document-level overflow at 320, 375, 390 and 430 CSS pixels.
- The ordinary Command HQ does not show a sidebar action block. Pause mode still shows Return to Match and Exit to Main Menu side by side.
- No `#freshGameBtn` or stale listener remains; Club > Configuration still requires confirmation before wiping data.


## Build 11.26 critical-hit architecture

Build 11.26 adds two allocatable player attributes: `criticalChance` and `criticalDamage`. They participate in generated-player ability, potential-limited development, scouting stars, player value and transfer interest.

`criticalCombatProfile(stats, weapon)` in `js/35-career.js` is authoritative. The baseline is 5% chance and +50% bonus damage. Each operator Crit Chance point adds 1 percentage point; each Crit Bonus Damage point adds 4 percentage points. Weapons add `critChanceBonus` and `critDamageBonus`. Final values are capped at 25% chance and +110% bonus damage, producing a maximum 2.10× total critical multiplier.

`Bot.shoot()` in `js/30-bot-ai.js` rolls a critical only after the shot passes aim, target-exposure, line-of-fire and ordinary hit-chance checks. Critical damage multiplies the normal damage roll before target damage resistance and current-health clamping. `roundCriticalHits`, match tracking, `lastMatch.criticalHits` and `career.criticalHits` preserve the result for telemetry and records.

Weapons have distinct profiles:

- P12 Scrapline: no weapon critical modifier;
- P12 Service: +1% critical chance and +10% critical bonus damage;
- Viper-9 Compact: +3% critical chance and +5% critical bonus damage.

Damage-number rendering remains contextual. `spawnDamageNumber(..., critical)` adds a gold/yellow `critical` state and `CRIT`/`CRIT DOWN` tag while preserving the 18-effect cap and no-information-leak rule.

### Required Build 11.26 regression checks

- Old saves normalise to schema 11 with both critical attributes present.
- Increasing Crit Chance raises the effective percentage by exactly one point per allocated attribute point.
- Increasing Crit Bonus Damage raises bonus damage by exactly four percentage points per allocated point.
- Service and Viper weapon modifiers stack with the same operator profile without replacing operator stats.
- Critical damage equals normal rolled damage multiplied by the reported critical multiplier before resistance/clamping.
- Critical feedback has the `critical` class and yellow/gold presentation, remains contextual and does not exceed 18 active effects.
- Critical attributes increase player value/overall where potential permits.
- Phone profile and training pages remain free of document-level overflow with seven attribute rows.


## Build 11.25 header and spectator-health architecture

### Persistent Inbox control

`index.html` contains `#managerMailBtn` and `#managerMailBadge` inside `.manager-topbar`. `js/50-ui-menus.js` refreshes disabled, active and unread states during `updateMenuUI()`, while `js/70-runtime.js` routes a tap directly to `setMenuRoute('mail')`. The badge is capped visually at `99+`; the accessible label retains the current unread count.

The mobile topbar uses explicit brand, mail and active-team columns. The mail target remains 48–52 CSS pixels wide at supported portrait sizes and 58 pixels in landscape/large layouts.

### Health-state colour

`js/50-ui-menus.js` owns `spectatorHealthColour(current, maximum)`. The mapping is piecewise:

- full health: green;
- half health: amber;
- empty health: red.

`updateHud()` applies the colour to the landscape HP text, portrait HP text and spectator health bar. `window.__strikeDebug.healthColourForTest()` validates the mapping and `setSpectatorHealthForTest()` validates DOM application.

### Mobile route alignment

Portrait `.menu-subtab` elements centre their visible labels with flex alignment and a consistent line height. Overflow behaviour, route arrows and active-route scrolling remain unchanged.

### Required Build 11.25 regression checks

- Health mapping returns green at 100%, amber at 50% and red at 0%.
- Updating the watched operator's health changes both portrait and landscape HP colours.
- The manager envelope opens Club Inbox and reflects unread/active state.
- The mail button stays at least 48 CSS pixels wide at 320 pixels.
- League and other short route labels are centred with zero meaningful centre offset.
- No document-level horizontal overflow at 320, 375, 390, 430 or 844 × 390.
- Preserve transfer negotiation, league, calendar, own-team spectating, sprint audio, injuries and first-to-three match flow.

## Build 11.24 club-operations architecture

### Career calendar and Inbox

`js/39-club-operations.js` owns simulated dates, End Day, Saturday league scheduling, one-match-per-day protection, mail, scouting-star presentation, staff pools, tactics and assistant-lineup delegation. The calendar stores `absoluteDay`, `dayOfWeek`, `nextLeagueDay`, `lastMatchDay` and weekly-summary state inside the version-11 career save. End Day is the only routine source of day progression; real time and intermediate rounds never advance career dates.

Daily progression calls `applyPlayerTrainingDay()` and `recoverPlayerInjuryDay()` for every contracted player. It may generate Inbox messages when an attribute improves or an injury clears. Weekly boundaries may refresh the Division-locked recruitment shortlist and generate planning mail. League matchday mail appears when the scheduled Saturday arrives.

### Division ladder and search pools

`js/37-league.js` defines Division 3, Division 2, Division 1 and Pro League. Each current division has 20 persistent clubs and 380 fixtures. Top-two promotion and bottom-two relegation are evaluated only when the complete 38-match home-and-away season finishes and the manager starts the next season. Search-pool dropdowns show all tiers but enable only the current division.

Division 3 player generation deliberately uses lower ability, potential, fees and wages than higher tiers. Market cards show division-relative current-ability and potential stars. These stars are scouting summaries, while the detailed profile remains the authoritative data view.

### Staff, formations and delegation

Assistant-manager candidates persist judging ability/potential, tactics, man management, fitness, style, signing fee and wage. Staff wages are included in the club wage bill. Manual lineup control remains the default; when delegated, the employed assistant ranks the squad using ability, formation role fit, readiness, fatigue, form, sharpness and medical status and places the best five in squad positions 0–4.

Balanced, Pressure, Control, Defensive and Wide formations influence selection priorities and apply small bounded live-match behaviour modifiers. They never replace individual role, attribute, fatigue, injury or weapon calculations.

### Low-health cover initiative

`Bot.updateCombatStalemate()` now handles both healthy and low-health cover duels. When two loaded opponents remain concealed without damage, deterministic initiative makes one operator push or reposition and may make the other challenge from a peek point. Damage resets the timer. This rule prevents mutual low-health hesitation without forcing an injured/reloading operator into an irrational rush.

### Required Build 11.24 regression checks

- version-11 transfer state creation and save round-trip, including an active incoming negotiation and pending outgoing bid;
- incoming negotiation counter/accept/complete flow with final cash, wage and squad-cap checks;
- outgoing bid accept/reject/counter flow and buyer-roster mutation;
- 350,000-credit bank loan / 32,000-credit starting wage budget and an affordable five-player Division 3 foundation;
- visible Team/Player point alerts and attention counts after XP grants;
- transfer and market controls at 44 CSS pixels or taller with no overflow at 320, 375, 390, 430 and 844 × 390;
- version-11 calendar/mail/staff/tactics/league save creation and round-trip;
- Division 3 start, affordable 18-player pool, division-relative stars and locked upper-tier options;
- five affordable signings within opening credit and wage budgets;
- End Day progression to Saturday, pre-match gating and one-match-per-day protection;
- daily technical progress, stat gain/value recalculation, fatigue recovery and day-based injury recovery;
- assistant appointment cost/wages, manual-versus-delegated lineup and exactly five assistant-selected starters;
- all five formations and bounded live modifiers;
- Inbox unread/read state and route actions;
- low-health and normal cover-stalemate breaking;
- top-two promotion, bottom-two relegation and refreshed division pools;
- no horizontal document overflow at 320, 375, 390 and 430 portrait widths plus mobile landscape.

## Retained Build 11.22 combat, sprint and environment architecture

### Target exposure and authoritative shooting

`hasLineOfSight()` in `js/00-core.js` remains the strict centre-corridor wall test. `hasTargetExposure()` adds a small, bounded set of rays around the target capsule so a visible shoulder or side may establish perception. `Bot.canVisuallySee()` and the final shot/recheck paths use the exposure helper, while grid walls and `LEVEL_PROP_COLLIDERS` remain authoritative blockers. Do not broaden these samples enough to recreate corner shooting through solid cover.

### Cover-stalemate breaker

`Bot.updateCombatStalemate()` in `js/30-bot-ai.js` accumulates only when both opponents are committed to cover, no recent damage has occurred and the acting bot is healthy and loaded. Once the threshold is reached it requests repositioning and may clear cover for a short push. Damage resets both operators' stalemate timers. The timing uses `simulationClock`, not the decreasing round timer.

### Sprinting, sound evidence and workload

`Bot.sprintSpeedMultiplier()` enables short bursts only when the route is clear and the operator has sufficient readiness. Current player fatigue and transient `movementFatigue` reduce sprint availability. Collision-safe sprint travel is accumulated in `roundSprintDistance`.

Sprint footsteps emit `gait: "sprint"`, approximately 0.82–1.04 loudness and a 12.6-unit base hearing radius before late-round hunt boosts. `js/10-audio.js` gives sprint steps a distinct playback/high-pass treatment, while `processHearing()` consumes the same event radius as AI evidence. Match tracking accumulates sprint distance; weekly fatigue workload and `playerInjuryRisk()` include bounded sprint contributions.

### Mobile environment detail

`worldBatches.floorPatches`, `laneStrips` and `wallKickPlates` are generated in `buildWorldBatches()` from existing map cells and wall rectangles. They are decorative only and do not change navigation or collision. `window.__strikeDebug.environment()` reports their counts and can build batches in non-WebGL test environments.

### Mobile layout rules

Portrait match controls retain 46-pixel buttons where space permits. At widths up to 390 pixels they use a three-column first row and a Speed/Menu second row. Live Command HQ uses an 92-pixel two-row sticky header during a match, with page identity above equal-width Speed/Pause controls and the subnavigation offset adjusted to 92 pixels.

### Retained combat/environment regression checks

- Sprint test events report `gait: sprint`, radius at least 12 units and loudness at least 0.9.
- Injury risk with the same fatigue/rounds/damage is higher when sprint distance is added.
- The cover-stalemate test leaves cover through a push or reposition request.
- The watched player's role appears in the active-camera club readout.
- Floor-patch, lane-strip and wall-kick-plate batches are non-zero.
- Live-HQ speed and pause controls align on one row; portrait match controls retain at least 44-pixel tap height.
- No document-level horizontal overflow at 320, 375, 390 and 430 portrait widths or representative mobile landscape.
- Run an unrelated pass over league fixture count, own-team spectating, first-to-three scoring, damage-effect cap and copy-counted weapon ownership.

## Supported presentation targets

Strikewatch keeps the existing phone interface and now treats the PC Command HQ shell as a separate supported presentation target.

- Portrait and mobile landscape remain supported and regression-locked for Build 12.59.
- Touch targets should normally be at least 44 CSS pixels where space permits.
- Primary portrait checks use 320, 375, 390, 402 and 430 CSS-pixel widths; representative mobile landscape includes 844 × 390.
- iPhone safe areas, browser chrome, accidental page scrolling and touch gestures remain authoritative below `1024px`.
- Command HQ route overflow below `1024px` uses edge arrows owned by `index.html`, state from `updateMenuSubnavOverflow()` in `js/50-ui-menus.js`, interaction wiring in `js/70-runtime.js`, and the existing mobile layout rules in `css/game.css`.
- Mobile arrow controls must align to the full route-row height, reserve space so labels are not obscured and keep their hidden state authoritative. Route changes may scroll the active route into view once; recurring refreshes must preserve the manager's current horizontal position.
- At `1024px` and wider, the desktop layer removes route arrows, fits or wraps the route grid, provides stable keyboard focus and centres the management workspace within bounded line lengths.
- Desktop release checks use 1024, 1280, 1366, 1440 and 1920 CSS-pixel widths and must show no document-level horizontal overflow or subnav/content overlap.

## Build workflow

For a playable source change:

```bash
python3 build.py
node --check js/strikewatch.dev.js
```

Then extract the inline script from the current `dist/strikewatch-build-<version>.html`, syntax-check it, run targeted tests and perform a second unrelated-regression pass.

The standalone HTML contains all CSS and JavaScript and requires no external files.

Documentation-only maintenance does not require a build-number increase because Markdown is not embedded in the release, but documentation must remain labelled with the actual playable build.

## Current gameplay loop

1. The application opens on Command HQ with no team created.
2. The player enters a team name and manager name to found an organisation.
3. The new organisation receives a 350,000-credit bank start-up loan, a 32,000-credit weekly wage budget and no contracted players.
4. A six-step tutorial first explains the start-up loan and four persistent topbar shortcuts, then directs the player to Recruitment, a detailed player profile, the first signing and the Squad screen.
5. Generated candidates are compared by ability, potential, role, personality, history, asking fee, wage and contract. The manager negotiates the fee, wage and contract length before completing each signing.
6. The manager signs at least five players and reorders the squad; positions one to five are the active line-up and position one is the default telemetry/camera focus.
7. The simple Division 3 introduction presents the next scheduled rival, promotion places and the immediate rules without exposing every future tier at once.
8. The manager chooses the next ranked league fixture or an unranked exhibition; simulated matchmaking opens only when a complete starting five exists.
9. Matchmaking progresses through queue, server, persistent opponent roster, ready and deployment stages.
10. The recruited Blue line-up and the active rival club roster enter the autonomous 3D match.
11. The first team to win three rounds wins the match; intermediate rounds continue directly without repeating matchmaking.
12. A league result settles the scheduled fixture once, simulates the other nine matchday results and updates the table; an exhibition leaves standings untouched.
13. The after-action report appears after the full match and updates Team XP, individual Player XP, reputation and player career records.
14. Match income and outcome bonuses are credited immediately; combined player/staff payroll is deducted only when End Day crosses the weekly calendar boundary.
15. Match participation awards Player XP and Team XP, while technical training and medical recovery remain calendar-driven through End Day.
16. Participating starters receive a fatigue/vulnerability/stat-sensitive medical roll; reserves receive no match injury roll.
17. A Blue-side victory awards one field crate; defeat awards no crate.
18. The manager returns to Command HQ to review Inbox, calendar, tactics, staff, division table, training, finances, profiles, squad order and recruitment before ending the day.

## Division pyramid league system

League state is persistent management data owned by `js/37-league.js` and stored inside the current schema-17 career state.

- The club begins in Division 3; Division 2, Division 1 and the Pro League are progressively stronger tiers.
- The active division contains 20 clubs: the manager's organisation and 19 persistent fictional rivals, each with identity, tactical style, rating and a five-player roster.
- The double-round-robin schedule contains 380 fixtures across 38 matchdays, ten fixtures per matchday, with every pair meeting once at each home venue.
- Northbridge Five is the first Division 3 opponent.
- League fixtures are tied to the simulated calendar and normally become playable on Saturday. `prepareLeagueMatchContext()` refuses early league deployment and one completed match per simulated day is enforced.
- League victories award three points. Table ordering is points, round difference, rounds won, then club name.
- `settleActiveLeagueMatch()` records the user's completed full-match result, simulates the other nine matchday fixtures and schedules the next league Saturday. Intermediate rounds never settle league state.
- Exhibitions use rival squads and normal match/finance/XP/wellbeing settlement but do not alter the division table or scheduled league fixture.
- At season completion, the top two promote and bottom two relegate where another tier exists. `startNextLeagueSeason()` applies movement, creates a new 20-club home-and-away schedule and refreshes division-appropriate player/staff pools.
- Pool selectors expose all four tiers for context but only the current division is enabled.


## Simulated matchmaking

Matchmaking presentation is owned by `index.html`, `css/game.css`, `js/50-ui-menus.js` and runtime input/debug bindings in `js/70-runtime.js`.

- `beginMatchmaking()` is the entry point for a new fixture from HQ.
- It must refuse deployment until `careerSquadReady()` confirms at least five contracted players.
- The Blue provisional roster must use the first five persistent squad profiles rather than placeholder names.
- `updateMatchmaking()` advances the staged sequence.
- `completeMatchmaking()` calls `createMatch()` only after the simulated deployment countdown.
- `cancelMatchmaking()` returns safely to HQ before the deploy stage.
- The sequence displays server allocation, ten-player provisional rosters, simulated ping, ready counts and deployment lock.
- Matchmaking is presentation-only and must not alter contracts, credits or rewards.
- `START NEXT ROUND` bypasses matchmaking because it belongs to an already active match series.

Do not create the playable match underneath the matchmaking overlay or allow an incomplete squad to deploy.

## Command HQ interface

Command HQ uses an information-dense football-management-inspired structure without copying a commercial game's assets or exact layout.

- The persistent header carries Back/Forward history, Gold Coins, Inbox, End Day, Calendar, Match and the current date.
- Five equal primary sections span the mobile width: **Operations**, **Team**, **Armoury**, **Supplies** and **Club**. Each opens a stable overview page with current metrics and direct destinations.
- A compact **You are here** locator identifies the current section and route. Its section control returns to the relevant overview.
- Persistent section subnavigation exposes ordinary routes without requiring a nested dropdown. Overflow arrows and edge fades reveal hidden items when a section is wider than the viewport.
- Player Profile is the context-only player record reached from a player, report or live spectator link. It embeds individual telemetry and appears in subnavigation only while active rather than duplicating a separate telemetry destination.
- The Command Index is generated from `menuSections` and provides search, recommended next actions, recently visited routes, status, badges and locked/context explanations.
- Major destinations should require no more than two taps from a primary section. Panels remain compact and data-led rather than heavily rounded or floating.
- The Operations overview shows next actions, squad eligibility, balance, payroll, wage headroom and reputation. Other section overviews summarise their own actionable state.
- Portrait and landscape layouts must avoid document-level horizontal overflow. Primary controls remain at least 44 pixels in portrait.
- Portrait pause controls use one two-column row for **RETURN TO MATCH** and **EXIT TO MAIN MENU**.
- Sticky header, locator and section-subnavigation offsets must remain separated.
- Opening the live menu automatically selects the currently spectated own-team player and opens that player's Profile & Data record with embedded live telemetry.
- Opening the pause menu and changing routes resets the content scroller while Back/Forward restores route context and saved scroll position.

## Team-management UX and player navigation

- The Squad screen renders the first five contracts under **Starting Five** and positions six to eight under **Reserves**.
- `renderTeamPlayerMini()` keeps Profile & Data, loadout and reorder controls in separate visual rows with touch-friendly targets.
- `renderTeamPlayerContextBar()` is shared by contracted-player Profile and Loadout views; individual telemetry is rendered inside Profile.
- The context bar must retain Back to Squad, previous/next player, active-view state and direct Profile/Telemetry/Loadout navigation.
- `selectAdjacentTeamPlayer()` changes the selected player while preserving the current player-centric route.
- Recruitment targets use a Back to Recruitment bar rather than squad navigation.
- `updateMenuUI()` writes `data-menu-route` and `data-menu-section` on `.menu-shell`; CSS uses these only for page differentiation and must not become gameplay state.
- Route accents distinguish Recruitment, Profile, Telemetry, Loadout, Finances and Reports while maintaining readable contrast.
- Responsive regression must cover card-action and context-bar overflow at 320 × 700, 390 × 844, 844 × 390 and 1366 × 768.

## Live Command HQ simulation

When Command HQ is opened from an active match, `menuContext` remains the internal live-match lock context while `matchSimulationPaused` controls whether simulation time advances.

- `openPauseMenu()` opens Command HQ with `matchSimulationPaused = false`; the legacy function name is retained for compatibility, but the user-facing behaviour is a live overlay.
- `update()` in `js/70-runtime.js` continues round timers, Bot updates, sound evidence, eliminations, Sudden Hunt and match flow when the app is in the live menu and the explicit pause flag is false.
- `toggleMatchSimulationPause()` is the only menu-level control that freezes/resumes the active simulation. Returning to the match always resumes it.
- `syncLiveMenuControls()` keeps the badge, manager status and compact header button aligned with the actual state.
- `refreshLiveMenuTelemetry()` refreshes Mission Control, Team Telemetry and Player Telemetry approximately twice per second while preserving the inner scroller position.
- The currently spectated own-team player takes priority when Command HQ opens: `selectedTeamPlayerId` is set and the route opens that player’s Profile & Data record. Otherwise, the last valid Operations route is restored.
- Recruitment, line-up, contract, loadout and progression mutations remain locked by the live-match menu context.
- A completed match still owns the report/crate flow even if completion occurs while Command HQ is visible.

Keyboard behaviour:

- `Escape`: return to the live spectator feed.
- `P` or `Space`: pause or resume the background match while Command HQ is open.
- `F`: toggle authoritative match simulation between 1× and 2× speed.

## Spectator ownership, match speed and damage feedback

- Every player-facing camera-selection path filters to `CAREER_OWNED_TEAM`. Previous/Next, Auto Spectate, scoreboard selection, canvas switching and `__strikeDebug.selectSpectator()` may not choose opposition players.
- Opposition scoreboard rows retain identity, status and weapon information but are not interactive camera targets.
- `matchSpeedMultiplier` supports 1× and 2×. `update()` advances match simulation through substeps capped at 0.033 seconds, while reports, reward presentation and menu interaction remain real-time.
- Landscape, portrait and live-HQ speed buttons are synchronised by `syncMatchSpeedControls()`; `F` toggles speed.
- Confirmed outgoing hits from the spectated player and incoming hits against that player may create damage-number effects. Misses, blocked shots and unrelated combat must not reveal numbers.
- `damageNumberEffects` is capped at 18 and all expired elements are removed from the DOM.

## Performance safeguards

- Routine HUD/telemetry refresh is capped at 20 Hz while authoritative simulation remains full-rate.
- Scoreboard HTML is rebuilt only while the scoreboard is open.
- Non-crate Command HQ WebGL rendering is capped at 30 FPS without slowing background match simulation.
- Feed and sound-event expiry use in-place removal to reduce transient allocations.
- `window.__strikeDebug.performance()` exposes rolling frame/update/render times, long frames, skipped menu renders, transient counts and active rate caps.

## Injury and medical system

`js/39-medical.js` owns persistent vulnerability, risk, injury selection, recovery, medical labels and bounded match penalties.

- Save schema version 11 persists `injuryVulnerability`, `injury`, `injuryHistory`, `lastInjuryRisk` and `lastMedicalUpdate` per player.
- Injury risk is calculated once at full-match settlement for participating starters. Intermediate rounds and idle/background time do not roll injuries.
- Risk rises with pre-match fatigue, vulnerability, workload, damage received, age and an existing injury. Resilience and the Sports Science department reduce it.
- A newly sustained injury does not immediately lose a recovery week. Existing injuries recover after an injury-free completed week; Rest & Recovery grants an additional recovery step.
- Playing while injured remains permitted to avoid a five-player soft lock, but performance/readiness penalties apply and a failed medical roll may aggravate recovery time.
- Medical status is visible on squad cards, profiles, Training Facility, Team Telemetry and Player Telemetry.
- Active injury penalties modestly reduce market value and transfer-interest score until recovery.
- Preserve `window.__strikeDebug.medical()` and `injuryRiskForTest()`.

## Individual squad loadouts

Loadout ownership is split between the club armoury inventory and the individual player profile.

- `careerState.inventory` is the authoritative list of owned club weapon items.
- Each contracted squad profile stores its own `equippedWeaponId`.
- `careerArmouryTargetPlayer()` resolves the current contracted-player target and safely falls back to the first squad member.
- `careerPlayerEquippedWeaponId(player)` validates a player's issue against the unlocked club inventory.
- `selectCareerArmouryPlayer(playerId, navigate)` updates the target and selected weapon without modifying any loadout.
- `equipCareerWeapon(id)` changes only the current target player's issue; it mirrors the value into `careerState.equippedWeaponId` only when the target is the first starter for legacy compatibility.
- The Armoury renders all starter and reserve loadouts before the armoury inventory and weapon inspector.
- Starter Scrapline pistols are unlimited standard issue. Every dropped Service, Viper or AR-4 reward adds one finite club copy. Each copy may be assigned once, while multiple owned copies may be issued simultaneously.
- Club-wide skins remain global in Build 11.24. Attachments remain non-functional placeholders.
- Squad/profile shortcuts use `data-team-armoury` and Armoury target buttons use `data-career-armoury-player`.

Regression checks must verify that finite assignments never exceed owned copies, a fully issued one-copy weapon transfers with a valid fallback, multiple copies can serve multiple holders, repeated inventory IDs survive schema serialisation/save reload and the first five issues map to the correct Blue match slots. `window.__strikeDebug.roundTripCareerStateForTest()`, `selectLoadoutPlayerForTest()` and `equipPlayerWeaponForTest()` provide deterministic coverage.

## Team telemetry and player wellbeing

Operations has two deliberately separate telemetry routes.

- `telemetry` is the overall team view. It aggregates all owned Blue bots for live kills, deaths, shots, accuracy, damage, health/alive state and tactical status, then combines those values with the starting five's fatigue, happiness and readiness.
- `player-telemetry` is the individual view. `selectedTeamPlayerId`/`careerState.selectedPlayerId` chooses the profile, and the view shows live bot data when that player is deployed or stored condition and last-match data when in HQ.
- Selecting a telemetry player must not alter squad order, Armoury ownership or matchmaking selection.
- The compact in-match player-link panel follows the selected telemetry player, with the first starter as fallback.

Version-4 player profiles persist:

- fatigue from 0 fresh to 100 exhausted;
- happiness, morale and match sharpness from 1 to 100;
- form from 1.0 to 10.0;
- derived condition and readiness labels;
- a latest-match line containing rating, kills, deaths, accuracy, damage, rounds and a three-part reflection.

`resetTeamMatchTracking()` starts a fresh per-player match ledger. `recordTeamMatchRound()` captures each starter's round metrics before the next round reset. `settleTeamManagementAfterMatch()` updates player career totals, form, morale, happiness, fatigue, sharpness, contracts and comments exactly once after the full match. Reserves recover fatigue because they did not play.

`applyCareerToBot()` uses small capped modifiers from fatigue, happiness, morale and form. These modifiers affect speed, movement skill, accuracy bonus, reaction delay, reload multiplier and maximum health, but the five core stats and equipped weapon remain dominant.

The reflection generator must provide: a first-person assessment of the player's own match, a view of the team's performance and a manager insight. It should use performance evidence such as rating, accuracy, K/D, team accuracy, trading outcome, match length and fatigue rather than random generic text.

## Training, Player XP and Team XP

Build 11.24 retains two independent progression tracks owned by `js/38-development.js`.

### Player development

- Every player persists a personal level, current XP and unspent stat points.
- Completed matches award Player XP from participation, kills, rating, rounds and result; reserves receive a smaller award.
- A player level grants one personal stat point. The point may improve only that player's five combat attributes and remains bounded by the normal attribute cap and player potential.
- The Player Profile is the authoritative stat-allocation surface. Training and profile routes may link to one another without changing squad order or loadout ownership.

### Training facility

- Training assignments are Marksmanship, Handling, Awareness, Mobility, Resilience, Rest & Recovery or No Assignment.
- Technical programmes accumulate fractional progress through End Day. They do not tick in real time, offline, at match settlement or after intermediate rounds.
- At 100 progress, the focused attribute gains one point when the player still has development capacity; excess progress is retained.
- Age, remaining potential, fatigue and Coaching Staff affect progress. Rest and unassigned weeks recover fatigue instead of technical skill.

### Team development

- `careerState.level`, `careerState.xp` and `careerState.unspentPoints` are Team Level, Team XP and team-benefit points. They are not a hidden sixth player profile.
- Coaching Staff improves training progress; Performance Analysis improves Player XP; Sports Science improves recovery; Commercial Department improves match income.
- Team benefits are permanent, individually capped at level 5 and applied only through their documented multipliers. Club reputation remains a separate value.

### Market value and interest

- Value is recalculated from current ability, potential, age, form, recent performance, Player Level and remaining contract.
- Attribute gains and strong performance can increase value and transfer interest; decline, age or poor form can reduce it.
- Interest may list persistent clubs in the active league pyramid monitoring the player. No offers, sales or rival transfers occur automatically in this release.

### Ammunition store placeholder

The Club section contains a non-functional store preview. It must retain disabled purchase controls and explicit wording that credits, ammunition stock, magazines and match supply are unchanged until a dedicated economy design is implemented.

## Audio lifecycle and controls

Audio generation remains asset-free and is owned by `js/10-audio.js`, with browser lifecycle and gesture bindings in `js/70-runtime.js`.

- `ensureAudio()` creates or recreates the Web Audio graph, makes a fresh `resume()` attempt and never reuses a stale failed unlock promise.
- `resumeAudioFromGesture()` runs from captured pointer, touch and keyboard interactions, and is called explicitly before returning from Command HQ to the match.
- `recoverAudioAfterVisibility()` retries a previously unlocked, enabled context after `visibilitychange`, `pageshow` or window focus.
- `audioDisplayState()` distinguishes **ON**, **OFF**, **TAP TO RESUME** and **UNSUPPORTED** rather than reporting only the preference flag.
- The Club Configuration screen exposes a direct enable/test or mute control.
- Context recovery must preserve an intentional mute.
- Debug helpers `suspendAudioForTest()` and `recoverAudioForTest()` support deterministic lifecycle regression checks.

## Player attributes and tactical roles

Build 11.39 makes these attributes part of an explicit tactical-suitability model rather than relying only on their direct combat effects. Formation, approach, range and priority previews use the submitted starters, while temporary match roles produce a per-player fit score. Tactical familiarity and opponent style complete the Plan Fit assessment; the resulting modifier is bounded and affects execution rather than raw damage.


Generated players use the existing 1–10 combat attributes:

- **Marksmanship:** accuracy, damage consistency and a small weapon-damage increase.
- **Handling:** fire cadence, reload speed, recoil recovery and weapon control.
- **Awareness:** hearing range, target acquisition and reaction time.
- **Mobility:** movement speed, pathing and repositioning.
- **Resilience:** maximum health and incoming-damage reduction.

Current primary roles are Entry, Support, Anchor, Flanker, Marksman, Shot Caller and Flex. A role is persistent profile data and also affects autonomous combat temperament in `applyCareerToBot()`; it must not be a cosmetic label only.

Player profiles also retain age, nationality, personality, traits, current ability, potential, secondary role, morale, happiness, fatigue, condition, match sharpness, readiness, form, value, acquisition fee, weekly wage, contract weeks, weapon preference, latest-match reflection, season history and cumulative career statistics.

The combat-effectiveness radar may use the selected player/captain profile and equipped weapon. Its letter grade, score and label must remain centred and non-overlapping.

## Match rules and rewards

Authoritative match constants and score state live in `js/00-core.js` and `js/40-match-flow.js`.

- `REGULATION_TARGET` is 3.
- Match score resets in `createMatch()`.
- `finishRound()` records the round result and starts another round unless a team reached the target.
- `finishMatch()` triggers `completeCareerMatch()`.
- `recordCareerRoundResult()` accumulates combined Blue-team statistics and calls the per-player round tracker once per completed round.
- `completeCareerMatch()` calculates XP, stores the final report and queues a crate only for a Blue victory.

Do not call the report or crate flow from every round. Rewards are match-level, not round-level.

## Current crate table

The authoritative reward table is `CAREER_CRATE_REWARDS` in `js/35-career.js`.

| Reward | Type | Chance | Duplicate conversion |
|---|---|---:|---:|
| P12 Service | Weapon | 32% | Additional usable copy |
| Viper-9 Compact | Weapon | 32% | Additional usable copy |
| AR-4 Sentinel | Weapon | 14% | Additional usable copy |
| Urban Grid | Common universal skin | 22% | 35 XP |

The crate flow uses these phases:

- **closed:** show the interactive custom-WebGL chest;
- **opening:** release the latches and animate the lid;
- **cycling:** hide the chest and show only possible rewards;
- **revealed:** return the open chest and present the winning reward above it;
- **claimed:** add the weapon copy, unlock the skin or convert a duplicate skin to XP, then return to the correct HQ/Store route.

Only rewards present in the authoritative drop table may appear during cycling.

## Reward renderer

`js/64-reward-renderer.js` owns a separate WebGL context for the field crate.

- It uses procedural cube meshes, shaders, transforms and lighting rather than external assets.
- It follows the same rendering method as the main game but must not reuse or corrupt the live arena WebGL context.
- The closed crate auto-rotates subtly and supports pointer/touch drag rotation.
- The opening phase animates lid pitch and internal light.
- The renderer handles context loss/restoration and shows a fallback message when WebGL is unavailable.
- CSS owns canvas layout and phase visibility, not the crate geometry.

`resetCareerCrateRenderer()` should be called when a newly earned crate is presented so each reward sequence begins from a consistent inspection angle.

## Persistent team, player and finance data

`js/35-career.js` owns schema loading/migration and shared career/reward state. `js/36-team-management.js` normalises and operates on the squad-management fields.

A new version-11 career stores at least:

- team name and manager name;
- credits, wage budget, club week and reputation;
- up to eight contracted squad profiles;
- generated recruitment market and deterministic market seed;
- selected profile and line-up order;
- tutorial progress;
- finance ledger;
- persistent division tier, season, clubs, rival rosters, fixtures, results, promotion/relegation state and intro state;
- simulated calendar, Inbox/read state, assistant-manager staff pool/employees and formation/delegation settings;
- shared weapon inventory, skins and reward progression;
- club match totals and the latest report.

New careers begin with no contracted players. Five are required to deploy. The first five squad positions map to Blue slots 0–4; up to three later positions are reserves.

Each generated player persists identity, attributes, roles, personality, traits, potential, form, morale, fee/value, wage, contract length, preferred/equipped weapon, generated history and career totals. Generated market names should be unique within the active shortlist.

The initial market must always provide a viable five-player foundation within the 350,000-credit borrowed transfer balance and 32,000-credit wage budget. Recruitment opens a negotiated fee/wage/contract package rather than signing instantly. Rival clubs may bid for contracted players, and completed negotiated sales credit the agreed amount. A market refresh costs 2,500 credits; a staff refresh costs 1,500 credits.

After a completed match, `settleTeamManagementAfterMatch()` credits match/gate income, applies the outcome bonus, updates reputation, form, morale, Player XP, medical risk and individual records, and writes match income to the ledger. It does not advance the calendar, deduct payroll or reduce contracts. `clubWeeklyCalendarTasks()` processes combined player/staff wages and contract weeks when End Day crosses into a new week. Intermediate rounds trigger neither settlement.

Older single-operator saves migrate the previous owned operator into one legacy squad slot so existing progress is not silently deleted.

## Weapon and skin source of truth

Weapon definitions, shared visual geometry and skin material overrides live in `js/35-career.js`.

Key functions/data:

- `CAREER_WEAPON_CATALOG`
- `CAREER_WEAPON_VISUAL_REVISION`
- `CAREER_WEAPON_MATERIAL_STYLES`
- `careerWeaponVisualParts()`
- `careerWeaponMaterialStyle()`
- `careerWeapon3dMarkup()`
- `CAREER_SKIN_CATALOG`

Every presentation must consume the same shared model:

- inventory thumbnails;
- interactive Armoury inspector;
- crate previews;
- first-person viewmodel;
- third-person operator weapon;
- corpse/dropped weapon.

A renderer may change pose, scale, recoil, reload movement and hand placement. It must not duplicate weapon dimensions or create an independent visual identity.

Weapon feel is also data-led. Career pistols may define `recoilKick`, `recoilRecovery`, `recoilSpread`, `recoilVisualKick`, `recoilVisualRecovery`, `recoilRoll`, `cadenceJitter` and `burstChance`. `js/30-bot-ai.js` consumes the simulation-facing values through temporary `weaponHeat`; `js/63-viewmodel-renderer.js` consumes the presentation-facing values for kick, recovery, roll, camera response and crosshair expansion.

First-person reload staging is centralised by `firstPersonReloadPhases()`. It exposes lower, magazine-release, magazine-insert, rack-hand, slide-lock and rack phases so the magazine, support hand and slide remain synchronised. Do not replace this with unrelated sine-wave offsets for pistols.

Universal skins must alter the same shared materials in all presentation contexts. Build 11.0 introduced the common **Urban Grid** slate-and-red finish, which remains available in Build 11.24.

## Operator model and lower-body rig

Third-person operator geometry is owned by `js/62-character-renderer.js`.

- `operatorSolveKneeLocal()` is the shared two-bone leg solver. It projects a forward/outward pole onto the bend plane so knees remain anatomically forward-facing instead of flipping behind the hip-to-ankle line.
- `operatorLegLocalPose()` generates living walk, run and crouch poses using fixed thigh/shin lengths, phase-based lift, foot yaw and boot pitch.
- `operatorCorpseLegLocalPose()` applies the same solver to death poses, so dropped bodies may spread or fold their legs without hyperextending the knee backwards.
- Lower-body armour is attached to the solved chain: thigh plate, layered front knee pad, shin guard, ankle cuff, boot and sole.
- Knee pads use a matte backing plate, dark polymer shell and non-emissive straps. A small muted team tab may identify the side, but the knee assembly must never use emissive or hurt-glow values.
- Do not return to independently positioning hip, knee and ankle with unrelated sine offsets. Changes to stride or crouch must continue through the shared pose/solver functions.
- `operatorLegGeometryAudit()` checks representative standing, running and crouched phases for forward bend, stable segment lengths and floor-safe foot height.
- `OPERATOR_PROPORTIONS` defines the original compact silhouette: broader shoulders, reduced leg-to-torso ratio and chunkier extremities for clearer distance readability.
- `operatorProportionAudit()` checks the model height and shoulder-to-height ratio; preserve it alongside the leg audit.
- `operatorArmourMaterialAudit()` verifies the knee plate/accent emissive values remain zero and must stay exposed through `window.__strikeDebug.operatorModel()`.

## Scoreboard status

The scoreboard is owned by `index.html`, `css/game.css` and `js/50-ui-menus.js`. Match identity is supplied by `js/37-league.js` through the captured match-presentation helpers.

The two team panels must display the actual club names and home/away roles. Blue/red are visual side colours and simulation constants, not user-facing team names. The scoreboard title uses club abbreviations with the round score, while matchmaking, spectator labels, round-result banners and reports consume the same captured presentation. This snapshot must survive league settlement so a completed match does not revert to generic opposition.

Living scoreboard rows are selectable by pointer or keyboard and may switch the spectator camera. Eliminated rows remain informational and cannot become live camera targets. The selected camera row receives a visible state without replacing the life-status dot. Club and manager identity fields support up to 24 characters; the scoreboard, matchmaking headers, HUD and reports must accommodate the saved full name without page-level horizontal overflow.

Every operator name has a compact circular life-state indicator:

- green for a living operator;
- red for an eliminated operator.

The indicator supplements rather than replaces the `.alive` / `.dead` row classes, 0 HP, muted/red dead-row styling and the **ELIMINATED** tactical-status text. Do not use skull glyphs; keep the indicator shape and colour readable at portrait scoreboard sizes and include an accessible label.

## Evidence-driven hunt behaviour

Search and endgame pressure are owned by `js/20-navigation.js` and `js/30-bot-ai.js`.

- `rememberHuntEvidence()` stores decaying visual or audible contact without continuously tracking the enemy. Repeated observations estimate a bounded movement vector from the samples themselves.
- `activeHuntEvidence()` may use approximate evidence shared by living teammates, representing radio communication rather than omniscient vision.
- `chooseLateRoundGoal()` never reads a hidden opponent's live coordinates. It builds candidates around credible evidence, a short uncertainty-limited intercept projected from repeated evidence, or—when evidence is absent—hotspots, likely routes, enemy-side approaches and random uncleared walkable sectors.
- Candidate selection is weighted and stochastic. Route history, previously cleared sectors, reversals and teammate overlap reduce probability, so search paths are choices rather than a predetermined sequence.
- `isLateRoundHuntActive()` also reacts to clock pressure. `isUrgentHuntActive()` increases movement commitment in duels, after prolonged silence or late in the round.
- During urgent hunts, committed running footsteps have a larger simulation hearing radius and better occluded audibility. This is still a real emitted sound event, not a hidden-position reveal.
- Urgent evidence-free choices favour central contact hubs while retaining weighted variation, improving the chance that independently searching opponents cross paths.
- `huntStationaryTimer` clears stale cover/path state and requests a new reachable hunt route when a survivor remains stationary without current contact.
- Reaching heard or last-seen evidence marks that sector cleared and continues into another evidence-led or hypothesis-led sweep.
- If regulation time reaches zero while both teams have survivors, `beginSuddenHuntOvertime()` starts one 45-second evidence-led overtime. It clears stale cover commitments, forces urgent movement and labels the HUD/scoreboard; a normal time-limit tiebreak remains after that single safety window.
- Sudden Hunt uses longer-lived visual/audio evidence and intentionally loud running footsteps, but every location still originates from an emitted sound or observed position rather than hidden simulation coordinates.
- In decisive late-round contact, `chooseCombatTactic()` reduces cosmetic post-burst disengagement and preserves pressure unless ammunition, reload safety or critically low health requires a break.

Preserve anti-loop navigation, collision-safe A* routing and uncertainty. Do not substitute direct enemy coordinates for evidence.

## Tactical combat behaviour

Build 11.2 introduced the committed tactical layer, which remains authoritative in the current build.

- `findCombatCover()` evaluates reachable anchor points that break line of sight and, when available, an adjacent peek point that can see the threat.
- `assignCombatCover()` commits an operator to that cover rather than allowing per-frame target changes.
- `chooseCombatTactic()` selects push, hold, flank/reposition or cover/disengage using health, ammunition, preferred weapon range, nearby team numbers and an observed enemy reload.
- `updateCoverCombat()` moves to the anchor, holds the angle, performs short timed peeks, fires controlled bursts and returns behind cover.
- Operators request a different position after repeated bursts so firefights do not remain permanently static.
- `wantsSafeReload` prevents calm exposed reloads: an operator first seeks cover or a line-of-sight break, with a timed fallback to prevent deadlock.
- After an emergency sidearm switch, an operator with an empty primary and reserve ammunition switches back to the primary so it can be reloaded.

Tactical state must not be reconsidered every frame. A committed cover action should survive ordinary decision ticks; low-health and safe-reload emergencies may force a return from the peek point without causing continual cover reselection.

`botTacticalStatus()` is the common UI description used by the scoreboard, menu roster, selected-player telemetry and report behaviour label.

## File responsibilities

### `index.html`

Document structure, HUD/menu markup, matchmaking, reports, reward overlay, scoreboard and accessibility labels.

Use it for:

- adding/removing interface elements;
- changing scoreboard structure;
- adding dialog/overlay markup;
- document metadata.

### `css/game.css`

All HUD, Command HQ, matchmaking, scoreboard, reward-canvas layout, CSS weapon presentation and responsive styling.

Use it for:

- layout, spacing and positioning;
- portrait/maximised-landscape behaviour;
- menus, buttons, panels and overlays;
- CSS-3D Armoury weapon presentation;
- reward canvas and phase layout;
- skin presentation in CSS-based weapon views.

Do not recreate the field crate as CSS geometry; its model belongs to `js/64-reward-renderer.js`.

### `js/00-core.js`

Shared DOM references, build metadata, map data, constants, global state and low-level utilities.

Use it for:

- `BUILD_VERSION`, `BUILD_NAME`, `BUILD_ID`;
- match target and global timing constants;
- map grid and shared state;
- common collision/visibility helpers.

### `js/10-audio.js`

Web Audio initialisation and generated footsteps, weapon sounds, impacts, reloads and proximity playback.

### `js/20-navigation.js`

A* navigation, edge/prop clearance, path smoothing, reachable endpoint resolution and route diagnostics.

### `js/30-bot-ai.js`

`Bot` state, autonomous perception, movement, late-round searching, firing, reloads, switching, animation state and damage/death behaviour.

### `js/35-career.js`

Persistent career schema and migration, team creation entry point, shared combat attributes, XP/reputation progression, match telemetry aggregation, weapon/skin inventory, shared weapon geometry, per-player Armoury target/issuing UI, report state and reward/crate phase state.

### `js/36-team-management.js`

Generated player identities and histories, tactical roles, squad/line-up order, recruitment tutorial, transfer market, contracts, credits, match income, finance ledger and the Squad/Recruitment/Profile/Finances menu markup. Weekly payroll is calendar-owned by `39-club-operations.js`.

### `js/37-league.js`

Persistent division definitions, 20-club current-tier rosters, schedule generation, table calculation, league onboarding, matchday gating, promotion/relegation, next-opponent selection, exhibition context and season reset.

### `js/38-development.js`

Team XP and department benefits, per-player XP/levels/stat points, gradual daily calendar training, player value and transfer-interest recalculation, Training Facility UI, ammunition-store placeholder and related input/debug helpers.

### `js/39-infrastructure.js`

Persistent Club Infrastructure state, six four-level facility branches, division capacity, irreversible project funding, construction completion, academy intakes, infrastructure route markup and project interactions. It exposes bounded effect accessors consumed by the established development, recruitment, medical, opposition, commercial, supporter and match-income systems rather than replacing those authorities.

### `js/39-medical.js`

Persistent injury vulnerability, fatigue-sensitive risk, injury selection/aggravation, day-based recovery, medical labels and bounded bot-performance penalties.


### `js/39-matchday.js`

Owns tactical match preparation, current-day confirmation, temporary starting-five role assignments, team approach, preferred engagement range, collective priority, Plan Fit, role suitability, tactical familiarity, opponent matchup interpretation, mandatory Inbox decisions, tactical explanation markup and after-action analysis. It depends on team roles, league fixtures, club calendar/mail helpers and development state, and must load after `39-club-operations.js` but before transfers/match flow/UI.

### `js/39-recruitment-commercial.js`

Owns scouting uncertainty, report knowledge, shortlists, targeted assignments, fixture-based transfer windows, rival market bids/listings/replacements, enhanced incoming contract packages, playing-time promises, sponsor definitions/offers/settlement, Commercial rendering and the spectator sponsor bug. It wraps rather than duplicates the base transfer and team-management systems.

### `js/39-transfers.js`

Owns the version-11 `careerState.transfers` state, incoming player negotiations, package evaluation, final registration, outgoing rival-club bids, offer expiry, counter-offers, completed sales, Transfer Centre rendering and transfer debug helpers.

Incoming negotiations are three-part packages: transfer fee, weekly wage and contract duration. The UI begins with an opening proposal, may receive deterministic counter-offers, and may only complete registration after terms are agreed and cash/wage/squad constraints are rechecked.

Outgoing offers are generated from current player value and transfer-interest data as calendar days advance. Accepting a bid removes the player from the user squad, credits the negotiated amount, updates the finance ledger and adds the player to the buying rival's persistent roster. Rejecting or over-countering may close the offer.

### `js/39-club-operations.js`

Simulated calendar and guarded End Day progression, `clubEndDayBlockers()`, Must Respond routing, matchday scheduling, Inbox, scouting stars, division-locked player/staff pools, assistant-manager staff, formations and delegated lineup selection.

### `js/40-match-flow.js`

Round lifecycle, first-to-three scoring, round restarts, match completion, time-limit resolution, kill feed, own-team spectator cycling and damage-number effects. It owns the authoritative round boundaries that reset or settle a Live Command Pulse.

### `js/41-live-command-pulses.js`

One-per-round live command availability, contextual three-option selection, imperfect operator compliance, temporary tactical snapshots/restoration, command movement goals, authored route switching, outcome evidence, commentary-dock presentation and deterministic debug state. It may influence movement, spacing, approach and existing routes only; it must not own combat stats, direct operator control or match lifecycle.

### `js/50-ui-menus.js`

HUD updates, Command HQ routing, simulated matchmaking, live pause/speed controls, subnavigation affordances, scoreboard rows/status, telemetry linking and hide/show UI behaviour.

### `js/55-opening-week.js`

Post-guide daily agenda, fixture-preparation checks, tutorial-aware End Day restriction, event-bounded calendar advancement and transient day-change summaries. It wraps established calendar/menu functions and must load after `50-ui-menus.js` but before renderer/runtime code.

### `js/60-renderer-core.js`

Live-match WebGL setup, shaders, matrices, meshes, material handling and shared draw helpers.

### `js/61-world-renderer.js`

Static map geometry, props, cover, lighting, doors, walkways, tanks and machinery. Visual props must remain aligned with collision and navigation definitions.

### `js/62-character-renderer.js`

Third-person operators, the shared two-bone lower-body rig, matte non-emissive knee armour, corpse poses, dropped/shared weapons, shadows, health bars and tracers. It also owns `operatorArmourMaterialAudit()`.

### `js/63-viewmodel-renderer.js`

First-person camera, shared weapon-part rendering, arms/hands, recoil, reload motion, muzzle flashes and casing ejection.

### `js/64-reward-renderer.js`

Independent custom-WebGL field-crate renderer, its shaders, procedural mesh, lighting, drag rotation, opening animation and context lifecycle.

### `js/70-runtime.js`

Main loop, fast-forward substeps, HUD/render throttling, event bindings, Back/Forward control bindings, browser lifecycle handling, startup sequence, both renderer lifecycles and debug APIs.

## Dependency guide

The build concatenates source files in the explicit `MODULES` order in `build.py`. Function declarations may reference later declarations because the final bundle runs in one IIFE.
`39-medical.js` is initialised immediately after `35-career.js` so saved injuries can migrate before team normalisation. `39-infrastructure.js` loads after development and before club operations so facility effects are available to the calendar, recruitment, medical and menu systems. `39-club-operations.js` runs after development/league/team definitions. `39-matchday.js` follows it so calendar, mail, formation and lineup helpers are available; `39-transfers.js` then follows so calendar, league, staff, value and Inbox helpers are available before match flow and menu rendering.

Important relationships:

- `30-bot-ai.js` uses core, audio, navigation and career/team-defined player, role and weapon data.
- `35-career.js` owns schema migration, shared progression, weapon/skin data and reward phase state.
- `36-team-management.js` runs after career definitions and owns generated profiles, recruitment, squad order, tutorial and finance operations.
- `37-league.js` runs after team generation so it can create persistent rival rosters, and before match flow/UI so league context is available to matchmaking and settlement.
- `38-development.js` runs after league creation so transfer interest can reference persistent rival clubs, and before club operations, match flow and UI so daily training, value recalculation and management routes can use its functions.
- `39-infrastructure.js` runs after development and before club operations. It owns only permanent facility state and effect accessors; existing system modules remain authoritative for applying those effects.
- `40-match-flow.js` owns round/match transitions and calls career/team aggregation only at the appropriate match boundary.
- `41-live-command-pulses.js` loads immediately after match flow, consumes established bot/route state, restores temporary tactical fields at round boundaries and exposes presentation/debug helpers without owning combat statistics.
- `50-ui-menus.js` reads live bot, match and team state, owns matchmaking state and updates DOM presentation.
- `55-opening-week.js` wraps menu/calendar functions after `50-ui-menus.js`; it may consume established career, league, training, scouting and blocker state but must not duplicate settlement or persist transient UI summaries.
- `62-character-renderer.js` and `63-viewmodel-renderer.js` consume shared weapon parts/materials but must not own weapon identity.
- `64-reward-renderer.js` reads crate phase state and its own DOM canvas references; it does not own reward selection.
- `70-runtime.js` orchestrates simulation/rendering, calls both renderers and binds UI events.

## Navigation and world consistency

The map is asset-free and procedural. When adding or moving a physical prop:

- update visual geometry;
- update movement collision;
- update navigation clearance/edges;
- update line-of-sight blocking when appropriate;
- run route and prop-collision audits.

Late-round operators should commit to forward search routes rather than repeatedly reversing between nearby estimates.

## Responsive UI expectations

- Portrait uses a framed 16:9 match feed; its Live Command chooser is reparented at viewport level and must remain contained above other full-device overlays.
- Mobile landscape reserves a dedicated commentary row below the action stage. Feed rows, the current match moment and the Live Command chooser must stay wholly inside that row and never cover the canvas.
- Maximised mobile landscape uses a compact dedicated HUD layout inside the action stage.
- Score, action buttons, telemetry, spectator card and controls must not overlap.
- Reports, matchmaking and crates are viewport-level overlays.
- The Windowed View control must be hidden while report, crate or matchmaking overlays are active when it could overlap them.
- Command HQ uses a persistent context bar, flat navigation rail and compact data panels rather than generic rounded mobile cards.
- The menu and matchmaking overlay must fit supported portrait widths without document-level horizontal scrolling.
- Live-match Command HQ return/exit actions remain side by side and the redundant sticky-header return button is hidden at that breakpoint.
- The compact header pause/resume control must remain visible without crushing or overflowing the badge/title at 320px portrait width.
- Sticky header/subnavigation offsets must remain contiguous and opaque; Command HQ content may scroll underneath them but must never appear through a gap.
- Menu context/route changes reset the content scroll container to the top, while periodic live telemetry refreshes preserve the current scroll position.
- The combat-effectiveness grade, numeric score and label must remain centred as a single non-overlapping group inside the circular report graphic.

## Debug APIs

Build 11.39 adds `tacticalSuitabilityForTest()`, `setTacticalFamiliarityForTest()`, `recordTacticalFamiliarityForTest()`, `setPlayerTacticalProfileForTest()`, `assignMatchRoleForTest()` and `clearMatchRolesForTest()`. `matchdayForTest()` now exposes live plan-fit and role-execution fields for all bots.


Preserve:

- `window.__strikewatchDebug`: low-level combat/navigation counters.
- `window.__strikeDebug`: structured runtime test and inspection helpers.

Useful `__strikeDebug` areas include team-management state, career state, matchday planning/confirmation, mandatory decisions, coordination telemetry, tactical analysis, generated market/squad profiles, simulated roster, weapon visual definitions, prop-collision auditing, UI state, matchmaking state, forced matchmaking completion, forced late-round scenarios and deterministic tactical scenarios.

- `teamManagement()` reports team identity, balance, wage use, squad readiness, market candidates, tutorial state and finance history.
- `createTestTeam()`, `selectTeamPlayer()`, `setTeamRoute()` and `recruitCheapest()` support deterministic onboarding and layout tests.
- `forceMatchWinner()` supports match-level finance settlement and report regression tests.

- `matchmaking()` returns active state, elapsed time, stage, server code and overlay visibility.
- `forceMatchmakingComplete()` creates and enters the match through the same completion path used by the UI.
- `forceTacticalScenario()` accepts `cover`, `safe-reload`, `low-health`, `outnumbered`, `enemy-reload` and `primary-recovery`.
- `recoilSequenceForTest()` returns deterministic recoil/heat samples for a selected career pistol.
- `reloadPoseSample()` exposes the phased first-person reload values, and `forceReloadForTest()` places the spectated operator at a chosen reload point.
- `operatorModel()` returns leg, proportion and armour-material audits plus current living/corpse counts.
- `league()` reports season, matchday, clubs, persistent rosters, fixtures, table, next opponent and active league/exhibition context.
- `prepareLeagueMatchForTest()` and `settleLeagueForTest()` support deterministic league/exhibition regression tests.
- `development()` reports Team XP/points/benefits plus each player's XP, points, training, value and interest.
- `setTrainingFocusForTest()`, `simulateTrainingWeekForTest()`, `grantPlayerXpForTest()` and `allocatePlayerStatForTest()` support deterministic individual-development checks.
- `grantTeamXpForTest()` and `allocateTeamBenefitForTest()` support deterministic club-benefit checks.
- `hunt()` reports active/urgent state, evidence/hypothesis counters, operator search sources, cleared sectors and stationary timers.
- `injectHuntEvidence()` injects approximate evidence for targeted search regression tests.
- The tactical snapshot exposes current mode, label, reason, cover anchor/peek point, burst count and safe-reload intent, plus current recoil and weapon heat.
- `window.__strikewatchDebug` includes cover, peek, push, retreat, reposition and safe-reload counters.
- `ui()` reports whether the live Command HQ is active, whether its background simulation is manually paused and which Operations route will be restored.
- `performance()` reports rolling frame, update and render timings, long frames, skipped menu renders and transient effect counts.
- `damageNumberForTest()` creates a bounded outgoing or incoming damage indicator for DOM/expiry regression tests.
- `medical()` reports vulnerability, fatigue, Resilience, latest risk, injury status and recovery time for the squad.
- `injuryRiskForTest()` exposes deterministic risk comparison inputs.
- `audio()` reports context state, queued events, resume attempts, lifecycle recoveries and state changes.
- `suspendAudioForTest()` and `recoverAudioForTest()` are available for audio lifecycle regression checks.

### Build 11.30 navigation and continuation debug surface

- `menuHistory()`, `menuBackForTest()` and `menuForwardForTest()` expose the bounded Command HQ history stack and route movement.
- `endDayBlockersForTest()` and `clubOperations().canEndDay/endDayBlockers` expose the authoritative Must Respond state.
- `withdrawIncomingTransferForTest()` and `rejectOutgoingOfferForTest()` allow regression tests to prove that resolving transfer decisions re-enables calendar progression.
- Responsive acceptance must verify that the history rail is exactly 44 CSS pixels high, the four topbar icons are equal and touch-sized at 320 pixels, the old header Deploy/End Day placement is absent, and blocked End Day attempts leave `absoluteDay` unchanged.

## Required release checklist

For code/UI/CSS changes:

1. Update build constants and `build.py` output filename.
2. Update all relevant Markdown files and the handoff prompt.
3. Run `python3 build.py`.
4. Run `node --check js/strikewatch.dev.js`.
5. Extract and syntax-check the standalone inline script.
6. Verify the build label and generated filename.
7. Test the requested feature.
8. Run a second unrelated-regression pass.
9. Confirm both debug APIs still exist.
10. Confirm the standalone file has no required external CSS, JavaScript or assets.
11. Remove obsolete generated HTML files from `dist/` before packaging the source ZIP.
12. Test the ZIP with an archive integrity check.

Minimum regression areas:

- empty new-team creation with no contracted players;
- version-11 progression/calendar/mail/staff/tactics/league/medical schema creation, migration and save round-trip;
- separate Team XP and Player XP persistence, levelling and point balances;
- personal stat allocation respecting attribute/potential ceilings and changing only the selected player;
- technical training advancing only through End Day, retained fractional progress and recovery assignments;
- Coaching, Analysis, Sports Science and Commercial multipliers at documented levels/caps;
- dynamic value and transfer-interest recalculation after stat/performance changes;
- Training/Profile navigation and active Gold Coin Store/shared-crate layout without horizontal overflow;
- planned ammunition-supply controls remaining disabled with no credit or ammunition mutation;
- own-team-only spectator cycling, scoreboard selection and debug selection;
- opening live Command HQ to the currently spectated player's telemetry;
- 1×/2× speed synchronisation and substepped timer/simulation advance;
- horizontal subnavigation arrows appearing only when additional routes are off-screen;
- damage numbers appearing only for relevant confirmed hits, remaining capped and expiring cleanly;
- high fatigue/vulnerability increasing injury risk, Resilience/Sports Science reducing it, and recovery advancing only through simulated calendar days;
- injury UI, value/interest penalties and save persistence;
- performance diagnostics retaining 20 Hz HUD and 30 FPS menu render caps;
- Division 3 start plus 20 persistent current-tier clubs with 38 user fixtures and 380 total fixtures;
- ten fixtures per matchday and every club pair meeting twice with reversed home/away order;
- Northbridge as the first introductory opponent and persistent Red roster mapping through matchmaking/live bots;
- league result settlement only after the full match, table ordering and matchday simulation;
- exhibition finance/wellbeing settlement without any standings or fixture mutation;
- 38-fixture season completion and next-season reset while preserving rival identities/rosters;
- six-step recruitment tutorial routing and persistence;
- generated market uniqueness, attribute bounds and detailed profile/history rendering;
- a viable initial five-player combination under both starting budgets;
- recruitment fees, wage-budget enforcement, squad limit, sale/release and market refresh;
- line-up reordering and first-five deployment mapping;
- deployment blocked below five players and enabled at five;
- recruited Blue names, attributes, roles and weapons appearing in matchmaking and live bots;
- match income, form, morale, Player XP, medical risk and career totals updating only after full match completion;
- ordinary End Day progression on a clear day, plus zero calendar mutation for matchday, transfer-decision and season-transition blockers;
- calendar-week payroll, staff wages and contract reduction processing once when End Day enters a new week;
- new-match matchmaking completion and pre-lock cancellation;
- next-round continuation without matchmaking;
- first-to-three match continuation and completion;
- victory report/crate and defeat report/no-crate paths;
- career save loading, legacy migration and confirmed wipe;
- Club Reputation XP placement below the Operations hero;
- scoreboard green/red life-state dots, no skull glyphs and preserved dead-row status styling;
- portrait/desktop Squad, Recruitment, Profile, Finances and pause-menu layout without horizontal overflow;
- evidence-driven hunting without hidden-coordinate targeting, active movement under clock pressure, navigation, collision and line of sight;
- weapon/skin consistency, recoil identity, heat and first-person reload phase ordering;
- operator leg/proportion audits and non-emissive knee-armour material audit;
- audio unlock, explicit mute, suspended-context recovery and visibility/focus recovery.

## Known testing limitation

The container environment may not provide a reliable WebGL/ANGLE context or allow local Chromium navigation. Do not claim live match or reward rendering was visually verified when the browser cannot initialise or load it. Source, syntax, DOM/CSS, mock-WebGL and deterministic simulation tests can still be completed, and the limitation must be reported honestly.

## Upload guidance for future GPTs

For a small contained change, include `PROJECT.md` plus the owning source modules. Examples:

Command HQ or matchmaking change:

```text
PROJECT.md
index.html
css/game.css
js/00-core.js
js/50-ui-menus.js
js/70-runtime.js
```

Team management, recruitment or finance change:

```text
PROJECT.md
index.html
css/game.css
js/00-core.js
js/35-career.js
js/36-team-management.js
js/40-match-flow.js
js/50-ui-menus.js
js/70-runtime.js
```

League/competition change:

```text
PROJECT.md
index.html
css/game.css
js/00-core.js
js/35-career.js
js/36-team-management.js
js/37-league.js
js/40-match-flow.js
js/50-ui-menus.js
js/70-runtime.js
```

Reward crate presentation change:

```text
PROJECT.md
index.html
css/game.css
js/00-core.js
js/35-career.js
js/64-reward-renderer.js
js/70-runtime.js
```

Scoreboard/UI change:

```text
PROJECT.md
index.html
css/game.css
js/50-ui-menus.js
```

Match/reward logic change:

```text
PROJECT.md
js/00-core.js
js/35-career.js
js/40-match-flow.js
js/50-ui-menus.js
```

Weapon/skin consistency change:

```text
PROJECT.md
css/game.css
js/35-career.js
js/62-character-renderer.js
js/63-viewmodel-renderer.js
```

Navigation/AI change:

```text
PROJECT.md
js/00-core.js
js/20-navigation.js
js/30-bot-ai.js
js/40-match-flow.js
```

Use the complete source ZIP for major changes, unclear bugs, cross-module systems, new maps or final release generation.

### Build 11.39 comparison-language refinement

- Weapon comparison labels now distinguish major upgrades, clear upgrades, balanced trade-offs, minor edges and downgrades instead of reducing every mixed profile to simply better or worse.
- Mixed weapon profiles remain visibly marked as trade-offs when one weapon gains speed or handling but loses damage, accuracy or critical output.
- Stat deltas use explicit language such as faster, slower, average damage, accuracy and handling.
- The Armoury explains that the comparison score evaluates the weapon package only; operator attributes, assigned role, fatigue and tactics still determine live effectiveness.

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
