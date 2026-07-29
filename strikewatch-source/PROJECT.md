# Strikewatch project guide

This is a concise project overview. Use:

- `HANDOFF.md` for current release state and task routing;
- `AGENTS.md` for coding workflow;
- `ARCHITECTURE.md` for modules, dependencies and state ownership;
- `CONTRACTS.md` for stable behavioural invariants;
- `CHANGELOG.md` to locate one relevant historical audit.

## Product

Strikewatch is an asset-free browser management game. The player creates a
tactical club, recruits and finances operators, manages an Active Five,
prepares tactics and watches autonomous tactical-elimination matches rendered
through custom WebGL.

The management game includes recruitment, transfers, contracts, Club Cash,
Gold Coins, equipment, training, staff, scouting, infrastructure, sponsors,
supporters, a persistent league/calendar and evidence-based post-match reports.

## Technical shape

- HTML/CSS/JavaScript with no external runtime assets.
- Ordered source fragments under `js/` are concatenated into one strict IIFE.
- `build.py` owns module order and produces the development bundle and
  standalone release.
- `careerState` is the persistent management authority.
- Save schema 19 and diagnostics schema 1 are current.
- Compact/mobile and desktop presentations are distinct supported targets at
  the 1024px breakpoint.

## Current release

Build 12.162 closes the grip-to-frame joint with a tang and seats each trigger
inside its guard.
See `HANDOFF.md` and `AUDIT-12.161.md`.

Historical architecture narratives are retained in the individual audits and
Git history rather than duplicated here.
