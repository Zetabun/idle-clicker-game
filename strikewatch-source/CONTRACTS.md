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
- Meaningful mobile microcopy has a 10.5px floor. Decorative glyphs, transient
  damage tags and non-semantic marks may remain smaller.
- Keep focus visibility, accessible names, safe-area clearance, keyboard
  access and full-page scrolling intact.
- Primary navigation, subsection navigation, previous/next history, Inbox,
  Calendar, End Day and Help controls must remain reachable.
- `.menu-subtab::after` owns the active-route bottom rail. On an inactive
  `.guided-target`, it may draw `NEXT` only after resetting inherited rail
  inset, size and transition geometry.
- Desktop version remains visible in the management header. Mobile version
  remains in the current-page bar revealed by Help.

## Onboarding and route access

- `firstMatchGuidance()` derives the active objective from existing career
  state. Do not add a second saved tutorial progression authority.
- The guide teaches recruitment, one profile, the Active Five, line-up review,
  one match plan, the first match, debrief and one training focus.
- Guided presentation may focus or explain existing actions, but must not
  auto-sign a player, choose tactics, assign training, resolve a blocker or
  advance a decision without the player.
- Progressive route locks are derived from club readiness and completed
  milestones. They must remain truthful and accessible.
- `openingWeekTutorialDayRestriction()` prevents unnecessary calendar
  consumption during guided decisions. It must release when time genuinely
  needs to advance.
- `openingWeekAdvanceToNextEvent()` uses the normal day simulation, stops for
  meaningful events or decisions and never auto-resolves them.
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
- Before changing an arena, read its latest audit. Current high-risk records:
  Skyline Offices `AUDIT-12.117.md`, Citadel Depot `AUDIT-12.108.md` and
  `AUDIT-12.109.md`, Dune Bastion `AUDIT-12.07.md`, Summit Terminal audits
  consolidated in `AUDIT-11.99.md`.
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
