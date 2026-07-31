# Build 12.216 audit — Ops-Only Priority Card

## Problem
The collapsible MUST RESPOND strip was correctly limited to Ops, but a separate management priority card still rendered globally and repeated the same required action on Team and other pages.

## Fix
- The management priority card now renders only when `menuTab === 'play'`.
- The collapsible MUST RESPOND strip remains Ops-only and collapsed by default.
- Team, League, Equipment, Club and their subpages no longer show either large warning card.
- The End Day lock, response count and blocker authority remain global.
- Save schema 19 and diagnostics schema 1 are unchanged.
