# Strikewatch Build 12.53 Audit — Live Command Pulses

**Audit date:** 21 July 2026  
**Build ID:** `12.53.0-live-command-pulses`  
**Career save schema:** 19  
**Diagnostics schema:** 1

## Scope and source review

All 53 Markdown files supplied in the incoming Build 12.52 package were read before source changes began. The implementation was constrained to the approved live-round manager intervention, the landscape commentary relocation, supporting report/debug integration and current documentation. Historical audit files were retained unchanged.

Build 12.53 does not add direct unit control, a second navigation authority, a new map, a new combat-stat layer or a persistence-schema migration. It preserves the Build 12.52 arena geometry, collision, navigation, line-of-sight, spawn and engagement-plan authorities.

## Implementation

### Live Command Pulse model

Added `js/41-live-command-pulses.js` after `js/40-match-flow.js` and before `js/50-ui-menus.js` in the build order. The module owns:

- one successfully issued pulse per live round;
- exactly three context-sensitive choices in ordinary play;
- five command archetypes: Regroup (10 s), Commit (9 s), Disengage (8 s), Hold Territory (11 s) and Switch Route (12 s);
- autonomous immediate, delayed and unable compliance based on role, awareness, pressure, health and current contact;
- temporary tactical-profile snapshots and restoration;
- movement goals and authored engagement-route switching;
- evidence-led success, mixed or failed command outcomes;
- landscape/portrait command presentation and deterministic debug state.

Commands may alter approach, priority, aggression, speed, cover preference, low-health behaviour, support waiting, grouping, trading, flanking, holding, support radius and spacing while active. Regroup, Disengage, Hold Territory and Switch Route can also provide temporary navigation goals; Commit increases pressure through the current autonomous route. No operator is selected or steered directly.

A protected-field audit snapshots health/skill configuration, accuracy, damage multipliers, critical/headshot multipliers, fire/reload multipliers, armour durability and equipped weapon damage/accuracy/fire-rate configuration. The command completes only with those protected values unchanged, and all temporary tactical-profile values are restored on expiry, round end or match reset.

### Match, AI and report integration

- `js/30-bot-ai.js` accepts live-command goals only when an operator is not blocked by visible combat and exposes the interpreted command in tactical reasoning/telemetry.
- `js/40-match-flow.js` resets availability at each round, completes an active pulse before round settlement and resets match-scoped state for a new match.
- `js/35-career.js` retains completed outcomes in the existing completed-match summary and renders a Live Command Review without adding a save field.
- `js/70-runtime.js` updates the pulse during simulation, binds touch/click/keyboard controls and exposes deterministic command/layout helpers.

### Landscape commentary dock

`index.html` now separates the match into `#matchStage` and `#matchCommentaryDock`. In landscape, `css/game.css` reserves an 86 px commentary row below the action stage, reduced to 76 px on short landscape screens. The live feed, current match moment, command trigger and open command chooser remain inside this lower row rather than covering the WebGL action.

The command chooser is a viewport-level sibling of the transformed match view. This preserves landscape docking while preventing the portrait windowed frame from clipping it. Portrait uses a vertically contained, scrollable one-column chooser.

## Verification completed before final packaging

### Build and browser feature coverage

- The generated standalone release loaded as `12.53.0-live-command-pulses` through a real WebGL SwiftShader browser session.
- No page exceptions, console errors or console warnings were recorded in the feature audit.
- A live round exposed exactly three contextual choices.
- A UI-issued command spent the round allowance, and further issues were rejected both while active and after completion.
- Starting a new round restored command availability.
- Every command path—Regroup, Commit, Disengage, Hold Territory and Switch Route—was exercised.
- Every path produced at least one immediate responder in deterministic coverage; delayed and unable response paths remained available.
- Every path changed a relevant tactical/movement field while active, restored the tactical profile afterward and left the protected-field audit empty.
- Completed command outcomes persisted into the current match report and rendered in the Live Command Review.
- Landscape checks confirmed the canvas remained inside the action stage and that the feed, moment and open panel remained wholly inside the dock below it with no horizontal overflow.
- Portrait checks confirmed the trigger and viewport-level chooser remained visible and contained.

### Arena and navigation regression

All three arena geometry-integrity, spawn, route and navigation checks passed:

- Citadel Depot navigation benchmark: **80/80**.
- Skyline Offices navigation benchmark: **80/80**.
- Dune Bastion navigation benchmark: **160/160**.
- Dune retained exactly **58/58 static colliders**, **494 navigation nodes**, **2,752 edges**, **1 connected component**, **0 support overlaps** and **0 support-pair overlaps**.

Each arena completed an independent **30 simulated seconds** with a live WebGL renderer, repeated geometry validation and no page/console faults.

### Retained system regression

The retained browser pass reported clean results for:

- onboarding clarity;
- dynamic transfer market behaviour;
- current save recovery at schema 19;
- opening-week flow;
- performance classification;
- runtime quality governor lowering and restoration;
- workflow integrity with no dirty or pending workflow state.

## Preserved invariants

- Autonomous operators remain the tactical authority; Live Command Pulses are broad temporary influences, not direct control.
- One successful pulse is available per live round, and opening/closing the chooser does not spend it.
- Ordinary play presents exactly three contextual choices.
- Switch Route reuses authored engagement plans and objectives.
- Health, accuracy, damage, weapon, armour, reward, economy and opponent configuration remain unchanged.
- Temporary tactical fields restore on expiry, round end and match reset.
- Landscape commentary and the command chooser remain below the action viewport.
- Build 12.52 geometry/navigation baselines remain exact.
- Career save schema remains 19 and diagnostics schema remains 1.

## Final release checks

### Source, build and document integrity

- `python3 -m py_compile build.py` passed.
- Every modular JavaScript source file and the generated `js/strikewatch.dev.js` bundle passed `node --check`.
- The 2,866,975-byte JavaScript payload extracted from the standalone HTML passed `node --check`.
- `index.html` contains 253 unique element IDs with no duplicates. The action stage and commentary dock are siblings inside `#matchView`; the feed and current moment are children of the dock; the chooser is outside the transformed match view; and both landscape and portrait triggers are inside their intended control regions.
- The standalone has no external script or stylesheet dependency.
- All current authority documents, the documentation index, the handoff prompt and this audit identify Build 12.53, its module ownership, its output filenames and its preservation rules. Historical audits remain unchanged.
- The final source package contains 54 Markdown files: the 53 incoming files plus `AUDIT-12.53.md`.

### Final browser verification

A final real-browser feature pass completed in 30.316 seconds with no page exceptions, console errors or console warnings. It passed:

- build identity and live WebGL creation;
- exactly three contextual choices;
- UI issue, one-use enforcement, completion and next-round reset;
- all five command archetypes;
- protected-field invariants and tactical-profile restoration;
- report persistence and Live Command Review rendering;
- portrait trigger/chooser containment;
- all-arena geometry integrity, route/spawn audits and navigation baselines.

A dedicated responsive/overlay pass completed in 15.963 seconds with no page or console faults. It verified the separated action/dock layout at **1280×720**, **844×390**, **667×375** and **568×320**, with no horizontal overflow. It also verified that opening the scoreboard or tactical minimap, leaving the match, or ending the round closes an open command chooser, and that final immediate/delayed/unable response counts form a non-overlapping five-operator partition.

A final retained-system pass completed cleanly with no page or console faults. Independent 30-simulated-second live-WebGL runs also passed for Citadel Depot, Skyline Offices and Dune Bastion after the final source rebuild.

### Deterministic output

The precheck and two consecutive clean rebuilds produced byte-identical generated files:

- `js/strikewatch.dev.js` — SHA-256 `ee640e22e9990112cb437461f48d672c8c1370586fff765b06d1747c67bb9c80`
- `dist/strikewatch-build-12.53.html` — SHA-256 `c383b40244c6dc2b726a2d7efc22ec6b9b79797875f5294dd208d513783aad32`

### Packaging

The release directory is `strikewatch-source-12.53/`. The final ZIP was rebuilt after this audit was inserted and passed a complete `unzip -t` integrity check with no damaged or missing entries.
