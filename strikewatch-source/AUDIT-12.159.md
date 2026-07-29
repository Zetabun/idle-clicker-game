# Build 12.159 — Durable Store

Adds IndexedDB as the career save's durable tier, and reports save size and
browser allowance on the configuration page.

## Why this is a tier, not a replacement

The request was to migrate to IndexedDB. What shipped keeps both stores, with
divided jobs, and that difference matters enough to state plainly.

localStorage caps an origin at roughly 5MB shared with everything else the page
keeps, and a career only grows — the test career already measures 290KB.
IndexedDB quota on the same machine reports **5.54GB**, about a thousand times
more. That is the capacity argument, and it is why the durable tier exists.

It cannot simply take over, because **IndexedDB is asynchronous**. Build 12.141
added `pagehide` and `visibilitychange` save checkpoints precisely because
progress was being lost when a tab closed, and those work only because
`localStorage.setItem` completes inside the handler. A transaction opened in a
page-hide handler is not guaranteed to commit before the page goes away.
Converting the save path to async would reintroduce the exact defect 12.141
fixed and 12.158 hardened.

So:

| Tier | Job |
| --- | --- |
| localStorage | Synchronous write-through. Makes unload-time saves land; still the boot read path, because it is the only one that can be read synchronously. |
| IndexedDB | Durable mirror. Holds every committed save, and is the only tier that can still accept a career once localStorage is full. |

`saveSequence`, already maintained since Build 12.134, decides which tier wins
when they disagree. Higher sequence is newer. That is the entire reconcile rule.

## What this changes in practice

### 1. Every verified save is mirrored

`saveCareerState()` is unchanged up to and including its verified synchronous
commit; the mirror runs after it. A mirror failure can therefore only cost
capacity, never the save.

### 2. A career too large for localStorage is no longer lost

Previously a quota rejection produced "PROGRESS IS NOT BEING SAVED" and the
career was gone on close. The catch path now tries the durable tier first.

Tested by making `Storage.prototype.setItem` throw `QuotaExceededError` for the
career keys:

| | Result |
| --- | --- |
| Fast-tier rejections | 2 (primary, then the backup-eviction retry) |
| Save still succeeded | **yes** |
| Primary tier | `localStorage` → `indexedDB` |
| Save sequence | 7 → 8 |
| Save failure recorded | none |
| Durable round-trip | identical bytes |

The manager sees "CAREER SAVED TO DURABLE STORAGE" rather than a data-loss
warning.

### 3. A career evicted from localStorage is recovered

If the browser clears site data from the fast tier but leaves IndexedDB, boot
now adopts the newer mirrored career. Tested by wiping the three localStorage
keys and then booting a genuinely fresh document against the same origin:

| | Result |
| --- | --- |
| Adopted from durable tier | **yes**, sequence 2 |
| Club name recovered | matches exactly |
| Written back to fast tier | yes |

Adoption is guarded three ways: it only fires when the mirrored sequence is
**strictly higher**, only before this session has saved anything of its own, and
only if the mirrored payload parses to an object. Adopting over a career the
manager had already been playing would be the same silent overwrite Build 12.134
set out to prevent — the guard was observed refusing exactly that during
testing.

### 4. The configuration page reports storage

Five new rows on the SAVE & RECOVERY card, measured on every render of that
page:

| Row | Example |
| --- | --- |
| SAVE FILE SIZE | 289.7 KB |
| RECOVERY BACKUP SIZE | 289.7 KB |
| CAREER DATA TOTAL | 579.5 KB |
| BROWSER ALLOWANCE USED | 391.7 KB OF 5.54 GB |
| DURABLE STORAGE | INDEXEDDB ACTIVE |

Sizes are the real UTF-8 encoded byte length, not string length, so a club name
outside ASCII is measured honestly. The allowance figure comes from
`navigator.storage.estimate()`, which is asynchronous, so it reports the last
estimate the browser returned and refreshes on each render. Browsers that do not
implement it show NOT REPORTED BY BROWSER.

## Failure modes handled

- **IndexedDB unavailable** (private browsing, blocked storage): the open is
  rejected, `supported` goes false, and the game runs exactly as 12.158 did on
  localStorage alone. The card reports INDEXEDDB UNAVAILABLE.
- **A second tab upgrading or deleting the database**: `onversionchange` closes
  this session's handle rather than leaving it dead.
- **Mirrored payload corrupt**: adoption refuses on a parse failure and leaves
  the local career alone.

## Checks run

| Check | Result |
| --- | --- |
| `py -3 build.py` | pass |
| Double build, bundle and standalone hashes | **identical** |
| Root `cod.html` vs standalone | **byte-identical** |
| 44 modular files + bundle + standalone inline script parse | **44/44, 1/1** |
| `careerIndexedDbRoundTripForTest()` | ok — mirrored, byte-identical, parses, 296,648 bytes |
| Quota-overflow fallback | save succeeds on the durable tier, no failure recorded |
| Eviction recovery on fresh boot | correct career adopted and restored |
| `storagePressureSaveForTest()` | **pass** |
| `durableMatchSettlementForTest()` | **pass** |
| `staleSaveGuardForTest()` | guard holds — blocked write, stale detected, failure recorded |
| `careerSaveHealthForTest()` | sequence matches stored, no failure, backup updated |
| `careerDataRecoveryForTest()` | current and backup available, schema 19 |
| `weaponInventoryForTest`, `armourSystemForTest`, `firstMatchGuidanceForTest`, `typographyConsistencyForTest`, `workflowIntegrityForTest` | pass |
| `loadoutStillForTest`, `allArenaGeometryIntegrityForTest`, `weaponGeometryIntegrityForTest`, `ar4WeaponModelForTest` | pass |
| Boot reliability, 5 fresh loads per build | 12.158 5/5 (~333ms), 12.159 5/5 (~331ms) |
| Console/runtime errors | none |

Save schema stays **19** — no persisted field changed shape, so no migration is
required. Gameplay, geometry, rendering and match simulation are untouched.

## A note on the preview pane

Top-level navigations in the browser preview pane intermittently stalled before
the bundle finished booting during this work, which looked at first like a boot
regression. It is not: booting each build five times in a fresh iframe gave 5/5
for both 12.158 and 12.159 at the same ~330ms. Run boot-sensitive checks in an
iframe rather than by navigating the pane.

## For anyone extending this

- The save path must stay **synchronous through its verified commit**. The
  durable tier is a mirror and a fallback; do not make `saveCareerState()`
  return a promise, or unload-time checkpoints stop landing.
- `saveSequence` is the only arbiter between tiers. Any new tier must maintain
  it.
- Adoption must never run after this session has written a save of its own.
