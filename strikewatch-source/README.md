# Strikewatch Source 12.118

## Repository workflow

In the GitHub repository, this project lives under `strikewatch-source/`. Edit and build here, then publish the verified `dist/strikewatch-build-<version>.html` as root `cod.html`. Every release commit should include the source changes, updated Markdown authority/current audit and the matching `cod.html`. The root `other/` directory contains unrelated legacy projects and assets; it is not used by Strikewatch.

## Build 12.118 mobile typography readability pass

Build 12.118 removes the remaining hard-to-read mobile microcopy. Recruitment
cards, inline reports and role guides; full operator dossiers; team telemetry;
development, training and supplies cards; league tables; Configuration
appearance controls; persistent navigation; and the portrait live-match HUD
now use bounded mobile type floors instead of legacy 5–9px values. The core
type-scale pass is mobile-only, preserves desktop density, and includes a
320px attribute-grid containment correction. Gameplay, recruitment values,
simulation, economy, persistence, save schema 19 and diagnostics schema 1 are
unchanged.

The Build 12.118 follow-up also raises shared empty-state explanations and
transfer-offer/status rows on wide layouts. These surfaces were still using
legacy 6–9px fixed values even though the mobile component scale had been
corrected.

## Build 12.117 Skyline Offices environment rework

Build 12.117 reworks the Skyline Offices arena so it reads as a coherent corporate floorplate. A geometry pass found twenty-four authoring defects: the landscaped courtyard slab and its ceiling void covered fourteen wall cells because the real courtyard was only two cells deep, seven props were embedded in masonry, four glass bands floated in open walkway, three rugs and one AI hotspot sat over walls, and the office suspended ceilings were three hard-coded boxes, one of which hung across the courtyard. The floorplate is now authored as one quadrant and mirrored about both axes, so the two team halves are identical. The centre is a real 8x6 glazed atrium with four symmetric entrances, and a new decor layer adds painted wayfinding and per-room ceilings without adding any collider. The tactical minimap and deployment preview are already data-driven and follow the new layout automatically. Save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.116 desktop header split

Build 12.116 uses the clarified desktop header arrangement: the breadcrumb is flush to the upper-left of the main context and the build badge is flush to the upper-right beside the shortcut area. The compact and wide desktop headers now share that split row. Mobile keeps its Help-revealed version, and the larger mobile negotiation typography from Build 12.115 remains intact. Navigation, negotiation behavior, gameplay, match presentation, economy, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.115 header and negotiation readability

Build 12.115 independently centres the version badge in the open middle area of wide desktop headers instead of treating it as part of the breadcrumb line. At compact desktop widths the established inline treatment remains, and mobile continues to reveal the version through the `?` Help bar. The incoming-player negotiation screen now raises its smallest compact labels, safety guidance, request summary, editable values and step captions without changing any deal values, controls or signing logic. Gameplay, recruitment calculations, match presentation, economy, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.114 live feed readability

Build 12.114 improves the compact recruitment and operator-profile type hierarchy, adds a portrait-only red **LIVE** broadcast bug, moves up to three existing match-feed rows to the upper-right of the portrait game image and keeps desktop fee/wage estimates on one line with both `CR` labels intact. The desktop build badge now uses text-baseline alignment with the breadcrumb. These are presentation changes only: recruitment values and decisions, elimination events, match simulation, AI, combat, map visuals, economy, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.113 desktop version alignment

Build 12.113 vertically centres the desktop version badge with the Operations breadcrumb. The shared topline now has explicit line-box ownership, and the badge uses static positioning plus inline-flex content centring so broad desktop typography rules cannot visually raise it. The mobile `?` Help-panel version stays in its existing location and continues to derive from `BUILD_VERSION`. Gameplay, navigation, operator visuals, match performance, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.112 visible version header

Build 12.112 displays the current playable version in the management interface. Desktop players can see `BUILD 12.112` in the main header. On mobile, tapping the existing `?` Help control reveals the current-page bar with `BUILD 12.112` alongside the section label. Both displays use the same authoritative build constant, and packaging now stops if the source header labels have not been updated for a numbered release. Gameplay, navigation, operator visuals, match performance, persistence, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.111 realistic operator heads

Build 12.111 makes third-person heads read more naturally without changing their gameplay envelope. The procedural skull now has a slimmer jaw, fuller cheeks, recessed eye sockets, a brow ridge and a restrained nose bridge. A closer-fitting helmet, nose-contoured lower-face cover and separate elliptical goggle lenses replace the previous stacked horizontal shapes. Living and fallen operators retain the same head assembly, pale natural complexion family, distance LOD, head scale, hit detection, collision, AI, movement, weapon balance, save schema 19 and diagnostics schema 1.

## Build 12.110 natural operator silhouettes

Build 12.110 makes third-person operators feel less blocky and robotic without changing gameplay or increasing body draw calls. The existing procedural renderer now uses a more anatomical ribcage-to-waist taper, a smoother pelvis, forward-profiled knee and elbow shells, and boots with a rounded heel, instep and tapered toe. Presentation-only pose math adds restrained pelvis counter-motion, torso/head stabilisation and hand-anchored elbow bends while preserving weapon grip anchors, hitboxes, collision, AI, movement speed, weapon balance, match rules, save schema 19 and diagnostics schema 1.

## Build 12.109 Citadel match performance

Build 12.109 removes the stutter introduced by Citadel Depot's denser environment without changing the map, visuals or operator behaviour. Static opaque Citadel geometry is merged into reusable GPU batches and conservative view culling skips only static detail outside the camera. Collision queries use a static spatial lookup instead of scanning every prop, while sliding-door colliders are cached until their authored door state changes. The original collision equations, navigation, line of sight, AI decisions, weapon balance, match rules, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.108 Citadel Depot environment rework

Build 12.108 reworks the Citadel Depot arena so it reads as a coherent industrial depot. Catwalks that cut through walls, stairs that led nowhere, props and a gate buried in masonry, hotspots inside walls and overhead runs clipping wall tops are all corrected. The layout is now authored as one half and mirrored by a 180-degree rotation, and a new decor layer adds hazard markings, service runs and per-room ceilings without adding any colliders.

## Build 12.107 recruitment card surface isolation

Build 12.107 prevents the configurable management page background from bleeding through alternating recruitment cards. All candidate cards now use an explicit opaque navy surface, including even rows and hover/focus states. The background preference still changes only the page canvas behind UI elements.

## Build 12.106 configurable management page background

Build 12.106 adds a persistent **Page Background** control to Club → Configuration. Managers can choose from six restrained dark presets or use the native custom-colour picker. The selected colour updates the large management canvas behind cards and panels immediately, survives reloads through a small independent local-storage preference, and can be reset to the original Command Navy default. Panel surfaces, text colours, route accents, sidebar chrome, match presentation, career save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.105 windowed match label cleanup

Build 12.105 removes the obsolete decorative **LIVE // SECURE FEED** pseudo-label from windowed matches. After the scoreboard and round objective were moved into dedicated HUD rows, that legacy label could remain visible behind the new layout at the top-left of the match panel. The scoreboard, objective, 16:9 viewport, landscape presentation, match simulation, save schema 19 and diagnostics schema 1 are otherwise unchanged.

## Build 12.104 blocker links, darker recruitment hover and portrait HUD repair

Build 12.104 repairs three regressions found during desktop and mobile QA. Mandatory management actions now bypass opening-week progressive locks when necessary, and pending sponsor offers explicitly expose the Commercial route so each red **Must Respond** item opens and scrolls to the exact offer. Desktop recruitment cards retain a small lift and glow, but the hover surface and action-button highlights are substantially darker and less washed out. Portrait windowed matches now use a real stage viewport wrapper: the scoreboard bar and round-objective bar occupy dedicated rows above a 16:9 live canvas rather than overlaying the rendered action. Save schema 19 and diagnostics schema 1 are unchanged.


## Build 12.97 desktop recruitment card parity

Build 12.97 applies the preferred mobile recruitment card presentation to desktop as well. Recruitment candidates on larger screens now open with the same concise summary-led card, inline detail expansion and tighter action hierarchy already used on mobile, so the browsing experience feels consistent across form factors. Recruitment logic, save schema 19 and diagnostics schema 1 are unchanged outside this UI pass.

## Build 12.96 streamlined opponent preparation

Build 12.96 keeps the existing opponent intelligence, response templates, fixture focuses and post-match evaluation, but presents them through progressive disclosure. The default Tactics view now shows one quick opponent read, one recommended response and one optional match focus. Full scouting facts, alternative plans and every available focus remain behind a single expandable control. Selecting a response still stages the real formation, approach, engagement range and team priority controls; no hidden outcome bonus was added. Post-match analysis continues to compare the selected preparation with what the autonomous operators actually executed.

## Build 12.95 desktop recruitment action consistency

Build 12.95 carries the same shortlist-button treatment into the desktop recruitment cards. Desktop card actions now use a compact square shortlist star beside larger utility and primary actions so the mobile and desktop recruitment experiences feel more consistent. Recruitment browsing, onboarding, gameplay, persistence, save schema 19 and diagnostics schema 1 remain unchanged outside this UI consistency pass.

## Build 12.91 natural-height desktop sidebar

Desktop department navigation now behaves as a compact list rather than five stretched cards. The crest remains unboxed at the top; Operations, Team, Armoury, Supplies and Club use natural 36-pixel rows; and access badges sit inline at the right. Mobile navigation and all gameplay systems are unchanged.

## Build 12.88 mobile recruitment header alignment

The compact desktop club rail now includes a distinct line icon for Operations, Team, Armoury, Supplies and Club. Icons use the current route accent when selected, retain subdued locked states, and leave all existing labels, notifications and progressive-access badges intact. The icon layer is desktop-only; mobile portrait and compact-landscape navigation are unchanged.

## Build 12.85 onboarding focus and saved mail

Build 12.85 simplifies the Command Centre while the First Match Journey is active and adds a task-led Inbox with Saved Mail. During onboarding, the calendar strip, fixture/status dashboard, club objectives, priority queue, momentum panel, command directory, match-preparation dashboard and line-up snapshot are withheld from the Command Centre; the First Match Journey, optional context, club identity and Team XP remain. The complete dashboard returns automatically when onboarding ends. Read unsaved emails now leave the Inbox immediately, unresolved decision emails remain visible until answered, and managers can save or unsave messages from the reader or full-email modal. A Saved Mail folder keeps marked messages available across saves. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.84 portrait mobile bottom clearance correction

Build 12.84 removes the remaining false gap above the persistent department bar in portrait mobile. The fixed bottom navigation was already reserved by the mobile menu layout, but a second 74-pixel padding rule on the content pane shortened the inner route scroller again. Portrait now keeps only the normal 10-pixel content inset, so the next Command Centre section flows directly beneath Team XP while the fixed navigation remains fully clear. Compact landscape, desktop, gameplay, recruitment, infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.82 mobile Command Centre panel height correction

Build 12.82 corrects the large false gap beneath the mobile Command Centre's Manager Priority Queue. In compact landscape, the Objectives and Recommended Actions panels remain side by side, but each now sizes to its own content instead of CSS Grid stretching the shorter panel to the height of the taller objectives list. Portrait layout, bottom navigation, dashboard content, gameplay, infrastructure, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.81 persistent club infrastructure

Build 12.81 adds a permanent, capacity-limited Club Infrastructure system that connects directly to the game’s existing departments instead of adding disconnected bonuses. Six four-level branches cover Training, Scouting, Medical & Recovery, Youth Academy, Analysis and Commercial & Supporters. Only one project may be under construction at once, every completed level permanently consumes division-based capacity, and investments cannot be refunded or reassigned. Promotion expands capacity from 8 slots in Division 3 to 14 at the top level, while the full tree contains 24 levels, so no club can maximise everything. Projects use Club Cash, take simulated days to complete and feed real systems: training progress, recruitment knowledge and assignment speed, fatigue and injury recovery, club-developed academy prospects, opposition analysis and player XP, sponsorship value, match income and positive supporter growth. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.80 mobile recruitment compact summaries

Build 12.80 delivers the next mobile recruitment UX pass without changing gameplay or persistence. Mobile and compact-tablet recruitment candidates now open as compact collapsed summaries with the key scan data visible immediately: name, role, ability, potential, fee and wage. A single primary **Negotiate** action now sits alongside a secondary **View Report** control, while shortlist and comparison remain available as compact chips rather than large stacked buttons. Expanding the report reveals scouting explanation, squad-fit detail, history/context and role brief information inline beneath the summary, reducing default card height substantially. The existing sticky comparison tray remains available so two or three selected candidates stay visible while browsing. Desktop recruitment cards, candidate data, scouting, negotiations, economy, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.79 accessibility and visual hierarchy pass

Build 12.79 delivers a focused accessibility and visual-hierarchy pass without changing gameplay or persistence. Disabled controls now use a readable neutral surface at full opacity, including formerly confusing guided and locked actions. Keyboard focus uses a high-contrast cyan ring with a dark separation halo. Informational panels use quieter neutral borders while actionable controls receive stronger interactive edges and hover feedback. Routine labels and secondary guidance use sentence case and reduced letter spacing, while gold is reserved for primary actions, earned ratings and important states. The First Match Journey action now retains its bright guided treatment instead of combining dark text with a generic dark button background. Save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.78 desktop inbox spacing and readability

Build 12.78 repairs the desktop Inbox spacing conflict introduced when later readability passes enlarged mail copy while an older rule continued to force every message row into 78 pixels. Desktop rows now size to their sender, subject and two-line preview; the message list uses the available column height rather than stopping after two rows; and the reader no longer receives duplicate outer padding on top of its own message-section padding. The result keeps the existing two-pane mail-client style while removing clipped previews, row overlap and excessive reader offsets. Mobile mail presentation, mail data, decisions, gameplay, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.77 mobile carousel navigation

Build 12.77 makes mobile recruitment carousel navigation explicit. Large previous and next arrow buttons now sit above the candidate track with a live '1 of 6' counter, while swipe and snap scrolling remain available. The current candidate is remembered across card flips and recruitment rerenders. The Build 12.75 dark boardroom card style, desktop/tablet grids, candidate data, scouting, comparison, negotiation, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.76 mobile recruitment card carousel

Build 12.76 keeps the Build 12.75 darker boardroom recruitment-card visuals and changes only the mobile browsing pattern. At mobile widths, recruitment candidates now appear in a swipeable one-card-at-a-time carousel with snap scrolling, rounded premium card framing, subtle neighbouring-card peeks and a compact swipe hint. Desktop/tablet presentation, candidate data, scouting calculations, comparison logic, negotiations, signings, economy, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.75 recruitment card visual refresh

Build 12.75 intentionally rolls back the Build 12.74 silver-shield surface treatment and returns recruitment cards to the darker boardroom style. The cards are restyled to feel more visually impressive without abandoning the established UI: richer navy gradients, premium panel depth, stronger accent lighting and cleaner card framing. The gold/platinum scouting-star language remains, desktop still shows fewer wider cards per row and candidate names continue to wrap instead of clipping. Candidate data, scouting calculations, negotiations, signing logic, economy, match simulation, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.72 mobile recruitment readability and layout integrity

Build 12.72 delivers **Mobile Recruitment Readability & Layout Integrity** while retaining the Build 12.71 card-flip and comparison systems. At mobile and compact-tablet widths, recruitment candidates now use one full-width card per row, larger decision text and substantially larger ability/potential stars. The squad-fit block receives guaranteed space above the action grid, so guidance such as **Fills an Important Gap** can no longer be compressed beneath the buttons. The reverse scouting face now expands within the card instead of creating a second internal scroll area. The expanded First Match Journey and the comparison tray remain in normal mobile document flow, preventing the tray from covering onboarding content; only the deliberately collapsed journey summary may remain sticky. Desktop presentation above 1023 pixels, candidate data, recommendation logic, negotiation/signing behaviour, economy, match simulation, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.71 compact recruitment and comparison tray

Build 12.71 delivers **Compact Recruitment & Comparison Tray** while preserving the Build 12.70 boardroom theme and all gameplay values. Recruitment-market candidates now use compact two-faced cards: the front concentrates identity, scouting confidence, ability, potential, fee, wage, squad fit and the primary decision actions, while an explicit flip control reveals the role brief, key attributes, medical status, market context and Active Five impact without navigating away or losing scroll position. A sticky three-slot comparison tray follows the shortlist through the market, supports removal and clearing, and automatically opens the existing squad-fit recommendation workspace when a second candidate is selected. The detailed comparison still evaluates immediate impact, future ceiling, current squad need and budget fit rather than simply choosing the highest rating. Flip, tray and expanded-comparison state are transient UI state only. Recruitment data, ordering, negotiation terms, signing logic, economy, match simulation, combat, persistence, save schema 19 and diagnostics schema 1 remain unchanged.

The modular source now has a single clear ownership path: `index.html` owns document structure, `css/game.css` owns the full visual presentation, and `build.py` combines those sources with the generated JavaScript bundle into the standalone release. Future visual edits should be made in `css/game.css` rather than in the generated standalone HTML.

## Build 12.69 guided navigation and advice routing

Build 12.69 delivers **Guided Navigation & Advice Routing** without changing gameplay or persistence. Starting an incoming negotiation now routes to Transfers and scrolls the active negotiation card into a clear start position, including while the First Match Journey is visible. Shared guided scrolling now resolves both tutorial guide targets and management target IDs. Opposition Manager Options name and target actionable destinations—the match plan, Active Five and squad loadouts—so choosing tactics advice from the Tactics page moves beyond the report instead of rerendering at the same review control. Recruitment data, transfer terms, tactical effects, match simulation, save schema 19 and diagnostics schema 1 remain unchanged.

The incoming-negotiation action now opens Transfers and positions the active negotiation card below the sticky management chrome rather than leaving it hidden beneath the journey panel. Opposition advice buttons now use destination-specific labels and scroll targets, including a direct move to the actionable opponent-preparation panel when the advice report is already on the Tactics page.

## Build 12.68 mobile onboarding and HUD clarity

Build 12.68 delivers **Mobile Onboarding & HUD Clarity** without changing match simulation, recruitment data or persistence. The new-club emblem chooser now replaces the large preview SVG and label immediately when a mobile player cycles between options. In portrait windowed matches, including the guided demo, the round objective is reduced to a single-line strip approximately 25 pixels high and sits flush beneath the scoreboard at the same width; the secondary planning line is hidden on this compact presentation. The mobile Inbox unread-count badge now uses true flex centring while preserving its hidden zero state. Recruitment's operator-role guide starts closed by default but remains a native expandable panel, and the ambiguous scouting `knowledge` presentation is now labelled **Scouting Confidence** with an explanation that it measures the reliability of displayed ability, potential, fee, wage and medical estimates. Desktop layout, team-emblem data, scouting progression, game balance, save schema 19 and diagnostics schema 1 remain unchanged.

The emblem preview correction is owned by `js/35-career.js`; the default-collapsed role guide is owned by `js/36-team-management.js`; scouting-confidence wording and accessible help are owned by `js/39-recruitment-commercial.js`; and the compact portrait objective plus unread-badge centring are final mobile authorities in `css/game.css`. `js/70-runtime.js` extends retained regression checks for the collapsed role guide and the scouting-confidence explanation.

## Build 12.67 living press and player honours

Build 12.67 delivers **Living Press & Player Honours**. Every completed league or exhibition fixture now receives a deterministic impact-based Man of the Match award; a winning operator from the player club adds a one-time club award of `1,500 CR` in league play or `750 CR` in exhibitions. The non-settling guided orientation remains reward-neutral. AI-versus-AI fixtures now retain compact match reports, named award winners and rival-player performance histories. Each completed league round produces a press roundup containing results, award winners, table context and notable stories, while an upcoming-opponent watch email combines confirmed recent results, likely starters, award form and scout-depth tactical interpretation. Operator profiles now include a permanent accolades and achievements timeline, and **Team > Honours** provides club-wide leaders and recent history, including records for operators who later leave the active squad. Existing played fixtures receive a one-time historical backfill. Fixture outcomes, combat AI, weapon balance, save schema 19 and diagnostics schema 1 remain unchanged; all new state is additive under `careerState.worldPress`.

The Man of the Match calculation considers eliminations, deaths, rating, role contribution, opening impact, survival, trades and clutch value rather than simply selecting the highest kill count. Awards are recorded in the after-action report, the finance breakdown and each operator's permanent history. Routine league activity is grouped into one Matchday Roundup email to prevent Inbox spam, while opposition-watch messages distinguish confirmed public results from scout interpretation and provide a clear **What This Means for You** recommendation. The living-world module is owned by `js/56-world-press-awards.js`; presentation is integrated through `js/35-career.js`, `js/36-team-management.js`, `js/50-ui-menus.js` and `css/game.css`.

## Build 12.66 mobile interface clarity

Build 12.66 delivers **Mobile Interface Clarity** without changing recruitment logic, onboarding progression or mail data. Below `1024px`, the First Match Journey panel now includes a visible chevron control and can collapse into a 48-pixel, one-line summary bar that can be expanded again with the same control. The collapsed state is presentation-only and is not added to the career save. Recruitment candidates now have stronger complete-card borders, spacing and left-edge accents so each profile has a clear beginning and end. Mobile Inbox rows no longer use the undersized fixed height inherited from the earlier layout; each message can grow to contain its metadata, subject and preview without clipping into the next row. Desktop presentation, gameplay, save schema 19 and diagnostics schema 1 remain unchanged.

## Build 12.65 mobile Help icon alignment

Build 12.65 corrects the visual alignment of the mobile topbar Help control. The `?` now uses the same centred grid ownership as the Inbox and Calendar icons, so the glyph is centred inside its existing button cell without moving or resizing the cell itself. Help behaviour, persistence, the contextual bar, desktop navigation, gameplay, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.64 mobile page help toggle

Build 12.64 gives mobile players direct control over the contextual page-help bar. Below `1024px`, the former topbar Match shortcut becomes a `?` Help toggle: white while off and gold while enabled. The bar is hidden by default, appears immediately beneath the topbar when enabled and continues to show the current department, page name, concise purpose, progress state and **Pages** action for the full Club Navigator. Turning Help off removes the bar rather than leaving an empty gap.

The preference persists independently through `strikewatch.mobilePageHelpVisible` and never modifies the career save. Page discovery remains available through the active department button even while Help is hidden. Desktop retains its existing Match shortcut and desktop command layout. The first-session shortcut guide now presents **HELP** on mobile and **MATCH** on desktop. Build 12.63 armour rendering, Build 12.62 mobile navigation, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.63 Armoury 3D preview optimisation

Build 12.63 removes the full operator inspection bust from the Team Armoury's armour detail viewer and presents the selected chest piece by itself. The complete vest geometry, front/side/rear depth, drag or swipe inspection, rotate buttons, zoom, reset and optional auto rotation remain available. The larger product-only framing keeps the vest easy to inspect on phone, landscape and desktop layouts.

Armour inventory cards now use compact full-depth models derived from the same procedural definitions. Across No Armour and the four purchasable vests, mounted authored parts fall from 401 to 158, a 60.6% reduction, while recognisable shells, plates, straps, pouches and class-specific protection remain three-dimensional. Static thumbnails no longer request permanent compositor layers, their parent drop shadow is removed, offscreen rows use content visibility and automatic detail rotation pauses while the viewer is offscreen. Supply Depot models and the live WebGL renderer are unchanged, as are armour balance, ownership, assignments, save schema 19 and diagnostics schema 1.

## Build 12.62 mobile navigation consolidation

Build 12.62 replaces the layered mobile menu stack with one coherent navigation architecture. Portrait uses a persistent five-department bottom bar; compact landscape uses the same departments in a slim left rail. A single current-page control replaces the horizontally scrolling subsection tabs and opens a full-screen Club Navigator containing department switching, global page search, current-page state, notifications, first-match guidance and precise unlock explanations.

Changing department remains a one-tap action. Tapping a different unlocked department opens its overview; tapping the active department or current-page control opens the navigator. A locked department opens its own navigator view with the precise unlock reason, and choosing an available page closes the navigator automatically. The navigator also supports X/Escape close, focus containment and return, safe areas, scroll locking and pause-session Return/Exit controls. Redundant mobile Command Index and section-hub page directories are hidden because page discovery now has one owner. Desktop keeps the established section rail, route grid and Command Index unchanged. Gameplay, progression, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.61 mobile readability and UX pass

Build 12.61 raises the mobile typography and touch baseline across portrait and compact landscape without altering the desktop Command Centre. Meaningful mobile labels now stay at or above a 9px microcopy floor, ordinary supporting copy uses larger semantic tokens, recurring actions meet a 44px touch target and locked or disabled guidance remains readable. Narrow phones use concise real navigation labels instead of clipped section names, and the month calendar changes from a cramped seven-column grid into a current/event-date list at 430px and below.

The pass covers club creation, First Match Journey locks, economy guidance, Recruitment metadata, Command HQ, mail, reports, training, supporters, Supply Depot, compact landscape navigation and the live spectator HUD. Portrait score, objective, spectator-dock and utility copy now use the same readable floor; guided-orientation feed messages no longer cover the objective. In compact landscape, the duplicate spectator panel and four-field detail grid are intentionally omitted because the readable telemetry card already presents identity, health, weapon, intention and plain-language decision reasoning. Gameplay, state, save schema 19, diagnostics schema 1 and the Build 12.60 desktop presentation are unchanged.

## Build 12.60 desktop readability pass

Build 12.60 raises the desktop-only typography baseline where secondary Command Centre and management copy still looked phone-sized. At 1024 pixels and wider, scalable text tokens now enlarge objective and priority titles, supporting explanations, momentum details, Command Index search/results, topbar/sidebar labels and selected long-term management helper copy. Rows have more breathing room and locked or disabled explanations retain better contrast.

The change remains inside the existing desktop breakpoint. The Build 12.59 onboarding flow, mobile portrait and landscape interface, gameplay, rendering, economy and saved careers are unchanged. The release also expands `typographyConsistencyForTest()` so future changes can detect regressions in the desktop objective rows and command directory.

## Build 12.59 first match onboarding refinement

Build 12.59 makes the first-career journey lighter without removing any of Strikewatch's management depth. Team creation now gives a compact three-step first-15-minute path and places the create action before optional emblem work. The authoritative nine-step state flow remains unchanged for save compatibility, but the player sees six clearer milestones.

During the opening recruitment sequence, the ordinary market temporarily opens in a focused presentation containing six deterministic recommended candidates, Active Five progress and the established comparison/signing tools. The recommendations are selected from the real market using affordability, role variety and current team needs. The complete 18-player scouting department, searches, pools and market activity remain available through **Show All Candidates & Advanced Tools** and automatically become the ordinary presentation after the opening phase. No guided-view state is saved.

The completed orientation round now removes its obsolete skip action. The release also keeps the first recommended candidate and club-creation action reachable in the initial supported desktop viewport while retaining the Build 12.58 desktop shell and established mobile layout.

## Build 12.58 desktop command centre

- Rebuilt the Command HQ experience for PC at `1024px` and wider while preserving the existing phone interface below that breakpoint.
- Added an 80-pixel desktop command bar with clearer balance/context zones, labelled Inbox/Calendar/Match shortcuts and a more deliberate End Day action.
- Expanded the desktop section rail with readable navigation, visible active/focus states and live department identity for Operations, Team, Armoury, Supplies and Club.
- Replaced the desktop mobile-style route scroller with a width-aware grid that fits or wraps cleanly and always reserves its full height above the page content.
- Centred management pages in bounded desktop canvases with larger typography, controls and card spacing instead of stretching compact phone content edge-to-edge.
- Added desktop-specific squad, recruitment, transfer, finance, Armoury and Supply Depot grids plus a true two-pane Inbox reader.
- Kept the mobile portrait and mobile-landscape cascade, touch targets, safe areas, route arrows and live-command/commentary dock unchanged.
- Gameplay, route data, renderer geometry, combat balance, economy, save schema 19 and diagnostics schema 1 are unchanged.

## Retained Build 12.57 light operator skin

- Changed every live operator to one of six deterministic pale natural complexion variants, so the exposed face and neck remain clearly visible behind armour and head equipment.
- Added a dedicated matte WebGL skin material: surface `8`, roughness `0.64` and ambient visibility lift `0.42`, preserving facial depth without making skin self-illuminated.
- Narrowed and lowered the lower-face covering so the cheeks, upper jaw and neck remain visible while the helmet, goggles and headset stay intact.
- Applied the same palette and material to living and fallen operators across all distance-detail tiers.
- Updated the Armoury fitting mannequin with a matching light natural face/neck gradient; Supply Depot armour cards remain intentionally headless.
- Operators remain gloved, so the change does not introduce artificial bare hands or alter the weapon-hold rig.
- Added `operatorSkinPresentationAudit()` / `operatorSkinPresentationForTest()` and extended the mounted 3D-armour presentation check to verify the computed Armoury skin material.
- Operator geometry outside the face-cover presentation, hitboxes, collision, movement, weapons, armour, AI, combat balance, economy, save schema 19 and diagnostics schema 1 are unchanged.
## Retained Build 12.56 connected weapon geometry

- Fixed the floating under-magazine plate and other stretched weapon seams in live WebGL rendering.
- Replaced separate world/viewmodel vertical position and size multipliers with one shared per-context scale profile, so authored neighbouring parts remain attached instead of being pulled apart at render time.
- Applied the same scale authority to operator-held weapons, corpse-held weapons, grip/support/muzzle/stock anchors and first-person viewmodels.
- Centralised the magazine plus base as one reload assembly so both pieces detach, travel and reinsert together.
- Reseated the sidearm trigger guards and added a physical bridge behind the AR-4 rear aperture to eliminate the remaining isolated presentation pieces.
- Added rendered-bounds connectivity diagnostics covering Scrap P12, Service P12, Viper-9 and AR-4 in both world and viewmodel contexts.
- Weapon damage, accuracy, fire rate, range, penetration, magazine capacity, reload timing, prices, ownership, AI, operator animation, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.55 operator model remaster

- Rebuilt the live WebGL operator head as a dedicated anatomical procedural mesh with a tapered jaw, cheek and brow volume, a restrained nose profile and stable identity-based proportion variation.
- Replaced the second spherical helmet layer with an open-bottom profiled combat shell, curved lower-face cover, separate framed goggle lenses, smooth headset cups, connected rails/chin straps and subtle team helmet tabs.
- Added six deterministic appearance variants and small per-operator head-width, height and depth variation without importing external models or textures; Build 12.57 now constrains those complexion variants to a fair/light natural family.
- Added profiled pelvis, armour-carrier, shoulder-shell and glove meshes, increased torso/limb tessellation and softened major equipment edges so the full silhouette reads as connected equipment rather than stacked blocks.
- Living and fallen operators now use the same head and body assemblies at distance-based detail tiers.
- Added `operatorHeadGeometryAudit()`, `operatorHeadGeometryForTest()` and expanded `operatorModel()` / `operatorPresentationForTest()` diagnostics.
- Collision, hit detection, movement, animation anchors, weapons, armour balance, AI, rewards, economy, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.54 full-depth 3D armour

- Rebuilt every purchasable armour preview as connected, fully volumetric procedural CSS-3D geometry rather than a front-heavy layered silhouette.
- Added complete faceted front and rear shells, shoulder bridges, wraparound cummerbund/side structures, class-specific side protection, rear plate pockets, rear MOLLE, drag handles and supporting rear details.
- Reworked Supply Depot cards around large full-width perspective stages, a restrained headless product form and a complete 360-degree orbit that reveals front, side and rear construction.
- Enlarged the Armoury inspection stage and retained drag/swipe rotation, wheel/button zoom, reset and auto-rotation on the operator-fitted model.
- Added face-specific lighting and class scale normalisation so Light, Medium Flex, Medium Plate and Bastion Heavy remain readable without the heavy model overwhelming the card.
- Fixed the underlying CSS-3D flattening fault: nested store-form, operator-body and armour-system groups now keep `filter: none`, opacity `1` and `transform-style: preserve-3d`; subdued lighting is applied to individual faces instead.
- Extended `armour3dPresentationForTest()` to verify full-depth parts, shared model use, centred rigs, large responsive stages, full orbit and unflattened computed styles in portrait and landscape.
- Armour stats, prices, inventory, assignment, penetration, integrity, movement costs, break behaviour, live WebGL balance, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.53 live command pulses

- Added one optional Live Command Pulse during every live round while preserving autonomous operator control.
- The command chooser presents exactly three context-sensitive options drawn from Regroup, Commit, Disengage, Hold Territory and Switch Route.
- Operators interpret a command according to role, awareness, pressure and current contact; individual responses may be immediate, delayed or unable.
- Commands temporarily influence movement, spacing, support behaviour, approach and existing engagement routes. They do not grant health, accuracy, damage, armour, reward or economy bonuses.
- Every affected tactical profile is snapshotted and restored when the pulse expires or the round ends, and the protected combat-configuration audit must remain empty.
- Added live acknowledgement, operator intention context, an evidence-led command outcome and a completed-match Live Command Review.
- Moved landscape commentary, current match moments and the open command chooser into a dedicated row beneath the action viewport so they no longer cover the fight.
- Kept the portrait chooser at viewport level to prevent clipping by the transformed windowed match frame.
- Added deterministic command, restoration, report and layout diagnostics while preserving all Build 12.52 arena-geometry and navigation baselines.
- Save schema remains 19 and diagnostics schema remains 1.

## Retained Build 12.52 arena geometry integrity

- Rebuilt Citadel's two stair props as grounded solid staircases with visible risers, tread caps, nosing and side stringers.
- Added ceiling hangers, anchor plates, crossbeams and an underside spine to both Citadel overhead walkways.
- Tied Citadel and Office door portals visibly into adjacent walls and added flush thresholds.
- Grounded Citadel tanks, terminals and industrial props with plinths, skids and connected top hardware.
- Mounted Office ceiling baffles to their actual local/main ceiling heights; framed glass with channels and mullions; and mounted wall screens with rails and cable raceways.
- Replaced twenty primitive floating Office chair blocks with connected seats, backs, stems, four-spoke bases and casters; completed bench and sofa supports.
- Moved the Office conference table and six chairs out of a wall block into the open conference bay, rotating the authored prop and its collider together.
- Completed all four Dune canopy frames with shared collider-aligned posts plus perimeter headers, braces and rafters that follow the pitched fabric plane; completed market-stall headers and closed amphora handles.
- Added `arenaGeometryIntegrityForTest()` and `allArenaGeometryIntegrityForTest()` plus map-specific presentation snapshots.
- Preserved gameplay balance, spawn points, engagement plans, save schema 19 and diagnostics schema 1.

## Build 12.51 living transfer market and organic mail

- Added persistent, uniquely generated market entrants from academy graduation, free agency, club releases, transfer listings and lower-division breakthroughs.
- Candidate strength and cost are generated per league tier. Recruitment sources may come from the current division or a lower division, never an inaccessible stronger pool.
- Listings now have availability windows, demand values and transparent rising, stable or falling price momentum.
- Rival clubs target operators according to actual role deficits, tactical identity, roster strength, transfer budget and wage capacity; completed AI signings persist in rival squads.
- Replaced the destructive full-market refresh with a commissioned search that rotates up to three low-priority listings while preserving shortlisted players, rival bids and active negotiations.
- Added a Living Transfer Market pulse to Recruitment plus source, availability and competition context on every candidate row and dossier.
- Extended inbox messages to support long bodies, custom senders and previews. The inbox reader and existing email popup now scroll independently on phone and landscape layouts.
- Added organic market intelligence digests, signing dossiers and expanded match reports built from real events in the current save.
- Added `dynamicTransferMarketForTest()` covering unique names, league balance, intelligent role targeting, shortlist-safe searches, AI-roster persistence, long organic mail, state persistence and scroll behaviour.
- Save schema remains 19 and diagnostics schema remains 1.

## Build 12.50 matchday story and payoff

- Added restrained live recognition for opening eliminations, immediate trades, successful flanks, long-range picks, multi-kills and clutches using visible match evidence.
- Every completed round now includes one concise reason derived from support spacing, trade conversion, accuracy, damage and survivors; draws receive neutral wording.
- Added an evidence-led Match Story panel with Play of the Match, Turning Point, Best Partnership Moment, Tactical Payoff and Unexpected Contributor.
- The first-match Operator Impact stage now surfaces the two most important match-story cards before listing the Active Five development results.
- Operators can earn up to two persistent presentation-only identity badges after repeated evidence across at least three matches. Badges add no hidden bonus and do not alter attributes, weapons, AI or tactics.
- Added subtle match-moment audio cues and responsive report/profile presentation.
- Match rules, combat balance, rewards, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.49 consolidated economy guidance

- Audited the complete first-run economy flow across recruitment, the foundation loan, wage headroom, first-match rewards, Club Finances, Gold Coins, Training and the Supply Depot.
- Added one reusable Economy Guide that explains the systems at the two points where the player actually needs them: before the first contract and after the first completed match.
- Recruitment now states plainly that the transfer fee leaves Club Cash immediately, wage headroom is a weekly limit rather than another balance and payroll is later deducted from Club Cash.
- The first-match reward stage now distinguishes Club Cash, Gold Coins, Team XP and Player XP by exact use, and explicitly states that a free victory Supply Drop is not currency.
- Reworked the later Finance, Gold Coin and Training one-time guides to explain their page-specific controls instead of repeating basic definitions. Added a Supply Depot guide explaining Cash purchases, Gold Coin crates and free victory crates.
- Removed the duplicated long-form loan explanation from the opening induction while preserving all principal, total repayment, instalment and schedule information in one compact reference.
- Economy rules, prices, reward formulas, wages, loan repayments, progression values, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.48 recruitment decision tool

- Replaced the passive side-by-side candidate list with an interpreted recruitment decision tool.
- Selecting two or three candidates now produces a **Best Current Fit** recommendation based on current squad needs, immediate impact, future ceiling, affordability and available scouting knowledge.
- Every candidate receives clear **Why This Fits** and **Main Trade-off** explanations rather than raw figures alone.
- Immediate Impact, Future Ceiling, Squad Need and Budget Fit are presented as readable decision scores, while underlying ability, potential, role attributes, medical risk, fee, wage, cash-after-signing and Active Five impact remain visible.
- Comparison cards include direct **Open Report** and **Negotiate** actions.
- During the tutorial, the empty state teaches a three-step comparison flow. After the second candidate is selected, the completed comparison is automatically brought into view.
- Comparison state remains transient and does not change scouting, transfer calculations, player ratings, save schema 19 or diagnostics schema 1.

## Build 12.47 recruitment negotiation fix

- Fixed the opening tutorial bug where **Negotiate** created an incoming deal but the progressive menu lock prevented the Transfer Centre from opening.
- An active incoming negotiation now temporarily unlocks the Transfer Centre during Recruitment, Profile, First Signing and Active Five guide steps.
- Negotiate works from both candidate rows and candidate profiles.
- Tutorial copy now explicitly explains the sequence: Negotiate, Submit Offer and Complete Signing.
- Added a retained guidance check confirming Transfers is locked before a deal and opens only while the tutorial negotiation is active.
- Recruitment, transfer finances, squad limits, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.46 tailored armour finish

- Refined every armour class into a more believable worn silhouette with tapered carriers, segmented shell layers, better-fitted side protection and cleaner shoulder/collar integration.
- Added clearer material separation between soft carrier fabric, plate pockets, hard armour, clips, rubber shoulder bases and radio cabling so the models read less like one merged block.
- Improved the procedural operator mannequin pose and the armour viewer lighting/presentation so the vest shape is easier to judge in both Supply Depot cards and the Armoury detail inspector.
- Kept the Build 12.45 centred-rig fix and the Build 12.44 live WebGL class differentiation, while lightly refining the in-match armour proportions to better match the showcase models.
- Armour balance, pricing, inventory, assignment, penetration, integrity and breakage remain unchanged. Save schema remains 19 and diagnostics schema remains 1.

## Build 12.45 centred armour previews

- Fixed the nested armour rig alignment so Supply Depot cards and the Armoury detail inspector show the full armour model instead of a cropped side slice.
- Store previews remain armour-only, while the detailed viewer still fits the selected vest to the procedural operator mannequin introduced in Build 12.44.
- Light, Medium Flex, Medium Plate and Heavy rigs all stay visually distinct, and Bastion Heavy still reads as the premium broad/deep protection option.
- Added a stronger `armour3dPresentationForTest()` regression check that mounts the previews and verifies the nested 3D rig remains centred in both store and detail contexts.
- Armour balance, pricing, inventory, assignment, penetration, integrity and breakage remain unchanged. Save schema remains 19 and diagnostics schema remains 1.

## Build 12.44 operator-fitted 3D armour

- Armour inspector models are now fitted to a procedural full operator mannequin built from the same 3D cuboid/cylinder system as the weapon and armour components.
- Vest proportions are more believable in context: narrower light carriers, broader medium plate rigs and a substantially deeper, wider Bastion Heavy silhouette.
- Bastion Heavy visibly adds enlarged side plates, shoulder protection, collar/neck protection, abdomen plate and lower groin guard.
- The live WebGL operator renderer now mirrors the armour-class silhouette differences, including class-specific width, depth, side plates, shoulders, collar, abdomen and lower protection.
- Armour balance, pricing, inventory, assignment, penetration, integrity and breakage remain unchanged. Save schema remains 19 and diagnostics schema remains 1.

## Build 12.42 interactive 3D armour inspection

- Armour detail previews now support drag/swipe rotation, wheel or button zoom, reset and optional auto-rotation.
- Armour inspection uses a dedicated viewer state and does not rotate the weapon viewer.
- Supply Depot armour models rotate slowly while idle, with staggered timing and reduced-motion support.
- Light, Medium Flex, Medium Plate and Heavy rigs now have visibly different widths, plates, side panels, shoulders, collars, radio modules and lower protection pieces.
- Store purchases, armour inventory, durability, penetration and equipment balance are unchanged. Save schema remains 19 and diagnostics schema remains 1.

## Build 12.41 procedural 3D armour stock

- Replaced the previous flat armour silhouette with a shared layered CSS-3D model in the Supply Depot, armour inventory and loadout detail.
- The model remains procedural and self-contained with no external asset dependency.

## Build 12.40 season stories

- Every scheduled league fixture receives an evidence-based importance rating and context such as a season opener, table-neighbour battle, promotion race, survival six-pointer, revenge match, rivalry fixture or form-streak test.
- Supporter and board expectations are shown as contextual views rather than hard result requirements.
- Rivalries grow from real repeated meetings, close scores and meaningful stakes through Standard, Emerging, Heated and Fierce tiers at 0, 20, 45 and 75 intensity.
- Automatic campaign storylines recognise promotion challenges, surprise form, winning or losing runs, home/away patterns, breakout operators, famous partnerships and tactical identity.
- Club history records biggest wins and defeats, longest winning streak, highest finish, highest points and best round difference, while completed campaigns archive position, movement, top operator and strongest partnership.
- The same story context appears in the League screen, deployment, pre-match reveal and debrief. Occasional inbox headlines are informational only.
- High-stakes wins can grant a small positive reputation bonus capped at 2. The system adds no combat modifier, result manipulation, loss penalty, required response, End Day blocker or routine micromanagement.
- Fixture and season settlement are deduplicated. Save schema remains 19 and diagnostics schema remains 1.


## Build 12.39 squad dynamics

- Contracted operators now build persistent partnerships from shared matches, support spacing, trades, results and joint performance.
- Familiar, Linked, Trusted and Elite tiers unlock small, transparent positive-only coordination benefits through existing owned-operator behaviour fields.
- Each starter uses only their strongest active partnership, preventing uncontrolled stacking.
- Active-five atmosphere can add a small positive role-execution uplift; low atmosphere never creates a penalty.
- One automatic natural mentor link can grant a developing operator +6% training and match-development XP.
- Squad cards, the Squad Dynamics panel, operator profiles and the match debrief explain relationship progress and the exact active benefit.
- Relationships do not decay, and the system adds no routine conversations, compulsory responses, decision blockers, End Day locks or hidden health/damage/opponent effects.
- Milestone reporting is capped to avoid notification spam. Save schema remains 19 and diagnostics schema remains 1.

## Build 12.38 retained tactical adaptation

- Every non-final career round now opens a full-device tactical review with round execution, scouting accuracy and an explicitly uncertain opponent-response forecast.
- Managers can change at most two categories: tempo, engagement range, team shape or next-round route/territory.
- Route choices reuse the map's established engagement plans; approach, range and priority continue to drive the existing autonomous operator AI.
- Opponents can adapt between rounds using their existing tactical behaviours in response to visible match evidence. No health, damage, accuracy or other hidden bonus is applied.
- Manager interventions and opponent responses appear in live notices and are evaluated in the debrief against the following round's telemetry.
- The modal is reparented to the document body so it remains usable across the full 320–430px portrait device instead of being trapped inside the small transformed match window.
- Save schema remains 19 and diagnostics schema remains 1.


## Build 12.37 opponent preparation

- The Tactics screen now connects the scheduled next opponent to scouting confidence, likely tactical behaviour, weapon-range compatibility and three reversible response templates.
- Managers can select up to two fixture drills. They create explicit debrief criteria without applying hidden attribute or combat bonuses.
- Confirmed preparation is carried into round-one match notices and the after-action tactical review.
- Reports below 50% depth keep exact shape, tempo, range, priority and route details unconfirmed throughout preparation, live presentation and debrief.
- Preparation always follows the scheduled league fixture rather than a transient exhibition or deployment opponent.
- Save schema remains 19 and diagnostics schema remains 1.


## Build 12.36 guided calendar lock

- During First Match Guide stages where calendar progression is unavailable, the persistent End Day cell is now a neutral grey space with one centred padlock instead of squeezed **END DAY UNAVAILABLE** and **FOLLOW FIRST MATCH GUIDE** copy.
- The full reason and correct destination remain available through the button's accessible label and tooltip, while the visible guide panel continues to explain the next action.
- The padlock disappears automatically when `openingWeekTutorialDayRestriction()` clears; normal End Day, matchday and required-response states are unchanged.
- No calendar, blocker, tutorial, save, diagnostic, economy, training or match logic changed. Save schema remains 19 and diagnostics schema remains 1.


## Build 12.35 opening week command

- The post-tutorial Command Centre now becomes a live **Club Daily Agenda** instead of a static handoff checklist.
- Required blockers, recommended preparation and optional club work are separated so the player can see what must happen, what would improve readiness and what can wait.
- A six-point **Fixture Preparation** meter covers the Active Five, medical availability, training, opposition scouting, confirmed tactics and weapon-range fit. It advises without forbidding a risky deployment.
- **Advance to Next Event** moves through normal calendar days until training, medical, scouting, transfer, decision or fixture activity needs attention, with a maximum 21-day safety horizon.
- A routed day-change summary explains readiness, fatigue, tactical familiarity, scouting, training, cash and newly required actions after one-day or multi-day progression.
- End Day is disabled during opening recruitment and other tutorial stages where time should not be consumed. It unlocks when the first-match step actually needs the calendar advanced to matchday.
- The feature uses existing day settlement and blocker rules. It does not auto-answer decisions, change tactics/training/equipment, skip fixtures or add save fields. Save schema remains 19 and diagnostics schema remains 1.

## Build 12.34 recruitment decision support

Build 12.34 adds recruitment decision support without changing role weights, operator generation, transfer prices, wages, AI behaviour or match balance. Recruitment now opens with an Active Five Needs panel that translates contracted operators into six team functions, highlights missing or partial coverage and shows remaining transfer cash plus wage use. Every market candidate receives a contextual What This Operator Adds assessment, scouting-aware role-fit readout, affordability/medical cautions and optional beginner recommendations for immediate fit, affordability and development upside. Managers can compare up to three market or shortlisted candidates side by side; comparison selection and the latest signing summary are transient UI state and are not added to save schema 19. After a completed signing, the market shows which team function improved and the clearest remaining need. Preserve `RECRUITMENT_TEAM_FUNCTIONS`, `recruitmentCompositionReport()`, `recruitmentCandidateAssessment()`, `recruitmentRecommendationMap()`, `recruitmentComparisonPanelMarkup()`, `recruitmentRecordSigningUpdate()`, `recruitmentDecisionSupportForTest()`, the three-candidate limit, mobile containment, save schema 19 and diagnostics schema 1.

This folder contains the maintainable modular source for **Strikewatch Build 12.54: Full-Depth 3D Armour** and its generated self-contained browser release.





## Build 12.33 recruitment role clarity

- Recruitment now begins with an operator role guide covering **Entry, Support, Anchor, Flanker, Marksman, Shot Caller and Flex**.
- Every role is explained in plain language with its main job, the attributes worth looking for and the main trade-off a new manager should understand.
- During the First Match Guide, the role reference opens automatically. Later it remains available as a collapsible reference without permanently occupying the market screen.
- **Recruit Operator** and **Continue Recruiting** now scroll to a destination containing the role guide followed by the candidate list, so the explanation is seen before the player chooses.
- Candidate profiles add a focused primary/secondary role explanation, including what a Flanker or other specialist will try to do during autonomous matches.
- A beginner-friendly example active five is shown while making clear that duplicate roles are valid and the suggestion is not a forced formation.
- Added `recruitmentRoleGuideForTest()` and extended guided-recruitment regression coverage. No role weights, AI behaviour, player generation, prices, wages, save fields or match balance changed.

## Build 12.32 first match payoff

- The final deployment screen now shows the five active operator portraits, opponent identity/style, dynamic strength, public win chance, supporter expectation, selected map, match format and existing tactical/range warnings before **Deploy Active Five Operators**.
- Matchmaking now hands off to a full-device team-versus-team reveal with both five-operator rosters and the confirmed formation, approach, engagement range and priority. The match remains paused until **Begin Match**.
- Career matches now surface readable match moments for last-operator situations, 1v1 clutch opportunities, close-out advantages, match point and applied between-round tactical changes. The first match also briefly connects the viewed operator's role, weapon range and tactical plan to their autonomous behaviour.
- The first career result is revealed in five clear steps: Match Result, Rewards Banked, Operator Impact, Supporter Reaction and Next Manager Action. The final step shows newly available systems and a direct coaching button before the detailed report; taking it counts the debrief as reviewed so Training can open immediately.
- Intro/report actions stay visible through sticky footer controls, including short phone landscape. No new external assets, network calls, balance modifiers or save fields were added.
- Added `firstMatchPayoffForTest()` and responsive coverage at 320–430px portrait and 844×390 landscape. Career save schema remains 19 and diagnostics schema remains 1.

## Build 12.31 demo viewport coach

- All four guided-demo explanation cards now appear over the portrait match viewport using the same placement shown by the tactical-preparation card.
- The first and second cards no longer sit below the visible match window. Short portrait screens keep the card accessible through bounded internal scrolling.
- The demo round stays paused through all four explanations. Selecting **Watch the Round** on the fourth card removes the overlay and starts the unobstructed one-round simulation.
- The orientation remains non-career: results, finances, condition, league position, rewards and reports are unchanged.
- `newPlayerOrientationForTest()` now checks the four-stage pause contract and final Watch the Round action.

## Build 12.30 guidance consolidation

- The **First Match Guide** is now the only visible opening progress tracker and recommended-next-action system.
- The older Manager Induction remains available as a closed **Optional Context** panel. It explains why the current step matters only when opened and no longer repeats the guide’s navigation button.
- The Foundation Plan stays hidden during the nine-step journey. Once the guide is complete, Build 12.35 replaces the retired handoff with the live **Club Daily Agenda**.
- One-time section tutorials, the Command Index’s recommended list and the Command Centre’s second next-action card are delayed or removed while the First Match Guide is active.
- Loan details and shortcut explanations remain available inside optional context rather than occupying the default new-player view.
- Added `guidanceConsolidationForTest()` and retained progressive menu locks, the concept/demo orientation, guided candidate scrolling, fixed viewport and save schema 19.

## Build 12.29 guided recruitment destination

- The first-match guide’s **Recruit Operator** and **Continue Recruiting** buttons now open the active Recruitment market view and smoothly move the management pane directly to the available candidate list.
- The candidate list receives a brief blue arrival outline so the destination is immediately clear without changing selection or keyboard focus.
- The scroll stays inside the Command HQ content area; the page, topbar and navigation remain fixed.
- The same behaviour works when arriving from another page, from the Recruitment shortlist/assignments subviews or when the player is already viewing the market.
- `firstMatchGuidanceForTest()` now verifies the guide target, action attribute and candidate-list anchor.

## Build 12.28 guided demo orientation

- Immediately after a new club is created, a dedicated concept briefing explains that Strikewatch is a management game: the player recruits, equips and prepares operators, while those operators move, aim and fight autonomously.
- The briefing repeats the **Recruit → Prepare → Watch → Improve** loop, explains five-operator no-respawn rounds and distinguishes the one-round orientation from normal first-to-three matches.
- New managers can enter a real one-round AI simulation on Citadel Depot before recruiting. Four guided coach steps identify the scoreboard, round objective, autonomous tactical plan, spectator information and changing live intention.
- The orientation uses the existing combat simulation without hidden stat bonuses. It is explicitly non-career: no result, finance, condition, league or operator record is changed.
- Completing or skipping the demo returns directly to Recruitment. The choice is stored only in the existing tutorial context object, so career save schema 19 and diagnostics schema 1 remain unchanged.
- Added `newPlayerOrientationForTest()` and source/standalone responsive coverage for 320–430px portrait and 844×390 landscape.


## Build 12.27 progressive interface reveal

- During the first-match journey, all sections remain visible so new managers can see the game's depth, while unrelated pages are greyed and marked with their unlock requirement.
- Locked primary sections still open an overview preview showing the future tools and the next milestone; locked sub-navigation and directory entries cannot be used to bypass progression.
- Recruiting five operators unlocks the Active Five Operators screen, Tactics and Team Armoury. Confirming the plan unlocks League and Calendar.
- Completing the first match unlocks Team Telemetry, After Action and Supplies. Reviewing the debrief unlocks Training. Setting one training focus opens Transfers, Staff, Finances, Gold Coins, Commercial and Fans.
- Inbox, Recruitment, section overviews and Configuration remain available from the beginning. The access layer retires after the guided opening or two completed matches, protecting established saves from being re-locked.
- Added `progressiveInterfaceForTest()` and retained the fixed viewport, readable typography, first-match guidance, save schema 19 and diagnostics schema 1.

## Build 12.26 first match guidance and live clarity

- The opening career now presents one persistent **Next Objective** at a time, with progress and a direct action button. The relevant Team, Operations or Club route is visually emphasised without locking other systems.
- The opening workflow now consistently calls the deployed group the **active five operators** and explains that they move, aim and fight autonomously.
- Recruitment and squad cards include stylised operator busts and role-coded presentation graphics. Deployment rows also show a role glyph.
- Live matches show the current round objective, the plan being executed and a readable intention for the spectated operator, such as holding cover, investigating sound, flanking, reloading or engaging.
- The first after-action report explains how to read What Worked, Biggest Issue and Next Manager Action before showing the detailed evidence.
- Build 12.25 fixed-view typography, Build 12.24 random team names/onboarding and all existing gameplay systems are retained.

## Build 12.25 readable interface and fixed view

- Disabled browser pinch zoom with a fixed `maximum-scale=1,user-scalable=no` viewport.
- Increased and normalised management-screen typography instead of scaling the whole interface.
- Improved primary navigation, section tabs, date/status copy, priority cards, command-centre details, line-up labels, progress summaries and workflow buttons.
- Retained slightly tighter navigation at 320–350px so labels fit without clipping, while body and tutorial copy stay comfortably readable.
- Applied the same readability floor to phone landscape layouts through 900px wide.
- Kept the compact console styling, horizontal route rails, match HUD and gameplay presentation unchanged.
- Added `typographyConsistencyForTest()` and updated `onboardingClarityForTest()` for the fixed-view contract.


## Build 12.24 onboarding clarity and accessibility

- Team creation now explains the whole premise before the player begins: manage a tactical club, recruit and equip five operators, set roles and tactics, then watch the operators fight autonomously in first-to-three-round matches.
- The long-term objective is now prominent: improve the club and earn promotion through the divisions to reach the Pro League.
- Added a four-card visual game-loop guide for **Recruit → Prepare → Watch → Improve**, plus clearer borrowing and finance context.
- Added an editable **Random Name** button beside the team-name field. It produces fictional club names that obey the existing 24-character name rules.
- Rewrote the retained six-step manager induction so each step explains why the action matters, not only where to tap.
- Increased onboarding/tutorial text sizes, enlarged first-run controls and added stronger keyboard focus. Its browser-zoom setting was later superseded by Build 12.25.
- New deterministic gates: `randomTeamNameForTest()` and `onboardingClarityForTest()`.

## Build 12.23 Supply purchase confirmation

- Fixed direct Supply Depot purchases not refreshing the visible owned-copy count or cash balance.
- Added an inline receipt showing the item added, current owned copies and remaining cash.
- The button now reads `PURCHASED · OWNED N` and is locked for 0.9 seconds so rapid taps cannot silently buy several copies.
- After the lock it changes to `BUY ANOTHER`, preserving intentional repeat purchases.
- The store keeps its scroll position while cards refresh. The same behaviour now applies to direct armour purchases.
- Added `cashWeaponPurchaseFeedbackForTest()` to exercise the real click handler and verify exact charge, one-copy addition, refreshed quantity, visible receipt and repeat-click guard.

## Build 12.22 Supply Depot 3D weapon stock

- The AR-4 Sentinel is now a permanent direct cash purchase in the Supply Depot for **58,000 CR**, alongside the Viper-9 Compact at **32,000 CR**. Each purchase creates one finite club-owned copy.
- Every direct weapon offer now shows the same shared CSS 3D model used by Team Armoury/loadout previews. The store does not maintain separate weapon artwork or simplified silhouettes.
- The AR-4 offer is presented first so the primary weapon is immediately visible on narrow mobile screens. Both cards retain slot, range, damage, magazine, penetration, movement cost, benefits, limitations and owned-copy information.
- Weapon purchases are recorded in the cash finance ledger. Weapon balance, crate odds, inventory assignment rules, save schema 19 and diagnostics schema 1 are unchanged.
- New deterministic gate: `cashWeaponStoreForTest()`.


## Build 12.21 reload cover and hit reactions

- Operators who are caught reloading without a loaded alternate weapon now seek nearby cover while the reload continues. If no cover anchor is available they break line of sight with a controlled fallback, and they continue to the selected anchor when the magazine change completes en route.
- A distinct loaded alternate weapon avoids the forced cover rule, preserving the established emergency sidearm behaviour.
- Every hit retains visible reaction feedback. Some non-fatal hits now cause a brief aim flinch based on impact, critical/headshot status, armour absorption and resilience. The capped chance, short duration and anti-chain cooldown prevent stun-locking.
- Flinch interrupts the current burst and slightly affects aim/movement, but never cancels reloads or weapon swaps. Third-person and first-person weapon motion reflect the reaction.
- Diagnostics expose reload-cover seeks/arrivals/fallbacks and flinch activity. Save schema remains 19; diagnostics schema remains 1.
- New deterministic gates: `reloadCoverBehaviourForTest()` and `hitReactionFlinchForTest()`.

## Build 12.20 AR-4 held-pose refinement

- Pulled the complete operator-held AR-4 rearward so the butt pad now seats against the dominant shoulder instead of floating forward across the chest.
- Raised and shifted the rifle toward the firing side for a more natural ready stance while keeping both hands attached to the shared `pistol-grip` and `support-grip` parts.
- Preserved first-person placement, Armoury presentation, reload animation, muzzle placement, weapon balance and every shared AR-4 model component.
- Added deterministic stock-seat validation to `operatorWeaponAttachmentForTest()` and a live WebGL inspection helper, `operatorHeldPoseForTest()`.
- Save schema remains 19 and diagnostics schema remains 1.

## Build 12.19 AR-4 iron-sight refinement

- Removed the AR-4 tube scope from the shared model in Armoury, first person and operator-held rendering.
- Added compact front and rear flip-up iron sights on a lower, cleaner top rail.
- Tightened the stock, receiver and handguard proportions and added small receiver/endcap details without changing hand, magazine or muzzle anchors.
- Updated `ar4WeaponModelForTest()` to require the iron sights, reject every legacy optic part and enforce the lower profile.
- Weapon balance, inventory, AI, armour, economy, save schema 19 and diagnostics schema 1 are unchanged.

## Build 12.18 AR-4 procedural model pass

- The AR-4 Sentinel now uses rounded procedural receiver, stock, handguard, magazine, grip and optic surfaces instead of reading as a stack of flat boxes.
- The live barrel, gas tube, stock rail, muzzle assembly and optic tube are genuinely cylindrical in first person and on operators.
- Armoury and inventory previews use the same authored parts and now render the rifle's cylindrical pieces as rotatable CSS 3D geometry.
- Grip/support-hand anchors, reload animation, magazine movement, muzzle-flash position, weapon balance, inventory and primary/sidearm behaviour are unchanged.
- New deterministic audit: `ar4WeaponModelForTest()`.

## Build 12.17 primary and sidearm loadouts

- Operators now equip a primary, a required sidearm and armour. A pistol-only operator leaves the primary slot empty and uses the sidearm as the main weapon.
- Existing saves migrate to schema 19: legacy pistols become sidearms; legacy rifles remain primaries and receive a starter Scrapline sidearm. Inventory copies are counted across both slots.
- AI can draw the sidearm for sudden close contact or an empty primary under pressure, then return to the primary when range or safety favours it. Primary and sidearm ammunition remain independent.
- The AR-4 now has explicit carried movement, turning, moving-accuracy, sprint-settle, fatigue, reload and noise disadvantages. Pistols retain rapid draw, no movement penalty and close-range responsiveness.
- Armoury and CR-store weapon cards show slot, effective range, damage, magazine, penetration, movement cost, benefits and limitations.
- Spectator HUD displays live armour integrity alongside HP; portrait telemetry shows `HP · ARM`.
- Match diagnostics and debrief data retain weapon switches and sidearm draws.

Key tests: `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()`, `weaponSwitchingForTest()`, `spectatorArmourHudForTest()`, `operatorWeaponLoadoutMappingForTest()` and `stateIntegrityForTest()`.

## Build 12.16 match-long armour attrition

- Armour keeps its exact remaining integrity between rounds of the same match. Damage taken in round one therefore changes protection available in later rounds.
- Surviving armour is automatically serviced only when a new match begins; there is no between-round repair or manual repair screen.
- Zero-integrity armour still breaks permanently. An owned copy is removed and unequipped, while a destroyed opposition rig also stays absent for the remaining rounds.
- Store and loadout guidance now explains match-long integrity, between-match servicing and permanent breakage.
- `armourMatchAttritionForTest()` verifies partial integrity entering round two unchanged, new-match servicing and destroyed opposition armour remaining unavailable.

## Retained Build 12.15 armour loadout and penetration

- The Supply Depot sells four armour classes for CR: Scout Weave, Response Carrier, Guardian Plate and Bastion Heavy.
- Each purchase is one physical club copy and can protect one player at a time. Armour is equipped beside weapons in Team Armoury and appears on each player’s loadout row.
- Armour protects torso hits only; headshots bypass it. Weapon penetration reduces protection and increases integrity wear.
- Armour integrity is match-long in the current release. Reaching zero permanently destroys that purchased copy and automatically leaves the player unarmoured.
- Light armour keeps mobility; medium rigs balance protection and speed; heavy armour offers the strongest resistance to sidearms but slows movement, handling and recovery workload.
- Operator models visibly distinguish unarmoured, light, medium and heavy rigs. HUD and diagnostics show live integrity and broken state.
- Career save schema is now 18 with safe migration from schema 17 and older saves. Diagnostics remains schema 1 with optional armour fields.
- New debug coverage: `armourSystemForTest()`, `seedArmourLoadoutsForTest()`, `armourLoadoutMappingForTest()` and `equipPlayerArmourForTest()`. Career round-trip output includes armour inventory and per-player armour IDs.

## Retained Build 12.14 weapon attachment integrity pass

- Equipped weapon IDs continue to map independently to all five owned operator slots.
- Shared P12/Viper/AR-4 world models now position both hands from the authored grip geometry rather than generic weapon-class offsets.
- The AR-4 first-person dominant hand now uses its `pistol-grip` and the support hand uses its `support-grip`.
- Shared-model muzzle flashes originate just beyond the model's authored barrel bounds instead of legacy fixed distances.
- Operator hand bob is applied once, preventing the hands from drifting vertically away from the weapon during movement.
- Far-distance AR-4 presentation retains both grip components while still dropping non-essential fittings first.
- New debug audits: `operatorWeaponAttachmentForTest()` and `operatorWeaponLoadoutMappingForTest()`.
- Weapon stats, inventory, combat simulation, AI and schemas are unchanged.

## Retained Build 12.13 tactical readability and coaching pass

- Deployment shows the actual first-round opening plan on the selected map with five numbered routes, assigned roles, weapon range bands, likely contact area and actionable plan warnings.
- The captured `openingPlanId` now drives round one, so the preview and autonomous starting objectives stay in parity; later rounds remain dynamic.
- The owned-operator spectator panel explains action, reason, visible target, current/preferred range, team instruction and route intent, with a compact portrait summary.
- Completed reports compare tactical intent with actual formation, approach, range, priority, opening and spacing execution, then provide five role-execution cards.
- Coaching recommendations link directly to Tactics, the relevant Training card or the relevant Armoury loadout without applying changes automatically.
- Adds dedicated preview, parity, live-explanation, coaching-analysis and destination regression helpers. Save schema 17 and diagnostics schema 1 are unchanged.

## Retained Build 12.12 AI pacing and spacing pass

- Adds a shared quality-tier budget for broad perception scans and ordinary tactical reconsideration across all fixed updates in one rendered frame.
- Replaces candidate-by-candidate combat-route A* searches with bounded cheap scoring followed by at most one budgeted path search.
- Adds tactic-, engagement- and role-aware lane spacing. Stay Grouped remains compact without overlap; Trade, Hold and Flank use progressively wider separation.
- Regroup/follow points, dynamic goals and traffic penalties now account for teammate positions, reserved destinations, next waypoints and duplicate firing angles.
- Adds diagnostics for AI deferrals, combat-route search volume, spacing corrections and lane separations.
- Adds `botWorkBudgetForTest()`, `combatRouteBudgetForTest()` and `teamSpacingForTest()`.

## Retained Build 12.11 hotfix

- Fixed a first-elimination crash where the near-distance corpse renderer referenced an undeclared `fullDetail` LOD flag.
- Corpse LOD is now self-contained and validated across all three death poses at near, medium and distant ranges.
- The animation loop now records bounded runtime faults and always schedules the next frame, preventing a presentation exception from silently killing the whole match loop.
- Diagnostic exports retain schema 1 and add optional runtime-fault details for future freeze investigations.
- All Build 12.11 stability, Build 12.10 perception, Build 12.09 intelligence/motion/optimisation and Build 12.08 operator-model improvements remain enabled.

## Retained Build 12.10 hotfix

- Fixed a release-blocking issue where operators could repeatedly glimpse enemies but never finish the reaction phase, resulting in no targets, attacks or damage.
- Pending visible enemies are now retained and checked on every frame while the more expensive search for alternative enemies remains staggered for performance.
- Enemies directly standing in front of another target can be selected immediately, while friendly operators still block sight realistically.
- Added a deterministic staggered-acquisition regression plus live Dune combat smoke coverage.
- All Build 12.09 AI commitment, animation and weaker-phone optimisation systems remain enabled.

## Retained Build 12.09 highlights

- Calmer target selection with commitment windows, stronger switch margins and immediate-threat exceptions.
- Longer tactical commitments and fewer repeated same-intent decisions.
- Walkability, clearance and team-mate reservation checks for dynamic navigation goals.
- Staggered broad perception scans while retaining per-frame visibility truth for the current target.
- More natural locomotion through turn anticipation, foot-plant weighting, body lean, breathing and aim stability.
- A measured runtime quality governor for older phones: adaptive operator/weapon LOD, perception cadence, path-plan budget and render resolution.
- Diagnostics now report the active quality tier.

### Retained Build 12.08 operator model

- Operators now use a shaped procedural torso with a narrower waist, fuller ribcage and sloped shoulders instead of one rectangular body block.
- Arms and legs use tapered rounded capsule geometry while retaining the existing two-bone leg rig, aiming, reloads, hit reactions and death poses.
- Major armour, boots, pouches and helmet fittings use rounded procedural surfaces, and corpses share the same improved body construction.
- The custom WebGL engine remains in place. The upgrade adds no external model dependency, no extra body draw calls and no changes to collision, hit detection, AI, weapon balance, progression or saves.
- A deterministic close-range operator presentation hook and surface-geometry audit now support visual/regression checks.
- The Build 12.07 Dune Bastion support and attachment corrections remain fully retained.

- Rebuilt all six freestanding Dune standards so each now has a grounded stone foot, continuous mast, connected top/lower rods and an aligned `banner-post` collider. The cloth remains decorative while the visible ground support is physically represented.
- Corrected the separate floating arch details shown in Free Roam: recessed inner lintels now overlap the main masonry, and teal landmark blocks are now flush-mounted plaques with sandstone backing on the arch face.
- Expanded the Dune audit from canopy-only clearance to all structural supports. It now rejects support-to-prop intersections, support-to-support intersections, missing banner bases/colliders and detached arch details.
- Preserved the proven 36 × 24 single-floor wall grid, exact left/right symmetry, lane widths, all five primary routes and the three intended combat bands. No weapon, health, AI-strength, reward, economy or progression value changed.
- Dune now has 58 static colliders: ordinary gameplay props plus every visible canopy, arch and banner ground support. The current live graph has 494 nodes, 2,752 edges and one component, with 160/160 benchmark routes succeeding and zero failures.
- Citadel, Office, diagnostics, state integrity, Free Roam and supported mobile viewport checks also remain clean.

### Build 12.06 prop-alignment pass retained

- All eight Dune braziers remain mounted to verified masonry faces with visible backing plates/brackets and open space in front.
- Mirrored courtyard crate stacks remain clear of canopy posts.
- The brazier and canopy-clearance regression gates remain mandatory.

### Build 12.05 fortress pass retained

- Significantly upgraded **Dune Bastion** while preserving its proven 36 × 24 single-floor wall grid, symmetry and three combat bands.
- Added a stronger fortress skyline with perimeter crenellations, landmark arches, corner-tower silhouettes and a low-cost exterior desert backdrop of dunes and rocks outside the playable collision space.
- Added patterned North Rampart paving, Central Gate stonework, courtyard mosaics and South Bazaar rugs; reduced the old floor-grid emphasis so the environment reads as a place rather than a tile map.
- Rebuilt canopies with striped cloth, trim, valances, crossbars and hanging lamps; added animated wall torches and non-blocking rubble clusters.
- Rebuilt desert props with layered sandbags, reinforced crates and crate stacks, carved gate cover, open market stalls, supply carts, stone plinths, segmented palms, amphora clusters, planted pots and a detailed central well.
- Added mirrored solid cover only where it preserves lane width and circulation. Exterior silhouettes, floor markings, rubble, cloth and wall-top detail remain non-blocking.

### Build 12.04 foundation retained

Build 12.04 replaced Summit Terminal with Dune Bastion, introduced the one-floor desert arena, authoritative preview/minimap data, save migration from `summit` to `dune`, six engagement plans and fourteen hotspots. Those structural rules remain the foundation of the current release.

## Current Map 3 contract

Dune Bastion is the only current Map 3. All Summit-specific sections below are retained as historical release notes and are **superseded**; they must not be treated as current geometry or presentation requirements.

## Build 12.00 performance and Free Roam work retained

- Configuration → Free Roam now offers Citadel Depot, Skyline Offices and Dune Bastion.
- Cached navigation, bounded failed-goal handling, diagnostic circular buffers, stage timing and browser-scheduling-gap classification remain active.
- Free Roam remains isolated from career and match state and uses the same collision rules as operators.

## Build 12.01 highlights retained

- Rebuilt Summit stair-to-platform rail junctions from the supplied Free Roam position export. Sloped rails now terminate on the platform guardrail line rather than continuing through the landing and visually crossing adjacent balustrades.
- Stair-mouth gaps now use the exact stair-rail side offset, so the two sloped handrails meet the two platform newel posts without a floating gap, duplicate post or clipped diagonal pole.
- The shared platform post is drawn once by the guardrail system; stair posts stop before the junction. Build 12.03 retains and audits the mirrored west/east pair only.
- Navigation, collision, stair-only access, AI routing and gameplay balance are unchanged.

## Build 12.00 highlights

- Added **Configuration → Free Roam**, an isolated inspection mode for Citadel Depot, Skyline Offices and Summit Terminal. It provides first-person movement, drag-to-look controls, keyboard support, collision, automatic doors, stair elevation, a tactical map toggle and a position/inspection JSON export without changing career progress or match results.
- Free Roam uses the operator-sized collision footprint and the same `canTravelBetween()` / `arenaElevationTransitionAllowed()` rules as live operators, so stair access, doorways and narrow routes can be checked directly rather than inferred from spectator cameras.
- Replaced repeated per-request navigation clearance work with an arena-specific cached graph and stable binary-heap A*. The graph is warmed before a match or inspection session begins, while dynamic team-traffic costs remain live.
- Repeated unreachable destinations now receive one bounded connected-component substitution and a short per-operator retry cooldown instead of triggering many complete fallback searches in one frame.
- Diagnostics sample at 2 Hz instead of 4 Hz, retain full path nodes only at boundaries/periodic checkpoints, and use circular buffers rather than repeated array shifting. Full-match event totals remain authoritative.
- Performance reports now separate active update stalls from browser/iOS scheduling gaps and include per-stage update timing for bots, diagnostics, doors, sound, HUD, menu and Free Roam.
- No weapon, health, reward, economy, opponent-strength or tactical-balance values changed. Career save schema remains 17 and diagnostics schema remains 1.

## Build 11.99 deep-audit corrections retained

- Runtime build naming, three invalid Summit objectives, the Summit collider audit and current tutorial/header/deployment instructions remain corrected.
- Fans, Staff and After Action contextual guides remain part of the current tutorial flow.

## Build 11.98 highlights

- The Club Inbox message list now reads as a separate panel from the selected email: it uses a distinct navy surface, stronger bottom separator and shadow, while retaining exactly two visible message rows before scrolling.
- Summit platform handrails are now complete balustrades with vertical posts, mid/base rails and framed translucent panels instead of a single floating horizontal pole.
- The two retained stair landings have deliberate rail openings. Staircases have connected sloped handrails, posts and lower stringers positioned outside the walkable route.
- Summit floor colours are more consistent. Zone colours blend lightly over the base material, grid lines and floor patches are subdued, and upper-floor patches/wayfinding strips render at the correct elevation.
- The Summit slate/teal/orange terminal palette was unified without changing route geometry, collision, weapon balance, AI strength, rewards or economy.
- Added `summitPresentationAuditForTest()` and retained every Summit structural, vertical and stair-only regression.

## Build 11.97 highlights retained

- Summit floor changes are physically constrained to the two retained stair/ramp corridors. Direct movement, A* graph edges, path smoothing and combat approaches reject side-climbing onto the raised deck.
- Cross-floor paths retain their complete cell-by-cell stair sequence instead of smoothing away the intermediate ramp waypoints. Operators, the spectator camera and rendered elevation therefore rise gradually along a staircase rather than snapping up a platform edge.
- Combat against an opponent on another floor now requests an explicit **vertical-transition** route and displays **USING STAIRS TO CHANGE FLOOR** while active.
- Flanking is now a real tactical action rather than a label applied to any firing-angle adjustment. Flankers receive the strongest bounded chance to commit to a wide route; other roles may support an alternate angle less frequently. Group/hold priorities reduce the chance, while health, ammunition, local numbers and urgent endgame states can cancel it.
- Diagnostics now separate verified tactical flanks from ordinary recovery/reposition paths through `tacticalFlankRoutes`, `true_flank_route` and verified `flank_route` evidence.
- The two failed `(17.5, 9.5)` goals in the supplied 11.96 match are covered by the expanded bounded reachable-goal substitution test. Full diagnostic event counts are retained independently of the 1,800-event detail window, and duplicate counter-increment events are summary-only.
- Career save schema remains 17 and diagnostics schema remains 1.

## Build 11.96 highlights retained

- Summit Terminal is now a true **two-floor arena**. The Upper Gallery and Skybridge share one 0.78m second-floor elevation, while Maintenance, side approaches and spawn transit remain on the ground floor.
- The two retained staircases terminate at the same upper-floor height. The route system retains Catwalk, Skybridge and Maintenance choices without implying a third playable floor.
- Summit's ceiling rises to 3.46m, leaving 2.68m of clear headroom above the upper floor. Walls, roof beams, ceiling lights and the roof shell use the same arena-specific height.
- The arena has a new clean high-altitude terminal identity: pale architectural panels, cyan glass balustrades and skylights, orange/teal wayfinding, cleaner props and fewer Citadel-style pipes, grates, hazard bands and suspended industrial walkways.
- Matchmaking and tactical minimaps show **2 LEVELS**, identify the continuous upper deck and display two stair markers.
- `summitVerticalAccessAuditForTest()` and `summitStructuralIntegrityAuditForTest()` require exactly one raised platform elevation plus ground level, two clear stairs, at least 2.55m of upper headroom and full route reachability.
- Career save schema remains 17 and diagnostics schema remains 1.

## Build 11.95 highlights retained

- Summit Terminal elevated decks now have solid structural plinths from the ground to the underside of each floor. The catwalk and skybridge no longer read as thin slabs floating over empty space.
- The two retained Summit stairs use solid risers with flush top and bottom thresholds. The four redundant historical stairs were removed in Build 12.03.
- Summit automatic door panels were removed from the stair mouths and retained crates/generators were moved or resized away from transition clearance. Industrial rendering now respects each prop's authored width, depth, radius and yaw instead of drawing every object at a generic near-one-metre footprint.
- Navigation now probes a bounded deterministic ring when a tactically generated endpoint is clear but disconnected from the nav graph. This prevents repeated retries of the unreachable `(17.5, 10.5)` goal seen in the 11.94 device diagnostic while retaining the original tactical intent.
- Added `summitStructuralIntegrityAuditForTest()` covering platform supports, straight stair alignment, prop clearance, open transition portals and unreachable-goal recovery. The stair traversal simulator now resets the navigation planning budget exactly as the real runtime does.
- Friendly line-of-fire obstruction now applies a brief trigger retry delay and accelerates the existing lane-clear response, preventing one blocked operator from flooding diagnostics every simulation tick without weakening body obstruction.
- Career save schema remains 17 and diagnostics schema remains 1.

## Build 11.94 highlights retained

- Summit Terminal now has functional visual elevation rather than flat-floor routing decorated with floating stairs. Operators, the spectator camera, tracers, objective markers and arena props follow the authored platform/ramp elevation profile.
- Six stair/ramp assemblies connect ground level to the upper catwalk and central skybridge. Their endpoints, intermediate elevation samples, navigation clearance and platform joins are release-tested.
- Catwalk, maintenance and skybridge opening plans now create explicit stair-transition commitments before ordinary combat clustering can override them. Distant contact does not instantly cancel an opening stair route, while close threats, recent damage, low health and urgent hunts still do.
- Summit route coverage expanded from ten to fourteen intents. The previously unreachable hotspot at `(17.5, 10.5)` was removed, and two tanks that physically obstructed the side skybridge stairs were relocated.
- Engagement-plan weighting now distributes openings more evenly across catwalk, skybridge, side stairs and lower maintenance instead of repeatedly favouring the centre.
- Diagnostics now include each operator's rendered elevation and whether a Summit rotation is an opening commitment. Career save schema remains 17 and diagnostics schema remains 1.

## Build 11.93 highlights retained

- Summit Terminal retains its generated deployment preview; Build 12.03 supersedes the historical six-marker version with two mirrored stair markers.
- Quiet mid-round AI can deliberately rotate between Summit layers. Long-range/marksman profiles favour catwalks, short-range/entry profiles favour lower maintenance, and balanced support profiles favour the skybridge, while confirmed contact and urgent hunts still interrupt movement.
- Ten authored Summit rotation routes are validated in both directions. Decorative stairs are walkable rather than invisible collision blocks, and no more than two team-mates may commit to map-layer rotations simultaneously.
- Match diagnostics retain optional Summit rotation/traversal counters and events without changing diagnostics schema 1.
- The Club Inbox now exposes exactly two message rows before scrolling, reducing vertical takeover on phones while preserving the full message list.
- Career save schema remains 17 and diagnostics schema remains 1.

## Build 11.92 highlights retained

- Added **Summit Terminal**, a compact symmetrical map with upper catwalks, a central skybridge and lower maintenance routes.
- The arena retains six opening engagement plans, spawn sets, zones, props, open transition portals, stairs and shared tactical minimap support.
- Its current geometry is designed around the existing five-versus-five weapon set while reserving long and close routes for future sniper and shotgun archetypes.

## Build 11.91 highlights retained

- The portrait windowed spectator feed no longer inherits a full-frame pseudo-element vignette when the **LIVE // SECURE FEED** label is shown. The label is now text-only, scanlines are reduced to 3.5% opacity and the canvas receives a small brightness lift without changing world lighting or combat.
- Skyline Offices courtyard use is more deliberate. The previous scoring accidentally discouraged rotations when the selected engagement plan was **Courtyard**. That bias is corrected, the activation threshold is lower, route windows are longer and a weak sound cue or transient sight candidate no longer cancels a committed crossing. Confirmed contact, remembered contact and urgent combat still interrupt it.
- **Courtyard Crossing** and **Atrium Rotation** now assign two operators on each team to reachable objectives beyond the courtyard centre. Active courtyard routes also take priority over older opening objectives, so the area is traversed rather than used only as a visual gap between two edges.
- Phone-width safety was tightened at 320, 375, 390, 402 and 430px. The Gold Coin header prioritises the readable quantity over its decorative icon, the subsection scroller reserves its arrow space correctly and Foundation Plan rows cannot extend beyond the viewport.
- The post-match After Action overlay now includes **Export Diagnostics**. It exports the latest completed match rather than an in-progress replacement; immediately after a match the full schema-1 report is available, with the persisted summary fallback retained after reload.
- Club > **Fans** adds a persistent supporter culture model: active fanbase, popularity, confidence, loyalty, current league position, a realistic season-finish expectation, gradual weekly growth and contextual reactions to results, signings, departures and sponsorships.
- A season expectation is created when the club is founded and at every new season, then delivered through club mail. Expectations are based on the live strength order of the division, not a fixed demand that every club wins the league.
- Supporter values are narrative/commercial context only. They never modify operator health, weapon damage, AI raw ability or match results. Fan numbers move gradually and larger reactions are reserved for meaningful events.
- Career save schema remains 17 and diagnostics schema remains 1.

## Build 11.90 highlights retained

- Door-pocket clipping, flush Office displays, regroup-path reuse and summary-only high-frequency planner counters remain required.
- Preserve `officeDoorPocketAuditForTest()`, `coordinationPathReuseForTest()` and the complete Office clearance/minimap suite.

## Build 11.88 highlights retained

- Every club now has a live overall rating and an absolute half-star strength grade from 0.5 to 5.0. Division 3 clubs are intentionally concentrated at the lower end rather than being rated relative only to one another.
- Strength is recalculated from the current five-player quality, recent form, fatigue, morale, sharpness and a small reputation adjustment. Rival operators can improve or decline after matchdays, so ratings are not permanently fixed.
- Supporter expectations compare the submitted Strikewatch five with the next opponent and home advantage, then communicate **Win Expected**, **Slight Favourites**, **Close Match**, **Outsiders** or **Underdogs** with a likely scoreline and public win estimate.
- Supporter confidence reacts proportionally after a result: an upset win earns more goodwill, while losing a heavily favoured fixture causes a larger drop. Expectations never modify damage, health or match outcomes.
- Build 11.87 opposition identities and the Opposition Scout role are included. Better scouts progressively narrow rating uncertainty, reveal tactical detail and provide more specific counter-options without inventing false information or applying automatic counters.
- The strength and expectation summary is consolidated into Command HQ, League and Tactics, while full scouting detail remains reusable across League, Tactics and Staff.

## Start here

For AI-assisted development, read these files in order:

1. `00-READ-FIRST-GPT.md`
2. `AGENTS.md`
3. `PROJECT.md`
4. `DOCUMENTATION-INDEX.md`
5. Every remaining Markdown file

The modular files are authoritative. `js/strikewatch.dev.js` and files inside `dist/` are generated and must not be edited directly.

## Build

```bash
python3 build.py
node --check js/strikewatch.dev.js
```

Then use:

- `index.html` for the modular development version;
- `dist/strikewatch-build-12.82.html` for the self-contained release.

The standalone release embeds its CSS and JavaScript and does not require external assets.

## Supported mobile and desktop targets

The phone interface remains first-class below `1024px`. Portrait uses the Build 12.62 bottom department bar and full-screen Club Navigator; compact landscape uses the matching left rail and condensed navigator. Both retain Build 12.61 readability floors, touch-sized controls, safe-area handling and constrained-device performance requirements. At `1024px` and wider, the Command HQ desktop shell remains the supported mouse-and-keyboard workspace.

Primary mobile checks use 320, 375, 390, 402 and 430 CSS-pixel portrait widths plus 844 × 390 mobile landscape. Primary desktop checks use 1024, 1280, 1366, 1440 and 1920 CSS-pixel widths.

### Mobile Command HQ navigation

- Five clear primary sections span the phone width: **Operations**, **Team**, **Armoury**, **Supplies** and **Club**. Each opens a section overview containing current metrics and direct links to its major pages.
- Persistent section tabs keep relevant destinations visible beneath the main header. The retired decorative locator remains removed so mobile screens retain more vertical space.
- **Armoury** remains a standalone primary section. Player Profile is the context-only player destination and now contains individual telemetry, performance, condition, honours and development data in one place rather than exposing a separate Player Telemetry page.
- The Command Index is searchable and includes recommended next actions, recent destinations, notification badges, status and locked-feature explanations.
- Major pages are designed to be reachable within two taps of a primary section. Primary controls remain touch-sized and layouts are checked at 320, 375, 390 and 430 CSS-pixel widths.
- The secondary route bar retains integrated overflow arrows, reserved edge space and route-aware scrolling for sections with many pages.



## Build 11.86 highlights

### Multi-kill presentation and rewards

- Owned operators can earn **Double Kill**, **Triple Kill**, **Ultra Kill** and **Rampage** honours by extending the same operator's elimination chain in the same round within an 18-second simulation-time window.
- A Dota-inspired queued banner appears above the spectator presentation without blocking controls. Rapidly earned tiers are shown in order rather than overwriting one another. Opponent kills never trigger the manager's banners or rewards.
- Each achieved tier banks a proportional end-of-match reward: Double Kill gives 1 GC, 8 Team XP and 1,500 credits; Triple Kill gives 2 GC, 16 XP and 3,000 credits; Ultra Kill gives 3 GC, 28 XP and 5,000 credits; Rampage gives 5 GC, 50 XP and 9,000 credits. A five-kill chain earns every tier cumulatively.
- Match reports list each honour and separate the multi-kill contribution inside Gold Coin, credit and Team XP settlement.

### One consolidated player record

- Individual telemetry now renders directly inside the selected player's Profile alongside attributes, condition, medical state, latest performance, career record, honours, reflections, training and loadout context.
- The retired `player-telemetry` route remains a compatibility alias that redirects to Profile. Team Telemetry remains a separate aggregate starting-five view and links into the relevant Profile & Data record.
- Player career records now retain Double Kill, Triple Kill, Ultra Kill and Rampage totals plus the latest match's highest chain.

### Loadout autosave

- Issuing or reassigning a weapon now persists immediately. The Armoury explicitly shows **Autosave Active** and no longer requires a separate Save Changes click for loadouts.
- Line-up, tactics, roles, training and personal-stat edits keep their existing explicit save/discard safeguards. Loadout autosave remains locked during a live round and still respects finite weapon-copy ownership.

### Compatibility and verification

- Career save schema remains 17 and diagnostics schema remains 1. New honour counters and latest-match fields are optional defaults so older careers continue to load.
- Regression coverage includes reward arithmetic, owned/opponent chain filtering, timeout reset, queued banners, Profile route consolidation, legacy-route redirect, loadout persistence, workflow cleanliness, mobile geometry, source/standalone syntax and deterministic output.

## Build 11.85 highlights

- Every non-final round now ends with a concise coaching review before the next round begins. The manager may keep the current plan or make up to two targeted changes across tempo, engagement range and team shape.
- Between-round changes affect the current match only. They use the existing tactical AI inputs rather than hidden stat boosts, and the completed report records what was changed and when.
- Post-match Tactical Review now begins with **What Worked**, **Biggest Issue** and **Next Manager Action**, each supported by match evidence. Small or zero-shot samples are no longer mislabelled as accuracy failures.
- The mobile Command HQ header gives End Day more room while keeping Forward as a true route-history control at the far-right edge. Back followed by Forward now restores the page the player left.
- Responsive acceptance covers 320, 375, 390 and 430px portrait plus 844x390 landscape. Career save schema 17 and diagnostics schema 1 are unchanged.

## Build 11.84 highlights

### Clear next actions across management screens

Every management route now opens with a compact state-driven priority strip. Required blockers remain authoritative, while non-blocking guidance reuses the Command Centre recommendation engine. The secondary plan stays collapsed until requested.

### Overview pages now explain rather than repeat navigation

Team, Armoury, Supplies and Club overviews show three live conclusions with direct actions. Their complete page directories remain accessible through a collapsed **All Pages** disclosure, reducing the initial height and density on phones.

### Guided first club week

The Command Centre and Team overview include a seven-step Foundation Plan for club creation, recruitment, match preparation, first deployment, debrief, training and calendar progression. It highlights one next step without locking advanced systems.

### Career export, import and restore

Club > Configuration now shows the last autosave, schema and restore-point status. Players can export a portable JSON career, import one on another browser/device and swap to the previous automatic save. A successful import or restore preserves the replaced career as the next restore point.

### Build and mobile safeguards

Build metadata is derived from `js/00-core.js`, and the build script verifies cache-version parity before creating the standalone HTML. The new dashboard and recovery flows were checked at 320, 390 and 430 portrait widths plus mobile landscape with no document-level horizontal overflow. Save schema 17 and diagnostics schema 1 are unchanged.

## Build 11.83 highlights

- Fixed attention cards and notification routes moving the entire Command HQ shell off-screen on iPhone.
- Action routing now scrolls only the internal management content pane; the top manager header and section navigation remain fixed and visible.
- Removed vertical `scrollIntoView()` use from management arrivals and horizontal route-tab selection so hidden overflow ancestors cannot acquire a scroll offset.
- Command HQ now restores document, shell and layout scroll origins after routed actions while preserving the intended content-card position.
- Added viewport-integrity debug snapshots covering window, shell, layout and content scroll positions plus topbar visibility.

## Build 11.82 highlights

- Fixed the portrait Command HQ header so Back, Gold, Inbox, Calendar, Match, End Day and Forward align as independent header cells.
- End Day no longer appears as an offset rounded card or collides with adjacent controls. It now fills its assigned 54-pixel cell and uses centred, bounded text.
- Blocked End Day status uses a shorter visible second line while preserving the complete explanation for accessibility.
- The narrowest phone layout keeps the primary shortcuts on the first row and gives End Day a clean dedicated second row, while collapsing only the non-essential Gold icon/supporting copy.

## Build 11.81 highlights

- Exported diagnostics now show where fights happened: damage, combat time, contested time, eliminations, congestion and team-mate blocking are grouped by map zone.
- The post-match Tactical Review displays the strongest fight zones and AI-stability rates, making it easier to tell whether a result came from concentrated map pressure, congestion or excessive route changes.
- Operators reuse near-identical regroup/support goals instead of discarding a valid route, retain ordinary paths longer and refresh combat-approach routes less aggressively.
- Non-urgent tactical decisions have a longer commitment window while critical health, reload safety, visible contact and blocked movement remain immediate overrides.
- Build 11.80 courtyard rotations, Office prop clearance, direct Viper-9 CR purchase and all prior workflow safeguards remain active.

## Build 11.80 highlights

- Office operators can now rotate through the central courtyard during quiet mid-round periods instead of remaining committed to the opening fight lane.
- Rotations use four north/south/diagonal crossing lanes, vary by role and team congestion, and limit how many team-mates rotate at once.
- Contact immediately interrupts a courtyard route, so operators react to legitimately seen or heard threats rather than following a fixed script under fire.
- Match diagnostics now expose optional courtyard-rotation events/counters to help compare map usage in future exports.

## Build 11.79 highlights

- The Office map now clears the user-flagged blocking tables/desks by moving them tighter to walls and shrinking their footprint where needed.
- Office round-openings now favour a broader mix of engagement plans, especially the courtyard and atrium lanes, so firefights distribute across more of the map.
- The Supply Depot now includes a direct CR purchase for the Viper-9, alongside the existing Gold Coin Field Crate.
- Pending transfer offers receive a stronger visual accent so action-required rows stand out more clearly from rejected outcomes.

## Build 11.78 highlights

- Notifications and required actions now open the exact relevant operator, Inbox message, transfer, sponsor offer, report or manager recommendation, with a matching arrival banner and highlighted destination.
- Alerts remain active until their underlying issue is resolved; merely viewing a destination no longer clears the condition.
- Starting-five order, tactical setup, role assignments and training programmes use reversible drafts with Save Changes and Remove Changes controls. Build 11.86 supersedes the original loadout draft by saving weapon issues immediately.
- Leaving a page with unsaved management changes opens a clear discard-or-stay warning.
- Operations groups every End Day blocker by category, explains why it stops progression and provides one direct action per issue; the list updates after resolution.
- Existing contract negotiations retain their staged submit, counter, accept and complete flow with clearer safety messaging.
- Portrait and landscape diagnostics remain separately identifiable in one match export; headless checks validate the segmentation but not real-device GPU smoothness.

## Build 11.76 highlights

- Stat-point notifications now open the correct contracted player instead of landing on an unrelated manager recommendation.
- Attribute changes are reversible drafts: use plus/minus freely, then Save Changes inside the attribute card to commit them.
- A prominent Stat Point Available banner explains the pending allocation and remaining points.
- End Day now has one fixed home at the top right, replacing the old date panel; duplicate inline/header End Day buttons are removed.
- Must Respond appears only on the Operations overview. Pressing blocked End Day from another page takes the manager there automatically.

## Build 11.75 highlights

- Removed the non-actionable Operations/Overview locator strip and reclaimed its vertical space while keeping persistent section tabs.
- Staggered full pathfinding work, added short path reuse windows and retained collision-safe local movement during a deferred plan.
- Corrected match startup ordering so portrait-windowed diagnostics begin after the 1.35 DPR cap and real match viewport are applied.
- Deduplicated Office door-opening diagnostics and audio to one event per door per round.
- Added clear weapon-range mismatch warnings to Tactics and final deployment review.
- Added planner execution/deferral/reuse counters to schema-1 diagnostic exports.

## Build 11.74 highlights

- Adds stable overview pages for Operations, Team, Armoury, Supplies and Club, with live section metrics and direct destination cards.
- Adds a persistent **You are here** locator and keeps ordinary subsection tabs visible, reducing dependence on hidden nested navigation.
- Makes the Command Index searchable and adds recommended next actions, recently visited pages, notification badges, status text and clear locked/context explanations.
- Keeps Player Profile as the context-only player destination so the main route structure stays compact; Build 11.86 embeds the former Player Telemetry content inside it.
- Preserves Back/Forward route history, save schema 17 and diagnostics schema 1. Responsive checks cover 320, 375, 390 and 430-pixel portrait widths.

## Build 11.73 highlights

- Replaces ambiguous negative role-execution labels with positive Role Effectiveness percentages and plain-language impact copy.
- Adds perspective-aware operator-body sight obstruction, including a bounded friendly sidestep to clear blocked sightlines without hidden-information leakage.
- Moves Back and Forward history controls to the extreme edges of the persistent manager header and removes the redundant main-menu history strip.
- Adds deterministic `roleExecutionCopyForTest()` and `operatorViewOcclusionForTest()` coverage while retaining save schema 17 and diagnostics schema 1.

## Build 11.72 highlights

- Added **Supplies** as a fifth main Command HQ section. Its **Supply Depot** contains the existing shared 3D Field Crate exchange and the future ammunition inventory, while Gold Coins and club cash remain separate.
- Team creation now includes five selectable emblems and a colour picker. The saved emblem appears beside the club name in major Command HQ headings and the live own-team scoreboard where space allows; older saves receive a safe default automatically.
- Re-mounted the problematic Skyline Offices black wall display as a shallow, flush fixture and audited every authored Office screen so none projects into a walkable corridor.
- Headshot eliminations now show a small head/crosshair badge in the kill feed, alongside the existing CRIT marker when both outcomes occur.
- Unified the topbar shortcut icons to white and raised the smallest management-interface text modestly while preserving the existing compact visual hierarchy and phone layouts.
- Rechecked early difficulty, match cash/Gold Coin awards, the 60-GC crate economy, payroll/loan pressure, 20-club league scheduling and portrait/landscape diagnostics. No numerical balance changes were required in this pass.


## Build 11.71 highlights

- Exported match diagnostics now include real performance data from the render loop rather than only AI and simulation state.
- Reports show overall average and minimum FPS, frame interval/work/update/render timings, counts above 22/34/50/100 ms, excluded background intervals and the 12 worst active frame spikes.
- Performance is split automatically by orientation and viewing mode. Testing one match in portrait windowed view and landscape maximised view creates separate report segments with their own viewport, browser/device capability metadata, DPR, render scale and canvas-buffer measurements.
- Each rolling diagnostic snapshot now records the current portrait/landscape state, windowed/maximised mode, visual viewport, effective DPR, adaptive resolution tier, canvas size and latest frame timing.
- Frames outside the live match, while the page is hidden or paused for more than 250 ms are counted as exclusions instead of distorting live FPS averages.
- The change is local-only, retains diagnostic schema 1 and save schema 17, and does not alter match simulation, AI, balance or the Build 11.70 adaptive-resolution behaviour.


## Build 11.70 highlights

- Landed shots can now strike the head for a weapon-specific damage multiplier. Headshots and critical hits are separate rolls, so a headshot can also become a much rarer **critical headshot**.
- Headshots have distinct tracer height, damage text and HS elimination-feed markers. Player profiles explain controlled-range headshot chance and damage, while match history, career totals and diagnostics record the results.
- Marksmanship and weapon accuracy improve headshot frequency; recoil and firing beyond a weapon's useful range reduce it. Each weapon has its own headshot power, visible in the Armoury and weapon comparison.
- The first three Division 3 league fixtures now include visible Foundation Parity protection. An opposition squad that is substantially above the new club's starting-five level is capped progressively at +1, +2 and +3 across those fixtures; naturally fair opponents, exhibitions and every later match are untouched. Tactics and Plan Fit still affect performance.
- Portrait match rendering now uses a lower high-DPR cap, sustained adaptive resolution tiers and cheaper live chrome compositing. The simulation remains full speed while the renderer reduces GPU load only when frame pressure persists.
- Added deterministic headshot/critical damage, opening-balance and portrait-performance debug helpers while retaining save schema 17, diagnostics schema 1 and all Build 11.69 recruitment/Office changes.


## Build 11.69 highlights

- Recruitment negotiations now stay inside one active popup. A counter-offer appears immediately after submission with **Accept Counter-offer** or **Back to Negotiation**; acceptance changes that same popup to **Complete Signing**; completion changes it again to a signed confirmation with **View Squad**.
- The in-place flow preserves the full package—fee, wage, contract, signing bonus, appearance bonus and squad-status promise—and still performs all transfer-window, affordability, wage-budget and squad-capacity checks before registration.
- Every recruitment-index candidate now displays separate current-ability and potential star rows. Unconfirmed candidates use the visible scouting estimate rather than revealing hidden exact ratings.
- Removed the pill/card behind the top-right date while keeping the larger date, supporting metadata, Calendar shortcut, keyboard focus feedback and touch-sized target.
- Moved and slightly reduced the Office conference table so the primary east/west walkway is clear. The Office now uses a dark, subtly patterned carpet-tile floor with high roughness instead of an industrial hard-surface treatment.
- Added recruitment-modal, candidate-rating and Office-walkway debug coverage while retaining save schema 17, diagnostics schema 1 and all Build 11.68 door/Training fixes.


## Build 11.68 highlights

- Verified all eight Skyline Offices doors are authored inside real wall openings, moved two obstructing office props clear of the east/courtyard approaches, and added stronger wall-connected jambs, lintels, thresholds, frosted panels and safety trim so they are clearly visible on a phone screen.
- Doors now start closed each round, open automatically near an operator, play a distinct generated sliding-door sound once and stay open for the remainder of the round. Collision, line of sight, navigation, rendering and the tactical minimap all use the same live door state.
- Fixed the recurring post-match manager-recommendation transition on iPhone. The modal now releases focus before closing, Training scrolls only inside the Command HQ content pane, no `<select>` is automatically focused, and the menu is remeasured against the current viewport so the lower half is not replaced by a black gap.
- Added `doorPlacementAuditForTest()` and expanded `doorInteractionForTest()` while retaining `managerTrainingTransitionForTest()` for responsive regression coverage.
- Build 11.68 retains career save schema 17, diagnostics schema 1, the Build 11.67 crate/header work and all existing reward, economy, league and combat behaviour.


## Build 11.67 highlights

- Fixed the shared three-dimensional Field Crate hierarchy so rotating the crate rotates its body-local rear hinge first, then applies the opening pitch. The lid, lid-mounted details and support rails now remain attached at every drag angle and opening stage.
- Added deterministic attachment coverage through `rewardCrateAttachmentAudit()` and `window.__strikeDebug.crateAttachmentForTest(yaw, openingProgress)` without changing the crate pool, 60-GC price, shared-canvas flow or claim behaviour.
- Reworked the Command HQ Gold balance shortcut into a flatter, integrated topbar element instead of a gold UI pill. It remains accessible, focusable and linked to the Gold Coin account.
- Enlarged and clarified the top-right club date, including zero-padded `DD MON YYYY` formatting and readable weekday/week/season context. Narrow portrait layouts reserve a full 44-pixel date row.
- Build 11.67 keeps career save schema 17 and diagnostics schema 1. It retains all Build 11.66 Command Index, Gold account and cash-finance analytics features.


## Build 11.66 highlights

- Tap the Gold Coin balance in the top-left header to open a dedicated Gold Coin account showing the exact match-award formula, example win/loss payouts, Supply Depot spending, crate progress, recent trend and transaction ledger.
- Tap the cleaned-up date in the top-right header to open the Calendar. The header now uses a compact date, weekday, club week and season presentation.
- The Command Centre now includes a Command Index generated from the real navigation routes, making every available management feature easier to find.
- Club Finances now provides cashflow analytics: retained income/outgoings/net, weekly bars, a running-balance graph, income and expense category breakdowns, the foundation loan and an expanded cash ledger.
- Cash and Gold Coins cross-link between dedicated account pages while remaining completely separate currencies.
- Save schema 17 retains up to 80 transactions per currency and safely migrates older careers. New careers record the opening bank advance in the cash ledger.


## Build 11.65 highlights

- The Supply Depot now displays the exact same interactive three-dimensional Field Crate used after a victory. The single WebGL canvas is reparented between Supply Depot preview and opening overlay, so its model, lighting, opening animation and reward reveal cannot drift apart.
- Weapon rewards are counted copies. Repeated weapon drops add usable inventory rather than XP, multiple copies can serve multiple operators, and a fully issued one-copy weapon can be transferred directly to a new player. The previous holder automatically receives a legal fallback.
- The Armoury displays owned, issued and free copy counts. Scrapline remains unlimited standard issue; only repeated cosmetic finishes convert to Team XP.
- The new rare **AR-4 Sentinel** is a 34-part shared model used by the crate, Armoury, first-person renderer, live held weapon and corpse renderer. It deals deliberately modest per-shot damage, but offers a 20-round magazine, controlled recoil and greater mid-range reach than the current pistols. Its reload uses the required `carbine` five-stage audio profile.
- The Field Crate pool is now P12 Service 32%, Viper-9 Compact 32%, AR-4 Sentinel 14% and Urban Grid 22%. The crate remains 60 Gold Coins.
- Each division now has 20 clubs and a 38-match home-and-away season. The fixture engine creates 380 league fixtures across 38 matchdays, with every pair meeting once at each home venue. Top-two promotion and bottom-two relegation remain in place.
- Career save schema is 16. Older saves preserve club state while migrating duplicate weapon inventory and legacy short league schedules into the new counted-arsenal/full-season structures.

## Build 11.64 highlights

### Gold Coins are now a separate store currency

Every completed match awards Gold Coins in addition to ordinary club cash. League rewards use 3 participation coins, 1 coin for each round won, a 7-coin victory bonus and a 2-coin clean-sweep bonus. Exhibitions use smaller 2/1/5/1 values. A close 3–2 league win therefore pays 13 GC, a 3–0 sweep pays 15 GC, a 2–3 defeat pays 5 GC and a 0–3 defeat pays 3 GC.

The top-left Command HQ identity now shows the Gold Coin balance. Ordinary cash remains separate and continues to pay wages, transfers, staff, loan repayments and other club costs.

### The Club Store now sells the existing Field Crate

At Build 11.64 the active Tactical Field Crate cost **60 Gold Coins** and shared the post-victory reward/opening path. Build 11.65 keeps that price and shared path, expands the pool to P12 Service 32%, Viper-9 Compact 32%, AR-4 Sentinel 14% and Urban Grid 22%, and changes repeated weapon rewards into usable copies rather than XP.

The 60-GC price is designed to take roughly four clean league wins or five ordinary league wins. Defeats still make slower progress, while victory crates remain free and unchanged.

### Purchases survive refreshes safely

Coins are deducted once and the rolled reward is stored as `pendingStoreCrate` before the opening overlay appears. Leaving or refreshing cannot consume the currency while losing the purchased item. Reopening the Store presents the waiting crate, and claiming it returns to the Store.

Save schema is now **15**. Existing schema-14 careers migrate with zero Gold Coins while preserving cash, squad, inventory, skins, league, finance and diagnostics data. Diagnostic export schema remains 1.

## Retained Build 11.63 highlights

### Battles now develop in different parts of each map

Every round draws from a shuffled arena-specific contact plan. Citadel Depot rotates between Alpha Stores, Upper Mid, Core Plant, Lower Service and Delta Loading. Skyline Offices rotates between Reception, the Open Office, Courtyard, Conference Wing, Executive Wing and Break Room. Each location is used once before the rotation reshuffles, without repeating the previous round's location.

These are opening movement plans rather than forced outcomes: operators still react to enemies, sound, team instructions, weapon range and safer routes. The result is more varied first contact without scripted teleporting or wall knowledge.

### Working doors and richer Skyline Offices props

Both maps now contain automatic sliding doors between selected rooms and sections. Closed doors block movement, vision and gunfire; they open when an operator approaches, stay open while somebody occupies the doorway and close after the area clears. The tactical minimap shows their current state.

Skyline Offices also has more detailed workstation clusters, desks, chairs, lockers, low storage, vending and kitchenette equipment, improved sofas and wall-mounted information displays. The formerly floating black display geometry has been repositioned against real walls. Navigation and spawn routes remain clear.

### Spectator and match-income changes

When the owned operator being viewed is eliminated, the camera remains for two seconds and then moves to the next living owned operator. This works even when automatic spectator cycling is switched off.

A defeated team now receives a smaller participation payment rather than nothing, while victory income remains substantially higher. The post-match report itemises the base payment and victory/defeat reward. Build 11.63 introduced a live club-balance header; Build 11.64 now uses that same position for the separate Gold Coin store balance.

## Reload sounds

Every reload now has a complete handling sequence rather than one generic click. You can hear the magazine release, removal, replacement, firm seating and final slide/bolt action. Worn, service and compact sidearms have different mechanical character, while fallback SMG, carbine and rifle profiles remain covered.

Future weapons must ship with their own supported `reloadAudioProfile`. A weapon is not considered complete merely because it appears in the Armoury or renders correctly; its reload animation and sounds must be added and tested at the same time.

## Retained Build 11.61 behaviour

### Smoother operator locomotion

- Operators accelerate and decelerate instead of snapping instantly between stopped and full speed.
- Body direction and aim direction blend separately, producing more natural turns, strafing and backpedalling during combat.
- Corner approaches raise the weapon progressively, while exposed crossings receive a modest committed movement bias.
- Crouch and stand changes have minimum posture times and smoother transitions, reducing rapid visual crouch loops.
- Shoulder bias and lower-body direction make left/right peeks and doorway movement easier to read.

### Clearer combat animation

- Hits create a short directional flinch and body compression rather than only changing health.
- Eliminated operators receive an initial impact stagger before the existing procedural fall and settle.
- First-person recoil uses a damped recovery motion, with directional movement bob, crouch/run differences and damage flinch.
- Reloads share one timeline between first-person and world-held weapons: the complete magazine releases and inserts together, empty weapons visibly lock/rack the slide, and the weapon lowers during handling.
- Weapon statistics and balance are unchanged; all presentation still comes from the shared career weapon catalogue.

### Compatibility retained

- Build 11.60 landscape minimap and rotate-phone gate remain available.
- Build 11.59 post-report Training navigation and viewport correction remain in place.
- Build 11.56 combat-deadlock and out-of-range crouch recovery remain active.
- Current career save schema is 17 with schema-16/schema-15/schema-14 migration compatibility; diagnostics schema remains 1.

## Build 11.60 retained behaviour

### Tactical minimap in landscape

The same live tactical minimap used by the portrait match window is now available in full mobile-landscape view. A compact map button appears beside the diagnostic export/debug control and opens the existing north-up panel with walls, collision props, the viewed operator, team-mates, opposition and death markers for both Citadel Depot and Skyline Offices. The map and diagnostic overlays remain mutually exclusive.

### Rotate-phone gate

Selecting **Full View / Landscape** while the phone is still physically upright now displays an opaque instruction screen rather than rotating the match inside the portrait browser viewport. The prompt asks the player to rotate the phone and provides **Switch Back to Portrait**. It disappears automatically when the browser reports a genuine landscape viewport, including when orientation locking succeeds.

Landscape controls respect phone safe areas and retain the portrait-return button. This release preserves the post-report Training route repair, deployment selection, shared weapon presentation, diagnostics and combat-deadlock recovery.

## Build 11.59 retained behaviour

Build 11.59 fixes the portrait black-area/cut-off bug that could occur after opening a post-match operator comment and selecting the manager-recommended training programme. The assignment now happens as one route transition: the programme and selected operator are saved, the comment modal closes without returning focus to content that is about to be replaced, and the Training Facility opens at the top of its own scroll region.

The mobile Command HQ viewport no longer relies on an explicit `100dvh` height while already using fixed insets. This avoids a stale iOS Safari dynamic-viewport measurement leaving the bottom of the screen as uncovered black body background after modal and browser-toolbar changes. Resize, orientation and visual-viewport updates also re-stabilise the open management route.

The ordinary comment reader still restores focus when it is simply closed, and the fix does not change training effects, save schema, deployment, weapons, minimap, diagnostics or combat AI.

## Build 11.58 retained behaviour

### Final deployment review before matchmaking

Starting a newly prepared fixture now opens a dedicated deployment screen instead of immediately beginning the search. It shows both battlegrounds as large top-down preview cards, the opponent, all five starters, their temporary match roles and equipped weapons, plus the confirmed formation, approach, engagement range, team priority and Plan Fit.

The map selected under Team → Tactics remains the default, but **Citadel Depot** or **Skyline Offices** can be changed during this final review. Press **Confirm Deployment** to lock the choice and begin matchmaking, or cancel to return to Command HQ. Later rounds in the same match continue directly.

### Clearer, shared weapon identity

The Armoury, player loadouts, deployment review and matchmaking roster now use the same weapon identity language for range, firing cadence, recoil character, reload speed and recommended tactical use. These descriptions are derived from the same catalog and weapon ID used by operator AI, damage calculations, diagnostics and every rendered version of the weapon.

First-person sidearms now have a more readable reload: the complete magazine assembly leaves and returns to the grip, empty magazines visibly lock the slide, the operator racks the weapon near the end of the cycle, and the connected weapon geometry follows recoil/sway as one rigid model. Muzzle flash, short procedural smoke and ejected-case scale vary consistently by weapon. The existing damage, range, cadence, magazine sizes, reload timings and critical modifiers have not been rebalanced in this build.

## Build 11.57 current behaviour

### Modern tactical minimap for both maps

A small map icon now sits immediately to the right of the diagnostic export button during portrait windowed matches. Tapping it opens a north-up top-down map inside the live feed. It shows the map walls, major collision props, zones, the currently viewed operator, living team-mates, living opponents and faded death markers. The viewed operator also receives a focus ring and facing cone.

The minimap uses the active arena data, so the same system works for both **Citadel Depot** and **Skyline Offices**. Press **M** to toggle it with a keyboard, press Escape or the close button to dismiss it, and note that opening live diagnostics automatically closes the minimap to prevent overlap.

### Skyline Offices central courtyard

Skyline Offices now wraps around a landscaped central courtyard rather than presenting the centre as another ordinary interior room. The courtyard includes a real ceiling opening and skylight treatment, paving, planted strips, a fountain, benches, planters and additional natural light. Office wings also receive more detailed workstations, a coffee station, copier, expanded server equipment, meeting furniture and improved small props.

Collision-relevant courtyard and office furniture uses the same footprints as navigation, while decorative surfaces remain outside critical routes. The courtyard provides new central cover without removing the long lanes and flanking corridors needed by different weapon ranges.

## Build 11.56 current behaviour

### Combat deadlocks now produce different routes

The Build 11.55 diagnostic export exposed a specific loop: two attackers were trying to push through the same narrow approach while a short-range defender stayed crouched outside effective range. The recovery watchdog recognised the stall but repeatedly issued another direct push, so the visible posture changed without meaningful progress.

Build 11.56 adds deterministic team-mate right-of-way. One operator keeps the attack lane while the other yields to a legal nearby pocket. Repeated or world-blocked advances escalate into an A* combat approach route with a different side or destination rather than resetting the same instruction.

### Recovery must be verified

A recovery is no longer treated as successful merely because a tactical state changed. The operator must translate at least 0.58 units before the recovery stage resets. The live diagnostic report now records the blocking operator or world obstruction, selected approach point, recovery stage and verified displacement.

Outnumbered operators may still hold useful cover, but a crouched short-range operator facing an opponent beyond weapon range will now stand, route and attempt to change the engagement rather than remaining in an indefinite hold loop.

## Build 11.55 retained behaviour

### Local match diagnostics

Every active match now maintains a local diagnostic recorder. It logs meaningful AI events and samples all ten operators four times per simulated second. The detailed snapshot window is limited to the latest 90 seconds to keep mobile memory bounded, while compact per-operator totals continue for the complete match.

Captured information includes target changes and reasons, tactical-state changes, path goals, movement blocks, operator-blocked shots, recoveries, deaths, map zones, weapon/preferred range, effective-range contact, visible and remembered enemies, crouch/stuck timers and current path nodes. Build 11.71 also records real frame intervals and work costs, split by portrait/landscape and windowed/maximised mode, with viewport, DPR, adaptive scale, canvas size and bounded worst-frame details. Nothing is uploaded automatically and the normal career save uses schema 19, retaining schema-18/schema-17/schema-16/schema-15/schema-14 migration compatibility.

### Small portrait export control

A small download icon sits immediately to the right of the portrait mute button while a windowed match is running. Tap it to download a timestamped JSON diagnostic report. Press and hold it to toggle a read-only live overlay for the currently viewed operator. The overlay shows their current state, role/plan, target and target reason, weapon range, destination/path, visibility memory and recovery status.

The After Action report also includes a compact Local Match Diagnostics summary with effective-range discipline, recovery count, blocked firing lanes, flank/reposition activity and captured-event volume.

## Build 11.54 retained behaviour

Build 11.54 adds the Skyline Offices environment pass and clickable manager-feedback training recommendations. The selected operator and recommended programme are carried into Training, while office furniture, glass partitions, meeting spaces and server-room details remain arranged around valid pathways.

## Build 11.52 current behaviour

### Operators react to the closest real threat

Bots now reconsider every opponent they can actually see instead of remaining locked to the first target. A nearby enemy standing between an operator and a farther target becomes the immediate priority, even during the normal target-switch cooldown. This prevents the visibly wrong behaviour of aiming beyond an opponent directly in front.

### No firing through operators

The firing check now includes living player bodies as well as walls and props. A bot will not consume a shot or produce a muzzle flash when a team-mate blocks the lane. It either switches to a visible enemy blocker or moves laterally to clear a friendly line of fire.

### Stronger movement recovery

Two new progress watchdogs cover the freezes that ordinary path recovery could miss:

- During a visible fight, a bot that is neither shooting, dealing damage nor moving releases stale cover and commits to a push or side-step.
- A crouched operator that remains stationary during an active objective, sound investigation or last-known contact stands up and requests a fresh route.

Entry players also wait briefly for support only once before committing, rather than repeatedly entering the same pause. A* adds a soft cost around team-mates and their next waypoint, reducing doorway congestion while leaving the corridor usable when it is the only route.

## Build 11.51 current behaviour

- Incoming negotiation **Ability** and **Potential** ratings now sit side by side, with each star row aligned horizontally on portrait phones.
- Submitting an incoming offer or outgoing counter now produces a clear response popup. The negotiation page also retains a visible **Offer Sent** or **Counter-offer Sent** summary, including the submitted terms and the other club's response.
- Portrait windowed matches now show a compact mute/unmute control in the bottom-left corner, opposite active sponsor branding. The icon follows the same authoritative audio state as the existing sound control.
- Invalid management actions now explain why they cannot proceed through the shared popup system. For example, asking the assistant to select the team without employing an assistant opens a prerequisite notice with a direct route to Staff rather than silently doing nothing.
- Additional blocked recruitment, training, transfer, sponsorship, finance and match-preparation actions use the same notice pattern where a clear recovery step is available.

## Build 11.50 current behaviour

- The newest email now always appears at the top of the Inbox, including older saves whose stored mail array is not already ordered correctly.
- The popup envelope has been moved into a compact dedicated icon box beside the close control, with subject copy constrained so the two no longer overlap.
- Portrait Armoury inventory cards now fill the available panel width and stack vertically, removing the narrow unused strip and trailing card-edge line. Comparison and issued-state information remain visible inside each card.
- Starting Five debrief notes now place the reflection label, quotation, manager insight and expand affordance in separate rows. The player-name/rating header no longer shares layout rules with the expandable note.

## Build 11.49 current behaviour

### Emails now use the shared popup reader

Selecting any Inbox row opens the complete email in the same readable popup system used for player reflections and debrief notes. The popup shows the sender, category, subject, full body, date and manager recipient information. Messages are marked read as they open, while a **Mark as Unread** action closes the popup and restores the unread badge in the Inbox. Non-mail related-page links are also available from the popup.

### Decision emails retain their choices

Emails that block End Day now carry their full response controls into the popup. Two-, three- or future multi-choice sets render as touch-friendly buttons with the outcome explanation visible beneath each label. Selecting an option applies the existing morale, fatigue, training, finance or reputation effect and refreshes the open email into a **Decision Recorded** confirmation rather than dropping the manager back into an unclear state.

The embedded Inbox reader remains as an at-a-glance preview and offers **Open Full Email**, but decision selection is intentionally concentrated in the popup. The Inbox still shows four message rows before scrolling.

## Build 11.48 current behaviour

Build 11.48 turns the expanded reflection view into a more polished debrief card with tone-aware blue or amber accents, clearer quotation styling, larger readable text, context metadata and an explicit close hint. The unopened overlay is now fully removed from layout and can no longer intercept taps. It closes through its X button, a backdrop tap or Escape, and returns focus to the comment that opened it.

The portrait management pass also standardises hero and section-heading spacing, improves wrapping in pills, telemetry summaries, fixture labels and calendar agenda copy, and changes the Starting Five debrief to a single readable column on narrow phones. The centred history title, right-side Forward arrow and Armoury equipped-state fix from Build 11.47 remain intact.

## Build 11.47 current behaviour

Build 11.47 fixes a portrait Armoury artefact, rebalances the mobile history rail and improves readability for Team-route commentary. Equipped weapons keep their state highlight without drawing the full-height blue line seen in portrait mode. The PLAYER TELEMETRY history header now centres its label while placing Back and Forward on opposite sides of the rail. Private Match Reflection cards and Starting Five debrief notes can be tapped to open a larger overlay with an X close control, backdrop dismissal and keyboard Escape support.

## Build 11.45 current behaviour

### A clearer first-day tutorial

The first of the existing six beginner steps now explains the club's actual opening finance agreement before asking the manager to recruit anyone:

- **350,000 credits** are advanced as borrowed start-up capital;
- **400,000 credits** must be repaid in total;
- ten **40,000-credit** instalments are collected every four weeks.

The same card introduces and visibly highlights the four persistent topbar shortcuts in order: **Inbox**, **End Day**, **Calendar** and **Match**. The remaining tutorial steps continue through player inspection, the first signing, building a starting five, reviewing the Squad and opening Match Control.

### Small one-time guides for complex pages

After the beginner tutorial is completed or dismissed, the first visit to Calendar, Tactics, Transfers, Training, Finances, Commercial or Armoury shows a compact contextual guide. Each guide explains the most important decisions on that page and disappears permanently when **Got It** is selected. Existing saves are compatible; malformed old tutorial data is repaired safely.

### Compact four-section navigation

The oversized three-section numbered navigation has been replaced with a tighter four-section structure: **Operations**, **Team**, **Armoury** and **Club**. Armoury is promoted to its own primary destination, while portrait phones display four equal tabs across the available width. The layout has been checked at 320, 375, 390 and 430 CSS-pixel widths and at 844 × 390 mobile landscape without horizontal overflow.

## Build 11.44 current behaviour

### Five-second sponsor broadcast

The ordinary round result remains visible first. When a non-final round has an active sponsor, the branded transition then remains on-screen for **five seconds** before a brief tail into the next round. The round timer now reserves the complete result + sponsor duration, so the next round cannot cut the promotion short.

In portrait windowed mode, the logo sits directly beside a two-line identity block—**PARTNERS OF** above the sponsor name—rather than appearing lower and disconnected from the label.

### Real simulated dates

The career begins on **Monday 3 August 2026** and advances through normal month lengths and year changes. The game still uses its deterministic absolute-day counter internally, but players now see familiar dates such as **Saturday 12 September 2026** instead of values such as `Day 41`.

The Calendar now provides:

- a 42-cell month view with previous, next and Today controls;
- correct adjacent-month dates and year rollover;
- the current simulated date highlighted;
- a separate 12-week event agenda;
- descriptive compact entries such as **HOME · NORTHBRIDGE**, **BANK · 40K DUE**, **CAMPBELL · CONTRACT END** or **REDLINE · DECIDE**.

Agenda entries retain the complete opponent, amount, consequence and required action, with direct links to the relevant management page.

## Build 11.43 current behaviour

### Sponsor branding in portrait

The bottom-corner sponsor graphic now keeps its **PARTNERS OF** caption in portrait windowed mode instead of collapsing to the logo alone. It remains compact, non-interactive and hidden when the club has no active commercial deal.

### Between-round broadcast bumper

When an active sponsor exists, a short branded transition now appears between non-final rounds:

- The normal round result is shown first.
- A sponsor bumper then displays the current club, partner logo, strapline and upcoming round number.
- The bumper clears before the next round begins.
- Final match-winning rounds do not show the bumper, so the match report and reward flow remain uninterrupted.
- Reduced-motion users receive the same information without sweeping/zooming animation.

## Build 11.42 current behaviour

### A clearer club calendar

A fourth compact topbar shortcut opens **Operations → Calendar**. The calendar uses a five-week, iOS-inspired block layout with the current day highlighted and a separate upcoming agenda. It collects:

- league fixtures and matchdays;
- bank-loan instalments and arrears;
- contract expiries;
- projected medical returns;
- scouting completion dates;
- sponsor, transfer and other decision deadlines;
- expected weekly sponsor income.

Selecting an event opens the relevant management route or player profile. The persistent header badge shows the number of events scheduled for the current day.

### Foundation loan and scheduled repayments

The opening **350,000 credits** are now a Northstar Bank start-up loan rather than free capital. The agreement has a total repayable value of **400,000 credits**, collected through ten **40,000-credit instalments every four weeks**. Payments are automatic at the weekly boundary, enter the finance ledger and generate Inbox confirmations. Insufficient funds create arrears that are added to the next instalment. Existing created saves without loan state migrate safely, with their first payment scheduled four weeks after migration.

Club Finances now shows the remaining balance, repayment progress, next due week and any arrears. Player contracts may legitimately reach zero weeks; expired contracts are highlighted in the Calendar, Inbox and player data rather than being silently reset.

### Inbox, scoreboard and stability improvements

- The Inbox list displays four messages at a time and scrolls internally for older mail, preserving more room for the reading pane.
- Selecting an owned operator on the live scoreboard opens that player's telemetry, even when the operator has been eliminated. Opponent rows remain noninteractive.
- Web Audio now has a periodic health watchdog, additional iOS touch recovery hooks and automatic recovery after suspended/interrupted states, while respecting deliberate mute state.
- Kill-feed and enemy-elimination handling now tolerate missing weapon/operator metadata, addressing the reported elimination-time crash path.
- Save schema **14** adds the foundation-loan state and preserves zero-week contracts.

The current mobile acceptance surface contains **19 Command HQ routes** and continues to target 320, 375, 390 and 430 CSS-pixel portrait widths plus 844 × 390 mobile landscape.

## Build 11.41 retained behaviour

Build 11.41 corrected the shared career-sidearm grip silhouette at its source of truth. Inventory thumbnails, Armoury inspection, reward-crate previews, world-held pistols and first-person pistols inherit the same rear-seated grip, magazine, backstrap and baseplate geometry.

## Build 11.40 current behaviour

### Build 11.40 addendum

- The static Strikewatch / Command HQ label has been removed from the top-left Command HQ header block. That area now shows the active team name and team level so the page identity reflects the player's club.
- The top-right section is now dedicated to a larger calendar card, giving the day, week and season more readable spacing in portrait and landscape phone layouts.

## Build 11.39 current behaviour

### Build 11.39 addendum

- The post-match reward crate renderer now keeps the lid visually attached to the body throughout the open animation by driving the lid, hinge spine and support rails from the same rear pivot.
- The Team Armoury now compares every selected or browsed weapon directly against the currently equipped weapon for the selected operator. Inventory tiles show a quick better / worse / sidegrade badge, while the detail panel shows an overall comparison card plus per-stat deltas.

### Tactical choices now fit the squad

The Tactics screen now explains how suitable the submitted starting five is for the selected formation, approach, engagement range and team priority. **Plan Fit** is calculated from real operator attributes, readiness, equipped weapons, temporary match roles, tactical familiarity and the opposition's preferred style.

- Every formation and plan option displays its own comparative fit badge before selection.
- The main suitability panel shows Formation, Approach, Range, Priority, Role Fit and Familiarity scores.
- Each starter receives an individual match-role score with natural-role status, key strengths and a small bounded role-execution modifier.
- Insights identify the strongest part of the plan, the main limitation, role mismatches and whether the squad still needs familiarity.
- The opponent read explains whether the plan is favourable, neutral or difficult against the upcoming club's style.

### Visible, bounded match impact

The confirmed plan captures its suitability snapshot for the match. Better fit produces cleaner decision timing, coordination and expression of the selected tactical instructions; poor fit makes the same plan less reliable. The modifier is intentionally bounded and **never grants hidden raw weapon damage** or replaces Marksmanship, Handling, Awareness, Mobility, Resilience, weapons, fatigue or injury effects.

Using a tactical combination in completed matches raises its familiarity over time. Changing the formation, approach, range, priority, starting five, assigned roles, relevant player readiness/attributes or loadouts invalidates an outdated confirmation so the player must review the new fit before deployment.

## Retained Build 11.36 behaviour

Build 11.36 turns recruitment into a longer-term management system. Available operators begin with partial knowledge rather than perfect attributes. Managers can shortlist targets, inspect dossiers and run three-day scouting assignments filtered by role, age and ability. Report knowledge gradually narrows ability, potential, attribute, personality, medical and financial estimates.

Transfers now have opening, closed and run-in registration periods based on completed league fixtures; free agents remain signable throughout. Rival clubs bid for targets, complete or abandon deals, list players and replace operators in their persistent rosters. Negotiations now cover fee, wage, contract length, signing bonus, appearance bonus and promised squad status. Failing a later playing-time promise can damage morale and lead to a transfer request.

The new **Club → Commercial** page contains five fictional sponsor brands with different identities and deal structures. Offers scale with club reputation, results and league level. A deal can pay upfront money, weekly income, win bonuses and a 3–0 sweep bonus. Pending proposals must be answered before End Day; an accepted partner appears as a small broadcast logo in the bottom-right corner of the spectator screen.

The current five brands are **Aegis Dynamics, VoltRush Energy, Northstar Finance, Redline Mobile and Ironclad Gear**.

## Retained Build 11.35 behaviour

Build 11.35 corrects the top-tier competition identity. The Pro League is stored internally as tier `0`; previous truthy fallbacks interpreted that valid zero as Division 3 in some league, market and staff paths. Tier 0 now consistently displays **Strikewatch Pro League / Pro League**, survives save loading, uses the correct Pro League recruitment quality and remains intact after promotion from Division 1. Existing affected saves are repaired when loaded without resetting career progress.

Build 11.34 is a platform-hardening release rather than a new management layer. It keeps the tactical matchday feature set while correcting cross-system inconsistencies found in a full route, calendar, save-state and simulation audit.

- The source page, standalone release and build stamp now identify the same build, reducing false cache/deployment diagnosis on GitHub Pages.
- Fresh-career setup correctly advertises a 350,000-credit bank start-up loan and a 32,000-credit combined weekly wage budget.
- League matchdays cannot be bypassed with an exhibition. Exhibitions are available on clear days, while the scheduled league fixture is the only playable match type when due.
- Persistent state receives stronger repair for duplicate squad IDs, weekday drift, invalid counters and weapon assignments that exceed owned copy counts.
- `stateIntegrityForTest()` checks the live career's squad, finances, calendar, Inbox decisions, transfers, tactics and 28-fixture league schedule; `normaliseStateForTest(raw)` provides a non-mutating save-repair regression hook.
- Mobile route controls meet a 44px portrait / 40px compact-landscape interaction floor without introducing horizontal overflow.
- Transfer, result and matchday messages use consistent Inbox sender identities.

## Retained Build 11.33 behaviour

### Tactical matchday and visible management influence

- Fresh matches follow **briefing → starting five → tactics → matchmaking → live match → debrief**.
- The first five squad positions are starters and later squad members are reserves. The Tactics screen lets the manager assign temporary match roles without replacing natural player roles.
- Choose Cautious, Balanced or Aggressive approach; Close, Mixed or Long preferred range; and Stay Grouped, Trade Eliminations, Create Flanks or Hold Territory priority.
- Entries, Supports, Anchors, Flankers, Marksmen and Shot Callers now express different spacing and route behaviour during the simulation.
- Operators wait briefly for support, react to ally deaths, attempt trades, regroup when separated and adapt congested routes. Shared information remains temporary and does not allow wall tracking.
- The after-action report explains supported time, trade success, regrouping, role actions and route changes, then recommends tactical or training adjustments.

### Management decisions in the Inbox

- Playing-time requests, medical recommendations, board direction and disciplinary matters may require a response.
- Required choices lock End Day until resolved and can affect morale, happiness, fatigue, training, credits, reputation or playing-time promises.
- The Inbox records the selected outcome so the consequences remain understandable.


### Camera-linked live telemetry

- The **Live Player Link** card now follows the operator currently being spectated instead of the player last opened in Command HQ.
- Name, health, accuracy, damage, K/D, weapon and tactical state update together in landscape and portrait.
- Switching between any of the five owned operators keeps the spectator card and live telemetry identity synchronised.

### Cleaner pause and landscape controls

- Opening Command HQ during a match keeps Back, Forward, Speed and Pause on one compact 44-pixel rail rather than creating a large empty row.
- The landscape Previous, Auto, Next and Speed deck is considerably smaller and remains centred without touching the spectator card or portrait-return control.
- The old angular Maximise/Windowed View buttons have been replaced by a clearer **Full View** utility control and a compact landscape return icon.

### Portrait-start audio recovery

- Audio is resumed before entering full view and checked again after deployment, fullscreen changes and orientation changes.
- Previously unlocked sound events are queued briefly while Safari suspends the audio context and are flushed when it recovers.
- The recovery logic does not override a deliberate Sound Off choice.

## Retained Build 11.31 behaviour

### Clear club calendar header

- The top-right manager profile now separates club identity from a dedicated calendar readout instead of compressing team level, date, mail and development information into one tiny line.
- The current weekday is the primary date value, with Week and Season presented directly beneath it. A calendar glyph and mint-accented panel make the readout recognisable at a glance.
- On narrow phones the same information collapses into a compact stacked treatment while retaining the club name, Team Level and readable date without increasing the persistent header height.
- Inbox, transfer and development totals no longer compete for space in the profile text; their relevant navigation routes own their notification indicators.

### Consistent subnavigation notifications

- Inbox unread messages, active transfer updates and unspent development points now use compact circular notification badges inside their subnavigation tabs.
- The old `ROUTE · NUMBER` text treatment has been removed. Mail uses gold, transfer activity uses a warm decision colour and development points use the Command HQ mint accent.
- Badges preserve accessible route labels and disappear completely when their count reaches zero.

## Retained Build 11.30 behaviour

### Must Respond calendar protection

- **End Day** can no longer skip a league fixture that is due today, an unfinished incoming negotiation, an unanswered rival transfer bid or a completed-season transition.
- A compact **Must Respond** strip lists the blocking items and routes the manager directly to the page where each decision can be resolved.
- Tapping the blocked End Day icon explains the highest-priority item and opens its relevant screen; the calendar, training, recovery, payroll and transfer processing remain unchanged until the blocker is cleared.
- The End Day icon shows a small blocker count and changes to a warning treatment while it is locked. Informational Inbox messages and optional club-management tasks do not unnecessarily stop time.

### Command history and compact header

- The oversized Command HQ action row has been removed. **Inbox**, **End Day**, **Calendar** and **Match / Recruit** now form four equal icon controls in the persistent manager topbar.
- The freed header space is a single 44-pixel history rail with **Back** and **Forward** controls, similar to football-management games.
- Route history preserves the selected player, selected message, selected transfer offer and page scroll position. Visiting a new page after going back clears the obsolete forward branch.
- Back and Forward disable automatically when no destination exists, and their accessible labels identify the page they will open.
- **New Team / Reset** remains only in Club > Configuration, while pause-only Return to Match and Exit to Main Menu remain paired in the pause area.

### Persistent topbar match access

- The Match icon reflects recruitment, ordinary availability and matchday states without replacing its SVG with text.
- On matchday it becomes the direct route to the required fixture; when the squad is incomplete it routes to recruitment instead.
- All four topbar controls remain equal and touch-sized at 320, 375, 390 and 430 CSS-pixel widths without horizontal overflow.

## Retained Build 11.29 behaviour

### Paired manager shortcuts and recognisable mail client

- Inbox remains a persistent manager-topbar shortcut and the zero-unread badge is removed completely from layout.
- Club Inbox retains its compact toolbar, sender/category avatars, unread dots, message previews, dates, dedicated reading pane and individual read/unread control.
- Selected messages show sender, recipient, category, subject, body and related-page actions in a conventional email layout.
- **Mark All Read** disables when no unread mail remains, and the manager status line omits `0 MAIL`.
- The two-pane desktop layout becomes a stacked list-and-reader layout on phones without document-level horizontal overflow.

## Retained Build 11.28 behaviour

### Cache-safe menu shell

- Development CSS and JavaScript URLs now carry the Build 11.28 release ID so replacing files on the same host cannot leave the 11.26 menu shell in browser cache.
- Startup defensively removes the retired `#freshGameBtn` and relocates a legacy sidebar `#startMatchBtn` into the compact header action area if mixed cached assets are ever encountered.
- The standalone release uses a new filename and fully inlined assets, avoiding linked-asset caching entirely.


### Enemy operators can critically hit

- Opposition operators now use their own generated Crit Chance and Crit Bonus Damage attributes together with their equipped weapon modifiers.
- Enemy criticals follow the same post-hit roll and damage rules as the owned squad; there is no separate simplified enemy chance.
- Critical eliminations from either club receive a gold **CRIT** marker in the kill feed.
- The scoreboard shows each side's current-round critical-hit total alongside alive operators and kills.

### Smaller, better-placed Command HQ actions

- **Recruit Squad / Deploy** has moved from the oversized sidebar panel into a compact action in the Command HQ content header.
- The permanent **New Team / Reset** sidebar button has been removed. The same protected reset flow now lives only under **Club > Configuration**, where it requires confirmation.
- The sidebar action area is used only when a match is paused, keeping **Return to Match** and **Exit to Main Menu** together without wasting normal menu space.

### Critical hits and critical attributes

Players now have two separate critical attributes:

- **Crit Chance** controls how often confirmed hits become critical hits.
- **Crit Bonus Damage** controls the extra damage added when a critical occurs.

All operators begin from a common 5% critical chance and +50% critical bonus damage. Each Crit Chance point adds 1 percentage point, while each Crit Bonus Damage point adds 4 percentage points. Both attributes may be improved with Player XP stat points or gradual Training Facility programmes, subject to the player's potential ceiling.

Weapons contribute their own modifiers on top of the operator:

- P12 Scrapline has no additional critical modifier.
- P12 Service adds +1% chance and +10% bonus damage.
- Viper-9 Compact adds +3% chance and +5% bonus damage.

Critical hits are rolled only after a shot has genuinely connected. They display a yellow/gold **CRIT** damage badge, with **CRIT DOWN** on a fatal critical. Critical hits appear in live telemetry, latest-match data and career records. Improving either critical attribute also contributes to current ability, value, scouting assessment and transfer interest.


### Spectator HP clarity

- Numeric HP now changes smoothly from green at high health, through amber around half health, to red near zero.
- The same colour is used in portrait and landscape spectator layouts.
- The spectator health bar follows the numeric HP colour rather than remaining a fixed colour.

### Persistent Inbox button

- Command HQ now has an envelope icon in the persistent manager header.
- The icon opens Club Inbox directly, matching the quick-mail access common in football-management games.
- An unread badge shows the number of unread messages and the icon highlights while Inbox is open.
- The control remains touch-sized on 320–430 pixel phones and mobile landscape.

### Route alignment

- Mobile route labels are centred consistently inside their tabs.
- Short labels such as **League** no longer appear visually offset compared with Mission Control or Team Telemetry.
- Existing overflow arrows, fades and active-route scrolling remain intact.

## Build 11.24 current behaviour

### Transfer offers and negotiations

- Recruitment no longer completes through a single purchase button. Selecting **Negotiate** opens the Transfer Centre with separate transfer-fee, weekly-wage and contract-length controls.
- Selling clubs and players judge the complete package. Acceptable offers can be completed, weaker offers receive a counter, and repeated unrealistic offers can break down.
- Rival clubs can submit time-limited bids for contracted players as value, form and transfer interest rise.
- Outgoing bids can be accepted, rejected or countered. Agreed sales update the squad, finances, Inbox and the buying rival's persistent roster.
- The Transfer Centre retains active talks and offers inside the version-11 save schema.

### Early-career balance pass

- A new Division 3 club begins with a **350,000-credit bank start-up loan** and a **32,000-credit combined player/staff wage budget**.
- Division 3 recruitment is deliberately low ability: the tested opening pool averaged 26 overall with a maximum of 42 in the regression seed.
- The market still guarantees an affordable five-player route, while leaving enough budget for a reserve, staff appointment or later negotiation.
- Recruitment refresh now costs 2,500 credits and staff refresh costs 1,500 credits.

### Clearer available development points

- Unspent Team points, Player stat points and active transfer items now create prominent alert cards above management pages.
- Training cards and benefit cards with spendable points receive a highlighted state.
- Training and Transfers route labels display attention counts, and the persistent manager status line includes available point and transfer totals.

### Mobile-only UX review

- Transfer negotiations use large plus/minus controls and stacked layouts on narrow phones.
- Long action labels wrap instead of being clipped, with consistent line height and at least 44-pixel touch targets.
- Market actions, transfer decisions, point alerts and profile actions collapse cleanly to one column at 430 pixels and below.
- The tested 320, 375, 390 and 430 pixel portrait layouts plus 844 × 390 landscape produced no document-level horizontal overflow.


### Career calendar, Inbox and End Day

- Careers now progress through a simulated Monday–Sunday calendar rather than advancing only when a match finishes.
- **End Day** advances training, fatigue recovery, injury recovery, assistant decisions, weekly planning and matchday notifications.
- League fixtures are normally played on Saturday. The game clearly shows how many days remain and prevents league matchmaking before the scheduled day.
- Only one match may be completed on a simulated day.
- A persistent Inbox contains unread/read mail for matchdays, results, recruitment refreshes, development, medical clearance, staff appointments and promotion/relegation.

### Division ladder

- New clubs begin in **Strikewatch Division 3**.
- The ladder continues through Division 2, Division 1 and the Pro League.
- Every tier uses a 20-club, 38-match home-and-away season with 380 total fixtures.
- The top two clubs promote; the bottom two relegate where another tier exists.
- Starting the next season moves the club to its new division and refreshes appropriate player and staff pools.

### Tactics and assistant manager

- The Tactics page offers Balanced, Pressure, Control, Defensive and Wide formations.
- The manager may retain manual control of the starting five or delegate selection to an employed assistant manager.
- Assistant candidates have judging ability/potential, tactics, man management, fitness, style, signing fee and weekly wage.
- Delegated selection considers ability, role fit, readiness, fatigue, form, sharpness and injuries before placing five players in the starting lineup.
- Staff wages count toward the same weekly wage budget as player contracts.

### Scouting pools and stars

- Recruitment and staff searches include a division-pool selector. Only the club's current division is unlocked.
- Division 3 begins with lower-ability, affordable prospects suitable for a new team.
- Player cards show current-ability and potential stars for quick comparison, while the full profile retains detailed attributes and history.

### Low-health cover initiative

- Cover stalemate handling now includes low-health duels. When two loaded opponents remain hidden without damage, one receives initiative to push or reposition while the other may challenge from a peek point.
- Damage, reload pressure and genuine medical danger still reset or override the forced decision.


### Retained mobile combat and presentation pass

- The active camera now shows the watched player's tactical speciality, such as Entry, Support, Anchor, Flanker, Marksman, Shot Caller or Flex.
- Damage numbers use a cleaner compact badge with separate damage/down labels, stronger heavy-hit treatment and distinct incoming/fatal colours.
- Operators can recognise meaningful partial exposure around corners instead of requiring the entire target centre to be visible. Walls and solid props still block firing.
- Opponents that both remain committed to cover without dealing damage will eventually change angle or push, reducing artificial camping stalemates.
- Operators sprint in short bursts during clear-route travel, pushes, fallbacks and repositioning. Existing fatigue and in-match exertion reduce how often they can sprint.
- Sprint footsteps are louder and carry farther than normal running, allowing opponents to investigate them from a wider area. Sprint distance also adds bounded post-match fatigue and injury workload.
- Citadel Depot now has more floor plates, route markings, grates, decals and lower wall protection, improving room identity without adding new collision obstacles.
- Portrait controls, selected-player telemetry and live Command HQ spacing have been rebalanced for phones. Live pause/speed controls occupy a dedicated row and narrow phones keep camera controls on a separate row from Speed/Menu.

### Own-team spectator control

- The spectator camera may only follow players from the manager's own club.
- Previous, Next, Auto Spectate, scoreboard selection and debug camera selection all enforce the same restriction.
- Living own-team scoreboard rows are touch, pointer and keyboard selectable.
- Opposition rows remain visible for match information but cannot become camera targets.
- When the currently watched player is eliminated, Auto Spectate moves to another living teammate.

### Telemetry-linked Command HQ

- Opening Command HQ during a live match automatically opens the spectated own-team operator's **Player Profile & Data**, including the embedded live telemetry panel.
- The selected player persists across Profile, Training and Loadout routes without changing squad order.
- Returning to the match restores the live camera rather than selecting a different operator.
- The match continues in the background unless the explicit Pause control is used.

### Match speed controls

- Match controls now provide **1× normal speed** and **2× fast forward**.
- The same speed state is available in landscape controls, portrait controls and the live Command HQ header.
- Pressing `F` toggles speed while watching the match or browsing live Command HQ.
- Simulation time, operators, combat, round clock and match flow accelerate together.
- Career reports, menu interaction and reward presentation remain real-time.
- Fast-forward uses small simulation substeps so collision, AI and shot logic are not advanced through one oversized frame.

### Horizontal navigation affordances

- Horizontally scrollable Command HQ subnavigation now displays left or right arrow controls when more routes exist outside the visible area.
- Edge fades reinforce that additional items are available.
- The arrows update as the user scrolls and disappear when the start or end is reached.

### Persistent injuries and medical risk

Every generated and contracted player now stores:

- injury vulnerability;
- current injury and severity;
- recovery time in match weeks;
- injury history;
- latest calculated injury risk;
- latest medical update.

Injury risk is evaluated once after a completed match for participating starters. It is influenced by:

- pre-match fatigue;
- individual injury vulnerability;
- Resilience;
- age;
- rounds played and damage received;
- an existing injury;
- the club's Sports Science level.

High fatigue meaningfully increases risk. Playing while already injured can aggravate the problem and extend recovery. Injuries apply bounded penalties to movement, handling, reaction, accuracy and condition rather than completely removing the player from the squad, preventing a five-player club from being permanently locked out of matches.

Recovery advances through simulated days. **Rest & Recovery** and Sports Science accelerate recovery, while reserves avoid match injury rolls.

Medical status appears on:

- squad cards;
- player profiles;
- Training Facility cards;
- Team Telemetry;
- the embedded Player Profile telemetry panel;
- readiness calculations and manager comments.

Active injuries modestly reduce market value and rival-club interest until the player recovers.

### Damage feedback

- Confirmed hits by the currently spectated player produce floating damage numbers near the target.
- Incoming hits on the spectated player display red damage feedback near the centre of view.
- Fatal hits use a stronger visual treatment.
- Misses, wall-blocked shots and unrelated off-camera combat do not reveal damage information.
- Damage effects use a capped 18-entry pool and remove expired DOM elements.
- The crosshair hit response now reacts to confirmed outgoing hits as well as incoming impact feedback.

### Performance safeguards

- Gameplay simulation remains full-rate while routine HUD refreshes run at 20 Hz.
- The scoreboard rebuilds only while open.
- Command HQ background rendering is capped at 30 FPS while the live simulation continues independently.
- Feed and sound-event cleanup occurs in place to reduce temporary array allocation.
- Damage-number effects are bounded and self-cleaning.
- `window.__strikeDebug.performance()` reports recent frame, update and render timings, long frames, transient effect counts and active rate limits.

### Current-division league play

- The current division always contains 20 clubs and 38 home-and-away matchdays.
- Rival clubs retain persistent names and five-player squads for that season.
- League matchmaking and the live Red roster use the scheduled opponent's actual squad.
- The other nine fixtures on each matchday are simulated after the user's completed league match.
- Exhibition matches use rival squads and settle normal finances, wellbeing and Player XP without changing the table or calendar fixture.
- Northbridge Five remains the first Division 3 opponent for a gentle introduction.


### Club names and scoreboard

- Actual club names replace generic Blue Team and Red Team labels throughout matchmaking, spectator HUD, scoreboard, Command HQ, round banners and reports.
- Blue and red remain presentation colours only.
- The scoreboard retains green alive indicators and red eliminated indicators; skull icons are not used.
- Eliminated rows display 0 HP, muted styling and **ELIMINATED** status.

### Team creation, recruitment and finances

- A new career starts with a named organisation, a named manager and no contracted players.
- The club begins with a 350,000-credit bank start-up loan and a 32,000-credit weekly wage budget.
- Five contracted players are required for matchmaking; the squad cap is eight.
- A six-stage tutorial guides Recruitment → Profile → first signing → starting five → Squad review → Deployment.
- The generated market contains 18 persistent candidates with unique identities, tactical roles, attributes, potential, personality, traits, wellbeing, contract data and history.
- The initial market always contains an affordable route to five starters.
- Transfer fees are immediate. Match income settles after the complete first-to-three match. Combined player and staff payroll is processed when End Day enters a new calendar week, and contract time reduces at that same weekly boundary.
- Player value and transfer interest react to ability, potential, age, form, recent performance, Player Level, contract and medical status.

### Squad roles and autonomous behaviour

The available tactical roles are:

- Entry
- Support
- Anchor
- Flanker
- Marksman
- Shot Caller
- Flex

Roles affect autonomous combat choices rather than existing only as labels. Recruited names, stats, roles, wellbeing and issued weapons are carried into the actual Blue Team match slots.

### Team and individual telemetry

- **Team Telemetry** remains an Operations route that aggregates the entire starting five.
- Individual telemetry is embedded inside the selected operator's **Player Profile & Data** record rather than scattered across a second route.

The combined profile includes combat data, fatigue, condition, happiness, morale, form, sharpness, readiness, medical status, latest-match details, career honours and private post-match reflections about personal performance, the team display and possible management improvements.

### Training and Player XP

- Every player owns separate XP, Player Level and unspent personal stat points.
- Match participation, kills, rounds, rating and result award Player XP after the full match.
- Each Player Level grants one personal point for Marksmanship, Handling, Awareness, Mobility or Resilience.
- Allocations respect the normal 10-point ceiling and the player's potential.
- The Training Facility offers Marksmanship, Handling, Awareness, Mobility, Resilience, Rest & Recovery and No Assignment.
- Technical training progresses slowly whenever the manager uses End Day and can eventually increase the focused attribute.
- Age, potential gap, fatigue and Coaching Staff influence daily development speed.

### Team XP and club benefits

Team XP is separate from Player XP. Each Team Level grants one club-development point for:

- **Coaching Staff** — improves technical training progress.
- **Performance Analysis** — improves Player XP awards.
- **Sports Science** — improves fatigue and injury recovery while reducing injury risk.
- **Commercial Department** — improves match income.

Each department is capped at level five. Club reputation remains a separate system.

### Individual weapon ownership

- Every contracted player stores an independent `equippedWeaponId`.
- P12 Scrapline pistols are standard issue and may be used by the whole squad.
- Dropped P12 Service, Viper-9 and AR-4 Sentinel rewards are counted club copies. Each copy may have one holder, so multiple owned copies may be issued simultaneously.
- Reassignment automatically returns the previous holder to a valid fallback sidearm.
- The starting five carry their individual weapons into Blue slots 0–4.
- Universal finishes remain club-wide; attachments are placeholders.

### Ammunition Store placeholder

The Supplies section contains a disabled future-ammunition preview beneath the active Supply Depot crate exchange. It does not deduct credits, create stock, consume ammunition or alter current reload/magazine balance. It exists only to establish the future navigation and presentation location.

### Match, AI and rewards

- Matches are first to three round wins, with no respawns inside a round.
- Intermediate rounds continue directly without matchmaking, finance, league, training, XP, report or reward settlement.
- AI perception uses visible contact, sound, teammate evidence and last-known positions rather than hidden live enemy coordinates.
- Late-round operators actively search; regulation expiry may trigger a single 45-second Sudden Hunt.
- Victory awards a field crate. Defeat awards non-victory XP and match settlement but no crate.
- Crate probabilities are:
  - P12 Service: 32%
  - Viper-9 Compact: 32%
  - AR-4 Sentinel: 14%
  - Urban Grid common skin: 22%
- Repeated weapons add another usable club copy; duplicate Urban Grid converts to 35 XP.

### Operator, weapon and audio presentation

- Operators retain the compact original tactical-shooter silhouette and shared forward-bending two-bone leg solver.
- Knee pads use matte shells, backing and straps with no emissive illumination.
- Shared weapon geometry remains authoritative across Armoury, first person, third person, corpses, dropped weapons and rewards.
- P12 Scrapline, P12 Service, Viper-9 and AR-4 Sentinel retain distinct damage, recoil, heat, recovery, cadence and range profiles.
- First-person reloads show magazine removal, insertion, empty-slide lock and slide-rack phases.
- Web Audio recovery remains gesture-led, visibility-aware and respects deliberate mute state.

## Source ownership summary

- `js/00-core.js` — build metadata, map/constants, shared state and DOM references
- `js/10-audio.js` — generated audio, spatial events and browser audio lifecycle
- `js/20-navigation.js` — A*, smoothing, clearance and route diagnostics
- `js/30-bot-ai.js` — autonomous perception, roles, movement, combat and hit application
- `js/35-career.js` — schema-17 career save, migration, Gold Coin settlement, persisted Store crates, finance history, telemetry, reports, weapons, skins, rewards and loadouts
- `js/36-team-management.js` — generated players, recruitment, squad order, tutorial, wellbeing, contracts and finances
- `js/39-recruitment-commercial.js` — scouting knowledge, shortlists, assignments, transfer windows, AI market activity, contract promises and sponsorship
- `js/37-league.js` — clubs, rival squads, fixtures, standings and match context
- `js/38-development.js` — Training Facility, Gold Coin Club Store, Player XP, Team XP, benefits, value and transfer interest
- `js/39-medical.js` — vulnerability, injury risk, recovery, medical labels and bounded performance penalties
- `js/39-club-operations.js` — calendar, Inbox, End Day blockers, staff, formations and lineup delegation
- `js/39-matchday.js` — match preparation, Plan Fit, role suitability, familiarity, decisions and tactical analysis
- `js/39-transfers.js` — incoming/outgoing negotiations, counter-offers and transfer settlement
- `js/39-workflow-integrity.js` — exact alert routing, arrival banners, reversible management drafts and unsaved-navigation guards
- `js/40-match-flow.js` — rounds, first-to-three scoring, own-team spectator cycling, damage-number effects and Live Command round boundaries
- `js/41-live-command-pulses.js` — contextual one-per-round commands, autonomous compliance, tactical restoration, outcomes and command-dock presentation
- `js/50-ui-menus.js` — HUD, Command HQ, scoreboard, matchmaking, telemetry routing, speed and subnavigation affordances
- `js/60-renderer-core.js` — live-match WebGL core
- `js/61-world-renderer.js` — environment rendering
- `js/62-character-renderer.js` — operators, corpses, armour and third-person weapons
- `js/63-viewmodel-renderer.js` — first-person camera, recoil, reloads, hands and weapons
- `js/64-reward-renderer.js` — independent procedural reward crate
- `js/70-runtime.js` — update/render loop, inputs, performance controls and debug APIs

See `PROJECT.md` for complete architecture, invariants and regression requirements.

## Current development priorities

Strong next systems are deeper training schedules, medical and morale management, contract expiry and squad registration, richer opponent identity/scouting, cup competitions, replay/highlight presentation and functional ammunition/attachment economies.

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
