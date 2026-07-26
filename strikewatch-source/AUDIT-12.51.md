# Strikewatch Build 12.51 Audit — Living Market & Organic Mail

## Scope

Replace the periodically regenerated static recruitment pool with a persistent league-aware market, make AI recruitment respond to squad context, and extend the existing email presentation to support long organic correspondence generated from real career events.

## Transfer market implementation

- Added `js/39-dynamic-market-mail.js` and inserted it after the existing recruitment/transfer authorities.
- New entrants are generated with unique names across the user squad, market and rival rosters.
- Entry routes include academy graduate, free agent, club release, transfer listing and lower-division breakout.
- Tier mixtures permit current-division candidates and selected weaker-pool breakthroughs only. Locked stronger divisions are never generated.
- Player origin, source club/tier, listing day, expiry, reason, demand, previous fee and price trend persist through `normaliseGeneratedPlayer()`.
- Market listings expire unless protected by a shortlist, rival bid or active negotiation. Vacancies are replenished intelligently to the established 18-player market size.
- Asking prices update from demand, shortlist attention, rival talks, form, free-agent status and time listed.
- Rival clubs derive a priority role from actual roster deficits and tactical templates, then filter targets through persistent transfer and wage budgets.
- Completed AI signings affect those budgets and persist in rival rosters up to `TEAM_MAX_SQUAD`.
- The paid recruitment search now rotates up to three low-priority listings instead of deleting the entire market. Shortlisted players, live rival bids and active negotiations are protected.

## Organic correspondence implementation

- `clubAddMail()` now retains up to 6,000 body characters and optional custom sender, preview, organic and story metadata.
- `clubAddOrganicMail()` creates structured long-form messages without replacing the established inbox or popup presentation.
- Market intelligence digests report actual new availability, rival activity, price movement, current squad needs, cash and wage headroom.
- Completed user transfers create a generated signing dossier containing origin, player profile, agreement, squad effect and finances.
- League result mail is expanded with the current score, table position, saved Match Story highlights and next opponent.
- The inbox reader and full email popup have bounded independent scrolling at phone, desktop and short-landscape sizes.

## Invariants

- Negotiation scoring, transfer windows, player costs, wage-budget enforcement, squad limits, scouting uncertainty and recruitment-comparison authority remain unchanged.
- Existing static administrative messages remain valid; organic messages supplement or enrich them when simulation evidence exists.
- Combat, AI combat behaviour, match results, rewards and progression are unchanged.
- Save schema remains 19 and diagnostics schema remains 1.

## Verification

- `dynamicTransferMarketForTest()` verifies unique generation, current-or-lower tier safety, stronger average quality in higher divisions, origin metadata, role-needs targeting, shortlist-safe commissioned searches, persistent six-plus-player rival rosters, long-mail preservation, organic sender/preview metadata, state round-trip, UI context and scroll-ready readers.
- Retained recruitment role guide, recruitment decision support, comparison interaction, progressive interface, first-match payoff and matchday-story tests pass.
- Recruitment and inbox pages remain horizontally contained at 320, 375, 390 and 430px portrait and 844×390 landscape.
- Edited modules and the rebuilt bundle pass JavaScript syntax validation.

## Documentation audit

- Read and validated every Markdown file in the package. Historical `AUDIT-*` files remain unchanged as release records rather than being rewritten to describe the current build.
- Corrected stale current-release labels, output filenames and the current source tree in `00-READ-FIRST-GPT.md`, `AGENTS.md`, `PROJECT.md` and `README.md`.
- Added `DOCUMENTATION-INDEX.md` to identify the current authority documents, the current audit, historical audits and the exact Build 12.51 output filenames.
- Documentation-only maintenance does not change gameplay, generated JavaScript, save schema or diagnostics schema.
