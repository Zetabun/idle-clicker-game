# Build 12.81 Audit — Persistent Club Infrastructure

## Scope

- Added a persistent **Club Infrastructure** route inside the existing Club department rather than creating a disconnected management screen.
- Added six connected branches: Training, Scouting, Medical & Recovery, Youth Academy, Analysis and Commercial & Supporters.
- Added four sequential levels per branch, one active construction queue, Club Cash costs, simulated build times and irreversible capacity use.
- Added division-based permanent capacity of 8 / 10 / 12 / 14 slots against a 24-level complete tree, ensuring long-term specialisation even in the top division.
- Connected completed levels to existing training progress, recruitment report quality and assignment throughput, fatigue/injury systems, academy intakes, player XP, opposition reports, sponsorship values, match income and positive supporter growth.
- Added club-developed academy prospects to the established recruitment and transfer flows with no transfer fee, protected availability and club-derived scouting knowledge.
- Added infrastructure status to the Club overview, contextual help, progressive route access and the existing finance ledger.
- Save schema 19 and diagnostics schema 1 remain unchanged.

## Progression rules

- Funding a project removes the full cost from Club Cash immediately and reserves one permanent capacity slot.
- Only one project can be under construction at a time.
- Construction advances through the existing End Day calendar.
- Completed levels cannot be cancelled, downgraded, refunded or reassigned.
- Promotion expands available capacity; relegation does not remove completed facilities, but an over-capacity club cannot approve more work until it regains capacity.
- The complete tree cannot be maximised: top-division capacity is 14 while the tree contains 24 levels.

## Verification executed

- Read the current release and retained authority Markdown files before implementation.
- `python3 -m py_compile build.py` passed.
- Every modular JavaScript file and the generated bundle passed `node --check`.
- `python3 build.py` rebuilt `js/strikewatch.dev.js` and `dist/strikewatch-build-12.81.html` successfully.
- Two consecutive builds produced identical SHA-256 hashes:
  - `js/strikewatch.dev.js`: `f2fbd3bd3d5a35ae88772cc8e7a7347a241abc41c76df151bfe851f880a2dd97`
  - `dist/strikewatch-build-12.81.html`: `c5c3af9ca264624a5e7da5acb0bf8cc8400b6745a78ee216fc267c8363036ac2`
  - `css/game.css`: `76911100cd8bb1475f9fa93dc4a88d2d107f7abfe68b4fd01ee7893813a3568d`
  - `index.html`: `0ae0f6cffc8c25b92b4e3df5e46f7f91f7d5025b31780cffd6d913778119a2ea`
- Headless Chromium checks passed at `390x844`, `844x390`, `1024x768` and `1366x768` with six branch cards, zero document-level horizontal overflow and no page errors.
- UI interaction checks confirmed the two-stage **Plan / Confirm Project** flow, immediate 60,000 CR deduction for Training Level 1, a matching `INFRASTRUCTURE` finance-ledger entry, one active project maximum, disabled competing projects and no project cancellation/refund/respec control.
- Project completion checks confirmed persistent level progression and the expected Training Level 1 multiplier of `1.06` through both the facility accessor and the existing training authority.
- Capacity checks completed eight Division 3 levels, then correctly rejected a ninth project. Capacity mapping verified 8 / 10 / 12 / 14 slots for division tiers 3 / 2 / 1 / 0.
- Academy checks produced a club-developed prospect with potential at or above the Level 1 floor, a zero transfer fee, an open registration path outside the normal transfer window and a negotiation that kept both asking and offered transfer fees at zero.
- Older/partial infrastructure-state normalisation clamped invalid levels, filled missing branches and discarded an invalid active project.

## Second-pass corrections

The regression pass caught and corrected three implementation issues before packaging:

1. Repeated state normalisation initially replaced the infrastructure object while a project function still held an older reference. The accessor now normalises the same persistent object in place.
2. Project completion initially wrote a level to a superseded nested `levels` object. Completion now resolves the current level first and then writes to the live state.
3. Infrastructure sections initially retained a desktop intrinsic width inside the mobile grid workspace. Explicit section width ownership now contains every panel and branch card to the mobile management column.

The same pass also ensured academy prospects remain genuinely fee-free inside the existing negotiation system rather than inheriting the normal minimum transfer fee.

## Test limitation

Automated checks cover state progression, capacity, academy integration, transfer terms, responsive containment and rendered interaction. They do not replace a subjective multi-season balance review on physical devices.
