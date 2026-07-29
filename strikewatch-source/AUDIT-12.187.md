# Build 12.187 — Report XP Safety

## Scope

This release completes SW-003 from the 12.160 whole-game backlog. It hardens historic and partial after-action records so missing, malformed or legacy `xpAward` values can never render as `undefined XP`. Gameplay rewards, XP calculation, settlement, saves, migrations and schemas are unchanged.

## Root cause

Two archive-facing templates interpolated `summary.xpAward` directly. Current match settlement normally supplies that field, but older, imported or partial summaries can omit it. Those records therefore exposed JavaScript's `undefined` value in visible copy.

## Fix

- Added `careerSafeXpAward(summary)`, which converts absent or invalid values to zero, clamps negative values and rounds valid numeric values.
- Routed the latest-report hero and last-deployment summary through the shared formatter.
- Added `careerReportXpSafetyForTest()` covering null, empty, undefined, numeric-string, negative and fractional inputs.
- Exposed that deterministic diagnostic through the existing `window.__strikeDebug` API.
- Updated the canonical development title, asset cache keys and desktop/mobile visible build labels to 12.187.
- Kept the already-safe team-management reward card unchanged.

## Stable boundaries

Match XP calculation and settlement remain authoritative and unchanged. Save schema stays 19 and diagnostics schema stays 1. No persisted field changes shape and no migration is required.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file and the generated development bundle parse with Node.
- The exact source diagnostic reports `ok: true` for all deterministic cases.
- No direct `${summary.xpAward}` or `${careerState.lastRound.xpAward}` interpolation remains in the owning career source.
- `index.html`, `RELEASE.json`, `js/00-core.js` and both visible build labels agree on 12.187.
- Two builds produce identical generated hashes.
- Root `cod.html` is byte-identical to the verified standalone.
