# Strikewatch Build 12.69 Audit

## Release

- **Build:** 12.69 — Guided Navigation & Advice Routing
- **Build ID:** `12.69.0-guided-navigation-advice-routing`
- **Source:** `strikewatch-source-12.69/`
- **Standalone:** `dist/strikewatch-build-12.69.html`
- **Save schema:** 19, unchanged
- **Diagnostics schema:** 1, unchanged

## Scope

This release addresses two navigation failures reported in the first-session management flow:

1. Starting a recruitment negotiation opened Transfers but did not move far enough down the page to reveal the active negotiation card when the First Match Journey panel and transfer-page introduction remained above it.
2. A Tactics Manager Options control used the generic label **REVIEW** and routed back to the Tactics page that already contained the same opposition report, resetting the page to the report and creating an apparent recursive loop.

All Markdown files in the supplied source archive were read before implementation. Gameplay, transfer prices, wages, contract values, tactical effects, opponent analysis, match simulation, economy and persistence were outside scope.

## Root cause

### Incoming negotiation arrival

`startIncomingTransferNegotiation()` created the active deal and called `setMenuRoute('transfers')`, but it did not request an arrival target after the route rendered. The route reset its scroll position to the top, leaving the active negotiation card below the First Match Journey and transfer-page content.

The negotiation markup already exposed a stable `data-management-target-id="transfer:<deal id>"`; the shared guided-scroll helper only searched `data-guide-target`, so the existing management target could not be reused directly.

### Manager Options loop

Opposition advice rendered every destination as a generic route button ending in **REVIEW →**. The Tactics route prepends the opposition report above the actionable match-plan controls. Selecting tactics advice while already on Tactics therefore rerendered the same route at scroll position zero and returned the player to the same Manager Options control.

The Active Five and squad-loadout sections also had no stable management target IDs for destination-specific advice arrival.

## Implementation

### Shared guided arrival

`js/50-ui-menus.js` now allows `scrollMenuGuideTargetIntoView()` to resolve either:

- `[data-guide-target="..."]`; or
- `[data-management-target-id="..."]`.

It retains its request and expected-route guards, keeps scrolling inside the management content scroller, honours smooth/automatic behaviour and now explicitly accepts start or centre placement.

### Negotiation arrival

`js/39-transfers.js` now:

- preserves the existing negotiation-state creation and save order;
- routes to Transfers through the existing route authority;
- derives the active target as `transfer:<deal id>`; and
- requests a smooth start-aligned arrival after the route renders.

No offer amount is changed or submitted automatically.

### Actionable Manager Options

`js/39-opposition-intelligence.js` now maps advice routes to explicit destinations and labels:

- Tactics → `tactics:opponent-preparation` → **OPEN MATCH PLAN**;
- Operators → `operators:active-five` → **OPEN ACTIVE FIVE**;
- Loadout → `loadout:squad-overview` → **OPEN LOADOUTS**.

`js/36-team-management.js` exposes the Active Five target and `js/35-career.js` exposes the squad-loadout target. The controls remain advisory navigation only; they do not apply a tactic, choose a player, change equipment or grant a hidden modifier.

## Browser verification

The generated standalone release was exercised in headless Chromium using deterministic seeded careers at four supported viewports:

| Viewport | Negotiation target offset | Tactics target offset | Result |
| --- | ---: | ---: | --- |
| 390 × 844 portrait | 124.23 px | 124.11 px | Pass |
| 430 × 932 portrait | 124.11 px | 123.73 px | Pass |
| 844 × 390 compact landscape | 83.80 px | 84.64 px | Pass |
| 1366 × 768 desktop | 124.05 px | 124.02 px | Pass |

At every viewport:

- the First Match Journey remained present while the new negotiation arrived visibly at the active card;
- the negotiation page had a positive internal scroll position rather than remaining at the top;
- the tactics advice label was **OPEN MATCH PLAN →** and carried `tactics:opponent-preparation`;
- selecting it kept the Tactics route but moved the original report control above the viewport and positioned the actionable preparation panel below the sticky interface chrome;
- Active Five and squad-loadout management targets resolved and arrived visibly through the same cross-page delegated route handling;
- document, body and management-content horizontal overflow were zero; and
- no page errors were recorded.

## Retained diagnostics

The following deterministic diagnostics passed at every tested viewport:

- `stateIntegrityForTest()` — Build 12.69, zero integrity issues;
- `typographyConsistencyForTest()` — all responsive readability checks passed;
- `firstMatchGuidanceForTest()` — all recruitment, target, candidate-count, role-guide and transfer-access checks passed; and
- `oppositionIntelligenceForTest()` — an opponent and tactical identity remained available after navigation.

## Build verification

- Every modular JavaScript source file passed `node --check`.
- Generated `js/strikewatch.dev.js` passed `node --check`.
- The inline JavaScript extracted from `dist/strikewatch-build-12.69.html` passed `node --check`.
- `build.py` passed Python bytecode compilation.
- Two consecutive builds produced identical SHA-256 hashes:
  - `js/strikewatch.dev.js`: `8dcc361c61c780561b4355af68b1c278ad2802e6f1f2d0bfd48b8002edf76dc8`
  - `dist/strikewatch-build-12.69.html`: `e661e37905db0078b02f9cf9b26a21386b3cf61b9c79b7d1de8f202df1dc9ec8`
- The final source ZIP was tested with `unzip -t` after packaging.

## Second-pass review

A source-to-source diff against the supplied Build 12.68 archive confirmed that functional changes are limited to:

- release metadata;
- the two new management target attributes;
- the destination-aware opposition advice mapping;
- the negotiation arrival request; and
- the shared guide/management target resolver.

Generated files and current release documentation were rebuilt or updated from those authorities. No save field, schema number, combat value, transfer calculation or tactical modifier changed.

## Test limitation

Automated verification used deterministic test careers and Chromium pointer clicks. It validates rendered arrival positions and responsive containment but does not replace a final subjective touch-feel check on physical mobile hardware.
