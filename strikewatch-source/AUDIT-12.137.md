# Build 12.137 — Kept Rewards audit

## Scope

A weapon awarded by a victory crate was reported missing. This is a different
defect from the Gold Coin report investigated in Build 12.134, and the
durability work done there does **not** cover it.

## Why 12.134 did not cover this

Build 12.134 hardened `saveCareerState`: writes are sequenced so a stale second
session cannot overwrite newer progress, and every write is read back before
being treated as durable. Both protect data that reaches the save.

The victory crate never reached the save. `careerCrateState` is a module
variable, not part of `careerState`, and `queueCareerCrate` only wrote to it.
The reward existed solely in memory between the final round and the moment the
manager clicked through the reveal. Closing the tab, refreshing, or navigating
away before claiming destroyed the weapon permanently, and no save-durability
guarantee can help with a value that is never written.

The paid store crate was already persisted as `careerState.pendingStoreCrate`,
precisely because losing a purchased crate would lose the manager's Gold Coins.
The free match crate had no equivalent.

### Reproduction

`matchCrateDurabilityForTest()` completes a real winning match and compares the
in-memory award against what a fresh `loadCareerState()` would see:

| | Before |
| --- | --- |
| Crate queued in memory | `weapon: service-p12` |
| Persisted pending match crate | `null` |
| Persisted inventory | unchanged |
| Survives reload | **no** |

## Fix

The reward is now rolled and banked to the career save *before* the overlay is
shown, mirroring the store crate:

- `careerState.pendingMatchCrate` added to the default state and to
  `normaliseCareerState` (id, reward, awardedMatch), defaulting to `null`.
- `queueCareerCrate` writes the record and calls `saveCareerState()` at the
  moment the crate is awarded, rather than only setting module state.
- `queuePendingMatchCrate()` re-offers an unclaimed crate. It is driven from the
  menu update loop and held back while the after-action report is on screen, so
  an interrupted reward still arrives in its normal place in the flow.
- `claimCareerCrate` clears `pendingMatchCrate` for match-sourced crates, as it
  already did for `pendingStoreCrate`, so a crate can never be granted twice.

The field is additive with a `null` default and needs no migration, so the save
schema stays at 19. Older builds ignore the field; this build treats its absence
as "no pending crate".

## Verification

`matchCrateLifecycleForTest()` drives award → interruption → restore → claim:

| Stage | Result |
| --- | --- |
| Awarded | `weapon: service-p12` |
| Persisted on award | yes |
| Restored after simulated interruption | yes |
| Reward survived intact | yes (same id) |
| Claimed into inventory | `[scrap-p12]` → `[scrap-p12, service-p12]` |
| Pending cleared in memory and save | yes |
| Re-offered after claim | no |

`matchCrateDurabilityForTest()` now reports `survivesReload: true` with the
persisted reward matching the queued one.

### Regressions

| Check | Result |
| --- | --- |
| Store crate purchase and queue | ok, balance 200 → 140, pending set, source `store` |
| Gold ledger integrity | 0 mismatches |
| Stale-save guard | refuses stale write, accepts forced |
| League orphan recovery | result recorded |
| League normal settlement | mode `league` |
| Decision rotation (120 days) | 0 repeats |
| Recommended-plan warning | intact |
| Compact audit at 390px | 0 overlapping, 0 collapsed, 0 overflow, 0 undersized targets |

## Gates

- `py -3 build.py` succeeds; two consecutive builds byte-identical.
- Title, `window.__STRIKEWATCH_BUILD__` and both visible labels resolve to
  12.137 / `12.137.0-kept-rewards`.
- No console errors.
- Root `cod.html` byte-identical to `dist/strikewatch-build-12.137.html`.
- `scrollWidth === clientWidth` at 390.

## Known limitation

This fix protects crates awarded from Build 12.137 onward. A crate lost by an
earlier build was never written to storage, so there is no record of it to
recover — the weapon cannot be restored retroactively.
