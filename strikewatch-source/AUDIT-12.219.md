# Build 12.219 audit — Ops Alert Indicator

- Replaced the Ops blocker pseudo-element with a fixed 18px circular indicator.
- Explicit inline/block dimensions, box sizing, writing mode, font shorthand and transform isolation prevent inherited stretching.
- The indicator remains driven by the existing `clubEndDayBlockers()` authority and disappears when blockers clear.
- Navigation, gameplay, save schema 19 and diagnostics schema 1 are unchanged.
