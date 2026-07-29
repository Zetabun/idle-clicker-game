# Build 12.158 — Storage-Safe Results

## Reported regression

A real established career completed a match and displayed 18 GC plus the new league result. End Day advanced the live session from Monday to Wednesday. Refresh then restored Monday, 0 GC and the pre-match league table. This proves the reward and league calculations ran, while the complete post-match career never became the durable primary save.

## Root cause

`saveCareerState()` attempted to duplicate the complete existing primary career into `strikewatchCareerBackupV1` before replacing `strikewatchCareerV1`. Mature careers can fit individually while primary plus another full copy exceeds the browser's localStorage quota. When the backup `setItem()` threw, control jumped to the outer failure handler before the primary write. The UI continued from updated memory until reload restored the old durable career.

Build 12.156 protected only the stale-session branch. In a normal single-tab session, its final settlement save still used the backup-first base transaction, so it did not cover this storage-pressure failure.

## Fix

- `careerCommitPrimaryAndBackup()` writes and reads back the new primary first.
- The previous primary is retained in memory and offered to the recovery slot only after the new career is durable.
- If an existing unprotected backup itself blocks the primary, it is removed and the primary write is retried once.
- If backup refresh fails after the primary succeeds, the primary remains authoritative and the manager receives `CAREER SAVED · BACKUP LIMITED`.
- Tiny save-sequence metadata receives the same unprotected-backup eviction fallback so a durable primary is not left with stale metadata.
- Protected backups are never evicted automatically.
- The stale-match wrapper now verifies the displaced newer primary as recovery before any forced overwrite; if that cannot be done, the newer primary is left untouched.

## IndexedDB decision

No IndexedDB migration is included. IndexedDB offers larger practical capacity and transactional object stores, and remains a sensible future persistence project. It is not required to close this defect: the career payload still fits as a primary, and the failure came from requiring a second full localStorage copy before saving it. A migration should be designed separately with dual-write, import/export and rollback coverage rather than rushed into a match-settlement hotfix.

## Verification

- `storagePressureSaveForTest()` reproduces a mature career that can fit once but not twice. It must retain 18 GC, calendar day 2, three league points and a played fixture while reporting a limited backup.
- A second targeted case starts with an old backup that blocks the new primary; the backup is evicted and the 18 GC primary is retained.
- `durableMatchSettlementForTest()` and `staleSaveGuardForTest()` remain required regression gates.
- Every modular JavaScript file and the generated bundle parse.
- Standalone inline JavaScript parses.
- Two consecutive builds are byte-identical.
- Root `cod.html` is byte-identical to the generated standalone.

## Compatibility

Save schema remains 19. Gold Coin values, league scoring, fixture settlement, calendar simulation, combat, renderer, maps and responsive presentation are unchanged.

- Deterministic bundle SHA-256: `d255fe5433af26cdd4218e77cf88e1f0ce1d45c4ded2b562b86a0cfac37f5b91`.
- Deterministic standalone SHA-256: `4a5ebdcc51132db4774457a237361b4cfd3fadf44cc120903624995cb0252597`.
