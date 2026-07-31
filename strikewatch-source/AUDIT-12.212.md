# Build 12.212 audit — Collapsed Must Respond

## Problem
Build 12.211 attempted to collapse MUST RESPOND after insertion, but the authoritative markup itself still included the native `open` attribute, so the expanded state could paint and persist.

## Fix
- Removed `open` from the source markup returned by `renderClubMustRespondStrip()`.
- The urgent summary remains visible and can still be expanded manually.
- Blocker authority, end-day locking and action routes are unchanged.

## Verification
The release requires deterministic double builds, modular/generated/standalone JavaScript parsing, an assertion that the MUST RESPOND source has no authored open state, and root/standalone byte identity. Save schema 19 and diagnostics schema 1 remain unchanged.
