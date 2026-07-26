# Build 12.107 – recruitment card surface isolation

## Scope

Prevent the configurable management-page background colour from showing through some recruitment candidate cards.

## Root cause

A legacy global alternating-row selector applied `rgba(255,255,255,.035) !important` to even `.team-market-row` elements. Recruitment candidates reuse that row class, so even cards became translucent and exposed the selected page canvas colour.

## Implementation

- Added an authoritative recruitment-only surface rule after the configurable background rules.
- All recruitment candidate cards, including even rows, now own the same opaque navy gradient.
- Desktop hover/focus states receive an explicit dark hover gradient so the existing restrained hover effect remains visible.
- Added `isolation: isolate` to keep card overlays composited within the candidate surface.

## Boundaries

- The configurable page background continues to affect only `.menu-content`.
- Recruitment data, shortlist state, comparison, reports and negotiation are unchanged.
- Save schema remains 19 and diagnostics schema remains 1.
