# Build 12.156 candidate — Durable Results

## Reported defect

After a league match, the post-match report showed newly awarded Gold Coins and
league points, but a later visit restored the pre-match balance and league table.

## Root cause

The match settlement correctly updated live career state and called
`saveCareerState()`. However, Build 12.134's stale-session guard can reject that
write when another tab, restored page or same-origin session has advanced the
save sequence while the match is live. The settlement call ignored the rejected
write and the report rendered from live memory, so the awards looked banked even
though browser storage still held the older career. Return-to-HQ and page-hide
checkpoints then retried the same stale ordinary save and were rejected again.

This explains why both Gold Coins and league points disappeared together: both
were present in one live `careerState`, while neither reached the stored career.

## Candidate fix

`js/80-durable-results.js` is loaded last and wraps the existing authorities
without introducing a second career or league state.

- Ordinary autosaves still use the established stale-session rejection.
- A completed match performs one protected settlement write after the base match
  completion has applied finance, Gold Coins, league fixture state, player
  progression and any pending victory crate.
- When a stale sequence is detected at that boundary, the displaced stored career
  is copied to the existing recovery-backup key before the complete settled state
  is written with the stored sequence as authority.
- Storage rejection and read-back failures still flow through the existing
  `saveCareerState()` error reporting.
- `window.__strikeDebug.durableMatchSettlementForTest()` simulates a newer stored
  session, proves an ordinary write remains blocked, performs the protected
  settlement, reads it back and restores the user's original state and storage.

`build.py` includes the final-order module after `79-save-checkpoints.js` so the
runtime debug API is already present and all return-to-HQ checkpoints remain
unchanged.

## Compatibility

The candidate does not change save schema 19, league scoring, Gold Coin reward
amounts, fixture generation, finance values or match simulation.

## Verification completed

- The new source module passes `node --check`.
- A standalone mocked-storage regression reproduces a stale sequence and passes:
  the ordinary write is rejected, the protected match result persists, the old
  stored career remains available as backup, and the save sequence advances from
  the newer stored authority.
- A second inspection confirmed the protected write runs after the original match
  completion, so it includes both the league result and all match rewards.

## Release gate still required

The connected GitHub app can read and write the repository, but GitHub Actions did
not create a run for branch pushes or a merged default-branch trigger, and this
execution environment cannot resolve GitHub hosts for a local clone. Therefore the
candidate has deliberately not been merged to `main`: `py -3 build.py`, complete
module/bundle parsing, deterministic double-build hashes, standalone generation,
root `cod.html` byte parity and live GitHub Pages verification still need to run
before this can be called Build 12.156.
