# Build 12.156 — Durable Results

## Reported defect

A completed league match showed awarded Gold Coins and league points in the live report, but a later visit could restore the pre-match balance and table.

## Root cause

Match settlement updated live `careerState`, but the stale-session sequence guard could reject the write when another tab or restored same-origin session advanced the stored sequence during the match. The report continued rendering from live memory, while return-to-HQ and page-hide checkpoints retried the same stale ordinary save and were rejected again.

## Fix

`js/80-durable-results.js` loads after the established save checkpoints and wraps the existing save and match-completion authorities.

- Ordinary stale-session autosaves remain blocked.
- After the base match completion applies finance, Gold Coins, league fixture state, player progression and any pending victory crate, one protected settlement write runs before the manager can leave the reward presentation.
- If the sequence is stale, the displaced stored career is copied to the existing recovery-backup key before the complete settled state is written using the stored sequence as authority.
- Storage rejection and read-back failures continue through the existing save-health notice path.
- Save schema 19, league scoring, reward values and match simulation are unchanged.

## Verification

- `durableMatchSettlementForTest()`: pass. An ordinary stale write was rejected; the protected result persisted 14 GC, a played winning fixture, the displaced 2 GC save as backup, and advanced sequence 25 to 26.
- Wrapped `completeCareerMatch()` mock: pass with the same persisted and backup values.
- Every modular JavaScript file parsed with `node --check`.
- Generated `js/strikewatch.dev.js` parsed.
- Standalone inline JavaScript parsed.
- `python3 build.py` succeeded twice.
- Deterministic bundle SHA-256: `32a746a36fde6d44e79c2d1f48a7b97ad22469381004bd9b0a23e4123e14904f`.
- Deterministic standalone SHA-256: `f8acd2226a0434fee107e7c2275fc8b203d967d66c22752e9fd17952244492cf`.
- Root `cod.html` is byte-identical to `dist/strikewatch-build-12.156.html`.

## Compatibility

No responsive CSS, renderer, navigation, combat, economy values, fixture generation or save schema changed.
