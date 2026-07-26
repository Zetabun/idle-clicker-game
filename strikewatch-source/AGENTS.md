STRIKEWATCH BUILD 12.113 DESKTOP VERSION ALIGNMENT CONTRACT

Preserve the Build 12.112 visible-version system while correcting only the desktop badge alignment. The breadcrumb and version badge must remain in one vertically centred desktop topline, and the mobile version must remain inside the existing Help-revealed current-page bar.

BUILD 12.113 INVARIANTS
- `css/game.css` owns the desktop `.manager-context-topline`, `#managerBreadcrumb` line box and `.manager-build-version` positioning/content alignment.
- `js/00-core.js` remains the sole runtime build-metadata authority and continues to synchronise the desktop and mobile version labels.
- `index.html` retains matching title, asset IDs, main-menu build stamp and static desktop/mobile version labels.
- Do not move the version into the permanent mobile compact header or change the existing `?` Help interaction.
- Do not change gameplay, navigation, saves, match rendering, performance systems, save schema 19 or diagnostics schema 1.
- Run metadata parity, desktop badge geometry, mobile label retention, modular/generated/standalone syntax, deterministic build and archive-integrity checks.

STRIKEWATCH BUILD 12.112 VISIBLE VERSION HEADER CONTRACT

GITHUB REPOSITORY PLAN
- Root `cod.html` is the deployed GitHub Pages release.
- `strikewatch-source/` is the complete editable source and documentation authority.
- Read every Markdown file in `strikewatch-source/` before changing the game.
- Make code, CSS and markup changes only in `strikewatch-source/`; generated `js/strikewatch.dev.js`, `dist/` and root `cod.html` are release outputs.
- For every verified playable iteration, update the relevant Markdown authority and current audit, run `build.py`, copy the resulting standalone file to root `cod.html`, and commit source, documentation and `cod.html` together.
- Root `other/` contains unrelated games, assets and retired automation. Do not import, edit or treat those files as Strikewatch dependencies unless the user explicitly requests it.

Every numbered playable release must expose its current version in the management header. Desktop must show `BUILD <BUILD_VERSION>` inside `.manager-context`. Mobile must show the same value inside `.mobile-command-route-bar` when the existing `?` Help control reveals that bar. Both runtime labels derive from `BUILD_VERSION` in `js/00-core.js`, while `index.html` retains matching static values for immediate and failure-safe identification.

BUILD 12.112 INVARIANTS
- `js/00-core.js` remains the authority for `BUILD_VERSION`, `BUILD_NAME` and `BUILD_ID`, and synchronises `#managerBuildVersion` plus `#mobileCommandBuildVersion`.
- `index.html` must update its title, asset query strings, main-menu build stamp and both visible header version labels for every numbered playable release.
- `build.py` must reject any release whose desktop or mobile source label differs from `BUILD_VERSION`.
- Desktop version identity remains in the main management header. Mobile identity remains in the Help-revealed current-page bar and must not consume permanent compact-header space.
- Preserve mobile Help toggling, route navigation, gameplay, visuals, save schema 19 and diagnostics schema 1.
- Run metadata-consistency, desktop-header visibility, mobile Help-off/Help-on visibility, syntax, deterministic-build and ZIP-integrity checks.

STRIKEWATCH BUILD 12.111 REALISTIC OPERATOR HEADS CONTRACT

Preserve Build 12.110 natural operator silhouettes while improving only the shared procedural head presentation. Head scale, hit detection, collision, deterministic identity, pale natural complexion, operator LOD, weapons, AI, movement, combat, economy and progression remain authoritative and unchanged.

BUILD 12.111 INVARIANTS
- `js/60-renderer-core.js` owns the nine-ring anatomical skull, fitted open-bottom helmet and nose-contoured face-cover meshes.
- `js/62-character-renderer.js` owns head proportions, split elliptical goggles, headset hardware, chin straps, deterministic appearance variation and the shared living/corpse assembly.
- The model top must remain within `OPERATOR_PROPORTIONS.modelTop`; head hit detection and collision do not follow presentation mesh edits.
- Preserve the Build 12.57 pale natural skin palette, dedicated material and visible-face coverage limits.
- Head refinements occupy existing draw slots and add no head draw calls.
- Save schema remains 19 and diagnostics schema remains 1.
- Run head geometry, skin presentation, weapon attachment, corpse, LOD, close/normal visual, performance, collision-equivalence, syntax, deterministic-build and ZIP-integrity checks.

STRIKEWATCH BUILD 12.110 NATURAL OPERATOR SILHOUETTES CONTRACT

Preserve gameplay and the Build 12.109 Citadel performance improvements while refining third-person operator anatomy and articulation. The operator pass is renderer-only: keep weapon grips, muzzle anchors, hitboxes, collision, movement, AI, navigation, combat, match rules, economy and progression unchanged.

BUILD 12.110 INVARIANTS
- `js/60-renderer-core.js` owns the seven-ring torso, six-ring pelvis, profiled joint-shell and longitudinal boot meshes.
- `js/62-character-renderer.js` owns presentation-only pelvis counter-motion, torso/head stabilisation, articulated shoulders and the hand-anchored elbow solve.
- Living and fallen operators must continue sharing the same surface geometry.
- Weapon hand and muzzle anchors remain authored by the existing career weapon model. `operatorWeaponAttachmentAudit()` must pass for every weapon.
- Operator surface changes add zero body draw calls. Preserve distance-based operator detail tiers and the Build 12.109 static batching, culling and collision broad phase.
- Save schema remains 19 and diagnostics schema remains 1.
- Run modular/generated/standalone syntax, operator geometry, weapon attachment, corpse, live visual, Citadel performance, collision-equivalence, deterministic build and ZIP-integrity checks.

STRIKEWATCH BUILD 12.109 CITADEL MATCH PERFORMANCE CONTRACT

Preserve the Build 12.108 Citadel map and its visual presentation while keeping live matches smooth. Static renderer optimisation must remain presentation-only, and collision optimisation must preserve the exact existing narrow-phase answers. Do not change authored geometry, materials, lighting, animation, operator decisions, navigation, line of sight, combat values, match rules, economy or progression to meet a performance target.

BUILD 12.109 INVARIANTS
- `js/60-renderer-core.js` owns static-world bounds, Citadel opaque GPU batching, conservative view culling and renderer counters.
- Only opaque, time-invariant Citadel world draws may enter static GPU batches. Doors, warning lights, translucent surfaces and time-dependent emissive effects stay on the original dynamic draw path.
- `js/00-core.js` owns the static prop-collision spatial broad phase and dynamic-door collider cache. `circleIntersectsLevelProp` and the existing segment narrow phase remain authoritative.
- `propCollisionBroadphaseForTest()` must report zero mismatches against brute-force collision across every arena.
- Retain `staticCulling=0` and `staticBatching=0` as non-persistent diagnostic comparison switches.
- Save schema remains 19 and diagnostics schema remains 1.
- Run modular/generated/standalone syntax, live Citadel demo timing, static visual-path comparison, collision-equivalence, retained arena geometry, deterministic build and ZIP-integrity checks.

STRIKEWATCH BUILD 12.106 CONFIGURABLE MANAGEMENT PAGE BACKGROUND CONTRACT

Preserve the existing management-card, panel and route visual authorities while allowing the large management canvas behind those elements to be customised from Club → Configuration. The preference is cosmetic and independent of career progress. It must update immediately, persist through `strikewatch.interfaceBackgroundColour.v1`, retain an accessible dark default and never recolour match rendering, management cards, sidebar chrome or route accents.

BUILD 12.106 INVARIANTS
- `js/50-ui-menus.js` owns colour validation, shading, local-storage persistence, Configuration markup and preset/reset interactions.
- `js/70-runtime.js` delegates Configuration click, input and change events to the background preference handlers before general career handlers.
- `css/game.css` applies the preference only to the management `.menu-content` canvas and owns the Configuration-card controls.
- The default remains Command Navy `#07131d`; invalid or unavailable stored values fall back safely.
- Career save schema remains 19 and diagnostics schema remains 1; resetting or importing a career does not need to erase this independent appearance preference.
- Preserve Build 12.105 windowed-match label cleanup and all Build 12.104 HUD/blocker-link repairs.
- Run modular/generated/standalone syntax, preset/custom/reset interaction, desktop/mobile overflow, deterministic build and ZIP-integrity checks.

STRIKEWATCH BUILD 12.105 WINDOWED MATCH LABEL CLEANUP CONTRACT

Preserve the Build 12.104 scoreboard/objective/viewport separation. The obsolete decorative `LIVE // SECURE FEED` pseudo-label must remain disabled in windowed match views so no legacy text can appear behind the HUD. Do not move the scoreboard or objective back into the live viewport. Landscape and maximised match behaviour, gameplay, save schema 19 and diagnostics schema 1 remain unchanged.

BUILD 12.105 INVARIANTS
- `css/game.css` keeps `body[data-view-mode='windowed'] .match-view::before` non-rendering with `content: none` and `display: none`.
- The scoreboard and objective remain direct match-stage rows above `.match-stage-viewport` in portrait windowed presentation.
- Do not reintroduce decorative text behind the HUD.
- Preserve Build 12.104 blocker routing and restrained recruitment hover.
- Run CSS pseudo-content, modular/generated syntax, deterministic build and ZIP-integrity checks.

STRIKEWATCH BUILD 12.104 BLOCKER LINKS AND PORTRAIT HUD REPAIR CONTRACT

Preserve the existing management-action, recruitment-card and match-HUD authorities while retaining these repairs. Blocking **Must Respond** actions must always open their actionable destination even when the opening-week progressive interface would normally lock that route. Pending sponsorship proposals specifically expose Commercial and retain exact `sponsor:<offer-id>` targeting. Desktop recruitment hover must stay dark and restrained rather than reverting to a silver/washed-out surface. In portrait windowed matches, the round scoreboard and objective are separate rows above the 16:9 live viewport; they must not overlay the canvas.

BUILD 12.104 INVARIANTS
- `js/39-workflow-integrity.js` owns blocker-action routing and exact arrival targeting.
- `js/50-ui-menus.js` may expose a progressively locked route when that route contains a live blocking decision.
- `js/00-core.js` creates one `.match-stage-viewport`; do not create duplicate wrappers or move the scoreboard/objective back into the viewport.
- `css/game.css` owns the portrait three-row match-stage layout and the restrained desktop recruitment hover.
- Landscape and maximised match layouts remain overlays over a full-stage viewport.
- Preserve sponsorship economics, recruitment calculations, match balance, save schema 19 and diagnostics schema 1.
- Run modular/generated/standalone syntax, deterministic rebuild, blocker-link click/target, portrait geometry, landscape geometry, desktop hover and ZIP-integrity checks.

BUILD 12.92 ALIGNED DESKTOP SIDEBAR CONTRACT

- At 1024–1279px, the desktop sidebar must be exactly 232px wide, matching the 48px Back plus 184px Gold Balance header columns.
- At 1280px and wider, the desktop sidebar must be exactly 266px wide, matching the 52px Back plus 214px Gold Balance header columns.
- Desktop menu rows remain natural-height one-line controls, but labels and icons must be readable at normal desktop viewing distance.
- The club crest remains unboxed. Mobile and compact-landscape navigation remain unchanged.

STRIKEWATCH BUILD 12.87 DESKTOP SIDEBAR SECTION ICONS CONTRACT

Preserve the Build 12.86 compact desktop sidebar and selected-club crest. Each desktop department button must retain its text label, progressive-access state and notification badges while receiving one decorative section icon. Icons are desktop-only from `1024px`, use the existing route accent for active/guided states, and remain muted for locked sections. Mobile navigation must remain unchanged.

BUILD 12.87 DESKTOP-SIDEBAR-SECTION-ICONS INVARIANTS
- `index.html` owns the five inline SVG department icons.
- `css/game.css` owns icon sizing, route-accent highlighting and desktop-only visibility.
- Keep the legacy desktop command mark hidden so the club crest remains the first item in the compact rail.
- Preserve accessible text labels; icons remain `aria-hidden`.
- Do not change route ownership, progressive locks, onboarding, gameplay, mail, persistence, save schema 19 or diagnostics schema 1.
- Run modular/generated/standalone syntax, deterministic rebuild, desktop viewport, mobile-hidden-icon and overflow checks.

STRIKEWATCH BUILD 12.85 ONBOARDING FOCUS & SAVED MAIL CONTRACT

Read every Markdown file before editing. Preserve the First Match Journey as the single onboarding action path. While `firstMatchGuidance()` is active, the Operations Command Centre must show only the guided journey, optional context, compact club identity and Team XP; normal dashboard intelligence must return automatically when the guide completes. Preserve the full dashboard outside onboarding. Keep mail task-led: unread messages and unresolved decisions belong in Inbox, read unsaved messages leave Inbox, and saved messages remain available in Saved Mail. Decision-required emails must never disappear before their decision is resolved. The per-message `saved` flag is additive under save schema 19; the active folder is transient UI state.

BUILD 12.85 ONBOARDING-FOCUS-SAVED-MAIL INVARIANTS
- `js/36-team-management.js` owns onboarding Command Centre simplification through the existing `firstMatchGuidance()` authority; do not create a parallel tutorial-completion state.
- Hide only the normal Command Centre dashboard blocks during onboarding. Do not delete their data, routes or post-onboarding presentation.
- `js/39-club-operations.js` owns Inbox/Saved Mail filtering, read state, save state, decision-message protection and mail interaction handling.
- Inbox contains unread mail plus unresolved decision mail. Read unsaved mail is hidden; Saved Mail contains every message with `saved: true`.
- Save/unsave must be available from both the message reader and full-email modal. Marking a message unread returns it to Inbox.
- Saved mail must receive retention priority when the mail store is trimmed. Unresolved decision mail must also be protected.
- Preserve mail generation, decisions, End Day blockers, onboarding progression, gameplay, economy, infrastructure, save schema 19 and diagnostics schema 1.
- Run modular/generated/standalone syntax, deterministic rebuild, onboarding-content, Inbox disappearance, save/unsave, mobile/desktop containment, runtime-cleanliness and ZIP-integrity checks.

STRIKEWATCH BUILD 12.84 PORTRAIT MOBILE BOTTOM CLEARANCE CORRECTION CONTRACT

Read every Markdown file before editing. Preserve the fixed portrait department bar and keep `.menu-layout` as the single owner of bottom-navigation clearance. Do not add a second full navigation-height inset to `.menu-content`; portrait route content should retain only its normal content padding so the internal `#menuContent` scroller reaches the department bar without a false blank band. Preserve compact-landscape navigation, desktop layout, Command Centre ordering, recruitment, infrastructure, gameplay, save schema 19 and diagnostics schema 1.

BUILD 12.84 PORTRAIT-MOBILE-BOTTOM-CLEARANCE INVARIANTS
- `.menu-layout` retains the existing fixed-nav clearance and safe-area handling.
- Portrait `.menu-content` uses only a small normal bottom inset, not another 62–74px navigation reservation.
- The next route section must flow immediately after Team XP when scrolling the Command Centre.
- The fixed department bar must remain visible, touchable and free of content overlap.
- Compact landscape and desktop spacing remain unchanged.
- Run syntax, deterministic rebuild, portrait viewport geometry, compact-landscape regression and ZIP-integrity checks.

STRIKEWATCH BUILD 12.81 PERSISTENT CLUB INFRASTRUCTURE CONTRACT

Read every Markdown file before editing. Preserve `js/39-infrastructure.js` as the permanent facility authority and keep the six branches connected to existing systems: Training, Scouting, Medical & Recovery, Youth Academy, Analysis and Commercial & Supporters. Every branch has four sequential levels. Projects spend Club Cash immediately, take club days to complete, use one construction queue and permanently consume division-based capacity. No refund, downgrade, cancellation or respec path may be introduced without an explicit redesign. Division capacity remains lower than the complete twenty-four-level tree so clubs must specialise. Keep infrastructure state additive under save schema 19 and preserve all existing recruitment, training, medical, opposition, commercial, supporter and economy authorities.

BUILD 12.81 PERSISTENT-CLUB-INFRASTRUCTURE INVARIANTS
- Keep `careerState.infrastructure` additive and normalised for older saves.
- Keep one active project maximum and reserve one capacity slot as soon as funding is committed.
- Keep completed levels irreversible and persistent through seasons, promotion and relegation.
- Training affects technical training progress; Scouting affects recruitment knowledge and assignments; Medical affects fatigue/injury recovery and risk; Academy creates fee-free club prospects; Analysis affects player XP and opposition reports; Commercial affects sponsor offers, match income and positive supporter growth.
- Keep academy prospects protected from rival bids and routine market rotation until their availability window expires.
- Do not create a parallel infrastructure currency. All projects use Club Cash and the existing finance ledger.
- Run source/generated/standalone syntax, deterministic rebuild, project progression, capacity, academy, effect-integration, responsive containment and ZIP-integrity checks.

STRIKEWATCH BUILD 12.80 MOBILE RECRUITMENT COMPACT SUMMARIES CONTRACT

Read every Markdown file before editing. Preserve the Build 12.75 dark-boardroom desktop recruitment cards, the Build 12.77 mobile carousel navigation and the Build 12.71 sticky comparison tray, while replacing the mobile candidate default state with a substantially shorter compact summary. On mobile and compact-tablet widths, name, role, ability, potential, fee and wage must be visible immediately, one clear primary Negotiate action must remain available without opening further panels, and the supporting scouting explanation, squad-fit detail, history/context and role brief must live inside an explicit expandable report area. Keep shortlist and comparison as compact supporting actions, preserve the sticky two/three-slot comparison tray, and keep all new report-expansion state transient UI state only. Candidate data, scouting confidence values, recommendations, transfer logic, gameplay, save schema 19 and diagnostics schema 1 remain unchanged.

BUILD 12.80 MOBILE-RECRUITMENT-COMPACT-SUMMARIES INVARIANTS
- `js/39-recruitment-commercial.js` owns the compact mobile candidate summary/report markup, the report-expansion transient state and the associated interaction handlers.
- `css/game.css` owns the compact-summary presentation and must hide the desktop flip stage below `820px` while leaving the desktop boardroom cards authoritative above that breakpoint.
- Keep mobile candidate scanning focused on name, role, ability, potential, fee and wage; do not hide those values behind the expanded report.
- Keep exactly one primary Negotiate action visible in the collapsed summary. Secondary actions may support shortlist, comparison, report expansion and full-profile access only.
- Preserve and visibly retain the sticky comparison tray so two or three selected candidates stay available while browsing the market.
- Do not write report-expanded state, comparison state or shortlist state to the career save beyond the existing shortlist authority.
- Run source/generated/standalone syntax, deterministic rebuild, compact-summary interaction, responsive containment, runtime-cleanliness and ZIP-integrity checks.

# Read This Before Doing Anything

This directory is the authoritative, maintainable source project for **Strikewatch Build 12.85: Onboarding Focus & Saved Mail**.

## Current release essentials

## Build 12.85 onboarding focus and saved mail

Build 12.85 simplifies the Command Centre while the First Match Journey is active and adds a task-led Inbox with Saved Mail. During onboarding, the calendar strip, fixture/status dashboard, club objectives, priority queue, momentum panel, command directory, match-preparation dashboard and line-up snapshot are withheld from the Command Centre; the First Match Journey, optional context, club identity and Team XP remain. The complete dashboard returns automatically when onboarding ends. Read unsaved emails now leave the Inbox immediately, unresolved decision emails remain visible until answered, and managers can save or unsave messages from the reader or full-email modal. A Saved Mail folder keeps marked messages available across saves. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.84 portrait mobile bottom clearance correction

Build 12.84 removes the remaining false gap above the persistent department bar in portrait mobile. The fixed bottom navigation was already reserved by the mobile menu layout, but a second 74-pixel padding rule on the content pane shortened the inner route scroller again. Portrait now keeps only the normal 10-pixel content inset, so the next Command Centre section flows directly beneath Team XP while the fixed navigation remains fully clear. Compact landscape, desktop, gameplay, recruitment, infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.82 mobile Command Centre panel height correction

Build 12.82 corrects the large false gap beneath the mobile Command Centre's Manager Priority Queue. In compact landscape, the Objectives and Recommended Actions panels remain side by side, but each now sizes to its own content instead of CSS Grid stretching the shorter panel to the height of the taller objectives list. Portrait layout, bottom navigation, dashboard content, gameplay, infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.81 persistent club infrastructure

Build 12.81 adds six permanent, capacity-limited facility branches inside the existing Club department. Infrastructure spends Club Cash, uses one construction queue, completes through club-day progression and cannot be refunded or reassigned. Division capacity remains below the twenty-four-level complete tree, forcing specialisation. Facility effects connect to the existing training, recruitment, medical, academy, opposition-analysis, player-XP, sponsorship, match-income and supporter-growth authorities. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.79 accessibility and visual hierarchy pass

Build 12.79 delivers a focused accessibility and visual-hierarchy pass without changing gameplay or persistence. Disabled controls now use a readable neutral surface at full opacity, including formerly confusing guided and locked actions. Keyboard focus uses a high-contrast cyan ring with a dark separation halo. Informational panels use quieter neutral borders while actionable controls receive stronger interactive edges and hover feedback. Routine labels and secondary guidance use sentence case and reduced letter spacing, while gold is reserved for primary actions, earned ratings and important states. The First Match Journey action now retains its bright guided treatment instead of combining dark text with a generic dark button background. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.78 desktop inbox spacing and readability

Build 12.78 repairs the desktop Inbox spacing conflict introduced when later readability passes enlarged mail copy while an older rule continued to force every message row into 78 pixels. Desktop rows now size to their sender, subject and two-line preview; the message list uses the available column height rather than stopping after two rows; and the reader no longer receives duplicate outer padding on top of its own message-section padding. The result keeps the existing two-pane mail-client style while removing clipped previews, row overlap and excessive reader offsets. Mobile mail presentation, mail data, decisions, gameplay, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

Build 12.76 keeps the Build 12.75 darker boardroom recruitment-card visuals and changes only the mobile browsing pattern. At mobile widths, recruitment candidates now appear in a swipeable one-card-at-a-time carousel with snap scrolling, rounded premium card framing, subtle neighbouring-card peeks and a compact swipe hint. Desktop/tablet presentation, candidate data, scouting calculations, comparison logic, negotiations, signings, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

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

Build 12.40 adds an automatic **Season Stories** layer that recognises important fixtures, promotion and survival pressure, revenge matches, form runs, supporter and board expectations, developing rivalries and lasting club records from the game's existing authoritative league, supporter, operator and squad-dynamics data. The system follows a recognise-don't-interrupt contract: it adds presentation, occasional informational inbox stories and at most a small positive reputation reward for a high-stakes win, but it never changes combat AI, weapons, health, fixture outcomes or creates mandatory responses, End Day blockers or routine micromanagement. Rivalries progress through Standard, Emerging, Heated and Fierce thresholds at 0, 20, 45 and 75 intensity; settlement is once per fixture, seasons archive once, and persistent history is backwards-compatible inside save schema 19. Preserve `makeDefaultSeasonNarrativeState()`, `normaliseSeasonNarrative()`, `seasonNarrativeFixtureContext()`, `seasonNarrativeStorylines()`, `settleSeasonNarrativeAfterFixture()`, `seasonNarrativeArchiveSeason()`, `renderSeasonNarrativeDashboard()`, `renderSeasonNarrativeMatchReport()`, `seasonNarrativeForTest()`, the fixture/season deduplication guards, reputation bonus cap of 2, save schema 19 and diagnostics schema 1.

## Build 12.40 season-stories invariants

- `js/33-season-narrative-state.js` must load before `js/35-career.js`; career defaults and normalisation depend on its backwards-compatible state helpers. `js/52-season-narratives.js` must load after the League, opposition, supporter, squad-dynamics and menu authorities it observes.
- Fixture importance, supporter/board views and storylines must be derived from real schedule, table, form, expectation, operator and relationship data. Do not generate arbitrary stakes or disclose information outside existing scouting boundaries.
- Rivalry intensity uses the retained thresholds Standard 0, Emerging 20, Heated 45 and Fierce 75. It grows only when a real user league fixture settles and must remain presentation/reputation-led rather than a combat modifier.
- Preserve `lastSettledFixtureId` and each rivalry's `lastFixtureId` guard so reports, reloads and repeated settlement cannot inflate rivalries, records, reputation or headlines.
- High-stakes wins may award only a positive reputation bonus from 0 to 2. Losses never remove reputation, and no story changes health, damage, accuracy, weapons, pathfinding, opponent attributes, rewards or fixture results.
- Headlines and competition mail are informational. They must never be required-response mail, decision blockers, End Day locks or recurring management chores.
- Completed seasons archive once with position, points, record, movement, top operator and strongest partnership. Preserve the 20-season archive, 24-headline and 60-mail-key caps.
- Preserve `seasonNarrativeForTest()`, duplicate-settlement, save round-trip, season-archive and 320/375/390/430 portrait plus 844x390 landscape checks, save schema 19, diagnostics schema 1 and all Build 12.39 regressions.

## Build 12.40 release contract

Build 12.40 connects fixture stakes, evolving rivalries, supporter/board expectations, automatic campaign storylines and persistent club history without adding a second competition engine, daily decisions, combat bonuses, save-schema changes or diagnostic-schema changes. See `PROJECT.md` and `AUDIT-12.40.md`.


## Build 12.39 retained squad dynamics

Build 12.39 adds passive **Squad Dynamics** without turning the game into a conversation-management simulator. Contracted operators build persistent pair bonds from shared matches, support spacing, trades, results and joint performance. Familiar, Linked, Trusted and Elite milestones unlock small positive-only coordination buffs through existing role-execution, support, trade, group, flank, movement, awareness and reaction fields; developing pairs simply receive no buff and never suffer a penalty. Each starter uses only their strongest active partnership, active-five atmosphere adds only a small positive uplift, and relationships do not decay. One natural mentor link may automatically grant a developing operator +6% training and match-development XP. Rotation Watch, milestone mail and debrief updates are advisory only: they never block End Day or demand routine responses. Preserve `makeDefaultSquadDynamicsState()`, `normaliseSquadDynamics()`, `settleSquadDynamicsAfterMatch()`, `squadDynamicsBuffForPlayer()`, `applySquadDynamicsToBot()`, `squadDynamicsDevelopmentMultiplier()`, `renderSquadDynamicsPanel()`, `renderPlayerDynamicsPanel()`, `renderSquadDynamicsMatchReport()`, the once-per-match settlement guard, positive-only multipliers, save schema 19 and diagnostics schema 1.

## Build 12.39 squad-dynamics invariants

- `js/34-squad-dynamics.js` must load before `js/35-career.js`; career defaults and normalisation depend on its state helpers.
- Pair growth settles once per completed owned-team match. Preserve `lastSettledMatch` deduplication so repeated settlement, reloads or report rendering cannot inflate bonds.
- Dynamics are neutral-or-positive only. Developing, unfamiliar or weak links provide no bonus and never reduce health, damage, weapon performance, rewards, opponent strength or existing tactical authority.
- Each active operator may receive only their strongest active-pair effect. Do not stack every qualifying relationship.
- Preserve tier thresholds at Familiar 15, Linked 35, Trusted 60 and Elite 82. Relationships persist and do not decay.
- Mentorship is automatically derived from experience, age, potential and role fit. It grants only +6% training and match-development XP to the learner and must not create a mandatory decision.
- Rotation Watch, milestone mail, squad summaries and debrief cards are advisory. They must not create decision blockers, End Day locks or routine conversations.
- Debrief reporting is capped at three relationship milestones per match to prevent notification spam.
- Preserve `squadDynamicsForTest()`, persistence/duplicate-settlement checks, responsive containment, save schema 19, diagnostics schema 1 and every retained Build 12.38 regression.

## Build 12.39 release contract

Build 12.39 adds persistent partnerships, positive-only coordination benefits, automatic mentorship, squad/profile explanation and capped debrief storytelling without adding relationship penalties, mandatory micromanagement, a second tactics engine, save-schema changes or diagnostic-schema changes. See `PROJECT.md` and `AUDIT-12.39.md`.

## Build 12.38 retained tactical-adaptation invariants

- Keep the intervention evidence-led and advisory. The opponent read is an analyst forecast derived from visible round telemetry, not a disclosure of guaranteed hidden intent.
- Permit at most two changed categories per break across `approach`, `engagement`, `priority` and `route`. Reverting a category must free that slot immediately.
- Route changes must use `engagementPlanOptions()` and `selectRoundEngagementPlan()`; never introduce a parallel waypoint or pathfinding authority.
- Owned-team changes must continue through the captured active match plan and existing `applyCareerToBot()` behaviour. Opponent changes must continue through `oppositionIdentityForClub()` and `applyOpponentIdentityToBot()`.
- Opponent adaptation is match-scoped and resets in `createMatch()`. It applies from the following round only and must not modify health, damage, accuracy, visibility, hearing outside existing tactics, rewards or settlement.
- Reparent `#betweenRoundTactics` to `document.body` before opening. The portrait `.match-view` is transformed and cannot contain a usable full-device modal.
- Log the manager's expected effect when applying changes, then evaluate that intervention once using the following round's real support, accuracy, trade, damage and route telemetry. Final-round evaluation must occur before match settlement.
- Preserve full-device scrolling, sticky reachable actions, 320/375/390/430 portrait and 844x390 landscape containment, `betweenRoundTacticsForTest()`, `opponentAdaptationForTest()`, save schema 19, diagnostics schema 1 and Build 12.37 scouting boundaries.

## Build 12.38 release contract

Build 12.38 adds tactical diagnosis, route intervention, opponent counter-adaptation, live cause/effect notices and debrief evaluation without adding hidden bonuses, a second tactics engine, save fields or diagnostic fields. See `PROJECT.md` and `AUDIT-12.38.md`.

## Build 12.37 retained opponent preparation

Build 12.37 turns opposition intelligence into a connected match-preparation workflow for the next scheduled league fixture. Tactics now presents scouting confidence, expected formation, tempo, range, route pattern, key threat, possible vulnerability and the active-five weapon-range matchup. Three selectable responses stage the existing formation, approach, engagement and priority draft controls; they never auto-resolve a match or grant hidden attributes. Below the existing 50% tactical-disclosure threshold, recommendations and fixture-drill ordering remain generic, exact shape/range/route values are redacted from the captured plan, and live/debrief copy continues to describe those details as unconfirmed. The manager may select up to two fixture drills, which are coaching intentions evaluated in the completed tactical review rather than invisible stat bonuses. The confirmed active plan captures the truthful report, response and drills for live match notices and debrief comparison. Preserve `opponentPreparationTargetClub()`, `opponentPreparationRead()`, `opponentResponsePlanCandidates()`, `clubSelectOpponentResponsePlan()`, `clubToggleOpponentFixtureDrill()`, `opponentPreparationSnapshot()`, `evaluateOpponentPreparation()`, `opponentPreparationForTest()`, save schema 19 and diagnostics schema 1.

## Build 12.36 guided-calendar-lock invariants

- `openingWeekTutorialDayRestriction()` remains the sole authority for when the First Match Guide prevents calendar progression. Do not create a visual-only timer or parallel unlock condition.
- While `.guided-lock` is active, the single persistent `#menuEndDayBtn` shows only a centred decorative padlock in a neutral grey cell. Do not restore **END DAY UNAVAILABLE**, **FOLLOW FIRST MATCH GUIDE** or other squeezed visible copy inside that header cell.
- Preserve the complete restriction reason in `aria-label` and `title`; the visible First Match Guide remains responsible for explaining and routing the next action.
- The padlock must disappear automatically when the restriction clears. Normal End Day, matchday and required-response blocker treatments, labels and count badges remain unchanged.
- Preserve one End Day DOM control, mobile containment, `calendarHeaderForTest()`, save schema 19, diagnostics schema 1 and all Build 12.35 opening-week tests.

## Build 12.36 release contract

Build 12.36 is a presentation-only refinement of the guided End Day lock. It replaces cramped unavailable copy with a neutral grey padlock state without changing progression, blockers, settlement, tutorial sequencing or persistence. See `PROJECT.md` and `AUDIT-12.36.md`.

## Build 12.35 opening-week-command invariants

- `js/55-opening-week.js` must load after `js/50-ui-menus.js` and use the established `advanceCareerDay()` settlement path. Do not create a second calendar/economy/training simulation.
- `openingWeekTutorialDayRestriction()` disables End Day while the First Match Guide expects recruitment, profile review, squad setup, plan setup, debrief or training. It must not block the match step when a confirmed plan exists and the fixture is in the future.
- **Advance to Next Event** may advance at most 21 ordinary days and must stop for blockers, a due fixture, medical clearance, scouting/transfer change, opposition-report threshold, training milestone or stat gain.
- Never auto-resolve Inbox/contract/commercial/medical decisions, choose tactics or training, issue equipment, confirm a plan or skip a scheduled fixture.
- `openingWeekAdvanceSummaryState` and batch state are transient. Do not add them to `careerState`, diagnostics exports or save schema 19.
- The First Match Guide remains the sole opening tracker. After it ends, `renderFoundationPath()` renders the Club Daily Agenda rather than the retired Opening Week Handoff checklist.
- Preserve the historical completion of the first-match plan step after one career match, `openingWeekFlowForTest()`, mobile containment, diagnostics schema 1 and all retained onboarding/recruitment/payoff tests.

## Build 12.35 release contract

Build 12.35 introduces a grouped daily agenda, six-point fixture-preparation meter, meaningful-event calendar advance, routed change summaries and tutorial-aware End Day availability. It changes presentation and progression convenience only; established settlement, blocker, matchday and save rules remain authoritative. See `PROJECT.md` and `AUDIT-12.35.md`.

## Build 12.34 recruitment-decision-support invariants

- Preserve `RECRUITMENT_TEAM_FUNCTIONS` and the six function-based coverage model. It is decision support, not a compulsory one-of-each-role formation.
- Every market candidate must retain **What This Operator Adds**, role-fit context and relevant affordability or medical cautions.
- Best Immediate Fit, Best Affordable Option and Best Development Prospect are optional explanations only. Never sign, shortlist, sort or filter automatically because of a badge.
- Comparison is capped at three available market or shortlisted candidates and must show role purpose, scouting-aware relevant attributes, ability, potential, medical risk, fee, wage, cash after signing and Active Five change.
- `recruitmentComparisonIds` and `recruitmentLastSigningUpdate` are transient UI state. Do not add them to `careerState`, save schema 19 or diagnostics schema 1.
- A completed signing may show which functions improved and the next need, but must not change role weights, operator generation, transfer prices, wages, negotiation, AI or match balance.
- Preserve `recruitmentDecisionSupportForTest()`, mobile containment, role-guide clarity, guided recruitment scrolling and all Build 12.32 payoff behaviour.

## Build 12.34 release contract

Build 12.34 adds recruitment decision support without changing role weights, operator generation, transfer prices, wages, AI behaviour or match balance. Recruitment opens with an Active Five Needs panel, contextual candidate impact, optional beginner recommendations, a three-candidate comparison and a transient post-signing update. Preserve the public functions and state boundaries documented in `PROJECT.md` and `AUDIT-12.34.md`.

## Build 12.33 recruitment-role-clarity invariants

- Recruitment must explain all seven operator roles before a new manager is expected to sign the active five. Keep Entry, Support, Anchor, Flanker, Marksman, Shot Caller and Flex visible with plain-language job, useful attributes and trade-off.
- `TEAM_ROLE_BEGINNER_GUIDE` is presentation/reference data only. Do not change `TEAM_ROLES` weights, role IDs, AI logic, match balance or generated-player role assignment while editing the guide.
- During recruitment/profile/first-signing/active-five guidance, `recruitmentRoleGuideMarkup()` opens automatically. Later it remains available as a collapsed role reference.
- The `recruitment-candidates` guide destination wraps both the role guide and candidate rows so guided scrolling lands on the explanation first without moving document/shell/layout scroll or keyboard focus.
- Candidate profiles retain `recruitmentProfileRoleGuideMarkup()` for primary/secondary role context.
- Preserve `recruitmentRoleGuideForTest()`, `firstMatchGuidanceForTest()`, save schema 19, diagnostics schema 1 and all Build 12.32 first-match-payoff behaviour.

## Build 12.32 first-match-payoff invariants

- `renderDeploymentSelection()` must keep the four-part matchup brief, five active-operator portraits, selected-map/tactical warnings and the exact **DEPLOY ACTIVE FIVE OPERATORS** action.
- `showCareerMatchIntro()` owns the full-device team-versus-team reveal. It may reparent the retained intro element to `document.body`, and `careerMatchIntroActive()` must pause normal simulation until the user explicitly begins the match. Both five-operator rosters and the confirmed formation/approach/engagement/priority remain visible.
- `careerMatchMomentState` is presentation-only. Role/range/plan explanations, last-operator/clutch/close-out states, match point and between-round adjustment notices must be derived from legitimate live state and must never change AI, navigation, perception, weapon, damage or winner selection.
- Only the first completed career match uses the five-stage Result → Rewards → Operators → Supporters → Next Step reveal. Rewards are settled before display; the sequence must not award anything twice. The final step retains a direct routed coaching action before the optional detailed report. Taking that action or leaving the detailed report must mark the latest report reviewed before progressive route access is evaluated.
- Keep the intro and report action rows sticky and reachable at 320/375/390/430 portrait and 844×390 landscape without horizontal overflow. Preserve `firstMatchPayoffForTest()`, existing first-match guidance/progressive access, save schema 19 and diagnostics schema 1.

## Build 12.31 demo-viewport-coach invariants

- Every guided-demo card must appear over the portrait match viewport using the same top-centred placement; stages one and two must not fall below the visible match window.
- All four `NEW_PLAYER_DEMO_STEPS` remain paused while their card is visible. The simulation starts only when the fourth card's **Watch the Round** action hides the coach and clears `newPlayerDemoState.paused`.
- Keep the card internally scrollable on short portrait screens rather than moving it below the viewport or shrinking meaningful copy.
- Preserve the real one-round AI simulation, manual spectator switching after the coach closes, non-career settlement branch, Recruitment return, `newPlayerOrientationForTest()`, 320–430px portrait and 844×390 landscape containment, save schema 19 and diagnostics schema 1.

## Build 12.30 guidance-consolidation invariants

- The nine-step `firstMatchGuidance()` journey is the sole visible opening progress tracker. Do not add a second checklist, recommendation rail or auto-open tutorial while it is active.
- `renderTeamTutorialPanel()` must keep the legacy six-stage progression flags compatible, but present its content as a closed `details.team-tutorial-optional` disclosure during the guide. It must not contain a competing `data-team-route` action.
- `renderFoundationPath()` stays hidden while `firstMatchGuidance()` returns a step. After the guide ends Build 12.35 renders the live **Club Daily Agenda** in its place.
- One-time route tutorials and Command Index recommendations are delayed until the guide ends. The Command Centre hero must not display its separate next-action aside during the guided journey.
- Preserve `guidanceConsolidationForTest()`, `firstMatchGuidanceForTest()`, progressive-route locks, 320–430px portrait/mobile-landscape containment, save schema 19 and diagnostics schema 1.

## Build 12.29 guided-recruitment-scroll invariants

- The **Recruit Operator** and **Continue Recruiting** actions in `firstMatchGuidance()` must carry `scrollTarget: 'recruitment-candidates'`.
- `renderMenuPriorityStrip()` passes the target through `data-team-scroll-target`; both the base and enhanced Recruitment market lists own `data-guide-target="recruitment-candidates"`.
- Route handling must restore `recruitmentState().view` to `market`, call `setMenuRoute()`, then use `scrollMenuGuideTargetIntoView()` so the real `.menu-content` scroller moves to the freshly rendered candidate list.
- Never use page-level `scrollIntoView()`, move document/shell/layout scroll, or force focus onto a candidate. Preserve the existing viewport-origin safeguards and reduced-motion support.
- Preserve `firstMatchGuidanceForTest()`, the nine-step sequence, progressive locks, 320–430px portrait and 844×390 landscape fit, save schema 19 and diagnostics schema 1.

## Build 12.28 guided-demo orientation invariants

- The orientation is offered only to a genuinely new created club: zero completed matches, zero contracted operators and no existing demo completion/skip flag. Keep the concept visible on team creation and open its dedicated briefing before ordinary recruitment guidance.
- `newPlayerDemoState` and `NEW_PLAYER_DEMO_STEPS` in `js/40-match-flow.js` are transient authorities. Persist only completion/skip markers in the existing `careerState.tutorial.contextSeen`; do not add a parallel onboarding schema or bump save schema 19.
- The demo uses the real AI/combat loop on Citadel and a temporary one-round target. Do not script combat, grant hidden bonuses or replace autonomous decisions with a cutscene.
- The orientation must branch out of `finishRound()` before all career settlement. It may not change match/round/win totals, finances, rewards, operator health/fatigue, league results or reports.
- Keep all four explanation steps paused until the final Watch the Round action releases the simulation. Preserve manual spectator switching, the live intention and objective/plan labels; keep ordinary menu, speed, auto-spectate and hide-UI controls unavailable during the demo.
- Completion or skip restores normal transient match state and routes to Recruitment. Preserve concept/demo overlay accessibility, 320/375/390/430 portrait and 844×390 containment, `newPlayerOrientationForTest()`, source/standalone parity, save schema 19 and diagnostics schema 1.

## Build 12.27 progressive-interface invariants

- `progressiveRouteAccess()` and `progressiveSectionAccess()` in `js/50-ui-menus.js` derive opening access from existing career state only. Do not persist an unlock checklist or advance access because a greyed page was tapped.
- Keep every primary section and route discoverable. Locked primary sections still open their overview preview; locked sub-routes remain visible, greyed and labelled with the exact milestone. `setMenuRoute()` guards ordinary direct and routed navigation, while menu-history application independently skips or rejects locked entries so no navigation path can bypass the lock.
- Required progression is: recruitment/mail/configuration; active five/tactics/loadout after five operators; league/calendar after plan confirmation; reports/telemetry/supplies after the first match; training after debrief review; advanced club and transfer systems after one training focus.
- Progressive locks apply only while the nine-step first-match guide is active and fewer than two matches have been completed. Established careers must never be re-locked because old tutorial flags are missing.
- Section overview previews and the Command Index may reveal feature names, status and unlock reasons, but may not execute a locked action. Notifications from locked routes must not create inaccessible primary-tab badges.
- Preserve fixed-view typography, 320/375/390/430 portrait and 844x390 landscape containment, `progressiveInterfaceForTest()`, save schema 19 and diagnostics schema 1.

## Build 12.26 first-match guidance and live-clarity invariants

- `firstMatchGuidance()` in `js/50-ui-menus.js` derives one opening objective from existing tutorial, squad, confirmed-plan, match, report and training state. Do not persist a second checklist or mark a step complete because its route was merely opened unless the established tutorial already owns that behaviour.
- The priority strip emphasises the relevant primary section and sub-route. Build 12.27 supersedes the old always-available rule during the opening journey with visible, state-derived progressive locks.
- User-facing opening-workflow language must say **active five operators** or **active operator line-up** rather than unexplained **starting five**. Internal identifiers may remain unchanged.
- `spectatorIntentLabel()`, `liveMatchObjectiveText()` and `liveMatchPlanText()` are observational UI only. They may read current AI and match state but must never write to bots, navigation, visibility, weapon, tactical or settlement state.
- Operator-card and deployment role graphics are authored CSS/HTML with no external assets. Preserve 320/375/390/430 portrait and 844×390 containment, 44px management touch targets, fixed viewport behaviour and the existing compact console identity.
- The first-report guide sits above the established causal conclusions and must not replace the linked coaching recommendations. Preserve save schema 19 and diagnostics schema 1.

# Instructions for AI Coding Agents

Current playable release: **Build 12.62 — Mobile Navigation Consolidation**.

## Build 12.62 mobile-navigation-consolidation invariants

- Below `1024px`, the persistent five-department control is the primary navigation: a safe-area-aware bottom bar in portrait and a slim left rail in compact landscape.
- The current-page bar is the only mobile subsection entry point. It opens the full-screen Club Navigator; do not restore the horizontal subsection carousel on mobile.
- The Club Navigator is the only mobile all-pages directory and global route search. Keep the Command Index and section-hub page directories hidden on mobile while retaining them unchanged on desktop.
- Tapping a different unlocked department opens its overview. Tapping the active department opens the navigator. Tapping a department whose features are locked opens that department in the navigator so the exact lock reason remains visible.
- Keep navigator route state, notifications, First Match Journey, global search, exact lock reasons, X/Escape close, focus containment/return, body scroll lock and pause-session Return/Exit controls. Do not persist navigator-only state.
- Every visible navigator action remains at least 44px and meaningful navigator text remains at or above the Build 12.61 mobile floor.
- Preserve the Build 12.60 desktop rail, route grid and Command Index at `1024px` and wider, plus gameplay, save schema 19 and diagnostics schema 1.

### Live-match mobile density

- In portrait windowed matches, keep objective, score, status and spectator controls readable; orientation feed messages must not duplicate or cover the guided objective.
- In compact landscape, preserve the single owned-operator telemetry card and plain-language decision reason. Do not restore the duplicate spectator card or four-field decision grid below 500px height unless the layout can do so without micro-text or overlap.
- Match utility and camera controls remain 44px touch targets on mobile.

## Build 12.61 mobile-readability-ux invariants

- Keep the new readability work below `1024px`; preserve Build 12.60 desktop geometry and typography at and above that breakpoint.
- Meaningful mobile text must remain at or above the 9px microcopy floor. Explanations, decisions and helper copy must use the larger supporting/body tokens.
- Standalone mobile actions retain 44px touch targets in portrait and compact landscape.
- Keep real full desktop labels and real narrow-phone labels (`OPS`, `GEAR`, `SUPPLY`); do not use zero-sized source text or duplicate pseudo-content.
- At `430px` and below, the calendar list shows the current date and event-bearing dates with complete date text and readable event actions; landscape and wider layouts retain the month grid.
- Preserve opening-week state, First Match Journey, Recruitment, gameplay, AI, renderer, economy, save schema 19 and diagnostics schema 1.
- Required release checks include first-session creation/journey readability, `typographyConsistencyForTest()`, all 24 routes across mobile and desktop viewports, zero document horizontal overflow, syntax, deterministic rebuild parity and archive integrity.

## Build 12.60 desktop-readability-pass invariants

- Keep the readability work isolated to the final `@media (min-width: 1024px)` desktop layer. The established portrait and mobile-landscape cascade below `1024px` remains visually unchanged.
- Preserve the scalable desktop typography tokens `--desktop-type-micro`, `--desktop-type-label`, `--desktop-type-small` and `--desktop-type-body`; do not replace them with fixed phone-scale values on desktop.
- Command Centre objective titles, supporting descriptions, queue metadata, momentum copy, command-directory summaries and search controls must remain readable at the 1024-pixel baseline and scale modestly through wide desktop viewports.
- Retained management-module labels may remain visually subordinate, but ordinary explanatory text must not depend on low opacity or sub-10-pixel sizing to create hierarchy. Disabled and locked states must remain legible as well as visibly inactive.
- Preserve the Build 12.59 first-match onboarding authority, Build 12.58 desktop structure, all gameplay and rendering authorities, save schema 19 and diagnostics schema 1.
- Required release checks include `typographyConsistencyForTest()`, all 24 management routes at supported desktop and mobile viewports, zero document-level horizontal overflow, source/generated/standalone syntax, deterministic rebuild parity and archive integrity.

## Build 12.59 first-match-onboarding-refinement invariants

- Preserve `firstMatchGuidance()` as the single state-derived opening authority. Its nine internal checks remain compatible with existing schema-19 saves; the six visible milestones are a presentation grouping, not a second checklist.
- Focused Recruitment is transient and applies only before the first completed match while the contracted squad has fewer than five operators and the current guide step belongs to the opening recruitment sequence. Do not persist `recruitmentBeginnerExpanded` or any shortlist/unlock state.
- `recruitmentBeginnerCandidates()` must return six deterministic, affordable and role-diverse candidates drawn from the authoritative market. It may rank and explain candidates, but must not generate a second market, change player ratings, sign automatically or bypass transfer finances and squad limits.
- Keep the full scouting department, all 18 current listings, search commissioning, pools, market movement and existing comparison/negotiation authorities available through one explicit advanced-tools control. Guided mode must not delete or weaken long-term recruitment depth.
- Keep the focused route ordered around the current action: First Match Journey, compact beginner prompt, recommended candidates, comparison, signing progress and supporting needs/role context. The first recommended candidate must be visible within the initial desktop viewport at supported PC baselines.
- After every opening signing, show Active Five progress as positions filled out of five. This feedback is presentational and must derive from the contracted squad rather than a new saved counter.
- Once the one-round orientation demo has completed, hide the semantically obsolete skip action. During an active or uncompleted demo, preserve the existing skip route and state settlement.
- Preserve the Build 12.58 desktop layer, the established interface below `1024px`, progressive route locks, transfer negotiation exception, opening-week calendar authority, gameplay, economy, save schema 19 and diagnostics schema 1.

## Build 12.58 desktop-command-centre invariants

- The established phone interface remains the visual authority below `1024px`. Do not move, restyle or resize mobile portrait, mobile landscape, route-overflow, safe-area or live-command-dock behaviour as part of desktop-only work.
- Keep the desktop presentation isolated in the final `@media (min-width: 1024px)` layer of `css/game.css`. Shared rules may change only when required for semantics and must remain visually inert on mobile.
- Preserve the 80-pixel desktop command bar, readable shortcut labels, 252-pixel compact desktop rail, 292-pixel standard desktop rail, 304-pixel wide-screen rail, section-specific identity copy and visible keyboard focus treatment.
- Desktop route navigation must use the available width, wrap cleanly when needed, avoid horizontal scrollers/arrows and never overlap `.menu-content`. Mobile route arrows and scroll-position ownership remain unchanged below the desktop breakpoint.
- Keep desktop workspaces centred and bounded rather than edge-to-edge. Preserve section-appropriate grids, recruitment comparison readability, the two-pane Inbox and readable finance/Armoury/Supply Depot controls.
- `menuCommandKicker`, `menuCommandTitle` and `menuCommandSubtitle` are presentation hooks owned by `index.html` and updated by `updateMenuUI()` in `js/50-ui-menus.js`; they must not become a second route or state authority.
- Desktop acceptance covers 1024, 1280, 1366, 1440 and 1920 CSS-pixel widths. Mobile regression acceptance remains 320, 375, 390, 402 and 430 portrait plus 844 × 390 landscape.
- Preserve Build 12.57 operator skin, Build 12.56 connected weapons, Build 12.55 operator geometry, Build 12.54 full-depth armour, Build 12.53 commands/commentary, Build 12.52 arena/navigation baselines, save schema 19 and diagnostics schema 1.

## Build 12.57 light-operator-skin invariants

- `OPERATOR_SKIN_PRESENTATION` in `js/62-character-renderer.js` remains the one live palette authority. Keep exactly six deterministic pale natural tones rather than a flat pure-white colour.
- `OPERATOR_SKIN_MATERIAL` in `js/60-renderer-core.js` remains the one lighting authority for exposed skin: surface `8`, roughness `0.64` and ambient lift `0.42`. Keep `uEmissive` at zero for ordinary skin shading; hit feedback may retain its existing transient emissive pulse.
- Keep the face cover at or below `0.70` of head width and `0.36` of head height so cheeks, upper jaw and neck remain visibly exposed behind the equipment.
- `operatorVisualProfile()` remains presentation-only. Skin selection must not alter identity data, attributes, collision, hitboxes, AI, combat or persistence.
- Living and fallen operators must share the same skin palette and material through `drawOperatorHeadAssembly()` and their corresponding neck segments.
- Operators remain gloved. Do not expose artificial bare hands merely to add more skin colour; the visible skin contract is the face and neck.
- The Armoury mannequin must retain the matching light `.operator-skin` face/neck gradient. Supply Depot armour product forms remain headless and must not gain an operator head.
- Preserve `operatorSkinPresentationAudit()`, `operatorSkinPresentationForTest()`, `operatorHeadGeometryForTest()`, `operatorPresentationForTest()`, `corpsePresentationForTest()` and the mounted skin check in `armour3dPresentationForTest()`.
- Preserve Build 12.56 connected weapons, Build 12.55 operator geometry, Build 12.54 full-depth armour, Build 12.53 commands/commentary, Build 12.52 arena/navigation baselines, save schema 19 and diagnostics schema 1.
## Build 12.56 connected-weapon invariants

- `careerWeaponVisualParts()` in `js/35-career.js` remains the one authored weapon-part authority for the Armoury, living operators, fallen operators and first-person viewmodels. Do not fork dimensions into renderer-specific models.
- `CAREER_WEAPON_RENDER_SCALES` and `careerWeaponRenderScaleProfile()` are the only live WebGL scale authority. Keep `verticalPositionScale` exactly equal to `verticalSizeScale` for long guns and sidearms in both world and viewmodel contexts.
- `operatorSharedWeaponRig()`, `drawUnifiedCareerWeapon()` and `drawViewmodel()` must consume the shared scale profile for visible parts and all grip, support, muzzle and stock anchors.
- Keep `magazine` and `mag-base` inside `careerWeaponPartMovesWithMagazine()` so release, travel and reinsertion use one transform throughout reload animation.
- Preserve the seated sidearm trigger guards and the connected AR-4 `rear-sight-bridge`; do not reintroduce isolated sights, rails, floor plates or cosmetic pieces.
- `careerWeaponGeometryIntegrityAudit()` must report all four unique model classes as exactly one connected rendered component in world and viewmodel contexts, with zero positive magazine-base gap and vertical-scale parity.
- Preserve `weaponGeometryIntegrityForTest()`, `operatorWeaponAttachmentForTest()`, `operatorHeldPoseForTest()` and `viewmodelWeaponPresentationForTest()` and exercise every weapon class through held and first-person live WebGL paths.
- Do not change weapon damage, accuracy, fire rate, range, penetration, magazine capacity, reload timing, inventory, ownership, AI, operator animation, save schema 19 or diagnostics schema 1.
- Retain the Build 12.55 operator/corpse assembly, Build 12.54 armour presentation, Build 12.53 commands/commentary dock and Build 12.52 arena/navigation authorities.

## Build 12.55 operator-model invariants

- `js/60-renderer-core.js` remains the procedural mesh authority. Preserve the profiled head, open-bottom helmet, curved face cover, pelvis, carrier, shoulder-shell and glove meshes; do not replace them with flat images or a second renderer.
- `drawOperatorHeadAssembly()` in `js/62-character-renderer.js` is shared by living and fallen operators. Keep head geometry, materials and distance tiers aligned across both paths.
- Preserve deterministic identity variation from `operatorVisualSeed()` / `operatorVisualProfile()`: six deterministic appearance variants constrained by Build 12.57 to a fair/light natural skin-tone family, plus restrained head proportions only. Do not turn presentation variation into attributes, hitbox changes or gameplay bonuses.
- Keep separate framed lenses, headset cups, rails, chin straps and team helmet tabs attached to the head transform. Avoid floating accessories and preserve the low/medium/full detail paths.
- Preserve `OPERATOR_PROPORTIONS`, collision, hit detection, leg IK, weapon grip/support anchors, muzzle attachment and corpse pose authorities.
- Keep armour-class silhouettes driven by `operatorArmourRenderProfile()` and retain Build 12.54 store/Armoury full-depth armour presentation.
- Run `operatorHeadGeometryForTest()`, `operatorModel()`, `operatorPresentationForTest()`, `operatorHeldPoseForTest()`, `corpsePresentationForTest()`, weapon-attachment, armour, all-arena and navigation regressions.
- Preserve save schema 19 and diagnostics schema 1.

## Build 12.54 full-depth 3D armour invariants

- `js/35-career.js` remains the shared procedural product-model authority. Store and detail previews must derive from `careerArmourModelProfile()`, `careerArmour3dParts()` and `careerArmourRigMarkup()` rather than introducing flat image assets or a second armour renderer.
- Keep the armour shell visibly complete from front, side and rear: connected front/back cores and wings, shoulder bridges, wraparound cummerbund/side structures, class-specific plates, rear plate pocket, rear MOLLE and drag handle must remain authored geometry.
- Supply Depot cards use `careerArmourStoreFormParts()` as a restrained headless display form and must keep a large full-width perspective stage plus a complete 360-degree orbit. The detailed Armoury viewer retains the larger `careerArmourOperatorBodyParts()` fitting form and drag/swipe, zoom, reset and auto-rotation controls.
- Never apply `filter`, group opacity below 1 or any other flattening/compositing effect to `.career-armour-store-form`, `.career-armour-operator-body` or `.career-armour-weapon-system`. These parent rigs require `transform-style: preserve-3d`; apply lighting and subdued presentation to individual faces instead.
- Keep heavy armour visibly broader, deeper and more comprehensive than lighter classes. Preserve live WebGL class differentiation through `operatorArmourRenderProfile()` without changing combat values.
- Do not alter armour protection, penetration, movement, handling, fatigue, prices, ownership, assignment, durability, break behaviour, save schema 19 or diagnostics schema 1.
- Preserve `armour3dPresentationForTest()` checks for shared pipeline use, full-depth parts, centred rigs, large store stages, full orbit, operator fit and unflattened computed styles across portrait and landscape.

## Build 12.53 live-command invariants

- `js/41-live-command-pulses.js` must load after `js/40-match-flow.js` and before `js/50-ui-menus.js`. It may consume existing bot, match, career and engagement-plan state but must not become a second match lifecycle, navigation or combat-stat authority.
- Permit at most one successfully issued command per live round. Opening or closing the chooser must not spend the command, and every new round must reset availability.
- The chooser must expose exactly three context-sensitive options drawn from Regroup, Commit, Disengage, Hold Territory and Switch Route. Do not add individual-unit selection, map-coordinate orders or direct operator steering.
- Operator responses must remain autonomous and explainable as immediate, delayed or unable. Compliance may use role, awareness, pressure, spacing and current contact, but must never change health, accuracy, damage, weapon configuration, armour protection, rewards, economy or opponent attributes.
- Snapshot every temporary tactical-profile field before applying a pulse and restore it when the pulse expires, the round ends or the match resets. The protected-field audit must remain empty.
- Switch Route must reuse authored `engagementPlanOptions()` / engagement-plan objectives. Do not create a second route, navigation or map authority.
- Persist only completed command outcomes inside the existing completed-match summary and report. Live command state, open-panel state and temporary operator goals remain transient and must not enter save schema 19.
- In landscape, `.match-view` must reserve a dedicated row below `.match-stage`; the commentary feed, current match moment and open command chooser must remain inside that row and may not overlay the canvas. Portrait uses the viewport-level chooser so transformed match framing cannot clip it.
- Preserve `liveCommandPulseForTest()`, `openLiveCommandPulseForTest()`, `forceLiveCommandPulseForTest()`, `completeLiveCommandPulseForTest()`, `landscapeCommentaryForTest()`, all five command-path checks, portrait/landscape containment, the Build 12.52 arena baselines, save schema 19 and diagnostics schema 1.

## Retained Build 12.52 arena-geometry invariants

- `js/61-world-renderer.js` remains the visual geometry authority. Do not move presentation-only supports into navigation, line-of-sight or combat code.
- Solid-looking additions must be visibly grounded or tied to an authored wall/ceiling/frame. Never leave a slab, seat, lintel, screen, baffle, canopy top or decorative handle suspended without a visible connection.
- Where a visual support is also solid, presentation and collision must derive from the same source dimensions. Preserve `DUNE_CANOPY_PRESENTATION` and the shared canopy-post offsets.
- Preserve the Office conference prop at `(18.0, 20.40)` with `yaw = Math.PI / 2` unless both visual and collider placement are re-audited. Its table and six chair footprints must remain inside open map geometry and outside protected routes.
- Preserve Citadel's two grounded stair contracts, two suspended walkway contracts, five tied door portals and two grounded tank/nozzle assemblies.
- Preserve Office's four mounted baffles, four framed glass bands, five wall-mounted screens, twenty grounded chairs, two supported benches, two supported sofas and eight tied door portals.
- Preserve Dune's four collider-aligned canopy frames, sixteen canopy-post colliders, two closed-handle amphora clusters, connected market stalls and retained arch attachment checks.
- Run `allArenaGeometryIntegrityForTest()`, all retained arena/door/screen/furniture/walkway audits, navigation benchmarks for Citadel 80/80, Office 80/80 and Dune 160/160, and the exact Dune 58-collider, 494-node, 2,752-edge, one-component, zero-support-overlap baseline.
- Preserve save schema 19 and diagnostics schema 1.

## Build 12.51 living-market invariants

- `js/39-dynamic-market-mail.js` is additive to the established league, recruitment, transfer and inbox authorities. Do not create a second negotiation, scouting, finance or fixture engine.
- Generated candidates must use unique fictional names and source only the current division or weaker pools. Lower-league careers must never receive locked stronger-tier entrants.
- Rival recruitment must consider persistent roster role deficits, tactical identity, rating, transfer budget and wage budget. Completed AI signings remain in rival squads up to the eight-operator limit.
- Market rotation may expire or replace ordinary listings, but must preserve shortlisted players, active negotiations and live rival bids. Commissioned searches rotate only low-priority listings.
- Long-form mail must be generated from real career evidence, remain bounded, preserve sender/preview metadata and scroll independently in both the reader and popup. Organic messages supplement rather than invalidate required administrative mail.
- Preserve `dynamicMarketProcessDay()`, `dynamicMarketGeneratePlayer()`, `dynamicMarketSelectRivalBid()`, `clubAddOrganicMail()`, `dynamicTransferMarketForTest()`, save schema 19 and diagnostics schema 1.

## Mandatory first steps

1. Read `00-READ-FIRST-GPT.md`.
2. Read `PROJECT.md` before inspecting or editing source code.
3. Read `DOCUMENTATION-INDEX.md` to distinguish current authority documents from historical audits.
4. Read every other Markdown file supplied with the project.
5. Treat this directory or ZIP as the authoritative Strikewatch source project.
6. Do not edit generated files except when diagnosing build output:
   - `js/strikewatch.dev.js`
   - files inside `dist/`
7. Make changes in the modular source files described by `PROJECT.md`.

## Build 12.25 readable-interface and fixed-view contract

- Keep the viewport fixed at `maximum-scale=1,user-scalable=no`; do not re-enable pinch zoom unless a later explicit product decision supersedes this build.
- Readability must come from authored typography. Preserve the scoped management-interface font floors for primary navigation, section tabs, topbar date/status copy, priority panels, tutorial text, section hubs, command-centre content, line-up status, progress summaries and workflow controls.
- Keep 320–350px navigation adjustments and phone-landscape coverage through 900px. Do not solve text clipping by shrinking meaningful copy back to 5–7px.
- Preserve the compact calendar display in the topbar and the full date in accessible labels/title text.
- Do not globally scale the app or alter match HUD, WebGL presentation, gameplay geometry, AI, economy, save schema 19 or diagnostics schema 1 for this typography pass.
- Required gates include `typographyConsistencyForTest()`, the fixed-viewport branch of `onboardingClarityForTest()`, 320/375/390/430 portrait and 844×390 landscape containment, source/standalone syntax and all Build 12.24/12.23 onboarding, store and state regressions.

## Build 12.24 onboarding clarity and accessibility contract

- The first team-creation screen must plainly explain that Strikewatch is a management game, not a directly controlled shooter. State that operators move, aim and fire autonomously from the player's recruitment, loadout, role and tactical decisions.
- Preserve the visible four-part loop: recruit, prepare, watch the AI-controlled match, improve. The long-term objective is promotion through the divisions to the Pro League; individual matches are first to three rounds.
- Keep the six-stage manager induction. Clarifying copy and visual hierarchy may improve, but existing progression flags and tutorial completion behaviour must remain compatible with schema-19 careers.
- The `RANDOM NAME` button must produce fictional, editable names through `careerRandomTeamName()` and the existing `normaliseCareerName()` 24-character limit. A generated name must not create or save a club by itself.
- Onboarding graphics remain asset-free inline SVG/CSS. First-run controls must retain at least 44px touch targets and visible focus treatment. Build 12.25 supersedes the original pinch-zoom requirement with its fixed-view contract.
- Required gates include `randomTeamNameForTest()`, `onboardingClarityForTest()`, 320/375/390/402/430 portrait and 844x390 landscape containment, source/standalone syntax, deterministic build parity and all Build 12.23 store/state regressions.

## Build 12.23 Supply purchase-confirmation contract

- A successful direct weapon or armour purchase must update the visible card immediately: owned-copy count, remaining cash, inline receipt and button state must all derive from the newly saved career state.
- The purchase button must be locked for 0.9 seconds after a transaction and read `PURCHASED · OWNED N`. It may become `BUY ANOTHER` only after the lock expires.
- Rapid or queued taps during the lock must not deduct cash or add another copy. Deliberate repeat purchases after the lock remain supported.
- Preserve the current Supply Depot scroll position while refreshing the route. The receipt is transient UI state and must not be written to schema-19 saves.
- Keep `cashWeaponPurchaseFeedbackForTest()` and `cashWeaponStoreForTest()` green alongside direct purchase, finance-ledger, 3D model, responsive containment and all retained combat/map/state checks.

## Build 12.22 Supply Depot 3D weapon-stock contract

- `CAREER_CASH_WEAPON_STORE` in `js/38-development.js` must retain direct offers for `ar4-sentinel` at 58,000 CR and `viper-9` at 32,000 CR unless a deliberate economy pass changes both documentation and tests. The AR-4 should remain first for mobile visibility.
- Every direct weapon card must call `careerWeapon3dMarkup(weapon, 'store', false, null)` through `cashStoreWeaponVisualMarkup()`. Store presentation may frame and scale the shared rig but must never duplicate or redraw weapon geometry.
- Purchase buttons remain visible even when unaffordable, with disabled state communicating the cash requirement. A successful purchase adds exactly one finite inventory copy, deducts the exact offer price and records a `WEAPON` cash-ledger entry.
- Store cards retain slot, effective range, damage, magazine, penetration, movement cost, description, benefits, limitations, recommended use and owned-copy count.
- Required gates include `cashWeaponStoreForTest()`, direct AR/Viper purchase tests, mobile/landscape no-overflow checks, source/standalone syntax, deterministic build parity and all retained weapon-slot, armour, operator, AI, state and Dune regressions.

## Build 12.21 reload-cover and hit-reaction contract

- Operators may continue moving during a reload. When `reloadNeedsCover()` is true and a known threat can still expose the operator, `registerReloadCoverIntent()` must prioritise the existing tactical cover/fallback system without cancelling or restarting the reload.
- A loaded alternate weapon prevents the forced no-alternate reload-cover rule. An empty, missing or identical sidearm does not count as usable.
- Reaching the cover anchor may transition to crouched reload. Finishing the magazine change before reaching the anchor must not strand the operator in an open-space hold; retain the committed cover movement.
- Every landed hit may retain cosmetic reaction presentation, but gameplay flinch is separate, non-fatal, probabilistic and cooldown-limited. Preserve the 44% maximum chance, 0.11–0.22 second duration, 0.58–0.82 second anti-chain cooldown and maximum 14% temporary movement reduction.
- Flinch may interrupt a burst and briefly offset aim. It must not cancel reloads, weapon swaps, navigation goals, armour resolution or match state. Fatal hits proceed directly to the established death presentation.
- `reload_cover_seek`, `reload_cover_reached` and `operator_flinched` diagnostics are observational. Diagnostics schema remains 1 and career save schema remains 19.
- Required gates include `reloadCoverBehaviourForTest()`, `hitReactionFlinchForTest()`, live match simulation, runtime-fault continuity and all retained weapon-slot, armour, operator attachment, team-spacing, state-integrity and Dune checks.

## Build 12.20 AR-4 held-pose refinement contract

- `careerWeaponVisualParts()` in `js/35-career.js` remains the only AR-4 geometry and functional-anchor authority. Do not move or duplicate the stock, grip, support-grip or muzzle geometry in the character renderer.
- `OPERATOR_LONG_GUN_POSE` in `js/62-character-renderer.js` may position the complete shared rifle for third-person operators only. Preserve its shoulder-pocket seating, dominant-side lateral offset and raised ready height.
- The firing hand must continue to resolve from `pistol-grip`; the support hand must continue to resolve from `support-grip`. Reload hand travel must remain layered over those normal anchors.
- `operatorWeaponAttachmentForTest()` must report an AR-4 `stockSeatGap` no greater than 0.075m while retaining the existing hand-gap, muzzle-gap and far-LOD requirements.
- `operatorHeldPoseForTest()` must create a deterministic live WebGL inspection pose with the AR-4 equipped. Use it for visual regression captures; do not turn it into gameplay logic.
- Build 12.20 changes presentation only. Do not alter weapon balance, AI decisions, collision, hit detection, save schema 19 or diagnostics schema 1.

## Build 12.19 AR-4 iron-sight refinement contract

- `js/35-career.js` remains the sole source for the AR-4 model in every presentation path.
- The tube scope and all `optic-*` parts are removed. The upper silhouette uses a low top rail plus compact `rear-sight-*` and `front-sight-*` iron-sight parts.
- Preserve the refined stock, receiver, handguard, barrel, magazine, pistol-grip and support-grip proportions without moving functional hand, reload or muzzle anchors into renderer-specific code.
- `careerAr4ModelAudit()` must report `scopeRemoved`, `lowProfileSights` and the retained rounded/cylindrical coverage. Run it with attachment, loadout, slot, switching and mobile Armoury checks.
- Build 12.19 is visual only. Do not change weapon balance, inventory, AI, armour, economy, save schema 19 or diagnostics schema 1.

## Build 12.18 AR-4 procedural model contract

- `js/35-career.js` remains the sole source for AR-4 identity, dimensions, materials and part placement. Do not add a separate first-person or third-person rifle model.
- Shared weapon parts may declare `shape: box`, `rounded` or `cylinder-length`. Management CSS, first-person WebGL and operator-held WebGL must all consume that metadata.
- AR-4 core surfaces use rounded procedural geometry; barrel, gas tube, stock rail, muzzle and optic tube use cylindrical geometry. Distant LOD may simplify shapes but must retain the connected stock/receiver/handguard/barrel/grip silhouette.
- Preserve `careerWeaponGripPart()`, `careerWeaponSupportPart()`, `careerWeaponVisualBounds()`, magazine/reload movement, model-derived muzzle flash placement and Build 12.17 primary/sidearm switching.
- Preserve `careerAr4ModelAudit()` and expose it as `ar4WeaponModelForTest()`. Run it with `operatorWeaponAttachmentForTest()` and `operatorWeaponLoadoutMappingForTest()`.

## Build 12.17 primary/sidearm and communication contract

- Every operator has `equippedPrimaryWeaponId`, `equippedSidearmId` and `equippedArmourId`. A pistol-only operator has no dedicated primary and uses the sidearm as the active main weapon. A sidearm is always required.
- Save schema 19 migrates schema-18 and older careers. Legacy pistols become sidearms; legacy rifles remain primaries and gain the starter Scrapline sidearm. Keep `equippedWeaponId` only as a compatibility active-weapon value.
- Finite inventory ownership applies across both weapon slots. One physical copy cannot be issued to two operators or to both slots beyond the owned count. Normalisation and transfer logic must count primary plus sidearm assignments.
- `CAREER_WEAPON_CATALOG` must communicate `slotType`, range, damage, magazine, penetration, movement cost, description, `benefits` and `drawbacks` for every player-obtainable model. Store and loadout cards must display these without relying on colour alone.
- The AR-4 must retain meaningful movement, turn, moving-accuracy, sprint-settle, fatigue, reload and noise costs. Pistols retain faster draw/handling and no movement penalty. Do not balance solely through price.
- AI weapon switching is situational: emergency close contact, unsafe empty-primary reload and range recovery. It must preserve independent primary/secondary magazines and reserves, record `weapon_switched`, and expose a human-readable tactical reason without revealing unseen enemies.
- Spectator HUD must show HP and current/max armour integrity together. Portrait telemetry must retain the compact `HP · ARM` readout. Unarmoured operators hide the bar rather than displaying fictitious protection.
- Post-match tracking retains primary/sidearm IDs, switch count and sidearm draws. The player debrief should communicate sidearm use when it occurred.
- Run `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()`, `weaponSwitchingForTest()`, `spectatorArmourHudForTest()`, mixed-loadout mapping, schema-19 round trips, live combat switching, mobile loadout/store checks and every retained 12.16–12.08 regression.

## Build 12.16 match-long armour attrition contract

- `CAREER_ARMOUR_CATALOG` is authoritative for store price, class, protection, rating, integrity, movement, handling, fatigue, coverage and role-fit copy.
- Every purchased armour item is one finite `careerState.armourInventory` entry. One copy may be assigned to one player through `equippedArmourId`; `none` remains unlimited. Save schema 19 must migrate schema-18 and older saves without inventing owned armour or weapon assignments.
- Protection applies to torso hits only. Headshots bypass. Use graded penetration rather than immunity or a binary pass/fail. Resilience applies before armour.
- Armour integrity persists through round resets for the full match. Only creating a new match services surviving armour to full. Integrity reaching zero permanently removes an owned copy, unequips the player and logs `armour_broken`; destroyed opposition armour also remains absent for later rounds of that match.
- Armour weight must create bounded movement, handling and post-match fatigue trade-offs. Heavy armour may never be a universal upgrade.
- Living operators and corpses visually distinguish no armour, light, medium and heavy equipment without changing collision/hitboxes.
- Diagnostics schema remains 1 with optional armour identity, integrity, absorption and break fields.
- Run `armourSystemForTest()`, `armourMatchAttritionForTest()`, `seedArmourLoadoutsForTest()`, `armourLoadoutMappingForTest()`, `equipPlayerArmourForTest()`, schema-19 round-trip checks, store/loadout mobile checks, a live combat smoke test and every retained 12.15–12.08 regression.

## Retained Build 12.14 weapon attachment integrity contract

- Shared career/NPC sidearms and the AR-4 must use their authored weapon parts in Armoury, first person, living operators and corpses.
- Resolve the AR-4 dominant hand from `pistol-grip` and its support hand from `support-grip`; pistols use their authored grip assembly.
- Third-person hand anchors and muzzle flash positions must be calculated from the same model scale/origin used by `drawUnifiedCareerWeapon()`.
- Do not double-apply `bodyBob` to operator hands.
- Far/constrained LOD may remove cosmetic fittings, but must retain the AR-4 pistol/support grips and all core silhouette parts.
- Run `operatorWeaponAttachmentForTest()` and a mixed five-operator `operatorWeaponLoadoutMappingForTest()` before release.
- This is render-only. Do not change damage, accuracy, fire rate, range, inventory ownership, AI strength or save/diagnostic schema.

## Retained Build 12.13 tactical readability and coaching contract

- Deployment preview data and the first-round simulation must share the same arena engagement plan and numbered objectives. Preserve `clubSuggestedOpeningPlan()`, the captured `openingPlanId` and `openingPlanParityForTest()`.
- Live owned-operator explanations expose current action, human-readable reason, visible target, current/preferred range, selected team instruction and route intent. Do not reveal unconfirmed or unseen opponent information.
- Completed career matches persist owned `operatorAnalysis`; post-match intent rows and role cards must be derived from actual diagnostic summaries, zone analytics and AI stability rather than invented outcomes.
- Coaching controls navigate to Tactics, Training or a player Loadout and highlight the destination. They are navigation only: never auto-apply a plan, allocate development points or change equipment.
- Run the five Build 12.13 feature tests, a completed three-round report flow, responsive deployment/report checks and all retained AI/map/runtime regressions.

## Retained Build 12.12 AI pacing and team-spacing contract

- Start the shared AI work budget once per rendered frame, not once per fixed substep. Preserve urgent allowances only for genuine immediate combat/reload/health conditions.
- Broad challenger scans and ordinary tactical reconsideration consume quality-tier slots. Never budget away per-frame current-target LOS, pending-candidate LOS or the ability to complete initial recognition.
- Combat approach/flank recovery may evaluate bounded cheap candidates but must run no more than one shared, budgeted A* search per request. Keep `combatRouteSearches`, deferrals and candidate counts visible in diagnostics.
- Team spacing is tactic- and role-aware. Stay Grouped remains compact with a non-overlap floor; Trade, Hold and Flank widen lanes. Do not turn spacing into a universal wide formation or remove tactical distinctions.
- Regroup/follow points, dynamic navigation goals and traffic costs must account for teammate positions, reserved goals, next waypoints and duplicated firing lanes. Separation moves remain collision-tested and balance-neutral.
- Run `botWorkBudgetForTest()`, `combatRouteBudgetForTest()` and `teamSpacingForTest()` plus Dune/Office map audits, target-acquisition/occlusion checks and a multi-round combat simulation.

## Retained Build 12.11 first-elimination stability contract

- `drawCorpse()` owns its LOD flags. Declare `mediumDetail` and `fullDetail` from the corpse distance tier before any conditional corpse accessory draw. Never reference `drawSoldier()` locals.
- A first elimination must render the complete scene without throwing. Test all three corpse poses at near, medium and distant LOD with `corpsePresentationForTest()` and run `firstEliminationContinuityForTest()`.
- The main animation loop must always queue the next frame in `finally`. Record bounded fault details through `recordRuntimeFault()` and expose them in diagnostics rather than allowing an exception to terminate the loop silently.
- Runtime-fault capture is diagnostic only. Do not mutate balance, skip simulation work or hide a reproducible error as an optimisation.

## Retained Build 12.10 combat-perception hotfix contract

- Never clear an unconfirmed visible `sightCandidate` solely because the current frame is not scheduled for a broad opponent scan. Revalidate that candidate every frame and let recognition time accumulate continuously.
- Broad scans are for finding challengers; they are not the clock for initial reaction. Current-target and pending-candidate line of sight remain live and authoritative.
- If an enemy directly occludes the currently tracked enemy and is itself visible, allow an immediate close-threat retarget. Friendly body occlusion must remain blocking.
- Run `staggeredPerceptionAcquisitionForTest()`, `closeThreatRetargetForTest()` and `operatorViewOcclusionForTest()`, then a Dune simulation that records target changes, tactical changes and damage/eliminations.

## Retained Build 12.09 match intelligence, motion and performance contract

- Full line-of-sight validation for the currently engaged enemy remains per-frame and authoritative. Broad enemy scans may be staggered using `runtimePerceptionInterval()`; do not let a cached target fire through a wall.
- Preserve target commitment (`targetCommitUntil`), stronger challenger margins and immediate-threat overrides. Preserve tactical commitment floors in `setCombatTactic()`.
- `resolveCommittedNavigationGoal()` must validate local clearance and team-mate reservations before the single bounded A* request. Do not reintroduce fallback-search rings or per-frame repeated A*.
- `runtimeQualityTier` is a reversible measured governor, not a saved graphics setting. It controls distant operator/weapon LOD, broad perception cadence, path-plan budget and the adaptive-resolution floor. It must not change game balance.
- Keep the new body animation state: `bodyLeanBlend`, `turnAnticipationBlend`, `footPlantBlend`, `aimStabilityBlend` and `breathingPhase`. These affect presentation only.
- Acceptance must include forced constrained-mode tests as well as ordinary mobile testing. One high-end phone is evidence, not the performance baseline.

## Retained Build 12.08 operator silhouette contract

- Retain the custom asset-free WebGL renderer. Build 12.08 is a procedural model-quality pass, not an engine migration.
- `js/60-renderer-core.js` owns the rounded superellipsoid, tapered capsule and shaped torso mesh generators plus `drawAnatomicalSegment()`. Initialise those meshes once in `js/61-world-renderer.js`; do not generate geometry per operator or per frame.
- `js/62-character-renderer.js` must use the same upgraded body surfaces for living operators and corpses. Major torso, pelvis, boots, armour, pouches and fittings should not revert to raw cube geometry.
- Preserve the authoritative two-bone leg rig, locomotion/aim blending, reload poses, hit reactions, death phases, weapon anchors, broad-shouldered readability and existing operator height.
- This pass is cosmetic only. Do not change collision radius, hit detection, line of sight, navigation, combat values, progression, economy or save schema to match the visual mesh.
- Keep the body pass draw-call neutral by replacing meshes on existing draws. Shared geometry may add vertices, but not per-frame allocations or duplicate anatomy layers.
- Preserve `operatorSurfaceGeometryAudit()`, `operatorModel()` and `operatorPresentationForTest()` as regression/inspection hooks.
- Validate the self-contained build in WebGL at mobile landscape dimensions and retain adaptive resolution behaviour.

## Build 12.07 Dune Bastion contract

- Map 3 is **Dune Bastion** (`ARENA_LIBRARY.dune`), not Summit Terminal. Do not restore Summit platforms, stairs, railings, elevation layers or current-map routing assumptions unless a later deliberate redesign explicitly replaces this contract.
- Dune is one floor with no doors or stairs. Keep it 36 × 24, left/right symmetrical and one connected navigation component.
- Visible canopy posts, masonry-arch posts and freestanding banner masts have small matching authored colliders. Overhead fabric, banner cloth/tails, arch emblems, lintels and wall-top decoration remain non-blocking.
- Every freestanding banner must visibly connect from its grounded stone foot through a continuous mast to its crossbars. Its `banner-post` collider must align with that mast/base.
- Every arch inner lintel must overlap/touch the main masonry. Teal landmark emblems must be flush plaques with backing on an arch face, never detached roof-line blocks.
- Preserve the Build 12.05 presentation vocabulary and Build 12.06 alignment fixes: perimeter crenellations, exterior dunes/rocks/towers, patterned paving/rugs, wall-backed braziers with mounting plates, striped canopies and high-detail asset-free desert props.
- New solid props (`supply-cart`, `crate-stack`, `amphora-cluster` and additional sandbags) require mirrored authored footprints. Exterior backdrop, rubble, mosaics, cloth and wall-top crenellations are non-blocking presentation.
- Keep environment generation bounded. Do not add per-frame random geometry, image downloads, heavyweight meshes or dense particles to compensate for visual quality.
- Keep equivalent collision footprints mirrored across the centre line. Decorative colour variation is allowed; gameplay cover size and placement must remain balanced.
- Preserve long North Rampart sightlines, mixed Central Gate combat and protected South Bazaar/courtyard routes so current sidearms and future shotguns/precision weapons all have relevant spaces.
- Minimap and deployment preview must derive from the live Dune definition. Free Roam, matchmaking, reports and new saves use arena ID `dune`.
- Keep the `summit` → `dune` compatibility alias for older schema-17 saves. Historical Summit debug helpers are not current Dune release gates.
- `duneBastionAuditForTest()` must report one live navigation component, all five route bands, complete ordinary/support collision, eight wall-mounted braziers, all six banners grounded, all six arch attachment checks passing, zero support-to-prop overlaps and zero support-to-support overlaps.
- Required checks: `duneBastionAuditForTest()`, `duneDeploymentPreviewForTest()`, `arenaAuditForTest('dune')`, `engagementPlanAuditForTest('dune')`, `navigationBenchmarkForTest('dune', 160)`, Free Roam entry/export, mobile fit, state integrity, syntax, deterministic build and ZIP integrity.
- Career save schema remains 17 and diagnostics schema remains 1.

## Build 12.00 performance and Free Roam contract

- Keep performance work behavior-preserving: no weapon, health, accuracy, economy, reward, opponent-strength, tactical-weight or fixture-result changes belong in this pass.
- The static navigation cache may contain walls, static props, elevation-valid edges and static penalties only. Keep teammate traffic dynamic and invalidate/rebuild when the arena changes.
- Do not restore the old repeated fallback A* ring. Resolve once inside the mover's connected component and respect the per-operator failed-goal cooldown.
- Use `diagnosticOrderedEvents()` / `diagnosticOrderedSamples()` when reading ring-buffer data. Preserve full-match cumulative event counts and diagnostics schema 1.
- Keep scheduling gaps separate from active update stalls and preserve runtime stage timings in exported reports.
- Free Roam must be launched from Configuration, support every arena, use operator-sized collision plus authoritative doors/stairs/elevation, and remain isolated from career/match state. It is not a noclip camera.
- Retain mobile controls, keyboard controls, map toggle, exit and position export. Test 320–430px portrait and 844×390 landscape with no document overflow.
- Required checks include all map/state audits, navigation benchmarks, diagnostic ring ordering, Free Roam enter/move/stair/exit behavior, syntax, deterministic build and ZIP integrity.

## Build 11.98 Summit-presentation and inbox-separation contract

- Use `summitPlatformRailSegments()` as the platform guardrail authority. Every authored stair top must have a visible opening; do not draw an uninterrupted horizontal rail across a landing.
- Platform balustrades require vertical posts and framed panels, and stair rails must follow the incline on both sides. All of this is render-only and must not create collision or narrow the audited stair corridor.
- Summit zone-floor overlays require temporary blending. Summit floor patches and lane strips must use `arenaElevationAt()` so presentation stays on the correct floor. Keep the revised neutral slate/teal/orange palette and subdued grid treatment.
- Inbox list/reader separation is a styling change only. Keep the two-row 152–156px list viewport and all messages scrollable.
- Preserve `summitPresentationAuditForTest()` plus all retained Summit vertical/stair-only, Office, state-integrity, mobile-width, source/standalone syntax and deterministic-build tests.
- Save schema 17 and diagnostics schema 1 remain unchanged.

## Build 11.97 stair-only access and tactical-flank contract retained (current two-stair geometry)

- Every Summit floor change must pass through one of the two authored ramp corridors. Keep `arenaElevationTransitionAllowed()` active in both navigation and real swept movement.
- Do not smooth away stair waypoints. `prepareNavigationPath()` must retain the raw valid A* sequence for elevation-changing routes; direct side-climbs and diagonal platform-edge shortcuts are release blockers.
- Cross-floor combat approaches use `combatApproachKind = 'vertical-transition'` and ordinary A* stair paths. Preserve visible **STAIRS** status and all normal emergency/contact interruption rules.
- A verified flank uses `combatApproachKind = 'tactical-flank'`. Do not count generic repositioning, firing-angle changes, lane yields or recovery paths as flanks. Flanking may be encouraged by role/tactics but must never grant hidden combat bonuses.
- Preserve `summitStairOnlyAccessAuditForTest()`, `summitCrossFloorCombatRouteForTest()`, `summitTacticalFlankForTest()`, `summitLoggedGoalRecoveryForTest()` and repeated `summitStairTraversalSimulationForTest()`.
- Full-match diagnostic `eventCounts` must survive detailed-event overflow. Counter totals are summary-only when a semantic event already exists. Save schema remains 17 and diagnostics schema remains 1.

## Build 11.96 Summit two-level terminal contract retained (stair count superseded)

- Summit has exactly two playable floor heights: ground (`0`) and one shared upper elevation (`0.78`). Both Upper Gallery and Skybridge platforms must remain on that same upper floor.
- Both retained Summit stairs must begin at ground level and finish at the shared upper elevation. Preserve clear stair mouths, straight elevation progression, flush landings and zero stair collision bodies.
- Summit ceiling/wall height comes from `ARENA_LIBRARY.summit.ceilingHeight` and must leave at least `2.55m` above the upper deck. Do not lower the roof back to the global Citadel height.
- Summit's `summit` theme is deliberately cleaner and brighter than Citadel: architectural panels, glass balustrades/skylights and teal/orange navigation accents. Do not restore generic industrial pipes, grates, cable trays, hazard clutter or decorative floating walkways to this arena.
- Matchmaking preview must show `2 LEVELS`, two floor bands and two stairs. The tactical minimap must derive upper-floor outlines from the vertical profile rather than duplicate geometry.
- Preserve all fourteen route intents and existing combat interruption rules. Build 11.96 changes presentation/elevation consistency, not weapon, health, economy or hidden AI bonuses.
- Required regression helpers include `summitDeploymentPreviewForTest()`, `summitLayerRouteAuditForTest()`, `summitVerticalAccessAuditForTest()`, `summitStructuralIntegrityAuditForTest()`, `summitHotspotReachabilityAuditForTest()` and `summitRoutingPreferenceForTest()`.

## Build 11.95 Summit structural-integrity contract retained

- Elevated Summit platforms must be visually supported to ground level. Do not render an accessible platform as a thin floating slab with open void beneath it.
- Every Summit stair must use solid risers, a straight authored centreline and flush ground/platform thresholds. The lower stairs remain at `x=11.5` and `x=24.5`; route endpoints and preview markers must move with any future geometry change.
- Keep Summit stair mouths free of automatic doors and prop collision/presentation. Industrial props must respect authored dimensions and yaw so visuals do not overhang their collision footprints.
- `Bot.ensurePath()` retains bounded nearby-goal recovery for locally clear but graph-disconnected endpoints. Never replace it with direct-line fallback or unbounded searching.
- Friendly body obstruction remains realistic. Preserve the brief blocked-trigger retry and accelerated lane-clear request so diagnostics are not flooded by frame-by-frame duplicate attempts.
- Required targeted gates: `summitStructuralIntegrityAuditForTest()`, `summitVerticalAccessAuditForTest()`, `summitLayerRouteAuditForTest()`, repeated `summitStairTraversalSimulationForTest()`, all three opening-distribution cases, retained Office audits, state integrity, mobile-width checks, source/standalone syntax and deterministic build.
- Career schema remains 17 and diagnostics schema remains 1.

## Build 11.94 Summit vertical-access contract retained

- Preserve `ARENA_LIBRARY.summit.vertical` as the single elevation source for ramps/platforms. Operator models, camera height, tracers, objectives and elevated props must use `arenaElevationAt()` rather than separate hard-coded offsets.
- Summit stairs must begin at ground elevation, end at the matching platform elevation and remain clear along their full width. Do not place furniture/tanks on a stair approach.
- CATWALK, MAINT and SKYBRIDGE opening plans must call `prepareSummitOpeningTransitions()` after reset. Distant contact may not cancel an opening commitment before operators use the intended transition; close contact, recent damage, low health and urgent hunts remain valid overrides.
- All Summit hotspots and route endpoints must be directly clear and reachable. Preserve the regression against the removed `(17.5, 10.5)` hotspot.
- Required targeted gates: `summitVerticalAccessAuditForTest()`, `summitHotspotReachabilityAuditForTest()`, all three `summitOpeningTransitionForTest()` cases, `summitStairTraversalSimulationForTest()`, all three `summitOpeningDistributionForTest()` cases, engagement-plan audit, state integrity and retained Office audits.
- Career schema remains 17 and diagnostics schema remains 1.

## Build 11.93 Summit preview, routing and inbox contract retained

- Summit Terminal deployment cards must retain the two labelled preview bands, two stair markers, `2 LEVELS` badge and feature tags. The tactical minimap continues to derive from authoritative arena geometry.
- `SUMMIT_LAYER_ROTATION_ROUTES` and `Bot.updateSummitLayerRotation()` own quiet mid-round layer changes. Range/role preferences are advisory movement choices only; they must not add damage, health, accuracy or hidden-information bonuses.
- Confirmed targets, remembered contact, combat-approach routes, late-round goals and urgent hunts interrupt Summit rotations. Keep the two-rotator team cap and route cooldowns.
- Summit stairs marked `walkable: true` are visual traversal cues and must not create collision bodies. Preserve `summitLayerRouteAuditForTest()`, `summitRoutingPreferenceForTest()` and `summitDeploymentPreviewForTest()`.
- The inbox list shows exactly two rows before vertical scrolling on phone and wider layouts. Do not hide messages or truncate the underlying array.
- Save schema 17 and diagnostics schema 1 remain unchanged.

## Build 11.92 summit-terminal map contract retained

- Do not use a full-frame pseudo-element merely to show the windowed spectator label. The windowed `.match-view::before` must reset inherited vignette geometry/background; preserve 0.035 scanline opacity and the modest canvas brightness lift.
- Courtyard rotation scoring must favour, not penalise, a selected Courtyard plan. Committed routes survive weak sound/transient sight cues but still cancel for confirmed/remembered contact, combat emergencies and urgent late-round states.
- Both Office courtyard opening plans must retain at least two reachable cross-centre objectives per team. While a courtyard rotation is active, its route goal takes priority over an older opening objective. Preserve `officeCourtyardOpeningTraversalForTest()`.
- Keep the Gold Coin quantity fully readable at every phone width. Decorative icon/labels may collapse before the numeric balance. Foundation and subsection rows may not produce document-level horizontal overflow.
- The viewport export remains active-session diagnostics. The After Action button must call `exportLastCompletedMatchDiagnostics()` and prioritise the match being reviewed.
- `supporterState()` is the one fan model. Preserve gradual fanbase, popularity, confidence, loyalty, season expectations and compact histories through save round trips. Never create display-only fan numbers or hidden match bonuses.
- Create a finish expectation when a club is founded and at each new season. Reactions to matches, signings, departures and sponsorships must be contextual and bounded.
- Preserve `supporterCultureForTest()`, post-match download verification, all Office/courtyard audits including opening traversal and 320/375/390/402/430 width checks.
- Career save schema remains 17 and diagnostics schema remains 1.

## Build 11.90 door-pocket and AI-stability contract

- The doorway artifact reported as a wall-mounted TV was an open automatic-door panel rendered outside the visible aperture. Preserve full `doorPanelDescriptors()` for opening collision and use `visibleDoorPanelDescriptors()` for rendering only the portion still inside the opening.
- Every Office door must show 0.86m of combined panel width when closed, retract monotonically and show no panel when fully open. Preserve `officeDoorPocketAuditForTest()` across all eight doors.
- Keep the five authored blue wall displays shallow and wall-backed. Do not remove or relocate them to mask a sliding-door presentation bug; retain `officeWallDisplayAuditForTest()` and `officeScreenAuditForTest()`.
- Same-intent moving support goals must reuse a useful active path for a bounded period. Do not restore quarter-second objective chasing or disable regrouping entirely. Preserve `coordinationPathReuseForTest()` and existing emergency/contact overrides.
- `navigationPlansExecuted`, `navigationPlanDeferrals` and `navigationPathHoldReuses` are summary-only diagnostic counters. They remain available in counter deltas but must not consume retained event slots as repeated `counter_increment` records.
- Required targeted checks: door-pocket audit, wall-display audits, coordination path reuse, diagnostics export/counter summary, full Office clearance/rotation audits, state integrity, source and standalone syntax, deterministic build and ZIP integrity.
- Save schema 17 and diagnostics schema 1 remain unchanged.

## Build 11.89 Office-clearance and minimap contract

- Preserve one authoritative Office prop/collider source. The tactical minimap and deployment preview must reflect current arena geometry; never add a separate desk list to make the map look correct.
- Six Office desks intentionally remain. Future changes may move/remove them only in `ARENA_LIBRARY.office.props`, followed by collider, renderer, minimap and route regression checks.
- `officeFurnitureClearanceAuditForTest()` is the release gate for all six desks, eight door approaches, protected direct transit corridors, every Office engagement plan and all four courtyard rotation lanes. Keep `officeWalkwayAuditForTest()` backward compatible and require the comprehensive audit inside it.
- Every engagement-plan objective must be directly clear and reachable from its corresponding spawn. Do not rely on `nearestWalkablePoint()` silently relocating a blocked authored objective.
- Office static minimap furniture should remain visually subordinate to walls/operators: preserve low-opacity fill plus a fine outline. Dynamic door panels remain high contrast and the collider count/geometry must stay accurate.
- Required targeted checks: `officeFurnitureClearanceAuditForTest()`, `officeWalkwayAuditForTest()`, `engagementPlanAuditForTest('office')`, `officeCourtyardRotationAuditForTest()`, `doorPlacementAuditForTest('office')`, `officeWallDisplayAuditForTest()`, minimap presentation/rendering and mobile overflow.
- Save schema 17 and diagnostics schema 1 remain unchanged.

## Build 11.88 dynamic-strength and supporter-expectation contract

- Preserve one authoritative live club-strength calculation in `js/39-opposition-intelligence.js`. Ratings must respond to current roster ability, form and readiness, while rival development/decline changes underlying operators over time. Do not fake movement by adding random display-only rating noise.
- Stars are an absolute half-star grade across the full pyramid. Division 3 should generally remain low (the seeded release range is approximately 1.0–2.5 stars), not be stretched to fill a five-star scale.
- Supporter expectation must compare both clubs plus a modest home adjustment and communicate proportional pressure. It may change supporter confidence after the result, but must never change health, damage, accuracy, AI raw stats, rewards or the winner.
- Keep Command HQ, League and Tactics on the same expectation snapshot and keep detailed scouting reusable across League, Tactics and Staff. Avoid creating a second rating or expectation formula in a UI module.
- Preserve Build 11.87 scouting balance: public baseline 22%, truthful progressive reveal, staff-quality depth caps and advisory counter-options only. Weak scouts omit information; they do not fabricate it.
- `oppositionScoutingState()` and `supporterState()` must normalise by mutating/preserving the current object identity. Nested calls such as wage checks, mail creation or expectation calculation must not invalidate an in-progress appointment or confidence update.
- Preserve `oppositionIntelligenceForTest()`, `oppositionPersistenceRoundTripForTest()`, `oppositionIdentityMatrixForTest()`, `processOppositionScoutDayForTest()`, `hireBestOppositionScoutForTest()`, `setOpponentStrengthForTest()`, `developRivalsForTest()` and `settleSupporterExpectationForTest()`.
- Required release checks: all 19 identities unique; scout depth growth/persistence; low Division 3 rating distribution; strong/weak expectation thresholds; actual rival roster development; supporter-confidence reaction; Command/League/Staff/Tactics mobile geometry; state-integrity and Office rotation audits; syntax, deterministic build and ZIP integrity.
- Save schema 17 and diagnostics schema 1 remain unchanged.

## Build 11.87 rival-identity and scouting contract

- Rival identity must affect existing tactical AI controls only. No identity receives hidden health, damage or economy bonuses. Adaptive/Burst changes are bounded between-round plan variants.
- Opposition Scouts cost an appointment fee and wages. Higher Analysis, Opposition Knowledge, Tactical Advice and Network improve truthful report progress and specificity over calendar days. Releasing a scout retains information but allows gradual freshness decay.
- Counter-suggestions route to existing Tactics, Operators or Armoury decisions and never apply themselves automatically.

## Build 11.86 multi-kill, profile-consolidation and loadout-autosave contract

- Multi-kill events are manager-owned-team rewards only. A chain requires the same owned operator, the same round and no more than 18 simulation seconds between qualifying eliminations. Record cumulative tiers at 2/3/4/5 kills as Double/Triple/Ultra/Rampage; reset naturally on timeout, round reset or a different operator. Never infer or award chains from opponent kills.
- Preserve the exact tier values: Double 1 GC + 8 Team XP + 1,500 CR; Triple 2 GC + 16 XP + 3,000 CR; Ultra 3 GC + 28 XP + 5,000 CR; Rampage 5 GC + 50 XP + 9,000 CR. A Rampage chain earns every reached tier. Settlement remains end-of-match and additive to existing result/commercial rewards.
- Keep `#multiKillBanner` non-blocking and queued. Rapid tier events must display in earned order and must not pause simulation, cover essential controls or survive a new match.
- Individual telemetry belongs inside the contracted player's `profile` route. Keep Team Telemetry as an aggregate route, route player rows/live spectator context to Profile & Data, and retain `player-telemetry` only as a backward-compatible redirect. Do not recreate a duplicate generic telemetry page.
- Profiles must keep performance, condition, medical state, development, reflections, loadout context and multi-kill honours together. Consolidate future player-specific data into that record unless it genuinely needs a team/club aggregate surface.
- Weapon issue/reassignment autosaves immediately through the authoritative equip path. Loadout is not a management draft and must not trigger Save Changes, Remove Changes or unsaved-navigation warnings. Preserve live-match locks, finite-copy reassignment and tactical-confirmation invalidation.
- Preserve `multiKillRewardForTest()`, `multiKillSequenceForTest()`, `multiKillSettlementForTest()`, `playerProfileConsolidationForTest()` and the updated `equipPlayerWeaponForTest()`. Run opponent-filter, timeout, queue, cumulative-reward, legacy-route, profile-embedding, persistence/workflow-cleanliness, mobile geometry, syntax, deterministic-build and retained state-integrity checks.
- Save schema 17 and diagnostics schema 1 remain unchanged.

## Build 11.85 tactical intervention and debrief contract

- `js/40-match-flow.js` owns the between-round intervention state. A non-final round may not auto-start while `betweenRoundTacticsState.resolved` is false. Keep Plan is a valid resolution and must not be hidden or made conditional.
- Limit the manager to two changed categories from approach, engagement range and collective priority. Apply changes to the transient `activeMatchPlan` only; do not mutate saved baseline tactics, natural roles, weapons, health/damage or AI knowledge. Reapply the resulting active plan when the next round's bots are created/reset.
- Store only compact intervention history in `activeMatchPlan.adjustments` and the completed match report. Treat the array as optional for old saves/reports. Do not bump schema 17 for this feature.
- `buildTacticalMatchAnalysis()` must provide What Worked, Biggest Issue and Next Manager Action before the detailed report. Conclusions require visible evidence and accurate thresholds; accuracy criticism requires at least eight shots.
- Keep the mobile topbar order Back → Gold → shortcuts → End Day → Forward. Forward is flush to the far-right edge and End Day owns the wider preceding column at 361–430px. At 360px and below End Day stays on its full-width second row. Preserve real history enabled/disabled states.
- Preserve the Build 11.85 debug helpers and run two-change, third-change rejection, Keep Plan, adjustment-log, causal-analysis, history restoration and 320/375/390/430 plus mobile-landscape geometry tests. Run all retained state-integrity, draft-save, Office-rotation and deterministic-build checks.
- Save schema 17 and diagnostics schema 1 remain unchanged. Do not combine this phase with unrequested balance/economy changes.

## Build 11.84 readability and recovery contract

- Keep the management priority strip factual and state-driven. Required actions come from existing blockers and deployment readiness; recommended actions come from the existing Command Centre recommendation logic. Opening a route is navigation only and must not clear the underlying condition.
- Keep overview pages useful at a glance: three section-specific conclusions and actions appear before a collapsed all-pages directory. Do not expand every secondary statistic or route by default on phone layouts.
- Preserve the early-career Foundation Plan. It is guidance, not a hard progression gate, and should emphasise only the next incomplete opening-week step.
- Career export/import and restore are owned by `js/35-career.js`. Exports use the `strikewatch-career` JSON wrapper, imports also accept a raw career object, and normalisation remains authoritative. The active career must be retained as the restore point before a successful import or restore swap.
- Preserve the active-save, backup and metadata keys: `strikewatchCareerV1`, `strikewatchCareerBackupV1` and `strikewatchCareerSaveMetaV1`. A full New Team / Reset removes all three; ordinary autosaves rotate only a distinct previous active save into backup unless an import/restore has protected that restore point.
- Build metadata is authored in `js/00-core.js`; `build.py` derives the standalone filename and verifies the versioned asset references. Generated files remain read-only outputs.
- Preserve the Build 11.84 debug helpers and test the new UI/recovery flows at 320/375/390/430 portrait widths and mobile landscape, alongside all retained routing, draft-save, state-integrity and deterministic-build checks.
- Save schema 17 and diagnostics schema 1 are unchanged. Do not combine this UX pass with unrequested balance, AI, economy or reward changes.

## Build 11.83 action-routing viewport contract

- Management arrivals and attention-card routes must never call vertical `scrollIntoView()` on a target inside Command HQ. Use `scrollCommandContentTargetIntoView()` so only `.menu-content` moves.
- Keep document, `#menuShell` and `.menu-layout` scroll offsets at zero. The manager topbar and section navigation must remain visible after every notification, blocker and attention-card click.
- Horizontal subnav selection may change `#menuSubnav.scrollLeft` only; it must not scroll the shell vertically.
- Preserve `restoreCommandViewportOrigin()`, `menuViewportIntegrityForTest()` and `scrollManagementTargetForTest()`. Validate routed targets at 320/375/390/430 portrait widths, including a target low on a long page.
- Do not regress the Build 11.82 header grid or the Build 11.78 exact-action routing/save-state rules. Save schema 17 and diagnostics schema 1 remain unchanged.

## Build 11.82 mobile header contract

- `css/game.css` owns the final portrait-header grid override. At up to 430 pixels, Back, Gold, shortcuts, End Day and Forward must occupy separate grid columns with no absolute overlap.
- Keep `#menuEndDayBtn` integrated at exactly the header height, centred and bounded. The complete blocker explanation remains accessible even though the visible subtitle is shortened.
- Preserve 320/375/390/430 portrait fit, a 54-pixel primary header row, the intentional 44-pixel End Day second row at 360px and below, one End Day button, white shortcut icons and all Build 11.81 match analytics/AI behaviour.

## Build 11.81 match-flow and analytics contract

- Keep zone analytics observational. `diagnosticRecordDamage()` attributes impact damage to the target's current map zone; sample aggregation records operator/combat/contested/congestion seconds without changing movement, target choice or match settlement.
- Preserve tactical stability guards: near-identical coordination goals reuse the active path, ordinary routes hold longer, non-urgent combat decisions have a longer cadence and combat-approach paths tolerate modest target movement. Urgent contact, blocked routes, critical health and reload safety must still interrupt immediately.
- Only compact `zoneAnalysis`, `fightLocation` and `aiStability` summaries may enter the latest career report. Never persist the raw diagnostics event/snapshot payload in career state.
- Preserve `zoneAnalyticsForTest()`, `zoneAnalyticsScenarioForTest()`, `aiStabilityForTest()` and `coordinationPathReuseForTest()`, plus all Build 11.80 Office rotation and Build 11.75 planner tests.
- Build 11.81 keeps save schema 17 and diagnostics schema 1 and changes no balance, economy, rewards or damage values.

## Build 11.80 Office mid-round rotation contract

- Office courtyard rotations are authored in `js/30-bot-ai.js` and must remain knowledge-safe: use personal contact silence, friendly positions/objectives, role, current zone and route staleness only. Never use enemy state that the bot has not legitimately seen or heard.
- Keep the two-stage entry/cross route, simultaneous-team cap, contact interruption and route timeout. Do not turn the courtyard into a compulsory scripted route or override urgent hunt/combat behaviour.
- Preserve `OFFICE_COURTYARD_ROTATION_LANES`, `officeCourtyardRotationGeometry()`, `officeCourtyardRotationAuditForTest()`, `officeCourtyardRotationDecisionForTest()` and `forceOfficeCourtyardRotationForTest()` plus the existing Office walkway, door, engagement-plan and minimap invariants.
- Build 11.80 keeps save schema 17 and diagnostics schema 1. Optional rotation diagnostics are observational only.

## Build 11.78 workflow-integrity and save-state contract

- `js/39-workflow-integrity.js` is the central authority for actionable management notifications, exact destinations, arrival banners, target highlighting and reversible management drafts. Route badges and blockers must open the specific player, message, transfer, sponsor, report or recommendation represented by the alert rather than a generic nearby page.
- `managementActionItems()` derives actions from live career state. `openManagementAction()` preserves the originating route in history, selects the relevant entity, renders a matching arrival banner and highlights the destination through `data-management-target-id`. Opening an alert never clears it by itself; the underlying condition must actually be resolved.
- Starting-five order, formation/roles/team tactics and training programmes are staged in memory. Their persistent career values change only after the matching **Save Changes** action. **Remove Changes** restores the persisted state, and navigating away with pending changes opens a discard/continue guard. Build 11.86 loadout changes persist immediately and are excluded from this draft contract.
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

- Keep `menuSections` authoritative. Primary sections open `play`, `team-hub`, `armoury-hub`, `supplies-hub` and `club-hub`; overview cards and the Command Index must derive destinations from the same route metadata.
- Preserve the compact route locator and persistent section subnavigation on every Command HQ page. Major pages should be available within two taps of a primary section, with 44-pixel primary controls and no document-level overflow at 320/375/390/430 portrait widths.
- Treat `profile` and `player-telemetry` as context-only pages: show them in section subnavigation only while active, retain them in history/player controls, and omit them from the generic Command Index.
- The generated Command Index includes search, recommended actions, recent routes, route status, badges and locked/context explanations. Search filters the generated cards and must not duplicate route definitions.
- Notification badges are read-only summaries of existing state. Opening Reports may mark the current report reviewed, but navigation rendering must not mutate finances, transfers, training, inventory, match state or diagnostics.
- Preserve `commandIndexForTest()`, `navigationDiscoverabilityForTest()` and `commandIndexSearchForTest()`. Require 24 authoritative routes, 22 top-level discoverable routes, five overview routes, correct context-route visibility, working Back/Forward history and a separate league/crate/door/Office/state-integrity regression.
- Keep career save schema 17 and diagnostics schema 1.

## Build 11.73 role-clarity, body-aware vision and header-navigation contract

- Present role suitability as a positive Role Effectiveness percentage with a plain full-performance comparison; never imply that the percentage directly changes weapon damage.
- Living operator silhouettes are part of visual perception. Do not let AI acquire or continuously track an enemy fully hidden by a standing friendly or enemy body. Partial side exposure and reduced crouched obstruction remain possible.
- Friendly body occlusion may cause a short lateral clearance movement derived from the last genuinely seen point. Never use the hidden target's live coordinates to choose that move.
- Keep Back and Forward at the left/right edges of the persistent manager topbar and keep the old main-menu history rail removed. Preserve accessible 44-pixel controls and route-history state.
- Preserve `roleExecutionCopyForTest()` and `operatorViewOcclusionForTest()` and run existing line-of-fire, league, crate and state-integrity checks before release.

## Build 11.72 club-identity, Supplies and Office-polish contract

- Keep the internal `store` route/state/source identifiers for compatibility, but expose it as the fifth main section, **Supplies**, with the route title **Supply Depot**. `menuSections` remains the navigation authority and the generated Command Index must cover every top-level route exactly once; context-only player pages remain intentionally excluded.
- `TEAM_LOGO_DEFS`, `normaliseTeamIdentity()`, `teamLogoSvg()` and `teamNameLockup()` own club-emblem identity. Five choices and a user-selected hex colour are persisted in optional schema-17 `teamIdentity`; older saves must receive safe defaults without advancing the schema. Do not duplicate logo SVG markup in other modules.
- Wall displays in Skyline Offices are decorative and non-colliding, but their shallow mesh and authored coordinates must remain flush to a real wall face and clear of walkable space. Run `officeWallDisplayAuditForTest()` and the existing Office walkway/door audits.
- Headshot feed presentation is a compact SVG badge driven by the authoritative `headshot` elimination flag. Do not infer headshots from damage or replace critical markers.
- All compact topbar action glyphs use the same white foreground. Typography increases are bounded floors for small supporting copy; reject changes that create navigation overflow, clipped creation inputs or reduced touch targets.
- Run an explicit no-change balance audit over cash awards, Gold Coin awards/crate price, weekly payroll/loan pressure, introductory Foundation Parity, league schedule integrity and portrait/landscape performance diagnostics. Any future numerical rebalance must be separately documented rather than hidden in this polish pass.


## Build 11.71 match-performance diagnostics contract

- Match diagnostics remain observational. `recordRuntimePerformance()` may forward actual RAF interval, frame work, update and render costs to `diagnosticRecordPerformanceFrame()`, but diagnostics must never influence adaptive resolution, simulation timing, AI decisions or career state.
- Use actual RAF interval for FPS/stutter reporting and keep frame work cost separate. Exclude frames outside the live match, hidden-page samples and active intervals above 250 ms from averages, count them separately, and do not hide ordinary 22/34/50/100 ms spikes.
- Aggregate overall and by `orientation:viewMode`, retaining viewport, visual viewport, browser/device capability metadata, native/effective DPR, resolution scale, target scale and drawing-buffer dimensions. Orientation or maximised/windowed changes during a match must produce separate segments and transition events.
- Bound the worst-frame list to 12 records and keep the existing 360-snapshot/1,800-event limits. Snapshot performance fields must be compact and JSON-safe.
- Preserve diagnostics schema 1, local-only export, summary storage key and save schema 17. Required helpers are `performanceDiagnosticsForTest()` and `diagnosticsPerformanceFrameForTest()` alongside the existing diagnostic export helpers.
- Release checks must parse exports from both modular and standalone builds, prove portrait and landscape segments can coexist, verify >250 ms/hidden exclusions, and run unrelated Build 11.70 headshot, Foundation Parity, adaptive-resolution and state-integrity regressions.


## Build 11.70 headshot, opening-balance and portrait-performance contract

- `Bot.shoot()` resolves hit chance first, then independent headshot and critical rolls. Apply the weapon location multiplier before the critical multiplier. Preserve regular body hits, critical body hits, headshots and critical headshots as four valid outcomes; a headshot must not imply a crit and a crit must not imply a headshot.
- Headshot probability comes from `headshotCombatProfile()` and is bounded. Marksmanship, weapon accuracy and a stable crouch can help; distance beyond the weapon's useful band and recoil heat reduce it. All owned and opposition weapons must define a headshot multiplier and use the same implementation.
- Keep headshot presentation and persistence complete: head-height tracer endpoint, `HEADSHOT`/`CRIT HEADSHOT` damage tags, HS elimination badge, round/match/career totals, diagnostics and debug output. Optional new fields must migrate through schema 17 defaults without schema advancement.
- `leagueFoundationBalanceProfile()` is narrowly scoped introductory protection. It can only lower an over-strength opponent in the user's first three Division 3 league fixtures, using a progressive cap of starting-five average +1, +2 and +3 on matchdays 1–3 within 16–30. Never apply it to exhibitions, later matches, higher divisions or an opponent already at/below the cap. Display its status during deployment.
- Mobile performance changes must reduce GPU/compositing pressure without altering simulation speed. Preserve the portrait DPR cap, sustained adaptive tiers and no-backdrop portrait chrome. A tier change may call `resize()` once; repeated per-frame drawing-buffer reallocations are a regression.
- Run deterministic headshot/crit arithmetic, both-team event tracking, first-three-fixture cap boundaries, portrait viewport/DPR checks at 320/375/390/430 and a real match stress pass. Then run unrelated doors, crate, transfer, league schedule and state-integrity regressions.


## Build 11.69 negotiation, recruitment-index and Office-polish contract

- Reuse the shared management popup for the full incoming recruitment response chain. `showIncomingTransferResponseModal()` must render a counter directly after submission; `handleTransferModalAction()` must update the same visible `#teamNoteOverlay` to agreed and completed states. Counter actions are **Back to Negotiation/Accept Counter-offer**; agreed actions are **Back to Negotiation/Complete Signing**; completed actions are **Close/View Squad**. Do not add an intermediate acknowledgement step.
- Accepting a counter copies the requested fee, wage and contract into the offered package while retaining signing bonus, appearance bonus and squad-status promise from the enhanced recruitment module. Back to Negotiation closes only the popup and preserves the active deal. Completion must still recheck transfer window, squad capacity, credits and wage headroom.
- Recruitment candidate rows require two visible star rows, ability and potential. Until scouting knowledge confirms the values, stars must reflect the displayed estimate midpoint rather than hidden exact ability. Preserve `recruitmentIndexRatingsForTest()` and verify every rendered candidate has both rows.
- The Calendar date remains a minimum 44-pixel actionable target, but `.manager-date-panel` must render without a pill/card border, rounded capsule, filled background or shadow. Preserve Calendar routing, accessible text, visible focus treatment and portrait header fit.
- Keep the Office conference table outside the primary east/west walkway and preserve `officeWalkwayAuditForTest()`. Office base flooring uses `OFFICE_CARPET_PRESENTATION`: dark alternating carpet-tile bands, subtle weave and high roughness, with courtyard and rug overlays unchanged.
- Required release checks include the actual submit → counter → accept → complete popup sequence, Back to Negotiation, two star rows per candidate, 320/375/390/430 date geometry/no overflow, Office route clearance/carpet metadata, syntax and deterministic build parity, plus unrelated door, crate, league and state-integrity regressions.


## Build 11.68 door and Training-route contract

- Office doors are functional level geometry, not decoration. Keep each authored opening between two wall cells and preserve `doorPlacementAuditForTest()` for all eight Skyline Offices doors. Renderer jambs, lintels, thresholds and moving panels must remain aligned with the same `ACTIVE_DOOR_STATES` used by collision, visibility and the minimap. Nearby desks and workstation pods must stay outside each door's approach and open-panel corridor.
- Doors reset closed at the beginning of a round. The first nearby living operator latches the door open for the rest of that round. Trigger one `doorOpen` cosmetic audio cue on the first opening transition only; do not restore delayed auto-closing or repeated sounds.
- The manager-feedback → Training route is an iOS-sensitive transition. Blur before hiding the modal, never programmatically focus the Training select on touch devices, avoid document-level `scrollIntoView()`, scroll only the `.menu-content` pane and keep the app/menu shell sized by the refreshed viewport CSS variable.
- Run `doorInteractionForTest()`, `doorPlacementAuditForTest()` and `managerTrainingTransitionForTest()` plus real portrait geometry checks at 320/375/390/430. Reject a build with a bottom gap, stale body lock, visible modal, focused select, detached door frame, repeated door sound or a door that closes after opening.
- Preserve all Build 11.67 crate/header, Build 11.66 accounts/finance, schema-17 save and diagnostics-schema-1 invariants.


## Build 11.67 crate hierarchy and header-polish contract

- Keep the Field Crate as one shared WebGL model. The root crate yaw must rotate the rear body-local hinge pivot before local lid pitch is applied; the lid, attached trim and support rails may never use an unrotated world pivot while the player drags the crate.
- Preserve `rewardCrateLidPose()`, `rewardCrateRailPose()`, `rewardCrateAttachmentAudit()` and `crateAttachmentForTest(yaw, openingProgress)`. Test closed, opening and fully open states over multiple clockwise and anticlockwise yaw values and reject any non-negligible hinge gap.
- The Gold Coin shortcut stays clickable, accessible and at least 44 CSS pixels, routes to `gold`, and shows the live balance, but its topbar presentation is flat and integrated rather than a rounded or heavily bordered pill. Do not remove its focus/active feedback.
- The top-right date shortcut stays clickable and routes to `calendar`. Show a zero-padded `DD MON YYYY` date in larger type with readable weekday/week/season metadata and maintain header/document fit at 320/375/390/430 portrait widths.
- Do not change reward odds, crate cost, cash/Gold separation, save schema 17, diagnostics schema 1 or Build 11.66 route/finance behaviour. Run targeted hierarchy/header checks, then a separate shared-canvas, league, management and combat regression pass.


## Build 11.66 navigation and finance-UX contract

- Keep the top-left Gold Coin block clickable through `#managerGoldBtn` and route it to the dedicated `gold` account page. Keep `#managerDatePanel` clickable and route it to `calendar`; the compact date copy is `DD MON YYYY` plus weekday/week/season.
- Do not duplicate route lists. `renderCommandFeatureDirectory()` must derive the Command Index from `menuSections`, so new routes become discoverable automatically. Every index button must use the existing route system and provide a readable purpose/status.
- Ordinary cash and Gold Coins are separate account experiences. `barracks` owns cash analytics and the cash ledger; `gold` owns Gold Coin sources, outgoings, examples, trend and ledger; `store` owns purchases. Cross-links must remain available between them.
- Finance analytics are derived from persisted transactions and are presentation-only. Preserve weekly flow bars, retained running balance, income/outgoing category breakdowns, loan data and up to 80 retained entries. New transactions include id/week/day/type/amount/label.
- Save schema 17 migrates schema 16 and earlier without losing cash, Gold Coins, pending crates, inventory, squads or league state. New clubs record the 350,000-credit foundation advance as an opening ledger entry.
- Preserve `commandIndexForTest()` and `currencyLedgerForTest()` alongside the finance and currency debug helpers so route discovery remains testable against the authoritative `menuSections` map.
- Run 320/375/390/430 portrait checks for header bounds, 44-pixel Gold/date targets, route navigation, account charts, Command Index coverage and document overflow. Then run an independent regression pass covering shared crate, weapon copies, 38-match league, doors, minimap and combat recovery.


## Build 11.65 shared-crate, counted-arsenal and full-season contract

- The Store does not own a separate chest illustration. `#careerCrateCanvas` is the single shared WebGL crate canvas and `syncCareerCrateCanvasHost()` moves that exact renderer between the Gold Coin Store preview and the post-match/store-opening overlay. Future crate surfaces must reuse the same model, materials, animation and claim path rather than introducing SVG/CSS substitutes.
- Dropped weapons are counted inventory copies. Repeated weapon rewards add another copy and never convert to XP. Each finite copy may be issued to one operator; when every owned copy is issued, equipping that model to another player transfers one existing copy and gives the previous holder a legal fallback. Scrapline remains unlimited standard issue. Duplicate cosmetic finishes alone convert to Team XP.
- The Armoury must show model count, owned copies, issued copies and free copies, and all affected player rows must update immediately after a transfer. Save schema 16 preserves repeated inventory IDs and normalises assignments so they never exceed the owned count. Schema-15 and older careers migrate without losing weapons, skins, pending crates, squads or league progress.
- `CAREER_WEAPON_CATALOG`, `careerWeaponVisualParts()` and the shared first-person/world/reward renderers are the only authorities for owned weapon identity and geometry. The AR-4 Sentinel is a low-per-shot-damage, controlled mid-range rifle with a 20-round magazine, slower handling/reload than a pistol, a `carbine` reload-audio profile and the same 34-part model in the Armoury, crate reveal, first-person view, live operator hands and corpses.
- `CAREER_CRATE_REWARDS` is now P12 Service 32%, Viper-9 32%, AR-4 Sentinel 14% and Urban Grid 22%. Store and victory crates use that exact pool. The existing 60-GC price remains unchanged.
- Every division contains 20 clubs and uses a 38-match home-and-away double round robin: 380 total fixtures, 38 user fixtures, 38 matchdays and two reversed-home fixtures for every unordered club pair. Promotion remains top two and relegation bottom two where another tier exists. Legacy seven-match league data is migrated into the expanded schedule while preserving completed results where possible.
- Required release checks include shared-canvas identity in Store and overlay, absence of the retired store SVG/CSS chest, repeated weapon acquisition, one-copy transfer, two-copy simultaneous assignment, assignment-count integrity, AR-4 catalogue/drop/reload/model coverage, 20-club/380-fixture pair auditing, 38-match UI copy, schema-15 migration, mobile Armoury fit, deterministic build parity and unrelated combat regressions.

## Build 11.64 Gold Coin economy and loot-shop contract

- Gold Coins (`goldCoins`) are a dedicated store currency and are not interchangeable with ordinary club credits. Transfer fees, wages, staff costs, loan repayments and sponsorship continue to use credits only.
- Every completed first-to-three match awards Gold Coins alongside normal cash income. League matches pay 3 participation coins, 1 coin per round won, 7 for victory and 2 for a clean sweep; exhibitions use 2 participation, 1 per round won, 5 for victory and 1 for a sweep. Defeats always earn less than victories but never zero.
- The active Field Crate costs 60 Gold Coins. This price is intended to require roughly four to six league victories for an additional purchased crate, while losses contribute more slowly. Victory crates remain free and unchanged.
- Store purchases use the exact same `CAREER_CRATE_REWARDS`, animation, three-dimensional renderer, duplicate conversion and claim logic as post-match victory crates. Do not create a separate store-only loot table or duplicate reward implementation.
- A purchased crate and its rolled reward are persisted in `pendingStoreCrate` before the overlay opens, so refreshing or leaving the page cannot consume coins without preserving the purchase. Claiming clears the pending purchase and returns to the Store.
- Build 11.64 used save schema 15. Build 11.65 now uses schema 16; schema-15/schema-14 careers migrate without losing Gold Coins, pending purchases, ordinary credits, squads, repeated weapon copies, skins, league data or diagnostics.
- The Command HQ top-left identity shows Gold Coins with the coin icon. Ordinary cash remains visible in Finances, recruitment, transfers and other relevant management screens.
- Required acceptance includes deterministic win/loss/sweep calculations, lower defeat awards, cash and Gold Coin settlement in the same report, insufficient-funds protection, single deduction per purchase, persisted pending crates, exact shared loot odds, duplicate conversion, Store return routing, responsive header/store layouts and save migration.

## Retained Build 11.63 dynamic-arena and cash-economy invariants

- Treat `ARENA_LIBRARY[*].engagementPlans` as authored opening-contact plans, not scripted combat outcomes. Maintain five objectives per team, validate them with `engagementPlanAuditForTest()`, and preserve the shuffled no-repeat rotation bag.
- Dynamic doors have one state shared by collision, visibility, minimap and rendering. A* may route through the doorway, while the closed panel blocks local movement and shots until proximity opens it. Test automatic opening, one-shot audio, wall attachment and latched-open behaviour on both arenas.
- Office prop additions must use matching collision footprints only where they physically block movement. Every information screen must be wall-backed; every spawn pair and every opening objective must remain connected.
- Preserve the two-second owned-operator death-camera delay before automatic spectator handoff. Do not let normal auto-spectate cycling bypass it.
- A defeat pays a small participation income, but total defeat income must be materially lower than victory income. Keep the report cash breakdown synchronised with `careerState.credits`. Build 11.64 supersedes the top-left header value with `careerState.goldCoins`; do not put ordinary credits back into that header.
- Current required regressions: arena plan and rotation audits, door placement/latching/audio, screen backing, live plan assignment, spectator handoff timing, loss/win settlement, responsive Gold Coin header, diagnostic/minimap parity, Build 11.62 reload audio, Build 11.61 movement presentation and Build 11.56 deadlock recovery.

## Build 11.62 reload-audio invariant

Reload audio is part of weapon completeness. Any new live weapon must include a supported `reloadAudioProfile` in its authoritative weapon definition and must pass the release/mag-out/mag-in/mag-seat/rack timeline test. Do not add a weapon to loadouts, rewards, NPC pools or renderers without its reload-audio coverage. The audio system may provide a defensive fallback, but fallback use does not satisfy feature completion.

## Required workflow for a numbered game release

1. Identify which source modules own the requested behaviour.
2. Check the dependency notes in `PROJECT.md`.
3. Ask for missing modules when only part of the source was uploaded.
4. Preserve existing functionality unless the user explicitly asks for removal.
5. Update all build metadata in `js/00-core.js`:
   - `BUILD_VERSION`
   - `BUILD_NAME`
   - `BUILD_ID`
6. Update the matching release identity in `index.html`: document title, CSS/JavaScript asset query strings, main-menu build stamp, desktop `#managerBuildVersion` label and mobile `#mobileCommandBuildVersion` Help-bar label.
7. Confirm `build.py` accepts both visible labels and derives the standalone output filename from `BUILD_VERSION`.
8. Update all relevant Markdown documentation and the handoff prompt in the same task.
9. Run `python3 build.py`.
10. Syntax-check the development bundle and the inline standalone script.
11. Run targeted behavioural checks and a second unrelated-regression pass.
12. Return both the complete source ZIP and standalone HTML release.

Documentation-only edits do not require a build-number increase. Keep the current playable release number unless code, markup or CSS used by the game changes.

## Documentation-by-default rule

Documentation maintenance is mandatory whenever features or content change. Do not wait for the user to request it separately.

- Update `PROJECT.md` for architecture, module ownership, invariants, dependencies, debug helpers and test requirements.
- Update `README.md` for current player-facing behaviour and release filenames.
- Update this file and `00-READ-FIRST-GPT.md` when future coding agents need a new invariant or workflow rule.
- Update `GPT-HANDOFF-PROMPT.txt` when the master handoff summary would otherwise become stale.
- Never ship a playable revision while knowingly describing an older build as current.

## Retained Build 11.61 invariants

### Movement presentation must remain grounded in real AI state

- `js/30-bot-ai.js` owns actual locomotion and presentation blends. Preserve bounded acceleration/deceleration, smoothed render angles, directional movement blends, corner weapon readiness, shoulder bias and crouch posture minimums. Presentation angles must not replace authoritative aim, visibility, collision or shot calculations.
- Deliberate corner-clearing and committed exposed crossings may adjust movement speed modestly, but must preserve A* paths, team traffic yielding, combat-deadlock escalation and round completion on Citadel Depot and Skyline Offices.
- New animation fields must be included in `snapshotCombatTestBots()` so every debug scenario restores state cleanly.

### Reload, hit and death presentation is shared

- `careerWeaponReloadPhases()` is the common reload timeline for `js/62-character-renderer.js` and `js/63-viewmodel-renderer.js`. Keep the complete magazine and base together, preserve slide-lock/rack timing and continue sourcing weapon identity from `CAREER_WEAPON_CATALOG` and `careerWeaponVisualParts()`.
- Third-person hit reactions, death stagger/fall, body/aim separation and first-person recoil/flinch/bob are visual only. Do not alter weapon balance, critical rules, health, current save schema 19 and schema-18/schema-17/schema-16/schema-15/schema-14 migration compatibility or diagnostics schema 1.
- Preserve `animationBlendForTest()`, `animationAngleForTest()`, `reloadAnimationForTest()`, `operatorAnimationAuditForTest()` and `movementPresentationForTest()` and validate both maps, crouch stability, deadlock recovery, landscape/minimap controls and the post-report Training route before release.

## Current Build 11.60 invariants

### Landscape uses the same tactical minimap

- Keep `js/32-tactical-minimap.js` as the sole minimap state/drawing authority. Landscape exposes the existing `#minimapToggleBtn`; it must not instantiate a second canvas, bot-marker model or visibility flag.
- In `data-view-mode="maximized"`, the compact diagnostic and minimap controls are a safe-area-aware pair beside the portrait restore button. They must remain hidden in menu/scoreboard states and continue to close one another when their overlays open.
- Validate the map panel and all ten operator markers on Citadel Depot and Skyline Offices in representative 844×390, 852×393 and 932×430 landscape viewports.

### Portrait full-view requests use a rotation gate

- Do not restore the old CSS `rotate(90deg)` fallback as visible gameplay while the physical viewport is portrait. `#landscapeRotationGate` must cover the screen opaquely and instruct the user to rotate.
- `syncViewMode()` owns the gate. It is visible only for a requested full view during a portrait live match, closes live minimap/diagnostics, hides the ordinary restore control and clears automatically after actual landscape orientation.
- `#landscapeReturnPortraitBtn` must call `restoreWindowedView()` so fullscreen/orientation APIs, audio recovery, body datasets and portrait layout all return through one path. Preserve `landscapeViewForTest()`, `requestLandscapeForTest()` and `restorePortraitForTest()`.

## Current Build 11.59 invariants

### Manager feedback navigation must be atomic

- `handleTeamNoteModalAction()` must not call a training setter that re-renders Team Telemetry while the shared modal is still open. Use `setPlayerTrainingFocus(..., { render: false })`, persist recommendation/selection, close with `{ restoreFocus: false }`, blur the modal action and then route to Training.
- The action must end on `menuTab === 'training'`, with `careerState.selectedPlayerId`, `selectedTeamPlayerId`, `trainingRecommendation` and the assigned focus all referring to the same operator.
- Ordinary X/backdrop/Escape modal closing still restores focus where safe. Only cross-route actions suppress restoration to the soon-to-be-removed trigger.

### Portrait Command HQ must fill the live iOS viewport

- `#app` is fixed with `inset:0`; `.menu-shell` is absolute with `inset:0`. In portrait, keep their heights `auto` and max-heights unset so Safari toolbar/focus changes cannot leave a black strip below the interface.
- `stabiliseMenuViewportAfterRoute()` is the shared route-transition repair. Preserve its immediate, two-frame and delayed passes, scroll reset and visual-viewport resize/orientation hooks.
- Required regression helper: `managerTrainingTransitionForTest()`. Run the real clickable Team Telemetry/debrief path at 320, 375, 390 and 430 CSS pixels and assert app/shell/content bounds, route, modal cleanup and persisted recommendation.

## Current Build 11.58 invariants

### Final deployment owns the last map choice

- `startNewMatch()` still enforces the current-day briefing, five starters and confirmed tactical plan. It now opens the deployment review before `startMatchmakingSearch()`. Do not bypass this review for a newly prepared match or reopen it between rounds.
- `careerState.tactics.arenaId` is the preferred/default battleground and is updated by final confirmation. Deployment cards must be generated from `arenaOptions()` and previews must use `drawDeploymentArenaPreview()` without mutating the active arena.
- The review must show two map cards, five starting operators, temporary match roles, equipped weapons and the confirmed formation/approach/engagement/priority/Plan Fit. Cancel must restore Command HQ and cancel the prepared fixture.
- Required helpers are `prepareDeploymentForTest()`, `deploymentForTest()`, `chooseDeploymentArenaForTest()` and `confirmDeploymentForTest()`. Verify the deployment/session visibility transition and final arena name during matchmaking.

### Weapon presentation remains one shared system

- `CAREER_WEAPON_CATALOG`, `careerWeaponVisualParts()` and `careerWeaponPresentation()` in `js/35-career.js` are authoritative. Keep `viewmodelPose` and `muzzleProfile` in the catalog; do not reintroduce hard-coded per-weapon poses in `js/63-viewmodel-renderer.js`.
- Armoury inventory/detail views, player loadouts, deployment rows, matchmaking rows, first-person weapons, world-held weapons, diagnostics and rewards must resolve the same weapon ID and catalog entry. Unknown IDs may fall back to Scrapline, but valid Service/Viper IDs must never do so.
- The first-person reload must move `magazine` and `mag-base` as one assembly, expose removal/insertion and slide/rack phases, and keep all weapon parts rigidly connected through sway/recoil. Flash, smoke and ejected-case scale come from the shared muzzle profile.
- Build 11.58 does not rebalance gameplay weapon statistics. Required checks include `weaponPresentationForTest()` for `scrap-p12`, `service-p12` and `viper-9`, `reloadPoseSample()`, `forceReloadForTest()`, Armoury copy/identity consistency and retained critical/range/AI behaviour.

## Current Build 11.57 invariants

### Tactical minimap stays observational and map-driven

- `js/32-tactical-minimap.js` owns minimap geometry, canvas drawing, visibility and test state. Do not duplicate map drawing in runtime or renderer modules.
- Draw from the current `MAP`, `LEVEL_ZONES`, `LEVEL_PROP_COLLIDERS`, `LEVEL_DECOR_LAYOUT` and `bots` arrays so Citadel and Office cannot drift into separate hard-coded minimap versions.
- The minimap may reveal both teams because the player is a spectator-manager, but it must not write that information back into bot memory, navigation or target selection.
- The mute, diagnostic and minimap controls must remain separate and inside the compact match window at 320/375/390/430 portrait widths. The open panel itself must also fit completely inside the match view.
- Minimap and live diagnostics are mutually exclusive overlays. Preserve click, `M`, Escape, menu and scoreboard lifecycle behaviour.

### Skyline courtyard and props remain collision-consistent

- Office courtyard geometry comes from `LEVEL_DECOR_LAYOUT.courtyards`; its fountain, benches, planters and large furniture come from `LEVEL_PROP_LAYOUT` so navigation collision and rendered cover agree.
- Keep the courtyard's north/south and east/west bypass space open. New office dressing should favour wall edges, alcoves or the existing shared prop layout rather than placing non-colliding furniture in active routes.
- Preserve the true courtyard ceiling opening, skylight/sky treatment and office-specific renderer branches for benches, planters, fountain, coffee station and copier.
- Required checks include `minimap()`, `toggleMinimapForTest()`, `setArenaForTest()`, environment batch counts, both-map marker counts, mobile panel bounds and the retained Build 11.56 deadlock regression.

## Current Build 11.56 invariants

### Combat recovery must change the situation

- `js/30-bot-ai.js` owns combat right-of-way, yield routing and recovery escalation. A blocked combat recovery must not simply reissue the same direct `push` state to multiple team-mates occupying one lane.
- `combatRightOfWayValue()` determines which operator keeps the approach. The lower-priority team-mate must use `findCombatApproachRoute(..., { yielding: true })` to move into a legal nearby pocket; paths remain soft-traffic-aware and must not include unseen enemy positions.
- `combatApproachPath`, `combatApproachGoal` and `combatApproachTargetKey` are temporary live-match state only. They must be cleared on target change, meaningful target relocation, completion or timeout, and must never enter career persistence.
- `combatRecoverySuccesses` increments only after at least 0.58 units of real displacement. A no-movement retry escalates `combatRecoveryStage`, chooses another route/side and records the blocker rather than reporting false success.
- Out-of-range crouch holds are bounded. A visible target outside weapon range with no firing, damage or movement progress must trigger an alternate combat route even when the operator is outnumbered.
- Diagnostics may report blocker identity/type, approach goal/reason, recovery stage and displacement, but they remain read-only and preserve export schema 1, current save schema 19 and schema-18/schema-17/schema-16/schema-15/schema-14 migration compatibility and all Build 11.55 retention limits.
- Required deterministic helpers are `combatDeadlockRecoveryForTest()`, `diagnosticDeadlockReplayForTest()`, `outOfRangeCrouchBreakForTest()` and `combatRecoveryDisplacementForTest()`. Run them repeatedly alongside all Build 11.52 combat tests, diagnostic capacity/export checks, mobile control geometry and an unrelated management route.

## Current Build 11.55 invariants

### Diagnostics remain observational

- `js/31-match-diagnostics.js` may read live simulation state but must not write tactical targets, paths, visibility, combat stats or career progression. Its only persistent write is the separate local summary key `strikewatchDiagnosticSummariesV1`.
- Snapshot cadence is 0.25 simulated seconds and the rolling detailed window is 90 seconds / 360 samples. Do not capture every render frame or retain unbounded arrays on mobile.
- Meaningful event hooks live at existing authoritative transitions: match/round flow in `js/40-match-flow.js`, elimination/path/recovery/blocked-shot hooks in `js/30-bot-ai.js`, and periodic sampling in `js/70-runtime.js`.
- The portrait export control is deliberately smaller than the mute control and must not overlap it at 320–430 widths. Tap exports; press-and-hold toggles the read-only live overlay.
- Export tests must validate parseable JSON, correct build/map/tactics context, ten bot states per snapshot and a completed summary after a match. Preserve the existing six Build 11.52 combat-navigation deterministic helpers.

## Current Build 11.52 invariants

### Combat target selection and line-of-fire safety

- `js/30-bot-ai.js` owns combat perception and engagement recovery. A currently visible target must be compared with other visible opponents every frame; a close visible threat or visible operator blocking the shot corridor takes priority over a farther target.
- `firstOperatorInLineOfFire()` must block the shot before ammo, recoil, muzzle flash or damage are applied. Visible enemy blockers are retargeted; friendly blockers request a lateral reposition. Do not use this helper to reveal occluded enemies.
- Target switching uses a short cooldown for ordinary preference changes, but an immediate close threat or actual line blocker may override that cooldown.

### Permanent anti-freeze rules

- `updateEngagementProgress()` monitors shots, damage and actual translation during visible combat. A stalled engagement must release cover/crouch and select an open push or reposition angle.
- `updateLocomotionStall()` prevents crouching from becoming a permanent state. A stationary crouched operator with an actionable objective, sound or last-seen contact must stand, clear stale route/cover data and request a fresh path.
- Entry-role support waits happen once, then `coordinationHoldTimer` prevents another wait loop for several seconds. Do not reset and immediately repeat the same support pause.
- Same-team traffic may alter A* cost through `navigationCellPenalty(cell, mover)`. Enemy positions must remain excluded from that penalty to preserve perception authority.

### Required debugging and regression

- Preserve the six Build 11.52 debug helpers: `closeThreatRetargetForTest()`, `operatorLineBlockerForTest()`, `combatStallRecoveryForTest()`, `crouchStallRecoveryForTest()`, `coordinationWaitCommitForTest()` and `navigationTrafficPenaltyForTest()`.
- `performance()` exposes target switches, close-threat overrides, operator-blocked shots, combat/crouch stall recoveries, coordination commits and navigation recoveries. `snapshot()` exposes the corresponding per-bot movement/tactical state.
- Before release, run the deterministic helpers, a full prepared live match for at least 90 simulated seconds, a late-round duel/search scenario, state integrity, syntax checks and one unrelated management regression.

## Current Build 11.51 invariants

### Transfer presentation and submitted-offer feedback

- `js/39-transfers.js` owns the Transfer Centre presentation and outgoing counter history. `js/39-recruitment-commercial.js` overrides the incoming submission simulation and must also maintain `lastSubmitted`, `lastResponseStatus` and `lastResponseMessage`; changing only the base transfer function is insufficient.
- `.transfer-player-scouting` keeps role, Ability and Potential in one horizontal grid. The two `.scouting-stars > span` strips must use row flex in the negotiation context, including 320-pixel portrait.
- Every submitted incoming package or outgoing counter displays both an immediate shared management notice and persistent feedback in the negotiation detail. Subsequent revised offers replace the stored last-submitted package rather than adding a new save collection.

### Portrait sound control and management prerequisites

- `index.html` owns `#portraitAudioBtn`; `js/00-core.js` exposes it; `js/10-audio.js` synchronises mute state; `js/70-runtime.js` binds the same `toggleAudio()` action as the main sound button. It is visible only during a portrait windowed match and remains bottom-left, opposite `#sponsorBug`.
- `showManagementNotice()` / `showManagementBlocked()` in `js/36-team-management.js` extend the existing shared overlay. `js/70-runtime.js` handles dismiss and optional route buttons. Do not introduce a separate warning-modal implementation.
- Missing-assistant controls are intentionally not HTML-disabled. They carry a visible staff-required state and must open the prerequisite notice with a direct Staff action. Similar blocked management actions should prefer the same notice when the player needs an explanation or recovery route.
- Save schema stays version 14. New transfer feedback fields are optional nested values repaired naturally by existing object normalisation; no migration-only schema bump is required.

## Current Build 11.50 invariants

### Inbox ordering and mobile presentation

- `clubMailNewestFirst()` in `js/39-club-operations.js` is the presentation authority for Inbox order. It sorts a copy by the monotonic `MAIL-n` sequence and falls back to day/original index; do not mutate or reverse persisted mail merely to render it.
- `clubSelectedMail()` falls back to the newest derived message so a fresh Inbox opens on the latest communication. Preserve `mailOrderForTest()` for deterministic ordering checks.
- Mail-mode popup glyphs must use text presentation and a dedicated bounded icon box. Kicker/subject copy must reserve enough right-side space for both the icon and X control in portrait.
- Portrait Armoury inventory cards are full width and vertically stacked. Do not reintroduce the 78vw horizontal-card width or a trailing card-edge seam.
- `.team-debrief-player-head` owns the player name/rating header styles. Never target every direct child button of a debrief article, because the expandable note is also a button and will overlap if it inherits the header flex layout.

## Current Build 11.49 invariants

### Popup Inbox and decision responses

- Clicking any `.club-mail-row` must call the Inbox popup path rather than relying only on the embedded reader. The message is selected and marked read before the shared overlay opens.
- `openClubMailModal()` in `js/39-club-operations.js` composes sender/category metadata, full body text, optional decision controls, mark-unread and related-route actions. Do not fork a second modal implementation.
- Unresolved decision emails display all current options from `renderClubDecisionMailActions()`. `handleClubMailModalClick()` must route those buttons through `clubResolveDecision()` and refresh the same source email to a resolved confirmation state.
- The popup action region is `#teamNoteActions`; it must be emptied and hidden whenever the shared popup closes. The unopened overlay must remain `display:none !important`.
- Marking a popup email unread closes the popup. Opening it again marks it read, avoiding an ambiguous open-but-unread state.
- Preserve the four-message Inbox viewport, End Day blocking logic, read/unread badges, source-message decision IDs, current save schema 19 and schema-18/schema-17/schema-16/schema-15/schema-14 migration compatibility.

## Current Build 11.48 invariants

### Hidden-state safety and expanded debrief presentation

- `.team-note-overlay[hidden]` must remain `display: none !important`; test computed display as well as the `hidden` property because a visible-but-hidden overlay can intercept every pointer event.
- `js/36-team-management.js` owns tone selection, source-text transfer, focus capture/restoration and the shared expandable-card helper. The overlay must not write to player, match or save state.
- X, backdrop and Escape must all dismiss the overlay. Opening focuses the close control; closing restores focus to the original reflection/debrief button where possible.
- Starting Five debrief cards are single-column at narrow portrait widths so their comment and expansion affordance remain readable.
- `window.__strikeDebug.seedStartingFiveDebriefForTest()` is the deterministic regression fixture for five player `lastMatch` reflections and a report summary. It is debug-only and does not alter save schema.

### Portrait consistency

- At 320, 375, 390 and 430 CSS-pixel widths, the management page must not exceed viewport width. Back remains left, Forward remains right and the history title remains centred.
- Shared portrait overrides may improve hero copy, section headings, pills, telemetry cards, calendar agenda copy and league fixtures, but must not remove routes, controls or detail from wider layouts.

## Current Build 11.47 invariants

### Reflection overlays and portrait menu alignment

- `js/36-team-management.js` owns the expandable Team-route comment overlay. Post-match reflection cards and Starting Five debrief notes must open through shared overlay helpers rather than duplicating per-card modal state.
- `index.html` owns the `#teamNoteOverlay` dialog shell and close button, `js/00-core.js` owns the DOM references, and `js/70-runtime.js` owns overlay close wiring plus Escape/backdrop handling.
- The overlay must remain purely presentational: it reads copy from `data-expand-*` attributes or passed strings and must not mutate the underlying player or match state.
- Portrait main-menu history rails keep the route label centred with Back on the left and Forward on the far right. Preserve this split layout in the main management context while leaving pause/live contexts free to keep their own header actions.
- Armoury inventory cards must not render the previous full-height equipped-state blue line in portrait. Keep an equipped highlight without the artefact.

## Current Build 11.45 invariants

### Guided beginner onboarding

- `makeDefaultCareerTutorialState()` in `js/35-career.js` is the single default for new, reset and migrated tutorial state. It includes `contextSeen: {}` and save normalisation must preserve only a plain object of boolean route flags.
- Tutorial stage 1 explains the live foundation-loan terms: 350,000 credits advanced, 400,000 total repayable, ten instalments of 40,000 credits every four weeks. It also introduces the four persistent manager shortcuts in this order: Inbox, End Day, Calendar and Match.
- `index.html` owns `data-tutorial-order="1"` through `"4"` and the corresponding tutorial labels on the four topbar buttons. Do not edit only the generated standalone HTML; the modular source must reproduce the same markup after `python3 build.py`.
- Stage-1 highlighting may pulse unless reduced motion is requested, but it must not block taps, change normal routing or hide unread/event/blocker badges.

### Progressive section guidance

- `MENU_CONTEXT_TUTORIALS` in `js/50-ui-menus.js` owns the one-time guides for Calendar, Tactics, Transfers, Training, Finances (`barracks`), Commercial and Armoury (`loadout`).
- Context guides appear only after the main tutorial is completed or dismissed. Dismissing a guide writes `careerState.tutorial.contextSeen[route] = true`, saves immediately and prevents the guide returning after route changes or reload.
- Preserve `renderMenuContextTutorial()`, `dismissMenuContextTutorial()`, `handleMenuContextTutorialClick()`, `completeTutorialForTest()`, `contextTutorialsForTest()` and `dismissContextTutorialForTest()`.

### Four-section primary navigation

- The primary section order is exactly Operations, Team, Armoury, Supplies and Club. `loadout` is removed from Team and is the default/owned route of the dedicated Armoury section.
- Portrait mobile navigation uses four equal-width compact tabs with no internal or document-level horizontal overflow at 320, 375, 390 and 430 CSS pixels. Mobile landscape remains usable at 844 × 390. On roomier layouts, the small numeric index is supporting information rather than the dominant visual element.
- Back/Forward history, route badges, direct player-to-Armoury links and selected Armoury target state must continue to work after the section move.
- Release checks must test both `index.html` and the rebuilt standalone output, then run an unrelated recruitment and `stateIntegrityForTest()` pass.

## Current Build 11.44 invariants

Calendar date and sponsor polish:

- `absoluteDay` remains the persistent source of scheduling truth, but visible dates must come from the UTC-safe Gregorian helpers in `js/39-club-operations.js`. The epoch is Monday 3 August 2026; month/year rollover is derived and must not mutate league, loan, transfer or contract schedule counters.
- `js/39-calendar-finance.js` renders a 42-cell month grid and a separate 12-week agenda. Month cells use descriptive compact labels rather than unexplained abbreviations; agenda entries state the involved club/player/brand, amount or consequence and action required.
- Calendar navigation may go back only to the club epoch and up to 36 months ahead. `TODAY` restores the current simulated month.
- Sponsor broadcast content is visible for five seconds after the ordinary round-result delay. The round lifecycle must use the shared total-duration helper and final rounds must continue to skip the bumper.
- Portrait windowed sponsor identity aligns the icon beside the `PARTNERS OF` and brand lines as one unit. Preserve the true bottom-right placement and no-deal/menu hidden states.

Sponsor broadcast pass:

- The active sponsor bug must show **PARTNERS OF** at all mobile orientations. Portrait windowed CSS may scale the label down but may not hide it.
- `scheduleSponsorRoundBumper()` is called only after a non-final round. `updateSponsorRoundBumper()` runs during the round-ending countdown; `startRound()`, `createMatch()` and `finishMatch()` must clear it.
- The sponsor bumper uses the active brand from `sponsorshipState()`, displays the club name and upcoming round number, and reuses `sponsorLogoMarkup()` so all five brand identities remain consistent.
- Do not make sponsor bumpers appear without an active deal, over the final match report or in Command HQ. Preserve reduced-motion handling and the debug helpers used to inspect/schedule/show/hide the bumper.

Calendar, finance and stability pass:

Calendar, finance and stability pass:

- `js/39-calendar-finance.js` is authoritative for the five-week club calendar, event aggregation and the foundation loan. It must load after `39-recruitment-commercial.js` and before match flow/UI rendering.
- Opening cash is a 350,000-credit bank advance with 400,000 total repayable through ten 40,000-credit instalments every four weeks. Repayments are automatic, partial payments create arrears, and all transactions enter the finance ledger and Inbox.
- Existing created saves without `financeLoan` migrate with the first instalment four weeks after migration; save schema is version 14.
- Own-team scoreboard rows route to Player Telemetry for the selected profile, whether alive or eliminated. Opposition rows must remain non-interactive.
- The Inbox list viewport shows four rows and scrolls for additional mail.
- Calendar cells and agenda must surface fixtures, loan dates, contracts, injuries, scouting, sponsors and transfer deadlines without horizontal overflow at 320/375/390/430 widths.
- Audio recovery must not override a deliberate mute. Maintain the watchdog, earliest-gesture resume, queued-event retry and state-change recovery. Kill-feed generation must safely handle missing weapon/name metadata.

Unified sidearm grip pass: `careerWeaponVisualParts()` in `js/35-career.js` is the authoritative source for career pistol geometry. Any correction to grip posture, magazine seating or cosmetic grip pieces must land there so inventory thumbnails, Armoury detail, reward crates, world-held pistols and first-person pistols all inherit the same silhouette. Shared sidearm geometry must preserve the existing helper surface (`careerWeaponVisualPart()`, `careerWeaponVisualBounds()`, `careerWeaponPartFitOffset()`) and must not break the first-person reload, slide motion or ejection flow in `js/63-viewmodel-renderer.js`.

### Tactical suitability and plan fit

- `js/39-matchday.js` is authoritative for `clubTacticalSuitabilityReport()`, player role suitability, familiarity, opponent matchup interpretation and all explanatory Tactics UI.
- The six visible Plan Fit components are Formation, Approach, Range, Team Priority, Assigned Roles and Familiarity. The overall score also includes a small bounded opponent-style matchup adjustment.
- Formation/approach effectiveness must be derived from the actual starting five: attributes, readiness, equipped weapons, assigned roles and familiarity. Do not replace this with fixed bonuses or overall-rating-only shortcuts.
- Temporary role fit must use the selected role's attribute weights. Natural/secondary role familiarity is bounded and never mutates `player.role`.
- `clubTacticalPlanSnapshot()` must persist a compact suitability snapshot when the plan is captured. `applyCareerToBot()` uses that active snapshot and exposes plan fit, execution percentage, role suitability and decision multiplier on each owned bot.
- Suitability changes tactical decision timing, coordination and the strength of existing formation/approach/range/priority behaviour. It may not add hidden raw damage, bypass weapon stats, erase fatigue/injury penalties or reveal enemy positions.
- Tactical familiarity persists in save schema version `13`, rises after completed matches and stays within 0–100 for every known option. Zero is valid and must survive normalisation rather than falling back to an initial value. Changing the plan, starter attributes/readiness/loadouts or assigned roles must invalidate a stale confirmation signature.
- The Tactics route must show the overall score, execution percentage, component breakdown, opponent read, clear insights, fit badges on every alternative and individual role-fit readouts. The explanation must state that fit affects tactical behaviour rather than raw damage.
- Preserve `tacticalSuitabilityForTest()`, `setTacticalFamiliarityForTest()`, `recordTacticalFamiliarityForTest()`, `setPlayerTacticalProfileForTest()`, `assignMatchRoleForTest()`, `clearMatchRolesForTest()` and the tactical fields in `matchdayForTest()`.

## Retained Build 11.36 invariants

### Recruitment department and scouting

- `js/39-recruitment-commercial.js` loads after `39-transfers.js` and wraps existing team, transfer, calendar, settlement, HUD and menu functions. Keep wrappers single-layered; do not place audit/debug registration inside frequently called state normalisers.
- `recruitmentState()` and `sponsorshipState()` must preserve live object/array references while normalising. Re-cloning arrays on every getter call can discard assignment completion, AI activity or accepted-offer mutations.
- Market knowledge is intentionally incomplete. Shortlist monitoring and three-day assignments increase knowledge; dossier viewing gives a small increase. Full values appear only at high knowledge thresholds.
- Transfer-window progress counts played user **league fixtures**, not total matches or exhibitions. Permanent registrations are open through two completed fixtures, closed at three to five, and open again from six onward; free agents bypass the closure.
- AI clubs own `roster`, may bid for market players, sign them, list reserves and replace weaker operators. Market and rival rosters must remain mutually consistent and state integrity must remain clean.
- Contract negotiations include signing/appearance bonuses and squad status. Completed signings persist the appearance bonus and a playing-time promise; weekly reviews may affect morale, happiness and transfer status.

### Sponsorship and spectator promotion

- Exactly five fictional partner definitions currently exist: Aegis Dynamics, VoltRush Energy, Northstar Finance, Redline Mobile and Ironclad Gear. Each must retain a distinct visual mark and commercial structure.
- Offer generation is deterministic for the same club/day/performance seed. Commercial score combines reputation, win rate, league tier, recent result and commercial development. Higher-performing/top-tier clubs must receive stronger aggregate offers.
- Pending proposals are End Day blockers. Acceptance pays upfront income, declines competing pending offers, enables weekly and match bonuses and activates `#sponsorBug`.
- `#sponsorBug` belongs in the true bottom-right broadcast corner, is hidden without a deal and in Command HQ, and must not displace the compact spectator controls. When the full-view return control is visible, that utility button moves upward instead.
- Sponsor income must enter the finance ledger and active/completed terms introduced in schema 12 must persist after migration to current schema version 14.

## Retained Build 11.35 invariants

### Pro League tier integrity

- Tier `0` is a valid value and represents **Strikewatch Pro League**. Do not use `|| 3` or another truthiness fallback when reading division tiers, selected pool tiers or staff tiers.
- Use `normaliseLeagueTier()` for all persisted or external tier values. Missing/invalid input falls back to Division 3, while numeric zero remains zero.
- `leagueDivisionTier()`, `leagueDivisionDefinition(0)`, `leagueCompetitionName()` and the market/staff generators must all resolve tier `0` as Pro League.
- Save normalisation and `ensureLeagueState()` must repair stale top-tier display names to `STRIKEWATCH PRO LEAGUE` without demoting the club.
- `auditCareerStateIntegrity()` must flag league-name and staff-pool mismatches. Preserve `leagueTierForTest()` and `setLeagueTierForTest()`.
- Regression acceptance includes direct tier mapping for 3/2/1/0 plus promotion from Division 1 into Pro League and relegation from Pro League into Division 1.

## Retained Build 11.34 invariants

### Stability baseline and release consistency

- `index.html`, `js/00-core.js`, `build.py`, `js/strikewatch.dev.js`, the current `dist/` HTML and all top-level documentation must carry the same build number/name. Treat mismatched source metadata as a release-blocking defect because GitHub Pages may publish `index.html` directly.
- The team-creation screen must state the actual starting economy: a 350,000-credit bank start-up loan and a 32,000-credit combined weekly wage budget.
- On a scheduled league matchday, league play is mandatory before any exhibition. Preserve the guard in `prepareCareerMatchContext()` and keep the league UI's exhibition action disabled with a clear league-fixture-required label. On non-matchdays, exhibitions remain valid, subject to the one-match-per-day rule.
- Save migration must repair duplicate squad IDs, derive `calendar.dayOfWeek` from `calendar.absoluteDay`, keep finite weapon assignments within repeated inventory copy counts and normalise all persistent career counters to finite non-negative integers.
- Preserve `window.__strikeDebug.stateIntegrityForTest()` and `normaliseStateForTest(raw)`. A normal created career must return `ok: true`; add relevant checks when new persistent systems are introduced.
- Within `#menuContent`, interactive controls must remain at least 44px high in portrait and 40px in compact landscape. Run all 17 menu routes at 320/375/390/430 portrait and 844×390 landscape and reject document/content horizontal overflow, invalid visible text or duplicate DOM IDs.
- `clubMailSender()` must map `TRANSFER` and `TRANSFERS` consistently and retain explicit Matchday/Result senders.

## Retained Build 11.33 invariants

### Tactical matchday workflow

- `js/39-matchday.js` is the owner of the pre-match sequence: opposition briefing, starting-five review, temporary match-role assignment, team approach, preferred engagement range, collective priority and plan confirmation.
- `startNewMatch()` must route to Tactics and stop before matchmaking whenever `clubMatchPlanConfirmed()` is false. Intermediate rounds of an already-started match are exempt.
- `clubLineupSignature()` includes starter IDs and assigned match roles. Recruiting, selling, reordering, assistant selection, formation changes or role/tactical changes must call `clubInvalidateMatchPlan()`.
- `beginMatchmaking()` captures `clubCaptureActiveMatchPlan()`. Live bots consume that snapshot so changing HQ controls during an active match cannot rewrite the current round.
- Assigned roles are match responsibilities only. Preserve each player's natural `player.role`; expose the temporary role through `bot.playerRole`, latest-match records and the tactical report.

### Team coordination and information limits

- Entry operators may briefly wait for nearby support before evidence-led danger; Support operators maintain useful spacing behind an Entry; Anchors/Hold plans favour useful territory; Flankers may separate more widely but must retain a recovery route.
- `Bot.updateTeamCoordination()` tracks supported/isolated time, deliberate regroups, trade responses, role actions and route replans. These values must continue through `recordTeamMatchRound()`, match settlement and the after-action report.
- Ally-down information contains the fallen operator's location and a short-lived killer identity only. It may seed a bounded investigation/trade response, but it must never grant continuous enemy coordinates or bypass line of sight.
- Team approach, engagement range and priority are bounded tactical modifiers. They must not overpower player attributes, fatigue, injuries, weapons, collision, visibility or the no-wall-tracking rules.

### Decisions and debriefs

- `careerState.decisions` persists mandatory Inbox choices. `clubDecisionBlockers()` extends `clubEndDayBlockers()`; unresolved decisions must prevent every End Day mutation.
- Decision effects may alter happiness, morale, fatigue, training assignment, promises, credits or reputation. The Inbox must show the options and recorded outcome.
- Playing-time promises must be fulfilled by starting the player or produce a later happiness/morale penalty when the promise expires.
- `completeCareerMatch()` stores the captured tactical plan and `buildTacticalMatchAnalysis()` output. `careerReportMarkup()` must show coordination metrics and recommendations in both the modal report and Reports archive.
- Preserve the retained Build 11.33 debug helpers: `matchdayForTest()`, `setMatchdayPlanForTest()`, `confirmMatchdayPlanForTest()`, `applyMatchdayPlanToBotsForTest()`, `startPreparedMatchForTest()`, `generateDecisionForTest()`, `resolveDecisionForTest()` and `tacticalAnalysisForTest()`.

## Retained Build 11.32 invariants

### Live spectator link, pause rail and mobile view transitions

- `updateOwnedOperatorTelemetry()` must describe `bots[spectatorIndex]`, not the player last selected in Command HQ. The landscape card, portrait live-link row and spectator identity must always show the same operator name and `playerProfileId`.
- Preserve `window.__strikeDebug.spectatorTelemetryForTest()` and verify all five owned slots after changing spectator selection.
- In portrait pause context, `.menu-history-bar` remains exactly 44 CSS pixels high. Speed and Pause stay on that same rail; they must never wrap into the oversized second row that separated them from Back/Forward.
- In mobile landscape up to 520 CSS pixels high, the central `.controls` deck is capped at 264 CSS pixels, the left spectator/telemetry panels remain clear, and the return-to-portrait control occupies the bottom-right corner without overlap.
- `maximizeGameView()`, `restoreWindowedView()`, match deployment and orientation/fullscreen events participate in gesture-led audio recovery through `queueAudioRecovery()`. Deliberate mute state must still be respected.
- The portrait `FULL VIEW` control and compact landscape return icon replace the old wedge-style Maximise/Windowed View treatment.

### Retained Build 11.31 manager calendar and route notifications

- The top-right `.manager-profile` contains `.manager-profile-team` and `#managerDatePanel`; do not collapse the date back into the old tiny `#managerOperatorLevel` status sentence.
- `#managerOperatorLevel` contains Team Level only. `#managerDateDay` and `#managerDateMeta` display the current weekday, week and season from `clubCurrentDateParts()`.
- The persistent manager header height must not increase. Verify the club name, date panel and four equal manager action buttons at 320, 375, 390 and 430 CSS-pixel widths.
- `renderMenuSubnav()` renders mail, transfer and development counts as `.menu-subtab-notification` elements. Never append ` · NUMBER` to the route label again.
- Zero-count routes emit no badge. Mail is gold, transfer activity uses the decision tone and development points use the mint progress tone. Preserve full accessible route labels with the count included.
- Preserve `calendarHeaderForTest()` and `subnavNotificationsForTest()` for DOM-level regression checks.


### Must Respond, manager shortcuts and Inbox client

- `#managerMailBtn`, `#menuEndDayBtn`, `#managerCalendarBtn` and `#startMatchBtn` live together inside `.manager-topbar-actions` as four equal icon controls. Do not move End Day or Deploy back into `.menu-header-actions`.
- At 320 CSS pixels all four controls remain touch-sized and fit without horizontal overflow; the compact narrow-width rule may reduce each width while retaining at least 42 CSS pixels and a 44 CSS-pixel interaction height, with no document-level horizontal overflow.
- `clubEndDayBlockers()` is the authoritative list of decisions that stop calendar progression. It currently covers an unplayed league fixture due today, active incoming negotiations, actionable outgoing bids and the completed-season transition. Future mandatory decisions should extend this function rather than add one-off button checks.
- `advanceCareerDay()` must return without mutating the calendar, recovery, training, payroll or transfer day processing while any blocker exists. It routes to the first blocking page and shows a Must Respond explanation.
- A blocked End Day icon remains tappable for explanation/routing, uses `aria-disabled`, warning styling and `#managerEndDayBlockBadge`, but must never actually advance time. Matchmaking, pause and live-match states remain hard-disabled.
- `renderClubMustRespondStrip()` exposes up to three current blockers with direct route buttons. Informational/important mail alone is not a blocker.
- `.menu-history-bar` replaces the retired large header-action row and remains exactly 44 CSS pixels high. `#menuBackBtn` and `#menuForwardBtn` restore route context and scroll position, disable at history boundaries and discard forward history after fresh navigation.
- `renderMailTab()` retains the mail toolbar, sender/category identity, unread dots, previews, message reader and individual read/unread action. `.manager-mail-badge[hidden]` must use `display: none !important`; a zero unread count must never produce a visible badge.

### Opposition critical-hit parity

- Owned and enemy operators must use the same `criticalCombatProfile()` and `refreshCriticalCombatProfile()` pipeline. Simulated opposition receives Crit Chance and Crit Bonus Damage from its generated player attributes plus the equipped weapon modifiers; it must never fall back to a separate enemy-only fixed crit rule.
- `Bot.shoot()` refreshes the active profile after an ordinary hit succeeds, then rolls the critical result. Critical hits and critical eliminations are counted by team in `combatDebug.criticalHitsByTeam` and `combatDebug.criticalEliminationsByTeam`.
- Critical eliminations show a gold `CRIT` marker in the kill feed regardless of which team caused them. The scoreboard summary reports current-round CRITS for both clubs.
- Preserve `window.__strikeDebug.enemyCriticalProfileForTest(slot, randomValue)` and the per-team critical arrays returned by `performance()`.


### Compact Command HQ actions

- The normal Command HQ content header contains only the 44-pixel history rail and any live-match pause controls. It must not regain the old wide League Match, Matchday, End Day or Recruit panels.
- `#startMatchBtn` is the persistent topbar Match icon. It preserves its SVG, receives `needs-squad`, `active` and `matchday` state classes from `updateMenuUI()`, and routes to recruitment when the club lacks five starters.
- The duplicate sidebar reset shortcut has been removed. **New Team / Reset** lives only in Club > Configuration as a deliberate danger action with confirmation.
- `.menu-side-actions` is reserved for the paired **Return to Match** and **Exit to Main Menu** controls while the pause menu is open. It should not consume vertical space in normal Command HQ.

### Critical-hit progression

- Player attributes now include independent **Crit Chance** and **Crit Bonus Damage** values on the same 0–10 scale as the existing technical attributes.
- The common baseline is 5% critical chance and +50% critical bonus damage. Each Crit Chance point adds 1 percentage point; each Crit Bonus Damage point adds 4 percentage points.
- Weapon definitions may add `critChanceBonus` and `critDamageBonus`. Operator and weapon bonuses stack through `criticalCombatProfile()` and remain capped at 25% chance and +110% bonus damage.
- A critical hit is rolled only after a normal shot has passed visibility, aim and hit-chance checks. It multiplies the normal post-roll weapon damage before target resistance and health clamping.
- Critical damage numbers use the `critical` class, a yellow/gold treatment and a `CRIT` or `CRIT DOWN` label. They remain contextual and use the same capped 18-effect pool as normal damage.
- Critical hits persist in round, match and career performance data. Crit attributes affect player overall, market value, scouting stars and transfer attractiveness like other allocatable attributes.
- Preserve `criticalProfileForTest()`, `criticalDamageForTest()` and the optional `critical` argument on `damageNumberForTest()`.
- Save schema version 11 migrates older players with valid default crit attributes without deleting existing progression.


### Spectator health and persistent Inbox access

- The landscape and portrait spectator HP readouts use the same health-ratio colour: green near full health, amber around half health and red near zero.
- The spectator health bar must use the same current colour as the numeric HP readout.
- `spectatorHealthColour()` is the authoritative mapping; preserve `window.__strikeDebug.healthColourForTest()` and `setSpectatorHealthForTest()`.
- Command HQ has equal Inbox, End Day, Calendar and Match icons in the manager topbar. Inbox opens `mail` directly, shows a badge only above zero unread and remains touch-sized on the narrowest supported phone.
- Mobile Command HQ subtabs centre their visible labels consistently; short labels such as **League** must not appear offset inside their route cells.


### Transfer centre and negotiations

- `js/39-transfers.js` owns the base incoming/outgoing negotiation state; `js/39-recruitment-commercial.js` adds scouting uncertainty, richer packages, windows, rival market activity and commercial partnerships.
- Recruitment UI must open a negotiation; it must not silently deduct the original asking price and sign the player immediately.
- Incoming packages contain a transfer fee, weekly wage and contract length. Only an agreed package may be completed, and completion must recheck cash, wage headroom and squad capacity.
- Rival bids may be accepted, rejected or countered. A completed sale updates credits, squad order, Inbox and the buying rival roster.
- Active negotiations and outgoing offers persist in `careerState.transfers` in the version-11 schema.
- Transfer and development attention counts must remain visible without requiring the manager to discover them by opening every page.

### Early-game balance and mobile UX

- New Division 3 clubs start with a 350,000-credit bank loan and a 32,000-credit combined player/staff wage budget.
- Division 3 player pools remain low-skill and affordable, but must still guarantee a valid five-player route within both budgets.
- Primary mobile actions must have at least a 44 CSS-pixel tap height. Long labels must wrap with readable line spacing rather than clip, overlap or force document-level horizontal overflow.
- Regression acceptance now covers the unchanged phone interface at 320, 375, 390, 402 and 430 CSS pixels plus 844 × 390 mobile landscape, and the Desktop Command Centre at 1024, 1280, 1366, 1440 and 1920 CSS pixels.

Future changes must preserve these rules unless the user explicitly changes them:


### Dual presentation target

- Below `1024px`, prioritise the established portrait and mobile-landscape interface, touch interaction, iPhone safe areas and mobile GPU/CPU limits. Build 12.58 does not redesign this surface.
- At `1024px` and wider, the Command HQ desktop shell is a supported UI/UX target. Prioritise readable density, bounded line lengths, mouse/keyboard focus, stable navigation and use of available width.
- Primary mobile release widths are 320, 375, 390, 402 and 430 CSS pixels plus 844 × 390 landscape. Primary desktop widths are 1024, 1280, 1366, 1440 and 1920 CSS pixels.
- Horizontally overflowing Command HQ route bars must keep aligned edge controls and fades below the desktop breakpoint without covering route labels.
- Mobile overflow controls must share the route-row height, retain at least a 44 CSS-pixel touch target and disappear when no hidden routes remain. Desktop route navigation must instead fit or wrap without those controls.
- The active mobile route should be brought into view when navigation changes, but periodic live-HQ refreshes must not repeatedly steal or reset horizontal scroll position.


### Mobile combat presentation and movement

- The active-camera HUD must show the watched operator's tactical speciality alongside their club identity in portrait and landscape presentation.
- Confirmed damage feedback remains contextual: outgoing damage from the watched operator and incoming damage against that operator only. Damage numbers use the compact value/tag treatment, remain capped at 18 and never reveal unrelated combat.
- Perception uses centre-line sight plus bounded target-exposure samples around the operator capsule. Partial shoulder/body exposure may be detected, but walls and level props must still block shots authoritatively.
- Cover-versus-cover engagements must not remain indefinitely static. When both opponents repeatedly hold cover without dealing damage, the healthy, loaded operator should request a new angle or short push.
- Sprinting is short, situational and fatigue-dependent. It is used for clear-route travel, pushes, fallbacks and repositioning, not while crouched, reloading or pressed against geometry.
- Sprint footsteps are deliberately louder than running footsteps and use a wider AI hearing radius. Sprint distance contributes to post-match fatigue and medical workload.
- Preserve `window.__strikeDebug.sprintFootstepForTest()`, `stalemateBreakForTest()`, `targetExposureForTest()` and the sprint/stalemate fields reported by `performance()`.

### Environment and mobile UI polish

- The Citadel Depot environment may add only bounded decorative geometry that does not alter collision unless the shared collision layout is updated in the same change.
- Floor plates, route lane strips and wall kick plates are generated from existing map geometry and must remain modest enough for mobile rendering.
- Portrait match controls must retain at least 44 CSS-pixel tap targets. At very narrow widths the first three camera controls occupy one row and Speed/Menu occupy the second row without overflow.
- Live Command HQ uses a stable two-row mobile header: page identity above, pause/speed controls below. Its subnavigation sticky offset must match the expanded header height.

### Match and reward flow

- A match is **first to three round wins**, therefore at most five rounds.
- Intermediate round wins restart the next round; they must not trigger the report or loot flow.
- The after-action report is generated after the full match ends.
- A field crate is awarded only when the owned Blue Team wins the match.
- A match defeat still awards non-victory XP and returns to HQ after the report, but gives no crate.
- Current crate probabilities are:
  - P12 Service: 32%
  - Viper-9 Compact: 32%
  - AR-4 Sentinel: 14%
  - Urban Grid common skin: 22%
- Urban Grid duplicates convert to 35 XP; repeated weapon drops add another usable club copy and do not convert to XP.


### Division pyramid, calendar and matchdays

- New careers start in **Strikewatch Division 3**, below Division 2, Division 1 and the Pro League. Each tier contains 20 clubs, 38 matchdays and 380 home-and-away fixtures.
- The first Division 3 opponent remains Northbridge Five. League matches remain first to three and award three points; standings sort by points, round difference, rounds won and club name.
- The top two clubs promote at season end when a higher tier exists. The bottom two relegate when a lower tier exists. Starting the next season rebuilds the current 20-club division and refreshes division-appropriate staff/player pools.
- `careerState.league.divisionTier` is authoritative: 3 = Division 3, 2 = Division 2, 1 = Division 1 and 0 = Pro League.
- Player and assistant-manager search pools must be locked to the manager's current division. Higher/lower options may be visible for context but must be disabled until the club changes tier.
- Division 3 recruitment must begin with affordable, comparatively low-ability candidates and still contain a valid route to five starters within the opening balance and wage budget.
- League fixtures are scheduled through the simulated calendar. The default league matchday is Saturday; league matchmaking is unavailable before the fixture date, and only one completed match may be settled on a simulated day.
- **End Day** advances the calendar, training, fatigue recovery, medical recovery, assistant-lineup decisions, weekly summaries and matchday notifications only when `clubEndDayBlockers()` is empty. It is also blocked during matchmaking, pause or an active match.
- The Inbox persists club mail, unread state, categories, related-page actions and important matchday/promotion/medical/development messages.
- Preserve `window.__strikeDebug.league()`, `clubOperations()`, `advanceDayForTest()`, `completeDivisionSeasonForTest()` and `startNextDivisionSeasonForTest()` when career-calendar logic changes.

### Matchmaking flow

- Starting a **new match from HQ** must open the simulated matchmaking overlay before `createMatch()` runs.
- Matchmaking progresses through queue, server allocation, roster synchronisation, ready check and deployment lock.
- The search may be cancelled before deployment lock; once the deploy stage begins, the session is locked.
- The existing match must not start underneath the matchmaking overlay.
- Starting the next round of an already active first-to-three match must bypass matchmaking and continue directly.

### Team management, recruitment and interface

- A new version-11 save starts with an organisation and **zero contracted players**; no free starter operator may be silently added.
- Team creation requires a team name and manager name and grants a 350,000-credit bank loan plus a 32,000-credit weekly wage budget.
- Five contracted players are required before a new-match matchmaking sequence can begin.
- The squad limit is eight. Positions 0–4 are the active Blue starting five; positions 5–7 are reserves.
- The initial generated market must contain unique active-shortlist names and at least one five-player combination affordable under both starting budgets.
- Generated profiles retain identity, age, nationality, primary/secondary roles, five combat attributes, ability, potential, personality, traits, form, morale, value, fee, wage, contract, weapon preference, history and career totals.
- Tactical roles must affect match AI behaviour and remain attached to the player profile carried into Blue bots.
- Recruitment deducts fees immediately and enforces both balance and wage budget. Match income settles after the completed match; combined player/staff payroll and contract-week reduction occur only when End Day enters a new calendar week. Intermediate rounds trigger neither.
- The six-step onboarding tutorial begins with the start-up loan and four topbar shortcuts, then guides Market → Profile → first signing → starting five → Squad → Deployment and persists with the save.
- Legacy single-operator saves migrate into one squad profile rather than losing progress.
- The Club Reputation XP panel belongs immediately below the Operations hero.
- The main menu uses an information-dense football-management-inspired structure with Operations, Team and Club sections.
- The menu must remain usable in portrait and landscape without horizontal page overflow.
- In the live-match Command HQ, **RETURN TO MATCH** and **EXIT TO MAIN MENU** remain equal-width controls on one row.
- Opening Command HQ during an active match leaves the simulation running by default; the explicit header control is the only menu-level pause/resume toggle.
- The live menu badge/status must clearly report running versus manually paused state, current round, score, survivors and clock.
- Mission Control and both telemetry routes refresh periodically while the background match runs without forcing the content scroller back to the top.
- Sticky menu header and section subnavigation offsets must never overlap.
- Opening the live menu or changing menu sections resets the Command HQ scroll position to the top.
- Scoreboard names show a green circular state indicator for living operators and a red circular state indicator for eliminated operators. Dead rows also use dead styling and **ELIMINATED** status text; do not use skulls.
- Scoreboard team headers use the actual competing club names, not generic Blue Team / Red Team labels. Blue/red remain presentation colours only.
- Matchmaking headers, spectator team labels, round-result banners and after-action scores use the same captured match presentation so club identity remains consistent after league settlement.
- Living **own-club** scoreboard rows remain keyboard/touch selectable and switch the spectator camera directly; opposition and eliminated rows never become camera targets.
- Every spectator-selection path must enforce `CAREER_OWNED_TEAM`: Previous/Next, Auto Spectate, scoreboard interaction, canvas switching and debug selection.
- Opening Command HQ during a live match selects the currently spectated player and routes directly to that player's Profile & Data record with embedded telemetry.
- Club and manager names support up to 24 characters. Do not restore the former 18-character truncation, and keep full-name layouts free of horizontal overflow.

### Dual progression, training and player market value

- Team XP and per-player XP are separate systems. `careerState.level`, `careerState.xp` and `careerState.unspentPoints` represent Team Level, Team XP and unspent team-benefit points; they must not be spent on the obsolete global operator-stat model.
- Each contracted/generated player persists `level`, `xp`, `unspentPoints`, `trainingFocus`, per-attribute `trainingProgress`, latest training result and transfer-interest data.
- A player level grants one personal stat point. Personal points may increase only that player's Marksmanship, Handling, Awareness, Mobility or Resilience, and development may not exceed the normal 10-point attribute cap or the player's potential ceiling.
- Technical training advances gradually whenever **End Day** advances the calendar, never per animation frame or intermediate round. Marksmanship, Handling, Awareness, Mobility and Resilience programmes build daily fractional progress toward a later +1 attribute gain. Recovery and unassigned programmes prioritise fatigue reduction instead of technical growth.
- Team Level grants permanent department points. Coaching improves training gain, Performance Analysis improves player match XP, Sports Science improves fatigue and injury recovery while reducing injury risk, and Commercial Department improves match income. Each benefit is capped at level 5.
- Starters earn player XP from participation, kills, match rating, rounds and results; reserves receive a smaller development award. Performance Analysis may multiply this award, but the result must remain visible as individual Player XP rather than Team XP.
- Player attribute growth, recent performance, age, potential, form, level, contract length and active medical status update market value and transfer-interest strength. Interest may name persistent rival clubs, but actual offers/transfers remain a future system and must not be fabricated.
- The Training Facility introduction remains simple: set a programme, play fixtures and allocate points. The player may dismiss it and the state persists.
- The Ammunition Store is a non-functional placeholder only. Its cards and disabled controls must not deduct credits, restrict ammunition, change reload/magazine balance or create hidden stock consumption.
- Preserve the development debug helpers: `development()`, `setTrainingFocusForTest()`, `grantPlayerXpForTest()`, `allocatePlayerStatForTest()`, `grantTeamXpForTest()`, `allocateTeamBenefitForTest()` and `simulateTrainingWeekForTest()`.

### Tactics, formations and assistant management

- The Tactics page must preserve manual control and assistant delegation as explicit alternatives. Delegation may reorder the squad only when an employed assistant manager exists.
- Available formations are Balanced, Pressure, Control, Defensive and Wide. Their role preferences and small bounded live-match modifiers must not override core player attributes, fatigue, injury or weapon balance.
- An assistant-manager candidate persists judging ability, judging potential, tactics, man management, fitness, style, signing fee and weekly wage.
- Staff appointments deduct the signing fee immediately, contribute to the weekly wage bill and obey the same club wage budget as players.
- Assistant lineup selection evaluates ability, role fit, readiness, fatigue, form, sharpness and medical penalties, and must always leave exactly five starters when the squad is eligible.
- Preserve `hireBestAssistantForTest()`, `setFormationForTest()` and `setLineupModeForTest()`.

### Spectator speed, navigation affordance and performance

- Match speed supports only 1× normal and 2× fast forward. Landscape, portrait and live-HQ controls must share one `matchSpeedMultiplier`; `F` toggles it.
- Fast forward accelerates authoritative match simulation and round time through small substeps no larger than 0.033 seconds. It must not accelerate career reports, reward presentation or menu interaction.
- Horizontally overflowing Command HQ subnavigation must display left/right affordance arrows and edge fades only while more routes exist off-screen.
- HUD refresh remains throttled to 20 Hz, scoreboard HTML rebuilds only while open and menu-background rendering remains capped at 30 FPS. The live match simulation must not be reduced to those UI rates.
- Damage-number effects must be created only for confirmed relevant hits, remain capped at 18 and remove their DOM nodes on expiry. Do not expose unrelated off-camera damage.
- Preserve `window.__strikeDebug.performance()` and its frame/update/render/transient counters.

### Injuries and medical recovery

- Every player persists vulnerability, current injury, day-based recovery time, injury history, latest risk and latest medical update in the version-11 save schema.
- Injury risk is evaluated once at full-match settlement for participating starters only. Intermediate rounds and background real time never roll injuries.
- Risk must rise with pre-match fatigue, vulnerability, workload, age and an existing injury, and fall with Resilience and Sports Science.
- Playing while injured is allowed to avoid soft-locking a five-player club, but bounded performance/readiness penalties apply and an additional injury roll may aggravate recovery time.
- Reserves recover without match risk. Rest & Recovery training and Sports Science accelerate day-based recovery. Match settlement rolls risk but never consumes recovery time; recovery advances only through simulated days.
- Active injury status must appear in squad, profile, Training Facility and telemetry UI, and modestly reduce value/transfer interest until cleared.
- Preserve `window.__strikeDebug.medical()` and `injuryRiskForTest()`.

### Telemetry, wellbeing and player feedback

- Operations must keep two explicit routes: **Team Telemetry** for aggregate starting-five information and **Player Telemetry** for a selectable individual link.
- Team Telemetry must never be a renamed starter-one screen; it aggregates all deployed Blue players and also reports starting-five fatigue, happiness and readiness.
- Player Telemetry must allow switching squad members without changing line-up order, loadout ownership or spectator state.
- Every generated player persists `fatigue`, `happiness`, `morale`, `form`, `matchSharpness`, readiness inputs and a latest-match record/reflection.
- Fatigue and psychological state apply small, bounded combat modifiers; they must not overwhelm the five core attributes or weapon balance.
- Starters gain workload after a completed match and reserves recover. Intermediate rounds must not settle wellbeing.
- Player profiles must show a personal-performance comment, a team-performance comment and a manager-facing insight based on the latest completed fixture.
- Match reports and club totals are team-level. Individual match lines and ratings remain attached to each player's profile.
- Squad cards, profiles and telemetry screens must show fatigue and happiness without causing horizontal overflow.

### Individual squad loadouts

- Every contracted player owns an independent `equippedWeaponId`; changing one player's issue must not overwrite another player's selection.
- `careerState.equippedWeaponId` remains a legacy/default mirror of the first starter only and must not be treated as the whole squad's authoritative loadout.
- The Armoury must always identify the target player, show all starter/reserve loadouts together and permit switching target without leaving the screen.
- Starter Scrapline pistols are unlimited standard issue. Every dropped Service, Viper or AR-4 reward adds one finite club copy. Different copies may serve different players; when all copies are issued, reassignment transfers one copy and returns its previous holder to a valid fallback weapon.
- Squad cards and contracted player profiles retain direct links into the correct player's Armoury target.
- Squad cards use a three-row action hierarchy: full profile, telemetry/loadout, then move-up/move-down controls; do not compress all actions back into one crowded row.
- The Squad screen visually separates the starting five from reserves.
- Contracted-player Profile and Loadout screens keep the shared player context bar with Back to Squad, previous/next player and direct Profile/Loadout switching. Telemetry remains embedded in Profile.
- Route-level colour accents must keep Recruitment, Profile, Telemetry, Loadout and Finances visually distinguishable without reducing text contrast.
- The first five players' individual weapon selections must map to Blue slots 0–4 during matchmaking and live match creation.
- Per-player loadout changes are locked during a live round and persist through save/reload.
- Weapon finishes remain club-wide until a future release explicitly introduces per-player cosmetics.

### Live Command HQ simulation

- `appState === 'menu'` must not automatically stop a resumable active match. `matchSimulationPaused` controls the explicit manual pause state while the live Command HQ is open.
- Recruitment, squad ordering, loadout changes and progression spending remain locked in the live-match menu even while the simulation runs.
- Returning to the spectator view always clears the menu-only manual pause state.
- Live Command HQ exposes the same 1×/2× speed control as the match HUD, and its status line reports the active multiplier.
- If the match completes while Command HQ is open, match-ending report/reward flow remains authoritative and the pause control becomes unavailable.
- Preserve the `P`/Space background-pause shortcut and Escape return behaviour.

### Audio lifecycle

- Sound defaults to enabled but must be unlocked or resumed by a genuine pointer, touch or keyboard gesture.
- A suspended or interrupted Web Audio context is retried on the next interaction and after returning to a visible page.
- Returning from Command HQ to the match must attempt audio recovery before gameplay resumes.
- Muting sound must remain respected; lifecycle recovery must not silently re-enable a deliberately muted master.
- The Club Configuration screen reports the actual context state and provides an **ENABLE / TEST SOUND** or **MUTE SOUND** control.
- Repeated failed resume attempts may trigger a controlled audio-context rebuild, but this must still preserve deliberate mute state.

### Reward crate presentation

- The field crate is rendered by the custom WebGL renderer in `js/64-reward-renderer.js`, not by a CSS-only fake chest.
- The reward renderer must remain asset-free and independent from the live match WebGL context while using the same procedural mesh/shader approach.
- The closed phase shows the interactive 3D crate.
- The opening phase animates the lid before reward cycling begins.
- During reward cycling, the chest is hidden and only possible rewards may be shown.
- The chest returns in the revealed phase with the winning item presented above it.
- The cycling list must contain only rewards that can actually drop from the current reward table.

### Shared weapon visuals and loot crate animation

- Surface-mounted pistol details such as sights, ejection ports, cutouts and grip panels must stay visually seated against the shared frame/slide in first-person and world renderers.
- Reward-crate trim that belongs to the lid must move with the lid hinge during the opening animation rather than remaining in world space.
- P12 Service and Viper-9 Compact are early-game reward pistols and should stay meaningfully starter-tier when balancing damage, handling, reload and magazine values.

### Weapon feel, recoil and reload animation

- Career pistol balance and recoil metadata live in `CAREER_WEAPON_CATALOG`; do not create renderer-only balance values that disagree with gameplay.
- P12 Scrapline remains the roughest and least stable starter, P12 Service remains the predictable control option, and Viper-9 remains the rapid-handling option with lower per-shot damage and more sustained-fire spread.
- Consecutive shots build temporary weapon heat and reduce hit chance; heat recovery must use shared handling/recoil data and must not permanently alter weapon accuracy.
- First-person pistol reloads must visibly include magazine removal, replacement insertion and a late slide-rack/release phase. Empty magazines should visibly hold the slide back before the final action.
- The support hand must follow the active reload phase rather than remaining attached to the normal two-handed firing pose.
- First-person recoil should use weapon-specific kick, recovery and roll while leaving simulation damage and line-of-sight authority in the AI/gameplay modules.

### Operator model and lower-body anatomy

- Living and corpse legs must use the shared two-bone solver in `js/62-character-renderer.js`; do not animate knees as an unrelated point between hip and foot.
- The knee pole remains forward/outward so knees cannot visually invert during walking, running, crouching, turning or death settling.
- Thigh and shin lengths must remain stable enough to avoid stretching, with feet at or above floor height.
- Knee pads and shin/thigh armour must remain attached to the solved leg chain rather than floating in world space.
- Knee-pad plates, shells and straps must use matte non-emissive materials. Team identification may use a small muted colour tab, but knee armour must not appear self-illuminated or inherit hurt/emissive glow.
- Preserve `operatorLegGeometryAudit()`, `operatorProportionAudit()`, `operatorArmourMaterialAudit()` and the `window.__strikeDebug.operatorModel()` inspection helper when changing the character renderer.
- The operator silhouette remains compact and readable at distance: broad shoulders, a shorter leg-to-torso ratio, chunkier hands/limbs and an original low-detail tactical profile rather than copied game assets.

### AI and navigation

- Hunt routing must never use an opponent's hidden current coordinates. Goals come from an operator's own last-seen memory, audible events, approximate radio-shared teammate evidence or weighted uncleared-sector hypotheses.
- Repeated evidence may estimate a bounded direction of travel and short intercept, but only from observations the operator or a teammate actually received.
- Search-sector choice remains stochastic and evidence-weighted rather than following a fixed target sequence; recent routes, cleared sectors and teammate destinations are penalised.
- Urgent hunt footsteps may travel farther through the simulation and central contact hubs may receive extra weight, but neither mechanism may expose a hidden live coordinate.
- When silence or round-time pressure becomes significant, surviving operators must keep advancing, abandon stale stationary holds and create a fresh reachable hunt goal rather than waiting for the timer.
- Regulation expiry with survivors starts at most one 45-second **Sudden Hunt** before the final time-limit tiebreak. Preserve its visible HUD label, urgent evidence-led movement and one-overtime-only safety cap.
- Sudden Hunt may extend the range/lifetime of real footstep and contact evidence, but must not query hidden enemy coordinates.
- Decisive late-round contact should avoid routine post-burst disengagement while a target is visible, while preserving safe reload and critical-health retreat behaviour.
- Navigation still avoids recently travelled route cells and triggers a reachable breakout detour when repeated movement stops producing progress.
- Operators commit to reachable combat cover, hold likely angles, use brief peeks and return behind cover instead of continuously strafing in exposed lanes.
- Tactical decisions account for health, ammunition, weapon range, local numbers and visible enemy reloads; exposed reloads should first attempt to break line of sight.
- Combat tactics must remain committed long enough to avoid decision thrashing, while still allowing low-health and safe-reload emergencies to interrupt a peek.

### Team-management source ownership

- `js/35-career.js` owns persistent schema/migration, shared progression, weapons, skins, reports and reward state.
- `js/36-team-management.js` owns generated player data, market, squad order, tutorial, fees, wages, contracts and finance presentation/operations.
- `js/37-league.js` owns league clubs, persistent rival rosters, fixtures, standings, league onboarding, opponent selection, matchday simulation and league/exhibition settlement.
- `js/38-development.js` owns Team XP benefits, per-player XP/stat allocation, training programmes, dynamic value/interest recalculation and the ammunition-store placeholder.
- `js/39-medical.js` owns injury vulnerability, fatigue-sensitive risk, injury/recovery state, labels and bounded performance penalties.
- `js/50-ui-menus.js` owns navigation and matchmaking presentation, but must not become the authoritative store for credits, contracts or league standings.
- Player and financial state must remain serialisable in `careerState`; renderer modules must not own management progression.

## Important project rules

- The modular source is the master copy.
- Never make a code-only source change without rebuilding the standalone release.
- Never edit only the standalone HTML and leave the modular source out of sync.
- Keep authoritative gameplay state in simulation, match-flow and career modules, not renderer modules.
- Keep map visuals, prop collision, line of sight and navigation geometry consistent.
- Keep the two debug APIs available:
  - `window.__strikeDebug`
  - `window.__strikewatchDebug`
- Be honest about tests that could not be completed, especially WebGL screenshot testing.

## Weapon and cosmetic consistency rule

Every weapon has one shared geometry definition in `js/35-career.js`, centred on `careerWeaponVisualParts()` and the shared material profiles.

Inventory, Armoury inspection, crate previews, first-person viewmodels, third-person operators and corpse/dropped weapons must consume those shared parts. Context-specific pose, animation and scale are allowed; separate slide, grip, barrel, sight or magazine dimensions are not.

Weapon skins must follow the same rule:

- define skin data and material overrides once in `js/35-career.js`;
- show the same finish in inventory, Armoury, crate previews, first person, third person and dropped/corpse presentation;
- do not create CSS-only or renderer-only versions that drift from the in-game appearance.

## Partial-upload rule

Uploaded files may be only a subset of the project. Do not assume missing modules do not exist. Read module headers and `PROJECT.md`, then request any additional source files needed for a safe change.

## Packaging rule

A clean source ZIP should contain only the current generated release in `dist/`. Remove obsolete generated HTML builds before packaging, but never delete modular source history or user-created assets without explicit approval.

## Expected delivery wording

State:

- which source modules changed;
- what behaviour changed;
- what tests were completed or unavailable;
- the current/new build number;
- download links for the source ZIP and standalone HTML when the playable build changed.


### Build 11.41 addendum

- Build 11.41 corrects the shared sidearm grip silhouette. The grip, grip panels and magazine now sit further aft with a neutralised cant, and the shared source adds small backstrap/baseplate details so the pistols read more naturally in every renderer that consumes the same parts.
- Preserve the shared-geometry contract across `js/35-career.js`, `js/62-character-renderer.js` and `js/63-viewmodel-renderer.js`. A local visual tweak in one renderer is not an acceptable fix if the underlying source-of-truth pistol profile remains wrong.

### Build 11.39 addendum

- The post-match reward crate renderer now keeps the lid visually attached to the body throughout the open animation by driving the lid, hinge spine and support rails from the same rear pivot.
- The Team Armoury now compares every selected or browsed weapon directly against the currently equipped weapon for the selected operator. Inventory tiles show a quick better / worse / sidegrade badge, while the detail panel shows an overall comparison card plus per-stat deltas.

### Build 11.39 comparison-language refinement

- Weapon comparison labels now distinguish major upgrades, clear upgrades, balanced trade-offs, minor edges and downgrades instead of reducing every mixed profile to simply better or worse.
- Mixed weapon profiles remain visibly marked as trade-offs when one weapon gains speed or handling but loses damage, accuracy or critical output.
- Stat deltas use explicit language such as faster, slower, average damage, accuracy and handling.
- The Armoury explains that the comparison score evaluates the weapon package only; operator attributes, assigned role, fatigue and tactics still determine live effectiveness.

## Build 12.73 recruitment presentation invariant

- Recruitment ability and potential stars use the same gold/platinum scale. Full value is gold, half value is split gold/platinum, and the remaining solid stars are muted platinum. Do not restore outline stars, purple potential stars or offset half-star shadows.
- Recruitment candidate surfaces use the silver/platinum treatment while preserving role, fit and action accent colours.
- Build 12.107: recruitment cards must keep their own opaque navy surface; configurable page-background colours may only affect the canvas behind panels.
- Build 12.108: Citadel Depot is authored as its northern half and mirrored by a 180-degree rotation about the map centre. Any change to its layout, props, gates, stairs or decor must preserve that symmetry.
- Build 12.108: no Citadel prop, gate, stair assembly, catwalk or authored service run may overlap a wall cell, and every catwalk must be anchored to a partition at both ends.
- Build 12.108: every Citadel stair must carry a landing whose outer edge meets a wall face bearing an access hatch. A flight that terminates in open floor is a defect.
- Build 12.108: Citadel `decor` entries (walkways, lowCeilings, hazardZones, pipeRuns) are presentation only. They must never create colliders or affect navigation or line of sight.
- Build 12.108: `arenaGeometryPresentationSnapshot` is the gate for the above. Do not relax its citadel branch to make a change pass.
