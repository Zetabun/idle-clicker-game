# Build 12.154 — Batch Reach

Extends static world batching from Citadel to every arena. This is the work
Build 12.146 deferred and Build 12.153 measured the value of.

## The blocker, and what it actually was

`AGENTS.md` had said batching could not be extended until every time-dependent
draw in `drawStaticWorld` was wrapped in `setStaticWorldBatchEligibility()`,
"which currently exists but is never called". Build 12.153 corrected that: the
helper *is* called, in five wrapped regions. Four animated draws were genuinely
unwrapped, and those were the real blocker — batching bakes model matrices, so
anything left eligible would have been frozen at capture time.

A full re-scan of `drawStaticWorld` for frame-varying expressions confirmed the
list is exactly four. Most `Math.sin`/`Math.cos` occurrences in that function are
static placement maths — positions derived from fixed prop data — not animation.
Door state (`ACTIVE_DOOR_STATES`, `openAmount`) was already wrapped.

| Draw | Animation | Now |
| --- | --- | --- |
| Dune lamp glow | `sin(time * 2.2)` on the glow sphere's height | wrapped |
| Dune banner cloth | `sin(time * 1.6)` on banner roll | wrapped |
| Dune torch flame | `sin(time * 8.2)` scaling the flame, plus its halo | wrapped |
| Coolant tank column | `sin(time * 2.0)` on a drawn segment's end point | wrapped |

## A second gate nobody had noticed

Removing `activeArenaId === 'citadel'` from the capture trigger in
`js/63-viewmodel-renderer.js` produced **no batches at all** on the other three
arenas. There was a second, independent citadel check inside `drawMesh()` in
`js/60-renderer-core.js`, deciding per draw whether a mesh was batchable. Both
had to go. Batching now depends only on the draw being opaque and eligible.

Translucent draws stay excluded on purpose: batching merges geometry into one
mesh and blending is order-dependent.

## Correctness

Two properties had to hold. Both were tested against the renderer's own
`?staticBatching=0` switch, which disables batching entirely and provides a
reference render at the same camera and position.

### 1. Batched output matches unbatched output

| View | Pixels differing > 2/255 | Mean delta | p99 | Max |
| --- | --- | --- | --- | --- |
| Citadel @6.5,4.5 | 0.02% | 0.062 | 1 | 16 |
| Citadel @18,12 | 0.04% | 0.036 | 1 | 40 |
| Dune @18,12 | 0.01% | 0.061 | 1 | 12 |
| Dune @8,6 | 0.02% | 0.030 | 1 | 12 |
| Aurora @18,12 | 0.07% | 0.045 | 1 | 25 |
| Skyline Offices @10,12 | 0.00% | 0.157 | 1 | **1** |

99% of pixels differ by at most 1/255 in every view. The Offices view has a
maximum difference of 1 across the entire frame — it contains no animated decor,
so it is the cleanest reading, and it is effectively pixel-identical. The small
residuals elsewhere are the animated decor, which necessarily moved between the
two captures because `time` advanced, plus float precision in the baked
transforms.

### 2. Nothing was frozen

The naive test — capture twice and diff — is useless here, because the fragment
shader's own `uTime` flicker modulates almost every pixel, so 94–100% of the
frame changes between any two captures whether decor animates or not.

The test that works: take the pixels the **unbatched** build animates strongly
(delta > 30 between two captures 620ms apart) and ask how much the **batched**
build animates those same pixels. A frozen element would show near-zero motion
there.

| View | Strongly animated pixels | Unbatched mean motion | Batched mean motion | Parity |
| --- | --- | --- | --- | --- |
| Dune @8,6 | 335,679 | 83.7 | 83.7 | **100%** |
| Dune @18,12 | 640,355 | 74.2 | 74.2 | **100%** |
| Citadel @18,12 | 283,075 | 58.1 | 58.1 | **100%** |

Exact parity on all three. Nothing stopped moving.

### 3. Batches follow the arena

Batching bakes geometry, so a stale batch surviving an arena change would draw
the wrong arena. Switching through citadel → dune → aurora → office → dune →
citadel and reading the batch count each time:

| Arena | Batch draws | Floor tiles | Wall rects |
| --- | --- | --- | --- |
| Citadel | 125 | 344 | 58 |
| Dune Bastion | 137 | 224 | 30 |
| Aurora Terminal | 57 | 247 | 36 |
| Skyline Offices | 144 | 364 | 78 |

Every value tracked the arena, including on the return visits.
`setActiveArena()` calls `buildWorldBatches()`, which calls
`resetStaticWorldGpuBatches()`, so the previous arena's batches are deleted
before the next capture.

## Result

Draw calls, batching off versus on, same camera and position. For Dune, Aurora
and Offices the "off" column is what 12.153 shipped; Citadel was already batched
and is unchanged by this build.

| View | Unbatched | Batched | Reduction |
| --- | --- | --- | --- |
| Citadel @6.5,4.5 | 3,483 | 714 | **79.5%** |
| Citadel @18,12 | 1,305 | 348 | **73.3%** |
| **Dune @18,12** | 924 | 387 | **58.1%** |
| **Dune @8,6** | 1,775 | 546 | **69.2%** |
| **Aurora @18,12** | 716 | 178 | **75.1%** |
| **Skyline Offices @10,12** | 2,199 | 820 | **62.7%** |

Between 58% and 75% fewer draw calls on the three arenas that had never been
batched. That repays Build 12.153's floor-shading cost — which was 7–9% on those
same arenas — many times over, which was the argument for doing this work.

Note that batched geometry is drawn unconditionally: `drawStaticWorldGpuBatches()`
does not cull, which is why the batch-draw count is constant per arena
regardless of view. That is the pre-existing design and the trade is heavily
favourable at these ratios.

## Checks run

| Check | Result |
| --- | --- |
| `py -3 build.py` | pass |
| Double build, bundle and standalone hashes | **identical** |
| Root `cod.html` vs standalone | **byte-identical** |
| 41 modular files + bundle + standalone inline script parse | **41/41, 1/1** |
| Batched vs unbatched render, six views | faithful; p99 = 1/255 everywhere, Offices max 1 |
| Animation parity, three views | **100%** on all strongly animated pixels |
| Batch/arena tracking through six switches | correct every time |
| `allArenaGeometryIntegrityForTest()` | pass |
| `arenaGeometryIntegrityForTest()` per arena | pass on all four |
| `auroraTerminalAuditForTest()`, `arenaSurfaceSampleForTest()`, `operatorViewOcclusionForTest()` | pass |
| `staticOcclusionForTest()` | ok on all four, quantisation budget intact, floor still shaded |
| Navigation graphs, all four arenas | **identical to 12.153** — citadel 502/2160/1, dune 494/2752/1, aurora 540/2552/5, office 464/1948/1 |
| Console/runtime errors | none |

Aurora reporting 5 navigation components is unchanged from 12.153 and every
earlier build; it is not introduced here, but it is worth a look on its own.

Collision, navigation, line of sight, gameplay, saves and match simulation are
untouched. This build changes only which draws are merged before submission.

## Rule for anyone adding decor

Any draw inside `drawStaticWorld` whose transform, colour or scale depends on
`time`, on door state, or on anything else that changes between frames **must**
be wrapped in `setStaticWorldBatchEligibility(false)` / restore. Batching is now
on for every arena, so an unwrapped animated draw will be baked at capture and
frozen for the rest of the session. The four in the table above are the pattern
to copy.
