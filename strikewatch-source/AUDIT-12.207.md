# Build 12.207 audit — Mobile Header Submenu Fix

## Problem
Build 12.206 removed the bulky mobile header correctly, but the reused secondary navigation remained hidden by earlier compact-layout rules, leaving an empty band.

## Fix
- Render the current department route buttons directly inside the mobile manager header.
- Keep Back and Forward controls at the edges.
- Highlight and centre the active route.
- Preserve the original Operations Overview shortcut and End Day header.
- Hide the redundant legacy subnav on compact contextual routes.

## Verification
Deterministic double build, modular/generated/standalone JavaScript parsing, source anchors, and root/standalone byte identity are required. Save schema 19 and diagnostics schema 1 remain unchanged.
