# Build 12.210 audit — League and Equipment Navigation

## Change
- Primary navigation is now Ops, Team, League, Equipment and Club.
- League moves out of Operations into its own primary section.
- Armoury and Supplies are consolidated under Equipment.
- Equipment exposes Overview, Team Armoury, Supply Overview and Supply Depot through the contextual submenu.
- Operations keeps Overview, Calendar, Inbox, Team Telemetry and After Action.
- Existing pages, state, purchase logic, inventory, fixtures and saves are unchanged.

## Verification
The release requires deterministic double builds, modular/generated/standalone JavaScript parsing, primary-section and route assertions, and root/standalone byte identity. Save schema 19 and diagnostics schema 1 remain unchanged.
