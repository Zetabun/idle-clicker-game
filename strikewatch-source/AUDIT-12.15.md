# Build 12.15 Audit — Armour Loadout & Penetration

## Scope

Implemented a balanced per-player armour economy, loadout, combat, presentation and onboarding system while retaining Build 12.14 weapon attachment integrity and all earlier AI, tactical, map and runtime work.

## Player-facing behaviour

- Four CR-purchased torso rigs: Scout Weave, Response Carrier, Guardian Plate and Bastion Heavy.
- One purchased copy equips one player; `NO ARMOUR` remains an unlimited option.
- Team Armoury shows each operator's weapon and armour, owned/equipped copy counts, protection, rating, integrity, movement/handling costs, role fit and a persistent four-step beginner guide.
- Supply Depot explains torso coverage, graded penetration, weight and permanent breakage before purchase.
- HUD shows the viewed operator's current armour integrity. Living and dead operator silhouettes visibly distinguish unarmoured, light, medium-flex, medium and heavy rigs.

## Combat and economy

- Operator resilience modifies incoming damage first. Armour then protects torso hits only; headshots bypass it completely.
- Protection is graded by weapon penetration versus armour rating and capped so no vest grants immunity.
- Armour loses integrity as it absorbs or contests hits. Partial integrity is restored when the next round reapplies the surviving loadout.
- Reaching zero immediately marks the rig broken. An owned copy is removed from `armourInventory`, the player is set to `none`, and that copy cannot return in the following round. Buying a replacement does not auto-equip it.
- Match tracking preserves the armour used at match start even when the item breaks and the persistent player loadout becomes unarmoured.
- Protection has bounded movement, handling and post-match fatigue costs. Purchases debit CR and enter the finance ledger.

## Persistence and diagnostics

- Career save schema advanced from 17 to 18. Schema-17 and older careers migrate with an empty armour inventory and unarmoured players rather than receiving free equipment.
- Finite-copy normalisation prevents more player assignments than owned copies.
- Career round-trip diagnostics retain `armourInventory` and every player's `equippedArmourId`.
- Diagnostics schema remains 1 and adds optional armour identity, weapon penetration, integrity, absorption, integrity loss, zone totals and `armour_broken` events.

## Automated verification

- All modular, generated-bundle and standalone inline JavaScript passed syntax checks.
- `armourSystemForTest()` passed: P12 absorption exceeded AR-4 absorption against Bastion Heavy; headshots bypassed; heavy movement was slower than light; one-copy assignment was enforced; partial Guardian integrity was restored between rounds; and a zero-integrity owned Scout copy was removed, unequipped and remained absent from the next-round profile.
- Mixed five-player mapping passed for Scout Weave, Response Carrier, Guardian Plate, Bastion Heavy and no armour. Opposition profiles also mapped correctly.
- A second purchased Scout copy could be assigned to the previously unarmoured fifth operator while the first copy remained assigned elsewhere. Schema-18 round-trip output retained both copies and all five armour assignments.
- Supply Depot rendered four purchase cards plus one guide. Team Armoury rendered five armour choices, five player rows and one persistent guide.
- Document-level width remained contained at 320, 375, 390 and 430-pixel portrait plus 844 × 390 landscape on both Store and Loadout routes.
- A 60-second fixed-step combat simulation produced matching elimination/death events, live absorption and integrity loss, correct armour/loadout mapping and zero runtime faults. Separate deterministic breakage coverage generated `armour_broken`, removed the finite copy and verified it remained absent next round.
- A forced three-round match reached `match_finished`, generated last-match armour fields for all five starters and completed the report flow without runtime faults.
- Retained target acquisition, close-threat retargeting, friendly-body sight/fire blocking, AI work budgets, team spacing, procedural animation, adaptive quality, weapon attachment/loadout mapping, Dune engagement/navigation and all checked Office geometry/rotation/walkway/door audits passed.
- Dune navigation benchmark: 160 successes, zero failures, one connected 494-node/2,752-edge graph.
- Two consecutive builds were byte-identical, and the extracted release ZIP rebuilt to the same generated outputs.

## Release limitations

Headless Chromium did not provide a dependable hardware WebGL context. Authoritative model profiles, geometry mappings and runtime transforms were tested, but final lighting and depth appearance should still be glanced at on a real iPhone.
