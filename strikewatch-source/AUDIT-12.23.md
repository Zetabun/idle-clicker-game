# Strikewatch Build 12.23 Audit — Supply Purchase Confirmation

## Scope

Build 12.23 fixes the direct Supply Depot purchase feedback loop. It does not change weapon or armour prices, combat values, crate odds, inventory assignment rules, finance calculations, AI, maps, career save schema 19 or diagnostics schema 1.

## Reproduced defect

In Build 12.22, clicking the AR-4 purchase button correctly deducted 58,000 CR and added one finite inventory copy, but the open store route did not re-render. The visible card therefore continued to show `OWNED 0`, the button remained available, and repeated clicks could buy additional copies without clear confirmation.

## Implementation

- Added transient, non-persistent Supply Depot purchase feedback in `js/38-development.js`.
- Successful weapon and armour purchases now immediately refresh the active store route while preserving its scroll position.
- Store cards expose a live receipt showing the purchased item, updated owned-copy count and remaining cash.
- The replacement button is disabled for 0.9 seconds and reads `PURCHASED · OWNED N`.
- After the lock expires, deliberate repeat purchases remain available through an explicit `BUY ANOTHER` action.
- Queued or rapid repeat clicks during the lock do not deduct cash or add inventory.
- Added `cashWeaponPurchaseFeedbackForTest()` and expanded `cashWeaponStoreForTest()` coverage for copy counters and feedback regions.

## Completed verification

- A real delegated AR-4 store click changed owned copies from 0 to 1 and cash from 350,000 CR to 292,000 CR: exactly one 58,000 CR deduction.
- The refreshed card immediately displayed `OWNED COPIES 1`, an inline `AR-4 SENTINEL ADDED TO CLUB ARMOURY` receipt and `PURCHASED · OWNED 1` on a disabled button.
- A forced repeat click during the lock changed neither cash nor inventory.
- After approximately 0.9 seconds the action changed to `BUY ANOTHER · 58,000 CR`; a later deliberate click successfully created a second copy.
- Store scroll position remained stable in the direct DOM-click regression (`500` before and `500` after refresh).
- The purchase-confirmation state fit without horizontal overflow at 320×720, 375×812, 390×844, 430×932 and 844×390.
- `cashWeaponStoreForTest()`, `cashWeaponPurchaseFeedbackForTest()`, `ar4WeaponModelForTest()`, `weaponSlotSystemForTest()`, `weaponRoleBalanceForTest()`, `weaponSwitchingForTest()`, `stateIntegrityForTest()`, `armourSystemForTest()`, `operatorWeaponAttachmentForTest()`, `reloadCoverBehaviourForTest()`, `hitReactionFlinchForTest()`, `duneBastionAuditForTest()`, `teamSpacingForTest()` and `operatorPresentationForTest()` passed.
- Runtime-fault capture remained empty and no page exceptions occurred. The headless browser still did not expose WebGL; this is an environment limitation and does not affect the CSS 3D store-card verification.
- Every modular/generated JavaScript file and the extracted standalone inline script passed syntax checking; `build.py` passed `py_compile`.
- Two consecutive builds were byte-identical: bundle SHA-256 `0901239edb587fcbd05c99a3d3ad19a09cd5c7e6237abd3e4eaf724033923647`; standalone SHA-256 `547eb92ebb72ca02bff794304663089e0eae554677d049d4c145ecd7da320bf3`.
- ZIP integrity passed, and a clean extracted source archive rebuilt byte-for-byte into the delivered standalone HTML.
