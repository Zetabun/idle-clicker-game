# Build 12.208 audit — Mobile Header Layout Fix

## Problem
The 12.207 submenu existed but inherited conflicting compact-header geometry, causing clipped labels and leaving most of the centre visually empty.

## Fix
- Force a three-column compact header: fixed Back, flexible submenu, fixed Forward.
- Remove inherited positioning and width constraints.
- Keep the route buttons horizontally scrollable within the centre column.
- Preserve Operations Overview behaviour and desktop layout.

## Verification
Deterministic double build, JavaScript parsing, targeted CSS anchors, and root/standalone byte identity are required. Save schema 19 and diagnostics schema 1 remain unchanged.
