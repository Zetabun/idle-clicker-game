# Build 12.211 audit — Loading Screen and Collapsed Actions

## Change
- Added an immediate full-viewport loading screen before the game UI can paint partially initialised layouts.
- Loading presentation clears after the window load event and includes an eight-second safety fallback.
- MUST RESPOND details are collapsed when first inserted, while remaining manually expandable.
- No blocker authority, route, gameplay or save behaviour changed.

## Verification
Deterministic double build, JavaScript parsing, loading-screen and collapse-handler assertions, and root/standalone byte identity are required. Save schema 19 and diagnostics schema 1 remain unchanged.
