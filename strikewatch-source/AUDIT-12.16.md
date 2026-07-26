# Build 12.16 Audit — Match-Long Armour Attrition

## Scope

Changed armour servicing from between-round restoration to match-long integrity while retaining Build 12.15 equipment ownership, penetration, breakage, movement and fatigue balance.

## Player-facing behaviour

- A surviving armour rig keeps its exact remaining integrity through every round of the current match.
- Starting a new match automatically services surviving owned and simulated armour back to full. There is no manual repair screen.
- Zero-integrity owned armour remains permanently destroyed, removed from inventory and unequipped. Destroyed opposition armour also remains absent for later rounds of that match.
- Supply Depot and Team Armoury guidance now explicitly distinguish round persistence, between-match servicing and permanent breakage.

## Implementation

- `Bot.reset()` captures match armour state before rebuilding ordinary combat profiles and restores the carried integrity only when the same rig remains equipped.
- `captureMatchArmourState()` and `restoreMatchArmourState()` preserve ID, integrity, broken state and cumulative absorbed damage without persisting temporary condition into career saves.
- Simulated operators use `matchArmourCarry` to resolve a previously destroyed rig to `none` on subsequent rounds. New matches create fresh bots, which intentionally restores surviving equipment.
- Career save schema remains 18 and diagnostics schema remains 1.

## Verification

- `armourSystemForTest().ok === true`: penetration, headshot bypass, movement trade-offs, finite assignment, permanent owned breakage and match-long attrition all passed.
- `armourMatchAttritionForTest().ok === true`: Guardian Plate at 17 integrity entered round two at 17, returned to 112 only after a new match, and a destroyed opposition Bastion rig entered the next round as `none` with zero integrity.
- Target acquisition, close-threat retargeting, friendly-body sight/fire blocking, AI work budgets, route budgeting, tactical spacing and weapon attachment tests passed.
- Dune Bastion and engagement-plan audits passed; navigation benchmark completed 160/160 routes with zero failures on the 494-node/2,752-edge graph.
- State integrity reported zero issues. Corpse and first-elimination visual tests remained unavailable under headless WebGL, with no unrelated runtime fault.
- Modular, generated-bundle and standalone JavaScript syntax passed. Two consecutive builds were byte-identical, mobile Store/Loadout layouts stayed within 320px portrait and 844x390 landscape, and the extracted release archive rebuilt to identical generated outputs.
