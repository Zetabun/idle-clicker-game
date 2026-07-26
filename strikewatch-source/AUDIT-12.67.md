# Audit 12.67 — Living Press & Player Honours

## Scope

Build 12.67 turns match reporting and the Inbox into a persistent living-world system without changing fixture outcomes or combat behaviour:

- every settled league or exhibition match receives one impact-based Man of the Match;
- AI-versus-AI league fixtures retain named award winners, compact reports and player performance history;
- a player-club winner earns a one-time `1,500 CR` league award or `750 CR` exhibition award;
- completed league rounds create one Matchday Roundup email rather than one message per rival fixture;
- upcoming-opponent emails combine confirmed results, likely starters, award form and scout-depth interpretation;
- operator profiles gain permanent accolade and achievement timelines;
- **Team > Honours** provides club award leaders and a retained historical record;
- older played fixtures receive a one-time historical backfill.

The guided orientation remains a non-settling demonstration and therefore remains reward-neutral.

## Documentation review

All incoming Markdown files were read before implementation. Historical audits remain unchanged. The current release summary, agent contract, project authority, README, handoff contract and documentation index were updated for Build 12.67.

## Ownership and implementation

### Living-world state

`js/56-world-press-awards.js` owns the additive `careerState.worldPress` structure:

- fixture reports and bounded report order;
- persistent player accolade records;
- club honours history;
- roundup, intelligence, matchday, monthly and seasonal deduplication keys;
- one-time historical-backfill versioning.

The existing save version remains schema 19. `normaliseCareerState()` already retains additive top-level state through its raw-state spread, while `ensureWorldPressState()` validates and bounds the new nested structure after loading.

### Man of the Match

The award score combines rating, eliminations, deaths, assists or trades, headshots, survived rounds, role actions and a small winning-team contribution. This allows support, survival and role impact to defeat a larger raw kill total. Identical match data resolves deterministically through rating, elimination and player-name tie-breakers.

The user-match settlement wrapper captures both teams before the retained league settlement clears active fixture state. It then:

- selects one award winner;
- records the award in the after-action summary;
- adds a permanent operator accolade;
- creates the fixture report;
- pays the player club only when its operator wins;
- adds one `AWARD` finance-ledger entry;
- updates after-action income and net exactly once.

A recorded fixture-report guard makes repeated settlement idempotent. Reloads or repeated callbacks cannot pay the same award again.

### Rival fixtures and careers

The retained league simulator remains the authority for scores and standings. Build 12.67 wraps only newly completed AI fixtures, distributing their existing score outcome into deterministic player-level performances. Rival operator form, morale, happiness, career totals and last-match details then evolve from those performances. Historic AI fixtures are reconstructed for reporting without replaying outcomes or adding historic career totals.

### Press and opposition intelligence

A completed matchday creates one bounded **Matchday Roundup** containing:

- every result and Man of the Match;
- a lead story based on upset or score margin;
- Team of the Week selections;
- the periodic Operator of the Month;
- a top-five table snapshot;
- a note explaining how the public information feeds later preparation.

The upcoming-opponent report is generated at three days or fewer and is deduplicated by fixture. It separates confirmed recent results from tactical interpretation, scales lineup/detail depth with the existing scouting report and includes a clear **What This Means for You** recommendation. It uses the established organic-mail authority and Inbox limits rather than creating a second feed.

### Accolades and club records

Operator profiles now show summary counts and a permanent timeline covering Man of the Match, Team of the Week, monthly/seasonal awards, firsts, appearance/elimination/headshot thresholds, multikill achievements, elite ratings and clean sweeps.

`js/50-ui-menus.js` adds **Team > Honours**. `renderWorldPressClubHonours()` shows all-time Man of the Match leaders and recent history. Leader eligibility derives from retained club-honour entries rather than the active squad, so transferred or released operators remain in the club record book.

### Presentation integration

- `js/35-career.js` adds the award card and finance line to the after-action report and hosts the shared club record renderer.
- `js/36-team-management.js` mounts accolades in contracted operator profiles.
- `js/50-ui-menus.js` owns the Honours route and metadata.
- `css/game.css` owns responsive award, timeline, leader and recent-history presentation.
- `build.py`, `index.html` and `js/00-core.js` identify Build 12.67 and include the new source module.

## Second-pass correction

The first implementation normalised `careerState.worldPress` into a new object on every helper call. Nested accolade operations could therefore retain a stale outer reference: player entries were written through the newer object while sequence and club-honour updates were written to the discarded one. The second pass introduced a `WeakSet` identity guard so each loaded state object is normalised once and then reused. Focused presentation tests subsequently confirmed three populated player records and twelve retained club-history entries, including visible leader rows and recent-history rows.

The same pass added an existing-fixture idempotence guard, a persistence round-trip assertion and a former-player-compatible leader filter.

## Verification

### Living-world integration

The standalone browser integration test seeded one complete 20-club matchday and passed every check:

- `10 / 10` fixtures produced reports;
- every report contained a Man of the Match;
- the expected player-club operator won the controlled test award;
- club credits increased by exactly `1,500 CR`;
- after-action income and net changed from `10,000` to `11,500` exactly once;
- one Matchday Roundup was created;
- player and club histories contained the award;
- repeated settlement produced no second payment, finance change or history row;
- a JSON normalisation round trip retained the fixture report and club honour;
- match-report, player-history and club-history markup all rendered.

The impact-selection unit check selected the higher all-round performer instead of the highest-kill synthetic candidate, preserved exact kill-distribution totals and verified the league/exhibition reward table.

### Upcoming-opponent intelligence

A due fixture produced one **Opposition watch · Northbridge Five** message. A second generation attempt produced no duplicate. The message contained both **RECENT RESULTS — CONFIRMED** and **WHAT THIS MEANS FOR YOU** sections, and no browser page error occurred.

### Responsive presentation

Populated player and club histories were mounted at:

- `320×720` portrait;
- `390×844` portrait;
- `430×932` portrait;
- `844×390` compact landscape;
- `1366×768` desktop.

At every size:

- the Honours panel, three leader rows and twelve recent-history rows rendered;
- the selected player showed four accolade entries and four summary cells;
- no tested card crossed the viewport boundary;
- document horizontal overflow was zero;
- `stateIntegrityForTest()` returned `ok: true`;
- `typographyConsistencyForTest()` returned `ok: true`;
- the topbar remained visible;
- browser page-error capture remained empty.

Visual inspection confirmed readable stacked timelines on mobile and a two-column leaders/history layout on desktop.

### Retained diagnostics and source checks

- `stateIntegrityForTest()` — `ok: true`, zero issues.
- `typographyConsistencyForTest()` — `ok: true` across retained mobile and desktop checks.
- `playerProfileConsolidationForTest()` — `ok: true` with embedded telemetry retained.
- schema-19 round-trip diagnostic completed with the five-player seeded squad intact.
- all `34` source/generated JavaScript files passed `node --check`.
- the standalone release loaded through Chromium with no page errors.

Headless Chromium could not initialise the project's live WebGL renderer with GPU disabled. This is an environment limitation; Build 12.67 does not modify renderer, geometry, combat or live-match visual code, and management/UI validation completed normally.

### Deterministic build

Two consecutive builds produced identical SHA-256 hashes:

- `js/strikewatch.dev.js` — `e64b9dae5b7d31c7cf6876d4dfee0532fe838529952d20031e97ad85ec6d93ee`
- `dist/strikewatch-build-12.67.html` — `5928119060150423487758e15ebdb99682ce4e339c9595bdf60acceffa1d0ae2`

### Release package integrity

The final source archive contains the Build 12.67 source tree and only the current standalone file inside `dist/`. `unzip -t` completed with no compressed-data errors. The copied standalone artifact matched the deterministic build hash above.

## Preserved authorities

Build 12.67 does not change:

- league score generation, schedule construction, table rules or promotion/relegation;
- combat AI, perception, navigation, tactics or live commands;
- weapon, armour, injury or operator balance;
- ordinary match rewards, wages, loans, sponsorship or store prices outside the explicit award payment;
- the non-settling guided orientation contract;
- save schema 19 or diagnostics schema 1;
- Build 12.66 mobile interface clarity and earlier responsive-navigation authorities.
