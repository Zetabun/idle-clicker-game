# Strikewatch Build 12.17 Audit — Primary & Sidearm Clarity

## Scope

Build 12.17 separates primary weapons from sidearms, gives pistols a permanent tactical role, adds physical and operational costs to the AR-4, improves weapon-comparison copy, exposes armour integrity beside HP, and records weapon switching in diagnostics and post-match data. It preserves Build 12.16 match-long armour attrition and all retained Build 12.08–12.15 systems.

## Implementation summary

- Career save schema advanced from 18 to 19.
- Players persist `equippedPrimaryWeaponId` and `equippedSidearmId`; `equippedWeaponId` remains compatibility active state.
- Legacy pistol loadouts migrate to sidearm-only. Legacy rifle loadouts retain the primary and receive a starter Scrapline sidearm.
- Weapon-copy assignment and normalisation count both slots.
- AR-4: 5.5% movement cost, turn/moving-accuracy/sprint-settle penalties, 2.2 fatigue load, 2.08-second reload and larger noise radius.
- Pistols: no movement cost, faster switch/handling and lower fatigue, with range, magazine and penetration limitations.
- AI maintains independent primary/sidearm magazines and reserves, uses timed switching, and records `weapon_switched` with a readable reason.
- Armoury and CR store display slot, effective range, damage, magazine, penetration, movement cost, description, benefits and limitations.
- Spectator HUD displays current/max armour integrity with HP; portrait telemetry includes the armour number.
- Match tracking and diagnostics include primary/sidearm IDs, `weaponSwitches` and `sidearmDraws`; debriefs surface sidearm use.

## Automated validation

- All modular JavaScript files passed `node --check`.
- Generated `js/strikewatch.dev.js` and standalone inline JavaScript passed syntax checks.
- `weaponSlotSystemForTest()` passed schema-19 pistol/rifle migration and finite-copy assignment.
- `weaponRoleBalanceForTest()` passed for all four player weapons with explicit benefits and drawbacks.
- `weaponSwitchingForTest()` passed: close emergency drew the sidearm and longer range restored the primary.
- `spectatorArmourHudForTest()` passed at 56/112 integrity and correctly hid the bar for an unarmoured operator.
- `operatorWeaponAttachmentForTest()` and mixed `operatorWeaponLoadoutMappingForTest()` passed.
- `armourSystemForTest()` and `armourMatchAttritionForTest()` passed.
- AI work budget, one-search combat routing, tactic-aware spacing, staggered acquisition, close-threat retargeting, line blocker and body-occlusion tests passed.
- Dune Bastion and engagement-plan audits passed.
- Dune navigation benchmark: 160 successes, zero failures, one 494-node/2,752-edge graph component.
- Office courtyard, furniture-clearance, walkway, door-pocket and screen audits passed.
- A live 60-second Dune simulation produced seven eliminations and seven matching `eliminated` events, correct mixed loadout mapping and zero runtime/page faults. A separate live run recorded two weapon switches, including one sidearm draw and return.
- A forced completed match retained schema-19 state and primary/sidearm identities in all five player reports.
- 320, 375, 402 and 430 portrait widths plus 844×390 landscape had no document-level horizontal overflow on loadout/store routes.

## Limitations

Headless Chromium did not provide a dependable real WebGL presentation context. Geometry, mapping, DOM, simulation and state tests passed, but final lighting and depth appearance should still receive a normal-device visual check.

## Release outputs

- `dist/strikewatch-build-12.17.html`
- `strikewatch-source-12.17.zip`
