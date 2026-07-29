# Build 12.186 — Accurate Storage Reporting

## Scope

This release completes SW-002 from the 12.160 whole-game backlog. It changes only the Configuration storage report and its diagnostic coverage. Save commits, recovery, IndexedDB mirroring, migration, gameplay and save schema remain unchanged.

## Root cause

The Configuration route called `navigator.storage.estimate()` and immediately rendered the previous cached values. On a first visit that could display an unavailable or zero-looking result before the promise settled. The same row was labelled `BROWSER ALLOWANCE USED`, although the API reports usage and quota for the complete site origin, not an allowance reserved for the current Strikewatch career.

## Fix

- Local career bytes are still measured synchronously from the primary save, recovery backup and metadata records.
- The browser-origin estimate now has explicit `idle`, `loading`, `ready` and `unavailable` states.
- Pending measurement displays `MEASURING...` rather than a zero or false allowance.
- A settled estimate is labelled `ALL SITE DATA` and the card explains that it includes the complete site origin, not only this career.
- If Configuration is open when the estimate settles, the route rerenders once with the measured value.
- `careerStorageReportingForTest()` verifies loading, ready, unavailable and scope labels and prevents a `0 B OF 0 B` regression.

## Stable boundaries

`saveCareerState()` remains synchronous through its verified localStorage commit. IndexedDB remains the durable mirror and quota fallback, and `saveSequence` remains the only authority when tiers disagree. Save schema stays 19 and diagnostics schema stays 1.

## Verification

- `python3 -m py_compile build.py` passes.
- Every modular JavaScript file, the generated bundle and standalone inline scripts parse.
- `careerStorageReportingForTest()` passes in a headless browser.
- The Configuration card contains no `BROWSER ALLOWANCE USED` copy and reports the new scoped labels at desktop and compact widths without horizontal overflow.
- Existing `careerIndexedDbForTest()` remains available and the persistence source-order contract remains unchanged.
- Two builds produce identical development bundle, standalone, size-report and CSS-debt-report hashes.
- Root `cod.html` is byte-identical to the standalone.

No migration is required because no persisted field changes shape.
