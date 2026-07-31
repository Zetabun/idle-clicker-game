# Build 12.209 audit — Mobile Header Button Fix

## Problem
The 12.208 header layout was visually correct, but the newly injected submenu lived outside the existing delegated content click region, so its buttons did not navigate.

## Fix
- Add one delegated click handler directly to the contextual header nav.
- Route clicks through the existing `setMenuRoute()` authority.
- Prevent duplicate propagation while preserving active-route rendering and history.
- No save, gameplay, or desktop changes.

## Verification
Deterministic double build, modular/generated/standalone JavaScript parsing, targeted click-handler assertions, and root/standalone byte identity are required. Save schema 19 and diagnostics schema 1 remain unchanged.
