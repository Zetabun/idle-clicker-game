> Historical baseline: this report records the Build 11.99 deep audit. Build 12.00 retains its corrections and adds performance/Free Roam work documented in the current project files.

# Strikewatch 11.99 Deep Audit Report

## Scope

This audit reviewed the complete Build 11.98 modular source before producing Build 11.99. It covered:

- Every Markdown and handoff file
- All three battleground definitions and their shared navigation/rendering systems
- Spawn safety, engagement objectives, props, doors, furniture, elevation and route reachability
- Summit stair-only access, cross-floor pursuit, tactical flanking and presentation geometry
- Career creation, squad, tactics, recruitment, transfers, training, staff, scouting, sponsors, supporters, finances, Gold Coins, saves and recovery
- Management navigation and phone-width layout at 320, 375, 390, 402 and 430px portrait plus 844x390 landscape
- Beginner induction and one-time contextual tutorials
- Source syntax, generated bundle syntax, deterministic building and archive integrity

The headless browser did not expose a usable WebGL context. Map presentation was therefore checked through authored geometry, renderer data, screenshots supplied during development and runtime audit helpers. A final real-device visual check remains necessary for subtle lighting, clipping and camera-angle anomalies.

## Confirmed defects corrected in Build 11.99

### 1. Stale runtime build name

`BUILD_VERSION` was 11.98, but `BUILD_NAME` still described Build 11.97. The runtime therefore replaced the correct static page title with the older release name.

**Correction:** The authoritative runtime metadata now reports `Strikewatch 11.99: DEEP AUDIT & CONSISTENCY PASS`, and the static page/cache identifiers use the same build ID.

### 2. Three invalid Summit engagement objectives

Three authored Summit objectives were reachable through fallback/path logic but failed the direct clearance requirement:

- Upper Catwalk Snap blue objective 3
- Upper Catwalk Snap red objective 3
- Pillar Crossover blue objective 4

**Correction:** Each point was moved to a clear, symmetrical and directly reachable floor position. Every Summit opening plan now passes ten direct objective checks without relying on nearest-point substitution.

### 3. Misleading Summit prop-collision regression

The prop audit expected all six Summit stair meshes to create colliders even though the stairs are intentionally authored as walkable presentation geometry. This produced a false failure of 13 colliders found versus 19 expected.

**Correction:** The expected count now includes only non-walkable stairs. Citadel, Office and Summit all pass their authoritative prop-collision audits.

### 4. Invalid Summit routing-preference test setup

The medium-range support regression bot was spawned at a location occupied by a side console. The resulting null route made it look as though support operators did not prefer the Skybridge.

**Correction:** The test now starts from a clear West-side location. Long-range marksmen select Catwalk routes, short-range entries select Maintenance routes and medium-range supports select Skybridge routes.

### 5. Beginner tutorial header instructions were out of date

The guide numbered End Day as shortcut 2 even though the live header order is Inbox, Calendar, Match and End Day. It also stated that Match Control was available from every route even though the control is intentionally conditional.

**Correction:** The tutorial and career-creation preview now describe the actual order and explain that Match Control appears when a fixture is ready. The final induction step also mentions confirming the tactical plan and choosing the battleground before matchmaking.

### 6. Recent systems lacked contextual guidance

Fans, the expanded Staff system and the After Action diagnostic exporter had no one-time guide despite being substantial management features.

**Correction:** New contextual guides explain supporter expectations and trends, Assistant Manager versus Opposition Scout responsibilities, and how to use the causal debrief and latest-match diagnostic export.

## Map audit results

### Citadel Depot

- All five blue-to-red route pairs connected
- All ten spawns clear of walls and props
- Every engagement-plan objective clear and reachable
- Prop collider count and swept-collision checks passed
- No authored geometry inconsistency found

### Skyline Offices

- All spawn routes and engagement plans passed
- Six desks remained genuine map props and passed clearance checks
- Eight doorway approaches passed
- Protected transit corridors and courtyard rotation lanes passed
- Sliding-door pocket presentation passed for all eight doors
- Wall screens/displays remained flush and outside walkways
- Courtyard opening and cross-centre traversal tests passed
- Prop collider count and swept-collision checks passed

### Summit Terminal

After the 11.99 corrections:

- All ten spawns clear
- Every engagement objective clear and reachable
- All fourteen authored layer routes pass in both directions
- Every hotspot reachable from all relevant spawns
- Six stair transitions pass vertical-access and stair-only checks
- Direct platform-side climbs remain rejected
- Cross-floor combat routes retain stair waypoints
- Verified tactical flanking passes
- Structural supports, two-level elevation, headroom and presentation audits pass
- Guardrails retain six stair-mouth openings
- Prop collider count and swept-collision checks pass

## Management-system audit results

The automated management battery completed without state-integrity errors. Verified areas included:

- Career creation and schema-17 normalisation
- Export/import/backup recovery contracts
- Recruitment, squad capacity, wages and transfer fees
- Line-up, roles, tactics and match-plan confirmation
- Assistant Manager and Opposition Scout appointment/release behaviour
- League schedule, rival identities, dynamic ratings and supporter expectations
- Incoming and outgoing transfer workflows
- Training focus, Player XP, Team XP, stat allocation, injury and recovery
- Sponsorship acceptance, weekly income and match bonuses
- Gold Coin earning/spending and Supply purchases
- Season completion, promotion-season setup and supporter-state persistence
- Inbox ordering and two-row scroll viewport
- Post-match report and latest-completed-match diagnostic export contracts

No damage, health, weapon, opponent-strength, economy, reward or progression values were changed by this audit pass.

## UI and responsive audit

No document-level horizontal overflow was found on the tested management routes at:

- 320x720
- 375x812
- 390x844
- 402x874
- 430x932
- 844x390 landscape

The intentionally horizontally scrollable subsection navigation can place inactive tabs outside its own viewport, but it does not expand the document width.

### Usability risks retained for later work

These are not confirmed release-blocking bugs, but they deserve a future consolidation pass:

- `css/game.css` is approximately 564 KB and 13,520 lines, with 202 media-query blocks and 152 `!important` declarations. The current UI is stable, but future fixes have a growing risk of selector conflicts and breakpoint regressions.
- A few secondary landscape controls are narrower than the ideal 44px touch width, although their height and spacing kept them usable in testing.
- Some management pages remain long and information-dense. The section dashboards and collapsed directories reduce this, but further component consolidation would improve maintainability.
- The diagnostic event detail window can still overflow during long/churn-heavy matches. Full-match counters remain authoritative, while only the oldest detailed events are discarded.

## Tutorial audit

The six-step induction remains structurally current:

1. Foundation loan and command shortcuts
2. Recruitment market
3. Player profile
4. First signing and five-player squad construction
5. Starting-five review
6. Tactical-plan confirmation, battleground selection and matchmaking

After induction, one-time guides now cover:

- Calendar
- Tactics
- Transfers
- Training
- Finances
- Gold Coins
- Commercial/sponsorship
- Loadouts
- Staff and opposition scouting
- Fans/supporter culture
- After Action and diagnostic export

## Release gates passed

- Every modular JavaScript file passed syntax checking
- Generated development bundle passed syntax checking
- Standalone inline code passed syntax checking
- Two consecutive builds produced identical output
- ZIP integrity passed
- Career state-integrity audit returned zero issues
- All three maps passed their current route, spawn and engagement-plan gates
- All tested management routes fit the supported phone widths
- All new contextual tutorial routes rendered and dismissed independently

## Recommended next work

Do not add another large gameplay system immediately. First perform one real-device match on each map with Build 11.99 and export the post-match diagnostics. The highest-value subsequent engineering task is a controlled CSS/component consolidation pass, followed by map-specific tactical presets and preparation systems.
