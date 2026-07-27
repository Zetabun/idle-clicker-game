# Read This Before Doing Anything

This directory is the authoritative, maintainable source project for **Strikewatch Build 12.117: Skyline Offices Environment Rework**.

## Current release essentials

## Build 12.117 Skyline Offices environment rework

Build 12.117 rebuilds the Skyline Offices environment. `js/00-core.js` owns the reworked arena: the floorplate is authored as its north-west quadrant and mirrored about `x = 18` and `z = 12`, furniture is authored for the west half and mirrored about `x = 18` only, and the `decor.courtyards` rectangle now matches the real open atrium at `x` 14-22, `z` 9-15 exactly, so the ceiling void it drives no longer cuts through room walls. A new `decor.floorMarkings` layer and authored `decor.lowCeilings` replace the three hard-coded office ceiling boxes in `js/61-world-renderer.js`, which also gains `drawOfficeFloorMarking`. The office branch of `arenaGeometryPresentationSnapshot` is now a real gate: it rejects any prop, glass band, wall display, baffle, ceiling, floor marking or door that does not clear masonry, sit on a real wall face or occupy a genuine opening, and it requires layout symmetry in both axes. `js/30-bot-ai.js` retargets `OFFICE_COURTYARD_ROTATION_LANES` at the new atrium arcades, and `js/70-runtime.js` updates the office clearance, walkway and door-pocket audits to the new counts and circulation routes. The tactical minimap and deployment preview needed no change because both already derive from `MAP`, `LEVEL_ZONES`, `LEVEL_DECOR_LAYOUT` and `LEVEL_PROP_LAYOUT`; both were verified against the reworked arena. All new decoration is overhead or painted on the floor, so collision, navigation and line of sight are unchanged. Save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.116 desktop header split

Build 12.116 places the desktop breadcrumb at the upper-left of the available management-header context and the visible build badge at the upper-right immediately before the shortcut controls. This replaces Build 12.115's independently centred wide-screen badge. Mobile keeps the version inside the Help-revealed current-page bar, and Build 12.115's mobile negotiation readability remains unchanged. This release changes desktop presentation and release metadata only; navigation, negotiation behavior, gameplay, match presentation, economy, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.115 header and negotiation readability

Build 12.115 moves the visible version badge into the independently centred open area of the wide desktop management header while leaving the breadcrumb in its established upper row. Compact desktop retains the inline breadcrumb treatment, and mobile retains the version inside the Help-revealed current-page bar. Mobile negotiation microcopy now has readable type floors across the round/status labels, player scouting summary, negotiation-safety explanation, seller request, editable value labels and step captions. This release changes presentation and release metadata only; negotiation values and decisions, recruitment, gameplay, match presentation, economy, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.114 live feed readability

Build 12.114 raises the smallest compact-screen copy in operator attributes, live market context, Active Five Needs and the recruitment role guide. Portrait windowed matches now show a restrained pulsing red **LIVE** bug inside the game image and place up to three existing feed rows at the upper-right like a competitive broadcast. Desktop recruitment fee and wage estimates retain both `CR` labels on one line, while the desktop version badge now aligns its text baseline with the breadcrumb rather than merely centring the two outer boxes. This release changes presentation and release metadata only; candidate values, recruitment logic, match events, AI, combat, map rendering, economy, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.113 desktop version alignment

Build 12.113 keeps the visible version beside the desktop breadcrumb while making their alignment explicit and cascade-safe. The desktop topline is one vertically centred flex row; the version badge uses static positioning, a reset margin/transform, a predictable line box and an inline-flex content centre so later shared typography rules cannot raise it above the breadcrumb. The mobile version remains inside the existing current-page bar revealed by the `?` Help control. This release changes presentation and release metadata only; gameplay, navigation, operator visuals, match performance, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## GitHub repository working plan

The public repository keeps `cod.html` at its root as the GitHub Pages release and keeps this complete maintainable project under `strikewatch-source/`. Future GPT sessions must read `strikewatch-source/00-READ-FIRST-GPT.md`, `strikewatch-source/AGENTS.md`, `strikewatch-source/PROJECT.md`, `strikewatch-source/README.md`, `strikewatch-source/DOCUMENTATION-INDEX.md` and the current audit before editing. Make changes in `strikewatch-source/`, run `build.py`, verify the release, then copy the verified standalone output to root `cod.html`. Commit the source, current Markdown documentation and `cod.html` together. Root `other/` contains unrelated or retired legacy files and must not be treated as Strikewatch source.

## Build 12.112 visible version header

Build 12.112 makes the playable version visible from the management interface. Desktop shows `BUILD <version>` in the main management header. Mobile keeps the compact header unchanged until the player taps the existing `?` Help control, then shows the version inside the revealed current-page bar. Both labels are synchronised from `BUILD_VERSION` in `js/00-core.js`, and `build.py` must reject mismatched static header labels. Every numbered playable release must update `BUILD_VERSION`, `BUILD_NAME`, `BUILD_ID`, the document title, both asset query strings, the main-menu build stamp, the desktop header label and the mobile Help-bar label before packaging.

## Build 12.111 realistic operator heads

Build 12.111 improves procedural third-person heads with a more human skull/jaw silhouette, cheek and brow planes, recessed eye sockets, a restrained nose bridge, closer helmet fit, nose-contoured face cover and elliptical goggles. Preserve `makeOperatorHeadMesh()`, `makeOperatorHelmetMesh()`, `makeOperatorFaceCoverMesh()`, `drawOperatorHeadAssembly()`, deterministic identity variation, the pale natural skin contract, shared living/corpse geometry, distance LOD and all gameplay boundaries.

## Build 12.110 natural operator silhouettes

Build 12.110 improves the visual anatomy and articulation of third-person operators without changing gameplay or adding body draw calls. The retained procedural mesh system now shapes the torso, pelvis, joint protection and boots more naturally. Renderer-only pose calculations add subtle pelvis counter-motion, torso/head stabilisation, shoulder articulation and hand-anchored elbow bending. Preserve weapon anchors, collision, hit detection, AI, navigation, movement, combat, the Build 12.109 Citadel performance path, save schema 19 and diagnostics schema 1.

## Build 12.109 Citadel match performance

Build 12.109 removes the live demo stutter exposed by the denser Build 12.108 Citadel environment. Opaque static Citadel geometry is captured into reusable GPU batches, conservative view culling skips only static detail outside the camera, static prop collision uses a spatial broad phase, and sliding-door colliders are cached until their state changes. These are presentation and exact-query optimisations: map geometry, materials, lighting, collision answers, navigation, line of sight, operator AI, combat, economy, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.108 Citadel Depot environment rework

Build 12.108 rebuilds the Citadel Depot environment. An automated geometry pass found ten authoring defects: both suspended catwalks passed through sixteen wall columns between them, both stair flights climbed 0.56 m and stopped against blank wall in dead-end nooks, three props and one gate were embedded in masonry, five of eight AI hotspots sat inside walls, and the roof steel and service runs intersected the top of every wall they crossed. The depot is now authored as its northern half and mirrored by a 180-degree rotation, so both halves play identically. Wall masses read as buildings — racking runs with cross aisles, gated partitions, loading bays and a tall central plant hall. Stairs render a full assembly ending at a recessed wall access hatch, catwalks span a bay wall-to-wall with bearing plates at both ends, and a new industrial decor layer adds hazard floor markings, authored service runs and per-room suspended ceilings. All of the new decoration is overhead or painted on the floor, so collision, navigation and line of sight are unchanged. Save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.107 recruitment card surface isolation

Build 12.107 fixes recruitment cards becoming translucent when a lighter configurable management-page background is selected. A legacy alternating-row rule applied a semi-transparent white surface to even candidate cards, allowing the page canvas to show through. Every recruitment candidate card now owns the same opaque navy surface regardless of row position, shortlist state or selected page background, while the restrained desktop hover treatment remains intact. Save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.106 configurable management page background

Build 12.106 adds a persistent **Page Background** control to Club → Configuration. Managers can choose from six restrained dark presets or use the native custom-colour picker. The selected colour updates the large management canvas behind cards and panels immediately, survives reloads through a small independent local-storage preference, and can be reset to the original Command Navy default. Panel surfaces, text colours, route accents, sidebar chrome, match presentation, career save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.105 windowed match label cleanup

Build 12.105 removes the obsolete decorative **LIVE // SECURE FEED** pseudo-label from windowed matches. After the scoreboard and round objective were moved into dedicated HUD rows, that legacy label could remain visible behind the new layout at the top-left of the match panel. The scoreboard, objective, 16:9 viewport, landscape presentation, match simulation, save schema 19 and diagnostics schema 1 are otherwise unchanged.

## Build 12.104 blocker links, darker recruitment hover and portrait HUD repair

Build 12.104 repairs three regressions found during desktop and mobile QA. Mandatory management actions now bypass opening-week progressive locks when necessary, and pending sponsor offers explicitly expose the Commercial route so each red **Must Respond** item opens and scrolls to the exact offer. Desktop recruitment cards retain a small lift and glow, but the hover surface and action-button highlights are substantially darker and less washed out. Portrait windowed matches now use a real stage viewport wrapper: the scoreboard bar and round-objective bar occupy dedicated rows above a 16:9 live canvas rather than overlaying the rendered action. Save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.93 portrait match HUD above viewport

Build 12.93 moves the portrait windowed match scoreboard and round objective out of the live viewport overlay and into their own stacked HUD strips above the game image. This makes the round state easier to scan on phones and better matches the requested portrait mock-up. The live game image now begins beneath those two information bars, while landscape presentation, the portrait console dock, onboarding, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.92 aligned desktop sidebar and readable labels

Build 12.92 keeps the natural-height FM-style desktop department list from Build 12.91, enlarges the icon and label treatment, and aligns the sidebar's right edge with the desktop header division after Back and Gold Balance. The rail uses 232 pixels at 1024–1279px and 266 pixels at 1280px and wider, matching the corresponding header columns exactly. Rows remain compact, one-line and content-sized; the club crest remains unboxed. Mobile and compact-landscape navigation, gameplay, onboarding, recruitment, mail, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.91 natural-height desktop sidebar

Build 12.91 corrects the compact desktop rail introduced in the recent sidebar passes. An inherited flex/grid rule was stretching the five department rows across the full sidebar height, producing large empty menu cards. Desktop navigation now sizes to its content, uses five tightly packed one-line rows, places access badges inline, and shows the selected club crest without a surrounding card. Mobile and compact-landscape navigation remain unchanged. Gameplay, onboarding, mail, recruitment, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.88 mobile recruitment header alignment

Build 12.88 refines the compact mobile recruitment summary so the front face now uses the same top-header structure as the flipped scouting side. The previous front-face shortlist and compare chips are removed from the summary header, a compact star toggle now sits beside the Details button, and comparison remains available on the flipped side where the fuller decision context already exists. Mobile report, negotiation, desktop recruitment cards, onboarding, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.87 desktop sidebar section icons

Build 12.87 adds small, consistent line icons to each department in the compact desktop sidebar introduced in Build 12.86. Operations, Team, Armoury, Supplies and Club each receive a distinct symbol, with neutral default states and route-accent highlighting for the active or guided department. The icons are decorative, preserve the existing text labels and access badges, and are hidden below `1024px` so mobile navigation remains unchanged. The selected club crest and compact rail dimensions from Build 12.86 remain authoritative. Gameplay, onboarding, mail, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.85 onboarding focus and saved mail

Build 12.85 simplifies the Command Centre while the First Match Journey is active and adds a task-led Inbox with Saved Mail. During onboarding, the calendar strip, fixture/status dashboard, club objectives, priority queue, momentum panel, command directory, match-preparation dashboard and line-up snapshot are withheld from the Command Centre; the First Match Journey, optional context, club identity and Team XP remain. The complete dashboard returns automatically when onboarding ends. Read unsaved emails now leave the Inbox immediately, unresolved decision emails remain visible until answered, and managers can save or unsave messages from the reader or full-email modal. A Saved Mail folder keeps marked messages available across saves. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.84 portrait mobile bottom clearance correction

Build 12.84 removes the remaining false gap above the persistent department bar in portrait mobile. The fixed bottom navigation was already reserved by the mobile menu layout, but a second 74-pixel padding rule on the content pane shortened the inner route scroller again. Portrait now keeps only the normal 10-pixel content inset, so the next Command Centre section flows directly beneath Team XP while the fixed navigation remains fully clear. Compact landscape, desktop, gameplay, recruitment, infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.82 mobile Command Centre panel height correction

Build 12.82 corrects the large false gap beneath the mobile Command Centre's Manager Priority Queue. In compact landscape, the Objectives and Recommended Actions panels remain side by side, but each now sizes to its own content instead of CSS Grid stretching the shorter panel to the height of the taller objectives list. Portrait layout, bottom navigation, dashboard content, gameplay, infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.81 persistent club infrastructure

Build 12.81 adds a permanent, capacity-limited Club Infrastructure system inside the existing Club department. Six connected branches—Training, Scouting, Medical & Recovery, Youth Academy, Analysis and Commercial & Supporters—contain four sequential levels each. Projects cost Club Cash, take simulated days, use one construction queue and cannot be cancelled, refunded or respecced after approval. Completed levels consume permanent capacity; Division 3 begins with eight slots and promotion gradually expands the footprint to fourteen, while the complete tree contains twenty-four levels. The result forces long-term specialisation rather than allowing every department to be maximised. Effects change existing systems directly, including training progress, recruitment reports, medical recovery, academy intakes, opposition analysis, player XP, sponsorship value, match income and supporter growth. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.80 mobile recruitment compact summaries

Build 12.80 delivers the next major mobile recruitment UX pass without changing recruitment data, negotiation behaviour or persistence. At mobile and compact-tablet widths, each candidate now opens as a compact collapsed summary that keeps the key scan data—name, role, ability, potential, fee and wage—visible immediately. Supporting shortlist and comparison actions remain available as compact chips, while one clear primary Negotiate action anchors the decision area. A dedicated inline report expands beneath the summary only when requested and groups scouting explanation, squad-fit detail, history/context and role brief information into readable sections. The sticky comparison tray remains visible while browsing, so selecting two or three candidates keeps the live shortlist in view. Desktop recruitment cards, gameplay, economy, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.79 accessibility and visual hierarchy pass

Build 12.79 delivers a focused accessibility and visual-hierarchy pass without changing gameplay or persistence. Disabled controls now use a readable neutral surface at full opacity, including formerly confusing guided and locked actions. Keyboard focus uses a high-contrast cyan ring with a dark separation halo. Informational panels use quieter neutral borders while actionable controls receive stronger interactive edges and hover feedback. Routine labels and secondary guidance use sentence case and reduced letter spacing, while gold is reserved for primary actions, earned ratings and important states. The First Match Journey action now retains its bright guided treatment instead of combining dark text with a generic dark button background. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.78 desktop inbox spacing and readability

Build 12.78 repairs the desktop Inbox spacing conflict introduced when later readability passes enlarged mail copy while an older rule continued to force every message row into 78 pixels. Desktop rows now size to their sender, subject and two-line preview; the message list uses the available column height rather than stopping after two rows; and the reader no longer receives duplicate outer padding on top of its own message-section padding. The result keeps the existing two-pane mail-client style while removing clipped previews, row overlap and excessive reader offsets. Mobile mail presentation, mail data, decisions, gameplay, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

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

Build 12.52 completes an **Arena Geometry Integrity** pass across every current playable map. Citadel Depot now uses grounded solid stair risers, ceiling-suspended walkway hardware, wall-tied door frames and grounded industrial fixtures. Skyline Offices now mounts ceiling baffles, glass bands and wall displays to visible structure; replaces floating chair blocks with grounded seat/back/stem/caster assemblies; grounds benches and sofas; and relocates the conference set from an embedded wall position into the open conference bay with matching collider orientation. Dune Bastion now shares canopy post offsets between presentation and collision, adds complete headers, braces and rafters that follow the pitched fabric plane, closes market-stall frames and amphora handles, and retains its authored arch attachments. Preserve `ARENA_GEOMETRY_PRESENTATION`, `DUNE_CANOPY_PRESENTATION`, `arenaGeometryPresentationSnapshot()`, `arenaGeometryIntegrityForTest()`, `allArenaGeometryIntegrityForTest()`, the established arena collision/navigation authorities, Dune's 58-collider and 494-node/2,752-edge one-component baselines, save schema 19 and diagnostics schema 1.

Build 12.51 introduces a persistent **Living Transfer Market & Organic Mail** layer. The current division now receives uniquely generated academy graduates, free agents, club releases, transfer listings and lower-division breakthroughs; source tiers are restricted to the current level or below so a Division 3 career cannot access stronger pools early. Listings carry availability windows, demand and price momentum, while rival clubs select targets from real role deficits, ratings, budgets and tactical identities. AI signings persist in rival squads up to the eight-player limit. Commissioned searches rotate only low-priority listings and protect shortlists and active negotiations. `clubAddMail()` now preserves long messages, custom senders and previews, and both the inbox reader and existing popup scroll independently. Organic market digests, signing dossiers and match reports are written from the current career's events rather than fixed story text. Preserve `dynamicMarketProcessDay()`, `dynamicMarketGeneratePlayer()`, `dynamicMarketSelectRivalBid()`, `clubAddOrganicMail()`, `dynamicTransferMarketForTest()`, the existing transfer/league authorities, save schema 19 and diagnostics schema 1.

Build 12.50 adds an evidence-led **Matchday Story & Payoff** layer to the existing match, telemetry, debrief and first-hour systems. Visible eliminations now recognise restrained opening, trade, flank, long-range, multi-kill and clutch moments; every completed round receives a concise telemetry-based explanation; the debrief selects Play of the Match, Turning Point, Best Partnership Moment, Tactical Payoff and an Unexpected Contributor from existing match evidence. Contracted operators may earn at most two presentation-only match identity badges after repeated evidence across at least three matches; these badges never modify attributes, weapons, AI or tactics. The first-match Operator Impact stage now surfaces the key match story before the wider report. Preserve `recordCareerMatchHighlight()`, `careerRoundDecision()`, `buildCareerMatchHighlights()`, `settleTeamPerformanceTraitsAfterMatch()`, `matchdayStoryPayoffForTest()`, the existing match-moment and tactical-analysis authorities, save schema 19 and diagnostics schema 1.

Build 12.49 completes a **Consolidated Economy Guidance** audit. The First Match Guide remains the only authoritative progress tracker, while `clubEconomyGuideMarkup()` now provides one reusable resource map at the two useful moments: before the first contract and after the first match. Recruitment separates immediate transfer fees, weekly wage headroom and automatic foundation-loan instalments; the reward reveal separates Club Cash, Gold Coins, Team XP, Player XP and the non-currency victory Supply Drop. Later Finance, Gold and Training tutorials now focus on page use rather than repeating definitions, and the Supply Depot explains Cash equipment versus Gold Coin crates. No economy value, reward formula, wage, loan, save or diagnostic authority changed. Preserve `clubEconomyGuideMarkup()`, `economyGuidanceForTest()`, the Build 12.48 recruitment comparison, the Build 12.47 negotiation route exception, save schema 19 and diagnostics schema 1.

Build 12.48 turns candidate **Comparison** into an interpreted recruitment decision tool. Two or three selected candidates now receive a current-squad recommendation, transparent Immediate Impact, Future Ceiling, Squad Need and Budget Fit scores, explicit Why This Fits and Main Trade-off explanations, retained scouting-aware facts and direct Report/Negotiate actions. The tutorial empty state teaches the comparison flow, and selecting the second candidate brings the completed comparison into view. Preserve `recruitmentComparisonDecision()`, `recruitmentComparisonDecisionSummaryMarkup()`, `recruitmentComparisonPanelMarkup()`, the three-candidate cap, scouting-aware estimates, transient-only comparison state, the Build 12.47 tutorial negotiation route exception, save schema 19 and diagnostics schema 1.

Build 12.47 fixes the **Recruitment Negotiation tutorial route**. During the first recruitment steps, tapping Negotiate now temporarily unlocks and opens the Transfer Centre whenever an incoming candidate negotiation is active, instead of creating the deal behind a progressive menu lock and appearing unresponsive. Recruitment list and profile controls continue to use the existing negotiation authority, and the tutorial now explicitly explains Negotiate, Submit Offer and Complete Signing. Preserve the active-negotiation route exception in `progressiveRouteAccess()`, the existing transfer settlement functions, save schema 19 and diagnostics schema 1.

Build 12.46 delivers a **Tailored Armour Finish** pass on top of the centred preview and operator-fitted armour work. `careerArmourModelProfile()` and `careerArmour3dParts()` now build more natural tapered carriers with segmented front/back shells, integrated plate pockets, angled side protection, cleaner straps, buckles, collars, shoulder structures and radio details. `careerArmourOperatorBodyParts()` slightly opens the mannequin stance so the vest reads more clearly, `css/game.css` separates fabric/plate/clip/rubber materials and strengthens the presentation lighting, and `operatorArmourRenderProfile()` is nudged closer to the showcase silhouettes. Armour stats, prices, ownership, penetration, durability, movement costs and break behaviour are unchanged. Preserve `careerArmourModelProfile()`, `careerArmour3dParts()`, `careerArmourOperatorBodyParts()`, `careerArmourRigMarkup()`, `operatorArmourRenderProfile()`, `armour3dPresentationForTest()`, save schema 19 and diagnostics schema 1.

Build 12.45 fixes the **Centred Armour Previews** regression introduced during the operator-fitted armour pass. Supply Depot cards and the Armoury detail inspector still use the shared part-based cuboid/cylinder armour rig, and the detailed viewer still fits the selected vest to a procedural operator mannequin, but the nested rig is now centred correctly inside each preview so the full armour silhouette is visible instead of a cropped side slice. The Bastion Heavy remains visibly broader, deeper and more protective than the lighter classes, the live WebGL operator renderer keeps the class-specific silhouette differences and armour balance is unchanged. Preserve `careerArmourModelProfile()`, `careerArmour3dParts()`, `careerArmourOperatorBodyParts()`, `careerArmourRigMarkup()`, `operatorArmourRenderProfile()`, `armour3dPresentationForTest()`, save schema 19 and diagnostics schema 1.

Build 12.44 completes the **Operator-Fitted 3D Armour** refinement. Purchasable armour still uses the same shared part-based cuboid/cylinder system as the weapons, but the detailed Armoury inspector now fits each vest to a procedural operator mannequin so proportions can be judged in context. Light, Medium Flex, Medium Plate and Heavy rigs use increasingly broader, deeper and more protective geometry; the Bastion Heavy adds visibly larger side plates, shoulder plates, collar, abdomen and groin protection. The live WebGL operator renderer now mirrors those class differences rather than drawing every vest as a similar chest slab. Armour stats, prices, ownership, penetration, durability, movement costs and break behaviour are unchanged. Preserve `careerArmourModelProfile()`, `careerArmour3dParts()`, `careerArmourOperatorBodyParts()`, `careerArmourRigMarkup()`, `operatorArmourRenderProfile()`, `armour3dPresentationForTest()`, save schema 19 and diagnostics schema 1.

Build 12.42 completes the procedural **3D Armour Inspection** pass. Armour shop cards use the shared layered CSS-3D armour rigs introduced in Build 12.41, now with slow staggered idle rotation, reduced-motion compliance and clearly differentiated Light, Medium Flex, Medium Plate and Heavy silhouettes. The Armoury detail card provides drag/swipe rotation, wheel/button zoom, reset and optional auto-rotation through a separate armour viewer state so weapon and armour inspection do not interfere. Preserve `careerArmourRigMarkup()`, `careerArmourVisualMarkup()`, `careerArmourViewerState`, the armour viewer handlers, `armour3dPresentationForTest()`, store purchase/equipment behaviour, save schema 19 and diagnostics schema 1.

Build 12.40 adds an automatic **Season Stories** layer that recognises important fixtures, promotion and survival pressure, revenge matches, form runs, supporter and board expectations, developing rivalries and lasting club records from the game's existing authoritative league, supporter, operator and squad-dynamics data. The system follows a recognise-don't-interrupt contract: it adds presentation, occasional informational inbox stories and at most a small positive reputation reward for a high-stakes win, but it never changes combat AI, weapons, health, fixture outcomes or creates mandatory responses, End Day blockers or routine micromanagement. Rivalries progress through Standard, Emerging, Heated and Fierce thresholds at 0, 20, 45 and 75 intensity; settlement is once per fixture, seasons archive once, and persistent history is backwards-compatible inside save schema 19. Preserve `makeDefaultSeasonNarrativeState()`, `normaliseSeasonNarrative()`, `seasonNarrativeFixtureContext()`, `seasonNarrativeStorylines()`, `settleSeasonNarrativeAfterFixture()`, `seasonNarrativeArchiveSeason()`, `renderSeasonNarrativeDashboard()`, `renderSeasonNarrativeMatchReport()`, `seasonNarrativeForTest()`, the fixture/season deduplication guards, reputation bonus cap of 2, save schema 19 and diagnostics schema 1.

## Build 12.39 retained squad dynamics

Build 12.39 adds passive **Squad Dynamics** without turning the game into a conversation-management simulator. Contracted operators build persistent pair bonds from shared matches, support spacing, trades, results and joint performance. Familiar, Linked, Trusted and Elite milestones unlock small positive-only coordination buffs through existing role-execution, support, trade, group, flank, movement, awareness and reaction fields; developing pairs simply receive no buff and never suffer a penalty. Each starter uses only their strongest active partnership, active-five atmosphere adds only a small positive uplift, and relationships do not decay. One natural mentor link may automatically grant a developing operator +6% training and match-development XP. Rotation Watch, milestone mail and debrief updates are advisory only: they never block End Day or demand routine responses. Preserve `makeDefaultSquadDynamicsState()`, `normaliseSquadDynamics()`, `settleSquadDynamicsAfterMatch()`, `squadDynamicsBuffForPlayer()`, `applySquadDynamicsToBot()`, `squadDynamicsDevelopmentMultiplier()`, `renderSquadDynamicsPanel()`, `renderPlayerDynamicsPanel()`, `renderSquadDynamicsMatchReport()`, the once-per-match settlement guard, positive-only multipliers, save schema 19 and diagnostics schema 1.

## Build 12.38 retained tactical adaptation

Build 12.38 turns the existing between-round pause into an evidence-led **Tactical Adaptation** loop. After every non-final career round, the manager receives three truthful reads covering round execution, pre-match scouting accuracy and the opposition's likely response. Up to two instruction categories may change across tempo, engagement range, team shape and the next-round route/territory plan. Route changes reuse the authoritative arena engagement plans, and all other changes reuse the established club tactics applied to autonomous operators. The opposition may counter successful range control, close pressure, compact grouping, flanks or visible isolation by changing its existing formation/approach/range/priority behaviours for the following round; this match-scoped adaptation never grants hidden attributes or guarantees that the analyst forecast is correct. The full-device modal is reparented outside the transformed portrait match viewport, applied changes create visible live-match notices, and the debrief compares expected effects with the next round's support, accuracy, trade and route telemetry. Preserve `resetOpponentMatchAdaptation()`, `prepareOpponentMatchAdaptation()`, `opponentMatchAdaptationForRound()`, `betweenRoundCoachingDiagnoses()`, `betweenRoundRoutePlans()`, `selectBetweenRoundTactic()`, `commitBetweenRoundTactics()`, `evaluateBetweenRoundAdjustmentForRound()`, the two-category limit, save schema 19 and diagnostics schema 1.

## Build 12.37 retained opponent preparation

Build 12.37 turns opposition intelligence into a connected match-preparation workflow for the next scheduled league fixture. Tactics now presents scouting confidence, expected formation, tempo, range, route pattern, key threat, possible vulnerability and the active-five weapon-range matchup. Three selectable responses stage the existing formation, approach, engagement and priority draft controls; they never auto-resolve a match or grant hidden attributes. Below the existing 50% tactical-disclosure threshold, recommendations and fixture-drill ordering remain generic, exact shape/range/route values are redacted from the captured plan, and live/debrief copy continues to describe those details as unconfirmed. The manager may select up to two fixture drills, which are coaching intentions evaluated in the completed tactical review rather than invisible stat bonuses. The confirmed active plan captures the truthful report, response and drills for live match notices and debrief comparison. Preserve `opponentPreparationTargetClub()`, `opponentPreparationRead()`, `opponentResponsePlanCandidates()`, `clubSelectOpponentResponsePlan()`, `clubToggleOpponentFixtureDrill()`, `opponentPreparationSnapshot()`, `evaluateOpponentPreparation()`, `opponentPreparationForTest()`, save schema 19 and diagnostics schema 1.

## Build 12.36 retained guided calendar lock

Build 12.36 simplifies the persistent End Day cell during First Match Guide stages where calendar progression is intentionally unavailable. The greyed header space now shows one centred padlock rather than cramped **END DAY UNAVAILABLE** and **FOLLOW FIRST MATCH GUIDE** lines. Preserve the full restriction reason in the button's accessible label and tooltip, keep the visible guide as the next-action authority and let `openingWeekTutorialDayRestriction()` remain the only unlock source. Normal End Day, matchday and required-response blocker states are unchanged. Preserve one End Day DOM control, `calendarHeaderForTest()`, save schema 19 and diagnostics schema 1.

Build 12.35 replaces the post-tutorial opening-week checklist with a live **Club Daily Agenda**. Required blockers, recommended preparation and optional club activity are grouped separately; a six-point Fixture Preparation meter tracks the Active Five, medical availability, training assignments, opposition knowledge, confirmed tactics and weapon-range compatibility. **Advance to Next Event** processes the existing calendar one day at a time until a meaningful event, blocker, training milestone, scouting update or matchday is reached, then presents a transient routed change summary. Ordinary End Day also records a one-day summary. During the First Match Guide, End Day is disabled while recruitment, squad review, plan setup, debrief or training should be completed; it becomes available when the match step genuinely requires advancing to the scheduled fixture. Preserve `openingWeekTutorialDayRestriction()`, `openingWeekAdvanceToNextEvent()`, `openingWeekPreparationChecks()`, `openingWeekAgendaGroups()`, `openingWeekFlowForTest()`, the 21-day safety limit, non-automatic decision handling, save schema 19 and diagnostics schema 1.

Build 12.34 adds recruitment decision support without changing role weights, operator generation, transfer prices, wages, AI behaviour or match balance. Recruitment now opens with an Active Five Needs panel that translates contracted operators into six team functions, highlights missing or partial coverage and shows remaining transfer cash plus wage use. Every market candidate receives a contextual What This Operator Adds assessment, scouting-aware role-fit readout, affordability/medical cautions and optional beginner recommendations for immediate fit, affordability and development upside. Managers can compare up to three market or shortlisted candidates side by side; comparison selection and the latest signing summary are transient UI state and are not added to save schema 19. After a completed signing, the market shows which team function improved and the clearest remaining need. Preserve `RECRUITMENT_TEAM_FUNCTIONS`, `recruitmentCompositionReport()`, `recruitmentCandidateAssessment()`, `recruitmentRecommendationMap()`, `recruitmentComparisonPanelMarkup()`, `recruitmentRecordSigningUpdate()`, `recruitmentDecisionSupportForTest()`, the three-candidate limit, mobile containment, save schema 19 and diagnostics schema 1.

Build 12.33 makes operator roles understandable before a new manager commits recruitment funds. Recruitment now opens an expanded role guide during the recruitment/profile/first-signing/active-five stages, explaining Entry, Support, Anchor, Flanker, Marksman, Shot Caller and Flex in plain language with each role's main job, useful attributes and trade-off. The guided recruitment destination now contains both the role guide and candidate list, so Recruit Operator / Continue Recruiting scrolls to the explanation before the candidates. Candidate profiles also show a focused primary/secondary role explanation. Preserve `TEAM_ROLE_BEGINNER_GUIDE`, `recruitmentRoleGuideMarkup()`, `recruitmentProfileRoleGuideMarkup()`, `recruitmentRoleGuideForTest()`, the seven-role coverage, responsive one/two-column layouts, save schema 19 and diagnostics schema 1. Roles remain tendencies derived from existing tactical logic; this pass must not change role weights, AI decisions, recruitment prices or balance.

Build 12.32 turns the first real career match into the payoff for the opening tutorial. Deployment now shows the active five operator portraits, opponent style/strength, public win chance, supporter expectation, selected arena, first-to-three format and tactical warnings before the explicit **Deploy Active Five Operators** action. After matchmaking, `showCareerMatchIntro()` presents both five-operator teams and the confirmed formation/approach/engagement/priority in a full-device modal; the live simulation remains paused until **Begin Match** dismisses it. Preserve the full-device reparenting, `careerMatchIntroActive()` update gate and responsive sticky action.

During career matches, `careerMatchMomentState` adds non-authoritative presentation for role, weapon range and tactical cause/effect during the first match, plus last-operator, 1v1 clutch, close-out, match-point and between-round tactical-adjustment notices. These messages may observe existing state only; they must never modify AI decisions, visibility, combat, navigation or settlement. The first completed career match stores `firstCareerMatch`, captures the existing supporter reaction and reveals Result → Rewards → Operators → Supporters → Next Step before the full detailed report. The final stage must expose a direct coaching action and mark the latest report reviewed before its routed destination is applied. Preserve `firstMatchPayoffForTest()`, fixed/sticky modal controls, save schema 19, diagnostics schema 1 and all Build 12.31 orientation safeguards.

Build 12.31 keeps every guided-demo explanation visibly over the portrait match viewport and holds the one-round simulation until the fourth card's **Watch the Round** action. All four `NEW_PLAYER_DEMO_STEPS` remain paused while their coach card is visible; the final action hides the card, releases the simulation and lets the player watch the unobstructed round. In portrait, every stage now uses the same top-centred viewport overlay placement previously used only by stages three and four, with bounded internal scrolling on short screens. Preserve `renderNewPlayerDemoCoach()`, `advanceNewPlayerDemo()`, the four-step sequence, `newPlayerOrientationForTest()`, one-round non-career settlement protection, responsive containment, save schema 19 and diagnostics schema 1.

Build 12.30 consolidates the opening-player guidance around the existing nine-step **First Match Guide**. While that guide is active, it is the only visible progress tracker and the only source of recommended next actions. The older six-stage Manager Induction is retained for schema compatibility but rendered as a collapsed **Optional Context** disclosure with no competing route button. The Foundation Plan is hidden until the First Match Guide finishes. Build 12.35 then replaces the retired handoff checklist with the live Club Daily Agenda. One-time section tutorials and Command Index recommendations are delayed until the guide ends, and the Command Centre hero removes its duplicate next-action panel during the journey. Preserve `firstMatchGuidance()`, `renderTeamTutorialPanel()`, `renderFoundationPath()`, `renderMenuContextTutorial()`, `guidanceConsolidationForTest()`, progressive access, save schema 19 and diagnostics schema 1.

Build 12.29 makes the recruitment actions in the persistent first-match guide behave like exact destinations rather than page-only navigation. When **Recruit Operator** or **Continue Recruiting** is selected, the game restores the Recruitment market view, opens Recruitment and smoothly scrolls the management pane to the candidate list, then gives the list a brief visual arrival cue. Preserve the `scrollTarget` metadata on the two recruitment guidance steps, `data-team-scroll-target`, the matching candidate-list anchors in both base and enhanced Recruitment renderers, `scrollMenuGuideTargetIntoView()` and the delegated route handler. Scrolling must remain inside `.menu-content`; the document, shell and layout must stay at their origin. Do not move keyboard focus automatically. Preserve `firstMatchGuidanceForTest()`, responsive containment, save schema 19 and diagnostics schema 1.

Build 12.28 begins the manager journey with an explicit concept briefing and an optional real one-round orientation match. A newly created club with no operators and no completed matches is told that the player manages rather than shoots, sees the Recruit → Prepare → Watch → Improve loop and learns that real matches are five-versus-five, no-respawn and first to three rounds. The orientation then runs one real AI-controlled Citadel round with four coach steps covering the scoreboard, objective, tactical preparation, spectator panel and live intention.

Preserve `newPlayerDemoState`, `NEW_PLAYER_DEMO_STEPS`, the eligibility/skip/completion flags inside the existing tutorial context, demo-specific match presentation and `newPlayerOrientationForTest()`. The demo may use the normal simulation but must exit before career settlement: it must never change match/round/win totals, finances, operator condition, league position, rewards or after-action history. Completion and skip must return to Recruitment. Keep all four coach stages paused until the fourth card's Watch the Round action, then hide the coach and release the live simulation. Keep normal first-to-three copy explicit and all cards contained at 320–430px portrait plus 844×390 landscape. Save schema remains 19 and diagnostics schema remains 1.

Build 12.27 progressively reveals the management interface during a genuinely new club's first-match journey. All five primary sections and every route remain visible, but features outside the current learning stage are greyed, labelled with their unlock milestone and blocked from navigation. Section overview pages remain accessible as previews and explain what unlocks next. This opening-week access layer is derived entirely from existing squad, plan, match, report and training state; it adds no saved checklist and automatically retires after the guide or after two completed matches so established careers are never re-locked.

The staged sequence is: Recruitment/Inbox/Configuration first; Active Five Operators, Tactics and Team Armoury after five operators; League and Calendar after plan confirmation; Telemetry, After Action and Supplies after the first match; Training after the first debrief; and Transfers, Staff, Finances, Gold Coins, Commercial and Fans after one training focus. Preserve `progressiveRouteAccess()`, `progressiveSectionAccess()`, the click guard in `setMenuRoute()`, visible locked-route reasons, overview previews and `progressiveInterfaceForTest()`. Career save schema remains 19 and diagnostics schema remains 1.

Build 12.26 turns the opening career into a visible, sequential first-match journey. `firstMatchGuidance()` is derived from the existing tutorial, squad, plan, report and training state; it does not create a parallel completion system or change save schema 19. The persistent priority strip now identifies one exact `NEXT OBJECTIVE`, uses a specific action label and visually emphasises the relevant primary section/sub-route while Build 12.27 now progressively locks unrelated routes during the opening journey.

The user-facing term **starting five** is replaced in the opening workflow by **active five operators** or **active operator line-up** so it is always clear that these are the five AI-controlled operators who deploy. Recruitment and squad cards now include lightweight authored operator busts and role identity graphics with no external assets.

Live matches add a compact round objective, an autonomous-plan summary and a changing intention label for the spectated operator. These labels are observational only and are derived from existing AI state; they must not influence movement, visibility, targeting, tactics or balance. The first after-action report adds a three-step reading guide above the existing What Worked / Biggest Issue / Next Manager Action analysis. Preserve `firstMatchGuidanceForTest()`, `liveMatchClarityForTest()`, `firstDebriefGuideForTest()`, all Build 12.25 typography/fixed-view checks, save schema 19 and diagnostics schema 1.

Build 12.25 keeps the Build 12.24 onboarding and random-name improvements but restores a fixed mobile viewport: `maximum-scale=1,user-scalable=no`. Do not add custom gesture blockers. The interface must remain readable at that fixed scale through authored typography rather than relying on browser zoom.

`css/game.css` now applies consistent management-interface font floors across primary navigation, section tabs, topbar date/status copy, priority panels, onboarding, section hubs, the command centre, line-up status, progress summaries and workflow controls. The compact tactical-console style, horizontal route rails and match HUD remain intact. Preserve the narrow 320–350px navigation adjustments and the phone-landscape rules through 900px.

The topbar displays a compact club date while retaining the full date in accessible labels. Preserve `typographyConsistencyForTest()`, the fixed-viewport check inside `onboardingClarityForTest()`, all Build 12.24 random-name/tutorial behaviour, save schema 19, diagnostics schema 1 and Build 12.23 purchase-feedback regressions.

Build 12.24 makes the first-run experience explain the game before asking the player to make decisions. Team creation states that Strikewatch is a tactical management game: the player recruits, equips and prepares five operators, while those operators move, aim and fight autonomously in first-to-three-round matches. The opening screen and retained six-stage induction show the recruit → prepare → watch → improve loop and identify promotion to the Pro League as the long-term goal. The editable `RANDOM NAME` control produces fictional, normalised names without saving until club creation. Its original browser-zoom rule is superseded by Build 12.25.

Build 12.23 fixes the direct-purchase feedback loop in the Supply Depot. Weapon and armour transactions now immediately re-render the active store card, update the owned-copy count and remaining cash, show an inline purchase receipt, and announce the new owned total. The purchased button is locked for 0.9 seconds and reads `PURCHASED · OWNED N`; after that it becomes an explicit `BUY ANOTHER` action. This prevents rapid queued taps from silently buying repeated copies while preserving deliberate repeat purchases. The success receipt clears after 4.2 seconds and store scroll position is retained.

`cashStorePurchaseFeedback`, `setCashStorePurchaseFeedback()` and `refreshSupplyDepotPurchaseUi()` are transient UI state only and must never enter career saves. Preserve exact one-price deductions, finite inventory copies, finance-ledger entries, the shared 3D store models, `cashWeaponPurchaseFeedbackForTest()` and all Build 12.22 store/content regressions. Save schema remains 19 and diagnostics schema remains 1.

Build 12.22 makes the direct weapon stock in the Supply Depot complete and visually consistent with Team Armoury. `CAREER_CASH_WEAPON_STORE` now contains the AR-4 Sentinel at 58,000 CR and the Viper-9 Compact at 32,000 CR. The AR-4 appears first so it remains obvious on narrow mobile layouts. Every offer renders `careerWeapon3dMarkup(..., 'store', false)` from the same `careerWeaponVisualParts()` geometry used by loadouts, crates, first person and operators; do not create store-only weapon art.

`cashStoreWeaponVisualMarkup()` owns the card stage only. Store CSS may scale or frame the shared rig, but may not redefine weapon parts. Purchases still add one finite inventory copy and now log a `WEAPON` cash-ledger transaction. Preserve `cashWeaponStoreForTest()`, direct AR/Viper purchase tests, 320/375/390/430 portrait and 844x390 containment, and all retained weapon, armour, AI, map and state-integrity regressions. Save schema remains 19 and diagnostics schema remains 1.

Build 12.21 makes exposed reload behaviour and landed-hit feedback more believable without turning either system into a hard stun mechanic. An operator who is already reloading and has no loaded alternate weapon now treats known exposure as a tactical emergency: `hasUsableAlternateWeapon()`, `reloadNeedsCover()` and `registerReloadCoverIntent()` drive the existing cover finder, preserve the live reload, move toward a valid protected anchor, and use a controlled fallback when no anchor is available. If the magazine finishes before the operator reaches the selected anchor, the cover commitment continues instead of switching to an open-space hold. A loaded alternate weapon prevents this forced-cover rule.

Every landed hit still receives the established cosmetic body/weapon reaction. `applyCombatFlinch()` adds a separate probabilistic gameplay layer: only some non-fatal hits interrupt the current burst and briefly displace aim. Flinch chance is scaled by effective impact, critical/headshot status, resilience and armour absorption; it is capped at 44%, lasts 0.11–0.22 seconds, has a 0.58–0.82 second anti-chain cooldown, does not cancel reloads or weapon swaps, and reduces movement by at most 14% during the brief reaction. The character and first-person renderers add a restrained matching weapon twitch.

Diagnostics schema remains 1 and now includes optional counters/events for reload-cover seeks, arrivals, fallbacks, triggered flinches and cooldown-blocked repeat flinches. Preserve `reloadCoverBehaviourForTest()` and `hitReactionFlinchForTest()` alongside all established weapon, armour, AI, map and state-integrity regressions. Career save schema remains 19.

Build 12.20 refines the third-person AR-4 firing posture without changing the shared rifle geometry. The complete weapon is pulled back and lifted as one rigid model so the butt pad seats in the dominant shoulder pocket, the firing hand remains on `pistol-grip`, and the support hand remains on `support-grip`. The pose is laterally offset toward the dominant shoulder, reducing the previous outstretched, centre-chest appearance while preserving recoil, reload, muzzle, inventory and balance behaviour.

`OPERATOR_LONG_GUN_POSE` in `js/62-character-renderer.js` owns only the contextual third-person placement. It must never redefine AR-4 dimensions or hand anchors. `operatorWeaponAttachmentAudit()` now measures the stock-seat point and requires the rifle butt to remain within 0.075m of the authored shoulder-pocket target. `operatorHeldPoseForTest()` provides a deterministic live WebGL inspection pose.

Build 12.19 refines the shared AR-4 Sentinel model and removes its tube scope. The rifle now uses a lower top rail with compact front and rear flip-up iron sights, tighter carbine proportions, a cleaner receiver transition, a more compact stock and a slimmer handguard. The same authored part list still drives the Armoury inspector, first-person viewmodel, living operators, corpses and dropped weapons.

`careerWeaponPartMarkup()` continues to render cylindrical parts as true CSS 3D cylinders in management previews; `drawUnifiedCareerWeapon()` and the first-person renderer consume each part's `shape` metadata and select cube, rounded-box or cylinder meshes. Distant operator LOD continues to retain the connected core silhouette. Preserve grip/support anchors, model-bounds muzzle placement, reload movement and all Build 12.17 weapon-slot behaviour. `careerAr4ModelAudit()` / `ar4WeaponModelForTest()` now also assert that every scope component is absent and both iron sights are present.

Build 12.18 introduced the rounded/cylindrical shared AR-4 geometry that Build 12.19 refines.

Build 12.17 separates every operator loadout into a **primary weapon**, a required **sidearm** and the existing armour slot. Pistols remain valid as sidearm-only starter loadouts; equipping a rifle no longer replaces the pistol. Existing schema-18 careers migrate safely: a legacy pistol becomes the sidearm with no dedicated primary, while a legacy AR-4 remains the primary and receives the starter P12 Scrapline as its sidearm. Career save schema is now 19; diagnostics schema remains 1.

Weapon copies remain finite across both slots. `careerPlayerPrimaryWeaponId()`, `careerPlayerSidearmId()` and `careerPlayerActiveWeaponId()` are the authoritative accessors; do not infer a slot from the compatibility `equippedWeaponId` field. `equipCareerWeapon()` and workflow drafts must remain slot-aware, and `stateIntegrityForTest()` must reject assignments exceeding owned copy counts.

The AR-4 is a prepared mid-range primary rather than a universal upgrade: it carries a 5.5% movement penalty, slower turning and sprint-settle behaviour, a larger fatigue contribution, a longer reload and a louder report. Pistols retain rapid draw, no movement penalty, faster close-range handling and lower fatigue. AI operators may draw a sidearm for sudden close contact or an unsafe empty-primary reload, then return to the primary when range or safety favours it. Preserve `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()` and `weaponSwitchingForTest()`.

Every player-usable weapon card in the Armoury and CR store now communicates slot, effective range, damage, magazine, penetration, movement cost, description, benefits and limitations. Spectator HUD shows armour integrity immediately beside/below HP and the compact portrait line includes `ARM <integrity>`. Preserve `spectatorArmourHudForTest()` and do not hide zero-integrity/break information from the player. Post-match player records retain primary/sidearm identities, switch count and sidearm draws.


Build 12.16 changes armour integrity from round-scoped servicing to match-long attrition. A surviving rig keeps its exact remaining integrity through every round of the current match. Starting a new match services surviving equipment back to full; zero-integrity armour still breaks permanently, is removed from owned inventory and cannot return in a later round. Opposition armour follows the same match-long rule and a destroyed rig is absent for the rest of that match. Preserve `captureMatchArmourState()`, `restoreMatchArmourState()` and `armourMatchAttritionForTest()`.

Build 12.15 introduces a complete per-player armour equipment system. Four purchasable torso rigs are available in the Supply Depot for CR, every purchase creates one finite club copy, and one copy may be equipped to one operator through the existing Team Armoury loadout screen. New and migrated players default to `none`; career save schema is now 18 and safely normalises schema-17 and older saves.

Torso hits use graded protection: operator resilience is applied first, then weapon `armourPenetration` is compared with armour rating to determine absorbed health damage and integrity loss. Headshots bypass armour. Light, medium and heavy rigs trade protection for movement, handling and fatigue costs. Integrity now persists through every round of a match. Surviving equipment is serviced only when a new match begins; reaching zero permanently breaks the copy, removes it from `armourInventory`, and automatically unequips the player.

Owned and simulated operators render distinct unarmoured/light/medium/heavy silhouettes. HUD, match tracking and diagnostics expose integrity, absorbed damage and break events. Diagnostics schema remains 1 with optional armour fields. Preserve `armourSystemForTest()`, `seedArmourLoadoutsForTest()`, `armourLoadoutMappingForTest()`, `equipPlayerArmourForTest()` and the established weapon/AI/map/runtime regressions. Schema round trips must retain `armourInventory` and every player’s `equippedArmourId`.

Build 12.14 corrects weapon attachment and presentation drift on living operators without changing loadouts or combat values. The world renderer now derives dominant-hand, support-hand and muzzle positions from the equipped shared weapon geometry instead of generic offsets. This keeps the P12 variants, Viper-9 and AR-4 seated in the hands through movement, recoil and reload presentation.

The AR-4 first-person rig now resolves its real `pistol-grip` instead of falling back to a pistol hand position. Shared-model muzzle flashes derive from the authored weapon bounds, distant AR-4 operators retain the pistol and support grips needed for a coherent held silhouette, and hand bob is applied once rather than twice.

Build 12.14 preserves Build 12.13 tactical readability/coaching, Build 12.12 AI pacing/team spacing, Build 12.11 runtime continuity, Build 12.10 acquisition, Build 12.09 commitment/quality and Build 12.08 operator geometry. Save schema 17 and diagnostics schema 1 remain unchanged.

Build 12.13 makes the tactical management layer observable before, during and after a match. Deployment now previews the actual first-round engagement plan, numbered operator lanes, role/range information, likely contact area and plan conflicts. The first-round bots consume the same `openingPlanId` and objective coordinates shown in that preview; later rounds may still rotate or accept between-round changes.

Owned-operator telemetry now explains current action, reason, target, current/preferred range, team instruction and route intent without giving the player hidden information about unseen opponents. Completed match reports retain five owned operator diagnostic summaries and compare formation, approach, engagement range, team priority, opening plan and lane spacing against actual execution. Coaching recommendations are buttons that open Tactics, the relevant Training card or the relevant Armoury loadout.

Build 12.13 is an interpretation and navigation layer, not a balance rewrite. It preserves Build 12.12 AI pacing/team spacing, Build 12.11 runtime continuity, Build 12.10 acquisition, Build 12.09 commitment/quality and Build 12.08 model improvements. Save schema 17 and diagnostics schema 1 remain unchanged.

Build 12.12 smooths the remaining bursty AI work and stops operators collapsing into the same route, cover point or firing lane. Broad perception and non-emergency tactical reconsideration now share explicit per-rendered-frame budgets across all fixed simulation substeps. Combat recovery/flank routing cheaply scores bounded candidates first and performs at most one budgeted A* search instead of running a complete path search for every candidate.

Team spacing is now a contextual tactical layer. Formation, approach, engagement range, priority and role determine a desired gap and lane preference; Stay Grouped remains the tightest plan but still preserves a physical separation floor, while Trade, Hold and Flank progressively widen lanes. Regroup/follow destinations use deterministic formation offsets, dynamic goals account for current and reserved teammate lanes, and local separation corrects clusters without changing weapon, health, movement-speed or result values. Diagnostics expose scan/tactical deferrals, combat-route search volume and spacing corrections.

Build 12.11 fixes a release-blocking first-elimination render-loop crash. The corpse renderer now derives its own distance/quality LOD flags before using full-detail headset and strap geometry. The main requestAnimationFrame loop also records bounded runtime faults and always schedules the next frame, so a future presentation exception is exported instead of silently terminating the match. Diagnostics schema 1 remains unchanged and now includes optional `runtimeFaults`.

Build 12.10 corrects a release-blocking initial-target acquisition regression introduced by the staggered perception work in Build 12.09. A visible but not-yet-confirmed `sightCandidate` is now revalidated and retained on the frames between full opponent scans, allowing the human-like reaction timer to accumulate normally. Broad challenger searches remain staggered, while pending-candidate visibility and current-target visibility remain authoritative every simulation frame. An enemy physically occluding the current target may also be selected immediately; friendly body occlusion remains blocking.

Build 12.09 is a match-quality and broad-device-performance release on top of Build 12.08. It reduces target, tactic and route churn through stronger commitment windows, target hysteresis, reserved/validated navigation destinations and staggered full perception scans while preserving per-frame line-of-sight truth for the active target. It also adds turn anticipation, foot-plant weighting, breathing/aim stability and stronger body lean to the procedural operator animation layer.

Performance acceptance no longer treats one recent iPhone as representative. A measured runtime governor now adjusts character LOD, full perception frequency, navigation-plan budget and render resolution only after sustained pressure. Clearly constrained hardware starts conservatively; other devices begin at full quality and step down only when real update/render timing demonstrates need. Diagnostics expose the active quality tier.

Build 12.08 is an operator-model presentation release on top of the retained Build 12.07 Dune Bastion support pass. It keeps the custom asset-free WebGL engine and replaces the most visibly primitive body forms with smooth procedural geometry: a shaped tactical torso, tapered rounded limb segments and rounded major armour/equipment forms. The living and corpse renderers share the same upgraded surfaces, while collision, hit detection, AI, weapon balance and save data remain unchanged.

Build 12.07 was a geometry and presentation-correction release on top of the Build 12.05 fortress pass and Build 12.06 prop-alignment pass. It fixes unsupported decorations identified through Free Roam: all six freestanding standards now use grounded stone feet, full-height masts, connected crossbars and matching `banner-post` colliders; the recessed arch lintels now overlap their parent masonry instead of hanging below it; and the teal landmark emblems are flush-mounted to arch faces with sandstone backing rather than floating above the roof line.

The established 36 × 24 one-floor competitive layout, desert-fortress skyline and three combat bands are unchanged. North Rampart, Central Gate, South Bazaar and both courtyard flanks remain open. New support collision is narrow, mirrored and aligned to visible geometry. Overhead cloth, banner fabric, floor markings, wall-top details and exterior silhouettes remain non-blocking.

`duneBastionAuditForTest()` now validates ordinary props, canopy posts, arch posts and banner posts as a single support system. It rejects support-to-prop overlaps, support-to-support overlaps, missing banner bases/colliders, detached arch lintels or plaques, invalid brazier anchors, broken symmetry, disconnected destinations and blocked route bands. The current baseline is 58 static colliders, one 494-node/2,752-edge navigation component and 160/160 benchmark routes with zero failures.

The Club Inbox deliberately exposes two 76–78px message rows before scrolling. Do not restore the older four-row viewport.
Both Office courtyard opening plans now send two operators per team to the opposite side of the centre line, and an active rotation goal takes priority over a stale opening objective. Preserve `officeCourtyardOpeningTraversalForTest()` alongside the lane and decision audits.

The Club section includes **Fans**. `supporterState()` persists a realistic active fanbase, popularity, confidence, loyalty, season finish expectation and compact reaction/trend histories. Expectations are created when the club is founded and at each new season. Match difficulty, signing importance, departures and sponsorship quality affect supporter reactions in bounded amounts; no supporter value changes health, damage, AI ability or result selection.

The Gold Coin cell intentionally hides decorative content at narrow widths before allowing its quantity to truncate. The subsection bar and Foundation Plan must remain inside the viewport at 320, 375, 390, 402 and 430px.

Build 11.90 door-pocket geometry, regroup stability and diagnostic-event retention remain required. Save schema 17 and diagnostics schema 1 are unchanged.

## Required first steps

Before answering a development request:

1. Read `AGENTS.md`.
2. Read `PROJECT.md`.
3. Read `DOCUMENTATION-INDEX.md` for the current-versus-historical document map.
4. Read every other Markdown file supplied with the project.
5. Inspect the source modules that own the requested behaviour.
6. Do not assume a small upload contains the whole project.
7. Tell the user before editing when another source module is required.

## Source and release relationship

- The modular files in this directory are the master editable source.
- `js/strikewatch.dev.js` is generated by `build.py`; do not edit it directly.
- `dist/strikewatch-build-12.76.html` is the generated self-contained release.
- Source changes do not update an older standalone HTML automatically.
- The release is asset-free and can be opened directly in a mobile browser.

## Product target

- Strikewatch supports two deliberately separated presentation targets: the regression-locked phone interface below `1024px`, and the Desktop Command Centre at `1024px` and wider.
- Portrait and mobile landscape layouts, touch controls, iPhone safe areas and mobile performance remain first-class requirements and must not be altered by desktop work.
- Desktop Command HQ layout decisions are accepted at 1024, 1280, 1366, 1440 and 1920 CSS-pixel widths with mouse/keyboard focus visibility, readable information density and no document-level horizontal overflow.
- Primary mobile checks remain 320, 375, 390, 402 and 430 CSS-pixel widths plus 844 × 390 mobile landscape.
- Keep desktop rules inside the final `@media (min-width: 1024px)` layer unless a future release intentionally changes the mobile interface.

## Documentation is part of feature completion

Whenever a task adds, changes or removes gameplay, content, UI, navigation, rendering, progression, team management, finances, build behaviour, debug tooling or release requirements, update the relevant Markdown files in the same task by default.

At minimum:

- keep this file, `AGENTS.md`, `PROJECT.md` and `README.md` aligned with the playable build;
- update `GPT-HANDOFF-PROMPT.txt` when a new invariant or workflow rule should carry into future work;
- document new source modules, dependencies, debug helpers and regression requirements;
- remove or correct stale descriptions rather than leaving old behaviour documented beside the new behaviour.

A playable feature is not complete while its project documentation is knowingly out of date.

## Build 12.14 current release rules

- Owned and simulated operator weapon IDs must map to the active `primaryWeapon` model for their slot. Secondary presentation may replace only the active weapon while `usingSecondary` is true.
- `careerWeaponGripPart()` must resolve both pistol `grip` and rifle `pistol-grip`; `careerWeaponSupportPart()` must resolve the authored support surface.
- Living-operator hands must derive from the equipped shared model's grip/support anchors. Do not restore generic hand coordinates for P12, Viper or AR-4 shared models.
- Shared-model muzzle flash position must derive from `careerWeaponVisualBounds()` and the same origin/pitch/roll used to draw the weapon. Hard-coded legacy distances are only for legacy generic rifles.
- Apply body bob once to hands and weapon. Preserve the shared reload phases and model-driven magazine/slide movement.
- Distant AR-4 LOD must retain `pistol-grip` and `support-grip` so the held silhouette remains connected.
- Preserve and run `operatorWeaponAttachmentForTest()` and `operatorWeaponLoadoutMappingForTest()` alongside the retained animation, corpse and runtime tests.

## Retained Build 12.13 rules

- The deployment route overlay and lane list must derive from `clubTacticalPreviewSnapshot()` and the live arena engagement-plan definition. The first round must select the captured `openingPlanId`; do not display a route the bots will not receive.
- Live decision explanations are observational. Read existing bot intent/target/range fields, but never expose an unseen enemy, hidden coordinates or developer-only scoring to the player.
- Match analysis must use the persisted owned `operatorAnalysis`, zone analytics, AI stability and tactical plan. Keep intent-versus-execution rows distinct from permanent player ability ratings.
- Coaching buttons may navigate and highlight Tactics, Training or Loadout; they must not silently apply tactics, spend points, equip weapons or bypass the victory reward flow.
- Preserve `tacticalPreviewForTest()`, `openingPlanParityForTest()`, `liveDecisionExplanationForTest()`, `tacticalCoachingAnalysisForTest()` and `tacticalCoachingDestinationForTest()`, plus completed-match report coverage.

## Retained Build 12.12 release rules

- Call `beginBotWorkFrame()` once per rendered frame before fixed simulation substeps. Broad perception and ordinary tactical reconsideration must consume their respective quality-tier budgets; current-target and pending-candidate visibility remain authoritative every simulation frame.
- `findCombatApproachRoute()` may score multiple cheap candidates but may perform at most one budgeted A* search per route request. Do not restore per-candidate path searches or bypass the shared navigation planner.
- Preserve tactic-aware team spacing. Stay Grouped is compact but not overlapping; Trade, Hold and Flank must retain progressively wider lane preferences, with role and engagement range still contributing.
- Dynamic destinations and traffic penalties must consider teammate positions, active/reserved goals, next path points and duplicated firing angles. Local separation must remain collision-tested and must not become a balance modifier.
- Preserve `botWorkBudgetForTest()`, `combatRouteBudgetForTest()` and `teamSpacingForTest()`, plus a multi-round Dune combat simulation and fresh real-device diagnostics.

## Retained Build 12.11 release rules

- `drawCorpse()` must derive `mediumDetail` and `fullDetail` from its own `detailTier`; it must never rely on living-operator renderer locals.
- Rendering the first eliminated operator must not throw at near, medium or distant LOD, across all three authored death poses.
- The requestAnimationFrame loop must reschedule in `finally`. Runtime faults are bounded, logged and included in diagnostic exports rather than silently stopping the match.
- Preserve `corpsePresentationForTest()`, `firstEliminationContinuityForTest()` and `runtimeFaultsForTest()` alongside the retained combat/perception checks.

## Retained Build 12.10 release rules

- A visible unconfirmed `sightCandidate` must survive skipped broad-scan frames while it remains genuinely visible. Its recognition timer advances every simulation frame and must not be reset merely because a full challenger scan was deferred.
- Pending candidates and committed targets are revalidated against live line of sight every frame. Staggering may reduce search frequency, never visibility truth or the ability to begin combat.
- A visible enemy body directly occluding the current target is an immediate valid retarget. Friendly operators still obscure vision and trigger the existing bounded clearance behaviour.
- Preserve `staggeredPerceptionAcquisitionForTest()` alongside close-threat retarget, operator-body occlusion and live-match combat smoke tests.

## Retained Build 12.09 release rules


- Preserve active-target line-of-sight validation every simulation frame. Only broad challenger scans may be staggered by the runtime quality tier.
- Preserve target and tactical commitment hysteresis. Immediate close threats, lost visibility, reload emergencies and serious health pressure may interrupt; minor score fluctuations may not.
- Combat and pursuit destinations must be validated against walkability, local clearance and team-mate reservations before path planning. Keep the bounded single A* request contract.
- `runtimeQualityTier` is measured, reversible and non-persistent. It may reduce perception scan frequency, navigation plans per frame, distant operator detail and render resolution, but must not alter weapon values, movement speed, health, visibility truth or tactical weighting.
- Living operators retain turn anticipation, foot-plant weighting, breathing/aim stability and locomotion lean. These are render-only and must not change collision, aiming truth or movement distance.
- Preserve distance-based operator and weapon LOD. Near operators keep full Build 12.08 geometry; distant/constrained modes remove small accessories and weapon fittings before reducing core silhouette geometry.

## Retained Build 12.08 operator silhouette rules
- Keep the existing custom WebGL renderer. An engine migration is not justified for this pass; operator realism is improved through shared procedural meshes and preserved mobile rendering controls.
- `js/60-renderer-core.js` owns `makeRoundedBoxMesh()`, `makeTaperedCapsuleMesh()`, `makeOperatorTorsoMesh()` and `drawAnatomicalSegment()`. `js/61-world-renderer.js` creates each shared mesh once. `js/62-character-renderer.js` applies them to living operators and corpses.
- Preserve the existing two-bone leg solver, animation blending, hit reactions, death poses, weapon attachment points and compact broad-shouldered readability. Do not return major body parts to raw cube silhouettes.
- The visual upgrade must not alter `BOT_RADIUS`, hitboxes, line of sight, navigation, weapon reach, health, damage, economy or save schema.
- Keep the new body pass draw-call neutral: substitute shared meshes for existing body draws rather than layering duplicate anatomy.
- `operatorSurfaceGeometryAudit()` and `operatorPresentationForTest()` are the deterministic inspection hooks for the current operator geometry.
- Retain the complete Build 12.07 Dune Bastion geometry and support contract below.

- Dune Bastion is the current third arena. Summit Terminal has been removed from playable Map 3 and all old Summit geometry requirements are historical only.
- Preserve the 12.04 wall grid, the 12.05 scene-quality pass and the 12.06 brazier/crate alignment corrections. Build 12.07 adds visible support integrity without changing lanes, cover balance or combat values.
- Every freestanding banner standard must have a grounded foot, continuous mast, visibly connected rods and one matching `banner-post` collider. Banner cloth/tails remain presentation-only.
- Arch inner lintels must overlap or touch the parent masonry. Landmark emblems must remain flush-mounted to an arch face with visible backing; do not place isolated decorative blocks above the structure.
- Solid additions such as supply carts, crate stacks, amphora clusters, bazaar-edge sandbags and all visible canopy/arch/banner ground supports must remain mirrored and collision-authored. Rubble, floor markings, exterior silhouettes and wall-top decoration stay non-blocking.
- Preserve the one-floor 36 × 24 symmetrical layout, mirrored collision, open-sky desert presentation and one connected navigation component.
- Keep the three intended combat bands: North Rampart for long-range control, Central Gate for mixed engagements and South Bazaar/courtyards for close-range routes and flanks.
- Every Dune brazier must be wall-backed with open space in front. Preserve the rendered mounting plate and `allTorchesWallMounted` audit.
- Preserve `supportOverlaps`, `supportPairOverlaps`, `allBannersGrounded`, `allArchDecorAttached` and `allDecorSupportsClear`. A release must contain zero ordinary-prop/support overlaps and zero support/support overlaps.
- Minimap, preview, matchmaking and Free Roam must identify `dune` / **Dune Bastion**. Retain the legacy `summit` save alias only for migration.
- `duneBastionAuditForTest()` is the authoritative Map 3 release gate. Run it with generic arena/engagement audits and a 160-route benchmark.
- Do not alter weapon, AI raw strength, economy, reward or progression balance as part of Map 3 visual/layout maintenance.

## Build 12.00 performance and Free Roam contract

- `navigationGraphForActiveArena()` owns the static arena graph. It may cache map walls, static props, elevation-valid edges and static clearance penalties, but teammate traffic and other dynamic costs must remain live. Warm the graph before live simulation begins.
- `Bot.ensurePath()` must never run an unbounded fallback-search ring. One connected-component destination substitution plus the bounded retry cooldown is the release invariant. Do not restore repeated same-goal searches within one frame.
- Navigation optimisation must preserve ordinary route intent, stair-only floor transitions, collision, dynamic doors, tactical interruption rules and all combat/balance values.
- Match diagnostics use circular event/sample storage. Export through `diagnosticOrderedEvents()` and `diagnosticOrderedSamples()`; never rely on physical ring-array order. Full-match `eventCounts` remain cumulative.
- Regular diagnostic snapshots are 2 Hz and may omit full path arrays. Forced boundaries and periodic checkpoints retain enough path data for troubleshooting. Diagnostics schema remains 1.
- Active update stalls (`updateMs > 100`) and scheduling gaps (`frame interval > 250ms`) are separate facts. Stage timings must be passed from the runtime loop to the performance report.
- Free Roam belongs under Configuration. It supports all three arenas, uses the operator footprint and authoritative collision/elevation/door systems, provides movement/look controls, map toggle, exit and position export, and never advances a fixture or modifies the saved career.
- Preserve Free Roam mobile fit at 320, 375, 390, 402 and 430px plus 844×390 landscape. Keep the crosshair visible and ordinary match HUD/operators/weapons hidden.
- Required helpers include `navigationBenchmarkForTest()`, `diagnosticEventRetentionForTest()`, the retained map audits, and the Free Roam debug helpers. Career schema stays 17.

## Build 11.98 Summit-presentation and inbox-separation history (stair count superseded)

- `summitPlatformRailSegments()` derives platform guardrail runs from `ARENA_LIBRARY.summit.vertical`. The original six-mouth layout is historical; the current build must leave openings at both retained stair mouths and the upper-deck link.
- Summit platform rails use top/mid/base rails, regular vertical posts and framed translucent panels. Summit stair rails follow the ramp incline on both sides and remain presentation-only outside the walkable stair width.
- Summit floor-zone overlays must render with blending enabled. Floor patches and wayfinding strips must sample `arenaElevationAt()` so upper-floor details do not render underneath the structural deck. Keep the terminal palette coherent and avoid large opaque brown/purple zone rectangles.
- The Inbox still exposes exactly two message rows. The message-list column must have a visibly distinct background, bottom separator and shadow from the full-message reader; do not achieve separation by increasing the list height.
- Preserve `summitPresentationAuditForTest()` with two platforms, two ramps, two observed stair-mouth gaps, one deck join and valid rail segments. Retain all Build 11.97 stair-only, route, Office, state-integrity, syntax, deterministic-build and phone-width gates.
- Career schema remains 17 and diagnostics schema remains 1.

## Build 11.86 multi-kill, unified-player-record and loadout-autosave contract

- `CAREER_MULTI_KILL_WINDOW` and `CAREER_MULTI_KILL_REWARDS` in `js/35-career.js` are authoritative. Eligible events require one manager-owned operator to continue a same-round chain within 18 simulation seconds. Record Double/Triple/Ultra/Rampage at 2/3/4/5; opponent eliminations, a new round and expired chains must not award anything.
- The tier rewards are exact and cumulative: 1 GC/8 XP/1,500 CR; 2 GC/16 XP/3,000 CR; 3 GC/28 XP/5,000 CR; 5 GC/50 XP/9,000 CR. Bank rewards during the match but settle them only at normal full-match completion. Keep the existing match result, commercial, Gold Coin and Team XP systems intact.
- `#multiKillBanner` is a non-modal, queued spectator notifier. A rapid chain must show every earned tier in order rather than replacing the current banner. Reset banner state when a new match starts.
- The `profile` route is the single individual-player information destination. `renderPlayerTelemetryProfileSection()` embeds live/latest telemetry into it; Team Telemetry remains the aggregate starting-five page. Keep `player-telemetry` only as a redirect alias for old links/history and do not re-add it to `menuSections`.
- Player Profile & Data should retain attributes, performance, condition, medical information, development, reflections, loadout context, latest chain and career multi-kill honours together. Prefer extending that record over scattering another individual-player route.
- Issuing or reassigning a weapon saves immediately. Exclude `loadout` from the management draft registry and navigation-discard guard while retaining live-match locks, finite inventory transfer and plan-confirmation invalidation.
- Preserve `multiKillRewardForTest()`, `multiKillSequenceForTest()`, `multiKillSettlementForTest()`, `playerProfileConsolidationForTest()` and `equipPlayerWeaponForTest()`. Required checks include cumulative values, queue order, opponent exclusion, timeout reset, Profile embedding, old-route redirect, immediate persistence, clean draft state, mobile fit, syntax and deterministic standalone parity.
- Career schema remains 17 and diagnostics schema remains 1.

## Build 11.85 tactical-intervention, causal-debrief and header-history contract

- Non-final rounds now pause after the result/sponsor sequence for `#betweenRoundTactics`. `js/40-match-flow.js` owns the intervention state, coaching read, two-change limit and commit flow; `js/70-runtime.js` owns overlay input and test hooks. **Keep Current Plan** must always remain available so the manager can continue without making a change.
- A manager may change at most two of the three categories—approach, engagement range and collective priority—between rounds. The intervention updates only `careerState.tactics.activeMatchPlan` for the live match. It must not silently rewrite the saved baseline tactics, apply raw damage/health bonuses, expose unseen opponent data or bypass ordinary role/weapon/readiness logic.
- Each committed intervention appends a compact entry to `activeMatchPlan.adjustments`. Completed reports may retain and render that compact timeline; no new career schema field is required and old schema-17 saves must continue to load without it.
- `buildTacticalMatchAnalysis()` must lead the debrief with three causal conclusions: **What Worked**, **Biggest Issue** and **Next Manager Action**. Evidence must use tracked match telemetry, explain the comparison in plain language and avoid treating fewer than eight shots as a reliable accuracy sample. Detailed telemetry remains available below the summary.
- On portrait widths up to 430px, Forward remains the final header cell at the far-right edge. End Day receives the expanded adjacent space (approximately 105–117px at 375–430px); at 360px and below it retains the full-width second row. Back/Forward must reflect actual route-history availability and never overlap Gold, shortcuts or End Day.
- Preserve `betweenRoundTacticsForTest()`, `forceBetweenRoundTacticsForTest()`, `selectBetweenRoundTacticForTest()`, `applyBetweenRoundTacticsForTest()`, `tacticalAnalysisForTest()`, `menuBackForTest()`, `menuForwardForTest()` and `menuHistory()`. Required checks cover the two-change cap, Keep Plan, active-plan isolation, adjustment logging, zero-shot analysis, real back/forward restoration, no header/overlay overflow at 320/375/390/430 portrait and representative mobile landscape, syntax and deterministic rebuild parity.
- Build 11.85 retains career save schema 17 and diagnostics schema 1. It changes no weapon damage, operator health, opponent strength, finances, rewards or progression values.

## Build 11.84 management-readability and career-recovery contract

- `renderMenuPriorityStrip()` presents one live required, recommended or optional next action at the top of every management route. It must derive its state from `clubEndDayBlockers()`, squad readiness and the existing Command Centre recommendation engine; it must never invent a second blocker system or mark an unresolved item complete merely because its route was opened.
- Team, Armoury, Supplies and Club overviews are decision dashboards rather than duplicate link directories. `sectionHubPriorityCards()` shows three concise conclusions with direct actions. The complete route directory remains available inside the collapsed `.section-hub-pages` disclosure so advanced systems stay discoverable without dominating the phone viewport.
- `renderFoundationPath()` guides a new club through creation, five-player recruitment, match-plan confirmation, the first match, debrief review, training focus and calendar advancement. Only the next incomplete step is emphasised; the guide retires after the opening phase and does not lock advanced pages.
- Career persistence now includes a portable JSON export, JSON import, last-save metadata and a one-step automatic restore point. `CAREER_STORAGE_KEY` remains the active save; `strikewatchCareerBackupV1` stores the previous distinct save and `strikewatchCareerSaveMetaV1` stores the latest save timestamp/build reason and whether a cross-career restore point is protected from ordinary autosave rotation. Importing or restoring must preserve the replaced career as the next restore point.
- `build.py` derives release version and cache ID from `js/00-core.js`. Do not reintroduce manually duplicated current-build constants for the output filename or asset query verification.
- Preserve `careerDataRecoveryForTest()`, `priorityUxForTest()`, `seedReadabilityCareerForTest()`, `createCareerBackupForTest()` and `restoreCareerBackupForTest()`. Required checks cover the priority strip, Foundation Plan, collapsed hub directory, recovery actions and zero horizontal overflow at 320/375/390/430 portrait widths plus representative mobile landscape.
- Build 11.84 retains career save schema 17 and diagnostics schema 1. It changes no AI, weapon damage, opponent strength, finances, rewards, progression rates or match settlement values.

## Build 11.83 action-routing viewport contract

- Attention cards, notification badges and End Day blockers may scroll only the `.menu-content` management pane. Never use vertical `Element.scrollIntoView()` for a routed target because iOS can also scroll hidden shell ancestors and move the topbar off-screen.
- `restoreCommandViewportOrigin()` keeps the document, shell and layout at scroll origin; `scrollCommandContentTargetIntoView()` positions the target within the internal content pane.
- `.menu-shell` and `.menu-layout` are clipped non-scrollable ancestors in portrait Command HQ. `.menu-content` remains the only vertical scroller.
- Preserve `menuViewportIntegrityForTest()` and `scrollManagementTargetForTest()`. Required checks include topbar visibility and zero outer scroll after opening low-page actions at 320/375/390/430 widths.
- Build 11.83 changes no save schema, diagnostic schema, gameplay, balance, AI, finance or reward values.

## Build 11.82 mobile End Day header contract

- On portrait widths up to 430 CSS pixels, the Command HQ header uses five explicit columns in DOM order: Back, Gold, three shortcuts, End Day and Forward. History controls are normal grid cells at these widths rather than absolutely positioned overlays.
- `#menuEndDayBtn` is an integrated 54-pixel header cell with centred, bounded copy and no floating pill offset. The blocked state keeps its red treatment and numeric badge but must not overlap Match or Forward.
- At 360 pixels and below, Gold collapses to its balance text and End Day uses a dedicated 44-pixel second row so all history and shortcut controls retain 44-pixel touch cells.
- The visible blocked subtitle is intentionally compact (`N RESPONSE(S)`); the complete reason remains in the button's aria-label and title.
- Required checks cover 320, 375, 390 and 430 portrait widths, one fixed End Day control, 54-pixel header height, no overlap and no horizontal overflow. Save schema 17 and diagnostics schema 1 are unchanged.

## Build 11.81 match-flow, AI-stability and zone-analytics contract

- `js/31-match-diagnostics.js` owns the optional schema-1 `zoneAnalytics`, `fightLocation` and `aiStability` summaries. Damage and eliminations are attributed to the target impact zone; sampled active-combat time, contested time, congestion, maximum friendly occupancy and team-mate movement/firing blocks remain observational and never influence AI or career results.
- `js/30-bot-ai.js` reduces avoidable decision churn through longer stable path holds, reused near-identical coordination goals, less frequent non-urgent tactical decisions and longer-lived combat-approach routes. Contact, critical health, reload pressure, urgent hunts and actual blocked movement must still override those holds.
- Completed career reports may retain the compact zone/stability summary and render it inside the Tactical Review. Do not persist raw diagnostic samples or event lists in save schema 17.
- Preserve `zoneAnalyticsForTest()`, `zoneAnalyticsScenarioForTest()`, `aiStabilityForTest()` and `coordinationPathReuseForTest()` alongside the Build 11.80 courtyard-rotation helpers. Required release checks include damage/kill attribution by zone, bounded sampled time, same-intent path preservation, Office courtyard rotation, responsive report layout, syntax, deterministic build and unrelated state/league/door/crate regressions.
- Build 11.81 retains career save schema 17 and diagnostics schema 1. It does not alter weapon damage, opponent strength, finances, rewards or progression rates.

## Build 11.80 Office mid-round rotation contract

- `js/30-bot-ai.js` owns Skyline Offices courtyard rotations. They are mid-round route decisions based only on the operator's own contact silence, current zone, route age, role and friendly-team congestion; they must never use hidden enemy coordinates or minimap data.
- A rotation has two stages: enter the courtyard through one of four audited lanes, then cross to an alternate office lane. At most two operators per living five-player team may rotate simultaneously, reduced to one when fewer than four remain.
- Visible contact, remembered contact, heard sound, combat approaches and urgent late-round hunting immediately cancel the route. Operators must resume ordinary combat/search logic rather than completing a scripted crossing under fire.
- Preserve `officeCourtyardRotationAuditForTest()`, `officeCourtyardRotationDecisionForTest()` and `forceOfficeCourtyardRotationForTest()`. Diagnostics schema 1 may record optional `office_courtyard_rotation` events and counters, but rotation data remains observational and never enters the career save.
- Build 11.80 retains save schema 17 and diagnostics schema 1. Required release checks include four clear/reachable courtyard lanes in both directions, forced-route reachability, Office engagement-plan rotation, Office walkway/door audits, Supply Depot Viper purchase, JavaScript syntax and standalone inline-script parity.

## Build 11.78 workflow-integrity and save-state contract

- `js/39-workflow-integrity.js` is the central authority for actionable management notifications, exact destinations, arrival banners, target highlighting and reversible management drafts. Route badges and blockers must open the specific player, message, transfer, sponsor, report or recommendation represented by the alert rather than a generic nearby page.
- `managementActionItems()` derives actions from live career state. `openManagementAction()` preserves the originating route in history, selects the relevant entity, renders a matching arrival banner and highlights the destination through `data-management-target-id`. Opening an alert never clears it by itself; the underlying condition must actually be resolved.
- Starting-five order, formation/roles/team tactics and training programmes are staged in memory. Their persistent career values change only after the matching **Save Changes** action. **Remove Changes** restores the persisted state, and navigating away with pending changes opens a discard/continue guard. Loadouts autosave from Build 11.86 and are outside this draft system.
- Incoming/outgoing contract negotiations retain their existing staged offer/accept/complete lifecycle. Build 11.78 adds safety copy but does not bypass transfer-window, finance, promise, contract or settlement rules.
- `clubEndDayBlockers()` remains the only continuation gate. The Operations overview groups every unresolved item by category, explains why it blocks the calendar and exposes one exact action per issue. The list rerenders immediately after a genuine resolution; Must Respond remains hidden outside Operations.
- Preserve `workflowIntegrityForTest()`, `managementActionsForTest()`, `openManagementActionForTest()`, `workflowSaveForTest()` and `workflowDiscardForTest()`. Required release checks include exact stat/mail/transfer/sponsor routing, target banners, non-clearing navigation, draft persistence boundaries, navigation guards, Operations-only grouped blockers, one fixed End Day control, no overflow at 320/375/390/430 portrait widths and representative mobile landscape, plus portrait/landscape diagnostic segmentation.
- Build 11.78 retains career save schema 17 and diagnostics schema 1. No match balance, AI, finances, rewards, damage, difficulty or progression rates are changed.

## Build 11.76 progression-safety and End Day UX contract

- Player stat notifications must open the first contracted player who actually has an unspent personal stat point. They must not route into or auto-scroll to an unrelated manager training recommendation.
- Personal stat allocation is staged in the in-memory `playerStatAllocationDrafts` map. `+` and `−` only alter the draft; persistent stats, current ability, value, transfer interest and `unspentPoints` change only after **Save Changes**. Unsaved changes may be fully removed and never enter save schema 17.
- The contracted-player attribute card owns `renderPlayerStatPointBanner()`, draft-aware `renderTeamAttributeRows()` and `renderPlayerStatAllocationActions()`. A visible **Stat Point Available** banner must explain that allocations are reversible until saved.
- There is exactly one player-facing End Day control in Command HQ: `#menuEndDayBtn` in the fixed top-right profile slot. The former date panel and every inline End Day button are removed; Calendar remains available from its white topbar icon.
- A blocked End Day click remains actionable. It routes to the Operations overview (`play`), scrolls its content to the top and shows the single red `club-must-respond-strip` there. That strip must not be injected on Team, Armoury, Supplies, Club or contextual pages.
- Preserve `playerStatDraftForTest()`, `savePlayerStatDraftForTest()`, `mustRespondPlacementForTest()` and the updated `calendarHeaderForTest()`. Required release checks include reversible unsaved allocation, explicit save persistence, direct notification-to-player routing, one End Day DOM control, Operations-only blocker placement, blocked-click redirection, 44-pixel touch targets and no overflow at 320/375/390/430 portrait widths.
- Build 11.76 retains career save schema 17 and diagnostics schema 1. It does not change match balance, AI, finances, rewards, weapon damage or opponent difficulty.

## Build 11.75 performance, navigation and match-clarity contract

- The decorative **You are here** locator strip has been removed from Command HQ to recover vertical screen space. `#menuRouteLocator` is no longer emitted by `index.html`; persistent section subnavigation remains the authoritative in-section navigation and moves to the top of the management viewport (`0px`, or `44px` in pause context). Do not recreate a duplicate breadcrumb/overview control.
- Match start applies the real match layout and portrait DPR cap before `createMatch()` starts diagnostics. `completeMatchmaking()` must call `setAppState('match')` and `stabiliseMatchRenderViewport()` before the round is created so the first diagnostic display does not inherit a Command HQ-sized canvas. Preserve the immediate, two-frame and delayed resize passes.
- Full A* route planning is budgeted per rendered update frame through `beginNavigationPlanningFrame()` and `consumeNavigationPlanSlot()`. Normal work is capped at two plans and urgent combat/search work at three; deferred operators use collision-tested local bridging and retry on a short stagger. Stable paths receive a short hold window so small moving-goal changes do not trigger avoidable replans.
- Diagnostics schema 1 now includes optional navigation-planner counters (`navigationPlansExecuted`, `navigationPlanDeferrals`, `navigationPathHoldReuses`) so performance comparisons can verify that bursts were staggered without changing simulation outcomes.
- Office door opening is logged exactly once per door per round. `openingEventRecorded` is separate from `openingSoundPlayed`; a persistent-open door must not duplicate either the diagnostic event or sound on consecutive update frames.
- Tactics and deployment show a visible weapon-range compatibility warning when Long Range is selected for an all/mostly short-range starting five, or when Close Range wastes a predominantly long-range lineup. The warning is explanatory only and must not mutate tactics, equipment or combat values.
- Preserve `navigationPlannerForTest()`, `rangeCompatibilityForTest()`, `matchViewportForTest()`, `doorInteractionForTest()` and `navigationDiscoverabilityForTest()`. Required release checks include the same-popup/route regressions from prior builds, one-event door opening, visible Tactics and deployment warnings, DPR `<= 1.35` in portrait-windowed matches, no locator DOM, no overflow at 320/375/390/430 portrait widths, and unrelated league/crate/Office/headshot/state-integrity tests.
- Build 11.75 retains career save schema 17 and diagnostics schema 1. No finances, rewards, weapon damage, opponent difficulty or career progression values are changed by this pass.

## Build 11.74 mobile-navigation and discoverability contract

- The five primary Command HQ sections remain **Operations**, **Team**, **Armoury**, **Supplies** and **Club**. Their primary buttons now open stable section overviews: `play`, `team-hub`, `armoury-hub`, `supplies-hub` and `club-hub`. `menuSections` remains the single navigation authority; do not maintain a second manual route tree.
- Every management page shows a compact **You are here** locator and a persistent section subnavigation row. The locator's section control returns to that section's overview. Major destinations must remain reachable in no more than two taps from a primary section.
- `profile` and `player-telemetry` are context-only routes. They remain valid in route history and player-context controls, but are hidden from ordinary section tabs and the top-level Command Index unless currently active. Do not promote them into duplicate generic destinations.
- The Command Index is generated from `menuSections` and exposes searchable top-level destinations, recommended next actions, recent routes, status text, notification badges and clear locked/context explanations. Search must filter the existing generated route cards rather than create another route source.
- Primary and route badges may summarise unread mail, due calendar activity, recruitment/transfer actions, injuries, development points/recommendations, free weapon copies, pending crates and fresh reports. Badges are presentation-only and must not mutate career state except that intentionally opening Reports may mark the latest report reviewed.
- Preserve `commandIndexForTest()`, `navigationDiscoverabilityForTest()` and `commandIndexSearchForTest(query)`. Release checks require 24 authoritative routes, 22 top-level discoverable routes, five overview routes, context-only route behaviour, functional search/recent/recommendation surfaces, Back/Forward history, 44-pixel primary targets and no document overflow at 320/375/390/430 portrait widths.
- Build 11.74 retains career save schema 17, diagnostics schema 1 and all Build 11.73 combat, header-history, club-identity, Supplies, Office, headshot, finance and performance behaviour. Run an unrelated league/crate/door/Office/state-integrity regression after navigation testing.


## Build 11.73 role-clarity, body-aware vision and header-navigation contract

- Match-role cards show a positive **Role Effectiveness** percentage, such as `97% ROLE EFFECTIVENESS`, plus a plain comparison with full performance. The explanation must state that this scales tactical decision-making and coordination, not weapon damage. Preserve `tacticalRoleExecutionMarkup()` and `roleExecutionCopyForTest()`.
- `Bot.canVisuallySee()` must account for the physical silhouette of every living operator between the viewer and an exposed enemy. Standing operators can fully obscure a directly aligned target; crouched bodies are less obstructive and partial shoulder peeks remain visible. This sight rule must not reveal hidden coordinates through diagnostics, navigation or shared AI knowledge.
- A friendly operator blocking a remembered sightline triggers a short, bounded lateral clearance move instead of firing, tracking through the body or remaining stacked. Preserve `firstOperatorOccludingView()`, `rememberViewOcclusion()`, `resolveFriendlyViewOcclusion()` and `operatorViewOcclusionForTest()`. Existing line-of-fire blocking remains authoritative at the moment of firing.
- Command-history Back and Forward controls live at the extreme left and right edges of the persistent manager topbar. The redundant main-menu history strip is removed, while pause-context route copy/actions remain available. Both controls retain 44-pixel-or-larger touch targets, accessible disabled labels and route-history behaviour at 320/375/390/430 portrait widths.
- Build 11.73 retains save schema 17, diagnostics schema 1, Supplies, club identity, Office presentation, headshot damage/feed behaviour, finance awards, Foundation Parity and adaptive performance logic. Required release checks include role-copy arithmetic, direct body occlusion, friendly clearance displacement, existing line-of-fire blocking, header geometry/history navigation, no-overflow mobile layouts and unrelated league/crate/state-integrity regressions.


## Build 11.72 club-identity, Supplies and Office-presentation contract

- Primary Command HQ navigation has five sections: **Operations**, **Team**, **Armoury**, **Supplies** and **Club**. The existing internal route ID remains `store` for save/event compatibility, but `menuSectionForRoute('store')` must return `supplies` and all player-facing copy must call the destination **Supply Depot** or **Supplies**.
- New clubs choose one of five authored team emblems and a six-digit hex colour. Persist this as optional `careerState.teamIdentity` inside save schema 17, normalise missing/invalid values to the Vanguard shield and cyan, and show the emblem beside the club name only where space permits. Preserve `teamIdentityForTest()` and migration of older saves.
- Skyline Offices wall screens must be shallow, wall-flush fixtures rather than free-standing black boxes. Their authored mount point must straddle a wall/open boundary without projecting into a walkable cell; preserve `officeWallDisplayAuditForTest()`.
- Headshot eliminations use a compact head/crosshair SVG in the kill feed, including critical headshots, while preserving the existing headshot/critical simulation and diagnostics.
- The Inbox, End Day, Calendar and Match topbar glyphs share the same white foreground. Supporting management text receives a modest legibility floor without changing card hierarchy, touch targets or causing overflow at 320/375/390/430 portrait widths.
- The Build 11.72 balance audit is observational: cash and Gold Coin award formulas, Foundation Parity, wage/loan obligations, weapon damage, AI and adaptive rendering are unchanged unless a deterministic regression is found. Validate league/exhibition win/loss awards, crate affordability, introductory opposition caps, 20-club/380-fixture integrity, diagnostics segmentation and state integrity before release.


## Build 11.71 match-performance diagnostics contract

- The existing local JSON diagnostic export now includes real render-loop performance measurements for every active match. Preserve diagnostics schema 1 and career save schema 17; the extra fields are optional additions and must not alter simulation, tactics, AI or persistence.
- `diagnosticRecordPerformanceFrame()` receives the actual requestAnimationFrame interval plus frame work, update and render costs. Frames outside the live match, hidden-tab frames and intervals above 250 ms are excluded from FPS averages but retained as an excluded-frame count so app switching does not masquerade as in-match lag.
- Reports include overall average/minimum FPS, average/max frame interval and work cost, update/render averages, counts above 22/34/50/100 ms, resolution-scale transitions, viewport/visual-viewport dimensions, native/effective DPR, canvas buffer size, browser/device capability metadata and the 12 worst active frames.
- Performance is segmented by both orientation and view mode. A match tested in portrait and then landscape must retain separate `portrait:windowed`, `landscape:maximized` or other encountered segments, plus orientation/view-mode transition counts. If only one orientation is used, only that segment is emitted.
- Every rolling match snapshot includes the current orientation, view mode, viewport, renderer scale/buffer and latest frame timing. Preserve the existing 90-second/360-snapshot and 1,800-event caps.
- Preserve `performanceDiagnosticsForTest()` and `diagnosticsPerformanceFrameForTest()`. Required checks include mixed portrait/landscape segmentation, excluded hidden/over-250-ms intervals, worst-frame bounding, parseable source/standalone exports and unrelated headshot, adaptive-resolution, door, league and state-integrity regressions.
- Build 11.71 retains all Build 11.70 headshot, opening-balance and portrait-rendering behaviour unchanged.


## Build 11.70 headshot, opening-balance and portrait-performance contract

- A landed shot may independently roll a headshot and a critical hit. `headshotCombatProfile()` derives headshot chance from Marksmanship, weapon accuracy, range pressure, recoil and crouched stability; `rollHeadshot()` must not replace or bypass `rollCriticalHit()`. Damage order is base damage × weapon headshot multiplier × critical multiplier, so a headshot can also crit.
- Every authoritative combat weapon declares `headshotMultiplier`. `CAREER_WEAPON_CATALOG`, `CAREER_NPC_WEAPON_CATALOG`, `careerWeaponPresentation()` and the live bot weapon are the shared source. Headshots must appear in tracers, floating damage labels, elimination feed, player match/career records, diagnostics and debug snapshots without changing save schema 17 or diagnostics schema 1.
- Opening league balance applies only to a created club's first three Division 3 league fixtures. `leagueFoundationBalanceProfile()` may lower an over-strength opponent to a progressive cap of starting-five average +1 on matchday 1, +2 on matchday 2 and +3 on matchday 3, bounded to rating 16–30. It never raises a weak opponent, never affects exhibitions or later fixtures, and its active/natural state is visible in final deployment.
- Portrait windowed matches cap render DPR at 1.35, maximised matches at 1.55 and other views at 1.65. `updateAdaptiveRenderResolution()` changes quality only after sustained pressure/recovery and performs one drawing-buffer resize per tier change; never resize the WebGL buffer every animation frame. Portrait match chrome avoids expensive backdrop filtering.
- Preserve `headshotProfileForTest()`, `combinedHitDamageForTest()`, `foundationBalanceForTest()`, `portraitPerformanceForTest()` and `adaptiveResolutionForTest()`. Required checks include independent headshot/critical rolls, combined multiplier arithmetic, both-team tracking, introductory opponent cap/no-cap cases, 320/375/390/430 portrait canvas geometry, sustained quality reduction/recovery and unrelated combat/league/state regressions.
- Build 11.70 retains the Build 11.69 recruitment/Office presentation, Build 11.68 doors/Training viewport, shared crate, 20-club league, career save schema 17 and diagnostics schema 1.


## Build 11.69 recruitment-flow and Office presentation contract

- Incoming recruitment decisions reuse the already-open shared `#teamNoteOverlay`. After `submitIncomingTransferOffer()`, a counter-offer must replace the active popup contents immediately with **Back to Negotiation** and **Accept Counter-offer** actions; accepting must replace the same popup with **Back to Negotiation** and **Complete Signing**; completing must replace it with a signed-success state and **Close/View Squad** actions. Do not introduce an extra confirmation popup between these stages.
- `handleTransferModalAction()` and `acceptIncomingTransferCounter()` own the in-place decision flow. Preserve the enhanced package from `js/39-recruitment-commercial.js`, including fee, wage, contract length, signing bonus, appearance bonus and promised squad status. Returning to negotiation closes the modal and restores the Transfers route without withdrawing the deal.
- Recruitment index cards must show current-ability and potential star rows for every candidate. Before scouting knowledge reaches the confirmed threshold, derive the stars from the displayed estimate rather than exposing hidden exact ratings. Preserve `recruitmentIndexRatingsForTest()` and require two `.scouting-stars` rows per candidate.
- `#managerDatePanel` remains the 44-pixel-or-larger Calendar shortcut with the larger zero-padded date and metadata, but it has no enclosing pill, filled card, rounded capsule, border or box shadow. Retain keyboard focus feedback and no-overflow behaviour at 320/375/390/430 portrait widths.
- The Skyline Offices conference table must remain outside the primary row-18 east/west transit band. `officeWalkwayAuditForTest()` is the release gate for table clearance, direct prop clearance and a reachable route. Office flooring is a dark, high-roughness carpet-tile treatment with alternating bands and subtle weave; courtyard paving and authored rugs remain separate overlays.
- Build 11.69 retains career save schema 17, diagnostics schema 1, all Build 11.68 persistent-door/Training-viewport behaviour, the shared crate, 20-club league, currency separation and existing transfer persistence.


## Build 11.68 office-door and post-match Training contract

- Every authored Office doorway must remain centred in an empty map opening with wall cells on both frame sides. `doorPlacementAuditForTest('office')` is the release gate; do not move doors into free-standing floor positions or detach their rendered jambs from the surrounding wall. Keep nearby desks and workstation pods outside the open-panel travel corridor so `doorInteractionForTest()` reports navigation and open clearance for all eight doors.
- `ACTIVE_DOOR_STATES` is the one authority for collision, line of sight, minimap and rendering. Doors start closed each round, open when a living operator enters the sensor radius, play exactly one generated `doorOpen` cue and then remain latched open until the next round reset. They must never close behind an operator during the same round.
- Office door rendering in `js/61-world-renderer.js` includes wall-tie jambs, lintel, threshold, stronger frosted panels and safety trim so the openings remain readable at phone resolution. Preserve shared state rather than adding decorative doors that do not collide or animate.
- The post-match manager-feedback action must not focus the Training `<select>` or use page-level `scrollIntoView()` on portrait mobile. Scroll only `.menu-content`, close/blur the modal before routing, and use `stabiliseMenuViewportAfterRoute()` plus `--strike-visual-viewport-height` to keep Command HQ full-height after iOS visual-viewport changes.
- Preserve `doorInteractionForTest()`, `doorPlacementAuditForTest()` and `managerTrainingTransitionForTest()`. Required checks include eight Office doors attached to walls, closed/open collision, one sound event, latched-open behaviour after the area clears, modal cleanup, no focused select, full viewport coverage and no bottom gap at 320/375/390/430 portrait widths.
- Build 11.68 retains the Build 11.67 crate/header contract, career save schema 17, diagnostics schema 1, reward odds/costs and every Build 11.66 finance/navigation behaviour.


## Build 11.67 attached-crate and Command HQ header contract

- The shared Field Crate lid, lid trim and animated support hardware must remain physically attached while the player drags the crate through any yaw angle and throughout the open/reveal timeline. In `js/64-reward-renderer.js`, rotate the rear body-local hinge pivot by the root crate yaw before applying local lid or rail pitch; do not leave the pivot in unrotated world space.
- `rewardCrateLidPose()`, `rewardCrateRailPose()` and `rewardCrateAttachmentAudit()` are the authoritative hierarchy helpers. Preserve `window.__strikeDebug.crateAttachmentForTest(yaw, openingProgress)` and require a negligible recovered hinge gap across multiple positive/negative yaw values and progress values from 0 to 1.
- `#careerCrateCanvas` remains the one shared WebGL crate for Store preview and opening overlay. This polish must not create a second model, change `CAREER_CRATE_REWARDS`, alter the 60-GC cost, change reward settlement or advance the save schema.
- `#managerGoldBtn` remains a 44-pixel-or-larger actionable Gold account shortcut but is visually integrated into the topbar: no enclosing gold pill, rounded capsule or heavy framed card. Keep the coin glyph, balance, accessible label, focus state and `gold` route.
- `#managerDatePanel` remains the top-right Calendar shortcut and now gives the date greater visual priority. Render `DD MON YYYY` with a zero-padded day, larger primary type and readable weekday/week/season metadata while preserving the `calendar` route, safe-area behaviour and no-overflow fit at 320/375/390/430 portrait widths.
- Build 11.67 retains career save schema 17, diagnostics schema 1 and every Build 11.66 Command Index, currency-ledger and finance-analytics behaviour. Required release checks include deterministic crate-hinge audits, shared-canvas identity, header target sizes and no-overflow geometry, route listeners, syntax/build parity and an unrelated league/combat/management regression pass.


## Build 11.66 navigation, currency-account and finance-analytics contract

- The Gold Coin header is an actionable account shortcut. `#managerGoldBtn` must route to `gold`, expose the current balance accessibly, retain a minimum 44-pixel mobile target and never deduct or display ordinary club cash as Gold Coins.
- `gold` is a dedicated Club route owned by `renderGoldCoinOverviewTab()`. It explains league/exhibition award sources, exact example payouts, Store outgoings, current crate progress, recent income/spend movement and the retained Gold Coin ledger. The Store remains a separate purchase route and continues to use the shared 3D crate.
- The top-right date is a compact calendar shortcut. `#managerDatePanel` shows `DD MON YYYY` with weekday, week and season beneath it, routes directly to `calendar`, retains a minimum 44-pixel touch target, and must remain readable without clipping at 320/375/390/430 portrait widths.
- The Command Centre contains a generated Command Index derived from `menuSections`; it must expose every available route with its purpose and relevant status rather than maintaining a second hard-coded feature list. Cash and Gold Coin values in the Command Centre are direct links to their account pages.
- Club Finances now includes retained-window analytics: income, outgoings, net flow, weekly cashflow bars, a running-balance line, income categories, outgoing categories, loan information and an 80-entry cash ledger. Gold Coin and cash history are separate. Rendering analytics must never mutate finances.
- `teamFinanceTransaction()` records id, week, absolute day, type, amount and label. New clubs record the Northstar Bank opening advance as a `FOUNDATION` income entry. Save schema 17 retains up to 80 cash and 80 Gold Coin transactions and migrates schema-16 and older histories safely.
- Preserve `setMenuRouteForTest()`, `financeAnalyticsForTest()`, `commandIndexForTest()`, `currencyLedgerForTest()`, `addFinanceTransactionForTest()` and `addGoldCoinTransactionForTest()` for release validation. Required checks include header routing, date formatting, Command Index coverage, both account cross-links, charts with positive/negative data, no document overflow at primary portrait widths, deterministic build parity and all prior arena/weapon/store regressions.


## Build 11.65 shared-crate, counted-arsenal and full-season contract

- The Store does not own a separate chest illustration. `#careerCrateCanvas` is the single shared WebGL crate canvas and `syncCareerCrateCanvasHost()` moves that exact renderer between the Gold Coin Store preview and the post-match/store-opening overlay. Future crate surfaces must reuse the same model, materials, animation and claim path rather than introducing SVG/CSS substitutes.
- Dropped weapons are counted inventory copies. Repeated weapon rewards add another copy and never convert to XP. Each finite copy may be issued to one operator; when every owned copy is issued, equipping that model to another player transfers one existing copy and gives the previous holder a legal fallback. Scrapline remains unlimited standard issue. Duplicate cosmetic finishes alone convert to Team XP.
- The Armoury must show model count, owned copies, issued copies and free copies, and all affected player rows must update immediately after a transfer. Save schema 16 preserves repeated inventory IDs and normalises assignments so they never exceed the owned count. Schema-15 and older careers migrate without losing weapons, skins, pending crates, squads or league progress.
- `CAREER_WEAPON_CATALOG`, `careerWeaponVisualParts()` and the shared first-person/world/reward renderers are the only authorities for owned weapon identity and geometry. The AR-4 Sentinel is a low-per-shot-damage, controlled mid-range rifle with a 20-round magazine, slower handling/reload than a pistol, a `carbine` reload-audio profile and the same 34-part model in the Armoury, crate reveal, first-person view, live operator hands and corpses.
- `CAREER_CRATE_REWARDS` is now P12 Service 32%, Viper-9 32%, AR-4 Sentinel 14% and Urban Grid 22%. Store and victory crates use that exact pool. The existing 60-GC price remains unchanged.
- Every division contains 20 clubs and uses a 38-match home-and-away double round robin: 380 total fixtures, 38 user fixtures, 38 matchdays and two reversed-home fixtures for every unordered club pair. Promotion remains top two and relegation bottom two where another tier exists. Legacy seven-match league data is migrated into the expanded schedule while preserving completed results where possible.
- Required release checks include shared-canvas identity in Store and overlay, absence of the retired store SVG/CSS chest, repeated weapon acquisition, one-copy transfer, two-copy simultaneous assignment, assignment-count integrity, AR-4 catalogue/drop/reload/model coverage, 20-club/380-fixture pair auditing, 38-match UI copy, schema-15 migration, mobile Armoury fit, deterministic build parity and unrelated combat regressions.

## Build 11.63 dynamic-arena, door, spectator and cash-economy contract

### Build 11.63 addendum

- Each arena owns a set of five or more valid `engagementPlans`. `selectRoundEngagementPlan()` uses a shuffled per-arena rotation bag, so every plan is used once before the bag repeats and the same plan is never selected for two consecutive rounds. Both teams receive separate, reachable five-operator opening objectives; combat evidence may override those objectives normally.
- `engagementPlanAuditForTest()` and `engagementRotationAuditForTest()` are release gates. Every objective must be clear of static collision, reachable from its matching spawn and represented in a complete no-immediate-repeat rotation. Do not solve recurring central fights by teleporting operators, fabricating enemy knowledge or bypassing A* navigation.
- Doors are real dynamic geometry. `LEVEL_PROP_LAYOUT.doors`, `ACTIVE_DOOR_STATES`, `updateDynamicDoors()`, `dynamicDoorColliders()` and the renderer/minimap share one state. Closed panels block movement, line of sight and shots; the navigation graph deliberately plans through doorways so proximity can open them. Doors must remain open for an occupant, close after the area clears and never crush or trap an operator.
- Skyline Offices retains the courtyard and now includes more complex workstations, lockers, low storage, vending/kitchen equipment, seating and wall-backed information displays. Wall screens must pass `officeScreenAuditForTest()` and must never float in open space. Decorative complexity must not block spawn-to-spawn routes or engagement-plan objectives.
- A dead owned operator remains on camera for two seconds, then `updateSpectatorDeathHandoff()` selects the next living owned operator even when automatic spectator cycling is disabled. Manual selection, round transitions and match completion reset this timer.
- Match settlement pays a modest defeat participation award, but total losing income must remain substantially below victory income. The post-match report shows base income and result reward separately. Build 11.63 introduced a top-left club-balance display. Build 11.64 supersedes only that header value with Gold Coins; ordinary cash remains authoritative in Finance, transfer, recruitment and other club-cost views.
- Build 11.63 did not change save schema 14 or diagnostic schema 1. Build 11.64 subsequently advances the career save to schema 15 while retaining schema-14 migration compatibility. Diagnostics still add the selected engagement plan and live door states. Required acceptance includes both arena plan/route audits, full rotation cycles, dynamic-door open/hold/close behaviour, office-screen backing, live opening-objective assignment, exact two-second spectator handoff, positive-but-lower defeat income, balance-header responsiveness, both-map minimap/diagnostics, prior combat-deadlock/crouch recovery, reload audio, deployment, Training-route and portrait/landscape regressions.


## Build 11.64 Gold Coin economy and loot-shop contract

- Gold Coins (`goldCoins`) are a dedicated store currency and are not interchangeable with ordinary club credits. Transfer fees, wages, staff costs, loan repayments and sponsorship continue to use credits only.
- Every completed first-to-three match awards Gold Coins alongside normal cash income. League matches pay 3 participation coins, 1 coin per round won, 7 for victory and 2 for a clean sweep; exhibitions use 2 participation, 1 per round won, 5 for victory and 1 for a sweep. Defeats always earn less than victories but never zero.
- The active Field Crate costs 60 Gold Coins. This price is intended to require roughly four to six league victories for an additional purchased crate, while losses contribute more slowly. Victory crates remain free and unchanged.
- Store purchases use the exact same `CAREER_CRATE_REWARDS`, animation, three-dimensional renderer, duplicate conversion and claim logic as post-match victory crates. Do not create a separate store-only loot table or duplicate reward implementation.
- A purchased crate and its rolled reward are persisted in `pendingStoreCrate` before the overlay opens, so refreshing or leaving the page cannot consume coins without preserving the purchase. Claiming clears the pending purchase and returns to the Store.
- Save schema was 15 in Build 11.64. Build 11.65 advances to schema 16; existing schema-15 and schema-14 careers migrate with zero Gold Coins and no pending purchase; all ordinary credits, squads, weapons, skins, league data and diagnostics remain intact.
- The Command HQ top-left identity shows Gold Coins with the coin icon. Ordinary cash remains visible in Finances, recruitment, transfers and other relevant management screens.
- Required acceptance includes deterministic win/loss/sweep calculations, lower defeat awards, cash and Gold Coin settlement in the same report, insufficient-funds protection, single deduction per purchase, persisted pending crates, exact shared loot odds, duplicate conversion, Store return routing, responsive header/store layouts and save migration.

## Build 11.62 weapon-reload-audio contract

### Build 11.62 addendum

- Reload audio is a phased sequence tied to the authoritative `reloadProgress` timeline: magazine release, magazine removal, magazine insertion, magazine seating and slide/bolt rack. Do not revert to a single generic sound at reload start or completion.
- Every weapon definition that can enter live combat must declare a supported `reloadAudioProfile`. This includes `CAREER_WEAPON_CATALOG`, `CAREER_NPC_WEAPON_CATALOG`, generic fallback primaries and the fallback sidearm.
- Adding a future weapon is incomplete until its reload-audio profile is defined, its cue buffers can be generated, and the reload sequence is checked alongside its shared reload animation. Silent future weapons are a release-blocking regression.
- `CAREER_WEAPON_CATALOG` remains authoritative for owned weapons. Reload audio metadata must travel with the same weapon object used by loadouts, AI, first-person/world rendering and diagnostics; renderer-only or audio-only duplicate weapon identities are not permitted.
- Reload cues are cosmetic and spatial. They must respect deliberate mute state, iOS audio recovery, occlusion, distance falloff, the currently spectated operator and portrait/landscape transitions without changing AI hearing or exposing hidden information.
- Required acceptance includes full five-cue progression for each existing profile, catalogue coverage validation, spectated/self audibility, remote falloff, mute suppression, audio-context recovery, unchanged reload durations/stats, deterministic build parity and ZIP integrity.

## Build 11.61 movement-and-combat-animation contract

### Build 11.61 addendum

- AI decisions, collision, line of sight and damage remain authoritative. `renderMoveAngle`, `renderAimAngle`, `visualMoveVelocity`, directional blends and weapon-readiness blends are presentation state; they must never grant visibility, alter hit tests or bypass navigation.
- `Bot.stepMove()` may smooth acceleration and deceleration through bounded `locomotionSpeed`, but route completion, traffic yielding, combat-deadlock recovery and round progress must remain functional on both arenas. Operators clear corners deliberately and cross open ground with a modest committed-speed bias rather than receiving hidden teleports or stat bonuses.
- Crouch decisions use minimum posture durations and a smoothed `crouchBlend`. Do not reintroduce frame-to-frame crouch toggling. Out-of-range crouch-break and stationary-crouch recovery from Builds 11.55–11.56 remain mandatory.
- `careerWeaponReloadPhases()` in `js/35-career.js` is the shared reload-animation authority for first-person and world-held weapons. Magazine release/insertion, slide lock/rack and weapon lowering must use the same phase values and the existing `CAREER_WEAPON_CATALOG`; renderer-only weapon stats or disconnected magazine components are not permitted.
- Third-person operators use smoothed body/aim separation, forward/strafe/backpedal blends, shoulder bias, corner weapon readiness, phased hit reactions and an initial death stagger before falling. First-person presentation uses the same movement intent plus a damped recoil spring, directional bob, hit flinch and shared reload phases. These are visual changes only: do not silently rebalance damage, cadence, range, capacity, reload duration, critical modifiers or save data.
- Diagnostics schema remains 1. The current career save is schema 19, retaining schema-18, schema-17, schema-16, schema-15 and schema-14 migration compatibility. Diagnostic snapshots may include the new presentation fields, and debug combat scenarios must snapshot/restore them so tests do not leak animation state. Preserve Build 11.60 landscape/minimap controls and Build 11.59 route/viewport fixes.
- Required acceptance includes acceleration/deceleration convergence, finite/capped angle lag, crouch posture stability, shared reload-phase progression, connected magazine/slide animation, hit/death phase checks, both-map live-match progress, repeated deadlock/out-of-range-crouch regressions, mobile portrait/landscape UI checks, deterministic build parity and ZIP integrity.


## Build 11.60 landscape-minimap-and-rotation-gate contract

### Build 11.60 addendum

- The live tactical minimap remains owned by `js/32-tactical-minimap.js`, but its existing compact map button and diagnostic neighbour must also be visible in mobile landscape/maximised match view. Do not create a second minimap implementation or a landscape-only state.
- In maximised landscape, the diagnostic and minimap controls form a compact pair beside the portrait-return control, respect safe-area insets and remain hidden in Command HQ or while the scoreboard is open. The same panel, mutual-exclusion rules, `M` key and close button continue to work on both Citadel Depot and Skyline Offices.
- Requesting full/landscape view while the physical viewport is still portrait must not rotate the live match in-page. Show `#landscapeRotationGate` as an opaque blank-screen prompt telling the player to rotate the phone. Its button must call the normal portrait restore flow.
- `syncViewMode()` is the authority for `data-orientation-gate`, gate visibility and restore-button visibility. The gate appears only when `fullViewRequested`, `appState === 'match'` and the physical viewport is portrait; it disappears automatically after a real orientation change or when returning to portrait mode.
- Opening the rotation gate closes any live diagnostic/minimap overlay so hidden controls cannot remain logically active. Preserve iOS audio recovery, fullscreen/orientation-lock attempts, Build 11.59 viewport fixes, save schema 14, diagnostics schema 1 and all existing match behaviour.
- Required acceptance includes portrait request/gate/back-button behaviour at 320/375/390/430 widths, automatic gate removal at mobile-landscape viewports, visible non-overlapping diagnostic/minimap/portrait-return controls in landscape, both-map minimap marker rendering, scoreboard/menu hiding and an unrelated training-route/deployment/deadlock regression.

## Build 11.59 post-report training-route contract

### Build 11.59 addendum

- The manager-insight action from Team Telemetry and Starting Five debrief must assign the suggested programme and navigate directly to `training` without rendering the old telemetry/report route while the modal is still open.
- `setPlayerTrainingFocus()` accepts `{ render: false }` for compound navigation actions. The manager-feedback path saves once, closes the shared note modal without restoring focus to a removed trigger, blurs the modal control, renders Training and resets the menu scroller.
- On portrait mobile, `#app` and `.menu-shell` must use their existing fixed/absolute insets as the viewport authority. Do not reintroduce explicit `100dvh` height/max-height constraints that can become stale after an iOS modal/focus transition and expose the black body background below Command HQ.
- `stabiliseMenuViewportAfterRoute()` performs immediate, double-animation-frame and delayed scroll/layout stabilisation. Resize, visual-viewport resize and orientation changes may invoke it only while Command HQ is open.
- Preserve training recommendation state, selected player, save schema 14, report comments, navigation history, Build 11.58 deployment/weapon presentation and all earlier diagnostics/minimap/deadlock behaviour.
- Required acceptance includes the exact post-match comment → manager insight → Assign Training transition at 320/375/390/430 portrait widths, app/shell bottom matching the live viewport, modal/body-lock cleanup, route=`training`, selected player/focus persistence, scrolling to the top, ordinary modal focus restoration and unrelated deployment/weapon/deadlock checks.

## Build 11.58 deployment-and-combat-presentation contract

### Build 11.58 addendum

- A newly prepared match opens `#deploymentSelection` before the timed matchmaking sequence. The player must be able to review the opponent, confirmed tactical plan, starting five, match roles, equipped weapons and a static top-down preview for every available arena, then make the final battleground choice with `#deploymentConfirmBtn`.
- Tactics stores the preferred/default arena. Changing the arena during final deployment must not invalidate an otherwise confirmed tactical plan, alter player roles or mutate the active world until deployment is confirmed. Intermediate rounds continue directly without reopening deployment.
- `drawDeploymentArenaPreview()` in `js/32-tactical-minimap.js` draws map cards from `ARENA_LIBRARY` without calling `setActiveArena()` or changing live AI state. Deployment cancellation must cleanly restore Command HQ and cancel any prepared fixture context.
- `CAREER_WEAPON_CATALOG` in `js/35-career.js` remains the single weapon authority. Gameplay stats, `careerWeaponVisualParts()`, `viewmodelPose`, `muzzleProfile` and the derived `careerWeaponPresentation()` must flow consistently into Armoury/loadout UI, deployment and matchmaking summaries, world-held weapons, first-person rendering, diagnostics and reward views. Do not create renderer-only weapon identities.
- First-person sidearms articulate the shared magazine and magazine base together, visibly release/insert the magazine, lock/rack the slide when appropriate, retain rigid connected geometry during recoil, and use each weapon's shared flash/smoke/case profile. These are presentation changes only and must not silently alter damage, cadence, range, magazine capacity, reload duration, critical modifiers or AI weapon use.
- Preserve current save schema 19, schema-18/schema-17/schema-16/schema-15/schema-14 migration compatibility, diagnostics schema 1, Build 11.57 minimap/courtyard behaviour and Build 11.56 deadlock recovery. Required checks include both-map deployment cards, five starting-five rows, final arena persistence, 320/375/390/430 portrait fit, all three weapon presentation profiles, reload phase progression, Armoury consistency, deterministic build parity and an unrelated management/combat regression.

## Build 11.57 office-courtyard-and-minimap contract

### Build 11.57 addendum

- `js/32-tactical-minimap.js` is the sole authority for the live top-down tactical map. It is observational UI only: it may read `MAP`, `LEVEL_ZONES`, `LEVEL_PROP_COLLIDERS`, arena decor and live bot state, but it must never alter AI visibility, paths, targeting, damage, movement or save data.
- `#minimapToggleBtn` sits immediately to the right of the compact diagnostic export control during portrait windowed matches. It toggles `#tacticalMinimapPanel`; the panel must remain entirely inside the 16:9 match viewport at 320, 375, 390 and 430 CSS-pixel widths.
- The minimap is north-up and works from the active arena data for both Citadel Depot and Skyline Offices. It shows walls, collision props, zones, alive team/opposition markers, dead markers, viewed-operator focus and the viewed operator's facing cone. All opponents are intentionally visible because Strikewatch is a spectator-management game.
- Opening the minimap closes the live diagnostic overlay and opening diagnostics closes the minimap. The `M` key toggles the map and Escape closes it. Both controls hide in Command HQ and while the scoreboard is open.
- Skyline Offices now contains a central landscaped courtyard with a real ceiling opening/skylight treatment, paving, grass beds, fountain, benches, planters and additional office props. Major furniture and courtyard cover use the shared collision layout; decorative surfaces must not create misleading blocked paths.
- Preserve Build 11.56 combat-deadlock recovery, Build 11.55 diagnostic schema/retention, save schema 14 and all existing map-selection behaviour. Acceptance includes both-map minimap rendering, ten operator markers, courtyard batch/collision checks, mobile control geometry, diagnostics mutual exclusion, deterministic build parity and ZIP integrity.

## Build 11.56 combat-deadlock-recovery contract

### Build 11.56 addendum

- The uploaded Build 11.55 diagnostic case is a required regression fixture: two same-team attackers attempted the same direct lane while a short-range defender remained crouched outside effective range. Recovery must not repeatedly reissue the same blocked push.
- `Bot.forceCombatMobility()` now escalates stalled combat into a distinct A* approach route when a team-mate, world obstruction, repeated recovery or out-of-range hold prevents progress. The route must remain authoritative while the visible target moves only slightly or is briefly lost.
- Same-team attackers use deterministic combat right-of-way. The higher-priority operator receives the approach lane and the other selects a legal yield pocket; neither operator may reserve the same immediate approach point indefinitely.
- A combat recovery is counted as successful only after at least 0.58 units of actual displacement. Repeated recovery calls without displacement increase the recovery stage and must change route/side rather than reset the same push instruction.
- An outnumbered crouched operator may hold a valid in-range angle, but must break the posture and route to a new position when the visible opponent is outside weapon range and no shot, damage or translation progress occurs.
- Diagnostics remain observational but now expose `combatApproachGoal`, approach reason, blocker identity/type, recovery stage, blocked-movement time and verified recovery displacement. Preserve export schema 1, save schema 14 and hidden-information safety.
- Preserve `combatDeadlockRecoveryForTest()`, `diagnosticDeadlockReplayForTest()`, `outOfRangeCrouchBreakForTest()` and `combatRecoveryDisplacementForTest()` in addition to every retained Build 11.52/11.55 helper. Acceptance includes 20 repeated diagnostic replays, live diagnostic capacity, 320/375/390/430 control geometry, management/Calendar integrity, deterministic build parity and ZIP integrity.

## Build 11.55 local-match-diagnostics contract

### Build 11.55 addendum

- `js/31-match-diagnostics.js` is the authority for local diagnostic capture. It records bounded meaningful events, samples compact bot state four times per simulated second and retains only the latest 90 seconds of detailed snapshots. Diagnostic capture must never affect AI decisions, visibility, navigation costs, weapon damage or save schema 14.
- A diagnostic match begins in `createMatch()`, records every round boundary and is finalised before the normal career match report. The summary covers effective-range discipline, target/path/tactical changes, movement distance, stationary/crouched time, route zones, blocked operator shots and recovery events.
- Completed summaries are stored locally under `strikewatchDiagnosticSummariesV1`; detailed events and rolling snapshots remain in memory for export. No diagnostic data is uploaded automatically.
- `#diagnosticExportBtn` is a small portrait-windowed live-match control beside `#portraitAudioBtn`. A normal tap exports JSON; a 650 ms press toggles `#diagnosticOverlay`. The control and overlay hide in Command HQ and while the scoreboard is open.
- The export payload includes build/map/tactics/loadouts, retained events, the 90-second snapshot window and the end-of-match operator summary. It must be valid JSON and use a timestamped `strikewatch-diagnostics-*.json` filename.
- The normal After Action report includes a compact Local Match Diagnostics summary. Preserve the existing tactical analysis and reward flow.
- Regression acceptance includes 320/375/390/430 portrait control geometry, long-press overlay behaviour, a 90-second stress capture capped at 360 snapshots, completed-match summary generation, JSON download validation, development/inline syntax, state integrity and one unrelated Calendar/management check.

## Build 11.52 combat-navigation contract

### Build 11.52 addendum

- A visible target is no longer sticky. `Bot.updatePerception()` reevaluates visible opponents every simulation frame and must override a farther target when a nearer visible enemy is an immediate threat or physically blocks the line of fire.
- `firstOperatorInLineOfFire()` is authoritative for actor obstruction. A bot may not fire through a friendly or enemy operator to reach a farther target. A visible enemy blocker becomes the target; a friendly blocker triggers repositioning instead of repeated muzzle flashes.
- Visible engagements have a progress watchdog. If an operator neither fires, deals damage nor translates for the bounded threshold, the bot must uncrouch, release stale cover and commit to a push or lateral reposition.
- Crouching is a temporary posture, not a navigation state. `updateLocomotionStall()` releases a stationary crouch, refreshes the route and clears stale coordination/cover ownership after a sustained no-movement interval.
- Entry-role support waiting is a single short pause followed by a multi-second commitment window. Do not restore the old loop that repeatedly reset `coordinationWaitTimer` and froze entries in place.
- `navigationCellPenalty(cell, mover)` may use same-team occupancy and reserved waypoints as soft A* costs, but must ignore enemy locations so navigation never leaks unseen opponent coordinates.
- Preserve `closeThreatRetargetForTest()`, `operatorLineBlockerForTest()`, `combatStallRecoveryForTest()`, `crouchStallRecoveryForTest()`, `coordinationWaitCommitForTest()` and `navigationTrafficPenaltyForTest()`. Regression acceptance includes those deterministic checks, a 90-second live-match stress run, late-round search, state integrity, source/release parity and an unrelated management-route pass.

## Build 11.51 transfer-feedback and management-notice contract

### Build 11.51 addendum

- Incoming-transfer ability and potential scouting groups must remain on one horizontal row in portrait. Each star strip is itself horizontal; do not let generic `.scouting-stars` rules stack the stars vertically inside the negotiation card.
- Incoming and outgoing submitted offers record their last submitted package/amount and response inside the existing transfer objects. The UI must show persistent feedback after submission and open an explicit response notice so a tap never appears to have failed. Do not regress current save schema 19 or schema-17/schema-16/schema-15/schema-14 migration compatibility.
- `#portraitAudioBtn` is a compact portrait-windowed live-match control anchored bottom-left, opposite the bottom-right sponsor bug. `updateAudioButton()` owns both sound controls' state, labels and mute icon. It must hide in Command HQ and while the scoreboard is open.
- Management actions that fail because a prerequisite is missing should use the shared management-notice mode rather than relying only on a transient status line. Assistant selection without an employed assistant must remain clickable so it can explain the requirement and offer a direct Staff route.
- Preserve X, backdrop and Escape dismissal, route actions, transfer completion authority, sponsor placement and unrelated Inbox/Armoury behaviour. Regression acceptance includes 320/375/390/430 portrait transfer geometry, persistent offer feedback, assistant prerequisite notices, portrait sound/sponsor separation, save round-trip and state integrity.

## Build 11.50 Inbox-order and portrait-alignment contract

### Build 11.50 addendum

- Inbox rendering uses a newest-first derived view rather than trusting legacy array order. `clubMailNewestFirst()` sorts by the monotonic message sequence, then day, without mutating persisted mail data. `clubSelectedMail()` also falls back to the newest message.
- The shared mail popup uses a text-presentation envelope inside a dedicated icon box. The icon and close control must not overlap the kicker or subject at 320–430 CSS-pixel portrait widths.
- Portrait Armoury inventory uses full-width stacked cards rather than a partial-width horizontal carousel. Weapon, comparison and issued-state information must remain inside the panel without a trailing vertical seam or unused strip.
- Starting Five debrief headers and expandable notes use separate selectors. The debrief note is a vertical grid with readable label, quotation and manager insight; the profile-header flex rules must never apply to the note button.
- Preserve popup decisions, the four-row Inbox viewport, shared overlay close paths and save schema 14. Regression acceptance includes newest-first ordering, mail-header geometry, full-width Armoury cards, debrief non-overlap, all affected portrait widths and an unrelated Calendar/Recruitment plus state-integrity pass.

## Build 11.49 popup-Inbox and decision-mail contract

### Build 11.49 addendum

- Inbox rows open the shared popup system as the primary full-message reader. Opening a message marks it read, updates the selected mail state and preserves a valid focus-return target after the Inbox rerenders.
- Decision-linked emails must render every available `data-club-decision` / `data-club-choice` response inside the popup. Selecting a response applies the existing authoritative decision effect, refreshes the same popup into its resolved state and clears the End Day blocker.
- Ordinary and resolved emails use the same popup shell without decision choices. Popup actions may mark a message unread or open a non-mail related route; marking unread closes the popup so reopening the message predictably marks it read again.
- `#teamNoteActions` is the reusable popup action region. `openTeamNoteModal()` remains presentation-oriented and accepts escaped/generated action markup, mode, tone, glyph and return-focus options without adding save data.
- `js/39-club-operations.js` owns mail popup composition and `handleClubMailModalClick()`. `js/70-runtime.js` delegates popup-internal mail actions before normal backdrop dismissal. Do not regress current save schema 19 or schema-17/schema-16/schema-15/schema-14 migration compatibility.
- Regression acceptance includes ordinary email reading, unread-state updates, unresolved decision choice counts, popup resolution refresh, X/backdrop/Escape closing, four-row Inbox limits, Calendar/Recruitment regressions and state-integrity/source-release parity.

## Build 11.48 portrait-UX and debrief-presentation contract

### Build 11.48 addendum

- `#teamNoteOverlay` must be genuinely non-rendered while `hidden`; author CSS may never override the hidden state or allow the unopened dialog to intercept taps. Keep `.team-note-overlay[hidden] { display: none !important; }` as a release invariant.
- Expanded player reflections and Starting Five debrief notes use the shared presentation-only overlay, with tone-aware styling, correct source text, X/backdrop/Escape dismissal and focus restoration to the triggering card.
- Portrait management screens share improved section-heading, hero, pill, telemetry, fixture and debrief spacing at 320–430 CSS pixels. Preserve page-width containment and avoid solving density by introducing horizontal page scrolling.
- `seedStartingFiveDebriefForTest()` provides deterministic debug coverage for five post-match player notes without changing production save structure. Do not regress current save schema 19 or schema-17/schema-16/schema-15/schema-14 migration compatibility.
- Regression acceptance includes overlay hidden-state safety, all three close paths, source-content accuracy, five debrief cards, portrait history geometry, Armoury equipped-state presentation, route-width checks and unrelated Calendar/Recruitment plus state-integrity passes.

## Build 11.47 reflection-modal and portrait-polish contract

### Build 11.47 addendum

- Portrait Armoury inventory must not render a stray equipped-state blue guide line to the right of weapon cards. Preserve the equipped/current comparison cues without reintroducing the full-height vertical artefact.
- In portrait Command HQ history rails, the route title is visually centred and the Forward button sits on the far right. Do not revert to both history arrows grouped on the left in the mobile main-menu context.
- Post-match reflection cards and Starting Five debrief notes open into a readable overlay with a clear close control, backdrop dismissal and Escape-key support where a keyboard is available.
- Preserve the existing player-profile navigation, match-report rendering and Team route actions while adding the expand-on-tap behaviour.

## Build 11.45 guided-command and Armoury-navigation contract

### Build 11.45 addendum

- The first beginner-tutorial stage must explain that the opening 350,000 credits are borrowed, the agreement totals 400,000 credits and ten 40,000-credit instalments are collected every four weeks. The copy must come from the live loan state where practical so future balance changes cannot leave onboarding stale.
- While tutorial stage 1 is active, all four persistent manager shortcuts—Inbox, End Day, Calendar and Match—remain visible, carry ordered tutorial metadata 1–4 and receive a clear visual highlight without changing their normal actions or accessibility labels.
- Primary Command HQ navigation is exactly **Operations**, **Team**, **Armoury** and **Club**. `loadout` belongs to the dedicated Armoury section. Portrait phone layouts show four equal compact tabs without horizontal scrolling; landscape/roomier layouts keep the numbering visually secondary.
- `MENU_CONTEXT_TUTORIALS` in `js/50-ui-menus.js` owns the one-time Calendar, Tactics, Transfers, Training, Finances, Commercial and Armoury guides. They appear only after the main tutorial is completed or dismissed, and `careerState.tutorial.contextSeen` permanently records each dismissal.
- Save schema remains version 14. Normalisation must preserve valid `contextSeen` objects and safely replace malformed arrays or primitive values with an empty object.
- Preserve `makeDefaultCareerTutorialState()`, `completeTutorialForTest()`, `contextTutorialsForTest()` and `dismissContextTutorialForTest()`. Regression acceptance includes source/standalone parity, all five primary tabs and topbar shortcuts at 320/375/390/430 portrait plus 844 × 390 landscape, save persistence, menu history and an unrelated recruitment/state-integrity pass.

## Build 11.44 calendar-date and sponsor-polish contract

### Build 11.44 addendum

- The simulated career calendar uses a deterministic Gregorian-style date beginning on **Monday 3 August 2026**. `absoluteDay` remains the authoritative progression counter, while `clubDatePartsForAbsoluteDay()` and `clubAbsoluteDayForDate()` derive weekday, day-of-month, month and year without changing existing schedule arithmetic.
- The Calendar route is a true six-week month grid with previous/current/next-month controls, real month lengths and year rollover. It must not display unbounded labels such as `DAY 41`; use the simulated full date instead.
- Compact calendar entries must be descriptive at a glance: opponent/home-away context, player surname, financial amount, sponsor identity or required decision. The agenda retains the full explanation and route action.
- Sponsor round bumpers remain conditional on an active deal and non-final round, but the branded portion now lasts **5 seconds**. `roundRestartTimer` must use `sponsorRoundBumperTotalDuration()` so the next round cannot cut it short.
- In portrait windowed view, the sponsor logo and `PARTNERS OF`/brand text form one aligned two-column unit. Do not reintroduce the offset label/icon stack shown in Build 11.43.

## Build 11.43 sponsor-broadcast contract

### Build 11.43 addendum

- The persistent spectator sponsor bug must always retain its **PARTNERS OF** label in portrait and landscape when an active sponsor exists. Do not hide the label in the windowed portrait layout.
- `js/39-recruitment-commercial.js` owns the between-round sponsor bumper state and content. A bumper is scheduled only for non-final round transitions when `careerState.sponsorship.active` resolves to a known brand.
- The normal round result remains visible first, then the sponsor bumper briefly replaces it before the next round. The bumper must never delay or appear after match completion, must hide on round start/reset and must respect reduced-motion preferences.
- Preserve `sponsorRoundBumperForTest()`, scheduling/show/hide debug helpers and the existing sponsor HUD/Commercial behaviour.

## Build 11.42 calendar, finance and stability contract

### Build 11.42 addendum

- `js/39-calendar-finance.js` owns the full five-week Calendar route, foundation-loan repayments, contract-expiry notices and calendar event aggregation. It loads after recruitment/commercial so sponsor and scouting deadlines are available to the calendar.
- New clubs receive a **350,000-credit bank start-up loan**, not free cash. The loan is 400,000 credits repayable in ten 40,000-credit instalments every four weeks. Existing created saves without loan state migrate to the same terms with the first payment four weeks after migration.
- Calendar events include league fixtures, loan instalments/arrears, contract expiry, medical return estimates, scouting completion, sponsor deadlines/payments and transfer-offer expiry. Preserve `clubCalendarEvents()`, `clubCalendarTodayEventCount()`, `clubFinanceLoanState()` and the calendar/loan debug helpers.
- The Inbox list must expose exactly four message rows before vertical scrolling. The full reader remains available alongside/below it.
- Scoreboard rows from the player's own team open that player's individual telemetry, including eliminated players; opposition rows remain non-interactive.
- Audio recovery now uses touchstart/pointer gestures, context-state recovery, queued-event retry and a periodic watchdog. Preserve deliberate mute state. Elimination feed rendering must tolerate missing weapon metadata rather than crashing.
- Save schema is version `14`. Loan state, zero-week expired contracts and prior schema 13 tactical familiarity must survive normalisation.

## Build 11.41 unified-sidearm-geometry contract

### Build 11.41 addendum

- `js/35-career.js` remains the single source of truth for career sidearm geometry. Grip, grip-panel, magazine and new backstrap/baseplate corrections must be authored there so inventory, Armoury detail, crate rewards, world-held pistols and first-person pistols stay in sync.
- Sidearm grips must no longer cant unnaturally forward. Keep the rear grip geometry seated further back under the slide, keep the magazine aligned with that grip angle and preserve `careerWeaponVisualParts()`, `careerWeaponVisualPart()`, `careerWeaponVisualBounds()` and `careerWeaponPartFitOffset()` for downstream renderers and debug surfaces.
- Visual polish may be additive, but changes to shared weapon parts must not break mobile layouts, pointer-driven armoury inspection, reward-crate previews or the first-person reload/ejection pipeline that reuses the same parts.

## Build 11.40 command-header contract

### Build 11.40 addendum

- The Command HQ top-left identity block now shows the active team name and team level instead of the static Strikewatch / Command HQ label.
- The top-right header area is now reserved for a larger club-date card so the current day, week and season remain readable on phones, especially in portrait.

## Build 11.39 tactical-suitability contract

### Build 11.39 addendum

- The post-match reward crate renderer now keeps the lid visually attached to the body throughout the open animation by driving the lid, hinge spine and support rails from the same rear pivot.
- The Team Armoury now compares every selected or browsed weapon directly against the currently equipped weapon for the selected operator. Inventory tiles show a quick better / worse / sidegrade badge, while the detail panel shows an overall comparison card plus per-stat deltas.

- `js/39-matchday.js` owns tactical suitability, player role fit, tactical familiarity, opponent matchup interpretation and the player-facing explanation shown on the Tactics route.
- Plan Fit must combine the submitted starting five's attributes, readiness, equipped weapons, assigned match roles, familiarity with the selected formation/approach/range/priority and the active opponent style. It must not be a cosmetic score or a flat formation bonus.
- Individual role fit must compare real player attributes with the selected temporary match responsibility. Natural and secondary roles may receive a small bounded familiarity allowance, but assigning a role never rewrites the player's natural role.
- Tactical suitability may scale decision speed, movement/coordination execution and the strength of existing tactical instructions only. It must not grant hidden raw weapon damage, ignore injuries/fatigue or replace the normal attribute-and-weapon combat pipeline.
- Matchmaking captures the confirmed plan and its suitability snapshot. Live bots must use that captured snapshot so changing the menu after deployment cannot alter an active match.
- Tactical familiarity persists in save schema version `13`, improves through completed matches and is part of the plan score. Zero is a valid familiarity value and must not be replaced by truthy fallback logic. Save normalisation and `stateIntegrityForTest()` must keep every familiarity value within 0–100.
- The Tactics route must explain Plan Fit, Live Execution, all six components, role-level fit, the opponent read and what the modifier does and does not change. Alternative formation, approach, range and priority choices must display comparative fit badges before selection.
- Preserve `tacticalSuitabilityForTest()`, familiarity test helpers, match-role debug helpers and the live-bot execution fields exposed by `matchdayForTest()`.
- Responsive acceptance still covers all 18 Command HQ routes at 320, 375, 390, 430 and 844 × 390 without horizontal overflow, duplicate IDs, invalid placeholder text or undersized controls.

## Retained Build 11.36 recruitment and commercial contract

- `js/39-recruitment-commercial.js` is the authoritative extension layer for partial scouting knowledge, shortlists, recruitment assignments, transfer windows, rival market activity, enhanced contract packages, playing-time promises and sponsorship.
- Market players must not expose perfect information immediately. Ability, potential, attributes, personality, medical risk, fee and wage estimates become more precise as scouting knowledge rises. Contracted players remain fully known.
- The opening permanent-transfer window covers the first three completed league fixtures, closes after fixture three and reopens for the run-in after fixture six. Free agents remain negotiable while the permanent window is closed. Exhibition matches must not alter transfer-window progress.
- Rival clubs use their persistent `roster` arrays, not an invented `squad` property. AI purchases, bids, collapsed negotiations, listings and replacements must update both the market and rival rosters without duplicating player IDs.
- Incoming packages include fee, wage, contract length, signing bonus, appearance bonus and promised squad status. Promises are reviewed later and may reduce morale/happiness or trigger a transfer request when broken.
- `careerState.sponsorship` persists pending offers, one active deal and completed history. Five fictional brands provide different upfront, weekly, win and sweep payments. Better reputation, results and league tier must raise commercial score and offer quality.
- Pending sponsor proposals are mandatory decisions and block End Day. Accepting a deal pays the signing amount, schedules weekly payments and adds the brand logo to the bottom-right spectator-feed corner. Match bonuses settle only after a completed match.
- Build 11.36 introduced recruitment and sponsorship state in schema `12`; current schema `14` must preserve and migrate it. Preserve `recruitment()`, `sponsorship()`, shortlist/assignment helpers, sponsor test helpers and state-integrity coverage.
- Mobile acceptance covers all 18 Command HQ routes at 320, 375, 390, 430 and 844 × 390 with no page exceptions, duplicate IDs, bad placeholder values or horizontal overflow.

## Retained Build 11.35 Pro League tier contract

- Division tier `0` is the top tier and must always resolve to **Strikewatch Pro League / Pro League**. Never use truthy fallback expressions such as `Number(value) || 3` for division tiers because zero is a valid persisted value.
- `normaliseLeagueTier(value, fallback)` in `js/00-core.js` is the authoritative zero-safe tier parser for league, market and staff state.
- Save loading, current-division helpers, market generation, staff normalisation, competition labels and post-promotion season creation must all preserve tier `0`.
- `stateIntegrityForTest()` must reject a league name or staff-pool tier that does not match `careerState.league.divisionTier`. Preserve `leagueTierForTest()` and `setLeagueTierForTest()` for regression checks.
- The four-tier pyramid remains Division 3 → Division 2 → Division 1 → Pro League; the Pro League has no promotion places and retains bottom-two relegation.

## Retained Build 11.34 stability contract

- Build metadata in `index.html`, `js/00-core.js`, `build.py`, generated bundles and documentation must identify the same release. A source deployment may not retain an older title or build stamp.
- Fresh-career copy must match the authoritative 350,000-credit bank start-up loan and 32,000-credit combined wage budget.
- A scheduled league fixture takes priority on matchday. `prepareCareerMatchContext('exhibition')` must reject an exhibition while that fixture is due; exhibitions remain available on clear non-matchdays.
- Save normalisation derives the weekday from the absolute career day, repairs duplicate squad identifiers, repairs copy-counted weapon assignments so finite assignments never exceed repeated inventory counts and clamps persistent career totals to non-negative finite integers.
- `window.__strikeDebug.stateIntegrityForTest()` is the baseline live-state audit, while `normaliseStateForTest(raw)` verifies non-mutating save repair. It must report no duplicate squad/mail/decision/fixture IDs, invalid loadouts, broken decision-mail links, unknown tactics, malformed transfer selections or invalid league scheduling in an ordinary career.
- Menu-route buttons, selects and inputs must retain at least 44 CSS pixels in portrait and 40 CSS pixels in compact mobile landscape. No route may introduce document-level horizontal overflow at 320, 375, 390, 430 or 844 × 390.
- Email category labels must resolve consistently for singular/plural transfer mail, matchday notices and results.

## Retained Build 11.33 gameplay contract

- A fresh match may not enter matchmaking until the current-day opposition briefing, starting five, assigned match roles and tactical plan have been reviewed and confirmed.
- `js/39-matchday.js` owns the matchday workflow, approach/range/priority settings, temporary match-role assignments, mandatory Inbox decisions and tactical post-match analysis.
- Match roles must alter live AI behaviour without replacing the player's natural profile role. Team approach, engagement range and priority are bounded modifiers layered over attributes, weapons, fatigue and injury state.
- Shared team information must remain believable: operators may react to team-mate contacts and ally-down positions for a limited time, but may not receive permanent enemy coordinates or track through walls.
- Unresolved management decisions are End Day blockers and must be resolved through the Inbox before calendar mutation.
- Post-match reports must retain coordination telemetry so the player can see supported time, trade response, regrouping, role actions and route replans.

## Normal completion workflow

For gameplay, renderer, UI, CSS or HTML changes:

```bash
python3 build.py
node --check js/strikewatch.dev.js
```

Then extract and syntax-check the inline JavaScript from the generated standalone HTML, run relevant behavioural checks, and perform a second unrelated-regression pass.

Return:

1. An updated complete source ZIP.
2. The newly generated standalone HTML release.

## Documentation-only maintenance

When the accepted task changes only Markdown or handoff text:

- do not bump `BUILD_VERSION`, `BUILD_NAME` or `BUILD_ID`;
- do not invent a new numbered game release;
- keep the documentation labelled with the actual current build;
- a rebuild is optional because Markdown is not embedded in the standalone HTML;
- return the updated source archive together with the current standalone HTML for the same numbered release.

### Build 11.39 comparison-language refinement

- Weapon comparison labels now distinguish major upgrades, clear upgrades, balanced trade-offs, minor edges and downgrades instead of reducing every mixed profile to simply better or worse.
- Mixed weapon profiles remain visibly marked as trade-offs when one weapon gains speed or handling but loses damage, accuracy or critical output.
- Stat deltas use explicit language such as faster, slower, average damage, accuracy and handling.
- The Armoury explains that the comparison score evaluates the weapon package only; operator attributes, assigned role, fatigue and tactics still determine live effectiveness.
