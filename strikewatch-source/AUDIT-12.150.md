# Build 12.150 — Grip Tang

## Reported problems

On the Viper 9: the trigger looks wrong, and the handle looks disconnected.

Both were real, and both were invisible to the existing gates.

## 1. The handle looked detached

`weaponGeometryIntegrityForTest()` reported one component for every sidearm, so
the parts genuinely overlapped. But a raked grip meets the **horizontal**
underside of the frame at an angle, which leaves a wedge-shaped gap opening
along one side of the joint. The audit measures topological connection, not
whether a junction reads as solid — so a visibly detached handle passes it.

The rake introduced in Build 12.149 is what exposed this. At the old near-zero
angles the wedge was too narrow to see.

### Change

`addGripAssembly()` now emits a `grip-tang` at the grip's rotated top, sized to
the grip's width and depth and carrying **half** the rake, so it transitions
between the horizontal frame and the angled grip and fills the wedge from both
sides. This is what the grip tang of a real frame does.

Because it lives in the shared assembly, every sidearm received it: part counts
rose by one on `scrap-p12` (32 → 33), `service-p12` (19 → 20) and `viper-9`
(21 → 24, which also gained the guard pieces below).

## 2. The trigger hung below its own guard

On `viper-9` the trigger was authored as `y: 39, h: 32` — spanning y 23 to 55 —
while its trigger guard was a single bar at `y: 27, h: 11`, spanning 21.5 to
32.5. The trigger therefore passed straight through the guard bar and projected
**22 units below it**, which is the odd shape in the capture.

### Change

- `viper-9` gets the three-piece guard used by `scrap-p12`: front strap, bottom
  bow and rear post, forming a real enclosed bow.
- Its trigger drops to `h: 20` at `y: 28`, spanning 18 to 38, seated inside the
  bow opening rather than hanging out of it.
- `scrap-p12`'s trigger was also reaching the bottom of its bow (spanning 20 to
  48 against a bow at 38.5 to 49.5) and is shortened to span 20 to 40.

## Verification

- `weaponGeometryIntegrityForTest()` passes with all eight model/context
  samples at **one component** and magazine base gap 0:

| Model | Parts | Components (world / viewmodel) |
| --- | --- | --- |
| scrap-p12 | 33 | 1 / 1 |
| service-p12 | 20 | 1 / 1 |
| viper-9 | 24 | 1 / 1 |
| ar4-sentinel | 58 | 1 / 1 |

- The armoury inspector confirms `grip-tang` and `trigger-guard-bow` present on
  the rendered rig.
- `ar4WeaponModelForTest`, `weaponSlotSystemForTest`,
  `weaponRoleBalanceForTest`, `weaponSwitchingForTest`,
  `crateAttachmentForTest`, `armour3dPresentationForTest`,
  `stateIntegrityForTest`, `typographyConsistencyForTest`,
  `firstMatchGuidanceForTest`, `leagueMatchFlowForTest`,
  `matchPlanPersistenceForTest` and all-arena geometry integrity all pass.
- All 41 modular files, the generated bundle and the standalone inline script
  parse.

Model geometry only. Weapon statistics, ranges, penetration and handling are
untouched.

## What this says about the gate

Three consecutive weapon builds have now produced a fault the automated audit
could not see:

- 12.148 — a genuine break the audit **did** catch, invisible in a still render.
- 12.149 — an inverted rake the audit passed, because a backwards grip is still
  a connected grip.
- 12.150 — a wedge gap the audit passed, because overlapping parts can still
  read as detached.

`weaponGeometryIntegrityForTest()` is necessary and has earned its place, but it
only answers "is this one solid". It cannot answer "does this look right", and
the reporter's eye has been the faster instrument for the second question every
time. Weapon geometry changes should continue to be reviewed against a capture,
not signed off on a green audit alone.
