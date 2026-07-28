# Stable project contracts

These are cross-release invariants. Read only the section relevant to the
current task. Release-specific implementation detail belongs in the matching
`AUDIT-*.md`, not here.

## Release and generated artifacts

- `strikewatch-source/` is the editable authority.
- `js/strikewatch.dev.js` is generated from the ordered module list in
  `build.py`.
- `dist/strikewatch-build-<version>.html` is the self-contained generated
  release.
- Root `cod.html` is a byte-for-byte copy of the verified standalone.
- Never fix generated files independently of their source.
- A playable release updates source, current audit, concise handoff metadata,
  generated bundle, standalone and `cod.html` in one commit.
- `BUILD_VERSION`, `BUILD_NAME` and `BUILD_ID` live in `js/00-core.js`.
  `index.html` must show the same version in the title, asset queries, build
  stamp, desktop header and mobile Help bar. `build.py` enforces visible-label
  parity.
- Preserve the concatenated shared application scope. Do not convert a single
  source fragment into an isolated module without refactoring the complete
  dependency graph.

## Interface and responsive behaviour

- Below 1024px is the established compact/mobile presentation; 1024px and
  above is the Desktop Command Centre.
- Mobile and desktop are separate supported targets. A desktop fix must not
  casually override phone rules, and a mobile fix must not change desktop
  density.
- Require no document-level horizontal overflow at supported widths.
- Touch actions affected by a change should remain at least 44px.
- Meaningful mobile microcopy has a 12px floor; explanatory paragraphs and
  decision-support copy use at least 14px. Decorative glyphs, transient damage
  tags and non-semantic marks may remain smaller.
- Keep focus visibility, accessible names, safe-area clearance, keyboard
  access and full-page scrolling intact.
- Shared management dialogs isolate the background with `inert`, move initial
  focus inside, trap Tab/Shift+Tab and restore background state on close.
- Primary navigation, subsection navigation, previous/next history, Inbox,
  Calendar, End Day and Help controls must remain reachable.
- `.menu-subtab::after` owns the active-route bottom rail. On an inactive
  `.guided-target`, it may draw `NEXT` only after resetting inherited rail
  inset, size and transition geometry.
- Desktop version remains visible in the management header. Mobile version
  remains in the current-page bar revealed by Help.
- In portrait windowed matches, the shared commentary dock sits in normal flow
  between the scoreboard strip and round objective; live commentary and match
  moments must not cover the rendered arena. Landscape and maximised layouts
  retain their dedicated commentary placement.

## Onboarding and route access

- `firstMatchGuidance()` derives the active objective from existing career
  state. Do not add a second saved tutorial progression authority.
- Guide steps are forward-only: a step whose taught outcome is already
  achieved (an operator signed, a plan confirmed) counts as complete even if
  its route-view flag was never set. The guide must never step backwards.
- The guided `match` step must always expose a working action: start
  matchmaking when the fixture is due, otherwise point to End Day/calendar.
- A per-frame animation must not be driven by writing an inherited custom
  property onto an ancestor of a large CSS-3D subtree; that invalidates every
  descendant. Animate a dedicated wrapper's own `transform`.
- A preview box frames its model by derivation, never by a typed scale. The rig
  publishes `--model-span` and `--model-centre-x/y` measured from the parts it
  actually draws; the context declares `--fit-span`, the number of model units
  it wants to show. The centring translate must be the innermost transform so
  it applies in unscaled model units. Adding a per-model scale override is the
  defect this replaced, not a fix for it.
- `will-change` belongs only on elements that are actually animated. Declaring
  it on a shared rig class promotes every instance to a permanent compositor
  layer; scope it to the pivot or the animated wrapper, matching whatever
  selector the driving JavaScript uses.
- Moving a transform onto a wrapper invalidates every per-model or per-context
  override of the element it was moved off. Those overrides are usually more
  specific and will keep re-applying the old transform against variables that
  have become static defaults. Grep for the class before shipping the move.
- A rasterised still is a renderer, never a second geometry or material
  authority. It consumes the shared part lists like every other renderer, and it
  reads material colours back out of the stylesheet rather than holding a copy
  of the palette — a hand-written table drifts the first time a material
  changes. At most one live CSS-3D rig may be mounted on a management surface at
  a time; every path that changes the selected item must close an inspector
  opened on the previous one.
- Static world batching bakes model matrices at capture time and is enabled for
  every arena. Any draw inside `drawStaticWorld` whose transform, colour or
  scale depends on `time`, on door state, or on anything else that varies
  between frames must be wrapped in `setStaticWorldBatchEligibility(false)` and
  restored, or it will be frozen for the rest of the session. Batching is gated
  in two places — the capture trigger and the per-draw `batchable` check in
  `drawMesh()` — and both must agree. Prove a batching change against the
  `?staticBatching=0` reference render, and prove nothing froze by comparing
  motion on the pixels the unbatched build animates; a plain two-frame diff
  cannot show it, because the shader's own `uTime` term moves nearly every pixel.
- Baked occlusion is contact shading derived from map enclosure, never shadows;
  nothing in the renderer traces occlusion from a light. Its sample radius is
  the design decision: a radius wider than the space being shaded darkens that
  space uniformly and reads as dimming, not shading. Every surface at ground
  level must take the same value as the floor beneath it — plates drawn over an
  unshaded floor, or a shaded floor under unshaded plates, both come out as no
  visible change. Keep the value quantised: the step count sets how many merged
  rectangles the floor becomes, which is its entire draw-call cost.
- The CSS-3D menu models are **quad-bound**, not paint-bound: their frame cost
  tracks the number of face elements, near enough linearly, and is independent
  of what those faces are painted with. Detail must therefore be proportionate
  to the size a surface actually draws at — a model authored for a 610px
  inspector cannot be dropped unchanged into a 232px card, and four of them
  cannot share a page. Measure by hiding the rigs and comparing frame interval
  against `document.body.dataset.runtimeFrameMs`; if the game's own JavaScript
  is cheap and the frame interval is not, the geometry is the cost.
- Earned progress must be written before the manager can plausibly leave.
  Returning to HQ, ending the day and the page being hidden or closed are all
  save checkpoints; no path back to HQ may skip one.
- `careerWeaponVisualParts()` is the single authority for weapon geometry. The
  CSS-3D menu surfaces, the in-match operator weapon and the first-person
  viewmodel all consume it, and `careerWeaponGeometryIntegrityAudit()` verifies
  every model class stays connected in both the world and viewmodel contexts.
  Author a weapon once; never fork its parts per renderer.
- A control that can refuse must state that it will refuse before it is
  pressed, and a refused press must route to whatever clears the blocker.
  `careerMatchLaunchState()` is the single authority for match availability.
- Management feedback must reach a surface the management interface can show.
  `showStatus()` alone is not sufficient: `.status` is match HUD chrome and is
  hidden outside a match.
- A guide step must land the player on a screen that contains the control it
  names *and* any control needed to commit it. Where a route uses a workflow
  draft bar, that bar belongs beside the controls it saves, and the owning
  panel must state the outstanding requirement rather than describe the system.
- A `*ForTest()` hook that mutates `careerState` must suppress persistence for
  the duration. A diagnostic must never be able to write partial state over a
  real career.
- Every guide step must land the player on a screen that contains the control
  it names. When that control is not on the arrival screen, the step carries a
  `scrollTarget` and the owning panel carries the matching `data-guide-target`
  anchor. The scroll helper must resolve the element that actually scrolls on
  the active presentation target, not one fixed container.
- The guide teaches recruitment, one profile, the Active Five, line-up review,
  one match plan, the first match, debrief and one training focus.
- The guided profile action must select one of the six candidates displayed in
  the beginner recruitment list. On compact cards, Compare remains available
  without requiring the user to reveal the detailed card face.
- Guided presentation may focus or explain existing actions, but must not
  auto-sign a player, choose tactics, assign training, resolve a blocker or
  advance a decision without the player.
- Progressive route locks are derived from club readiness and completed
  milestones. They must remain truthful and accessible.
- `openingWeekTutorialDayRestriction()` prevents unnecessary calendar
  consumption during guided decisions. The restriction is also represented by
  `clubEndDayBlockers()` so UI and simulation report one canonical cause, and
  it must release when time genuinely needs to advance.
- `openingWeekAdvanceToNextEvent()` uses the normal day simulation, stops for
  meaningful events or decisions and never auto-resolves them.
- Confirmed match preparation belongs to the scheduled fixture, not the
  current calendar day. It remains valid while advancing toward that fixture
  and is invalidated only when the fixture or material setup (active five,
  roles, equipment or tactical instructions) changes.
- On compact tactics, detailed sections and the final confirmation remain in
  normal scroll flow. Do not add a second floating confirmation action.
- Transient guidance, comparison and summary state must not leak into save
  schema 19 unless a deliberate migration is designed.

## Management, recruitment and economy

- Recruitment candidates come from the authoritative market. Guided or
  recommended views may rank/filter real candidates but must not create a
  second market or alter ratings, prices, wages or availability.
- The complete recruitment department remains reachable when progressive
  disclosure is used.
- The first five squad positions are the Active Five. Squad ordering, role
  selection, equipment and confirmed tactics remain player decisions.
- Recruitment, transfers, contracts, scouting, staff, sponsors, infrastructure
  and calendar systems use the same persistent career state.
- Club Cash and Gold Coins are separate currencies. Do not mix labels, ledgers,
  prices or settlement paths.
- Finite weapons and armour are counted club copies. Equipping a fully issued
  item transfers an owned copy rather than duplicating it.
- Payroll, transfer fees, bonuses, loan collections and sponsor payments must
  continue through established finance-ledger paths.
- Supporter, press, narrative and squad-dynamics systems may influence bounded
  management state, but must not silently alter health, damage, AI skill or
  select match results.

## Match simulation and live command

- Operators fight autonomously. The manager configures preparation and may use
  explicitly presented command systems; ordinary UI changes must not inject
  hidden combat bonuses.
- Preserve authoritative health, armour, penetration, reload, weapon switching,
  movement, perception, tactical decisions and settlement paths.
- Live command pulses must expose their cause, availability, effect and
  duration. They may not become permanent hidden modifiers.
- Opposition preparation stages existing formation, approach, engagement and
  priority controls. It does not guarantee results or create a second tactical
  simulation.
- Match events, feed rows, diagnostics and post-match reports derive from the
  real simulation. Presentation must not fabricate eliminations or evidence.
- A match must continue after first elimination, corpse creation, weapon
  changes, navigation recovery and round transitions without runtime faults.

## Rendering, operators and maps

- The game remains asset-free. Arenas, operators, weapons, armour and UI
  graphics are procedural or code-authored.
- Presentation geometry must not change hitboxes, navigation, collision or
  line of sight unless the gameplay change is explicit and audited.
- Living and fallen operators share the established procedural body/head
  geometry and deterministic identity palette.
- Weapon and armour presentation derives from shared authored parts and
  attachment anchors. Do not restore unrelated generic hand, muzzle or fit
  coordinates.
- Arena visuals derive from `MAP`, zones, decor and prop layouts. Minimap and
  deployment previews should consume the same authorities.
- Baked occlusion is presentation only and must stay quantised, so the static
  batcher's material grouping is not fragmented. It may never influence
  collision, navigation or line of sight.
- Static world batching bakes model matrices at capture time. An arena may only
  be batched once every time-dependent draw in `drawStaticWorld` is excluded
  through `setStaticWorldBatchEligibility()`.
- Open-air arenas draw their sky through `drawArenaSky()` before any world
  geometry, writing no depth and restoring renderer state. Sky colour and fog
  colour are separate decisions; the sky must not be derived from the fog.
- Before changing an arena, read its latest audit. Current high-risk records:
  Aurora Terminal `AUDIT-12.130.md`, Skyline Offices `AUDIT-12.117.md`,
  Citadel Depot `AUDIT-12.108.md` and `AUDIT-12.109.md`, Dune Bastion
  `AUDIT-12.07.md`, Summit Terminal audits consolidated in `AUDIT-11.99.md`.
- The `summit` arena id remains a redirect to `dune`; Aurora Terminal uses
  the summit render theme under its own `aurora` id and must stay single
  level (no doors, stairs or vertical profile) unless explicitly audited.
- Do not relax geometry, collision, door, furniture, route or navigation gates
  merely to make a new layout pass.

## Persistence and diagnostics

- Current save schema is 19. Existing careers must normalise safely.
- Current diagnostics schema is 1. Preserve bounded event/sample storage and
  export compatibility.
- New persistent fields require defaults, normalisation, save/export coverage
  and round-trip tests.
- UI-only state should remain transient.
- Never silently discard player inventory, contracts, finances, line-up,
  calendar, league, scouting, infrastructure, supporter or narrative state.
- Test helpers are regression interfaces. Search for the relevant
  `*ForTest()` hook before creating a duplicate.

## Verification baseline

Every playable change requires checks proportional to risk:

- source modules and generated bundle parse;
- standalone inline JavaScript parses;
- targeted behaviour and adjacent regressions pass;
- supported responsive widths remain contained when UI changes;
- browser/runtime logs contain no new faults;
- two builds are byte-identical;
- root `cod.html` matches the standalone;
- release metadata and documentation are current.

Use the latest relevant audit for exact domain-specific gates.
